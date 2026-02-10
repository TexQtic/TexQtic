/**
 * TexQtic Control Plane Service
 *
 * Admin-only APIs for platform governance and observability
 * 
 * CRITICAL: All endpoints require CONTROL_PLANE realm authentication
 * Wave 3 Scope: READ-ONLY operations only
 */

import { get } from './apiClient';

// ==================== TENANT MANAGEMENT ====================

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
  domains?: TenantDomain[];
  branding?: TenantBranding;
  aiBudget?: AiBudget;
  _count?: {
    memberships: number;
    auditLogs: number;
  };
}

export interface TenantDomain {
  id: string;
  domain: string;
  verified: boolean;
  primary: boolean;
}

export interface TenantBranding {
  id: string;
  logoUrl: string | null;
  primaryColor: string;
  faviconUrl: string | null;
}

export interface AiBudget {
  id: string;
  monthlyLimit: number;
  currentUsage: number;
  lastResetAt: string;
}

export interface TenantsResponse {
  tenants: Tenant[];
}

export interface TenantDetailResponse {
  tenant: Tenant & {
    memberships?: Array<{
      id: string;
      role: string;
      status: string;
      user: {
        id: string;
        email: string;
        emailVerified: boolean;
      };
    }>;
  };
}

/**
 * Fetch all tenants (admin only)
 */
export async function getTenants(): Promise<TenantsResponse> {
  return get<TenantsResponse>('/api/control/tenants');
}

/**
 * Fetch single tenant details (admin only)
 */
export async function getTenantById(tenantId: string): Promise<TenantDetailResponse> {
  return get<TenantDetailResponse>(`/api/control/tenants/${tenantId}`);
}

// ==================== AUDIT LOGS ====================

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorType: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  tenantId: string;
  createdAt: string;
  tenant?: {
    slug: string;
    name: string;
  };
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  count: number;
}

export interface AuditLogsQueryParams {
  tenantId?: string;
  action?: string;
  limit?: number;
}

/**
 * Fetch audit logs (admin only)
 * 
 * @param params - Optional filters (tenantId, action, limit)
 */
export async function getAuditLogs(params?: AuditLogsQueryParams): Promise<AuditLogsResponse> {
  const queryParams = new URLSearchParams();

  if (params?.tenantId) {
    queryParams.append('tenantId', params.tenantId);
  }

  if (params?.action) {
    queryParams.append('action', params.action);
  }

  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const queryPrefix = queryString ? '?' : '';
  const endpoint = `/api/control/audit-logs${queryPrefix}${queryString}`;

  return get<AuditLogsResponse>(endpoint);
}

// ==================== EVENT STREAM ====================

export interface EventLog {
  id: string;
  tenantId: string;
  name: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, any>;
  occurredAt: string;
  version: number;
  createdAt: string;
}

export interface EventsResponse {
  events: EventLog[];
  count: number;
  nextCursor: string | null;
}

export interface EventsQueryParams {
  tenant_id?: string;
  event_name?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

/**
 * Fetch event logs (admin only)
 * 
 * @param params - Optional filters (tenant_id, event_name, from, to, limit, cursor)
 */
export async function getEvents(params?: EventsQueryParams): Promise<EventsResponse> {
  const queryParams = new URLSearchParams();

  if (params?.tenant_id) {
    queryParams.append('tenant_id', params.tenant_id);
  }

  if (params?.event_name) {
    queryParams.append('event_name', params.event_name);
  }

  if (params?.from) {
    queryParams.append('from', params.from);
  }

  if (params?.to) {
    queryParams.append('to', params.to);
  }

  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params?.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  const queryString = queryParams.toString();
  const queryPrefix = queryString ? '?' : '';
  const endpoint = `/api/control/events${queryPrefix}${queryString}`;

  return get<EventsResponse>(endpoint);
}

// ==================== MARKETPLACE CART SUMMARIES ====================

export interface MarketplaceCartSummary {
  id: string;
  tenantId: string;
  cartId: string;
  userId: string;
  itemCount: number;
  totalQuantity: number;
  lastEventId: string;
  version: number;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartSummariesResponse {
  items: MarketplaceCartSummary[];
  next_cursor?: string;
  page_size: number;
  has_more: boolean;
}

export interface CartSummariesQueryParams {
  tenant_id: string;
  limit?: number;
  cursor?: string;
  updated_after?: string;
}

/**
 * Fetch marketplace cart summaries (admin only)
 * 
 * @param params - Required tenant_id, optional filters
 */
export async function getCartSummaries(
  params: CartSummariesQueryParams
): Promise<CartSummariesResponse> {
  const queryParams = new URLSearchParams();

  queryParams.append('tenant_id', params.tenant_id);

  if (params.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params.cursor) {
    queryParams.append('cursor', params.cursor);
  }

  if (params.updated_after) {
    queryParams.append('updated_after', params.updated_after);
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/control/marketplace/cart-summaries?${queryString}`;

  return get<CartSummariesResponse>(endpoint);
}

/**
 * Fetch single cart summary by cart ID (admin only)
 */
export async function getCartSummaryByCartId(cartId: string): Promise<{ summary: MarketplaceCartSummary }> {
  return get<{ summary: MarketplaceCartSummary }>(`/api/control/marketplace/cart-summaries/${cartId}`);
}
