---
unit_id: TECS-FBW-ADMINRBAC
title: AdminRBAC Invite and Revoke Authority
type: IMPLEMENTATION
status: DESIGN_GATE
wave: W5
plane: CONTROL
opened: 2026-03-09
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-002: admin bypass must be explicit and audited; invite/revoke must be fully audited
  - D-009: design-gated; must not be forced into implementation prior to design decision
  - D-011: org_id-scoped admin role assignments required; no cross-tenant admin elevation
decisions_required:
  - DESIGN-DEC-ADMINRBAC-PRODUCT: DECIDED (2026-03-20, Paresh)
  - SECURITY-DEC-ADMINRBAC-POSTURE: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING: DECIDED (2026-03-20, Paresh)
blockers:
  - id: GATE-ADMINRBAC-003
    description: Broad parent stream remains too wide to open as one first implementation-ready unit; child slices must be sequenced separately
    registered: 2026-03-20
---

## Unit Summary

TECS-FBW-ADMINRBAC is the broad parent umbrella for the AdminRBAC control-plane surface:
invite, revoke, role assignment/change, and related high-risk authority boundaries. Both
required gate decisions are now recorded, but the parent remains non-open because it is still
too broad to truthfully open as one first implementation-ready unit. The first bounded child
slice has now been split out separately as `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`.

This parent record remains `DESIGN_GATE` to preserve the boundary that invite, revoke,
role-change mutation, and broader authority design must not be collapsed into the first read-only
child slice. The dead-button UI stop-gap applied in PW5-U3 (commit d5ee430, 2026-03-09) remains
non-authorizing historical context only.

## Acceptance Criteria

*Parent unit remains non-open. Criteria for later mutation or broader authority child slices must
be defined in separate child-unit records and must not be inferred from this umbrella record.*

- [ ] Any later invite child slice is separately sequenced and bounded
- [ ] Any later revoke/remove child slice is separately sequenced and bounded
- [ ] Any later role assignment/change mutation slice is separately sequenced and bounded
- [ ] No later child slice weakens the TenantAdmin / PlatformAdmin / SuperAdmin terminology lock
- [ ] No later child slice infers blanket read-everything or ambient bypass authority

## Files Allowlisted (Modify)
*None. This umbrella parent record is not itself implementation-ready.*

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `components/ControlPlane/AdminRBAC.tsx` (read-only observation only)
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record
- Split/opening decision: `GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING` — broad parent remains non-open; only a read-only access-registry child slice is a truthful first candidate
- Split/opening decision: `GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING` — first child unit opened as `TECS-FBW-ADMINRBAC-REGISTRY-READ-001`

## Governance Closure
*Not yet set — unit is DESIGN_GATE and not implementation-ready.*

---

## Allowed Next Step

Do not open this parent directly.

No AdminRBAC implementation unit is currently OPEN.

The bounded child unit `TECS-FBW-ADMINRBAC-REGISTRY-READ-001` is now VERIFIED_COMPLETE and any
separate closure handling for that child must remain distinct from this parent umbrella record.

Any later AdminRBAC mutation or broader authority work requires a separate bounded child-unit
sequencing decision.

## Forbidden Next Step

- Do **not** implement admin invite or revoke logic, endpoints, or UI flows
- Do **not** treat the existence of the open read-only child slice as authorization for parent-stream mutation work
- Do **not** touch `components/ControlPlane/AdminRBAC.tsx` for any implementation purpose
- Do **not** interpret the PW5-U3 dead-button UI lock as authorization to implement — it is
  explicitly a stop-gap, not a green light
- Do **not** treat this parent as OPEN or partially started
- Do **not** collapse invite, revoke, role-change mutation, and read-only registry work into one unit
- Do **not** introduce any admin provisioning logic outside the approved child-unit allowlist when authorized

## Drift Guards

- **CRITICAL: PW5-U3 Stop-Gap is Not Authorization.** Commit `d5ee430` (2026-03-09) applied a
  dead-button UI lock to AdminRBAC.tsx as PW5-U3. This was a UI governance stop-gap — it locked
  the button to prevent accidental invocation. It is NOT product or security authorization to
  implement the underlying invite/revoke logic.
- **Broad parent remains non-open by design.** Even after both gate decisions are recorded, this
  parent umbrella record must not be opened as one implementation-ready unit when the first
  truthful slice is narrower than the parent title.
- **HIGH risk classification.** There is currently no auditable admin provisioning pathway.
  Any code touching admin-level access control must meet audit-trail requirements (D-002).
- **Control-plane only.** AdminRBAC is a control-plane surface (PLANE: CONTROL). Do not allow
  tenant-plane code to call or rely on admin provisioning pathways.
- **Terminology lock is mandatory.** Future child slices must preserve `TenantAdmin`,
  `PlatformAdmin`, and `SuperAdmin` exactly and must not collapse them into `Admin`.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as DESIGN_GATE) |
| What are the gates? | `governance/control/BLOCKED.md` — Section 3 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-002, D-009) |
| What authorizes movement? | Separate bounded child-unit sequencing decisions recorded in `governance/decisions/` (Layer 2) |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` |
| PW5-U3 commit reference | d5ee430 (2026-03-09) — dead-button only, not implementation |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-20 — GOVERNANCE-SYNC-TECS-FBW-ADMINRBAC-REGISTRY-READ-001. Parent remains `DESIGN_GATE`
as the broad non-open umbrella stream after the bounded child slice
`TECS-FBW-ADMINRBAC-REGISTRY-READ-001` reached `VERIFIED_COMPLETE` without opening invite,
revoke, role-change mutation, or broader authority scope.
