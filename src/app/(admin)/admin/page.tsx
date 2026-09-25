import type { Metadata } from "next";

import { LogoutButton } from "@/components/admin/LogoutButton";
import { MembersPanel } from "@/components/admin/MembersPanel";
import { NewsPanel } from "@/components/admin/NewsPanel";
import { ProjectPanel } from "@/components/admin/ProjectPanel";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { requireAdmin } from "@/lib/auth/session";
import { getGenerations, getNews, getProjectArchive } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "관리자",
  description: "AIKU 소식, 프로젝트, 멤버를 관리하는 페이지입니다.",
};

export default async function AdminPage() {
  await requireAdmin();

  const [news, { seasons, projects }, generations] = await Promise.all([
    getNews(),
    getProjectArchive(),
    getGenerations(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="AIKU 콘텐츠 관리"
        lead="소식, 프로젝트, 멤버를 등록하고 수정합니다. 저장한 내용은 홈, 프로젝트, Members 페이지에 바로 반영됩니다."
        aside={<LogoutButton />}
      />
      <Section>
        <div className="site-container grid gap-16">
          <NewsPanel news={news} />
          <ProjectPanel seasons={seasons} projects={projects} />
          <MembersPanel generations={generations} />
        </div>
      </Section>
    </>
  );
}
