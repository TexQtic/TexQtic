---
unit_id: CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS
title: Control-plane tenant deep-dive truthfulness
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: CONTROL
opened: 2026-03-31
closed: null
verified: null
commit: null
evidence: "OPENING_CONFIRMATION: current Layer 0 had no open product-facing ACTIVE_DELIVERY and NEXT-ACTION was OPERATOR_DECISION_REQUIRED before this opening · FAMILY_REJECTION_CONFIRMATION: CONTROL-PLANE-TENANT-OPERATIONS-REALITY remained too wide to open directly after bounded eligibility reconciliation · BOUNDARY_CONFIRMATION: PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md now controls this lane and limits it to tenant deep-dive truthfulness rather than broad control-plane completion · REPO_TRUTH_CONFIRMATION: SuperAdminShell and TenantRegistry are materially real neighbors, while TenantDetails exposes real overview and approved activation alongside thin or under-construction deeper tabs and adjacent billing/risk/lifecycle overclaim risk · ADMINRBAC_EXCLUSION_CONFIRMATION: TECS-FBW-ADMINRBAC remains DESIGN_GATE and is excluded from this unit"
doctrine_constraints:
  - D-004: this is one bounded ACTIVE_DELIVERY unit only; it must not be merged with broad control-plane tenant operations reality, registry redesign, audit-log depth, impersonation breadth, or AdminRBAC work
  - D-007: no product/server/schema/migration/test/package/CI/hook surface outside the exact future implementation allowlist is authorized
  - D-011: this unit is now the sole authorized next ACTIVE_DELIVERY and preserved later-ready families remain separate
  - D-013: this opening authorizes implementation sequencing only and does not itself satisfy implementation, verification, governance sync, or close
decisions_required:
  - GOV-DEC-CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS-OPENING: DECIDED (2026-03-31, Paresh)
blockers: []
---

## Unit Summary

`CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS` is one bounded `ACTIVE_DELIVERY` unit.

It exists only to make the control-plane tenant deep-dive surface truthful on the reviewed runtime
path without widening into broader control-plane modernization.

Current repo and governance truth support this bounded unit because the control-plane shell and
tenant registry are materially real enough for launch supervision, but the tenant deep-dive still
risk overclaiming lifecycle, billing, risk, and deeper admin-operational depth.

## Source Truth

Current repo truth supporting this candidate is:

- `layouts/SuperAdminShell.tsx` is materially real and remains a neighbor surface to protect,
  not a redesign target
- `components/ControlPlane/TenantRegistry.tsx` is materially real and remains a neighbor surface to
  protect, not a redesign target
- `components/ControlPlane/TenantDetails.tsx` contains the reviewed tenant deep-dive surface where
  overview truth and approved-onboarding activation are real, but several deeper tabs and adjacent
  signals remain thin or under-construction
- `components/ControlPlane/AuditLogs.tsx` is materially real in read-only form and remains a
  separate neighbor surface; its disabled search/filter controls are not part of this unit
- `PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md` defines this lane as bounded launch supervision
  only and explicitly excludes `TECS-FBW-ADMINRBAC` and broader platform-admin completion

This exact candidate is separate from all of the following:

1. the broad family `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`, which remains too wide to open as
   one umbrella unit
2. `TECS-FBW-ADMINRBAC`, which remains `DESIGN_GATE` and governs invite/revoke/role-partition work
3. registry redesign or provisioning redesign
4. audit-log search/filter completion
5. impersonation lifecycle completion, billing workflow completion, and risk-report workflow completion

## Acceptance Criteria

- [x] The reviewed tenant deep-dive surface has been isolated as the lawful problem target
- [x] The opening remains bounded to `components/ControlPlane/TenantDetails.tsx` as the primary
      implementation surface
- [x] Overview truth and approved-onboarding activation truth are preserved as in-scope
- [x] Non-real deep tabs and adjacent billing/risk/lifecycle overclaim are explicitly in scope only
      for truthful handling, hiding, gating, relabeling, or de-emphasis
- [x] Registry, audit-log depth, impersonation breadth, billing workflow completion, risk-report
      completion, and AdminRBAC work remain out of scope
- [x] Neighbor-path smoke-check requirements are defined for control-plane entry and tenant
      selection continuity

## Files Allowlisted (Modify)

This decision/opening authorizes modification of these files only:

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `governance/control/SNAPSHOT.md`
- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
- `governance/decisions/GOV-DEC-CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS-OPENING.md`
- `governance/units/CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS.md`

All future implementation must use exact repo-relative allowlists only.

## Exact In-Scope Boundary

This unit authorizes only the following bounded work:

1. inspect and update the tenant deep-dive surface in `components/ControlPlane/TenantDetails.tsx`
2. preserve truthful overview presentation
3. preserve truthful approved-onboarding activation behavior and labeling
4. truthfully handle, hide, gate, relabel, or de-emphasize non-real deep tabs and adjacent
   billing/risk/lifecycle overclaim within the tenant deep-dive itself
5. perform required neighbor smoke checks on control-plane entry and tenant selection continuity

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- registry redesign or broad registry completion
- audit-log search/filter completion
- full impersonation lifecycle or impersonation redesign
- billing workflow completion or risk-report completion
- plan/features/admin-depth completion beyond truthful deep-dive treatment
- AdminRBAC invite/revoke/role-partition work or broader admin-authority redesign
- shell, routing, auth, DB/schema, or architecture changes

## Drift Guard

Implementation under this unit must remain as narrow as possible.

Do not widen this unit into:

- broad control-plane tenant operations reality
- platform-admin/control-center redesign
- registry or provisioning redesign
- audit-log completion work
- impersonation-program redesign
- billing or risk workflow implementation
- `TECS-FBW-ADMINRBAC` or any broader authority-management stream

If exact repo truth during implementation proves a neighbor surface must be changed beyond truthful
deep-dive handling, implementation must halt and report blocker rather than widen scope.

## Exact Verification Profile

- verification type: control-plane runtime truthfulness correction on the tenant deep-dive surface
- required verification modes:
  - bounded local implementation verification
  - Vercel verification mandatory before any future closure because this is a control-plane runtime
    UX change
  - neighbor-path smoke checks mandatory because the change touches a shared control-plane tenant
    supervision path
- required smoke-check neighbors:
  - control-plane shell entry remains healthy
  - tenant registry load and tenant selection remain healthy
  - reviewed tenant deep-dive overview remains healthy
  - approved-onboarding activation remains truthful on its bounded eligible path
  - registry redesign, audit-log depth, and AdminRBAC surfaces remain non-regressed and unopened

## Governance Posture After Opening

Resulting governance posture after this opening:

- `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS` is now the sole product-facing `ACTIVE_DELIVERY`
- the broad family `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains preserved as a broader later-
  ready family but is not opened directly by this step
- `TECS-FBW-ADMINRBAC` remains `DESIGN_GATE` and separate
- any later widening again requires a fresh bounded governance move