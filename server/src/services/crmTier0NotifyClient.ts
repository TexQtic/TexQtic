/**
 * CRM Tier 0 Notify Client
 *
 * Calls POST {crmBaseUrl}/api/webhooks/mainapp-tier0-captures
 * with the shared x-crm-mainapp-tier0-secret header.
 *
 * Design authority: DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01 (commit a1b6ab34)
 * CRM receiver implementation: IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01 (CRM commit 64ba995)
 * CRM runtime verified: VERIFY-CRM-MAINAPP-TIER0-RECEIVER-SECRET-PROVISION-AND-RERUN-01 (CRM commit 06adaf5)
 *
 * Security rules:
 *   - crmSecret MUST NOT appear in logs, responses, or error messages.
 *   - Forbidden cross-system fields (inviteToken, session tokens, etc.) must not be passed here.
 *   - Call site is responsible for validating/stripping forbidden fields before invoking this function.
 *   - This client does NOT create accounts, tenants, memberships, or invites.
 *   - Response shape is CRM-dictated; only safe fields (crmReceiptId, intakeStatus) are forwarded to caller.
 */

const NOTIFY_TIMEOUT_MS = 8000;
const CRM_TIER0_ENDPOINT_PATH = '/api/webhooks/mainapp-tier0-captures';

export interface CrmTier0NotifyResult {
  /** HTTP status code returned by the CRM receiver. */
  status: number;
  /** Parsed JSON body from the CRM receiver, or null if not parseable. */
  ack: Record<string, unknown> | null;
}

/**
 * Notify the CRM Tier 0 receiver with a validated Tier 0 capture payload.
 *
 * @param crmBaseUrl - Base URL of the CRM app (e.g. https://crm.texqtic.com). Must be HTTPS in production.
 * @param crmSecret  - Shared secret for x-crm-mainapp-tier0-secret header. Never log this value.
 * @param payload    - Sanitized Tier 0 payload. Caller must have removed all forbidden fields.
 * @throws           - Throws if the network call fails or times out (caller handles and returns 503).
 */
export async function notifyCrmTier0Capture(
  crmBaseUrl: string,
  crmSecret: string,
  payload: Record<string, unknown>,
): Promise<CrmTier0NotifyResult> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), NOTIFY_TIMEOUT_MS);

  try {
    const response = await fetch(`${crmBaseUrl}${CRM_TIER0_ENDPOINT_PATH}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-crm-mainapp-tier0-secret': crmSecret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    let ack: Record<string, unknown> | null = null;
    try {
      ack = (await response.json()) as Record<string, unknown>;
    } catch {
      // Non-JSON or empty body from CRM — treat as null ack.
      // Caller relies on HTTP status code for routing; null ack is safe.
    }

    return { status: response.status, ack };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw err;
  }
}
