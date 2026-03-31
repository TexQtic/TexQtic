/**
 * Tenant Provisioning Types — G-008
 *
 * Doctrine v1.4 Constitutional Tenancy
 * TECS v1.6 compliant
 *
 * These types govern the canonical admin tenant provisioning endpoint.
 * Do NOT reference tenant_id anywhere in this file.
 * org_id is the ONLY canonical tenant boundary key.
 */

/**
 * Request body for POST /api/admin/tenants/provision
 *
 * Received only by authenticated admin actors.
 * Never trusted from tenant-plane callers.
 */
export interface TenantProvisionRequest {
  /** Provisioning branch; defaults to legacy admin provisioning when omitted. */
  provisioningMode?: 'LEGACY_ADMIN' | 'APPROVED_ONBOARDING';

  /** Display name for the new organization. Legacy admin provisioning only. */
  orgName?: string;

  /** Email address for the primary admin user. Legacy admin provisioning only. */
  primaryAdminEmail?: string;

  /**
   * Password for the primary admin user.
   * Accepted as plaintext and hashed with bcrypt inside the service.
   * NEVER logged, NEVER echoed in response.
   * Legacy admin provisioning only.
   */
  primaryAdminPassword?: string;

  /**
   * Canonical tenant identity category.
   * Replaces legacy 'type' field — aligned to B2-DESIGN canonical model (B2-REM-5A).
   * Maps to Prisma Tenant.type (DB column: type).
   */
  tenant_category: 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL';

  /**
   * White-label deployment flag.
   * Optional — defaults to false at service layer if omitted.
   * Maps to Prisma Tenant.isWhiteLabel (DB column: is_white_label).
   */
  is_white_label?: boolean;

  /** Cross-system orchestration reference owned by the onboarding case. */
  orchestrationReference?: string;

  /** Approved onboarding organization payload used to seed platform identity. */
  organization?: {
    legalName: string;
    displayName?: string;
    jurisdiction: string;
    registrationNumber?: string;
  };

  /** First-owner contact payload used to prepare platform-side access. */
  firstOwner?: {
    email: string;
  };

  /** Optional bounded metadata carried with the approved onboarding handoff. */
  approvedOnboardingMetadata?: Record<string, unknown>;
}

/**
 * Result returned by the provisioning service and route.
 *
 * Returns org_id (not tenant_id) as the canonical tenant boundary identifier.
 */
export interface TenantProvisionResult {
  /** Provisioning branch that produced the platform runtime roots. */
  provisioningMode: 'LEGACY_ADMIN' | 'APPROVED_ONBOARDING';

  /** Canonical org identifier (app.org_id) */
  orgId: string;

  /** URL-safe slug generated from the organization display name */
  slug: string;

  /** UUID of the created (or found) primary admin user, if any */
  userId: string | null;

  /** UUID of the created OWNER membership record, if any */
  membershipId: string | null;

  /** External orchestration reference persisted on the platform anchors */
  orchestrationReference: string | null;

  /** Seeded organization identity returned for later CRM consumption */
  organization: {
    legalName: string;
    jurisdiction: string;
    registrationNumber: string | null;
    status: string;
  };

  /** Platform-local first-owner access-preparation artifact, if created */
  firstOwnerAccessPreparation: {
    artifactType: 'PLATFORM_INVITE';
    inviteId: string;
    invitePurpose: 'FIRST_OWNER_PREPARATION';
    email: string;
    role: 'OWNER';
    expiresAt: Date;
    inviteToken: string;
  } | null;
}

/**
 * Internal provisioning context — passed through the service layer.
 * Tracks admin identity for audit trail.
 */
export interface ProvisionContext {
  /** Fastify request ID for tracing */
  requestId: string;

  /** Admin actor ID (from JWT adminId claim) */
  adminActorId: string;
}
