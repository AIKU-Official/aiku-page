-- Visitors (anon key) may only read published content. All writes go through
-- the Next.js server with the secret key, which bypasses RLS.

alter table public.seasons enable row level security;
alter table public.projects enable row level security;
alter table public.news enable row level security;
alter table public.gallery_items enable row level security;
alter table public.generations enable row level security;
alter table public.members enable row level security;
alter table public.login_attempts enable row level security;

create policy "Anyone can read seasons" on public.seasons
  for select to anon, authenticated using (true);
create policy "Anyone can read projects" on public.projects
  for select to anon, authenticated using (true);
create policy "Anyone can read news" on public.news
  for select to anon, authenticated using (true);
create policy "Anyone can read gallery items" on public.gallery_items
  for select to anon, authenticated using (true);
create policy "Anyone can read generations" on public.generations
  for select to anon, authenticated using (true);
create policy "Anyone can read members" on public.members
  for select to anon, authenticated using (true);
-- login_attempts intentionally has no policy.

-- Defense in depth on top of RLS.
revoke insert, update, delete, truncate
  on public.seasons, public.projects, public.news, public.gallery_items,
     public.generations, public.members
  from anon, authenticated;
revoke all on public.login_attempts from anon, authenticated;
