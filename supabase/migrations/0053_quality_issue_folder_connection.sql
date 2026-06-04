-- 0053 — Quality issues carry their class/folder connection
--
-- Website boards remain separated by website_id. This stores the folder/class
-- relationship on each issue as folder_id and keeps it synced from the
-- selected website's quality_class_id.

alter table public.quality_issues
  add column if not exists folder_id
    uuid references public.quality_classes(id) on delete set null;

create index if not exists quality_issues_folder_idx
  on public.quality_issues (folder_id, website_id, status);

create or replace function public.qi_set_folder_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select w.quality_class_id
    into new.folder_id
    from public.websites w
   where w.id = new.website_id;

  return new;
end;
$$;

drop trigger if exists qi_set_folder_id on public.quality_issues;
create trigger qi_set_folder_id
  before insert or update of website_id on public.quality_issues
  for each row execute function public.qi_set_folder_id();

update public.quality_issues qi
   set folder_id = w.quality_class_id
  from public.websites w
 where qi.website_id = w.id
   and qi.folder_id is distinct from w.quality_class_id;

create or replace function public.qi_sync_folder_from_website()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.quality_issues
     set folder_id = new.quality_class_id
   where website_id = new.id
     and folder_id is distinct from new.quality_class_id;

  return new;
end;
$$;

drop trigger if exists qi_sync_folder_from_website on public.websites;
create trigger qi_sync_folder_from_website
  after update of quality_class_id on public.websites
  for each row execute function public.qi_sync_folder_from_website();
