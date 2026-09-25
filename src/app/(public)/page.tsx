import { HomeHero } from "@/components/home/HomeHero";
import { LinkPanel } from "@/components/home/LinkPanel";
import { NewsList } from "@/components/home/NewsList";
import { Section, SectionHead } from "@/components/layout/Section";
import { getNews } from "@/lib/data/public";

// Refreshed on demand after admin edits; hourly as a safety net.
export const revalidate = 3600;

const homeLinks = [
  {
    href: "/activities",
    label: "Activity",
    title: "스터디, 세미나, 프로젝트",
    description: "배운 것을 공유하고 실제 결과물로 연결합니다.",
  },
  {
    href: "/curriculum",
    label: "Curriculum",
    title: "주니어와 시니어 트랙",
    description: "방학과 학기 중 활동 흐름을 한눈에 확인합니다.",
  },
  {
    href: "/projects",
    label: "Projects",
    title: "분기별 우수 프로젝트",
    description: "문제의식, 접근 방식, 발표자료, GitHub 링크를 함께 살펴봅니다.",
  },
  {
    href: "/gallery",
    label: "Gallery",
    title: "AIKU 활동 갤러리",
    description: "컨퍼런스, 프로젝트, 네트워킹의 순간을 모아둡니다.",
  },
  {
    href: "/members",
    label: "Members",
    title: "기수별 학회원 네트워크",
    description: "활동 중인 학회원과 AIKU를 거쳐간 멤버들의 프로필과 연결 링크를 정리합니다.",
  },
  {
    href: "/contact",
    label: "Contact",
    title: "모집 안내와 공식 채널",
    description: "지원 일정, 문의 채널, AIKU의 소식을 함께 확인할 수 있습니다.",
  },
];

export default async function HomePage() {
  const news = await getNews();

  return (
    <>
      <HomeHero />

      <Section>
        <div className="site-container grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 max-lg:grid-cols-1">
          {homeLinks.map((link) => (
            <LinkPanel key={link.href} {...link} />
          ))}
        </div>
      </Section>

      <Section soft>
        <div className="site-container">
          <SectionHead eyebrow="News" title="최근 소식" />
          <NewsList items={news} />
        </div>
      </Section>
    </>
  );
}
