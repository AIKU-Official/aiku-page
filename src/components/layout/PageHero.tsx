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
    <section className="page-hero-watermark relative overflow-hidden border-b border-soft-line bg-linear-to-b from-white to-[#f8fbfa]">
      <div
        className={clsx(
          "relative z-1 site-container pt-24 pb-[72px] max-lg:pt-[72px] max-lg:pb-14",
          aside && "grid grid-cols-[minmax(0,1fr)_auto] items-end gap-7 max-lg:grid-cols-1",
        )}
      >
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="max-w-[760px] text-[2.65rem] leading-[1.22] font-[850] text-ink max-lg:text-[2.15rem] max-sm:text-[1.9rem]">
            {title}
          </h1>
          {lead ? (
            <p className="mt-5 max-w-[720px] text-[1.08rem] font-medium text-muted">{lead}</p>
          ) : null}
        </div>
        {aside}
      </div>
    </section>
  );
}
