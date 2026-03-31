# GOV-DEC-CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS-OPENING

Decision ID: GOV-DEC-CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS-OPENING
Title: Decide and open one bounded ACTIVE_DELIVERY unit for control-plane tenant deep-dive truthfulness
Status: DECIDED
Date: 2026-03-31
Authorized by: Paresh

## Context

TexQtic's current authoritative governance state records that:

- `NEXT-ACTION` is `OPERATOR_DECISION_REQUIRED`
- no `ACTIVE_DELIVERY` unit is currently `OPEN`
- the broad family `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains first in preserved `-v2`
  ordering, but was previously found too wide to open directly
- `PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md` now exists and is controlling for this lane
- `TECS-FBW-ADMINRBAC` remains a separate `DESIGN_GATE` and must not be absorbed into any platform-
  ops opening

Current repo truth supports a narrower surviving defect shape:

- `layouts/SuperAdminShell.tsx` provides a materially real control-plane shell and tenant entry
- `components/ControlPlane/TenantRegistry.tsx` provides materially real tenant list, selection, and
  provisioning entry
- `components/ControlPlane/TenantDetails.tsx` provides a real overview and approved-onboarding
  activation path, but also exposes thin or under-construction deep tabs and adjacent signals that
  risk overclaiming lifecycle, billing, risk, and admin-operational depth
- `components/ControlPlane/AuditLogs.tsx` is materially real in read-only form, but its disabled
  search/filter depth confirms that broader control-plane depth should remain separate from the
  tenant deep-dive candidate

This means the truthful current candidate is not the broad family `CONTROL-PLANE-TENANT-
OPERATIONS-REALITY` as one umbrella opening. The truthful bounded candidate is tenant deep-dive
truthfulness only.

## Problem Statement

Layer 0 currently has no compelled successor `ACTIVE_DELIVERY` unit.

Without one fresh bounded opening now, TexQtic would either remain stalled at
`OPERATOR_DECISION_REQUIRED` despite a concrete control-plane launch-readiness defect, or risk
opening an over-broad platform-ops family that mixes real registry/shell surfaces with thin tenant
deep-dive tabs, billing/risk overclaim, impersonation-program breadth, audit-log depth work, and
separate AdminRBAC authority concerns.

The smallest truthful next move is therefore one separate bounded decision and opening for control-
plane tenant deep-dive truthfulness only.

## Required Determinations

### 1. Is the broad family exact enough to open as-is?

No.

`CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains too wide because it would collapse:

- real tenant registry and shell entry
- tenant deep-dive truthfulness
- audit-log depth
- impersonation-program breadth
- billing and risk workflow completion
- separate `TECS-FBW-ADMINRBAC` authority work

into one control-plane umbrella stream.

### 2. Is there one narrower surviving candidate now clean enough to open?

Yes.

The exact bounded candidate is `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS`.

### 3. Is the narrower candidate separable from AdminRBAC and other neighbors?

Yes.

Repo and governance truth support keeping this unit separate from:

- registry redesign or provisioning redesign
- audit-log search/filter completion
- full impersonation lifecycle or impersonation redesign
- billing workflow completion
- risk-report workflow completion
- `TECS-FBW-ADMINRBAC` invite/revoke/role-partition work

### 4. What exact scope is now authorized?

Exactly one bounded `ACTIVE_DELIVERY` unit:

- unit id: `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS`
- title: `Control-plane tenant deep-dive truthfulness`
- type: `ACTIVE_DELIVERY`
- status: `OPEN`
- delivery class: `ACTIVE_DELIVERY`

## Decision

`GOV-DEC-CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS-OPENING` is now `DECIDED`.

The authoritative decision is:

1. TexQtic authorizes one separate bounded `ACTIVE_DELIVERY` unit to remediate tenant deep-dive
   truthfulness only
2. this is now the sole authorized next product-facing `ACTIVE_DELIVERY` unit
3. this decision explicitly rejects opening the broader `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`
   family directly because the real defect is narrower than the family label
4. this decision does not authorize registry redesign, audit-log depth work, impersonation-program
   breadth, billing/risk workflow completion, or `TECS-FBW-ADMINRBAC` work
5. all future implementation must stay as narrow as possible and use exact repo-relative
   allowlists only

## Opening

The following unit is now opened:

- `CONTROL-PLANE-TENANT-DEEP-DIVE-TRUTHFULNESS`
- Title: `Control-plane tenant deep-dive truthfulness`
- Type: `ACTIVE_DELIVERY`
- Status: `OPEN`
- Delivery Class: `ACTIVE_DELIVERY`

Reason:

- it is a concrete launch-readiness defect on a reviewed control-plane runtime surface
- it is exact, bounded, and implementation-worthy
- it preserves the platform-ops boundary artifact and avoids conflating tenant deep-dive truth with
  broader control-plane modernization or AdminRBAC authority work

## Exact Future Implementation Boundary

This opening authorizes only the following bounded work:

1. inspect and remediate the existing tenant deep-dive surface in
   `components/ControlPlane/TenantDetails.tsx`
2. make overview and approved-onboarding activation truthfulness explicit and preserve their
   bounded real behavior
3. truthfully handle, hide, gate, relabel, or de-emphasize non-real deep tabs and adjacent
   billing/risk/lifecycle signals that overclaim operational depth
4. validate neighbor-path continuity for control-plane entry and tenant selection without widening
   implementation into those neighboring surfaces

## Exact Out-of-Scope Boundary

This opening explicitly forbids:

- registry redesign or broad registry completion
- audit-log search/filter completion
- full impersonation lifecycle work or impersonation redesign
- billing workflow completion or statement-generation work
- risk-report workflow completion
- plan/features/admin-depth completion beyond truthful handling in the tenant deep-dive
- `TECS-FBW-ADMINRBAC` invite/revoke/role-partition work or broader admin-authority redesign
- shell, routing, auth, DB, architecture, or broad control-plane redesign

## Sequence Discipline

The required sequence remains:

Decision -> Opening -> Implementation -> Verification -> Governance Sync -> Close

This record completes the decision and opening only.