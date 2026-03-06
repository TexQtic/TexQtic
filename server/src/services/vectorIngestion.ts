/**
 * vectorIngestion.ts — G-028 A4/A6: Embedding ingestion pipeline
 *
 * Task IDs: OPS-G028-A4-EMBEDDING-INGESTION, OPS-G028-A6-SOURCE-EXPANSION-ASYNC-INDEXING
 * Doctrine: v1.4 — fail-safe-silent, idempotent, no prompt injection
 *
 * Provides (sync — direct pipeline):
 *   chunkText()            — re-exported from vectorChunker (deterministic)
 *   generateEmbedding()    — re-exported from vectorEmbeddingClient
 *   ingestSourceText()     — full pipeline: chunk → embed → upsert (sync)
 *   reindexSource()        — delete-all + re-ingest (sync, for backward compat)
 *   ingestCatalogItem()    — CatalogItem adapter (name + description)
 *   ingestCertification()  — Certification adapter (certificationType)
 *   ingestDppSnapshot()    — DPP snapshot adapter (traceabilityText)   [A6]
 *   ingestSupplierProfile()— Supplier profile adapter (capabilities)   [A6]
 *
 * Provides (async — queue-based, A6):
 *   enqueueSourceIngestion() — enqueue job for async worker (non-blocking)
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - All DB writes run under RLS (tx from withDbContext — no BYPASSRLS)
 *   - orgId MUST come from req.dbContext.orgId (JWT-derived, never request body)
 *   - Chunk content is NEVER logged (PII prevention)
 *   - Ingestion errors are caught and returned as error results — never thrown
 *
 * ADR-028 §5.1: EMBEDDING_DIM = 768 (text-embedding-004 default) — LOCKED.
 *
 * @module vectorIngestion
 */

import { upsertDocumentEmbeddings, deleteBySource } from '../lib/vectorStore.js';
import type { VectorStoreClient, DocumentChunkInput } from '../lib/vectorStore.js';
import { enqueueVectorIndexJob } from './vectorIndexQueue.js';
import type { EnqueueResult } from './vectorIndexQueue.js';

// ─── Re-exports from extracted modules (A6) — backward compatibility ─────────
// All public symbols that tests and callers import from vectorIngestion are
// preserved here as re-exports so no import paths need to change.

export {
  chunkText,
  MAX_CHUNK_LENGTH,
  CHUNK_OVERLAP,
  MAX_CHUNKS_PER_DOC,
  MAX_DOC_SIZE,
} from './vectorChunker.js';
export type { TextChunk } from './vectorChunker.js';

export {
  generateEmbedding,
  _overrideGenAIForTests,
  EMBEDDING_MODEL,
} from './vectorEmbeddingClient.js';

// ─── Local imports (used by ingestSourceText internals) ───────────────────────
import { chunkText, MAX_CHUNKS_PER_DOC, MAX_DOC_SIZE } from './vectorChunker.js';
import { generateEmbedding } from './vectorEmbeddingClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

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

/** Result of enqueueSourceIngestion(). */
export interface EnqueueIngestionResult {
  accepted: boolean;
  jobId?: string;
  reason?: 'QUEUE_FULL' | 'DOC_TOO_LARGE';
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

// ─── A6: New entity adapters ──────────────────────────────────────────────────

/**
 * Ingest a DPP snapshot. [A6 — new source]
 *
 * Indexes traceability text for use in DPP compliance RAG queries.
 * sourceType = 'DPP_SNAPSHOT'.
 *
 * The traceabilityText field aggregates supply-chain node data from
 * dpp_snapshot_products_v1, dpp_snapshot_lineage_v1, and
 * dpp_snapshot_certifications_v1 (per ADR-028 §1).
 *
 * @param db               Prisma tx client (from withDbContext — RLS active)
 * @param orgId            JWT-derived org UUID
 * @param snapshot         { id: string; traceabilityText: string; nodeId?: string }
 */
export async function ingestDppSnapshot(
  db: VectorStoreClient,
  orgId: string,
  snapshot: { id: string; traceabilityText: string; nodeId?: string | null },
): Promise<IngestionResult | IngestionError> {
  return ingestSourceText(
    db,
    orgId,
    'DPP_SNAPSHOT',
    snapshot.id,
    snapshot.traceabilityText,
    {
      nodeId: snapshot.nodeId ?? null,
    },
  );
}

/**
 * Ingest a Supplier Profile. [A6 — new source]
 *
 * Indexes supplier capabilities text for use in supplier matching RAG.
 * sourceType = 'SUPPLIER_PROFILE'.
 *
 * @param db       Prisma tx client (from withDbContext — RLS active)
 * @param orgId    JWT-derived org UUID
 * @param supplier { id: string; capabilities: string; name?: string | null }
 */
export async function ingestSupplierProfile(
  db: VectorStoreClient,
  orgId: string,
  supplier: { id: string; capabilities: string; name?: string | null },
): Promise<IngestionResult | IngestionError> {
  const parts = [supplier.capabilities];
  if (supplier.name) {
    parts.unshift(supplier.name);
  }
  const text = parts.join('\n\n');

  return ingestSourceText(db, orgId, 'SUPPLIER_PROFILE', supplier.id, text, {
    name: supplier.name ?? null,
  });
}

// ─── A6: Async queue entry point ──────────────────────────────────────────────

/**
 * Enqueue a source document for async embedding (non-blocking).
 *
 * This is the A6 preferred entry point for new indexing calls on mutation paths.
 * Instead of blocking the request with embedding generation, the job is queued
 * and processed by the background worker (startVectorIndexWorker).
 *
 * - Enforces MAX_DOC_SIZE before enqueueing (fast rejection, no Gemini call).
 * - Caller MUST pass orgId from req.dbContext.orgId (JWT-derived).
 * - Returns { accepted: false, reason: 'QUEUE_FULL' } if the queue is full —
 *   the caller should log this but need not fail the HTTP response.
 *
 * @param orgId      JWT-derived org UUID (from req.dbContext.orgId)
 * @param sourceType Domain discriminator
 * @param sourceId   UUID of the originating entity
 * @param text       Full text to embed (max MAX_DOC_SIZE chars)
 * @param metadata   Optional metadata forwarded to each chunk
 * @returns          EnqueueIngestionResult (never throws)
 */
export function enqueueSourceIngestion(
  orgId: string,
  sourceType: string,
  sourceId: string,
  text: string,
  metadata: Record<string, unknown> = {},
): EnqueueIngestionResult {
  // Fast guard: reject oversized docs before they enter the queue
  if (text.length > MAX_DOC_SIZE) {
    console.warn('[G028-A6][enqueue_doc_too_large]', {
      stage:      'vector_async_index',
      sourceType,
      sourceId,
      textLength: text.length,
      maxDocSize: MAX_DOC_SIZE,
    });
    return { accepted: false, reason: 'DOC_TOO_LARGE' };
  }

  const result: EnqueueResult = enqueueVectorIndexJob({
    orgId,
    sourceType,
    sourceId,
    textContent: text,
    metadata,
  });

  if (!result.accepted) {
    return { accepted: false, reason: 'QUEUE_FULL' };
  }

  return { accepted: true, jobId: result.jobId };
}
