/**
 * zohoBooks.sync.ts
 *
 * Controlled live Zoho Books Contact upsert.
 *
 * This module implements ONE controlled operation:
 *   createZohoBooksContact() — a single idempotent upsert to Zoho Books
 *   using PUT /contacts with X-Upsert idempotency headers.
 *
 * Safety guarantees:
 *   - Only `PUT /contacts` is used (upsert, never POST-only).
 *   - `X-Unique-Identifier-Key: cf_texqtic_org_id` prevents duplicates.
 *   - Access token is never returned, logged, or persisted.
 *   - Raw Zoho response is never returned; only sanitized result fields.
 *   - No GST/PAN/Aadhaar/provider data in smoke payload.
 *   - Custom field shape fallback (api_name → label) is attempted once on 400.
 *
 * Not wired into activation lifecycle — invoked only from controlled smoke scripts.
 */

import type { ZohoBooksRuntimeConfig } from './zohoBooks.config.js';
import type { ZohoBooksActivationSnapshot } from './zohoBooks.payload.js';
import {
  buildZohoBooksBaseUrl,
  refreshZohoBooksAccessToken,
} from './zohoBooks.client.js';
import {
  buildZohoBooksContactPayload,
  buildZohoBooksIdempotencyHeaders,
} from './zohoBooks.payload.js';

// ── Result type ───────────────────────────────────────────────────────────────

export type ZohoBooksSyncResult =
  | { status: 'CONTACT_CREATED'; contactId: string; liveMutationAttempted: true; shapeFallbackUsed: boolean }
  | { status: 'CONTACT_UPDATED'; contactId: string; liveMutationAttempted: true; shapeFallbackUsed: boolean }
  | { status: 'SYNC_FAILED'; errorSummary: string; liveMutationAttempted: true; shapeFallbackUsed: boolean };

// ── Internal helpers ──────────────────────────────────────────────────────────

function sanitizeError(json: Record<string, unknown>): string {
  const candidate = json['message'] ?? json['error'] ?? json['code'] ?? json['errorcode'];
  return typeof candidate === 'string' && candidate.trim().length > 0
    ? candidate.trim().slice(0, 200)
    : 'UNKNOWN';
}

function extractContactId(json: Record<string, unknown>): string | null {
  const contact = json['contact'];
  if (contact && typeof contact === 'object') {
    const id = (contact as Record<string, unknown>)['contact_id'];
    if (typeof id === 'string' && id.trim().length > 0) return id.trim();
    if (typeof id === 'number') return String(id);
  }
  return null;
}

/**
 * Build the label-shape custom_fields array as a fallback if api_name shape fails.
 * Labels must match the display names of the custom fields in the Zoho Books UI.
 */
function buildLabelShapeCustomFields(
  snapshot: ZohoBooksActivationSnapshot,
): Array<{ label: string; value: string }> {
  const source = snapshot.source?.trim() ?? 'TexQtic Main App';
  return [
    { label: 'TexQtic Org ID',       value: snapshot.organization.id },
    { label: 'TexQtic Tenant ID',    value: snapshot.tenant.id },
    { label: 'TexQtic Plan Tier',    value: snapshot.tenant.plan },
    { label: 'TexQtic Activated At', value: snapshot.activatedAt },
    { label: 'TexQtic Source',       value: source },
  ];
}

async function callZohoContactUpsert(
  apiBaseUrl: string,
  organizationId: string,
  accessToken: string,
  body: Record<string, unknown>,
  idempotencyHeaders: Record<string, string>,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const url = `${apiBaseUrl}/contacts?organization_id=${encodeURIComponent(organizationId)}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
      ...idempotencyHeaders,
    },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, json };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upsert a Zoho Books Contact for the given activation snapshot.
 *
 * Uses PUT with X-Upsert idempotency headers to prevent duplicate contacts.
 * Attempts api_name custom field shape first; falls back to label shape once on 400.
 *
 * Does NOT accept, reject, validate, or override GST verification state.
 * Does NOT contain GSTIN, PAN, Aadhaar, or provider payload fields in smoke mode.
 * Does NOT log or return raw access tokens.
 * Does NOT retry beyond one fallback attempt.
 */
export async function createZohoBooksContact(
  config: ZohoBooksRuntimeConfig,
  snapshot: ZohoBooksActivationSnapshot,
): Promise<ZohoBooksSyncResult> {
  // 1. Token refresh
  const tokenResult = await refreshZohoBooksAccessToken(config);
  if (tokenResult.status === 'FAILED') {
    return {
      status: 'SYNC_FAILED',
      errorSummary: `TOKEN_REFRESH_FAILED: ${tokenResult.errorSummary}`,
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    };
  }

  const { accessToken, apiDomain } = tokenResult;
  const apiBaseUrl = buildZohoBooksBaseUrl(apiDomain);
  const idempotencyHeaders = buildZohoBooksIdempotencyHeaders(snapshot.organization.id);

  // 2. Primary attempt — api_name shape
  const primaryPayload = buildZohoBooksContactPayload(snapshot);
  const primary = await callZohoContactUpsert(
    apiBaseUrl,
    config.organizationId,
    accessToken,
    primaryPayload as unknown as Record<string, unknown>,
    idempotencyHeaders,
  );

  if (primary.ok) {
    const contactId = extractContactId(primary.json);
    if (!contactId) {
      return {
        status: 'SYNC_FAILED',
        errorSummary: 'ZOHO_OK_BUT_NO_CONTACT_ID',
        liveMutationAttempted: true,
        shapeFallbackUsed: false,
      };
    }
    return {
      status: primary.status === 201 ? 'CONTACT_CREATED' : 'CONTACT_UPDATED',
      contactId,
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    };
  }

  // 3. If HTTP 400 — attempt label-shape fallback (once only)
  if (primary.status === 400) {
    const primaryError = sanitizeError(primary.json);
    const fallbackPayload = {
      ...primaryPayload,
      custom_fields: buildLabelShapeCustomFields(snapshot),
    };

    const fallback = await callZohoContactUpsert(
      apiBaseUrl,
      config.organizationId,
      accessToken,
      fallbackPayload as unknown as Record<string, unknown>,
      idempotencyHeaders,
    );

    if (fallback.ok) {
      const contactId = extractContactId(fallback.json);
      if (!contactId) {
        return {
          status: 'SYNC_FAILED',
          errorSummary: 'ZOHO_FALLBACK_OK_BUT_NO_CONTACT_ID',
          liveMutationAttempted: true,
          shapeFallbackUsed: true,
        };
      }
      return {
        status: fallback.status === 201 ? 'CONTACT_CREATED' : 'CONTACT_UPDATED',
        contactId,
        liveMutationAttempted: true,
        shapeFallbackUsed: true,
      };
    }

    // Both shapes failed
    const fallbackError = sanitizeError(fallback.json);
    return {
      status: 'SYNC_FAILED',
      errorSummary: `PRIMARY_400(${primaryError}) FALLBACK_${fallback.status}(${fallbackError})`,
      liveMutationAttempted: true,
      shapeFallbackUsed: true,
    };
  }

  // 4. Other failure (401, 403, 5xx, etc.)
  return {
    status: 'SYNC_FAILED',
    errorSummary: `ZOHO_HTTP_${primary.status}: ${sanitizeError(primary.json)}`,
    liveMutationAttempted: true,
    shapeFallbackUsed: false,
  };
}
