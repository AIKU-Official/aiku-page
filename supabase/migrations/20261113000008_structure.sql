-- Structure from the schema review: values that were parsed out of text or
-- listed in several places become data with keys, and children take what
-- their parent already says instead of keeping their own copy.
--
--   session_kinds (code, label, takes_attendance, has_talks, has_tracks, runs_in)
--     ├──< activity_sessions.kind ──< attendance (only kinds that take attendance)
--     └──< point_rules.session_kind
--   seasons ──< program_runs (kind, season) ──< activity_sessions (run_id, number)
--                                                  └──< session_talks (only kinds with talks;
--                                                                       tracks only where kinds have them)
--   seasons ──< activity_sessions.season_id   ┐
--   seasons ──< aikuthons.season_id            ├ set from the date by trigger, never typed
--   seasons ──< point_events.season_id         ┘
--   generations (name, number) ──< members ; member_signup_requests.generation_id
--   members.name ──> project_members / aikuthon_award_members / session_talk_speakers .name
--
-- A. session_kinds: the kinds of calendar entry, once, as data (they were a
--    check constraint on two tables and a list in the app).
-- B. program_runs: one run of a program in one season, e.g. 26-여름
--    DeepIntoDeep or 26-2 Seminar. A program session belongs to its run and
--    has a number (the "12" of "12회"), so neither is read out of the title.
--    A run's season follows the program: DeepIntoDeep and Momentum run in the
--    break seasons (겨울, 여름), the Seminar in the terms (1, 2), and a session
--    belongs to the run of its half-year (winter with 1, summer with 2), so a
--    July Seminar is part of 26-2 as AIKU counts it.
-- C. A row's season is the stored season whose dates hold its date; triggers
--    set it on sessions, AIKUTHONs and point events, so it cannot drift.
-- D. generations.number: the "8" of "8기", kept by trigger like seasons'
--    year and term; the automatic OB rule uses it instead of parsing names.
-- E. member_signup_requests.generation_id replaces the typed generation name.
-- F. Missing keys and checks; the people-on-a-thing tables (project members,
--    award winners, talk speakers) share the same keys and take a linked
--    member's current name.
-- G. created_at where it was missing; activity_sessions keeps source_key for
--    the attendance import only (Notion rows are keyed by notion_page_id).
--
-- Who may read and write: session_kinds and program_runs are public to read
-- like seasons (they name things, nothing private); the rest is unchanged.

-- A. session_kinds ----------------------------------------------------------------

create table public.session_kinds (
  code text primary key constraint session_kinds_code_format check (code ~ '^[a-z]+$'),
  label text not null constraint session_kinds_label_present check (btrim(label) <> ''),
  takes_attendance boolean not null default false,
  has_talks boolean not null default false,
  has_tracks boolean not null default false,
  -- For a program that runs in seasons: 'term' (1, 2) or 'break' (겨울, 여름).
  runs_in text constraint session_kinds_runs_in_valid check (runs_in in ('term', 'break')),
  sort_order integer not null default 0,
  constraint session_kinds_tracks_need_talks check (not has_tracks or has_talks),
  constraint session_kinds_programs_have_talks check (runs_in is null or has_talks)
);

insert into public.session_kinds (code, label, takes_attendance, has_talks, has_tracks, runs_in, sort_order) values
  ('deepintodeep', 'DeepIntoDeep', true, true, false, 'break', 1),
  ('momentum', '모멘텀', true, true, true, 'break', 2),
  ('seminar', '세미나', true, true, false, 'term', 3),
  ('event', '필수 행사', true, false, false, null, 4),
  ('afterparty', '필수 뒤풀이', true, false, false, null, 5),
  ('conference', '컨퍼런스', false, false, false, null, 6),
  ('exchange', '교류', false, false, false, null, 7),
  ('academic', '학사일정', false, false, false, null, 8),
  ('holiday', '공휴일', false, false, false, null, 9),
  ('notice', '공지', false, false, false, null, 10);

alter table public.session_kinds enable row level security;
create policy session_kinds_public_read on public.session_kinds for select using (true);
grant select on public.session_kinds to anon, authenticated;

alter table public.activity_sessions drop constraint activity_sessions_kind_valid;
alter table public.activity_sessions
  add constraint activity_sessions_kind_fkey foreign key (kind)
    references public.session_kinds (code) on update cascade on delete restrict;

alter table public.point_rules drop constraint if exists point_rules_session_kind_valid;
alter table public.point_rules
  add constraint point_rules_session_kind_fkey foreign key (session_kind)
    references public.session_kinds (code) on update cascade on delete restrict;

-- B. program_runs --------------------------------------------------------------------

create table public.program_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null references public.session_kinds (code) on update cascade on delete restrict,
  -- RESTRICT: a season with a program run cannot be deleted.
  season_id uuid not null references public.seasons (id) on delete restrict,
  -- The run's Notion page (e.g. "2026-여름 DeepIntoDeep"), when there is one.
  notion_page_id text unique,
  created_at timestamptz not null default now(),
  constraint program_runs_one_per_season unique (kind, season_id)
);

alter table public.program_runs enable row level security;
create policy program_runs_public_read on public.program_runs for select using (true);
grant select on public.program_runs to anon, authenticated;

-- The run a program session of this kind on this day belongs to; made when
-- missing. Null for kinds that are not programs.
create function public.program_run_for(p_kind text, p_day date)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  runs text;
  day_season public.seasons;
  run_term text;
  run_season uuid;
  found uuid;
begin
  select runs_in into runs from public.session_kinds where code = p_kind;
  if runs is null then
    return null;
  end if;
  select * into day_season from public.seasons where id = public.season_for_date(p_day, true);
  -- The half-year: winter with the 1st term, summer with the 2nd.
  run_term := case
    when runs = 'term' then case when day_season.term in ('winter', '1') then '1' else '2' end
    else case when day_season.term in ('winter', '1') then '겨울' else '여름' end
  end;
  select id into run_season from public.seasons
    where year = day_season.year and term = case run_term when '겨울' then 'winter' when '여름' then 'summer' else run_term end;
  if run_season is null then
    insert into public.seasons (name) values (lpad((day_season.year % 100)::text, 2, '0') || '-' || run_term)
      returning id into run_season;
  end if;
  select id into found from public.program_runs where kind = p_kind and season_id = run_season;
  if found is null then
    insert into public.program_runs (kind, season_id) values (p_kind, run_season) returning id into found;
  end if;
  return found;
end;
$$;

alter table public.activity_sessions
  add column run_id uuid references public.program_runs (id) on delete restrict,
  add column number smallint constraint activity_sessions_number_positive check (number > 0),
  add constraint activity_sessions_number_unique unique (run_id, number);

create index activity_sessions_run_idx on public.activity_sessions (run_id, number);

-- C (sessions) + B: a session's season comes from its date, a program
-- session's run from its kind and date, its number from its title when not
-- given; a run of another kind is refused.
create function public.activity_sessions_derive()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  run_kind text;
begin
  new.season_id := public.season_for_date(new.held_on, true);
  if new.run_id is null then
    new.run_id := public.program_run_for(new.kind, new.held_on);
  else
    select kind into run_kind from public.program_runs where id = new.run_id;
    if run_kind is distinct from new.kind then
      raise exception 'SESSION_RUN_KIND' using errcode = '23514',
        hint = 'A session belongs to a run of its own program.';
    end if;
  end if;
  if new.run_id is null then
    new.number := null;
  elsif new.number is null then
    new.number := (regexp_match(new.title, '(\d+)\s*(?:회|강)\s*$'))[1]::smallint;
  end if;
  return new;
end;
$$;

create trigger activity_sessions_derive before insert or update of held_on, kind, run_id, number, title
  on public.activity_sessions for each row execute function public.activity_sessions_derive();

-- Fill runs and numbers for the sessions already stored.
update public.activity_sessions set held_on = held_on;

-- Program runs from the per-season Notion pages are linked by the import.

-- Attendance only for kinds that take it; talks only for kinds with talks,
-- tracks only where the kind has tracks.
create function public.attendance_kind_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (select k.takes_attendance from public.activity_sessions s
            join public.session_kinds k on k.code = s.kind where s.id = new.session_id) then
    raise exception 'ATTENDANCE_KIND' using errcode = '23514',
      hint = 'Attendance is taken only for kinds that take it (session_kinds.takes_attendance).';
  end if;
  return new;
end;
$$;

create trigger attendance_kind_check before insert or update of session_id on public.attendance
  for each row execute function public.attendance_kind_check();

create function public.session_talks_kind_check()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  kind public.session_kinds;
begin
  select k.* into kind from public.activity_sessions s
    join public.session_kinds k on k.code = s.kind where s.id = new.session_id;
  if not kind.has_talks then
    raise exception 'TALK_KIND' using errcode = '23514', hint = 'Only programs with talks have talks.';
  end if;
  if new.track_tag_id is not null and not kind.has_tracks then
    raise exception 'TALK_TRACK' using errcode = '23514', hint = 'Only programs with tracks give talks a track.';
  end if;
  return new;
end;
$$;

create trigger session_talks_kind_check before insert or update of session_id, track_tag_id on public.session_talks
  for each row execute function public.session_talks_kind_check();

-- C (AIKUTHONs and point events) -----------------------------------------------------

create function public.aikuthons_derive_season()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.season_id := public.season_for_date(new.starts_on, true);
  return new;
end;
$$;

create trigger aikuthons_derive_season before insert or update of starts_on, season_id on public.aikuthons
  for each row execute function public.aikuthons_derive_season();

create function public.point_events_derive_season()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- An event without a date keeps the season it was given.
  if new.held_on is not null then
    new.season_id := public.season_for_date(new.held_on, true);
  end if;
  return new;
end;
$$;

create trigger point_events_derive_season before insert or update of held_on, season_id on public.point_events
  for each row execute function public.point_events_derive_season();

alter table public.aikuthons
  add constraint aikuthons_ends_after_start check (ends_on is null or ends_on >= starts_on),
  add constraint aikuthons_edition_numbered check (kind <> 'edition' or edition is not null);

-- D. generations.number --------------------------------------------------------------

alter table public.generations add column number smallint;

create function public.generations_derive_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parts text[] := regexp_match(btrim(new.name), '^(\d+)\s*기$');
begin
  if parts is null then
    raise exception 'GENERATION_NAME_FORMAT' using errcode = '22023',
      hint = 'Generation names look like 8기.';
  end if;
  new.number := parts[1]::smallint;
  new.name := parts[1] || '기';
  return new;
end;
$$;

create trigger generations_derive_number before insert or update of name on public.generations
  for each row execute function public.generations_derive_number();

update public.generations set name = name;

alter table public.generations
  alter column number set not null,
  add constraint generations_number_unique unique (number);

-- The automatic OB rule, on generation numbers (and standing aside during an undo).
create or replace function public.members_apply_ob_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  own integer;
  newest integer;
begin
  if new.grade_pinned or new.grade in ('ob', 'active_ob')
     or current_setting('aiku.admin_reverting', true) = 'on' then
    return new;
  end if;
  select number into own from public.generations where id = new.generation_id;
  select max(number) into newest from public.generations;
  if own is not null and own <= newest - 2 then
    new.grade := 'ob';
  end if;
  return new;
end;
$$;

create or replace function public.generations_retire_members()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('aiku.admin_reverting', true) = 'on' then
    return null;
  end if;
  update public.members m
    set grade = 'ob'
    from public.generations g
    where g.id = m.generation_id
      and not m.grade_pinned
      and m.grade not in ('ob', 'active_ob')
      and g.number <= (select max(number) from public.generations) - 2;
  return null;
end;
$$;

drop trigger generations_retire_members on public.generations;
create trigger generations_retire_members after insert or update of name, number on public.generations
  for each statement execute function public.generations_retire_members();

drop function public.generation_number(text);

-- E. sign-up requests name their generation by key ------------------------------------

alter table public.member_signup_requests
  add column generation_id uuid references public.generations (id) on delete set null;
update public.member_signup_requests r
  set generation_id = g.id from public.generations g where g.name = r.generation_name;
alter table public.member_signup_requests drop column generation_name;

-- F. keys, checks and the people tables -------------------------------------------------

alter table public.aikuthon_award_members
  add constraint aikuthon_award_members_unique_person unique (award_id, name);
alter table public.aikuthon_partners
  add constraint aikuthon_partners_unique_name unique (aikuthon_id, name);
alter table public.aikuthon_tracks
  add constraint aikuthon_tracks_unique_name unique (aikuthon_id, name);
alter table public.session_talks
  add constraint session_talks_unique_order unique (session_id, sort_order);

create unique index project_members_unique_member on public.project_members (project_id, member_id)
  where member_id is not null;
create unique index aikuthon_award_members_unique_member on public.aikuthon_award_members (award_id, member_id)
  where member_id is not null;
create unique index session_talk_speakers_unique_member on public.session_talk_speakers (talk_id, member_id)
  where member_id is not null;
create unique index projects_unique_award_rank on public.projects (season_id, award_rank)
  where award_rank is not null;

-- A person linked to a member shows the member's roster name, now and after a rename.
create function public.people_take_member_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_id is not null then
    select name into new.name from public.members where id = new.member_id;
  end if;
  return new;
end;
$$;

create trigger project_members_take_member_name before insert or update of member_id on public.project_members
  for each row execute function public.people_take_member_name();
create trigger aikuthon_award_members_take_member_name before insert or update of member_id on public.aikuthon_award_members
  for each row execute function public.people_take_member_name();
create trigger session_talk_speakers_take_member_name before insert or update of member_id on public.session_talk_speakers
  for each row execute function public.people_take_member_name();

create function public.members_rename_people()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.project_members set name = new.name where member_id = new.id;
  update public.aikuthon_award_members set name = new.name where member_id = new.id;
  update public.session_talk_speakers set name = new.name where member_id = new.id;
  return null;
end;
$$;

create trigger members_rename_people after update of name on public.members
  for each row when (old.name is distinct from new.name)
  execute function public.members_rename_people();

-- G. timestamps and import keys ----------------------------------------------------------

alter table public.aikuthon_partners add column created_at timestamptz not null default now();
alter table public.aikuthon_tracks add column created_at timestamptz not null default now();
alter table public.aikuthon_awards add column created_at timestamptz not null default now();
alter table public.aikuthon_award_members add column created_at timestamptz not null default now();
alter table public.attendance add column created_at timestamptz not null default now();
alter table public.project_tags add column created_at timestamptz not null default now();
alter table public.session_talk_speakers add column created_at timestamptz not null default now();

update public.activity_sessions set source_key = null
  where notion_page_id is not null and source_key = 'notion:' || notion_page_id;

-- Trigger and helper functions are not part of the API.
revoke all on function public.program_run_for(text, date) from public, anon, authenticated;
revoke all on function public.activity_sessions_derive() from public, anon, authenticated;
revoke all on function public.attendance_kind_check() from public, anon, authenticated;
revoke all on function public.session_talks_kind_check() from public, anon, authenticated;
revoke all on function public.aikuthons_derive_season() from public, anon, authenticated;
revoke all on function public.point_events_derive_season() from public, anon, authenticated;
revoke all on function public.generations_derive_number() from public, anon, authenticated;
revoke all on function public.people_take_member_name() from public, anon, authenticated;
revoke all on function public.members_rename_people() from public, anon, authenticated;

-- New tables reach the admin undo log too.
select public.admin_track('session_kinds');
select public.admin_track('program_runs');
