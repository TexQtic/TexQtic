---
unit_id: TECS-FBW-013
title: B2B Request Quote — product decision + backend
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: TENANT
opened: 2026-03-07
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-010: product authorization does not itself open the unit; no frontend activation until backend prerequisite is complete
  - D-011: org_id must scope all quote request operations when authorized
decisions_required:
  - PRODUCT-DEC-B2B-QUOTE: DECIDED (2026-03-18, Paresh) — authorized limited tenant-plane RFQ initiation only
blockers:
  - id: BLK-013-001
    type: MISSING_BACKEND_ROUTE
    description: Tenant-plane RFQ submission route did not exist; required before parent unit could open
    prerequisite_unit: TECS-FBW-013-BE-001
    registered: 2026-03-18
    resolved: 2026-03-18
    status: RESOLVED
    resolution_evidence: "451f45b · VERIFY-TECS-FBW-013-BE-001: VERIFIED_COMPLETE"
---

## Unit Summary

TECS-FBW-013 covers the B2B Request Quote flow: backend route design follow-on and frontend
activation for the product-authorized limited tenant-plane RFQ initiation scope. PRODUCT-DEC-B2B-QUOTE is
DECIDED and backend prerequisite TECS-FBW-013-BE-001 is now VERIFIED_COMPLETE. BLK-013-001 is
resolved because the required tenant-plane RFQ submission route exists and has passed verification.
This parent unit is now OPEN for the buyer-side follow-on only.

## Acceptance Criteria

*Unit is now OPEN following verified backend prerequisite completion.*

Expected future criteria (illustrative only; do not treat as active work):
- [x] Product decision recorded in `governance/decisions/PRODUCT-DECISIONS.md`
- [x] Backend prerequisite unit `TECS-FBW-013-BE-001` implemented and VERIFIED_COMPLETE
- [ ] org_id-scoped for tenant operations
- [ ] Frontend quote flow enabled only after backend route is live
- [ ] UI disabled state replaced with functional state (product-authorized transition)
- [ ] TypeScript type-check passes (EXIT 0)
- [ ] Lint passes (EXIT 0)

## Files Allowlisted (Modify)
*Not yet defined — pending product authorization.*

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record
- Backend prerequisite resolved by `TECS-FBW-013-BE-001`
- Implementation commit for prerequisite: `451f45b`
- Verification result: `VERIFY-TECS-FBW-013-BE-001` — `VERIFIED_COMPLETE`
- Resolved blocker evidence: `451f45b · VERIFY-TECS-FBW-013-BE-001: VERIFIED_COMPLETE`

## Governance Closure
*Not yet set — unit is OPEN and implementation-ready for the authorized buyer-side follow-on only.*

---

## Allowed Next Step

**Implement TECS-FBW-013 only.** This parent unit is OPEN.

The only allowed next step is the buyer-side follow-on implementation now that the backend
RFQ prerequisite is verified complete.

## Forbidden Next Step

- Do **not** add seller negotiation workflows, counter-offers, or multi-round negotiation loops
- Do **not** add compliance progression, order conversion, checkout, or settlement semantics
- Do **not** add AI-autonomous quote decisions, control-plane quote actions, or public/cross-tenant quote actions
- Do **not** remove the UI's disabled quote button/element except as part of the authorized buyer-side follow-on implementation
- Do **not** treat the disabled button as a defect requiring a fix — its presence is intentional
- Do **not** widen scope beyond limited tenant-plane RFQ initiation

## Drift Guards

- **CRITICAL: Do not remove the disabled B2B Quote UI element.** The tracker explicitly states:
  *"Keep UI visually disabled until product decision made; do not remove button."*
  The disabled button is a deliberate holding pattern, not dead code.
- PRODUCT-DEC-B2B-QUOTE authorizes limited RFQ initiation only. It does not authorize opening
  any seller-side or downstream transaction semantics.
- This unit has NO parent sibling that is VERIFIED_COMPLETE. There is no B2B Quote A-slice.
  Scope remains the buyer-side follow-on only, after verified backend prerequisite completion.
- LOW risk designation (tracker): low business risk, but governance posture still requires
  strict tenant scoping and narrow RFQ-only semantics.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as OPEN) |
| What was the blocker? | `governance/control/BLOCKED.md` — Section 4 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-010) |
| What authorized the scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-B2B-QUOTE |
| What unblocked it? | `TECS-FBW-013-BE-001` — commit `451f45b` + verification VERIFIED_COMPLETE |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~106 area |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOVERNANCE-SYNC-TECS-FBW-013-BE-001. Status transitioned: BLOCKED → OPEN.
