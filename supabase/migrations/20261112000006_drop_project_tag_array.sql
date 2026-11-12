-- Drops `projects.tags`, the text array that `project_tags` replaced.
--
--   projects ──< project_tags >── tags
--
-- Applied after the code that reads `project_tags` is live, so the site never
-- reads a missing column. Who may read and write is unchanged.

alter table public.projects drop column tags;
