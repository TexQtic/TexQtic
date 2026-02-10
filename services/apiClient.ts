/**
 * TexQtic API Client
 *
 * Centralized HTTP client with:
 * - JWT authentication
 * - Request/response interceptors
 * - Global error handling
 * - Token management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Token storage keys
const TENANT_TOKEN_KEY = 'texqtic_tenant_token';
const ADMIN_TOKEN_KEY = 'texqtic_admin_token';
const AUTH_REALM_KEY = 'texqtic_auth_realm';

export type AuthRealm = 'TENANT' | 'CONTROL_PLANE';

/**
 * Get stored JWT token based on current realm
 */
export function getToken(): string | null {
  const realm = localStorage.getItem(AUTH_REALM_KEY) as AuthRealm | null;
  if (!realm) return null;

  return realm === 'CONTROL_PLANE'
    ? localStorage.getItem(ADMIN_TOKEN_KEY)
    : localStorage.getItem(TENANT_TOKEN_KEY);
}

/**
 * Store JWT token for specific realm
 */
export function setToken(token: string, realm: AuthRealm): void {
  localStorage.setItem(AUTH_REALM_KEY, realm);

  if (realm === 'CONTROL_PLANE') {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.setItem(TENANT_TOKEN_KEY, token);
  }
}

/**
 * Clear all authentication data
 */
export function clearAuth(): void {
  localStorage.removeItem(TENANT_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(AUTH_REALM_KEY);
}

/**
 * Get current auth realm
 */
export function getAuthRealm(): AuthRealm | null {
  return localStorage.getItem(AUTH_REALM_KEY) as AuthRealm | null;
}

/**
 * API Error class with structured error information
 */
export class APIError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Generic API request function
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Merge with provided headers
  if (options.headers) {
    const providedHeaders = options.headers as Record<string, string>;
    Object.assign(headers, providedHeaders);
  }

  // Attach JWT if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Make request
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: 'Unknown error' };
      }

      // 401: Unauthorized
      if (response.status === 401) {
        clearAuth();
        window.location.href = '/'; // Redirect to login
        throw new APIError(
          401,
          'UNAUTHORIZED',
          errorData.error?.message || 'Authentication required'
        );
      }

      // 403: Forbidden
      if (response.status === 403) {
        throw new APIError(403, 'FORBIDDEN', errorData.error?.message || 'Access denied');
      }

      // 429: Rate limit / Budget exceeded (AI-specific)
      if (response.status === 429) {
        throw new APIError(
          429,
          errorData.error?.code || 'RATE_LIMIT_EXCEEDED',
          errorData.error?.message || 'Rate limit exceeded',
          errorData.error?.details
        );
      }

      // Other errors
      throw new APIError(
        response.status,
        errorData.error?.code || 'API_ERROR',
        errorData.error?.message || errorData.message || 'API request failed'
      );
    }

    // Parse JSON response
    const data = await response.json();

    // Handle backend response format: { success: true, data: {...} }
    if (data.success !== undefined) {
      return data.data as T;
    }

    return data as T;
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Network errors or other fetch failures
    throw new APIError(0, 'NETWORK_ERROR', 'Network request failed');
  }
}

/**
 * GET request
 */
export async function get<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request
 */
export async function post<T>(endpoint: string, body?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request
 */
export async function put<T>(endpoint: string, body?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request
 */
export async function patch<T>(endpoint: string, body?: any): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request
 */
export async function del<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}
