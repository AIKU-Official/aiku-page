import type { MetadataRoute } from "next";

import { siteName, themeColor } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: siteName,
    icons: [
      { src: "/assets/favicon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/favicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: themeColor,
    background_color: "#ffffff",
    display: "standalone",
  };
}
