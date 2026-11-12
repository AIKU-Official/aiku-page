-- AIKU's calendar: activity_sessions now holds every dated entry of the
-- society's schedule, not only sessions with attendance, so the calendar has
-- one source as Notion's 일정(활동 DB) had.
--
--   seasons ──< activity_sessions ──< attendance >── members
--                 kind: deepintodeep | seminar | momentum | event | afterparty
--                       | conference | exchange | academic | holiday | notice
--                 held_on ── ends_on (for entries over several days)
--                 notion_page_id: the Notion page it was imported from
--
-- New kinds: conference (AIKU Conference), exchange (joint events with other
-- societies, e.g. HAYAKU), academic (the university's calendar: exams,
-- course changes, graduation), holiday (public holidays), notice
-- (announcements and recruiting dates). Attendance and points still come
-- only from the kinds that have point rules; the new kinds have none.
-- AIKUTHONs stay in their own table and are merged into the calendar there.
--
-- Who may read and write: unchanged, only the server (secret key); the site
-- shows the calendar to signed-in Studio members.

alter table public.activity_sessions drop constraint activity_sessions_kind_valid;
alter table public.activity_sessions
  add constraint activity_sessions_kind_valid check (kind in (
    'deepintodeep', 'seminar', 'momentum', 'event', 'afterparty',
    'conference', 'exchange', 'academic', 'holiday', 'notice'
  ));

alter table public.activity_sessions
  add column ends_on date,
  add column notion_page_id text unique,
  add constraint activity_sessions_ends_after_start check (ends_on is null or ends_on > held_on);
