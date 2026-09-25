import "server-only";

import type { AdminDb } from "@/lib/actions/admin-action";

import { UPLOAD_BUCKET } from "./public-url";

// Best-effort cleanup: a failed delete leaves an orphaned file behind (which
// `pnpm storage:gc` can remove later) but must not fail the admin's change.

export async function removeObjects(db: AdminDb, paths: string[]): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) {
    return;
  }
  const { error } = await db.storage.from(UPLOAD_BUCKET).remove(unique);
  if (error) {
    console.error("[storage] remove failed", unique, error.message);
  }
}

/** Deletes every object in `<prefix>/` (an entity's upload folder). */
export async function removeFolder(db: AdminDb, prefix: string): Promise<void> {
  const { data, error } = await db.storage.from(UPLOAD_BUCKET).list(prefix, { limit: 1000 });
  if (error) {
    console.error("[storage] list failed", prefix, error.message);
    return;
  }
  await removeObjects(
    db,
    (data ?? []).map((object) => `${prefix}/${object.name}`),
  );
}
