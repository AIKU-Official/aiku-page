import Image from "next/image";
import Link from "next/link";

import { contactChannels } from "@/lib/site";

const footerChannels = contactChannels.filter((channel) =>
  ["GitHub", "Instagram", "YouTube", "LinkedIn"].includes(channel.label),
);

// Official affiliation logos, shown as provided by the university. width and
// height are the rendered size, so the logos keep their size even before the
// stylesheet applies.
const affiliations = [
  {
    name: "고려대학교",
    href: "https://www.korea.ac.kr",
    src: "/assets/globalsymbol_eng2_large.gif",
    width: 110,
    height: 36,
  },
  {
    name: "고려대학교 정보대학",
    href: "https://info.korea.ac.kr",
    src: "/assets/ku-informatics-logo.svg",
    // Slightly taller than the other logo: its small text needs it to match visually.
    width: 134,
    height: 40,
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-soft-line">
      <div className="site-container grid gap-10 py-14 max-sm:gap-6 max-sm:py-8">
        <div className="flex items-center justify-between gap-8 max-lg:flex-col max-lg:items-start">
          <div className="flex items-center gap-7 max-sm:flex-col max-sm:items-start max-sm:gap-5">
            <Link href="/" aria-label="AIKU 홈으로 이동" className="shrink-0">
              <Image
                src="/assets/aiku-logo-green.png"
                alt="AIKU"
                width={84}
                height={26}
                className="block h-[26px] w-[84px]"
              />
            </Link>
            <span aria-hidden="true" className="h-8 w-px bg-line max-sm:hidden" />
            <ul className="flex items-center gap-6" aria-label="소속">
              {affiliations.map((affiliation) => (
                <li key={affiliation.name}>
                  <a
                    href={affiliation.href}
                    target="_blank"
                    rel="noreferrer"
                    className="block opacity-90 transition-opacity hover:opacity-100"
                  >
                    <Image
                      src={affiliation.src}
                      alt={affiliation.name}
                      width={affiliation.width}
                      height={affiliation.height}
                      unoptimized={affiliation.src.endsWith(".svg")}
                      style={{ width: affiliation.width, height: affiliation.height }}
                      className="block"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="공식 채널">
            {footerChannels.map((channel) => (
              <li key={channel.label}>
                <a
                  href={channel.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-small font-medium text-muted transition-colors hover:text-ink"
                >
                  {channel.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-between gap-4 border-t border-soft-line pt-6 text-small text-muted max-sm:flex-col max-sm:gap-1">
          <p>고려대학교 딥러닝 학회 AIKU</p>
          <p>© {new Date().getFullYear()} AIKU. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
