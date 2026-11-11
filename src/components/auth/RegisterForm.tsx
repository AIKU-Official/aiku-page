"use client";

import clsx from "clsx";
import { useState, type FormEvent } from "react";

import { registerMember } from "@/actions/membership";
import {
  adminFormClassName,
  SelectField,
  StatusMessage,
  TextField,
  type Status,
} from "@/components/admin/ui";
import { MemberConfirmed } from "@/components/auth/MemberConfirmed";
import { Button, ButtonLink } from "@/components/ui/Button";
import { refreshMemberAccount, useMemberAccount } from "@/lib/auth/member";
import { getAuthClient } from "@/lib/supabase/auth-client";

/** First sign-in: the visitor proves which roster member they are. */
export function RegisterForm({ generations }: { generations: string[] }) {
  const account = useMemberAccount({ eager: true });
  const [status, setStatus] = useState<Status>(null);
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
      <MemberConfirmed
        message={
          account.member
            ? `${account.member.generation} ${account.member.name} 학회원으로 확인되었습니다.`
            : (linkedMessage ?? "")
        }
      />
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
      <SelectField label="가입 기수" name="generation" required defaultValue="">
        <option value="" disabled>
          AIKU에 가입한 기수를 선택하세요
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
