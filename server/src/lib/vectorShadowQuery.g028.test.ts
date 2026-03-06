/**
 * G-028 A3 — Vector Shadow Query Tests
 *
 * Task ID: OPS-G028-A3-SHADOW-QUERY
 * Doctrine: v1.4 — unit-first, mocked Prisma, no real DB required
 *
 * Coverage:
 *   A3-TEST-01  Flag disabled → querySimilar NOT called; runVectorShadowQuery → null
 *   A3-TEST-02  Flag enabled  → querySimilar called; reasoning_logs entry created
 *   A3-TEST-03  querySimilar throws → error swallowed, inference not broken (returns null)
 *   A3-TEST-04  buildShadowEmbedding produces stable 768-d unit vector
 *
 * Run:
 *   pnpm -C server exec vitest run src/lib/vectorShadowQuery.g028.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock vectorStore before importing the SUT ──────────────────────────────
vi.mock('./vectorStore.js', async () => {
  const actual = await vi.importActual<typeof import('./vectorStore.js')>('./vectorStore.js');
  return {
    ...actual,
    querySimilar: vi.fn().mockResolvedValue([]),
  };
});

import { querySimilar } from './vectorStore.js';
import {
  runVectorShadowQuery,
  buildShadowEmbedding,
  VECTOR_FLAG_KEY,
  type ShadowTx,
} from './vectorShadowQuery.js';
import { EMBEDDING_DIM } from './vectorStore.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_A = 'aaaaaaaa-0000-0000-0000-000000000001';

/**
 * Build a minimal mock ShadowTx.
 * featureFlag: enabled=true by default unless overridden.
 */
function makeTx(flagEnabled: boolean): ShadowTx {
  return {
    // VectorStoreClient stubs (not called directly by runVectorShadowQuery)
    $queryRaw:        vi.fn(),
    $executeRaw:      vi.fn(),
    $executeRawUnsafe: vi.fn(),
    // ShadowTx-specific
    featureFlag: {
      findUnique: vi.fn().mockResolvedValue(
        flagEnabled ? { enabled: true } : { enabled: false },
      ),
    },
    reasoningLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-uuid-001' }),
    },
  } as unknown as ShadowTx;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('G-028 A3 — runVectorShadowQuery', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── A3-TEST-01: Flag disabled ───────────────────────────────────────────
  it('A3-TEST-01: returns null and does NOT call querySimilar when flag is disabled', async () => {
    const tx = makeTx(false); // flag disabled

    const result = await runVectorShadowQuery(tx, ORG_A, 'market trend analysis for B2B');

    // Must return null (shadow skipped)
    expect(result).toBeNull();

    // Flag must be checked
    expect((tx.featureFlag.findUnique as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
    expect((tx.featureFlag.findUnique as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith({
      where: { key: VECTOR_FLAG_KEY },
    });

    // querySimilar must NOT be called
    expect(querySimilar as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();

    // reasoning_logs must NOT be written
    expect((tx.reasoningLog.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // ─── A3-TEST-02: Flag enabled ────────────────────────────────────────────
  it('A3-TEST-02: calls querySimilar and writes reasoning_logs entry when flag is enabled', async () => {
    const mockResults = [
      { id: 'r1', sourceType: 'POLICY', sourceId: 'bbbbbbbb-0000-0000-0000-000000000001', chunkIndex: 0, content: 'ignored', metadata: null, similarity: 0.82 },
      { id: 'r2', sourceType: 'FAQ',    sourceId: 'cccccccc-0000-0000-0000-000000000002', chunkIndex: 0, content: 'ignored', metadata: null, similarity: 0.71 },
    ];
    (querySimilar as ReturnType<typeof vi.fn>).mockResolvedValue(mockResults);

    const tx = makeTx(true); // flag enabled

    const result = await runVectorShadowQuery(tx, ORG_A, 'supplier matching for electronics');

    // Must return non-null meta
    expect(result).not.toBeNull();
    expect(result?.stage).toBe('vector_shadow_query');
    expect(result?.orgId).toBe(ORG_A);
    expect(result?.topK).toBe(5);
    expect(result?.minSimilarity).toBe(0.25);
    expect(result?.resultsCount).toBe(2);
    expect(result?.topScore).toBeCloseTo(0.82, 4);
    expect(result?.latencyMs).toBeGreaterThanOrEqual(0);

    // Sources must contain metadata only (no content)
    expect(result?.sources).toHaveLength(2);
    expect(result?.sources[0]).toEqual({
      sourceType: 'POLICY',
      sourceId:   'bbbbbbbb-0000-0000-0000-000000000001',
      similarity: 0.82,
    });
    expect(result?.sources[0]).not.toHaveProperty('content'); // PII guard

    // querySimilar must be called with correct orgId and options
    expect(querySimilar as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();
    const [txArg, orgArg, embeddingArg, optsArg] = (querySimilar as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(txArg).toBe(tx);
    expect(orgArg).toBe(ORG_A);
    expect(embeddingArg).toHaveLength(EMBEDDING_DIM);
    expect(optsArg).toMatchObject({ topK: 5, minSimilarity: 0.25 });

    // reasoning_logs entry must be written
    expect((tx.reasoningLog.create as ReturnType<typeof vi.fn>)).toHaveBeenCalledOnce();
    const createCall = (tx.reasoningLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createCall.data.tenantId).toBe(ORG_A);
    expect(createCall.data.model).toBe('vector-shadow/g028-a3');
    expect(createCall.data.tokensUsed).toBe(0);
    // Must NOT contain chunk content (only metadata)
    expect(createCall.data.responseSummary).not.toContain('ignored');
  });

  // ─── A3-TEST-03: querySimilar throws → inference not broken ──────────────
  it('A3-TEST-03: swallows querySimilar error and returns null (inference unaffected)', async () => {
    (querySimilar as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('pgvector timeout'));

    const tx = makeTx(true);

    // Must NOT throw
    await expect(
      runVectorShadowQuery(tx, ORG_A, 'some query'),
    ).resolves.toBeNull();

    // querySimilar was called
    expect(querySimilar as ReturnType<typeof vi.fn>).toHaveBeenCalledOnce();

    // reasoning_logs must NOT be written (failed before meta was built)
    expect((tx.reasoningLog.create as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
  });

  // ─── A3-TEST-04: buildShadowEmbedding stability ──────────────────────────
  it('A3-TEST-04: buildShadowEmbedding returns stable 768-dim unit vector', () => {
    const text = 'market trend analysis';

    const v1 = buildShadowEmbedding(text);
    const v2 = buildShadowEmbedding(text);
    const vOther = buildShadowEmbedding('completely different input');

    // Correct dimension
    expect(v1).toHaveLength(EMBEDDING_DIM);

    // Deterministic: same input → same output
    expect(v1).toEqual(v2);

    // Different input → different vector
    expect(v1).not.toEqual(vOther);

    // Unit vector: ||v|| ≈ 1.0
    const norm = Math.sqrt(v1.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1.0, 5);
  });
});
