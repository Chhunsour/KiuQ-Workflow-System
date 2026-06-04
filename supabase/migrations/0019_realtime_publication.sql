-- WordPress Prompt System - Supabase Realtime publication
-- Publishes workflow tables so clients can receive live updates.
-- Run after 0018_leaderboard.sql.

do $$
declare
  target_table text;
  realtime_tables text[] := array[
    'profiles',
    'projects',
    'project_members',
    'project_pages',
    'section_tasks',
    'prompt_templates',
    'prompt_assignments',
    'prompt_replacements',
    'generated_prompts',
    'submissions',
    'review_comments',
    'folders',
    'resources',
    'docs',
    'docs_folders',
    'docs_files',
    'docs_assignments',
    'monthly_reports',
    'blockers',
    'activity_logs',
    'leaderboard_scores'
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
