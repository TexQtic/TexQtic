/**
 * Wave 0-B: Tenant-realm API client wrapper
 *
 * Enforces TENANT realm before making requests.
 * Throws REALM_MISMATCH error if current realm is not TENANT.
 */

import { get, post, put, patch, del, getAuthRealm } from './apiClient';

/**
 * Wave 0-B-FIX-V3: Realm hint header for tenant requests
 * Server uses this to return 403 WRONG_REALM before JWT verification
 */
const TENANT_REALM_HEADER = { 'X-Texqtic-Realm': 'tenant' };

/**
 * Require TENANT realm before making request
 * Prevents tenant endpoints from being called in admin realm
 */
function requireTenantRealm(): void {
  const realm = getAuthRealm();
  if (realm !== 'TENANT') {
    throw new Error(
      `REALM_MISMATCH: Tenant endpoint requires TENANT realm, got ${realm || 'NONE'}`
    );
  }
}

/**
 * GET request with tenant realm guard + hint header
 */
export function tenantGet<T>(endpoint: string): Promise<T> {
  requireTenantRealm();
  return get<T>(endpoint, TENANT_REALM_HEADER);
}

/**
 * POST request with tenant realm guard + hint header
 */
export function tenantPost<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return post<T>(endpoint, data, TENANT_REALM_HEADER);
}

/**
 * PUT request with tenant realm guard + hint header
 */
export function tenantPut<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return put<T>(endpoint, data, TENANT_REALM_HEADER);
}

/**
 * PATCH request with tenant realm guard + hint header + hint header
 */
export function tenantPatch<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return patch<T>(endpoint, data, TENANT_REALM_HEADER);
}

/**
 * DELETE request with tenant realm guard + hint header
 */
export function tenantDelete<T>(endpoint: string): Promise<T> {
  requireTenantRealm();
  return del<T>(endpoint, TENANT_REALM_HEADER);
}
