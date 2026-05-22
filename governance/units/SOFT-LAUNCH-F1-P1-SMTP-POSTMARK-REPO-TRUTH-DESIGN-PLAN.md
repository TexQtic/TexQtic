# SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN

**Unit ID:** SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN
**Status:** DESIGN_PLAN_COMPLETE
**Created:** 2026-07-14
**Track:** SOFT-LAUNCH investigation + design planning
**Scope:** Investigation-only + design planning — NO source code, test, schema, migration, env, or runtime changes authorized

---

## §1 Unit Header and Authority Boundary

### Purpose

This unit performs a repo-truth investigation and design-plan synthesis for all SMTP / Postmark
email infrastructure concerns in TexQtic. It:

1. Establishes the current git and worktree baseline.
2. Identifies the single authoritative planned-requirements register and confirms whether an
   update is authorized.
3. Reads all prior governance artifacts, source code, and operational truth records related to
   SMTP, Postmark, and email delivery.
4. Reconciles current source truth against historical governance evidence.
5. Classifies the implementation stage for every email capability.
6. Designs the public-pages and registered-user email requirements.
7. Assesses the Postmark operational status including a critical discrepancy finding.
8. Produces a complete design plan with pending actions.
9. Adds PRIT-036 to the planned-requirements intake register.
10. Recommends the next governance packet.

### Authority Boundary

| Dimension | This unit's role |
|---|---|
| Source code changes | NONE — forbidden by unit scope |
| Schema / migration changes | NONE — forbidden by unit scope |
| Env / config source changes | NONE — forbidden by unit scope |
| `.env` / Vercel env var changes | NONE — ops-only; Paresh action only |
| TLRH / Layer 0 index changes | NONE — forbidden by unit scope |
| Layer 0 posture | UNCHANGED — `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` |
| Allowlisted file mutations | (a) Create this document; (b) Update `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` with PRIT-036 |
| Implementation authorization | NONE — no email change may be implemented without a separate governed unit and Paresh approval |

---

## §2 TLRH / Transcript Storage Note

This unit's evidence was gathered in a single governed session. The session transcript is stored
at the standard VS Code debug-log location (`d922ff55-df0c-4a16-b9ce-64cf0fff4718`). No separate
TLRH writeback artifact is required for this unit; all findings are compiled here.

---

## §3 Git Preflight Results

| Field | Value |
|---|---|
| HEAD commit | `6c3862c89099b69ec84024df59824366038b04ce` |
| Branch | main |
| Worktree status | CLEAN — no staged files, no unstaged modifications |
| Repo | TexQtic/TexQtic |
| Note on prior register references | No active unstaged source files were present in the current worktree at preflight. Prior register notes referenced historical files only; they were not active modifications in this unit and were not touched. |

**Git preflight outcome:** PASS. Worktree is clean. Investigation may proceed.

---

## §4 Authoritative Register Finding

| Question | Finding |
|---|---|
| Is there a single authoritative planned-requirements register? | YES |
| Register path | `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` |
| Register status | INTAKE_OPEN |
| Other candidate files found | `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-001.md` (unit file — NOT a register) and `governance/units/TEXQTIC-PLANNED-REQUIREMENTS-INTAKE-REVIEW-001.md` (review unit file — NOT a register) |
| Is a register update authorized? | YES — single authoritative path confirmed; no ambiguity |
| Next available PRIT ID before this unit | PRIT-036 |
| Register update to apply | Add PRIT-036: SMTP provider selection and Vercel production env configuration |

---

## §5 Inputs Reviewed

All of the following source artifacts were read and reconciled during this investigation:

| Artifact | Type | Location | Date |
|---|---|---|---|
| `email.service.ts` | Source — canonical email service | `server/src/services/email/email.service.ts` | G-012, Feb 22, 2026 |
| `config/index.ts` | Source — SMTP config schema | `server/src/config/index.ts` (lines 56–60) | — |
| `server/package.json` | Source — nodemailer dependency | `server/package.json` | — |
| `auth.ts` | Source — email call sites | `server/src/routes/auth.ts` | — |
| `tenant.ts` | Source — invite email call sites | `server/src/routes/tenant.ts` | — |
| `admin/tenantProvision.ts` | Source — HD-001 fix call site | `server/src/routes/admin/tenantProvision.ts` | May 20, 2026 |
| `public.ts` | Source — inquiry route (no email) | `server/src/routes/public.ts` (lines 1238–1440) | — |
| `emailStubs.ts` | Source — deprecated stubs | `server/src/lib/emailStubs.ts` | — |
| `supplierNotificationBoundary.service.ts` | Source — log-only boundary | `server/src/services/rfq/supplierNotificationBoundary.service.ts` | — |
| `wave-execution-log.md` (G-012 section) | Governance — validation record | `governance/wave-execution-log.md` (lines 912–1000) | Feb 22, 2026 |
| `TEXQTIC-DEFERRED-REALTIME-EMAIL-DELIVERY-FAMILY-SMTP-POSTMARK-OPERATIONAL-TRUTH-WRITEBACK-2026-04-17.md` | Governance — operational truth writeback | `governance/analysis/` | Apr 17, 2026 |
| `SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT.md` | Governance — notification loop audit | `governance/units/` | May 21, 2026 |
| `SOFT-LAUNCH-RT4-D-FINAL-IMPLEMENTATION-PRIORITY-SYNTHESIS.md` | Governance — priority synthesis | `governance/units/` | May 21, 2026 |
| `HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001.md` | Governance — runtime verify | `governance/units/` | May 20, 2026 |
| `HD-001-SUPPLIER-INVITE-ONBOARDING-RESOLUTION-001.md` | Governance — code fix record | `governance/units/` | May 20, 2026 |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | Governance — risk register | `governance/launch-readiness/` | — |
| `PLANNED-REQUIREMENTS-INTAKE.md` | Governance — intake register | `governance/launch-readiness/` | — |
| `NEXT-ACTION.md` | Governance — Layer 0 control | `governance/control/` | — |

---

## §6 Current SMTP / Postmark Repo-Truth Summary

### 6.1 What the code says (authoritative as of HEAD `6c3862c`)

The email infrastructure is implemented correctly at the **code level**. The canonical service
(`email.service.ts`) uses **nodemailer** with a generic SMTP transport — it is NOT Postmark-specific.
Postmark credentials are not hardcoded anywhere in the source. The service uses four SMTP env vars
(`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) and a sender identity (`SMTP_FROM`) which are
configured in `server/src/config/index.ts` as optional fields with graceful degradation.

**When SMTP is configured:** the service sends email via nodemailer SMTP.
**When SMTP is absent:** the service returns `SKIPPED_SMTP_UNCONFIGURED` — no crash, no throw.
**In dev/test:** the service logs a structured JSON event (`EMAIL_DEV_LOG`) without sending.

The code has no knowledge of "Postmark" — it will work with any SMTP provider that supplies
the four standard SMTP credentials.

### 6.2 What production currently does (authoritative as of May 20, 2026)

All four SMTP env vars (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) are **absent** from
Vercel production. Every outbound email call returns `SKIPPED_SMTP_UNCONFIGURED`. This was
confirmed by runtime verification on 2026-05-20 (`HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001`).

**Effect:** Invites, password reset emails, email verification emails — all silently suppressed.
No errors thrown. Application does not crash. But no email is ever delivered.

### 6.3 What historical governance records say (for Postmark)

The April 17, 2026 operational truth writeback (`TEXQTIC-DEFERRED-REALTIME-EMAIL-DELIVERY-FAMILY-SMTP-POSTMARK-OPERATIONAL-TRUTH-WRITEBACK-2026-04-17.md`)
states that:
- Postmark was the selected SMTP provider and was configured in Vercel production at that time.
- Owned-domain invite create and resend were verified as `SENT` (emails sent to an
  operator-controlled test address on `texqtic.com`).
- Domain authentication was verified: DKIM Verified + Return-Path Verified for `texqtic.com`.
- External-recipient delivery (to non-`texqtic.com` addresses) was **blocked** because
  Postmark's dashboard still showed "Test mode" / "We're reviewing your account".

**⚠️ Critical discrepancy:** The April 17 writeback states SMTP was configured and working.
The May 20 runtime verify found all SMTP vars absent. See §8 for full reconciliation.

---

## §7 Email Service Implementation Source Map

### 7.1 `server/src/services/email/email.service.ts` (G-012 canonical service)

| Component | Description | Status |
|---|---|---|
| `sendEmail(params, context)` | Core function — stop-loss validation (MISSING_TO, INVALID_TO, MISSING_SUBJECT, MISSING_BODY), env gating (dev→log, prod+SMTP→send, prod+no-SMTP→skip), SMTP failure re-throws | IMPLEMENTED |
| `isSmtpConfigured()` | Checks `config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS && config.SMTP_FROM`; returns boolean | IMPLEMENTED |
| `createTransporter()` | Lazily creates nodemailer SMTP transporter from config | IMPLEMENTED |
| `sendPasswordResetEmail(to, resetToken, context?)` | Named wrapper — used by `auth.ts` | IMPLEMENTED |
| `sendEmailVerificationEmail(to, verificationToken, context?)` | Named wrapper — used by `auth.ts` | IMPLEMENTED |
| `sendInviteMemberEmail(to, inviteToken, orgName, context?)` | Named wrapper — returns `EmailDispatchOutcome` — used by `tenant.ts` and `admin/tenantProvision.ts` | IMPLEMENTED |
| `sendBuyerInquiryNotificationEmail` | Public inquiry notification wrapper | **NOT IMPLEMENTED** |

**Exported types:** `EmailParams`, `EmailContext`, `EmailDispatchStatus` (`'DEV_LOGGED' | 'SKIPPED_SMTP_UNCONFIGURED' | 'SENT'`), `EmailDispatchOutcome`, `EmailValidationError`

### 7.2 `server/src/config/index.ts` (SMTP config schema, lines 56–60)

```
SMTP_HOST: z.string().optional()
SMTP_PORT: z.string().transform(Number).default('587')
SMTP_USER: z.string().optional()
SMTP_PASS: z.string().optional()
SMTP_FROM: z.string().optional()
FRONTEND_URL: z.string().url()  ← with fallback 'https://app.texqtic.com'
```

**Not present in schema:** `ADMIN_NOTIFICATION_EMAIL` — no config binding for admin notification
recipient. Any public-inquiry or supplier notification implementation will need this added.

### 7.3 Call site inventory

| Call Site | Function | Pattern | Route |
|---|---|---|---|
| `auth.ts` (~line 1160) | `sendPasswordResetEmail` | Fire-and-await; errors re-throw | `POST /api/auth/forgot-password` |
| `auth.ts` | `sendEmailVerificationEmail` | Fire-and-await; errors re-throw | `POST /api/auth/resend-verification` |
| `tenant.ts` (lines 102–105, 1581–1582, 6547–6567) | `sendInviteMemberEmail` | Fire-and-forget (G-012 pattern); errors logged non-fatally | Invite create + resend routes |
| `admin/tenantProvision.ts` | `sendInviteMemberEmail` | Fire-and-forget; after audit log write; HD-001 fix commit `7db2265` | `POST /api/admin/tenant-provision` (APPROVED_ONBOARDING mode) |

### 7.4 Inquiry route (`public.ts`, lines 1238–1440)

`POST /api/public/inquiry/submit`:
- Captures inquiry to DB.
- Writes audit log.
- Returns HTTP 202.
- **Zero email dispatch.** No `sendEmail`, no notification wrapper, no webhook, no queue push.
- `orgId` is available in this handler (from supplier context lookup).
- Membership → User email join is **not done** — supplier email is not fetched.
- `organizations` table has no `contact_email` column.
- FTR-B2C-004 (inquiry notification loop) is **NOT_STARTED**.

### 7.5 `emailStubs.ts`

Marked `@deprecated` by G-012. Now delegates to `email.service.ts`. Retained as dead code.
No new call sites should use this file.

### 7.6 `supplierNotificationBoundary.service.ts`

`notifySupplierRfqSubmittedGroups(input)` — log-only internal boundary (RFQ domain). No email
dispatch. Not reusable for buyer inquiry (FTR-B2C-004 context).

---

## §8 Source Truth vs. Historical Evidence Reconciliation

| Evidence Point | Apr 17, 2026 Writeback | May 20, 2026 Runtime Verify | Reconciled Truth | Confidence |
|---|---|---|---|---|
| SMTP configured in Vercel production | YES — Postmark configured, vars set | NO — all 4 vars absent | **CONFLICTING** — see note below | REQUIRES REVERIFICATION |
| Provider identity | Postmark explicitly named | Not checked (vars absent) | Postmark was the provider; status unknown today | STALE |
| Owned-domain invite SENT | YES — invite create + resend verified SENT | Not re-tested | Was SENT as of April 17; cannot confirm current | STALE |
| DKIM + Return-Path verified | YES — texqtic.com | Not re-checked | May still be valid (DNS records persist) | STALE — REVERIFY |
| External-recipient delivery | BLOCKED — "Test mode" / "We're reviewing" | Not re-tested | Was BLOCKED as of April 17; current status unknown | STALE — REQUIRES REVERIFICATION |
| `isSmtpConfigured()` return value | Not explicitly tested | `false` confirmed in production | FALSE in production as of May 20, 2026 | HIGH CONFIDENCE |
| `email.service.ts` code correctness | Not in scope | Code inspected as part of HD-001 | Code is correct and complete | HIGH CONFIDENCE |
| Public inquiry notification | Not in scope of writeback | NOT_STARTED confirmed by RT4-B | NOT_STARTED | HIGH CONFIDENCE |

### 8.1 Discrepancy Analysis: April 17 vs. May 20

The April 17, 2026 writeback states that "production SMTP configuration and invite-delivery
enablement were already completed" and that invite emails were verified as `SENT`. The May 20,
2026 runtime verify (`HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001`) found all SMTP
vars absent from Vercel production with `isSmtpConfigured()` returning `false`.

**These two observations cannot both be current truth.** One of the following occurred:

| Candidate explanation | Assessment |
|---|---|
| Vercel environment was reset or wiped between April 17 and May 20 | Most likely — Vercel project settings reset clears all env vars silently |
| SMTP credentials were rotated/revoked by Postmark and not replaced | Possible — Postmark account review may have triggered credential invalidation |
| April 17 writeback referenced a different Vercel environment/project | Possible but less likely — writeback was explicit about production |
| April 17 writeback was aspirational / not a real runtime test | Less likely — writeback contains specific SENT evidence |

**Authoritative current state:** May 20, 2026 runtime verification is the most recent
evidence and is based on direct API inspection of the live production environment. It
takes precedence. **All SMTP vars are currently absent from Vercel production.**

**The April 17 evidence is STALE.** All operational claims from that writeback (SMTP configured,
SENT evidence, DKIM/Return-Path) must be treated as potentially no longer current and require
re-verification before any launch claim can be made.

---

## §9 Capability Classification Table

| ID | Capability | Stage | Blocker | Notes |
|---|---|---|---|---|
| A | Core SMTP transport (`sendEmail`) | CODE_COMPLETE / ENV_BLOCKED | HD-001-SMTP-INFRA-GAP-001 | Code correct; env vars absent in production as of May 20, 2026 |
| B | Password reset email | CODE_COMPLETE / ENV_BLOCKED | HD-001-SMTP-INFRA-GAP-001 | `sendPasswordResetEmail` implemented; wired in `auth.ts` |
| C | Email verification email | CODE_COMPLETE / ENV_BLOCKED | HD-001-SMTP-INFRA-GAP-001 | `sendEmailVerificationEmail` implemented; wired in `auth.ts` |
| D | Tenant invite email (provisioning path) | CODE_COMPLETE / ENV_BLOCKED | HD-001-SMTP-INFRA-GAP-001 | HD-001 code fix (`7db2265`) added dispatch to `tenantProvision.ts` |
| E | Tenant invite resend email | CODE_COMPLETE / ENV_BLOCKED | HD-001-SMTP-INFRA-GAP-001 | `sendInviteMemberEmail` wired in `tenant.ts` fire-and-forget |
| F | Public inquiry buyer acknowledgement | NOT_STARTED | No wrapper; no route integration | FTR-B2C-004; requires new `sendBuyerInquiryAcknowledgementEmail` wrapper |
| G | Public inquiry supplier notification | NOT_STARTED | No wrapper; no route integration; supplier email join absent | FTR-B2C-004; requires Membership→User email join and `sendSupplierInquiryNotificationEmail` wrapper |
| H | Admin / Paresh internal notification | NOT_STARTED | `ADMIN_NOTIFICATION_EMAIL` not in config schema | Needs config addition + new wrapper |
| I | Access request / early-access notification | NOT_STARTED | No route, no wrapper | If D2C early-access form is added, requires config + wrapper |
| J | Contact form general lead notification | NOT_STARTED | No contact route | Requires new route + wrapper |
| K | External-recipient delivery via Postmark | NEEDS_REVERIFICATION | Provider review hold ("Test mode") was ACTIVE as of Apr 17, 2026 | Current Postmark account review status unknown — must be checked by Paresh |
| L | Production SMTP delivery verification (full E2E) | STALE | April 17 SENT evidence predates May 20 env gap | All prior SENT claims must be re-verified after SMTP vars are restored |

---

## §10 Public-Pages Email Design Requirements

These are the email notification requirements arising from public-facing pages (unauthenticated
buyer surfaces). None of these are implemented. All require FTR-B2C-004 scoping.

### 10.1 Inquiry submission notification loop (FTR-B2C-004 — P0 soft-launch blocker)

**Trigger:** `POST /api/public/inquiry/submit` succeeds (HTTP 202).

**Required notifications:**

| Recipient | Notification type | Content required | PII sensitivity |
|---|---|---|---|
| Buyer (submitter) | Acknowledgement / confirmation email | Inquiry reference, supplier name, expected response time, privacy notice | Buyer email (from form input — must NOT be persisted to DB without consent gate) |
| Supplier (org owner) | Inquiry received notification | Buyer company/name, inquiry topic, link to dashboard (once auth flow exists) | Supplier email (from `users` table via `memberships` join) |
| Platform admin (Paresh) | New inquiry alert | Supplier name, buyer name, inquiry summary | Admin email (needs `ADMIN_NOTIFICATION_EMAIL` config) |

**Implementation dependencies:**

| Dependency | Current state | Action required |
|---|---|---|
| Supplier email lookup | NOT IMPLEMENTED in `public.ts` | Add `memberships` → `users` join to fetch supplier org owner email |
| `ADMIN_NOTIFICATION_EMAIL` | NOT in `config/index.ts` | Add optional config field |
| Buyer inquiry acknowledgement wrapper | NOT IMPLEMENTED | Create `sendBuyerInquiryAcknowledgementEmail` in `email.service.ts` |
| Supplier notification wrapper | NOT IMPLEMENTED | Create `sendSupplierInquiryNotificationEmail` in `email.service.ts` |
| Admin notification wrapper | NOT IMPLEMENTED | Create `sendAdminInquiryAlertEmail` in `email.service.ts` |
| Dispatch call in inquiry route | NOT IMPLEMENTED | Add fire-and-forget dispatch calls after DB write in `public.ts` |

**Failure-safe design principle (G-012 pattern):**
All three notifications must be fire-and-forget (errors logged, never throw, never block the
inquiry HTTP 202 response). A notification failure must never cause the inquiry submission to
fail from the buyer's perspective.

**PII safety rule:**
Buyer email should be treated as PII. If not captured in DB already, do not persist without
explicit consent gate. For the notification-only use case, the email is used transiently to
dispatch the acknowledgement only.

### 10.2 Access request / early-access interest (if D2C early-access form exists)

Not currently implemented. If a public early-access or supplier-interest form is added, a
similar notification loop pattern applies: buyer/requester acknowledgement + admin alert.
Scope pending Paresh decision on early-access launch strategy.

### 10.3 Contact form / general lead notification

Not currently in repo. Any future contact route would follow the same pattern.

---

## §11 Registered-User Email Design Requirements

These email capabilities are implemented at the code level but are blocked by the SMTP
infrastructure gap. Once SMTP env vars are restored in Vercel, these will begin delivering
without any code changes.

### 11.1 Password reset (Capability B)

- Route: `POST /api/auth/forgot-password`
- Wrapper: `sendPasswordResetEmail(to, resetToken)`
- Template: Link to `${FRONTEND_URL}/reset-password?token=${resetToken}`
- Current state: CODE_COMPLETE / ENV_BLOCKED
- Required action: None (code) — restore SMTP env vars in Vercel

### 11.2 Email verification (Capability C)

- Route: `POST /api/auth/resend-verification`
- Wrapper: `sendEmailVerificationEmail(to, verificationToken)`
- Template: Link to `${FRONTEND_URL}/verify-email?token=${verificationToken}`
- Current state: CODE_COMPLETE / ENV_BLOCKED
- Required action: None (code) — restore SMTP env vars in Vercel

### 11.3 Tenant invite (provisioning path — Capability D)

- Route: `POST /api/admin/tenant-provision` (APPROVED_ONBOARDING mode)
- Wrapper: `sendInviteMemberEmail(to, inviteToken, orgName)`
- Template: Link to `${FRONTEND_URL}/invite?token=${inviteToken}`
- HD-001 code fix in place at commit `7db2265`
- Current state: CODE_COMPLETE / ENV_BLOCKED
- Required action: None (code) — restore SMTP env vars in Vercel

### 11.4 Tenant invite resend (Capability E)

- Route: Tenant routes in `tenant.ts` (invite create + resend)
- Wrapper: `sendInviteMemberEmail` (fire-and-forget)
- Current state: CODE_COMPLETE / ENV_BLOCKED
- Required action: None (code) — restore SMTP env vars in Vercel

### 11.5 Onboarding continuation reminder

Not currently implemented. If pilot onboarding requires follow-up reminders for incomplete
invite flows, a new wrapper and route would be needed. Not in scope for F1-P1.

---

## §12 Postmark Operational Status Assessment

**Note:** This assessment is based on all available historical evidence. All claims dated
prior to May 20, 2026 are STALE and require re-verification.

| Dimension | Historical State | Current State | Evidence Date |
|---|---|---|---|
| Provider selected | Postmark | Unknown (SMTP vars absent; no confirmed current selection) | Apr 17, 2026 (stale) |
| SMTP vars in Vercel production | SET (at some point before Apr 17, 2026) | **ABSENT** (confirmed May 20, 2026) | May 20, 2026 |
| Owned-domain invite delivery | `SENT` verified (to operator-controlled `texqtic.com` address) | Cannot confirm (env vars absent) | Apr 17, 2026 (stale) |
| DKIM authentication | Verified for `texqtic.com` | Likely still valid (DNS records persist unless removed) | Apr 17, 2026 |
| Return-Path alignment | Verified for `texqtic.com` | Likely still valid (DNS records persist unless removed) | Apr 17, 2026 |
| External-recipient delivery | **BLOCKED** — "Test mode" / "We're reviewing your account" in Postmark | **UNKNOWN** — current Postmark account review status not verified | Apr 17, 2026 (stale) |
| Postmark account status | Under review / test mode | UNKNOWN — must be checked by Paresh | Apr 17, 2026 |
| Hardcoded in source | No — generic nodemailer SMTP only | No — confirmed by grep search (12 matches; all in governance docs) | Current |

### 12.1 Postmark account review risk

As of April 17, 2026, the Postmark dashboard showed:
- "Test mode" indicator
- "We're reviewing your account" message

This blocked external-recipient email delivery (to any address outside `texqtic.com`). This
is a Postmark provider-side gate, not a code or config issue. It is possible that:
- The review has since been completed and the account is now live; or
- The review is still pending and external delivery is still blocked.

**Paresh must check the Postmark dashboard before any pilot email delivery can be verified.**

### 12.2 Provider alternatives

If Postmark remains in review or Paresh prefers a different provider, the following SMTP
providers are functionally equivalent for the nodemailer-based service (no source changes
required — only env var values change):

| Provider | SMTP support | Notes |
|---|---|---|
| Postmark | Yes | Was configured previously; domain auth set up for texqtic.com |
| Resend | Yes | Developer-friendly; generous free tier |
| SendGrid | Yes | Established enterprise provider |
| AWS SES | Yes | Low cost at volume; requires more AWS setup |

The choice is entirely a Paresh ops/business decision. No source changes are needed for
any of these providers — only the four Vercel env vars need to be set.

---

## §13 Pending Setup / Implementation Design Plan

### 13.1 No-code operations (Paresh-only action — P0)

These actions require no code changes. They unblock all registered-user email capabilities
(password reset, email verification, tenant invite) immediately upon completion.

| Step | Action | Owner | Dependencies |
|---|---|---|---|
| 1 | Check Postmark dashboard — confirm whether account review is complete and external-recipient sending is enabled | Paresh | None |
| 2 | If Postmark is confirmed active: obtain SMTP credentials (SMTP host: `smtp.postmarkapp.com`, port: `587`, user: `<Server API Token>`, pass: `<Server API Token>`, from: `no-reply@texqtic.com` or similar) | Paresh | Step 1 |
| 3 | If Postmark is NOT active / review is still pending: select alternative provider (Resend/SendGrid/SES) and obtain SMTP credentials | Paresh | Step 1 |
| 4 | Set four Vercel production env vars: `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Paresh | Step 2 or 3 |
| 5 | Redeploy Vercel production (env var changes require a new deployment to take effect) | Paresh | Step 4 |
| 6 | Verify by re-running `HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001` steps 5–8: re-provision SHRADDHA INDUSTRIES (or a fresh supplier), confirm email delivered | Paresh + governed unit | Step 5 |

### 13.2 Application source changes (require separate governed unit + Paresh authorization)

These changes are required for FTR-B2C-004 (public inquiry notification loop). None may be
implemented under this unit — a separate governed implementation unit is required.

| Change | Scope | File | Governance gate |
|---|---|---|---|
| Add `ADMIN_NOTIFICATION_EMAIL` to config schema | 1 line — add `z.string().email().optional()` | `server/src/config/index.ts` | New governed unit + Paresh authorization |
| Add `sendBuyerInquiryAcknowledgementEmail` wrapper | New named wrapper in email service | `server/src/services/email/email.service.ts` | New governed unit + Paresh authorization |
| Add `sendSupplierInquiryNotificationEmail` wrapper | New named wrapper in email service | `server/src/services/email/email.service.ts` | New governed unit + Paresh authorization |
| Add `sendAdminInquiryAlertEmail` wrapper | New named wrapper in email service | `server/src/services/email/email.service.ts` | New governed unit + Paresh authorization |
| Add supplier email lookup in inquiry route | `memberships` → `users` join | `server/src/routes/public.ts` | New governed unit + Paresh authorization |
| Add fire-and-forget notification dispatch after DB write | 3 dispatch calls | `server/src/routes/public.ts` | New governed unit + Paresh authorization |
| Add `ADMIN_NOTIFICATION_EMAIL` to Vercel env | Ops only | Vercel dashboard | Paresh action only |

### 13.3 Runtime verification plan (after SMTP env vars are restored)

| Step | Verification action | Pass criterion |
|---|---|---|
| V-1 | `GET https://app.texqtic.com/health` | HTTP 200 |
| V-2 | `POST /api/admin/tenant-provision` (APPROVED_ONBOARDING mode) with a fresh test supplier email | HTTP 201; `inviteToken` in response body |
| V-3 | Check test supplier email inbox | Invite email received |
| V-4 | Click invite link; complete registration | HTTP 200; session established |
| V-5 | `POST /api/auth/forgot-password` for registered user | HTTP 200; password reset email received |
| V-6 | If Postmark: check Postmark dashboard logs | Email shows as `Delivered` (not `Test mode`) |

---

## §14 Register Update Summary (PRIT-036)

The following new entry will be added to `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md`:

**PRIT-036: SMTP provider selection and Vercel production environment configuration**

| Field | Value |
|---|---|
| PRIT ID | PRIT-036 |
| Title | SMTP provider selection and Vercel production environment configuration (CU-02) |
| Target System | MAIN |
| Proposed Family | FAM-10 (Platform Ops) or standalone ops unit |
| Feature Source | `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` (HD-001-SMTP) + `SOFT-LAUNCH-RT4-D-FINAL-IMPLEMENTATION-PRIORITY-SYNTHESIS.md` (CU-02, T0-2, P0) |
| Evidence Level | REPO_PARTIAL — `email.service.ts` code complete; SMTP vars absent in Vercel production |
| Confirmation Status | PARESH_DECISION_REQUIRED — provider selection is a Paresh ops action |
| Prov. Launch Class | LAUNCH_BLOCKER — HD-001-SMTP-INFRA-GAP-001 P0; all email delivery suppressed in production |
| Prov. Priority | P0 |
| No-code ops | YES — Paresh sets 4 Vercel env vars; no source changes needed to unblock existing email wrappers |
| Source changes needed | YES (separate governed unit) — for FTR-B2C-004 public inquiry notification loop only |
| Dependency | FTR-B2C-004 (PRIT-033 inquiry notification) depends on this being resolved first |
| Design plan | This document (`SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN.md`) |

---

## §15 Verification Plan (for this governance unit)

| Step | Command / Action | Expected result |
|---|---|---|
| G-1 | `git diff -- governance/units/SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN.md` | New file (no diff for new untracked file) |
| G-2 | `git diff -- governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` | PRIT-036 rows in §5A, §5B, §12 only |
| G-3 | `git status --short` | Only two allowlisted files in modified/untracked state |
| G-4 | Source files (*.ts, prisma/*, .env*) | Unchanged — no source edits in this unit |

---

## §16 Recommended Next Packet

Two parallel next actions are recommended:

### 16.1 F1-P1A — SMTP Provider Ops Remediation (Paresh action — P0, prerequisite for all)

**Unit ID (proposed):** `SOFT-LAUNCH-SMTP-REMEDIATION-E1`
**Type:** Ops-only (no code; Paresh action)
**Actions:**
1. Check Postmark account review status in dashboard.
2. If active: extract SMTP credentials and set 4 Vercel env vars.
3. If not active: select alternative provider; set 4 Vercel env vars.
4. Redeploy Vercel production.
5. Execute runtime verification steps V-1 through V-6 (§13.3).

**Blocking:** All existing email flows (invite, password reset, email verification) depend on this.

### 16.2 F1-P1B — Public Inquiry Notification Loop Implementation (PRIT-033 / FTR-B2C-004)

**Unit ID (proposed):** `SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001`
**Type:** Implementation unit (source changes)
**Prerequisite:** F1-P1A must be complete (SMTP must be operational) before this can be runtime-verified.
**Actions per §13.2:** Config addition, 3 new email wrappers, supplier email lookup in inquiry route, 3 fire-and-forget dispatch calls.
**Governance gate:** Requires Paresh explicit authorization + new family unit opening.

**Recommended sequencing:**
```
F1-P1A (Postmark ops check + Vercel env vars) → runtime verify
  ↓
F1-P1B (public inquiry notification loop implementation) → runtime verify
```

F1-P1A is a pure ops action and can start immediately. F1-P1B requires code changes and must
be authorized as a separate governed unit.

---

## §17 Authorization Scope — Explicit Boundary Statement

This unit is authorized to:
- ✅ Create `governance/units/SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN.md`
- ✅ Update `governance/launch-readiness/PLANNED-REQUIREMENTS-INTAKE.md` with PRIT-036

This unit is NOT authorized to:
- ❌ Modify any `.ts`, `.tsx`, `.js`, `.json`, `.prisma`, or other source files
- ❌ Modify `.env`, `.env.local`, `.env.production`, or any environment variable file
- ❌ Modify `server/prisma/schema.prisma` or any migration file
- ❌ Run `prisma db push`, `prisma migrate dev`, or any schema mutation command
- ❌ Modify any Vercel project settings or environment variables
- ❌ Modify any TLRH indexes or Layer 0 control files
- ❌ Modify any other governance document not in the allowlist above
- ❌ Implement FTR-B2C-004 or any public inquiry notification feature
- ❌ Change Layer 0 posture (`HOLD_FOR_AUTHORIZATION` remains unchanged)

No source, runtime, schema, or environment change has been made in this unit.

---

*Unit closed: 2026-07-14 — DESIGN_PLAN_COMPLETE*
