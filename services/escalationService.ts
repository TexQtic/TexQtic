/**
 * TexQtic Escalation Service — Tenant Plane (TECS-FBW-006-B)
 *
 * Tenant-plane surface for escalation reads plus the approved mutation subset:
 *   - list escalation events
 *   - create escalation
 *   - resolve own escalation
 *
 * D-017-A: orgId is NEVER sent by the client in any request body.
 *           tenantGet() enforces the TENANT realm guard and sets X-Texqtic-Realm: tenant.
 *           The server derives org scope exclusively from JWT claims (orgId / tenantId).
 *
 * G-022 constitutional compliance:
 *   D-022-A  Severity monotonicity is enforced server-side only — not a frontend concern.
 *   D-022-B  Org freeze state is server-derived; this service only reads existing rows.
 *   D-022-C  Kill switch is informational; freezeRecommendation is read-only here.
 *   D-022-D  Override path is control-plane only; this service exposes no override wiring.
 */

import { tenantGet, tenantPost } from './tenantApiClient';

// ==================== G-022 ESCALATION (TECS-FBW-006-A) ====================

/**
 * A single escalation event row as returned by GET /api/tenant/escalations.
 *
 * Fields reflect the production EscalationEventRow shape from escalation.service.ts.
 * Dates are serialised as ISO 8601 strings by JSON serialisation.
 */
export interface EscalationEvent {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  parentEscalationId: string | null;
  source: string;
  /** Severity 0–4. 0 = informational, 4 = platform-wide freeze candidate (D-022-A). */
  severityLevel: number;
  /** Informational flag only — does NOT auto-toggle kill switch (D-022-C). */
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

export interface EscalationListParams {
  entityType?: string;
  entityId?: string;
  status?: string;
  limit?: number;
}

/**
 * Response envelope from GET /api/tenant/escalations.
 * count reflects the number of rows returned (not total DB count).
 */
export interface EscalationListResponse {
  escalations: EscalationEvent[];
  count: number;
}

export type TenantEscalationEntityType = 'TRADE' | 'ESCROW' | 'APPROVAL' | 'LIFECYCLE_LOG';

export interface CreateTenantEscalationRequest {
  entityType: TenantEscalationEntityType;
  entityId: string;
  reason: string;
  severityLevel: 0 | 1;
}

export interface CreateTenantEscalationResponse {
  escalationEventId: string;
  createdAt: string;
}

export interface ResolveTenantEscalationRequest {
  reason: string;
}

export interface ResolveTenantEscalationResponse {
  escalationEventId: string;
  resolutionStatus: 'RESOLVED';
}

/**
 * List escalation events for the authenticated tenant.
 *
 * D-017-A: No orgId / tenantId is included in this request — TENANT realm guard on
 *           tenantGet() is sufficient. The server scopes results to the JWT orgId.
 *
 * @param params - Optional filters (entityType, entityId, status, limit)
 * @returns EscalationListResponse
 */
export async function listEscalations(params?: EscalationListParams): Promise<EscalationListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.entityType) searchParams.set('entityType', params.entityType);
  if (params?.entityId)   searchParams.set('entityId',   params.entityId);
  if (params?.status)     searchParams.set('status',     params.status);
  if (params?.limit !== undefined) searchParams.set('limit', String(params.limit));

  const qs = searchParams.toString();
  const endpoint = qs ? `/api/tenant/escalations?${qs}` : '/api/tenant/escalations';

  return tenantGet<EscalationListResponse>(endpoint);
}

/**
 * Create a tenant-scoped escalation.
 * Route: POST /api/tenant/escalations
 * D-017-A: orgId / tenantId never sent by client; server derives tenant scope from JWT.
 */
export async function createEscalation(
  request: CreateTenantEscalationRequest,
): Promise<CreateTenantEscalationResponse> {
  return tenantPost<CreateTenantEscalationResponse>('/api/tenant/escalations', request);
}

/**
 * Resolve an existing tenant escalation through the tenant-plane route only.
 * Route: POST /api/tenant/escalations/:id/resolve
 */
export async function resolveEscalation(
  escalationId: string,
  request: ResolveTenantEscalationRequest,
): Promise<ResolveTenantEscalationResponse> {
  return tenantPost<ResolveTenantEscalationResponse>(`/api/tenant/escalations/${escalationId}/resolve`, request);
}
