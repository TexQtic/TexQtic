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
- **Enforce Maker-Checker workflows**: RLS protects organizational boundaries ("which tenant"). Maker-Checker enforces process rules ("which approver"). Both are required; neither replaces the other.

**Clarification: RLS vs. Maker-Checker**

RLS answers: **"Can Org A access this resource?"** (boundary enforcement)  
Maker-Checker answers: **"Can User X approve this action?"** (process enforcement)

**Example:**

- RLS ensures Org A cannot see Org B's escrow accounts
- Maker-Checker ensures two Org A users must co-sign before funds release

RLS is the **constitutional layer** protecting tenant isolation.  
Maker-Checker is the **procedural layer** enforcing dual-signature governance.

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

| Field            | Type   | Required | Purpose                                                    |
| ---------------- | ------ | -------- | ---------------------------------------------------------- |
| `app.org_id`     | UUID   | Yes      | Tenant/organization identifier                             |
| `app.actor_id`   | UUID   | Yes      | User/service performing the action                         |
| `app.realm`      | TEXT   | Yes      | Execution context: `'tenant'` or `'control'`               |
| `app.request_id` | UUID   | Yes      | Request correlation ID for audit                           |
| `app.roles`      | TEXT[] | Optional | User role array (PostgreSQL TEXT[] type — NOT CSV or JSON) |

### 4.3 RLS Policy Template (Standard Pattern)

All tenant-scoped tables SHALL use this policy pattern:

```sql
-- Enable RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- Context helper function (fail-closed enforcement)
CREATE OR REPLACE FUNCTION app.require_org_id()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  org_id uuid;
BEGIN
  org_id := current_setting('app.org_id', TRUE)::uuid;
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'Missing required context: app.org_id';
  END IF;
  RETURN org_id;
END;
$$;

-- Tenant isolation policy (SELECT) — FAIL-CLOSED
CREATE POLICY tenant_isolation_select ON <table_name>
  FOR SELECT
  USING (
    org_id = app.require_org_id()
  );

-- Tenant isolation policy (INSERT/UPDATE/DELETE) — FAIL-CLOSED
CREATE POLICY tenant_isolation_modify ON <table_name>
  FOR ALL
  USING (
    org_id = app.require_org_id()
  )
  WITH CHECK (
    org_id = app.require_org_id()
  );
```

**Critical Design Decision: Fail-Closed, Not Fail-Open**

Policies MUST use `app.require_org_id()` which **throws an error** if context is missing.  
**DO NOT** silently return zero rows — that masks systemic failure and creates regulatory risk.

### 4.4 Events Table (Immutable Legal Ledger)

**Special Status:** Events are the canonical legal record. RLS must protect event integrity while supporting multiple read patterns.

**Event Types & Isolation:**

1. **Tenant-Scoped Events** (invoices, payments, trade parties)  
   Visible only to owning tenant

2. **Governance-Level Events** (maker-checker approvals, overrides)  
   Visible to control plane AND owning tenant

3. **Service-Level Events** (projection updates, saga steps)  
   Internal events; control plane visibility

4. **Regulator Read-Only Access**  
   Realm-based read access for compliance queries

**Policy Implementation:**

```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Read isolation: Tenant-scoped OR control plane
CREATE POLICY events_read_isolation ON events
  FOR SELECT
  USING (
    -- Control plane: see all events
    current_setting('app.realm', TRUE) = 'control'
    OR
    -- Tenant plane: see only own events (fail-closed)
    (current_setting('app.realm', TRUE) = 'tenant' AND org_id = app.require_org_id())
  );

-- Write isolation: Services MUST set context
CREATE POLICY events_write_isolation ON events
  FOR INSERT
  WITH CHECK (
    -- Enforce context presence
    org_id = app.require_org_id()
    AND
    -- Enforce actor tracking
    actor_id = current_setting('app.actor_id', TRUE)::uuid
  );

-- Immutability: Events are append-only (event sourcing)
CREATE POLICY events_immutable ON events
  FOR UPDATE
  USING (false); -- No updates allowed

CREATE POLICY events_no_delete ON events
  FOR DELETE
  USING (false); -- No deletes allowed
```

**Maker-Checker Integration:**

RLS enforces **organizational boundary** (which tenant's events).  
Maker-Checker enforces **process rules** (who can approve/override).

These are orthogonal concerns:

- RLS = "Can Org A see this event?" (boundary)
- Maker-Checker = "Can User X approve this action?" (process)

Both MUST be enforced; neither replaces the other.

### 4.5 Control Plane Tables (Realm-Aware)

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

**CRITICAL: Database Role Restriction**

The production application database role (`app_user`) **MUST NOT** have permission to set `app.bypass_rls`.

**Role-Based Enforcement:**

```sql
-- Production role (CANNOT bypass RLS)
CREATE ROLE app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
REVOKE SET ON PARAMETER app.bypass_rls FROM app_user; -- Explicit denial

-- Test role (CAN bypass RLS for seeding)
CREATE ROLE test_user;
GRANT app_user TO test_user; -- Inherits base permissions
GRANT SET ON PARAMETER app.bypass_rls TO test_user; -- Explicit grant

-- Migration role (superuser for schema changes only)
CREATE ROLE migration_user WITH SUPERUSER;
```

**Why This Matters:**

Without role-based restriction, a SQL injection vulnerability becomes a **full RLS bypass**.  
By revoking `SET` permission on `app.bypass_rls`, injection cannot disable RLS policies.

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

### 9.4 Failure Mode (Fail-Closed Enforcement)

If a service attempts to query without context:

- RLS policies **MUST throw an error** (via `app.require_org_id()`)
- Application **MUST NOT** silently return zero rows (masks systemic failure)
- Monitoring **MUST** alert on context-missing errors
- Incident response **MUST** investigate root cause (missing middleware, bypass attempt)

**Why Fail-Closed:**

Returning zero rows creates **false confidence**.  
Operators assume "no data" when the real issue is "broken context propagation".

In regulated environments, this is catastrophic:

- Regulator export shows zero invoices → Audit failure
- Compliance query returns empty set → Missed obligation
- Background job silently skips all orgs → Data loss

**Fail hard, fail visible, fail early.**

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
