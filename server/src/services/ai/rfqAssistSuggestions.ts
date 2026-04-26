/**
 * rfqAssistSuggestions.ts — AI RFQ Assist Suggestions Parser
 *
 * Defines the structured suggestion shape returned by the rfq-assist AI task,
 * the Zod validation schema, and the parser that converts raw model output
 * (JSON string) into typed suggestions.
 *
 * Implements TECS-AI-RFQ-ASSISTANT-MVP-001 Section G (output schema).
 *
 * RULES:
 * - Pure functions + types — no IO, no DB calls, no provider calls.
 * - parseRfqAssistSuggestions() never throws — returns discriminated union.
 * - The parser extracts ONLY the allowed output fields listed in RfqAssistSuggestions.
 * - reasoning field is included to satisfy audit traceability per design Section K.
 *
 * @module rfqAssistSuggestions
 */

import { z } from 'zod';

// ─── Output shape ─────────────────────────────────────────────────────────────

/**
 * Structured suggestion fields the AI may recommend for an RFQ.
 *
 * These mirror the allowed mutable fields on the rfqs table that the buyer
 * may choose to apply via the existing PATCH route. AI does NOT write to
 * the rfqs table — suggestions only.
 *
 * Forbidden fields (price, item_unit_price, deliveryLocation, targetDeliveryDate,
 * requirementConfirmedAt, escrow*, grossAmount, User.email/name) are intentionally
 * absent from this interface.
 */
export interface RfqAssistSuggestions {
  /** Suggested requirementTitle — max 200 chars */
  requirementTitle: string | null;
  /** Suggested quantityUnit — e.g. 'METERS', 'KG', 'PIECES' */
  quantityUnit: string | null;
  /** Suggested urgency — STANDARD | URGENT | FLEXIBLE */
  urgency: 'STANDARD' | 'URGENT' | 'FLEXIBLE' | null;
  /** Suggested sampleRequired flag */
  sampleRequired: boolean | null;
  /** Suggested deliveryCountry — ISO 3166-1 alpha-3 code */
  deliveryCountry: string | null;
  /** Suggested stageRequirementAttributes key-value pairs */
  stageRequirementAttributes: Record<string, unknown> | null;
  /** AI's reasoning for these suggestions — audit traceability only; not shown to buyer */
  reasoning: string;
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

/**
 * Zod schema that validates the raw JSON object parsed from the model output.
 * All suggestion fields are optional at the parse boundary — callers receive
 * null for absent/invalid fields rather than a schema failure.
 */
export const rfqAssistSuggestionsSchema = z.object({
  requirementTitle: z.string().max(200).nullable().optional(),
  quantityUnit: z.string().max(50).nullable().optional(),
  urgency: z.enum(['STANDARD', 'URGENT', 'FLEXIBLE']).nullable().optional(),
  sampleRequired: z.boolean().nullable().optional(),
  deliveryCountry: z.string().length(3).nullable().optional(),
  stageRequirementAttributes: z.record(z.unknown()).nullable().optional(),
  reasoning: z.string().max(1000).default(''),
});

// ─── Parser ───────────────────────────────────────────────────────────────────

export type RfqAssistSuggestionsParseOk = {
  ok: true;
  suggestions: RfqAssistSuggestions;
};

export type RfqAssistSuggestionsParseError = {
  ok: false;
  parseError: true;
};

export type RfqAssistSuggestionsParseResult =
  | RfqAssistSuggestionsParseOk
  | RfqAssistSuggestionsParseError;

/**
 * Internal helper: returns true if `text` contains at least one balanced top-level
 * {...} object. Used to detect a second JSON object following the first.
 */
function containsBalancedObject(text: string): boolean {
  const start = text.indexOf('{');
  if (start === -1) return false;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\' && inString) { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (!inString) {
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) return true; }
    }
  }
  return false;
}

/**
 * Normalizes raw AI model output to a clean JSON string candidate.
 *
 * Handles common model formatting patterns in order of preference:
 *   1. Markdown code fence anywhere in the string (```json ... ``` or ``` ... ```)
 *      — fence need not start the string; leading prose is tolerated.
 *   2. Array fast-path: if the trimmed input starts with `[`, return it unchanged
 *      so the caller can parse and detect Array.isArray.
 *   3. Balanced brace extraction: walks the string to find the first complete
 *      top-level {...} object, correctly skipping braces inside string values.
 *      If a second balanced object follows, returns the full string unchanged
 *      (forces JSON.parse to reject multi-object input).
 *
 * Does NOT use eval. Does NOT interpret the extracted content.
 * Returns a normalized candidate string — caller is responsible for JSON.parse.
 * If no object is extractable, returns the trimmed original so JSON.parse fails naturally.
 *
 * @param raw  Raw text output from the AI model
 * @returns    Normalized string candidate (may or may not be valid JSON)
 */
export function normalizeModelJsonOutput(raw: string): string {
  const trimmed = raw.trim();

  // Strategy 1: Extract content from a code fence anywhere in the string.
  // Matches ```json ... ``` or ``` ... ``` (non-greedy, not anchored to start).
  const fenceMatch = /```(?:json)?\s*([\s\S]+?)\s*```/i.exec(trimmed);
  if (fenceMatch?.[1]) {
    const inner = fenceMatch[1].trim();
    // Only adopt fence content when it looks like a JSON object (not an array or bare prose)
    if (inner.startsWith('{')) {
      return inner;
    }
  }

  // Array fast-path: return as-is so the caller's Array.isArray check fires.
  if (trimmed.startsWith('[')) {
    return trimmed;
  }

  // Strategy 2: Extract the first balanced top-level {...} from anywhere in the string.
  // This handles: pure JSON, JSON with trailing prose, JSON with leading prose.
  // If a second balanced object follows the first, the full string is returned unchanged
  // so that JSON.parse rejects the multi-object input.
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace !== -1) {
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = -1;

    for (let i = firstBrace; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === '\\' && inString) { escapeNext = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (!inString) {
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) { endIndex = i; break; }
        }
      }
    }

    if (endIndex !== -1) {
      const remaining = trimmed.slice(endIndex + 1);
      // If a second balanced JSON object follows, reject the whole string
      if (containsBalancedObject(remaining)) {
        return trimmed;
      }
      return trimmed.slice(firstBrace, endIndex + 1);
    }
  }

  // No extractable object found — return trimmed string and let JSON.parse fail
  return trimmed;
}

/**
 * Parse raw model output string into structured RfqAssistSuggestions.
 *
 * Normalizes the raw text (strips fences, extracts embedded JSON objects from prose)
 * then validates the parsed object against the Zod schema.
 * Returns a discriminated union — never throws.
 *
 * @param raw  Raw text output from the AI model
 * @returns    { ok: true, suggestions } on success, { ok: false, parseError: true } on failure
 */
export function parseRfqAssistSuggestions(raw: string): RfqAssistSuggestionsParseResult {
  try {
    const jsonCandidate = normalizeModelJsonOutput(raw);
    const parsed: unknown = JSON.parse(jsonCandidate);

    // Reject arrays — the model must return a JSON object, not an array
    if (Array.isArray(parsed)) {
      return { ok: false, parseError: true };
    }

    const result = rfqAssistSuggestionsSchema.safeParse(parsed);

    if (!result.success) {
      return { ok: false, parseError: true };
    }

    const data = result.data;
    const suggestions: RfqAssistSuggestions = {
      requirementTitle: data.requirementTitle ?? null,
      quantityUnit: data.quantityUnit ?? null,
      urgency: data.urgency ?? null,
      sampleRequired: data.sampleRequired ?? null,
      deliveryCountry: data.deliveryCountry ?? null,
      stageRequirementAttributes: data.stageRequirementAttributes ?? null,
      reasoning: data.reasoning,
    };

    return { ok: true, suggestions };
  } catch {
    return { ok: false, parseError: true };
  }
}
