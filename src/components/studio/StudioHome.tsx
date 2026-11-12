"use client";

import clsx from "clsx";
import Link from "next/link";

import {
  getStudioHome,
  type StudioEvent,
  type StudioHome as StudioHomeData,
} from "@/actions/studio";
import { ArrowRightIcon } from "@/components/ui/icons";
import { formatDay } from "@/lib/activity/calendar";
import { hashForFilter } from "@/lib/projects/filter";
import { programHref, PROGRAMS } from "@/lib/studio/programs";
import { todayInKorea } from "@/lib/studio/timeline";

import { StudioGate } from "./StudioGate";
import { StudioTimeline } from "./StudioTimeline";

/**
 * The first page of AIKU Studio: what is coming up and the current season's
 * programs. Only 주니어, 시니어
 * and 활동 OB get past the notices.
 */
export function StudioHome() {
  return (
    <StudioGate load={getStudioHome} loading="Studio를 불러오는 중입니다…">
      {(data) => <Dashboard data={data} />}
    </StudioGate>
  );
}

function Dashboard({ data }: { data: StudioHomeData }) {
  const { season, events, counts } = data;
  const today = todayInKorea();
  // The next session of a program in the current season, for "다음" on its card.
  // The next session of a program in the current season, for "다음" on its card.
  const next = (kind: StudioEvent["kind"]) =>
    events.find((event) => event.kind === kind && event.current && event.date >= today);

  const cards = [
    ...(["deepintodeep", "momentum", "seminar"] as const).map((slug) => {
      const upcoming = next(PROGRAMS[slug].kind);
      return {
        key: slug,
        label: PROGRAMS[slug].label,
        value: counts[slug],
        unit: "회",
        href: programHref(slug, season),
        card: PROGRAMS[slug].tone.card,
        text: PROGRAMS[slug].tone.text,
        note: upcoming
          ? `다음 · ${formatDay(upcoming.date)}`
          : counts[slug]
            ? "이번 시즌 일정 끝"
            : "이번 시즌 일정 없음",
      };
    }),
    {
      key: "projects",
      label: "Projects",
      value: counts.projects,
      unit: "개",
      href: `/projects${hashForFilter(season)}`,
      card: "border-line bg-linear-to-bl from-surface-soft to-white to-70%",
      text: "text-ink",
      note: `${season} 프로젝트 보기`,
    },
  ];

  return (
    <div className="grid gap-12 max-sm:gap-9">
      <StudioTimeline events={events} today={today} />

      <section className="grid gap-4" aria-labelledby="studio-season">
        <h2 id="studio-season" className="text-heading text-ink">
          {season} 시즌
        </h2>
        <ul className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
          {cards.map((card) => (
            <li key={card.key}>
              <Link
                href={card.href}
                className={clsx(
                  "group grid gap-3 rounded-[20px] border p-5 transition-[border-color,box-shadow] hover:shadow-[0_8px_24px_rgb(29_29_29/0.06)] max-sm:p-4",
                  card.card,
                )}
              >
                <span
                  className={clsx("flex items-center gap-2 text-[1.0625rem] font-bold", card.text)}
                >
                  {card.label}
                  <ArrowRightIcon className="ml-auto size-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
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
    </div>
  );
}
