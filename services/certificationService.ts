/**
 * TexQtic Certification Service — G-019 (TECS-FBW-005)
 *
 * Wires the G-019 certification lifecycle endpoints for both planes:
 *
 *   Tenant plane (via tenantPost / tenantGet — TENANT realm guard):
 *     POST   /api/tenant/certifications                  — create (SUBMITTED state)
 *     GET    /api/tenant/certifications                  — list (own org, D-017-A)
 *     GET    /api/tenant/certifications/:id              — detail (own org)
 *     PATCH  /api/tenant/certifications/:id              — metadata update (type/dates)
 *     POST   /api/tenant/certifications/:id/transition   — lifecycle state advance
 *
 *   Control plane (via adminGet — CONTROL_PLANE realm guard):
 *     GET    /api/control/certifications                 — cross-tenant list
 *     GET    /api/control/certifications/:id             — single cert (admin)
 *
 * Constitutional compliance:
 *   D-017-A  orgId NEVER appears in any request body from the client.
 *            tenantPost/tenantGet enforce TENANT realm; server derives orgId from JWT.
 *   D-020-C  aiTriggered path excluded. If ESCALATION_REQUIRED is returned by a
 *            transition, it is surfaced as a named result state — not re-submitted.
 *   D-020-D  reason is mandatory for create and transition — enforced client-side and
 *            backend-side.
 *   D-022-C  Control plane is read-only; adminPost is not imported here.
 *
 * Out of scope (TECS-FBW-005):
 *   ❌  aiTriggered flag — excluded; cannot be sent to /transition
 *   ❌  Metadata PATCH UI — service type defined here; UI deferred
 */

import { tenantGet, tenantPost, tenantPatch } from './tenantApiClient';
import { adminGet } from './adminApiClient';

// ============================================================
// =  TENANT PLANE — TYPES
// ============================================================

// ─── Shared ──────────────────────────────────────────────────────────────────

/**
 * A certification list item as returned by GET /api/tenant/certifications.
 * Dates are ISO 8601 strings after JSON serialisation.
 */
export interface CertificationListItem {
  id: string;
  certificationType: string;
  /** Lifecycle state key — e.g., SUBMITTED, APPROVED, REVOKED. */
  stateKey: string;
  issuedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Full certification detail as returned by GET /api/tenant/certifications/:id.
 * The server wraps the record in a `certification` key.
 */
export interface CertificationDetail {
  id: string;
  orgId: string;
  certificationType: string;
  stateKey: string;
  issuedAt: string | null;
  expiresAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Input for POST /api/tenant/certifications.
 * D-017-A: orgId is NEVER in this type — server derives from JWT.
 * D-020-D: reason is mandatory.
 */
export interface CreateCertificationInput {
  /** Open-coded label: GOTS, OEKO_TEX, ISO_9001, etc. */
  certificationType: string;
  /** Mandatory justification (D-020-D). */
  reason: string;
  /** ISO 8601 datetime string or null. */
  issuedAt?: string | null;
  /** ISO 8601 datetime string or null. */
  expiresAt?: string | null;
}

/** Response from a successful POST /api/tenant/certifications (201). */
export interface CreateCertificationResult {
  certificationId: string;
  stateKey: string;
  certificationType: string;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export interface ListCertificationsParams {
  stateKey?: string;
  limit?: number;
  offset?: number;
}

export interface ListCertificationsResponse {
  items: CertificationListItem[];
  total: number;
  limit: number;
  offset: number;
}

// ─── Detail ──────────────────────────────────────────────────────────────────

/** Response envelope from GET /api/tenant/certifications/:id. */
export interface GetCertificationResponse {
  certification: CertificationDetail;
}

// ─── Metadata update (type definition; UI deferred) ──────────────────────────

/**
 * Input for PATCH /api/tenant/certifications/:id.
 * D-017-A: orgId never in body.
 * Lifecycle state is NOT updated via PATCH — use /transition.
 */
export interface UpdateCertificationInput {
  certificationType?: string;
  issuedAt?: string | null;
  expiresAt?: string | null;
}

export interface UpdateCertificationResult {
  certificationId: string;
}

// ─── Transition ──────────────────────────────────────────────────────────────

/**
 * Input for POST /api/tenant/certifications/:id/transition.
 * D-017-A: orgId never in body.
 * D-020-C: aiTriggered is NOT included — excluded from TECS-FBW-005 scope.
 * D-020-D: reason is mandatory.
 */
export interface TransitionCertificationInput {
  /** Target lifecycle state key, e.g., APPROVED, REVOKED. */
  toStateKey: string;
  /** Mandatory justification (D-020-D). */
  reason: string;
  /** Actor role performing the transition, e.g., TENANT_ADMIN, AUDITOR. */
  actorRole: string;
}

/**
 * Possible non-error outcomes of a certification transition.
 * D-020-C: ESCALATION_REQUIRED is surfaced as a read-only result — not re-submitted.
 */
export type TransitionStatus = 'APPLIED' | 'PENDING_APPROVAL' | 'ESCALATION_REQUIRED';

export interface TransitionCertificationResult {
  certificationId: string;
  /** One of APPLIED, PENDING_APPROVAL, ESCALATION_REQUIRED (D-020-C). */
  status: TransitionStatus;
  newStateKey: string;
}

// ============================================================
// =  CONTROL PLANE — TYPES (D-022-C: read-only)
// ============================================================

/**
 * A certification row as returned by GET /api/control/certifications.
 */
export interface AdminCertificationListItem {
  id: string;
  orgId: string;
  certificationType: string;
  stateKey: string;
  issuedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminListCertificationsParams {
  /** Optional: filter by org UUID. */
  orgId?: string;
  /** Optional: filter by lifecycle state key. */
  stateKey?: string;
  limit?: number;
  offset?: number;
}

export interface AdminListCertificationsResponse {
  certifications: AdminCertificationListItem[];
  count: number;
  limit: number;
  offset: number;
}

/** Full admin cert detail from GET /api/control/certifications/:id. */
export interface AdminCertificationDetail {
  id: string;
  orgId: string;
  certificationType: string;
  stateKey: string;
  isTerminal: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// =  TENANT PLANE — FUNCTIONS
// ============================================================

/**
 * Create a certification in SUBMITTED lifecycle state.
 * D-017-A: orgId derived server-side from JWT.
 * D-020-D: reason is required.
 *
 * @throws APIError on non-2xx server response.
 */
export function createCertification(
  input: CreateCertificationInput,
): Promise<CreateCertificationResult> {
  return tenantPost<CreateCertificationResult>('/api/tenant/certifications', input);
}

/**
 * List certifications for the authenticated org.
 * D-017-A: no orgId in request — server derives from JWT.
 */
export function listCertifications(
  params?: ListCertificationsParams,
): Promise<ListCertificationsResponse> {
  const qs = new URLSearchParams();
  if (params?.stateKey) qs.set('stateKey', params.stateKey);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const q = qs.toString();
  return tenantGet<ListCertificationsResponse>(
    q ? `/api/tenant/certifications?${q}` : '/api/tenant/certifications',
  );
}

/**
 * Get a single certification by id (tenant-scoped).
 * Server enforces org boundary via RLS + dbContext orgId.
 */
export function getCertification(id: string): Promise<GetCertificationResponse> {
  return tenantGet<GetCertificationResponse>(`/api/tenant/certifications/${id}`);
}

/**
 * Update certification metadata.
 * D-017-A: orgId never in body.
 * Lifecycle state is NOT updated via this function — use transitionCertification().
 * NOTE: PATCH UI is deferred in TECS-FBW-005; this function is available for future use.
 */
export function updateCertification(
  id: string,
  input: UpdateCertificationInput,
): Promise<UpdateCertificationResult> {
  return tenantPatch<UpdateCertificationResult>(`/api/tenant/certifications/${id}`, input);
}

/**
 * Advance the certification lifecycle state via the server StateMachineService.
 *
 * D-020-C: aiTriggered is NOT sent — excluded from TECS-FBW-005.
 *           If ESCALATION_REQUIRED is returned, surface it as a result state only.
 * D-020-D: reason is mandatory; must be non-empty.
 *
 * @throws APIError on non-2xx server response.
 */
export function transitionCertification(
  id: string,
  input: TransitionCertificationInput,
): Promise<TransitionCertificationResult> {
  return tenantPost<TransitionCertificationResult>(
    `/api/tenant/certifications/${id}/transition`,
    input,
  );
}

// ============================================================
// =  CONTROL PLANE — FUNCTIONS (D-022-C: read-only)
// ============================================================

/**
 * List certifications across all orgs (admin cross-tenant read).
 * D-022-C: No mutation operations — read-only.
 * Optional orgId filter to scope to one tenant.
 */
export function adminListCertifications(
  params?: AdminListCertificationsParams,
): Promise<AdminListCertificationsResponse> {
  const qs = new URLSearchParams();
  if (params?.orgId) qs.set('orgId', params.orgId);
  if (params?.stateKey) qs.set('stateKey', params.stateKey);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));
  const q = qs.toString();
  return adminGet<AdminListCertificationsResponse>(
    q ? `/api/control/certifications?${q}` : '/api/control/certifications',
  );
}

/**
 * Get a single certification by id (admin, cross-tenant).
 * D-022-C: Read-only — no mutation.
 */
export function adminGetCertification(id: string): Promise<AdminCertificationDetail> {
  return adminGet<AdminCertificationDetail>(`/api/control/certifications/${id}`);
}
