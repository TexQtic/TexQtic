# G-018 Day 1 — Escrow Schema + RLS + FK Hardening

**Migration ID:** `20260308000000_g018_day1_escrow_schema`  
**Task ID:** G-018-DAY1-ESCROW-SCHEMA  
**Gate:** Gate E (Trade Domain Foundation)  
**Status:** ADDITIVE (+ two scoped ALTER TABLE operations — see §5 and §6)  
**Date:** 2026-03-08  
**Governance directives:** D-020-B (Escrow Neutrality) · D-020-D (Log Immutability) · G-017 Day 1 design intent · G-020 soft reference notice · G-021 soft reference notice

**Prerequisite migrations (must be applied in order):**
1. `20260301000000_g020_lifecycle_state_machine_core` — creates `lifecycle_states`, `escrow_lifecycle_logs`
2. `20260302000000_g021_maker_checker_core` — creates `pending_approvals`
3. `20260306000000_g017_trades_domain` — creates `trades`

---

## Purpose

This migration introduces the **Escrow Domain** to the TexQtic platform as a **schema-only, governance-first** deployment. No business logic, API routes, or services are included.

**This migration does four things:**

1. Creates the `public.escrow_accounts` and `public.escrow_transactions` tables with ENABLE + FORCE RLS and all constitutional governance invariants applied.
2. Wires `public.trades.escrow_id` as a live FK to `escrow_accounts`, resolving the placeholder from G-017 Day 1 design.
3. Hardens the soft reference `public.escrow_lifecycle_logs.escrow_id → escrow_accounts(id)`, resolving the deferred FK from G-020.
4. Enforces polymorphic referential integrity on `pending_approvals` for `entity_type = 'ESCROW'` using a trigger-based approach (matching the G-017 Day 4 pattern for TRADE).

---

## Objects Created / Modified

| Object | Type | Operation | Notes |
|---|---|---|---|
| `public.escrow_accounts` | TABLE | CREATE | Lifecycle-aligned escrow entity. No balance fields. |
| `public.escrow_accounts_set_updated_at()` | FUNCTION | CREATE | updated_at maintenance trigger function. |
| `trg_escrow_accounts_set_updated_at` | TRIGGER | CREATE | BEFORE UPDATE on escrow_accounts. |
| RLS policies (3×) on `escrow_accounts` | POLICY | CREATE | RESTRICTIVE guard + PERMISSIVE SELECT + INSERT. |
| `public.escrow_transactions` | TABLE | CREATE | Append-only monetary ledger. No balance column. |
| `public.prevent_escrow_transaction_mutation()` | FUNCTION | CREATE | Layer 2 immutability. SQLSTATE P0005. |
| `trg_immutable_escrow_transaction` | TRIGGER | CREATE | BEFORE UPDATE OR DELETE on escrow_transactions. |
| RLS policies (5×) on `escrow_transactions` | POLICY | CREATE | Guard + SELECT + INSERT + explicit UPDATE/DELETE deny. |
| `public.trades.escrow_id` | COLUMN | ALTER TABLE ADD | Nullable FK → escrow_accounts(id). |
| `trades_escrow_id_fk` | CONSTRAINT | ALTER TABLE ADD | FK wiring of G-017 soft reference. |
| `escrow_lifecycle_logs_escrow_id_fk` | CONSTRAINT | ALTER TABLE ADD | FK hardening of G-020 soft reference. |
| `public.g018_enforce_pending_approvals_escrow_entity_fk()` | FUNCTION | CREATE | SECURITY DEFINER, P0004, ESCROW entity validation. |
| `trg_g018_pending_approvals_escrow_entity_fk` | TRIGGER | CREATE | BEFORE INSERT OR UPDATE on pending_approvals. |

---

## Design Decisions

### 1. No Balance Column (D-020-B)

`escrow_accounts` carries **no balance, available_balance, or current_balance field**.

**Why:** Mutable balance fields create a read-modify-write race condition under concurrent transaction load, and they create an implicit financial authority path without a formal Fintech Integration Review. Per **D-020-B (Escrow Neutrality)**, monetary values are always derived by summing `amount` across `escrow_transactions` for a given `escrow_id`, computed by the service layer.

This is a **constitutionally binding** design invariant. Introducing a balance field in any future migration requires a formal Fintech Integration Review governance approval.

### 2. escrow_transactions is Append-Only (Three Layers)

| Layer | Mechanism | How |
|---|---|---|
| Layer 1 | Service layer | `EscrowService` exposes no `update()` or `delete()` method |
| Layer 2 | DB trigger | `trg_immutable_escrow_transaction` → `RAISE EXCEPTION SQLSTATE P0005` |
| Layer 3 | RLS policies | `escrow_transactions_no_update` and `escrow_transactions_no_delete` both `USING (false)` |

A **new function** (`prevent_escrow_transaction_mutation`) is created rather than reusing `prevent_lifecycle_log_update_delete` from G-020. Rationale:
- `escrow_transactions` is a **financial ledger**, not a lifecycle log. Sharing the function blurs the governance boundary.
- The distinct SQLSTATE (`P0005`) allows application code to differentiate financial ledger integrity errors from lifecycle log errors (`P0001`).
- Error messages cite G-018 for audit traceability.

### 3. entry_type CHECK Constraint (Generic but Controlled)

`entry_type` values are constrained to `HOLD | RELEASE | REFUND | ADJUSTMENT` via a DB-level CHECK. These are intentionally generic:
- New entry_type values **require a governance migration** to update the CHECK (not a code-only change).
- This prevents ad-hoc extension of the financial ledger vocabulary without an explicit migration record.

### 4. trades.escrow_id is Nullable

Per G-017 §4: *"not all trades will have an escrow — e.g., direct settlement or low-value trades."* The FK is `NULL`-able with `ON DELETE RESTRICT`:
- `RESTRICT` (not `CASCADE`) because a trade losing its escrow reference silently would be a financial data integrity risk.

### 5. Partial Unique Index on escrow_accounts(tenant_id, trade_id)

`CREATE UNIQUE INDEX ... WHERE trade_id IS NOT NULL` enforces **one escrow account per trade per tenant** only when `trade_id` is set. NULL `trade_id` rows are not constrained (a tenant may have escrow accounts not linked to any trade — e.g., pre-funded platform accounts or future product types).

A standard `UNIQUE (tenant_id, trade_id)` constraint would treat `NULL = NULL` as distinct (PostgreSQL behaviour), which would silently allow duplicate un-linked escrow accounts within a tenant. The partial index is the correct approach.

### 6. escrow_lifecycle_logs FK: ON DELETE CASCADE (not RESTRICT)

G-020 planned `escrow_lifecycle_logs.escrow_id → escrow_accounts.id`. This migration adds `ON DELETE CASCADE` (logs belong to the account; if the account is deleted, its audit history is removed with it). This matches the `org_id → organizations.id ON DELETE CASCADE` pattern already on `escrow_lifecycle_logs`.

### 7. Maker-Checker ESCROW Trigger: SECURITY DEFINER

Same rationale as G-017 Day 4 for the TRADE trigger:
- `escrow_accounts` uses `FORCE ROW LEVEL SECURITY`.
- If the session calling `INSERT INTO pending_approvals` has a restrictive tenant context, RLS on `escrow_accounts` could hide a valid row and produce a **false-negative** integrity failure.
- `SECURITY DEFINER` + `SET search_path = public` ensures the existence check is a pure referential lookup.

### 8. SQLSTATE Assignments (Stable Error Contract)

| SQLSTATE | Trigger | Scope |
|---|---|---|
| `P0001` | `prevent_lifecycle_log_update_delete` | Lifecycle log immutability (G-020) |
| `P0002` | `check_maker_checker_separation` | Maker ≠ Checker (G-021 D-021-C) |
| `P0003` | `g017_enforce_pending_approvals_trade_entity_fk` | TRADE entity FK (G-017 Day 4) |
| `P0004` | `g018_enforce_pending_approvals_escrow_entity_fk` | ESCROW entity FK (this migration) |
| `P0005` | `prevent_escrow_transaction_mutation` | Escrow ledger immutability (this migration) |

### 9. index on reference_id (Partial)

`reference_id` is indexed with `WHERE reference_id IS NOT NULL` on `escrow_transactions`. Rationale:
- Service layer performs idempotency duplicate-detection lookups before inserting a new transaction.
- Without the index this degrades to a full sequential scan of the transaction ledger per request.
- A partial index (excluding NULLs) is smaller than a full-column index while covering all cases where the lookup is meaningful.

---

## What This Migration Does NOT Do

| Action | Status |
|---|---|
| API routes for escrow | ❌ Not in Day 1 |
| EscrowService business logic | ❌ Not in Day 1 |
| Superadmin cross-tenant read policies | ❌ Deferred (same as trades deference) |
| Escrow UPDATE policies (`texqtic_app`) | ❌ Not in Day 1 — additive when Day 2 lands |
| escrow_accounts balance field | ❌ Forbidden (D-020-B, constitutionally binding) |
| Modify any existing RLS policies | ❌ Not done |
| Modify escalation / reasoning / audit tables | ❌ Not done |
| schema.prisma changes | ❌ Not done — triggers are Prisma-invisible |
| Changes to any TS service / route / test | ❌ Not done |

---

## Prisma Compatibility

Prisma does not manage database triggers or partial indexes created outside of schema.prisma. This migration is **safe to apply** alongside Prisma-managed tables. After applying:
- `prisma db pull` will pick up `escrow_accounts` and `escrow_transactions` as new models.
- `prisma generate` will regenerate the client.
- The triggers and partial indexes are transparent to Prisma client usage.

---

## Rollback

Run the following statements **in order** (dependency order matters):

```sql
-- 1. Drop maker-checker ESCROW enforcement trigger
DROP TRIGGER IF EXISTS trg_g018_pending_approvals_escrow_entity_fk
  ON public.pending_approvals;
DROP FUNCTION IF EXISTS public.g018_enforce_pending_approvals_escrow_entity_fk();

-- 2. Drop escrow_transactions immutability trigger
DROP TRIGGER IF EXISTS trg_immutable_escrow_transaction
  ON public.escrow_transactions;
DROP FUNCTION IF EXISTS public.prevent_escrow_transaction_mutation();

-- 3. Drop escrow_accounts updated_at trigger
DROP TRIGGER IF EXISTS trg_escrow_accounts_set_updated_at
  ON public.escrow_accounts;
DROP FUNCTION IF EXISTS public.escrow_accounts_set_updated_at();

-- 4. Drop tables (escrow_transactions first — FK to escrow_accounts)
DROP TABLE IF EXISTS public.escrow_transactions;
DROP TABLE IF EXISTS public.escrow_accounts;  -- also drops trades.escrow_id FK ref

-- 5. Remove the column and constraint added to trades
ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_escrow_id_fk,
  DROP COLUMN    IF EXISTS escrow_id;

-- 6. Remove FK hardening on escrow_lifecycle_logs
ALTER TABLE public.escrow_lifecycle_logs
  DROP CONSTRAINT IF EXISTS escrow_lifecycle_logs_escrow_id_fk;
```

No other rollback steps are required. No data is affected (Day 1 has no seed rows). Rolling back this migration restores:
- All soft references to their prior un-constrained state.
- `trades.escrow_id` column is removed.
- `pending_approvals` ESCROW entity_id is no longer DB-enforced.

---

## Verification Evidence (expected after successful apply)

```
NOTICE:  G-018 pre-flight OK: trades, pending_approvals, escrow_lifecycle_logs, lifecycle_states present; escrow_accounts absent. Proceeding.
NOTICE:  G-018 §13: escrow_lifecycle_logs_escrow_id_fk added — escrow_lifecycle_logs.escrow_id now a hard FK to escrow_accounts.id.
NOTICE:  G-018 VERIFY: escrow_accounts EXISTS — OK
NOTICE:  G-018 VERIFY: escrow_transactions EXISTS — OK
NOTICE:  G-018 VERIFY: escrow_accounts RLS: t/t — OK
NOTICE:  G-018 VERIFY: escrow_transactions RLS: t/t — OK
NOTICE:  G-018 VERIFY: escrow_accounts_guard RESTRICTIVE EXISTS — OK
NOTICE:  G-018 VERIFY: escrow_transactions_guard RESTRICTIVE EXISTS — OK
NOTICE:  G-018 VERIFY: trades.escrow_id column EXISTS — OK
NOTICE:  G-018 VERIFY: trades_escrow_id_fk FK EXISTS — OK
NOTICE:  G-018 VERIFY: escrow_lifecycle_logs_escrow_id_fk FK EXISTS — OK
NOTICE:  G-018 VERIFY: trg_g018_pending_approvals_escrow_entity_fk EXISTS — OK
NOTICE:  G-018 VERIFY: escrow maker-checker trigger tgenabled='O' — OK
NOTICE:  G-018 VERIFY: trg_immutable_escrow_transaction EXISTS — OK
NOTICE:  G-018 PASS: escrow schema created — escrow_accounts RLS: t/t, escrow_transactions RLS: t/t, trades.escrow_id: ok, escrow_lifecycle_logs FK: ok, pending_approvals ESCROW enforcement: ok, escrow_transactions immutable: ok
```

---

## Governance Checklist

| Requirement | Status |
|---|---|
| Exactly 2 new files (migration.sql + README.md) | ✅ PASS |
| No balance fields on escrow_accounts (D-020-B) | ✅ PASS |
| No balance fields on any new table | ✅ PASS |
| escrow_transactions append-only: trigger (P0005) | ✅ PASS |
| escrow_transactions append-only: RLS UPDATE/DELETE USING (false) | ✅ PASS |
| escrow_transactions append-only: SELECT+INSERT grant only | ✅ PASS |
| ENABLE + FORCE RLS on escrow_accounts | ✅ PASS |
| ENABLE + FORCE RLS on escrow_transactions | ✅ PASS |
| RESTRICTIVE guard policy on escrow_accounts | ✅ PASS |
| RESTRICTIVE guard policy on escrow_transactions | ✅ PASS |
| trades.escrow_id nullable FK added (G-017 intent resolved) | ✅ PASS |
| escrow_lifecycle_logs.escrow_id FK hardened (G-020 plan resolved) | ✅ PASS |
| pending_approvals ESCROW enforcement trigger (SECURITY DEFINER, P0004) | ✅ PASS |
| No existing RLS policies modified | ✅ PASS |
| No escalation / reasoning / audit tables modified | ✅ PASS |
| No routes, no services, no business logic | ✅ PASS |
| No test modifications | ✅ PASS |
| No schema.prisma changes | ✅ PASS |
| Rollback steps documented and complete | ✅ PASS |
| Pre-flight checks fail-fast on missing prerequisites | ✅ PASS |
| Post-migration DO verification block present | ✅ PASS |
| Atomic commit (2 files only) | ✅ PASS |
