/**
 * TexQtic Control Plane Service
 *
 * Admin-only APIs for platform governance and observability
 *
 * CRITICAL: All endpoints require CONTROL_PLANE realm authentication
 * Wave 3 Scope: READ-ONLY operations only
 * Wave 4 Scope: Admin tenant provisioning added
 */

import { adminGet, adminPost, adminPostWithHeaders, adminPut } from './adminApiClient';

// ==================== TENANT MANAGEMENT ====================

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  type: string;
  /** B2-REM-3: canonical tenant identity category. Optional — control-plane list queries may not populate. */
  tenant_category?: string | null;
  /** B2-REM-3: white-label capability flag. Optional — control-plane list queries may not populate. */
  is_white_label?: boolean;
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

// ==================== FINANCE AUTHORITY MUTATIONS ====================

/**
 * Request body for finance payout authority actions (approve or reject).
 * TECS-FBW-001 (Finance sub-unit, 2026-03-07):
 * Aligned to backend Zod schema { reason?: string }.
 * NOTE: Finance body is simpler than compliance — no notes field.
 */
export interface FinanceAuthorityBody {
  reason?: string;
}

export interface FinanceAuthorityResponse {
  id: string;
  [key: string]: unknown;
}

/**
 * Record an approval decision for a payout.
 * TECS-FBW-001 (Finance sub-unit, 2026-03-07)
 * Route: POST /api/control/finance/payouts/:payout_id/approve
 * Requires Idempotency-Key — caller generates UUID before opening dialog.
 * Both 200 (replay) and 201 (created) are treated as success.
 * SUPER_ADMIN-only — non-SUPER_ADMIN receives 403 surfaced as inline dialog error.
 * Does NOT execute a payout — records an authority decision event only.
 */
export async function approvePayoutDecision(
  payoutId: string,
  body: FinanceAuthorityBody,
  idempotencyKey: string
): Promise<FinanceAuthorityResponse> {
  return adminPostWithHeaders<FinanceAuthorityResponse>(
    `/api/control/finance/payouts/${payoutId}/approve`,
    body,
    { 'Idempotency-Key': idempotencyKey }
  );
}

/**
 * Record a rejection decision for a payout.
 * TECS-FBW-001 (Finance sub-unit, 2026-03-07)
 * Route: POST /api/control/finance/payouts/:payout_id/reject
 * Requires Idempotency-Key — caller generates UUID before opening dialog.
 * Both 200 (replay) and 201 (created) are treated as success.
 * SUPER_ADMIN-only — non-SUPER_ADMIN receives 403 surfaced as inline dialog error.
 * Does NOT reverse or cancel a payout — records an authority decision event only.
 */
export async function rejectPayoutDecision(
  payoutId: string,
  body: FinanceAuthorityBody,
  idempotencyKey: string
): Promise<FinanceAuthorityResponse> {
  return adminPostWithHeaders<FinanceAuthorityResponse>(
    `/api/control/finance/payouts/${payoutId}/reject`,
    body,
    { 'Idempotency-Key': idempotencyKey }
  );
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

// ==================== COMPLIANCE AUTHORITY MUTATIONS ====================

/**
 * Request body for compliance authority actions (approve or reject).
 * TECS-FBW-001 (Compliance sub-unit, 2026-03-07):
 * Aligned to backend Zod schema { reason?: string; notes?: string }.
 */
export interface ComplianceAuthorityBody {
  reason?: string;
  notes?: string;
}

export interface ComplianceAuthorityResponse {
  id: string;
  [key: string]: unknown;
}

/**
 * Approve a compliance request.
 * TECS-FBW-001 (Compliance sub-unit, 2026-03-07)
 * Route: POST /api/control/compliance/requests/:request_id/approve
 * Requires Idempotency-Key — caller generates UUID before opening dialog.
 * Both 200 (replay) and 201 (created) are treated as success.
 */
export async function approveComplianceRequest(
  requestId: string,
  body: ComplianceAuthorityBody,
  idempotencyKey: string
): Promise<ComplianceAuthorityResponse> {
  return adminPostWithHeaders<ComplianceAuthorityResponse>(
    `/api/control/compliance/requests/${requestId}/approve`,
    body,
    { 'Idempotency-Key': idempotencyKey }
  );
}

/**
 * Reject a compliance request.
 * TECS-FBW-001 (Compliance sub-unit, 2026-03-07)
 * Route: POST /api/control/compliance/requests/:request_id/reject
 * Requires Idempotency-Key — caller generates UUID before opening dialog.
 * Both 200 (replay) and 201 (created) are treated as success.
 */
export async function rejectComplianceRequest(
  requestId: string,
  body: ComplianceAuthorityBody,
  idempotencyKey: string
): Promise<ComplianceAuthorityResponse> {
  return adminPostWithHeaders<ComplianceAuthorityResponse>(
    `/api/control/compliance/requests/${requestId}/reject`,
    body,
    { 'Idempotency-Key': idempotencyKey }
  );
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

/**
 * Request body for dispute resolve / escalate authority actions.
 * Field names must match backend Zod schema exactly: resolution, notes.
 * TECS-FBW-001 Disputes sub-unit (2026-03-07)
 */
export interface DisputeAuthorityBody {
  resolution?: string;
  notes?: string;
}

export interface DisputeAuthorityResponse {
  success: boolean;
  data?: Record<string, unknown>;
}

/**
 * Record a dispute resolution decision.
 * POST /api/control/disputes/:disputeId/resolve
 * Requires Idempotency-Key header — generated at click time in the UI.
 * Returns 201 (new write) or 200 (replay); both treated as success.
 */
export async function resolveDispute(
  disputeId: string,
  body: DisputeAuthorityBody,
  idempotencyKey: string
): Promise<DisputeAuthorityResponse> {
  return adminPostWithHeaders<DisputeAuthorityResponse>(
    `/api/control/disputes/${disputeId}/resolve`,
    body,
    { 'Idempotency-Key': idempotencyKey }
  );
}

/**
 * Record a dispute escalation decision.
 * POST /api/control/disputes/:disputeId/escalate
 * Requires Idempotency-Key header — generated at click time in the UI.
 * Returns 201 (new write) or 200 (replay); both treated as success.
 */
export async function escalateDispute(
  disputeId: string,
  body: DisputeAuthorityBody,
  idempotencyKey: string
): Promise<DisputeAuthorityResponse> {
  return adminPostWithHeaders<DisputeAuthorityResponse>(
    `/api/control/disputes/${disputeId}/escalate`,
    body,
    { 'Idempotency-Key': idempotencyKey }
  );
}

// ==================== G-017 TRADES (TECS-FBW-002-A) ====================

/**
 * Lifecycle state snapshot included on each trade row.
 * Source: lifecycle_states table, joined via trade.lifecycleStateId.
 */
export interface TradeLifecycleState {
  id: string;
  entityType: string;
  stateKey: string;
  label: string;
  isFinalState: boolean;
}

/**
 * Admin-visible trade record returned by GET /api/control/trades.
 * grossAmount is a Prisma Decimal — serialised to string over JSON.
 * D-017-A: tenantId is READ from the trade row; never supplied by client in body.
 */
export interface Trade {
  id: string;
  tenantId: string;
  buyerOrgId: string;
  sellerOrgId: string;
  tradeReference: string;
  currency: string;
  grossAmount: number | string;
  lifecycleState: TradeLifecycleState | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Optional admin-side query filters for listTrades().
 * All fields map to URL query parameters — no request body.
 * D-017-A: tenantId here is an admin filter, NOT a client identity assertion.
 */
export interface TradesQueryParams {
  tenantId?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'SETTLED' | 'DISPUTED' | 'CANCELLED';
  limit?: number;
  offset?: number;
}

export interface TradesResponse {
  trades: Trade[];
  count: number;
}

/**
 * List trades across all tenants (admin only).
 * TECS-FBW-002-A (2026-03-07): first frontend surface for G-017 Trades.
 * Route: GET /api/control/trades
 * Uses query parameters only — no request body.
 * D-017-A: tenantId is an optional admin filter on the server query;
 *           it is NEVER a client-supplied tenant identity in a request body.
 */
export async function listTrades(params?: TradesQueryParams): Promise<TradesResponse> {
  const queryParams = new URLSearchParams();

  if (params?.tenantId) {
    queryParams.append('tenantId', params.tenantId);
  }
  if (params?.status) {
    queryParams.append('status', params.status);
  }
  if (params?.limit !== undefined) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.offset !== undefined) {
    queryParams.append('offset', params.offset.toString());
  }

  const queryString = queryParams.toString();
  const endpoint = `/api/control/trades${queryString ? `?${queryString}` : ''}`;

  return adminGet<TradesResponse>(endpoint);
}

// ==================== G-022 ESCALATIONS (TECS-FBW-006-A) ====================

/**
 * Control-plane escalation event as returned by GET /api/control/escalations.
 * Fields mirror EscalationEventRow from server/src/services/escalation.types.ts.
 * Dates are serialised as ISO 8601 strings over JSON.
 *
 * GET requires mandatory orgId query param — admin must specify the target org.
 * D-022-C: freezeRecommendation is informational only; no kill-switch auto-toggle.
 */
export interface ControlPlaneEscalationEvent {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  parentEscalationId: string | null;
  source: string;
  /** Severity 0–4. D-022-A: strictly monotonic via service + DB trigger. */
  severityLevel: number;
  /** Informational flag — does NOT auto-toggle kill switch (D-022-C). */
  freezeRecommendation: boolean;
  triggeredByActorType: string;
  triggeredByPrincipal: string;
  reason: string;
  /** 'OPEN' | 'RESOLVED' | 'OVERRIDDEN' */
  status: string;
  resolvedByPrincipal: string | null;
  resolutionReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface EscalationsQueryParams {
  entityType?: string;
  entityId?: string;
  status?: string;
  limit?: number;
}

export interface EscalationsListResponse {
  escalations: ControlPlaneEscalationEvent[];
  count: number;
}

/**
 * List G-022 escalation events for a specified organisation (admin cross-org read).
 * Route: GET /api/control/escalations
 *
 * orgId is mandatory — the endpoint returns 400 if absent (RLS scope boundary).
 * All other params are optional filters passed as URL query parameters.
 *
 * Read-only in TECS-FBW-006-A. Mutation endpoints (create, upgrade, resolve,
 * override) are out of scope for this unit.
 */
export async function getEscalations(
  orgId: string,
  params?: EscalationsQueryParams,
): Promise<EscalationsListResponse> {
  const queryParams = new URLSearchParams({ orgId });
  if (params?.entityType) queryParams.set('entityType', params.entityType);
  if (params?.entityId)   queryParams.set('entityId',   params.entityId);
  if (params?.status)     queryParams.set('status',     params.status);
  if (params?.limit !== undefined) queryParams.set('limit', String(params.limit));

  return adminGet<EscalationsListResponse>(`/api/control/escalations?${queryParams.toString()}`);
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
