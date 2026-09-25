import type { Metadata } from "next";

import { PageHero } from "@/components/layout/PageHero";
import { Section, SectionHead } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
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
        <div className="site-container">
          <div className="grid reveal grid-cols-[minmax(0,1fr)_auto] items-center gap-8 overflow-hidden card bg-linear-to-br from-green-50 to-white p-10 max-lg:grid-cols-1 max-sm:gap-5 max-sm:p-5">
            <div>
              <span className="inline-flex h-8 items-center gap-2 rounded-full bg-white px-3 text-label text-green-800 ring-1 ring-green-500/30 ring-inset">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-green-500" />
                Recruitment
              </span>
              <h2 className="mt-4">현재 정규 모집 기간은 아닙니다.</h2>
              <p className="mt-3 max-w-[640px] text-muted">
                다음 모집 공지가 확정되면 지원 기간, 대상, 지원 링크, 선발 절차를 이곳과 공식 채널에
                업데이트합니다.
              </p>
            </div>
            <ButtonLink href={instagramUrl} variant="dark" fullWidthOnMobile={false}>
              공지 채널 보기
              <ArrowUpRightIcon className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Section className="pt-0 max-lg:pt-0">
        <div className="site-container">
          <SectionHead eyebrow="Channels" title="공식 채널" />
          <ul className="reveal divide-y divide-soft-line overflow-hidden card">
            {contactChannels.map((channel) => (
              <li key={channel.label}>
                <a
                  href={channel.href}
                  {...(channel.href.startsWith("mailto:")
                    ? {}
                    : { target: "_blank", rel: "noreferrer" })}
                  className="group grid grid-cols-[140px_minmax(0,0.9fr)_minmax(0,1fr)_20px] items-center gap-6 px-7 py-5 transition-colors hover:bg-surface-soft max-sm:grid-cols-[minmax(0,1fr)_20px] max-sm:gap-x-3 max-sm:gap-y-0.5 max-sm:px-4 max-sm:py-3.5"
                >
                  <span className="text-eyebrow text-green-700 uppercase max-sm:col-span-2">
                    {channel.label}
                  </span>
                  <strong className="font-semibold wrap-anywhere text-ink">{channel.name}</strong>
                  <span className="text-muted max-sm:order-last max-sm:col-span-2">
                    {channel.description}
                  </span>
                  <ArrowUpRightIcon className="size-5 text-line-strong transition-[color,translate] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-green-700" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}
