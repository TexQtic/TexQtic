/**
 * Unit tests — crmLifecycleNotifyClient
 *
 * Tests noop mode, configured mode, failure handling, and payload redaction.
 * No DB access, no real CRM endpoint.
 *
 * Run: pnpm exec vitest run src/__tests__/crm-lifecycle-notify-client.unit.test.ts
 *       (from server/ directory)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  notifyRegistrationSubmitted,
  notifyGstSubmitted,
  notifyGstResubmitted,
  notifyProviderCheckCompleted,
  notifyAdminReviewedApproved,
  notifyAdminReviewedRejected,
  notifyAdminReviewedNeedsMoreInfo,
} from '../services/crmLifecycleNotifyClient.js';

const BASE_URL = 'https://crm.texqtic.test';
const SECRET = 'test-lifecycle-secret-32-chars-long-pad';
const ORG_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const TENANT_ID = ORG_ID;

function makeRegistrationParams() {
  return {
    orgId: ORG_ID,
    tenantId: TENANT_ID,
    email: 'owner@example.com', // lowercase-normalized
    legalName: 'Acme Textiles Pvt Ltd',
    roleIntent: 'supplier',
    jurisdiction: 'IN',
    plan: 'FREE',
    orgStatus: 'PENDING_VERIFICATION',
    externalOrchestrationRef: null,
    attribution: {
      source_channel: 'WEB',
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'onboarding-q1',
    },
  };
}

function makeGstParams() {
  return {
    orgId: ORG_ID,
    tenantId: TENANT_ID,
    registrationType: 'Regular',
    stateCode: '29',
    orgStatus: 'PENDING_VERIFICATION',
  };
}

function makeProviderCheckParams() {
  return {
    orgId: ORG_ID,
    tenantId: TENANT_ID,
    providerResult: 'AUTO_APPROVED',
    providerName: 'deepvue',
    autoApproved: true,
    orgStatus: 'VERIFICATION_APPROVED',
  };
}

/** Precise shape of the RequestInit our client always sends. */
type MockInit = {
  method: string;
  headers: Record<string, string>;
  body: string;
  signal: AbortSignal;
};

function makeMockFetch(statusCode = 200) {
  return vi.fn(async (_url: string, _init: MockInit) => ({ status: statusCode }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setCrmEnv() {
  process.env.CRM_LIFECYCLE_BASE_URL = BASE_URL;
  process.env.CRM_LIFECYCLE_INGESTION_SECRET = SECRET;
}

function clearCrmEnv() {
  delete process.env.CRM_LIFECYCLE_BASE_URL;
  delete process.env.CRM_LIFECYCLE_INGESTION_SECRET;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('crmLifecycleNotifyClient', () => {
  beforeEach(() => {
    clearCrmEnv();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    clearCrmEnv();
    vi.unstubAllGlobals();
  });

  // ─── Noop mode ───────────────────────────────────────────────────────────

  describe('noop mode — CRM_LIFECYCLE_BASE_URL absent', () => {
    it('notifyRegistrationSubmitted returns NOOP_SKIPPED', async () => {
      const result = await notifyRegistrationSubmitted(makeRegistrationParams());
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('notifyGstSubmitted returns NOOP_SKIPPED', async () => {
      const result = await notifyGstSubmitted(makeGstParams());
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('notifyGstResubmitted returns NOOP_SKIPPED', async () => {
      const result = await notifyGstResubmitted(makeGstParams());
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('notifyProviderCheckCompleted returns NOOP_SKIPPED', async () => {
      const result = await notifyProviderCheckCompleted(makeProviderCheckParams());
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('notifyAdminReviewedApproved returns NOOP_SKIPPED', async () => {
      const result = await notifyAdminReviewedApproved({ orgId: ORG_ID, tenantId: TENANT_ID });
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('notifyAdminReviewedRejected returns NOOP_SKIPPED', async () => {
      const result = await notifyAdminReviewedRejected({ orgId: ORG_ID, tenantId: TENANT_ID });
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('notifyAdminReviewedNeedsMoreInfo returns NOOP_SKIPPED', async () => {
      const result = await notifyAdminReviewedNeedsMoreInfo({ orgId: ORG_ID, tenantId: TENANT_ID });
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('makes no fetch call in noop mode', async () => {
      const fetchSpy = makeMockFetch();
      vi.stubGlobal('fetch', fetchSpy);
      await notifyRegistrationSubmitted(makeRegistrationParams());
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('noop mode — base URL set but secret missing', () => {
    it('returns NOOP_SKIPPED without throwing', async () => {
      process.env.CRM_LIFECYCLE_BASE_URL = BASE_URL;
      delete process.env.CRM_LIFECYCLE_INGESTION_SECRET;

      const result = await notifyRegistrationSubmitted(makeRegistrationParams());
      expect(result.dispatch_status).toBe('NOOP_SKIPPED');
    });

    it('makes no fetch call', async () => {
      process.env.CRM_LIFECYCLE_BASE_URL = BASE_URL;
      delete process.env.CRM_LIFECYCLE_INGESTION_SECRET;

      const fetchSpy = makeMockFetch();
      vi.stubGlobal('fetch', fetchSpy);
      await notifyRegistrationSubmitted(makeRegistrationParams());
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Configured mode ─────────────────────────────────────────────────────

  describe('configured mode — sends POST to lifecycle endpoint', () => {
    it('notifyRegistrationSubmitted sends POST to /api/webhooks/mainapp-lifecycle-events', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch(200);
      vi.stubGlobal('fetch', mockFetch);

      const result = await notifyRegistrationSubmitted(makeRegistrationParams());

      expect(result.dispatch_status).toBe('SENT');
      expect((result as any).http_status).toBe(200);
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe(`${BASE_URL}/api/webhooks/mainapp-lifecycle-events`);
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');
      expect(init.headers['x-crm-mainapp-lifecycle-secret']).toBe(SECRET);
    });

    it('registration event payload includes all required fields', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyRegistrationSubmitted(makeRegistrationParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.event).toBe('org.registration.submitted.v1');
      expect(payload.org_id).toBe(ORG_ID);
      expect(payload.tenant_id).toBe(TENANT_ID);
      expect(payload.schema_version).toBe('1.0');
      expect(payload.email).toBe('owner@example.com');
      expect(payload.legal_name).toBe('Acme Textiles Pvt Ltd');
      expect(payload.role_intent).toBe('supplier');
      expect(payload.jurisdiction).toBe('IN');
      expect(payload.plan).toBe('FREE');
      expect(payload.org_status).toBe('PENDING_VERIFICATION');
      expect(payload.external_orchestration_ref).toBeNull();
      expect(payload.attribution).toMatchObject({ source_channel: 'WEB', utm_source: 'google' });
      expect(payload.idempotency_key).toMatch(/^org\.registration\.submitted\.v1:/);
      expect(payload.occurred_at).toBeTruthy();
    });

    it('registration event idempotency_key encodes event:org_id:epochMs', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyRegistrationSubmitted(makeRegistrationParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      const [eventPart, orgIdPart, epochPart] = payload.idempotency_key.split(':');
      expect(eventPart).toBe('org.registration.submitted.v1');
      expect(orgIdPart).toBe(ORG_ID);
      expect(Number(epochPart)).toBeGreaterThan(0);
    });

    it('notifyGstSubmitted sends correct event type', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyGstSubmitted(makeGstParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.event).toBe('org.gst.submitted.v1');
      expect(payload.registration_type).toBe('Regular');
      expect(payload.state_code).toBe('29');
      expect(payload.org_status).toBe('PENDING_VERIFICATION');
    });

    it('notifyGstResubmitted sends correct event type', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyGstResubmitted(makeGstParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.event).toBe('org.gst.resubmitted.v1');
    });

    it('notifyProviderCheckCompleted sends correct fields', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyProviderCheckCompleted(makeProviderCheckParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.event).toBe('org.gst.provider_check.completed.v1');
      expect(payload.provider_result).toBe('AUTO_APPROVED');
      expect(payload.provider_name).toBe('deepvue');
      expect(payload.auto_approved).toBe(true);
      expect(payload.org_status).toBe('VERIFICATION_APPROVED');
    });

    it('notifyAdminReviewedApproved uses default category when not provided', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyAdminReviewedApproved({ orgId: ORG_ID, tenantId: TENANT_ID });

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.event).toBe('org.gst.admin_reviewed.approved.v1');
      expect(payload.review_outcome).toBe('APPROVED');
      expect(payload.org_status).toBe('VERIFICATION_APPROVED');
      expect(payload.review_notes_category).toBe('ADMIN_MANUAL_APPROVAL');
    });

    it('notifyAdminReviewedRejected uses default category when not provided', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyAdminReviewedRejected({ orgId: ORG_ID, tenantId: TENANT_ID });

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.event).toBe('org.gst.admin_reviewed.rejected.v1');
      expect(payload.review_outcome).toBe('REJECTED');
      expect(payload.org_status).toBe('VERIFICATION_REJECTED');
      expect(payload.rejection_reason_category).toBe('OTHER_REVIEW_REQUIRED');
    });

    it('notifyAdminReviewedNeedsMoreInfo uses default category when not provided', async () => {
      setCrmEnv();
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyAdminReviewedNeedsMoreInfo({ orgId: ORG_ID, tenantId: TENANT_ID });

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.event).toBe('org.gst.admin_reviewed.needs_more_info.v1');
      expect(payload.review_outcome).toBe('NEEDS_MORE_INFO');
      expect(payload.org_status).toBe('VERIFICATION_NEEDS_MORE_INFO');
      expect(payload.review_notes_category).toBe('OTHER_REVIEW_REQUIRED');
    });
  });

  // ─── Failure handling ─────────────────────────────────────────────────────

  describe('failure handling — does not throw into caller', () => {
    it('returns FAILED when fetch rejects (network error)', async () => {
      setCrmEnv();
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))));

      const result = await notifyRegistrationSubmitted(makeRegistrationParams());
      expect(result.dispatch_status).toBe('FAILED');
    });

    it('returns FAILED on timeout (AbortError)', async () => {
      setCrmEnv();
      vi.stubGlobal(
        'fetch',
        vi.fn(() => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          return Promise.reject(err);
        }),
      );

      const result = await notifyGstSubmitted(makeGstParams());
      expect(result.dispatch_status).toBe('FAILED');
      expect((result as any).error_message).toContain('timed out');
    });

    it('does not throw when provider check notify fails', async () => {
      setCrmEnv();
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('net::ERR_FAILED'))));

      await expect(notifyProviderCheckCompleted(makeProviderCheckParams())).resolves.toMatchObject({
        dispatch_status: 'FAILED',
      });
    });

    it('returns SENT with non-2xx http_status (CRM returned error status)', async () => {
      setCrmEnv();
      vi.stubGlobal('fetch', vi.fn(async () => ({ status: 500 })));

      const result = await notifyRegistrationSubmitted(makeRegistrationParams());
      expect(result.dispatch_status).toBe('SENT');
      expect((result as any).http_status).toBe(500);
    });
  });

  // ─── Payload redaction ────────────────────────────────────────────────────

  describe('payload redaction — forbidden fields never sent', () => {
    beforeEach(() => {
      setCrmEnv();
    });

    it('registration payload does not contain passwordHash', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyRegistrationSubmitted(makeRegistrationParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('passwordHash');
    });

    it('registration payload does not contain raw_verification_json', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyRegistrationSubmitted(makeRegistrationParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('raw_verification_json');
    });

    it('GST submit payload does not contain actual GSTIN value', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyGstSubmitted(makeGstParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      // gstin field must be null (GSTIN_EXCLUDED_IN_V1), never an actual GSTIN string
      expect(payload.gstin).toBeNull();
    });

    it('GST resubmit payload does not contain actual GSTIN value', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyGstResubmitted(makeGstParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload.gstin).toBeNull();
    });

    it('provider check payload does not contain provider_request_id', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyProviderCheckCompleted(makeProviderCheckParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('provider_request_id');
    });

    it('provider check payload does not contain provider_verified_at', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyProviderCheckCompleted(makeProviderCheckParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('provider_verified_at');
    });

    it('provider check payload does not contain raw_verification_json', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyProviderCheckCompleted(makeProviderCheckParams());

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('raw_verification_json');
    });

    it('admin approved payload does not contain reviewed_by_admin_id', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyAdminReviewedApproved({ orgId: ORG_ID, tenantId: TENANT_ID });

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('reviewed_by_admin_id');
    });

    it('admin approved payload does not contain raw review_notes', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyAdminReviewedApproved({ orgId: ORG_ID, tenantId: TENANT_ID });

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('review_notes');
    });

    it('admin rejected payload does not contain reviewed_by_admin_id or raw review_notes', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyAdminReviewedRejected({ orgId: ORG_ID, tenantId: TENANT_ID });

      const payload = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(payload).not.toHaveProperty('reviewed_by_admin_id');
      expect(payload).not.toHaveProperty('review_notes');
    });

    it('secret header value does not appear in the serialized payload body', async () => {
      const mockFetch = makeMockFetch();
      vi.stubGlobal('fetch', mockFetch);

      await notifyRegistrationSubmitted(makeRegistrationParams());

      const bodyStr: string = mockFetch.mock.calls[0][1].body;
      expect(bodyStr).not.toContain(SECRET);
    });
  });
});
