import type { Metadata } from "next";
import Image from "next/image";

import {
  CalendarLane,
  CalendarRow,
  CurriculumCard,
  TrackCard,
  type Pill,
} from "@/components/curriculum/CurriculumParts";
import { PageHero } from "@/components/layout/PageHero";
import { Section, SectionHead } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "커리큘럼",
  description: "AIKU의 주니어와 시니어 커리큘럼을 확인하세요.",
};

const activity = (id: string) => `/activities#activity-${id}`;

const juniorPills: Pill[] = [
  { label: "DeepIntoDeep", href: activity("deepintodeep") },
  { label: "Seminar", href: activity("seminar") },
  { label: "Study", href: activity("study") },
  { label: "JUNIORTHON" },
  { label: "AIKUTHON", href: activity("aikuthon") },
];

const seniorPills: Pill[] = [
  { label: "Momentum", href: activity("momentum") },
  { label: "Seminar", href: activity("seminar") },
  { label: "Project", href: activity("project") },
  { label: "Study", href: activity("study") },
  { label: "AIKUTHON", href: activity("aikuthon") },
];

export default function CurriculumPage() {
  return (
    <>
      <PageHero
        eyebrow="Curriculum"
        title={
          <>
            주니어와 시니어로 이어지는 <br /> AIKU 커리큘럼
          </>
        }
        lead={
          <>
            AIKU의 활동은 주니어 한 학기와 시니어 한 학기로 이어지는 트랙,{" "}
            <br className="max-sm:hidden" />
            또는 시니어 1년 트랙으로 구성됩니다.
          </>
        }
      />

      <Section>
        <div className="site-container">
          <SectionHead eyebrow="2-Track System" title="2-Track으로 AIKU 활동을 이어갑니다." />
          <div className="grid gap-5 max-sm:gap-3">
            <figure className="reveal card p-8 max-sm:p-3">
              <Image
                src="/assets/2-Track.webp"
                alt="Track 1은 Junior 0.5년 후 Senior 0.5년, Track 2는 Senior 1년으로 구성됩니다."
                width={1280}
                height={437}
                sizes="(max-width: 1080px) 100vw, 1032px"
                className="h-auto w-full"
              />
            </figure>
            <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1 max-sm:gap-3">
              <TrackCard label="Track 1" title="Junior 0.5년 + Senior 0.5년">
                딥러닝 기초를 다지는 주니어 활동을 거친 뒤, 프로젝트와 논문 중심의 시니어 활동으로
                이어지는 흐름입니다.
              </TrackCard>
              <TrackCard label="Track 2" title="Senior 1년">
                이미 딥러닝 기초를 갖춘 학회원이 시니어 활동을 1년 동안 이어가며 프로젝트와 학술
                활동에 집중하는 흐름입니다.
              </TrackCard>
            </div>
          </div>
        </div>
      </Section>

      <Section soft>
        <div className="site-container">
          <SectionHead eyebrow="Tracks" title="트랙별 활동 구성" />
          <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1 max-sm:gap-3">
            <CurriculumCard
              eyebrow="Junior"
              title="딥러닝 기초와 학회 적응을 위한 한 학기"
              pills={juniorPills}
              pillsLabel="주니어 활동"
            />
            <CurriculumCard
              eyebrow="Senior"
              title="논문 리뷰와 프로젝트 중심의 심화 활동"
              pills={seniorPills}
              pillsLabel="시니어 활동"
            />
          </div>
        </div>
      </Section>

      <Section>
        <div className="site-container">
          <SectionHead eyebrow="Regular Activities" title="AIKU 정기활동" />
          <div className="grid gap-5 max-sm:gap-3" role="group" aria-label="AIKU 목요일 활동 흐름">
            <CalendarRow label="방학 목요일" title="트랙별 세션 후 공통 세미나">
              <CalendarLane
                audience="Junior"
                activity="DeepIntoDeep"
                href={activity("deepintodeep")}
              >
                딥러닝 기초 이론과 응용 방법론을 체계적으로 학습합니다.
              </CalendarLane>
              <CalendarLane audience="Senior" activity="Momentum" href={activity("momentum")}>
                논문 내용 자체에 집중하는 심화 리뷰 세션을 진행합니다.
              </CalendarLane>
              <CalendarLane
                audience="All Members"
                activity="Seminar"
                href={activity("seminar")}
                shared
              >
                주니어와 시니어가 함께 모여 지식을 공유하고 프로젝트와 스터디를 점검합니다.
              </CalendarLane>
            </CalendarRow>

            <CalendarRow label="학기 중 목요일" title="전 학회원 공통 세미나" single>
              <CalendarLane
                audience="All Members"
                activity="Seminar"
                href={activity("seminar")}
                shared
              >
                전 학회원이 함께 모여 딥러닝 지식을 공유하고 한 주간의 활동을 점검합니다.
              </CalendarLane>
            </CalendarRow>
          </div>
        </div>
      </Section>
    </>
  );
}
