"use client";

import clsx from "clsx";
import { useCallback, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { gradeToneClassName, positionToneClassName } from "@/components/members/tones";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { Avatar } from "@/components/ui/Avatar";
import { storagePublicUrl } from "@/lib/storage/public-url";
import { MEMBER_GRADE_LABELS, type ProjectPerson } from "@/lib/types";

const pill = "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap";
const CARD_WIDTH = 270;

/**
 * A participant's name. For roster members, hovering shows their name card
 * beside the cursor and, when their profile is public, a click opens it.
 */
export function PersonName({ person }: { person: ProjectPerson }) {
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const member = person.member;
  const router = useRouter();

  if (!member) return <span>{person.name}</span>;

  const follow = (event: MouseEvent) => {
    // Kept inside the window: flips to the left of the cursor near the right edge.
    const x =
      event.clientX + 18 + CARD_WIDTH > window.innerWidth
        ? event.clientX - 18 - CARD_WIDTH
        : event.clientX + 18;
    setPoint({ x: Math.max(8, x), y: Math.min(event.clientY + 18, window.innerHeight - 110) });
  };

  const className = clsx(
    "rounded-sm underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:text-ink",
    member.hasPublicProfile ? "cursor-pointer" : "cursor-default",
  );
  const hover = { onMouseEnter: follow, onMouseMove: follow, onMouseLeave: () => setPoint(null) };

  return (
    <>
      {member.hasPublicProfile ? (
        <button
          type="button"
          className={className}
          aria-label={`${person.name} 프로필 보기`}
          onClick={(event) => {
            event.stopPropagation();
            setPoint(null);
            // Phones open the profile's page, as member cards do.
            if (window.matchMedia("(width < 561px)").matches) {
              router.push(`/members/${member.id}`);
              return;
            }
            setOpen(true);
          }}
          {...hover}
        >
          {person.name}
        </button>
      ) : (
        <span className={className} {...hover}>
          {person.name}
        </span>
      )}
      {point
        ? createPortal(
            <div
              aria-hidden="true"
              style={{ left: point.x, top: point.y, width: CARD_WIDTH }}
              className="pointer-events-none fixed z-50 flex items-center gap-3 card px-4 py-3.5 shadow-[0_12px_32px_rgb(29_29_29/0.14)]"
            >
              <Avatar
                name={member.name}
                src={member.avatarPath ? storagePublicUrl(member.avatarPath) : null}
                className="size-12"
              />
              <div className="grid min-w-0 gap-1.5">
                <p className="flex min-w-0 items-baseline">
                  <span className="shrink-0 font-semibold text-ink">{member.name}</span>
                  {member.department ? (
                    <span className="truncate text-small text-muted">
                      <span className="mx-1.5 text-line-strong">·</span>
                      {member.department}
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {member.position ? (
                    <span className={clsx(pill, positionToneClassName(member.position))}>
                      {member.position}
                    </span>
                  ) : null}
                  <span className={clsx(pill, gradeToneClassName[member.grade])}>
                    {MEMBER_GRADE_LABELS[member.grade]}
                  </span>
                  <span className={clsx(pill, "bg-surface-soft text-body")}>
                    {member.generation}
                  </span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {open ? <ProfileModal memberId={member.id} onClose={close} /> : null}
    </>
  );
}
