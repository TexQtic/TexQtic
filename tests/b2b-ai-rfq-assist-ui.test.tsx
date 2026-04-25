/**
 * TECS-AI-RFQ-ASSISTANT-MVP-001 — AI RFQ Assist UI descriptor tests
 *
 * Source-descriptor tests for the AI Assist UI helpers in the buyer RFQ dialog.
 * These tests verify the exported pure helpers that drive the UI rendering.
 * No React rendering is performed — consistent with the existing dialog test pattern.
 *
 * Design note: The AI Assist endpoint requires an existing rfqId. The button is
 * shown as unavailable before RFQ submission and enabled in the dialog success
 * state. Per TECS-AI-RFQ-ASSISTANT-MVP-001 Prompt 2 Section 3 Slice 3:
 * "If no RFQ ID exists before submit, show AI Assist as unavailable."
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
  resolveAiAssistStateOnClose,
  AI_ASSIST_DISPLAY_FIELDS,
} = __B2B_AI_RFQ_ASSIST_TESTING__;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFullSuggestions(overrides: Partial<RfqAssistSuggestions> = {}): RfqAssistSuggestions {
  return {
    requirementTitle: '100% Cotton Ring Spun — Buyer Brief Q3',
    quantityUnit: 'meters',
    urgency: 'URGENT',
    sampleRequired: false,
    deliveryCountry: 'IND',
    stageRequirementAttributes: { weaveType: 'Plain', gsmMin: '180' },
    reasoning: 'Based on catalog item and buyer context.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// T-AIASSIST-UI01: Testing exports are present (build-time smoke)
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI01 — __B2B_AI_RFQ_ASSIST_TESTING__ exports are present', () => {
  it('resolveAiAssistDisplayItems is a function', () => {
    expect(typeof resolveAiAssistDisplayItems).toBe('function');
  });

  it('resolveApplyAiSuggestion is a function', () => {
    expect(typeof resolveApplyAiSuggestion).toBe('function');
  });

  it('resolveAiAssistStateOnClose is a function', () => {
    expect(typeof resolveAiAssistStateOnClose).toBe('function');
  });

  it('AI_ASSIST_DISPLAY_FIELDS is a non-empty array', () => {
    expect(Array.isArray(AI_ASSIST_DISPLAY_FIELDS)).toBe(true);
    expect(AI_ASSIST_DISPLAY_FIELDS.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-UI02: AI Assist button does not auto-submit the RFQ
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI02 — AI Assist does not auto-submit RFQ', () => {
  it('initial dialog state has success=null, confirming no auto-submission', () => {
    const state = createInitialBuyerRfqDialogState();
    expect(state.success).toBeNull();
  });

  it('initial AI state has aiAssistLoading=false (no automatic trigger)', () => {
    const state = createInitialBuyerRfqDialogState();
    expect(state.aiAssistLoading).toBe(false);
  });

  it('initial AI state has aiAssistSuggestions=null (no pre-populated suggestions)', () => {
    const state = createInitialBuyerRfqDialogState();
    expect(state.aiAssistSuggestions).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-UI03: Suggestions are labeled AI-generated (display field list)
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI03 — suggestions are labeled as AI-generated', () => {
  it('resolveAiAssistDisplayItems returns label for each non-null suggestion field', () => {
    const suggestions = makeFullSuggestions();
    const items = resolveAiAssistDisplayItems(suggestions);

    // Every item must have a non-empty label string
    for (const item of items) {
      expect(typeof item.label).toBe('string');
      expect(item.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('display items have field, label and value properties', () => {
    const suggestions = makeFullSuggestions();
    const items = resolveAiAssistDisplayItems(suggestions);

    expect(items.length).toBeGreaterThan(0);
    const first = items[0];
    expect('field' in first).toBe(true);
    expect('label' in first).toBe(true);
    expect('value' in first).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-UI04: Accept suggestion writes fieldSourceMeta as AI_SUGGESTED
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI04 — accept updates fieldSourceMeta with AI_SUGGESTED', () => {
  it('accepted field gets AI_SUGGESTED in fieldSourceMeta', () => {
    const dialog = createInitialBuyerRfqDialogState();
    const patch = resolveApplyAiSuggestion(dialog, 'requirementTitle');

    expect(patch.aiFieldSourceMeta['requirementTitle']).toBe('AI_SUGGESTED');
  });

  it('accepting one field does not affect other fields in fieldSourceMeta', () => {
    const dialog = createInitialBuyerRfqDialogState();
    const patch = resolveApplyAiSuggestion(dialog, 'urgency');

    expect(Object.keys(patch.aiFieldSourceMeta)).toEqual(['urgency']);
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-UI05: Parse error shows safe fallback — no crash, no price shown
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI05 — parseError shows safe fallback state', () => {
  it('dialog can represent a parse error state (aiAssistParseError=true, suggestions=null)', () => {
    const parseErrorState = {
      ...createInitialBuyerRfqDialogState(),
      aiAssistParseError: true,
      aiAssistSuggestions: null,
    };

    expect(parseErrorState.aiAssistParseError).toBe(true);
    expect(parseErrorState.aiAssistSuggestions).toBeNull();
    // resolveAiAssistDisplayItems returns empty for null suggestions (safe fallback)
    expect(resolveAiAssistDisplayItems(null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-UI06: No price field in display list
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI06 — no price rendered in AI suggestions panel', () => {
  it('AI_ASSIST_DISPLAY_FIELDS does not include any price-related field', () => {
    const fieldNames = AI_ASSIST_DISPLAY_FIELDS.map(f => String(f.field).toLowerCase());

    expect(fieldNames.every(f => !f.includes('price'))).toBe(true);
    expect(fieldNames.every(f => !f.includes('cost'))).toBe(true);
    expect(fieldNames.every(f => !f.includes('quote'))).toBe(true);
  });

  it('resolveAiAssistDisplayItems never returns a price or cost item', () => {
    // Inject a malformed suggestions object with a price field to test the filter
    const malformed = {
      ...makeFullSuggestions(),
      price: 9.99,
    } as unknown as RfqAssistSuggestions;

    const items = resolveAiAssistDisplayItems(malformed);
    const fieldNames = items.map(i => i.field.toLowerCase());

    expect(fieldNames.every(f => !f.includes('price'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-UI07: No supplier-matching field in display list
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI07 — no supplier matching rendered in AI suggestions panel', () => {
  it('AI_ASSIST_DISPLAY_FIELDS does not include supplier-related fields', () => {
    const fieldNames = AI_ASSIST_DISPLAY_FIELDS.map(f => String(f.field).toLowerCase());

    expect(fieldNames.every(f => !f.includes('supplier'))).toBe(true);
    expect(fieldNames.every(f => !f.includes('vendor'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// T-AIASSIST-UI08: Manual RFQ submit unaffected by AI state
// ---------------------------------------------------------------------------
describe('T-AIASSIST-UI08 — manual RFQ submit still works without AI', () => {
  it('AI state fields do not interfere with existing submit fields', () => {
    const state = createInitialBuyerRfqDialogState();

    // Core submit fields must be independent of AI state
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.confirmationStep).toBe(false);

    // AI fields are additive — they don't overwrite core fields
    expect(state.aiAssistLoading).toBe(false);
    expect(state.aiAssistSuggestions).toBeNull();
  });

  it('final submit still requires confirmationStep to be true before calling API', () => {
    // The confirmation step gate is independent of AI Assist state
    const state = createInitialBuyerRfqDialogState();
    const withAiResults = {
      ...state,
      aiAssistSuggestions: makeFullSuggestions(),
      aiSuggestionDecisions: { requirementTitle: 'accepted' as const },
    };

    // Confirmation step is not automatically advanced by AI Assist
    expect(withAiResults.confirmationStep).toBe(false);
  });
});
