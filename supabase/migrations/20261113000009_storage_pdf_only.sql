-- Slides as PDF only: the upload bucket stops accepting PowerPoint files, as
-- the site already only offers slides as PDF (no stored slide is .ppt/.pptx).
--
--   storage.buckets 'aiku-uploads' (public read by URL; uploads only through
--   signed URLs issued by the server)
--
-- Who may read and write: unchanged.

update storage.buckets
set allowed_mime_types = array[
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf'
]
where id = 'aiku-uploads';
