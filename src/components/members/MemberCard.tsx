import clsx from "clsx";
import type { CSSProperties } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { storagePublicUrl } from "@/lib/storage/public-url";
import { MEMBER_GRADE_LABELS, type Member } from "@/lib/types";

import {
  cardHoverBorderClassName,
  gradeToneClassName,
  positionCardClassName,
  positionToneClassName,
} from "./tones";

/** Directory entry laid out like a name card: picture on the left, name and tags beside it. */
export function MemberCard({
  member,
  onOpen,
  style,
}: {
  member: Member;
  /** Called with the card element, which the profile panel opens out of. */
  onOpen?: (card: HTMLElement) => void;
  style?: CSSProperties;
}) {
  const pill = "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap";

  return (
    <article
      style={style}
      className={clsx(
        "relative flex items-center gap-3 card px-4 py-3.5 max-sm:gap-2.5 max-sm:p-3",
        member.position && positionCardClassName(member.position),
        onOpen && [
          "transition-[border-color,box-shadow] hover:shadow-[0_6px_20px_rgb(29_29_29/0.06)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-500",
          cardHoverBorderClassName(member.position),
        ],
      )}
    >
      <Avatar
        name={member.name}
        src={member.avatarPath ? storagePublicUrl(member.avatarPath) : null}
        className="size-12 text-[1.0625rem] max-sm:size-10 max-sm:text-[0.9375rem]"
      />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <h3 className="flex min-w-0 items-baseline text-[1rem] leading-[1.4] max-sm:flex-col max-sm:items-start max-sm:text-[0.9375rem]">
          {onOpen ? (
            // The button's ::after covers the card, so the whole card opens the profile.
            <button
              type="button"
              onClick={(event) => {
                const card = event.currentTarget.closest("article");
                if (card) onOpen(card);
              }}
              aria-label={`${member.name} 프로필 보기`}
              className="shrink-0 cursor-pointer font-[inherit] tracking-[inherit] after:absolute after:inset-0 after:rounded-card focus-visible:outline-none"
            >
              {member.name}
            </button>
          ) : (
            <span className="shrink-0">{member.name}</span>
          )}
          {member.department ? (
            <span className="truncate text-small font-normal tracking-normal text-muted max-sm:max-w-full max-sm:text-[0.8125rem]">
              <span aria-hidden="true" className="mx-1.5 text-line-strong max-sm:hidden">
                ·
              </span>
              {member.department}
            </span>
          ) : null}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {member.position ? (
            <span className={clsx(pill, positionToneClassName(member.position))}>
              {member.position}
            </span>
          ) : null}
          <span className={clsx(pill, gradeToneClassName[member.grade])}>
            {MEMBER_GRADE_LABELS[member.grade]}
          </span>
        </div>
      </div>
    </article>
  );
}
