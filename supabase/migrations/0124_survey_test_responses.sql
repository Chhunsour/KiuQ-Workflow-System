-- Migration: 0124_survey_test_responses.sql
-- Description: Safe preview/test mode for the Team Survey.
--   Adds survey_responses.is_test_response so Owner/Admin/Head/Supervisor can
--   fill out and submit the survey for QA without polluting real team feedback.
--
--   Test responses:
--     * never touch survey_recipients (no one is marked submitted),
--     * are hidden from the admin dashboard by default (a "Show test responses"
--       toggle reveals them),
--     * can be deleted (real team responses by others cannot be deleted by
--       management — only test ones, or a user's own response).
--
--   Idempotent — safe to re-run. survey_responses already has REPLICA IDENTITY
--   FULL + realtime from 0123, so the new column streams automatically.

begin;

alter table public.survey_responses
  add column if not exists is_test_response boolean not null default false;

create index if not exists survey_responses_test_idx
  on public.survey_responses (campaign_id, is_test_response);

-- Delete: a user may remove their own response; management may remove TEST
-- responses (so QA data can be cleaned up) but not other members' real answers.
drop policy if exists "survey_responses_delete" on public.survey_responses;
create policy "survey_responses_delete" on public.survey_responses
  for delete to authenticated
  using (
    user_id = auth.uid()
    or (public.is_admin() and is_test_response = true)
  );

commit;

-- ============================================================================
-- ✅ Verify:
--   select is_test_response, count(*) from public.survey_responses group by 1;
-- ============================================================================
