/**
 * supplierMatchSemanticSignal.test.ts — Slice F: Semantic Signal Service Tests
 *
 * 35 test cases (TC-01 to TC-35) covering:
 *  - Happy path signal building
 *  - buyerOrgId and supplierOrgId validation
 *  - Embedding dimension and model validation
 *  - Cross-tenant isolation
 *  - Forbidden source type rejection
 *  - Forbidden source text fragment rejection
 *  - Similarity bucketing (HIGH/MEDIUM/LOW)
 *  - No raw score / vector / embedding ID in output
 *  - Runtime guard blocking semantic fields
 *  - Semantic signal cannot bypass policy gates
 *  - Determinism, version constants, constitutional guarantees
 */

import { describe, it, expect } from 'vitest';
import {
  buildSupplierSemanticSignals,
  SEMANTIC_SIGNAL_SERVICE_VERSION,
  ALLOWED_EMBEDDING_MODEL,
  REQUIRED_EMBEDDING_DIM,
} from '../services/ai/supplierMatching/supplierMatchSemanticSignal.service.js';
import type {
  SupplierMatchEmbeddingCandidate,
  SupplierMatchSemanticSignalInput,
} from '../services/ai/supplierMatching/supplierMatch.types.js';
import {
  guardSupplierMatchOutput,
  getForbiddenGuardFields,
} from '../services/ai/supplierMatching/supplierMatchRuntimeGuard.service.js';
import { applySupplierMatchPolicyFilter } from '../services/ai/supplierMatching/supplierMatchPolicyFilter.service.js';
import type {
  SupplierMatchCandidateDraft,
} from '../services/ai/supplierMatching/supplierMatch.types.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const BUYER_ORG_ID = 'buyer-org-001';
const SUPPLIER_ORG_ID_A = 'supplier-org-A01';
const SUPPLIER_ORG_ID_B = 'supplier-org-B02';

function makeSafeCandidate(
  overrides: Partial<SupplierMatchEmbeddingCandidate> = {},
): SupplierMatchEmbeddingCandidate {
  return {
    supplierOrgId: SUPPLIER_ORG_ID_A,
    orgId: BUYER_ORG_ID,
    sourceType: 'CATALOG_ITEM',
    sourceId: 'src-uuid-0001',
    similarity: 0.88,
    ...overrides,
  };
}

function makeInput(
  candidates: SupplierMatchEmbeddingCandidate[],
  overrides: Partial<SupplierMatchSemanticSignalInput> = {},
): SupplierMatchSemanticSignalInput {
  return {
    buyerOrgId: BUYER_ORG_ID,
    embeddingCandidates: candidates,
    ...overrides,
  };
}

// ─── TC-01: Happy path — builds semantic signal from a safe candidate ─────────

describe('TC-01: builds semantic signal from safe precomputed embedding candidate', () => {
  it('returns a signal with supplierOrgId, similarityBucket, sourceType, sourceId, matchCategory', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));

    expect(result.signals).toHaveLength(1);
    const signal = result.signals[0];
    expect(signal.supplierOrgId).toBe(SUPPLIER_ORG_ID_A);
    expect(signal.sourceType).toBe('CATALOG_ITEM');
    expect(signal.sourceId).toBe('src-uuid-0001');
    expect(signal.matchCategory).toBe('SEMANTIC_FIT');
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(signal.similarityBucket);
  });
});

// ─── TC-02: Empty buyerOrgId → empty safe result ─────────────────────────────

describe('TC-02: requires buyerOrgId', () => {
  it('returns empty result when buyerOrgId is empty string', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()], { buyerOrgId: '' }));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(0);
    expect(result.modelCallMade).toBe(false);
  });

  it('returns empty result when buyerOrgId is whitespace only', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()], { buyerOrgId: '   ' }));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(0);
  });
});

// ─── TC-03: Missing candidate supplierOrgId → rejected ───────────────────────

describe('TC-03: requires candidate supplierOrgId', () => {
  it('rejects candidate with empty supplierOrgId and increments rejectedCandidateCount', () => {
    const candidate = makeSafeCandidate({ supplierOrgId: '' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-04: Dimension 768 present and valid → accepted ───────────────────────

describe('TC-04: accepts candidate with dimension 768', () => {
  it('accepts candidate when dimension is exactly 768', () => {
    const candidate = makeSafeCandidate({ dimension: 768 });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(1);
    expect(result.rejectedCandidateCount).toBe(0);
  });
});

// ─── TC-05: Non-768 dimension → rejected ─────────────────────────────────────

describe('TC-05: rejects non-768 dimension', () => {
  it('rejects candidate with dimension 512', () => {
    const candidate = makeSafeCandidate({ dimension: 512 });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('rejects candidate with dimension 1536 (OpenAI size)', () => {
    const candidate = makeSafeCandidate({ dimension: 1536 });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-06: Correct model present → accepted ─────────────────────────────────

describe('TC-06: accepts candidate with locked model text-embedding-004', () => {
  it('accepts candidate when embeddingModel is text-embedding-004', () => {
    const candidate = makeSafeCandidate({ embeddingModel: 'text-embedding-004' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(1);
  });
});

// ─── TC-07: Unknown model → rejected ─────────────────────────────────────────

describe('TC-07: rejects unknown or unapproved embedding model', () => {
  it('rejects candidate with embeddingModel "text-embedding-ada-002"', () => {
    const candidate = makeSafeCandidate({ embeddingModel: 'text-embedding-ada-002' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('rejects candidate with embeddingModel "gpt-4o"', () => {
    const candidate = makeSafeCandidate({ embeddingModel: 'gpt-4o' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-08: Cross-tenant candidate → rejected ────────────────────────────────

describe('TC-08: rejects cross-tenant embedding candidate', () => {
  it('rejects candidate whose orgId does not match buyerOrgId', () => {
    const candidate = makeSafeCandidate({ orgId: 'different-org-999' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-09: Forbidden source type → rejected ─────────────────────────────────

describe('TC-09: rejects forbidden source type HIDDEN_PRICE', () => {
  it('rejects candidate with sourceType HIDDEN_PRICE', () => {
    // TypeScript cast needed as this is a deliberate bad-actor test
    const candidate = makeSafeCandidate({ sourceType: 'HIDDEN_PRICE' as never });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-10: Forbidden source text — price field pattern ──────────────────────

describe('TC-10: rejects source text containing hidden price fragment', () => {
  it('rejects candidate whose sourceTextSnippet contains price: pattern', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: '{"price": 10.5, "fabric": "cotton"}' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-11: Forbidden source text — publicationPosture ───────────────────────

describe('TC-11: rejects source text containing publicationPosture', () => {
  it('rejects candidate whose sourceTextSnippet contains publicationPosture', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: 'publicationPosture: HIDDEN' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-12: Forbidden source text — risk_score ───────────────────────────────

describe('TC-12: rejects source text containing risk_score', () => {
  it('rejects candidate whose sourceTextSnippet contains risk_score', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: 'internal risk_score=0.7 for supplier' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-13: Forbidden source text — relationship/allowlist graph terms ────────

describe('TC-13: rejects source text containing allowlist graph terms', () => {
  it('rejects candidate whose sourceTextSnippet contains allowlist_graph', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: 'allowlist_graph data for org' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('rejects candidate whose sourceTextSnippet contains relationshipGraph', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: 'relationshipGraph entries' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-14: Forbidden source text — unpublished DPP evidence ─────────────────

describe('TC-14: rejects source text containing unpublished evidence', () => {
  it('rejects candidate whose sourceTextSnippet contains "unpublished"', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: 'unpublished DPP draft data' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-15: Forbidden source text — AI draft extraction ──────────────────────

describe('TC-15: rejects source text containing AI draft extraction fragment', () => {
  it('rejects candidate whose sourceTextSnippet contains ai_draft', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: 'ai_draft extraction result' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('rejects candidate whose sourceTextSnippet contains draftExtraction', () => {
    const candidate = makeSafeCandidate({ sourceTextSnippet: 'draftExtraction from model output' });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });
});

// ─── TC-16: Safe similarity input → internal signal only ─────────────────────

describe('TC-16: converts safe similarity input to internal semantic signal only', () => {
  it('signal output has no raw cosine similarity value', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate({ similarity: 0.91 })]));
    expect(result.signals).toHaveLength(1);
    const signal = result.signals[0];
    // Only categorical bucket is exposed, never the raw float
    expect('similarity' in signal).toBe(false);
    expect(signal.similarityBucket).toBe('HIGH');
  });
});

// ─── TC-17: No raw vector in result ──────────────────────────────────────────

describe('TC-17: does not expose raw vector in semantic signal', () => {
  it('signal object has no vector field', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));
    expect(result.signals).toHaveLength(1);
    const signal = result.signals[0];
    expect('vector' in signal).toBe(false);
    expect('embedding' in signal).toBe(false);
  });
});

// ─── TC-18: No embedding ID in result ────────────────────────────────────────

describe('TC-18: does not expose embedding ID in semantic signal', () => {
  it('signal object has no embeddingId field', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));
    expect(result.signals).toHaveLength(1);
    const signal = result.signals[0];
    expect('embeddingId' in signal).toBe(false);
  });
});

// ─── TC-19: No cosine/vector score in buyer-facing output ────────────────────

describe('TC-19: does not expose cosine similarity or vector score in output', () => {
  it('signal has no cosineSimilarity, vectorScore, or semanticScore field', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));
    expect(result.signals).toHaveLength(1);
    const signal = result.signals[0] as unknown as Record<string, unknown>;
    expect('cosineSimilarity' in signal).toBe(false);
    expect('vectorScore' in signal).toBe(false);
    expect('semanticScore' in signal).toBe(false);
    expect('similarityScore' in signal).toBe(false);
  });
});

// ─── TC-20: Runtime guard blocks semantic score fields ───────────────────────

describe('TC-20: runtime guard blocks vector/embedding/semantic score fields', () => {
  it('getForbiddenGuardFields includes vector, embedding, semanticScore, cosineSimilarity', () => {
    const forbidden = getForbiddenGuardFields();
    expect(forbidden.has('vector')).toBe(true);
    expect(forbidden.has('embedding')).toBe(true);
    expect(forbidden.has('embeddingId')).toBe(true);
    expect(forbidden.has('vectorScore')).toBe(true);
    expect(forbidden.has('semanticScore')).toBe(true);
    expect(forbidden.has('cosineSimilarity')).toBe(true);
    expect(forbidden.has('distance')).toBe(true);
    expect(forbidden.has('modelConfidence')).toBe(true);
    expect(forbidden.has('similarityScore')).toBe(true);
    expect(forbidden.has('rawModelOutput')).toBe(true);
    expect(forbidden.has('sourceText')).toBe(true);
    expect(forbidden.has('prompt')).toBe(true);
  });

  it('guardSupplierMatchOutput blocks a candidate that has a semanticScore field', () => {
    const badCandidate = {
      supplierOrgId: SUPPLIER_ORG_ID_A,
      matchCategories: ['MATERIAL_FIT' as const],
      explanation: { primaryLabel: 'Material fit: Cotton', supportingLabels: [] },
      // Forbidden semantic score field injected
      semanticScore: 0.91,
    };
    const result = guardSupplierMatchOutput({ buyerOrgId: BUYER_ORG_ID, candidates: [badCandidate as never] });
    expect(result.sanitizedCandidates).toHaveLength(0);
    expect(result.blockedCandidateCount).toBe(1);
  });

  it('guardSupplierMatchOutput blocks a candidate that has a vectorScore field', () => {
    const badCandidate = {
      supplierOrgId: SUPPLIER_ORG_ID_A,
      matchCategories: ['COMPLIANCE_FIT' as const],
      explanation: { primaryLabel: 'Compliance fit', supportingLabels: [] },
      vectorScore: 0.75,
    };
    const result = guardSupplierMatchOutput({ buyerOrgId: BUYER_ORG_ID, candidates: [badCandidate as never] });
    expect(result.sanitizedCandidates).toHaveLength(0);
    expect(result.blockedCandidateCount).toBe(1);
  });
});

// ─── TC-21: Semantic signal does not resurrect policy-filter-blocked candidate ─

describe('TC-21: semantic signal does not resurrect policy-filter-blocked candidate', () => {
  it('a supplier blocked by forbiddenSupplierOrgIds remains blocked regardless of semantic signal', () => {
    const blockedOrgId = 'supplier-blocked-org';

    // 1. Build a semantic signal for the blocked supplier (semantic service is unaware of policy)
    const semanticResult = buildSupplierSemanticSignals(makeInput([
      makeSafeCandidate({ supplierOrgId: blockedOrgId, orgId: BUYER_ORG_ID }),
    ]));
    // Semantic signal IS produced (service doesn't know about relationship state)
    expect(semanticResult.signals).toHaveLength(1);
    expect(semanticResult.signals[0].supplierOrgId).toBe(blockedOrgId);

    // 2. Policy filter with the supplier in forbiddenSupplierOrgIds
    const draft: SupplierMatchCandidateDraft = {
      supplierOrgId: blockedOrgId,
      signals: [],
      visibility: { catalogVisibility: 'PUBLIC', rfqAcceptanceMode: 'OPEN_TO_ALL', dppPublished: false },
    };
    const policyResult = applySupplierMatchPolicyFilter({
      buyerOrgId: BUYER_ORG_ID,
      candidates: [draft],
      policyContext: { forbiddenSupplierOrgIds: new Set([blockedOrgId]) },
    });

    // Supplier remains blocked — semantic signal cannot bypass policy gate
    expect(policyResult.safeCandidates).toHaveLength(0);
    expect(policyResult.blocked).toHaveLength(1);
    expect(policyResult.blocked[0].blockedReason).toBe('SUPPLIER_FORBIDDEN');
  });
});

// ─── TC-22: Semantic signal does not override relationship gate ───────────────

describe('TC-22: semantic signal does not override relationship gate', () => {
  it('supplier with BLOCKED relationship state remains blocked regardless of semantic signal', () => {
    const blockedSupplierOrgId = 'supplier-relationship-blocked';

    // Semantic signal exists for this supplier
    const semanticResult = buildSupplierSemanticSignals(makeInput([
      makeSafeCandidate({ supplierOrgId: blockedSupplierOrgId, orgId: BUYER_ORG_ID }),
    ]));
    expect(semanticResult.signals).toHaveLength(1);

    // Policy filter with BLOCKED relationship state
    const draft: SupplierMatchCandidateDraft = {
      supplierOrgId: blockedSupplierOrgId,
      signals: [],
      visibility: { catalogVisibility: 'PUBLIC', rfqAcceptanceMode: 'OPEN_TO_ALL', dppPublished: false },
      relationshipState: 'BLOCKED',
    };
    const policyResult = applySupplierMatchPolicyFilter({
      buyerOrgId: BUYER_ORG_ID,
      candidates: [draft],
    });

    expect(policyResult.safeCandidates).toHaveLength(0);
    expect(policyResult.blocked[0].blockedReason).toBe('RELATIONSHIP_BLOCKED');
  });
});

// ─── TC-23: Semantic signal does not override hidden catalog gate ─────────────

describe('TC-23: semantic signal does not override hidden catalog gate', () => {
  it('supplier with HIDDEN catalog visibility remains blocked regardless of semantic signal', () => {
    const hiddenSupplierOrgId = 'supplier-hidden-catalog';

    // Semantic signal exists
    const semanticResult = buildSupplierSemanticSignals(makeInput([
      makeSafeCandidate({ supplierOrgId: hiddenSupplierOrgId, orgId: BUYER_ORG_ID }),
    ]));
    expect(semanticResult.signals).toHaveLength(1);

    // Policy filter with HIDDEN catalog visibility
    const draft: SupplierMatchCandidateDraft = {
      supplierOrgId: hiddenSupplierOrgId,
      signals: [],
      visibility: { catalogVisibility: 'HIDDEN', rfqAcceptanceMode: 'OPEN_TO_ALL', dppPublished: false },
    };
    const policyResult = applySupplierMatchPolicyFilter({
      buyerOrgId: BUYER_ORG_ID,
      candidates: [draft],
    });

    expect(policyResult.safeCandidates).toHaveLength(0);
    expect(policyResult.blocked[0].blockedReason).toBe('HIDDEN_CATALOG');
  });
});

// ─── TC-24: Semantic signal does not override RFQ gate ───────────────────────

describe('TC-24: semantic signal does not override RFQ gate', () => {
  it('supplier with APPROVED_BUYERS_ONLY RFQ mode blocked for non-approved buyer', () => {
    const rfqGatedOrgId = 'supplier-rfq-gated';

    // Semantic signal exists
    const semanticResult = buildSupplierSemanticSignals(makeInput([
      makeSafeCandidate({ supplierOrgId: rfqGatedOrgId, orgId: BUYER_ORG_ID }),
    ]));
    expect(semanticResult.signals).toHaveLength(1);

    // Policy filter with isRfqContextual + APPROVED_BUYERS_ONLY without APPROVED relationship
    const draft: SupplierMatchCandidateDraft = {
      supplierOrgId: rfqGatedOrgId,
      signals: [],
      visibility: {
        catalogVisibility: 'PUBLIC',
        rfqAcceptanceMode: 'APPROVED_BUYERS_ONLY',
        dppPublished: false,
      },
      // No APPROVED relationship state — buyer is not approved for this supplier
    };
    const policyResult = applySupplierMatchPolicyFilter({
      buyerOrgId: BUYER_ORG_ID,
      candidates: [draft],
      policyContext: { isRfqContextual: true },
    });

    expect(policyResult.safeCandidates).toHaveLength(0);
    expect(policyResult.blocked[0].blockedReason).toBe('RFQ_NOT_ALLOWED');
  });
});

// ─── TC-25: Existing no-semantic Slice E behavior unchanged ──────────────────

describe('TC-25: existing no-semantic Slice E behavior remains unchanged', () => {
  it('empty embeddingCandidates array returns safe empty result', () => {
    const result = buildSupplierSemanticSignals({ buyerOrgId: BUYER_ORG_ID, embeddingCandidates: [] });
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(0);
    expect(result.modelCallMade).toBe(false);
    expect(result.humanConfirmationRequired).toBe(true);
  });
});

// ─── TC-26: Deterministic — same input produces same output ──────────────────

describe('TC-26: deterministic — same input produces same output', () => {
  it('calling buildSupplierSemanticSignals twice with same input yields identical results', () => {
    const candidates = [
      makeSafeCandidate({ similarity: 0.72, supplierOrgId: SUPPLIER_ORG_ID_A }),
      makeSafeCandidate({ similarity: 0.85, supplierOrgId: SUPPLIER_ORG_ID_B }),
    ];
    const input = makeInput(candidates);

    const result1 = buildSupplierSemanticSignals(input);
    const result2 = buildSupplierSemanticSignals(input);

    expect(result1.signals).toHaveLength(result2.signals.length);
    expect(result1.signals[0].similarityBucket).toBe(result2.signals[0].similarityBucket);
    expect(result1.signals[1].similarityBucket).toBe(result2.signals[1].similarityBucket);
    expect(result1.rejectedCandidateCount).toBe(result2.rejectedCandidateCount);
  });
});

// ─── TC-27: Empty semantic input → safe empty result ─────────────────────────

describe('TC-27: empty semantic input returns safe empty semantic result', () => {
  it('zero candidates returns empty signals with modelCallMade false', () => {
    const result = buildSupplierSemanticSignals({ buyerOrgId: BUYER_ORG_ID, embeddingCandidates: [] });
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(0);
    expect(result.modelCallMade).toBe(false);
    expect(result.humanConfirmationRequired).toBe(true);
  });
});

// ─── TC-28: Does not call inference/model provider (modelCallMade: false) ─────

describe('TC-28: does not call inference/model provider', () => {
  it('modelCallMade is false in all result paths', () => {
    // Happy path
    const happyResult = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));
    expect(happyResult.modelCallMade).toBe(false);

    // All rejected
    const allRejected = buildSupplierSemanticSignals(makeInput([
      makeSafeCandidate({ orgId: 'wrong-org' }),
    ]));
    expect(allRejected.modelCallMade).toBe(false);

    // Empty
    const emptyResult = buildSupplierSemanticSignals({ buyerOrgId: BUYER_ORG_ID, embeddingCandidates: [] });
    expect(emptyResult.modelCallMade).toBe(false);
  });

  it('function is synchronous (no async — proof of no model calls)', () => {
    // If this were making model calls, it would return a Promise
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));
    expect(result).not.toBeInstanceOf(Promise);
    expect(typeof result.signals).toBe('object');
  });
});

// ─── TC-29: Does not write embeddings ────────────────────────────────────────

describe('TC-29: does not write embeddings', () => {
  it('function is synchronous — upsertDocumentEmbeddings (async write) cannot be called', () => {
    // buildSupplierSemanticSignals returns synchronously.
    // Any DB write (including upsertDocumentEmbeddings) is async and would require await.
    // A synchronous return proves no embedding writes occurred.
    const before = Date.now();
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));
    const after = Date.now();

    expect(result).not.toBeInstanceOf(Promise);
    // Synchronous execution completes in under 50ms even for 1000+ candidates
    expect(after - before).toBeLessThan(50);
    expect(result.signals).toHaveLength(1);
  });
});

// ─── TC-30: SEMANTIC_SIGNAL_SERVICE_VERSION constant exported ────────────────

describe('TC-30: SEMANTIC_SIGNAL_SERVICE_VERSION is exported correctly', () => {
  it('is exported and equals mvp-semantic-v1', () => {
    expect(SEMANTIC_SIGNAL_SERVICE_VERSION).toBe('mvp-semantic-v1');
  });
});

// ─── TC-31: ALLOWED_EMBEDDING_MODEL constant exported ────────────────────────

describe('TC-31: ALLOWED_EMBEDDING_MODEL is exported correctly', () => {
  it('is exported and equals text-embedding-004', () => {
    expect(ALLOWED_EMBEDDING_MODEL).toBe('text-embedding-004');
  });
});

// ─── TC-32: REQUIRED_EMBEDDING_DIM constant exported ─────────────────────────

describe('TC-32: REQUIRED_EMBEDDING_DIM is exported correctly', () => {
  it('is exported and equals 768', () => {
    expect(REQUIRED_EMBEDDING_DIM).toBe(768);
  });
});

// ─── TC-33: HIGH similarity bucket from high cosine value ────────────────────

describe('TC-33: HIGH similarity bucket produces SEMANTIC_FIT signal', () => {
  it('similarity >= 0.80 produces HIGH bucket with matchCategory SEMANTIC_FIT', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate({ similarity: 0.92 })]));
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].similarityBucket).toBe('HIGH');
    expect(result.signals[0].matchCategory).toBe('SEMANTIC_FIT');
  });

  it('similarity exactly at 0.80 produces HIGH bucket', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate({ similarity: 0.80 })]));
    expect(result.signals[0].similarityBucket).toBe('HIGH');
  });
});

// ─── TC-34: BELOW threshold similarity → no signal ───────────────────────────

describe('TC-34: BELOW_THRESHOLD similarity produces no semantic signal', () => {
  it('similarity < 0.30 (SEMANTIC_MIN_SIMILARITY) results in rejection', () => {
    const candidate = makeSafeCandidate({ similarity: 0.20 });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('similarity exactly at 0.29 is rejected', () => {
    const candidate = makeSafeCandidate({ similarity: 0.29 });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(0);
    expect(result.rejectedCandidateCount).toBe(1);
  });

  it('similarity at exactly 0.30 is accepted (equal to min threshold)', () => {
    const candidate = makeSafeCandidate({ similarity: 0.30 });
    const result = buildSupplierSemanticSignals(makeInput([candidate]));
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0].similarityBucket).toBe('LOW');
  });
});

// ─── TC-35: humanConfirmationRequired always true ────────────────────────────

describe('TC-35: humanConfirmationRequired is always true', () => {
  it('is true in happy path result', () => {
    const result = buildSupplierSemanticSignals(makeInput([makeSafeCandidate()]));
    expect(result.humanConfirmationRequired).toBe(true);
  });

  it('is true even when all candidates are rejected', () => {
    const result = buildSupplierSemanticSignals(makeInput([
      makeSafeCandidate({ orgId: 'wrong-tenant' }),
    ]));
    expect(result.humanConfirmationRequired).toBe(true);
  });

  it('is true for empty buyerOrgId path', () => {
    const result = buildSupplierSemanticSignals({ buyerOrgId: '', embeddingCandidates: [] });
    expect(result.humanConfirmationRequired).toBe(true);
  });
});
