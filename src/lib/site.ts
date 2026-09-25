export const siteName = "AIKU";
export const siteTitle = "AIKU | 고려대학교 딥러닝 학회";
export const siteDescription = "고려대학교 딥러닝 학회 AIKU 공식 웹사이트입니다.";
export const siteOgDescription =
  "지식 공유와 프로젝트를 통해 함께 성장하는 고려대학교 딥러닝 학회 AIKU";
export const themeColor = "#21D081";

export type NavItem = {
  href: string;
  label: string;
  prefetch?: boolean;
  /** Secondary link (login), shown apart from the main menu. */
  utility?: boolean;
  /** Extra paths on which this item is shown as the current page. */
  alsoActiveOn?: string[];
};

export const navItems: NavItem[] = [
  { href: "/about", label: "About" },
  { href: "/activities", label: "Activity" },
  { href: "/curriculum", label: "Curriculum" },
  { href: "/projects", label: "Projects" },
  { href: "/members", label: "Members" },
  { href: "/contact", label: "Contact" },
  { href: "/login", label: "Login", prefetch: false, utility: true, alsoActiveOn: ["/admin"] },
];

export const instagramUrl = "https://www.instagram.com/aiku._.official/";

export const contactChannels = [
  {
    label: "GitHub",
    name: "AIKU-Official",
    description: "프로젝트 저장소와 코드 기록",
    href: "https://github.com/AIKU-Official",
  },
  {
    label: "Instagram",
    name: "@aiku._.official",
    description: "모집 공지와 활동 소식",
    href: instagramUrl,
  },
  {
    label: "YouTube",
    name: "@AIKU_KOREA_UNIV",
    description: "세미나와 행사 영상 콘텐츠",
    href: "https://www.youtube.com/@AIKU_KOREA_UNIV",
  },
  {
    label: "LinkedIn",
    name: "aiku-korea",
    description: "AIKU의 외부 네트워크와 활동 이력",
    href: "https://www.linkedin.com/in/aiku-korea/",
  },
  {
    label: "KakaoTalk",
    name: "AIKU 카카오톡 채널",
    description: "카카오톡 채널을 통한 공지와 문의",
    href: "https://pf.kakao.com/_aeDuG",
  },
  {
    label: "Email",
    name: "ku.deepintodeep@gmail.com",
    description: "공식 문의 메일",
    href: "mailto:ku.deepintodeep@gmail.com",
  },
];
