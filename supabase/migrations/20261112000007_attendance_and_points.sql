-- Attendance and activity points (상벌점), private to each member.
--
--   seasons ──< activity_sessions ──< attendance >── members
--   point_rules ──< activity_sessions (by kind and status, through the view)
--   seasons ──< point_events ──< point_event_members >── members
--   point_rules ──< point_events
--   projects (award_rank) ── project_members >── members   (우수 프로젝트, derived)
--
-- A session is one meeting (a DeepIntoDeep lecture, a Seminar, a Momentum
-- session, a required event or a required after-party) and `attendance` holds
-- one status per member for it. `point_rules` is the society's points table
-- (the "상벌점 및 출결 기준" page) as data: attendance rules are keyed by
-- session kind and status, the others by code. `point_events` holds points
-- given by hand (a D2D lecture, a study, a special event), each to one or
-- more members. Points are never stored per member: `member_point_entries`
-- derives every entry from attendance, point events and project placings,
-- so a corrected record corrects the total. A semester is winter + 1st term
-- or summer + 2nd term; totals reset each semester.
--
-- Who may read and write: nobody but the server (secret key). The site reads
-- these for the signed-in member only, after checking their session, and
-- writes them from the admin page and the import script. They are never
-- shown on public pages.

create table public.point_rules (
  code text primary key constraint point_rules_code_format check (code ~ '^[a-z_]+$'),
  label text not null constraint point_rules_label_present check (btrim(label) <> ''),
  points numeric(4, 1) not null,
  -- Set for attendance rules only: which session kind and status they price.
  session_kind text constraint point_rules_session_kind_valid
    check (session_kind in ('deepintodeep', 'seminar', 'momentum', 'event', 'afterparty')),
  attendance_status text constraint point_rules_attendance_status_valid
    check (attendance_status in ('late', 'absent')),
  sort_order integer not null default 0,
  constraint point_rules_attendance_pair check ((session_kind is null) = (attendance_status is null)),
  constraint point_rules_attendance_unique unique (session_kind, attendance_status)
);

insert into public.point_rules (code, label, points, session_kind, attendance_status, sort_order) values
  ('seminar_absent', '세미나 무단결석', -1, 'seminar', 'absent', 10),
  ('seminar_late', '세미나 무단지각', -0.5, 'seminar', 'late', 11),
  ('momentum_absent', '모멘텀 무단결석', -1, 'momentum', 'absent', 12),
  ('momentum_late', '모멘텀 무단지각', -0.5, 'momentum', 'late', 13),
  ('deepintodeep_absent', 'D2D 무단결석', -2, 'deepintodeep', 'absent', 14),
  ('deepintodeep_late', 'D2D 무단지각', -0.5, 'deepintodeep', 'late', 15),
  ('event_absent', '필수 행사 무단결석', -2, 'event', 'absent', 16),
  ('event_late', '필수 행사 무단지각', -0.5, 'event', 'late', 17),
  ('afterparty_absent', '필수 뒤풀이 무단결석', -0.5, 'afterparty', 'absent', 18),
  ('special_event', '특별 행사 참여', 1, null, null, 30),
  ('deepintodeep_lecture', 'D2D 강의 진행', 2, null, null, 31),
  ('study_member', '스터디 참여 (스터디원)', 1, null, null, 32),
  ('study_leader', '스터디 참여 (스터디장)', 2, null, null, 33),
  ('seminar_mvp', '세미나 리뷰 MVP', 0.5, null, null, 34);

create table public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT: a season with sessions cannot be deleted.
  season_id uuid not null references public.seasons (id) on delete restrict,
  kind text not null constraint activity_sessions_kind_valid
    check (kind in ('deepintodeep', 'seminar', 'momentum', 'event', 'afterparty')),
  title text not null constraint activity_sessions_title_present check (btrim(title) <> ''),
  held_on date not null,
  -- Key of the source record; makes the import repeatable.
  source_key text unique,
  created_at timestamptz not null default now()
);

create index activity_sessions_season_idx on public.activity_sessions (season_id, held_on);

create table public.attendance (
  session_id uuid not null references public.activity_sessions (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  -- present: 출석; excused_late: 인정 지각; late: 무단지각;
  -- absent: 무단결석; excused_absent: 인정결석.
  status text not null constraint attendance_status_valid
    check (status in ('present', 'excused_late', 'late', 'absent', 'excused_absent')),
  -- Why an excused late or absence was excused; '' otherwise.
  reason text not null default '',
  primary key (session_id, member_id)
);

create index attendance_member_idx on public.attendance (member_id);

create table public.point_events (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete restrict,
  rule_code text not null references public.point_rules (code) on delete restrict,
  title text not null constraint point_events_title_present check (btrim(title) <> ''),
  held_on date,
  -- How many times the rule applies, e.g. 2 for "D2D 강의 (추가 2회분)".
  quantity smallint not null default 1 constraint point_events_quantity_positive check (quantity > 0),
  source_key text unique,
  created_at timestamptz not null default now()
);

create index point_events_season_idx on public.point_events (season_id);

create table public.point_event_members (
  event_id uuid not null references public.point_events (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  primary key (event_id, member_id)
);

create index point_event_members_member_idx on public.point_event_members (member_id);

-- One row per point a member earned or lost, from all three sources.
create view public.member_point_entries
with (security_invoker = true) as
select a.member_id, s.season_id, s.held_on, s.title, r.label, r.points, 'attendance'::text as source
from public.attendance a
join public.activity_sessions s on s.id = a.session_id
join public.point_rules r on r.session_kind = s.kind and r.attendance_status = a.status
union all
select m.member_id, e.season_id, e.held_on, e.title, r.label, r.points * e.quantity, 'event'
from public.point_event_members m
join public.point_events e on e.id = m.event_id
join public.point_rules r on r.code = e.rule_code
union all
select pm.member_id, p.season_id, null, p.title, '우수 프로젝트 ' || p.award_rank || '등', (4 - p.award_rank)::numeric, 'project'
from public.project_members pm
join public.projects p on p.id = pm.project_id
where pm.member_id is not null and p.award_rank is not null;

alter table public.point_rules enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.point_events enable row level security;
alter table public.point_event_members enable row level security;

-- No policies: only the server's secret key reads or writes these.
revoke all on public.point_rules, public.activity_sessions, public.attendance,
  public.point_events, public.point_event_members, public.member_point_entries
  from anon, authenticated;
