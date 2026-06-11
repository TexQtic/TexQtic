# FTR-SL-011C Shraddha Public Product Discovery Design And Gating

**Unit:** `FTR-SL-011C-SHRADDHA-PUBLIC-PRODUCT-DISCOVERY-DESIGN-AND-GATING-01`
**Date:** 2026-06-11
**Status:** `DESIGN_COMPLETE_HOLD_FOR_PRODUCT_VISIBILITY_DECISION`
**Final enum:** `FTR_SL_011C_PUBLIC_PRODUCT_DISCOVERY_DESIGN_COMPLETE_HOLD_FOR_PRODUCT_VISIBILITY_DECISION`

---

## 1. Scope And Posture

This unit is a bounded repo-truth diagnosis and design pass for public product discovery behavior across:

1. `/b2b` public supplier discovery cards and supplier `offeringPreview`; and
2. `/products` public product discovery surface.

Default posture remained read-only/docs-only.

Explicit non-actions in this unit:

- no FTR-SL-009 production taxonomy write
- no FTR-SL-010 production catalog-posture write
- no production catalog create/update/delete/activation mutation
- no production `GET /api/public/supplier/:slug`
- no production `/supplier/:slug` open
- no quote request/inquiry submission
- no source code implementation changes

---

## 2. Repo Preflight

Mandatory preflight execution:

```text
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --porcelain=v1 -uno
git log --oneline -25
git diff --name-only
git status --short
```

Observed:

```text
branch=main
HEAD=425b11abb170e693fd9d3b67751fb4c517707625
origin/main=425b11abb170e693fd9d3b67751fb4c517707625
git status --porcelain=v1 -uno: [no output]
git diff --name-only: [no output]
git status --short: [no output]
```

Preflight verdict: local and origin synced at the latest FTR-SL-011B commit; clean worktree before edits.

---

## 3. Files Inspected

Governance / TLRH / prior units:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-011B-SHRADDHA-CANONICAL-TAXONOMY-MAPPING-AND-CATALOG-VISIBILITY-DIAGNOSIS-01.md`
- `governance/launch-readiness/FTR-SL-011A-SHRADDHA-PROFILE-DATA-ENTRY-VALUES-ADDENDUM-AND-READINESS-01.md`
- `governance/launch-readiness/FTR-SL-011-SHRADDHA-SUPPLIER-PROFILE-DATA-ENTRY-AUTHORIZATION-PACKET-01.md`
- `governance/launch-readiness/FTR-SL-010-CATALOG-OFFERING-PREVIEW-PUBLICATION-POSTURE-TOOLING-01.md`
- `governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md`
- `governance/launch-readiness/VERIFY-FTR-SL-010-POST-DEPLOY-NEIGHBOR-PATH-SMOKE-01.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`

Frontend routes/pages/services/config:

- `App.tsx`
- `components/Public/B2BDiscovery.tsx`
- `services/publicB2BService.ts`
- `components/Public/B2CBrowse.tsx`
- `services/publicB2CService.ts`
- `components/Public/PublicProductDetail.tsx`
- `config/publicReferenceB2B.ts`
- `config/publicReferenceB2C.ts`
- `components/Public/ReferencePreviewNotice.tsx`
- `tests/frontend/public-reference-preview-config.test.ts`

Backend routes/services/tests/contracts:

- `server/src/routes/public.ts`
- `server/src/services/publicB2BProjection.service.ts`
- `server/src/services/publicB2CProjection.service.ts`
- `server/src/routes/tenant.ts`
- `server/src/routes/control.ts`
- `shared/contracts/openapi.control-plane.json`
- `server/src/__tests__/public-b2b-projection.unit.test.ts`
- `server/src/__tests__/public-b2c-projection.unit.test.ts`

---

## 4. Screenshot Clarification And Core Question

Paresh clarification and screenshot truths were interpreted as:

1. `/b2b`: Shraddha supplier card is present, but no product/service examples.
2. `/products`: page is currently showing clearly labeled reference/demo product preview language and cards.
3. Authenticated Browse Suppliers/catalog shows Shraddha items (for example, SILK CREPE / Item No. 4005).

Core design question:

- Should Shraddha approved products appear on `/b2b`, `/products`, and any other public discovery surfaces now?

Repo-truth answer from this unit:

- `/b2b`: **Yes**, Shraddha offerings should appear when item-level public gates are satisfied.
- `/products`: **Not under current architecture for Shraddha**, because current `/products` live projection is B2C-storefront scoped.

---

## 5. Current `/b2b` Truth

### 5A. Runtime evidence (safe read)

```text
GET https://app.texqtic.com/api/public/b2b/suppliers
HTTP 200
success=true
total=2
```

Observed payload highlights:

- `shraddha-industries` present
- `shraddha-industries.publicationPosture='B2B_PUBLIC'`
- `shraddha-industries.eligibilityPosture='PUBLICATION_ELIGIBLE'`
- `shraddha-industries.offeringPreview=[]`
- `lt-b2b-001.offeringPreview` contains sample items

### 5B. UI truth

Safe visual `/b2b` check confirms:

- page loads and renders
- Shraddha card visible
- Shraddha card still does not show `Product/service examples`
- no profile click was executed

### 5C. Source truth

- `components/Public/B2BDiscovery.tsx` renders product/service examples only when `supplier.offeringPreview.length > 0`.
- `server/src/services/publicB2BProjection.service.ts` builds `offeringPreview` only from catalog items that are:
  - `active=true`
  - `publicationPosture IN ('B2B_PUBLIC','BOTH')`
  - tenant-owned by an org that passes B2B public projection gates.

Conclusion for `/b2b`:

- Current blocker is item-level public inclusion for Shraddha offerings (not a generic page regression).

---

## 6. Current `/products` Truth

### 6A. Runtime evidence (safe read)

```text
GET https://app.texqtic.com/api/public/b2c/products
HTTP 200
{"success":true,"data":{"items":[],"total":0,"page":1,"limit":20}}
```

### 6B. UI truth

Safe visual `/products` check confirms:

- page enters `Reference product discovery` mode
- `Reference product preview` notice is shown
- copy includes:
  - `Reference preview - see how this works before your business goes live.`
  - `Not a live commercial offer`
  - `Live profiles/products replace examples as businesses onboard.`
- reference cards are rendered from static reference config data.

### 6C. Source truth

- `App.tsx` maps `/products` to `PUBLIC_B2C_BROWSE` and renders `B2CBrowsePage`.
- `components/Public/B2CBrowse.tsx` calls `getPublicB2CProducts()` and sets:
  - `usingReferencePreview = !loading && !error && storefronts.length === 0`
- when `usingReferencePreview=true`, it renders static `config/publicReferenceB2C.ts` examples.
- `server/src/routes/public.ts` endpoint `/api/public/b2c/products` is read-only and returns `listPublicB2CProducts(...)`.
- `server/src/services/publicB2CProjection.service.ts` live projection requires:
  - org `org_type='B2C'`
  - org `publication_posture IN ('B2C_PUBLIC','BOTH')`
  - tenant `publicEligibilityPosture='PUBLICATION_ELIGIBLE'`
  - item `active=true`
  - item `publicationPosture IN ('B2C_PUBLIC','BOTH')`

Conclusion for `/products`:

- It is a **hybrid surface**: live-capable B2C projection with reference fallback when no live B2C items exist.
- It is **not currently a B2B supplier product surface**.

---

## 7. Authenticated Browse Suppliers Truth

From `server/src/routes/tenant.ts` and prior 011B trace:

- Authenticated buyer catalog route (`GET /api/tenant/catalog/supplier/:supplierOrgId/items`) checks supplier org-level eligibility, then returns item rows where:
  - `tenantId = supplierOrgId`
  - `active=true`
  - `publicationPosture != 'B2C_PUBLIC'`
- This authenticated path can include items that do not satisfy public `/b2b` preview posture gate.

Therefore:

- Authenticated visibility and public `/b2b` preview visibility are intentionally different.

---

## 8. Public Product Visibility Architecture Table

| Surface | Route/component | Data source | Live-data support | Reference fallback | Required gates | Current Shraddha visibility | Intended launch behavior |
|---|---|---|---|---|---|---|---|
| Public supplier discovery | `/b2b` -> `PUBLIC_B2B_DISCOVERY` -> `B2BDiscoveryPage` | `GET /api/public/b2b/suppliers` -> `listPublicB2BSuppliers` | YES | YES (`config/publicReferenceB2B.ts`) when API returns zero items | Supplier: B2B org + eligible + public posture + non-sentinel. Item: `active=true` and `publicationPosture in (B2B_PUBLIC,BOTH)` for preview rows | Shraddha card visible; `offeringPreview=[]` | Real Shraddha offering examples should appear after authorized item posture/state alignment |
| Public product discovery | `/products` -> `PUBLIC_B2C_BROWSE` -> `B2CBrowsePage` | `GET /api/public/b2c/products` -> `listPublicB2CProducts` | YES (B2C scope) | YES (`config/publicReferenceB2C.ts`) when API returns zero storefronts | Org-level B2C posture/eligibility + item-level B2C posture and active state | Shraddha not visible (B2B supplier not eligible for this projection) | Keep as B2C live/fallback unless product decision expands to cross-type discovery |
| Public product detail | `/product/:slug` -> `PublicProductDetail` | `GET /api/public/b2c/products/:slug` -> `getPublicB2CProductBySlug` | YES (B2C scope) | YES by reference slug fallback (`config/publicReferenceB2C.ts`) on 404 | Same B2C eligibility gates; slug must resolve | No Shraddha product detail in current B2C projection | Remains B2C under current architecture |
| Public supplier profile | `/supplier/:slug` -> `PublicSupplierProfile` | `GET /api/public/supplier/:slug` | YES | YES (reference profile fallback by slug in frontend) | B2B public projection gates | Not called in this unit due FTR-SL-007 write-side effect guardrail | Keep guardrail-aware verification posture |

---

## 9. Public-Safe Real Product Field Policy (Design)

For real product cards on public discovery surfaces, use public-safe minimum fields:

Allowed (B2B-safe minimum):

1. product name
2. MOQ label/value
3. image URL
4. supplier display name
5. jurisdiction
6. taxonomy/category label

Disallowed on B2B public discovery:

1. private pricing
2. contact details
3. buyer-specific policy data
4. private supplier/customer data
5. negotiation/order/payment/internal workflow fields

Current architecture note:

- `/products` B2C projection currently allows public price label by design for B2C storefront context.
- If `/products` is expanded to include B2B supplier products, a separate field-policy decision is required (recommended default: no pricing for B2B catalog previews).

---

## 10. Shraddha Visibility Blocker Classification

### 10A. `/b2b` blocker

Primary blocker classification: `ITEM_LEVEL_PUBLIC_PREVIEW_GATE_NOT_SATISFIED_OR_NOT_CONFIRMED`

Most likely contributing conditions:

1. Shraddha catalog items are visible in authenticated browse but do not currently satisfy public B2B item posture gate (`B2B_PUBLIC`/`BOTH`) for projection.
2. Exact Shraddha item UUID/state set still needs safe discovery confirmation before any write unit.

### 10B. `/products` blocker

Primary blocker classification: `SURFACE_SCOPE_MISMATCH_NOT_DATA_ENTRY`

Current `/products` live projection is B2C storefront scoped and requires B2C org/public posture gates. Shraddha is a B2B public supplier in current posture, so no FTR-SL-009/FTR-SL-010-only data entry can make Shraddha appear on `/products` under current design.

---

## 11. Design Decision Needed

### Decision D-011C-1

Should `/products` remain B2C-storefront public product discovery with reference fallback, or be expanded to include B2B supplier catalog products?

- If **NO expansion**: current behavior is structurally correct; Shraddha should be expected on `/b2b`, not `/products`.
- If **YES expansion**: requires a separate implementation unit (new projection/API and UI merge strategy), not only posture/taxonomy execution.

### Decision D-011C-2

Should `/b2b` and `/products` share one unified public product projection?

Recommended: **No immediate unification**. Keep separate B2B supplier-discovery and B2C product-discovery projections until explicit product architecture approval.

### Decision D-011C-3

Should this launch before buyer promotion?

Recommended: **No** for broad claim. First complete Shraddha `/b2b` visibility readiness (FTR-SL-009/FTR-SL-010 authorized execution + safe verification), then decide `/products` scope expansion separately.

---

## 12. Recommended Implementation Design (No Code In This Unit)

### 12A. Minimal path for current architecture

1. Execute FTR-SL-009 taxonomy values for Shraddha (authorized exact values only).
2. Execute FTR-SL-010 item posture updates for exact Shraddha item IDs (authorized exact values only).
3. Re-verify safe `/api/public/b2b/suppliers` and `/b2b` visual card preview.

### 12B. If `/products` must include real B2B supplier products

Minimal implementation (new unit, not this one):

- Backend:
  - introduce a dedicated read-only public product projection/API for cross-type or B2B-safe product cards, or explicitly broaden existing `/api/public/b2c/products` contract with governance approval.
  - preserve strict field policy and channel separation.
- Frontend:
  - wire `/products` to a deterministic live-first strategy with explicit segment labeling (B2C products vs B2B supplier offerings) if mixed.
  - retain clear fallback to reference previews when zero eligible live rows.
- Copy/UX:
  - keep reference preview labeling when fallback is active.
  - avoid implying live commercial readiness where gates are not met.

---

## 13. Relationship To FTR-SL-009 And FTR-SL-010

- FTR-SL-009 (taxonomy tooling): still required to complete Shraddha taxonomy visibility on `/b2b` supplier card.
- FTR-SL-010 (item posture tooling): still required to make Shraddha offerings eligible for `/b2b` `offeringPreview`.
- Neither FTR-SL-009 nor FTR-SL-010 alone can make Shraddha appear on `/products` under current B2C-scoped projection design.

Safe sequencing recommendation:

1. Resolve taxonomy-source correction residual from 011B.
2. Execute authorized FTR-SL-009/FTR-SL-010 data-entry for Shraddha `/b2b` readiness.
3. Run separate product decision/implementation unit only if `/products` scope must include B2B supplier products.

---

## 14. Tracker Sync Summary

TLRH updated in this unit to record:

- `/products` is currently live-capable B2C projection with reference fallback, not B2B supplier projection.
- Shraddha `/b2b` blocker remains item-level public preview gating.
- final status: `DESIGN_COMPLETE_HOLD_FOR_PRODUCT_VISIBILITY_DECISION`.

`NEXT-ACTION.md` and `OPEN-SET.md` were not modified in this unit (no pointer-authority change required for this bounded design packet).

---

## 15. Adjacent Findings And Disposition

1. Adjacent finding: `/products` copy (`Live profiles/products replace examples...`) can be interpreted as cross-surface promise including B2B suppliers.
- Disposition: **registered for decision** in this unit (`D-011C-1`), not fixed in docs/source here.

2. Adjacent finding: public product detail includes supplier-profile navigation actions that are blocked in no-mutation verification prompts due FTR-SL-007 side effect route.
- Disposition: **deferred with guardrail**; no click executed in this unit.

No adjacent finding is left as untracked prose-only in this unit.

---

## 16. Risks / Residuals

1. Product-expectation risk remains until explicit `/products` scope decision is made.
2. Shraddha `/b2b` visibility residual remains until authorized FTR-SL-009/FTR-SL-010 execution is completed.
3. Taxonomy-source correction residual from 011B still applies before safe deterministic taxonomy write execution.

---

## 17. Recommended Next Unit

Recommended next unit:

`FTR-SL-011D-SHRADDHA-PUBLIC-B2B-VISIBILITY-AUTHORIZED-EXECUTION-AND-VERIFY-01`

Expected scope:

1. safe item UUID/state discovery for Shraddha catalog items
2. authorized FTR-SL-009 taxonomy entry (exact approved values)
3. authorized FTR-SL-010 posture updates (exact approved values)
4. safe `/api/public/b2b/suppliers` + `/b2b` verification
5. no `/supplier/:slug` calls

Optional separate decision/implementation unit after 011D if required:

`FTR-SL-011E-PUBLIC-PRODUCT-DISCOVERY-SCOPE-DECISION-AND-IMPLEMENTATION-01`

---

## 18. Final Enum

`FTR_SL_011C_PUBLIC_PRODUCT_DISCOVERY_DESIGN_COMPLETE_HOLD_FOR_PRODUCT_VISIBILITY_DECISION`
