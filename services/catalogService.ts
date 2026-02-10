/**
 * TexQtic Catalog Service
 *
 * Provides catalog operations:
 * - Fetch tenant catalog items with pagination
 * - Search catalog
 */

import { get } from './apiClient';

export interface CatalogItem {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogResponse {
  items: CatalogItem[];
  count: number;
  nextCursor: string | null;
}

export interface CatalogQueryParams {
  q?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Fetch catalog items with cursor-based pagination
 *
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated catalog items
 */
export async function getCatalogItems(params: CatalogQueryParams = {}): Promise<CatalogResponse> {
  const queryParams = new URLSearchParams();

  if (params.q) {
    queryParams.append('q', params.q);
  }

  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  const queryString = queryParams.toString();
  const queryPrefix = queryString ? '?' : '';
  const endpoint = `/api/tenant/catalog/items${queryPrefix}${queryString}`;

  return get<CatalogResponse>(endpoint);
}

/**
 * Search catalog items
 *
 * @param searchQuery - Search term (searches name and SKU)
 * @param limit - Max results per page
 * @returns Matching catalog items
 */
export async function searchCatalog(
  searchQuery: string,
  limit: number = 20
): Promise<CatalogResponse> {
  return getCatalogItems({ q: searchQuery, limit });
}
