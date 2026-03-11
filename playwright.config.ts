import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "bash -lc './scripts/start-e2e-backend.sh'",
      url: "http://127.0.0.1:8787/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "bash -lc 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-pk_test_placeholder} CLERK_SECRET_KEY=${CLERK_SECRET_KEY:-sk_test_placeholder} NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 INTERNAL_API_URL=http://127.0.0.1:8787 pnpm --filter @daton/web dev'",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
