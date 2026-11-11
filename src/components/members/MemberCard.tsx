import clsx from "clsx";
import type { ComponentType, SVGProps } from "react";

import {
  GitHubIcon,
  GlobeIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
} from "@/components/ui/icons";
import { MEMBER_GRADE_LABELS, type Member } from "@/lib/types";

import { gradeToneClassName, positionToneClassName } from "./tones";

type MemberLinkProps = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

function MemberLink({ href, label, Icon }: MemberLinkProps) {
  const isMail = href.startsWith("mailto:");
  return (
    <a
      href={href}
      title={label}
      aria-label={label}
      {...(isMail ? {} : { target: "_blank", rel: "noreferrer" })}
      className="inline-flex size-8 items-center justify-center rounded-full border border-line text-muted transition-[border-color,background-color,color] hover:border-green-200 hover:bg-green-50 hover:text-green-800 max-sm:size-7"
    >
      <Icon className="size-4" />
    </a>
  );
}

/** Directory entry: who the member is at a glance, plus profile extras when they exist. */
export function MemberCard({ member, onOpen }: { member: Member; onOpen?: () => void }) {
  const links: MemberLinkProps[] = [];
  if (member.email) links.push({ href: `mailto:${member.email}`, label: "Mail", Icon: MailIcon });
  if (member.githubUrl) links.push({ href: member.githubUrl, label: "GitHub", Icon: GitHubIcon });
  if (member.instagramUrl) {
    links.push({ href: member.instagramUrl, label: "Instagram", Icon: InstagramIcon });
  }
  if (member.linkedinUrl) {
    links.push({ href: member.linkedinUrl, label: "LinkedIn", Icon: LinkedInIcon });
  }
  if (member.websiteUrl) links.push({ href: member.websiteUrl, label: "Website", Icon: GlobeIcon });

  return (
    <article
      className={clsx(
        "relative flex flex-col gap-2.5 card px-4 py-3.5 max-sm:gap-2 max-sm:p-3",
        onOpen &&
          "transition-[border-color,box-shadow] focus-within:border-green-200 hover:border-green-200 hover:shadow-[0_6px_20px_rgb(29_29_29/0.06)]",
      )}
    >
      <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1.5">
        <h3 className="flex min-w-0 items-baseline text-[1rem] leading-[1.4] max-sm:text-[0.9375rem]">
          {onOpen ? (
            // The button's ::after covers the card, so the whole card opens the profile.
            <button
              type="button"
              onClick={onOpen}
              aria-label={`${member.name} 프로필 보기`}
              className="shrink-0 cursor-pointer font-[inherit] tracking-[inherit] after:absolute after:inset-0 after:rounded-card focus-visible:outline-none"
            >
              {member.name}
            </button>
          ) : (
            <span className="shrink-0">{member.name}</span>
          )}
          {member.department ? (
            <span className="truncate text-small font-normal tracking-normal text-muted">
              <span aria-hidden="true" className="mx-1.5 text-line-strong">
                ·
              </span>
              {member.department}
            </span>
          ) : null}
        </h3>
        {member.position ? (
          <span
            className={clsx(
              "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap",
              positionToneClassName(member.position),
            )}
          >
            {member.position}
          </span>
        ) : null}
      </div>
      <span
        className={clsx(
          "inline-flex h-6 items-center self-start rounded-full px-2.5 text-label",
          gradeToneClassName[member.grade],
        )}
      >
        {MEMBER_GRADE_LABELS[member.grade]}
      </span>
      {member.summary ? <p className="text-small text-muted">{member.summary}</p> : null}
      {links.length ? (
        <div className="relative mt-auto flex flex-wrap gap-1.5 self-start">
          {links.map((link) => (
            <MemberLink key={link.label} {...link} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
