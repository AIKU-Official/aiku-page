-- AIKU homepage content schema.
--
-- Every content table has a `sort_order` that defines the public display order
-- (ascending). It is managed by the database: the assign_sort_order trigger
-- places every inserted row (the default of 0 is always overwritten) and
-- reorder_items() saves a new order. See the functions migration.
-- `legacy_id` records the id from the legacy content.json for idempotent
-- re-imports and is null for rows created in the new admin.

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
    constraint seasons_name_format check (
      name = btrim(name) and char_length(name) between 1 and 40 and name !~ '[/\\<>]'
    ),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  -- RESTRICT: a season that still has projects cannot be deleted.
  season_id uuid not null references public.seasons (id) on delete restrict,
  title text not null constraint projects_title_present check (btrim(title) <> ''),
  -- Field tags such as "#NLP #LLM".
  summary text not null default '',
  markdown text not null default '',
  github_url text constraint projects_github_url_http check (github_url ~* '^https?://'),
  -- Storage object path inside the aiku-uploads bucket, plus the original file
  -- name (may contain Korean) used as the download file name.
  presentation_path text,
  presentation_name text,
  -- Extra images appended below the markdown, in display order.
  image_paths text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_season_order_idx on public.projects (season_id, sort_order);

create table public.news (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  published_on date,
  title text not null constraint news_title_present check (btrim(title) <> ''),
  summary text not null default '',
  -- Absolute http(s) URL or a site-relative path such as /projects.
  link_url text constraint news_link_url_format check (link_url ~* '^(https?://|/)'),
  link_label text not null default '보기',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  category text not null default 'AIKU',
  title text not null constraint gallery_items_title_present check (btrim(title) <> ''),
  description text not null default '',
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null unique
    constraint generations_name_format check (
      name = btrim(name) and char_length(name) between 1 and 40 and name !~ '[/\\<>]'
    ),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  -- RESTRICT: a generation that still has members cannot be deleted.
  generation_id uuid not null references public.generations (id) on delete restrict,
  name text not null constraint members_name_present check (btrim(name) <> ''),
  summary text not null default '',
  email text constraint members_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  github_url text constraint members_github_url_http check (github_url ~* '^https?://'),
  linkedin_url text constraint members_linkedin_url_http check (linkedin_url ~* '^https?://'),
  website_url text constraint members_website_url_http check (website_url ~* '^https?://'),
  photo_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index members_generation_order_idx on public.members (generation_id, sort_order);

-- Failed admin logins, used for rate limiting. Never readable by clients.
create table public.login_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index login_attempts_ip_created_idx on public.login_attempts (ip, created_at);
