import { z } from "zod";

import { UPLOAD_SCOPES } from "@/lib/storage/keys";

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

export const reorderSchema = z.array(idSchema).min(1, "순서를 바꿀 항목이 없습니다.");

// News ---------------------------------------------------------------------

export const newsSchema = z.object({
  id: idSchema.optional(),
  date: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "날짜 형식이 올바르지 않습니다.",
    )
    .transform((value) => value || null),
  title: required("소식 제목을 입력하세요."),
  summary: text(2000),
  linkUrl: text(500)
    .refine(
      (value) => value === "" || /^(https?:\/\/\S+|\/\S*)$/i.test(value),
      "링크 URL은 https:// 또는 /로 시작해야 합니다.",
    )
    .transform((value) => value || null),
  linkLabel: text(40).transform((value) => value || "보기"),
});

// Seasons & projects -------------------------------------------------------

export const seasonNameSchema = groupName("시즌");

/** Uploaded file reference: Storage key plus the original file name. */
const uploadedFile = z.object({ path: z.string().min(1), name: text(255) });

export const projectSchema = z.object({
  id: idSchema,
  isNew: z.boolean(),
  seasonId: z.uuid("시즌을 먼저 추가하고 선택하세요."),
  title: required("프로젝트명을 입력하세요."),
  summary: text(200),
  githubUrl: optionalHttpUrl("GitHub 링크"),
  markdown: z.string().max(100_000, "프로젝트 설명이 너무 깁니다."),
  /** New deck to attach (replaces the current one). */
  presentation: uploadedFile.nullable(),
  removePresentation: z.boolean(),
  addImages: z.array(z.string().min(1)).max(30),
  removeImages: z.array(z.string().min(1)).max(100),
});

// Generations & members ----------------------------------------------------

export const generationNameSchema = groupName("기수");

export const memberSchema = z.object({
  id: idSchema,
  isNew: z.boolean(),
  generationId: z.uuid("기수를 먼저 추가하고 선택하세요."),
  name: required("이름을 입력하세요.", 60),
  summary: text(200),
  email: text(200)
    .refine(
      (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "메일주소 형식이 올바르지 않습니다.",
    )
    .transform((value) => value || null),
  githubUrl: optionalHttpUrl("GitHub 링크"),
  linkedinUrl: optionalHttpUrl("LinkedIn 링크"),
  websiteUrl: optionalHttpUrl("웹사이트 링크"),
  /** New photo (replaces the current one). */
  photo: z.string().min(1).nullable(),
  removePhoto: z.boolean(),
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
