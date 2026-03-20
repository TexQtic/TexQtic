# GOV-DEC-G026-POST-CLOSE-DISPOSITION

Decision ID: GOV-DEC-G026-POST-CLOSE-DISPOSITION
Title: Closed G-026-H prerequisite proof does not authorize routing continuation and requires a separate discrepancy-resolution decision first
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `TECS-G026-H-001` is `CLOSED`
- the canonical commit chain is complete:
  - implementation: `deef077`
  - governance sync: `e154f58`
  - closure: `998c583`
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- the broad G-026 v1 routing stream remains unopened
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- RFQ remains capped at pre-negotiation

The prior G-026 decision chain already establishes that:

- white-label / domain-routing remains the favored Wave 4 candidate only when narrowly bounded
- broader custom-domain, apex-domain, and DNS-verification scope remains excluded
- `TECS-G026-H-001` was a prerequisite-only unit and did not authorize a routing opening by implication

The closed unit also preserved two historical observations as unresolved discrepancy notes only:

- additional `SELECT`-only grants exist on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users`
- the `postgres` membership query returned duplicate/equivalent rows

Those notes matter because the design anchor for the bounded resolver posture states that `texqtic_service`
is used only for the resolver endpoint and should have minimum scoped authority for the resolver path.
The post-close question is therefore not whether `TECS-G026-H-001` succeeded. It did. The question is
whether that closed prerequisite proof is enough to authorize a next routing opening now.

## Required Determinations

### 1. Does closure of `TECS-G026-H-001` authorize any bounded G-026 routing slice now?

No.

The closed unit proved only the bounded database prerequisite invariants that it was opened to prove.
It did not decide whether the preserved discrepancy notes should be cleaned up, formally accepted as
historical posture, or treated as evidence that the current resolver-role boundary must be redefined
before any routing opening is governance-safe.

### 2. Should the broad G-026 v1 routing stream remain unopened?

Yes.

The broad G-026 stream must remain unopened. Opening it now would collapse prerequisite proof,
historical discrepancy handling, and actual routing-slice authorization into one move. That would be
broader than the closed unit and would bypass the required decision stage for the next slice.

### 3. Is a separate cleanup or design decision required before any future routing opening?

Yes.

A separate decision is required first because TexQtic still needs an explicit governance answer to the
post-close discrepancy posture:

- whether the extra `SELECT` grants are acceptable bounded historical residue or require cleanup
- whether the duplicate/equivalent `postgres` membership rows require correction or explicit acceptance
- whether the actual repo-level `texqtic_service` posture still matches the design-anchored claim that
  the role is resolver-only with minimum scoped authority
- whether any future bounded routing opening can be truthfully defined without first reconciling those
  preserved observations

This is a decision problem first, not an implementation opening problem.

### 4. Does this decision authorize custom-domain, apex-domain, or DNS-verification scope?

No.

Those broader scopes remain excluded exactly as before.

## Decision

`GOV-DEC-G026-POST-CLOSE-DISPOSITION` is now `DECIDED`.

The authoritative post-close G-026 posture is:

1. `TECS-G026-H-001` remains `CLOSED`
2. the broad G-026 v1 routing stream remains unopened
3. no bounded G-026 routing slice is selected, opened, or approved by this decision
4. the preserved discrepancy notes remain unresolved observations only and are not treated as implicitly accepted or resolved work
5. a separate cleanup-or-design decision is required before any future routing opening may be considered

## Non-Authorization Statement

This decision does **not**:

- open any implementation unit
- authorize any implementation unit
- authorize a bounded routing slice
- authorize custom-domain scope
- authorize apex-domain scope
- authorize DNS-verification scope
- treat the preserved discrepancy notes as resolved
- widen Wave 4 scope
- bypass the Governance OS sequence

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

Closure of the prerequisite-only unit does not skip the next required decision stage for discrepancy
disposition and does not convert a closed prerequisite proof into routing authorization.

## Boundary Preservation

Any future G-026 proposal, if one is ever separately raised, must preserve all of the following:

- platform-subdomain boundedness unless a later explicit decision changes it
- no custom-domain, apex-domain, or DNS-verification expansion by implication
- no reopening of RFQ
- no AdminRBAC opening by coupling
- no reinterpretation of the preserved discrepancy notes as already resolved

This decision authorizes none of those future proposals. It preserves the constraints only.

## Consequences

- `governance/control/OPEN-SET.md` remains unchanged
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`
- `governance/control/BLOCKED.md` remains unchanged
- `governance/control/SNAPSHOT.md` remains unchanged
- `governance/units/TECS-G026-H-001.md` remains unchanged
- no product code, tests, migrations, schema files, or contracts are changed
- no implementation, verification, or opening work is authorized

## Exact Operator Posture After This Decision

The G-026 stream is now in a stable post-close hold posture.

- result class: `HOLD`
- broad G-026 opened now: no
- bounded next-slice authorized now: no
- prerequisite cleanup/design decision required first: yes
- resulting `NEXT-ACTION`: `OPERATOR_DECISION_REQUIRED`

Any further G-026 movement requires a separate later decision that explicitly resolves the preserved
post-close discrepancy posture before any routing slice can be opened.