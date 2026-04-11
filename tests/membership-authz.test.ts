/**
 * Membership Authorization Contract Test — P-6
 *
 * Purpose: Verify that the GET /api/tenant/memberships authorization rule
 * permits OWNER, ADMIN, and MEMBER roles — and denies VIEWER,
 * and that POST (invite creation) is restricted to OWNER and ADMIN actors
 * while rejecting VIEWER as an invite target role, and that PATCH role
 * transitions enforce OWNER-only mutation, disallowed transition errors,
 * same-org target scoping, and the sole-OWNER invariant.
 *
 * This test documents and enforces the authorization contract as defined in:
 *   - server/src/routes/tenant.ts
 *     (GET: OWNER/ADMIN/MEMBER guard; POST: OWNER/ADMIN actor guard + VIEWER target rejection)
 *   - services/tenantService.ts (getMemberships JSDoc)
 *   - shared/contracts/openapi.tenant.json (GET description)
 *   - docs/governance/IMPLEMENTATION-TRACKER-2026-Q2.md
 *     (Tenant Membership Governance Notes)
 *
 * Strategy: Pure logic test mirroring the route authorization guards.
 * No database connection or live server required.
 *
 * Run from repo root:
 *   pnpm exec vitest run tests/membership-authz.test.ts
 * OR from server/:
 *   pnpm exec vitest run ../../tests/membership-authz.test.ts
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Authorization guard — mirrors POST /api/tenant/memberships route check:
//   if (userRole !== 'OWNER' && userRole !== 'ADMIN') → 403
// ---------------------------------------------------------------------------
function canInviteMember(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN';
}

function canInviteAsRole(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
}

type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

type MembershipTransitionOutcome =
  | { allowed: true }
  | {
      allowed: false;
      error:
        | 'FORBIDDEN'
        | 'MEMBERSHIP_NOT_FOUND'
        | 'VIEWER_TRANSITION_OUT_OF_SCOPE'
        | 'NO_OP_ROLE_CHANGE'
        | 'PEER_OWNER_DEMOTION_FORBIDDEN'
        | 'SOLE_OWNER_CANNOT_DOWNGRADE';
    };

function evaluateMembershipRoleTransition(options: {
  actorRole: MembershipRole;
  targetVisibleToOrg: boolean;
  fromRole: MembershipRole;
  requestedRole: MembershipRole;
  isSelfTarget: boolean;
  ownerCount: number;
}): MembershipTransitionOutcome {
  const {
    actorRole,
    targetVisibleToOrg,
    fromRole,
    requestedRole,
    isSelfTarget,
    ownerCount,
  } = options;

  if (actorRole !== 'OWNER') {
    return { allowed: false, error: 'FORBIDDEN' };
  }

  if (!targetVisibleToOrg) {
    return { allowed: false, error: 'MEMBERSHIP_NOT_FOUND' };
  }

  if (requestedRole === 'VIEWER' || fromRole === 'VIEWER') {
    return { allowed: false, error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' };
  }

  if (fromRole === requestedRole) {
    return { allowed: false, error: 'NO_OP_ROLE_CHANGE' };
  }

  if (fromRole === 'OWNER' && !isSelfTarget) {
    return { allowed: false, error: 'PEER_OWNER_DEMOTION_FORBIDDEN' };
  }

  if (fromRole === 'OWNER' && isSelfTarget && ownerCount <= 1) {
    return { allowed: false, error: 'SOLE_OWNER_CANNOT_DOWNGRADE' };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// GET /api/tenant/memberships is restricted to OWNER, ADMIN, MEMBER.
// VIEWER is explicitly excluded from the membership list read.
// The route applies tenantAuthMiddleware + databaseContextMiddleware.
// Tenant boundary is additionally enforced by RLS via app.org_id.
// ---------------------------------------------------------------------------
function canReadMemberList(role: string): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'MEMBER';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/tenant/memberships — authorization contract', () => {
  const PERMITTED_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;

  it('permits OWNER, ADMIN, and MEMBER roles to read the membership list', () => {
    for (const role of PERMITTED_ROLES) {
      expect(canReadMemberList(role)).toBe(true);
    }
  });

  it('MEMBER role is explicitly permitted for reads (no OWNER/ADMIN requirement)', () => {
    expect(canReadMemberList('MEMBER')).toBe(true);
  });

  it('VIEWER role is NOT permitted for reads (excluded from membership list)', () => {
    expect(canReadMemberList('VIEWER')).toBe(false);
  });
});

describe('POST /api/tenant/memberships — authorization contract', () => {
  it('OWNER is permitted to invite members', () => {
    expect(canInviteMember('OWNER')).toBe(true);
  });

  it('ADMIN is permitted to invite members', () => {
    expect(canInviteMember('ADMIN')).toBe(true);
  });

  it('MEMBER role is denied from inviting (403 expected from backend)', () => {
    expect(canInviteMember('MEMBER')).toBe(false);
  });

  it('VIEWER role is denied from inviting (403 expected from backend)', () => {
    expect(canInviteMember('VIEWER')).toBe(false);
  });
});

describe('POST /api/tenant/memberships — invite role admission', () => {
  const SUPPORTED_INVITE_ROLES = ['OWNER', 'ADMIN', 'MEMBER'] as const;

  it('permits OWNER, ADMIN, and MEMBER as invite target roles', () => {
    for (const role of SUPPORTED_INVITE_ROLES) {
      expect(canInviteAsRole(role)).toBe(true);
    }
  });

  it('VIEWER is rejected as an invite target role (422 expected from backend)', () => {
    expect(canInviteAsRole('VIEWER')).toBe(false);
  });
});

describe('PATCH /api/tenant/memberships/:id — role transition contract', () => {
  it('permits only OWNER actors to perform membership role changes', () => {
    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'MEMBER',
        requestedRole: 'ADMIN',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: true });

    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'ADMIN',
        targetVisibleToOrg: true,
        fromRole: 'MEMBER',
        requestedRole: 'ADMIN',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });
  });

  it('rejects cross-org or missing membership targets as not found', () => {
    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: false,
        fromRole: 'MEMBER',
        requestedRole: 'ADMIN',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: false, error: 'MEMBERSHIP_NOT_FOUND' });
  });

  it('rejects VIEWER as a requested or source transition role', () => {
    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'MEMBER',
        requestedRole: 'VIEWER',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: false, error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' });

    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'VIEWER',
        requestedRole: 'MEMBER',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: false, error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' });
  });

  it('rejects no-op transitions where the role does not change', () => {
    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'ADMIN',
        requestedRole: 'ADMIN',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: false, error: 'NO_OP_ROLE_CHANGE' });
  });

  it('forbids changing the role of another OWNER membership', () => {
    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'OWNER',
        requestedRole: 'ADMIN',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: false, error: 'PEER_OWNER_DEMOTION_FORBIDDEN' });
  });

  it('enforces the sole-OWNER self-downgrade invariant', () => {
    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'OWNER',
        requestedRole: 'ADMIN',
        isSelfTarget: true,
        ownerCount: 1,
      }),
    ).toEqual({ allowed: false, error: 'SOLE_OWNER_CANNOT_DOWNGRADE' });

    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'OWNER',
        requestedRole: 'ADMIN',
        isSelfTarget: true,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: true });
  });
});

// ---------------------------------------------------------------------------
// Contract invariant: GET is a superset of who may call POST
// (everyone who can invite can also read; not the reverse)
// ---------------------------------------------------------------------------
describe('membership authorization invariant', () => {
  const INVITE_ROLES = ['OWNER', 'ADMIN'];
  const NON_INVITE_ROLES = ['MEMBER', 'VIEWER'];

  it('all invite-permitted roles can also read', () => {
    for (const role of INVITE_ROLES) {
      expect(canReadMemberList(role)).toBe(true);
    }
  });

  it('MEMBER and VIEWER cannot invite; VIEWER also cannot read', () => {
    for (const role of NON_INVITE_ROLES) {
      expect(canInviteMember(role)).toBe(false);
    }
    // VIEWER is excluded from reads entirely (not just invite creation)
    expect(canReadMemberList('VIEWER')).toBe(false);
  });

  it('invite creation also requires a supported target role', () => {
    expect(canInviteMember('OWNER') && canInviteAsRole('MEMBER')).toBe(true);
    expect(canInviteMember('ADMIN') && canInviteAsRole('VIEWER')).toBe(false);
  });

  it('membership transitions require an OWNER actor and a permitted transition path', () => {
    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'OWNER',
        targetVisibleToOrg: true,
        fromRole: 'MEMBER',
        requestedRole: 'ADMIN',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: true });

    expect(
      evaluateMembershipRoleTransition({
        actorRole: 'MEMBER',
        targetVisibleToOrg: true,
        fromRole: 'MEMBER',
        requestedRole: 'ADMIN',
        isSelfTarget: false,
        ownerCount: 2,
      }),
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });
  });
});
