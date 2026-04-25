/**
 * rfq-assist-context-builder.test.ts — RFQ Assist Context Builder Tests
 *
 * Tests buildRfqAssistantContext() for:
 * - humanConfirmationRequired === true (literal type enforcement)
 * - Does not contain any forbidden AI fields in assembled context
 * - PII in structuredRequirementText gets redacted
 * - price field is absent from context
 * - item_unit_price field is absent from context
 * - publicationPosture field is absent from context
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/rfq-assist-context-builder.test.ts
 */

import { describe, it, expect } from 'vitest';
import { buildRfqAssistantContext } from '../rfqAssistContextBuilder.js';
import { containsForbiddenAiField } from '../aiForbiddenData.js';
import type { RfqAssistContextInput } from '../rfqAssistContextBuilder.js';

function makeValidInput(overrides: Partial<RfqAssistContextInput> = {}): RfqAssistContextInput {
  return {
    buyerOrgId: 'org-buyer-001',
    rfqId: 'rfq-uuid-001',
    rfqStatus: 'OPEN',
    structuredRequirementText: 'Requirement: Woven fabric\nQuantity: METERS\nUrgency: STANDARD',
    catalogItemId: 'item-uuid-001',
    catalogItemStage: 'FABRIC_WOVEN',
    catalogItemText: 'Cotton woven fabric, 120 GSM, natural composition',
    catalogCompletenessScore: 0.75,
    supplierOrgId: 'org-supplier-001',
    retrievedChunks: [],
    ...overrides,
  };
}

describe('buildRfqAssistantContext', () => {
  it('returns context with humanConfirmationRequired === true', () => {
    const ctx = buildRfqAssistantContext(makeValidInput());
    expect(ctx.humanConfirmationRequired).toBe(true);
  });

  it('assembled context does not contain any forbidden AI fields', () => {
    const ctx = buildRfqAssistantContext(makeValidInput());
    expect(containsForbiddenAiField(ctx)).toBe(false);
  });

  it('does not contain price key in context', () => {
    const ctx = buildRfqAssistantContext(makeValidInput());
    expect(Object.keys(ctx)).not.toContain('price');
  });

  it('does not contain item_unit_price key in context', () => {
    const ctx = buildRfqAssistantContext(makeValidInput());
    expect(Object.keys(ctx)).not.toContain('item_unit_price');
  });

  it('does not contain publicationPosture key in context', () => {
    const ctx = buildRfqAssistantContext(makeValidInput());
    expect(Object.keys(ctx)).not.toContain('publicationPosture');
  });

  it('does not contain grossAmount key in context', () => {
    const ctx = buildRfqAssistantContext(makeValidInput());
    expect(Object.keys(ctx)).not.toContain('grossAmount');
  });

  it('redacts email PII in structuredRequirementText', () => {
    const inputWithPii = makeValidInput({
      structuredRequirementText: 'Contact: buyer@example.com wants woven fabric',
    });
    const ctx = buildRfqAssistantContext(inputWithPii);
    expect(ctx.structuredRequirementText).not.toContain('buyer@example.com');
  });

  it('preserves non-PII text in structuredRequirementText unchanged', () => {
    const text = 'Woven cotton, 120 GSM, STANDARD urgency, sample required';
    const ctx = buildRfqAssistantContext(makeValidInput({ structuredRequirementText: text }));
    expect(ctx.structuredRequirementText).toBe(text);
  });

  it('echoes buyerOrgId, rfqId, rfqStatus from input', () => {
    const ctx = buildRfqAssistantContext(makeValidInput());
    expect(ctx.buyerOrgId).toBe('org-buyer-001');
    expect(ctx.rfqId).toBe('rfq-uuid-001');
    expect(ctx.rfqStatus).toBe('OPEN');
  });

  it('echoes catalogCompletenessScore from input', () => {
    const ctx = buildRfqAssistantContext(makeValidInput({ catalogCompletenessScore: 0.42 }));
    expect(ctx.catalogCompletenessScore).toBe(0.42);
  });
});
