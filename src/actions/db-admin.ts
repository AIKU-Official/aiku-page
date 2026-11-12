"use server";

import { z } from "zod";

import { ActionError, adminAction, unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { loadSchema } from "@/lib/admin/schema";
import type { Json, Row } from "@/lib/admin/schema-types";
import { LABEL_COLUMNS, rowsHidden } from "@/lib/admin/table-policy";
import { emailToLoginId } from "@/lib/auth/login-id";
import { CONTENT_KINDS } from "@/lib/cache/content-paths";

// Server side of the admin canvas. Every action goes through adminAction,
// which checks the admin session (a current officer) before anything runs.

const MAX_ROWS = 2000;

const tableSchema = z.string().regex(/^[a-z_]+$/, "표 이름이 올바르지 않습니다.");

async function knownTable(name: string) {
  const table = (await loadSchema()).find((candidate) => candidate.name === name);
  if (!table) throw new ActionError("없는 표입니다.");
  return table;
}

/** The rows of one table, for its panel. Tables holding secrets send none. */
export async function getTableRows(input: unknown): Promise<ActionResult<Row[]>> {
  return adminAction({ schema: tableSchema, input }, async (name, db) => {
    const table = await knownTable(name);
    if (table.rowsHidden) return { message: "", data: [] };
    let query = db.from(name as never).select("*").limit(MAX_ROWS);
    for (const column of table.primaryKey) query = query.order(column as never);
    const rows = unwrap(await query) as Row[] | null;
    return { message: "", data: rows ?? [] };
  });
}

export type RowOption = { value: Json; label: string };

/** Choices for a column that points at another table: key and a readable label. */
export async function getRowOptions(input: unknown): Promise<ActionResult<RowOption[]>> {
  return adminAction(
    { schema: z.object({ table: tableSchema, column: z.string().regex(/^[a-z_]+$/) }), input },
    async ({ table: name, column }, db) => {
      const table = await knownTable(name);
      if (table.rowsHidden) return { message: "", data: [] };
      const label = LABEL_COLUMNS.find((candidate) => table.columns.some((c) => c.name === candidate));
      const columns = [...new Set([column, ...(label ? [label] : [])])].join(", ");
      const rows = (unwrap(await db.from(name as never).select(columns).limit(MAX_ROWS)) ?? []) as Row[];
      const options = rows
        .map((row) => ({ value: row[column] ?? null, label: label ? String(row[label] ?? "") : String(row[column]) }))
        .sort((a, b) => a.label.localeCompare(b.label, "ko"));
      return { message: "", data: options };
    },
  );
}

const rowSchema = z.record(z.string().regex(/^[a-z_0-9]+$/), z.any());
const changesSchema = z
  .array(
    z.discriminatedUnion("op", [
      z.object({ op: z.literal("insert"), table: tableSchema, values: rowSchema }),
      z.object({ op: z.literal("update"), table: tableSchema, key: rowSchema, values: rowSchema }),
      z.object({ op: z.literal("delete"), table: tableSchema, key: rowSchema }),
    ]),
  )
  .min(1, "반영할 변경 사항이 없습니다.")
  .max(500, "한 번에 500개까지 반영할 수 있습니다.");

// Messages for the database's refusals, shown to the admin as they are.
const DB_MESSAGES: { match: RegExp; message: (detail: string) => string }[] = [
  { match: /ADMIN_ROW_NOT_FOUND/, message: () => "그사이 바뀌었거나 지워진 행이 있습니다. 새로고침한 뒤 다시 시도하세요." },
  { match: /ADMIN_TABLE_NOT_ALLOWED/, message: () => "이 표는 직접 고칠 수 없습니다." },
  { match: /violates foreign key constraint/, message: (d) => `다른 표가 이 행을 가리키고 있거나, 가리키는 행이 없습니다. (${d})` },
  { match: /duplicate key value/, message: (d) => `같은 값을 가진 행이 이미 있습니다. (${d})` },
  { match: /null value in column "([^"]+)"/, message: (d) => `필수 칸이 비어 있습니다: ${/column "([^"]+)"/.exec(d)?.[1] ?? ""}` },
  { match: /violates check constraint/, message: (d) => `허용되지 않는 값이 있습니다. (${d})` },
  { match: /invalid input syntax|invalid input value/, message: (d) => `값의 형식이 맞지 않습니다. (${d})` },
  { match: /SEASON_NAME_FORMAT/, message: () => "분기 이름은 26-1, 26-여름, 26-2, 26-겨울처럼 입력하세요." },
];

/**
 * Applies the canvas's pending changes in one database transaction: all of
 * them or none. Afterwards the public pages are rebuilt, and an AIKU ID login
 * whose sign-up request was deleted (rejected) is removed with it, as the old
 * rejection did, which frees the ID.
 */
export async function commitChanges(input: unknown): Promise<ActionResult<{ applied: number }>> {
  return adminAction(
    { schema: changesSchema, input, revalidate: [...CONTENT_KINDS] },
    async (changes, db) => {
      if (changes.some((change) => rowsHidden(change.table))) {
        throw new ActionError("이 표는 직접 고칠 수 없습니다.");
      }
      const rejected = changes
        .filter((change) => change.op === "delete" && change.table === "member_signup_requests")
        .map((change) => String((change as { key: Row }).key.user_id ?? ""));
      const rejectedLogins = rejected.length
        ? ((unwrap(
            await db.from("member_signup_requests").select("user_id, email").in("user_id", rejected),
          ) ?? []) as { user_id: string; email: string }[])
        : [];

      const { data, error } = await db.rpc("admin_apply_changes", { p_changes: changes as Json });
      if (error) {
        const detail = [error.message, error.details].filter(Boolean).join(" ");
        const known = DB_MESSAGES.find(({ match }) => match.test(detail));
        if (known) throw new ActionError(known.message(detail));
        throw error;
      }

      for (const row of rejectedLogins) {
        if (emailToLoginId(row.email)) await db.auth.admin.deleteUser(row.user_id);
      }
      return { message: `${data}건을 DB에 반영했습니다.`, data: { applied: Number(data) } };
    },
  );
}
