# GOV-DEC-G026-FIRST-ROUTING-OPENING

Decision ID: GOV-DEC-G026-FIRST-ROUTING-OPENING
Title: Open one bounded G-026 platform-subdomain runtime routing unit and no broader domain scope
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY` is already `DECIDED`
- the result of that decision is bounded routing-opening eligible
- `TECS-G026-H-001` is `CLOSED`
- `TECS-G026-DESIGN-CLARIFICATION-001` is `CLOSED`
- `TECS-G026-CLEANUP-REMEDIATION-001` is `CLOSED`
- the broad G-026 v1 routing stream remains unopened
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`

The eligibility decision already established that the smallest truthful first routing slice is:

- bounded platform-subdomain runtime routing only for `<slug>.texqtic.app`
- limited to the runtime routing chain needed to resolve host -> tenant context for that bounded
  platform-subdomain path
- including only:
  - internal signed resolver path
  - host-to-tenant resolution for platform subdomains
  - request-path tenant-context propagation and validation required by that bounded runtime path
  - bounded cache/invalidation behavior required by that same runtime path
  - safe fallback behavior for unresolved platform-subdomain requests

The same eligibility decision also preserved the non-negotiable exclusions:

- no custom-domain routing
- no apex-domain routing
- no DNS-verification workflow
- no broader white-label domain lifecycle
- no broad G-026 opening

The required next truthful move is therefore no longer another decision about eligibility. It is one
bounded opening only.

## Problem Statement

TexQtic now needs one implementation-ready governed unit for the first bounded G-026 routing slice,
without broadening G-026 and without authorizing any excluded domain scope.

Without this opening, governance would know the bounded slice is eligible but would still have no
canonical unit authorized to carry that slice through the normal implementation sequence.

## Decision

TexQtic opens exactly one bounded routing unit:

- `TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001`
- title: `Bounded platform-subdomain runtime routing for <slug>.texqtic.app`

This is the sole authorized next governed G-026 implementation unit.

The broad G-026 routing stream remains unopened.

No custom-domain, apex-domain, DNS-verification, or broader white-label domain lifecycle unit is
opened by this decision.

## Exact In-Scope Boundary

The opened unit is limited to bounded platform-subdomain runtime routing only for:

- `<slug>.texqtic.app`

The unit may include only:

- the internal signed resolver path required by the bounded platform-subdomain runtime path
- host-to-tenant resolution for platform subdomains only
- request-path tenant-context propagation and validation required by that bounded runtime path only
- bounded cache/invalidation behavior required for that same runtime path only
- safe fallback behavior for unresolved platform-subdomain requests only

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- broad G-026 opening
- any routing slice broader than bounded platform-subdomain runtime routing
- custom-domain routing
- apex-domain routing
- DNS-verification workflow
- broader white-label domain lifecycle work
- reopening `TECS-G026-H-001`, `TECS-G026-DESIGN-CLARIFICATION-001`, or `TECS-G026-CLEANUP-REMEDIATION-001`
- product code outside the bounded routing slice

## Implementation Authorization Statement

This decision authorizes exactly one bounded routing unit only:

- `TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001`

It does **not** authorize broad G-026 or any excluded domain scope.

## Consequences

- Layer 0 now has exactly one implementation-ready bounded G-026 routing unit as the authorized next action
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001`
- broad G-026 remains held and unopened
- any custom-domain, apex-domain, or DNS-verification movement still requires a separate later decision/opening

## Sequencing Impact

- `OPEN-SET.md` must show the new bounded routing unit as `OPEN`
- `NEXT-ACTION.md` must point to `TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001`
- `SNAPSHOT.md` must reflect that the bounded platform-subdomain routing slice is now the active governed unit
- a new Layer 1 unit record must exist for `TECS-G026-V1-PLATFORM-SUBDOMAIN-ROUTING-001`

This decision opens exactly one bounded routing step and nothing broader.