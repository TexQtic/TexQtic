unit_id: TECS-RUNTIME-VERIFICATION-HARDENING-001
title: Executable runtime verification hardening for implemented B2B workspace and white-label overlay slices
type: IMPLEMENTATION
status: CLOSED
wave: W5
plane: BOTH
opened: 2026-03-21
closed: 2026-03-21
verified: 2026-03-21
commit: 858505b
evidence: "TEST_VERIFICATION: pnpm test:runtime-verification PASS (6 files passed, 39 tests passed) · GOVERNANCE_RECONCILIATION_CONFIRMATION: bounded runtime verification path exists, is repo-runnable, remains limited to B2B workspace and white-label overlay verification hardening only, and introduces no product behavior, schema, migration, Prisma, governance-doctrine, auth redesign, catalog redesign, or routing/domain changes"
doctrine_constraints:
  - D-004: this unit is one bounded verification-hardening slice only; no second unit or broadened QA stream may be mixed in
  - D-007: no product implementation, schema, migration, or Prisma work may be introduced under this verification unit
  - D-011: runtime verification must preserve canonical org_id and realm/session boundary expectations rather than weakening them
decisions_required:
  - GOV-DEC-RUNTIME-VERIFICATION-HARDENING-OPENING: DECIDED (2026-03-21, Paresh)
blockers: []
---

## Unit Summary

`TECS-RUNTIME-VERIFICATION-HARDENING-001` is the sole bounded runtime-verification hardening
unit for the current governance step.

It is limited to making runtime truth executable and repo-runnable for already-implemented slices
that have already shown a verification-confidence gap:

- B2B workspace implemented UI pages in scope
- realm/session transition behavior in scope
- frontend/backend response-envelope contract behavior for affected tenant modules in scope
- white-label overlay storefront/catalog visibility and data-state behavior in scope

This unit does not authorize product feature work. It exists only to harden verification so the
known failure classes surface automatically instead of first appearing during manual operator UI
checks.

## Acceptance Criteria

- [x] One repo-runnable verification command/path exists for this bounded unit
- [x] The bounded verification path executes B2B workspace UI smoke checks for the already-implemented pages in scope
- [x] The bounded verification path exercises realm/session transitions and fails on miswiring
- [x] The bounded verification path asserts frontend/backend response-envelope alignment for the affected tenant modules in scope
- [x] The bounded verification path exercises white-label overlay storefront/catalog visibility and data-state behavior in scope
- [x] The bounded verification path fails when a transaction proxy runtime failure breaks the implemented slice in scope
- [x] No product feature behavior is added or changed by this unit
- [x] No schema, migration, Prisma, broad CI, broad auth, or broad catalog redesign scope is introduced
- [x] No AdminRBAC, RFQ, custom-domain, apex-domain, or DNS scope is introduced

## Files Allowlisted (Modify)

- `tests/**` — only files strictly required for bounded runtime smoke verification and harness wiring
- `server/src/__tests__/**` or `server/tests/**` — only files strictly required for bounded response-envelope and realm/session verification
- `package.json` or `server/package.json` — only if required to expose one repo-runnable verification command/path
- `vite.config.ts` or `server/vitest.config.ts` — only if strictly required to wire the bounded verification path

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/GOV-DEC-RUNTIME-VERIFICATION-HARDENING-OPENING.md`
- existing B2B workspace pages, auth/session surfaces, tenant API clients, white-label overlay storefront pages, and seeded catalog read paths in scope for observation only

## Evidence Record

- Opening decision: `GOV-DEC-RUNTIME-VERIFICATION-HARDENING-OPENING`
- Trigger evidence class: recent bounded implementations passed build/typecheck and bounded verification yet still allowed runtime failures to escape to manual operator inspection
- Runtime failure classes motivating this unit: tenant realm/session miswiring; frontend/backend response-envelope mismatch; transaction proxy runtime failure; white-label overlay storefront/catalog visibility/data-state blocker
- Implementation commit: `858505b` — `test(runtime-verification): harden tenant-enterprise and white-label runtime checks`
- Verification evidence: `pnpm test:runtime-verification` PASS (`6` files passed, `39` tests passed)
- Repo-runnable runtime verification path now exists at root `package.json` and delegates to bounded server-side execution only
- Covered failure classes now surface automatically for the bounded slices: tenant realm/session miswiring, bounded frontend/backend response-envelope mismatch, transaction proxy/service-path regression, and white-label overlay storefront/catalog visibility or data-state failure
- No product behavior change, schema/migration/Prisma work, governance-doctrine change, auth redesign, catalog redesign, routing/domain work, or broader QA/CI transformation was introduced by this unit

## Governance Sync

- Governance sync unit: `GOVERNANCE-SYNC-TECS-RUNTIME-VERIFICATION-HARDENING-001`
- Status transition: `OPEN` → `VERIFIED_COMPLETE`
- Next-action posture after sync: `GOV-CLOSE-TECS-RUNTIME-VERIFICATION-HARDENING-001`

## Governance Closure

- Governance close unit: `GOV-CLOSE-TECS-RUNTIME-VERIFICATION-HARDENING-001`
- Status transition: `VERIFIED_COMPLETE` → `CLOSED`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`
- Mandatory post-close audit result: `DECISION_REQUIRED`

## Allowed Next Step

No further implementation or governance-sync work is authorized inside this closed unit.

## Forbidden Next Step

- Do **not** broaden this unit into a platform-wide QA program
- Do **not** redesign CI under this unit
- Do **not** redesign auth under this unit
- Do **not** redesign catalog behavior under this unit
- Do **not** add or change product features under this unit
- Do **not** modify schema, migrations, Prisma models, or database configuration under this unit
- Do **not** open or imply any second verification-hardening unit under this step
- Do **not** expand into AdminRBAC, RFQ, custom-domain, apex-domain, or DNS work under this unit
- Do **not** treat governance sync as closure; a separate close step is still required
- Do **not** treat closure of this bounded unit as authorization for broad QA, CI, auth, catalog, routing/domain, AdminRBAC, or RFQ follow-on work

## Drift Guards

- This unit is verification hardening only. If implementation requires changing product behavior to make the checks pass, stop and return to governance rather than widening this unit implicitly.
- Repo-runnable does not mean CI redesign. The required output is a runnable verification path inside the repo, not a broad pipeline transformation.
- Affected tenant modules must remain bounded to the implemented slices under review. Do not use this unit to create a generalized contract-testing platform.
- White-label coverage remains limited to overlay storefront/catalog visibility and data-state runtime truth for the implemented path only.
- Governance sync for this unit is recording only; no new implementation, no new opening, and no closure is implied by the VERIFIED_COMPLETE state.
- Closure of this unit does not authorize any follow-on transformation. Future moves require explicit operator sequencing and must not be inferred from this closed bounded unit.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this unit open now? | `governance/decisions/GOV-DEC-RUNTIME-VERIFICATION-HARDENING-OPENING.md` |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |
| What broader work remains unopened? | `governance/control/OPEN-SET.md` and this unit's forbidden next-step section |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-21 — `GOV-CLOSE-TECS-RUNTIME-VERIFICATION-HARDENING-001`. Status transitioned:
`VERIFIED_COMPLETE` → `CLOSED` after the already-recorded implementation, bounded verification,
and governance-sync chain, together with mandatory post-close audit result `DECISION_REQUIRED`.
The repo-runnable runtime verification path exists, covered failure classes now surface
automatically for the bounded B2B workspace and white-label overlay slices, no product behavior
change was introduced, and no broader transformation was authorized by this closure.

