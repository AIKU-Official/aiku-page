-- Member-written profile, one optional row per roster member.
--
--   members ──  member_profiles      (everything a member writes about themselves)
--
-- The roster row (name, department, generation, grade, title) stays under admin
-- control in `members`; this table holds only what the member edits. A profile
-- is visible to others only while `is_public` is true. Rows are written by the
-- server (secret key) on behalf of the signed-in member.

create table public.member_profiles (
  member_id uuid primary key references public.members (id) on delete cascade,
  -- Shown to visitors (and their links on the member card) only when true.
  is_public boolean not null default false,
  -- e.g. "Research Intern, Vision & AI Lab, Korea University".
  headline text not null default '',
  -- Smaller line under the headline, e.g. "Junior in Computer Science · Seoul".
  tagline text not null default '',
  bio text not null default '',
  -- Object path in the aiku-uploads bucket: members/<member id>/<file>.
  avatar_path text,
  contact_email text
    constraint member_profiles_contact_email_format
    check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  github_url text constraint member_profiles_github_url_http check (github_url ~* '^https?://'),
  instagram_url text
    constraint member_profiles_instagram_url_http check (instagram_url ~* '^https?://'),
  linkedin_url text
    constraint member_profiles_linkedin_url_http check (linkedin_url ~* '^https?://'),
  website_url text constraint member_profiles_website_url_http check (website_url ~* '^https?://'),
  -- Short keyword tags.
  focus text[] not null default '{}',
  -- Ordered lists that belong wholly to this profile and are never queried on
  -- their own, so they are kept as JSON arrays rather than child tables:
  --   interests  [{ "title", "description" }]
  --   skills     [{ "label", "items" }]
  --   experience [{ "period", "title", "organization" }]
  interests jsonb not null default '[]'
    constraint member_profiles_interests_array check (jsonb_typeof(interests) = 'array'),
  skills jsonb not null default '[]'
    constraint member_profiles_skills_array check (jsonb_typeof(skills) = 'array'),
  experience jsonb not null default '[]'
    constraint member_profiles_experience_array check (jsonb_typeof(experience) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger member_profiles_set_updated_at before update on public.member_profiles
  for each row execute function public.set_updated_at();

alter table public.member_profiles enable row level security;

create policy "Anyone can read public profiles" on public.member_profiles
  for select to anon, authenticated using (is_public);

create policy "Members read their own profile" on public.member_profiles
  for select to authenticated using (
    member_id in (
      select member_id from public.member_accounts where user_id = (select auth.uid())
    )
  );

grant select on public.member_profiles to anon, authenticated;
revoke insert, update, delete, truncate on public.member_profiles from anon, authenticated;
