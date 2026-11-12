"use server";

import { unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import {
  semesterOf,
  type AttendanceStatus,
  type SeasonTerm,
  type SessionKind,
} from "@/lib/activity/calendar";
import { signedInMember } from "@/lib/members/signed-in";
import { createAdminClient } from "@/lib/supabase/admin-client";

export type ActivitySession = {
  title: string;
  kind: SessionKind;
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

/** One member's attendance and points for their latest semester. */
export type MyActivity = {
  /** "26-2". */
  semester: string;
  /** Sessions the member was marked for, by date. */
  days: { date: string; sessions: ActivitySession[] }[];
  /** First and last session day of the semester, for the calendar. */
  first: string;
  last: string;
  entries: PointEntry[];
  total: number;
  /** At or below -5, the threshold for repeating the semester. */
  atRisk: boolean;
};

const RETAKE_THRESHOLD = -5;

/**
 * The signed-in member's own attendance and points. The member is taken from
 * the access token, never from the request, so nobody can read another
 * member's records; there is no public variant. Null when there is nothing
 * to show yet.
 */
export async function getMyActivity(accessToken: unknown): Promise<ActionResult<MyActivity | null>> {
  try {
    const db = createAdminClient();
    const memberId = await signedInMember(db, String(accessToken ?? ""));
    if (!memberId) return { ok: false, message: "학회원으로 확인된 계정만 볼 수 있습니다." };

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
    const semesterBySeason = new Map(
      (unwrap(seasonRows) ?? []).map((s) => [s.id, semesterOf(s.year, s.term as SeasonTerm)]),
    );
    const attended = unwrap(marks) ?? [];
    const earned = unwrap(entryRows) ?? [];

    // The latest semester the member has any record in; totals reset each semester.
    const semesters = [
      ...attended.map((mark) => semesterBySeason.get(mark.activity_sessions.season_id)),
      ...earned.map((entry) => (entry.season_id ? semesterBySeason.get(entry.season_id) : undefined)),
    ].filter((value): value is string => Boolean(value));
    if (!semesters.length) return { ok: true, message: "", data: null };
    const semester = semesters.sort().at(-1)!;

    const byDay = new Map<string, ActivitySession[]>();
    for (const mark of attended) {
      const session = mark.activity_sessions;
      if (semesterBySeason.get(session.season_id) !== semester) continue;
      const list = byDay.get(session.held_on) ?? [];
      list.push({
        title: session.title,
        kind: session.kind as SessionKind,
        status: mark.status as AttendanceStatus,
        reason: mark.reason,
      });
      byDay.set(session.held_on, list);
    }
    const days = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sessions]) => ({ date, sessions }));

    const entries = earned
      .filter((entry) => entry.season_id && semesterBySeason.get(entry.season_id) === semester)
      .map((entry) => ({
        date: entry.held_on,
        title: entry.title ?? "",
        label: entry.label ?? "",
        points: Number(entry.points ?? 0),
      }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
    const total = Math.round(entries.reduce((sum, entry) => sum + entry.points, 0) * 10) / 10;

    return {
      ok: true,
      message: "",
      data: {
        semester,
        days,
        first: days[0]?.date ?? "",
        last: days.at(-1)?.date ?? "",
        entries,
        total,
        atRisk: total <= RETAKE_THRESHOLD,
      },
    };
  } catch (error) {
    console.error("[activity]", error);
    return { ok: false, message: "기록을 불러오지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
