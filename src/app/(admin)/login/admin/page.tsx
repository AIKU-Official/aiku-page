import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { getAdminSession } from "@/lib/auth/session";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "관리자 로그인",
  description: "AIKU 관리자 로그인 페이지입니다.",
};

export default async function LoginPage() {
  if (await getAdminSession()) {
    redirect("/admin");
  }

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="관리자 로그인"
        lead="소식, 프로젝트, 멤버 콘텐츠를 등록하고 수정하려면 관리자 계정으로 로그인하세요."
      />
      <Section>
        <div className="site-container">
          <LoginForm />
        </div>
      </Section>
    </>
  );
}
