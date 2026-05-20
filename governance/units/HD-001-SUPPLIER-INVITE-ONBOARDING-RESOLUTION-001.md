# HD-001-SUPPLIER-INVITE-ONBOARDING-RESOLUTION-001

**Governance unit type:** Hard Dependency resolution — invite-token onboarding flow  
**Status:** IMPLEMENTATION_COMPLETE  
**Date:** 2026-05-20  
**Authority:** governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md — HD-001

---

## 1. Problem Statement

HD-001 in the BLIND-SPOT register identified that real supplier onboarding depends on
the invite-token flow working end-to-end. The governance evidence cited the onboarding
family being closed in Layer 0 with a bounded-deferred-remainder for the reused-user path.

**The specific operational gap discovered in repo-truth inspection:**

The `POST /api/control/tenants/provision` route (APPROVED_ONBOARDING mode) creates an
invite record and returns `firstOwnerAccessPreparation.inviteToken` in the response body,
but **never dispatches an activation email**. Paresh had to manually construct the URL and
share it — a fragile and unscalable manual step that blocked any automated onboarding.

---

## 2. Root Cause

`server/src/routes/admin/tenantProvision.ts` — the APPROVED_ONBOARDING provisioning handler —
writes the audit log and immediately returns `201 Created`. There was no email dispatch call.

The email service (`sendInviteMemberEmail`) already constructs the correct URL:
```
${FRONTEND_URL}/accept-invite?token=${encodeURIComponent(inviteToken)}&action=invite
```

The frontend (`App.tsx`) already handles `?action=invite` — sets `pendingInviteToken` +
`setAppState('ONBOARDING')`, rendering `OnboardingFlow` with the token pre-filled.

The backend `POST /api/tenant/activate` already handles the activation correctly:
- Validates invite token hash
- Enforces email match (invite email === submitted email)
- Creates user (or finds existing user — see reused-user note below)
- Creates membership, marks invite accepted, writes audit log, returns JWT

**Gap:** No email dispatched → supplier never receives the activation link.

---

## 3. Fix Applied

**File:** `server/src/routes/admin/tenantProvision.ts`

Added best-effort (non-blocking) first-owner activation email dispatch immediately after
the audit log write, before the `return sendSuccess(...)`:

```typescript
// HD-001: Best-effort first-owner activation email for APPROVED_ONBOARDING
if (
  result.provisioningMode === 'APPROVED_ONBOARDING' &&
  result.firstOwnerAccessPreparation?.inviteToken
) {
  void sendInviteMemberEmail(
    result.firstOwnerAccessPreparation.email,
    result.firstOwnerAccessPreparation.inviteToken,
    result.organization.legalName,
    { requestId: request.id ?? undefined }
  ).catch(err => {
    request.log.warn({ err }, '[APPROVED_ONBOARDING] First-owner activation email dispatch failed (non-blocking)');
  });
}
```

**Design decisions:**
- **Non-blocking (fire-and-forget):** Email failure does not fail provisioning. The `inviteToken`
  is still returned in the API response, allowing manual link construction as fallback.
- **Reuses `sendInviteMemberEmail`:** The URL it constructs is correct for first-owner activation.
  The `metadata.flow: 'member_invite'` tag is non-functional and acceptable for MVP.
- **Import added:** `sendInviteMemberEmail` from `../../services/email/email.service.js`

---

## 4. Full Invite-Token Flow (Post-Fix)

```
1. Paresh calls POST /api/control/tenants/provision (provisioningMode: APPROVED_ONBOARDING)
   → Server creates tenant + invite (invitePurpose: FIRST_OWNER_PREPARATION)
   → Server returns firstOwnerAccessPreparation.inviteToken in response
   → Server dispatches activation email to firstOwner.email (non-blocking)

2. Supplier receives email: "You've been invited to join <OrgName> on TexQtic"
   → Link: https://app.texqtic.com/accept-invite?token=TOKEN&action=invite

3. Supplier opens link → App.tsx useEffect detects ?action=invite
   → setPendingInviteToken(token) + setAppState('ONBOARDING')

4. OnboardingFlow renders with inviteToken pre-filled
   → Supplier completes: email, password, org name, registration number, jurisdiction

5. activateTenant({ inviteToken, userData, tenantData, verificationData })
   → POST /api/tenant/activate validates invite, creates user + membership, returns JWT

6. App stores JWT → getCurrentUser() → navigates to tenant experience
```

---

## 5. Reused-User Path (Remains BOUNDED-DEFERRED-REMAINDER)

`POST /api/tenant/activate` handles existing users via `user.findUnique → ??= create`:
- If user already exists: existing user record is found; new password is NOT stored (ignored)
- Membership is created correctly for the new tenant
- Silent UX confusion: supplier sets a password in the form that is not actually stored

**Disposition:** BOUNDED-DEFERRED-REMAINDER. New Surat suppliers will not have existing
TexQtic accounts. This edge case affects only re-onboarding of users who already exist in
the platform, which is out of scope for the initial pilot. No code change made.

---

## 6. Files Modified

| File | Change |
|------|--------|
| `server/src/routes/admin/tenantProvision.ts` | Added `sendInviteMemberEmail` import + best-effort email dispatch block |

---

## 7. Validation

- TypeScript: `get_errors` on modified file — only pre-existing SonarLint warning (nested
  ternary at line ~175, unrelated to this change). No TypeScript compile errors introduced.
- No schema changes. No migration changes. No frontend changes. No .env changes.
- No feature flags activated or modified.

---

## 8. Status

`HD-001`: `IMPLEMENTATION_COMPLETE` (2026-05-20)

Mitigation note from BLIND-SPOT register: "End-to-end test with a real Surat supplier
email before pilot outreach" — remains the recommended verification step. The code path
is now complete; runtime verification with a real email is the final gate.
