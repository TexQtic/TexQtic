# FAM-07K7-CONTROL-PLANE-TENANT-ARCHIVE-POST-ACTION-ERRORBOUNDARY-HARDENING-DESIGN-001

## 1) Unit ID and Mode
- Unit: FAM-07K7-CONTROL-PLANE-TENANT-ARCHIVE-POST-ACTION-ERRORBOUNDARY-HARDENING-DESIGN-001
- Mode: TECS Safe-Write audit / repo-truth investigation / bounded design
- Scope: Diagnose post-archive ErrorBoundary crash and produce bounded implementation plan only
- Date: 2026-05-31

## 2) Branch and HEAD
- Branch: main
- HEAD at unit start: 088ae376

## 3) Preflight Results
- git status --short: clean (no output)
- git diff --name-only: clean (no output)
- git rev-parse --short HEAD: 088ae376
- lineage checks (merge-base --is-ancestor):
  - 4974ac47: yes (exit 0)
  - 297316ef: yes (exit 0)
  - 4699fe13: yes (exit 0)
  - 745cf83d: yes (exit 0)
  - c755655f: yes (exit 0)
  - cf1e1a02: yes (exit 0)
  - 088ae376: yes (exit 0)
- working tree clean before audit: confirmed

## 4) K5/K6 Lineage Summary
- K5: FAM-07K5-CONTROL-PLANE-PROVISION-FORM-SAFE-SUBMIT-RUNTIME-VERIFY-001
  - commit: cf1e1a02
  - enum: FAM_07K5_PROVISION_FORM_SAFE_SUBMIT_RUNTIME_VERIFY_CONFIRMED
  - truth: one QA tenant created by runtime submit.
- K6: FAM-07K6-CONTROL-PLANE-PROVISION-FORM-QA-TENANT-CLEANUP-VERIFY-001
  - commit: 088ae376
  - truth: exact K5 tenant archived (HTTP 200); slug moved Active -> Closed.
  - adjacent defect observed: post-archive ErrorBoundary crash with `Cannot read properties of undefined (reading 'toUpperCase')`.

## 5) K6 Defect Summary
- Defect timing: immediately after successful archive action in Tenant Detail.
- API result: archive endpoint success (200) was already confirmed in K6.
- UI result: app crashed into ErrorBoundary before stable post-action status banner/state could be rendered.
- Crash string: `Cannot read properties of undefined (reading 'toUpperCase')`.

## 6) `.toUpperCase()` Usage Map (Control Plane Tenant Paths)
Repo-truth map across tenant registry/detail/archive-adjacent surfaces:

- components/ControlPlane/TenantRegistry.tsx:29
  - `(tenantCategory ?? fallbackType ?? '').trim().toUpperCase()`
  - guarded by `?? ''`.
- components/ControlPlane/TenantRegistry.tsx:247
  - `tenant.status?.toUpperCase()`
  - optional chain guarded.
- components/ControlPlane/TenantRegistry.tsx:287
  - `status.toUpperCase()` in `getStatusColor(status: string)`
  - no guard inside helper.
- components/ControlPlane/TenantRegistry.tsx:306,309,313,316,373
  - `t.status?.toUpperCase()` and `tenant.status?.toUpperCase()`
  - optional chain guarded.
- components/ControlPlane/TenantDetails.tsx:41
  - `(tenantCategory ?? fallbackType ?? '').trim().toUpperCase()`
  - guarded by `?? ''`.
- components/ControlPlane/TenantDetails.tsx:852
  - `tenant.name.trim().toUpperCase()`
  - no optional chain.
- components/ControlPlane/ControlPlaneOrgMemberSummary.tsx:105
  - `membership.status.toUpperCase() === 'ACTIVE'`
  - unguarded access on `membership.status`.
  - this line is inside `memberships.map(...)` render path.

Most probable failing site for K6 stack signature (`Array.map` + `toUpperCase`) is:
- components/ControlPlane/ControlPlaneOrgMemberSummary.tsx:105

## 7) Archive Action Flow Trace (Repo Truth)
1. UI trigger:
- components/ControlPlane/TenantDetails.tsx:269
  - `handleArchiveTenant()` called by Archive button.

2. Service/API call:
- components/ControlPlane/TenantDetails.tsx:277
  - calls `archiveTenant(tenant.id, { expectedSlug, reason })`.
- services/controlPlaneService.ts:188-192
  - `archiveTenant()` -> POST `/api/control/tenants/:id/archive`.

3. Backend archive response shape:
- server/src/routes/control.ts:838 onwards
  - archive endpoint sets org + tenant statuses to CLOSED.
- server/src/routes/control.ts:975 onwards
  - returns `tenant: { id, slug, name, status, onboarding_status }`.

4. Local state update after archive:
- components/ControlPlane/TenantDetails.tsx:282-288
  - `setTenantStatus(CLOSED)`
  - `setOnboardingStatus(response.tenant.onboarding_status ?? 'CLOSED')`
  - set archive notice.

5. Detail refresh / memberships read path:
- components/ControlPlane/TenantDetails.tsx:124-151
  - `useEffect` calls `getTenantById(tenant.id)` and stores `response?.tenant?.memberships ?? []` in `membershipsData`.

6. Membership rendering path:
- components/ControlPlane/TenantDetails.tsx:634
  - renders `<ControlPlaneOrgMemberSummary memberships={membershipsData} .../>`.
- components/ControlPlane/ControlPlaneOrgMemberSummary.tsx:82-119
  - `memberships.map(...)` and inside map calls `membership.status.toUpperCase()`.

7. Backend detail shape source for memberships:
- server/src/routes/control.ts:457-476
  - `tenant.findUnique(... include: { memberships: { include: { user: ... }}})`.
  - no explicit normalization of membership status field.

8. Prisma schema truth:
- server/prisma/schema.prisma:99 onwards (model Membership)
  - fields include id/userId/tenantId/role/createdAt/updatedAt.
  - no `status` field exists on Membership model.

## 8) Root-Cause Hypothesis and Repo-Truth Evidence
Root-cause conclusion (repo-truth backed):
- Crash is caused by unguarded `membership.status.toUpperCase()` in Org Member Summary render when `membership.status` is undefined.

Evidence chain:
- Frontend expects `status` on membership entries:
  - components/ControlPlane/ControlPlaneOrgMemberSummary.tsx:105
  - services/controlPlaneService.ts `TenantDetailResponse` typing includes `memberships[].status: string`.
- Backend detail route returns Prisma `memberships` include without status normalization:
  - server/src/routes/control.ts:457-476
- Prisma Membership model has no `status` field:
  - server/prisma/schema.prisma model `Membership`.

Therefore:
- Undefined source is not archive response payload.
- Undefined source is detail-membership render data shape mismatch (frontend expectation vs backend/model truth).
- Archive action is a trigger context that exposed this render path; it is not the primary data contract source of undefined.

## 9) Shared Impact Assessment
- Not archive-only in principle.
- Any Tenant Detail view with non-empty memberships can hit the same crash when member rows render.
- K6 surfaced it post-archive because archive triggered re-render in a state where member summary path executed.
- Risk scope: shared Tenant Detail stability risk, with archive post-action as a high-visibility trigger path.

## 10) Implementation Readiness Classification
- frontend-only-ready
- Classification reason:
  - Deterministic source-level cause identified in frontend render guard.
  - No backend/schema/migration change required to prevent crash.
  - Optional follow-up contract alignment (frontend type shape) is still frontend-only.

## 11) Proposed Next Unit
- FAM-07K8-CONTROL-PLANE-TENANT-ARCHIVE-POST-ACTION-ERRORBOUNDARY-HARDENING-IMPLEMENTATION-001

Goal of K8:
- Apply bounded frontend hardening so tenant detail never crashes when membership status is absent.
- Keep lifecycle/archive semantics unchanged.

## 12) Exact Next-Unit Allowed Write Files
- components/ControlPlane/ControlPlaneOrgMemberSummary.tsx
- services/controlPlaneService.ts
- tests/control-plane-tenant-archive.test.tsx
- tests/control-plane-activate-approved-verification.test.tsx
- tests/control-plane-onboarding-outcome-recording.test.tsx
- artifacts/control-plane/FAM-07K8-CONTROL-PLANE-TENANT-ARCHIVE-POST-ACTION-ERRORBOUNDARY-HARDENING-IMPLEMENTATION-001.md

## 13) Exact Next-Unit Forbidden Actions
- Do not edit backend route files.
- Do not edit server services.
- Do not edit Prisma schema/migrations/SQL.
- Do not edit governance files.
- Do not change archive endpoint semantics or status transitions.
- Do not change auth/session behavior or SUPER_ADMIN policy.
- Do not perform destructive runtime actions.
- Do not create LEGAL_APPROVED claims.
- Do not close FTR-LEGAL-003.
- Do not mark FAM-07 VERIFIED_COMPLETE.

## 14) Acceptance Criteria (K8)
1. Tenant Detail no longer throws when membership entries lack `status`.
2. Archive success path renders without ErrorBoundary crash.
3. Existing archive guardrails/behavior remain unchanged.
4. Existing activation/outcome surfaces remain unchanged.
5. Tests cover missing-membership-status scenario and pass.
6. Typecheck passes.

## 15) Validation Plan (K8)
Primary:
- pnpm -C server exec tsc --noEmit

Targeted tests:
- pnpm vitest tests/control-plane-tenant-archive.test.tsx
- pnpm vitest tests/control-plane-activate-approved-verification.test.tsx
- pnpm vitest tests/control-plane-onboarding-outcome-recording.test.tsx

Scope safety:
- git diff --name-only
- git status --short

## 16) Runtime/Manual Verification Plan (K8)
1. Open Tenant Detail for a tenant with memberships.
2. Confirm Org Member Summary renders without crashing.
3. Execute bounded archive action on authorized QA tenant only (if explicitly authorized in that unit).
4. Confirm post-action notice/state renders and no ErrorBoundary appears.
5. Confirm tenant moves Active -> Closed without UI crash.
6. Verify no secret values are captured.

## 17) Files Changed
- artifacts/control-plane/FAM-07K7-CONTROL-PLANE-TENANT-ARCHIVE-POST-ACTION-ERRORBOUNDARY-HARDENING-DESIGN-001.md

## 18) FAM-07 Status Decision
- FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED (unchanged; not VERIFIED_COMPLETE).

## 19) FTR-LEGAL-003 Status Decision
- FTR-LEGAL-003 remains OPEN / MVP_CRITICAL (unchanged).

## 20) HD-001 Status Decision
- HD-001 remains RUNTIME_CONFIRMED_CONFIGURED (unchanged).

## 21) Hub Impact Decision
- NO_HUB_UPDATE_REQUIRED (bounded design artifact only; no governance file edits).

## 22) Final Enum
- FAM_07K7_ARCHIVE_POST_ACTION_ERRORBOUNDARY_DESIGN_COMPLETE_FRONTEND_ONLY_READY