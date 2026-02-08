import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Doctrine v1.4 Event Contracts Starter
 *
 * Defines versioned, immutable event contract scaffolding for TexQtic.
 *
 * CRITICAL RULES:
 * - Events are append-only and immutable (never modify after emission)
 * - Breaking changes to envelope structure require a new EventVersion
 * - Payload must NEVER contain secrets (password, token, tokenHash, etc.)
 * - Events enable: replay safety, regulator visibility, AI backbone
 *
 * This file provides:
 * - Event envelope types and schemas
 * - Event naming conventions
 * - P0 event registry
 * - Validation utilities
 *
 * NO EMISSION YET: This is contract-only. Emission comes in Prompt #15+.
 */

// ============================================================================
// EVENT VERSION SOVEREIGNTY
// ============================================================================

/**
 * Event version defines the envelope structure contract.
 *
 * Version bumping rules:
 * - Breaking changes to envelope fields → new version (e.g., v2)
 * - Adding optional fields → patch within same version
 * - Payload changes → do NOT bump version (payloads are flexible by design)
 *
 * Current: v1 (initial event contract)
 */
export type EventVersion = 'v1';

// ============================================================================
// IMMUTABLE EVENT ENVELOPE
// ============================================================================

/**
 * Realm where the event originated
 */
export type EventRealm = 'ADMIN' | 'TENANT';

/**
 * Actor type who triggered the event
 */
export type ActorType = 'ADMIN' | 'USER' | 'SYSTEM';

/**
 * Event actor (who performed the action)
 */
export interface EventActor {
  type: ActorType;
  id: string | null;
}

/**
 * Event entity (what was affected)
 */
export interface EventEntity {
  type: string; // e.g., 'tenant', 'user', 'membership', 'invite'
  id: string; // UUID of the affected entity
}

/**
 * Event metadata (correlation, causation, origin markers)
 */
export interface EventMetadata {
  origin?: boolean; // True for genesis/origin events (Doctrine replay safety)
  correlationId?: string; // Groups related events (e.g., onboarding flow)
  causationId?: string; // ID of event that caused this event
}

/**
 * Canonical event envelope (v1)
 *
 * IMMUTABILITY GUARANTEE:
 * - Events are append-only (INSERT only, no UPDATE/DELETE)
 * - Once emitted, events MUST NOT be modified
 * - Consumers can replay events for audit, state reconstruction, AI training
 *
 * SECURITY REQUIREMENT:
 * - Payload MUST NOT contain secrets (password, token, jwt, etc.)
 * - Use assertNoSecretsInPayload() before emission
 */
export interface EventEnvelope {
  id: string; // UUID (unique event ID)
  version: EventVersion; // 'v1'
  name: string; // Event name (domain.ACTION format)
  occurredAt: string; // ISO8601 timestamp when event occurred
  tenantId: string | null; // Tenant UUID (null for admin/global events)
  realm: EventRealm; // 'ADMIN' | 'TENANT'
  actor: EventActor; // Who performed the action
  entity: EventEntity; // What was affected
  payload: Record<string, any>; // Event-specific data (no secrets!)
  metadata: EventMetadata; // Correlation, origin, causation markers
}

// ============================================================================
// NAMING CONVENTIONS
// ============================================================================

/**
 * Construct an event name following Doctrine v1.4 naming conventions
 *
 * Format: domain.ACTION
 * - domain: lowercase (e.g., 'tenant', 'team', 'admin')
 * - ACTION: SCREAMING_SNAKE_CASE (e.g., 'TENANT_CREATED_ORIGIN')
 *
 * Examples:
 * - makeEventName('tenant', 'TENANT_CREATED_ORIGIN') → 'tenant.TENANT_CREATED_ORIGIN'
 * - makeEventName('team', 'TEAM_INVITE_CREATED') → 'team.TEAM_INVITE_CREATED'
 *
 * Rules:
 * - Origin events use _ORIGIN suffix + metadata.origin=true
 * - Domain must be lowercase
 * - Action must be SCREAMING_SNAKE_CASE
 */
export function makeEventName(domain: string, action: string): string {
  // Validate conventions
  if (domain !== domain.toLowerCase()) {
    throw new Error(`Event domain must be lowercase: ${domain}`);
  }

  if (action !== action.toUpperCase() || !/^[A-Z_]+$/.test(action)) {
    throw new Error(`Event action must be SCREAMING_SNAKE_CASE: ${action}`);
  }

  return `${domain}.${action}`;
}

// ============================================================================
// P0 EVENT REGISTRY
// ============================================================================

/**
 * Known event names for P0 spine actions
 *
 * These events correspond to audit log actions already implemented:
 * - Prompt #10: Tenant provisioning
 * - Prompt #11: Tenant onboarding
 * - Prompt #13: Team invitations
 *
 * Future events will be added as new features are implemented.
 */
export type KnownEventName =
  | 'tenant.TENANT_CREATED_ORIGIN' // Tenant provisioning (origin event)
  | 'tenant.TENANT_OWNER_CREATED' // Owner user creation during onboarding
  | 'tenant.TENANT_OWNER_MEMBERSHIP_CREATED' // Owner membership creation
  | 'team.TEAM_INVITE_CREATED'; // Team invitation creation

/**
 * Event envelope with known event name (type-safe)
 */
export interface KnownEventEnvelope extends EventEnvelope {
  name: KnownEventName;
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

/**
 * Zod schema for EventActor
 */
const eventActorSchema = z.object({
  type: z.enum(['ADMIN', 'USER', 'SYSTEM']),
  id: z.string().uuid().nullable(),
});

/**
 * Zod schema for EventEntity
 */
const eventEntitySchema = z.object({
  type: z.string().min(1),
  id: z.string().uuid(),
});

/**
 * Zod schema for EventMetadata
 */
const eventMetadataSchema = z.object({
  origin: z.boolean().optional(),
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
});

/**
 * Zod schema for EventEnvelope (validates structure)
 */
export const eventEnvelopeSchema = z.object({
  id: z.string().uuid(),
  version: z.literal('v1'),
  name: z.string().min(1),
  occurredAt: z.string().datetime(), // ISO8601 format
  tenantId: z.string().uuid().nullable(),
  realm: z.enum(['ADMIN', 'TENANT']),
  actor: eventActorSchema,
  entity: eventEntitySchema,
  payload: z.record(z.any()),
  metadata: eventMetadataSchema,
});

/**
 * Zod schema for KnownEventEnvelope (restricts name to known events)
 */
export const knownEventEnvelopeSchema = eventEnvelopeSchema.extend({
  name: z.enum([
    'tenant.TENANT_CREATED_ORIGIN',
    'tenant.TENANT_OWNER_CREATED',
    'tenant.TENANT_OWNER_MEMBERSHIP_CREATED',
    'team.TEAM_INVITE_CREATED',
  ]),
});

/**
 * Validate an unknown value as a KnownEventEnvelope
 *
 * Throws a readable error if validation fails.
 *
 * @param e - Unknown value to validate
 * @returns Validated KnownEventEnvelope
 * @throws Error if validation fails
 */
export function validateKnownEvent(e: unknown): KnownEventEnvelope {
  try {
    return knownEventEnvelopeSchema.parse(e);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      throw new Error(`Event validation failed: ${issues}`);
    }
    throw error;
  }
}

// ============================================================================
// SECRET REDACTION GUARD
// ============================================================================

/**
 * Secret keys that MUST NOT appear in event payloads
 */
const SECRET_KEYS = [
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'tokenHash',
  'token_hash',
  'jwt',
  'authorization',
  'secret',
  'apiKey',
  'api_key',
];

/**
 * Recursively scan an object for secret keys
 *
 * @param obj - Object to scan
 * @param depth - Current recursion depth (max 5)
 * @param path - Current path for error messages
 * @throws Error if secret keys are found
 */
function scanForSecrets(obj: any, depth: number = 0, path: string = 'payload'): void {
  if (depth > 5) {
    // Limit recursion depth to avoid infinite loops
    return;
  }

  if (obj === null || obj === undefined) {
    return;
  }

  if (typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => scanForSecrets(item, depth + 1, `${path}[${index}]`));
    return;
  }

  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SECRET_KEYS.some(secret => lowerKey.includes(secret))) {
      throw new Error(
        `Event payload security violation: Secret key detected at ${path}.${key}. ` +
          `Events MUST NOT contain credentials or tokens.`
      );
    }

    scanForSecrets(obj[key], depth + 1, `${path}.${key}`);
  }
}

/**
 * Assert that event payload does not contain secret keys
 *
 * Performs recursive scan up to depth 5.
 *
 * @param payload - Event payload to validate
 * @throws Error if secret keys are found
 *
 * @example
 * assertNoSecretsInPayload({ id: '123', email: 'user@example.com' }); // OK
 * assertNoSecretsInPayload({ id: '123', password: 'secret' }); // Throws
 */
export function assertNoSecretsInPayload(payload: Record<string, any>): void {
  scanForSecrets(payload, 0, 'payload');
}

// ============================================================================
// EVENT EMISSION (Prompt #15)
// ============================================================================

/**
 * Audit action to event name mapping (P0 registry)
 *
 * Only these audit actions emit events in Prompt #15.
 * Other actions are silently ignored (no event emission).
 *
 * Prompt #17: Added compatibility mappings for legacy/production audit action names.
 */
const AUDIT_ACTION_TO_EVENT_NAME: Record<string, KnownEventName> = {
  // Prompt #15: Original doctrine-aligned action names
  TENANT_CREATED_ORIGIN: 'tenant.TENANT_CREATED_ORIGIN',
  TENANT_OWNER_CREATED: 'tenant.TENANT_OWNER_CREATED',
  TENANT_OWNER_MEMBERSHIP_CREATED: 'tenant.TENANT_OWNER_MEMBERSHIP_CREATED',
  TEAM_INVITE_CREATED: 'team.TEAM_INVITE_CREATED',

  // Prompt #17: Compatibility mappings for legacy production action names
  CREATE_TENANT: 'tenant.TENANT_CREATED_ORIGIN', // ← Maps to origin event
  INVITE_MEMBER: 'team.TEAM_INVITE_CREATED',
};

/**
 * Audit log row structure (subset of Prisma AuditLog model)
 */
interface AuditLogRow {
  id: string;
  realm: 'ADMIN' | 'TENANT';
  tenantId: string | null;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  beforeJson: any;
  afterJson: any;
  metadataJson: any;
  createdAt: Date;
}

/**
 * Emit event to sink (P0: console logging only)
 *
 * Future prompts will add storage, pub/sub, etc.
 *
 * @param event - Validated KnownEventEnvelope to emit
 */
export function emitEventToSink(event: KnownEventEnvelope): void {
  // P0 sink: single-line JSON to console with prefix
  console.info('EVENT_EMIT', JSON.stringify(event));
}

/**
 * Store event to EventLog table (best-effort, non-blocking)
 *
 * Prompt #16: Persist events to first-class EventLog storage.
 *
 * Rules:
 * - Deterministic linkage: EventLog.id = event.id, EventLog.auditLogId = auditLogId
 * - Immutable: INSERT only, no UPDATE/DELETE
 * - Best-effort: warnings only, never throw (don't break requests)
 * - Unique violations (P2002) are swallowed (event already stored)
 *
 * @param prisma - Prisma client or transaction for database access
 * @param event - Validated KnownEventEnvelope to store
 * @param auditLogId - Audit log ID for traceability linkage
 */
export async function storeEventBestEffort(
  prisma: DbClient,
  event: KnownEventEnvelope,
  auditLogId: string
): Promise<void> {
  try {
    await prisma.eventLog.create({
      data: {
        id: event.id, // Deterministic: event.id = audit.id
        version: event.version,
        name: event.name,
        occurredAt: new Date(event.occurredAt),
        tenantId: event.tenantId,
        realm: event.realm,
        actorType: event.actor.type,
        actorId: event.actor.id,
        entityType: event.entity.type,
        entityId: event.entity.id,
        payloadJson: event.payload as any,
        metadataJson: event.metadata as any,
        auditLogId, // Traceability: link back to audit log
      },
    });
  } catch (error: any) {
    // Best-effort: swallow errors, never break requests
    // P2002 (unique violation) means event already stored - ignore safely
    if (error?.code === 'P2002') {
      console.warn('[Event Storage] Event already stored (duplicate), ignoring:', {
        eventId: event.id,
        eventName: event.name,
        auditLogId,
      });
      return;
    }

    // Other errors: log warning
    console.warn('[Event Storage] Failed to store event (non-blocking):', {
      eventId: event.id,
      eventName: event.name,
      auditLogId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Build and emit event from audit log entry (best-effort, non-blocking)
 *
 * This is called after successful audit log write in writeAuditLog().
 *
 * Rules:
 * - Only emit for P0 actions (AUDIT_ACTION_TO_EVENT_NAME registry)
 * - Deterministic: event.id = auditLogRow.id
 * - Validate with validateKnownEvent() and assertNoSecretsInPayload()
 * - Best-effort: warnings only, never throw (don't break requests)
 *
 * Prompt #16: Also stores event to EventLog table after emission.
 *
 * @param prisma - Prisma client or transaction for database access
 * @param auditLogRow - Created audit log row from database
 */
export async function maybeEmitEventFromAuditEntry(
  prisma: DbClient,
  auditLogRow: AuditLogRow
): Promise<void> {
  try {
    // Check if this action should emit an event
    const eventName = AUDIT_ACTION_TO_EVENT_NAME[auditLogRow.action];
    if (!eventName) {
      // Not a P0 event action, silently skip
      return;
    }

    // Build payload from afterJson (preferred) or empty object
    const payload: Record<string, any> = auditLogRow.afterJson ?? {};

    // Security guard: ensure no secrets in payload
    assertNoSecretsInPayload(payload);

    // Build metadata
    const metadata: EventMetadata = {};

    // Origin detection: action ends with _ORIGIN or metadataJson.origin === true
    // Prompt #17: Also treat CREATE_TENANT as origin (legacy action name compatibility)
    const isOriginByName = auditLogRow.action.endsWith('_ORIGIN');
    const isOriginByMetadata = auditLogRow.metadataJson && auditLogRow.metadataJson.origin === true;
    const isOriginByLegacyAction = auditLogRow.action === 'CREATE_TENANT'; // Compatibility mapping

    if (isOriginByName || isOriginByMetadata || isOriginByLegacyAction) {
      metadata.origin = true;
    }

    // Copy correlation/causation IDs if present
    if (auditLogRow.metadataJson?.correlationId) {
      metadata.correlationId = auditLogRow.metadataJson.correlationId;
    }
    if (auditLogRow.metadataJson?.causationId) {
      metadata.causationId = auditLogRow.metadataJson.causationId;
    }

    // Build event envelope (deterministic, stable for replay)
    const event: EventEnvelope = {
      id: auditLogRow.id, // Deterministic: reuse audit log UUID
      version: 'v1',
      name: eventName,
      occurredAt: auditLogRow.createdAt.toISOString(),
      tenantId: auditLogRow.tenantId,
      realm: auditLogRow.realm,
      actor: {
        type: auditLogRow.actorType,
        id: auditLogRow.actorId,
      },
      entity: {
        type: auditLogRow.entity,
        id: auditLogRow.entityId ?? '', // EntityId required in EventEntity, default to empty if null
      },
      payload,
      metadata,
    };

    // Validate with Zod (throws if invalid)
    const validatedEvent = validateKnownEvent(event);

    // Emit to sink
    emitEventToSink(validatedEvent);

    // Prompt #16: Store to EventLog table
    await storeEventBestEffort(prisma, validatedEvent, auditLogRow.id);
  } catch (error) {
    // Best-effort: log warning, do NOT throw (don't break requests)
    console.warn('[Event Emission] Failed to emit event (non-blocking):', {
      auditAction: auditLogRow.action,
      auditId: auditLogRow.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
