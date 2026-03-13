import { z } from 'zod';
import type { KnownEventName } from '../lib/events.js';

/**
 * PW5-AI-EVENT-DOMAIN — AI Event Payload Schema Registry
 *
 * Defines minimal, forward-compatible Zod payload schemas for all AI domain
 * event types introduced in G-028 §3.3.
 *
 * RULES:
 * - Schemas are payload-only (envelope validation lives in events.ts)
 * - Use .passthrough() to remain forward-compatible with future fields
 * - All schemas must be compatible with EventEnvelope.payload (JsonValue)
 * - orgId in payload is informational; tenantId on the envelope is authoritative
 *
 * NO EMISSION: These schemas define types only. Emitters are a future unit.
 */

// ============================================================================
// AI INFERENCE DOMAIN — PAYLOAD SCHEMAS (G-028 §3.3)
// ============================================================================

/**
 * ai.inference.generate
 * Emitted when an AI inference request completes successfully.
 */
export const AiInferenceGeneratePayload = z
  .object({
    orgId: z.string().uuid(),
    taskType: z.string(),
    model: z.string(),
    latencyMs: z.number(),
  })
  .passthrough();

/**
 * ai.inference.error
 * Emitted when an AI inference request fails.
 */
export const AiInferenceErrorPayload = z
  .object({
    orgId: z.string().uuid(),
    taskType: z.string(),
    model: z.string(),
    errorCode: z.string(),
    errorMessage: z.string().optional(),
  })
  .passthrough();

/**
 * ai.inference.budget_exceeded
 * Emitted when an inference budget threshold is crossed.
 */
export const AiInferenceBudgetExceededPayload = z
  .object({
    orgId: z.string().uuid(),
    budgetType: z.string(),
    limitAmount: z.number(),
    currentUsage: z.number(),
  })
  .passthrough();

/**
 * ai.inference.pii_redacted
 * Emitted when PII fields are redacted before an inference request.
 */
export const AiInferencePiiRedactedPayload = z
  .object({
    orgId: z.string().uuid(),
    taskType: z.string(),
    model: z.string(),
    fieldCount: z.number().int().nonnegative(),
  })
  .passthrough();

/**
 * ai.inference.pii_leak_detected
 * Emitted when PII is detected in an inference output.
 */
export const AiInferencePiiLeakDetectedPayload = z
  .object({
    orgId: z.string().uuid(),
    taskType: z.string(),
    model: z.string(),
    leakType: z.string(),
  })
  .passthrough();

/**
 * ai.inference.cache_hit
 * Emitted when an inference result is served from cache.
 */
export const AiInferenceCacheHitPayload = z
  .object({
    orgId: z.string().uuid(),
    taskType: z.string(),
    model: z.string(),
    cacheKey: z.string().optional(),
  })
  .passthrough();

// ============================================================================
// AI VECTOR DOMAIN — PAYLOAD SCHEMAS (G-028 §3.3)
// ============================================================================

/**
 * ai.vector.upsert
 * Emitted when a vector document is upserted into a collection.
 */
export const AiVectorUpsertPayload = z
  .object({
    orgId: z.string().uuid(),
    collectionName: z.string(),
    vectorCount: z.number().int().positive(),
  })
  .passthrough();

/**
 * ai.vector.delete
 * Emitted when a vector document is deleted from a collection.
 */
export const AiVectorDeletePayload = z
  .object({
    orgId: z.string().uuid(),
    collectionName: z.string(),
    vectorId: z.string(),
  })
  .passthrough();

/**
 * ai.vector.query
 * Emitted when a vector similarity query is executed.
 */
export const AiVectorQueryPayload = z
  .object({
    orgId: z.string().uuid(),
    collectionName: z.string(),
    latencyMs: z.number(),
    resultCount: z.number().int().nonnegative(),
  })
  .passthrough();

// ============================================================================
// AI EVENT PAYLOAD SCHEMA REGISTRY
// ============================================================================

/**
 * Registry mapping AI KnownEventName → Zod payload schema.
 *
 * Extend this map as new AI event types are introduced.
 * Non-AI events are not registered here; their payloads are validated loosely
 * by the envelope schema's z.record(z.any()).
 */
export const EVENT_PAYLOAD_SCHEMAS: Partial<Record<KnownEventName, z.ZodTypeAny>> = {
  'ai.inference.generate': AiInferenceGeneratePayload,
  'ai.inference.error': AiInferenceErrorPayload,
  'ai.inference.budget_exceeded': AiInferenceBudgetExceededPayload,
  'ai.inference.pii_redacted': AiInferencePiiRedactedPayload,
  'ai.inference.pii_leak_detected': AiInferencePiiLeakDetectedPayload,
  'ai.inference.cache_hit': AiInferenceCacheHitPayload,
  'ai.vector.upsert': AiVectorUpsertPayload,
  'ai.vector.delete': AiVectorDeletePayload,
  'ai.vector.query': AiVectorQueryPayload,
};

// ============================================================================
// PAYLOAD VALIDATION HELPER
// ============================================================================

/**
 * Validate an event payload against its registered schema.
 *
 * Returns the parsed (and passthrough-preserved) payload if a schema is
 * registered for the given event name. Returns the original payload unchanged
 * if no schema is registered (non-AI events).
 *
 * Throws a Zod validation error if the payload does not satisfy the schema.
 *
 * @param name    - KnownEventName
 * @param payload - Raw event payload to validate
 * @returns Parsed payload (or original if no schema registered)
 *
 * @example
 * validateEventPayload('ai.inference.generate', {
 *   orgId: '00000000-0000-0000-0000-000000000001',
 *   taskType: 'summarise',
 *   model: 'gemini-1.5-flash',
 *   latencyMs: 342,
 * }); // → validated object
 */
export function validateEventPayload(name: KnownEventName, payload: unknown): unknown {
  const schema = EVENT_PAYLOAD_SCHEMAS[name];
  if (!schema) {
    return payload;
  }
  return schema.parse(payload);
}
