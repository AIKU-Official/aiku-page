import "server-only";

import { serverEnv } from "@/lib/env.server";
import { publicEnv } from "@/lib/env.public";
import { createAdminClient } from "@/lib/supabase/admin-client";

import type { ColumnKind, Schema, SchemaColumn } from "./schema-types";
import { OFF_CANVAS_TABLES, rowsHidden } from "./table-policy";

type OpenApiProperty = { format?: string; type?: string; default?: unknown; description?: string };
type OpenApiDefinition = { required?: string[]; properties: Record<string, OpenApiProperty> };

function kindOf(property: OpenApiProperty): ColumnKind {
  const format = property.format ?? "";
  if (format.endsWith("[]") || property.type === "array") return "array";
  if (format === "uuid") return "uuid";
  if (format === "boolean" || property.type === "boolean") return "boolean";
  if (format === "date") return "date";
  if (format.startsWith("timestamp")) return "timestamp";
  if (format === "jsonb" || format === "json") return "json";
  if (property.type === "integer") return "integer";
  if (property.type === "number") return "number";
  return "text";
}

/**
 * Reads the public schema from PostgREST's own description of it (tables,
 * columns, primary and foreign keys), so the canvas follows every migration
 * without a list to keep up to date. Row counts come along for the nodes.
 */
export async function loadSchema(): Promise<Schema> {
  const key = serverEnv().SUPABASE_SECRET_KEY;
  const response = await fetch(`${publicEnv.supabaseUrl}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Schema description failed: ${response.status}`);
  const definitions = (
    (await response.json()) as { definitions: Record<string, OpenApiDefinition> }
  ).definitions;

  const db = createAdminClient();
  const tables = await Promise.all(
    Object.entries(definitions)
      .filter(([name]) => !(OFF_CANVAS_TABLES as readonly string[]).includes(name))
      .map(async ([name, definition]) => {
        const required = new Set(definition.required ?? []);
        const columns = Object.entries(definition.properties).map(
          ([column, property]): SchemaColumn => {
            const note = property.description ?? "";
            const fk = /<fk table='([^']+)' column='([^']+)'\/>/.exec(note);
            const hasDefault = property.default !== undefined;
            return {
              name: column,
              kind: kindOf(property),
              format: property.format ?? property.type ?? "",
              required: required.has(column) && !hasDefault,
              hasDefault,
              primaryKey: note.includes("<pk/>"),
              references: fk ? { table: fk[1], column: fk[2] } : null,
            };
          },
        );
        const primaryKey = columns
          .filter((column) => column.primaryKey)
          .map((column) => column.name);
        const { count } = await db.from(name as never).select("*", { count: "exact", head: true });
        return {
          name,
          // A view has no primary key in PostgREST's description.
          readOnly: primaryKey.length === 0,
          rowsHidden: rowsHidden(name),
          columns,
          primaryKey,
          rowCount: count ?? null,
        };
      }),
  );
  return tables.sort((a, b) => a.name.localeCompare(b.name));
}
