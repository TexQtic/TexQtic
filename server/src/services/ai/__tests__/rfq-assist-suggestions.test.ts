/**
 * rfq-assist-suggestions.test.ts — RFQ Assist Suggestions Parser Tests
 *
 * Tests parseRfqAssistSuggestions() for:
 * - Valid JSON response → ok: true, typed suggestions
 * - Markdown code-fenced JSON → ok: true (fence stripping)
 * - Invalid JSON → ok: false, parseError: true
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
  rfqAssistSuggestionsSchema,
} from '../rfqAssistSuggestions.js';

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
