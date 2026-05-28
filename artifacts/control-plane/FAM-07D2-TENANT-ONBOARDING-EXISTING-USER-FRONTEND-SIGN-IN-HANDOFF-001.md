# FAM-07D2 — Tenant Onboarding: Existing-User Frontend Sign-in Handoff
## Artifact: FAM-07D2-TENANT-ONBOARDING-EXISTING-USER-FRONTEND-SIGN-IN-HANDOFF-001

**Status:** CLOSED  
**Date:** 2026-07-07  
**Authorized by:** Paresh Patel (explicit authorization, continuation from FAM-07D1)  
**Implements:** FTR-AUTH-001 frontend leg — sign-in-first UX for existing-user invite activation

---

## 1. Task Identity

**Unit:** FAM-07D2-TENANT-ONBOARDING-EXISTING-USER-FRONTEND-SIGNIN-REDIRECT-001  
**Scope:** Frontend-only — no backend changes, no schema changes, no DB changes  
**Prerequisite:** FAM-07D1-TENANT-ONBOARDING-EXISTING-USER-BACKEND-SECURITY-CONTAINMENT-001 (committed at `d74ed7c`)  
**Parent family:** FAM-07 (Auth & Onboarding Security — Invite Activation)

---

## 2. Starting HEAD and Repo State

- **HEAD at start:** `d74ed7c` — `[TEXQTIC] auth: backend security containment for existing-user invite activation (FAM-07D1)`
- **Tree at start:** Clean (git status empty after preflight)
- **tsc:** EXIT 0 before changes

---

## 3. Backend Contract Consumed (FAM-07D1)

`POST /api/tenant/activate` now returns HTTP 409 with two new error codes:

| Code | Condition | HTTP status |
|---|---|---|
| `EXISTING_USER_MUST_SIGN_IN` | Email already registered in Supabase Auth | 409 |
| `ALREADY_MEMBER` | `org_id` already exists in the `organizations` table | 409 |

**APIError propagation path:**  
`apiClient.ts` "Other errors" branch (~line 430) extracts `errorData.error?.code` → `err.code`.  
409 responses carry `err.code === 'EXISTING_USER_MUST_SIGN_IN'` or `err.code === 'ALREADY_MEMBER'`  
through `tenantService.activateTenant()` → `OnboardingFlow.handleComplete()` catch block — no  
further instrumentation needed.

---

## 4. Files Inspected

- `services/tenantService.ts` — activation call site
- `components/Onboarding/OnboardingFlow.tsx` — full component (ActivationFlow, 4-step form)
- `App.tsx` — app state machine, `pendingInviteToken`, `'ONBOARDING'` case
- `services/apiClient.ts` — APIError class, 409 propagation path
- `governance/control/NEXT-ACTION.md` — governance pointer

---

## 5. Files Changed

| File | Change type |
|---|---|
| `services/tenantService.ts` | Modified — exported `ACTIVATION_ERROR_CODES` constant |
| `components/Onboarding/OnboardingFlow.tsx` | Modified — error UX, new state vars, updated render |
| `App.tsx` | Modified — `onExistingUserSignIn` prop passed to `<OnboardingFlow>` |
| `tests/frontend/onboarding-activation.test.tsx` | Created — 10 frontend unit tests (ACT-001 → ACT-010) |
| `artifacts/control-plane/FAM-07D2-TENANT-ONBOARDING-EXISTING-USER-FRONTEND-SIGN-IN-HANDOFF-001.md` | Created — this artifact |
| `governance/control/NEXT-ACTION.md` | Updated — FAM-07D2 CLOSED, pointer advanced |

---

## 6. Implementation Summary

### 6a. `services/tenantService.ts` — exported error code constants

Added before `activateTenant`:

```typescript
// Error codes returned by the activation endpoint (HTTP 409)
export const ACTIVATION_ERROR_CODES = {
  EXISTING_USER_MUST_SIGN_IN: 'EXISTING_USER_MUST_SIGN_IN',
  ALREADY_MEMBER: 'ALREADY_MEMBER',
} as const;
```

`activateTenant` itself is unchanged.

### 6b. `components/Onboarding/OnboardingFlow.tsx` — sign-in-first UX

1. **Import added:** `import { ACTIVATION_ERROR_CODES } from '../../services/tenantService';`
2. **`ActivationFlowProps` interface:** added `onExistingUserSignIn?: () => void`
3. **New state:**
   ```typescript
   const [existingUserSignInRequired, setExistingUserSignInRequired] = useState(false);
   const [alreadyMemberError, setAlreadyMemberError] = useState(false);
   ```
4. **`handleComplete` updated:** catch block now checks `err?.code` against `ACTIVATION_ERROR_CODES` before falling through to generic `setSubmitError`.
5. **Render updated (step 4 bottom bar):**
   - Back button hidden when either error banner is active
   - Submit/Continue button hidden when either error banner is active
   - `EXISTING_USER_MUST_SIGN_IN` banner: amber panel, heading "Account already exists", message "A TexQtic account already exists for this email address. Please sign in to accept this invite.", CTA "Sign In to Accept Invite" → calls `onExistingUserSignIn?.()`
   - `ALREADY_MEMBER` banner: amber panel, heading "Already a member", message "This account is already a member of this workspace. Please sign in to continue.", CTA "Sign In" → calls `onExistingUserSignIn?.()`

### 6c. `App.tsx` — `onExistingUserSignIn` prop

In the `'ONBOARDING'` render case, added to `<OnboardingFlow>`:

```typescript
onExistingUserSignIn={() => {
  // pendingInviteToken intentionally preserved — not cleared here
  setAppState('AUTH');
}}
```

**Critical invariant:** `setPendingInviteToken(null)` is NOT called. The token is preserved so  
a future authenticated accept-invite unit (FAM-07E/FAM-07G) can re-consume it after login.

---

## 7. EXISTING_USER_MUST_SIGN_IN UX Contract

| Element | Value |
|---|---|
| Trigger | `err.code === 'EXISTING_USER_MUST_SIGN_IN'` in `handleComplete` catch |
| Banner heading | "Account already exists" |
| Banner message | "A TexQtic account already exists for this email address. Please sign in to accept this invite." |
| CTA button | "Sign In to Accept Invite" |
| CTA action | `onExistingUserSignIn?.()` → `setAppState('AUTH')` in App |
| Submit button | Hidden |
| Back button | Hidden |
| Generic `submitError` | NOT shown |

---

## 8. ALREADY_MEMBER UX Contract

| Element | Value |
|---|---|
| Trigger | `err.code === 'ALREADY_MEMBER'` in `handleComplete` catch |
| Banner heading | "Already a member" |
| Banner message | "This account is already a member of this workspace. Please sign in to continue." |
| CTA button | "Sign In" |
| CTA action | `onExistingUserSignIn?.()` → `setAppState('AUTH')` in App |
| Submit button | Hidden |
| Back button | Hidden |
| Generic `submitError` | NOT shown |

---

## 9. INVITE_ALREADY_PENDING — Deferred to FAM-07J

`INVITE_ALREADY_PENDING` (S-01 from FAM-07D1) is returned by `POST /api/tenant/memberships`  
(the member invite route), **not** by `POST /api/tenant/activate` (the activation route).  
`OnboardingFlow.tsx` does not surface the membership invite flow.  
FAM-07D2 scope is `POST /api/tenant/activate` error handling only.  
Deferred: **FAM-07J** — INVITE_ALREADY_PENDING UX in the membership invite surface.

---

## 10. Tests — `tests/frontend/onboarding-activation.test.tsx`

10 tests, ACT-001 through ACT-010.

| ID | Description |
|---|---|
| ACT-001 | EXISTING_USER_MUST_SIGN_IN → sign-in-first message visible |
| ACT-002 | EXISTING_USER_MUST_SIGN_IN → generic "Activation failed" NOT visible |
| ACT-003 | EXISTING_USER_MUST_SIGN_IN → `onExistingUserSignIn` called when CTA clicked |
| ACT-004 | EXISTING_USER_MUST_SIGN_IN → submit button hidden after error |
| ACT-005 | ALREADY_MEMBER → already-member message visible |
| ACT-006 | ALREADY_MEMBER → generic "Activation failed" NOT visible |
| ACT-007 | ALREADY_MEMBER → sign-in CTA visible and calls `onExistingUserSignIn` |
| ACT-008 | Generic error → error message shown |
| ACT-009 | Generic error → sign-in-first banner NOT shown |
| ACT-010 | Validation gate → `onComplete` NOT called when required fields empty |

---

## 11. Validation Results

| Check | Command | Result |
|---|---|---|
| TypeScript | `pnpm exec tsc --noEmit` | EXIT 0 — 0 errors |
| Vitest (10 tests) | `pnpm exec vitest run --config vitest.frontend.config.ts "tests/frontend/onboarding-activation"` | 10/10 PASS, 448ms |
| ESLint — `services/tenantService.ts` | `pnpm exec eslint "services/tenantService.ts"` | CLEAN |
| ESLint — `OnboardingFlow.tsx` | `pnpm exec eslint "components/Onboarding/OnboardingFlow.tsx"` | CLEAN |
| ESLint — test file | `pnpm exec eslint "tests/frontend/onboarding-activation.test.tsx"` | CLEAN |
| Git diff | `git diff --name-only` | App.tsx, components/Onboarding/OnboardingFlow.tsx, services/tenantService.ts |
| Git status | `git status --short` | M App.tsx, M OnboardingFlow.tsx, M tenantService.ts, ?? test file |

---

## 12. FTR-AUTH-001 / FAM-07 Hub Impact

| Leg | Status |
|---|---|
| FAM-07D1 — Backend 409 error codes | CLOSED (d74ed7c, 2026-05-28) |
| FAM-07D2 — Frontend sign-in-first UX | **CLOSED (this unit, 2026-07-07)** |
| Authenticated post-login invite acceptance | **OPEN — requires future unit (FAM-07E / FAM-07G)** |
| FAM-07J — INVITE_ALREADY_PENDING UX | DEFERRED |

**FAM-07 family status: NOT VERIFIED_COMPLETE.** The authenticated accept-invite endpoint  
(re-invoking invite acceptance after sign-in, consuming `pendingInviteToken`) does not yet exist.  
The sign-in redirect is in place; the token is preserved; but the post-login acceptance path  
requires a new backend endpoint and frontend trigger. This is the remaining open leg.

---

## 13. Remaining Work (Out of Scope for This Unit)

1. **Authenticated accept-invite endpoint** — backend: `POST /api/tenant/activate-authenticated` or  
   similar; frontend: auto-trigger after login when `pendingInviteToken` is present.  
   → FAM-07E or FAM-07G. Requires separate Paresh authorization.

2. **INVITE_ALREADY_PENDING UX** — membership invite surface (`InviteMemberForm`).  
   → FAM-07J. Deferred.

---

## 14. Safety Confirmation

- No backend routes modified
- No `schema.prisma` changes
- No migration files
- No `.env` changes
- No `package.json` changes
- No `shared/contracts/` changes
- No `LAUNCH-FAMILY-INDEX.md` changes
- No `FUTURE-TODO-REGISTER.md` changes
- `server/src/routes/tenant.ts` — not touched
- FAM-07 family NOT advanced to VERIFIED_COMPLETE

---

## 15. Completion Checklist

- [x] Preflight: HEAD confirmed, clean tree
- [x] Backend contract consumed (ACTIVATION_ERROR_CODES, APIError.code path verified)
- [x] `ACTIVATION_ERROR_CODES` exported from `services/tenantService.ts`
- [x] `OnboardingFlow.tsx` — `EXISTING_USER_MUST_SIGN_IN` banner implemented
- [x] `OnboardingFlow.tsx` — `ALREADY_MEMBER` banner implemented
- [x] `App.tsx` — `onExistingUserSignIn` prop passed, `pendingInviteToken` preserved
- [x] `tests/frontend/onboarding-activation.test.tsx` — 10 tests, ACT-001 to ACT-010
- [x] `eslint` — unused `beforeEach` import removed from test file
- [x] TypeScript: EXIT 0
- [x] Tests: 10/10 PASS
- [x] ESLint: CLEAN (3 changed files)
- [x] Git diff: only allowlisted files
- [x] Artifact created
- [x] NEXT-ACTION.md updated

---

## 16. Commit

```
[TEXQTIC] auth: frontend sign-in handoff for existing-user invite activation (FAM-07D2)
```

**Staged files:**
```
App.tsx
components/Onboarding/OnboardingFlow.tsx
services/tenantService.ts
tests/frontend/onboarding-activation.test.tsx
artifacts/control-plane/FAM-07D2-TENANT-ONBOARDING-EXISTING-USER-FRONTEND-SIGN-IN-HANDOFF-001.md
governance/control/NEXT-ACTION.md
```

---

## 17. Final Enum

`FAM_07D2_EXISTING_USER_INVITE_FRONTEND_SIGN_IN_HANDOFF_CLOSED_AUTH_ACCEPT_ENDPOINT_REQUIRED`
