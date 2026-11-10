-- Local-only starter data for development: two empty seasons, no projects.
-- `supabase db reset` loads it after the migrations; `supabase db push` never
-- runs it, so the production database keeps only what the admin adds.

insert into public.seasons (name) values ('26-1'), ('25-2');
