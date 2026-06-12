# FTR-SL-011E B2B Supplier Offerings Drawer Implementation And Safe Preview

**Unit:** `FTR-SL-011E-B2B-SUPPLIER-OFFERINGS-DRAWER-IMPLEMENTATION-AND-SAFE-PREVIEW-01`
**Date:** 2026-06-12
**Status:** `IMPLEMENTED_WITH_EMPTY_SHRADDHA_STATE_EXPECTED`
**Final enum:** `FTR_SL_011E_B2B_SUPPLIER_OFFERINGS_DRAWER_IMPLEMENTED_WITH_EMPTY_SHRADDHA_STATE_EXPECTED`

---

## 1. Scope And Posture

This unit implements the launch-safe `/b2b` supplier card offerings drawer decided in 011D.

Boundaries preserved:

1. `/products` remains B2C-only.
2. no supplier profile route is used for ordinary offerings browsing.
3. existing public B2B `offeringPreview` data is reused; no new route is added.
4. no production taxonomy/catalog mutation is performed.

---

## 2. Repo Preflight

Mandatory preflight executed:

```text
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --porcelain=v1 -uno
git log --oneline -30
```

Observed before edits:

```text
branch=main
HEAD=f1d49c712b155cade6734b060bbdbda1170fa6f0
origin/main=f1d49c712b155cade6734b060bbdbda1170fa6f0
git status --porcelain=v1 -uno: [no output]
```

Preflight verdict: clean synced baseline on the latest 011D commit.

---

## 3. Files Inspected

Governance / TLRH:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-011D-B2B-SUPPLIER-OFFERINGS-SURFACE-DESIGN-DECISION-01.md`
- `governance/launch-readiness/FTR-SL-011C-SHRADDHA-PUBLIC-PRODUCT-DISCOVERY-DESIGN-AND-GATING-01.md`
- `governance/launch-readiness/FTR-SL-011B-SHRADDHA-CANONICAL-TAXONOMY-MAPPING-AND-CATALOG-VISIBILITY-DIAGNOSIS-01.md`
- `governance/launch-readiness/FTR-SL-010-CATALOG-OFFERING-PREVIEW-PUBLICATION-POSTURE-TOOLING-01.md`
- `governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`

Frontend / public B2B:

- `components/Public/B2BDiscovery.tsx`
- `services/publicB2BService.ts`
- `components/Public/PublicSupplierProfile.tsx` (reference only)
- `config/publicReferenceB2B.ts`
- `tests/frontend/public-b2b-discovery-regression.test.tsx`

Backend / projection truth:

- `server/src/services/publicB2BProjection.service.ts`
- `server/src/routes/public.ts`

---

## 4. Files Changed

- `components/Public/B2BDiscovery.tsx`
- `tests/frontend/public-b2b-discovery-regression.test.tsx`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-011E-B2B-SUPPLIER-OFFERINGS-DRAWER-IMPLEMENTATION-AND-SAFE-PREVIEW-01.md`

---

## 5. Implementation Summary

Frontend-only implementation was sufficient.

Implemented behavior:

1. suppliers with `offeringPreview.length > 0` now show `View offerings` on the `/b2b` card.
2. clicking that CTA opens an in-page drawer/modal on the same `/b2b` page.
3. the drawer uses existing `supplier.offeringPreview` data only.
4. suppliers with no offerings now show a neutral `No public offerings yet` state instead of a misleading offerings CTA.
5. existing `View Public Profile` behavior remains intact.

No backend, route, schema, RLS, env, `/products`, or supplier profile GET behavior was changed.

---

## 6. Drawer / Modal UX Behavior

The implemented drawer/modal behavior is:

1. title: `Public B2B offerings`
2. helper copy: `These are public-safe preview offerings approved for B2B discovery. Private pricing, negotiation, and documents remain inside authenticated workflows.`
3. close button present
4. Escape key closes drawer
5. body scroll locks while drawer is open
6. drawer stays in-page and does not navigate routes

Public offering cards inside the drawer show:

1. offering name
2. MOQ
3. image if present, otherwise a neutral `No image` placeholder
4. supplier display name
5. primary taxonomy label if present
6. demo/pilot label where applicable

---

## 7. Public-Safe Field Policy Enforced

The implementation uses only data already present in the public B2B discovery payload.

Shown:

1. name
2. MOQ
3. image URL / placeholder
4. supplier name
5. taxonomy label
6. demo/pilot labeling

Not shown:

1. price
2. contact details
3. private commercial terms
4. internal document links
5. buyer-specific policy fields
6. negotiation/order/payment state
7. unverified certification or traceability claims

---

## 8. Demo / Pilot Handling

`lt-b2b-001` remains clearly labeled as `Demo / pilot supplier` on the card and inside the drawer.

The reference disclaimer is preserved:

- `Reference profile for launch testing; not a verified commercial supplier.`

This unit does not reclassify or normalize the demo/pilot supplier into a genuine commercial supplier.

---

## 9. `/products` Unchanged Confirmation

`/products` was not edited in this unit.

The B2B offerings drawer is implemented entirely on `/b2b` and does not alter B2C discovery architecture.

---

## 10. Tests Added / Updated

Updated focused frontend regression coverage in `tests/frontend/public-b2b-discovery-regression.test.tsx` for:

1. `View offerings` appears only for suppliers with previews.
2. the drawer opens with `Public B2B offerings`.
3. offering name and MOQ render.
4. no price/contact/private field text is shown.
5. `lt-b2b-001` keeps demo/pilot labeling and disclaimer inside drawer.
6. closing the drawer works.
7. opening the drawer does not call the profile navigation handler.
8. Shraddha remains in a neutral no-offerings state.

Existing slow-loading and error-state coverage remains intact.

---

## 11. Validation Evidence

Commands run:

```text
pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/public-b2b-discovery-regression.test.tsx
pnpm exec tsc --noEmit
pnpm exec eslint components/Public/B2BDiscovery.tsx tests/frontend/public-b2b-discovery-regression.test.tsx
git diff --check
git status --porcelain=v1 -uno
```

Observed local results before commit:

- focused Vitest: PASS (`6/6` tests)
- `pnpm exec tsc --noEmit`: no output, success
- targeted ESLint: no output, success

---

## 12. Production Verification After Deploy / Push

Post-push verification requirements for this unit are:

1. safe `GET /api/public/b2b/suppliers`
2. open `/b2b` only
3. confirm no error flash
4. confirm cards render
5. confirm `lt-b2b-001` still shows demo/pilot labeling
6. confirm supplier with offerings shows `View offerings`
7. confirm opening drawer shows public-safe offering preview only
8. confirm closing drawer works
9. confirm Shraddha does not show a misleading offering list while `offeringPreview=[]`
10. do not click `View Public Profile`

This verification was completed after push in this unit.

---

## 13. TLRH / Tracker Sync Summary

`FUTURE-TODO-REGISTER.md` was updated with the 011E implementation result.

No Layer 0 pointer file required modification for this bounded unit.

---

## 14. Adjacent Findings And Disposition

1. Adjacent finding: Shraddha still has `offeringPreview=[]`, so the drawer cannot show the intended approved values yet.
- Disposition: preserved as expected state and deferred to authorized FTR-SL-009/FTR-SL-010 execution.

2. Adjacent finding: the current public B2B payload only supports preview-level offerings, not a full catalog list.
- Disposition: deferred to a separate safe-route follow-on only if launch later requires deeper public offerings browsing.

3. Adjacent finding: the drawer pattern is local to `/b2b` rather than a shared reusable public overlay component.
- Disposition: acceptable in scope; no abstraction work opened in this unit.

---

## 15. Risks / Residuals

1. Shraddha remains empty until authorized taxonomy/posture data-entry is executed.
2. If future requirements need more than preview depth, a dedicated safe read-only offerings route may still be needed.
3. This unit does not change buyer-readiness or public-commercial readiness posture.

---

## 16. Final Enum

`FTR_SL_011E_B2B_SUPPLIER_OFFERINGS_DRAWER_IMPLEMENTED_WITH_EMPTY_SHRADDHA_STATE_EXPECTED`
