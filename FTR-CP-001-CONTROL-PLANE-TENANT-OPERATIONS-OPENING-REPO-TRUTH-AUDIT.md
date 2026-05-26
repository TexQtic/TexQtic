# FTR-CP-001-CONTROL-PLANE-TENANT-OPERATIONS-OPENING-REPO-TRUTH-AUDIT

## 1) Status Header
- Status: AUDIT_ONLY
- Repo: Main App (TexQtic)
- Branch: main
- HEAD: f4a9807
- Mode lock: no implementation, no runtime behavior change, no schema/DB change, no CRM/CAE calls, no production password smoke
- Date: 2026-05-26

## 2) Authority and Context
- FTR-FAM-001 is VERIFIED_COMPLETE at commit 6be1f93.
- Main App repo truth is primary authority for this unit.
- CRM and CAE workstreams remain independent and pending outside this unit.
- This unit is scoped to Main App control-plane tenant operations only.

## 3) Files and Areas Audited

| Area | Files/paths inspected | Reason | Notes |
|---|---|---|---|
| FTR family and launch tracker authority | governance/launch-readiness/FUTURE-TODO-REGISTER.md, governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md, governance/launch-readiness/MISSING-FAMILY-AND-FEATURE-SCAN.md, FTR-FAM-001-AUTH-SESSION-VERIFY-CLOSE-001.md | Confirm FTR-FAM-001 closure and FTR-CP-001 opening context | FTR-CP-001 already registered as implementation-ready but not yet opened |
| Platform-ops boundary contract | docs/product-truth/PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md | Validate bounded scope and non-goals for control-plane tenant ops | Boundary already defines bounded tenant registry/detail/activation/impersonation/audit lane |
| API entrypoint and realm wiring | api/index.ts, server/src/middleware/auth.ts, server/src/middleware/realmGuard.ts | Verify admin/tenant realm separation and route registration | Control plane under /api/control with admin JWT namespace and realm guards |
| Control-plane backend routes | server/src/routes/control.ts, server/src/routes/admin/tenantProvision.ts | Determine list/detail/lifecycle/membership/admin/audit/event operations and auth gates | Mix of SUPER_ADMIN-gated and admin-auth-only mutating endpoints |
| Tenant/domain route boundaries | server/src/routes/tenant.ts, server/src/routes/internal/resolveDomain.ts | Check white-label/custom-domain ownership boundary | Domain CRUD is tenant-plane; resolver is internal edge route, not control-plane UI lane |
| Control-plane frontend shell and views | layouts/SuperAdminShell.tsx, runtime/sessionRuntimeDescriptor.ts, App.tsx | Confirm control-plane navigation, route keys, and rendered tenant ops surfaces | Tenant registry/detail, audit logs, RBAC, events and other ops surfaces wired |
| Control-plane components | components/ControlPlane/TenantRegistry.tsx, components/ControlPlane/TenantDetails.tsx, components/ControlPlane/AdminRBAC.tsx, components/ControlPlane/AuditLogs.tsx, components/ControlPlane/EventStream.tsx | Classify read/write behavior and identify placeholders/partial seams | TenantDetails exposes bounded lifecycle controls; partial tabs explicitly declared |
| White-label admin UI surface | components/WhiteLabelAdmin/WLDomainsPanel.tsx | Determine whether WL domain ops are control-plane or tenant overlay | WL domains are WL_ADMIN tenant overlay, not control-plane admin surface |
| Service contracts | services/controlPlaneService.ts, services/tenantService.ts | Identify source-of-truth client contracts used by App and control-plane views | Control-plane service includes tenant provision, lifecycle, RBAC revoke, impersonation |
| Test coverage | server/src/__tests__/control-onboarding-outcome.integration.test.ts, server/src/__tests__/admin-rbac-registry-read.integration.test.ts, server/src/__tests__/admin-rbac-revoke-remove.integration.test.ts, server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts, tests/adminrbac-registry-read-ui.test.tsx, tests/session-runtime-descriptor.test.ts | Establish what control-plane tenant operations are currently tested | Core backend lifecycle/RBAC tests exist; limited direct UI tests for tenant registry/detail actions |

## 4) Control Plane Tenant Operations Architecture Snapshot
- Control-plane routes:
  - Registered at /api/control in api/index.ts through controlRoutes plus admin/tenantProvision and admin/impersonation plugins.
  - Core tenant ops routes in server/src/routes/control.ts include:
    - GET /tenants, GET /tenants/:id
    - POST /tenants/:id/onboarding/outcome
    - POST /tenants/:id/onboarding/activate-approved
    - POST /tenants/:id/archive
    - GET /audit-logs, GET /events
    - GET + DELETE /admin-access-registry
- Admin/superadmin authorization:
  - All control routes inherit adminAuthMiddleware via fastify.addHook('onRequest', adminAuthMiddleware).
  - Some mutating endpoints require SUPER_ADMIN preHandler explicitly.
  - Some mutating endpoints rely on admin-auth presence or inline role checks without uniform SUPER_ADMIN preHandler usage.
- Tenant listing/detail:
  - Backend list/detail reads include tenant identity plus organization-derived category/capability fields.
  - Detail route includes memberships (with user id/email), domains, branding, and aiBudget.
  - Frontend TenantRegistry and TenantDetails are wired through control-plane runtime route manifest.
- Tenant lifecycle operations:
  - Implemented bounded mutations are onboarding outcome recording, approved activation, and archive to CLOSED.
  - TenantDetails explicitly states other lifecycle actions are unavailable in this surface.
- Organization/member visibility from control-plane:
  - Tenant detail includes membership/user visibility and org-backed onboarding status.
  - No broad separate control-plane organization/member management suite observed in this audit slice.
- Tenant capability/plan/subscription controls:
  - Capability and commercial-plan carriers are surfaced in read models.
  - Feature flag management exists.
  - No dedicated subscription/billing control-plane contract surfaced in this family slice.
- White-label/domain controls:
  - Domain CRUD for tenant domains is implemented under tenant-plane routes (/api/tenant/domains) and WL_ADMIN UI overlay.
  - Internal resolver route (/api/internal/resolve-domain) is edge machine-to-machine, outside control-plane tenant ops UI lane.
- Audit/log/event surfaces:
  - Control-plane exposes audit logs and event stream read surfaces, both wired to frontend components.
  - Admin-access-registry read/revoke is implemented and audited.
- Protected shell/control-plane entry behavior:
  - CONTROL_PLANE manifest and SuperAdminShell route keys are explicit and bounded.
  - App bootstrap gates control-plane rendering behind realm/auth checks and runtime descriptor validity.

## 5) Boundary and Guardrail Findings

| Boundary | Current behavior | Status | Evidence | Notes |
|---|---|---|---|---|
| Control-plane/tenant realm separation | Separate tenant/admin JWT namespaces and route realm mapping; wrong-realm enforcement present | CONFIRMED_REPO_TRUTH | api/index.ts, server/src/middleware/auth.ts, server/src/middleware/realmGuard.ts | Consistent with FTR-FAM-001 verified close posture |
| Control-plane entry bounded to control shell | CONTROL_PLANE manifest uses SuperAdminShell and control-plane route group | CONFIRMED_REPO_TRUTH | runtime/sessionRuntimeDescriptor.ts, layouts/SuperAdminShell.tsx, App.tsx | Route-key-driven shell routing present |
| Tenant registry/detail operator lane exists | Active/invited/closed registry + detail views are wired and data-backed | CONFIRMED_REPO_TRUTH | server/src/routes/control.ts, components/ControlPlane/TenantRegistry.tsx, components/ControlPlane/TenantDetails.tsx | Matches platform-ops boundary artifact in-boundary set |
| Lifecycle mutations are bounded | Outcome, approved activation, and archive exist; other lifecycle actions explicitly unavailable | CONFIRMED_REPO_TRUTH | server/src/routes/control.ts, components/ControlPlane/TenantDetails.tsx | Broad lifecycle suite intentionally not exposed |
| SUPER_ADMIN enforcement consistency on mutating control routes | Mixed pattern: some mutations use requireAdminRole('SUPER_ADMIN'); others rely on admin-auth or inline checks | POSSIBLE_GAP | server/src/routes/control.ts | Needs explicit policy decision for target endpoints |
| Control-plane admin registry boundaries | SUPER_ADMIN-only read; revoke/remove blocks self and peer superadmin, audits denial/success | CONFIRMED_REPO_TRUTH | server/src/routes/control.ts, server/src/__tests__/admin-rbac-*.integration.test.ts | Strongly bounded compared to other mutation surfaces |
| White-label domain operations in this family | Domain CRUD is tenant/WL_ADMIN scoped, not control-plane tenant ops | OUT_OF_SCOPE | server/src/routes/tenant.ts, components/WhiteLabelAdmin/WLDomainsPanel.tsx | Keep out of FTR-CP-001 implementation unless scope expanded |
| CRM-approved onboarding provisioning overlap | /api/control/tenants/provision and /provision/status include approved-onboarding service-token path and CRM-safe polling intent | BLOCKED_BY_PENDING_CRM_CAE_AUDITS | server/src/routes/admin/tenantProvision.ts | Implementation touching cross-repo mediation path should remain gated |
| Production admin smoke with passwords | Not performed in this unit | BLOCKED_BY_SECURITY_GUARDRAIL | audit mode + command history | Guardrail preserved |

## 6) Gaps and Risks

| Finding | Classification | File/location | Impact | Recommended next action |
|---|---|---|---|---|
| Mutating route authorization style is not uniform across control-plane endpoints | NEEDS_DECISION | server/src/routes/control.ts | Ambiguous authorization contract and review burden for high-risk mutations | Define explicit policy matrix per mutation family, then harden route guards |
| Some control-plane mutation endpoints use only admin-auth presence without explicit SUPER_ADMIN preHandler | POSSIBLE_GAP | server/src/routes/control.ts (/compliance/requests/*, /disputes/*) | Potential policy drift versus strongly bounded lifecycle and RBAC surfaces | Validate intended actor roles, then apply consistent guard strategy |
| Tenant detail tabs beyond core overview/lifecycle are partially surfaced but explicitly limited | CONFIRMED_GAP | components/ControlPlane/TenantDetails.tsx | Operators may over-assume readiness of billing/risk/deep governance controls | Preserve explicit limited labels; defer expansion to dedicated units |
| Control-plane includes many non-tenant-op surfaces under same shell | NEEDS_DECISION | runtime/sessionRuntimeDescriptor.ts, layouts/SuperAdminShell.tsx | Scope creep risk if FTR-CP-001 implementation prompt is not bounded | Keep next unit narrow to tenant list/detail + authz contract only |
| White-label/domain admin controls are not in control-plane family lane | OUT_OF_SCOPE | components/WhiteLabelAdmin/WLDomainsPanel.tsx, server/src/routes/tenant.ts | Mixing WL tenant overlay work would violate unit boundary | Keep WL/domain work in separate WL admin/domain units |
| Provisioning status CRM-safe polling path exists in control API plugin | BLOCKED_BY_PENDING_CRM_CAE_AUDITS | server/src/routes/admin/tenantProvision.ts | Cross-repo behavior assumptions may leak into control-plane work | Do not widen into CRM/CAE dependency work in FTR-CP-001 implementation |
| Placeholder/archived control-plane panels still present in control-plane component set | CONFIRMED_GAP | components/ControlPlane/ApiDocs.tsx, components/ControlPlane/ArchitectureBlueprints.tsx | UI surface contains non-operational legacy placeholders | Exclude from next implementation family; handle via separate cleanup governance if needed |

## 7) Test Coverage Snapshot

| Area | Existing tests found | Missing tests | Recommended test gate |
|---|---|---|---|
| Control tenant list/detail read contracts | server/src/__tests__/control-onboarding-outcome.integration.test.ts (list/detail assertions) | Frontend component tests for TenantRegistry/TenantDetails data rendering and error states | Add focused frontend tests for registry/detail behavior before UI hardening |
| Lifecycle mutations (outcome, activation, archive) | server/src/__tests__/control-onboarding-outcome.integration.test.ts | Explicit integration coverage for every conflict branch and actor-role matrix in one place | Expand backend mutation matrix tests for role/policy edge-cases |
| Admin registry read/revoke boundaries | server/src/__tests__/admin-rbac-registry-read.integration.test.ts, server/src/__tests__/admin-rbac-revoke-remove.integration.test.ts, tests/adminrbac-registry-read-ui.test.tsx | UI-level interaction tests for revoke dialog workflow beyond static rendering | Keep existing backend integration gates; add UI interaction tests when touching RBAC UX |
| Tenant provision and status polling | server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts | Explicit isolation test ensuring FTR-CP units do not widen CRM coupling | Keep provisioning tests isolated from FTR-CP implementation scope |
| Control-plane route manifest/navigation | tests/session-runtime-descriptor.test.ts | Direct control-plane shell route availability regression tests for tenant-op subset | Add manifest subset guard tests in next implementation if route set changes |
| Authorization consistency across mutating endpoints | Partial via route-specific tests | No single matrix test guaranteeing role policy uniformity across all mutation routes | Add contract tests for per-endpoint required role policy once policy decision is made |

## 8) Dependency and Blocker Matrix

| Potential next work | Depends on CRM/CAE audit? YES/NO | Depends on Paresh decision? YES/NO | Notes |
|---|---|---|---|
| Tighten tenant list/detail contracts only | NO | NO | Can proceed within Main App scope |
| Harden lifecycle endpoint authz contracts | NO | YES | Requires explicit policy on SUPER_ADMIN vs broader admin for each mutation |
| Expand control-plane organization/member management depth | NO | YES | Scope expansion decision needed |
| Touch approved-onboarding service-token provisioning flows | YES | YES | Cross-repo mediation path; keep out of this family for now |
| Add WL domain control-plane operations | NO | YES | Currently tenant/WL_ADMIN scoped; would require deliberate family boundary change |

## 9) Recommended Next Implementation Family
- Recommended: NEEDS_DECISION_BEFORE_IMPLEMENTATION

Rationale:
- Repo truth confirms a real bounded tenant-ops lane exists.
- The highest-risk near-term seam is authorization consistency across mutating control-plane routes.
- A short policy decision is required before code hardening so changes remain constitutional and non-regressive.

## 10) Proposed Next Prompt Outline
Smallest safe next prompt (implementation-ready only after policy choice):

- Unit: SUPERADMIN_AUTHORIZATION_CONTRACT_HARDENING
- Mode: bounded implementation (no schema/DB changes, no CRM/CAE coupling)
- Scope:
  - Define and enforce explicit required role per mutating /api/control endpoint in server/src/routes/control.ts.
  - Keep tenant list/detail read contracts unchanged.
  - Preserve existing behavior for already bounded admin registry revoke protections.
- Include:
  - Role-policy table in prompt (endpoint -> required role).
  - Contract tests for each changed endpoint authorization branch.
  - No changes to App.tsx routing model, no white-label/domain runtime changes.

If policy is not yet approved, run a decision-only unit first:
- Unit: CONTROL_PLANE_MUTATION_ROLE_POLICY_DECISION
- Output: authoritative endpoint role matrix only.

## 11) Non-Goals Confirmed
- no implementation performed
- no runtime files changed
- no schema/DB files changed
- no CRM/CAE calls made
- no production admin/password smoke performed
- no buyer bridge activation
- no CRM provisioning activation
- no white-label/custom-domain runtime change

## 12) Completion Checklist
- [x] Current branch and HEAD confirmed.
- [x] Working tree state confirmed before audit.
- [x] FTR-FAM-001 verified-close state confirmed.
- [x] Control-plane docs and governance notes searched.
- [x] Control-plane implementation surfaces searched.
- [x] Admin/superadmin authorization surfaces searched.
- [x] Tenant lifecycle/list/detail surfaces searched.
- [x] Org/member visibility surfaces searched.
- [x] Capability/plan/subscription surfaces searched.
- [x] White-label/domain/custom-domain surfaces searched.
- [x] Test coverage reviewed.
- [x] CRM/CAE dependency avoided.
- [x] No implementation files changed.
- [x] No schema/DB files changed.
- [x] No secrets/env changes.
- [x] No production admin/password smoke performed.
- [x] Final next-family recommendation provided.
- [ ] One atomic audit/governance commit created only if audit artifact or tracker file changed.
