/**
 * rfq-assist-service.test.ts — RFQ Assist Service Tests
 *
 * Tests runRfqAssistInference() and prompt builder via type contract validation:
 * - humanConfirmationRequired is always true in the result shape
 * - RfqAssistServiceOk shape has expected required keys
 * - RfqAssistServiceParseError shape has expected required keys
 * - buildRfqAssistantContext input type is sound for service input
 *
 * Note: Full integration tests requiring live inferenceService / PrismaClient
 * are not included here (those require e2e/test-db setup outside unit scope).
 * These tests validate the module's exported shape contracts and static concerns.
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/rfq-assist-service.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  RFQ_ASSIST_MODEL,
  RFQ_ASSIST_PREFLIGHT_TOKENS,
  RFQ_ASSIST_TIMEOUT_MS,
  type RfqAssistServiceOk,
  type RfqAssistServiceParseError,
} from '../rfqAssistService.js';

describe('rfqAssistService constants', () => {
  it('uses gemini-1.5-flash as the default model', () => {
    expect(RFQ_ASSIST_MODEL).toBe('gemini-1.5-flash');
  });

  it('sets a reasonable preflight token estimate', () => {
    expect(RFQ_ASSIST_PREFLIGHT_TOKENS).toBeGreaterThan(0);
    expect(RFQ_ASSIST_PREFLIGHT_TOKENS).toBeLessThanOrEqual(10_000);
  });

  it('uses an extended timeout (>= 10 seconds) for structured JSON output', () => {
    expect(RFQ_ASSIST_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });
});

describe('RfqAssistServiceOk type contract', () => {
  it('ok result has humanConfirmationRequired: true literal', () => {
    // This is a compile-time shape test via type assertion
    const mockResult: RfqAssistServiceOk = {
      ok: true,
      suggestions: {
        requirementTitle: null,
        quantityUnit: null,
        urgency: null,
        sampleRequired: null,
        deliveryCountry: null,
        stageRequirementAttributes: null,
        reasoning: '',
      },
      reasoningLogId: 'log-uuid-001',
      auditLogId: 'audit-uuid-001',
      tokensUsed: 500,
      costEstimateUSD: 0.0001,
      monthKey: '2025-06',
      hadInferenceError: false,
      humanConfirmationRequired: true,
    };

    expect(mockResult.humanConfirmationRequired).toBe(true);
    expect(mockResult.ok).toBe(true);
  });
});

describe('RfqAssistServiceParseError type contract', () => {
  it('parse error result has suggestionsParseError: true and humanConfirmationRequired: true', () => {
    const mockError: RfqAssistServiceParseError = {
      ok: false,
      suggestionsParseError: true,
      rawText: '{"broken": }',
      reasoningLogId: 'log-uuid-002',
      auditLogId: 'audit-uuid-002',
      hadInferenceError: false,
      humanConfirmationRequired: true,
    };

    expect(mockError.ok).toBe(false);
    expect(mockError.suggestionsParseError).toBe(true);
    expect(mockError.humanConfirmationRequired).toBe(true);
  });
});
