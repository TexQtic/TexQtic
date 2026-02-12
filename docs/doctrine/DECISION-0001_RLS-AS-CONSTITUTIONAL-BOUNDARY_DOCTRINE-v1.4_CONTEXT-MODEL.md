# Decision 0001: RLS as Constitutional Enforcement Primitive

**Status:** ACCEPTED (Execution-Binding)  
**Date:** February 12, 2026  
**Owner:** TexQtic Doctrine Council  
**Doctrine Version:** v1.4

---

## 1. Decision Statement

TexQtic adopts **Row-Level Security (RLS) as a constitutional enforcement primitive** for multi-tenant data isolation. RLS policies shall serve as the authoritative, non-bypassable boundary that enforces organizational isolation at the database layer.

This decision is **binding across all services, microservices, and database access patterns** in the TexQtic platform.

### Key Principles

1. **RLS is Constitutional**: RLS policies are not optimization hints—they are enforcement boundaries that cannot be bypassed by application logic.
2. **Context is Mandatory**: All database queries MUST execute with proper tenant context (`org_id`, `actor_id`, `realm`).
3. **No Context, No Database**: Any database access without valid context SHALL fail at the policy layer.
4. **Pooler-Safe by Design**: Context MUST be transaction-local (`SET LOCAL`) to prevent session bleed in connection poolers.
5. **Test Mode is Governed**: Test bypass mechanisms are allowed but strictly governed and auditable.

---

## 2. Doctrine v1.4 Alignment

This decision is **fully consistent** with TexQtic Doctrine v1.4:

### Section 1.4 — Database Authority

> "Supabase Postgres is the single source of truth. Schema changes follow SQL-first workflow."

RLS policies are part of the authoritative schema. They are applied via SQL migrations and introspected by Prisma, not defined in application code.

### Section 2 — Atomic Commits & Minimal Diff

> "One prompt = one atomic commit. Make the smallest change that satisfies success criteria."

RLS enforcement enables minimal-diff implementations: developers write business logic without manual tenant filtering. RLS handles isolation automatically.

### Section 6 — Evidence Protocol

> "No claim is valid without raw terminal output."

RLS policies are testable and observable. Every query's tenant context can be logged, audited, and verified against policy enforcement.

---

## 3. Explicit Non-Goals

RLS does **NOT** attempt to:

- **Replace authorization logic**: Application-level RBAC (role-based access control) is still required for feature permissions.
- **Prevent all logic bugs**: RLS enforces tenant boundaries but does not validate business rules.
- **Serve as API-level authZ**: API middleware still validates JWTs, extracts claims, and enforces endpoint-level permissions.
- **Eliminate security testing**: RLS policies must be tested like any other critical system component.

---

## 4. The RLS Context Model (Doctrine v1.4 Compatible)

### 4.1 Context Schema

Every database transaction MUST establish context via PostgreSQL session variables:

```sql
-- Transaction-local context (pooler-safe)
SET LOCAL app.org_id = '<uuid>';
SET LOCAL app.actor_id = '<uuid>';
SET LOCAL app.realm = 'tenant'; -- or 'control'
SET LOCAL app.request_id = '<uuid>'; -- for audit trail
```

### 4.2 Context Fields

| Field            | Type | Required | Purpose                                      |
| ---------------- | ---- | -------- | -------------------------------------------- |
| `app.org_id`     | UUID | Yes      | Tenant/organization identifier               |
| `app.actor_id`   | UUID | Yes      | User/service performing the action           |
| `app.realm`      | TEXT | Yes      | Execution context: `'tenant'` or `'control'` |
| `app.request_id` | UUID | Yes      | Request correlation ID for audit             |

### 4.3 RLS Policy Template (Standard Pattern)

All tenant-scoped tables SHALL use this policy pattern:

```sql
-- Enable RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (SELECT)
CREATE POLICY tenant_isolation_select ON <table_name>
  FOR SELECT
  USING (
    org_id = current_setting('app.org_id', TRUE)::uuid
  );

-- Tenant isolation policy (INSERT/UPDATE/DELETE)
CREATE POLICY tenant_isolation_modify ON <table_name>
  FOR ALL
  USING (
    org_id = current_setting('app.org_id', TRUE)::uuid
  )
  WITH CHECK (
    org_id = current_setting('app.org_id', TRUE)::uuid
  );
```

### 4.4 Control Plane Tables (Realm-Aware)

Control plane tables (e.g., `organizations`, `system_config`) use realm-based policies:

```sql
CREATE POLICY control_plane_access ON organizations
  FOR SELECT
  USING (
    -- Control plane: see all orgs
    current_setting('app.realm', TRUE) = 'control'
    OR
    -- Tenant plane: see only own org
    (current_setting('app.realm', TRUE) = 'tenant' AND id = current_setting('app.org_id', TRUE)::uuid)
  );
```

---

## 5. Pooler Safety Rules

TexQtic uses Supabase's PgBouncer pooler in **transaction mode**. To prevent context bleed:

### Rule 1: Always Use `SET LOCAL`

```sql
-- ✅ Correct: Transaction-local (reset after commit)
SET LOCAL app.org_id = '<uuid>';

-- ❌ FORBIDDEN: Session-persistent (bleeds to pooled connections)
SET app.org_id = '<uuid>';
```

### Rule 2: Context Wrapper Enforces `SET LOCAL`

The shared `setDatabaseContext()` function MUST:

- Always use `SET LOCAL`
- Validate context completeness before setting
- Return error if context is incomplete

```typescript
export async function setDatabaseContext(
  prisma: PrismaClient,
  context: DatabaseContext
): Promise<void> {
  // Validation
  if (!context.orgId || !context.actorId || !context.realm) {
    throw new Error('Incomplete database context');
  }

  // Transaction-local context
  await prisma.$executeRaw`SET LOCAL app.org_id = ${context.orgId}::uuid`;
  await prisma.$executeRaw`SET LOCAL app.actor_id = ${context.actorId}::uuid`;
  await prisma.$executeRaw`SET LOCAL app.realm = ${context.realm}`;
  await prisma.$executeRaw`SET LOCAL app.request_id = ${context.requestId}::uuid`;
}
```

### Rule 3: Verify in Tests

Unit tests MUST verify that:

- Context is set before queries
- Context does not persist across transactions
- Missing context causes query failure

---

## 6. Testing Bypass Model (Governed)

Testing requires bypassing RLS, but this MUST be governed.

### Mode 1: Superuser Connection (Read-Only Inspection)

Prisma Migrate and introspection use `DATABASE_URL` with superuser credentials:

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<pooler-url>:6543/postgres?sslmode=require
```

**Allowed for:**

- `prisma db pull`
- `prisma generate`
- `psql -f migrations/xxx.sql`

**FORBIDDEN for:**

- Application runtime queries
- API request handling

### Mode 2: Bypass Flag (Test Environment Only)

For integration tests, allow RLS bypass via:

```sql
SET LOCAL app.bypass_rls = 'true';
```

**Governance:**

- Can ONLY be set in test database (`NODE_ENV=test`)
- MUST log warning when enabled
- MUST be gated behind environment check

```typescript
export async function setTestBypass(prisma: PrismaClient): Promise<void> {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('RLS bypass is only allowed in test environment');
  }

  console.warn('⚠️  RLS bypass enabled (test mode)');
  await prisma.$executeRaw`SET LOCAL app.bypass_rls = 'true'`;
}
```

### Mode 3: Test-Safe Policies

RLS policies SHOULD respect the bypass flag:

```sql
CREATE POLICY tenant_isolation_select ON invoices
  FOR SELECT
  USING (
    current_setting('app.bypass_rls', TRUE) = 'true'
    OR
    org_id = current_setting('app.org_id', TRUE)::uuid
  );
```

---

## 7. Microservice Safety Model

When TexQtic scales to multiple services, RLS context MUST flow across service boundaries.

### Contract: Context Header Propagation

All internal service-to-service calls MUST include:

```http
X-TexQtic-Org-ID: <uuid>
X-TexQtic-Actor-ID: <uuid>
X-TexQtic-Realm: tenant|control
X-TexQtic-Request-ID: <uuid>
```

### Shared Library: Context Extraction

Each service MUST use a shared context extractor:

```typescript
// @texqtic/context (shared package)
export function extractDatabaseContext(headers: Headers): DatabaseContext {
  return {
    orgId: headers.get('X-TexQtic-Org-ID'),
    actorId: headers.get('X-TexQtic-Actor-ID'),
    realm: headers.get('X-TexQtic-Realm') as Realm,
    requestId: headers.get('X-TexQtic-Request-ID'),
  };
}
```

### Enforcement: Pre-Query Hook

Every service MUST set context before executing Prisma queries:

```typescript
// In service route handler
const context = extractDatabaseContext(request.headers);
await setDatabaseContext(prisma, context);

// Now queries are tenant-isolated
const invoices = await prisma.invoice.findMany({
  where: { status: 'pending' },
});
```

**Critical Rule:**  
**No context, no database.** Services MUST NOT execute queries without context.

---

## 8. Implementation Checklist Summary

### 8.1 Database Layer

- [ ] Create context schema SQL file: `server/prisma/rls/000_context_schema.sql`
- [ ] Apply RLS policies to all tenant-scoped tables
- [ ] Add realm-aware policies for control plane tables
- [ ] Add bypass flag support: `app.bypass_rls`
- [ ] Test context isolation in shadow database

### 8.2 Server Layer

- [ ] Create shared context library: `server/src/lib/database-context.ts`
- [ ] Implement `setDatabaseContext()` function (always `SET LOCAL`)
- [ ] Add middleware to extract context from JWT claims
- [ ] Add pre-query hook to validate context presence
- [ ] Add test-only `setTestBypass()` function with env guard

### 8.3 Testing Layer

- [ ] Create integration test: `rls-context-isolation.test.ts`
- [ ] Verify context prevents cross-tenant data access
- [ ] Verify pooler safety (context does not bleed)
- [ ] Verify bypass flag works only in test env
- [ ] Add RLS policy tests to CI

### 8.4 Microservices (Future-Proof)

- [ ] Define context header contract in OpenAPI specs
- [ ] Create `@texqtic/context` shared package
- [ ] Add header propagation to HTTP client library
- [ ] Enforce context requirement in all services

---

## 9. Drift-Proofing

### 9.1 Constitutional Statements (Binding)

**If you bypass RLS in application code, you are violating Doctrine v1.4.**

RLS is not optional. Any code path that:

- Sets `app.bypass_rls = 'true'` outside test environment
- Uses raw SQL with `DISABLE ROW LEVEL SECURITY`
- Executes queries without context

...is **non-compliant** and MUST be rejected in code review.

### 9.2 Enforcement Mechanisms

- **Pre-commit hook**: Detect `DISABLE ROW LEVEL SECURITY` in SQL files
- **Linter rule**: Flag raw SQL queries without context wrapper
- **CI check**: Run RLS policy tests on every PR
- **Audit log**: Record all context-bypassed queries (even in test)

### 9.3 Developer Contract

**All services must use the shared context wrapper.**

If you write a new service, microservice, or background worker:

1. Import `@texqtic/context`
2. Extract context from request/job metadata
3. Call `setDatabaseContext()` before ANY Prisma query
4. **No context, no database.**

### 9.4 Failure Mode

If a service attempts to query without context:

- RLS policies SHOULD block the query (return zero rows)
- Application SHOULD log a critical error
- Monitoring SHOULD alert on context-missing queries

---

## 10. Appendix: Glossary

| Term                    | Definition                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **org_id**              | Tenant/organization UUID; primary isolation boundary                                  |
| **actor_id**            | User or service account performing the action                                         |
| **realm**               | Execution plane: `'tenant'` (customer-facing) or `'control'` (platform ops)           |
| **request_id**          | Correlation UUID for audit trail and distributed tracing                              |
| **bypass_rls**          | Test-only flag to disable RLS enforcement; MUST be gated by `NODE_ENV=test`           |
| **SET LOCAL**           | Transaction-scoped PostgreSQL variable; cleared after COMMIT (pooler-safe)            |
| **SET** (without LOCAL) | Session-scoped variable; persists across transactions (pooler-unsafe)                 |
| **RLS Policy**          | PostgreSQL row-level security rule; filters queries based on session context          |
| **Pooler**              | PgBouncer connection pooler; reuses connections across clients (requires `SET LOCAL`) |

---

## Completion Checklist

- [x] Document created at the exact path: `docs/doctrine/DECISION-0001_RLS-AS-CONSTITUTIONAL-BOUNDARY_DOCTRINE-v1.4_CONTEXT-MODEL.md`
- [x] Contains decision statement + doctrine mapping (Sections 1-2)
- [x] Contains full RLS context model + policy templates (Section 4)
- [x] Contains bypass rules + pooler-safe rules + microservice rules (Sections 5-7)
- [x] Contains drift-proofing section and enforcement mechanisms (Section 9)
- [x] Contains glossary (Section 10)
- [x] No production code changed (docs only)
- [x] No secrets added (no connection strings, passwords, or tokens)

---

**End of Document**

This decision is now binding. All future implementation work MUST align with the RLS Context Model defined herein.
