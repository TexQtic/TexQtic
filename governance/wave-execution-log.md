# TEXQTIC — WAVE EXECUTION LOG

---

## Entry Template

### Wave X — \<Wave Name\>

Start Date:
End Date:
Branch:
Tag:

#### Objective

Brief description of what this wave accomplishes.

#### Gaps Included

- G-XXX
- G-XXX

#### Commits

- \<commit hash\> — description
- \<commit hash\> — description

#### Validation Evidence

- RLS Proof:
- Cross-Tenant Test:
- Regression Flow:

#### Coverage Matrix Impact

What moved from Partial → Implemented?

#### Governance Notes

Lessons learned / adjustments required.

---

# Wave 2 — Stabilization (In Progress)

Start Date: 2026-02-21
End Date: —
Branch: main
Tag: —

#### Objective

Unify RLS tenant context variable from `app.tenant_id` (legacy) to `app.org_id` (canonical per Decision-0001). Enforce FORCE RLS on commerce tables. Add orders/order_items policies. Standardize middleware and clean up dual-context pattern.

#### G-001 — VALIDATED 2026-02-21

- Commit `25a5519` — initial context variable substitution in all policy bodies (`rls.sql`)
- Commit `1389ed7` — add comprehensive legacy DROP POLICY cleanup block (old per-op naming: `_tenant_select/_insert/_update/_delete` variants dropped; orphan `tenants_tenant_read` + `users_tenant_read` dropped)
- Proof run output:
  - Step 1: 0 policies reference `app.tenant_id` ✅
  - Step 2: 20 policies reference `app.org_id` ✅
  - Step 3: Cross-tenant isolation — WL context reads 0 non-WL cart rows ✅

#### Gaps In Progress

- G-002 — FORCE RLS on commerce tables (next)
- G-003 — orders + order_items policies (partially present — confirmed in Step 2)

---

# Wave History

### Wave DB-RLS-0001 — RLS Context Model Foundation

Start Date: 2026-02-12
End Date: 2026-02-21 (ongoing / Phase-1 baseline)
Branch: main
Tag: —

#### Objective

Establish constitutional RLS enforcement via transaction-local context. Implement `withDbContext` (canonical), `buildContextFromRequest`, `databaseContextMiddleware`. Validate commerce flow (auth → cart → checkout → orders) as Phase-1 baseline.

#### Gaps Included

- G-001 (partially — new context model implemented; policy migration pending)
- G-003 (partially — `orders`/`order_items` policies confirmed missing)

#### Commits

- (See git log — Phase-1 commerce flow implementation)

#### Validation Evidence

- RLS Proof: `server/prisma/verify-rls-data.ts` — manual; not CI-gated
- Cross-Tenant Test: Manual psql verification on `orders`/`order_items`
- Regression Flow: Phase-1 commerce flow validated end-to-end

#### Coverage Matrix Impact

- Commerce Core: Cart lifecycle → **Implemented**
- Commerce Core: Checkout → **Implemented**
- Commerce Core: Orders + OrderItems → **Implemented**
- Auth / JWT claims → **Implemented**
- Realm guard → **Implemented**
- AI budget enforcement → **Implemented**
- Audit log (commerce + admin) → **Implemented**

#### Governance Notes

- Critical divergence found: `app.tenant_id` (old policies) vs `app.org_id` (new context) — G-001 must be Priority 1 in Wave 2
- Two `withDbContext` implementations exist — G-004 must be resolved before Wave 2 tests are meaningful
- `orders`/`order_items` RLS policies appear absent — G-003 is 🔴 Critical

---

### Wave 2 — Monolith Stabilization

Start Date: —
End Date: —
Branch: wave-2-stabilization (planned)
Tag: —

#### Objective

Unify RLS context variable (`app.org_id`), add missing policies for `orders`/`order_items`, FORCE RLS on commerce tables, remove legacy `withDbContext`, standardize middleware, and add CI cross-tenant 0-row proof.

#### Gaps Included

- G-001, G-002, G-003, G-004, G-005, G-006, G-007, G-008, G-009, G-010, G-011, G-012, G-013, G-014

#### Commits

— (not started)

#### Validation Evidence

— (not started)

#### Coverage Matrix Impact

— (pending)

#### Governance Notes

— (pending)
