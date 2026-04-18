/**
 * Tenant Provisioning Service — G-008
 *
 * Doctrine v1.4 Constitutional Tenancy
 * TECS v1.6 compliant
 *
 * CONSTITUTIONAL CONSTRAINTS:
 * - app.org_id is the ONLY tenant scoping key (NEVER app.tenant_id)
 * - All set_config calls use tx-local=true (pooler-safe)
 * - Admin context entered first (is_admin=true)
 * - Tenant context set before membership creation (org_id=newTenantId)
 * - Context auto-clears on transaction end (SET LOCAL semantics)
 * - No global session bleed permitted
 */

import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../db/prisma.js';
import { resolveCanonicalProvisioningIdentity } from '../lib/database-context.js';
import type { TenantPlan } from '../types/index.js';
import type {
  TenantProvisionRequest,
  TenantProvisionResult,
  ProvisionContext,
} from '../types/tenantProvision.types.js';

/**
 * Admin sentinel — used as actor during cross-tenant admin operations.
 * Same value as used in control.ts (G-004 established convention).
 */
const ADMIN_SENTINEL_ID = '00000000-0000-0000-0000-000000000001';

/** bcrypt cost factor (matches auth.ts pattern) */
const BCRYPT_ROUNDS = 12;

const INVITE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const PROVISION_TRANSACTION_TIMEOUT_MS = 20_000;

/**
 * Generate a URL-safe slug from an org name.
 * Truncated to 90 chars to leave room for uniqueness suffix if needed.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 90);
}

type LegacyProvisionRequest = TenantProvisionRequest & {
  provisioningMode?: 'LEGACY_ADMIN';
  orgName: string;
  primaryAdminEmail: string;
  primaryAdminPassword: string;
  plan: TenantPlan;
};

type ApprovedOnboardingProvisionRequest = TenantProvisionRequest & {
  provisioningMode: 'APPROVED_ONBOARDING';
  orchestrationReference: string;
  organization: {
    legalName: string;
    displayName?: string;
    jurisdiction: string;
    registrationNumber?: string;
  };
  firstOwner: {
    email: string;
  };
};

function isApprovedOnboardingProvisionRequest(
  request: TenantProvisionRequest
): request is ApprovedOnboardingProvisionRequest {
  return request.provisioningMode === 'APPROVED_ONBOARDING';
}

function assertLegacyProvisionRequest(request: TenantProvisionRequest): LegacyProvisionRequest {
  if (!request.orgName || !request.primaryAdminEmail || !request.primaryAdminPassword || !request.plan) {
    throw new Error('PROVISION_ABORT: Legacy admin provisioning requires orgName, primaryAdminEmail, primaryAdminPassword, and plan');
  }

  return request as LegacyProvisionRequest;
}

function buildInviteArtifact() {
  const inviteToken = randomBytes(32).toString('hex');
  return {
    inviteToken,
    tokenHash: createHash('sha256').update(inviteToken).digest('hex'),
    expiresAt: new Date(Date.now() + INVITE_EXPIRY_MS),
  };
}

/**
 * provisionTenant — Canonical admin tenant provisioning
 *
 * Execution sequence (single atomic transaction):
 *
 * Phase 1 — Admin context:
 *   SET LOCAL ROLE texqtic_app
 *   set_config('app.org_id',    ADMIN_SENTINEL_ID, true)  ← tx-local
 *   set_config('app.actor_id',  ADMIN_SENTINEL_ID, true)  ← tx-local
 *   set_config('app.realm',     'control',         true)  ← tx-local
 *   set_config('app.is_admin',  'true',            true)  ← tx-local
 *   set_config('app.bypass_rls','off',             true)  ← tx-local
 *   Assert: current_setting('app.is_admin') = 'true'
 *   CREATE tenant
 *
 * Phase 2 — Tenant context (for membership creation):
 *   set_config('app.org_id',   newOrgId, true)  ← switch to new tenant
 *   set_config('app.realm',    'tenant', true)
 *   is_admin remains 'true' — required to write to empty tenant
 *   UPSERT user
 *   CREATE membership (OWNER)
 *
 * Context clear — automatic on transaction commit (tx-local SET LOCAL semantics).
 * No explicit clear needed; pooler connection is unpolluted.
 *
 * STOP-LOSS triggers:
 * - Admin context assertion fails → throws PROVISION_ABORT
 * - org_id not visible after creation → Prisma will throw (not null constraint)
 * - Any set_config uses false → violation of this file's contract (static gate)
 *
 * @param request  - Validated provisioning request body
 * @param ctx      - Admin actor context (for tracing)
 * @returns        TenantProvisionResult with org_id, slug, userId, membershipId
 */
export async function provisionTenant(
  request: TenantProvisionRequest,
  ctx: ProvisionContext
): Promise<TenantProvisionResult> {
  const isApprovedOnboarding = isApprovedOnboardingProvisionRequest(request);
  const approvedOnboardingRequest = isApprovedOnboarding ? request : null;
  const legacyRequest = isApprovedOnboarding ? null : assertLegacyProvisionRequest(request);

  let passwordHash: string | null = null;
  let orgDisplayName: string;
  let orgLegalName: string;
  let orchestrationReference: string | null;
  let approvedOnboardingJurisdiction = 'UNKNOWN';
  let approvedOnboardingRegistrationNumber: string | undefined;

  if (approvedOnboardingRequest) {
    orgDisplayName = approvedOnboardingRequest.organization.displayName?.trim() || approvedOnboardingRequest.organization.legalName.trim();
    orgLegalName = approvedOnboardingRequest.organization.legalName.trim();
    orchestrationReference = approvedOnboardingRequest.orchestrationReference.trim();
    approvedOnboardingJurisdiction = approvedOnboardingRequest.organization.jurisdiction.trim();
    approvedOnboardingRegistrationNumber = approvedOnboardingRequest.organization.registrationNumber?.trim();
  } else {
    const legacyProvisionRequest = legacyRequest;

    if (!legacyProvisionRequest) {
      throw new Error('PROVISION_ABORT: Legacy admin provisioning context was not resolved');
    }

    passwordHash = await bcrypt.hash(legacyProvisionRequest.primaryAdminPassword, BCRYPT_ROUNDS);
    orgDisplayName = legacyProvisionRequest.orgName.trim();
    orgLegalName = legacyProvisionRequest.orgName.trim();
    orchestrationReference = null;
  }

  return prisma.$transaction(async tx => {
    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 1 — Admin context (tx-local, pooler-safe)
    // Sets ONLY app.org_id with ADMIN_SENTINEL_ID for cross-tenant admin access
    // NEVER sets app.tenant_id (forbidden by Doctrine v1.4 §11.3)
    //
    // NOTE: We do NOT call SET LOCAL ROLE texqtic_app until Phase 2 (membership).
    //
    // `tenants` is a control-plane table — no tenant_id column, no tenant-scoped
    // RLS INSERT policy. texqtic_app cannot INSERT here.
    // `users` is a global table — no tenant_id column, belongs to no single tenant.
    // texqtic_app cannot INSERT here either.
    //
    // Both are created as postgres (BYPASSRLS), which is the connection's native role.
    // Only `memberships` — which IS tenant-scoped and has RLS — requires the role
    // switch to texqtic_app with an org_id context.
    //
    // This correctly reflects the architecture:
    //   tenants, users  → control-plane writes (postgres, BYPASSRLS)
    //   memberships     → tenant-plane write (texqtic_app + org_id context)
    // ─────────────────────────────────────────────────────────────────────────

    // Set admin org context (tx-local=true → auto-clears on tx end)
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.org_id', $1, true)`,
      ADMIN_SENTINEL_ID
    );

    // Set actor identity (tx-local=true)
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.actor_id', $1, true)`,
      ctx.adminActorId
    );

    // Set control-plane realm (tx-local=true)
    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'control', true)`);

    // Grant admin RLS bypass flag (tx-local=true)
    await tx.$executeRawUnsafe(`SELECT set_config('app.is_admin', 'true', true)`);

    // Explicit RLS enforcement (not bypassed; admin flag is the bypass mechanism)
    await tx.$executeRawUnsafe(`SELECT set_config('app.bypass_rls', 'off', true)`);

    // Set request trace ID (tx-local=true)
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.request_id', $1, true)`,
      ctx.requestId
    );

    // ── STOP-LOSS: Assert admin context is active before any writes ───────────
    const adminCheck = await tx.$queryRaw<Array<{ is_admin: string }>>`
      SELECT current_setting('app.is_admin', true) AS is_admin
    `;
    const isAdminActive = adminCheck[0]?.is_admin === 'true';
    if (!isAdminActive) {
      throw new Error(
        'PROVISION_ABORT: Admin context assertion failed. ' +
          'current_setting(app.is_admin) != "true". ' +
          'Transaction rolled back. No tenant created.'
      );
    }

    // ── Create organization (tenant) ─────────────────────────────────────────
    // Runs as postgres (BYPASSRLS) — tenants is a control-plane table.
    const slug = slugify(orgDisplayName);

    const tenant = await tx.tenant.create({
      data: {
        name: orgDisplayName,
        slug,
        externalOrchestrationRef: orchestrationReference ?? undefined,
        plan: legacyRequest?.plan,
        // B2-REM-5A: canonical identity fields wired from provisioning request
        // type = Prisma field name for tenant_category API field
        type: request.tenant_category,
        isWhiteLabel: request.is_white_label ?? false,
      },
      select: {
        id: true,
        slug: true,
        type: true,
        status: true,
        plan: true,
      },
    });

    const provisioningIdentity = resolveCanonicalProvisioningIdentity({
      tenantCategory: tenant.type,
      whiteLabelCapability: request.is_white_label ?? false,
      commercialPlan: tenant.plan,
    });

    // Runtime tenant identity reads organizations.is_white_label via getOrganizationIdentity().
    // Provisioning must therefore write the WL flag into the canonical organizations row,
    // not only the transitional tenants mirror, so newly provisioned tenants rehydrate correctly.
    const organizationStatus = isApprovedOnboarding ? 'VERIFICATION_APPROVED' : tenant.status;

    const organization = await tx.organizations.upsert({
      where: { id: tenant.id },
      create: {
        id: tenant.id,
        slug: tenant.slug,
        legal_name: orgLegalName,
        external_orchestration_ref: orchestrationReference ?? undefined,
        jurisdiction: isApprovedOnboarding ? approvedOnboardingJurisdiction : 'UNKNOWN',
        registration_no: isApprovedOnboarding ? approvedOnboardingRegistrationNumber : undefined,
        org_type: tenant.type,
        status: organizationStatus,
        plan: tenant.plan,
        is_white_label: request.is_white_label ?? false,
      },
      update: {
        slug: tenant.slug,
        legal_name: orgLegalName,
        external_orchestration_ref: orchestrationReference ?? undefined,
        jurisdiction: isApprovedOnboarding ? approvedOnboardingJurisdiction : 'UNKNOWN',
        registration_no: isApprovedOnboarding ? approvedOnboardingRegistrationNumber : undefined,
        org_type: tenant.type,
        status: organizationStatus,
        plan: tenant.plan,
        is_white_label: request.is_white_label ?? false,
        updated_at: new Date(),
      },
      select: {
        legal_name: true,
        jurisdiction: true,
        registration_no: true,
        status: true,
      },
    });

    if (approvedOnboardingRequest) {
      const inviteArtifact = buildInviteArtifact();

      await tx.$executeRawUnsafe(
        `SELECT set_config('app.org_id', $1, true)`,
        tenant.id
      );
      await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'tenant', true)`);

      const invite = await tx.invite.create({
        data: {
          tenantId: tenant.id,
          email: approvedOnboardingRequest.firstOwner.email,
          externalOrchestrationRef: orchestrationReference,
          invitePurpose: 'FIRST_OWNER_PREPARATION',
          role: 'OWNER',
          tokenHash: inviteArtifact.tokenHash,
          expiresAt: inviteArtifact.expiresAt,
        },
        select: {
          id: true,
          email: true,
          expiresAt: true,
        },
      });

      return {
        provisioningMode: 'APPROVED_ONBOARDING',
        orgId: tenant.id,
        slug: tenant.slug,
        userId: null,
        membershipId: null,
        orchestrationReference,
        provisioning_identity: provisioningIdentity,
        organization: {
          legalName: organization.legal_name,
          jurisdiction: organization.jurisdiction,
          registrationNumber: organization.registration_no ?? null,
          status: organization.status,
        },
        firstOwnerAccessPreparation: {
          artifactType: 'PLATFORM_INVITE',
          inviteId: invite.id,
          invitePurpose: 'FIRST_OWNER_PREPARATION',
          email: invite.email,
          role: 'OWNER',
          expiresAt: invite.expiresAt,
          inviteToken: inviteArtifact.inviteToken,
        },
      };
    }

    if (!legacyRequest) {
      throw new Error('PROVISION_ABORT: Legacy admin provisioning request missing after approved-onboarding branch');
    }

    // ── Create or find primary admin user ─────────────────────────────────────
    // Runs as postgres (BYPASSRLS) — users is a global table (no tenant_id column).
    // texqtic_app cannot INSERT into users (no applicable INSERT policy).
    let user = await tx.user.findUnique({
      where: { email: legacyRequest.primaryAdminEmail },
      select: { id: true },
    });

    if (!user) {
      if (!passwordHash) {
        throw new Error('PROVISION_ABORT: Legacy admin provisioning password hash was not resolved');
      }

      user = await tx.user.create({
        data: {
          email: legacyRequest.primaryAdminEmail,
          passwordHash,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PHASE 2 — Tenant context for membership creation only
    // Now switch to texqtic_app (NOBYPASSRLS) so RLS is enforced on memberships.
    // memberships IS tenant-scoped; its INSERT policy requires app.org_id = tenant.id.
    // Switch org_id to the new tenant — tx-local, same transaction.
    // ─────────────────────────────────────────────────────────────────────────

    // Switch canonical org boundary to new tenant (tx-local=true)
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.org_id', $1, true)`,
      tenant.id
    );

    // Narrow realm to tenant-plane (tx-local=true)
    await tx.$executeRawUnsafe(`SELECT set_config('app.realm', 'tenant', true)`);

    // ── Create primary OWNER membership ───────────────────────────────────────
    const membership = await tx.membership.create({
      data: {
        userId:   user.id,
        tenantId: tenant.id,   // Prisma field → maps to tenant_id column (NOT a set_config key)
        role:     'OWNER',
      },
      select: { id: true },
    });

    // ── Context clear is automatic ─────────────────────────────────────────────
    // tx-local SET LOCAL semantics: all set_config values auto-expire when
    // this transaction commits. No explicit clear_context() call is needed.
    // The pooler connection is returned clean.

    return {
      provisioningMode: 'LEGACY_ADMIN',
      orgId:        tenant.id,
      slug:         tenant.slug,
      userId:       user.id,
      membershipId: membership.id,
      orchestrationReference: null,
      provisioning_identity: provisioningIdentity,
      organization: {
        legalName: organization.legal_name,
        jurisdiction: organization.jurisdiction,
        registrationNumber: organization.registration_no ?? null,
        status: organization.status,
      },
      firstOwnerAccessPreparation: null,
    };
  }, {
    timeout: PROVISION_TRANSACTION_TIMEOUT_MS,
  });
}
