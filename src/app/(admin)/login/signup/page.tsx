import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/SignupForm";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { getGenerations } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "회원가입",
  description: "AIKU 회원가입 페이지입니다.",
};

export const revalidate = 3600;

export default async function SignupPage() {
  const generations = await getGenerations();

  return (
    <>
      <PageHero
        eyebrow="Sign up"
        title="회원가입"
        lead="AIKU 아이디를 만들고 회원 명단과 연결합니다."
      />
      <Section>
        <div className="site-container grid justify-items-center">
          <SignupForm generations={generations.map((generation) => generation.name)} />
        </div>
      </Section>
    </>
  );
}
