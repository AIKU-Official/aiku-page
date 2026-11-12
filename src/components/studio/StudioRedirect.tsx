"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useMemberAccount } from "@/lib/auth/member";

/**
 * On the public home: a member who may use Studio (주니어, 시니어, 활동 OB)
 * is taken to /studio, their home on the site. Everyone else stays.
 */
export function StudioRedirect() {
  const account = useMemberAccount();
  const router = useRouter();
  const studio = Boolean(account?.member?.studio);
  useEffect(() => {
    if (studio) router.replace("/studio");
  }, [studio, router]);
  return null;
}
