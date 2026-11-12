"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/sign-out";

/** Signs out of the member account, which also ends the admin session. */
export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="dark"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await signOut();
        router.push("/");
      }}
    >
      {busy ? "로그아웃 중…" : "로그아웃"}
    </Button>
  );
}
