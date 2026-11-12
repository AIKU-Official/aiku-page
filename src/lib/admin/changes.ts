// Pending changes made on the admin canvas, kept in the browser until the
// admin presses "DB 업데이트". Pure functions, safe to import anywhere.
//
// Edits merge per row (several edits to one row are one update), deleting a
// row that was only added drops the addition, and every step can be undone
// and redone. The list is sent in order, so a parent added before its child
// is inserted first.

import type { Json, Row } from "./schema-types";

export type Change =
  | { op: "insert"; table: string; ref: string; values: Row }
  | { op: "update"; table: string; key: Row; values: Row }
  | { op: "delete"; table: string; key: Row };

export type ChangeHistory = { changes: Change[]; past: Change[][]; future: Change[][] };

export const emptyHistory: ChangeHistory = { changes: [], past: [], future: [] };

/** A stable identity for a row: its primary key values. */
export const keyOf = (row: Row, primaryKey: string[]): Row =>
  Object.fromEntries(primaryKey.map((column) => [column, row[column] ?? null]));

const sameKey = (a: Row, b: Row) => JSON.stringify(a) === JSON.stringify(b);

/** Records a new list of changes as one undoable step. */
function step(history: ChangeHistory, changes: Change[]): ChangeHistory {
  return { changes, past: [...history.past, history.changes], future: [] };
}

/** Where a displayed row comes from: an existing row (by key) or a pending addition (by ref). */
export type RowTarget = { table: string; key: Row } | { table: string; ref: string };

export function addRow(history: ChangeHistory, table: string, ref: string, values: Row): ChangeHistory {
  return step(history, [...history.changes, { op: "insert", table, ref, values }]);
}

export function editRow(history: ChangeHistory, target: RowTarget, patch: Row): ChangeHistory {
  const { table } = target;
  if ("ref" in target) {
    return step(
      history,
      history.changes.map((change) =>
        change.op === "insert" && change.ref === target.ref
          ? { ...change, values: { ...change.values, ...patch } }
          : change,
      ),
    );
  }
  const existing = history.changes.findIndex(
    (change) => change.op === "update" && change.table === table && sameKey(change.key, target.key),
  );
  if (existing >= 0) {
    return step(
      history,
      history.changes.map((change, index) =>
        index === existing && change.op === "update"
          ? { ...change, values: { ...change.values, ...patch } }
          : change,
      ),
    );
  }
  return step(history, [...history.changes, { op: "update", table, key: target.key, values: patch }]);
}

export function deleteRow(history: ChangeHistory, target: RowTarget): ChangeHistory {
  const { table } = target;
  if ("ref" in target) {
    return step(
      history,
      history.changes.filter((change) => !(change.op === "insert" && change.ref === target.ref)),
    );
  }
  const others = history.changes.filter(
    (change) => !(change.op === "update" && change.table === table && sameKey(change.key, target.key)),
  );
  return step(history, [...others, { op: "delete", table, key: target.key }]);
}

export function undo(history: ChangeHistory): ChangeHistory {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return { changes: previous, past: history.past.slice(0, -1), future: [history.changes, ...history.future] };
}

export function redo(history: ChangeHistory): ChangeHistory {
  const [next, ...rest] = history.future;
  if (!next) return history;
  return { changes: next, past: [...history.past, history.changes], future: rest };
}

export type RowState = "clean" | "edited" | "deleted" | "new";

export type DisplayRow = { row: Row; state: RowState; target: RowTarget; edited: Set<string> };

/** The table's rows as they will be after the pending changes: additions first. */
export function displayRows(table: string, rows: Row[], primaryKey: string[], changes: Change[]): DisplayRow[] {
  const mine = changes.filter((change) => change.table === table);
  const added: DisplayRow[] = mine
    .filter((change): change is Extract<Change, { op: "insert" }> => change.op === "insert")
    .map((change) => ({
      row: change.values,
      state: "new",
      target: { table, ref: change.ref },
      edited: new Set(Object.keys(change.values)),
    }));
  const existing = rows.map((row): DisplayRow => {
    const key = keyOf(row, primaryKey);
    const removed = mine.some((change) => change.op === "delete" && sameKey(change.key, key));
    const update = mine.find(
      (change): change is Extract<Change, { op: "update" }> => change.op === "update" && sameKey(change.key, key),
    );
    return {
      row: update ? { ...row, ...update.values } : row,
      state: removed ? "deleted" : update ? "edited" : "clean",
      target: { table, key },
      edited: new Set(update ? Object.keys(update.values) : []),
    };
  });
  return [...added, ...existing];
}

/** Pending changes per table, for the badges on the canvas. */
export function countByTable(changes: Change[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const change of changes) counts[change.table] = (counts[change.table] ?? 0) + 1;
  return counts;
}

/** What the server receives: no client-only refs. */
export type ChangePayload = { op: Change["op"]; table: string; key?: Row; values?: Row };

export const toPayload = (changes: Change[]): ChangePayload[] =>
  changes.map((change) =>
    change.op === "insert"
      ? { op: "insert", table: change.table, values: change.values }
      : change.op === "update"
        ? { op: "update", table: change.table, key: change.key, values: change.values }
        : { op: "delete", table: change.table, key: change.key },
  );

/** Text shown in a cell for any column value. */
export function formatValue(value: Json | undefined): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
