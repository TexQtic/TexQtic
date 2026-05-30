# FAM-07E-TOS-LEGAL-INPUT-FINALIZATION-001

Status: DECISION_PACKET_COMPLETE
Mode: TECS Safe-Write legal-input finalization / decision packet only
Scope: Legal-input finalization for FAM-07E ToS/platform-agreement consent architecture
Date: 2026-05-30

## 1) Unit Boundary

Authorized in-scope:
- Legal-input finalization decision packet only.
- Repo-truth synthesis and implementation-entry checklist definition.

Explicitly out-of-scope:
- Source/schema/migration/UI/test/config/env/package changes.
- Runtime/deploy/SMTP operations.
- Legal text drafting beyond placeholders.
- FAM-07 VERIFIED_COMPLETE advancement.
- FTR-LEGAL-003 closure.

## 2) Branch and HEAD

- Branch: main
- HEAD at preflight: 1ec1843a

## 3) Preflight Results

Commands run:
- git status --short
- git rev-parse --short HEAD
- git rev-parse --verify <commit>^{commit} for: 1ec1843a, 672f4d46, d93cb720, b56e43d5, b3acbb75, da068831, 29b47e62
- git show --name-only --oneline 1ec1843a

Results:
- Worktree: clean (no tracked short-status output).
- HEAD resolved: 1ec1843a.
- Required lineage commits: all present.
- Exact committed path in 1ec1843a:
  - artifacts/control-plane/FAM-07E-TOS-CONSENT-ARCHITECTURE-001.md

## 4) Architecture Artifact Path Confirmation

Architecture source unit:
- FAM-07E-TOS-CONSENT-ARCHITECTURE-001

Exact committed architecture artifact path (confirmed by git show):
- artifacts/control-plane/FAM-07E-TOS-CONSENT-ARCHITECTURE-001.md

Path hygiene conclusion:
- No root-path mis-commit detected for 1ec1843a.
- No artifact-path hygiene remediation required in this unit.

## 5) Current FAM-07 Legal State (Repo Truth)

- HD-001: RUNTIME_CONFIRMED_CONFIGURED.
- FAM-07 family status: PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.
- FAM-07 is not VERIFIED_COMPLETE.
- FTR-LEGAL-003: MVP_CRITICAL / OPEN.
- Implementation remains blocked until legal package/version authority is provided and explicitly authorized.

## 6) Repo-Truth Inputs Used

Governance authority inputs:
- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md
- governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/README.md
- governance/units/TECS-LAUNCH-READINESS-HUB-DRIFT-CONTROL-ADDENDUM-001.md
- TECS.md

Architecture source:
- artifacts/control-plane/FAM-07E-TOS-CONSENT-ARCHITECTURE-001.md

Legal/public/onboarding/activation repo-truth surfaces (read-only):
- components/Onboarding/OnboardingFlow.tsx
- services/tenantService.ts
- server/src/routes/tenant.ts
- server/src/routes/public.ts
- server/src/services/email/email.templates.ts
- App.tsx

## 7) Legal Input Matrix (Implementation Entry Inputs)

Legend:
- Status: PROVIDED | MISSING | DECISION_NEEDED
- Blocks implementation: YES | NO

| Input Name | Required Value | Owner | Status | Blocks Implementation | Notes |
|---|---|---|---|---|---|
| Agreement taxonomy (MVP) | Final list of required agreement types and per-flow applicability | Paresh + Counsel | DECISION_NEEDED | YES | Must lock PLATFORM_TERMS, SUPPLIER_ONBOARDING_TERMS, PRIVACY_NOTICE_ACK at minimum |
| Agreement type enum names | Immutable canonical enum identifiers | Engineering + Counsel approval | DECISION_NEEDED | YES | Needed before backend schema/API contract opens |
| Agreement title per type | Display title per agreement type/version | Counsel | MISSING | YES | UI and audit proofs require stable title metadata |
| Version identifier policy | Naming format (e.g., YYYY.MM.DD-rN or semver) | Paresh + Counsel | DECISION_NEEDED | YES | Must be deterministic across backend/UI/control-plane |
| Effective date policy | Timezone and activation boundary definition | Counsel | MISSING | YES | Needed for stale-version gate semantics |
| Canonical legal source URL | Authoritative URL path per agreement/version | Legal/Content owner | MISSING | YES | Must exist before final UI linkage |
| Content hash policy | Hash algorithm and canonicalization rules | Engineering + Counsel signoff | DECISION_NEEDED | YES | Required for immutable acceptance evidence |
| Checkbox wording placeholders | Temporary UI copy tags marked NOT LEGAL-APPROVED | Product + Legal | DECISION_NEEDED | NO | Placeholders can be used only for scaffolding, not production launch approval |
| Final checkbox legal wording | Counsel-approved user-facing acceptance text | Counsel | MISSING | YES | Required before production-facing implementation completion |
| Jurisdiction assumptions | MVP jurisdiction set and fallbacks | Paresh + Counsel | DECISION_NEEDED | YES | Influences agreement applicability and wording variants |
| Locale assumptions | MVP locale(s) and fallback language | Paresh + Counsel | DECISION_NEEDED | YES | Required for UI text selection and audit context |
| Re-consent trigger policy | Conditions requiring re-acceptance after version change | Paresh + Counsel | DECISION_NEEDED | YES | Required for gate behavior and post-change handling |
| Actor acceptance policy | Which actor roles must accept for MVP activation | Paresh + Counsel | DECISION_NEEDED | YES | Needed to resolve owner vs non-owner invite behavior |
| Non-owner invite policy | Full gate vs lighter acknowledgment vs no gate | Paresh + Counsel | DECISION_NEEDED | YES | Explicit decision required for invited non-owner memberships |
| Privacy notice artifact | Publicly accessible privacy notice URL/content source | Legal/Content owner | MISSING | YES | Required for privacy acknowledgement proof |
| Platform terms artifact | Publicly accessible platform terms URL/content source | Legal/Content owner | MISSING | YES | Required for platform consent proof |
| Supplier onboarding terms artifact | Supplier-specific terms URL/content source | Legal/Content owner | MISSING | YES | Required by FTR-LEGAL-003 scope |
| Control-plane proof fields contract | Required read-model fields for consent evidence display | Engineering | DECISION_NEEDED | NO | Can be designed in parallel, but not finalized without legal input locks |

## 8) Recommended MVP Consent Package

### 8.1 Agreement Types (MVP Required)
- PLATFORM_TERMS (required)
- SUPPLIER_ONBOARDING_TERMS (required)
- PRIVACY_NOTICE_ACK (required)
- Optional only if counsel demands: COMMUNICATION_NOTICE_ACK

### 8.2 Actor Coverage (MVP)
- First owner: must accept full package.
- Authenticated invited user (existing account):
  - If elevated role (OWNER/ADMIN): same full package.
  - If non-owner role: policy decision required (see 8.4).

### 8.3 Scope Coverage (MVP)
- Platform-wide: yes (PLATFORM_TERMS + PRIVACY_NOTICE_ACK).
- Supplier onboarding specific: yes (SUPPLIER_ONBOARDING_TERMS).
- Tenant-specific overrides: no for MVP unless legal requires tenant annexes.
- User-specific evidence: yes (user-level acceptance must be stored).

### 8.4 Invited Non-Owner Membership Policy (Required Decision)
Decision needed before implementation:
- Option A: Same full ToS gate for all invited members.
- Option B: Full platform/privacy gate + lighter supplier-role acknowledgment for non-owner members.
- Option C: No gate for non-owner members (not recommended for MVP due to evidence inconsistency risk).

Recommended default:
- Option B, if counsel approves role-differentiated obligations.
- Otherwise Option A.

### 8.5 Activation Gates (MVP)
- Backend hard gate on /api/tenant/activate.
- Backend hard gate on /api/tenant/activate-authenticated.
- Frontend submit lock until required consent inputs are completed with accepted version/hash payload.

### 8.6 Minimum Evidence Requirements (MVP)
Each acceptance record must include:
- agreementType
- agreementVersion
- agreementHash
- acceptedAt
- actorUserId
- tenantId
- sourceFlow
- locale/jurisdiction context
- requestId/correlation id in immutable event trail

## 9) Version and Hash Authority Recommendation

### 9.1 Version naming
- Recommended: date-based immutable version key with optional revision suffix.
- Example policy format: YYYY.MM.DD-rN.
- Version key must be stable across backend payloads, UI display, and control-plane evidence.

### 9.2 Content hash generation
- Recommended algorithm: SHA-256.
- Canonicalization must be defined before implementation:
  - normalize encoding
  - normalize line endings
  - deterministic source representation for hashing

### 9.3 Canonical legal source location
- Must be a stable, publicly resolvable legal-document URL set controlled by legal/content governance.
- URL set must be frozen per released version before acceptance can be enabled.

### 9.4 Future version re-consent
- Recommended baseline rule:
  - If agreementHash changes for any required agreement type, re-consent is mandatory for affected actors before protected actions proceed.
- Exact trigger matrix remains legal decision input and must be locked before implementation opens.

## 10) UI Wording Placeholders (NOT LEGAL-APPROVED)

All strings below are placeholders only and must be replaced by counsel-approved wording.

NOT LEGAL-APPROVED placeholder set:
- [PLACEHOLDER_PLATFORM_TERMS_ACK_TEXT]
- [PLACEHOLDER_SUPPLIER_TERMS_ACK_TEXT]
- [PLACEHOLDER_PRIVACY_NOTICE_ACK_TEXT]
- [PLACEHOLDER_RECONSENT_NOTICE_TEXT]
- [PLACEHOLDER_LEGAL_LINK_DISCLOSURE_TEXT]

Counsel/Paresh replacement required for:
- Final checkbox labels.
- Any inline legal summaries.
- Confirmation/success legal copy.
- Re-consent prompt language.

## 11) Implementation Entry Criteria (Go/No-Go Checklist)

All must be true before opening implementation:
- Agreement taxonomy for MVP is approved and frozen.
- Agreement enum identifiers are approved and frozen.
- Version naming policy is approved and frozen.
- Effective-date policy is approved and frozen.
- Canonical legal URLs/content sources are available for required agreements.
- Hash algorithm + canonicalization policy is approved and frozen.
- Actor acceptance policy (including non-owner invite behavior) is decided.
- Re-consent trigger policy is decided.
- Placeholder-to-final-text replacement authority and process are defined.
- Paresh authorization explicitly opens implementation unit.

## 12) What Can Proceed vs Must Stay Blocked

Can proceed before final legal text (bounded/design-level only):
- Internal technical interface design for consent snapshot/event structures.
- Test-plan drafting and acceptance criteria scaffolding.
- Placeholder tags in design documents (not in production UX copy).

Must remain blocked until legal package is finalized:
- Backend contract/schema implementation for legal acceptance gates.
- Any production-facing onboarding consent UI copy.
- Activation endpoint enforcement shipping.
- Control-plane legal evidence display tied to unresolved legal text/version policy.

## 13) Recommended Implementation Slice Sequence (Post-Authorization)

1. Backend consent authority foundation
- Consent snapshot + immutable consent event model and API contract.

2. Backend activation gate enforcement
- Hard gate in /api/tenant/activate and /api/tenant/activate-authenticated.

3. Frontend onboarding consent capture
- Version/hash-carrying consent inputs and submit lock.

4. Control-plane observability
- Read model for legal acceptance evidence.

5. Verification and hub sync
- End-to-end gate tests + runtime-safe verification + governance close sync.

## 14) Artifact-Path Hygiene Finding

- Check performed: git show --name-only --oneline 1ec1843a
- Finding: architecture artifact was committed at required path under artifacts/control-plane.
- Classification: NO_ADJACENT_PATH_HYGIENE_ISSUE_FOUND
- Action in this unit: none (out of scope and not required).

## 15) Hub Impact Decision

- Hub impact decision: NO_HUB_UPDATE_REQUIRED
- Contradiction scan outcome: no stale contradiction found requiring hub edits in this unit.

## 16) Remaining FAM-07 Gates

- HD-001 remains RUNTIME_CONFIRMED_CONFIGURED.
- FAM-07 remains PARTIALLY_IMPLEMENTED / TEST_CONFIRMED.
- FAM-07 remains not VERIFIED_COMPLETE.
- FTR-LEGAL-003 remains MVP_CRITICAL / OPEN.
- Legal-input package remains the primary blocker for FAM-07E implementation entry.

## 17) Recommended Next Unit

Recommended next unit:
- FAM-07E-TOS-LEGAL-PACKAGE-AUTHORIZATION-001

Rationale:
- Legal inputs are still missing/decision-needed across taxonomy, version/hash authority, actor policy, and final wording approvals.

## 18) Final Enum

FINAL_ENUM: FAM_07E_TOS_LEGAL_INPUT_FINALIZATION_COMPLETE_LEGAL_PACKAGE_REQUIRED

Meaning:
- This unit is complete as a legal-input finalization packet.
- Implementation is not yet authorized/open.
- Legal package finalization is the required next step before implementation slices can begin.
