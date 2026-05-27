# CONTROL-PLANE-TEST-TENANT-CLEANUP-REMEDIATION-DESIGN-001

## 1. Unit Header

- Unit ID: CONTROL-PLANE-TEST-TENANT-CLEANUP-REMEDIATION-DESIGN-001
- Mode: Design and decision only (no implementation, no mutation, no deletion)
- Date: 2026-05-27
- Branch: main
- HEAD at design start: 1f034a45d283091f0fb7d79f548c77c43a47243c
- Final recommendation enum: REMEDIATION_DESIGN_READY_FOR_READ_SIDE_HIDE_IMPLEMENTATION

## 2. Repo-Truth Preflight

- git branch --show-current: main
- git rev-parse HEAD: 1f034a45d283091f0fb7d79f548c77c43a47243c
- git status --short: clean before design
- Required authority artifacts exist: yes
- Blocked execution artifact enum verified:
  - FINAL_DELETE_BLOCKED_BY_EXECUTION_DESIGN_GAP
- Execution result artifact verified:
  - deletedCount = 0
  - approvedRemaining = 44
- Approval artifact enum verified:
  - APPROVAL_READY_FOR_EXECUTION_DESIGN
- Review artifact enum verified:
  - REVIEW_READY_FOR_PARESH_DECISION

## 3. Authority Artifacts Reviewed

- artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-DELETE-EXPORT-REVIEW-DECISION-001.md
- artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-DELETE-PARESH-APPROVAL-DECISION-001.md
- artifacts/control-plane/CONTROL-PLANE-TEST-TENANT-DELETE-EXECUTION-001.md
- artifacts/control-plane/test-tenant-delete-execution-precheck.json
- artifacts/control-plane/test-tenant-delete-execution-precheck.md
- artifacts/control-plane/test-tenant-delete-execution-result.json
- artifacts/control-plane/test-tenant-delete-execution-result.md
- artifacts/control-plane/test-tenant-delete-dependency-export.json
- artifacts/control-plane/test-tenant-delete-dependency-export.md
- server/scripts/control-plane/tenant-delete-approved-tenants.ts
- server/scripts/control-plane/tenant-delete-dependency-export.ts
- server/prisma/schema.prisma
- server/src/routes/control.ts
- components/ControlPlane/TenantRegistry.tsx
- components/ControlPlane/TenantDetails.tsx
- tests/control-plane-tenant-registry-detail.test.tsx

## 4. Blocked Execution Summary

- Prior execution unit result: blocked
- Final enum: FINAL_DELETE_BLOCKED_BY_EXECUTION_DESIGN_GAP
- Direct blocker message captured:
  - LIFECYCLE_LOG_IMMUTABLE on table network_lifecycle_logs
  - UPDATE and DELETE prohibited for lifecycle log rows
- Evidence confirms:
  - no approved rows deleted
  - all 44 approved rows still present
  - DELETE_BLOCKED, PROTECTED_NO_ACTION, and AMBIGUOUS_NO_ACTION rows preserved

## 5. Root-Cause Analysis: Why Hard-Delete Failed

### 5.1 Dependency Path (repo truth)

From server/prisma/schema.prisma:

1. organizations.id is bound to Tenant.id using onDelete Cascade.
2. NetworkLifecycleLog.orgId references organizations.id using onDelete Cascade.
3. NetworkLifecycleLog is documented as immutable and append-only, with layered immutability controls.

Effective delete path during tenant hard-delete:

Tenant delete attempt
-> cascade into organizations row
-> cascade into network_lifecycle_logs rows for that org
-> database immutability policy/trigger blocks DELETE on network_lifecycle_logs
-> transaction aborts (P0001 LIFECYCLE_LOG_IMMUTABLE)

### 5.2 Cause classification

- Primary cause: database immutability rule on lifecycle logs
- Mechanism: delete cascade reaches immutable log table; policy blocks row deletion
- Not a safe bypass candidate in this cycle

## 6. Hard-Delete Viability Decision

Decision for this cleanup cycle: hard-delete is rejected.

Rationale:
- Hard-delete currently conflicts with immutable lifecycle-log governance.
- Bypassing or weakening immutable log policy is explicitly out of bounds.
- Existing blocked execution already proved no safe completion path under current design.

Hard-delete may only be revisited in a future separate governance unit if lifecycle-retention-compatible architecture is redesigned and explicitly approved.

## 7. Non-Destructive Remediation Options Considered

### Option A: Inline slug exclusion in launch-facing tenant list read path

- Summary: filter approved 44 slugs out of control-plane tenant list response.
- Benefits: smallest runtime change, no schema work, no data mutation.
- Risks: exclusion list can become scattered or undocumented if inlined directly.
- Decision: acceptable but less maintainable than Option B.

### Option B: Dedicated read-side cleanup exclusion registry consumed by control-plane read path

- Summary: create a single, explicit exclusion registry source for launch-facing list reads.
- Benefits: centralized governance, auditable, reversible, no DB write, no schema change.
- Risks: must enforce strict allowlist to avoid excluding protected/blocked/ambiguous sets accidentally.
- Decision: recommended.

### Option C: New non-destructive visibility/status classification in schema

- Summary: add a formal visibility field and classify rows as hidden from launch views.
- Benefits: explicit data model semantics.
- Risks: requires schema/migration/write path changes and rollout coordination.
- Decision: not recommended for immediate remediation.

### Option D: Keep all tenants visible and accept clutter

- Summary: no action.
- Benefits: zero code change.
- Risks: launch-facing operational clutter remains unresolved.
- Decision: fallback only if implementation unit is deferred.

### Option E: Existing soft-decommission pattern

- Summary: reuse existing archive/close or lifecycle mutation patterns.
- Benefits: existing mechanisms.
- Risks: this cycle forbids mutation and does not solve immutable-log hard-delete conflict for approved list cleanup intent.
- Decision: not selected for this remediation objective.

## 8. Recommended Remediation Path

Recommended option: Option B (read-side exclusion registry for launch-facing list views).

Why safest:
- Removes launch-facing clutter without deleting rows.
- Preserves immutable lifecycle logs and full audit history.
- Avoids schema migrations and avoids database writes.
- Keeps SuperAdmin forensic access possible via detail route or explicit audit surfaces.
- Leaves DELETE_BLOCKED, PROTECTED_NO_ACTION, and AMBIGUOUS_NO_ACTION untouched.
- Does not alter marketplace, B2B, B2C, D2C public flows.

## 9. Exact Preserve and No-Delete Guardrails

The next implementation must preserve and never reclassify or hide by mistake:

- DELETE_BLOCKED group (3)
- PROTECTED_NO_ACTION group (QA and WL protected set)
- AMBIGUOUS_NO_ACTION group (4)
- Any newly unsupported row if discovered

Additional guardrails:
- No deletion, archive, close, status mutation, or onboarding mutation.
- No changes to immutable lifecycle log rules.
- No route-level mutation APIs introduced.

## 10. Next Implementation Unit Proposal

Proposed unit ID:
- CONTROL-PLANE-TEST-TENANT-CLEANUP-READ-SIDE-HIDE-IMPLEMENTATION-001

Scope (minimal safe slice):
1. Add a centralized exclusion registry for the 44 approved slugs only.
2. Apply exclusion only in launch-facing tenant list read path.
3. Keep tenant detail read path intact for auditability and direct lookup.
4. Add tests proving hidden rows are excluded from list, while preserved groups remain visible.
5. Add explicit runtime/readme note that this is non-destructive list shaping.

Likely allowed files for next implementation:
- server/src/routes/control.ts
- components/ControlPlane/TenantRegistry.tsx (only if response contract or UX messaging requires update)
- tests/control-plane-tenant-registry-detail.test.tsx
- server/src/__tests__/control-onboarding-outcome.integration.test.ts
- one new read-side registry file under server (for example server/config/controlPlaneTenantReadExclusions.ts)
- artifacts/control-plane/* implementation evidence files

Repo-truth note:
- Requested read path file server/src/services/controlPlaneService.ts was not present at that path in this repo snapshot; implementation should use existing server route and frontend service path that actually exists in workspace.

Required validation for next implementation:
- Preflight clean repo and authority artifact checks
- Unit tests for list exclusion behavior and preserved-group visibility
- Confirm detail route still resolves hidden tenants by id when directly requested by authorized admin
- Confirm no DB mutation commands executed
- git diff --check and clean commit status

Rollback posture:
- Single commit revert restores pre-remediation visibility immediately.
- No data rollback required because no data mutation is performed.

## 11. Safety Classification

Final recommendation enum:
- REMEDIATION_DESIGN_READY_FOR_READ_SIDE_HIDE_IMPLEMENTATION

No mutation was performed in this design unit.