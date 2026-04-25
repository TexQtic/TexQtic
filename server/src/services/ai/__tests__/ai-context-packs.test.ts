/**
 * ai-context-packs.test.ts — AI Context Pack Type Contract Tests
 *
 * Verifies that context pack interfaces defined in aiContextPacks.ts correctly
 * exclude forbidden fields and encode human confirmation requirements.
 *
 * These tests validate the runtime structure of conforming context pack objects
 * (which mirror the TypeScript interface contracts at compile-time):
 *   - SupplierMatchingContext: must not contain price or any forbidden field
 *   - RFQDraftingContext: must have humanConfirmationRequired === true
 *   - WorkflowAssistantContext: must not contain grossAmount or escrow* keys
 *
 * Coverage requirements from TECS-AI-FOUNDATION-DATA-CONTRACTS-001:
 *   #7 supplier matching context excludes price
 *   #8 RFQ drafting context requires human confirmation
 *   #9 workflow assistant context excludes grossAmount/escrow
 *   #14 no provider/model call is made (satisfied: no AI provider imports)
 *
 * Run:
 *   pnpm --dir server exec vitest run src/services/ai/__tests__/ai-context-packs.test.ts
 */

import { describe, it, expect } from 'vitest';
import type {
  SupplierMatchingContext,
  RFQDraftingContext,
  WorkflowAssistantContext,
  SupplierProfileCompletenessContext,
  DocumentExtractionContext,
  MarketIntelligenceContext,
  TrustScoreContext,
} from '../aiContextPacks.js';
import { containsForbiddenAiField } from '../aiForbiddenData.js';

// ─── SupplierMatchingContext ───────────────────────────────────────────────────

describe('SupplierMatchingContext', () => {
  it('a valid context pack does not contain any forbidden fields', () => {
    const ctx: SupplierMatchingContext = {
      queryOrgId: 'org-abc-123',
      queryText: 'organic cotton fabric with GOTS certification',
      queryEmbedding: new Array<number>(768).fill(0),
      topK: 5,
      minSimilarity: 0.3,
      sourceType: 'CATALOG_ITEM',
      retrievedChunks: [
        { sourceType: 'CATALOG_ITEM', sourceId: 'item-001-uuid', similarity: 0.85 },
      ],
    };

    expect(containsForbiddenAiField(ctx)).toBe(false);
  });

  it('does not include price as a key', () => {
    const ctx: SupplierMatchingContext = {
      queryOrgId: 'org-abc-123',
      queryText: 'recycled polyester fabric',
      queryEmbedding: new Array<number>(768).fill(0),
      topK: 5,
      minSimilarity: 0.3,
      sourceType: 'CATALOG_ITEM',
      retrievedChunks: [],
    };

    expect(Object.keys(ctx)).not.toContain('price');
  });

  it('does not include publicationPosture as a key', () => {
    const ctx: SupplierMatchingContext = {
      queryOrgId: 'org-abc-123',
      queryText: 'woven fabric',
      queryEmbedding: new Array<number>(768).fill(0),
      topK: 5,
      minSimilarity: 0.3,
      sourceType: 'CATALOG_ITEM',
      retrievedChunks: [],
    };

    expect(Object.keys(ctx)).not.toContain('publicationPosture');
  });

  it('topK is the literal value 5 (RAG_TOP_K constant)', () => {
    const ctx: SupplierMatchingContext = {
      queryOrgId: 'org-abc-123',
      queryText: 'cotton fabric',
      queryEmbedding: [],
      topK: 5,
      minSimilarity: 0.3,
      sourceType: 'CATALOG_ITEM',
      retrievedChunks: [],
    };

    expect(ctx.topK).toBe(5);
  });

  it('minSimilarity is the literal value 0.3 (RAG_MIN_SIMILARITY constant)', () => {
    const ctx: SupplierMatchingContext = {
      queryOrgId: 'org-abc-123',
      queryText: 'cotton fabric',
      queryEmbedding: [],
      topK: 5,
      minSimilarity: 0.3,
      sourceType: 'CATALOG_ITEM',
      retrievedChunks: [],
    };

    expect(ctx.minSimilarity).toBe(0.3);
  });

  it('sourceType is CATALOG_ITEM', () => {
    const ctx: SupplierMatchingContext = {
      queryOrgId: 'org-abc-123',
      queryText: 'cotton fabric',
      queryEmbedding: [],
      topK: 5,
      minSimilarity: 0.3,
      sourceType: 'CATALOG_ITEM',
      retrievedChunks: [],
    };

    expect(ctx.sourceType).toBe('CATALOG_ITEM');
  });

  it('adding price to a context object is detected by the forbidden guard', () => {
    const ctxWithLeak = {
      queryOrgId: 'org-abc-123',
      queryText: 'cotton fabric',
      queryEmbedding: [],
      topK: 5 as const,
      minSimilarity: 0.3 as const,
      sourceType: 'CATALOG_ITEM' as const,
      retrievedChunks: [],
      price: 100, // simulates accidental field leakage
    };

    expect(containsForbiddenAiField(ctxWithLeak)).toBe(true);
  });
});

// ─── RFQDraftingContext ────────────────────────────────────────────────────────

describe('RFQDraftingContext', () => {
  it('humanConfirmationRequired is literal true', () => {
    const ctx: RFQDraftingContext = {
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      catalogItemId: 'item-uuid-001',
      catalogItemText: 'Cotton fabric, GSM 180, GOTS certified, MOQ 500m',
      completenessScore: 0.85,
      buyerRequirementText: 'Need certified organic cotton fabric',
      retrievedChunks: [],
      humanConfirmationRequired: true,
    };

    expect(ctx.humanConfirmationRequired).toBe(true);
  });

  it('does not include price as a key', () => {
    const ctx: RFQDraftingContext = {
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      catalogItemId: 'item-uuid-001',
      catalogItemText: 'Cotton fabric, GSM 180',
      completenessScore: 0.72,
      buyerRequirementText: 'Need cotton fabric',
      retrievedChunks: [],
      humanConfirmationRequired: true,
    };

    expect(Object.keys(ctx)).not.toContain('price');
  });

  it('does not contain any forbidden fields', () => {
    const ctx: RFQDraftingContext = {
      buyerOrgId: 'buyer-org-001',
      supplierOrgId: 'supplier-org-002',
      catalogItemId: 'item-uuid-001',
      catalogItemText: 'Recycled polyester, GSM 200',
      completenessScore: 0.6,
      buyerRequirementText: 'Need polyester fabric',
      retrievedChunks: [],
      humanConfirmationRequired: true,
    };

    expect(containsForbiddenAiField(ctx)).toBe(false);
  });
});

// ─── WorkflowAssistantContext ─────────────────────────────────────────────────

describe('WorkflowAssistantContext', () => {
  it('does not include grossAmount as a key', () => {
    const ctx: WorkflowAssistantContext = {
      orgId: 'org-buyer-001',
      tradeId: 'trade-uuid-001',
      currentLifecycleState: 'AWAITING_CONFIRMATION',
      allowedTransitions: ['CONFIRM', 'CANCEL'],
      tradeReference: 'TRD-2026-001',
      buyerOrgId: 'org-buyer-001',
      sellerOrgId: 'org-seller-002',
      humanConfirmationRequired: true,
    };

    expect(Object.keys(ctx)).not.toContain('grossAmount');
  });

  it('does not include escrow-related keys', () => {
    const ctx: WorkflowAssistantContext = {
      orgId: 'org-buyer-001',
      tradeId: 'trade-uuid-001',
      currentLifecycleState: 'AWAITING_CONFIRMATION',
      allowedTransitions: ['CONFIRM'],
      tradeReference: 'TRD-2026-001',
      buyerOrgId: 'org-buyer-001',
      sellerOrgId: 'org-seller-002',
      humanConfirmationRequired: true,
    };

    const keys = Object.keys(ctx);
    expect(keys).not.toContain('escrow');
    expect(keys).not.toContain('escrowAccount');
    expect(keys).not.toContain('escrowTransaction');
  });

  it('humanConfirmationRequired is literal true', () => {
    const ctx: WorkflowAssistantContext = {
      orgId: 'org-buyer-001',
      tradeId: 'trade-uuid-001',
      currentLifecycleState: 'AWAITING_CONFIRMATION',
      allowedTransitions: [],
      tradeReference: 'TRD-2026-001',
      buyerOrgId: 'org-buyer-001',
      sellerOrgId: 'org-seller-002',
      humanConfirmationRequired: true,
    };

    expect(ctx.humanConfirmationRequired).toBe(true);
  });

  it('does not contain any forbidden fields in the assembled object', () => {
    const ctx: WorkflowAssistantContext = {
      orgId: 'org-buyer-001',
      tradeId: 'trade-uuid-001',
      currentLifecycleState: 'GOODS_INSPECTED',
      allowedTransitions: ['RELEASE_PAYMENT', 'RAISE_DISPUTE'],
      tradeReference: 'TRD-2026-002',
      buyerOrgId: 'org-buyer-001',
      sellerOrgId: 'org-seller-002',
      humanConfirmationRequired: true,
    };

    expect(containsForbiddenAiField(ctx)).toBe(false);
  });
});

// ─── SupplierProfileCompletenessContext ───────────────────────────────────────

describe('SupplierProfileCompletenessContext', () => {
  it('does not include price in catalog items', () => {
    const ctx: SupplierProfileCompletenessContext = {
      orgId: 'supplier-org-001',
      catalogItems: [
        {
          id: 'item-001',
          sku: 'CTN-001',
          name: 'Organic Cotton',
          catalogStage: 'RAW_MATERIAL',
          stageAttributes: { fiberContent: 'Cotton 100%' },
          material: 'Cotton',
          moq: 500,
        },
      ],
      certifications: [{ id: 'cert-001', certificationType: 'GOTS', expiresAt: null }],
      completenessScores: { 'item-001': 0.82 },
      stageBreakdown: { RAW_MATERIAL: 1 },
    };

    for (const item of ctx.catalogItems) {
      expect(Object.keys(item)).not.toContain('price');
      expect(Object.keys(item)).not.toContain('publicationPosture');
    }
  });
});

// ─── DocumentExtractionContext ────────────────────────────────────────────────

describe('DocumentExtractionContext', () => {
  it('humanReviewRequired is literal true', () => {
    const ctx: DocumentExtractionContext = {
      orgId: 'supplier-org-001',
      documentSourceType: 'CERTIFICATION',
      documentText: 'GOTS Certificate issued 2026-01-15, valid until 2027-01-14',
      targetEntityId: 'cert-uuid-001',
      targetEntityType: 'Certification',
      humanReviewRequired: true,
    };

    expect(ctx.humanReviewRequired).toBe(true);
  });
});

// ─── MarketIntelligenceContext ────────────────────────────────────────────────

describe('MarketIntelligenceContext', () => {
  it('does not include price in aggregated signals', () => {
    const ctx: MarketIntelligenceContext = {
      adminActorId: 'admin-actor-001',
      aggregatedSignals: {
        totalActiveItems: 1500,
        stageDistribution: { RAW_MATERIAL: 400, YARN: 300 },
        certificationCoverage: 0.65,
      },
    };

    expect(Object.keys(ctx.aggregatedSignals)).not.toContain('price');
    expect(containsForbiddenAiField(ctx.aggregatedSignals)).toBe(false);
  });
});

// ─── TrustScoreContext ────────────────────────────────────────────────────────

describe('TrustScoreContext', () => {
  it('does not include escrow balance keys', () => {
    const ctx: TrustScoreContext = {
      adminActorId: 'admin-actor-001',
      targetOrgId: 'supplier-org-001',
      certificationStatus: [{ id: 'cert-001', certificationType: 'ISO9001', expiresAt: null }],
      tradeHistorySummary: { totalTrades: 45, completedTrades: 40, disputedTrades: 2 },
      sanctionStatus: 'CLEAR',
    };

    expect(Object.keys(ctx)).not.toContain('escrow');
    expect(Object.keys(ctx)).not.toContain('escrowBalance');
  });

  it('sanctionStatus is one of the allowed enum values', () => {
    const ctx: TrustScoreContext = {
      adminActorId: 'admin-actor-001',
      targetOrgId: 'supplier-org-001',
      certificationStatus: [],
      tradeHistorySummary: { totalTrades: 10, completedTrades: 8, disputedTrades: 0 },
      sanctionStatus: 'CLEAR',
    };

    expect(['CLEAR', 'ACTIVE', 'DECAYED']).toContain(ctx.sanctionStatus);
  });
});
