# TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001

**Packet ID:** TEXQTIC-NC-RUNTIME-FEATURE-GATE-SEMANTICS-ALIGNMENT-001  
**Type:** Backend Runtime Fix + Frontend Error Mapping Fix + Unit Test Alignment  
**Status:** PENDING_PRODUCTION_VERIFY  
**Authorized by:** Paresh Patel (Packet 14 authorization)  
**Date:** 2026-06-02  
**HEAD at closure:** local main (1d52d52 base; new commit pending production verify)  
**Commit message:** `fix(network-commerce): align feature gate runtime semantics`

---

## §1 — Objective

Fix two independently discovered runtime mismatches confirmed by `TEXQTIC-NC-FRONTEND-BACKEND-RUNTIME-ALIGNMENT-AUDIT-001`:

1. **AF-2 (Gate Semantics):** Three NC pool feature gates used non-canonical Layer 2 semantics (`tenantOverride?.enabled !== true`), which blocked ALL tenants without a `tenant_feature_overrides` row — even when the global flag was `enabled=true`. Canonical semantics: no override → **allow**; override `enabled=false` → block.

2. **AF-3 (PoolListSurface Error Mapping):** `PoolListSurface.tsx` detected feature-disabled state by inspecting `err.message` (which `apiClient.ts` hardcodes as `'Service temporarily unavailable. Try again.'` for all 5xx), so `message.includes('FEATURE_DISABLED')` was always `false` — the component fell through to generic error state instead of `feature-disabled` state.

---

## §2 — Root Cause Analysis

### Gate Semantics (AF-2)

`ncPoolSupplierQuoteFeatureGateMiddleware` (Packet 12, reference implementation) uses:

```typescript
if (tenantOverride?.enabled === false) { // BLOCK }
// no override row → falls through → ALLOW
```

The other three gates (`ncPoolFeatureGate`, `ncPoolRfqFeatureGate`, `ncPoolSupplierInviteFeatureGate`) each used the inverse condition:

```typescript
if (tenantOverride?.enabled !== true) { // BLOCK — wrong: blocks when override is null }
```

This required every tenant to have an explicit `tenant_feature_overrides` row with `enabled=true` to access NC features — even when the global flag permitted them. The `supplier_invite` gate additionally showed a symptom where the invite inbox returned 503 for all tenants without a per-tenant override row.

### PoolListSurface Error Mapping (AF-3)

`PoolListSurface.tsx` used a message-string check:
```typescript
if (message.includes('FEATURE_DISABLED') || message.includes('feature')) { setState('feature-disabled'); }
```

`apiClient.ts` (lines ~420-428) always replaces 5xx messages with `'Service temporarily unavailable. Try again.'` before throwing `APIError`. The original message from the backend is never exposed. However, `APIError.code` IS populated from `errorData.error?.code` — so `err instanceof APIError && err.code === 'FEATURE_DISABLED'` is the correct check. This was already the canonical pattern in `SupplierInviteInbox.tsx`.

---

## §3 — Truth Table (Target Semantics — All 4 Gates After Fix)

| Rule | Condition | Result |
|---|---|---|
| 1 | Global flag row missing | 503 FEATURE_DISABLED (fail-closed) |
| 2 | Global flag `enabled=false` | 503 FEATURE_DISABLED |
| 3 | Global `enabled=true` + no orgId | 503 FEATURE_DISABLED (fail-closed) |
| 4 | Global `enabled=true` + orgId + no override | **ALLOW ← key fix** |
| 5 | Global `enabled=true` + orgId + override `enabled=true` | ALLOW |
| 6 | Global `enabled=true` + orgId + override `enabled=false` | 503 FEATURE_DISABLED |
| 7 | DB error (either layer) | 503 FEATURE_DISABLED (fail-closed) |

Rule 4 is the key fix. Before this packet, Rule 4 produced 503 for all three non-canonical gates.

---

## §4 — Files Changed

### Backend Middleware (3 files — Layer 2 condition fix)

| File | Change |
|---|---|
| `server/src/middleware/ncPoolFeatureGate.middleware.ts` | Layer 2 restructured: fail-closed no-orgId guard moved before override query; `!== true` → `=== false`; jsdoc updated. |
| `server/src/middleware/ncPoolRfqFeatureGate.middleware.ts` | Layer 2 `!== true` → `=== false`; jsdoc updated; no-orgId fail-closed guard was already correct. |
| `server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts` | Layer 2 `!== true` → `=== false`; jsdoc updated; no-orgId fail-closed guard was already correct. |

**Not changed (reference implementation):** `server/src/middleware/ncPoolSupplierQuoteFeatureGate.middleware.ts` — already canonical.

### Unit Tests (3 files)

| File | Change |
|---|---|
| `server/src/__tests__/ncPoolFeatureGate.middleware.unit.test.ts` | **NEW FILE** — 11 tests covering canonical gate semantics (TC-001 through TC-011). |
| `server/src/__tests__/ncPoolRfqFeatureGate.middleware.unit.test.ts` | TC-012 updated: no override → ALLOW (was 503); TC-016 redesigned: explicit disable for authenticated org → 503 (was: no override → 503). Header comment updated. |
| `server/src/__tests__/ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts` | TC-008 updated: no override → ALLOW (was 503). Header comment updated. |

### Frontend (1 file)

| File | Change |
|---|---|
| `components/Tenant/NetworkCommerce/PoolListSurface.tsx` | Added `import { APIError } from '../../../services/apiClient'`. Replaced message-based catch with `err instanceof APIError && (err.code === 'FEATURE_DISABLED' \|\| err.status === 503)` check — canonical pattern matching `SupplierInviteInbox.tsx`. |

---

## §5 — Files NOT Changed

- `server/src/middleware/ncPoolSupplierQuoteFeatureGate.middleware.ts` — reference canonical, unchanged
- `server/prisma/schema.prisma` — no schema change
- `server/prisma/migrations/` — no migration
- `api/index.ts` — no route change
- `App.tsx` — unchanged
- `.env` / `.env.local` — not touched
- All DPP-related files — unchanged (HOLD_FOR_PARESH_DECISION preserved)
- FE-8 (`TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001`) — NOT implemented (BLOCKED_PARESH_AUTHORIZATION_REQUIRED preserved)

---

## §6 — Validation Results

| Suite | Result |
|---|---|
| `pnpm -C server exec tsc --noEmit` | PASS — zero errors |
| `pnpm run typecheck` (frontend) | PASS — zero errors |
| Gate unit tests (4 files, 49 tests) | PASS — 49/49 |
| Runtime routing tests (20 tests) | PASS — 20/20 |
| Frontend tests (4 files, 31 tests) | PASS — 31/31 |

**Gate unit test detail:**
- `ncPoolFeatureGate.middleware.unit.test.ts` — 11/11 (new file, all canonical cases)
- `ncPoolRfqFeatureGate.middleware.unit.test.ts` — 16/16 (TC-012 + TC-016 updated)
- `ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts` — 11/11 (TC-008 updated)
- `ncPoolSupplierQuoteFeatureGate.middleware.unit.test.ts` — 11/11 (unchanged, reference)

No regression test failures. No schema or migration changes required.

---

## §7 — Production Constraint Remaining (Not Fixed By This Packet)

This packet fixes the gate code semantics and frontend error mapping. **It does NOT fix the production DB gap.**

`nc.procurement_pools.enabled` is ABSENT from the production `feature_flags` table. Until it is seeded, Layer 1 of `ncPoolFeatureGate.middleware` will continue to return 503 for all pool-owner routes, regardless of the Layer 2 fix.

**Required next action (Paresh must authorize and execute):**

```sql
-- Seed global pool flag as enabled (via psql using DATABASE_URL)
INSERT INTO feature_flags (key, enabled, description, created_at, updated_at)
VALUES (
  'nc.procurement_pools.enabled',
  true,
  'NC Phase 1: procurement pools feature — global enable',
  NOW(),
  NOW()
)
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();
```

This is the subject of the recommended next packet: `TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001`.

---

## §8 — Governance Posture Preserved

| Item | Posture | Status |
|---|---|---|
| DPP Passport Network launch authorization | `HOLD_FOR_PARESH_DECISION` | UNCHANGED |
| FE-8 TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001 | `BLOCKED_PARESH_AUTHORIZATION_REQUIRED` | UNCHANGED |
| FE-11 NC Pool Oversight | `HOLD_FOR_PARESH_DECISION` | UNCHANGED |
| White Label Co | `REVIEW-UNKNOWN` | UNCHANGED |

---

## §9 — What This Packet Does NOT Do

- Does NOT provision `nc.procurement_pools.enabled` in production DB
- Does NOT provision `nc.procurement_pools.rfq.enabled` in production DB
- Does NOT implement FE-8 supplier quote UI
- Does NOT modify any Prisma schema or migration
- Does NOT modify any route or service business logic
- Does NOT add any new API endpoints
- Does NOT change the DPP launch gate posture
- Does NOT unlock FE-11 (NC Pool Oversight)

---

## §10 — Recommended Next Packet

`TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001` — Seed `nc.procurement_pools.enabled=true` and `nc.procurement_pools.rfq.enabled=true` in production DB via psql. Requires Paresh authorization and execution. This is a pure production DB provisioning operation — no code changes.

---

## §11 — Authority References

- Audit basis: `governance/TEXQTIC-NC-FRONTEND-BACKEND-RUNTIME-ALIGNMENT-AUDIT-001.md` §8 (AF-2, AF-3)
- Reference canonical gate: `server/src/middleware/ncPoolSupplierQuoteFeatureGate.middleware.ts`
- Canonical frontend pattern: `components/Tenant/NetworkCommerce/SupplierInviteInbox.tsx` (error mapping)
- apiClient export: `services/apiClient.ts` line ~219 (`export class APIError`)
