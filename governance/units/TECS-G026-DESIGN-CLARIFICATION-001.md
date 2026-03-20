---
unit_id: TECS-G026-DESIGN-CLARIFICATION-001
title: texqtic_service resolver-role discrepancy posture clarification
type: GOVERNANCE
status: CLOSED
wave: W4
plane: BACKEND
opened: 2026-03-20
closed: 2026-03-20
verified: 2026-03-20
commit: null
evidence: "repo evidence review PASS · clarification decision recorded · Layer 0 returned to OPERATOR_DECISION_REQUIRED"
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

- [x] The intended canonical resolver-role posture for `texqtic_service` is explicitly clarified
- [x] The extra `SELECT` grants on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users` are classified as either acceptable residuals or inconsistent with the target posture
- [x] The duplicate/equivalent `postgres` membership rows are classified as either acceptable or requiring normalization
- [x] The exact bounded posture that must be true before any future routing opening can be considered is recorded
- [x] It is explicitly decided whether a later cleanup unit is required and, if so, what exact bounded scope it would have
- [x] No routing implementation, cleanup implementation, or broad G-026 opening is authorized inside this unit

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
- Clarification decision: `GOV-DEC-G026-DESIGN-CLARIFICATION-001`
- Prior prerequisite unit: `TECS-G026-H-001` remains `CLOSED`
- Preserved discrepancy notes carried into this unit:
  - additional `SELECT` grants on `catalog_items`, `memberships`, `rfq_supplier_responses`, and `users`
  - duplicate/equivalent `postgres` membership rows
- Repo evidence used for clarification:
  - `server/prisma/migrations/20260317000000_g026_texqtic_service_role/migration.sql` establishes the original bounded resolver-role posture
  - `server/prisma/migrations/20260319000001_pw5_by_email_service_role_grants/migration.sql` and `server/src/routes/public.ts` prove current non-routing dependency on `memberships` and `users`
  - `server/prisma/migrations/20260319010003_tecs_rfq_buyer_response_read_001/migration.sql` and `server/src/routes/tenant.ts` prove current non-routing dependency on `catalog_items` and `rfq_supplier_responses`
  - `server/prisma/migrations/20260320010000_tecs_g026_h_001_reconcile_texqtic_service_role/migration.sql` proves the closed prerequisite intentionally preserved supplemental grants as out-of-scope historical observations only

## Clarification Outcome

The canonical future routing-opening target posture remains the narrow resolver-only posture:

- `NOLOGIN`
- `BYPASSRLS`
- transaction-local `SET LOCAL ROLE` from `postgres`
- `SELECT`-only authority
- base grants limited to `public.tenants` and `public.tenant_domains`
- resolver-only usage for host-to-tenant routing primitives

The extra grants on `memberships`, `users`, `catalog_items`, and `rfq_supplier_responses` are not
accepted as compatible residuals for that target posture. They are separately governed historical
dependencies that must be removed or re-homed before any routing-opening question may proceed.

The duplicate/equivalent `postgres` membership rows are acceptable as a non-blocking normalization
observation only so long as they remain semantically equivalent and do not widen effective
authority.

A later bounded cleanup or remediation unit is required before any routing opening can be
considered. That later unit must remove or re-home the non-routing `texqtic_service` dependencies
and retire the associated extra grants while preserving the base resolver posture.

## Governance Closure

- Closure decision/result: `GOV-DEC-G026-DESIGN-CLARIFICATION-001`
- Status transition: `OPEN` → `CLOSED`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`

## Mandatory Post-Close Audit

### 1. State summary

- `TECS-G026-DESIGN-CLARIFICATION-001` is now `CLOSED`
- the canonical future routing-opening posture is resolver-only and narrow
- the extra four `SELECT` grants remain current historical truth but are classified as
  inconsistent with that future routing-opening target posture

### 2. Outstanding gates

- no G-026 routing opening is authorized
- a separate bounded cleanup or remediation unit is still required before any routing-opening
  question may proceed
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE`

### 3. Natural next-step candidates

- `HOLD`
- `DECISION_REQUIRED`
- `OPENING_CANDIDATE` for a bounded cleanup or remediation unit
- `RECORD_ONLY`

### 4. Recommended next governance-valid move

- `DECISION_REQUIRED`

Reason: the clarification is now complete, but opening cleanup or routing would be a new governed
step and must not be inferred automatically from this unit.

### 5. Why stronger moves remain blocked

- routing remains blocked because current repo truth still includes non-routing `texqtic_service`
  dependencies and extra grants outside the canonical resolver-only target posture
- cleanup is not auto-opened because this unit was clarification-only

### 6. Forbidden next moves

- no broad G-026 opening
- no routing opening
- no routing implementation
- no implicit cleanup opening from this closure
- no reinterpretation of the extra grants as routing-compatible final state

### 7. Resulting Layer 0 posture

- `NEXT-ACTION` returns to `OPERATOR_DECISION_REQUIRED`
- no G-026 implementation-ready unit is open
- broad G-026 remains unopened

## Allowed Next Step

No further action is authorized inside this closed unit.

## Forbidden Next Step

- Do **not** open the broad G-026 v1 routing stream in this unit
- Do **not** open a routing implementation unit in this unit
- Do **not** open a cleanup implementation unit in this unit
- Do **not** implement resolver endpoint, middleware, cache, invalidation, or WL operator-surface work in this unit
- Do **not** add custom-domain, apex-domain, or DNS-verification scope in this unit
- Do **not** treat the preserved discrepancy notes as already resolved without deciding them
- Do **not** reopen RFQ or AdminRBAC
- Do **not** treat a later cleanup/remediation unit as already opened by this closure

## Drift Guards

- This unit is clarification-only. If work requires product code, schema, migrations, routes, or tests, stop and return to governance rather than widening scope implicitly.
- Broad G-026 remains unopened after this unit is closed.
- Any later cleanup unit must be separately authorized after clarification, not inferred during this unit.

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why is this unit open now? | `governance/decisions/GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING.md` |
| What clarification outcome closed it? | `governance/decisions/GOV-DEC-G026-DESIGN-CLARIFICATION-001.md` |
| What discrepancy posture required this step? | `governance/decisions/GOV-DEC-G026-DISCREPANCY-DISPOSITION.md` |
| What broader stream remains unopened? | bounded G-026 v1 platform-subdomain routing |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**