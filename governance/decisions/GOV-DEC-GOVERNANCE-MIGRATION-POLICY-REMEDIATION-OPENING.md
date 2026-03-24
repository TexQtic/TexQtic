# GOV-DEC-GOVERNANCE-MIGRATION-POLICY-REMEDIATION-OPENING

Decision ID: GOV-DEC-GOVERNANCE-MIGRATION-POLICY-REMEDIATION-OPENING
Title: Open one bounded concurrent governance unit for migration policy alignment remediation
Status: DECIDED
Date: 2026-03-24
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001` is `DECIDED`
- the canonical migration execution and remote validation doctrine is already fixed
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
  implementation-ready unit
- `GOVERNANCE-SENTINEL-V1-SPEC-001` is already `OPEN` as a concurrent governance-only unit with
  `DECISION_QUEUE` posture
- `NEXT-ACTION.md` already points only to `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- current Layer 0 sequencing and `ACTIVE_DELIVERY` authority remain lawful and unchanged

Current repo truth still preserves conflicting or stale migration-advertising surfaces:

- root `package.json` still advertises `db:migrate`
- `server/package.json` still advertises `db:migrate` -> `prisma migrate dev` and `db:push`
- `docs/ops/prisma-migrations.md` preserves newer direct-URL deploy guidance but remains a likely
  alignment surface for the newly decided doctrine
- `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` still preserves forward-looking
  `psql`-first / `prisma migrate resolve --applied` guidance as if it were current migration
  discipline

The migration execution doctrine is already decided, but the repo still advertises multiple entry
points and mixed instruction posture.

## Problem Statement

TexQtic now needs one bounded governance-only remediation unit that defines the later cleanup scope
for conflicting migration entry points and stale migration instructions without altering current
Layer 0 delivery authority and without performing any migration work.

If this remediation is not opened, the repo continues to advertise mixed migration posture despite
the newly decided canonical policy.
If this remediation is opened too broadly, it could be misread as authorizing package-script
changes, migration-doc rewrites, tooling rollout, database execution, or a change to current
delivery sequencing.

The smallest truthful opening is therefore one concurrent governance-only remediation unit that
preserves the already-decided doctrine as the sole authority source and preserves `NEXT-ACTION`
unchanged.

## Decision

TexQtic opens exactly one bounded concurrent governance-only remediation unit:

- `GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001`
- title: `Bounded remediation for migration policy alignment`

This unit is `OPEN` in Layer 0 as a non-terminal governance unit.

`NEXT-ACTION` does not change.
`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
implementation-ready unit.

## Delivery-Class Decision For This Open Governance Unit

`GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001` carries delivery class `DECISION_QUEUE`.

Reason:

- the unit is lawfully opened now for bounded governance remediation framing only
- any later package-script edits, migration-doc edits, or stale-guidance alignment remain
  separately governed implementation work inside this unit's later phases
- the open remediation unit therefore must not be mistaken for a second `ACTIVE_DELIVERY`
  implementation authorization

## Exact In-Scope Boundary

The opened unit is limited to the following governance-only remediation scope:

1. define the exact later remediation boundary for conflicting migration entry points
2. define the exact later remediation boundary for stale forward-looking migration instruction docs
3. identify the exact repo surfaces likely in scope for that later remediation work
4. preserve `GOV-DEC-GOVERNANCE-MIGRATION-EXECUTION-POLICY-001` as the authority source for
   canonical migration execution and remote validation policy
5. preserve current Layer 0 sequencing, `NEXT-ACTION`, and sole `ACTIVE_DELIVERY` authority
6. define the acceptance boundary for a later separate remediation implementation step only

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- editing `package.json` in this opening step
- editing `server/package.json` in this opening step
- editing `docs/ops/prisma-migrations.md` in this opening step
- editing stale governance docs in this opening step
- executing any migration
- changing database state
- modifying env files or secret-bearing surfaces
- changing Layer 0 authority, `NEXT-ACTION`, or current `ACTIVE_DELIVERY` posture
- Sentinel work
- product/application code changes
- certification implementation changes
- contract/OpenAPI changes
- CI or platform-tooling implementation
- opening any second migration-policy child or broader database-governance program

## Exact Likely Remediation Surfaces

The later remediation work is expected to review and, if separately implemented, may need to align
only these exact repo surfaces:

- `package.json`
- `server/package.json`
- `docs/ops/prisma-migrations.md`
- `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md`

These surfaces are identified as likely remediation scope only. This opening does not edit them.

## Implementation Authorization Statement

This decision authorizes exactly one bounded governance-only remediation unit only:

- `GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001`

It does **not** authorize package-script edits, migration-doc edits, tooling changes, migration
execution, DB-state changes, or any change to current Layer 0 sequencing in this opening step.

## Consequences

- Layer 0 now has three `OPEN` governed units and one `DESIGN_GATE` unit
- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY`
  implementation-ready unit
- `GOVERNANCE-SENTINEL-V1-SPEC-001` remains concurrently `OPEN` with `DECISION_QUEUE` delivery
  class
- `GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001` is concurrently `OPEN` with `DECISION_QUEUE`
  delivery class
- `NEXT-ACTION.md` remains pointed to the certification unit only
- the already-decided migration execution doctrine remains authoritative and is not reopened

## Sequencing Impact

- `OPEN-SET.md` must show `GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001` as `OPEN`
- `NEXT-ACTION.md` must remain unchanged and preserve the certification unit as the sole
  `ACTIVE_DELIVERY` action
- `SNAPSHOT.md` must reflect three open governed units while preserving the same current next
  action
- a new Layer 1 unit record must exist for `GOVERNANCE-MIGRATION-POLICY-REMEDIATION-001`

This decision opens exactly one bounded concurrent governance-only remediation unit and nothing
broader.