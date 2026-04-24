/**
 * TexQtic Catalog Service
 *
 * Provides catalog operations:
 * - Fetch tenant catalog items with pagination
 * - Search catalog
 */

import { tenantDelete, tenantGet, tenantPatch, tenantPost } from './tenantApiClient';

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
  /**
   * @deprecated Phantom client-side field. No DB column exists for category on catalog_items.
   * Retained for backward compatibility with WL surfaces that derive grouping from this field.
   * Do not rely on this field in new code — it is always undefined at runtime.
   */
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

export interface UpdateCatalogItemRequest {
  name?: string;
  sku?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  price?: number;
  moq?: number;
  active?: boolean;
}

export interface UpdateCatalogItemResponse {
  item: CatalogItem;
}

export interface DeleteCatalogItemResponse {
  id: string;
  deleted: boolean;
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

export interface BuyerRfqTradeContinuity {
  trade_id: string;
  trade_reference: string;
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
  item_unit_price: number;
  buyer_message: string | null;
  created_by_user_id: string;
  supplier_response: BuyerRfqSupplierResponse | null;
  trade_continuity: BuyerRfqTradeContinuity | null;
}

export interface BuyerRfqDetailResponse {
  rfq: BuyerRfqDetail;
}

export interface SupplierRfqListItem {
  id: string;
  status: BuyerRfqStatus;
  catalog_item_id: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierRfqListResponse {
  rfqs: SupplierRfqListItem[];
  count: number;
}

export interface SupplierRfqDetail {
  id: string;
  status: BuyerRfqStatus;
  catalog_item_id: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  buyer_message: string | null;
}

export interface SupplierRfqDetailResponse {
  rfq: SupplierRfqDetail;
}

export interface SupplierRfqResponse {
  id: string;
  rfq_id: string;
  supplier_org_id: string;
  message: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
}

export interface SubmitSupplierRfqResponseRequest {
  message: string;
}

export interface SubmitSupplierRfqResponseResult {
  response: SupplierRfqResponse;
  rfq: {
    id: string;
    status: BuyerRfqStatus;
  };
  non_binding: boolean;
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

export async function updateCatalogItem(
  itemId: string,
  payload: UpdateCatalogItemRequest
): Promise<UpdateCatalogItemResponse> {
  return tenantPatch<UpdateCatalogItemResponse>(`/api/tenant/catalog/items/${itemId}`, payload);
}

export async function deleteCatalogItem(itemId: string): Promise<DeleteCatalogItemResponse> {
  return tenantDelete<DeleteCatalogItemResponse>(`/api/tenant/catalog/items/${itemId}`);
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

export async function getSupplierRfqInbox(): Promise<SupplierRfqListResponse> {
  return tenantGet<SupplierRfqListResponse>('/api/tenant/rfqs/inbox');
}

export async function getSupplierRfqDetail(rfqId: string): Promise<SupplierRfqDetailResponse> {
  return tenantGet<SupplierRfqDetailResponse>(`/api/tenant/rfqs/inbox/${rfqId}`);
}

export async function submitSupplierRfqResponse(
  rfqId: string,
  payload: SubmitSupplierRfqResponseRequest
): Promise<SubmitSupplierRfqResponseResult> {
  return tenantPost<SubmitSupplierRfqResponseResult>(`/api/tenant/rfqs/inbox/${rfqId}/respond`, payload);
}

// ==================== BUYER CATALOG BROWSE (TECS-B2B-BUYER-CATALOG-BROWSE-001) ====================

/**
 * A single catalog item as visible to an authenticated B2B buyer.
 * Phase 1: id, name, sku, description, moq, imageUrl only — NO price.
 */
export interface BuyerCatalogItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  moq: number;
  imageUrl: string | null;
}

export interface BuyerCatalogResponse {
  items: BuyerCatalogItem[];
  count: number;
  nextCursor: string | null;
}

export interface BuyerCatalogQueryParams {
  limit?: number;
  cursor?: string;
  q?: string;
}

/**
 * Fetch active catalog items for a given supplier org (authenticated B2B buyer browse).
 * The supplier org must be publication-eligible (Gate 1 enforced server-side).
 * Price is intentionally absent from Phase 1 response.
 */
export async function getBuyerCatalogItems(
  supplierOrgId: string,
  params: BuyerCatalogQueryParams = {}
): Promise<BuyerCatalogResponse> {
  const queryParams = new URLSearchParams();

  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  if (params.q && params.q.trim().length > 0) {
    queryParams.append('q', params.q.trim());
  }

  const queryString = queryParams.toString();
  const queryPrefix = queryString ? '?' : '';
  const endpoint = `/api/tenant/catalog/supplier/${encodeURIComponent(supplierOrgId)}/items${queryPrefix}${queryString}`;

  return tenantGet<BuyerCatalogResponse>(endpoint);
}

// ==================== BUYER SUPPLIER PICKER (TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001) ====================

/**
 * A single eligible supplier entry as returned to an authenticated B2B buyer.
 * Phase 2: id (UUID), slug, legalName, primarySegment only — NO price, NO item details.
 */
export interface SupplierPickerEntry {
  id: string;
  slug: string;
  legalName: string;
  primarySegment: string | null;
}

export interface EligibleSuppliersResponse {
  items: SupplierPickerEntry[];
  total: number;
}

/**
 * Fetch eligible B2B suppliers for the authenticated buyer supplier picker.
 * Returns only suppliers that pass both eligibility gates server-side.
 */
export async function getEligibleSuppliers(): Promise<EligibleSuppliersResponse> {
  return tenantGet<EligibleSuppliersResponse>('/api/tenant/b2b/eligible-suppliers');
}
