"use client";

import clsx from "clsx";
import Link from "next/link";

import {
  getStudioHome,
  type StudioEvent,
  type StudioHome as StudioHomeData,
} from "@/actions/studio";
import { MyActivity } from "@/components/profile/MyActivity";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatDay } from "@/lib/activity/calendar";
import { hashForFilter } from "@/lib/projects/filter";
import { programHref, PROGRAMS } from "@/lib/studio/programs";
import { todayInKorea } from "@/lib/studio/timeline";

import { StudioGate } from "./StudioGate";
import { StudioTimeline } from "./StudioTimeline";

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
  const today = todayInKorea();
  // The next session of a program from today on, for "다음" on its card.
  const next = (kind: StudioEvent["kind"]) =>
    events.find((event) => event.kind === kind && event.date >= today);

  const cards = [
    ...(["deepintodeep", "momentum", "seminar"] as const).map((slug) => {
      const upcoming = next(PROGRAMS[slug].kind);
      return {
        key: slug,
        label: PROGRAMS[slug].label,
        value: counts[slug],
        unit: "회",
        href: programHref(slug, semester),
        dot: PROGRAMS[slug].tone.accent,
        note: upcoming ? `다음 · ${formatDay(upcoming.date)}` : "이번 학기 일정 끝",
      };
    }),
    {
      key: "projects",
      label: "Projects",
      value: counts.projects,
      unit: "개",
      href: `/projects${hashForFilter(season)}`,
      dot: "bg-ink",
      note: `${season} 프로젝트 보기`,
    },
  ];

  return (
    <div className="grid gap-12 max-sm:gap-9">
      <StudioTimeline events={events} today={today} />

      <section className="grid gap-4" aria-labelledby="studio-semester">
        <h2 id="studio-semester" className="text-[1.25rem] font-bold text-ink">
          {semester}학기
        </h2>
        <ul className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
          {cards.map((card) => (
            <li key={card.key}>
              <Link
                href={card.href}
                className="group grid gap-3 rounded-[20px] border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-soft max-sm:p-4"
              >
                <span className="flex items-center gap-2 text-small font-semibold text-body">
                  <span className={clsx("size-2 rounded-full", card.dot)} aria-hidden="true" />
                  {card.label}
                  <ArrowRightIcon className="ml-auto size-4 text-muted transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="flex items-baseline gap-1">
                  <span className="text-[2rem] leading-none font-bold text-ink tabular-nums">
                    {card.value}
                  </span>
                  <span className="text-small font-semibold text-muted">{card.unit}</span>
                </span>
                <span className="text-label text-muted">{card.note}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <MyActivity memberId={memberId} />
    </div>
  );
}
