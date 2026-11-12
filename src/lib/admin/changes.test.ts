import { describe, expect, it } from "vitest";

import {
  addRow,
  countByTable,
  deleteRow,
  displayRows,
  editRow,
  emptyHistory,
  redo,
  toPayload,
  undo,
} from "./changes";

const rows = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Beta" },
];

describe("pending changes", () => {
  it("merges edits to one row into one update", () => {
    let history = editRow(emptyHistory, { table: "t", key: { id: "a" } }, { name: "A1" });
    history = editRow(history, { table: "t", key: { id: "a" } }, { name: "A2" });
    expect(history.changes).toEqual([{ op: "update", table: "t", key: { id: "a" }, values: { name: "A2" } }]);
  });

  it("drops an added row when it is deleted, and edits additions in place", () => {
    let history = addRow(emptyHistory, "t", "r1", { id: "c", name: "New" });
    history = editRow(history, { table: "t", ref: "r1" }, { name: "Newer" });
    expect(history.changes).toEqual([{ op: "insert", table: "t", ref: "r1", values: { id: "c", name: "Newer" } }]);
    history = deleteRow(history, { table: "t", ref: "r1" });
    expect(history.changes).toEqual([]);
  });

  it("replaces a pending update with the delete", () => {
    let history = editRow(emptyHistory, { table: "t", key: { id: "a" } }, { name: "A1" });
    history = deleteRow(history, { table: "t", key: { id: "a" } });
    expect(history.changes).toEqual([{ op: "delete", table: "t", key: { id: "a" } }]);
  });

  it("undoes and redoes step by step, and a new step clears redo", () => {
    let history = editRow(emptyHistory, { table: "t", key: { id: "a" } }, { name: "A1" });
    history = deleteRow(history, { table: "t", key: { id: "b" } });
    history = undo(history);
    expect(history.changes).toHaveLength(1);
    history = undo(history);
    expect(history.changes).toEqual([]);
    expect(undo(history)).toBe(history);
    history = redo(history);
    expect(history.changes).toHaveLength(1);
    history = editRow(history, { table: "t", key: { id: "b" } }, { name: "B1" });
    expect(history.future).toEqual([]);
  });

  it("shows rows as they will be, additions first", () => {
    let history = addRow(emptyHistory, "t", "r1", { id: "c", name: "New" });
    history = editRow(history, { table: "t", key: { id: "a" } }, { name: "A1" });
    history = deleteRow(history, { table: "t", key: { id: "b" } });
    const shown = displayRows("t", rows, ["id"], history.changes);
    expect(shown.map((r) => [r.row.name, r.state])).toEqual([
      ["New", "new"],
      ["A1", "edited"],
      ["Beta", "deleted"],
    ]);
    expect(countByTable(history.changes)).toEqual({ t: 3 });
    expect(toPayload(history.changes)[0]).toEqual({ op: "insert", table: "t", values: { id: "c", name: "New" } });
  });
});
