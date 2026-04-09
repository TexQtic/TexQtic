
export enum TenantType {
  AGGREGATOR = 'AGGREGATOR',
  B2B = 'B2B',
  B2C = 'B2C',
  INTERNAL = 'INTERNAL',
  // @deprecated — WHITE_LABEL is a capability flag replaced by is_white_label boolean. Will be removed post B2-REM-5.
  WHITE_LABEL = 'WHITE_LABEL'
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
  TRIAL = 'TRIAL',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export enum UserRole {
  // Platform Staff (Control Plane)
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPS = 'OPS',
  FINANCE = 'FINANCE',
  TRUST_SAFETY = 'TRUST_SAFETY',
  SUPPORT = 'SUPPORT',
  // Tenant Side
  TENANT_OWNER = 'TENANT_OWNER',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SELLER = 'SELLER',
  BUYER = 'BUYER',
  STAFF = 'STAFF'
}

export type CommercialPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export const normalizeCommercialPlan = (plan: string | null | undefined): CommercialPlan => {
  const normalizedPlan = plan?.trim().toUpperCase();

  if (
    normalizedPlan === 'FREE' ||
    normalizedPlan === 'STARTER' ||
    normalizedPlan === 'PROFESSIONAL' ||
    normalizedPlan === 'ENTERPRISE'
  ) {
    return normalizedPlan;
  }

  if (normalizedPlan === 'TRIAL' || normalizedPlan === 'BASIC') {
    return 'FREE';
  }

  if (normalizedPlan === 'PAID') {
    return 'PROFESSIONAL';
  }

  return 'FREE';
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isPlatformStaff: boolean;
  mfaEnabled: boolean;
}

export interface TenantConfig {
  id: string;
  slug: string;
  name: string;
  type: TenantType;
  /** B2-REM-3: canonical organizational identity (B2-REM-2). Authoritative routing signal. */
  tenant_category?: string | null;
  /** B2-REM-3: white-label capability flag (B2-REM-2). Authoritative WL routing signal. */
  is_white_label?: boolean;
  status: TenantStatus;
  /** Org-backed onboarding lifecycle status used for onboarding completion. */
  onboarding_status?: string | null;
  plan: CommercialPlan;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logo: string;
  };
  features: string[];
  aiBudget: number; 
  aiUsage: number;
  billingStatus: 'CURRENT' | 'PAST_DUE' | 'DELINQUENT';
  riskScore: number; // 0-100
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  tenantId?: string;
  details: string;
}

export interface ComplianceRequest {
  id: string;
  tenantName: string;
  type: 'ISO9001' | 'BUSINESS_LICENSE' | 'TAX_ID';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

export interface PayoutRequest {
  id: string;
  tenantName: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
}

export interface ImpersonationState {
  isAdmin: boolean;
  targetTenantId: string | null;
  startTime: string | null;
  /** G-W3-ROUTING-001: API-backed impersonation session fields */
  impersonationId: string | null;
  token: string | null;     // tenant-shaped JWT — stored separately from admin token
  expiresAt: string | null; // ISO 8601 expiry from server
}
