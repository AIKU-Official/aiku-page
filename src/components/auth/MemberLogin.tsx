"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { StatusMessage, TextField, type Status } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { GitHubIcon, GoogleIcon } from "@/components/ui/icons";
import { loginIdToEmail } from "@/lib/auth/login-id";
import { loadMembership, useMemberAccount } from "@/lib/auth/member";
import {
  getAuthClient,
  getRememberMember,
  setRememberMember,
  subscribeRememberMember,
  type MemberAuthProvider,
} from "@/lib/supabase/auth-client";

const providers: { id: MemberAuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Google로 계속하기", icon: <GoogleIcon className="size-[18px]" /> },
  { id: "github", label: "GitHub로 계속하기", icon: <GitHubIcon className="size-[18px]" /> },
];

const providerLabels: Record<string, string> = {
  google: "Google",
  github: "GitHub",
  email: "AIKU",
};

export function MemberLogin({ error }: { error?: string }) {
  const account = useMemberAccount({ eager: true });
  const [status, setStatus] = useState<Status>(
    error ? { tone: "error", message: "로그인하지 못했습니다. 다시 시도해주세요." } : null,
  );
  const [pending, setPending] = useState(false);
  const router = useRouter();
  // "자동 로그인": on keeps the session after the browser closes. It applies to
  // all three sign-in methods.
  const remember = useSyncExternalStore(subscribeRememberMember, getRememberMember, () => true);

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

  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus({ tone: "info", message: "로그인하는 중입니다." });
    const { error: signInError } = await getAuthClient().auth.signInWithPassword({
      email: loginIdToEmail(String(form.get("loginId") ?? "")),
      password: String(form.get("password") ?? ""),
    });
    if (signInError) {
      setPending(false);
      setStatus({ tone: "error", message: "아이디 또는 비밀번호가 올바르지 않습니다." });
      return;
    }
    // Accounts not yet linked to a roster member go through sign-up first.
    const { member } = await loadMembership();
    router.replace(member ? "/" : "/login/register");
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
              {[
                account.email ?? account.loginId,
                account.provider && providerLabels[account.provider],
              ]
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
              Google, GitHub 또는 AIKU 아이디로 로그인합니다. 어느 것으로 로그인해도 같은 회원으로
              연결됩니다.
            </p>
          </div>
          <form onSubmit={signInWithPassword} className="grid gap-4">
            <TextField
              label="아이디"
              name="loginId"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={20}
            />
            <TextField
              label="비밀번호"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={72}
            />
            <label className="flex w-fit cursor-pointer items-center gap-2 text-small text-body">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRememberMember(event.target.checked)}
                className="size-4 cursor-pointer accent-green-600"
              />
              자동 로그인
            </label>
            <StatusMessage status={status} />
            <Button type="submit" variant="dark" disabled={pending || account === undefined}>
              로그인
            </Button>
          </form>
          <p className="text-center text-small text-muted">
            아직 계정이 없으신가요?{" "}
            <Link
              href="/login/signup"
              className="font-semibold text-green-800 underline-offset-4 hover:underline"
            >
              회원가입
            </Link>
          </p>
          <div className="flex items-center gap-3 text-small text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" />
            또는
            <span className="h-px flex-1 bg-line" />
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
        </>
      )}
    </div>
  );
}
