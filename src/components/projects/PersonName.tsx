"use client";

import clsx from "clsx";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { gradeToneClassName, positionToneClassName } from "@/components/members/tones";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { Avatar } from "@/components/ui/Avatar";
import { storagePublicUrl } from "@/lib/storage/public-url";
import { MEMBER_GRADE_LABELS, type ProjectPerson } from "@/lib/types";
import { pillClassName as pill } from "@/components/ui/Pill";
import { isPhone } from "@/lib/ui/viewport";
import { useMemberAccount } from "@/lib/auth/member";
import { CursorTip, useCursorPoint } from "@/components/ui/CursorTip";


/**
 * A participant's name. For roster members, hovering shows their name card
 * beside the cursor and, when their profile is public (or the viewer is an
 * admin), a click opens it.
 */
export function PersonName({ person }: { person: ProjectPerson }) {
  const { point, follow, hide } = useCursorPoint();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const member = person.member;
  const router = useRouter();
  const admin = Boolean(useMemberAccount()?.admin);

  if (!member) return <span>{person.name}</span>;

  // Admins (current officers) can open every profile, private ones included.
  const openable = member.hasPublicProfile || admin;

  const className = clsx(
    "rounded-sm underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:text-ink",
    openable ? "cursor-pointer" : "cursor-default",
  );
  const hover = { onMouseEnter: follow, onMouseMove: follow, onMouseLeave: hide };

  return (
    <>
      {openable ? (
        <button
          type="button"
          className={className}
          aria-label={`${person.name} 프로필 보기`}
          onClick={(event) => {
            event.stopPropagation();
            hide();
            // Phones open the profile's page, as member cards do.
            if (isPhone()) {
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
      {point ? (
            <CursorTip
              point={point}
              className="flex w-[270px] items-center gap-3 card px-4 py-3.5 shadow-[0_12px_32px_rgb(29_29_29/0.14)]"
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
            </CursorTip>
      ) : null}
      {open ? <ProfileModal memberId={member.id} onClose={close} /> : null}
    </>
  );
}
