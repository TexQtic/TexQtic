/**
 * TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001
 * AI boundary contract — assembleStructuredRfqRequirementSummaryText
 * must EXCLUDE: deliveryLocation, targetDeliveryDate, requirementConfirmedAt, price
 * must INCLUDE: requirementTitle, quantityUnit, urgency, sampleRequired,
 *               deliveryCountry, stageRequirementAttributes, buyerMessage
 * T-SRFQ-AI1 – T-SRFQ-AI7
 */
import { describe, it, expect } from 'vitest';
import {
  assembleStructuredRfqRequirementSummaryText,
} from '../server/src/routes/tenant';

// ─── T-SRFQ-AI1: deliveryLocation MUST be excluded from AI summary ────────
describe('T-SRFQ-AI1 — delivery_location excluded from AI summary (PII)', () => {
  it('does not include deliveryLocation in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      requirementTitle: 'Yarn for knitting',
      deliveryCountry: 'IND',
      // Note: deliveryLocation is not in the function signature — this test
      // verifies it is not inadvertently added to the output.
    });
    // No way to pass deliveryLocation — confirm function signature excludes it.
    expect(text).not.toMatch(/123|street|unit|park|location/i);
    expect(text).toContain('Yarn for knitting');
  });
});

// ─── T-SRFQ-AI2: targetDeliveryDate MUST be excluded from AI summary ─────
describe('T-SRFQ-AI2 — targetDeliveryDate excluded from AI summary (scheduling sensitivity)', () => {
  it('does not include targetDeliveryDate in output', () => {
    // targetDeliveryDate is not in the function signature.
    const text = assembleStructuredRfqRequirementSummaryText({
      requirementTitle: 'Cotton Yarn',
      urgency: 'URGENT',
    });
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(text).toContain('Urgency: URGENT');
  });
});

// ─── T-SRFQ-AI3: price/item_unit_price MUST be excluded ──────────────────
describe('T-SRFQ-AI3 — price excluded from AI summary (financial governance)', () => {
  it('does not include price label in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      requirementTitle: 'Premium Ring-Spun Yarn',
      urgency: 'STANDARD',
    });
    expect(text.toLowerCase()).not.toMatch(/\bprice\b/);
    expect(text.toLowerCase()).not.toMatch(/\bunit_price\b/);
  });
});

// ─── T-SRFQ-AI4: requirementTitle MUST be included ───────────────────────
describe('T-SRFQ-AI4 — requirementTitle included in AI summary', () => {
  it('includes requirementTitle in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      requirementTitle: '40/1 NE Ring-Spun Yarn',
    });
    expect(text).toContain('Requirement: 40/1 NE Ring-Spun Yarn');
  });
});

// ─── T-SRFQ-AI5: urgency MUST be included ────────────────────────────────
describe('T-SRFQ-AI5 — urgency included in AI summary', () => {
  it('includes urgency in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      urgency: 'URGENT',
    });
    expect(text).toContain('Urgency: URGENT');
  });
});

// ─── T-SRFQ-AI6: deliveryCountry MUST be included ────────────────────────
describe('T-SRFQ-AI6 — deliveryCountry included in AI summary', () => {
  it('includes deliveryCountry in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      deliveryCountry: 'BGD',
    });
    expect(text).toContain('Delivery country: BGD');
  });
});

// ─── T-SRFQ-AI7: stageRequirementAttributes MUST be included ─────────────
describe('T-SRFQ-AI7 — stageRequirementAttributes included in AI summary', () => {
  it('includes stage attributes in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      stageRequirementAttributes: {
        yarnType: 'RING_SPUN',
        yarnCount: '40/1',
        countSystem: 'NE',
      },
    });
    expect(text).toContain('Stage requirements:');
    expect(text).toContain('RING_SPUN');
    expect(text).toContain('40/1');
  });
});

// ─── Bonus: empty object returns empty string ─────────────────────────────
describe('T-SRFQ-AI8 — empty input returns empty string', () => {
  it('returns empty string when no fields provided', () => {
    const text = assembleStructuredRfqRequirementSummaryText({});
    expect(text).toBe('');
  });
});

// ─── buyerMessage MUST be included ────────────────────────────────────────
describe('T-SRFQ-AI9 — buyerMessage included in AI summary', () => {
  it('includes buyerMessage in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      buyerMessage: 'Please confirm lead time before order',
    });
    expect(text).toContain('Buyer message: Please confirm lead time before order');
  });
});

// ─── sampleRequired MUST be included ─────────────────────────────────────
describe('T-SRFQ-AI10 — sampleRequired included in AI summary', () => {
  it('includes sampleRequired=true as "yes"', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      sampleRequired: true,
    });
    expect(text).toContain('Sample required: yes');
  });

  it('includes sampleRequired=false as "no"', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      sampleRequired: false,
    });
    expect(text).toContain('Sample required: no');
  });
});

// ─── quantityUnit MUST be included ───────────────────────────────────────
describe('T-SRFQ-AI11 — quantityUnit included in AI summary', () => {
  it('includes quantityUnit in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      quantityUnit: 'meters',
    });
    expect(text).toContain('Quantity unit: meters');
  });
});

// ─── null/undefined fields are omitted from output ───────────────────────
describe('T-SRFQ-AI12 — null fields are omitted from AI summary', () => {
  it('does not include null fields in output', () => {
    const text = assembleStructuredRfqRequirementSummaryText({
      requirementTitle: null,
      urgency: null,
      deliveryCountry: null,
      stageRequirementAttributes: null,
      buyerMessage: null,
    });
    expect(text).toBe('');
  });
});
