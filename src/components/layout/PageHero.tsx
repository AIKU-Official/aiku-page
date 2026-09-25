import clsx from "clsx";
import type { ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Right-aligned content such as the admin logout button. */
  aside?: ReactNode;
};

export function PageHero({ eyebrow, title, lead, aside }: PageHeroProps) {
  return (
    <section className="page-hero-watermark relative overflow-hidden border-b border-soft-line bg-linear-to-b from-white to-surface-soft">
      <div
        className={clsx(
          "relative z-1 site-container pt-28 pb-20 max-lg:pt-20 max-lg:pb-14 max-sm:pt-11 max-sm:pb-8",
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
