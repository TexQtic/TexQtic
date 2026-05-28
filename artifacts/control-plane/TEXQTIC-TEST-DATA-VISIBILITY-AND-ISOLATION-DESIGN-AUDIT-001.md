# TEXQTIC-TEST-DATA-VISIBILITY-AND-ISOLATION-DESIGN-AUDIT-001

## 1. Task Identity

| Field | Value |
|---|---|
| Artifact ID | TEXQTIC-TEST-DATA-VISIBILITY-AND-ISOLATION-DESIGN-AUDIT-001 |
| Type | Design Audit — Test Data Visibility and Isolation |
| Track | Launch Readiness / QA Data Hygiene |
| Date | 2026-07-06 |
| Starting HEAD | `29bd7907908245cd624752384322b6bc8e3f0f4c` |
| Branch | `main` |
| Tree Status | CLEAN |
| Parent context | FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001 (committed `29bd790`) |
| Predecessor prompt | FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001 |
| Owner | Paresh Patel (TexQtic founder) |
| Output scope | Design/audit only — NO implementation, NO schema/source/config edits |

---

## 2. Start HEAD

```
Branch: main
HEAD:   29bd7907908245cd624752384322b6bc8e3f0f4c
Status: CLEAN (no uncommitted changes)
```

---

## 3. Inputs Inspected

The following artifacts, source files, and governance documents were read in full for this audit.

### 3.1 Schema

| File | Relevant sections |
|---|---|
| `server/prisma/schema.prisma` | `Tenant` model (lines 11–50): `publicEligibilityPosture`, `status`, `type`, `isWhiteLabel` |
| `server/prisma/schema.prisma` | `organizations` model (lines 1054–1160): `status`, `publication_posture`, `is_qa_sentinel`, `org_type`, `is_white_label` |

**Key fields identified:**

| Field | Model | Type | Default | Purpose |
|---|---|---|---|---|
| `publicEligibilityPosture` | `tenants` | `TenantPublicEligibilityPosture` enum | `NO_PUBLIC_PRESENCE` | Gate A in all public projection services |
| `publication_posture` | `organizations` | `VarChar(30)` | `PRIVATE_OR_AUTH_ONLY` | Gate B in all public projection services |
| `org_type` | `organizations` | `VarChar(50)` | `B2B` | Gate C (B2B vs B2C surface routing) |
| `status` | `organizations` | `VarChar(30)` | `ACTIVE` | Gate D — must be `ACTIVE` or `VERIFICATION_APPROVED` |
| `is_qa_sentinel` | `organizations` | `Boolean` | `false` | Gate E — QA orgs must have `is_qa_sentinel = true` to be excluded from public projection |

### 3.2 Public Projection Services

| File | Surfaces governed |
|---|---|
| `server/src/services/publicB2BProjection.service.ts` | `GET /api/public/suppliers/b2b` (list), `GET /api/public/suppliers/b2b/:slug` (profile) |
| `server/src/services/publicB2CProjection.service.ts` | `GET /api/public/storefronts/b2c` (list), `GET /api/public/storefronts/b2c/:slug` (product detail) |

Both services implement a **five-gate exclusion chain**:

```
Gate A: tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'
Gate B: org.publication_posture IN ('B2B_PUBLIC', 'BOTH')   [B2B] or ('B2C_PUBLIC', 'BOTH')  [B2C]
Gate C: org.org_type === 'B2B'                              [B2B] or 'B2C'                    [B2C]
Gate D: org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')
Gate E: org.is_qa_sentinel === false
```

All five gates must pass for an org to appear in the public projection. Failing any gate results in
silent exclusion (the org simply does not appear in the response).

### 3.3 Control-Plane Config

| File | Relevant sections |
|---|---|
| `server/src/config/controlPlaneTenantReadExclusions.ts` | Full file — approved-hide list (44 slugs), preserved-no-delete list (16 slugs), `filterControlPlaneLaunchFacingTenantList()` |
| `server/src/routes/control.ts` | `GET /tenants` uses `filterControlPlaneLaunchFacingTenantList()` at line 379 |

### 3.4 Seed and Fixture Scripts

| File | QA tenants created |
|---|---|
| `server/prisma/seed.ts` | `qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`, `qa-buyer` |
| `server/scripts/qa/current-db-multi-segment-qa-seed.ts` | `qa-knt-b`, `qa-dye-c`, `qa-gmt-d`, `qa-buyer-a`, `qa-buyer-c`, `qa-svc-tst-a`, `qa-svc-log-b` |
| `server/scripts/qa/nc-phase1-qa-fixture-baseline.ts` | `qa-nc-pool-a`, `qa-nc-sup-a` |
| `server/scripts/assign-b2b-public-posture.ts` | Sets `qa-b2b` → `PUBLICATION_ELIGIBLE` + `B2B_PUBLIC` |
| `server/scripts/assign-b2c-public-posture.ts` | Sets `qa-b2c` → `PUBLICATION_ELIGIBLE` + `B2C_PUBLIC` (subsequently quarantined) |

### 3.5 Governance Artifacts

| File | Key fact |
|---|---|
| `governance/control/NEXT-ACTION.md` | B2C quarantine QUARANTINE_VERIFIED_COMPLETE (2026-05-20). HD-002 VERIFIED_FAIL — real supplier data still absent. |
| `governance/units/TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001.md` | Quarantine method: SQL UPDATE set `publication_posture = 'PRIVATE_OR_AUTH_ONLY'` for `qa-b2c` org |
| `governance/control/OPEN-SET.md` | FAM-10 status: NOT_ASSESSED (no lock) |
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | FAM-10 row: `NOT_ASSESSED`, `LAUNCH_BLOCKER`, P0 |
| `artifacts/control-plane/FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001.md` | Fixture readiness; F4 candidate is `qa-knt-b` org |

---

## 4. Current FAM-10 Blocker Context

FAM-10 production verification (`FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001`) is
blocked because all four fixture groups (F1–F4) have not been confirmed against the live database.
The data preparation artifact (committed `29bd790`) identified:

- **F1 (archive)**: UUID test tenants in `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS`. Live
  status (archived vs. active) unknown. Requires Paresh to run read-only DB check.
- **F2 (outcome/PENDING_VERIFICATION)**: `test-tenant-email-verification-1779163982162` is the
  primary candidate. Live status unknown.
- **F3 (activation)**: No fixture exists. No seed ever creates `VERIFICATION_APPROVED` status
  tenants. A D→E compound flow (outcome first, then activate) is required.
- **F4 (impersonation)**: Multi-segment QA tenants (`qa-knt-b` recommended). `orgId` and `userId`
  for the owner user unknown — requires live DB check.

This design audit does NOT unblock FAM-10 directly. Its purpose is to assess whether the QA data
isolation model is adequate for launch so that the FAM-10 verify-close path can proceed with
confidence about what test data the admin user will see in production.

**Key connection:** The FAM-10 production verification exercises control-plane admin routes
(archive, onboarding outcome, activation, impersonation). These are all authenticated admin
routes. They do NOT exercise public projection routes. The public-surface QA data leakage gap
identified in this audit (GAP-1, §9) is a separate concern — it does not block FAM-10
fixture-based verification, but it IS a launch-blocking concern for the public supplier
directory surface.

---

## 5. Paresh Business Requirement Interpretation

The stated business requirement is:

> "Create a sustainable way to keep test data/users/tenants in the database while preventing them
> from appearing in real production app surfaces after launch. The goal is not to delete all test
> data before launch, but to classify, hide, isolate, or gate test/demo/internal records
> appropriately."

This audit interprets the requirement across three sub-requirements:

| Sub-requirement | Interpretation |
|---|---|
| **SR-1: Public surface isolation** | QA/test tenants must not appear on unauthenticated public-facing routes (`/api/public/suppliers/b2b`, `/api/public/storefronts/b2c`, etc.) after launch |
| **SR-2: Admin surface hygiene** | Control-plane tenant listing shown to super admins should clearly scope to "launch-facing real tenants" with test/noise tenants hidden or distinctly grouped |
| **SR-3: Sustainability** | The isolation mechanism should not require a code deploy (or a governance unit) for every new test tenant created post-launch |

---

## 6. Current Test/Demo/Internal Data Visibility Mechanisms

Three mechanisms currently exist. They operate on different layers and do not form a unified policy.

---

### Mechanism 1 — Five-Gate Public Projection (implemented, partially effective)

**Location:** `server/src/services/publicB2BProjection.service.ts`,
`server/src/services/publicB2CProjection.service.ts`

**How it works:** All unauthenticated public browse/discovery requests pass through a five-gate
chain. An org must satisfy ALL five gates to be included in the public response. Failing any gate
results in silent exclusion.

**Test-data relevant gate:** Gate E — `org.is_qa_sentinel === false`.

The gate logic is designed correctly: only orgs with `is_qa_sentinel = false` pass. Any org with
`is_qa_sentinel = true` is silently excluded from the public projection.

**Enforcement status:** Gate E is implemented and verified by passing unit tests:
- `server/src/__tests__/public-b2b-projection.unit.test.ts` (tests 11, Gate E)
- `server/src/__tests__/public-b2c-projection.unit.test.ts` (tests 13, Gate E)

**Data state:** No organization in the database has `is_qa_sentinel = true`. The field was added to
the schema and the gate was implemented in both services, but no seed script or fixture script ever
sets the flag. Every org — including all QA/test orgs — has the default value `false`.

**Net effect:** Gate E provides zero protection today. It is a correctly designed but dormant
classification gate.

---

### Mechanism 2 — Config-File Approved-Hide List (implemented, control-plane only)

**Location:** `server/src/config/controlPlaneTenantReadExclusions.ts`

**How it works:** The `filterControlPlaneLaunchFacingTenantList()` function is called at the
start of `GET /api/control/tenants` (line 379 of `server/src/routes/control.ts`). It filters the
raw Prisma result set against a hardcoded list of slugs — the
`CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS` array (44 entries). Any tenant whose slug
appears in this list is excluded from the response.

**Coverage:**
- UUID-based test tenants created during development runs (e.g., `test-tenant-nll-*`,
  `test-tenant-ni-route-*`, UUID prefix batches)
- One-off verification tenants (`b2c-browse-proof-20260402080229`,
  `activation-verify-2026-04-02-org-status-close-gate-exec`, etc.)

**What it does NOT cover:**
- Public projection routes — this filter is ONLY applied at `GET /api/control/tenants`
- The preserved QA fixture tenants (`qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`,
  `qa-knt-b`, `qa-dye-c`, `qa-gmt-d`, etc.) are NOT in the hide list
- Any test tenant created after the last code deploy that included a list update

**Guardrail:** The config module includes a runtime guardrail
(`assertControlPlaneTenantReadSideHideGuardrails()`) that throws at startup if the list size,
uniqueness, or overlap constraints are violated. This prevents accidental list corruption.

---

### Mechanism 3 — Preserved-No-Delete Protection (partial visibility control)

**Location:** `server/src/config/controlPlaneTenantReadExclusions.ts` (list),
`server/src/routes/control.ts` (`POST /tenants/:id/archive` handler)

**How it works:** The `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS` list (16
entries) controls which tenants cannot be archived via the control-plane `POST
/tenants/:id/archive` route. Separately, `protectedTenantArchiveSlugs` (6 entries in
`control.ts` lines 255–264) and `protectedTenantArchiveNames` (1 entry) provide archive
protection for the core QA set.

**Visibility behavior:** Tenants in the preserved-no-delete list ARE visible in the
control-plane tenant list (they are NOT in the approved-hide list). Admins can see and interact
with them. This is intentional — `qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`,
`white-label-co`, `shraddha-industries`, `acme-corp-live-verify`, and the ops-casework tenants
are preserved for ongoing QA and verification use.

---

### Mechanism 4 — B2C Quarantine (one-time data fix, completed 2026-05-20)

**Reference:** `governance/units/TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001.md`

**What was done:** After HD-002 confirmed that QA B2C data was appearing in the public B2C browse,
a controlled quarantine was executed. A SQL UPDATE set `publication_posture = 'PRIVATE_OR_AUTH_ONLY'`
for the `qa-b2c` organization. This caused Gate B to fail for that org, removing it from the public
B2C storefront projection.

**Scope:** Applied only to B2C. No equivalent quarantine has been executed for B2B QA tenants.

---

## 7. Current Public/User-Facing Leakage Risk Assessment

This section assesses each unauthenticated public surface for QA/test data leakage risk.

### Surface 1 — `GET /api/public/suppliers/b2b` (B2B Supplier Discovery)

**Risk: HIGH — QA multi-segment supplier tenants will appear at launch.**

| Tenant | Gate A | Gate B | Gate C | Gate D | Gate E | Net result |
|---|---|---|---|---|---|---|
| `qa-knt-b` | PASS (`PUBLICATION_ELIGIBLE`) | PASS (`B2B_PUBLIC`) | PASS (`B2B`) | PASS (`ACTIVE`) | PASS (`is_qa_sentinel=false`) | **INCLUDED** |
| `qa-dye-c` | PASS | PASS | PASS | PASS | PASS | **INCLUDED** |
| `qa-gmt-d` | PASS | PASS | PASS | PASS | PASS | **INCLUDED** |
| `qa-b2b` | PASS (if `assign-b2b-public-posture.ts` was run) | PASS (if run) | PASS | PASS | PASS | **INCLUDED (if run)** |
| `qa-buyer-a` | FAIL (`NO_PUBLIC_PRESENCE`) | — | — | — | — | excluded |
| `qa-buyer-c` | FAIL | — | — | — | — | excluded |
| `qa-svc-tst-a` | FAIL | — | — | — | — | excluded |
| `qa-svc-log-b` | FAIL | — | — | — | — | excluded |
| `qa-nc-pool-a` | unknown (no posture set in seed) | unknown | — | — | — | likely excluded |
| `qa-nc-sup-a` | unknown | unknown | — | — | — | likely excluded |

**Public display names that would be visible:** "QA Knitting Supplier B Pvt Ltd", "QA Dyeing Supplier
C Pvt Ltd", "QA Garment Supplier D Pvt Ltd" — these names unambiguously identify the records as
test data. Real users browsing the supplier directory would see them.

**Key finding:** The approved-hide config list does NOT filter public projection routes. It is
control-plane only. There is NO mechanism currently preventing these three tenants from appearing
in the public B2B supplier directory at launch.

---

### Surface 2 — `GET /api/public/suppliers/b2b/:slug` (B2B Supplier Profile)

Same gate chain as Surface 1. Any tenant visible in the list is also directly addressable by
slug. `qa-knt-b`, `qa-dye-c`, `qa-gmt-d` will return a 200 profile with their QA org details.

---

### Surface 3 — `GET /api/public/storefronts/b2c` (B2C Storefront Browse)

**Risk: LOW — Quarantined.** The B2C quarantine (2026-05-20) set `publication_posture =
'PRIVATE_OR_AUTH_ONLY'` for `qa-b2c`. Gate B fails. QA B2C records do not appear. Result is
`{ items: [], total: 0 }`.

However, the quarantine is data-layer only. No structural change protects future QA B2C tenants.
If a new B2C QA tenant is seeded with `B2C_PUBLIC` posture, it would appear immediately.

---

### Surface 4 — `GET /api/public/storefronts/b2c/:slug` (B2C Product Detail)

**Risk: LOW — Protected by same gates as Surface 3.** QA B2C tenants return 404 after quarantine.

---

### Surface 5 — D2C Public Collections (`/api/public/collections/:slug/products`)

**Risk: NEGLIGIBLE.** D2C collections are curated and explicitly assigned by slug. The collection
slug allowlist (`server/src/config/publicCollectionSlugs.js`) governs which collections are
publicly accessible. No QA collection slug appears in this allowlist.

---

### Summary Table

| Surface | QA leakage risk | Current protection | Gap |
|---|---|---|---|
| B2B supplier discovery (list) | **HIGH** | None for multi-segment QA | **GAP-1** |
| B2B supplier profile (by slug) | **HIGH** | None | **GAP-1** |
| B2C storefront browse | **LOW** | Quarantine (`publication_posture = PRIVATE_OR_AUTH_ONLY`) | Minor: not structural |
| B2C product detail | **LOW** | Same quarantine | Minor |
| D2C public collections | NEGLIGIBLE | Slug allowlist | None |

---

## 8. Current Admin/Control-Plane Visibility Assessment

The control-plane tenant list (`GET /api/control/tenants`, admin-auth required) currently shows
all tenants that are NOT in the approved-hide list. This is intentional: admins need to see and
manage QA fixtures.

### What admins currently see

| Category | Visibility | Mechanism |
|---|---|---|
| UUID-based test tenants (44 slugs) | Hidden | `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS` |
| Core QA fixtures (`qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`, `white-label-co`, etc.) | Visible | Not in hide list (intentional) |
| Multi-segment QA suppliers (`qa-knt-b`, `qa-dye-c`, `qa-gmt-d`, etc.) | Visible | Not in hide list (intentional) |
| NC Phase 1 fixtures (`qa-nc-pool-a`, `qa-nc-sup-a`) | Visible | Not in hide list |
| Ops/verify tenants (`shraddha-industries`, `acme-corp-live-verify`, `ops-casework-*`) | Visible | In preserved-no-delete list (not in hide list) |

### Control-plane archive protection

The archive route (`POST /tenants/:id/archive`) is guarded by two lists:
- `protectedTenantArchiveSlugs` (6 entries in `control.ts`): `qa-b2b`, `qa-b2c`, `qa-wl`,
  `qa-agg`, `qa-pend`, `white-label-co` — cannot be archived
- `protectedTenantArchiveNames` (1 entry): `WHITE LABEL CO` — cannot be archived
- `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS` governs the broader preserved
  set but does NOT directly block archive in code (the archive protection is only from the 6-entry
  list in `control.ts`)

**Gap:** The `shraddha-industries`, `acme-corp-live-verify`, and `ops-casework-*` tenants are in
the preserved-no-delete list but NOT in the `protectedTenantArchiveSlugs` list in `control.ts`.
An admin with SUPER_ADMIN role could archive them. This is a minor admin-surface gap but not a
public-surface concern.

### Admin surface verdict

The control-plane admin surface is adequate for launch. QA fixtures are intentionally visible to
admins (needed for verification and ops). UUID noise is hidden. The separation is clear. No admin
surface currently exposes data to unauthenticated users.

---

## 9. Gap Analysis

### GAP-1 — QA B2B Multi-Segment Suppliers in Public Projection [CRITICAL, LAUNCH-BLOCKING]

**Description:** `qa-knt-b` ("QA Knitting Supplier B Pvt Ltd"), `qa-dye-c` ("QA Dyeing Supplier
C Pvt Ltd"), and `qa-gmt-d` ("QA Garment Supplier D Pvt Ltd") will appear in the public B2B
supplier directory (`GET /api/public/suppliers/b2b`) at launch because all five projection gates
pass for each of them.

**Root cause:** The multi-segment QA seed script
(`server/scripts/qa/current-db-multi-segment-qa-seed.ts`) assigns:
- `publicEligibilityPosture: 'PUBLICATION_ELIGIBLE'` (Gate A: PASS)
- `publicationPosture: 'B2B_PUBLIC'` (Gate B: PASS)
- `org_type: 'B2B'` (Gate C: PASS)
- `status: 'ACTIVE'` (Gate D: PASS)
- `is_qa_sentinel = false` (default; Gate E: PASS — not excluded)

The approved-hide config list filters only the control-plane tenant list API. It has no effect on
the public projection services.

**Evidence:** `current-db-multi-segment-qa-seed.ts` lines 56–62, 72–78, 87–93 confirm the posture
assignment. No quarantine has been executed for B2B multi-segment suppliers.

**Impact:** At launch, real users browsing for textile suppliers will see "QA Knitting Supplier B
Pvt Ltd", "QA Dyeing Supplier C Pvt Ltd", "QA Garment Supplier D Pvt Ltd" in the public supplier
list. This immediately undermines user trust in the platform.

**Severity:** LAUNCH-BLOCKING.

---

### GAP-2 — `is_qa_sentinel` Flag Never Set in Any Seed Script [STRUCTURAL, POST-LAUNCH RISK]

**Description:** The `organizations.is_qa_sentinel` field exists in the schema and Gate E in both
public projection services correctly checks `is_qa_sentinel: false` as an exclusion filter. However,
no seed script, fixture script, or migration script ever sets `is_qa_sentinel = true` for any
tenant organization. Every organization row in the production database has `is_qa_sentinel = false`
(the schema default).

**Root cause:** The Gate E mechanism was designed and implemented but the complementary data
classification step was never executed. Gate E is a dormant gate.

**Evidence:**
- `grep` for `is_qa_sentinel: true` across all TypeScript files under `server/` returns zero matches
- `grep` for `is_qa_sentinel` in seed scripts returns zero matches
- Gate E unit tests mock `is_qa_sentinel: false` as the DEFAULT for non-QA test orgs, confirming
  the intent was to set `is_qa_sentinel: true` for QA orgs but this was deferred

**Impact:** Any future QA tenant seeded with `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`
and a public `publication_posture` will bypass Gate E and appear on public surfaces. The mechanism
designed for durable QA isolation is currently non-functional.

**Severity:** Not immediately launch-blocking (GAP-1 is the acute gap), but required for
post-launch sustainability.

---

### GAP-3 — Config-File Slug List Does Not Scale Post-Launch [OPERATIONAL]

**Description:** The approved-hide list is a hardcoded TypeScript constant in
`server/src/config/controlPlaneTenantReadExclusions.ts`. Adding a new test tenant to the list
requires: a code edit → code review → deployment. The list currently has 44 entries and a runtime
guardrail that verifies the exact count (`APPROVED_READ_SIDE_HIDE_SLUG_COUNT`). Any addition
requires updating the count constant too.

**Impact:** Post-launch, if QA or ops workflows create test tenants (for example, to verify a bug
report or run a new onboarding scenario), those tenants will appear in the admin control-plane
tenant list until a code deploy adds them to the hide list. This is operationally inconvenient
but not a public-surface risk (since the control-plane requires admin auth).

**Severity:** LOW — operational inconvenience only.

---

### GAP-4 — `qa-b2b` Public Posture Unknown Without Live DB Check [MODERATE]

**Description:** `server/scripts/assign-b2b-public-posture.ts` was created to explicitly set
`qa-b2b` to `publicEligibilityPosture = PUBLICATION_ELIGIBLE` + `publication_posture = B2B_PUBLIC`.
If this script was run in production, `qa-b2b` would pass all five public projection gates and
appear in the public B2B supplier directory. There is no governance unit recording whether this
script was run against the production DB.

**Impact:** Conditional — only a gap if the script was run. Requires a live DB check to confirm.

**Severity:** MODERATE — contingent on live state.

---

### GAP-5 — No Forward-Looking QA Classification Protocol [OPERATIONAL]

**Description:** There is no documented convention that new QA tenants must have `is_qa_sentinel =
true` set. Seed scripts and fixture scripts do not include `is_qa_sentinel` in their org creation
payloads. The gap will recur every time a new QA fixture set is created.

**Impact:** Without a convention, future fixture scripts will create orgs with `is_qa_sentinel =
false` (default), bypassing Gate E. The fix for GAP-2 will need to be repeated.

**Severity:** LOW — operational risk only, but relevant to post-launch sustainability.

---

## 10. Design Options Comparison

Four options are evaluated against the three sub-requirements (SR-1: public isolation, SR-2: admin
hygiene, SR-3: sustainability).

---

### Option A — Status Quo Extended: Slug Lists + Ad-Hoc Posture Quarantine

**Description:** Maintain the current three-mechanism approach. Address GAP-1 by running a B2B
quarantine for `qa-knt-b`, `qa-dye-c`, `qa-gmt-d` (analogous to the B2C quarantine): SQL UPDATE
to set `publication_posture = 'PRIVATE_OR_AUTH_ONLY'` for these orgs. For GAP-4, run a
read-only DB check to verify `qa-b2b` posture and quarantine if needed.

**Implementation:** SQL UPDATE via `psql` (no code change, no schema change, no seed change).
Follows established pattern from `TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001`.

**Gate effect:** Gate B fails for quarantined orgs → excluded from public B2B projection.

**Trade-offs:**

| Criterion | Assessment |
|---|---|
| SR-1 (public isolation) | ✅ Closes GAP-1 and GAP-4 for known orgs |
| SR-2 (admin hygiene) | ✅ No change — admin surface unchanged |
| SR-3 (sustainability) | ❌ Does not scale. Every new B2B_PUBLIC QA tenant needs a separate quarantine step. Gate E remains dormant. |
| Schema/code change | None |
| Production DB change | SQL UPDATE on 3–4 org rows |
| Risk | LOW — follows established pattern |
| Reversibility | Easy — SQL UPDATE back to B2B_PUBLIC |
| Side effect | **Changes the orgs' intended publication posture.** NC commerce QA tests that verify `publication_posture = 'B2B_PUBLIC'` behavior may need posture assertions adjusted. |

---

### Option B — Activate Gate E: Set `is_qa_sentinel = true` for Known QA Orgs

**Description:** Execute a SQL UPDATE to set `is_qa_sentinel = true` for all known QA/test
organization rows. Gate E is already correctly implemented and tested in both projection services.
No code change is required to the gate itself. The only change is at the data layer.

**Affected orgs:** All QA fixture organizations — at minimum:
`qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend` (from seed.ts);
`qa-knt-b`, `qa-dye-c`, `qa-gmt-d`, `qa-buyer-a`, `qa-buyer-c`, `qa-svc-tst-a`, `qa-svc-log-b`
(from multi-segment seed);
`qa-nc-pool-a`, `qa-nc-sup-a` (from NC Phase 1 baseline).

**Implementation path (data-only, no schema/migration needed):**
1. SQL UPDATE via `psql`: `UPDATE organizations SET is_qa_sentinel = true WHERE slug IN (...);`
2. `prisma db pull` — verify no schema drift
3. `prisma generate` — refresh generated client
4. Restart server

**Trade-offs:**

| Criterion | Assessment |
|---|---|
| SR-1 (public isolation) | ✅ Gate E closes GAP-1 and GAP-4 for all QA orgs via a single DB update |
| SR-2 (admin hygiene) | ✅ Admin surface unchanged (Gate E only applies to public projection; control-plane listing is unaffected) |
| SR-3 (sustainability) | ✅ New QA seed scripts must set `is_qa_sentinel: true`. Convention-based but forward-looking. Gate is fully operational. |
| Schema/code change | None (gate already in production code + tested) |
| Production DB change | SQL UPDATE on ~15 org rows |
| Risk | LOW — `is_qa_sentinel` is non-nullable with no FK or cascade implications |
| Reversibility | Easy — SQL UPDATE to false |
| Side effect | None. `is_qa_sentinel` is not read by authenticated routes (verified: grep returns only public projection services + unit tests). NC commerce QA flows are authenticated and do not pass through Gate E. |

**Key advantage:** Does NOT change `publication_posture` — the orgs retain their intended B2B_PUBLIC
classification for authenticated buyer-supplier catalog browse. The isolation is explicit and
classification-based, not posture-mutation-based.

---

### Option C — Separate QA/Production Supabase Project

**Description:** Maintain a dedicated Supabase project for all QA/test data. Production
Supabase project contains only real tenants.

**Implementation:** New Supabase project, dual `.env` configuration, QA-specific seed workflow.

**Trade-offs:**

| Criterion | Assessment |
|---|---|
| SR-1 (public isolation) | ✅ Complete isolation |
| SR-2 (admin hygiene) | ✅ Admin surface clean |
| SR-3 (sustainability) | ✅ Structural separation |
| Schema/code change | Significant — env switching, dual DB config, QA-only deploy workflow |
| Production DB change | QA data migration out of production |
| Risk | HIGH — dual-environment management overhead at TexQtic's current scale |
| Reversibility | Very difficult once established |
| Side effect | **Breaks production DB behavior testing for QA.** NC Phase 1 QA fixture verification requires QA data in the same DB as production feature flags, RLS policies, and Prisma-generated queries. Separating the DB would mean QA tests no longer validate production-DB behavior. |

**Verdict for TexQtic:** Not viable at current scale. Reject for all phases.

---

### Option D — Hybrid Short-Term: Posture Quarantine Now, `is_qa_sentinel` Long-Term

**Description:** In the short-term, close GAP-1 via B2B posture quarantine (Option A approach).
In a post-FAM-10 unit, activate Gate E via `is_qa_sentinel = true` updates (Option B approach)
and update seed scripts. Eventually deprecate slug-based hide list in favour of DB-enforced
classification.

**Trade-offs:**

| Criterion | Assessment |
|---|---|
| SR-1 (short-term) | ✅ GAP-1 closed by quarantine |
| SR-3 (long-term) | ✅ Gate E activated post-FAM-10 |
| Intermediate state | ❌ Two coexisting isolation mechanisms at the same time |
| Complexity | MODERATE — two separate governance units required |
| Side effect | Posture quarantine (step 1) mutates publication_posture; `is_qa_sentinel` update (step 2) does not undo the mutation; posture must be restored separately |

---

## 11. Recommended Short-Term Launch Policy

**Recommendation: Option B-minimal (activate Gate E via SQL UPDATE).**

### Rationale

1. **Gate E already exists and is tested.** Both projection services implement `is_qa_sentinel:
   false` in the Prisma where clause. Unit tests verify the gate. No code change is required.

2. **Option B does not mutate publication posture.** Option A (posture quarantine) changes
   `publication_posture = 'PRIVATE_OR_AUTH_ONLY'`, which alters the intended classification of the
   org. NC commerce QA authenticated flows that rely on `B2B_PUBLIC` posture for buyer-supplier
   catalog browse gates would be affected. Option B avoids this — `is_qa_sentinel` is read only by
   the unauthenticated public projection services and not by any authenticated tenant route.

3. **Data-only change — no schema migration required.** `is_qa_sentinel` already exists in the
   schema (`Boolean @default(false)`). A SQL UPDATE does not require `prisma migrate`. Standard
   sequence applies: `psql` update → `prisma db pull` → `prisma generate` → server restart.

4. **Single unified fix.** One SQL UPDATE covers all known QA orgs across all public surfaces (B2B
   discovery, B2B profile, B2C browse, B2C product detail). No need for separate quarantine units
   per surface.

### Minimum SQL scope for launch safety

At minimum, the following org slugs must have `is_qa_sentinel = true` set before launch to address
GAP-1 and GAP-4:

**Priority 1 — B2B PUBLIC-eligible QA suppliers (directly closes GAP-1):**
- `qa-knt-b` — QA Knitting Supplier B (PUBLICATION_ELIGIBLE + B2B_PUBLIC)
- `qa-dye-c` — QA Dyeing Supplier C (PUBLICATION_ELIGIBLE + B2B_PUBLIC)
- `qa-gmt-d` — QA Garment Supplier D (PUBLICATION_ELIGIBLE + B2B_PUBLIC)

**Priority 2 — `qa-b2b` (closes GAP-4 if `assign-b2b-public-posture.ts` was run):**
- `qa-b2b` — Core B2B QA tenant (posture state unknown without live DB check)

**Priority 3 — Comprehensive QA org coverage (closes GAP-2, provides future safety):**
- All remaining QA orgs from seed.ts (`qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`)
- All multi-segment buyers and service orgs (`qa-buyer-a`, `qa-buyer-c`, `qa-svc-tst-a`, `qa-svc-log-b`)
- NC Phase 1 fixtures (`qa-nc-pool-a`, `qa-nc-sup-a`)

**Note on `qa-b2c`:** The B2C quarantine (Gate B closed via `publication_posture` mutation) is
still in effect. Setting `is_qa_sentinel = true` for `qa-b2c` provides additional defense-in-depth
and is harmless — Gate E will also exclude it even if the posture mutation is ever reversed.

**Note on ops/verify tenants** (`shraddha-industries`, `acme-corp-live-verify`, `ops-casework-*`):
These require Paresh's classification decision. If they are intended to remain as internal
verification records and not appear on public surfaces, they should also receive
`is_qa_sentinel = true`. If they are intended as real or semi-real tenants (e.g., for live
verification), their `publication_posture` should be confirmed as `PRIVATE_OR_AUTH_ONLY` to
ensure Gate B excludes them without needing the sentinel flag.

### Pre-conditions for the SQL UPDATE prompt

Before the `is_qa_sentinel` SQL UPDATE prompt can execute:
1. Paresh confirms the org slug list (Priority 1 is fixed; Priority 2 contingent on live DB check;
   Priority 3 is advisory)
2. The Paresh-driven live DB check (Steps P1–P4 from FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001)
   is ideally complete or run in parallel — it will reveal `qa-b2b` posture state

### Implementation sequence (for the follow-on prompt)

```
1. (Paresh) Confirm org slug list for is_qa_sentinel = true update
2. (Paresh) Run read-only DB check: SELECT slug, publication_posture, is_qa_sentinel FROM organizations WHERE slug LIKE 'qa-%';
3. (Agent) SQL UPDATE via psql: UPDATE organizations SET is_qa_sentinel = true WHERE slug IN ('<confirmed slug list>');
4. (Agent) Verify: SELECT slug, is_qa_sentinel FROM organizations WHERE is_qa_sentinel = true;
5. (Agent) pnpm -C server exec prisma db pull  (verify no schema drift)
6. (Agent) pnpm -C server exec prisma generate
7. (Agent) Server restart + health check
8. (Agent) Verify public B2B browse: curl GET /api/public/suppliers/b2b → items[] should be empty (QA suppliers excluded)
```

---

## 12. Recommended Long-Term Architecture

The long-term architecture requires no new mechanisms — it requires properly activating and
maintaining the existing `is_qa_sentinel` mechanism.

### Three-layer model (post-launch)

**Layer 1 — DB-Enforced QA Classification (`is_qa_sentinel`)**

All QA/test/internal org records have `is_qa_sentinel = true`. This is set:
- In all seed and fixture scripts at org creation time (seed convention)
- Via admin tooling for ad-hoc test tenant creation post-launch

This single flag, enforced via Gate E in both public projection services, provides durable
public-surface isolation for all QA orgs — current and future — without requiring code deploys.

**Layer 2 — Control-Plane Admin Surface (existing slug list, simplified over time)**

The approved-hide slug list in `controlPlaneTenantReadExclusions.ts` can be gradually deprecated
over time. Post-launch, when new test tenants need to be hidden from the admin list, the control-plane
listing should be updated to also filter on `is_qa_sentinel = true`. This would:
- Remove the need to maintain a growing hardcoded slug list
- Allow the control-plane to automatically hide all `is_qa_sentinel = true` orgs from the
  launch-facing tenant list

This control-plane source change is deferred — it is NOT required for launch.

**Layer 3 — Seed Convention Documentation**

A single-paragraph convention should be added to `AGENTS.md` or a dedicated seed documentation
file: "All QA and test organization records must be created with `is_qa_sentinel = true`. This
flag is enforced by Gate E in all public projection services and prevents test data from appearing
on unauthenticated public-facing routes."

### What does NOT need to change

- The five-gate projection model — it is correctly designed
- The `is_qa_sentinel` field in the schema — it exists, the type is correct
- Gate E logic in both services — it is correctly implemented and tested
- The control-plane approved-hide list — it serves its purpose for now; deprecation is post-launch

---

## 13. Impact on FAM-10 Production Verification

The FAM-10 verify-close prompt exercises four control-plane fixture groups (F1–F4). All four
use authenticated admin routes. The QA data leakage gap (GAP-1) does not affect these
verification procedures.

### Per-fixture impact assessment

| Fixture | Route exercised | Is it a public route? | Impact from GAP-1 |
|---|---|---|---|
| F1 (archive) | `POST /api/control/tenants/:id/archive` | No — admin auth | None |
| F2 (outcome) | `POST /api/control/tenants/:id/onboarding/outcome` | No — admin auth | None |
| F3 (activation) | `POST /api/control/tenants/:id/onboarding/activate-approved` | No — admin auth | None |
| F4 (impersonation) | `POST /api/admin/impersonation/start` | No — admin auth | None |

### Sequencing recommendation

The `is_qa_sentinel` SQL UPDATE prompt is NOT a prerequisite for FAM-10 verify-close. FAM-10 can
proceed in parallel or sequentially. Recommended sequence:

1. **Parallel or prior:** Paresh runs live DB checks (Steps P1–P4 from FAM-10 data prep artifact)
   to confirm fixture readiness for F1, F2, F4
2. **FAM-10 verify-close:** Execute FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001
   once fixtures are confirmed
3. **Post-FAM-10 (or parallel):** Execute `is_qa_sentinel` SQL UPDATE for Priority 1–3 org slugs
4. **Long-term:** Update seed scripts to include `is_qa_sentinel: true` in all QA org creation

The `is_qa_sentinel` fix is a launch-blocking item that should be completed before the platform is
opened to real users — but it does not block FAM-10 admin verification.

---

## 14. Recommended Next Prompt

**Recommended: `TEXQTIC-QA-ORG-SENTINEL-FLAG-ACTIVATION-001`**

**Scope:** Data-only SQL UPDATE to set `is_qa_sentinel = true` for all known QA org slugs in
production. Uses existing Gate E mechanism. No schema change, no migration, no source code edit.

**Precondition:** Paresh has confirmed the org slug list (Priority 1 is required; Priority 2 is
confirmed via live DB check; Priority 3 is advisory).

**Allowed files:** None (data-only change via `psql`). Only allowed change is:
`UPDATE organizations SET is_qa_sentinel = true WHERE slug IN (...);` via `psql` using
`DATABASE_URL`.

**Evidence required:**
- Pre-change: `SELECT slug, is_qa_sentinel FROM organizations WHERE slug LIKE 'qa-%';`
- Post-change: Same query, all rows show `is_qa_sentinel = true`
- Production verify: `GET /api/public/suppliers/b2b` returns `{ items: [], total: 0 }`
- tsc + prisma validate unchanged (no schema drift)

**Alternative (if preconditions for B option are not met):** Execute a B2B posture quarantine
analogous to `TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001` — SQL UPDATE
`publication_posture = 'PRIVATE_OR_AUTH_ONLY'` for `qa-knt-b`, `qa-dye-c`, `qa-gmt-d`. This is
Option A and closes GAP-1 immediately with zero code change risk. It does not close GAP-2.

---

## 15. Non-Implementation Statement

This artifact is a **design audit and gap analysis only**. No source files have been created,
edited, or deleted as part of producing this document. No schema changes, no Prisma operations,
no seed script changes, no config file changes, no `.env` changes, and no SQL has been executed.

The following files were read (not edited):
- `server/prisma/schema.prisma`
- `server/src/config/controlPlaneTenantReadExclusions.ts`
- `server/src/routes/control.ts` (relevant sections)
- `server/src/routes/public.ts` (header section)
- `server/src/services/publicB2BProjection.service.ts`
- `server/src/services/publicB2CProjection.service.ts`
- `server/scripts/qa/current-db-multi-segment-qa-seed.ts`
- `server/scripts/qa/nc-phase1-qa-fixture-baseline.ts`
- `server/prisma/seed.ts`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/OPEN-SET.md`
- `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md`
- `governance/units/TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001.md`
- `artifacts/control-plane/FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001.md`

---

## 16. Safety Confirmation

| Check | Result |
|---|---|
| Files staged | None — audit artifact only |
| Source files modified | None |
| Schema files modified | None |
| Migration files modified | None |
| .env files modified | None |
| Feature flags changed | None |
| DB writes executed | None |
| Secrets exposed | None |
| Layer 0 files modified | None — `NEXT-ACTION.md`, `BLOCKED.md`, `OPEN-SET.md` were read only |
| `LAUNCH-FAMILY-INDEX.md` modified | No |
| `FUTURE-TODO-REGISTER.md` modified | No |
| FAM-10 status advanced | No — remains NOT_ASSESSED |
| org_id tenancy isolation weakened | Not applicable — no implementation |

---

## 17. Final Enum

```
TEXQTIC_TEST_DATA_VISIBILITY_AND_ISOLATION_DESIGN_AUDIT_COMPLETE
```

**Key findings summary:**
- **GAP-1 [CRITICAL]:** `qa-knt-b`, `qa-dye-c`, `qa-gmt-d` will appear in public B2B supplier
  directory at launch. The approved-hide config list does NOT protect public projection routes.
- **GAP-2 [STRUCTURAL]:** `is_qa_sentinel = true` has never been set for any QA org. Gate E is
  dormant but correctly implemented.
- **Recommended fix:** Option B-minimal — SQL UPDATE `is_qa_sentinel = true` for known QA orgs.
  No code change. Uses existing Gate E. Does not mutate `publication_posture`.
- **FAM-10 impact:** None — FAM-10 verify-close exercises admin-authenticated routes only and is
  not blocked by the public-surface gap.
- **Next prompt:** `TEXQTIC-QA-ORG-SENTINEL-FLAG-ACTIVATION-001`
