import { createHash, timingSafeEqual } from "node:crypto";

import { isContentKind, revalidateContent } from "@/lib/cache/content-paths";
import { serverEnv } from "@/lib/env.server";

const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();

/**
 * Rebuilds the public pages for the given kinds of content, for writers that
 * work outside the site (the import scripts): POST {"kinds": ["aikuthons"]}
 * with the Supabase secret key as a Bearer token. Holding that key already
 * means full database access, so this grants nothing new; only the fixed
 * page list in content-paths can be refreshed.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!timingSafeEqual(digest(token), digest(serverEnv().SUPABASE_SECRET_KEY))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const body: unknown = await request.json().catch(() => null);
  const kinds = (body as { kinds?: unknown } | null)?.kinds;
  if (!Array.isArray(kinds) || !kinds.length || !kinds.every(isContentKind)) {
    return Response.json({ ok: false, message: "kinds must list news, projects, members or aikuthons" }, { status: 400 });
  }
  revalidateContent(kinds);
  return Response.json({ ok: true, kinds });
}
