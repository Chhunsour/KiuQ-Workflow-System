-- Join table: websites <-> docs_files (product detail docs)
create table if not exists public.website_product_docs (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites(id) on delete cascade,
  doc_id      uuid not null references public.docs_files(id) on delete cascade,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (website_id, doc_id)
);

alter table public.website_product_docs enable row level security;

-- Admins can do everything
create policy "admins_all_website_product_docs"
  on public.website_product_docs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Members can read
create policy "members_read_website_product_docs"
  on public.website_product_docs
  for select
  to authenticated
  using (true);
