# GOV-DEC-G026-DISCREPANCY-DISPOSITION

Decision ID: GOV-DEC-G026-DISCREPANCY-DISPOSITION
Title: Preserved G-026 discrepancy notes require a bounded design-clarification decision before any future routing opening
Status: DECIDED
Date: 2026-03-20
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `TECS-G026-H-001` is `CLOSED`
- the broad G-026 v1 routing stream remains unopened
- `GOV-DEC-G026-POST-CLOSE-DISPOSITION` is already `DECIDED`
- `GOV-POLICY-MANDATORY-POST-CLOSE-GOVERNANCE-AUDIT` is already `DECIDED` and doctrine-enforced
- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`

The closed prerequisite unit preserved two discrepancy classes as unresolved observations only:

1. additional `SELECT` grants on:
   - `catalog_items`
   - `memberships`
   - `rfq_supplier_responses`
   - `users`
2. duplicate/equivalent `postgres` membership rows

Those observations were deliberately not treated as resolved work during implementation,
verification, governance sync, closure, or compensating audit.

The governing post-close disposition already states that a separate discrepancy-resolution decision
is required before any future routing opening may be considered. This decision supplies that
missing governance disposition only.

## Required Determinations

### 1. Are the preserved discrepancy notes tolerated residual historical state with no immediate follow-up?

No.

They cannot be silently tolerated as final settled posture because the current governance record
still carries an unresolved truth question: whether the observed `texqtic_service` grant and
membership footprint is actually consistent with the intended bounded resolver-only role posture.

### 2. Should TexQtic open a bounded cleanup unit now?

No.

Cleanup is premature until TexQtic first decides what the correct bounded target state is.
Opening cleanup before that clarification would risk converting an unresolved governance question
into an implementation assumption.

### 3. Is a bounded design-clarification unit required?

Yes.

The correct next governance handling is a bounded design-clarification step that decides:

- whether the extra `SELECT` grants are acceptable historical residue or inconsistent with the
  intended resolver-only boundary
- whether the duplicate/equivalent `postgres` membership rows are acceptable historical state or
  require normalization
- what the exact intended minimum authority of `texqtic_service` is for any future bounded routing
  sequencing
- whether any later cleanup is required after that clarification

### 4. Are these discrepancies blockers to any future routing opening?

Yes, but narrowly.

They are blocking only until the bounded design-clarification step is completed.

They are not treated here as active production defects, and they do not reopen `TECS-G026-H-001`.
They do, however, block any future routing opening because TexQtic must not open routing work while
the resolver-role target state itself remains governance-ambiguous.

## Decision

`GOV-DEC-G026-DISCREPANCY-DISPOSITION` is now `DECIDED`.

The authoritative discrepancy disposition is:

1. the preserved discrepancy notes are not treated as resolved
2. the preserved discrepancy notes are not accepted as fully tolerated final state
3. no cleanup unit is opened now
4. a bounded design-clarification unit is required before any future routing opening may be considered
5. any future cleanup question must be decided only after that clarification is completed

## Exact Disposition Chosen

Chosen disposition:

- require a design clarification unit

Exact blocker posture:

- blocking only until a specific bounded design-clarification step is completed

## Non-Authorization Statement

This decision does **not**:

- implement anything
- open any implementation unit
- open any routing unit
- open the broad G-026 stream
- authorize custom-domain, apex-domain, or DNS-verification scope
- treat the discrepancies as resolved
- decide the final cleanup implementation scope

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This decision is the discrepancy-disposition decision only. It does not also open the required
bounded design-clarification unit.

## Consequences

- broad G-026 remains held and unopened
- `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is opened by this decision
- the preserved discrepancy notes must remain documented as unresolved until the later bounded
  design-clarification step is separately authorized and completed
- any future routing opening must wait for that bounded clarification outcome

## Explicit Out-of-Scope

This decision does not:

- reopen `TECS-G026-H-001`
- create the bounded design-clarification unit
- create a cleanup unit
- authorize routing implementation
- modify product code, tests, schema, migrations, routes, or contracts

## Exact Operator Posture After This Decision

- discrepancy disposition chosen: bounded design clarification required first
- cleanup/design unit required: yes
- broad G-026 remains held: yes
- resulting `NEXT-ACTION`: `OPERATOR_DECISION_REQUIRED`

Any future movement on G-026 must begin with a separate governance step that opens at most one
bounded design-clarification unit for the discrepancy posture only.