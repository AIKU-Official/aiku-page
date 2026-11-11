"use client";

import { useEffect, useRef, useState } from "react";

import { getPublicProfile, type ProfilePage } from "@/actions/profile";

import { ProfileContent } from "./ProfileContent";

type State =
  | { status: "loading" }
  | { status: "ready"; page: ProfilePage }
  | { status: "error"; message: string };

/** A public profile opened over the member directory, centred on the page. */
export function ProfileModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const closeButton = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-6 backdrop-blur-[2px] motion-safe:animate-menu max-sm:items-end max-sm:p-0"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="회원 프로필"
        className="relative max-h-[88vh] w-full max-w-[1040px] overflow-y-auto rounded-[20px] bg-surface p-12 shadow-[0_24px_80px_rgb(29_29_29/0.22)] max-lg:p-8 max-sm:max-h-[92vh] max-sm:rounded-b-none max-sm:p-5 max-sm:pt-12"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-soft hover:text-ink"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="m3.5 3.5 9 9m0-9-9 9" />
          </svg>
        </button>
        {state.status === "ready" ? (
          <ProfileContent subject={state.page.subject} profile={state.page.profile} />
        ) : (
          <p role="status" className="py-16 text-center text-muted">
            {state.status === "loading" ? "프로필을 불러오는 중입니다…" : state.message}
          </p>
        )}
      </div>
    </div>
  );
}
