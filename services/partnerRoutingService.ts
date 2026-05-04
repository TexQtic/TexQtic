/**
 * partnerRoutingService — Frontend API Client (TTP Slice 6: Partner Routing Stub)
 *
 * Control-plane endpoint (admin only):
 *   GET /api/control/ttp/routing-stubs/:vpcId — get or create a routing stub for a VPC
 *
 * WARNING: Routing stub only — no partner transmission, financing approval, or payment
 *          action occurs. A VPC is a verified payable record only, not a payment guarantee.
 *
 * Governance: TTP Slice 6, TEXQTIC-TRADETRUST-PAY-DESIGN-001
 */

import { adminGet } from './adminApiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoutingStubPayload {
  vpc_id: string;
  vpc_reference: string;
  vpc_state: string;
  vpc_expires_at: string | null;

  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_due_date: string | null;
  amount: string;
  currency: string;

  seller_org_id: string;
  seller_legal_name: string;
  seller_gst_status: string | null;
  seller_gstin: string | null;

  buyer_org_id: string;
  buyer_legal_name: string;

  trade_id: string;
  trade_reference: string | null;

  ttp_risk_tier: number;
  ttp_eligibility_outcome: string | null;
  ttp_eligibility_valid_until: string | null;
  ttp_max_invoice_amount: string | null;

  disclaimer: string;
  generated_at: string;
}

export interface AdminRoutingStubRecord {
  id: string;
  org_id: string;
  vpc_id: string;
  partner_type: string;
  payload_version: string;
  transmission_status: string;
  generated_at: string;
  created_at: string;
  payload: RoutingStubPayload;
  persisted: boolean;
}

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * Get or create a partner routing stub for the specified VPC.
 * Restricted to SUPER_ADMIN.
 *
 * The server enforces all VPC state gates server-side.
 * Transmission_status will always be PENDING — no live routing occurs in Slice 6.
 */
export async function adminGetPartnerRoutingStub(vpcId: string): Promise<AdminRoutingStubRecord> {
  const response = await adminGet<{ stub: AdminRoutingStubRecord }>(
    `/api/control/ttp/routing-stubs/${vpcId}`,
  );
  return response.stub;
}
