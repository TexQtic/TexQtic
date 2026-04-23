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

export const ORGANIZATION_ROLE_POSITION_KEYS = [
  'manufacturer',
  'trader',
  'service_provider',
] as const;

export type OrganizationRolePositionKey = (typeof ORGANIZATION_ROLE_POSITION_KEYS)[number];

export interface CanonicalProvisioningTaxonomyAssignment {
  primary_segment_key: string | null;
  secondary_segment_keys: string[];
  role_position_keys: OrganizationRolePositionKey[];
}

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

  /** Canonical B2B taxonomy primary segment write carrier. */
  primary_segment_key?: string;

  /** Canonical B2B taxonomy secondary segments write carrier. */
  secondary_segment_keys?: string[];

  /** Canonical B2B role-position write carrier. */
  role_position_keys?: OrganizationRolePositionKey[];

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
    | 'primary_segment_key'
    | 'secondary_segment_keys'
    | 'role_position_keys'
  >,
    CanonicalProvisioningIdentity,
    CanonicalProvisioningTaxonomyAssignment {}

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

function normalizeSegmentKey(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function normalizeSegmentKeyList(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  return values
    .map(value => value.trim())
    .filter((value): value is string => value.length > 0);
}

function normalizeRolePositionKeyList(
  values: OrganizationRolePositionKey[] | undefined
): OrganizationRolePositionKey[] {
  if (!values) {
    return [];
  }

  return values
    .map(value => value.trim())
    .filter((value): value is OrganizationRolePositionKey => value.length > 0);
}

function hasDuplicateValues(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function resolveCanonicalProvisioningTaxonomyInput(
  request: TenantProvisionRequest,
  canonicalIdentity: CanonicalProvisioningIdentity
):
  | { success: true; data: CanonicalProvisioningTaxonomyAssignment }
  | { success: false; errors: TenantProvisionNormalizationIssue[] } {
  const primary_segment_key = normalizeSegmentKey(request.primary_segment_key);
  const secondary_segment_keys = normalizeSegmentKeyList(request.secondary_segment_keys);
  const role_position_keys = normalizeRolePositionKeyList(request.role_position_keys);
  const errors: TenantProvisionNormalizationIssue[] = [];
  const taxonomyAssignmentRequested =
    primary_segment_key !== null ||
    secondary_segment_keys.length > 0 ||
    role_position_keys.length > 0;

  if (!taxonomyAssignmentRequested) {
    return {
      success: true,
      data: {
        primary_segment_key: null,
        secondary_segment_keys: [],
        role_position_keys: [],
      },
    };
  }

  if (request.base_family !== 'B2B') {
    errors.push({
      path: ['base_family'],
      message: 'base_family must be explicitly set to B2B when assigning canonical B2B taxonomy',
    });
  }

  if (canonicalIdentity.base_family !== 'B2B') {
    errors.push({
      path: ['base_family'],
      message: 'canonical B2B taxonomy may only be assigned for B2B provisioning',
    });
  }

  for (const [index, rolePositionKey] of role_position_keys.entries()) {
    if (!ORGANIZATION_ROLE_POSITION_KEYS.includes(rolePositionKey)) {
      errors.push({
        path: ['role_position_keys', index],
        message: 'role_position_keys entries must be one of: manufacturer, trader, service_provider',
      });
    }
  }

  if (primary_segment_key === null) {
    errors.push({
      path: ['primary_segment_key'],
      message: 'primary_segment_key is required when assigning canonical B2B taxonomy',
    });
  }

  if (
    primary_segment_key !== null &&
    secondary_segment_keys.includes(primary_segment_key)
  ) {
    errors.push({
      path: ['secondary_segment_keys'],
      message: 'primary_segment_key must not also appear in secondary_segment_keys',
    });
  }

  if (hasDuplicateValues(secondary_segment_keys)) {
    errors.push({
      path: ['secondary_segment_keys'],
      message: 'secondary_segment_keys must be unique',
    });
  }

  if (hasDuplicateValues(role_position_keys)) {
    errors.push({
      path: ['role_position_keys'],
      message: 'role_position_keys must be unique',
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      primary_segment_key,
      secondary_segment_keys,
      role_position_keys,
    },
  };
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
  const canonicalTaxonomyResult = resolveCanonicalProvisioningTaxonomyInput(request, canonicalIdentity);

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

  const errors = [
    ...collectLegacyIdentityConflicts(request, canonicalIdentity, storageBridge),
    ...(canonicalTaxonomyResult.success ? [] : canonicalTaxonomyResult.errors),
  ];

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const canonicalTaxonomy = canonicalTaxonomyResult.data;

  const {
    plan: _plan,
    tenant_category: _tenantCategory,
    is_white_label: _isWhiteLabel,
    base_family: _rawBaseFamily,
    aggregator_capability: _rawAggregatorCapability,
    white_label_capability: _rawWhiteLabelCapability,
    commercial_plan: _rawCommercialPlan,
    primary_segment_key: _rawPrimarySegmentKey,
    secondary_segment_keys: _rawSecondarySegmentKeys,
    role_position_keys: _rawRolePositionKeys,
    ...rest
  } = request;

  return {
    success: true,
    data: {
      ...rest,
      ...canonicalIdentity,
      ...canonicalTaxonomy,
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

// ─── CRM Provisioning Status Types ───────────────────────────────────────────

/**
 * Canonical provisioning lifecycle status for CRM-safe polling.
 *
 * PROVISIONED — tenant + org + invite exist; first-owner invite not yet accepted.
 * ACTIVATED   — invite accepted + OWNER membership exists + org status is post-activation.
 */
export type CrmProvisioningStatus = 'PROVISIONED' | 'ACTIVATED';

/**
 * Parameters for querying provisioning status.
 * At least one of orgId or orchestrationReference must be provided.
 */
export interface ProvisioningStatusQueryParams {
  orgId?: string;
  orchestrationReference?: string;
}

/**
 * Response contract for GET /api/control/tenants/provision/status.
 *
 * provisioningStatus derivation (derived — no schema change):
 *   PROVISIONED: tenant + org + invite exist; invite.acceptedAt IS NULL
 *   ACTIVATED:   invite.acceptedAt IS NOT NULL
 *                + OWNER membership exists
 *                + org.status in POST_ACTIVATION_ORG_STATUSES
 *                  { PENDING_VERIFICATION, ACTIVE, SUSPENDED, CLOSED }
 */
export interface ProvisioningStatusResponse {
  orgId: string;
  orchestrationReference: string | null;
  slug: string;
  provisioningStatus: CrmProvisioningStatus;
  organizationStatus: string;
  firstOwnerAccessPreparation: {
    inviteId: string;
    invitePurpose: string;
    email: string;
    expiresAt: string;
    acceptedAt: string | null;
  } | null;
  firstOwner: {
    userId: string | null;
    membershipId: string | null;
    role: string | null;
  };
  activation: {
    isActivated: boolean;
    activatedAt: string | null;
    activationSignal: 'INVITE_ACCEPTED_OWNER_MEMBERSHIP_PENDING_VERIFICATION' | null;
  };
}
