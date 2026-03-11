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
        "bash -lc 'docker compose up -d postgres && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/daton pnpm db:migrate && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/daton WORKOS_API_KEY=sk_test_test-api-key WORKOS_CLIENT_ID=client_test_123456789 NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 CORS_ORIGIN=http://127.0.0.1:3000 ALLOW_FICTIONAL_CNPJ=true pnpm --filter @daton/backend dev'",
      url: "http://127.0.0.1:8787/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command:
        "bash -lc 'WORKOS_API_KEY=sk_test_test-api-key WORKOS_CLIENT_ID=client_test_123456789 DATON_SESSION_SECRET=test-session-secret-1234567890 NEXT_PUBLIC_API_URL=http://127.0.0.1:8787 NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000 INTERNAL_API_URL=http://127.0.0.1:8787 pnpm --filter @daton/web dev'",
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
