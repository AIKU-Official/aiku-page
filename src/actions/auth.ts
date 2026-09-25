"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { credentialsMatch } from "@/lib/auth/credentials";
import {
  clearLoginFailures,
  clientIp,
  isLoginBlocked,
  LOGIN_BLOCKED_MESSAGE,
  recordLoginFailure,
} from "@/lib/auth/rate-limit";
import { endAdminSession, startAdminSession } from "@/lib/auth/session";

/** Failed login: the message to show and the ID to keep in the form. */
export type LoginState = { message: string; username: string } | null;

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  const username = String(formData.get("username") ?? "");
  if (!parsed.success) {
    return { message: "로그인 요청이 올바르지 않습니다.", username };
  }

  const ip = await clientIp();
  if (await isLoginBlocked(ip)) {
    return { message: LOGIN_BLOCKED_MESSAGE, username };
  }

  if (!credentialsMatch(parsed.data.username, parsed.data.password)) {
    await recordLoginFailure(ip);
    // Slow down guessing a little.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { message: "ID 또는 비밀번호가 올바르지 않습니다.", username };
  }

  await clearLoginFailures(ip);
  await startAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/login");
}
