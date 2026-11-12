import Image from "next/image";

/**
 * Studio's own hero: the home page's green background and white wordmark,
 * followed by "Studio" in white, so the members' home feels like the site's
 * home. Same height as other page heroes.
 */
export function StudioHero() {
  return (
    <section
      aria-labelledby="studio-title"
      className="flex min-h-[412px] items-end text-white bg-home-hero max-lg:min-h-[335px] max-sm:min-h-0"
    >
      <div className="site-container pt-28 pb-20 max-lg:pt-20 max-lg:pb-14 max-sm:pt-12 max-sm:pb-10">
        <h1 id="studio-title" className="flex enter-0 items-center gap-7 max-lg:gap-6 max-sm:gap-3">
          <Image
            src="/assets/aiku-logo-white.png"
            alt="AIKU"
            width={640}
            height={197}
            sizes="(max-width: 560px) 118px, (max-width: 980px) 166px, 198px"
            preload
            className="h-auto w-[198px] max-lg:w-[166px] max-sm:w-[118px]"
          />
          <span className="text-[5.2rem] leading-[0.8] font-extrabold tracking-[-0.04em] text-white max-lg:text-[4.4rem] max-sm:text-[3.1rem]">
            Studio
          </span>
        </h1>
        <p className="mt-6 max-w-[620px] enter-1 text-lead text-white/85 max-sm:mt-4">
          학회원을 위한 활동 공간입니다. 이번 시즌 일정과 활동을 한곳에서 봅니다.
        </p>
      </div>
    </section>
  );
}
