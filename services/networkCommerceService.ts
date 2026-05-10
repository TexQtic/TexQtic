/**
 * networkCommerceService.ts — Tenant-plane Network Commerce pool service (FE-3, extended FE-4)
 *
 * Provides pool owner/admin-facing and member-facing methods for:
 * - Listing owned pools (owner view)
 * - Listing joined pools (member view)
 * - Creating new pools
 * - Viewing pool detail
 * - Opening/publishing pools
 * - Joining a pool as a member
 * - Viewing pool membership status
 * - Managing demand lines (create, update, cancel, list)
 * - Locking demand lines for RFQ (owner/admin only)
 *
 * All endpoints enforce TENANT realm via tenantApiClient.
 * orgId is never sent by the client; backend derives it from JWT.
 *
 * FE-3 scope: Pool owner surfaces.
 * FE-4 scope: Pool member surfaces + demand-line management.
 * FE-5 scope: RFQ issue panel and RFQ issue API call.
 * FE-6 scope: owner supplier-invite APIs (send/list/get/cancel).
 * Deferred: supplier inbox
 */

import { tenantGet, tenantPost, tenantPatch } from './tenantApiClient';

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

// ─── FE-4 Member/Demand Line Methods ──────────────────────────────────────────

/**
 * List pools the current tenant has joined (member view)
 */
export async function listJoinedPools(
  params?: NetworkPoolListParams,
): Promise<NetworkPoolListResponse> {
  const qs = buildQueryString(params);
  const endpoint = `/api/tenant/network-commerce/pools/joined${qs}`;
  return tenantGet<NetworkPoolListResponse>(endpoint);
}

/**
 * Join an existing pool (current tenant becomes a member)
 * Requires pool to be in OPEN state
 */
export interface JoinPoolInput {
  declared_qty: number;
  qty_unit: string;
}

export function joinPool(poolId: string, input: JoinPoolInput): Promise<NetworkPoolMembership> {
  return tenantPost<NetworkPoolMembership>(
    `/api/tenant/network-commerce/pools/${poolId}/join`,
    input,
  );
}

// ─── Demand Line Types ────────────────────────────────────────────────────────

/**
 * Demand line record returned by backend
 */
export interface NetworkPoolDemandLine {
  id: string;
  owner_org_id: string;
  pool_id: string;
  line_ref: string;
  commodity_category: string;
  product_category: string | null;
  product_spec_summary: string | null;
  qty: string;
  qty_unit: string;
  quality_requirements_json: Record<string, unknown> | null;
  certification_requirements_json: Record<string, unknown> | null;
  packaging_requirements_json: Record<string, unknown> | null;
  delivery_location: string | null;
  delivery_window_start: string | null;
  delivery_window_end: string | null;
  tolerance_pct: string | null;
  priority: number | null;
  status: string;
  source_type: string;
  source_membership_id: string | null;
  normalized_from_member_input: boolean;
  revision_no: number;
  supersedes_line_id: string | null;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
}

export interface DemandLineListPagination {
  limit: number;
  offset: number;
  count: number;
  total: number;
}

export interface NetworkPoolDemandLineListResponse {
  items: NetworkPoolDemandLine[];
  pagination: DemandLineListPagination;
}

export interface CreateDemandLineInput {
  line_ref: string;
  commodity_category: string;
  product_category?: string | null;
  product_spec_summary?: string | null;
  qty: number;
  qty_unit: string;
  quality_requirements_json?: Record<string, unknown> | null;
  certification_requirements_json?: Record<string, unknown> | null;
  packaging_requirements_json?: Record<string, unknown> | null;
  delivery_location?: string | null;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  tolerance_pct?: number | null;
  priority?: number | null;
  source_type?: string;
}

export interface UpdateDemandLineInput {
  commodity_category?: string;
  product_category?: string | null;
  product_spec_summary?: string | null;
  qty?: number;
  qty_unit?: string;
  quality_requirements_json?: Record<string, unknown> | null;
  certification_requirements_json?: Record<string, unknown> | null;
  packaging_requirements_json?: Record<string, unknown> | null;
  delivery_location?: string | null;
  delivery_window_start?: string | null;
  delivery_window_end?: string | null;
  tolerance_pct?: number | null;
  priority?: number | null;
}

export interface CancelDemandLineInput {
  reason?: string;
}

export interface DemandSnapshotRecord {
  id: string;
  owner_org_id: string;
  pool_id: string;
  snapshot_ref: string;
  snapshot_version: number;
  basis: string;
  status: string;
  captured_at: string | null;
  captured_by_user_id: string | null;
  captured_reason: string | null;
  line_count: number;
  total_qty: string | null;
  qty_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkPoolRfq {
  id: string;
  owner_org_id: string;
  pool_id: string;
  snapshot_id: string;
  rfq_ref: string;
  rfq_version: number;
  status: string;
  issue_basis: string;
  issued_at: string;
  issued_by_user_id: string | null;
  issue_reason: string | null;
  response_deadline_at: string | null;
  supplier_invite_mode: string;
  line_count: number;
  total_qty: string | null;
  qty_unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface IssueRfqInput {
  issue_reason?: string | null;
  response_deadline_at?: string | null;
}

export type SupplierInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';

export interface SendSupplierInviteInput {
  supplier_org_id: string;
  expires_at?: string | null;
  supplier_message?: string | null;
}

export interface CancelSupplierInviteInput {
  cancel_reason?: string | null;
}

export interface NetworkPoolRfqSupplierInvite {
  id: string;
  owner_org_id: string;
  supplier_org_id: string;
  rfq_id: string;
  pool_id: string;
  invite_ref: string;
  status: SupplierInviteStatus | string;
  invited_at: string;
  invited_by_user_id: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  expires_at: string | null;
  supplier_message: string | null;
  decline_reason: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type SupplierInviteListResponse = NetworkPoolRfqSupplierInvite[];

// ─── Demand Line API Methods ──────────────────────────────────────────────────

/**
 * List demand lines for a specific pool
 */
export interface ListDemandLinesParams {
  limit?: number;
  offset?: number;
  status?: string;
  commodity_category?: string;
  product_category?: string;
  source_type?: string;
}

function buildDemandLineQueryString(params?: ListDemandLinesParams): string {
  if (!params) return '';

  const searchParams = new URLSearchParams();
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.offset != null) searchParams.set('offset', String(params.offset));
  if (params.status) searchParams.set('status', params.status);
  if (params.commodity_category) searchParams.set('commodity_category', params.commodity_category);
  if (params.product_category) searchParams.set('product_category', params.product_category);
  if (params.source_type) searchParams.set('source_type', params.source_type);

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export async function listDemandLines(
  poolId: string,
  params?: ListDemandLinesParams,
): Promise<NetworkPoolDemandLineListResponse> {
  const qs = buildDemandLineQueryString(params);
  const endpoint = `/api/tenant/network-commerce/pools/${poolId}/demand-lines${qs}`;
  return tenantGet<NetworkPoolDemandLineListResponse>(endpoint);
}

/**
 * Create a new demand line in a pool
 */
export function createDemandLine(
  poolId: string,
  input: CreateDemandLineInput,
): Promise<NetworkPoolDemandLine> {
  return tenantPost<NetworkPoolDemandLine>(
    `/api/tenant/network-commerce/pools/${poolId}/demand-lines`,
    input,
  );
}

/**
 * Update an existing demand line (partial update)
 */
export function updateDemandLine(
  poolId: string,
  lineId: string,
  input: UpdateDemandLineInput,
): Promise<NetworkPoolDemandLine> {
  return tenantPatch<NetworkPoolDemandLine>(
    `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}`,
    input,
  );
}

/**
 * Cancel a demand line
 */
export function cancelDemandLine(
  poolId: string,
  lineId: string,
  input?: CancelDemandLineInput,
): Promise<NetworkPoolDemandLine> {
  return tenantPost<NetworkPoolDemandLine>(
    `/api/tenant/network-commerce/pools/${poolId}/demand-lines/${lineId}/cancel`,
    input || {},
  );
}

/**
 * Lock all active demand lines for RFQ issuance (owner/admin only)
 * Returns a demand snapshot record
 */
export interface LockDemandLinesForRfqInput {
  captured_reason?: string | null;
  expected_line_ids?: string[] | null;
}

export function lockDemandLinesForRfq(
  poolId: string,
  input?: LockDemandLinesForRfqInput,
): Promise<DemandSnapshotRecord> {
  return tenantPost<DemandSnapshotRecord>(
    `/api/tenant/network-commerce/pools/${poolId}/demand-lines/lock-for-rfq`,
    input || {},
  );
}

/**
 * Issue an RFQ for a pool after the demand lines have been locked.
 */
export function issueRfq(
  poolId: string,
  input?: IssueRfqInput,
): Promise<NetworkPoolRfq> {
  return tenantPost<NetworkPoolRfq>(`/api/tenant/network-commerce/pools/${poolId}/rfq/issue`, input || {});
}

/**
 * Send a supplier invite for a pool RFQ (owner/admin route).
 */
export function sendSupplierInvite(
  poolId: string,
  rfqId: string,
  input: SendSupplierInviteInput,
): Promise<NetworkPoolRfqSupplierInvite> {
  return tenantPost<NetworkPoolRfqSupplierInvite>(
    `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
    {
      supplier_org_id: input.supplier_org_id,
      expires_at: input.expires_at ?? null,
      supplier_message: input.supplier_message ?? null,
    },
  );
}

/**
 * List supplier invites for a specific pool RFQ (owner/admin route).
 */
export function listSupplierInvitesForRfq(
  poolId: string,
  rfqId: string,
): Promise<SupplierInviteListResponse> {
  return tenantGet<SupplierInviteListResponse>(
    `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites`,
  );
}

/**
 * Get one supplier invite by id for a specific pool RFQ (owner/admin route).
 */
export function getSupplierInvite(
  poolId: string,
  rfqId: string,
  inviteId: string,
): Promise<NetworkPoolRfqSupplierInvite> {
  return tenantGet<NetworkPoolRfqSupplierInvite>(
    `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}`,
  );
}

/**
 * Cancel a supplier invite for a pool RFQ (owner/admin route).
 */
export function cancelSupplierInvite(
  poolId: string,
  rfqId: string,
  inviteId: string,
  input?: CancelSupplierInviteInput,
): Promise<NetworkPoolRfqSupplierInvite> {
  return tenantPost<NetworkPoolRfqSupplierInvite>(
    `/api/tenant/network-commerce/pools/${poolId}/rfq/${rfqId}/invites/${inviteId}/cancel`,
    {
      cancel_reason: input?.cancel_reason ?? null,
    },
  );
}
