"use client";

import clsx from "clsx";
import { useActionState } from "react";

import { login, type LoginState } from "@/actions/auth";
import { adminFormClassName, StatusMessage, TextField } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={formAction} className={clsx(adminFormClassName, "w-full max-w-[520px]")}>
      {/* React resets the form after each attempt; keep the ID that was typed. */}
      <TextField
        label="아이디"
        name="username"
        type="text"
        autoComplete="username"
        required
        defaultValue={state?.username}
      />
      <TextField
        label="비밀번호"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <StatusMessage status={pending ? null : state && { tone: "error", message: state.message }} />
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
