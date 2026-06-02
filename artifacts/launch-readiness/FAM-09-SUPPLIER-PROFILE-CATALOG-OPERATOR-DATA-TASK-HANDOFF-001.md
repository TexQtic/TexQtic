# FAM-09-SUPPLIER-PROFILE-CATALOG-OPERATOR-DATA-TASK-HANDOFF-001

**Family Unit:** FAM-09 — Supplier Profile & Catalog Readiness  
**Unit type:** Operator Data Task Handoff / Data Readiness Planning (read-only, no source changes)  
**Status:** `COMPLETE — FAM_09_OPERATOR_DATA_HANDOFF_COMPLETE`  
**Commit authority:** This document  
**Date:** 2026-06-02  
**Starting HEAD:** `b1aa6091` (FAM-09 onboarding evidence unit)  
**Prior unit:** `FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-001`

---

## 1. Unit Summary

This unit prepares the precise operator-facing data task handoff required to unblock FAM-09
from `FAM_09_ONBOARDING_EVIDENCE_STILL_BLOCKED_REAL_SUPPLIER_DATA`.

All FAM-09 code and tests are correct. All 61 targeted unit tests continue to pass. The public
B2B projection infrastructure is live and operational in production. The sole remaining blocker
is that no real B2B supplier has been onboarded with the correct publication posture and tenant
eligibility posture simultaneously.

**This unit does not rerun endpoint verification.** The prior two verification units already
produced identical evidence (`items: 0`). Repeating the endpoint check here would produce
duplicate blocked evidence and delay the handoff without adding information. The blocked
baseline is authoritative and confirmed.

This unit records:
- Exact gate semantics and field locations
- Exact operator data tasks (OD-01 through OD-06)
- Safe evidence contract the operator must satisfy before the next verification unit runs
- Exact go/no-go criteria for `FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002`
- Reference to the existing posture assignment script in the repo

No source files, test files, schema, migrations, seed files, governance trackers, or production
data were modified. One artifact is produced.

---

## 2. Preflight Results

| Check | Command | Result |
|---|---|---|
| Working tree clean | `git status --short` | PASS — no output (CLEAN) |
| HEAD commit | `git rev-parse --short HEAD` | `b1aa6091` |
| Ancestry: b1aa6091 ancestor of HEAD | `git merge-base --is-ancestor b1aa6091 HEAD` | PASS — exit 0 |
| FAM-07 legal hold: dir absent | `Test-Path -LiteralPath governance/legal/fam-07` | PASS — ABSENT (`False`) |
| FAM-07 terms-authority.json absent | `Test-Path -LiteralPath governance/legal/fam-07/supplier-onboarding-terms-authority.json` | PASS — ABSENT (`False`) |
| FAM-09 onboarding evidence artifact present | `Test-Path -LiteralPath artifacts/launch-readiness/FAM-09-...-ONBOARDING-EVIDENCE-AND-CLOSE-001.md` | PASS — PRESENT (`True`) |

All preflight checks: **PASS**. Working tree: **CLEAN**.

---

## 3. Dirty Tree Status

**Working tree at start:** CLEAN — `git status --short` returned no output.

**`components/Public/PublicSupplierProfile.tsx` status:** CLEAN — not modified, not staged.  
**`components/Public/B2BDiscovery.tsx` status:** CLEAN — not modified, not staged.

---

## 4. Files Inspected

| File | Purpose |
|---|---|
| `artifacts/launch-readiness/FAM-09-SUPPLIER-PROFILE-CATALOG-OPENING-REPO-TRUTH-AUDIT-001.md` | FAM-09 baseline |
| `artifacts/launch-readiness/FAM-09-SUPPLIER-PROFILE-CATALOG-RUNTIME-VERIFICATION-AND-DATA-READINESS-001.md` | Runtime verification evidence |
| `artifacts/launch-readiness/FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-001.md` | Onboarding evidence (prior unit) |
| `server/src/services/publicB2BProjection.service.ts` | Gate constants, query predicates, catalog posture logic |
| `server/scripts/assign-b2b-public-posture.ts` | Existing posture assignment script (reference) |
| `server/prisma/schema.prisma` | Field/model canonical reference (cross-checked via semantic search) |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-PROJECTION-PRECONDITION-DESIGN-v1.md` | Gate authority and evaluation chain |

---

## 5. Current FAM-09 Blocked State

Two consecutive endpoint verification runs confirmed:

```
GET https://app.texqtic.com/api/public/b2b/suppliers
→ HTTP 200
→ { "success": true, "data": { "items": [], "total": 0, "page": 1, "limit": 20 } }
```

Segment filters (FABRIC_WOVEN, HOME_TEXTILES) also return `items: 0`. All reference slug
probes return 404 from the backend — correct because reference suppliers are frontend-only.

**This is an operational data gap, not a code, test, or infrastructure defect.**

---

## 6. Why Repeating Endpoint Verification Now Would Be Uninformative

Running `GET /api/public/b2b/suppliers` again at this moment would produce the same
`items: 0` result because no data has changed in production since the prior unit.
Repeating identical evidence adds no information; it would also consume time that should
be spent on the data tasks.

The endpoint verification should be run ONLY after the operator confirms OD-01 through
OD-05 are complete in production — this is the trigger for
`FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002`.

---

## 7. Five-Gate Public B2B Projection Model

All five gates are evaluated in sequence for every org candidate. Failing any one gate
**silently excludes the org** from the public response — no error, no partial entry.

Source of truth: `server/src/services/publicB2BProjection.service.ts` — lines 1–42 (constants)
and `listPublicB2BSuppliers` / `getPublicB2BSupplierBySlug` functions.

| Gate | Evaluation rule | Enforcement point | Failure result |
|---|---|---|---|
| **Gate A** | `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` | In-memory filter after `tenant.findMany` | Org silently excluded |
| **Gate B** | `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')` | DB query predicate `where.publication_posture` | Org not returned from DB |
| **Gate C** | `org.org_type === 'B2B'` | DB query predicate `where.org_type` | Org not returned from DB |
| **Gate D** | `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')` | DB query predicate `where.status` | Org not returned from DB |
| **Gate E** | `org.is_qa_sentinel === false` | DB query predicate `is_qa_sentinel: false` | Org not returned from DB |
| **Output gate** | Prohibited fields (`orgId`, `price`, `risk_score`, `plan`, `registration_no`, etc.) never appear in output | Prisma `select` projection + type system | Field absent from payload |

**Gate A is tenant-level (first evaluated).** If Gate A fails, the org is excluded regardless
of Gates B–E. This means OD-02 must be applied first (or simultaneously with OD-01) for any
real supplier to surface.

**Gate E (sentinel) is a hard DB-level filter.** QA/test orgs with `is_qa_sentinel = true`
can never surface in the public projection regardless of posture or eligibility settings.
OD-05 confirms the real supplier has `is_qa_sentinel = false`.

---

## 8. Operator Data Task Table (OD-01 through OD-05)

These are the P0 tasks. All five must be complete for a real supplier to appear in
`GET /api/public/b2b/suppliers`.

---

### OD-01 — Set `org.publication_posture = 'B2B_PUBLIC'` (or `'BOTH'`)

| Attribute | Value |
|---|---|
| **Why required** | Gate B: the DB query predicate `where: { publication_posture: { in: ['B2B_PUBLIC', 'BOTH'] } }` will exclude the org if this field is `PRIVATE_OR_AUTH_ONLY` (the default for all orgs) |
| **Gate satisfied** | Gate B |
| **Database table** | `organizations` (Postgres) |
| **Prisma model** | `organizations` |
| **Field name** | `publication_posture` (type: VarChar(30)) |
| **Required value** | `'B2B_PUBLIC'` (preferred for B2B-only suppliers) or `'BOTH'` (for suppliers on both B2B and B2C surfaces) |
| **Default value** | `'PRIVATE_OR_AUTH_ONLY'` — all orgs start private |
| **Priority** | **P0** — without this, the org never leaves the database query |
| **Safe evidence to provide** | `org.publication_posture = 'B2B_PUBLIC'` confirmed for supplier with slug `<safe-slug>` |
| **Must NOT be shared** | org UUID, DATABASE_URL, raw row output, Supabase keys |

---

### OD-02 — Set `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`

| Attribute | Value |
|---|---|
| **Why required** | Gate A: the in-memory filter `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'` is the **first gate** evaluated. Even if Gates B–E pass at the DB level, an org is silently excluded if its tenant's eligibility posture is not `PUBLICATION_ELIGIBLE` |
| **Gate satisfied** | Gate A |
| **Database table** | `tenants` (Postgres) |
| **Prisma model** | `Tenant` |
| **Field name** | `publicEligibilityPosture` (type: `TenantPublicEligibilityPosture` enum) |
| **Enum values** | `NO_PUBLIC_PRESENCE` (default) \| `LIMITED_PUBLIC_PRESENCE` \| `PUBLICATION_ELIGIBLE` |
| **Required value** | `'PUBLICATION_ELIGIBLE'` |
| **Default value** | `'NO_PUBLIC_PRESENCE'` — all tenants start with no public exposure |
| **Relationship** | `tenants.id` = `organizations.id` — tenant and org share the same UUID; the `tenants` table holds the eligibility posture |
| **Priority** | **P0** — this is the first evaluated gate; failing it means nothing else matters |
| **Safe evidence to provide** | `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'` confirmed for supplier with slug `<safe-slug>` |
| **Must NOT be shared** | tenant UUID, org UUID, DATABASE_URL, raw row output, Supabase keys |

---

### OD-03 — Confirm `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')`

| Attribute | Value |
|---|---|
| **Why required** | Gate D: the DB query predicate `where: { status: { in: ['ACTIVE', 'VERIFICATION_APPROVED'] } }` excludes orgs with `SUSPENDED`, `PENDING_VERIFICATION`, or any other status |
| **Gate satisfied** | Gate D |
| **Database table** | `organizations` |
| **Prisma model** | `organizations` |
| **Field name** | `status` (type: VarChar(30)) |
| **Required values** | `'ACTIVE'` or `'VERIFICATION_APPROVED'` |
| **Priority** | **P0** — the org must be in an active or verified state to pass this gate |
| **Action required** | This is a confirmation step, not a data change. The operator must verify the real supplier's org has a qualifying status. If the status is `PENDING_VERIFICATION`, it must be resolved through the standard verification workflow before FAM-09 can close |
| **Safe evidence to provide** | `org.status = 'ACTIVE'` (or `VERIFICATION_APPROVED`) confirmed for supplier with slug `<safe-slug>` |
| **Must NOT be shared** | org UUID, internal verification audit trail, raw row output |

---

### OD-04 — Confirm `org.org_type = 'B2B'`

| Attribute | Value |
|---|---|
| **Why required** | Gate C: the DB query predicate `where: { org_type: 'B2B' }` excludes non-B2B orgs. A B2C org cannot appear in the B2B supplier directory |
| **Gate satisfied** | Gate C |
| **Database table** | `organizations` |
| **Prisma model** | `organizations` |
| **Field name** | `org_type` (type: VarChar(50)) |
| **Required value** | `'B2B'` |
| **Priority** | **P0** — this is a structural property of the org, typically set at onboarding time |
| **Action required** | Confirmation only. The real supplier must have been onboarded as a B2B org. If the org_type is incorrect, this is a structural onboarding data issue that must be resolved through a governed data correction, not a posture update |
| **Safe evidence to provide** | `org.org_type = 'B2B'` confirmed for supplier with slug `<safe-slug>` |
| **Must NOT be shared** | org UUID, raw row output |

---

### OD-05 — Confirm `org.is_qa_sentinel = false`

| Attribute | Value |
|---|---|
| **Why required** | Gate E: the DB query predicate `is_qa_sentinel: false` is a hard filter that excludes all QA and test orgs from the public projection regardless of any other posture field. A QA sentinel org cannot be used to satisfy FAM-09 close-readiness requirements |
| **Gate satisfied** | Gate E (sentinel exclusion) |
| **Database table** | `organizations` |
| **Prisma model** | `organizations` |
| **Field name** | `is_qa_sentinel` (type: Boolean, default: `false`) |
| **Required value** | `false` |
| **Priority** | **P0** — this confirms the supplier is a real production org, not a QA/test fixture |
| **Critical note** | The existing `qa-b2b` org in production has `is_qa_sentinel = true` (set by the sentinel flag activation). Even if `qa-b2b` were set to `publication_posture = 'B2B_PUBLIC'` and `publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`, Gate E would still exclude it from the public projection. Only a real supplier with `is_qa_sentinel = false` qualifies |
| **Action required** | Confirmation only. Real onboarded production suppliers should have `is_qa_sentinel = false` by default. This confirms the supplier being onboarded is not a QA, test, demo, reference, or mock org |
| **Safe evidence to provide** | `org.is_qa_sentinel = false` confirmed for supplier with slug `<safe-slug>` |
| **Must NOT be shared** | org UUID, raw row output |

---

## 9. Operator Data Task Table — OD-06 (Offering Preview)

OD-06 is a **P1 task** — it is required for the offering preview to be non-empty, but it is
not required for the supplier to appear in the B2B discovery listing or for the profile route
to return 200. A supplier can be fully discovery-eligible with an empty `offeringPreview[]`.

| Attribute | Value |
|---|---|
| **Task** | Set at least one catalog item to `publicationPosture = 'B2B_PUBLIC'` and `active = true` for the target supplier |
| **Why recommended** | Without a public catalog item, the offering preview array will be empty (`offeringPreview: []`). The supplier entry will appear in discovery, but buyers will see no sample products |
| **Database table** | `catalog_items` |
| **Prisma model** | `CatalogItem` |
| **Field: posture** | `publicationPosture` (type: enum or VarChar — value `'B2B_PUBLIC'` or `'BOTH'`) |
| **Field: active** | `active` (type: Boolean) — must be `true`; soft-deleted items are excluded |
| **How the service filters** | `where: { tenantId: org.id, publication_posture: { in: ['B2B_PUBLIC', 'BOTH'] }, active: true }` then caps at `MAX_OFFERING_PREVIEW = 5` |
| **Priority** | **P1** — affects offering preview completeness, not discovery eligibility |
| **Close impact** | If OD-01–05 complete but OD-06 not complete: `FAM_09_ONBOARDING_EVIDENCE_CLOSE_READY_WITH_CATALOG_RESIDUAL` |
| **If OD-06 complete:** | `FAM_09_ONBOARDING_EVIDENCE_CLOSE_READY` |
| **Safe evidence to provide** | Number of catalog items set to public posture and `active = true`. SKUs are acceptable if not private |
| **Must NOT be shared** | catalog item UUIDs, prices, internal SKU suffixes if private |

---

## 10. Existing Posture Assignment Script (Reference)

A bounded posture assignment script already exists in the repo at:

```
server/scripts/assign-b2b-public-posture.ts
```

This script was written for `qa-b2b` (a QA/test org, now sentinel-flagged, and therefore
ineligible for public projection). However, it is an authoritative reference for the exact
Prisma update operations required for OD-01, OD-02, and OD-06.

**The operator must NOT run this script as-is** — it targets `qa-b2b` which is
`is_qa_sentinel = true` and cannot appear in the public projection.

**To adapt for a real supplier, the operator must:**
1. Create a new bounded script targeting the real supplier's slug (not `qa-b2b`)
2. Or apply the equivalent updates via the TexQtic Control Plane admin interface
3. The script pattern (transactional update, verify, assert) is the correct approach

**What the script does (reference):**
- Begins with a tenant lookup by slug — fails hard if slug not found (blockers before any writes)
- Captures pre-update catalog item `imageUrl` for preservation verification
- Opens a Prisma transaction that atomically:
  - Sets `tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE'`
  - Sets `org.publication_posture = 'B2B_PUBLIC'`
  - Sets `catalogItem.publicationPosture = 'B2B_PUBLIC'` for a bounded set of active items
- Post-transaction verification: confirms all three posture values
- Asserts no `imageUrl` drift
- Exits non-zero if any assertion fails

**Run command pattern** (for a real supplier, with the script adapted):

```powershell
# From repo root — requires DATABASE_URL in environment
pnpm -C server exec ts-node scripts/<adapted-script-name>.ts
```

> Reminder: DATABASE_URL must never be printed, echoed, or logged.

---

## 11. Safe Operator Evidence Contract

The following is the exact evidence Paresh/the operator must provide before
`FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002` may be run.

### Required (Go / No-Go gate)

```
1. Confirmation: OD-01 through OD-05 are complete in production for at least one real supplier.
2. Public-safe slug: the value of `organizations.slug` for that supplier.
   (This is the slug that will appear publicly in URLs and API responses.)
3. Confirmation: the supplier is real onboarded data — not a QA/test/demo/reference/mock org.
   (Specifically: is_qa_sentinel = false confirmed.)
4. Public display name / legalName: the value of `organizations.legal_name`,
   if the operator intends it to appear publicly.
   (This will appear in the discovery listing and profile page once live.)
5. Primary segment key: the value of `organizations.primary_segment_key`,
   if safe to share. (Used by Copilot to run a targeted segment filter check.)
```

### Optional (Determines close classification)

```
6. OD-06 confirmation: whether at least one catalog item exists with
   publicationPosture = 'B2B_PUBLIC' and active = true.
   If yes: report how many items are in the public set (not their UUIDs or prices).
```

### What must NOT be shared

The following are **unconditionally prohibited** from operator messages, terminal output,
chat messages, and any shared evidence:

```
- org UUID (organizations.id)
- tenant UUID (tenants.id)
- DATABASE_URL or any partial database connection string
- Supabase project ref, anon key, service_role key, or JWT
- Private email addresses
- Phone numbers
- Private postal or street addresses
- Invite tokens or magic-link tokens
- Raw database rows (psql output)
- Legal hashes or internal compliance identifiers
- Internal Supabase SQL query results showing UUID columns
- Any field not intended for public display
```

---

## 12. Go / No-Go Criteria for the Next Verification Unit

`FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002` must NOT be run until:

### Mandatory go criteria (all must be satisfied)

```
GO 1: Operator confirms OD-01 complete for a named real supplier
       (org.publication_posture = 'B2B_PUBLIC' or 'BOTH')

GO 2: Operator confirms OD-02 complete for that supplier's tenant
       (tenant.publicEligibilityPosture = 'PUBLICATION_ELIGIBLE')

GO 3: Operator confirms OD-03 (org.status is ACTIVE or VERIFICATION_APPROVED)

GO 4: Operator confirms OD-04 (org.org_type = 'B2B')

GO 5: Operator confirms OD-05 (org.is_qa_sentinel = false — real supplier, not QA)

GO 6: Operator provides a public-safe slug for the real supplier
       (required to run the profile route check:
       GET /api/public/supplier/<slug>)
```

### Determines close classification (not a go blocker)

```
OD-06: Whether at least one catalog item has publicationPosture = 'B2B_PUBLIC' and active = true
  → OD-06 complete:      FAM_09_ONBOARDING_EVIDENCE_CLOSE_READY
  → OD-06 not complete:  FAM_09_ONBOARDING_EVIDENCE_CLOSE_READY_WITH_CATALOG_RESIDUAL
```

### Hard no-go conditions (block the unit entirely)

```
NO-GO 1: Discovery still returns items: 0 after operator claims OD-01–05 are complete
         → FAM_09_ONBOARDING_EVIDENCE_STILL_BLOCKED_REAL_SUPPLIER_DATA

NO-GO 2: Real supplier slug is not provided or is not public-safe
         → FAM_09_ONBOARDING_EVIDENCE_BLOCKED_REAL_SLUG_MISSING

NO-GO 3: Any targeted test fails
         → FAM_09_ONBOARDING_EVIDENCE_TEST_REGRESSION

NO-GO 4: Endpoint returns unexpected HTTP status or unsafe fields
         → FAM_09_ONBOARDING_EVIDENCE_PUBLIC_ENDPOINT_BLOCKER
```

---

## 13. Recommended Next Unit

**Title:**

```
FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002
```

**Type:** Evidence collection / close-readiness review (read-only, no source changes)  
**Prerequisite:** All six mandatory go criteria above must be satisfied  
**Allowed write:** `artifacts/launch-readiness/FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002.md`  
**No source changes**

**Draft next verification prompt title (not a full prompt):**

```
FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002
```

The operator should provide the safe evidence contract values from Section 11 when submitting
this prompt. The unit will:
1. Run preflight checks
2. Re-run targeted unit tests (expect 61/61 PASS)
3. Verify `GET /api/public/b2b/suppliers` returns `items >= 1`
4. Verify `GET /api/public/supplier/<operator-provided-real-slug>` returns 200
5. Confirm public response safety for the real supplier entry
6. Record OD-06 status and determine final classification

---

## 14. Expected Minimum Production Evidence for `002` Unit

Once go criteria are met, the `002` unit should produce evidence matching this pattern:

```
GET https://app.texqtic.com/api/public/b2b/suppliers
→ HTTP 200
→ items: [ { slug: "<real-slug>", legalName: "<safe-name>", orgType: "B2B", ... } ]
→ total: >= 1
→ orgId: absent
→ price: absent
→ risk_score: absent
→ plan: absent
→ registration_no: absent

GET https://app.texqtic.com/api/public/supplier/<real-slug>
→ HTTP 200
→ slug: "<real-slug>"
→ legalName: "<safe-name>"
→ jurisdiction: present
→ orgId: absent
```

---

## 15. Invariant and Safety Confirmations

| Invariant | Status |
|---|---|
| No source files modified | CONFIRMED — read-only unit |
| No test files modified | CONFIRMED |
| No Prisma schema or migrations modified | CONFIRMED |
| No seed files created or modified | CONFIRMED |
| No governance trackers modified | CONFIRMED |
| No supplier data created, modified, or deleted | CONFIRMED |
| No production data changed | CONFIRMED |
| No secrets, env values, DB URLs, tokens, JWTs, passwords printed | CONFIRMED |
| No Supabase keys, private IDs, legal hashes, raw tenant data, private contact data printed | CONFIRMED |
| FAM-07 legal hold preserved: `governance/legal/fam-07/` ABSENT | CONFIRMED — preflight PASS |
| FAM-08 remains `CLOSE_READY_WITH_RESIDUALS`, not reopened | CONFIRMED |
| Reference/demo/mock/QA suppliers NOT treated as real onboarded suppliers | CONFIRMED |
| `components/Public/PublicSupplierProfile.tsx` — not staged, not modified | CONFIRMED |
| `components/Public/B2BDiscovery.tsx` — not staged, not modified | CONFIRMED |

---

## 16. Final Classification

```
FAM_09_OPERATOR_DATA_HANDOFF_COMPLETE
```

Exact operator instructions have been recorded. The posture assignment script reference
(`server/scripts/assign-b2b-public-posture.ts`) is present in the repo and provides the
exact Prisma operation pattern required for OD-01, OD-02, and OD-06. The gate semantics,
field names, table names, and safe evidence contract are fully specified above.

FAM-09 is waiting on operator data confirmation. When OD-01 through OD-05 are complete and
a safe slug is provided, `FAM-09-SUPPLIER-PROFILE-CATALOG-ONBOARDING-EVIDENCE-AND-CLOSE-002`
may be run.

---

*Artifact produced in compliance with FAM-09 operator data handoff allowlist (artifact file only).
No source, test, schema, migration, or governance files were modified. FAM-07 legal hold
preserved. FAM-08 residuals not reopened. Working tree CLEAN at both start and end. Reference/demo/
QA suppliers not treated as real onboarded suppliers.*
