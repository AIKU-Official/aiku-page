import "server-only";

import { type AdminDb, unwrap } from "@/lib/actions/admin-action";

import type { Batch } from "./history";
import { rowsHidden } from "./table-policy";

const HISTORY_SIZE = 30;

/**
 * The latest saves from the canvas, newest first, with every row they wrote.
 * Server only and not an action: the admin page calls it after requireAdmin.
 */
export async function loadHistory(db: AdminDb): Promise<Batch[]> {
  const rows = unwrap(
    await db
      .from("admin_change_batches")
      .select(
        "id, created_at, reverts, member:members(name), entries:admin_change_log(id, table_name, op, old_row, new_row)",
      )
      .order("created_at", { ascending: false })
      .order("id", { referencedTable: "admin_change_log", ascending: true })
      .limit(HISTORY_SIZE),
  );
  // Rows of secret tables (student ID hashes) stay in the database for undo
  // but are never sent to the browser.
  return ((rows ?? []) as unknown as Batch[]).map((batch) => ({
    ...batch,
    entries: batch.entries.map((entry) =>
      rowsHidden(entry.table_name) ? { ...entry, old_row: null, new_row: null } : entry,
    ),
  }));
}
