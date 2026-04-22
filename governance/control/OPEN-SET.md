# OPEN-SET.md — Layer 0 Governed Posture and Read Order

**Layer:** 0 — Control Plane  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md  
**Last Updated:** 2026-04-22 (close of PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE — VERIFIED_COMPLETE; D-015/D-016 reconciliation)

> This file is the Layer 0 entry surface for current governed posture. Read `OPEN-SET.md`, then
> `NEXT-ACTION.md`, then `BLOCKED.md`; consult `SNAPSHOT.md` only when restore context or
> historical ambiguity requires it.

---

## Layer 0 Role

- Layer 0 confirms current governed-unit state, blocker/hold posture, audit posture, and
  governance exceptions.
- Layer 0 does not originate ordinary product delivery sequencing.
- Ordinary product sequencing is read from the product-truth authority stack listed below.

## Control-Plane Read Order

1. `governance/control/OPEN-SET.md`
2. `governance/control/NEXT-ACTION.md`
3. `governance/control/BLOCKED.md`
4. `governance/control/SNAPSHOT.md` only when restore context or historical ambiguity matters

## Live Canon Package

| Role | File |
| --- | --- |
| Repo/runtime baseline truth | `governance/analysis/TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md` |
| Opening-layer taxonomy truth | `governance/control/TEXQTIC-OPENING-LAYER-TAXONOMY-TRUTH-BASELINE-2026-04-09.md` |
| Canon-and-pointer decision | `governance/analysis/TEXQTIC-OPENING-LAYER-CANON-AND-POINTER-SET-DECISION-2026-04-10.md` |

## Live Control Set

| Role | File |
| --- | --- |
| Opening-layer governance authority/pointer layer | `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md` |
| Opening-layer sequencing authority | `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-10.md` |
| Layer 0 open-set control surface | `governance/control/OPEN-SET.md` |
| Layer 0 next-action pointer | `governance/control/NEXT-ACTION.md` |
| Layer 0 blocked/hold register | `governance/control/BLOCKED.md` |
| Layer 0 snapshot | `governance/control/SNAPSHOT.md` |

## Product-Truth Authority Stack

| Role | File |
| --- | --- |
| Preserved gap baseline | `docs/product-truth/TEXQTIC-GAP-REGISTER-v1.md` |
| Preserved dependency-ordered roadmap baseline | `docs/product-truth/TEXQTIC-IMPLEMENTATION-ROADMAP-v1.md` |
| Preserved immediate-delivery baseline | `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v1.md` |

## Operating Notes

- Governing posture: `HOLD-FOR-BOUNDARY-TIGHTENING` remains in effect.
- `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` closed `VERIFIED_COMPLETE` (commit `04dc375`, 2026-04-22).
  All three bounded deliverables confirmed: `PUBLIC_B2B_DISCOVERY` AppState in `App.tsx`; B2B
  discovery page component (`components/Public/B2BDiscovery.tsx`); homepage B2B CTAs upgraded from
  temporary scroll behavior to `setAppState('PUBLIC_B2B_DISCOVERY')` state transition.
- **No active product-delivery unit is open. D-016 decision control is in effect.**
  The next opening is a human decision. No unit may be opened without explicit human authorization.
  Governance OS must not infer a successor from the closed unit.
- D-015 post-close authority reconciliation: complete (2026-04-22).
- D-013 carry-forward result: `SUCCESSOR_CHAIN_PRESERVED`.
  D-020 artifact: `governance/decisions/TEXQTIC-PUBLIC-MARKET-ACCESS-FAMILY-SUCCESSOR-CHAIN-D020-v1.md`.
- All prior units (`PUBLIC_B2B_PROJECTION_PRECONDITION_IMPLEMENTATION_SLICE` and
  `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE`) are closed. Their design authorities remain
  locked historical evidence only.
- Planning-package recommendations outside the product-truth authority stack remain guidance and
  decision input only, not live authority.
- Preserved aligned anchors, including the closed onboarding-family handoff chain, remain outside
  the live canon package and outside the live control set.
- The old `-v2` chain remains historical evidence and reconciliation input only.
