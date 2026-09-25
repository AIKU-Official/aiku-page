-- The gallery section was removed from the site. Its table was empty and no
-- uploads used the gallery/ storage folder, so this only drops the schema:
-- the table (with its triggers and policies) and its entry in the
-- reorder_items whitelist. create or replace keeps the function's grants.

drop table public.gallery_items;

create or replace function public.reorder_items(p_table text, p_ids uuid[], p_scope uuid default null)
returns void
language plpgsql
set search_path = ''
as $$
declare
  scope_col text;
  expected uuid[];
begin
  if p_table not in ('seasons', 'projects', 'news', 'generations', 'members') then
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
