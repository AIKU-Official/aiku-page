import Link from "next/link";

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
      className="grid gap-3 rounded-card border border-line bg-surface p-6 transition-[border-color,translate] hover:-translate-y-0.5 hover:border-aiku-green focus-visible:-translate-y-0.5 focus-visible:border-aiku-green max-sm:p-5"
    >
      <span className="text-[0.86rem] font-[850] text-brand">{label}</span>
      <strong className="text-[1.16rem] leading-[1.36] text-ink">{title}</strong>
      <p className="text-muted">{description}</p>
    </Link>
  );
}
