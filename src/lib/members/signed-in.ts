import "server-only";

import { unwrap } from "@/lib/actions/admin-action";
import type { createAdminClient } from "@/lib/supabase/admin-client";

type Db = ReturnType<typeof createAdminClient>;

/**
 * The roster member behind an access token. Server Actions are public
 * endpoints, so this lookup is what stops one member from reading or changing
 * another's private records: the member id never comes from the request.
 */
export async function signedInMember(db: Db, accessToken: string): Promise<string | null> {
  const { data } = await db.auth.getUser(accessToken);
  if (!data.user) return null;
  const link = unwrap(
    await db.from("member_accounts").select("member_id").eq("user_id", data.user.id).maybeSingle(),
  );
  return link?.member_id ?? null;
}
