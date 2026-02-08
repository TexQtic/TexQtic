/**
 * Event Projections - Public API
 * 
 * Prompt #27: Event projection backbone for read-side optimization.
 * 
 * This module provides infrastructure for converting domain events
 * into read-optimized projections (materialized views).
 * 
 * ARCHITECTURE:
 * - Events drive projections (event-sourcing lite)
 * - Projections are idempotent and replay-safe
 * - Projection failures never block writes
 * - Handlers register at module load time
 * - Projector engine applies handlers on event emission
 * 
 * USAGE (Future Integration):
 * ```ts
 * import { applyProjections } from './events/projections/index.js';
 * import { storeEventBestEffort } from './lib/events.js';
 * 
 * // After storing event to EventLog:
 * await applyProjections(db, event); // Best-effort, never throws
 * ```
 */

export * from './types.js';
export * from './registry.js';
export * from './projector.js';
