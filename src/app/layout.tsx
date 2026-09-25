import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { publicEnv } from "@/lib/env.public";
import { siteName, siteOgDescription, siteDescription, siteTitle, themeColor } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: siteTitle, template: `%s | ${siteName}` },
  description: siteDescription,
  icons: {
    icon: [{ url: "/assets/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/assets/favicon-180.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName,
    title: siteTitle,
    description: siteOgDescription,
    images: [{ url: "/assets/aiku-symbol-square.png", width: 512, height: 512 }],
  },
};

export const viewport: Viewport = {
  themeColor,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
