/** A season's term: winter (Jan–Feb), 1st semester, summer, 2nd semester. */
export type SeasonTerm = "winter" | "1" | "summer" | "2";

const PATTERN = /^(\d{2})-(1|2|여름|겨울)$/;

/**
 * Reads "26-여름" as { year: 2026, term: "summer" }, or null for any other
 * shape. The database derives the same values with a trigger and refuses
 * names that do not match.
 */
export function parseSeasonName(name: string): { year: number; term: SeasonTerm } | null {
  const match = PATTERN.exec(name);
  if (!match) return null;
  const term = match[2] === "겨울" ? "winter" : match[2] === "여름" ? "summer" : match[2];
  return { year: 2000 + Number(match[1]), term: term as SeasonTerm };
}
