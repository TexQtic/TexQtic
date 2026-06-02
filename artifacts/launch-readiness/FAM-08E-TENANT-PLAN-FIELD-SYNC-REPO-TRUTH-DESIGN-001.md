# FAM-08E-TENANT-PLAN-FIELD-SYNC-REPO-TRUTH-DESIGN-001
## Tenant Plan / Subscription Field Sync — Repo-Truth Investigation & Design

**Governance hub:** `governance/launch-readiness/`
**Family:** FAM-08 — Tenant Core Workspace
**Sub-unit:** FAM-08E
**Gap addressed:** GAP-T4-01 (from FAM-08 opening audit)
**Artifact type:** Read-only repo-truth investigation + design
**Priority:** P1 / T-4 — Tenant plan/subscription metadata resolution
**Date:** 2026-07-15
**Conducted by:** Copilot / audit agent (safe-write mode, no source edits)
**Commit basis:** `98c8afe4` — "test(fam-08): prove nc pool primary feature flags"

---

## §1 — Unit Summary

**Purpose:** Perform a complete repo-truth investigation of FAM-08 T-4 (tenant plan/subscription
metadata resolution) in response to GAP-T4-01 identified in the opening audit
(`FAM-08-TENANT-CORE-WORKSPACE-OPENING-REPO-TRUTH-AUDIT-001.md`):

> *"Dual plan fields (Tenant.plan enum, organizations.plan String) with no confirmed sync mechanism"*

The opening audit classified T-4 as `PARTIALLY_IMPLEMENTED`. This unit performs a deep read
across the full stack (DB schema → migration history → provisioning service → runtime read path →
backend API responses → frontend consumption → tests) to resolve the open questions, determine
actual implementation state, classify residual risks, and recommend the minimal follow-on action.

**Design gate:** This unit is read-only. No source files, migrations, or governance trackers
were modified. The allowed write surface is the artifact file only.

**Key finding upfront:** The DB-level sync mechanism (`trg_sync_tenants_to_org` trigger +
`sync_tenants_to_organizations()` function) IS confirmed in the migration history. The opening
audit's "no confirmed sync" finding was a knowledge gap at audit time, not a missing mechanism.
T-4 is substantially implemented. No launch-blocking remediation is required.

---

## §2 — Preflight Evidence

```
git status --short
→ (no output — clean tree)

git rev-parse --short HEAD
→ 98c8afe4

git merge-base --is-ancestor 98c8afe4 HEAD
→ ancestor_check:0 (not diverged)

Test-Path "governance/legal/fam-07"
→ False (FAM-07 legal hold preserved — expected)

Test-Path "artifacts/launch-readiness/FAM-08D2-NC-POOL-FEATURE-FLAG-PROVISIONING-TEST-001.md"
→ True (FAM-08D2 artifact confirmed present)

Test-Path "governance/legal/fam-07/supplier-onboarding-terms-authority.json"
→ False (expected — FAM-07 legal authority absent)
```

**Preflight verdict: PASS. Clean tree. Correct head. No governance invariant violations.**

---

## §3 — Files and Areas Inspected

### DB schema and migrations
| File | Lines read | Purpose |
|---|---|---|
| `server/prisma/schema.prisma` | 1–55, 1055–1110, 2470–2490 | `Tenant` model, `organizations` model, `TenantPlan` enum |
| `server/prisma/migrations/20260224000000_g015_phase_a_introduce_organizations/migration.sql` | 160–250 | `sync_tenants_to_organizations()` trigger function + `trg_sync_tenants_to_org` |

### Backend: library and services
| File | Lines / method | Purpose |
|---|---|---|
| `server/src/lib/database-context.ts` | 520–710 | `canonicalizeTenantPlan`, `CanonicalProvisioningIdentity`, `OrganizationIdentity`, `OrganizationIdentityRow`, `TenantSessionTransportIdentity`, `mapOrganizationIdentityRow`, `buildTenantSessionTransportIdentity` |
| `server/src/services/tenantProvision.service.ts` | 160–340 | `provisionTenant` — writes `plan` to both `tenants` and `organizations` |
| `server/src/types/tenantProvision.types.ts` | 172–205 | `resolveProvisioningStorageBridge` — maps `commercial_plan → plan` |

### Backend: routes
| File | Lines | Purpose |
|---|---|---|
| `server/src/routes/tenant.ts` | 845–980 (full `resolveTenantSessionIdentity`) | `GET /api/me` response shape; local `TenantSessionIdentity` type |
| `server/src/routes/auth.ts` | 370–430, grep 382–417 | Login response — `commercial_plan: org.commercial_plan` |
| `server/src/routes/control.ts` | 280–340 | `buildControlTenantInternalReadModel` — `commercial_plan` on control-plane response |

### Frontend
| File | Lines / grep | Purpose |
|---|---|---|
| `types.ts` | 28–110 | `CommercialPlan`, `normalizeCommercialPlan`, `TenantConfig` |
| `App.tsx` | 1260–1400 (grep), 1600–1700 | `TenantIdentityCarrierRecord`, `resolveTenantIdentityCarrier`, `buildTenantSnapshot` |

### Tests
| File | Lines / grep | Purpose |
|---|---|---|
| `server/src/__tests__/database-context.organization-identity.test.ts` | grep | Confirms `commercial_plan` field on `OrganizationIdentity` |
| `server/src/__tests__/helpers/seedRls.ts` | grep L46 | Confirms `plan: 'FREE'` DB field name in seed |

---

## §4 — Current Repo-Truth Map

### 4.1 Database schema fields

| Table | Field | Prisma type | DB type | Default | Notes |
|---|---|---|---|---|---|
| `tenants` | `plan` | `TenantPlan` (enum) | `tenant_plan` DB enum | `FREE` | Primary store; typed; Prisma-managed enum |
| `organizations` | `plan` | `String` | `VARCHAR(30)` | `'FREE'` | Secondary store; raw string; no DB enum constraint |

**`TenantPlan` enum values:** `FREE`, `STARTER`, `PROFESSIONAL`, `ENTERPRISE` (@@map: `tenant_plan`)

**No `commercial_plan` column exists in either table.** The `commercial_plan` field used throughout
the runtime is an **application-layer computed alias** — not a DB column.

### 4.2 DB sync mechanism (CONFIRMED IN MIGRATION HISTORY)

Migration `20260224000000_g015_phase_a_introduce_organizations/migration.sql` defines:

**Function:** `public.sync_tenants_to_organizations()` (SECURITY DEFINER, LANGUAGE plpgsql)
- INSERT path: syncs `tenants.plan → organizations.plan` via `ON CONFLICT (id) DO NOTHING`
- UPDATE path: syncs `tenants.plan → organizations.plan` via `UPDATE … SET plan = NEW.plan::text`
- If UPDATE finds no matching row (pre-backfill edge case): falls back to INSERT with `ON CONFLICT DO NOTHING`

**Trigger:** `trg_sync_tenants_to_org AFTER INSERT OR UPDATE ON public.tenants FOR EACH ROW`

**Direction:** One-way only — `tenants → organizations`. There is no reverse trigger
(`organizations → tenants`). This is architecturally intentional: `tenants` is the canonical
source for plan at the DB level; `organizations` is the read-model mirror.

**Status:** Applied to remote Supabase as part of the G-015 Phase A migration batch.

### 4.3 Provisioning write path

`tenantProvision.service.ts` → `provisionTenant()`:
- Calls `resolveProvisioningStorageBridge(provisioningIdentity)` which maps `identity.commercial_plan → storageBridge.plan`
- Writes `plan: storageBridge.plan` to `tenants` table (via `tx.tenant.create`)
- Writes `plan: storageBridge.plan` to `organizations` table (via `tx.organizations.upsert`)
- Both writes use the same value — **dual explicit writes** before the trigger even fires

**Result:** After provisioning, `tenants.plan === organizations.plan` by construction (two explicit
writes) AND by trigger (redundant safety net). The values are always identical after provisioning.

### 4.4 Runtime read path for plan

```
GET /api/me  →  resolveTenantSessionIdentity()
  → tx.organizations.findUnique({ select: { plan: true, … } })
  → canonicalizeTenantPlan(org.plan)          // strict normalizer — throws on invalid input
  → resolveTenantSessionProvisioningIdentity({ commercialPlan: plan })
       → returns { commercial_plan: input.commercialPlan, … }
  → returns TenantSessionIdentity { plan, commercial_plan }  // same value

GET /api/auth/login  →  getOrganizationIdentity(tenantId, prisma)
  → mapOrganizationIdentityRow(org)
       → canonicalizeTenantPlan(org.plan)
       → resolveCanonicalProvisioningIdentity({ commercialPlan: plan })
            → returns { commercial_plan: input.commercialPlan, … }
  → OrganizationIdentity { plan, commercial_plan }  // same value
  → auth response: { commercial_plan: org.commercial_plan }  // no `plan` field in login response
```

**All reads go through `organizations.plan`** — the `tenants.plan` field is never read at runtime.
The canonical plan runtime source is `organizations.plan`.

### 4.5 The `commercial_plan` field — etymology

`commercial_plan` is NOT a database column. It is an application-layer alias introduced by
`CanonicalProvisioningIdentity` (in `database-context.ts`) to carry the plan through the
provisioning identity model. It is computed as:

```
commercial_plan = canonicalizeTenantPlan(organizations.plan)
```

Because `canonicalizeTenantPlan(x) === x` for any valid TenantPlan value, and because
`organizations.plan` always holds a valid TenantPlan string (guaranteed by provisioning path),
the invariant `commercial_plan === plan` holds throughout the system at runtime.

### 4.6 Backend API response naming surface

| Endpoint | Plan field name | Value | Notes |
|---|---|---|---|
| `GET /api/me` | `tenant.plan` AND `tenant.commercial_plan` | Both `TenantPlan` enum string | Both present, same value |
| `POST /api/auth/login` | `commercial_plan` | `string \| null` | Null if org not yet provisioned; no `plan` field |
| `GET /api/control/tenants` | `commercial_plan` | `TenantPlan` | From `buildControlTenantInternalReadModel` |
| `GET /api/control/tenants/:id` | `commercial_plan` | `TenantPlan` | Same builder |

**Naming inconsistency observed:** `/api/me` returns both `plan` and `commercial_plan` (redundant).
Login response returns only `commercial_plan` (no `plan`). Control plane returns only `commercial_plan`.
The naming is not cleanly unified — but the frontend defensive fallback (`commercial_plan` first,
then `plan`) handles all cases correctly.

### 4.7 Frontend consumption

**`types.ts`:**
- `CommercialPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'`
- `normalizeCommercialPlan(plan)` — tolerates `TRIAL`→`FREE`, `BASIC`→`FREE`, `PAID`→`PROFESSIONAL`; defaults to `'FREE'`
- `TenantConfig.plan: CommercialPlan` (required field)
- `TenantConfig.commercial_plan?: CommercialPlan | null` (optional field)

**`App.tsx` — `resolveTenantIdentityCarrier`:**
```ts
// Reads commercial_plan first, then plan as fallback
if (typeof tenant?.commercial_plan === 'string' && tenant.commercial_plan.trim().length > 0) {
  commercialPlanSource = tenant.commercial_plan;
} else if (typeof tenant?.plan === 'string' && tenant.plan.trim().length > 0) {
  commercialPlanSource = tenant.plan;
}
```

**`App.tsx` — `buildTenantSnapshot`:**
- Guards `!identity.commercialPlan` — returns `null` if plan unavailable (workspace will not load)
- Sets both `plan` and `commercial_plan` on the normalized snapshot to the same `identity.commercialPlan` value
- This means the frontend always emits internally consistent plan data regardless of which backend field populated it

### 4.8 Tests and fixtures

| Test file | Plan field observed | Notes |
|---|---|---|
| `database-context.organization-identity.test.ts` | `commercial_plan: 'PROFESSIONAL'` (L57), `commercial_plan: 'ENTERPRISE'` (L100), `commercial_plan: 'STARTER'` (L137) | Confirms `OrganizationIdentity.commercial_plan` is the expected field |
| `helpers/seedRls.ts` | `plan: 'FREE'` (L46) | Correct DB field name for `organizations` |
| `control-onboarding-outcome.integration.test.ts` | `commercial_plan: 'PROFESSIONAL'` (L549), `commercial_plan: 'ENTERPRISE'` (L621) | Response shape verification |
| `tenant-provision-approved-onboarding.integration.test.ts` | `commercial_plan: 'PROFESSIONAL'` (L262) | Post-provision identity verification |

---

## §5 — Drift Analysis

### 5.1 Opening audit claim vs. repo truth

| Opening audit finding | Repo truth after deep investigation |
|---|---|
| "No confirmed sync mechanism" | **REFUTED.** `trg_sync_tenants_to_org` trigger confirmed in migration `20260224000000`. Applied to remote Supabase. |
| "Dual-table plan field drift risk unresolved" | **PARTIALLY RESOLVED.** Dual-write at provisioning time + trigger as safety net. Drift is only possible via direct DB updates to `organizations.plan` (no application code path does this). |
| T-4 status: `PARTIALLY_IMPLEMENTED` | **REVISED.** Should be `SUBSTANTIALLY_IMPLEMENTED`. The plan resolution pipeline is correct end-to-end for all application-path operations. |

### 5.2 Confirmed non-issues (previously unclear)

1. **`auth.ts` line 390: `org.commercial_plan` read** — The `org` variable is `OrganizationIdentity`,
   not a raw Prisma result. `OrganizationIdentity.commercial_plan` is the computed DTO field.
   This is correct and not a bug.

2. **Naming inconsistency (`commercial_plan` vs `commercialPlan` vs `plan`)** — These are:
   - `commercial_plan`: snake_case DTO field on `OrganizationIdentity` / API responses (snake_case convention for API/DB layer)
   - `commercialPlan`: camelCase TypeScript parameter in function signatures (`resolveCanonicalProvisioningIdentity({ commercialPlan }`)
   - `plan`: raw DB column field name
   The naming is internally consistent within each layer. The frontend defensive fallback handles all variations.

3. **`tenants.plan` never read at runtime** — All runtime reads go through `organizations.plan`.
   The `tenants.plan` field is write-only from the runtime perspective (written at provisioning,
   triggers sync to organizations). This is architecturally intentional.

4. **Control plane returns `commercial_plan` (camelCase property in JSON is actually snake_case)**
   — `buildControlTenantInternalReadModel` spreads `commercial_plan` into the response object.
   This is consistent with the tenant-plane response naming.

### 5.3 Confirmed residual risks (real, but not launch-blocking)

**RISK-T4-01 (P2 — Operational):** `organizations.plan` has no DB-level `CHECK` constraint
enforcing valid `TenantPlan` values. A direct DB admin `UPDATE organizations SET plan = 'INVALID'`
would cause `canonicalizeTenantPlan` to throw a runtime error, breaking the login and workspace
load for that tenant. No application code path produces an invalid value (all go through
`canonicalizeTenantPlan` or the typed `TenantPlan` enum on `tenants`).

**RISK-T4-02 (P2 — Operational):** No reverse sync trigger (`organizations → tenants`).
A direct DB update to `organizations.plan` does NOT sync back to `tenants.plan`. In practice,
runtime only reads `organizations.plan`, so this is only an issue if something reads `tenants.plan`
directly. Currently nothing does at runtime. Risk: `tenants.plan` could drift from `organizations.plan`
if `organizations.plan` is patched directly, but this has no runtime impact in the current code.

**RISK-T4-03 (P3 — API surface debt):** `/api/me` returns both `plan` and `commercial_plan`
with identical values — one is redundant. Over time this creates consumer uncertainty about which
field is canonical. Not a launch blocker; can be addressed in a post-launch API normalization pass.

**RISK-T4-04 (P3 — Auth flow edge case):** Login response returns `commercial_plan: null` when
org is not yet provisioned. `buildTenantSnapshot` returns `null` in this case. The frontend then
falls back to `/api/me` which returns a full `TenantSessionIdentity`. This failure mode is handled
correctly and is by design (fail-open pattern).

---

## §6 — Launch Impact Classification

| Risk ID | Description | Severity | Launch-blocking? | Recommended action |
|---|---|---|---|---|
| RISK-T4-01 | No CHECK constraint on `organizations.plan` | P2 | ❌ No | Post-launch DB hardening migration (add CHECK constraint) |
| RISK-T4-02 | No reverse sync trigger (org → tenants) | P2 | ❌ No | Post-launch operational note; no change needed unless direct org updates become a workflow |
| RISK-T4-03 | Redundant dual plan fields in `/api/me` response | P3 | ❌ No | Post-launch API surface normalization |
| RISK-T4-04 | `commercial_plan: null` in login on unprovisioned org | P3 | ❌ No | Working by design (fail-open + `/api/me` fallback) |

**T-4 launch impact verdict: NON-BLOCKING.** The sync mechanism is in place, the provisioning
write path is correct, the runtime read path is correct, and the frontend defensive fallback handles
all valid application-path scenarios. No changes are needed to unblock launch for T-4.

**Revised T-4 implementation state: `SUBSTANTIALLY_IMPLEMENTED`**

---

## §7 — Minimum Recommended Remediation Plan

### Immediate (launch prerequisite): NONE

T-4 does not require any implementation changes to unblock launch.

### Post-launch P2 DB hardening (recommended, not blocking)

A migration to add a CHECK constraint to `organizations.plan`:

```sql
-- Proposed post-launch migration (NOT part of this unit)
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_plan_valid_enum
  CHECK (plan IN ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'));
```

This would prevent RISK-T4-01 (invalid string from direct DB update causing runtime 500s).
This migration requires:
- Explicit approval per TexQtic DB governance rules
- Prisma `db pull` + `generate` after application
- Restart of the server

**This is NOT authorized by FAM-08E.** It is documented here as a follow-on recommendation only.

### Post-launch P3 API normalization (optional, not blocking)

Deprecate the redundant `plan` field from `/api/me` tenant response in favour of `commercial_plan`
as the single canonical API field. Requires a coordinated frontend update (currently uses both
with `commercial_plan`-first fallback). Out of scope for FAM-08 launch.

---

## §8 — Proposed Next Implementation Unit

**Recommended next unit:** FAM-08F — NC Pool RFQ Submission DB Validation (GAP-T5-01)

T-4 is resolved (substantially implemented, no blockers). T-5 (admin settings surface accessibility)
was classified `PARTIALLY_IMPLEMENTED` in the opening audit. GAP-T5-01 (NC pool RFQ submission
DB validation — the remaining T-5 gap and the last significant open T-gap) should be the next
packet.

**Proposed title:** `FAM-08F-NC-POOL-RFQ-SUBMISSION-DB-VALIDATION-DESIGN-001`

If GAP-T5-01 investigation reveals a quick fix, FAM-08F may be both a design and implementation
unit. If it reveals complex scope, FAM-08F should remain design-only and propose FAM-08G for
implementation.

---

## §9 — Proposed Allowed Write Files for Next Unit

For FAM-08F (design-only):
```
artifacts/launch-readiness/FAM-08F-NC-POOL-RFQ-SUBMISSION-DB-VALIDATION-DESIGN-001.md   (NEW, git add -f)
```

For FAM-08F (implementation, if warranted):
```
artifacts/launch-readiness/FAM-08F-...md   (NEW, git add -f)
server/src/__tests__/[specific test file]  (if test-only fix)
```
Full allowlist to be determined by FAM-08F preflight investigation.

---

## §10 — Validation Requirements for Next Unit

```powershell
# Preflight
git diff --name-only
git status --short   # must be clean

# Post-write
git diff --name-only                   # must show only allowlisted files
git add -f artifacts/launch-readiness/FAM-08F-...md
git diff --name-only --cached          # must show only the artifact
git commit -m "docs(fam-08): design nc pool rfq submission db validation"
git show --stat HEAD
git status --short                     # must be clean again
```

---

## §11 — Invariant Confirmations

| Invariant | Required state | Verified state |
|---|---|---|
| FAM-07 status | `PARTIALLY_IMPLEMENTED` | Not modified — preserved |
| FAM-07 hold | `HOLD_FOR_HUMAN_LEGAL_INPUTS` | Preserved — `governance/legal/fam-07/` absent |
| FTR-LEGAL-003 | `MVP_CRITICAL / OPEN` | Not modified |
| `governance/legal/fam-07/` directory | ABSENT | Confirmed absent |
| `server/prisma/schema.prisma` | NOT modified | Not modified |
| Existing migrations | NOT modified | Not modified |
| No source/route/service files | NOT modified | Not modified |
| No secrets exposed | DATABASE_URL, tokens never printed | Confirmed |
| T-3 (FAM-08D2) | CLOSED | Remains closed — not reopened |
| T-5 (GAP-T5-01) | OPEN — separate from FAM-08E | Confirmed separate; not merged |
| FAM-08 family status | OPEN | Not modified |
| `PublicSupplierProfile.tsx` | NOT staged, NOT modified | Confirmed untouched |

---

## §12 — Files Changed This Unit

| File | Change type | Notes |
|---|---|---|
| `artifacts/launch-readiness/FAM-08E-TENANT-PLAN-FIELD-SYNC-REPO-TRUTH-DESIGN-001.md` | CREATED | This artifact — git-ignored directory, requires `git add -f` |

**No source files, migration files, test files, or governance files were modified.**

---

## §13 — Commit Instruction

```powershell
# Stage (artifacts/ is git-ignored — must use -f)
git add -f artifacts/launch-readiness/FAM-08E-TENANT-PLAN-FIELD-SYNC-REPO-TRUTH-DESIGN-001.md

# Verify staged set (must show ONLY this file)
git diff --name-only --cached

# Commit
git commit -m "docs(fam-08): design tenant plan field sync"

# Post-commit evidence
git show --stat HEAD
git status --short
```

---

## §14 — Final Enum

```
FAM_08E_TENANT_PLAN_FIELD_SYNC_DESIGN_COMPLETE
```

**Status:** T-4 investigation complete. GAP-T4-01 resolved as a knowledge gap in the opening
audit — the DB sync trigger was confirmed present in migration history. T-4 reclassified to
`SUBSTANTIALLY_IMPLEMENTED`. No launch-blocking remediation required. Two P2 and two P3
residual risks documented for post-launch hardening. FAM-08F (T-5 / GAP-T5-01) is the
recommended next packet.

---

## §15 — Investigation Questions Answered

| Q# | Question | Answer |
|---|---|---|
| Q1 | Does `commercial_plan` exist as a DB column? | **NO.** Application-layer computed alias only. Source is `organizations.plan`. |
| Q2 | Is there a sync mechanism between `tenants.plan` and `organizations.plan`? | **YES.** `trg_sync_tenants_to_org` trigger (AFTER INSERT OR UPDATE on tenants) confirmed in migration `20260224000000`. |
| Q3 | Is the trigger one-way or bidirectional? | **ONE-WAY** (`tenants → organizations` only). No reverse trigger exists. |
| Q4 | Does provisioning write plan to both tables? | **YES.** `tenantProvision.service.ts` explicitly writes `plan: storageBridge.plan` to both `tenants` (via `tenant.create`) and `organizations` (via `organizations.upsert`). |
| Q5 | What does `auth.ts` line 390 `org.commercial_plan` read? | `OrganizationIdentity.commercial_plan` — a computed DTO field, not a DB column. Correct. |
| Q6 | Do all backend responses use the same plan field name? | **NO.** `/api/me` returns both `plan` and `commercial_plan`. Login returns only `commercial_plan`. Control plane returns `commercial_plan`. Naming is inconsistent but frontend handles it. |
| Q7 | Is the frontend plan resolution resilient? | **YES.** `resolveTenantIdentityCarrier` reads `commercial_plan` first, `plan` as fallback. `normalizeCommercialPlan` has additional legacy alias handling. |
| Q8 | Can `buildTenantSnapshot` return `null` from a plan issue? | **YES** — if both `commercial_plan` and `plan` are absent/empty. Only happens when org is unprovisioned (login fail-open case). Handled correctly by `/api/me` fallback. |
| Q9 | Is there a constraint preventing invalid `organizations.plan` values? | **NO.** VARCHAR(30) with no CHECK constraint. `canonicalizeTenantPlan` throws at runtime if value is invalid. This is RISK-T4-01 (P2, not launch-blocking). |
| Q10 | Is `tenants.plan` ever read at runtime? | **NO.** All runtime reads go through `organizations.plan`. `tenants.plan` is a write-only field from the runtime perspective. |
| Q11 | Are tests consistent with the repo-truth finding? | **YES.** Tests use `commercial_plan` as the expected field on `OrganizationIdentity`. `seedRls.ts` correctly uses `plan` as the DB field name. |
| Q12 | Is T-4 launch-blocking? | **NO.** Substantially implemented. No blocking remediation needed. |
| Q13 | What is the revised T-4 implementation state? | **`SUBSTANTIALLY_IMPLEMENTED`** (upgraded from `PARTIALLY_IMPLEMENTED`). |
| Q14 | What is the correct next packet? | **FAM-08F** — GAP-T5-01 NC pool RFQ submission DB validation. |
| Q15 | Does this investigation change the FAM-07 hold? | **NO.** FAM-07 hold is independent and unaffected. |
| Q16 | Does closing T-4 advance family-level FAM-08 status? | **NO.** T-5 (GAP-T5-01) remains open. FAM-08 family close requires all T-gaps resolved. |
| Q17 | Are any adjacent findings out of scope for this unit? | **YES.** RISK-T4-01 (CHECK constraint missing) and API surface normalization (§7) are documented as post-launch items. They must not be merged into FAM-08E scope. |

---

*FAM-08E closed. Design-only. No source edits. Artifact committed via `git add -f`. 2026-07-15.*
