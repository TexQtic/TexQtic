# PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SQL-RLS-VERIFIED-001

## Metadata

| Field | Value |
|---|---|
| Document ID | PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SQL-RLS-VERIFIED-001 |
| Task | TTP-SCORE-SNAPSHOT-SQL-RLS-001 (Slice 1) |
| Date | 2026-05-05 |
| Status | `IMPLEMENTED_PENDING_COMMIT_2` |
| Authority | Paresh Sharma — TexQtic founder / operator |
| `ttp_enabled` state | `false` — UNCHANGED, IMMUTABLE |
| Commit 1 | `5e8ac44` — `feat(tradetrust-pay): add ttp score snapshot table` |
| Precursor design record | `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001` |
| Tracker | `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` |

---

## 1. Authority Basis

This verification record covers Slice 1 of `TTP-SCORE-SNAPSHOT-IMPL-001`:
**SQL + RLS only — no application code, no service layer, no routes.**

Authority chain:
- `TTP-SCORE-SNAPSHOT-DESIGN-001` design complete; OQ-SS-01 through OQ-SS-07 resolved by Paresh Sharma
- Full design rationale in `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001`
- Slice 1 authorized scope: `ttp_score_snapshots` table DDL + RLS + Prisma sync only

---

## 2. Files Changed (Commit 1 — `5e8ac44`)

| File | Change |
|---|---|
| `server/prisma/migrations/20260516000000_ttp_score_snapshot_001/migration.sql` | NEW — full DDL: table, indexes, immutability trigger, RLS, grants |
| `server/prisma/schema.prisma` | MODIFIED by `prisma db pull` — `ttp_score_snapshots` model added (65 models total) |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | MODIFIED — §5, §9, §17, §18, §20 updated to `IMPLEMENTATION_IN_PROGRESS` / `IMPLEMENTED_PENDING_VERIFICATION` |

Prisma generated client updated in-place by `prisma generate` (not committed separately — generated output only).

---

## 3. SQL Migration Summary

### 3.1 Table: `public.ttp_score_snapshots`

17 columns:

| Column | Type | Nullable |
|---|---|---|
| `id` | `uuid` | NOT NULL (PK, default `gen_random_uuid()`) |
| `org_id` | `uuid` | NOT NULL |
| `trade_id` | `uuid` | NULL |
| `invoice_id` | `uuid` | NULL |
| `vpc_id` | `uuid` | NULL |
| `enrollment_id` | `uuid` | NULL |
| `score_value` | `smallint` | NOT NULL |
| `score_band` | `text` | NOT NULL |
| `score_version` | `text` | NOT NULL |
| `score_detail_json` | `jsonb` | NOT NULL |
| `trigger_event` | `text` | NOT NULL |
| `source_event_id` | `uuid` | NULL |
| `actor_id` | `uuid` | NULL |
| `score_disclaimer_hash` | `text` | NOT NULL |
| `route_disclaimer_hash` | `text` | NOT NULL |
| `metadata_json` | `jsonb` | NULL |
| `created_at` | `timestamp with time zone` | NOT NULL (default `now()`) |

### 3.2 Constraints (10 total)

| Constraint | Type |
|---|---|
| `ttp_score_snapshots_pkey` | PRIMARY KEY (`id`) |
| `ttp_score_snapshots_score_value_check` | CHECK (`score_value` BETWEEN 0 AND 100) |
| `ttp_score_snapshots_score_band_check` | CHECK (`score_band` IN ('READY','NEAR_READY','NEEDS_REVIEW','NOT_READY')) |
| `ttp_score_snapshots_score_version_check` | CHECK (`score_version` IN ('TTP_V1','TEXQTICSCORE_V2')) |
| `ttp_score_snapshots_trigger_event_check` | CHECK (`trigger_event` IN ('VPC_ISSUED','ENROLLMENT_APPROVED','ADMIN_REVIEW_COMPLETE','PARTNER_TRANSMITTED')) |
| `ttp_score_snapshots_org_id_fk` | FK → `orgs(id)` ON DELETE CASCADE |
| `ttp_score_snapshots_trade_id_fk` | FK → `trade_transactions(id)` ON DELETE SET NULL |
| `ttp_score_snapshots_invoice_id_fk` | FK → `invoices(id)` ON DELETE SET NULL |
| `ttp_score_snapshots_vpc_id_fk` | FK → `vpc_documents(id)` ON DELETE SET NULL |
| `ttp_score_snapshots_enrollment_id_fk` | FK → `ttp_enrollments(id)` ON DELETE SET NULL |

### 3.3 Indexes (4 custom + 1 PKey = 5 total)

| Index | Columns |
|---|---|
| `ttp_score_snapshots_pkey` | `id` |
| `idx_ttp_score_snapshots_org_created` | `org_id, created_at DESC` |
| `idx_ttp_score_snapshots_vpc` | `vpc_id` WHERE `vpc_id IS NOT NULL` |
| `idx_ttp_score_snapshots_trade_created` | `trade_id, created_at DESC` WHERE `trade_id IS NOT NULL` |
| `idx_ttp_score_snapshots_trigger_source` | `trigger_event, source_event_id` WHERE `source_event_id IS NOT NULL` |

### 3.4 Immutability Trigger

- Function: `prevent_ttp_score_snapshot_mutation()` — raises `EXCEPTION` on any UPDATE or DELETE
- Trigger: `trg_ttp_score_snapshot_immutable` — BEFORE UPDATE OR DELETE FOR EACH ROW
- Status: `tgenabled = 'O'` (enabled)
- Rationale: Score snapshots are audit-grade immutable records; no mutation permitted post-insert

### 3.5 RLS — 5 Policies

RLS enabled with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.

| Policy | Command | Type | Logic |
|---|---|---|---|
| `ttp_score_snapshots_guard` | ALL | RESTRICTIVE | `app.require_org_context()` must not throw — baseline org context gate |
| `ttp_score_snapshots_select_unified` | SELECT | PERMISSIVE | `org_id = app.current_org_id()` OR `current_setting('app.is_admin', true) = 'true'` OR `app.bypass_enabled()` |
| `ttp_score_snapshots_insert_unified` | INSERT | PERMISSIVE | USING(`false`) / WITH CHECK: `current_setting('app.is_admin', true) = 'true'` OR `app.bypass_enabled()` — admin/bypass only |
| `ttp_score_snapshots_update_block` | UPDATE | PERMISSIVE | USING(`false`) — always denied |
| `ttp_score_snapshots_delete_block` | DELETE | PERMISSIVE | USING(`false`) — always denied |

Effective behavior: org-scoped reads; admin/bypass-only inserts; updates and deletes unconditionally blocked at RLS layer (in addition to immutability trigger).

### 3.6 Grants

```sql
GRANT SELECT, INSERT ON public.ttp_score_snapshots TO texqtic_app;
```

No UPDATE, DELETE, or TRUNCATE granted.

---

## 4. Prisma Sync

| Step | Result |
|---|---|
| `pnpm -C server exec prisma db pull` | ✅ Introspected **65 models** (was 64 — `ttp_score_snapshots` added) |
| `pnpm -C server exec prisma generate` | ✅ Generated Prisma Client v6.1.0 — clean, no errors |
| `pnpm -C server exec tsc --noEmit` | ✅ Zero TypeScript errors |

---

## 5. Verification Evidence (verbatim psql output)

### 5.1 Columns — 17 rows ✅

```
 id                    | uuid                     | NO
 org_id                | uuid                     | NO
 trade_id              | uuid                     | YES
 invoice_id            | uuid                     | YES
 vpc_id                | uuid                     | YES
 enrollment_id         | uuid                     | YES
 score_value           | smallint                 | NO
 score_band            | text                     | NO
 score_version         | text                     | NO
 score_detail_json     | jsonb                    | NO
 trigger_event         | text                     | NO
 source_event_id       | uuid                     | YES
 actor_id              | uuid                     | YES
 score_disclaimer_hash | text                     | NO
 route_disclaimer_hash | text                     | NO
 metadata_json         | jsonb                    | YES
 created_at            | timestamp with time zone | NO
```

### 5.2 Constraints — 10 rows ✅

```
 ttp_score_snapshots_score_band_check    | c
 ttp_score_snapshots_score_value_check   | c
 ttp_score_snapshots_score_version_check | c
 ttp_score_snapshots_trigger_event_check | c
 ttp_score_snapshots_enrollment_id_fk    | f
 ttp_score_snapshots_invoice_id_fk       | f
 ttp_score_snapshots_org_id_fk           | f
 ttp_score_snapshots_trade_id_fk         | f
 ttp_score_snapshots_vpc_id_fk           | f
 ttp_score_snapshots_pkey                | p
```

### 5.3 Indexes — 5 rows ✅

```
 idx_ttp_score_snapshots_org_created
 idx_ttp_score_snapshots_trade_created
 idx_ttp_score_snapshots_trigger_source
 idx_ttp_score_snapshots_vpc
 ttp_score_snapshots_pkey
```

### 5.4 RLS Policies — 5 rows ✅

```
 ttp_score_snapshots_delete_block   | DELETE | PERMISSIVE
 ttp_score_snapshots_guard          | ALL    | RESTRICTIVE
 ttp_score_snapshots_insert_unified | INSERT | PERMISSIVE
 ttp_score_snapshots_select_unified | SELECT | PERMISSIVE
 ttp_score_snapshots_update_block   | UPDATE | PERMISSIVE
```

### 5.5 Triggers — 11 rows ✅ (1 immutability + 10 RI constraint triggers for 5 FKs)

```
 trg_ttp_score_snapshot_immutable | O
 RI_ConstraintTrigger_a_* (×5)    | O
 RI_ConstraintTrigger_c_* (×5)    | O
```

`tgenabled = 'O'` = trigger enabled (fires normally).

### 5.6 psql apply output (key lines)

```
CREATE TABLE
COMMENT (×5 — table + columns)
CREATE INDEX (×4)
CREATE FUNCTION
COMMENT
NOTICE: trigger "trg_ttp_score_snapshot_immutable" for relation "ttp_score_snapshots" does not exist, skipping
CREATE TRIGGER
ALTER TABLE (ENABLE ROW LEVEL SECURITY)
ALTER TABLE (FORCE ROW LEVEL SECURITY)
NOTICE: policy "ttp_score_snapshots_guard" for table "ttp_score_snapshots" does not exist, skipping (×5)
CREATE POLICY (×5)
GRANT
```

No `ERROR`. No `ROLLBACK`. Migration idempotent via `DROP IF EXISTS` guards.

---

## 6. Safety / No-Go Confirmation

| Invariant | Confirmed |
|---|---|
| `ttp_enabled = false` | ✅ UNCHANGED — no code path activates TTP |
| Application code changes | ✅ NONE — no `.ts`, `.tsx`, `.js` files modified |
| Snapshot service / routes | ✅ NOT implemented — Slice 2+ gated |
| `prisma migrate dev` used | ✅ NOT used — `db pull` + `generate` only |
| `prisma db push` used | ✅ NOT used |
| `PARTNER_TRANSMITTED` write path | ✅ NOT implemented — forward-declared in CHECK constraint only |
| `LEGAL_REVIEW_PENDING` status | ✅ UNCHANGED — legal sign-off still pending |
| RLS bypass created | ✅ NONE — admin/bypass paths use existing `app.bypass_enabled()` and `app.is_admin` mechanisms |
| Cross-tenant query path | ✅ NONE — `org_id` filter required by both RLS policy and application layer |
| Shadow database | ✅ NOT used or referenced |

---

## 7. Final Decision Token

```
TTP_SCORE_SNAPSHOT_SQL_RLS_001_VERIFIED_COMPLETE
```

**`ttp_enabled` state at verification:** `false` — UNCHANGED  
**Slice 2+ gate:** `TTP-SCORE-SNAPSHOT-IMPL-001` Slice 2+ (service, routes, trigger integration) must not be opened until this verification record is committed and Paresh authorizes the next slice explicitly.

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This record verifies Slice 1 SQL+RLS implementation only. It does not authorize any further implementation.*
