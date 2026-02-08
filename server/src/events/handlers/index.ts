/**
 * Event Projection Handlers - Auto-Registration
 * 
 * Prompt #27: Import this module to auto-register all projection handlers.
 * 
 * USAGE (Future Integration):
 * ```ts
 * // In server startup (src/index.ts or src/lib/events.ts):
 * import './events/handlers/index.js'; // Auto-registers all handlers
 * ```
 * 
 * PATTERN:
 * - Each handler file registers itself via registerProjection()
 * - This index file simply imports all handlers to trigger registration
 * - Handlers execute on applyProjections() calls
 */

// Import all handler modules to trigger auto-registration
import './marketplace.projector.js';

// Future handlers will be imported here:
// import './analytics.projector.js';
// import './audit.projector.js';
