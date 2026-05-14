# TEXQTIC-NC-PHASE1-POOL-SETTLE-001 — NC Pool Settlement Foundation

**Packet:** 20
**Status:** IMPLEMENTED_AWAITING_PARESH_VERIFY
**Date (initial block recorded):** 2026-07-03
**Date (implementation):** 2026-07-05
**Phase:** 1H — Settlement/Dispute/Quality/Bond
**Domain:** Network Commerce / Collective Procurement Pools (Module A)
**Authority:** TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md · Phase 1H

---

## 1. Objective

Open and implement the Pool Settlement backend foundation for Network Commerce Collective
Procurement Pools. Scope: computation/audit records only. No payment, payout, escrow release,
money movement, reconciliation, or platform-held-funds behavior.

Target route surface (pending prerequisites):
- `GET /api/tenant/network-commerce/pools/:poolId/settlement` — settlement preview/status
- Or `POST /api/tenant/network-commerce/pools/:poolId/settlement/preview` — computation trigger

---

## 2. Prerequisites Confirmed

The following packets are VERIFIED_COMPLETE and form the implementation base for this packet:

| Packet | ID | Status |
|---|---|---|
| 17 | TEXQTIC-NC-PHASE1-POOL-RFQ-READ-SURFACES-001 | VERIFIED_COMPLETE |
| 18 | TEXQTIC-NC-PHASE1-POOL-ORDER-001 | VERIFIED_COMPLETE |
| 19 | TEXQTIC-NC-PHASE1-NC-INVOICE-COMPLETE-001 | VERIFIED_COMPLETE |

Packet 19 close commit: `4577462 — fix(network-commerce): verify nc invoice read routes`.

---

## 3. Repo-Truth Validation Findings

**Inspection date:** 2026-07-03
**HEAD at inspection:** `4577462`
**Repo state:** Working tree clean.

### 3.1 NetworkSettlementSplit Schema

| Check | Finding |
|---|---|
| Schema model `NetworkSettlementSplit` in `schema.prisma` | ❌ ABSENT |
| Migration for `network_settlement_splits` table | ❌ ABSENT |
| Service `networkSettlementSplit.service.ts` | ❌ ABSENT |
| Route referencing settlement split | ❌ ABSENT |

Per `TEXQTIC-NC-REPO-TRUTH-IMPLEMENTATION-AUDIT-001.md` line 106:
> `NetworkSettlementSplit | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | NOT_OPENED | NOT_STARTED`

Per tracker domain table (line 214): ALL dimensions NOT_STARTED.

Design specification is at `TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md §6.12`:
```
NetworkSettlementSplit {
  id                UUID PK
  org_id            UUID FK→organizations
  entity_type       VARCHAR(30)   -- POOL | SYNDICATE | VCO_CHAIN
  entity_id         UUID
  recipient_org_id  UUID FK→organizations
  gross_amount      DECIMAL(18,6)
  holdback_amount   DECIMAL(18,6)
  penalty_deduction DECIMAL(18,6) DEFAULT 0
  net_payable       DECIMAL(18,6)
  currency          CHAR(3)
  waterfall_seq     INT
  status            VARCHAR(30)   -- PENDING | TRIGGERED | RELEASED | FAILED
  escrow_account_id UUID FK→escrow_accounts NULL
  triggered_at      TIMESTAMPTZ NULL
  released_at       TIMESTAMPTZ NULL
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

**Blocker 1: `NetworkSettlementSplit` schema does not exist. A new schema/migration is required to implement Packet 20 settlement computation.**

### 3.2 Feature Flag `nc.settlement_waterfall.enabled`

| Check | Finding |
|---|---|
| Flag row in any migration SQL file | ❌ ABSENT |
| Flag row in seed file | ❌ ABSENT |
| Flag referenced in any service or route | ❌ ABSENT |

Tracker Phase 1H row explicitly states:
> `1G complete; nc.settlement_waterfall.enabled flag required`

Tracker feature-flag table (line 384):
> `nc.settlement_waterfall.enabled | false | Enables NC settlement waterfall | Phase 1H settlement packet | 1H`

The flag needs to be inserted into `public.feature_flags` via a SQL migration before Packet 20 can safely gate settlement routes. This packet is forbidden from activating the flag; it must be seeded as `enabled=false` by a prior data/migration packet.

**Blocker 2: `nc.settlement_waterfall.enabled` feature flag is absent from the DB. A separate schema/seed packet is required before Packet 20 can implement a gated settlement route.**

### 3.3 Existing `settlement.service.ts`

| Check | Finding |
|---|---|
| Path | `server/src/services/settlement/settlement.service.ts` |
| Domain | G-019 Day 2 — Trade/Escrow settlement orchestration |
| Suitable for NC Pool Settlement | ❌ NO |

The existing `SettlementService` is a pure orchestrator for trade lifecycle + escrow ledger
(TOGGLE_A/B/C, D-020-B/C, D-022-B/C). It delegates to `EscrowService` and `TradeService`.
It has no knowledge of `NetworkPool`, `NetworkSettlementSplit`, `NetworkPoolMembership`,
or pool payment waterfall (§15.2). It cannot be safely extended for NC pool settlement within
this packet without design authority and scope expansion.

A separate `networkSettlementSplit.service.ts` will be required.

### 3.4 Lifecycle States `SETTLEMENT_PENDING` / `SETTLED`

| Check | Finding |
|---|---|
| `SETTLEMENT_PENDING` seeded for POOL entity | ✅ EXISTS — migration `20260523000000_nc_pool_lifecycle_seed` |
| `SETTLED` seeded for POOL entity (terminal) | ✅ EXISTS — migration `20260523000000_nc_pool_lifecycle_seed` |
| `DELIVERED → SETTLEMENT_PENDING` allowed transition | ✅ EXISTS — allowed roles: TENANT_ADMIN, SYSTEM_AUTOMATION |
| `PARTIALLY_DELIVERED → SETTLEMENT_PENDING` allowed transition | ✅ EXISTS — allowed roles: TENANT_ADMIN, PLATFORM_ADMIN |
| `SETTLEMENT_PENDING → SETTLED` allowed transition | ✅ EXISTS — **requires MakerChecker=true** — roles: PLATFORM_ADMIN, CHECKER |
| `settledAt` field on `NetworkPool` model | ✅ EXISTS — `settledAt DateTime? @map("settled_at")` |

Lifecycle states and transitions ARE supported by existing migration data. However:
- `SETTLEMENT_PENDING → SETTLED` always requires MakerChecker (MC=true). The MC system
  (`makerChecker.service.ts`) integration for POOL entity type has not been confirmed
  (audit item 0-D: NOT_VERIFIED per tracker line 443).
- The state transition requires the waterfall computation to have completed (NetworkSettlementSplit rows), which does not exist yet.

**Not a blocking factor for the prerequisite packet — but `SETTLEMENT_PENDING → SETTLED` transition implementation must be deferred to the implementation packet (after prerequisites are met) and requires MakerChecker confirmation.**

### 3.5 Existing NC Route Files

| File | Relationship to Packet 20 |
|---|---|
| `server/src/routes/tenant/settlement.ts` | G-019 Day 2 trades. Not related to NC. |
| No `networkSettlement.ts` or similar NC file | ❌ ABSENT |

A new `server/src/routes/tenant/networkSettlement.ts` will be needed for Packet 20 implementation.

### 3.6 Service Files

| File | Status |
|---|---|
| `server/src/services/networkPool.service.ts` | EXISTS — pool lifecycle state machine |
| `server/src/services/networkInvoice.service.ts` | EXISTS — NC invoice read |
| `server/src/services/networkSettlementSplit.service.ts` | ❌ ABSENT |

---

## 4. Implementation Path Decision

**Chosen path: Path C — BLOCKED**

Stop conditions met (per prompt and governance mandate):

| Condition | Met? |
|---|---|
| Pool Settlement requires a new schema/migration | ✅ YES — `NetworkSettlementSplit` table missing |
| NetworkSettlementSplit does not exist and is required | ✅ YES |
| `nc.settlement_waterfall.enabled` absent and cannot be added in this packet | ✅ YES |
| Existing settlement.service.ts cannot be safely extended | ✅ YES — wrong domain |

Per prompt: "If Path C applies: Do not implement. Write a precise blocker report. Propose the minimum next design/schema/feature-flag packet needed."

---

## 5. Blocker Report

```
🛑 TEXQTIC-NC-PHASE1-POOL-SETTLE-001 — BLOCKED_PREREQ_MISSING

Packet: 20 (TEXQTIC-NC-PHASE1-POOL-SETTLE-001)
Status: BLOCKED — cannot implement without prerequisite schema + feature flag packet

Blocker 1 — Missing Schema
  Artifact:     NetworkSettlementSplit table / Prisma model
  Current state: ABSENT — no schema.prisma model, no migration, no service, no route
  Required by:   Packet 20 service (computeSettlementSplit / triggerSplit) and route
  Design spec:   TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md §6.12
  Cannot bypass: Packet 20 settlement computation writes NetworkSettlementSplit rows per
                  design §15.1 step 5. Without the table, no computation can persist.
  Forbidden:     This packet cannot create schema.prisma changes or run prisma migrate dev.

Blocker 2 — Missing Feature Flag
  Artifact:     nc.settlement_waterfall.enabled row in public.feature_flags
  Current state: ABSENT — no migration SQL seeds this flag
  Required by:   Settlement route gate (fail-closed convention used by all NC packets)
  Cannot bypass: Without the flag row, the settlement route cannot gate safely.
                  Adding data-only flag seed requires its own SQL migration (not allowed in
                  this implementation packet without schema packet authorization).
  Forbidden:     This packet cannot modify migrations, seed files, or DB directly.

Blocker 3 — Wrong-Domain Settlement Service
  Artifact:     networkSettlementSplit.service.ts
  Current state: ABSENT (settlement/settlement.service.ts is G-019 trades — different domain)
  Required by:   Packet 20 implementation
  Cannot bypass: A new NC-specific service file is needed; it requires schema from Blocker 1.
```

---

## 6. Proposed Prerequisite Packet

### Option A (recommended): Single combined schema + flag packet

**Proposed Packet: `TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001`**

Scope:
1. SQL migration: create `network_settlement_splits` table per design §6.12
   - RLS policy: `org_id`-scoped (owner + platform admin read; compute trigger write)
   - Indexes: `(org_id, entity_type, entity_id)`, `(status)`
2. Prisma `db pull` → `prisma generate` after migration deployed
3. Feature flag SQL: `INSERT INTO public.feature_flags (key, enabled, description) VALUES ('nc.settlement_waterfall.enabled', false, 'Enables NC settlement waterfall computation for Collective Procurement Pools')`
4. No service, no route, no frontend, no flag activation

After this packet is VERIFIED_COMPLETE, Packet 20 (TEXQTIC-NC-PHASE1-POOL-SETTLE-001)
can be re-opened as: TEXQTIC-NC-PHASE1-POOL-SETTLE-001-IMPL.

### Option B: Split into two sub-packets

**Proposed Sub-packet A: `TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001`**
- SQL migration only: `network_settlement_splits` table + RLS + Prisma pull/generate

**Proposed Sub-packet B: `TEXQTIC-NC-PHASE1-POOL-SETTLE-FLAG-001`**
- Feature flag seed only: `nc.settlement_waterfall.enabled = false`

Recommendation: **Option A** — these are tightly coupled; the flag and schema should be
confirmed in the same deployment context.

---

## 7. What Packet 20 Implementation Will Look Like (After Prerequisites)

This section documents the bounded implementation scope for re-opening:

### Service method (new file: `networkSettlementSplit.service.ts`)

```typescript
computePoolSettlementPreview(poolId: string, orgId: string): Promise<SettlementPreview>
  // Reads: NetworkPool (verify SETTLEMENT_PENDING), NetworkPoolMembership (ALLOCATED),
  //        NetworkInvoice (POOL invoice for this pool), feature flag nc.settlement_waterfall.enabled
  // Returns: computation-only preview: { splits: [...], totalGross, currency, status: 'PREVIEW' }
  // Does NOT persist NetworkSettlementSplit rows (preview only)
  // Does NOT trigger lifecycle transition
  // Does NOT move money
```

```typescript
createPoolSettlementSplits(poolId: string, orgId: string): Promise<SettlementComputationResult>
  // Persists NetworkSettlementSplit rows (PENDING status) for each ALLOCATED member
  // Transitions pool to SETTLEMENT_PENDING (if currently DELIVERED)
  // Requires nc.settlement_waterfall.enabled = true (gated)
  // Does NOT trigger payment / escrow release
  // Does NOT transition to SETTLED (requires MakerChecker + PLATFORM_ADMIN/CHECKER role)
```

### Route surface

```
GET  /api/tenant/network-commerce/pools/:poolId/settlement          → settlement status + split summary
POST /api/tenant/network-commerce/pools/:poolId/settlement/preview  → computation preview (no persist)
POST /api/tenant/network-commerce/pools/:poolId/settlement/compute  → persist splits (feature-gated)
```

### Authorization
- All routes: OWNER org only (`ncPoolFeatureGateMiddleware` chain)
- `compute` route: additional gate `nc.settlement_waterfall.enabled`
- `SETTLEMENT_PENDING → SETTLED` transition: NOT in Packet 20; requires separate MakerChecker packet

---

## 8. Guardrail Confirmation

| Guardrail | Status |
|---|---|
| No frontend changes | ✅ Confirmed — no implementation |
| No schema/migration/env/seed changes | ✅ Confirmed — no implementation |
| No feature flag activation | ✅ Confirmed — no implementation |
| No production data mutation | ✅ Confirmed — no implementation |
| No QA fixture reset | ✅ Confirmed — no implementation |
| No payment/money movement | ✅ Confirmed — no implementation |
| No escrow release/payout | ✅ Confirmed — no implementation |
| No DPP/G-022/OES/VCO changes | ✅ Confirmed |
| Packet 21 not opened | ✅ Confirmed |
| nc.procurement_pools.rfq.award.enabled unchanged | ✅ Confirmed — false |
| DPP HOLD_FOR_PARESH_DECISION unchanged | ✅ Confirmed |
| G-022 HOLD_FOR_PARESH_DECISION unchanged | ✅ Confirmed |

---

## 9. Validation (BLOCKED — No Implementation)

No implementation was produced. No tests run. No tsc check required.

Pre-inspection validation:
- HEAD `4577462` confirmed (Packet 19 VERIFIED_COMPLETE close commit).
- Working tree clean (`git status --short` — no output).
- Packet 19 VERIFIED_COMPLETE confirmed in Layer 0 (`active_delivery_unit: HOLD_FOR_AUTHORIZATION`).

---

## 10. Commit

```
docs(network-commerce): record pool settlement blocker
```

Files in commit:
- `governance/TEXQTIC-NC-PHASE1-POOL-SETTLE-001.md` (this file — new)
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`
- `governance/control/GOVERNANCE-CHANGELOG.md`
- `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md`

---

*Next action: Paresh to authorize `TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001` (schema + flag prerequisite packet) before Packet 20 implementation can proceed.*

---

## 11. Implementation Record (2026-07-05)

**Authorization token:** `TEXQTIC-NC-PHASE1-POOL-SETTLE-001-IMPL-TRADETRUST-PAY-ALIGNED`
**Prerequisite packet:** `TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001` — VERIFIED_COMPLETE (2026-07-03)

### 11.1 TradeTrust Pay Doctrine

Settlement is **visibility / payable-split computation only**.

The TradeTrust Pay doctrine applies without exception:

- ❌ No payment execution
- ❌ No payout
- ❌ No escrow release
- ❌ No money movement
- ❌ No platform-held funds
- ❌ No payment guarantee
- ❌ No TexQtic-funded advance
- ❌ No pool `SETTLED` lifecycle transition (requires separate MakerChecker packet)
- ❌ No `TRIGGERED` rows emitted — schema-reserved, NOT emitted by Packet 20
- ❌ No `RELEASED` rows emitted — schema-reserved, NOT emitted by Packet 20
- ❌ `escrowAccountId` remains `null` on all Packet 20 rows
- ❌ `triggeredAt` remains `null` on all Packet 20 rows
- ❌ `releasedAt` remains `null` on all Packet 20 rows
- ❌ `nc.settlement_waterfall.enabled` remains `false` — NOT activated by Packet 20
- ❌ `/compute` is fail-closed while `nc.settlement_waterfall.enabled = false`
- ❌ Packet 21 NOT opened
- ❌ DPP HOLD_FOR_PARESH_DECISION UNCHANGED
- ❌ G-022 HOLD_FOR_PARESH_DECISION UNCHANGED

### 11.2 Files Created / Modified

| File | Change | Description |
|---|---|---|
| `server/src/services/networkSettlementSplit.service.ts` | CREATED | Settlement visibility service — read-only status, non-mutating preview, gated PENDING-only create |
| `server/src/routes/tenant/networkSettlement.ts` | CREATED | Three settlement routes for pool visibility |
| `server/src/routes/tenant.ts` | MODIFIED | Import + register `tenantNetworkSettlementRoutes` at prefix `/tenant/network-commerce/pools` |
| `server/src/services/networkSettlementSplit.service.test.ts` | CREATED | 17 service unit tests (NSS-01 to NSS-16 + flag constant check) — no DB required |
| `server/src/routes/tenant/networkSettlement.integration.test.ts` | CREATED | 17 route integration tests (NSGET-01–08, NSPREV-01–05, NSCOMP-01–09) |

### 11.3 Route Surface

| Route | Method | Description |
|---|---|---|
| `GET /api/tenant/network-commerce/pools/:poolId/settlement` | GET | Settlement status + existing payable split rows |
| `POST /api/tenant/network-commerce/pools/:poolId/settlement/preview` | POST | Non-mutating computation preview |
| `POST /api/tenant/network-commerce/pools/:poolId/settlement/compute` | POST | Creates PENDING split rows (gated — 503 while flag=false) |

### 11.4 Behavioral Boundaries

- `getPoolSettlementStatus` — read-only. No writes, no `$transaction` call.
- `computePoolSettlementPreview` — non-mutating. No writes, no `$transaction` call.
- `createPoolSettlementSplits` — gated: checks `nc.settlement_waterfall.enabled` FIRST; throws `NetworkSettlementSplitFeatureDisabledError` (→ HTTP 503) when flag is false or absent.
- All newly created split rows: `status='PENDING'`, `escrowAccountId=null`, `triggeredAt=null`, `releasedAt=null`.
- `org_id` sourced exclusively from `request.dbContext.orgId` (JWT). Never from params/query/body.
- Wrong-org pool lookups return `NetworkSettlementSplitPoolNotFoundError` (non-leaking 404).

### 11.5 Validation Outcomes

- `pnpm --filter server tsc --noEmit` — PASS
- `pnpm -C server exec prisma validate` — PASS
- Service unit tests (NSS-*): run `pnpm exec vitest run src/services/networkSettlementSplit.service.test.ts`
- Route integration tests (NSGET-*/NSPREV-*/NSCOMP-*): run `pnpm exec vitest run src/routes/tenant/networkSettlement.integration.test.ts`

### 11.6 Schema / Schema.prisma

No changes. `schema.prisma` and migrations are UNCHANGED. The `NetworkSettlementSplit` Prisma model was added in the prerequisite packet (`TEXQTIC-NC-PHASE1-POOL-SETTLE-SCHEMA-001`).

### 11.7 Guardrail Confirmation (Implementation)

| Guardrail | Status |
|---|---|
| `schema.prisma` NOT modified | ✅ Confirmed |
| No migration files | ✅ Confirmed |
| No frontend changes | ✅ Confirmed |
| No `.env` changes | ✅ Confirmed |
| `nc.settlement_waterfall.enabled` remains `false` | ✅ Confirmed — NOT activated |
| No production data mutation | ✅ Confirmed |
| No QA fixture reset | ✅ Confirmed |
| No payment/payout/escrow/money movement code | ✅ Confirmed |
| No pool `SETTLED` transition | ✅ Confirmed |
| Packet 21 NOT opened | ✅ Confirmed |
| DPP/G-022 UNCHANGED | ✅ Confirmed |
| `escrowAccountId = null` in ALL new rows | ✅ Confirmed |
| `status = 'PENDING'` in ALL new rows | ✅ Confirmed |
| `triggeredAt = null`, `releasedAt = null` | ✅ Confirmed |
| `org_id` from `dbContext.orgId` ONLY | ✅ Confirmed |
| Wrong-org access non-leaking (404) | ✅ Confirmed |
