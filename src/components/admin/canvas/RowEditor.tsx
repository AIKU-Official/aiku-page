"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

import { getRowOptions, type RowOption } from "@/actions/db-admin";
import { Button } from "@/components/ui/Button";
import { CloseIcon } from "@/components/ui/icons";
import { formatValue, type DisplayRow } from "@/lib/admin/changes";
import type { Json, Row, Schema, SchemaColumn, SchemaTable } from "@/lib/admin/schema-types";
import { STORAGE_COLUMNS } from "@/lib/admin/table-policy";
import { uploadFiles } from "@/lib/admin/upload";

const LONG_TEXT = /markdown|description|bio|summary|one_line|tagline|headline|reason|note/;

const fieldClassName =
  "w-full rounded-control border border-line bg-surface px-3 text-small text-ink outline-none focus:border-line-strong disabled:bg-surface-soft disabled:text-muted";

/** Text typed in a field, read back as the column's type. Throws a Korean message when it does not fit. */
function parseField(column: SchemaColumn, text: string): Json {
  const blank = text.trim() === "";
  switch (column.kind) {
    case "boolean":
      return text === "true";
    case "integer":
    case "number": {
      if (blank) return null;
      const value = Number(text);
      if (Number.isNaN(value)) throw new Error(`${column.name}: 숫자를 입력하세요.`);
      return column.kind === "integer" ? Math.trunc(value) : value;
    }
    case "json":
      if (blank) return null;
      try {
        return JSON.parse(text) as Json;
      } catch {
        throw new Error(`${column.name}: JSON 형식이 올바르지 않습니다.`);
      }
    case "array":
      return blank
        ? []
        : text
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    case "text":
      return text;
    default:
      return blank ? null : text.trim();
  }
}

const toText = (column: SchemaColumn, value: Json | undefined) =>
  column.kind === "json" && value !== null && value !== undefined
    ? JSON.stringify(value, null, 2)
    : column.kind === "boolean"
      ? String(Boolean(value))
      : formatValue(value);

/**
 * The fields of one row, typed by column: pickers for columns pointing at
 * other tables, uploads for Storage paths, JSON and lists as text. "변경
 * 담기" adds only the fields that changed to the pending changes.
 */
export function RowEditor({
  table,
  schema,
  entry,
  editable,
  onSave,
  onDelete,
  onClose,
}: {
  table: SchemaTable;
  schema: Schema;
  entry: DisplayRow;
  editable: boolean;
  onSave: (patch: Row) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      table.columns.map((column) => [column.name, toText(column, entry.row[column.name])]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const isNew = entry.state === "new";
  const deleted = entry.state === "deleted";
  const locked = !editable || deleted;

  const stage = () => {
    try {
      const patch: Row = {};
      for (const column of table.columns) {
        const value = parseField(column, draft[column.name] ?? "");
        const before = entry.row[column.name];
        const unchanged = JSON.stringify(value ?? null) === JSON.stringify(before ?? null);
        // New rows leave untouched blank columns to their defaults.
        if (unchanged || (isNew && before === undefined && (value === null || value === "")))
          continue;
        patch[column.name] = value;
      }
      setError(null);
      if (Object.keys(patch).length) onSave(patch);
    } catch (problem) {
      setError((problem as Error).message);
    }
  };

  const upload = async (column: SchemaColumn, files: FileList | null) => {
    const rule = STORAGE_COLUMNS[table.name]?.[column.name];
    if (!rule || !files?.length) return;
    const entityId = String(entry.row[rule.entity] ?? draft[rule.entity] ?? "");
    if (!entityId) {
      setError(`${rule.entity} 값을 먼저 정해야 파일을 올릴 수 있습니다.`);
      return;
    }
    setUploading(column.name);
    try {
      const paths = await uploadFiles(
        rule.scope,
        entityId,
        [...files].map((file) => ({ file, kind: rule.kind })),
        () => {},
      );
      setDraft((current) => ({
        ...current,
        [column.name]: rule.many
          ? [current[column.name], ...paths].filter(Boolean).join(", ")
          : paths[0],
      }));
      setError(null);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setUploading(null);
    }
  };

  return (
    <section className="grid content-start gap-4 rounded-card border border-line bg-surface-soft/60 p-4 lg:sticky lg:top-0">
      <header className="flex items-center justify-between gap-3">
        <p className="text-small font-semibold text-ink">
          {isNew ? "새 행" : deleted ? "삭제 예정인 행" : "행 편집"}
        </p>
        <button
          type="button"
          aria-label="편집 닫기"
          onClick={onClose}
          className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink"
        >
          <CloseIcon className="size-4" />
        </button>
      </header>
      {deleted ? (
        <p className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger">
          DB 업데이트 때 지워집니다. 되살리려면 아래 도구 막대의 실행 취소를 누르세요.
        </p>
      ) : null}

      <div className="grid max-h-[55dvh] gap-3 overflow-y-auto pr-1">
        {table.columns.map((column) => (
          <Field
            key={column.name}
            column={column}
            schema={schema}
            value={draft[column.name] ?? ""}
            disabled={
              locked ||
              (column.primaryKey && !isNew) ||
              (column.primaryKey && column.kind === "uuid")
            }
            storage={Boolean(STORAGE_COLUMNS[table.name]?.[column.name])}
            uploading={uploading === column.name}
            onUpload={(files) => upload(column, files)}
            onChange={(text) => setDraft((current) => ({ ...current, [column.name]: text }))}
          />
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-small text-danger">
          {error}
        </p>
      ) : null}

      {!locked ? (
        <div className="flex gap-2">
          <Button
            variant="dark"
            size="sm"
            fullWidthOnMobile={false}
            onClick={stage}
            disabled={Boolean(uploading)}
            className="flex-1"
          >
            변경 담기
          </Button>
          <Button
            variant="secondary"
            size="sm"
            fullWidthOnMobile={false}
            onClick={onDelete}
            className="text-danger"
          >
            {isNew ? "추가 취소" : "삭제"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Field({
  column,
  schema,
  value,
  disabled,
  storage,
  uploading,
  onUpload,
  onChange,
}: {
  column: SchemaColumn;
  schema: Schema;
  value: string;
  disabled: boolean;
  storage: boolean;
  uploading: boolean;
  onUpload: (files: FileList | null) => void;
  onChange: (text: string) => void;
}) {
  const id = `field-${column.name}`;
  const hint = column.required ? "필수" : column.hasDefault ? "비우면 기본값" : "";
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-label font-semibold text-ink">{column.name}</span>
        <span className="text-label text-muted">
          {column.format}
          {hint ? ` · ${hint}` : ""}
        </span>
      </label>
      {column.references ? (
        <ReferencePicker
          id={id}
          column={column}
          schema={schema}
          value={value}
          disabled={disabled}
          onChange={onChange}
        />
      ) : column.kind === "boolean" ? (
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(fieldClassName, "h-9")}
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : column.kind === "json" || (column.kind === "text" && LONG_TEXT.test(column.name)) ? (
        <textarea
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={column.name === "markdown" ? 10 : 3}
          className={clsx(
            fieldClassName,
            "py-2 font-[inherit]",
            column.kind === "json" && "font-mono text-label",
          )}
        />
      ) : (
        <input
          id={id}
          type={
            column.kind === "date"
              ? "date"
              : column.kind === "integer" || column.kind === "number"
                ? "number"
                : "text"
          }
          value={value}
          disabled={disabled}
          placeholder={column.kind === "array" ? "쉼표로 구분" : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={clsx(fieldClassName, "h-9")}
        />
      )}
      {storage && !disabled ? (
        <label className="inline-flex w-fit cursor-pointer items-center gap-2 text-label font-semibold text-green-800">
          <input
            type="file"
            className="sr-only"
            multiple={column.kind === "array"}
            onChange={(event) => onUpload(event.target.files)}
          />
          {uploading ? "올리는 중…" : "파일 올리기"}
        </label>
      ) : null}
    </div>
  );
}

/** A picker for a column pointing at another table, labelled by that table's name or title. */
function ReferencePicker({
  id,
  column,
  value,
  disabled,
  onChange,
}: {
  id: string;
  column: SchemaColumn;
  schema: Schema;
  value: string;
  disabled: boolean;
  onChange: (text: string) => void;
}) {
  const [options, setOptions] = useState<RowOption[] | null>(null);
  const target = column.references!;

  useEffect(() => {
    let cancelled = false;
    void getRowOptions({ table: target.table, column: target.column }).then((result) => {
      if (!cancelled) setOptions(result.ok ? result.data : []);
    });
    return () => {
      cancelled = true;
    };
  }, [target.table, target.column]);

  const known = options?.some((option) => formatValue(option.value) === value);
  return (
    <select
      id={id}
      value={value}
      disabled={disabled || options === null}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(fieldClassName, "h-9")}
    >
      <option value="">
        {options === null ? "불러오는 중…" : column.required ? "선택하세요" : "없음"}
      </option>
      {value && options && !known ? <option value={value}>{value}</option> : null}
      {(options ?? []).map((option) => (
        <option key={formatValue(option.value)} value={formatValue(option.value)}>
          {option.label || formatValue(option.value)}
        </option>
      ))}
    </select>
  );
}
