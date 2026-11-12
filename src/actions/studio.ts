"use server";

import { unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { semesterOf, type SeasonTerm, type SessionKind } from "@/lib/activity/calendar";
import { signedInMember } from "@/lib/members/signed-in";
import { canUseStudio } from "@/lib/members/studio";
import { createAdminClient } from "@/lib/supabase/admin-client";

export type StudioEvent = {
  /** ISO date. */
  date: string;
  /** Last day, for an entry over several days; null for one day. */
  until: string | null;
  title: string;
  kind: SessionKind | "aikuthon";
};

export type StudioHome = {
  /** The current semester, "26-2". */
  semester: string;
  /** The newest season in it, "26-2", for links to season filters. */
  season: string;
  /** Every session and AIKUTHON of the semester, in date order. */
  events: StudioEvent[];
  /** Sessions of each kind this semester, and the semester's projects. */
  counts: Record<"deepintodeep" | "momentum" | "seminar" | "projects", number>;
};

const TERM_ORDER: Record<SeasonTerm, number> = { winter: 0, "1": 1, summer: 2, "2": 3 };

/**
 * The Studio home for the signed-in member: the current semester's schedule
 * and programs. Only for members who may use Studio (주니어, 시니어, 활동 OB);
 * the member comes from the access token, never from the request.
 */
export async function getStudioHome(accessToken: unknown): Promise<ActionResult<StudioHome>> {
  try {
    const db = createAdminClient();
    const memberId = await signedInMember(db, String(accessToken ?? ""));
    const member = memberId
      ? unwrap(await db.from("members").select("grade").eq("id", memberId).maybeSingle())
      : null;
    if (!member || !canUseStudio(member.grade)) {
      return { ok: false, message: "AIKU Studio는 주니어, 시니어, 활동 OB만 볼 수 있습니다." };
    }

    const seasons = (unwrap(await db.from("seasons").select("id, name, year, term")) ?? []).sort(
      (a, b) =>
        b.year - a.year || TERM_ORDER[b.term as SeasonTerm] - TERM_ORDER[a.term as SeasonTerm],
    );
    const newest = seasons[0];
    if (!newest) {
      return { ok: false, message: "아직 등록된 분기가 없습니다." };
    }
    const semester = semesterOf(newest.year, newest.term as SeasonTerm);
    const ids = seasons
      .filter((season) => semesterOf(season.year, season.term as SeasonTerm) === semester)
      .map((season) => season.id);

    const [sessionRows, aikuthonRows, projectCount] = await Promise.all([
      db.from("activity_sessions").select("title, kind, held_on, ends_on").in("season_id", ids),
      db.from("aikuthons").select("name, starts_on, ends_on").in("season_id", ids),
      db.from("projects").select("id", { count: "exact", head: true }).in("season_id", ids),
    ]);
    // After-parties belong to the Seminar before them; they are not their own event.
    const sessions = (unwrap(sessionRows) ?? []).filter((row) => row.kind !== "afterparty");
    const events: StudioEvent[] = [
      ...sessions.map((row) => ({
        date: row.held_on,
        until: row.ends_on,
        title: row.title,
        kind: row.kind as SessionKind,
      })),
      // An AIKUTHON that attendance was taken for is already a session that day.
      ...(unwrap(aikuthonRows) ?? [])
        .filter((row) => !sessions.some((s) => s.kind === "event" && s.held_on === row.starts_on))
        .map((row) => ({
          date: row.starts_on,
          until: row.ends_on && row.ends_on > row.starts_on ? row.ends_on : null,
          title: row.name,
          kind: "aikuthon" as const,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "ko"));

    const count = (kind: SessionKind) => sessions.filter((row) => row.kind === kind).length;
    return {
      ok: true,
      message: "",
      data: {
        semester,
        season: newest.name,
        events,
        counts: {
          deepintodeep: count("deepintodeep"),
          momentum: count("momentum"),
          seminar: count("seminar"),
          projects: projectCount.count ?? 0,
        },
      },
    };
  } catch (error) {
    console.error("[studio]", error);
    return { ok: false, message: "Studio를 불러오지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
