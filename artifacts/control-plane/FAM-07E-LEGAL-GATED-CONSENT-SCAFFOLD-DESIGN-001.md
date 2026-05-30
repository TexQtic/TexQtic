# FAM-07E-LEGAL-GATED-CONSENT-SCAFFOLD-DESIGN-001

Status: DESIGN_COMPLETE
Mode: TECS Safe-Write repo-truth design only
Scope: Legal-gated consent scaffold design for FAM-07 with legal-pending posture preserved
Date: 2026-05-30

## 1) Unit ID and Mode

- Unit ID: FAM-07E-LEGAL-GATED-CONSENT-SCAFFOLD-DESIGN-001
- Execution mode: TECS Safe-Write repo-truth design only
- Objective: define legal-agnostic consent scaffold so development can continue while final legal package authority remains pending
- Out of scope: implementation, schema migration, runtime/deploy, legal wording finalization, legal closure claims

## 2) Current HEAD and Branch

- Branch: main
- HEAD at preflight: 7fbf7a01

## 3) Preflight Results

Commands run:
- git status --short
- git rev-parse --short HEAD
- git cat-file -t 7fbf7a01
- git cat-file -t 78f3a088
- git cat-file -t 47043ff9
- git cat-file -t 40e2ea1b
- git cat-file -t 4cb2eddf
- git cat-file -t 1ec1843a
- git cat-file -t 672f4d46
- git cat-file -t d93cb720
- git cat-file -t b56e43d5

Results:
- Worktree was clean.
- HEAD resolved to 7fbf7a01.
- Required lineage commits were all present as commit objects.

## 4) Current FAM-07 / HD-001 / FTR-LEGAL-003 Truth

- HD-001 remains RUNTIME_CONFIRMED_CONFIGURED.
- FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.
- FAM-07 remains not VERIFIED_COMPLETE.
- FTR-LEGAL-003 remains OPEN / MVP_CRITICAL.
- Legal final package authority is pending for final wording, version policy, hash/source policy, actor acceptance policy, jurisdiction/locale policy, and re-consent policy.
- Layer 0 next recommended unit is this unit (FAM-07E-LEGAL-GATED-CONSENT-SCAFFOLD-DESIGN-001).

## 5) Repo-Truth Surfaces Inspected

Governance and posture sources:
- TECS.md
- governance/units/TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001.md
- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md
- governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/README.md
- artifacts/control-plane/LEGAL-GATED-DEVELOPMENT-CONTINUATION-MODEL-001.md
- artifacts/control-plane/LAUNCH-LEGAL-GATED-DEVELOPMENT-GOVERNANCE-SYNC-001.md
- artifacts/control-plane/FAM-07E-TOS-CONSENT-ARCHITECTURE-001.md
- artifacts/control-plane/FAM-07E-TOS-LEGAL-INPUT-FINALIZATION-001.md

Activation and onboarding backend surfaces:
- server/src/routes/tenant.ts
  - POST /api/tenant/activate
  - POST /api/tenant/activate-authenticated
  - existing error codes and invite-token acceptance flow
- services/tenantService.ts
  - activateTenant request/response contract
  - acceptAuthenticatedInvite request contract

Frontend onboarding and invite acceptance surfaces:
- components/Onboarding/OnboardingFlow.tsx
- App.tsx (pendingInviteToken continuation, onComplete activation path, sign-in invite acceptance path)

Schema, logs, and event surfaces:
- server/prisma/schema.prisma (Invite, Membership, Tenant, organizations, AuditLog, EventLog, FeatureFlag, TenantFeatureOverride)
- server/src/lib/auditLog.ts
- server/src/lib/events.ts

Control-plane observability surfaces:
- components/ControlPlane/TenantDetails.tsx
- components/ControlPlane/TenantAuditLogSummary.tsx
- services/controlPlaneService.ts (audit and event read surfaces)

Tests covering activation and invite acceptance:
- server/src/__tests__/tenant-activate.integration.test.ts
- tests/frontend/onboarding-activation.test.tsx

Legal/public route checks:
- server/src/routes/public.ts
- App.tsx
- server/src/services/email/email.templates.ts

## 6) Repo-Truth Audit Answers

1. Existing backend activation endpoints needing future consent payload support:
- /api/tenant/activate
- /api/tenant/activate-authenticated
- No additional activation endpoint currently performs this invite acceptance transition.

2. Frontend surfaces needing future consent capture:
- OnboardingFlow step progression and final submit path.
- App.tsx onboarding onComplete handler for invite-token activation.
- App.tsx post-sign-in pendingInviteToken acceptance path for authenticated existing users.

3. Existing data models that can support legal-pending scaffolding now:
- Invite, Membership, Tenant, organizations for activation transitions and actor/tenant linkage.
- AuditLog and EventLog for immutable telemetry and traceability.

4. Existing audit/event structure suitability:
- AuditLog supports metadataJson and actor/tenant context.
- EventLog supports immutable append-only event envelope and metadata/payload JSON.
- events.ts already enforces deterministic envelope structure and correlation metadata support.

5. Existing legal document/public terms/privacy/agreement model:
- No dedicated legal-document authority model was identified in active runtime schema/routes.
- Legal/public references are limited and do not provide a versioned acceptance authority model.

6. Existing gating pattern for LEGAL_PENDING vs launch claims:
- FeatureFlag and TenantFeatureOverride pattern exists and is used in current platform gating.
- This pattern can separate scaffold behavior from any final legal-complete claims.

7. Minimum future schema surface if implementation opens:
- Consent snapshot authority table (current effective acceptance per scope/actor/agreement).
- Immutable consent event table (append-only acceptance/supersession history).
- Optional join/index fields for efficient control-plane read models and gate checks.

8. Can scaffold support later plug-in of final legal version/hash/source without rework:
- Yes, if stable field names and placeholder semantics are locked now and final legal metadata is treated as replaceable values within fixed contracts.

9. What can proceed before final legal approval:
- Legal-agnostic schema/contract scaffolding.
- API payload contract extension design with LEGAL_PENDING semantics.
- Event taxonomy and deterministic error-code design.
- Frontend checkpoint placement and labeling design (non-final legal copy).
- Control-plane observability design for pending/final states.

10. What must remain blocked until final legal approval:
- Final legal wording and legally binding acceptance text.
- Final hash/source/version authority activation as legal source of truth.
- Final enforcement claims that represent counsel-approved legal closure.
- FTR-LEGAL-003 closure and FAM-07 VERIFIED_COMPLETE promotion.

## 7) Consent Scaffold Design

### 7.1 Consent State Model (Snapshot Authority)

Design a stable consent snapshot contract with these fields:
- agreementType: canonical enum key (for example PLATFORM_TERMS, SUPPLIER_ONBOARDING_TERMS, PRIVACY_NOTICE_ACK).
- agreementVersion: string placeholder now; final counsel-approved version later.
- agreementHash: string placeholder now; final canonical hash later.
- agreementSourceUrl: string placeholder now; final legal source URL later.
- legalStatus: LEGAL_PENDING | LEGAL_APPROVED | SUPERSEDED.
- actorUserId: accepted/reviewed actor linkage.
- tenantId and orgId: tenant/org linkage for isolation and reporting.
- sourceFlow: ACTIVATE_NEW_USER | ACTIVATE_AUTHENTICATED_INVITE | ADMIN_REVIEW (if ever authorized later).
- acceptedAt: timestamp when actor completed acceptance action.
- reviewedAt: optional timestamp for explicit review-only state if needed.
- auditCorrelationId: request/correlation id for traceability.
- locale and jurisdiction: placeholder policy fields now, final semantics later.

Semantics:
- LEGAL_PENDING indicates technical scaffold acceptance only, not legal closure.
- LEGAL_APPROVED can be used only after final legal package authority exists.
- SUPERSEDED marks prior accepted state replaced by newer version requiring re-consent policy handling.

### 7.2 Placeholder Policy

- Version/hash/source URL are mandatory contract fields from day one, but values can remain placeholder during LEGAL_PENDING.
- Placeholder values must be explicit and non-final (for example PENDING_FINAL_LEGAL_PACKAGE) and never represented as approved legal authority.

## 8) Immutable Consent Event Design

### 8.1 Event Taxonomy

Define immutable consent event names:
- legal.consent.checkpoint_presented
- legal.consent.accepted_pending
- legal.consent.accepted_final
- legal.consent.superseded
- legal.consent.reconsent_required
- legal.consent.reconsent_completed
- legal.consent.gate_rejected

### 8.2 Event Semantics by Lane

LEGAL_PENDING semantics:
- accepted_pending records technical acceptance against pending legal metadata.
- gate_rejected records missing/stale/mismatched payload conditions.

LEGAL_APPROVED semantics:
- accepted_final records acceptance against final approved metadata.
- superseded and reconsent events govern post-version-change behavior.

### 8.3 Event Payload Shape (Stable)

Required payload fields:
- agreementType
- agreementVersion
- agreementHash
- agreementSourceUrl
- legalStatus
- actorUserId
- tenantId
- sourceFlow
- occurredAt
- acceptedAt
- correlationId
- requestId
- errorCode (for gate_rejected events)

Design constraints:
- Event records are append-only and immutable.
- Payload must not include secrets/tokens.
- Deterministic correlation to audit entries and activation requests is required.

## 9) Activation-Gate Contract Design

### 9.1 Future Request Shape Extensions

New-user activation (POST /api/tenant/activate) future extension:
- consent object required when consent checkpoint is enabled.
- consent.requiredAcceptances array carrying one object per required agreement type.

Authenticated invite acceptance (POST /api/tenant/activate-authenticated) future extension:
- consent object required when consent checkpoint is enabled.
- supports role-appropriate agreement set under policy.

Consent acceptance object shape:
- agreementType
- agreementVersion
- agreementHash
- agreementSourceUrl
- accepted: boolean
- acceptedAtClient (optional client clock for troubleshooting only)

### 9.2 Gate Behavior

LEGAL_PENDING behavior:
- Endpoint may accept pending metadata only when explicit LEGAL_PENDING scaffold gate is enabled.
- Response and telemetry must clearly indicate NOT LEGAL-APPROVED posture.

LEGAL_APPROVED behavior:
- Endpoint requires exact match against final approved metadata authority set.
- Any mismatch produces deterministic gate rejection error.

### 9.3 Deterministic Error Codes

Define stable error codes:
- CONSENT_REQUIRED
- CONSENT_METADATA_MISSING
- CONSENT_VERSION_MISMATCH
- CONSENT_HASH_MISMATCH
- CONSENT_SOURCE_MISMATCH
- CONSENT_NOT_ACCEPTED
- CONSENT_STALE_RECONSENT_REQUIRED
- CONSENT_POLICY_UNAVAILABLE

Existing invite/auth errors remain unchanged:
- INVALID_INVITE
- EMAIL_MISMATCH
- ALREADY_MEMBER
- EXISTING_USER_MUST_SIGN_IN

## 10) Frontend Scaffold Contract Design

### 10.1 Checkpoint Placement

New-user path:
- Add consent checkpoint in OnboardingFlow final submission step before submit enablement.

Authenticated invite path:
- Add consent checkpoint before acceptAuthenticatedInvite call when pendingInviteToken path is active.

### 10.2 Labeling and Safety Requirements

Must display:
- LEGAL_PENDING and NOT LEGAL-APPROVED labels while final package is pending.
- No final legal claims.

Must not display:
- Final legally binding copy unless counsel-approved package is active.
- Any launch-ready/legal-closure language.

### 10.3 Replacement Path

- UI reads agreement metadata from a single legal metadata source contract.
- Placeholder metadata can be swapped to final metadata without layout or API contract changes.
- No hardcoded final legal paragraphs inside activation component logic.

## 11) Control-Plane Observability Design

### 11.1 Required Displays

For tenant detail/control views:
- consentCheckpointStatus: LEGAL_PENDING or LEGAL_APPROVED
- required agreement set and acceptance completion state
- latest accepted version/hash/source per agreement type
- actor and timestamp of latest acceptance
- supersession/re-consent indicators

### 11.2 Audit Trail Requirements

- Tenant audit summary must include consent-related audit actions.
- Event stream must allow filtering on legal.consent.* taxonomy.
- Pending-state entries must be visibly non-final.

### 11.3 Non-final Display Guardrails

Must not show as final before approval:
- legally binding accepted state claims
- compliance-complete badges tied to legal closure
- FTR-LEGAL-003 closed indicators

## 12) Feature and Launch Gating Design

### 12.1 Safety in QA/Demo

Use explicit scaffold states/flags:
- consent.scaffold.enabled
- consent.scaffold.legal_pending_only
- consent.scaffold.require_checkpoint

Behavior:
- QA/demo can exercise checkpoint and telemetry behavior under LEGAL_PENDING.
- Production legal-complete claims remain blocked.

### 12.2 Launch Gate Preservation

- Legal scaffold does not alter launch gate truth.
- FTR-LEGAL-003 remains open until final legal package and verification evidence are complete.
- Any legal-complete claim remains disallowed while LEGAL_PENDING.

## 13) Rework-Prevention Strategy

- Lock stable technical names now: agreementType, agreementVersion, agreementHash, agreementSourceUrl, legalStatus, sourceFlow, correlationId.
- Treat legal metadata values as replaceable, not structural.
- Keep event taxonomy stable and append-only.
- Keep activation contract backward-compatible with clear extension point for consent object.
- Avoid embedding final legal wording in code paths.
- Separate technical acceptance mechanics from legal authority finalization.

## 14) Implementation Slice Plan (Post-Authorization)

Slice 1: backend schema/contract scaffold
- Introduce consent snapshot/event authority structures and contract validators.

Slice 2: activation contract/gate scaffold
- Extend activation endpoints with consent payload handling and deterministic error-code paths.

Slice 3: frontend checkpoint scaffold
- Add consent checkpoint UI placement and LEGAL_PENDING labels in both activation flows.

Slice 4: control-plane observability scaffold
- Add consent status summaries and legal.consent audit/event filtering.

Slice 5: final legal package binding after counsel approval
- Replace placeholders with final legal metadata and activate LEGAL_APPROVED behavior.

Slice 6: verification and hub sync
- Validate gate behavior and telemetry; then perform governance sync only if closure criteria are actually met.

## 15) Explicit Non-Goals

- No legal wording finalization.
- No final legal enforcement implementation.
- No FTR-LEGAL-003 closure.
- No FAM-07 VERIFIED_COMPLETE promotion.
- No launch/legal readiness claim.
- No runtime/deployment/SMTP change.

## 16) Hub Impact Decision

- Hub impact decision: NO_HUB_UPDATE_REQUIRED.
- Reason: this unit is design-only and does not change closure truth, gate status, or family completion status.

## 17) Remaining FAM-07 Gates

- HD-001 remains RUNTIME_CONFIRMED_CONFIGURED.
- FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.
- FAM-07 remains not VERIFIED_COMPLETE.
- FTR-LEGAL-003 remains OPEN / MVP_CRITICAL.
- Final legal package authority remains required for legal closure.

## 18) Recommended Next Unit (Choose Exactly One)

Recommended next unit:
- FAM-07E1-CONSENT-SCAFFOLD-BACKEND-SCHEMA-CONTRACT-001

Why:
- Repo truth supports safe legal-agnostic technical scaffolding.
- Backend schema/contract foundation is the lowest-rework first implementation slice.
- It preserves legal gating while enabling development continuation.

## 19) Final Enum

FINAL_ENUM: FAM_07E_LEGAL_GATED_CONSENT_SCAFFOLD_DESIGN_COMPLETE_BACKEND_SCHEMA_CONTRACT_NEXT
