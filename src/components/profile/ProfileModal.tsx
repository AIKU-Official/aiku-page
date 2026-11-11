"use client";

import { useEffect, useState } from "react";

import { getPublicProfile, type ProfilePage } from "@/actions/profile";
import { CenterPeek } from "@/components/ui/CenterPeek";

import { ProfileContent } from "./ProfileContent";

type State =
  | { status: "loading" }
  | { status: "ready"; page: ProfilePage }
  | { status: "error"; message: string };

/** A public profile opened over the current page. */
export function ProfileModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
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
    <CenterPeek label="회원 프로필" onClose={onClose}>
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
    </CenterPeek>
  );
}
