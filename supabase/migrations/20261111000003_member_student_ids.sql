-- Sign-up verification data, one row per member (child of public.members).
--
-- A visitor who signs in for the first time claims to be a member by entering
-- name, generation and student ID; the server compares the ID against this
-- table. Only an HMAC-SHA256 digest of the ID is stored (keyed with the
-- server-side MEMBER_VERIFICATION_SECRET), never the ID itself.
--
-- Like login_attempts, the table is never readable by clients: RLS is on with
-- no policy, so only the server's secret key can touch it.

create table public.member_student_ids (
  member_id uuid primary key references public.members (id) on delete cascade,
  -- Lowercase hex HMAC-SHA256 of the 10-digit student ID.
  digest text not null constraint member_student_ids_digest_format check (digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger member_student_ids_set_updated_at before update on public.member_student_ids
  for each row execute function public.set_updated_at();

alter table public.member_student_ids enable row level security;
-- Intentionally no policy.
revoke all on public.member_student_ids from anon, authenticated;
