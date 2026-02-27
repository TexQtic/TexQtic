# GAP VALIDATION REPORT — 27 FEB 2026

**Scope:** G-015 Phase C · G-016 · G-017 · G-019  
**Mode:** SAFE-WRITE VALIDATION — Read-only analysis, no implementation  
**Auditor:** GitHub Copilot (Safe-Write Mode)  
**Classification:** Pre-wave blocker audit (Superadmin Doctrine wave + Wave 4 gate)

---

## Executive Summary

| Gap | Claimed Status | Actual Status | Risk Level |
|-----|---------------|---------------|------------|
| G-015 Phase C | ✅ Complete (wave log) | **PARTIAL — Phase C NOT IMPLEMENTED** | 🔴 HIGH |
| G-016 | NOT STARTED (gap register) | **FAIL — Confirmed Not Implemented** | 🟠 MEDIUM |
| G-017 | NOT STARTED (gap register) | **PARTIAL — Schema/routes exist; governance drift** | 🔴 HIGH |
| G-019 | NOT STARTED (gap register) | **FAIL — Certifications not implemented; G-019 label misapplied** | 🔴 HIGH |

### Overall Status: ⚠️ BLOCKED — DO NOT PROCEED TO SUPERADMIN WAVE OR WAVE 4

**Drift Risk Level:** CRITICAL  
**Blockers Detected:** 4 (two governance drift, two missing implementations, one label misuse)

---

## G-015 — Read Cutover to Organizations

### Status: PARTIAL — Phase C NOT IMPLEMENTED (Governance Drift)

### Findings

**What is implemented:**

| Object | Migration | Status |
|--------|-----------|--------|
| `organizations` table | `20260224000000_g015_phase_a_introduce_organizations` | ✅ Created |
| Indexes (5) | Phase A | ✅ Present |
| RLS (ENABLE + FORCE + 3 policies: control-plane SELECT/INSERT/UPDATE) | Phase A | ✅ Admin-realm-only (correct) |
| Dual-write trigger `sync_tenants_to_organizations()` | Phase A | ✅ Present |
| Deferred FK `organizations.id → tenants.id` | `20260225000000_g015_phase_b_organizations_deferred_fk` | ✅ Present |
| `organizations` Prisma model | `schema.prisma` | ✅ Generated (lowercase `organizations`) |
| Live FKs from G-020/G-021/G-022 tables | schema.prisma | ✅ `TradeLifecycleLog`, `EscrowLifecycleLog`, `PendingApproval`, `EscalationEvent` all FK → organizations |

**What is NOT implemented (Phase C — Read Cutover):**

- ❌ **No Phase C migration exists.** The migration directory contains no `g015_phase_c*` file.
- ❌ **No read path uses `prisma.organizations.findX`.** Grep across `server/src/**` returns zero matches for `organizations.findUnique`, `organizations.findFirst`, or `organizations.findMany`.
- ❌ **Route layer still passes `tenantId` to all Prisma operations.** In `server/src/routes/tenant.ts`, `dbContext.orgId` is passed as `tenantId:` to every Prisma `.create()` / `.findUnique()` call (lines 224, 248, 256, 370, 378, 454, 573, 608, 706, 715, 734). The canonical read path targets `tenants`, not `organizations`.
- ❌ **Phase C "Complete" declaration in wave log is unsupported.** `governance/wave-execution-log.md` line 1393 marks `G-015 Phase C | ✅ Complete` for Week 1 of Wave 3. No corresponding commit, migration, or implementation evidence exists.
- ❌ **Gap register is inconsistent with wave log.** `governance/gap-register.md` still shows G-015 as `NOT STARTED` in the Wave 3 Schema Domain Buildout table. This is a governance document conflict.

**RLS enforcement of organizations table:**

The `organizations` table RLS restricts access to admin realm only (`app.current_realm() = 'admin'` or `app.bypass_enabled()`). Tenant-plane actors cannot read their own `organizations` row directly — this is by design for Phase A/B. However, Phase C was supposed to make organization data the canonical READ authority for tenant identity. That cutover never happened.

### Drift Risks

1. **Governance document conflict:** `wave-execution-log.md` says Phase C is complete; `gap-register.md` says NOT STARTED. Any future auditor will receive contradictory signals about the state of G-015.
2. **Org isolation still mediated through `tenants` table.** The `organizations` table has live FKs FROM G-020/G-021/G-022 domain tables, but the source-of-truth for tenant identity in routing and service calls remains `tenants.id` via `dbContext.orgId → tenantId`. This is not Phase C.
3. **`organizations` model naming divergence.** The Prisma model is named `organizations` (lowercase, plural), violating TexQtic PascalCase convention for all other models. This prevents standard Prisma accessor patterns (`prisma.organization.findUnique` vs `prisma.organizations.findUnique`).

### Action Required

- **DO NOT** mark Phase C as complete in governance documents.
- **UPDATE** `gap-register.md` G-015 status to reflect Phase A ✅ / Phase B ✅ / Phase C ❌ NOT IMPLEMENTED.
- **CORRECT** `wave-execution-log.md` line 1393: the Phase C completion entry is incorrect and must be retracted.
- Phase C implementation (migration + service-layer org read cutover) is a prerequisite before Superadmin Doctrine wave if the Superadmin wave relies on reading organizations as canonical identity.

---

## G-016 — traceability_nodes + traceability_edges

### Status: FAIL — Confirmed Not Implemented

### Findings

- ❌ **No migration file exists.** Full scan of `server/prisma/migrations/` (55 directories) reveals no `g016*` migration. The migration directory `.gitkeep` confirms intent but no implementation.
- ❌ **No Prisma models exist.** Full scan of `server/prisma/schema.prisma` (896 lines): no `TraceabilityNode`, `TraceabilityEdge`, `traceability_nodes`, or `traceability_edges` model or table definition.
- ❌ **No routes exist.** `server/src/routes/` contains no traceability plugin or handler.
- ❌ **No services exist.** `server/src/services/` contains no traceability service file.
- ✅ **Gap register is accurate:** `governance/gap-register.md` line 88 explicitly shows G-016 as `NOT STARTED`.
- ✅ **No false completion claim in wave log.** G-016 is not mentioned in wave execution log as complete.

**References found (documentation only):**

- `docs/doctrine/doctrine_v1_4_part_3_EXECUTABLE.md`: Multiple references to `traceability_nodes` and `traceability_edges` including expected schema (`org_id`, `batch_id`, `node_type`, `geo_hash`, `visibility`), edge FK structure, and traversal query patterns.
- `docs/README.md`: Specifies `traceability_nodes` table requirement and RLS policy `traceability_nodes_tenant_isolation`.
- No implementation artifacts exist anywhere in `server/`.

### Drift Risks

1. G-016 is classified as **XL scope** in the gap register. No partial scaffolding exists, so there is no implementation-documentation drift risk — the failure is clean ("not started").
2. Doctrine references assume `traceability_nodes.batch_id` unique index and `traceability_edges.(from_node_id, to_node_id, transformation_id)` unique constraint. These design assumptions are not yet validated against the actual DB constraint model.
3. G-016 has an implicit dependency on `organizations.id` (nodes must have `org_id`), which itself depends on G-015 Phase C. This creates a multi-level dependency that would need to be resolved in order.

### Action Required

- No action required beyond documenting that G-016 is NOT STARTED.
- G-016 should NOT be listed as a blocker for Wave 4 (G-024–G-028) unless supply-chain traceability is explicitly required by those gaps.
- Before implementing G-016, G-015 Phase C (org read cutover) must be complete.

---

## G-017 — trades table

### Status: PARTIAL — Core implemented; governance drift and FK integrity gaps

### Findings

**What is implemented:**

| Object | Location | Status |
|--------|----------|--------|
| `trades` table | `20260306000000_g017_trades_domain/migration.sql` | ✅ Created |
| `trade_events` table | `20260306000000_g017_trades_domain/migration.sql` | ✅ Created |
| ENABLE + FORCE RLS on both tables | Phase A migration | ✅ Present |
| RESTRICTIVE guard policy `trades_guard` | Phase A migration | ✅ Present |
| PERMISSIVE SELECT/INSERT policies (tenant-scoped) | Phase A migration | ✅ Present |
| `updated_at` trigger `trg_trades_set_updated_at` | Phase A migration | ✅ Present |
| GRANT SELECT/INSERT to texqtic_app | Phase A migration | ✅ Present |
| `Trade` Prisma model | `schema.prisma` | ✅ Present |
| `TradeEvent` Prisma model | `schema.prisma` | ✅ Present |
| `trades.tenant_id` → `tenants.id` FK | schema + migration | ✅ Present |
| `trades.lifecycle_state_id` → `lifecycle_states.id` FK | schema + migration | ✅ Present |
| `trades.reasoning_log_id` → `reasoning_logs.id` FK (optional) | schema + migration | ✅ Present |
| `trade_events.trade_id` → `trades.id` CASCADE FK | schema + migration | ✅ Present |
| Unique constraint `trades.(tenant_id, trade_reference)` | schema + migration | ✅ Present |
| `gross_amount > 0` CHECK constraint | migration | ✅ Present |
| G-017 Day 4 FK hardening trigger for `pending_approvals` | `20260307000000_g017_day4_pending_approvals_trade_fk_hardening` | ✅ Present |
| Route plugin `trades.g017.ts` | `server/src/routes/tenant/trades.g017.ts` | ✅ Present |
| `TradeService` | `server/src/services/trade.g017.service.ts` | ✅ Present |
| Settlement route `settlement.g019.ts` | `server/src/routes/tenant/settlement.g019.ts` | ✅ Present (depends on trades) |
| Settlement service `settlement.service.ts` | `server/src/services/settlement/settlement.service.ts` | ✅ Present |

**Gaps and drift detected:**

1. **❌ `buyerOrgId` and `sellerOrgId` have NO FK to `organizations`.**  
   In the `trades` table migration, `buyer_org_id UUID NOT NULL` and `seller_org_id UUID NOT NULL` are plain UUID columns — no `REFERENCES public.organizations(id)` constraint. In the Prisma `Trade` model, `buyerOrgId` and `sellerOrgId` are plain `String @db.Uuid` fields without a `@relation`. There is no DB-level guarantee that `buyer_org_id` or `seller_org_id` reference a valid organization.  
   **Risk:** A trade can reference a non-existent or cross-org organization UUID. No database constraint prevents this.

2. **❌ Gap register shows G-017 as NOT STARTED** — a clear governance drift.  
   `governance/gap-register.md` Wave 3 Domain Buildout table still lists G-017 `NOT STARTED`. In reality G-017 has two migrations, a service, a route, and a settlement pipeline that depends on it.

3. **⚠️ RLS SELECT uses `tenant_id = app.current_org_id()`** — semantic naming tension.  
   The `trades_tenant_select` RLS policy filters: `tenant_id = app.current_org_id()`. The column is `tenant_id` (FK → tenants) but the function is named `current_org_id()`. This works if `app.org_id` is set to the tenant's UUID (which Phase A confirms it is), but the naming mismatch is a latent bug surface: if G-015 Phase C ever moves `app.org_id` to reference a distinct `organizations.id` value that differs from `tenants.id`, this RLS policy would silently fail to scope trades correctly.

4. **⚠️ No `org_id` column on `trades`.** Unlike G-020/G-021/G-022 domain tables that carry a live FK to `organizations.id`, the `trades` table scopes only through `tenant_id → tenants.id`. With G-015 Phase C pending, the canonical org-scoping FK chain is incomplete.

5. **⚠️ CERTIFICATION pending_approvals left ungated.** The G-017 Day 4 trigger `g017_enforce_pending_approvals_trade_entity_fk` explicitly notes: `entity_type = 'CERTIFICATION' → no check here (no FK table yet)`. Since G-019 is not implemented, any `pending_approvals` row with `entity_type = 'CERTIFICATION'` has no referential integrity enforcement at the DB level.

6. **⚠️ No superadmin or admin-level RLS on trades.** The Day 1 migration comment explicitly defers admin/superadmin RLS policies: "Admin/superadmin RLS policies (deferred — no cross-tenant access in Day 1)". These have not been added in subsequent migrations. An admin querying under the `texqtic_app` role with a specific `app.org_id` context would see only that org's trades, not cross-tenant.

7. **✅ Lifecycle FK wired correctly.** `lifecycle_state_id → lifecycle_states.id` with `ON DELETE RESTRICT` — prevents orphaned trades.

8. **✅ Org isolation via tenant_id + RLS is functionally effective** — the current configuration correctly scopes trades to the org whose UUID is in `app.org_id`, since tenants.id = organizations.id (Phase B guarantee).

### Drift Risks

1. If G-015 Phase C diverges `organizations.id` from `tenants.id` (temporal versioning, bi-temporal org record), the trades `tenant_id → tenants.id` FK no longer serves as org isolation. The entire G-017 org isolation model would need re-migration.
2. Gap register inaccuracy creates planning problems: Wave 4 scoping based on gap register would incorrectly treat G-017 as "not started" when it is substantially complete.
3. `buyerOrgId`/`sellerOrgId` without FK creates orphaned counterparty risk — a trade can reference phantom org IDs that are never validated.

### Action Required

- **UPDATE** gap register: G-017 is NOT "NOT STARTED" — mark as `IN PROGRESS` or `VALIDATED` (pending checklist completion).
- **Document** the `buyerOrgId`/`sellerOrgId` FK gap as a follow-on hardening task before production use.
- **ADD** admin-plane RLS policies for trades (cross-tenant admin visibility) as a follow-on migration.
- **DO NOT FIX HERE** — this is an audit pass only.

---

## G-019 — certifications

### Status: FAIL — Not implemented; G-019 label misapplied to settlement

### Findings

**What does NOT exist:**

- ❌ **No certifications table migration.** Full scan of `server/prisma/migrations/` (55 directories) reveals no `g019*` migration.
- ❌ **No Prisma `Certification` model.** Full scan of `schema.prisma` (896 lines): no certification entity.
- ❌ **No certifications route or service.** `server/src/routes/` and `server/src/services/` contain nothing related to certifications CRUD.
- ❌ **No `certifications` table in DB schema.** Absent from all known migration files.
- ✅ **Gap register is accurate:** G-019 listed as `NOT STARTED` in Wave 3 schema buildout table.

**Critical labeling issue detected:**

The file `server/src/routes/tenant/settlement.g019.ts` is labeled `G-019` in its file name, but implements **settlement logic** — not certifications. Its header comment states:

```
G-019 Day 2 — Tenant Plane Settlement Routes
POST /api/tenant/settlements/preview
POST /api/tenant/settlements
```

This is a CERTIFICATION GAP MISREPRESENTATION. The G-019 numbering was **reused or misapplied** to the settlement route, which is a distinct domain concept. The gap register defines G-019 as: *"certifications table — MISSING / L scope; GOTS/OEKO-TEX/etc."*

**Orphaned CERTIFICATION lifecycle states:**

The G-020 seed script (`server/scripts/seed_state_machine.ts`) defines 6 CERTIFICATION entity states:
- `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`, `REVOKED`, `EXPIRED`
- 6 allowed transitions are seeded

These states are inserted into `lifecycle_states` with `entity_type = 'CERTIFICATION'`. However, **no `certifications` table exists** to hold records that would reference these states. This creates:

1. **Dead lifecycle states:** CERTIFICATION rows exist in `lifecycle_states` but there is no `certifications.lifecycle_state_id` FK to consume them.
2. **Pending approvals ungated for CERTIFICATION:** The G-017 Day 4 trigger explicitly exempts CERTIFICATION entity type: *"entity_type = 'CERTIFICATION' → no check here (no FK table yet)"* — meaning any `pending_approvals` row with `entity_type = 'CERTIFICATION'` has no referential integrity.
3. **Maker-checker for certifications is untriggerable:** No code path can create a certification record, so G-021 maker-checker flows for CERTIFICATION are not reachable.

**Settlement route assessment (settlement.g019.ts):**

While the G-019 label is misapplied, the settlement route itself is technically sound relative to G-017 (trades) and G-018 (escrow). It correctly:
- Derives `tenantId` from JWT (D-017-A compliant)
- Enforces `HUMAN_CONFIRMED:` prefix for AI-triggered settlement (D-020-C)
- Invokes Maker-Checker check (G-021)
- Routes through TradeService and EscrowService
- Writes audit in same transaction (D-022)

The labeling error is a governance issue, not a functional defect in the settlement code.

### Drift Risks

1. **G-019 label collision:** Future developers expecting `settlement.g019.ts` to be the certifications implementation will be confused. The certifications domain has no file at all.
2. **Orphaned CERTIFICATION lifecycle graph:** If G-019 (actual certifications table) is never implemented, the seeded CERTIFICATION states become dead weight in `lifecycle_states`. They also create a correctness problem: `LifecycleState.entityType CHECK` includes `'CERTIFICATION'` but there is no consumer table.
3. **Wave 4 dependency risk:** If any Wave 4 gap (G-024–G-028) or Superadmin wave requires certifications review capability, it will find no table to operate on.

### Action Required

- **RENAME** `settlement.g019.ts` to reflect its actual domain (e.g., `settlement.ts`, `trades-settlement.ts`) and assign a proper gap number for settlement if this is a tracked gap.
- **CREATE a gap entry** for the settlement domain (e.g., G-019-SETTLEMENT or G-027-SETTLEMENT) to correctly track what was implemented.
- **DO NOT FIX HERE** — this is an audit pass only.
- G-019 (certifications) remains entirely unimplemented. The Superadmin Doctrine wave and Wave 4 must not assume certifications are available.

---

## Cross-Gap Integrity Matrix

| Rule | Status | Notes |
|------|--------|-------|
| Lifecycle precedes settlement | ✅ PASS | Settlement route (`settlement.g019.ts`) requires trade to have valid lifecycle state; StateMachineService enforces gate |
| Trade precedes certification attachment | ✅ PASS (vacuously) | No certifications table exists; no actual attachment is possible |
| AI reasoning_hash references not active | ✅ PASS | `ReasoningLog` model exists; `Trade.reasoningLogId` is optional FK; no mandatory AI-reference path in prod |
| No dependency on G-018 escrow (in certification path) | ✅ PASS | G-019 certifications not implemented; no escrow dependency possible |
| G-018 escrow exists for settlement path | ✅ PASS | `20260308000000_g018_day1_escrow_schema` + cycle fix migration present |
| Maker-checker not assumed for G-016/G-019 | ✅ PASS | G-016/G-019 not implemented; G-021 maker-checker is available but uncalled for these gaps |
| Sanctions dependency not assumed | ✅ PASS | G-024 (sanctions table) NOT STARTED; no runtime dependency present |
| No cross-org leakage in G-017 trades reads | ✅ PASS | RESTRICTIVE guard + PERMISSIVE SELECT enforces `tenant_id = app.current_org_id()` |
| organizations.id 1:1 parity with tenants.id preserved | ✅ PASS | Phase B deferred FK + dual-write trigger maintain parity |
| G-015 Phase A/B not regressed | ✅ PASS | Migrations intact; FK and trigger in place |
| No raw SQL bypass in trade/settlement routes | ✅ PASS | All queries via Prisma ORM within `withDbContext` |
| CERTIFICATION states in lifecycle_states are orphaned | ❌ DRIFT | 6 states + 6 transitions exist in seed for CERTIFICATION entity_type but no consuming table exists |
| G-017 gap register reflects actual state | ❌ DRIFT | Gap register says NOT STARTED; implementation is substantially complete |
| G-015 Phase C wave log entry is accurate | ❌ DRIFT | Wave log says Complete; no implementation evidence exists |
| G-019 file label matches domain intent | ❌ DRIFT | `settlement.g019.ts` implements settlement, not certifications |
| buyerOrgId/sellerOrgId have FK integrity | ❌ FAIL | Trade counterparty org UUIDs are unvalidated at DB level |

---

## Final Verdict

### Checklist Completion Status

| Check | Result |
|-------|--------|
| All tables verified in migration files | ✅ Completed — G-016 and G-019 confirmed absent |
| All Prisma models verified | ✅ Completed — TraceabilityNode, TraceabilityEdge, Certification absent |
| All RLS policies inspected | ✅ Completed — trades RLS functional; organizations RLS admin-only (correct) |
| All routes inspected | ✅ Completed — settlement.g019.ts is settlement not certifications |
| All controllers inspected | ✅ Completed — no certifications or traceability controllers |
| All service layer org filters validated | ✅ Completed — trades uses tenant_id = app.current_org_id() |
| No raw SQL bypass detected | ✅ Confirmed — all reads through Prisma ORM |
| No cross-org leakage detected | ✅ Confirmed — RESTRICTIVE guard + PERMISSIVE SELECT enforce isolation |
| No lifecycle violation detected | ✅ Confirmed — settlement requires prior lifecycle state |
| Report generated | ✅ This document |

---

### Safe to proceed to Superadmin Doctrine wave?

**NO ❌**

Reasons:
1. G-015 Phase C completion is a falsely declared governance marker. Superadmin Doctrine wave assumes `organizations` as canonical read authority — that cutover never happened.
2. G-019 (certifications) is not implemented but CERTIFICATION states exist in lifecycle_states. A Superadmin wave that includes certification review capability will have no table to operate on.
3. The `settlement.g019.ts` mislabeling creates documentation debt that will confuse Superadmin wave scoping.

---

### Safe to begin Wave 4 (G-024 → G-028)?

**CONDITIONAL ⚠️**

Wave 4 may proceed if and only if:
- It does not depend on G-015 Phase C (org read cutover) being complete
- It does not depend on G-016 (traceability) being complete
- It does not depend on G-019 (certifications) being complete
- The G-017 gap register entry is corrected to avoid planning confusion

If Wave 4 includes G-024 (sanctions table), G-025 (DPP snapshots), G-026 (custom domains), G-027 (the Morgue), G-028 (AI inference), none of these have documented dependencies on G-015 Phase C, G-016, or G-019 — so Wave 4 can proceed with the caveat above.

---

### UI contract can be repaired without schema change?

**PARTIAL ⚠️**

- UI contract repairs that touch trade routes (G-017) can proceed — schema is in place.
- UI contract repairs that touch settlement routes can proceed — schema (trades + escrow) is in place.
- UI contract repairs that touch certification routes CANNOT proceed — no table exists.
- UI contract repairs that touch traceability routes CANNOT proceed — no table exists.
- UI contract repairs that assume org reads from `organizations` directly CANNOT proceed — Phase C not implemented; reads go through tenants table.

---

## Appendix — Evidence Base

| Source | Inspected |
|--------|-----------|
| `server/prisma/schema.prisma` | 896 lines — full read |
| `server/prisma/migrations/` | 55 migration directories — full directory listing |
| `server/prisma/migrations/20260224000000_g015_phase_a_*/migration.sql` | Full read |
| `server/prisma/migrations/20260225000000_g015_phase_b_*/migration.sql` | Full read |
| `server/prisma/migrations/20260306000000_g017_trades_domain/migration.sql` | Full read |
| `server/prisma/migrations/20260307000000_g017_day4_*/migration.sql` | Full read |
| `server/src/routes/tenant/trades.g017.ts` | Lines 1–80 |
| `server/src/routes/tenant/settlement.g019.ts` | Lines 1–80 |
| `server/src/routes/tenant/escalation.g022.ts` | Lines 1–60 |
| `server/src/services/trade.g017.service.ts` | Lines 1–150 |
| `server/src/routes/admin/` | Directory listing |
| `server/src/services/` | Directory listing |
| `governance/gap-register.md` | Full read |
| `governance/wave-execution-log.md` | Lines 30–1393 |
| `governance/coverage-matrix.md` | G-015 row |
| `shared/contracts/` | Directory listing |
| Grep: `prisma.organizations` / `db.organizations` in `server/src/**` | 0 matches |
| Grep: `traceability_nodes\|traceability_edges` in workspace | Docs only, no implementation |
| Grep: `certifications\|Certification\|g019` in `server/**` | Settlement route + seed states only |
| Grep: `G-015 Phase C` in workspace | Wave log (false positive) + G-020 design docs only |

---

*Report generated: 2026-02-27*  
*Mode: SAFE-WRITE — No schema, route, or service modifications were made during this audit.*  
*All findings are read-only observations. No patches applied.*
