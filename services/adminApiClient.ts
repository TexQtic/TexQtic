/**
 * Wave 0-B: Admin/control-plane API client wrapper
 *
 * Enforces CONTROL_PLANE realm before making requests.
 * Throws REALM_MISMATCH error if current realm is not CONTROL_PLANE.
 */

import { get, post, put, patch, del, getAuthRealm } from './apiClient';

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
 * GET request with admin realm guard
 */
export function adminGet<T>(endpoint: string): Promise<T> {
  requireAdminRealm();
  return get<T>(endpoint);
}

/**
 * POST request with admin realm guard
 */
export function adminPost<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return post<T>(endpoint, data);
}

/**
 * PUT request with admin realm guard
 */
export function adminPut<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return put<T>(endpoint, data);
}

/**
 * PATCH request with admin realm guard
 */
export function adminPatch<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return patch<T>(endpoint, data);
}

/**
 * DELETE request with admin realm guard
 */
export function adminDelete<T>(endpoint: string): Promise<T> {
  requireAdminRealm();
  return del<T>(endpoint);
}
