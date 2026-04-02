---
unit_id: ORG-STATUS-CONSTRAINT-LIFECYCLE-RECONCILIATION-001
title: Organizations.status constraint lifecycle reconciliation
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: CONTROL
opened: 2026-04-02
closed: null
verified: null
commit: null
evidence: "OPENING_CONFIRMATION: pre-SQL audit grounded the target organizations.status set from current repo truth · DB_CONTRACT_CONFLICT_CONFIRMATION: production organizations_status_check still allowed only ACTIVE, SUSPENDED, TERMINATED while runtime code and contracts depend on PENDING_VERIFICATION, VERIFICATION_APPROVED, VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO, and CLOSED · BOUNDED_STRATEGY_CONFIRMATION: this unit is limited to reconciling the authoritative DB constraint, schema contract text, and tenant OpenAPI without widening into onboarding redesign or helper workarounds"
doctrine_constraints:
  - D-004: this unit is DB-governed reconciliation only and must not widen into onboarding architecture redesign, helper workarounds, CRM work, or seed redesign
  - D-007: only the exact allowlisted migration, schema, OpenAPI, and unit record surfaces are authorized
  - D-011: the grounded target set is ACTIVE, SUSPENDED, CLOSED, PENDING_VERIFICATION, VERIFICATION_APPROVED, VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO unless a contradiction is proven inside this unit
  - D-013: TERMINATED is treated as historical DB-only residue and is not forward contract truth in this unit
decisions_required: []
blockers: []
---

## Unit Summary

`ORG-STATUS-CONSTRAINT-LIFECYCLE-RECONCILIATION-001` exists to reconcile the authoritative
database contract for `organizations.status` with the lifecycle semantics already implemented and
consumed across the repo.

This unit does not redesign onboarding. It reconciles the persistence contract to the grounded
status vocabulary already depended on by runtime paths and exposed contract surfaces.

## Grounded Target Set

The reconciled legal set for `organizations.status` in this unit is:

- `ACTIVE`
- `SUSPENDED`
- `CLOSED`
- `PENDING_VERIFICATION`
- `VERIFICATION_APPROVED`
- `VERIFICATION_REJECTED`
- `VERIFICATION_NEEDS_MORE_INFO`

`TERMINATED` is historical DB-only residue and is normalized out of the forward contract.

## Bounded Change Shape

1. add one migration to reconcile `organizations_status_check` to the grounded target set
2. align `schema.prisma` contract text for `organizations.status`
3. align `openapi.tenant.json` so exposed tenant/org status semantics match runtime and DB truth
4. do not create a new onboarding field and do not widen into lifecycle redesign

## Exact Allowlist

- `server/prisma/migrations/20260402000000_org_status_constraint_lifecycle_reconciliation_001/migration.sql`
- `server/prisma/schema.prisma`
- `shared/contracts/openapi.tenant.json`
- `governance/units/ORG-STATUS-CONSTRAINT-LIFECYCLE-RECONCILIATION-001.md`

## Verification Standard

1. migration text proves the reconciled DB contract allows the grounded target set
2. schema/OpenAPI contract text matches the reconciled set
3. static validation passes within the bounded surface
4. scope validation proves no file creep
