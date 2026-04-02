---
unit_id: CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS
title: Control-plane tenant deep-dive truthfulness
type: ACTIVE_DELIVERY
status: CLOSED
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: CONTROL
opened: 2026-03-31
closed: 2026-04-02
verified: 2026-04-02
commit: "9166ac7"
evidence: "OPENING_CONFIRMATION: current Layer 0 had no open product-facing ACTIVE_DELIVERY and NEXT-ACTION was OPERATOR_DECISION_REQUIRED before this opening · FAMILY_REJECTION_CONFIRMATION: CONTROL-PLANE-TENANT-OPERATIONS-REALITY remained too wide to open directly after bounded eligibility reconciliation · BOUNDARY_CONFIRMATION: PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md now controls this lane and limits it to tenant deep-dive truthfulness rather than broad control-plane completion · PRODUCTION_PROOF_CHAIN_CONFIRMATION: lawful VERIFICATION_APPROVED preparation was established, control-plane read truth was restored, Activate Approved Tenant became visible on the lawful path, and the real production button-driven activation succeeded on tenant 05d7a469-8ec3-4685-8a24-803933a88f79 · POST_ACTIVATION_TRUTH_CONFIRMATION: deep-dive post-state remained truthful as ACTIVE and neighbor-path checks remained clean for shell continuity, registry continuity, bounded tenant-context entry, and separate audit posture · ADJACENT_FINDING_SEPARATION_CONFIRMATION: control.ts:287 likely still uses the older write-context pattern on the onboarding outcome route and remains a separate bounded follow-up candidate only"
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

Result: `CLOSED`.

Current repo, runtime, and governance truth now confirm that the deep-dive is truthful on the
reviewed production path: lawful `VERIFICATION_APPROVED` preparation was established, the eligible
tenant surfaced truthfully, the real approved-activation control completed successfully in
production, the post-activation deep-dive remained truthful as `ACTIVE`, and the required
neighbor-path checks remained clean.

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

## Close Record

- lawful `VERIFICATION_APPROVED` preparation was established for the reviewed proof path
- control-plane read truth was restored so list, detail, and deep-dive surfaces aligned on the
  lawful eligible tenant path
- the real `Activate Approved Tenant` path was exercised successfully in production on tenant
  `05d7a469-8ec3-4685-8a24-803933a88f79`
- post-activation deep-dive truth remained correct as `ACTIVE`
- neighbor-path checks remained clean for shell continuity, registry continuity, bounded
  tenant-context entry, and separate audit posture

## Separate Notes

- Adjacent finding only: `server/src/routes/control.ts:287` likely still uses the older
  write-context pattern on the onboarding outcome route and may require a separate bounded
  hardening unit if production use of that route needs explicit safety
- Ephemeral proof tenant cleanup completed separately: `05d7a469-8ec3-4685-8a24-803933a88f79`
  was classified as `EPHEMERAL` and was removed by
  `EPHEMERAL-VERIFICATION-TENANT-CLEANUP-001` after close / governance sync acceptance

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