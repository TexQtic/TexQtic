---
unit_id: TECS-FBW-013
title: B2B Request Quote — product decision + backend
type: IMPLEMENTATION
status: DEFERRED
wave: W5
plane: TENANT
opened: 2026-03-07
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-010: product-deferred; UI must remain visually disabled; must not be removed or activated
  - D-011: org_id must scope all quote request operations when authorized
decisions_required:
  - PRODUCT-DEC-B2B-QUOTE (not yet made; future product decision required)
blockers: []
---

## Unit Summary

TECS-FBW-013 covers the B2B Request Quote flow: product scope decision, backend route design,
and frontend activation. The current UI has a disabled button/flow intentionally preserved in
place — it must remain visually disabled until product authorization is granted. This unit
is LOW risk and has not been started. It is product-deferred, not a defect.

## Acceptance Criteria

*Not yet active — unit is DEFERRED. Acceptance criteria will be defined when product authorizes.*

Expected future criteria (illustrative only; do not treat as active work):
- [ ] Product decision recorded in `governance/decisions/PRODUCT-DECISIONS.md`
- [ ] Backend route for quote request designed and implemented (server-side)
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
*Not yet recorded — unit is DEFERRED.*

## Governance Closure
*Not yet set — unit is DEFERRED and not implementation-ready.*

---

## Allowed Next Step

**Nothing.** This unit is DEFERRED.

The only allowed next step is a **product authorization event** recorded in
`governance/decisions/PRODUCT-DECISIONS.md` (Layer 2 — Decision Ledger), followed by a
governance unit that transitions this unit from DEFERRED → OPEN. Until that authorization
exists in the decision ledger, no implementation work may begin.

## Forbidden Next Step

- Do **not** implement the B2B quote request backend or frontend flow
- Do **not** activate, enable, or remove the UI's disabled quote button/element
- Do **not** promote this unit to OPEN or IN_PROGRESS without a product decision record
- Do **not** treat the disabled button as a defect requiring a fix — its presence is intentional
- Do **not** treat this as a gap or bug — it is explicitly product-deferred
- Do **not** plan backend routes for quote request without product scope decision first

## Drift Guards

- **CRITICAL: Do not remove the disabled B2B Quote UI element.** The tracker explicitly states:
  *"Keep UI visually disabled until product decision made; do not remove button."*
  The disabled button is a deliberate holding pattern, not dead code.
- This unit has NO parent sibling that is VERIFIED_COMPLETE. There is no B2B Quote A-slice.
  Nothing authorizes partial implementation.
- D-010 applies: product-deferred scope must not be reopened as a defect fix.
- LOW risk designation (tracker): low business risk, but governance posture still requires
  product authorization before any code change in this domain.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as DEFERRED) |
| Why is it deferred? | `governance/control/BLOCKED.md` — Section 2 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-010) |
| When can it be reopened? | After product decision in `governance/decisions/PRODUCT-DECISIONS.md` |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` line ~106 area |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-17 — GOV-OS-003 Unit Record Migration Batch 1. Status confirmed: DEFERRED.
