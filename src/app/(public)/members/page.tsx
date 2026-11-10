import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { MemberDirectory } from "@/components/members/MemberDirectory";
import { getGenerations } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Members",
  description: "AIKU Members를 기수와 등급별로 찾아볼 수 있습니다.",
};

export const revalidate = 3600;

export default async function MembersPage() {
  const generations = await getGenerations();

  return (
    <>
      <PageHero
        eyebrow="Members"
        title="AIKU Members"
        lead="현재 활동 중인 학회원부터 AIKU를 거쳐간 학회원까지, 함께 성장해온 멤버들을 기수와 등급별로 정리합니다."
      />
      <MemberDirectory generations={generations} />
    </>
  );
}
