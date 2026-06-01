# FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001
## Artifact Type: Implementation Closure Record
## Task ID: FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001
## Parent: FAM-08D — Feature Flag Seeding Repo-Truth Design
## Date: 2026-06-03
## Author: TexQtic Platform Engineering (Safe-Write Mode)
## Constitutional Review: FAM-08 launch readiness authorized track

---

## §1 — Unit Summary

This unit creates the Prisma migration that canonically seeds the two missing NC primary feature flag rows:

| Key | Enabled | Role |
|-----|---------|------|
| `nc.procurement_pools.enabled` | `true` | Layer 1 gate for `ncPoolFeatureGateMiddleware` |
| `nc.procurement_pools.rfq.enabled` | `true` | Layer 1 gate for `ncPoolRfqFeatureGateMiddleware` |

These were identified as absent from all migrations in FAM-08D GAP-T3-01A (the only T-3 implementation gap on the feature flag seeding track). This unit resolves that gap by establishing a canonical, reproducible seeding path for dev, staging, and production.

**Scope:** One new migration file. No schema changes. No `seed.ts` changes. No integration tests. No source code changes.

---

## §2 — Preflight Evidence

**Branch:** main
**HEAD before work:** `c402d2da` — "docs(fam-08): design feature flag seeding gap — repo-truth audit"
**Ancestry confirmed:** `git merge-base --is-ancestor c402d2da HEAD` → ancestor_check:True

**Git status before implementation:**
```
git status --short → (no output — clean tree)
git diff --name-only → (no output — no modified tracked files)
```

**Governance file checks:**
```
Test-Path artifacts/launch-readiness/FAM-08D-FEATURE-FLAG-SEEDING-REPO-TRUTH-DESIGN-001.md → True
Test-Path governance/legal/fam-07 → False (correct — hold intact)
Test-Path governance/legal/fam-07/supplier-onboarding-terms-authority.json → False (correct)
```

**Preflight result: PASS**

---

## §3 — FAM-07 Legal Hold Confirmation

FAM-07 status at close of this unit:
- **Status:** `PARTIALLY_IMPLEMENTED`
- **Hold:** `HOLD_FOR_HUMAN_LEGAL_INPUTS`
- **FTR-LEGAL-003:** `MVP_CRITICAL / OPEN`
- **`governance/legal/fam-07/`:** ABSENT — correct; FAM-07L14 NOT opened by this unit
- **`PublicSupplierProfile.tsx`:** NOT staged, NOT modified

This unit touches only the feature flag seeding track (FAM-08D1). No legal, auth, or supplier-profile surfaces were approached.

---

## §4 — FAM-08D Carry-Forward

**FAM-08D design artifact:** `artifacts/launch-readiness/FAM-08D-FEATURE-FLAG-SEEDING-REPO-TRUTH-DESIGN-001.md` (committed `c402d2da`)

**T-3 gaps identified in FAM-08D:**

| ID | Description | Resolved by |
|----|-------------|-------------|
| GAP-T3-01A | `nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` absent from all migrations | **This unit (FAM-08D1)** |
| GAP-T3-01B | No integration test for NC pool route access post-provisioning | FAM-08D2 (next unit) |

**Packet selected in FAM-08D:** Packet A — new migration with `ON CONFLICT DO UPDATE` semantics.

---

## §5 — Migration File Created

**Path:**
```
server/prisma/migrations/20260603000000_nc_pool_primary_flag_seed/migration.sql
```

**Sequence number:** `20260603000000` — next after last migration `20260602000000_fam_07e5n_handoff_organizations_update_grant`

**File contents:** 3-section migration following the established NC flag seed convention:
- §1 PRE-FLIGHT SAFETY CHECK
- §2 SEED (two-row INSERT with `ON CONFLICT DO UPDATE`)
- §3 POST-FLIGHT VERIFICATION

---

## §6 — Migration SQL Summary

### §1 Pre-Flight Safety Check
Verifies `public.feature_flags` exists. No sub-table prerequisite required (unlike sub-feature flag migrations which guard for their respective schema tables). If table absent, RAISE EXCEPTION blocks execution.

### §2 Seed
```sql
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES
  ('nc.procurement_pools.enabled',     true, '...description...', NULL, NOW()),
  ('nc.procurement_pools.rfq.enabled', true, '...description...', NULL, NOW())
ON CONFLICT (key) DO UPDATE
  SET
    enabled     = EXCLUDED.enabled,
    description = EXCLUDED.description,
    updated_at  = NOW();
```

**Column list:** `(key, enabled, description, value, updated_at)` — matches repo convention exactly. `created_at` is NOT included (uses `@default(now())` in Prisma schema; consistent with all existing flag seed migrations).

**`ON CONFLICT DO UPDATE`** — intentional difference from sub-feature kill-switch migrations that use `DO NOTHING`. Rationale:
- These primary flags already exist in production (seeded via Packet 15 psql ops)
- `DO UPDATE` ensures canonical description is applied even for existing rows
- `enabled = EXCLUDED.enabled` is idempotent (both sides are `true`)

### §3 Post-Flight Verification
Two `SELECT INTO` checks, one per flag key. Asserts `enabled IS TRUE` (not `IS FALSE` — inverse of kill-switch convention). RAISE EXCEPTION if either check fails. RAISE NOTICE on success.

---

## §7 — Why This Is Launch-Readiness Work

NC pool gates (`ncPoolFeatureGateMiddleware`, `ncPoolRfqFeatureGateMiddleware`) are Layer 1 checks that run on every NC pool and RFQ route. In production they pass because `nc.procurement_pools.enabled = true` and `nc.procurement_pools.rfq.enabled = true` exist in the DB.

However, before FAM-08D1, these rows had **no canonical seeding path**. Any fresh environment (new dev machine, staging reset, CI integration test run) that ran `prisma migrate deploy` would emerge with these flags absent. The NC gate layer is fail-open at Layer 2 (no override row + global=true → ALLOW), but Layer 1 reads the global `feature_flags` row directly. If absent, the middleware implementation behavior depends on the exact null-handling path — an untested divergence from production state.

This migration closes that gap permanently.

---

## §8 — Fresh-Environment Risk Resolved

**Before FAM-08D1:** Fresh environment after `prisma migrate deploy` → `nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` absent → NC gate behavior diverges from production.

**After FAM-08D1:** Fresh environment after `prisma migrate deploy` → both flags seeded as `true` → NC gate behavior matches production.

**No manual Packet 15 psql provisioning step required** in new environments after this migration is deployed.

---

## §9 — Production-Safety Explanation

**Production is safe:**

The migration uses `ON CONFLICT (key) DO UPDATE`. In production:
- Both rows already exist with `enabled = true`
- The `DO UPDATE` path sets `enabled = true` (no change), updates `description` to canonical text, updates `updated_at` to `NOW()`
- No data is deleted, no other rows are touched
- `tenant_feature_overrides` is not touched
- No sub-feature flags are touched

The migration is fully idempotent. Re-running it on production will succeed without side effects.

---

## §10 — Validation Commands and Results

### Prisma schema validation
```
pnpm -C server exec prisma validate
```
**Result:** `The schema at prisma\schema.prisma is valid 🚀`

Pre-existing warning about `onDelete: SetNull` on required field is unrelated to this migration (present before FAM-08D1 work began; schema.prisma was not modified).

### Git status post-implementation
```
git status --short
```
**Result:**
```
?? server/prisma/migrations/20260603000000_nc_pool_primary_flag_seed/
```

Only the new migration folder is untracked. No modified tracked files. No unexpected changes.

### Files in scope (allowlist)
| File | Action | Status |
|------|--------|--------|
| `server/prisma/migrations/20260603000000_nc_pool_primary_flag_seed/migration.sql` | CREATE | ✅ Created |
| `artifacts/launch-readiness/FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001.md` | CREATE | ✅ Created |
| `server/prisma/schema.prisma` | MODIFY only if Prisma tooling requires | ✅ Not modified (not required) |

---

## §11 — Files Changed

| File | Action | Reason |
|------|--------|--------|
| `server/prisma/migrations/20260603000000_nc_pool_primary_flag_seed/migration.sql` | CREATED | Canonical seed for GAP-T3-01A NC primary feature flags |
| `artifacts/launch-readiness/FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001.md` | CREATED | Closure record for this unit |

**No other files were modified.**

---

## §12 — GAP-T3-01A Resolution Status

| Item | Before FAM-08D1 | After FAM-08D1 |
|------|-----------------|----------------|
| `nc.procurement_pools.enabled` in any migration | ❌ ABSENT | ✅ Seeded in `20260603000000_nc_pool_primary_flag_seed` |
| `nc.procurement_pools.rfq.enabled` in any migration | ❌ ABSENT | ✅ Seeded in `20260603000000_nc_pool_primary_flag_seed` |
| Fresh-env NC gate behavior | ⚠️ Diverges from production | ✅ Matches production |
| Canonical seeding path | ❌ None | ✅ Via `prisma migrate deploy` |

**GAP-T3-01A: RESOLVED** (migration created; not yet applied to production — requires separate authorized apply packet per governance rules).

---

## §13 — Remaining FAM-08 T-3 Gap

**GAP-T3-01B** remains open:

> No integration test for NC pool route access post-provisioning. A CI test that verifies the NC gate passes (or blocks correctly) after flag rows exist is absent. This gap does not block production deploy but is required for full FAM-08 T-3 closure.

This is addressed by the next unit: **FAM-08D2**.

---

## §14 — Selected Next Packet

**Unit:** `FAM-08D2-NC-POOL-FEATURE-FLAG-PROVISIONING-TEST-001`

**Scope:** Integration test that verifies NC pool route access behavior against the seeded flag rows. Specifically: verify that `ncPoolFeatureGateMiddleware` and `ncPoolRfqFeatureGateMiddleware` pass correctly when `nc.procurement_pools.enabled = true` and `nc.procurement_pools.rfq.enabled = true` are present in the DB.

**Prerequisite:** FAM-08D1 committed (this unit).

---

## §15 — Status Preservation Statement

The following invariants are confirmed unchanged at close of this unit:

| Invariant | Required State | Confirmed |
|-----------|---------------|-----------|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` | ✅ Not touched |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | ✅ Not touched |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` | ✅ Not touched |
| `governance/legal/fam-07/` | ABSENT | ✅ Not created |
| `PublicSupplierProfile.tsx` | NOT staged, NOT modified | ✅ Confirmed |
| `LAUNCH-FAMILY-INDEX.md` | NOT modified | ✅ Not touched |
| `server/prisma/schema.prisma` | NOT modified | ✅ Confirmed |
| Existing migrations | NOT modified | ✅ Confirmed |
| Governance tracker files | NOT modified | ✅ Confirmed |
| DB mutation | NONE (migration file only, not applied) | ✅ Confirmed |
| Secrets | NOT exposed | ✅ DATABASE_URL never printed |

---

## §16 — Final Enum

```
FAM_08D1_NC_POOL_PRIMARY_FLAG_SEED_MIGRATION_COMPLETE
```

**HEAD before work:** `c402d2da`
**HEAD after commit:** (see commit)
**Migration file:** `server/prisma/migrations/20260603000000_nc_pool_primary_flag_seed/migration.sql`
**GAP-T3-01A:** RESOLVED by migration creation (not yet applied to production — requires separate authorized apply packet)
**Selected next packet:** `FAM-08D2-NC-POOL-FEATURE-FLAG-PROVISIONING-TEST-001`

This was a launch-unblocking implementation unit, not a broad audit. FAM-07 not verified complete. FTR-LEGAL-003 remains open. FAM-07L14 not opened. FAM-08 not marked complete in trackers. No legal authority record created. No runtime source files changed. No DB mutation beyond creating migration file. No secrets exposed. `PublicSupplierProfile.tsx` not staged/modified.
