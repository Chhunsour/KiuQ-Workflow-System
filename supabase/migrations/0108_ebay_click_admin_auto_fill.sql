  -- Migration: 0108_ebay_click_admin_auto_fill.sql
  -- Description: Adds honest admin auto-fill metadata and a permission-checked RPC
  -- for one-click eBay Click followup handling.

  begin;

  alter table public.ebay_click_followup
    add column if not exists completed_by_role text,
    add column if not exists completed_by_user_id uuid references public.profiles(id) on delete set null,
    add column if not exists completion_source text not null default 'member',
    add column if not exists reason text,
    add column if not exists auto_fill_batch_id uuid;

  alter table public.ebay_click_followup
    drop constraint if exists ebay_click_followup_completion_source_check;

  alter table public.ebay_click_followup
    add constraint ebay_click_followup_completion_source_check
    check (completion_source in ('member', 'admin_manual', 'admin_auto_fill', 'not_required_today'));

  update public.ebay_click_followup e
  set
    completed_by_user_id = coalesce(e.completed_by_user_id, e.completed_by),
    completed_by_role = coalesce(e.completed_by_role, p.role),
    completion_source = case
      when nullif(e.completion_source, '') is null then
        case
          when e.completed_by is not null and e.completed_by is distinct from e.user_id then 'admin_manual'
          else 'member'
        end
      when e.completion_source = 'member'
        and e.completed_by is not null
        and e.completed_by is distinct from e.user_id then 'admin_manual'
      else e.completion_source
    end
  from public.profiles p
  where p.id = e.completed_by
    and (
      e.completed_by_user_id is null
      or e.completed_by_role is null
      or e.completion_source is null
      or e.completion_source = ''
      or (
        e.completion_source = 'member'
        and e.completed_by is not null
        and e.completed_by is distinct from e.user_id
      )
    );

  create index if not exists ebay_click_followup_completion_source_idx
    on public.ebay_click_followup (completion_source, date desc);

  create table if not exists public.ebay_click_auto_fill_logs (
    id uuid primary key default gen_random_uuid(),
    action_type text not null check (action_type in ('admin_auto_fill', 'not_required_today')),
    followup_date date not null,
    admin_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
    affected_member_count integer not null default 0,
    already_completed_count integer not null default 0,
    excluded_member_count integer not null default 0,
    reason text,
    created_at timestamptz not null default now()
  );

  create index if not exists ebay_click_auto_fill_logs_date_idx
    on public.ebay_click_auto_fill_logs (followup_date desc, created_at desc);

  alter table public.ebay_click_auto_fill_logs enable row level security;

  drop policy if exists "ebay_click_auto_fill_logs_admin_select" on public.ebay_click_auto_fill_logs;
  create policy "ebay_click_auto_fill_logs_admin_select"
    on public.ebay_click_auto_fill_logs for select
    to authenticated
    using (public.is_admin());

  drop policy if exists "ebay_click_auto_fill_logs_admin_insert" on public.ebay_click_auto_fill_logs;
  create policy "ebay_click_auto_fill_logs_admin_insert"
    on public.ebay_click_auto_fill_logs for insert
    to authenticated
    with check (public.is_admin());

  create or replace function public.auto_fill_ebay_click_followup(
    p_date date,
    p_action_type text default 'admin_auto_fill',
    p_reason text default null,
    p_excluded_user_ids uuid[] default '{}'::uuid[]
  )
  returns table (
    auto_filled_count integer,
    already_completed_count integer,
    skipped_count integer,
    affected_member_count integer,
    action_type text,
    followup_date date,
    entries jsonb
  )
  language plpgsql
  security definer
  set search_path = public, pg_catalog
  as $$
  declare
    v_actor uuid := auth.uid();
    v_actor_name text := 'An admin';
    v_actor_role text := null;
    v_batch_id uuid := gen_random_uuid();
    v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
    v_excluded_ids uuid[] := coalesce(p_excluded_user_ids, '{}'::uuid[]);
    v_day_name text := trim(to_char(p_date, 'Day'));
  begin
    if v_actor is null or not public.is_admin() then
      raise exception 'You do not have permission to auto fill eBay Click followups.'
        using errcode = '42501';
    end if;

    if p_action_type not in ('admin_auto_fill', 'not_required_today') then
      raise exception 'Invalid eBay Click auto-fill action type.'
        using errcode = '22023';
    end if;

    select
      coalesce(nullif(full_name, ''), email, 'An admin'),
      role
    into v_actor_name, v_actor_role
    from public.profiles
    where id = v_actor;

    return query
    with target_members as (
      select p.id
      from public.profiles p
      where p.status = 'active'
        and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('head', 'assistant_head', 'member', 'team_member')
        and coalesce(p.department, 'website_team') = 'website_team'
        and coalesce(p.include_in_reports, true) = true
        and not (p.id = any(v_excluded_ids))
    ),
    excluded_members as (
      select p.id
      from public.profiles p
      where p.status = 'active'
        and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('head', 'assistant_head', 'member', 'team_member')
        and coalesce(p.department, 'website_team') = 'website_team'
        and coalesce(p.include_in_reports, true) = true
        and p.id = any(v_excluded_ids)
    ),
    existing as (
      select
        tm.id as user_id,
        e.id as existing_id,
        (
          e.id is not null
          and coalesce(
            nullif(e.completion_source, ''),
            case
              when coalesce(e.completed_by_user_id, e.completed_by) = e.user_id then 'member'
              else 'admin_manual'
            end
          ) = 'member'
        ) as member_completed
      from target_members tm
      left join public.ebay_click_followup e
        on e.user_id = tm.id
      and e.date = p_date
    ),
    preserved as (
      select count(*)::integer as count
      from existing
      where member_completed
    ),
    changed as (
      insert into public.ebay_click_followup (
        user_id,
        date,
        day_name,
        status,
        completed_at,
        completed_by,
        completed_by_user_id,
        completed_by_role,
        completion_source,
        reason,
        auto_fill_batch_id
      )
      select
        e.user_id,
        p_date,
        v_day_name,
        'done',
        now(),
        v_actor,
        v_actor,
        v_actor_role,
        p_action_type,
        v_reason,
        v_batch_id
      from existing e
      where not e.member_completed
      on conflict (user_id, date) do update
        set day_name = excluded.day_name,
            status = excluded.status,
            completed_at = excluded.completed_at,
            completed_by = excluded.completed_by,
            completed_by_user_id = excluded.completed_by_user_id,
            completed_by_role = excluded.completed_by_role,
            completion_source = excluded.completion_source,
            reason = excluded.reason,
            auto_fill_batch_id = excluded.auto_fill_batch_id,
            updated_at = now()
        where coalesce(
          nullif(public.ebay_click_followup.completion_source, ''),
          case
            when coalesce(public.ebay_click_followup.completed_by_user_id, public.ebay_click_followup.completed_by) = public.ebay_click_followup.user_id then 'member'
            else 'admin_manual'
          end
        ) <> 'member'
      returning public.ebay_click_followup.*
    ),
    counts as (
      select
        (select count(*)::integer from changed) as auto_filled_count,
        (select count from preserved) as already_completed_count,
        (select count(*)::integer from excluded_members) as skipped_count,
        (select count(*)::integer from target_members) as affected_member_count
    ),
    log_insert as (
      insert into public.ebay_click_auto_fill_logs (
        action_type,
        followup_date,
        admin_user_id,
        affected_member_count,
        already_completed_count,
        excluded_member_count,
        reason
      )
      select
        p_action_type,
        p_date,
        v_actor,
        counts.affected_member_count,
        counts.already_completed_count,
        counts.skipped_count,
        v_reason
      from counts
      where counts.affected_member_count > 0 or counts.already_completed_count > 0 or counts.skipped_count > 0
      returning id
    ),
    activity_insert as (
      insert into public.activity_logs (
        user_id,
        action,
        related_type,
        related_id,
        message
      )
      select
        v_actor,
        'ebay_click_auto_fill',
        'ebay_click_followup',
        null,
        v_actor_name || ' auto-filled eBay Click followup for all members on ' ||
          to_char(p_date, 'FMMonth FMDD, YYYY') ||
          case when v_reason is not null then '. Reason: ' || v_reason || '.' else '.' end
      from counts
      where counts.affected_member_count > 0 or counts.already_completed_count > 0 or counts.skipped_count > 0
      returning id
    )
    select
      counts.auto_filled_count,
      counts.already_completed_count,
      counts.skipped_count,
      counts.affected_member_count,
      p_action_type,
      p_date,
      coalesce(
        (
          select jsonb_agg(to_jsonb(changed) order by changed.user_id)
          from changed
        ),
        '[]'::jsonb
      ) as entries
    from counts;
  end;
  $$;

  revoke all on function public.auto_fill_ebay_click_followup(date, text, text, uuid[]) from public;
  revoke all on function public.auto_fill_ebay_click_followup(date, text, text, uuid[]) from anon;
  grant execute on function public.auto_fill_ebay_click_followup(date, text, text, uuid[]) to authenticated;

  commit;

  -- Verify:
  --   select * from public.auto_fill_ebay_click_followup(current_date, 'not_required_today', 'Testing only', '{}');
  --   select completion_source, reason from public.ebay_click_followup order by completed_at desc limit 5;
