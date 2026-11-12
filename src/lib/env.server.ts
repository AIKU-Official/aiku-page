import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY가 필요합니다."),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET은 32자 이상이어야 합니다."),
  CRON_SECRET: z.string().optional(),
  // Only member sign-up needs it, so its absence must not break the admin.
  MEMBER_VERIFICATION_SECRET: z
    .string()
    .min(32, "MEMBER_VERIFICATION_SECRET은 32자 이상이어야 합니다.")
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

// Validated lazily so that pages which never touch server secrets (and the
// build of fully static pages) don't fail when these are absent.
export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
      throw new Error(
        `서버 환경변수가 올바르지 않습니다. (Vercel: Settings → Environment Variables)\n${issues}`,
      );
    }
    cached = parsed.data;
  }
  return cached;
}
