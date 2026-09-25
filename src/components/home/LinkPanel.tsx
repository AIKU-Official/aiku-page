import Link from "next/link";

import { ArrowRightIcon } from "@/components/ui/icons";

type LinkPanelProps = {
  href: string;
  label: string;
  title: string;
  description: string;
};

export function LinkPanel({ href, label, title, description }: LinkPanelProps) {
  return (
    <Link
      href={href}
      className="group flex card-interactive reveal flex-col gap-3 card p-7 max-sm:gap-1.5 max-sm:p-5"
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
