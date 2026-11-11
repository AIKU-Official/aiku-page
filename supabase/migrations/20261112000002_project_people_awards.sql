-- Who took part in each project, and which projects won at the AIKU Conference.
--
--   seasons ──< projects ──< project_members >── members
--
-- A participant is stored by name and linked to a roster member when one
-- matches, so people who are not on the roster still appear on the project
-- while members get the project on their profile.

alter table public.projects
  -- 1, 2 or 3 for the projects placed first to third; null otherwise.
  add column award_rank smallint
    constraint projects_award_rank_range check (award_rank between 1 and 3),
  -- One sentence shown on the card, so a visitor can tell what the project is
  -- without opening it.
  add column one_line text not null default '',
  -- Page the project was imported from; makes the import repeatable.
  add column notion_page_id text unique;

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- SET NULL: removing someone from the roster keeps their name on the project.
  member_id uuid references public.members (id) on delete set null,
  name text not null constraint project_members_name_present check (btrim(name) <> ''),
  role text not null default 'member'
    constraint project_members_role_valid check (role in ('leader', 'member')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint project_members_unique_person unique (project_id, name)
);

create index project_members_project_idx on public.project_members (project_id, sort_order);
create index project_members_member_idx on public.project_members (member_id);

alter table public.project_members enable row level security;

create policy "Anyone can read project members" on public.project_members
  for select to anon, authenticated using (true);

grant select on public.project_members to anon, authenticated;
revoke insert, update, delete, truncate on public.project_members from anon, authenticated;
