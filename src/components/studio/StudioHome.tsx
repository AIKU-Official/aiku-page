"use client";

import Link from "next/link";

import { getStudioHome } from "@/actions/studio";
import { MyActivity } from "@/components/profile/MyActivity";
import { Notice } from "@/components/ui/Notice";
import { StudioTimeline } from "./StudioTimeline";
import { useMemberAccount } from "@/lib/auth/member";
import { useSignedInData } from "@/lib/auth/signed-in-data";
import { hashForFilter } from "@/lib/projects/filter";

/** Today in Korea as "2026-11-13", the same on every device. */
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

/**
 * The first page of AIKU Studio: what is coming up this semester, the
 * semester's programs, and the member's own attendance. Only 주니어, 시니어
 * and 활동 OB get past the notices.
 */
export function StudioHome() {
  const account = useMemberAccount({ eager: true });
  const member = account?.member?.studio ? account.member : null;
  const [state] = useSignedInData(member?.id, getStudioHome);

  if (account === undefined) {
    return (
      <p role="status" className="text-muted">
        계정을 확인하는 중입니다…
      </p>
    );
  }
  if (account === null) {
    return (
      <Notice action={{ href: "/login", label: "로그인하러 가기" }}>
        AIKU Studio는 로그인한 학회원을 위한 공간입니다.
      </Notice>
    );
  }
  if (!member) {
    return (
      <Notice action={{ href: "/", label: "홈으로 가기" }}>
        AIKU Studio는 주니어, 시니어, 활동 OB 학회원만 이용할 수 있습니다.
      </Notice>
    );
  }
  if (state.status === "loading") {
    return (
      <p role="status" className="text-muted">
        Studio를 불러오는 중입니다…
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-danger">
        {state.message}
      </p>
    );
  }

  const { semester, season, events, counts } = state.data;
  const programs = [
    { label: "DeepIntoDeep", value: counts.deepintodeep, unit: "회" },
    {
      label: "Projects",
      value: counts.projects,
      unit: "개",
      href: `/projects${hashForFilter(season)}`,
    },
    { label: "Momentum", value: counts.momentum, unit: "회" },
    { label: "Seminar", value: counts.seminar, unit: "회" },
  ];

  return (
    <div className="grid gap-10 max-sm:gap-8">
      <StudioTimeline events={events} today={today()} />

      <section className="grid gap-4" aria-labelledby="studio-semester">
        <h2 id="studio-semester" className="text-[1.25rem] font-bold text-ink">
          {semester}학기
        </h2>
        <ul className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
          {programs.map((program) => {
            const body = (
              <>
                <span className="text-label font-semibold tracking-[0.04em] text-muted uppercase">
                  {program.label}
                </span>
                <span className="text-[1.75rem] font-bold text-ink tabular-nums">
                  {program.value}
                  <span className="ml-0.5 text-small font-semibold text-muted">{program.unit}</span>
                </span>
              </>
            );
            const box = "grid gap-2 rounded-[20px] border border-line bg-surface px-5 py-4";
            return (
              <li key={program.label}>
                {program.href ? (
                  <Link
                    href={program.href}
                    className={`${box} transition-colors hover:border-line-strong hover:bg-surface-soft`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={box}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <MyActivity memberId={member.id} />
    </div>
  );
}
