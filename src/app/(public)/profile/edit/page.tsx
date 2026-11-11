import type { Metadata } from "next";

import { Section } from "@/components/layout/Section";
import { ProfileEditor } from "@/components/profile/ProfileEditor";

export const metadata: Metadata = {
  title: "프로필 수정",
  description: "AIKU 회원 프로필을 수정합니다.",
  robots: { index: false, follow: false },
};

// Like the profile page, this starts right under the header without a page hero.
export default function ProfileEditPage() {
  return (
    <Section className="pt-12 max-lg:pt-10 max-sm:pt-7">
      <div className="site-container grid gap-8 max-sm:gap-6">
        <div className="mx-auto w-full max-w-[760px]">
          <h1 className="text-heading">프로필 수정</h1>
          <p className="mt-2 text-muted">
            적은 항목만 프로필에 나타납니다. 비워 둔 항목은 보이지 않습니다.
          </p>
        </div>
        <ProfileEditor />
      </div>
    </Section>
  );
}
