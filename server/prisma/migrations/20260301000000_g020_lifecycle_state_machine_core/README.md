# G-020 Day 2 Migration — Lifecycle State Machine Core

| Field | Value |
|-------|-------|
| **Migration ID** | `20260301000000_g020_lifecycle_state_machine_core` |
| **Task ID** | G-020-DAY2-MIGRATION-SOFTREF |
| **Date** | 2026-03-01 |
| **Mode** | Safe-Write / Soft Reference Edition |
| **Doctrine** | v1.4 + Addendum Draft v1 + G-020 Design v1.1 (APPROVED 2026-02-24) |
| **Constitutional Directives** | D-020-A · D-020-B · D-020-C · D-020-D |
| **Prerequisite** | G-015 Phase A (`20260224000000_g015_phase_a_introduce_organizations`) |
| **Subsequent** | G-017 (trades), G-018 (escrow_accounts) for FK hardening |

---

## What Was Created

This migration adds four tables implementing the **governance infrastructure layer** of the G-020 Lifecycle State Machine. No business logic, no fintech behaviour, no trade or escrow entities — this is constitutional scaffolding only.

### 1. `lifecycle_states`

Authoritative registry of every valid state across all lifecycle domains. A state that does not exist in this table cannot appear in any transition edge or log entry.

**Domains:** `TRADE` (14 states) · `ESCROW` (7 states) · `CERTIFICATION` (6 states)

Key columns:
- `entity_type` — domain discriminant (`TRADE | ESCROW | CERTIFICATION`)
- `state_key` — uppercase machine-readable identifier (e.g. `ORDER_CONFIRMED`)
- `is_terminal` — if `true`, no outbound edge may originate from this state
- `is_irreversible` — if `true`, the transition INTO this state cannot be undone via normal service calls
- `severity_level` — integer 0–4 for G-022 escalation integration
- `requires_maker_checker` — default MC gate for transitions INTO this state

Access: READ-ONLY at runtime. Written only via governance migrations.

---

### 2. `allowed_transitions`

Every permitted directed edge in the lifecycle state graph. The enforcement layer (`StateMachineService`) performs an existence check against this table on every transition attempt. If no row exists for `(entity_type, from_state_key, to_state_key)`, the transition is **unconditionally rejected**.

Key columns:
- `allowed_actor_type TEXT[] NOT NULL` — D-020-A: mandatory actor classification, schema-enforced
- `requires_maker_checker` — edge-level MC gate (overrides state-level default)
- `requires_escalation` — if `true`, a G-022 escalation record is created on transition

Composite FKs to `lifecycle_states(entity_type, state_key)` exist for both `from_state_key` and `to_state_key`. This ensures no phantom edges reference undeclared states.

Access: READ-ONLY at runtime (enforcement layer reads). Written only via governance migrations.

---

### 3. `trade_lifecycle_logs`

Immutable, append-only audit log of all trade state transitions. This is the forensic record — once written, a row is permanent.

**trade_id is intentionally a soft (unresolved) reference.** See *Soft Reference Governance Decision* below.

---

### 4. `escrow_lifecycle_logs`

Same structure as `trade_lifecycle_logs`, scoped to escrow entity transitions. Escrow neutrality doctrine (D-020-B) applies — see below.

**escrow_id is intentionally a soft (unresolved) reference.** See *Soft Reference Governance Decision* below.

---

## Soft Reference Governance Decision

### Why `trade_id` Has No FK Constraint Today

At the time this migration was authored (2026-03-01), the `trades` table does not exist. G-017 (Trade Domain) is scheduled for Week 3 of the Wave plan. Creating a stub `trades` table solely to satisfy a FK constraint would:

1. Violate wave sequencing and introduce premature schema decisions for the trade domain
2. Create technical debt via stub tables that diverge from the final design
3. Blur the boundary between governance infrastructure (Week 2) and trade domain entities (Week 3)

**Constitutional decision (governance session 2026-02-24):** Proceed with `trade_id UUID NOT NULL` as a soft reference. The integrity constraint is enforced at the **service layer** (`StateMachineService` validates trade ownership before writing) until G-017 activates the FK.

### Why `escrow_id` Has No FK Constraint Today

Same reasoning. The `escrow_accounts` table belongs to G-018 (Escrow Domain, Week 4). Soft reference is used today; FK hardening is deferred.

### Planned FK Hardening Migrations

```sql
-- G-017 (trades table created — Week 3):
ALTER TABLE public.trade_lifecycle_logs
  ADD CONSTRAINT trade_lifecycle_logs_trade_id_fk
  FOREIGN KEY (trade_id) REFERENCES public.trades (id)
  ON DELETE CASCADE;

-- G-018 (escrow_accounts table created — Week 4):
ALTER TABLE public.escrow_lifecycle_logs
  ADD CONSTRAINT escrow_lifecycle_logs_escrow_id_fk
  FOREIGN KEY (escrow_id) REFERENCES public.escrow_accounts (id)
  ON DELETE CASCADE;
```

These migrations will be authored in their respective governance items. The `COMMENT ON COLUMN` on both `trade_id` and `escrow_id` columns in the current migration records this intent at the DB metadata level.

---

## Actor Type Semantics (D-020-A)

Every permitted edge in `allowed_transitions` carries an `allowed_actor_type TEXT[] NOT NULL` column. The six constitutional actor types are:

| Actor Type | Description |
|-----------|-------------|
| `TENANT_USER` | Standard authenticated org member |
| `TENANT_ADMIN` | Org-level administrator (higher privilege within tenant boundary) |
| `PLATFORM_ADMIN` | TexQtic control-plane operator (`app.is_admin = 'true'`) |
| `SYSTEM_AUTOMATION` | Automated process, background job. NOT AI. For mechanical operations only (e.g. SLA timeout escalation) |
| `MAKER` | Initiating party in a Maker-Checker flow. Must not be the CHECKER for the same request |
| `CHECKER` | Approving party in a Maker-Checker flow. Must be a different principal from the MAKER |

**Enforcement chain:**

1. DB `CHECK (array_length(allowed_actor_type, 1) >= 1)` — empty arrays are schema-prohibited
2. `StateMachineService` classifies the incoming actor into one of the six types before edge lookup
3. If the actor's type is not in `allowed_actor_type` for the matched edge: `ACTOR_ROLE_NOT_PERMITTED`
4. `PLATFORM_ADMIN` cannot impersonate `SYSTEM_AUTOMATION` and vice versa — types are disjoint

---

## Escrow Neutrality Enforcement (D-020-B)

The `escrow_lifecycle_logs` table is constitutionally bound by the **Escrow Neutrality Clause** (D-020-B):

> Escrow state transitions are acknowledgement records only. They assert that two or more parties have reached a shared understanding of an escrow arrangement's status.

**Permanently prohibited in this table and in any escrow-domain transition:**

- Any monetary, price, amount, or settlement field
- Any payment gateway invocation
- Any ledger entry or settlement instruction
- Fund movement, reservation, capture, or release

If a future product requirement demands financial settlement behaviour, a separate **Fintech Integration Review** must be conducted and approved before any escrow-state transition may carry financial side-effects. The state machine is not the appropriate integration point for financial operations.

This is recorded at the database level via `COMMENT ON TABLE`.

---

## AI Decision Boundary (D-020-C)

The `ai_triggered` column on both log tables implements the constitutional AI boundary:

- **AI may**: recommend transitions, flag trade risk, propose compliance outcomes — all advisory
- **AI may not**: call `StateMachineService.transition()` directly, approve its own suggestions, or set `current_state_id` on any entity

`ai_triggered = true` means a human review and explicit confirmation occurred. When set, the `reason` field must follow the format:

```
AI_RECOMMENDED: <summary> — HUMAN_CONFIRMED by <actorId>
```

`SYSTEM_AUTOMATION` actor type is reserved for pre-approved, rule-based mechanical operations (SLA timeout escalation, expiry triggers). AI inference-based automation is **not** classified as `SYSTEM_AUTOMATION` — it requires a human confirmation gate.

---

## Immutability Enforcement Layers (D-020-D)

Log rows, once written, are permanent. Three independent layers enforce this:

### Layer 1 — Service Layer

`StateMachineService` exposes only an INSERT method for log rows. No `updateTransitionLog()` or `deleteTransitionLog()` method exists or may be created. Callers cannot bypass this without writing raw SQL.

### Layer 2 — DB Trigger

```sql
CREATE TRIGGER trg_immutable_trade_lifecycle_log
  BEFORE UPDATE OR DELETE ON public.trade_lifecycle_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_lifecycle_log_update_delete();
```

Raises `SQLSTATE P0001` (`LIFECYCLE_LOG_IMMUTABLE`) unconditionally. Fires for all roles including `postgres`. Cannot be bypassed without dropping the trigger, which requires a `postgres`-level migration window and is logged at Supabase infrastructure level.

**This trigger also attaches to `escrow_lifecycle_logs`.**

### Layer 3 — RLS

```sql
-- UPDATE unconditionally denied
CREATE POLICY trade_lifecycle_logs_no_update ... FOR UPDATE TO texqtic_app USING (false);

-- DELETE unconditionally denied
CREATE POLICY trade_lifecycle_logs_no_delete ... FOR DELETE TO texqtic_app USING (false);
```

No `texqtic_app` or `texqtic_admin` role can UPDATE or DELETE a log row. Even if the trigger is somehow disabled, RLS blocks the operation at the permission layer.

### Correction Protocol

If a log entry contains an error, the correction mechanism is:

1. INSERT a new row with `reason: "CORRECTION OF LOG_ID <uuid-of-wrong-row>"`
2. Create a G-022 escalation record documenting the correction
3. The original row remains immutable and is permanently visible in audit history

---

## RLS Configuration Summary

| Table | ENABLE RLS | FORCE RLS | Tenant SELECT | Tenant INSERT | UPDATE | DELETE |
|-------|-----------|-----------|--------------|--------------|--------|--------|
| `lifecycle_states` | ✅ | ✅ | `USING(true)` | — | — | — |
| `allowed_transitions` | ✅ | ✅ | `USING(true)` | — | — | — |
| `trade_lifecycle_logs` | ✅ | ✅ | `org_id = app.org_id` | `org_id = app.org_id` | `USING(false)` | `USING(false)` |
| `escrow_lifecycle_logs` | ✅ | ✅ | `org_id = app.org_id` | `org_id = app.org_id` | `USING(false)` | `USING(false)` |

All tenant scoping uses `current_setting('app.org_id', true)` exclusively. `app.tenant_id` is never referenced.

---

## Doctrine References

| Reference | How This Migration Aligns |
|-----------|--------------------------|
| Doctrine v1.4 §3.1 | `org_id` as canonical isolation variable. No `tenant_id` in RLS policies. |
| Doctrine v1.4 (append-only) | Three-layer log immutability: service + trigger + RLS |
| G-020 Design v1.1 §2.2 | `lifecycle_states` matches Table A specification |
| G-020 Design v1.1 §2.3 | `allowed_transitions` matches Table B specification + D-020-A `allowed_actor_type` |
| G-020 Design v1.1 §9.4 | 16 mandatory audit fields present on log tables |
| D-020-A | `allowed_actor_type TEXT[] NOT NULL` on `allowed_transitions`, 6-type enum CHECK on logs |
| D-020-B | Escrow neutrality: no financial columns on `escrow_lifecycle_logs` |
| D-020-C | `ai_triggered BOOLEAN` column + comment on both log tables |
| D-020-D | DB trigger + RLS DENY on UPDATE/DELETE + `reason TEXT NOT NULL` |
| TECS v1.6 | Wave-3 S2 sequencing: governance infra (Week 2) before trade domain (Week 3) |

---

## Validation Checklist

Before committing, verify:

```bash
# Format check
pnpm -C server exec prisma format

# Client generation (must succeed with zero errors)
pnpm -C server exec prisma generate

# TypeScript clean compile
pnpm -C server exec tsc --noEmit
```

Integration verification (against Supabase test DB):

```sql
-- 1. All four tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('lifecycle_states','allowed_transitions',
                     'trade_lifecycle_logs','escrow_lifecycle_logs')
ORDER BY 1;
-- Expected: 4 rows

-- 2. FORCE RLS active
SELECT relname, relrowsecurity, relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND relname IN ('lifecycle_states','allowed_transitions',
                  'trade_lifecycle_logs','escrow_lifecycle_logs');
-- Expected: relrowsecurity = true, relforcerowsecurity = true for all 4

-- 3. Immutability triggers present
SELECT tgname, relname FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE relname IN ('trade_lifecycle_logs','escrow_lifecycle_logs');

-- 4. UPDATE denied on trade_lifecycle_logs (should raise P0001)
BEGIN;
SET app.org_id = '<valid-org-uuid>';
INSERT INTO trade_lifecycle_logs (org_id, trade_id, from_state_key, to_state_key,
  actor_type, actor_role, reason, actor_user_id)
VALUES ('<org>', gen_random_uuid(), 'DRAFT', 'RFQ_SENT',
        'TENANT_USER', 'MEMBER', 'Test transition', '<user-uuid>');
UPDATE trade_lifecycle_logs SET reason = 'MUTATED' WHERE trade_id = '<above>';
-- Expected: ERROR LIFECYCLE_LOG_IMMUTABLE
ROLLBACK;

-- 5. Cross-org INSERT denied (should produce 0 rows visible or policy error)
SET app.org_id = '<different-org-uuid>';
SELECT COUNT(*) FROM trade_lifecycle_logs WHERE org_id = '<original-org>';
-- Expected: 0 rows (RLS filters)
```

---

## Post-Migration State

After this migration:

| Status | Detail |
|--------|--------|
| ✅ State machine tables exist | `lifecycle_states`, `allowed_transitions` ready to receive seed data |
| ✅ Logs are immutable | Three-layer enforcement active from day zero |
| ✅ Actor type enforcement live | Schema-level `TEXT[] NOT NULL` + `array_length >= 1` CHECK |
| ✅ Escrow neutrality enforced | No financial columns exist or can be added without Fintech Review |
| ✅ AI boundary recorded | `ai_triggered` column present with constitutional comment |
| ✅ FORCE RLS on all four tables | No table bypasses RLS |
| ⏳ Trade domain tables | Sequenced to G-017 (Week 3) — FK hardening follows |
| ⏳ Escrow domain tables | Sequenced to G-018 (Week 4) — FK hardening follows |
| ⏳ Allowed transition seed data | Day 3 — StateMachineService implementation scope |
| ⏳ StateMachineService | Day 3 — relies on this migration being applied |
