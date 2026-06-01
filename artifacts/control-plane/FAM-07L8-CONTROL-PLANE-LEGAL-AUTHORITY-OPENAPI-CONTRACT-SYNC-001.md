# FAM-07L8 — Control Plane Legal Authority OpenAPI Contract Sync

**Artifact ID:** FAM-07L8-CONTROL-PLANE-LEGAL-AUTHORITY-OPENAPI-CONTRACT-SYNC-001  
**Unit:** FAM-07L8  
**Branch:** main  
**Date:** 2025-07-11  
**Status:** COMPLETE  
**Final Enum:** `FAM_07L8_OPENAPI_CONTRACT_SYNC_COMPLETE`

---

## 1. Task Summary

Sync the control-plane OpenAPI contract (`shared/contracts/openapi.control-plane.json`) to reflect the canonical nested shape of `consent_scaffold_observability.authority_record` as deployed in L5 (implementation), aligned in L6 (shape correction), and verified in L7 (runtime confirmation).

---

## 2. Preflight Evidence

**Working tree state before any edits:**
```
git status --short  →  (empty — clean tree)
git rev-parse --short HEAD  →  8f911e8e
```

**Ancestry verification (all exit code 0):**
```
8f911e8e(L7): 0
ec501e02(L6): 0
9cb27c64(L5): 0
6172bfc3(L4): 0
be0e23d1(L3): 0
6e819d75(L2): 0
f163bacb(L1): 0
4c8c40cc(K14): 0
```

Full FAM-07 commit lineage confirmed in HEAD.

---

## 3. Contract Files Inspected

| File | Lines | `consent_scaffold_observability` Present Before L8 |
|---|---|---|
| `shared/contracts/openapi.control-plane.json` | 3,611 | **No** |
| `shared/contracts/openapi.tenant.json` | 5,200 | **No** |

**Determination:** `consent_scaffold_observability` was absent from both contracts. The tenant contract (`openapi.tenant.json`) is not updated — this field is a control-plane diagnostic surface only, not exposed via tenant-plane endpoints.

---

## 4. Schema Location

`consent_scaffold_observability` was added to `TenantObject.properties` in `shared/contracts/openapi.control-plane.json`.

`TenantObject` is the shared schema used by:
- `GET /api/control/tenants` (list endpoint) — `$ref: "#/components/schemas/TenantObject"` (line 111)
- `GET /api/control/tenants/{id}` (detail endpoint) — `$ref: "#/components/schemas/TenantObject"` (line 360)

`consent_scaffold_observability` is marked `nullable: true` and is not in `required`, reflecting that it is only populated on the detail endpoint response.

---

## 5. Changes Made

**File modified:** `shared/contracts/openapi.control-plane.json`  
**Diff summary:** 85 insertions, 0 deletions (single-file change)

**Schema added to `TenantObject.properties`:**

```json
"consent_scaffold_observability": {
  "type": "object",
  "nullable": true,
  "description": "Legal consent scaffold diagnostic surface. Present only on detail endpoint (GET /api/control/tenants/{id}). Absent on list endpoint. Contains legal authority diagnostic for the supplier onboarding terms package.",
  "properties": {
    "has_records": {
      "type": "boolean",
      "description": "True when at least one consent snapshot or consent event record exists for this tenant."
    },
    "has_legal_approved_record": {
      "type": "boolean",
      "description": "True when at least one consent record exists with legal_approved_transition_allowed=true."
    },
    "latest_snapshot": {
      "type": "object",
      "nullable": true,
      "description": "Most recent consent snapshot record, or null if none exists."
    },
    "recent_events": {
      "type": "array",
      "items": { "type": "object" },
      "description": "Recent consent event records (newest-first). Empty array when no events exist."
    },
    "authority_record": {
      "type": "object",
      "nullable": false,
      "description": "Legal authority diagnostic. present=false with blocking_reason_code=AUTHORITY_FILE_ABSENT while governance/legal/fam-07/supplier-onboarding-terms-authority.json is absent. legal_approved_transition_allowed=false blocks consent scaffold activation.",
      "properties": {
        "present": { "type": "boolean" },
        "status": {
          "type": "string",
          "nullable": true,
          "enum": ["DRAFT", "APPROVED_FOR_RUNTIME", "SUPERSEDED", "REVOKED", null]
        },
        "package_version": { "type": "string", "nullable": true },
        "source_url": { "type": "string", "nullable": true },
        "env_match": { "type": "boolean", "nullable": true },
        "legal_approved_transition_allowed": { "type": "boolean" },
        "blocking_reason_code": {
          "type": "string",
          "nullable": true,
          "enum": [
            "AUTHORITY_FILE_ABSENT",
            "AUTHORITY_FILE_PARSE_ERROR",
            "AUTHORITY_FIELD_MISSING",
            "AUTHORITY_FIELD_INVALID",
            "AUTHORITY_FIELD_LENGTH_EXCEEDED",
            "AUTHORITY_STATUS_DRAFT",
            "AUTHORITY_STATUS_SUPERSEDED",
            "AUTHORITY_STATUS_REVOKED",
            "AUTHORITY_ENV_MISMATCH",
            null
          ]
        }
      },
      "required": ["present", "legal_approved_transition_allowed"]
    }
  }
}
```

---

## 6. Runtime Baseline (from L7 — FAM-07L7 artifact)

Tenant: `QA K5 Submit 2026-05-31T10-26-17-932Z` (CLOSED QA test tenant — non-customer)  
Endpoint: `GET /api/control/tenants/{id}` — HTTP 200  
Token: `texqtic_admin_token` (Bearer, not logged)

**Observed runtime shape that this contract now documents:**

```json
{
  "consent_scaffold_observability": {
    "has_records": false,
    "has_legal_approved_record": false,
    "latest_snapshot": null,
    "recent_events": [],
    "authority_record": {
      "present": false,
      "status": null,
      "package_version": null,
      "source_url": null,
      "env_match": null,
      "legal_approved_transition_allowed": false,
      "blocking_reason_code": "AUTHORITY_FILE_ABSENT"
    }
  }
}
```

**Tenant top-level keys verified in L7 (no sibling `authority_record`):**
`id, slug, name, type, status, plan, createdAt, updatedAt, isWhiteLabel,
externalOrchestrationRef, publicEligibilityPosture, domains, branding,
aiBudget, memberships, tenant_category, primary_segment_key,
secondary_segment_keys, role_position_keys, base_family,
aggregator_capability, white_label_capability, commercial_plan,
onboarding_status, consent_scaffold_observability`

---

## 7. Validation Evidence

**JSON validity:**
```
node -e "JSON.parse(...readFileSync('shared/contracts/openapi.control-plane.json',...)); console.log('VALID JSON')"
→ VALID JSON
```

**Schema shape programmatic check:**
```
cso type: object
authority_record type: object
ar required: [ 'present', 'legal_approved_transition_allowed' ]
ar blocking_reason_code enum count: 10
ar status enum: [ 'DRAFT', 'APPROVED_FOR_RUNTIME', 'SUPERSEDED', 'REVOKED', null ]
SCHEMA SHAPE OK
```

**Diff scope check:**
```
git diff --name-only  →  shared/contracts/openapi.control-plane.json
git diff --stat       →  1 file changed, 85 insertions(+)
git status --short    →   M shared/contracts/openapi.control-plane.json
```

No source files, test files, schema files, migration files, or governance trackers touched. Contract-only change confirmed.

---

## 8. Forbidden Fields — Confirmed Absent

The following were explicitly excluded per L8 scope constraints:

| Field | Status |
|---|---|
| `packageHash` / `package_hash` | Not present |
| Raw `CONSENT_SCAFFOLD_EXPECTED_*` env values | Not present |
| `LEGAL_APPROVED`, `ACCEPTED_FINAL`, `ADMIN_REVIEW` status values | Not present |
| Auth headers / cookies | Not present |
| DB URLs | Not present |

---

## 9. Files Not Modified (per L8 constraints)

| File | Status |
|---|---|
| `server/src/routes/control.ts` | Not modified |
| `server/src/routes/tenant.ts` | Not modified |
| `server/src/lib/legalPackageAuthority.ts` | Not modified |
| `server/src/__tests__/control-onboarding-outcome.integration.test.ts` | Not modified |
| `server/src/__tests__/fam-07l5-legal-package-authority.test.ts` | Not modified |
| `shared/contracts/openapi.tenant.json` | Not modified (no control-plane diagnostic in tenant contract) |
| `governance/legal/fam-07/` | Not created |
| Authority record JSON | Not created |

---

## 10. FAM-07 Governance Status (UNCHANGED)

| Item | Status | Notes |
|---|---|---|
| FAM-07 | OPEN — legal inputs pending | No authority file exists; `present: false` in runtime |
| FTR-LEGAL-003 | OPEN | Depends on FAM-07 authority file creation |
| HD-001 | OPEN | Legal gate not cleared |
| Consent scaffold activation | BLOCKED | `legal_approved_transition_allowed: false` at runtime |

These statuses are unchanged by L8. This unit documents the existing deployed diagnostic shape; it does not advance legal gate clearance.

---

## 11. FAM-07 Commit Lineage

| Unit | Commit | Description |
|---|---|---|
| K14 | `4c8c40cc` | Prior baseline |
| L1 | `f163bacb` | |
| L2 | `6e819d75` | |
| L3 | `be0e23d1` | |
| L4 | `6172bfc3` | |
| L5 | `9cb27c64` | `legalPackageAuthority.ts` loader + 18 tests |
| L6 | `ec501e02` | `authority_record` nested inside `consent_scaffold_observability` |
| L7 | `8f911e8e` | Runtime verification; HTTP 200; no sibling deviation |
| **L8** | **TBD** | OpenAPI contract sync (this unit) |

---

## 12. Recommended Next Unit

Legal inputs still pending (authority file not yet created). Recommended next unit:

**`FAM-07L9-SAFE-NONLEGAL-FAM07-NEXT-ACTION-SELECTION-001`**

Scope: Evaluate safe non-legal-dependent work that can advance FAM-07 readiness while awaiting authority file from legal/product.

---

## 13. Final Enum

`FAM_07L8_OPENAPI_CONTRACT_SYNC_COMPLETE`
