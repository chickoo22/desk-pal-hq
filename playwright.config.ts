import { defineConfig, devices } from "@playwright/test";
import { env } from "./e2e/helpers/env";

// E2E runs against a live Supabase project and a single shared seeded company,
// so tests run serially (one worker) to avoid cross-test interference.
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: env.BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: env.BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
