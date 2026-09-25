"use client";

import { useState, type ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";

type ProjectEntryProps = {
  id: string;
  period: string;
  title: string;
  summary: string;
  /** Server-rendered resource links. */
  resources: ReactNode;
  /** Server-rendered markdown body, shown after "자세히 보기". */
  body: ReactNode;
};

export function ProjectEntry({ id, period, title, summary, resources, body }: ProjectEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = `project-body-${id}`;

  return (
    <article
      id={`project-${id}`}
      className="scroll-mt-[calc(var(--header-height)+18px)] rounded-card border border-line bg-surface p-7 max-sm:p-5"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] items-start gap-7 border-b border-soft-line pb-6 max-lg:grid-cols-1">
        <div>
          <Eyebrow>{period || "AIKU"}</Eyebrow>
          <h2>{title}</h2>
          <p className="mt-2.5 max-w-[620px] text-muted">
            {summary || "관련 분야 태그가 곧 공개됩니다."}
          </p>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((value) => !value)}
            className="mt-[18px] min-h-10 w-fit rounded-control border border-line bg-surface px-3.5 text-[0.92rem] font-extrabold text-ink transition-[border-color,background-color] hover:border-aiku-green hover:bg-surface-mint focus-visible:border-aiku-green focus-visible:bg-surface-mint"
          >
            {expanded ? "접기" : "자세히 보기"}
          </button>
        </div>
        {resources}
      </div>
      <div id={bodyId} hidden={!expanded}>
        {body}
      </div>
    </article>
  );
}
