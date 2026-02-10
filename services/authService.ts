/**
 * TexQtic Authentication Service
 * 
 * Handles login, logout, and user session management
 */

import { post, get, setToken, clearAuth, getAuthRealm } from './apiClient';
import type { AuthRealm } from './apiClient';

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
 * Login to tenant or admin realm
 */
export async function login(
  credentials: LoginCredentials,
  realm: AuthRealm
): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/api/auth/login', {
    email: credentials.email,
    password: credentials.password,
    tenantId: realm === 'TENANT' ? credentials.tenantId : undefined,
  });

  // Store token
  setToken(response.token, realm);

  return response;
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
