-- Gives seasons a year and a term, and moves field tags into one shared table.
--
--   seasons (year, term) ──< projects  ──< project_tags  >──┐
--                        └─< aikuthons ──< aikuthon_tags >──┴── tags
--
-- A. A season's year and term were only readable from its name ("26-여름").
--    They become columns, filled from the name by a trigger, and the trigger
--    also sets the display order (newest first), so seasons no longer need
--    ordering by hand. A name outside the pattern "YY-1", "YY-2", "YY-여름",
--    "YY-겨울" is refused.
-- B. Tags were text arrays on each project. They become rows of one `tags`
--    table shared by projects and AIKUTHONs, linked through `project_tags`
--    and `aikuthon_tags`, so one field has one spelling everywhere. The order
--    of a project's tags is kept in `sort_order`. `projects.tags` is copied
--    here and dropped in the next migration, after the code that reads the new
--    tables is live.
--
-- Who may read and write: anyone may read `tags`, `project_tags` and
-- `aikuthon_tags`; only the server (secret key) writes them, through
-- `set_project_tags` and `set_aikuthon_tags`. Nothing changes for `seasons`.

-- A. seasons: year and term ------------------------------------------------------

alter table public.seasons
  add column year smallint,
  add column term text constraint seasons_term_valid check (term in ('winter', '1', 'summer', '2'));

create function public.seasons_derive_term()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parts text[] := regexp_match(new.name, '^([0-9]{2})-(1|2|여름|겨울)$');
begin
  if parts is null then
    raise exception 'SEASON_NAME_FORMAT' using errcode = '22023',
      hint = 'Season names look like 26-1, 26-여름, 26-2 or 26-겨울.';
  end if;
  new.year := 2000 + parts[1]::smallint;
  new.term := case parts[2] when '겨울' then 'winter' when '여름' then 'summer' else parts[2] end;
  -- Within a year: winter (Jan–Feb), 1st semester, summer, 2nd semester.
  -- Smaller sorts first, so the newest season comes first.
  new.sort_order := -(new.year * 10 + array_position(array['winter', '1', 'summer', '2'], new.term));
  return new;
end;
$$;

create trigger seasons_derive_term before insert or update on public.seasons
  for each row execute function public.seasons_derive_term();

-- Fires the trigger on every existing row.
update public.seasons set name = name;

alter table public.seasons
  alter column year set not null,
  alter column term set not null,
  add constraint seasons_year_term_unique unique (year, term);

-- B. tags -----------------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique constraint tags_name_present check (name = btrim(name) and name <> ''),
  created_at timestamptz not null default now()
);

create table public.project_tags (
  project_id uuid not null references public.projects (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (project_id, tag_id)
);

create index project_tags_tag_idx on public.project_tags (tag_id);

create table public.aikuthon_tags (
  aikuthon_id uuid not null references public.aikuthons (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (aikuthon_id, tag_id)
);

create index aikuthon_tags_tag_idx on public.aikuthon_tags (tag_id);

-- Copies the existing arrays, keeping each project's order.
insert into public.tags (name)
select distinct btrim(t) from public.projects, unnest(tags) as t where btrim(t) <> ''
on conflict (name) do nothing;

insert into public.project_tags (project_id, tag_id, sort_order)
select p.id, tg.id, min(u.ord)
from public.projects p
cross join lateral unnest(p.tags) with ordinality as u(name, ord)
join public.tags tg on tg.name = btrim(u.name)
group by p.id, tg.id;

-- Replaces the tags of one project or event with the given names, in order,
-- and removes tags nothing uses any more.
create function public.set_project_tags(p_project_id uuid, p_names text[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.tags (name)
  select distinct btrim(n) from unnest(p_names) as n where btrim(n) <> ''
  on conflict (name) do nothing;

  delete from public.project_tags where project_id = p_project_id;
  insert into public.project_tags (project_id, tag_id, sort_order)
  select p_project_id, tg.id, min(u.ord)
  from unnest(p_names) with ordinality as u(name, ord)
  join public.tags tg on tg.name = btrim(u.name)
  group by tg.id;

  delete from public.tags tg
  where not exists (select 1 from public.project_tags x where x.tag_id = tg.id)
    and not exists (select 1 from public.aikuthon_tags x where x.tag_id = tg.id);
end;
$$;

create function public.set_aikuthon_tags(p_aikuthon_id uuid, p_names text[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.tags (name)
  select distinct btrim(n) from unnest(p_names) as n where btrim(n) <> ''
  on conflict (name) do nothing;

  delete from public.aikuthon_tags where aikuthon_id = p_aikuthon_id;
  insert into public.aikuthon_tags (aikuthon_id, tag_id, sort_order)
  select p_aikuthon_id, tg.id, min(u.ord)
  from unnest(p_names) with ordinality as u(name, ord)
  join public.tags tg on tg.name = btrim(u.name)
  group by tg.id;

  delete from public.tags tg
  where not exists (select 1 from public.project_tags x where x.tag_id = tg.id)
    and not exists (select 1 from public.aikuthon_tags x where x.tag_id = tg.id);
end;
$$;

revoke all on function public.set_project_tags(uuid, text[]) from public, anon, authenticated;
revoke all on function public.set_aikuthon_tags(uuid, text[]) from public, anon, authenticated;
grant execute on function public.set_project_tags(uuid, text[]) to service_role;
grant execute on function public.set_aikuthon_tags(uuid, text[]) to service_role;

alter table public.tags enable row level security;
alter table public.project_tags enable row level security;
alter table public.aikuthon_tags enable row level security;

create policy "Anyone can read tags" on public.tags
  for select to anon, authenticated using (true);
create policy "Anyone can read project tags" on public.project_tags
  for select to anon, authenticated using (true);
create policy "Anyone can read AIKUTHON tags" on public.aikuthon_tags
  for select to anon, authenticated using (true);

grant select on public.tags, public.project_tags, public.aikuthon_tags to anon, authenticated;
revoke insert, update, delete, truncate
  on public.tags, public.project_tags, public.aikuthon_tags
  from anon, authenticated;
