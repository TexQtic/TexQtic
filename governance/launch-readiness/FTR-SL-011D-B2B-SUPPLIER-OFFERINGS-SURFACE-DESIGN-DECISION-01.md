# FTR-SL-011D B2B Supplier Offerings Surface Design Decision

**Unit:** `FTR-SL-011D-B2B-SUPPLIER-OFFERINGS-SURFACE-DESIGN-DECISION-01`
**Date:** 2026-06-12
**Status:** `DESIGN_COMPLETE_KEEP_PRODUCTS_B2C_ADD_B2B_OFFERINGS_DRAWER`
**Final enum:** `FTR_SL_011D_B2B_SUPPLIER_OFFERINGS_SURFACE_DESIGN_COMPLETE_KEEP_PRODUCTS_B2C_ADD_B2B_OFFERINGS_DRAWER`

---

## 1. Scope And Posture

This unit is a bounded product-architecture decision packet for B2B supplier product/offering visibility.

Paresh decision recorded for this unit:

- `/products` remains B2C product discovery as currently architected.
- B2B supplier offerings are not to be moved into `/products` in this unit.
- The B2B entry point for supplier offerings should remain within `/b2b` or a B2B-specific follow-on surface.

Default posture remained docs-only/design-only.

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

Mandatory repo-truth preflight:

```text
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --porcelain=v1 -uno
git log --oneline -30
```

Observed:

```text
branch=main
HEAD=cd1ff8a9ee7eb09a031c999cc0fa500d07deaf72
origin/main=cd1ff8a9ee7eb09a031c999cc0fa500d07deaf72
git status --porcelain=v1 -uno: [no output]
```

Preflight verdict: local and origin are synced at the latest 011C commit; worktree was clean before edits.

---

## 3. Files Inspected

Governance / TLRH / prior units:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-011C-SHRADDHA-PUBLIC-PRODUCT-DISCOVERY-DESIGN-AND-GATING-01.md`
- `governance/launch-readiness/FTR-SL-011B-SHRADDHA-CANONICAL-TAXONOMY-MAPPING-AND-CATALOG-VISIBILITY-DIAGNOSIS-01.md`
- `governance/launch-readiness/FTR-SL-011A-SHRADDHA-PROFILE-DATA-ENTRY-VALUES-ADDENDUM-AND-READINESS-01.md`
- `governance/launch-readiness/FTR-SL-011-SHRADDHA-SUPPLIER-PROFILE-DATA-ENTRY-AUTHORIZATION-PACKET-01.md`
- `governance/launch-readiness/FTR-SL-010-CATALOG-OFFERING-PREVIEW-PUBLICATION-POSTURE-TOOLING-01.md`
- `governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/OPEN-SET.md`

Public / B2B / product surfaces:

- `components/Public/B2BDiscovery.tsx`
- `components/Public/PublicSupplierProfile.tsx`
- `services/publicB2BService.ts`
- `server/src/routes/public.ts`
- `server/src/services/publicB2BProjection.service.ts`
- `components/Public/B2CBrowse.tsx`
- `services/publicB2CService.ts`
- `server/src/services/publicB2CProjection.service.ts`
- `config/publicReferenceB2B.ts`
- `config/publicReferenceB2C.ts`

Runtime evidence:

- safe `GET /api/public/b2b/suppliers`
- safe `/b2b` visual read

---

## 4. Paresh `/products` Decision Recorded

Paresh clarified that `/products` should remain B2C product discovery.

That decision is adopted as the controlling launch posture for this unit:

1. `/products` stays B2C-only.
2. B2B supplier products/offerings do not get merged into `/products`.
3. Any B2B offering launch path must be B2B-specific.

This makes Option E explicitly deferred for this unit.

---

## 5. Current Public Surface Truth

### 5A. `/b2b` live truth

Safe runtime payload from `GET /api/public/b2b/suppliers`:

- `shraddha-industries` is present as a B2B public supplier.
- `shraddha-industries.offeringPreview=[]`.
- `lt-b2b-001.offeringPreview` contains three launch-test preview items.

Safe visual `/b2b` read confirms:

- page title is public-safe textile ecosystem discovery.
- public profile grid is loading/visible.
- the current page is profile-first, not offerings-first.
- the card CTA today is `View Public Profile`, which is not the preferred ordinary B2B offerings browse path for launch.

### 5B. `/products` live truth

From the prior 011C packet and current repo truth:

- `/products` maps to `PUBLIC_B2C_BROWSE`.
- live B2C product projection is empty at the moment.
- the page therefore renders reference product preview content.
- this surface is intentionally B2C and should stay that way for launch.

### 5C. Existing profile-route truth

`GET /api/public/supplier/:slug` exists and is read-only on the surface, but after a 200 it writes audit/event rows.

That side effect makes it a poor default browsing path for simple offerings exploration.

---

## 6. B2B Supplier Offering UX Options Table

| Option | Shape | Launch fit | Side-effect risk | Design verdict |
|---|---|---|---|---|
| A | Keep `/products` B2C-only; show B2B offerings only as limited previews on `/b2b` cards | Good | Low | Acceptable baseline, but not enough for a fuller offerings glance |
| B | Keep `/products` B2C-only; add `View offerings` drawer/modal on `/b2b` supplier cards | Best | Low | **Recommended launch design** |
| C | Keep `/products` B2C-only; create safe B2B offerings route `/b2b/suppliers/:slug/offerings` | Good for later breadth | Low if read-only | Best follow-on if a full dedicated page is needed |
| D | Use existing supplier profile route for offerings | Weak | High because of profile GET audit/event side effect | Not recommended for default offerings browsing |
| E | Expand `/products` to mixed B2C + B2B discovery | Not preferred by Paresh | Medium to high | Explicitly deferred in this unit |

---

## 7. Recommended Design

Recommended launch design: **Option B**.

That means:

1. Keep `/products` B2C-only.
2. Keep `/b2b` as the B2B supplier discovery entry point.
3. Show a small public-safe offerings preview on the B2B supplier card.
4. Add a `View offerings` CTA that opens a drawer/modal on `/b2b` rather than navigating to the supplier profile route.
5. Use a dedicated safe read-only offerings surface only if a full list is required later.

Reasoning:

- It fits Paresh’s `/products` decision.
- It avoids the FTR-SL-007 profile-route side effect.
- It keeps the user on the B2B discovery surface where the supplier was first found.
- It is launch-friendly without requiring a broad product-architecture rewrite.

---

## 8. Public-Safe B2B Offering Field Policy

For public B2B offerings shown from `/b2b`, keep the payload intentionally small and public-safe.

Allowed for launch:

1. offering name
2. MOQ
3. product image URL
4. supplier display name
5. public category or taxonomy label
6. public visibility label such as `Public B2B offering`
7. demo/pilot label when applicable

Disallowed for launch:

1. private pricing
2. contact details
3. order terms that expose private commercial workflow
4. negotiation state
5. buyer-specific policy data
6. internal document links
7. unverified certification or traceability claims

For Shraddha, the approved public display values to preserve are:

1. Primary segment intent: `MANUFACTURER - WEAVING AND FABRIC PROCESSING`
2. Secondary segments intent: `WHOLESALE/TRADING`
3. Role positions intent: `WEAVING AND FABRIC PROCESSING`
4. Offering 1: `SILK CREPE (WEAVE PLAIN AND JACQURD, gsm 65GRAMS & 80 GRAMS)`
5. Offering 1 MOQ: `500 meters`
6. Offering 1 image URL: approved for public display
7. Offering 2: `Polyester-cotton Blend Fabric - 0.14 G/m3 Density | Lightweight, Soft, Multi-color, Ideal For Apparel And Upholstery`
8. Offering 2 MOQ: `500 meters`
9. Offering 2 image URL: approved for public display
10. Certification posture: blank / not claimed
11. Traceability posture: no evidence published

---

## 9. CTA And Copy Recommendation

Recommended CTA on B2B supplier cards:

- primary: `View offerings`
- secondary, when no public offerings exist: `No public offerings yet`

Recommended drawer/modal copy:

- title: `Public B2B offerings`
- body: `These are public-safe preview offerings approved for B2B discovery.`
- helper text: `Private pricing, negotiation, and documents remain inside authenticated workflows.`

Recommended card-level language:

- keep the existing `Product/service examples` section, but label it as a public preview rather than a commercial catalog.
- if there are no preview items, hide the CTA or replace it with a muted empty state instead of sending users to the profile route.

Recommended `/products` copy stance:

- keep the page explicitly framed as B2C product discovery.
- if any copy risks implying supplier discovery, tighten it to say `B2C storefront profiles/products` rather than generic `products`.
- add cross-navigation language that points B2B suppliers to `/b2b` discovery instead of `/products`.

---

## 10. FTR-SL-007 Side-Effect Analysis

Using the existing public supplier profile route for ordinary offerings browsing is not preferred because `GET /api/public/supplier/:slug` emits audit/event rows after a 200 response.

That means:

1. it is safe for deliberate profile viewing, but
2. it is not the best default path for lightweight offerings browsing, and
3. it introduces a side effect that is unnecessary for a simple `View offerings` interaction.

Therefore:

- do not use the supplier profile route as the default offerings CTA target in this unit;
- prefer an in-page drawer/modal on `/b2b`;
- if a new route is needed later, design a separate safe read-only B2B offerings endpoint/route with no audit/event write side effect.

---

## 11. Demo / Pilot Supplier Handling

The launch-test supplier `lt-b2b-001` must stay clearly labeled as a demo / pilot supplier and must not be represented as a genuine supplier.

Design requirements:

1. keep the demo/pilot badge or helper text visible on the card and inside the drawer/modal.
2. keep the current helper copy stating that it is a reference profile for launch testing.
3. do not let demo/pilot content inherit wording that implies verified commercial readiness.
4. use distinct copy for live public suppliers versus pilot/reference suppliers.

Fallback behavior when no public offerings exist:

1. show `No public offerings yet`.
2. preserve supplier identity and public-safe profile context.
3. avoid a misleading CTA that implies hidden commercial data is available publicly.

---

## 12. Relationship To FTR-SL-009 And FTR-SL-010

FTR-SL-009 and FTR-SL-010 remain relevant, but only for the public B2B supplier visibility path:

1. FTR-SL-009 supplies the taxonomy/role intent values needed for public supplier discovery.
2. FTR-SL-010 supplies the catalog offering-publication posture values needed for public offerings previews.
3. Neither unit authorizes `/products` expansion into B2B product discovery.

For Shraddha, the approved public display values in this unit are the ones already authorized for bounded taxonomy/role and catalog posture execution.

This unit does not authorize the writes themselves; it only records the design that should consume those writes.

---

## 13. Recommended Next Implementation Unit

Recommended next implementation unit:

`FTR-SL-011E-B2B-SUPPLIER-OFFERINGS-DRAWER-IMPLEMENTATION-AND-SAFE-PREVIEW-01`

Expected scope:

1. add a `/b2b` card-level `View offerings` interaction
2. implement a drawer/modal for public-safe offerings preview
3. preserve demo/pilot labeling
4. keep `/products` unchanged as B2C
5. avoid the profile GET side-effect route for ordinary offerings browsing

If a full dedicated B2B offerings page becomes necessary, open a separate follow-on unit for a safe read-only route such as `/b2b/suppliers/:slug/offerings`.

---

## 14. Tracker Updates

`FUTURE-TODO-REGISTER.md` was updated with the 011D bounded update and the new status enum.

No pointer authority change was required in `NEXT-ACTION.md` or `OPEN-SET.md` for this docs-only design unit.

---

## 15. Adjacent Findings And Disposition

1. Adjacent finding: current `/b2b` cards still expose `View Public Profile` as the dominant action.
- Disposition: registered as a UX follow-on in the next implementation unit; not changed in this docs-only packet.

2. Adjacent finding: `offeringPreview=[]` for Shraddha means the launch-ready B2B offering experience still depends on later authorized data-entry execution.
- Disposition: deferred to FTR-SL-009/FTR-SL-010 execution and the follow-on implementation unit.

3. Adjacent finding: `lt-b2b-001` remains demo / pilot.
- Disposition: preserved and explicitly labeled in this design.

---

## 16. Risks / Residuals

1. The launch experience still needs the authorized Shraddha taxonomy/posture execution before the public offerings drawer can show the intended live preview values.
2. If future product scope pressure returns, `/products` must remain protected as B2C-only unless a separate architecture decision is made.
3. A separate safe read-only route may still be needed later if the drawer/modal is not enough for the desired offerings browsing depth.

---

## 17. Final Enum

`FTR_SL_011D_B2B_SUPPLIER_OFFERINGS_SURFACE_DESIGN_COMPLETE_KEEP_PRODUCTS_B2C_ADD_B2B_OFFERINGS_DRAWER`
