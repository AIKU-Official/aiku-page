import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/RegisterForm";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { getGenerations } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "회원 등록",
  description: "AIKU 회원 등록 페이지입니다.",
};

export const revalidate = 3600;

export default async function RegisterPage() {
  const generations = await getGenerations();

  return (
    <>
      <PageHero
        eyebrow="Sign up"
        title="회원 등록"
        lead="로그인한 계정을 AIKU 회원 명단과 연결합니다. 로그인 방법마다 한 번만 하면 됩니다."
      />
      <Section>
        <div className="site-container grid justify-items-center">
          <RegisterForm generations={generations.map((generation) => generation.name)} />
        </div>
      </Section>
    </>
  );
}
