import type { MemberGrade } from "@/lib/types";

// Pastel tag colours. Literal class names so Tailwind can see them.

export const gradeToneClassName: Record<MemberGrade, string> = {
  junior: "bg-sprout-100 text-sprout-800",
  senior: "bg-sky-100 text-sky-800",
  ob: "bg-sand-100 text-sand-800",
};

/** Border in the grade's hue, for a selected tile filled with the tone above. */
export const gradeBorderClassName: Record<MemberGrade, string> = {
  junior: "border-sprout-500/45",
  senior: "border-sky-800/30",
  ob: "border-sand-800/30",
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

/** A faint diagonal wash for the cards of officers, like the one on prize-winning projects. */
export function positionCardClassName(position: string): string | null {
  if (position.includes("부회장")) {
    return "border-silver-800/10 bg-linear-to-bl from-silver-100/55 to-white to-70%";
  }
  if (position.includes("회장")) {
    return "border-amber-800/10 bg-linear-to-bl from-amber-100/45 to-white to-70%";
  }
  return null;
}
