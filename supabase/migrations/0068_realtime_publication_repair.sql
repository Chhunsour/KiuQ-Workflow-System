-- Migration: guarantee every table the app live-subscribes to is published
-- for Supabase Realtime.
--
-- Why: a botched migration replay earlier dropped/never-added several tables
-- to the supabase_realtime publication, so clients stopped receiving live
-- INSERT/UPDATE/DELETE events and users had to refresh the page to see
-- changes. This migration is fully idempotent — it re-checks every table the
-- frontend subscribes to (see usePageRealtime() calls across the app) and:
--   1. sets REPLICA IDENTITY FULL so UPDATE/DELETE payloads carry old values,
--   2. adds the table to the supabase_realtime publication if missing.
-- Safe to run any number of times; existing entries are skipped.

do $$
declare
  target_table text;
  realtime_tables text[] := array[
    -- core team workflow
    'profiles',
    'websites',
    'section_tasks',
    'prompt_templates',
    'prompt_assignments',
    'prompt_replacements',
    'generated_prompts',
    'submissions',
    'review_comments',
    'blockers',
    'activity_logs',
    'leaderboard_scores',
    -- docs / resources
    'folders',
    'resources',
    'docs',
    'docs_folders',
    'docs_files',
    'docs_assignments',
    'monthly_reports',
    -- notifications
    'notifications',
    -- followup trackers
    'blog_upload_slots',
    'blog_followup_schedules',
    'plugin_update_slots',
    'speed_optimization_slots',
    'ebay_click_followup',
    -- quality check
    'quality_classes',
    'quality_issues',
    'quality_issue_comments',
    'quality_checker_assignments',
    -- cms
    'cms_products'
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
