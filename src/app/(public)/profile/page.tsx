import type { Metadata } from "next";

import { ProfileView } from "@/components/auth/ProfileView";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "프로필",
  description: "AIKU 회원 프로필 페이지입니다.",
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <>
      <PageHero eyebrow="Profile" title="프로필" lead="AIKU 회원 명단에 등록된 내 정보입니다." />
      <Section>
        <div className="site-container grid justify-items-center">
          <ProfileView />
        </div>
      </Section>
    </>
  );
}
