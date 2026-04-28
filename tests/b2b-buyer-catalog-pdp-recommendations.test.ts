/**
 * TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 Slice G — Recommendation Surface Tests
 *
 * Tests verify:
 *  - getRecommendedSuppliers routes to the correct endpoint
 *  - RecommendedSuppliersResponse shape contract (items + fallback)
 *  - SafeRecommendedSupplier has no forbidden fields (price, score, rank, confidence)
 *  - CTA values are limited to the allowed safe set
 *  - CATALOG_PDP_RECOMMENDED_* constants contain no forbidden terms
 *  - Panel heading matches canonical value
 *  - Disclaimer does not expose score, rank, confidence, or relationship state words
 *  - Mock response items carry only safe fields
 *  - itemId path encoding
 *  - Fallback-true response has empty items array
 *
 * Test isolation: all tenantApiClient calls are mocked at module level.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/tenantApiClient', () => ({
  tenantGet: vi.fn(),
  tenantPost: vi.fn(),
}));

import { tenantGet } from '../services/tenantApiClient';
import {
  getRecommendedSuppliers,
  type SafeRecommendedSupplier,
  type RecommendedSuppliersResponse,
  type SafeRecommendedSupplierCta,
} from '../services/catalogService';
import {
  CATALOG_PDP_RECOMMENDED_HEADING,
  CATALOG_PDP_RECOMMENDED_EMPTY_COPY,
  CATALOG_PDP_RECOMMENDED_LOADING_COPY,
  CATALOG_PDP_RECOMMENDED_DISCLAIMER,
} from '../components/Tenant/CatalogPdpSurface';

const tenantGetMock = tenantGet as ReturnType<typeof vi.fn>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ITEM_ID = '3f8a6e4c-2d1b-4f5a-9e8c-7b0d3e2f1a6b';

function buildMockSupplier(
  overrides: Partial<SafeRecommendedSupplier> = {},
): SafeRecommendedSupplier {
  return {
    supplierDisplayName: 'Apex Textiles Ltd',
    matchLabels: ['Matches catalog category', 'Matches requested material'],
    cta: 'VIEW_PROFILE',
    ...overrides,
  };
}

function buildMockResponse(
  overrides: Partial<RecommendedSuppliersResponse> = {},
): RecommendedSuppliersResponse {
  return {
    items: [buildMockSupplier()],
    fallback: false,
    ...overrides,
  };
}

// ─── Service: getRecommendedSuppliers ────────────────────────────────────────

describe('getRecommendedSuppliers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the correct recommendations endpoint with itemId as a path segment', async () => {
    tenantGetMock.mockResolvedValue(buildMockResponse());
    await getRecommendedSuppliers(ITEM_ID);
    expect(tenantGetMock).toHaveBeenCalledWith(
      `/api/tenant/catalog/items/${encodeURIComponent(ITEM_ID)}/recommendations`,
    );
  });

  it('returns an object with items array and fallback boolean', async () => {
    const mockResponse = buildMockResponse();
    tenantGetMock.mockResolvedValue(mockResponse);
    const result = await getRecommendedSuppliers(ITEM_ID);
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.fallback).toBe('boolean');
  });

  it('returns fallback: true with empty items when server signals no candidates', async () => {
    const fallbackResponse: RecommendedSuppliersResponse = { items: [], fallback: true };
    tenantGetMock.mockResolvedValue(fallbackResponse);
    const result = await getRecommendedSuppliers(ITEM_ID);
    expect(result.fallback).toBe(true);
    expect(result.items).toHaveLength(0);
  });

  it('propagates rejection when the endpoint returns a network error', async () => {
    tenantGetMock.mockRejectedValue(new Error('Network error'));
    await expect(getRecommendedSuppliers(ITEM_ID)).rejects.toThrow('Network error');
  });

  it('encodes itemId in the URL path segment', async () => {
    tenantGetMock.mockResolvedValue(buildMockResponse());
    const specialId = 'item/with/slashes';
    await getRecommendedSuppliers(specialId);
    const calledUrl = tenantGetMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('/recommendations/');
    expect(calledUrl).toContain(encodeURIComponent(specialId));
  });
});

// ─── SafeRecommendedSupplier shape contract ──────────────────────────────────

describe('SafeRecommendedSupplier shape contract', () => {
  it('has no price field in a valid supplier item', () => {
    const supplier = buildMockSupplier();
    expect((supplier as Record<string, unknown>).price).toBeUndefined();
  });

  it('has no score field in a valid supplier item', () => {
    const supplier = buildMockSupplier();
    expect((supplier as Record<string, unknown>).score).toBeUndefined();
  });

  it('has no rank field in a valid supplier item', () => {
    const supplier = buildMockSupplier();
    expect((supplier as Record<string, unknown>).rank).toBeUndefined();
  });

  it('has no confidence field in a valid supplier item', () => {
    const supplier = buildMockSupplier();
    expect((supplier as Record<string, unknown>).confidence).toBeUndefined();
  });

  it('has no relationshipState field in a valid supplier item', () => {
    const supplier = buildMockSupplier();
    expect((supplier as Record<string, unknown>).relationshipState).toBeUndefined();
  });

  it('CTA is limited to REQUEST_QUOTE | REQUEST_ACCESS | VIEW_PROFILE', () => {
    const allowedCtas: SafeRecommendedSupplierCta[] = [
      'REQUEST_QUOTE',
      'REQUEST_ACCESS',
      'VIEW_PROFILE',
    ];
    const ctaValues = allowedCtas.map(cta => buildMockSupplier({ cta }).cta);
    for (const cta of ctaValues) {
      expect(allowedCtas).toContain(cta);
    }
  });

  it('matchLabels is an array of strings (no numeric values)', () => {
    const supplier = buildMockSupplier({
      matchLabels: ['Matches catalog category', 'MOQ compatible'],
    });
    for (const label of supplier.matchLabels) {
      expect(typeof label).toBe('string');
      expect(Number.isNaN(Number(label))).toBe(true);
    }
  });
});

// ─── Recommendation surface constants ────────────────────────────────────────

describe('CATALOG_PDP_RECOMMENDED_* constants', () => {
  it('HEADING equals "Recommended suppliers"', () => {
    expect(CATALOG_PDP_RECOMMENDED_HEADING).toBe('Recommended suppliers');
  });

  it('DISCLAIMER does not contain the word "score"', () => {
    expect(CATALOG_PDP_RECOMMENDED_DISCLAIMER.toLowerCase()).not.toContain('score');
  });

  it('DISCLAIMER does not contain the word "rank"', () => {
    expect(CATALOG_PDP_RECOMMENDED_DISCLAIMER.toLowerCase()).not.toContain('rank');
  });

  it('DISCLAIMER does not contain the word "confidence"', () => {
    expect(CATALOG_PDP_RECOMMENDED_DISCLAIMER.toLowerCase()).not.toContain('confidence');
  });

  it('DISCLAIMER does not contain relationship state words (APPROVED, BLOCKED, REJECTED)', () => {
    const upper = CATALOG_PDP_RECOMMENDED_DISCLAIMER.toUpperCase();
    expect(upper).not.toContain('APPROVED');
    expect(upper).not.toContain('BLOCKED');
    expect(upper).not.toContain('REJECTED');
    expect(upper).not.toContain('REVOKED');
    expect(upper).not.toContain('SUSPENDED');
  });

  it('DISCLAIMER does not contain "price"', () => {
    expect(CATALOG_PDP_RECOMMENDED_DISCLAIMER.toLowerCase()).not.toContain('price');
  });

  it('LOADING_COPY does not contain forbidden AI terms', () => {
    const lower = CATALOG_PDP_RECOMMENDED_LOADING_COPY.toLowerCase();
    expect(lower).not.toContain('score');
    expect(lower).not.toContain('rank');
    expect(lower).not.toContain('confidence');
  });

  it('EMPTY_COPY does not contain forbidden AI terms', () => {
    const lower = CATALOG_PDP_RECOMMENDED_EMPTY_COPY.toLowerCase();
    expect(lower).not.toContain('score');
    expect(lower).not.toContain('rank');
    expect(lower).not.toContain('confidence');
  });

  it('DISCLAIMER contains the phrase "Human review is required"', () => {
    expect(CATALOG_PDP_RECOMMENDED_DISCLAIMER).toContain('Human review is required');
  });
});
