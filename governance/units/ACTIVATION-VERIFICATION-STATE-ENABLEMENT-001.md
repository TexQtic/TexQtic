---
unit_id: ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001
title: Activation verification state enablement
type: ACTIVE_DELIVERY
status: OPEN
delivery_class: ACTIVE_DELIVERY
wave: W5
plane: CONTROL
opened: 2026-04-01
closed: null
verified: null
commit: null
evidence: "OPENING_CONFIRMATION: VERIFICATION-TENANT-POLICY-001 established that permanent repo-owned baseline tenants remain Acme Corporation and White Label Co only · GAP_CONFIRMATION: CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS close-readiness was blocked because no tenant in the reviewed shared environment existed in VERIFICATION_APPROVED state · STRATEGY_CONFIRMATION: repo truth already contains approved-onboarding provisioning plus onboarding-outcome persistence plus activate-approved mutation, so the smallest lawful mechanism is one ephemeral verification tenant prepared through those existing seams rather than mutation of canonical baseline tenants or expansion of permanent seed truth"
doctrine_constraints:
  - D-004: this unit is limited to activation-verification-state enablement only and must not widen into cleanup execution, seed redesign, onboarding redesign, CRM work, or broad environment tooling
  - D-007: no surface outside the exact allowlist is authorized
  - D-011: canonical baseline tenants remain Acme Corporation and White Label Co only unless a later bounded governance move explicitly changes that posture
  - D-013: this unit authorizes one repeatable enablement mechanism only; it does not authorize routine production mutation without a recorded close-gate purpose, owner, retention intent, and cleanup plan
decisions_required: []
blockers: []
---

## Unit Summary

`ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001` exists to make one approved-onboarding activation-eligible
verification path available on demand without expanding permanent seed truth and without relying on
stale shared-environment tenant residue.

The bounded target is a governed preparation mechanism that stops with one ephemeral tenant in
`VERIFICATION_APPROVED`, so a later control-plane close-readiness run can verify the existing
`activate-approved` deep-dive path lawfully.

## Source Truth

Current repo truth supporting this unit is:

- `server/prisma/seed.ts` permanently seeds only `Acme Corporation` and `White Label Co`
- `components/ControlPlane/TenantDetails.tsx` exposes the approval activation control only when the
  reviewed tenant onboarding status is `VERIFICATION_APPROVED`
- `server/src/routes/control.ts` already contains both onboarding outcome persistence and the
  bounded `activate-approved` mutation
- `server/src/routes/admin/tenantProvision.ts` plus `server/src/services/tenantProvision.service.ts`
  already support the approved-onboarding provisioning seam
- `PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md` treats approved activation as the one real
  lifecycle mutation inside the bounded launch lane

This unit is therefore not a request for new lifecycle semantics. It is a request to make the
already-existing state path intentionally available when a close gate requires it.

## Strategy Decision

Chosen strategy: **ephemeral verification tenant**.

Why this is the smallest lawful option:

1. mutating `Acme Corporation` or `White Label Co` would pollute canonical baseline truth and risk
   neighboring smoke/demo paths
2. repo truth already supports provisioning a tenant through the approved-onboarding seam and then
   recording an `APPROVED` onboarding outcome through the control-plane route
3. the mechanism can stop at `VERIFICATION_APPROVED` and leave the actual reviewed activation step
   to the later close-readiness run that requires it
4. this avoids adding a permanent third baseline tenant and avoids shared-environment residue as a
   dependency

## Acceptance Criteria

- [x] Strategy comparison from repo truth is resolved in favor of an ephemeral verification tenant
- [x] Permanent seed truth remains unchanged and limited to the canonical baseline pair
- [x] The mechanism uses existing provisioning and onboarding-outcome seams rather than redesigning
      them
- [x] The mechanism requires governance metadata: purpose, owner, close gate, retention intent,
      and cleanup plan
- [x] The mechanism stops at one lawful `VERIFICATION_APPROVED` path and does not auto-activate the
      tenant
- [x] Cleanup/rollback expectations are documented without executing cleanup in this unit

## Files Allowlisted (Modify)

This unit authorizes modification of these files only:

- `governance/units/ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001.md`
- `server/scripts/prepare-activation-verification-state.ts`
- `docs/ops/ACTIVATION-VERIFICATION-STATE-ENABLEMENT-001.md`

## Exact In-Scope Boundary

This unit authorizes only the following bounded work:

1. define the repeatable activation-verification-state mechanism for one ephemeral verification
   tenant
2. add one bounded operational helper that prepares a tenant through the approved-onboarding
   provisioning seam and records `APPROVED` onboarding outcome
3. document required governance trail fields and cleanup/rollback expectations
4. verify that the helper and runbook are sufficient to support one lawful
   `VERIFICATION_APPROVED` path

## Exact Out-of-Scope Boundary

This unit does **not** authorize:

- cleanup execution
- deletion of stale tenants
- modification of canonical seed tenants
- permanent third baseline tenant creation by default
- broad seed architecture redesign
- onboarding model redesign
- CRM integration work
- auth, routing, or platform redesign
- uncontrolled production mutation

## Exact Verification Profile

- verification type: operational enablement for one repeatable activation-eligible path
- required verification modes:
  - focused helper proof in non-mutating mode
  - static validation for the bounded helper surface
  - scope validation showing only allowlisted files changed
- required governance trail fields for future runs:
  - purpose
  - owner
  - target tenant name/slug
  - canonical or ephemeral classification
  - retention intent
  - cleanup or rollback plan
  - linkage to the bounded unit or close gate requiring the state
