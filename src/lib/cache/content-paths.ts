import "server-only";

import { revalidatePath } from "next/cache";

// Public pages are built ahead and refreshed hourly (ISR). When content
// changes, these are the pages to rebuild at once. One table for every writer:
// admin Server Actions and the import scripts (through /api/revalidate).

export const CONTENT_KINDS = ["news", "projects", "members", "aikuthons"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

type Target = { path: string; type?: "page" };

const PROFILE: Target = { path: "/members/[id]", type: "page" };

const AFFECTED: Record<ContentKind, Target[]> = {
  news: [{ path: "/" }],
  // Profiles list a member's projects and their summaries.
  projects: [{ path: "/projects" }, { path: "/projects/[id]", type: "page" }, PROFILE],
  members: [{ path: "/members" }, PROFILE],
  // Profiles list a member's AIKUTHON placings.
  aikuthons: [{ path: "/aikuthon" }, PROFILE],
};

export const isContentKind = (value: unknown): value is ContentKind =>
  typeof value === "string" && (CONTENT_KINDS as readonly string[]).includes(value);

/** Marks the public pages that show these kinds of content for rebuilding. */
export function revalidateContent(kinds: readonly ContentKind[]): void {
  const seen = new Set<string>();
  for (const kind of kinds) {
    for (const { path, type } of AFFECTED[kind]) {
      const key = `${path} ${type ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      revalidatePath(path, type);
    }
  }
}
