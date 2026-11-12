-- Fixes from the review of the admin change log, tags and ordering.
--
--   admin_revert_batch ──sets── aiku.admin_reverting ──read by── assign_sort_order,
--                                                                members_apply_ob_rule,
--                                                                generations_retire_members
--   set_project_tags / set_aikuthon_tags ── tag clean-up now spares Momentum tracks
--
-- 1. Undo puts rows back exactly. Re-inserting a deleted project or member
--    used to give it a new sort order (first or last), and undoing "add a
--    generation" left the seniors it had made OB as OB, because the
--    automatic OB rule ran again on the restored rows. During an undo those
--    triggers now keep the values being restored.
-- 2. Tag clean-up deleted tags no project or AIKUTHON used, though a
--    Momentum talk may still use one as its track (ON DELETE RESTRICT), so a
--    later tag save failed.
-- 3. seasons_assign_sort_order did nothing (seasons_derive_term sets the
--    order from year and term right after it), and reorder_items still
--    offered seasons although their order cannot be set by hand.
-- 4. The admin functions are re-revoked from anon and authenticated, as the
--    change-log migration meant them to be.
--
-- Who may read and write: unchanged.

create or replace function public.admin_revert_batch(p_batch uuid, p_member uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  entries public.admin_change_log[];
  waiting public.admin_change_log[];
  entry public.admin_change_log;
  batch uuid;
  undone integer := 0;
  progress boolean;
  last_error text;
begin
  if not exists (select 1 from public.admin_change_batches where id = p_batch) then
    raise exception 'ADMIN_BATCH_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.admin_change_batches where reverts = p_batch) then
    raise exception 'ADMIN_ALREADY_REVERTED' using errcode = '23505';
  end if;

  insert into public.admin_change_batches (member_id, reverts) values (p_member, p_batch) returning id into batch;
  perform set_config('aiku.admin_batch', batch::text, true);
  -- Rows go back exactly as they were: triggers that would otherwise decide
  -- a value themselves (sort order, the automatic OB rule) stand aside.
  perform set_config('aiku.admin_reverting', 'on', true);

  select coalesce(array_agg(l order by l.id desc), '{}') into entries
    from public.admin_change_log l where l.batch_id = p_batch;

  while cardinality(entries) > 0 loop
    waiting := '{}';
    progress := false;
    foreach entry in array entries loop
      begin
        perform public.admin_undo_entry(entry);
        undone := undone + 1;
        progress := true;
      exception when foreign_key_violation then
        waiting := waiting || entry;
        last_error := sqlerrm;
      end;
    end loop;
    if not progress then
      raise exception '%', last_error using errcode = '23503';
    end if;
    entries := waiting;
  end loop;

  perform set_config('aiku.admin_batch', '', true);
  perform set_config('aiku.admin_reverting', '', true);
  return jsonb_build_object('batch', batch, 'undone', undone);
end;
$$;

create or replace function public.assign_sort_order()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  mode text := tg_argv[0];
  scope_col text := nullif(tg_argv[1], '');
  scope_val uuid;
  scope_changed boolean := false;
  edge integer;
begin
  -- An undo restores the row's own order.
  if current_setting('aiku.admin_reverting', true) = 'on' then
    return new;
  end if;

  if scope_col is not null then
    scope_val := (to_jsonb(new) ->> scope_col)::uuid;
    if tg_op = 'UPDATE' then
      scope_changed := scope_val is distinct from (to_jsonb(old) ->> scope_col)::uuid;
    end if;
  end if;

  if not (tg_op = 'INSERT' or scope_changed) then
    return new;
  end if;

  if scope_col is null then
    execute format(
      'select %s(sort_order) from %I.%I where id <> $1',
      case when mode = 'prepend' then 'min' else 'max' end,
      tg_table_schema,
      tg_table_name
    ) into edge using new.id;
  else
    execute format(
      'select %s(sort_order) from %I.%I where %I = $1 and id <> $2',
      case when mode = 'prepend' then 'min' else 'max' end,
      tg_table_schema,
      tg_table_name,
      scope_col
    ) into edge using scope_val, new.id;
  end if;

  new.sort_order := case
    when mode = 'prepend' then coalesce(edge, 1) - 1
    else coalesce(edge, -1) + 1
  end;
  return new;
end;
$$;

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
  if current_setting('aiku.admin_reverting', true) = 'on' then
    return null;
  end if;
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

create or replace function public.set_project_tags(p_project_id uuid, p_names text[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.tags (name)
  select distinct btrim(n) from unnest(p_names) as n where btrim(n) <> ''
  on conflict (name) do nothing;

  delete from public.project_tags where project_id = p_project_id;
  insert into public.project_tags (project_id, tag_id, sort_order)
  select p_project_id, tg.id, min(u.ord)
  from unnest(p_names) with ordinality as u(name, ord)
  join public.tags tg on tg.name = btrim(u.name)
  group by tg.id;

  -- Tags nothing uses any more go; a Momentum track is a use too.
  delete from public.tags tg
  where not exists (select 1 from public.project_tags x where x.tag_id = tg.id)
    and not exists (select 1 from public.aikuthon_tags x where x.tag_id = tg.id)
    and not exists (select 1 from public.session_talks x where x.track_tag_id = tg.id);
end;
$$;

create or replace function public.set_aikuthon_tags(p_aikuthon_id uuid, p_names text[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.tags (name)
  select distinct btrim(n) from unnest(p_names) as n where btrim(n) <> ''
  on conflict (name) do nothing;

  delete from public.aikuthon_tags where aikuthon_id = p_aikuthon_id;
  insert into public.aikuthon_tags (aikuthon_id, tag_id, sort_order)
  select p_aikuthon_id, tg.id, min(u.ord)
  from unnest(p_names) with ordinality as u(name, ord)
  join public.tags tg on tg.name = btrim(u.name)
  group by tg.id;

  -- Tags nothing uses any more go; a Momentum track is a use too.
  delete from public.tags tg
  where not exists (select 1 from public.project_tags x where x.tag_id = tg.id)
    and not exists (select 1 from public.aikuthon_tags x where x.tag_id = tg.id)
    and not exists (select 1 from public.session_talks x where x.track_tag_id = tg.id);
end;
$$;

drop trigger seasons_assign_sort_order on public.seasons;

create or replace function public.reorder_items(p_table text, p_ids uuid[], p_scope uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  scope_col text;
  expected uuid[];
begin
  -- Seasons are ordered by year and term (seasons_derive_term), not by hand.
  if p_table not in ('projects', 'news', 'generations', 'members') then
    raise exception 'INVALID_TABLE';
  end if;

  scope_col := case p_table
    when 'projects' then 'season_id'
    when 'members' then 'generation_id'
  end;

  if scope_col is not null and p_scope is null then
    raise exception 'SCOPE_REQUIRED';
  end if;

  if cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) as x) then
    raise exception 'DUPLICATE_IDS';
  end if;

  if scope_col is null then
    execute format('select coalesce(array_agg(id), ''{}'') from public.%I', p_table)
      into expected;
  else
    execute format(
      'select coalesce(array_agg(id), ''{}'') from public.%I where %I = $1',
      p_table,
      scope_col
    ) into expected using p_scope;
  end if;

  if not (expected @> p_ids and p_ids @> expected) then
    raise exception 'INCOMPLETE_IDS';
  end if;

  execute format(
    'update public.%I as t set sort_order = o.ord - 1
       from unnest($1::uuid[]) with ordinality as o(id, ord)
      where t.id = o.id',
    p_table
  ) using p_ids;
end;
$$;

revoke all on function public.admin_revert_batch(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_undo_entry(public.admin_change_log) from public, anon, authenticated;
grant execute on function public.admin_revert_batch(uuid, uuid) to service_role;
