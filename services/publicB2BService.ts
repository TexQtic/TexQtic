import { get, post } from './apiClient';

export interface PublicB2BSupplierTaxonomy {
  primarySegment: string;
  secondarySegments: string[];
  rolePositions: string[];
}

export interface PublicB2BSupplierOfferingPreviewItem {
  name: string;
  moq: number;
  imageUrl: string;
}

export interface PublicB2BSupplierEntry {
  slug: string;
  legalName: string;
  orgType: string;
  jurisdiction: string;
  certificationCount: number;
  certificationTypes: string[];
  hasTraceabilityEvidence: boolean;
  taxonomy: PublicB2BSupplierTaxonomy | null;
  offeringPreview: PublicB2BSupplierOfferingPreviewItem[];
  publicationPosture: string;
  eligibilityPosture: string;
}

export interface PublicB2BSuppliersResponse {
  items: PublicB2BSupplierEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicB2BSuppliersParams {
  segment?: string;
  geo?: string;
  page?: number;
  limit?: number;
}

export async function getPublicB2BSuppliers(
  params: PublicB2BSuppliersParams = {}
): Promise<PublicB2BSuppliersResponse> {
  const query = new URLSearchParams();
  if (params.segment) query.append('segment', params.segment);
  if (params.geo) query.append('geo', params.geo);
  if (params.page !== undefined) query.append('page', params.page.toString());
  if (params.limit !== undefined) query.append('limit', params.limit.toString());
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : '';
  const endpoint = `/api/public/b2b/suppliers${suffix}`;
  return get<PublicB2BSuppliersResponse>(endpoint);
}

// ── ROUTE-001: Single supplier profile by slug ────────────────────────────────

/** Public-safe profile for a single supplier. Mirrors PublicB2BSupplierEntry exactly. */
export interface PublicB2BSupplierProfile {
  slug: string;
  legalName: string;
  orgType: string;
  jurisdiction: string;
  certificationCount: number;
  certificationTypes: string[];
  hasTraceabilityEvidence: boolean;
  taxonomy: PublicB2BSupplierTaxonomy | null;
  offeringPreview: PublicB2BSupplierOfferingPreviewItem[];
  publicationPosture: string;
  eligibilityPosture: string;
}

/**
 * Fetch a public supplier profile by slug.
 * Throws on network error or non-2xx response (handled by apiClient).
 * Callers should handle 404 (supplier not found / not publication-eligible).
 *
 * ROUTE-001 / GAP-ACQ-001
 * QR-SOURCE-002: optional source attribution param forwarded as ?source= to the backend.
 */
export async function getPublicSupplierBySlug(
  slug: string,
  source?: string,
): Promise<PublicB2BSupplierProfile> {
  const base = `/api/public/supplier/${encodeURIComponent(slug)}`;
  const url = source ? `${base}?source=${encodeURIComponent(source)}` : base;
  return get<PublicB2BSupplierProfile>(url);
}

// ── INQUIRY-004 Phase 2: Pre-auth buyer inquiry submission ───────────────────
// Phase 2: supplier_slug is optional; new context fields added.
// Phase 1 callers passing supplier_slug remain backward-compatible.
// Implementation: PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001

export type PublicInquiryCategory =
  | 'GENERAL'
  | 'CAPABILITY_FIT'
  | 'OFFERING_PREVIEW'
  | 'SOURCING_INTENT'
  | 'QUALIFICATION_CHECK';

export type PublicInquirySourceSurface =
  | 'GENERAL_PUBLIC'
  | 'SUPPLIER_PROFILE'
  | 'PRODUCT_DETAIL'
  | 'PRODUCT_BROWSE'
  | 'CATEGORY_STORY'
  | 'COLLECTION_DETAIL'
  | 'COLLECTION_LIST'
  | 'TRUST_LANDING'
  | 'INDUSTRY_LANDING'
  | 'NAVBAR'
  | 'DIRECT'
  | 'UNKNOWN';

export interface PublicInquirySubmitParams {
  inquiry_category: PublicInquiryCategory;
  supplier_slug?: string;
  source_surface?: PublicInquirySourceSurface;
  product_slug?: string;
  category_slug?: string;
  collection_slug?: string;
  geo_band?: string;
  volume_band?: string;
  message?: string;
}

export interface PublicInquirySubmitResponse {
  acknowledged: boolean;
  message: string;
}

/**
 * Submit a pre-authentication buyer inquiry.
 * Phase 2: supplier_slug is optional; supports general and multi-context modes.
 * No auth required. Returns 202 Accepted on success.
 * Throws on network error or non-2xx response (handled by apiClient).
 *
 * INQUIRY-004 / PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001
 */
export async function submitPublicInquiry(
  params: PublicInquirySubmitParams,
): Promise<PublicInquirySubmitResponse> {
  return post<PublicInquirySubmitResponse>('/api/public/inquiry/submit', params);
}
