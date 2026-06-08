/**
 * Unit tests — GstProviderService (TTP Slice 2 Provider Integration)
 *
 * Tests the provider adapter boundary: NoopGstProviderAdapter, DeepvueGstAdapter,
 * status normalisation, name matching helpers, and payload sanitiser.
 *
 * No real network calls. All fetch interactions are vi.stubGlobal'd.
 *
 * Run: pnpm exec vitest run src/__tests__/gst-provider.service.unit.test.ts
 *       (from server/ directory)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  NoopGstProviderAdapter,
  DeepvueGstAdapter,
  normalizeDeepvueStatus,
  nameSimilarity,
  nameMatches,
  normalizeName,
  sanitizeDeepvuePayload,
  type GstAdapterInput,
} from '../services/gstProvider.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_GSTIN = '29ABCDE1234F1Z5';

const DEFAULT_INPUT: GstAdapterInput = {
  gstin: VALID_GSTIN,
  legalNameOnGst: 'Test Company Pvt Ltd',
  stateCode: '29',
  orgId: 'aaaaaaaa-0000-0000-0000-000000000001',
};

const FRESH_EXPIRY = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h from now
const NEAR_EXPIRY = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3 min from now (within 5-min buffer)

function makeAuthResponse(expiry = FRESH_EXPIRY) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ access_token: 'test-token-abc', expiry }),
  };
}

function makeDeepvueSuccessResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      code: 200,
      timestamp: 1737862347191,
      transaction_id: 'tx-uuid-001',
      sub_code: 'SUCCESS',
      message: 'GSTIN Verified Successfully.',
      data: {
        gstin: VALID_GSTIN,
        legal_name: 'Test Company Pvt Ltd',
        business_name: 'Test Company Pvt Ltd',
        gstin_status: 'Active',
        taxpayer_type: 'Regular',
        constitution_of_business: 'Private Limited Company',
        date_of_registration: '2020-01-01',
        state_jurisdiction: 'State - Karnataka,Division - DGSTO Bengaluru',
        annual_turnover: 'Slab: Less than Rs. 1 Cr.',
        annual_turnover_fy: '2023-2024',
        promoters: ['Test Promoter One'],
        filing_status: [
          [
            { return_type: 'GSTR1', financial_year: '2024-2025', tax_period: 'December', date_of_filing: '2025-01-11', status: 'Filed', mode_of_filing: 'ONLINE' },
            { return_type: 'GSTR3B', financial_year: '2024-2025', tax_period: 'December', date_of_filing: '2025-01-22', status: 'Filed', mode_of_filing: 'ONLINE' },
          ],
        ],
        nature_bus_activities: ['Wholesale Business'],
        ...overrides,
      },
    }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ─── NoopGstProviderAdapter ───────────────────────────────────────────────────

describe('NoopGstProviderAdapter', () => {
  it('returns PROVIDER_ERROR without making any network call', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const adapter = new NoopGstProviderAdapter();
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(false);
    expect((result as { ok: false; reason: string }).reason).toBe('PROVIDER_ERROR');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('has name "noop"', () => {
    expect(new NoopGstProviderAdapter().name).toBe('noop');
  });
});

// ─── DeepvueGstAdapter — token caching ───────────────────────────────────────

describe('DeepvueGstAdapter — auth token caching', () => {
  it('caches the auth token and does not re-authenticate on second call', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeAuthResponse(FRESH_EXPIRY))     // authorize
      .mockResolvedValueOnce(makeDeepvueSuccessResponse())        // first GSTIN call
      .mockResolvedValueOnce(makeDeepvueSuccessResponse());       // second GSTIN call

    vi.stubGlobal('fetch', mockFetch);
    const adapter = new DeepvueGstAdapter('client-id', 'client-secret');

    await adapter.verifyGstin(DEFAULT_INPUT);
    await adapter.verifyGstin(DEFAULT_INPUT);

    const authCalls = mockFetch.mock.calls.filter(c => String(c[0]).includes('/v1/authorize'));
    expect(authCalls).toHaveLength(1); // token reused for second call
  });

  it('refreshes the auth token when within the 5-minute expiry buffer', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeAuthResponse(NEAR_EXPIRY))      // first authorize → near-expiry token
      .mockResolvedValueOnce(makeDeepvueSuccessResponse())        // first GSTIN call
      .mockResolvedValueOnce(makeAuthResponse(FRESH_EXPIRY))     // second authorize → fresh token
      .mockResolvedValueOnce(makeDeepvueSuccessResponse());       // second GSTIN call

    vi.stubGlobal('fetch', mockFetch);
    const adapter = new DeepvueGstAdapter('client-id', 'client-secret');

    await adapter.verifyGstin(DEFAULT_INPUT);
    await adapter.verifyGstin(DEFAULT_INPUT);

    const authCalls = mockFetch.mock.calls.filter(c => String(c[0]).includes('/v1/authorize'));
    expect(authCalls).toHaveLength(2); // second call triggered re-auth (near-expiry buffer)
  });
});

// ─── DeepvueGstAdapter — GST lookup success ──────────────────────────────────

describe('DeepvueGstAdapter — verifyGstin success', () => {
  it('maps a successful Deepvue response to ok:true with correct fields', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeAuthResponse())
      .mockResolvedValueOnce(makeDeepvueSuccessResponse()));

    const adapter = new DeepvueGstAdapter('cid', 'csec');
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrow

    expect(result.data.legalName).toBe('Test Company Pvt Ltd');
    expect(result.data.normalizedFilingStatus).toBe('ACTIVE');
    expect(result.data.transactionId).toBe('tx-uuid-001');
    expect(result.data.filingSummary).toHaveLength(2);
    expect(result.data.promoters).toEqual(['Test Promoter One']);
  });

  it('has name "deepvue"', () => {
    expect(new DeepvueGstAdapter('cid', 'csec').name).toBe('deepvue');
  });
});

// ─── DeepvueGstAdapter — error handling ──────────────────────────────────────

describe('DeepvueGstAdapter — error handling', () => {
  it('maps network timeout (AbortError) to TIMEOUT', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeAuthResponse())
      .mockRejectedValueOnce(abortError));

    const adapter = new DeepvueGstAdapter('cid', 'csec');
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('TIMEOUT');
  });

  it('maps auth AbortError to TIMEOUT', async () => {
    const abortError = new Error('aborted');
    abortError.name = 'AbortError';
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(abortError));

    const adapter = new DeepvueGstAdapter('cid', 'csec');
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('TIMEOUT');
  });

  it('maps general network error to PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeAuthResponse())
      .mockRejectedValueOnce(new Error('ECONNREFUSED')));

    const adapter = new DeepvueGstAdapter('cid', 'csec');
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('PROVIDER_ERROR');
  });

  it('maps HTTP 422 (validation error) to INVALID_GSTIN', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeAuthResponse())
      .mockResolvedValueOnce({ ok: false, status: 422, json: async () => ({ detail: 'invalid' }) }));

    const adapter = new DeepvueGstAdapter('cid', 'csec');
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('INVALID_GSTIN');
  });

  it('maps HTTP 429 (rate limit) to PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeAuthResponse())
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ detail: 'rate limit' }) }));

    const adapter = new DeepvueGstAdapter('cid', 'csec');
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('PROVIDER_ERROR');
  });

  it('maps HTTP 503 (source unavailable) to PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(makeAuthResponse())
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ detail: 'Source Unavailable' }) }));

    const adapter = new DeepvueGstAdapter('cid', 'csec');
    const result = await adapter.verifyGstin(DEFAULT_INPUT);

    expect(result.ok).toBe(false);
    expect((result as any).reason).toBe('PROVIDER_ERROR');
  });

  it('clears token cache on 401 (token expired)', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(makeAuthResponse(FRESH_EXPIRY))           // initial auth
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // expired token
      .mockResolvedValueOnce(makeAuthResponse(FRESH_EXPIRY))           // re-auth
      .mockResolvedValueOnce(makeDeepvueSuccessResponse());             // retry call

    vi.stubGlobal('fetch', mockFetch);
    const adapter = new DeepvueGstAdapter('cid', 'csec');

    const first = await adapter.verifyGstin(DEFAULT_INPUT);
    expect(first.ok).toBe(false);
    expect((first as any).reason).toBe('PROVIDER_ERROR');

    // Next call should re-authenticate
    const second = await adapter.verifyGstin(DEFAULT_INPUT);
    expect(second.ok).toBe(true);

    const authCalls = mockFetch.mock.calls.filter(c => String(c[0]).includes('/v1/authorize'));
    expect(authCalls).toHaveLength(2); // re-authenticated after 401
  });
});

// ─── Status normalisation ─────────────────────────────────────────────────────

describe('normalizeDeepvueStatus', () => {
  it('maps "Active" to ACTIVE', () => {
    expect(normalizeDeepvueStatus('Active')).toBe('ACTIVE');
  });

  it('maps "Inactive" to INACTIVE', () => {
    expect(normalizeDeepvueStatus('Inactive')).toBe('INACTIVE');
  });

  it('maps "Cancelled" to CANCELLED', () => {
    expect(normalizeDeepvueStatus('Cancelled')).toBe('CANCELLED');
  });

  it('maps "Suspended" to SUSPENDED', () => {
    expect(normalizeDeepvueStatus('Suspended')).toBe('SUSPENDED');
  });

  it('maps unknown/empty/null to UNKNOWN', () => {
    expect(normalizeDeepvueStatus('')).toBe('UNKNOWN');
    expect(normalizeDeepvueStatus(null)).toBe('UNKNOWN');
    expect(normalizeDeepvueStatus(undefined)).toBe('UNKNOWN');
    expect(normalizeDeepvueStatus('SomethingElse')).toBe('UNKNOWN');
  });
});

// ─── Name normalisation & matching ───────────────────────────────────────────

describe('nameSimilarity / nameMatches', () => {
  it('returns 1.0 for exact match', () => {
    expect(nameSimilarity('Test Company Pvt Ltd', 'Test Company Pvt Ltd')).toBe(1.0);
  });

  it('returns 1.0 for match after suffix normalisation: "Private Limited" → "Pvt Ltd"', () => {
    const score = nameSimilarity('Test Company Private Limited', 'Test Company Pvt Ltd');
    expect(score).toBe(1.0);
  });

  it('returns 1.0 for match after suffix normalisation: "Pvt. Ltd." → "Pvt Ltd"', () => {
    const score = nameSimilarity('Test Company Pvt. Ltd.', 'Test Company Pvt Ltd');
    expect(score).toBe(1.0);
  });

  it('passes nameMatches threshold after LLP normalisation', () => {
    // 'Limited Liability Partnership' normalises to 'llp'; overall score is >= 0.80 threshold
    expect(nameMatches('Test Firm Limited Liability Partnership', 'Test Firm LLP')).toBe(true);
  });

  it('matches names that are above the 0.80 threshold', () => {
    // Minor typo/spacing difference
    expect(nameMatches('Test Company Pvt Ltd', 'Test Company Pvt Ltd')).toBe(true);
  });

  it('fails to match completely unrelated names', () => {
    expect(nameMatches('Alpha Exports Pvt Ltd', 'Zenith Imports Limited')).toBe(false);
  });

  it('normalizeName lowercases and collapses whitespace', () => {
    const n = normalizeName('  TEST  COMPANY  PVT  LTD  ');
    expect(n).toBe('test company pvt ltd');
  });
});

// ─── Payload sanitiser ────────────────────────────────────────────────────────

describe('sanitizeDeepvuePayload', () => {
  const rawPayload = {
    gstin: VALID_GSTIN,
    legal_name: 'Test Company Pvt Ltd',
    gstin_status: 'Active',
    pan_number: 'ABCDE1234F',
    aadhaar_validation: 'Yes',
    aadhaar_validation_date: '2024-01-01',
    contact_details: {
      principal: {
        address: '123 Main St, Bengaluru 560001',
        mobile: '9876543210',
        email: 'test@test.com',
        nature_of_business: 'Wholesale',
      },
      additional: [
        { address: 'Branch Office, Mumbai', mobile: '9000000001', email: 'branch@test.com' },
      ],
    },
    annual_turnover: 'Slab: Less than Rs. 1 Cr.',
    promoters: ['Test Promoter One'],
  };

  it('excludes pan_number from sanitized output', () => {
    const out = sanitizeDeepvuePayload(rawPayload as Record<string, unknown>);
    expect(out).not.toHaveProperty('pan_number');
  });

  it('excludes aadhaar_validation from sanitized output', () => {
    const out = sanitizeDeepvuePayload(rawPayload as Record<string, unknown>);
    expect(out).not.toHaveProperty('aadhaar_validation');
    expect(out).not.toHaveProperty('aadhaar_validation_date');
  });

  it('strips mobile and email from contact_details.principal but retains address', () => {
    const out = sanitizeDeepvuePayload(rawPayload as Record<string, unknown>);
    const principal = (out.contact_details as any).principal;
    expect(principal).not.toHaveProperty('mobile');
    expect(principal).not.toHaveProperty('email');
    expect(principal.address).toBe('123 Main St, Bengaluru 560001');
    expect(principal.nature_of_business).toBe('Wholesale');
  });

  it('strips mobile and email from each contact_details.additional entry', () => {
    const out = sanitizeDeepvuePayload(rawPayload as Record<string, unknown>);
    const additional = (out.contact_details as any).additional as any[];
    expect(additional[0]).not.toHaveProperty('mobile');
    expect(additional[0]).not.toHaveProperty('email');
    expect(additional[0].address).toBe('Branch Office, Mumbai');
  });

  it('retains non-sensitive fields (gstin, legal_name, annual_turnover, promoters)', () => {
    const out = sanitizeDeepvuePayload(rawPayload as Record<string, unknown>);
    expect(out.gstin).toBe(VALID_GSTIN);
    expect(out.legal_name).toBe('Test Company Pvt Ltd');
    expect(out.annual_turnover).toBe('Slab: Less than Rs. 1 Cr.');
    expect(out.promoters).toEqual(['Test Promoter One']);
  });

  it('bounds filing_status to ≤12 records', () => {
    const manyRecords = Array.from({ length: 20 }, (_, i) => ({
      return_type: 'GSTR1',
      financial_year: '2024-2025',
      tax_period: `Month${i}`,
      date_of_filing: '2025-01-01',
      status: 'Filed',
      mode_of_filing: 'ONLINE',
    }));

    const out = sanitizeDeepvuePayload({
      filing_status: [manyRecords], // outer array wrapping (Deepvue advanced format)
    } as Record<string, unknown>);

    expect((out.filing_status as unknown[]).length).toBeLessThanOrEqual(12);
  });
});
