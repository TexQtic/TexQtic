# G-017 — Trades Domain (Day 1 Design)
## Task ID: G-017-DAY1-SCHEMA-RLS

**Status:** COMPLETE  
**Date:** 2026-02-25  
**Gate:** Gate E (Trade Domain Foundation)  
**Design Phase:** Day 1 — Schema + RLS Only  
**Governance directives:** D-020 (Lifecycle) · D-022-B/C (Escalation) · G-023 (Reasoning FK)

---

## 1. Scope

This document covers the Day 1 schema-only introduction of the canonical **trades** economic entity.

**Day 1 includes:**
- `public.trades` table (entity, lifecycle-aligned, tenant-scoped)
- `public.trade_events` table (append-only event log per trade)
- ENABLE + FORCE RLS on both tables
- RESTRICTIVE guard + PERMISSIVE SELECT/INSERT policies for `texqtic_app`
- Prisma models: `Trade` + `TradeEvent`

**Day 1 explicitly excludes:**
- API routes (no Fastify handlers in Day 1)
- Business logic (no TradeService in Day 1)
- Escrow table (deferred to G-018)
- Settlement logic (deferred)
- Superadmin read policy (deferred — see §8)
- `trade_lifecycle_logs.trade_id` hard FK wiring (deferred — follow-up migration)

---

## 2. Trade Lifecycle Alignment (G-020)

### Reuse of `lifecycle_states` registry

The `trades` table carries a `lifecycle_state_id UUID NOT NULL` column with a live FK to `public.lifecycle_states(id)`.

```
trades.lifecycle_state_id → lifecycle_states.id
```

**Governance doctrine:** The `lifecycle_states` table is the single authoritative registry for all valid states, populated via governance migrations only (G-020 §2.2). Trades reuse this table directly. No new lifecycle states are created in this migration.

**State seeding** (separate migration, already applied in G-020):
- `TRADE` entity type in `lifecycle_states` covers states such as `DRAFT`, `ORDER_CONFIRMED`, `IN_ESCROW`, `GOODS_DISPATCHED`, `GOODS_RECEIVED`, `SETTLED`, `DISPUTED`, `CANCELLED`.

**G-020 binding at service layer (Day 2+):**
- `StateMachineService.transition()` will enforce allowed edges via `allowed_transitions` table.
- `lifecycleStateId` on the `trades` row is updated atomically with the `TradeLifecycleLog` entry by the service layer.
- Day 1 introduces the FK column only. No state machine calls occur in this migration.

### Soft reference resolution

`trade_lifecycle_logs.trade_id` was declared as a soft reference in G-020 ("no FK to trades — deferred to G-017"). The FK wiring (`trade_lifecycle_logs.trade_id → trades.id`) is a follow-up migration separate from Day 1 to preserve atomicity.

---

## 3. Escalation Compatibility (G-022)

### `freeze_recommended` column

```sql
freeze_recommended BOOLEAN NOT NULL DEFAULT false
```

This column is **informational only**, following D-022-C doctrine:

- When the `EscalationService` determines that a trade entity warrants a freeze, it may set `freeze_recommended = true` on the relevant trade row via a future UPDATE path.
- Reading `freeze_recommended` **never auto-toggles** any platform configuration or lifecycle state.
- The **canonical freeze source of truth** (D-022-B) remains `escalation_events` with `entity_type = 'TRADE'`, `severity_level >= 3`, `status = 'OPEN'`, with no active resolution child.
- `freeze_recommended` is a convenience field for UI display and service-layer short-circuit checks — it is NOT a substitute for `escalation_events`.

### Escalation entity_type compatibility

- `EscalationService.checkEntityFreeze()` uses `entity_type = 'TRADE'` and `entity_id = trade.id`.
- No changes to `escalation_events` table required.
- G-022 service layer binds to trades via `StateMachineService` (already patched in G-022 Day 2).

---

## 4. Future Escrow Linkage (G-018 Placeholder)

The `trades` table does **not** contain an `escrow_id` column in Day 1.

**Design intent:**
- Escrow is a separate financial control plane (G-018).
- When G-018 lands, a migration will add `escrow_id UUID REFERENCES public.escrow_accounts(id)` to the `trades` table.
- The escrow FK is optional (`NULL`-able): not all trades will have an escrow — e.g., direct settlement or low-value trades.
- **No monetary columns** are present on `trades` in Day 1 beyond `gross_amount` (the stated value). No payment ledger references, no fund movement fields. This upholds D-020-B (Escrow Neutrality).

---

## 5. Reasoning FK (G-023)

```sql
reasoning_log_id UUID REFERENCES public.reasoning_logs(id) ON DELETE RESTRICT
```

**Purpose:** Enables a trade to be linked to the AI reasoning record (G-023) that informed its creation or a significant decision.

**Design choices:**
- **Nullable:** Not every trade originates from an AI recommendation. Most trades in early phases will have `reasoning_log_id = NULL`.
- **ON DELETE RESTRICT:** `reasoning_logs` is append-only (immutability trigger `[E-023-IMMUTABLE]` blocks all deletes in production). RESTRICT guards against future bypass-context cleanup accidentally breaking trade referential integrity.
- **No writes to `reasoning_logs` in this migration.** The column is a read-side FK only.
- The AI route (G-023, `server/src/routes/ai.ts`) creates `reasoning_logs` rows independently; a future Trade creation service may accept a `reasoningLogId` parameter and write it to `trades.reasoning_log_id`.

---

## 6. RLS Doctrine

### Tables covered: `trades` + `trade_events`

Both tables follow the three-policy pattern established in G-022 and G-023:

| Policy | Type | Operation | `trades` | `trade_events` |
|---|---|---|---|---|
| `trades_guard` | RESTRICTIVE | ALL | `require_org_context() OR bypass_enabled()` | — |
| `trade_events_guard` | RESTRICTIVE | ALL | — | `require_org_context() OR bypass_enabled()` |
| `trades_tenant_select` | PERMISSIVE | SELECT | `tenant_id = current_org_id() OR bypass_enabled()` | — |
| `trade_events_tenant_select` | PERMISSIVE | SELECT | — | `tenant_id = current_org_id() OR bypass_enabled()` |
| `trades_tenant_insert` | PERMISSIVE | INSERT | `require_org_context() AND tenant_id = current_org_id()` OR bypass | — |
| `trade_events_tenant_insert` | PERMISSIVE | INSERT | — | same pattern |

**FORCE ROW LEVEL SECURITY** is enabled on both tables, ensuring table owners cannot bypass policies.

**No UPDATE or DELETE policies** are defined in Day 1:
- `trades`: mutable at the DB level (has `updated_at` trigger), but `texqtic_app` has no UPDATE policy yet. Future Day 2+ will add one for lifecycle state transitions.
- `trade_events`: intended as append-only. No UPDATE/DELETE policy will ever be added (design invariant).

**GRANT:** `SELECT, INSERT` to `texqtic_app` only. No `UPDATE` or `DELETE` grant.

---

## 7. No Superadmin Policy — Explicitly Deferred

**Rationale:** Day 1 establishes tenant isolation as the baseline. Cross-tenant read access for PLATFORM_ADMIN is a governed, audited capability that:
1. Requires a separate RLS policy clearly scoped to admin roles.
2. Needs to be tied to impersonation session tracking (G-015).
3. Will be introduced in a dedicated governance migration after service layer validation.

Until that migration lands, PLATFORM_ADMIN context has no read access to `trades` or `trade_events` via `texqtic_app` role. This is the safe default.

---

## 8. Schema Summary

### `public.trades`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID PK | NO | `gen_random_uuid()` | — |
| `tenant_id` | UUID FK→tenants | NO | — | RLS boundary |
| `buyer_org_id` | UUID | NO | — | No FK in Day 1 |
| `seller_org_id` | UUID | NO | — | No FK in Day 1 |
| `lifecycle_state_id` | UUID FK→lifecycle_states | NO | — | G-020 alignment |
| `trade_reference` | TEXT | NO | — | UNIQUE per tenant |
| `currency` | TEXT | NO | — | — |
| `gross_amount` | NUMERIC(18,6) | NO | — | CHECK > 0 |
| `freeze_recommended` | BOOLEAN | NO | `false` | G-022 compat, informational |
| `reasoning_log_id` | UUID FK→reasoning_logs | YES | NULL | G-023 optional |
| `created_by_user_id` | UUID | YES | NULL | No FK (soft ref) |
| `created_at` | TIMESTAMPTZ | NO | `now()` | — |
| `updated_at` | TIMESTAMPTZ | NO | `now()` | Maintained by trigger |

**Constraints:** `UNIQUE(tenant_id, trade_reference)` · `CHECK(gross_amount > 0)`

### `public.trade_events`

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | UUID PK | NO | `gen_random_uuid()` | — |
| `tenant_id` | UUID | NO | — | No FK (plain column, RLS-scoped) |
| `trade_id` | UUID FK→trades | NO | — | ON DELETE CASCADE |
| `event_type` | TEXT | NO | — | — |
| `metadata` | JSONB | NO | `'{}'` | Arbitrary event payload |
| `created_by_user_id` | UUID | YES | NULL | — |
| `created_at` | TIMESTAMPTZ | NO | `now()` | — |

---

## 9. Migration Verification Evidence

*To be filled after migration is applied:*

```
NOTICE: G-017 PASS: trades domain created — lifecycle_states: t, trades RLS: t/t, trade_events RLS: t/t, trades_guard: 1, events_guard: 1, lifecycle_fk: 1
```

- psql apply: BEGIN / COMMIT, no ROLLBACK, no ERROR
- `pnpm -C server exec prisma db pull` → clean
- `pnpm -C server exec prisma generate` → exit 0
- `pnpm -C server exec tsc --noEmit` → exit 0

---

## 10. Governance Checklist

| Requirement | Status |
|---|---|
| `lifecycle_state_id` FK to `lifecycle_states` | ✅ PASS |
| No new lifecycle states created | ✅ PASS |
| `freeze_recommended` informational only (D-022-C) | ✅ PASS |
| Freeze source of truth remains `escalation_events` (D-022-B) | ✅ PASS |
| No escrow fields in Day 1 (G-018 deferred, D-020-B upheld) | ✅ PASS |
| `reasoning_log_id` nullable FK → `reasoning_logs` | ✅ PASS |
| ENABLE + FORCE RLS on `trades` | ✅ PASS |
| ENABLE + FORCE RLS on `trade_events` | ✅ PASS |
| RESTRICTIVE guard policy on both tables | ✅ PASS |
| PERMISSIVE SELECT + INSERT (tenant-scoped) on both tables | ✅ PASS |
| No UPDATE/DELETE policies on `trade_events` | ✅ PASS |
| Superadmin policy explicitly deferred | ✅ CONFIRMED |
| No routes, no service layer in Day 1 | ✅ CONFIRMED |
| No test modifications required | ✅ CONFIRMED |
| Prisma models: `Trade` + `TradeEvent` | ✅ PASS |
| `@@unique([tenantId, tradeReference])` in Prisma | ✅ PASS |
| GRANT SELECT, INSERT only to `texqtic_app` | ✅ PASS |
