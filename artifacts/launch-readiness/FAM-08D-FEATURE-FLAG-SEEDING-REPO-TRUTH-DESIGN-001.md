# FAM-08D-FEATURE-FLAG-SEEDING-REPO-TRUTH-DESIGN-001

**Unit ID:** FAM-08D-FEATURE-FLAG-SEEDING-REPO-TRUTH-DESIGN-001
**Type:** Read-only repo-truth design pass — feature flag provisioning gap assessment
**Parent family:** FAM-08 Tenant Core Workspace
**Checklist item:** T-3 — Feature flags provision correctly for new tenants (P1)
**Status:** DESIGN_COMPLETE
**Date:** 2026-07-02
**HEAD at closure:** `87ca88d8` — `test(fam-08): align gate d7 with superadmin context — 7/7 pass`
**Authorized by:** FAM-08 opening audit (Packet D selected per §19–§20 of that document)
**Safe-Write Mode:** ALWAYS ON

---

## §1 — Unit Summary

This unit performs a complete read-only repo-truth inspection of the feature flag provisioning
architecture in TexQtic, targeting MVP checklist item T-3 ("Feature flags provision correctly
for new tenants", P1, PARTIALLY_IMPLEMENTED).

The inspection covers:
- `FeatureFlag` and `TenantFeatureOverride` schema models
- All 6 feature gate middleware files (NC pools + TTP)
- Feature key inventory across: migrations, seed.ts, and production DB operations
- `provisionTenant` service and `tenantProvision.ts` route
- Runtime descriptor capability classification
- Test coverage for feature gate middleware and provisioning paths
- Governance records: MVP checklist, NEXT-ACTION.md, NC provisioning packet

**Primary finding:** Two of the six keys consumed by active NC pool middleware —
`nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` — are absent from
all Prisma migrations and from `seed.ts`. They exist in production only because integration
test runs implicitly seeded them, later confirmed by an ad-hoc production SQL provisioning
operation (TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001). Any fresh environment — dev, staging,
new production deployment — will be missing these two flags, causing all NC pool and RFQ routes
to return 503 FEATURE_DISABLED at Layer 1.

**T-3 verdict:** `IMPLEMENTATION_GAP` — requires a migration to canonically seed
`nc.procurement_pools.enabled = true` and `nc.procurement_pools.rfq.enabled = true`.

No source code, schema, migration, test, or governance tracker files were modified during
this unit. This is a read-only design document.

---

## §2 — Preflight Evidence

**Command:** `git status --short; git rev-parse --short HEAD; git merge-base --is-ancestor 87ca88d8 HEAD; echo $?`

**Output (from FAM-08D session start):**
```
(no output — working tree clean)
87ca88d8
0
```

**Interpretation:**
- Working tree: clean — no modified, staged, or untracked files
- HEAD: `87ca88d8` — FAM-08C1 remediation commit (Gate D.7, 7/7 PASS)
- Ancestor check: 0 (true) — HEAD is `87ca88d8` itself; all prior units are ancestors

**FAM-08D write gate:** PASS — no uncommitted changes; no drift from prior unit close state.

---

## §3 — FAM-07 Legal Hold Confirmation

**Status:** `PARTIALLY_IMPLEMENTED` — `HOLD_FOR_HUMAN_LEGAL_INPUTS` — UNCHANGED

Checked via:
1. `governance/control/NEXT-ACTION.md` — FAM-07 status confirmed PARTIALLY_IMPLEMENTED;
   legal hold confirmed HOLD_FOR_HUMAN_LEGAL_INPUTS unchanged
2. `FTR-LEGAL-003` — confirmed `MVP_CRITICAL / OPEN` — unchanged
3. `governance/legal/fam-07/` — ABSENT (no legal work directory present)
4. `PublicSupplierProfile.tsx` — NOT STAGED, NOT MODIFIED (confirmed by clean tree preflight)
5. `LAUNCH-FAMILY-INDEX.md` — NOT MODIFIED (confirmed by clean tree preflight)

**This unit does not touch FAM-07 perimeter in any way.**
**Legal hold status: UNCHANGED.**

---

## §4 — FAM-08 Current Posture

At the start of this unit, the FAM-08 family is in the following state:

| Unit | Status | Commit |
|---|---|---|
| FAM-08 Opening Repo-Truth Audit | CLOSED | `artifacts/launch-readiness/FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001.md` |
| FAM-08 Runtime Verification | CLOSED | `artifacts/launch-readiness/FAM-08-TENANT-CORE-WORKSPACE-RUNTIME-VERIFICATION-001.md` |
| FAM-08A Catalog RLS Remediation | CLOSED | `088bbac4` |
| FAM-08B hasDb Suite Verification | CLOSED | `93280558` |
| FAM-08C Gate D.7 Investigation | CLOSED | `189f6343` |
| FAM-08C1 Gate D.7 Remediation | CLOSED | `87ca88d8` (current HEAD) |
| **FAM-08D Feature Flag Seeding Design** | **THIS UNIT — DESIGN_COMPLETE** | pending commit |

**T-3 checklist item status entering this unit:** `PARTIALLY_IMPLEMENTED` (from opening audit)
**This unit's goal:** Advance T-3 to `IMPLEMENTATION_GAP_CLASSIFIED` with candidate packets

---

## §5 — Feature Flag Schema Findings

### 5.1 `FeatureFlag` model

Defined in `server/prisma/schema.prisma`, lines 270–279:

```prisma
model FeatureFlag {
  key             String                  @id @db.VarChar(100)
  enabled         Boolean                 @default(false)
  description     String?
  createdAt       DateTime                @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime                @updatedAt @map("updated_at") @db.Timestamptz(6)
  value           String?
  tenantOverrides TenantFeatureOverride[]
  @@map("feature_flags")
}
```

- Primary key: `key` (VarChar(100)) — a well-known string constant, not a UUID
- `enabled` defaults to `false` — fail-closed by default (no row = no access)
- `value` field (nullable String) — holds numeric configuration (e.g., TTP AI budget caps)
- `tenantOverrides` — one-to-many relation to `TenantFeatureOverride`
- Table name: `feature_flags`

### 5.2 `TenantFeatureOverride` model

Defined in `server/prisma/schema.prisma`, lines 282–295:

```prisma
model TenantFeatureOverride {
  id          String      @id @default(uuid()) @db.Uuid
  tenantId    String      @map("tenant_id") @db.Uuid
  key         String      @db.VarChar(100)
  enabled     Boolean
  createdAt   DateTime    @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime    @updatedAt @map("updated_at") @db.Timestamptz(6)
  featureFlag FeatureFlag @relation(fields: [key], references: [key], onDelete: Cascade)
  tenant      Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  @@unique([tenantId, key])
  @@index([tenantId])
  @@index([key])
  @@map("tenant_feature_overrides")
}
```

- `id` is a UUID PK (not composite) — differs from the simpler version documented in opening audit
- `@@unique([tenantId, key])` — one override row per tenant per flag key
- `featureFlag` FK with `onDelete: Cascade` — deleting a global flag cascades to overrides
- `tenant` FK with `onDelete: Cascade` — deleting a tenant cascades to their overrides
- `Tenant` model has `featureOverrides TenantFeatureOverride[]` backrelation (line 42)

---

## §6 — Feature Gate Middleware Findings

### 6.1 Files inspected

All 6 middleware files inspected from `server/src/middleware/`:

| File | Key Constant | Flag Key | Layer 2 no-override behavior |
|---|---|---|---|
| `ncPoolFeatureGate.middleware.ts` | `NC_POOL_FEATURE_FLAG_KEY` | `nc.procurement_pools.enabled` | ALLOW (fail-open) |
| `ncPoolRfqFeatureGate.middleware.ts` | `NC_POOL_RFQ_FEATURE_FLAG_KEY` | `nc.procurement_pools.rfq.enabled` | ALLOW (fail-open) |
| `ncPoolRfqAwardFeatureGate.middleware.ts` | `NC_POOL_RFQ_AWARD_FEATURE_FLAG_KEY` | `nc.procurement_pools.rfq.award.enabled` | ALLOW (fail-open) |
| `ncPoolSupplierInviteFeatureGate.middleware.ts` | `NC_POOL_SUPPLIER_INVITE_FEATURE_FLAG_KEY` | `nc.procurement_pools.supplier_invites.enabled` | ALLOW (fail-open) |
| `ncPoolSupplierQuoteFeatureGate.middleware.ts` | `NC_POOL_SUPPLIER_QUOTE_FEATURE_FLAG_KEY` | `nc.procurement_pools.supplier_quotes.enabled` | ALLOW (fail-open) |
| `ttpFeatureGate.middleware.ts` | `TTP_FEATURE_FLAG.TTP_ENABLED` | `ttp_enabled` | BLOCK (fail-closed) |

### 6.2 Two-layer gate pattern

All 6 middleware files implement the same structural pattern:

```
Layer 1: SELECT FROM feature_flags WHERE key = '<flag_key>'
  → Row absent OR enabled = false → 503 FEATURE_DISABLED (fail-closed)
  → Row present AND enabled = true → proceed to Layer 2

Layer 2: if resolvedOrgId present → SELECT FROM tenant_feature_overrides
  WHERE tenant_id = resolvedOrgId AND key = '<flag_key>'
  NC gates: no override row → ALLOW; override enabled=false → 503
  TTP gate: no override row → BLOCK (503); override enabled=true → ALLOW
```

### 6.3 Critical semantic difference: NC vs TTP Layer 2

The NC gates are **fail-open at Layer 2**: absence of a per-tenant override row means the global
flag governs access. NC features are ON by default for tenants once the global flag is enabled.

The TTP gate is **fail-closed at Layer 2**: absence of a per-tenant override means the tenant
does NOT get TTP access, even if the global flag is true. TTP activation requires an explicit
per-tenant `TenantFeatureOverride` row with `enabled = true`.

This is an intentional architectural difference. TTP is a credit/trust product that must be
explicitly provisioned per tenant. NC pool features are available to all tenants once globally
enabled.

---

## §7 — Feature Key Inventory

Complete inventory of all feature flag keys referenced in the codebase, with their seeding source:

| # | Key | Seeded in seed.ts | Seeded in migration | Migration name | Seeded value | Flag type |
|---|---|---|---|---|---|---|
| 1 | `KILL_SWITCH_ALL` | ✅ | — | — | `false` | Operational |
| 2 | `AI_INSIGHTS_ENABLED` | ✅ | — | — | `true` | Operational |
| 3 | `ADVANCED_ANALYTICS` | ✅ | — | — | `true` | Operational |
| 4 | `MULTI_CURRENCY` | ✅ | — | — | `false` | Operational |
| 5 | `OP_PLATFORM_READ_ONLY` | ✅ | — | — | `false` | Operational |
| 6 | `OP_AI_AUTOMATION_ENABLED` | ✅ | — | — | `false` | Operational |
| 7 | `ttp_enabled` | ❌ | ✅ | `20260515120000_ttp_foundation_001` | `false` | TTP kill-switch |
| 8 | `nc.procurement_pools.supplier_invites.enabled` | ❌ | ✅ | `20260530000000_nc_pool_supplier_invite_feature_flag_seed` | `false` | NC sub-feature |
| 9 | `nc.procurement_pools.supplier_quotes.enabled` | ❌ | ✅ | `20260532000000_nc_pool_supplier_quote_feature_flag_seed` | `false` | NC sub-feature (QD-6) |
| 10 | `nc.procurement_pools.rfq.award.enabled` | ❌ | ✅ | `20260534000000_nc_pool_rfq_award_feature_flag_seed` | `false` | NC sub-feature (AD-7) |
| 11 | `nc.procurement_pools.settlement.enabled` | ❌ | ✅ | `20260536000000_nc_settlement_waterfall_flag_seed` | `false` | NC sub-feature (1H) |
| 12 | **`nc.procurement_pools.enabled`** | **❌** | **❌** | **ABSENT** | **N/A** | **NC primary gate** |
| 13 | **`nc.procurement_pools.rfq.enabled`** | **❌** | **❌** | **ABSENT** | **N/A** | **NC RFQ gate** |

**Items 12 and 13 are the critical gap.** They are the primary enabling flags consumed by
`ncPoolFeatureGateMiddleware` and `ncPoolRfqFeatureGateMiddleware` at Layer 1. No migration
seeds them. seed.ts does not contain them.

**Additional keys consumed by business services (not gate middleware):**
- `VECTOR_FLAG_KEY` (AI vector search) — `server/src/services/ai/ragContextBuilder.ts` line 159
- Invoice-related flag — `server/src/services/invoice.service.ts` line 243
- Settlement split flag — `server/src/services/networkSettlementSplit.service.ts` line 377

---

## §8 — Global Feature Flag Seed Findings

### 8.1 seed.ts `seedFeatureFlags` (lines 516–574)

Function signature: `async function seedFeatureFlags(tx: PrismaTx): Promise<void>`

Upserts exactly 6 global flags using `featureFlag.upsert`:

| Key | enabled |
|-----|---------|
| `KILL_SWITCH_ALL` | `false` |
| `AI_INSIGHTS_ENABLED` | `true` |
| `ADVANCED_ANALYTICS` | `true` |
| `MULTI_CURRENCY` | `false` |
| `OP_PLATFORM_READ_ONLY` | `false` |
| `OP_AI_AUTOMATION_ENABLED` | `false` |

Called from `seedCanonicalQaBaseline(tx, passwordHash)` at line 1293.

**Gap confirmed:** `nc.procurement_pools.enabled`, `nc.procurement_pools.rfq.enabled`,
and `ttp_enabled` are all absent from `seedFeatureFlags`.

### 8.2 Migration seeding (7 flags via 5 migrations)

| Migration | Flag seeded | Value |
|---|---|---|
| `20260515120000_ttp_foundation_001` | `ttp_enabled` | `false` |
| `20260530000000_nc_pool_supplier_invite_feature_flag_seed` | `nc.procurement_pools.supplier_invites.enabled` | `false` |
| `20260532000000_nc_pool_supplier_quote_feature_flag_seed` | `nc.procurement_pools.supplier_quotes.enabled` | `false` |
| `20260534000000_nc_pool_rfq_award_feature_flag_seed` | `nc.procurement_pools.rfq.award.enabled` | `false` |
| `20260536000000_nc_settlement_waterfall_flag_seed` | `nc.procurement_pools.settlement.enabled` | `false` |

All 5 NC sub-feature flags are seeded as `false` (kill-switches) by their respective migrations.
All migrations use `ON CONFLICT (key) DO NOTHING` — idempotent.

### 8.3 Production DB state (from TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001)

`nc.procurement_pools.enabled = true` and `nc.procurement_pools.rfq.enabled = true` exist in
production DB. These rows were first seeded by integration test runs (2026-05-11/12) and later
had their descriptions updated to production-canonical values by the production SQL provisioning
operation in Packet 15.

**The existence of these rows in production is accidental** — a side-effect of integration test
runs writing to the shared production DB, not a canonical provisioning mechanism. There is no
migration or seed file that owns these rows.

---

## §9 — Tenant-Specific Override Seed Findings

### 9.1 seed.ts `seedOperationalOverrides` (lines 1211–1240)

Creates exactly one `TenantFeatureOverride`:
- `tenantId`: `qaB2b.tenantId`
- `key`: `MULTI_CURRENCY`
- `enabled`: `true`

No NC pool per-tenant overrides are seeded in this function.
No TTP per-tenant overrides are seeded in this function.

### 9.2 Production override state (from Packet 15)

Production `tenant_feature_overrides` WHERE key LIKE 'nc.procurement_pools.%' showed 4 rows:

| tenant_id | key | enabled |
|---|---|---|
| `19fafff8-...` (QA test tenant) | `nc.procurement_pools.enabled` | `true` |
| `e56edd5e-...` (QA test tenant) | `nc.procurement_pools.enabled` | `true` |
| `19fafff8-...` (QA test tenant) | `nc.procurement_pools.rfq.enabled` | `true` |
| `e56edd5e-...` (QA test tenant) | `nc.procurement_pools.rfq.enabled` | `true` |

All 4 rows are QA integration test artifacts. No production general-tenant override rows exist
for NC pool keys. This is expected and correct — NC pool gates are fail-open at Layer 2.

### 9.3 Per-tenant override provisioning mechanism

Per the migration provisioning notes (e.g., migration `20260530000000`):

> "To activate the supplier invite feature for a specific supplier org, a TenantFeatureOverride
> row must be inserted separately (outside this migration)"

The canonical mechanism is manual SQL:
```sql
INSERT INTO public.tenant_feature_overrides (tenant_id, key, enabled, updated_at)
VALUES ('<org_id>', 'nc.procurement_pools.supplier_invites.enabled', true, NOW())
ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW();
```

No control-plane API endpoint for managing per-tenant overrides was found in the codebase.
Control-plane route directory (`server/src/routes/control/`) contains no feature flag route.

---

## §10 — Provisioning / Activation Path Findings

### 10.1 `provisionTenant` service

File: `server/src/services/tenantProvision.service.ts`

**Finding: `provisionTenant` creates NO feature flags and NO tenant feature overrides.**

The function executes in a single Prisma transaction:

Phase 1 (admin context):
- Creates `tenant` row
- Upserts `organizations` row
- Creates `invite` record (APPROVED_ONBOARDING path only)

Phase 2 (tenant context — LEGACY_ADMIN path only):
- Finds or creates `user` row
- Creates `membership` row (OWNER role)

No `featureFlag` or `tenantFeatureOverride` writes in any code path.

### 10.2 Provisioning route

File: `server/src/routes/admin/tenantProvision.ts`

Calls `provisionTenant(...)` at lines 351 and 482 for the two provisioning modes
(APPROVED_ONBOARDING and LEGACY_ADMIN). No post-provision feature flag seeding calls.

### 10.3 Activation path

Files: `server/src/routes/tenant/` (activation route) — not inspected in detail as activation
logic is in `activateTenant()` / `acceptAuthenticatedInvite()`.

Per opening audit §12.5: "The activation flow (`activateTenant`, `acceptAuthenticatedInvite`)
provisions the tenant but the frontend service layer does not confirm whether feature flags are
auto-seeded for new tenants at activation."

No feature flag seeding was found in the activation services reviewed.

### 10.4 Runtime impact for new tenants

Given the architecture:

| Route group | Access for new tenant (no override rows) | Why |
|---|---|---|
| NC pool routes (`nc.procurement_pools.enabled`) | **503 FEATURE_DISABLED** in fresh env | Layer 1: global flag row absent in migrations/seed |
| NC RFQ routes (`nc.procurement_pools.rfq.enabled`) | **503 FEATURE_DISABLED** in fresh env | Layer 1: global flag row absent in migrations/seed |
| NC supplier invite routes | 503 FEATURE_DISABLED | Layer 1: global flag seeded as `false` (OD-6) |
| NC supplier quote routes | 503 FEATURE_DISABLED | Layer 1: global flag seeded as `false` (QD-6) |
| NC award routes | 503 FEATURE_DISABLED | Layer 1: global flag seeded as `false` (AD-7) |
| TTP routes | 503 FEATURE_DISABLED | Layer 2: no override row → fail-closed (by design) |

In **production** (current state): `nc.procurement_pools.enabled = true` and
`nc.procurement_pools.rfq.enabled = true` exist. New tenants can access NC pool and RFQ routes
without per-tenant overrides (fail-open at Layer 2). Production is not broken.

In **fresh environments** (dev, staging, new production region): these two rows are absent.
NC pool and RFQ routes would 503 for all tenants until manually provisioned.

---

## §11 — Existing Production Flag Provisioning History

**TEXQTIC-NC-PROD-FEATURE-FLAG-PROVISIONING-001** (Packet 15, 2026-06-02):
- Status: `VERIFIED_COMPLETE`
- Found that `nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` were already
  `true` in production (seeded by prior integration test runs, not by a migration)
- Ran `ON CONFLICT DO UPDATE` to replace test-label descriptions with production-canonical values
- Confirmed `nc.procurement_pools.supplier_invites.enabled = true` (unchanged)
- Confirmed `nc.procurement_pools.supplier_quotes.enabled = false` (QD-6 hold — unchanged)
- No source code changes; governance documentation only

**This packet did NOT close the T-3 gap.** It confirmed production DB state and documented
the existing flag values. It did not establish a canonical reproducible seeding path.

The root gap remains: no migration or seed file canonically seeds `nc.procurement_pools.enabled`
and `nc.procurement_pools.rfq.enabled`. The production state is drift-from-test-runs.

---

## §12 — Runtime Descriptor / Shell Capability Findings

File: `runtime/sessionRuntimeDescriptor.ts`

### 12.1 Route group key

`RouteGroupKey` type includes `'network_commerce_pools'` — the route group for NC pool features.

Route group classification type: `RouteGroupClassification = 'family-core' | 'feature-gated' | 'platform-gated' | 'overlay-only'`

NC pool routes are classified as `feature-gated` in the runtime manifest (per opening audit §12.4).

### 12.2 No direct flag key reference

The `sessionRuntimeDescriptor.ts` does **not** reference `nc.procurement_pools.enabled` or
any feature flag key string directly. Capability resolution (whether a route group is visible
in shell navigation) is determined by the session identity fields — `aggregatorCapability`,
`whiteLabelCapability`, `commercial_plan` — NOT by feature flag DB queries.

The feature gate middleware operates at the **API layer** (Fastify prehandler), not at the
**runtime descriptor layer** (frontend shell navigation). These are two independent enforcement
layers:
1. Frontend shell navigation: controls route group visibility based on tenant identity fields
2. Backend API middleware: controls data access for each request based on feature flag DB state

There is no mechanism in the runtime descriptor that reads `feature_flags` directly.
Shell navigation visibility and API access operate independently.

---

## §13 — Test Coverage Findings

### 13.1 Feature gate middleware unit tests

All 6 middleware files have corresponding unit test files that mock the Prisma client:

| Test file | TC count | Covers |
|---|---|---|
| `ncPoolFeatureGate.middleware.unit.test.ts` | 11 | Layer 1 + Layer 2 full coverage; TC-006 key correctness |
| `ncPoolRfqFeatureGate.middleware.unit.test.ts` | (pattern match) | Layer 1 + Layer 2 |
| `ncPoolSupplierInviteFeatureGate.middleware.unit.test.ts` | (pattern match) | Layer 1 + Layer 2 |
| `ncPoolSupplierQuoteFeatureGate.middleware.unit.test.ts` | (pattern match) | Layer 1 + Layer 2 |
| `ttp-feature-gate.middleware.unit.test.ts` | 18 | Layer 1 + Layer 2; TTP fail-closed; cross-tenant isolation |

All unit tests mock `prisma.featureFlag.findUnique` and `prisma.tenantFeatureOverride.findUnique`.
Tests are not affected by the seeding gap (they don't hit the real DB).

### 13.2 No integration test for feature flag seeding at provisioning time

Neither `tenant-provision-approved-onboarding.integration.test.ts` nor
`tenant-activate.integration.test.ts` contain any assertions or references to:
- `featureFlag`
- `TenantFeatureOverride`
- `nc.procurement_pools`
- `ttp_enabled`

The provisioning integration tests do not verify that feature flags are correctly seeded
(or absent) after tenant creation. This is consistent with the finding that `provisionTenant`
does not write feature flags — there is nothing to test there.

### 13.3 Coverage gap

**No test validates the end-to-end assertion:**
"After a new tenant is provisioned and activated, NC pool routes return HTTP 200 (not 503)"

This test would require:
1. A real DB integration test
2. Provisioning a test tenant
3. Making authenticated requests to NC pool routes
4. Asserting the response is not 503 FEATURE_DISABLED

No such test exists. This is the test coverage gap for T-3.

---

## §14 — T-3 Gap Classification

**T-3: Feature flags provision correctly for new tenants**
**Classification entering this unit:** `PARTIALLY_IMPLEMENTED` (from opening audit)
**Classification after this unit:** `IMPLEMENTATION_GAP_CLASSIFIED`

### 14.1 Gap identity

**GAP-T3-01** (from opening audit): "New-tenant default feature flag seeding path at activation not confirmed"

**This unit reclassifies GAP-T3-01 as two distinct sub-gaps:**

| Gap | Description | Severity | Nature |
|---|---|---|---|
| GAP-T3-01A | `nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` absent from all migrations and seed.ts — no canonical seeding path | P1 | Implementation gap |
| GAP-T3-01B | No integration test verifying that NC pool routes return 200 for a newly provisioned tenant | P1 | Test coverage gap |

### 14.2 What is NOT a gap (design by intent)

| Item | Status | Rationale |
|---|---|---|
| TTP fail-closed for new tenants | BY DESIGN | TTP activation requires explicit per-tenant provisioning (AD-TTP) |
| NC sub-flags seeded `false` (`supplier_invites`, `supplier_quotes`, `award`, `settlement`) | BY DESIGN | Kill-switches; per-tenant activation is a separate authorized operation |
| No per-tenant NC pool override at provisioning time | BY DESIGN | NC pool gates are fail-open at Layer 2; global flag is sufficient |
| No feature flag writes in `provisionTenant` | BY DESIGN | Feature flags are a separate concern from tenant identity provisioning |

### 14.3 Root cause of GAP-T3-01A

`nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` were introduced as
part of the NC Phase 1 work (Packet 10 or earlier). Integration tests seeding the DB created
these rows in the shared production DB as a side-effect, not as a canonical provisioning path.

All other NC sub-feature flags were properly seeded via dedicated migrations with idempotency
guards. The two primary enabling flags (`nc.procurement_pools.enabled` and
`nc.procurement_pools.rfq.enabled`) were missed — they have no migration.

### 14.4 Production risk assessment

**Production risk: LOW (current)** — Both flags exist in production DB with `enabled = true`.
Runtime behavior is correct for current production deployment.

**New-environment risk: HIGH** — Any fresh deployment (dev, staging, new region, DR) will
encounter 503 on all NC pool and RFQ routes until these flags are manually provisioned.

**Dev/CI risk: MEDIUM** — Integration tests that call actual NC pool routes against a real
(non-mocked) DB will fail with 503 unless the test setup seeds these flags. Unit tests that
mock Prisma are unaffected.

---

## §15 — Candidate Remediation Packets

### Packet A: Feature Flag Seed Migration

**Title:** `FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001`
**Scope:** Create a new Prisma migration that seeds `nc.procurement_pools.enabled = true`
and `nc.procurement_pools.rfq.enabled = true` using `ON CONFLICT (key) DO UPDATE` semantics.

**Files to modify:**
```
CREATE: server/prisma/migrations/<timestamp>_nc_pool_primary_flag_seed/migration.sql
MODIFY: server/prisma/schema.prisma (if prisma db pull required post-apply)
```

**Pros:**
- Consistent with the pattern established by 4 other NC sub-feature migrations
- Idempotent; safe for both fresh environments and existing production (ON CONFLICT)
- Canonical — migration history is the authoritative record of DB state
- One-time operation; no ongoing maintenance

**Cons:**
- Requires running `pnpm -C server exec prisma db pull` and `generate` after apply
- Must be applied to production DB (Supabase) explicitly
- Migration sequence number must not collide with existing migrations

**Risk:** LOW. Pure INSERT with ON CONFLICT DO UPDATE. No schema changes. No DDL.

---

### Packet B: seed.ts Alignment

**Title:** `FAM-08D1-SEED-TS-FEATURE-FLAG-ALIGNMENT-001`
**Scope:** Add `nc.procurement_pools.enabled = true` and `nc.procurement_pools.rfq.enabled = true`
to `seedFeatureFlags` in `server/prisma/seed.ts`.

**Files to modify:**
```
MODIFY: server/prisma/seed.ts
```

**Pros:**
- Simple change; seed.ts is already a write target
- Dev/test environments running `prisma db seed` would get correct flags

**Cons:**
- Does NOT fix fresh production environments (migrations seed the DB; seed.ts is only
  run explicitly in dev/QA environments, not on production deployments)
- Inconsistent with the established pattern: NC flags belong in migrations, not seed.ts
- seed.ts already has the 6 operational flags; mixing NC routing flags creates confusion
- Does not address the canonical migration gap

**Risk:** LOW for the change itself, but INCOMPLETE as a standalone gap resolution.

---

### Packet C: Migration + seed.ts Combined

**Title:** `FAM-08D1-NC-POOL-PRIMARY-FLAG-CANONICAL-SEED-001`
**Scope:** Packet A + Packet B combined. Migration for production/staging; seed.ts update
for dev consistency.

**Pros:** Complete coverage of all environments
**Cons:** Two files to change; seed.ts and migration must stay synchronized
**Risk:** LOW. Recommended if both dev and production consistency are required.

---

### Packet D: Integration Test Coverage

**Title:** `FAM-08D2-NC-POOL-FEATURE-FLAG-PROVISIONING-TEST-001`
**Scope:** Add an integration test that:
1. Provisions a test tenant (or uses an existing QA tenant)
2. Verifies NC pool route returns HTTP 200 (or correct empty state), not 503
3. Documents the test as coverage for GAP-T3-01B

**Files to modify:**
```
MODIFY: server/src/__tests__/network-pool.service.integration.test.ts
  OR CREATE: server/src/__tests__/nc-pool-feature-gate-integration.test.ts
```

**Dependency:** Packet D requires either Packet A or Packet C to be completed first
(otherwise the integration test would 503 in any fresh environment).

---

### Packet E: Documented Decision — Accept Production-Only State

**Title:** `FAM-08D1-NC-POOL-FLAG-DOCUMENTED-DECISION-001`
**Scope:** Document that `nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled`
are production-only operational decisions — no migration is needed because they represent
a deliberate platform-operator choice, not a code-level default.

**Pros:** No code change; no migration risk
**Cons:** Does not resolve the dev/staging gap; future environments remain broken until
manually provisioned; inconsistent with how all other NC flags are handled (migrations)

**Recommendation:** NOT SELECTED. The established pattern in this codebase is to seed
flags via migrations. A documented decision would diverge from that pattern without benefit.

---

## §16 — Selected Next Packet

**Selected: Packet A — `FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001`**

**Rationale:**
1. Consistent with established codebase pattern: all other NC sub-feature flags are seeded
   by dedicated migrations with pre-flight guards and post-flight verification
2. Migration is the canonical authority for DB state — it applies on all environment types
   (dev via `prisma migrate dev`, production via `prisma migrate deploy`)
3. The migration uses `ON CONFLICT (key) DO UPDATE` — safe for production where the rows
   already exist (will update description only; does not change `enabled = true`)
4. No `DIRECT_DATABASE_URL`, shadow DB, or special Prisma flags required
5. Packet B (seed.ts) can be added as a follow-up, but is not required to close GAP-T3-01A
6. Packet D (integration test) is the natural follow-on after Packet A

**Packet A alone closes GAP-T3-01A (implementation gap).**
**Packet D closes GAP-T3-01B (test coverage gap) in a subsequent unit.**

---

## §17 — Proposed Next Unit Title

`FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001`

---

## §18 — Proposed Next Unit Scope

**Objective:** Create a Prisma migration that canonically seeds
`nc.procurement_pools.enabled = true` and `nc.procurement_pools.rfq.enabled = true`
as authoritative platform defaults.

**Required deliverables:**
1. SQL migration file with:
   - Pre-flight guard: verify `feature_flags` table exists
   - `INSERT INTO public.feature_flags ... ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled, description = EXCLUDED.description, updated_at = NOW()`
   - Post-flight verification: SELECT and assert both rows exist with `enabled = true`
2. Run `pnpm -C server exec prisma db pull` (after manual SQL apply to production)
3. Run `pnpm -C server exec prisma generate`
4. Verify `GET /health` returns 200
5. Governance artifact: `artifacts/launch-readiness/FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001.md`

**Not in scope for FAM-08D1:**
- seed.ts update (Packet B — optional follow-up)
- Integration test for NC pool provisioning (Packet D — separate unit)
- Changes to T-3, T-4, T-5 items beyond T-3 GAP-T3-01A
- Any TTP provisioning changes (TTP fail-closed at Layer 2 is by design)

---

## §19 — Proposed Next Unit Allowed Write Files

```
CREATE:
  server/prisma/migrations/<timestamp>_nc_pool_primary_flag_seed/migration.sql
  artifacts/launch-readiness/FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001.md

MODIFY (only if prisma db pull generates changes):
  server/prisma/schema.prisma

READ-ONLY (inspection only):
  All other files
```

---

## §20 — Proposed Next Unit Forbidden Actions

```
FORBIDDEN:
  Modifying seed.ts (not in FAM-08D1 scope; Packet B is a separate optional unit)
  Adding integration tests (Packet D is a separate unit)
  Modifying any source code, routes, services, middleware
  Modifying any existing migrations
  Running prisma migrate dev
  Running prisma db push
  Modifying .env or server/.env
  Advancing FAM-07 status
  Modifying LAUNCH-FAMILY-INDEX.md
  Modifying any governance tracker files (NEXT-ACTION.md, OPEN-SET.md, BLOCKED.md)
  Enabling ttp_enabled (kill-switch — hold until authorized)
  Enabling any NC sub-feature flags (supplier_invites, supplier_quotes, award, settlement)
  Printing DATABASE_URL or any connection string
```

---

## §21 — Adjacent Findings

### AF-1: `seed.ts` `seedFeatureFlags` diverges from production state

`seed.ts` contains 6 operational flags. Production DB has 13+ flags (via migrations + Packet 15).
A developer running `pnpm -C server exec prisma db seed` from a fresh environment gets only
the 6 seed.ts flags — not `ttp_enabled`, not any NC flags.

This is a dev-experience issue, not a production issue. The established pattern in TexQtic is
that migrations own the NC and TTP flag seeds. seed.ts owns operational flags. This is an
inconsistency worth documenting, but is not a launch blocker.

**Recommendation:** After FAM-08D1 closes, consider a FAM-08D2 unit to align seed.ts with
migration-seeded flags for dev environment consistency.

### AF-2: No control-plane API for per-tenant feature override management

No route in `server/src/routes/control/` manages `tenant_feature_overrides`. Activating
per-tenant NC sub-features (supplier_invites, supplier_quotes) or TTP access requires
manual SQL operations. For the Surat pilot this is acceptable (small tenant count, operator
manages via psql), but will not scale to self-serve onboarding.

**Scope:** OUT OF SCOPE for FAM-08D1. Recorded as adjacent finding only.

### AF-3: QA tenant override rows in production DB

Two QA tenant IDs (`19fafff8-...`, `e56edd5e-...`) have `TenantFeatureOverride` rows in the
production DB for NC pool keys. These were created by integration test runs against the
production Supabase DB and represent test artifact residue.

**Risk:** LOW — these rows don't affect production behavior (the global flag + fail-open
Layer 2 means all tenants can access NC pools; these overrides are redundant). But test
artifact rows in production DB are a data hygiene concern.

**Scope:** OUT OF SCOPE for FAM-08D. Recorded as adjacent finding.

---

## §22 — Status Preservation Statement

The following invariants were verified intact at close of this unit:

| Invariant | Required state | Confirmed |
|---|---|---|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` | ✅ Unchanged |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | ✅ Unchanged |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` | ✅ Unchanged |
| `governance/legal/fam-07/` | ABSENT | ✅ Not created |
| `PublicSupplierProfile.tsx` | NOT STAGED, NOT MODIFIED | ✅ Confirmed |
| `LAUNCH-FAMILY-INDEX.md` | NOT MODIFIED | ✅ Confirmed |
| `NEXT-ACTION.md` | NOT MODIFIED | ✅ Confirmed |
| Source files | NOT MODIFIED | ✅ Read-only unit |
| Prisma schema | NOT MODIFIED | ✅ Read-only unit |
| Migrations | NOT MODIFIED | ✅ Read-only unit |
| Test files | NOT MODIFIED | ✅ Read-only unit |
| No DB mutations | CONFIRMED | ✅ No write operations |
| No secrets exposed | DATABASE_URL never printed | ✅ Confirmed |

**No governance tracker files modified.**
**No source mutations of any kind.**
**Working tree state at unit close: CLEAN (same as entry state).**

---

## §23 — Final Enum

```
FAM_08D_FEATURE_FLAG_SEEDING_DESIGN_COMPLETE
```

**T-3 reclassified:** `PARTIALLY_IMPLEMENTED` → `IMPLEMENTATION_GAP_CLASSIFIED`

**Gap record:**
- `GAP-T3-01A`: `nc.procurement_pools.enabled` and `nc.procurement_pools.rfq.enabled` absent
  from all migrations and seed.ts — canonical seeding path missing
- `GAP-T3-01B`: No integration test for NC pool route access post-provisioning

**Next unit:** `FAM-08D1-NC-POOL-PRIMARY-FLAG-SEED-MIGRATION-001`
**Selected packet:** Packet A (migration only)
**Packet A risk level:** LOW
**Authorization required:** Paresh explicit approval before any migration is created or applied

---

*Read-only repo-truth design pass. No source, schema, migration, test, or governance tracker
files modified. Artifact written to `artifacts/launch-readiness/` (git-ignored directory).*
*Commit: `git add -f` required.*
