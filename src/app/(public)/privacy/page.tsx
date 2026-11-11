import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "AIKU 홈페이지가 수집하는 개인정보와 그 이용 방법을 안내합니다.",
};

const CONTACT_EMAIL = "ku.deepintodeep@gmail.com";
const EFFECTIVE_DATE = "2026년 11월 12일";

const sections: { title: string; body?: string; items?: string[] }[] = [
  {
    title: "1. 수집하는 정보",
    items: [
      "Google 또는 GitHub로 로그인할 때: 해당 계정의 이메일 주소, 이름, 프로필 사진 주소, 계정 식별자",
      "AIKU 아이디로 가입할 때: 아이디와 비밀번호. 비밀번호는 암호화되어 저장되며 운영진도 볼 수 없습니다.",
      "학회원 본인 확인을 할 때: 이름, 가입 기수, 학번. 입력한 학번은 명단과 대조하는 데만 쓰이고 홈페이지에 저장되지 않습니다. 대조용 명단에는 학번을 되돌릴 수 없게 변환한 값만 들어 있습니다.",
      "학회원 명단: 이름, 학과, 기수, 등급, 회장·부회장 직책. 이 정보는 Members 페이지에 공개됩니다.",
    ],
  },
  {
    title: "2. 이용 목적",
    items: [
      "로그인한 사람이 AIKU 학회원 본인인지 확인",
      "로그인 상태 유지와 계정 관리",
      "학회원 명단 운영과 학회 활동 소개",
    ],
  },
  {
    title: "3. 보관 기간",
    body: "계정 정보는 계정을 삭제하거나 삭제를 요청할 때까지 보관합니다. 본인 확인에 실패한 가입 요청은 운영진이 승인하거나 거절하면 삭제됩니다.",
  },
  {
    title: "4. 제3자 제공과 처리 위탁",
    body: "수집한 정보를 외부에 판매하거나 제공하지 않습니다. 홈페이지 운영을 위해 다음 서비스를 이용합니다.",
    items: [
      "Supabase: 데이터베이스와 로그인 처리",
      "Vercel: 홈페이지 호스팅",
      "Google, GitHub: 해당 계정으로 로그인하기를 선택한 경우의 본인 인증",
    ],
  },
  {
    title: "5. 이용자의 권리",
    body: "본인의 정보에 대한 열람, 정정, 삭제와 계정 삭제를 언제든지 요청할 수 있습니다. 아래 문의처로 연락하면 처리합니다.",
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="개인정보처리방침"
        lead="AIKU 홈페이지가 어떤 정보를 수집하고 어떻게 쓰는지 안내합니다."
      />
      <Section>
        <div className="site-container">
          <div className="grid max-w-[760px] gap-10 max-sm:gap-8">
            {sections.map((section) => (
              <section key={section.title} className="grid gap-3">
                <h2 className="text-subheading">{section.title}</h2>
                {section.body ? <p className="text-body">{section.body}</p> : null}
                {section.items ? (
                  <ul className="grid list-disc gap-2 pl-5 text-body marker:text-line-strong">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
            <section className="grid gap-3">
              <h2 className="text-subheading">6. 문의</h2>
              <p className="text-body">
                고려대학교 딥러닝 학회 AIKU ·{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-green-800 underline-offset-4 hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            </section>
            <p className="border-t border-soft-line pt-6 text-small text-muted">
              시행일: {EFFECTIVE_DATE}
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
