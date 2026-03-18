---
unit_id: TECS-FBW-013
title: B2B Request Quote — product decision + backend
type: IMPLEMENTATION
status: BLOCKED
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
    description: Tenant-plane RFQ submission route does not exist; required before parent unit can open
    prerequisite_unit: TECS-FBW-013-BE-001
    registered: 2026-03-18
    status: ACTIVE
---

## Unit Summary

TECS-FBW-013 covers the B2B Request Quote flow: backend route design and frontend activation
for the product-authorized limited tenant-plane RFQ initiation scope. PRODUCT-DEC-B2B-QUOTE is
now DECIDED, but the decision explicitly requires a live tenant-plane RFQ submission route before
any frontend activation may occur. That route does not exist today, so this parent unit is now
BLOCKED on backend prerequisite BLK-013-001 / TECS-FBW-013-BE-001.

## Acceptance Criteria

*Not yet active — unit is BLOCKED pending backend prerequisite completion.*

Expected future criteria (illustrative only; do not treat as active work):
- [x] Product decision recorded in `governance/decisions/PRODUCT-DECISIONS.md`
- [ ] Backend prerequisite unit `TECS-FBW-013-BE-001` implemented and VERIFIED_COMPLETE
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
*Not yet recorded — parent unit is BLOCKED pending backend prerequisite completion.*

## Governance Closure
*Not yet set — unit is BLOCKED and not implementation-ready.*

---

## Allowed Next Step

**Implement TECS-FBW-013-BE-001 only.** This parent unit is BLOCKED.

The only allowed next step is implementation of backend prerequisite unit
`TECS-FBW-013-BE-001`, followed by verification and a governance close/sequencing unit to
determine whether this parent may transition from BLOCKED → OPEN.

## Forbidden Next Step

- Do **not** implement the B2B quote request backend or frontend flow
- Do **not** activate, enable, or remove the UI's disabled quote button/element
- Do **not** promote this unit to OPEN or IN_PROGRESS until BLK-013-001 is resolved
- Do **not** treat the disabled button as a defect requiring a fix — its presence is intentional
- Do **not** treat this as a gap or bug — it is product-authorized but blocked on missing backend capability
- Do **not** widen scope beyond limited tenant-plane RFQ initiation

## Drift Guards

- **CRITICAL: Do not remove the disabled B2B Quote UI element.** The tracker explicitly states:
  *"Keep UI visually disabled until product decision made; do not remove button."*
  The disabled button is a deliberate holding pattern, not dead code.
- PRODUCT-DEC-B2B-QUOTE authorizes limited RFQ initiation only. It does not authorize opening
  the parent before the backend route exists.
- This unit has NO parent sibling that is VERIFIED_COMPLETE. There is no B2B Quote A-slice.
  Frontend activation must wait for backend prerequisite completion.
- LOW risk designation (tracker): low business risk, but governance posture still requires
  backend capability before implementation may proceed on the parent unit.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as BLOCKED) |
| What is the blocker? | `governance/control/BLOCKED.md` — Section 1 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-010) |
| What authorized the scope? | `governance/decisions/PRODUCT-DECISIONS.md` — PRODUCT-DEC-B2B-QUOTE |
| When can it move beyond BLOCKED? | After `TECS-FBW-013-BE-001` resolves BLK-013-001 |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~106 area |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-18 — GOV-SEQUENCE-TECS-FBW-013. Status transitioned: DEFERRED → BLOCKED.
