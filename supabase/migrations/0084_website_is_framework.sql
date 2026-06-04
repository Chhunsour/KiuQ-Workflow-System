-- Migration: Add is_framework flag to websites
--
-- Adds a boolean flag to track whether a website is a headless/framework website
-- (like Laravel, React, Next.js) so it can be managed and displayed separately
-- in the CMS Studio dashboard.

alter table public.websites
  add column if not exists is_framework boolean not null default false;
