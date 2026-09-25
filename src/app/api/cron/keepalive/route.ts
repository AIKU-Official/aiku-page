import { createAdminClient } from "@/lib/supabase/admin-client";

/**
 * Daily job (see vercel.json). Supabase pauses free-plan projects after about
 * a week without database activity, and the public pages are served from the
 * ISR cache, so this touches the database once a day. It also prunes old
 * login attempts. Vercel sends CRON_SECRET as a Bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = createAdminClient();
  const ping = await db.from("seasons").select("id", { count: "exact", head: true });
  const prune = await db
    .from("login_attempts")
    .delete()
    .lt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const error = ping.error ?? prune.error;
  if (error) {
    console.error("[cron/keepalive]", error.message);
    return Response.json({ ok: false }, { status: 500 });
  }
  return Response.json({ ok: true });
}
