import { defineConfig, devices } from '@playwright/test';

/**
 * Learner journeys in a real browser against a throwaway local Supabase stack
 * (tests/e2e/support/stack.ts). Never a hosted project, never real learners.
 *
 * Local run:
 *   supabase start
 *   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<supabase status> npm run build
 *   npx playwright test
 * CI: the `e2e` job in .github/workflows/ci.yml (gates every production release).
 */
const port = Number(process.env.E2E_PORT ?? 4400);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // Journeys share one database and server; run them one at a time.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chrome-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Safari's engine at phone size for the sign-in gate (Safari quirks matter to the owner).
    { name: 'safari-phone', use: { ...devices['iPhone 13'] }, testMatch: /gate\.spec\.ts/ },
  ],
  webServer: {
    command: 'npx tsx tests/e2e/support/serve.ts',
    url: `http://127.0.0.1:${port}/healthz`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
