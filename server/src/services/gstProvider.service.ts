/**
 * GST Provider Adapter — TTP Slice 2 Provider Integration
 *
 * Implements the provider boundary for GSTIN verification.
 * Design authority: DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01
 * Provider decision: DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01 (addendum 82058b94)
 * Selected provider: Deepvue (deepvue.ai, docs.deepvue.ai)
 *
 * Security rules:
 *   - GST_PROVIDER_CLIENT_ID and GST_PROVIDER_CLIENT_SECRET MUST NOT appear in logs.
 *   - Bearer access token MUST NOT appear in logs.
 *   - PAN numbers, Aadhaar fields, and contact mobile/email are stripped from all
 *     stored payloads by sanitizeDeepvuePayload().
 *   - Provider failures MUST NOT surface as tenant submission failures.
 *   - This service does not submit GST filings or mutate GSTN data.
 *   - Credentials are read from process.env only; never hard-coded or logged.
 *
 * Architecture note:
 *   Provider HTTP call happens inline inside submitVerification (which may be
 *   within a DB transaction from the route layer). This is acceptable for the
 *   noop/scaffold case. Real Deepvue activation must be preceded by a separate
 *   architecture review (VERIFY-MAINAPP-GST-KYC-PROVIDER-EVIDENCE-SCAFFOLD-DEPLOYMENT-01).
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_TIMEOUT_MS = 8_000; // Mirror crmTier0NotifyClient pattern
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1_000; // 5 min before JWT expiry
const DEEPVUE_BASE_URL = 'https://production.deepvue.tech';
const NAME_MATCH_THRESHOLD = 0.8;

// ─── Input / Output types ─────────────────────────────────────────────────────

export interface GstAdapterInput {
  gstin: string;
  legalNameOnGst: string;
  stateCode: string;
  orgId: string;
}

export interface GstFilingRecord {
  return_type: string;
  financial_year: string;
  tax_period: string;
  date_of_filing: string;
  status: string;
  mode_of_filing: string;
}

export interface GstVerificationData {
  /** Verified GSTIN from provider response */
  gstin: string;
  /** Legal registered name */
  legalName: string;
  /** Trade/business name */
  businessName: string;
  /** Raw status string from provider (e.g. "Active", "Inactive") */
  rawStatus: string;
  /** Normalised to TTP_GST_FILING_STATUS values */
  normalizedFilingStatus: string;
  taxpayerType: string;
  constitutionOfBusiness: string;
  dateOfRegistration: string;
  stateJurisdiction: string;
  annualTurnover: string;
  promoters: string[];
  /** Bounded to ≤12 recent filing records (GSTR1 + GSTR3B + GSTR9/9C) */
  filingSummary: GstFilingRecord[];
  /** Provider-issued transaction/correlation ID — for audit/support */
  transactionId: string;
  /** Unix milliseconds from provider response envelope */
  providerTimestamp: number;
  /** PII-stripped provider payload for raw_verification_json storage */
  sanitizedPayload: Record<string, unknown>;
}

export type GstProviderResult =
  | { ok: true; data: GstVerificationData }
  | { ok: false; reason: 'TIMEOUT' | 'PROVIDER_ERROR' | 'INVALID_GSTIN' };

// ─── Adapter interface ────────────────────────────────────────────────────────

export interface GstProviderAdapter {
  /** Human-readable provider name stored in provider_name column. */
  readonly name: string;
  verifyGstin(input: GstAdapterInput): Promise<GstProviderResult>;
}

// ─── Noop adapter (CI / local without credentials) ───────────────────────────

/**
 * NoopGstProviderAdapter — safe stub used when GST_PROVIDER is not configured.
 * Returns PROVIDER_ERROR immediately; never makes network calls.
 * Records route to admin fallback queue without breaking tenant submission.
 */
export class NoopGstProviderAdapter implements GstProviderAdapter {
  readonly name = 'noop';

  async verifyGstin(_input: GstAdapterInput): Promise<GstProviderResult> {
    return { ok: false, reason: 'PROVIDER_ERROR' };
  }
}

// ─── Status normalisation ─────────────────────────────────────────────────────

/**
 * Normalise Deepvue status strings to TTP_GST_FILING_STATUS values.
 * Handles both Basic endpoint (data.sts) and Advanced endpoint (data.gstin_status).
 */
export function normalizeDeepvueStatus(rawStatus: string | undefined | null): string {
  switch ((rawStatus ?? '').trim()) {
    case 'Active':
      return 'ACTIVE';
    case 'Inactive':
      return 'INACTIVE';
    case 'Cancelled':
      return 'CANCELLED';
    case 'Suspended':
      return 'SUSPENDED';
    default:
      return 'UNKNOWN';
  }
}

// ─── Name normalisation & fuzzy match ────────────────────────────────────────

/**
 * Suffix normalisations applied before edit-distance comparison.
 * Handles common Indian business entity type variants.
 */
const SUFFIX_PATTERNS: [RegExp, string][] = [
  [/\bprivate\s+limited\b/gi, 'pvt ltd'],
  [/\bpvt\.\s*ltd\.(?=\s|$)/gi, 'pvt ltd'],
  [/\bp\.\s*ltd\.(?=\s|$)/gi, 'pvt ltd'],
  [/\bpvt\s+ltd\b/gi, 'pvt ltd'],
  [/\blimited\s+liability\s+partnership\b/gi, 'llp'],
  [/\blimited\b/gi, 'ltd'],
  [/\(india\)/gi, ''],
];

/** Normalise a business name for fuzzy comparison. */
export function normalizeName(name: string): string {
  let n = name.toLowerCase().trim();
  for (const [pattern, replacement] of SUFFIX_PATTERNS) {
    n = n.replace(pattern, replacement);
  }
  return n.replace(/\s+/g, ' ').trim();
}

/** Compute edit distance (Levenshtein) between two strings. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j]!, curr[j - 1]!, prev[j - 1]!);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]!;
  }
  return prev[n]!;
}

/** Return similarity score ∈ [0,1] between two business names (suffix-normalised). */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  return 1 - editDistance(na, nb) / maxLen;
}

/** Return true if names are similar enough for auto-approval (threshold 0.80). */
export function nameMatches(a: string, b: string): boolean {
  return nameSimilarity(a, b) >= NAME_MATCH_THRESHOLD;
}

// ─── Payload sanitiser ────────────────────────────────────────────────────────

/**
 * Strip all PII and sensitive fields from a Deepvue GST Advanced response.
 *
 * Excluded (never stored):
 *   - pan_number           (PAN — RISK-04 policy)
 *   - aadhaar_validation   (biometric data — DPDP 2023)
 *   - aadhaar_validation_date
 *   - contact_details.mobile and contact_details.email (privacy — DPDP 2023)
 *
 * Retained (business verification context):
 *   - GSTIN, legal_name, business_name, status, taxpayer_type, constitution
 *   - jurisdiction, turnover, registration dates, business activities
 *   - promoter names (names only, no personal identifiers)
 *   - filing_status (bounded to ≤12 recent records)
 *   - contact_details.address (retained — not personal)
 *   - transaction_id and timestamp (for audit/support traceability)
 */
export function sanitizeDeepvuePayload(data: Record<string, unknown>): Record<string, unknown> {
  const {
    pan_number: _pan,
    aadhaar_validation: _aadh,
    aadhaar_validation_date: _aadhDate,
    contact_details: rawContact,
    filing_status: rawFiling,
    ...rest
  } = data;

  // Sanitise contact_details: keep address, strip mobile/email
  let sanitizedContact: Record<string, unknown> | undefined;
  if (rawContact && typeof rawContact === 'object') {
    const contact = rawContact as Record<string, unknown>;
    const sanitizeEntry = (entry: unknown): unknown => {
      if (!entry || typeof entry !== 'object') return entry;
      const { mobile: _m, email: _e, ...safeFields } = entry as Record<string, unknown>;
      return safeFields;
    };
    sanitizedContact = {
      ...(contact.principal !== undefined ? { principal: sanitizeEntry(contact.principal) } : {}),
      ...(Array.isArray(contact.additional)
        ? { additional: (contact.additional as unknown[]).map(sanitizeEntry) }
        : {}),
    };
  }

  // Bound filing history to ≤12 recent records (prevent unbounded JSONB growth)
  let boundedFiling: unknown;
  if (Array.isArray(rawFiling)) {
    const inner = Array.isArray(rawFiling[0]) ? (rawFiling[0] as unknown[]) : rawFiling;
    boundedFiling = inner.slice(0, 12);
  }

  return {
    ...rest,
    ...(sanitizedContact !== undefined ? { contact_details: sanitizedContact } : {}),
    ...(boundedFiling !== undefined ? { filing_status: boundedFiling } : {}),
  };
}

// ─── Deepvue token cache (per-adapter-instance) ───────────────────────────────

interface DeepvueTokenCache {
  accessToken: string;
  expiryMs: number;
}

// ─── Deepvue adapter ──────────────────────────────────────────────────────────

/**
 * DeepvueGstAdapter — primary GST verification provider.
 *
 * Auth flow:
 *   POST /v1/authorize → Bearer JWT valid ~24h
 *   All calls: Authorization: Bearer {token} + x-api-key: {client_secret}
 *   Token is cached per adapter instance; refreshed 5 min before expiry.
 *
 * Primary endpoint: GET /v1/verification/gstin-advanced?gstin_number={GSTIN}
 *
 * IMPORTANT: Do not instantiate with real credentials in this unit.
 *   Real activation requires: sandbox credentials, DPA, SOC2 review, Paresh approval.
 *   See: VERIFY-MAINAPP-GST-KYC-PROVIDER-EVIDENCE-SCAFFOLD-DEPLOYMENT-01
 */
export class DeepvueGstAdapter implements GstProviderAdapter {
  readonly name = 'deepvue';

  private _tokenCache: DeepvueTokenCache | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
  ) {}

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this._tokenCache && now < this._tokenCache.expiryMs - TOKEN_REFRESH_BUFFER_MS) {
      return this._tokenCache.accessToken;
    }

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
      const response = await fetch(`${DEEPVUE_BASE_URL}/v1/authorize`, {
        method: 'POST',
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Deepvue auth HTTP ${response.status}`);
      }

      const json = (await response.json()) as {
        access_token?: string;
        expiry?: string;
      };

      if (!json.access_token || !json.expiry) {
        throw new Error('Deepvue auth: missing access_token or expiry in response');
      }

      this._tokenCache = {
        accessToken: json.access_token,
        expiryMs: new Date(json.expiry).getTime(),
      };

      return this._tokenCache.accessToken;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if ((err as Error)?.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      throw err;
    }
  }

  async verifyGstin(input: GstAdapterInput): Promise<GstProviderResult> {
    let accessToken: string;
    try {
      accessToken = await this.getAccessToken();
    } catch (err: unknown) {
      if ((err as Error)?.message === 'TIMEOUT') {
        return { ok: false, reason: 'TIMEOUT' };
      }
      return { ok: false, reason: 'PROVIDER_ERROR' };
    }

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
      const url = `${DEEPVUE_BASE_URL}/v1/verification/gstin-advanced?gstin_number=${encodeURIComponent(input.gstin)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-api-key': this.clientSecret,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Token expired — clear cache so next call re-authenticates
      if (response.status === 401 || response.status === 403) {
        this._tokenCache = null;
        return { ok: false, reason: 'PROVIDER_ERROR' };
      }

      // Invalid GSTIN / validation failure
      if (response.status === 422) {
        return { ok: false, reason: 'INVALID_GSTIN' };
      }

      // Rate limit / upstream unavailable / server error
      if (response.status === 429 || response.status === 500 || response.status === 503) {
        return { ok: false, reason: 'PROVIDER_ERROR' };
      }

      if (!response.ok) {
        try {
          const errorBody = (await response.json()) as Record<string, unknown>;
          const errMsg = String(
            (errorBody.data as Record<string, unknown> | undefined)?.message ??
              errorBody.detail ??
              '',
          ).toLowerCase();
          if (errMsg.includes('no records') || errMsg.includes('invalid gstin')) {
            return { ok: false, reason: 'INVALID_GSTIN' };
          }
        } catch {
          // Non-JSON error body — ignore
        }
        return { ok: false, reason: 'PROVIDER_ERROR' };
      }

      const json = (await response.json()) as {
        code?: number;
        timestamp?: number;
        transaction_id?: string;
        sub_code?: string;
        message?: string;
        data?: Record<string, unknown>;
      };

      if (!json.data) {
        return { ok: false, reason: 'PROVIDER_ERROR' };
      }

      // Business-level "no records found" inside 200 response
      const dataMsg = String(
        (json.data.message as string | undefined) ?? '',
      ).toLowerCase();
      const subCode = String(json.sub_code ?? '');
      if (
        subCode === 'NO_RECORDS_FOUND' ||
        dataMsg.includes('no records') ||
        dataMsg.includes('invalid gstin')
      ) {
        return { ok: false, reason: 'INVALID_GSTIN' };
      }

      // Normalise status — Advanced uses gstin_status, Basic uses sts
      const rawStatus = String(
        (json.data.gstin_status as string | undefined) ??
          (json.data.sts as string | undefined) ??
          '',
      );
      const normalizedFilingStatus = normalizeDeepvueStatus(rawStatus);

      // Sanitise payload before storage
      const sanitizedPayload = sanitizeDeepvuePayload(json.data);

      // Bound filing summary to ≤12 recent records
      const rawFiling = json.data.filing_status;
      const innerFiling = Array.isArray(rawFiling)
        ? Array.isArray(rawFiling[0])
          ? (rawFiling[0] as GstFilingRecord[])
          : (rawFiling as GstFilingRecord[])
        : [];
      const filingSummary = innerFiling.slice(0, 12);

      const data: GstVerificationData = {
        gstin: String(json.data.gstin ?? input.gstin),
        legalName: String(
          (json.data.legal_name as string | undefined) ??
            (json.data.lgnm as string | undefined) ??
            '',
        ),
        businessName: String(
          (json.data.business_name as string | undefined) ??
            (json.data.tradeNam as string | undefined) ??
            '',
        ),
        rawStatus,
        normalizedFilingStatus,
        taxpayerType: String(
          (json.data.taxpayer_type as string | undefined) ??
            (json.data.dty as string | undefined) ??
            '',
        ),
        constitutionOfBusiness: String(
          (json.data.constitution_of_business as string | undefined) ??
            (json.data.ctb as string | undefined) ??
            '',
        ),
        dateOfRegistration: String(
          (json.data.date_of_registration as string | undefined) ??
            (json.data.rgdt as string | undefined) ??
            '',
        ),
        stateJurisdiction: String(
          (json.data.state_jurisdiction as string | undefined) ??
            (json.data.stj as string | undefined) ??
            '',
        ),
        annualTurnover: String((json.data.annual_turnover as string | undefined) ?? ''),
        promoters: Array.isArray(json.data.promoters)
          ? (json.data.promoters as unknown[])
              .map(p => String(p).trim())
              .filter(Boolean)
          : [],
        filingSummary,
        transactionId: String(json.transaction_id ?? ''),
        providerTimestamp: Number(json.timestamp ?? Date.now()),
        sanitizedPayload,
      };

      return { ok: true, data };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if ((err as Error)?.name === 'AbortError') {
        return { ok: false, reason: 'TIMEOUT' };
      }
      return { ok: false, reason: 'PROVIDER_ERROR' };
    }
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a GstProviderAdapter from the GST_PROVIDER env var.
 * Defaults to noop when env var is absent or unknown.
 * Credentials missing for deepvue → fallback to noop with console.warn.
 */
export function createGstProvider(providerName: string): GstProviderAdapter {
  switch (providerName.toLowerCase()) {
    case 'deepvue': {
      const clientId = process.env.GST_PROVIDER_CLIENT_ID;
      const clientSecret = process.env.GST_PROVIDER_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        // Credentials absent — warn and degrade to noop (no throw, no secret log)
        console.warn('[GST] GST_PROVIDER=deepvue but credentials missing; using noop fallback');
        return new NoopGstProviderAdapter();
      }
      return new DeepvueGstAdapter(clientId, clientSecret);
    }
    case 'noop':
    default:
      return new NoopGstProviderAdapter();
  }
}
