---
unit_id: CONTROL-PLANE-ONBOARDING-OUTCOME-WRITE-CONTEXT-HARDENING-001
title: Control-plane onboarding outcome write-context hardening
type: IMPLEMENTATION
status: CLOSED
wave: W5
plane: CONTROL
opened: 2026-04-02
closed: 2026-04-02
verified: 2026-04-02
commit: "877176e"
evidence: "ANALYSIS_CONFIRMATION: the onboarding-outcome route in server/src/routes/control.ts used withOrgAdminContext, which delegated to withDbContext and SET LOCAL ROLE texqtic_app before organizations.update(...) · FAILURE_CONFIRMATION: a rollback-only live DB probe reproduced the exact permission seam with Postgres 42501 permission denied for table organizations under the old helper posture · IMPLEMENTATION_CONFIRMATION: commit 877176e switched only the onboarding-outcome route from withOrgAdminContext(...) to the existing withOrgAdminWriteContext(...) helper already used by the hardened activation path · VALIDATION_CONFIRMATION: server typecheck passed, editor/file errors were clean, and a rollback-only probe using the corrected native admin-write posture succeeded through organizations.update(...) and then rolled back deliberately · SEPARATION_CONFIRMATION: route validation, mutable-state guard behavior, audit payload shape, and response semantics remained intact and the separate finding at control.ts:387 remained out of scope"
doctrine_constraints:
  - D-004: this unit is limited to the one proven onboarding-outcome write-context seam only and must not widen into activation redesign, broader control-plane refactor, or adjacent route cleanup
  - D-007: implementation was confined to server/src/routes/control.ts only
  - D-011: acceptance is limited to removing the organizations write-permission failure under the bounded control-plane route posture
  - D-013: any remaining issue outside this exact route seam must stay separately classified
decisions_required: []
blockers: []
---

## Unit Summary

`CONTROL-PLANE-ONBOARDING-OUTCOME-WRITE-CONTEXT-HARDENING-001` exists only to harden the
onboarding-outcome persistence route so organization writes no longer execute through the unsafe
app-role helper posture.

Result: `CLOSED`.

The unit fixed a real bounded backend seam by switching the route to the existing native
admin-write helper already used by the hardened activation path.

## Exact Change

- changed only the onboarding-outcome route in `server/src/routes/control.ts`
- switched only this route from `withOrgAdminContext(...)` to `withOrgAdminWriteContext(...)`
- preserved validation, mutable-state guard behavior, audit payload shape, and response semantics

## Validation Basis

- `pnpm -C server exec tsc --noEmit` passed
- editor/file errors on `server/src/routes/control.ts` reported none
- rollback-only live DB probe under the old posture reproduced Postgres `42501 permission denied
  for table organizations`
- rollback-only live DB probe under the new posture succeeded through `organizations.update(...)`
  and then rolled back deliberately

## Separate Findings

- adjacent finding remains separate and unchanged: `server/src/routes/control.ts:387` is not part
  of this close gate