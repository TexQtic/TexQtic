# TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001

**Status:** IMPLEMENTED_AWAITING_PARESH_VERIFY  
**Date:** 2026-07-03  
**Author:** TexQtic Platform Engineering (Safe-Write Mode)  
**Predecessor:** `governance/TEXQTIC-NC-PHASE1-POOL-SETTLE-001.md` (BLOCKED_PREREQ_MISSING, commit `bcfd689`)

---

## 1. Objective

Deliver the schema-foundation prerequisites required to unblock Packet 20 (`TEXQTIC-NC-PHASE1-POOL-SETTLE-001`).

Scope (this packet only):
- SQL migration creating `public.network_settlement_splits` table, RLS, and grants
- SQL migration seeding `nc.settlement_waterfall.enabled = false` feature flag
- Prisma model `NetworkSettlementSplit` in `schema.prisma`
- `prisma validate` + `prisma generate` + `tsc --noEmit` (all PASS)

Out of scope (NOT in this packet):
- Settlement service (`computePoolSettlementPreview`, `createPoolSettlementSplits`)
- Settlement routes (`POST /pools/:id/settlement/preview`, `POST /pools/:id/settlement/splits`, `POST /pools/:id/settle`)
- Any activation of `nc.settlement_waterfall.enabled`
- Escrow release, payout, or money-movement logic
- Frontend changes
- Packet 21 (not opened)

---

## 2. Authorized Prerequisite Chain

This packet was authorized as Option A in:
`governance/TEXQTIC-NC-PHASE1-POOL-SETTLE-001.md §6`

Blocker record: `bcfd689` (2026-07-03)

---

## 3. Files Changed

| File | Action |
|---|---|
| `server/prisma/migrations/20260535000000_nc_network_settlement_splits/migration.sql` | CREATED |
| `server/prisma/migrations/20260536000000_nc_settlement_waterfall_flag_seed/migration.sql` | CREATED |
| `server/prisma/schema.prisma` | MODIFIED — `NetworkSettlementSplit` model added |

---

## 4. Design Authority

`TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001 §6.12` — `NetworkSettlementSplit` entity spec.

---

## 5. Migration: `20260535000000_nc_network_settlement_splits`

### Table spec
```
network_settlement_splits (
  id                UUID PK DEFAULT gen_random_uuid()
  org_id            UUID NOT NULL FK→organizations.id ON DELETE CASCADE
  entity_type       VARCHAR(30) NOT NULL  CHECK: POOL | SYNDICATE | VCO_CHAIN
  entity_id         UUID NOT NULL         -- soft ref, no FK
  recipient_org_id  UUID NOT NULL FK→organizations.id ON DELETE CASCADE
  waterfall_seq     INTEGER NOT NULL      CHECK: >= 1
  currency          CHAR(3) NOT NULL      CHECK: length(trim) > 0
  gross_amount      DECIMAL(18,6) NOT NULL CHECK: >= 0
  holdback_amount   DECIMAL(18,6) NOT NULL DEFAULT 0   CHECK: >= 0
  penalty_deduction DECIMAL(18,6) NOT NULL DEFAULT 0   CHECK: >= 0
  net_payable       DECIMAL(18,6) NOT NULL CHECK: >= 0
  status            VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                    CHECK: PENDING | TRIGGERED | RELEASED | FAILED
  escrow_account_id UUID NULL             -- no FK (escrow coupling deferred)
  triggered_at      TIMESTAMPTZ NULL
  released_at       TIMESTAMPTZ NULL
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

### Escrow FK decision
`escrow_account_id` is a nullable UUID with NO foreign key. Rationale: `escrow_accounts` table shape is uncertain in Phase 1H (deferred coupling risk confirmed from POOL-SETTLE-001 §3). Service layer must validate existence before setting this field.

### Unique constraint
`UNIQUE(entity_type, entity_id, waterfall_seq)` — prevents duplicate waterfall slots.

### Timing coherence guards
- `released_at` NULL unless `status = 'RELEASED'`
- `triggered_at` NULL unless `status IN ('TRIGGERED', 'RELEASED', 'FAILED')`

### RLS
- `ENABLE ROW LEVEL SECURITY; FORCE ROW LEVEL SECURITY;`
- `texqtic_app` SELECT/INSERT/UPDATE: `org_id::text = current_setting('app.org_id', true)` (same pattern as all NC tables)
- `texqtic_app` DELETE: BLOCKED permanently (`USING (false)`) — audit trail preservation
- `texqtic_admin` SELECT: `app.is_admin = 'true'` GUC

### Grants
`GRANT SELECT, INSERT, UPDATE ON ... TO texqtic_app`  
`GRANT SELECT ON ... TO texqtic_admin`

### Indexes
- `(org_id, entity_type, entity_id)` — primary list pattern
- `(status)` — workflow/monitoring
- `(recipient_org_id)` — reverse lookup
- `(created_at DESC)` — ordered views

---

## 6. Migration: `20260536000000_nc_settlement_waterfall_flag_seed`

Idempotent seed:
```sql
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES ('nc.settlement_waterfall.enabled', false, '...', NULL, NOW())
ON CONFLICT (key) DO NOTHING;
```

Post-flight: asserts `enabled = false`, asserts `nc.procurement_pools.rfq.award.enabled` remains false (QD-AD7 hold).

---

## 7. Prisma Model: `NetworkSettlementSplit`

Added to `server/prisma/schema.prisma` after `NetworkPoolRfqSupplierQuote`.  
Reverse relations added to `organizations` model: `settlementSplitsAsOwner` / `settlementSplitsAsRecipient`.

---

## 8. Validation Results

| Check | Result |
|---|---|
| `pnpm -C server exec prisma validate` | PASS — `The schema at prisma\schema.prisma is valid 🚀` |
| `pnpm -C server exec prisma generate` | PASS — `Generated Prisma Client (v6.1.0)` |
| `tsc --noEmit` (server) | PASS — no output (EXIT 0) |

---

## 9. Guardrails Confirmed

| Guardrail | Status |
|---|---|
| `nc.settlement_waterfall.enabled` seeded false | ✅ ENFORCED — never activated |
| `nc.procurement_pools.rfq.award.enabled` = false | ✅ UNCHANGED |
| DPP = HOLD_FOR_PARESH_DECISION | ✅ UNCHANGED |
| G-022 = HOLD_FOR_PARESH_DECISION | ✅ UNCHANGED |
| Packet 20 implementation (service/routes) | ✅ NOT in this packet |
| Packet 21 | ✅ NOT opened |
| No service files created | ✅ |
| No route files created | ✅ |
| No frontend changes | ✅ |
| No money movement / escrow release | ✅ |
| escrow_account_id: nullable UUID, no FK | ✅ |

---

## 10. Unblocking Packet 20

After this packet is applied and verified, `TEXQTIC-NC-PHASE1-POOL-SETTLE-001` may proceed with:
1. `computePoolSettlementPreview` service method (read-only computation)
2. `createPoolSettlementSplits` service method (writes to `network_settlement_splits`, does NOT trigger escrow)
3. Three routes: preview, splits-create, settle (lifecycle transition `SETTLEMENT_PENDING → SETTLED`)

These are NOT authorized in this packet.

---

## 11. Commit

`feat(network-commerce): add pool settlement schema foundation`
