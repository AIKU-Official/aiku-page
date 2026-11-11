import clsx from "clsx";
import type { ComponentType, ReactNode, SVGProps } from "react";

import { gradeToneClassName, positionToneClassName } from "@/components/members/tones";
import { Avatar } from "@/components/ui/Avatar";
import {
  GitHubIcon,
  GlobeIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
} from "@/components/ui/icons";
import type { MemberProfile, ProfileSubject } from "@/lib/members/profile";
import { storagePublicUrl } from "@/lib/storage/public-url";
import { MEMBER_GRADE_LABELS } from "@/lib/types";

const pillClassName =
  "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap";

function IconLink({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className="inline-flex size-10 items-center justify-center rounded-full border border-line text-body transition-[border-color,background-color,color] hover:border-green-200 hover:bg-green-50 hover:text-green-800"
    >
      <Icon className="size-[18px]" />
    </a>
  );
}

function SideLabel({ children }: { children: ReactNode }) {
  return <p className="text-eyebrow text-green-700 uppercase">{children}</p>;
}

function MainSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 max-sm:gap-4">
      <h3 className="text-heading">{title}</h3>
      {children}
    </section>
  );
}

/**
 * A member's profile: who they are on the left, what they wrote on the right.
 * Used for the member's own page and for the public view opened from a card.
 */
export function ProfileContent({
  subject,
  profile,
}: {
  subject: ProfileSubject;
  profile: MemberProfile;
}) {
  const links = [
    { href: profile.githubUrl, label: "GitHub", Icon: GitHubIcon },
    { href: profile.instagramUrl, label: "Instagram", Icon: InstagramIcon },
    { href: profile.linkedinUrl, label: "LinkedIn", Icon: LinkedInIcon },
    { href: profile.websiteUrl, label: "Website", Icon: GlobeIcon },
  ].filter((link): link is typeof link & { href: string } => Boolean(link.href));

  return (
    <div className="grid grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-14 max-lg:grid-cols-1 max-lg:gap-10">
      <aside className="grid content-start gap-7">
        <div className="grid gap-4">
          <Avatar
            name={subject.name}
            src={profile.avatarPath ? storagePublicUrl(profile.avatarPath) : null}
            className="size-40 text-[3.25rem] max-sm:size-28 max-sm:text-[2.25rem]"
          />
          <div className="grid gap-2">
            <h2 className="text-title">{subject.name}</h2>
            <div className="flex flex-wrap gap-1.5">
              {subject.position ? (
                <span className={clsx(pillClassName, positionToneClassName(subject.position))}>
                  {subject.position}
                </span>
              ) : null}
              <span className={clsx(pillClassName, gradeToneClassName[subject.grade])}>
                {MEMBER_GRADE_LABELS[subject.grade]}
              </span>
              <span className={clsx(pillClassName, "bg-surface-soft text-body")}>
                {subject.generation}
              </span>
            </div>
          </div>
          <div className="grid gap-1">
            {profile.headline ? (
              <p className="font-medium whitespace-pre-line text-ink">{profile.headline}</p>
            ) : null}
            <p className="text-small text-muted">
              {[profile.tagline, subject.department].filter(Boolean).join(" · ")}
            </p>
          </div>
          {profile.contactEmail || links.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {profile.contactEmail ? (
                <a
                  href={`mailto:${profile.contactEmail}`}
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-small font-semibold text-white transition-opacity hover:opacity-85"
                >
                  <MailIcon className="size-4" />
                  Email
                </a>
              ) : null}
              {links.map((link) => (
                <IconLink key={link.label} {...link} />
              ))}
            </div>
          ) : null}
        </div>

        {profile.focus.length ? (
          <div className="grid gap-3 rounded-card bg-surface-soft p-5">
            <SideLabel>Focus</SideLabel>
            <ul className="flex flex-wrap gap-1.5">
              {profile.focus.map((tag) => (
                <li
                  key={tag}
                  className="inline-flex min-h-7 items-center rounded-full border border-soft-line bg-surface px-3 text-small text-ink"
                >
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {profile.skills.length ? (
          <div className="grid gap-4">
            <SideLabel>Skills</SideLabel>
            <dl className="grid gap-4">
              {profile.skills.map((skill, index) => (
                <div key={index} className="grid gap-0.5">
                  <dt className="text-small text-muted">{skill.label}</dt>
                  <dd className="whitespace-pre-line text-ink">{skill.items}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </aside>

      <div className="grid content-start gap-14 max-lg:gap-10">
        {profile.bio ? (
          <MainSection title="About">
            <p className="max-w-[68ch] text-lead whitespace-pre-line text-body">{profile.bio}</p>
          </MainSection>
        ) : null}

        {profile.interests.length ? (
          <MainSection title="Interests">
            <ul className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
              {profile.interests.map((interest, index) => (
                <li
                  key={index}
                  className="grid content-start gap-2 rounded-card bg-surface-soft p-6"
                >
                  <span className="text-label text-green-700 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4 className="text-subheading">{interest.title}</h4>
                  {interest.description ? (
                    <p className="text-small whitespace-pre-line text-muted">
                      {interest.description}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </MainSection>
        ) : null}

        {profile.experience.length ? (
          <MainSection title="Experience">
            <ul className="divide-y divide-soft-line border-y border-soft-line">
              {profile.experience.map((item, index) => (
                <li key={index} className="grid gap-1 py-5">
                  {item.period ? (
                    <span className="text-small text-muted">{item.period}</span>
                  ) : null}
                  <h4 className="text-subheading">{item.title}</h4>
                  {item.organization ? <p className="text-body">{item.organization}</p> : null}
                </li>
              ))}
            </ul>
          </MainSection>
        ) : null}
      </div>
    </div>
  );
}
