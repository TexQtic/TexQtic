/**
 * vectorWorker.ts — Production vector index queue bootstrap
 *
 * G-028-B2-WORKER-BOOTSTRAP: wires the vector index queue worker into the
 * production server bootstrap so enqueued upsert/delete jobs actually execute.
 *
 * Architecture:
 *   enqueueSourceIngestion/Deletion → in-process queue
 *   → worker tick (1s) → runner(job)
 *   → withDbContext(prisma, ctx, tx => executeVectorIndexJob(tx, job))
 *
 * Tenant Safety Guarantees:
 *   - Each job carries orgId from req.dbContext.orgId (validated at enqueue time)
 *   - withDbContext sets app.org_id and enforces RLS for every transaction
 *   - orgId is taken ONLY from job.orgId — never from an external source
 *   - actorId is a fixed system service identity (not a real user account)
 *
 * Known limitations (inherited from A6 queue architecture §14):
 *   - In-process queue is lost on server restart (no persistence)
 *   - Not suitable for multi-instance deployments
 *
 * @module vectorWorker
 */

import { randomUUID } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { withDbContext, type DatabaseContext } from '../lib/database-context.js';
import { executeVectorIndexJob } from '../services/vectorIngestion.js';
import { startVectorIndexWorker } from '../services/vectorIndexQueue.js';
import type { VectorIndexJob } from '../services/vectorIndexQueue.js';

// ─── System Service Identity ──────────────────────────────────────────────────

/**
 * Fixed well-known UUID identifying the vector indexing system service actor.
 *
 * Satisfies withDbContext's fail-closed actorId validation for background jobs.
 * This is a named system service identity — not a real user account.
 * Background vector jobs have no user identity; this UUID is the canonical
 * representation of the vector-worker service principal.
 */
const VECTOR_WORKER_ACTOR_ID = '00000000-0000-0000-0000-000000000001' as const;

// ─── Context Builder ──────────────────────────────────────────────────────────

/**
 * Build a tenant-scoped DatabaseContext for background vector job execution.
 *
 * - orgId   — from job.orgId (authoritative; set at enqueue from req.dbContext.orgId)
 * - actorId — VECTOR_WORKER_ACTOR_ID (fixed system service identity)
 * - realm   — 'tenant' (tenant-scoped vector data, not control-plane)
 * - requestId — generated per-job for per-execution trace observability
 */
function buildVectorJobContext(orgId: string): DatabaseContext {
  return {
    orgId,
    actorId:   VECTOR_WORKER_ACTOR_ID,
    realm:     'tenant',
    requestId: randomUUID(),
  };
}

// ─── Production Runner ────────────────────────────────────────────────────────

/**
 * Start the production vector index worker.
 *
 * Creates a concrete JobRunner that:
 * 1. Builds a tenant-scoped DatabaseContext from job.orgId
 * 2. Wraps execution in withDbContext() (RLS-enforced transaction)
 * 3. Dispatches via executeVectorIndexJob() — handles both upsert and delete
 *
 * This satisfies the constitutional requirement that all DB writes run under
 * RLS isolation (vectorIndexQueue.ts architecture §CONSTITUTIONAL CONSTRAINTS).
 *
 * @returns stop handle — call on server shutdown to clear the worker interval
 */
export function startVectorWorker(): { stop: () => void } {
  const runner = async (job: VectorIndexJob): Promise<void> => {
    const ctx = buildVectorJobContext(job.orgId);
    await withDbContext(prisma, ctx, async (tx) => {
      await executeVectorIndexJob(tx, job);
    });
  };

  return startVectorIndexWorker(runner);
}
