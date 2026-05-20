# TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001

## 1. Header

| Field | Value |
|---|---|
| Unit ID | TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001 |
| Track | Launch Readiness / QA Data Hygiene / Public Projection Quarantine |
| Type | Controlled Production Visibility Remediation |
| Date | 2026-05-20 |
| Starting HEAD | `b5f5bb9` |
| Starting branch | `main` |
| Starting tree status | CLEAN (main = origin/main) |
| Decision | **QUARANTINE_VERIFIED_COMPLETE** |
| Authority trigger | HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001 VERIFIED_FAIL |
| Commit hash | `49aef2d4cd011a2ef1be7ab98613f067d34bbfee` |

---

## 2. Objective

Remove QA B2C fixture data from public unauthenticated B2C browse and product detail surfaces
while preserving all QA tenant, org, and product records for authenticated/dev/runtime
verification.

This unit does NOT:
- Delete any QA tenant, org, or product records
- Disable authenticated QA usage
- Seed real supplier data
- Modify frontend or backend source code
- Modify schema, migrations, `.env` files, or feature flags
- Satisfy HD-002 — real supplier data is still absent

HD-002 remains VERIFIED_FAIL after this packet. This unit only removes QA public projection
exposure.

---

## 3. Authority Documents

| Document | Role |
|---|---|
| `governance/units/HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001.md` | Evidence of QA fixture data in public projection |
| `governance/launch-readiness/HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY.md` | Launch-readiness summary; VERIFIED_FAIL verdict |
| `governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | HD-002 and BS-001 definitions |
| `server/src/services/publicB2CProjection.service.ts` | Five projection safety gates; Gate B definition |

---

## 4. Preflight

### Git state

```
git status --short → (no output — clean tree)
git rev-parse HEAD → b5f5bb92f7a9126746eb2f1d457429c1f4f96e1e
git rev-parse origin/main → b5f5bb92f7a9126746eb2f1d457429c1f4f96e1e
```

HD-002 commits confirmed present:

```
b5f5bb9 [TEXQTIC] governance: backfill commit hash in product data readiness artifact
3482b48 [TEXQTIC] governance: verify real product data readiness
```

---

## 5. Projection Gate Inspection

### Five B2C safety gates (from `server/src/services/publicB2CProjection.service.ts`)

```
Gate A: tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'
Gate B: org.publication_posture IN ('B2C_PUBLIC', 'BOTH')            ← TARGET
Gate C: org.org_type === 'B2C'
Gate D: org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')
Gate E: public-safe payload field allowlist only
```

Gate B is enforced at the DB query level:

```typescript
publication_posture: { in: [...PUBLICATION_POSTURE_B2C_PUBLIC] },
// where PUBLICATION_POSTURE_B2C_PUBLIC = ['B2C_PUBLIC', 'BOTH']
```

If `publication_posture` is not in `['B2C_PUBLIC', 'BOTH']`, the org is excluded before
Gate A is evaluated. The service immediately returns `{ items: [], total: 0 }` when
`orgRows.length === 0`.

### Gate selected: Gate B

**Rationale:** Setting `publication_posture = 'PRIVATE_OR_AUTH_ONLY'` on the QA org:

1. Removes the org from the public projection query (Gate B fails at DB level).
2. Does not affect the tenant record — `public_eligibility_posture` is unchanged.
3. Does not affect any product records — catalog items remain intact.
4. Does not affect any authenticated-path queries — the `publication_posture` field is
   only filtered in `publicB2CProjection.service.ts`; authenticated routes use separate
   context and separate queries.
5. Is the narrowest single-field DB mutation that achieves quarantine.
6. No source code changes required. No schema changes required.

---

## 6. Pre-Mutation Read: QA B2C Records

### Org (`organizations` table)

| Field | Value |
|---|---|
| id | `0ad2d0c5-36ad-48be-a0fe-bad77a57bd6e` |
| slug | `qa-b2c` |
| legal_name | `QA B2C` |
| org_type | `B2C` |
| status | `ACTIVE` |
| jurisdiction | `US-CA` |
| publication_posture (BEFORE) | `B2C_PUBLIC` |
| is_qa_sentinel | `false` |

### Tenant (`tenants` table)

| Field | Value |
|---|---|
| id | `0ad2d0c5-36ad-48be-a0fe-bad77a57bd6e` |
| slug | `qa-b2c` |
| name | `QA B2C` |
| type | `B2C` |
| status | `ACTIVE` |
| public_eligibility_posture | `PUBLICATION_ELIGIBLE` |

### Products (`catalog_items` table — 3 records)

| id | name | product_category | material | fabric_type | publication_posture | image_url |
|---|---|---|---|---|---|---|
| `1edb3ba6-a8fc-4891-ad68-4555fc21ed3c` | QA B2C Cotton Scarf | null | null | null | B2C_PUBLIC | placehold.co |
| `7c1c4d51-9c47-4f79-a7d6-674fd05f13ce` | QA B2C Linen Wrap | null | null | null | B2C_PUBLIC | placehold.co |
| `88dce69b-ca78-4082-903b-aebe72a7fa6e` | QA B2C Silk Pocket Square | null | null | null | B2C_PUBLIC | placehold.co |

### Identity safety check

```sql
SELECT COUNT(*) FROM organizations
WHERE slug = 'qa-b2c' AND legal_name = 'QA B2C' AND jurisdiction = 'US-CA';
-- Result: 1
```

Composite key uniquely identifies the QA org. Safe to proceed.

### Public API before mutation (from HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001)

**`GET /api/public/b2c/products`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "slug": "qa-b2c",
        "legalName": "QA B2C",
        "orgType": "B2C",
        "jurisdiction": "US-CA",
        "productsPreview": [
          { "slug": "qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10", "name": "QA B2C Cotton Scarf", ... },
          { "slug": "qa-b2c--qa-b2c-linen-wrap-c48d2bc0ea", "name": "QA B2C Linen Wrap", ... },
          { "slug": "qa-b2c--qa-b2c-silk-pocket-square-1192a1b1f2", "name": "QA B2C Silk Pocket Square", ... }
        ],
        "publicationPosture": "B2C_PUBLIC",
        "eligibilityPosture": "PUBLICATION_ELIGIBLE"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20
  }
}
```

**`GET /api/public/b2c/products/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10`**

Returned product detail with: `summary: "B2C browse proof item one."`, QA trust signals,
`publicSupplierName: "QA B2C"`, `publicSupplierSlug: "qa-b2c"`.

---

## 7. DB Mutation

### Exact SQL executed

```sql
UPDATE organizations
SET publication_posture = 'PRIVATE_OR_AUTH_ONLY'
WHERE slug = 'qa-b2c'
  AND legal_name = 'QA B2C'
  AND jurisdiction = 'US-CA'
RETURNING id, slug, legal_name, publication_posture;
```

### RETURNING output

```
                  id                  |  slug  | legal_name | publication_posture
--------------------------------------+--------+------------+----------------------
 0ad2d0c5-36ad-48be-a0fe-bad77a57bd6e | qa-b2c | QA B2C     | PRIVATE_OR_AUTH_ONLY
(1 row)

UPDATE 1
```

Rows affected: **1**. Target org only. No other records modified.

### Post-mutation DB re-verify

```sql
SELECT id, slug, legal_name, publication_posture FROM organizations WHERE slug = 'qa-b2c';
```

```
                  id                  |  slug  | legal_name | publication_posture
--------------------------------------+--------+------------+----------------------
 0ad2d0c5-36ad-48be-a0fe-bad77a57bd6e | qa-b2c | QA B2C     | PRIVATE_OR_AUTH_ONLY
(1 row)
```

Confirmed: `publication_posture = 'PRIVATE_OR_AUTH_ONLY'` persisted.

---

## 8. Post-Mutation API Verification

### Public browse — `GET /api/public/b2c/products`

```
HTTP 200
{"success":true,"data":{"items":[],"total":0,"page":1,"limit":20}}
```

**QA B2C absent. Total = 0. Items = [].** ✅

### Product detail — `GET /api/public/b2c/products/qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10`

```
HTTP 404
{"success":false,"error":{"code":"NOT_FOUND","message":"Product not found"}}
```

**QA product detail no longer publicly accessible.** ✅

---

## 9. QA Runtime Preservation

### DB proof — records still exist

```sql
SELECT 'org' AS rec_type, id, slug, legal_name, publication_posture
FROM organizations WHERE slug = 'qa-b2c';
```

```
 rec_type |                  id                  |  slug  | legal_name | publication_posture
----------+--------------------------------------+--------+------------+----------------------
 org      | 0ad2d0c5-36ad-48be-a0fe-bad77a57bd6e | qa-b2c | QA B2C     | PRIVATE_OR_AUTH_ONLY
```

```sql
SELECT 'tenant' AS rec_type, id, slug, name, public_eligibility_posture
FROM tenants WHERE slug = 'qa-b2c';
```

```
 rec_type |                  id                  |  slug  |  name  | public_eligibility_posture
----------+--------------------------------------+--------+--------+----------------------------
 tenant   | 0ad2d0c5-36ad-48be-a0fe-bad77a57bd6e | qa-b2c | QA B2C | PUBLICATION_ELIGIBLE
```

```sql
SELECT COUNT(*) AS product_count FROM catalog_items
WHERE tenant_id = (SELECT id FROM organizations WHERE slug = 'qa-b2c');
```

```
 product_count
---------------
             3
```

| Record | Status |
|---|---|
| QA B2C org | EXISTS — `publication_posture = PRIVATE_OR_AUTH_ONLY` |
| QA B2C tenant | EXISTS — `public_eligibility_posture = PUBLICATION_ELIGIBLE` (unchanged) |
| QA B2C products | EXISTS — 3 records, all content unchanged |
| Records deleted | **NONE** |

Authenticated and internal QA verification paths are unaffected. The `publication_posture`
field is read only by `publicB2CProjection.service.ts` in its Gate B filter. All
authenticated routes, internal tooling, and QA fixture seeding remain fully operational.

---

## 10. Negative Confirmations

| Confirmation | Result |
|---|---|
| No records deleted (org/tenant/products) | CONFIRMED |
| No authenticated QA runtime data removed | CONFIRMED |
| No real supplier data affected | CONFIRMED — no real supplier records exist |
| No source code changes | CONFIRMED — `git diff --stat` shows only governance files |
| No schema or migration changes | CONFIRMED |
| No `.env` file changes | CONFIRMED |
| No feature flag changes | CONFIRMED |
| Mutation affected only 1 org | CONFIRMED — `UPDATE 1` |

---

## 11. Completion Checklist

- [x] Projection gates inspected
- [x] Gate B selected (least disruptive — org-level public posture only)
- [x] QA B2C org uniquely identified via composite key (slug + legal_name + jurisdiction)
- [x] Public browse before state recorded (from HD-002 evidence)
- [x] Product detail before state recorded (from HD-002 evidence)
- [x] Only QA public projection posture updated (`UPDATE 1`)
- [x] No records deleted
- [x] QA tenant/org/products still exist (DB verified)
- [x] Public browse after: `items: [], total: 0` (HTTP 200)
- [x] QA B2C absent from public browse
- [x] QA product detail returns HTTP 404 `NOT_FOUND`
- [x] Authenticated/dev QA data preservation recorded
- [x] HD-002 remains VERIFIED_FAIL — real supplier data still absent
- [x] BS-001 updated with quarantine evidence
- [x] No source/schema/env/feature flag changes
- [x] Governance evidence updated
- [x] Atomic commit created (`[BACKFILL]`)

---

## 12. Status Notes

### HD-002 posture

**HD-002 remains VERIFIED_FAIL.**

This packet removes QA public exposure. It does not introduce real Surat India supplier
or product data. The hidden dependency — that public B2C browse requires real supplier
product data — remains unresolved. HD-002 will remain VERIFIED_FAIL until:

1. HD-001 (supplier onboarding invite-token flow) is resolved for a real supplier.
2. Real supplier seeds ≥5 product catalog records with B2C public projection posture.
3. HD-002 is rechecked and real data is confirmed live.

### BS-001 posture

**BS-001 remains CONFIRMED.**

QA public projection has been quarantined (this packet). However, the risk itself — that
B2C browse was verified with QA data only, not real supplier data — is unchanged. BS-001
will remain CONFIRMED until real supplier product data is present and production-verified.

---

## 13. Next Recommended Units

| Unit | Priority | Reason |
|---|---|---|
| HD-001 invite/onboarding resolution | P0 | Required before any real supplier can onboard |
| Real supplier product seeding | P0 | Required before HD-002 can pass |
| HD-002 recheck | P0 | Required to confirm real data in production |
