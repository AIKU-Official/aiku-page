import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { MemberCard } from "@/components/members/MemberCard";
import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { getGenerations } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Members",
  description: "AIKU Members를 기수별로 소개합니다.",
};

export const revalidate = 3600;

export default async function MembersPage() {
  const generations = await getGenerations();

  return (
    <>
      <PageHero
        eyebrow="Members"
        title="AIKU Members"
        lead="현재 활동 중인 학회원부터 AIKU를 거쳐간 학회원까지, 함께 성장해온 멤버들의 프로필과 연결 링크를 기수별로 정리합니다."
      />

      <Section>
        <div className="site-container grid gap-9">
          {generations.length === 0 ? (
            <EmptyNotice>아직 공개된 멤버가 없습니다.</EmptyNotice>
          ) : null}
          {generations.map((generation) => (
            <section
              key={generation.id}
              className="grid gap-[18px] border-b border-soft-line pb-9 last:border-b-0 last:pb-0"
            >
              <div className="flex items-end justify-between gap-4 max-lg:items-start max-sm:grid max-sm:gap-2">
                <h2 className="text-[clamp(1.5rem,2vw,2.1rem)] text-ink">{generation.name}</h2>
                <p className="font-extrabold text-muted">{generation.members.length}명</p>
              </div>
              <div className="grid grid-cols-4 gap-3.5 max-lg:grid-cols-1">
                {generation.members.map((member) => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}
