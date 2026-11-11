"use client";

import { useState, useTransition } from "react";

import { approveSignupRequest, rejectSignupRequest } from "@/actions/membership";
import { emailToLoginId } from "@/lib/auth/login-id";
import type { Generation } from "@/lib/types";

import { EmptyAdminText, ItemButton } from "./AdminList";
import { AdminPanel } from "./AdminPanel";
import { fromResult } from "./status";
import { StatusMessage, type Status } from "./ui";

export type SignupRequest = {
  userId: string;
  email: string | null;
  name: string;
  generationName: string;
  attempts: number;
};

const accountLabel = (email: string | null) => {
  const loginId = emailToLoginId(email);
  return loginId ? `아이디 ${loginId}` : (email ?? "이메일 없음");
};

/** Sign-ups whose name, generation and student ID did not match the roster. */
export function SignupRequestsPanel({
  requests,
  generations,
}: {
  requests: SignupRequest[];
  generations: Generation[];
}) {
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  const approve = (request: SignupRequest, memberId: string) => {
    if (!memberId) {
      setStatus({ tone: "error", message: "연결할 멤버를 선택하세요." });
      return;
    }
    startTransition(async () => {
      setStatus(fromResult(await approveSignupRequest({ userId: request.userId, memberId })));
    });
  };

  const reject = (request: SignupRequest) => {
    if (!window.confirm(`${request.name}님의 가입 요청을 거절할까요?`)) return;
    startTransition(async () => {
      setStatus(fromResult(await rejectSignupRequest(request.userId)));
    });
  };

  return (
    <AdminPanel id="signup-admin-title" eyebrow="Sign-ups" title="회원 가입 요청">
      <p className="text-small text-muted">
        입력한 이름·기수·학번이 명단과 일치하지 않은 가입 요청입니다. 본인이 맞는지 확인한 뒤 연결할
        멤버를 골라 승인하세요.
      </p>
      <StatusMessage status={status} />
      {requests.length ? (
        <div className="grid border-t border-soft-line">
          {requests.map((request) => (
            <form
              key={request.userId}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-soft-line py-4 max-lg:grid-cols-1"
              onSubmit={(event) => {
                event.preventDefault();
                approve(request, String(new FormData(event.currentTarget).get("memberId") ?? ""));
              }}
            >
              <div>
                <h3 className="text-[1rem]">
                  {request.generationName} {request.name}
                </h3>
                <p className="text-small text-muted">
                  {[accountLabel(request.email), `확인 시도 ${request.attempts}회`].join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="memberId"
                  aria-label="연결할 멤버"
                  defaultValue=""
                  className="min-h-9 rounded-control border border-line bg-surface px-2.5 text-small text-ink"
                >
                  <option value="">연결할 멤버 선택</option>
                  {generations.map((generation) => (
                    <optgroup key={generation.id} label={generation.name}>
                      {generation.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ItemButton type="submit" disabled={pending}>
                  승인
                </ItemButton>
                <ItemButton danger disabled={pending} onClick={() => reject(request)}>
                  거절
                </ItemButton>
              </div>
            </form>
          ))}
        </div>
      ) : (
        <EmptyAdminText>대기 중인 가입 요청이 없습니다.</EmptyAdminText>
      )}
    </AdminPanel>
  );
}
