"use server";

import { unwrap } from "@/lib/actions/admin-action";
import type { ActionResult } from "@/lib/actions/result";
import type { SessionKind } from "@/lib/activity/calendar";
import type { ProjectPerson } from "@/lib/types";
import { signedInMember } from "@/lib/members/signed-in";
import { mapPersonMember } from "@/lib/data/mappers";
import { PERSON_MEMBER_SELECT } from "@/lib/members/positions";
import { canUseStudio } from "@/lib/members/studio";
import { seasonName, seasonOfDate } from "@/lib/seasons/name";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { isProgram, PROGRAMS } from "@/lib/studio/programs";
import { monthEnd, todayInKorea } from "@/lib/studio/timeline";

export type StudioEvent = {
  /** ISO date. */
  date: string;
  /** Last day, for an entry over several days; null for one day. */
  until: string | null;
  title: string;
  /** What its bar shows: "12회" for a numbered program session, else the title. */
  label: string;
  kind: SessionKind | "aikuthon";
  /** The kind's name (session_kinds.label). */
  kindLabel: string;
  /**
   * The season it belongs to: a program session's run season ("26-2" for a
   * July Seminar), else the season of its date. For links to its season.
   */
  season: string;
  /** Whether it belongs to the current season's programs. */
  current: boolean;
};

export type StudioHome = {
  /** The season today falls in, "26-2". */
  season: string;
  /** From the start of the current season to the months the calendar reaches, in date order. */
  events: StudioEvent[];
  /** Sessions of each kind in the current season, and its projects. */
  counts: Record<"deepintodeep" | "momentum" | "seminar" | "projects", number>;
};

const NOT_ALLOWED = "AIKU Studio는 주니어, 시니어, 활동 OB만 볼 수 있습니다.";

/** Whether the access token belongs to a member who may use Studio. Never trusts the request. */
async function isStudioMember(db: ReturnType<typeof createAdminClient>, accessToken: unknown) {
  const memberId = await signedInMember(db, String(accessToken ?? ""));
  const member = memberId
    ? unwrap(await db.from("members").select("grade").eq("id", memberId).maybeSingle())
    : null;
  return Boolean(member && canUseStudio(member.grade));
}

/**
 * The Studio home for the signed-in member: the current season (the seasons
 * row whose dates hold today), its schedule and programs, and what is coming
 * in the next months. Only for members who may use Studio (주니어, 시니어,
 * 활동 OB); the member comes from the access token, never from the request.
 */
export async function getStudioHome(accessToken: unknown): Promise<ActionResult<StudioHome>> {
  try {
    const db = createAdminClient();
    if (!(await isStudioMember(db, accessToken))) return { ok: false, message: NOT_ALLOWED };

    const today = todayInKorea();
    const current = unwrap(
      await db
        .from("seasons")
        .select("id, name, starts_on")
        .lte("starts_on", today)
        .gte("ends_on", today)
        .maybeSingle(),
    );
    // A season not stored yet still has a name; it simply has nothing in it.
    const now = seasonOfDate(today);
    const season = current?.name ?? seasonName(now.year, now.term);
    const from = current?.starts_on ?? today;
    const until = monthEnd(today, 4);

    const [sessionRows, aikuthonRows, projectCount] = await Promise.all([
      // Everything from the season's start (or still running then) to the
      // months the calendar reaches.
      db
        .from("activity_sessions")
        .select(
          "title, kind, held_on, ends_on, number, seasons(name), session_kinds(label), program_runs(season_id, seasons(name))",
        )
        .or(`held_on.gte.${from},ends_on.gte.${from}`)
        .lte("held_on", until),
      db
        .from("aikuthons")
        .select("name, starts_on, ends_on, seasons(name)")
        .or(`starts_on.gte.${from},ends_on.gte.${from}`)
        .lte("starts_on", until),
      current
        ? db
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("season_id", current.id)
        : Promise.resolve({ count: 0 }),
    ]);
    // After-parties belong to the Seminar before them; they are not their own event.
    const sessions = (unwrap(sessionRows) ?? []).filter((row) => row.kind !== "afterparty");
    const events: StudioEvent[] = [
      ...sessions.map((row) => ({
        date: row.held_on,
        until: row.ends_on,
        title: row.title,
        label: row.number ? `${row.number}회` : row.title,
        kind: row.kind as SessionKind,
        kindLabel: row.session_kinds.label,
        season: row.program_runs?.seasons.name ?? row.seasons.name,
        current: Boolean(current && row.program_runs?.season_id === current.id),
      })),
      // An AIKUTHON that attendance was taken for is already a session that day.
      ...(unwrap(aikuthonRows) ?? [])
        .filter((row) => !sessions.some((s) => s.kind === "event" && s.held_on === row.starts_on))
        .map((row) => ({
          date: row.starts_on,
          until: row.ends_on && row.ends_on > row.starts_on ? row.ends_on : null,
          title: row.name,
          label: row.name,
          kind: "aikuthon" as const,
          kindLabel: "AIKUTHON",
          season: row.seasons.name,
          current: false,
        })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "ko"));

    // A program's count is its run in the current season.
    const count = (kind: SessionKind) =>
      events.filter((event) => event.kind === kind && event.current).length;
    return {
      ok: true,
      message: "",
      data: {
        season,
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

export type ProgramTalk = {
  title: string;
  keywords: string[];
  /** A Momentum talk's track: its short label ("CV", "RL") and full name. */
  track: { label: string; name: string } | null;
  speakers: ProjectPerson[];
};

export type ProgramSession = {
  date: string;
  until: string | null;
  title: string;
  /** The "12" of "12회"; null for an unnumbered session (an OT kept with the program). */
  number: number | null;
  /** Its run's season, "26-여름" (a July Seminar is in 26-2). */
  season: string;
  /** That season's place in time; smaller is newer. */
  seasonOrder: number;
  talks: ProgramTalk[];
};

/** Every session of one program with its talks, newest first, for its Studio page. Studio members only. */
export async function getProgramSessions(
  accessToken: unknown,
  slug: unknown,
): Promise<ActionResult<ProgramSession[]>> {
  try {
    if (typeof slug !== "string" || !isProgram(slug))
      return { ok: false, message: "없는 프로그램입니다." };
    const db = createAdminClient();
    if (!(await isStudioMember(db, accessToken))) return { ok: false, message: NOT_ALLOWED };
    const rows =
      unwrap(
        await db
          .from("activity_sessions")
          .select(
            `title, held_on, ends_on, number, program_runs!inner(seasons(name, sort_order)), session_talks(title, keywords, sort_order, tags(name, abbreviation), session_talk_speakers(name, sort_order, ${PERSON_MEMBER_SELECT}))`,
          )
          .eq("kind", PROGRAMS[slug].kind)
          .order("held_on", { ascending: false }),
      ) ?? [];
    const bySort = <T extends { sort_order: number }>(list: T[]) =>
      [...list].sort((a, b) => a.sort_order - b.sort_order);
    return {
      ok: true,
      message: "",
      data: rows.map((row) => ({
        date: row.held_on,
        until: row.ends_on,
        title: row.title,
        number: row.number,
        season: row.program_runs.seasons.name,
        seasonOrder: row.program_runs.seasons.sort_order,
        talks: bySort(row.session_talks).map((talk) => ({
          title: talk.title,
          keywords: talk.keywords,
          track: talk.tags
            ? { label: talk.tags.abbreviation ?? talk.tags.name, name: talk.tags.name }
            : null,
          speakers: bySort(talk.session_talk_speakers).map((speaker) => ({
            name: speaker.members?.name ?? speaker.name,
            role: "member" as const,
            member: mapPersonMember(speaker.members),
          })),
        })),
      })),
    };
  } catch (error) {
    console.error("[studio program]", error);
    return { ok: false, message: "일정을 불러오지 못했습니다. 잠시 후 다시 시도하세요." };
  }
}
