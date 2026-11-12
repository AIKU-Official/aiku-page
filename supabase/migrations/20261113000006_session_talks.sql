-- Talks within a session: who presented what at a Seminar or Momentum, and
-- each DeepIntoDeep lecture's topic and lecturer.
--
--   activity_sessions ──< session_talks ──< session_talk_speakers >── members
--                              └── track_tag_id ──> tags (Momentum's CV, NLP, RL)
--
-- A session holds its talks in order. A Momentum talk belongs to a track,
-- one of the field tags, so tracks share the one list of fields. A speaker
-- is stored by name and linked to a roster member when one matches, as
-- project participants are, so guests and former members still appear.
-- tags.abbreviation is the short form a tag goes by ("RL" for
-- Reinforcement Learning), used to read tracks and to label them.
--
-- Who may read and write: nobody but the server (secret key), like the rest
-- of activity_sessions; the site shows them to signed-in Studio members.

alter table public.tags
  add column abbreviation text unique
    constraint tags_abbreviation_present check (abbreviation is null or btrim(abbreviation) <> '');

update public.tags set abbreviation = 'RL' where name = 'Reinforcement Learning';

create table public.session_talks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.activity_sessions (id) on delete cascade,
  -- RESTRICT: a field in use as a track cannot be deleted.
  track_tag_id uuid references public.tags (id) on delete restrict,
  title text not null default '',
  -- The talk's keywords as the presenter listed them.
  keywords text[] not null default '{}',
  sort_order integer not null default 0,
  -- Key of the source record (the Notion block or curriculum row); makes the import repeatable.
  source_key text unique,
  created_at timestamptz not null default now()
);

create index session_talks_session_idx on public.session_talks (session_id, sort_order);

create table public.session_talk_speakers (
  id uuid primary key default gen_random_uuid(),
  talk_id uuid not null references public.session_talks (id) on delete cascade,
  -- SET NULL: removing someone from the roster keeps their name on the talk.
  member_id uuid references public.members (id) on delete set null,
  name text not null constraint session_talk_speakers_name_present check (btrim(name) <> ''),
  sort_order integer not null default 0,
  constraint session_talk_speakers_unique unique (talk_id, name)
);

create index session_talk_speakers_member_idx on public.session_talk_speakers (member_id);

alter table public.session_talks enable row level security;
alter table public.session_talk_speakers enable row level security;
revoke all on public.session_talks, public.session_talk_speakers from anon, authenticated;

-- Admin saves and undos reach these tables too.
select public.admin_track('session_talks');
select public.admin_track('session_talk_speakers');
