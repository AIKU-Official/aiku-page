// Who may use AIKU Studio, the members' activity pages. Safe to import anywhere.
//
// Studio is for members taking part now: 주니어, 시니어 and 활동 OB. 명예 OB
// (grade "ob") and visitors see the public site only.

export const STUDIO_GRADES = ["junior", "senior", "active_ob"] as const;

export const canUseStudio = (grade: string | null | undefined) =>
  (STUDIO_GRADES as readonly string[]).includes(grade ?? "");

/** Grades kept out of attendance and points: both kinds of OB. */
export const isOb = (grade: string | null | undefined) => grade === "ob" || grade === "active_ob";
