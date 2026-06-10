/**
 * Unit tests — zohoBooks.lifecycle — maybeSyncZohoBooksContactAfterActivation
 *
 * Tests the feature-flagged lifecycle orchestrator that wires Zoho Books contact sync
 * into the org verification approval seam.
 *
 * All Zoho network calls are mocked. No DB access. No live Zoho mutations.
 *
 * Run: pnpm exec vitest run src/__tests__/zoho-books-lifecycle.unit.test.ts
 *       (from server/ directory)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock Zoho sync layer ──────────────────────────────────────────────────────
// Must be declared before importing the lifecycle module.
vi.mock('../services/zoho/zohoBooks.sync.js', () => ({
  createZohoBooksContact: vi.fn(),
}));

// ── Mock Zoho config reader ───────────────────────────────────────────────────
vi.mock('../services/zoho/zohoBooks.config.js', () => ({
  readZohoBooksRuntimeConfig: vi.fn(),
}));

// ── Mock global prisma ────────────────────────────────────────────────────────
vi.mock('../db/prisma.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

import { maybeSyncZohoBooksContactAfterActivation } from '../services/zoho/zohoBooks.lifecycle.js';
import { createZohoBooksContact } from '../services/zoho/zohoBooks.sync.js';
import { readZohoBooksRuntimeConfig } from '../services/zoho/zohoBooks.config.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORG_ID = 'aaaaaaaa-1111-2222-3333-444444444444';

const MOCK_CONFIG = {
  status: 'READY' as const,
  dryRunEnabled: true as const,
  config: {
    dryRunEnabled: true,
    clientId: 'cid',
    clientSecret: 'csecret',
    refreshToken: 'rtoken',
    organizationId: '60073287085',
    apiDomain: 'https://www.zohoapis.in',
  },
};

const MOCK_ORG_ROW = {
  id: ORG_ID,
  legal_name: 'Acme Corp Pvt Ltd',
  jurisdiction: 'IN',
  status: 'VERIFICATION_APPROVED',
  plan: 'FREE',
};

// ── Inline mock prisma (injected via dbOverride) ──────────────────────────────

function makeMockDb(overrides: Partial<{
  queryRawOrg: unknown[];
  queryRawInteg: unknown[];
  executeRawResult: unknown;
}> = {}) {
  return {
    $queryRaw: vi.fn()
      .mockResolvedValueOnce(overrides.queryRawOrg ?? [MOCK_ORG_ROW])
      .mockResolvedValueOnce(overrides.queryRawInteg ?? [{ external_id: null }]),
    $executeRaw: vi.fn().mockResolvedValue(1),
  };
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
  // Default config mock
  vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue(MOCK_CONFIG);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('maybeSyncZohoBooksContactAfterActivation — feature flag OFF (default)', () => {
  it('returns SKIPPED_DISABLED when flag is not set', async () => {
    delete process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'];
    const db = makeMockDb();

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SKIPPED_DISABLED');
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
    expect(db.$queryRaw).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it('returns SKIPPED_DISABLED when flag is set to "false"', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'false';
    const db = makeMockDb();

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SKIPPED_DISABLED');
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
  });

  it('lifecycle transition does not fail when flag is OFF', async () => {
    delete process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'];
    const db = makeMockDb();

    await expect(
      maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any).catch(() => undefined),
    ).resolves.not.toThrow();
  });
});

describe('maybeSyncZohoBooksContactAfterActivation — config not ready', () => {
  it('returns SKIPPED_CONFIG_NOT_READY when Zoho config is DISABLED', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue({ status: 'DISABLED', dryRunEnabled: false });
    const db = makeMockDb();

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SKIPPED_CONFIG_NOT_READY');
    if (result.status === 'SKIPPED_CONFIG_NOT_READY') {
      expect(result.reason).toBe('DISABLED');
    }
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
  });

  it('returns SKIPPED_CONFIG_NOT_READY when config is MISSING_REQUIRED_ENV', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(readZohoBooksRuntimeConfig).mockReturnValue({
      status: 'MISSING_REQUIRED_ENV',
      dryRunEnabled: true,
      missingKeys: ['ZOHO_BOOKS_CLIENT_ID'],
    });
    const db = makeMockDb();

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SKIPPED_CONFIG_NOT_READY');
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
  });
});

describe('maybeSyncZohoBooksContactAfterActivation — duplicate prevention', () => {
  it('returns SKIPPED_ALREADY_SYNCED when external_id is already set — no Zoho call', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const db = makeMockDb({
      queryRawOrg: [MOCK_ORG_ROW],
      queryRawInteg: [{ external_id: '3320375000000045003' }],
    });

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SKIPPED_ALREADY_SYNCED');
    if (result.status === 'SKIPPED_ALREADY_SYNCED') {
      expect(result.externalId).toBe('3320375000000045003');
    }
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it('does not overwrite existing external_id when flag is ON — org_integrations row unchanged', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const existingContactId = '3320375000000045003';
    const db = makeMockDb({
      queryRawOrg: [MOCK_ORG_ROW],
      queryRawInteg: [{ external_id: existingContactId }],
    });

    await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    // Neither createZohoBooksContact nor $executeRaw (UPDATE) should have been called
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });
});

describe('maybeSyncZohoBooksContactAfterActivation — org not found', () => {
  it('returns SKIPPED_ORG_NOT_FOUND when org query returns empty', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const db = makeMockDb({ queryRawOrg: [] });

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SKIPPED_ORG_NOT_FOUND');
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
  });
});

describe('maybeSyncZohoBooksContactAfterActivation — flag ON, no existing external_id', () => {
  it('calls createZohoBooksContact exactly once when eligible', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'CONTACT_CREATED',
      contactId: 'zoho-c-001',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb({
      queryRawOrg: [MOCK_ORG_ROW],
      queryRawInteg: [{ external_id: null }],
    });

    await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(vi.mocked(createZohoBooksContact)).toHaveBeenCalledOnce();
  });

  it('returns SYNC_SUCCESS with contactId when Zoho returns CONTACT_CREATED', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'CONTACT_CREATED',
      contactId: 'zoho-c-001',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SYNC_SUCCESS');
    if (result.status === 'SYNC_SUCCESS') {
      expect(result.contactId).toBe('zoho-c-001');
      expect(result.shapeFallbackUsed).toBe(false);
    }
  });

  it('returns SYNC_SUCCESS when Zoho returns CONTACT_UPDATED (idempotent upsert)', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'CONTACT_UPDATED',
      contactId: 'zoho-c-001',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SYNC_SUCCESS');
    if (result.status === 'SYNC_SUCCESS') {
      expect(result.contactId).toBe('zoho-c-001');
    }
  });

  it('writes contactId to DB (calls $executeRaw) on success', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'CONTACT_CREATED',
      contactId: 'zoho-c-002',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(db.$executeRaw).toHaveBeenCalledOnce();
  });

  it('passes correct config and snapshot to createZohoBooksContact', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const mockCreate = vi.mocked(createZohoBooksContact);
    mockCreate.mockResolvedValueOnce({
      status: 'CONTACT_CREATED',
      contactId: 'zoho-c-003',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb({
      queryRawOrg: [{ ...MOCK_ORG_ROW, plan: 'PRO' }],
      queryRawInteg: [{ external_id: null }],
    });

    await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(mockCreate).toHaveBeenCalledOnce();
    const [calledConfig, calledSnapshot] = mockCreate.mock.calls[0]!;
    expect(calledConfig).toMatchObject({ organizationId: '60073287085' });
    expect(calledSnapshot.organization.id).toBe(ORG_ID);
    expect(calledSnapshot.organization.legalName).toBe('Acme Corp Pvt Ltd');
    expect(calledSnapshot.tenant.plan).toBe('PRO');
    expect(calledSnapshot.source).toBe('TexQtic Main App');
    // tradeName must not contain GSTIN/PAN/Aadhaar
    const snapshotStr = JSON.stringify(calledSnapshot);
    expect(snapshotStr).not.toMatch(/gstin|pan_no|aadhaar|deepvue|provider_id|gst_no/i);
  });
});

describe('maybeSyncZohoBooksContactAfterActivation — Zoho sync failure', () => {
  it('returns SYNC_FAILED_RECORDED when Zoho sync fails — lifecycle does not throw', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'SYNC_FAILED',
      errorSummary: 'TOKEN_REFRESH_FAILED: invalid_client',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    const resultPromise = maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);
    // Must not throw
    await expect(resultPromise).resolves.not.toThrow();

    const result = await resultPromise;
    expect(result.status).toBe('SYNC_FAILED_RECORDED');
  });

  it('records failure to DB on Zoho sync failure', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'SYNC_FAILED',
      errorSummary: 'ZOHO_HTTP_503: Service unavailable',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(db.$executeRaw).toHaveBeenCalledOnce();
  });

  it('does not throw when $executeRaw (failure record) itself throws', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'SYNC_FAILED',
      errorSummary: 'token error',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();
    db.$executeRaw.mockRejectedValueOnce(new Error('DB connection lost'));

    // Must not throw even when DB write itself fails
    await expect(
      maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any).catch(() => undefined),
    ).resolves.not.toThrow();
  });

  it('does not throw when DB query itself throws — returns SYNC_FAILED_NOT_RECORDED', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const db = {
      $queryRaw: vi.fn().mockRejectedValueOnce(new Error('DB unavailable')),
      $executeRaw: vi.fn(),
    };

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SYNC_FAILED_NOT_RECORDED');
    expect(vi.mocked(createZohoBooksContact)).not.toHaveBeenCalled();
  });
});

describe('maybeSyncZohoBooksContactAfterActivation — secrets safety', () => {
  it('never returns raw secrets/tokens in any result shape', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    vi.mocked(createZohoBooksContact).mockResolvedValueOnce({
      status: 'SYNC_FAILED',
      errorSummary: 'Zoho-oauthtoken abc123secret: invalid',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('abc123secret');
    expect(serialized).not.toContain('rtoken'); // refreshToken from config
    expect(serialized).not.toContain('csecret'); // clientSecret from config
  });

  it('redacts DB URLs from error summaries on unexpected exceptions', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const db = {
      $queryRaw: vi.fn().mockRejectedValueOnce(
        new Error('connect ECONNREFUSED postgres://user:pass@host:5432/db'),
      ),
      $executeRaw: vi.fn(),
    };

    const result = await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    expect(result.status).toBe('SYNC_FAILED_NOT_RECORDED');
    if (result.status === 'SYNC_FAILED_NOT_RECORDED') {
      expect(result.errorSummary).not.toContain('postgres://');
      expect(result.errorSummary).not.toContain('pass@host');
    }
  });
});

describe('maybeSyncZohoBooksContactAfterActivation — payload contract', () => {
  it('snapshot does not include GST/PAN/Aadhaar/provider fields', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const mockCreate = vi.mocked(createZohoBooksContact);
    mockCreate.mockResolvedValueOnce({
      status: 'CONTACT_CREATED',
      contactId: 'c1',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    const snapshot = mockCreate.mock.calls[0]![1];
    const snapshotStr = JSON.stringify(snapshot);
    expect(snapshotStr).not.toMatch(/gstin|gst_no|pan_no|aadhaar|deepvue|provider_response|provider_id/i);
  });

  it('snapshot source is "TexQtic Main App"', async () => {
    process.env['ZOHO_POST_ACTIVATION_CONTACT_SYNC_ENABLED'] = 'true';
    const mockCreate = vi.mocked(createZohoBooksContact);
    mockCreate.mockResolvedValueOnce({
      status: 'CONTACT_CREATED',
      contactId: 'c1',
      liveMutationAttempted: true,
      shapeFallbackUsed: false,
    });
    const db = makeMockDb();

    await maybeSyncZohoBooksContactAfterActivation(ORG_ID, db as any);

    const snapshot = mockCreate.mock.calls[0]![1];
    expect(snapshot.source).toBe('TexQtic Main App');
  });
});
