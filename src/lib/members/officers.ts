import "server-only";

import { unwrap } from "@/lib/actions/admin-action";
import type { createAdminClient } from "@/lib/supabase/admin-client";

type Db = ReturnType<typeof createAdminClient>;

/** "8기" -> 8, as the database's generation_number() reads it; null otherwise. */
export const generationNumber = (name: string): number | null => {
  const match = /^(\d+)기$/.exec(name);
  return match ? Number(match[1]) : null;
};

/**
 * Whether a member is 회장 or 부회장 of the newest generation. These officers
 * are the site's admins: no separate admin account exists, and when a new
 * generation is added the previous officers lose admin rights by themselves.
 */
export async function isCurrentOfficer(db: Db, memberId: string): Promise<boolean> {
  const [generations, positions] = await Promise.all([
    db.from("generations").select("name"),
    db.from("member_positions").select("generations(name)").eq("member_id", memberId),
  ]);
  const newest = Math.max(
    ...(unwrap(generations) ?? []).map((g) => generationNumber(g.name) ?? -Infinity),
  );
  return (unwrap(positions) ?? []).some(
    (position) => generationNumber(position.generations.name) === newest,
  );
}
