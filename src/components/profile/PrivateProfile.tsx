"use client";

import { getProfileForViewer } from "@/actions/profile";
import { useMemberAccount } from "@/lib/auth/member";
import { useSignedInData } from "@/lib/auth/signed-in-data";

import { ProfileContent } from "./ProfileContent";

/**
 * The page of a member whose profile is not public. Visitors are told so; an
 * admin (a current officer) sees the profile, loaded in the browser through
 * the admin session, so the page's static HTML never contains it.
 */
export function PrivateProfile({ memberId }: { memberId: string }) {
  const account = useMemberAccount();
  const [state] = useSignedInData(account?.admin ? memberId : null, () => getProfileForViewer(memberId));

  if (account?.admin && state.status === "ready") {
    const { subject, profile, projects, awards } = state.data;
    return (
      <>
        <p className="mb-6 rounded-control bg-surface-soft px-4 py-3 text-small text-muted">
          비공개 프로필입니다. 관리자에게만 보입니다.
        </p>
        <ProfileContent subject={subject} profile={profile} projects={projects} awards={awards} />
      </>
    );
  }
  if (account?.admin && state.status === "loading") {
    return <p role="status" className="py-16 text-center text-muted">프로필을 불러오는 중입니다.</p>;
  }
  return <p className="py-16 text-center text-muted">공개된 프로필이 없습니다.</p>;
}
