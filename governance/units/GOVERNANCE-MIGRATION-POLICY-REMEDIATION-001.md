---
unit_id: GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001
title: Bounded remediation for migration policy alignment
type: GOVERNANCE
status: VERIFIED_COMPLETE
delivery_class: DECISION_QUEUE
wave: W5
plane: CONTROL
opened: 2026-03-24
closed: null
verified: 2026-03-24
commit: "0db8de4"
evidence: "VERIFICATION_SCOPE_CONFIRMATION: remediation implementation commit 0db8de4 changed only package.json, server/package.json, docs/ops/prisma-migrations.md, docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md, and this unit file · PACKAGE_PATH_CONFIRMATION: root and server db:migrate entry points now default to db:migrate:tracked, server db:rls is blocked as non-default guidance, db:rls:exception is explicitly exception-only, and db:push is blocked as legacy/unsafe · DOC_GUIDANCE_CONFIRMATION: docs/ops/prisma-migrations.md now states repo-managed Prisma deploy as the default lawful tracked-migration path, direct SQL as exception-only, and mandatory remote validation expectations; MASTER-IMPLEMENTATION-PLAN-2026-03.md now preserves older Wave 3 psql-plus-ledger-reconcile practice as historical or exception-only context rather than current default guidance · LAYER_0_CONFIRMATION: OPEN-SET.md, NEXT-ACTION.md, and SNAPSHOT.md remain unchanged after implementation, and CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains the sole ACTIVE_DELIVERY authorization"
doctrine_constraints:
  - D-004: this is one bounded governance-only remediation unit only; no second migration-policy child or broader database-governance program may be mixed in
  - D-007: opening only; no package-script edits, migration-doc edits, tooling changes, migration execution, DB-state changes, env edits, or application/code changes occur in this operation
  - D-011: GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001 remains the authority source throughout this unit, and current Layer 0 sequencing plus sole ACTIVE_DELIVERY authorization must remain unchanged unless separately governed
  - D-013: remediation framing is not implementation, surface identification is not execution authority, and no migration method may be re-litigated inside this opening
decisions_required:
  - GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001: DECIDED (2026-03-23, Paresh)
  - GOV-DEC-GOVERNANCE-MIGRATION-POLICY-REMEDIATION-OPENING: DECIDED (2026-03-24, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001` is one bounded concurrent governance-only unit.

It is limited to defining the exact later remediation scope needed to align repo-advertised
migration entry points and stale forward-looking migration instructions with the already-decided
canonical migration execution and remote validation policy.

The bounded remediation implementation is now complete inside this unit on the exact allowlisted
package and documentation surfaces only.

This unit does not authorize migration execution, DB-state changes, Layer 0 authority changes, or
product/application code changes.

## Layer 0 State Confirmation

Exact Layer 0 posture on entry:

- `OPEN-SET.md`: `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` is `OPEN` with
  `ACTIVE_DELIVERY`, `GOVERNANCE-SENTINEL-V1-SPEC-001` is `OPEN` with `DECISION_QUEUE`, and
  `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- `NEXT-ACTION.md`: points only to `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- `SNAPSHOT.md`: preserves the certification unit as the sole `ACTIVE_DELIVERY` authorization

This confirms all required entry truths:

- the migration execution doctrine is already decided and need not be reopened
- the current implementation authorization remains the certification unit only
- the migration-policy remediation opening must remain concurrent governance-only work

## Opening Decision

Yes — open one bounded concurrent governance-only remediation unit only if the exact scope below
is preserved.

## Exact Bounded Remediation Objective

Define the exact later remediation boundary required to retire, relabel, or clearly bound
conflicting migration entry points and align stale forward-looking migration instructions to the
already-decided canonical migration execution and remote validation policy.

## Exact In-Scope Boundary

This unit is limited to:

- preserving `GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001` as the authority source
- defining the exact later remediation boundary for conflicting migration entry points
- defining the exact later remediation boundary for stale forward-looking migration instruction docs
- identifying the exact repo surfaces likely in scope for that later remediation work
- preserving current Layer 0 sequencing, `NEXT-ACTION`, and sole `ACTIVE_DELIVERY` authority
- defining the bounded future verification profile for that later remediation step only

## Exact Out-of-Scope Boundary

This unit excludes all of the following:

- implementation in this opening operation
- editing `package.json` in this opening operation
- editing `server/package.json` in this opening operation
- editing `docs/ops/prisma-migrations.md` in this opening operation
- editing `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` in this opening operation
- any migration execution
- any database-state change
- any env or secret-bearing surface edit
- any Layer 0 authority change
- any `NEXT-ACTION` change
- any change to the current `ACTIVE_DELIVERY` posture
- Sentinel work
- product/application code changes
- certification implementation changes
- contract/OpenAPI changes
- CI/platform-tooling implementation
- hidden expansion into a broader database-governance or migration-tooling program

## Exact Likely Remediation Surfaces

The later remediation step, if separately performed, is expected to remain bounded to the
following exact repo surfaces:

- `package.json`
- `server/package.json`
- `docs/ops/prisma-migrations.md`
- `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`

These are identified as likely remediation surfaces only. No edits to them are performed in this
opening step.

## Exact Acceptance Boundary

Acceptance is satisfied only when:

- a lawful opening decision artifact exists for this remediation unit
- a lawful Layer 1 unit record exists for this remediation unit
- the later remediation boundary is explicitly fixed and remains bounded
- the likely remediation surfaces are explicitly named and remain bounded
- the already-decided migration execution doctrine remains the authority source
- current Layer 0 sequencing, `NEXT-ACTION`, and sole `ACTIVE_DELIVERY` authority remain
  unchanged
- no package-script edits, migration-doc edits, tooling changes, migration execution, or DB-state
  changes are performed by this opening step

## Implementation Result

The bounded remediation implementation now records all of the following on the allowlisted
surfaces only:

- root `package.json` now exposes the canonical tracked-migration path explicitly through
  `db:migrate:tracked`, while `db:migrate` now aliases that canonical path instead of routing to
  a conflicting server shortcut
- `server/package.json` now exposes `db:migrate:tracked` as the canonical tracked-migration path,
  while `db:migrate` now aliases that canonical path instead of resolving to `prisma migrate dev`
- `server/package.json` now relabels the direct SQL RLS surface as `db:rls:exception` and blocks
  the old `db:rls` shortcut from presenting itself as a default lawful path
- `server/package.json` now blocks `db:push` as a legacy/unsafe surface so it cannot be mistaken
  for a lawful governed remote migration path
- `docs/ops/prisma-migrations.md` now distinguishes the default repo-managed Prisma path, the
  exception-only direct SQL path, and the mandatory remote validation expectations clearly
- `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` now preserves its Wave 3 migration
  references as historical or exception-only context rather than current default guidance

## Exact Verification Profile

- unit type: governance-only remediation verification
- required verification modes:
  - governance artifact inspection
  - package-script inspection
  - docs instruction inspection
  - Layer 0 consistency review
  - bounded-scope compliance review
- exclusions:
  - no implementation execution
  - no migration execution
  - no runner execution
  - no product verification
  - no database validation

## Governance Posture After Opening

Resulting governance posture after this opening:

- one implementation unit remains `ACTIVE_DELIVERY`
- two governance-only units are now concurrently `OPEN` with `DECISION_QUEUE` posture
- the new open unit is `GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001`
- the already-decided migration execution doctrine remains authoritative
- no implementation has been executed yet
- the next canonical phase for this unit is later bounded remediation implementation only if
  separately authorized

## Verification Record

- Verification date: `2026-03-24`
- Verification unit type: governance-only remediation verification
- Implementation commit inspected: `0db8de4`
- Verification surfaces inspected:
  - `package.json`
  - `server/package.json`
  - `docs/ops/prisma-migrations.md`
  - `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`
  - `governance/units/GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001.md`
  - `governance/decisions/GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001.md`
  - `governance/decisions/GOV-DEC-GOVERNANCE-MIGRATION-POLICY-REMEDIATION-OPENING.md`
  - `governance/control/OPEN-SET.md`
  - `governance/control/NEXT-ACTION.md`
  - `governance/control/SNAPSHOT.md`

Verification findings:

- `package.json` now advertises the canonical tracked-migration path through `db:migrate:tracked`,
  and `db:migrate` now resolves to that same tracked path rather than to conflicting legacy
  server behavior
- `server/package.json` now advertises `db:migrate:tracked` as the default tracked-migration
  path, while `db:migrate` aliases that path and no longer resolves to `prisma migrate dev`
- `server/package.json` now retains direct SQL only under explicit exception posture via
  `db:rls:exception`, while `db:rls` is blocked with corrective guidance and `db:push` is blocked
  as legacy/unsafe
- `docs/ops/prisma-migrations.md` now presents repo-managed Prisma deploy as the default lawful
  tracked-migration path, presents direct SQL as exception-only, and includes forward remote
  validation expectations
- `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` now preserves Wave 3 psql-plus-ledger-
  reconcile language as historical practice or exception-only context instead of current default
  guidance
- `OPEN-SET.md`, `NEXT-ACTION.md`, and `SNAPSHOT.md` remained unchanged during the remediation
  implementation commit, and `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole
  `ACTIVE_DELIVERY` authorization
- no migration execution, Prisma command execution, DB-state change, product/application code
  change, or Sentinel work was performed by the remediation implementation commit

Verification verdict: `VERIFIED_COMPLETE`

No defects found.

## Allowed Future Remediation Boundary

The later remediation step, if separately performed, must remain bounded to aligning repo-
advertised migration entry points and stale forward-looking migration instructions to the already-
decided canonical migration execution and remote validation policy.

The later remediation step may retire, relabel, or clearly bound conflicting migration entry
points and may align stale forward-looking migration instruction docs on the exact likely surfaces
listed above only.

The later remediation step must not reopen migration doctrine, change current Layer 0 authority,
execute migrations, change DB state, expand into broader database-governance redesign, or absorb
product/application, certification, contract, Sentinel, or CI/platform work.

## Risks / Blockers

- later implementation must distinguish stale forward-looking guidance from truthful historical
  evidence so remediation does not rewrite legitimate history
- later implementation must preserve package and doc boundaries without drifting into tooling or
  runtime execution work
- any additional conflicting migration surface discovered outside the exact likely surfaces listed
  here would require explicit scope review before inclusion

## Implementation Status Statement

This bounded governance-only remediation implementation is complete on the allowlisted package and
documentation surfaces only, and the verification result is now recorded as `VERIFIED_COMPLETE` in
Layer 1. No Layer 0 change is made by this verification step.

## Atomic Commit

`[GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001] verify bounded migration policy alignment remediation`