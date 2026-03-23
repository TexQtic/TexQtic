---
unit_id: GOVERNANCE-SENTINEL-V1-SPEC-001
title: Sentinel v1 specification artifacts and gate design
type: GOVERNANCE
status: OPEN
wave: W5
plane: CONTROL
opened: 2026-03-23
closed: null
verified: null
commit: null
evidence: "LAYER_0_CONFIRMATION: CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 remains OPEN, remains the sole ACTIVE_DELIVERY implementation-ready unit, and NEXT-ACTION still points only to that unit · DOCTRINE_CONFIRMATION: GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001 already approved Governance Sentinel as a mandatory binary gate only and recommended one later separate Opening for Sentinel v1 specification only · SPEC_GAP_CONFIRMATION: no canonical Sentinel v1 spec package existed yet under governance/sentinel, governance/schema, or governance/templates, so artifact surfaces, schema expectations, correction-order format, ownership boundaries, and later implementation acceptance boundary were still underspecified"
doctrine_constraints:
  - D-004: this is one bounded governance-only Sentinel specification unit only; no second Sentinel child or broad process program may be mixed in
  - D-007: no application code, schema, migration, contract, test, CI, script, package, or enforcement-tooling implementation is authorized in this unit
  - D-011: the currently authorized ACTIVE_DELIVERY certification unit must remain authoritative in NEXT-ACTION throughout this opening unless a separate governance move changes it
  - D-013: specification is not implementation, gate design is not enforcement rollout, and artifact creation is not permission to bypass later bounded implementation governance
decisions_required:
  - GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001: DECIDED (2026-03-23, Paresh)
  - GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING: DECIDED (2026-03-23, Paresh)
blockers: []
---

## Unit Summary

`GOVERNANCE-SENTINEL-V1-SPEC-001` is one bounded concurrent governance-only unit.

It is limited to defining the canonical Sentinel v1 specification package: the exact spec surface,
the gate-result schema, the correction-order template, checkpoint behavior, Layer 0 interaction
rules, machine-checkable scope, ownership boundaries, ledger-transition posture, and the later
implementation acceptance boundary.

This unit does not authorize Sentinel tooling, enforcement rollout, CI wiring, scripts, or product
changes.

## Acceptance Criteria

- [ ] The canonical Sentinel v1 spec surface is created and defines the exact artifact set
- [ ] The gate-result schema is created and fixes pass/fail output requirements
- [ ] The correction-order template is created and fixes retry/correction structure
- [ ] AVM-style binary gate behavior and trigger semantics are fixed
- [ ] Mirror-check and negative-evidence traceability rules are fixed
- [ ] Layer 0 interaction rules are fixed without changing the certification ACTIVE_DELIVERY authorization
- [ ] Ownership boundaries and later implementation acceptance boundary are fixed
- [ ] Old/new normalization-ledger transition posture is fixed
- [ ] No tooling rollout, CI wiring, scripts, packages, product code, DB/schema, or contract work is bundled in

## Files Allowlisted (Modify)

This opening authorizes modification of these files only:

- `governance/units/GOVERNANCE-SENTINEL-V1-SPEC-001.md`
- `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `governance/sentinel/GOVERNANCE-SENTINEL-V1-SPEC.md`
- `governance/schema/GOVERNANCE-SENTINEL-V1-GATE-RESULT-SCHEMA.md`
- `governance/templates/GOVERNANCE-SENTINEL-V1-CORRECTION-ORDER-TEMPLATE.md`

No other files are authorized for edit in this opening step.

## Files Read-Only

- `governance/analysis/CANDIDATE-NORMALIZATION-LEDGER.md`
- `governance/analysis/STEP2-PENDING-CANDIDATE-LEDGER.md`
- `governance/analysis/ADDITIONAL-REPO-TRUTH-CANDIDATES-001.md`
- `governance/log/**`
- `governance/decisions/**` except `governance/decisions/GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING.md`
- `governance/units/**` except `governance/units/GOVERNANCE-SENTINEL-V1-SPEC-001.md`
- `docs/governance/control/**`
- `server/**`
- `components/**`
- `services/**`
- `shared/**`
- `tests/**`
- `scripts/**`
- `.github/**`
- `package.json`
- `pnpm-lock.yaml`

## Evidence Record

- Doctrine decision id: `GOV-DEC-GOVERNANCE-SENTINEL-AND-DELIVERY-OS-001`
- Opening decision id: `GOV-DEC-GOVERNANCE-SENTINEL-V1-SPEC-OPENING`
- Preserved Layer 0 posture on entry: `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains `OPEN`, remains the sole `ACTIVE_DELIVERY` implementation-ready unit, `NEXT-ACTION` points only to that certification unit, `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`, and the newly opened Sentinel unit is concurrent governance-only work with `DECISION_QUEUE` delivery class only
- Opening result: canonical Sentinel v1 specification surfaces are now authorized and created only on the exact governance surfaces listed above

## Exact In-Scope Boundary

This unit may define only:

- the canonical Sentinel v1 artifact set and exact file surfaces
- the pass/fail gate-result schema
- the correction-order template and retry posture
- AVM-style binary gate behavior
- mandatory checkpoint trigger semantics
- mirror-check and negative-evidence traceability requirements
- the machine-checkable versus human-judgment boundary for v1
- Layer 0 interaction rules that preserve the certification ACTIVE_DELIVERY authorization
- ownership boundaries across Layer 0, normalization, spec artifacts, and later implementation
- old/new normalization-ledger transition posture
- the later implementation acceptance boundary for a separate Sentinel rollout unit

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- Sentinel tooling or runnable engine implementation
- scripts, hooks, CI, or linter rollout
- package or lockfile changes
- product code changes
- API, UI, schema, migration, Prisma, seed, contract, or RLS changes
- runtime/browser automation rollout
- changing `NEXT-ACTION` to replace the certification unit
- changing the certification unit away from sole `ACTIVE_DELIVERY`
- opening any second Sentinel child

## Purpose

Define TexQtic's bounded Sentinel v1 specification package so later implementation work can be
governed against one exact artifact set instead of narrative doctrine alone.

## Current Layer 0 Rule

`GOVERNANCE-SENTINEL-V1-SPEC-001` is open concurrently in Layer 0, but `NEXT-ACTION` remains the
certification implementation unit only.

This preserves the rule that current ACTIVE_DELIVERY authorization remains authoritative unless a
separate governance move explicitly changes it.
