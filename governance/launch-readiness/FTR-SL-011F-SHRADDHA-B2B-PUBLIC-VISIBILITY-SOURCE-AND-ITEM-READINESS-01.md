# FTR-SL-011F Shraddha B2B Public Visibility Source And Item Readiness

**Unit:** FTR-SL-011F-SHRADDHA-B2B-PUBLIC-VISIBILITY-SOURCE-AND-ITEM-READINESS-01  
**Date:** 2026-06-12  
**Status:** READINESS_COMPLETE_READY_FOR_TAXONOMY_ONLY_EXECUTION  
**Final enum:** FTR_SL_011F_SHRADDHA_B2B_PUBLIC_VISIBILITY_READINESS_COMPLETE_READY_FOR_TAXONOMY_ONLY_EXECUTION

---

## 1. Scope And Posture

Bounded readiness unit executed under read-only-first posture.

This unit performed:
- source-contract diagnosis for FTR-SL-009 taxonomy payload format
- safe runtime evidence checks for public `/b2b`
- safe route-level item-ID discovery analysis for FTR-SL-010 readiness
- exact next execution recommendation preparation

This unit did not perform:
- FTR-SL-009 production writes
- FTR-SL-010 production writes
- profile GET `/api/public/supplier/:slug`
- browser `/supplier/:slug` navigation
- catalog mutation, direct SQL, Prisma mutation commands, schema/migration/env changes

---

## 2. Repo Preflight

Commands run:

```text
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --porcelain=v1 -uno
git log --oneline -35
```

Observed:

```text
branch=main
HEAD=8eb335cd5a386fa2eafdb6c8be90e0010125d0b9
origin/main=8eb335cd5a386fa2eafdb6c8be90e0010125d0b9
status=clean
```

Preflight verdict: PASS (synced and clean).

---

## 3. Files Inspected

Governance / TLRH:
- `.github/copilot-instructions.md`
- `AGENTS.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-011E-B2B-SUPPLIER-OFFERINGS-DRAWER-IMPLEMENTATION-AND-SAFE-PREVIEW-01.md`
- `governance/launch-readiness/FTR-SL-011D-B2B-SUPPLIER-OFFERINGS-SURFACE-DESIGN-DECISION-01.md`
- `governance/launch-readiness/FTR-SL-011C-SHRADDHA-PUBLIC-PRODUCT-DISCOVERY-DESIGN-AND-GATING-01.md`
- `governance/launch-readiness/FTR-SL-011B-SHRADDHA-CANONICAL-TAXONOMY-MAPPING-AND-CATALOG-VISIBILITY-DIAGNOSIS-01.md`
- `governance/launch-readiness/FTR-SL-011A-SHRADDHA-PROFILE-DATA-ENTRY-VALUES-ADDENDUM-AND-READINESS-01.md`
- `governance/launch-readiness/FTR-SL-011-SHRADDHA-SUPPLIER-PROFILE-DATA-ENTRY-AUTHORIZATION-PACKET-01.md`
- `governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md`
- `governance/launch-readiness/FTR-SL-010-CATALOG-OFFERING-PREVIEW-PUBLICATION-POSTURE-TOOLING-01.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`

Taxonomy / source-contract:
- `server/src/routes/control.ts`
- `server/src/types/tenantProvision.types.ts`
- `server/src/routes/admin/tenantProvision.ts`
- `shared/contracts/openapi.control-plane.json`
- `config/publicIndustryClusterTaxonomy.ts`
- `server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts`
- `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts`

Catalog / visibility / read-path:
- `server/src/services/publicB2BProjection.service.ts`
- `server/src/routes/tenant.ts`
- `services/catalogService.ts`
- `server/src/__tests__/public-b2b-projection.unit.test.ts`

Public `/b2b` surfaces:
- `components/Public/B2BDiscovery.tsx`
- `services/publicB2BService.ts`
- `tests/frontend/public-b2b-discovery-regression.test.tsx`

---

## 4. Current 011E Drawer Status

011E remains intact and production-verified:
- `/b2b` card surface active
- `View offerings` drawer path in-place
- `/products` unchanged and B2C-only
- Shraddha still neutral empty state when `offeringPreview=[]`

No regression evidence found in this readiness unit.

---

## 5. Taxonomy Source-Contract Diagnosis

### 5.1 FTR-SL-009 executable validator truth

In `POST /api/control/tenants/:id/profile-completeness`:
- `primary_segment_key` and `secondary_segment_keys[*]` must match regex:
  - `^[a-z0-9][a-z0-9_-]*$`
- `role_position_keys[*]` must be one of:
  - `manufacturer`, `trader`, `service_provider`

OpenAPI mirrors this same lowercase slug-style key pattern.

### 5.2 Runtime/repo carrier inconsistency evidence

Repo contains title-case segment examples in other flows/tests (for example: `Weaving`, `Fabric Processing`, `Yarn`, `Knitting`) and public projection carries segment values as stored.

Therefore, there is a genuine style inconsistency across surfaces:
- FTR-SL-009 write validator: slug-style lowercase keys
- other runtime/test carriers: often human/title-case segment labels

### 5.3 Readiness decision on inconsistency

For immediate bounded execution readiness, this is **non-blocking** if and only if FTR-SL-009 payload uses slug-style keys.

Source correction was not implemented in this unit because:
- this readiness unit stayed docs/read-only
- no correction is required to execute bounded taxonomy update safely
- correction should be opened as a dedicated, test-backed compatibility unit if desired

---

## 6. Source Correction Decision

Decision: **No source correction in 011F**.

Reason:
- execution can proceed for taxonomy using validator-aligned slug keys
- item-ID blocker is independent and still unresolved for FTR-SL-010
- safest sequence is taxonomy-only bounded execution first, then catalog posture execution once item IDs are safely discovered

---

## 7. Canonical Executable Shraddha Taxonomy Payload

Validator-aligned canonical executable payload (FTR-SL-009):

```json
{
  "primary_segment_key": "weaving",
  "secondary_segment_keys": ["fabric_processing"],
  "role_position_keys": ["manufacturer"]
}
```

Mapping rationale:
- preserves Paresh-approved intent `WEAVING AND FABRIC PROCESSING`
- uses strict executable format required by current FTR-SL-009 validator
- keeps `trader` optional and excluded by default pending explicit wholesale/trading role confirmation at execution time

---

## 8. Shraddha Tenant/Org ID Evidence

Evidence sources inspected:
- historical control-plane activation records in governance files
- Layer-0 pointer notes in `governance/control/NEXT-ACTION.md`
- prior bounded units 011A/011B/011C/011E

Consistent ID used for Shraddha in control-plane operations:
- `0ae549d7-b17b-4277-b9f6-f3e8c3a57e09`

Readiness note:
- public `/api/public/b2b/suppliers` is slug-based and does not expose org UUID
- authenticated control/buyer read confirmation should still be performed in the execution unit before posting writes

---

## 9. Safe Item ID/State Discovery Evidence

Required discovery targets for FTR-SL-010:
- item UUID
- active
- publicationPosture
- catalogVisibilityPolicyMode
- tenant ownership

Safe production calls performed:

```text
GET /api/health                      -> 200 OK
GET /api/public/b2b/suppliers        -> 200 OK
GET /api/tenant/b2b/eligible-suppliers -> 401 UNAUTHORIZED
GET /api/tenant/catalog/supplier/{id}/items -> 401 UNAUTHORIZED
```

Read-path truth from source:
- `GET /api/tenant/b2b/eligible-suppliers` returns supplier `id` (UUID) for authenticated buyer context
- `GET /api/tenant/catalog/supplier/:supplierOrgId/items` returns item `id` and additional read-only item fields for authenticated buyer context

Conclusion:
- safe route path for item-ID discovery exists
- runtime item-ID/state discovery is blocked in this session due missing authenticated token context

---

## 10. Per-Item Catalog Visibility Table

| item name | item ID | active | publicationPosture | catalogVisibilityPolicyMode | tenant/org match | intended target posture | FTR-SL-010 needed? |
|---|---|---|---|---|---|---|---|
| SILK CREPE (WEAVE PLAIN AND JACQURD, gsm 65GRAMS & 80 GRAMS) | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | B2B_PUBLIC | UNRESOLVED_PENDING_ITEM_STATE |
| Polyester-cotton Blend Fabric - 0.14 G/m3 Density ... | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | UNRESOLVED_IN_011F | B2B_PUBLIC | UNRESOLVED_PENDING_ITEM_STATE |

Reason unresolved: authenticated read endpoints needed for UUID/state are currently unauthorized in this session.

---

## 11. FTR-SL-009 Execution Readiness Decision

Decision: **READY** for bounded taxonomy-only execution.

Conditions satisfied:
- source-contract non-blocking path established
- executable payload format fixed and validator-aligned
- tenant/org ID evidence available
- no dependency on item UUID discovery for taxonomy update

---

## 12. FTR-SL-010 Execution Readiness Decision

Decision: **NOT READY** in this unit.

Blocking condition:
- exact item UUID/state evidence could not be obtained via authenticated read paths in this session

Status: HOLD_FOR_SAFE_ITEM_ID_DISCOVERY (catalog posture step only).

---

## 13. Production Writes Performed

None.

- FTR-SL-009 write endpoint: not called
- FTR-SL-010 write endpoint: not called

---

## 14. Safe Verification Performed

Safe public verification completed:

```text
GET /api/health -> status=ok
GET /api/public/b2b/suppliers -> success=true, total=2
```

Observed Shraddha projection:
- `slug=shraddha-industries`
- `publicationPosture=B2B_PUBLIC`
- `eligibilityPosture=PUBLICATION_ELIGIBLE`
- `taxonomy.primarySegment=null`
- `taxonomy.secondarySegments=[]`
- `taxonomy.rolePositions=[]`
- `offeringPreview=[]`

Observed `lt-b2b-001` projection still includes offering preview entries.

---

## 15. `/b2b` Drawer Result For Shraddha

Current result remains expected under 011E:
- Shraddha card visible
- neutral `No public offerings yet` state remains
- no invented offerings are shown

---

## 16. Blockers And Residuals

Primary blocker for full 009+010 combined execution:
- safe item UUID/state discovery requires authenticated read context not available in this session

Residual risks:
- if taxonomy is written with slug keys, UI may display slug-style values unless later normalized by a dedicated source/presentation contract
- optional `trader` role remains a business decision point tied to wholesale/trading interpretation

---

## 17. Exact Next Execution Prompt Recommendation

Recommended immediate next unit:
- taxonomy-only execution first, then catalog-posture execution after authenticated item-ID read

Suggested prompt title:
- `FTR-SL-011F1-SHRADDHA-TAXONOMY-BOUNDED-EXECUTION-01`

Suggested bounded payload:

```json
{
  "tenantId": "0ae549d7-b17b-4277-b9f6-f3e8c3a57e09",
  "primary_segment_key": "weaving",
  "secondary_segment_keys": ["fabric_processing"],
  "role_position_keys": ["manufacturer"]
}
```

Then open:
- `FTR-SL-011F2-SHRADDHA-CATALOG-ITEM-ID-DISCOVERY-AND-POSTURE-EXECUTION-01`
- pre-step: authenticated read-only calls to obtain exact item UUID/state table
- execution step: FTR-SL-010 only for items not already `B2B_PUBLIC` or `BOTH`

---

## 18. Tracker Updates

Tracker updated in this unit:
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- new latest bounded update line added for FTR-SL-011F outcome and status

---

## 19. Adjacent Findings And Disposition

1. Adjacent finding: mixed segment style (slug-style vs title-case) across flows can create display inconsistency.  
Disposition: deferred as separate follow-up source-contract normalization unit; not merged into 011F execution path.

2. Adjacent finding: no unauth public route exposes catalog item UUIDs (intentional public-safety design).  
Disposition: accepted; use authenticated read-only buyer/control path in next execution unit.

3. Adjacent finding: `lt-b2b-001` still present and correctly labeled demo/pilot.  
Disposition: preserve as-is; no changes in this unit.

---

## 20. Validation Run

Commands run:

```text
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --porcelain=v1 -uno
git log --oneline -35
curl -i -s https://app.texqtic.com/api/health
curl -i -s https://app.texqtic.com/api/public/b2b/suppliers
curl -i -s https://app.texqtic.com/api/tenant/b2b/eligible-suppliers
curl -i -s https://app.texqtic.com/api/tenant/catalog/supplier/0ae549d7-b17b-4277-b9f6-f3e8c3a57e09/items
```

Result summary:
- preflight: PASS
- health: PASS (200)
- safe public projection read: PASS (200)
- authenticated read probes: blocked by expected 401 unauthorized in this session

---

## 21. Final Readiness Classification

`FTR_SL_011F_SHRADDHA_B2B_PUBLIC_VISIBILITY_READINESS_COMPLETE_READY_FOR_TAXONOMY_ONLY_EXECUTION`
