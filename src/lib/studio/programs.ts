// AIKU's regular programs as Studio shows them: one page each, all
// semesters together, filtered by ?season=. Safe to import anywhere.

import type { SessionKind } from "@/lib/activity/calendar";

export type ProgramSlug = "deepintodeep" | "momentum" | "seminar";

/**
 * Each program's colour, as AIKU uses them: DeepIntoDeep yellow, Momentum sky,
 * Seminar the AIKU green. `accent` is the strong mark (a bar or dot), `chip`
 * a light label with its text and border.
 */
export type ProgramTone = {
  accent: string;
  chip: string;
  /** Recolours the site's green inside it (globals.css); "" keeps the AIKU green. */
  scope: string;
};

export const PROGRAMS: Record<
  ProgramSlug,
  { kind: SessionKind; label: string; lead: string; tone: ProgramTone }
> = {
  deepintodeep: {
    kind: "deepintodeep",
    label: "DeepIntoDeep",
    lead: "주니어를 위한 딥러닝 강의입니다. 학기마다 열두 번 남짓, 화요일과 목요일에 열립니다.",
    tone: {
      accent: "bg-amber-400",
      chip: "bg-amber-100 text-amber-800 border-amber-400/50",
      scope: "accent-deepintodeep",
    },
  },
  momentum: {
    kind: "momentum",
    label: "Momentum",
    lead: "시니어가 분야별로 모여 논문을 읽고 발표합니다.",
    tone: {
      accent: "bg-sky-400",
      chip: "bg-sky-100 text-sky-800 border-sky-400/50",
      scope: "accent-momentum",
    },
  },
  seminar: {
    kind: "seminar",
    label: "Seminar",
    lead: "매주 목요일, 시니어 발표와 프로젝트 진행 공유가 이어지는 정기 세미나입니다.",
    tone: {
      accent: "bg-green-500",
      chip: "bg-green-100 text-green-800 border-green-400/60",
      scope: "",
    },
  },
};

export const isProgram = (slug: string): slug is ProgramSlug => slug in PROGRAMS;

/** "/studio/seminar?season=26-2". */
export const programHref = (slug: ProgramSlug, semester?: string) =>
  `/studio/${slug}${semester ? `?season=${encodeURIComponent(semester)}` : ""}`;
