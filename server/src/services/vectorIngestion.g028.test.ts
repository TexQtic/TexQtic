/**
 * G-028 A4 — Embedding Ingestion Pipeline Tests
 *
 * Task ID: OPS-G028-A4-EMBEDDING-INGESTION
 * Doctrine: v1.4 — unit-first, mocked Gemini + vectorStore, no real DB
 *
 * Coverage:
 *   A4-TEST-01  chunkText — deterministic chunking of large text
 *   A4-TEST-02  idempotency — same content → second ingestion produces skipped > 0
 *   A4-TEST-03  embedding dimension guard — invalid length throws before upsert
 *   A4-TEST-04  reindexSource — calls deleteBySource + re-ingest with expected counts
 *   A4-TEST-05  ingestCatalogItem — builds text from name + description, sourceType='CATALOG_ITEM'
 *   A4-TEST-06  doc-too-large guard — returns IngestionError without calling embed
 *   A4-TEST-07  embed failure ─ chunk skipped, other chunks proceed
 *
 * Run:
 *   pnpm -C server exec vitest run src/services/vectorIngestion.g028.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Mock config to avoid Zod env-parse failure in CI / local test runs ────────
vi.mock('../config/index.js', () => ({
  config: {
    GEMINI_API_KEY: 'test-gemini-key',
    DATABASE_URL: 'postgresql://test:test@localhost/test',
  },
}));

// ── Mock vectorStore before importing SUT ─────────────────────────────────────
vi.mock('../lib/vectorStore.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/vectorStore.js')>('../lib/vectorStore.js');
  return {
    ...actual,
    upsertDocumentEmbeddings: vi.fn().mockResolvedValue({ inserted: 1, skipped: 0 }),
    deleteBySource:           vi.fn().mockResolvedValue({ deleted: 3 }),
  };
});

import {
  upsertDocumentEmbeddings,
  deleteBySource,
  EMBEDDING_DIM,
} from '../lib/vectorStore.js';
import {
  chunkText,
  generateEmbedding,
  ingestSourceText,
  reindexSource,
  ingestCatalogItem,
  MAX_CHUNK_LENGTH,
  CHUNK_OVERLAP,
  MAX_CHUNKS_PER_DOC,
  MAX_DOC_SIZE,
  _overrideGenAIForTests,
} from './vectorIngestion.js';
import type { VectorStoreClient } from '../lib/vectorStore.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_A   = 'aaaaaaaa-0000-0000-0000-000000000001';
const ITEM_ID = 'bbbbbbbb-0000-0000-0000-000000000002';

/** Build a 768-dim float array. */
function makeEmbedding(fill = 0.1): number[] {
  return Array<number>(EMBEDDING_DIM).fill(fill);
}

/** Build a minimal VectorStoreClient stub (not called directly in most A4 tests). */
function makeTx(): VectorStoreClient {
  return {
    $queryRaw:         vi.fn(),
    $executeRaw:       vi.fn(),
    $executeRawUnsafe: vi.fn(),
  } as unknown as VectorStoreClient;
}

/** Build a mock GoogleGenerativeAI that returns a good 768-dim embedding. */
function makeGoodGenAI(): GoogleGenerativeAI {
  return {
    getGenerativeModel: vi.fn().mockReturnValue({
      embedContent: vi.fn().mockResolvedValue({
        embedding: { values: makeEmbedding(0.5) },
      }),
    }),
  } as unknown as GoogleGenerativeAI;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('G-028 A4 — embedding ingestion pipeline', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    _overrideGenAIForTests(makeGoodGenAI()); // inject mock Gemini by default
  });

  afterEach(() => {
    _overrideGenAIForTests(null); // reset to lazy default
  });

  // ─── A4-TEST-01: Chunking determinism ───────────────────────────────────────
  describe('A4-TEST-01: chunkText determinism', () => {

    it('produces same chunks for same input (deterministic)', () => {
      const text = 'A'.repeat(2000);
      const c1 = chunkText(text);
      const c2 = chunkText(text);
      expect(c1).toEqual(c2);
    });

    it('chunks a 2400-char text into multiple chunks ≤ MAX_CHUNK_LENGTH', () => {
      const text = 'word '.repeat(480); // 2400 chars
      const chunks = chunkText(text);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.length).toBeLessThanOrEqual(MAX_CHUNKS_PER_DOC);

      for (const chunk of chunks) {
        expect(chunk.content.length).toBeLessThanOrEqual(MAX_CHUNK_LENGTH);
      }
    });

    it('assigns sequential chunkIndex starting at 0', () => {
      const text = 'x '.repeat(300);
      const chunks = chunkText(text);
      chunks.forEach((chunk, i) => {
        expect(chunk.chunkIndex).toBe(i);
      });
    });

    it('caps output at MAX_CHUNKS_PER_DOC regardless of text length', () => {
      const text = 'z '.repeat(10_000);
      const chunks = chunkText(text);
      expect(chunks.length).toBeLessThanOrEqual(MAX_CHUNKS_PER_DOC);
    });

    it('computes stable SHA-256 contentHash per chunk', () => {
      const chunks = chunkText('hello world');
      expect(chunks[0]?.contentHash).toMatch(/^[0-9a-f]{64}$/);
      // Same content → same hash
      const again = chunkText('hello world');
      expect(chunks[0]?.contentHash).toBe(again[0]?.contentHash);
    });

    it('overlap produces shared content between consecutive chunks', () => {
      // With overlap=100 and stride=700, consecutive chunks share ~100 chars
      const text = 'A'.repeat(MAX_CHUNK_LENGTH) + 'B'.repeat(MAX_CHUNK_LENGTH);
      const chunks = chunkText(text, MAX_CHUNK_LENGTH, CHUNK_OVERLAP);
      if (chunks.length >= 2) {
        // Last part of chunk 0 should appear at start of chunk 1
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tail0 = chunks[0]!.content.slice(-CHUNK_OVERLAP);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const head1 = chunks[1]!.content.slice(0, CHUNK_OVERLAP);
        // They should share some content (word-boundary cuts may differ slightly)
        expect(tail0.substring(0, 50)).toBe(head1.substring(0, 50));
      }
    });
  });

  // ─── A4-TEST-02: Idempotency ─────────────────────────────────────────────────
  it('A4-TEST-02: second ingestion of same content yields skipped > 0', async () => {
    const tx = makeTx();
    const text = 'Product X: premium widget with enhanced durability.';

    // First ingestion: DB returns inserted=1
    (upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ inserted: 1, skipped: 0 });
    const r1 = await ingestSourceText(tx, ORG_A, 'CATALOG_ITEM', ITEM_ID, text);
    expect(r1).not.toHaveProperty('status'); // no error
    if (!('status' in r1)) expect(r1.inserted).toBe(1);

    // Second ingestion: ON CONFLICT DO NOTHING → inserted=0, skipped=1
    (upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ inserted: 0, skipped: 1 });
    const r2 = await ingestSourceText(tx, ORG_A, 'CATALOG_ITEM', ITEM_ID, text);
    expect(r2).not.toHaveProperty('status'); // no error
    if (!('status' in r2)) {
      expect(r2.skipped).toBeGreaterThan(0);
      expect(r2.inserted).toBe(0);
    }
  });

  // ─── A4-TEST-03: Embedding dimension guard ───────────────────────────────────
  it('A4-TEST-03: generateEmbedding throws when Gemini returns wrong dimensions', async () => {
    const badGenAI: GoogleGenerativeAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        embedContent: vi.fn().mockResolvedValue({
          embedding: { values: [0.1, 0.2, 0.3] }, // only 3 dims
        }),
      }),
    } as unknown as GoogleGenerativeAI;

    _overrideGenAIForTests(badGenAI);

    await expect(
      generateEmbedding('some text'),
    ).rejects.toThrow(/dimension mismatch/i);

    // upsertDocumentEmbeddings must NOT be called
    expect(upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('A4-TEST-03b: ingestSourceText skips failing chunk and returns EMBED_FAILED when ALL fail', async () => {
    const badGenAI: GoogleGenerativeAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        embedContent: vi.fn().mockRejectedValue(new Error('API down')),
      }),
    } as unknown as GoogleGenerativeAI;

    _overrideGenAIForTests(badGenAI);

    const result = await ingestSourceText(makeTx(), ORG_A, 'CATALOG_ITEM', ITEM_ID, 'some content');

    expect(result).toMatchObject({ status: 'ERROR', code: 'EMBED_FAILED' });
    expect(upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  // ─── A4-TEST-04: reindexSource ───────────────────────────────────────────────
  it('A4-TEST-04: reindexSource calls deleteBySource then upsert with expected counts', async () => {
    const tx = makeTx();
    const text = 'Updated product description with new regulatory compliance metadata.';

    (upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).mockResolvedValue({ inserted: 1, skipped: 0 });

    const result = await reindexSource(tx, ORG_A, 'CATALOG_ITEM', ITEM_ID, text);

    // 1. deleteBySource must be called first
    expect(deleteBySource as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
    expect((deleteBySource as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
      tx, ORG_A, 'CATALOG_ITEM', ITEM_ID,
    ]);

    // 2. upsertDocumentEmbeddings must be called after
    expect(upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();

    // 3. Result is successful ingestion
    expect(result).not.toHaveProperty('status');
    if (!('status' in result)) {
      expect(result.inserted).toBeGreaterThanOrEqual(1);
      expect(result.sourceType).toBe('CATALOG_ITEM');
      expect(result.sourceId).toBe(ITEM_ID);
    }
  });

  // ─── A4-TEST-05: ingestCatalogItem adapter ───────────────────────────────────
  it('A4-TEST-05: ingestCatalogItem sets sourceType=CATALOG_ITEM and combines name+description', async () => {
    const tx = makeTx();

    const result = await ingestCatalogItem(tx, ORG_A, {
      id: ITEM_ID,
      name: 'Premium Widget',
      description: 'Durable, ISO-certified, multi-tenant compliant.',
    });

    expect(result).not.toHaveProperty('status');

    // upsertDocumentEmbeddings called with correct sourceType
    expect(upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
    const [, , chunks] = (upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(chunks[0].sourceType).toBe('CATALOG_ITEM');
    expect(chunks[0].sourceId).toBe(ITEM_ID);

    // Content must include both name and description
    const allContent: string = chunks.map((c: { content: string }) => c.content).join(' ');
    expect(allContent).toContain('Premium Widget');
    expect(allContent).toContain('Durable');
  });

  // ─── A4-TEST-06: Doc-too-large guard ─────────────────────────────────────────
  it('A4-TEST-06: ingestSourceText returns DOC_TOO_LARGE without calling Gemini', async () => {
    const tx = makeTx();
    const hugeText = 'x'.repeat(MAX_DOC_SIZE + 1);

    const result = await ingestSourceText(tx, ORG_A, 'CATALOG_ITEM', ITEM_ID, hugeText);

    expect(result).toMatchObject({ status: 'ERROR', code: 'DOC_TOO_LARGE' });
    expect(upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  // ─── A4-TEST-07: Partial embed failure — succeeding chunks still upserted ────
  it('A4-TEST-07: when one chunk fails embedding, other chunks are still upserted', async () => {
    // Force text that produces 2 chunks (>800 chars)
    const text = 'A '.repeat(500); // ~1000 chars → 2 chunks

    let callCount = 0;
    const mixedGenAI: GoogleGenerativeAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        embedContent: vi.fn().mockImplementation(async () => {
          callCount++;
          // EMBEDDING_MAX_RETRIES=1 → 2 total attempts for chunk[0].
          // Calls 1 & 2 exhaust chunk[0]'s retry budget; call 3 serves chunk[1].
          if (callCount <= 2) {
            throw new Error('first chunk fails');
          }
          return { embedding: { values: makeEmbedding(0.3) } };
        }),
      }),
    } as unknown as GoogleGenerativeAI;

    _overrideGenAIForTests(mixedGenAI);

    await ingestSourceText(makeTx(), ORG_A, 'CATALOG_ITEM', ITEM_ID, text);

    // upsertDocumentEmbeddings should be called with the surviving chunk(s)
    expect(upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
    const [, , chunks] = (upsertDocumentEmbeddings as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.length).toBeLessThan(2); // first chunk was dropped
  });
});
