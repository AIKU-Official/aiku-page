-- admin_apply_changes: applies a batch of row changes from the admin canvas in
-- one transaction, so a batch lands whole or not at all.
--
--   admin canvas ──(server action, admin session)──▶ admin_apply_changes(jsonb)
--                                                     └─▶ any public base table
--
-- Each change is {"op": "insert" | "update" | "delete", "table": "...",
-- "key": {primary key column: value}, "values": {column: value}}. Values are
-- cast through the table's own row type (jsonb_populate_record), so every
-- column keeps its type, defaults apply to columns not given, and table and
-- column names are quoted (format %I). An update or delete must hit exactly
-- one row, or the whole batch is rolled back.
--
-- Who may call it: only the server (secret key, service_role), and the site
-- calls it only for a signed-in current officer. Tables holding secrets
-- (login_attempts, member_student_ids) are refused.

create function public.admin_apply_changes(p_changes jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  change jsonb;
  target text;
  op text;
  vals jsonb;
  pk jsonb;
  cols text;
  cond text;
  touched integer;
  applied integer := 0;
begin
  if jsonb_typeof(p_changes) <> 'array' then
    raise exception 'ADMIN_CHANGES_NOT_ARRAY' using errcode = '22023';
  end if;

  for change in select value from jsonb_array_elements(p_changes) loop
    target := change ->> 'table';
    op := change ->> 'op';
    vals := coalesce(change -> 'values', '{}'::jsonb);
    pk := coalesce(change -> 'key', '{}'::jsonb);

    if target is null
      or target = any (array['login_attempts', 'member_student_ids'])
      or not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = target and table_type = 'BASE TABLE'
      ) then
      raise exception 'ADMIN_TABLE_NOT_ALLOWED: %', target using errcode = '42501';
    end if;

    if op in ('update', 'delete') then
      if pk = '{}'::jsonb then
        raise exception 'ADMIN_KEY_REQUIRED: %', target using errcode = '22023';
      end if;
      select string_agg(
               format('%I = (jsonb_populate_record(null::public.%I, %L::jsonb)).%I', k, target, pk::text, k),
               ' and ')
        into cond
        from jsonb_object_keys(pk) as k;
    end if;

    select string_agg(format('%I', k), ', ') into cols from jsonb_object_keys(vals) as k;

    if op = 'insert' then
      if cols is null then
        execute format('insert into public.%I default values', target);
      else
        execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
                       target, cols, cols, target)
          using vals;
      end if;
      applied := applied + 1;
    elsif op = 'update' then
      if cols is null then
        continue;
      end if;
      execute format('update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where %s',
                     target, cols, cols, target, cond)
        using vals;
      get diagnostics touched = row_count;
      if touched <> 1 then
        raise exception 'ADMIN_ROW_NOT_FOUND: % %', target, pk::text using errcode = 'P0002';
      end if;
      applied := applied + 1;
    elsif op = 'delete' then
      execute format('delete from public.%I where %s', target, cond);
      get diagnostics touched = row_count;
      if touched <> 1 then
        raise exception 'ADMIN_ROW_NOT_FOUND: % %', target, pk::text using errcode = 'P0002';
      end if;
      applied := applied + 1;
    else
      raise exception 'ADMIN_OP_INVALID: %', op using errcode = '22023';
    end if;
  end loop;

  return applied;
end;
$$;

revoke all on function public.admin_apply_changes(jsonb) from public, anon, authenticated;
grant execute on function public.admin_apply_changes(jsonb) to service_role;
