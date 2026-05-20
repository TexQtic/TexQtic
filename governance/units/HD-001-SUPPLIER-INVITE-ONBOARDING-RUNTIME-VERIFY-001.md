# HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001

**Governance unit type:** Hard Dependency runtime verification  
**Status:** VERIFIED_BLOCKED  
**Blocked by:** SMTP not configured in Vercel production environment  
**Date:** 2026-05-20  
**Authority:** governance/launch-readiness/BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md — HD-001  
**Depends on:** HD-001-SUPPLIER-INVITE-ONBOARDING-RESOLUTION-001 (IMPLEMENTATION_COMPLETE — commit `7db2265`)

---

## 1. Objective

Runtime-verify the HD-001 supplier invite-token onboarding fix end-to-end against
the production deployment at `https://app.texqtic.com`.

Expected terminal outcome: `HD_001_SUPPLIER_INVITE_ONBOARDING_RUNTIME_VERIFY_001_VERIFIED_COMPLETE`  
Actual outcome: **VERIFIED_BLOCKED** — email delivery fails due to infrastructure gap.

---

## 2. Verification Steps Executed

### Step 1 — Pre-flight (PASS)
- HEAD = origin/main = `7db2265` (HD-001 fix committed)
- `git status --short`: clean tree
- TypeScript: 0 errors (confirmed in prior session)

### Step 2 — Production deploy confirmation (PASS)
- `GET https://app.texqtic.com/health` → 200 OK
- Commit `7db2265` confirmed live in production (Vercel)

### Step 3 — Supplier identity pre-check (PASS)
- Test supplier: `shraddhaind@gmail.com | SHRADDHA INDUSTRIES | IN-GJ`
- DB check: `shraddhaind@gmail.com` NOT in `users` table (0 rows) — clean slate ✅

### Step 4 — Admin authentication (PASS after rate-limit clear)
- Admin login: `admin@texqtic.com` → `POST /api/auth/admin/login` → `200 OK`
- Token obtained for provisioning call

### Step 5 — Provisioning call (PASS)
**Request:** `POST https://app.texqtic.com/api/control/tenants/provision`

```json
{
  "provisioningMode": "APPROVED_ONBOARDING",
  "orchestrationReference": "HD-001-RUNTIME-VERIFY-001-SHRADDHA",
  "organization": {
    "legalName": "SHRADDHA INDUSTRIES",
    "displayName": "Shraddha Industries",
    "jurisdiction": "IN-GJ"
  },
  "firstOwner": { "email": "shraddhaind@gmail.com" },
  "base_family": "B2B",
  "approvedOnboardingMetadata": {}
}
```

**Response: 201 Created**

```json
{
  "success": true,
  "data": {
    "provisioningMode": "APPROVED_ONBOARDING",
    "orgId": "0ae549d7-b17b-4277-b9f6-f3e8c3a57e09",
    "slug": "shraddha-industries",
    "userId": null,
    "membershipId": null,
    "orchestrationReference": "HD-001-RUNTIME-VERIFY-001-SHRADDHA",
    "organization": {
      "legalName": "SHRADDHA INDUSTRIES",
      "jurisdiction": "IN-GJ",
      "registrationNumber": null,
      "status": "VERIFICATION_APPROVED"
    },
    "firstOwnerAccessPreparation": {
      "artifactType": "PLATFORM_INVITE",
      "inviteId": "ba4f0bb1-bbf2-4da5-b8fe-4aa69a110166",
      "invitePurpose": "FIRST_OWNER_PREPARATION",
      "email": "shraddhaind@gmail.com",
      "role": "OWNER",
      "expiresAt": "2026-05-27T14:21:52.819Z",
      "inviteToken": "<REDACTED>"
    }
  }
}
```

**Observations:**
- `inviteToken` present in response ✅
- `userId: null`, `membershipId: null` — tenant provisioned, not yet activated ✅
- `organization.status: VERIFICATION_APPROVED` ✅
- HD-001 fire-and-forget dispatch code path triggered (invite token was present) ✅

**Note on 400 during debugging:** An initial attempt failed with 400 because `base_family`
was omitted from the payload. The zod schema marks `base_family` as optional, but
`resolveCanonicalProvisioningIdentityInput` (in `tenantProvision.types.ts` line 196) requires
either `base_family` or `tenant_category` at normalization time. Adding `base_family: "B2B"`
resolved the 400.

### Step 6 — Email delivery check (FAIL — BLOCKER)
- `shraddhaind@gmail.com` inbox: **no email received**
- Expected subject: `"You've been invited to join SHRADDHA INDUSTRIES on TexQtic"`

---

## 3. Root Cause Analysis — Email Not Delivered

### Code path traced (`email.service.ts`)

```
sendInviteMemberEmail()
  → sendEmail()
    → isSmtpConfigured() → false  ← BLOCKED HERE
    → logs SKIPPED_SMTP_UNCONFIGURED warning
    → returns { status: 'SKIPPED_SMTP_UNCONFIGURED' }
```

The email service has three production paths:

| Condition | Outcome |
|-----------|---------|
| `NODE_ENV !== 'production'` | `DEV_LOGGED` — no send |
| `production` + SMTP configured | `SENT` — real email via nodemailer |
| `production` + SMTP absent | `SKIPPED_SMTP_UNCONFIGURED` — warn + silent return |

### Root cause: SMTP not configured in Vercel production

The email service requires four env vars to send real email:
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

All are declared `optional()` in `server/src/config/index.ts`. None are set in the Vercel
production environment. As a result, `isSmtpConfigured()` returns `false`, and all email
dispatch attempts are silently skipped.

### Impact on HD-001 fix

The HD-001 code fix is **correct** — the fire-and-forget `sendInviteMemberEmail` call is
properly placed and fires as intended. The code does exactly what it was designed to do.
The delivery failure is an **infrastructure gap** (missing Vercel env vars), not a
code defect.

### HD-001 code fix assessment

| Dimension | Result |
|-----------|--------|
| Dispatch call added to `tenantProvision.ts` | ✅ Correct |
| Non-blocking (failure does not fail provisioning) | ✅ Correct |
| Invite token returned in API response as fallback | ✅ Correct |
| Email delivered to supplier in production | ❌ Blocked by SMTP config |

---

## 4. Blocker Details

**Blocker ID:** `HD-001-SMTP-INFRA-GAP-001`  
**Type:** Infrastructure — missing Vercel production env vars  
**Severity:** P0 — blocks all email delivery in production  
**Scope:** All email functions in `email.service.ts` are affected, not just invite emails  
(member invites, any future notifications, etc.)

**Required Vercel env vars to unblock:**

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password (secret) |
| `SMTP_FROM` | From address for outbound email |
| `SMTP_PORT` | (Optional) defaults to 587 |

**Recommended action:** Set up an SMTP provider (e.g. Resend, SendGrid, Postmark, or
AWS SES) and configure the above vars in Vercel's production environment settings.

---

## 5. Invite Record Status (as of verification run)

| Field | Value |
|-------|-------|
| `orgId` | `0ae549d7-b17b-4277-b9f6-f3e8c3a57e09` |
| `slug` | `shraddha-industries` |
| `inviteId` | `ba4f0bb1-bbf2-4da5-b8fe-4aa69a110166` |
| `email` | `shraddhaind@gmail.com` |
| `expiresAt` | `2026-05-27T14:21:52Z` |
| `inviteToken` | present in DB (redacted here) |
| `userId` | null — not yet activated |
| `membershipId` | null — not yet activated |

The invite record is live in production and will remain valid until `2026-05-27`. Once
SMTP is configured, a fresh provision call (or manual link construction from token) can
be used to complete the activation flow verification.

---

## 6. Open Items Before VERIFIED_COMPLETE

| # | Action | Owner | Gate |
|---|--------|-------|------|
| 1 | Configure SMTP provider in Vercel production | Paresh | New governance action: `HD-001-SMTP-INFRA-GAP-001` |
| 2 | Re-run email delivery step with new provision call | Agent | After SMTP configured |
| 3 | Complete activation flow (Steps 5–8): open invite link → activate → DB verify | Agent | After email delivered |

---

## 7. Verdict

**VERIFIED_BLOCKED** (2026-05-20)

- HD-001 code fix: **CORRECT** and deployed to production
- Email delivery: **BLOCKED** by missing SMTP configuration in Vercel
- Runtime activation flow: **NOT VERIFIED** — cannot proceed without email delivery

This unit remains open. It will be promoted to `VERIFIED_COMPLETE` when:
1. SMTP is configured in Vercel production
2. A real supplier email is received with the correct invite link
3. The full activation flow (invite link → onboarding form → JWT) completes successfully
