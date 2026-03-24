# GOV-DEC-GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-OPENING

Date: 2026-03-24
Type: Governance Decision + Opening
Status: Accepted
Unit: GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001
Domain: GOVERNANCE
Delivery Class: DECISION_QUEUE

## Decision

Open one bounded governance remediation unit, `GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001`, to resolve the exact Sentinel v1 close allowlist mismatch that blocked lawful closure of `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`.

The opening authority is the mandatory manual Sentinel v1 run already executed before any close edit:

- command: `npm run governance:sentinel:v1 -- run --checkpoint close_progression --subject CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002 --decision-file governance/decisions/GOV-DEC-CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-OPENING.md --unit-file governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md --next-action governance/control/NEXT-ACTION.md --open-set governance/control/OPEN-SET.md --snapshot governance/control/SNAPSHOT.md --execution-log governance/log/EXECUTION-LOG.md --modified-files governance/control/NEXT-ACTION.md governance/control/OPEN-SET.md governance/control/SNAPSHOT.md governance/log/EXECUTION-LOG.md governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md`
- checkpoint: `close_progression`
- subject: `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- result: `FAIL`
- failing check: `SENTINEL-V1-CHECK-006`
- failure class: `allowlist_boundary_conformance`
- reported reason: `non-allowlisted file in change scope: governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md`
- correction_order_required: `true`
- closure proceeded: `no`

## Opening Scope

In scope:

- determine why the lawful close surface `governance/units/CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002.md` was treated as non-allowlisted by Sentinel during `close_progression`
- define the minimum lawful correction required to make that bounded close gate passable later
- define the required correction-order posture and bounded rerun posture after correction
- align Layer 0 and Layer 1 governance wording so the blocked close remains truthfully represented while remediation proceeds concurrently

Out of scope:

- performing the blocked certification close in this opening
- modifying certification implementation, tests, runtime behavior, DB/schema, contracts, or product code
- expanding Sentinel doctrine beyond the exact close allowlist mismatch
- introducing automation rollout, CI integration, hooks, bots, package expansion, or auto-triggering
- displacing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` as the sole `ACTIVE_DELIVERY` stream in `NEXT-ACTION`

## Layer 0 Effect

- `NEXT-ACTION` remains pointed at `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` with `type: CLOSE`
- the certification close stream remains blocked, not replaced
- `GOVERNANCE-SENTINEL-CLOSE-ALLOWLIST-REMEDIATION-001` opens concurrently as `DECISION_QUEUE` only

## Rationale

The lawful response to a mandatory Sentinel `FAIL` is bounded correction, not bypass. Because the failure was specifically an allowlist-boundary mismatch on a close surface that should be governable, the minimal compliant action is to open a remediation unit dedicated to that mismatch and preserve the blocked certification close stream unchanged until correction is defined and later verified.