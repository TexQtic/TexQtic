# TexQtic Implementation Tracker — Q2 2026

**Source:** `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`  
**Baseline:** GOVERNANCE-SYNC-048  
**Date:** 2026-03-03  
**RLS Maturity:** 5.0 / 5 *(updated GOVERNANCE-SYNC-077: OPS-CI-RLS-DOMAIN-PROOF-001 CI domain table coverage 3/5→5/5; Phase A fully closed)*  
**Migrations:** 73 / 73 Applied · `Database schema is up to date!` *(updated GOVERNANCE-SYNC-070: migration 20260315000007 applied)*  
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
| TECS 4C — API route exposure (`GET /api/tenant/dpp/*`) | ⏳ Planned | Gate: TECS 4B complete | — |
| TECS 4D — UI / export surfaces (DPPPassport.tsx) | ⏳ Planned | Gate: TECS 4C complete | — |

**Exit Condition for Discovery Phase:**  
Discovery document written, governance updated, no schema/code/RLS changes.

> **Exit condition achieved — 2026-03-04 (GOVERNANCE-SYNC-078)**  
> Discovery complete. G-025 → IN PROGRESS (Design TECS pending).

---

*Tracker produced by: GitHub Copilot — OPS-IMPLEMENTATION-PLAN-AUDIT-001 (follow-on)*  
*Source of truth: `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`*  
*No application code was modified in the production of this document.*

