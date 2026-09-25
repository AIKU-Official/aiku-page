import "server-only";

import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY가 필요합니다."),
  ADMIN_ID: z.string().min(1, "ADMIN_ID가 필요합니다."),
  ADMIN_PASSWORD: z
    .string()
    .min(isProduction ? 12 : 1, "ADMIN_PASSWORD는 운영 환경에서 12자 이상이어야 합니다."),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET은 32자 이상이어야 합니다."),
  CRON_SECRET: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

// Validated lazily so that pages which never touch server secrets (and the
// build of fully static pages) don't fail when these are absent.
export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `- ${issue.message}`).join("\n");
      throw new Error(`서버 환경변수가 올바르지 않습니다.\n${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}
