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
import { Button, ButtonLink } from "@/components/ui/Button";
import { useMemberAccount } from "@/lib/auth/member";
import { getAuthClient } from "@/lib/supabase/auth-client";

/** First sign-in: the visitor proves which roster member they are. */
export function RegisterForm({ generations }: { generations: string[] }) {
  const account = useMemberAccount({ eager: true });
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  const [linkedNow, setLinkedNow] = useState(false);

  if (account === undefined) {
    return (
      <p role="status" className="text-muted">
        계정을 확인하는 중입니다…
      </p>
    );
  }

  if (account === null) {
    return (
      <div className="grid max-w-[520px] gap-4 card p-7 max-sm:p-5">
        <p className="text-muted">회원 등록은 로그인한 뒤에 할 수 있습니다.</p>
        <div>
          <ButtonLink href="/login" variant="dark" size="sm">
            로그인하러 가기
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (account.member || linkedNow) {
    return (
      <div className="grid max-w-[520px] gap-4 card p-7 max-sm:p-5">
        <div>
          <h2 className="text-subheading">회원 확인이 완료되었습니다.</h2>
          {account.member ? (
            <p className="mt-1 text-small text-muted">
              {account.member.generation} {account.member.name} 회원으로 등록된 계정입니다.
            </p>
          ) : null}
        </div>
        <div>
          <ButtonLink href="/members" variant="dark" size="sm">
            Members 보기
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
      setLinkedNow(true);
    } else {
      setStatus({ tone: "info", message: result.message });
    }
  };

  return (
    <form onSubmit={onSubmit} className={clsx(adminFormClassName, "max-w-[520px]")}>
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
                  "운영진의 승인을 기다리는 요청이 있습니다. 정보를 고쳐 다시 제출할 수 있습니다.",
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
