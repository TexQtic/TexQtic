# GOV-DEC-G026-H-PREREQUISITE-OPENING

Decision ID: GOV-DEC-G026-H-PREREQUISITE-OPENING
Title: Open only the G-026-H prerequisite unit; do not open the bounded G-026 v1 routing stream
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- Layer 0 is the operational truth
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- RFQ remains capped at pre-negotiation
- white-label / custom-domain routing remains the favored first Wave 4 candidate
- the bounded G-026 v1 slice must remain limited to platform-subdomain routing only
- broader custom-domain, apex-domain, and DNS-verification scope remains deferred

The governing design anchor still records one stream-specific blocker for the bounded G-026 v1
path:

- `G-026-H` — the `texqtic_service` database role with narrowly scoped `BYPASSRLS` access is not
  yet created and blocks TECS 6C1 deploy

Later historical reconciliation records attempted to treat `G-026-H` as already satisfied from
non-Layer-1 evidence. That posture did not create a canonical open prerequisite unit and did not
authorize a new implementation opening in Layer 0. For current sequencing, the authoritative state
remains the unresolved blocker posture stated in the current prompt and the design anchor.

## Required Determinations

### 1. Should the broad G-026 v1 white-label / platform-subdomain routing stream open now?

No.

The bounded G-026 v1 stream is still larger than the minimum unresolved prerequisite. Opening that
stream now would mix the prerequisite with resolver endpoint, Edge middleware, cache/invalidation,
and WL domains operator-surface work.

### 2. What is the minimum truthful next development step?

The minimum truthful next development step is one bounded prerequisite implementation unit for
`G-026-H` only.

That unit is limited to the repo-governed database prerequisite described by the design anchor:

- create or reconcile the dedicated `texqtic_service` resolver role
- preserve `NOLOGIN`
- preserve narrowly scoped `BYPASSRLS` posture for the resolver path only
- limit the role authority to the minimum platform-subdomain v1 lookup surface

### 3. Does opening that prerequisite unit authorize broader G-026 implementation?

No.

This opening does not authorize TECS 6C1, TECS 6C2, TECS 6C3, TECS 6D, or the full bounded G-026
v1 stream. It authorizes only the prerequisite unit described below.

## Decision

TexQtic opens exactly one bounded implementation-ready unit:

- `TECS-G026-H-001` — `Database Prerequisite — texqtic_service resolver role for bounded G-026 v1`

This is the sole authorized next implementation unit.

The unit exists only to resolve `G-026-H`.

It does **not** open the broader bounded G-026 v1 routing stream.

## Exact Authorized Boundary

The opened unit is limited to the following prerequisite only:

- repo-governed SQL migration work required to create or reconcile the `texqtic_service` role for
  the bounded platform-subdomain resolver path
- minimum scoped resolver-read posture only
- no broader domain lifecycle behavior

## Exact Forbidden Expansion

This decision does **not** authorize:

- opening the broad G-026 v1 platform-subdomain routing stream
- opening TECS 6C1, TECS 6C2, TECS 6C3, or TECS 6D as a stream
- resolver endpoint implementation
- Edge middleware work
- cache or invalidation work
- WL domains panel work
- custom apex domains
- tenant-owned custom subdomains
- DNS verification or TXT challenge flow
- RFQ reopening
- AdminRBAC opening
- DPP, AI, settlement, or money-movement work

## Operational Supersession Rule

For current sequencing and opening only, this decision governs over any earlier historical-only
or reconciliation-style posture that treated `G-026-H` as already satisfied without a canonical
Layer 1 prerequisite unit and Layer 0 opening.

This operational supersession is narrow:

- it applies only to whether TexQtic may open a new bounded next development step now
- it does not reopen any closed historical unit
- it does not convert the broad G-026 stream into `OPEN`

## Consequences

- one bounded prerequisite unit is now `OPEN`
- `NEXT-ACTION` no longer remains `OPERATOR_DECISION_REQUIRED`
- the sole authorized next action becomes `TECS-G026-H-001`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- RFQ remains capped at pre-negotiation
- broader G-026 scope remains unopened and deferred beyond the bounded prerequisite

## Explicit Out-of-Scope

This decision does not:

- authorize implementation beyond `TECS-G026-H-001`
- authorize the full G-026 v1 routing stream
- alter the Wave 4 boundary
- alter role semantics outside the bounded resolver prerequisite
- treat Layer 3 or archive artifacts as operational truth
