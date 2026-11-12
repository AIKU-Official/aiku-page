"use client";

import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getProgramSessions, type ProgramSession } from "@/actions/studio";
import { formatDay } from "@/lib/activity/calendar";
import { parseSeasonName, seasonName } from "@/lib/seasons/name";
import { programHref, PROGRAMS, type ProgramSlug } from "@/lib/studio/programs";
import { sessionAnchor, todayInKorea } from "@/lib/studio/timeline";

import { GroupHeading } from "@/components/ui/GroupHeading";

import { StudioGate } from "./StudioGate";

/**
 * One program across every season: season filters (?season=26-2, kept in
 * the address so a link can open one season), then each season's sessions
 * newest first.
 */
export function ProgramSessions({ slug }: { slug: ProgramSlug }) {
  return (
    <StudioGate
      load={(token) => getProgramSessions(token, slug)}
      loading="일정을 불러오는 중입니다…"
    >
      {(sessions) => <ProgramList slug={slug} sessions={sessions} />}
    </StudioGate>
  );
}

function ProgramList({ slug, sessions }: { slug: ProgramSlug; sessions: ProgramSession[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // The program's seasons, newest first by the seasons table's own order.
  const seasons = [...new Map(sessions.map((s) => [s.season, s.seasonOrder]))]
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);
  // ?season= takes any accepted alias (2026-S, 26-S …) and resolves it to the stored name.
  const wanted = params.get("season");
  const parsed = wanted ? parseSeasonName(wanted) : null;
  const wantedName = parsed ? seasonName(parsed.year, parsed.term) : null;
  const selected = wantedName && seasons.includes(wantedName) ? wantedName : null;
  const shown = selected ? [selected] : seasons;
  const now = todayInKorea();
  // Opened from the calendar at one session (#session-<date>): bring it into
  // view and mark it for a moment. Runs once the sessions are on the page.
  const [marked, setMarked] = useState<string | null>(null);
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const row = id ? document.getElementById(id) : null;
    if (!row) return;
    row.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash is only known in the browser
    setMarked(id);
    const timer = window.setTimeout(() => setMarked(null), 4000);
    return () => window.clearTimeout(timer);
  }, []);

  const choose = (season: string | null) =>
    router.replace(season ? programHref(slug, season) : pathname, { scroll: false });

  if (!sessions.length) {
    return <p className="text-muted">아직 등록된 일정이 없습니다.</p>;
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="시즌">
        {[null, ...seasons].map((season) => (
          <button
            key={season ?? "all"}
            type="button"
            aria-pressed={selected === season}
            onClick={() => choose(season)}
            className={clsx(
              "h-9 rounded-full border px-4 text-small font-semibold tabular-nums transition-colors",
              selected === season
                ? "border-surface-soft bg-surface-soft text-ink"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {season ?? "전체"}
          </button>
        ))}
      </div>

      {shown.map((season) => {
        const rows = sessions.filter((session) => session.season === season);
        return (
          <section key={season} className="grid gap-3" aria-label={season}>
            <GroupHeading
              title={season}
              count={`${rows.length}회`}
              marker={
                <span
                  className={clsx("size-2.5 shrink-0 rounded-full", PROGRAMS[slug].tone.accent)}
                  aria-hidden="true"
                />
              }
            />
            <ol className="grid divide-y divide-soft-line rounded-[20px] border border-line bg-surface">
              {rows.map((session) => (
                <li
                  key={`${session.date}-${session.title}`}
                  id={sessionAnchor(session.date)}
                  className={clsx(
                    "transition-colors duration-700",
                    marked === sessionAnchor(session.date) && "bg-green-100",
                    "grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-4 px-5 py-3.5 max-sm:grid-cols-1 max-sm:gap-0.5 max-sm:px-4",
                    session.date > now && "text-muted",
                  )}
                >
                  <span className="text-small font-semibold tabular-nums">
                    {formatDay(session.date)}
                    {session.date === now ? (
                      <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-label text-white">
                        오늘
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 truncate text-body">{session.title}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
