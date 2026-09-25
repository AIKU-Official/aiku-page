import { defineConfig, devices } from "@playwright/test";

// Smoke tests against a running production build with the local Supabase
// stack and its sample data (supabase/seed.sql):
//   pnpm db:start && pnpm db:reset && pnpm build && pnpm test:e2e
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm start", url: baseURL, reuseExistingServer: true, timeout: 60_000 },
});
