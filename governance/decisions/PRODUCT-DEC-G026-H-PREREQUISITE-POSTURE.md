# PRODUCT-DEC-G026-H-PREREQUISITE-POSTURE

Decision ID: PRODUCT-DEC-G026-H-PREREQUISITE-POSTURE
Title: G-026-H is satisfied for the bounded v1 resolver path and no longer blocks later bounded G-026 sequencing
Status: DECIDED
Date: 2026-03-19
Authorized by: Paresh

## Context

TexQtic's current post-RFQ governance state already records:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`
- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED`
- `PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING`

Those decisions establish that:

- RFQ remains capped at pre-negotiation
- Wave 4 is ratified as a bounded strategic domain
- white-label / custom-domain routing remains the first Wave 4 candidate
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

The remaining question is the governance-safe disposition of `G-026-H`, which was cited in
`PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING` as the reason the bounded v1 routing stream was not
yet openable.

Repository evidence now shows two layers of truth that must be reconciled conservatively:

1. The G-026 design anchor still describes `G-026-H` as an open gate before TECS 6C1 deploy.
2. Later non-secret repository evidence shows that the same prerequisite was subsequently
   implemented and validated in code, migration history, and historical operational records.

This decision records the correct governance interpretation of that evidence without opening any
implementation work.

## Blocker Definition

`G-026-H` is the bounded resolver-role prerequisite defined in the custom-domain routing design
anchor.

Exact repo-grounded definition:

- a dedicated `texqtic_service` database role
- `NOLOGIN`
- `BYPASSRLS`
- reachable only through transaction-local role assumption by the database superuser path
- minimum scoped read authority for the resolver path only
- created through a repo-governed SQL migration
- used only to support the pre-auth host-to-tenant resolver query required before `org_id`
  context exists

The design anchor records this as a TECS 6C1 deploy gate because the normal tenant-scoped RLS
path cannot resolve a tenant before tenant context exists.

## Considered Options

### Option A — Keep G-026-H unresolved and still blocking

Rejected.

Reason:
- the repo now contains the specific migration, route implementation, middleware chain, and
  historical validation records that satisfy the documented prerequisite
- treating the prerequisite as still unresolved would ignore later repo evidence and preserve a
  now-stale blocker assumption

### Option B — Treat G-026-H as fully satisfied for all domain-routing scope

Rejected.

Reason:
- `G-026-H` is only the resolver-role prerequisite for the bounded pre-auth resolver path
- broader custom-domain and apex-domain scope remains separately constrained by `G-026-A` and the
  v1.1 deferrals recorded in the design anchor
- satisfying `G-026-H` does not authorize the full G-026 program or any open implementation unit

### Option C — Narrow G-026-H to the bounded v1 resolver slice and mark that bounded prerequisite satisfied

Selected.

Reason:
- this matches the actual design boundary: platform-subdomain v1 uses the resolver path and does
  not require the broader DNS-verification scope
- the repo contains evidence that this exact bounded prerequisite was implemented
- this preserves conservative scope control while removing a blocker that the repo no longer
  supports as unresolved

### Option D — Defer G-026-H while preserving a smaller allowed slice

Rejected.

Reason:
- the smaller bounded slice is already the slice to which `G-026-H` belongs
- deferral would be incorrect because the repo evidence shows the bounded prerequisite itself is
  already satisfied

## Decision

`G-026-H` is satisfied for the bounded v1 resolver path and must no longer be treated as the
blocking prerequisite for later bounded G-026 sequencing.

This decision is narrow.

It means only that:

1. the resolver-role prerequisite described by `G-026-H` is no longer unresolved in repo evidence
2. `G-026-H` does not block later consideration of the bounded v1 platform-subdomain routing slice
3. the broader custom-domain and apex-domain scope remains separately constrained by `G-026-A` and
   the design anchor's v1.1 deferrals

This decision does **not** mean that G-026 is opened, implemented, or automatically authorized.

## Consequences

- `G-026-H` is no longer the blocker reason for the bounded v1 resolver path
- the bounded v1 platform-subdomain routing slice can be reasoned about separately from the
  deferred broader custom-domain scope
- `G-026-A` remains deferred and continues to bound the custom-domain / apex-domain expansion path
- no implementation-ready unit is opened by this decision
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- a later governance decision is still required before any G-026 implementation-opening or
  governance-reconciliation step is authorized

## Explicit In-Scope Statement

This decision is in scope only for:

- defining what `G-026-H` actually is from repo evidence
- determining whether `G-026-H` remains unresolved or is satisfied
- distinguishing bounded v1 platform-subdomain routing from broader deferred custom-domain scope
- preserving current Wave 4, RFQ, money, AI, and AdminRBAC constraints while resolving this one
  prerequisite posture question

## Explicit Out-of-Scope Statement

This decision does not authorize:

- opening G-026
- opening TECS 6C1, 6C2, 6C3, or 6D
- creating an implementation unit
- reopening RFQ
- negotiation, pricing, acceptance, rejection, counter-offers, messaging, or trade conversion
- settlement or platform money movement
- autonomous or irreversible AI actions
- forcing `TECS-FBW-ADMINRBAC` open
- any source-code, schema, migration, RLS-policy, or test change

## Effect On Future G-026 Sequencing

Future G-026 sequencing must now treat the scope as follows:

1. bounded v1 resolver-path posture: `G-026-H` satisfied
2. broader custom-domain / apex-domain posture: still bounded by deferred `G-026-A`
3. implementation opening: still requires a separate later governance decision

Accordingly, a future sequencing decision may evaluate the bounded v1 slice without citing
`G-026-H` as unresolved, but it must still decide separately whether any residual G-026 work is
appropriate to open and how that work fits the current governed portfolio.

## Later Implementation-Opening Decision Requirement

Yes.

A later implementation-opening decision is still required after this one.

Reasons:

- `PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING` did not authorize implementation
- Layer 0 still has zero `OPEN` implementation-ready units
- this decision resolves only prerequisite posture, not sequencing authorization
- any future G-026 opening must still preserve Wave 4 boundary discipline and the separation
  between bounded v1 routing and deferred v1.1 custom-domain scope

## Relationship To Prior Post-RFQ And Wave 4 Decisions

This decision follows and preserves:

- `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP`
- `PRODUCT-DEC-POST-RFQ-WL-DOMAINS-PRIORITY`
- `PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED`

This decision also clarifies the blocker premise used by:

- `PRODUCT-DEC-WAVE4-FIRST-STREAM-SEQUENCING`

Clarification scope only:

- the earlier decision remains correct that G-026 was not opened
- the earlier decision remains correct that a separate later authorization step is required
- the earlier decision's specific statement that `G-026-H` remains unresolved is superseded by
  the later repo evidence reconciled here

No other post-RFQ or Wave 4 boundary constraints are changed.