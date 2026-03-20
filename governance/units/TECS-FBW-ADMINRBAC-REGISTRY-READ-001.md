---
unit_id: TECS-FBW-ADMINRBAC-REGISTRY-READ-001
title: Control-plane admin access registry read surface
type: IMPLEMENTATION
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-03-20
closed: 2026-03-20
verified: 2026-03-20
commit: 38419b5651ea736c2b569d6182002b9bd25c6eb3 · 50d1e36adacb3a58ae714741193d61d5e65696e5
evidence: backend runtime proof complete · frontend runtime proof complete · type-level proof complete
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

- [x] A control-plane AdminRBAC read route exists for the bounded admin access registry surface
- [x] The route returns current internal control-plane admin identities only
- [x] The route returns bounded control-plane role posture only
- [x] The route is control-plane authenticated and does not trust client-supplied tenant or org identifiers
- [x] The UI no longer depends on placeholder `ADMIN_USERS` data for this surface
- [x] The UI preserves canonical terminology separation among `TenantAdmin`, `PlatformAdmin`, and `SuperAdmin`
- [x] The UI does not expose invite, revoke/remove, or role-change controls
- [x] No tenant-plane membership or white-label staff membership data is mixed into the surface
- [x] No blanket cross-tenant read-everything posture is introduced
- [x] Any audit visibility associated with the surface remains explicit and bounded to this read-only control-plane use case

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

- Implementation commit: `38419b5651ea736c2b569d6182002b9bd25c6eb3` — bounded control-plane admin access registry read surface across `components/ControlPlane/AdminRBAC.tsx`, `server/src/routes/control.ts`, `services/controlPlaneService.ts`, `server/src/__tests__/admin-rbac-registry-read.integration.test.ts`, and `tests/adminrbac-registry-read-ui.test.tsx`
- Verification runtime-test commit: `50d1e36adacb3a58ae714741193d61d5e65696e5` — frontend runtime verification enabled and passing for `tests/adminrbac-registry-read-ui.test.tsx`
- Type-level proof: `pnpm exec tsc --noEmit` — PASS
- Backend runtime proof: `pnpm --dir server exec vitest run src/__tests__/admin-rbac-registry-read.integration.test.ts` — PASS; SUPER_ADMIN read allowed; SUPPORT denied; no `passwordHash` leakage in response
- Frontend runtime proof: `pnpm --dir server exec vitest --root .. run tests/adminrbac-registry-read-ui.test.tsx` — PASS; registry fetch contract, SuperAdmin/PlatformAdmin distinction, empty state, error state, and negative assertions for mutation controls / tenant-plane language all satisfied

## Governance Closure

Closed 2026-03-20 by GOV-CLOSE-TECS-FBW-ADMINRBAC-REGISTRY-READ-001 after prior implementation,
verification, and governance sync were already recorded.

## Allowed Next Step

No further implementation work is authorized inside this unit.

No further action is authorized inside this closed child unit.

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

2026-03-20 — GOV-CLOSE-TECS-FBW-ADMINRBAC-REGISTRY-READ-001. Status recorded as `CLOSED` after
the previously completed implementation, verification, and governance-sync chain.