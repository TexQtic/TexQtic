/**
 * TexQtic Tenant Service
 *
 * Tenant-plane operations including:
 * - Activation (user-assisted)
 * - Membership management
 * - Branding configuration
 */

import { post } from './apiClient';
import { tenantDelete, tenantGet, tenantPost, tenantPut, tenantPatch } from './tenantApiClient';

// ==================== ACTIVATION ====================

export type ScaffoldConsentSourceFlow =
  | 'ACTIVATE_NEW_USER'
  | 'ACTIVATE_AUTHENTICATED_INVITE';

export interface ScaffoldConsentPayload {
  agreementType: 'PLATFORM_TERMS' | 'SUPPLIER_ONBOARDING_TERMS' | 'PRIVACY_NOTICE_ACK';
  agreementVersion: string;
  agreementHash: string;
  agreementSourceUrl: string;
  legalStatus: 'LEGAL_PENDING';
  sourceFlow: ScaffoldConsentSourceFlow;
  accepted: boolean;
  acceptedAt: string;
  metadataJson?: Record<string, unknown>;
}

const CONSENT_SCAFFOLD_PLACEHOLDER_VERSION = 'PENDING_FINAL_LEGAL_PACKAGE';
const CONSENT_SCAFFOLD_PLACEHOLDER_HASH = 'PENDING_FINAL_LEGAL_PACKAGE';
const CONSENT_SCAFFOLD_PLACEHOLDER_SOURCE =
  '/legal/pending-final-legal-package';

export function buildLegalPendingScaffoldConsent(
  sourceFlow: ScaffoldConsentSourceFlow,
): ScaffoldConsentPayload {
  return {
    agreementType: 'PLATFORM_TERMS',
    agreementVersion: CONSENT_SCAFFOLD_PLACEHOLDER_VERSION,
    agreementHash: CONSENT_SCAFFOLD_PLACEHOLDER_HASH,
    agreementSourceUrl: CONSENT_SCAFFOLD_PLACEHOLDER_SOURCE,
    legalStatus: 'LEGAL_PENDING',
    sourceFlow,
    accepted: true,
    acceptedAt: new Date().toISOString(),
    metadataJson: {
      scaffoldMode: true,
      legalCheckpointState: 'LEGAL_PENDING',
      legalApprovalState: 'NOT_LEGAL_APPROVED',
    },
  };
}

export interface ActivateTenantRequest {
  inviteToken: string;
  userData: {
    email: string;
    password: string;
  };
  tenantData?: {
    name?: string;
    industry?: string;
  };
  verificationData: {
    registrationNumber: string;
    jurisdiction: string;
  };
  consent?: ScaffoldConsentPayload;
}

export interface ActivateTenantResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    type: string;
    tenant_category?: string | null;
    is_white_label?: boolean;
    status: string;
    plan: import('../types').CommercialPlan;
  };
  membership: {
    role: string;
  };
}

// Error codes returned by the activation endpoint (HTTP 409)
export const ACTIVATION_ERROR_CODES = {
  EXISTING_USER_MUST_SIGN_IN: 'EXISTING_USER_MUST_SIGN_IN',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
} as const;

/**
 * Activate a pre-provisioned tenant with invite token
 * Users cannot create tenants - they can only activate existing ones
 */
export async function activateTenant(
  request: ActivateTenantRequest
): Promise<ActivateTenantResponse> {
  return post<ActivateTenantResponse>('/api/tenant/activate', request);
}

/**
 * Accept a pending invite for an already-authenticated user.
 * Called after sign-in when a pendingInviteToken is present.
 * The response shape is identical to ActivateTenantResponse.
 */
export async function acceptAuthenticatedInvite(
  request: { inviteToken: string; consent?: ScaffoldConsentPayload }
): Promise<ActivateTenantResponse> {
  return post<ActivateTenantResponse>('/api/tenant/activate-authenticated', request);
}

// ==================== MEMBERSHIP ====================

export interface MemberUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

export interface Membership {
  id: string;
  role: string;
  userId: string;
  tenantId: string;
  createdAt?: string;
  updatedAt?: string;
  user: MemberUser;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

export type InviteEmailDeliveryStatus =
  | 'DEV_LOGGED'
  | 'SKIPPED_SMTP_UNCONFIGURED'
  | 'SENT'
  | 'FAILED_NON_FATAL';

export interface InviteEmailDeliveryOutcome {
  status: InviteEmailDeliveryStatus;
}

export interface MembershipsResponse {
  memberships: Membership[];
  pendingInvites: PendingInvite[];
  count: number;
}

/**
 * Fetch all memberships for the current tenant (G-W3-ROUTING-001)
 * Accessible to authenticated tenant members with role OWNER, ADMIN, or MEMBER.
 * VIEWER is denied (403). Tenant boundary additionally enforced by RLS via app.org_id.
 */
export async function getMemberships(): Promise<MembershipsResponse> {
  return tenantGet<MembershipsResponse>('/api/tenant/memberships');
}

export interface CreateMembershipRequest {
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
}

export interface CreateMembershipResponse {
  invite: {
    id: string;
    email: string;
    role: string;
    expiresAt: string;
  };
  inviteToken: string;
  emailDelivery: InviteEmailDeliveryOutcome;
}

/**
 * Create/invite a new member to the tenant
 * Requires OWNER or ADMIN role
 */
export async function createMembership(
  request: CreateMembershipRequest
): Promise<CreateMembershipResponse> {
  return tenantPost<CreateMembershipResponse>('/api/tenant/memberships', request);
}

export interface RevokePendingInviteResponse {
  deleted: string;
}

export interface ResendPendingInviteResponse {
  invite: PendingInvite;
  emailDelivery: InviteEmailDeliveryOutcome;
}

export interface EditPendingInviteRequest {
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface EditPendingInviteResponse {
  invite: PendingInvite;
}

/**
 * Revoke/cancel a still-pending tenant invite.
 * Requires OWNER or ADMIN role.
 */
export async function revokePendingInvite(id: string): Promise<RevokePendingInviteResponse> {
  return tenantDelete<RevokePendingInviteResponse>(`/api/tenant/memberships/invites/${id}`);
}

/**
 * Resend a still-pending tenant invite and extend its expiry window.
 * Requires OWNER or ADMIN role.
 */
export async function resendPendingInvite(id: string): Promise<ResendPendingInviteResponse> {
  return tenantPost<ResendPendingInviteResponse>(`/api/tenant/memberships/invites/${id}/resend`);
}

/**
 * Edit the role of a still-pending tenant invite.
 * Requires OWNER or ADMIN role.
 */
export async function editPendingInvite(
  id: string,
  request: EditPendingInviteRequest
): Promise<EditPendingInviteResponse> {
  return tenantPatch<EditPendingInviteResponse>(`/api/tenant/memberships/invites/${id}`, request);
}

// ==================== MEMBERSHIP ROLE UPDATE ====================

export interface UpdateMembershipRoleResponse {
  membership: {
    id: string;
    userId: string;
    tenantId: string;
    role: string;
    updatedAt: string;
  };
}

/**
 * Update the role of an existing tenant membership (TECS-FBW-012)
 * Only OWNER may call this endpoint. VIEWER is not a valid target role.
 * Do not pass tenantId — derived from auth context server-side.
 */
export async function updateMembershipRole(
  id: string,
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
): Promise<UpdateMembershipRoleResponse> {
  return tenantPatch<UpdateMembershipRoleResponse>(`/api/tenant/memberships/${id}`, { role });
}

// ==================== BRANDING ====================

export interface UpdateBrandingRequest {
  logoUrl?: string | null;
  themeJson?: {
    primaryColor?: string;
    secondaryColor?: string;
  } | null;
}

export interface UpdateBrandingResponse {
  branding: {
    id: string;
    tenantId: string;
    logoUrl: string | null;
    themeJson: any;
    createdAt: string;
    updatedAt: string;
  };
}

/**
 * Update tenant branding settings
 * Requires OWNER or ADMIN role
 */
export async function updateBranding(
  request: UpdateBrandingRequest
): Promise<UpdateBrandingResponse> {
  return tenantPut<UpdateBrandingResponse>('/api/tenant/branding', request);
}
