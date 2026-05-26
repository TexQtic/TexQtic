# CONTROL-PLANE-MUTATION-ROLE-POLICY-DECISION-001

## 1) Status Header
- Unit: CONTROL-PLANE-MUTATION-ROLE-POLICY-DECISION-001
- Mode: DECISION_ONLY
- Scope: Main App control-plane mutation authorization policy lock
- Date: 2026-05-26
- Branch at decision lock: main
- Baseline decision authority:
  - FTR-FAM-001 verified complete at commit 6be1f93
  - FTR-FAM-001 TLRH checkpoint at commit 369bbe6
  - FTR-CP-001 opening audit commit at 83d140f
- Guardrails:
  - no implementation changes
  - no runtime behavior changes
  - no schema/DB changes
  - no CRM/CAE dependency work
  - no production admin password smoke

## 2) Source Artifacts Reviewed
- FTR-CP-001 opening audit artifact:
  - FTR-CP-001-CONTROL-PLANE-TENANT-OPERATIONS-OPENING-REPO-TRUTH-AUDIT.md
- Control-plane boundary authority:
  - docs/product-truth/PLATFORM-OPS-LAUNCH-BOUNDARY-ARTIFACT-v1.md
- Control-plane route and guard truth:
  - server/src/routes/control.ts
  - server/src/middleware/auth.ts
  - server/src/middleware/realmGuard.ts
- Control-plane service and frontend callers:
  - services/controlPlaneService.ts
  - components/ControlPlane/TenantDetails.tsx
  - components/ControlPlane/AdminRBAC.tsx
  - components/ControlPlane/FeatureFlags.tsx
  - components/ControlPlane/FinanceOps.tsx
  - components/ControlPlane/ComplianceQueue.tsx
  - components/ControlPlane/DisputeCases.tsx
- Test truth anchors:
  - server/src/__tests__/control-onboarding-outcome.integration.test.ts
  - server/src/__tests__/admin-rbac-registry-read.integration.test.ts
  - server/src/__tests__/admin-rbac-revoke-remove.integration.test.ts
  - server/src/__tests__/trades.g017.integration.test.ts
  - tests/adminrbac-registry-read-ui.test.tsx

## 3) Current Control-Plane Mutation Inventory

Direct mutating endpoints in server/src/routes/control.ts:
- POST /api/control/tenants/:id/onboarding/outcome
- POST /api/control/tenants/:id/onboarding/activate-approved
- POST /api/control/tenants/:id/archive
- PUT /api/control/feature-flags/:key
- POST /api/control/finance/records/:record_id/outcome
- POST /api/control/compliance/records/:certification_id/outcome
- DELETE /api/control/admin-access-registry/:id
- POST /api/control/finance/payouts/:payout_id/approve
- POST /api/control/finance/payouts/:payout_id/reject
- POST /api/control/compliance/requests/:request_id/approve
- POST /api/control/compliance/requests/:request_id/reject
- POST /api/control/disputes/:dispute_id/resolve
- POST /api/control/disputes/:dispute_id/escalate

Delegated control-plane mutation families registered from control.ts (handled in separate route modules):
- /api/control/escalations/* (includes mutation routes)
- /api/control/trades/* (includes transition mutation)
- /api/control/settlements/* (includes mutation routes)
- /api/control/ai/* (includes POST insights)
- /api/control/gst-verification/* (includes PATCH review)
- /api/control/ttp/eligibility/* (includes POST create)
- /api/control/invoices/* (includes PATCH transition)
- /api/control/vpc/* (includes POST/PATCH routes)
- /api/control/ttp/* (routing stubs, enrollments, score routes; includes PATCH enrollments)

Guard baseline:
- control.ts applies fastify.addHook('onRequest', adminAuthMiddleware)
- explicit SUPER_ADMIN prehandler used on several mutation routes
- inline SUPER_ADMIN role check used on admin-access-registry revoke/remove
- compliance/dispute request mutations rely on admin auth presence and adminId checks, without explicit SUPER_ADMIN prehandler in control.ts

## 4) Role Policy Matrix

| Endpoint / Operation | Current guard style | Current actor assumptions | Recommended required role | Policy classification | Test requirement | Implementation implication | CRM/CAE dependency status |
|---|---|---|---|---|---|---|---|
| POST /api/control/tenants/:id/onboarding/outcome | preHandler requireAdminRole('SUPER_ADMIN') | control-plane lifecycle authority action | SUPER_ADMIN | SUPER_ADMIN_ONLY | Keep/extend integration coverage for approved/rejected/conflict branches and non-superadmin denial | No role broadening; preserve explicit superadmin prehandler | NO |
| POST /api/control/tenants/:id/onboarding/activate-approved | preHandler requireAdminRole('SUPER_ADMIN') | explicit activation from approved state | SUPER_ADMIN | SUPER_ADMIN_ONLY | Add/retain integration tests for valid transition, invalid source state, already-active conflict, non-superadmin denial | No role broadening; preserve explicit superadmin prehandler | NO |
| POST /api/control/tenants/:id/archive | preHandler requireAdminRole('SUPER_ADMIN') | destructive lifecycle close action with protected-tenant blocks | SUPER_ADMIN | SUPER_ADMIN_ONLY | Keep/extend integration tests for protected targets, slug mismatch, already-closed conflict, non-superadmin denial | No role broadening; preserve explicit superadmin prehandler | NO |
| DELETE /api/control/admin-access-registry/:id | adminAuthMiddleware + inline role check (actorRole must be SUPER_ADMIN) + self/peer protections | only superadmin may revoke; self and peer superadmin protected | SUPER_ADMIN | SUPER_ADMIN_ONLY | Keep integration tests for actor-not-superadmin, self-revoke denied, peer-superadmin denied, success path + audit assertions | Normalize to explicit route-level role gate in hardening unit while preserving current denial semantics | NO |
| PUT /api/control/feature-flags/:key | preHandler requireAdminRole('SUPER_ADMIN') | platform-wide config mutation | SUPER_ADMIN | SUPER_ADMIN_ONLY | Add endpoint-level auth contract tests if missing | Preserve superadmin-only mutation contract | NO |
| POST /api/control/finance/records/:record_id/outcome | preHandler requireAdminRole('SUPER_ADMIN') | finance supervision casework authority | SUPER_ADMIN | OUT_OF_SCOPE_FOR_FTR_CP_001 | No new tests in this family; defer to finance/control-plane governance stream | No change in FTR-CP-001 hardening; preserve existing behavior | NO |
| POST /api/control/finance/payouts/:payout_id/approve + reject | preHandler requireAdminRole('SUPER_ADMIN') | finance authority intent write | SUPER_ADMIN | OUT_OF_SCOPE_FOR_FTR_CP_001 | No new tests in this family; defer to finance/control-plane governance stream | No change in FTR-CP-001 hardening; preserve existing behavior | NO |
| POST /api/control/compliance/records/:certification_id/outcome | preHandler requireAdminRole('SUPER_ADMIN') | compliance supervision casework authority | SUPER_ADMIN | OUT_OF_SCOPE_FOR_FTR_CP_001 | No new tests in this family; defer to compliance governance stream | No change in FTR-CP-001 hardening; preserve existing behavior | NO |
| POST /api/control/compliance/requests/:request_id/approve + reject | adminAuthMiddleware + adminId check only (no explicit superadmin prehandler) | broader admin actor currently possible in route shape | DECISION_GATED | DECISION_GATED | Add explicit actor-role contract tests before any role change | Excluded from FTR-CP-001 hardening; requires separate decision for compliance stream | NO |
| POST /api/control/disputes/:dispute_id/resolve + escalate | adminAuthMiddleware + adminId check only (no explicit superadmin prehandler) | broader admin actor currently possible in route shape | DECISION_GATED | DECISION_GATED | Add explicit actor-role contract tests before any role change | Excluded from FTR-CP-001 hardening; requires separate decision for dispute stream | NO |
| Delegated mutation families registered from control.ts (escalations/trades/settlements/ai/gst/ttp/invoices/vpc) | route registration comments indicate mixed read/write behavior; per-endpoint guards live in submodules | not authoritatively derivable from control.ts alone in this unit | DECISION_GATED | DECISION_GATED | Require per-family endpoint inventory + role matrix in dedicated unit before hardening | Explicitly not part of FTR-CP-001 tenant-operations hardening | NO |

Authoritative lock for this unit:
- In-scope FTR-CP-001 tenant-operations mutations are SUPER_ADMIN_ONLY.
- Compliance/dispute and other non-tenant-operations mutation families are not to be hardening-targeted under FTR-CP-001.
- Any role broadening proposal for non-tenant-op families requires separate governance opening.

## 5) Endpoint Families In Scope
- Tenant lifecycle mutation family under /api/control/tenants/*:
  - onboarding outcome recording
  - approved onboarding activation
  - archive/close
- Admin RBAC bounded mutation:
  - /api/control/admin-access-registry/:id revoke/remove
  - must preserve peer-superadmin protection, self-protection, and audit-denial/success signals

Reopen/reactivate path check in control.ts:
- No reopen/reactivate mutation endpoint found in this file.

Read-only context surfaces (not mutation hardening targets):
- GET /api/control/tenants
- GET /api/control/tenants/:id
- GET /api/control/audit-logs
- GET /api/control/events
- GET /api/control/admin-access-registry (read surface; mutation-adjacent context only)

## 6) Endpoint Families Out of Scope
Explicitly out of scope for FTR-CP-001 mutation-role hardening:
- Tenant-plane WL/domain CRUD and WL admin overlay behavior
- CRM approved-onboarding provisioning mediation/status behavior
- CAE/CRM evidence-feed and mediation paths
- Buyer bridge and live CRM provisioning smoke
- Public marketplace surfaces
- Supplier inquiry inbox and B2B/B2C/D2C authorized surface flows
- Non-tenant-ops control-plane mutation families:
  - finance mutation surfaces
  - compliance mutation surfaces
  - dispute mutation surfaces
  - delegated mutation families registered from control.ts outside tenant-ops lane

## 7) Test Gate Requirements
Before implementation hardening unit starts:
- Add or confirm endpoint-level authorization contract tests for all in-scope tenant-op mutations:
  - SUPER_ADMIN success
  - non-SUPER_ADMIN forbidden
  - existing lifecycle conflict invariants unchanged
- Add or confirm endpoint-level authorization contract tests for admin-access-registry revoke/remove:
  - actor-not-superadmin denied
  - self-revoke denied
  - peer-superadmin revoke denied
  - success path + refresh-token invalidation + audit entries
- Do not add hardening tests for out-of-scope mutation families in this unit.

## 8) Implementation Guardrails
- This document is a policy lock only; no runtime route or middleware edits are authorized here.
- Next implementation unit may touch only in-scope endpoint authorization hardening and its tests.
- No changes to provisioning mediation paths, CRM/CAE contracts, WL/domain overlay, or buyer bridge.
- Preserve current tenant list/detail/audit/events read behavior.
- Preserve existing denial reasons and audit semantics for admin RBAC revoke/remove.

## 9) Remaining Open Decisions
- Compliance/dispute mutation role model remains DECISION_GATED for a separate governance unit.
- Delegated control-plane mutation families registered from control.ts require separate per-family role-policy decisions.
- No open decision remains for in-scope FTR-CP-001 tenant-operations mutations: they are locked SUPER_ADMIN_ONLY.

## 10) Final Policy Decision
- READY_FOR_SUPERADMIN_AUTHORIZATION_CONTRACT_HARDENING

Decision basis:
- In-scope tenant-operations mutation lane is clear and bounded.
- Required role policy for that lane is now explicit and locked.
- Out-of-scope mutation families are explicitly excluded from this hardening unit.

## 11) Recommended Next Unit
- SUPERADMIN_AUTHORIZATION_CONTRACT_HARDENING

Bounded objective for next unit:
- enforce and normalize SUPER_ADMIN_ONLY authorization contract for in-scope FTR-CP-001 mutation endpoints
- preserve read surfaces and out-of-scope boundaries
- add/align authorization contract tests only for in-scope endpoints
