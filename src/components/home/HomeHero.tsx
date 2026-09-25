import Image from "next/image";

import { ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

export function HomeHero() {
  return (
    <section
      aria-labelledby="home-title"
      className="flex min-h-[560px] items-end text-white bg-home-hero max-lg:min-h-[520px] max-sm:min-h-[500px]"
    >
      <div className="site-container pt-28 pb-[68px] max-lg:pt-[88px] max-lg:pb-14">
        <Image
          src="/assets/aiku-logo-white.png"
          alt=""
          aria-hidden
          width={128}
          height={39}
          preload
          className="mb-11 h-auto w-32 max-lg:mb-8 max-lg:w-[108px]"
        />
        <Eyebrow>Korea University Deep Learning Society</Eyebrow>
        <h1
          id="home-title"
          className="max-w-[720px] text-[3.35rem] leading-[1.12] font-black text-white max-lg:text-[2.6rem] max-sm:text-[2.25rem]"
        >
          AIKU
        </h1>
        <p className="mt-5 max-w-[670px] text-[1.08rem] font-medium text-white/82">
          고려대학교 딥러닝 학회 AIKU는 딥러닝을 공부하고자 하는 <br /> 고려대학교 학생들이 모여
          지식을 공유하고, 소통하며 성장하는 곳입니다.
        </p>
        <div className="mt-7 flex flex-wrap gap-2.5 max-sm:grid" role="group" aria-label="바로가기">
          <ButtonLink href="/about" variant="primary">
            AIKU 소개
          </ButtonLink>
          <ButtonLink href="/contact" variant="light">
            컨택
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
