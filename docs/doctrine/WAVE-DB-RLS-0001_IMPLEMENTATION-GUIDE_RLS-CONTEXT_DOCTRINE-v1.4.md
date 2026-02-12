# WAVE-DB-RLS-0001: Implementation Guide — RLS Context Model (Doctrine v1.4)

**Wave:** DB-RLS-0001 (Database Row-Level Security Foundation)  
**Status:** PLANNED (Execution-Ready)  
**Priority:** CRITICAL — Must complete BEFORE Wave 2 readiness tests are meaningful  
**Owner:** TexQtic Platform Engineering  
**Date:** February 12, 2026  
**Related Decision:** [DECISION-0001](./DECISION-0001_RLS-AS-CONSTITUTIONAL-BOUNDARY_DOCTRINE-v1.4_CONTEXT-MODEL.md)

---

## 1. Purpose & Scope

### 1.1 Why This Wave Exists

**Critical Path Dependency:**  
Wave 2 readiness tests cannot be considered meaningful until the RLS Context Model is fully implemented. Without proper RLS enforcement and tenant isolation, any test results are **false positives** that mask cross-tenant data leakage.

**This wave establishes:**

1. **Constitutional enforcement primitive** — RLS policies as authoritative tenant boundaries
2. **Context-first database access** — No query executes without proper tenant context
3. **Pooler-safe architecture** — Transaction-local context prevents session bleed
4. **Microservice-ready foundation** — Context propagation model for future service decomposition

### 1.2 Scope Boundaries

**IN SCOPE:**

- Database RLS policy implementation (SQL)
- Shared context library (`@texqtic/db-context`)
- Middleware for context extraction from JWT claims
- Database access wrapper enforcing context requirement
- Test infrastructure updates (seed-only bypass, tag-based cleanup)
- Microservice contract tests and enforcement

**OUT OF SCOPE:**

- Application-level RBAC (authorization logic remains unchanged)
- API endpoint permission checks (handled by existing middleware)
- Frontend state management
- Performance optimization (may follow in later wave)

### 1.3 Success Criteria

This wave is **COMPLETE** when:

1. ✅ All tenant-scoped tables have RLS policies enabled
2. ✅ All database queries execute with valid tenant context
3. ✅ Tests use seed-only bypass (no production bypass mechanisms)
4. ✅ Pooler safety verified (no context bleed between transactions)
5. ✅ Wave 2 readiness tests can run with RLS enforcement active

---

## 2. Preconditions

### 2.1 Infrastructure Requirements

**Database Configuration (MUST VERIFY):**

- Supabase Postgres with PgBouncer pooler
- Pooler mode: **Transaction** (port 6543)
- Connection URL format: `postgresql://postgres.<project-ref>:<password>@<pooler-url>:6543/postgres?sslmode=require&pgbouncer=true`
- Superuser access available for migration application

**Verification Checklist:**

1. ✅ Confirm using pooler host + port **6543** (transaction pooler)
2. ✅ Confirm URL includes `pgbouncer=true` parameter
3. ✅ Verify transaction-local settings behave correctly:
   ```sql
   -- Test SET LOCAL behavior
   BEGIN;
   SET LOCAL app.test_var = 'test_value';
   SELECT current_setting('app.test_var', TRUE); -- Should return 'test_value'
   COMMIT;
   SELECT current_setting('app.test_var', TRUE); -- Should return NULL (cleared)
   ```

**Note:** `SHOW pool_mode` is a PgBouncer admin command, not available in standard Postgres connections. Rely on port selection (6543) and pooler parameter for verification.

### 2.2 Required Context Fields

Every database transaction MUST establish these fields:

| Field            | Type   | Source                           | Required | Purpose                   |
| ---------------- | ------ | -------------------------------- | -------- | ------------------------- |
| `app.org_id`     | UUID   | JWT claim `org_id`               | Yes      | Tenant isolation boundary |
| `app.actor_id`   | UUID   | JWT claim `sub` (user ID)        | Yes      | Actor performing action   |
| `app.realm`      | TEXT   | Route prefix or JWT claim        | Yes      | `'tenant'` or `'control'` |
| `app.request_id` | UUID   | Generated per request            | Yes      | Audit trail / tracing     |
| `app.auth_level` | TEXT   | JWT claim `role` or `auth_level` | Optional | RBAC metadata             |
| `app.roles`      | TEXT[] | JWT claim `roles`                | Optional | User role array           |

**Context Completeness Rule:**  
Minimum viable context = `org_id` + `actor_id` + `realm` + `request_id`

**IMPORTANT: tenant_id vs org_id Mapping (Doctrine Clarification)**

- **Physical column name:** `tenant_id` (UUID) — legacy naming convention in schema
- **Doctrine context variable:** `app.org_id` — canonical name in RLS context model
- **Policy implementation:** Policies compare `tenant_id = app.current_org_id()`
- **Rationale:** `tenant_id` is a legacy synonym for organizational boundary; Doctrine v1.4 standardizes on `org_id` for context variables to align with multi-tenant terminology
- **Optional helper (future):** `app.current_tenant_id()` could alias `app.current_org_id()` for schema compatibility, but NOT required for Gate A

### 2.3 Existing Codebase State

**Assumptions (MUST VERIFY):**

- Prisma Client is used for all database access
- JWT middleware already extracts claims
- Route handlers have access to `req.user` or similar
- Test infrastructure uses Vitest or similar framework

---

## 3. Architecture Blueprint

### 3.1 Request Flow (Context Lifecycle)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. HTTP Request                                                 │
│    Authorization: Bearer <JWT>                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Auth Middleware (JWT Validation)                             │
│    - Verifies JWT signature                                     │
│    - Extracts claims: { sub, org_id, roles, ... }                │
│    - Attaches to request: req.user = { ... }                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Context Builder Middleware                                   │
│    - Calls buildContextFromRequest(req)                          │
│    - Returns DatabaseContext object                             │
│    - Attaches to request: req.dbContext = { ... }                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Route Handler (Business Logic)                               │
│    - Receives req with req.dbContext                             │
│    - Calls withDbContext(prisma, req.dbContext, async () => {   │
│        // Database operations here                              │
│      })                                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. DB Context Wrapper (@texqtic/db-context)                     │
│    - Validates context completeness                             │
│    - Executes: SET LOCAL app.org_id = '<uuid>'                  │
│    - Executes: SET LOCAL app.actor_id = '<uuid>'                │
│    - Executes: SET LOCAL app.realm = '<realm>'                  │
│    - Executes: SET LOCAL app.request_id = '<uuid>'              │
│    - Runs user callback with context-enabled Prisma client      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Prisma Query Execution                                       │
│    - Query runs with RLS policies active                        │
│    - Policies read: current_setting('app.org_id')               │
│    - Only tenant-isolated rows returned/modified                │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

**Middleware Layer:**

- Extract JWT claims
- Build DatabaseContext object
- Determine realm based on route prefix (`/api/control/*` → `'control'`, else → `'tenant'`)
- Generate request_id (UUID v4)

**Database Access Layer:**

- Enforce "no context, no database" rule
- Set transaction-local context variables (always `SET LOCAL`)
- Wrap all Prisma operations in context-aware wrapper
- Provide test-only bypass mechanism (gated by `NODE_ENV=test`)

**RLS Policy Layer:**

- Read context from `current_setting('app.*')`
- Enforce tenant isolation (standard template)
- Support bypass for test/seed roles (when `app.bypass_rls = 'true'`)
- Log policy violations (future: audit table)

---

## 4. Database Work Plan

### 4.1 Phase 1: Context Helpers (SQL Foundation)

**Task:** Create PostgreSQL helper functions for context access

**File:** `server/prisma/rls/000_context_helpers.sql`

**Required Functions:**

```sql
-- Example structure (DO NOT IMPLEMENT YET)
-- Function: app.current_org_id() → UUID
-- Function: app.current_actor_id() → UUID
-- Function: app.current_realm() → TEXT
-- Function: app.current_request_id() → UUID
-- Function: app.bypass_enabled() → BOOLEAN (reads 'on'/'off', returns boolean)
```

**Bypass Semantics:**

- Use `'on'` / `'off'` (not `'true'` / `'false'`)
- Helper function: `app.bypass_enabled()` returns `BOOLEAN`
- Implementation: `current_setting('app.bypass_rls', TRUE) = 'on'`

**Purpose:**  
Encapsulate `current_setting()` calls for cleaner policy definitions.

**Verification:**

```sql
-- After applying migration
SELECT app.current_org_id(); -- Should return NULL or fail gracefully
```

### 4.2 Phase 2: Enable RLS on Tenant Tables

**Task:** Identify and enable RLS on all tenant-scoped tables

**Tenant-Scoped Tables (ACTUAL — verified in schema):**

- `catalog_items` ✅ **PILOT TABLE (Gate A)**
- `carts`
- `cart_items`
- `marketplace_cart_summaries`
- `audit_logs`
- `event_logs`
- `memberships`
- `invites`
- `tenant_feature_overrides`
- `ai_budgets`
- `ai_usage_meters`
- `impersonation_sessions`

**Note:** Original guide listed `invoices`, `invoice_items`, `payments`, `trade_parties` as examples, but these tables do not exist in current schema. Use actual schema tables.

**SQL Template:**

```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY; -- CRITICAL: Ensures table owner respects policies
```

**Verification:**

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;
```

### 4.3 Phase 3: Apply Standard Tenant Policies

**Task:** Create tenant isolation policies using standard template

**Policy Template (for each tenant table):**

**IMPORTANT:** Physical column is `tenant_id` (legacy naming), context is `app.org_id` (Doctrine v1.4 standard).

```sql
-- SELECT policy (fail-closed: requires context)
CREATE POLICY tenant_isolation_select ON <table_name>
  FOR SELECT
  USING (
    app.bypass_enabled() = true
    OR
    (tenant_id = app.current_org_id() AND app.current_org_id() IS NOT NULL)
  );

-- INSERT policy (fail-closed: requires context)
CREATE POLICY tenant_isolation_insert ON <table_name>
  FOR INSERT
  WITH CHECK (
    app.bypass_enabled() = true
    OR
    (tenant_id = app.current_org_id() AND app.current_org_id() IS NOT NULL)
  );

-- UPDATE policy (fail-closed: requires context)
CREATE POLICY tenant_isolation_update ON <table_name>
  FOR UPDATE
  USING (
    app.bypass_enabled() = true
    OR
    (tenant_id = app.current_org_id() AND app.current_org_id() IS NOT NULL)
  )
  WITH CHECK (
    app.bypass_enabled() = true
    OR
    (tenant_id = app.current_org_id() AND app.current_org_id() IS NOT NULL)
  );

-- DELETE policy (fail-closed: requires context)
CREATE POLICY tenant_isolation_delete ON <table_name>
  FOR DELETE
  USING (
    app.bypass_enabled() = true
    OR
    (tenant_id = app.current_org_id() AND app.current_org_id() IS NOT NULL)
  );
```

**Critical:** Explicit `IS NOT NULL` check ensures queries **fail closed** (throw error) when context is missing, not return empty results.

**FORCE RLS Operational Note:**

- `ALTER TABLE <table_name> FORCE ROW LEVEL SECURITY;` MUST be applied to every RLS-enabled table
- **Why:** Without FORCE, table owner (typically `postgres` user) bypasses ALL policies (fail-open breach)
- **Impact:** Even superuser/owner connections respect RLS; seeding REQUIRES triple-gated bypass
- **Pooler-Safe Execution:** All context setting MUST use `SET LOCAL` within a transaction; NEVER use session-level `SET` (causes context bleed across pooled connections)

**Special Cases:**

**Trade Parties (Multi-Tenant Visibility):**

```sql
-- Trade parties visible when:
-- 1. Belongs to current tenant (buyer)
-- 2. Belongs to counterparty tenant (seller)
CREATE POLICY trade_party_select ON trade_parties
  FOR SELECT
  USING (
    app.bypass_enabled() = true
    OR
    buyer_org_id = app.current_org_id()
    OR
    seller_org_id = app.current_org_id()
  );
```

**Events Table (Append-Only Ledger):**

**Note:** Event-related tables in actual schema are `event_logs` (not `events`). Adjust table name accordingly.

```sql
-- Read policy: Tenant-scoped visibility
CREATE POLICY events_read ON event_logs
  FOR SELECT
  USING (
    app.bypass_enabled() = true
    OR
    (tenant_id = app.current_org_id() AND app.current_org_id() IS NOT NULL)
  );

-- Write policy: Enforce provenance (org + actor context required)
CREATE POLICY events_insert ON event_logs
  FOR INSERT
  WITH CHECK (
    app.bypass_enabled() = true
    OR
    (
      tenant_id = app.current_org_id()
      AND actor_id = app.current_actor_id()
      AND app.current_org_id() IS NOT NULL
      AND app.current_actor_id() IS NOT NULL
    )
  );

-- Immutability: No updates or deletes (event sourcing)
CREATE POLICY events_immutable ON event_logs
  FOR UPDATE
  USING (false);

CREATE POLICY events_no_delete ON event_logs
  FOR DELETE
  USING (false);
```

**Critical:** INSERT policy enforces event provenance (tenant + actor) at database level.

### 4.4 Phase 4: Control Plane Policies

**Task:** Create realm-aware policies for control plane tables

**Control Plane Tables:**

- `organizations` (tenant registry)
- `system_config`
- `feature_flags`
- `super_admins`

**Policy Template:**

```sql
CREATE POLICY control_plane_access ON organizations
  FOR SELECT
  USING (
    app.bypass_enabled() = true
    OR
    app.current_realm() = 'control' -- See all orgs
    OR
    (app.current_realm() = 'tenant' AND id = app.current_org_id()) -- See own org
  );
```

### 4.5 Phase 5: Bypass Policies (Test-Only)

**Task:** Implement bypass flag support with strict governance

**Bypass Rules:**

1. Only effective when `app.bypass_rls = 'on'` (standardized semantics)
2. MUST be guarded in application code (`NODE_ENV=test` check)
3. MUST be restricted by database role (production role CANNOT set bypass)
4. SHOULD log warning when enabled
5. Used ONLY for:
   - Test data seeding
   - CI/CD seed scripts
   - Development database inspection (read-only)

**Database Role Governance (CRITICAL):**

```sql
-- Production application role (CANNOT bypass RLS)
CREATE ROLE app_user_prod;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user_prod;
REVOKE SET ON PARAMETER app.bypass_rls FROM app_user_prod; -- Explicit denial

-- Test/Seed role (CAN bypass RLS for seeding)
CREATE ROLE app_user_test;
GRANT app_user_prod TO app_user_test; -- Inherits base permissions
GRANT SET ON PARAMETER app.bypass_rls TO app_user_test; -- Explicit grant
```

**Why This Matters:**
Without role-based restriction, a SQL injection vulnerability becomes a full RLS bypass.  
With role restriction, even compromised application code cannot disable RLS.

**Example Policy with Bypass (Actual Implementation):**

```sql
CREATE POLICY tenant_select ON catalog_items
  FOR SELECT
  USING (
    app.require_org_context()
    AND catalog_items.tenant_id = app.current_org_id()
    AND NOT app.bypass_enabled()
  );

CREATE POLICY bypass_select ON catalog_items
  FOR SELECT
  USING (app.bypass_enabled());
```

**Note:** Actual implementation uses separate policies for tenant isolation and bypass (cleaner separation of concerns).

### 4.6 Migration Strategy

**Safe Rollout:**

1. Apply context helpers first (no impact)
2. Enable RLS on ONE pilot table (`catalog_items`) ✅ **COMPLETED IN GATE A**
3. Test pilot table with new context wrapper (Gate B)
4. If successful, batch-enable remaining tables (Gate D)
5. Apply all policies in single migration (atomic)

**Gate A Implementation Notes:**

- **Pilot table:** `catalog_items` (confirmed in actual implementation)
- **Physical column:** `tenant_id` (UUID)
- **Context variable:** `app.org_id` (Doctrine v1.4 standard)
- **Policies created:** 8 new policies (4 tenant + 4 bypass)
- **FORCE RLS applied:** Yes (critical for table owner enforcement)
- **Pre-existing policy detected:** `catalog_items_tenant_read` (uses `app.tenant_id`, old convention)

**Legacy Policy Cleanup Plan (Gate B.2):**

After pilot route validation in Gate B confirms new context model works end-to-end:

```sql
-- DROP legacy policy (scheduled for Gate B.2, NOT Gate A)
DROP POLICY IF EXISTS catalog_items_tenant_read ON catalog_items;
```

**Rationale for deferring cleanup:**
- Avoid breaking existing behavior before server context is validated
- Legacy policy does not interfere with new policies (both enforce tenant isolation)
- Redundancy is acceptable during transition; divergence is not
- Remove only after confirming new context wrapper works in production routes

**Rollback Plan:**

```sql
-- Emergency rollback (if needed)
ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS <policy_name> ON <table_name>;
```

---

## 5. Server Work Plan

### 5.1 Phase 1: Create Shared Context Library

**Package:** `@texqtic/db-context`  
**Location:** `server/src/lib/database-context.ts`

**Required Exports:**

**1. DatabaseContext Interface**

```typescript
export interface DatabaseContext {
  orgId: string; // UUID
  actorId: string; // UUID
  realm: 'tenant' | 'control';
  requestId: string; // UUID
  authLevel?: string; // Optional RBAC metadata
  roles?: string[]; // Optional role array
}
```

**2. buildContextFromRequest()**

```typescript
export function buildContextFromRequest(req: FastifyRequest): DatabaseContext {
  // Extract from req.user (JWT claims)
  // Determine realm from route prefix
  // Generate requestId
  // Validate completeness
  // Return context object
}
```

**3. withDbContext()**

```typescript
export async function withDbContext<T>(
  prisma: PrismaClient,
  context: DatabaseContext,
  callback: () => Promise<T>
): Promise<T> {
  // Validate context completeness
  // Execute SET LOCAL statements
  // Run callback
  // Return result
  // Note: Context auto-clears after transaction (SET LOCAL)
}
```

**4. withBypassForSeed() (Test-Only)**

```typescript
export async function withBypassForSeed<T>(
  prisma: PrismaClient,
  callback: () => Promise<T>
): Promise<T> {
  // Guard: if (process.env.NODE_ENV !== 'test') throw error
  // Log warning
  // Execute: SET LOCAL app.bypass_rls = 'on'  (standardized syntax)
  // Run callback
  // Return result
}
```

**Note:** Use `'on'` not `'true'` (prevents string/boolean ambiguity).

### 5.2 Phase 2: Add Context Middleware

**Location:** `server/src/middleware/database-context.middleware.ts`

**Responsibilities:**

- Extract JWT claims from `req.user`
- Call `buildContextFromRequest(req)`
- Attach to request: `req.dbContext = context`
- Handle missing claims (401 Unauthorized)

**Integration Point:**

```typescript
// In server setup
app.register(jwtAuthMiddleware); // Existing
app.register(databaseContextMiddleware); // NEW
```

### 5.3 Phase 3: Enforce "No Context, No Database" Rule

**Strategy:** Create access layer wrapper that requires context

**Location:** `server/src/lib/db.ts`

**Pattern:**

```typescript
// BEFORE (vulnerable)
const invoices = await prisma.invoice.findMany({ ... });

// AFTER (context-required)
const invoices = await withDbContext(prisma, req.dbContext, async () => {
  return prisma.invoice.findMany({ ... });
});
```

**Enforcement Mechanisms:**

1. **Linter Rule:** Detect bare `prisma.*` calls outside db layer
2. **Code Review:** Require context wrapper in all PRs
3. **CI Check:** Run linter as pre-commit hook

### 5.4 Phase 4: Update Route Handlers

**Migration Strategy:**

- Update auth routes first (pilot)
- Then invoice routes (high-value, high-risk)
- Then remaining tenant routes
- Finally control plane routes

**Example Migration (Adjusted for Actual Schema):**

```typescript
// OLD
async function getCatalogItems(req: FastifyRequest, reply: FastifyReply) {
  const items = await prisma.catalogItem.findMany({
    where: { tenantId: req.user.orgId }, // Manual filter (legacy)
  });
  return items;
}

// NEW
async function getCatalogItems(req: FastifyRequest, reply: FastifyReply) {
  const items = await withDbContext(prisma, req.dbContext, async () => {
    return prisma.catalogItem.findMany({
      // No manual filter needed — RLS enforces isolation
    });
  });
  return items;
}
```

---

## 6. Test Work Plan (Pooler-Safe)

### 6.1 Problem Statement

**Current Issue:**  
Tests may use session-scoped context or bypass mechanisms that:

- Bleed context between tests (pooler reuse)
- Don't actually test RLS enforcement
- Cause flaky failures due to shared state

**Solution:**  
Transaction-local context + seed-only bypass + tag-based cleanup

### 6.2 Phase 1: Seed-Only Bypass

**Rule:** Bypass ONLY during test data seeding, NEVER during test execution

**Pattern:**

```typescript
// BEFORE (wrong)
beforeEach(async () => {
  await prisma.$executeRaw`SET app.bypass_rls = 'true'`; // Session-scoped!
  await seedTestData();
});

// AFTER (correct)
beforeEach(async () => {
  await withBypassForSeed(prisma, async () => {
    await seedTestData(); // Bypass active only during seed
  });
  // Bypass cleared after transaction
});

test('catalog items query respects RLS', async () => {
  // RLS ACTIVE — bypass cleared
  const context = { orgId: ORG_A_ID, actorId: USER_A_ID, realm: 'tenant', requestId: uuid() };
  const items = await withDbContext(prisma, context, async () => {
    return prisma.catalogItem.findMany();
  });
  // Fail-closed: Only Org A items returned (or throw if context invalid)
  expect(items.every(item => item.tenantId === ORG_A_ID)).toBe(true);
});
```

### 6.3 Phase 2: Tag-Based Cleanup

**Problem:** `deleteMany({})` wipes all data, including other tests' data (pooler reuse)

**Solution:** Tag test data with `request_id` or `test_run_id`, then clean by tag

**Pattern:**

```typescript
let testRunId: string;

beforeEach(async () => {
  testRunId = uuid();
  await withBypassForSeed(prisma, async () => {
    await prisma.invoice.create({
      data: {
        orgId: ORG_A_ID,
        testRunId, // Tag for cleanup
        // ... other fields
      },
    });
  });
});

afterEach(async () => {
  await withBypassForSeed(prisma, async () => {
    await prisma.invoice.deleteMany({
      where: { testRunId }, // Clean only this test's data
    });
  });
});
```

### 6.4 Phase 3: Timeout Optimization

**Rule:** Timeouts are a LAST RESORT. Optimize teardown first.

**Optimization Checklist:**

- ✅ Use tag-based cleanup (fast, targeted)
- ✅ Close connections properly (`prisma.$disconnect()`)
- ✅ Use database transactions for isolation (faster than cleanup)
- ✅ Batch seed operations (single transaction)
- ⚠️ Only increase timeout if above fail

**Transaction-Based Test Pattern (Fastest):**

```typescript
test('invoice query', async () => {
  await prisma.$transaction(async (tx) => {
    // Seed, test, auto-rollback
    await tx.invoice.create({ ... });
    const result = await tx.invoice.findMany();
    expect(result).toHaveLength(1);
    // Transaction rolls back — no cleanup needed
  });
});
```

### 6.5 Phase 4: RLS Enforcement Tests

**Required Tests:**

1. **Cross-tenant isolation:** Org A cannot see Org B's invoices
2. **Pooler safety:** Context doesn't bleed between transactions
3. **Bypass governance:** Bypass fails outside test environment
4. **Missing context:** Query fails when context not set
5. **Realm enforcement:** Control plane queries work as expected

**Example Test (Adjusted for catalog_items pilot):**

```typescript
describe('RLS Tenant Isolation', () => {
  test('org A cannot see org B catalog items', async () => {
    // Seed data for both orgs
    await withBypassForSeed(prisma, async () => {
      await prisma.catalogItem.create({ data: { tenantId: ORG_A_ID, ... } });
      await prisma.catalogItem.create({ data: { tenantId: ORG_B_ID, ... } });
    });

    // Query as Org A
    const contextA = { orgId: ORG_A_ID, actorId: USER_A_ID, realm: 'tenant', requestId: uuid() };
    const itemsA = await withDbContext(prisma, contextA, async () => {
      return prisma.catalogItem.findMany();
    });

    // Should only see Org A's items
    expect(itemsA).toHaveLength(1);
    expect(itemsA[0].tenantId).toBe(ORG_A_ID);
  });
});
```

---

## 7. Microservice Work Plan

### 7.1 Context Header Contract

**When TexQtic scales to multiple services, context MUST propagate.**

**Required Headers (Service-to-Service):**

```http
X-TexQtic-Org-ID: <uuid>
X-TexQtic-Actor-ID: <uuid>
X-TexQtic-Realm: tenant|control
X-TexQtic-Request-ID: <uuid>
```

**Contract Test Example:**

```typescript
describe('Microservice Context Propagation', () => {
  test('service B receives context from service A', async () => {
    const contextA = { orgId: ORG_A_ID, actorId: USER_A_ID, realm: 'tenant', requestId: uuid() };

    // Service A calls Service B
    const response = await fetch('http://service-b/api/invoices', {
      headers: {
        'X-TexQtic-Org-ID': contextA.orgId,
        'X-TexQtic-Actor-ID': contextA.actorId,
        'X-TexQtic-Realm': contextA.realm,
        'X-TexQtic-Request-ID': contextA.requestId,
      },
    });

    // Service B should use context for RLS
    expect(response.status).toBe(200);
  });

  test('missing org_id header fails', async () => {
    const response = await fetch('http://service-b/api/invoices', {
      headers: {
        // Missing X-TexQtic-Org-ID
        'X-TexQtic-Actor-ID': USER_A_ID,
        'X-TexQtic-Realm': 'tenant',
        'X-TexQtic-Request-ID': uuid(),
      },
    });

    // Should fail with 400 Bad Request
    expect(response.status).toBe(400);
  });
});
```

### 7.2 Shared Library Strategy

**Package:** `@texqtic/context`  
**Purpose:** Shared context extraction/propagation for all services

**Exports:**

- `extractDatabaseContext(headers: Headers): DatabaseContext`
- `injectContextHeaders(context: DatabaseContext): HeadersInit`
- `validateContext(context: Partial<DatabaseContext>): DatabaseContext`

**Usage:**

```typescript
// In Service B (receiving side)
app.register(async instance => {
  instance.addHook('preHandler', async req => {
    req.dbContext = extractDatabaseContext(req.headers);
  });
});

// In Service A (calling side)
const headers = injectContextHeaders(req.dbContext);
await fetch('http://service-b/api/invoices', { headers });
```

### 7.3 Enforcement Strategy

**CODEOWNERS Rule:**

```
# Require approval for context changes
server/src/lib/database-context.ts @texqtic/platform-eng
```

**Linter Rule (ESLint Custom):**

```javascript
// Detect bare Prisma calls outside db layer
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'MemberExpression[object.name="prisma"]',
      message: 'Direct prisma access forbidden. Use withDbContext() wrapper.',
    },
  ],
}
```

**CI Check:**

```yaml
# .github/workflows/rls-check.yml
- name: Verify RLS Context Usage
  run: |
    npm run lint
    npm run test:rls-isolation
```

---

## 8. Rollout & Verification Gates

### Gate A: Database Foundation

**Status:** ✅ **COMPLETE** (Implemented: 2026-02-12, Commit: e1187c5)

**Requirements:**

- [x] Context helper functions created (8 functions in app schema)
- [x] RLS enabled on pilot table (`catalog_items`)
- [x] FORCE RLS enabled on pilot table (table owner enforcement)
- [x] Standard tenant policies applied to pilot table (4 explicit policies)
- [x] Bypass policies applied (triple-gated: 4 policies)
- [x] SQL migrations applied (2 migrations: 20260212122000 + 20260212122100)
- [x] Verification script created (verify-gate-a-rls.ts)
- [x] Verification confirms RLS active

**Actual Implementation:**

- **Pilot table:** `catalog_items` (NOT invoices)
- **Physical column:** `tenant_id` (UUID)
- **Context variable:** `app.org_id`
- **Policies:** 8 new + 1 pre-existing (catalog_items_tenant_read with app.tenant_id)
- **Migrations:** 
  - `20260212122000_db_hardening_wave_01_gate_a_context_helpers_and_pilot_rls`
  - `20260212122100_force_rls_on_catalog_items`

**Verification:**

```sql
-- Confirm RLS enabled AND forced
SELECT tablename, rowsecurity, relforcerowsecurity 
FROM pg_tables t
JOIN pg_class c ON t.tablename = c.relname
WHERE tablename = 'catalog_items';
-- Expected: rowsecurity = true, relforcerowsecurity = true

-- Confirm policies exist
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'catalog_items';
-- Expected: 8 new policies (tenant_select/insert/update/delete + bypass_select/insert/update/delete)
-- Plus: 1 pre-existing (catalog_items_tenant_read) — to be removed in Gate B.2
```

**Known Issues:**

1. **Pre-existing legacy policy:** `catalog_items_tenant_read` uses old context variable `app.tenant_id`
   - **Action:** Leave in place for Gate A; schedule removal in Gate B.2 after pilot route validation
   - **Cleanup command:** `DROP POLICY IF EXISTS catalog_items_tenant_read ON catalog_items;`

**Exit Criteria:** ✅ Database ready for context-aware queries

---

### Gate B: Server Integration (Pilot)

**Status:** � **READY TO START** (Gate A complete)

**Requirements:**

- [ ] `@texqtic/db-context` library created
- [ ] Context middleware added to server
- [ ] Pilot route updated (catalog items route recommended)
- [ ] Manual test confirms context propagation
- [ ] Pilot route returns only tenant-scoped data
- [ ] **Gate B.2:** Remove legacy policy after validation

**Gate B.2: Legacy Policy Cleanup**

After pilot route confirms new context model works:

```sql
-- Execute this ONLY after pilot route validation passes
DROP POLICY IF EXISTS catalog_items_tenant_read ON catalog_items;
```

**Verification checklist for B.2:**
- [ ] Pilot route tested with real JWT tokens
- [ ] Cross-tenant isolation verified (Org A cannot see Org B items)
- [ ] Context logs show `SET LOCAL app.org_id` executed
- [ ] No RLS errors in production logs
- [ ] THEN drop legacy policy

**Verification:**

```bash
# Manual test: Query as Org A (adjust endpoint for actual schema)
curl -H "Authorization: Bearer <ORG_A_JWT>" \
  http://localhost:3001/api/tenant/catalog-items

# Verify response contains only Org A items
# Check server logs for: "SET LOCAL app.org_id = '<ORG_A_ID>'"
# Verify tenantId field in response matches org_id from JWT
```

**Exit Criteria:** One route uses RLS context successfully

---

### Gate C: Test Infrastructure Hardening

**Status:** 🔴 BLOCKED (Waiting on Gate B)

**Requirements:**

- [ ] Seed-only bypass implemented (`withBypassForSeed`)
- [ ] Tag-based cleanup pattern added to pilot test
- [ ] Pooler safety test added (context isolation)
- [ ] Bypass governance test added (NODE_ENV check)
- [ ] All pilot tests pass with RLS active

**Verification:**

```bash
# Run pilot tests (adjust pattern for actual table)
npm test -- --testPathPattern=catalog

# Confirm:
# - No "SET app.bypass_rls" (only SET LOCAL within transactions)
# - Tests use withDbContext()
# - Cleanup uses tags, not deleteMany({})
# - Context clears after transaction (pooler safety)
```

**Exit Criteria:** Test infrastructure is RLS-safe

---

### Gate D: Full Rollout

**Status:** 🔴 BLOCKED (Waiting on Gate C)

**Requirements:**

- [ ] RLS enabled on ALL tenant-scoped tables
- [ ] All tenant routes updated to use context wrapper
- [ ] Control plane routes updated (realm-aware)
- [ ] Trade party policies deployed (multi-tenant visibility)
- [ ] Events table policies deployed (append-only)
- [ ] All integration tests updated
- [ ] CI pipeline includes RLS enforcement checks

**Verification:**

```bash
# Run full test suite
npm test

# Check RLS coverage (adjust for actual schema)
psql -c "SELECT tablename, relforcerowsecurity FROM pg_tables t JOIN pg_class c ON t.tablename = c.relname WHERE schemaname='public' AND rowsecurity=true;"
# Should include: catalog_items, carts, cart_items, marketplace_cart_summaries, audit_logs, event_logs, memberships, etc.
# relforcerowsecurity should be TRUE for all (table owner enforcement)
```

**Exit Criteria:** RLS enforced across entire platform

---

### Gate E: Wave 2 Readiness Re-Run

**Status:** 🔴 BLOCKED (Waiting on Gate D)

**Requirements:**

- [ ] All previous gates passed
- [ ] Re-run Wave 2 readiness tests WITH RLS active
- [ ] Tests pass (no cross-tenant leakage)
- [ ] Performance acceptable (latency < 50ms overhead)
- [ ] Audit log confirms context used for all queries

**Verification:**

```bash
# Re-run Wave 2 readiness
npm run test:wave2-readiness

# Check audit log (if implemented)
psql -c "SELECT COUNT(*) FROM audit_log WHERE context_missing = true;"
# Expected: 0
```

**Exit Criteria:** Wave 2 readiness tests are NOW meaningful

---

## 9. Risks & Mitigations

### Risk 1: Pooler Connection Reuse (Context Bleed)

**Risk Level:** 🔴 CRITICAL  
**Description:** Session-scoped context (`SET`) persists across pooled connections, causing Org A to see Org B's data.

**Mitigation:**

- ✅ **ALWAYS use `SET LOCAL`** (transaction-scoped)
- ✅ Verify in tests: context clears after transaction
- ✅ Add CI check: grep for `SET app.` (session-scoped)
- ✅ Document: "No SET without LOCAL"

**Detection:**

```typescript
test('pooler safety: context does not bleed', async () => {
  // Transaction 1: Set context for Org A
  await withDbContext(prisma, { orgId: ORG_A_ID, ... }, async () => {
    const items = await prisma.catalogItem.findMany();
    expect(items[0].tenantId).toBe(ORG_A_ID);
  });

  // Transaction 2: Query without context (MUST FAIL CLOSED)
  await expect(async () => {
    await prisma.catalogItem.findMany();
  }).rejects.toThrow(); // Missing context throws RLS error
});
```

**Critical Change:** Query without context must **throw error**, not return empty array (fail-closed enforcement).

---

### Risk 2: Long-Running Transactions

**Risk Level:** 🟡 MEDIUM  
**Description:** `SET LOCAL` context lives until transaction ends. Long transactions may hold context too long, causing pooler exhaustion.

**Mitigation:**

- ⚠️ Keep transactions short (< 1 second)
- ⚠️ Use read-committed isolation (Supabase default)
- ⚠️ Monitor transaction duration (pgBouncer metrics)
- ✅ Document: "Context wrapper is NOT for batch jobs"

**Alternative for Batch Jobs:**

```typescript
// For large batch operations, set context per-batch
for (const batch of batches) {
  await withDbContext(prisma, context, async () => {
    await processBatch(batch); // Short transaction
  });
}
```

---

### Risk 3: Audit Log Performance Impact

**Risk Level:** 🟢 LOW  
**Description:** `request_id` context enables audit logging, but audit inserts may slow down queries.

**Mitigation:**

- ✅ Use async audit log writer (background job)
- ✅ Insert audit records AFTER business logic commit
- ✅ Use separate connection pool for audit writes
- ✅ Monitor audit lag (metric: `audit_lag_seconds`)

**Pattern:**

```typescript
await withDbContext(prisma, context, async () => {
  const invoice = await prisma.invoice.create({ ... });

  // Audit happens async (fire-and-forget)
  auditQueue.push({
    action: 'invoice.create',
    orgId: context.orgId,
    actorId: context.actorId,
    requestId: context.requestId,
    entityId: invoice.id,
  });

  return invoice;
});
```

---

### Risk 4: Microservice Context Loss

**Risk Level:** 🟡 MEDIUM  
**Description:** Service-to-service calls may forget to propagate context headers, causing silent failures.

**Mitigation:**

- ✅ Create shared HTTP client that auto-injects headers
- ✅ Contract tests: "missing org_id fails"
- ✅ Linter rule: detect fetch() without context headers
- ✅ Monitoring: alert on 400 errors from missing context

**Shared Client:**

```typescript
// @texqtic/http-client
export function createContextAwareClient(context: DatabaseContext) {
  return {
    async fetch(url: string, options?: RequestInit) {
      const headers = {
        ...options?.headers,
        ...injectContextHeaders(context),
      };
      return fetch(url, { ...options, headers });
    },
  };
}
```

---

### Risk 5: Test Bypass Leaking to Production

**Risk Level:** 🔴 CRITICAL  
**Description:** `withBypassForSeed()` accidentally used in production code, disabling RLS.

**Mitigation:**

- ✅ Guard with `if (NODE_ENV !== 'test') throw error`
- ✅ Log warning when bypass used (even in test)
- ✅ Linter rule: detect `withBypassForSeed` outside test files
- ✅ CI check: grep production code for bypass usage

**Detection:**

```bash
# CI check
grep -r "withBypassForSeed" server/src --exclude-dir=__tests__
# Exit code 1 = found (CI fails)
# Exit code 0 = not found (CI passes)
```

---

## 10. Definition of Done

### 10.1 Database Layer

- [ ] Context helper functions created and tested
- [ ] RLS enabled on all tenant-scoped tables
- [ ] Standard tenant policies applied (explicit INSERT/UPDATE/DELETE)
- [ ] Trade party multi-tenant policies applied
- [ ] Events table policies applied (append-only with INSERT enforcement)
- [ ] Control plane realm-aware policies applied
- [ ] Bypass flag support added (test-only, role-gated)
- [ ] SQL migrations applied to all environments

### 10.2 Server Layer

- [ ] `@texqtic/db-context` library created
- [ ] `buildContextFromRequest()` implemented
- [ ] `withDbContext()` implemented (enforces SET LOCAL)
- [ ] `withBypassForSeed()` implemented (NODE_ENV guarded, uses 'on'/'off')
- [ ] Context middleware added to server
- [ ] All tenant routes updated to use context wrapper
- [ ] All control plane routes updated (realm-aware)
- [ ] "No context, no database" rule enforced (fail-closed)

### 10.3 Test Layer

- [ ] Seed-only bypass pattern implemented
- [ ] Tag-based cleanup pattern implemented
- [ ] RLS isolation tests added (cross-tenant, pooler safety, fail-closed)
- [ ] Bypass governance tests added (NODE_ENV check + role restriction)
- [ ] All integration tests updated and passing
- [ ] Test timeouts optimized (< 30s per suite)
- [ ] CI pipeline includes RLS tests

### 10.4 Microservice Readiness

- [ ] Context header contract defined
- [ ] `@texqtic/context` shared library created
- [ ] Contract tests added (missing context fails)
- [ ] Shared HTTP client with auto-inject created
- [ ] Lint rules for context enforcement added
- [ ] CODEOWNERS rules for context files added

### 10.5 Documentation

- [ ] Implementation guide complete (this document)
- [ ] Decision record complete (DECISION-0001)
- [ ] API docs updated (context requirements)
- [ ] Database schema docs updated (RLS policies)
- [ ] Runbook for troubleshooting context issues

### 10.6 Production Readiness

- [ ] All gates (A-E) passed
- [ ] Performance testing complete (< 50ms overhead)
- [ ] Monitoring dashboards created (context metrics)
- [ ] Alerts configured (context-missing queries)
- [ ] Rollback plan tested and documented
- [ ] Wave 2 readiness tests re-run and PASS

---

## 11. Governance & Allowlist (Drift-Proofing)

### 11.1 Safe-Write File Allowlist

**Files explicitly ALLOWED for modification during RLS implementation waves:**

1. **Database migrations:**
   - `server/prisma/migrations/**/*.sql` (new migrations only)
   - `server/prisma/migrations/**/migration.sql` (Prisma migration files)

2. **Verification utilities:**
   - `server/prisma/verify-*.ts` (DB verification scripts for Gate validation)
   - Example: `verify-gate-a-rls.ts`, `verify-gate-b-rls.ts`

3. **Documentation:**
   - `docs/doctrine/WAVE-DB-RLS-0001_IMPLEMENTATION-GUIDE_RLS-CONTEXT_DOCTRINE-v1.4.md` (this file)
   - `docs/doctrine/DECISION-0001_RLS-AS-CONSTITUTIONAL-BOUNDARY_DOCTRINE-v1.4_CONTEXT-MODEL.md`

4. **Context library (Gate B only):**
   - `server/src/lib/database-context.ts` (when Gate B begins)
   - `server/src/middleware/database-context.middleware.ts` (when Gate B begins)

**FORBIDDEN (NEVER MODIFY):**

- `.env` or `.env.example` files
- `server/prisma/schema.prisma` (unless explicit Gate requirement)
- Production route handlers (until Gate B+)
- Test files (until Gate C)
- Any file outside server/prisma during Gate A

### 11.2 Verification Script Conventions

**Purpose:** Ad-hoc DB inspection scripts for gate validation (NOT production code)

**Naming:** `verify-<gate>-<aspect>.ts` (e.g., `verify-gate-a-rls.ts`)

**Location:** `server/prisma/` (co-located with migrations for easy access)

**Lifecycle:** Created during gate, may be deleted after gate passes (or kept for regression testing)

**Governance:** Allowlisted explicitly; NOT subject to production code review standards

---

## Completion Checklist

- [x] File created at exact path: `docs/doctrine/WAVE-DB-RLS-0001_IMPLEMENTATION-GUIDE_RLS-CONTEXT_DOCTRINE-v1.4.md`
- [x] Contains phased plan with explicit gates (Gates A-E)
- [x] Includes microservice enforcement strategy (Section 7)
- [x] Contains risk mitigation strategies (Section 9)
- [x] Contains definition of done checklist (Section 10)
- [x] Contains governance & allowlist rules (Section 11)
- [x] Pilot table corrected (catalog_items, not invoices)
- [x] tenant_id/org_id mapping documented
- [x] Legacy policy cleanup planned (Gate B.2)
- [x] FORCE RLS operational notes included
- [x] Pooler-safety emphasized (SET LOCAL only)
- [x] No code changes made (documentation only)
- [x] No secrets or connection strings added

---

**End of Implementation Guide**

This guide is now ready for execution. Work begins at **Gate A: Database Foundation**.

**Next Actions:**

1. Review this guide with platform engineering team
2. Assign owners to each gate
3. Begin Gate A: Create `000_context_helpers.sql`
4. Track progress using gate checkboxes above
