import { get } from './apiClient';

// ── types ─────────────────────────────────────────────────────────────────────
// Mirror the server-side PublicB2CProjectionService response types (read-only
// public projection — no schema UUIDs, no private fields).

export interface PublicB2CProductPreviewItem {
  name: string;
  moq: number;
  price: string | null;
  imageUrl: string | null;
}

export interface PublicB2CStorefrontEntry {
  slug: string;
  legalName: string;
  orgType: string;
  jurisdiction: string;
  productsPreview: PublicB2CProductPreviewItem[];
  publicationPosture: 'B2C_PUBLIC' | 'BOTH';
  eligibilityPosture: 'PUBLICATION_ELIGIBLE';
}

export interface PublicB2CBrowseResponse {
  items: PublicB2CStorefrontEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicB2CBrowseParams {
  geo?: string;
  page?: number;
  limit?: number;
}

// ── fetch helper ──────────────────────────────────────────────────────────────

export async function getPublicB2CProducts(
  params: PublicB2CBrowseParams = {}
): Promise<PublicB2CBrowseResponse> {
  const query = new URLSearchParams();
  if (params.geo) query.append('geo', params.geo);
  if (params.page !== undefined) query.append('page', params.page.toString());
  if (params.limit !== undefined) query.append('limit', params.limit.toString());
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : '';
  return get<PublicB2CBrowseResponse>(`/api/public/b2c/products${suffix}`);
}
