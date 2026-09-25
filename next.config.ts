import type { NextConfig } from "next";

// Old static-site URLs keep working; browsers carry the #hash across redirects,
// so deep links like /activities.html#activity-seminar land on the same anchor.
const legacyPages = ["about", "activities", "curriculum", "projects", "contact", "login", "admin"];

// Uploaded images (project images, member photos) are served from Supabase Storage.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
  : null;
const isLocalSupabase =
  supabaseUrl !== null && ["127.0.0.1", "localhost"].includes(supabaseUrl.hostname);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol === "https:" ? "https" : "http",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/aiku-uploads/**",
          },
        ]
      : [],
    // Next.js refuses to optimize images from local IPs by default; allow it
    // only when developing against the local Supabase stack.
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // The admin must not be framed by other sites (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      ...legacyPages.map((page) => ({
        source: `/${page}.html`,
        destination: `/${page}`,
        permanent: true,
      })),
      { source: "/alumni.html", destination: "/members", permanent: true },
      { source: "/alumni", destination: "/members", permanent: true },
    ];
  },
};

export default nextConfig;
