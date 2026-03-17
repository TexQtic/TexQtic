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
  - DESIGN-DEC-ADMINRBAC-PRODUCT (product scope decision — not yet made)
  - SECURITY-DEC-ADMINRBAC-POSTURE (security posture decision — not yet made)
blockers:
  - id: GATE-ADMINRBAC-001
    description: Product approval not yet granted for admin invite/revoke implementation
    registered: 2026-03-09
  - id: GATE-ADMINRBAC-002
    description: Security posture decision not recorded in governance/decisions/SECURITY-DECISIONS.md
    registered: 2026-03-09
---

## Unit Summary

TECS-FBW-ADMINRBAC covers the AdminRBAC control-plane surface: the ability to invite
administrators, revoke access, and manage admin role assignments. This unit is classified
HIGH risk because there is currently no auditable admin provisioning pathway. It sits behind
a DESIGN_GATE — both a product scope decision and a security posture decision must be
formally recorded before implementation may begin. The dead-button UI stop-gap applied in
PW5-U3 (commit d5ee430, 2026-03-09) is NOT authorization to implement.

## Acceptance Criteria

*Not yet active — unit is DESIGN_GATE. Criteria will be defined after both gate decisions are recorded.*

Expected future criteria (illustrative only; do not treat as active work):
- [ ] DESIGN-DEC-ADMINRBAC-PRODUCT recorded in `governance/decisions/PRODUCT-DECISIONS.md`
- [ ] SECURITY-DEC-ADMINRBAC-POSTURE recorded in `governance/decisions/SECURITY-DECISIONS.md`
- [ ] Backend: admin invite and revoke endpoints designed per security posture decision
- [ ] Audit trail written on every admin provisioning action (D-002)
- [ ] org_id-scoped role assignments — no cross-tenant admin elevation possible (D-011)
- [ ] UI dead-button gating removed only after backend is live
- [ ] TypeScript type-check passes (EXIT 0)
- [ ] Lint passes (EXIT 0)
- [ ] Security review evidence recorded in Evidence Record

## Files Allowlisted (Modify)
*Not yet defined — pending product and security gate decisions.*

## Files Read-Only
- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/BLOCKED.md`
- `components/ControlPlane/AdminRBAC.tsx` (read-only observation only)
- `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` (historical reference)

## Evidence Record
*Not yet recorded — unit is DESIGN_GATE.*

## Governance Closure
*Not yet set — unit is DESIGN_GATE and not implementation-ready.*

---

## Allowed Next Step

**Nothing.** This unit is DESIGN_GATE.

The only allowed next steps (in order) are:
1. Record **DESIGN-DEC-ADMINRBAC-PRODUCT** in `governance/decisions/PRODUCT-DECISIONS.md`
2. Record **SECURITY-DEC-ADMINRBAC-POSTURE** in `governance/decisions/SECURITY-DECISIONS.md`
3. Only after BOTH decisions are recorded: open a new implementation unit that cites both
   decision IDs and defines a constrained allowlist and implementation plan.

## Forbidden Next Step

- Do **not** implement admin invite or revoke logic, endpoints, or UI flows
- Do **not** touch `components/ControlPlane/AdminRBAC.tsx` for any implementation purpose
- Do **not** interpret the PW5-U3 dead-button UI lock as authorization to implement — it is
  explicitly a stop-gap, not a green light
- Do **not** treat this unit as IN_PROGRESS, OPEN, or partially started — it has not begun
- Do **not** promote this unit without BOTH required decisions formally recorded
- Do **not** introduce any admin provisioning logic outside the approved allowlist when authorized

## Drift Guards

- **CRITICAL: PW5-U3 Stop-Gap is Not Authorization.** Commit `d5ee430` (2026-03-09) applied a
  dead-button UI lock to AdminRBAC.tsx as PW5-U3. This was a UI governance stop-gap — it locked
  the button to prevent accidental invocation. It is NOT product or security authorization to
  implement the underlying invite/revoke logic.
- **Two decisions required, both must be documented.** DESIGN-DEC-ADMINRBAC-PRODUCT alone is
  insufficient. SECURITY-DEC-ADMINRBAC-POSTURE is separately required and must be recorded
  in `governance/decisions/SECURITY-DECISIONS.md` (a future Layer 2 file).
- **HIGH risk classification.** There is currently no auditable admin provisioning pathway.
  Any code touching admin-level access control must meet audit-trail requirements (D-002).
- **Control-plane only.** AdminRBAC is a control-plane surface (PLANE: CONTROL). Do not allow
  tenant-plane code to call or rely on admin provisioning pathways.
- D-009: This unit is design-gated. A design gate is not a temporary delay — it is a formal
  block requiring explicit governance decisions before advancement is permitted.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Is this unit open? | `governance/control/OPEN-SET.md` (listed as DESIGN_GATE) |
| What are the gates? | `governance/control/BLOCKED.md` — Section 3 |
| What doctrine applies? | `governance/control/DOCTRINE.md` (D-002, D-009) |
| What authorizes movement? | Both decisions recorded in `governance/decisions/` (Layer 2) |
| Historical context | `docs/governance/IMPLEMENTATION-TRACKER-2026-03.md` |
| PW5-U3 commit reference | d5ee430 (2026-03-09) — dead-button only, not implementation |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-17 — GOV-OS-003 Unit Record Migration Batch 1. Status confirmed: DESIGN_GATE.
Both gate decisions (DESIGN-DEC-ADMINRBAC-PRODUCT and SECURITY-DEC-ADMINRBAC-POSTURE) remain
unrecorded. No implementation work is authorized.
