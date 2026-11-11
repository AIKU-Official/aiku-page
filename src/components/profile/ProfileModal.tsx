"use client";

import { useEffect, useState, type ReactNode } from "react";

import { getPublicProfile, type ProfilePage } from "@/actions/profile";
import { CenterPeek } from "@/components/ui/CenterPeek";

import { ProfileContent } from "./ProfileContent";

type State =
  | { status: "loading" }
  | { status: "ready"; page: ProfilePage }
  | { status: "error"; message: string };

/** A public profile opened over the current page. */
export function ProfileModal({
  memberId,
  onClose,
  origin,
  face,
}: {
  memberId: string;
  onClose: () => void;
  /** The member card this opens from; the panel unfolds out of it. */
  origin?: () => DOMRect | null | undefined;
  /** That card's content, shown at the start so the panel begins as the card. */
  face?: ReactNode;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void getPublicProfile(memberId).then((result) => {
      if (cancelled) return;
      setState(
        result.ok
          ? { status: "ready", page: result.data }
          : { status: "error", message: result.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  return (
    <CenterPeek
      label="회원 프로필"
      onClose={onClose}
      origin={origin}
      className="relative p-12 max-lg:p-8 max-sm:p-5 max-sm:pt-14"
    >
      {face ? (
        <div
          data-peek-origin-only
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0"
        >
          {face}
        </div>
      ) : null}
      <div {...(face ? { "data-peek-panel-only": "" } : {})}>
        {state.status === "ready" ? (
          <ProfileContent
            subject={state.page.subject}
            profile={state.page.profile}
            projects={state.page.projects}
          />
        ) : (
          <p role="status" className="py-16 text-center text-muted">
            {state.status === "loading" ? "프로필을 불러오는 중입니다…" : state.message}
          </p>
        )}
      </div>
    </CenterPeek>
  );
}
