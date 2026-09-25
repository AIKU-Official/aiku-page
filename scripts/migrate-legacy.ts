/**
 * Imports the legacy site's content (legacy/data/content.json and the files it
 * references) into Supabase: rows into the content tables, files into the
 * aiku-uploads bucket.
 *
 *   pnpm migrate:legacy --dry-run                     # show what would happen
 *   pnpm migrate:legacy                               # import into .env.local's project
 *   pnpm exec tsx --env-file=.env.production.local scripts/migrate-legacy.ts
 *
 * Safe to re-run: rows are matched by legacy_id (seasons/generations by name)
 * and files are uploaded to deterministic keys with upsert. Display order is
 * only applied to a scope when this run inserted new rows into it, so orders
 * changed later in the admin are left alone.
 */
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../src/lib/supabase/database.types";
import {
  asciiBaseName,
  CONTENT_TYPES,
  fileExtension,
  type UploadScope,
} from "../src/lib/storage/keys";

const BUCKET = "aiku-uploads";
const dryRun = process.argv.includes("--dry-run");
const legacyRoot = path.resolve(
  process.argv.find((arg) => arg.startsWith("--legacy="))?.slice("--legacy=".length) ?? "legacy",
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (see .env.example).",
  );
}
const supabase = createClient<Database>(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Legacy content shape (lenient: every field optional, like the old server)
// ---------------------------------------------------------------------------

const text = z.string().catch("").default("");
const legacySchema = z.object({
  seasons: z.array(z.string()).catch([]).default([]),
  projects: z
    .array(
      z.object({
        id: z.string(),
        period: text,
        title: text,
        summary: text,
        markdown: text,
        githubUrl: text,
        presentationUrl: text,
        images: z.array(z.string()).catch([]).default([]),
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    )
    .catch([])
    .default([]),
  gallery: z
    .array(
      z.object({
        id: z.string(),
        category: text,
        title: text,
        description: text,
        imageUrl: text,
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    )
    .catch([])
    .default([]),
  news: z
    .array(
      z.object({
        id: z.string(),
        date: text,
        title: text,
        summary: text,
        linkUrl: text,
        linkLabel: text,
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      }),
    )
    .catch([])
    .default([]),
  alumni: z
    .array(
      z.object({
        id: z.string(),
        name: text,
        people: z
          .array(
            z.object({
              id: z.string(),
              name: text,
              summary: text,
              email: text,
              githubUrl: text,
              linkedinUrl: text,
              websiteUrl: text,
              imageUrl: text,
              createdAt: z.string().optional(),
              updatedAt: z.string().optional(),
            }),
          )
          .catch([])
          .default([]),
      }),
    )
    .catch([])
    .default([]),
});

type Legacy = z.infer<typeof legacySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const summary: Record<string, { inserted: number; updated: number }> = {};
const uploadedUrls: string[] = [];

function count(table: string, kind: "inserted" | "updated") {
  summary[table] ??= { inserted: 0, updated: 0 };
  summary[table][kind] += 1;
}

function must<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) {
    throw new Error(`${what}: ${result.error.message}`);
  }
  return result.data;
}

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const httpOrNull = (value: string) => (isHttpUrl(value.trim()) ? value.trim() : null);

/** Legacy site-relative links ("projects.html#x") → new routes ("/projects#x"). */
function convertLink(value: string): string | null {
  const link = value.trim();
  if (!link) return null;
  if (isHttpUrl(link) || link.startsWith("/")) return link;
  const match = link.match(/^([a-z-]+)\.html(#.*)?$/i);
  if (!match) return null;
  const page = match[1] === "index" ? "" : match[1] === "alumni" ? "members" : match[1];
  return `/${page}${match[2] ?? ""}`;
}

/** Local file referenced by a legacy relative path, or null for remote URLs. */
function legacyFile(reference: string): string | null {
  const ref = reference.trim();
  if (!ref || isHttpUrl(ref) || ref.startsWith("//") || ref.startsWith("data:")) return null;
  let decoded = ref;
  try {
    decoded = decodeURI(ref);
  } catch {
    // Use the raw reference.
  }
  return path.join(legacyRoot, decoded.replace(/^\/+/, ""));
}

/**
 * Uploads a legacy file to `<scope>/<entityId>/<ascii name>` and returns the
 * object key. Keys are deterministic so re-runs overwrite instead of piling up.
 */
async function uploadLegacyFile(
  reference: string,
  scope: UploadScope,
  entityId: string,
  usedNames: Set<string>,
): Promise<string> {
  const file = legacyFile(reference);
  if (!file) {
    throw new Error(`Not a local file reference: ${reference}`);
  }
  if (!existsSync(file)) {
    throw new Error(`Missing legacy file: ${file}`);
  }

  const extension = fileExtension(file);
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    throw new Error(`Unsupported file type ${extension}: ${file}`);
  }

  const base = asciiBaseName(file);
  let name = `${base}${extension}`;
  for (let n = 2; usedNames.has(name); n += 1) {
    name = `${base}-${n}${extension}`;
  }
  usedNames.add(name);

  const key = `${scope}/${entityId}/${name}`;
  if (!dryRun) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, readFileSync(file), { contentType, upsert: true });
    if (error) {
      throw new Error(`Upload failed for ${file}: ${error.message}`);
    }
    uploadedUrls.push(supabase.storage.from(BUCKET).getPublicUrl(key).data.publicUrl);
  }
  console.log(`  file  ${path.relative(legacyRoot, file)} → ${key}`);
  return key;
}

async function findByLegacyId(
  table: "projects" | "news" | "gallery_items" | "generations" | "members",
  legacyId: string,
): Promise<string | null> {
  const row = must(
    await supabase.from(table).select("id").eq("legacy_id", legacyId).maybeSingle(),
    `lookup ${table} ${legacyId}`,
  );
  return row?.id ?? null;
}

async function applyOrder(
  table: "seasons" | "projects" | "news" | "gallery_items" | "generations" | "members",
  legacyOrderedIds: string[],
  scope?: { column: "season_id" | "generation_id"; id: string },
) {
  if (dryRun || !legacyOrderedIds.length) return;

  // reorder_items needs every id in the scope: legacy rows first, then any
  // rows created in the new admin, in their current order.
  let query = supabase.from(table).select("id").order("sort_order").order("created_at");
  if (scope) query = query.filter(scope.column, "eq", scope.id);
  const current = (must(await query, `list ${table}`) ?? []).map((row) => row.id);
  const ids = [...legacyOrderedIds, ...current.filter((id) => !legacyOrderedIds.includes(id))];

  must(
    await supabase.rpc("reorder_items", { p_table: table, p_ids: ids, p_scope: scope?.id }),
    `reorder ${table}`,
  );
}

// ---------------------------------------------------------------------------
// Importers
// ---------------------------------------------------------------------------

async function importSeasons(legacy: Legacy): Promise<Map<string, string>> {
  // content.json may list no seasons at all while projects reference them.
  const names: string[] = [];
  for (const name of [...legacy.seasons, ...legacy.projects.map((project) => project.period)]) {
    const value = name.trim();
    if (value && !names.includes(value)) names.push(value);
  }

  const idByName = new Map<string, string>();
  let inserted = false;
  for (const name of names) {
    const existing = must(
      await supabase.from("seasons").select("id").eq("name", name).maybeSingle(),
      `lookup season ${name}`,
    );
    if (existing) {
      idByName.set(name, existing.id);
      continue;
    }
    const id = randomUUID();
    if (!dryRun) {
      must(await supabase.from("seasons").insert({ id, name }), `insert season ${name}`);
    }
    idByName.set(name, id);
    inserted = true;
    count("seasons", "inserted");
    console.log(`season ${name}`);
  }

  if (inserted)
    await applyOrder(
      "seasons",
      names.map((name) => idByName.get(name)!),
    );
  return idByName;
}

async function importProjects(legacy: Legacy, seasonIds: Map<string, string>) {
  const insertedBySeason = new Map<string, string[]>();
  const legacyOrderBySeason = new Map<string, string[]>();

  for (const project of legacy.projects) {
    const seasonId = seasonIds.get(project.period.trim());
    if (!seasonId) {
      throw new Error(`Project ${project.id} has no season (period "${project.period}").`);
    }

    const existingId = await findByLegacyId("projects", project.id);
    const id = existingId ?? randomUUID();
    console.log(`project ${project.title} (${project.id})`);

    const usedNames = new Set<string>();
    let markdown = project.markdown;
    const imageRefs = [...markdown.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g)].map((m) => m[1]);
    for (const reference of new Set(imageRefs)) {
      if (!legacyFile(reference)) continue;
      const key = await uploadLegacyFile(reference, "projects", id, usedNames);
      markdown = markdown.split(`](${reference}`).join(`](${key}`);
    }

    const imagePaths: string[] = [];
    for (const reference of project.images) {
      imagePaths.push(
        legacyFile(reference)
          ? await uploadLegacyFile(reference, "projects", id, usedNames)
          : reference,
      );
    }

    let presentationPath: string | null = null;
    let presentationName: string | null = null;
    if (legacyFile(project.presentationUrl)) {
      presentationPath = await uploadLegacyFile(project.presentationUrl, "projects", id, usedNames);
      presentationName = path.basename(legacyFile(project.presentationUrl)!);
    }

    const row = {
      id,
      legacy_id: project.id,
      season_id: seasonId,
      title: project.title.trim() || "제목 없음",
      summary: project.summary.trim(),
      markdown,
      github_url: httpOrNull(project.githubUrl),
      presentation_path: presentationPath,
      presentation_name: presentationName,
      image_paths: imagePaths,
      ...(project.createdAt ? { created_at: project.createdAt } : {}),
      ...(project.updatedAt ? { updated_at: project.updatedAt } : {}),
    };

    if (!dryRun) {
      must(
        existingId
          ? await supabase.from("projects").update(row).eq("id", id)
          : await supabase.from("projects").insert(row),
        `save project ${project.id}`,
      );
    }
    count("projects", existingId ? "updated" : "inserted");

    legacyOrderBySeason.set(seasonId, [...(legacyOrderBySeason.get(seasonId) ?? []), id]);
    if (!existingId)
      insertedBySeason.set(seasonId, [...(insertedBySeason.get(seasonId) ?? []), id]);
  }

  for (const [seasonId, ids] of legacyOrderBySeason) {
    if (insertedBySeason.has(seasonId)) {
      await applyOrder("projects", ids, { column: "season_id", id: seasonId });
    }
  }
}

async function importGallery(legacy: Legacy) {
  const ordered: string[] = [];
  let inserted = false;

  for (const entry of legacy.gallery) {
    const existingId = await findByLegacyId("gallery_items", entry.id);
    const id = existingId ?? randomUUID();
    console.log(`gallery ${entry.title} (${entry.id})`);

    const imagePath = legacyFile(entry.imageUrl)
      ? await uploadLegacyFile(entry.imageUrl, "gallery", id, new Set())
      : null;
    const row = {
      id,
      legacy_id: entry.id,
      category: entry.category.trim() || "AIKU",
      title: entry.title.trim() || "제목 없음",
      description: entry.description.trim(),
      image_path: imagePath,
      ...(entry.createdAt ? { created_at: entry.createdAt } : {}),
      ...(entry.updatedAt ? { updated_at: entry.updatedAt } : {}),
    };

    if (!dryRun) {
      must(
        existingId
          ? await supabase.from("gallery_items").update(row).eq("id", id)
          : await supabase.from("gallery_items").insert(row),
        `save gallery ${entry.id}`,
      );
    }
    count("gallery_items", existingId ? "updated" : "inserted");
    ordered.push(id);
    inserted ||= !existingId;
  }

  if (inserted) await applyOrder("gallery_items", ordered);
}

async function importNews(legacy: Legacy) {
  const ordered: string[] = [];
  let inserted = false;

  for (const entry of legacy.news) {
    const existingId = await findByLegacyId("news", entry.id);
    const id = existingId ?? randomUUID();
    console.log(`news ${entry.title} (${entry.id})`);

    const row = {
      id,
      legacy_id: entry.id,
      published_on: /^\d{4}-\d{2}-\d{2}$/.test(entry.date.trim()) ? entry.date.trim() : null,
      title: entry.title.trim() || "제목 없음",
      summary: entry.summary.trim(),
      link_url: convertLink(entry.linkUrl),
      link_label: entry.linkLabel.trim() || "보기",
      ...(entry.createdAt ? { created_at: entry.createdAt } : {}),
      ...(entry.updatedAt ? { updated_at: entry.updatedAt } : {}),
    };

    if (!dryRun) {
      must(
        existingId
          ? await supabase.from("news").update(row).eq("id", id)
          : await supabase.from("news").insert(row),
        `save news ${entry.id}`,
      );
    }
    count("news", existingId ? "updated" : "inserted");
    ordered.push(id);
    inserted ||= !existingId;
  }

  if (inserted) await applyOrder("news", ordered);
}

async function importMembers(legacy: Legacy) {
  const generationOrder: string[] = [];
  let generationInserted = false;

  for (const generation of legacy.alumni) {
    const name = generation.name.trim();
    if (!name) continue;

    const existing = must(
      await supabase.from("generations").select("id").eq("name", name).maybeSingle(),
      `lookup generation ${name}`,
    );
    const generationId = existing?.id ?? randomUUID();
    if (!existing) {
      if (!dryRun) {
        must(
          await supabase
            .from("generations")
            .insert({ id: generationId, legacy_id: generation.id, name }),
          `insert generation ${name}`,
        );
      }
      count("generations", "inserted");
      generationInserted = true;
    }
    generationOrder.push(generationId);
    console.log(`generation ${name}`);

    const memberOrder: string[] = [];
    let memberInserted = false;
    for (const person of generation.people) {
      const existingId = await findByLegacyId("members", person.id);
      const id = existingId ?? randomUUID();
      const photoPath = legacyFile(person.imageUrl)
        ? await uploadLegacyFile(person.imageUrl, "members", id, new Set())
        : null;
      const email = person.email.trim();

      const row = {
        id,
        legacy_id: person.id,
        generation_id: generationId,
        name: person.name.trim() || "이름 없음",
        summary: person.summary.trim(),
        email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null,
        github_url: httpOrNull(person.githubUrl),
        linkedin_url: httpOrNull(person.linkedinUrl),
        website_url: httpOrNull(person.websiteUrl),
        photo_path: photoPath,
        ...(person.createdAt ? { created_at: person.createdAt } : {}),
        ...(person.updatedAt ? { updated_at: person.updatedAt } : {}),
      };

      if (!dryRun) {
        must(
          existingId
            ? await supabase.from("members").update(row).eq("id", id)
            : await supabase.from("members").insert(row),
          `save member ${person.id}`,
        );
      }
      count("members", existingId ? "updated" : "inserted");
      memberOrder.push(id);
      memberInserted ||= !existingId;
    }

    if (memberInserted) {
      await applyOrder("members", memberOrder, { column: "generation_id", id: generationId });
    }
  }

  if (generationInserted) await applyOrder("generations", generationOrder);
}

async function verifyUploads() {
  const failures: string[] = [];
  for (const url of uploadedUrls) {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) failures.push(`${response.status} ${url}`);
  }
  if (failures.length) {
    throw new Error(`Uploaded files are not reachable:\n${failures.join("\n")}`);
  }
  console.log(`verified ${uploadedUrls.length} public file URL(s)`);
}

// ---------------------------------------------------------------------------

async function main() {
  const contentFile = path.join(legacyRoot, "data", "content.json");
  const legacy = legacySchema.parse(JSON.parse(readFileSync(contentFile, "utf8")));

  console.log(`${dryRun ? "[dry run] " : ""}importing ${contentFile} → ${supabaseUrl}\n`);

  const seasonIds = await importSeasons(legacy);
  await importProjects(legacy, seasonIds);
  await importGallery(legacy);
  await importNews(legacy);
  await importMembers(legacy);

  if (!dryRun) await verifyUploads();

  console.log("\nsummary");
  console.table(summary);
  if (dryRun) console.log("dry run: nothing was written.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
