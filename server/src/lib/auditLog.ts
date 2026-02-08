import type { PrismaClient, Prisma } from '@prisma/client';
import { maybeEmitEventFromAuditEntry } from './events.js';

// Type-widened client to support both direct client and transaction usage
type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Audit Logging - Immutable DB-backed Audit Trail
 *
 * Writes structured audit logs to audit_logs table for compliance and security.
 * All writes are append-only (INSERT only, no UPDATE/DELETE per RLS policies).
 */

export type AuditRealm = 'TENANT' | 'ADMIN';
export type ActorType = 'USER' | 'ADMIN' | 'SYSTEM';

export interface AuditEntry {
  realm: AuditRealm;
  tenantId: string | null;
  actorType: ActorType;
  actorId: string | null;
  action: string; // e.g., 'AI_INSIGHTS', 'AI_NEGOTIATION_ADVICE'
  entity: string; // e.g., 'ai', 'tenant', 'user'
  entityId?: string | null;
  beforeJson?: Record<string, any> | null;
  afterJson?: Record<string, any> | null;
  metadataJson?: Record<string, any> | null;
}

/**
 * Write audit log entry to database (append-only)
 *
 * CRITICAL:
 * - RLS policies enforce append-only behavior
 * - Tenant logs must have tenantId matching session context
 * - Admin logs must have tenantId=null and admin context set
 * - Never attempt UPDATE or DELETE on audit_logs
 *
 * Prompt #15: After successful write, attempts to emit a corresponding event
 * for P0 registry actions (best-effort, non-blocking).
 *
 * Prompt #16: Also stores events to EventLog table (best-effort, non-blocking).
 *
 * @param tx - Prisma client or transaction (within RLS context)
 * @param entry - Audit entry to write
 * @returns Created audit log record
 */
export async function writeAuditLog(tx: DbClient, entry: AuditEntry): Promise<void> {
  try {
    const createdAuditLog = await tx.auditLog.create({
      data: {
        realm: entry.realm,
        tenantId: entry.tenantId,
        actorType: entry.actorType,
        actorId: entry.actorId, // Nullable now, null for SYSTEM actors
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        beforeJson: entry.beforeJson ?? undefined,
        afterJson: entry.afterJson ?? undefined,
        metadataJson: entry.metadataJson ?? undefined,
      },
    });

    // Prompt #15-16: Attempt event emission + storage (best-effort, non-blocking)
    await maybeEmitEventFromAuditEntry(tx, createdAuditLog);
  } catch (error) {
    // Log failure but don't throw - audit logging should not break application flow
    console.error('[Audit Log] Failed to write audit entry:', {
      error,
      entry: {
        realm: entry.realm,
        tenantId: entry.tenantId,
        action: entry.action,
        entity: entry.entity,
      },
    });
    // If this is an RLS violation (wrong tenant context), it indicates a bug
    if (error instanceof Error && error.message.includes('violates row-level security')) {
      console.error('[Audit Log] RLS VIOLATION DETECTED - tenant context mismatch!');
    }
  }
}

/**
 * Create audit entry for AI insights request
 *
 * @param tenantId - Tenant UUID
 * @param userId - User UUID (actor)
 * @param metadata - AI call metadata (tokens, cost, model, etc.)
 * @returns Audit entry ready for writeAuditLog()
 */
export function createAiInsightsAudit(
  tenantId: string,
  userId: string | null,
  metadata: {
    model: string;
    tokensUsed: number;
    costEstimateUSD: number;
    monthKey: string;
    requestId?: string;
    tenantType?: string;
    experience?: string;
  }
): AuditEntry {
  return {
    realm: 'TENANT',
    tenantId,
    actorType: userId ? 'USER' : 'SYSTEM',
    actorId: userId,
    action: 'AI_INSIGHTS',
    entity: 'ai',
    entityId: null,
    beforeJson: null,
    afterJson: null,
    metadataJson: {
      model: metadata.model,
      tokensUsed: metadata.tokensUsed,
      costEstimateUSD: metadata.costEstimateUSD,
      monthKey: metadata.monthKey,
      requestId: metadata.requestId,
      tenantType: metadata.tenantType,
      experience: metadata.experience,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create audit entry for AI negotiation advice request
 *
 * @param tenantId - Tenant UUID
 * @param userId - User UUID (actor)
 * @param metadata - AI call metadata
 * @returns Audit entry ready for writeAuditLog()
 */
export function createAiNegotiationAudit(
  tenantId: string,
  userId: string | null,
  metadata: {
    model: string;
    tokensUsed: number;
    costEstimateUSD: number;
    monthKey: string;
    requestId?: string;
    productName?: string;
    targetPrice?: number;
    quantity?: number;
  }
): AuditEntry {
  return {
    realm: 'TENANT',
    tenantId,
    actorType: userId ? 'USER' : 'SYSTEM',
    actorId: userId,
    action: 'AI_NEGOTIATION_ADVICE',
    entity: 'ai',
    entityId: null,
    beforeJson: {
      productName: metadata.productName,
      targetPrice: metadata.targetPrice,
      quantity: metadata.quantity,
    },
    afterJson: null,
    metadataJson: {
      model: metadata.model,
      tokensUsed: metadata.tokensUsed,
      costEstimateUSD: metadata.costEstimateUSD,
      monthKey: metadata.monthKey,
      requestId: metadata.requestId,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create audit entry for admin operations
 *
 * @param adminId - Admin user UUID
 * @param action - Action performed
 * @param entity - Entity type affected
 * @param metadata - Additional context
 * @returns Audit entry ready for writeAuditLog()
 */
export function createAdminAudit(
  adminId: string,
  action: string,
  entity: string,
  metadata?: Record<string, any>
): AuditEntry {
  return {
    realm: 'ADMIN',
    tenantId: null, // Admin actions are cross-tenant
    actorType: 'ADMIN',
    actorId: adminId,
    action,
    entity,
    entityId: null,
    beforeJson: null,
    afterJson: null,
    metadataJson: metadata || {},
  };
}
