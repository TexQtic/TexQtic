# GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING

Decision ID: GOV-DEC-AUTOMATED-VERIFICATION-POLICY-OPENING
Title: Open GOV-VERIFY-01 as one bounded automated verification policy-design child and no implementation beyond that governance unit
Status: DECIDED
Date: 2026-03-21
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `GOV-DEC-MANDATORY-AUTOMATED-VERIFICATION-POLICY-DISPOSITION` is recorded
- `GOV-DEC-AUTOMATED-VERIFICATION-POLICY-CHILD-OPENING-DISPOSITION` is recorded
- the bounded automated-verification policy-design child is `READY_FOR_OPENING` only
- `READY_FOR_OPENING` is not `OPEN`
- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no implementation-ready unit is currently `OPEN`
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no broader AdminRBAC posture is implied
- no broader G-026 posture is implied

The recorded bounded child posture already fixes the exact opening boundary:

- declared verification profiles at Opening
- closure evidence requirements by unit type and acceptance boundary
- bounded category expectations only
- explicit closure-verdict posture only
- manual-check advisory posture unless separately automated later

The same recorded posture also fixes the exact exclusions:

- no Playwright implementation
- no test implementation
- no verifier tooling
- no CI workflow implementation
- no governance-lint refinement
- no package or lockfile changes
- no product, API, UI, schema, migration, Prisma, seed, contract, or RLS changes
- no AdminRBAC reopening
- no G-026 reopening
- no broad QA or CI transformation
- no repo-wide enforcement rollout

The opening question is therefore no longer whether the bounded child is mature enough to open.
That readiness was already decided. The question is whether TexQtic should now open exactly one
bounded governance/policy-design child and nothing broader.

Verification posture for this opening decision: `GOVERNANCE_RECONCILIATION_CONFIRMATION`.

## Problem Statement

TexQtic now has one bounded policy-design child that is specific enough to be opened without first
requiring more clarification work.

If TexQtic does not open it now, the child remains ready but inactive.
If TexQtic opens it too broadly, the opening could be misread as a verifier-tool, Playwright, CI,
or broad process-program authorization.

The smallest truthful opening is therefore one governance-only, policy-design-only child that
defines the policy boundary and nothing more.

## Decision

TexQtic opens exactly one bounded governance/policy-design unit:

- `GOV-VERIFY-01`
- title: `Mandatory automated verification policy-design child`

This is the sole authorized next governed unit.

No product implementation unit is opened by this decision.
No verifier-tool, Playwright, CI, or broad process rollout is opened by this decision.

## Exact In-Scope Boundary

The opened unit is limited to the following policy-design scope only:

1. define declared verification profiles that must be fixed at Opening time for future implementation units
2. define closure evidence requirements by unit type and acceptance boundary
3. define bounded category expectations such as:
   - governance-only units do not require Playwright
   - UI or workflow units require automation appropriate to the declared acceptance boundary
   - API or contract units require route or contract verification
   - runtime-route or deployment-parity units require runtime or parity verification
   - DB-affecting units require migration-sensitive and authoritative remote verification
4. define one explicit closure-verdict posture such as `VERIFIED_PASS`, `VERIFIED_FAIL`, `BLOCKED_ENV`, `BLOCKED_DATA`, `NOT_CLOSABLE`, or doctrine-compatible bounded equivalents only if the unit's policy design determines they are needed
5. preserve manual checks as advisory unless separately automated later
6. preserve the machine-checkable versus human-only boundary
7. preserve evidence-triggered process hardening rather than instinct-led expansion

## Exact Out-of-Scope Boundary

This decision does **not** authorize:

- Playwright implementation
- test creation or editing
- verifier tooling creation
- CI workflow creation or editing
- governance-lint refinement
- package or lockfile changes
- product code changes
- API or UI changes
- schema, migration, Prisma, seed, contract, or RLS changes
- AdminRBAC reopening
- G-026 reopening
- broad QA transformation
- broad CI redesign
- repo-wide enforcement rollout
- opening any second verification or process child
- any implementation authorization beyond this policy-design unit itself

## Implementation Authorization Statement

This decision authorizes exactly one bounded governance/policy-design unit only:

- `GOV-VERIFY-01`

It does **not** authorize implementation of verification mechanisms.
It does **not** authorize tooling rollout, CI rollout, Playwright rollout, governance-lint change,
or product behavior change.

## Consequences

- Layer 0 now has exactly one `OPEN` governed unit
- `NEXT-ACTION` moves from `OPERATOR_DECISION_REQUIRED` to `GOV-VERIFY-01`
- `GOV-VERIFY-01` becomes the sole bounded active governed unit for this cycle
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`
- no second unit is opened by this step

## Sequencing Impact

- `OPEN-SET.md` must show `GOV-VERIFY-01` as `OPEN`
- `NEXT-ACTION.md` must point only to `GOV-VERIFY-01`
- `SNAPSHOT.md` must reflect that one governed unit is now open for bounded policy design only
- a new Layer 1 unit record must exist for `GOV-VERIFY-01`

This decision opens exactly one bounded policy-design unit and nothing broader.