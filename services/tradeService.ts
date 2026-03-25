/**
 * tradeService.ts — Tenant-plane trade read surface (TECS-FBW-002-B)
 *
 * D-017-A: orgId is NEVER sent by the client. Backend derives tenant scope
 * from the authenticated JWT. tenantGet() enforces the TENANT realm guard.
 *
 * EXC-ENABLER-004: exposes tenant trade detail + lifecycle transition wiring
 * using the existing tenant routes. No lifecycle rules are invented here.
 */
import { tenantGet, tenantPost } from './tenantApiClient';

export interface TenantTradeLifecycleState {
  stateKey: string;
}

export interface TenantTrade {
  id: string;
  tenantId: string;
  tradeReference: string;
  buyerOrgId: string;
  sellerOrgId: string;
  grossAmount: number | string;
  currency: string;
  lifecycleState: TenantTradeLifecycleState | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantTradesListParams {
  status?: 'DRAFT' | 'ACTIVE' | 'SETTLED' | 'DISPUTED' | 'CANCELLED';
  limit?: number;
  offset?: number;
}

export interface TenantTradesListResponse {
  trades: TenantTrade[];
  count: number;
}

export interface TransitionTenantTradeInput {
  toStateKey: string;
  reason: string;
  actorRole: string;
}

export type TransitionTenantTradeResponse =
  | {
      status: 'APPLIED';
      fromStateKey: string;
      toStateKey: string;
      transitionId: string | null;
    }
  | {
      status: 'PENDING_APPROVAL';
      fromStateKey: string;
      requiredActors: string[];
      approvalId: string | null;
    };

export async function listTenantTrades(
  params?: TenantTradesListParams
): Promise<TenantTradesListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit != null) searchParams.set('limit', String(params.limit));
  if (params?.offset != null) searchParams.set('offset', String(params.offset));
  const qs = searchParams.toString();
  const endpoint = qs ? `/api/tenant/trades?${qs}` : '/api/tenant/trades';
  return tenantGet<TenantTradesListResponse>(endpoint);
}

export async function getTenantTradeDetail(tradeId: string): Promise<TenantTrade> {
  const result = await listTenantTrades({ limit: 200, offset: 0 });
  const trade = result.trades.find(item => item.id === tradeId);

  if (!trade) {
    throw new Error(`Trade ${tradeId} not found for the current tenant.`);
  }

  return trade;
}

export function transitionTenantTrade(
  tradeId: string,
  input: TransitionTenantTradeInput,
): Promise<TransitionTenantTradeResponse> {
  return tenantPost<TransitionTenantTradeResponse>(`/api/tenant/trades/${tradeId}/transition`, input);
}
