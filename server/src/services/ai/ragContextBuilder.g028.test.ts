/**
 * G-028 A5 — RAG Context Builder Tests
 *
 * Task ID: OPS-G028-A5-RAG-INJECTION
 * Doctrine: v1.4 — unit-first, mocked Gemini + vectorStore, no real DB
 *
 * Coverage:
 *   A5-TEST-01  flag=false → querySimilar not called, contextBlock=null
 *   A5-TEST-02  flag=true + results → querySimilar called, contextBlock injected
 *   A5-TEST-03  querySimilar throws → fallback (null), no re-throw
 *   A5-TEST-04  buildRagContextBlock — empty array → empty string
 *   A5-TEST-05  buildRagContextBlock — block truncated when length > MAX_INJECTED_CHARS
 *
 * Run:
 *   pnpm -C server exec vitest run src/services/ai/ragContextBuilder.g028.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock config to avoid Zod env-parse failure ─────────────────────────────────
vi.mock('../../config/index.js', () => ({
  config: { GEMINI_API_KEY: 'test-key' },
}));

// ── Mock vectorStore (querySimilar) ────────────────────────────────────────────
vi.mock('../../lib/vectorStore.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/vectorStore.js')>(
    '../../lib/vectorStore.js',
  );
  return {
    ...actual,
    querySimilar: vi.fn().mockResolvedValue([]),
  };
});

// ── Mock vectorIngestion (generateEmbedding) ───────────────────────────────────
vi.mock('../vectorIngestion.js', async () => {
  const actual = await vi.importActual<typeof import('../vectorIngestion.js')>(
    '../vectorIngestion.js',
  );
  return {
    ...actual,
    generateEmbedding: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
  };
});

import { querySimilar } from '../../lib/vectorStore.js';
import type { SimilarityResult } from '../../lib/vectorStore.js';
import { generateEmbedding } from '../vectorIngestion.js';
import {
  runRagRetrieval,
  buildRagContextBlock,
  MAX_INJECTED_CHARS,
  MAX_CONTEXT_CHUNKS,
  RAG_MIN_SIMILARITY,
} from './ragContextBuilder.js';
import type { RagTx } from './ragContextBuilder.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ORG_A = 'aaaaaaaa-0000-0000-0000-000000000001';

function makeTx(flagEnabled: boolean): RagTx {
  return {
    featureFlag: {
      findUnique: vi.fn().mockResolvedValue({ enabled: flagEnabled }),
    },
    reasoningLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-id-001' }),
    },
    // VectorStoreClient stubs (not called in these tests; only querySimilar is mocked)
    $queryRaw:         vi.fn(),
    $executeRaw:       vi.fn(),
    $executeRawUnsafe: vi.fn(),
  } as unknown as RagTx;
}

function makeSimilarityResult(overrides: Partial<SimilarityResult> = {}): SimilarityResult {
  return {
    id:         'result-id-001',
    sourceType: 'CATALOG_ITEM',
    sourceId:   'bbbbbbbb-0000-0000-0000-000000000002',
    chunkIndex: 0,
    content:    'This is a retrieved chunk about organic cotton.',
    metadata:   null,
    similarity: 0.85,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('G-028 A5 — RAG context builder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset querySimilar default to empty
    vi.mocked(querySimilar).mockResolvedValue([]);
    vi.mocked(generateEmbedding).mockResolvedValue(new Array(768).fill(0.1));
  });

  // ── A5-TEST-01: Flag disabled ─────────────────────────────────────────────
  it('A5-TEST-01: flag=false → querySimilar not called, contextBlock null', async () => {
    const tx = makeTx(false);

    const result = await runRagRetrieval(tx, ORG_A, 'market trends');

    expect(result.contextBlock).toBeNull();
    expect(result.meta).toBeNull();
    // querySimilar and generateEmbedding must NOT be called when flag is off
    expect(querySimilar).not.toHaveBeenCalled();
    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  // ── A5-TEST-02: Flag enabled with results ─────────────────────────────────
  it('A5-TEST-02: flag=true + retrieved results → contextBlock injected, meta populated', async () => {
    const chunk1 = makeSimilarityResult({ similarity: 0.92 });
    const chunk2 = makeSimilarityResult({
      sourceId:   'cccccccc-0000-0000-0000-000000000003',
      content:    'Supplier compliance score: 98/100.',
      similarity: 0.74,
    });

    vi.mocked(querySimilar).mockResolvedValue([chunk1, chunk2]);

    const tx = makeTx(true);
    const result = await runRagRetrieval(tx, ORG_A, 'market trends in sustainable fashion');

    // generateEmbedding should be called with the query
    expect(generateEmbedding).toHaveBeenCalledWith('market trends in sustainable fashion');

    // querySimilar should be called with the generated embedding
    expect(querySimilar).toHaveBeenCalledOnce();

    // contextBlock must not be null
    expect(result.contextBlock).not.toBeNull();

    // contextBlock must contain the retrieved chunk content
    expect(result.contextBlock).toContain('### Retrieved Context');
    expect(result.contextBlock).toContain('[1] Source: catalog_item:');
    expect(result.contextBlock).toContain('This is a retrieved chunk about organic cotton.');

    // meta must be populated with correct structure
    expect(result.meta).not.toBeNull();
    expect(result.meta?.stage).toBe('vector_rag_injection');
    expect(result.meta?.chunksInjected).toBe(2);
    expect(result.meta?.topScore).toBeCloseTo(0.92);
    expect(result.meta?.sources).toHaveLength(2);
    expect(result.meta?.sources[0]).toMatchObject({
      sourceType: 'CATALOG_ITEM',
      similarity:  0.92,
    });

    // reasoning_log must be written
    const txMock = tx as unknown as { reasoningLog: { create: ReturnType<typeof vi.fn> } };
    expect(txMock.reasoningLog.create).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const logCall = txMock.reasoningLog.create.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(logCall.data.model).toBe('vector-rag/g028-a5');
  });

  // ── A5-TEST-03: Retrieval throws → fallback ───────────────────────────────
  it('A5-TEST-03: querySimilar throws → contextBlock null, no re-throw', async () => {
    vi.mocked(querySimilar).mockRejectedValue(new Error('DB connection lost'));

    const tx = makeTx(true);

    // Must not throw
    await expect(runRagRetrieval(tx, ORG_A, 'market trends')).resolves.not.toThrow();

    const result = await runRagRetrieval(tx, ORG_A, 'market trends');
    expect(result.contextBlock).toBeNull();
    expect(result.meta).toBeNull();
  });

  // ── A5-TEST-04: buildRagContextBlock edge case — empty results ────────────
  it('A5-TEST-04: buildRagContextBlock with empty results returns empty string', () => {
    const block = buildRagContextBlock([]);
    expect(block).toBe('');
  });

  // ── A5-TEST-05: buildRagContextBlock truncates oversized blocks ───────────
  it('A5-TEST-05: buildRagContextBlock truncates block exceeding MAX_INJECTED_CHARS', () => {
    // Build results whose combined content guarantees > MAX_INJECTED_CHARS
    const bigContent = 'X'.repeat(MAX_INJECTED_CHARS);
    const result = makeSimilarityResult({ content: bigContent });

    const block = buildRagContextBlock([result]);

    expect(block.length).toBeLessThanOrEqual(MAX_INJECTED_CHARS + '[...context truncated]'.length + 10);
    expect(block).toContain('[context truncated]');
  });

  // ── A5-TEST-06: MAX_CONTEXT_CHUNKS cap enforced ───────────────────────────
  it(`A5-TEST-06: only up to MAX_CONTEXT_CHUNKS (${MAX_CONTEXT_CHUNKS}) chunks are injected even if more retrieved`, async () => {
    // Return more chunks than the cap
    const manyChunks: SimilarityResult[] = Array.from({ length: 5 }, (_, i) =>
      makeSimilarityResult({
        sourceId: `${String(i).padStart(8, 'c')}${'-0000-0000-0000-000000000000'.slice(8)}`,
        content:  `Chunk number ${i + 1}`,
        similarity: 0.9 - i * 0.05,
      }),
    );
    vi.mocked(querySimilar).mockResolvedValue(manyChunks);

    const tx = makeTx(true);
    const result = await runRagRetrieval(tx, ORG_A, 'query');

    expect(result.meta?.chunksInjected).toBe(MAX_CONTEXT_CHUNKS);
    // Block should contain [1], [2], [3] but not [4] or [5]
    expect(result.contextBlock).toContain('[1]');
    expect(result.contextBlock).toContain('[3]');
    expect(result.contextBlock).not.toContain('[4]');
  });

  // ── A5-TEST-07: Below-threshold chunks are filtered out ───────────────────
  it('A5-TEST-07: chunks with similarity < RAG_MIN_SIMILARITY are not injected', async () => {
    const goodChunk = makeSimilarityResult({ similarity: 0.75 });
    const badChunk  = makeSimilarityResult({
      sourceId:   'cccccccc-0000-0000-0000-000000000003',
      content:    'Low similarity chunk — should be dropped',
      similarity: RAG_MIN_SIMILARITY - 0.01, // just below threshold
    });

    vi.mocked(querySimilar).mockResolvedValue([goodChunk, badChunk]);

    const tx = makeTx(true);
    const result = await runRagRetrieval(tx, ORG_A, 'query');

    expect(result.meta?.chunksInjected).toBe(1);
    expect(result.contextBlock).not.toContain('Low similarity chunk');
  });
});
