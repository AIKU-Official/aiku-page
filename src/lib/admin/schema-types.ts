// The database schema as the admin canvas sees it. Safe to import from client code.

export type ColumnKind = "uuid" | "text" | "integer" | "number" | "boolean" | "date" | "timestamp" | "json" | "array";

export type SchemaColumn = {
  name: string;
  kind: ColumnKind;
  /** Postgres type as reported, e.g. "timestamp with time zone", "text[]". */
  format: string;
  /** Must be given on insert: not null and no default. */
  required: boolean;
  hasDefault: boolean;
  primaryKey: boolean;
  references: { table: string; column: string } | null;
};

export type SchemaTable = {
  name: string;
  /** Views (computed, like member_point_entries) are shown but never edited. */
  readOnly: boolean;
  rowsHidden: boolean;
  columns: SchemaColumn[];
  primaryKey: string[];
  rowCount: number | null;
};

export type Schema = SchemaTable[];

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
export type Row = Record<string, Json>;
