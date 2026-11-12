-- AIKUTHON, the society's own datathon: one row per event, its awards, and
-- the people on each awarded team.
--
--   aikuthons ──< aikuthon_awards ──< aikuthon_award_members >── members
--
-- Joint datathons held with other societies are listed with the editions
-- (`kind = 'joint'`), because the society counts them in its history. A
-- winner is stored by name and linked to a roster member when one matches.
--
-- Who may read and write: anyone may read all three tables; only the server
-- (secret key) writes them, from the import script or the admin page.

create table public.aikuthons (
  id uuid primary key default gen_random_uuid(),
  -- 1, 2, … for numbered editions; null for a joint datathon without a number.
  edition smallint unique,
  kind text not null default 'edition' constraint aikuthons_kind_valid check (kind in ('edition', 'joint')),
  -- Full name as announced, e.g. "제1회 AIKUTHON", "AIKU X YBIGTA 연합 데이터톤".
  name text not null constraint aikuthons_name_present check (btrim(name) <> ''),
  starts_on date not null,
  -- 'month' when only the month is known: starts_on is then the 1st and is shown as "2026.05".
  date_precision text not null default 'day'
    constraint aikuthons_date_precision_valid check (date_precision in ('day', 'month')),
  ends_on date,
  venue text not null default '',
  -- Short facts shown as tags, e.g. {"무박 2일", "2인 1팀", "Kaggle"}.
  format text[] not null default '{}',
  partners text[] not null default '{}',
  task_title text not null default '',
  task_description text not null default '',
  metric text not null default '',
  participants text not null default '',
  -- Public competition page; invitation-only links are not stored.
  competition_url text constraint aikuthons_competition_url_http check (competition_url ~* '^https?://'),
  -- Key of the source record this row was imported from; makes the import repeatable.
  source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index aikuthons_starts_on_idx on public.aikuthons (starts_on desc);

create trigger aikuthons_set_updated_at before update on public.aikuthons
  for each row execute function public.set_updated_at();

create table public.aikuthon_awards (
  id uuid primary key default gen_random_uuid(),
  aikuthon_id uuid not null references public.aikuthons (id) on delete cascade,
  -- 1, 2 or 3 for the placings; null for other prizes (special, most submissions, …).
  rank smallint constraint aikuthon_awards_rank_range check (rank between 1 and 3),
  -- As announced: "1위", "금상", "심사위원 특별상", …
  label text not null constraint aikuthon_awards_label_present check (btrim(label) <> ''),
  team_name text not null default '',
  sort_order integer not null default 0
);

create index aikuthon_awards_event_idx on public.aikuthon_awards (aikuthon_id, sort_order);

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
alter table public.aikuthon_awards enable row level security;
alter table public.aikuthon_award_members enable row level security;

create policy "Anyone can read AIKUTHONs" on public.aikuthons
  for select to anon, authenticated using (true);
create policy "Anyone can read AIKUTHON awards" on public.aikuthon_awards
  for select to anon, authenticated using (true);
create policy "Anyone can read AIKUTHON award members" on public.aikuthon_award_members
  for select to anon, authenticated using (true);

grant select on public.aikuthons, public.aikuthon_awards, public.aikuthon_award_members
  to anon, authenticated;
revoke insert, update, delete, truncate
  on public.aikuthons, public.aikuthon_awards, public.aikuthon_award_members
  from anon, authenticated;
