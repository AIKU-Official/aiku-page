import clsx from "clsx";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Right-aligned content such as the admin logout button. */
  aside?: ReactNode;
  /**
   * Tinted with the colour in scope (a program's accent, globals.css) instead
   * of grey, with the faint wordmark in white.
   */
  accent?: boolean;
};

export function PageHero({ eyebrow, title, lead, aside, accent }: PageHeroProps) {
  return (
    // On wider screens the minimum height fits a two-line title with a two-line
    // lead, so the line under the hero sits at the same place on every page.
    // On phones the hero is as tall as its text plus the padding.
    <section
      className={clsx(
        "page-hero-watermark relative min-h-[412px] overflow-hidden border-b border-soft-line max-lg:min-h-[335px] max-sm:min-h-0",
        accent ? "page-hero-accent" : "bg-linear-to-b from-white to-surface-soft",
      )}
    >
      <div
        className={clsx(
          "relative z-1 site-container pt-28 pb-20 max-lg:pt-20 max-lg:pb-14 max-sm:pt-10 max-sm:pb-10",
          aside && "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-8 max-lg:grid-cols-1",
        )}
      >
        <div>
          <div className="enter-0">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
          <h1 className="max-w-[780px] enter-1 text-title">{title}</h1>
          {lead ? (
            <p className="mt-5 max-w-[680px] enter-2 text-lead text-muted max-sm:mt-3">{lead}</p>
          ) : null}
        </div>
        {aside ? <div className="enter-3">{aside}</div> : null}
      </div>
    </section>
  );
}
