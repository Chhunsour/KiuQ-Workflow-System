-- 0093_task_alert_banners_v2.sql
-- Migration to support V2 task alert features (archiving)

begin;

alter table public.task_alerts
  add column if not exists is_archived boolean not null default false;

alter table public.task_alert_receipts
  add column if not exists is_archived boolean not null default false;

create index if not exists task_alerts_is_archived_idx on public.task_alerts(is_archived);
create index if not exists task_alert_receipts_is_archived_idx on public.task_alert_receipts(is_archived);

commit;
