/**
 * aiEmitter.ts — PW5-AI-EMITTER
 *
 * Best-effort AI domain event emission helper.
 *
 * Execution chain (per emitAiEventBestEffort call):
 *   1. validateEventPayload()      — AI payload schema guard (eventSchemas.ts)
 *   2. Build EventEnvelope         — v1 envelope, TENANT realm, SYSTEM actor
 *   3. validateKnownEvent()        — envelope structure guard (events.ts)
 *   4. assertNoSecretsInPayload()  — secrets guard (events.ts)
 *   5. emitEventToSink()           — P0 console sink (events.ts)
 *   6. storeEventBestEffort()      — DB persistence (only when auditLogId + prisma provided)
 *
 * RULES:
 * - Emission is always best-effort: failures are caught, logged, never rethrown
 * - Must NEVER break the primary request flow
 * - Payload must be minimal, non-secret, non-PII (enforced by schema + secrets guard)
 * - auditLogId is optional; omit when no audit log row is associated with the event
 * - Per EventLog schema, persistence requires a valid auditLogId — omit for sink-only events
 *
 * SCOPE: PW5-AI-EMITTER only.
 * - No projection handlers
 * - No routes
 * - No schema changes
 * - AUDIT_ACTION_TO_EVENT_NAME is NOT touched
 */

import { randomUUID } from 'node:crypto';
import type { PrismaClient, Prisma } from '@prisma/client';
import { validateEventPayload } from '../events/eventSchemas.js';
import {
  validateKnownEvent,
  assertNoSecretsInPayload,
  emitEventToSink,
  storeEventBestEffort,
} from '../lib/events.js';
import type { KnownEventName } from '../lib/events.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Options for emitting an AI domain event.
 */
export interface AiEventOpts {
  /**
   * Tenant org UUID — used as envelope.tenantId and entity.id.
   * Must be a valid UUID (validated downstream by validateKnownEvent).
   */
  orgId: string;

  /**
   * Optional actor user ID (UUID). Defaults to null → SYSTEM actor.
   */
  actorId?: string | null;

  /**
   * Optional ISO8601 timestamp override. Defaults to new Date().toISOString().
   */
  timestamp?: string;

  /**
   * When provided together with prisma, the event is persisted to EventLog
   * via storeEventBestEffort(). Requires a valid AuditLog UUID — EventLog.auditLogId
   * has a NOT NULL @unique constraint.
   *
   * Omit when no audit log row is associated with this event path (sink-only).
   */
  auditLogId?: string;

  /**
   * Prisma client or transaction. Only used when auditLogId is also provided.
   */
  prisma?: DbClient;
}

/**
 * Emit an AI domain event — best-effort, non-blocking.
 *
 * All errors are caught and logged. This function MUST NOT throw.
 *
 * @param name    KnownEventName for an AI-domain event
 * @param payload Minimal, non-secret payload satisfying the registered AI schema
 * @param opts    Emission options (orgId required; auditLogId + prisma for persistence)
 */
export async function emitAiEventBestEffort(
  name: KnownEventName,
  payload: Record<string, unknown>,
  opts: AiEventOpts
): Promise<void> {
  try {
    // 1. Validate payload against the registered AI schema
    const validatedPayload = validateEventPayload(name, payload);

    // 2. Build v1 EventEnvelope
    const now = opts.timestamp ?? new Date().toISOString();
    const envelope = {
      id: randomUUID(),
      version: 'v1' as const,
      name,
      occurredAt: now,
      tenantId: opts.orgId,
      realm: 'TENANT' as const,
      actor: {
        type: 'SYSTEM' as const,
        id: opts.actorId ?? null,
      },
      entity: {
        // 'ai' entity type — orgId is the tenant-scoped entity UUID
        type: 'ai',
        id: opts.orgId,
      },
      payload: validatedPayload as Prisma.JsonValue,
      metadata: {},
    };

    // 3. Validate as KnownEventEnvelope (structural guard)
    const knownEnvelope = validateKnownEvent(envelope);

    // 4. Assert no secrets in payload (security guard)
    assertNoSecretsInPayload(knownEnvelope.payload);

    // 5. Emit to P0 sink (console logging)
    emitEventToSink(knownEnvelope);

    // 6. Persist to EventLog — only when caller provides both auditLogId and prisma.
    //    EventLog.auditLogId is NOT NULL @unique; omit when no audit log is associated.
    if (opts.auditLogId && opts.prisma) {
      await storeEventBestEffort(opts.prisma, knownEnvelope, opts.auditLogId);
    }
  } catch (err) {
    // Best-effort: log warning, never rethrow
    console.warn('[AI Event Emission] Failed (non-blocking):', {
      eventName: name,
      orgId: opts.orgId ? `${opts.orgId.slice(0, 8)}…` : 'unknown',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ============================================================================
// CONTROL-PLANE ADMIN EMITTER — G028-C6
// ============================================================================

/**
 * Options for emitting an AI control-plane domain event.
 * Admin semantics are locked by the emitter and cannot be overridden by callers.
 */
export interface AiControlEventOpts {
  /**
   * SUPER_ADMIN actor ID — must be sourced from verified JWT, never from client body.
   */
  adminActorId: string;

  /**
   * Optional ISO8601 timestamp override. Defaults to new Date().toISOString().
   */
  timestamp?: string;
}

/** Canonical admin-realm entity UUID for all control-plane events. */
const ADMIN_CONTROL_ENTITY_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Emit an AI control-plane domain event — best-effort, non-blocking.
 *
 * Admin semantics are locked to prevent misconfiguration:
 *   - envelope.realm      = 'ADMIN'
 *   - envelope.tenantId   = null
 *   - actor.type          = 'ADMIN'
 *   - actor.id            = opts.adminActorId
 *   - entity.type         = 'ai.control'
 *   - entity.id           = ADMIN_CONTROL_ENTITY_ID
 *
 * All errors are caught and logged. This function MUST NOT throw.
 * No persistence path — control-plane events are sink-only (no EventLog row).
 *
 * @param name    KnownEventName for an AI control-plane domain event
 * @param payload Minimal, non-secret payload satisfying the registered C4 schema
 * @param opts    Emission options (adminActorId required)
 */
export async function emitAiControlEventBestEffort(
  name: KnownEventName,
  payload: Record<string, unknown>,
  opts: AiControlEventOpts
): Promise<void> {
  try {
    // 1. Validate payload against the registered AI control-plane schema
    const validatedPayload = validateEventPayload(name, payload);

    // 2. Build v1 EventEnvelope with locked admin semantics
    const now = opts.timestamp ?? new Date().toISOString();
    const envelope = {
      id: randomUUID(),
      version: 'v1' as const,
      name,
      occurredAt: now,
      tenantId: null,
      realm: 'ADMIN' as const,
      actor: {
        type: 'ADMIN' as const,
        id: opts.adminActorId,
      },
      entity: {
        type: 'ai.control',
        id: ADMIN_CONTROL_ENTITY_ID,
      },
      payload: validatedPayload as Prisma.JsonValue,
      metadata: {},
    };

    // 3. Validate as KnownEventEnvelope (structural guard)
    const knownEnvelope = validateKnownEvent(envelope);

    // 4. Assert no secrets in payload (security guard)
    assertNoSecretsInPayload(knownEnvelope.payload);

    // 5. Emit to P0 sink (console logging)
    emitEventToSink(knownEnvelope);
  } catch (err) {
    // Best-effort: log warning, never rethrow
    console.warn('[AI Control Event Emission] Failed (non-blocking):', {
      eventName: name,
      adminActorId: opts.adminActorId ? `${opts.adminActorId.slice(0, 8)}…` : 'unknown',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
