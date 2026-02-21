/**
 * TexQtic Authentication Service
 *
 * Handles login, logout, and user session management
 */

import { post, get, setToken, clearAuth, getAuthRealm } from './apiClient';
import type { AuthRealm } from './apiClient';

// Flip to true locally to inspect login payloads (never commit as true)
const DEBUG_AUTH = false;

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role?: string;
    tenantId?: string;
  };
}

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
  };
  tenant?: {
    id: string;
    slug: string;
    name: string;
    type: string;
    status: string;
    plan: string;
  };
  role?: string;
}

/**
 * Login to tenant or admin realm.
 * Routes to the explicit realm endpoint to avoid auto-detect ambiguity.
 *
 * Normalizes the response defensively: apiRequest unwraps { success, data }
 * envelopes, but if the raw envelope is ever returned (e.g. data.success absent),
 * response.token would be undefined. We check both shapes so setToken always
 * receives the actual JWT string.
 */
export async function login(
  credentials: LoginCredentials,
  realm: AuthRealm
): Promise<LoginResponse> {
  const isAdmin = realm === 'CONTROL_PLANE';
  const endpoint = isAdmin ? '/api/auth/admin/login' : '/api/auth/tenant/login';

  // CRITICAL: clear any stale token BEFORE calling post().
  // apiRequest() reads getToken() and attaches it as Authorization header on every
  // request — including login itself. If a stale/expired token exists, the server
  // rejects it with 401, hadToken=true triggers a page redirect, and the user sees
  // "spinner → back to login" with no error message shown.
  clearAuth();

  const body = isAdmin
    ? { email: credentials.email, password: credentials.password }
    : { email: credentials.email, password: credentials.password, tenantId: credentials.tenantId };

  if (DEBUG_AUTH) {
    console.log('[auth] login attempt', {
      endpoint,
      hasTenantId: !isAdmin && !!credentials.tenantId,
      tenantId: !isAdmin ? credentials.tenantId : 'N/A',
    });
  }

  // post<any> so we can inspect the shape before typing it
  const raw = await post<any>(endpoint, body);

  // Normalize: handle both unwrapped { token, ... } and wrapped { data: { token, ... } }
  const payload: LoginResponse = raw?.data?.token ? raw.data : raw;

  // Store token — must run before returning so token is available on next request
  setToken(payload.token, realm);

  return payload;
}

/**
 * Logout (clear local session)
 */
export function logout(): void {
  clearAuth();
  window.location.href = '/';
}

/**
 * Get current authenticated user details
 */
export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return get<CurrentUserResponse>('/api/me');
}

/**
 * Check if user is authenticated for specific realm
 */
export function isAuthenticatedFor(realm: AuthRealm): boolean {
  return getAuthRealm() === realm;
}

/**
 * Request password reset token
 * Always returns success to prevent user enumeration
 */
export async function forgotPassword(email: string): Promise<void> {
  await post<{ message: string }>('/api/auth/forgot-password', { email });
}

/**
 * Reset password using token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await post<{ message: string }>('/api/auth/reset-password', {
    token,
    newPassword,
  });
}

/**
 * Verify email using JWT token
 */
export async function verifyEmail(token: string): Promise<void> {
  await post<{ message: string }>('/api/auth/verify-email', { token });
}

/**
 * Resend email verification link
 * Always returns success to prevent user enumeration
 */
export async function resendVerification(email: string): Promise<void> {
  await post<{ message: string }>('/api/auth/resend-verification', { email });
}
