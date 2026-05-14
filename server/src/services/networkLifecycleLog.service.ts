/**
 * Network Commerce — Lifecycle Log Read Service
 * TEXQTIC-NC-PHASE1-LIFECYCLE-LOG-READ-001
 *
 * Read-only surface for NetworkLifecycleLog entries scoped to a Pool entity.
 *
 * D-017-A: orgId MUST come from request.dbContext.orgId (JWT) — never from params/body.
 * Wrong-org access: non-leaking LifecycleLogPoolNotFoundError (returns 404 upstream).
 *
 * DTO safety rules:
 *   EXPOSED:  id, entity_type, entity_id, from_state_key, to_state_key,
 *             actor_type, actor_role, actor_user_id, ai_triggered, reason, created_at
 *   OMITTED:  actor_admin_id (platform-internal), impersonation_id (internal audit),
 *             maker_user_id, checker_user_id (MakerChecker internals),
 *             request_id (correlation internal), escalation_level (internal severity)
 *
 * No mutations. No feature-flag gating. No payment / payout / money movement.
 */

import type { PrismaClient } from '@prisma/client';

// ─── Custom Errors ────────────────────────────────────────────────────────────

export class LifecycleLogPoolNotFoundError extends Error {
  constructor(message = 'Network pool not found') {
    super(message);
    this.name = 'LifecycleLogPoolNotFoundError';
  }
}

export class LifecycleLogInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LifecycleLogInvalidInputError';
  }
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface LifecycleLogDto {
  id:             string;
  entity_type:    string;
  entity_id:      string;
  from_state_key: string;
  to_state_key:   string;
  actor_type:     string;
  actor_role:     string;
  actor_user_id:  string | null;
  ai_triggered:   boolean;
  reason:         string;
  created_at:     string; // ISO 8601
}

export interface ListPoolLifecycleLogsResult {
  items:      LifecycleLogDto[];
  pagination: { total: number; limit: number; offset: number };
}

export interface ListPoolLifecycleLogsOpts {
  limit:  number;
  offset: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class NetworkLifecycleLogService {
  constructor(private readonly db: PrismaClient) {}

  /**
   * List lifecycle log entries for a Pool entity, scoped to orgId.
   *
   * Step 1: Verify pool belongs to orgId using a scoped findFirst.
   *         Throws LifecycleLogPoolNotFoundError if absent (non-leaking 404).
   * Step 2: Count total matching log rows for pagination.
   * Step 3: Fetch paginated log rows ordered newest-first.
   * Step 4: Map to safe DTO (internal platform fields are omitted).
   *
   * @param orgId  Caller's org from JWT/dbContext — never from request params.
   * @param poolId UUID of the pool to read logs for.
   * @param opts   Pagination options: limit (1–100) and offset (≥0).
   */
  async listPoolLifecycleLogs(
    orgId:  string,
    poolId: string,
    opts:   ListPoolLifecycleLogsOpts,
  ): Promise<ListPoolLifecycleLogsResult> {
    // Step 1: Non-leaking ownership check
    const pool = await this.db.networkPool.findFirst({
      where:  { id: poolId, orgId },
      select: { id: true },
    });
    if (!pool) {
      throw new LifecycleLogPoolNotFoundError();
    }

    // Step 2: Count for pagination
    const total = await this.db.networkLifecycleLog.count({
      where: { orgId, entityType: 'POOL', entityId: poolId },
    });

    // Step 3: Fetch paginated rows — newest first
    const rows = await this.db.networkLifecycleLog.findMany({
      where:   { orgId, entityType: 'POOL', entityId: poolId },
      orderBy: { createdAt: 'desc' },
      take:    opts.limit,
      skip:    opts.offset,
      select: {
        id:          true,
        entityType:  true,
        entityId:    true,
        fromStateKey: true,
        toStateKey:  true,
        actorType:   true,
        actorRole:   true,
        actorUserId: true,
        aiTriggered: true,
        reason:      true,
        createdAt:   true,
      },
    });

    // Step 4: Map to safe DTO
    const items: LifecycleLogDto[] = rows.map(r => ({
      id:             r.id,
      entity_type:    r.entityType,
      entity_id:      r.entityId,
      from_state_key: r.fromStateKey,
      to_state_key:   r.toStateKey,
      actor_type:     r.actorType,
      actor_role:     r.actorRole,
      actor_user_id:  r.actorUserId ?? null,
      ai_triggered:   r.aiTriggered,
      reason:         r.reason,
      created_at:     r.createdAt.toISOString(),
    }));

    return {
      items,
      pagination: { total, limit: opts.limit, offset: opts.offset },
    };
  }
}
