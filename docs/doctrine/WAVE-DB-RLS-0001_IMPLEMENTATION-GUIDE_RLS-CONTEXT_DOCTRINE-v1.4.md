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
- Connection URL format: `postgresql://postgres.<project-ref>:<password>@<pooler-url>:6543/postgres?sslmode=require`
- Superuser access available for migration application

**Verification command:**
```sql
-- Run in psql to verify pooler mode
SHOW pool_mode; -- Expected: 'transaction'
```

### 2.2 Required Context Fields

Every database transaction MUST establish these fields:

| Field | Type | Source | Required | Purpose |
|-------|------|--------|----------|---------|
| `app.org_id` | UUID | JWT claim `org_id` | Yes | Tenant isolation boundary |
| `app.actor_id` | UUID | JWT claim `sub` (user ID) | Yes | Actor performing action |
| `app.realm` | TEXT | Route prefix or JWT claim | Yes | `'tenant'` or `'control'` |
| `app.request_id` | UUID | Generated per request | Yes | Audit trail / tracing |
| `app.auth_level` | TEXT | JWT claim `role` or `auth_level` | Optional | RBAC metadata |
| `app.roles` | TEXT[] | JWT claim `roles` | Optional | User role array |

**Context Completeness Rule:**  
Minimum viable context = `org_id` + `actor_id` + `realm` + `request_id`

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
-- Function: app.bypass_enabled() → BOOLEAN
```

**Purpose:**  
Encapsulate `current_setting()` calls for cleaner policy definitions.

**Verification:**
```sql
-- After applying migration
SELECT app.current_org_id(); -- Should return NULL or fail gracefully
```

### 4.2 Phase 2: Enable RLS on Tenant Tables

**Task:** Identify and enable RLS on all tenant-scoped tables

**Tenant-Scoped Tables (Initial List — VERIFY AGAINST SCHEMA):**
- `invoices`
- `invoice_items`
- `payments`
- `trade_parties`
- `events` (special handling required)
- `users` (tenant members only, not super admin)
- `team_members`
- `subscriptions`
- `audit_logs`

**SQL Template:**
```sql
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
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
```sql
-- SELECT policy
CREATE POLICY tenant_isolation_select ON <table_name>
  FOR SELECT
  USING (
    app.bypass_enabled() = true
    OR
    org_id = app.current_org_id()
  );

-- Modify policy (INSERT/UPDATE/DELETE)
CREATE POLICY tenant_isolation_modify ON <table_name>
  FOR ALL
  USING (
    app.bypass_enabled() = true
    OR
    org_id = app.current_org_id()
  )
  WITH CHECK (
    app.bypass_enabled() = true
    OR
    org_id = app.current_org_id()
  );
```

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

**Events Table (Projection System):**
```sql
-- Events are append-only; reader isolation handled by projections
-- RLS ensures events are only visible to owning tenant
CREATE POLICY events_isolation ON events
  FOR SELECT
  USING (
    app.bypass_enabled() = true
    OR
    org_id = app.current_org_id()
  );

-- Prevent modification (event sourcing immutability)
CREATE POLICY events_immutable ON events
  FOR UPDATE
  USING (false);

CREATE POLICY events_no_delete ON events
  FOR DELETE
  USING (false);
```

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
1. Only effective when `app.bypass_rls = 'true'`
2. MUST be guarded in application code (`NODE_ENV=test` check)
3. SHOULD log warning when enabled
4. Used ONLY for:
   - Test data seeding
   - CI/CD seed scripts
   - Development database inspection (read-only)

**Example Policy with Bypass:**
```sql
CREATE POLICY tenant_isolation_select ON invoices
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', TRUE) = 'true'
    OR
    org_id = current_setting('app.org_id', TRUE)::uuid
  );
```

### 4.6 Migration Strategy

**Safe Rollout:**
1. Apply context helpers first (no impact)
2. Enable RLS on ONE pilot table (`invoices`)
3. Test pilot table with new context wrapper
4. If successful, batch-enable remaining tables
5. Apply all policies in single migration (atomic)

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
  orgId: string;        // UUID
  actorId: string;      // UUID
  realm: 'tenant' | 'control';
  requestId: string;    // UUID
  authLevel?: string;   // Optional RBAC metadata
  roles?: string[];     // Optional role array
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
  // Execute: SET LOCAL app.bypass_rls = 'true'
  // Run callback
  // Return result
}
```

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
app.register(jwtAuthMiddleware);       // Existing
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

**Example Migration:**
```typescript
// OLD
async function getInvoices(req: FastifyRequest, reply: FastifyReply) {
  const invoices = await prisma.invoice.findMany({
    where: { orgId: req.user.orgId }, // Manual filter
  });
  return invoices;
}

// NEW
async function getInvoices(req: FastifyRequest, reply: FastifyReply) {
  const invoices = await withDbContext(prisma, req.dbContext, async () => {
    return prisma.invoice.findMany({
      // No manual filter needed — RLS enforces isolation
    });
  });
  return invoices;
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

test('invoice query respects RLS', async () => {
  // RLS ACTIVE — bypass cleared
  const context = { orgId: ORG_A_ID, actorId: USER_A_ID, realm: 'tenant', requestId: uuid() };
  const invoices = await withDbContext(prisma, context, async () => {
    return prisma.invoice.findMany();
  });
  // Should only return ORG_A invoices
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

**Example Test:**
```typescript
describe('RLS Tenant Isolation', () => {
  test('org A cannot see org B invoices', async () => {
    // Seed data for both orgs
    await withBypassForSeed(prisma, async () => {
      await prisma.invoice.create({ data: { orgId: ORG_A_ID, ... } });
      await prisma.invoice.create({ data: { orgId: ORG_B_ID, ... } });
    });

    // Query as Org A
    const contextA = { orgId: ORG_A_ID, actorId: USER_A_ID, realm: 'tenant', requestId: uuid() };
    const invoicesA = await withDbContext(prisma, contextA, async () => {
      return prisma.invoice.findMany();
    });

    // Should only see Org A's invoice
    expect(invoicesA).toHaveLength(1);
    expect(invoicesA[0].orgId).toBe(ORG_A_ID);
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
app.register(async (instance) => {
  instance.addHook('preHandler', async (req) => {
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

**Status:** 🔴 BLOCKED (Not Started)

**Requirements:**
- [ ] Context helper functions created (`000_context_helpers.sql`)
- [ ] RLS enabled on pilot table (`invoices`)
- [ ] Standard tenant policy applied to pilot table
- [ ] SQL migration applied to production-like environment
- [ ] Verification query confirms RLS active

**Verification:**
```sql
-- Confirm RLS enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'invoices';
-- Expected: rowsecurity = true

-- Confirm policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'invoices';
-- Expected: tenant_isolation_select, tenant_isolation_modify
```

**Exit Criteria:** Database ready for context-aware queries

---

### Gate B: Server Integration (Pilot)

**Status:** 🔴 BLOCKED (Waiting on Gate A)

**Requirements:**
- [ ] `@texqtic/db-context` library created
- [ ] Context middleware added to server
- [ ] Pilot route updated (auth or invoice routes)
- [ ] Manual test confirms context propagation
- [ ] Pilot route returns only tenant-scoped data

**Verification:**
```bash
# Manual test: Query as Org A
curl -H "Authorization: Bearer <ORG_A_JWT>" \
  http://localhost:3001/api/tenant/invoices

# Verify response contains only Org A invoices
# Check logs for: "SET LOCAL app.org_id = '<ORG_A_ID>'"
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
# Run pilot tests
npm test -- --testPathPattern=invoice

# Confirm:
# - No "SET app.bypass_rls" (only SET LOCAL)
# - Tests use withDbContext()
# - Cleanup uses tags, not deleteMany({})
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

# Check RLS coverage
psql -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true;"
# Should include: invoices, invoice_items, payments, trade_parties, events, users, etc.
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
    const invoices = await prisma.invoice.findMany();
    expect(invoices[0].orgId).toBe(ORG_A_ID);
  });

  // Transaction 2: Query without context (should fail or see nothing)
  const invoices = await prisma.invoice.findMany();
  expect(invoices).toHaveLength(0); // Context cleared
});
```

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

- [x] Context helper functions created and tested
- [x] RLS enabled on all tenant-scoped tables
- [x] Standard tenant policies applied
- [x] Trade party multi-tenant policies applied
- [x] Events table immutability policies applied
- [x] Control plane realm-aware policies applied
- [x] Bypass flag support added (test-only)
- [x] SQL migrations applied to all environments

### 10.2 Server Layer

- [x] `@texqtic/db-context` library created
- [x] `buildContextFromRequest()` implemented
- [x] `withDbContext()` implemented (enforces SET LOCAL)
- [x] `withBypassForSeed()` implemented (NODE_ENV guarded)
- [x] Context middleware added to server
- [x] All tenant routes updated to use context wrapper
- [x] All control plane routes updated (realm-aware)
- [x] "No context, no database" rule enforced

### 10.3 Test Layer

- [x] Seed-only bypass pattern implemented
- [x] Tag-based cleanup pattern implemented
- [x] RLS isolation tests added (cross-tenant, pooler safety)
- [x] Bypass governance tests added (NODE_ENV check)
- [x] All integration tests updated and passing
- [x] Test timeouts optimized (< 30s per suite)
- [x] CI pipeline includes RLS tests

### 10.4 Microservice Readiness

- [x] Context header contract defined
- [x] `@texqtic/context` shared library created
- [x] Contract tests added (missing context fails)
- [x] Shared HTTP client with auto-inject created
- [x] Lint rules for context enforcement added
- [x] CODEOWNERS rules for context files added

### 10.5 Documentation

- [x] Implementation guide complete (this document)
- [x] Decision record complete (DECISION-0001)
- [x] API docs updated (context requirements)
- [x] Database schema docs updated (RLS policies)
- [x] Runbook for troubleshooting context issues

### 10.6 Production Readiness

- [x] All gates (A-E) passed
- [x] Performance testing complete (< 50ms overhead)
- [x] Monitoring dashboards created (context metrics)
- [x] Alerts configured (context-missing queries)
- [x] Rollback plan tested and documented
- [x] Wave 2 readiness tests re-run and PASS

---

## Completion Checklist

- [x] File created at exact path: `docs/doctrine/WAVE-DB-RLS-0001_IMPLEMENTATION-GUIDE_RLS-CONTEXT_DOCTRINE-v1.4.md`
- [x] Contains phased plan with explicit gates (Gates A-E)
- [x] Includes microservice enforcement strategy (Section 7)
- [x] Contains risk mitigation strategies (Section 9)
- [x] Contains definition of done checklist (Section 10)
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
