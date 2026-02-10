/**
 * TexQtic Tenant Service
 *
 * Tenant-plane operations including:
 * - Activation (user-assisted)
 * - Membership management
 * - Branding configuration
 */

import { post, put } from './apiClient';

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
  return post<CreateMembershipResponse>('/api/tenant/memberships', request);
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
  return put<UpdateBrandingResponse>('/api/tenant/branding', request);
}
