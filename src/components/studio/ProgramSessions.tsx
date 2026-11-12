"use client";

import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getProgramSessions, type ProgramSession, type ProgramTalk } from "@/actions/studio";
import { PersonName } from "@/components/projects/PersonName";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import { formatDay } from "@/lib/activity/calendar";
import { parseSeasonName, seasonName } from "@/lib/seasons/name";
import { programHref, sessionNumber, type ProgramSlug } from "@/lib/studio/programs";
import { sessionAnchor, todayInKorea } from "@/lib/studio/timeline";

import { GroupHeading } from "@/components/ui/GroupHeading";

import { StudioGate } from "./StudioGate";

/**
 * One program, one season at a time (?season=26-2, kept in the address so a
 * link can open a season), moved between with arrows beside the season's
 * name; its sessions newest first.
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
  const params = useSearchParams();
  // The program's seasons, newest first by the seasons table's own order.
  const seasons = [...new Map(sessions.map((s) => [s.season, s.seasonOrder]))]
    .sort((a, b) => a[1] - b[1])
    .map(([name]) => name);
  // ?season= takes any accepted alias (2026-S, 26-S …) and resolves it to the stored name.
  const wanted = params.get("season");
  const parsed = wanted ? parseSeasonName(wanted) : null;
  const wantedName = parsed ? seasonName(parsed.year, parsed.term) : null;
  // One season at a time: the one asked for, else the program's newest.
  const season = wantedName && seasons.includes(wantedName) ? wantedName : seasons[0];
  const at = seasons.indexOf(season);
  const older = seasons[at + 1];
  const newer = seasons[at - 1];
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

  const choose = (name: string) => router.replace(programHref(slug, name), { scroll: false });

  if (!sessions.length) {
    return <p className="text-muted">아직 등록된 일정이 없습니다.</p>;
  }

  return (
    <div className="grid gap-8">
      {[season].map((season) => {
        const rows = sessions.filter((session) => session.season === season);
        return (
          <section key={season} className="grid gap-3" aria-label={season}>
            {/* The season's name between arrows in the program's colour (the page's
                accent scope): left for the season before, right for the one after. */}
            <GroupHeading
              title={season}
              count={`${rows.length}회`}
              marker={
                <SeasonArrow
                  label={older ? `이전 시즌 ${older}` : "이전 시즌 없음"}
                  disabled={!older}
                  onClick={() => older && choose(older)}
                  icon={<ChevronLeftIcon className="size-6" />}
                />
              }
              after={
                <SeasonArrow
                  label={newer ? `다음 시즌 ${newer}` : "다음 시즌 없음"}
                  disabled={!newer}
                  onClick={() => newer && choose(newer)}
                  icon={<ChevronRightIcon className="size-6" />}
                />
              }
            />
            {/* Cards as in a gallery: a Momentum session is wide, one column per track. */}
            <ol
              className={clsx(
                "grid gap-4",
                slug === "momentum"
                  ? "grid-cols-1"
                  : "grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1",
              )}
            >
              {rows.map((session) => (
                <SessionCard
                  key={`${session.date}-${session.title}`}
                  slug={slug}
                  session={session}
                  now={now}
                  marked={marked === sessionAnchor(session.date)}
                />
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

/**
 * One session as a card: its number and date, then its talks. A
 * DeepIntoDeep lecture shows its topic and lecturer; a Seminar lists each
 * talk; a Momentum session puts each track in its own column, so the card
 * grows sideways rather than down.
 */
function SessionCard({
  slug,
  session,
  now,
  marked,
}: {
  slug: ProgramSlug;
  session: ProgramSession;
  now: string;
  marked: boolean;
}) {
  const upcoming = session.date > now;
  const tracks = [
    ...new Map(session.talks.map((talk) => [talk.track?.label ?? "", talk.track])).entries(),
  ];

  return (
    <li
      id={sessionAnchor(session.date)}
      className={clsx(
        "grid content-start gap-4 rounded-[20px] border bg-surface p-5 transition-[background-color,border-color] duration-700 max-sm:p-4",
        marked ? "border-green-400 bg-green-50" : "border-line",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[1.375rem] font-bold text-ink tabular-nums">
          {sessionNumber(session.title)}
        </span>
        <span className={clsx("text-small tabular-nums", upcoming ? "text-muted" : "text-body")}>
          {formatDay(session.date)}
          {session.date === now ? (
            <span className="ml-2 rounded-full bg-ink px-2 py-0.5 text-label text-white">오늘</span>
          ) : null}
        </span>
      </div>

      {session.talks.length === 0 ? (
        <p className="text-small text-muted">
          {upcoming ? "아직 발표가 정해지지 않았습니다." : "발표 기록이 없습니다."}
        </p>
      ) : slug === "momentum" ? (
        <div
          className="grid gap-5 max-lg:grid-cols-1"
          style={{ gridTemplateColumns: `repeat(${tracks.length}, minmax(0, 1fr))` }}
        >
          {tracks.map(([key, track]) => (
            <div key={key} className="grid content-start gap-3">
              <span
                className="w-fit rounded-full bg-green-100 px-2.5 py-0.5 text-label font-semibold text-green-800"
                title={track?.name}
              >
                {track?.label ?? "트랙 없음"}
              </span>
              <TalkList talks={session.talks.filter((talk) => (talk.track?.label ?? "") === key)} />
            </div>
          ))}
        </div>
      ) : (
        <TalkList talks={session.talks} lecture={slug === "deepintodeep"} />
      )}
    </li>
  );
}

/** Talks one under another: a lecture's topic then its lecturer, or a talk's speaker then its title; then keywords. */
function TalkList({ talks, lecture = false }: { talks: ProgramTalk[]; lecture?: boolean }) {
  return (
    <ul className="grid gap-3.5">
      {talks.map((talk, index) => {
        const speakers = talk.speakers.length ? (
          <>
            {talk.speakers.map((speaker, i) => (
              <span key={speaker.name}>
                {i > 0 ? ", " : ""}
                <PersonName person={speaker} />
              </span>
            ))}
          </>
        ) : null;
        const title = talk.title || <span className="text-muted">제목 없음</span>;
        return (
          <li key={index} className="grid gap-1">
            {lecture ? (
              // A lecture: its topic, then who gave it.
              <>
                <p className="text-[1.0625rem] leading-snug font-semibold text-ink">{title}</p>
                {speakers ? <p className="text-small text-muted">강의자 · {speakers}</p> : null}
              </>
            ) : (
              // A talk: who gave it, then its title.
              <>
                {speakers ? <p className="font-semibold text-ink">{speakers}</p> : null}
                <p className="text-small leading-snug text-body">{title}</p>
              </>
            )}
            {talk.keywords.length ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {talk.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full bg-surface-soft px-2 py-0.5 text-label text-body"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** An arrow beside the season's name, in the page's accent colour. */
function SeasonArrow({
  label,
  disabled,
  onClick,
  icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-10 items-center justify-center rounded-full text-green-700 transition-colors hover:bg-green-100 disabled:pointer-events-none disabled:text-line-strong"
    >
      {icon}
    </button>
  );
}
