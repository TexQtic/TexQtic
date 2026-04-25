/**
 * ai-data-contracts.test.ts — AI Data Boundary Constants Tests
 *
 * Verifies that constitutional data class boundaries defined in aiDataContracts.ts
 * are correctly encoded:
 *   - price and publicationPosture are absent from AI_READABLE_DATA_CLASSES
 *   - price and publicationPosture are present in AI_FORBIDDEN_DATA_CLASSES
 *   - escrow data is forbidden
 *   - User.email is forbidden
 *   - catalogStage and stageAttributes are readable
 *   - AI_ACTION_BOUNDARY correctly classifies DECIDE/EXECUTE as FORBIDDEN
 *
 * Coverage requirements from TECS-AI-FOUNDATION-DATA-CONTRACTS-001:
 *   #1 price is forbidden
 *   #2 publicationPosture is forbidden
 *   #3 escrow data is forbidden
 *   #4 User.email is forbidden
 *   #5 catalogStage is allowed
 *   #6 stageAttributes are allowed
 *   #14 no provider/model call is made (satisfied: this file has no AI provider imports)
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/ai-data-contracts.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  AI_FORBIDDEN_DATA_CLASSES,
  AI_FORBIDDEN_FIELD_NAMES,
  AI_READABLE_DATA_CLASSES,
  AI_ACTION_BOUNDARY,
  AI_RAG_CONSTANTS,
  AI_REASONING_LOG_LIMITS,
  AI_CONTEXT_PACK_TYPES,
} from '../aiDataContracts.js';

// ─── AI_FORBIDDEN_DATA_CLASSES ─────────────────────────────────────────────────

describe('AI_FORBIDDEN_DATA_CLASSES', () => {
  it('includes CatalogItem.price — constitutionally forbidden from all AI paths', () => {
    expect(AI_FORBIDDEN_DATA_CLASSES).toContain('CatalogItem.price');
  });

  it('includes CatalogItem.publicationPosture — constitutionally forbidden from all AI paths', () => {
    expect(AI_FORBIDDEN_DATA_CLASSES).toContain('CatalogItem.publicationPosture');
  });

  it('includes escrow_accounts.* — financial instrument; zero AI read path', () => {
    expect(AI_FORBIDDEN_DATA_CLASSES).toContain('escrow_accounts.*');
  });

  it('includes escrow_transactions.* — financial transaction; zero AI read path', () => {
    expect(AI_FORBIDDEN_DATA_CLASSES).toContain('escrow_transactions.*');
  });

  it('includes User.email — PII; must never enter a prompt', () => {
    expect(AI_FORBIDDEN_DATA_CLASSES).toContain('User.email');
  });

  it('includes organizations.risk_score — control-plane only; tenant AI hard boundary', () => {
    expect(AI_FORBIDDEN_DATA_CLASSES).toContain('organizations.risk_score');
  });
});

// ─── AI_FORBIDDEN_FIELD_NAMES ──────────────────────────────────────────────────

describe('AI_FORBIDDEN_FIELD_NAMES', () => {
  it('contains price', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('price');
  });

  it('contains publicationPosture', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('publicationPosture');
  });

  it('contains escrow (standalone field name)', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('escrow');
  });

  it('contains escrowAccount', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('escrowAccount');
  });

  it('contains escrowTransaction', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('escrowTransaction');
  });

  it('contains email', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('email');
  });

  it('contains grossAmount', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('grossAmount');
  });

  it('contains riskScore', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('riskScore');
  });

  it('contains risk_score (snake_case variant)', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('risk_score');
  });

  it('contains password', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('password');
  });

  it('contains refreshToken', () => {
    expect(AI_FORBIDDEN_FIELD_NAMES).toContain('refreshToken');
  });
});

// ─── AI_READABLE_DATA_CLASSES ──────────────────────────────────────────────────

describe('AI_READABLE_DATA_CLASSES', () => {
  it('includes CatalogItem.catalogStage — readable and embeddable', () => {
    expect(AI_READABLE_DATA_CLASSES).toContain('CatalogItem.catalogStage');
  });

  it('includes CatalogItem.stageAttributes — readable and embeddable', () => {
    expect(AI_READABLE_DATA_CLASSES).toContain('CatalogItem.stageAttributes');
  });

  it('includes CatalogItem.moq — readable and embeddable', () => {
    expect(AI_READABLE_DATA_CLASSES).toContain('CatalogItem.moq');
  });

  it('includes CatalogItem.material — readable and embeddable', () => {
    expect(AI_READABLE_DATA_CLASSES).toContain('CatalogItem.material');
  });

  it('includes CatalogItem.certifications — readable and embeddable', () => {
    expect(AI_READABLE_DATA_CLASSES).toContain('CatalogItem.certifications');
  });

  it('does NOT include CatalogItem.price — constitutionally excluded', () => {
    expect(AI_READABLE_DATA_CLASSES).not.toContain('CatalogItem.price');
  });

  it('does NOT include CatalogItem.publicationPosture — constitutionally excluded', () => {
    expect(AI_READABLE_DATA_CLASSES).not.toContain('CatalogItem.publicationPosture');
  });

  it('does NOT include escrow_accounts.* — zero AI read path', () => {
    expect(AI_READABLE_DATA_CLASSES).not.toContain('escrow_accounts.*');
  });
});

// ─── AI_ACTION_BOUNDARY ────────────────────────────────────────────────────────

describe('AI_ACTION_BOUNDARY', () => {
  it('classifies DECIDE as FORBIDDEN', () => {
    expect(AI_ACTION_BOUNDARY.FORBIDDEN).toContain('DECIDE');
  });

  it('classifies EXECUTE as FORBIDDEN', () => {
    expect(AI_ACTION_BOUNDARY.FORBIDDEN).toContain('EXECUTE');
  });

  it('classifies ACCESS_PRICE_DATA as FORBIDDEN', () => {
    expect(AI_ACTION_BOUNDARY.FORBIDDEN).toContain('ACCESS_PRICE_DATA');
  });

  it('classifies ACCESS_ESCROW_DATA as FORBIDDEN', () => {
    expect(AI_ACTION_BOUNDARY.FORBIDDEN).toContain('ACCESS_ESCROW_DATA');
  });

  it('classifies READ as ALLOWED', () => {
    expect(AI_ACTION_BOUNDARY.ALLOWED).toContain('READ');
  });

  it('classifies SUMMARIZE as ALLOWED', () => {
    expect(AI_ACTION_BOUNDARY.ALLOWED).toContain('SUMMARIZE');
  });

  it('classifies SUGGEST as ALLOWED_WITH_CONSTRAINTS', () => {
    expect(AI_ACTION_BOUNDARY.ALLOWED_WITH_CONSTRAINTS).toContain('SUGGEST');
  });

  it('classifies DRAFT as ALLOWED_WITH_CONSTRAINTS', () => {
    expect(AI_ACTION_BOUNDARY.ALLOWED_WITH_CONSTRAINTS).toContain('DRAFT');
  });

  it('classifies AUTOFILL as ALLOWED_WITH_CONSTRAINTS', () => {
    expect(AI_ACTION_BOUNDARY.ALLOWED_WITH_CONSTRAINTS).toContain('AUTOFILL');
  });
});

// ─── AI_RAG_CONSTANTS ─────────────────────────────────────────────────────────

describe('AI_RAG_CONSTANTS', () => {
  it('EMBEDDING_DIM is 768 — hard-locked per ADR-028 §5.1', () => {
    expect(AI_RAG_CONSTANTS.EMBEDDING_DIM).toBe(768);
  });

  it('TOP_K is 5', () => {
    expect(AI_RAG_CONSTANTS.TOP_K).toBe(5);
  });

  it('MIN_SIMILARITY is 0.30', () => {
    expect(AI_RAG_CONSTANTS.MIN_SIMILARITY).toBe(0.30);
  });

  it('MAX_CONTEXT_CHUNKS is 3', () => {
    expect(AI_RAG_CONSTANTS.MAX_CONTEXT_CHUNKS).toBe(3);
  });
});

// ─── AI_REASONING_LOG_LIMITS ──────────────────────────────────────────────────

describe('AI_REASONING_LOG_LIMITS', () => {
  it('PROMPT_SUMMARY_MAX_CHARS is 500', () => {
    expect(AI_REASONING_LOG_LIMITS.PROMPT_SUMMARY_MAX_CHARS).toBe(500);
  });

  it('RESPONSE_SUMMARY_MAX_CHARS is 500', () => {
    expect(AI_REASONING_LOG_LIMITS.RESPONSE_SUMMARY_MAX_CHARS).toBe(500);
  });

  it('REASONING_SUMMARY_MAX_CHARS is 200', () => {
    expect(AI_REASONING_LOG_LIMITS.REASONING_SUMMARY_MAX_CHARS).toBe(200);
  });
});

// ─── AI_CONTEXT_PACK_TYPES ────────────────────────────────────────────────────

describe('AI_CONTEXT_PACK_TYPES', () => {
  it('includes SupplierMatchingContext', () => {
    expect(AI_CONTEXT_PACK_TYPES).toContain('SupplierMatchingContext');
  });

  it('includes WorkflowAssistantContext', () => {
    expect(AI_CONTEXT_PACK_TYPES).toContain('WorkflowAssistantContext');
  });

  it('includes RFQAssistantContext', () => {
    expect(AI_CONTEXT_PACK_TYPES).toContain('RFQAssistantContext');
  });
});
