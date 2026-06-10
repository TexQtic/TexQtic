import type { ZohoBooksRuntimeConfig } from './zohoBooks.config.js';

export type ZohoBooksTokenResult =
  | { status: 'FAILED'; errorSummary: string }
  | { status: 'OK'; accessToken: string; apiDomain: string; expiresIn: number | null };

export type ZohoBooksOrganizationsResult =
  | { status: 'FAILED'; errorSummary: string }
  | { status: 'OK'; organizations: Array<Record<string, unknown>> };

export type ZohoBooksFieldsResult =
  | { status: 'FAILED'; errorSummary: string }
  | { status: 'OK'; fields: Array<Record<string, unknown>>; endpoint: '/settings/fields' | '/customfields' };

export type ZohoBooksSandboxesResult =
  | { status: 'FAILED'; errorSummary: string }
  | { status: 'OK'; sandboxAvailable: 'YES' | 'NO' | 'UNKNOWN' };

export function buildZohoBooksBaseUrl(apiDomain: string): string {
  return `${apiDomain.replace(/\/$/, '')}/books/v3`;
}

function sanitizeErrorSummary(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'UNKNOWN';

  const record = payload as Record<string, unknown>;
  const summary = record.error || record.message || record.errorcode || record.code || record.status;
  return typeof summary === 'string' && summary.trim().length > 0 ? summary.trim() : 'UNKNOWN';
}

async function requestJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const response = await fetch(url, init);
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, json };
}

export async function refreshZohoBooksAccessToken(config: ZohoBooksRuntimeConfig): Promise<ZohoBooksTokenResult> {
  const response = await requestJson('https://accounts.zoho.in/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
    }),
  });

  const accessToken = response.json.access_token;
  const apiDomain = response.json.api_domain;
  const expiresIn = response.json.expires_in;

  if (!response.ok || typeof accessToken !== 'string' || typeof apiDomain !== 'string') {
    return { status: 'FAILED', errorSummary: sanitizeErrorSummary(response.json) };
  }

  return {
    status: 'OK',
    accessToken,
    apiDomain,
    expiresIn: typeof expiresIn === 'number' ? expiresIn : null,
  };
}

export async function fetchZohoBooksOrganizations(apiBaseUrl: string, accessToken: string): Promise<ZohoBooksOrganizationsResult> {
  const response = await requestJson(`${apiBaseUrl}/organizations`, {
    method: 'GET',
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  const organizations = response.json.organizations;
  if (!response.ok || !Array.isArray(organizations)) {
    return { status: 'FAILED', errorSummary: sanitizeErrorSummary(response.json) };
  }

  return { status: 'OK', organizations: organizations as Array<Record<string, unknown>> };
}

export async function fetchZohoBooksCustomFields(
  apiBaseUrl: string,
  accessToken: string,
  organizationId: string,
): Promise<ZohoBooksFieldsResult> {
  const headers = { Authorization: `Zoho-oauthtoken ${accessToken}` };
  const query = `organization_id=${encodeURIComponent(organizationId)}&entity=contact`;

  const settingsResponse = await requestJson(`${apiBaseUrl}/settings/fields?${query}`, {
    method: 'GET',
    headers,
  });

  if (settingsResponse.ok && Array.isArray(settingsResponse.json.fields)) {
    return { status: 'OK', fields: settingsResponse.json.fields as Array<Record<string, unknown>>, endpoint: '/settings/fields' };
  }

  const customFieldsResponse = await requestJson(`${apiBaseUrl}/customfields?${query}`, {
    method: 'GET',
    headers,
  });

  if (customFieldsResponse.ok && Array.isArray(customFieldsResponse.json.fields)) {
    return { status: 'OK', fields: customFieldsResponse.json.fields as Array<Record<string, unknown>>, endpoint: '/customfields' };
  }

  return { status: 'FAILED', errorSummary: sanitizeErrorSummary(customFieldsResponse.json) };
}

export async function fetchZohoBooksSandboxes(
  apiBaseUrl: string,
  accessToken: string,
  organizationId: string,
): Promise<ZohoBooksSandboxesResult> {
  const response = await requestJson(`${apiBaseUrl}/sandboxes?organization_id=${encodeURIComponent(organizationId)}`, {
    method: 'GET',
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  if (response.ok && Array.isArray(response.json.sandboxes)) {
    return { status: 'OK', sandboxAvailable: 'YES' };
  }

  const summary = sanitizeErrorSummary(response.json).toLowerCase();
  if (summary.includes('not enabled') || summary.includes('not available') || summary.includes('early access')) {
    return { status: 'OK', sandboxAvailable: 'NO' };
  }

  return { status: 'OK', sandboxAvailable: 'UNKNOWN' };
}