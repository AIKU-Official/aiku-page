-- Roster fields for the member directory: every member now carries a
-- department, a membership grade and an optional officer title, so the
-- Members page can list the whole society, not only members with a profile.

alter table public.members
  -- e.g. "컴퓨터학과". Empty when unknown.
  add column department text not null default '',
  add column grade text not null default 'ob'
    constraint members_grade_known check (grade in ('junior', 'senior', 'ob')),
  -- Officer title such as "8기 회장". Empty for members without one.
  add column position text not null default '';
