"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/Avatar";
import type { MemberAccount } from "@/lib/auth/member";

const itemClassName =
  "flex h-10 w-full items-center rounded-control px-3 text-left text-[0.9375rem] font-medium transition-colors max-lg:h-12 max-lg:text-[1.0625rem]";

/**
 * Signed-in replacement for the header's Login link. On wide screens the
 * picture opens a small menu; in the mobile menu the two actions are listed directly.
 */
export function AccountMenu({
  account,
  onNavigate,
}: {
  account: MemberAccount;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    onNavigate();
  };

  const signOut = async () => {
    close();
    // Loaded on demand so the header does not ship the Supabase client to every visitor.
    const { getAuthClient } = await import("@/lib/supabase/auth-client");
    await getAuthClient().auth.signOut();
  };

  return (
    <div ref={rootRef} className="relative max-lg:grid max-lg:gap-1">
      <button
        type="button"
        aria-label="계정 메뉴"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer items-center rounded-full transition-shadow hover:shadow-[0_0_0_3px_var(--color-green-100)] focus-visible:shadow-[0_0_0_3px_var(--color-green-100)] focus-visible:outline-none max-lg:hidden"
      >
        <Avatar name={account.name} src={account.avatarUrl} className="size-9 text-[0.9375rem]" />
      </button>

      <div className="hidden items-center gap-3 px-3 py-2 max-lg:flex">
        <Avatar name={account.name} src={account.avatarUrl} className="size-10" />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-ink">{account.name}</span>
          {(account.email ?? account.loginId) ? (
            <span className="block truncate text-small text-muted">
              {account.email ?? account.loginId}
            </span>
          ) : null}
        </span>
      </div>

      <div
        role="menu"
        className={clsx(
          "max-lg:grid max-lg:gap-1",
          "lg:absolute lg:top-[calc(100%+0.5rem)] lg:right-0 lg:w-44 lg:rounded-card lg:border lg:border-line lg:bg-surface lg:p-1.5 lg:shadow-[0_12px_32px_rgb(29_29_29/0.1)]",
          !open && "lg:hidden",
        )}
      >
        <Link
          href="/profile"
          role="menuitem"
          onClick={close}
          className={clsx(itemClassName, "text-body hover:bg-surface-soft hover:text-ink")}
        >
          프로필
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={signOut}
          className={clsx(itemClassName, "cursor-pointer text-danger hover:bg-danger-soft")}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
