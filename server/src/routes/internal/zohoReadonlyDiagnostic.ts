import type { FastifyPluginAsync } from 'fastify';

/**
 * TEMPORARY OPS DIAGNOSTIC ENDPOINT
 *
 * Route: GET /api/internal/diagnostics/zoho-readonly
 * Guard: x-texqtic-diagnostic-token
 *
 * Purpose:
 * - Verify deployed runtime can access Zoho Production env vars
 * - Perform read-only Zoho checks (token refresh, organizations, custom fields, sandbox)
 *
 * Removal:
 * - Must be removed immediately after OPS-ZOHO production runtime verification closes.
 */

type PresenceStatus = 'PRESENT_NON_EMPTY' | 'MISSING_OR_EMPTY';
type ToggleStatus = 'YES' | 'NO' | 'UNKNOWN';

type DiagnosticResponse = {
  ok: boolean;
  runtime: string;
  env: Record<string, PresenceStatus>;
  zoho: {
    token_refresh: 'OK' | 'FAILED';
    api_domain: string;
    expires_in: number | null;
    organizations_check: 'OK' | 'FAILED';
    configured_org_id_match: 'YES' | 'NO';
    org_id_masked: string;
    custom_fields_endpoint: string;
    entity_key: 'contact';
    cf_texqtic_org_id: ToggleStatus;
    cf_texqtic_org_id_unique: ToggleStatus;
    cf_texqtic_tenant_id: ToggleStatus;
    cf_texqtic_plan_tier: ToggleStatus;
    cf_texqtic_activated_at: ToggleStatus;
    cf_texqtic_source: ToggleStatus;
    sandbox_available: ToggleStatus;
    error?: string;
  };
  contact_creation: 'FORBIDDEN_NOT_ATTEMPTED';
};

type ZohoEnv = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  organizationId: string;
  apiDomain: string;
};

type TokenResult = {
  ok: boolean;
  accessToken?: string;
  apiDomain?: string;
  expiresIn: number | null;
  error?: string;
};

type JsonObject = Record<string, unknown>;

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getValue(obj: JsonObject, key: string): unknown {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

function maskOrgId(value: string | undefined): string {
  if (!value) return '...MISSING';
  const v = String(value);
  return v.length <= 4 ? `...${v}` : `...${v.slice(-4)}`;
}

function presence(value: string | undefined): PresenceStatus {
  return value && value.trim().length > 0 ? 'PRESENT_NON_EMPTY' : 'MISSING_OR_EMPTY';
}

function sanitizeError(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return 'UNKNOWN';
  const value = payload as Record<string, unknown>;
  return (
    toNonEmptyString(getValue(value, 'error')) ||
    toNonEmptyString(getValue(value, 'message')) ||
    toNonEmptyString(getValue(value, 'errorcode')) ||
    toNonEmptyString(getValue(value, 'code')) ||
    'UNKNOWN'
  );
}

function buildEnvStatus(): Record<string, PresenceStatus> {
  return {
    ZOHO_BOOKS_CLIENT_ID: presence(process.env.ZOHO_BOOKS_CLIENT_ID),
    ZOHO_BOOKS_CLIENT_SECRET: presence(process.env.ZOHO_BOOKS_CLIENT_SECRET),
    ZOHO_BOOKS_REFRESH_TOKEN: presence(process.env.ZOHO_BOOKS_REFRESH_TOKEN),
    ZOHO_BOOKS_ORGANIZATION_ID: presence(process.env.ZOHO_BOOKS_ORGANIZATION_ID),
    ZOHO_BOOKS_API_DOMAIN: presence(process.env.ZOHO_BOOKS_API_DOMAIN),
    ZOHO_DIAGNOSTIC_TOKEN: presence(process.env.ZOHO_DIAGNOSTIC_TOKEN),
  };
}

function readZohoEnv(): ZohoEnv | null {
  const clientId = toNonEmptyString(process.env.ZOHO_BOOKS_CLIENT_ID);
  const clientSecret = toNonEmptyString(process.env.ZOHO_BOOKS_CLIENT_SECRET);
  const refreshToken = toNonEmptyString(process.env.ZOHO_BOOKS_REFRESH_TOKEN);
  const organizationId = toNonEmptyString(process.env.ZOHO_BOOKS_ORGANIZATION_ID);
  const apiDomain = toNonEmptyString(process.env.ZOHO_BOOKS_API_DOMAIN);

  if (!clientId || !clientSecret || !refreshToken || !organizationId || !apiDomain) {
    return null;
  }

  return { clientId, clientSecret, refreshToken, organizationId, apiDomain };
}

function buildBaseResponse(orgId: string | undefined, apiDomain: string | undefined): DiagnosticResponse {
  return {
    ok: false,
    runtime: 'vercel-production',
    env: buildEnvStatus(),
    zoho: {
      token_refresh: 'FAILED',
      api_domain: apiDomain || 'MISSING',
      expires_in: null,
      organizations_check: 'FAILED',
      configured_org_id_match: 'NO',
      org_id_masked: maskOrgId(orgId),
      custom_fields_endpoint: 'NONE',
      entity_key: 'contact',
      cf_texqtic_org_id: 'UNKNOWN',
      cf_texqtic_org_id_unique: 'UNKNOWN',
      cf_texqtic_tenant_id: 'UNKNOWN',
      cf_texqtic_plan_tier: 'UNKNOWN',
      cf_texqtic_activated_at: 'UNKNOWN',
      cf_texqtic_source: 'UNKNOWN',
      sandbox_available: 'UNKNOWN',
    },
    contact_creation: 'FORBIDDEN_NOT_ATTEMPTED',
  };
}

async function refreshZohoAccessToken(zohoEnv: ZohoEnv): Promise<TokenResult> {
  const tokenRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: zohoEnv.clientId,
      client_secret: zohoEnv.clientSecret,
      refresh_token: zohoEnv.refreshToken,
    }),
  });

  const tokenJson = (await tokenRes.json().catch(() => ({}))) as JsonObject;
  const accessToken = toNonEmptyString(getValue(tokenJson, 'access_token'));

  if (!tokenRes.ok || !accessToken) {
    return {
      ok: false,
      expiresIn: null,
      error: sanitizeError(tokenJson),
    };
  }

  const apiDomain =
    toNonEmptyString(getValue(tokenJson, 'api_domain')) || toNonEmptyString(zohoEnv.apiDomain);

  return {
    ok: true,
    accessToken,
    apiDomain,
    expiresIn: typeof tokenJson.expires_in === 'number' ? tokenJson.expires_in : null,
  };
}

function createZohoGet(accessToken: string) {
  return async (url: string) => {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });
    const json = (await res.json().catch(() => ({}))) as JsonObject;
    return { ok: res.ok, status: res.status, json };
  };
}

function evaluateOrganizations(
  response: DiagnosticResponse,
  organizations: unknown,
  organizationId: string,
): void {
  if (!Array.isArray(organizations)) return;
  response.zoho.organizations_check = 'OK';
  const match = organizations.some(row => {
    if (!row || typeof row !== 'object') return false;
    return toNonEmptyString((row as JsonObject).organization_id) === organizationId;
  });
  response.zoho.configured_org_id_match = match ? 'YES' : 'NO';
}

function applyCustomFieldStatuses(response: DiagnosticResponse, fields: Array<JsonObject>): void {
  const byApiName = new Map<string, JsonObject>();
  for (const field of fields) {
    const apiName = toNonEmptyString(field.api_name);
    if (apiName) byApiName.set(apiName, field);
  }

  const hasField = (name: string): ToggleStatus => (byApiName.has(name) ? 'YES' : 'NO');

  response.zoho.cf_texqtic_org_id = hasField('cf_texqtic_org_id');
  response.zoho.cf_texqtic_tenant_id = hasField('cf_texqtic_tenant_id');
  response.zoho.cf_texqtic_plan_tier = hasField('cf_texqtic_plan_tier');
  response.zoho.cf_texqtic_activated_at = hasField('cf_texqtic_activated_at');
  response.zoho.cf_texqtic_source = hasField('cf_texqtic_source');

  const orgIdField = byApiName.get('cf_texqtic_org_id');
  if (!orgIdField) return;
  if (typeof orgIdField.is_unique === 'boolean') {
    response.zoho.cf_texqtic_org_id_unique = orgIdField.is_unique ? 'YES' : 'NO';
    return;
  }
  if (typeof orgIdField.unique === 'boolean') {
    response.zoho.cf_texqtic_org_id_unique = orgIdField.unique ? 'YES' : 'NO';
  }
}

async function runZohoReadonlyChecks(
  response: DiagnosticResponse,
  zohoEnv: ZohoEnv,
): Promise<void> {
  const token = await refreshZohoAccessToken(zohoEnv);
  if (!token.ok || !token.accessToken || !token.apiDomain) {
    response.zoho.error = token.error || 'TOKEN_REFRESH_FAILED';
    return;
  }

  response.zoho.token_refresh = 'OK';
  response.zoho.api_domain = token.apiDomain;
  response.zoho.expires_in = token.expiresIn;

  const zohoGet = createZohoGet(token.accessToken);
  const encodedOrgId = encodeURIComponent(zohoEnv.organizationId);

  const orgRes = await zohoGet(`${token.apiDomain}/books/v3/organizations`);
  evaluateOrganizations(response, orgRes.json.organizations, zohoEnv.organizationId);
  if (!orgRes.ok && !response.zoho.error) {
    response.zoho.error = sanitizeError(orgRes.json);
  }

  await fetchAndApplyCustomFields(response, zohoGet, token.apiDomain, encodedOrgId);
  await fetchAndApplySandbox(response, zohoGet, token.apiDomain, encodedOrgId);

  response.ok =
    response.zoho.token_refresh === 'OK' &&
    response.zoho.organizations_check === 'OK' &&
    response.zoho.configured_org_id_match === 'YES' &&
    response.zoho.cf_texqtic_org_id === 'YES' &&
    response.zoho.cf_texqtic_org_id_unique === 'YES' &&
    response.zoho.cf_texqtic_tenant_id === 'YES' &&
    response.zoho.cf_texqtic_plan_tier === 'YES' &&
    response.zoho.cf_texqtic_activated_at === 'YES' &&
    response.zoho.cf_texqtic_source === 'YES';
}

async function fetchAndApplyCustomFields(
  response: DiagnosticResponse,
  zohoGet: (url: string) => Promise<{ ok: boolean; status: number; json: JsonObject }>,
  apiDomain: string,
  encodedOrgId: string,
): Promise<void> {
  let fields: Array<JsonObject> = [];
  const settingsFields = await zohoGet(
    `${apiDomain}/books/v3/settings/fields?organization_id=${encodedOrgId}&entity=contact`,
  );

  if (settingsFields.ok && Array.isArray(settingsFields.json.fields)) {
    fields = settingsFields.json.fields as Array<JsonObject>;
    response.zoho.custom_fields_endpoint = '/settings/fields';
    applyCustomFieldStatuses(response, fields);
    return;
  }

  const simpleFields = await zohoGet(
    `${apiDomain}/books/v3/customfields?organization_id=${encodedOrgId}&entity=contact`,
  );

  if (simpleFields.ok && Array.isArray(simpleFields.json.fields)) {
    fields = simpleFields.json.fields as Array<JsonObject>;
    response.zoho.custom_fields_endpoint = '/customfields';
    applyCustomFieldStatuses(response, fields);
    return;
  }

  response.zoho.custom_fields_endpoint = `FAILED(status:${settingsFields.status}/${simpleFields.status})`;
  if (!response.zoho.error) {
    response.zoho.error = sanitizeError(simpleFields.json);
  }
}

async function fetchAndApplySandbox(
  response: DiagnosticResponse,
  zohoGet: (url: string) => Promise<{ ok: boolean; status: number; json: JsonObject }>,
  apiDomain: string,
  encodedOrgId: string,
): Promise<void> {
  const sandboxRes = await zohoGet(`${apiDomain}/books/v3/sandboxes?organization_id=${encodedOrgId}`);

  if (sandboxRes.ok && Array.isArray(sandboxRes.json.sandboxes)) {
    response.zoho.sandbox_available = 'YES';
    return;
  }

  const msg = sanitizeError(sandboxRes.json).toLowerCase();
  if (msg.includes('not enabled') || msg.includes('not available') || msg.includes('does not exist')) {
    response.zoho.sandbox_available = 'NO';
  }
}

const zohoReadonlyDiagnosticRoutes: FastifyPluginAsync = async fastify => {
  fastify.get('/diagnostics/zoho-readonly', async (request, reply) => {
    const headerToken = toNonEmptyString(request.headers['x-texqtic-diagnostic-token']) || '';
    const expectedToken = toNonEmptyString(process.env.ZOHO_DIAGNOSTIC_TOKEN) || '';

    if (!headerToken || !expectedToken || headerToken !== expectedToken) {
      return reply.code(401).send({
        ok: false,
        code: 'UNAUTHORIZED_DIAGNOSTIC',
      });
    }

    const zohoEnv = readZohoEnv();
    const response = buildBaseResponse(
      toNonEmptyString(process.env.ZOHO_BOOKS_ORGANIZATION_ID),
      toNonEmptyString(process.env.ZOHO_BOOKS_API_DOMAIN),
    );

    if (!zohoEnv) {
      response.zoho.error = 'MISSING_REQUIRED_ENV';
      return reply.code(200).send(response);
    }

    try {
      await runZohoReadonlyChecks(response, zohoEnv);
      return reply.code(200).send(response);
    } catch (error) {
      response.zoho.error =
        error instanceof Error && error.message.trim().length > 0 ? error.name : 'UNKNOWN';
      return reply.code(200).send(response);
    }
  });
};

export default zohoReadonlyDiagnosticRoutes;
