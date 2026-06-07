/**
 * tier0Service — IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01
 *
 * Client-side service wrapper for POST /api/public/tier0/request-access.
 * No authentication required — fully public endpoint.
 *
 * Forbidden fields MUST NOT be sent:
 *   inviteToken, mainAppSessionToken, sessionToken, authToken, accessToken,
 *   refreshToken, idToken, privateInviteUrl, inviteUrl, token, tokenHash,
 *   mainAppTier0RequestId (server-generated)
 */

import { post } from './apiClient';

// Exact enum values enforced by server Zod schema (routes/public.ts).
export type Tier0RoleIntent = 'supplier' | 'buyer' | 'service_provider' | 'unknown';

export interface Tier0RequestPayload {
  roleIntent: Tier0RoleIntent;
  name: string;
  firstTouchTimestamp: string; // ISO 8601 UTC datetime — captured at component mount
  // At least one of email or phone is required (server .refine())
  email?: string;
  phone?: string;
  // Derived from URL params — not user-entered
  sourceChannel?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  referrerUrl?: string;
  campaignId?: string;
  acquisitionContext?: string;
  referralCode?: string;
  // Optional user-entered fields
  companyName?: string;
  city?: string;
  state?: string;
  productCategoryInterest?: string;
  consentToContact?: boolean;
  notes?: string;
  // Honeypot — must always be empty string for real users
  h_trap?: string;
}

export interface Tier0RequestResponse {
  requestId: string;
  crmReceiptId: string | null;
  status: string;
  message: string;
}

/**
 * Submit a Tier 0 request-access form to the Main App backend.
 * Returns the server-generated requestId and CRM receipt details on success.
 * Throws APIError on non-2xx response (handled by apiClient).
 */
export async function submitTier0RequestAccess(
  params: Tier0RequestPayload,
): Promise<Tier0RequestResponse> {
  // apiClient.apiRequest already unwraps the { success: true, data: {...} } envelope,
  // returning data.data directly. Type as Tier0RequestResponse to avoid a double-unwrap.
  return post<Tier0RequestResponse>(
    '/api/public/tier0/request-access',
    params,
  );
}
