# FAM-07I — New-User Supabase Invite Sub-Path Repo-Truth Audit

## 1. Unit ID

- FAM-07I-NEW-USER-SUPABASE-INVITE-SUBPATH-REPO-TRUTH-AUDIT-001
- Mode: TECS Safe-Write bounded repo-truth audit + implementation planning only
- Status: AUDIT_COMPLETE

## 2. Current HEAD

- HEAD at audit start: 5e8c9f03
- Branch: main
- Worktree preflight: clean

## 3. Files and Search Surfaces Inspected

### Required files inspected

- App.tsx
- components/Onboarding/OnboardingFlow.tsx
- services/tenantService.ts
- services/authService.ts
- services/apiClient.ts
- server/src/routes/tenant.ts
- server/src/routes/auth.ts
- server/src/__tests__/tenant-activate.integration.test.ts
- tests/frontend/onboarding-activation.test.tsx
- TECS.md
- governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md
- artifacts/control-plane/FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001.md
- artifacts/control-plane/FAM-07D3-VERIFY-CLOSE-AND-HUB-SYNC-001.md
- artifacts/control-plane/FAM-07F-ACTIVATION-HARDENING-AND-TEST-COVERAGE-001.md
- artifacts/control-plane/FAM-07G-VERIFY-CLOSE-AND-AUTH-PATH-HUB-SYNC-001.md

### Additional repo-truth files inspected

- server/prisma/schema.prisma
- server/src/services/tenantProvision.service.ts
- server/src/services/email/email.service.ts
- server/src/lib/database-context.ts
- server/src/routes/admin/tenantProvision.ts
- components/Auth/TokenHandler.tsx
- vercel.json
- server/package.json
- package.json

### Required route file check result

- server/src/routes/onboarding.ts: NOT FOUND
- server/src/routes/invite.ts: NOT FOUND

### Search surfaces executed

- invite/auth/Supabase terms across App.tsx, services, components, server, tests
- token and error codes: pendingInviteToken, EXISTING_USER_MUST_SIGN_IN, EMAIL_MISMATCH, INVALID_INVITE, ALREADY_MEMBER
- Supabase SDK/auth methods: inviteUserByEmail, generateLink, auth.admin, auth.signUp, @supabase

## 4. Current Invite Architecture Summary

Current onboarding/invite architecture is app-level and split into two explicit activation paths:

1. New-user activation path
- URL entry via query params: token + action=invite
- App stores pendingInviteToken and enters ONBOARDING
- On submit, frontend calls POST /api/tenant/activate with inviteToken + userData + verificationData
- Backend validates tokenHash against invites table, creates user/membership, marks invite acceptedAt, issues tenant JWT

2. Existing-user sign-in-first path
- If /api/tenant/activate detects existing user by email, backend returns 409 EXISTING_USER_MUST_SIGN_IN
- User signs in first, then App auto-calls POST /api/tenant/activate-authenticated using preserved pendingInviteToken
- Backend validates invite/email against authenticated user, creates membership, marks acceptedAt, issues tenant JWT for invite tenant

## 5. Supabase Auth Usage Findings

Repo truth for FAM-07 invite/onboarding path shows no active Supabase Auth invite/account-creation implementation:

- No runtime usage of inviteUserByEmail, generateLink, auth.admin, auth.signUp
- No @supabase/* dependency in package.json or server/package.json
- No Supabase callback route implementation for invite acceptance
- "supabase" references in active code are comments/docs/tests metadata, not invite-auth runtime flow

Conclusion: current invite activation path is not implemented via Supabase Auth APIs.

## 6. App-Level Invite Token Findings

Invite token lifecycle is app-database backed:

- Token generated server-side (random bytes)
- Only tokenHash (SHA-256) is stored in invites table
- Activation endpoints hash incoming inviteToken and query invites by tokenHash + acceptedAt null + expiresAt > now
- Invite acceptance recorded via acceptedAt timestamp in app DB
- Email mismatch and duplicate membership checks occur in app backend

Current invite email links use app URL and app token:
- /accept-invite?token=<inviteToken>&action=invite

No Supabase auth token is attached to this invite link flow.

## 7. New-User Activation Path Findings

Path is implemented and covered:

- App onboarding handler calls activateTenant
- Backend /api/tenant/activate creates user (if absent), creates membership, marks invite acceptedAt, writes audit log, sets org to PENDING_VERIFICATION, and returns JWT
- FAM-07G FC-03 hardening is present: pendingInviteToken is cleared immediately after activateTenant success (before downstream bootstrap)
- Backend tests include 21 passing tests for tenant-activate suite (including new-user path checks added in FAM-07G)
- Frontend tests include 15 passing tests for onboarding-activation suite (including F-MISS and ACT-013..015 additions from FAM-07G)

## 8. Remaining FTR-AUTH-001 Gap Determination

Repo-truth determination:

- Existing-user path: implemented and verified (FAM-07D3)
- New-user app-level invite activation path: implemented and verified (existing backend flow + FAM-07G hardening/tests)
- Remaining "new-user Supabase invite sub-path DESIGN_GATED/OPEN" wording appears to be terminology drift, not an active unimplemented app code path

Therefore the FTR-AUTH-001 remainder is best classified as terminology drift relative to current implementation truth.

## 9. Is "Supabase invite sub-path" Accurate?

Determination: OUTDATED / AMBIGUOUS terminology in current tracker wording.

Reason:

- Current activation is app-level invite token + app user/membership/JWT flow
- No Supabase Auth invite dispatch, callback, or account creation logic exists in the audited path
- The phrase "Supabase invite sub-path" does not match current code architecture for FAM-07 activation

## 10. SMTP Dependency Boundary

SMTP (HD-001) is a delivery boundary, not the auth-path implementation boundary:

- Invite creation and token issuance happen without SMTP success
- Email service is non-blocking and can return SKIPPED_SMTP_UNCONFIGURED
- Without SMTP, real-world invite email delivery is blocked
- This blocks operational activation delivery, but does not prove missing auth-path implementation logic

## 11. Runtime Verification Boundary

What is provable locally from repo truth:

- Endpoint and flow behavior
- Token/membership/update sequencing
- Error code contract behavior
- Unit/integration test coverage outcomes recorded in artifacts

What is not provable in this audit unit:

- Production email delivery and mailbox receipt end-to-end (depends on SMTP and environment)
- Production-only operational reliability characteristics

## 12. Test Coverage Inventory After FAM-07G

Backend:

- server/src/__tests__/tenant-activate.integration.test.ts
- 21 tests passing in FAM-07G verify evidence
- Includes existing-user and new-user activation error/success branches

Frontend:

- tests/frontend/onboarding-activation.test.tsx
- 15 tests passing in FAM-07G verify evidence
- Includes ActivationFlow error handling, service-call contracts, FC-03 stale-token guard contract

Residual coverage note:

- No dedicated full browser/runtime e2e proof of production email delivery (expected; SMTP boundary)

## 13. Smallest Next Implementation Unit, If Any

Smallest implementation unit for FTR-AUTH-001 itself: NONE REQUIRED based on current repo truth.

Recommended next units:

1. Governance sync unit (not implementation):
- Reconcile FTR/LFI/NEXT-ACTION wording from "new-user Supabase invite sub-path DESIGN_GATED/OPEN" to current app-level implementation truth.

2. Independent infra unit (already known):
- FAM-07H SMTP infrastructure enablement for delivery reliability (HD-001), if authorized.

## 14. Proposed Allowlist for the Next Implementation Unit

If a true implementation unit is still mandated after governance sync (not recommended by this audit), narrow allowlist should be:

- server/src/routes/tenant.ts
- tests/frontend/onboarding-activation.test.tsx
- server/src/__tests__/tenant-activate.integration.test.ts

If governance-sync-only unit is opened (recommended), allowlist should be governance files only:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md
- artifacts/control-plane/<governance-sync-artifact>.md

## 15. Proposed Validation Commands for the Next Implementation Unit

For implementation unit (if any):

- pnpm exec tsc --noEmit
- pnpm -C server exec vitest run tenant-activate.integration.test.ts
- pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/onboarding-activation.test.tsx

For governance-sync-only unit:

- git status --short
- rg -n "FTR-AUTH-001|FAM-07|Supabase invite sub-path|DESIGN_GATED" governance/launch-readiness governance/control artifacts/control-plane

## 16. Hub Impact Decision

HUB_SYNC_REQUIRED_NOT_PERFORMED

Rationale:

- Audit evidence indicates current hub wording likely materially stale/ambiguous for FTR-AUTH-001 remainder
- This unit is audit/planning-only and does not perform LFI/FTR edits by instruction
- A separate bounded governance-sync unit is required to reconcile tracker language with code truth

## 17. Final Classification Enum

FTR_AUTH_001_REMAINDER_TERMINOLOGY_DRIFT_APP_LEVEL_INVITE_ALREADY_IMPLEMENTED

---

## Required Audit Questions — Direct Answers

1. Does app currently use Supabase Auth for invite dispatch/account creation in FAM-07 path?
- No.

2. Does POST /api/tenant/activate create app users, Supabase users, or both?
- App users/memberships only.

3. Does invite email contain app token, Supabase token, or both?
- App-level invite token only.

4. Is inviteToken stored/validated only in app DB?
- Yes (tokenHash in invites table).

5. Is a Supabase invite callback route expected/missing?
- No active Supabase invite callback route is implemented or referenced for this path.

6. Dedicated /accept-invite route or catch-all+query?
- Catch-all to index.html plus query handling (token/action) in App.tsx.

7. Does new-user path require Supabase auth session establishment?
- No; it relies on backend activation + tenant JWT issuance.

8. Is term "Supabase invite sub-path" accurate?
- No; ambiguous/outdated relative to current repo truth.

9. If Supabase Auth required, what files/env deps involved?
- Not applicable from current code (no Supabase Auth invite flow found).

10. If Supabase Auth not required, what is true remaining FTR-AUTH-001 gap?
- No clear implementation gap found in app-level invite activation; primary remainder appears terminology drift in governance wording.

11. Untested backend/frontend paths still relevant after FAM-07G?
- Core activation contracts are covered in focused suites; production SMTP delivery remains outside local test proof.

12. Runtime/production-only dependencies not provable locally?
- Yes: SMTP delivery and mailbox-level receipt.

13. Is SMTP blocking this sub-path, or only invite email delivery?
- SMTP blocks delivery, not core auth-path implementation logic.

14. Can FTR-AUTH-001 close before FTR-LEGAL-003 and HD-001?
- Yes, logically independent; FTR-LEGAL-003 and HD-001 can remain open as separate blockers.

15. Smallest next implementation unit, if any?
- None required for FTR-AUTH-001 implementation based on repo truth; next should be governance-sync reconciliation unit.
