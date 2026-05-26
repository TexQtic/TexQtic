# CONTROL-PLANE-TEST-TENANT-CLEANUP-DESIGN-001

Status: DESIGN_COMPLETE
Type: Design only (no implementation, no runtime mutation)
Scope lane: Control-plane tenant operations (FTR-CP-001 remains open)

## 1. Objective

Define a safe, approval-gated strategy for future cleanup of temporary test tenants created for control-plane verification without introducing unsafe deletion behavior, schema changes, or broad lifecycle mutations.

This unit is design-only and does not authorize any tenant mutation, archive, suspension, reinstatement, or deletion.

## 2. Repo-Truth Audit Summary

### 2.1 Existing control-plane tenant mutation surfaces

- `POST /api/control/tenants/:id/onboarding/activate-approved` exists and is `SUPER_ADMIN` only.
- `POST /api/control/tenants/:id/archive` exists and is `SUPER_ADMIN` only.
- No control-plane tenant `DELETE` endpoint exists.
- `TenantDetails` explicitly labels reinstate, suspend, and delete as unavailable in current surface.

### 2.2 Existing hard guardrails already present

- Archive requires explicit slug confirmation plus reason.
- Archive path blocks a protected keep-set by slug and name.
- Frontend and backend both encode protected targets, including canonical QA slugs and `white-label-co`.
- Activation-preparation script already models governance metadata (`closeGate`, `retentionIntent`, `cleanupPlan`) for ephemeral verification tenants.

### 2.3 Important safety implication

Current platform behavior supports bounded archival-to-CLOSED and activation from VERIFIED_APPROVED to ACTIVE, but does not support hard-delete for tenants in control plane. Any cleanup plan that assumes hard-delete would be speculative and unsafe in this repository state.

## 3. Source Evidence (read-only)

- `components/ControlPlane/TenantDetails.tsx`
- `components/ControlPlane/TenantRegistry.tsx`
- `services/controlPlaneService.ts`
- `server/src/routes/control.ts`
- `server/src/routes/admin/tenantProvision.ts`
- `server/src/services/tenantProvision.service.ts`
- `server/src/types/tenantProvision.types.ts`
- `server/scripts/prepare-activation-verification-state.ts`

## 4. Cleanup Classification Rules (design authority)

Future cleanup must classify each candidate tenant into exactly one class before any mutation unit is opened.

### 4.1 SAFE_CLEANUP_CANDIDATE

All conditions true:

- Explicit ephemeral intent trace exists (for example activation-verify orchestration reference or approved-onboarding metadata trail).
- Not in protected keep-set (slug/name not blocked by policy).
- Not part of canonical QA matrix/fixtures expected for repeated verification.
- No explicit retention gate still open.

Allowed future action for this class:

- Archive only (to CLOSED), using existing bounded control-plane archive lane.

### 4.2 UNSAFE_PROTECTED

Any condition true:

- Matches protected slug/name keep-set.
- Identified canonical QA/white-label baseline fixture tenant.
- Explicit governance hold or known repeated-run dependency.

Allowed future action for this class:

- No mutation. Keep as-is. Document why retained.

### 4.3 AMBIGUOUS_REVIEW_REQUIRED

Examples:

- Missing provenance or incomplete metadata.
- Classification signals conflict.
- Unclear ownership or unclear close-gate state.

Allowed future action for this class:

- No mutation until explicit manual review decision artifact is approved.

## 5. Options A-F

| Option | Design | Benefits | Risks | Verdict |
| --- | --- | --- | --- | --- |
| A | Manual one-off archive decisions without a classification rubric | Fast to start | High operator inconsistency, weak auditability | REJECT |
| B | Add hard-delete capability for test tenants | Strongest cleanup finality | Not supported in current repo; high irreversible risk; out of scope | REJECT |
| C | Use existing archive endpoint only, with explicit classification and approval gates | Reuses bounded behavior already implemented; low architecture risk | Leaves CLOSED tenants retained in DB | ACCEPTABLE |
| D | Build new dedicated cleanup endpoint now | Centralized API | New mutation lane and auth risks; out of design-only scope | REJECT |
| E | Keep all test tenants permanently, never cleanup | Zero mutation risk | Operational drift and noise in control-plane registry | NOT_RECOMMENDED |
| F | Deferred two-phase cleanup program: inventory/classify first, execution later via archive-only unit | Strong governance trail; minimizes accidental mutation; aligns with current capabilities | Requires extra process discipline | RECOMMENDED |

## 6. Recommended Design

Recommendation: Option F.

Phase 1 (decision/inventory):

- Build and approve tenant inventory with class assignment (`SAFE_CLEANUP_CANDIDATE`, `UNSAFE_PROTECTED`, `AMBIGUOUS_REVIEW_REQUIRED`).
- No mutations.

Phase 2 (bounded execution, separate future unit):

- Execute archive-only actions for approved SAFE candidates.
- Use existing `POST /api/control/tenants/:id/archive` semantics only.
- No delete behavior, no schema change, no bypass path.

## 7. Future Unit Plan (not executed here)

### 7.1 Decision unit (inventory only)

Proposed ID: `CONTROL-PLANE-TEST-TENANT-CLEANUP-INVENTORY-DECISION-001`

Expected output:

- Candidate table with id, slug, legal name, provenance signal, class, rationale.
- Explicit keep-list and archive-list.
- Explicit unresolved list requiring manual decision.

### 7.2 Execution unit (archive-only)

Proposed ID: `CONTROL-PLANE-TEST-TENANT-CLEANUP-ARCHIVE-EXECUTION-001`

Hard gates:

- `SUPER_ADMIN` actor only.
- Archive reason present and linked to approved inventory decision.
- Slug confirmation exact-match.
- Protected and ambiguous classes hard-blocked.

### 7.3 Verify-close unit

Proposed ID: `CONTROL-PLANE-TEST-TENANT-CLEANUP-VERIFY-CLOSE-001`

Expected evidence:

- Command evidence that only approved candidates moved to CLOSED.
- Protected and ambiguous tenants unchanged.
- Read-only runtime smoke in control-plane registry/detail confirms expected final state.

## 8. Future Execution Allowlist (proposed)

If and only if a future execution unit is explicitly authorized, the minimal expected allowlist is:

- `components/ControlPlane/TenantDetails.tsx` (only if additional non-destructive guard copy is needed)
- `server/src/routes/control.ts` (only if policy guard refinements are explicitly approved)
- `services/controlPlaneService.ts` (only if API contract adjustment is explicitly approved)
- New bounded governance artifact for the execution unit

## 9. Explicitly Forbidden in Future Cleanup Execution

- Any hard-delete tenant path.
- Any DB/schema/migration/RLS change for cleanup.
- Any bypass of protected keep-set.
- Any mutation on ambiguous candidates.
- Any broad lifecycle suite expansion (reinstate/suspend/delete) in this lane.
- Any auth realm changes.

## 10. Rollback and Safety Design

Because recommended execution is archive-only on existing endpoint semantics:

- Rollback strategy is procedural, not destructive: stop additional archives immediately, retain audit evidence, and open a dedicated remediation decision unit.
- No delete path is used, so irreversible data loss path is intentionally avoided by design.

## 11. Validation for This Design Unit

- Design-only: no code mutations, no API calls, no runtime destructive action.
- Artifact establishes classification authority, option analysis, and future bounded execution gates.

## 12. Decision

`CONTROL-PLANE-TEST-TENANT-CLEANUP-DESIGN-001` is complete as a design authority artifact.

This unit authorizes no runtime cleanup mutation. It authorizes only a future decision-first, archive-only cleanup program under separate approved units.
