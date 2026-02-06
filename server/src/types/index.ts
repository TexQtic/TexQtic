// Request types with tenant context
export interface TenantRequest {
  tenantId: string;
  userId: string;
  role: string;
}

export interface AdminRequest {
  adminId: string;
  role: 'SUPER_ADMIN' | 'SUPPORT' | 'ANALYST';
}

export interface ImpersonationContext {
  adminId: string;
  originalTenantId: string;
  impersonationSessionId: string;
}

// Audit log types
export type AuditRealm = 'TENANT' | 'ADMIN';

export interface AuditLogEntry {
  realm: AuditRealm;
  tenantId?: string;
  actorId: string;
  action: string;
  entity: string;
  entityId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Feature flag types
export interface FeatureFlagCheck {
  tenantId: string;
  flagKey: string;
}

// API Response types
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Tenant types
export type TenantType = 'B2B' | 'B2C' | 'INTERNAL';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type TenantPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

// Membership types
export type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// Admin roles
export type AdminRole = 'SUPER_ADMIN' | 'SUPPORT' | 'ANALYST';
