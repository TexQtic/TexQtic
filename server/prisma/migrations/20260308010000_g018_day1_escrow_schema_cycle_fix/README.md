# G-018 Day 1 — Escrow Schema Cycle Fix

**Migration ID:** `20260308010000_g018_day1_escrow_schema_cycle_fix`  
**Task ID:** G-018-DAY1-CYCLE-FIX  
**Gate:** Gate E (Trade Domain Foundation)  
**Status:** CORRECTIVE — removes a circular FK introduced in `20260308000000_g018_day1_escrow_schema`  
**Date:** 2026-03-08  
**Prerequisite:** `20260308000000_g018_day1_escrow_schema` must be applied first

---

## Problem

Migration `20260308000000_g018_day1_escrow_schema` created a **circular FK graph**:

```
trades.escrow_id      → escrow_accounts.id   (§12)
escrow_accounts.trade_id → trades.id          (§2 CREATE TABLE)
```

Both FKs are `NOT DEFERRABLE` (immediate mode). This makes it **impossible to INSERT
either a trade or an escrow account without violating one FK**:

- To insert a `trades` row with `escrow_id` set, the `escrow_accounts` row must exist first.
- To insert an `escrow_accounts` row with `trade_id` set, the `trades` row must exist first.

The practical workaround (insert with NULLs, then UPDATE) requires a governed UPDATE
path that does not exist in Day 1, and introduces state where referential integrity is
temporarily suspended — contrary to TexQtic doctrine.

---

## Fix

**Remove `escrow_accounts.trade_id`** — the reverse link from escrow back to trade.

The canonical linkage point is **`trades.escrow_id → escrow_accounts.id`**.

The trade is the natural owner of the association: a trade may acquire an escrow account,
not the other way around. This matches the G-017 design intent exactly:

> *"When G-018 lands, a migration will add `escrow_id UUID REFERENCES escrow_accounts(id)`
> to `public.trades`."* — G-017 §4

`escrow_accounts.trade_id` was defensive but not planned in any governance doc. It created
the cycle without adding a capability that cannot be achieved by a JOIN:

```sql
-- "Which trade uses this escrow?" — no DB FK required
SELECT t.*
FROM trades t
WHERE t.escrow_id = :escrow_account_id;
```

---

## What This Migration Does

| Step | SQL | Effect |
|---|---|---|
| 1 | `DROP INDEX IF EXISTS escrow_accounts_tenant_trade_unique` | Removes partial unique index on `(tenant_id, trade_id)` |
| 2 | `DROP INDEX IF EXISTS escrow_accounts_trade_id_idx` | Removes plain index on `trade_id` |
| 3 | `ALTER TABLE escrow_accounts DROP COLUMN IF EXISTS trade_id` | Removes column and its FK constraint (`ON DELETE RESTRICT → trades.id`) atomically |
| 4 | Verification DO block | Confirms `trade_id` is gone and `trades.escrow_id` + `trades_escrow_id_fk` are intact |

No RLS policies, grants, other columns, or other tables are touched.

---

## State After This Migration

| Relationship | Direction | Type | Status |
|---|---|---|---|
| `trades.escrow_id → escrow_accounts.id` | trade → escrow | Hard FK (RESTRICT) | ✅ Kept |
| `escrow_accounts.trade_id → trades.id` | escrow → trade | Hard FK (RESTRICT) | ❌ Removed |

Circular FK: **eliminated**.  
Canonical query pattern: **`trades.escrow_id`** is the single authoritative link.

---

## Query Patterns (No Capability Lost)

| Query | Before fix | After fix |
|---|---|---|
| "What escrow does this trade use?" | `trades.escrow_id` | `trades.escrow_id` (unchanged) |
| "What trade uses this escrow?" | `escrow_accounts.trade_id` | `JOIN trades t ON t.escrow_id = escrow_accounts.id` |
| "One escrow per trade" uniqueness | Partial unique index on `escrow_accounts(tenant_id, trade_id)` | Enforced by `trades.escrow_id` uniqueness per-trade (a trade has one `escrow_id` slot) |

The reverse lookup is a JOIN on an indexed column (`trades.escrow_id` has a partial index
`trades_escrow_id_idx WHERE escrow_id IS NOT NULL`) — no sequential scan.

---

## Rollback

Only needed if `escrow_accounts.trade_id` must be restored (strongly discouraged — it
re-introduces the cycle):

```sql
ALTER TABLE public.escrow_accounts
  ADD COLUMN trade_id UUID NULL
    REFERENCES public.trades(id) ON DELETE RESTRICT;

CREATE INDEX escrow_accounts_trade_id_idx
  ON public.escrow_accounts (trade_id);

CREATE UNIQUE INDEX escrow_accounts_tenant_trade_unique
  ON public.escrow_accounts (tenant_id, trade_id)
  WHERE trade_id IS NOT NULL;
```

---

## Governance Checklist

| Requirement | Status |
|---|---|
| Circular FK removed | ✅ PASS |
| Canonical link `trades.escrow_id → escrow_accounts.id` preserved | ✅ PASS |
| No RLS policies modified | ✅ PASS |
| No grants modified | ✅ PASS |
| No other columns touched | ✅ PASS |
| No data mutations | ✅ PASS |
| Verification DO block present and passes | ✅ PASS |
| Rollback documented | ✅ PASS |
| Exactly 2 new files (migration.sql + README.md) | ✅ PASS |
