import { defineConfig } from 'vitest/config';

// ENV-TUNABLE: Set TEST_DB_TIMEOUT_MS to increase timeouts on slow/remote DB.
// CI uses Supabase pooler which may add 2-5s per query round-trip.
// Default 15 000ms gives 3× headroom over a typical 5s Supabase cold query.
const DB_TIMEOUT_MS = parseInt(process.env.TEST_DB_TIMEOUT_MS ?? '15000');

export default defineConfig({
  // Allow Vite's file server to access files in the monorepo root.
  // Required for root-level test files that use `/** @vitest-environment jsdom */`;
  // without this, Vite blocks /@fs/ access to paths outside server/.
  server: {
    fs: {
      allow: ['..'],
    },
  },
  // Force a single vitest instance across the monorepo.
  // Root node_modules/vitest and server/node_modules/vitest are two separate
  // copies. @testing-library/jest-dom/vitest resolves `vitest` from the root
  // copy (hoisted), so expect.extend registers on root's expect — not server's.
  // dedupe forces Vite to always serve vitest from one canonical location so
  // jest-dom's extend and the test-file expect are the same object.
  resolve: {
    dedupe: ['vitest'],
  },
  test: {
    // ── Setup ───────────────────────────────────────────────────────────────
    // Register @testing-library/jest-dom custom matchers (toBeDisabled, etc.)
    // for root-level .tsx tests run under server vitest with jsdom environment.
    setupFiles: ['../tests/setupTests.ts'],
    // ── Concurrency ─────────────────────────────────────────────────────────
    // Run test files sequentially (Supabase PgBouncer session-mode cannot
    // handle parallel connections from multiple test workers).
    // fileParallelism=false is sufficient; singleFork is intentionally omitted
    // because it collapses all files into one worker process — a crash in any
    // test file kills the entire suite.
    fileParallelism: false,

    // ── Timeouts ────────────────────────────────────────────────────────────
    // testTimeout: max time per individual `it()` block.
    // hookTimeout: max time for beforeAll/afterAll/beforeEach/afterEach.
    // teardownTimeout: max time for global teardown.
    testTimeout: DB_TIMEOUT_MS,
    hookTimeout: DB_TIMEOUT_MS,
    teardownTimeout: 10_000,

    // ── Discovery ───────────────────────────────────────────────────────────
    include: [
      'src/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'src/services/ai/__tests__/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'src/routes/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'src/tests/aggregator-discovery-read.integration.test.ts',
      'tests/rfq-detail-route.shared.test.ts',
      '../tests/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],

    // Exclude compiled dist output — duplicates of src tests.
    // GATE-TEST-001: exclude dist from test discovery.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'dist/**',
      '../tests/frontend/**',
    ],
  },
});
