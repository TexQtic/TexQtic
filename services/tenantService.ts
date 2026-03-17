/**
 * TexQtic Tenant Service
 *
 * Tenant-plane operations including:
 * - Activation (user-assisted)
 * - Membership management
 * - Branding configuration
 */

import { post } from './apiClient';
import { tenantGet, tenantPost, tenantPut, tenantPatch } from './tenantApiClient';

// ==================== ACTIVATION ====================

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
}

export interface ActivateTenantResponse {
  user: {
    id: string;
    email: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  membership: {
    role: string;
  };
}

/**
 * Activate a pre-provisioned tenant with invite token
 * Users cannot create tenants - they can only activate existing ones
 */
export async function activateTenant(
  request: ActivateTenantRequest
): Promise<ActivateTenantResponse> {
  return post<ActivateTenantResponse>('/api/tenant/activate', request);
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

export interface MembershipsResponse {
  memberships: Membership[];
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
