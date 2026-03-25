/**
 * TexQtic Catalog Service
 *
 * Provides catalog operations:
 * - Fetch tenant catalog items with pagination
 * - Search catalog
 */

import { tenantGet, tenantPost } from './tenantApiClient';

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
  // Optional display properties
  imageUrl?: string;
  category?: string;
  moq?: number;
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

  return tenantGet<CatalogResponse>(endpoint);
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

// ==================== WRITE OPERATIONS ====================

export interface CreateCatalogItemRequest {
  name: string;
  sku?: string;
  imageUrl?: string;
  description?: string;
  price: number;
  moq?: number;
}

export interface CreateCatalogItemResponse {
  item: CatalogItem;
}

export interface CreateRfqRequest {
  catalogItemId: string;
  quantity?: number;
  buyerMessage?: string;
}

export interface CreateRfqResponse {
  rfq: BuyerRfqDetail;
}

export type BuyerRfqStatus = 'INITIATED' | 'OPEN' | 'RESPONDED' | 'CLOSED';

export interface BuyerRfqListItem {
  id: string;
  status: BuyerRfqStatus;
  org_id?: string;
  catalog_item_id: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  supplier_org_id: string;
  created_at: string;
  updated_at: string;
}

export interface BuyerRfqListResponse {
  rfqs: BuyerRfqListItem[];
  count: number;
}

export interface BuyerRfqSupplierResponse {
  id: string;
  supplier_org_id: string;
  message: string;
  submitted_at: string;
  created_at: string;
}

export interface BuyerRfqDetail {
  id: string;
  status: BuyerRfqStatus;
  org_id?: string;
  catalog_item_id: string;
  item_name: string;
  item_sku: string;
  quantity: number;
  supplier_org_id: string;
  created_at: string;
  updated_at: string;
  buyer_message: string | null;
  created_by_user_id: string;
  supplier_response: BuyerRfqSupplierResponse | null;
}

export interface BuyerRfqDetailResponse {
  rfq: BuyerRfqDetail;
}

/**
 * Create a catalog item (OWNER/ADMIN only)
 *
 * @param payload - Item fields (name, price required; sku, description, moq optional)
 * @returns Created catalog item
 */
export async function createCatalogItem(
  payload: CreateCatalogItemRequest
): Promise<CreateCatalogItemResponse> {
  return tenantPost<CreateCatalogItemResponse>('/api/tenant/catalog/items', payload);
}

/**
 * Submit a non-binding tenant RFQ initiation request for a catalog item.
 * The server derives tenant scope from the authenticated tenant context.
 */
export async function createRfq(
  payload: CreateRfqRequest
): Promise<CreateRfqResponse> {
  return tenantPost<CreateRfqResponse>('/api/tenant/rfqs', payload);
}

export async function getBuyerRfqs(): Promise<BuyerRfqListResponse> {
  return tenantGet<BuyerRfqListResponse>('/api/tenant/rfqs');
}

export async function getBuyerRfqDetail(rfqId: string): Promise<BuyerRfqDetailResponse> {
  return tenantGet<BuyerRfqDetailResponse>(`/api/tenant/rfqs/${rfqId}`);
}
