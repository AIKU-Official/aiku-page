-- Members become OB automatically once their generation is two or more behind
-- the newest one (with 8기 as the newest, 6기 and earlier are OB). The rule is
-- enforced here so it holds no matter how a row is written, and it re-runs
-- whenever a generation is added. `grade_pinned` exempts a member with special
-- circumstances, whose grade then stays exactly as entered.

alter table public.members
  add column grade_pinned boolean not null default false;

-- "8기" -> 8. Null for names that are not a plain generation number.
create function public.generation_number(p_name text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select substring(p_name from '^(\d+)기$')::integer;
$$;

create function public.members_apply_ob_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  own integer;
  newest integer;
begin
  if new.grade_pinned or new.grade = 'ob' then
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

create trigger members_apply_ob_rule before insert or update on public.members
  for each row execute function public.members_apply_ob_rule();

-- A new (or renamed) generation can push older ones past the cutoff.
create function public.generations_retire_members()
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
      and m.grade <> 'ob'
      and public.generation_number(g.name)
        <= (select max(public.generation_number(name)) from public.generations) - 2;
  return null;
end;
$$;

create trigger generations_retire_members after insert or update of name on public.generations
  for each statement execute function public.generations_retire_members();

-- Trigger functions are not part of the API.
revoke execute on function public.members_apply_ob_rule() from public, anon, authenticated;
revoke execute on function public.generations_retire_members() from public, anon, authenticated;

-- Apply the rule to the members already stored.
update public.members m
  set grade = 'ob'
  from public.generations g
  where g.id = m.generation_id
    and m.grade <> 'ob'
    and public.generation_number(g.name)
      <= (select max(public.generation_number(name)) from public.generations) - 2;
