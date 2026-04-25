/**
 * TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001 — Dialog state tests (Prompt 2)
 *
 * Pure state/helper tests for the structured RFQ buyer dialog.
 * These tests do NOT render App.tsx — they exercise the exported pure helpers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantDelete: vi.fn(),
  tenantGet: vi.fn(),
  tenantPatch: vi.fn(),
  tenantPost: vi.fn(),
  tenantPut: vi.fn(),
}));

import {
  __B2B_RFQ_INITIATION_TESTING__,
  __B2B_RFQ_STRUCTURED_DIALOG_TESTING__,
} from '../App';

const {
  createInitialBuyerRfqDialogState,
  resolveBuyerRfqSubmitPayload,
} = __B2B_RFQ_INITIATION_TESTING__;

const {
  resolveStructuredRfqStageSectionFields,
  resolveRfqConfirmationSummary,
} = __B2B_RFQ_STRUCTURED_DIALOG_TESTING__;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDialog(overrides: Partial<ReturnType<typeof createInitialBuyerRfqDialogState>> = {}) {
  return {
    ...createInitialBuyerRfqDialogState(),
    product: {
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      tenantId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      name: 'Cotton Twill 200GSM',
      sku: 'CTW-200',
      price: 0,
      active: true,
      createdAt: '',
      updatedAt: '',
      moq: 100,
    },
    quantity: '100',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T-SRFQ-D01: Initial state includes all new structured fields
// ---------------------------------------------------------------------------
describe('T-SRFQ-D01 — initial state shape', () => {
  it('includes all new structured fields defaulted correctly', () => {
    const state = createInitialBuyerRfqDialogState();

    expect(state.requirementTitle).toBe('');
    expect(state.quantityUnit).toBe('');
    expect(state.urgency).toBe('');
    expect(state.sampleRequired).toBeNull();
    expect(state.targetDeliveryDate).toBe('');
    expect(state.deliveryLocation).toBe('');
    expect(state.deliveryCountry).toBe('');
    expect(state.stageRequirementAttributes).toEqual({});
    expect(state.catalogStage).toBeNull();
    expect(state.confirmationStep).toBe(false);
  });

  it('initial state has open=false and product=null', () => {
    const state = createInitialBuyerRfqDialogState();
    expect(state.open).toBe(false);
    expect(state.product).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D02: Legacy payload (quantity + buyerMessage only) still works
// ---------------------------------------------------------------------------
describe('T-SRFQ-D02 — legacy payload path', () => {
  it('returns a valid payload with catalogItemId, quantity when no structured fields set', () => {
    const dialog = makeDialog({ buyerMessage: '' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.error).toBeNull();
    expect(result.payload).not.toBeNull();
    expect(result.payload!.catalogItemId).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d');
    expect(result.payload!.quantity).toBe(100);
    expect('buyerMessage' in result.payload!).toBe(false);
  });

  it('includes buyerMessage when provided', () => {
    const dialog = makeDialog({ buyerMessage: 'Need fast delivery' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.buyerMessage).toBe('Need fast delivery');
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D03: Structured submit includes structured fields when set
// ---------------------------------------------------------------------------
describe('T-SRFQ-D03 — structured payload fields', () => {
  it('includes quantityUnit when set', () => {
    const dialog = makeDialog({ quantityUnit: 'meters' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.quantityUnit).toBe('meters');
  });

  it('includes urgency when set', () => {
    const dialog = makeDialog({ urgency: 'URGENT' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.urgency).toBe('URGENT');
  });

  it('includes sampleRequired: true when set', () => {
    const dialog = makeDialog({ sampleRequired: true });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.sampleRequired).toBe(true);
  });

  it('includes sampleRequired: false when explicitly set to false', () => {
    const dialog = makeDialog({ sampleRequired: false });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.sampleRequired).toBe(false);
  });

  it('includes requirementTitle when set', () => {
    const dialog = makeDialog({ requirementTitle: '40s Ring Spun for SS26' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.requirementTitle).toBe('40s Ring Spun for SS26');
  });

  it('includes deliveryCountry when set', () => {
    const dialog = makeDialog({ deliveryCountry: 'BGD' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.deliveryCountry).toBe('BGD');
  });

  it('includes stageRequirementAttributes when non-empty', () => {
    const dialog = makeDialog({
      stageRequirementAttributes: { yarnCount: '40/1', countSystem: 'NE' },
    });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.stageRequirementAttributes).toEqual({ yarnCount: '40/1', countSystem: 'NE' });
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D04: Empty optional fields are omitted from payload
// ---------------------------------------------------------------------------
describe('T-SRFQ-D04 — empty optional fields omitted', () => {
  it('omits urgency when empty string', () => {
    const dialog = makeDialog({ urgency: '' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('urgency' in result.payload!).toBe(false);
  });

  it('omits sampleRequired when null', () => {
    const dialog = makeDialog({ sampleRequired: null });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('sampleRequired' in result.payload!).toBe(false);
  });

  it('omits targetDeliveryDate when empty', () => {
    const dialog = makeDialog({ targetDeliveryDate: '' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('targetDeliveryDate' in result.payload!).toBe(false);
  });

  it('omits stageRequirementAttributes when all values are blank', () => {
    const dialog = makeDialog({
      stageRequirementAttributes: { yarnCount: '  ', countSystem: '' },
    });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('stageRequirementAttributes' in result.payload!).toBe(false);
  });

  it('strips blank-only keys from stageRequirementAttributes', () => {
    const dialog = makeDialog({
      stageRequirementAttributes: { yarnCount: '40/1', countSystem: '  ' },
    });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.stageRequirementAttributes).toEqual({ yarnCount: '40/1' });
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D05: resolveStructuredRfqStageSectionFields — YARN
// ---------------------------------------------------------------------------
describe('T-SRFQ-D05 — stage section fields YARN', () => {
  it('returns YARN-specific field list', () => {
    const fields = resolveStructuredRfqStageSectionFields('YARN');

    expect(fields.length).toBeGreaterThan(0);
    const keys = fields.map(f => f.key);
    expect(keys).toContain('yarnCount');
    expect(keys).toContain('fiberComposition');
    expect(keys).toContain('spinningType');
  });

  it('every field has a key and label', () => {
    const fields = resolveStructuredRfqStageSectionFields('YARN');
    for (const f of fields) {
      expect(typeof f.key).toBe('string');
      expect(typeof f.label).toBe('string');
      expect(f.key.length).toBeGreaterThan(0);
      expect(f.label.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D06: resolveStructuredRfqStageSectionFields — GARMENT
// ---------------------------------------------------------------------------
describe('T-SRFQ-D06 — stage section fields GARMENT', () => {
  it('returns GARMENT-specific field list', () => {
    const fields = resolveStructuredRfqStageSectionFields('GARMENT');

    const keys = fields.map(f => f.key);
    expect(keys).toContain('garmentType');
    expect(keys).toContain('sizeRange');
    expect(keys).toContain('fabricComposition');
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D07: resolveStructuredRfqStageSectionFields — null/unknown
// ---------------------------------------------------------------------------
describe('T-SRFQ-D07 — stage section fields null / unknown', () => {
  it('returns empty array for null catalogStage', () => {
    expect(resolveStructuredRfqStageSectionFields(null)).toEqual([]);
  });

  it('returns empty array for undefined catalogStage', () => {
    expect(resolveStructuredRfqStageSectionFields(undefined)).toEqual([]);
  });

  it('returns empty array for unknown stage value', () => {
    expect(resolveStructuredRfqStageSectionFields('UNKNOWN_FUTURE_STAGE')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D08: resolveRfqConfirmationSummary — structured fields
// ---------------------------------------------------------------------------
describe('T-SRFQ-D08 — confirmation summary with structured fields', () => {
  it('returns summary lines for filled structured fields', () => {
    const dialog = makeDialog({
      quantity: '500',
      quantityUnit: 'meters',
      requirementTitle: '40s Cotton for SS26',
      urgency: 'URGENT',
      sampleRequired: true,
      targetDeliveryDate: '2026-06-01',
      deliveryCountry: 'BGD',
      deliveryLocation: 'Dhaka',
    });

    const summary = resolveRfqConfirmationSummary(dialog);
    const byLabel = Object.fromEntries(summary.map(s => [s.label, s.value]));

    expect(byLabel['Quantity']).toContain('500');
    expect(byLabel['Quantity']).toContain('meters');
    expect(byLabel['Requirement Title']).toBe('40s Cotton for SS26');
    expect(byLabel['Urgency']).toBe('URGENT');
    expect(byLabel['Sample Required']).toBe('Yes');
    expect(byLabel['Target Delivery Date']).toBe('2026-06-01');
    expect(byLabel['Delivery Country']).toBe('BGD');
    expect(byLabel['Delivery Location']).toBe('Dhaka');
  });

  it('omits empty/null optional fields from summary', () => {
    const dialog = makeDialog({ urgency: '', sampleRequired: null, targetDeliveryDate: '' });
    const summary = resolveRfqConfirmationSummary(dialog);
    const labels = summary.map(s => s.label);

    expect(labels).not.toContain('Urgency');
    expect(labels).not.toContain('Sample Required');
    expect(labels).not.toContain('Target Delivery Date');
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D09: Payload does NOT include price
// ---------------------------------------------------------------------------
describe('T-SRFQ-D09 — payload excludes price', () => {
  it('does not include price in submit payload', () => {
    const dialog = makeDialog();
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('price' in result.payload!).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D10: Payload does NOT include publicationPosture
// ---------------------------------------------------------------------------
describe('T-SRFQ-D10 — payload excludes publicationPosture', () => {
  it('does not include publicationPosture in submit payload', () => {
    const dialog = makeDialog();
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('publicationPosture' in result.payload!).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D11: buyerMessage field name preserved in payload
// ---------------------------------------------------------------------------
describe('T-SRFQ-D11 — buyerMessage field name in payload', () => {
  it('uses the field name buyerMessage (not additionalNotes) in the payload', () => {
    const dialog = makeDialog({ buyerMessage: 'Testing field name' });
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect(result.payload!.buyerMessage).toBe('Testing field name');
    expect('additionalNotes' in result.payload!).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D12: confirmationStep is false in initial state
// ---------------------------------------------------------------------------
describe('T-SRFQ-D12 — confirmationStep default', () => {
  it('starts with confirmationStep: false', () => {
    const state = createInitialBuyerRfqDialogState();
    expect(state.confirmationStep).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-D13: Payload excludes requirementConfirmedAt and fieldSourceMeta (client never sends these)
// ---------------------------------------------------------------------------
describe('T-SRFQ-D13 — payload excludes server-only fields', () => {
  it('does not include requirementConfirmedAt', () => {
    const dialog = makeDialog();
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('requirementConfirmedAt' in result.payload!).toBe(false);
  });

  it('does not include fieldSourceMeta', () => {
    const dialog = makeDialog();
    const result = resolveBuyerRfqSubmitPayload(dialog);

    expect('fieldSourceMeta' in result.payload!).toBe(false);
  });
});
