# FTR-SL-011B Shraddha Canonical Taxonomy Mapping And Catalog Visibility Diagnosis

**Unit:** `FTR-SL-011B-SHRADDHA-CANONICAL-TAXONOMY-MAPPING-AND-CATALOG-VISIBILITY-DIAGNOSIS-01`
**Date:** 2026-06-11
**Status:** `DIAGNOSIS_COMPLETE_HOLD_FOR_TAXONOMY_SOURCE_CORRECTION`
**Final enum:** `FTR_SL_011B_SHRADDHA_TAXONOMY_AND_CATALOG_VISIBILITY_DIAGNOSIS_COMPLETE_HOLD_FOR_TAXONOMY_SOURCE_CORRECTION`

---

## 1. Scope And Posture

This unit is a bounded read-only diagnosis for two Shraddha launch-readiness blockers:

1. canonical executable taxonomy / role mapping for Shraddha Industries; and
2. why Shraddha's manually added products appear in the authenticated Browse Suppliers / buyer catalog surface but do not appear in safe public `/b2b` offering preview evidence.

Default posture remained read-only / docs-only throughout this unit.

Explicit non-actions in this unit:

- no FTR-SL-009 write call
- no FTR-SL-010 write call
- no production catalog mutation
- no quote request / inquiry / profile GET
- no `/supplier/:slug` navigation
- no schema / route / source behavior changes

---

## 2. Repo Preflight

Mandatory preflight results:

```text
branch=main
HEAD=ec2045cfaf57e9c0123b61c81275540487a68638
origin/main=ec2045cfaf57e9c0123b61c81275540487a68638
git status --porcelain=v1 -uno: [no output]
git diff --name-only: [no output]
```

Recent history confirmed FTR-SL-011A was present locally and remotely:

```text
ec2045cf docs(launch): add Shraddha profile values readiness addendum
090cb79f docs(launch): prepare Shraddha profile data entry authorization
0b554c2a docs(launch): verify catalog posture tooling neighbor paths
8993aab0 launch: add catalog offering preview posture tooling
c77be004 launch: add supplier profile completeness tooling
```

Preflight verdict: clean worktree, synced branch, no unexpected modified files, no production mutation during preflight.

---

## 3. Files Inspected

Governance / TLRH:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-011A-SHRADDHA-PROFILE-DATA-ENTRY-VALUES-ADDENDUM-AND-READINESS-01.md`
- `governance/launch-readiness/FTR-SL-011-SHRADDHA-SUPPLIER-PROFILE-DATA-ENTRY-AUTHORIZATION-PACKET-01.md`
- `governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md`
- `governance/launch-readiness/FTR-SL-010-CATALOG-OFFERING-PREVIEW-PUBLICATION-POSTURE-TOOLING-01.md`
- `governance/launch-readiness/VERIFY-FTR-SL-010-POST-DEPLOY-NEIGHBOR-PATH-SMOKE-01.md`
- `governance/launch-readiness/FTR-SL-008-FIRST-REAL-SUPPLIER-COHORT-PROFILE-DATA-COMPLETION-01.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`

Catalog / projection / taxonomy surfaces:

- `server/src/services/publicB2BProjection.service.ts`
- `server/src/routes/control.ts`
- `shared/contracts/openapi.control-plane.json`
- `server/src/types/tenantProvision.types.ts`
- `server/src/routes/admin/tenantProvision.ts`
- `server/src/routes/tenant.ts`
- `services/catalogService.ts`
- `App.tsx`
- `components/Tenant/CatalogPdpSurface.tsx`
- `config/publicIndustryClusterTaxonomy.ts`
- `server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts`
- `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts`
- `server/src/__tests__/public-b2b-projection.unit.test.ts`
- `tests/runtime-verification-tenant-enterprise.test.ts`
- `docs/TECS-B2B-BUYER-CATALOG-BROWSE-001-v1.md`

Safe runtime evidence:

- `GET https://app.texqtic.com/api/public/b2b/suppliers`
- safe `/b2b` browser snapshot only
- Paresh-provided authenticated screenshot evidence as human-supplied context only

---

## 4. Browse Suppliers False-Alarm Disposition

The earlier Browse Suppliers failure is treated as a **false alarm / no-code disposition**.

Per Paresh clarification:

- the earlier Browse Suppliers issue was caused by the page not being saved
- the authenticated Browse Suppliers / catalog workspace now shows Shraddha products
- no `HOTFIX-BROWSE-SUPPLIERS-LIST-REGRESSION-01` should be opened or implemented

This unit preserves that as contextual governance truth only. No code change or hotfix work was merged into this diagnosis.

---

## 5. Paresh Values Preserved

Paresh-provided Shraddha values remain preserved exactly from FTR-SL-011A:

- Primary segment intent: `MANUFACTURER - WEAVING AND FABRIC PROCESSING`
- Secondary segments intent: `WHOLESALE/TRADING`
- Role positions intent: `WEAVING AND FABRIC PROCESSING`
- Offering 1 posture intent: `B2B_PUBLIC`
- Offering 2 posture intent: `B2B_PUBLIC`
- Certification posture: keep blank / not claimed for launch
- Traceability posture: no traceability evidence to publish right now
- Supplier approval: approved for public display
- Production authorization boundary: FTR-SL-009 + FTR-SL-010 only; no broader production mutation authority

---

## 6. Safe Public Directory Evidence

Safe production read executed in this unit:

```text
GET https://app.texqtic.com/api/public/b2b/suppliers
HTTP 200
success=true
total=2
```

Observed `shraddha-industries` entry:

```json
{
  "slug": "shraddha-industries",
  "legalName": "Shraddha Industries",
  "orgType": "B2B",
  "jurisdiction": "Surat, Gujarat",
  "certificationCount": 0,
  "certificationTypes": [],
  "hasTraceabilityEvidence": false,
  "taxonomy": {
    "primarySegment": null,
    "secondarySegments": [],
    "rolePositions": []
  },
  "offeringPreview": [],
  "publicationPosture": "B2B_PUBLIC",
  "eligibilityPosture": "PUBLICATION_ELIGIBLE"
}
```

Safe public findings:

- Shraddha remains public / eligible at org level.
- Shraddha still has `offeringPreview: []`.
- Shraddha still has no primary segment, no secondary segments, and no role positions in public output.
- `lt-b2b-001` still shows offering preview items, proving the public projection path is functioning generally.

Safe `/b2b` visual check remained consistent with the API result:

- Shraddha card visible
- no product/service examples section on Shraddha card
- no error flash observed

---

## 7. Authenticated Catalog / Browse Suppliers Evidence

### 7A. Exact route / component that renders the authenticated Browse Suppliers surface

The authenticated Browse Suppliers surface is rendered from the `buyer_catalog` route key in:

- `App.tsx`

Two-phase UI truth from source:

- Phase A: supplier picker with heading `Browse Suppliers` and sub-copy `Select a supplier to browse their catalog and request quotes.`
- Phase B: selected supplier catalog grid with sub-copy `Browse active catalog items and request quotes.`

The supplier picker is loaded by:

- `handleLoadSupplierPicker()` in `App.tsx`
- service call `getEligibleSuppliers()` from `services/catalogService.ts`
- route `GET /api/tenant/b2b/eligible-suppliers`

The selected supplier catalog grid is loaded by:

- `handleFetchBuyerCatalog(...)` in `App.tsx`
- service call `getBuyerCatalogItems(supplierOrgId, params)` from `services/catalogService.ts`
- route `GET /api/tenant/catalog/supplier/:supplierOrgId/items`

### 7B. Match to Paresh screenshot

The source path above clearly explains the `Request Quote` and `View Details` controls in Paresh's screenshot.

One nuance:

- the exact literal text `Item No. 4005` was **not** found in the inspected source
- the current buyer-catalog card renders `SKU: {item.sku}` instead

Diagnosis:

- the screenshot most likely comes from the authenticated buyer catalog Phase B surface or a very nearby runtime variant of it
- the exact `Item No.` label was not independently reproduced from inspected source text in this unit

### 7C. User-provided authenticated evidence used in this unit

Paresh-provided screenshot evidence states the authenticated Shraddha catalog now shows at least:

- `Item No. 4005`
- `SILK CREPE`
- `Request Quote`
- `View Details`

This unit treats that screenshot as valid human-supplied evidence that authenticated catalog items exist, while separately relying on repo code to explain why those items may still be absent from public offering preview.

### 7D. Safe direct authenticated runtime read limitation

This unit did **not** capture a live authenticated buyer-catalog API response with item UUIDs because:

- no authenticated buyer-catalog page was shared directly into the browser tools
- opening app root redirected back to public `/b2b` in the available browser session
- no write-producing or uncertain authenticated route was called blindly

So item UUIDs and exact live item-state fields remain partially unresolved in this unit.

---

## 8. Catalog Visibility Diagnosis Table

| Item / evidence row | Item ID / UUID safely known | active state | publicationPosture | catalogVisibilityPolicyMode | tenant / org match | appears in authenticated catalog? | appears in public offeringPreview? | blocker classification |
|---|---|---|---|---|---|---|---|---|
| `SILK CREPE` (Paresh screenshot evidence) | NO — only `Item No. 4005` human-visible label, no UUID captured | LIKELY `true` because buyer-catalog route filters `active = true` | UNKNOWN live value | UNKNOWN live value | LIKELY Shraddha-owned because buyer-catalog route filters `tenantId = supplierOrgId` | YES — user-reported screenshot evidence | NO — absent from safe public directory evidence | Likely per-item public posture mismatch, but UUID/state still needs safe read confirmation |
| `Polyester-cotton Blend Fabric ...` (Paresh authorization input) | NO | UNKNOWN direct evidence; likely present per Paresh update, not independently observed in runtime tools | UNKNOWN live value | UNKNOWN live value | UNKNOWN direct evidence, but intended Shraddha ownership | REPORTED YES by Paresh manual-update statement | NO — absent from safe public directory evidence | Same likely posture mismatch or item-state mismatch; safe item discovery still needed |

### 8A. Why authenticated catalog can show items while public offering preview does not

This unit resolved the core route-level difference.

Authenticated buyer catalog route in `server/src/routes/tenant.ts`:

- Gate 1: supplier org must be `B2B_PUBLIC` or `BOTH` and tenant must be `PUBLICATION_ELIGIBLE`
- Gate 2: item must have `tenantId = supplierOrgId` and `active = true`
- per-item filter excludes only `publicationPosture = 'B2C_PUBLIC'`
- item-level `publicationPosture` is **not** used as a public-access gate for Browse Suppliers Phase 1

Public B2B offering preview projection in `server/src/services/publicB2BProjection.service.ts`:

- item must have `active = true`
- item must have `publicationPosture IN ('B2B_PUBLIC', 'BOTH')`

Therefore:

- an item can legitimately appear in authenticated Browse Suppliers and still be absent from public `offeringPreview`
- the most likely reason is that the item remains `PRIVATE_OR_AUTH_ONLY` rather than `B2B_PUBLIC` / `BOTH`

### 8B. Catalog visibility diagnosis answer

Most likely diagnosis from code + safe evidence:

- the Shraddha items probably exist
- they are probably active
- they likely belong to Shraddha
- they likely do **not** yet satisfy public per-item posture requirements for `offeringPreview`

Public projection does **not** look blocked by a general frontend regression.

---

## 9. Canonical Taxonomy / Role Findings

### 9A. Role keys are exact and stable

From `server/src/types/tenantProvision.types.ts` and `server/src/routes/control.ts`:

- `manufacturer`
- `trader`
- `service_provider`

That means:

- `MANUFACTURER` clearly maps to role key `manufacturer`
- `WHOLESALE/TRADING` can plausibly map to business role `trader`
- `WEAVING AND FABRIC PROCESSING` is not itself a valid role key

### 9B. Segment-key contract is inconsistent with broader repo truth

FTR-SL-009 route contract currently enforces:

- lowercase slug-style regex: `^[a-z0-9][a-z0-9_-]*$`

But production/runtime and broader repo truth show title-case carrier values such as:

- `Weaving`
- `Fabric Processing`

Supporting evidence from repo truth includes:

- `tests/runtime-verification-tenant-enterprise.test.ts`
- `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts`
- governance audit evidence showing production `/api/me` taxonomy anchors with `Weaving` / `Fabric Processing`

Diagnosis:

- this is not just a Paresh-input ambiguity
- it is a **source-contract mismatch** between the new FTR-SL-009 route validator and pre-existing canonical/runtime taxonomy truth

### 9C. Wholesale / Trading interpretation

Current best interpretation from repo truth:

- `WHOLESALE/TRADING` should primarily be represented as role key `trader`
- there is no sufficiently authoritative executable segment-key source proving it should also become a taxonomy segment in this unit

---

## 10. Recommended FTR-SL-009 Payload

### 10A. Business-level mapping recommendation

Best business-level mapping from current repo truth:

```json
{
  "primary_segment_key": "Weaving",
  "secondary_segment_keys": ["Fabric Processing"],
  "role_position_keys": ["manufacturer", "trader"]
}
```

Alternative if Paresh wants wholesale/trading treated as business intent but **not** an explicit role:

```json
{
  "primary_segment_key": "Weaving",
  "secondary_segment_keys": ["Fabric Processing"],
  "role_position_keys": ["manufacturer"]
}
```

### 10B. Executable payload safety verdict

This is **not yet safe to execute** through the current FTR-SL-009 route because the route validator currently rejects title-case segment values.

So the recommended FTR-SL-009 payload is:

- **business mapping ready**
- **execution blocked pending taxonomy source correction or explicit validator/contract decision**

### 10C. Confidence / confirmation

| Field | Recommendation | Confidence | Paresh confirmation still required? |
|---|---|---|---|
| `primary_segment_key` | `Weaving` | MEDIUM-HIGH for business truth, LOW for current executable route safety | YES |
| `secondary_segment_keys` | `['Fabric Processing']` | MEDIUM-HIGH for business truth, LOW for current executable route safety | YES |
| `role_position_keys` | `['manufacturer']` minimum; `trader` optional | HIGH for `manufacturer`, MEDIUM for `trader` | YES for whether `trader` should be included |

---

## 11. Recommended FTR-SL-010 Payload, If Needed

### 11A. Tenant ID

Existing governance evidence in `governance/control/NEXT-ACTION.md` records Shraddha tenant / org id as:

`0ae549d7-b17b-4277-b9f6-f3e8c3a57e09`

### 11B. Item IDs

Exact item UUIDs were **not safely discovered in this unit**.

So the FTR-SL-010 payload cannot yet be completed.

### 11C. Target posture

If the two Shraddha items are confirmed to be the intended public-safe offerings, the likely target posture is:

`B2B_PUBLIC`

because:

- Paresh explicitly authorized `B2B_PUBLIC` for both offerings
- public projection requires `B2B_PUBLIC` or `BOTH`
- buyer-catalog visibility already suggests the items are usable in authenticated browse

### 11D. Payload readiness table

| Field | Value | Confidence | Paresh confirmation still required? |
|---|---|---|---|
| tenant ID | `0ae549d7-b17b-4277-b9f6-f3e8c3a57e09` | HIGH | NO |
| item IDs | unknown in this unit | NONE | YES / safe discovery required |
| target publicationPosture | `B2B_PUBLIC` | HIGH | NO |

### 11E. FTR-SL-010 readiness verdict

Likely needed, but not yet executable because item UUIDs were not safely captured.

---

## 12. Missing Values Or Blockers

### Blocker 1 — FTR-SL-009 taxonomy source correction

Current blocker:

- executable route validator currently conflicts with broader production/runtime taxonomy truth

Effect:

- FTR-SL-009 payload is not safely executable yet even though business mapping is clearer now

### Blocker 2 — Safe item ID discovery

Current blocker:

- item UUIDs for Shraddha offerings were not safely captured in this unit

Effect:

- FTR-SL-010 cannot yet be executed even though public posture correction is the leading diagnosis

### Not a current blocker anymore

- general Browse Suppliers regression

That earlier concern is now treated as a false alarm / no-code context item.

---

## 13. Readiness Decision

This unit is **not ready for bounded execution yet**.

Diagnosis outcome:

- catalog visibility diagnosis is substantially resolved: public absence is most likely explained by per-item public posture mismatch rather than missing products
- taxonomy mapping is **not** safely executable because the route contract itself appears inconsistent with existing canonical/runtime values

Therefore the governing decision for this unit is:

**Hold for taxonomy source correction.**

Secondary blocker remains:

- safe item ID discovery for the exact FTR-SL-010 payload

---

## 14. Exact Next Prompt Recommendation

Recommended next unit:

`FTR-SL-011C-SHRADDHA-TAXONOMY-SOURCE-CORRECTION-AND-SAFE-ITEM-ID-DISCOVERY-01`

Recommended scope:

1. decide and document the authoritative executable segment-key contract for FTR-SL-009:
   - either align route validation to existing title-case canonical/runtime values
   - or prove an authoritative slug-style segment registry and a safe display mapping
2. perform a safe read-only Shraddha catalog item discovery step to obtain exact item UUIDs and current item state
3. prepare the exact bounded execution payloads for:
   - FTR-SL-009 taxonomy update
   - FTR-SL-010 item posture update

Only after that unit should the execution prompt be opened.

---

## 15. Tracker Updates

This diagnosis updates tracker posture as follows:

- FTR-SL-009 remains `IMPLEMENTED_PENDING_AUTHORIZED_DATA_ENTRY`
- FTR-SL-010 remains `IMPLEMENTED_PENDING_AUTHORIZED_CATALOG_DATA_ENTRY`
- FTR-SL-011A remains historical truth: `BLOCKED_PRODUCT_VISIBILITY_NOT_VERIFIED` at the time it ran
- FTR-SL-011B new status: `DIAGNOSIS_COMPLETE_HOLD_FOR_TAXONOMY_SOURCE_CORRECTION`

No change to `NEXT-ACTION.md` or `OPEN-SET.md` is required because Layer 0 pointer truth does not change from this bounded diagnosis unit.

---

## 16. Adjacent Findings And Disposition

### Finding 1 — Browse Suppliers false alarm is a no-code governance disposition

Disposition:

- record as false alarm / no-code context only
- do not open or implement a hotfix unit

Owner:

- resolved in governance context only

### Finding 2 — FTR-SL-009 route validator likely conflicts with established taxonomy carriers

Disposition:

- register as explicit follow-up source-contract correction / confirmation issue
- do not patch route behavior in this diagnosis unit

Owner:

- next bounded diagnosis / design unit

### Finding 3 — Shraddha item UUIDs remain undiscovered

Disposition:

- register as safe read-only discovery prerequisite for any FTR-SL-010 execution

Owner:

- next bounded diagnosis / design unit

No adjacent finding is left only as prose.

---

## 17. Final Enum

`FTR_SL_011B_SHRADDHA_TAXONOMY_AND_CATALOG_VISIBILITY_DIAGNOSIS_COMPLETE_HOLD_FOR_TAXONOMY_SOURCE_CORRECTION`

---

## 18. Summary

What this unit resolved:

- the authenticated Browse Suppliers surface was identified and traced end-to-end
- the backing buyer-catalog API was identified
- the route-level reason for authenticated/public divergence was isolated
- Shraddha public offering absence is now most likely a per-item posture issue, not a missing-product issue
- taxonomy business mapping is clearer, but the route contract still conflicts with established runtime values

What still blocks execution:

- FTR-SL-009 executable taxonomy source correction / contract decision
- safe item UUID discovery for the exact FTR-SL-010 payload

No buyer-promotion-ready claim is made.
