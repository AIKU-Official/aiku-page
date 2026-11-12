"use client";

import Link from "next/link";

import { getStudioHome, type StudioHome as StudioHomeData } from "@/actions/studio";
import { MyActivity } from "@/components/profile/MyActivity";
import { hashForFilter } from "@/lib/projects/filter";
import { programHref, PROGRAMS } from "@/lib/studio/programs";

import { StudioGate } from "./StudioGate";
import { StudioTimeline } from "./StudioTimeline";

/** Today in Korea as "2026-11-13", the same on every device. */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

/**
 * The first page of AIKU Studio: what is coming up this semester, the
 * semester's programs, and the member's own attendance. Only 주니어, 시니어
 * and 활동 OB get past the notices.
 */
export function StudioHome() {
  return (
    <StudioGate load={getStudioHome} loading="Studio를 불러오는 중입니다…">
      {(data, member) => <Dashboard data={data} memberId={member.id} />}
    </StudioGate>
  );
}

function Dashboard({ data, memberId }: { data: StudioHomeData; memberId: string }) {
  const { semester, season, events, counts } = data;
  const programs = [
    {
      label: "DeepIntoDeep",
      value: counts.deepintodeep,
      unit: "회",
      href: programHref("deepintodeep", semester),
      accent: PROGRAMS.deepintodeep.tone.accent,
    },
    {
      label: "Projects",
      value: counts.projects,
      unit: "개",
      href: `/projects${hashForFilter(season)}`,
      accent: "bg-ink",
    },
    {
      label: "Momentum",
      value: counts.momentum,
      unit: "회",
      href: programHref("momentum", semester),
    },
    {
      label: "Seminar",
      value: counts.seminar,
      unit: "회",
      href: programHref("seminar", semester),
      accent: PROGRAMS.seminar.tone.accent,
    },
  ];

  return (
    <div className="grid gap-10 max-sm:gap-8">
      <StudioTimeline events={events} today={today()} />

      <section className="grid gap-4" aria-labelledby="studio-semester">
        <h2 id="studio-semester" className="text-[1.25rem] font-bold text-ink">
          {semester}학기
        </h2>
        <ul className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
          {programs.map((program) => {
            const body = (
              <>
                <span className={`h-1 w-8 rounded-full ${program.accent}`} aria-hidden="true" />
                <span className="text-label font-semibold tracking-[0.04em] text-muted uppercase">
                  {program.label}
                </span>
                <span className="text-[1.75rem] font-bold text-ink tabular-nums">
                  {program.value}
                  <span className="ml-0.5 text-small font-semibold text-muted">{program.unit}</span>
                </span>
              </>
            );
            const box = "grid gap-2 rounded-[20px] border border-line bg-surface px-5 py-4";
            return (
              <li key={program.label}>
                {program.href ? (
                  <Link
                    href={program.href}
                    className={`${box} transition-colors hover:border-line-strong hover:bg-surface-soft`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={box}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <MyActivity memberId={memberId} />
    </div>
  );
}
