"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import { requestAvatarUpload, saveMyProfile, type ProfilePage } from "@/actions/profile";
import {
  Checkbox,
  FormGrid,
  StatusMessage,
  TextAreaField,
  TextField,
  type Status,
} from "@/components/admin/ui";
import { currentAccessToken, useMyProfile } from "@/components/profile/useMyProfile";
import { Avatar } from "@/components/ui/Avatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { refreshMemberAccount, useMemberAccount } from "@/lib/auth/member";
import { MAX_AVATAR_BYTES, PROFILE_LIMITS, type MemberProfile } from "@/lib/members/profile";
import { storagePublicUrl, UPLOAD_BUCKET } from "@/lib/storage/public-url";
import { getAuthClient } from "@/lib/supabase/auth-client";

function Panel({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 card p-7 max-sm:p-5">
      <div>
        <h2 className="text-subheading">{title}</h2>
        {hint ? <p className="mt-1 text-small text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

type Row = Record<string, string>;
type RowField<T extends Row> = { key: keyof T & string; label: string; multiline?: boolean };

/** A list of small records the member can add to, edit and remove. */
function RowsEditor<T extends Row>({
  rows,
  onChange,
  fields,
  empty,
  max,
  addLabel,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  fields: RowField<T>[];
  empty: T;
  max: number;
  addLabel: string;
}) {
  const update = (index: number, key: string, value: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  return (
    <div className="grid gap-3">
      {rows.map((row, index) => (
        <div key={index} className="grid gap-3 rounded-control border border-soft-line p-4">
          {fields.map((field) =>
            field.multiline ? (
              <TextAreaField
                key={field.key}
                label={field.label}
                rows={3}
                className="min-h-24!"
                value={row[field.key]}
                onChange={(event) => update(index, field.key, event.target.value)}
              />
            ) : (
              <TextField
                key={field.key}
                label={field.label}
                value={row[field.key]}
                onChange={(event) => update(index, field.key, event.target.value)}
              />
            ),
          )}
          <div>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="cursor-pointer text-small font-medium text-danger underline-offset-4 hover:underline"
            >
              삭제
            </button>
          </div>
        </div>
      ))}
      {rows.length < max ? (
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange([...rows, empty])}
          >
            {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

type Draft = Omit<
  MemberProfile,
  "contactEmail" | "githubUrl" | "instagramUrl" | "linkedinUrl" | "websiteUrl" | "focus"
> & {
  contactEmail: string;
  githubUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  /** Comma-separated while editing. */
  focus: string;
};

const toDraft = (profile: MemberProfile): Draft => ({
  ...profile,
  contactEmail: profile.contactEmail ?? "",
  githubUrl: profile.githubUrl ?? "",
  instagramUrl: profile.instagramUrl ?? "",
  linkedinUrl: profile.linkedinUrl ?? "",
  websiteUrl: profile.websiteUrl ?? "",
  focus: profile.focus.join(", "),
});

function EditorForm({
  page,
  fallbackAvatarUrl,
}: {
  page: ProfilePage;
  fallbackAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(page.profile));
  const [status, setStatus] = useState<Status>(null);
  // Which action is running; its button shows the progress and all are disabled meanwhile.
  const [task, setTask] = useState<"upload" | "save" | null>(null);
  const busy = task !== null;
  // Local preview of a picture chosen in this visit.
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const text = (
    key:
      | "headline"
      | "tagline"
      | "bio"
      | "contactEmail"
      | "githubUrl"
      | "instagramUrl"
      | "linkedinUrl"
      | "websiteUrl"
      | "focus",
  ) => ({
    value: draft[key],
    onChange: (event: { target: { value: string } }) => set(key, event.target.value),
  });

  const chooseAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      setStatus({
        tone: "error",
        message: `사진이 너무 큽니다. (최대 ${Math.round(MAX_AVATAR_BYTES / 1024 / 1024)}MB)`,
      });
      return;
    }
    setTask("upload");
    setStatus(null);
    const request = await requestAvatarUpload({
      accessToken: await currentAccessToken(),
      name: file.name,
      size: file.size,
    });
    if (!request.ok) {
      setTask(null);
      setStatus({ tone: "error", message: request.message });
      return;
    }
    const { error } = await getAuthClient()
      .storage.from(UPLOAD_BUCKET)
      .uploadToSignedUrl(request.data.path, request.data.token, file, {
        contentType: request.data.contentType,
      });
    setTask(null);
    if (error) {
      setStatus({ tone: "error", message: "사진을 올리지 못했습니다. 다시 시도해주세요." });
      return;
    }
    set("avatarPath", request.data.path);
    setPreview(URL.createObjectURL(file));
    setStatus({ tone: "info", message: "사진을 올렸습니다. 저장을 눌러야 반영됩니다." });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTask("save");
    setStatus(null);
    const result = await saveMyProfile({
      ...draft,
      accessToken: await currentAccessToken(),
      focus: draft.focus.split(","),
    });
    if (!result.ok) {
      setTask(null);
      setStatus({ tone: "error", message: result.message });
      return;
    }
    // The header picture follows the profile picture.
    await refreshMemberAccount();
    router.push("/profile");
  };

  const avatarSrc =
    preview ?? (draft.avatarPath ? storagePublicUrl(draft.avatarPath) : fallbackAvatarUrl);

  return (
    <form onSubmit={onSubmit} className="mx-auto grid w-full max-w-[760px] gap-5">
      <Panel title="프로필 사진" hint="PNG, JPG, WEBP, GIF · 최대 5MB. 원형으로 잘려 보입니다.">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar name={page.subject.name} src={avatarSrc} className="size-24 text-[2rem]" />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              aria-label="프로필 사진 파일"
              onChange={(event) => {
                void chooseAvatar(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={() => fileInput.current?.click()}
            >
              {task === "upload" ? "올리는 중…" : "사진 선택"}
            </Button>
            {draft.avatarPath ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  set("avatarPath", null);
                  setPreview(null);
                }}
              >
                사진 삭제
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel
        title="소개"
        hint={`이름, 기수, 학과, 등급은 학회 명단(${page.subject.generation} ${page.subject.name})에서 가져오며 여기서 바꿀 수 없습니다.`}
      >
        <TextAreaField
          label="한 줄 소개"
          rows={2}
          className="min-h-[4.5rem]!"
          maxLength={120}
          placeholder={"예: Research Intern, Vision & AI Lab\nKorea University"}
          {...text("headline")}
        />
        <TextField
          label="부가 정보"
          maxLength={120}
          placeholder="예: 컴퓨터학과 3학년 · Seoul"
          {...text("tagline")}
        />
        <TextAreaField
          label="About"
          rows={5}
          maxLength={1200}
          placeholder="무엇을 공부하고 어떤 일에 관심이 있는지 적어주세요."
          {...text("bio")}
        />
      </Panel>

      <Panel
        title="링크"
        hint="아이디만 적어도 됩니다. 적은 항목만 프로필에 아이콘으로 나타납니다."
      >
        <TextField
          label="공개 이메일"
          type="email"
          maxLength={200}
          placeholder="name@example.com"
          {...text("contactEmail")}
        />
        <FormGrid>
          <TextField
            label="GitHub"
            maxLength={300}
            placeholder="아이디 또는 주소"
            {...text("githubUrl")}
          />
          <TextField
            label="Instagram"
            maxLength={300}
            placeholder="@아이디 또는 주소"
            {...text("instagramUrl")}
          />
          <TextField
            label="LinkedIn"
            maxLength={300}
            placeholder="아이디 또는 주소"
            {...text("linkedinUrl")}
          />
          <TextField
            label="웹사이트"
            maxLength={300}
            placeholder="https://"
            {...text("websiteUrl")}
          />
        </FormGrid>
      </Panel>

      <Panel
        title="Focus"
        hint={`관심 키워드를 쉼표로 구분해 ${PROFILE_LIMITS.focus}개까지 적어주세요.`}
      >
        <TextField
          label="키워드"
          placeholder="예: Diffusion, Computer vision, World models"
          {...text("focus")}
        />
      </Panel>

      <Panel title="Interests" hint="관심 연구·공부 분야를 카드로 보여줍니다.">
        <RowsEditor
          rows={draft.interests}
          onChange={(rows) => set("interests", rows)}
          fields={[
            { key: "title", label: "제목" },
            { key: "description", label: "설명", multiline: true },
          ]}
          empty={{ title: "", description: "" }}
          max={PROFILE_LIMITS.interests}
          addLabel="관심 분야 추가"
        />
      </Panel>

      <Panel
        title="Experience"
        hint="경력, 학력, 수상, 참여한 프로젝트와 스터디를 최근 순으로 적어주세요."
      >
        <RowsEditor
          rows={draft.experience}
          onChange={(rows) => set("experience", rows)}
          fields={[
            { key: "period", label: "기간" },
            { key: "title", label: "제목" },
            { key: "organization", label: "소속 · 설명" },
          ]}
          empty={{ period: "", title: "", organization: "" }}
          max={PROFILE_LIMITS.experience}
          addLabel="항목 추가"
        />
      </Panel>

      <Panel
        title="Skills"
        hint="분류와 내용을 적습니다. 내용은 줄을 바꿔 여러 줄로 쓸 수 있습니다."
      >
        <RowsEditor
          rows={draft.skills}
          onChange={(rows) => set("skills", rows)}
          fields={[
            { key: "label", label: "분류" },
            { key: "items", label: "내용", multiline: true },
          ]}
          empty={{ label: "", items: "" }}
          max={PROFILE_LIMITS.skills}
          addLabel="분류 추가"
        />
      </Panel>

      <Panel title="공개 여부">
        <label className="flex cursor-pointer items-start gap-2.5 text-small text-body">
          <Checkbox
            checked={draft.isPublic}
            onChange={(event) => set("isPublic", event.target.checked)}
            className="mt-0.5"
          />
          <span>
            프로필 공개
            <span className="block text-muted">
              켜면 Members 페이지에서 내 카드를 누른 누구나 이 프로필을 볼 수 있고, 카드에 링크
              아이콘이 나타납니다. 끄면 나만 볼 수 있습니다.
            </span>
          </span>
        </label>
      </Panel>

      <StatusMessage status={status} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="dark" disabled={busy}>
          {task === "save" ? "저장 중…" : "저장"}
        </Button>
        <ButtonLink href="/profile" variant="secondary">
          취소
        </ButtonLink>
      </div>
    </form>
  );
}

/** Edit form for the signed-in member's own profile. */
export function ProfileEditor() {
  const account = useMemberAccount({ eager: true });
  const [state] = useMyProfile(account);

  if (account === undefined || (account?.member && state.status === "loading")) {
    return (
      <p role="status" className="text-muted">
        프로필을 불러오는 중입니다…
      </p>
    );
  }
  if (!account?.member) {
    return (
      <div className="mx-auto grid w-full max-w-[520px] gap-4 card p-7 max-sm:p-5">
        <p className="text-muted">학회원으로 확인된 계정만 프로필을 수정할 수 있습니다.</p>
        <div>
          <ButtonLink href={account ? "/login/register" : "/login"} variant="dark" size="sm">
            {account ? "회원 등록 계속하기" : "로그인하러 가기"}
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (state.status !== "ready") {
    return (
      <p role="alert" className="text-danger">
        {state.status === "error" ? state.message : ""}
      </p>
    );
  }
  return <EditorForm page={state.page} fallbackAvatarUrl={account.providerAvatarUrl} />;
}
