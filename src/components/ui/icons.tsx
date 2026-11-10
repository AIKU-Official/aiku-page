import type { SVGProps } from "react";

// Small stroke icons (24px grid, currentColor) shared across the site.

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const ArrowRightIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </svg>
);

export const ArrowUpRightIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M7 17 17 7" />
    <path d="M8 7h9v9" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const DownloadIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

export const GitHubIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.73c-2.78.62-3.37-1.2-3.37-1.2-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.56 2.36 1.11 2.94.85.09-.67.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.03 0-1.11.39-2.02 1.03-2.73-.1-.26-.45-1.29.1-2.69 0 0 .84-.28 2.75 1.04A9.3 9.3 0 0 1 12 6.83c.85 0 1.7.12 2.5.34 1.9-1.32 2.74-1.04 2.74-1.04.55 1.4.2 2.43.1 2.69.65.71 1.03 1.62 1.03 2.73 0 3.9-2.34 4.76-4.57 5.02.36.32.68.94.68 1.9v2.54c0 .26.18.58.69.48A10 10 0 0 0 12 2Z" />
  </svg>
);

export const MailIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const LinkedInIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M6.8 9.5h3v9.7h-3V9.5Zm1.5-4.8a1.74 1.74 0 1 1 0 3.48 1.74 1.74 0 0 1 0-3.48Zm3.6 4.8h2.88v1.33h.04c.4-.76 1.38-1.57 2.84-1.57 3.04 0 3.6 2 3.6 4.6v5.34h-3v-4.74c0-1.13-.02-2.58-1.57-2.58-1.57 0-1.81 1.23-1.81 2.5v4.82h-3V9.5Z" />
  </svg>
);

export const GlobeIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.3 2.45 3.45 5.45 3.45 9S14.3 18.55 12 21" />
    <path d="M12 3c-2.3 2.45-3.45 5.45-3.45 9S9.7 18.55 12 21" />
  </svg>
);

export const SearchIcon = (props: IconProps) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

/** Google "G" mark in its brand colours (fixed fills, not currentColor). */
export const GoogleIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden {...props}>
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.27a12 12 0 0 0 0 10.76l4-3.1Z"
    />
    <path
      fill="#EA4335"
      d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.62l4 3.1C6.22 6.87 8.87 4.76 12 4.76Z"
    />
  </svg>
);
