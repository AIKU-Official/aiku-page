-- Drops admin_apply_changes, replaced by admin_apply_batch
-- (20261113000001_admin_change_log), which logs who saved what so a save can
-- be undone. The site stopped calling the old function in that change; this
-- runs only after that code was live.
--
--   admin canvas ──▶ admin_apply_batch(jsonb, uuid)   (admin_apply_changes gone)
--
-- Who may call it: unchanged, only the server (service_role).

drop function public.admin_apply_changes(jsonb);
