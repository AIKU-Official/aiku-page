"use client";

import clsx from "clsx";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Section, SectionHead } from "@/components/layout/Section";
import { buttonClassName } from "@/components/ui/Button";
import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { ChevronDownIcon } from "@/components/ui/icons";
import {
  ALL_PROJECTS,
  emptyFilterText,
  filterFromHash,
  filterStatusText,
  hashForFilter,
} from "@/lib/projects/filter";

export type ArchiveEntry = {
  id: string;
  period: string;
  /** Server-rendered project card. */
  awardRank: 1 | 2 | 3 | null;
  tags: string[];
  node: ReactNode;
};

/** Seasons listed at first in the full view, and added by each "더보기". */
const SEASONS_PER_STEP = 2;

// Prize filters wear their medal colour: an outline when off, filled with a firm edge when on.
const RANK_CHIPS = {
  1: {
    off: "border-amber-800/25 bg-surface text-amber-800 hover:bg-amber-100/50",
    on: "border-amber-800/70 bg-amber-100 text-amber-800 ring-1 ring-amber-800/70",
  },
  2: {
    off: "border-silver-800/25 bg-surface text-silver-800 hover:bg-silver-100/60",
    on: "border-silver-800/70 bg-silver-100 text-silver-800 ring-1 ring-silver-800/70",
  },
  3: {
    off: "border-bronze-800/25 bg-surface text-bronze-800 hover:bg-bronze-100/50",
    on: "border-bronze-800/70 bg-bronze-100 text-bronze-800 ring-1 ring-bronze-800/70",
  },
} as const;

const chipClassName = (active: boolean) =>
  clsx(
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border px-4 text-small font-semibold transition-[border-color,background-color,color,scale] active:scale-[0.97]",
    active
      ? "border-line-strong bg-surface-soft text-ink"
      : "border-line bg-surface text-body hover:border-line-strong hover:text-ink",
  );

const groupLabelClassName = "mb-2.5 text-label text-muted";

const toggled = <T,>(list: T[], value: T) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

export function ProjectArchive({
  seasons,
  entries,
}: {
  seasons: string[];
  entries: ArchiveEntry[];
}) {
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  // A clicked filter wins until the hash is changed from outside (e.g. a link).
  const [selected, setSelected] = useState<string | null>(null);
  const filter = selected ?? filterFromHash(hash, seasons);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onHashChange = () => setSelected(null);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  // Prize and tag filters narrow the season further; several of each may be on,
  // and a project matching any selected one is shown.
  const [ranks, setRanks] = useState<number[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const narrowed = ranks.length > 0 || tags.length > 0;

  const tagCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const allTags = [...tagCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"),
  );

  const matches = (entry: ArchiveEntry) =>
    (filter === ALL_PROJECTS || entry.period === filter) &&
    (!ranks.length || (entry.awardRank !== null && ranks.includes(entry.awardRank))) &&
    (!tags.length || entry.tags.some((tag) => tags.includes(tag)));
  const matching = entries.filter(matches);

  // The full list is long, so it opens two seasons at a time. A chosen season
  // or a prize / tag filter is already short and is listed whole.
  const [seasonSteps, setSeasonSteps] = useState(1);
  const paged = filter === ALL_PROJECTS && !narrowed;
  const periods = [...new Set(entries.map((entry) => entry.period))];
  const openPeriods = new Set(periods.slice(0, seasonSteps * SEASONS_PER_STEP));
  const hiddenSeasons = paged ? Math.max(0, periods.length - openPeriods.size) : 0;

  const isVisible = (entry: ArchiveEntry) =>
    matches(entry) && (!paged || openPeriods.has(entry.period));
  const visible = entries.filter(isVisible);
  const visibleCount = matching.length;

  const selectFilter = (next: string) => {
    setSelected(next);
    window.history.replaceState(null, "", hashForFilter(next));
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* White like the first section of every other page; the list below continues it. */}
      <Section className="pb-0 max-lg:pb-0 max-sm:pb-0">
        <div className="site-container">
          <SectionHead eyebrow="Filter" title="프로젝트 살펴보기">
            <p>
              분기를 고르고, 수상작이나 관심 분야 태그로 좁혀 프로젝트의 문제의식, 접근 방식,
              발표자료, GitHub 링크를 확인해보세요.
            </p>
          </SectionHead>
          {entries.length > 0 ? <p className={groupLabelClassName}>분기</p> : null}
          {entries.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="프로젝트 분기 필터">
              {[ALL_PROJECTS, ...seasons].map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => selectFilter(option)}
                  className={chipClassName(filter === option)}
                >
                  {option === ALL_PROJECTS ? "전체" : option}
                </button>
              ))}
            </div>
          ) : null}
          {entries.length ? (
            <>
              {/* A hairline and its own label set these apart from the season row. */}
              <p className={clsx(groupLabelClassName, "mt-5 border-t border-soft-line pt-5")}>
                수상 · 태그
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="수상·태그 필터">
                {([1, 2, 3] as const).map((rank) => (
                  <button
                    key={rank}
                    type="button"
                    aria-pressed={ranks.includes(rank)}
                    onClick={() => setRanks((current) => toggled(current, rank))}
                    className={clsx(
                      "inline-flex h-10 items-center justify-center rounded-full border px-4 text-small font-semibold transition-[border-color,background-color,scale] active:scale-[0.97]",
                      RANK_CHIPS[rank][ranks.includes(rank) ? "on" : "off"],
                    )}
                  >
                    {rank}등
                  </button>
                ))}
                <button
                  type="button"
                  aria-expanded={tagsOpen}
                  aria-controls="project-tag-list"
                  onClick={() => setTagsOpen((value) => !value)}
                  className={chipClassName(tags.length > 0)}
                >
                  태그{tags.length ? ` ${tags.length}` : ""}
                  <ChevronDownIcon
                    className={clsx("size-4 transition-transform", tagsOpen && "rotate-180")}
                  />
                </button>
              </div>
              <div
                id="project-tag-list"
                hidden={!tagsOpen}
                className="mt-2.5 flex flex-wrap gap-1.5 rounded-card border border-soft-line bg-surface-soft p-4 motion-safe:animate-fade max-sm:p-3"
                role="group"
                aria-label="태그 필터"
              >
                {allTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={tags.includes(tag)}
                    onClick={() => setTags((current) => toggled(current, tag))}
                    className={clsx(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-label transition-[border-color,background-color,color]",
                      tags.includes(tag)
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface text-body hover:border-line-strong hover:text-ink",
                    )}
                  >
                    {tag}
                    <span className={tags.includes(tag) ? "text-white/70" : "text-muted"}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
                <span aria-live="polite">
                  {filterStatusText(filter, visibleCount, entries.length, narrowed)}
                </span>
                {narrowed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRanks([]);
                      setTags([]);
                    }}
                    className="cursor-pointer font-semibold text-green-800 underline-offset-4 hover:underline"
                  >
                    조건 초기화
                  </button>
                ) : null}
              </p>
            </>
          ) : null}
        </div>
      </Section>

      <Section className="pt-14 max-lg:pt-10 max-sm:pt-6">
        <div
          ref={listRef}
          className="site-container grid scroll-mt-[calc(var(--header-height)+24px)] gap-5 max-sm:gap-3"
        >
          {entries.map((entry, index) => {
            // When every season is listed, each one starts under its own heading.
            const inSeason = visible.filter((other) => other.period === entry.period).length;
            const startsSeason =
              filter === ALL_PROJECTS &&
              inSeason > 0 &&
              entry.period !== entries[index - 1]?.period;
            return (
              <Fragment key={entry.id}>
                {startsSeason ? (
                  <div className="flex items-baseline gap-3 border-b border-line pb-3 not-first:mt-10 max-sm:not-first:mt-7">
                    <h2 className="text-heading">{entry.period}</h2>
                    <span className="text-small text-muted">{inSeason}개 프로젝트</span>
                  </div>
                ) : null}
                <div hidden={!isVisible(entry)} className="min-w-0 motion-safe:animate-fade">
                  {entry.node}
                </div>
              </Fragment>
            );
          })}
          {visibleCount === 0 ? (
            <EmptyNotice>
              {narrowed ? "조건에 맞는 프로젝트가 없습니다." : emptyFilterText(filter)}
            </EmptyNotice>
          ) : null}
          {hiddenSeasons > 0 ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setSeasonSteps((steps) => steps + 1)}
                className={buttonClassName({ variant: "secondary", fullWidthOnMobile: false })}
              >
                이전 분기 더보기
                <ChevronDownIcon className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}
