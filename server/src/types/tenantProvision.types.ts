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
  /** Display name for the new organization */
  orgName: string;

  /** Email address for the primary admin user (created if not exists) */
  primaryAdminEmail: string;

  /**
   * Password for the primary admin user.
   * Accepted as plaintext and hashed with bcrypt inside the service.
   * NEVER logged, NEVER echoed in response.
   */
  primaryAdminPassword: string;

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
}

/**
 * Result returned by the provisioning service and route.
 *
 * Returns org_id (not tenant_id) as the canonical tenant boundary identifier.
 */
export interface TenantProvisionResult {
  /** Canonical org identifier (app.org_id) */
  orgId: string;

  /** URL-safe slug generated from orgName */
  slug: string;

  /** UUID of the created (or found) primary admin user */
  userId: string;

  /** UUID of the created OWNER membership record */
  membershipId: string;
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
