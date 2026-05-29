# FAM-07F — Activation Hardening and Test Coverage Audit

**Unit ID:** FAM-07F-ACTIVATION-HARDENING-AND-TEST-COVERAGE-001  
**Type:** Bounded Repo-Truth Audit + Implementation Plan  
**Scope:** New-user invite activation path — frontend FC-03 risk, backend test gaps, frontend test gaps  
**Status:** AUDIT_COMPLETE — implementation authorized in follow-on unit (FAM-07G)  
**Classification:** `FRONTEND_ONLY_HARDENING_REQUIRED`  
**Final enum:** `FAM_07F_ACTIVATION_HARDENING_AUDIT_COMPLETE_FRONTEND_HARDENING_NEXT`

---

## §1 — Audit Authority

| Field | Value |
|---|---|
| Audited HEAD | `ef025082` |
| Parent design doc | `artifacts/control-plane/FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001.md` |
| Prior unit | FAM-07D3 verify-close (`ef025082`) |
| FTR-AUTH-001 status at audit start | PARTIAL |
| FAM-07 LFI status at audit start | PARTIALLY_IMPLEMENTED |
| Hub / LFI edits in this unit | NONE |
| Source edits in this unit | NONE |

---

## §2 — Files Inspected (Read-Only)

| File | Lines Inspected | Purpose |
|---|---|---|
| `App.tsx` | 3720–3760, 4420–4490, 7695–7800 | New-user activation flow, D3 authenticated path (comparison), full ONBOARDING case |
| `components/Onboarding/OnboardingFlow.tsx` | 1–130 | `handleComplete` catch logic; error UI branches |
| `services/tenantService.ts` | 1–120 | `activateTenant`, `acceptAuthenticatedInvite`, `ACTIVATION_ERROR_CODES` |
| `services/apiClient.ts` | 145–200 | `setToken` localStorage write, `clearAuth`, `getToken` |
| `services/authService.ts` | 275–320 | `getCurrentUser` GET /api/me implementation |
| `server/src/routes/tenant.ts` | 258–400, 6256–6510 | `resolveTenantSessionIdentity`, POST /api/tenant/activate handler |
| `server/src/__tests__/tenant-activate.integration.test.ts` | 1–820 | Full test file — mocks, helpers, all existing describe blocks |
| `tests/frontend/onboarding-activation.test.tsx` | 1–370 | Full frontend test file — ACT-001 through ACT-012 |
| `artifacts/control-plane/FAM-07C-TENANT-ONBOARDING-BOUNDED-DESIGN-SYNTHESIS-001.md` | 490–560 | FAM-07F and FAM-07G design scope definitions |
| `governance/control/NEXT-ACTION.md` | Key lines | Active pointer confirmation |
| `governance/control/OPEN-SET.md` | Key lines | FAM-07 open-set record |

---

## §3 — New-User Activation Flow (Current Implementation)

### 3.1 Entry

1. App.tsx mount `useEffect` (line 3729): URL params read — if `?token=xxx&action=invite` detected:
   - `setPendingInviteToken(token)` → stored in React state
   - `setAppState('ONBOARDING')` → activates ONBOARDING case in router

### 3.2 Form

2. ONBOARDING case renders `<OnboardingFlow inviteToken={pendingInviteToken} ... />` (App.tsx line 7709–7751).
3. `OnboardingFlow` renders a 4-step form: business details, compliance, representative, credentials.
4. On completion, `handleComplete()` in `OnboardingFlow.tsx` (line 41–60) calls `onComplete(formData)` — the async function supplied by App.tsx.

### 3.3 Activation onComplete Handler (ONBOARDING case, App.tsx lines 7715–7751)

```
STEP 1: activateTenant({ inviteToken, userData: { email, password }, tenantData, verificationData })
         → POST /api/tenant/activate → atomic transaction → returns { token, user, tenant, membership }
STEP 2: setToken(raw.token, 'TENANT')   ← localStorage.setItem('texqtic_tenant_token', token)
STEP 3: getCurrentUser()                ← GET /api/me using newly stored token
STEP 4: buildTenantSnapshot(me.tenant)  ← if null → throws Error
STEP 5: applyTenantBootstrapState(...)  ← if no nextState → throws Error
STEP 6: setPendingInviteToken(null)     ← only reached on success
STEP 7: setAppState(bootstrapState.nextState)
```

### 3.4 Backend Handler (POST /api/tenant/activate)

1. Zod validate body (`inviteToken`, `userData.{email, password}`, `tenantData?`, `verificationData.{registrationNumber, jurisdiction}`)
2. SHA-256 hash of `inviteToken` → `findFirst` invite by `tokenHash`, `acceptedAt: null`, `expiresAt > now` → 404 INVALID_INVITE if not found
3. Email match check → 403 EMAIL_MISMATCH if `invite.email !== userData.email`
4. `prisma.user.findUnique({ where: { email } })` → 409 EXISTING_USER_MUST_SIGN_IN if account exists (B-01 gate)
5. G-014 stop-loss: `app.org_id` context checked against `invite.tenantId`
6. `withDbContext` atomic transaction:
   - `tx.user.create` (bcrypt password, pre-hashed before transaction)
   - `tx.organizations.update` (status → PENDING_VERIFICATION, registrationNumber, jurisdiction)
   - `tx.memberships.create`
   - `tx.invite.update({ where: { id }, data: { acceptedAt: now } })`
   - `writeAuditLog(tx, { action: 'user.activated', ... })`
7. `resolveTenantSessionIdentity` → reads org back via `withDbContext` → builds `TenantSessionIdentity`
8. `app.tenantJwtSign(payload)` → JWT issued
9. Returns 200: `{ token, user: { id, email }, tenant: { ... }, membership: { role } }`

---

## §4 — FC-03 Risk Analysis (Confirmed)

### 4.1 Description

In the App.tsx ONBOARDING case `onComplete` handler:

- `setToken(raw.token, 'TENANT')` is called at **line 7732** — immediately after `activateTenant` returns 200.
- At this point the **backend atomic transaction has already committed**: invite `acceptedAt` is set, user and membership are created.
- `getCurrentUser()`, `buildTenantSnapshot()`, and `applyTenantBootstrapState()` execute **after** token is in localStorage.
- `setPendingInviteToken(null)` is at **line 7746** — which is only reachable when ALL post-activation steps succeed.

### 4.2 Failure Scenario

If any of steps 3–5 above (§3.3) throws:
1. `OnboardingFlow.handleComplete()` catch block fires → `setSubmitError(err.message)` shown
2. TENANT JWT is in localStorage (activation succeeded; token is valid)
3. `pendingInviteToken` remains in React state (NOT cleared)
4. Backend invite row has `acceptedAt` set (consumed; NOT reversible from frontend)
5. User sees an error UI that implies the operation failed and can be retried
6. On retry: `activateTenant` called again with same token → backend finds `acceptedAt !== null` → 404 INVALID_INVITE → **permanently stuck**

### 4.3 Contrast: D3 Authenticated Path (Correctly Hardened)

App.tsx lines 4438–4480 (FAM-07D3):
- `setPendingInviteToken(null)` is called in **both success AND failure branches** of the authenticated path
- The hardening pattern was established in FAM-07D3; the new-user path was not retrofitted

### 4.4 Pre-Activation Failure Behavior (Not FC-03 — Safe)

If `activateTenant` itself throws before returning (INVALID_INVITE 404, EMAIL_MISMATCH 403, EXISTING_USER_MUST_SIGN_IN 409, network error):
- `setToken` has NOT been called → no stale JWT
- `pendingInviteToken` remains set → correct (invite was not consumed; retry is valid)
- These are pre-activation failures and are safe

### 4.5 Root Cause

The new-user `onComplete` handler was written before FAM-07D3 established the `setPendingInviteToken(null)` hardening pattern. It was not retrofitted when the D3 authenticated path was hardened.

### 4.6 Minimum Fix (Frontend Only — App.tsx)

Move `setPendingInviteToken(null)` from line 7746 (success-only) to immediately after `activateTenant()` returns (before `setToken` and the bootstrap chain). This is 1 line addition + 1 line removal.

```diff
  const raw = await activateTenant({...}) as any;
+ setPendingInviteToken(null);       // ← clear here: invite consumed, no retry possible
  setToken(raw.token, 'TENANT');
  const me = await getCurrentUser();
  const canonicalTenant = buildTenantSnapshot(me.tenant);
  if (!canonicalTenant) {
    throw new Error('Tenant activation completed but canonical tenant state is unavailable.');
  }
  const bootstrapState = applyTenantBootstrapState(canonicalTenant, me.role ?? null);
  if (!bootstrapState.nextState) {
    throw new Error('Tenant activation descriptor could not be established.');
  }
- setPendingInviteToken(null);       // ← was here: success-only
  setAppState(bootstrapState.nextState);
```

**No backend source changes required.** Backend handler is correct.

---

## §5 — Existing Test Coverage Inventory

### 5.1 Backend Tests: POST /api/tenant/activate

File: `server/src/__tests__/tenant-activate.integration.test.ts`

| Test ID | Describe | Assertion | Status |
|---|---|---|---|
| T-GAP-02 (3 tests) | B-01 — existing user must sign in | `user.findUnique` returns non-null → 409 EXISTING_USER_MUST_SIGN_IN, `withDbContext` not called, no JWT | ✅ |
| T-GAP-03 (2 tests) | B-02 — ALREADY_MEMBER | Existing membership → 409 ALREADY_MEMBER, `memberships.create` not called | ✅ |
| T-GAP-06 (1 test) | B-01 regression | New user: `user.findUnique` null → `withDbContext` called, `statusCode !== 409`, `body.error.code !== EXISTING_USER_MUST_SIGN_IN` | ✅ (partial) |
| T-GAP-07 (1 test) | Invalid invite | `invite.findFirst` null → 404 INVALID_INVITE, `user.findUnique` not called | ✅ |
| S-01 (1 test) | Duplicate pending invite | Invite with no `acceptedAt` exists → 409 INVITE_ALREADY_PENDING | ✅ |
| **Total** | | | **8 tests** |

**Note on T-GAP-06:** This test reaches `withDbContext` and receives a non-409 response, but does NOT assert `statusCode === 200` or validate the response body shape `{ token, user, tenant, membership }`. It exercises the path without shape verification.

### 5.2 Backend Tests: POST /api/tenant/activate-authenticated

17 tests (ACT-AUTH-001 through ACT-AUTH-007 + variants): these cover the authenticated path and are not affected by this unit.

### 5.3 Frontend Tests: `tests/frontend/onboarding-activation.test.tsx`

| Test ID | Target | Assertion | Status |
|---|---|---|---|
| ACT-001 | `ActivationFlow` | EXISTING_USER_MUST_SIGN_IN error state renders | ✅ |
| ACT-002 | `ActivationFlow` | EXISTING_USER_MUST_SIGN_IN hides submit button | ✅ |
| ACT-003 | `ActivationFlow` | EXISTING_USER_MUST_SIGN_IN shows "Sign in to accept" CTA | ✅ |
| ACT-004 | `ActivationFlow` | `onExistingUserSignIn` called when CTA clicked | ✅ |
| ACT-005 | `ActivationFlow` | ALREADY_MEMBER error renders | ✅ |
| ACT-006 | `ActivationFlow` | ALREADY_MEMBER hides submit button | ✅ |
| ACT-007 | `ActivationFlow` | ALREADY_MEMBER shows "Go to workspace" CTA | ✅ |
| ACT-008 | `ActivationFlow` | Generic error renders in error banner | ✅ |
| ACT-009 | `ActivationFlow` | Generic error hides submit button | ✅ |
| ACT-010 | `ActivationFlow` | Validation gate: `onComplete` not called until required fields filled | ✅ |
| ACT-011 | `acceptAuthenticatedInvite` (service) | Calls POST /api/tenant/activate-authenticated with correct payload | ✅ |
| ACT-012 | `acceptAuthenticatedInvite` (service) | Returns response data from endpoint | ✅ |
| **Total** | | | **12 tests** |

**Important scope boundary:** ACT-001 through ACT-010 test the `ActivationFlow` component in isolation by mocking the `onComplete` prop. They do NOT test the actual `onComplete` handler in App.tsx. ACT-011/ACT-012 test `acceptAuthenticatedInvite` service only — not `activateTenant`.

---

## §6 — Missing Launch-Relevant Tests

### 6.1 Backend: POST /api/tenant/activate

| Gap ID | Missing Test | Priority |
|---|---|---|
| T-MISS-01 | Full 200 happy path: response shape validation — `{ token: string, user: { id, email }, tenant: { id, slug, ... }, membership: { role } }` | LAUNCH_CRITICAL |
| T-MISS-02 | EMAIL_MISMATCH → 403 (exists for authenticated path; absent for new-user path) | LAUNCH_CRITICAL |
| T-MISS-03 | Transaction write verification: `memberships.create`, `invite.update({ acceptedAt: now })`, `writeAuditLog({ action: 'user.activated' })` all called within one `withDbContext` invocation | CORE |
| T-MISS-04 | Org status updated to PENDING_VERIFICATION on activation success | CORE |

**Note:** T-MISS-01 and T-MISS-02 are LAUNCH_CRITICAL because they are the primary user safety guarantees for the activation path.

### 6.2 Frontend: `activateTenant` Service and App.tsx Integration

| Gap ID | Missing Test | Priority |
|---|---|---|
| F-MISS-01 | `activateTenant` service function: calls POST /api/tenant/activate with correct payload shape (parallel to ACT-011 for authenticated path) | LAUNCH_CRITICAL |
| F-MISS-02 | `activateTenant` service function: returns `{ token, user, tenant, membership }` from endpoint (parallel to ACT-012) | LAUNCH_CRITICAL |
| F-MISS-03 | FC-03 stale state: `activateTenant` succeeds but `getCurrentUser` throws → `setPendingInviteToken(null)` IS called (verifies the fix) | LAUNCH_CRITICAL (after source fix) |
| F-MISS-04 | App.tsx `onComplete` happy path: activation + bootstrap succeed → `setToken` called, `setAppState` called, `setPendingInviteToken` null | CORE |

**Note:** F-MISS-01/F-MISS-02 can be written against the current service implementation (no source change required). F-MISS-03 depends on the FC-03 source fix being applied first.

---

## §7 — Source Change Required

| Component | Change Required | Scope |
|---|---|---|
| `App.tsx` | Move `setPendingInviteToken(null)` from success-only line 7746 to immediately after `activateTenant()` succeeds (before `setToken`) | 1 line addition + 1 line removal |
| `server/src/routes/tenant.ts` | None | Backend is correct |
| `components/Onboarding/OnboardingFlow.tsx` | None | Error handling is correct at component level |
| `services/tenantService.ts` | None | Service is correct |

**Classification: `FRONTEND_ONLY_HARDENING_REQUIRED`**

The App.tsx source fix is a 1-2 line change. It is unambiguous, isolated, and has no downstream side effects on the backend or service layer.

---

## §8 — Recommended Next Implementation Unit

### Unit name: FAM-07G-NEW-USER-ACTIVATION-FC03-HARDENING-AND-TEST-COVERAGE-001

**Note:** This aligns with the FAM-07C design synthesis which assigned the FC-03 App.tsx fix to FAM-07G. The test coverage from the original FAM-07F scope is also included since tests cannot validate without the source fix being in place.

### Allowlist (Modify)

```
App.tsx
server/src/__tests__/tenant-activate.integration.test.ts
tests/frontend/onboarding-activation.test.tsx
```

### Read-Only References

```
server/src/routes/tenant.ts
services/tenantService.ts
services/apiClient.ts
services/authService.ts
components/Onboarding/OnboardingFlow.tsx
```

### Source Changes

1. **App.tsx** — Move `setPendingInviteToken(null)` before `setToken(raw.token, 'TENANT')` in the ONBOARDING case `onComplete` handler (~2 lines delta)

### Tests to Add

**Backend** (`server/src/__tests__/tenant-activate.integration.test.ts`):
- T-MISS-01: Full 200 happy path with response shape assertion
- T-MISS-02: EMAIL_MISMATCH → 403 for new-user path
- T-MISS-03: Transaction writes (membership.create, invite.update, writeAuditLog) verified in one withDbContext call
- T-MISS-04: Org status PENDING_VERIFICATION verified on success

**Frontend** (`tests/frontend/onboarding-activation.test.tsx`):
- F-MISS-01: `activateTenant` service calls POST /api/tenant/activate with correct payload
- F-MISS-02: `activateTenant` service returns correct response shape
- F-MISS-03: FC-03 guard — `activateTenant` succeeds, `getCurrentUser` throws → `setPendingInviteToken(null)` was called

### Validation Commands

```bash
# Source change type-check
pnpm exec tsc --noEmit

# Backend tests (scoped)
pnpm -C server exec vitest run tenant-activate.integration.test

# Frontend tests (scoped)
pnpm exec vitest run --config vitest.frontend.config.ts tests/frontend/onboarding-activation
```

### Forbidden Actions for Next Unit

- Do NOT touch `components/Onboarding/OnboardingFlow.tsx` (error handling is correct)
- Do NOT touch `services/tenantService.ts`
- Do NOT run migration commands
- Do NOT add new packages
- Do NOT alter existing passing tests
- ToS UI (FAM-07E) and VIEWER InviteMemberForm (FAM-07J) remain out of scope

---

## §9 — Hub Impact Assessment

| Item | Assessment |
|---|---|
| `governance/launch-readiness/LAUNCH-FAMILY-INDEX.md` | NO UPDATE — audit/planning only; no implementation or verification changed launch-readiness truth |
| `governance/launch-readiness/FTR-AUTH-001` tracker | NO UPDATE — FTR-AUTH-001 remains PARTIAL; no source or test changes occurred in this unit |
| `governance/control/NEXT-ACTION.md` | OPTIONAL UPDATE — can be updated to reflect FAM-07G as next authorized unit when implementation is authorized |
| `governance/control/OPEN-SET.md` | OPTIONAL UPDATE — can record FAM-07F audit complete; FAM-07G implementation pending |

**Governance write decision:** `NO_HUB_UPDATE_REQUIRED` for this audit-only unit. NEXT-ACTION.md and OPEN-SET.md updates are deferred to the FAM-07G authorization prompt.

---

## §10 — Boundary Safety Confirmation

| Check | Result |
|---|---|
| Worktree clean at audit start | ✅ CLEAN — `git status --short` showed no modifications |
| HEAD at audit start | `ef025082` |
| Source files modified in this unit | NONE |
| Files created in this unit | `artifacts/control-plane/FAM-07F-ACTIVATION-HARDENING-AND-TEST-COVERAGE-001.md` (this file) |
| Governance tracker files modified | NONE |
| LFI / FTR status changed | NONE |
| Secrets observed or logged | NONE |

---

## §11 — Final Enum

```
FAM_07F_ACTIVATION_HARDENING_AUDIT_COMPLETE_FRONTEND_HARDENING_NEXT
```

**Classification:** `FRONTEND_ONLY_HARDENING_REQUIRED`  
**FTR-AUTH-001 status change:** NONE (remains PARTIAL)  
**FAM-07 LFI status change:** NONE (remains PARTIALLY_IMPLEMENTED)  
**Next unit:** FAM-07G-NEW-USER-ACTIVATION-FC03-HARDENING-AND-TEST-COVERAGE-001

---

*Audit performed at HEAD `ef025082` — 2026-05-29*
