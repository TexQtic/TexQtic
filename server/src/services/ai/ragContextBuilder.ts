/**
 * ragContextBuilder.ts — G-028 A5: RAG context injection for AI insights
 *
 * Task ID: OPS-G028-A5-RAG-INJECTION
 * Doctrine: v1.4 — fail-safe, feature-flag gated, no content logging
 *
 * Encapsulates the full RAG retrieval + prompt augmentation flow:
 *   1. Read feature flag OP_G028_VECTOR_ENABLED
 *   2. If disabled → return null (fallback to zero-shot)
 *   3. Generate real Gemini embedding for the query string
 *   4. Call querySimilar(); filter by minSimilarity, cap at MAX_CONTEXT_CHUNKS
 *   5. Build formatted "Retrieved Context" prompt block
 *   6. Guard total injected chars at MAX_INJECTED_CHARS (truncate if needed)
 *   7. Write structured metadata to reasoning_logs (no chunk content — PII guard)
 *   8. Return { contextBlock, meta } to caller
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - vector errors NEVER break inference (try/catch wraps everything)
 *   - chunk content is NEVER written to logs (only metadata + scores)
 *   - orgId is ALWAYS sourced from dbContext (JWT-derived, never request body)
 *   - fully gated by OP_G028_VECTOR_ENABLED feature flag
 *
 * @module ragContextBuilder
 */

import { createHash } from 'node:crypto';
import { querySimilar } from '../../lib/vectorStore.js';
import type { VectorStoreClient, SimilarityResult } from '../../lib/vectorStore.js';
import { generateEmbedding } from '../vectorIngestion.js';
import { VECTOR_FLAG_KEY } from '../../lib/vectorShadowQuery.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of candidates to request from querySimilar. */
export const RAG_TOP_K = 5 as const;

/** Minimum cosine similarity a chunk must have to be injected. */
export const RAG_MIN_SIMILARITY = 0.30 as const;

/** Hard cap on chunks injected into the prompt (even if more are retrieved). */
export const MAX_CONTEXT_CHUNKS = 3 as const;

/**
 * Maximum total chars injected into the prompt context block.
 * If exceeded, the block is truncated to protect against prompt-size blowout.
 */
export const MAX_INJECTED_CHARS = 3_000 as const;

// ─── Tx interface ─────────────────────────────────────────────────────────────

/**
 * Minimal Prisma tx subset required by runRagRetrieval.
 * Satisfied by the transaction client supplied by withDbContext().
 */
export interface RagTx extends VectorStoreClient {
  featureFlag: {
    findUnique(args: { where: { key: string } }): Promise<{ enabled: boolean } | null>;
  };
  reasoningLog: {
    create(args: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Structured metadata written to reasoning_logs after each RAG retrieval.
 * Contains ONLY metadata + scores — never chunk content (PII guard).
 */
export interface RagRetrievalMeta {
  stage: 'vector_rag_injection';
  topK: number;
  minSimilarity: number;
  chunksInjected: number;
  topScore: number | null;
  latencyMs: number;
  sources: Array<{
    sourceType: string;
    sourceId: string;
    similarity: number;
  }>;
}

/** Return value of runRagRetrieval. */
export interface RagResult {
  /**
   * Formatted "Retrieved Context" block ready to prepend to the user prompt.
   * null if retrieval was skipped (flag off) or failed (catch block).
   */
  contextBlock: string | null;
  /** Structured metadata for the reasoning_logs row. null if retrieval skipped. */
  meta: RagRetrievalMeta | null;
}

// ─── buildRagContextBlock ─────────────────────────────────────────────────────

/**
 * Build the "Retrieved Context" prompt block from similarity results.
 *
 * Content IS included here (it is the point — injecting into the LLM prompt).
 * Content must NEVER be written to logs — only this returned string goes to Gemini.
 *
 * @param results  Filtered SimilarityResult[] (already capped + similarity-filtered)
 * @returns        Formatted context block string; empty string if results is empty
 */
export function buildRagContextBlock(results: SimilarityResult[]): string {
  if (results.length === 0) return '';

  const lines: string[] = [
    '### Retrieved Context',
    'The following information was retrieved from the TexQtic knowledge base.',
    '',
  ];

  for (const [i, r] of results.entries()) {
    lines.push(`[${i + 1}] Source: ${r.sourceType.toLowerCase()}:${r.sourceId}`);
    lines.push(r.content);
    lines.push('');
  }

  lines.push(
    'Use this information only if relevant. Do not fabricate facts beyond the provided context.',
  );

  let block = lines.join('\n');

  // Size guard — truncate if context block would blow out the prompt budget
  if (block.length > MAX_INJECTED_CHARS) {
    block = block.slice(0, MAX_INJECTED_CHARS) + '\n...[context truncated]';
  }

  return block;
}

// ─── runRagRetrieval ──────────────────────────────────────────────────────────

/**
 * Run RAG retrieval for a query; return formatted context block and metadata.
 *
 * Fail-safe contract:
 *   - Returns { contextBlock: null, meta: null } on flag=false or any error
 *   - Never re-throws — inference path is never broken
 *   - Logs errors to stderr (without secrets or chunk content)
 *
 * @param tx     Prisma transaction client from withDbContext()
 * @param orgId  JWT-derived org UUID (from req.dbContext.orgId)
 * @param query  The user query / prompt string used to build the embedding
 * @returns      RagResult with contextBlock ready to inject + logging metadata
 */
export async function runRagRetrieval(
  tx: RagTx,
  orgId: string,
  query: string,
): Promise<RagResult> {
  // ── 1. Feature flag gate ──────────────────────────────────────────────────
  let vectorEnabled = false;
  try {
    const flagRow = await tx.featureFlag.findUnique({ where: { key: VECTOR_FLAG_KEY } });
    vectorEnabled = flagRow?.enabled === true;
  } catch (flagErr) {
    console.error('[G028-A5][flag_read_error]', { orgId, error: String(flagErr) });
    return { contextBlock: null, meta: null };
  }

  if (!vectorEnabled) {
    return { contextBlock: null, meta: null };
  }

  // ── 2. Retrieval (wrapped fail-safe) ──────────────────────────────────────
  let contextBlock: string | null = null;
  let meta: RagRetrievalMeta | null = null;

  try {
    const ragStart = Date.now();

    // Use the real Gemini embedding (text-embedding-004, 768-dim).
    // generateEmbedding() is from A4 vectorIngestion — single retry, dim guard.
    const embedding = await generateEmbedding(query);

    const rawResults = await querySimilar(tx, orgId, embedding, {
      topK:          RAG_TOP_K,
      minSimilarity: RAG_MIN_SIMILARITY,
    });

    // Defence-in-depth: filter + cap (querySimilar already applies minSimilarity
    // inside the SQL query; we apply again here in case opts are widened later).
    const filtered = rawResults
      .filter(r => r.similarity >= RAG_MIN_SIMILARITY)
      .slice(0, MAX_CONTEXT_CHUNKS);

    const latencyMs = Date.now() - ragStart;

    contextBlock = buildRagContextBlock(filtered);
    if (contextBlock === '') contextBlock = null;

    meta = {
      stage:          'vector_rag_injection',
      topK:           RAG_TOP_K,
      minSimilarity:  RAG_MIN_SIMILARITY,
      chunksInjected: filtered.length,
      topScore:       filtered[0]?.similarity ?? null,
      latencyMs,
      sources: filtered.map(r => ({
        sourceType: r.sourceType,
        sourceId:   r.sourceId,
        similarity: r.similarity,
      })),
    };

    console.info('[G028-A5][rag_retrieval]', {
      stage:          'vector_rag_injection',
      orgId:          orgId.slice(0, 8) + '…', // partial — no PII
      chunksInjected: filtered.length,
      topScore:       meta.topScore,
      latencyMs,
    });
  } catch (retrievalErr) {
    // Hard constraint: retrieval errors MUST NOT break inference
    console.error('[G028-A5][rag_retrieval_error]', { orgId, error: String(retrievalErr) });
    return { contextBlock: null, meta: null };
  }

  // ── 3. Log metadata to reasoning_logs (no chunk content) ─────────────────
  if (meta !== null) {
    try {
      const logHash = createHash('sha256')
        .update(JSON.stringify(meta))
        .digest('hex');

      await tx.reasoningLog.create({
        data: {
          tenantId:        orgId,
          requestId:       `vrag-${Date.now()}-${orgId.slice(0, 8)}`,
          reasoningHash:   logHash,
          model:           'vector-rag/g028-a5',
          promptSummary:   `stage=vector_rag_injection topK=${meta.topK} minSim=${meta.minSimilarity}`,
          responseSummary: JSON.stringify({
            chunksInjected: meta.chunksInjected,
            topScore:       meta.topScore,
            latencyMs:      meta.latencyMs,
            sources:        meta.sources,
          }).slice(0, 200),
          tokensUsed: 0,
        },
      });
    } catch (logErr) {
      // Log failure must not propagate — inference proceeds regardless
      console.error('[G028-A5][rag_log_error]', { orgId, error: String(logErr) });
    }
  }

  return { contextBlock, meta };
}
