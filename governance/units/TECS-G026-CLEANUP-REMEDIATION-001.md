---
unit_id: TECS-G026-CLEANUP-REMEDIATION-001
title: Remove or re-home non-routing texqtic_service dependencies before any routing opening
type: IMPLEMENTATION
status: CLOSED
wave: W4
plane: BACKEND
opened: 2026-03-20
closed: 2026-03-20
verified: 2026-03-20
commit: 0f3d2c3
evidence: "Authoritative remote Supabase verification PASS: remediation migration applied, grants/revokes proved, prisma db pull PASS, prisma generate PASS, prisma migrate resolve reached applied state, tsc --noEmit PASS, and bounded runtime verification PASS for public by-email, internal resolve-domain, and buyer RFQ helper reads."
prerequisite_for: Any future bounded G-026 routing-opening question
doctrine_constraints:
  - D-004: this is one bounded cleanup or remediation unit only; no routing work may be mixed in
  - D-006: governance control-plane files may change only in the later governance sync / close steps
  - D-011: no tenant-boundary weakening; resolver-only target posture must be preserved
  - D-003: any required DB changes must follow repo-governed SQL-first discipline
decisions_required:
  - GOV-DEC-G026-DISCREPANCY-DISPOSITION: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-G026-DESIGN-CLARIFICATION-001: DECIDED (2026-03-20, Paresh)
  - GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING: DECIDED (2026-03-20, Paresh)
blockers: []
---

## Unit Summary

`TECS-G026-CLEANUP-REMEDIATION-001` was the sole bounded remediation unit for this G-026 cleanup step.

It covers only the cleanup or remediation work required to remove or re-home the non-routing
`texqtic_service` dependencies identified by `GOV-DEC-G026-DESIGN-CLARIFICATION-001`.

This closed unit does not open the broader G-026 stream. It does not authorize routing work. It
does not reopen `TECS-G026-H-001`.

## Acceptance Criteria

- [x] The public by-email path no longer depends on `texqtic_service` for `memberships` or `users`, or that dependency is explicitly re-homed within the bounded remediation scope
- [x] The RFQ helper read paths no longer depend on `texqtic_service` for `catalog_items` or `rfq_supplier_responses`, or those dependencies are explicitly re-homed within the bounded remediation scope
- [x] The extra `SELECT` grants on `memberships`, `users`, `catalog_items`, and `rfq_supplier_responses` are removed once the non-routing paths no longer require them
- [x] The base resolver posture remains preserved on `public.tenants` and `public.tenant_domains`
- [x] `texqtic_service` remains `NOLOGIN`, `BYPASSRLS`, transaction-local via `postgres`, and `SELECT`-only
- [x] Duplicate/equivalent `postgres` membership rows are changed only if implementation evidence shows normalization is actually required to preserve the clarified posture
- [x] No routing implementation, broad G-026 opening, custom-domain scope, apex-domain scope, or DNS-verification scope is introduced

## Files Allowlisted (Modify)

*To be defined by the TECS-G026-CLEANUP-REMEDIATION-001 implementation prompt.*

Expected candidates for the future implementation prompt only:

- `server/src/routes/public.ts` — only if the by-email path is being re-homed away from `texqtic_service`
- `server/src/routes/tenant.ts` — only if the RFQ helper reads are being re-homed away from `texqtic_service`
- `server/prisma/migrations/**/migration.sql` — only if a repo-governed SQL change is required to retire the extra non-routing grants or normalize role membership truthfully
- governance files only in later governance sync / close steps

## Files Read-Only

- `governance/control/DOCTRINE.md`
- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/BLOCKED.md`
- `governance/control/SNAPSHOT.md`
- `governance/decisions/GOV-DEC-G026-DISCREPANCY-DISPOSITION.md`
- `governance/decisions/GOV-DEC-G026-DESIGN-CLARIFICATION-OPENING.md`
- `governance/decisions/GOV-DEC-G026-DESIGN-CLARIFICATION-001.md`
- `governance/units/TECS-G026-DESIGN-CLARIFICATION-001.md`
- `governance/units/TECS-G026-H-001.md`
- `docs/architecture/CUSTOM-DOMAIN-ROUTING-DESIGN.md`

## Evidence Record

- Opening decision: `GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING`
- Clarification decision: `GOV-DEC-G026-DESIGN-CLARIFICATION-001`
- Prior prerequisite unit: `TECS-G026-H-001` remains `CLOSED`
- Prior clarification unit: `TECS-G026-DESIGN-CLARIFICATION-001` remains `CLOSED`
- This unit exists because the clarified future routing-opening target posture remains resolver-only while the current repo truth still includes non-routing `texqtic_service` dependencies
- Implementation commit: `0f3d2c3` (`fix(g026): rehome non-routing service-role dependencies`)
- Authoritative remote verification proved the bounded role posture after remediation: `texqtic_service` retains `SELECT` only on `public.tenants` and `public.tenant_domains`; `texqtic_public_lookup` holds the by-email read grants on `public.memberships`, `public.tenants`, and `public.users`; `texqtic_rfq_read` holds the RFQ helper read grants on `public.catalog_items` and `public.rfq_supplier_responses`
- Runtime verification passed for `/api/public/tenants/by-email`, `/api/internal/resolve-domain`, and buyer RFQ helper reads via `/api/tenant/rfqs/:id`
- Verification-side `server/prisma/schema.prisma` reconciliation drift from `prisma db pull` was not retained as product-code scope and is not part of this governance sync record

## Allowed Next Step

No further implementation work is authorized inside this closed unit.

No routing opening is implied by this closed state.

## Forbidden Next Step

- Do **not** open the broad G-026 v1 routing stream in this unit
- Do **not** open a routing implementation unit in this unit
- Do **not** implement resolver endpoint, middleware, cache, invalidation, or WL operator-surface work in this unit
- Do **not** add custom-domain, apex-domain, or DNS-verification scope in this unit
- Do **not** reopen `TECS-G026-H-001`
- Do **not** treat the discrepancy as already resolved without implementation and verification evidence
- Do **not** widen beyond the four non-routing dependency tables unless a separate governance step authorizes that

## Drift Guards

- This unit is remediation-only. If work requires routing behavior, resolver contract changes, or broader white-label domain scope, stop and return to governance rather than widening scope implicitly.
- Broad G-026 remains unopened after this verified remediation state.
- Any later routing-opening question must still wait for a separate governance decision and, if chosen, a later close step for this unit.

## Governance Sync

- Governance sync unit: `GOVERNANCE-SYNC-TECS-G026-CLEANUP-REMEDIATION-001`
- Status transition: `OPEN` -> `VERIFIED_COMPLETE`
- Next-action posture after sync: `OPERATOR_DECISION_REQUIRED`

## Governance Closure

- Governance close unit: `GOV-CLOSE-TECS-G026-CLEANUP-REMEDIATION-001`
- Status transition: `VERIFIED_COMPLETE` -> `CLOSED`
- Next-action posture after closure: `OPERATOR_DECISION_REQUIRED`
- Mandatory post-close audit result: `HOLD`

## Control-Plane Source of Truth

| Question | Answer lives in |
|---|---|
| Why did this unit open? | `governance/decisions/GOV-DEC-G026-CLEANUP-REMEDIATION-OPENING.md` |
| What clarification required this step? | `governance/decisions/GOV-DEC-G026-DESIGN-CLARIFICATION-001.md` |
| What broader stream remains unopened? | bounded G-026 v1 platform-subdomain routing |
| What is the single authorized next action? | `governance/control/NEXT-ACTION.md` |

**Read control-plane files before this unit file. This file refines unit-specific truth only.**

## Last Governance Confirmation

2026-03-20 — `GOV-CLOSE-TECS-G026-CLEANUP-REMEDIATION-001`. Status transitioned:
`VERIFIED_COMPLETE` -> `CLOSED` after the already-recorded implementation, verification, and
governance-sync chain. Broad G-026 routing remains unopened, no routing unit was created, and the
mandatory post-close audit result is `HOLD`.