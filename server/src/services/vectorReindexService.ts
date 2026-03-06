/**
 * vectorReindexService.ts — G-028 A6: Vector reindex service
 *
 * Task ID: OPS-G028-A6-SOURCE-EXPANSION-ASYNC-INDEXING
 *
 * Provides autonomous reindexing functions that:
 *   1. Delete existing embeddings for a source (under RLS, via withDbContext)
 *   2. Enqueue a fresh ingestion job for the source (via vectorIndexQueue)
 *
 * The delete step is synchronous and happens before enqueueing, avoiding a
 * race condition where the old embeddings remain visible during re-ingestion.
 *
 * CONSTITUTIONAL CONSTRAINTS:
 *   - All DB operations run under RLS (withDbContext + VECTOR_WORKER_ACTOR sentinel)
 *   - orgId is ALWAYS caller-provided (never derived from the DB)
 *   - No content logged (PII prevention)
 *   - Enqueue may be rejected if queue is full — caller receives the rejection count
 *
 * Known limitations:
 *   - reindexTenant() with many items may approach QUEUE_SIZE_MAX
 *   - Reindex is eventual: embeddings are rebuilt when the worker next ticks
 *   - No distributed lock — concurrent reindexes for same sourceId are possible
 *
 * @module vectorReindexService
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { withDbContext } from '../lib/database-context.js';
import { deleteBySource } from '../lib/vectorStore.js';
import { enqueueVectorIndexJob } from './vectorIndexQueue.js';
import type { VectorIndexJob } from './vectorIndexQueue.js';

// ─── Sentinel actor ───────────────────────────────────────────────────────────

/**
 * Sentinel actor UUID for system-initiated vector reindex operations.
 * Used as actorId in the DatabaseContext when no user request is in scope.
 * Identifies reindex events in audit logs; never a real user UUID.
 */
export const VECTOR_WORKER_ACTOR_SENTINEL = '00000000-0000-0000-0000-000000000010' as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** One item passed to reindexTenant(). */
export interface ReindexItem {
  sourceType: string;
  sourceId: string;
  textContent: string;
  metadata?: Record<string, unknown>;
}

/** Result from reindexSource(). */
export interface ReindexSourceResult {
  orgId: string;
  sourceType: string;
  sourceId: string;
  deleted: boolean;
  enqueued: boolean;
  jobId?: string;
  reason?: 'QUEUE_FULL' | 'DELETE_FAILED';
}

/** Result from reindexTenant(). */
export interface ReindexTenantResult {
  orgId: string;
  totalItems: number;
  enqueued: number;
  rejected: number;
  deleteErrors: number;
}

// ─── reindexSource ────────────────────────────────────────────────────────────

/**
 * Reindex a single source document (autonomous, uses system RLS context).
 *
 * Flow:
 *   1. Open withDbContext(orgId, VECTOR_WORKER_ACTOR_SENTINEL) transaction
 *   2. Call deleteBySource(tx, orgId, sourceType, sourceId)
 *   3. Close transaction (delete committed)
 *   4. enqueueVectorIndexJob({ orgId, sourceType, sourceId, textContent })
 *
 * The delete step is committed before the job is enqueued to prevent stale
 * embeddings from being served between delete and re-ingestion.
 *
 * @param orgId       Tenant org UUID — from mutation context or admin call.
 * @param sourceType  Domain discriminator (e.g. 'CATALOG_ITEM', 'DPP_SNAPSHOT').
 * @param sourceId    UUID of the originating entity.
 * @param textContent Full text content to re-embed.
 * @param metadata    Optional metadata attached to new chunks.
 * @returns           ReindexSourceResult (never throws).
 */
export async function reindexSource(
  orgId: string,
  sourceType: string,
  sourceId: string,
  textContent: string,
  metadata: Record<string, unknown> = {},
): Promise<ReindexSourceResult> {
  // ── Step 1: Delete existing embeddings under RLS ──────────────────────────
  try {
    const ctx = {
      orgId,
      actorId:   VECTOR_WORKER_ACTOR_SENTINEL,
      realm:     'tenant' as const,
      requestId: randomUUID(),
    };

    await withDbContext(prisma, ctx, async tx => {
      await deleteBySource(tx, orgId, sourceType, sourceId);
    });
  } catch (delErr) {
    console.error('[G028-A6][reindex_delete_error]', {
      stage:      'vector_async_index',
      sourceType,
      sourceId,
      error:      String(delErr),
    });

    // Return partial failure — enqueue is skipped to avoid re-inserting stale data
    // when we couldn't confirm the delete.
    return {
      orgId,
      sourceType,
      sourceId,
      deleted: false,
      enqueued: false,
      reason: 'DELETE_FAILED',
    };
  }

  // ── Step 2: Enqueue fresh ingestion ───────────────────────────────────────
  const jobPayload: Omit<VectorIndexJob, '_jobId' | '_enqueuedAt'> = {
    orgId,
    sourceType,
    sourceId,
    textContent,
    metadata,
  };

  const enqueueResult = enqueueVectorIndexJob(jobPayload);

  if (!enqueueResult.accepted) {
    console.warn('[G028-A6][reindex_enqueue_rejected]', {
      stage:      'vector_async_index',
      sourceType,
      sourceId,
      reason:     enqueueResult.reason,
    });

    return {
      orgId,
      sourceType,
      sourceId,
      deleted: true,
      enqueued: false,
      reason: 'QUEUE_FULL',
    };
  }

  return {
    orgId,
    sourceType,
    sourceId,
    deleted: true,
    enqueued: true,
    jobId: enqueueResult.jobId,
  };
}

// ─── reindexTenant ────────────────────────────────────────────────────────────

/**
 * Reindex all provided items for a tenant.
 *
 * Processes items sequentially (delete-then-enqueue) to avoid queue explosion
 * on large batches. Each item's delete is committed before the next item begins.
 *
 * If the queue fills up during the batch, remaining items are rejected and
 * counted in the result. The function does NOT throw on partial failure.
 *
 * Use-case: admin-triggered full reindex, DPP compliance sweep, migration.
 *
 * @param orgId  Tenant org UUID.
 * @param items  Array of items to reindex.
 * @returns      ReindexTenantResult with counts.
 */
export async function reindexTenant(
  orgId: string,
  items: ReindexItem[],
): Promise<ReindexTenantResult> {
  let enqueued = 0;
  let rejected = 0;
  let deleteErrors = 0;

  for (const item of items) {
    const result = await reindexSource(
      orgId,
      item.sourceType,
      item.sourceId,
      item.textContent,
      item.metadata ?? {},
    );

    if (result.reason === 'DELETE_FAILED') {
      deleteErrors++;
    } else if (result.enqueued) {
      enqueued++;
    } else {
      rejected++; // QUEUE_FULL
    }
  }

  console.info('[G028-A6][reindex_tenant_complete]', {
    stage:        'vector_async_index',
    orgId,
    totalItems:   items.length,
    enqueued,
    rejected,
    deleteErrors,
  });

  return {
    orgId,
    totalItems:   items.length,
    enqueued,
    rejected,
    deleteErrors,
  };
}
