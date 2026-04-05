import { defineConfig } from 'vitest/config';

// ENV-TUNABLE: Set TEST_DB_TIMEOUT_MS to increase timeouts on slow/remote DB.
// CI uses Supabase pooler which may add 2-5s per query round-trip.
// Default 15 000ms gives 3× headroom over a typical 5s Supabase cold query.
const DB_TIMEOUT_MS = parseInt(process.env.TEST_DB_TIMEOUT_MS ?? '15000');

export default defineConfig({
  test: {
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
    ],
  },
});
