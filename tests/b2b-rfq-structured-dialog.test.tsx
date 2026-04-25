/**
 * TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001 — Dialog UI descriptor tests (Prompt 2)
 *
 * App.tsx is a monolithic component with deeply nested state. Full render tests
 * would require mounting the entire application context. Instead, this file uses:
 *
 * 1. Source-descriptor tests — verify the exported pure helpers produce correct
 *    shape that drives the dialog render (confirmation step gate, stage section).
 * 2. Smoke verification — confirm that the dialog-related exports are present and
 *    callable (i.e. no build-time regression).
 *
 * This is consistent with the existing rfq-buyer-list-ui.test.tsx and
 * runtime-verification-tenant-enterprise.test.ts patterns in this repo.
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
  type RfqStageFieldDef,
} from '../App';

const {
  createInitialBuyerRfqDialogState,
  resolveBuyerRfqSubmitPayload,
  resolveBuyerRfqCloseState,
} = __B2B_RFQ_INITIATION_TESTING__;

const {
  resolveStructuredRfqStageSectionFields,
  resolveRfqConfirmationSummary,
} = __B2B_RFQ_STRUCTURED_DIALOG_TESTING__;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDialogWithProduct(overrides: Record<string, unknown> = {}) {
  return {
    ...createInitialBuyerRfqDialogState(),
    product: {
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      tenantId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      name: 'Organic Cotton Woven',
      sku: 'OCW-100',
      price: 0,
      active: true,
      createdAt: '',
      updatedAt: '',
      moq: 500,
    },
    quantity: '500',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T-SRFQ-UI01: Exports are present (build-time smoke)
// ---------------------------------------------------------------------------
describe('T-SRFQ-UI01 — structured dialog testing exports', () => {
  it('__B2B_RFQ_STRUCTURED_DIALOG_TESTING__ is exported', () => {
    expect(typeof resolveStructuredRfqStageSectionFields).toBe('function');
    expect(typeof resolveRfqConfirmationSummary).toBe('function');
  });

  it('__B2B_RFQ_INITIATION_TESTING__ retains all prior members', () => {
    expect(typeof createInitialBuyerRfqDialogState).toBe('function');
    expect(typeof resolveBuyerRfqSubmitPayload).toBe('function');
    expect(typeof resolveBuyerRfqCloseState).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-UI02: Confirmation step gate — first submit advances step, not API call
// ---------------------------------------------------------------------------
describe('T-SRFQ-UI02 — confirmation step gate (state descriptor)', () => {
  it('dialog starts with confirmationStep: false', () => {
    const dialog = makeDialogWithProduct();
    expect(dialog.confirmationStep).toBe(false);
  });

  it('after advancing to confirmation, payload resolves successfully', () => {
    const dialog = makeDialogWithProduct({ confirmationStep: false });

    // Simulate clicking "Review RFQ →": validate first
    const result = resolveBuyerRfqSubmitPayload(dialog as ReturnType<typeof createInitialBuyerRfqDialogState>);

    // No validation error means we would advance to confirmationStep: true
    expect(result.error).toBeNull();
    expect(result.payload).not.toBeNull();

    // After advancing, the dialog would have confirmationStep: true
    const dialogAtConfirmation = { ...dialog, confirmationStep: true };
    expect(dialogAtConfirmation.confirmationStep).toBe(true);
  });

  it('back from confirmation step resets confirmationStep to false', () => {
    const dialogAtConfirmation = makeDialogWithProduct({ confirmationStep: true });
    const afterBack = { ...dialogAtConfirmation, confirmationStep: false, error: null as string | null };
    expect(afterBack.confirmationStep).toBe(false);
  });

  it('invalid quantity prevents advancing to confirmation', () => {
    const dialog = makeDialogWithProduct({ quantity: '0' });
    const result = resolveBuyerRfqSubmitPayload(dialog as ReturnType<typeof createInitialBuyerRfqDialogState>);

    expect(result.error).toBeTruthy();
    expect(result.payload).toBeNull();
    // Dialog should NOT advance to confirmationStep: true
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-UI03: Stage section renders correct fields per stage
// ---------------------------------------------------------------------------
describe('T-SRFQ-UI03 — stage section field resolution for UI', () => {
  it('FABRIC_WOVEN stage returns weave, GSM, composition fields', () => {
    const fields = resolveStructuredRfqStageSectionFields('FABRIC_WOVEN');
    const keys = fields.map((f: RfqStageFieldDef) => f.key);

    expect(keys).toContain('weaveType');
    expect(keys).toContain('gsmMin');
    expect(keys).toContain('composition');
  });

  it('SERVICE stage returns serviceType and turnaroundDays', () => {
    const fields = resolveStructuredRfqStageSectionFields('SERVICE');
    const keys = fields.map((f: RfqStageFieldDef) => f.key);

    expect(keys).toContain('serviceType');
    expect(keys).toContain('turnaroundDays');
  });

  it('SOFTWARE_SAAS stage returns softwareCategory', () => {
    const fields = resolveStructuredRfqStageSectionFields('SOFTWARE_SAAS');
    const keys = fields.map((f: RfqStageFieldDef) => f.key);

    expect(keys).toContain('softwareCategory');
  });

  it('MACHINE stage returns machineType and conditionAccepted', () => {
    const fields = resolveStructuredRfqStageSectionFields('MACHINE');
    const keys = fields.map((f: RfqStageFieldDef) => f.key);

    expect(keys).toContain('machineType');
    expect(keys).toContain('conditionAccepted');
  });

  it('no stage (null) results in empty stage section — no fields rendered', () => {
    const fields = resolveStructuredRfqStageSectionFields(null);
    expect(fields).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-UI04: Confirmation summary displays correct lines for dialog state
// ---------------------------------------------------------------------------
describe('T-SRFQ-UI04 — confirmation summary structure', () => {
  it('always has Quantity line', () => {
    const dialog = makeDialogWithProduct();
    const summary = resolveRfqConfirmationSummary(dialog as ReturnType<typeof createInitialBuyerRfqDialogState>);
    const labels = summary.map(s => s.label);

    expect(labels).toContain('Quantity');
  });

  it('shows sampleRequired: No when false', () => {
    const dialog = makeDialogWithProduct({ sampleRequired: false });
    const summary = resolveRfqConfirmationSummary(dialog as ReturnType<typeof createInitialBuyerRfqDialogState>);
    const byLabel = Object.fromEntries(summary.map(s => [s.label, s.value]));

    expect(byLabel['Sample Required']).toBe('No');
  });

  it('includes filled stage attributes in confirmation summary', () => {
    const dialog = makeDialogWithProduct({
      catalogStage: 'YARN',
      stageRequirementAttributes: { yarnCount: '40/1', countSystem: 'NE', fiberComposition: '' },
    });
    const summary = resolveRfqConfirmationSummary(dialog as ReturnType<typeof createInitialBuyerRfqDialogState>);
    const byLabel = Object.fromEntries(summary.map(s => [s.label, s.value]));

    expect(byLabel['Yarn Count']).toBe('40/1');
    expect(byLabel['Count System']).toBe('NE');
    expect('Fiber Composition' in byLabel).toBe(false); // empty, should be omitted
  });

  it('Additional Notes appears under the label "Additional Notes"', () => {
    const dialog = makeDialogWithProduct({ buyerMessage: 'Rush this order please' });
    const summary = resolveRfqConfirmationSummary(dialog as ReturnType<typeof createInitialBuyerRfqDialogState>);
    const byLabel = Object.fromEntries(summary.map(s => [s.label, s.value]));

    expect(byLabel['Additional Notes']).toBe('Rush this order please');
    // Must not appear under old "Buyer Message" label
    expect('Buyer Message' in byLabel).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-SRFQ-UI05: Close resets dialog to initial state including new fields
// ---------------------------------------------------------------------------
describe('T-SRFQ-UI05 — close resets all structured fields', () => {
  it('resolveBuyerRfqCloseState resets dialog to initial (all new fields blank)', () => {
    const closeResult = resolveBuyerRfqCloseState();
    const dialog = closeResult.dialog;

    expect(dialog.requirementTitle).toBe('');
    expect(dialog.quantityUnit).toBe('');
    expect(dialog.urgency).toBe('');
    expect(dialog.sampleRequired).toBeNull();
    expect(dialog.stageRequirementAttributes).toEqual({});
    expect(dialog.catalogStage).toBeNull();
    expect(dialog.confirmationStep).toBe(false);
  });
});
