"use client";

import Link from "next/link";

import { getStudioHome, type StudioEvent } from "@/actions/studio";
import { MyActivity } from "@/components/profile/MyActivity";
import { Notice } from "@/components/ui/Notice";
import { Pill } from "@/components/ui/Pill";
import { formatDay, SESSION_KIND_LABELS } from "@/lib/activity/calendar";
import { useMemberAccount } from "@/lib/auth/member";
import { useSignedInData } from "@/lib/auth/signed-in-data";
import { hashForFilter } from "@/lib/projects/filter";

const KIND_LABELS: Record<StudioEvent["kind"], string> = {
  ...SESSION_KIND_LABELS,
  aikuthon: "AIKUTHON",
};
const UPCOMING = 8;

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
  const now = today();
  const upcoming = events.filter((event) => event.date >= now).slice(0, UPCOMING);
  const programs = [
    { label: "프로젝트", value: `${counts.projects}개`, href: `/projects${hashForFilter(season)}` },
    { label: "DeepIntoDeep", value: `${counts.deepintodeep}회` },
    { label: "모멘텀", value: `${counts.momentum}회` },
    { label: "세미나", value: `${counts.seminar}회` },
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] items-start gap-12 max-lg:grid-cols-1 max-lg:gap-10">
      <section className="grid gap-4" aria-labelledby="studio-upcoming">
        <h2 id="studio-upcoming" className="text-heading">
          다가오는 일정
        </h2>
        {upcoming.length ? (
          <ol className="grid divide-y divide-soft-line rounded-[20px] border border-line bg-surface">
            {upcoming.map((event) => (
              <li
                key={`${event.date}-${event.title}`}
                className="grid grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-4 px-5 py-4 max-sm:grid-cols-1 max-sm:gap-1 max-sm:px-4"
              >
                <span className="text-small font-semibold text-ink tabular-nums">
                  {formatDay(event.date)}
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <Pill>{KIND_LABELS[event.kind]}</Pill>
                  <span className="min-w-0 truncate text-body">{event.title}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-[20px] border border-line bg-surface-soft px-5 py-6 text-center text-small text-muted">
            {semester}학기에 남은 일정이 없습니다.
          </p>
        )}
      </section>

      <div className="grid gap-8">
        <section className="grid gap-4" aria-labelledby="studio-semester">
          <h2 id="studio-semester" className="text-heading">
            {semester}학기 활동
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {programs.map((program) => {
              const body = (
                <>
                  <span className="text-small text-muted">{program.label}</span>
                  <span className="text-[1.375rem] font-bold text-ink tabular-nums">
                    {program.value}
                  </span>
                </>
              );
              return (
                <li key={program.label}>
                  {program.href ? (
                    <Link
                      href={program.href}
                      className="grid gap-1 rounded-[20px] border border-line bg-surface px-5 py-4 transition-colors hover:border-line-strong hover:bg-surface-soft"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="grid gap-1 rounded-[20px] border border-line bg-surface px-5 py-4">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <MyActivity memberId={member.id} />
      </div>
    </div>
  );
}
