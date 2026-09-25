import Image from "next/image";
import type { ComponentType, SVGProps } from "react";

import { GitHubIcon, GlobeIcon, LinkedInIcon, MailIcon } from "@/components/ui/icons";
import { storagePublicUrl } from "@/lib/storage/public-url";
import type { Member } from "@/lib/types";

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
      className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted transition-[border-color,background-color,color] hover:border-green-200 hover:bg-green-50 hover:text-green-800 max-sm:size-7"
    >
      <Icon className="size-[18px] max-sm:size-4" />
    </a>
  );
}

export function MemberCard({ member }: { member: Member }) {
  const links: MemberLinkProps[] = [];
  if (member.email) links.push({ href: `mailto:${member.email}`, label: "Mail", Icon: MailIcon });
  if (member.githubUrl) links.push({ href: member.githubUrl, label: "GitHub", Icon: GitHubIcon });
  if (member.linkedinUrl) {
    links.push({ href: member.linkedinUrl, label: "LinkedIn", Icon: LinkedInIcon });
  }
  if (member.websiteUrl) links.push({ href: member.websiteUrl, label: "Website", Icon: GlobeIcon });

  return (
    <article className="flex reveal flex-col gap-5 card p-6 max-sm:gap-3 max-sm:p-3.5">
      {member.photoPath ? (
        <Image
          src={storagePublicUrl(member.photoPath)}
          alt={`${member.name} 프로필`}
          width={80}
          height={80}
          className="size-20 rounded-full bg-surface-soft object-cover ring-4 ring-green-50 max-sm:size-14"
        />
      ) : (
        <div
          aria-hidden="true"
          className="inline-flex size-20 items-center justify-center rounded-full bg-green-100 text-[1.75rem] font-extrabold text-green-800 ring-4 ring-green-50 max-sm:size-14 max-sm:text-xl"
        >
          {member.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 max-sm:gap-1">
        <h3 className="max-sm:text-[0.9375rem]">{member.name}</h3>
        {member.summary ? <p className="text-small text-muted">{member.summary}</p> : null}
        {links.length ? (
          <div className="mt-auto flex flex-wrap gap-2 pt-2 max-sm:gap-1">
            {links.map((link) => (
              <MemberLink key={link.label} {...link} />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
