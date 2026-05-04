/**
 * VPC Service — Frontend API Client (TTP Slice 5: VPC Generation)
 *
 * Control-plane endpoints (admin only):
 *   POST  /api/control/vpc/generate/:invoiceId — generate VPC for VERIFIED invoice (SUPER_ADMIN)
 *   GET   /api/control/vpc                     — list VPCs (cross-tenant, admin)
 *   GET   /api/control/vpc/:vpcId              — get VPC detail
 *   PATCH /api/control/vpc/:vpcId/transition   — admin lifecycle transition (SUPER_ADMIN)
 *
 * D-017-A: org_id is NEVER sent in any request body.
 *           The server derives org scope exclusively from the route :invoiceId param.
 *
 * WARNING: VPC is a verified payable record only. It is NOT a payment guarantee,
 *          financial instrument, or escrow instruction. No money movement is implied.
 *
 * Governance: TTP Slice 5, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { adminGet, adminPost, adminPatch } from './adminApiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VpcStateKey =
  | 'ACTIVE'
  | 'ROUTING_READY'
  | 'TRANSMITTED'
  | 'VOIDED'
  | 'EXPIRED';

export interface AdminVpcRecord {
  id: string;
  org_id: string;
  invoice_id: string;
  trade_id: string;
  buyer_org_id: string;
  seller_org_id: string;
  vpc_reference: string;
  currency: string;
  invoice_amount: string;
  risk_tier: number;
  state_key: VpcStateKey;
  is_terminal: boolean;
  issued_at: string;
  expires_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  partner_routing_eligible: boolean;
  created_by_admin_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Request types ────────────────────────────────────────────────────────────

export interface VpcTransitionInput {
  to_state_key: 'ROUTING_READY' | 'VOIDED' | 'EXPIRED';
  reason: string;
  void_reason?: string | null;
  notes?: string | null;
}

export interface VpcListFilters {
  org_id?: string;
  invoice_id?: string;
  trade_id?: string;
  state_key?: string;
  limit?: number;
  offset?: number;
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface AdminVpcResponse {
  vpc: AdminVpcRecord;
}

export interface AdminVpcListResponse {
  vpcs: AdminVpcRecord[];
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Generate a VPC for a VERIFIED invoice.
 * Restricted to SUPER_ADMIN.
 * Enforces all eligibility gates server-side.
 */
export async function adminGenerateVpc(invoiceId: string): Promise<AdminVpcRecord> {
  const response = await adminPost<{ success: true; data: AdminVpcRecord }>(
    `/api/control/vpc/generate/${invoiceId}`,
  );
  return response.data;
}

/**
 * List VPCs with optional filters (cross-tenant admin view).
 */
export async function adminListVpcs(filters: VpcListFilters = {}): Promise<AdminVpcRecord[]> {
  const params = new URLSearchParams();
  if (filters.org_id) params.set('org_id', filters.org_id);
  if (filters.invoice_id) params.set('invoice_id', filters.invoice_id);
  if (filters.trade_id) params.set('trade_id', filters.trade_id);
  if (filters.state_key) params.set('state_key', filters.state_key);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));

  const query = params.toString();
  const response = await adminGet<{ success: true; data: AdminVpcRecord[] }>(
    `/api/control/vpc${query ? `?${query}` : ''}`,
  );
  return response.data;
}

/**
 * Get a single VPC by ID.
 */
export async function adminGetVpc(vpcId: string): Promise<AdminVpcRecord> {
  const response = await adminGet<{ success: true; data: AdminVpcRecord }>(
    `/api/control/vpc/${vpcId}`,
  );
  return response.data;
}

/**
 * Transition a VPC to a new state (admin write, SUPER_ADMIN required).
 */
export async function adminTransitionVpc(
  vpcId: string,
  input: VpcTransitionInput,
): Promise<AdminVpcRecord> {
  const response = await adminPatch<{ success: true; data: AdminVpcRecord }>(
    `/api/control/vpc/${vpcId}/transition`,
    input,
  );
  return response.data;
}
