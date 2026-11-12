-- AIKUTHON, the society's own datathon: one row per event, the societies and
-- companies that ran it with AIKU, its tracks, its awards, and the people on
-- each awarded team.
--
--   aikuthons ──< aikuthon_partners
--             ──< aikuthon_tracks
--             ──< aikuthon_awards ──< aikuthon_award_members >── members
--
-- Joint datathons held with other societies are listed with the editions
-- (`kind = 'joint'`), because the society counts them in its history. A joint
-- event that took the place of a numbered edition keeps that number in
-- `edition` and is shown as "제N회 대체". A winner is stored by name and linked
-- to a roster member when one matches.
--
-- Who may read and write: anyone may read all five tables; only the server
-- (secret key) writes them, from the import script or the admin page.

create table public.aikuthons (
  id uuid primary key default gen_random_uuid(),
  -- 1, 2, … for numbered editions, including a joint event held in an edition's
  -- place; null for a joint event that did not take an edition's number.
  edition smallint unique,
  kind text not null default 'edition' constraint aikuthons_kind_valid check (kind in ('edition', 'joint')),
  format text not null default 'datathon' constraint aikuthons_format_valid check (format in ('datathon', 'hackathon')),
  -- "제N회 AIKUTHON" for an edition; "AIKU x <partners> 연합 데이터톤" for a joint event.
  name text not null constraint aikuthons_name_present check (btrim(name) <> ''),
  starts_on date not null,
  -- 'month' when only the month is known: starts_on is then the 1st and is shown as "2026.05".
  date_precision text not null default 'day'
    constraint aikuthons_date_precision_valid check (date_precision in ('day', 'month')),
  ends_on date,
  venue text not null default '',
  mode text not null default 'offline' constraint aikuthons_mode_valid check (mode in ('offline', 'online')),
  -- Run through the night (무박); null when not known.
  overnight boolean,
  -- People per team; 1 and 1 for an individual contest; null when not known.
  team_size_min smallint constraint aikuthons_team_size_min_positive check (team_size_min >= 1),
  team_size_max smallint,
  -- Where submissions were scored, e.g. 'Kaggle'; '' when not known or in house.
  platform text not null default '',
  task_title text not null default '',
  task_description text not null default '',
  metric text not null default '',
  -- Fields of the task, in the same vocabulary as projects.tags.
  tags text[] not null default '{}',
  -- Public competition page; invitation-only links are not stored.
  competition_url text constraint aikuthons_competition_url_http check (competition_url ~* '^https?://'),
  -- Key of the source record this row was imported from; makes the import repeatable.
  source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint aikuthons_team_size_order check (team_size_max >= team_size_min)
);

create index aikuthons_starts_on_idx on public.aikuthons (starts_on desc);

create trigger aikuthons_set_updated_at before update on public.aikuthons
  for each row execute function public.set_updated_at();

create table public.aikuthon_partners (
  id uuid primary key default gen_random_uuid(),
  aikuthon_id uuid not null references public.aikuthons (id) on delete cascade,
  name text not null constraint aikuthon_partners_name_present check (btrim(name) <> ''),
  -- 'co_host' ran it with AIKU; 'sponsor' gave space, money or prizes.
  role text not null constraint aikuthon_partners_role_valid check (role in ('co_host', 'sponsor')),
  sort_order integer not null default 0
);

create index aikuthon_partners_event_idx on public.aikuthon_partners (aikuthon_id, sort_order);

create table public.aikuthon_tracks (
  id uuid primary key default gen_random_uuid(),
  aikuthon_id uuid not null references public.aikuthons (id) on delete cascade,
  name text not null constraint aikuthon_tracks_name_present check (btrim(name) <> ''),
  sort_order integer not null default 0
);

create index aikuthon_tracks_event_idx on public.aikuthon_tracks (aikuthon_id, sort_order);

create table public.aikuthon_awards (
  id uuid primary key default gen_random_uuid(),
  aikuthon_id uuid not null references public.aikuthons (id) on delete cascade,
  -- Only the placings are kept: 1, 2 or 3 (shown as 1등, 2등, 3등).
  rank smallint not null constraint aikuthon_awards_rank_range check (rank between 1 and 3),
  team_name text not null default ''
);

create unique index aikuthon_awards_event_rank_idx on public.aikuthon_awards (aikuthon_id, rank);

create table public.aikuthon_award_members (
  id uuid primary key default gen_random_uuid(),
  award_id uuid not null references public.aikuthon_awards (id) on delete cascade,
  -- SET NULL: removing someone from the roster keeps their name on the award.
  member_id uuid references public.members (id) on delete set null,
  name text not null constraint aikuthon_award_members_name_present check (btrim(name) <> ''),
  sort_order integer not null default 0
);

create index aikuthon_award_members_award_idx on public.aikuthon_award_members (award_id, sort_order);
create index aikuthon_award_members_member_idx on public.aikuthon_award_members (member_id);

alter table public.aikuthons enable row level security;
alter table public.aikuthon_partners enable row level security;
alter table public.aikuthon_tracks enable row level security;
alter table public.aikuthon_awards enable row level security;
alter table public.aikuthon_award_members enable row level security;

create policy "Anyone can read AIKUTHONs" on public.aikuthons
  for select to anon, authenticated using (true);
create policy "Anyone can read AIKUTHON partners" on public.aikuthon_partners
  for select to anon, authenticated using (true);
create policy "Anyone can read AIKUTHON tracks" on public.aikuthon_tracks
  for select to anon, authenticated using (true);
create policy "Anyone can read AIKUTHON awards" on public.aikuthon_awards
  for select to anon, authenticated using (true);
create policy "Anyone can read AIKUTHON award members" on public.aikuthon_award_members
  for select to anon, authenticated using (true);

grant select on public.aikuthons, public.aikuthon_partners, public.aikuthon_tracks,
  public.aikuthon_awards, public.aikuthon_award_members
  to anon, authenticated;
revoke insert, update, delete, truncate
  on public.aikuthons, public.aikuthon_partners, public.aikuthon_tracks,
  public.aikuthon_awards, public.aikuthon_award_members
  from anon, authenticated;
