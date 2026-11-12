import type { Metadata } from "next";
import { Fragment } from "react";

import { AikuthonCard } from "@/components/aikuthon/AikuthonCard";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { getAikuthons } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "AIKUTHON",
  description: "AIKU가 직접 문제를 만들고 운영하는 데이터톤, AIKUTHON의 역대 대회를 소개합니다.",
};

// Refreshed hourly; the history changes a few times a year.
export const revalidate = 3600;

export default async function AikuthonPage() {
  const events = await getAikuthons();
  const firstYear = events.at(-1)?.startsOn.slice(0, 4);

  return (
    <>
      <PageHero
        eyebrow="AIKUTHON"
        title="AIKU가 직접 만드는 데이터톤"
        lead="학회원들이 DeepIntoDeep, Momentum, 세미나와 프로젝트에서 배운 딥러닝을 직접 풀어보는 대회입니다. 운영진이 문제와 데이터셋을 만들고, 팀마다 하룻밤 동안 모델을 만들어 결과를 발표합니다."
      />

      <Section>
        <div className="site-container">
          {events.length ? (
            <p className="mb-8 text-small text-muted max-sm:mb-6">
              {firstYear}년부터 지금까지 {events.length}번의 대회를 열었습니다.
            </p>
          ) : null}
          <div className="grid gap-5 max-sm:gap-3">
            {events.map((event, index) => {
              const year = event.startsOn.slice(0, 4);
              const startsYear = year !== events[index - 1]?.startsOn.slice(0, 4);
              return (
                <Fragment key={event.id}>
                  {startsYear ? (
                    <h2 className="border-b border-line pb-3 text-heading not-first:mt-10 max-sm:not-first:mt-7">
                      {year}
                    </h2>
                  ) : null}
                  <AikuthonCard event={event} />
                </Fragment>
              );
            })}
          </div>
        </div>
      </Section>
    </>
  );
}
