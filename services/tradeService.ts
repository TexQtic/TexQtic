/**
 * tradeService.ts — Tenant-plane trade read surface (TECS-FBW-002-B)
 *
 * D-017-A: orgId is NEVER sent by the client. Backend derives tenant scope
 * from the authenticated JWT. tenantGet() enforces the TENANT realm guard.
 *
 * Read-only: listTenantTrades only. No create / update / delete surfaces.
 */
import { tenantGet } from './tenantApiClient';

export interface TenantTradeLifecycleState {
  stateKey: string;
}

export interface TenantTrade {
  id: string;
  tenantId: string;
  lifecycleState: TenantTradeLifecycleState | null;
  createdAt: string;
  updatedAt?: string;
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

export async function listTenantTrades(
  params?: TenantTradesListParams
): Promise<TenantTradesListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.limit != null) searchParams.set('limit', String(params.limit));
  if (params?.offset != null) searchParams.set('offset', String(params.offset));
  const qs = searchParams.toString();
  return tenantGet<TenantTradesListResponse>(
    `/api/tenant/trades${qs ? `?${qs}` : ''}`
  );
}
