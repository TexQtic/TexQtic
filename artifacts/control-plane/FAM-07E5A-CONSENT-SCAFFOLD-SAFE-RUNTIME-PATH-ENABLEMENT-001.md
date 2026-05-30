# FAM-07E5A-CONSENT-SCAFFOLD-SAFE-RUNTIME-PATH-ENABLEMENT-001

## 1) Unit ID And Mode
- Unit: FAM-07E5A-CONSENT-SCAFFOLD-SAFE-RUNTIME-PATH-ENABLEMENT-001
- Mode: TECS Safe-Write design/audit only (no implementation edits)

## 2) Current HEAD / Branch
- Branch: main
- HEAD: cb4ae227

## 3) Scope And Safety Boundary
- This unit is analysis-only.
- No backend, frontend, schema, or environment mutation was performed.
- Objective: identify the narrowest safe runtime path to re-run E5 consent scaffold verification.

## 4) E5 Blocker Recap (From Prior Unit)
- E5 runtime was blocked because the session did not reach an invite-token activation checkpoint.
- Observed outcome in E5: provisioned test tenant path produced ACTIVE tenant behavior rather than pending invited-tenant checkpoint traversal.
- Result: no LEGAL_PENDING consent submission, no snapshot/event persistence, no observability confirmation.

## 5) Repo-Truth: Provisioning Path Map
- Admin provisioning route supports two branches:
  - LEGACY_ADMIN
  - APPROVED_ONBOARDING
- APPROVED_ONBOARDING branch is implemented with guardrails:
  - service-token path restricted to APPROVED_ONBOARDING mode only
  - first-owner preparation invite model created with invitePurpose = FIRST_OWNER_PREPARATION
  - organization seeded into VERIFICATION_APPROVED state for onboarding progression
- Evidence is present in server-side route/service/test surfaces:
  - route contract and branch parsing
  - service model write behavior
  - integration tests asserting APPROVED_ONBOARDING outputs

## 6) Repo-Truth: Activation Path Map
- Tenant activation supports both paths:
  - POST /api/tenant/activate (new-user invite token flow)
  - POST /api/tenant/activate-authenticated (existing signed-in user invite acceptance)
- Both paths already accept scaffold consent payloads and enforce LEGAL_PENDING-only policy for this phase.
- Both paths persist bounded consent records via snapshot/event write helper.
- Existing tests validate acceptance, source-flow matching, and legal-status policy rejection when outside scaffold rules.

## 7) Repo-Truth: Why E5 Missed The Path
- E5 evidence indicates runtime did not obtain a viable invited-tenant activation entry point.
- The most likely operational mismatch is path selection/provisioning-mode mismatch in runtime invocation surface.
- In plain terms: code-level safe path exists, but runtime operator flow used in E5 did not deterministically land on it.

## 8) Option Matrix (A-E)
- Option A: Retry E5 immediately with current operator flow.
  - Risk: high repeat-failure probability; same path ambiguity remains.
  - Verdict: not recommended.
- Option B: Use approved-onboarding API path directly (service-token based) to force invite-preparation path, then execute authenticated invite acceptance.
  - Benefit: deterministic path to invite-first activation.
  - Constraint: requires controlled operator execution and safe credential handling.
  - Verdict: viable if executed as bounded runtime procedure.
- Option C: Add a narrow control-plane/operator runtime selector that guarantees APPROVED_ONBOARDING path in safe QA execution.
  - Benefit: removes ambiguity for repeatable verification.
  - Cost: small implementation slice required.
  - Verdict: strongest long-term safe-run enablement.
- Option D: Treat current provision form dynamicity gap as inseparable blocker and halt FAM-07E path.
  - Verdict: not required; separable.
- Option E: Classify auth/session stall as primary blocker for E5A and defer all consent runtime work.
  - Verdict: not primary from repo truth; classify as adjacent operational risk.

## 9) Adjacent Finding (Separately Track)
- Adjacent finding retained: provision form appears static/non-dynamic relative to path needs.
- This should be tracked as a separate future unit (for example FAM-07K-family UX/operator hardening) unless explicitly included in a bounded implementation slice.
- It is not required to close E5A design truth.

## 10) Auth/Session Stall Classification
- E5 sign-in AUTHENTICATING stall is classified as adjacent runtime risk, not the canonical E5A root blocker.
- Canonical E5A blocker is path determinism to invite-based activation and consent checkpoint execution.

## 11) Security And Side-Effect Analysis
- Safe runtime path must keep these constraints:
  - QA-only tenant data
  - no secret/token exposure in artifacts
  - no final legal wording or approval claims
  - no FTR-LEGAL-003 closure action
- Existing backend constraints support this posture:
  - bounded LEGAL_PENDING acceptance only
  - source-flow verification
  - metadata sanitization and event persistence

## 12) Recommended Path Decision
- Recommended immediate path: implementation-enabled deterministic operator path before retry.
- Practical interpretation:
  - either bounded operator procedure using approved-onboarding route (Option B), or
  - narrow implementation slice that exposes deterministic safe runtime path (Option C).
- Given repeatability and audit confidence goals, Option C is preferred for continuation.

## 13) Implementation Needed Decision
- Decision: implementation required for deterministic safe runtime path enablement.
- Reason: repo truth confirms capability exists, but current runtime operator surface remains ambiguous for reliable E5 execution.

## 14) HD-001 Status Decision
- Remains: RUNTIME_CONFIRMED_CONFIGURED

## 15) FAM-07 Status Decision
- Remains: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED
- Not promoted to VERIFIED_COMPLETE

## 16) FTR-LEGAL-003 Status Decision
- Remains: OPEN / MVP_CRITICAL
- No closure, no legal-finalization claim

## 17) Hub Impact Decision
- NO_HUB_UPDATE_REQUIRED
- Reason: E5A is bounded design/audit truth only; no runtime completion evidence yet.

## 18) Next Unit Recommendation
- Recommended next unit: FAM-07E5B-CONSENT-SCAFFOLD-DETERMINISTIC-RUNTIME-PATH-IMPLEMENTATION-001
- Follow-on unit after E5B: retry E5 runtime verification with the deterministic path and evidence capture.

## 19) Final Enum
- FAM_07E5A_CONSENT_SCAFFOLD_SAFE_RUNTIME_PATH_IMPLEMENTATION_REQUIRED
