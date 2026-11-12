// The admin canvas's change history, turned into what the 변경 기록 list
// shows: per save, which rows changed and how. Pure, safe to import anywhere.

import { emailToLoginId } from "@/lib/auth/login-id";

import { formatValue } from "./changes";
import type { Json, Row } from "./schema-types";
import { LABEL_COLUMNS, rowsHidden } from "./table-policy";

export type LogEntry = {
  id: number;
  table_name: string;
  op: "insert" | "update" | "delete";
  old_row: Row | null;
  new_row: Row | null;
};

export type Batch = {
  id: string;
  created_at: string;
  reverts: string | null;
  member: { name: string } | null;
  entries: LogEntry[];
};

export const OP_WORDS = { insert: "추가", update: "수정", delete: "삭제" } as const;

/** "projects 삭제 1 · project_tags 삭제 3", in the order they happened. */
export function summarize(entries: Pick<LogEntry, "table_name" | "op">[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const label = `${entry.table_name} ${OP_WORDS[entry.op]}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts].map(([label, count]) => `${label} ${count}`).join(" · ");
}

export type EntryView = {
  id: number;
  table: string;
  op: LogEntry["op"];
  /** The row's name or title, else the start of its key. */
  label: string;
  /** For an update, each column that changed; for a secret table, nothing. */
  changes: { column: string; before: string; after: string }[];
  hidden: boolean;
};

// Columns every save touches; listing them would bury the real change.
const NOISE = new Set(["updated_at"]);

export function viewEntry(entry: LogEntry): EntryView {
  const row = entry.new_row ?? entry.old_row ?? {};
  const hidden = rowsHidden(entry.table_name);
  const named = LABEL_COLUMNS.find((column) => typeof row[column] === "string" && row[column]);
  const label = hidden
    ? "비공개 표"
    : named
      ? String(row[named])
      : formatValue(Object.values(row)[0] as Json).slice(0, 8);

  const changes =
    entry.op === "update" && !hidden && entry.old_row && entry.new_row
      ? Object.keys(entry.new_row)
          .filter((column) => !NOISE.has(column))
          .filter(
            (column) =>
              JSON.stringify(entry.old_row![column]) !== JSON.stringify(entry.new_row![column]),
          )
          .map((column) => ({
            column,
            before: formatValue(entry.old_row![column]),
            after: formatValue(entry.new_row![column]),
          }))
      : [];

  return { id: entry.id, table: entry.table_name, op: entry.op, label, changes, hidden };
}

const SAVED_AT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "11월 13일 오전 2:14", in Korean time on the server and in every browser alike. */
export const formatSavedAt = (iso: string) => SAVED_AT.format(new Date(iso));

/**
 * Why a save cannot be undone, or null. Rejecting an AIKU ID sign-up deletes
 * the login with it (see commitChanges), and a deleted login cannot be put
 * back, so restoring the request would fail.
 */
export function revertBlocked(entries: LogEntry[]): string | null {
  const removedLogin = entries.some(
    (entry) =>
      entry.op === "delete" &&
      entry.table_name === "member_signup_requests" &&
      Boolean(emailToLoginId(String(entry.old_row?.email ?? ""))),
  );
  return removedLogin
    ? "AIKU ID 가입 요청을 거절한 변경은 로그인 계정이 함께 지워져서 되돌릴 수 없습니다."
    : null;
}
