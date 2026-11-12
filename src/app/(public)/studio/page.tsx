import type { Metadata } from "next";

import { Section } from "@/components/layout/Section";
import { StudioHero } from "@/components/studio/StudioHero";
import { StudioHome } from "@/components/studio/StudioHome";

export const metadata: Metadata = {
  title: { absolute: "AIKU Studio" },
  description: "AIKU 학회원을 위한 활동 공간입니다.",
  robots: { index: false, follow: false },
};

// The page itself is the same for everyone; what a member sees is loaded in
// the browser with their session, and only 주니어, 시니어, 활동 OB get it.
export default function StudioPage() {
  return (
    <>
      <StudioHero />
      <Section>
        <div className="site-container">
          <StudioHome />
        </div>
      </Section>
    </>
  );
}
