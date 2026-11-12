"use client";

import clsx from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getProgramSessions, type ProgramSession } from "@/actions/studio";
import { formatDay } from "@/lib/activity/calendar";
import { programHref, PROGRAMS, type ProgramSlug } from "@/lib/studio/programs";
import { sessionAnchor, todayInKorea } from "@/lib/studio/timeline";

import { StudioGate } from "./StudioGate";

/**
 * One program across every semester: semester filters (?season=26-2, kept
 * in the address so a link can open one semester), then each semester's
 * sessions newest first.
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
  const semesters = [...new Set(sessions.map((session) => session.semester))];
  const wanted = params.get("season");
  const selected = wanted && semesters.includes(wanted) ? wanted : null;
  const shown = selected ? [selected] : semesters;
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

  const choose = (semester: string | null) =>
    router.replace(semester ? programHref(slug, semester) : pathname, { scroll: false });

  if (!sessions.length) {
    return <p className="text-muted">아직 등록된 일정이 없습니다.</p>;
  }

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap gap-2" role="group" aria-label="학기">
        {[null, ...semesters].map((semester) => (
          <button
            key={semester ?? "all"}
            type="button"
            aria-pressed={selected === semester}
            onClick={() => choose(semester)}
            className={clsx(
              "h-9 rounded-full border px-4 text-small font-semibold tabular-nums transition-colors",
              selected === semester
                ? "border-surface-soft bg-surface-soft text-ink"
                : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
            )}
          >
            {semester ? `${semester}학기` : "전체"}
          </button>
        ))}
      </div>

      {shown.map((semester) => {
        const rows = sessions.filter((session) => session.semester === semester);
        return (
          <section key={semester} className="grid gap-3" aria-label={`${semester}학기`}>
            <h2 className="flex items-center gap-2 text-[1.25rem] font-bold text-ink">
              <span
                className={clsx("size-2.5 rounded-full", PROGRAMS[slug].tone.accent)}
                aria-hidden="true"
              />
              {semester}학기
              <span className="text-small font-semibold text-muted tabular-nums">
                {rows.length}회
              </span>
            </h2>
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
