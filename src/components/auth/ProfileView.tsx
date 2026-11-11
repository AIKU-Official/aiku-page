"use client";

import { ProfileContent } from "@/components/profile/ProfileContent";
import { useMyProfile } from "@/components/profile/useMyProfile";
import { ButtonLink } from "@/components/ui/Button";
import { useMemberAccount } from "@/lib/auth/member";

const providerLabels: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  email: "AIKU",
};

function Notice({
  children,
  action,
}: {
  children: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="mx-auto grid w-full max-w-[520px] gap-4 card p-7 max-sm:p-5">
      <p className="text-muted">{children}</p>
      <div>
        <ButtonLink href={action.href} variant="dark" size="sm">
          {action.label}
        </ButtonLink>
      </div>
    </div>
  );
}

/** The signed-in member's own profile, with the way in to editing it. */
export function ProfileView() {
  const account = useMemberAccount({ eager: true });
  const [state] = useMyProfile(account);

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
        프로필은 로그인한 뒤에 볼 수 있습니다.
      </Notice>
    );
  }
  if (!account.member) {
    return (
      <Notice
        action={{
          href: "/login/register",
          label: `회원 등록 ${account.pending ? "다시 하기" : "계속하기"}`,
        }}
      >
        {account.pending
          ? "회원 등록 요청이 운영진의 승인을 기다리고 있습니다. 학회원으로 확인되면 프로필을 만들 수 있습니다."
          : "아직 회원 명단과 연결되지 않은 계정입니다. 학회원으로 확인되면 프로필을 만들 수 있습니다."}
      </Notice>
    );
  }
  if (state.status === "loading") {
    return (
      <p role="status" className="text-muted">
        프로필을 불러오는 중입니다…
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

  const { subject, profile } = state.page;
  const signIn = [
    account.loginId ? `아이디 ${account.loginId}` : account.email,
    account.provider ? `${providerLabels[account.provider] ?? account.provider} 계정` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="grid gap-10 max-sm:gap-8">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-soft-line pb-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-muted">
          <span
            className={
              profile.isPublic
                ? "inline-flex h-6 items-center rounded-full bg-green-100 px-2.5 text-label text-green-800"
                : "inline-flex h-6 items-center rounded-full bg-surface-soft px-2.5 text-label text-body"
            }
          >
            {profile.isPublic ? "공개 중" : "비공개"}
          </span>
          {profile.isPublic
            ? "Members 페이지에서 내 카드를 누르면 누구나 이 프로필을 볼 수 있습니다."
            : "지금은 나만 볼 수 있습니다."}
        </p>
        <ButtonLink href="/profile/edit" variant="dark" size="sm">
          프로필 수정
        </ButtonLink>
      </div>

      <ProfileContent
        subject={subject}
        profile={profile}
        fallbackAvatarUrl={account.providerAvatarUrl}
        emptyNote={
          <div className="grid justify-items-start gap-4 rounded-card bg-surface-soft p-7 max-sm:p-5">
            <p className="text-body">
              아직 작성한 내용이 없습니다. 소개, 관심 분야, 경력을 채워 나만의 프로필을
              만들어보세요.
            </p>
            <ButtonLink href="/profile/edit" variant="secondary" size="sm">
              프로필 작성하기
            </ButtonLink>
          </div>
        }
      />

      {signIn ? (
        <p className="border-t border-soft-line pt-5 text-small text-muted">
          로그인 계정: {signIn}
        </p>
      ) : null}
    </div>
  );
}
