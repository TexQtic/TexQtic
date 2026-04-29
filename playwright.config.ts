// playwright.config.ts — Slice G: Visibility Policy E2E test runner config
// Run via: npx playwright test tests/e2e/catalog-visibility-policy-gating.spec.ts
// Note: @playwright/test is invoked via npx (not a project devDependency).
//       Config is exported as a plain object — no import from @playwright/test needed.
//       Playwright's runner picks up and types the object internally.

const config = {
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://app.texqtic.com',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
    screenshot: 'only-on-failure' as const,
    trace: 'retain-on-failure' as const,
  },
  projects: [
    {
      name: 'api',
      use: {}, // API-only tests — no browser launched
    },
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]] as [string, Record<string, unknown>][],
};

export default config;
