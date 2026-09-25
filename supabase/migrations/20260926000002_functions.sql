-- Keeps updated_at current. A statement that sets updated_at explicitly (e.g.
-- the legacy import preserving original timestamps) wins over the trigger.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

-- Gives every inserted row (and a row moved to another scope) its place in the
-- display order: 'prepend' puts it first, 'append' puts it last. Any
-- sort_order supplied by the caller is ignored; use reorder_items() to set an
-- explicit order. The optional second argument names the column that scopes
-- the ordering (e.g. projects are ordered within their season).
create function public.assign_sort_order()
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

create trigger seasons_set_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
create trigger news_set_updated_at before update on public.news
  for each row execute function public.set_updated_at();
create trigger gallery_items_set_updated_at before update on public.gallery_items
  for each row execute function public.set_updated_at();
create trigger generations_set_updated_at before update on public.generations
  for each row execute function public.set_updated_at();
create trigger members_set_updated_at before update on public.members
  for each row execute function public.set_updated_at();

-- Same placement rules as the legacy admin: news, gallery items and projects
-- appear first; seasons, generations and members are added last.
create trigger seasons_assign_sort_order before insert on public.seasons
  for each row execute function public.assign_sort_order('append');
create trigger generations_assign_sort_order before insert on public.generations
  for each row execute function public.assign_sort_order('append');
create trigger news_assign_sort_order before insert on public.news
  for each row execute function public.assign_sort_order('prepend');
create trigger gallery_items_assign_sort_order before insert on public.gallery_items
  for each row execute function public.assign_sort_order('prepend');
create trigger projects_assign_sort_order before insert or update of season_id on public.projects
  for each row execute function public.assign_sort_order('prepend', 'season_id');
create trigger members_assign_sort_order before insert or update of generation_id on public.members
  for each row execute function public.assign_sort_order('append', 'generation_id');

-- Saves a new display order in one transaction. p_ids must contain every row
-- of the table (or of the scope, for projects/members) exactly once, which
-- also turns a reorder from a stale admin page into an error instead of a
-- silently wrong order. Errors are raised with stable messages that the app
-- maps to Korean text: DUPLICATE_IDS, INCOMPLETE_IDS.
create function public.reorder_items(p_table text, p_ids uuid[], p_scope uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  scope_col text;
  expected uuid[];
begin
  if p_table not in ('seasons', 'projects', 'news', 'gallery_items', 'generations', 'members') then
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

-- Only the server (service_role) may reorder.
revoke execute on function public.reorder_items(text, uuid[], uuid) from public, anon, authenticated;
grant execute on function public.reorder_items(text, uuid[], uuid) to service_role;
