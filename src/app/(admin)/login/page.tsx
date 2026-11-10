import type { Metadata } from "next";

import { MemberLogin } from "@/components/auth/MemberLogin";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";

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
        lead="AIKU 회원은 Google 또는 GitHub 계정으로 로그인할 수 있습니다."
      />
      <Section>
        <div className="site-container grid gap-10 max-sm:gap-8">
          <MemberLogin error={typeof error === "string" ? error : undefined} />
          <div className="grid max-w-[520px] gap-3 border-t border-line pt-6">
            <p className="text-small text-muted">
              소식, 프로젝트, 멤버 콘텐츠를 관리하는 운영진은 관리자 계정으로 로그인하세요.
            </p>
            <div>
              <ButtonLink href="/login/admin" variant="secondary" size="sm">
                관리자 로그인
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
