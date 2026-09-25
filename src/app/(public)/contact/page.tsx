import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { Section, SectionHead } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { contactChannels, instagramUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "컨택",
  description: "AIKU 모집 안내와 공식 컨택 채널을 확인하세요.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="AIKU 컨택"
        lead="모집 안내, 공식 채널, 문의 메일을 한곳에서 확인할 수 있습니다."
      />

      <Section>
        <div className="site-container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-8 rounded-card border border-line bg-surface p-8 max-lg:grid-cols-1 max-sm:p-5">
          <div>
            <span className="inline-flex min-h-[30px] items-center rounded-full bg-surface-mint px-2.5 text-[0.86rem] font-extrabold text-on-mint">
              Recruitment
            </span>
            <h2 className="mt-3">현재 정규 모집 기간은 아닙니다.</h2>
            <p className="mt-3 max-w-[660px] text-muted">
              다음 모집 공지가 확정되면 지원 기간, 대상, 지원 링크, 선발 절차를 이곳과 공식 채널에
              업데이트합니다.
            </p>
          </div>
          <ButtonLink
            href={instagramUrl}
            variant="dark"
            fullWidthOnMobile={false}
            className="max-lg:w-fit"
          >
            공지 채널 보기
          </ButtonLink>
        </div>
      </Section>

      <Section>
        <div className="site-container">
          <SectionHead eyebrow="Channels" title="공식 채널" />
        </div>
        <div className="site-container grid gap-3">
          {contactChannels.map((channel) => (
            <a
              key={channel.label}
              href={channel.href}
              {...(channel.href.startsWith("mailto:")
                ? {}
                : { target: "_blank", rel: "noreferrer" })}
              className="grid grid-cols-[140px_minmax(0,0.9fr)_minmax(0,1fr)] items-start gap-6 border-b border-soft-line py-6 text-body transition-colors first:border-t hover:text-brand-deep focus-visible:text-brand-deep max-sm:grid-cols-1 max-sm:gap-2 max-sm:py-5"
            >
              <span className="text-[0.86rem] font-[850] text-brand">{channel.label}</span>
              <strong className="wrap-anywhere text-ink">{channel.name}</strong>
              <p className="text-muted">{channel.description}</p>
            </a>
          ))}
        </div>
      </Section>
    </>
  );
}
