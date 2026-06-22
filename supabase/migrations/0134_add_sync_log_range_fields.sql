-- Migration: 0134_add_sync_log_range_fields.sql
-- Description: Add range fields and metadata columns to website_gsc_sync_logs

begin;

alter table public.website_gsc_sync_logs
  add column if not exists range_key text,
  add column if not exists start_date date,
  add column if not exists end_date date;

commit;
