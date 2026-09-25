-- Public bucket for admin uploads (project decks and images, gallery images,
-- member photos). Objects are readable by URL; there are no write policies,
-- so uploads only happen through signed upload URLs issued by the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'aiku-uploads',
  'aiku-uploads',
  true,
  52428800, -- 50 MiB
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
