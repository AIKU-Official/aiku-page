-- Seasons are AIKU's unit of time; this makes the seasons table the one
-- place that says which days a season covers and what a season is called.
--
--   seasons (name, year, term, starts_on, ends_on)
--     ├──< projects, aikuthons, activity_sessions, point_events …
--     └── season_for_date(day): the season a day falls in, made if missing
--
-- Terms by month: winter (W, 겨울) January–February, 1 March–June, summer
-- (S, 여름) July–August, 2 September–December. This file holds that rule for
-- the database; src/lib/seasons/name.ts mirrors it for the browser, and
-- import scripts ask season_for_date instead of working dates out themselves.
--
-- Names: stored as 26-1, 26-여름, 26-2, 26-겨울. Accepted on the way in, and
-- rewritten to that form: the year in two or four digits, and the term as
-- 1, 2, 여름 or S, 겨울 or W (26-1 = 2026-1, 2026-W = 2026-겨울 = 26-겨울).
--
-- Who may read and write: unchanged (seasons are public to read, the server
-- writes); season_for_date is for the server only.

alter table public.seasons
  add column starts_on date,
  add column ends_on date;

create or replace function public.seasons_derive_term()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parts text[] := regexp_match(btrim(new.name), '^(?:20)?([0-9]{2})-(1|2|여름|겨울|[sS]|[wW])$');
  first_month integer;
  last_month integer;
begin
  if parts is null then
    raise exception 'SEASON_NAME_FORMAT' using errcode = '22023',
      hint = 'Season names look like 26-1, 26-여름 (26-S), 26-2 or 26-겨울 (26-W); the year may have four digits.';
  end if;
  new.year := 2000 + parts[1]::smallint;
  new.term := case upper(parts[2])
    when '겨울' then 'winter' when 'W' then 'winter'
    when '여름' then 'summer' when 'S' then 'summer'
    else parts[2] end;
  -- One stored form, whatever alias was typed.
  new.name := parts[1] || '-' || case new.term when 'winter' then '겨울' when 'summer' then '여름' else new.term end;
  -- Within a year: winter (Jan–Feb), 1st term, summer, 2nd term.
  -- Smaller sorts first, so the newest season comes first.
  new.sort_order := -(new.year * 10 + array_position(array['winter', '1', 'summer', '2'], new.term));
  first_month := case new.term when 'winter' then 1 when '1' then 3 when 'summer' then 7 else 9 end;
  last_month := case new.term when 'winter' then 2 when '1' then 6 when 'summer' then 8 else 12 end;
  new.starts_on := make_date(new.year, first_month, 1);
  new.ends_on := (make_date(new.year, last_month, 1) + interval '1 month' - interval '1 day')::date;
  return new;
end;
$$;

-- Fills the dates of the seasons already stored.
update public.seasons set name = name;

alter table public.seasons
  alter column starts_on set not null,
  alter column ends_on set not null;

create index seasons_dates_idx on public.seasons (starts_on, ends_on);

-- The season a day falls in. With p_create, a season not stored yet is made
-- (for imports); without it, null when there is none.
create function public.season_for_date(p_day date, p_create boolean default false)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  found uuid;
  term text;
begin
  select id into found from public.seasons where p_day between starts_on and ends_on;
  if found is not null or not p_create then
    return found;
  end if;
  term := case
    when extract(month from p_day) <= 2 then '겨울'
    when extract(month from p_day) <= 6 then '1'
    when extract(month from p_day) <= 8 then '여름'
    else '2' end;
  insert into public.seasons (name) values (to_char(p_day, 'YY') || '-' || term) returning id into found;
  return found;
end;
$$;

revoke all on function public.season_for_date(date, boolean) from public, anon, authenticated;
grant execute on function public.season_for_date(date, boolean) to service_role;
