# GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY

Decision ID: GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY
Title: The closed G-026 prerequisite and remediation chain is sufficient to make one separate bounded routing opening eligible, but does not itself open routing work
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `TECS-G026-H-001` is `CLOSED`
- `TECS-G026-DESIGN-CLARIFICATION-001` is `CLOSED`
- `TECS-G026-CLEANUP-REMEDIATION-001` is `CLOSED`
- the broad G-026 v1 routing stream remains unopened
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- the latest mandatory post-close audit result is `HOLD`

The completed governed chain now also establishes that:

- `texqtic_service` has been returned to the canonical resolver-only posture
- non-routing `texqtic_service` dependencies were re-homed to bounded dedicated roles
- the cleanup/remediation step is fully closed and no longer leaves the prior non-routing role-use question unresolved
- closure of the cleanup chain did not itself authorize routing by implication

The design anchor in `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md` still preserves the
bounded v1 routing target as platform-subdomain host routing only, with custom-domain,
apex-domain, and DNS-verification scope explicitly deferred.

The decision question is therefore no longer whether prerequisite cleanup is still missing. The
decision question is whether the now-closed prerequisite + clarification + remediation chain is
sufficient to allow a separate bounded routing-opening step to be considered.

## Required Determinations

### 1. Does the closed prerequisite and remediation chain now satisfy the previously recorded blocker posture?

Yes.

The blocker posture recorded by the clarification and remediation chain was specific: before any
future routing opening, `texqtic_service` had to return to a narrow resolver-only posture and the
non-routing reads on `memberships`, `users`, `catalog_items`, and `rfq_supplier_responses` had to
be removed or re-homed. That governed chain is now complete and closed.

### 2. Does this decision itself open routing work?

No.

TexQtic still preserves the canonical sequence:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This decision determines only whether a separate bounded routing opening is now governance-eligible.
It does not create that opening.

### 3. Is broad G-026 now open?

No.

The broad G-026 stream remains unopened. Eligibility for one later bounded routing opening does not
constitute broad opening.

### 4. Is a separate bounded routing-opening decision/opening now eligible?

Yes.

TexQtic may now consider one separate bounded routing-opening decision/opening as the next G-026
governance-valid move, because the previously blocking prerequisite and cleanup conditions are now
truthfully closed.

### 5. What is the smallest truthful routing slice if a later opening is chosen?

The smallest truthful routing slice is:

- bounded platform-subdomain host routing only for `<slug>.texqtic.app`
- limited to the runtime routing chain needed to resolve host -> tenant context for that bounded
  platform-subdomain path
- including only the resolver primitives and routing-runtime behavior required for that path:
  - internal signed resolver path
  - host-to-tenant resolution for platform subdomains
  - request-path tenant-context propagation/validation required by the bounded runtime path
  - bounded cache/invalidation behavior required for that same platform-subdomain runtime path
  - safe fallback behavior for unresolved platform-subdomain requests

This smallest truthful slice does **not** include:

- custom-domain routing
- apex-domain routing
- DNS-verification workflow
- broader white-label domain lifecycle scope
- any unrelated operator-surface, AdminRBAC, RFQ, DPP, AI, settlement, or money-movement work

### 6. What remains explicitly deferred or excluded even if later opening eligibility exists?

The following remain explicitly deferred or excluded unless separately authorized later:

- custom-domain scope
- apex-domain scope
- DNS-verification scope
- any broad G-026 stream opening
- any routing slice broader than bounded platform-subdomain runtime routing

## Decision

`GOV-DEC-G026-FIRST-ROUTING-OPENING-ELIGIBILITY` is now `DECIDED`.

The authoritative disposition is:

1. the closed G-026 prerequisite + clarification + remediation chain is sufficient to make one
   separate bounded routing opening governance-eligible
2. the broad G-026 stream remains unopened
3. no routing work is opened by this decision itself
4. any actual routing movement still requires a separate explicit opening artifact
5. any later opening must be limited to the smallest truthful bounded platform-subdomain runtime
   routing slice only
6. custom-domain, apex-domain, and DNS-verification scope remain excluded unless separately
   authorized later

## Non-Authorization Statement

This decision does **not**:

- open any implementation unit
- authorize immediate routing implementation
- open the broad G-026 stream
- authorize custom-domain scope
- authorize apex-domain scope
- authorize DNS-verification scope
- modify product code, tests, schema, migrations, routes, or contracts

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This decision completes the eligibility judgment only.

If TexQtic chooses to move forward, a separate bounded routing-opening decision/opening is still
required.

## Boundary Preservation

Any later opening, if separately created, must preserve all of the following:

- platform-subdomain boundedness only
- no broad G-026 opening by implication
- no custom-domain, apex-domain, or DNS-verification expansion by implication
- no reopening of the already-closed prerequisite, clarification, or remediation units
- no coupling to RFQ, AdminRBAC, DPP, AI, settlement, or money-movement scope

## Consequences

- `governance/control/OPEN-SET.md` remains unchanged
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`
- `governance/control/BLOCKED.md` remains unchanged
- `governance/control/SNAPSHOT.md` remains unchanged
- all three closed G-026 chain unit records remain unchanged
- no implementation-ready unit is opened by this decision
- the next possible G-026 move, if separately chosen later, is a bounded routing-opening artifact only

## Exact Operator Posture After This Decision

- result class: bounded routing-opening eligible
- broad G-026 opened now: no
- bounded routing-opening artifact now created: no
- separate opening still required: yes
- resulting `NEXT-ACTION`: `OPERATOR_DECISION_REQUIRED`

Any further G-026 movement still requires a separate later opening artifact that selects at most one
bounded platform-subdomain runtime routing slice and nothing broader.