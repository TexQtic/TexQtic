/**
 * Wave 0-B: Tenant-realm API client wrapper
 *
 * Enforces TENANT realm before making requests.
 * Throws REALM_MISMATCH error if current realm is not TENANT.
 */

import { get, post, put, patch, del, getAuthRealm } from './apiClient';

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
 * GET request with tenant realm guard
 */
export function tenantGet<T>(endpoint: string): Promise<T> {
  requireTenantRealm();
  return get<T>(endpoint);
}

/**
 * POST request with tenant realm guard
 */
export function tenantPost<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return post<T>(endpoint, data);
}

/**
 * PUT request with tenant realm guard
 */
export function tenantPut<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return put<T>(endpoint, data);
}

/**
 * PATCH request with tenant realm guard
 */
export function tenantPatch<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return patch<T>(endpoint, data);
}

/**
 * DELETE request with tenant realm guard
 */
export function tenantDelete<T>(endpoint: string): Promise<T> {
  requireTenantRealm();
  return del<T>(endpoint);
}
