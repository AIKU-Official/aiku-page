import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

export const metadata: Metadata = {
  title: "프로필 수정",
  description: "AIKU 회원 프로필을 수정합니다.",
  robots: { index: false, follow: false },
};

export default function ProfileEditPage() {
  return (
    <>
      <PageHero
        eyebrow="Profile"
        title="프로필 수정"
        lead="적은 항목만 프로필에 나타납니다. 비워 둔 항목은 보이지 않습니다."
      />
      <Section>
        <div className="site-container">
          <ProfileEditor />
        </div>
      </Section>
    </>
  );
}
