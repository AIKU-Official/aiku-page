import type { Metadata } from "next";

import { GalleryPanel } from "@/components/admin/GalleryPanel";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { MembersPanel } from "@/components/admin/MembersPanel";
import { NewsPanel } from "@/components/admin/NewsPanel";
import { ProjectPanel } from "@/components/admin/ProjectPanel";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { requireAdmin } from "@/lib/auth/session";
import { getGalleryItems, getGenerations, getNews, getProjectArchive } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "관리자",
  description: "AIKU 프로젝트와 갤러리를 관리하는 페이지입니다.",
};

export default async function AdminPage() {
  await requireAdmin();

  const [news, { seasons, projects }, galleryItems, generations] = await Promise.all([
    getNews(),
    getProjectArchive(),
    getGalleryItems(),
    getGenerations(),
  ]);

  return (
    <>
      <PageHero
        eyebrow="Admin"
        title="AIKU 콘텐츠 관리"
        lead="프로젝트와 갤러리 항목을 등록하고 수정합니다. 저장한 항목은 사이트의 프로젝트, 갤러리 페이지에 자동으로 추가됩니다."
        aside={<LogoutButton />}
      />
      <Section>
        <div className="site-container grid gap-16">
          <NewsPanel news={news} />
          <ProjectPanel seasons={seasons} projects={projects} />
          <GalleryPanel items={galleryItems} />
          <MembersPanel generations={generations} />
        </div>
      </Section>
    </>
  );
}
