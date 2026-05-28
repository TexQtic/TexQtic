# FAM-07D3 — Tenant Onboarding: Authenticated Invite Acceptance

**Unit ID:** FAM-07D3-TENANT-ONBOARDING-AUTHENTICATED-INVITE-ACCEPTANCE-001  
**Family:** FAM-07 — Tenant Onboarding and Invite  
**Status:** VERIFIED_COMPLETE  
**Date:** 2026-05-28  
**Authorization:** Paresh Patel (prior session — FAM-07 bounded implementation unit, sign-in-first flow completion)  
**Enum:** `FAM_07D3_AUTHENTICATED_INVITE_ACCEPTANCE_COMPLETE`

---

## 1. Objective

Complete the FAM-07 sign-in-first flow by implementing authenticated invite acceptance after login. When an invited user (existing TexQtic account) signs in from the onboarding invite flow, their pending invite token is preserved in App.tsx state (`pendingInviteToken`). This unit wires the post-login path that consumes that token, accepts the invite, and provisions the membership on the invited tenant — without requiring the user to navigate back to the invite link.

**Preconditions consumed:**
- FAM-07D1: B-01 EXISTING_USER_MUST_SIGN_IN backend gate (redirect to sign-in, preserve token)
- FAM-07D2: Frontend sign-in-first UX (pendingInviteToken preserved in App.tsx state, navigates to AUTH)

---

## 2. Files Changed

| File | Change |
|---|---|
| `server/src/routes/tenant.ts` | New endpoint: `POST /api/tenant/activate-authenticated` |
| `server/src/__tests__/tenant-activate.integration.test.ts` | 7 new integration tests (ACT-AUTH-001..007); `membership.findFirst` added to prismaMock; `jsonwebtoken` import + `makeTestTenantToken` helper |
| `services/tenantService.ts` | New function: `acceptAuthenticatedInvite` |
| `App.tsx` | Import updated; `handleAuthSuccess` TENANT path wired to accept pending invite after sign-in |
| `tests/frontend/onboarding-activation.test.tsx` | Import updated; `vi.mock` for apiClient; 2 new service tests (ACT-011, ACT-012) |

---

## 3. Backend Endpoint: `POST /api/tenant/activate-authenticated`

**Auth pattern:** Inline `request.tenantJwtVerify({ onlyCookie: false })` — NOT `tenantAuthMiddleware`. Invited users are not yet members of the target tenant, so `tenantAuthMiddleware` would return 403 (it calls `getUserMembership` which fails for non-members).

**Request body:** `{ inviteToken: string }`

**Processing sequence:**

1. Inline JWT verify — returns 401 if missing/invalid
2. Extract `authenticatedUserId` from `request.user.userId`
3. Validate `inviteToken` (Zod, min 1)
4. Hash token (SHA-256) → look up `invite` (not accepted, not expired, include tenant.memberships)
5. Look up authenticated user by `authenticatedUserId` → get email
6. Email match check (normalized lowercase) → 403 EMAIL_MISMATCH if mismatch
7. Duplicate membership guard → 409 ALREADY_MEMBER if exists
8. Resolve role: promote to OWNER if no OWNER exists in tenant yet
9. Atomic transaction: `membership.create` + `invite.update(acceptedAt)` + `writeAuditLog`
10. `resolveTenantSessionIdentity` (second `withDbContext` call internally)
11. `reply.tenantJwtSign({ userId, tenantId: invite.tenantId, role })`
12. Return `{ token, user, tenant, membership }`

**Error codes:**

| Code | Status | Condition |
|---|---|---|
| — | 401 | No/invalid JWT |
| INVALID_INVITE | 404 | Invite not found or expired |
| EMAIL_MISMATCH | 403 | Invite email ≠ authenticated user email |
| ALREADY_MEMBER | 409 | User already has membership on invite tenant |
| INTERNAL_ERROR | 500 | Unexpected failure |

---

## 4. Frontend Service: `acceptAuthenticatedInvite`

Added to `services/tenantService.ts`:

```typescript
export async function acceptAuthenticatedInvite(
  request: { inviteToken: string }
): Promise<ActivateTenantResponse> {
  return post<ActivateTenantResponse>('/api/tenant/activate-authenticated', request);
}
```

Response shape is identical to `ActivateTenantResponse` (same as `activateTenant`).

---

## 5. App.tsx: `handleAuthSuccess` TENANT Path

After `tenantRestorePending` is cleared and `nextState` is resolved from bootstrap, the TENANT path now checks for a pending invite token:

- If `pendingInviteToken` is present: calls `acceptAuthenticatedInvite`, stores new tenant JWT via `setToken(inviteResult.token, 'TENANT')`, re-bootstraps with invite tenant's identity
- `ALREADY_MEMBER`: soft error — clears token, proceeds to `nextState` (existing workspace)
- `EMAIL_MISMATCH`: fail-close with user message
- `INVALID_INVITE`: fail-close with user message
- Other errors: fail-close with generic message
- `setPendingInviteToken(null)` always called to prevent loop

---

## 6. Tests

### Backend Integration Tests (ACT-AUTH-001..007)

| Test | Scenario | Expected |
|---|---|---|
| ACT-AUTH-001 | No Authorization header | 401 |
| ACT-AUTH-002 | Invalid JWT in header | 401 |
| ACT-AUTH-003 | Valid JWT, invite not found | 404 INVALID_INVITE |
| ACT-AUTH-004 | Valid JWT, email mismatch | 403 EMAIL_MISMATCH |
| ACT-AUTH-005 | Valid JWT, already member | 409 ALREADY_MEMBER |
| ACT-AUTH-006 | Happy path — success | 200 + token/user/tenant/membership |
| ACT-AUTH-007 | Happy path — side effects | withDbContext called, membership.create, invite.update, writeAuditLog |

**JWT generation in tests:** `makeTestTenantToken(userId, tenantId, role)` using `jsonwebtoken.sign` directly with the test secret `'tenant-jwt-test-secret-key-min-32-chars'`. (Note: `app.tenantJwtSign` is a reply decoration, not an app method.)

### Frontend Service Tests (ACT-011..012)

| Test | Scenario |
|---|---|
| ACT-011 | Calls `POST /api/tenant/activate-authenticated` with correct payload |
| ACT-012 | Returns response data from API |

---

## 7. Validation Evidence

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | EXIT 0 |
| Backend tests (`tenant-activate.integration.test.ts`) | 17/17 PASS (10 existing + 7 new) |
| Frontend tests (`onboarding-activation.test.tsx`) | 12/12 PASS (10 existing + 2 new) |
| ESLint (changed files) | No new errors/warnings (1 pre-existing error at App.tsx:2395 `setInvoiceApprovalTradeId` — pre-existing, out of scope) |
| `git status --short` | 5 files modified — exactly allowlist |

---

## 8. Governance Constraints Observed

- `server/prisma/schema.prisma` — NOT modified
- Migration files — NOT touched
- `package.json` (any) — NOT modified
- `.env` / env files — NOT touched
- `LAUNCH-FAMILY-INDEX.md` — NOT modified
- `FUTURE-TODO-REGISTER.md` — NOT modified
- FAM-07 family NOT advanced to VERIFIED_COMPLETE
- No ToS/legal, no SMTP, no password handling in new endpoint
- `org_id` tenancy isolation maintained throughout

---

## 9. Risks and Follow-up

- **Re-bootstrap after invite acceptance:** If `resolveTenantSessionIdentity` or `getCurrentUser` fails after invite acceptance, `App.tsx` falls back to `nextState` (the original sign-in tenant). This is intentional — prevents a broken invite from blocking the user entirely. Follow-up: consider surfacing a non-blocking notification if invite acceptance completes but re-bootstrap fails.
- **ALREADY_MEMBER soft handling:** User is silently routed to their existing workspace. This is correct behavior — no user-facing message needed. If the invited tenant and existing tenant differ, the user stays on their existing workspace. This could be confusing. Follow-up: consider a brief informational banner (FAM-07J scope or similar).
- **Remaining FAM-07 units:** FAM-07E (ToS — IMPLEMENTATION-GATED_BY_FINAL_LEGAL_TEXT), FAM-07F (test coverage), FAM-07G (auth hardening), FAM-07H (SMTP infra), FAM-07J (INVITE_ALREADY_PENDING UX). None authorized.

---

## 10. Proposed Commit

```
[TEXQTIC] auth: accept pending invite after authenticated sign-in (FAM-07D3)
```

**Files to stage:**
```
server/src/routes/tenant.ts
server/src/__tests__/tenant-activate.integration.test.ts
services/tenantService.ts
App.tsx
tests/frontend/onboarding-activation.test.tsx
governance/control/NEXT-ACTION.md
governance/control/OPEN-SET.md
artifacts/control-plane/FAM-07D3-TENANT-ONBOARDING-AUTHENTICATED-INVITE-ACCEPTANCE-001.md
```
