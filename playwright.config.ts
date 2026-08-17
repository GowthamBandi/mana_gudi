import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  // The live suite targets the deployed site and expects an empty production
  // database, so it must not run against the seeded local environment.
  // Run it explicitly:
  //   E2E_BASE_URL=https://temple-seva-platform.web.app npx playwright test tests/e2e/live-public.spec.ts
  testIgnore: process.env.E2E_BASE_URL ? [] : ["**/live-public.spec.ts"],
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
