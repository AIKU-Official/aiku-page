import { z } from "zod";

import { LOGIN_ID_PATTERN, MIN_PASSWORD_LENGTH, normalizeLoginId } from "@/lib/auth/login-id";
import { parsePositions, POSITION_FORMAT_MESSAGE } from "@/lib/members/positions";
import { normalizeLink, PROFILE_LIMITS, type LinkKind } from "@/lib/members/profile";
import { parseTags } from "@/lib/projects/tags";
import { UPLOAD_SCOPES } from "@/lib/storage/keys";
import { MEMBER_GRADES } from "@/lib/types";

import { parseSeasonName } from "@/lib/seasons/name";
import type { Rank } from "@/lib/ranks";

// Input schemas for the admin Server Actions. Messages reuse the legacy
// server's Korean wording. Empty optional fields arrive as "" and become null.

const text = (max: number) => z.string().trim().max(max, `${max}자 이하로 입력하세요.`);

const required = (message: string, max = 200) => text(max).min(1, message);

const optionalHttpUrl = (label: string) =>
  text(500)
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
      `${label}는 http:// 또는 https://로 시작해야 합니다.`,
    )
    .transform((value) => value || null);

const groupName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} 이름을 입력하세요.`)
    .max(40, `${label} 이름은 40자 이하로 입력하세요.`)
    .refine(
      (value) => !/[/\\<>]/.test(value),
      `${label} 이름에는 /, \\, <, > 문자를 사용할 수 없습니다.`,
    );

export const idSchema = z.uuid("대상을 찾을 수 없습니다.");

// Member sign-up ------------------------------------------------------------

const identityFields = {
  name: required("이름을 입력하세요.", 60),
  generation: required("기수를 선택하세요.", 40),
  studentId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "학번 10자리를 숫자로 입력하세요."),
};

export const memberSignupSchema = z.object({
  /** Supabase access token of the signed-in visitor. */
  accessToken: z.string().min(1, "로그인이 필요합니다."),
  ...identityFields,
});

/** Sign-up with AIKU's own ID and password, verified against the roster like any other. */
export const passwordSignupSchema = z.object({
  loginId: z
    .string()
    .transform(normalizeLoginId)
    .pipe(
      z
        .string()
        .regex(
          LOGIN_ID_PATTERN,
          "아이디는 영문 소문자, 숫자, . _ - 로 4~20자여야 하며 영문이나 숫자로 시작해야 합니다.",
        ),
    ),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`)
    .max(72, "비밀번호는 72자 이하여야 합니다."),
  ...identityFields,
});

/** Adds the account of `accountToken` to the member that `memberToken` is already verified as. */
export const linkAccountSchema = z.object({
  memberToken: z.string().min(1, "로그인이 필요합니다."),
  accountToken: z.string().min(1, "로그인이 필요합니다."),
});

// Member profile -------------------------------------------------------------

const link = (kind: LinkKind, label: string) =>
  text(300)
    .transform((value) => normalizeLink(kind, value))
    .refine(
      (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
      `${label} 주소가 올바르지 않습니다.`,
    )
    .transform((value) => value || null);

/** Keeps the rows a member actually filled in. */
const filled = <T extends Record<string, string>>(rows: T[]) =>
  rows.filter((row) => Object.values(row).some((value) => value !== ""));

export const profileSchema = z.object({
  accessToken: z.string().min(1, "로그인이 필요합니다."),
  isPublic: z.boolean(),
  headline: text(120),
  tagline: text(120),
  bio: text(1200),
  /** Object key of a newly uploaded picture, null to remove, undefined to keep. */
  avatarPath: z.string().max(300).nullable().optional(),
  contactEmail: text(200)
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "이메일 주소가 올바르지 않습니다.",
    )
    .transform((value) => value || null),
  githubUrl: link("github", "GitHub"),
  instagramUrl: link("instagram", "Instagram"),
  linkedinUrl: link("linkedin", "LinkedIn"),
  websiteUrl: link("website", "웹사이트"),
  focus: z
    .array(text(40))
    .transform((tags) => [...new Set(tags.filter(Boolean))])
    .pipe(
      z
        .array(z.string())
        .max(PROFILE_LIMITS.focus, `키워드는 ${PROFILE_LIMITS.focus}개까지 넣을 수 있습니다.`),
    ),
  interests: z
    .array(z.object({ title: text(80), description: text(400) }))
    .transform(filled)
    .pipe(z.array(z.any()).max(PROFILE_LIMITS.interests)),
  skills: z
    .array(z.object({ label: text(40), items: text(400) }))
    .transform(filled)
    .pipe(z.array(z.any()).max(PROFILE_LIMITS.skills)),
  experience: z
    .array(z.object({ period: text(60), title: text(120), organization: text(160) }))
    .transform(filled)
    .pipe(z.array(z.any()).max(PROFILE_LIMITS.experience)),
});

export const avatarUploadSchema = z.object({
  accessToken: z.string().min(1, "로그인이 필요합니다."),
  name: z.string().min(1).max(255),
  size: z.number().int().positive("빈 파일은 올릴 수 없습니다."),
});

// Uploads ------------------------------------------------------------------

export const uploadRequestSchema = z.object({
  scope: z.enum(UPLOAD_SCOPES),
  entityId: idSchema,
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(255),
        size: z.number().int().positive("빈 파일은 올릴 수 없습니다."),
        kind: z.enum(["image", "presentation"]),
      }),
    )
    .min(1)
    .max(30),
});
