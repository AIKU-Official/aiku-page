import type { Metadata } from "next";

import { MemberLogin } from "@/components/auth/MemberLogin";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "로그인",
  description: "AIKU 회원 로그인 페이지입니다.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <>
      <PageHero
        eyebrow="Login"
        title="로그인"
        lead="AIKU 회원은 Google, GitHub 또는 AIKU 아이디로 로그인할 수 있습니다."
      />
      <Section>
        <div className="site-container grid justify-items-center">
          <MemberLogin error={typeof error === "string" ? error : undefined} />
        </div>
      </Section>
    </>
  );
}
