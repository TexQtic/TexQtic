/**
 * TexQtic Control Plane Service
 *
 * Admin-only APIs for platform governance and observability
 *
 * CRITICAL: All endpoints require CONTROL_PLANE realm authentication
 * Wave 3 Scope: READ-ONLY operations only
 * Wave 4 Scope: Admin tenant provisioning added
 */

import { get, post, put, getAuthRealm } from './apiClient';

/**
 * Wave 0-A: Realm guard helper
 * Throws REALM_MISMATCH error if current realm is not CONTROL_PLANE
 * Prevents 401 storm by failing fast before network request
 */
function requireControlPlaneRealm(): void {
  const realm = getAuthRealm();
  if (realm !== 'CONTROL_PLANE') {
    throw new Error(
      `REALM_MISMATCH: Control-plane endpoint requires CONTROL_PLANE realm, got ${realm || 'NONE'}`
    );
  }
}

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
  requireControlPlaneRealm();
  return get<TenantsResponse>('/api/control/tenants');
}

/**
 * Fetch single tenant details (admin only)
 */
export async function getTenantById(tenantId: string): Promise<TenantDetailResponse> {
  requireControlPlaneRealm();
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
  requireControlPlaneRealm();
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
  requireControlPlaneRealm();
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
  requireControlPlaneRealm();
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
export async function getCartSummaryByCartId(
  cartId: string
): Promise<{ summary: MarketplaceCartSummary }> {
  requireControlPlaneRealm();
  return get<{ summary: MarketplaceCartSummary }>(
    `/api/control/marketplace/cart-summaries/${cartId}`
  );
}

// ==================== TENANT PROVISIONING ====================

export interface ProvisionTenantRequest {
  name: string;
  slug: string;
  type: 'B2B' | 'B2C' | 'INTERNAL';
  ownerEmail: string;
  ownerPassword: string;
}

export interface ProvisionTenantResponse {
  tenant: {
    id: string;
    name: string;
    slug: string;
    type: string;
    status: string;
  };
  owner: {
    id: string;
    email: string;
  };
}

/**
 * Provision a new tenant (admin only)
 * This is the ONLY way to create tenants - no public signup
 */
export async function provisionTenant(
  request: ProvisionTenantRequest
): Promise<ProvisionTenantResponse> {
  requireControlPlaneRealm();
  return post<ProvisionTenantResponse>('/api/control/tenants/provision', request);
}

// ==================== FEATURE FLAGS ====================

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagsResponse {
  flags: FeatureFlag[];
}

export interface UpsertFeatureFlagRequest {
  enabled: boolean;
  description?: string;
}

export interface UpsertFeatureFlagResponse {
  flag: FeatureFlag;
}

/**
 * Fetch all feature flags (admin only)
 */
export async function getFeatureFlags(): Promise<FeatureFlagsResponse> {
  requireControlPlaneRealm();
  return get<FeatureFlagsResponse>('/api/control/feature-flags');
}

/**
 * Upsert a feature flag (admin only)
 * Wave 5A: Stateful mutation using existing FeatureFlag model
 */
export async function upsertFeatureFlag(
  key: string,
  request: UpsertFeatureFlagRequest
): Promise<UpsertFeatureFlagResponse> {
  requireControlPlaneRealm();
  return put<UpsertFeatureFlagResponse>(`/api/control/feature-flags/${key}`, request);
}

// ==================== FINANCE OPERATIONS ====================

export interface PayoutDecision {
  id: string;
  eventId: string;
  status: string;
  decision: string;
  decidedAt: string;
  decidedBy: string | null;
  reason: string | null;
  metadata: Record<string, any> | null;
}

export interface PayoutsResponse {
  payouts: PayoutDecision[];
}

/**
 * Fetch payout authority intents (admin only)
 * Backed by EventLog - returns payout-related authority decisions
 */
export async function getPayouts(): Promise<PayoutsResponse> {
  requireControlPlaneRealm();
  return get<PayoutsResponse>('/api/control/finance/payouts');
}

// ==================== COMPLIANCE OPERATIONS ====================

export interface ComplianceDecision {
  id: string;
  eventId: string;
  status: string;
  decision: string;
  decidedAt: string;
  decidedBy: string | null;
  reason: string | null;
  metadata: Record<string, any> | null;
}

export interface ComplianceRequestsResponse {
  requests: ComplianceDecision[];
}

/**
 * Fetch compliance request authority intents (admin only)
 * Backed by EventLog - returns compliance-related authority decisions
 */
export async function getComplianceRequests(): Promise<ComplianceRequestsResponse> {
  requireControlPlaneRealm();
  return get<ComplianceRequestsResponse>('/api/control/compliance/requests');
}

// ==================== DISPUTE OPERATIONS ====================

export interface DisputeDecision {
  id: string;
  eventId: string;
  status: string;
  decision: string;
  decidedAt: string;
  decidedBy: string | null;
  resolution: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
}

export interface DisputesResponse {
  disputes: DisputeDecision[];
}

/**
 * Fetch dispute authority intents (admin only)
 * Backed by EventLog - returns dispute-related authority decisions
 */
export async function getDisputes(): Promise<DisputesResponse> {
  requireControlPlaneRealm();
  return get<DisputesResponse>('/api/control/disputes');
}

// ==================== SYSTEM HEALTH ====================

export interface HealthService {
  name: string;
  status: string;
  lastCheck: string;
}

export interface SystemHealthResponse {
  services: HealthService[];
  overall: string;
  timestamp: string;
}

/**
 * Fetch system health overview (admin only)
 * Returns computed health based on available telemetry
 */
export async function getSystemHealth(): Promise<SystemHealthResponse> {
  requireControlPlaneRealm();
  return get<SystemHealthResponse>('/api/control/system/health');
}
