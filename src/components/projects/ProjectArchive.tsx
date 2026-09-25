"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Section, SectionHead } from "@/components/layout/Section";
import { EmptyNotice } from "@/components/ui/EmptyNotice";
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
  node: ReactNode;
};

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

  const isVisible = (entry: ArchiveEntry) => filter === ALL_PROJECTS || entry.period === filter;
  const visibleCount = entries.filter(isVisible).length;

  const selectFilter = (next: string) => {
    setSelected(next);
    window.history.replaceState(null, "", hashForFilter(next));
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Section soft>
        <div className="site-container">
          <SectionHead eyebrow="Filter" title="분기별로 살펴보기">
            <p>
              관심 있는 분기를 선택해 프로젝트의 문제의식, 접근 방식, 발표자료, GitHub 링크를
              확인해보세요.
            </p>
          </SectionHead>
          {entries.length > 0 ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="프로젝트 시즌 필터">
              {[ALL_PROJECTS, ...seasons].map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={filter === option}
                  onClick={() => selectFilter(option)}
                  className={clsx(
                    "inline-flex h-10 items-center justify-center rounded-full border px-4 text-small font-semibold transition-[border-color,background-color,color,scale] active:scale-[0.97]",
                    filter === option
                      ? "border-green-200 bg-green-100 text-green-800"
                      : "border-line bg-surface text-body hover:border-line-strong hover:text-ink",
                  )}
                >
                  {option === ALL_PROJECTS ? "전체" : option}
                </button>
              ))}
            </div>
          ) : null}
          <p className="mt-4 text-small text-muted" aria-live="polite">
            {filterStatusText(filter, visibleCount, entries.length)}
          </p>
        </div>
      </Section>

      <Section className="pt-14 max-lg:pt-10 max-sm:pt-6">
        <div
          ref={listRef}
          className="site-container grid scroll-mt-[calc(var(--header-height)+24px)] gap-5 max-sm:gap-3"
        >
          {entries.map((entry) => (
            <div
              key={entry.id}
              hidden={!isVisible(entry)}
              className="min-w-0 motion-safe:animate-fade"
            >
              {entry.node}
            </div>
          ))}
          {visibleCount === 0 ? <EmptyNotice>{emptyFilterText(filter)}</EmptyNotice> : null}
        </div>
      </Section>
    </>
  );
}
