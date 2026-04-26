/**
 * rfq-assist-suggestions.test.ts — RFQ Assist Suggestions Parser Tests
 *
 * Tests parseRfqAssistSuggestions() for:
 * - Valid JSON response → ok: true, typed suggestions
 * - Markdown code-fenced JSON → ok: true (fence stripping)
 * - Code fence preceded by prose → ok: true
 * - Whitespace-surrounded JSON → ok: true
 * - Prose before/after JSON object → ok: true
 * - Invalid JSON → ok: false, parseError: true
 * - Array output → ok: false, parseError: true
 * - Multiple top-level JSON objects → ok: false, parseError: true
 * - Missing reasoning field → uses default empty string (Zod default)
 * - Urgency enum validation → only STANDARD | URGENT | FLEXIBLE
 * - deliveryCountry length validation
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/rfq-assist-suggestions.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  parseRfqAssistSuggestions,
  normalizeModelJsonOutput,
  rfqAssistSuggestionsSchema,
} from '../rfqAssistSuggestions.js';

// ─── Shared valid payload ─────────────────────────────────────────────────────

const validPayload = {
  requirementTitle: 'Organic cotton woven fabric',
  quantityUnit: 'METERS',
  urgency: 'STANDARD',
  sampleRequired: true,
  deliveryCountry: 'IND',
  stageRequirementAttributes: { gsm: '120-140', width: '150cm' },
  reasoning: 'Based on catalog item stage and buyer message.',
};

// ─── parseRfqAssistSuggestions ────────────────────────────────────────────────

describe('parseRfqAssistSuggestions', () => {
  it('returns ok:true with typed suggestions for a valid JSON string', () => {
    const raw = JSON.stringify(validPayload);

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.suggestions.requirementTitle).toBe('Organic cotton woven fabric');
    expect(result.suggestions.quantityUnit).toBe('METERS');
    expect(result.suggestions.urgency).toBe('STANDARD');
    expect(result.suggestions.sampleRequired).toBe(true);
    expect(result.suggestions.deliveryCountry).toBe('IND');
    expect(result.suggestions.stageRequirementAttributes).toEqual({ gsm: '120-140', width: '150cm' });
    expect(result.suggestions.reasoning).toBe('Based on catalog item stage and buyer message.');
  });

  it('strips markdown json code fence and parses successfully', () => {
    const raw = '```json\n{"requirementTitle":"Test","reasoning":"ok"}\n```';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Test');
  });

  it('strips plain ``` code fence and parses successfully', () => {
    const raw = '```\n{"requirementTitle":"Plain","reasoning":"yes"}\n```';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Plain');
  });

  it('handles code fence preceded by prose', () => {
    const raw = 'Here are the suggestions:\n```json\n{"requirementTitle":"Fenced","reasoning":"ok"}\n```';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Fenced');
  });

  it('handles code fence followed by prose', () => {
    const raw = '```json\n{"requirementTitle":"Fenced2","reasoning":"ok"}\n```\nNote: these are suggestions.';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Fenced2');
  });

  it('handles whitespace-surrounded JSON', () => {
    const raw = `   \n\n  ${JSON.stringify(validPayload)}  \n  `;

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Organic cotton woven fabric');
  });

  it('handles prose before a bare JSON object', () => {
    const raw = 'Based on my analysis of the catalog item, here is the JSON:\n' + JSON.stringify(validPayload);

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Organic cotton woven fabric');
    expect(result.suggestions.urgency).toBe('STANDARD');
  });

  it('handles prose after a bare JSON object', () => {
    const raw = JSON.stringify(validPayload) + '\n\nThese suggestions are based on the textile catalog.';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Organic cotton woven fabric');
  });

  it('handles prose before AND after a bare JSON object', () => {
    const raw = 'Here are my suggestions:\n' + JSON.stringify(validPayload) + '\n\nPlease review.';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.deliveryCountry).toBe('IND');
  });

  it('returns ok:false parseError:true for invalid JSON', () => {
    const raw = 'This is not JSON at all.';
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.parseError).toBe(true);
  });

  it('returns ok:false parseError:true for empty string', () => {
    const result = parseRfqAssistSuggestions('');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false parseError:true for array output', () => {
    const raw = JSON.stringify([validPayload]);
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.parseError).toBe(true);
  });

  it('returns ok:false parseError:true for multiple top-level JSON objects', () => {
    // Two adjacent JSON objects — standard JSON.parse rejects this
    const raw = '{"requirementTitle":"A","reasoning":"first"} {"requirementTitle":"B","reasoning":"second"}';
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.parseError).toBe(true);
  });

  it('returns ok:false parseError:true for schema-invalid JSON (wrong urgency)', () => {
    const raw = JSON.stringify({ ...validPayload, urgency: 'IMMEDIATE' });
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.parseError).toBe(true);
  });

  it('returns ok:true with null suggestion fields when omitted from JSON', () => {
    const raw = JSON.stringify({ reasoning: 'no strong suggestions' });
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBeNull();
    expect(result.suggestions.urgency).toBeNull();
    expect(result.suggestions.sampleRequired).toBeNull();
  });

  it('uses empty string for reasoning when not present in JSON (Zod default)', () => {
    const raw = JSON.stringify({ requirementTitle: 'Fabric' });
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.reasoning).toBe('');
  });
});

// ─── normalizeModelJsonOutput ─────────────────────────────────────────────────

describe('normalizeModelJsonOutput', () => {
  it('returns raw JSON unchanged when already a bare object', () => {
    const raw = '{"a":1}';
    expect(normalizeModelJsonOutput(raw)).toBe('{"a":1}');
  });

  it('extracts from ```json fence at start', () => {
    const raw = '```json\n{"a":1}\n```';
    expect(normalizeModelJsonOutput(raw)).toBe('{"a":1}');
  });

  it('extracts from ``` fence with no language specifier', () => {
    const raw = '```\n{"a":1}\n```';
    expect(normalizeModelJsonOutput(raw)).toBe('{"a":1}');
  });

  it('extracts from fence preceded by prose', () => {
    const raw = 'Here you go:\n```json\n{"a":1}\n```';
    expect(normalizeModelJsonOutput(raw)).toBe('{"a":1}');
  });

  it('extracts first balanced JSON object from prose prefix', () => {
    const raw = 'Intro text. {"a":1} end.';
    expect(normalizeModelJsonOutput(raw)).toBe('{"a":1}');
  });

  it('trims surrounding whitespace before extraction', () => {
    const raw = '   {"a":1}   ';
    expect(normalizeModelJsonOutput(raw)).toBe('{"a":1}');
  });
});

// ─── rfqAssistSuggestionsSchema ───────────────────────────────────────────────

describe('rfqAssistSuggestionsSchema', () => {
  it('rejects invalid urgency values', () => {
    const result = rfqAssistSuggestionsSchema.safeParse({
      urgency: 'IMMEDIATE', // not in enum
      reasoning: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects deliveryCountry with length != 3', () => {
    const result = rfqAssistSuggestionsSchema.safeParse({
      deliveryCountry: 'IN', // too short (should be 3)
      reasoning: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null for all optional fields', () => {
    const result = rfqAssistSuggestionsSchema.safeParse({
      requirementTitle: null,
      quantityUnit: null,
      urgency: null,
      sampleRequired: null,
      deliveryCountry: null,
      stageRequirementAttributes: null,
      reasoning: 'nothing to suggest',
    });
    expect(result.success).toBe(true);
  });
});

describe('parseRfqAssistSuggestions', () => {
  it('returns ok:true with typed suggestions for a valid JSON string', () => {
    const raw = JSON.stringify({
      requirementTitle: 'Organic cotton woven fabric',
      quantityUnit: 'METERS',
      urgency: 'STANDARD',
      sampleRequired: true,
      deliveryCountry: 'IND',
      stageRequirementAttributes: { gsm: '120-140', width: '150cm' },
      reasoning: 'Based on catalog item stage and buyer message.',
    });

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.suggestions.requirementTitle).toBe('Organic cotton woven fabric');
    expect(result.suggestions.quantityUnit).toBe('METERS');
    expect(result.suggestions.urgency).toBe('STANDARD');
    expect(result.suggestions.sampleRequired).toBe(true);
    expect(result.suggestions.deliveryCountry).toBe('IND');
    expect(result.suggestions.stageRequirementAttributes).toEqual({ gsm: '120-140', width: '150cm' });
    expect(result.suggestions.reasoning).toBe('Based on catalog item stage and buyer message.');
  });

  it('strips markdown json code fence and parses successfully', () => {
    const raw = '```json\n{"requirementTitle":"Test","reasoning":"ok"}\n```';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Test');
  });

  it('strips plain ``` code fence and parses successfully', () => {
    const raw = '```\n{"requirementTitle":"Plain","reasoning":"yes"}\n```';

    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBe('Plain');
  });

  it('returns ok:false parseError:true for invalid JSON', () => {
    const raw = 'This is not JSON at all.';
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.parseError).toBe(true);
  });

  it('returns ok:false parseError:true for empty string', () => {
    const result = parseRfqAssistSuggestions('');
    expect(result.ok).toBe(false);
  });

  it('returns ok:true with null suggestion fields when omitted from JSON', () => {
    const raw = JSON.stringify({ reasoning: 'no strong suggestions' });
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.requirementTitle).toBeNull();
    expect(result.suggestions.urgency).toBeNull();
    expect(result.suggestions.sampleRequired).toBeNull();
  });

  it('uses empty string for reasoning when not present in JSON (Zod default)', () => {
    const raw = JSON.stringify({ requirementTitle: 'Fabric' });
    const result = parseRfqAssistSuggestions(raw);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestions.reasoning).toBe('');
  });
});

describe('rfqAssistSuggestionsSchema', () => {
  it('rejects invalid urgency values', () => {
    const result = rfqAssistSuggestionsSchema.safeParse({
      urgency: 'IMMEDIATE', // not in enum
      reasoning: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects deliveryCountry with length != 3', () => {
    const result = rfqAssistSuggestionsSchema.safeParse({
      deliveryCountry: 'IN', // too short (should be 3)
      reasoning: 'test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null for all optional fields', () => {
    const result = rfqAssistSuggestionsSchema.safeParse({
      requirementTitle: null,
      quantityUnit: null,
      urgency: null,
      sampleRequired: null,
      deliveryCountry: null,
      stageRequirementAttributes: null,
      reasoning: 'nothing to suggest',
    });
    expect(result.success).toBe(true);
  });
});
