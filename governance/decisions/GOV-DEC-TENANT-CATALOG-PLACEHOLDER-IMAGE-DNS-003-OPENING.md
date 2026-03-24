# GOV-DEC-TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003-OPENING

Decision ID: GOV-DEC-TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003-OPENING
Title: Decide and open one bounded ACTIVE_DELIVERY unit for the exact B2C New Arrivals placeholder-image fallback surface
Status: DECIDED
Date: 2026-03-24
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no `ACTIVE_DELIVERY` unit is currently `OPEN`
- current candidate-state normalization is sufficient to distinguish consumed historical openings
  from still-live candidates
- the exact surviving openable product-facing candidate is the B2C `New Arrivals`
  placeholder-image fallback surface
- that exact remaining surface is the B2C `New Arrivals` fallback in `App.tsx` using
  `https://via.placeholder.com/400x500` when `imageUrl` is absent

The canonical normalized repo truth further establishes that:

- this candidate is the only normalized survivor still openable
- this candidate is product-facing, exact, narrow, and not design-gated
- this candidate is not already consumed by a prior opening
- the already closed `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` and
  `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` units remain separate bounded historical units only

## Problem Statement

Layer 0 currently has no compelled successor `ACTIVE_DELIVERY` unit.

Without one separate decision and opening step now, TexQtic would either remain stalled at
`OPERATOR_DECISION_REQUIRED` despite one clean normalized survivor being available, or risk
reusing consumed historical placeholder-image openings in a way current governance truth forbids.

The smallest truthful next move is therefore one separate bounded decision and opening for the
exact surviving B2C storefront fallback surface only.

## Required Determinations

### 1. Is there one exact surviving product-facing candidate now clean enough to open?

Yes.

Normalized repo truth isolates one exact surviving candidate: the B2C `New Arrivals`
placeholder-image fallback surface in `App.tsx` still using
`https://via.placeholder.com/400x500` when `imageUrl` is absent.

### 2. Is this the sole next lawful `ACTIVE_DELIVERY` unit?

Yes.

Current Layer 0 had no compelled successor `ACTIVE_DELIVERY`, and current normalized repo truth
isolates this exact surface as the sole clean product-facing survivor still lawfully openable now.

### 3. Does opening this unit authorize Governance OS development or broader governance expansion?

No.

This opening is delivery-first only. It does not authorize new Governance OS development,
Sentinel/governance-system development, or broader governance refinement for its own sake.

### 4. Does this reopen historical placeholder-image units by implication?

No.

This opening does not reopen `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-001` or
`TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002`. Those remain consumed historical units with their own
bounded surfaces and closure histories.

### 5. What exact scope is now authorized?

Exactly one bounded `ACTIVE_DELIVERY` unit:

- unit id: `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003`
- title: `B2C New Arrivals placeholder-image fallback remediation`
- type: `ACTIVE_DELIVERY`
- status: `OPEN`
- delivery class: `ACTIVE_DELIVERY`

## Decision

`GOV-DEC-TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003-OPENING` is now `DECIDED`.

The authoritative decision is:

1. TexQtic authorizes one separate bounded `ACTIVE_DELIVERY` unit to remediate the exact B2C
   `New Arrivals` placeholder-image fallback surface still using
   `https://via.placeholder.com/400x500` when `imageUrl` is absent
2. this is now the sole authorized next `ACTIVE_DELIVERY` unit
3. this decision is delivery-first and does not authorize new Governance OS development
4. this unit is bounded to the exact surviving storefront image-fallback surface only
5. this decision does not reopen consumed historical tenant-catalog placeholder-image units by
   implication
6. this decision does not authorize broader catalog/media/image refactors
7. this decision does not authorize unrelated DNS, upload, runtime, AdminRBAC, control-plane,
   certification, migration, Prisma, schema, DB, or Sentinel/governance-system work
8. this unit must remain as narrow as possible
9. all future implementation must use exact repo-relative allowlists only

## Opening

The following unit is now opened:

- `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003`
- Title: `B2C New Arrivals placeholder-image fallback remediation`
- Type: `ACTIVE_DELIVERY`
- Status: `OPEN`
- Delivery Class: `ACTIVE_DELIVERY`

Reason:

- this is the sole clean product-facing survivor from current normalized repo truth
- it is user-visible storefront behavior
- it is exact, bounded, and implementation-worthy
- it does not require prior governance-system expansion

## Exact Future Implementation Boundary

This opening authorizes only the following bounded work:

1. inspect the exact B2C `New Arrivals` fallback surface in `App.tsx`
2. determine why the surface falls back to `https://via.placeholder.com/400x500` when `imageUrl`
   is absent
3. implement the minimum lawful fix for that exact fallback behavior
4. validate only the bounded storefront behavior necessary to prove the surface no longer depends
   on the placeholder fallback incorrectly
5. preserve exact scope to this one surviving surface only

## Exact Out-of-Scope Boundary

This opening explicitly forbids:

- broad catalog/image/media refactors
- tenant image-upload pipeline changes
- unrelated placeholder surfaces elsewhere in the app
- general DNS remediation beyond this exact fallback surface
- AdminRBAC work
- control-plane auth/identity/impersonation work
- certification work
- migration/Prisma/schema/DB changes unless exact repo truth during implementation proves they are
  strictly necessary, in which case implementation must halt and report blocker rather than widen
  scope
- Sentinel/governance-system development
- any new child opening by implication

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This record completes the decision and opening only.

## Consequences

- `governance/control/OPEN-SET.md` now shows `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003` as
  `OPEN` / `ACTIVE_DELIVERY`
- `governance/control/NEXT-ACTION.md` now points to `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-003`
  as the sole next implementation unit
- `governance/control/SNAPSHOT.md` now reflects this unit as the sole `ACTIVE_DELIVERY`
- `governance/log/EXECUTION-LOG.md` records this decision/opening
- no implementation, verification, governance sync, or close occurred in this step
- no broader media/catalog/image governance or implementation work is authorized here

## Exact Operator Posture After This Decision

- current Layer 0 had no compelled successor `ACTIVE_DELIVERY`
- normalized repo truth isolates one exact surviving product-facing candidate
- that candidate is the B2C `New Arrivals` placeholder-image fallback surface
- this unit is opened as the sole next `ACTIVE_DELIVERY`
- no historical placeholder-image unit is reopened
- no broader media/catalog/image governance or implementation work is authorized here