# Doctrine v1.4 Mapping Framework — Audit Report

**Date:** 2026-02-21  
**Scope:** Read-only static analysis — no code changes  
**Branch:** `main` (TexQtic/TexQtic)  
**Audit axes:** Identity & Tenancy · Data Access & RLS · Commerce Core · Workflows & Operations · Platform Architecture · AI Layer  
**Evidence protocol:** Every claim carries file path + line range or SQL artifact citation

---

## 0. Executive Summary

| Axis                      | Status                         | Critical Blockers                                                          |
| ------------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| Identity & Tenancy        | Partial                        | Dual context-variable race (app.tenant_id vs app.org_id)                   |
| Data Access & RLS         | Partial                        | Context variable mismatch means RLS may not fire on new routes             |
| Commerce Core             | Implemented (Phase-1 baseline) | Tax/fee stub; no versioned order snapshot                                  |
| Workflows & Operations    | Partial                        | Audit log + event system exists; no state machines; no Maker-Checker       |
| Platform Architecture     | Partial                        | Two `withDbContext` implementations coexist; middleware not uniform        |
| AI Layer                  | Partial                        | Budget + audit implemented; `reasoning_hash` missing; no vector/cache      |
| Doctrine Canonical Tables | **Missing**                    | organizations, traceability\_\*, certifications, trades, escrow, sanctions |

> **Most critical divergence:** `src/db/withDbContext.ts` sets `app.tenant_id`; `src/lib/database-context.ts` sets `app.org_id`. RLS policies in `rls.sql` check `app.tenant_id`. Routes migrated to the new pattern but still running against old policies = **no RLS enforcement on those routes**. This is the #1 Wave 2 blocker.

---

## 1. Doctrine Coverage Matrix

### Axis A — Identity & Tenancy

| Doctrine Ref            | Requirement                                                            | Status      | Evidence                                                                                                                           | Risk     | Wave | Notes                                                           |
| ----------------------- | ---------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ---- | --------------------------------------------------------------- |
| §1.4 + DECISION-0001 §1 | All tenant data isolated via `org_id`, enforced by RLS                 | Partial     | `server/src/lib/database-context.ts:27` (`orgId` field); `rls.sql:22-120` (`app.tenant_id`)                                        | **High** | W2   | App sets `app.org_id`; policies read `app.tenant_id` — mismatch |
| §2 (Roles & Authority)  | JWT claims: `tenantId`, `userId`, `role`                               | Implemented | `server/src/middleware/auth.ts:46-60` (`tenantAuthMiddleware`); `req.tenantId`, `req.userId`, `req.userRole` decorated             | Low      | —    | Admin path uses `adminId`+`role`                                |
| §2 (Roles & Authority)  | Admin vs tenant boundary enforced at JWT level                         | Implemented | `server/src/middleware/realmGuard.ts:18-29` (ENDPOINT_REALM_MAP); `checkRealmMismatch()` line 53+                                  | Low      | —    | Dual-JWT namespace: `tenantJwtVerify` / `adminJwtVerify`        |
| §3.1 organizations      | `organizations` table as tenant boundary container                     | **Missing** | Prisma schema uses `Tenant` model (`server/prisma/schema.prisma:12`), not `organizations`; no `org_type`, `risk_score` columns     | Med      | W3   | Functional equivalent exists; Doctrine naming divergent         |
| §2 (Membership)         | Tenant ↔ User membership model                                         | Implemented | `server/prisma/schema.prisma:93-107` (`Membership` model); `getUserMembership()` in `server/src/db/withDbContext.ts:60`            | Low      | —    | Roles: OWNER/ADMIN/MEMBER/VIEWER                                |
| §1.3 (Explicit Time)    | `created_at`, `effective_at`, `superseded_at` on all canonical records | Partial     | `server/prisma/schema.prisma` — `createdAt` present on all tables; `effective_at`/`superseded_at` **missing** from commerce tables | Med      | W3   | Only Doctrine §3-§5 tables require effective/superseded         |

---

### Axis B — Data Access & RLS

| Doctrine Ref          | Requirement                                                                 | Status        | Evidence                                                                                                                                                                                                                                                                           | Risk     | Wave |
| --------------------- | --------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---- |
| DECISION-0001 §4.1    | Context schema: `app.org_id`, `app.actor_id`, `app.realm`, `app.request_id` | Partial       | `server/src/lib/database-context.ts:130-165` — sets `app.org_id`, `app.actor_id`, `app.realm`, `app.request_id`, `app.bypass_rls`                                                                                                                                                  | **High** | W2   |
| DECISION-0001 §4.1    | RLS policies MUST read `app.org_id` (not `app.tenant_id`)                   | **Divergent** | `server/prisma/rls.sql:22` — policies check `current_setting('app.tenant_id', true)`, NOT `app.org_id`                                                                                                                                                                             | **High** | W2   |
| WAVE-DB-RLS-0001 §1.3 | All tenant-scoped tables: RLS ENABLED                                       | Partial       | `server/prisma/rls.sql:7-16` — enables RLS on: `tenant_domains`, `tenant_branding`, `memberships`, `invites`, `password_reset_tokens`, `tenant_feature_overrides`, `ai_budgets`, `ai_usage_meters`, `impersonation_sessions`, `audit_logs`, `carts`, `cart_items`, `catalog_items` | Med      | W2   |
| WAVE-DB-RLS-0001 §1.3 | `FORCE ROW LEVEL SECURITY` on all tenant tables                             | Partial       | `server/prisma/supabase_hardening.sql:62-66` — FORCE on: `tenants`, `users`, `admin_users`, `feature_flags`, `tenant_domains` only; `carts`, `orders`, `order_items`, `catalog_items` do NOT have FORCE                                                                            | **High** | W2   |
| DECISION-0001 §1      | `withDbContext` uses `SET LOCAL` (pooler-safe)                              | Partial       | New pattern `server/src/lib/database-context.ts:131` — uses `SET LOCAL ROLE texqtic_app`; old pattern `server/src/db/withDbContext.ts:15-34` — uses `SET ROLE ... RESET ROLE` (non-LOCAL)                                                                                          | Med      | W2   |
| §2 RLS Policies       | SELECT + INSERT policies minimum on each table                              | Partial       | `rls.sql` uses FOR ALL single-policy (not split SELECT/INSERT) for most tables; `carts`/`cart_items`/`catalog_items` have split policies at rls.sql:180-300                                                                                                                        | Med      | W2   |
| DECISION-0001 §2      | Admin bypass policy (`is_admin` or control-plane gate)                      | Partial       | `rls.sql:28-34` — `OR current_setting('app.is_admin', true) = 'true'`; new pattern uses `SET LOCAL ROLE texqtic_app` (NOBYPASSRLS) without is_admin bypass                                                                                                                         | **High** | W2   |
| WAVE-DB-RLS-0001      | Cross-tenant 0-row proof per table                                          | Missing       | No automated proof script confirmed running in CI; `server/prisma/verify-rls-data.ts` exists but not CI-gated                                                                                                                                                                      | Med      | W2   |
| §6 Audit §3           | `audit_logs` append-only (no UPDATE/DELETE)                                 | Implemented   | `rls.sql:143-151` — explicit UPDATE/DELETE DENY policies; `REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC` line 153                                                                                                                                                               | Low      | —    |

**Critical Finding — Context Variable Race:**

```
Route uses:              src/lib/database-context.ts  → SET LOCAL ROLE texqtic_app
                                                        → set_config('app.org_id', ...)
RLS policy checks:       rls.sql                       → current_setting('app.tenant_id', ...)

Result: app.org_id is set, app.tenant_id is empty → policy NULLIF check fails → row blocked
        OR policy falls through → no enforcement
```

This affects every route that calls `withDbContext(prisma, dbContext, ...)` from `server/src/lib/database-context.ts` while the live DB runs policies from `rls.sql`. Requires either: (a) migrate all RLS policies to read `app.org_id`, or (b) add `app.tenant_id` alias in the new `withDbContext`.

---

### Axis C — Commerce Core

| Doctrine Ref         | Requirement                                     | Status             | Evidence                                                                                                                                                      | Risk | Wave |
| -------------------- | ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- |
| Commerce / Catalog   | `catalog_items` model with active flag, pricing | Implemented        | `server/prisma/schema.prisma:320-335` — `CatalogItem`: `tenantId`, `name`, `sku`, `price (Decimal)`, `active`, `moq`                                          | Low  | —    |
| Commerce / Cart      | Cart lifecycle (create/get/add/update/remove)   | Implemented        | `server/src/routes/tenant.ts:183-668` — POST cart, GET cart, POST cart/items, PATCH cart/items/:id                                                            | Low  | —    |
| Commerce / Cart      | MOQ enforcement                                 | Implemented        | `server/src/routes/tenant.ts:345-358` — `finalQty < catalogItem.moq` guard → returns `MOQ_NOT_MET`                                                            | Low  | —    |
| Commerce / Checkout  | Cart → Order (stub payment)                     | Implemented        | `server/src/routes/tenant.ts:625-720` — `POST /tenant/checkout`; status `PAYMENT_PENDING`; atomic tx: order create + cart status `CHECKED_OUT`                | Low  | —    |
| Commerce / Orders    | Order model: status, totals                     | Implemented        | `server/prisma/schema.prisma:430-450` — `Order`: `tenantId`, `userId`, `cartId`, `status (PAYMENT_PENDING/PLACED/CANCELLED)`, `currency`, `subtotal`, `total` | Low  | —    |
| Commerce / Orders    | `order_items` with price snapshot               | Implemented        | `server/prisma/schema.prisma:410-428` — `OrderItem`: `sku`, `name`, `quantity`, `unitPrice`, `lineTotal` (denormalized snapshot)                              | Low  | —    |
| Commerce / Payment   | PAYMENT_PENDING definition                      | Implemented (stub) | `server/src/routes/tenant.ts:635` — `status: 'PAYMENT_PENDING'`; no payment gateway integrated                                                                | Low  | W2   |
| Doctrine §4 / Trade  | `trades` table (contractual commerce unit)      | **Missing**        | Not in `server/prisma/schema.prisma`                                                                                                                          | Med  | W3   |
| Doctrine §4 / Trade  | `version_id` for optimistic locking on trades   | **Missing**        | Not in schema                                                                                                                                                 | Med  | W3   |
| Doctrine §4 / Escrow | `escrow_accounts` table                         | **Missing**        | Not in schema                                                                                                                                                 | Med  | W3   |
| Commerce / Tax       | Tax/fee computation                             | Missing (stub)     | `server/src/routes/tenant.ts:631` — `const total = subtotal; // stub: no tax/fees`                                                                            | Low  | W2   |

---

### Axis D — Workflows & Operations

| Doctrine Ref        | Requirement                                             | Status         | Evidence                                                                                                                                                                                         | Risk     | Wave |
| ------------------- | ------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---- |
| §6 / Events         | Immutable events ledger (`events` table)                | Partial        | `server/prisma/schema.prisma:230-252` — `EventLog` model; `server/src/lib/events.ts:1-60` — v1 envelope contracts defined                                                                        | Med      | W2   |
| §6 / Events         | Events append-only, schema_version, reasoning_hash      | Partial        | `EventLog` schema lacks `schema_version` and `reasoning_hash` FK; `events.ts` defines `EventVersion = 'v1'` but field not in DB model                                                            | Med      | W2   |
| §7 / Audit trail    | Audit log for all significant actions                   | Implemented    | `server/src/lib/auditLog.ts:46-75` — `writeAuditLog()`; `cart.CART_CREATED`, `cart.CART_ITEM_ADDED`, `cart.CART_ITEM_REMOVED`, `cart.CART_ITEM_UPDATED`, `order.CHECKOUT_COMPLETED` all captured | Low      | —    |
| §7 / Audit trail    | Audit log for admin actions                             | Implemented    | `server/src/routes/control.ts` — `createAdminAudit()` used; `writeAuthorityIntent()` referenced                                                                                                  | Low      | —    |
| §2 / Feature Flags  | System-wide feature flags (OP_PLATFORM_READ_ONLY, etc.) | Partial        | `server/prisma/schema.prisma:263` — `FeatureFlag` + `TenantFeatureOverride` tables exist; no `OP_PLATFORM_READ_ONLY` or `OP_AI_AUTOMATION_ENABLED` seed values confirmed                         | Low      | W2   |
| §2 / Maker-Checker  | Dual-signature for irreversible events                  | **Missing**    | No `maker_id`/`checker_id` pattern in any table or route                                                                                                                                         | **High** | W3   |
| §7 / Governance     | Escalation levels + Kill-switch                         | **Missing**    | No kill-switch mechanism implemented                                                                                                                                                             | Med      | W3   |
| §7 / The Morgue     | Level 1+ failure event bundles                          | **Missing**    | No morgue implementation                                                                                                                                                                         | Med      | W4   |
| §3+§5 / Compliance  | `certifications` table                                  | **Missing**    | Not in schema                                                                                                                                                                                    | Med      | W3   |
| Admin Control Plane | Tenant management, marketplace summaries                | Implemented    | `server/src/routes/control.ts:18-100` — GET/PATCH tenants; `server/src/routes/admin-cart-summaries.ts` — marketplace summary projection                                                          | Low      | —    |
| Impersonation       | Admin → tenant impersonation sessions                   | Partial        | `server/prisma/schema.prisma:297-310` — `ImpersonationSession` model exists; no confirmed route handler found in route files scanned                                                             | Med      | W2   |
| Notifications       | Email notification system                               | Partial (stub) | `server/src/lib/emailStubs.ts` — stub functions `sendPasswordResetEmail`, `sendEmailVerificationEmail`                                                                                           | Low      | W2   |

---

### Axis E — Platform Architecture

| Doctrine Ref       | Requirement                           | Status                  | Evidence                                                                                                                                                                                                                          | Risk     | Wave |
| ------------------ | ------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---- |
| Architecture       | Route surface consistency             | **Partial / Divergent** | Three route files: `tenant.ts` (1081 lines), `control.ts` (834 lines), `auth.ts` (2078 lines), `ai.ts` (382 lines), `admin-cart-summaries.ts` (178 lines). All mount under Fastify but with mixed middleware patterns (see below) | Med      | W2   |
| Architecture       | Middleware standardization            | **Divergent**           | **Pattern A:** `[tenantAuthMiddleware, databaseContextMiddleware]` + `request.dbContext`; **Pattern B:** `tenantAuthMiddleware` only + `buildContextFromRequest(request)` inline; Both coexist in `tenant.ts`. Should be uniform  | Med      | W2   |
| Architecture       | Single `withDbContext` implementation | **Divergent**           | `src/db/withDbContext.ts` (legacy, `app_user` role, `app.tenant_id`) coexists with `src/lib/database-context.ts` (canonical, `texqtic_app` role, `app.org_id`); `control.ts:6-7` explicitly imports both                          | **High** | W2   |
| Architecture       | Response envelope consistency         | Implemented             | `server/src/utils/response.ts` — `sendSuccess`, `sendError`, `sendNotFound`, `sendValidationError`, `sendUnauthorized`, `sendForbidden` used consistently across all routes                                                       | Low      | —    |
| Architecture       | Monolith vs domain extraction         | Monolith                | All routes in single Fastify server; `server/src/index.ts` registers all routes; no service separation                                                                                                                            | Low      | W3   |
| Architecture       | Event backbone                        | Partial                 | `server/src/lib/events.ts` — event contracts + `maybeEmitEventFromAuditEntry()`; `server/src/events/projections/` — projection handlers exist; but events are co-located in monolith                                              | Med      | W3   |
| Architecture       | Observability                         | Partial                 | Fastify logger used; no structured distributed tracing; `requestId` is generated but not propagated to external tracer                                                                                                            | Med      | W3   |
| §2 / Feature Flags | Control-plane owned feature flag API  | Implemented             | `server/src/routes/control.ts` — GET/POST/PATCH feature flag endpoints                                                                                                                                                            | Low      | —    |

---

### Axis F — AI Layer

| Doctrine Ref | Requirement                                                      | Status                      | Evidence                                                                                                                                         | Risk | Wave |
| ------------ | ---------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---- | ---- |
| §8 / AI      | Tenant-scoped AI endpoints                                       | Implemented                 | `server/src/routes/ai.ts:1-382` — POST `/api/ai/insights`, POST `/api/ai/negotiation-advice`; `tenantAuthMiddleware` required                    | Low  | —    |
| §8 / AI      | Budget enforcement (hard stop)                                   | Implemented                 | `server/src/lib/aiBudget.ts` — `enforceBudgetOrThrow()`; `ai_budgets` + `ai_usage_meters` tables; `hardStop` flag                                | Low  | —    |
| §8 / AI      | AI audit trail                                                   | Implemented                 | `server/src/lib/auditLog.ts:103-170` — `createAiInsightsAudit()`, `createAiNegotiationAudit()`; writes to `audit_logs`                           | Low  | —    |
| §8 / AI      | `reasoning_hash` / explainability on AI-influenced events        | **Missing**                 | `EventLog` schema lacks `reasoning_hash` field; `audit_logs` has no reasoning pointer; `eventsAuditLog` writes but no explainability fingerprint | Med  | W3   |
| §8 / AI      | AI may advise but not autonomously execute high-stakes contracts | Implemented (advisory only) | `server/src/routes/ai.ts` — returns text advice only; no autonomous action                                                                       | Low  | —    |
| §8 / AI      | Model drift / freeze mechanism                                   | **Missing**                 | No `OP_AI_AUTOMATION_ENABLED` flag enforcement; no drift detection trigger                                                                       | Med  | W3   |
| Future / AI  | Insight caching / vector / inference separation                  | **Missing**                 | Not implemented                                                                                                                                  | Low  | W4   |
| Future / AI  | RLS + redaction for AI data access                               | Partial                     | AI routes use `withDbContext` (new pattern) — same context variable race risk applies                                                            | Med  | W2   |

---

## 2. RLS Compliance Ledger

> **Gate rule:** A table is Doctrine-compliant ONLY IF `relrowsecurity=true` AND a cross-tenant 0-row proof exists.

The following is derived from static analysis of `server/prisma/rls.sql` and `server/prisma/supabase_hardening.sql`. Live DB state requires runtime verification via `pg_class + pg_policies` queries.

### Commerce Tables

| Table                        | Tenant Key       | RLS Enabled (SQL)       | Force RLS (SQL)        | Policies Present       | Admin Bypass | Context Variable      | Cross-Tenant Proof       | Doctrine Grade     |
| ---------------------------- | ---------------- | ----------------------- | ---------------------- | ---------------------- | ------------ | --------------------- | ------------------------ | ------------------ |
| `carts`                      | `tenant_id`      | ✅ `rls.sql:204`        | ❌ Not in any SQL file | SELECT, INSERT, UPDATE | ❌ None      | `app.tenant_id` (old) | ❌ No confirmed CI proof | **Partial**        |
| `cart_items`                 | via `cart_id` FK | ✅ `rls.sql:205`        | ❌                     | SELECT, INSERT, UPDATE | ❌           | `app.tenant_id` (old) | ❌                       | **Partial**        |
| `catalog_items`              | `tenant_id`      | ✅ `rls.sql:206`        | ❌                     | SELECT only            | ❌           | `app.tenant_id` (old) | ❌                       | **Partial**        |
| `orders`                     | `tenant_id`      | ❓ Not found in rls.sql | ❌                     | ❓ Not found           | ❌           | N/A                   | ❌                       | **Unknown / Risk** |
| `order_items`                | `tenant_id`      | ❓ Not found in rls.sql | ❌                     | ❓ Not found           | ❌           | N/A                   | ❌                       | **Unknown / Risk** |
| `marketplace_cart_summaries` | `tenant_id`      | ❓ Not found in rls.sql | ❌                     | ❓ Not found           | ❌           | N/A                   | ❌                       | **Unknown**        |

### Identity / Tenancy Tables

| Table                      | Tenant Key  | RLS Enabled                                  | Force RLS                      | Policies                                                | Admin Bypass         | Grade   |
| -------------------------- | ----------- | -------------------------------------------- | ------------------------------ | ------------------------------------------------------- | -------------------- | ------- |
| `memberships`              | `tenant_id` | ✅ `rls.sql:10`                              | ❌                             | FOR ALL (tenant + admin)                                | ✅ `is_admin=true`   | Partial |
| `invites`                  | `tenant_id` | ✅ `rls.sql:11`                              | ❌                             | FOR ALL (tenant + admin)                                | ✅                   | Partial |
| `audit_logs`               | `tenant_id` | ✅ `rls.sql:16`                              | ❌                             | SELECT(tenant), INSERT(all), UPDATE(deny), DELETE(deny) | ✅ (`is_admin`) read | Partial |
| `tenant_branding`          | `tenant_id` | ✅ `rls.sql:8`                               | ❌                             | FOR ALL (tenant + admin)                                | ✅                   | Partial |
| `tenant_domains`           | `tenant_id` | ✅ `rls.sql:7` + `supabase_hardening.sql:60` | ✅ `supabase_hardening.sql:65` | deny-all + admin                                        | ✅                   | Partial |
| `tenant_feature_overrides` | `tenant_id` | ✅ `rls.sql:13`                              | ❌                             | FOR ALL (tenant + admin)                                | ✅                   | Partial |
| `ai_budgets`               | `tenant_id` | ✅ `rls.sql:14`                              | ❌                             | FOR ALL (tenant + admin)                                | ✅                   | Partial |
| `ai_usage_meters`          | `tenant_id` | ✅ `rls.sql:15`                              | ❌                             | FOR ALL (tenant + admin)                                | ✅                   | Partial |

### Platform / Control Tables

| Table                | RLS Enabled                    | Force RLS                      | Policies               | Grade        |
| -------------------- | ------------------------------ | ------------------------------ | ---------------------- | ------------ |
| `tenants`            | ✅ `supabase_hardening.sql:56` | ✅ `supabase_hardening.sql:61` | deny-all (Prisma only) | Partial      |
| `users`              | ✅ `supabase_hardening.sql:57` | ✅ `supabase_hardening.sql:62` | deny-all (Prisma only) | Partial      |
| `admin_users`        | ✅ `supabase_hardening.sql:58` | ✅ `supabase_hardening.sql:63` | deny-all (Prisma only) | Partial      |
| `feature_flags`      | ✅ `supabase_hardening.sql:59` | ✅ `supabase_hardening.sql:64` | deny-all               | Partial      |
| `_prisma_migrations` | ✅ `supabase_hardening.sql:80` | ✅ `supabase_hardening.sql:81` | deny-all               | ✅ Compliant |

### Verification SQL (run against Supabase for each table)

```sql
-- Check RLS enablement
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE relname IN (
  'carts','cart_items','catalog_items','orders','order_items',
  'memberships','audit_logs','marketplace_cart_summaries',
  'order_items','tenants','users','admin_users'
);

-- Check policies on commerce tables
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('orders','order_items','carts','cart_items','catalog_items')
ORDER BY tablename, cmd;

-- Cross-tenant 0-row proof (example for orders)
-- Set context to ACME org, query WHITELIST org data → must return 0 rows
SET LOCAL ROLE texqtic_app;
SELECT set_config('app.org_id', '<ACME_UUID>', true);
SELECT count(*) FROM orders WHERE tenant_id = '<WHITELIST_UUID>';
-- Expected: 0
```

---

## 3. Commerce Flow Trace

End-to-end sequence from auth → cart → checkout → order, using Phase-1 baseline.

```
CLIENT                    SERVER                           POSTGRES
  │                          │                                 │
  │   POST /api/auth/login   │                                 │
  │ ──────────────────────── │                                 │
  │   {email,password,       │                                 │
  │    tenantId}             │                                 │
  │                          │ ← auth.ts:73+ authRoutes        │
  │                          │   validates tenant exists       │
  │                          │ ─────────────────────────────── │
  │                          │   prisma.tenant.findUnique()    │
  │                          │   prisma.user.findUnique()      │
  │                          │   bcrypt.compare(password)      │
  │                          │   createRefreshSession()        │
  │                          │ ←─────────────────────────────  │
  │   {token, refreshToken}  │                                 │
  │ ←────────────────────── │                                 │
  │                          │                                 │
  │ GET /api/tenant/         │                                 │
  │     catalog/items        │                                 │
  │  + X-Tenant-Id header    │                                 │
  │  + Authorization: Bearer │                                 │
  │ ──────────────────────── │                                 │
  │                          │ ← tenant.ts:113                 │
  │                          │   [tenantAuthMiddleware,        │
  │                          │    databaseContextMiddleware]   │
  │                          │   tenantJwtVerify()             │
  │                          │   checkRealmMismatch()          │
  │                          │   getUserMembership()           │
  │                          │   buildContextFromRequest()     │
  │                          │ ─────────────────────────────── │
  │                          │   BEGIN TX                      │
  │                          │   SET LOCAL ROLE texqtic_app    │
  │                          │   set_config('app.org_id',      │
  │                          │     tenantId, true)             │
  │                          │   catalogItem.findMany(         │
  │                          │     {active:true, cursor?})     │
  │                          │   → RLS: catalog_items policy   │
  │                          │     checks app.tenant_id(!) ⚠️  │
  │                          │   COMMIT                        │
  │                          │ ←─────────────────────────────  │
  │   {items[], nextCursor}  │                                 │
  │ ←────────────────────── │                                 │
  │                          │                                 │
  │ POST /api/tenant/cart    │                                 │
  │ ──────────────────────── │                                 │
  │                          │ ← tenant.ts:183                 │
  │                          │   tenantAuthMiddleware          │
  │                          │   buildContextFromRequest()     │
  │                          │   (inline — no middleware)      │
  │                          │ ─────────────────────────────── │
  │                          │   BEGIN TX                      │
  │                          │   SET LOCAL ROLE texqtic_app    │
  │                          │   set_config('app.org_id',...)  │
  │                          │   cart.findFirst/create()       │
  │                          │   writeAuditLog()               │
  │                          │   COMMIT                        │
  │                          │ ←─────────────────────────────  │
  │   {cart: {...}}          │                                 │
  │ ←────────────────────── │                                 │
  │                          │                                 │
  │ POST /api/tenant/        │                                 │
  │     cart/items           │                                 │
  │  {catalogItemId, qty}    │                                 │
  │ ──────────────────────── │                                 │
  │                          │ ← tenant.ts:311                 │
  │                          │   tenantAuthMiddleware          │
  │                          │   Zod body validation           │
  │                          │   buildContextFromRequest()     │
  │                          │ ─────────────────────────────── │
  │                          │   BEGIN TX                      │
  │                          │   catalogItem.findUnique()      │
  │                          │   MOQ check (finalQty ≥ moq)   │
  │                          │   cartItem.findUnique +         │
  │                          │     upsert                      │
  │                          │   writeAuditLog(                │
  │                          │     'cart.CART_ITEM_ADDED')     │
  │                          │   COMMIT                        │
  │                          │ ←─────────────────────────────  │
  │   {cartItem: {...}} 201  │                                 │
  │ ←────────────────────── │                                 │
  │                          │                                 │
  │ POST /api/tenant/        │                                 │
  │     checkout             │                                 │
  │ ──────────────────────── │                                 │
  │                          │ ← tenant.ts:621                 │
  │                          │   tenantAuthMiddleware          │
  │                          │   buildContextFromRequest()     │
  │                          │ ─────────────────────────────── │
  │                          │   BEGIN TX (atomic)             │
  │                          │   cart.findFirst(ACTIVE)        │
  │                          │   order.create(                 │
  │                          │     PAYMENT_PENDING,items)      │
  │                          │   cart.update(CHECKED_OUT)      │
  │                          │   writeAuditLog(                │
  │                          │     'order.CHECKOUT_COMPLETED') │
  │                          │   COMMIT                        │
  │                          │ ←─────────────────────────────  │
  │   {orderId, status,      │                                 │
  │    subtotal, total} 201  │                                 │
  │ ←────────────────────── │                                 │
  │                          │                                 │
  │ GET /api/tenant/orders   │                                 │
  │ ──────────────────────── │                                 │
  │                          │ ← tenant.ts:731                 │
  │                          │   tenantAuthMiddleware          │
  │                          │   buildContextFromRequest()     │
  │                          │ ─────────────────────────────── │
  │                          │   BEGIN TX                      │
  │                          │   order.findMany(               │
  │                          │     {userId,include:items})     │
  │                          │   → RLS enforces tenant boundary│
  │                          │   COMMIT                        │
  │                          │ ←─────────────────────────────  │
  │   {orders[], count}      │                                 │
  │ ←────────────────────── │                                 │
  │                          │                                 │
  │ GET /api/tenant/         │                                 │
  │     orders/:id           │                                 │
  │ ──────────────────────── │                                 │
  │                          │ ← tenant.ts:748                 │
  │                          │   Zod params validation         │
  │                          │   withDbContext → order.        │
  │                          │     findUnique(id,items)        │
  │                          │   404 if null                   │
  │                          │ ←─────────────────────────────  │
  │   {order: {...}}         │                                 │
  │ ←────────────────────── │                                 │
  │                          │                                 │
  │ GET /api/tenant/cart     │   (cross-tenant attempt)        │
  │   + WRONG tenant JWT     │                                 │
  │ ──────────────────────── │                                 │
  │                          │ ← tenantAuthMiddleware          │
  │                          │   checkRealmMismatch() ✅       │
  │                          │   if JWT tenantId ≠ endpoint   │
  │                          │   realm → 403 WRONG_REALM      │
  │   403 WRONG_REALM        │                                 │
  │ ←────────────────────── │                                 │
```

### Flow Table Summary

| Step                 | Route                            | File                                  | Lines   | Middleware Chain                                    | DB Method                                            | Tables Touched                                       | Audit Event                      |
| -------------------- | -------------------------------- | ------------------------------------- | ------- | --------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------- |
| 1 Auth               | POST /api/auth/login             | `server/src/routes/auth.ts`           | 73-200  | None                                                | `prisma.tenant.findUnique`, `prisma.user.findUnique` | `tenants`, `users`, `refresh_tokens`                 | `auth.LOGIN_SUCCESS`             |
| 2 Catalog            | GET /api/tenant/catalog/items    | `server/src/routes/tenant.ts`         | 113-185 | `tenantAuthMiddleware`, `databaseContextMiddleware` | `withDbContext (lib)`                                | `catalog_items`                                      | None                             |
| 3 Cart Create        | POST /api/tenant/cart            | `server/src/routes/tenant.ts`         | 183-254 | `tenantAuthMiddleware`                              | `withDbContext (lib)` inline                         | `carts`                                              | `cart.CART_CREATED`              |
| 4 Cart Add Item      | POST /api/tenant/cart/items      | `server/src/routes/tenant.ts`         | 311-455 | `tenantAuthMiddleware`                              | `withDbContext (lib)` inline                         | `catalog_items`, `carts`, `cart_items`, `audit_logs` | `cart.CART_ITEM_ADDED`           |
| 5 Cart Update        | PATCH /api/tenant/cart/items/:id | `server/src/routes/tenant.ts`         | 480-625 | `tenantAuthMiddleware`                              | `withDbContext (lib)` inline                         | `cart_items`, `carts`, `audit_logs`                  | `cart.CART_ITEM_UPDATED/REMOVED` |
| 6 Checkout           | POST /api/tenant/checkout        | `server/src/routes/tenant.ts`         | 621-730 | `tenantAuthMiddleware`                              | `withDbContext (lib)` inline                         | `carts`, `orders`, `order_items`, `audit_logs`       | `order.CHECKOUT_COMPLETED`       |
| 7 Orders List        | GET /api/tenant/orders           | `server/src/routes/tenant.ts`         | 731-748 | `tenantAuthMiddleware`                              | `withDbContext (lib)` inline                         | `orders`, `order_items`                              | None                             |
| 8 Order Get          | GET /api/tenant/orders/:id       | `server/src/routes/tenant.ts`         | 748-770 | `tenantAuthMiddleware`                              | `withDbContext (lib)` inline                         | `orders`, `order_items`                              | None                             |
| 9 Cross-tenant guard | Any tenant route                 | `server/src/middleware/realmGuard.ts` | 53-100  | `checkRealmMismatch()`                              | N/A                                                  | N/A                                                  | 403 returned                     |

---

## 4. Domain Boundary Map

### Current State: Monolith

All user-facing routes live in a single Fastify process (`server/src/index.ts`). Route files partition by concern but share a single database connection pool and process.

| Domain                          | Classification                     | Route Entrypoint(s)                           | Internal Service/Module                      | Shared Tables                                                      | Extraction Risk                                  |
| ------------------------------- | ---------------------------------- | --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Auth**                        | Domain exists (monolith-bound)     | `server/src/routes/auth.ts`                   | `authTokens.ts`, `emailStubs.ts`             | `users`, `memberships`, `refresh_tokens`, `password_reset_tokens`  | Med — JWT signing is realm-coupled               |
| **Commerce**                    | Domain exists (monolith-bound)     | `server/src/routes/tenant.ts:113-770`         | None (all inline)                            | `catalog_items`, `carts`, `cart_items`, `orders`, `order_items`    | Med — shared RLS context                         |
| **Control Plane / Admin**       | Domain exists (partially coupled)  | `server/src/routes/control.ts`                | `auditLog.ts` (shared)                       | `tenants`, `audit_logs`, `feature_flags`, `impersonation_sessions` | Low — already separate route file + admin JWT    |
| **Operations / Audit**          | Domain exists (coupled)            | `server/src/lib/auditLog.ts` (lib, not route) | `events.ts`, `projections/`                  | `audit_logs`, `event_logs`                                         | Med — tightly coupled to tx context              |
| **AI**                          | Domain exists (monolith-bound)     | `server/src/routes/ai.ts`                     | `aiBudget.ts`, `geminiService.ts`            | `ai_budgets`, `ai_usage_meters`, `audit_logs`                      | Low — Gemini is external; budget state is simple |
| **Marketplace Projections**     | Domain exists (partially isolated) | `server/src/routes/admin-cart-summaries.ts`   | Projection handlers in `events/projections/` | `marketplace_cart_summaries`                                       | Low — read-only projection, no write coupling    |
| **Traceability / Supply Chain** | **Missing**                        | None                                          | None                                         | None                                                               | N/A                                              |
| **Trade / Finance**             | **Missing**                        | None                                          | None                                         | None                                                               | N/A                                              |
| **Seller**                      | **Missing**                        | None                                          | None                                         | None                                                               | N/A                                              |

### Domain Extraction Readiness

```
READY FOR W3 EXTRACTION (low coupling surface):
  ├─ AI domain          → single Gemini client, budget tables, no shared writes
  ├─ Marketplace feeds  → projection-only, admin-read, no write coupling
  └─ Control Plane      → isolated admin JWT, separate route plugin

REQUIRES STABILIZATION FIRST (W2):
  ├─ Commerce           → RLS context variable must be unified before safe extraction
  └─ Auth               → JWT signing namespace must be fully documented

NOT YET IMPLEMENTED (W3+):
  ├─ Traceability
  ├─ Trade / Finance
  └─ Seller
```

---

## 5. Gap Register — Wave Assignment

| #     | Gap                                                                                                                                                                  | Doctrine Ref          | Type           | Wave   | PR-Size                                     | Risk                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | -------------- | ------ | ------------------------------------------- | --------------------------- |
| G-001 | **CRITICAL: RLS policies check `app.tenant_id`; new routes set `app.org_id`** — policies don't fire                                                                  | DECISION-0001 §4.1    | Divergent      | **W2** | S (SQL migration)                           | 🔴 High                     |
| G-002 | `FORCE ROW LEVEL SECURITY` missing on `carts`, `orders`, `order_items`, `catalog_items`, `cart_items`                                                                | WAVE-DB-RLS-0001      | Missing        | **W2** | XS (SQL ALTER)                              | 🔴 High                     |
| G-003 | `orders` and `order_items` RLS policies appear absent from all SQL files                                                                                             | DECISION-0001 §1      | Missing        | **W2** | S (SQL CREATE POLICY)                       | 🔴 High                     |
| G-004 | Two `withDbContext` implementations coexist; `control.ts` imports both                                                                                               | Architecture §E       | Divergent      | **W2** | M (refactor control.ts to new pattern)      | 🟠 Med                      |
| G-005 | Middleware pattern inconsistent: some routes use `databaseContextMiddleware`; others build context inline                                                            | Architecture §E       | Partial        | **W2** | M (standardize to one pattern)              | 🟠 Med                      |
| G-006 | `admin bypass` pattern differs: old uses `app.is_admin=true`; new has no admin bypass in policy expressions                                                          | RLS §2                | Divergent      | **W2** | S (align admin bypass to new context model) | 🟠 Med                      |
| G-007 | `supabase_hardening.sql` uses `set_config(..., false)` (session-global); `database-context.ts` uses `true` (transaction-local) — pooler bleed risk in hardening file | DECISION-0001 §1.4    | Divergent      | **W2** | XS (change false → true in hardening SQL)   | 🟠 Med                      |
| G-008 | `EventLog` schema missing `schema_version` and `reasoning_hash` FK                                                                                                   | §6 Events             | Missing        | **W2** | S (Prisma migration + SQL)                  | 🟡 Low                      |
| G-009 | `OP_PLATFORM_READ_ONLY`, `OP_AI_AUTOMATION_ENABLED` feature flag seeds absent                                                                                        | §2 Feature Flags      | Missing        | **W2** | XS (seed script)                            | 🟡 Low                      |
| G-010 | Tax/fee computation is a stub                                                                                                                                        | Commerce §D           | Missing (stub) | **W2** | M (calculation logic + new fields)          | 🟡 Low                      |
| G-011 | Impersonation session route not found in scanned route files                                                                                                         | §D Admin              | Partial        | **W2** | S (add impersonation routes)                | 🟡 Low                      |
| G-012 | Email notifications are stubs (`emailStubs.ts`) — no real delivery                                                                                                   | §D Notifications      | Partial        | **W2** | M (integrate provider)                      | 🟡 Low                      |
| G-013 | CI cross-tenant 0-row proof not automated                                                                                                                            | RLS Gate Rule         | Missing        | **W2** | S (add to test suite)                       | 🟠 Med                      |
| G-014 | `tenant/activate` POST bypasses `databaseContextMiddleware` and builds nested `tx.$transaction` inside `withDbContext` (double-transaction nesting)                  | Architecture          | Divergent      | **W2** | S (refactor to single tx)                   | 🟠 Med                      |
| G-015 | `organizations` table (Doctrine §3.1) vs implementation `tenants` — naming divergence; missing `org_type`, `risk_score`, `status=banned` invariant                   | §3.1                  | Divergent      | **W3** | L (schema + migration)                      | 🟡 Low                      |
| G-016 | `traceability_nodes` and `traceability_edges` tables — MISSING                                                                                                       | §3.2, §3.3            | Missing        | **W3** | XL                                          | 🟡 Low                      |
| G-017 | `trades` table — MISSING                                                                                                                                             | §4.1                  | Missing        | **W3** | XL                                          | 🟡 Low                      |
| G-018 | `escrow_accounts` table — MISSING                                                                                                                                    | §4.2                  | Missing        | **W3** | XL                                          | 🟡 Low                      |
| G-019 | `certifications` table — MISSING                                                                                                                                     | §5.1                  | Missing        | **W3** | L                                           | 🟡 Low                      |
| G-020 | State machine transition tables (trade, escrow, certification lifecycle) — MISSING                                                                                   | PASS2 Ticket 2.1      | Missing        | **W3** | XL                                          | 🟡 Low                      |
| G-021 | Maker-Checker dual-signature enforcement — MISSING                                                                                                                   | §2 + PASS2 Ticket 2.2 | Missing        | **W3** | XL                                          | 🟠 Med (future high-stakes) |
| G-022 | Escalation levels + Kill-switch mechanism — MISSING                                                                                                                  | §7                    | Missing        | **W3** | L                                           | 🟡 Low                      |
| G-023 | `reasoning_hash` / `reasoning_logs` FK for AI events — MISSING                                                                                                       | §8 AI                 | Missing        | **W3** | M                                           | 🟡 Low                      |
| G-024 | `sanctions` table — MISSING                                                                                                                                          | Doctrine §2 implied   | Missing        | **W3** | M                                           | 🟡 Low                      |
| G-025 | DPP snapshot views (`dpp_product_passport`) — MISSING                                                                                                                | §9 + PASS3 Ticket 3.1 | Missing        | **W4** | XL                                          | 🟡 Low                      |
| G-026 | Custom domain routing / tenant resolution (white-label) — stub only                                                                                                  | §W4                   | Partial        | **W4** | L                                           | 🟡 Low                      |
| G-027 | The Morgue (Level 1+ failure event bundles) — MISSING                                                                                                                | §7                    | Missing        | **W4** | L                                           | 🟡 Low                      |
| G-028 | Insight caching / vector store / inference separation for AI                                                                                                         | §8 AI future          | Missing        | **W4** | XL                                          | 🟡 Low                      |

---

## 6. Governance Addendum — Tenant Table Migration Standard (Codified)

As observed from Phase-1 RLS validation on `orders`/`order_items`, the following is hereby Doctrine law for all new tenant-scoped tables:

```sql
-- STEP 1: Enable RLS
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

-- STEP 2: Force RLS (prevents BYPASSRLS superuser bypass)
ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;

-- STEP 3: SELECT policy (new context model — app.org_id)
CREATE POLICY "<table>_tenant_select"
ON public.<table>
FOR SELECT
USING (
  current_setting('app.org_id', true) IS NOT NULL
  AND tenant_id = current_setting('app.org_id', true)::uuid
);

-- STEP 4: INSERT policy
CREATE POLICY "<table>_tenant_insert"
ON public.<table>
FOR INSERT
WITH CHECK (
  current_setting('app.org_id', true) IS NOT NULL
  AND tenant_id = current_setting('app.org_id', true)::uuid
);

-- STEP 5: UPDATE policy (optional if table is immutable)
CREATE POLICY "<table>_tenant_update"
ON public.<table>
FOR UPDATE
USING (tenant_id = current_setting('app.org_id', true)::uuid)
WITH CHECK (tenant_id = current_setting('app.org_id', true)::uuid);

-- STEP 6: GRANTs to app role
GRANT SELECT, INSERT, UPDATE ON TABLE public.<table> TO texqtic_app;

-- STEP 7: Cross-tenant 0-row proof (RUN BEFORE MARKING COMPLIANT)
-- In psql session:
SET LOCAL ROLE texqtic_app;
SELECT set_config('app.org_id', '<TENANT_A_UUID>', true);
SELECT count(*) FROM <table> WHERE tenant_id = '<TENANT_B_UUID>';
-- MUST return: 0
```

**Compliance gate:** No table may be marked "Doctrine-compliant" until this checklist passes:

- [ ] `relrowsecurity = true` confirmed via `pg_class`
- [ ] `relforcerowsecurity = true` confirmed via `pg_class`
- [ ] SELECT + INSERT policies confirmed via `pg_policies`
- [ ] Context variable is `app.org_id` (NOT `app.tenant_id`)
- [ ] Cross-tenant 0-row query returns 0
- [ ] GRANT to `texqtic_app` confirmed via `\dp <table>`

---

## 7. Immediate Action Priorities (Wave 2 Critical Path)

These gaps block Wave 2 readiness tests being meaningful. They must be resolved first, in order:

```
Priority 1 (RLS Constitutional Fix):
  G-001 → Migrate all RLS policies from app.tenant_id → app.org_id
  G-002 → Add FORCE ROW LEVEL SECURITY to commerce tables
  G-003 → Add RLS policies for orders + order_items
  G-013 → Add cross-tenant 0-row CI proof

Priority 2 (Middleware Architecture):
  G-004 → Remove withDbContextLegacy; unify control.ts to new pattern
  G-005 → Standardize middleware: ALL routes use databaseContextMiddleware
  G-006 → Align admin bypass to new pattern (control-plane realm check)
  G-007 → Fix supabase_hardening.sql set_config(..., false) → true

Priority 3 (Schema + Data Hygiene):
  G-008 → Add schema_version + reasoning_hash to EventLog
  G-009 → Seed OP_ feature flags
  G-014 → Fix nested transaction in /tenant/activate
```

---

_End of Doctrine v1.4 Mapping Audit — 2026-02-21_  
_Read-only static analysis. No code was modified during production of this document._  
_Evidence pointers are file path + line range or SQL artifact citation as required by audit protocol._
