---
unit_id: GOV-VERIFY-01
title: Mandatory automated verification policy-design child
type: GOVERNANCE
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-21
closed: null
verified: null
commit: null
evidence: "GOVERNANCE_RECONCILIATION_CONFIRMATION: GOV-DEC-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION recorded the bounded policy-design candidate only; GOV-APPROVE-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION approved that posture without expansion; GOV-DEC-AUTOMATED-VERIFICATION-POLICY-CHILD-OPENING-DISPOSITION recorded READY_FOR_OPENING only and explicitly preserved that READY_FOR_OPENING is not OPEN; GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING now opens GOV-VERIFY-01 as the sole bounded governance policy-design unit with Layer 0 preserved, TECS-FBW-ADMINRBAC remaining DESIGN_GATE, and no tooling, CI, Playwright, test, linter, or product implementation authorization"
doctrine_constraints:
  - D-004: this is one bounded policy-design unit only; no second verification/process child or broad program may be mixed in
  - D-007: governance-only units must not touch application code, schema, tests, CI workflows, or repo tooling under this opening
  - D-013: machine-checkable versus human-only governance boundaries must remain explicit and preserved
  - D-014: process hardening must remain evidence-triggered rather than instinct-led expansion
decisions_required:
  - GOV-DEC-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION: DECIDED (2026-03-21, Paresh)
  - GOV-APPROVE-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION: RECORDED (2026-03-21, Paresh)
  - GOV-DEC-AUTOMATED-VERIFICATION-POLICY-CHILD-OPENING-DISPOSITION: DECIDED (2026-03-21, Paresh)
  - GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING: DECIDED (2026-03-21, Paresh)
blockers: []
---

## Unit Summary

`GOV-VERIFY-01` is the sole bounded governance/policy-design unit for the current cycle.

It is limited to defining TexQtic's policy for declared verification profiles at Opening,
closure evidence requirements by unit type and acceptance boundary, category-specific verification
expectations, explicit closure-verdict posture, and manual-check advisory posture unless
separately automated later.

This is a bounded policy-design unit only. No implementation of tooling or product behavior is
authorized.

## Acceptance Criteria

- [ ] Declared verification profiles at Opening are defined
- [ ] Closure evidence requirements by unit type are defined
- [ ] Bounded verification categories are defined
- [ ] Explicit closure-verdict posture is defined
- [ ] Manual-check advisory posture is defined
- [ ] Machine-checkable versus human-only boundary is preserved
- [ ] No implementation, tooling rollout, or product behavior change is bundled in

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/units/GOV-VERIFY-01.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING.md`

No other files are authorized for edit in this opening step.

## Files Read-Only

- `governance/control/BLOCKED.md`
- `governance/control/DOCTRINE.md`
- `governance/decisions/**` except `governance/decisions/GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING.md`
- `governance/units/**` except `governance/units/GOV-VERIFY-01.md`
- `scripts/**`
- `.github/workflows/**`
- `tests/**`
- `playwright/**`
- `server/**`
- `src/**`
- `app/**`
- `components/**`
- `services/**`
- `shared/**`
- `prisma/**`
- `supabase/**`
- `package.json`
- `pnpm-lock.yaml`

## Evidence Record

- Opening decision id: `GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING`
- Readiness decision id: `GOV-DEC-AUTOMATED-VERIFICATION-POLICY-CHILD-OPENING-DISPOSITION`
- Preserved Layer 0 posture on entry: `NEXT-ACTION = OPERATOR_DECISION_REQUIRED`, no implementation-ready unit `OPEN`, `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`, no broader AdminRBAC posture implied, no broader G-026 posture implied
- This opening preserves that `READY_FOR_OPENING` is not `OPEN` until a separate opening step explicitly creates the unit
- This opening authorizes only governance policy design and no implementation of mechanisms

## Exact In-Scope Boundary

This unit may define only:

- declared verification profiles fixed at Opening time for future implementation units
- closure evidence requirements by unit type and acceptance boundary
- bounded category expectations for governance-only, UI/workflow, API/contract, runtime-route/deployment-parity, and DB-affecting units
- one explicit closure-verdict posture using bounded canonical wording only
- manual-check advisory posture unless separately automated later
- preserved machine-checkable versus human-only governance boundary
- preserved evidence-triggered process hardening posture

## Exact Exclusions

The following remain out of scope for `GOV-VERIFY-01`:

- Playwright implementation
- test creation or editing
- verifier tooling creation
- CI workflow creation or editing
- governance-lint refinement
- package or lockfile changes
- product code changes
- schema, migration, Prisma, seed, or contract changes
- AdminRBAC reopening
- G-026 reopening
- broad QA transformation
- broad CI redesign
- repo-wide enforcement rollout
- any implementation authorization of any kind beyond this policy-design unit itself

## Allowed Next Step

Implementation of `GOV-VERIFY-01` policy design only.

## Forbidden Next Step

- Do **not** implement Playwright under this unit
- Do **not** add or edit tests under this unit
- Do **not** create verifier tooling under this unit
- Do **not** create or edit CI workflows under this unit
- Do **not** refine governance-lint under this unit
- Do **not** change product behavior under this unit
- Do **not** change schema, migrations, Prisma, seeds, contracts, or RLS under this unit
- Do **not** reopen AdminRBAC or G-026 under this unit
- Do **not** treat this opening as policy implementation completion
- Do **not** open a second verification/process child by implication

## Drift Guards

- No broad QA or CI transformation may be bundled into this unit.
- No navigation-remediation or future navigation-layer redesign may be bundled into this unit.
- No second child opening may be implied from this unit.
- If implementation starts to require tooling rollout, CI rollout, Playwright rollout, test rollout, governance-lint change, or product behavior change, stop and return to governance rather than widening this unit implicitly.

## Last Governance Confirmation

2026-03-21 — `GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING`. `GOV-VERIFY-01` opened as the sole
bounded governance/policy-design unit for the current cycle. Scope is limited to declared
verification profiles at Opening, closure evidence requirements by unit type and acceptance
boundary, bounded category expectations, explicit closure-verdict posture, and manual-check
advisory posture only. No implementation of tooling or product behavior was authorized, no second
unit was opened, and `NEXT-ACTION` now points only to `GOV-VERIFY-01`.