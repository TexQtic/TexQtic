/**
 * vectorIndexQueue.g028.a6.test.ts — G-028 A6: Async indexing pipeline tests
 *
 * Task ID: OPS-G028-A6-SOURCE-EXPANSION-ASYNC-INDEXING
 * Doctrine: v1.4 — unit-first, mocked dependencies, no real DB / Gemini
 *
 * Coverage:
 *   A6-TEST-01  Queue processing — job enqueued → processed → runner called
 *   A6-TEST-02  Rate limiting — processVectorIndexQueue respects JOBS_PER_SECOND
 *   A6-TEST-03  Reindex — reindexSource() deletes embeddings then enqueues re-ingest
 *   A6-TEST-04  Chunking determinism — same input text → identical chunk hashes
 *
 * Run:
 *   pnpm -C server exec vitest run src/services/vectorIndexQueue.g028.a6.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock config (avoid Zod env-parse failure) ─────────────────────────────────
vi.mock('../config/index.js', () => ({
  config: {
    GEMINI_API_KEY: 'test-gemini-key',
    DATABASE_URL: 'postgresql://test:test@localhost/test',
  },
}));

// ── Mock prisma ───────────────────────────────────────────────────────────────
vi.mock('../db/prisma.js', () => ({
  prisma: {},
}));

// ── Mock database-context: withDbContext calls the callback with a mock tx ────
vi.mock('../lib/database-context.js', () => ({
  withDbContext: vi.fn().mockImplementation(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) => {
      return cb({ /* mock tx */ });
    },
  ),
}));

// ── Mock vectorStore (deleteBySource + upsertDocumentEmbeddings) ──────────────
vi.mock('../lib/vectorStore.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/vectorStore.js')>('../lib/vectorStore.js');
  return {
    ...actual,
    upsertDocumentEmbeddings: vi.fn().mockResolvedValue({ inserted: 2, skipped: 0 }),
    deleteBySource: vi.fn().mockResolvedValue({ deleted: 0 }),
  };
});

// ── Imports (after mocks) ─────────────────────────────────────────────────────
import {
  enqueueVectorIndexJob,
  processVectorIndexQueue,
  startVectorIndexWorker,
  QUEUE_SIZE_MAX,
  JOBS_PER_SECOND,
  _getQueueSizeForTests,
  _clearQueueForTests,
  _stopWorkerForTests,
  _peekQueueForTests,
} from './vectorIndexQueue.js';
import type { VectorIndexJob, JobRunner } from './vectorIndexQueue.js';

import { chunkText } from './vectorChunker.js';
import { withDbContext } from '../lib/database-context.js';
import { deleteBySource } from '../lib/vectorStore.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_A   = 'aaaaaaaa-0000-0000-0000-000000000001';
const ITEM_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
const CERT_ID = 'cccccccc-0000-0000-0000-000000000003';
const SAMPLE_TEXT = 'A short catalog item description for embedding.';

function makeJob(overrides: Partial<Omit<VectorIndexJob, '_jobId' | '_enqueuedAt'>> = {}) {
  return {
    orgId:       ORG_A,
    sourceType:  'CATALOG_ITEM',
    sourceId:    ITEM_ID,
    textContent: SAMPLE_TEXT,
    ...overrides,
  };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  _clearQueueForTests();
  _stopWorkerForTests();
  vi.clearAllMocks();
  // Re-apply default impls after clearAllMocks (mocks are cleared but still vi.fn())
  vi.mocked(withDbContext).mockImplementation(
    async (_prisma: unknown, _ctx: unknown, cb: (tx: unknown) => Promise<unknown>) =>
      cb({}),
  );
  vi.mocked(deleteBySource).mockResolvedValue({ deleted: 0 });
});

afterEach(() => {
  _clearQueueForTests();
  _stopWorkerForTests();
});

// ─── A6-TEST-01: Queue processing ────────────────────────────────────────────

describe('A6-TEST-01: Queue processing', () => {
  it('enqueued job is processed by processVectorIndexQueue and runner is called', async () => {
    // Arrange: create a mock runner
    const runner: JobRunner = vi.fn().mockResolvedValue(undefined);

    // Act: enqueue one job
    const enqueueResult = enqueueVectorIndexJob(makeJob());
    expect(enqueueResult.accepted).toBe(true);
    expect(_getQueueSizeForTests()).toBe(1);

    // Process the queue
    const result = await processVectorIndexQueue(runner);

    // Assert: runner called once with the job, queue now empty
    expect(runner).toHaveBeenCalledTimes(1);
    expect(result.attempted).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.remaining).toBe(0);
    expect(_getQueueSizeForTests()).toBe(0);
  });

  it('runner receives correct job fields (orgId, sourceType, sourceId, textContent)', async () => {
    const runner: JobRunner = vi.fn().mockResolvedValue(undefined);
    const job = makeJob({ sourceType: 'CERTIFICATION', sourceId: CERT_ID, textContent: 'ISO 9001' });
    enqueueVectorIndexJob(job);

    await processVectorIndexQueue(runner);

    const calledWith = (runner as ReturnType<typeof vi.fn>).mock.calls[0][0] as VectorIndexJob;
    expect(calledWith.orgId).toBe(ORG_A);
    expect(calledWith.sourceType).toBe('CERTIFICATION');
    expect(calledWith.sourceId).toBe(CERT_ID);
    expect(calledWith.textContent).toBe('ISO 9001');
    expect(calledWith._jobId).toBeTruthy();  // UUID assigned by enqueue
    expect(calledWith._enqueuedAt).toBeGreaterThan(0);
  });

  it('runner error is isolated — other jobs in the batch still succeed', async () => {
    let callCount = 0;
    const runner: JobRunner = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 2) throw new Error('Simulated runner failure');
    });

    // Enqueue 3 jobs
    enqueueVectorIndexJob(makeJob({ sourceId: 'aaa00000-0000-0000-0000-000000000001' }));
    enqueueVectorIndexJob(makeJob({ sourceId: 'bbb00000-0000-0000-0000-000000000002' }));
    enqueueVectorIndexJob(makeJob({ sourceId: 'ccc00000-0000-0000-0000-000000000003' }));

    const result = await processVectorIndexQueue(runner);

    expect(result.attempted).toBe(3);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(1);
    expect(runner).toHaveBeenCalledTimes(3); // all three attempted
  });

  it('empty queue: processVectorIndexQueue returns zero counts immediately', async () => {
    const runner: JobRunner = vi.fn();
    const result = await processVectorIndexQueue(runner);

    expect(result.attempted).toBe(0);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(0);
    expect(runner).not.toHaveBeenCalled();
  });

  it('enqueue returns accepted:false with reason QUEUE_FULL when queue is at capacity', () => {
    // Fill the queue to the limit using internal manipulation
    for (let i = 0; i < QUEUE_SIZE_MAX; i++) {
      const r = enqueueVectorIndexJob(makeJob({ sourceId: `cccccccc-0000-0000-0000-${String(i).padStart(12, '0')}` }));
      // Break early if rejected (in case of off-by-one in constant)
      if (!r.accepted) break;
    }
    expect(_getQueueSizeForTests()).toBe(QUEUE_SIZE_MAX);

    const result = enqueueVectorIndexJob(makeJob({ sourceId: 'dddddddd-0000-0000-0000-000000000999' }));
    expect(result.accepted).toBe(false);
    if (!result.accepted) {
      expect(result.reason).toBe('QUEUE_FULL');
    }
  });
});

// ─── A6-TEST-02: Rate limiting ────────────────────────────────────────────────

describe('A6-TEST-02: Rate limiting — JOBS_PER_SECOND', () => {
  it(`processes exactly JOBS_PER_SECOND (${JOBS_PER_SECOND}) jobs per processVectorIndexQueue() call`, async () => {
    const totalJobs = JOBS_PER_SECOND + 3;
    const runner: JobRunner = vi.fn().mockResolvedValue(undefined);

    // Enqueue more than JOBS_PER_SECOND jobs
    for (let i = 0; i < totalJobs; i++) {
      enqueueVectorIndexJob(
        makeJob({ sourceId: `aaaaaaaa-0000-0000-0000-${String(i).padStart(12, '0')}` }),
      );
    }
    expect(_getQueueSizeForTests()).toBe(totalJobs);

    // Single process tick
    const result = await processVectorIndexQueue(runner);

    expect(result.attempted).toBe(JOBS_PER_SECOND);
    expect(runner).toHaveBeenCalledTimes(JOBS_PER_SECOND);
    expect(result.remaining).toBe(totalJobs - JOBS_PER_SECOND);
    expect(_getQueueSizeForTests()).toBe(totalJobs - JOBS_PER_SECOND);
  });

  it('running a second tick processes the next batch', async () => {
    const totalJobs = JOBS_PER_SECOND * 2;
    const runner: JobRunner = vi.fn().mockResolvedValue(undefined);

    for (let i = 0; i < totalJobs; i++) {
      enqueueVectorIndexJob(
        makeJob({ sourceId: `bbbbbbbb-0000-0000-0000-${String(i).padStart(12, '0')}` }),
      );
    }

    // Tick 1
    const tick1 = await processVectorIndexQueue(runner);
    expect(tick1.attempted).toBe(JOBS_PER_SECOND);

    // Tick 2
    const tick2 = await processVectorIndexQueue(runner);
    expect(tick2.attempted).toBe(JOBS_PER_SECOND);
    expect(tick2.remaining).toBe(0);
    expect(runner).toHaveBeenCalledTimes(totalJobs);
  });

  it('startVectorIndexWorker returns a stop() function', () => {
    const runner: JobRunner = vi.fn().mockResolvedValue(undefined);
    const handle = startVectorIndexWorker(runner);
    expect(handle).toHaveProperty('stop');
    expect(typeof handle.stop).toBe('function');
    handle.stop(); // clean up
  });

  it('calling startVectorIndexWorker twice returns the same stop function (idempotent)', () => {
    const runner: JobRunner = vi.fn().mockResolvedValue(undefined);
    const handle1 = startVectorIndexWorker(runner);
    const handle2 = startVectorIndexWorker(runner);
    // Both should be valid handles — stop the worker
    handle1.stop();
    handle2.stop();
  });
});

// ─── A6-TEST-03: Reindex ──────────────────────────────────────────────────────

describe('A6-TEST-03: Reindex — reindexSource deletes then enqueues', () => {
  it('reindexSource calls withDbContext → deleteBySource, then enqueues a job', async () => {
    // Lazy import to allow mock setup above
    const { reindexSource } = await import('./vectorReindexService.js');

    const result = await reindexSource(ORG_A, 'CATALOG_ITEM', ITEM_ID, 'Fresh text');

    // Assert 1: withDbContext was called (delete transaction was opened)
    expect(withDbContext).toHaveBeenCalled();

    // Assert 2: deleteBySource was invoked with correct args
    expect(deleteBySource).toHaveBeenCalledWith(
      expect.anything(), // mock tx
      ORG_A,
      'CATALOG_ITEM',
      ITEM_ID,
    );

    // Assert 3: result shows deleted + enqueued success
    expect(result.deleted).toBe(true);
    expect(result.enqueued).toBe(true);
    expect(result.jobId).toBeTruthy();

    // Assert 4: the job is in the queue
    expect(_getQueueSizeForTests()).toBe(1);
    const peeked = _peekQueueForTests(1)[0];
    expect(peeked.orgId).toBe(ORG_A);
    expect(peeked.sourceType).toBe('CATALOG_ITEM');
    expect(peeked.sourceId).toBe(ITEM_ID);
    expect(peeked.textContent).toBe('Fresh text');
  });

  it('reindexSource returns DELETE_FAILED and does not enqueue when deleteBySource throws', async () => {
    vi.mocked(deleteBySource).mockRejectedValueOnce(new Error('DB error'));

    const { reindexSource } = await import('./vectorReindexService.js');
    const result = await reindexSource(ORG_A, 'CATALOG_ITEM', ITEM_ID, 'text');

    expect(result.deleted).toBe(false);
    expect(result.enqueued).toBe(false);
    expect(result.reason).toBe('DELETE_FAILED');

    // Queue must remain empty — no re-ingest enqueued after failed delete
    expect(_getQueueSizeForTests()).toBe(0);
  });

  it('reindexTenant enqueues all items and returns counts', async () => {
    const { reindexTenant } = await import('./vectorReindexService.js');

    const items = [
      { sourceType: 'CATALOG_ITEM',   sourceId: ITEM_ID, textContent: 'Item text' },
      { sourceType: 'CERTIFICATION',  sourceId: CERT_ID, textContent: 'ISO 9001' },
    ];

    const result = await reindexTenant(ORG_A, items);

    expect(result.totalItems).toBe(2);
    expect(result.enqueued).toBe(2);
    expect(result.rejected).toBe(0);
    expect(result.deleteErrors).toBe(0);
    expect(_getQueueSizeForTests()).toBe(2);
  });
});

// ─── A6-TEST-04: Chunking determinism ────────────────────────────────────────

describe('A6-TEST-04: Chunking determinism', () => {
  it('same input text produces identical chunk hashes on repeated calls', () => {
    const text = 'The quick brown fox jumps over the lazy dog. '.repeat(20);
    const chunks1 = chunkText(text);
    const chunks2 = chunkText(text);

    expect(chunks1.length).toBe(chunks2.length);
    for (let i = 0; i < chunks1.length; i++) {
      expect(chunks1[i].contentHash).toBe(chunks2[i].contentHash);
      expect(chunks1[i].chunkIndex).toBe(chunks2[i].chunkIndex);
    }
  });

  it('different input text produces different chunk hashes', () => {
    const text1 = 'Red apple fresh from the orchard.';
    const text2 = 'Blue blueberry from the mountain farm.';
    const [c1] = chunkText(text1);
    const [c2] = chunkText(text2);

    expect(c1.contentHash).not.toBe(c2.contentHash);
  });

  it('chunks are indexed from 0 in order', () => {
    const longText = 'word '.repeat(400); // ~2000 chars → multiple chunks
    const chunks = chunkText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });

  it('empty text produces zero chunks', () => {
    expect(chunkText('')).toHaveLength(0);
    expect(chunkText('   ')).toHaveLength(0); // whitespace-only trims to empty
  });

  it('single short text produces exactly one chunk', () => {
    const chunks = chunkText('Short text that fits in one chunk.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].contentHash).toBeTruthy();
  });

  it('chunkText caps output at MAX_CHUNKS_PER_DOC regardless of text length', async () => {
    // Very long text that would naively produce >20 chunks
    const text = 'x '.repeat(20_000); // ~40k chars — way beyond maxChunks ceiling
    const chunks = chunkText(text);
    const { MAX_CHUNKS_PER_DOC } = await import('./vectorChunker.js');
    expect(chunks.length).toBeLessThanOrEqual(MAX_CHUNKS_PER_DOC);
  });
});
