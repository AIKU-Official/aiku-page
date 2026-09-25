import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";

type SectionProps = ComponentProps<"section"> & {
  /** Tinted background with top/bottom borders (legacy .section--soft). */
  soft?: boolean;
};

export function Section({ soft, className, ...props }: SectionProps) {
  return (
    <section
      className={clsx(
        "py-[72px] max-lg:py-14",
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
  children?: ReactNode;
};

export function SectionHead({ eyebrow, title, titleId, children }: SectionHeadProps) {
  return (
    <div className="mb-6 max-w-[620px]">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={titleId}>{title}</h2>
      {children}
    </div>
  );
}
