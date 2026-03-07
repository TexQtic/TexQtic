/**
 * TexQtic Escrow Service — Tenant Plane (TECS-FBW-003-A)
 *
 * READ-ONLY in this unit. Only list endpoint wired.
 * Mutation endpoints (create, record transaction, transition) are out of scope
 * for TECS-FBW-003-A and are NOT implemented here.
 *
 * D-017-A: tenantId is NEVER sent by the client in any request body.
 *           tenantGet() enforces the TENANT realm guard and sets X-Texqtic-Realm: tenant.
 *           The server derives tenantId exclusively from JWT claims (orgId).
 *
 * D-020-B: Balance is NOT derived from the list endpoint.
 *           The list response contains no balance field — it is only available
 *           from GET /api/tenant/escrows/:escrowId (out of scope for this unit).
 *           Do NOT display balance or synthesize it from list rows.
 */

import { tenantGet } from './tenantApiClient';

// ==================== G-018 ESCROW (TECS-FBW-003-A) ====================

/**
 * A single escrow account as returned by GET /api/tenant/escrows.
 *
 * Fields reflect the production response shape from escrow.service.ts
 * listEscrowAccounts() method. No balance field — D-020-B.
 */
export interface EscrowAccount {
  id: string;
  tenantId: string;
  currency: string;
  lifecycleStateId: string;
  /** Human-readable state key, e.g. DRAFT | ACTIVE | SETTLED | CLOSED | DISPUTED */
  lifecycleStateKey: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowListParams {
  limit?: number;
  offset?: number;
}

/**
 * Response envelope from GET /api/tenant/escrows.
 * count reflects the number of rows returned in this page — not total DB count.
 */
export interface EscrowListResponse {
  escrows: EscrowAccount[];
  count: number;
  limit: number;
  offset: number;
}

/**
 * List escrow accounts for the authenticated tenant.
 *
 * D-017-A: No tenantId is included in this request — TENANT realm guard on
 *           tenantGet() is sufficient. The server scopes results to the JWT orgId.
 * D-020-B: The response does NOT include balance. Do not attempt to derive
 *           balance from this list response.
 *
 * @param params - Optional pagination params (limit, offset)
 * @returns EscrowListResponse
 */
export async function listEscrows(params?: EscrowListParams): Promise<EscrowListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));
  if (params?.offset !== undefined) searchParams.set('offset', String(params.offset));

  const qs = searchParams.toString();
  const endpoint = qs ? `/api/tenant/escrows?${qs}` : '/api/tenant/escrows';

  return tenantGet<EscrowListResponse>(endpoint);
}
