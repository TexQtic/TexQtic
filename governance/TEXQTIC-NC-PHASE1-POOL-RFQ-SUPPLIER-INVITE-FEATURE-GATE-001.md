# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001

**Type:** FEATURE_GATE_IMPLEMENTED
**Status:** FEATURE_GATE_IMPLEMENTED
**Date:** 2026-05-30
**Author:** TexQtic Platform Engineering (Safe-Write Mode)
**Basis commit:** a50152b (feat(network-commerce): add supplier invite schema foundation)
**Constitutional review:** NC Phase 1 authorized track

---

## §1 — Packet Identity

| Field | Value |
|---|---|
| Packet ID | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001 |
| Predecessor | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001 (a50152b) |
| Authorized by | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001 §6 |
| Scope | Middleware + feature flag seed + unit tests only |
| Posture keys | `active_delivery_unit: HOLD_FOR_AUTHORIZATION` (unchanged) |
| | `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION` (unchanged) |

---

## §2 — Objective

Implement the two-layer Fastify middleware `ncPoolSupplierInviteFeatureGateMiddleware` that gates all
supplier invite routes behind the `nc.procurement_pools.supplier_invites.enabled` feature flag.

Seed the global `FeatureFlag` row (`enabled = false`) for this key via a new idempotent SQL migration.

Deliver 11 unit tests covering all gate scenarios.

---

## §3 — OD-6 Binding

Per OD-6 (TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001 §5):

> **Option B selected.** Supplier routes require only `nc.procurement_pools.supplier_invites.enabled`
> as their feature gate. They do NOT require `nc.procurement_pools.enabled` or
> `nc.procurement_pools.rfq.enabled`. Owner routes require the full 3-gate chain.

**Owner route gate chain (enforced at route registration — NOT in this middleware):**
```
ncPoolFeatureGateMiddleware → ncPoolRfqFeatureGateMiddleware → ncPoolSupplierInviteFeatureGateMiddleware
```

**Supplier route gate:**
```
ncPoolSupplierInviteFeatureGateMiddleware (standalone — no parent gates)
```

**Provisioning requirement:** A supplier org requires a `TenantFeatureOverride` row:
```sql
INSERT INTO public.tenant_feature_overrides (tenant_id, key, enabled, updated_at)
VALUES ('<supplier_org_id>', 'nc.procurement_pools.supplier_invites.enabled', true, NOW())
ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();
```
Without this override, all supplier invite route requests return `503 FEATURE_DISABLED`.

---

## §4 — Middleware Design

**File:** `server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts`

**Export:** `ncPoolSupplierInviteFeatureGateMiddleware`

**Feature flag key constant:**
```typescript
const NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY = 'nc.procurement_pools.supplier_invites.enabled';
```

**Two-layer gate logic:**

| Layer | Check | Block behaviour |
|---|---|---|
| 1 | `FeatureFlag` row must exist with `enabled = true` | `503 FEATURE_DISABLED` |
| 1.5 | `resolvedOrgId` must be resolvable | `503 FEATURE_DISABLED` (fail closed) |
| 2 | `TenantFeatureOverride` row must exist with `enabled = true` for the resolved org | `503 FEATURE_DISABLED` |

**orgId resolution:**
```typescript
request.dbContext?.orgId ?? (request.params as Record<string, unknown>)?.orgId ?? null
```

**Error response (all block paths):**
```typescript
sendError(reply, 'FEATURE_DISABLED', 'Network Commerce procurement pool supplier invite is disabled.', 503)
```

**Catch block:** Logs `nc.pool.supplier_invite.feature_gate.db_error` with `{ event, feature, layer, orgId, errMsg }` and returns `503 FEATURE_DISABLED` (fail closed on DB error).

**Log event names:**
| Path | Event key |
|---|---|
| Layer 1 block (no/disabled global flag) | `nc.pool.supplier_invite.feature_gate.global_blocked` |
| No orgId context | `nc.pool.supplier_invite.feature_gate.no_org_context` |
| Layer 2 block (no/disabled override) | `nc.pool.supplier_invite.feature_gate.org_blocked` |
| Allowed | `nc.pool.supplier_invite.feature_gate.allowed` |
| DB error | `nc.pool.supplier_invite.feature_gate.db_error` |

---

## §5 — Feature Flag Seed

**Migration directory:** `server/prisma/migrations/20260530000000_nc_pool_supplier_invite_feature_flag_seed/`

**Migration file:** `migration.sql`

**Seed row:**
| Column | Value |
|---|---|
| key | `nc.procurement_pools.supplier_invites.enabled` |
| enabled | `false` |
| description | NC Phase 1B global kill-switch for supplier invite sub-feature... |
| value | `NULL` |

**Idempotency:** `ON CONFLICT (key) DO NOTHING`

**Pre-flight check:** Raises `EXCEPTION` if `public.feature_flags` does not exist.

**Post-flight check:** Raises `EXCEPTION` if row not found or `enabled = true` (must default false).

**Migration tracking:** This migration file is present in `server/prisma/migrations/` and will be
recorded in `_prisma_migrations` via `prisma migrate resolve --applied` when applied to production.
`prisma migrate dev` and `prisma db push` are NEVER used (governance rule).

---

## §6 — Unit Tests

**File:** `server/src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts`

**Test framework:** Vitest with `vi.mock('../db/prisma.js', ...)`

**11 test cases:**

| TC | Scenario | Expected result |
|---|---|---|
| TC-001 | Global enabled + tenant override enabled | Allows (no 503, reply not called) |
| TC-002 | Global flag row missing | 503 FEATURE_DISABLED; Layer 2 not attempted |
| TC-003 | Global flag `enabled=false` | 503 FEATURE_DISABLED; Layer 2 not attempted |
| TC-004 | DB throws on global flag read | 503 FEATURE_DISABLED (fail-closed) |
| TC-005 | Global true but no orgId resolvable | 503 FEATURE_DISABLED; Layer 2 not attempted |
| TC-006 | Key assertion | `nc.procurement_pools.supplier_invites.enabled` is queried |
| TC-007 | Parent keys NOT queried | `nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` absent from all Prisma calls |
| TC-008 | Global true, orgId, no override row | 503 FEATURE_DISABLED; override query uses exact key |
| TC-009 | Global true, orgId, override `enabled=false` | 503 FEATURE_DISABLED |
| TC-010 | Global true, orgId, override DB throws | 503 FEATURE_DISABLED (fail-closed) |
| TC-011 | Supplier-only provisioning (OD-6) | Allows; exactly 1 featureFlag query + 1 override query, both using invite key only |

**Validation result:** 11/11 pass (`pnpm -C server exec vitest run src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts`)

---

## §7 — Diff Summary

### Files created (3)

```
server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts
  — NEW: two-layer gate middleware for supplier invite routes

server/prisma/migrations/20260530000000_nc_pool_supplier_invite_feature_flag_seed/migration.sql
  — NEW: idempotent seed for nc.procurement_pools.supplier_invites.enabled (enabled=false)

server/src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts
  — NEW: 11 unit tests covering all gate scenarios
```

### Files modified (2)

```
governance/control/OPEN-SET.md
  — operating note + Last Updated

governance/control/GOVERNANCE-CHANGELOG.md
  — FEATURE_GATE_IMPLEMENTED entry prepended
```

### Files created (governance, 1)

```
governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001.md
  — this document
```

---

## §8 — Allowlist Compliance

| File | Authorization | Status |
|---|---|---|
| `server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts` | FEATURE-GATE-001 scope | ✅ CREATED |
| `server/prisma/migrations/20260530000000_.../migration.sql` | FEATURE-GATE-001 scope | ✅ CREATED |
| `server/src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts` | FEATURE-GATE-001 scope | ✅ CREATED |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001.md` | FEATURE-GATE-001 scope | ✅ CREATED |
| `governance/control/OPEN-SET.md` | FEATURE-GATE-001 scope | ✅ UPDATED |
| `governance/control/GOVERNANCE-CHANGELOG.md` | FEATURE-GATE-001 scope | ✅ UPDATED |

---

## §9 — Hard Guardrails Observed

| Guardrail | Status |
|---|---|
| Zero changes to server/src/ services or routes | ✅ OBSERVED |
| No `prisma migrate dev` / `prisma db push` / `npx prisma` | ✅ OBSERVED |
| `active_delivery_unit` not changed | ✅ OBSERVED — remains HOLD_FOR_AUTHORIZATION |
| `dpp_launch_authorization` not changed | ✅ OBSERVED — remains HOLD_FOR_PARESH_DECISION |
| Middleware does not query `network_pool_rfq_supplier_invites` | ✅ OBSERVED |
| Middleware does not check parent `nc.procurement_pools.enabled` | ✅ OBSERVED |
| Middleware does not check parent `nc.procurement_pools.rfq.enabled` | ✅ OBSERVED |
| Global flag seeded `enabled=false` | ✅ OBSERVED |
| No broad tenant overrides created | ✅ OBSERVED |
| No StateMachineService changes | ✅ OBSERVED |
| No schema.prisma changes | ✅ OBSERVED |

---

## §10 — Validation Evidence

```
tsc --noEmit:           0 errors
vitest run (new tests): 11/11 PASS
vitest run (RFQ tests): 16/16 PASS (no regression)
git status --short:     only allowlisted files modified
```

---

## §11 — Provisioning Contract (OD-6)

### Supplier org provisioning

To grant a supplier org access to supplier invite routes:

```sql
-- Step 1: Ensure global flag is enabled (control-plane operation)
UPDATE public.feature_flags
SET enabled = true, updated_at = NOW()
WHERE key = 'nc.procurement_pools.supplier_invites.enabled';

-- Step 2: Create per-org override for the supplier
INSERT INTO public.tenant_feature_overrides (tenant_id, key, enabled, updated_at)
VALUES ('<supplier_org_id>', 'nc.procurement_pools.supplier_invites.enabled', true, NOW())
ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();
```

### Owner org provisioning (full 3-gate chain)

Owner orgs using the invite workflow need overrides for all three keys:

```sql
-- All three keys must have TenantFeatureOverride rows with enabled=true
-- 1. nc.procurement_pools.enabled
-- 2. nc.procurement_pools.rfq.enabled
-- 3. nc.procurement_pools.supplier_invites.enabled
```

### Deprovision supplier

```sql
UPDATE public.tenant_feature_overrides
SET enabled = false, updated_at = NOW()
WHERE tenant_id = '<supplier_org_id>'
  AND key = 'nc.procurement_pools.supplier_invites.enabled';
```

---

## §12 — What This Packet Does NOT Do

| Excluded item | Reason |
|---|---|
| Service layer (`networkPoolRfqSupplierInvite.service.ts`) | Deferred to SERVICE-001 packet |
| Route files (`poolRfqInvites.ts`, `supplierRfqInvites.ts`) | Deferred to SERVICE/ROUTE packet |
| `server/src/routes/tenant.ts` registration | Deferred to ROUTE packet |
| Applying feature flag seed to production DB | Requires `prisma migrate resolve --applied` — done at deploy time |
| Applying TenantFeatureOverride for any org | Manual provisioning step — never automated by migration |
| Integration tests | Deferred to SERVICE-001/ROUTE packet scope |

---

## §13 — Governance Contract Review

| Contract | Applicable | Finding |
|---|---|---|
| `/shared/contracts/db-naming-rules.md` | No DB schema change | N/A |
| `/shared/contracts/schema-budget.md` | No new model/table | N/A |
| `/shared/contracts/rls-policy.md` | No RLS change | N/A |
| `/shared/contracts/openapi.tenant.json` | No route change | N/A |
| `/shared/contracts/event-names.md` | No event emission | N/A |
| `/shared/contracts/ARCHITECTURE-GOVERNANCE.md` | Middleware follows established gate pattern | PASS |

---

## §14 — Next Authorized Candidate

Recommended next packet:

**`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-OWNER-SERVICE-001`** (or
**`TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SERVICE-001`** if combined)

Scope: Service layer for supplier invite CRUD operations.
Authorization required from Paresh Patel before proceeding.

Split recommendation: A two-packet approach is recommended:
- **OWNER-SERVICE-001** — `sendInvite`, `cancelInvite`, `listInvites` (owner perspective)
- **SUPPLIER-SERVICE-001** — `getInvite`, `acceptInvite`, `declineInvite` (supplier perspective)

Rationale: Owner and supplier operations have different auth contexts, different feature gate chains,
and different privacy envelopes (OD-5). Separating them produces smaller, safer diffs.

---

## §15 — Posture Keys (Unchanged)

```
active_delivery_unit:     HOLD_FOR_AUTHORIZATION   (UNCHANGED)
dpp_launch_authorization: HOLD_FOR_PARESH_DECISION (UNCHANGED)
nc_phase1_status:         FEATURE_GATE_IMPLEMENTED
```
