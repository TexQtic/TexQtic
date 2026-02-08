import type { DbClient, ProjectionResult, ProjectionError } from './types.js';
import type { EventEnvelope } from '../../lib/events.js';
import { getHandlersForEvent } from './registry.js';

/**
 * Event Projections - Core Projection Engine
 * 
 * Prompt #27: Idempotent, replay-safe projection apply logic.
 * 
 * CRITICAL RULES:
 * - Projection failures MUST NOT block writes (best-effort only)
 * - All errors are logged + collected, never thrown
 * - Handlers execute sequentially (not parallel) to prevent race conditions
 * - Tenant isolation enforced at handler level
 */

/**
 * In-memory error log for projection failures
 * (Future: Store to database or external monitoring)
 */
const projectionErrors: ProjectionError[] = [];

/**
 * Apply projections for a given event
 * 
 * This function:
 * 1. Finds all handlers registered for the event name
 * 2. Executes each handler sequentially
 * 3. Collects results + errors
 * 4. Never throws (best-effort only)
 * 
 * @param db - Database client (supports transactions)
 * @param event - Event envelope to project
 * @returns Array of projection results (one per handler)
 */
export async function applyProjections(
  db: DbClient,
  event: EventEnvelope
): Promise<ProjectionResult[]> {
  const handlers = getHandlersForEvent(event.name);

  if (handlers.length === 0) {
    // No handlers for this event - not an error, just skip
    return [];
  }

  const results: ProjectionResult[] = [];

  for (const entry of handlers) {
    try {
      const result = await entry.handler(db, event);
      results.push(result);

      // Log failures (but don't throw)
      if (!result.success && !result.skipped) {
        const error: ProjectionError = {
          eventId: event.id,
          eventName: event.name,
          projectionName: entry.name,
          error: result.error || 'Unknown error',
          timestamp: new Date(),
        };
        projectionErrors.push(error);
        console.warn('[Projections] Handler failed:', {
          projection: entry.name,
          event: event.name,
          eventId: event.id,
          error: result.error,
        });
      }
    } catch (error) {
      // Handler threw unexpectedly - catch and convert to failure result
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      results.push({
        success: false,
        eventId: event.id,
        eventName: event.name,
        projectionName: entry.name,
        error: `Unhandled exception: ${errorMessage}`,
      });

      const projError: ProjectionError = {
        eventId: event.id,
        eventName: event.name,
        projectionName: entry.name,
        error: errorMessage,
        timestamp: new Date(),
      };
      projectionErrors.push(projError);

      console.error('[Projections] Handler threw exception:', {
        projection: entry.name,
        event: event.name,
        eventId: event.id,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Get recent projection errors (for monitoring/debugging)
 * 
 * @param limit - Maximum number of errors to return (default: 100)
 * @returns Array of recent projection errors
 */
export function getRecentErrors(limit: number = 100): ProjectionError[] {
  return projectionErrors.slice(-limit);
}

/**
 * Clear error log (for testing only)
 */
export function clearErrors(): void {
  projectionErrors.length = 0;
}
