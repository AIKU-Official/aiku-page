-- The one-time import from the legacy static site is finished and its script
-- was removed, so the columns that tracked legacy ids for re-imports go too.

alter table public.projects drop column legacy_id;
alter table public.news drop column legacy_id;
alter table public.generations drop column legacy_id;
alter table public.members drop column legacy_id;
