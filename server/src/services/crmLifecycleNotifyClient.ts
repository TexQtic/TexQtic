/**
 * CRM Lifecycle Notify Client
 *
 * Fire-and-forget dispatcher for Main App → CRM lifecycle events.
 * Noop-safe when CRM_LIFECYCLE_BASE_URL is unset.
 *
 * Design authority:  DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01  (commit 034bf8da)
 * Decision authority: DECIDE-CRM-LIFECYCLE-SYNC-PAYLOAD-PRIVACY-AND-FIELD-CONTRACT-01 (commit 2ef22038)
 *
 * Security rules:
 *   - Full CRM payload MUST NOT appear in logs.
 *   - email MUST NOT appear in logs, even in error context.
 *   - GSTIN is excluded in v1 (GSTIN_EXCLUDED_IN_V1); must not be passed to these functions.
 *   - CRM_LIFECYCLE_INGESTION_SECRET MUST NOT appear in logs.
 *   - These functions MUST NOT throw into the caller.
 *   - This client does not create accounts, tenants, memberships, or invites.
 *   - v1 delivery posture: FIRE_AND_FORGET_V1.
 *   - v1 does not write to any DB table (no outbox).
 */

const NOTIFY_TIMEOUT_MS = 8000;
const CRM_LIFECYCLE_ENDPOINT_PATH = '/api/webhooks/mainapp-lifecycle-events';

// ─── Result type ──────────────────────────────────────────────────────────────

export type CrmLifecycleDispatchResult =
  | { dispatch_status: 'SENT'; http_status: number }
  | { dispatch_status: 'NOOP_SKIPPED' }
  | { dispatch_status: 'FAILED'; http_status?: number; error_message: string };

// ─── Config helper ────────────────────────────────────────────────────────────

function getCrmLifecycleConfig(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.CRM_LIFECYCLE_BASE_URL;
  if (!baseUrl) {
    return null;
  }

  const secret = process.env.CRM_LIFECYCLE_INGESTION_SECRET;
  if (!secret) {
    // Base URL set but secret missing — safe warning, skip dispatch.
    // Secret value must never be included in this log.
    console.warn('[crm-lifecycle] CRM_LIFECYCLE_BASE_URL is set but CRM_LIFECYCLE_INGESTION_SECRET is missing; dispatch skipped');
    return null;
  }

  return { baseUrl, secret };
}

// ─── Idempotency key ──────────────────────────────────────────────────────────

function buildIdempotencyKey(event: string, orgId: string, epochMs: number): string {
  return `${event}:${orgId}:${epochMs}`;
}

// ─── Internal sender ──────────────────────────────────────────────────────────

/**
 * Internal: POST the payload to the CRM lifecycle endpoint.
 * On any failure: logs safe fields only, returns FAILED status, never throws.
 */
async function sendLifecycleEvent(
  baseUrl: string,
  secret: string,
  event: string,
  orgId: string,
  idempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<CrmLifecycleDispatchResult> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}${CRM_LIFECYCLE_ENDPOINT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-crm-mainapp-lifecycle-secret': secret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return { dispatch_status: 'SENT', http_status: response.status };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    const isAbort = err instanceof Error && err.name === 'AbortError';
    const errorMessage = isAbort
      ? 'CRM lifecycle notify timed out'
      : 'CRM lifecycle notify network error';

    // Log only safe fields — never log full payload, email, GSTIN, or secret.
    console.warn('[crm-lifecycle] dispatch failed', {
      event,
      org_id: orgId,
      idempotency_key: idempotencyKey,
      dispatch_status: 'FAILED',
      error_message: errorMessage,
    });

    return { dispatch_status: 'FAILED', error_message: errorMessage };
  }
}

// ─── Param types ──────────────────────────────────────────────────────────────

export interface CrmAttributionPayload {
  source_channel: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

export interface NotifyRegistrationSubmittedParams {
  orgId: string;
  tenantId: string;
  /** Lowercase-normalized. MUST NOT be logged. Included in registration event only. */
  email: string;
  legalName: string;
  roleIntent: string;
  jurisdiction: string;
  plan: string;
  orgStatus: string;
  externalOrchestrationRef: string | null;
  attribution: CrmAttributionPayload | null;
}

export interface NotifyGstEventParams {
  orgId: string;
  tenantId: string;
  registrationType: string;
  stateCode: string;
  orgStatus: string;
}

export interface NotifyProviderCheckParams {
  orgId: string;
  tenantId: string;
  providerResult: string;
  providerName: string;
  autoApproved: boolean;
  orgStatus: string;
}

export interface NotifyAdminReviewApprovedParams {
  orgId: string;
  tenantId: string;
  reviewNotesCategory?: string | null;
}

export interface NotifyAdminReviewRejectedParams {
  orgId: string;
  tenantId: string;
  rejectionReasonCategory?: string | null;
}

export interface NotifyAdminReviewNeedsMoreInfoParams {
  orgId: string;
  tenantId: string;
  reviewNotesCategory?: string | null;
}

// ─── Notify functions ─────────────────────────────────────────────────────────

/**
 * Emit org.registration.submitted.v1
 * Email is included in this event only (EMAIL_INCLUDED_IN_V1).
 * Email MUST NOT be logged anywhere.
 */
export async function notifyRegistrationSubmitted(
  params: NotifyRegistrationSubmittedParams,
): Promise<CrmLifecycleDispatchResult> {
  const cfg = getCrmLifecycleConfig();
  if (!cfg) return { dispatch_status: 'NOOP_SKIPPED' };

  const event = 'org.registration.submitted.v1';
  const epochMs = Date.now();
  const idempotencyKey = buildIdempotencyKey(event, params.orgId, epochMs);

  const payload: Record<string, unknown> = {
    event,
    idempotency_key: idempotencyKey,
    occurred_at: new Date(epochMs).toISOString(),
    org_id: params.orgId,
    tenant_id: params.tenantId,
    schema_version: '1.0',
    email: params.email,
    legal_name: params.legalName,
    role_intent: params.roleIntent,
    jurisdiction: params.jurisdiction,
    plan: params.plan,
    org_status: params.orgStatus,
    external_orchestration_ref: params.externalOrchestrationRef,
    attribution: params.attribution,
  };

  return sendLifecycleEvent(cfg.baseUrl, cfg.secret, event, params.orgId, idempotencyKey, payload);
}

/**
 * Emit org.gst.submitted.v1 (first GST submission).
 * GSTIN is excluded in v1 (gstin: null).
 */
export async function notifyGstSubmitted(
  params: NotifyGstEventParams,
): Promise<CrmLifecycleDispatchResult> {
  const cfg = getCrmLifecycleConfig();
  if (!cfg) return { dispatch_status: 'NOOP_SKIPPED' };

  const event = 'org.gst.submitted.v1';
  const epochMs = Date.now();
  const idempotencyKey = buildIdempotencyKey(event, params.orgId, epochMs);

  const payload: Record<string, unknown> = {
    event,
    idempotency_key: idempotencyKey,
    occurred_at: new Date(epochMs).toISOString(),
    org_id: params.orgId,
    tenant_id: params.tenantId,
    schema_version: '1.0',
    org_status: params.orgStatus,
    registration_type: params.registrationType,
    state_code: params.stateCode,
    gstin: null, // GSTIN_EXCLUDED_IN_V1
  };

  return sendLifecycleEvent(cfg.baseUrl, cfg.secret, event, params.orgId, idempotencyKey, payload);
}

/**
 * Emit org.gst.resubmitted.v1 (resubmission after REJECTED or NEEDS_MORE_INFO).
 * GSTIN is excluded in v1 (gstin: null).
 */
export async function notifyGstResubmitted(
  params: NotifyGstEventParams,
): Promise<CrmLifecycleDispatchResult> {
  const cfg = getCrmLifecycleConfig();
  if (!cfg) return { dispatch_status: 'NOOP_SKIPPED' };

  const event = 'org.gst.resubmitted.v1';
  const epochMs = Date.now();
  const idempotencyKey = buildIdempotencyKey(event, params.orgId, epochMs);

  const payload: Record<string, unknown> = {
    event,
    idempotency_key: idempotencyKey,
    occurred_at: new Date(epochMs).toISOString(),
    org_id: params.orgId,
    tenant_id: params.tenantId,
    schema_version: '1.0',
    org_status: params.orgStatus,
    registration_type: params.registrationType,
    state_code: params.stateCode,
    gstin: null, // GSTIN_EXCLUDED_IN_V1
  };

  return sendLifecycleEvent(cfg.baseUrl, cfg.secret, event, params.orgId, idempotencyKey, payload);
}

/**
 * Emit org.gst.provider_check.completed.v1
 * provider_result and provider_name are safe category strings.
 * provider_request_id, provider_verified_at, raw JSON are excluded.
 */
export async function notifyProviderCheckCompleted(
  params: NotifyProviderCheckParams,
): Promise<CrmLifecycleDispatchResult> {
  const cfg = getCrmLifecycleConfig();
  if (!cfg) return { dispatch_status: 'NOOP_SKIPPED' };

  const event = 'org.gst.provider_check.completed.v1';
  const epochMs = Date.now();
  const idempotencyKey = buildIdempotencyKey(event, params.orgId, epochMs);

  const payload: Record<string, unknown> = {
    event,
    idempotency_key: idempotencyKey,
    occurred_at: new Date(epochMs).toISOString(),
    org_id: params.orgId,
    tenant_id: params.tenantId,
    schema_version: '1.0',
    provider_result: params.providerResult,
    provider_name: params.providerName,
    auto_approved: params.autoApproved,
    org_status: params.orgStatus,
  };

  return sendLifecycleEvent(cfg.baseUrl, cfg.secret, event, params.orgId, idempotencyKey, payload);
}

/**
 * Emit org.gst.admin_reviewed.approved.v1
 * Raw review_notes are never included.
 */
export async function notifyAdminReviewedApproved(
  params: NotifyAdminReviewApprovedParams,
): Promise<CrmLifecycleDispatchResult> {
  const cfg = getCrmLifecycleConfig();
  if (!cfg) return { dispatch_status: 'NOOP_SKIPPED' };

  const event = 'org.gst.admin_reviewed.approved.v1';
  const epochMs = Date.now();
  const idempotencyKey = buildIdempotencyKey(event, params.orgId, epochMs);

  const payload: Record<string, unknown> = {
    event,
    idempotency_key: idempotencyKey,
    occurred_at: new Date(epochMs).toISOString(),
    org_id: params.orgId,
    tenant_id: params.tenantId,
    schema_version: '1.0',
    review_outcome: 'APPROVED',
    org_status: 'VERIFICATION_APPROVED',
    review_notes_category: params.reviewNotesCategory ?? 'ADMIN_MANUAL_APPROVAL',
  };

  return sendLifecycleEvent(cfg.baseUrl, cfg.secret, event, params.orgId, idempotencyKey, payload);
}

/**
 * Emit org.gst.admin_reviewed.rejected.v1
 * Raw review_notes are never included.
 */
export async function notifyAdminReviewedRejected(
  params: NotifyAdminReviewRejectedParams,
): Promise<CrmLifecycleDispatchResult> {
  const cfg = getCrmLifecycleConfig();
  if (!cfg) return { dispatch_status: 'NOOP_SKIPPED' };

  const event = 'org.gst.admin_reviewed.rejected.v1';
  const epochMs = Date.now();
  const idempotencyKey = buildIdempotencyKey(event, params.orgId, epochMs);

  const payload: Record<string, unknown> = {
    event,
    idempotency_key: idempotencyKey,
    occurred_at: new Date(epochMs).toISOString(),
    org_id: params.orgId,
    tenant_id: params.tenantId,
    schema_version: '1.0',
    review_outcome: 'REJECTED',
    org_status: 'VERIFICATION_REJECTED',
    rejection_reason_category: params.rejectionReasonCategory ?? 'OTHER_REVIEW_REQUIRED',
  };

  return sendLifecycleEvent(cfg.baseUrl, cfg.secret, event, params.orgId, idempotencyKey, payload);
}

/**
 * Emit org.gst.admin_reviewed.needs_more_info.v1
 * Raw review_notes are never included.
 */
export async function notifyAdminReviewedNeedsMoreInfo(
  params: NotifyAdminReviewNeedsMoreInfoParams,
): Promise<CrmLifecycleDispatchResult> {
  const cfg = getCrmLifecycleConfig();
  if (!cfg) return { dispatch_status: 'NOOP_SKIPPED' };

  const event = 'org.gst.admin_reviewed.needs_more_info.v1';
  const epochMs = Date.now();
  const idempotencyKey = buildIdempotencyKey(event, params.orgId, epochMs);

  const payload: Record<string, unknown> = {
    event,
    idempotency_key: idempotencyKey,
    occurred_at: new Date(epochMs).toISOString(),
    org_id: params.orgId,
    tenant_id: params.tenantId,
    schema_version: '1.0',
    review_outcome: 'NEEDS_MORE_INFO',
    org_status: 'VERIFICATION_NEEDS_MORE_INFO',
    review_notes_category: params.reviewNotesCategory ?? 'OTHER_REVIEW_REQUIRED',
  };

  return sendLifecycleEvent(cfg.baseUrl, cfg.secret, event, params.orgId, idempotencyKey, payload);
}
