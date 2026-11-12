-- Change history for the admin canvas: who saved what, and the row before and
-- after, so a save can be looked back on and undone.
--
--   members ──< admin_change_batches ──< admin_change_log
--               (one per DB 업데이트,     (one per row written, including
--                who and when; a revert   rows a cascade deleted; the row
--                points at the batch it   before and after as jsonb)
--                undid)
--
-- Rows are logged by an AFTER trigger on every public table, but only inside
-- admin_apply_batch / admin_revert_batch, which set `aiku.admin_batch` for
-- their own transaction. Imports and the site's own writes are not logged.
-- New tables need the trigger too: `select public.admin_track('new_table');`.
--
-- Who may read and write: only the server (service_role). Both tables are
-- left off the canvas (src/lib/admin/table-policy.ts) and refused by the
-- apply function, so history cannot be edited from the canvas.
--
-- admin_apply_batch replaces admin_apply_changes, which stays until the site
-- no longer calls it and is dropped in a later migration.

create table public.admin_change_batches (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Set on a batch that undid another one.
  reverts uuid unique references public.admin_change_batches (id) on delete set null
);

create table public.admin_change_log (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.admin_change_batches (id) on delete cascade,
  table_name text not null,
  op text not null check (op in ('insert', 'update', 'delete')),
  old_row jsonb,
  new_row jsonb
);

create index admin_change_log_batch_idx on public.admin_change_log (batch_id, id);
create index admin_change_batches_created_idx on public.admin_change_batches (created_at desc);

alter table public.admin_change_batches enable row level security;
alter table public.admin_change_log enable row level security;
revoke all on public.admin_change_batches, public.admin_change_log from anon, authenticated;

create function public.admin_log_row()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  batch text := current_setting('aiku.admin_batch', true);
begin
  if batch is null or batch = '' then
    return null;
  end if;
  insert into public.admin_change_log (batch_id, table_name, op, old_row, new_row)
  values (
    batch::uuid,
    tg_table_name,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  );
  return null;
end;
$$;

create function public.admin_track(p_table text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format(
    'create trigger zz_admin_log after insert or update or delete on public.%I for each row execute function public.admin_log_row()',
    p_table
  );
end;
$$;

-- Every table the canvas can write to, and every table a cascade can reach.
do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
      and table_name not in ('login_attempts', 'admin_change_batches', 'admin_change_log')
  loop
    perform public.admin_track(t);
  end loop;
end;
$$;

-- "col = (row).col and …" for a table's primary key, values taken from p_row.
create function public.admin_key_condition(p_table text, p_row jsonb)
returns text
language sql
stable
set search_path = ''
as $$
  select string_agg(
           format('%I = (jsonb_populate_record(null::public.%I, %L::jsonb)).%I', a.attname, p_table, p_row::text, a.attname),
           ' and ')
    from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any (i.indkey)
   where i.indrelid = format('public.%I', p_table)::regclass and i.indisprimary;
$$;

-- Applies the canvas's changes in one transaction and logs them as one batch.
-- Returns {"batch": id, "applied": n}.
create function public.admin_apply_batch(p_changes jsonb, p_member uuid)
returns jsonb
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
  batch uuid;
begin
  if jsonb_typeof(p_changes) <> 'array' then
    raise exception 'ADMIN_CHANGES_NOT_ARRAY' using errcode = '22023';
  end if;

  insert into public.admin_change_batches (member_id) values (p_member) returning id into batch;
  perform set_config('aiku.admin_batch', batch::text, true);

  for change in select value from jsonb_array_elements(p_changes) loop
    target := change ->> 'table';
    op := change ->> 'op';
    vals := coalesce(change -> 'values', '{}'::jsonb);
    pk := coalesce(change -> 'key', '{}'::jsonb);

    if target is null
      or target = any (array['login_attempts', 'member_student_ids', 'admin_change_batches', 'admin_change_log'])
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

  perform set_config('aiku.admin_batch', '', true);
  return jsonb_build_object('batch', batch, 'applied', applied);
end;
$$;

-- Puts one logged row back as it was before. Refused (ADMIN_REVERT_STALE)
-- when the row is no longer exactly as the batch left it.
create function public.admin_undo_entry(entry public.admin_change_log)
returns void
language plpgsql
set search_path = ''
as $$
declare
  cond text;
  cols text;
  touched integer;
begin
  if entry.op in ('insert', 'update') then
    cond := format('%s and to_jsonb(%I.*) = %L::jsonb',
                   public.admin_key_condition(entry.table_name, entry.new_row), entry.table_name, entry.new_row::text);
  end if;
  if entry.op <> 'insert' then
    select string_agg(format('%I', k), ', ') into cols from jsonb_object_keys(entry.old_row) as k;
  end if;

  if entry.op = 'insert' then
    execute format('delete from public.%I where %s', entry.table_name, cond);
  elsif entry.op = 'update' then
    execute format('update public.%I set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1)) where %s',
                   entry.table_name, cols, cols, entry.table_name, cond)
      using entry.old_row;
  else
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1)',
                   entry.table_name, cols, cols, entry.table_name)
      using entry.old_row;
  end if;

  get diagnostics touched = row_count;
  if touched <> 1 then
    raise exception 'ADMIN_REVERT_STALE: %', entry.table_name using errcode = '40001';
  end if;
end;
$$;

-- Undoes a batch: its logged rows newest first, each put back as it was.
-- A cascade logs a parent before the rows that pointed at it, so a row that
-- cannot go back yet for a foreign key waits and is tried again once the
-- others are back. Refused when a row has changed since, when the batch was
-- already undone, or when undoing would clash with a newer row. The undo is
-- itself a batch, so it can be undone in turn.
create function public.admin_revert_batch(p_batch uuid, p_member uuid)
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
  return jsonb_build_object('batch', batch, 'undone', undone);
end;
$$;

revoke all on function public.admin_log_row() from public, anon, authenticated;
revoke all on function public.admin_track(text) from public, anon, authenticated;
revoke all on function public.admin_key_condition(text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_undo_entry(public.admin_change_log) from public, anon, authenticated;
revoke all on function public.admin_apply_batch(jsonb, uuid) from public, anon, authenticated;
revoke all on function public.admin_revert_batch(uuid, uuid) from public, anon, authenticated;
grant execute on function public.admin_apply_batch(jsonb, uuid) to service_role;
grant execute on function public.admin_revert_batch(uuid, uuid) to service_role;
