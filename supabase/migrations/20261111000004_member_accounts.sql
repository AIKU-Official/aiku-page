-- Member sign-in: links Supabase Auth users (Google / GitHub) to roster members.
--
--   auth.users ──< member_accounts >── members      (a member may have several
--                                                     accounts, e.g. Google and GitHub)
--   auth.users ──  member_signup_requests            (sign-ups that did not match
--                                                     the roster; an admin decides)
--
-- Rows are written only by the server (secret key). A signed-in user may read
-- their own row, nothing else.

create table public.member_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index member_accounts_member_idx on public.member_accounts (member_id);

create table public.member_signup_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Shown to the admin who reviews the request.
  email text,
  name text not null constraint member_signup_requests_name_present check (btrim(name) <> ''),
  generation_name text not null,
  -- Failed verification attempts; sign-up is blocked after too many.
  attempts integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger member_signup_requests_set_updated_at before update on public.member_signup_requests
  for each row execute function public.set_updated_at();

alter table public.member_accounts enable row level security;
alter table public.member_signup_requests enable row level security;

create policy "Users read their own member link" on public.member_accounts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Users read their own sign-up request" on public.member_signup_requests
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.member_accounts, public.member_signup_requests from anon;
revoke insert, update, delete, truncate
  on public.member_accounts, public.member_signup_requests
  from authenticated;
