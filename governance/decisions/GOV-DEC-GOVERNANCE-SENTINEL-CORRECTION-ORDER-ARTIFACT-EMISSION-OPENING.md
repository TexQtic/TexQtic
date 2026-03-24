# GOV-DEC-GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-OPENING

Date: 2026-03-24
Type: Governance Decision + Opening
Status: Accepted
Unit: GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001
Domain: GOVERNANCE
Delivery Class: DECISION_QUEUE

## Decision

Open one bounded governance remediation unit,
`GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001`, to create exactly one lawful
correction-order artifact instance at the canonical governed path required for retry validation
under `SENTINEL-V1-CHECK-009` before any lawful rerun of the certification Close gate for
`CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002`.

The controlling certification Close remains blocked. TexQtic records the following current repo
truth as authoritative:

- `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` remains the sole `ACTIVE_DELIVERY` close stream
  in Layer 0
- close progression was attempted lawfully with mandatory manual Sentinel invocation
- `SENTINEL-V1-CHECK-006` is remediated and now returns `PASS`
- `SENTINEL-V1-CHECK-005` is remediated and now returns `PASS` in repo truth
- CHECK-009 reference-path doctrine is already remediated in repo truth
- the remaining practical blocker is the absence of one concrete correction-order artifact instance
- retry requires both `--retry-from-fail true` and `--correction-order-reference <canonical
  artifact path>`
- the canonical correction-order artifact path class is
  `governance/correction-orders/<correction_order_id>.yaml`
- no concrete correction-order artifact instance yet exists for the blocked certification close
  retry
- closure proceeded: `no`

The blocked certification close must not proceed until that correction-order artifact instance
exists lawfully.

This remediation is governance / Sentinel-close-path evidence emission only. It does not close the
certification unit, does not authorize any certification implementation change, does not authorize
Sentinel doctrine expansion, automation rollout, CI integration, hooks, bots, or auto-triggering,
and must remain as narrow as possible.

The correction-order artifact path must use the canonical class already decided in repo truth and
must not be guessed outside that class.

Current `ACTIVE_DELIVERY` / `NEXT-ACTION` authority remains preserved unless Layer 0 truth later
changes by a separate lawful governance move.

## Opening

TexQtic opens exactly one bounded concurrent governance remediation unit:

- `GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001`
- title: `Sentinel correction-order artifact emission`

This unit is `OPEN` in Layer 0 with delivery class `DECISION_QUEUE`.

Reason:

- this is concurrent governance remediation only
- it is not `ACTIVE_DELIVERY`
- it must not displace the blocked certification close as the operative delivery stream
- it exists only to make the Sentinel close gate lawfully rerunnable by emitting the required
  correction-order artifact instance

## Opening Scope

In scope:

1. define the exact `correction_order_id` to use for this blocked certification close retry
2. create exactly one correction-order artifact instance at
   `governance/correction-orders/<correction_order_id>.yaml`
3. ensure the artifact matches the now-canonical correction-order path, schema, and template
   expectations
4. preserve the existing certification close prompt intent without performing the close itself
5. preserve Layer 0 delivery authority throughout

Out of scope:

- closing `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` in this unit
- any certification product/service/route/test/schema/migration change
- any DB/Prisma/SQL execution
- any CI integration
- any git hook or watcher integration
- any auto-trigger rollout
- any broad Sentinel redesign
- any unrelated check-catalog edits
- any widening beyond the specific correction-order artifact instance required for CHECK-009 retry
- any new follow-on opening by implication

## Layer 0 Effect

- `OPEN-SET.md` must show `GOVERNANCE-SENTINEL-CORRECTION-ORDER-ARTIFACT-EMISSION-001` as `OPEN`
  with `DECISION_QUEUE`
- `NEXT-ACTION.md` must preserve `CERTIFICATION-LIFECYCLE-TRANSITION-LOGGING-002` as the same
  blocked `ACTIVE_DELIVERY` close stream
- `SNAPSHOT.md` must reflect the newly opened concurrent remediation unit while preserving the same
  delivery-sequencing authority

This opening preserves the existing governance pattern for concurrent `DECISION_QUEUE` units and
does not redirect `NEXT-ACTION` away from the certification close stream.