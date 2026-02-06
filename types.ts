
export enum TenantType {
  AGGREGATOR = 'AGGREGATOR',
  B2B = 'B2B',
  B2C = 'B2C',
  WHITE_LABEL = 'WHITE_LABEL'
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
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
  status: TenantStatus;
  plan: 'TRIAL' | 'PAID' | 'ENTERPRISE';
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
}
