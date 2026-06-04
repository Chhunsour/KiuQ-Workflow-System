-- 0045 — Enable Supabase Realtime for followup and website tables
-- Adds blog_upload_slots, plugin_update_slots, ebay_click_followup,
-- websites, and notifications to the realtime publication.

do $$
declare
  target_table text;
  realtime_tables text[] := array[
    'blog_upload_slots',
    'plugin_update_slots',
    'ebay_click_followup',
    'websites',
    'notifications'
  ];
begin
  foreach target_table in array realtime_tables
  loop
    if exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_name = target_table
    ) then
      execute format('alter table public.%I replica identity full', target_table);

      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', target_table);
      end if;
    end if;
  end loop;
end $$;
