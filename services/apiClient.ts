/**
 * TexQtic API Client
 *
 * Centralized HTTP client with:
 * - JWT authentication
 * - Request/response interceptors
 * - Global error handling
 * - Token management
 */

// API Base URL Resolution:
// 1. Default to same-origin (empty string) for Vercel deployment
// 2. Allow VITE_API_BASE_URL override for alternative API endpoints
// 3. Production check: prevent localhost in production builds
const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // If no env var, use same-origin (empty string)
  // This makes calls like: fetch("/api/auth/login")
  if (!envUrl) {
    return '';
  }

  // If env var is set, validate it
  const baseUrl = envUrl;

  // Runtime assertion: prevent localhost in production
  if (import.meta.env.PROD && baseUrl.includes('localhost')) {
    const error =
      '🚨 FATAL: Production build is calling localhost API. Set VITE_API_BASE_URL to production URL or remove it for same-origin.';
    console.error(error);
    throw new Error(error);
  }

  return baseUrl;
})();

// Token storage keys
const TENANT_TOKEN_KEY = 'texqtic_tenant_token';
const ADMIN_TOKEN_KEY = 'texqtic_admin_token';
const AUTH_REALM_KEY = 'texqtic_auth_realm';

// Wave 0-A: AbortController for in-flight request cancellation
let currentAbortController = new AbortController();

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
 * Wave 0-A: Reset authentication on realm change
 * Aborts in-flight requests, clears all auth tokens, and navigates to root
 * Prevents flicker loops and 401 storms during realm transitions
 */
export function resetOnRealmChange(): void {
  // 1. Abort all in-flight requests
  currentAbortController.abort();
  currentAbortController = new AbortController();

  // 2. Clear all auth tokens
  localStorage.removeItem(TENANT_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(AUTH_REALM_KEY);

  // 3. Navigate to root (single navigation, no loops)
  window.location.href = '/';
}

/**
 * API Error interface - standardized error shape
 */
export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
}

/**
 * API Error class with structured error information
 */
export class APIError extends Error implements ApiError {
  public status: number;
  public code?: string;
  public details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Retry configuration for GET requests
 */
interface RetryConfig {
  maxAttempts: number;
  delays: number[]; // Backoff delays in ms
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3, // Initial + 2 retries
  delays: [300, 900], // 300ms, 900ms backoff
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for GET requests only
 * Implements exponential backoff with limited attempts
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | APIError | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error | APIError;

      // Don't retry on client errors (4xx) except 429
      if (error instanceof APIError) {
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts - 1) {
        break;
      }

      // Wait before retrying
      const delay = config.delays[attempt] || config.delays[config.delays.length - 1];
      await sleep(delay);
    }
  }

  throw lastError;
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
      signal: currentAbortController.signal,
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
        const hadToken = !!token; // Only redirect if session existed

        clearAuth();

        if (hadToken) {
          window.location.href = '/'; // Session expired -> redirect to login
        }

        throw new APIError(401, errorData.error?.message || 'Unauthorized', 'UNAUTHORIZED');
      }

      // 403: Forbidden
      if (response.status === 403) {
        throw new APIError(
          403,
          errorData.error?.message || "You don't have access to this action.",
          'FORBIDDEN'
        );
      }

      // 404: Not Found
      if (response.status === 404) {
        throw new APIError(404, errorData.error?.message || 'Not found.', 'NOT_FOUND');
      }

      // 422: Validation Error
      if (response.status === 422) {
        throw new APIError(
          422,
          errorData.error?.message || 'Invalid request. Please check your input.',
          errorData.error?.code || 'VALIDATION_ERROR',
          errorData.error?.details
        );
      }

      // 429: Rate limit / Budget exceeded (AI-specific)
      if (response.status === 429) {
        const message =
          errorData.error?.code === 'AI_BUDGET_EXCEEDED'
            ? 'AI budget limit reached for this month.'
            : errorData.error?.message || 'Rate limit exceeded. Please try again later.';

        throw new APIError(
          429,
          message,
          errorData.error?.code || 'RATE_LIMIT_EXCEEDED',
          errorData.error?.details
        );
      }

      // 5xx: Server errors
      if (response.status >= 500) {
        throw new APIError(
          response.status,
          'Service temporarily unavailable. Try again.',
          errorData.error?.code || 'SERVER_ERROR'
        );
      }

      // Other errors
      throw new APIError(
        response.status,
        errorData.error?.message || errorData.message || 'API request failed',
        errorData.error?.code || 'API_ERROR'
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
    throw new APIError(0, 'Network error. Please check your connection.', 'NETWORK_ERROR');
  }
}

/**
 * GET request with automatic retry on transient failures
 * @param headers Optional custom headers (e.g., realm hint)
 */
export async function get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  return withRetry(() => apiRequest<T>(endpoint, { method: 'GET', headers }));
}

/**
 * POST request
 * @param headers Optional custom headers (e.g., realm hint)
 */
export async function post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

/**
 * PUT request
 * @param headers Optional custom headers (e.g., realm hint)
 */
export async function put<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

/**
 * PATCH request
 * @param headers Optional custom headers (e.g., realm hint)
 */
export async function patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

/**
 * DELETE request
 * @param headers Optional custom headers (e.g., realm hint)
 */
export async function del<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE', headers });
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getToken() !== null;
}
