import type { MemberGrade } from "@/lib/types";

// Pastel tag colours. Literal class names so Tailwind can see them.

export const gradeToneClassName: Record<MemberGrade, string> = {
  junior: "bg-sprout-100 text-sprout-800",
  senior: "bg-sky-100 text-sky-800",
  ob: "bg-sand-100 text-sand-800",
};

/** Solid dot in the grade's hue, for places where a full tag would be too heavy. */
export const gradeDotClassName: Record<MemberGrade, string> = {
  junior: "bg-sprout-500",
  senior: "bg-sky-800",
  ob: "bg-sand-800",
};

/** Officer titles are coloured by role: 회장, 부회장, then every other title. */
export function positionToneClassName(position: string): string {
  if (position.includes("부회장")) return "bg-silver-100 text-silver-800";
  if (position.includes("회장")) return "bg-amber-100 text-amber-800";
  return "bg-violet-100 text-violet-800";
}
