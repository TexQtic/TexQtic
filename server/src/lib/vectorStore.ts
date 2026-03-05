/**
 * vectorStore.ts — G-028 A2: Tenant-isolated vector store operations
 *
 * Task ID: OPS-G028-A2-TVS-MODULE
 * Doctrine: v1.4 — Minimal-diff, fail-closed, no BYPASSRLS
 *
 * Provides three operations over `document_embeddings`:
 *   - upsertDocumentEmbeddings — batch insert with ON CONFLICT DO NOTHING
 *   - querySimilar             — cosine similarity search with RLS tenant isolation
 *   - deleteBySource           — hard-delete by (org, sourceType, sourceId)
 *
 * CONSTITUTIONAL CONSTRAINTS:
 * - All queries run under RLS (no BYPASSRLS, no SET LOCAL ROLE bypass)
 * - orgId is ALWAYS sourced from req.dbContext.orgId (JWT-derived, never request body)
 * - embedding[] must be exactly EMBEDDING_DIM = 768 dimensions (ADR-028 §5.1)
 * - Callers MUST wrap these calls inside withDbContext() to activate RLS context
 *
 * HNSW WRITE-LATENCY GATE (sealed A1 note):
 * If upsert P95 > acceptable threshold under bulk load:
 *   1. DROP INDEX idx_doc_embed_hnsw
 *   2. Bulk-ingest via upsertDocumentEmbeddings()
 *   3. CREATE INDEX CONCURRENTLY idx_doc_embed_hnsw ON document_embeddings
 *      USING hnsw (embedding vector_cosine_ops)
 *      WITH (m = 16, ef_construction = 64)
 * Tuning levers: m=16→8, ef_construction=64→32 require ADR-028 amendment.
 *
 * @module vectorStore
 */

import { Prisma, PrismaClient } from '@prisma/client';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Locked embedding dimension (text-embedding-004 / nomic-embed-text). ADR-028 §5.1. */
export const EMBEDDING_DIM = 768 as const;

/** Maximum chunks per upsert call. Prevents runaway allocations. */
export const MAX_BATCH = 200 as const;

/** Maximum results returned by querySimilar (hard cap, not configurable). */
const MAX_TOP_K = 50 as const;

/** Maximum content characters per chunk. */
const MAX_CONTENT_CHARS = 10_000 as const;

/** UUID format validation (v1–v5, case-insensitive). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Error ────────────────────────────────────────────────────────────────────

export type VectorStoreErrorCode =
  | 'DIMENSION_MISMATCH'
  | 'BATCH_TOO_LARGE'
  | 'INVALID_ORG_ID'
  | 'INVALID_INPUT'
  | 'DB_ERROR';

/**
 * Typed error thrown for all vector store violations.
 * Use `err.code` to discriminate in catch blocks.
 */
export class VectorStoreError extends Error {
  public readonly name = 'VectorStoreError';

  constructor(
    public readonly code: VectorStoreErrorCode,
    message: string,
  ) {
    super(message);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** One chunk to store. All fields required except metadata. */
export interface DocumentChunkInput {
  /** Discriminator for the source domain (e.g. 'POLICY', 'FAQ', 'CONTRACT'). */
  sourceType: string;
  /** UUID of the originating document or entity. */
  sourceId: string;
  /** Zero-based position within the document. */
  chunkIndex: number;
  /** Plain text content of the chunk (≤ 10,000 chars). */
  content: string;
  /** Dense embedding vector — must be exactly EMBEDDING_DIM (768) floats. */
  embedding: number[];
  /** Arbitrary structured metadata (stored as JSONB). */
  metadata?: Record<string, unknown>;
}

/** One result row from querySimilar. */
export interface SimilarityResult {
  id: string;
  sourceType: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  metadata: Record<string, unknown> | null;
  /** Cosine similarity in [0, 1]. Higher = more similar. */
  similarity: number;
}

/** Options for querySimilar. All fields optional — sensible defaults applied. */
export interface QuerySimilarOptions {
  /** Number of results to return. Default 10; capped at MAX_TOP_K (50). */
  topK?: number;
  /** Minimum similarity threshold in [0, 1]. Default 0.2. */
  minSimilarity?: number;
  /** Restrict results to a specific sourceType. */
  sourceType?: string;
  /** Restrict results to a specific sourceId (UUID). */
  sourceId?: string;
  /**
   * HNSW ef_search tuning (bounded [20, 200]).
   * Higher = better recall at the cost of latency.
   * Only effective inside an active transaction (SET LOCAL scope).
   */
  efSearch?: number;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function assertUuid(value: string, label: string): void {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new VectorStoreError('INVALID_ORG_ID', `${label} must be a valid UUID, got: "${value}"`);
  }
}

function assertUuidInput(value: string, label: string): void {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new VectorStoreError('INVALID_INPUT', `${label} must be a valid UUID, got: "${value}"`);
  }
}

function assertEmbeddingDim(embedding: number[], label: string): void {
  if (embedding.length !== EMBEDDING_DIM) {
    throw new VectorStoreError(
      'DIMENSION_MISMATCH',
      `${label}: expected ${EMBEDDING_DIM} dimensions, got ${embedding.length}`,
    );
  }
}

/**
 * Serialise a float[] as a Postgres vector literal.
 * Prisma.raw() injects the value as raw SQL (not a parameter), which is
 * required because Postgres cannot bind vector type via protocol parameters.
 * The float values come exclusively from validated internal sources.
 */
function toVectorLiteral(embedding: number[]): Prisma.Sql {
  return Prisma.raw(`'[${embedding.join(',')}]'::vector(${EMBEDDING_DIM})`);
}

// ─── upsertDocumentEmbeddings ─────────────────────────────────────────────────

/**
 * Batch-upsert document embedding chunks under the caller's RLS context.
 *
 * - Inserts are idempotent: duplicate (org, sourceType, sourceId, chunkIndex, contentHash)
 *   rows are silently skipped (ON CONFLICT DO NOTHING).
 * - content_hash is computed server-side via SHA-256 (pgcrypto digest).
 * - No BYPASSRLS — all writes are subject to tenant-isolation policies.
 *
 * @param db     Prisma client or transaction client (from withDbContext)
 * @param orgId  JWT-derived org UUID — MUST equal req.dbContext.orgId
 * @param chunks Array of chunks to upsert (1 – MAX_BATCH)
 * @returns      Count of inserted vs skipped rows
 */
export async function upsertDocumentEmbeddings(
  db: PrismaClient,
  orgId: string,
  chunks: DocumentChunkInput[],
): Promise<{ inserted: number; skipped: number }> {
  // ── Validate orgId ─────────────────────────────────────────────────────────
  assertUuid(orgId, 'orgId');

  // ── Short-circuit empty batch ──────────────────────────────────────────────
  if (chunks.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  // ── Batch size guard ───────────────────────────────────────────────────────
  if (chunks.length > MAX_BATCH) {
    throw new VectorStoreError(
      'BATCH_TOO_LARGE',
      `Batch of ${chunks.length} exceeds MAX_BATCH of ${MAX_BATCH}`,
    );
  }

  // ── Per-chunk validation ───────────────────────────────────────────────────
  for (const [i, chunk] of chunks.entries()) {
    const label = `chunks[${i}] sourceId=${chunk.sourceId}`;

    assertEmbeddingDim(chunk.embedding, label);
    assertUuidInput(chunk.sourceId, `${label} sourceId`);

    if (chunk.content.length > MAX_CONTENT_CHARS) {
      throw new VectorStoreError(
        'INVALID_INPUT',
        `${label}: content exceeds ${MAX_CONTENT_CHARS} chars (got ${chunk.content.length})`,
      );
    }

    if (!chunk.sourceType) {
      throw new VectorStoreError('INVALID_INPUT', `${label}: sourceType must not be empty`);
    }
  }

  // ── Insert loop (one row per statement for correctness; future: bulk VALUES) ─
  let inserted = 0;
  let skipped = 0;

  for (const chunk of chunks) {
    const vec = toVectorLiteral(chunk.embedding);
    const meta = JSON.stringify(chunk.metadata ?? {});

    const affected: number = await db.$executeRaw`
      INSERT INTO document_embeddings
        (org_id, source_type, source_id, chunk_index, content_hash, content, embedding, metadata)
      VALUES (
        ${orgId}::uuid,
        ${chunk.sourceType},
        ${chunk.sourceId}::uuid,
        ${chunk.chunkIndex},
        encode(digest(${chunk.content}, 'sha256'), 'hex'),
        ${chunk.content},
        ${vec},
        ${meta}::jsonb
      )
      ON CONFLICT (org_id, source_type, source_id, chunk_index, content_hash)
      DO NOTHING
    `;

    if (affected > 0) {
      inserted++;
    } else {
      skipped++;
    }
  }

  return { inserted, skipped };
}

// ─── querySimilar ─────────────────────────────────────────────────────────────

/**
 * Find the most similar chunks to a query embedding within the caller's org.
 *
 * - RLS ensures only the caller's org rows are visible (no cross-tenant leakage).
 * - orgId is always applied as an explicit WHERE filter (defence in depth).
 * - Results ordered by ascending cosine distance (descending similarity).
 * - Optional efSearch tunes HNSW recall/latency (SET LOCAL, transaction-scoped).
 *
 * @param db        Prisma client or transaction client (from withDbContext)
 * @param orgId     JWT-derived org UUID — MUST equal req.dbContext.orgId
 * @param embedding Query vector (must be EMBEDDING_DIM floats)
 * @param opts      Optional filters and tuning parameters
 * @returns         Ranked results with similarity scores
 */
export async function querySimilar(
  db: PrismaClient,
  orgId: string,
  embedding: number[],
  opts: QuerySimilarOptions = {},
): Promise<SimilarityResult[]> {
  // ── Validate ───────────────────────────────────────────────────────────────
  assertUuid(orgId, 'orgId');
  assertEmbeddingDim(embedding, 'query embedding');

  // ── Resolve options ────────────────────────────────────────────────────────
  const topK = Math.min(Math.max(1, opts.topK ?? 10), MAX_TOP_K);
  const minSimilarity = Math.max(0, Math.min(1, opts.minSimilarity ?? 0.2));

  // ── Optional HNSW ef_search tuning ────────────────────────────────────────
  // Bounded to [20, 200] to prevent misconfiguration.
  // Must run inside a transaction for SET LOCAL to take effect.
  if (opts.efSearch !== undefined) {
    const efSearch = Math.max(20, Math.min(200, Math.round(opts.efSearch)));
    await db.$executeRawUnsafe(`SET LOCAL hnsw.ef_search = ${efSearch}`);
  }

  // ── Build optional source filters ──────────────────────────────────────────
  const sourceTypeFilter: Prisma.Sql = opts.sourceType
    ? Prisma.sql`AND source_type = ${opts.sourceType}`
    : Prisma.sql``;

  const sourceIdFilter: Prisma.Sql =
    opts.sourceId && UUID_PATTERN.test(opts.sourceId)
      ? Prisma.sql`AND source_id = ${opts.sourceId}::uuid`
      : Prisma.sql``;

  const vec = toVectorLiteral(embedding);

  // ── Raw query with cosine similarity ──────────────────────────────────────
  // <=> = cosine distance; similarity = 1 - distance.
  // ORDER BY distance ASC  → highest similarity first.
  // Defence-in-depth: explicit org_id WHERE even though RLS enforces it.
  type RawRow = {
    id: string;
    source_type: string;
    source_id: string;
    chunk_index: number | bigint;
    content: string;
    metadata: Record<string, unknown> | null;
    similarity: number | string;
  };

  const rows = await db.$queryRaw<RawRow[]>`
    SELECT
      id::text,
      source_type,
      source_id::text,
      chunk_index,
      content,
      metadata,
      (1 - (embedding <=> ${vec})) AS similarity
    FROM document_embeddings
    WHERE org_id = ${orgId}::uuid
      AND (1 - (embedding <=> ${vec})) >= ${minSimilarity}
      ${sourceTypeFilter}
      ${sourceIdFilter}
    ORDER BY embedding <=> ${vec}
    LIMIT ${topK}
  `;

  return rows.map(r => ({
    id: r.id,
    sourceType: r.source_type,
    sourceId: r.source_id,
    chunkIndex: Number(r.chunk_index),
    content: r.content,
    metadata: r.metadata,
    similarity: Number(r.similarity),
  }));
}

// ─── deleteBySource ───────────────────────────────────────────────────────────

/**
 * Hard-delete all chunks for a given (orgId, sourceType, sourceId) triple.
 *
 * - orgId is always applied as an explicit WHERE filter (defence in depth).
 * - No BYPASSRLS — deletion is subject to tenant-isolation policies.
 * - Returns the count of deleted rows.
 *
 * @param db         Prisma client or transaction client (from withDbContext)
 * @param orgId      JWT-derived org UUID — MUST equal req.dbContext.orgId
 * @param sourceType Document domain discriminator
 * @param sourceId   UUID of the document to delete all chunks for
 * @returns          Count of deleted rows
 */
export async function deleteBySource(
  db: PrismaClient,
  orgId: string,
  sourceType: string,
  sourceId: string,
): Promise<{ deleted: number }> {
  // ── Validate ───────────────────────────────────────────────────────────────
  assertUuid(orgId, 'orgId');
  assertUuidInput(sourceId, 'sourceId');

  if (!sourceType) {
    throw new VectorStoreError('INVALID_INPUT', 'sourceType must not be empty');
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleted: number = await db.$executeRaw`
    DELETE FROM document_embeddings
    WHERE org_id     = ${orgId}::uuid
      AND source_type = ${sourceType}
      AND source_id   = ${sourceId}::uuid
  `;

  return { deleted };
}
