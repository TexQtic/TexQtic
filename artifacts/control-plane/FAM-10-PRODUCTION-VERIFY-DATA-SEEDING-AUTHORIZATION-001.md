# FAM-10-PRODUCTION-VERIFY-DATA-SEEDING-AUTHORIZATION-001

**Unit:** FAM-10-PRODUCTION-VERIFY-DATA-SEEDING-AUTHORIZATION-001  
**Task:** Create exactly one F2 production test fixture in `PENDING_VERIFICATION` state for FAM-10 production verify-close Step D.  
**Status:** SEEDING_COMPLETE  
**Created:** 2026-07-07  
**Owner:** Paresh Patel (TexQtic founder)  
**Authorization basis:** Paresh verbal authorization following F2-MISSING confirmation in FAM-10-PRODUCTION-VERIFY-DATA-LIVE-READ-CONFIRMATION-001.

---

## 1. Authorization Basis

Prior unit `FAM-10-PRODUCTION-VERIFY-DATA-LIVE-READ-CONFIRMATION-001` (commit `9352013517f7c61b0c9af058089f9ae3167ac61c`) confirmed:

- 0 non-protected `PENDING_VERIFICATION` orgs exist in production (F2 MISSING)
- F1, F3, F4 fixtures confirmed present and unmodified
- Seeding authorization required before FAM-10 verify-close Step D could proceed

Paresh authorized creation of exactly one F2 test fixture in `PENDING_VERIFICATION` state.

---

## 2. Scope Constraints

| Constraint | Value |
|---|---|
| New fixtures | Exactly 1 (F2) |
| F1 mutation | NONE |
| F3 mutation | NONE |
| F4 mutation | NONE |
| Source/schema/seed/config files edited | NONE |
| Prisma commands run | NONE |
| Migrations run | NONE |
| `LAUNCH-FAMILY-INDEX.md` | NOT EDITED — FAM-10 remains NOT_ASSESSED |
| `FUTURE-TODO-REGISTER.md` | NOT EDITED |
| `NEXT-ACTION.md` | NOT EDITED |
| `BLOCKED.md` | NOT EDITED |

---

## 3. Pre-Seeding Investigation Findings

### 3.1 F2 Absence Pre-Check (run immediately before INSERT)

```sql
SELECT slug, id AS org_id, status AS org_status, is_qa_sentinel, publication_posture
FROM organizations
WHERE status = 'PENDING_VERIFICATION'
AND slug NOT IN ('qa-b2b','qa-b2c','qa-wl','qa-agg','qa-pend','white-label-co',
                 'shraddha-industries','acme-corp-live-verify',
                 'ops-casework-seller-681cd6f6','ops-casework-buyer-e13b66cb')
AND slug NOT LIKE 'fam10-prod-verify-pending-%';
```

**Result:** 0 rows — confirmed still absent at seeding time. Proceed authorized.

### 3.2 Creation Method Decision

The provision API route (`POST /api/control/tenants/provision`) creates organizations with `status = ACTIVE` only — it does not support `PENDING_VERIFICATION` at create time. Therefore **direct SQL was the required creation path**.

The `organizations.status` field is a `VARCHAR(30)` (not a native PostgreSQL enum), so `PENDING_VERIFICATION` is a legal SQL value (enforced by application-layer check constraint).

The `tenants.status` field is a native enum (`ACTIVE | SUSPENDED | CLOSED`) — `PENDING_VERIFICATION` is not a valid tenant-level status. The lifecycle state `PENDING_VERIFICATION` lives on the `organizations` table only.

### 3.3 DB Trigger Discovery

During execution, it was discovered that a database trigger auto-creates an `organizations` row when a `tenants` row is inserted. The trigger used `status = ACTIVE`, `is_qa_sentinel = false`. An UPDATE was required after INSERT to set the correct fixture state.

---

## 4. SQL Execution Log

### Step 1 — Tenants INSERT

```sql
INSERT INTO tenants (id, slug, name, type, status, plan, public_eligibility_posture, updated_at)
VALUES (
  '4b2a11f7-5129-43ed-aba6-81f8bfa55ce7',
  'fam10-prod-verify-pending-1779950028289',
  'FAM10 Production Verify Pending Test 1779950028289',
  'B2B',
  'ACTIVE',
  'FREE',
  'NO_PUBLIC_PRESENCE',
  NOW()
)
RETURNING id, slug, name, status, public_eligibility_posture;
```

**Result:**

```
                  id                  |                  slug                   |                        name                        | status | public_eligibility_posture
--------------------------------------+-----------------------------------------+----------------------------------------------------+--------+----------------------------
 4b2a11f7-5129-43ed-aba6-81f8bfa55ce7 | fam10-prod-verify-pending-1779950028289 | FAM10 Production Verify Pending Test 1779950028289 | ACTIVE | NO_PUBLIC_PRESENCE
(1 row)
INSERT 0 1
```

### Step 2 — Organizations UPDATE (DB trigger created ACTIVE row; UPDATE to PENDING_VERIFICATION)

```sql
UPDATE organizations
SET status = 'PENDING_VERIFICATION',
    is_qa_sentinel = true,
    updated_at = NOW()
WHERE id = '4b2a11f7-5129-43ed-aba6-81f8bfa55ce7'
RETURNING id, slug, legal_name, status, org_type, publication_posture, is_qa_sentinel, plan;
```

**Result:**

```
                  id                  |                  slug                   |                     legal_name                     |        status        | org_type | publication_posture  | is_qa_sentinel | plan
--------------------------------------+-----------------------------------------+----------------------------------------------------+----------------------+----------+----------------------+----------------+------
 4b2a11f7-5129-43ed-aba6-81f8bfa55ce7 | fam10-prod-verify-pending-1779950028289 | FAM10 Production Verify Pending Test 1779950028289 | PENDING_VERIFICATION | B2B      | PRIVATE_OR_AUTH_ONLY | t              | FREE
(1 row)
UPDATE 1
```

---

## 5. Post-Create Confirmation

### 5.1 Full Join Confirmation

```sql
SELECT o.slug, o.id AS org_id, o.status AS org_status, o.org_type,
       o.publication_posture, o.is_qa_sentinel, o.plan AS org_plan,
       t.id AS tenant_id, t.status AS tenant_status, t.public_eligibility_posture
FROM organizations o
JOIN tenants t ON t.id = o.id
WHERE o.slug = 'fam10-prod-verify-pending-1779950028289';
```

**Result:**

```
                  slug                   |                org_id                |      org_status      | org_type | publication_posture  | is_qa_sentinel | org_plan |              tenant_id               | tenant_status | public_eligibility_posture
-----------------------------------------+--------------------------------------+----------------------+----------+----------------------+----------------+----------+--------------------------------------+---------------+----------------------------
 fam10-prod-verify-pending-1779950028289 | 4b2a11f7-5129-43ed-aba6-81f8bfa55ce7 | PENDING_VERIFICATION | B2B      | PRIVATE_OR_AUTH_ONLY | t              | FREE     | 4b2a11f7-5129-43ed-aba6-81f8bfa55ce7 | ACTIVE        | NO_PUBLIC_PRESENCE
(1 row)
```

### 5.2 Public Isolation Proof

```sql
SELECT o.slug, o.publication_posture, o.is_qa_sentinel, t.public_eligibility_posture
FROM organizations o
JOIN tenants t ON t.id = o.id
WHERE o.slug = 'fam10-prod-verify-pending-1779950028289'
  AND o.publication_posture = 'PRIVATE_OR_AUTH_ONLY'
  AND o.is_qa_sentinel = true
  AND t.public_eligibility_posture = 'NO_PUBLIC_PRESENCE';
```

**Result:**

```
                  slug                   | publication_posture  | is_qa_sentinel | public_eligibility_posture
-----------------------------------------+----------------------+----------------+----------------------------
 fam10-prod-verify-pending-1779950028289 | PRIVATE_OR_AUTH_ONLY | t              | NO_PUBLIC_PRESENCE
(1 row)
```

All three public isolation guards confirmed set correctly.

---

## 6. F2 Fixture Record (Canonical)

| Field | Value |
|---|---|
| `F2_OUTCOME_SLUG` | `fam10-prod-verify-pending-1779950028289` |
| `F2_OUTCOME_ORG_ID` | `4b2a11f7-5129-43ed-aba6-81f8bfa55ce7` |
| `F2_OUTCOME_TENANT_ID` | `4b2a11f7-5129-43ed-aba6-81f8bfa55ce7` |
| `F2_OUTCOME_STATUS` | `PENDING_VERIFICATION` |
| `F2_TENANT_STATUS` | `ACTIVE` |
| `F2_ORG_TYPE` | `B2B` |
| `F2_PLAN` | `FREE` |
| `F2_PUBLICATION_POSTURE` | `PRIVATE_OR_AUTH_ONLY` |
| `F2_IS_QA_SENTINEL` | `true` |
| `F2_PUBLIC_ELIGIBILITY_POSTURE` | `NO_PUBLIC_PRESENCE` |
| `F2_JURISDICTION` | `UNKNOWN` |
| `F2_MEMBERSHIPS` | None (fixture org only — no user required for Step D verify) |

---

## 7. Updated Full Fixture Matrix

```
F1_ARCHIVE_SLUG=test-tenant-rfq-read-other-094d5dde
F1_ARCHIVE_ORG_ID=094d5dde-e69e-41d6-b6d6-221eedac5cbb
F1_ARCHIVE_TENANT_ID=094d5dde-e69e-41d6-b6d6-221eedac5cbb
F1_ARCHIVE_ORG_STATUS=ACTIVE
F1_ARCHIVE_TENANT_STATUS=ACTIVE
F1_PARESH_CONFIRM_SAFE_TO_ARCHIVE=REQUIRED

F2_OUTCOME_SLUG=fam10-prod-verify-pending-1779950028289
F2_OUTCOME_ORG_ID=4b2a11f7-5129-43ed-aba6-81f8bfa55ce7
F2_OUTCOME_TENANT_ID=4b2a11f7-5129-43ed-aba6-81f8bfa55ce7
F2_OUTCOME_STATUS=PENDING_VERIFICATION
F2_SEEDING_STATUS=COMPLETE

F3_ACTIVATION_MODE=D_TO_E_COMPOUND_FLOW
F3_ACTIVATION_ORG_ID=4b2a11f7-5129-43ed-aba6-81f8bfa55ce7
F3_D_TO_E_COMPOUND_AUTHORIZATION_REQUIRED=YES

F4_IMPERSONATION_ORG_SLUG=qa-buyer-a
F4_IMPERSONATION_ORG_ID=682ec6db-d602-4007-bf89-a2456da6315a
F4_IMPERSONATION_USER_ID=fd0135bb-00ae-4b0a-b0a5-b3d3e291a515
F4_MEMBERSHIP_CONFIRMED=YES
F4_USER_CLASSIFICATION=QA_TEST_NON_SENSITIVE
```

---

## 8. Final Enum

`FAM_10_PRODUCTION_VERIFY_DATA_SEEDING_F2_CREATED`

---

## 9. Next Step

Recommended next prompt: `FAM-10-PLATFORM-OPS-CONTROL-PLANE-PRODUCTION-VERIFY-CLOSE-001-RESUBMIT-WITH-LIVE-FIXTURES`

This prompt should re-execute the FAM-10 Step D production verify-close using the confirmed live fixture matrix above.

---

## 10. Governance Compliance

| Rule | Status |
|---|---|
| `LAUNCH-FAMILY-INDEX.md` not edited | PASS — FAM-10 remains NOT_ASSESSED |
| `FUTURE-TODO-REGISTER.md` not edited | PASS |
| `NEXT-ACTION.md` not edited | PASS |
| `BLOCKED.md` not edited | PASS |
| No source/schema/seed/config/package files edited | PASS |
| No Prisma commands run | PASS |
| No migrations applied | PASS |
| DATABASE_URL / PGPASSWORD never printed | PASS |
| Exactly 1 F2 fixture created | PASS |
| F1/F3/F4 rows not mutated | PASS |
| `is_qa_sentinel = true` on F2 | PASS |
| `publication_posture = PRIVATE_OR_AUTH_ONLY` on F2 | PASS |
| `public_eligibility_posture = NO_PUBLIC_PRESENCE` on F2 | PASS |

---

*Last updated: 2026-07-07 — FAM-10 production verify data seeding complete.*
