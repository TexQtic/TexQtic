import type { ProjectionHandlerEntry } from './types.js';

/**
 * Event Projections - Handler Registry
 * 
 * Prompt #27: Centralized registry for all projection handlers.
 * 
 * PATTERN:
 * - Handlers register at module load time
 * - Projector engine queries registry by event name
 * - Multiple projections can handle same event
 */

/**
 * Global projection handler registry
 */
const projectionHandlers: ProjectionHandlerEntry[] = [];

/**
 * Register a projection handler
 * 
 * @param entry - Handler registration entry
 */
export function registerProjection(entry: ProjectionHandlerEntry): void {
  // Validate no duplicate names
  const existing = projectionHandlers.find(h => h.name === entry.name);
  if (existing) {
    throw new Error(`Projection handler already registered: ${entry.name}`);
  }

  projectionHandlers.push(entry);
  console.info(`[Projections] Registered: ${entry.name} (events: ${entry.eventNames.join(', ')})`);
}

/**
 * Get all projection handlers for a given event name
 * 
 * @param eventName - Event name to match
 * @returns Array of matching handlers (may be empty)
 */
export function getHandlersForEvent(eventName: string): ProjectionHandlerEntry[] {
  return projectionHandlers.filter(entry =>
    entry.eventNames.includes(eventName)
  );
}

/**
 * Get all registered projection handlers
 * 
 * @returns Array of all registered handlers
 */
export function getAllHandlers(): ProjectionHandlerEntry[] {
  return [...projectionHandlers];
}

/**
 * Clear all registered handlers (for testing only)
 */
export function clearRegistry(): void {
  projectionHandlers.length = 0;
}
