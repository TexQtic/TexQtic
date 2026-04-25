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
 * Parse raw model output string into structured RfqAssistSuggestions.
 *
 * Attempt to extract a JSON object from the raw text (model may wrap in
 * markdown code fences). Returns a discriminated union — never throws.
 *
 * @param raw  Raw text output from the AI model
 * @returns    { ok: true, suggestions } on success, { ok: false, parseError: true } on failure
 */
export function parseRfqAssistSuggestions(raw: string): RfqAssistSuggestionsParseResult {
  try {
    // Strip markdown code fences if present (e.g. ```json ... ```)
    const jsonCandidate = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const parsed: unknown = JSON.parse(jsonCandidate);
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
