import { tenantGet } from './tenantApiClient';

export interface AggregatorDiscoveryEntry {
  orgId: string;
  slug: string;
  legalName: string;
  orgType: string;
  jurisdiction: string;
  certificationCount: number;
  certificationTypes: string[];
  hasTraceabilityEvidence: boolean;
  visibilityIndicators: string[];
}

export interface AggregatorDiscoveryResponse {
  items: AggregatorDiscoveryEntry[];
  count: number;
}

export interface AggregatorDiscoveryQueryParams {
  limit?: number;
}

export async function getAggregatorDiscoveryEntries(
  params: AggregatorDiscoveryQueryParams = {}
): Promise<AggregatorDiscoveryResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/tenant/aggregator/discovery${queryString ? `?${queryString}` : ''}`;

  return tenantGet<AggregatorDiscoveryResponse>(endpoint);
}