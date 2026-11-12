"use client";

import type { ReactNode } from "react";

import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Notice } from "@/components/ui/Notice";
import type { ActionResult } from "@/lib/actions/result";
import { type MemberAccount, useMemberAccount } from "@/lib/auth/member";
import { useSignedInData } from "@/lib/auth/signed-in-data";

type StudioMember = NonNullable<MemberAccount["member"]>;

/**
 * What every Studio page does before showing anything: checks the signed-in
 * member may use Studio (주니어, 시니어, 활동 OB), loads the page's data with
 * their session, and otherwise says why not. The server checks again.
 */
export function StudioGate<T>({
  load,
  loading,
  children,
}: {
  load: (accessToken: string) => Promise<ActionResult<T>>;
  /** "Studio를 불러오는 중입니다…" */
  loading: string;
  children: (data: T, member: StudioMember) => ReactNode;
}) {
  const account = useMemberAccount({ eager: true });
  const member = account?.member?.studio ? account.member : null;
  const [state] = useSignedInData(member?.id, load);

  if (account === undefined) {
    return (
      <p role="status" className="text-muted">
        계정을 확인하는 중입니다…
      </p>
    );
  }
  if (account === null) {
    return (
      <Notice action={{ href: "/login", label: "로그인하러 가기" }}>
        AIKU Studio는 로그인한 학회원을 위한 공간입니다.
      </Notice>
    );
  }
  if (!member) {
    return (
      <Notice action={{ href: "/", label: "홈으로 가기" }}>
        AIKU Studio는 주니어, 시니어, 활동 OB 학회원만 이용할 수 있습니다.
      </Notice>
    );
  }
  if (state.status === "loading") {
    return (
      <p role="status" className="text-muted">
        {loading}
      </p>
    );
  }
  if (state.status === "error") {
    return <ErrorNotice>{state.message}</ErrorNotice>;
  }
  return children(state.data, member);
}
