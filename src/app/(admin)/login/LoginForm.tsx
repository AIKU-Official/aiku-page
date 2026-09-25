"use client";

import clsx from "clsx";
import { useActionState } from "react";

import { login, type LoginState } from "@/actions/auth";
import { adminFormClassName, StatusMessage, TextField } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, null);

  return (
    <form action={formAction} className={clsx(adminFormClassName, "max-w-[520px]")}>
      {/* React resets the form after each attempt; keep the ID that was typed. */}
      <TextField
        label="ID"
        name="username"
        type="text"
        autoComplete="username"
        required
        defaultValue={state?.username}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <StatusMessage
        status={
          pending
            ? { tone: "info", message: "로그인 중입니다." }
            : state && { tone: "error", message: state.message }
        }
      />
      <Button type="submit" variant="dark" disabled={pending}>
        로그인
      </Button>
    </form>
  );
}
