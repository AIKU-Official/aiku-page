"use client";

import { useState } from "react";

import { StatusMessage, type Status } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { GitHubIcon, GoogleIcon } from "@/components/ui/icons";
import { useMemberAccount } from "@/lib/auth/member";
import { getAuthClient, type MemberAuthProvider } from "@/lib/supabase/auth-client";

const providers: { id: MemberAuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Google로 계속하기", icon: <GoogleIcon className="size-[18px]" /> },
  { id: "github", label: "GitHub로 계속하기", icon: <GitHubIcon className="size-[18px]" /> },
];

const providerLabels: Record<string, string> = { google: "Google", github: "GitHub" };

export function MemberLogin({ error }: { error?: string }) {
  const account = useMemberAccount({ eager: true });
  const [status, setStatus] = useState<Status>(
    error ? { tone: "error", message: "로그인하지 못했습니다. 다시 시도해주세요." } : null,
  );
  const [pending, setPending] = useState(false);

  const signIn = async (provider: MemberAuthProvider) => {
    setPending(true);
    setStatus({ tone: "info", message: "로그인 페이지로 이동하는 중입니다." });
    const { error: signInError } = await getAuthClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/login/callback` },
    });
    if (signInError) {
      setPending(false);
      setStatus({
        tone: "error",
        message: "로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  };

  const signOut = async () => {
    setPending(true);
    await getAuthClient().auth.signOut();
    setPending(false);
    setStatus({ tone: "success", message: "로그아웃했습니다." });
  };

  return (
    <div className="grid w-full max-w-[520px] gap-5 card p-7 max-sm:p-5">
      {account ? (
        <>
          <div>
            <h2 className="text-subheading">{account.name}</h2>
            <p className="mt-1 text-small text-muted">
              {[account.email, account.provider && providerLabels[account.provider]]
                .filter(Boolean)
                .join(" · ")}
              {" 계정으로 로그인되어 있습니다."}
            </p>
          </div>
          {account.member ? (
            <p className="text-small text-body">
              {account.member.generation} {account.member.name} 회원으로 등록되어 있습니다.
            </p>
          ) : (
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
          <StatusMessage status={status} />
          <Button variant="secondary" disabled={pending} onClick={signOut}>
            로그아웃
          </Button>
        </>
      ) : (
        <>
          <div>
            <h2 className="text-subheading">회원 로그인</h2>
            <p className="mt-1 text-small text-muted">
              Google 또는 GitHub 계정으로 로그인합니다. 처음 로그인하면 계정이 자동으로
              만들어집니다.
            </p>
          </div>
          <div className="grid gap-2.5">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                variant="secondary"
                disabled={pending || account === undefined}
                onClick={() => signIn(provider.id)}
              >
                {provider.icon}
                {provider.label}
              </Button>
            ))}
          </div>
          <StatusMessage status={status} />
        </>
      )}
    </div>
  );
}
