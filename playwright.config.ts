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
      command:
        "bash -lc 'cp apps/api/.dev.vars.test apps/api/.dev.vars && docker compose up -d postgres && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/daton pnpm db:migrate && pnpm --filter @daton/api dev'",
      url: "http://127.0.0.1:8787/api/auth/ok",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "bash -lc 'NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 pnpm --filter @daton/web dev'",
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
