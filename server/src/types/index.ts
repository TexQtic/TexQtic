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
export interface Warning {
  code: string;
  message: string;
  severity?: 'INFO' | 'WARN' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  warnings?: Warning[];
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

// ==================== BUYER CATALOG PDP TYPES (TECS-B2B-BUYER-CATALOG-PDP-001 P-1) ====================

export interface CatalogMedia {
  mediaId: string;
  mediaType: 'image' | 'swatch' | 'sample';
  altText: string | null;
  /** signedUrl: imageUrl as-is in P-1 MVP; signing infrastructure deferred to media-table phase */
  signedUrl: string;
  displayOrder: number;
}

export interface CatalogSpecification {
  productCategory: string | null;
  fabricType: string | null;
  gsm: number | null;
  material: string | null;
  composition: string | null;
  color: string | null;
  widthCm: number | null;
  construction: string | null;
  /** buyer-safe label list from catalog_items.certifications JSONB (Array<{standard:string}>) */
  certifications: string[] | null;
}

export interface CertificateSummaryItem {
  certificateType: string;
  issuerName: string | null;
  expiryDate: string | null;  // ISO 8601 or null
  status: 'APPROVED' | 'EXPIRING_SOON';
}

export interface ComplianceSummary {
  hasCertifications: boolean;
  certificates: CertificateSummaryItem[];
  humanReviewNotice: string;
}

export interface AvailabilitySummary {
  moqValue: number | null;
  moqUnit: string | null;
  leadTimeDays: number | null;
  capacityIndicator: 'available' | 'limited' | 'on_request' | null;
}

export interface RfqEntryDescriptor {
  triggerLabel: string;
  itemId: string;
  supplierId: string;
  itemTitle: string;
  category: string | null;
  stage: string | null;
}

export interface PricePlaceholder {
  label: 'Price available on request';
  subLabel: 'RFQ required for pricing' | null;
  note: string | null;
}

export interface PriceDisclosureMetadata {
  price_visibility_state:
    | 'PUBLIC_VISIBLE'
    | 'AUTH_VISIBLE'
    | 'ELIGIBLE_VISIBLE'
    | 'HIDDEN'
    | 'RFQ_ONLY'
    | 'PRICE_ON_REQUEST'
    | 'LOGIN_REQUIRED'
    | 'ELIGIBILITY_REQUIRED';
  price_display_policy: 'SHOW_VALUE' | 'SUPPRESS_VALUE';
  price_value_visible: boolean;
  price_label:
    | 'Price available on request'
    | 'Contact supplier'
    | 'Login to view price'
    | 'Eligibility required'
    | 'Request quote';
  cta_type: 'VIEW_PRICE' | 'REQUEST_QUOTE' | 'CONTACT_SUPPLIER' | 'LOGIN_TO_VIEW' | 'CHECK_ELIGIBILITY';
  eligibility_reason: string | null;
  supplier_policy_source: 'SUPPLIER_DEFAULT' | 'PRODUCT_OVERRIDE' | 'SYSTEM_SAFE_DEFAULT';
  rfq_required: boolean;
}

export interface BuyerCatalogPdpView {
  itemId: string;
  supplierId: string;
  supplierDisplayName: string;
  title: string;
  description: string | null;
  category: string | null;
  stage: string | null;
  media: CatalogMedia[];
  specifications: CatalogSpecification;
  complianceSummary: ComplianceSummary;
  availabilitySummary: AvailabilitySummary;
  rfqEntry: RfqEntryDescriptor;
  pricePlaceholder: PricePlaceholder;
  priceDisclosure: PriceDisclosureMetadata;
}
