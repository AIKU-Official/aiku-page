import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const metadata: Metadata = {
  title: "소개",
  description: "AIKU 소개와 활동 흐름을 확인하세요.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About AIKU"
        title={
          <>
            지식 공유를 통해 성장으로 함께 나아가는
            <br />
            고려대학교 딥러닝 학회 AIKU
          </>
        }
        lead="AIKU는 딥러닝과 인공지능에 관심 있는 고려대학교 학생들이 모여 지식을 공유하고 프로젝트를 진행하는 학회입니다."
      />

      <Section>
        <div className="site-container grid reveal grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-16 max-lg:grid-cols-1 max-lg:gap-6">
          <div>
            <Eyebrow>Our Approach</Eyebrow>
            <h2>AIKU가 지향하는 방식</h2>
          </div>
          <div className="grid gap-5 text-lead text-body">
            <p>
              AIKU는 논문, 모델, 구현 경험을 함께 다루며 학습을 실제 결과로 이어가는 것을 목표로
              합니다. 구성원은 스터디와 세미나를 통해 배운 내용을 설명하고, 프로젝트를 통해
              아이디어를 검증합니다.
            </p>
            <p>
              특정 수준의 배경지식보다 꾸준히 배우려는 태도와 함께 성장하려는 문화를 더 중요하게
              생각합니다.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
