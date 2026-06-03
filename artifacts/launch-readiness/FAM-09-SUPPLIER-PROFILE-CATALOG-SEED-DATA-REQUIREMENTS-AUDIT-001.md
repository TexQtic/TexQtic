# FAM-09-SUPPLIER-PROFILE-CATALOG-SEED-DATA-REQUIREMENTS-AUDIT-001

## 1. Unit Summary

| Field | Value |
|---|---|
| Unit ID | FAM-09-SUPPLIER-PROFILE-CATALOG-SEED-DATA-REQUIREMENTS-AUDIT-001 |
| Family | FAM-09 (Supplier Profile & Catalog) |
| Type | Investigation + design — read-only repo audit with one artifact output |
| Branch | main |
| HEAD at execution start | 88c9205b |
| Date | 2026-06-05 |
| Agent | GitHub Copilot |
| Authorized write | `artifacts/launch-readiness/FAM-09-SUPPLIER-PROFILE-CATALOG-SEED-DATA-REQUIREMENTS-AUDIT-001.md` |
| All other files | READ-ONLY — no source, test, schema, migration, or governance tracker modified |

---

## 2. Why the Prior Operator-Slug Prompt Was Invalid for Pre-Launch Conditions

Unit `FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002` required the operator (Paresh) to provide:
- OD-01: real supplier slug
- OD-02: confirmed `org.org_type = 'B2B'`
- OD-03: confirmed `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')`
- OD-04: confirmed `org.is_qa_sentinel = false`
- OD-05: confirmed `GET /api/public/b2b/suppliers` returns `total > 0`

This was **invalid for pre-launch conditions** because:

1. No real B2B supplier has been onboarded through the public projection gates yet. The platform is pre-launch.
2. All existing QA orgs (`qa-b2b`, `qa-knt-b`, `qa-dye-c`, `qa-gmt-d`, and others) have `is_qa_sentinel = true` (set by `TTP-QA-SENTINEL-FLAG-IMPL-001`, commit `c6e24eaa`, status `TRUTH_SYNCED`). Gate E (`is_qa_sentinel = false`) structurally excludes every QA org from public projection.
3. The `assign-b2b-public-posture.ts` script targets slug `qa-b2b`, which is `is_qa_sentinel = true`. Even if run, the posture update would succeed at the DB level, but `qa-b2b` would still be excluded from `GET /api/public/b2b/suppliers` by Gate E. The script cannot satisfy OD-05.
4. The corrected pre-launch path: audit the repo for what minimum seed data is required to make FAM-09 runtime verification possible, and design a launch-test supplier data unit — without requiring real operator-provided supplier evidence.

---

## 3. Preflight Results

| Check | Command | Result |
|---|---|---|
| Working tree clean | `git status --short` | CLEAN — no output |
| HEAD at anchor | `git rev-parse --short HEAD` | `88c9205b` |
| Ancestry check | `git merge-base --is-ancestor 88c9205b HEAD` | Exit 0 — in ancestry |
| FAM-07 dir absent | `Test-Path -LiteralPath "governance/legal/fam-07"` | `False` — ABSENT |
| FAM-07 json absent | `Test-Path -LiteralPath "governance/legal/fam-07/supplier-onboarding-terms-authority.json"` | `False` — ABSENT |
| Handoff artifact present | `Test-Path -LiteralPath "artifacts/launch-readiness/FAM-09-SUPPLIER-PROFILE-CATALOG-OPERATOR-DATA-TASK-HANDOFF-001.md"` | `True` — PRESENT |

**Preflight status: PASS**

---

## 4. Working Tree Status

**CLEAN.** No uncommitted changes as of preflight. All changes in this unit are confined to this single artifact file.

---

## 5. Files Inspected

### Primary service and script files

| File | Lines read | Purpose |
|---|---|---|
| `server/src/services/publicB2BProjection.service.ts` | 1–340 | Five-gate logic, query predicates, output shape |
| `server/scripts/assign-b2b-public-posture.ts` | 1–220 | Posture assignment pattern reference |
| `server/prisma/schema.prisma` | 11–60, 343–400, 918–1030, 1055–1145 | Tenant, CatalogItem, Certification, TraceabilityNode, organizations models |
| `server/prisma/seed.ts` | 1–250 | QA tenant specs — all QA-prefixed |
| `server/scripts/qa/current-db-multi-segment-qa-seed.ts` | 1–160 | Multi-segment QA seed specs |

### Config files

| File | Lines read | Purpose |
|---|---|---|
| `config/publicReferenceB2B.ts` | 1–100 | Reference preview supplier definitions (frontend-only) |

### Governance files inspected

| File | Relevance |
|---|---|
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | HD-001, HD-002, BS-001 — production data gap confirmed |
| `CONTROL-PLANE-TEST-TENANT-CLEANUP-INVENTORY-DECISION-001.md` | `shraddha-industries` classification |
| `governance/units/HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001.md` | `shraddha-industries` provisioning status |

### Search terms used

`is_qa_sentinel`, `publication_posture`, `publicEligibilityPosture`, `PUBLICATION_ELIGIBLE`, `B2B_PUBLIC`, `CatalogItem`, `launch.test`, `lt-b2b`, `LAUNCH_TEST`, `Surat`, `SHRADDHA`, `assign-b2b-public-posture`, `reference supplier`, `seed supplier`, `PublicReferenceB2B`, `publicReferenceB2B`

---

## 6. Current FAM-09 Blocked State

Production endpoint `GET /api/public/b2b/suppliers` returns `{ items: [], total: 0 }`.

Root cause: No org simultaneously satisfies all five gates.

| Gate | Condition | Current state |
|---|---|---|
| A | `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` | All QA orgs have `NO_PUBLIC_PRESENCE`. `shraddha-industries` has `NO_PUBLIC_PRESENCE` (default, not yet set). |
| B | `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')` | All QA orgs have `PRIVATE_OR_AUTH_ONLY`. `shraddha-industries` has `PRIVATE_OR_AUTH_ONLY` (default, not yet set). |
| C | `org.org_type = 'B2B'` | `qa-b2b` is B2B. `shraddha-industries` is B2B (provisioned via invite flow). |
| D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` | `qa-b2b` is ACTIVE. `shraddha-industries` is ACTIVE. |
| E | `org.is_qa_sentinel = false` | **QA orgs: `is_qa_sentinel = true` (TRUTH_SYNCED, c6e24eaa). Permanently excluded.** `shraddha-industries`: `is_qa_sentinel = false` (non-QA tenant). |

**All QA orgs fail Gate E.** `shraddha-industries` fails Gates A and B only. No offering preview catalog items exist for any eligible org candidate.

Code, tests, and infrastructure: **fully correct**. This is a data gap — not a code defect.

Test suite status (confirmed in prior units):
- `public-b2b-supplier-profile.unit.test.ts`: 8/8 PASS
- `public-b2b-projection.unit.test.ts`: 13/13 PASS
- `public-buyer-inquiry.unit.test.ts`: 40/40 PASS

---

## 7. Five-Gate Projection Data Requirements

For `GET /api/public/b2b/suppliers` to return `total > 0`, at least one org must satisfy all conditions below simultaneously.

```
tenants.publicEligibilityPosture       = 'PUBLICATION_ELIGIBLE'          ← Gate A
organizations.publication_posture      IN ('B2B_PUBLIC', 'BOTH')         ← Gate B
organizations.org_type                 = 'B2B'                           ← Gate C
organizations.status                   IN ('ACTIVE', 'VERIFICATION_APPROVED') ← Gate D
organizations.is_qa_sentinel           = false                           ← Gate E
```

Additionally, for the offering preview to be non-empty (required for full profile rendering):
```
catalog_items.tenantId                 = <org.id>
catalog_items.publicationPosture       IN ('B2B_PUBLIC', 'BOTH')
catalog_items.active                   = true
```

Certifications and traceability nodes are **optional supplemental data** — their absence does not block the `items: []` problem or the discovery API. They only affect `certificationCount`, `certificationTypes`, and `hasTraceabilityEvidence` in the profile payload.

---

## 8. Data Requirement Matrix

For each field: required value, which discovery/profile sub-function it feeds, whether it is safely seedable as launch-test data, whether it is public-safe in the API response, and whether it must be redacted.

| Field | Required Value | Feeds | Safely Seedable | Public-Safe | Must Redact |
|---|---|---|---|---|---|
| `organizations.slug` | Unique URL-safe string (e.g., `lt-b2b-001`) | Discovery list, profile URL, all routes | YES | YES — appears in public response | NO |
| `organizations.legal_name` | Non-empty string (e.g., `Launch Test Supplier 001`) | Public profile `legalName` field | YES | YES — appears in public response | NO |
| `organizations.org_type` | `'B2B'` | Gate C; public profile `orgType` field | YES | YES | NO |
| `organizations.status` | `'ACTIVE'` or `'VERIFICATION_APPROVED'` | Gate D | YES | YES — indirect (gate only; not surfaced) | NO |
| `organizations.publication_posture` | `'B2B_PUBLIC'` or `'BOTH'` | Gate B; public profile `publicationPosture` field | YES — posture update, not production data | YES | NO |
| `organizations.is_qa_sentinel` | `false` | Gate E; structural QA exclusion | YES — defaults to `false`; must confirm | YES — never surfaced in response | NO |
| `organizations.primary_segment_key` | Optional — any valid segment key (e.g., `'Weaving'`) | Segment filter, `taxonomy.primarySegment` | YES | YES | NO |
| `organizations.id` | UUID (same as `tenants.id`) | Foreign key anchor; all joins | YES — generated UUID | **NEVER** — org UUID is a prohibited field | **YES — never in public response** |
| `tenants.id` | Same UUID as `organizations.id` | FK anchor | YES — generated UUID | **NEVER** — tenant UUID is a prohibited field | **YES** |
| `tenants.publicEligibilityPosture` | `'PUBLICATION_ELIGIBLE'` | Gate A; public profile `eligibilityPosture` field | YES — posture update | YES — value is surfaced as `eligibilityPosture` | NO |
| `catalog_items.tenantId` | Same UUID as `tenants.id` | Offering preview join | YES — same UUID | **NEVER** — tenantId is not in public response | **YES** |
| `catalog_items.name` | Non-empty string (e.g., `LT Fabric Sample 001`) | Public `offeringPreview[n].name` | YES | YES | NO |
| `catalog_items.active` | `true` | Catalog item gate: `active = true` required | YES | YES — indirect (gate only) | NO |
| `catalog_items.publicationPosture` | `'B2B_PUBLIC'` or `'BOTH'` | Catalog item gate; `offeringPreview` filter | YES | YES — value not in public response; item inclusion signals it | NO |
| `catalog_items.moq` | Integer ≥ 1 | Public `offeringPreview[n].moq` | YES | YES | NO |
| `catalog_items.imageUrl` | `null` or valid URL string | Public `offeringPreview[n].imageUrl` | YES — null is acceptable | YES | NO |
| `certifications.orgId` | Same UUID as org | Cert count and type list | YES — optional; 0 certs is valid | **NEVER** — orgId not in public response | **YES** |
| `certifications.certificationType` | Any string (e.g., `'GOTS'`) | `certificationTypes` array | YES — optional | YES — type string surfaced | NO |
| `certifications.issuedAt` | Non-null DateTime | Cert approval gate: `issuedAt IS NOT NULL` required for cert to be counted | YES — optional | YES — indirect (gate only) | NO |
| `traceability_nodes.orgId` | Same UUID as org | `hasTraceabilityEvidence` flag | YES — optional | **NEVER** — orgId not surfaced | **YES** |
| `traceability_nodes.visibility` | `'SHARED'` | `hasTraceabilityEvidence = true` gate | YES — optional | YES — indirect (flag only) | NO |

**Minimum viable set for `items > 0`:** `organizations.*` (gates C/D/E + legal_name + slug) + `tenants.publicEligibilityPosture` (Gate A) + `organizations.publication_posture` (Gate B) + at least 1 qualifying `catalog_items` row. All other fields are supplemental.

**Prohibited in public response (never returned by API):**
- `organizations.id` / `tenants.id` — internal UUIDs
- `catalog_items.price` / `catalog_items.priceDisclosurePolicyMode` — pricing
- `organizations.risk_score` / `organizations.plan` / `organizations.registration_no`
- `organizations.external_orchestration_ref` — orchestration metadata
- Any negotiation, order, trade, or admin/governance field
- Any draft or unpublished data fields

---

## 9. Existing Script Assessment: `assign-b2b-public-posture.ts`

**File:** `server/scripts/assign-b2b-public-posture.ts`

**Cannot run as-is.** The script targets slug `qa-b2b`. Even after posture assignment, `qa-b2b` has `is_qa_sentinel = true`. Gate E (`is_qa_sentinel: false`) in `publicB2BProjection.service.ts` would still exclude it from all public projection queries. The posture fields would be updated in the DB but the endpoint would still return `total: 0`.

**Why it blocked the prior operator-data path:** Any operator evidence relying on `qa-b2b` (or any other `qa-` prefixed org) would always fail Gate E. The QA sentinel flag activation was permanent and correct for its design intent — it is not a defect.

**Reusable patterns from this script:**

| Pattern | Reusable | Notes |
|---|---|---|
| Tenant anchor resolution via `prisma.tenant.findUnique` by slug | YES | Validates type, status, current posture before proceeding |
| Pre-update image URL capture for drift verification | YES | Defensive: ensures posture update does not disturb image URLs |
| Atomic `$transaction` for tenant + org + catalog item posture updates | YES | Exactly the right write pattern for a launch-test prep script |
| Post-transaction verification with assertion checks | YES | Validates every gate requirement after commit |
| Non-zero exit on assertion failure | YES | Safe for CI/scripted execution |
| Idempotent design: already-set postures not downgraded | YES | Re-runnable safely |

**What a launch-test prep script would change:**

1. Target slug: replace `'qa-b2b'` with `'lt-b2b-001'` (or chosen launch-test slug)
2. Add `is_qa_sentinel: false` assertion in pre-flight (must verify the target org is NOT sentinel-flagged)
3. Catalog item scoping: target launch-test item names/SKUs, not `QA-B2B-FAB-*` SKUs
4. All other logic (transaction pattern, verification loop, exit codes) is directly reusable

---

## 10. Existing Seed/Script/Data Candidate Assessment

### QA tenant specs in `server/prisma/seed.ts`

Six QA tenant specs: `QA_B2B` (slug `qa-b2b`), `QA_B2C` (slug `qa-b2c`), `QA_WL` (slug `qa-wl`), `QA_AGG` (slug `qa-agg`), `QA_PEND` (slug `qa-pend`), `QA_BUYER` (slug `qa-buyer`).

**All are QA-prefixed and sentinel-flagged (`is_qa_sentinel = true`, TRUTH_SYNCED).** None can pass Gate E. None are viable as launch-test supplier candidates.

### Multi-segment QA seed in `server/scripts/qa/current-db-multi-segment-qa-seed.ts`

Seeds `qa-knt-b`, `qa-dye-c`, `qa-gmt-d` with `publicEligibilityPosture: 'PUBLICATION_ELIGIBLE'` and `publicationPosture: 'B2B_PUBLIC'` in their specs. These look like they were designed to pass the projection gates.

**However:** All three have `qa-` prefixed slugs → `is_qa_sentinel = true` → Gate E excludes them permanently. Their `publicationPosture = 'B2B_PUBLIC'` in the spec has no effect on the public projection endpoint — Gate E wins.

The script's code pattern for seeding complete tenant+org+catalog data is reusable as a reference template.

### Reference suppliers in `config/publicReferenceB2B.ts`

Three static frontend-only suppliers: `reference-weaving-unit`, `reference-home-textiles-maker`, `reference-performance-textiles-studio`.

**Frontend-only.** These are pure TypeScript config objects with `isReferencePreview: true`. They have NO corresponding rows in `tenants`, `organizations`, or `catalog_items`. `GET /api/public/b2b/suppliers/reference-weaving-unit` returns HTTP 404 from the backend. They cannot be used as runtime verification evidence and must not be treated as real supplier data.

### `shraddha-industries` — existing real supplier candidate in production (PATH A CANDIDATE)

A non-QA supplier tenant exists in the production database.

| Attribute | Value |
|---|---|
| Slug | `shraddha-industries` |
| Display name | Shraddha Industries |
| Status | ACTIVE (invited lane) |
| `is_qa_sentinel` | `false` — NOT a QA/sentinel org |
| `org_type` | `B2B` — provisioned via B2B invite flow |
| `publication_posture` | `PRIVATE_OR_AUTH_ONLY` — default, not yet set to B2B_PUBLIC |
| `tenant.publicEligibilityPosture` | `NO_PUBLIC_PRESENCE` — default, not yet set to PUBLICATION_ELIGIBLE |
| Activation status | NOT ACTIVATED — invite sent 2026-05-20, token expired 2026-05-27, `userId = null` |
| Catalog items | NONE — supplier has not completed onboarding |
| Cleanup inventory classification | `AMBIGUOUS_REVIEW_REQUIRED` / `MANUAL_REVIEW_REQUIRED` |

**Gate assessment for `shraddha-industries`:**

| Gate | Condition | Status |
|---|---|---|
| A | `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` | FAIL — currently `NO_PUBLIC_PRESENCE`, needs posture update |
| B | `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')` | FAIL — currently `PRIVATE_OR_AUTH_ONLY`, needs posture update |
| C | `org.org_type = 'B2B'` | PASS |
| D | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` | PASS — ACTIVE |
| E | `org.is_qa_sentinel = false` | **PASS — confirmed non-QA org** |

**What is blocking `shraddha-industries` from passing all gates:**
1. Gate A: `tenant.publicEligibilityPosture` needs to be set to `'PUBLICATION_ELIGIBLE'`
2. Gate B: `org.publication_posture` needs to be set to `'B2B_PUBLIC'`
3. No catalog items exist — offering preview would be empty but API would return the entry

**To use `shraddha-industries` for verification (Path A):**
- Explicit Paresh approval required (MANUAL_REVIEW_REQUIRED classification in cleanup inventory)
- A posture update script adapted from `assign-b2b-public-posture.ts` targeting `shraddha-industries`
- Seed catalog items for it (3 items minimum for offering preview)
- This is the correct production-facing path for real supplier verification

**This path requires operator decision.** `shraddha-industries` was provisioned for the Surat pilot — using it for internal verification before the real supplier activates may be appropriate (it's a non-production-critical decision), but it requires Paresh's explicit yes/no.

---

## 11. Recommended Data Classification

| Classification | Definition | Examples in repo |
|---|---|---|
| **Real / production** | An actual business entity that has been onboarded or is being onboarded for live use | `shraddha-industries` (provisioned, not activated) |
| **QA / sentinel** | Explicitly test-only, `is_qa_sentinel = true`, permanently excluded from public projection | All `qa-*` orgs |
| **Launch-test** | Purpose-built for launch verification; NOT sentinel-flagged; NOT a real business entity; clearly labeled with `lt-` prefix; can be used for repeatable runtime verification before real suppliers onboard | Does not exist yet — must be created |
| **Reference / demo** | Frontend-only, config-backed, no DB rows; `isReferencePreview: true` | `config/publicReferenceB2B.ts` entries |

**The gap:** No **launch-test** supplier exists in the repo or production database. This is the blocking gap for FAM-09 runtime verification.

---

## 12. Minimum Viable Seed / Data Package for Verification

The following data package is the minimum required for `GET /api/public/b2b/suppliers` to return `total > 0` using launch-test data.

### Tenant row (`tenants`)

| Field | Required Value | Notes |
|---|---|---|
| `id` | New UUID (generated at seed time) | Same UUID used in `organizations` and `catalog_items.tenantId` |
| `slug` | `lt-b2b-001` | `lt-` prefix = launch-test; `b2b` = type; `001` = instance |
| `name` | `Launch Test Supplier B2B 001` | Clearly non-real label |
| `type` | `B2B` | Required for Gate C via organizations |
| `status` | `ACTIVE` | Required for Gate D |
| `plan` | `PROFESSIONAL` | Functional plan |
| `publicEligibilityPosture` | `PUBLICATION_ELIGIBLE` | Required for Gate A |
| `isWhiteLabel` | `false` | Default |

### Organization row (`organizations`)

| Field | Required Value | Notes |
|---|---|---|
| `id` | Same UUID as `tenants.id` | FK constraint |
| `slug` | `lt-b2b-001` | Must match tenant slug |
| `legal_name` | `Launch Test Supplier 001 Pvt Ltd` | Clearly non-real label; must not be a real company name |
| `org_type` | `B2B` | Gate C |
| `status` | `ACTIVE` | Gate D |
| `publication_posture` | `B2B_PUBLIC` | Gate B |
| `is_qa_sentinel` | `false` | Gate E — the critical field; must be explicitly `false`, not relied on by default |
| `jurisdiction` | `IN` | India; matches Surat pilot context |
| `primary_segment_key` | `Weaving` | Optional but enables segment filter testing |
| `plan` | `PROFESSIONAL` | Match tenant plan |

### Catalog item rows (`catalog_items`) — 3 items for offering preview

| Field | Required Value | Notes |
|---|---|---|
| `id` | New UUID per item | |
| `tenantId` | Same UUID as `tenants.id` | FK to tenant |
| `name` | `LT Fabric Sample 001`, `LT Fabric Sample 002`, `LT Fabric Sample 003` | Clearly non-real label; `LT` prefix |
| `active` | `true` | Required for catalog item gate |
| `publicationPosture` | `B2B_PUBLIC` | Required for catalog item gate |
| `moq` | `100` | Arbitrary valid value |
| `imageUrl` | `null` | Acceptable; no image required for `total > 0` |
| `sku` | `LT-B2B-001-FAB-001`, etc. | Optional but useful for idempotency checks |

### Supplemental (optional — for profile richness, not required for `total > 0`)

| Table | Minimum for supplement | Notes |
|---|---|---|
| `certifications` | 1 row, `orgId = lt-b2b-001.id`, `certificationType = 'GOTS'`, `issuedAt` non-null, valid `lifecycleStateId` | Adds `certificationCount: 1`, `certificationTypes: ['GOTS']` |
| `traceability_nodes` | 1 row, `orgId = lt-b2b-001.id`, `visibility = 'SHARED'` | Adds `hasTraceabilityEvidence: true` |

**Certification seeding requires a valid `lifecycleStateId` FK into `lifecycle_states`.** This is a non-trivial dependency — the certification lifecycle state must exist. The next unit must audit `lifecycle_states` before seeding certifications. Alternatively, seed the `lt-b2b-001` org without certifications first (still satisfies `total > 0`).

---

## 13. Public-Safe Response Expectations

When `lt-b2b-001` passes all five gates, the expected public API response:

```json
{
  "items": [
    {
      "slug": "lt-b2b-001",
      "legalName": "Launch Test Supplier 001 Pvt Ltd",
      "orgType": "B2B",
      "jurisdiction": "IN",
      "certificationCount": 0,
      "certificationTypes": [],
      "hasTraceabilityEvidence": false,
      "taxonomy": {
        "primarySegment": "Weaving",
        "secondarySegments": [],
        "rolePositions": []
      },
      "offeringPreview": [
        { "name": "LT Fabric Sample 001", "moq": 100, "imageUrl": null },
        { "name": "LT Fabric Sample 002", "moq": 100, "imageUrl": null },
        { "name": "LT Fabric Sample 003", "moq": 100, "imageUrl": null }
      ],
      "publicationPosture": "B2B_PUBLIC",
      "eligibilityPosture": "PUBLICATION_ELIGIBLE"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

**Prohibited fields that must never appear:** `id`, `is_qa_sentinel`, `price`, `plan`, `risk_score`, `registration_no`, `external_orchestration_ref`, any token or credential field.

---

## 14. Redaction and No-Secret Rules

This artifact:
- Does NOT print any env variable values, connection strings, or DB URLs
- Does NOT print any JWT, API token, invite token, or auth secret
- Does NOT print the UUID of `shraddha-industries` or any other org UUID from runtime
- Does NOT print the `lt-b2b-001` UUID (it does not exist yet; will be generated at seed time)
- References `shraddha-industries` by slug only (public-safe, appears in governance docs)
- The invite record for `shraddha-industries` (orgId, inviteId, inviteToken) is referenced by existence only — values are not printed here

---

## 15. Recommended Next Unit Title

**Primary recommendation (Path B — launch-test seed design):**
```
FAM-09-SUPPLIER-PROFILE-CATALOG-LAUNCH-TEST-SUPPLIER-SEED-DESIGN-001
```

This unit would:
1. Design and execute the Prisma seed script to create `lt-b2b-001` with all required fields
2. Adapt the posture assignment pattern from `assign-b2b-public-posture.ts` for the `lt-` slug
3. Verify `GET /api/public/b2b/suppliers` returns `total: 1` and shape matches expected response
4. Verify `GET /api/public/b2b/suppliers/lt-b2b-001` returns the full supplier profile
5. Satisfy OD-01 through OD-06 using launch-test data

**Alternative if operator prefers the real candidate (Path A):**
```
FAM-09-SUPPLIER-PROFILE-CATALOG-EXISTING-SUPPLIER-PUBLICATION-PREP-001
```

This unit would:
1. Obtain explicit Paresh approval to use `shraddha-industries` for verification
2. Adapt `assign-b2b-public-posture.ts` to target `shraddha-industries`
3. Seed 3 catalog items for `shraddha-industries` (currently has none)
4. Verify the same five gates and API response

**Path A dependency:** Explicit Paresh decision required before this unit can proceed.

---

## 16. Proposed Allowed Write Files for the Next Unit (Path B)

The next unit `FAM-09-SUPPLIER-PROFILE-CATALOG-LAUNCH-TEST-SUPPLIER-SEED-DESIGN-001` should allow:

**Write (new files):**
- `server/scripts/seed-launch-test-b2b-supplier.ts` — new seed script targeting `lt-b2b-001`
- `artifacts/launch-readiness/FAM-09-SUPPLIER-PROFILE-CATALOG-LAUNCH-TEST-SUPPLIER-SEED-DESIGN-001.md` — unit artifact

**Write (if posture assignment is in scope):** *(may be split into separate sub-unit)*
- No source file modifications required — posture assignment is data-only, handled by the seed script

**Forbidden writes (must remain unchanged):**
- `server/prisma/schema.prisma` — no schema changes needed
- `server/prisma/seed.ts` — do not add launch-test data to QA seed file
- `server/scripts/assign-b2b-public-posture.ts` — do not modify (read-only reference)
- `components/Public/PublicSupplierProfile.tsx` — NEVER stage
- `components/Public/B2BDiscovery.tsx` — NEVER stage
- Any governance tracker files (LAUNCH-FAMILY-INDEX.md, FUTURE-TODO-REGISTER.md)
- Any source, test, or migration files not explicitly allowlisted

---

## 17. Proposed Validation Commands for the Next Unit

After seed script execution:

```powershell
# 1. Verify git staging (artifact + script only — no source files)
git diff --name-only --cached

# 2. Run unit tests (must all still pass)
pnpm exec vitest run --reporter=verbose src/__tests__/public-b2b-projection.unit.test.ts
pnpm exec vitest run --reporter=verbose src/__tests__/public-b2b-supplier-profile.unit.test.ts

# 3. Verify seed script dry-run or execution result (non-zero exit = fail)
# cd server && pnpm exec tsx scripts/seed-launch-test-b2b-supplier.ts

# 4. Verify API response (production — redacted curl)
# curl -si https://app.texqtic.com/api/public/b2b/suppliers | jq .
# Must show: total >= 1, slug = "lt-b2b-001", no prohibited fields in response

# 5. Verify individual profile route
# curl -si https://app.texqtic.com/api/public/b2b/suppliers/lt-b2b-001 | jq .
# Must show: 200 OK, correct shape, no UUID in response
```

---

## 18. Invariant Confirmations

| Invariant | Status |
|---|---|
| FAM-07 governance directory (`governance/legal/fam-07/`) remains ABSENT | CONFIRMED — verified at preflight |
| `components/Public/PublicSupplierProfile.tsx` — not staged or modified | CONFIRMED |
| `components/Public/B2BDiscovery.tsx` — not staged or modified | CONFIRMED |
| `server/prisma/schema.prisma` — not modified | CONFIRMED |
| No SQL run against production DB | CONFIRMED — read-only investigation only |
| No posture scripts executed | CONFIRMED |
| No operator evidence requested | CONFIRMED |
| No secrets, UUIDs, tokens, or env values printed | CONFIRMED |
| No FAM-08 residuals reopened | CONFIRMED |
| Staged diff limited to this one artifact | CONFIRMED — only file created in this unit |

---

## 19. Final Classification Enum

```
FAM_09_SEED_DATA_REQUIREMENTS_AUDIT_COMPLETE_LAUNCH_TEST_SEED_PATH
```

**Rationale:** The audit is complete. No launch-test supplier exists in the repo. All QA orgs are sentinel-flagged and excluded from public projection by Gate E. An existing real supplier candidate (`shraddha-industries`) exists in production but requires explicit operator approval and is not yet activated. The recommended path for self-contained FAM-09 verification is a purpose-built launch-test supplier (`lt-b2b-001`) with `is_qa_sentinel = false` — the design for which is now fully specified in this artifact.

**Boundary:** This unit makes no changes to any source, test, schema, migration, or governance tracker. The artifact above constitutes the complete investigation output.

---

*End of FAM-09-SUPPLIER-PROFILE-CATALOG-SEED-DATA-REQUIREMENTS-AUDIT-001*
