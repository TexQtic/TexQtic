# FAM-07K-CONTROL-PLANE-PROVISION-FORM-DYNAMICITY-AUDIT-001

## 1) Unit and Mode
- Unit: FAM-07K-CONTROL-PLANE-PROVISION-FORM-DYNAMICITY-AUDIT-001
- Mode: Audit-only (repo-truth + design-readiness)
- Scope: No source implementation changes; artifact-only evidence record
- Date: 2026-05-31

## 2) Branch and HEAD
- Branch: main
- HEAD at unit start: 52fc546f

## 3) Preflight
- git diff --name-only: clean (no output)
- git status --short: clean (no output)
- git rev-parse --abbrev-ref HEAD: main
- git rev-parse --short HEAD: 52fc546f

## 4) Governance Posture Reconfirmation
Reconfirmed from governance pointers and launch index:
- FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED and is not VERIFIED_COMPLETE.
- FTR-LEGAL-003 remains OPEN / MVP_CRITICAL.
- HD-001 remains RUNTIME_CONFIRMED_CONFIGURED.
- FAM-07K remains a separate lane from E5 consent runtime-proof closure work.

## 5) Form Route and Component Map
Control-plane registry entry path:
- App control-plane route mounts TenantRegistry for tenant registry route keys.
- Provision modal is implemented directly inside TenantRegistry (no shared form component wrapper).

Frontend/API route chain:
- Provision modal submit calls controlPlaneService.provisionTenant.
- controlPlaneService.provisionTenant posts to POST /api/control/tenants/provision.

Backend route chain:
- server route admin/tenantProvision.ts receives POST /api/control/tenants/provision.
- Route normalizes with normalizeTenantProvisionRequest.
- Service tenantProvision.service.ts provisions via LEGACY_ADMIN or APPROVED_ONBOARDING mode.

## 6) Provision Form Field Map (Current)
Fields rendered in modal:
- orgName (text)
- primaryAdminEmail (email)
- primaryAdminPassword (password)
- plan (select)
  - FREE, STARTER, PROFESSIONAL, ENTERPRISE
- tenant_category (select)
  - B2B, B2C, AGGREGATOR, INTERNAL
- is_white_label (checkbox)

Payload sent from modal:
- orgName
- primaryAdminEmail
- primaryAdminPassword
- plan
- tenant_category
- is_white_label

Not surfaced in modal (but accepted by backend normalization path):
- base_family
- aggregator_capability
- white_label_capability
- commercial_plan
- primary_segment_key
- secondary_segment_keys
- role_position_keys

## 7) Static vs Dynamic Findings
Confirmed static behavior in current UI:
- All selectable options are hardcoded in component source.
- No API fetch for option catalogs.
- No conditional field reveal/hide based on prior selections.
- No derived canonical identity preview from selected values.

Dynamic capability currently present:
- Submit is dynamic in network path only (posts entered values and receives result).
- Tenant list refreshes after successful provisioning.

Conclusion:
- Provision form dynamicity is currently limited and mostly static in presentation/configuration behavior.

## 8) Backend and API Dependency Findings
What backend already supports:
- Route accepts both legacy aliases and canonical provisioning identity fields.
- Normalization resolves canonical identity and validates conflicts.
- Canonical taxonomy assignment inputs exist (segment/role keys) with validation.
- Provisioning service already consumes normalized canonical identity.

Implication for next implementation unit:
- Basic dynamic form improvements (conditional rendering, clearer select UX, canonical preview mapping in UI) can be frontend-first and do not require backend contract changes.
- Optional backend enhancement would be needed only if dynamic option catalogs must be server-owned (for example, role_position/segment option discovery endpoint).

## 9) Dropdown Visibility and UX Root-Cause Analysis
Observed likely contributors in current modal implementation:
- Modal container is light (bg-white) while labels are very low contrast (text-slate-400 at 10px uppercase), reducing legibility.
- Select controls do not set explicit text color for selected/placeholder state; browser defaults can become hard to read under OS/browser theme variance.
- Placeholder-like disabled option in plan select can appear faint and resemble empty/hidden value.
- Native select popup styling is browser/OS controlled; options list appearance can vary, especially with theme overrides.

Not indicated as root causes from repo search:
- No global select-wide CSS override forcing hidden text.
- No portal/z-index conflict specific to select menus detected in this modal path.
- Modal z-index layering appears sufficient for foreground display.

Practical root-cause classification:
- Primary: local form contrast/styling and native-select theme variance.
- Secondary: static option UX with no explicit dynamic cues/preview.

## 10) Shared Impact Assessment
Impact scope is bounded:
- Modal is local to TenantRegistry and does not use a shared select abstraction.
- Changes for dynamicity/visibility can be constrained to TenantRegistry plus its tests.
- controlPlaneService type surface may need minor expansion only if modal starts sending canonical-only fields.
- No required changes to consent runtime helper endpoints or E5 path.

## 11) Provisioning Mode Behavior Findings
- Frontend modal currently exercises LEGACY_ADMIN shape only.
- Backend route supports both LEGACY_ADMIN and APPROVED_ONBOARDING.
- Approved onboarding path is not currently represented in this modal UI.
- This mismatch is not a blocker for current admin provisioning, but it is a known capability gap in surface parity.

## 12) E5 Separation Decision
Decision: keep strict separation.
- E5 consent runtime-proof chain remains closed and bounded.
- No merge of FAM-07K findings into E5 closure claim.
- FAM-07K addresses control-plane provision form UX/dynamicity only.

## 13) Readiness Classification
- Classification: READY_FOR_BOUNDED_IMPLEMENTATION (frontend-first)
- Required backend additions now: NO (for baseline dynamicity + visibility improvements)
- Optional backend additions later: YES (if server-governed dynamic catalogs are required)

## 14) Proposed Next Unit
- Proposed unit: FAM-07K1-CONTROL-PLANE-PROVISION-FORM-DYNAMICITY-IMPLEMENTATION-001
- Objective:
  - Improve select visibility/readability in modal.
  - Add bounded dynamic behavior (field derivation/preview and conditional guidance).
  - Add targeted tests for modal dynamic behavior and select value visibility.

## 15) Next Unit Scope Guardrails
Allowlist (proposed):
- components/ControlPlane/TenantRegistry.tsx
- tests/control-plane-tenant-registry-detail.test.tsx
- services/controlPlaneService.ts (only if request typing needs canonical field alignment)
- artifacts/control-plane/FAM-07K1-CONTROL-PLANE-PROVISION-FORM-DYNAMICITY-IMPLEMENTATION-001.md

Forbidden actions (proposed):
- No governance hub file edits.
- No DB schema, migrations, or env edits.
- No tenantProvision route/service changes unless explicitly authorized.
- No consent runtime helper changes.
- No broad refactor or style churn outside modal scope.

## 16) Acceptance Criteria (for next implementation unit)
- Provision modal selects remain clearly readable for selected value and option list in supported browsers.
- Dynamic behavior is present and deterministic (at minimum: category-to-guidance/canonical preview mapping).
- Existing provisioning submit contract remains valid against backend route.
- Existing registry/detail tests stay green.
- New/updated tests cover modal dynamic behavior and selected value rendering.

## 17) Validation Plan (for next implementation unit)
Targeted validations after implementation:
- pnpm -C server exec tsc --noEmit
- pnpm vitest tests/control-plane-tenant-registry-detail.test.tsx
- Optional: targeted frontend typecheck/lint command for changed package if configured
- git diff --name-only
- git status --short

## 18) Runtime and Manual Checklist (for next implementation unit)
- Open Staff Control Plane -> Tenant Registry.
- Open Provision New Tenant modal.
- Validate readability of:
  - Plan select closed state
  - Plan dropdown options
  - Runtime category select closed state
  - Runtime category dropdown options
- Toggle white-label checkbox and confirm dynamic guidance/preview updates.
- Submit valid provision payload and confirm success card + tenant list refresh.

## 19) Files Changed in This Unit
- artifacts/control-plane/FAM-07K-CONTROL-PLANE-PROVISION-FORM-DYNAMICITY-AUDIT-001.md

## 20) Hub Impact Decision
- Decision: NO_HUB_UPDATE_REQUIRED (audit-only, no status transition asserted)

## 21) Final Status Decisions (Unchanged)
- FAM-07: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
- FTR-LEGAL-003: OPEN / MVP_CRITICAL
- HD-001: RUNTIME_CONFIRMED_CONFIGURED

## 22) Final Enum
- FAM_07K_PROVISION_FORM_DYNAMICITY_AUDIT_COMPLETE_IMPLEMENTATION_READY
