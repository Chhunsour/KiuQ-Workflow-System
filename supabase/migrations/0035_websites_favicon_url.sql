alter table websites
  add column if not exists favicon_url text default null;
