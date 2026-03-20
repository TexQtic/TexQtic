---
unit_id: TECS-FBW-ADMINRBAC-REGISTRY-READ-001
title: Control-plane admin access registry read surface
type: IMPLEMENTATION
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-20
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-002: admin visibility and any control-plane bypass posture must remain explicit and auditable
  - D-004: this unit is one bounded read-only AdminRBAC child slice only; no mutation work may be mixed in
  - D-011: no tenant-scoped authority may leak into this control-plane read surface
decisions_required:
  - DESIGN-DEC-ADMINRBAC-PRODUCT: DECIDED (2026-03-20, Paresh)
  - SECURITY-DEC-ADMINRBAC-POSTURE: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING: DECIDED (2026-03-20, Paresh)
blockers: []
---

## Unit Summary

TECS-FBW-ADMINRBAC-REGISTRY-READ-001 is the first implementation-ready AdminRBAC child slice.
It is limited to one bounded control-plane read surface only:

- read-only listing of current internal control-plane admin identities
- display of each current user's bounded control-plane role posture
- control-plane-only visibility sufficient to answer who currently has control-plane admin access
  and what bounded role they hold

This unit must remain read-only. It does not authorize invite, revoke/remove, role assignment or
role change mutation, self-elevation, self-role widening, blanket read-everything posture, tenant
membership visibility, white-label staff visibility, or session invalidation mechanics.

## Acceptance Criteria

- [ ] A control-plane AdminRBAC read route exists for the bounded admin access registry surface
- [ ] The route returns current internal control-plane admin identities only
- [ ] The route returns bounded control-plane role posture only
- [ ] The route is control-plane authenticated and does not trust client-supplied tenant or org identifiers
- [ ] The UI no longer depends on placeholder `ADMIN_USERS` data for this surface
- [ ] The UI preserves canonical terminology separation among `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin`
- [ ] The UI does not expose invite, revoke/remove, or role-change controls
- [ ] No tenant-plane membership or white-label staff membership data is mixed into the surface
- [ ] No blanket cross-tenant read-everything posture is introduced
- [ ] Any audit visibility associated with the surface remains explicit and bounded to this read-only control-plane use case

## Files Allowlisted (Modify)

- `server/src/routes/control.ts` or a dedicated control-plane AdminRBAC read module under `server/src/routes/control/`
- `services/controlPlaneService.ts`
- `components/ControlPlane/AdminRBAC.tsx`
- `shared/contracts/openapi.control-plane.json` — only if required to govern the read contract
- `server/src/__tests__/**` or `server/tests/**` — only files strictly required to verify the bounded read surface
- `tests/**` — only files strictly required to verify the read-only ControlPlane/AdminRBAC surface

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/TECS-FBW-ADMINRBAC.md`
- `governance/decisions/DESIGN-DEC-ADMINRBAC-PRODUCT.md`
- `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md`
- `governance/decisions/GOV-DEC-ADMINRBAC-FIRST-SLICE-SEQUENCING.md`
- `components/ControlPlane/AdminRBAC.tsx`
- `constants.tsx`
- `server/src/routes/auth.ts`
- `server/src/types/index.ts`

## Evidence Record

*Not yet recorded — unit is OPEN and awaiting implementation.*

## Governance Closure

*Not yet set — this unit is OPEN.*

## Allowed Next Step

Implement this bounded read-only child slice only.

## Forbidden Next Step

- Do **not** implement invite, revoke/remove, or role assignment/change mutation in this unit
- Do **not** add self-elevation or self-role widening behavior in this unit
- Do **not** add session invalidation, refresh-token invalidation, or invitation-delivery mechanics in this unit
- Do **not** add impersonation expansion or broader support tooling in this unit
- Do **not** imply or grant blanket `SuperAdmin can read everything` posture in this unit
- Do **not** introduce tenant membership or white-label staff membership visibility in this unit
- Do **not** broaden this unit into a general admin provisioning stream

## Drift Guards

- `TenantAdmin` remains out of scope for this unit
- `PlatformAdmin` remains a bounded internal control-plane role family, not a synonym for `SuperAdmin`
- `SuperAdmin` remains distinct and does not gain mutation or blanket read scope by implication from this read slice
- This unit is read-only and control-plane only; any mutation path requires a separate later child unit
- Placeholder terminology such as `OpsAdmin` or `FinanceAdmin` in current static mock data must not silently become canonical role names

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this child unit open now? | `governance/decisions/GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING.md` |
| Why does the broad parent remain non-open? | `governance/units/TECS-FBW-ADMINRBAC.md` |
| What security posture constrains this read surface? | `governance/decisions/SECURITY-DEC-ADMINRBAC-POSTURE.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-20 — GOV-DEC-ADMINRBAC-REGISTRY-READ-OPENING. Status set to `OPEN` as the first bounded
AdminRBAC child slice.