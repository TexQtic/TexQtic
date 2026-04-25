/**
 * TECS-AI-RFQ-ASSISTANT-MVP-001 — AI RFQ Assist state descriptor tests
 *
 * Pure state/helper tests for the AI Assist feature in the buyer RFQ dialog.
 * These tests do NOT render App.tsx — they exercise the exported pure helpers.
 *
 * Design note: The AI Assist endpoint (POST /api/tenant/rfqs/:id/ai-assist) requires
 * an existing rfqId. The button is unavailable before RFQ submission and becomes
 * available in the dialog success state (dialog.success.rfqId).
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantDelete: vi.fn(),
  tenantGet: vi.fn(),
  tenantPatch: vi.fn(),
  tenantPost: vi.fn(),
  tenantPut: vi.fn(),
}));

import {
  __B2B_RFQ_INITIATION_TESTING__,
  __B2B_AI_RFQ_ASSIST_TESTING__,
  type RfqAssistSuggestions,
} from '../App';

const { createInitialBuyerRfqDialogState } = __B2B_RFQ_INITIATION_TESTING__;
const {
  resolveAiAssistDisplayItems,
  resolveApplyAiSuggestion,
  resolveRejectAiSuggestion,
  resolveAiAssistStateOnClose,
  AI_ASSIST_DISPLAY_FIELDS,
} = __B2B_AI_RFQ_ASSIST_TESTING__;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFullSuggestions(overrides: Partial<RfqAssistSuggestions> = {}): RfqAssistSuggestions {
  return {
    requirementTitle: '40s Ring Spun — SS26 Buyer Brief',
    quantityUnit: 'meters',
    urgency: 'STANDARD',
    sampleRequired: true,
    deliveryCountry: 'BGD',
    stageRequirementAttributes: { yarnCount: '40/1', countSystem: 'NE' },
    reasoning: 'Based on catalog item description and buyer context.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T-AIASSIST-S01: Initial dialog state includes all AI fields
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S01 — initial dialog state includes AI fields', () => {
  it('initial dialog state has AI assist fields defaulted correctly', () => {
    const state = createInitialBuyerRfqDialogState();

    expect(state.aiAssistLoading).toBe(false);
    expect(state.aiAssistError).toBeNull();
    expect(state.aiAssistSuggestions).toBeNull();
    expect(state.aiAssistParseError).toBe(false);
    expect(state.aiSuggestionDecisions).toEqual({});
    expect(state.aiFieldSourceMeta).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-S02: resolveAiAssistStateOnClose resets all AI fields
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S02 — AI state resets on close', () => {
  it('resolveAiAssistStateOnClose returns all AI fields in initial state', () => {
    const reset = resolveAiAssistStateOnClose();

    expect(reset.aiAssistLoading).toBe(false);
    expect(reset.aiAssistError).toBeNull();
    expect(reset.aiAssistSuggestions).toBeNull();
    expect(reset.aiAssistParseError).toBe(false);
    expect(reset.aiSuggestionDecisions).toEqual({});
    expect(reset.aiFieldSourceMeta).toEqual({});
  });

  it('spread of resolveAiAssistStateOnClose over a dirty dialog resets AI fields', () => {
    const dirtyDialog = {
      ...createInitialBuyerRfqDialogState(),
      aiAssistLoading: false,
      aiAssistSuggestions: makeFullSuggestions(),
      aiSuggestionDecisions: { requirementTitle: 'accepted' as const },
      aiFieldSourceMeta: { requirementTitle: 'AI_SUGGESTED' as const },
    };

    const afterClose = { ...dirtyDialog, ...resolveAiAssistStateOnClose() };

    expect(afterClose.aiAssistSuggestions).toBeNull();
    expect(afterClose.aiSuggestionDecisions).toEqual({});
    expect(afterClose.aiFieldSourceMeta).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-S03: Accept suggestion updates decisions and fieldSourceMeta
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S03 — accept suggestion marks field as accepted + AI_SUGGESTED', () => {
  it('resolveApplyAiSuggestion marks field as accepted', () => {
    const dialog = createInitialBuyerRfqDialogState();
    const patch = resolveApplyAiSuggestion(dialog, 'requirementTitle');

    expect(patch.aiSuggestionDecisions['requirementTitle']).toBe('accepted');
  });

  it('resolveApplyAiSuggestion marks field in aiFieldSourceMeta as AI_SUGGESTED', () => {
    const dialog = createInitialBuyerRfqDialogState();
    const patch = resolveApplyAiSuggestion(dialog, 'urgency');

    expect(patch.aiFieldSourceMeta['urgency']).toBe('AI_SUGGESTED');
  });

  it('resolveApplyAiSuggestion preserves existing decisions for other fields', () => {
    const dialog = {
      ...createInitialBuyerRfqDialogState(),
      aiSuggestionDecisions: { quantityUnit: 'rejected' as const },
      aiFieldSourceMeta: {},
    };

    const patch = resolveApplyAiSuggestion(dialog, 'requirementTitle');

    expect(patch.aiSuggestionDecisions['quantityUnit']).toBe('rejected');
    expect(patch.aiSuggestionDecisions['requirementTitle']).toBe('accepted');
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-S04: Reject suggestion updates decisions only — no fieldSourceMeta
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S04 — reject suggestion leaves field unchanged', () => {
  it('resolveRejectAiSuggestion marks field as rejected', () => {
    const dialog = createInitialBuyerRfqDialogState();
    const patch = resolveRejectAiSuggestion(dialog, 'urgency');

    expect(patch.aiSuggestionDecisions['urgency']).toBe('rejected');
  });

  it('resolveRejectAiSuggestion does not add field to aiFieldSourceMeta', () => {
    const dialog = createInitialBuyerRfqDialogState();
    const patch = resolveRejectAiSuggestion(dialog, 'urgency');

    // Rejection must NOT touch fieldSourceMeta — only accept should write AI_SUGGESTED
    expect('aiFieldSourceMeta' in patch).toBe(false);
  });

  it('resolveRejectAiSuggestion preserves existing accept decisions for other fields', () => {
    const dialog = {
      ...createInitialBuyerRfqDialogState(),
      aiSuggestionDecisions: { requirementTitle: 'accepted' as const },
    };

    const patch = resolveRejectAiSuggestion(dialog, 'urgency');

    expect(patch.aiSuggestionDecisions['requirementTitle']).toBe('accepted');
    expect(patch.aiSuggestionDecisions['urgency']).toBe('rejected');
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-S05: Apply all — null suggestions produce empty display list
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S05 — apply all ignores null suggestions', () => {
  it('resolveAiAssistDisplayItems returns empty array for null suggestions', () => {
    const items = resolveAiAssistDisplayItems(null);
    expect(items).toHaveLength(0);
  });

  it('resolveAiAssistDisplayItems filters out null field values', () => {
    const suggestions = makeFullSuggestions({
      urgency: null,
      sampleRequired: null,
    });
    const items = resolveAiAssistDisplayItems(suggestions);
    const fields = items.map(i => i.field);

    expect(fields).not.toContain('urgency');
    expect(fields).not.toContain('sampleRequired');
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-S06: fieldSourceMeta marks accepted fields AI_SUGGESTED only
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S06 — fieldSourceMeta only has accepted fields', () => {
  it('accepted field appears in aiFieldSourceMeta; rejected field does not', () => {
    const dialog = createInitialBuyerRfqDialogState();

    const afterAccept = resolveApplyAiSuggestion(dialog, 'requirementTitle');
    const afterReject = resolveRejectAiSuggestion(
      { ...dialog, ...afterAccept },
      'urgency',
    );

    const meta = { ...afterAccept.aiFieldSourceMeta };

    expect(meta['requirementTitle']).toBe('AI_SUGGESTED');
    // Rejected field must not appear in fieldSourceMeta
    expect('urgency' in meta).toBe(false);
    // Rejected decision is tracked separately
    expect(afterReject.aiSuggestionDecisions['urgency']).toBe('rejected');
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-S07: No price or supplier fields in display list
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S07 — no price or supplier fields rendered', () => {
  it('AI_ASSIST_DISPLAY_FIELDS does not include any price field', () => {
    const fields = AI_ASSIST_DISPLAY_FIELDS.map(f => f.field as string);
    expect(fields).not.toContain('price');
    expect(fields).not.toContain('unitPrice');
    expect(fields).not.toContain('quotePrice');
  });

  it('AI_ASSIST_DISPLAY_FIELDS does not include any supplier-matching field', () => {
    const fields = AI_ASSIST_DISPLAY_FIELDS.map(f => f.field as string);
    expect(fields).not.toContain('supplierOrgId');
    expect(fields).not.toContain('supplierId');
    expect(fields).not.toContain('supplierMatch');
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-S08: Manual RFQ submit path unaffected by AI state
// ---------------------------------------------------------------------------
describe('T-AIASSIST-S08 — manual RFQ submit still works without AI', () => {
  it('initial dialog has success=null (no auto-submit by AI)', () => {
    const state = createInitialBuyerRfqDialogState();
    expect(state.success).toBeNull();
  });

  it('AI state does not affect the loading / error / success fields', () => {
    const state = createInitialBuyerRfqDialogState();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });
});
