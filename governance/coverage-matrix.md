# TEXQTIC — DOCTRINE COVERAGE MATRIX

> **⚠ HISTORICAL SNAPSHOT — NOT CURRENT PLATFORM COVERAGE**
>
> | Field | Value |
> |---|---|
> | Status | Historical Snapshot |
> | Snapshot Date | 2026-02-21 |
> | Program State at Snapshot | Wave-2 Entry |
> | Recorded By | GOVERNANCE-SYNC-095 baseline |
>
> This matrix reflects platform coverage at the **start of Wave 2 (2026-02-21)**.
> Many items marked `❌ Missing` or `🔴 Critical` have since been implemented during Waves 3 and 4.
> Do **not** use this document to assess current platform state.
>
> **For current coverage status refer to:**
> - `governance/gap-register.md` — authoritative gap-by-gap status with commit evidence
> - `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` — Wave 0–5 implementation tracker
> - Pre-Wave-5 Governance Audit Report (Section 4D) — documents specific drift examples

Last Updated: 2026-02-21
Branch: main
Doctrine Version: v1.4

---

## Status Legend

- ✅ Implemented
- ⚠ Partial
- ❌ Missing
- 🚫 Divergent
- 🔴 Critical

---

# AXIS A — Identity & Tenancy

| Doctrine Ref            | Requirement                                                            | Status         | Evidence (File + Lines)                                                                                          | Gap ID | Notes                                                           |
| ----------------------- | ---------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| §1.4 + DECISION-0001 §1 | All tenant data isolated via `org_id`, enforced by RLS                 | ⚠ Partial      | `server/src/lib/database-context.ts:27`; `rls.sql:22-120`                                                        | G-001  | App sets `app.org_id`; policies read `app.tenant_id` — mismatch |
| §2 (Roles & Authority)  | JWT claims: `tenantId`, `userId`, `role`                               | ✅ Implemented | `server/src/middleware/auth.ts:46-60`                                                                            | —      | Admin path uses `adminId`+`role`                                |
| §2 (Roles & Authority)  | Admin vs tenant boundary enforced at JWT level                         | ✅ Implemented | `server/src/middleware/realmGuard.ts:18-29`                                                                      | —      | Dual-JWT namespace: `tenantJwtVerify` / `adminJwtVerify`        |
| §3.1 organizations      | `organizations` table as tenant boundary container                     | ❌ Missing     | `server/prisma/schema.prisma:12` — uses `Tenant`, not `organizations`                                            | G-015  | Functional equivalent exists; Doctrine naming divergent         |
| §2 (Membership)         | Tenant ↔ User membership model                                         | ✅ Implemented | `server/prisma/schema.prisma:93-107`; `server/src/db/withDbContext.ts:60`                                        | —      | Roles: OWNER/ADMIN/MEMBER/VIEWER                                |
| §1.3 (Explicit Time)    | `created_at`, `effective_at`, `superseded_at` on all canonical records | ⚠ Partial      | `server/prisma/schema.prisma` — `createdAt` present; `effective_at`/`superseded_at` missing from commerce tables | —      | Only Doctrine §3-§5 tables require effective/superseded         |

---

# AXIS B — Data Access & RLS

| Requirement                                                                 | Status         | RLS Enabled       | FORCE | Policies Present                 | Proof (0-row test) | Gap ID | Notes                                                           |
| --------------------------------------------------------------------------- | -------------- | ----------------- | ----- | -------------------------------- | ------------------ | ------ | --------------------------------------------------------------- |
| Context schema: `app.org_id`, `app.actor_id`, `app.realm`, `app.request_id` | ⚠ Partial      | —                 | —     | —                                | —                  | G-001  | New routes set `app.org_id`; old policies check `app.tenant_id` |
| RLS policies MUST read `app.org_id`                                         | 🚫 Divergent   | —                 | —     | —                                | —                  | G-001  | `rls.sql:22` checks `app.tenant_id`                             |
| `carts`                                                                     | ⚠ Partial      | ✅ `rls.sql:204`  | ❌    | SELECT, INSERT, UPDATE           | ❌                 | G-002  | Wrong context variable                                          |
| `cart_items`                                                                | ⚠ Partial      | ✅ `rls.sql:205`  | ❌    | SELECT, INSERT, UPDATE           | ❌                 | G-002  | Via `cart_id` FK                                                |
| `catalog_items`                                                             | ⚠ Partial      | ✅ `rls.sql:206`  | ❌    | SELECT only                      | ❌                 | G-002  | Wrong context variable                                          |
| `orders`                                                                    | 🔴 Critical    | ❓ Not in rls.sql | ❌    | ❓ Not found                     | ❌                 | G-003  | Unknown / Risk                                                  |
| `order_items`                                                               | 🔴 Critical    | ❓ Not in rls.sql | ❌    | ❓ Not found                     | ❌                 | G-003  | Unknown / Risk                                                  |
| `marketplace_cart_summaries`                                                | ⚠ Partial      | ❓ Not in rls.sql | ❌    | ❓ Not found                     | ❌                 | —      | Unknown                                                         |
| `memberships`                                                               | ⚠ Partial      | ✅ `rls.sql:10`   | ❌    | FOR ALL (tenant + admin)         | ❌                 | —      | Admin bypass via `is_admin=true`                                |
| `audit_logs`                                                                | ✅ Implemented | ✅ `rls.sql:16`   | ❌    | SELECT/INSERT/DENY UPDATE+DELETE | ❌                 | —      | Append-only enforced                                            |
| `withDbContext` uses `SET LOCAL` (pooler-safe)                              | ⚠ Partial      | —                 | —     | —                                | —                  | G-007  | New pattern uses LOCAL; old pattern uses RESET ROLE             |
| Cross-tenant 0-row proof per table                                          | ❌ Missing     | —                 | —     | —                                | ❌                 | G-013  | `verify-rls-data.ts` exists but not CI-gated                    |

---

# AXIS C — Commerce Core

| Requirement                                     | Status            | Evidence                                                   | Gap ID | Notes                                                         |
| ----------------------------------------------- | ----------------- | ---------------------------------------------------------- | ------ | ------------------------------------------------------------- |
| `catalog_items` model with active flag, pricing | ✅ Implemented    | `server/prisma/schema.prisma:320-335`                      | —      | `tenantId`, `name`, `sku`, `price (Decimal)`, `active`, `moq` |
| Cart lifecycle (create/get/add/update/remove)   | ✅ Implemented    | `server/src/routes/tenant.ts:183-668`                      | —      | POST cart, GET cart, POST cart/items, PATCH cart/items/:id    |
| MOQ enforcement                                 | ✅ Implemented    | `server/src/routes/tenant.ts:345-358`                      | —      | Returns `MOQ_NOT_MET` 422                                     |
| Cart → Order (stub payment)                     | ✅ Implemented    | `server/src/routes/tenant.ts:625-720`                      | —      | `PAYMENT_PENDING`; atomic tx                                  |
| Order model: status, totals                     | ✅ Implemented    | `server/prisma/schema.prisma:430-450`                      | —      | `PAYMENT_PENDING/PLACED/CANCELLED`                            |
| `order_items` with price snapshot               | ✅ Implemented    | `server/prisma/schema.prisma:410-428`                      | —      | `sku`, `name`, `unitPrice`, `lineTotal`                       |
| PAYMENT_PENDING definition                      | ⚠ Partial (stub)  | `server/src/routes/tenant.ts:635`                          | —      | No payment gateway                                            |
| `trades` table                                  | ❌ Missing        | Not in schema                                              | G-017  | W3                                                            |
| `version_id` optimistic locking                 | ❌ Missing        | Not in schema                                              | G-017  | W3                                                            |
| `escrow_accounts` table                         | ❌ Missing        | Not in schema                                              | G-018  | W3                                                            |
| Tax/fee computation                             | ✅ Implemented    | `server/src/services/pricing/totals.service.ts` — Phase-1: tax=0, fee=0, discount=0; deterministic `round2()` | G-010  | W2 VALIDATED `39f0720`                                        |

---

# AXIS D — Workflows & Operations

| Requirement                                | Status           | Evidence                                                                                     | Gap ID | Notes                             |
| ------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------- | ------ | --------------------------------- |
| Immutable events ledger (`events` table)   | ⚠ Partial        | `server/prisma/schema.prisma:230-252`; `server/src/lib/events.ts:1-60`                       | G-008  | v1 envelope contracts defined     |
| Events: `schema_version`, `reasoning_hash` | ⚠ Partial        | `EventLog` schema lacks both fields; `events.ts` defines `EventVersion = 'v1'` but not in DB | G-008  | W2                                |
| Audit log for all significant actions      | ✅ Implemented   | `server/src/lib/auditLog.ts:46-75`                                                           | —      | All cart + order events captured  |
| Audit log for admin actions                | ✅ Implemented   | `server/src/routes/control.ts`                                                               | —      | `createAdminAudit()` used         |
| Feature flags (OP_PLATFORM_READ_ONLY etc.) | ✅ Implemented   | `server/prisma/seed.ts` — both OP_* flags seeded deterministically (idempotent) | G-009  | W2 VALIDATED `380fde7`                |
| Maker-Checker dual-signature               | ❌ Missing       | No `maker_id`/`checker_id` in any table or route                                             | G-021  | W3                                |
| Escalation levels + Kill-switch            | ❌ Missing       | Not implemented                                                                              | G-022  | W3                                |
| The Morgue (Level 1+ failure bundles)      | ❌ Missing       | Not implemented                                                                              | G-027  | W4                                |
| `certifications` table                     | ❌ Missing       | Not in schema                                                                                | G-019  | W3                                |
| Admin impersonation routes                 | ✅ Implemented   | `server/src/routes/admin/impersonation.ts` — POST /start, POST /stop, GET /status/:id; auditable bounded tokens | G-011  | W2 VALIDATED `3860447`                |
| Email notifications                        | ✅ Implemented   | `server/src/services/email/email.service.ts` — env-gated, nodemailer SMTP, dev log fallback | G-012  | W2                                |

---

# AXIS E — Platform Architecture

| Requirement                           | Status         | Evidence                                                                                                                            | Gap ID | Notes                     |
| ------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| Route surface consistency             | ⚠ Partial      | `tenant.ts` (1081L), `control.ts` (834L), `auth.ts` (2078L), `ai.ts` (382L)                                                         | —      | Mixed middleware patterns |
| Middleware standardization            | 🚫 Divergent   | Pattern A: `[tenantAuthMiddleware, databaseContextMiddleware]`; Pattern B: inline `buildContextFromRequest()` — both in `tenant.ts` | G-005  | W2                        |
| Single `withDbContext` implementation | 🚫 Divergent   | `src/db/withDbContext.ts` (legacy) + `src/lib/database-context.ts` (canonical); `control.ts:6-7` imports both                       | G-004  | W2                        |
| Response envelope consistency         | ✅ Implemented | `server/src/utils/response.ts` — all helpers used consistently                                                                      | —      | —                         |
| Monolith vs domain extraction         | Monolith       | `server/src/index.ts` registers all routes                                                                                          | —      | W3                        |
| Event backbone                        | ⚠ Partial      | `server/src/lib/events.ts`; `server/src/events/projections/`                                                                        | —      | Co-located in monolith    |
| Observability                         | ⚠ Partial      | Fastify logger; `requestId` generated but not propagated externally                                                                 | —      | W3                        |
| Feature flag API (control-plane)      | ✅ Implemented | `server/src/routes/control.ts`                                                                                                      | —      | —                         |

---

# AXIS F — AI Layer

| Requirement                                     | Status         | Evidence                                                            | Gap ID | Notes                                                   |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| Tenant-scoped AI endpoints                      | ✅ Implemented | `server/src/routes/ai.ts:1-382`                                     | —      | `tenantAuthMiddleware` required                         |
| Budget enforcement (hard stop)                  | ✅ Implemented | `server/src/lib/aiBudget.ts`; `ai_budgets` + `ai_usage_meters`      | —      | `hardStop` flag                                         |
| AI audit trail                                  | ✅ Implemented | `server/src/lib/auditLog.ts:103-170`                                | —      | `createAiInsightsAudit()`, `createAiNegotiationAudit()` |
| `reasoning_hash` / explainability               | ❌ Missing     | `EventLog` schema lacks field; no reasoning pointer in `audit_logs` | G-023  | W3                                                      |
| AI advisory only (no autonomous execution)      | ✅ Implemented | `server/src/routes/ai.ts` — returns text only                       | —      | —                                                       |
| Model drift / freeze mechanism                  | ❌ Missing     | No `OP_AI_AUTOMATION_ENABLED` enforcement; no drift detection       | —      | W3                                                      |
| Insight caching / vector / inference separation | ❌ Missing     | Not implemented                                                     | G-028  | W4                                                      |
| RLS + redaction for AI data access              | ⚠ Partial      | AI routes use new `withDbContext` — context variable race applies   | G-001  | W2                                                      |

---

## Coverage Summary

Implemented: 14  
Partial: 18  
Missing: 14  
Divergent: 4  
Critical: 2 (G-001, G-003)

Next Focus Wave: **Wave 2 — Monolith Stabilization**

---

# TECS PRODUCT UNIT COVERAGE REGISTER

> This section records production-verified TECS implementation units closed after the Wave-2 snapshot date.
> Each entry follows the final governance closure verdict only.

## TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 — Catalog Visibility Policy Storage and Gating

| Dimension | Status |
|---|---|
| **Unit** | TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 |
| **Overall Status** | VERIFIED_COMPLETE |
| **Closure Date** | 2026-04-29 |
| **Runtime Verdict** | RUNTIME_VERIFIED_COMPLETE (production Playwright, https://app.texqtic.com) |

### Coverage by Slice

| Slice | Scope | Status | Commit |
|---|---|---|---|
| **A — Visibility Policy Resolver** | `catalogVisibilityPolicyResolver.ts` with fallback mapping; `aiDataContracts.ts` extension; 281 resolver tests PASS | COMPLETE | `feb9e5f` |
| **B — Migration / Storage** | `catalog_visibility_policy_mode` column DDL; `schema.prisma` updated | COMPLETE | `9d29798` |
| **C — Route Integration** | Catalog browse + PDP routes gated via resolver; 176 route visibility tests PASS | COMPLETE | `57b6e6c` |
| **D — RFQ Gate** | Item-level visibility policy gate on RFQ prefill + submit; 775 RFQ gate tests PASS | COMPLETE | `59e9207` |
| **E — AI Safety** | `catalogVisibilityPolicyMode` excluded from all AI context packs, embedding, and match paths; 111+19+130+11 safety tests PASS | COMPLETE | `9c71d14` |
| **F — QA Seed** | QA seed matrix updated with explicit `catalog_visibility_policy_mode` for FAB-002..006 fixture items | COMPLETE | `bfb3f64` |
| **G — Playwright E2E** | 11/11 production E2E scenarios PASS against `https://app.texqtic.com` | COMPLETE | `493f684` |
| **H — Governance Closure** | Coverage matrix, OPEN-SET, NEXT-ACTION, SNAPSHOT, GOVERNANCE-CHANGELOG updated | CLOSING | this commit |

### Detailed Coverage Notes

- **Persistent storage**: `catalog_visibility_policy_mode` column added to `catalog_items` table via migration `9d29798`. Nullable; defaults preserved. Prisma db pull + generate confirmed.
- **Resolver fallback**: `catalogVisibilityPolicyResolver.ts` maps NULL → open access; `APPROVED_BUYER_ONLY` → relationship-gated; `HIDDEN` → universal exclusion. Fallback chain: DB value → `publicationPosture` inference → OPEN.
- **Catalog browse + PDP integration**: All buyer catalog browse and PDP routes enforce resolver output. APPROVED_BUYER_ONLY items excluded from browse for REQUESTED / no-relationship buyers. HIDDEN items excluded universally.
- **RFQ prefill/submit gate**: `POST /api/tenant/rfqs/drafts/from-catalog-item` and RFQ submit enforce visibility policy. REQUESTED buyer blocked from APPROVED_BUYER_ONLY items with `ITEM_NOT_AVAILABLE` or `ELIGIBILITY_REQUIRED` reason.
- **AI safety**: `catalog_visibility_policy_mode` excluded from `aiContextPacks`, `supplierMatchPolicyFilter`, embedding vectors, and all AI context objects. Constitutional exclusion — not configurable.
- **QA seed**: FAB-002 = NULL (open), FAB-003 = `priceDisclosurePolicyMode=RELATIONSHIP_ONLY`, FAB-004/005 = `APPROVED_BUYER_ONLY`, FAB-006 = `HIDDEN`. Relationships: Buyer A = APPROVED, Buyer B = REQUESTED, Buyer C = NONE.
- **Production E2E (Slice G)**:
  - E2E-01: Buyer A (APPROVED) sees APPROVED_BUYER_ONLY items — PASS
  - E2E-02: Buyer B (REQUESTED) browse excludes APPROVED_BUYER_ONLY — PASS
  - E2E-03: Buyer C (none) browse excludes APPROVED_BUYER_ONLY — PASS
  - E2E-04: Direct PDP 404 for HIDDEN item (APPROVED buyer) — PASS
  - E2E-05: Direct PDP 404 for HIDDEN item (no-relationship buyer) — PASS
  - E2E-06: APPROVED buyer can prefill RFQ from B2B_PUBLIC item — PASS
  - E2E-07: APPROVED_BUYER_ONLY absent from no-relationship browse — PASS
  - E2E-08: HIDDEN absent from all buyer browse responses — PASS
  - E2E-09: RFQ gate blocks REQUESTED buyer on APPROVED_BUYER_ONLY item — PASS
  - E2E-10: Buyer response does not leak `catalogVisibilityPolicyMode`, `publicationPosture`, `relationshipState`, AI scoring, or audit metadata — PASS
  - E2E-11: Supplier sees own HIDDEN and APPROVED_BUYER_ONLY items — PASS
- **Buyer anti-leakage**: 17 internal fields verified absent from all buyer API responses (policy mode, posture, relationship, AI scoring, audit metadata).
- **Supplier own-catalog**: Supplier self-view unrestricted — all own items including HIDDEN returned.

### Open Questions Disposition

| OQ | Description | Status |
|---|---|---|
| OQ-01 | `RELATIONSHIP_GATED` vs `APPROVED_BUYER_ONLY` differentiation | Resolved for this unit — RELATIONSHIP_GATED behaves as APPROVED_BUYER_ONLY; deeper differentiation deferred to future unit |
| OQ-02 | Browse placeholder vs silent absence for gated items | Resolved — silent absence / non-disclosing behavior implemented and E2E-verified |
| OQ-08 | HIDDEN AI exclusion | Resolved — Slice E constitutional AI exclusion verified; Slice G anti-leakage runtime-confirmed |
| — | Supplier-level visibility default configuration UI | Deferred — future enhancement unit required |
| — | Supplier UI controls for per-item policy management | Deferred — future product unit |
| — | Region/channel-sensitive visibility | Future boundary; not in scope for this implementation |

No open questions are launch-blocking.

### Commit Chain

| Commit | Description |
|---|---|
| `feb9e5f` | feat(catalog): add visibility policy resolver with fallback mapping |
| `9d29798` | migration(catalog): add catalog_visibility_policy_mode column |
| `57b6e6c` | prompt-sliceC catalog: wire visibility policy resolver into catalog browse and PDP routes |
| `59e9207` | feat(rfq): add item-level visibility policy gate to RFQ prefill and submit |
| `9c71d14` | security(ai): exclude catalog_visibility_policy_mode from all AI paths |
| `bfb3f64` | qa(seed): restore visibility policy intent via catalog_visibility_policy_mode |
| `493f684` | test(e2e): add visibility policy gating E2E scenarios (Slice G) |
| *(this commit)* | governance(catalog): close TECS-CATALOG-VISIBILITY-POLICY-STORAGE-001 (Slice H) |
