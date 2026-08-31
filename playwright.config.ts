import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Google Chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome", // Uses installed native ARM64 Google Chrome
      },
    },
    {
      name: "Microsoft Edge",
      use: {
        ...devices["Desktop Edge"],
        channel: "msedge", // Uses installed native ARM64 Microsoft Edge
      },
    },
  ],
  // `npm run dev` reads DATABASE_URL (and SESSION_COOKIE_SECRET / STORAGE_DIR)
  // from .env.local — copy .env.local.example and point it at a local
  // Postgres that has had `npm run db:setup` applied.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
