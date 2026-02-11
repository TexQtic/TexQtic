# Wave 0 — Realm Isolation + Control-Plane Poll Guard

**Doctrine Version:** v1.4  
**Wave:** W0  
**Track:** AUTH_REALM  
**Status:** APPROVED (Pre-Implementation)  
**PR(s):** TBD  
**Owner:** TBD  

---

## Executive Summary

Wave 0 addresses multi-realm JWT isolation defects causing 401 storms and UI flicker when tenant-realm users navigate to control-plane routes. The root cause is unchecked control-plane API calls firing regardless of authentication realm, resulting in continuous 401 retries and network spam.

**Impact:**
- Frontend: 401 storm on `/api/control/tenants`
- UX: Spinner hangs, flicker loops
- Security: No realm validation at client or server boundaries

**Solution:**
- Phase 0-A: Client-side realm guard (stop queries before network)
- Phase 0-B: Dual API clients + server-side realm enforcement

---

## Evidence-Backed Repo Map

| Area | Verified Paths | Key Modules/Routes | Status | Evidence |
|------|----------------|-------------------|--------|----------|
| **Frontend Env** | `services/apiClient.ts` L16 | `import.meta.env.VITE_API_BASE_URL` | ✅ Exists | Grep: 2 matches (apiClient.ts, geminiService.ts.deprecated) |
| | | No `NEXT_PUBLIC_` usage in repo code | ✅ Confirmed | All 20 matches are doctrine docs only |
| **API Client** | `services/apiClient.ts` | `API_BASE_URL` resolution, token storage (L38-39) | ✅ Exists | Read L1-40 |
| **Vercel Entry** | `api/index.ts` L166 | `export default async function handler(req, res)` | ✅ Exists | Grep + Read L166-171 |
| **Fastify JWT Realms** | `server/src/types/fastify.d.ts` L32-58 | Type declarations for 4 decorators | ✅ Exists | Read L1-60 |
| | `server/src/index.ts` L85-100 | Tenant/admin JWT registration | ✅ Exists | Read L85-140 |
| | `server/src/middleware/auth.ts` | Used in `tenantAuthMiddleware`, `adminAuthMiddleware` | ✅ Exists | Read L1-100 |
| | `api/index.ts` L94-103 | Vercel also registers both realms | ✅ Exists | Read L88-115 |
| **Prisma** | `server/prisma/schema.prisma` L5 | `datasource db` with DATABASE_URL | ✅ Exists | Read L1-30 |
| | `server/src/db/prisma.ts` L9-14 | Singleton PrismaClient export | ✅ Exists | Read L1-30 |
| | `server/package.json` L7 | `"postinstall": "prisma generate"` | ✅ Exists | Grep match |
| | `server/prisma/migrations/` | 12 migration files found | ✅ Exists | File search |
| **Route Groups** | `server/src/index.ts` L131-134 | `/api/auth`, `/api/control`, `/api` (tenant), `/api/control/marketplace` | ✅ Exists | Grep + Read |
| | `api/index.ts` L136 | Same registration in Vercel handler | ✅ Exists | Grep match |
| | Route files | `auth.ts`, `control.ts`, `tenant.ts`, `ai.ts`, `admin-cart-summaries.ts` | ✅ Exists | File search |
| **Governance** | `server/src/config/index.ts` L29 | `KILL_SWITCH_ALL` env var | ✅ Exists | Grep match |
| | `server/src/index.ts` L119-123 | Kill-switch hook blocks all except /health | ✅ Exists | Read L117-127 |
| | `server/prisma/migrations/` | `event_logs` table (migrations 20260208054130, 20260208074800) | ✅ Exists | Grep: 20+ matches |
| | `shared/contracts/event-names.md` | Event naming rules | ✅ Exists | Read L1-15 |
| **Contracts** | `shared/contracts/` | 7 files: ARCHITECTURE-GOVERNANCE, db-naming-rules, event-names, openapi x2, rls-policy, schema-budget | ✅ Exists | List dir |

---

## Root Cause Analysis

### Problem: 401 Storm + UI Flicker

**Observed Behavior:**
- Network spam: Repeated `/api/control/tenants` requests returning 401
- UI spinner hangs indefinitely
- Page flicker when switching between tenant/admin views

**Root Cause (Verified):**

File: `components/ControlPlane/TenantRegistry.tsx` L43
```tsx
useEffect(() => {
  fetchTenants();  // ⚠️ No realm gate — fires regardless of auth realm
}, []);
```

**Request Chain:**
1. `TenantRegistry.tsx` L43 → `fetchTenants()` L20
2. L26 → `getTenants()` from `services/controlPlaneService.ts` L77
3. L77 → `get('/api/control/tenants')`
4. Server middleware: `adminAuthMiddleware` rejects tenant JWT with 401
5. Frontend: No realm check before request → retry loop → 401 storm

**Affected Components (Same Pattern):**
- `AiGovernance.tsx` (getTenants)
- `AuditLogs.tsx` (getAuditLogs)
- `EventStream.tsx` (getEvents)
- `SystemHealth.tsx` (getSystemHealth)
- `FeatureFlags.tsx` (getFeatureFlags)
- `ComplianceQueue.tsx` (getComplianceRequests)
- `DisputeCases.tsx` (getDisputes)
- `FinanceOps.tsx` (getPayouts)

All 13 control-plane service functions call `/api/control/*` without realm validation.

---

## Implementation Plan

### PHASE 0-A: APPLY NOW (Hard Stop Control-Plane Queries)

#### Step 1: Add realm guard helper to controlPlaneService

**File:** `services/controlPlaneService.ts`

**Change:** Import `getAuthRealm` from apiClient, add guard before ALL control-plane requests

**Implementation:**
```typescript
import { get, post, put, getAuthRealm } from './apiClient';

function requireControlPlaneRealm() {
  const realm = getAuthRealm();
  if (realm !== 'CONTROL_PLANE') {
    throw new Error(`REALM_MISMATCH: Control-plane endpoint requires CONTROL_PLANE realm, got ${realm || 'NONE'}`);
  }
}

export async function getTenants(): Promise<TenantsResponse> {
  requireControlPlaneRealm(); // ⚠️ GUARD
  return get<TenantsResponse>('/api/control/tenants');
}

export async function getTenantById(tenantId: string): Promise<TenantDetailResponse> {
  requireControlPlaneRealm(); // ⚠️ GUARD
  return get<TenantDetailResponse>(`/api/control/tenants/${tenantId}`);
}

// Apply to all 13 functions...
```

**Affected Functions (All in controlPlaneService.ts):**
1. `getTenants()` L77
2. `getTenantById()` L84
3. `getAuditLogs()` L138
4. `getEvents()` L206
5. `getCartSummaries()` L266
6. `getCartSummaryById()` L278
7. `provisionTenant()` L313
8. `getFeatureFlags()` L343
9. `updateFeatureFlag()` L354
10. `getPayouts()` L379
11. `getComplianceRequests()` L404
12. `getDisputes()` L430
13. `getSystemHealth()` L452

**Acceptance:**
- ✅ Calling `getTenants()` when realm is TENANT → throws `REALM_MISMATCH` error (no 401 request sent)
- ✅ Control-plane components catch error and show "Requires admin login" message
- ✅ No `/api/control/*` requests leave browser unless realm === CONTROL_PLANE

**Rollback:** Remove `requireControlPlaneRealm()` function and all invocations

---

#### Step 2: Add realm switch handler to apiClient

**File:** `services/apiClient.ts`

**Change:** Add `resetOnRealmChange()` function

**Implementation:**
```typescript
// Add near token management functions
let currentAbortController = new AbortController();

export function resetOnRealmChange(): void {
  // 1. Abort all in-flight requests
  currentAbortController.abort();
  currentAbortController = new AbortController();

  // 2. Clear all auth tokens
  localStorage.removeItem(TENANT_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(AUTH_REALM_KEY);

  // 3. Navigate to root (once, no flicker)
  window.location.href = '/';
}
```

**Export:** Add to module exports

**Acceptance:**
- ✅ Function aborts pending fetches
- ✅ Clears all auth state (3 localStorage keys)
- ✅ Single navigation (no redirect loops)

**Rollback:** Remove function

---

#### Step 3: Update TenantRegistry to catch realm errors

**File:** `components/ControlPlane/TenantRegistry.tsx` L20-40

**Change:** Update `fetchTenants()` catch block

**Implementation:**
```tsx
} catch (err) {
  console.error('Failed to load tenants:', err);
  if (err instanceof Error && err.message.startsWith('REALM_MISMATCH')) {
    setError({
      status: 403,
      message: 'This view requires admin privileges. Please log in as admin.',
      code: 'REALM_MISMATCH',
    } as APIError);
  } else if (err instanceof APIError) {
    setError(err);
  } else {
    setError({
      status: 0,
      message: 'Failed to load tenants. Please try again.',
      code: 'UNKNOWN_ERROR',
    } as APIError);
  }
}
```

**Acceptance:**
- ✅ When realm is TENANT, TenantRegistry shows "Requires admin" error state
- ✅ No network request to `/api/control/tenants` is made
- ✅ Error state renders user-friendly message

**Rollback:** Restore original catch block

---

#### Step 4: Preflight verification

**Commands:**
```powershell
git diff --name-only
git status --short
```

**Acceptance:**
- ✅ Only modified:
  - `services/controlPlaneService.ts`
  - `services/apiClient.ts`
  - `components/ControlPlane/TenantRegistry.tsx`
- ✅ No other files changed

---

#### Step 5: Commit Phase 0-A

**Message:** 
```
prompt-phase0a Multi-realm safety: block control-plane queries in tenant realm

- Add requireControlPlaneRealm() guard to all 13 control-plane service functions
- Add resetOnRealmChange() to abort requests and clear auth state
- Update TenantRegistry to show realm mismatch error without network request
- Fixes: 401 storm when tenant users navigate to admin routes

Governance review: PASS
```

**Verification:**
```powershell
git status --short  # Ensure only modified files staged
git show --stat HEAD
```

**Runtime Test:**
```powershell
# 1. Start server
cd server; node --import tsx src/index.ts

# 2. In browser:
# - Login as tenant user
# - Navigate to any control-plane route
# - Open Network tab

# 3. Verify:
# - NO /api/control/* requests in Network tab
# - Error message shows "Requires admin privileges"
# - No 401 responses
# - No spinner hang
```

---

### PHASE 0-B: IMPLEMENT NEXT (Dual Clients + Server Guard)

#### Step 6: Create realm-specific API client wrappers

**Files (New):**
- `services/tenantApiClient.ts`
- `services/adminApiClient.ts`

**Implementation:**

`services/tenantApiClient.ts`:
```typescript
import { get, post, put, del, getAuthRealm } from './apiClient';

function requireTenantRealm() {
  const realm = getAuthRealm();
  if (realm !== 'TENANT') {
    throw new Error(`REALM_MISMATCH: Tenant endpoint requires TENANT realm, got ${realm || 'NONE'}`);
  }
}

export function tenantGet<T>(endpoint: string): Promise<T> {
  requireTenantRealm();
  return get<T>(endpoint);
}

export function tenantPost<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return post<T>(endpoint, data);
}

export function tenantPut<T>(endpoint: string, data?: any): Promise<T> {
  requireTenantRealm();
  return put<T>(endpoint, data);
}

export function tenantDelete<T>(endpoint: string): Promise<T> {
  requireTenantRealm();
  return del<T>(endpoint);
}
```

`services/adminApiClient.ts`:
```typescript
import { get, post, put, del, getAuthRealm } from './apiClient';

function requireAdminRealm() {
  const realm = getAuthRealm();
  if (realm !== 'CONTROL_PLANE') {
    throw new Error(`REALM_MISMATCH: Admin endpoint requires CONTROL_PLANE realm, got ${realm || 'NONE'}`);
  }
}

export function adminGet<T>(endpoint: string): Promise<T> {
  requireAdminRealm();
  return get<T>(endpoint);
}

export function adminPost<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return post<T>(endpoint, data);
}

export function adminPut<T>(endpoint: string, data?: any): Promise<T> {
  requireAdminRealm();
  return put<T>(endpoint, data);
}

export function adminDelete<T>(endpoint: string): Promise<T> {
  requireAdminRealm();
  return del<T>(endpoint);
}
```

**Acceptance:**
- ✅ Each wrapper enforces realm before making request
- ✅ Tenant service functions can migrate to `tenantGet/tenantPost`
- ✅ Admin/control services can migrate to `adminGet/adminPost`
- ✅ Type-safe with same generic interface as base client

**Rollback:** Delete both files

---

#### Step 7: Server-side endpoint→realm mapping table

**File (New):** `server/src/middleware/realmGuard.ts`

**Implementation:**
```typescript
import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendForbidden } from '../utils/response.js';

/**
 * Endpoint to realm mapping
 * Used to validate JWT realm matches route expectations
 */
const ENDPOINT_REALM_MAP: Record<string, 'tenant' | 'admin' | 'public'> = {
  '/api/auth': 'public',
  '/api/control': 'admin',
  '/api/tenant': 'tenant',
  '/api/me': 'tenant',
  '/api/cart': 'tenant',
  '/api/catalog': 'tenant',
  '/health': 'public',
};

/**
 * Match request URL to expected realm
 */
function matchRealm(url: string): 'tenant' | 'admin' | 'public' {
  for (const [prefix, realm] of Object.entries(ENDPOINT_REALM_MAP)) {
    if (url.startsWith(prefix)) {
      return realm;
    }
  }
  // Default: tenant realm for unknown /api/* routes
  if (url.startsWith('/api/')) {
    return 'tenant';
  }
  return 'public';
}

/**
 * Realm guard middleware
 * Validates JWT realm matches endpoint expectations
 * 
 * NOTE: Must run AFTER JWT verification middleware
 */
export async function realmGuardMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const expectedRealm = matchRealm(request.url);

  // Public endpoints skip realm check
  if (expectedRealm === 'public') {
    return;
  }

  // Check JWT payload realm
  const jwtPayload = request.user as any;
  
  if (expectedRealm === 'admin') {
    // Admin endpoint requires admin JWT
    if (!jwtPayload?.adminId) {
      return sendForbidden(reply, 'Admin endpoint requires admin token');
    }
  } else if (expectedRealm === 'tenant') {
    // Tenant endpoint requires tenant JWT
    if (!jwtPayload?.userId || !jwtPayload?.tenantId) {
      return sendForbidden(reply, 'Tenant endpoint requires tenant token');
    }
  }
}
```

**Registration:** Add to Fastify `onRequest` hook in `server/src/index.ts`:
```typescript
// After JWT registration, before route registration
fastify.addHook('onRequest', realmGuardMiddleware);
```

**Acceptance:**
- ✅ `/api/control/*` with tenant token → 403 "Admin endpoint requires admin token"
- ✅ `/api/tenant/*` with admin token → 403 "Tenant endpoint requires tenant token"
- ✅ Clear error messages prevent confusion
- ✅ Applied globally to all routes

**Rollback:** Remove file, remove hook registration

---

#### Step 8: Commit Phase 0-B

**Message:**
```
prompt-phase0b Multi-realm enforcement: dual clients + server guard

- Add tenantApiClient.ts wrapper with tenant realm guard
- Add adminApiClient.ts wrapper with admin realm guard
- Add realmGuardMiddleware for server-side realm validation
- Register realm guard hook in Fastify onRequest

Governance review: PASS
```

**Verification:**
```powershell
git diff --name-only
git status --short
git show --stat HEAD
```

**Runtime Test:**
```powershell
# 1. Start server
cd server; node --import tsx src/index.ts

# 2. Test admin token on tenant endpoint:
$adminToken = "<admin_jwt>"
curl -H "Authorization: Bearer $adminToken" http://localhost:3001/api/tenant/cart
# Expected: 403 "Tenant endpoint requires tenant token"

# 3. Test tenant token on admin endpoint:
$tenantToken = "<tenant_jwt>"
curl -H "Authorization: Bearer $tenantToken" http://localhost:3001/api/control/tenants
# Expected: 403 "Admin endpoint requires admin token"
```

---

## Risks & Rollback

### Risks

1. **Breaking Change:** Control-plane components will throw errors in tenant realm
   - Mitigation: Error boundary catches REALM_MISMATCH, shows friendly message
   - Risk Level: LOW (expected behavior)

2. **Request Abort Edge Case:** Mid-flight requests during realm switch
   - Mitigation: AbortController handles cleanup
   - Risk Level: LOW (standard pattern)

3. **Server-side Realm Guard False Positive:** Wrong endpoint→realm mapping
   - Mitigation: ENDPOINT_REALM_MAP is explicit and testable
   - Risk Level: MEDIUM (needs runtime verification)

### Rollback Strategy

**Phase 0-A Rollback:**
```powershell
git revert <commit-hash-phase0a>
```

**Phase 0-B Rollback:**
```powershell
git revert <commit-hash-phase0b>
rm services/tenantApiClient.ts
rm services/adminApiClient.ts
rm server/src/middleware/realmGuard.ts
```

**Manual Rollback (if needed):**
1. Remove `requireControlPlaneRealm()` from controlPlaneService.ts
2. Remove `resetOnRealmChange()` from apiClient.ts
3. Restore original TenantRegistry catch block
4. Remove realmGuard hook from server/src/index.ts
5. Delete new client wrappers and middleware

---

## Acceptance Checklist

### Phase 0-A
- [ ] `requireControlPlaneRealm()` guard added to all 13 control-plane functions
- [ ] `resetOnRealmChange()` exported from apiClient.ts
- [ ] TenantRegistry catches REALM_MISMATCH error
- [ ] No `/api/control/*` requests when realm is TENANT (verified in Network tab)
- [ ] Error message shows "Requires admin privileges"
- [ ] No 401 responses / no retry loops
- [ ] No spinner hang
- [ ] Preflight verification passes (only 3 files modified)
- [ ] Commit message follows convention

### Phase 0-B
- [ ] `tenantApiClient.ts` created with 4 wrapper functions
- [ ] `adminApiClient.ts` created with 4 wrapper functions
- [ ] `realmGuardMiddleware.ts` created with ENDPOINT_REALM_MAP
- [ ] Middleware registered in Fastify onRequest hook
- [ ] Admin token on tenant endpoint → 403
- [ ] Tenant token on admin endpoint → 403
- [ ] Public endpoints (/api/auth, /health) accessible without token
- [ ] Error messages are clear and actionable
- [ ] Preflight verification passes
- [ ] Commit message follows convention

### Integration
- [ ] Tenant user login → no control-plane polling
- [ ] Admin user login → control-plane queries work
- [ ] Realm switch → all requests abort, tokens cleared, navigate to /
- [ ] Server logs show no 401 storms
- [ ] Frontend network tab shows clean request patterns

---

## Future Work (Not in Wave 0)

1. **React Query Integration:** Add `enabled:` gates based on realm
2. **Realm Context Provider:** Centralize realm state management
3. **Route Guards:** Prevent navigation to admin routes if not in admin realm
4. **Monitoring:** Add metrics for REALM_MISMATCH errors
5. **E2E Tests:** Automated realm switching scenarios

---

## References

- **Doctrine:** v1.4 Part 2 §2.4 (Multi-Realm JWT Isolation)
- **Governance:** `shared/contracts/ARCHITECTURE-GOVERNANCE.md`
- **RLS Policy:** `shared/contracts/rls-policy.md`
- **OpenAPI:** `shared/contracts/openapi.control-plane.json`, `openapi.tenant.json`
