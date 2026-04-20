/**
 * TexQtic Control Plane Service
 *
 * Admin-only APIs for platform governance and observability
 *
 * CRITICAL: All endpoints require CONTROL_PLANE realm authentication
 * Wave 3 Scope: READ-ONLY operations only
 * Wave 4 Scope: Admin tenant provisioning added
 */

import { adminDelete, adminGet, adminGetWithHeaders, adminPost, adminPostWithHeaders, adminPut } from './adminApiClient';

// ==================== TENANT MANAGEMENT ====================

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  type: string;
  /** Compatibility category alias retained while canonical flat carrier normalizes downstream reads. */
  tenant_category?: string | null;
  /** Compatibility white-label alias retained while canonical flat carrier normalizes downstream reads. */
  is_white_label?: boolean | null;
  /** Canonical base family read-model carrier. */
  base_family?: 'B2B' | 'B2C' | 'INTERNAL' | null;
  /** Canonical aggregator capability read-model carrier. */
  aggregator_capability?: boolean | null;
  /** Canonical white-label capability read-model carrier. */
  white_label_capability?: boolean | null;
  /** Canonical commercial plan read-model carrier. */
  commercial_plan?: import('../types').CommercialPlan | null;
  /** Control-plane list queries may emit the Prisma camelCase field for white-label capability. */
  isWhiteLabel?: boolean | null;
  status: string;
  /** List-safe invited-classifier truth derived from a still-pending first-owner preparation invite. */
  has_pending_first_owner_preparation_invite?: boolean;
  /** Org-backed onboarding lifecycle status used by onboarding completion flow. */
  onboarding_status?: string | null;
  plan: import('../types').CommercialPlan;
  /** Detail reads populate timestamps; summary list reads may omit them. */
  createdAt?: string;
  updatedAt?: string;
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
  logoUrl?: string | null;
  primaryColor?: string | null;
  faviconUrl?: string | null;
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

let getTenantsInFlight: Promise<TenantsResponse> | null = null;

/**
 * Fetch all tenants (admin only)
 */
export async function getTenants(): Promise<TenantsResponse> {
  if (getTenantsInFlight) {
    return getTenantsInFlight;
  }

  getTenantsInFlight = adminGet<TenantsResponse>('/api/control/tenants').finally(() => {
    getTenantsInFlight = null;
  });

  return getTenantsInFlight;
}

/**
 * Fetch single tenant details (admin only)
 */
export async function getTenantById(tenantId: string): Promise<TenantDetailResponse> {
  return adminGet<TenantDetailResponse>(`/api/control/tenants/${tenantId}`);
}

export interface ActivateApprovedOnboardingResponse {
  tenant: {
    id: string;
    name: string;
    status: string;
  };
}

export interface ArchiveTenantRequest {
  expectedSlug: string;
  reason: string;
}

export interface ArchiveTenantResponse {
  tenant: {
    id: string;
    slug: string;
    name: string;
    status: string;
    onboarding_status: string;
  };
}

type AuditLogJsonValue =
  | Record<string, unknown>
  | string
  | number
  | boolean
  | null;

/**
 * Explicitly activate an approved onboarding outcome into ACTIVE trade-capable state.
 */
export async function activateApprovedOnboarding(
  tenantId: string
): Promise<ActivateApprovedOnboardingResponse> {
  return adminPost<ActivateApprovedOnboardingResponse>(
    `/api/control/tenants/${tenantId}/onboarding/activate-approved`,
    {}
  );
}

/**
 * Explicitly archive a tenant into CLOSED state across both runtime and org lifecycle records.
 */
export async function archiveTenant(
  tenantId: string,
  payload: ArchiveTenantRequest
): Promise<ArchiveTenantResponse> {
  return adminPost<ArchiveTenantResponse>(`/api/control/tenants/${tenantId}/archive`, payload);
}

// ==================== AUDIT LOGS ====================

export interface AuditLog {
  id: string;
  realm: string | null;
  action: string | null;
  actorId: string | null;
  actorType: string | null;
  entity: string | null;
  entityId: string | null;
  beforeJson: AuditLogJsonValue;
  afterJson: AuditLogJsonValue;
  metadataJson: AuditLogJsonValue;
  tenantId: string | null;
  createdAt: string;
  reasoningLogId: string | null;
  tenant?: {
    slug: string | null;
    name: string | null;
  } | null;
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
 * Schema fields: orgName, primaryAdminEmail, primaryAdminPassword, plan
 * Removed: name, slug, type, ownerEmail, ownerPassword (wrong names; slug/type are backend-derived)
 */
export interface ProvisionTenantRequest {
  orgName: string;
  primaryAdminEmail: string;
  primaryAdminPassword: string;
  /** Compatibility commercial plan alias retained while canonical writes normalize callers. */
  plan?: import('../types').CommercialPlan;
  /** Compatibility tenant identity alias retained while canonical writes normalize callers. */
  tenant_category?: 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL';
  /** Compatibility white-label alias retained while canonical writes normalize callers. */
  is_white_label?: boolean;
  /** Canonical base-family write carrier. */
  base_family?: 'B2B' | 'B2C' | 'INTERNAL';
  /** Canonical aggregator capability write carrier. */
  aggregator_capability?: boolean;
  /** Canonical white-label capability write carrier. */
  white_label_capability?: boolean;
  /** Canonical commercial-plan write carrier. */
  commercial_plan?: import('../types').CommercialPlan;
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

export interface FinanceRecord {
  id: string;
  tenantId: string;
  escrowId: string;
  referenceId: string | null;
  amount: string;
  currency: string;
  status: string;
  settlementType: 'RELEASE_DEBIT';
  createdAt: string;
  createdByUserId: string | null;
  supervision: FinanceSupervisionOutcome | null;
}

export interface FinanceSupervisionOutcome {
  status: 'VERIFIED' | 'FOLLOW_UP_REQUIRED';
  reason: string | null;
  recordedAt: string;
  recordedBy: string | null;
  eventId: string;
}

export interface FinanceRecordsResponse {
  records: FinanceRecord[];
}

export interface FinanceSupervisionOutcomeRequest {
  outcome: 'VERIFIED' | 'FOLLOW_UP_REQUIRED';
  reason: string;
}

export interface FinanceSupervisionOutcomeResponse {
  financeRecordId: string;
  tenantId: string;
  escrowId: string;
  referenceId: string | null;
  outcome: 'VERIFIED' | 'FOLLOW_UP_REQUIRED';
  reason: string;
  eventId: string;
  recordedAt: string;
  wasReplay: boolean;
}

/**
 * Fetch durable finance records (admin only)
 * Backed by settlement ledger rows (RELEASE DEBIT)
 */
export async function getFinanceRecords(): Promise<FinanceRecordsResponse> {
  return adminGet<FinanceRecordsResponse>('/api/control/finance/payouts');
}

/**
 * Record a bounded finance supervision outcome against a canonical finance record.
 * Control-plane only — this does not move funds or mutate settlement truth.
 */
export async function recordFinanceSupervisionOutcome(
  financeRecordId: string,
  body: FinanceSupervisionOutcomeRequest,
  idempotencyKey: string,
): Promise<FinanceSupervisionOutcomeResponse> {
  return adminPostWithHeaders<FinanceSupervisionOutcomeResponse>(
    `/api/control/finance/records/${financeRecordId}/outcome`,
    body,
    { 'Idempotency-Key': idempotencyKey },
  );
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

export interface ComplianceSupervisionOutcome {
  status: 'VERIFIED' | 'FOLLOW_UP_REQUIRED';
  reason: string | null;
  recordedAt: string;
  recordedBy: string | null;
  eventId: string;
}

export interface ComplianceRecord {
  certificationId: string;
  orgId: string;
  certificationType: string;
  stateKey: string;
  issuedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  supervision: ComplianceSupervisionOutcome | null;
}

export interface ComplianceRequestsResponse {
  requests: ComplianceRecord[];
}

export interface ComplianceSupervisionOutcomeRequest {
  outcome: 'VERIFIED' | 'FOLLOW_UP_REQUIRED';
  reason: string;
}

export interface ComplianceSupervisionOutcomeResponse {
  certificationId: string;
  orgId: string;
  outcome: 'VERIFIED' | 'FOLLOW_UP_REQUIRED';
  reason: string;
  eventId: string;
  recordedAt: string;
  wasReplay: boolean;
}

/**
 * Fetch compliance request authority intents (admin only)
 * Backed by EventLog - returns compliance-related authority decisions
 */
export async function getComplianceRequests(): Promise<ComplianceRequestsResponse> {
  return adminGet<ComplianceRequestsResponse>('/api/control/compliance/requests');
}

/**
 * Record a bounded compliance supervision outcome against a certification-backed record.
 * Control-plane only — this does not mutate certification lifecycle truth.
 */
export async function recordComplianceSupervisionOutcome(
  certificationId: string,
  body: ComplianceSupervisionOutcomeRequest,
  idempotencyKey: string,
): Promise<ComplianceSupervisionOutcomeResponse> {
  return adminPostWithHeaders<ComplianceSupervisionOutcomeResponse>(
    `/api/control/compliance/records/${certificationId}/outcome`,
    body,
    { 'Idempotency-Key': idempotencyKey },
  );
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
  entityType: 'TRADE';
  entityId: string;
  orgId: string;
  tradeReference: string;
  eventId: string | null;
  status: string;
  decision: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  resolution: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
}

export interface DisputesResponse {
  disputes: DisputeDecision[];
}

// ==================== ADMINRBAC REGISTRY READ (TECS-FBW-ADMINRBAC-REGISTRY-READ-001) ====================

export type ControlPlaneAdminRole = 'SUPER_ADMIN' | 'SUPPORT' | 'ANALYST';
export type ControlPlaneAdminAccessClass = 'SUPER_ADMIN' | 'PLATFORM_ADMIN';

export interface ControlPlaneAdminRegistryEntry {
  id: string;
  email: string;
  role: ControlPlaneAdminRole;
  accessClass: ControlPlaneAdminAccessClass;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneAdminRegistryResponse {
  admins: ControlPlaneAdminRegistryEntry[];
  count: number;
}

export interface RevokeControlPlaneAdminAccessResponse {
  revokedAdminId: string;
  refreshTokensInvalidated: number;
}

/**
 * Fetch the bounded control-plane admin access registry (SUPER_ADMIN only).
 * Read-only surface: current internal control-plane identities + bounded role posture.
 */
export async function getAdminAccessRegistry(): Promise<ControlPlaneAdminRegistryResponse> {
  return adminGet<ControlPlaneAdminRegistryResponse>('/api/control/admin-access-registry');
}

/**
 * Revoke/remove a bounded control-plane admin access target (SUPER_ADMIN only).
 */
export async function revokeControlPlaneAdminAccess(
  adminId: string
): Promise<RevokeControlPlaneAdminAccessResponse> {
  return adminDelete<RevokeControlPlaneAdminAccessResponse>(`/api/control/admin-access-registry/${adminId}`);
}

/**
 * Fetch disputed trades with canonical trade provenance (admin only)
 * Backed by trade rows in DISPUTED lifecycle state.
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

export interface DisputeAuthorityEventPayload {
  entityType?: 'TRADE';
  orgId?: string;
  resolution?: string | null;
  notes?: string | null;
  escalationEventId?: string | null;
  [key: string]: unknown;
}

export interface DisputeAuthorityEvent {
  id: string;
  eventType: string;
  targetType: string;
  targetId: string;
  occurredAt: string;
  payload: DisputeAuthorityEventPayload;
}

export interface DisputeAuthorityResponse {
  success: boolean;
  data?: DisputeAuthorityEvent;
}

/**
 * Record a dispute resolution decision.
 * POST /api/control/disputes/:disputeId/resolve
 * Requires Idempotency-Key header — generated at click time in the UI.
 * Returns 201 (new write) or 200 (replay); both treated as success.
 */
export async function resolveDispute(
  entityId: string,
  body: DisputeAuthorityBody,
  idempotencyKey: string
): Promise<DisputeAuthorityResponse> {
  return adminPostWithHeaders<DisputeAuthorityResponse>(
    `/api/control/disputes/${entityId}/resolve`,
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
  entityId: string,
  body: DisputeAuthorityBody,
  idempotencyKey: string
): Promise<DisputeAuthorityResponse> {
  return adminPostWithHeaders<DisputeAuthorityResponse>(
    `/api/control/disputes/${entityId}/escalate`,
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

// ==================== G-022 ESCALATIONS (TECS-FBW-006-B) ====================

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

export interface UpgradeEscalationRequest {
  newSeverityLevel: 0 | 1 | 2 | 3 | 4;
  reason: string;
}

export interface UpgradeEscalationResponse {
  escalationEventId: string;
  createdAt: string;
}

export interface ResolveControlEscalationRequest {
  resolutionStatus: 'RESOLVED' | 'OVERRIDDEN';
  reason: string;
}

export interface ResolveControlEscalationResponse {
  escalationEventId: string;
  resolutionStatus: 'RESOLVED' | 'OVERRIDDEN';
  action: 'RESOLVED' | 'OVERRIDDEN';
}

/**
 * List G-022 escalation events for a specified organisation (admin cross-org read).
 * Route: GET /api/control/escalations
 *
 * orgId is mandatory — the endpoint returns 400 if absent (RLS scope boundary).
 * All other params are optional filters passed as URL query parameters.
 *
 * TECS-FBW-006-B adds approved control-plane mutation wiring for upgrade,
 * resolve, and override alongside the existing list surface.
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

/**
 * Upgrade an existing escalation through the control-plane route.
 * Route: POST /api/control/escalations/:id/upgrade
 */
export async function upgradeEscalation(
  escalationId: string,
  request: UpgradeEscalationRequest,
): Promise<UpgradeEscalationResponse> {
  return adminPost<UpgradeEscalationResponse>(`/api/control/escalations/${escalationId}/upgrade`, request);
}

/**
 * Resolve or override an existing escalation through the control-plane route.
 * Route: POST /api/control/escalations/:id/resolve
 */
export async function resolveControlEscalation(
  escalationId: string,
  request: ResolveControlEscalationRequest,
): Promise<ResolveControlEscalationResponse> {
  return adminPost<ResolveControlEscalationResponse>(`/api/control/escalations/${escalationId}/resolve`, request);
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

// ==================== G-018 ESCROW ADMIN READ (PW5-W2) ====================
//
// Route: GET /api/control/escrows          — cross-tenant list (admin)
// Route: GET /api/control/escrows/:id      — detail (cross-tenant, admin)
// Constitutional:
//   D-020-B  Balance is NOT derived from list — no balance field in response.
//   D-017-A  tenantId is an optional admin query-param FILTER; never a body field.
// Read-only — no mutations wired in this tranche.

/**
 * A single escrow account as returned by GET /api/control/escrows.
 * D-020-B: No balance field — balance is always derived from ledger SUM; never stored.
 */
export interface AdminEscrowAccount {
  id: string;
  /** tenant that owns this escrow — visible to admin via cross-org RLS bypass. */
  tenantId: string;
  currency: string;
  lifecycleStateId: string | null;
  /** Human-readable lifecycle state key, e.g. DRAFT | ACTIVE | SETTLED | CLOSED | DISPUTED */
  lifecycleStateKey: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminEscrowListParams {
  /** Optional — narrows result to a single tenant. D-017-A: admin filter only. */
  tenantId?: string;
  limit?: number;
  offset?: number;
}

export interface AdminEscrowListResponse {
  escrows: AdminEscrowAccount[];
  count: number;
  limit: number;
  offset: number;
}

export interface AdminEscrowDetailTransaction {
  id: string;
  tenantId: string;
  escrowId: string;
  entryType: string;
  direction: string;
  amount: string;
  currency: string;
  referenceId: string | null;
  metadata: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
}

export interface AdminEscrowDetailResponse {
  escrow: AdminEscrowAccount;
  balance: number;
  recentTransactions: AdminEscrowDetailTransaction[];
}

/**
 * List escrow accounts across all tenants (admin only).
 * Route: GET /api/control/escrows
 * D-017-A: tenantId is an optional admin filter, NOT a client identity assertion in the body.
 * D-020-B: Response contains no balance field.
 */
export async function adminListEscrows(
  params?: AdminEscrowListParams,
): Promise<AdminEscrowListResponse> {
  const q = new URLSearchParams();
  if (params?.tenantId) q.set('tenantId', params.tenantId);
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  if (params?.offset !== undefined) q.set('offset', String(params.offset));
  const qs = q.toString();
  const url = qs ? `/api/control/escrows?${qs}` : '/api/control/escrows';
  return adminGet<AdminEscrowListResponse>(url);
}

/**
 * Load a single escrow account detail across all tenants (admin only).
 * Route: GET /api/control/escrows/:escrowId
 * D-020-B: balance is server-derived and returned read-only.
 */
export async function adminGetEscrowDetail(
  escrowId: string,
): Promise<AdminEscrowDetailResponse> {
  return adminGet<AdminEscrowDetailResponse>(
    `/api/control/escrows/${encodeURIComponent(escrowId)}`,
  );
}

// ==================== G-021 MAKER-CHECKER ADMIN READ (PW5-W4) ====================
//
// Route: GET /api/control/internal/gov/approvals       — cross-tenant queue (admin)
// Route: GET /api/control/internal/gov/approvals/:id   — single approval (admin)
// Constitutional:
//   Requires X-Texqtic-Internal: true header (enforced by internalOnlyGuard) AND admin JWT.
//   adminGetWithHeaders merges ADMIN_REALM_HEADER + INTERNAL_HEADER on every request.
// Read-only in this tranche — no sign/replay wiring.

/**
 * Internal-only header required by internalOnlyGuard middleware.
 * Must be sent on every /api/control/internal/gov/* request.
 */
const MAKER_CHECKER_INTERNAL_HEADER: Record<string, string> = {
  'X-Texqtic-Internal': 'true',
};

/**
 * A pending-approvals queue item as returned by GET /api/control/internal/gov/approvals.
 * Dates are serialised as ISO 8601 strings over JSON.
 */
export interface AdminPendingApproval {
  id: string;
  /** Tenant that owns this approval request. */
  orgId: string;
  /** TRADE | ESCROW | CERTIFICATION */
  entityType: string;
  entityId: string;
  fromStateKey: string;
  toStateKey: string;
  requestedByActorType: string;
  requestedByRole: string;
  requestReason: string;
  /** REQUESTED | APPROVED | REJECTED | EXPIRED | CANCELLED | ESCALATED */
  status: string;
  expiresAt: string;
  aiTriggered: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminApprovalsListResponse {
  approvals: AdminPendingApproval[];
  count: number;
}

export interface AdminApprovalsQueryParams {
  /** Optional — narrows to a single tenant's approval queue. */
  orgId?: string;
  status?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'ESCALATED';
  entityType?: 'TRADE' | 'ESCROW' | 'CERTIFICATION';
}

/**
 * List pending approvals across all tenants (admin cross-plane read).
 * Route: GET /api/control/internal/gov/approvals
 * Requires X-Texqtic-Internal: true + admin JWT.
 * Returns all REQUESTED + ESCALATED approvals by default (server default).
 */
export async function adminListApprovals(
  params?: AdminApprovalsQueryParams,
): Promise<AdminApprovalsListResponse> {
  const q = new URLSearchParams();
  if (params?.orgId)       q.set('orgId',       params.orgId);
  if (params?.status)      q.set('status',      params.status);
  if (params?.entityType)  q.set('entityType',  params.entityType);
  const qs = q.toString();
  const url = qs ? `/api/control/internal/gov/approvals?${qs}` : '/api/control/internal/gov/approvals';
  return adminGetWithHeaders<AdminApprovalsListResponse>(
    url,
    MAKER_CHECKER_INTERNAL_HEADER,
  );
}

// ==================== PW5-W3 SETTLEMENT ADMIN READ (PW5-W3-FE) ====================
//
// Route: GET /api/control/settlements      — cross-tenant settlement list (admin)
// Constitutional:
//   D-017-A  tenantId is an optional admin query-param FILTER only.
//   Read-only — no mutation wiring in this tranche.
//   Cursor-based pagination (nextCursor / hasMore).
// Implemented: 14aea49 — feat(control-plane): add settlement admin read route

/**
 * A single settlement record as returned by GET /api/control/settlements.
 * Shape sourced from PW5-W3-FE contract (2026-03-12).
 */
export interface AdminSettlement {
  id: string;
  tenantId: string;
  escrowId: string;
  referenceId: string | null;
  amount: number;
  currency: string;
  createdByUserId: string | null;
  createdAt: string;
}

export interface AdminSettlementPagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface AdminSettlementListData {
  settlements: AdminSettlement[];
  pagination: AdminSettlementPagination;
}

export interface AdminSettlementListResponse {
  success: true;
  data: AdminSettlementListData;
}

export interface AdminSettlementListParams {
  /** Optional — narrows result to a single tenant. D-017-A: admin filter only. */
  tenantId?: string;
  escrowId?: string;
  referenceId?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit?: number;
}

/**
 * List settlement records across all tenants (admin only).
 * Route: GET /api/control/settlements
 * D-017-A: tenantId is an optional admin filter, NOT a client identity assertion in the body.
 * Cursor-based pagination — use pagination.nextCursor for subsequent pages.
 */
export async function listSettlements(
  params?: AdminSettlementListParams,
): Promise<AdminSettlementListResponse> {
  const q = new URLSearchParams();
  if (params?.tenantId)    q.set('tenantId',    params.tenantId);
  if (params?.escrowId)    q.set('escrowId',    params.escrowId);
  if (params?.referenceId) q.set('referenceId', params.referenceId);
  if (params?.dateFrom)    q.set('dateFrom',    params.dateFrom);
  if (params?.dateTo)      q.set('dateTo',      params.dateTo);
  if (params?.cursor)      q.set('cursor',      params.cursor);
  if (params?.limit !== undefined) q.set('limit', String(params.limit));
  const qs = q.toString();
  const url = qs ? `/api/control/settlements?${qs}` : '/api/control/settlements';
  return adminGet<AdminSettlementListResponse>(url);
}

// ==================== G-028-C5 CONTROL-PLANE AI INSIGHTS (PW5-G028-C5) ====================
//
// Route: POST /api/control/ai/insights
// Constitutional:
//   SUPER_ADMIN-only — enforced server-side by adminAuthMiddleware + requireAdminRole('SUPER_ADMIN').
//   Optional targetOrgId: backend validates UUID + org existence; 404/ORG_NOT_FOUND if unknown.
//   Server-side org metadata injected into prompt — no client trust of org authority.
//   Closed units: C1 (aaf8748 · 2026-03-15) · C2 (a6eac77 · VERIFIED_COMPLETE).
//   This unit: frontend wiring only.

export interface ControlPlaneAiInsightsRequest {
  targetOrgId?: string;
}

export interface ControlPlaneAiInsightsTargetOrg {
  name: string;
  type: string;
  status: string;
}

export interface ControlPlaneAiInsightsResponse {
  insight: string;
  targetOrgId?: string | null;
  targetOrg?: ControlPlaneAiInsightsTargetOrg | null;
  generatedAt?: string;
}

/**
 * POST /api/control/ai/insights
 * Request control-plane AI insights (SUPER_ADMIN only).
 * Optional targetOrgId — backend validates org and injects metadata into prompt context.
 * Backend contract delivered by PW5-G028-C1 (aaf8748) + PW5-G028-C2 (a6eac77).
 */
export async function requestControlPlaneAiInsights(
  request: ControlPlaneAiInsightsRequest = {}
): Promise<ControlPlaneAiInsightsResponse> {
  return adminPost<ControlPlaneAiInsightsResponse>('/api/control/ai/insights', request);
}
