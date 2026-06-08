/**
 * org-verification-guard.unit.test.ts
 *
 * Unit tests for isOrgVerificationBlocked (IMPL-MAINAPP-PENDING-VERIFICATION-BACKEND-STATUS-GATE-01)
 *
 * Covers:
 *   TC-001: PENDING_VERIFICATION → blocked (true, 403 ORG_VERIFICATION_REQUIRED)
 *   TC-002: VERIFICATION_REJECTED → blocked (true, 403 ORG_VERIFICATION_REQUIRED)
 *   TC-003: VERIFICATION_NEEDS_MORE_INFO → blocked (true, 403 ORG_VERIFICATION_REQUIRED)
 *   TC-004: ACTIVE → not blocked (false, no reply sent)
 *   TC-005: VERIFICATION_APPROVED → not blocked (false, no reply sent)
 *   TC-006: Org not found → fail-closed (true, 403 ORG_VERIFICATION_REQUIRED)
 *   TC-007: DB throws → fail-closed (true, 403 ORG_VERIFICATION_REQUIRED)
 *   TC-008: SUSPENDED → not blocked (false)
 *   TC-009: Error code is ORG_VERIFICATION_REQUIRED (not FORBIDDEN)
 *   TC-010: Error message matches canonical message
 *   TC-011: Status code is 403
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isOrgVerificationBlocked } from '../utils/orgVerificationGuard.js';

// ─── Prisma mock ──────────────────────────────────────────────────────────────

vi.mock('../db/prisma.js', () => ({
  prisma: {
    organizations: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../db/prisma.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeReply(): any {
  const reply: any = {
    _code: 200,
    _sent: null as unknown,
    code(statusCode: number) {
      reply._code = statusCode;
      return reply;
    },
    send(body: unknown) {
      reply._sent = body;
      return reply;
    },
  };
  return reply;
}

const ORG_ID = 'aa000000-0000-0000-0000-000000000001';

function mockOrgStatus(status: string | null) {
  if (status === null) {
    vi.mocked(prisma.organizations.findUnique).mockResolvedValue(null);
  } else {
    vi.mocked(prisma.organizations.findUnique).mockResolvedValue({ status } as any);
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('isOrgVerificationBlocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // TC-001
  it('blocks PENDING_VERIFICATION', async () => {
    mockOrgStatus('PENDING_VERIFICATION');
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(true);
  });

  // TC-002
  it('blocks VERIFICATION_REJECTED', async () => {
    mockOrgStatus('VERIFICATION_REJECTED');
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(true);
  });

  // TC-003
  it('blocks VERIFICATION_NEEDS_MORE_INFO', async () => {
    mockOrgStatus('VERIFICATION_NEEDS_MORE_INFO');
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(true);
  });

  // TC-004
  it('does not block ACTIVE', async () => {
    mockOrgStatus('ACTIVE');
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(false);
    expect(reply._sent).toBeNull();
  });

  // TC-005
  it('does not block VERIFICATION_APPROVED', async () => {
    mockOrgStatus('VERIFICATION_APPROVED');
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(false);
    expect(reply._sent).toBeNull();
  });

  // TC-006
  it('blocks when org is not found (fail-closed)', async () => {
    mockOrgStatus(null);
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(true);
  });

  // TC-007
  it('blocks on DB error (fail-closed)', async () => {
    vi.mocked(prisma.organizations.findUnique).mockRejectedValue(new Error('DB connection failed'));
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(true);
  });

  // TC-008
  it('does not block SUSPENDED (not in blocked set)', async () => {
    mockOrgStatus('SUSPENDED');
    const reply = makeReply();
    const blocked = await isOrgVerificationBlocked(ORG_ID, reply);
    expect(blocked).toBe(false);
  });

  // TC-009: Error code is ORG_VERIFICATION_REQUIRED (not FORBIDDEN)
  it('sends ORG_VERIFICATION_REQUIRED error code (not FORBIDDEN)', async () => {
    mockOrgStatus('PENDING_VERIFICATION');
    const reply = makeReply();
    await isOrgVerificationBlocked(ORG_ID, reply);
    expect(reply._sent).toMatchObject({
      success: false,
      error: {
        code: 'ORG_VERIFICATION_REQUIRED',
      },
    });
  });

  // TC-010: Canonical error message
  it('sends the canonical blocked message', async () => {
    mockOrgStatus('PENDING_VERIFICATION');
    const reply = makeReply();
    await isOrgVerificationBlocked(ORG_ID, reply);
    expect(reply._sent).toMatchObject({
      error: {
        message: 'Organization verification is required before this action is available.',
      },
    });
  });

  // TC-011: Status code is 403
  it('returns HTTP 403 when blocked', async () => {
    mockOrgStatus('PENDING_VERIFICATION');
    const reply = makeReply();
    await isOrgVerificationBlocked(ORG_ID, reply);
    expect(reply._code).toBe(403);
  });

  // Verify correct prisma query (always selects by id)
  it('queries organizations by orgId with status select only', async () => {
    mockOrgStatus('ACTIVE');
    const reply = makeReply();
    await isOrgVerificationBlocked(ORG_ID, reply);
    expect(prisma.organizations.findUnique).toHaveBeenCalledWith({
      where: { id: ORG_ID },
      select: { status: true },
    });
  });
});
