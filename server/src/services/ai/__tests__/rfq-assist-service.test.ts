/**
 * rfq-assist-service.test.ts — RFQ Assist Service Tests
 *
 * Tests runRfqAssistInference() and prompt builder via type contract validation:
 * - humanConfirmationRequired is always true in the result shape
 * - RfqAssistServiceOk shape has expected required keys
 * - RfqAssistServiceParseError shape has expected required keys
 * - buildRfqAssistantContext input type is sound for service input
 *
 * Also tests RAG isolation behaviour (HOTFIX-RAG-TX-001):
 * - RAG withDbContext failure caught before inference transaction starts
 * - precomputedRagContextBlock: null passed to runAiInference on RAG failure
 * - precomputedRagContextBlock: contextBlock passed on RAG success
 * - Result shape correct regardless of RAG outcome
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/rfq-assist-service.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import type { DatabaseContext } from '../../../lib/database-context.js';
import type { RFQAssistantContext } from '../aiContextPacks.js';
import {
  RFQ_ASSIST_MODEL,
  RFQ_ASSIST_PREFLIGHT_TOKENS,
  RFQ_ASSIST_TIMEOUT_MS,
  runRfqAssistInference,
  type RfqAssistServiceInput,
  type RfqAssistServiceOk,
  type RfqAssistServiceParseError,
} from '../rfqAssistService.js';
import { withDbContext } from '../../../lib/database-context.js';
import { runAiInference } from '../inferenceService.js';

// ── Module mocks (hoisted by Vitest) ──────────────────────────────────────────
vi.mock('../../../lib/database-context.js', () => ({
  withDbContext: vi.fn(),
}));

vi.mock('../inferenceService.js', () => ({
  runAiInference: vi.fn().mockResolvedValue({
    text: '{"requirementTitle":"Cotton Jersey","quantityUnit":"METERS","urgency":"STANDARD","sampleRequired":false,"deliveryCountry":"IND","stageRequirementAttributes":null,"reasoning":"Matched catalog item."}',
    tokensUsed: 500,
    costEstimateUSD: 0.0001,
    monthKey: '2026-04',
    auditLogId: 'audit-uuid-hotfix-001',
    inferenceLatencyMs: 200,
    hadInferenceError: false,
  }),
}));

// ── Module config mock to prevent env-parse failures ─────────────────────────
vi.mock('../../../config/index.js', () => ({
  config: { GEMINI_API_KEY: 'test-key' },
}));

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

// ─── HOTFIX-RAG-TX-001: RAG isolation behavioural tests ───────────────────────

function makeRfqContext(): RFQAssistantContext {
  return {
    buyerOrgId: 'org-buyer-test-001',
    rfqId: 'rfq-uuid-test-001',
    rfqStatus: 'OPEN',
    structuredRequirementText: 'Woven cotton fabric, 120 GSM, STANDARD urgency',
    catalogItemId: 'item-uuid-test-001',
    catalogItemStage: 'FABRIC_WOVEN',
    catalogItemText: 'Cotton woven fabric for apparel',
    catalogCompletenessScore: 0.75,
    supplierOrgId: 'org-supplier-test-001',
    retrievedChunks: [],
    humanConfirmationRequired: true,
  };
}

function makeRfqServiceInput(): RfqAssistServiceInput {
  return {
    context: makeRfqContext(),
    monthKey: '2026-04',
    requestId: 'req-hotfix-test-001',
    userId: 'user-uuid-001',
    prisma: {} as PrismaClient,
    dbContext: {
      orgId: 'org-buyer-test-001',
      actorId: 'user-uuid-001',
      realm: 'tenant',
      requestId: 'req-hotfix-test-001',
    } as DatabaseContext,
  };
}

describe('HOTFIX-RAG-TX-001: RAG isolation in runRfqAssistInference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default runAiInference mock
    vi.mocked(runAiInference).mockResolvedValue({
      text: '{"requirementTitle":"Cotton Jersey","quantityUnit":"METERS","urgency":"STANDARD","sampleRequired":false,"deliveryCountry":"IND","stageRequirementAttributes":null,"reasoning":"Matched catalog item."}',
      tokensUsed: 500,
      costEstimateUSD: 0.0001,
      monthKey: '2026-04',
      auditLogId: 'audit-uuid-hotfix-001',
      inferenceLatencyMs: 200,
      hadInferenceError: false,
    });
  });

  it('RAG-ISO-01: RAG withDbContext throws 25P02 — runAiInference still called', async () => {
    vi.mocked(withDbContext).mockRejectedValueOnce(new Error('25P02 current transaction is aborted'));

    await runRfqAssistInference(makeRfqServiceInput());

    expect(runAiInference).toHaveBeenCalledOnce();
  });

  it('RAG-ISO-02: RAG failure → precomputedRagContextBlock is null in runAiInference call', async () => {
    vi.mocked(withDbContext).mockRejectedValueOnce(new Error('25P02'));

    await runRfqAssistInference(makeRfqServiceInput());

    const callArg = vi.mocked(runAiInference).mock.calls[0]![0];
    expect(callArg.precomputedRagContextBlock).toBeNull();
    expect(callArg.taskType).toBe('rfq-assist');
  });

  it('RAG-ISO-03: RAG success → contextBlock forwarded to runAiInference', async () => {
    const CONTEXT_BLOCK = '### Retrieved Context\n[1] Source: catalog_item:item-001\nOrganic cotton.';
    vi.mocked(withDbContext).mockResolvedValueOnce({ contextBlock: CONTEXT_BLOCK, meta: null });

    await runRfqAssistInference(makeRfqServiceInput());

    const callArg = vi.mocked(runAiInference).mock.calls[0]![0];
    expect(callArg.precomputedRagContextBlock).toBe(CONTEXT_BLOCK);
  });

  it('RAG-ISO-04: RAG returns null contextBlock → precomputedRagContextBlock is null', async () => {
    vi.mocked(withDbContext).mockResolvedValueOnce({ contextBlock: null, meta: null });

    await runRfqAssistInference(makeRfqServiceInput());

    const callArg = vi.mocked(runAiInference).mock.calls[0]![0];
    expect(callArg.precomputedRagContextBlock).toBeNull();
  });

  it('RAG-ISO-05: result has humanConfirmationRequired: true even when RAG fails', async () => {
    vi.mocked(withDbContext).mockRejectedValueOnce(new Error('db error'));

    const result = await runRfqAssistInference(makeRfqServiceInput());

    expect(result.humanConfirmationRequired).toBe(true);
  });

  it('RAG-ISO-06: usage meter path reachable after RAG failure (inference proceeds)', async () => {
    vi.mocked(withDbContext).mockRejectedValueOnce(new Error('pgvector failure'));

    const result = await runRfqAssistInference(makeRfqServiceInput());

    // runAiInference was called (budget/usage/audit path reached)
    expect(runAiInference).toHaveBeenCalledOnce();
    // Result is a valid service result (ok or parse-error, not a thrown exception)
    expect(result).toHaveProperty('humanConfirmationRequired', true);
  });

  it('RAG-ISO-07: no price or publicationPosture fields in runAiInference input', async () => {
    vi.mocked(withDbContext).mockResolvedValueOnce({ contextBlock: null, meta: null });

    await runRfqAssistInference(makeRfqServiceInput());

    const callArg = vi.mocked(runAiInference).mock.calls[0]![0];
    expect(Object.keys(callArg)).not.toContain('price');
    expect(Object.keys(callArg)).not.toContain('publicationPosture');
    expect(Object.keys(callArg)).not.toContain('item_unit_price');
  });
});
