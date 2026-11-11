import type { Metadata } from "next";

import { ProfileView } from "@/components/auth/ProfileView";
import { Section } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "프로필",
  description: "AIKU 회원 프로필 페이지입니다.",
  robots: { index: false, follow: false },
};

// No page hero here: the profile itself starts right under the header.
export default function ProfilePage() {
  return (
    <Section className="pt-12 max-lg:pt-10 max-sm:pt-7">
      <div className="site-container">
        <h1 className="sr-only">프로필</h1>
        <ProfileView />
      </div>
    </Section>
  );
}
