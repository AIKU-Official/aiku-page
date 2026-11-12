"use client";

import Link from "next/link";

import { useMemberAccount } from "@/lib/auth/member";
import type { ProfileLecture } from "@/lib/members/profile";
import { programHref } from "@/lib/studio/programs";
import { sessionAnchor } from "@/lib/studio/timeline";

/**
 * The DeepIntoDeep lectures on a profile. Each opens its session in AIKU
 * Studio, which only Studio members can see, so for anyone else the entries
 * are plain text rather than links that lead to a sign-in notice.
 */
export function LectureList({ lectures }: { lectures: ProfileLecture[] }) {
  const studio = Boolean(useMemberAccount()?.member?.studio);
  return (
    <ul className="divide-y divide-soft-line border-y border-soft-line">
      {lectures.map((lecture) => {
        const body = (
          <>
            <span className="w-16 shrink-0 text-small text-muted tabular-nums">
              {lecture.season}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink underline-offset-4 group-hover:underline">
                {lecture.topic}
              </span>
              <span className="mt-0.5 block text-small text-muted">{lecture.number} 강의</span>
            </span>
          </>
        );
        const row = "group flex flex-wrap items-baseline gap-x-3 gap-y-1 py-4";
        return (
          <li key={`${lecture.season}-${lecture.number}`}>
            {studio ? (
              <Link
                href={`${programHref("deepintodeep", lecture.season)}#${sessionAnchor(lecture.date)}`}
                className={row}
              >
                {body}
              </Link>
            ) : (
              <div className={row}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
