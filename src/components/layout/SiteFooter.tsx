import Image from "next/image";
import Link from "next/link";

import { contactChannels } from "@/lib/site";

const footerChannels = contactChannels.filter((channel) =>
  ["GitHub", "Instagram", "YouTube", "LinkedIn"].includes(channel.label),
);

// Logo heights are inline so the logos keep their size even before the
// stylesheet applies. They shrink with the viewport so all three logos fit on
// one row on phones, and reach the desktop size (the width/height props) from
// about 480px up.
const aikuLogoHeight = "clamp(20px, 5.4vw, 26px)";

// Official affiliation logos, shown as provided by the university.
const affiliations = [
  {
    name: "고려대학교",
    href: "https://www.korea.ac.kr",
    src: "/assets/globalsymbol_eng2_large.gif",
    width: 110,
    height: 36,
    displayHeight: "clamp(26px, 7.2vw, 36px)",
  },
  {
    name: "고려대학교 정보대학",
    href: "https://info.korea.ac.kr",
    src: "/assets/ku-informatics-logo.svg",
    // Slightly taller than the other logo: its small text needs it to match visually.
    width: 134,
    height: 40,
    displayHeight: "clamp(29px, 8vw, 40px)",
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-soft-line">
      <div className="site-container grid gap-10 py-14 max-sm:gap-6 max-sm:py-8">
        <div className="flex items-center justify-between gap-8 max-lg:flex-col max-lg:items-start">
          <div className="flex items-center gap-7 max-sm:gap-3">
            <Link href="/" aria-label="AIKU 홈으로 이동" className="shrink-0">
              <Image
                src="/assets/aiku-logo-green.png"
                alt="AIKU"
                width={84}
                height={26}
                style={{ width: "auto", height: aikuLogoHeight }}
                className="block"
              />
            </Link>
            <span aria-hidden="true" className="h-8 w-px shrink-0 bg-line max-sm:h-6" />
            <ul className="flex items-center gap-6 max-sm:gap-3" aria-label="소속">
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
                      style={{ width: "auto", height: affiliation.displayHeight }}
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
