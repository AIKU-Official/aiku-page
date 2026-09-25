import type { Metadata } from "next";

import { ActivityList, ActivityRow } from "@/components/activities/ActivityRow";
import { PageHero } from "@/components/layout/PageHero";
import { Section, SectionHead } from "@/components/layout/Section";

export const metadata: Metadata = {
  title: "활동",
  description: "AIKU의 정기활동과 주요 행사를 확인하세요.",
};

export default function ActivitiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Activities"
        title="AIKU의 학술 활동과 교류 행사"
        lead="AIKU는 세미나, 논문 리뷰, 딥러닝 부트캠프, 스터디, 프로젝트를 중심으로 학습과 구현을 이어갑니다."
      />

      <Section>
        <div className="site-container">
          <SectionHead eyebrow="Regular Activities" title="정기활동 소개" />

          <ActivityList>
            <ActivityRow id="activity-seminar" label="Seminar" title="매주 진행되는 지식 공유 세션">
              AIKU에서는 지식 공유 및 학회원 간 친목 도모를 위해 매주 세미나를 실시하고 있습니다. 전
              학회원이 모여 딥러닝 지식을 공유하고, 한 주간의 프로젝트와 스터디 내용을 점검합니다.
            </ActivityRow>

            <ActivityRow
              id="activity-momentum"
              label="Momentum"
              title="시니어 학회원 대상 논문 리뷰"
            >
              AIKU의 시니어 학회원들을 대상으로 하는 논문 리뷰 세션입니다. 논문을 바탕으로 딥러닝이
              실생활에 어떻게 적용되는지 리뷰하는 Seminar 세션과 달리, 논문 내용 자체에 집중하는
              보다 학술적인 세션입니다.
            </ActivityRow>

            <ActivityRow
              id="activity-deepintodeep"
              label="DeepIntoDeep"
              title="주니어 학회원 대상 딥러닝 부트캠프"
            >
              AIKU만의 체계적인 커리큘럼으로 이루어진 주니어 학회원 대상 딥러닝 부트캠프입니다.
              딥러닝 입문자라면 꼭 알아야 할 기본 이론과 개념부터 다양한 딥러닝 응용 방법론까지
              폭넓은 주제를 밀도 있게 다룹니다.
            </ActivityRow>

            <ActivityRow
              id="activity-study"
              label="Study"
              title="관심 분야를 함께 공부하는 자율 학술 활동"
            >
              AIKU에서는 관심 분야에 대한 학습 및 지식 공유를 위해 Study를 진행하고 있습니다.
              Study는 서로 배우고 싶은 분야가 같은 학회원들이 자발적으로 구성하고, 계획에 맞추어
              해당 분야에 대한 학습 및 공유 활동을 진행하는 자율적인 학술 활동입니다.
            </ActivityRow>

            <ActivityRow
              id="activity-project"
              label="Project"
              title="딥러닝으로 실제 문제를 해결하는 팀 프로젝트"
            >
              AIKU의 시니어 학회원들을 대상으로 하는 팀 프로젝트 활동입니다. 세미나나 Momentum에서는
              논문 리뷰 및 소개 등 학술적인 지식 공유에 집중한다면, 프로젝트를 통해 실제로 딥러닝을
              활용해서 다양한 문제를 해결해보는 과정을 직접 경험합니다.
            </ActivityRow>
          </ActivityList>
        </div>
      </Section>

      <Section soft>
        <div className="site-container">
          <SectionHead eyebrow="Events" title="행사 및 교류 활동" />

          <ActivityList>
            <ActivityRow
              id="activity-conference"
              label="Conference"
              title="한 학기의 활동을 공개하는 가장 큰 행사"
            >
              AIKU의 한 학기를 정산하는 활동으로 그동안 진행한 정기/비정기 행사를 모두 소개하고,
              AIKU의 주 활동인 프로젝트를 공개하는 행사입니다. 단순한 공개 이외에도 지도 교수님들과
              전 학회원들의 평가를 종합해 우수 프로젝트 시상이 이루어집니다. 학회원뿐만 아니라
              외부에도 공개되는 AIKU의 가장 큰 행사입니다.
            </ActivityRow>

            <ActivityRow
              id="activity-aikuthon"
              label="AIKUTHON"
              title="AIKU 자체 제작 무박 2일 데이터톤"
            >
              AIKU 주관으로 진행되는 자체 제작 무박 2일 데이터톤입니다. 학회원들이 DeepIntoDeep,
              Momentum, Seminar, Project, Study 등 여러 학술 활동을 통해 배운 딥러닝 지식을 직접
              적용해 볼 수 있는 행사입니다. 주어진 Theme에 따라 팀을 이루어 결과물을 만들고 발표하는
              지식 교류의 장이 열립니다.
            </ActivityRow>

            <ActivityRow
              id="activity-hayaku"
              label="HAYAKU"
              title="연세대학교 YAI, 한양대학교 HAI와 함께하는 연합 컨퍼런스"
            >
              AIKU는 연세대학교 YAI, 한양대학교 HAI와 교류관계를 맺고 있으며, 연합 컨퍼런스를
              개최하여 최신 딥러닝 기술 동향과 분야에 대한 인사이트를 나눌 수 있도록 합니다. 또한
              외부 워크샵 및 세미나 견학 등의 활동을 통해 학술적 교류를 비롯한 다양한 경험을 쌓을 수
              있습니다.
            </ActivityRow>

            <ActivityRow
              id="activity-networking-day"
              label="Networking Day"
              title="전 학회원이 함께하는 친목 행사"
            >
              AIKU의 전 학회원들이 함께하는 친목 행사입니다. Networking Day에서는 주니어와 시니어가
              서로 소통하고 친해질 수 있는 기회를 마련합니다. 또한 현업 연구원/개발자 초청 특강으로
              진행되는 강연 형식의 Networking Day도 개최하고 있습니다.
            </ActivityRow>

            <ActivityRow
              id="activity-homecoming-day"
              label="Homecoming Day"
              title="OB 학회원과 함께하는 네트워킹"
            >
              AIKU의 OB 학회원을 초청하여 전 기수의 학회원이 참석하는 친목 행사입니다. 현업에서
              다양한 업무를 하고 계시는 OB 학회원분들의 경험을 공유받고, 네트워킹하는 기회를
              마련합니다.
            </ActivityRow>
          </ActivityList>
        </div>
      </Section>
    </>
  );
}
