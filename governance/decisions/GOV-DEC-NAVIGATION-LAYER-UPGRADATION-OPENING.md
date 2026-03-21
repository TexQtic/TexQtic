# GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING

Decision ID: GOV-DEC-NAVIGATION-LAYER-UPGRADATION-OPENING
Title: Open GOV-NAV-01 as one bounded navigation-layer upgradation child and no implementation beyond that governance unit
Status: DECIDED
Date: 2026-03-21
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `GOV-VERIFY-01` is `CLOSED`
- the mandatory post-close audit for `GOV-VERIFY-01` was emitted in the same closure operation
- `GOV-DEC-NAVIGATION-LAYER-UPGRADATION-DISPOSITION` is recorded
- `GOV-DEC-NAVIGATION-LAYER-CHILD-OPENING-DISPOSITION` is recorded
- the bounded navigation-layer upgradation child is `READY_FOR_OPENING` only
- `READY_FOR_OPENING` is not `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is currently `OPEN`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no broader AdminRBAC posture is implied
- no broader G-026 posture is implied

The recorded bounded child posture already fixes the exact opening boundary:

- lighter-weight paths for low-risk approvals and acknowledgments only
- clearer distinctions between doctrine-changing moves, opening/authorization moves,
  low-risk meta-confirmations, and post-close advisory observations
- reduced ceremony for non-authorizing governance records only
- sequencing ergonomics improvements that preserve one-unit discipline, atomic commits,
  explicit boundaries, mandatory post-close audit, and conservative wording rules
- navigation efficiency only, not doctrine rollback

The same recorded posture also fixes the exact exclusions:

- no product implementation
- no doctrine rewrite
- no governance-lint engine changes
- no verification tooling rollout
- no CI workflow changes
- no Playwright rollout
- no test creation or editing
- no script creation or editing
- no package or lockfile changes
- no schema, migration, Prisma, RLS, seed, or contract changes
- no AdminRBAC expansion or reopening
- no G-026 expansion or reopening
- no broad governance rewrite
- no broad workflow collapse
- no automatic authorization shortcuts

The opening question is therefore no longer whether the bounded child is mature enough to open.
That readiness was already decided. The question is whether TexQtic should now open exactly one
bounded governance-navigation child and nothing broader.

Verification posture for this opening decision: `GOVERNANCE_RECONCILIATION_CONFIRMATION`.

## Problem Statement

TexQtic now has one bounded governance-navigation child that is specific enough to be opened
without requiring more clarification work first.

If TexQtic does not open it now, the child remains ready but inactive.
If TexQtic opens it too broadly, the opening could be misread as doctrine rewrite, tooling rollout,
governance-lint change, CI rollout, Playwright rollout, or broad workflow redesign.

The smallest truthful opening is therefore one governance-only, navigation-design-only child that
defines the bounded navigation simplification layer and nothing more.

## Decision

TexQtic opens exactly one bounded governance-navigation unit:

- `GOV-NAV-01`
- title: `Bounded navigation-layer upgradation child`

This is the sole authorized next governed unit.

No product implementation unit is opened by this decision.
No doctrine rewrite, governance-lint change, tooling rollout, CI rollout, Playwright rollout, or
broad workflow redesign is opened by this decision.

## Exact In-Scope Boundary

The opened unit is limited to the following governance-navigation scope only:

1. define lighter-weight paths for low-risk approvals and acknowledgments only
2. define clearer distinctions between:
   - doctrine-changing moves
   - opening/authorization moves
   - low-risk meta-confirmations
   - post-close advisory observations
3. define reduced ceremony rules for non-authorizing governance records only
4. define sequencing-ergonomics improvements that preserve:
   - one-unit discipline
   - atomic commits
   - explicit boundaries
   - mandatory post-close audit
   - conservative wording rules
5. define navigation-efficiency improvements only, not doctrine rollback
6. preserve human-only governance judgment where required
7. preserve evidence-triggered hardening rather than instinct-led expansion

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

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

## Implementation Authorization Statement

This decision authorizes exactly one bounded governance-navigation unit only:

- `GOV-NAV-01`

It does **not** authorize implementation of navigation mechanisms.
It does **not** authorize product behavior changes, doctrine rewrite, governance-lint changes,
tooling rollout, CI rollout, Playwright rollout, test rollout, or authorization shortcuts.

## Consequences

- Layer 0 now has exactly one `OPEN` governed unit
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `GOV-NAV-01`
- `GOV-NAV-01` becomes the sole bounded active governed unit for this cycle
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no second unit is opened by this step

## Sequencing Impact

- `OPEN-SET.md` must show `GOV-NAV-01` as `OPEN`
- `NEXT-ACTION.md` must point only to `GOV-NAV-01`
- `SNAPSHOT.md` must reflect that one governed unit is now open for bounded governance-navigation design only
- a new Layer 1 unit record must exist for `GOV-NAV-01`

This decision opens exactly one bounded governance-navigation unit and nothing broader.