"use client";

import clsx from "clsx";
import { useEffect, useState, type FormEvent } from "react";

import { registerMember } from "@/actions/membership";
import {
  adminFormClassName,
  SelectField,
  StatusMessage,
  TextField,
  type Status,
} from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/Button";
import { refreshMemberAccount, SIGNUP_NOTE_KEY, useMemberAccount } from "@/lib/auth/member";
import { getAuthClient } from "@/lib/supabase/auth-client";

const NOT_FOUND_MESSAGE =
  "학회원 정보에서 찾을 수 없습니다. 입력한 내용을 확인해 다시 제출하거나 운영진에게 문의해주세요.";

const readSignupNote = () => {
  try {
    return window.sessionStorage.getItem(SIGNUP_NOTE_KEY) === "notfound";
  } catch {
    return false;
  }
};

/** First sign-in: the visitor proves which roster member they are. */
export function RegisterForm({ generations }: { generations: string[] }) {
  const account = useMemberAccount({ eager: true });
  // ID sign-up leaves a note when the roster check has just failed, so the
  // message shows here once and not on later visits.
  const [status, setStatus] = useState<Status>(() =>
    readSignupNote() ? { tone: "error", message: NOT_FOUND_MESSAGE } : null,
  );
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(SIGNUP_NOTE_KEY);
    } catch {
      // Storage can be blocked; the note then simply was never written.
    }
  }, []);
  const [pending, setPending] = useState(false);
  // Set to the confirmation text once this visit links the account.
  const [linkedMessage, setLinkedMessage] = useState<string | null>(null);

  if (account === undefined) {
    return (
      <p role="status" className="text-muted">
        계정을 확인하는 중입니다…
      </p>
    );
  }

  if (account === null) {
    return (
      <div className="grid w-full max-w-[520px] gap-4 card p-7 max-sm:p-5">
        <p className="text-muted">회원 등록은 로그인한 뒤에 할 수 있습니다.</p>
        <div>
          <ButtonLink href="/login" variant="dark" size="sm">
            로그인하러 가기
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (account.member || linkedMessage) {
    return (
      <div className="grid w-full max-w-[520px] gap-4 card p-7 max-sm:p-5">
        <div role="status">
          <h2 className="text-subheading">
            {account.member
              ? `${account.member.generation} ${account.member.name} 학회원으로 확인되었습니다.`
              : linkedMessage}
          </h2>
          <p className="mt-1 text-small text-muted">
            이제 이 계정으로 로그인하면 AIKU 학회원으로 인식됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/profile" variant="dark" size="sm">
            내 프로필 보기
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" size="sm">
            홈으로
          </ButtonLink>
        </div>
      </div>
    );
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setStatus({ tone: "info", message: "확인하는 중입니다." });

    const { data } = await getAuthClient().auth.getSession();
    const result = await registerMember({
      accessToken: data.session?.access_token ?? "",
      name: form.get("name"),
      generation: form.get("generation"),
      studentId: form.get("studentId"),
    });
    setPending(false);

    if (!result.ok) {
      setStatus({ tone: "error", message: result.message });
    } else if (result.data === "linked") {
      setStatus(null);
      setLinkedMessage(result.message);
      void refreshMemberAccount();
    } else {
      setStatus({ tone: "error", message: result.message });
    }
  };

  return (
    <form onSubmit={onSubmit} className={clsx(adminFormClassName, "w-full max-w-[520px]")}>
      <div>
        <h2 className="text-subheading">회원 등록</h2>
        <p className="mt-1 text-small text-muted">
          처음 로그인하셨습니다. AIKU 회원 명단과 대조할 정보를 입력해주세요. 학번은 본인 확인에만
          쓰이고 공개되지 않습니다.
        </p>
      </div>
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
      <StatusMessage
        status={
          status ??
          (account.pending
            ? {
                tone: "info",
                message:
                  "이전에 제출한 정보는 운영진이 확인하고 있습니다. 정보를 고쳐 다시 제출할 수도 있습니다.",
              }
            : null)
        }
      />
      <Button type="submit" variant="dark" disabled={pending}>
        회원 확인
      </Button>
    </form>
  );
}
