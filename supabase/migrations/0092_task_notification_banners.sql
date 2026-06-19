  -- 0092_task_notification_banners.sql
  -- Migration to support targeted task notification banners & receipts

  begin;

  -- 1. Helper function to check if current user is an alert manager (admin, owner, head)
  create or replace function public.is_task_alert_manager()
  returns boolean
  language sql
  security definer
  set search_path = public
  as $$
    select exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('admin', 'owner', 'head')
        and status = 'active'
    );
  $$;

  revoke all on function public.is_task_alert_manager() from public;
  grant execute on function public.is_task_alert_manager() to authenticated;

  -- 2. Create task_alerts table
  create table if not exists public.task_alerts (
    id uuid primary key default gen_random_uuid(),
    alert_id text not null unique,
    alert_type text not null check (alert_type in (
      'Quality Check', 'New Task', 'Follow Up', 'Urgent Fix', 'Reminder', 'Website Review', 'Deadline Alert'
    )),
    title text not null,
    message text not null,
    priority text not null check (priority in ('Critical', 'High', 'Medium', 'Low')),
    related_type text check (related_type in ('workboard_task', 'followup_item', 'quality_check_item')),
    related_id text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    published_at timestamptz,
    status text not null default 'draft' check (status in ('draft', 'published'))
  );

  -- 3. Create task_alert_receipts table
  create table if not exists public.task_alert_receipts (
    id uuid primary key default gen_random_uuid(),
    alert_id uuid not null references public.task_alerts(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    seen_at timestamptz,
    acknowledged_at timestamptz,
    status text not null default 'pending' check (status in ('pending', 'acknowledged')),
    escalation_level integer not null default 0,
    last_pushed_at timestamptz not null default now(),
    unique(alert_id, user_id)
  );

  -- Create indexes for performance
  create index if not exists task_alerts_status_idx on public.task_alerts(status);
  create index if not exists task_alert_receipts_user_status_idx on public.task_alert_receipts(user_id, status);
  create index if not exists task_alert_receipts_alert_idx on public.task_alert_receipts(alert_id);

  -- 4. Enable Row Level Security (RLS)
  alter table public.task_alerts enable row level security;
  alter table public.task_alert_receipts enable row level security;

  -- 5. RLS Policies for task_alerts
  create policy "task_alerts_manager_all" on public.task_alerts
    for all to authenticated
    using (public.is_task_alert_manager())
    with check (public.is_task_alert_manager());

  create policy "task_alerts_recipient_select" on public.task_alerts
    for select to authenticated
    using (
      exists (
        select 1 from public.task_alert_receipts r
        where r.alert_id = id and r.user_id = auth.uid()
      )
    );

  -- 6. RLS Policies for task_alert_receipts
  create policy "task_alert_receipts_manager_all" on public.task_alert_receipts
    for all to authenticated
    using (public.is_task_alert_manager())
    with check (public.is_task_alert_manager());

  create policy "task_alert_receipts_recipient_select" on public.task_alert_receipts
    for select to authenticated
    using (user_id = auth.uid());

  create policy "task_alert_receipts_recipient_update" on public.task_alert_receipts
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

  -- 7. Trigger to enforce read-only fields on updates by regular recipients
  create or replace function public.check_task_alert_receipt_updates()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  begin
    -- If user is a manager, allow any update
    if public.is_task_alert_manager() then
      return new;
    end if;

    -- Ensure read-only fields remain unchanged for regular users
    if new.id != old.id
      or new.alert_id != old.alert_id
      or new.user_id != old.user_id
      or new.escalation_level != old.escalation_level
      or new.last_pushed_at != old.last_pushed_at then
      raise exception 'Access Denied: Recipients can only update seen_at, acknowledged_at, and status.';
    end if;

    return new;
  end;
  $$;

  drop trigger if exists tr_check_task_alert_receipt_updates on public.task_alert_receipts;
  create trigger tr_check_task_alert_receipt_updates
    before update on public.task_alert_receipts
    for each row execute function public.check_task_alert_receipt_updates();

  -- 8. Escalation routine to notify Department Heads and Admins
  create or replace function public.check_task_alert_escalations()
  returns integer
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    r record;
    dept_head record;
    admin_user record;
    v_count int := 0;
  begin
    -- 1) 24-Hour Escalation (level 0 -> 1): Notify Department Head(s) of user's department
    for r in
      select 
        tar.id as receipt_id,
        tar.user_id as recipient_id,
        p.full_name as recipient_name,
        p.department as recipient_dept,
        ta.title as alert_title,
        ta.id as alert_db_id
      from public.task_alert_receipts tar
      join public.task_alerts ta on ta.id = tar.alert_id
      join public.profiles p on p.id = tar.user_id
      where tar.status = 'pending'
        and tar.escalation_level = 0
        and tar.last_pushed_at <= now() - interval '24 hours'
        and ta.status = 'published'
    loop
      -- Notify active heads in that department
      for dept_head in
        select id from public.profiles
        where role = 'head'
          and department = r.recipient_dept
          and status = 'active'
          and id != r.recipient_id
      loop
        insert into public.notifications
          (recipient_id, actor_id, type, title, message, is_read, priority)
        values
          (dept_head.id, null, 'announcement', 'Escalation (24h): Alert Unacknowledged',
          'Employee ' || r.recipient_name || ' has not acknowledged task alert "' || r.alert_title || '" for over 24 hours.',
          false, 'high');
      end loop;

      update public.task_alert_receipts
      set escalation_level = 1
      where id = r.receipt_id;

      v_count := v_count + 1;
    end loop;

    -- 2) 48-Hour Escalation (level 1 -> 2): Notify Admins
    for r in
      select 
        tar.id as receipt_id,
        tar.user_id as recipient_id,
        p.full_name as recipient_name,
        ta.title as alert_title,
        ta.id as alert_db_id
      from public.task_alert_receipts tar
      join public.task_alerts ta on ta.id = tar.alert_id
      join public.profiles p on p.id = tar.user_id
      where tar.status = 'pending'
        and tar.escalation_level = 1
        and tar.last_pushed_at <= now() - interval '48 hours'
        and ta.status = 'published'
    loop
      -- Notify active admins/owners
      for admin_user in
        select id from public.profiles
        where role in ('admin', 'owner')
          and status = 'active'
          and id != r.recipient_id
      loop
        insert into public.notifications
          (recipient_id, actor_id, type, title, message, is_read, priority)
        values
          (admin_user.id, null, 'announcement', 'Escalation (48h): Alert Unacknowledged',
          'Employee ' || r.recipient_name || ' has not acknowledged task alert "' || r.alert_title || '" for over 48 hours.',
          false, 'critical');
      end loop;

      update public.task_alert_receipts
      set escalation_level = 2
      where id = r.receipt_id;

      v_count := v_count + 1;
    end loop;

    return v_count;
  end;
  $$;

  -- 9. Schedule Escalations using pg_cron (every 5 minutes)
  create extension if not exists pg_cron;

  do $$
  begin
    perform cron.unschedule('kiuq-task-alert-escalations');
  exception when others then
    null;
  end $$;

  select cron.schedule(
    'kiuq-task-alert-escalations',
    '*/5 * * * *',
    $$ select public.check_task_alert_escalations(); $$
  );

  -- Grant executions
  grant execute on function public.check_task_alert_escalations() to authenticated;

  -- Realtime replication setup for task_alerts & task_alert_receipts
  do $$
  begin
    begin
      alter publication supabase_realtime add table public.task_alerts;
    exception when others then null; end;
    begin
      alter publication supabase_realtime add table public.task_alert_receipts;
    exception when others then null; end;
  end;
  $$;

  commit;
