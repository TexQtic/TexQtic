---
unit_id: TECS-G026-DESIGN-CLARIFICATION-001
title: texqtic_service resolver-role discrepancy posture clarification
type: GOVERNANCE
status: OPEN
wave: W4
plane: BACKEND
opened: 2026-03-20
closed: null
verified: null
commit: null
evidence: null
doctrine_constraints:
  - D-004: this is one bounded clarification unit only; no routing or cleanup implementation may be mixed in
  - D-007: governance units must not touch application code, schema, tests, or CI scripts
  - D-011: no tenant-boundary weakening; resolver-role posture must remain minimum and explicit
  - D-013: any later close must include mandatory post-close audit output
decisions_required:
  - GOV-DEC-G026-POST-CLOSE-DISPOSITION: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-G026-DISCREPANCY-DISPOSITION: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING: DECIDED (2026-03-20, Paresh)
blockers: []
---

## Unit Summary

TECS-G026-DESIGN-CLARIFICATION-001 is the sole bounded next governed unit for G-026.

It is limited to one governance/design question only: the intended canonical resolver-role posture
for `texqtic_service` in light of the preserved discrepancy notes from `TECS-G026-H-001`.

This unit does not authorize routing work. It does not authorize cleanup implementation work. It
does not reopen `TECS-G026-H-001`.

## Acceptance Criteria

- [ ] The intended canonical resolver-role posture for `texqtic_service` is explicitly clarified
- [ ] The extra `SELECT` grants on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users` are classified as either acceptable residuals or inconsistent with the target posture
- [ ] The duplicate/equivalent `postgres` membership rows are classified as either acceptable or requiring normalization
- [ ] The exact bounded posture that must be true before any future routing opening can be considered is recorded
- [ ] It is explicitly decided whether a later cleanup unit is required and, if so, what exact bounded scope it would have
- [ ] No routing implementation, cleanup implementation, or broad G-026 opening is authorized inside this unit

## Files Allowlisted (Modify)

*To be defined by the TECS-G026-DESIGN-CLARIFICATION-001 clarification prompt.*

Expected candidates for the future clarification prompt only:

- `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md` — only if the design anchor must be clarified
- `governance/decisions/*.md` — only files strictly required to record the clarification outcome
- `governance/units/TECS-G026-DESIGN-CLARIFICATION-001.md` — closure/evidence updates only in the later governance step

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/units/TECS-G026-H-001.md`
- `governance/decisions/GOV-DEC-G026-POST-CLOSE-DISPOSITION.md`
- `governance/decisions/GOV-DEC-G026-DISCREPANCY-DISPOSITION.md`
- `governance/decisions/GOV-POLICY-MANDATORY-POST-CLOSE-GOVERNANCE-AUDIT.md`
- `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md`

## Evidence Record

- Opening decision: `GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING`
- Prior prerequisite unit: `TECS-G026-H-001` remains `CLOSED`
- Preserved discrepancy notes carried into this unit:
  - additional `SELECT` grants on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users`
  - duplicate/equivalent `postgres` membership rows

## Allowed Next Step

Bounded design clarification only.

No further implementation work is authorized inside this unit.

## Forbidden Next Step

- Do **not** open the broad G-026 v1 routing stream in this unit
- Do **not** open a routing implementation unit in this unit
- Do **not** open a cleanup implementation unit in this unit
- Do **not** implement resolver endpoint, middleware, cache, invalidation, or WL operator-surface work in this unit
- Do **not** add custom-domain, apex-domain, or DNS-verification scope in this unit
- Do **not** treat the preserved discrepancy notes as already resolved without deciding them
- Do **not** reopen RFQ or AdminRBAC

## Drift Guards

- This unit is clarification-only. If work requires product code, schema, migrations, routes, or tests, stop and return to governance rather than widening scope implicitly.
- Broad G-026 remains unopened while this unit is active.
- Any later cleanup unit must be separately authorized after clarification, not inferred during this unit.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this unit open now? | `governance/decisions/GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING.md` |
| What discrepancy posture required this step? | `governance/decisions/GOV-DEC-G026-DISCREPANCY-DISPOSITION.md` |
| What broader stream remains unopened? | bounded G-026 v1 platform-subdomain routing |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**