// Pure helpers for the attendance calendar and the points semester. Safe to
// import from client code.

export type AttendanceStatus = "present" | "excused_late" | "late" | "absent" | "excused_absent";
/** Sessions attendance is taken for. */
export type AttendanceKind = "deepintodeep" | "seminar" | "momentum" | "event" | "afterparty";
/** Every kind of entry on AIKU's calendar: the sessions and the rest of the schedule. */
export type SessionKind =
  AttendanceKind | "conference" | "exchange" | "academic" | "holiday" | "notice";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "출석",
  excused_late: "인정 지각",
  late: "무단지각",
  absent: "무단결석",
  excused_absent: "인정결석",
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "7월 30일 (목)". */
export function formatDay(iso: string): string {
  const date = toDate(iso);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일 (${WEEKDAYS[date.getUTCDay()]})`;
}

/** "+2", "-0.5", "0". */
export function formatPoints(points: number): string {
  const rounded = Math.round(points * 10) / 10;
  return rounded > 0 ? `+${rounded}` : String(rounded);
}
