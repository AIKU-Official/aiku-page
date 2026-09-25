import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";

type SectionProps = ComponentProps<"section"> & {
  /** Tinted background with top/bottom borders. */
  soft?: boolean;
};

export function Section({ soft, className, ...props }: SectionProps) {
  return (
    <section
      className={clsx(
        "py-24 max-lg:py-16 max-sm:py-11",
        soft && "border-y border-soft-line bg-surface-soft",
        className,
      )}
      {...props}
    />
  );
}

type SectionHeadProps = {
  eyebrow: string;
  title: ReactNode;
  titleId?: string;
  /** Short description under the title. */
  children?: ReactNode;
};

export function SectionHead({ eyebrow, title, titleId, children }: SectionHeadProps) {
  return (
    <div className="mb-10 max-w-[640px] reveal max-lg:mb-8 max-sm:mb-5">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={titleId}>{title}</h2>
      {children ? (
        <div className="mt-3 text-muted max-sm:mt-2 max-sm:text-small">{children}</div>
      ) : null}
    </div>
  );
}
