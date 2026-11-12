"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CenterPeek } from "@/components/ui/CenterPeek";
import { PlusIcon, SearchIcon } from "@/components/ui/icons";
import {
  addRow,
  deleteRow,
  displayRows,
  editRow,
  formatValue,
  type ChangeHistory,
  type DisplayRow,
  type RowTarget,
} from "@/lib/admin/changes";
import type { Row, Schema, SchemaTable } from "@/lib/admin/schema-types";
import { tableCaption } from "@/lib/admin/table-policy";

import { RowEditor } from "./RowEditor";

const PAGE_SIZE = 50;

const STATE_TONES: Record<DisplayRow["state"], string> = {
  clean: "",
  new: "bg-green-50",
  edited: "bg-amber-100/40",
  deleted: "bg-danger-soft/70 text-muted line-through",
};

const sameTarget = (a: RowTarget | null, b: RowTarget) =>
  Boolean(a) && JSON.stringify(a) === JSON.stringify(b);

/**
 * A table's rows in a centre peek: search, add, and pick a row to edit or
 * delete. Nothing is written yet; every action becomes a pending change on
 * the canvas.
 */
export function TablePeek({
  table,
  schema,
  rows,
  history,
  onHistory,
  origin,
  onClose,
}: {
  table: SchemaTable;
  schema: Schema;
  /** Undefined while loading. */
  rows: Row[] | undefined;
  history: ChangeHistory;
  onHistory: (next: ChangeHistory) => void;
  origin: () => DOMRect | null | undefined;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<RowTarget | null>(null);
  const editable = !table.readOnly && !table.rowsHidden;

  const shown = useMemo(() => {
    const all = displayRows(table.name, rows ?? [], table.primaryKey, history.changes);
    const needle = query.trim().toLowerCase();
    return needle
      ? all.filter((entry) =>
          Object.values(entry.row).some((value) =>
            formatValue(value).toLowerCase().includes(needle),
          ),
        )
      : all;
  }, [table, rows, history.changes, query]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const visible = shown.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const current = selected ? shown.find((entry) => sameTarget(selected, entry.target)) : undefined;

  const add = () => {
    const ref = crypto.randomUUID();
    const values: Row = {};
    // A generated uuid key is filled in now, so new rows can point at each other.
    for (const column of table.columns) {
      if (column.primaryKey && column.kind === "uuid" && column.hasDefault)
        values[column.name] = crypto.randomUUID();
    }
    onHistory(addRow(history, table.name, ref, values));
    setSelected({ table: table.name, ref });
    setQuery("");
    setPage(0);
  };

  const columns = table.columns.slice(0, 6);

  return (
    <CenterPeek
      label={`${table.name} 표`}
      origin={origin}
      originRadius="12px"
      onClose={onClose}
      blend="fade"
      expandable
      // Widens when a row is open, so the editor gets its own room on the right
      // instead of squeezing the rows.
      width={current ? "max-w-[1440px]" : "max-w-[960px]"}
      className="p-8 max-lg:p-6 max-sm:p-4 max-sm:pt-14"
    >
      <div className="grid gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[1.375rem] font-bold text-ink">{table.name}</p>
            <p className="text-small text-muted">
              {tableCaption(table.name)}
              {rows ? ` · ${rows.length}행` : ""}
              {table.readOnly ? " · 다른 표에서 계산되는 보기라 고칠 수 없습니다" : ""}
            </p>
          </div>
          {editable ? (
            <Button variant="dark" size="sm" fullWidthOnMobile={false} onClick={add}>
              <PlusIcon className="size-4" />행 추가
            </Button>
          ) : null}
        </header>

        {table.rowsHidden ? (
          <p className="rounded-control bg-surface-soft px-4 py-6 text-center text-small text-muted">
            보안상 이 표의 데이터는 보여주지 않습니다. 구조만 캔버스에 표시됩니다.
          </p>
        ) : (
          <div
            className={clsx(
              "grid gap-5",
              current && "lg:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]",
            )}
          >
            <section className="grid min-w-0 content-start gap-3">
              <label className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(0);
                  }}
                  placeholder="값으로 찾기"
                  className="h-10 w-full rounded-control border border-line bg-surface pr-3 pl-9 text-small outline-none focus:border-line-strong"
                />
              </label>
              {rows === undefined ? (
                <p role="status" className="py-10 text-center text-small text-muted">
                  행을 불러오는 중입니다.
                </p>
              ) : shown.length === 0 ? (
                <p className="py-10 text-center text-small text-muted">
                  {query ? "찾는 값이 있는 행이 없습니다." : "아직 행이 없습니다."}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-control border border-line">
                  <table className="w-full min-w-[36rem] border-collapse text-left text-small">
                    <thead className="bg-surface-soft">
                      <tr>
                        {columns.map((column) => (
                          <th
                            key={column.name}
                            className="px-3 py-2 font-mono text-label font-semibold whitespace-nowrap text-muted"
                          >
                            {column.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((entry, index) => (
                        <tr
                          key={index}
                          onClick={() => setSelected(entry.target)}
                          className={clsx(
                            "cursor-pointer border-t border-soft-line transition-colors hover:bg-surface-soft",
                            STATE_TONES[entry.state],
                            sameTarget(selected, entry.target) &&
                              "outline-2 -outline-offset-2 outline-green-400",
                          )}
                        >
                          {columns.map((column) => (
                            <td
                              key={column.name}
                              className={clsx(
                                "max-w-56 truncate px-3 py-2 align-top",
                                entry.edited.has(column.name) &&
                                  entry.state === "edited" &&
                                  "font-semibold text-amber-800",
                              )}
                            >
                              {formatValue(entry.row[column.name]) || (
                                <span className="text-line-strong">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {pages > 1 ? (
                <div className="flex items-center justify-between text-small text-muted">
                  <span className="tabular-nums">
                    {page * PAGE_SIZE + 1}–{Math.min(shown.length, (page + 1) * PAGE_SIZE)} /{" "}
                    {shown.length}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidthOnMobile={false}
                      disabled={page === 0}
                      onClick={() => setPage(page - 1)}
                    >
                      이전
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidthOnMobile={false}
                      disabled={page >= pages - 1}
                      onClick={() => setPage(page + 1)}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            {current ? (
              <RowEditor
                key={JSON.stringify(current.target)}
                table={table}
                schema={schema}
                entry={current}
                editable={editable}
                onSave={(patch) => onHistory(editRow(history, current.target, patch))}
                onDelete={() => {
                  onHistory(deleteRow(history, current.target));
                  if ("ref" in current.target) setSelected(null);
                }}
                onClose={() => setSelected(null)}
              />
            ) : null}
          </div>
        )}
      </div>
    </CenterPeek>
  );
}
