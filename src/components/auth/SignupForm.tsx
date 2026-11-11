"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { signUpWithPassword } from "@/actions/membership";
import {
  adminFormClassName,
  SelectField,
  StatusMessage,
  TextField,
  type Status,
} from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { loginIdToEmail, MIN_PASSWORD_LENGTH } from "@/lib/auth/login-id";
import { SIGNUP_NOTE_KEY, watchMemberAccount } from "@/lib/auth/member";
import { getAuthClient } from "@/lib/supabase/auth-client";

/** Sign-up with an AIKU ID and password; identity is checked against the roster in the same step. */
export function SignupForm({ generations }: { generations: string[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const loginId = String(form.get("loginId") ?? "");
    const password = String(form.get("password") ?? "");
    if (password !== form.get("passwordConfirm")) {
      setStatus({ tone: "error", message: "비밀번호가 서로 다릅니다." });
      return;
    }

    setPending(true);
    setStatus({ tone: "info", message: "확인하는 중입니다." });
    const result = await signUpWithPassword({
      loginId,
      password,
      name: form.get("name"),
      generation: form.get("generation"),
      studentId: form.get("studentId"),
    });
    if (!result.ok) {
      setPending(false);
      setStatus({ tone: "error", message: result.message });
      return;
    }

    // The account now exists, so sign in with it straight away. The header
    // starts following the session here; it had none to follow when it loaded.
    watchMemberAccount();
    const { error } = await getAuthClient().auth.signInWithPassword({
      email: loginIdToEmail(loginId),
      password,
    });
    if (error) {
      setPending(false);
      setStatus({
        tone: "info",
        message: "계정을 만들었습니다. 로그인 페이지에서 로그인해주세요.",
      });
      return;
    }
    // That page shows the outcome: the confirmed member, or that no match was found.
    if (result.data !== "linked") {
      try {
        window.sessionStorage.setItem(SIGNUP_NOTE_KEY, "notfound");
      } catch {
        // Without storage the registration page shows its neutral note instead.
      }
    }
    router.replace("/login/register");
  };

  return (
    <form onSubmit={onSubmit} className={clsx(adminFormClassName, "w-full max-w-[520px]")}>
      <div>
        <h2 className="text-subheading">회원가입</h2>
        <p className="mt-1 text-small text-muted">
          AIKU 회원 명단과 대조해 본인임을 확인합니다. 학번은 본인 확인에만 쓰이고 공개되지
          않습니다.
        </p>
      </div>
      <TextField
        label="아이디"
        name="loginId"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="영문 소문자, 숫자 4~20자"
        pattern="[A-Za-z0-9][A-Za-z0-9._\-]{3,19}"
        required
        maxLength={20}
      />
      <TextField
        label="비밀번호"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
        required
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={72}
      />
      <TextField
        label="비밀번호 확인"
        name="passwordConfirm"
        type="password"
        autoComplete="new-password"
        required
        maxLength={72}
      />
      <TextField label="이름" name="name" autoComplete="name" required maxLength={60} />
      <SelectField label="기수" name="generation" required defaultValue="">
        <option value="" disabled>
          기수를 선택하세요
        </option>
        {generations.map((generation) => (
          <option key={generation} value={generation}>
            {generation}
          </option>
        ))}
      </SelectField>
      <TextField
        label="학번"
        name="studentId"
        inputMode="numeric"
        pattern="\d{10}"
        maxLength={10}
        placeholder="10자리 숫자"
        autoComplete="off"
        required
      />
      <StatusMessage status={status} />
      <Button type="submit" variant="dark" disabled={pending}>
        회원가입
      </Button>
      <p className="text-center text-small text-muted">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-semibold text-green-800 underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </form>
  );
}
