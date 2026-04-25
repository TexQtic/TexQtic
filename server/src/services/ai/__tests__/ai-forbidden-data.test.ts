/**
 * ai-forbidden-data.test.ts — AI Forbidden Data Guard Tests
 *
 * Verifies that runtime guard functions in aiForbiddenData.ts and
 * buildAiPromptSummary / buildAiResponseSummary in aiAuditContract.ts
 * correctly enforce the AI data boundary at the context-pack assembly boundary.
 *
 * Tests:
 *   containsForbiddenAiField — detects top-level forbidden fields
 *   assertNoForbiddenAiFields — throws for forbidden fields
 *   stripForbiddenAiFields — removes forbidden fields, preserves safe fields
 *   isAiSafeCatalogField — validates safe field allow-list
 *   getForbiddenFieldNames — returns complete forbidden set
 *   buildAiPromptSummary — truncates + throws on forbidden content
 *   buildAiResponseSummary — truncates + throws on forbidden content
 *
 * Coverage requirements from TECS-AI-FOUNDATION-DATA-CONTRACTS-001:
 *   #3 containsForbiddenAiField detects price/escrow
 *   #4 assertNoForbiddenAiFields throws for prohibited inputs
 *   #5 stripForbiddenAiFields preserves safe catalog fields
 *   #6 audit helpers truncate and guard forbidden content
 *   #14 no provider/model call is made
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/ai-forbidden-data.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  containsForbiddenAiField,
  assertNoForbiddenAiFields,
  stripForbiddenAiFields,
  isAiSafeCatalogField,
  getForbiddenFieldNames,
} from '../aiForbiddenData.js';
import { buildAiPromptSummary, buildAiResponseSummary } from '../aiAuditContract.js';

// ─── containsForbiddenAiField ──────────────────────────────────────────────────

describe('containsForbiddenAiField', () => {
  it('detects price at the top level', () => {
    expect(containsForbiddenAiField({ name: 'Cotton Fabric', price: 12.5 })).toBe(true);
  });

  it('detects publicationPosture at the top level', () => {
    expect(containsForbiddenAiField({ sku: 'CTN-001', publicationPosture: 'DRAFT' })).toBe(true);
  });

  it('detects escrow at the top level', () => {
    expect(containsForbiddenAiField({ tradeId: 'trade-001', escrow: { balance: 500 } })).toBe(true);
  });

  it('detects escrowAccount at the top level', () => {
    expect(containsForbiddenAiField({ escrowAccount: 'esc-acc-001' })).toBe(true);
  });

  it('detects email at the top level', () => {
    expect(containsForbiddenAiField({ userId: 'user-001', email: 'user@example.com' })).toBe(true);
  });

  it('detects grossAmount at the top level', () => {
    expect(containsForbiddenAiField({ tradeId: 'trade-001', grossAmount: 10000 })).toBe(true);
  });

  it('detects riskScore at the top level', () => {
    expect(containsForbiddenAiField({ orgId: 'org-001', riskScore: 0.85 })).toBe(true);
  });

  it('does NOT flag a safe catalog object', () => {
    expect(
      containsForbiddenAiField({
        id: 'item-001',
        sku: 'CTN-001',
        name: 'Cotton Fabric',
        catalogStage: 'RAW_MATERIAL',
        stageAttributes: { fiberContent: 'Cotton 100%' },
        material: 'Cotton',
        composition: '100% organic cotton',
        moq: 500,
        certifications: ['GOTS'],
      }),
    ).toBe(false);
  });

  it('returns false for null', () => {
    expect(containsForbiddenAiField(null)).toBe(false);
  });

  it('returns false for a string', () => {
    expect(containsForbiddenAiField('plain string with price mention')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(containsForbiddenAiField(42)).toBe(false);
  });

  it('returns false for an empty object', () => {
    expect(containsForbiddenAiField({})).toBe(false);
  });

  it('detects phone at the top level', () => {
    expect(containsForbiddenAiField({ phone: '+1-555-000-0000' })).toBe(true);
  });

  it('detects password at the top level', () => {
    expect(containsForbiddenAiField({ password: 'secret' })).toBe(true);
  });

  it('detects risk_score (snake_case) at the top level', () => {
    expect(containsForbiddenAiField({ risk_score: 0.55 })).toBe(true);
  });
});

// ─── assertNoForbiddenAiFields ────────────────────────────────────────────────

describe('assertNoForbiddenAiFields', () => {
  it('throws AI_FORBIDDEN_FIELD_DETECTED for an object with price', () => {
    expect(() => assertNoForbiddenAiFields({ sku: 'CTN-001', price: 12.5 })).toThrow(
      'AI_FORBIDDEN_FIELD_DETECTED',
    );
  });

  it('throws AI_FORBIDDEN_FIELD_DETECTED for an object with publicationPosture', () => {
    expect(() =>
      assertNoForbiddenAiFields({ sku: 'CTN-001', publicationPosture: 'DRAFT' }),
    ).toThrow('AI_FORBIDDEN_FIELD_DETECTED');
  });

  it('throws AI_FORBIDDEN_FIELD_DETECTED for an object with email', () => {
    expect(() => assertNoForbiddenAiFields({ userId: 'user-001', email: 'user@example.com' })).toThrow(
      'AI_FORBIDDEN_FIELD_DETECTED',
    );
  });

  it('does not throw for safe catalog fields', () => {
    expect(() =>
      assertNoForbiddenAiFields({
        name: 'Linen Fabric',
        sku: 'LNN-001',
        catalogStage: 'RAW_MATERIAL',
        stageAttributes: {},
        moq: 300,
        material: 'Linen',
      }),
    ).not.toThrow();
  });

  it('does not throw for null (non-object passthrough)', () => {
    expect(() => assertNoForbiddenAiFields(null)).not.toThrow();
  });

  it('does not throw for a string (non-object passthrough)', () => {
    expect(() => assertNoForbiddenAiFields('just a string')).not.toThrow();
  });
});

// ─── stripForbiddenAiFields ───────────────────────────────────────────────────

describe('stripForbiddenAiFields', () => {
  it('removes price from an object', () => {
    const result = stripForbiddenAiFields({ sku: 'CTN-001', price: 12.5, name: 'Cotton' });
    expect(result).not.toHaveProperty('price');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('sku');
  });

  it('removes publicationPosture but keeps catalogStage', () => {
    const result = stripForbiddenAiFields({
      catalogStage: 'RAW_MATERIAL',
      publicationPosture: 'PUBLISHED',
    });
    expect(result).not.toHaveProperty('publicationPosture');
    expect(result).toHaveProperty('catalogStage', 'RAW_MATERIAL');
  });

  it('removes email but keeps safe catalog fields', () => {
    const result = stripForbiddenAiFields({
      catalogStage: 'FABRIC',
      stageAttributes: { gsm: 180 },
      email: 'supplier@example.com',
    });
    expect(result).not.toHaveProperty('email');
    expect(result).toHaveProperty('catalogStage', 'FABRIC');
    expect(result).toHaveProperty('stageAttributes');
  });

  it('preserves moq, certifications, material, composition while removing price', () => {
    const result = stripForbiddenAiFields({
      moq: 500,
      certifications: ['GOTS', 'ISO9001'],
      material: 'Cotton',
      composition: '100% organic cotton',
      price: 25.0,
    });
    expect(result).not.toHaveProperty('price');
    expect(result).toHaveProperty('moq', 500);
    expect(result).toHaveProperty('certifications');
    expect(result).toHaveProperty('material', 'Cotton');
    expect(result).toHaveProperty('composition', '100% organic cotton');
  });

  it('removes multiple forbidden fields simultaneously', () => {
    const result = stripForbiddenAiFields({
      name: 'Bamboo Fabric',
      price: 18.0,
      email: 'contact@supplier.com',
      riskScore: 0.4,
      sku: 'BMB-001',
    });
    expect(result).not.toHaveProperty('price');
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('riskScore');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('sku');
  });

  it('returns an object unchanged when no forbidden fields are present', () => {
    const input = {
      sku: 'CTN-001',
      name: 'Cotton Fabric',
      catalogStage: 'RAW_MATERIAL',
      moq: 500,
    };
    const result = stripForbiddenAiFields(input);
    expect(result).toEqual(input);
  });
});

// ─── isAiSafeCatalogField ─────────────────────────────────────────────────────

describe('isAiSafeCatalogField', () => {
  it('returns true for catalogStage', () => {
    expect(isAiSafeCatalogField('catalogStage')).toBe(true);
  });

  it('returns true for stageAttributes', () => {
    expect(isAiSafeCatalogField('stageAttributes')).toBe(true);
  });

  it('returns true for moq', () => {
    expect(isAiSafeCatalogField('moq')).toBe(true);
  });

  it('returns true for certifications', () => {
    expect(isAiSafeCatalogField('certifications')).toBe(true);
  });

  it('returns true for material', () => {
    expect(isAiSafeCatalogField('material')).toBe(true);
  });

  it('returns true for composition', () => {
    expect(isAiSafeCatalogField('composition')).toBe(true);
  });

  it('returns true for name', () => {
    expect(isAiSafeCatalogField('name')).toBe(true);
  });

  it('returns true for sku', () => {
    expect(isAiSafeCatalogField('sku')).toBe(true);
  });

  it('returns true for description', () => {
    expect(isAiSafeCatalogField('description')).toBe(true);
  });

  it('returns false for price', () => {
    expect(isAiSafeCatalogField('price')).toBe(false);
  });

  it('returns false for publicationPosture', () => {
    expect(isAiSafeCatalogField('publicationPosture')).toBe(false);
  });

  it('returns false for email', () => {
    expect(isAiSafeCatalogField('email')).toBe(false);
  });

  it('returns false for an unknown field', () => {
    expect(isAiSafeCatalogField('unknownField')).toBe(false);
  });
});

// ─── getForbiddenFieldNames ───────────────────────────────────────────────────

describe('getForbiddenFieldNames', () => {
  it('returns a set containing price', () => {
    expect(getForbiddenFieldNames().has('price')).toBe(true);
  });

  it('returns a set containing email', () => {
    expect(getForbiddenFieldNames().has('email')).toBe(true);
  });

  it('returns a set containing escrow', () => {
    expect(getForbiddenFieldNames().has('escrow')).toBe(true);
  });

  it('returns a set containing publicationPosture', () => {
    expect(getForbiddenFieldNames().has('publicationPosture')).toBe(true);
  });

  it('returns a set containing grossAmount', () => {
    expect(getForbiddenFieldNames().has('grossAmount')).toBe(true);
  });

  it('returns a ReadonlySet (is a Set instance)', () => {
    expect(getForbiddenFieldNames()).toBeInstanceOf(Set);
  });
});

// ─── buildAiPromptSummary ─────────────────────────────────────────────────────

describe('buildAiPromptSummary', () => {
  it('passes a short summary through unchanged', () => {
    const input = 'AI identified 3 matching suppliers for organic cotton fabric.';
    expect(buildAiPromptSummary(input)).toBe(input);
  });

  it('truncates a string longer than 500 chars', () => {
    const input = 'a'.repeat(600);
    const result = buildAiPromptSummary(input);
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('accepts exactly 500 chars without truncation', () => {
    const input = 'a'.repeat(500);
    const result = buildAiPromptSummary(input);
    expect(result.length).toBe(500);
    expect(result.endsWith('\u2026')).toBe(false);
  });

  it('throws AI_AUDIT_FORBIDDEN_CONTENT for "context contains price data"', () => {
    expect(() => buildAiPromptSummary('context contains price data for supplier')).toThrow(
      'AI_AUDIT_FORBIDDEN_CONTENT',
    );
  });

  it('throws AI_AUDIT_FORBIDDEN_CONTENT for "user email is referenced"', () => {
    expect(() => buildAiPromptSummary('user email is referenced in the context')).toThrow(
      'AI_AUDIT_FORBIDDEN_CONTENT',
    );
  });

  it('throws AI_AUDIT_FORBIDDEN_CONTENT for a summary mentioning escrow', () => {
    expect(() => buildAiPromptSummary('AI used escrow status in prompt')).toThrow(
      'AI_AUDIT_FORBIDDEN_CONTENT',
    );
  });

  it('does not throw for safe summaries', () => {
    expect(() =>
      buildAiPromptSummary('Catalog item match for RAW_MATERIAL stage — 3 suppliers found.'),
    ).not.toThrow();
  });
});

// ─── buildAiResponseSummary ───────────────────────────────────────────────────

describe('buildAiResponseSummary', () => {
  it('passes a short summary through unchanged', () => {
    const input = 'Identified supplier match: cotton fabric at RAW_MATERIAL stage.';
    expect(buildAiResponseSummary(input)).toBe(input);
  });

  it('truncates a string longer than 500 chars', () => {
    const input = 'b'.repeat(600);
    const result = buildAiResponseSummary(input);
    expect(result.length).toBeLessThanOrEqual(500);
    expect(result.endsWith('\u2026')).toBe(true);
  });

  it('throws AI_AUDIT_FORBIDDEN_CONTENT for "escrow balance is referenced"', () => {
    expect(() => buildAiResponseSummary('escrow balance is referenced in response')).toThrow(
      'AI_AUDIT_FORBIDDEN_CONTENT',
    );
  });

  it('throws AI_AUDIT_FORBIDDEN_CONTENT for "grossAmount for this trade"', () => {
    expect(() => buildAiResponseSummary('grossAmount for this trade is 5000 USD')).toThrow(
      'AI_AUDIT_FORBIDDEN_CONTENT',
    );
  });

  it('throws AI_AUDIT_FORBIDDEN_CONTENT for publicationPosture mention', () => {
    expect(() =>
      buildAiResponseSummary('Supplier publicationPosture is PUBLISHED'),
    ).toThrow('AI_AUDIT_FORBIDDEN_CONTENT');
  });

  it('does not throw for a clean summary', () => {
    expect(() =>
      buildAiResponseSummary('AI draft generated for RFQ — human review required before send.'),
    ).not.toThrow();
  });
});
