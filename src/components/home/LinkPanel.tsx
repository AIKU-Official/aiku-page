import clsx from "clsx";
import Link from "next/link";

import { ArrowRightIcon } from "@/components/ui/icons";

type LinkPanelProps = {
  href: string;
  label: string;
  title: string;
  description: string;
  /** Grid placement only; the panel sets its own look. */
  className?: string;
};

export function LinkPanel({ href, label, title, description, className }: LinkPanelProps) {
  return (
    <Link
      href={href}
      className={clsx(
        "group flex card-interactive reveal flex-col gap-3 card p-7 max-sm:gap-1.5 max-sm:p-5",
        className,
      )}
    >
      <span className="flex items-center justify-between">
        <span className="text-eyebrow text-green-700 uppercase">{label}</span>
        <ArrowRightIcon className="size-5 text-line-strong transition-[translate,color] group-hover:translate-x-1 group-hover:text-green-700" />
      </span>
      <strong className="text-subheading text-ink">{title}</strong>
      <p className="text-muted max-sm:text-small">{description}</p>
    </Link>
  );
}
