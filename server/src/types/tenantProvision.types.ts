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

import type { TenantPlan } from './index.js';
import type {
  CanonicalProvisioningIdentity,
  ProvisioningBaseFamily,
} from '../lib/database-context.js';

export type TenantProvisionCategory = 'AGGREGATOR' | 'B2B' | 'B2C' | 'INTERNAL';

type TenantProvisioningMode = 'LEGACY_ADMIN' | 'APPROVED_ONBOARDING';

/**
 * Request body for POST /api/admin/tenants/provision
 *
 * Received only by authenticated admin actors.
 * Never trusted from tenant-plane callers.
 */
export interface TenantProvisionRequest {
  /** Provisioning branch; defaults to legacy admin provisioning when omitted. */
  provisioningMode?: TenantProvisioningMode;

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

  /** Compatibility commercial plan alias retained while canonical writes normalize callers. */
  plan?: TenantPlan;

  /** Compatibility tenant-category alias retained while canonical writes normalize callers. */
  tenant_category?: TenantProvisionCategory;

  /** Compatibility white-label alias retained while canonical writes normalize callers. */
  is_white_label?: boolean;

  /** Canonical base-family write carrier. */
  base_family?: ProvisioningBaseFamily;

  /** Canonical aggregator capability write carrier. */
  aggregator_capability?: boolean;

  /** Canonical white-label capability write carrier. */
  white_label_capability?: boolean;

  /** Canonical commercial-plan write carrier. */
  commercial_plan?: TenantPlan;

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

export interface NormalizedTenantProvisionRequest
  extends Omit<
    TenantProvisionRequest,
    | 'plan'
    | 'tenant_category'
    | 'is_white_label'
    | 'base_family'
    | 'aggregator_capability'
    | 'white_label_capability'
    | 'commercial_plan'
  >,
    CanonicalProvisioningIdentity {}

export interface LegacyAdminProvisionRequest extends NormalizedTenantProvisionRequest {
  provisioningMode?: 'LEGACY_ADMIN';
  orgName: string;
  primaryAdminEmail: string;
  primaryAdminPassword: string;
}

export interface ApprovedOnboardingProvisionRequest extends NormalizedTenantProvisionRequest {
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
}

export interface TenantProvisionNormalizationIssue {
  path: Array<string | number>;
  message: string;
}

function resolveCanonicalShapeFromLegacyTenantCategory(
  tenantCategory: TenantProvisionCategory
): Pick<CanonicalProvisioningIdentity, 'base_family' | 'aggregator_capability'> {
  switch (tenantCategory) {
    case 'AGGREGATOR':
      return {
        base_family: 'INTERNAL',
        aggregator_capability: true,
      };
    case 'B2B':
    case 'B2C':
    case 'INTERNAL':
      return {
        base_family: tenantCategory,
        aggregator_capability: false,
      };
  }
}

export function resolveProvisioningStorageBridge(identity: CanonicalProvisioningIdentity): {
  tenant_category: TenantProvisionCategory;
  is_white_label: boolean;
  plan: TenantPlan;
} {
  if (identity.aggregator_capability) {
    if (identity.base_family !== 'INTERNAL') {
      throw new Error('base_family must be INTERNAL when aggregator_capability is true');
    }

    return {
      tenant_category: 'AGGREGATOR',
      is_white_label: identity.white_label_capability,
      plan: identity.commercial_plan,
    };
  }

  return {
    tenant_category: identity.base_family,
    is_white_label: identity.white_label_capability,
    plan: identity.commercial_plan,
  };
}

function resolveCanonicalProvisioningIdentityInput(
  request: TenantProvisionRequest
):
  | { success: true; data: CanonicalProvisioningIdentity }
  | { success: false; errors: TenantProvisionNormalizationIssue[] } {
  const errors: TenantProvisionNormalizationIssue[] = [];
  const defaultCommercialPlan =
    request.provisioningMode === 'APPROVED_ONBOARDING' ? 'FREE' : undefined;
  const legacyIdentityShape = request.tenant_category
    ? resolveCanonicalShapeFromLegacyTenantCategory(request.tenant_category)
    : null;

  const base_family = request.base_family ?? legacyIdentityShape?.base_family;
  const aggregator_capability =
    request.aggregator_capability ?? legacyIdentityShape?.aggregator_capability ?? false;
  const white_label_capability = request.white_label_capability ?? request.is_white_label ?? false;
  const commercial_plan = request.commercial_plan ?? request.plan ?? defaultCommercialPlan;

  if (!base_family) {
    errors.push({
      path: ['base_family'],
      message: 'base_family or tenant_category is required',
    });
  }

  if (!commercial_plan) {
    errors.push({
      path: ['commercial_plan'],
      message: 'commercial_plan or plan is required',
    });
  }

  if (aggregator_capability && base_family && base_family !== 'INTERNAL') {
    errors.push({
      path: ['base_family'],
      message: 'base_family must be INTERNAL when aggregator_capability is true',
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      base_family,
      aggregator_capability,
      white_label_capability,
      commercial_plan,
    },
  };
}

function collectLegacyIdentityConflicts(
  request: TenantProvisionRequest,
  canonicalIdentity: CanonicalProvisioningIdentity,
  storageBridge: ReturnType<typeof resolveProvisioningStorageBridge>
): TenantProvisionNormalizationIssue[] {
  const errors: TenantProvisionNormalizationIssue[] = [];

  if (request.tenant_category && request.tenant_category !== storageBridge.tenant_category) {
    errors.push({
      path: ['tenant_category'],
      message: 'tenant_category conflicts with the canonical provisioning identity',
    });
  }

  if (
    typeof request.is_white_label === 'boolean' &&
    request.is_white_label !== canonicalIdentity.white_label_capability
  ) {
    errors.push({
      path: ['is_white_label'],
      message: 'is_white_label conflicts with white_label_capability',
    });
  }

  if (request.plan && request.plan !== canonicalIdentity.commercial_plan) {
    errors.push({
      path: ['plan'],
      message: 'plan conflicts with commercial_plan',
    });
  }

  return errors;
}

export function normalizeTenantProvisionRequest(
  request: TenantProvisionRequest
):
  | { success: true; data: NormalizedTenantProvisionRequest }
  | { success: false; errors: TenantProvisionNormalizationIssue[] } {
  const canonicalIdentityResult = resolveCanonicalProvisioningIdentityInput(request);

  if (!canonicalIdentityResult.success) {
    return canonicalIdentityResult;
  }

  const canonicalIdentity = canonicalIdentityResult.data;

  let storageBridge: ReturnType<typeof resolveProvisioningStorageBridge>;

  try {
    storageBridge = resolveProvisioningStorageBridge(canonicalIdentity);
  } catch (error) {
    return {
      success: false,
      errors: [{
        path: ['base_family'],
        message: error instanceof Error ? error.message : 'Invalid canonical provisioning identity',
      }],
    };
  }

  const errors = collectLegacyIdentityConflicts(request, canonicalIdentity, storageBridge);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const {
    plan: _plan,
    tenant_category: _tenantCategory,
    is_white_label: _isWhiteLabel,
    base_family: _rawBaseFamily,
    aggregator_capability: _rawAggregatorCapability,
    white_label_capability: _rawWhiteLabelCapability,
    commercial_plan: _rawCommercialPlan,
    ...rest
  } = request;

  return {
    success: true,
    data: {
      ...rest,
      ...canonicalIdentity,
    },
  };
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

  /** Canonical four-axis provisioning identity carried without changing storage shape. */
  provisioning_identity: CanonicalProvisioningIdentity;

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
