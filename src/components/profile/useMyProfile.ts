"use client";

import { getMyProfile, type ProfilePage } from "@/actions/profile";
import type { MemberAccount } from "@/lib/auth/member";
import { type SignedInData, useSignedInData } from "@/lib/auth/signed-in-data";

export type MyProfileState = SignedInData<ProfilePage>;

/** Loads the signed-in member's own profile once their roster link is known. */
export function useMyProfile(account: MemberAccount | null | undefined) {
  return useSignedInData(account?.member?.id, getMyProfile);
}
