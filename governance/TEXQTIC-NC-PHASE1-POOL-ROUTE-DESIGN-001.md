# TEXQTIC-NC-PHASE1-POOL-ROUTE-DESIGN-001
## Pool Route / API Surface Design

**Document ID:** TEXQTIC-NC-PHASE1-POOL-ROUTE-DESIGN-001
**Status:** DESIGN ONLY — NOT AUTHORIZED FOR IMPLEMENTATION
**Predecessor Packet:** TEXQTIC-NC-PHASE1-POOL-SERVICE-INTEGRATION-HARNESS-DB-VERIFY-001 (commit 0b9949b)
**Service Authority:** NetworkPoolService (commit 0b9949b, 5/5 integration tests PASS)
**Created:** 2026-05-07
**Author:** Governance Artifact — Route Design Analysis

> ⚠️ **DESIGN-ONLY GATE**  
> This packet is a route/API design surface only. It does NOT authorize route implementation.
> This design artifact proposes minimum route paths, auth gates, request/response shapes, and test strategy
> for the next implementation packet: `TEXQTIC-NC-PHASE1-POOL-ROUTE-IMPLEMENTATION-001`.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Proposed Route Paths](#2-proposed-route-paths)
3. [Auth & Org Scoping Model](#3-auth--org-scoping-model)
4. [Actor Model for Lifecycle Transitions](#4-actor-model-for-lifecycle-transitions)
5. [Request Body Schemas](#5-request-body-schemas)
6. [Response DTOs](#6-response-dtos)
7. [Error Mapping](#7-error-mapping)
8. [Feature Flag Recommendation](#8-feature-flag-recommendation)
9. [RLS and Service Boundary](#9-rls-and-service-boundary)
10. [MemberOrgId Derivation — Critical Blocker Resolution](#10-memberorgid-derivation--critical-blocker-resolution)
11. [Route Test Plan](#11-route-test-plan)
12. [Implementation Allowlist](#12-implementation-allowlist)
13. [Blockers & Open Questions](#13-blockers--open-questions)
14. [Recommendation](#14-recommendation)

---

## 1. Overview

This design proposes the minimum tenant-plane route surface for Network Commerce Pools,
exposing the four verified NetworkPoolService methods through REST endpoints.

**Service Methods Being Exposed:**
1. `createNetworkPool(orgId, userId, input)` → `NetworkPoolRecord` (DRAFT state)
2. `openNetworkPool(orgId, input)` → `NetworkPoolRecord` (OPEN state, with lifecycle log entry)
3. `joinNetworkPool(memberOrgId, userId, input)` → `NetworkPoolMembershipRecord` (PENDING state)
4. `getNetworkPoolById(id, orgId)` → `NetworkPoolRecord` (owner-scoped read)
5. `getNetworkPoolMembership(poolId, memberOrgId)` → `NetworkPoolMembershipRecord` (member-scoped read)

**Governance Context:**
- Routes follow existing tenant-plane patterns: `tenantAuthMiddleware` → `databaseContextMiddleware` → handler
- `orgId` is ALWAYS derived from `request.dbContext.orgId` (JWT); never from request body (D-017-A pattern)
- All inputs use snake_case (service API convention); all outputs use snake_case (output DTO convention)
- Audit logging follows existing `writeAuditLog` pattern
- Service errors map to standard HTTP status codes per error type

---

## 2. Proposed Route Paths

**Namespace:** `/api/tenant/network-commerce/pools` (consistent with multi-module namespace pattern)

| Method | Path | Intent | Service Method | Auth Gate |
|--------|------|--------|----------------|-----------|
| `POST` | `/api/tenant/network-commerce/pools` | Create DRAFT pool | `createNetworkPool` | Tenant auth + org context |
| `POST` | `/api/tenant/network-commerce/pools/:poolId/open` | DRAFT → OPEN transition | `openNetworkPool` | Tenant auth + pool owner only |
| `POST` | `/api/tenant/network-commerce/pools/:poolId/join` | Create membership | `joinNetworkPool` | Tenant auth + member org context |
| `GET` | `/api/tenant/network-commerce/pools/:poolId` | Read owned pool | `getNetworkPoolById` | Tenant auth + pool owner only |
| `GET` | `/api/tenant/network-commerce/pools/:poolId/membership` | Read own membership | `getNetworkPoolMembership` | Tenant auth + member org context |

**Path Rationale:**
- Namespace `/network-commerce/pools` mirrors existing `/tradesummary/`, `/escalations/`, etc.
- Action verbs (`/open`, `/join`, `/membership`) follow POST + path pattern seen in invoice transitions (`/:invoiceId/transition`)
- No list endpoints in this design (out-of-scope; see Section 13)
- UUID path params use convention `:poolId`, not `:id`

---

## 3. Auth & Org Scoping Model

### Request Context Flow (All Routes)

```
HTTP Request
  ↓
[tenantAuthMiddleware]
  → Verify tenant JWT (JWT realm check)
  → Populate request.userId, request.tenantId, request.userRole
  → Verify user membership in tenantId
  ↓
[databaseContextMiddleware]
  → Build DatabaseContext from request.userId, request.tenantId
  → Attach request.dbContext = { orgId, actorId, realm: 'tenant', requestId }
  → orgId = the authenticated tenant's organization ID
  ↓
Route Handler
  → Use request.dbContext.orgId for all service calls
```

### Auth Gates Per Route

#### 1. POST /api/tenant/network-commerce/pools

```
Authenticated tenant user can create a DRAFT pool.

- orgId ← request.dbContext.orgId (authenticated org)
- userId ← request.userId (authenticated user, may be null for service accounts)
- input ← validated request body

Scoping:
- Caller's orgId becomes the pool owner/admin (NetworkPool.orgId)
- No additional permission check required (any tenant user can create)
- Service will validate pool_ref + commodity_category + target_qty input

Success:
- HTTP 201 Created
- Body: NetworkPoolRecord (DRAFT state)

Failure Responses (see Section 7)
- 400 Invalid quantity / missing commodity_category
- 409 pool_ref already exists for this org
- 500 Unexpected error
```

#### 2. POST /api/tenant/network-commerce/pools/:poolId/open

```
Only pool owner/admin can open the pool.

- poolId ← from URL path
- orgId ← request.dbContext.orgId (authenticated org)
- userId ← request.userId
- input.actor_type ← from body ('TENANT_USER' | 'TENANT_ADMIN' | ...)
- input.actor_role ← from body (membership role snapshot)
- input.reason ← from body (transition justification)

Permission Gate (IN HANDLER):
  await db.networkPool.findFirst({
    where: { id: poolId, orgId }  ← Verify caller owns pool
  })
  if (!poolRow) → sendForbidden or sendNotFound

Note: If pool exists but caller is different org → sendForbidden (not 404, per RLS/visibility rules)

Scoping:
- orgId passed to openNetworkPool MUST equal pool owner org
- Service will verify pool is in DRAFT state
- Service will call StateMachineService.transition (DRAFT → OPEN)
- Lifecycle log entry is written in the same transaction

Success:
- HTTP 200 OK
- Body: NetworkPoolRecord (OPEN state, lifecycle_state_key='OPEN')

Failure Responses (see Section 7)
- 403 Forbidden (caller does not own pool)
- 404 Not Found (pool not found)
- 422 Unprocessable Entity (pool not in DRAFT state)
- 500 Unexpected error
```

#### 3. POST /api/tenant/network-commerce/pools/:poolId/join

```
Any authenticated tenant user can join an OPEN or AGGREGATING pool.

- poolId ← from URL path
- memberOrgId ← request.dbContext.orgId (authenticated org joining as member)
- userId ← request.userId
- input.declared_qty ← from body
- input.qty_unit ← from body

Permission Gate:
- memberOrgId is implicit from auth context (non-negotiable per D-017-A)
- No explicit role check (any org member with auth can declare intent to join)
- Service will verify pool exists and is in joinable state

Scoping:
- memberOrgId ← request.dbContext.orgId ONLY
- Service will check for duplicate membership (same org already joined)

Success:
- HTTP 201 Created
- Body: NetworkPoolMembershipRecord (PENDING status)

Failure Responses (see Section 7)
- 400 Invalid declared_qty
- 404 Pool not found or pool in non-joinable state
- 409 Duplicate membership (org already joined pool)
- 500 Unexpected error
```

#### 4. GET /api/tenant/network-commerce/pools/:poolId

```
Pool owner/admin can read pool metadata.

- poolId ← from URL path
- orgId ← request.dbContext.orgId (authenticated org)

Permission Gate (IN HANDLER):
  await db.networkPool.findFirst({
    where: { id: poolId, orgId }
  })
  if (!poolRow) → sendForbidden or sendNotFound

Success:
- HTTP 200 OK
- Body: NetworkPoolRecord

Failure Responses (see Section 7)
- 403 Forbidden (caller does not own pool)
- 404 Not Found (pool not found)
- 500 Unexpected error
```

#### 5. GET /api/tenant/network-commerce/pools/:poolId/membership

```
Member organization can read only its own membership for a pool.

- poolId ← from URL path
- memberOrgId ← request.dbContext.orgId (authenticated org)

Permission Gate:
- Service will verify membership exists AND memberOrgId matches querying org
- If membership doesn't exist or belongs to different org → service returns error

Success:
- HTTP 200 OK
- Body: NetworkPoolMembershipRecord

Failure Responses (see Section 7)
- 403 Forbidden (membership does not exist or belongs to different org)
- 404 Not Found (pool not found)
- 500 Unexpected error
```

---

## 4. Actor Model for Lifecycle Transitions

**Only `openNetworkPool` involves StateMachine lifecycle transitions (DRAFT → OPEN).**

The StateMachineService requires actor context for audit/log purposes:

```typescript
// From NetworkPoolService.openNetworkPool() signature:
input: OpenNetworkPoolInput = {
  pool_id: string;
  actor_user_id?: string | null;          // From JWT request.userId
  actor_admin_id?: string | null;         // Null in tenant routes (admin-only concept)
  actor_type: 'TENANT_USER' | 'TENANT_ADMIN' | 'PLATFORM_ADMIN' | 'SYSTEM_AUTOMATION' | 'MAKER' | 'CHECKER';
  actor_role: string;                     // From membership.role snapshot
  reason: string;                         // From request body (mandatory)
  request_id?: string | null;             // From request.id (Fastify-generated)
}
```

**Route Responsibility (POST /pools/:poolId/open):**
1. Resolve `request.userId` → `actor_user_id`
2. Resolve `actor_type` from body (caller submits; no enum validation in route — service validates)
3. Resolve `actor_role` from request.userRole (already populated by tenantAuthMiddleware)
4. Pass `reason` from request body (mandatory field, route validates)
5. Pass `request_id = request.id` (Fastify standard)

**No route-level actor_type inference.** Caller must explicitly state their actor classification.

---

## 5. Request Body Schemas

All request bodies follow Zod schema validation pattern (existing convention).

### 5.1 POST /pools (Create Pool)

```typescript
const createPoolBodySchema = z.object({
  // D-017-A: org_id NEVER from body (will be rejected with z.never())
  org_id: z
    .never({ errorMap: () => ({ message: 'org_id must not be provided in request body' }) })
    .optional(),

  // Pool identity and commodity
  pool_ref: z.string().trim().min(1).max(100, 'pool_ref max 100 chars'),
  commodity_category: z.string().trim().min(1).max(100, 'commodity_category max 100 chars'),

  // Quantity
  target_qty: z.number().positive('target_qty must be > 0'),
  qty_unit: z.string().trim().min(1).max(50, 'qty_unit max 50 chars'),

  // Optional dates
  open_at: z.string().datetime({ offset: true }).optional().nullable(),
  close_at: z.string().datetime({ offset: true }).optional().nullable(),

  // Optional metadata
  metadata: z.record(z.unknown()).optional().nullable(),
});
```

**Validation Note:**
- `pool_ref` is unique per org (enforced by service, not route)
- `open_at < close_at` if both supplied (service validates)
- No price fields in Pool (Governed Liquidity Doctrine)

### 5.2 POST /pools/:poolId/open (Open Pool)

```typescript
const openPoolBodySchema = z.object({
  // Transition context
  actor_type: z.enum([
    'TENANT_USER',
    'TENANT_ADMIN',
    'PLATFORM_ADMIN',
    'SYSTEM_AUTOMATION',
    'MAKER',
    'CHECKER',
  ]),
  reason: z.string().trim().min(1).max(2000, 'reason max 2000 chars'),
});
```

**Validation Note:**
- `actor_role` comes from JWT/middleware (not from body)
- `actor_user_id` comes from JWT (not from body)
- `reason` is mandatory for audit trail

### 5.3 POST /pools/:poolId/join (Join Pool)

```typescript
const joinPoolBodySchema = z.object({
  declared_qty: z.number().positive('declared_qty must be > 0'),
  qty_unit: z.string().trim().min(1).max(50, 'qty_unit max 50 chars'),
});
```

**Validation Note:**
- `pool_id` comes from URL path (not from body)
- `qty_unit` on membership can differ from pool's `qty_unit` (caller responsibility; not DB-enforced in Phase 1)

### 5.4 GET /pools/:poolId (Read Pool)

No body (GET request).

### 5.5 GET /pools/:poolId/membership (Read Membership)

No body (GET request).

---

## 6. Response DTOs

All responses use service-defined record types (snake_case, matching API conventions).

### 6.1 NetworkPoolRecord (Pool Read Response)

```typescript
interface NetworkPoolRecord {
  id: string;                           // UUID
  org_id: string;                       // Owner org UUID
  pool_ref: string;                     // Stable external reference
  commodity_category: string;
  target_qty: string;                   // Decimal as string (precision)
  qty_unit: string;                     // e.g. 'KG', 'MT', 'METERS'
  lifecycle_state_id: string;           // UUID of current state
  lifecycle_state_key: string | null;   // e.g. 'DRAFT', 'OPEN', 'CLOSED', etc.
  open_at: string | null;               // ISO 8601 datetime or null
  close_at: string | null;
  allocated_at: string | null;          // (Phase 2+)
  settled_at: string | null;            // (Phase 2+)
  metadata: Record<string, unknown> | null;
  created_by_user_id: string | null;    // User who created pool (nullable for system operations)
  created_at: string;                   // ISO 8601 datetime
  updated_at: string;                   // ISO 8601 datetime
}
```

**Response Pattern (HTTP 200 or 201):**
```json
{
  "success": true,
  "data": { NetworkPoolRecord }
}
```

### 6.2 NetworkPoolMembershipRecord (Membership Read Response)

```typescript
interface NetworkPoolMembershipRecord {
  id: string;                           // UUID
  pool_id: string;                      // UUID of pool
  org_id: string;                       // Member org UUID
  declared_qty: string;                 // Decimal as string
  qty_unit: string;
  allocated_qty: string | null;         // (Phase 2+)
  allocation_pct: string | null;        // (Phase 2+)
  status: string;                       // 'PENDING', 'APPROVED', 'WITHDRAWN', ...
  joined_at: string;                    // ISO 8601
  approved_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**Response Pattern (HTTP 200 or 201):**
```json
{
  "success": true,
  "data": { NetworkPoolMembershipRecord }
}
```

### 6.3 Error Response Pattern

All errors follow existing repo convention:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

---

## 7. Error Mapping

**Service Errors → HTTP Status Codes**

| Service Error | HTTP Status | Error Code | Example Message |
|---------------|------------|-----------|-----------------|
| `NetworkPoolNotFoundError` | 404 | `POOL_NOT_FOUND` | "Network pool not found" |
| `NetworkPoolInvalidInputError` | 400 | `INVALID_INPUT` | "target_qty must be a positive number greater than zero" |
| `NetworkPoolInvalidStateError` | 422 | `INVALID_STATE` | "Pool is in state 'CLOSED' — required: [DRAFT]" |
| `NetworkPoolDuplicateMembershipError` | 409 | `DUPLICATE_MEMBERSHIP` | "A membership for this organization already exists in this pool" |
| `NetworkPoolTransitionDeniedError` | 422 | `TRANSITION_DENIED` | "Lifecycle transition denied [RULE_VIOLATION]: Pool cannot open without reaching quorum" |
| `NetworkPoolLifecycleStateMissingError` | 500 | `INTERNAL_ERROR` | "POOL lifecycle state 'DRAFT' not found in lifecycle_states. Ensure the POOL lifecycle seed migration has been applied." |
| Unauthorized (caller does not own pool) | 403 | `FORBIDDEN` | "You do not have permission to access this pool" |
| Unauthorized (membership not accessible) | 403 | `FORBIDDEN` | "You do not have permission to view this membership" |
| Any unhandled error | 500 | `INTERNAL_ERROR` | "An unexpected error occurred" |

**Error Response Example (400):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "target_qty must be a positive number greater than zero"
  }
}
```

---

## 8. Feature Flag Recommendation

### Proposed Flag

```
FeatureFlag.key = 'nc.procurement_pools.enabled'
FeatureFlag.enabled = false (default; opt-in activation)
FeatureFlag.description = 'Enable Network Commerce Collective Procurement Pools'
```

### Gate Pattern (Optional)

**Option A: Use FeatureFlag middleware (recommended)**

Similar to TTP pattern (ttpFeatureGateMiddleware):
- Create `ncPoolsFeatureGateMiddleware` in `server/src/middleware/`
- Reads `nc.procurement_pools.enabled` from `FeatureFlag` table
- Returns 503 `FEATURE_DISABLED` if false or missing
- Registered as `preHandler` after `databaseContextMiddleware`

**Option B: No middleware (simplest for Phase 1)**

- Routes are unconditionally available if endpoint exists
- Feature flag can be read by control plane but does not gate route access
- Deferrer: flag becomes enforced in Phase 1B or Phase 2

**Recommendation for TEXQTIC-NC-PHASE1-POOL-ROUTE-IMPLEMENTATION-001:**

**Option B** (no middleware gate) to minimize implementation scope.
- Routes exist and are auth-gated (tenant routes only)
- Control plane retains ability to read/manage feature flag via existing GET/PUT endpoints
- Gate enforcement can be added in a follow-up focus packet if needed

**Rationale:**
- Pool routes are internal tenant-only (not public)
- Auth middleware already gates access (only authenticated tenants)
- No need for kill-switch in Phase 1 (unlike TTP which is broader)

---

## 9. RLS and Service Boundary

### Prisma RLS Policies

The schema uses RLS on `network_pools` and `network_pool_memberships`:

```
Tenant-plane queries:
  - NetworkPool: WHERE org_id = app.org_id (RLS enforces pool owner can only read own pools)
  - NetworkPoolMembership: WHERE org_id = app.org_id (RLS enforces member can only read own memberships)

Admin-plane queries:
  - Bypass via app.is_admin = 'true' (control plane oversight)
```

### Service Boundary Strategy (IN HANDLER)

Routes MUST NOT rely solely on RLS. They must also validate in-application:

```typescript
// Example: GET /pools/:poolId
const pool = await db.networkPool.findFirst({
  where: { id: poolId, orgId: request.dbContext.orgId }  ← Explicit orgId check
});
if (!pool) return sendForbidden(reply, 'You do not have permission...');

// Example: GET /pools/:poolId/membership
const membership = await db.networkPoolMembership.findFirst({
  where: { 
    poolId,
    orgId: request.dbContext.orgId  ← Explicit orgId check
  }
});
if (!membership) return sendForbidden(reply, 'You do not have permission...');
```

**Defense-in-Depth Rule:**
- RLS acts as the database-level safeguard (fail-closed for any misconfiguration)
- Service/route layer adds explicit `orgId` validation (readable intent)
- Routes never trust implicit RLS behavior alone

---

## 10. MemberOrgId Derivation — Critical Blocker Resolution

### The Critical Question

**How is `memberOrgId` derived in the `joinNetworkPool` route when the route receives the HTTP request?**

The service method signature is:
```typescript
async joinNetworkPool(
  memberOrgId: string,  ← Must come from HTTP request, but WHERE?
  userId: string | null,
  input: JoinNetworkPoolInput,
): Promise<NetworkPoolMembershipRecord>
```

### Design Decision: MemberOrgId = Authenticated Org Context

**Rule (D-017-A pattern):**

```
memberOrgId ← request.dbContext.orgId (authenticated organization)
              ↑
              Derived from JWT + tenantAuthMiddleware

INVARIANT: A user authenticated for Org-A cannot join a pool on behalf of Org-B.
```

**No client-supplied memberOrgId is permitted.**

### Implementation Pattern

```typescript
// POST /pools/:poolId/join Handler

const dbContext = request.dbContext;
if (!dbContext) return sendError(reply, 'UNAUTHORIZED', 'Database context missing', 401);

const bodyResult = joinPoolBodySchema.safeParse(request.body);
if (!bodyResult.success) return sendValidationError(reply, bodyResult.error.errors);

const memberOrgId = dbContext.orgId;  ← ALWAYS from auth context, NEVER from body
const userId = (request as any).userId ?? null;

const membership = await svc.joinNetworkPool(memberOrgId, userId, bodyResult.data);
```

### Why This Is Safe

1. **JWT is immutable** — `request.userId` and `request.tenantId` are verified before middleware
2. **DatabaseContext is built once** — `databaseContextMiddleware` computes `orgId` from JWT claims
3. **Client cannot forge org context** — Would require forging JWT (crypto-hard)
4. **Matches existing pattern** — Same as invoice.service (seller org always = authenticated org)

### Out-of-Scope: Org Switching

If TexQtic adds a feature where a user can declare they're acting on behalf of a *different* org
(e.g., "I'm a corporate manager for Org-A and Org-B"), that would require:
- New middleware to resolve "selected org context"
- Explicit authorization check (does user have permission for selected org?)
- That decision is OUT-OF-SCOPE for Phase 1

**Phase 1 Constraint:** One authenticated org → one acting org.

---

## 11. Route Test Plan

**Test Framework:** Vitest + Fastify test utilities (matching existing test patterns)

**Test File:** `server/src/routes/tenant/pool.integration.test.ts`

### Test Suite Structure

#### Section A: POST /pools (Create Pool) — 6 tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| CPR-01 | Create pool with valid input (authenticated tenant) | HTTP 201, NetworkPoolRecord (DRAFT state) |
| CPR-02 | Create pool with negative target_qty | HTTP 400 INVALID_INPUT |
| CPR-03 | Create pool with missing commodity_category | HTTP 400 INVALID_INPUT |
| CPR-04 | Create pool with open_at ≥ close_at | HTTP 400 INVALID_INPUT |
| CPR-05 | Unauthenticated request | HTTP 401 |
| CPR-06 | Create two pools for same org with same pool_ref | HTTP 409 DUPLICATE (if service enforces unique pool_ref per org) |

#### Section B: POST /pools/:poolId/open (Open Pool) — 5 tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| OPR-01 | Open pool in DRAFT state (owner org) | HTTP 200, NetworkPoolRecord (OPEN state) |
| OPR-02 | Open pool but caller org ≠ pool owner | HTTP 403 FORBIDDEN |
| OPR-03 | Open non-existent pool | HTTP 404 NOT_FOUND |
| OPR-04 | Open pool in OPEN state (already open) | HTTP 422 INVALID_STATE |
| OPR-05 | Open pool with missing reason field | HTTP 400 INVALID_INPUT |

#### Section C: POST /pools/:poolId/join (Join Pool) — 7 tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| JPR-01 | Join OPEN pool (member org, valid qty) | HTTP 201, NetworkPoolMembershipRecord (PENDING status) |
| JPR-02 | Join AGGREGATING pool | HTTP 201, NetworkPoolMembershipRecord |
| JPR-03 | Join pool in DRAFT state | HTTP 404 or HTTP 422 INVALID_STATE |
| JPR-04 | Join pool with negative declared_qty | HTTP 400 INVALID_INPUT |
| JPR-05 | Join same pool twice (same org) | HTTP 409 DUPLICATE_MEMBERSHIP |
| JPR-06 | Join non-existent pool | HTTP 404 NOT_FOUND |
| JPR-07 | Unauthenticated request | HTTP 401 |

#### Section D: GET /pools/:poolId (Read Pool) — 4 tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| RPR-01 | Read own pool | HTTP 200, NetworkPoolRecord |
| RPR-02 | Read pool owned by different org | HTTP 403 FORBIDDEN (not 404, to avoid leaking pool existence) |
| RPR-03 | Read non-existent pool | HTTP 404 NOT_FOUND |
| RPR-04 | Unauthenticated request | HTTP 401 |

#### Section E: GET /pools/:poolId/membership (Read Membership) — 5 tests

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| MRP-01 | Read own membership | HTTP 200, NetworkPoolMembershipRecord |
| MRP-02 | Read membership of different org | HTTP 403 FORBIDDEN |
| MRP-03 | Read membership that doesn't exist | HTTP 404 or HTTP 403 (membership not found for this org) |
| MRP-04 | Read for non-existent pool | HTTP 404 NOT_FOUND |
| MRP-05 | Unauthenticated request | HTTP 401 |

### Test Fixtures & Helpers

```typescript
// Shared fixtures
function makePool(overrides = {}): Partial<NetworkPoolRecord> { ... }
function makeMembership(overrides = {}): Partial<NetworkPoolMembershipRecord> { ... }

// Auth helpers
function makeTenantRequest(orgId, userId, tenantId) { ... }

// Request builders
function makeCreatePoolBody(overrides = {}) { ... }
function makeOpenPoolBody(overrides = {}) { ... }
function makeJoinPoolBody(overrides = {}) { ... }
```

### Integration Test Scope

- All tests use **real Prisma client** (not mocks)
- All tests run against **test database** (isolated per test via `withBypassForSeed`)
- Cleanup via `afterEach` or transaction rollback

---

## 12. Implementation Allowlist

**For the next packet: TEXQTIC-NC-PHASE1-POOL-ROUTE-IMPLEMENTATION-001**

### Files to Create

| File | Role | Notes |
|------|------|-------|
| `server/src/routes/tenant/pools.ts` | Route handler file | Main route implementation |
| `server/src/routes/tenant/pools.integration.test.ts` | Test suite | Full integration tests (28 test cases) |

### Files to Modify (Minimal)

| File | Change | Reason |
|------|--------|--------|
| `server/src/routes/tenant.ts` | Import + register pools routes | Route registration (1-2 lines) |
| `server/src/__tests__/tenant-pools.e2e.test.ts` (new) | E2E tests (if separate file needed) | Optional; integration tests may be sufficient |

### Files NOT to Touch

- `server/src/services/networkPool.service.ts` — Service is final from Phase 1 foundation
- `server/src/__tests__/network-pool.service.unit.test.ts` — Unit tests complete
- `server/src/__tests__/network-pool.service.integration.test.ts` — Integration tests complete
- `server/prisma/schema.prisma` — No schema changes
- Any UI files (out of scope)
- Governance files (except after implementation, for closure)

### Middleware / Utilities (Pre-existing)

- `server/src/middleware/auth.ts` — tenantAuthMiddleware ✓ (already exists)
- `server/src/middleware/database-context.middleware.ts` — databaseContextMiddleware ✓ (already exists)
- `server/src/utils/response.ts` — sendSuccess, sendError, sendValidationError ✓ (already exists)
- `server/src/lib/database-context.ts` — withDbContext ✓ (already exists)
- `server/src/lib/auditLog.ts` — writeAuditLog ✓ (already exists)

---

## 13. Blockers & Open Questions

### Confirmed Resolved (NOT Blockers)

✅ **Service Contract Completeness**  
NetworkPoolService has all 5 required methods; 5/5 integration tests PASS.

✅ **Prisma Accessor Names**  
Fixed in commit 0b9949b (camelCase Prisma accessors, snake_case field mapping confirmed working).

✅ **MemberOrgId Derivation**  
Derived from authenticated org context (request.dbContext.orgId); no client-supplied org_id permitted (D-017-A).

✅ **Lifecycle State Seed**  
POOL lifecycle states and transitions exist (17 states, 24 transitions, seeded in commit f4d81af).

### No Remaining Blockers for Route Implementation

All design questions have clear answers based on existing repo patterns.

### Out-of-Scope (Not Blockers, But Deferred)

1. **Pool List Endpoint**  
   Not in Phase 1 scope. Design decision: Out-of-scope for TEXQTIC-NC-PHASE1-POOL-ROUTE-IMPLEMENTATION-001.  
   Reason: List requires visibility/discovery policy (multiple pages, filtering, tenant vs. member view).

2. **Pool Closure & State Transitions (OPEN → CLOSED, etc.)**  
   Not in Phase 1 scope. Design decision: Out-of-scope.  
   Reason: Requires completion of allocation, settlement, and dispute logic (Phase 2+).

3. **Admin Oversight Routes (Control Plane)**  
   Not in Phase 1 scope. Design decision: Out-of-scope for this design.  
   Reason: Control-plane pools inspection can be added in a follow-up packet.

4. **Feature Flag Middleware (nc.procurement_pools.enabled)**  
   Recommended as no-gate (Option B) for Phase 1. Can be added in Phase 1B if needed.

5. **Per-Org Allocation Profile Customization**  
   E.g., "This org always gets 10% more allocation if they join."  
   Not in Phase 1 scope. Design decision: Out-of-scope.

---

## 14. Recommendation

### Can the Next Packet Open?

**YES** — `TEXQTIC-NC-PHASE1-POOL-ROUTE-IMPLEMENTATION-001` can be authorized.

**Rationale:**
- ✅ NetworkPoolService is fully tested and verified (commit 0b9949b: 5/5 integration tests)
- ✅ All route design decisions are clear (auth patterns, error mapping, request/response schemas)
- ✅ Precedent exists (invoice.service → invoices.ts routes already follow the same pattern)
- ✅ No blockers remain (MemberOrgId derivation is resolved; Prisma accessors are fixed)
- ✅ Allowlist is minimal (2 files to create, 1 line to register in tenant.ts)

### Expected Implementation Timeline

- **Estimated effort:** 2–4 hours (implementing 5 routes + 28 tests)
- **Complexity:** Low (standard CRUD + error mapping)
- **Risk:** Very low (service is proven; patterns are established)

### Success Criteria for TEXQTIC-NC-PHASE1-POOL-ROUTE-IMPLEMENTATION-001

- [ ] All 5 routes implemented per design
- [ ] All 28 test cases PASS (CPR-01 through MRP-05)
- [ ] TypeScript clean (`tsc --noEmit`)
- [ ] `git diff` shows only allowlisted files
- [ ] Single atomic commit: `feat(network-commerce): add pool route foundation`

---

## 15. Files Inspected

### Service Layer
- ✅ `server/src/services/networkPool.service.ts` (260 lines, final verified state)
- ✅ `server/src/__tests__/network-pool.service.unit.test.ts` (420 lines, 15/15 PASS)
- ✅ `server/src/__tests__/network-pool.service.integration.test.ts` (312 lines, 5/5 PASS)

### Route Patterns (Reference)
- ✅ `server/src/routes/tenant.ts` (Top-level route registration: 120+ lines)
- ✅ `server/src/routes/tenant/invoices.ts` (Example tenant route: 350+ lines, full pattern reference)
- ✅ `server/src/routes/control.ts` (Admin route patterns)

### Middleware & Context
- ✅ `server/src/middleware/auth.ts` (tenantAuthMiddleware, adminAuthMiddleware)
- ✅ `server/src/middleware/database-context.middleware.ts` (databaseContextMiddleware)
- ✅ `server/src/middleware/ttpFeatureGate.middleware.ts` (Feature flag gate example)

### Utilities & Libs
- ✅ `server/src/utils/response.ts` (sendSuccess, sendError, sendValidationError)
- ✅ `server/src/lib/database-context.js` (withDbContext, buildContextFromRequest)
- ✅ `server/src/lib/auditLog.ts` (writeAuditLog pattern)

### Governance & Design
- ✅ `governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md` (Feature overview)
- ✅ `governance/control/OPEN-SET.md`, `NEXT-ACTION.md` (Current sequencing)
- ✅ `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md` (Authority)

### Feature Flag Reference
- ✅ `server/src/middleware/ttpFeatureGate.middleware.ts` (Two-layer gate pattern)
- ✅ `server/src/ttp/ttp.constants.ts` (Feature flag naming convention)
- ✅ `components/ControlPlane/FeatureFlags.tsx` (Admin UI for flags)

---

## 16. Verification Performed

### Pre-Work Verification

| Check | Status |
|-------|--------|
| git status clean | ✅ PASS |
| All 11 prerequisite commits present | ✅ PASS (2f5c52b, f479ac8, 70f83b2, 29331e1, cf092dd, f4d81af, 481f256, 41a5ece, 6680026, b9ab12a, 0b9949b) |
| NetworkPoolService unit tests 15/15 | ✅ PASS (0b9949b) |
| NetworkPoolService integration 5/5 real DB | ✅ PASS (0b9949b) |
| Cleanup verification (0 HARNESS rows) | ✅ PASS (0b9949b) |
| TypeScript clean | ✅ PASS (0b9949b) |

### Design Validation

| Check | Result |
|-------|--------|
| Service method signatures finalized? | ✅ Yes, all 5 methods have stable signatures |
| Auth middleware patterns checked? | ✅ Yes, tenantAuthMiddleware + databaseContextMiddleware present and working |
| Route registration pattern identified? | ✅ Yes, follows tenant.ts import + register pattern |
| Error types mapped to HTTP? | ✅ Yes, 6 service errors → 4 HTTP status codes |
| Request/response DTO patterns confirmed? | ✅ Yes, follow existing invoice/escrow patterns |
| MemberOrgId derivation resolved? | ✅ Yes, derived from request.dbContext.orgId (JWT auth) |
| Feature flag pattern analyzed? | ✅ Yes, TTP two-layer gate available as reference; Phase 1 uses no-gate Option B |
| Test patterns researched? | ✅ Yes, vitest + fixture patterns from network-pool.service.unit.test.ts |

---

## 17. Conclusion

This design proposes a minimal, repo-consistent route surface for Network Commerce Pools.
It adheres to existing tenant-plane patterns, leverages the verified NetworkPoolService,
and resolves all blocking design questions.

The next packet (`TEXQTIC-NC-PHASE1-POOL-ROUTE-IMPLEMENTATION-001`) is **ready to proceed**
with confidence that implementation will be straightforward and low-risk.

---

**End of Design Document**
