-- Tidies the roster and the project archive: three changes, no new behaviour.
--
--   generations ──< members ──  member_profiles   (links and picture, written by the member)
--        │             │
--        └────────< member_positions              (officer titles: "8기 회장")
--
--   seasons ──< projects (tags text[]) ──< project_members >── members
--
-- A. `members` loses the columns nobody fills in any more (summary, email,
--    github_url, linkedin_url, website_url, photo_path). A member's own links
--    and picture live in `member_profiles`.
-- B. `projects.summary`, a string such as "#NLP #LLM", becomes `projects.tags`,
--    an array of the tags without the "#".
-- C. `members.position`, a string such as "8기 회장", becomes rows of
--    `member_positions`. The generation of a title is its own reference,
--    because a member can hold office in a generation other than their own.
--
-- Who may read and write: `member_positions` is readable by anyone, like the
-- roster itself, and written only by the server (secret key) from the admin
-- page. Nothing changes for `members` and `projects`.

-- A. members: unused columns ---------------------------------------------------

-- The check constraints on these columns go with them.
alter table public.members
  drop column summary,
  drop column email,
  drop column github_url,
  drop column linkedin_url,
  drop column website_url,
  drop column photo_path;

-- B. projects: summary -> tags --------------------------------------------------

alter table public.projects
  -- Field tags without the "#", in display order, e.g. {NLP,LLM}.
  add column tags text[] not null default '{}';

-- "#NLP #Speech Recognition" -> {NLP,"Speech Recognition"}: a tag runs until the
-- next " #", so it may contain spaces.
update public.projects p
  set tags = coalesce(
    (
      select array_agg(btrim(part.tag) order by part.position)
      from regexp_split_to_table(btrim(p.summary), '(^|\s+)#') with ordinality as part (tag, position)
      where btrim(part.tag) <> ''
    ),
    '{}'
  )
  where btrim(p.summary) like '#%';

-- A summary that does not start with "#" is a sentence, not tags: it becomes
-- the one-line description unless the project already has one.
update public.projects
  set one_line = btrim(summary)
  where btrim(summary) <> ''
    and btrim(summary) not like '#%'
    and one_line = '';

alter table public.projects drop column summary;

-- C. members.position -> member_positions ---------------------------------------

create table public.member_positions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  -- The generation the title belongs to, which need not be the member's own.
  -- RESTRICT: a generation that still has officers cannot be deleted.
  generation_id uuid not null references public.generations (id) on delete restrict,
  title text not null constraint member_positions_title_valid check (title in ('회장', '부회장')),
  created_at timestamptz not null default now(),
  constraint member_positions_unique_title unique (member_id, generation_id, title)
);

create index member_positions_generation_idx on public.member_positions (generation_id);

alter table public.member_positions enable row level security;

create policy "Anyone can read member positions" on public.member_positions
  for select to anon, authenticated using (true);

grant select on public.member_positions to anon, authenticated;
revoke insert, update, delete, truncate on public.member_positions from anon, authenticated;

insert into public.member_positions (member_id, generation_id, title)
  select m.id, g.id, parsed.parts[2]
  from public.members m
  cross join lateral regexp_match(m.position, '^(\d+기) (회장|부회장)$') as parsed (parts)
  join public.generations g on g.name = parsed.parts[1];

-- Every title must have been carried over before the column is dropped.
do $$
declare
  missing integer;
begin
  select count(*) into missing
    from public.members m
    where btrim(m.position) <> ''
      and not exists (select 1 from public.member_positions p where p.member_id = m.id);
  if missing > 0 then
    raise exception
      '% member(s) have a position that is not "<N>기 회장|부회장" of a known generation; fix them first',
      missing;
  end if;
end;
$$;

alter table public.members drop column position;
