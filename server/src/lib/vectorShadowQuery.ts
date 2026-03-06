/**
 * vectorShadowQuery.ts — G-028 A3: Vector shadow retrieval helper
 *
 * Task ID: OPS-G028-A3-SHADOW-QUERY
 * Doctrine: v1.4 — shadow mode, fail-safe-silent, no prompt injection
 *
 * Encapsulates the full shadow retrieval flow:
 *   1. Read feature flag OP_G028_VECTOR_ENABLED from DB
 *   2. If disabled → return null immediately
 *   3. Build deterministic placeholder embedding (TODO: replace in A4)
 *   4. Call querySimilar(); capture latency
 *   5. Write structured metadata to reasoning_logs (separate row, model "vector-shadow/g028-a3")
 *   6. Return VectorShadowMeta for callers that need it (e.g. response headers)
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - Does NOT inject results into AI prompts (shadow mode only)
 *   - Does NOT log chunk content (PII prevention)
 *   - vector errors are caught and logged — NEVER re-thrown
 *   - reasoning_logs write is inside the same caller tx (pooler-safe)
 *
 * @module vectorShadowQuery
 */

import { createHash } from 'node:crypto';
import { querySimilar } from './vectorStore.js';
import type { VectorStoreClient } from './vectorStore.js';
import { EMBEDDING_DIM } from './vectorStore.js';

// ─── Feature flag key ─────────────────────────────────────────────────────────

export const VECTOR_FLAG_KEY = 'OP_G028_VECTOR_ENABLED' as const;

// ─── Shadow query defaults ─────────────────────────────────────────────────────

const SHADOW_TOP_K     = 5  as const;
const SHADOW_MIN_SIM   = 0.25 as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Structured metadata logged to reasoning_logs for each shadow retrieval.
 * Contains ONLY metadata + scores — never chunk content (PII guard).
 */
export interface VectorShadowMeta {
  stage:         'vector_shadow_query';
  orgId:         string;
  topK:          number;
  minSimilarity: number;
  resultsCount:  number;
  topScore:      number | null;
  latencyMs:     number;
  sources: Array<{
    sourceType:  string;
    sourceId:    string;
    similarity:  number;
  }>;
}

/**
 * Minimal subset of the Prisma tx client needed by the shadow helper.
 * Both PrismaClient and transaction clients satisfy this interface.
 */
export interface ShadowTx extends VectorStoreClient {
  featureFlag: {
    findUnique(args: { where: { key: string } }): Promise<{ enabled: boolean } | null>;
  };
  reasoningLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

// ─── Placeholder embedding ───────────────────────────────────────────────────

/**
 * buildShadowEmbedding — Deterministic placeholder embedding for shadow mode.
 *
 * TODO(G028-A4): replace with real embedding pipeline (Gemini text-embedding-004).
 *
 * Produces a stable 768-dim unit vector from a SHA-256 hash of the input string.
 * Because ingestion pipeline is not yet built, the shadow query will typically
 * return 0 results — but exercises the full retrieval path for latency/logging.
 *
 * Algorithm: LCG seeded from SHA-256 hash bytes → unit-normalised float32 array.
 * LCG params: multiplier 1664525, increment 1013904223 (Numerical Recipes).
 */
export function buildShadowEmbedding(text: string): number[] {
  const hash = createHash('sha256').update(text).digest();
  const result: number[] = new Array<number>(EMBEDDING_DIM);
  let seed = hash.readUInt32BE(0);

  for (let i = 0; i < EMBEDDING_DIM; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    result[i] = (seed / 0xffffffff) * 2 - 1; // [-1, 1]
  }

  // Normalise to unit length (cosine-optimal)
  const norm = Math.sqrt(result.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? result.map(v => v / norm) : result;
}

// ─── runVectorShadowQuery ────────────────────────────────────────────────────

/**
 * Run vector retrieval in shadow mode.
 *
 * Shadow mode contract:
 *   - Results are logged, NOT injected into LLM context
 *   - Failures are caught and logged — never re-thrown
 *   - Returns null if flag disabled or on any error
 *
 * The metadata row is written to reasoning_logs inside `tx` (same transaction
 * as the main inference log) so the write is atomic and RLS-scoped.
 *
 * @param tx     Prisma transaction client (from withDbContext)
 * @param orgId  JWT-derived org UUID (from req.dbContext.orgId)
 * @param query  The user query string (used to build placeholder embedding)
 * @returns VectorShadowMeta if retrieval ran; null otherwise
 */
export async function runVectorShadowQuery(
  tx: ShadowTx,
  orgId: string,
  query: string,
): Promise<VectorShadowMeta | null> {

  // ── 1. Feature flag gate ─────────────────────────────────────────────────
  let vectorEnabled = false;
  try {
    const flagRow = await tx.featureFlag.findUnique({ where: { key: VECTOR_FLAG_KEY } });
    vectorEnabled = flagRow?.enabled === true;
  } catch (flagErr) {
    console.error('[G028-A3][flag_read_error]', { orgId, error: String(flagErr) });
    return null; // fail-safe: flag unreadable → skip retrieval
  }

  if (!vectorEnabled) {
    return null;
  }

  // ── 2. Shadow retrieval (fail-safe-silent) ───────────────────────────────
  let meta: VectorShadowMeta | null = null;

  try {
    const embedding = buildShadowEmbedding(query);
    const shadowStart = Date.now();

    const results = await querySimilar(tx, orgId, embedding, {
      topK:          SHADOW_TOP_K,
      minSimilarity: SHADOW_MIN_SIM,
    });

    const latencyMs = Date.now() - shadowStart;

    meta = {
      stage:         'vector_shadow_query',
      orgId,
      topK:          SHADOW_TOP_K,
      minSimilarity: SHADOW_MIN_SIM,
      resultsCount:  results.length,
      topScore:      results[0]?.similarity ?? null,
      latencyMs,
      sources: results.map(r => ({
        sourceType: r.sourceType,
        sourceId:   r.sourceId,
        similarity: r.similarity,
      })),
    };
  } catch (retrievalErr) {
    // Hard constraint: vector errors must NEVER break inference
    console.error('[G028-A3][vector_shadow_error]', { orgId, error: String(retrievalErr) });
    return null;
  }

  // ── 3. Log structured metadata to reasoning_logs ─────────────────────────
  // Writes a SEPARATE reasoning_log row (does not modify the main inference log).
  // model = "vector-shadow/g028-a3" distinguishes these from inference logs.
  // Content is ONLY metadata + scores (no chunk content — PII guard).
  try {
    const logHash = createHash('sha256')
      .update(JSON.stringify(meta))
      .digest('hex');

    await tx.reasoningLog.create({
      data: {
        tenantId:        orgId,
        requestId:       `vshadow-${Date.now()}-${orgId.slice(0, 8)}`,
        reasoningHash:   logHash,
        model:           'vector-shadow/g028-a3',
        promptSummary:   `stage=vector_shadow_query topK=${meta.topK} minSim=${meta.minSimilarity}`,
        responseSummary: JSON.stringify({
          resultsCount: meta.resultsCount,
          topScore:     meta.topScore,
          latencyMs:    meta.latencyMs,
          sources:      meta.sources,
        }).slice(0, 200),
        tokensUsed: 0,
      },
    });
  } catch (logErr) {
    // Logging failure must not break inference
    console.error('[G028-A3][vector_shadow_log_error]', { orgId, error: String(logErr) });
  }

  return meta;
}
