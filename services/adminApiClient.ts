/**
 * Wave 0-B: Admin/control-plane API client wrapper
 *
 * Enforces CONTROL_PLANE realm before making requests.
 * Throws REALM_MISMATCH error if current realm is not CONTROL_PLANE.
 */

import { get, post, put, patch, del, getAuthRealm } from './apiClient';

/**
 * Wave 0-B-FIX-V3: Realm hint header for admin requests
 * Server uses this to return 403 WRONG_REALM before JWT verification
 */
const ADMIN_REALM_HEADER = { 'X-Texqtic-Realm': 'control' };

/**
 * Require CONTROL_PLANE realm before making request
 * Prevents admin endpoints from being called in tenant realm
 */
function requireAdminRealm(): void {
  const realm = getAuthRealm();
  if (realm !== 'CONTROL_PLANE') {
    throw new Error(
      `REALM_MISMATCH: Admin endpoint requires CONTROL_PLANE realm, got ${realm || 'NONE'}`
    );
  }
}

/**
 * GET request with admin realm guard + hint header
 */
export function adminGet<T>(endpoint: string): Promise<T> {
  requireAdminRealm();
  return get<T>(endpoint, ADMIN_REALM_HEADER);
}

/**
 * POST request with admin realm guard + hint header
 */
export function adminPost<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return post<T>(endpoint, data, ADMIN_REALM_HEADER);
}

/**
 * PUT request with admin realm guard + hint header
 */
export function adminPut<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return put<T>(endpoint, data, ADMIN_REALM_HEADER);
}

/**
 * PATCH request with admin realm guard + hint header + hint header
 */
export function adminPatch<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return patch<T>(endpoint, data, ADMIN_REALM_HEADER);
}

/**
 * DELETE request with admin realm guard + hint header
 */
export function adminDelete<T>(endpoint: string): Promise<T> {
  requireAdminRealm();
  return del<T>(endpoint, ADMIN_REALM_HEADER);
}
