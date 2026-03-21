---
unit_id: GOV-NAV-01
title: Bounded navigation-layer upgradation child
type: GOVERNANCE
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-21
closed: null
verified: null
commit: null
evidence: "GOVERNANCE_RECONCILIATION_CONFIRMATION: GOV-DEC-NAVIGATION-LAYER-UPGRADATION-DISPOSITION recorded the bounded navigation-layer direction only as one later separate OPENING_CANDIDATE; GOV-DEC-NAVIGATION-LAYER-CHILD-OPENING-DISPOSITION recorded that the bounded child is READY_FOR_OPENING only and explicitly preserved that READY_FOR_OPENING is not OPEN; GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING now opens GOV-NAV-01 as the sole bounded governance-navigation unit for the current cycle with no product implementation, doctrine rewrite, governance-lint change, tooling rollout, CI rollout, Playwright rollout, test rollout, AdminRBAC reopening, G-026 reopening, workflow collapse, or automatic authorization shortcut authorized"
doctrine_constraints:
  - D-004: this is one bounded governance-navigation unit only; no second navigation/process child or broad rewrite may be mixed in
  - D-007: governance-only units must not touch application code, schema, tests, CI workflows, or repo tooling under this opening
  - D-013: human-only governance judgment boundaries must remain explicit and preserved
  - D-014: process hardening must remain evidence-triggered rather than instinct-led expansion
decisions_required:
  - GOV-DEC-NAVIGATION-LAYER-UPGRADATION-DISPOSITION: DECIDED (2026-03-21, Paresh)
  - GOV-DEC-NAVIGATION-LAYER-CHILD-OPENING-DISPOSITION: DECIDED (2026-03-21, Paresh)
  - GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING: DECIDED (2026-03-21, Paresh)
blockers: []
---

## Unit Summary

`GOV-NAV-01` is the sole bounded governance-navigation unit for the current cycle.

It is limited to defining a bounded navigation simplification layer for low-risk governance
meta-steps only: lighter-weight approval and acknowledgment paths, clearer distinctions between
doctrine-changing moves and non-authorizing records, reduced ceremony for non-authorizing records,
and sequencing ergonomics that preserve doctrine.

This is a bounded governance-navigation unit only. No implementation of tooling, product
behavior, or doctrine rewrite is authorized.

## Acceptance Criteria

- [ ] Lighter-weight paths for low-risk approvals and acknowledgments are defined
- [ ] Distinctions between doctrine changes, openings/authorizations, meta-confirmations, and post-close observations are defined
- [ ] Reduced ceremony rules for non-authorizing records are defined
- [ ] Sequencing ergonomics improvements are defined without weakening doctrine
- [ ] Human-only governance judgment is preserved where required
- [ ] Evidence-triggered hardening is preserved
- [ ] No implementation/tooling/linter/product/doctrine-rewrite work is bundled in

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/units/GOV-NAV-01.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/log/EXECUTION-LOG.md`
- `governance/decisions/GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING.md`

No other files are authorized for edit in this opening step.

## Files Read-Only

- `governance/control/BLOCKED.md`
- `governance/control/DOCTRINE.md`
- `governance/decisions/**` except `governance/decisions/GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING.md`
- `governance/units/**` except `governance/units/GOV-NAV-01.md`
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

- Disposition decision id: `GOV-DEC-NAVIGATION-LAYER-UPGRADATION-DISPOSITION`
- Readiness decision id: `GOV-DEC-NAVIGATION-LAYER-CHILD-OPENING-DISPOSITION`
- Opening decision id: `GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING`
- Preserved Layer 0 posture on entry: no implementation-ready unit was `OPEN`, `NEXT-ACTION` was `OPERATOR_DECISION_REQUIRED`, `TECS-FBW-ADMINRBAC` remained `DESIGN_GATE`, `GOV-VERIFY-01` remained `CLOSED`, no broader AdminRBAC posture was implied, and no broader G-026 posture was implied
- This opening preserves that `READY_FOR_OPENING` is not `OPEN`, `OPEN` is not `IMPLEMENTED`, `IMPLEMENTED` is not `VERIFIED_COMPLETE`, and `VERIFIED_COMPLETE` is not `CLOSED`

## Exact In-Scope Boundary

This unit may define only:

- lighter-weight paths for low-risk approvals and acknowledgments only
- clearer distinctions between doctrine-changing moves, opening/authorization moves, low-risk meta-confirmations, and post-close advisory observations
- reduced ceremony rules for non-authorizing governance records only
- sequencing-ergonomics improvements that preserve one-unit discipline, atomic commits, explicit boundaries, mandatory post-close audit, and conservative wording rules
- navigation-efficiency improvements only, not doctrine rollback
- preserved human-only governance judgment where required
- preserved evidence-triggered hardening rather than instinct-led expansion

## Exact Exclusions

`GOV-NAV-01` does not itself authorize or include:

- product implementation
- doctrine rewrite
- governance-lint engine changes
- verification tooling rollout
- CI workflow changes
- Playwright rollout
- test creation or editing
- script creation or editing
- package or lockfile changes
- schema, migration, Prisma, RLS, seed, or contract changes
- AdminRBAC expansion or reopening
- G-026 expansion or reopening
- broad governance rewrite
- broad workflow collapse
- automatic authorization shortcuts
- opening any second navigation/process child
- any implementation authorization beyond this governance-navigation unit itself

## Allowed Next Step

Implementation of `GOV-NAV-01` governance-navigation design only.

## Forbidden Next Step

Any product, tooling, CI, Playwright, test, governance-lint, script, schema, contract,
AdminRBAC, G-026, or doctrine-rewrite implementation.

## Drift Guards

- Do **not** widen this unit into a broad governance rewrite
- Do **not** widen this unit into workflow collapse
- Do **not** create automatic authorization shortcuts
- Do **not** open a second child by implication from this opening

## Opening Consequence

`GOV-NAV-01` is now `OPEN` as the sole bounded governed unit for this cycle.
`NEXT-ACTION` must point only to `GOV-NAV-01` until a later separate governance step changes it.