import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { EventEnvelope } from '../../lib/events.js';

/**
 * Event Projections - Type Definitions
 * 
 * Prompt #27: Event projection backbone for read-side optimization.
 * 
 * CRITICAL RULES:
 * - Projections are event consumers only (no direct writes from APIs)
 * - Handlers MUST be idempotent (replay-safe)
 * - Projection failures MUST NOT block writes (best-effort only)
 * - Tenant isolation enforced at schema + handler level
 * - Handlers tolerate out-of-order delivery
 */

/**
 * Database client type (supports both direct client and transaction client)
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Result of a projection handler execution
 */
export interface ProjectionResult {
  success: boolean;
  eventId: string;
  eventName: string;
  projectionName: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Projection handler function signature
 * 
 * Rules:
 * - MUST be idempotent (safe to call multiple times with same event)
 * - MUST tolerate out-of-order events (use event.occurredAt defensively)
 * - MUST enforce tenant isolation (always filter by tenantId)
 * - MUST NOT throw errors (return failure result instead)
 * - MUST check last_event_id to prevent duplicate processing
 */
export type ProjectionHandler = (
  db: DbClient,
  event: EventEnvelope
) => Promise<ProjectionResult>;

/**
 * Projection handler registration entry
 */
export interface ProjectionHandlerEntry {
  name: string;
  eventNames: string[]; // Event names this handler processes
  handler: ProjectionHandler;
}

/**
 * Projection error log entry
 */
export interface ProjectionError {
  eventId: string;
  eventName: string;
  projectionName: string;
  error: string;
  timestamp: Date;
}
