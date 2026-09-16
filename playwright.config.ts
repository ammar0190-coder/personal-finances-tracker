import { defineConfig, devices } from "@playwright/test";
import {
  E2E_SUPABASE_PUBLISHABLE_KEY,
  E2E_SUPABASE_SECRET_KEY,
  E2E_SUPABASE_URL,
  assertLocalSupabase,
} from "./tests/e2e/support/local-supabase";

// Fail before anything starts if the suite is aimed at a hosted project.
assertLocalSupabase();

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Runs against a dev server this config starts itself, never an existing one:
 * a normal `npm run dev` reads .env.local, which may point at production.
 * Environment variables set here take precedence over .env.local, so the
 * server's only Supabase settings are the local ones below. Its build output
 * goes to .next-e2e so it can run beside a normal dev server.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 900 },
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: `${BASE_URL}/auth/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SUPABASE_URL: E2E_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: E2E_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SECRET_KEY: E2E_SUPABASE_SECRET_KEY,
    },
  },
});
