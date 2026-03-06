# TexQtic Implementation Tracker — Q2 2026

**Source:** `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`  
**Baseline:** GOVERNANCE-SYNC-048  
**Date:** 2026-03-03  
**RLS Maturity:** 5.0 / 5 *(updated GOVERNANCE-SYNC-077: OPS-CI-RLS-DOMAIN-PROOF-001 CI domain table coverage 3/5→5/5; Phase A fully closed)*  
**Migrations:** 73 / 73 Applied · `Database schema is up to date!` *(updated GOVERNANCE-SYNC-070: migration 20260315000007 applied)*  
**Doctrine Version:** v1.4

> **Cross-reference:** Frontend-backend reachability recovery and cross-audit reconciliation for March 2026 is governed in
> `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` (Section 8) and
> `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md`. This Q2 tracker remains active for its original scope (G-001 through G-028 + membership governance).

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
| G-QG-001 — 23 ESLint errors across 11 files | ✅ Complete — 2026-03-03 | lint EXIT 0 · 0 errors · 0 warnings; typecheck EXIT 0 | Day 1 |

> **Exit condition achieved — 2026-03-03 (GOVERNANCE-SYNC-050 / OPS-LINT-CLEANUP-001)**  
> `pnpm run lint` EXIT 0 (0 errors, 0 warnings) · `pnpm run typecheck` EXIT 0 · 23→0 root lint errors cleared

**Files in scope (23 errors cleared):**

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
| `catalog_items` | Yes | ✅ (`is_admin='true'` arm applied — GOVERNANCE-SYNC-051) | ✅ | ✅ PASS (2026-03-03) | ✅ Complete |
| `memberships` | Yes | ✅ (`is_admin='true'` arm applied — GOVERNANCE-SYNC-052) | ✅ | ✅ PASS (2026-03-03) | ✅ Complete |
| `tenant_branding` | Yes | ✅ (`is_admin='true'` arm applied — GOVERNANCE-SYNC-053) | ✅ | ✅ PASS (2026-03-03) | ✅ Complete |
| `tenant_domains` | Yes | ✅ (`is_admin='true'` arm applied — GOVERNANCE-SYNC-054) | ✅ | ✅ PASS (2026-03-03) | ✅ Complete |
| `impersonation_sessions` | Yes | ✅ (`is_admin='true'` arm applied — GOVERNANCE-SYNC-055, admin-only: `require_admin_context` + `admin_id` actor arm, no tenant arm) | ✅ | ✅ PASS (2026-03-03) | ✅ Complete |

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
| `startImpersonation` + `stopImpersonation` → `withSuperAdminContext` | ✅ Complete (GOVERNANCE-SYNC-072) |
| `withSuperAdminEscalationContext` for upgrade/resolve write paths | ✅ Complete (GOVERNANCE-SYNC-072) |
| DB apply approved (sign-off + runbook recorded) | ✅ Approved (GOVERNANCE-SYNC-073) |
| DB-level RLS policies consuming `app.is_superadmin` — 20260315000008 applied | ✅ APPLIED (GOVERNANCE-SYNC-076) — APPLY_EXIT:0, VERIFIER PASS [20260315000008], RESOLVE_EXIT:0 |
| DB-level RLS policies consuming `app.is_superadmin` — 20260315000009 applied | ✅ APPLIED (GOVERNANCE-SYNC-076) — APPLY_EXIT:0, VERIFIER PASS [20260315000009], RESOLVE_EXIT:0 |

**Dependency:** DB apply authorized (GOVERNANCE-SYNC-073). Runbook at `docs/ops/REMOTE-MIGRATION-APPLY-LOG.md`.  
**Risk:** Low — GUC plumbing + service paths complete; policy apply is the final step.  
**TECS:** `OPS-RLS-SUPERADMIN-001` — ✅ VALIDATED (GOVERNANCE-SYNC-076): both migrations applied; APPLY_EXIT:0 + VERIFIER PASS + RESOLVE_EXIT:0 for both 20260315000008 + 20260315000009

---

## Section 3 — Lifecycle Completion (Phase B)

### GAP-ORDER-LC-001 — ORDER Lifecycle Schema

> **Risk Level: 🔴 High — Schema governance approval required before any implementation.**  
> Current state: app-layer order status transitions (GAP-ORDER-TRANSITIONS-001 ✅ VALIDATED) serve as interim.

| Component | Required | Status | Notes |
|-----------|----------|--------|-------|
| Extend `LifecycleState` CHECK constraint to include `'ORDER'` | Yes | ✅ (`lifecycle_states_entity_type_check` + `allowed_transitions_entity_type_check` extended — GOVERNANCE-SYNC-056) | Migration `20260315000005` applied |
| Create `order_lifecycle_logs` table + RLS (5-policy canonical pattern) | Yes | ✅ (GOVERNANCE-SYNC-056: table + FK + 3 indexes + FORCE RLS + 1 RESTRICTIVE guard + PERMISSIVE SELECT/INSERT + UPDATE/DELETE immutability blocks) | VERIFIER PASS (2026-03-03) |
| Seed ORDER lifecycle states into `lifecycle_states` + seed `allowed_transitions` ORDER edges | Yes | ✅ States: GOVERNANCE-SYNC-056 (4 states seeded via migration). ✅ Transitions: GOVERNANCE-SYNC-057 (4 edges seeded via `seed_state_machine.ts`: PAYMENT_PENDING→CONFIRMED, CONFIRMED→FULFILLED, CONFIRMED→CANCELLED, PAYMENT_PENDING→CANCELLED; SEED_EXIT:0; VERIFIER PASS) | `seed_state_machine.ts` now canonical 47-edge graph |
| Extend `StateMachineService.EntityType` union to include `'ORDER'` | Yes | ✅ (GOVERNANCE-SYNC-058: `stateMachine.types.ts` line 15 extended; `stateMachine.guardrails.ts` SYSTEM_AUTOMATION FULFILLED unlocked; `prisma db pull` + `generate` run) | `'TRADE' \| 'ESCROW' \| 'CERTIFICATION' \| 'ORDER'` |
| Extend `StateMachineService.transition()` to enforce ORDER transitions + write `order_lifecycle_logs` | Yes | ✅ (GOVERNANCE-SYNC-058: ORDER branch added to SM service; actor_id consolidated; realm derived from actorType; shared-tx opts.db pattern preserved) | typecheck EXIT 0 |
| Replace app-layer order lifecycle workaround in `tenant.ts` with `StateMachineService.transition()` | Yes | ✅ (GOVERNANCE-SYNC-059: `makeTxBoundPrisma` helper + SM import added; checkout `writeAuditLog` workaround → `tx.order_lifecycle_logs.create()`; PATCH endpoint app-layer if/else → SM.transition(); optional `reason` field; error codes mapped to HTTP; DB enum mapping preserved; typecheck EXIT 0; lint EXIT 0) | B4 BACKEND-INTEGRATION-001 |
| Grant base SELECT+INSERT on `order_lifecycle_logs` to `texqtic_app`+`app_user` (unblock 42501) | Yes | ✅ (GOVERNANCE-SYNC-060A: `server/prisma/ops/order_lifecycle_logs_grants.sql` created; psql APPLY_EXIT:0; verification: 4 rows in `information_schema.role_table_grants`; checkout lifecycle writes unblocked; typecheck EXIT 0; lint EXIT 0) | OPS-ORDER-LC-LOGS-GRANT-001 |
| `validate-rcp1-flow.ts` — replace audit-seam with `order_lifecycle_logs` Prisma-direct checks (Steps 3.2/4A.2/4B.2/4C.2/Phase5) | Yes | ✅ (GOVERNANCE-SYNC-060: all 4 audit-log lifecycle checks replaced with `prisma.order_lifecycle_logs.findFirst/findMany`; Phase 5 rebuilt as full chain integrity check; proof run 2026-03-03: **22 PASS 0 FAIL** — checkout PAYMENT_PENDING ✅, SM CONFIRMED/FULFILLED/CANCELLED ✅, terminal state 409 ✅, chain PAYMENT_PENDING→CONFIRMED→FULFILLED ✅; typecheck EXIT 0; lint EXIT 0) | B5 UX-VALIDATION-001 |
| Align `WLOrdersPanel` + `EXPOrdersPanel` order status display with canonical lifecycle (remove `deriveStatus()` audit-log hack) | Yes | ✅ (GOVERNANCE-SYNC-063: `deriveStatus()` + `BackendAuditEntry` + `AuditResponse` + `auditLogs` state + `Promise.all` audit-logs fetch removed from both panels; `canonicalStatus(order)` reads `order.lifecycleState`; `LifecycleHistory` component renders `order.lifecycleLogs` newest-first; typecheck EXIT 0; lint EXIT 0) | B6b — UI-B6B-001 |
| Enrich `GET /api/tenant/orders` + `GET /api/tenant/orders/:id` with `lifecycleState` + `lifecycleLogs` (take:5) | Yes | ✅ (GOVERNANCE-SYNC-062: `OLLSelectRow` type alias added; both endpoints include `order_lifecycle_logs { from_state, to_state, realm, created_at }`; mapped to camelCase response fields; backward-compatible; typecheck EXIT 0; lint EXIT 0) | B6a API-LIFECYCLE-001 |
| Frontend order detail — lifecycle state badge + transition history | Yes | ✅ (GOVERNANCE-SYNC-063: `LifecycleHistory` component renders `order.lifecycleLogs` as newest-first transition list inline in Status column; badge reads `canonicalStatus(order)`) | B6b — UI-B6B-001 |

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
| G-027 | The Morgue | L | Schema foundation (GOVERNANCE-SYNC-065, migration `20260315000006`) + canonical producer in `StateMachineService` ORDER branch — writes `morgue_entries` row atomically when ORDER reaches FULFILLED or CANCELLED, with entity+finalState dedup guard. typecheck EXIT 0, lint EXIT 0 (GOVERNANCE-SYNC-068). | G-022 ✅ | ✅ VALIDATED |
| G-028 | AI Vector / Inference Separation | XL | Vector schema + infra | G-023 ✅ | ⏳ |
| WL Collections Panel | WL Admin | Low | `WLCollectionsPanel.tsx` — display-only, groups catalog items by category (GOVERNANCE-SYNC-066/067); commit `3d67f4c`. Scope complete as designed (display-only); model-backed collections is a new gap. | G-WL-ADMIN ✅ | ✅ VALIDATED |
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
| ORDER lifecycle — SM-governed (GAP-ORDER-LC-001 ✅ CLOSED) | ~~🔴 HIGH~~ | ✅ Resolved GOVERNANCE-SYNC-063 | No action required |
| `app.is_superadmin` GUC with no RLS consumers | 🟠 MED | Phase A (tail) | `OPS-SUPERADMIN-RLS-001` |
| G-006C remaining 5 tables | ~~🟠 MED~~ | ✅ Resolved GOVERNANCE-SYNC-051–055 | All 11 tables at canonical pattern |
| Ops SQL manual apply dependency — `rcp1_orders_update_unified_tenant_arm.sql` | ~~🟠 MED~~ | ✅ Applied (GOVERNANCE-SYNC-049) | No action required |
| Email silent SMTP fallback in production | 🟠 MED | No health-check assertion | Future TECS: startup env guard for `EMAIL_SMTP_*` |
| WL Collections / Domains / Orders stub panels | 🟡 LOW | Wave 4 follow-ons | Non-blocking; stub displays "Coming Soon" |
| Frontend lint debt blocks root CI gate | ~~🟡 LOW~~ | ✅ Resolved GOVERNANCE-SYNC-050 | G-QG-001 VALIDATED |

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
| Policy Consolidation | 5 / 5 | 5 / 5 | Phase A ✅ | ✅ |
| Admin Arm Correctness | 5 / 5 | 5 / 5 | Phase A ✅ | ✅ |
| CI Domain Table Coverage | 5 / 5 | 5 / 5 | Phase A ✅ | ✅ OPS-CI-RLS-DOMAIN-PROOF-001 (GOVERNANCE-SYNC-077) |

**Composite RLS Maturity:** 5.0 / 5 *(updated GOVERNANCE-SYNC-077 — CI Domain Table Coverage 3/5→5/5; OPS-CI-RLS-DOMAIN-PROOF-001 ✅ VALIDATED; all five RLS dimensions at 5/5; Phase A fully closed)*

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

- [x] GAP-RLS-ORDERS-UPDATE-001 — `psql apply` confirmed + RCP-1 Phases 4–5 PASS (GOVERNANCE-SYNC-049, 2026-03-03: APPLY_EXIT:0 · 16/16 PASS)
- [x] G-QG-001 — `pnpm run lint` exits 0 (GOVERNANCE-SYNC-050, 2026-03-03: lint EXIT 0 · 0 errors)
- [x] G-006C `catalog_items` — migration `20260315000000` applied, DO-block VERIFIER PASS, no {public} policies, is_admin arm confirmed (GOVERNANCE-SYNC-051, 2026-03-03)
- [x] G-006C `memberships` — migration `20260315000001` applied, DO-block VERIFIER PASS, no {public} policies, is_admin arm confirmed (GOVERNANCE-SYNC-052, 2026-03-03)
- [x] G-006C `tenant_branding` — migration `20260315000002` applied, DO-block VERIFIER PASS, no {public} policies, is_admin arm confirmed (GOVERNANCE-SYNC-053, 2026-03-03)
- [x] G-006C `tenant_domains` — migration `20260315000003` applied, DO-block VERIFIER PASS, no {public} policies, is_admin arm confirmed, DELETE tenant_id arm confirmed (GOVERNANCE-SYNC-054, 2026-03-03)
- [x] G-006C `impersonation_sessions` — migration `20260315000004` applied, DO-block VERIFIER PASS, no {public} policies, require_admin_context + is_admin arm confirmed, DELETE critical fix applied (had bypass_enabled only), admin-only design (no tenant arm) (GOVERNANCE-SYNC-055, 2026-03-03)
- [x] CI RLS proof extended to at least 1 Wave 3 domain table *(GOVERNANCE-SYNC-077: `escalation_events` DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS added; 4/4 steps PASS; EXIT 0)*
- [ ] OPS-RLS-SUPERADMIN-001 — DB policies consuming `app.is_superadmin` live *(open)*
- [x] RLS Maturity confirmed ≥ 4.5 / 5 (GOVERNANCE-SYNC-064 audit: 4.5/5 confirmed)

### Phase B Complete When:

- [x] Governance design anchor TECS committed for GAP-ORDER-LC-001 (embedded in GOVERNANCE-SYNC-056 schema gate: states, transitions, RLS, atomicity pattern all documented prior to migration)
- [x] `order_lifecycle_logs` table created with RLS + FORCE RLS (GOVERNANCE-SYNC-056: migration `20260315000005`; 1 RESTRICTIVE guard + PERMISSIVE SELECT/INSERT + immutability blocks; VERIFIER PASS)
- [x] ORDER added to `LifecycleState` CHECK constraint (GOVERNANCE-SYNC-056: `lifecycle_states_entity_type_check` + `allowed_transitions_entity_type_check` extended)
- [x] ORDER lifecycle states seeded in `lifecycle_states` (GOVERNANCE-SYNC-056: 4 states seeded; GOVERNANCE-SYNC-057: 4 transitions seeded)
- [x] `StateMachineService` accepts `EntityType = 'ORDER'` (GOVERNANCE-SYNC-058: ORDER branch added; `order_lifecycle_logs` written atomically)
- [x] Checkout populates `order_lifecycle_logs` (GOVERNANCE-SYNC-059: `writeAuditLog` workaround replaced with `tx.order_lifecycle_logs.create()`)
- [x] App-layer `GAP-ORDER-TRANSITIONS-001` workaround removed from routes (GOVERNANCE-SYNC-059: PATCH endpoint uses `StateMachineService.transition()`)
- [x] G-027 The Morgue — table created, Level 1+ escalation resolutions captured *(Wave 4 item — ✅ VALIDATED GOVERNANCE-SYNC-068)*

### Phase C Complete When:

- [x] At least one Wave 4 feature fully shipped with evidence (G-025, G-026, G-027, or G-028)
- [ ] Zero open P-A gaps
- [ ] Zero open P-B gaps
- [ ] WL Collections panel functional (OPS-WLADMIN-COLLECTIONS-001)

---

## Section 9 — Strategic Bottleneck Record

> **Recorded:** 2026-03-03

The TexQtic platform is:

- Structurally stable
- Migration-aligned (71/71 applied as of GOVERNANCE-SYNC-064 audit, 2026-03-03)
- Governance-disciplined (GOVERNANCE-SYNC-064)
- RLS-canonical (4.5/5 — Phase A complete; CI domain table coverage tail pending)
- Audit-strong (append-only logs, writeAuditLog on all mutations, 14 GET handlers)
- **Lifecycle-complete: TRADE/ESCROW/CERTIFICATION/ORDER all SM-governed** (GAP-ORDER-LC-001 ✅ CLOSED)

**True bottleneck (post-Phase B):** Wave 4 expansion sequencing.

All foundational gaps are resolved:
- G-006C fully consolidated — no bypass_enabled() in any active policy clause.
- GAP-ORDER-LC-001 fully closed — SM enforces ORDER; UI reads canonical lifecycleState.
- All 71 migrations applied and ledger-synced.

Remaining open items before full Phase A closure:
- ~~OPS-CI-RLS-DOMAIN-PROOF-001~~ ✅ **VALIDATED (GOVERNANCE-SYNC-077)**: `escalation_events` DOMAIN_ISOLATION_PROOF_ESCALATION_EVENTS step added to `rls-proof.ts`; 4/4 proof steps PASS; EXIT 0; no DB touch; CI Domain Table Coverage 3/5→5/5; Composite RLS Maturity 4.5/5→5.0/5. **Phase A fully closed.**
- ~~OPS-RLS-SUPERADMIN-001~~ ✅ **VALIDATED (GOVERNANCE-SYNC-076)**: both DB policy migrations applied to remote Supabase; APPLY_EXIT:0 + VERIFIER PASS + RESOLVE_EXIT:0 for both; `impersonation_sessions` INSERT/UPDATE/DELETE narrowed to `is_superadmin='true'`; `escalation_events` admin INSERT narrowed to `is_superadmin='true'`; service write paths (`withSuperAdminContext`) confirmed at `1f211d6`. Feature flags: KNOWN LIMITATION (postgres BYPASSRLS path; route-level guard only).
- ~~orders.status enum extension~~ ✅ **DONE** — OPS-ORDERS-STATUS-ENUM-001 (GOVERNANCE-SYNC-070): CONFIRMED + FULFILLED added; CANCELLED verified present; migration `20260315000007` applied; PREFLIGHT PASS + VERIFIER PASS.

---

## Section 10 — Wave 4 Execution (G-025 — DPP Snapshot Views)

> **Baseline:** GOVERNANCE-SYNC-078 — 2026-03-04  
> **Wave 4 opens:** Phase A hardening closed (GOVERNANCE-SYNC-077; RLS Maturity 5.0/5).

| Item | Status | Notes | Date |
|------|--------|-------|------|
| G-025 Discovery — Schema inventory (traceability_nodes, edges, certifications) | ✅ Complete | 3 tables analyzed; Wave 3 Tail RLS confirmed; FORCE RLS=t on all | 2026-03-04 |
| G-025 Discovery — Graph traversal pattern documented | ✅ Complete | Forward + reverse CTE pattern; edge directionality confirmed; no cycle guard at DB level | 2026-03-04 |
| G-025 Discovery — RLS inheritance analysis | ✅ Complete | Live SQL views safe; mat-view RLS risk documented | 2026-03-04 |
| G-025 Discovery — Snapshot strategies compared (A/B/C) | ✅ Complete | No recommendation yet; tradeoffs documented | 2026-03-04 |
| G-025 Discovery — STOP CONDITION documented | ✅ Complete | certifications has no FK to traceability_nodes; org-level join only (Gap G-025-B) | 2026-03-04 |
| G-025 Discovery document written | ✅ Complete | `docs/architecture/DPP-SNAPSHOT-VIEWS-DISCOVERY.md` | 2026-03-04 |
| G-025 Regulatory DPP field mapping | ✅ Complete | 5 available, 6 partial, 5 absent; gaps G-025-A through G-025-H registered | 2026-03-04 |
| G-025 Design TECS — Cert-to-node linkage decision | ✅ Complete | D1: Option C (join table `node_certifications`); pending Paresh approval before TECS 4A | 2026-03-04 |
| G-025 Design TECS — Supplier/facility model decision | ✅ Complete | v1 Deferred (G-025-A); v2 scope | 2026-03-04 |
| G-025 Design TECS — Snapshot strategy selection | ✅ Complete | D3: Option A Live SQL Views (mandatory; RLS inherited) | 2026-03-04 |
| G-025 Design Anchor → ✅ Complete | ✅ Complete | `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md`; D1–D6 locked | 2026-03-04 |
| **D1 Approval — Option C (join table `node_certifications`)** | ✅ Approved — 2026-03-04 | Paresh explicit approval; GOVERNANCE-SYNC-080; TECS 4A unblocked | 2026-03-04 |
| TECS 4A — `node_certifications` join table (schema migration) | ✅ Validated | D1 ✅ Approved; migration `20260316000000_g025_node_certifications` applied to Supabase; PREFLIGHT PASS; FORCE RLS=t; 5 RLS policies (1 RESTRICTIVE + 4 PERMISSIVE); GRANT SELECT,INSERT texqtic_app; RESOLVE_EXIT:0; PULL_EXIT:0; GENERATE_EXIT:0; typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-080 | 2026-03-04 |
| **D2 Approval — v1 regulatory field surface** | ✅ Approved — 2026-03-04 | Paresh explicit approval; GOVERNANCE-SYNC-081; batch_id/node_type/meta/geo_hash/lineage/node-certs confirmed; manufacturer_* conditional on D4 | 2026-03-04 |
| **D4 Gate — organizations RLS verification** | 🔴 FAIL — 2026-03-04 | organizations SELECT policy admin/bypass-only; no tenant org_id arm; Gap G-025-ORGS-RLS-001 registered; manufacturer_* removed from v1 scope | 2026-03-04 |
| TECS 4B — DPP view creation (SQL DDL) | ✅ Validated | D2 ✅ Approved; D4 🔴 FAIL (orgs excluded); 3 views: dpp_snapshot_products_v1/lineage_v1/certifications_v1; SECURITY INVOKER; recursive CTE depth=20; cycle-guard; VERIFIER PASS; RESOLVE_EXIT:0; PULL_EXIT:0; GENERATE_EXIT:0; typecheck EXIT 0; lint EXIT 0; migration 20260316000001_g025_dpp_snapshot_views; GOVERNANCE-SYNC-081 | 2026-03-04 |
| TECS 4C — API route exposure (`GET /api/tenant/dpp/:nodeId`) | ✅ Validated | TECS 4B ✅; `GET /api/tenant/dpp/:nodeId` added; $queryRaw (3 views); 404 on empty row; no organizations JOIN; writeAuditLog read-audit; typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-082 | 2026-03-04 |
| TECS 4D — UI / export surfaces (DPPPassport.tsx) | ✅ Validated | TECS 4C ✅; DPPPassport.tsx added (components/Tenant/); UUID input + client-side validation; tenantGet fetch; loading/error/404 states; always-visible G-025-ORGS-RLS-001 banner; Product/Certifications/Lineage sections; lineage cap=200; Copy JSON + Download JSON export; App.tsx: expView 'DPP' added, guard + onNavigateDpp prop; Shells.tsx: onNavigateDpp? in ShellProps + nav buttons in all 4 shells; typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-083; G-025 → ✅ VALIDATED v1 | 2026-03-04 |
| **G-025-ORGS-RLS-001 — Discovery** | ✅ Complete | FORCE RLS=t+t CONFIRMED; guard RESTRICTIVE (bypass OR admin) — no tenant arm; no tenant SELECT policy; texqtic_app SELECT only; tenancy key: `id = app.current_org_id()`; STOP CONDITION: NOT triggered (no schema change needed); consumers: withOrgAdminContext / getOrganizationIdentity (G-015 Phase C workaround x3); proposal: add require_org_context() to guard + new tenant SELECT PERMISSIVE; discovery doc: docs/security/ORGANIZATIONS-RLS-DISCOVERY.md; GOVERNANCE-SYNC-084; G-025-ORGS-RLS-001 → IN PROGRESS (TECS 5B pending) | 2026-03-04 |
| **G-025-ORGS-RLS-001 — Apply (TECS 5B)** | ✅ Validated | migration `20260316000002_g025_orgs_rls_tenant_select` applied to remote Supabase; APPLY_EXIT:0; VERIFIER PASS: `organizations_guard_policy` RESTRICTIVE ALL 3 arms (bypass_enabled + current_realm='admin' + require_org_context), `organizations_tenant_select` PERMISSIVE SELECT USING (id=app.current_org_id()) created, all 3 control-plane policies unchanged, texqtic_app SELECT grant intact; RESOLVE_EXIT:0 (78 migrations, up to date); typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-085; G-025-ORGS-RLS-001 → ✅ VALIDATED | 2026-03-05 |
| **G-025 TECS 5C1 — Manufacturer fields restore (dpp_snapshot_products_v1)** | ✅ Validated | migration `20260316000003_g025_dpp_views_manufacturer_restore` applied to remote Supabase; CREATE OR REPLACE VIEW with LEFT JOIN organizations ON id=org_id; added manufacturer_name (legal_name), manufacturer_jurisdiction (jurisdiction), manufacturer_registration_no (registration_no); security_invoker=true preserved; texqtic_app SELECT re-granted; APPLY_EXIT:0; VERIFIER PASS; RESOLVE_EXIT:0 (79 migrations, up to date); typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-086; G-025 DPP v1 fully sealed | 2026-03-05 |
| **G-025 TECS 5C2 — DPP API/UI manufacturer fields enabled** | ✅ Validated | server/src/routes/tenant.ts: DppProductRow interface + SELECT query + response extended with manufacturer_name/jurisdiction/registration_no; meta.manufacturerFields sentinel removed; components/Tenant/DPPPassport.tsx: DppProduct interface updated; DppSnapshot.meta simplified; amber omission banner removed; manufacturer sub-section added to Product Identity card; omission note div removed; server typecheck EXIT 0; lint EXIT 0; GOVERNANCE-SYNC-087; G-025 fully closed end-to-end | 2026-03-05 |
| **G-026 Discovery — Custom domain routing schema/routing audit** | ✅ Complete | tenant_domains schema: 6 cols (domain UNIQUE, tenant_id FK CASCADE, verified bool, primary bool), FORCE RLS canonical (G-006C Wave 3 Tail GOVERNANCE-SYNC-054); NO host-header routing exists anywhere — tenantAuthMiddleware JWT-only, tenantContext.ts X-Tenant-Id header removed (G-W3-A1), realmGuard URL-prefix only, vercel.json no edge middleware, api/index.ts no host handling, MiddlewareScaffold.tsx UI stub only; 3 routing insertion points documented (Vercel Edge / Fastify pre-auth hook / Hybrid); DNS CNAME+TXT architecture specified; 7 gaps registered (G-026-A: missing dns verification cols, G-026-B: no public resolver endpoint, G-026-C: no middleware.ts, G-026-D: no slug-subdomain routing, G-026-E: RLS bypass for pre-auth, G-026-F: no cache infra, G-026-G: WL domains panel); STOP CONDITION NOT TRIGGERED; discovery doc: docs/architecture/CUSTOM-DOMAIN-ROUTING-DISCOVERY.md; no schema/code/RLS changes; GOVERNANCE-SYNC-088 | 2026-03-05 |
| **G-026 Design Anchor — Custom domain routing D1–D8 locked** | ✅ Complete | D1=Hybrid (Vercel Edge Middleware + Fastify HMAC validation); D2=Platform subdomains v1 (<slug>.texqtic.app), custom domains deferred v1.1; D3=HMAC-signed backend resolver endpoint (GET /api/internal/resolve-domain); D4=texqtic_service BYPASSRLS role (SELECT tenants(id,slug) only), doctrine compliant; D5=Edge in-memory TTL cache 60s + POST /api/internal/cache-invalidate webhook; D6=Resolver contract: {tenantId,tenantSlug,canonicalHost,status}, identical 404 for all non-resolved, 30s replay window; D7=x-texqtic-tenant-id+x-texqtic-tenant-source+x-texqtic-resolver-sig headers, Edge strips inbound x-texqtic-*, Fastify validates HMAC; D8=Fail-closed (resolver unavailable→platform redirect), domain removal→cache flush, identical 404 for all non-resolved; G-026-A deferred v1.1; G-026-B..G resolved by design; G-026-H registered (texqtic_service role — SQL migration gate for 6C1); threat model + operational runbook + TECS 6C1/6C2/6C3/6D plan included; design doc: docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md; no code/schema/RLS changes; GOVERNANCE-SYNC-089 | 2026-03-05 |
| **G-026 TECS 6C1 — Backend resolver endpoint** | ✅ Validated | server/src/lib/resolverHmac.ts (NEW — HMAC-SHA256 timing-safe verify; 30s replay window); server/src/lib/hostNormalize.ts (NEW — lowercase, strip port, FQDN-dot, RFC 1123, reject bare IP, parsePlatformHost); server/src/routes/internal/resolveDomain.ts (NEW — GET /api/internal/resolve-domain; HMAC auth before DB; platform-subdomain + custom-domain paths; SET LOCAL ROLE texqtic_service in $transaction); server/src/routes/internal/index.ts (MODIFIED — resolveDomainRoutes registered at /api/internal prefix); server/src/config/index.ts (MODIFIED — TEXQTIC_RESOLVER_SECRET z.string().min(32) added); migration 20260317000000_g026_texqtic_service_role: texqtic_service NOLOGIN BYPASSRLS, SELECT on tenants + tenant_domains, GRANT to postgres; APPLY_EXIT=0; VERIFIER PASS; typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); PREFLIGHT DEVIATION: tenants.active boolean absent — used status=ACTIVE (TenantStatus enum; functionally equivalent; security intent preserved); G-026-H ✅ VALIDATED; GOVERNANCE-SYNC-090 | 2026-03-17 |
| **G-026 TECS 6C2 — Vercel Edge middleware + Fastify tenant header validation** | ✅ Validated | middleware.ts (NEW — Vercel Edge Middleware; Host→tenant resolution; Web Crypto HMAC-SHA256; in-memory cache TTL=60s max 1,000 entries; inbound x-texqtic-* header strip; platform/dev passthrough; fail-closed D8; x-middleware-request-* injection; config.matcher excludes /api/internal/*); server/src/lib/tenantHeaders.ts (NEW — header name constants + edgeCanonicalMessage() + EDGE_REPLAY_WINDOW_MS); server/src/hooks/tenantResolutionHook.ts (NEW — Fastify onRequest hook; validates HMAC on Edge-injected headers; anti-spoofing; augments FastifyRequest with resolvedTenantId/tenantSource/resolvedTenantSlug; skips /api/internal/*; 401 on invalid); server/src/index.ts (MODIFIED — tenantResolutionHook registered before realmHintGuardOnRequest); api/index.ts (MODIFIED — same hook); no DB migration; no schema change; no RLS change; typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); ENV: TEXQTIC_RESOLVER_SECRET required in Vercel Edge env vars; G-026-C ✅ VALIDATED; G-026-D ✅ VALIDATED; GOVERNANCE-SYNC-091 | 2026-03-17 |
| **G-026 TECS 6C3 — Cache invalidation webhook** | ✅ Validated | server/src/routes/internal/cacheInvalidate.ts (NEW — POST /api/internal/cache-invalidate; HMAC-SHA256 auth; canonical="invalidate:"+tsMs+":"+sha256(bodyJson); replay window 30s; Zod body schema {hosts[1..100], reason enum, requestId?}; host normalization via normalizeHost(); 200 {status:"ok", invalidated:n}; 401 opaque on auth fail); server/src/lib/resolverHmac.ts (MODIFIED — verifyInvalidateHmac() added); server/src/routes/internal/index.ts (MODIFIED — cacheInvalidateRoutes registered at /api/internal); no DB migration; no schema/RLS change; Edge invalidation best-effort TTL-bounded (60s max — no cross-instance shared memory between Node.js serverless and Edge V8 isolates); emitters deferred to TECS 6D (no tenant_domains CRUD routes exist); G-026-F ✅ VALIDATED (webhook contract established); typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); GOVERNANCE-SYNC-092 | 2026-03-17 |
| **G-026 TECS 6D — WL Domains management panel + cache invalidation emitters** | ✅ Validated | components/WhiteLabelAdmin/WLDomainsPanel.tsx (NEW — Path D6D-A CRUD-lite: GET+POST+DELETE /api/tenant/domains; platform domain badge <slug>.texqtic.app read-only; custom domains list with verified/primary/pending badges; add domain form with RFC1123 regex validation + client-side checks; delete confirmation dialog; toast feedback; tenantGet/tenantPost/tenantDelete from tenantApiClient); server/src/routes/tenant.ts (MODIFIED — GET /api/tenant/domains, POST /api/tenant/domains body:{domain} Zod validated, DELETE /api/tenant/domains/:id; OWNER|ADMIN role guard; withDbContext RLS-enforced; writeAuditLog domain.added/domain.removed; P2002→409 conflict; emitCacheInvalidate direct-call after commit); server/src/lib/cacheInvalidateEmitter.ts (NEW — direct emitter: normalizeHost+log, no HTTP round-trip); App.tsx (MODIFIED — WLDomainsPanel import + case 'DOMAINS' stub replaced with <WLDomainsPanel tenantSlug={currentTenant.slug} />); Shells.tsx UNCHANGED (DOMAINS nav already present); no DB migration; no schema/RLS change; G-026-G ✅ VALIDATED; G-026-F emitters ✅ wired; typecheck EXIT 0; lint EXIT 0 (0 errors, 108 pre-existing warnings); GOVERNANCE-SYNC-093 | 2026-03-17 |

**Exit Condition for Discovery Phase:**  
Discovery document written, governance updated, no schema/code/RLS changes.

> **Exit condition achieved — 2026-03-04 (GOVERNANCE-SYNC-078)**  
> Discovery complete. G-025 → IN PROGRESS (Design TECS pending).

---

---

## Section 11 — Wave 4 Execution (G-028 — AI Vector / Inference Separation)

> **Baseline:** GOVERNANCE-SYNC-094 — 2026-03-28  
> **Wave 4 G-028 opens:** Design Anchor confirmed; ADR-028 Option A (pgvector) approved; A1–A6 delivered.

| Item | Status | Notes | Date |
|------|--------|-------|------|
| **G-028 A1 — pgvector schema + RLS** | ✅ Validated | `document_embeddings` table; `vector` extension enabled; HNSW index (cosine, ef_construction=64, m=16); RESTRICTIVE guard (`require_org_context()`) + PERMISSIVE tenant SELECT/INSERT/UPDATE + admin SELECT; FORCE RLS=t; APPLY_EXIT:0; VERIFIER PASS; typecheck EXIT 0; lint EXIT 0; commits: `c07af57`, `b90245a` | 2026-03-28 |
| **G-028 A2 — Vector store module** | ✅ Validated | `server/src/services/vectorStore.ts`; `upsertDocumentEmbeddings` / `queryByVector` / `deleteBySource`; `$queryRaw` pattern (HNSW cosine `<=>` operator); idempotency via `ON CONFLICT(org_id,source_id,chunk_index) DO UPDATE`; 16 passing tests; typecheck EXIT 0; lint EXIT 0; commits: `5fb4b8a`, `8ee0e31` | 2026-03-28 |
| **G-028 A3 — Shadow retrieval** | ✅ Validated | Shadow vector query wired to `GET /api/ai/insights` (log-only, no context injection); retrieval latency median logged; 4 passing tests; typecheck EXIT 0; lint EXIT 0; commits: `59b6f26`, `a4c867d` | 2026-03-28 |
| **G-028 A4 — Embedding ingestion pipeline** | ✅ Validated | `server/src/services/vectorIngestion.ts`; `chunkText` (sliding-window, MAX_CHUNK_LENGTH=800, CHUNK_OVERLAP=100, MAX_CHUNKS_PER_DOC=20); `generateEmbedding` (Gemini `text-embedding-004`, 768-dim guard, 1 retry 100ms backoff); `ingestCatalogItem` / `ingestCertification`; delete-before-upsert idempotency; `ai.vector.ingestion.completed` audit event; tests passing; commits: `10bda3e`, `d9292df` | 2026-03-28 |
| **G-028 A5 — RAG context injection** | ✅ Validated | `vectorContextService`; RAG context assembled (topK=5 chunks, score threshold) and injected into `/api/ai/insights` inference path; `ai.vector.query` audit event; tests passing; commits: `dad08f7`, `858714b` | 2026-03-28 |
| **G-028 A6 — Async indexing pipeline + source expansion** | ✅ Validated | `vectorChunker.ts` extracted (pure deterministic, SHA-256 hashes, no I/O); `vectorEmbeddingClient.ts` extracted (lazy Gemini singleton, `_overrideGenAIForTests()`); `vectorIndexQueue.ts` (in-process FIFO, `QUEUE_SIZE_MAX=1000`, `JOBS_PER_SECOND=5`, 1s interval, `.unref()` for clean exit, idempotent start); `vectorReindexService.ts` (sentinel actor `00000000-0000-0000-0000-000000000010`, `withDbContext`, delete-before-enqueue); `vectorIngestion.ts` refactored — `ingestDppSnapshot` (sourceType='DPP_SNAPSHOT') + `ingestSupplierProfile` (sourceType='SUPPLIER_PROFILE') + `enqueueSourceIngestion` (non-blocking async entry point) added; all A4 symbols re-exported for backward compat; 18 passing tests (A6-TEST-01..04); typecheck EXIT 0; lint EXIT 0; commits: `ad5bf72`, `d31a8d8`; **GOVERNANCE-SYNC-094** | 2026-03-28 |
| **G-028 A7 — Retrieval quality + latency benchmark** | ✅ Validated | `ragMetrics.ts` (per-request latency accumulator; `THRESHOLD_RETRIEVAL_MS=50`, `THRESHOLD_EMBEDDING_MS=500`, `THRESHOLD_TOTAL_MS=800`; console-info only, never persisted); `ragEvaluationDataset.ts` (20 benchmark queries across 5 domains: cert/trace/catalog/compliance/supplier); `ragScoring.ts` (`scoreChunkRelevance`, `precisionAtK`, `recallAtK`, `aggregateScores`; `KEYWORD_OVERLAP_THRESHOLD=0.20`); `ragBenchmarkRunner.ts` (injectable engine: `runBenchmark(deps)`; p95/avg/max latency; `AggregateScoreResult` quality report); `server/scripts/rag-benchmark.ts` (CLI runner; JSON output; local-only); `server/src/routes/ai.ts` minimally instrumented (startTimer/markRetrievalStart/recordRetrievalLatency/markInferenceStart/recordInferenceLatency/recordTotalLatency; no response payload change); 26 passing tests (A7-TEST-01: 8, A7-TEST-02: 11, A7-TEST-03: 7); 64 total A-series tests PASS; observed performance: embedding ~140 ms avg, retrieval ~12 ms avg, total ~167 ms — all thresholds satisfied; typecheck EXIT 0; lint EXIT 0; commits: `fdb822a`, `cddd624`; **GOVERNANCE-SYNC-095** | 2026-03-28 |

**G-028 Exit Condition:**  
A1–A7 all validated. pgvector schema live in Supabase; RLS enforced (`require_org_context()` RESTRICTIVE); Gemini `text-embedding-004` (768-dim) integrated; embedding generation off the request path (async queue); DPP_SNAPSHOT + SUPPLIER_PROFILE source types registered; retrieval quality and latency benchmarking framework in place; all quality gates passed (tsc + eslint + vitest — 64 A-series tests).

> **Exit condition achieved — GOVERNANCE-SYNC-095**  
> G-028 A1–A7 complete. Vector infrastructure operational and validated for production. TECS B1/B2/C1/C2/C3 remain deferred to Wave 5+.

---

## Section 12 — Tenant Membership Governance Notes

> **Recorded:** 2026-03-06 — P-6 Membership Authorization Alignment  
> **Corrected:** 2026-03-06 — P-6A VIEWER policy drift removed  
> **Enforced:** 2026-03-06 — P-6B Explicit runtime role guard added to GET route  
> **TECS:** TECS-P6-MEMBERSHIP-AUTHZ-001 / TECS-P6A-VIEWER-DRIFT-CORRECTION / TECS-P6B-GET-ROLE-GUARD  
> **Governance Sync:** Post-G-028 alignment pass

This section records the authoritative decisions governing the tenant membership domain as clarified and aligned during the P-6 implementation cycle.

---

### 12.1 Membership Authorization Model

| Endpoint | Allowed Roles | Enforcement Mechanism |
|----------|--------------|----------------------|
| `GET /api/tenant/memberships` | OWNER, ADMIN, MEMBER | Explicit route-level role guard (VIEWER → 403) + `tenantAuthMiddleware` + RLS via `app.org_id` |
| `POST /api/tenant/memberships` | OWNER, ADMIN only | Explicit route-level role guard (`userRole !== 'OWNER' && userRole !== 'ADMIN'` → 403) |

**Key rule:** Membership list reads are accessible to authenticated tenant members with role OWNER, ADMIN, or MEMBER. VIEWER is explicitly excluded from the membership list read. Tenant boundary is additionally enforced by Supabase RLS (`app.org_id` GUC context), which prevents cross-tenant data access at the DB layer.

Invite creation (POST) is intentionally restricted to privileged roles to prevent unauthorized member provisioning. This is enforced at the route level (Fastify handler), not in RLS.

---

### 12.2 Frontend / Backend Contract Assumptions

| Decision | Detail |
|---|---|
| `status` field removed from frontend `Membership` interface | Backend schema (`schema.prisma`) does not include a `status` column on the `memberships` table. Frontend contract was aligned to remove the field dependency. |
| `tenantId` is a legacy alias | The canonical tenancy key throughout the system is `org_id`. `tenantId` appears in some middleware and route handler destructuring as a legacy alias; it maps to the same `org_id` concept and is normalized by `tenantAuthMiddleware`. |
| Membership reads rely on RLS | `GET /api/tenant/memberships` does not apply a manual `where: { tenantId }` filter. RLS policies on the `memberships` table enforce tenant isolation via `app.org_id`. Defense in depth remains intact. |

---

### 12.3 Intentionally Incomplete Features

| Feature | Status | Notes |
|---|---|---|
| Membership edit (role update) | ❌ Not implemented | No `PUT /api/tenant/memberships/:id` endpoint exists. The `TeamManagement.tsx` component does not expose edit actions. Deferred to a future prompt cycle. |
| Membership deletion / offboarding | ❌ Not implemented | No offboarding endpoint exists as of P-6. Out of scope. |
| Invite status tracking | ❌ Not surfaced | Invite records exist in the `invites` table but invite `status` is not currently surfaced on the membership list response. |

---

### 12.4 Invite Member UI Wiring Fix

During the P-5 / P-6 cycle, the Invite Member UI in `TeamManagement.tsx` was confirmed wired and functional. The fix connected the `InviteMemberForm.tsx` form submission to the `createMembership()` service call, closing the gap where the invite form existed in the UI but did not trigger a backend request.

---

### 12.5 Authorization Test Coverage

A targeted contract test was added at `tests/membership-authz.test.ts` (P-6, corrected P-6A, runtime-aligned P-6B). It:
- Verifies OWNER, ADMIN, and MEMBER roles are permitted for `GET /api/tenant/memberships` reads.
- Verifies VIEWER is explicitly denied for `GET /api/tenant/memberships` reads.
- Verifies MEMBER and VIEWER roles are denied for `POST /api/tenant/memberships` (invite creation).
- Documents the authorization invariant: all invite-permitted roles can also read; VIEWER is excluded from both read and invite.

This test is a pure-logic unit test — no live server required. Run with:  
`pnpm exec vitest run tests/membership-authz.test.ts`

---

*Section produced by: GitHub Copilot — TECS-P6-MEMBERSHIP-AUTHZ-001*  
*Date: 2026-03-06*

---

*Tracker produced by: GitHub Copilot — OPS-IMPLEMENTATION-PLAN-AUDIT-001 (follow-on)*  
*Source of truth: `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`*  
*No application code was modified in the production of this document.*

