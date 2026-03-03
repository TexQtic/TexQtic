# TexQtic Implementation Tracker — Q2 2026

**Source:** `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`  
**Baseline:** GOVERNANCE-SYNC-048  
**Date:** 2026-03-03  
**RLS Maturity:** 3.5 / 5  
**Migrations:** 64 / 64 Applied · `Database schema is up to date!`  
**Doctrine Version:** v1.4

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete — evidence recorded |
| ⏳ | Pending — not yet started |
| 🔄 | In Progress |
| 🔴 | Blocked |
| ❌ | Not implemented |

---

## Section 1 — Immediate Execution (Hard Gates)

### 1A — P-A Critical RLS Apply

> **Ops SQL file committed:** `server/prisma/ops/rcp1_orders_update_unified_tenant_arm.sql`  
> No migration. No server code change. B1/D-5 posture preserved.

| Item | Status | Blocker | Target |
|------|--------|---------|--------|
| Apply `rcp1_orders_update_unified_tenant_arm.sql` via `psql "$DATABASE_URL" -f …` | ✅ Complete — 2026-03-03 | APPLY_EXIT:0 · DO-block VERIFY PASS | Day 1 |
| Re-run RCP-1 Phases 4–5: `pnpm -C server exec tsx scripts/validate-rcp1-flow.ts --only-transitions` | ✅ Complete — 2026-03-03 | 16/16 PASS · VALIDATE_EXIT:0 | Day 1 |

**Exit Condition:**  
- RCP-1 Phases 4–5 PASS (CONFIRMED → FULFILLED / CANCELLED + derivedStatus + audit trail).  
- GAP-RLS-ORDERS-UPDATE-001 operationally closed.  
- Gap register updated with psql apply evidence.

> **Exit condition achieved — 2026-03-03 (GOVERNANCE-SYNC-049 / OPS-APPLY-ORDERS-RLS-001)**  
> psql apply: APPLY_EXIT:0 · DO-block VERIFY PASS · 16/16 RCP-1 Phases 4–5 PASS · typecheck EXIT 0 · lint EXIT 0 (0 errors)

---

### 1B — P-D Lint Gate

| Item | Status | Blocker | Target |
|------|--------|---------|--------|
| G-QG-001 — 23 ESLint errors across 11 files | ⏳ Pending | None | Day 3 |

**Files in scope (23 errors):**

| File | Error Type |
|------|-----------|
| `App.tsx` | Unused vars |
| `Auth/ForgotPassword.tsx` | `React` not defined / unused vars |
| `Auth/TokenHandler.tsx` | `React` not defined / unused vars |
| `Auth/VerifyEmail.tsx` | `React` not defined / unused vars |
| `Auth/AuthFlows.tsx` | Unused var (`AUTH_DEBUG`) |
| `Cart/Cart.tsx` | Unused vars (`LoadingState`, `currentQuantity`) |
| `ControlPlane/AuditLogs.tsx` | Unused var (`LoadingState`) |
| `ControlPlane/TenantRegistry.tsx` | Unused var (`LoadingState`) |
| `ControlPlane/EventStream.tsx` | `EmptyState` unused + setState-in-effect |
| `constants.tsx` | Unused imports (`TenantType`, `TenantConfig`, `TenantStatus`) |
| `services/apiClient.ts` | `AbortController` not defined (2 occurrences) |

**Exit Condition:** `pnpm run lint` exits 0 with no errors (pre-existing warnings acceptable).

---

## Section 2 — RLS Maturity Completion (Phase A)

### G-006C Wave 3 Remaining Tables

Each table requires: 1 migration · DO-block verifier PASS · psql apply + `prisma migrate resolve --applied` · cross-tenant 0-row proof.

| Table | Migration Needed | Admin Arm Canonicalized? | FORCE RLS | DO-Block Verifier | Status |
|-------|-----------------|--------------------------|-----------|-------------------|--------|
| `catalog_items` | Yes | ❌ (may reference `bypass_enabled()`) | ✅ | Required | ⏳ |
| `memberships` | Yes | ❌ | ✅ | Required | ⏳ |
| `tenant_branding` | Yes | ❌ | ✅ | Required | ⏳ |
| `tenant_domains` | Yes | ❌ | ✅ | Required | ⏳ |
| `impersonation_sessions` | Yes | ❌ | ✅ | Required | ⏳ |

**Canonical end state per table:**

```
- 1 RESTRICTIVE guard (FOR ALL TO texqtic_app) with admin arm:
    current_setting('app.is_admin', true) = 'true'
- 1 PERMISSIVE SELECT (tenant arm OR admin arm)
- 1 PERMISSIVE INSERT (tenant WITH CHECK OR admin arm)
- 1 PERMISSIVE UPDATE (tenant USING + WITH CHECK OR admin arm)
- 1 PERMISSIVE DELETE where applicable
- FORCE RLS: unchanged (t/t)
- DO-block VERIFIER PASS
- NO bypass_enabled() anywhere
```

**Suggested TECS grouping:**

| TECS ID | Tables | Parallel? |
|---------|--------|-----------|
| `OPS-G006C-WAVE3-CATALOG-MEMBERSHIP-001` | `catalog_items` + `memberships` | Sequential (2 migrations) |
| `OPS-G006C-WAVE3-BRANDING-DOMAINS-001` | `tenant_branding` + `tenant_domains` | Can run in parallel with above |
| `OPS-G006C-WAVE3-IMPERSONATION-001` | `impersonation_sessions` | After above — high-risk table last |

**Phase A exit gate — RLS proof extension:**  
After all tables consolidated, extend `server/scripts/ci/rls-proof.ts` to include at least one Wave 3 domain table (e.g., `trades` or `certifications`). TECS: `OPS-CI-RLS-DOMAIN-PROOF-001`.

**Target RLS Maturity after Phase A:** 4.5 / 5

---

### OPS-RLS-SUPERADMIN-001 (Phase A tail)

| Component | Status |
|-----------|--------|
| `app.is_superadmin` GUC plumbing | ✅ Complete (GOVERNANCE-SYNC-033) |
| `withSuperAdminContext` exported from `database-context.ts` | ✅ Complete |
| DB-level RLS policies consuming `app.is_superadmin` | ❌ Not implemented |

**Dependency:** G-006C consolidation complete (admin arm pattern stable).  
**Risk:** Low — GUC plumbing is in place; only policy extension required.  
**TECS:** `OPS-SUPERADMIN-RLS-001`

---

## Section 3 — Lifecycle Completion (Phase B)

### GAP-ORDER-LC-001 — ORDER Lifecycle Schema

> **Risk Level: 🔴 High — Schema governance approval required before any implementation.**  
> Current state: app-layer order status transitions (GAP-ORDER-TRANSITIONS-001 ✅ VALIDATED) serve as interim.

| Component | Required | Status | Notes |
|-----------|----------|--------|-------|
| Extend `LifecycleState` CHECK constraint to include `'ORDER'` | Yes | ❌ | Migration required |
| Create `order_lifecycle_logs` table + RLS (5-policy canonical pattern) | Yes | ❌ | Migration required |
| Seed ORDER lifecycle states into `lifecycle_states` | Yes | ❌ | Seed script extension |
| Extend `StateMachineService.EntityType` union to include `'ORDER'` | Yes | ❌ | Backend code |
| Replace app-layer `GAP-ORDER-TRANSITIONS-001` workaround with SM-driven transitions | Yes | ❌ | Backend routes |
| Frontend order detail — lifecycle state badge + transition history | Yes | ❌ | Frontend |

**Governance gate:** A dedicated design anchor TECS must be committed before any schema migration is authored. That TECS must document:
- Exact states to be seeded (e.g., `PAYMENT_PENDING`, `CONFIRMED`, `FULFILLED`, `CANCELLED`)
- Allowed transition edges
- Whether order atomicity mirrors TradeService or uses a new pattern
- RLS policy design for `order_lifecycle_logs`

**Suggested TECS sequence:**
1. `OPS-ORDER-LIFECYCLE-DESIGN-001` — Design anchor (no files changed)
2. `OPS-ORDER-LIFECYCLE-SCHEMA-001` — Migration only
3. `OPS-ORDER-SM-WIRING-001` — Backend SM extension + route replacement
4. `OPS-ORDER-LIFECYCLE-FRONTEND-001` — Frontend badge + history

**Phase B companion:**

| Item | Status | Dependency |
|------|--------|-----------|
| G-027 — The Morgue (Level 1+ failure bundles) | ⏳ | G-022 ✅ COMPLETE |

---

## Section 4 — Wave 4 Expansion Control

### Product Expansion Tracker

| Gap | Domain | Complexity | Migration Impact | Dependency | Status |
|-----|--------|-----------|-----------------|-----------|--------|
| G-025 | DPP Snapshot Views | XL | Views / materialized views over `traceability_nodes` + `certifications` | G-016 ✅ | ⏳ |
| G-026 | Custom Domain Routing | L | `tenant_domains` constraints + edge config | G-006C `tenant_domains` consolidated | ⏳ |
| G-027 | The Morgue | L | New table + RLS | G-022 ✅ | ⏳ |
| G-028 | AI Vector / Inference Separation | XL | Vector schema + infra | G-023 ✅ | ⏳ |
| WL Collections Panel | WL Admin | Low | None | G-WL-ADMIN ✅ | ⏳ |
| WL Domains Panel | WL Admin | Medium | None | G-026 + G-WL-ADMIN ✅ | ⏳ |

**Concurrency Rule:**  
> Do NOT open more than 2 Wave 4 TECS simultaneously.  
> Do NOT mix Schema TECS + Wave 4 TECS in the same sprint window.

**Suggested opening pair:** G-027 (The Morgue — isolated, no frontier dependencies) + WL Collections Panel (pure frontend, zero DB risk). These can run in parallel without conflict.

---

## Section 5 — Risk Monitoring Dashboard

### Architectural Risk Watchlist

| Risk | Severity | Mitigation Status | Action |
|------|----------|------------------|----|
| ORDER lifecycle missing — app-layer only | 🔴 HIGH | Pending Phase B | Design anchor TECS first; no coding until approved |
| `app.is_superadmin` GUC with no RLS consumers | 🟠 MED | Phase A (tail) | `OPS-SUPERADMIN-RLS-001` |
| G-006C remaining 5 tables — non-canonical admin arms | 🟠 MED | Phase A | Execute P-B ladder sequentially |
| Ops SQL manual apply dependency — `rcp1_orders_update_unified_tenant_arm.sql` | 🟠 MED | Apply immediately (Day 1) | Step 1A above |
| Email silent SMTP fallback in production | 🟠 MED | No health-check assertion | Future TECS: startup env guard for `EMAIL_SMTP_*` |
| WL Collections / Domains / Orders stub panels | 🟡 LOW | Wave 4 follow-ons | Non-blocking; stub displays "Coming Soon" |
| Frontend lint debt blocks root CI gate | 🟡 LOW | P-D Day 3 | G-QG-001 |

### Governance Risk Watchlist

| Risk | Severity | Status |
|------|----------|--------|
| B1 re-entry condition — new routes bypassing app-layer role guard | 🔴 HIGH | Monitor; document each new route's role guard reasoning |
| GOVERNANCE-SYNC drift — gap closed without sync commit | 🟠 MED | Enforce sync commit per TECS |
| Ops SQL files not auto-applied by CI/CD | 🔴 HIGH | Document in pre-deploy checklist; apply Day 1 |
| DPP export without cryptographic signatures (G-025 deferred) | 🔴 HIGH | Block any ad-hoc export; enforce G-025 design gate |

---

## Section 6 — RLS Maturity Progress Meter

| Dimension | Current Score | Target Score | Phase Delivering | Status |
|-----------|--------------|-------------|-----------------|--------|
| Context Canonicalization | 5 / 5 | 5 / 5 | Complete ✅ | ✅ |
| FORCE RLS Coverage | 5 / 5 | 5 / 5 | Complete ✅ | ✅ |
| Policy Consolidation | 3 / 5 | 5 / 5 | Phase A | ⏳ |
| Admin Arm Correctness | 4 / 5 | 5 / 5 | Phase A | ⏳ |
| CI Domain Table Coverage | 3 / 5 | 5 / 5 | Phase A (tail) | ⏳ |

**Composite RLS Maturity:** 3.5 / 5 → **Target after Phase A: 4.5 / 5**

---

## Section 7 — Execution Velocity Controls

### TECS Concurrency Limits

| Category | Limit | Rationale |
|----------|-------|-----------|
| Schema TECS (DDL) | Max 1 at a time | Migration conflicts; serialized psql apply |
| RLS TECS (DML policy) | Max 2 in parallel | Tables are independent; DO-block verifiers isolate |
| Wave 4 TECS | Max 2 in parallel | No shared schema; risk isolation |
| Mixed Schema + Wave 4 | Forbidden in same sprint window | Cognitive load + rollback risk |

### Atomic Commit Discipline

Each TECS must produce:
1. One commit per gap (or one per phase if a gap has explicit Phase A/B/C split).
2. Evidence: typecheck EXIT 0 · lint EXIT 0 (or pre-existing-only warnings) · DO-block VERIFIER PASS for migrations.
3. A GOVERNANCE-SYNC-N commit updating `gap-register.md` with status, commit hash, and validation proof.

---

## Section 8 — Phase Exit Criteria

### Phase A Complete When:

- [ ] GAP-RLS-ORDERS-UPDATE-001 — `psql apply` confirmed + RCP-1 Phases 4–5 PASS
- [ ] G-QG-001 — `pnpm run lint` exits 0
- [ ] G-006C `catalog_items` — migration applied, DO-block PASS, cross-tenant 0-row confirmed
- [ ] G-006C `memberships` — migration applied, DO-block PASS, cross-tenant 0-row confirmed
- [ ] G-006C `tenant_branding` — migration applied, DO-block PASS
- [ ] G-006C `tenant_domains` — migration applied, DO-block PASS
- [ ] G-006C `impersonation_sessions` — migration applied, DO-block PASS
- [ ] CI RLS proof extended to at least 1 Wave 3 domain table
- [ ] OPS-RLS-SUPERADMIN-001 — DB policies consuming `app.is_superadmin` live
- [ ] RLS Maturity confirmed ≥ 4.5 / 5

### Phase B Complete When:

- [ ] Governance design anchor TECS committed for GAP-ORDER-LC-001
- [ ] `order_lifecycle_logs` table created with RLS + FORCE RLS
- [ ] ORDER added to `LifecycleState` CHECK constraint
- [ ] ORDER lifecycle states seeded in `lifecycle_states`
- [ ] `StateMachineService` accepts `EntityType = 'ORDER'`
- [ ] Checkout populates `order_lifecycle_logs` (replaces `audit_logs`-only approach)
- [ ] App-layer `GAP-ORDER-TRANSITIONS-001` workaround removed from routes
- [ ] G-027 The Morgue — table created, Level 1+ escalation resolutions captured

### Phase C Complete When:

- [ ] At least one Wave 4 feature fully shipped with evidence (G-025, G-026, G-027, or G-028)
- [ ] Zero open P-A gaps
- [ ] Zero open P-B gaps
- [ ] WL Collections panel functional (OPS-WLADMIN-COLLECTIONS-001)

---

## Section 9 — Strategic Bottleneck Record

> **Recorded:** 2026-03-03

The TexQtic platform is:

- Structurally stable
- Migration-aligned (64/64 applied)
- Governance-disciplined (GOVERNANCE-SYNC-048)
- RLS-heavy but controlled (3.5/5 maturing to 4.5/5 in Phase A)
- Audit-strong (append-only logs, writeAuditLog on all mutations, 14 GET handlers)
- Lifecycle-partial (TRADE/ESCROW/CERTIFICATION fully SM-driven; ORDER app-layer only)

**True bottleneck:** ORDER lifecycle schema completion (GAP-ORDER-LC-001).

Everything else in the remaining backlog is incremental:
- G-006C tables are mechanical migrations with a proven pattern.
- Wave 4 items are additive (no existing system rework required).
- WL follow-ons are pure frontend with no schema dependency.

The structural gap is ORDER. Until `order_lifecycle_logs` is live and the SM `EntityType` union includes `ORDER`, the commerce domain will remain audit-tracked but not SM-governed — which is the only remaining domain-wide architectural inconsistency.

---

*Tracker produced by: GitHub Copilot — OPS-IMPLEMENTATION-PLAN-AUDIT-001 (follow-on)*  
*Source of truth: `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`*  
*No application code was modified in the production of this document.*
