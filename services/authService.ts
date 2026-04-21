/**
 * TexQtic Authentication Service
 *
 * Handles login, logout, and user session management
 */

import { APIError, post, get, setToken, clearAuth, getAuthRealm, getToken } from './apiClient';
import type { AuthRealm } from './apiClient';

// Flip to true locally to inspect login payloads (never commit as true)
const AUTH_DEBUG = false;

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
  /** Canonical org_type from organizations table (Doctrine v1.4). null when org not yet provisioned. */
  tenantType?: string | null;
  /** Compatibility category alias retained while canonical flat carrier normalizes downstream reads. */
  tenant_category?: string | null;
  /** Compatibility white-label alias retained while canonical flat carrier normalizes downstream reads. */
  is_white_label?: boolean;
  /** Canonical base family read-model carrier. */
  base_family?: 'B2B' | 'B2C' | 'INTERNAL' | null;
  /** Canonical aggregator capability read-model carrier. */
  aggregator_capability?: boolean;
  /** Canonical white-label capability read-model carrier. */
  white_label_capability?: boolean;
  /** Canonical commercial plan read-model carrier. */
  commercial_plan?: import('../types').CommercialPlan | null;
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
    /** Compatibility category alias retained while canonical flat carrier normalizes downstream reads. */
    tenant_category?: string | null;
    /** Compatibility white-label alias retained while canonical flat carrier normalizes downstream reads. */
    is_white_label?: boolean;
    /** Canonical base family read-model carrier. */
    base_family?: 'B2B' | 'B2C' | 'INTERNAL' | null;
    /** Canonical aggregator capability read-model carrier. */
    aggregator_capability?: boolean;
    /** Canonical white-label capability read-model carrier. */
    white_label_capability?: boolean;
    /** Canonical commercial plan read-model carrier. */
    commercial_plan?: import('../types').CommercialPlan | null;
    status:
      | 'ACTIVE'
      | 'SUSPENDED'
      | 'CLOSED'
      | 'PENDING_VERIFICATION'
      | 'VERIFICATION_REJECTED'
      | 'VERIFICATION_NEEDS_MORE_INFO'
      | 'VERIFICATION_APPROVED';
    plan: string;
  };
  role?: string;
}

export interface CurrentUserRequestOptions {
  retry?: boolean;
  dedupe?: boolean;
}

let currentUserInFlight:
  | {
      token: string | null;
      request: Promise<CurrentUserResponse>;
    }
  | null = null;

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
  // Backend unified endpoint: POST /api/auth/login with x-realm-hint header.
  // Admin realm retains its dedicated endpoint (/api/auth/admin/login) which is
  // already working. Only tenant login was wired to the wrong route.
  const endpoint = isAdmin ? '/api/auth/admin/login' : '/api/auth/login';

  // CRITICAL: clear any stale token BEFORE calling post().
  // apiRequest() reads getToken() and attaches it as Authorization header on every
  // request — including login itself. If a stale/expired token exists, the server
  // rejects it with 401, hadToken=true triggers a page redirect, and the user sees
  // "spinner → back to login" with no error message shown.
  clearAuth();

  const body = isAdmin
    ? { email: credentials.email, password: credentials.password }
    : { email: credentials.email, password: credentials.password, tenantId: credentials.tenantId };

  // Tenant realm requires x-realm-hint: tenant so the unified /api/auth/login
  // endpoint knows which credential flow to execute.
  const realmHeader: Record<string, string> | undefined = isAdmin
    ? undefined
    : { 'x-realm-hint': 'tenant' };

  if (AUTH_DEBUG) {
    console.log('[auth] login attempt', {
      endpoint,
      realmHeader,
      tenantIdPresent: !isAdmin && !!credentials.tenantId,
      tenantIdLength: !isAdmin ? (credentials.tenantId?.length ?? 0) : 'N/A',
    });
  }

  // post<any> so we can inspect the shape before typing it
  const raw = await post<any>(endpoint, body, realmHeader);

  // Normalize: handle both unwrapped { token, ... } and wrapped { data: { token, ... } }
  const payload: LoginResponse = raw?.data?.token ? raw.data : raw;

  // Store token — must run before returning so token is available on next request
  setToken(payload.token, realm);

  return payload;
}

// ─── Tenant Resolver (TECS-FBW-AUTH-001) ─────────────────────────────────────

/**
 * Resolved tenant identity returned by the public resolver endpoint.
 * Used by AuthFlows.tsx to obtain tenantId before login submission.
 */
export interface ResolvedTenant {
  tenantId: string;
  slug: string;
  name: string;
}

export interface PublicEntryResolutionDescriptor {
  publicEntryKind: 'PLATFORM' | 'TENANT_SUBDOMAIN' | 'TENANT_CUSTOM_DOMAIN';
  normalizedHost: string | null;
  resolutionSourceType:
    | 'HOST_DOMAIN'
    | 'SLUG_PATH'
    | 'EMAIL_MEMBERSHIP_DISCOVERY'
    | 'DIRECT_PUBLIC_IDENTIFIER'
    | 'NEUTRAL_ENTRY';
  resolutionDisposition:
    | 'RESOLVED'
    | 'CANDIDATE_SELECTION_REQUIRED'
    | 'NEUTRAL_NO_TENANT'
    | 'UNRESOLVED_REJECTED';
  resolvedRealmClass:
    | 'NEUTRAL_PUBLIC_ENTRY'
    | 'B2B_PUBLIC_DISCOVERY_ENTRY'
    | 'B2C_PUBLIC_BROWSE_ENTRY'
    | 'TENANT_AUTHENTICATED_ENTRY_ONLY'
    | 'AGGREGATOR_AUTHENTICATED_ENTRY_ONLY';
  resolvedTenantContext: ResolvedTenant | null;
  brandSurfaceFramingContext: {
    tenantSlug: string;
    tenantName: string;
  } | null;
  allowedTargetSurfaceClass:
    | 'NEUTRAL_PUBLIC_ENTRY_SURFACE'
    | 'TENANT_BRANDED_PUBLIC_SURFACE'
    | 'AUTHENTICATED_TENANT_ENTRY_SURFACE'
    | 'QUALIFIED_AUTHENTICATED_WORKSPACE_ENTRY_SURFACE';
  requiredTransitionClass:
    | 'NONE_STAY_IN_PUBLIC_ENTRY'
    | 'ENTER_TENANT_SPECIFIC_PUBLIC_SURFACE'
    | 'LAUNCH_AUTHENTICATED_TENANT_ENTRY'
    | 'LAUNCH_QUALIFIED_AUTHENTICATED_WORKSPACE';
  authenticationRequired: boolean;
  postAuthEligibilityCheckRequired: boolean;
  downstreamHandoffTargetClass:
    | 'NONE'
    | 'B2B_AUTHENTICATED_CONTINUITY'
    | 'B2C_AUTHENTICATED_CONTINUITY'
    | 'AGGREGATOR_AUTHENTICATED_WORKSPACE'
    | 'OWNER_READY_ACTIVATION_CHECK';
  candidateTenantContexts?: ResolvedTenant[];
}

export async function resolvePublicEntryDescriptor(input: {
  slug?: string;
  email?: string;
}): Promise<PublicEntryResolutionDescriptor> {
  const params = new URLSearchParams();

  if (input.slug) {
    params.set('slug', input.slug);
  }

  if (input.email) {
    params.set('email', input.email);
  }

  const query = params.toString();
  const endpoint = query ? `/api/public/entry/resolve?${query}` : '/api/public/entry/resolve';

  return get<PublicEntryResolutionDescriptor>(endpoint);
}

/**
 * Resolve a tenant slug to canonical identity required for tenant login.
 * TECS-FBW-AUTH-001 (2026-03-13)
 * Route: GET /api/public/tenants/resolve?slug=<slug>
 * Public endpoint — no auth required.
 * Throws on unknown slug or validation failure (caller surfaces inline error).
 */
export async function resolveTenantBySlug(slug: string): Promise<ResolvedTenant> {
  const descriptor = await resolvePublicEntryDescriptor({ slug });

  if (descriptor.resolutionDisposition !== 'RESOLVED' || !descriptor.resolvedTenantContext) {
    throw new APIError(
      404,
      `No active tenant found for slug '${slug}'. Check the slug and try again.`,
      'TENANT_NOT_FOUND'
    );
  }

  return descriptor.resolvedTenantContext;
}

/**
 * Resolve all active tenant memberships for a given email address.
 * PW5-AUTH-ORG-IDENTIFIER-LESS-LOGIN (2026-03-14)
 * Route: GET /api/public/tenants/by-email?email=<email>
 * Public endpoint — no auth required.
 * Returns [] when no memberships exist (caller treats as "no account found").
 * Returns the same ResolvedTenant shape as resolveTenantBySlug for field consistency.
 */
export async function resolveTenantsByEmail(email: string): Promise<ResolvedTenant[]> {
  const descriptor = await resolvePublicEntryDescriptor({ email });

  if (descriptor.resolutionDisposition === 'RESOLVED' && descriptor.resolvedTenantContext) {
    return [descriptor.resolvedTenantContext];
  }

  return descriptor.candidateTenantContexts ?? [];
}

// ─── Session management ───────────────────────────────────────────────────────

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
export async function getCurrentUser(
  options: CurrentUserRequestOptions = {}
): Promise<CurrentUserResponse> {
  const { retry = true, dedupe = false } = options;
  const token = getToken();

  if (dedupe && currentUserInFlight?.token === token) {
    return currentUserInFlight.request;
  }

  const request = get<CurrentUserResponse>('/api/me', undefined, { retry });

  if (!dedupe) {
    return request;
  }

  const trackedRequest = request.finally(() => {
    if (currentUserInFlight?.request === trackedRequest) {
      currentUserInFlight = null;
    }
  });

  currentUserInFlight = {
    token,
    request: trackedRequest,
  };

  return trackedRequest;
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
