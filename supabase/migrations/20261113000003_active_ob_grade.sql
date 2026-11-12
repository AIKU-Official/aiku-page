-- 활동 OB: an OB member who still takes part, as Notion's member list marks
-- them (등급: 명예 OB / 활동 OB / 주니어 / 시니어).
--
--   generations ──< members.grade: junior | senior | ob (명예 OB) | active_ob (활동 OB)
--
-- AIKU Studio, the members' activity pages, is open to junior, senior and
-- active_ob; plain ob (명예 OB) and visitors see the public site. The public
-- roster shows both kinds of OB as "OB". The automatic OB rule still turns
-- juniors and seniors two generations behind into ob, and leaves anyone
-- already ob or active_ob as they are, so officers mark 활동 OB by hand.
--
-- Who may read and write: unchanged (members is public to read, server to write).

alter table public.members drop constraint members_grade_known;
alter table public.members
  add constraint members_grade_known check (grade in ('junior', 'senior', 'ob', 'active_ob'));

create or replace function public.members_apply_ob_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  own integer;
  newest integer;
begin
  if new.grade_pinned or new.grade in ('ob', 'active_ob') then
    return new;
  end if;

  select public.generation_number(name) into own
    from public.generations where id = new.generation_id;
  select max(public.generation_number(name)) into newest from public.generations;

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
  update public.members m
    set grade = 'ob'
    from public.generations g
    where g.id = m.generation_id
      and not m.grade_pinned
      and m.grade not in ('ob', 'active_ob')
      and public.generation_number(g.name)
        <= (select max(public.generation_number(name)) from public.generations) - 2;
  return null;
end;
$$;
