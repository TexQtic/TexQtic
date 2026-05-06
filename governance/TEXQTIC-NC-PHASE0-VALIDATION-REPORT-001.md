# TEXQTIC-NC-PHASE0-VALIDATION-REPORT-001

**Document type:** Phase 0 foundation seam validation report  
**Task ID:** TEXQTIC-NC-PHASE0-FOUNDATION-001  
**Mode:** Read-only inspection. No schema changes, no migrations, no code changes implemented.  
**Status:** COMPLETE — all 5 seams inspected (schema + service layer)  
**Date:** 2025-07-28  
**Prepared by:** GitHub Copilot Agent (read-only inspection mode)  
**Authorizing context:** NC Design Foundation `c019bbbd`; task authorized by Paresh Patel

---

## 1. Executive Summary

Five seams of the existing TexQtic platform were inspected to determine whether the Network Commerce (NC) Phase 1 implementation can proceed cleanly on top of the current foundation. Three seams are structurally clean; two require planned schema and service extensions before Phase 1 modules can write any data.

| Seam | Verdict | Type | Phase Required |
|------|---------|------|----------------|
| 0-A LifecycleState + StateMachine | ⚠️ CLEAN SCHEMA / CODE CHANGE REQUIRED | Service dispatch gap | Phase 1 pre-work |
| 0-B NetworkLifecycleLog pattern | ✅ CLEAN | New table + dispatch branch | Phase 1 additive |
| 0-C Invoice extension | ⚠️ SCHEMA DELTA + SERVICE CHANGE REQUIRED | invoices.trade_id mandatory | Phase 1 pre-work |
| 0-D MakerChecker | ✅ CLEAN | Data rows only | Phase 1 ready |
| 0-E Multi-party escrow | ⚠️ SCHEMA EXTENSION REQUIRED | Bilateral-only model | Phase 2 (OES) pre-work |

**Critical path for Phase 1:** Seams 0-A (service dispatch) and 0-C (invoice schema + service) must be resolved before any NC Phase 1 (CPP module) entity can reach a lifecycle state or generate an invoice. These are pre-work items, not blockers to design completion.

---

## 2. Task Scope and Authorization

**Task:** TEXQTIC-NC-PHASE0-FOUNDATION-001  
**Authorization level:** Read-only inspection + planning artifact creation only  
**Allowed actions:** File reads, pattern inspection, this report  
**Forbidden in this task:** Schema changes, migrations, API changes, UI changes, runtime behavior changes, dependency changes, refactoring

**Artifacts read during this inspection:**
- `server/prisma/schema.prisma` (lines 480–1600)
- `server/src/services/stateMachine.service.ts` (full file)
- `server/src/services/makerChecker.service.ts` (full file)
- `server/src/services/escrow.service.ts` (full file)
- `server/src/services/invoice.service.ts` (lines 1–450)
- `governance/TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001.md` (all 25 sections)

---

## 3. Methodology

Each seam was inspected in two passes:

1. **Schema pass:** Read `schema.prisma` for the relevant model(s). Identify column types, constraints, FKs, unique indexes, and whether entity type discriminants are DB enums or plain strings.

2. **Service pass:** Read the governing service file. Identify whether entity type values are validated against a hardcoded set, whether dispatch branches exist per entity type, and what the minimal code change surface would be to accommodate new NC entity types.

The seam definitions from NC Design Foundation Section 21 were used as the specification for each pass.

---

## 4. Seam 0-A: LifecycleState + StateMachine Dispatch

### 4.1 Seam Definition (NC Design §21, Step 0-A)

> Confirm `LifecycleState` supports new entity types `POOL`, `SYNDICATE`, `VCO_CHAIN`

### 4.2 Schema Finding — ✅ CLEAN (data rows only)

`LifecycleState.entityType` (`lifecycle_states.entity_type`) is a plain `String` field, not a DB enum. No `ALTER TYPE` migration is required to register `POOL`, `SYNDICATE`, `VCO_CHAIN` as valid entity types. New rows can be inserted via the G-020 seed script.

`AllowedTransition.entityType` (`allowed_transitions.entity_type`) is equally a plain `String`. Adding NC transition rules requires SQL `INSERT` statements only — no schema migration.

Both `LifecycleState` and `AllowedTransition` lookups in `StateMachineService.transition()` are fully data-driven:

```typescript
// From stateMachine.service.ts — generic DB lookup; no entityType hardcoding
const fromState = await this.db.lifecycleState.findUnique({
  where: { entityType_stateKey: { entityType: normalizedEntityType, stateKey: normalizedFromState } },
});
const allowedTransition = await this.db.allowedTransition.findUnique({
  where: { entityType_fromStateKey_toStateKey: { entityType, fromStateKey, toStateKey } },
});
```

Sanctions checks (`checkEntitySanction`) and escalation freeze checks (`checkEntityFreeze`) are also generic — they accept any `entityType` string.

### 4.3 Service Finding — ⚠️ CODE CHANGE REQUIRED

**Critical gap:** The log dispatch block in `StateMachineService.transition()` is a hardcoded `if/else if` chain across exactly four entity types: `TRADE`, `ESCROW`, `CERTIFICATION`, `ORDER`. After all four branches, the guard is:

```typescript
// From stateMachine.service.ts — confirmed in file
return denied(
  'TRANSITION_NOT_PERMITTED',
  `Unhandled entityType: '${normalizedEntityType}'. This is an implementation gap.`
);
```

**Effect:** If `entityType = 'POOL'` or `'SYNDICATE'` or `'VCO_CHAIN'` is passed to `transition()`, the lifecycle state lookup and transition authorization checks succeed (data-driven), but **the log write is blocked** and the call returns `DENIED` with `TRANSITION_NOT_PERMITTED`. No log is written. No state change is applied.

**Required code change (Phase 1 pre-work):**  
Add three new dispatch branches to `StateMachineService.transition()`:

```
if (normalizedEntityType === 'POOL')      → write to NetworkLifecycleLog (entityType='POOL', entityId=entityId)
if (normalizedEntityType === 'SYNDICATE') → write to NetworkLifecycleLog (entityType='SYNDICATE', entityId=entityId)
if (normalizedEntityType === 'VCO_CHAIN') → write to NetworkLifecycleLog (entityType='VCO_CHAIN', entityId=entityId)
```

Each branch follows the identical log write pattern as the `TRADE` / `ESCROW` / `CERTIFICATION` branches. This is additive code (no existing branch is modified).

### 4.4 Delta Classification

| Layer | Delta Type | Work Required |
|-------|-----------|---------------|
| DB schema | None | No migration |
| DB seed | New rows | lifecycle_states + allowed_transitions rows for POOL/SYNDICATE/VCO_CHAIN |
| Service code | Additive | 3 new dispatch branches in StateMachineService.transition() |
| Governance | NC-PHASE1-STATEMACHINE-EXTENSION-001 | New task packet |

---

## 5. Seam 0-B: NetworkLifecycleLog Pattern

### 5.1 Seam Definition (NC Design §21, Step 0-B)

> Confirm `NetworkLifecycleLog` pattern maps cleanly to existing lifecycle log shape

### 5.2 Finding — ✅ CLEAN (new table + dispatch branch; no structural gap)

**Canonical lifecycle log pattern** (established by `TradeLifecycleLog`, confirmed by `EscrowLifecycleLog` and `CertificationLifecycleLog`):

```
id, orgId, entityId (soft FK), fromStateKey, toStateKey,
actorUserId, actorAdminId, actorType, actorRole,
escalationLevel, makerUserId, checkerUserId,
aiTriggered, impersonationId, reason (NOT NULL), requestId, createdAt
```

**Total: 17 columns (23 including computed/auto fields).**

Three immutability layers:
1. StateMachineService: no update/delete methods
2. DB trigger: prevent mutation on log table
3. RLS: `UPDATE/DELETE USING (false)`

**NC Design Section 6.13 proposed shape:**

The proposed `NetworkLifecycleLog` uses a polymorphic `entityType` + `entityId` pair instead of a specific FK (`tradeId`, `escrowId`, `certificationId`). This is a **clean fit** for the NC context — a single log table covering `POOL`, `SYNDICATE`, `VCO_CHAIN` entity types via polymorphic reference.

**Implementation path:**
1. New DB table `network_lifecycle_logs` with columns matching the canonical 23-field pattern, replacing the entity-specific FK with `entity_type VARCHAR` + `entity_id UUID`.
2. New Prisma model `NetworkLifecycleLog` in `schema.prisma`.
3. Three new dispatch branches in `StateMachineService.transition()` (see Seam 0-A).

**Divergence note — `invoice_lifecycle_logs`:**  
`invoice_lifecycle_logs` does NOT follow the canonical 23-field pattern. It is a simplified schema (no `makerUserId`, `checkerUserId`, `aiTriggered`, `impersonationId`; `reason` may be nullable). The `NetworkLifecycleLog` design **must reference `TradeLifecycleLog` as the canonical pattern** — not `invoice_lifecycle_logs`. The NC Design Foundation document should be amended (in the Phase 1 packet) to make this explicit.

### 5.3 Delta Classification

| Layer | Delta Type | Work Required |
|-------|-----------|---------------|
| DB schema | New table | network_lifecycle_logs (canonical 23-field pattern, polymorphic entity ref) |
| Prisma schema | New model | NetworkLifecycleLog in schema.prisma |
| Service code | Additive | Dispatch branches per Seam 0-A |
| DB constraints | New | DB trigger (immutability) + RLS policy (USING false) |

---

## 6. Seam 0-C: Invoice Extension

### 6.1 Seam Definition (NC Design §21, Step 0-C)

> Confirm `invoice.service.ts` can handle `POOL_ORDER` invoice type extension

### 6.2 Schema Finding — ⚠️ SCHEMA DELTA REQUIRED

The `invoices` model has the following structural constraints that are incompatible with NC invoicing:

```prisma
model invoices {
  trade_id   String  @db.Uuid    // NOT NULL — mandatory FK to trades
  buyer_org_id  String @db.Uuid  // NOT NULL — derived from Trade.buyerOrgId
  @@unique([org_id, trade_id, invoice_number])   // trade_id in unique key
  // FK: trades (trade_id) → ON UPDATE NO ACTION (hard FK enforced)
}
```

**No `invoice_type` column exists.** There is no polymorphic entity link. NC pool/syndicate invoices (`POOL_ORDER`, `SYNDICATE_EXECUTION`, `VCO_DELIVERY`) have no `Trade` row. The mandatory `trade_id` FK would fail with a DB constraint violation for any NC invoice.

**Unique constraint impact:** The `@@unique([org_id, trade_id, invoice_number])` constraint assumes `trade_id` is always present. This constraint would need to be redesigned for NC invoices.

### 6.3 Service Finding — ⚠️ SERVICE CHANGE REQUIRED

`InvoiceService.createInvoice()` hardwires the trade relationship through four mandatory steps:

```typescript
// From invoice.service.ts — confirmed in file
// Step 1: Trade must exist
const trade = await this.db.trade.findUnique({ where: { id: data.trade_id }, ... });
if (!trade) throw new InvoiceTradeNotFoundError();

// Step 2: Seller org must match trade
if (trade.sellerOrgId !== orgId) throw new InvoiceSellerMismatchError();

// Step 3: Currency must match trade
if (data.currency !== trade.currency) throw new InvoiceCurrencyMismatchError();

// Step 4: buyer_org_id is derived exclusively from trade
buyer_org_id: trade.buyerOrgId,  // not from input — always from trade
```

There is no conditional branch, no `invoice_type` flag, and no alternative code path. The service is tightly bound to the Trade entity for party resolution and currency validation. An NC invoice cannot use this code path without a service refactor.

### 6.4 Recommended Extension Options

**Option A — Polymorphic `invoices` table extension (higher coupling risk):**
- Add `invoice_type VARCHAR(50) NOT NULL DEFAULT 'TRADE'`
- Make `trade_id` nullable with a `CHECK (invoice_type = 'TRADE' OR trade_id IS NOT NULL)` constraint
- Add `network_entity_id UUID NULL` + `network_entity_type VARCHAR(50) NULL`
- Redesign the @@unique constraint: `@@unique([org_id, invoice_type, trade_id, invoice_number])` or similar
- Update `InvoiceService` to branch on `invoice_type`

**Option B — Separate `network_invoices` table (recommended; clean separation):**
- New `network_invoices` table with NC-specific party model (`pool_id` or `syndicate_id`, `executor_org_id`, `lot_id`)
- New `NetworkInvoiceService` (standalone, no dependency on `InvoiceService`)
- Existing `invoices` table and `InvoiceService` are not touched — TTP flow remains stable
- NC invoice lifecycle uses `NetworkLifecycleLog` (polymorphic, entity_type = 'NETWORK_INVOICE')

**Recommendation: Option B.** Preserves TTP invoice flow stability. NC invoicing has different party semantics (N parties, lot executor identity, pool member tracking) that would pollute the TTP invoice model with nullables and conditional branches. Clean separation reduces regression risk.

### 6.5 Delta Classification

| Layer | Delta Type | Work Required |
|-------|-----------|---------------|
| DB schema | New table (Option B) | network_invoices with NC party model |
| Prisma schema | New model | NetworkInvoice |
| Service code | New service | NetworkInvoiceService (separate from InvoiceService) |
| Existing `invoices` | No change | TTP flow unaffected |
| Governance | NC-PHASE1-INVOICE-EXTENSION-001 | New task packet |

---

## 7. Seam 0-D: MakerChecker Service

### 7.1 Seam Definition (NC Design §21, Step 0-D)

> Confirm `makerChecker.service.ts` supports `POOL` / `SYNDICATE` / `VCO_CHAIN` entity types

### 7.2 Schema Finding — ✅ CLEAN (data rows only)

`PendingApproval.entityType` (`pending_approvals.entity_type`) is a plain `String`, not a DB enum. No `ALTER TYPE` migration is required. New entity types are registered via data rows only.

`ApprovalSignature` has no entity type dependency — it references `PendingApproval.id` via FK only.

### 7.3 Service Finding — ✅ CLEAN (no hardcoded entity type validation)

`MakerCheckerService.createApprovalRequest()` writes `entityType: input.entityType` directly to the DB without any switch/case or validation against a hardcoded set:

```typescript
// From makerChecker.service.ts — confirmed in file
const row = await this.db.pendingApproval.create({
  data: {
    entityType: input.entityType,   // ← plain passthrough; no enum validation
    entityId:   input.entityId,
    // ... 16 other fields
  },
});
```

The `frozenPayload`, `frozenPayloadHash`, `makerPrincipalFingerprint`, and `expiresAt` computations are entity-type-agnostic.

**Replay dependency (0-D → 0-A):** `MakerCheckerService.verifyAndReplay()` calls `StateMachineService.transition()`. If the StateMachine dispatch for `POOL`/`SYNDICATE`/`VCO_CHAIN` is not yet implemented (Seam 0-A gap), a `verifyAndReplay()` call for those entity types will be blocked by the StateMachine `Unhandled entityType` guard. The MakerChecker service itself is correct; it depends on the StateMachine dispatch extension being deployed first.

### 7.4 Delta Classification

| Layer | Delta Type | Work Required |
|-------|-----------|---------------|
| DB schema | None | No migration |
| DB seed | New rows | pending_approvals entries resolved via data |
| Service code | None | MakerChecker is entity-type agnostic |
| Dependency | Sequential | StateMachine dispatch (Seam 0-A) must deploy before replay works |

---

## 8. Seam 0-E: Multi-party Escrow

### 8.1 Seam Definition (NC Design §21, Step 0-E)

> Confirm `escrow.service.ts` can be extended to multi-party (>2 org) context

### 8.2 Schema Finding — ⚠️ SCHEMA EXTENSION REQUIRED

`escrow_accounts` current shape:

```prisma
model escrow_accounts {
  id                 String  @id
  tenant_id          String  @db.Uuid   // single tenant; not a party list
  lifecycle_state_id String  @db.Uuid   // FK to lifecycle_states
  currency           String
  created_by_user_id String? @db.Uuid
  // NO buyer_org_id, NO seller_org_id, NO party list, NO party_count
}
```

Party identity for bilateral trades is carried entirely on the `Trade` entity (`Trade.buyerOrgId`, `Trade.sellerOrgId`). There is no party list concept in the escrow model itself.

`escrow_transactions` shape equally has no party tracking (`tenant_id` is the only org reference).

**Effect:** A pool with N member organizations or a syndicate with N lot executors cannot be represented in the current `escrow_accounts` model. There is no party junction table, no `party_count`, and no `partyOrgIds` array.

### 8.3 Service Finding — ⚠️ NO MULTI-PARTY EXTENSION POINT

`EscrowService.createEscrowAccount()` inserts a single `tenant_id`. The entire service is scoped to a single `tenantId`:

```typescript
// From escrow.service.ts — confirmed in file
await this.db.$queryRaw`
  INSERT INTO public.escrow_accounts (tenant_id, lifecycle_state_id, currency, created_by_user_id)
  VALUES (${input.tenantId}::uuid, ...)
`;
```

`recordTransaction()` and `computeDerivedBalance()` scope to `tenant_id` only. `transitionEscrow()` loads the account with `tenant_id = ${input.tenantId}` — single-tenant.

There is no party list injection point, no N-party ledger concept, and no settlement-split mechanism in the current service.

### 8.4 Extension Path

This matches the HIGH/HIGH risk already identified in NC Design Foundation Section 23:

> *Risk: Multi-party escrow. The existing escrow_accounts model is bilateral... N-party escrow settlement for pool/syndicate requires separate design.*

**Required extension (Phase 2 OES pre-work):**
A separate design unit `NC-OES-ESCROW-001` is required to specify:
- `network_escrow_accounts` table (or `escrow_parties` junction table extending `escrow_accounts`)
- Party registration at escrow creation time (N org_ids, each with a notional allocation)
- `NetworkSettlementSplit` entity (NC Design Section 6.12)
- N-party balance derivation (per-party ledger slice vs. pool-level ledger)
- RLS policy for multi-party escrow accounts (which tenant_id governs each row?)

The existing `EscrowService` and `escrow_accounts`/`escrow_transactions` tables are **not modified** — TTP escrow remains stable. NC OES settlement runs on a separate schema surface.

### 8.5 Delta Classification

| Layer | Delta Type | Work Required |
|-------|-----------|---------------|
| Existing escrow schema | No change | TTP bilateral escrow unaffected |
| New schema | New tables | network_escrow_accounts + network_escrow_parties (or equivalent) |
| New service | New service | NetworkEscrowService (separate from EscrowService) |
| NetworkSettlementSplit | Per NC Design §6.12 | New table + service |
| Governance | NC-OES-ESCROW-001 | Separate design unit required; Phase 2 |

---

## 9. Consolidated Findings Matrix

| # | Seam | Schema Verdict | Service Verdict | NC Can Proceed? | Phase |
|---|------|---------------|-----------------|-----------------|-------|
| 0-A | LifecycleState + StateMachine | ✅ Data-only | ⚠️ Code change required (3 dispatch branches) | Phase 1 after extension | Phase 1 pre-work |
| 0-B | NetworkLifecycleLog pattern | ✅ New table only | ✅ Additive dispatch (same as 0-A) | Phase 1 additive | Phase 1 additive |
| 0-C | Invoice extension | ⚠️ SCHEMA DELTA REQUIRED | ⚠️ SERVICE CHANGE REQUIRED | Phase 1 after extension | Phase 1 pre-work |
| 0-D | MakerChecker | ✅ Data-only | ✅ Entity-type agnostic | Phase 1 ready (after 0-A) | Ready |
| 0-E | Multi-party escrow | ⚠️ SCHEMA EXTENSION REQUIRED | ⚠️ No extension point | Phase 2 only | Phase 2 pre-work |

---

## 10. Schema Delta Summary

### Required Before Phase 1 (CPP Module) Can Write Data

| # | Delta | Table | Type | Constraint Impact |
|---|-------|-------|------|-------------------|
| D-1 | New table | `network_lifecycle_logs` | New table | Trigger + RLS required |
| D-2 | New table | `network_invoices` (Option B) | New table | NC party model; independent from `invoices` |
| D-3 | Seed rows | `lifecycle_states` | New data rows | POOL / SYNDICATE / VCO_CHAIN entity types |
| D-4 | Seed rows | `allowed_transitions` | New data rows | CPP transition graph (Phase 1 Module A) |

### Deferred to Phase 2 (OES Module)

| # | Delta | Table | Type |
|---|-------|-------|------|
| D-5 | New table | `network_escrow_accounts` | New table (or party junction) |
| D-6 | New table | `network_escrow_parties` | Junction: escrow ↔ org_id |
| D-7 | New table | `network_settlement_splits` | Per NC Design §6.12 |

### NOT Required at Any Phase

- No `ALTER TYPE` on any DB enum (entity types are all plain Strings)
- No changes to existing `lifecycle_states`, `allowed_transitions`, `pending_approvals` schema
- No changes to `invoices`, `escrow_accounts`, `escrow_transactions` (TTP tables untouched)

---

## 11. Service Code Change Requirements

### Required Before Phase 1 Can Execute Transitions

**File:** `server/src/services/stateMachine.service.ts`  
**Change:** Add three dispatch branches after the `ORDER` branch, before the fallback `denied()` guard:

```
if (normalizedEntityType === 'POOL')      → write to network_lifecycle_logs
if (normalizedEntityType === 'SYNDICATE') → write to network_lifecycle_logs
if (normalizedEntityType === 'VCO_CHAIN') → write to network_lifecycle_logs
```

Each branch writes to the new `NetworkLifecycleLog` Prisma model using the identical log field pattern as the `TRADE` branch (minus `tradeId`, plus polymorphic `entityType` + `entityId`).

**Risk level:** Low. Existing branches are not modified. Additive change only.

### New Services Required for Phase 1

| Service | Purpose | Depends On |
|---------|---------|-----------|
| `NetworkInvoiceService` | NC invoice creation (POOL_ORDER, SYNDICATE_EXECUTION) | D-2 new `network_invoices` table |
| `NetworkPoolService` | CPP pool lifecycle management | D-1 + D-3/D-4 seed data |
| `NetworkSyndicateService` | OES syndicate lifecycle management | Phase 2 only |

### Services That Need No Changes

| Service | Reason |
|---------|--------|
| `MakerCheckerService` | Entity-type agnostic; no hardcoded validation |
| `EscalationService` | Entity-type agnostic |
| `SanctionsService` | Entity-type agnostic |
| `InvoiceService` | TTP-only; NC uses separate NetworkInvoiceService |
| `EscrowService` | TTP bilateral only; NC uses separate NetworkEscrowService (Phase 2) |

---

## 12. Phase Classification

### Phase 0 (This Task — Complete)
- ✅ All 5 seams inspected (schema + service)
- ✅ This validation report produced
- ✅ No implementation actions taken

### Phase 1 Pre-work (Required Before CPP Module Begins)

These items must be complete before any NC Phase 1 entity can reach a lifecycle state, be invoiced, or pass through maker-checker approval:

1. **NC-STATEMACHINE-EXTENSION-001** — Add 3 dispatch branches to `stateMachine.service.ts` + new `NetworkLifecycleLog` Prisma model + `network_lifecycle_logs` DB table
2. **NC-INVOICE-EXTENSION-001** — Design and implement `network_invoices` table + `NetworkInvoiceService` (Option B recommended)
3. **NC-SEED-STATES-001** — SQL seed for `lifecycle_states` rows: POOL entity type (CPP Phase 1 state graph)
4. **NC-SEED-TRANSITIONS-001** — SQL seed for `allowed_transitions` rows: CPP Module A transition graph

### Phase 1 (CPP Module A — Collaborative Procurement Pool)

Begins after all pre-work items above are merged and deployed.

Entities: `NetworkPool`, `NetworkPoolMembership`, `NetworkPoolRFQ`  
Lifecycle: Pool creation → DRAFT → OPEN → LOCKED → EXECUTED/CANCELLED  
Invoice: Pool order invoices via `NetworkInvoiceService`  
MakerChecker: Pool LOCKED transition (high-value quorum change) via existing `MakerCheckerService`

### Phase 2 (OES Module B — Open Execution Syndicate)

Requires OES-ESCROW-001 design unit before settlement flows can be built.

---

## 13. Recommended Phase 1 First Packet

Based on this validation, the recommended first implementation packet is:

**Packet ID:** `TEXQTIC-NC-PHASE1-FOUNDATION-001`  
**Scope:** State machine extension + NetworkLifecycleLog table only

**Rationale:** The StateMachine dispatch extension and NetworkLifecycleLog table are the single dependency all other NC Phase 1 entities share. Delivering this first unblocks all subsequent entity lifecycle work without coupling to invoice or escrow design decisions.

**Allowlist for first packet:**
- `server/src/services/stateMachine.service.ts` (3 new dispatch branches)
- `server/prisma/schema.prisma` (new `NetworkLifecycleLog` model)
- SQL migration file: `network_lifecycle_logs` table + trigger + RLS
- `server/src/services/stateMachine.types.ts` (add NC entity types to `TransitionRequest.entityType`)

**Explicitly excluded from first packet:**
- NC invoice tables or service (separate packet)
- NC escrow tables or service (Phase 2)
- NetworkPool, NetworkSyndicate entity tables (Phase 1 Module A — depends on this packet)

---

## 14. Risks and Open Questions

### R1 — StateMachine entityType TypeScript type
**Risk:** `TransitionRequest.entityType` in `stateMachine.types.ts` may be a union literal type `'TRADE' | 'ESCROW' | 'CERTIFICATION' | 'ORDER'`. If so, passing `'POOL'` would be a compile-time TypeScript error even before the dispatch branch is added.  
**Mitigation:** Inspect `stateMachine.types.ts` and extend the union before or simultaneously with the dispatch branch addition.  
**Priority:** High — must be confirmed before Phase 1 pre-work packet is written.

### R2 — NetworkLifecycleLog RLS policy design
**Risk:** Existing lifecycle log RLS uses `tenant_id`/`org_id` as the RLS boundary. NetworkLifecycleLog has polymorphic entity references — the RLS policy must be designed carefully to prevent cross-tenant log reads in the multi-party pool context.  
**Mitigation:** NetworkLifecycleLog RLS must scope on `org_id` (the org that triggered the transition) not on the entity. Pool members each have their own org_id. A pool log entry has a single `actorOrgId` — only that org can read it, unless a pool-admin read policy is added. This is a design decision for Phase 1 pre-work.  
**Priority:** High — must be specified in NC-STATEMACHINE-EXTENSION-001 packet.

### R3 — invoice_lifecycle_logs vs. canonical pattern divergence
**Risk:** `invoice_lifecycle_logs` does not follow the canonical TradeLifecycleLog 23-field pattern. If a future NC invoice log table is modeled after `invoice_lifecycle_logs`, it will lack `makerUserId`, `checkerUserId`, `aiTriggered`, and will have a nullable `reason`. This reduces auditability.  
**Mitigation:** NC Design Foundation document should be amended (in Phase 1 packet) to explicitly specify that `NetworkLifecycleLog` follows `TradeLifecycleLog` (not `invoice_lifecycle_logs`) as the canonical pattern.  
**Priority:** Medium — documentation correction.

### R4 — Unique constraint on `network_invoices`
**Risk:** The existing `invoices` table uses `@@unique([org_id, trade_id, invoice_number])`. A `network_invoices` table needs an equivalent deduplication constraint. The right key depends on NC party model: `@@unique([executor_org_id, pool_id, invoice_number])` or `@@unique([executor_org_id, syndicate_lot_id, invoice_number])`.  
**Mitigation:** Deduplication strategy must be specified in NC-INVOICE-EXTENSION-001 design.  
**Priority:** Medium — design decision for invoice packet.

### R5 — Pool member org_id in StateMachine transition
**Risk:** In a multi-party pool, which `orgId` is passed to `StateMachineService.transition()`? The pool owner? Each member in sequence? A virtual pool org?  
**Mitigation:** CPP design must specify the actor org_id model for pool transitions. A pool has an `ownerOrgId` (creator) — transitions are likely owned by the pool creator with member consent tracked separately.  
**Priority:** High — must be resolved before NC-STATEMACHINE-EXTENSION-001 packet.

### OQ-NC-001 (Open Question)
Does NC Design Section 6.1 `NetworkPool` have an `ownerOrgId` field, or is pool ownership defined by membership role? The `org_id` passed to `StateMachineService.transition()` for a POOL entity must be unambiguous.

---

## 15. Authorization Gate

This report is **read-only**. No implementation actions were taken.

The following items require explicit authorization from Paresh Patel before implementation begins:

| Item | Authorization Required |
|------|----------------------|
| NC-STATEMACHINE-EXTENSION-001 packet | Approve and define scope/allowlist |
| NC-INVOICE-EXTENSION-001 packet | Approve Option A vs. Option B choice |
| NC-OES-ESCROW-001 design unit | Phase 2 — scope when CPP (Phase 1) is stable |
| Risk R5 resolution | Define pool actor org_id model |

**Proposed next packet (for Paresh's authorization):**  
`TEXQTIC-NC-PHASE1-STATEMACHINE-001` — StateMachine dispatch extension + NetworkLifecycleLog table. This is the single-smallest change that unblocks all NC Phase 1 entity lifecycle work.

---

*Report version: 1.0 | Task: TEXQTIC-NC-PHASE0-FOUNDATION-001 | All findings are read-only inspection results. No implementation actions taken in this task.*
