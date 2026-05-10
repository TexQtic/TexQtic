/**
 * networkCommerceService.ts — Tenant-plane Network Commerce pool service (FE-3)
 *
 * Provides pool owner/admin-facing methods for:
 * - Listing owned pools
 * - Creating new pools
 * - Viewing pool detail
 * - Opening/publishing pools
 * - Viewing pool membership status
 *
 * All endpoints enforce TENANT realm via tenantApiClient.
 * orgId is never sent by the client; backend derives it from JWT.
 *
 * FE-3 scope: Pool owner surfaces only.
 * Deferred: demand-line aggregation, RFQ issuance, supplier invites, supplier inbox
 */

import { tenantGet, tenantPost } from './tenantApiClient';

// ─── Response Types ───────────────────────────────────────────────────────────

export interface NetworkPoolLifecycleState {
  stateKey: string;
}

export interface NetworkPool {
  id: string;
  org_id: string;
  pool_ref: string;
  commodity_category: string;
  target_qty: string;
  qty_unit: string;
  lifecycle_state_id: string;
  lifecycle_state_key: string | null;
  open_at: string | null;
  close_at: string | null;
  allocated_at: string | null;
  settled_at: string | null;
  metadata: Record<string, unknown> | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnedPoolListItem {
  id: string;
  pool_ref: string;
  commodity_category: string;
  target_qty: string;
  qty_unit: string;
  lifecycle_state_id: string;
  lifecycle_state_key: string | null;
  open_at: string | null;
  close_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkPoolListPagination {
  limit: number;
  offset: number;
  count: number;
  total: number;
}

export interface NetworkPoolListResponse {
  data: OwnedPoolListItem[];
  pagination: NetworkPoolListPagination;
}

export interface NetworkPoolMembership {
  id: string;
  pool_id: string;
  org_id: string;
  declared_qty: string;
  qty_unit: string;
  allocated_qty: string | null;
  allocation_pct: string | null;
  status: string;
  joined_at: string;
  approved_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateNetworkPoolInput {
  pool_ref: string;
  commodity_category: string;
  target_qty: number;
  qty_unit: string;
  open_at?: string | null;
  close_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface OpenNetworkPoolInput {
  reason: string;
}

export interface NetworkPoolListParams {
  limit?: number;
  offset?: number;
  commodity_category?: string;
  lifecycle_state_key?: string;
  qty_unit?: string;
  open_from?: string;
  open_to?: string;
  close_from?: string;
  close_to?: string;
}

// ─── Query Params Helper ──────────────────────────────────────────────────────

function buildQueryString(params?: NetworkPoolListParams): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.offset != null) searchParams.set('offset', String(params.offset));
  if (params.commodity_category) searchParams.set('commodity_category', params.commodity_category);
  if (params.lifecycle_state_key) searchParams.set('lifecycle_state_key', params.lifecycle_state_key);
  if (params.qty_unit) searchParams.set('qty_unit', params.qty_unit);
  if (params.open_from) searchParams.set('open_from', params.open_from);
  if (params.open_to) searchParams.set('open_to', params.open_to);
  if (params.close_from) searchParams.set('close_from', params.close_from);
  if (params.close_to) searchParams.set('close_to', params.close_to);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ─── API Methods ──────────────────────────────────────────────────────────────

/**
 * List pools owned by the current tenant
 */
export async function listOwnedPools(
  params?: NetworkPoolListParams,
): Promise<NetworkPoolListResponse> {
  const qs = buildQueryString(params);
  const endpoint = `/api/tenant/network-commerce/pools${qs}`;
  return tenantGet<NetworkPoolListResponse>(endpoint);
}

/**
 * Create a new pool (starts in DRAFT state)
 */
export function createPool(input: CreateNetworkPoolInput): Promise<NetworkPool> {
  return tenantPost<NetworkPool>('/api/tenant/network-commerce/pools', input);
}

/**
 * Get detailed information about a specific pool (owner view)
 */
export function getPoolDetail(poolId: string): Promise<NetworkPool> {
  return tenantGet<NetworkPool>(`/api/tenant/network-commerce/pools/${poolId}`);
}

/**
 * Open/publish a pool (transition from DRAFT to OPEN)
 * Allows member declarations once opened.
 */
export function openPool(poolId: string, input: OpenNetworkPoolInput): Promise<NetworkPool> {
  return tenantPost<NetworkPool>(
    `/api/tenant/network-commerce/pools/${poolId}/open`,
    input,
  );
}

/**
 * Get membership status for the current tenant in a specific pool
 * (i.e., what the current tenant declared, allocated status, etc.)
 */
export function getPoolMembership(poolId: string): Promise<NetworkPoolMembership> {
  return tenantGet<NetworkPoolMembership>(
    `/api/tenant/network-commerce/pools/${poolId}/membership`,
  );
}
