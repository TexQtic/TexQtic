# GOV-DEC-GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-OPENING

Date: 2026-03-24
Type: Governance Decision + Opening
Status: Accepted
Unit: GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001
Domain: GOVERNANCE
Delivery Class: DECISION_QUEUE

## Decision

Open one bounded governance remediation unit,
`GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001`, to determine and resolve the exact
remaining Sentinel close-gate blocker on `SENTINEL-V1-CHECK-005` for lawful close rerun of
`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`.

The latest lawful manual Sentinel rerun is controlling:

- checkpoint: `close_progression`
- subject: `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`
- result: `FAIL`
- remaining failing check: `SENTINEL-V1-CHECK-005`
- failure class: `layer0_consistency`
- reported reason: `SNAPSHOT does not reflect the current open governed unit count`
- non-failing checks:
  - `SENTINEL-V1-CHECK-006` — `PASS`
  - `SENTINEL-V1-CHECK-007` — `PASS`
  - `SENTINEL-V1-CHECK-008` — `PASS`
  - `SENTINEL-V1-CHECK-009` — `PASS`
- correction_order_required: `true`
- closure proceeded: `no`

TexQtic records that this latest Sentinel `FAIL` is controlling. The blocked certification close
must not proceed until the CHECK-005 Layer 0 count mismatch is lawfully corrected and the close
gate is rerun to `PASS`.

This remediation is governance / Sentinel-close-path correction only. It does not close the
certification unit, does not authorize any certification implementation change, does not authorize
Sentinel doctrine expansion, automation rollout, CI integration, hooks, bots, or auto-triggering,
and must remain as narrow as possible.

Current `ACTIVE_DELIVERY` / `NEXT-ACTION` authority remains preserved unless Layer 0 truth later
changes by a separate lawful governance move.

`SENTINEL-V1-CHECK-006`, `SENTINEL-V1-CHECK-007`, `SENTINEL-V1-CHECK-008`, and
`SENTINEL-V1-CHECK-009` are no longer the controlling blockers for this close posture.

## Opening

TexQtic opens exactly one bounded concurrent governance remediation unit:

- `GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001`
- title: `Sentinel CHECK-005 recount remediation`

This unit is `OPEN` in Layer 0 with delivery class `DECISION_QUEUE`.

Reason:

- this is concurrent governance remediation only
- it is not `ACTIVE_DELIVERY`
- it must not displace the blocked certification close as the operative delivery stream
- it exists only to make the Sentinel close gate lawfully rerunnable after bounded CHECK-005 correction

## Opening Scope

In scope:

1. inspect repo truth to determine why `SENTINEL-V1-CHECK-005` still reports a SNAPSHOT open
   governed unit count mismatch during `close_progression`
2. determine whether the mismatch is caused by stale `SNAPSHOT.md` truth, stale `OPEN-SET.md`
   truth, count-definition mismatch, runner recount logic, inclusion/exclusion of specific
   non-terminal classes, or parsing of current governance records
3. identify the minimum lawful correction needed for the CHECK-005 mismatch
4. preserve the existing certification close prompt intent without performing the close itself
5. preserve Layer 0 delivery authority throughout

Out of scope:

- closing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` in this unit
- any certification product, service, route, test, schema, or migration change
- any DB, Prisma, or SQL execution
- any CI integration
- any git hook or watcher integration
- any auto-trigger rollout
- any broad Sentinel redesign
- any unrelated check-catalog edits
- any widening beyond the specific CHECK-005 recount mismatch
- any new follow-on opening by implication

## Layer 0 Effect

- `OPEN-SET.md` must show `GOVERNANCE-SENTINEL-CHECK-005-RECOUNT-REMEDIATION-001` as `OPEN` with
  `DECISION_QUEUE`
- `NEXT-ACTION.md` must preserve `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` as the same
  blocked `ACTIVE_DELIVERY` close stream
- `SNAPSHOT.md` must reflect the newly opened concurrent remediation unit while preserving the same
  delivery-sequencing authority

This opening preserves the existing governance pattern for concurrent `DECISION_QUEUE` units and
does not redirect `NEXT-ACTION` away from the certification close stream.