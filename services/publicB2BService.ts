import { get } from './apiClient';

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
