/**
 * TexQtic Control Plane Service
 *
 * Admin-only APIs for platform governance and observability
 *
 * CRITICAL: All endpoints require CONTROL_PLANE realm authentication
 * Wave 3 Scope: READ-ONLY operations only
 * Wave 4 Scope: Admin tenant provisioning added
 */

import { adminGet, adminPost, adminPut } from './adminApiClient';

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
  return adminGet<TenantsResponse>('/api/control/tenants');
}

/**
 * Fetch single tenant details (admin only)
 */
export async function getTenantById(tenantId: string): Promise<TenantDetailResponse> {
  return adminGet<TenantDetailResponse>(`/api/control/tenants/${tenantId}`);
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

  return adminGet<AuditLogsResponse>(endpoint);
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

  return adminGet<EventsResponse>(endpoint);
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

  return adminGet<CartSummariesResponse>(endpoint);
}

/**
 * Fetch single cart summary by cart ID (admin only)
 */
export async function getCartSummaryByCartId(
  cartId: string
): Promise<{ summary: MarketplaceCartSummary }> {
  return adminGet<{ summary: MarketplaceCartSummary }>(
    `/api/control/marketplace/cart-summaries/${cartId}`
  );
}

// ==================== TENANT PROVISIONING ====================

/**
 * TECS-FBW-PROV-001 (2026-03-06): aligned to backend Zod schema.
 * Backend: POST /api/control/tenants/provision — admin/tenantProvision.ts
 * Schema fields: orgName, primaryAdminEmail, primaryAdminPassword
 * Removed: name, slug, type, ownerEmail, ownerPassword (wrong names; slug/type are backend-derived)
 */
export interface ProvisionTenantRequest {
  orgName: string;
  primaryAdminEmail: string;
  primaryAdminPassword: string;
}

/**
 * TECS-FBW-PROV-001 (2026-03-06): aligned to actual backend response.
 * Backend returns flat shape from sendSuccess(): { orgId, slug, userId, membershipId }
 * Removed: nested tenant/owner model (never matched backend response)
 */
export interface ProvisionTenantResponse {
  orgId: string;
  slug: string;
  userId: string;
  membershipId: string;
}

/**
 * Provision a new tenant (admin only)
 * This is the ONLY way to create tenants - no public signup
 */
export async function provisionTenant(
  request: ProvisionTenantRequest
): Promise<ProvisionTenantResponse> {
  return adminPost<ProvisionTenantResponse>('/api/control/tenants/provision', request);
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
  return adminGet<FeatureFlagsResponse>('/api/control/feature-flags');
}

/**
 * Upsert a feature flag (admin only)
 * Wave 5A: Stateful mutation using existing FeatureFlag model
 */
export async function upsertFeatureFlag(
  key: string,
  request: UpsertFeatureFlagRequest
): Promise<UpsertFeatureFlagResponse> {
  return adminPut<UpsertFeatureFlagResponse>(`/api/control/feature-flags/${key}`, request);
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
  return adminGet<PayoutsResponse>('/api/control/finance/payouts');
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
  return adminGet<ComplianceRequestsResponse>('/api/control/compliance/requests');
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
  return adminGet<DisputesResponse>('/api/control/disputes');
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
  return adminGet<SystemHealthResponse>('/api/control/system/health');
}

// ==================== IMPERSONATION (G-W3-ROUTING-001) ====================

export interface StartImpersonationRequest {
  orgId: string;
  userId: string;
  reason: string; // min 10 chars — enforced server-side by Zod
}

export interface StartImpersonationResponse {
  impersonationId: string;
  token: string;     // tenant-shaped JWT, 30-min TTL
  expiresAt: string; // ISO 8601
}

export interface StopImpersonationRequest {
  impersonationId: string;
  reason: string; // min 10 chars — enforced server-side by Zod
}

/**
 * Start a time-bounded impersonation session.
 * Uses adminPost to send X-Texqtic-Realm: control header.
 * Returns a tenant-shaped JWT (separate from the admin session token).
 */
export async function startImpersonationSession(
  request: StartImpersonationRequest
): Promise<StartImpersonationResponse> {
  return adminPost<StartImpersonationResponse>('/api/control/impersonation/start', request);
}

/**
 * Stop an active impersonation session.
 * Writes IMPERSONATION_STOP audit event on the server.
 */
export async function stopImpersonationSession(
  request: StopImpersonationRequest
): Promise<{ ended: boolean }> {
  return adminPost<{ ended: boolean }>('/api/control/impersonation/stop', request);
}
