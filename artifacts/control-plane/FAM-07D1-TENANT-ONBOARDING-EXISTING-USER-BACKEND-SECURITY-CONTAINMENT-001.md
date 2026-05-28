# FAM-07D1 — Tenant Onboarding Existing-User Backend Security Containment
## Artifact ID: FAM-07D1-TENANT-ONBOARDING-EXISTING-USER-BACKEND-SECURITY-CONTAINMENT-001

| Field            | Value                                                                             |
|------------------|-----------------------------------------------------------------------------------|
| Unit ID          | FAM-07D1-TENANT-ONBOARDING-EXISTING-USER-BACKEND-SECURITY-CONTAINMENT-001        |
| Family           | FAM-07 — Auth / Session / Tenant Onboarding                                      |
| Status           | **CLOSED**                                                                        |
| Date Closed      | 2026-05-28                                                                        |
| Prior Unit       | FAM-07C (commit `14ce1e6`)                                                        |
| Operator         | Paresh Patel                                                                      |
| Scope            | Backend only — `server/src/routes/tenant.ts`                                      |

---

## 1. Mission

Close three security gaps identified in the tenant activation and membership invite paths:

| ID   | Type                | Route                        | Impact                                             |
|------|---------------------|------------------------------|----------------------------------------------------|
| B-01 | Credential bypass   | `POST /api/tenant/activate`  | Existing account accepted with any password → no `bcrypt.compare` ever called |
| B-02 | P2002 → 500         | `POST /api/tenant/activate`  | Duplicate `membership.create` throws uncaught `P2002` → generic 500             |
| S-01 | Duplicate invite    | `POST /api/tenant/memberships` | Same `(tenantId, email)` pending invite created multiple times with no guard   |

Design decision: **Option A — sign-in-first**. Existing users are blocked at the invite activation boundary with `EXISTING_USER_MUST_SIGN_IN`. No silent overwrite or credential merge.

---

## 2. Files Modified

| File                                                           | Change Type |
|----------------------------------------------------------------|-------------|
| `server/src/routes/tenant.ts`                                  | Modified    |
| `server/src/__tests__/tenant-activate.integration.test.ts`     | Created     |

---

## 3. Security Containment Implementation

### B-01 — Credential Bypass Fix

Inserted **after** `EMAIL_MISMATCH` check, **before** `bcrypt.hash`, in `POST /api/tenant/activate`:

```typescript
// B-01: Detect existing TexQtic account — sign-in-first flow.
const existingAccount = await prisma.user.findUnique({ where: { email: normalizedUserEmail } });
if (existingAccount) {
  return sendError(
    reply,
    'EXISTING_USER_MUST_SIGN_IN',
    'Existing TexQtic account found. Please sign in to accept this invite.',
    409,
  );
}
```

Guarantees:
- No `withDbContext` (transaction) is entered for existing accounts
- No password hash computed
- No JWT issued
- No write to user, membership, or invite tables

### B-02 — Duplicate Membership Pre-check + Outer Catch

**Inside transaction** (after `user ??= tx.user.create(...)`, before `tx.membership.create`):

```typescript
// B-02: Pre-check for duplicate membership before create to prevent P2002 → 500.
const existingMembership = await tx.membership.findFirst({
  where: { userId: user.id, tenantId: invite.tenantId },
});
if (existingMembership) {
  const err = new Error('Membership already exists') as Error & { _activationCode: string };
  err._activationCode = 'ALREADY_MEMBER';
  throw err;
}
```

**Outer catch block** (updated to handle sentinel and P2002 race condition):

```typescript
} catch (error: unknown) {
  if (error instanceof Error && (error as Error & { _activationCode?: string })._activationCode === 'ALREADY_MEMBER') {
    return sendError(reply, 'ALREADY_MEMBER', 'This user is already a member of this tenant.', 409);
  }
  if (error instanceof Error && (error as Error & { code?: string }).code === 'P2002') {
    return sendError(reply, 'ALREADY_MEMBER', 'This user is already a member of this tenant.', 409);
  }
  fastify.log.error({ err: error }, '[Tenant Activation] Error');
  return sendError(reply, 'INTERNAL_ERROR', 'Activation failed', 500);
}
```

### S-01 — Duplicate Pending Invite Guard

Inserted **after** `dbContext` guard, **before** `withDbContext` invite creation in `POST /api/tenant/memberships`:

```typescript
// S-01: Guard against duplicate pending invites for the same email and tenant.
const normalizedInviteEmail = email.trim().toLowerCase();
const pendingInvite = await prisma.invite.findFirst({
  where: {
    tenantId,
    email: normalizedInviteEmail,
    acceptedAt: null,
    expiresAt: { gt: new Date() },
  },
});
if (pendingInvite) {
  return sendError(reply, 'INVITE_ALREADY_PENDING', 'A pending invite already exists for this email address.', 409);
}
```

---

## 4. Test Coverage

File: `server/src/__tests__/tenant-activate.integration.test.ts`

| Test ID   | Suite                                           | Assertion                                                   | Status |
|-----------|-------------------------------------------------|-------------------------------------------------------------|--------|
| T-GAP-02a | B-01 existing user must sign in                 | 409 EXISTING_USER_MUST_SIGN_IN returned                     | ✅ PASS |
| T-GAP-02b | B-01 existing user must sign in                 | withDbContext / user.create / membership.create / audit not called | ✅ PASS |
| T-GAP-02c | B-01 existing user must sign in                 | No JWT issued in response body                              | ✅ PASS |
| T-GAP-03a | B-02 duplicate membership → 409                 | 409 ALREADY_MEMBER returned                                 | ✅ PASS |
| T-GAP-03b | B-02 duplicate membership → 409                 | membership.create not called when pre-check fires           | ✅ PASS |
| T-GAP-06  | B-01 regression new user proceeds               | withDbContext called; no EXISTING_USER_MUST_SIGN_IN         | ✅ PASS |
| T-GAP-07  | B-01 regression invalid invite unaffected       | 404 INVALID_INVITE; user.findUnique not reached             | ✅ PASS |
| S-01a     | S-01 duplicate pending invite guard             | 409 INVITE_ALREADY_PENDING returned                         | ✅ PASS |
| S-01b     | S-01 duplicate pending invite guard             | withDbContext not called when pending invite found          | ✅ PASS |
| S-01c     | S-01 email normalisation                        | invite.findFirst called with lowercase email                | ✅ PASS |

**Total: 10 / 10 passed**

---

## 5. Validation Evidence

### TypeScript Typecheck
```
cd server && pnpm exec tsc --noEmit
# No output → PASS
```

### ESLint
```
cd server && pnpm exec eslint "src/__tests__/tenant-activate.integration.test.ts"
# ESLintIgnoreWarning: .eslintignore deprecated (harmless) — no violations → PASS
```

### Test Run
```
cd server && pnpm exec vitest run --reporter=verbose "tenant-activate"
Test Files  1 passed (1)
     Tests  10 passed (10)
  Duration  2.11s
```

---

## 6. Error Code Registry

| Code                         | HTTP Status | Route                           | Meaning                                                              |
|------------------------------|-------------|---------------------------------|----------------------------------------------------------------------|
| `EXISTING_USER_MUST_SIGN_IN` | 409         | `POST /api/tenant/activate`     | Email matches existing TexQtic account — must sign in to accept      |
| `ALREADY_MEMBER`             | 409         | `POST /api/tenant/activate`     | User is already a member of this tenant                              |
| `INVITE_ALREADY_PENDING`     | 409         | `POST /api/tenant/memberships`  | A valid pending invite exists for this `(tenantId, email)` pair      |

---

## 7. Frontend Follow-up (NOT in scope)

The `EXISTING_USER_MUST_SIGN_IN` response must be handled by the onboarding UI. Required in a follow-on unit (FAM-07D2 or FAM-07G):

- Detect `EXISTING_USER_MUST_SIGN_IN` code from activation response
- Present user with sign-in prompt (not a generic error message)
- After sign-in, re-invoke invite acceptance via an authenticated accept-invite endpoint

Until the frontend is updated, existing users who receive an invite will see an error rather than a guided sign-in redirect. This is acceptable because: (a) the status quo was a silent credential bypass (a worse outcome), and (b) the frontend fix is self-contained.

---

## 8. Governance

### Allowed Files (per FAM-07D1 authorisation)
- `server/src/routes/tenant.ts` ✅
- `server/src/__tests__/tenant-activate.integration.test.ts` ✅

### Files NOT touched (governance boundary respected)
- `services/tenantService.ts` — not modified
- `server/prisma/schema.prisma` — not modified
- Any migration file — not modified
- `OnboardingFlow.tsx` or any frontend component — not modified
- `LAUNCH-FAMILY-INDEX.md` — not modified
- `FUTURE-TODO-REGISTER.md` — not modified
- `package.json` (any) — not modified
- `.env` / environment variables — not touched

### FTR Hub Impact
- **FTR-AUTH-001**: Partially resolved (backend security containment complete). Frontend `EXISTING_USER_MUST_SIGN_IN` handling required for full closure.
- **FTR-LEGAL-003** (ToS): Not in scope for this unit.
- **FTR-AUTH-004** (branded email): Not in scope for this unit.

### FAM-07 Family Status
FAM-07 family is **NOT** advanced to `VERIFIED_COMPLETE` in this unit. Frontend follow-up (FAM-07D2 / FAM-07G) is required before family closure.

---

## 9. Final Enum

```
FAM_07D1_EXISTING_USER_INVITE_BACKEND_SECURITY_CONTAINMENT_COMPLETE_WITH_FRONTEND_FOLLOWUP_REQUIRED
```

---

## 10. Commit

```
[TEXQTIC] auth: contain existing-user invite activation bypass (FAM-07D1)
```

Staged files:
- `server/src/routes/tenant.ts`
- `server/src/__tests__/tenant-activate.integration.test.ts`
- `artifacts/control-plane/FAM-07D1-TENANT-ONBOARDING-EXISTING-USER-BACKEND-SECURITY-CONTAINMENT-001.md`
