/**
 * Finds files in the aiku-uploads bucket that no database row references
 * (e.g. uploads from a form that was abandoned or failed) and deletes them.
 *
 *   pnpm storage:gc            # list orphans only (dry run)
 *   pnpm storage:gc --apply    # delete them
 *
 * Files younger than 24 hours are skipped because they may belong to a save
 * that is still in progress.
 */
import { createClient } from "@supabase/supabase-js";

import { UPLOAD_SCOPES } from "../src/lib/storage/keys";
import type { Database } from "../src/lib/supabase/database.types";

const BUCKET = "aiku-uploads";
const MIN_AGE_MS = 24 * 60 * 60 * 1000;
const apply = process.argv.includes("--apply");

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
const storage = supabase.storage.from(BUCKET);

async function listAll(prefix: string) {
  const entries = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await storage.list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list ${prefix}: ${error.message}`);
    entries.push(...data);
    if (data.length < 1000) return entries;
  }
}

/** Every object as { path, createdAt }. Layout: <scope>/<entity id>/<file>. */
async function listObjects() {
  const objects: { path: string; createdAt: number }[] = [];
  for (const scope of UPLOAD_SCOPES) {
    for (const folder of await listAll(scope)) {
      // Folders have no id; files directly under a scope are unexpected but listed too.
      const files = folder.id ? [folder] : await listAll(`${scope}/${folder.name}`);
      const base = folder.id ? scope : `${scope}/${folder.name}`;
      for (const file of files) {
        if (!file.id) continue;
        objects.push({
          path: `${base}/${file.name}`,
          createdAt: Date.parse(file.created_at ?? "") || Date.now(),
        });
      }
    }
  }
  return objects;
}

const storageKeyPattern = new RegExp(`(?:${UPLOAD_SCOPES.join("|")})/[^\\s)>"']+`, "g");

async function referencedPaths(): Promise<Set<string>> {
  const referenced = new Set<string>();
  const add = (path: string | null | undefined) => path && referenced.add(path);

  const projects = await supabase
    .from("projects")
    .select("presentation_path, image_paths, markdown");
  if (projects.error) throw new Error(projects.error.message);
  for (const project of projects.data) {
    add(project.presentation_path);
    project.image_paths.forEach(add);
    // Images referenced inside the markdown text (e.g. imported legacy content).
    for (const match of project.markdown.matchAll(storageKeyPattern)) {
      add(match[0]);
    }
  }

  const members = await supabase.from("members").select("photo_path");
  if (members.error) throw new Error(members.error.message);
  members.data.forEach((member) => add(member.photo_path));

  return referenced;
}

async function main() {
  const [objects, referenced] = await Promise.all([listObjects(), referencedPaths()]);
  const now = Date.now();
  const orphans = objects.filter(
    (object) => !referenced.has(object.path) && now - object.createdAt > MIN_AGE_MS,
  );

  console.log(`${objects.length} file(s) in ${BUCKET}, ${referenced.size} referenced.`);
  if (!orphans.length) {
    console.log("No orphaned files.");
    return;
  }

  orphans.forEach((orphan) => console.log(`  orphan  ${orphan.path}`));
  if (!apply) {
    console.log(`\n${orphans.length} orphaned file(s). Re-run with --apply to delete them.`);
    return;
  }

  for (let index = 0; index < orphans.length; index += 100) {
    const batch = orphans.slice(index, index + 100).map((orphan) => orphan.path);
    const { error } = await storage.remove(batch);
    if (error) throw new Error(`remove: ${error.message}`);
  }
  console.log(`\nDeleted ${orphans.length} orphaned file(s).`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
