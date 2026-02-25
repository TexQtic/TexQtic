# G-017 Day 4 — `pending_approvals` TRADE Entity FK Hardening

**Migration ID:** `20260307000000_g017_day4_pending_approvals_trade_fk_hardening`  
**Task ID:** G-017-DAY4-PA-TRADE-FK-HARDENING  
**Gate:** Gate E (Trade Domain Foundation)  
**Status:** ADDITIVE — safe to apply, no data mutations  
**Date:** 2026-03-07  
**Prerequisite migrations:**  
- `20260302000000_g021_maker_checker_core` (creates `public.pending_approvals`)  
- `20260306000000_g017_trades_domain` (creates `public.trades`)

---

## Purpose

`public.pending_approvals` is a **polymorphic** table: its `entity_id` column may
reference rows in different domain tables depending on `entity_type`
(`TRADE` | `ESCROW` | `CERTIFICATION`).

A standard PostgreSQL `FOREIGN KEY` constraint cannot be applied across multiple
target tables from one source column.  This migration therefore uses a
**BEFORE INSERT OR UPDATE trigger** to enforce the DB-level referential invariant:

> **If `entity_type = 'TRADE'` then `entity_id` MUST reference an existing
> `public.trades(id)`.**

Any attempt to insert or update a `pending_approvals` row where `entity_type =
'TRADE'` and `entity_id` does not resolve to a row in `public.trades` will be
**hard-rejected** at the database level with `SQLSTATE P0003`.

---

## Objects Created

| Object | Type | Description |
|---|---|---|
| `public.g017_enforce_pending_approvals_trade_entity_fk()` | `FUNCTION` | Trigger function performing the referential check |
| `trg_g017_pending_approvals_trade_entity_fk` | `TRIGGER` | BEFORE INSERT OR UPDATE on `public.pending_approvals` |

---

## Design Decisions

### 1. Trigger-based FK (not standard FK)

PostgreSQL does not support a single FK column referencing multiple target tables.
This is a well-known pattern for polymorphic references.  The trigger approach
provides equivalent integrity guarantees with explicit governance scoping.

### 2. SECURITY DEFINER + `SET search_path = public`

The trigger function is `SECURITY DEFINER` so that the `SELECT EXISTS` check
against `public.trades` runs with the **function owner's** privileges rather than
the **session caller's** privileges.

**Why this matters:** `public.trades` uses `FORCE ROW LEVEL SECURITY`.  If the
session calling `INSERT INTO pending_approvals` has a restrictive `app.org_id`
context (or no context at all), RLS on `trades` could silently hide a valid
trade row and produce a **false-negative** integrity failure — rejecting a
legitimate `pending_approvals` insert even though the trade exists.

`SECURITY DEFINER` causes the function to bypass RLS as the owner, ensuring the
existence check is a **pure referential lookup** independent of the caller's
tenant context.

`SET search_path = public` prevents search_path injection attacks.

### 3. Selective firing (INSERT + defensive UPDATE guard)

- **INSERT:** always runs the check for `TRADE` rows.
- **UPDATE:** runs only when `entity_id` **or** `entity_type` is actually changed
  (`IS DISTINCT FROM OLD`).  If neither changes, the trigger returns immediately
  without executing a `SELECT`.

This is a defensive guard — current application logic never mutates `entity_id`
after insert, but the trigger enforces the invariant even if future code paths
attempt to do so.

### 4. ESCROW and CERTIFICATION are explicitly excluded

- `entity_type = 'ESCROW'` → no check (G-018 reserved).
- `entity_type = 'CERTIFICATION'` → no check (no FK target table yet).
- The trigger function returns `NEW` unchanged for all non-TRADE types.

### 5. Error contract

| Property | Value |
|---|---|
| `SQLSTATE` | `P0003` |
| Message prefix | `G-017 FK_HARDEN_FAIL:` |
| Includes | Offending `entity_id` UUID |
| Behaviour | Hard `RAISE EXCEPTION` — no swallowing, no fallthrough |

`P0003` is distinct from `P0001` (generic PL/pgSQL `RAISE`) and `P0002` (used by
the maker–checker separation trigger in G-021), allowing application code to
differentiate integrity failure types.

---

## What This Migration Does NOT Do

| Action | Status |
|---|---|
| ALTER TABLE / ADD COLUMN | ❌ Not done |
| Modify RLS policies | ❌ Not done |
| Change GRANTs | ❌ Not done |
| Insert / Update / Delete any row | ❌ Not done |
| Enforce ESCROW referential integrity | ❌ Reserved for G-018 |
| Modify schema.prisma | ❌ Not applicable (Prisma is unaware of triggers) |
| Modify any TS service / route / test | ❌ Not done |

---

## Prisma Compatibility

Prisma does not manage database triggers: this migration is **invisible to Prisma
schema introspection**.  `prisma db pull` and `prisma generate` do not need to be
rerun after applying this migration unless other schema changes are pending.

The trigger operates transparently beneath the Prisma client.

---

## Application Behaviour After Migration

No change to any API surface.  The trigger fires at the database level:

- An INSERT into `pending_approvals` with `entity_type = 'TRADE'` and a valid
  `entity_id` succeeds exactly as before.
- An INSERT with `entity_type = 'TRADE'` and a non-existent `entity_id` now
  fails with `SQLSTATE P0003` instead of silently succeeding (this was a soft
  reference before this migration).

---

## Rollback

Run the following two statements in order:

```sql
-- Step 1: Drop the trigger first (trigger references the function)
DROP TRIGGER IF EXISTS trg_g017_pending_approvals_trade_entity_fk
  ON public.pending_approvals;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS public.g017_enforce_pending_approvals_trade_entity_fk();
```

No other rollback steps are required.  No data is affected.  No schema columns
were added.  Rolling back this migration restores the previous "soft reference"
behaviour (no DB-level enforcement for TRADE entity_id).

---

## Verification Evidence (expected after apply)

```
NOTICE:  G-017 Day4 VERIFY: function g017_enforce_pending_approvals_trade_entity_fk EXISTS — OK
NOTICE:  G-017 Day4 VERIFY: trigger trg_g017_pending_approvals_trade_entity_fk EXISTS — OK
NOTICE:  G-017 Day4 VERIFY: trigger tgenabled = 'O' (enabled for origin) — OK
NOTICE:  G-017 Day4 VERIFY: public.pending_approvals EXISTS — OK
NOTICE:  G-017 Day4 VERIFY: public.trades EXISTS — OK
NOTICE:  G-017 Day4 PASS: pending_approvals TRADE FK hardening installed — function: g017_enforce_pending_approvals_trade_entity_fk, trigger: trg_g017_pending_approvals_trade_entity_fk (BEFORE INSERT OR UPDATE), SQLSTATE: P0003, SECURITY DEFINER, search_path=public
```

---

## Governance Checklist

| Requirement | Status |
|---|---|
| Trigger fires BEFORE INSERT OR UPDATE on `pending_approvals` | ✅ PASS |
| TRADE-only check — ESCROW/CERTIFICATION passed through | ✅ PASS |
| Defensive UPDATE guard (`entity_id IS DISTINCT FROM OLD.entity_id`) | ✅ PASS |
| SECURITY DEFINER to bypass caller's RLS context on `trades` | ✅ PASS |
| `SET search_path = public` (no injection vector) | ✅ PASS |
| Hard fail with SQLSTATE `P0003` (no swallowing) | ✅ PASS |
| Error message prefix: `G-017 FK_HARDEN_FAIL:` | ✅ PASS |
| `entity_id` included in error message | ✅ PASS |
| No RLS policies modified | ✅ PASS |
| No GRANTs modified | ✅ PASS |
| No data mutations (INSERT/UPDATE/DELETE) | ✅ PASS |
| Rollback documented (DROP TRIGGER + DROP FUNCTION) | ✅ PASS |
| Post-migration DO verification block present | ✅ PASS |
| Migration is additive and safe to apply | ✅ PASS |
