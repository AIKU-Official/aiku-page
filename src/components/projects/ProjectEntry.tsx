"use client";

import clsx from "clsx";
import { useState, type ReactNode } from "react";

import { buttonClassName } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ChevronDownIcon } from "@/components/ui/icons";
import { parseTags } from "@/lib/projects/tags";

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
  const tags = parseTags(summary);

  return (
    <article
      id={`project-${id}`}
      className="reveal scroll-mt-[calc(var(--header-height)+24px)] card p-8 max-sm:p-5"
    >
      <div className="flex items-start justify-between gap-8 max-lg:flex-col max-lg:gap-5 max-sm:gap-4">
        <div className="min-w-0">
          <Eyebrow spacing="tight">{period || "AIKU"}</Eyebrow>
          <h2 className="text-[1.625rem] leading-[1.3] font-extrabold tracking-[-0.025em] max-sm:text-[1.25rem]">
            {title}
          </h2>
          {tags ? (
            <ul className="mt-4 flex flex-wrap gap-1.5 max-sm:mt-3" aria-label="관련 분야">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex h-7 items-center rounded-full bg-green-50 px-3 text-label text-green-800 ring-1 ring-green-200 ring-inset"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 max-w-[640px] text-muted">
              {summary || "관련 분야 태그가 곧 공개됩니다."}
            </p>
          )}
        </div>
        <div className="shrink-0 max-sm:w-full">{resources}</div>
      </div>

      <div className="mt-6 border-t border-soft-line pt-5 max-sm:mt-4 max-sm:pt-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((value) => !value)}
          className={buttonClassName({
            variant: "secondary",
            size: "sm",
            fullWidthOnMobile: false,
          })}
        >
          {expanded ? "접기" : "자세히 보기"}
          <ChevronDownIcon
            className={clsx("size-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>

      <div id={bodyId} hidden={!expanded} className="motion-safe:animate-fade">
        {body}
      </div>
    </article>
  );
}
