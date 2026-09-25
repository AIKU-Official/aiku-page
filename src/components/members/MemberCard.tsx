import Image from "next/image";
import type { ReactNode } from "react";

import { storagePublicUrl } from "@/lib/storage/public-url";
import type { Member } from "@/lib/types";

const iconClassName =
  "size-[18px] fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]";
const filledIconClassName = "size-[18px] fill-current stroke-none";

const icons: Record<"mail" | "github" | "linkedin" | "website", ReactNode> = {
  mail: (
    <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16v12H4z" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
  github: (
    <svg className={filledIconClassName} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.73c-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.03 0-1.11.39-2.02 1.03-2.73-.1-.26-.45-1.29.1-2.69 0 0 .84-.28 2.75 1.04A9.3 9.3 0 0 1 12 6.83c.85 0 1.7.12 2.5.34 1.9-1.32 2.74-1.04 2.74-1.04.55 1.4.2 2.43.1 2.69.65.71 1.03 1.62 1.03 2.73 0 3.9-2.34 4.76-4.57 5.02.36.32.68.94.68 1.9v2.54c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  ),
  linkedin: (
    <svg className={filledIconClassName} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.8 9.5h3v9.7h-3V9.5Zm1.5-4.8a1.74 1.74 0 1 1 0 3.48 1.74 1.74 0 0 1 0-3.48Zm3.6 4.8h2.88v1.33h.04c.4-.76 1.38-1.57 2.84-1.57 3.04 0 3.6 2 3.6 4.6v5.34h-3v-4.74c0-1.13-.02-2.58-1.57-2.58-1.57 0-1.81 1.23-1.81 2.5v4.82h-3V9.5Z" />
    </svg>
  ),
  website: (
    <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.3 2.45 3.45 5.45 3.45 9S14.3 18.55 12 21" />
      <path d="M12 3c-2.3 2.45-3.45 5.45-3.45 9S9.7 18.55 12 21" />
    </svg>
  ),
};

function MemberLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: keyof typeof icons;
}) {
  const isMail = href.startsWith("mailto:");
  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      {...(isMail ? {} : { target: "_blank", rel: "noreferrer" })}
      className="relative inline-flex size-9 items-center justify-center rounded-card border border-line bg-surface text-body transition-[border-color,background-color,color,translate] hover:-translate-y-px hover:border-aiku-green hover:bg-surface-mint hover:text-[#087a5f] focus-visible:-translate-y-px focus-visible:border-aiku-green focus-visible:bg-surface-mint focus-visible:text-[#087a5f]"
    >
      {icons[icon]}
      <span className="sr-only">{label}</span>
    </a>
  );
}

export function MemberCard({ member }: { member: Member }) {
  const links = [
    member.email && { href: `mailto:${member.email}`, label: "Mail", icon: "mail" as const },
    member.githubUrl && { href: member.githubUrl, label: "GitHub", icon: "github" as const },
    member.linkedinUrl && {
      href: member.linkedinUrl,
      label: "LinkedIn",
      icon: "linkedin" as const,
    },
    member.websiteUrl && { href: member.websiteUrl, label: "Website", icon: "website" as const },
  ].filter((link) => !!link);

  return (
    <article className="grid grid-rows-[auto_1fr] gap-3.5 rounded-card border border-line bg-surface p-[18px]">
      {member.photoPath ? (
        <Image
          src={storagePublicUrl(member.photoPath)}
          alt={`${member.name} 프로필`}
          width={84}
          height={84}
          className="size-[84px] rounded-full bg-surface-soft object-cover"
        />
      ) : (
        <div className="inline-flex size-[84px] items-center justify-center rounded-full bg-surface-mint text-[1.8rem] font-black text-brand-deep">
          {member.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="grid content-start gap-2.5">
        <h3 className="text-[1.1rem] text-ink">{member.name}</h3>
        {member.summary ? (
          <p className="text-[0.92rem] leading-[1.55] text-muted">{member.summary}</p>
        ) : null}
        {links.length ? (
          <div className="mt-1 grid grid-cols-[repeat(4,36px)] gap-2">
            {links.map((link) => (
              <MemberLink key={link.label} {...link} />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
