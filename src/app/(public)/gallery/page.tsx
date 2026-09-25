import type { Metadata } from "next";

import { GalleryCard } from "@/components/gallery/GalleryCard";
import { PageHero } from "@/components/layout/PageHero";
import { Section } from "@/components/layout/Section";
import { getGalleryItems } from "@/lib/data/public";
import { storagePublicUrl } from "@/lib/storage/public-url";

export const metadata: Metadata = {
  title: "갤러리",
  description: "AIKU의 활동 사진과 기록을 모아두는 갤러리입니다.",
};

export const revalidate = 3600;

export default async function GalleryPage() {
  const items = await getGalleryItems();

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="AIKU의 활동을 기록하는 공간"
        lead="컨퍼런스, 세미나, 프로젝트, 네트워킹 행사 등 AIKU의 순간들을 모아두는 갤러리입니다."
      />

      <Section>
        <div className="site-container grid grid-cols-3 gap-4 max-lg:grid-cols-1">
          <GalleryCard
            feature
            category="AIKU"
            title="AIKU 활동 아카이브"
            description="학기별 활동 사진과 행사 기록을 차근차근 모아갑니다."
            imageUrl="/assets/aiku-gradient-bg.png"
          />
          {items.map((item) => (
            <GalleryCard
              key={item.id}
              category={item.category}
              title={item.title}
              description={item.description}
              imageUrl={item.imagePath ? storagePublicUrl(item.imagePath) : null}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
