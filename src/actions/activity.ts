"use server";

import { unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import { type AttendanceStatus, type AttendanceKind } from "@/lib/activity/calendar";
import { getAdminSession } from "@/lib/auth/session";
import { signedInMember } from "@/lib/members/signed-in";
import { isOb } from "@/lib/members/studio";
import { pointsPeriod, type SeasonTerm } from "@/lib/seasons/name";
import { createAdminClient } from "@/lib/supabase/admin-client";

export type ActivitySession = {
  /** ISO date. */
  date: string;
  title: string;
  kind: AttendanceKind;
  status: AttendanceStatus;
  /** Why an excused late or absence was excused; "" when none was recorded. */
  reason: string;
};

export type PointEntry = {
  date: string | null;
  title: string;
  label: string;
  points: number;
};

/** One member's attendance and points for one semester. */
export type ActivitySemester = {
  /** The two seasons counted together, "26-여름 · 26-2". */
  semester: string;
  /**
   * The sessions shown on the calendar, in the order they were held. After-
   * parties are left off the calendar; their points still count.
   */
  sessions: ActivitySession[];
  entries: PointEntry[];
  total: number;
  /** At or below -5, the threshold for repeating the semester. */
  atRisk: boolean;
};

export type MyActivity = {
  /**
   * OB members (명예 and 활동 OB alike) are outside attendance and points: nothing is sent for them
   * and their profile has no attendance panel.
   */
  ob: boolean;
  /** Every semester the member has a record in, newest first. */
  semesters: ActivitySemester[];
};

const RETAKE_THRESHOLD = -5;
// Order within one day, as the sessions run: lectures, paper reviews, the
// Seminar, then its after-party.
const DAY_ORDER: Record<AttendanceKind, number> = {
  deepintodeep: 0,
  momentum: 1,
  event: 2,
  seminar: 3,
  afterparty: 4,
};

/**
 * A member's attendance and points, for that member or an admin only. The
 * viewer is taken from the access token, never from the request; an admin is
 * a current officer with an admin session. There is no public variant.
 * No semesters when there is nothing to show yet, and none for OB members.
 */
export async function getActivity(
  accessToken: unknown,
  memberId: unknown,
): Promise<ActionResult<MyActivity>> {
  try {
    const db = createAdminClient();
    const viewer = await signedInMember(db, String(accessToken ?? ""));
    const admin = viewer ? await getAdminSession() : null;
    const allowed = viewer && (viewer === memberId || admin?.memberId === viewer);
    if (!allowed || typeof memberId !== "string") {
      return { ok: false, message: "본인 또는 관리자만 볼 수 있습니다." };
    }

    const member = unwrap(
      await db.from("members").select("grade").eq("id", memberId).maybeSingle(),
    );
    if (!member) return { ok: false, message: "회원을 찾을 수 없습니다." };
    if (isOb(member.grade)) return { ok: true, message: "", data: { ob: true, semesters: [] } };

    const [seasonRows, marks, entryRows] = await Promise.all([
      db.from("seasons").select("id, year, term"),
      db
        .from("attendance")
        .select("status, reason, activity_sessions(title, kind, held_on, season_id)")
        .eq("member_id", memberId),
      db
        .from("member_point_entries")
        .select("season_id, held_on, title, label, points")
        .eq("member_id", memberId),
    ]);
    // Attendance and points are counted per pair of seasons (winter with the
    // 1st term, summer with the 2nd); each pair is labelled with both names.
    const semesterBySeason = new Map(
      (unwrap(seasonRows) ?? []).map((s) => {
        const period = pointsPeriod(s.year, s.term as SeasonTerm);
        return [s.id, period.seasons.join(" · ")];
      }),
    );
    const attended = unwrap(marks) ?? [];
    const earned = unwrap(entryRows) ?? [];

    const semesterOfSeason = (seasonId: string | null) =>
      seasonId ? semesterBySeason.get(seasonId) : undefined;
    // Totals reset each semester, so every semester is its own page.
    const semesters = [
      ...new Set(
        [
          ...attended.map((mark) => semesterOfSeason(mark.activity_sessions.season_id)),
          ...earned.map((entry) => semesterOfSeason(entry.season_id)),
        ].filter((value): value is string => Boolean(value)),
      ),
    ].sort((a, b) => b.localeCompare(a));

    const data = semesters.map((semester): ActivitySemester => {
      const sessions = attended
        .filter(
          (mark) =>
            semesterOfSeason(mark.activity_sessions.season_id) === semester &&
            mark.activity_sessions.kind !== "afterparty",
        )
        .map((mark): ActivitySession => ({
          date: mark.activity_sessions.held_on,
          title: mark.activity_sessions.title,
          kind: mark.activity_sessions.kind as AttendanceKind,
          status: mark.status as AttendanceStatus,
          reason: mark.reason,
        }))
        .sort((a, b) => a.date.localeCompare(b.date) || DAY_ORDER[a.kind] - DAY_ORDER[b.kind]);
      const entries = earned
        .filter((entry) => semesterOfSeason(entry.season_id) === semester)
        .map((entry) => ({
          date: entry.held_on,
          title: entry.title ?? "",
          label: entry.label ?? "",
          points: Number(entry.points ?? 0),
        }))
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
      const total = Math.round(entries.reduce((sum, entry) => sum + entry.points, 0) * 10) / 10;
      return { semester, sessions, entries, total, atRisk: total <= RETAKE_THRESHOLD };
    });

    return { ok: true, message: "", data: { ob: false, semesters: data } };
  } catch (error) {
    console.error("[activity]", error);
    return { ok: false, message: "기록을 불러오지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
