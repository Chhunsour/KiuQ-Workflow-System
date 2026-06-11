-- WordPress Prompt System — Add 'postponed' Task Status
alter table public.prompt_assignments
  drop constraint if exists prompt_assignments_status_check;

alter table public.prompt_assignments
  add constraint prompt_assignments_status_check
  check (status in (
    'pending', 'in_progress', 'submitted',
    'approved', 'needs_fix', 'rejected',
    'needs_resubmission', 'postponed'
  ));
