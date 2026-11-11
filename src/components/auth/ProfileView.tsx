"use client";

import clsx from "clsx";

import { Avatar } from "@/components/layout/AccountMenu";
import { gradeToneClassName, positionToneClassName } from "@/components/members/tones";
import { ButtonLink } from "@/components/ui/Button";
import { useMemberAccount } from "@/lib/auth/member";
import { MEMBER_GRADE_LABELS } from "@/lib/types";

const providerLabels: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  email: "AIKU",
};
const pillClassName =
  "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap";

/** The signed-in member's own profile. */
export function ProfileView() {
  const account = useMemberAccount({ eager: true });

  if (account === undefined) {
    return (
      <p role="status" className="text-muted">
        계정을 확인하는 중입니다…
      </p>
    );
  }

  if (account === null) {
    return (
      <div className="grid w-full max-w-[520px] gap-4 card p-7 max-sm:p-5">
        <p className="text-muted">프로필은 로그인한 뒤에 볼 수 있습니다.</p>
        <div>
          <ButtonLink href="/login" variant="dark" size="sm">
            로그인하러 가기
          </ButtonLink>
        </div>
      </div>
    );
  }

  const { member } = account;
  const rows: [string, string][] = [
    ["기수", member?.generation ?? ""],
    ["학과", member?.department ?? ""],
    ["아이디", account.loginId ?? ""],
    ["이메일", account.email ?? ""],
    ["로그인 계정", account.provider ? (providerLabels[account.provider] ?? account.provider) : ""],
  ];

  return (
    <div className="grid w-full max-w-[640px] gap-6 card p-7 max-sm:p-5">
      <div className="flex items-center gap-4">
        <Avatar account={account} className="size-16 text-[1.5rem] max-sm:size-14" />
        <div className="grid min-w-0 gap-1.5">
          <h2 className="truncate text-subheading">{account.name}</h2>
          {member ? (
            <div className="flex flex-wrap gap-1.5">
              {member.position ? (
                <span className={clsx(pillClassName, positionToneClassName(member.position))}>
                  {member.position}
                </span>
              ) : null}
              <span className={clsx(pillClassName, gradeToneClassName[member.grade])}>
                {MEMBER_GRADE_LABELS[member.grade]}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-0 border-t border-soft-line">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="flex gap-4 border-b border-soft-line py-3 text-small">
              <dt className="w-24 shrink-0 text-muted">{label}</dt>
              <dd className="min-w-0 break-words text-ink">{value}</dd>
            </div>
          ))}
      </dl>

      {member ? null : (
        <div className="grid gap-3">
          <p className="text-small text-body">
            {account.pending
              ? "회원 등록 요청이 운영진의 승인을 기다리고 있습니다."
              : "아직 회원 명단과 연결되지 않은 계정입니다."}
          </p>
          <div>
            <ButtonLink href="/login/register" variant="dark" size="sm">
              회원 등록 {account.pending ? "다시 하기" : "계속하기"}
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
