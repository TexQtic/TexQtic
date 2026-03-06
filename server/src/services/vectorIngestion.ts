/**
 * vectorIngestion.ts — G-028 A4: Embedding ingestion pipeline
 *
 * Task ID: OPS-G028-A4-EMBEDDING-INGESTION
 * Doctrine: v1.4 — fail-safe-silent, idempotent, no prompt injection
 *
 * Provides:
 *   chunkText()          — deterministic sliding-window chunker (pure, no I/O)
 *   generateEmbedding()  — Gemini text-embedding-004, 1 retry, dim guard
 *   ingestSourceText()   — full pipeline: chunk → embed → upsert
 *   reindexSource()      — delete-all + re-ingest (safe for content updates)
 *   ingestCatalogItem()  — CatalogItem adapter (name + description)
 *   ingestCertification()— Certification adapter (certificationType)
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - All DB writes run under RLS (tx from withDbContext — no BYPASSRLS)
 *   - orgId MUST come from req.dbContext.orgId (JWT-derived, never request body)
 *   - Embedding generation is SYNCHRONOUS (no queue in A4 — see known limitations)
 *   - Chunk content is NEVER logged (PII prevention)
 *   - Ingestion errors are caught and returned as error results — never thrown
 *
 * ADR-028 §5.1: EMBEDDING_DIM = 768 (text-embedding-004 default) — LOCKED.
 *
 * @module vectorIngestion
 */

import { createHash } from 'node:crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { upsertDocumentEmbeddings, deleteBySource, EMBEDDING_DIM } from '../lib/vectorStore.js';
import type { VectorStoreClient, DocumentChunkInput } from '../lib/vectorStore.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum characters per chunk (TECS A4 §4). */
export const MAX_CHUNK_LENGTH = 800 as const;

/** Overlap between consecutive chunks (TECS A4 §4). */
export const CHUNK_OVERLAP = 100 as const;

/** Hard cap on chunks per source document (TECS A4 §10). */
export const MAX_CHUNKS_PER_DOC = 20 as const;

/** Hard cap on source document size before chunking (TECS A4 §10). */
export const MAX_DOC_SIZE = 20_000 as const;

/** Embedding model pinned per ADR-028 §5.1. */
const EMBEDDING_MODEL = 'text-embedding-004' as const;

/** Max embedding retry attempts (TECS A4 §5). */
const EMBEDDING_MAX_RETRIES = 1 as const;

// ─── Gemini client (lazy, module-level, same pattern as ai.ts) ───────────────

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return _genAI;
}

/**
 * Override the Gemini client instance (test-only dependency injection).
 * Call with `null` to reset to lazy default.
 */
export function _overrideGenAIForTests(instance: GoogleGenerativeAI | null): void {
  _genAI = instance;
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** One text chunk produced by chunkText(). */
export interface TextChunk {
  chunkIndex: number;
  content: string;
  contentHash: string;
}

/** Ingestion result returned by ingestSourceText() and reindexSource(). */
export interface IngestionResult {
  sourceType: string;
  sourceId: string;
  chunkCount: number;
  inserted: number;
  skipped: number;
  latencyMs: number;
}

/** Ingestion failure result (returned, not thrown). */
export interface IngestionError {
  status: 'ERROR';
  sourceType: string;
  sourceId: string;
  code: 'DOC_TOO_LARGE' | 'EMBED_FAILED' | 'UPSERT_FAILED' | 'TOO_MANY_CHUNKS';
  message: string;
}

// ─── chunkText ────────────────────────────────────────────────────────────────

/**
 * Split text into deterministic sliding-window chunks.
 *
 * - Splits are word-boundary-safe (no mid-word cuts) where possible.
 * - Each chunk is at most MAX_CHUNK_LENGTH characters.
 * - Consecutive chunks share CHUNK_OVERLAP characters of context.
 * - At most MAX_CHUNKS_PER_DOC chunks are produced (remaining text silently dropped
 *   with a warning — callers should enforce MAX_DOC_SIZE before calling).
 *
 * @param text      Source text to chunk.
 * @param maxLen    Max characters per chunk (default MAX_CHUNK_LENGTH = 800).
 * @param overlap   Overlap characters between chunks (default CHUNK_OVERLAP = 100).
 * @param maxChunks Max chunks to produce (default MAX_CHUNKS_PER_DOC = 20).
 * @returns         Array of TextChunk, in order.
 */
export function chunkText(
  text: string,
  maxLen: number = MAX_CHUNK_LENGTH,
  overlap: number = CHUNK_OVERLAP,
  maxChunks: number = MAX_CHUNKS_PER_DOC,
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let start = 0;
  const stride = Math.max(1, maxLen - overlap);

  while (start < text.length && chunks.length < maxChunks) {
    let end = start + maxLen;

    if (end < text.length) {
      // Prefer cutting at a word boundary (space or newline) within last 20% of chunk
      const searchFrom = start + Math.floor(maxLen * 0.8);
      const breakAt = text.lastIndexOf(' ', end);
      if (breakAt >= searchFrom) {
        end = breakAt;
      }
    } else {
      end = text.length;
    }

    const content = text.slice(start, end).trim();
    if (content.length > 0) {
      const contentHash = createHash('sha256').update(content).digest('hex');
      chunks.push({ chunkIndex: chunks.length, content, contentHash });
    }

    start += stride;
  }

  return chunks;
}

// ─── generateEmbedding ────────────────────────────────────────────────────────

/**
 * Generate a 768-dimension embedding using Gemini text-embedding-004.
 *
 * - Validates output length === EMBEDDING_DIM (fail-fast if Gemini changes dims).
 * - Retries once on transient failure (TECS A4 §5).
 * - Throws on persistent failure after 1 retry — callers must handle.
 *
 * @param text        Content to embed (should be ≤ MAX_CHUNK_LENGTH chars for quality).
 * @param genAIClient Optional override for dependency injection in tests.
 * @returns           Float array of length EMBEDDING_DIM (768).
 */
export async function generateEmbedding(
  text: string,
  genAIClient?: GoogleGenerativeAI,
): Promise<number[]> {
  const client = genAIClient ?? getGenAI();
  const model = client.getGenerativeModel({ model: EMBEDDING_MODEL });

  let lastError: unknown;

  for (let attempt = 0; attempt <= EMBEDDING_MAX_RETRIES; attempt++) {
    try {
      const result = await model.embedContent(text);
      const values = result.embedding.values;

      if (!values || values.length !== EMBEDDING_DIM) {
        throw new Error(
          `[G028-A4] Embedding dimension mismatch: expected ${EMBEDDING_DIM}, got ${values?.length ?? 0}`,
        );
      }

      // Spread Float32Array (or number[]) into plain number[]
      return Array.from(values);
    } catch (err) {
      lastError = err;
      if (attempt < EMBEDDING_MAX_RETRIES) {
        // Small delay before retry (100ms)
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  throw lastError;
}

// ─── ingestSourceText ─────────────────────────────────────────────────────────

/**
 * Full ingestion pipeline: chunk → embed → upsert.
 *
 * - Chunks are embedded one-by-one (no batching of Gemini calls in A4).
 * - A chunk whose embedding fails is skipped with a console.error — other chunks proceed.
 * - Upserted via A2 upsertDocumentEmbeddings (idempotent ON CONFLICT DO NOTHING).
 * - Observability: logs stage/counts/latency to console (no chunk content, PII-safe).
 *
 * @param db         Prisma transaction client (from withDbContext — RLS active)
 * @param orgId      JWT-derived org UUID (= req.dbContext.orgId)
 * @param sourceType Domain discriminator (e.g. 'CATALOG_ITEM', 'CERTIFICATION')
 * @param sourceId   UUID of the originating entity
 * @param text       Full text content of the entity
 * @param metadata   Optional structured metadata stored with each chunk
 * @returns          IngestionResult or IngestionError (never throws)
 */
export async function ingestSourceText(
  db: VectorStoreClient,
  orgId: string,
  sourceType: string,
  sourceId: string,
  text: string,
  metadata: Record<string, unknown> = {},
): Promise<IngestionResult | IngestionError> {
  const start = Date.now();

  // ── Safety: doc size guard ────────────────────────────────────────────────
  if (text.length > MAX_DOC_SIZE) {
    return {
      status: 'ERROR',
      sourceType,
      sourceId,
      code: 'DOC_TOO_LARGE',
      message: `Source text (${text.length} chars) exceeds MAX_DOC_SIZE (${MAX_DOC_SIZE})`,
    };
  }

  // ── Chunk ─────────────────────────────────────────────────────────────────
  const chunks = chunkText(text);

  if (chunks.length === 0) {
    // Empty text — nothing to do; treat as 0 inserted / 0 skipped success.
    return { sourceType, sourceId, chunkCount: 0, inserted: 0, skipped: 0, latencyMs: 0 };
  }

  if (chunks.length > MAX_CHUNKS_PER_DOC) {
    // chunkText already caps at MAX_CHUNKS_PER_DOC — this is a paranoia guard.
    return {
      status: 'ERROR',
      sourceType,
      sourceId,
      code: 'TOO_MANY_CHUNKS',
      message: `Chunk count (${chunks.length}) exceeds MAX_CHUNKS_PER_DOC (${MAX_CHUNKS_PER_DOC})`,
    };
  }

  // ── Generate embeddings + build DocumentChunkInput[] ─────────────────────
  const inputs: DocumentChunkInput[] = [];

  for (const chunk of chunks) {
    try {
      const embedding = await generateEmbedding(chunk.content);

      inputs.push({
        sourceType,
        sourceId,
        chunkIndex: chunk.chunkIndex,
        content:    chunk.content,
        embedding,
        metadata: {
          ...metadata,
          contentHash: chunk.contentHash,
        },
      });
    } catch (embedErr) {
      // Skip chunk on embed failure — other chunks still proceed
      console.error('[G028-A4][embed_error]', {
        sourceType,
        sourceId,
        chunkIndex: chunk.chunkIndex,
        error: String(embedErr),
      });
    }
  }

  if (inputs.length === 0) {
    return {
      status: 'ERROR',
      sourceType,
      sourceId,
      code: 'EMBED_FAILED',
      message: 'All chunks failed embedding — no data upserted',
    };
  }

  // ── Upsert (idempotent — ON CONFLICT DO NOTHING in A2) ───────────────────
  let upsertResult: { inserted: number; skipped: number };

  try {
    upsertResult = await upsertDocumentEmbeddings(db, orgId, inputs);
  } catch (upsertErr) {
    console.error('[G028-A4][upsert_error]', { sourceType, sourceId, error: String(upsertErr) });
    return {
      status: 'ERROR',
      sourceType,
      sourceId,
      code: 'UPSERT_FAILED',
      message: String(upsertErr),
    };
  }

  const result: IngestionResult = {
    sourceType,
    sourceId,
    chunkCount: chunks.length,
    inserted:   upsertResult.inserted,
    skipped:    upsertResult.skipped,
    latencyMs:  Date.now() - start,
  };

  // ── Observability (metadata only — no content) ────────────────────────────
  console.info('[G028-A4][vector_ingestion]', {
    stage:      'vector_ingestion',
    sourceType: result.sourceType,
    sourceId:   result.sourceId,
    chunkCount: result.chunkCount,
    inserted:   result.inserted,
    skipped:    result.skipped,
    latencyMs:  result.latencyMs,
  });

  return result;
}

// ─── reindexSource ────────────────────────────────────────────────────────────

/**
 * Re-index a source document: delete all existing chunks, then re-ingest.
 *
 * Safe for use when source content has changed. Internally calls:
 *   1. deleteBySource(db, orgId, sourceType, sourceId)
 *   2. ingestSourceText(db, orgId, sourceType, sourceId, text, metadata)
 *
 * @returns IngestionResult or IngestionError (never throws)
 */
export async function reindexSource(
  db: VectorStoreClient,
  orgId: string,
  sourceType: string,
  sourceId: string,
  text: string,
  metadata: Record<string, unknown> = {},
): Promise<IngestionResult | IngestionError> {
  try {
    await deleteBySource(db, orgId, sourceType, sourceId);
  } catch (delErr) {
    // Log but proceed — upsert will dedupe on contentHash anyway
    console.error('[G028-A4][delete_error]', { sourceType, sourceId, error: String(delErr) });
  }

  return ingestSourceText(db, orgId, sourceType, sourceId, text, metadata);
}

// ─── Entity adapters ──────────────────────────────────────────────────────────

/**
 * Ingest a CatalogItem.
 *
 * Combines `name` and `description` (if present) into a single document.
 * sourceType = 'CATALOG_ITEM'.
 *
 * Note: `tenantId` on CatalogItem === `organizations.id` (same FK per schema §891).
 * Callers MUST pass `orgId` from `req.dbContext.orgId` — not from request body.
 *
 * @param db     Prisma tx client (from withDbContext — RLS active)
 * @param orgId  JWT-derived org UUID
 * @param item   { id: string; name: string; description?: string | null }
 */
export async function ingestCatalogItem(
  db: VectorStoreClient,
  orgId: string,
  item: { id: string; name: string; description?: string | null },
): Promise<IngestionResult | IngestionError> {
  const parts = [item.name];
  if (item.description) {
    parts.push(item.description);
  }
  const text = parts.join('\n\n');

  return ingestSourceText(db, orgId, 'CATALOG_ITEM', item.id, text, {
    name: item.name,
  });
}

/**
 * Ingest a Certification.
 *
 * Uses `certificationType` as the source text. Metadata records the type string.
 * sourceType = 'CERTIFICATION'.
 *
 * @param db     Prisma tx client (from withDbContext — RLS active)
 * @param orgId  JWT-derived org UUID (= Certification.orgId)
 * @param cert   { id: string; certificationType: string }
 */
export async function ingestCertification(
  db: VectorStoreClient,
  orgId: string,
  cert: { id: string; certificationType: string },
): Promise<IngestionResult | IngestionError> {
  return ingestSourceText(db, orgId, 'CERTIFICATION', cert.id, cert.certificationType, {
    certificationType: cert.certificationType,
  });
}
