# FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001

**Document type:** Fixture discovery and data preparation report  
**Task ID:** FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001  
**Parent artifact:** `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001.md`  
**Created:** 2026-07-06  
**Author:** GitHub Copilot (read-only discovery pass; no mutations performed)  
**Status:** FIXTURES_PARTIAL_MISSING — Paresh confirmation and live API read required before proceeding to verify-close  

---

## 1. Purpose

This artifact resolves the fixture gate blocker that halted
`FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001`. That prompt
required four named data fixtures (archive, outcome, activation, impersonation)
to be fully specified before execution. All four groups were blank placeholders;
the agent correctly stopped with enum
`FAM_10_PLATFORM_OPS_CONTROL_PLANE_PRODUCTION_VERIFY_BLOCKED_BY_MISSING_DATA_FIXTURES`.

This document records:
- which source files were inspected
- what fixture candidates were found (or not found)
- what Paresh must confirm via a brief read-only API/UI session
- what decisions are required before the verify-close prompt can proceed

No mutations, no tenant creation, no DB writes were performed during this
analysis. This is a read-only governance discovery document.

---

## 2. Prior Blocker Summary

| Item | Detail |
|---|---|
| Blocked prompt | `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001` |
| Blocker enum | `FAM_10_PLATFORM_OPS_CONTROL_PLANE_PRODUCTION_VERIFY_BLOCKED_BY_MISSING_DATA_FIXTURES` |
| Blocker reason | All four fixture groups in the verify-close prompt had blank placeholder values |
| Gate requirement | All four fixtures must be fully resolved (slug, orgId/userId, confirmed status) before execution |
| FAM-10 status | NOT_ASSESSED — unchanged |

---

## 3. Inputs Inspected (Read-Only)

The following files were read during this discovery pass:

| File | Purpose |
|---|---|
| `server/prisma/seed.ts` | Canonical QA tenant definitions, org status values |
| `server/scripts/qa/current-db-multi-segment-qa-seed.ts` | Multi-segment QA tenants (Slice C-ALT + Slice F) |
| `server/scripts/qa/nc-phase1-qa-fixture-baseline.ts` | NC Phase 1 QA tenants (qa-nc-pool-a, qa-nc-sup-a) |
| `server/src/config/controlPlaneTenantReadExclusions.ts` | Approved-hide list (44 slugs) and preserved-no-delete list (16 slugs) |
| `server/prisma/schema.prisma` (lines 1060–1080) | `organizations.status` field — VARCHAR(30) with SQL check constraint |
| `server/src/routes/control.ts` (prior session — fully read) | Archive and onboarding routes; protectedTenantArchiveSlugs |
| `server/src/routes/admin/impersonation.ts` (prior session — fully read) | Impersonation routes; startBodySchema (orgId + userId + reason) |
| `governance/control/OPEN-SET.md` | Layer 0 current posture; confirms no FAM-10 lock changes |

No live API calls were made. No DB reads were made. All findings are derived
from static source code and seed scripts only. Actual runtime state of tenants
in the production Supabase DB is unknown and must be confirmed by Paresh.

---

## 4. OrgStatus Legal Values (Schema Authority)

`organizations.status` is a `VARCHAR(30)` enforced by SQL check constraint
(not a Prisma enum). Legal values per schema comment (line 1064–1065):

```
ACTIVE
SUSPENDED
CLOSED
PENDING_VERIFICATION
VERIFICATION_APPROVED
VERIFICATION_REJECTED
VERIFICATION_NEEDS_MORE_INFO
```

The QA seed type `QaOrganizationStatus` in `server/prisma/seed.ts` only
declares `'ACTIVE' | 'PENDING_VERIFICATION'`. No seeded tenant is ever placed
in `VERIFICATION_APPROVED`, `VERIFICATION_REJECTED`, or
`VERIFICATION_NEEDS_MORE_INFO` by any seed script.

---

## 5. Forbidden Target Inventory (Authoritative)

### 5.1 API-Level Archive Guard — `protectedTenantArchiveSlugs`

From `server/src/routes/control.ts` lines 255–264 and 264–266:

```
protectedTenantArchiveSlugs = [
  'qa-b2b', 'qa-b2c', 'qa-wl', 'qa-agg', 'qa-pend', 'white-label-co'
]
protectedTenantArchiveNames = ['WHITE LABEL CO']
```

Any `POST /tenants/:id/archive` call with these slug/name values is blocked at
the server level with a 409 response. They are _absolutely_ forbidden for
archive verification regardless of any other consideration.

### 5.2 Preserved-No-Delete Slugs — Config Authority

From `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS` (16 total):

```
test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-24aa7ecb
test-tenant-f527b7d2-62e5-4593-92c3-69a807a99c0d-97b96136
test-tenant-wave2-1774063117878
qa-b2b  qa-b2c  qa-wl  qa-agg  qa-pend  white-label-co
wl-verify-s1-20260328-0510  wl-verify-s1-20260328-0445  wl-verify-s1-20260328-0440
shraddha-industries  acme-corp-live-verify
ops-casework-seller-681cd6f6  ops-casework-buyer-e13b66cb
```

These must never be archived, deleted, or have their state mutated without
separate explicit Paresh authorization.

### 5.3 Additional Named Forbidden Targets (Planning Artifact §7.1)

From `artifacts/control-plane/FAM-10-PLATFORM-OPS-CONTROL-PLANE-VERIFICATION-PLANNING-001.md` §7.1:

- `qa-b2b.enterprise@texqtic.com` enterprise variant tenant
- `white-label-co` (also in API guard and preserved list)
- Any production customer tenant (any non-QA, non-test-prefix slug)

---

## 6. Fixture Requirements (From Planning Artifact §7.2)

| Fixture | Label | Required state | Usage in verify-close |
|---|---|---|---|
| F1 | Archive candidate | Any non-protected, non-production tenant with ACTIVE or SUSPENDED org status | Step A: `POST /tenants/:id/archive` |
| F2 | Outcome candidate | `organizations.status = PENDING_VERIFICATION`; non-protected | Step D: `POST /tenants/:id/onboarding/outcome` (outcome=APPROVED) |
| F3 | Activation candidate | `organizations.status = VERIFICATION_APPROVED`; non-protected | Step E: `POST /tenants/:id/onboarding/activate-approved` |
| F4 | Impersonation candidate | ACTIVE org + QA owner user + confirmed membership; non-protected | Step F: `POST /admin/impersonation/start`, then `POST /admin/impersonation/stop` |

> **Note on F2 + F3 dependency:** F3 is functionally dependent on F2. The
> verify-close Steps D → E form a compound flow: Step D advances F2 from
> PENDING_VERIFICATION → VERIFICATION_APPROVED (satisfying the required
> pre-condition for F3), then Step E activates the now-VERIFICATION_APPROVED
> org. The planning artifact §8 refers to this as the D→E compound flow.
> If a separate pre-staged VERIFICATION_APPROVED tenant exists in production,
> Step E can target it directly. But from static analysis, no such tenant was
> seeded — the D→E compound flow is the recommended path.

---

## 7. Fixture Discovery Findings

### 7.1 Fixture F1 — Archive Candidate

**Discovery method:** `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS` list (44 entries)

**Candidate class confirmed:** Yes — UUID-based test tenants exist in this list.
These slugs are hidden from the launch-facing tenant list, implying they exist in
the production DB (the list has no effect on non-existent records).

**None** of these 44 slugs appear in `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS`.  
**None** match the API-level `protectedTenantArchiveSlugs`.

**Representative slug candidates (all UUID-based, purpose-specific test tenants):**

| Slug | Known purpose |
|---|---|
| `test-tenant-nll-other-f333d3c9-7cc7995d` | NLL route test (other-side) |
| `test-tenant-ni-route-other-201518c0` | NI route test (other-side) |
| `test-tenant-rfq-read-other-094d5dde` | RFQ read-side test |
| `test-tenant-award-route-supplier-e77ec63d` | Award route supplier test |
| `test-tenant-92693230-db1b-464b-be30-27001e6f1075-1daa4fbc` | Batch UUID test tenant |
| `test-tenant-365daeb5-1236-4129-85b5-76fa2c7c8233-f678ad58` | Batch UUID test tenant |

Any one of these is a viable F1 candidate provided:
- Its current `organizations.status` is ACTIVE or SUSPENDED (not already CLOSED)
- Paresh confirms it is expendable (not load-bearing for any active test suite)

**Status of specific slugs:** UNKNOWN — static source only; requires live DB read.

**Special note:** `activation-verify-2026-04-02-org-status-close-gate-exec` and
`activation-verify-2026-04-01-deep-dive-exec` are in the approved-hide list. If
their org status is ACTIVE (post-activation from prior verification run), they
are expendable F1 candidates with the added benefit that no active test suite
depends on them.

**F1 assessment: CANDIDATE_CLASS_IDENTIFIED — specific slug + UUID requires Paresh confirmation via live read.**

---

### 7.2 Fixture F2 — Outcome Candidate (PENDING_VERIFICATION)

**Discovery method:** All QA seed scripts and schema analysis.

**Primary finding — `qa-pend` (slug: `qa-pend`):**
- Seeded with `organizationStatus: 'PENDING_VERIFICATION'` in `server/prisma/seed.ts` line 213
- Confirmed FORBIDDEN: in both `protectedTenantArchiveSlugs` AND `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS`
- **Cannot be used as F2 under any circumstances.**

**Secondary candidate — `test-tenant-email-verification-1779163982162`:**
- Present in `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS`
- Not in preserved-no-delete list
- Not in API archive guard list
- Name strongly suggests it was created for email-verification / tenant-provision flow testing
- The tenant-provision flow creates tenants with `organizations.status = PENDING_VERIFICATION` as the initial state
- **If this tenant was created via the provision endpoint and was never progressed through outcome recording, its org status may still be `PENDING_VERIFICATION`**
- This is the primary live candidate to verify

**All 7 multi-segment QA tenants** (`qa-knt-b`, `qa-dye-c`, `qa-gmt-d`, `qa-buyer-a`, `qa-buyer-c`, `qa-svc-tst-a`, `qa-svc-log-b`): seeded with `status: 'ACTIVE'` — ruled out as F2.

**All NC phase 1 QA tenants** (`qa-nc-pool-a`, `qa-nc-sup-a`): seeded with `status: 'ACTIVE'` — ruled out as F2.

**F2 assessment: UNCERTAIN — `test-tenant-email-verification-1779163982162` is the primary live candidate.  
If its org status is PENDING_VERIFICATION → F2 FOUND. If not → F2 MISSING.**  
**If MISSING: a new PENDING_VERIFICATION test tenant must be created via the provision endpoint,  
which requires separate prompt authorization (`FAM-10-PRODUCTION-VERIFY-DATA-SEEDING-AUTHORIZATION-001`).**

---

### 7.3 Fixture F3 — Activation Candidate (VERIFICATION_APPROVED)

**Discovery method:** All QA seed scripts and schema analysis.

**Primary finding:** No QA seed script has ever created a tenant with
`organizations.status = 'VERIFICATION_APPROVED'`. The `QaOrganizationStatus`
typedef in `server/prisma/seed.ts` line 15 only declares:
```typescript
type QaOrganizationStatus = 'ACTIVE' | 'PENDING_VERIFICATION';
```
`VERIFICATION_APPROVED` is unreachable from any seed or provision entry point
without first recording `outcome = 'APPROVED'` on a `PENDING_VERIFICATION` org.

**Route confirmation:** `POST /tenants/:id/onboarding/activate-approved` requires
`organizations.status = VERIFICATION_APPROVED` at call time (line ~340 of
`server/src/routes/control.ts`). Any other status → 409 response.

**Recommended path — D→E compound flow:**
1. Step D: call `POST /tenants/[F2-orgId]/onboarding/outcome` with `{ outcome: 'APPROVED' }`  
   This transitions F2's org status: `PENDING_VERIFICATION → VERIFICATION_APPROVED`
2. Step E: immediately call `POST /tenants/[F2-orgId]/onboarding/activate-approved` (no body)  
   This transitions: `VERIFICATION_APPROVED → ACTIVE` (org and tenant both)  

Under the compound flow, F3 does not require a separate pre-staged tenant. It
reuses the F2 tenant at the intermediate VERIFICATION_APPROVED state between
Steps D and E. The verify-close prompt's Step E therefore targets the **same
slug/orgId as Step D**.

**F3 assessment: NO STANDALONE FIXTURE — D→E compound flow is the correct path.  
F3 is resolved by the sequence, not by a separate pre-staged tenant.  
F3 dependency: F2 must be confirmed first.**

---

### 7.4 Fixture F4 — Impersonation Candidate (ACTIVE org + QA user)

**Discovery method:** Multi-segment QA seed script (`current-db-multi-segment-qa-seed.ts`).

**Candidate class confirmed:** Yes — all 7 multi-segment QA tenants are seeded
with `organizations.status = 'ACTIVE'` and each has a named owner user.

**None** of these slugs appear in:
- `protectedTenantArchiveSlugs`
- `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_PRESERVED_NO_DELETE_SLUGS`
- The API archive guard

**Preferred candidates:**

| Slug | Owner identity (class only — not recorded verbatim per secrets policy) | Org type |
|---|---|---|
| `qa-knt-b` | QA supplier owner (knitting segment) | B2B |
| `qa-buyer-a` | QA buyer owner (weaving segment, AE jurisdiction) | B2B |
| `qa-svc-tst-a` | QA service/testing lab owner (IN jurisdiction) | B2B |

The impersonation API body requires:
```json
{
  "orgId": "<UUID>",
  "userId": "<UUID>",
  "reason": "<string, min 10 chars>"
}
```

The `orgId` equals the `tenantId` (shared UUID pattern). The `userId` is the
owner user's UUID (linked via `memberships` table).

**UUIDs of all multi-segment QA tenants:** UNKNOWN from static analysis —
no UUID is hardcoded in the seed script; all are generated via `upsert` at
runtime. Confirmed via live API/DB read required.

**F4 assessment: CANDIDATE_CLASS_IDENTIFIED — specific orgId + userId require  
Paresh confirmation via a brief live read-only API/DB session.**

---

## 8. Fixture Readiness Summary

| Fixture | Label | Assessment | Gate to unblock |
|---|---|---|---|
| F1 | Archive candidate | CANDIDATE_CLASS_IDENTIFIED | Paresh reads control plane; confirms one UUID-based test tenant (slug from approved-hide list) is expendable and its org status is ACTIVE/SUSPENDED; provides slug |
| F2 | Outcome candidate | UNCERTAIN | Paresh reads org status of `test-tenant-email-verification-1779163982162`; if PENDING_VERIFICATION → F2 FOUND; if not → F2 MISSING → requires seeding authorization |
| F3 | Activation candidate | D→E COMPOUND — NO STANDALONE FIXTURE | F2 confirmed; verify-close Steps D → E use same org; F3 resolved by sequence |
| F4 | Impersonation candidate | CANDIDATE_CLASS_IDENTIFIED | Paresh reads orgId + userId for one multi-segment QA tenant (recommend qa-knt-b) |

---

## 9. Recommended Paresh Action Sequence (Read-Only Session)

This sequence requires only a read-only login to the control plane admin UI or
a single authenticated `GET` call. **No mutations.** The goal is to populate
the fixture values required by the verify-close prompt.

### Step P1 — Identify F1 Archive Candidate

Browse the control plane tenant list (or call `GET /api/control/tenants`).
Look for one of the UUID-based test tenants from the approved-hide list.
Preferred candidates: `activation-verify-2026-04-02-org-status-close-gate-exec`
or any `test-tenant-92693230-*` slug.

Confirm:
- [ ] Slug is not in the preserved-no-delete list (all UUID-based slugs pass)
- [ ] Current `organizations.status` is `ACTIVE` or `SUSPENDED` (not already CLOSED)
- [ ] You are comfortable the tenant is expendable (not needed by active test suites)
- [ ] Record: **slug**, **orgId (UUID)**, **current status**

### Step P2 — Resolve F2 Outcome Candidate

Check the org status of `test-tenant-email-verification-1779163982162`.

- If `organizations.status = PENDING_VERIFICATION` → **F2 FOUND**
  - Record: **slug** = `test-tenant-email-verification-1779163982162`, **orgId (UUID)**, **status = PENDING_VERIFICATION**
  - F3 will be resolved via D→E compound flow using the same orgId

- If `organizations.status ≠ PENDING_VERIFICATION` (e.g., ACTIVE, CLOSED) → **F2 MISSING**
  - Browse for any other non-protected tenant with `organizations.status = PENDING_VERIFICATION`
  - If none found → F2 is MISSING; stop here and open
    `FAM-10-PRODUCTION-VERIFY-DATA-SEEDING-AUTHORIZATION-001` before proceeding

### Step P3 — Identify F4 Impersonation Candidate

For one of the multi-segment QA tenants (recommend `qa-knt-b`):
- Read the tenant detail from the control plane (or `GET /api/control/tenants/:id`)
- Read the org member list (or `GET /api/control/tenants/:id/members`)
- Record: **orgId (UUID)**, **userId (UUID)** of the owner member

### Step P4 — Record Fixture Matrix

Fill in all four rows of the fixture matrix for the verify-close prompt:

```
F1_ARCHIVE_SLUG=...
F1_ARCHIVE_ORG_ID=...
F1_ARCHIVE_STATUS=...

F2_OUTCOME_SLUG=test-tenant-email-verification-1779163982162  (if confirmed)
F2_OUTCOME_ORG_ID=...
F2_OUTCOME_STATUS=PENDING_VERIFICATION

F3_ACTIVATION_NOTE=D_TO_E_COMPOUND_FLOW  (same orgId as F2)
F3_ACTIVATION_ORG_ID=[same as F2_OUTCOME_ORG_ID]

F4_IMPERSONATION_ORG_SLUG=qa-knt-b
F4_IMPERSONATION_ORG_ID=...
F4_IMPERSONATION_USER_ID=...
```

---

## 10. Paresh Confirmation Checklist (Required Before Verify-Close Submission)

Before submitting `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001`
with populated fixtures, Paresh must confirm each of the following:

**F1 — Archive candidate:**
- [ ] Slug selected from approved-hide list (one of the 44 UUID-based test tenants)
- [ ] Slug NOT in preserved-no-delete list
- [ ] Current org status = ACTIVE or SUSPENDED (confirmed via live read)
- [ ] Tenant is expendable (not needed by active CI/E2E test suites)
- [ ] orgId (UUID) recorded

**F2 — Outcome candidate:**
- [ ] `test-tenant-email-verification-1779163982162` org status confirmed PENDING_VERIFICATION
  OR another non-protected PENDING_VERIFICATION tenant identified
- [ ] Slug NOT in any forbidden list
- [ ] orgId (UUID) recorded

**F3 — Activation candidate:**
- [ ] D→E compound flow authorized (no standalone fixture; Steps D and E target same orgId as F2)
- [ ] Understood: after Step E, F2's tenant will be in ACTIVE state (permanent, non-reversible without a separate archive/close operation)

**F4 — Impersonation candidate:**
- [ ] orgId (UUID) confirmed for chosen multi-segment QA tenant
- [ ] userId (UUID) confirmed for the owner member of that org
- [ ] Org status = ACTIVE (confirmed via live read)
- [ ] Tenant NOT in any forbidden list (all multi-segment QA tenants pass this check)

---

## 11. If F2 Is Not Found — Seeding Authorization Path

If no PENDING_VERIFICATION tenant is found in the production DB (Step P2 yields
nothing), the only path to F2 is creating one via the tenant provision endpoint
(`POST /api/tenants/provision` or equivalent). This is a mutation and requires:

1. A separate Paresh-authorized prompt:
   **`FAM-10-PRODUCTION-VERIFY-DATA-SEEDING-AUTHORIZATION-001`**
2. That prompt must:
   - Specify the test tenant slug (e.g., `test-tenant-fam10-verify-[timestamp]`)
   - Confirm the slug is added to `CONTROL_PLANE_TENANT_READ_SIDE_HIDE_APPROVED_SLUGS` before launch
   - Provision the tenant via a QA-scoped API call (not a seed script)
   - Confirm the resulting orgId
3. Only after the seeding prompt completes successfully can the verify-close prompt proceed

Do not proceed to verify-close if F2 is MISSING without explicit Paresh decision
on which path to take.

---

## 12. Non-Mutation Statement

No implementation actions were taken during this analysis. Specifically:
- No tenant was created
- No org status was changed
- No user was created or invited
- No DB writes of any kind were performed
- No `.env` or secrets were read or printed
- No API calls were made to the production server
- No Prisma commands were run
- No files outside this artifact were modified

All findings are based solely on static source code reading via read-only tools.

---

## 13. Secrets Redaction Confirmation

- No email addresses are recorded verbatim in this document (referenced only by role/class)
- No JWTs, passwords, tokens, or API keys are present
- No connection strings or DB URLs are present
- Owner user identities are referenced by role label only (e.g., "QA supplier owner")
- UUIDs of QA tenants and users are NOT recorded (they were not found in static source and must be gathered via live read by Paresh)

---

## 14. Governance Safety Confirmation

| Guard | Status |
|---|---|
| `LAUNCH-FAMILY-INDEX.md` | NOT EDITED — this document does not advance FAM-10 status |
| `FUTURE-TODO-REGISTER.md` | NOT EDITED |
| FAM-10 governance status | NOT_ASSESSED — unchanged |
| Layer 0 posture | Read-only; no change |
| Allowlist compliance | Only `artifacts/control-plane/FAM-10-PRODUCTION-VERIFY-DATA-PREPARATION-001.md` created |

---

## 15. Recommended Next Prompt

**If all 4 fixtures are confirmed by Paresh:**

```
FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001 (retry)
```
with the fixture matrix fully populated using the values gathered in Steps P1–P4.

**If F2 is MISSING:**

```
FAM-10-PRODUCTION-VERIFY-DATA-SEEDING-AUTHORIZATION-001
```
to create a minimal PENDING_VERIFICATION test tenant for use as F2.

---

## 16. Final Enum

```
FAM_10_PRODUCTION_VERIFY_DATA_PREPARATION_FIXTURES_PARTIAL_MISSING
```

**Reason:** F1 and F4 candidate classes are confirmed via static analysis but
specific UUIDs require Paresh live-read confirmation. F2 has one speculative live
candidate (`test-tenant-email-verification-1779163982162`) that cannot be
confirmed without a live DB/API read. F3 has no standalone fixture (resolved via
D→E compound flow from F2). Until Paresh completes Steps P1–P4 and all
checklist items in §10 are confirmed, the verify-close prompt must not proceed.
