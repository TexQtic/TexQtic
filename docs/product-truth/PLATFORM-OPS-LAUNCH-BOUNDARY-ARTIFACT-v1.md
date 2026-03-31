# PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1

## 1. Purpose

This artifact exists to define the bounded launch truth for platform operations before any future
eligibility review considers opening `CONTROL-PLANE-TENANT-OPERATIONS-REALITY`.

It resolves the previously missing boundary-definition prerequisite recorded in the launch overlay
and execution-eligibility stack. It does not open a unit, does not authorize implementation, and
does not convert broad control-plane presence into launch-ready operator depth by implication.

## 2. Governing Context

- Layer 0 remains `OPERATOR_DECISION_REQUIRED`; no product-facing `ACTIVE_DELIVERY` is open.
- `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains a preserved later-ready family in the broad
  `-v2` stack, but it was not lawfully openable while the platform-ops launch boundary remained
  undefined.
- The launch-overlay eligibility review identified this artifact as a prerequisite because broad
  `READY_FOR_OPENING` language was too permissive for the platform-admin/control-center lane.
- The launch-planning split placed platform-admin/control-center work in a normalization-first lane
  rather than direct implementation sequencing.
- This artifact therefore serves one narrow governance function: define what “platform-ops launch
  boundary” actually means so a later eligibility review can judge the lane against a fixed,
  bounded standard.

## 3. Launch Boundary Definition

Inside the platform-ops launch boundary are only the bounded control-plane tenant operations needed
to truthfully support day-1 launch supervision of tenant existence, onboarding outcome handling,
bounded tenant entry, and operator audit visibility.

Inside this boundary means:

1. cross-tenant tenant discovery and selection
2. tenant identity and onboarding-state inspection
3. approved-onboarding activation from the control plane when the reviewed tenant is already in an
   activation-eligible state
4. bounded impersonation entry into a reviewed tenant context
5. read-only audit visibility for platform-level administrative actions

This boundary is intentionally narrower than “all control-plane capabilities.” It defines a bounded
launch operator lane, not a full admin platform promise.

## 4. In-Boundary Surfaces

The following surfaces are in boundary for launch assessment of the platform-ops lane:

| Surface | Why It Is In Boundary | Primary Repo Anchor |
| --- | --- | --- |
| Control-plane shell entry and tenant-ops navigation | Establishes the bounded operator workspace that hosts tenant operations | `layouts/SuperAdminShell.tsx` |
| Tenant registry | Cross-tenant list, selection, and provisioning entry are the control-plane starting point for tenant operations | `components/ControlPlane/TenantRegistry.tsx` |
| Tenant deep-dive overview | Launch operators need a truthful tenant identity and onboarding-state inspection surface | `components/ControlPlane/TenantDetails.tsx` |
| Approved-onboarding activation | This is the one clearly wired lifecycle action inside the tenant deep-dive today | `components/ControlPlane/TenantDetails.tsx` |
| Bounded tenant impersonation entry | Operators need a reviewed handoff into tenant context, but only as a bounded entry surface | `components/ControlPlane/TenantDetails.tsx` |
| Platform audit visibility | Launch operators need read-only visibility into platform actions and tenant-affecting admin events | `components/ControlPlane/AuditLogs.tsx` |

## 5. Out-of-Boundary Surfaces

The following surfaces are explicitly outside this artifact’s lane and must stay excluded from any
future opening justified by this artifact:

- finance, escrow, settlement, or fee-supervision redesign
- disputes, escalations, compliance casework, and certification administration
- trade oversight, cart summaries, traceability, AI governance, event-stream, or health-console work
- RBAC redesign, invite/revoke authority redesign, or any work governed by `TECS-FBW-ADMINRBAC`
- broad tenant lifecycle redesign beyond the already-wired approved-activation path
- billing-statement generation, risk-report generation, or any claim that billing/risk tabs are
  fully operational today
- deep tenant-admin authority completion, shell modernization, routing/auth redesign, or architecture changes
- any attempt to merge this lane with B2C storefront continuity, Aggregator scope truth, RFQ work,
  or investigation-only adjacent findings

## 6. Current Repo-Truth Posture

| In-Boundary Surface | Current Posture | Repo-Truth Basis | Launch Meaning |
| --- | --- | --- | --- |
| Control-plane shell entry and bounded tenant-ops navigation | real and usable | `SuperAdminShell` exposes a real control-plane shell with dedicated tenant/governance navigation | Valid as the host workspace for platform-ops launch assessment |
| Tenant registry | real and usable | `TenantRegistry` fetches tenants, renders actual stats, supports selection, and exposes a provisioning flow | This is a valid in-boundary launch surface |
| Tenant deep-dive overview | partial | `TenantDetails` shows real identity/onboarding inspection, but the deeper tab set is mixed and not uniformly real | Can support bounded inspection, but not broad tenant-ops completion claims |
| Approved-onboarding activation | real and usable | `TenantDetails` wires `activateApprovedOnboarding()` behind an eligibility check | This is the only lifecycle mutation currently inside the bounded launch promise |
| Tenant impersonation entry | partial | Tenant detail exposes an impersonation entry point, but this artifact does not treat all impersonation lifecycle concerns as part of this lane | Entry is in boundary; full impersonation program claims remain outside this artifact |
| Billing tab inside tenant deep-dive | stubbed / under construction | `Generate Statement` is present without bounded repo truth that it is a real statement workflow; values are presented as static dashboard content | Must remain outside the launch promise for this lane |
| Risk tab inside tenant deep-dive | partial | Risk score and `View Risk Report` are presented, but no bounded report workflow is evidenced in the reviewed tenant deep-dive surface | May be visible, but must not be treated as a launch-cleared operator capability |
| Plan / Features / Audit tabs inside tenant deep-dive | stubbed / under construction | non-overview tabs fall through to `Detailed view ... under construction` | These tabs are explicitly outside launch-ready tenant-ops depth |
| Platform audit logs | partial | `AuditLogs` loads real log data, but search and filter controls are disabled | Read-only visibility is real; advanced operator workflow depth is not yet part of the launch claim |

## 7. Launch-Critical Capability Checklist

Future consideration of `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` must stay bounded to the
following minimum capability set:

- a control-plane operator can enter the dedicated control-plane shell and reach the tenant registry
- tenant registry truthfully lists tenants and allows drill-in to a tenant detail surface
- tenant detail truthfully shows tenant identity and onboarding state without overclaiming deeper tab completion
- approved-onboarding activation works only for activation-eligible tenants and is not conflated with a broad lifecycle-management suite
- bounded impersonation entry is clearly available as an operator handoff, not as a proxy for full tenant-admin authority completion
- platform audit visibility exists in read-only form for relevant admin actions
- non-real, static, or under-construction tenant deep-dive controls remain explicitly outside the claimed launch-critical lane

If any future unit needs more than this checklist, that work belongs to a broader or separate
control-plane stream and must not be justified through this artifact.

## 8. Evidence Standard

Later eligibility review must require all three evidence classes below before treating the platform-ops lane as executable.

### Repo-Truth

- file-level confirmation that the in-boundary surfaces remain wired as described here
- explicit confirmation that lifecycle, billing, risk, and tab-depth claims are not wider than current handlers support
- confirmation that excluded control-plane domains remain separate and are not being pulled into the tenant-ops lane

### UX-Truth

- a bounded operator walkthrough from control-plane entry to tenant registry, tenant detail, approved activation, and audit visibility
- proof that the reviewed flow communicates real versus partial versus under-construction depth truthfully
- proof that the lane can be explained as bounded launch supervision rather than general platform-admin completion

### Runtime-Truth

- bounded verification that tenant registry loads real tenants
- bounded verification that tenant detail loads reviewed tenant identity/onboarding state
- bounded verification that approved-onboarding activation succeeds for an eligible reviewed tenant
- bounded verification that audit logs render real data after platform actions
- if impersonation remains inside the candidate opening, bounded verification of the reviewed impersonation entry/handoff path without widening into broader impersonation redesign

## 9. Risks of Premature Opening

Opening `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` before respecting this boundary would be a
governance error because it would:

- treat broad control-plane presence as evidence of broad operator readiness
- collapse real registry/activation surfaces together with thin tenant deep-dive tabs and static billing/risk presentation
- blur this bounded lane into finance, compliance, disputes, RBAC, or broad admin redesign streams
- create false launch claims around tenant lifecycle depth that repo truth does not currently support
- weaken the separation between a bounded launch operator subset and the much larger control-plane backlog

## 10. Recommendation

This artifact resolves the specific missing boundary-definition prerequisite that previously blocked
future consideration of `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` under the launch overlay.

It does not clear execution by itself.

The next lawful governance move after this artifact is a fresh bounded eligibility reconciliation
for `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` against:

1. current Layer 0 posture
2. this platform-ops launch boundary
3. the preserved `-v2` ordering
4. the separate `TECS-FBW-ADMINRBAC` design-gate constraint

Only after that later reconciliation should any opening candidate be considered.