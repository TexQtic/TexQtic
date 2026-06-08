# DESIGN-MAINAPP-DIRECT-REGISTRATION-ENTRY-AND-ROLE-SELECTION-01

## 1. Unit ID
DESIGN-MAINAPP-DIRECT-REGISTRATION-ENTRY-AND-ROLE-SELECTION-01

## 2. Date
2026-06-08

## 3. Mode
TECS Safe-Write design-only unit.

This unit defines Main App direct online registration entry and role-selection design for the locked hybrid onboarding model.

No implementation in this unit:
- no route creation
- no UI/auth/backend/schema changes
- no runtime submissions
- no CRM sync implementation
- no Zoho integration
- no billing implementation

## 4. Preflight

### Main App repo preflight evidence
- Branch: main
- HEAD at start: 0a5b0958
- Worktree at start: clean (`git status --short` produced no output)
- Latest commit at start: `0a5b0958 docs(onboarding): lock hybrid direct registration model`

Stop condition check passed. Design work proceeded.

## 5. Scope and Inputs

### Authority consumed
- `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md`
- `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01.md`

### Main App runtime truth inspected
- `App.tsx`
- `server/src/routes/public.ts`
- `server/src/routes/auth.ts`
- `server/src/routes/tenant.ts`
- `server/src/routes/tenant/gst-verification.ts`
- `services/tier0Service.ts`
- `services/tenantService.ts`
- `components/Public/PublicRequestAccess.tsx`
- `components/Auth/AuthFlows.tsx`
- `components/Onboarding/OnboardingFlow.tsx`
- `server/prisma/schema.prisma`

## 6. Current Repo Truth Summary

1. Public request-access intake exists and is explicitly non-provisioning:
   - `POST /api/public/tier0/request-access` in `server/src/routes/public.ts`.
   - Explicitly states no account/invite/tenant/membership created.
   - Accepts `roleIntent` values: `supplier`, `buyer`, `service_provider`, `unknown`.

2. Current onboarding/activation is invite-token based:
   - `POST /api/tenant/activate`
   - `POST /api/tenant/activate-authenticated`
   - Both require invite token and create membership after token validation.

3. Current tenant login is sign-in and membership-driven:
   - `components/Auth/AuthFlows.tsx` resolves tenant memberships by email and signs in.
   - No public self-signup endpoint is currently used.

4. GST verification submission/status endpoints exist:
   - `POST /api/tenant/gst-verification`
   - `GET /api/tenant/gst-verification`
   - Current route posture is manual/admin review workflow.

5. Verification-gated workspace continuity exists:
   - `App.tsx` contains `ONBOARDING_STATUS_CONTINUITY`, `VERIFICATION_BLOCKED_VIEWS`, and `isVerificationBlockedTenantWorkspace` logic.
   - Pending/rejected/more-info statuses suppress transactional surfaces.

6. SPA currently maps public entry route for request access:
   - `App.tsx` resolves `/request-access` to `PUBLIC_REQUEST_ACCESS` and renders `PublicRequestAccess`.
   - `/join/:referral_code` already exists for referral landing use.

7. Schema posture relevant to design:
   - `TenantStatus` enum only has `ACTIVE | SUSPENDED | CLOSED`.
   - Canonical onboarding statuses are represented in `organizations.status` string checks (`PENDING_VERIFICATION`, `VERIFICATION_APPROVED`, `VERIFICATION_REJECTED`, `VERIFICATION_NEEDS_MORE_INFO`).
   - Membership roles are `OWNER | ADMIN | MEMBER | VIEWER`.

## 7. Design Decisions

## A. Entry route and UX

### A1. Primary direct-registration route decision
Chosen route: `/register`

Rationale:
- clear and platform-neutral for all role types.
- avoids overload of existing `/join/:referral_code` referral semantics.
- aligns with expected marketing and social CTA language.
- keeps `/request-access` available as compatibility fallback during migration.

### A2. Role route strategy
- Canonical route: `/register` with first-step role chooser.
- Optional deep-link aliases (future) for campaign targeting:
  - `/register/supplier`
  - `/register/buyer`
  - `/register/service-provider`
- Aliases should preselect role only and still render the same registration flow engine.

### A3. Request Access compatibility behavior
- Near term: keep `/request-access` as compatibility route.
- Mid migration: route-level copy and CTA hierarchy should favor `/register` for online lane.
- Policy: `/request-access` retained for high-touch enterprise/demo/offline-assist intake and temporary backward compatibility.

### A4. Immediate post-account success state
After direct account creation, user lands in provisional workspace continuity shell with:
- onboarding checklist focus
- GST/KYC submission prompt
- explicit verification status posture
- transactional actions suppressed

## B. Auth and account creation model

### B1. Existing auth support for public signup
Current truth: no direct public signup flow is active.

### B2. Must-add capability (design target)
A new direct-registration backend slice is required to create first-party account identity without invite token while preserving tenant/membership safety invariants.

### B3. Invite compatibility decision
Invite activation remains intact and unchanged for offline/assisted CRM lane and team/member invitations.

### B4. Direct registration object model choices
Options considered:
1. auth user only
2. auth user + provisional tenant/org + owner membership
3. auth user + provisional invite-equivalent record
4. registration application object only

Chosen minimal launch-safe model:
- create auth user
- create provisional tenant/org pair
- create first membership as OWNER
- do not issue invite for this path
- mark onboarding/verification posture on organization status (PENDING_VERIFICATION)

Why this model:
- fastest path to first authenticated continuity shell.
- reuses existing verification-blocked workspace controls.
- avoids forcing self-signup through invite semantics intended for assisted/issued flows.
- preserves strict tenant isolation and role constraints.

## C. Role selection model

### C1. Supported role intents at registration start
- Supplier
- Buyer
- Service Provider

Persisted as registration intent and onboarding metadata.

### C2. Mapping to current models
Current runtime and schema truth do not yet provide a complete direct-registration party-type provisioning contract for all three role intents.

Design lock for this unit:
- retain role intent capture as first-class registration input.
- map initial base tenant category to current safe default path for launch (B2B workspace continuity unless later unit defines otherwise).
- defer canonical partyType resolution contract to dedicated unit:
  - `DECIDE-MAINAPP-PARTYTYPE-PROVISIONING-CONTRACT-01`

### C3. partyType decision in this unit
Not finalized in this unit. Deferred intentionally.

## D. Provisional account state and access policy

### D1. Provisional status assignment
For direct registration launch:
- `organizations.status = PENDING_VERIFICATION` (canonical onboarding gate)
- tenant remains operational for authenticated continuity shell, but capability unlock governed by verification posture.

### D2. First-user membership role
- first user receives `OWNER` membership in newly created provisional org/tenant.
- ownership does not imply transactional eligibility before verification approval.

### D3. Provisional workspace surface
- show read-only/limited workspace continuity posture.
- show onboarding checklist and verification status.

### D4. Access matrix (locked)

| Surface / Capability | Before verification approval |
|---|---|
| Profile completion and company details | ALLOWED |
| Document upload / GST submission inputs | ALLOWED |
| Onboarding checklist and status visibility | ALLOWED |
| Team/member invite management | ALLOWED with caution (policy-gated) |
| Catalog management and product mutation | BLOCKED |
| Buyer RFQ and supplier RFQ inbox actions | BLOCKED |
| Trade creation/execution | BLOCKED |
| Escrow and settlement operations | BLOCKED |
| Invoice approval/payment-readiness workflows | BLOCKED |
| Any transactional unlock actions | BLOCKED |

### D5. Fit with existing `PENDING_VERIFICATION` behavior
Current `App.tsx` verification-blocked shell logic is compatible with direct registration provisional posture and can be reused as the control point for launch.

## E. GST/KYC handoff model

1. Registration does not require GST/KYC before account creation.
2. GST/KYC appears immediately as onboarding checklist priority after first login to provisional workspace.
3. Current `/api/tenant/gst-verification` route is the handoff target for submission/status.
4. Missing for automation (out of scope for this unit):
   - provider integration adapter
   - verification evidence envelope standardization
   - admin exception workflow contract for automation failures

## F. CRM and source attribution boundary

### F1. CRM boundary in this unit
- Main App direct registration is canonical online entry.
- CRM remains downstream lifecycle sink and offline/assisted lane system.
- event-map details remain for dedicated CRM sync design unit.

### F2. Registration attribution fields required at start
Minimum attribution set for direct registration:
- sourceChannel
- utmSource
- utmMedium
- utmCampaign
- campaignId
- referralCode
- acquisitionContext
- landingPage
- referrerUrl
- roleIntent
- firstTouchTimestamp

### F3. `mainAppTier0RequestId` posture
- Tier0 request ID stays valid for request-access compatibility lane.
- Direct registration lane should use a new registration-specific id (design target) and map to CRM lifecycle sync later.
- do not force direct registration through Tier0 request id semantics.

## G. Compatibility policies

### G1. Invite-based activation compatibility
- keep existing invite-token activation endpoints and behaviors unchanged.
- continue using invite activation for:
  - CRM offline/assisted onboarding issuance
  - member invitation acceptance
  - any enterprise-issued activation flow

### G2. Request Access compatibility policy
- keep `/request-access` live.
- classify it as compatibility/high-touch intake, not default online CTA.
- preserve Tier0 CRM notification seam.

## 8. Implementation Slicing (Post-Design)

1. `IMPL-MAINAPP-DIRECT-REGISTRATION-ENTRY-ROUTES-AND-ROLE-CHOOSER-01`
2. `IMPL-MAINAPP-DIRECT-REGISTRATION-BACKEND-PROVISIONAL-ACCOUNT-CREATION-01`
3. `IMPL-MAINAPP-DIRECT-REGISTRATION-ROLE-INTENT-PERSISTENCE-01`
4. `IMPL-MAINAPP-PROVISIONAL-WORKSPACE-CONTINUITY-GATING-ALIGNMENT-01`
5. `IMPL-MAINAPP-GST-KYC-CHECKLIST-HANDOFF-IN-PROVISIONAL-DASHBOARD-01`
6. `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01`
7. `IMPL-CRM-LIFECYCLE-SYNC-REGISTRATION-AND-STATUS-EVENTS-01`
8. `IMPL-MARKETING-CTA-MIGRATION-REQUEST-ACCESS-TO-REGISTER-01`
9. `VERIFY-MAINAPP-ONLINE-DIRECT-REGISTRATION-PROVISIONAL-GST-HANDOFF-01`

## 9. Risks and Fallback

### Key risks
1. Role-intent to canonical org/party typing can drift unless formalized before broad rollout.
2. Reusing existing onboarding shell without careful copy/state adjustments may confuse invite-based vs self-register users.
3. Premature CTA migration before registration runtime readiness can create dead-paths.

### Fallback posture
- Keep request-access operational as compatibility intake.
- Keep invite-token activation for offline/assisted and issued flows.
- Stage release behind bounded rollout flag and monitor onboarding conversion/verification progression.

## 10. Out-of-Scope Confirmation
No source code, schema, or runtime behavior changed in this design unit.

## 11. Decision Verdict
DESIGN_MAINAPP_DIRECT_REGISTRATION_ENTRY_ROLE_SELECTION_LOCKED

## 12. Final Enum
DESIGN_MAINAPP_DIRECT_REGISTRATION_ENTRY_ROLE_SELECTION_COMPLETE
