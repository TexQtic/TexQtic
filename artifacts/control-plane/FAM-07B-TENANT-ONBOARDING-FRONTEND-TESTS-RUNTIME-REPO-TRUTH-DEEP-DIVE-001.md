# FAM-07B — Tenant Onboarding & Invite: Frontend, Tests, Runtime Repo-Truth Deep Dive

**Document status:** INVESTIGATION COMPLETE — NO IMPLEMENTATION  
**Companion to:** `artifacts/control-plane/FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md`  
**Authorization scope:** Frontend, tests, runtime investigation only. No source, schema, config, test, or governance files modified.

---

## Section 1 — Task Identity

| Field | Value |
|---|---|
| Task ID | FAM-07B |
| Parent | FAM-07 — Tenant Onboarding and Invite |
| Type | Frontend + Tests + Runtime Repo-Truth Deep Dive |
| Authorization | Narrow investigation only. Do not implement. |
| Artifact write path | `artifacts/control-plane/FAM-07B-TENANT-ONBOARDING-FRONTEND-TESTS-RUNTIME-REPO-TRUTH-DEEP-DIVE-001.md` |
| Commit message | `docs: audit FAM-07 frontend tests runtime repo truth` |

---

## Section 2 — Starting HEAD and Repo State

**HEAD at investigation start:** `50bf5bc`  
**Commit message at HEAD:** `docs: audit FAM-07 backend repo truth` (FAM-07A artifact commit)  
**Repo state:** Clean tree — confirmed via `git status --short` before investigation began  
**FAM-07A artifact:** Present at `artifacts/control-plane/FAM-07A-TENANT-ONBOARDING-BACKEND-REPO-TRUTH-DEEP-DIVE-001.md` ✅

---

## Section 3 — Prerequisite Check for FAM-07A

**Prerequisite status:** SATISFIED

FAM-07A was committed at `50bf5bc`. The artifact is present and the HEAD matches the expected commit. FAM-07B investigation was begun from this clean baseline.

Key FAM-07A findings relied upon in this document:
- **B-01:** Credential bypass for existing users (backend `POST /api/tenant/activate`)
- **B-02:** Unhandled duplicate membership P2002
- **B-03 / HD-001:** SMTP not configured in Vercel production — `SKIPPED_SMTP_UNCONFIGURED` for all invite emails
- **C-01/C-02:** Zero ToS/platform agreement infrastructure (no table, no schema field, no Zod, no route enforcement)
- **FTR-AUTH-001:** No existing-user branch in `activateTenant` route
- **FTR-LEGAL-003:** No ToS acceptance in activation route

---

## Section 4 — Files Inspected

### Frontend / Service Files

| File | Lines Read | Status |
|---|---|---|
| `services/tenantService.ts` | Full (1–220) | COMPLETE |
| `components/Onboarding/OnboardingFlow.tsx` | Full (1–306) | COMPLETE |
| `components/Tenant/InviteMemberForm.tsx` | Full (1–183) | COMPLETE |
| `components/Public/PublicReferralLanding.tsx` | Partial (1–100) | SUFFICIENT — read-only marketing surface confirmed |
| `App.tsx` | Lines 2540–2700, 3720–3780, 7650–7730 (routing + invite handling) | COMPLETE for FAM-07 scope |
| `server/src/config/index.ts` | Full (1–80) | COMPLETE |
| `server/src/services/email/email.service.ts` | Full (1–200) | COMPLETE |

### Test Files

| File | Lines Read | Status |
|---|---|---|
| `server/src/__tests__/control-onboarding-outcome.integration.test.ts` | Full (1–400) | COMPLETE |
| `server/src/__tests__/integration/memberships-invites.rls.db.test.ts` | Full (1–500) | COMPLETE |
| `tests/membership-authz.test.ts` | Lines 1–300 (contract definitions + scenarios) | COMPLETE for FAM-07 scope |
| `tests/runtime-verification-tenant-enterprise.test.ts` | Lines 1–200 (imports, test scope) | SUFFICIENT |

### Search Operations

| Search | Purpose | Result |
|---|---|---|
| `grep_search App.tsx` for `ONBOARDING.*inviteToken\|activateTenant\|pendingInviteToken` | Locate invite activation routing | Found at lines 164, 2560, 3735, 7666–7699 |
| `grep_search` for `accept-invite` (workspace-wide) | Find /accept-invite route handler | No SPA route file — convention via Vercel catch-all + App.tsx useEffect only |
| `grep_search App.tsx` for `KILL_SWITCH\|feature.*flag` | Runtime gate detection | `FeatureFlags` component in ControlPlane only; no gate on activation route |
| `grep_search tests/**` for `OnboardingFlow\|activateTenant\|InviteMember` | Frontend/unit test coverage | No test for `OnboardingFlow` form; `InviteMemberSuccessState` tested |
| `grep_search tests/**` for `activation\|existing.user\|ToS\|duplicate.member` | Critical gap coverage | None — confirmed zero test coverage for B-01, B-02, C-01/C-02 |

---

## Section 5 — Frontend Repo-Truth Findings

### 5.1 — `components/Onboarding/OnboardingFlow.tsx`

**Component exported as:** `ActivationFlow` (primary) + `OnboardingFlow` alias (for backward compatibility)

**Props:**
```typescript
interface ActivationFlowProps {
  onComplete: (_data: any) => void | Promise<void>;
  inviteToken?: string;
  prefilledData?: { orgName?: string; domain?: string; };
}
```

**Internal form state:**
```typescript
const [formData, setFormData] = useState({
  orgName: prefilledData?.orgName || '',
  type: TenantType.B2B,         // default B2B
  industry: '',
  domain: prefilledData?.domain || '',
  inviteToken: inviteToken || '',
  email: '',
  password: '',                  // always present — no existing-user branch
  registrationNumber: '',
  jurisdiction: '',
});
```

**FINDING F-01 (BLOCKER — FTR-AUTH-001):** `password` is in `formData` unconditionally. The Step 2 label is "Create Password" (not "Enter Password" or "Sign In Instead"). There is no conditional path for existing users, no `existingUser: boolean` field, no `authenticatedInviteAcceptance` flag, no "I already have an account" UI branch. The form always collects a new password, mirroring the backend B-01 blocker.

**FINDING F-02 (MVP_CRITICAL — FTR-LEGAL-003):** `formData` has no `tosAccepted`, `tosVersion`, `platformAgreement`, or any legal consent field. There is no Step 5 for ToS acceptance. There is no ToS checkbox on any existing step. The onboarding flow collects zero legal consent signals.

**4-step flow summary:**
| Step | Label | Fields Collected |
|---|---|---|
| 1 | Confirm Your Business Details | orgName, industry |
| 2 | Set Up Your Account | email, password, domain (subdomain) |
| 3 | Select Your Base Activation Path | type (AGGREGATOR / B2B / B2C) |
| 4 | Submit Business Verification | registrationNumber, jurisdiction |

**Step 4 outcome notice** (amber box):
> "Completing activation submits your business for review. Your workspace opens in pending-verification mode until approval is recorded."

No ToS notice is present anywhere in the 4 steps.

**Validation in `handleComplete()`:**
- Validates only `registrationNumber.trim()` and `jurisdiction.trim()` — both must be non-empty
- No client-side validation for ToS acceptance (field does not exist)
- No client-side validation for password strength beyond HTML `minLength={6}`
- `email` field has `required` attribute but no programmatic validation in `handleComplete()`

**`onComplete` call:** Passes full `formData` object to parent without transformation.

### 5.2 — `App.tsx` — Invite/Onboarding Routing

**Initial state resolution (`resolveInitialAppState()`):**
```typescript
const params = new URLSearchParams(globalThis.window.location.search);
const token = params.get('token');
const action = params.get('action');

if (token && action === 'invite') {
  return 'ONBOARDING';   // ← go directly to onboarding on page load
}

if (token) {
  return 'TOKEN_HANDLER'; // ← password reset / email verify path
}
```

**Mount useEffect (invite detection):**
```typescript
useEffect(() => {
  const params = new URLSearchParams(globalThis.window.location.search);
  const token = params.get('token');
  const action = params.get('action');
  if (token && action === 'invite') {
    setPendingInviteToken(token);
    setAppState('ONBOARDING');
  } else if (token) {
    setAppState('TOKEN_HANDLER');
  }
}, []);
```

**FINDING F-03:** `/accept-invite` is NOT a named SPA route in `resolveInitialAppState()`. There is no explicit path check for `/accept-invite`. The flow works because:
1. Vercel's catch-all serves the SPA for any path (including `/accept-invite`)
2. On mount, App.tsx's `useEffect` detects `?token=...&action=invite` query params
3. Sets `pendingInviteToken` state and transitions to `'ONBOARDING'` app state

The `/accept-invite` path is a **URL convention** (from `email.service.ts` constructing invite links) that works via Vercel catch-all routing — NOT a registered SPA route. This is fragile: any future file-based routing or path-aware SPA configuration would break this unless the path is explicitly registered.

**`ONBOARDING` case in render:**
```typescript
case 'ONBOARDING':
  return (
    <OnboardingFlow
      inviteToken={pendingInviteToken ?? undefined}
      onComplete={async (formData: any) => {
        if (pendingInviteToken) {
          const raw = await activateTenant({
            inviteToken: pendingInviteToken,
            userData: { email: formData.email, password: formData.password },
            tenantData: { name: formData.orgName || undefined, industry: formData.industry || undefined },
            verificationData: { registrationNumber: formData.registrationNumber, jurisdiction: formData.jurisdiction },
          }) as any;
          setToken(raw.token, 'TENANT');
          const me = await getCurrentUser();
          const canonicalTenant = buildTenantSnapshot(me.tenant);
          // ...
          setPendingInviteToken(null);
          setAppState(bootstrapState.nextState);
        } else {
          setAppState('EXPERIENCE');
        }
      }}
    />
  );
```

**FINDING F-04:** The `onComplete` handler in `App.tsx` unconditionally passes `formData.password` to `activateTenant()` — no existing-user branch, no `authenticatedInviteAcceptance` path. This is the frontend mirror of backend B-01.

**FINDING F-05:** The `onComplete` handler does not pass any ToS acceptance signal to `activateTenant()`. Even if `ActivateTenantRequest` were to gain a `tosAccepted` field on the backend, the frontend would also need to be updated — there is currently no ToS collection point in the UI.

**FINDING F-06:** The `else { setAppState('EXPERIENCE'); }` branch — when `pendingInviteToken` is null — transitions to EXPERIENCE without calling `activateTenant()`. This branch is unreachable in normal activation flow (since `ONBOARDING` state only set when `?action=invite` is present and token is stored), but represents a silent no-op if somehow reached without a token.

### 5.3 — `components/Tenant/InviteMemberForm.tsx`

**Delivery outcome surfacing:**
```typescript
export function describeInviteCreateDeliveryOutcome(
  email: string,
  emailDelivery: InviteEmailDeliveryOutcome,
): { title: string; detail: string } {
  switch (emailDelivery.status) {
    case 'DEV_LOGGED':
      return { title: 'Invite Recorded', detail: `The invite for ${email} was recorded. Email dispatch was dev-logged only, so no email was sent in this environment.` };
    case 'SKIPPED_SMTP_UNCONFIGURED':
      return { title: 'Invite Recorded', detail: `The invite for ${email} was recorded, but email dispatch was skipped because SMTP is not configured.` };
    case 'FAILED_NON_FATAL':
      return { title: 'Invite Recorded', detail: `The invite for ${email} was recorded, but email dispatch failed non-fatally. Resend the invite after delivery is restored.` };
    case 'SENT':
    default:
      return { title: 'Invite Recorded', detail: `The invite for ${email} was recorded and email dispatch completed successfully.` };
  }
}
```

**FINDING F-07 (SHOULD_FIX_BEFORE_VERIFY — HD-001 frontend surface):** `SKIPPED_SMTP_UNCONFIGURED` is correctly surfaced to the user with a plain-English message: "email dispatch was skipped because SMTP is not configured." However, the invite record IS created in the DB. The user has no self-service action available from this surface — they must manually resend from the `TeamManagement` panel. There is no proactive alert or escalation path. The `InviteMemberSuccessState` component shows only the description text.

**FINDING F-08:** Role selection in `InviteMemberForm` offers four display options mapped to three API roles:
- "Tenant Admin" → ADMIN
- "Seller / Sales Rep" → MEMBER
- "Procurement / Buyer" → MEMBER
- "General Staff" → VIEWER

The VIEWER target role is selectable in the UI (`<option>` present), but the backend route rejects VIEWER as an invite target (returns 422 `VIEWER_INVITE_FORBIDDEN`). This creates a UX inconsistency: a user can select "General Staff" (→ VIEWER) and submit, but the backend will reject it. There is no client-side guard preventing VIEWER selection.

**FINDING F-09:** `document.title` is used in the invite UI amber note: "They will only have access to `{document.title}` data." This renders the browser tab title, not the tenant name. In early/bootstrapped state this could render "TexQtic" (the default document title) rather than the actual tenant name.

### 5.4 — `components/Public/PublicReferralLanding.tsx`

This component is a read-only public marketing surface at `/join/:referral_code`. Per the inline governance comment:

> PROHIBITED: network calls of any kind, form submission or data capture, contact field rendering, CRM/CAE calls, backend referral validation, dangerouslySetInnerHTML, logging or forwarding the referral code to any service.

**FINDING F-10:** `PublicReferralLanding` is NOT part of the activation flow. It is a public discovery surface. Referral code is validated client-side only via `VALID_CODE_RE = /^[a-zA-Z0-9_-]{1,80}$/`. The CTA directs visitors to sign-in (`onSignIn()`). This surface has no integration with `activateTenant()` or `OnboardingFlow`.

### 5.5 — `services/tenantService.ts` — Frontend Service Layer

**`ActivateTenantRequest` interface:**
```typescript
export interface ActivateTenantRequest {
  inviteToken: string;
  userData: { email: string; password: string; };
  tenantData?: { name?: string; industry?: string; };
  verificationData: { registrationNumber: string; jurisdiction: string; };
}
```

**FINDING F-11:** No `tosAccepted`, `tosVersion`, `existingUser`, or `authenticatedInviteAcceptance` field in the frontend service interface. This is consistent with the backend Zod schema finding from FAM-07A.

**Membership CRUD surface (complete):**

| Function | Method | Path | Role Restriction |
|---|---|---|---|
| `getMemberships()` | GET | `/api/tenant/memberships` | OWNER/ADMIN/MEMBER (VIEWER denied) |
| `createMembership()` | POST | `/api/tenant/memberships` | OWNER/ADMIN only |
| `revokePendingInvite(id)` | DELETE | `/api/tenant/memberships/invites/:id` | OWNER/ADMIN only |
| `resendPendingInvite(id)` | POST | `/api/tenant/memberships/invites/:id/resend` | OWNER/ADMIN only |
| `editPendingInvite(id, req)` | PATCH | `/api/tenant/memberships/invites/:id` | OWNER/ADMIN only |
| `updateMembershipRole(id, role)` | PATCH | `/api/tenant/memberships/:id` | OWNER only |

**`CreateMembershipResponse`:**
```typescript
export interface CreateMembershipResponse {
  invite: { id: string; email: string; role: string; expiresAt: string; };
  inviteToken: string;
  emailDelivery: InviteEmailDeliveryOutcome;
}
```

**FINDING F-12:** `InviteEmailDeliveryOutcome` is correctly propagated from backend → frontend service → `InviteMemberForm` UI. All four `InviteEmailDeliveryStatus` values (`DEV_LOGGED`, `SKIPPED_SMTP_UNCONFIGURED`, `SENT`, `FAILED_NON_FATAL`) are handled in the UI switch statement.

---

## Section 6 — Frontend API Contract Findings

### 6.1 — Activation API Contract

**Frontend sends (via `activateTenant()` → `POST /api/tenant/activate`):**
```json
{
  "inviteToken": "<string>",
  "userData": { "email": "<string>", "password": "<string>" },
  "tenantData": { "name": "<string|undefined>", "industry": "<string|undefined>" },
  "verificationData": { "registrationNumber": "<string>", "jurisdiction": "<string>" }
}
```

**Frontend expects in response:**
```typescript
{
  token: string;
  user: { id: string; email: string; };
  tenant: { id: string; name: string; slug: string; type: string; tenant_category?: string|null; is_white_label?: boolean; status: string; plan: CommercialPlan; };
  membership: { role: string; };
}
```

**FINDING FC-01:** No ToS field in request — consistent with FAM-07A B-01/C-01. No existing-user detection mode in request structure.

**FINDING FC-02:** Backend B-02 (duplicate membership P2002) would manifest to the frontend as an unhandled 500 `INTERNAL_ERROR`. The `activateTenant()` service function propagates any `APIError`. The `handleComplete()` in `OnboardingFlow` catches `err?.message || 'Activation failed. Please try again.'` and displays it in `submitError`. However, a 500 with `INTERNAL_ERROR` code would show a generic message, not a user-actionable explanation.

### 6.2 — Token Storage on Activation

On successful activation, `App.tsx` calls `setToken(raw.token, 'TENANT')`. Then `getCurrentUser()` is called immediately after to establish the session. If `getCurrentUser()` fails post-activation (e.g., token not yet propagated), the error would throw and surface in `submitError` via the try/catch in `onComplete`, but the token would already be written to localStorage.

**FINDING FC-03:** Token is stored (`setToken`) before `getCurrentUser()` is called. If `getCurrentUser()` fails after token storage, the user is in an inconsistent state: token stored, app in ONBOARDING state, no session established. There is no rollback of the stored token on `getCurrentUser()` failure.

---

## Section 7 — Test Repo-Truth Findings

### 7.1 — `server/src/__tests__/control-onboarding-outcome.integration.test.ts`

**Test runner:** Vitest with Fastify inject (no live DB, mocked Prisma)

**Tests covered:**
| Test | Description |
|---|---|
| Status transition + audit | PENDING_VERIFICATION → VERIFICATION_APPROVED |
| Duplicate outcome rejection | Returns 409 + ONBOARDING_STATUS_CONFLICT |
| Archive tenant | Moves org + tenant to CLOSED; writes audit |
| Activate approved tenant | VERIFICATION_APPROVED → ACTIVE (both tables) |
| RBAC: non-SUPER_ADMIN outcome | Returns 403 FORBIDDEN |
| RBAC: non-SUPER_ADMIN activate-approved | Returns 403 FORBIDDEN |

**FINDING T-01:** This test file covers control-plane administrative operations on onboarding outcomes. It does **not** test invite acceptance, activation by invitee, existing-user handling, duplicate membership creation, or ToS acceptance. All tests mock Prisma via `vi.hoisted()`.

### 7.2 — `server/src/__tests__/integration/memberships-invites.rls.db.test.ts`

**Test runner:** Vitest with real PrismaClient, real DB (gated by `hasDb`)  
**Test gate:** `describe.skipIf(!hasDb)` — skips all tests when live DB is unavailable

**Tests covered (GATE D.1 — RLS Enforcement):**
| Test | Description |
|---|---|
| Org A sees only Org A memberships | RLS isolation |
| Org B sees only Org B memberships | RLS isolation |
| Cross-tenant isolation: Org A cannot see Org B | RLS cross-tenant |
| Org A sees only Org A invites | Invites RLS |
| Org B cannot see Org A invites | Invites RLS cross-tenant |
| Missing context: error for membership query | Fail-closed |
| Missing context: error for invite query | Fail-closed |
| No context bleed: A → B → A transitions | Pooler safety |

**FINDING T-02:** These tests verify DB-level RLS isolation for memberships and invites using `withDbContext` / `withBypassForSeed`. They require a live database and are skipped without one. They do **not** test the activation/invite acceptance route, credential bypass, duplicate membership at the application layer, or ToS.

**FINDING T-03:** The `withBypassForSeed` function uses service-role bypass for test data seeding. All RLS tests correctly clean up via `deleteMany` after each test, verifying isolation is maintained across queries.

### 7.3 — `tests/membership-authz.test.ts`

**Test runner:** Vitest, pure logic (no DB, no server)

**Tests covered:**
- `canInviteMember()`: OWNER/ADMIN allowed; MEMBER/VIEWER denied
- `canInviteAsRole()`: OWNER/ADMIN/MEMBER allowed; VIEWER denied (VIEWER_TRANSITION_OUT_OF_SCOPE)
- `evaluateMembershipInviteIssuance()`: full issuance outcome (allowed / forbidden / unauthorized / VIEWER rejection)
- `evaluatePendingInviteRevocation()`: OWNER/ADMIN guard + INVITE_NOT_PENDING + INVITE_NOT_FOUND
- `evaluatePendingInviteResend()`: resend rules (pending-only, OWNER/ADMIN guard)
- `evaluatePendingInviteEdit()`: role edit rules
- `sendInviteMemberEmail()` email dispatch: DEV_LOGGED, SKIPPED_SMTP_UNCONFIGURED, SMTP send, SMTP failure
- Role transition enforcement: sole-OWNER invariant, VIEWER promotion blocked, same-org scoping

**FINDING T-04:** `sendInviteMemberEmail` is tested with all four dispatch outcomes. The SMTP unconfigured scenario is confirmed as a non-fatal graceful fallback — invite is considered successfully issued even when email is not sent.

**FINDING T-05:** No test covers the `POST /api/tenant/activate` route handler logic (invitee activation, existing user detection, duplicate membership creation). The backend activation tests (FAM-07A) confirmed these gaps; this frontend audit confirms no frontend/integration tests fill the gap.

**FINDING T-06:** No test covers ToS acceptance (no such field exists in any data structure tested).

### 7.4 — `tests/runtime-verification-tenant-enterprise.test.ts`

**Test runner:** Vitest, mixed pure + SSR (`renderToStaticMarkup`)

**Coverage relevant to FAM-07:**
- `InviteMemberSuccessState`: rendered and asserted for all four delivery outcomes
- `canInviteMembers('OWNER')` → true; `canInviteMembers('ADMIN')` → true
- `getPendingInviteDeliveryOutcomeMessage`, `getInitialRoleSelection`, `getValidInviteRoles`, `getValidNextRoles`, `removePendingInviteById`, `replacePendingInviteById` — `TeamManagement` contract functions tested

**FINDING T-07:** `InviteMemberSuccessState` rendering is tested in `runtime-verification-tenant-enterprise.test.ts` at line 547. The success state component is imported from `components/Tenant/InviteMemberForm` and rendered with each delivery status.

**FINDING T-08:** `OnboardingFlow` / `ActivationFlow` is NOT imported or tested in any frontend test file found. The 4-step activation form has **zero test coverage** in the test suite.

### 7.5 — Test Coverage Summary for FAM-07 Surfaces

| Surface | Test Coverage | Notes |
|---|---|---|
| `ActivationFlow` (4-step form) | ❌ NONE | Zero tests |
| `activateTenant()` service call path | ❌ NONE | Not tested end-to-end |
| Existing-user credential bypass (B-01) | ❌ NONE | Gap in both frontend and backend tests |
| Duplicate membership P2002 (B-02) | ❌ NONE | No route-level test |
| `InviteMemberForm` / `InviteMemberSuccessState` | ✅ Partial | Render tested; submit flow not tested |
| Membership CRUD authorization | ✅ Comprehensive | `membership-authz.test.ts` (pure logic) |
| Invite RLS isolation | ✅ DB-level | `memberships-invites.rls.db.test.ts` (skipIf !hasDb) |
| ToS acceptance | ❌ NONE | Not implemented — nothing to test |
| Control-plane onboarding outcome | ✅ Comprehensive | `control-onboarding-outcome.integration.test.ts` |

---

## Section 8 — Runtime / Production Readiness Findings

### 8.1 — Server Config (`server/src/config/index.ts`)

**FINDING R-01 (KILL_SWITCH_ALL):** `KILL_SWITCH_ALL` env var (default `false`) kills all non-`/health` endpoints if set to `true`. Effect on activation: `POST /api/tenant/activate`, `POST /api/tenant/memberships`, and all invite CRUD endpoints return 503 with `KILL_SWITCH_ACTIVE`. This is the only server-level production gate on these routes.

**FINDING R-02 (SMTP optional):** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` are all optional in the config schema. No startup validation fail if absent.

**FINDING R-03 (APPROVED_ONBOARDING_SERVICE_TOKEN_HASH):** Optional 64-char opaque token hash. Used by the approved onboarding provisioning webhook. If absent, the CRM acquisition webhook handler cannot authenticate. Value must be set for CRM-driven tenant provisioning to work in production.

**FINDING R-04 (GEMINI_API_KEY):** Required — will fail validation at startup if absent. Not relevant to FAM-07 activation path directly, but required for server to start.

**FINDING R-05 (FRONTEND_URL):** Non-fatal config. If `FRONTEND_URL` env var is invalid or missing, server falls back to `https://app.texqtic.com`. Affects invite email link construction.

### 8.2 — Email Service (`server/src/services/email/email.service.ts`)

**FINDING R-06 (Production SMTP path):**

```
Production + SMTP configured  → nodemailer send → 'SENT'
Production + SMTP not set     → console.warn + return 'SKIPPED_SMTP_UNCONFIGURED'
Development / test            → console.log + return 'DEV_LOGGED'
SMTP send failure (production) → console.error + re-throw
```

**HD-001 confirmation:** In Vercel production without `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` set, the email service returns `'SKIPPED_SMTP_UNCONFIGURED'` for every invite email. The invite record IS created in the DB. The invitee receives no email. The SMTP unconfigured condition is checked at send time via `isSmtpConfigured()` — not at startup.

**FINDING R-07 (SMTP send failure handling):** If SMTP is configured but send fails (network/auth error), the service re-throws the error. The membership route caller (`sendInviteMemberEmail`) wraps this in a try/catch and returns `'FAILED_NON_FATAL'` — invite record is preserved, error is logged, route returns 201 with `emailDelivery.status = 'FAILED_NON_FATAL'`.

### 8.3 — `/accept-invite` URL Route

**FINDING R-08:** `/accept-invite` is NOT a named SPA route. It is a URL convention generated by `email.service.ts` when constructing invite links:

```typescript
inviteLink = `${FRONTEND_URL}/accept-invite?token=${encodeURIComponent(inviteToken)}&action=invite`
```

The invite link works via:
1. Vercel catch-all routing: any unrecognized path → serves `index.html` (SPA entry)
2. `resolveInitialAppState()`: reads `?token=` and `?action=invite` → returns `'ONBOARDING'`
3. Mount `useEffect`: detects `?action=invite` → `setPendingInviteToken(token)` + `setAppState('ONBOARDING')`

The `?action=invite` query param is what drives the correct routing branch. Without it, a token-only URL routes to `'TOKEN_HANDLER'` (password reset / email verify flow).

**FINDING R-09:** The `/accept-invite` path has no special treatment in `resolveInitialAppState()`. If a user navigates to `/accept-invite` without a `?token=` param (e.g., direct navigation, expired link, query string stripped), `resolveInitialAppState()` would fall through to `'PUBLIC_NOT_FOUND'` (for any non-root, non-recognized path without a token). This is correct behavior.

### 8.4 — Feature Flags

**FINDING R-10:** There are no feature flags gating the activation route or onboarding flow at the frontend level. `FeatureFlags` is a ControlPlane admin UI component (`components/ControlPlane/FeatureFlags`). The only server-level gate is `KILL_SWITCH_ALL`. There is no per-feature gate on invite acceptance, activation, or onboarding.

### 8.5 — `ONBOARDING_CONTINUATION` App State

**FINDING R-11:** `AppState` type includes `'ONBOARDING_CONTINUATION'` as a valid state. Investigation did not find any code path that sets `appState` to `'ONBOARDING_CONTINUATION'`. It appears to be a reserved/placeholder state for a continuation flow (e.g., re-entering onboarding after partial completion). It is not triggered by the current invite activation path.

---

## Section 9 — FTR-AUTH-001 Frontend/Tests/Runtime Assessment

**FTR-AUTH-001:** Credential bypass for existing users (backend + frontend)

### Frontend surface (F-01, F-04):

| Surface | Finding |
|---|---|
| `OnboardingFlow` Step 2 label | "Create Password" — unconditional; no "Sign In Instead" branch |
| `formData` state | No `existingUser` field, no `authenticatedInviteAcceptance` mode |
| `App.tsx` `onComplete` | Always passes `formData.password` to `activateTenant()` — no branch |
| `ActivateTenantRequest` interface | No `existingUser` or `signInFirst` field |

**Severity (frontend):** The frontend is structurally incapable of signaling "this invitee already has an account." Even if the backend were fixed to validate credentials for existing users, the frontend would need a new UX path (detection → sign-in prompt → authenticated acceptance).

### Test coverage:
- No unit or integration test covers the scenario where `activateTenant()` is called for an email address that already exists in the `user` table.
- No test verifies that an existing user cannot activate with a wrong password.

### Runtime:
- No feature flag or environment switch to enable an existing-user branch.

**FTR-AUTH-001 status (frontend/tests/runtime):** BLOCKER — frontend has no existing-user handling; zero test coverage; no runtime gate.

---

## Section 10 — FTR-LEGAL-003 Frontend/Tests/Runtime Assessment

**FTR-LEGAL-003:** Platform Terms of Service / legal agreement acceptance

### Frontend surface (F-02, F-05, F-11):

| Surface | Finding |
|---|---|
| `OnboardingFlow` formData | No `tosAccepted`, `tosVersion`, `platformAgreement` field |
| `OnboardingFlow` UI | No ToS step, no ToS checkbox, no ToS link displayed |
| `App.tsx` `onComplete` | Does not pass any ToS signal to `activateTenant()` |
| `ActivateTenantRequest` interface | No ToS field |
| Backend (confirmed FAM-07A) | No `tos_acceptances` table, no Zod schema field, no route enforcement |

**Severity (frontend):** Full zero-infrastructure status — not a stub or placeholder, not behind a feature flag. ToS acceptance has no representation in the frontend codebase at any layer.

### Test coverage:
- Zero tests for ToS acceptance. No test file references `tosAccepted`, `tosVersion`, or `tos_acceptances`.

### Runtime:
- No feature flag or environment gate. No ToS URL configured anywhere in the frontend.

**FTR-LEGAL-003 status (frontend/tests/runtime):** MVP_CRITICAL — zero frontend infrastructure; zero test coverage; no runtime gate.

**TTP HOLD_FOR_COUNSEL_FEEDBACK:** This TTP remains in effect. No ToS implementation should proceed until counsel review is complete. This section documents the current zero state as required for the investigation record.

---

## Section 11 — SMTP / HD-001 Frontend/Tests/Runtime Assessment

**HD-001:** SMTP not configured in Vercel production — invite emails not delivered

### Frontend surface (F-07, F-12):

The frontend correctly handles all four `InviteEmailDeliveryStatus` values:

| Status | UI message to user |
|---|---|
| `SENT` | "invite was recorded and email dispatch completed successfully" |
| `DEV_LOGGED` | "Email dispatch was dev-logged only, so no email was sent in this environment." |
| `SKIPPED_SMTP_UNCONFIGURED` | "email dispatch was skipped because SMTP is not configured." |
| `FAILED_NON_FATAL` | "email dispatch failed non-fatally. Resend the invite after delivery is restored." |

**FINDING HD-F-01:** The frontend correctly surfaces `SKIPPED_SMTP_UNCONFIGURED` to the user with a plain-English message. The UI is prepared for the production SMTP gap.

**FINDING HD-F-02:** When `SKIPPED_SMTP_UNCONFIGURED`, the invite record exists in the DB (confirmed FAM-07A). The invitee has no email. The only recovery path is: admin uses `TeamManagement` → resends invite → which again goes through the same email service → also returns `SKIPPED_SMTP_UNCONFIGURED` until SMTP is configured. There is no proactive UI alert or admin escalation path built into the frontend for this condition.

**FINDING HD-F-03 (FTR-AUTH-004 related):** The invite email itself uses raw inline HTML template (confirmed FAM-07A — `sendInviteMemberEmail` in `email.service.ts`/`memberships.service.ts`). No branded email template, no TexQtic logo, no unsubscribe link. This is a `SHOULD_FIX_BEFORE_VERIFY` item.

### Test coverage (T-04):
`membership-authz.test.ts` tests `sendInviteMemberEmail` with `SKIPPED_SMTP_UNCONFIGURED`:
```typescript
const { sendInviteMemberEmail, createTransportMock } = await loadEmailService({
  SMTP_HOST: undefined, SMTP_USER: undefined, SMTP_PASS: undefined, SMTP_FROM: undefined
});
const result = await sendInviteMemberEmail('invitee@acme.test', 'invite-token-2', 'Acme');
// expects: status = 'SKIPPED_SMTP_UNCONFIGURED'
```
This confirms the SMTP-unconfigured graceful fallback path is unit-tested.

### Runtime (R-02, R-06):
- All four SMTP env vars must be set for production delivery
- SMTP is checked at send time (not at startup)
- `SKIPPED_SMTP_UNCONFIGURED` is the confirmed production behavior until SMTP is configured in Vercel

**HD-001 status:** INFRA_PREREQUISITE — SMTP must be configured in Vercel before invite email delivery works. Frontend is prepared (correct delivery outcome surfacing). Backend graceful fallback is tested. Blocker is purely infrastructure.

---

## Section 12 — Verification Implications

This section records how the FAM-07B findings affect the FAM-07 verification path.

### 12.1 — Mandatory frontend changes before FAM-07 can be verified

The following frontend gaps must be resolved (alongside their backend counterparts) before FAM-07 can be marked VERIFIED_COMPLETE:

| ID | Gap | Severity |
|---|---|---|
| FTR-AUTH-001-FE | No existing-user detection or `authenticatedInviteAcceptance` mode in `OnboardingFlow` | BLOCKER |
| FTR-AUTH-001-FE-APP | `App.tsx` `onComplete` always sends `password` without existing-user branch | BLOCKER |
| FTR-LEGAL-003-FE | Zero ToS UI infrastructure in `OnboardingFlow` | MVP_CRITICAL |
| FTR-LEGAL-003-FE-INTERFACE | No ToS field in `ActivateTenantRequest` frontend interface | MVP_CRITICAL |
| HD-001-INFRA | SMTP not configured in Vercel | INFRA_PREREQUISITE |
| VIEWER-INVITE-UI | UI allows VIEWER selection in `InviteMemberForm` but backend rejects it | SHOULD_FIX |
| FC-03 | Token stored before `getCurrentUser()` — no rollback on post-activation failure | SHOULD_FIX |
| FTR-AUTH-004-FE | No branded email template (raw HTML inline) | SHOULD_FIX_BEFORE_VERIFY |

### 12.2 — Test gaps that must be addressed before FAM-07 verification

| ID | Gap | Required action |
|---|---|---|
| T-GAP-01 | No test for `ActivationFlow` 4-step form | Add unit/integration tests |
| T-GAP-02 | No test for existing-user credential bypass (B-01) | Add after FTR-AUTH-001 is fixed |
| T-GAP-03 | No test for duplicate membership P2002 handling (B-02) | Add after B-02 is fixed |
| T-GAP-04 | No test for ToS acceptance in activation | Add after FTR-LEGAL-003 is implemented |

---

## Section 13 — Candidate Frontend/Test/Runtime Implementation Surfaces

These are the surfaces that would need to change when the blockers identified above are eventually authorized and implemented. **Nothing is being changed in this document.**

### 13.1 — FTR-AUTH-001 frontend implementation surfaces

| Surface | Change required |
|---|---|
| `components/Onboarding/OnboardingFlow.tsx` | Add existing-user detection mode; `authenticatedInviteAcceptance` flow; conditional Step 2 (sign-in vs create-password) |
| `services/tenantService.ts` | Add `existingUser?: boolean` or `authenticatedInviteAcceptance?: boolean` to `ActivateTenantRequest` |
| `App.tsx` — `onComplete` handler | Add conditional branch: if existing user → sign-in flow before activation |

### 13.2 — FTR-LEGAL-003 frontend implementation surfaces

| Surface | Change required |
|---|---|
| `components/Onboarding/OnboardingFlow.tsx` | Add ToS acceptance step (Step 5 or inline in Step 4); add `tosAccepted` field to formData |
| `services/tenantService.ts` | Add `tosAccepted: boolean; tosVersion: string` to `ActivateTenantRequest` |
| `App.tsx` — `onComplete` | Pass ToS data to `activateTenant()` |

### 13.3 — HD-001 runtime implementation surfaces

| Surface | Change required |
|---|---|
| Vercel environment variables | Set `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` |
| `server/src/services/email/email.service.ts` | No code change needed — SMTP path already implemented |

### 13.4 — VIEWER invite UX fix

| Surface | Change required |
|---|---|
| `components/Tenant/InviteMemberForm.tsx` | Remove VIEWER from role options or add client-side guard |

### 13.5 — Test implementation surfaces

| Test file | Tests to add |
|---|---|
| New: `tests/activation-flow.test.ts` | Cover 4-step form validation, `handleComplete()`, existing-user branch (once implemented), ToS field (once implemented) |
| New: `server/src/__tests__/tenant-activate.integration.test.ts` | Cover B-01 (existing user), B-02 (duplicate membership), token expiry, invalid token |

---

## Section 14 — No-Implementation Confirmation

**Confirmed:** This investigation document does not implement, modify, or create any of the following:

- No source files were modified (`.tsx`, `.ts`, `.ts` services, routes, middleware)
- No test files were modified or created
- No schema changes (`schema.prisma`, migrations)
- No config changes (`.env`, `server/src/config/index.ts`)
- No governance files modified (`LAUNCH-FAMILY-INDEX.md`, `FUTURE-TODO-REGISTER.md`, `NEXT-ACTION.md`, `OPEN-SET.md`)
- FAM-07 status is NOT advanced — remains NOT_ASSESSED in LFI
- FTR-AUTH-001, FTR-LEGAL-003, FTR-AUTH-004, HD-001 remain NOT_IMPLEMENTED
- TTP `HOLD_FOR_COUNSEL_FEEDBACK` remains in effect and unchanged
- No package.json or pnpm-related changes
- No Prisma commands executed

Only one file is being created: this artifact at `artifacts/control-plane/FAM-07B-TENANT-ONBOARDING-FRONTEND-TESTS-RUNTIME-REPO-TRUTH-DEEP-DIVE-001.md`.

---

## Section 15 — Completion Checklist

- [x] Starting HEAD and repo state confirmed (`50bf5bc`, clean tree)
- [x] FAM-07A artifact confirmed present
- [x] `services/tenantService.ts` — full read complete
- [x] `components/Onboarding/OnboardingFlow.tsx` — full read complete (all 4 steps documented)
- [x] `components/Tenant/InviteMemberForm.tsx` — full read complete
- [x] `components/Public/PublicReferralLanding.tsx` — read confirmed (not part of activation flow)
- [x] `App.tsx` — invite routing (`resolveInitialAppState`, useEffect, ONBOARDING case) confirmed
- [x] `/accept-invite` route search complete (not a SPA route — Vercel catch-all convention confirmed)
- [x] `server/src/config/index.ts` — SMTP, KILL_SWITCH, env vars documented
- [x] `server/src/services/email/email.service.ts` — production SMTP path confirmed
- [x] `server/src/__tests__/control-onboarding-outcome.integration.test.ts` — full read complete
- [x] `server/src/__tests__/integration/memberships-invites.rls.db.test.ts` — full read complete
- [x] `tests/membership-authz.test.ts` — coverage scope confirmed
- [x] `tests/runtime-verification-tenant-enterprise.test.ts` — coverage scope confirmed
- [x] Feature flag search complete (no feature flag on activation routes)
- [x] FTR-AUTH-001 frontend/tests/runtime assessment complete
- [x] FTR-LEGAL-003 frontend/tests/runtime assessment complete
- [x] HD-001 frontend/tests/runtime assessment complete
- [x] No-implementation confirmation recorded
- [x] Artifact created at allowlisted path
- [ ] Validation commands run
- [ ] Commit executed

---

## Section 16 — Commit Instructions

```powershell
# 1. Verify only the artifact is staged
git status --short
# Expected: ?? artifacts/control-plane/FAM-07B-...

# 2. Verify content
git diff -- "artifacts/control-plane/FAM-07B-TENANT-ONBOARDING-FRONTEND-TESTS-RUNTIME-REPO-TRUTH-DEEP-DIVE-001.md"

# 3. Spot-check required sections present
Select-String -Path "artifacts/control-plane/FAM-07B-TENANT-ONBOARDING-FRONTEND-TESTS-RUNTIME-REPO-TRUTH-DEEP-DIVE-001.md" -Pattern "OnboardingFlow|InviteMemberForm|tenantService|FTR-AUTH-001|FTR-LEGAL-003|SMTP|no implementation|not advanced|FAM_07B_TENANT_ONBOARDING_FRONTEND_TESTS_RUNTIME_REPO_TRUTH_COMPLETE"

# 4. Stage
git add -f "artifacts/control-plane/FAM-07B-TENANT-ONBOARDING-FRONTEND-TESTS-RUNTIME-REPO-TRUTH-DEEP-DIVE-001.md"

# 5. Verify staging — must show ONLY this file
git status --short
# Expected: A  artifacts/control-plane/FAM-07B-...

# 6. Commit
git commit -m "docs: audit FAM-07 frontend tests runtime repo truth"

# 7. Verify commit
git show --stat HEAD
```

---

## Section 17 — Final Enum

```
FAM_07B_TENANT_ONBOARDING_FRONTEND_TESTS_RUNTIME_REPO_TRUTH_COMPLETE
```

**Investigation result:** COMPLETE. All required frontend, test, and runtime surfaces for FAM-07 have been inspected and documented. The findings confirm and extend the backend blockers identified in FAM-07A. No implementation was performed. FAM-07 remains in NOT_ASSESSED state pending authorized remediation of the identified blockers.
