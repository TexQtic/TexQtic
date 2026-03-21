# GOV-DEC-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION

Decision ID: GOV-DEC-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION
Title: TexQtic may later consider one bounded automated verification policy-design opening candidate, but no verification/process unit is opened by this decision
Status: DECIDED
Date: 2026-03-21
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- no implementation-ready unit is currently `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no broader AdminRBAC opening is implied
- no verification/process implementation unit is opened by implication

TexQtic's current governance/process baseline also already records that:

- `GOV-POLICY-CLOSURE-SEQUENCING-HARDENING` is `DECIDED`
- `GOV-DESIGN-GOVERNANCE-HARDENING-WORKFLOW` is `DECIDED`
- `GOV-DESIGN-GOVERNANCE-LINTER-V3-TRIGGER-MONITORING` is `DECIDED`
- `GOV-POLICY-MANDATORY-POST-CLOSE-GOVERNANCE-AUDIT` is `DECIDED`
- `TECS-RUNTIME-VERIFICATION-HARDENING-001` is `CLOSED`

Those records already establish three important limits:

1. machine-checkable governance enforcement must remain separate from human-only sequencing,
   historical, and materiality judgment
2. process or linter expansion must be evidence-triggered rather than instinct-led
3. a previously closed bounded runtime-verification child does not authorize a broader verification
   program by implication

The decision question is therefore not whether TexQtic should now implement a verification program.
The decision question is whether TexQtic should formally recognize one later separate bounded
policy-design opening candidate for acceptance-boundary-specific automated verification posture, or
whether the portfolio should remain at decision-only posture with no opening-candidate recognition.

Verification posture for this decision: `GOVERNANCE_RECONCILIATION_CONFIRMATION`.

## Problem Statement

TexQtic has already accumulated repeated governed evidence that verification expectations differ by
unit type and acceptance boundary:

- governance-only work relies on governance reconciliation rather than Playwright
- runtime-route and deployment-parity work has required runtime verification
- contract-sensitive work has required route or contract verification
- DB-affecting work has required migration-sensitive verification against the authoritative remote
  environment

What remains under-specified is a bounded policy answer to one narrow process question:

Should verification expectations be declared at opening and carried as closure evidence
requirements by unit type, instead of being re-derived late at verification or closure time?

If TexQtic leaves that question entirely ambient, the repo risks repeated closure-time debate about
what evidence shape was actually required. If TexQtic overreacts, it risks drifting into a broad
QA, CI, Playwright, or workflow-transformation program that current governance does not authorize.

The smallest truthful step is therefore one decision-only policy disposition.

## Required Determinations

### 1. Is this proposal bounded enough to justify a later separate opening candidate?

Yes.

It is bounded enough only if the future child remains policy-design only and solves one exact
problem: declaring the verification profile and closure evidence requirement at Opening based on
the governed unit's acceptance boundary.

That later child would not implement tests, CI, scripts, Playwright, packages, or linter logic.
It would define the bounded policy vocabulary and matching boundary rules only.

### 2. Does this preserve the human-only governance boundary already installed?

Yes.

This disposition preserves the installed boundary because any future child recognized here would be
limited to policy design for declared verification profiles and closure evidence requirements. It
would not convert sequencing choice, materiality, historical classification, or broader governance
judgment into automation.

### 3. Does this preserve that linter or process expansion must be evidence-triggered rather than instinct-led?

Yes.

This disposition recognizes only a later policy-design opening candidate. It does not authorize any
linter refinement, verifier script, CI enforcement, Playwright expansion, or workflow rewrite.
Any such future implementation step would still require separate evidence and separate governance.

### 4. Does this avoid opening a broad QA or CI transformation by implication?

Yes.

The recognized future child is bounded to acceptance-boundary-specific verification policy only.
It does not authorize repo-wide test mandates, QA transformation, CI workflow changes, or broad
automation of manual checks.

### 5. Does this avoid reopening AdminRBAC or G-026 sequencing?

Yes.

This decision changes no product stream posture. `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`, no
closed AdminRBAC unit is reopened, and no G-026 routing or cleanup posture is changed.

### 6. What is the truthful next-move class now?

The truthful result class is: later `OPENING_CANDIDATE` only.

More specifically, TexQtic may later consider one separate bounded policy-design opening candidate
for automated verification policy codification. That candidate is recognized only as a future
governance option. It is not opened, approved for implementation, or made implementation-ready by
this decision.

## Decision

`GOV-DEC-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION` is now `DECIDED`.

The authoritative disposition is:

1. TexQtic may later consider one separate bounded automated verification policy-design opening candidate
2. the candidate exists only to define declared verification profiles and closure evidence requirements by unit type and acceptance boundary
3. no policy-design unit is opened by this decision itself
4. no implementation, CI, Playwright, script, or package change is authorized by this decision
5. `NEXT-ACTION` remains `OPERATOR_DECISION_REQUIRED`
6. `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

## Future Child Boundary

If TexQtic later chooses to create a separate bounded policy-design opening, that child must remain
limited to the following exact scope:

- define a declared verification profile at Opening rather than inventing verification expectations at closure time
- define closure evidence requirement classes tied to the governed unit's acceptance boundary
- define bounded category expectations such as:
  - governance-only units do not require Playwright
  - UI or workflow units require UI automation appropriate to the declared acceptance boundary
  - API or contract units require route or contract verification
  - runtime-route or deployment-parity units require runtime or parity verification
  - DB-affecting units require migration-sensitive and authoritative remote verification
- define a single explicit closure verdict posture: pass, fail, or not closable
- preserve manual checks as advisory unless separately automated and governable

That future child must remain explicitly excluded from all of the following:

- opening any implementation unit
- implementing Playwright
- creating or editing tests
- creating or editing CI workflows
- creating or editing scripts or verifier tooling
- editing package manifests or lockfiles
- modifying product code, contracts, schema, migrations, Prisma, or seeds
- refining governance-lint rules
- broad QA transformation
- repo-wide automation mandates
- reopening AdminRBAC or G-026 streams

No opening is created by this decision.

## Non-Authorization Statement

This decision does **not**:

- open any unit
- authorize any implementation or process unit
- create `GOV-VERIFY-01` or any similarly named unit
- authorize Playwright expansion
- authorize CI or workflow rewriting
- authorize verifier scripts or governance-lint expansion
- reopen any closed AdminRBAC or G-026 unit
- modify product code, tests, scripts, packages, schema, migrations, Prisma, RLS, or contracts

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This decision records policy disposition only.

If TexQtic later chooses to proceed, the next lawful move would still be one separate bounded
policy-design opening artifact only.

## Boundary Preservation

Any later opening, if separately created, must preserve all of the following:

- acceptance-boundary-specific verification wording only
- declared verification profile at Opening
- closure evidence requirements only
- no human-judgment collapse into automation
- no broad QA or CI transformation by implication
- no verifier tooling, linter expansion, or workflow rewrite by implication
- no reopening of closed AdminRBAC or G-026 units

## Consequences

- `governance/control/OPEN-SET.md` remains unchanged
- `governance/control/BLOCKED.md` remains unchanged
- `governance/control/NEXT-ACTION.md` remains `OPERATOR_DECISION_REQUIRED`
- `governance/control/SNAPSHOT.md` is refreshed for carry-forward posture
- `governance/log/EXECUTION-LOG.md` records this decision
- no implementation-ready unit is opened by this decision
- no product or verification code is changed by this decision

## Exact Operator Posture After This Decision

- result class: later bounded policy-design opening candidate recognized
- policy-design opening created now: no
- implementation authorized now: no
- broad verification program authorized now: no
- resulting `NEXT-ACTION`: `OPERATOR_DECISION_REQUIRED`

Any further movement still requires a separate later opening artifact for at most one bounded
policy-design child and nothing broader.