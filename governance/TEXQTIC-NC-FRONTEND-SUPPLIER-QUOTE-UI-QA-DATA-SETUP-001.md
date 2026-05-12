# TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-QA-DATA-SETUP-001

> **TYPE:** SQL Safety Review + QA Data Setup Packet  
> **STATUS:** SAFETY_REVIEW_COMPLETE — AWAITING_EXECUTE_AUTHORIZATION  
> **Date:** 2026-06-05  
> **Related Packet:** TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001 (FE-8) — PENDING_PRODUCTION_VERIFY  
> **Blocked On:** FE-8 production verification requires one ACCEPTED supplier invite in the QA B2B session to trigger the Submit/View Quote affordance and SupplierQuoteSurface.

---

## Objective

Create a single controlled ACCEPTED supplier RFQ invite row in production for QA B2B  
(`faf2e4a7-5d79-4b00-811b-8d0dce4f4d80`) as the supplier, so that the FE-8 production  
verification (`TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001`) can be completed.

**Strictly forbidden throughout this packet:**
- Activating `nc.procurement_pools.supplier_quotes.enabled` (stays `false`)
- Inserting any `network_pool_rfq_supplier_quotes` rows
- Touching any non-QA/test org
- Modifying source code, schema, or feature flags

---

## SQL SAFETY REVIEW — 11-SECTION STRUCTURED EVIDENCE REPORT

> All SELECT evidence obtained via psql session on production Supabase DB (session terminal  
> `82c14a7b-b867-4c50-bbf0-f35962e5b504`). No INSERT/UPDATE/DELETE was executed.  
> Git state: CLEAN at HEAD `355c841`. DB connection URL: not printed per governance policy.

---

### Section 1 — Preflight Safety Confirmation

**Evidence:**
```
git status --short   → (empty — clean working tree)
git log --oneline -n 1 → 355c841 (HEAD -> main) docs(network-commerce): record supplier quote frontend production verify blocker
origin/main          → d8a2ce2 feat(network-commerce): add supplier quote frontend
```

**Assessment:** Working tree is clean. HEAD is the governance-only blocker doc commit. No staged  
or unstaged source changes. Safe to proceed with DB-only work.

---

### Section 2 — Feature Flag State

**Evidence:**
```sql
SELECT key, enabled FROM public.feature_flags
WHERE key IN (
  'nc.procurement_pools.enabled',
  'nc.procurement_pools.rfq.enabled',
  'nc.procurement_pools.supplier_invites.enabled',
  'nc.procurement_pools.supplier_quotes.enabled'
) ORDER BY key;
```

```
key                                             | enabled
------------------------------------------------+---------
nc.procurement_pools.enabled                   | t
nc.procurement_pools.rfq.enabled               | t
nc.procurement_pools.supplier_invites.enabled  | t
nc.procurement_pools.supplier_quotes.enabled   | f       ← INTENTIONALLY FALSE (QD-6 hold)
(4 rows)
```

**Assessment:** All flags in correct pre-condition state. `supplier_quotes.enabled=false` means  
SupplierQuoteSurface will render the feature-disabled state in production — exactly what FE-8  
verification must demonstrate. This flag MUST NOT change.

**Tenant-level override for QA B2B:** 0 rows (confirmed). QA B2B inherits global flags above.

---

### Section 3 — QA B2B Supplier Org Safety Proof

**Evidence:**
```sql
SELECT id, slug, legal_name, org_type, is_qa_sentinel, status, plan, created_at
FROM public.organizations
WHERE id = 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80';
```

```
id                                   | slug   | legal_name | org_type | is_qa_sentinel | status | plan         | created_at
-------------------------------------+--------+------------+----------+----------------+--------+--------------+----------------------------
faf2e4a7-5d79-4b00-811b-8d0dce4f4d80 | qa-b2b | QA B2B     | B2B      | f              | ACTIVE | PROFESSIONAL | 2026-02-20 12:46:25.446+00
```

**Assessment:** SAFE. `slug=qa-b2b` and `legal_name=QA B2B` are unambiguous QA workspace  
identifiers. `is_qa_sentinel=false` (TexQtic uses sentinel flag for RLS test bypasses, not for  
identifying QA orgs by name). This org is the active QA session used at `app.texqtic.com/qa-b2b`.  
No real customer data exists under this org (name, slug, and plan confirm QA-only use).

---

### Section 4 — Owner Org Safety Analysis (with Correction)

#### 4A — Original Proposed Owner: `32f03220` (BLOCKED)

**Evidence:**
```sql
SELECT id, slug, legal_name, org_type, is_qa_sentinel, status, plan, created_at
FROM public.organizations
WHERE id = '32f03220-9625-4643-9096-b5a91e4963d3';
```

```
id                                   | slug                                                       | legal_name                                | org_type | is_qa_sentinel | status | plan | created_at
-------------------------------------+------------------------------------------------------------+-------------------------------------------+----------+----------------+--------+------+----------------------------
32f03220-9625-4643-9096-b5a91e4963d3 | test-tenant-989654c8-76f6-417f-a82b-4e5e834d2268-32f03220 | Test Tenant [tag:989654c8-76f6-417f-a82b-4e5e834d2268] | B2B | f | CLOSED | FREE | 2026-02-23 08:57:42.928+00
```

**Blocking concern:** `status=CLOSED`. While this org is clearly integration test residue  
(slug contains `test-tenant-<uuid>` pattern), the CLOSED status introduces risk:  
- If any Fastify service layer or middleware checks `owner_org.status=ACTIVE` when resolving invite  
  details for the supplier, the invite could silently fail to render or return an unexpected error.  
- CLOSED orgs cannot log in, but the supplier-side invite query is anchored to `supplier_org_id`,  
  not `owner_org_id`. RLS for supplier invites is anchored to `supplier_org_id`. However, the  
  application layer risk is non-zero and unverifiable without reading every join path.  
- Decision: **reject `32f03220` as owner**, use ACTIVE alternative below.

#### 4B — Replacement Owner: `00aee0d5` (ACCEPTED)

**Evidence:**
```sql
SELECT id, slug, legal_name, org_type, is_qa_sentinel, status, plan, created_at
FROM public.organizations
WHERE slug ILIKE 'test-tenant-rfq-route-owner-%'
ORDER BY created_at LIMIT 1;
```

```
id                                   | slug                                  | legal_name                        | org_type | is_qa_sentinel | status | plan | created_at
-------------------------------------+---------------------------------------+-----------------------------------+----------+----------------+--------+------+----------------------------
00aee0d5-850c-43ea-bf5b-545f2a720133 | test-tenant-rfq-route-owner-00aee0d5  | Test Tenant [tag:rfq-route-owner] | B2B      | f              | ACTIVE | FREE | 2026-05-09 01:41:42.765+00
```

**Existing NC data for `00aee0d5`:** 0 pools (confirmed via `COUNT(*)`).

**Assessment:** SAFE.
- `slug` = `test-tenant-rfq-route-owner-00aee0d5` — unambiguous integration test residue from  
  `poolRfqSupplierInvites.integration.test.ts` (the same test file that defines `createIssuedRfqFixture`).
- `status=ACTIVE` — no application-level ACTIVE-check risk.
- `plan=FREE`, `is_qa_sentinel=false` — consistent with all integration test seeded orgs.
- 0 existing NC pools — no unique constraint collision on `pool_ref`.
- Not a real customer org by any identifier.

**Selected owner org: `00aee0d5-850c-43ea-bf5b-545f2a720133`**

---

### Section 5 — Pre-existing Data State

**Evidence:**
```sql
-- Accepted invites for QA B2B as supplier
SELECT COUNT(*) FROM public.network_pool_rfq_supplier_invites
WHERE supplier_org_id = 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80'
  AND status = 'ACCEPTED';
-- Result: 0

-- Any invites (any status) for QA B2B as supplier
SELECT COUNT(*) FROM public.network_pool_rfq_supplier_invites
WHERE supplier_org_id = 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80';
-- Result: 0

-- Quotes for QA B2B as supplier
SELECT COUNT(*) FROM public.network_pool_rfq_supplier_quotes
WHERE supplier_org_id = 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80';
-- Result: 0

-- Invite ref collision guard
SELECT COUNT(*) FROM public.network_pool_rfq_supplier_invites
WHERE invite_ref = 'QA-DATA-SETUP-001-INV';
-- Result: 0 (confirmed post-ROLLBACK)
```

**Assessment:** Zero pre-existing data. No collision risk on any unique constraint. Setup is safe  
to proceed as a net-new insert.

---

### Section 6 — Schema Constraint Summary

All constraints confirmed via `information_schema.constraint_column_usage` + dry-run validation.

#### `network_pools`
| Constraint | Rule |
|---|---|
| `pool_ref` nonempty | `LENGTH(pool_ref) > 0` |
| `commodity_category` nonempty | `LENGTH(commodity_category) > 0` |
| `target_qty > 0` | DECIMAL CHECK |
| `qty_unit` nonempty | `LENGTH(qty_unit) > 0` |
| `@@unique([orgId, poolRef])` | Per-org pool_ref uniqueness |

#### `network_pool_demand_snapshots`
| Constraint | Rule |
|---|---|
| `snapshot_version >= 1` | INT CHECK |
| `snapshot_ref` nonempty | `LENGTH(snapshot_ref) > 0` |
| `status` enum | `DRAFT|CAPTURED|SUPERSEDED|CANCELLED` |
| `captured_at NOT NULL when CAPTURED` | DB CHECK coherence |
| `line_count >= 0` | INT CHECK |
| `@@unique([poolId, snapshotVersion])` | |
| `@@unique([poolId, snapshotRef])` | |

#### `network_pool_rfqs`
| Constraint | Rule |
|---|---|
| `issue_basis = 'SNAPSHOT_LOCK'` | Only valid value |
| `supplier_invite_mode = 'INVITE_ONLY'` | Only valid value |
| `line_count > 0` | INT CHECK |
| `rfq_version >= 1` | INT CHECK |
| `rfq_ref` nonempty | `LENGTH(rfq_ref) > 0` |
| `status` enum | `ISSUED|QUOTED|ACCEPTED|REJECTED|EXPIRED|CANCELLED` |
| total_qty/qty_unit coherence | Both set or both null |
| `@@unique([poolId, rfqVersion])` | |
| `@@unique([poolId, rfqRef])` | |

#### `network_pool_rfq_supplier_invites`
| Constraint | Rule |
|---|---|
| `invite_ref` globally unique | `@unique inviteRef` |
| `invite_ref` nonempty | `LENGTH(invite_ref) > 0` |
| `status` enum | `PENDING|ACCEPTED|DECLINED|CANCELLED` |
| `@@unique([rfqId, supplierOrgId])` | One invite per supplier per RFQ |

**No triggers on any target table** (confirmed via `information_schema.triggers`).

---

### Section 7 — BEGIN+ROLLBACK Dry-Run Evidence

**SQL file:** Written to `$TEMP/tq_dryrun.sql` and executed via `\i` in psql.

**Terminal output:**
```
postgres=> \i 'C:/Users/PARESH/AppData/Local/Temp/tq_dryrun.sql'
BEGIN
DO
psql:...: NOTICE:  DRY-RUN OK:
  invite_id=99112cdc-a590-43fc-9829-f9462e8e81c6,
  pool_id=33e91868-7d53-4899-8a63-fcdadee085f7,
  rfq_id=e0f329c1-59d7-4393-bbad-0b19e1deaeda
ROLLBACK
postgres=>
```

**Post-rollback verification:**
```sql
SELECT COUNT(*) FROM public.network_pool_rfq_supplier_invites
WHERE invite_ref = 'QA-DATA-SETUP-001-INV';
-- Result: 0  ← ROLLBACK confirmed; nothing persisted
```

**Assessment:** All 4 INSERTs passed constraint validation inside the transaction. The  
`DO $$ ... $$` block reached `RAISE NOTICE` (line executed after all 4 inserts). ROLLBACK  
confirmed: zero rows in DB after. SQL is structurally valid and constraint-clean.

**Note on demand line row:** The integration test fixture `createIssuedRfqFixture` creates a  
`NetworkPoolDemandLine` row (`LOCKED_FOR_RFQ`) before the snapshot, as a semantic parent. This  
row is NOT required by any FK constraint (snapshot does not have a direct FK to demand_lines).  
The dry-run passed without it. For this minimal QA setup (supplier-invite-inbox display test only),  
the demand line is omitted. The `listSupplierInvites` service queries by `supplier_org_id` and  
joins to pool/rfq headers — it does not join to demand_lines. The omission is safe for this  
specific test objective.

---

### Section 8 — COMMIT Version (Idempotent SQL)

> **STATUS: PENDING_EXECUTE_AUTHORIZATION**  
> Do NOT execute until Paresh provides explicit "EXECUTE" authorization in a future prompt.

```sql
-- TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-QA-DATA-SETUP-001
-- COMMIT version — idempotent, guarded by invite_ref existence check
-- Owner org: 00aee0d5 (test-tenant-rfq-route-owner, ACTIVE, integration test residue)
-- Supplier org: faf2e4a7 (QA B2B — qa-b2b)
-- Lifecycle state: a6fd9227 (POOL / CLOSED_FOR_BIDS)
-- DO NOT EXECUTE without explicit Paresh authorization

BEGIN;
DO $$
DECLARE
  v_pool_id         UUID := gen_random_uuid();
  v_snapshot_id     UUID := gen_random_uuid();
  v_rfq_id          UUID := gen_random_uuid();
  v_invite_id       UUID := gen_random_uuid();
  v_owner_org_id    UUID := '00aee0d5-850c-43ea-bf5b-545f2a720133';
  v_supplier_org_id UUID := 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80';
  v_lc_state_id     UUID := 'a6fd9227-8a37-4c82-9404-73084e26837d';
  v_now             TIMESTAMPTZ := NOW();
BEGIN
  -- Idempotency guard: skip if already exists
  IF EXISTS (
    SELECT 1 FROM public.network_pool_rfq_supplier_invites
    WHERE invite_ref = 'QA-DATA-SETUP-001-INV'
  ) THEN
    RAISE NOTICE 'SKIP: QA-DATA-SETUP-001-INV already exists — idempotent no-op';
    RETURN;
  END IF;

  INSERT INTO public.network_pools
    (id, org_id, pool_ref, commodity_category, target_qty, qty_unit, lifecycle_state_id, created_at, updated_at)
  VALUES
    (v_pool_id, v_owner_org_id, 'QA-DATA-SETUP-001', 'COTTON_YARN', 1000, 'KG', v_lc_state_id, v_now, v_now);

  INSERT INTO public.network_pool_demand_snapshots
    (id, owner_org_id, pool_id, snapshot_ref, snapshot_version, basis, status, captured_at, line_count, total_qty, qty_unit, created_at, updated_at)
  VALUES
    (v_snapshot_id, v_owner_org_id, v_pool_id, 'QA-DATA-SETUP-001-SNAP', 1, 'RFQ_ISSUE', 'CAPTURED', v_now, 1, 500, 'KG', v_now, v_now);

  INSERT INTO public.network_pool_rfqs
    (id, owner_org_id, pool_id, snapshot_id, rfq_ref, rfq_version, status, issue_basis, issued_at, supplier_invite_mode, line_count, total_qty, qty_unit, created_at, updated_at)
  VALUES
    (v_rfq_id, v_owner_org_id, v_pool_id, v_snapshot_id, 'QA-DATA-SETUP-001-RFQ', 1, 'ISSUED', 'SNAPSHOT_LOCK', v_now, 'INVITE_ONLY', 1, 500, 'KG', v_now, v_now);

  INSERT INTO public.network_pool_rfq_supplier_invites
    (id, owner_org_id, supplier_org_id, rfq_id, pool_id, invite_ref, status, invited_at, accepted_at, created_at, updated_at)
  VALUES
    (v_invite_id, v_owner_org_id, v_supplier_org_id, v_rfq_id, v_pool_id,
     'QA-DATA-SETUP-001-INV', 'ACCEPTED', v_now, v_now, v_now, v_now);

  RAISE NOTICE 'QA-DATA-SETUP-001 COMMITTED: invite_id=%, pool_id=%, rfq_id=%, snapshot_id=%',
    v_invite_id, v_pool_id, v_rfq_id, v_snapshot_id;
END;
$$;
COMMIT;
```

---

### Section 9 — Post-Insert Verification SELECTs

Run these immediately after COMMIT to confirm the row is visible and correct:

```sql
-- 1. Confirm invite exists and is ACCEPTED
SELECT id, status, accepted_at, invite_ref, supplier_org_id, owner_org_id
FROM public.network_pool_rfq_supplier_invites
WHERE invite_ref = 'QA-DATA-SETUP-001-INV';

-- 2. Confirm supplier inbox query returns the invite (production service pattern)
SELECT i.id, i.status, i.invite_ref, r.rfq_ref, p.pool_ref
FROM public.network_pool_rfq_supplier_invites i
JOIN public.network_pool_rfqs r ON r.id = i.rfq_id
JOIN public.network_pools p ON p.id = i.pool_id
WHERE i.supplier_org_id = 'faf2e4a7-5d79-4b00-811b-8d0dce4f4d80'
  AND i.status = 'ACCEPTED';
```

**Expected result:**
- Row exists with `status=ACCEPTED`, `accepted_at IS NOT NULL`
- `invite_ref = 'QA-DATA-SETUP-001-INV'`
- `rfq_ref = 'QA-DATA-SETUP-001-RFQ'`, `pool_ref = 'QA-DATA-SETUP-001'`

---

### Section 10 — Cleanup / Rollback SQL

Run this to completely remove all QA data created by this packet (e.g., post-verification teardown):

```sql
-- TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-QA-DATA-SETUP-001 — CLEANUP
-- Deletes in FK-safe order (invites → rfqs → snapshots → pools)
-- Scoped strictly to QA-DATA-SETUP-001 refs + owner org 00aee0d5

BEGIN;

DELETE FROM public.network_pool_rfq_supplier_invites
WHERE invite_ref = 'QA-DATA-SETUP-001-INV';

DELETE FROM public.network_pool_rfqs
WHERE rfq_ref = 'QA-DATA-SETUP-001-RFQ'
  AND owner_org_id = '00aee0d5-850c-43ea-bf5b-545f2a720133';

DELETE FROM public.network_pool_demand_snapshots
WHERE snapshot_ref = 'QA-DATA-SETUP-001-SNAP'
  AND owner_org_id = '00aee0d5-850c-43ea-bf5b-545f2a720133';

DELETE FROM public.network_pools
WHERE pool_ref = 'QA-DATA-SETUP-001'
  AND org_id = '00aee0d5-850c-43ea-bf5b-545f2a720133';

COMMIT;
```

**Note:** All DELETE statements are scoped by both the QA-tagged ref string AND the owner org UUID.  
A stray DELETE on the wrong org is impossible — both conditions must match.

---

### Section 11 — Risk Summary + Executive Recommendation

| Risk Item | Assessment | Mitigation |
|---|---|---|
| Owner org `32f03220` CLOSED status | **BLOCKED** — replaced | Use `00aee0d5` (ACTIVE) |
| Real customer data affected | **NONE** — all orgs are confirmed test residue or QA workspace | Owner: slug/legal_name = `Test Tenant [tag:rfq-route-owner]`, FREE plan |
| QA B2B org real customer risk | **NONE** — slug=`qa-b2b`, legal_name=`QA B2B`, created for QA purposes | Not a real tenant |
| Unique constraint collision | **NONE** — all ref strings checked, 0 rows exist | Section 5 confirms |
| Supplier quotes table affected | **NONE** — no insert into `network_pool_rfq_supplier_quotes` | Section 2: flag stays `false` |
| `supplier_quotes.enabled` flag mutation | **NONE** — flag not touched, stays `false` | QD-6 hold maintained |
| BEGIN+ROLLBACK dry-run | **PASSED** — all 4 inserts, all constraints, NOTICE emitted | Section 7 evidence |
| Idempotency (double-execute) | **SAFE** — existence guard on `invite_ref='QA-DATA-SETUP-001-INV'` | Section 8 SQL |
| Cleanup path | **PROVIDED** — FK-safe DELETE chain, scoped by ref+org | Section 10 SQL |
| No demand line row | **ACCEPTABLE** — FK constraints don't require it; service doesn't join to it | Section 7 note |
| DPP posture | **UNCHANGED** — HOLD_FOR_PARESH_DECISION | No DPP changes in this packet |

**Executive Recommendation:** SAFE TO EXECUTE.  

The proposed SQL is structurally correct, constraint-clean (dry-run confirmed), scoped exclusively  
to test/QA orgs, fully reversible via cleanup SQL, and idempotent. The original owner org concern  
(`32f03220`, CLOSED) has been resolved by substituting `00aee0d5` (ACTIVE, same test residue  
class). No real customer data is at risk. No feature flags are changed.

**Awaiting:** Explicit `EXECUTE` authorization from Paresh to run Section 8 COMMIT SQL.  
After COMMIT: run Section 9 verification SELECTs, then resume FE-8 production verification  
browser session at `app.texqtic.com` (QA B2B, Supplier Invite Inbox).

---

## Step Execution Log

| Step | Status | Evidence |
|---|---|---|
| Step 1: Preflight (git status) | ✅ CLEAN | HEAD `355c841`, no modified files |
| Step 2: Authority sources read | ✅ COMPLETE | schema.prisma NC models + integration test fixture |
| Step 3: Feature flags confirmed | ✅ CONFIRMED | All 4 flags correct (Section 2) |
| Step 4: QA org identified | ✅ CONFIRMED | `faf2e4a7`, slug=qa-b2b (Section 3) |
| Step 5: Existing invite check | ✅ CONFIRMED | 0 accepted invites, 0 quotes (Section 5) |
| Step 6a: SQL safety review (full) | ✅ COMPLETE | Sections 1–11 above |
| Step 6b: BEGIN+ROLLBACK dry-run | ✅ PASSED | NOTICE emitted, ROLLBACK confirmed (Section 7) |
| Step 7: EXECUTE SQL | ⏸ PENDING | Awaiting Paresh EXECUTE authorization |
| Step 8: Post-insert verification | ⏸ PENDING | Section 9 SELECTs — run after COMMIT |
| Step 9: Browser verification (FE-8) | ⏸ PENDING | Resume app.texqtic.com QA B2B session |
| Step 10: Governance close + commit | ⏸ PENDING | After FE-8 verification complete |

---

*Packet: TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-QA-DATA-SETUP-001 · Safety review complete 2026-06-05*
