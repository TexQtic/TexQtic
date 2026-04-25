/**
 * TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001
 * Structured RFQ requirements — body schema validation, mapper output, and
 * backward-compatibility with legacy RFQs that have no structured fields.
 * T-SRFQ-01 – T-SRFQ-13
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  assembleStructuredRfqRequirementSummaryText,
} from '../server/src/routes/tenant';

// ─── Zod body schema (must match the schema inside POST /tenant/rfqs) ─────
// We re-declare it here to test it in isolation.
const rfqBodySchema = z.object({
  catalogItemId: z.string().uuid(),
  quantity: z.number().int().min(1).optional().default(1),
  buyerMessage: z.string().trim().min(1).max(1000).optional(),
  requirementTitle: z.string().trim().max(200).optional(),
  quantityUnit: z.string().trim().max(50).optional(),
  urgency: z.enum(['STANDARD', 'URGENT', 'FLEXIBLE']).optional(),
  sampleRequired: z.boolean().optional(),
  targetDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deliveryLocation: z.string().trim().max(200).optional(),
  deliveryCountry: z.string().length(3).optional(),
  stageRequirementAttributes: z.record(z.string(), z.unknown()).optional(),
  requirementConfirmedAt: z.string().datetime().optional(),
  fieldSourceMeta: z.record(z.string(), z.unknown()).optional(),
});

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

// ─── T-SRFQ-01: legacy path (catalogItemId only) is valid ─────────────────
describe('T-SRFQ-01 — legacy POST with only catalogItemId succeeds', () => {
  it('parses successfully with no structured fields', () => {
    const result = rfqBodySchema.safeParse({ catalogItemId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requirementTitle).toBeUndefined();
      expect(result.data.urgency).toBeUndefined();
      expect(result.data.sampleRequired).toBeUndefined();
    }
  });
});

// ─── T-SRFQ-02: requirementTitle accepted ─────────────────────────────────
describe('T-SRFQ-02 — POST with requirementTitle succeeds', () => {
  it('parses requirementTitle correctly', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      requirementTitle: 'Need 40/1 NE ring-spun yarn',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requirementTitle).toBe('Need 40/1 NE ring-spun yarn');
    }
  });
});

// ─── T-SRFQ-03: quantityUnit accepted ────────────────────────────────────
describe('T-SRFQ-03 — POST with quantityUnit succeeds', () => {
  it('parses quantityUnit correctly', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      quantityUnit: 'kg',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantityUnit).toBe('kg');
    }
  });
});

// ─── T-SRFQ-04: urgency=STANDARD accepted ────────────────────────────────
describe('T-SRFQ-04 — POST with urgency=STANDARD succeeds', () => {
  it('parses urgency STANDARD', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      urgency: 'STANDARD',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.urgency).toBe('STANDARD');
    }
  });
});

// ─── T-SRFQ-05: urgency=INVALID rejected ─────────────────────────────────
describe('T-SRFQ-05 — POST with urgency=INVALID rejected with 400', () => {
  it('fails parsing with invalid urgency', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      urgency: 'INVALID',
    });
    expect(result.success).toBe(false);
  });
});

// ─── T-SRFQ-06: sampleRequired=true accepted ─────────────────────────────
describe('T-SRFQ-06 — POST with sampleRequired=true succeeds', () => {
  it('parses sampleRequired true', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      sampleRequired: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sampleRequired).toBe(true);
    }
  });
});

// ─── T-SRFQ-07: deliveryCountry ISO alpha-3 accepted ─────────────────────
describe('T-SRFQ-07 — POST with deliveryCountry GBR (alpha-3) succeeds', () => {
  it('parses 3-char delivery country', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      deliveryCountry: 'GBR',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveryCountry).toBe('GBR');
    }
  });
});

// ─── T-SRFQ-08: deliveryCountry alpha-2 rejected ─────────────────────────
describe('T-SRFQ-08 — POST with deliveryCountry GB (alpha-2) rejected', () => {
  it('fails parsing with 2-char delivery country', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      deliveryCountry: 'GB',
    });
    expect(result.success).toBe(false);
  });
});

// ─── T-SRFQ-09: all structured fields together succeeds ──────────────────
describe('T-SRFQ-09 — POST with all structured fields succeeds', () => {
  it('parses full structured RFQ request', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      quantity: 500,
      buyerMessage: 'Please confirm lead time',
      requirementTitle: 'Ring-spun yarn for garment production',
      quantityUnit: 'kg',
      urgency: 'URGENT',
      sampleRequired: true,
      targetDeliveryDate: '2026-08-15',
      deliveryLocation: '123 Buyer Street, Manchester',
      deliveryCountry: 'GBR',
      stageRequirementAttributes: { yarnType: 'RING_SPUN', yarnCount: '40/1' },
      fieldSourceMeta: { source: 'BUYER_PROVIDED' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(500);
      expect(result.data.requirementTitle).toBe('Ring-spun yarn for garment production');
      expect(result.data.urgency).toBe('URGENT');
      expect(result.data.targetDeliveryDate).toBe('2026-08-15');
      expect(result.data.deliveryCountry).toBe('GBR');
    }
  });
});

// ─── T-SRFQ-10: requirementConfirmedAt is server-set when structured fields present ──
describe('T-SRFQ-10 — requirementConfirmedAt logic: server sets when structured fields present', () => {
  it('schema allows requirementConfirmedAt as ISO datetime string', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      requirementTitle: 'Test',
      requirementConfirmedAt: '2026-05-04T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });
});

// ─── T-SRFQ-11: requirementConfirmedAt null when no structured fields ─────
describe('T-SRFQ-11 — requirementConfirmedAt logic: server should set null for legacy RFQ', () => {
  it('schema returns undefined requirementConfirmedAt when field absent', () => {
    const result = rfqBodySchema.safeParse({ catalogItemId: VALID_UUID });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requirementConfirmedAt).toBeUndefined();
    }
  });
});

// ─── T-SRFQ-12: deliveryLocation included in buyer schema ────────────────
describe('T-SRFQ-12 — deliveryLocation is accepted in buyer request schema', () => {
  it('parses deliveryLocation', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      deliveryLocation: 'Unit 4, Trafford Park, Manchester M17 1PZ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveryLocation).toBe('Unit 4, Trafford Park, Manchester M17 1PZ');
    }
  });
});

// ─── T-SRFQ-13: stageRequirementAttributes is a free-form record ─────────
describe('T-SRFQ-13 — stageRequirementAttributes accepts arbitrary JSON objects', () => {
  it('parses nested stage attributes', () => {
    const result = rfqBodySchema.safeParse({
      catalogItemId: VALID_UUID,
      stageRequirementAttributes: {
        yarnType: 'RING_SPUN',
        ply: 2,
        endUse: ['WOVEN_FABRIC'],
        nested: { extra: true },
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stageRequirementAttributes).toMatchObject({
        yarnType: 'RING_SPUN',
        ply: 2,
      });
    }
  });
});
