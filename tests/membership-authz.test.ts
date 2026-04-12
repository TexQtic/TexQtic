/**
 * Membership Authorization Contract Test — P-6
 *
 * Purpose: Verify that the GET /api/tenant/memberships authorization rule
 * permits OWNER, ADMIN, and MEMBER roles — and denies VIEWER,
 * and that POST (invite creation) is restricted to OWNER and ADMIN actors
 * and that POST pending-invite resend and DELETE pending-invite revocation are restricted to
 * OWNER and ADMIN actors
 * while allowing only still-pending invites to be revoked,
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

import { createHash } from 'node:crypto';
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

type InviteIssuanceRole = Exclude<MembershipRole, 'VIEWER'>;

type MembershipInviteIssuanceOutcome =
  | {
      allowed: true;
      persistedInvite: {
        id: string;
        tenantId: string;
        email: string;
        role: InviteIssuanceRole;
        tokenHash: string;
        expiresAt: Date;
      };
      response: {
        invite: {
          id: string;
          email: string;
          role: InviteIssuanceRole;
          expiresAt: Date;
        };
        inviteToken: string;
      };
      audit: {
        tenantId: string;
        realm: 'TENANT';
        actorType: 'USER';
        actorId: string | null;
        action: 'member.invited';
        entity: 'invite';
        entityId: string;
        metadataJson: {
          email: string;
          role: InviteIssuanceRole;
        };
      };
    }
  | {
      allowed: false;
      error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'VIEWER_TRANSITION_OUT_OF_SCOPE';
    };

function evaluateMembershipInviteIssuance(options: {
  actorRole: MembershipRole;
  tenantId: string | null;
  actorId: string | null;
  email: string;
  requestedRole: MembershipRole;
  inviteId: string;
  inviteToken: string;
  issuedAt: Date;
}): MembershipInviteIssuanceOutcome {
  const {
    actorRole,
    tenantId,
    actorId,
    email,
    requestedRole,
    inviteId,
    inviteToken,
    issuedAt,
  } = options;

  if (!tenantId) {
    return { allowed: false, error: 'UNAUTHORIZED' };
  }

  if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
    return { allowed: false, error: 'FORBIDDEN' };
  }

  if (requestedRole === 'VIEWER') {
    return { allowed: false, error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' };
  }

  const tokenHash = createHash('sha256').update(inviteToken).digest('hex');
  const expiresAt = new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const safeRole = requestedRole as InviteIssuanceRole;

  return {
    allowed: true,
    persistedInvite: {
      id: inviteId,
      tenantId,
      email,
      role: safeRole,
      tokenHash,
      expiresAt,
    },
    response: {
      invite: {
        id: inviteId,
        email,
        role: safeRole,
        expiresAt,
      },
      inviteToken,
    },
    audit: {
      tenantId,
      realm: 'TENANT',
      actorType: 'USER',
      actorId,
      action: 'member.invited',
      entity: 'invite',
      entityId: inviteId,
      metadataJson: {
        email,
        role: safeRole,
      },
    },
  };
}

type PendingInviteRevocationOutcome =
  | {
      allowed: true;
      response: {
        deleted: string;
      };
    }
  | {
      allowed: false;
      error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVITE_NOT_FOUND' | 'INVITE_NOT_PENDING';
    };

function evaluatePendingInviteRevocation(options: {
  actorRole: MembershipRole;
  hasDbContext: boolean;
  targetVisibleToOrg: boolean;
  acceptedAt: Date | null;
  expiresAt: Date;
  now: Date;
  inviteId: string;
}): PendingInviteRevocationOutcome {
  const {
    actorRole,
    hasDbContext,
    targetVisibleToOrg,
    acceptedAt,
    expiresAt,
    now,
    inviteId,
  } = options;

  if (!hasDbContext) {
    return { allowed: false, error: 'UNAUTHORIZED' };
  }

  if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
    return { allowed: false, error: 'FORBIDDEN' };
  }

  if (!targetVisibleToOrg) {
    return { allowed: false, error: 'INVITE_NOT_FOUND' };
  }

  if (acceptedAt !== null || expiresAt <= now) {
    return { allowed: false, error: 'INVITE_NOT_PENDING' };
  }

  return {
    allowed: true,
    response: {
      deleted: inviteId,
    },
  };
}

type PendingInviteResendOutcome =
  | {
      allowed: true;
      persistedInvite: {
        id: string;
        email: string;
        role: InviteIssuanceRole;
        tokenHash: string;
        expiresAt: Date;
        createdAt: Date;
      };
      response: {
        invite: {
          id: string;
          email: string;
          role: InviteIssuanceRole;
          expiresAt: Date;
          createdAt: Date;
        };
      };
      audit: {
        tenantId: string;
        realm: 'TENANT';
        actorType: 'USER';
        actorId: string | null;
        action: 'member.invite.resent';
        entity: 'invite';
        entityId: string;
        metadataJson: {
          email: string;
          role: InviteIssuanceRole;
        };
      };
    }
  | {
      allowed: false;
      error: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVITE_NOT_FOUND' | 'INVITE_NOT_PENDING';
    };

type PendingInviteEditOutcome =
  | {
      allowed: true;
      response: {
        invite: {
          id: string;
          email: string;
          role: InviteIssuanceRole;
          expiresAt: Date;
          createdAt: Date;
        };
      };
      audit: {
        tenantId: string;
        realm: 'TENANT';
        actorType: 'USER';
        actorId: string | null;
        action: 'member.invite.updated';
        entity: 'invite';
        entityId: string;
        metadataJson: {
          email: string;
          fromRole: InviteIssuanceRole;
          toRole: InviteIssuanceRole;
        };
      };
    }
  | {
      allowed: false;
      error:
        | 'UNAUTHORIZED'
        | 'FORBIDDEN'
        | 'INVITE_NOT_FOUND'
        | 'INVITE_NOT_PENDING'
        | 'VIEWER_TRANSITION_OUT_OF_SCOPE'
        | 'NO_OP_ROLE_CHANGE';
    };

function evaluatePendingInviteResend(options: {
  actorRole: MembershipRole;
  tenantId: string | null;
  actorId: string | null;
  hasDbContext: boolean;
  targetVisibleToOrg: boolean;
  email: string;
  role: InviteIssuanceRole;
  acceptedAt: Date | null;
  expiresAt: Date;
  now: Date;
  inviteId: string;
  createdAt: Date;
  resentAt: Date;
  inviteToken: string;
}): PendingInviteResendOutcome {
  const {
    actorRole,
    tenantId,
    actorId,
    hasDbContext,
    targetVisibleToOrg,
    email,
    role,
    acceptedAt,
    expiresAt,
    now,
    inviteId,
    createdAt,
    resentAt,
    inviteToken,
  } = options;

  if (!tenantId || !hasDbContext) {
    return { allowed: false, error: 'UNAUTHORIZED' };
  }

  if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
    return { allowed: false, error: 'FORBIDDEN' };
  }

  if (!targetVisibleToOrg) {
    return { allowed: false, error: 'INVITE_NOT_FOUND' };
  }

  if (acceptedAt !== null || expiresAt <= now) {
    return { allowed: false, error: 'INVITE_NOT_PENDING' };
  }

  const resentExpiresAt = new Date(resentAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const tokenHash = createHash('sha256').update(inviteToken).digest('hex');

  return {
    allowed: true,
    persistedInvite: {
      id: inviteId,
      email,
      role,
      tokenHash,
      expiresAt: resentExpiresAt,
      createdAt,
    },
    response: {
      invite: {
        id: inviteId,
        email,
        role,
        expiresAt: resentExpiresAt,
        createdAt,
      },
    },
    audit: {
      tenantId,
      realm: 'TENANT',
      actorType: 'USER',
      actorId,
      action: 'member.invite.resent',
      entity: 'invite',
      entityId: inviteId,
      metadataJson: {
        email,
        role,
      },
    },
  };
}

function evaluatePendingInviteEdit(options: {
  actorRole: MembershipRole;
  tenantId: string | null;
  actorId: string | null;
  hasDbContext: boolean;
  targetVisibleToOrg: boolean;
  email: string;
  currentRole: InviteIssuanceRole;
  requestedRole: MembershipRole;
  acceptedAt: Date | null;
  expiresAt: Date;
  now: Date;
  inviteId: string;
  createdAt: Date;
}): PendingInviteEditOutcome {
  const {
    actorRole,
    tenantId,
    actorId,
    hasDbContext,
    targetVisibleToOrg,
    email,
    currentRole,
    requestedRole,
    acceptedAt,
    expiresAt,
    now,
    inviteId,
    createdAt,
  } = options;

  if (!tenantId || !hasDbContext) {
    return { allowed: false, error: 'UNAUTHORIZED' };
  }

  if (actorRole !== 'OWNER' && actorRole !== 'ADMIN') {
    return { allowed: false, error: 'FORBIDDEN' };
  }

  if (!targetVisibleToOrg) {
    return { allowed: false, error: 'INVITE_NOT_FOUND' };
  }

  if (acceptedAt !== null || expiresAt <= now) {
    return { allowed: false, error: 'INVITE_NOT_PENDING' };
  }

  if (requestedRole === 'VIEWER') {
    return { allowed: false, error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' };
  }

  if (requestedRole === currentRole) {
    return { allowed: false, error: 'NO_OP_ROLE_CHANGE' };
  }

  const safeRole = requestedRole as InviteIssuanceRole;

  return {
    allowed: true,
    response: {
      invite: {
        id: inviteId,
        email,
        role: safeRole,
        expiresAt,
        createdAt,
      },
    },
    audit: {
      tenantId,
      realm: 'TENANT',
      actorType: 'USER',
      actorId,
      action: 'member.invite.updated',
      entity: 'invite',
      entityId: inviteId,
      metadataJson: {
        email,
        fromRole: currentRole,
        toRole: safeRole,
      },
    },
  };
}

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

describe('POST /api/tenant/memberships — invite issuance artifact contract', () => {
  it('persists a token hash, assigns a seven-day expiry, and returns activation-handoff metadata', () => {
    const issuedAt = new Date('2026-04-10T00:00:00.000Z');
    const inviteToken = 'invite-token-abc';

    const result = evaluateMembershipInviteIssuance({
      actorRole: 'OWNER',
      tenantId: 'tenant-uuid-1',
      actorId: 'user-uuid-1',
      email: 'invitee@acme.test',
      requestedRole: 'MEMBER',
      inviteId: 'invite-uuid-1',
      inviteToken,
      issuedAt,
    });

    expect(result.allowed).toBe(true);
    if (!result.allowed) {
      return;
    }

    expect(result.persistedInvite).toMatchObject({
      id: 'invite-uuid-1',
      tenantId: 'tenant-uuid-1',
      email: 'invitee@acme.test',
      role: 'MEMBER',
    });
    expect(result.persistedInvite.tokenHash).toBe(
      createHash('sha256').update(inviteToken).digest('hex')
    );
    expect(result.persistedInvite.expiresAt.toISOString()).toBe('2026-04-17T00:00:00.000Z');
    expect(result.persistedInvite).not.toHaveProperty('inviteToken');

    expect(result.response).toEqual({
      invite: {
        id: 'invite-uuid-1',
        email: 'invitee@acme.test',
        role: 'MEMBER',
        expiresAt: new Date('2026-04-17T00:00:00.000Z'),
      },
      inviteToken,
    });
  });

  it('emits a member.invited audit contract aligned with the created invite artifact', () => {
    const result = evaluateMembershipInviteIssuance({
      actorRole: 'ADMIN',
      tenantId: 'tenant-uuid-2',
      actorId: 'user-uuid-2',
      email: 'owner@acme.test',
      requestedRole: 'OWNER',
      inviteId: 'invite-uuid-2',
      inviteToken: 'invite-token-owner',
      issuedAt: new Date('2026-04-10T12:34:56.000Z'),
    });

    expect(result.allowed).toBe(true);
    if (!result.allowed) {
      return;
    }

    expect(result.audit).toEqual({
      tenantId: 'tenant-uuid-2',
      realm: 'TENANT',
      actorType: 'USER',
      actorId: 'user-uuid-2',
      action: 'member.invited',
      entity: 'invite',
      entityId: 'invite-uuid-2',
      metadataJson: {
        email: 'owner@acme.test',
        role: 'OWNER',
      },
    });
  });

  it('does not issue invite artifacts when tenant context is missing or VIEWER is requested', () => {
    expect(
      evaluateMembershipInviteIssuance({
        actorRole: 'OWNER',
        tenantId: null,
        actorId: 'user-uuid-3',
        email: 'invitee@acme.test',
        requestedRole: 'MEMBER',
        inviteId: 'invite-uuid-3',
        inviteToken: 'invite-token-member',
        issuedAt: new Date('2026-04-10T00:00:00.000Z'),
      })
    ).toEqual({ allowed: false, error: 'UNAUTHORIZED' });

    expect(
      evaluateMembershipInviteIssuance({
        actorRole: 'OWNER',
        tenantId: 'tenant-uuid-3',
        actorId: 'user-uuid-3',
        email: 'viewer@acme.test',
        requestedRole: 'VIEWER',
        inviteId: 'invite-uuid-4',
        inviteToken: 'invite-token-viewer',
        issuedAt: new Date('2026-04-10T00:00:00.000Z'),
      })
    ).toEqual({ allowed: false, error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' });
  });
});

describe('DELETE /api/tenant/memberships/invites/:id — pending invite revoke contract', () => {
  const now = new Date('2026-04-12T00:00:00.000Z');

  it('permits OWNER and ADMIN to revoke a current pending invite', () => {
    for (const actorRole of ['OWNER', 'ADMIN'] as const) {
      expect(
        evaluatePendingInviteRevocation({
          actorRole,
          hasDbContext: true,
          targetVisibleToOrg: true,
          acceptedAt: null,
          expiresAt: new Date('2026-04-18T00:00:00.000Z'),
          now,
          inviteId: 'invite-uuid-5',
        })
      ).toEqual({
        allowed: true,
        response: {
          deleted: 'invite-uuid-5',
        },
      });
    }
  });

  it('denies MEMBER and VIEWER actors from revoking pending invites', () => {
    expect(
      evaluatePendingInviteRevocation({
        actorRole: 'MEMBER',
        hasDbContext: true,
        targetVisibleToOrg: true,
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-6',
      })
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });

    expect(
      evaluatePendingInviteRevocation({
        actorRole: 'VIEWER',
        hasDbContext: true,
        targetVisibleToOrg: true,
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-7',
      })
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });
  });

  it('rejects missing database context or out-of-org invite targets', () => {
    expect(
      evaluatePendingInviteRevocation({
        actorRole: 'OWNER',
        hasDbContext: false,
        targetVisibleToOrg: true,
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-8',
      })
    ).toEqual({ allowed: false, error: 'UNAUTHORIZED' });

    expect(
      evaluatePendingInviteRevocation({
        actorRole: 'OWNER',
        hasDbContext: true,
        targetVisibleToOrg: false,
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-9',
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_FOUND' });
  });

  it('rejects accepted invites from this revoke path', () => {
    expect(
      evaluatePendingInviteRevocation({
        actorRole: 'ADMIN',
        hasDbContext: true,
        targetVisibleToOrg: true,
        acceptedAt: new Date('2026-04-11T12:00:00.000Z'),
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-10',
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_PENDING' });
  });

  it('rejects expired invites from this revoke path', () => {
    expect(
      evaluatePendingInviteRevocation({
        actorRole: 'ADMIN',
        hasDbContext: true,
        targetVisibleToOrg: true,
        acceptedAt: null,
        expiresAt: new Date('2026-04-11T23:59:59.000Z'),
        now,
        inviteId: 'invite-uuid-11',
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_PENDING' });
  });
});

describe('POST /api/tenant/memberships/invites/:id/resend — pending invite resend contract', () => {
  const now = new Date('2026-04-12T00:00:00.000Z');
  const resentAt = new Date('2026-04-12T09:30:00.000Z');
  const createdAt = new Date('2026-04-10T12:00:00.000Z');

  it('permits OWNER and ADMIN to resend a current pending invite and rotates its delivery artifact', () => {
    for (const actorRole of ['OWNER', 'ADMIN'] as const) {
      const result = evaluatePendingInviteResend({
        actorRole,
        tenantId: 'tenant-uuid-12',
        actorId: 'user-uuid-12',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        role: 'MEMBER',
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-12',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-12',
      });

      expect(result.allowed).toBe(true);
      if (!result.allowed) {
        return;
      }

      expect(result.persistedInvite).toMatchObject({
        id: 'invite-uuid-12',
        email: 'invitee@acme.test',
        role: 'MEMBER',
        createdAt,
      });
      expect(result.persistedInvite.tokenHash).toBe(
        createHash('sha256').update('resent-invite-token-12').digest('hex')
      );
      expect(result.persistedInvite.expiresAt.toISOString()).toBe('2026-04-19T09:30:00.000Z');
      expect(result.response).toEqual({
        invite: {
          id: 'invite-uuid-12',
          email: 'invitee@acme.test',
          role: 'MEMBER',
          expiresAt: new Date('2026-04-19T09:30:00.000Z'),
          createdAt,
        },
      });
      expect(result.response.invite).not.toHaveProperty('inviteToken');
      expect(result.response.invite).not.toHaveProperty('tokenHash');
      expect(result.audit).toEqual({
        tenantId: 'tenant-uuid-12',
        realm: 'TENANT',
        actorType: 'USER',
        actorId: 'user-uuid-12',
        action: 'member.invite.resent',
        entity: 'invite',
        entityId: 'invite-uuid-12',
        metadataJson: {
          email: 'invitee@acme.test',
          role: 'MEMBER',
        },
      });
    }
  });

  it('denies MEMBER and VIEWER actors from resending pending invites', () => {
    expect(
      evaluatePendingInviteResend({
        actorRole: 'MEMBER',
        tenantId: 'tenant-uuid-13',
        actorId: 'user-uuid-13',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        role: 'ADMIN',
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-13',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-13',
      })
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });

    expect(
      evaluatePendingInviteResend({
        actorRole: 'VIEWER',
        tenantId: 'tenant-uuid-13',
        actorId: 'user-uuid-13',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        role: 'ADMIN',
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-13',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-13b',
      })
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });
  });

  it('rejects missing tenant/database context or out-of-org invite targets', () => {
    expect(
      evaluatePendingInviteResend({
        actorRole: 'OWNER',
        tenantId: null,
        actorId: 'user-uuid-14',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        role: 'MEMBER',
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-14',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-14',
      })
    ).toEqual({ allowed: false, error: 'UNAUTHORIZED' });

    expect(
      evaluatePendingInviteResend({
        actorRole: 'OWNER',
        tenantId: 'tenant-uuid-14',
        actorId: 'user-uuid-14',
        hasDbContext: false,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        role: 'MEMBER',
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-14',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-14b',
      })
    ).toEqual({ allowed: false, error: 'UNAUTHORIZED' });

    expect(
      evaluatePendingInviteResend({
        actorRole: 'OWNER',
        tenantId: 'tenant-uuid-14',
        actorId: 'user-uuid-14',
        hasDbContext: true,
        targetVisibleToOrg: false,
        email: 'invitee@acme.test',
        role: 'MEMBER',
        acceptedAt: null,
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-14',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-14c',
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_FOUND' });
  });

  it('rejects accepted and expired invites from this resend path', () => {
    expect(
      evaluatePendingInviteResend({
        actorRole: 'ADMIN',
        tenantId: 'tenant-uuid-15',
        actorId: 'user-uuid-15',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        role: 'ADMIN',
        acceptedAt: new Date('2026-04-11T12:00:00.000Z'),
        expiresAt: new Date('2026-04-18T00:00:00.000Z'),
        now,
        inviteId: 'invite-uuid-15',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-15',
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_PENDING' });

    expect(
      evaluatePendingInviteResend({
        actorRole: 'ADMIN',
        tenantId: 'tenant-uuid-15',
        actorId: 'user-uuid-15',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        role: 'ADMIN',
        acceptedAt: null,
        expiresAt: new Date('2026-04-11T23:59:59.000Z'),
        now,
        inviteId: 'invite-uuid-15',
        createdAt,
        resentAt,
        inviteToken: 'resent-invite-token-15b',
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_PENDING' });
  });
});

describe('PATCH /api/tenant/memberships/invites/:id — pending invite edit contract', () => {
  const now = new Date('2026-04-12T00:00:00.000Z');
  const createdAt = new Date('2026-04-10T12:00:00.000Z');
  const expiresAt = new Date('2026-04-18T00:00:00.000Z');

  it('permits OWNER and ADMIN to update the role of a current pending invite and returns a safe projection', () => {
    for (const actorRole of ['OWNER', 'ADMIN'] as const) {
      const result = evaluatePendingInviteEdit({
        actorRole,
        tenantId: 'tenant-uuid-16',
        actorId: 'user-uuid-16',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-16',
        createdAt,
      });

      expect(result.allowed).toBe(true);
      if (!result.allowed) {
        return;
      }

      expect(result.response).toEqual({
        invite: {
          id: 'invite-uuid-16',
          email: 'invitee@acme.test',
          role: 'ADMIN',
          expiresAt,
          createdAt,
        },
      });
      expect(result.response.invite).not.toHaveProperty('inviteToken');
      expect(result.response.invite).not.toHaveProperty('tokenHash');
      expect(result.audit).toEqual({
        tenantId: 'tenant-uuid-16',
        realm: 'TENANT',
        actorType: 'USER',
        actorId: 'user-uuid-16',
        action: 'member.invite.updated',
        entity: 'invite',
        entityId: 'invite-uuid-16',
        metadataJson: {
          email: 'invitee@acme.test',
          fromRole: 'MEMBER',
          toRole: 'ADMIN',
        },
      });
    }
  });

  it('denies MEMBER and VIEWER actors from editing pending invites', () => {
    expect(
      evaluatePendingInviteEdit({
        actorRole: 'MEMBER',
        tenantId: 'tenant-uuid-17',
        actorId: 'user-uuid-17',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-17',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });

    expect(
      evaluatePendingInviteEdit({
        actorRole: 'VIEWER',
        tenantId: 'tenant-uuid-17',
        actorId: 'user-uuid-17',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-17',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'FORBIDDEN' });
  });

  it('rejects missing context, out-of-org targets, accepted invites, and expired invites', () => {
    expect(
      evaluatePendingInviteEdit({
        actorRole: 'OWNER',
        tenantId: null,
        actorId: 'user-uuid-18',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-18',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'UNAUTHORIZED' });

    expect(
      evaluatePendingInviteEdit({
        actorRole: 'OWNER',
        tenantId: 'tenant-uuid-18',
        actorId: 'user-uuid-18',
        hasDbContext: false,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-18',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'UNAUTHORIZED' });

    expect(
      evaluatePendingInviteEdit({
        actorRole: 'OWNER',
        tenantId: 'tenant-uuid-18',
        actorId: 'user-uuid-18',
        hasDbContext: true,
        targetVisibleToOrg: false,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-18',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_FOUND' });

    expect(
      evaluatePendingInviteEdit({
        actorRole: 'OWNER',
        tenantId: 'tenant-uuid-18',
        actorId: 'user-uuid-18',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: new Date('2026-04-11T10:00:00.000Z'),
        expiresAt,
        now,
        inviteId: 'invite-uuid-18',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_PENDING' });

    expect(
      evaluatePendingInviteEdit({
        actorRole: 'OWNER',
        tenantId: 'tenant-uuid-18',
        actorId: 'user-uuid-18',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt: new Date('2026-04-11T23:59:59.000Z'),
        now,
        inviteId: 'invite-uuid-18',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'INVITE_NOT_PENDING' });
  });

  it('rejects VIEWER targets and no-op role changes', () => {
    expect(
      evaluatePendingInviteEdit({
        actorRole: 'ADMIN',
        tenantId: 'tenant-uuid-19',
        actorId: 'user-uuid-19',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'MEMBER',
        requestedRole: 'VIEWER',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-19',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'VIEWER_TRANSITION_OUT_OF_SCOPE' });

    expect(
      evaluatePendingInviteEdit({
        actorRole: 'ADMIN',
        tenantId: 'tenant-uuid-19',
        actorId: 'user-uuid-19',
        hasDbContext: true,
        targetVisibleToOrg: true,
        email: 'invitee@acme.test',
        currentRole: 'ADMIN',
        requestedRole: 'ADMIN',
        acceptedAt: null,
        expiresAt,
        now,
        inviteId: 'invite-uuid-19',
        createdAt,
      })
    ).toEqual({ allowed: false, error: 'NO_OP_ROLE_CHANGE' });
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
