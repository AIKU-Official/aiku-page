import Image from "next/image";

import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ArrowRightIcon } from "@/components/ui/icons";

export function HomeHero() {
  return (
    <section
      aria-labelledby="home-title"
      className="flex min-h-[620px] items-end text-white bg-home-hero max-lg:min-h-[560px] max-sm:min-h-0"
    >
      <div className="site-container pt-32 pb-20 max-lg:pt-24 max-lg:pb-14 max-sm:pt-16 max-sm:pb-10">
        <div className="enter-0">
          <Eyebrow tone="inverse" spacing="loose">
            Korea University Deep Learning Society
          </Eyebrow>
        </div>
        {/* The wordmark is the page title; its alt text names it for assistive tech. */}
        <h1 id="home-title" className="enter-1">
          <Image
            src="/assets/aiku-logo-white.png"
            alt="AIKU"
            width={640}
            height={197}
            sizes="(max-width: 560px) 176px, (max-width: 980px) 208px, 248px"
            preload
            className="h-auto w-[248px] max-lg:w-[208px] max-sm:w-[148px]"
          />
        </h1>
        <p className="mt-8 max-w-[620px] enter-2 text-[1.3125rem] leading-[1.6] font-medium tracking-[-0.02em] text-white/85 max-sm:mt-5 max-sm:text-lead">
          고려대학교 딥러닝 학회 AIKU는 딥러닝을 공부하고자 하는 <br className="max-sm:hidden" />
          고려대학교 학생들이 모여 지식을 공유하고, 소통하며 성장하는 곳입니다.
        </p>
        <div
          className="mt-10 flex enter-3 flex-wrap gap-3 max-sm:mt-7 max-sm:grid max-sm:grid-cols-2 max-sm:gap-2"
          role="group"
          aria-label="바로가기"
        >
          <ButtonLink href="/about" variant="primary">
            AIKU 소개
            <ArrowRightIcon className="size-4" />
          </ButtonLink>
          <ButtonLink href="/contact" variant="light">
            컨택
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
