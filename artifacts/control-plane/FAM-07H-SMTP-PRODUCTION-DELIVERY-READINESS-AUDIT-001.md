# FAM-07H SMTP Production Delivery Readiness Audit

## 1. Unit ID

- FAM-07H-SMTP-PRODUCTION-DELIVERY-READINESS-AUDIT-001
- Mode: TECS Safe-Write bounded repo-truth audit + infrastructure implementation planning only
- Scope: Audit/planning only; no source/test/schema/config/runtime mutation
- Status: AUDIT_COMPLETE

## 2. Current HEAD

- HEAD at audit start: 5b1197c1
- Branch: main
- Worktree preflight: clean

## 3. Files and Search Surfaces Inspected

### Required read-only surfaces inspected

- server/src/services/email/email.service.ts
- server/src/services/email/email.templates.ts
- server/src/routes/tenant.ts
- server/src/routes/admin/tenantProvision.ts
- server/src/services/tenantProvision.service.ts
- server/src/config/index.ts
- server/src/lib/emailStubs.ts
- server/src/lib/auditLog.ts (search-level inspection)
- server/src/__tests__/email-inquiry-wrappers.unit.test.ts
- server/src/__tests__/public-buyer-inquiry.unit.test.ts
- server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts
- server/prisma/schema.prisma
- App.tsx
- services/tenantService.ts
- TECS.md
- governance/launch-readiness/LAUNCH-FAMILY-INDEX.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md
- artifacts/control-plane/FAM-07I-HUB-SYNC-FTR-AUTH-001-REMAINDER-TERMINOLOGY-RECONCILIATION-001.md
- artifacts/control-plane/FAM-07I-NEW-USER-SUPABASE-INVITE-SUBPATH-REPO-TRUTH-AUDIT-001.md

### Search commands executed

1. rg -n "SMTP|EMAIL|MAIL_|SMTP_|SENDGRID|RESEND|POSTMARK|NODEMAILER|sendInvite|invite email|SKIPPED_SMTP_UNCONFIGURED|sendMail|transporter" server services components App.tsx tests governance artifacts
2. rg -n "SMTP_HOST|SMTP_PORT|SMTP_USER|SMTP_PASS|SMTP_FROM|MAIL_HOST|MAIL_PORT|MAIL_USER|MAIL_PASS|EMAIL_FROM" server services .

## 4. Current Email/SMTP Architecture Summary

1. Canonical email delivery owner is server/src/services/email/email.service.ts.
2. sendEmail() is the core dispatcher used by named wrappers:
   - sendInviteMemberEmail
   - sendPasswordResetEmail
   - sendEmailVerificationEmail
   - sendBuyerInquiryAcknowledgementEmail
   - sendSupplierInquiryNotificationEmail
   - sendAdminInquiryAlertEmail
3. Environment behavior in sendEmail():
   - development/test: DEV_LOGGED (structured log only)
   - production + SMTP configured: SENT (nodemailer SMTP)
   - production + SMTP missing: SKIPPED_SMTP_UNCONFIGURED (non-fatal warning)
4. On production SMTP send failure, sendEmail() logs EMAIL_SEND_FAILED and re-throws; caller decides whether failure is fatal/non-fatal.

## 5. Provider/Library Findings

- Library in use: nodemailer (SMTP transport)
- Provider model: provider-agnostic SMTP (no hardcoded SendGrid/Resend/Postmark SDK usage in canonical mailer)
- Result: provider selection is external ops/config choice, not code-locked in mailer implementation

## 6. Expected Env Variable Names

### SMTP delivery vars (config schema)

- SMTP_HOST
- SMTP_PORT (default 587)
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

### Related optional notification var

- ADMIN_NOTIFICATION_EMAIL (safe-parse optional; null when absent/invalid)

## 7. Missing-Env Behavior

1. SMTP vars are optional in config schema (no fatal startup abort for missing SMTP values).
2. In production when SMTP vars are absent/incomplete, sendEmail() returns:
   - status: SKIPPED_SMTP_UNCONFIGURED
   - structured warning event: EMAIL_SMTP_UNCONFIGURED
3. App runtime remains healthy; email delivery is skipped gracefully.

## 8. Invite Delivery Dependency Boundary

1. Invite creation is not blocked by SMTP absence.
2. Tenant membership invite route (server/src/routes/tenant.ts):
   - creates invite/token first
   - attempts sendInviteMemberEmail in try/catch
   - never blocks invite creation on email failure
   - returns inviteToken and emailDelivery outcome
3. Approved onboarding provision route (server/src/routes/admin/tenantProvision.ts):
   - sends first-owner invite email as best-effort fire-and-forget
   - failures logged as non-blocking
4. Conclusion: SMTP is a production delivery dependency, not an auth/invite token issuance dependency.

## 9. Existing Test Coverage Inventory

1. email-inquiry-wrappers.unit.test.ts
   - validates wrapper behavior in test env (DEV_LOGGED path)
   - includes content-safety assertions
2. public-buyer-inquiry.unit.test.ts
   - verifies notification dispatch is non-blocking to route 202 responses
   - mocks email wrapper outcomes/errors
   - includes admin notification dispatch behavior with ADMIN_NOTIFICATION_EMAIL set/null
3. tenant-provision-approved-onboarding.integration.test.ts
   - mocks sendInviteMemberEmail (call-path coverage only)
4. Gap summary for FAM-07H objective:
   - No direct test proving production SMTP configured path (SENT) for invite mailer
   - No dedicated test asserting SKIPPED_SMTP_UNCONFIGURED is surfaced on invite endpoints under production config simulation

## 10. Production Verification Boundary

What repo truth can prove now:
- SMTP code path exists, graceful fallback exists, invite routes are non-blocking.

What repo truth cannot prove now:
- live provider credentials validity
- Vercel environment wiring correctness in current production
- inbox/provider-console delivery for invite emails

Therefore moving HD-001 from VERIFIED_BLOCKED requires environment/provider verification outside source code alone.

## 11. Secret-Handling Safety Notes

- This audit did not read or print any secrets.
- No credential values were requested or logged.
- Only placeholder variable names are required for planning:

SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
ADMIN_NOTIFICATION_EMAIL=

## 12. Required External Inputs From Paresh

1. SMTP provider/account decision (if not already final in live environment governance)
2. Vercel production env presence confirmation for:
   - SMTP_HOST
   - SMTP_PORT
   - SMTP_USER
   - SMTP_PASS
   - SMTP_FROM
3. Optional: ADMIN_NOTIFICATION_EMAIL target for admin alert path
4. Authorization to run live non-secret delivery verification (mailbox + platform logs)

## 13. Required Audit Questions — Direct Answers

1. Which file owns email delivery?
- server/src/services/email/email.service.ts

2. Does the repo use Nodemailer, Resend, SendGrid, Postmark, custom SMTP, or another provider?
- Nodemailer with provider-agnostic SMTP transport.

3. What exact env variable names are expected?
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (and optional ADMIN_NOTIFICATION_EMAIL for admin alerts).

4. Are env vars validated fatally at startup or treated as optional?
- SMTP vars are treated as optional (non-fatal). ADMIN_NOTIFICATION_EMAIL is optional safe-parse to null.

5. What is the current behavior when SMTP is missing?
- sendEmail() returns SKIPPED_SMTP_UNCONFIGURED and logs EMAIL_SMTP_UNCONFIGURED.

6. Is the behavior safe for app runtime?
- Yes. Runtime remains healthy; email is skipped without crashing request flow.

7. Is invite email delivery synchronous/blocking or best-effort/non-blocking?
- Best-effort/non-blocking for invite creation/provisioning outcomes.

8. Does invite creation still succeed if email sending is skipped?
- Yes. Invite/token creation succeeds; email delivery may be SKIPPED or FAILED_NON_FATAL.

9. Where is SKIPPED_SMTP_UNCONFIGURED produced or surfaced?
- Produced in email.service.ts sendEmail(); surfaced to invite APIs through emailDelivery payload where returned by sendInviteMemberEmail.

10. Are email failures audited/logged?
- Yes, structured logs: EMAIL_SMTP_UNCONFIGURED, EMAIL_SENT, EMAIL_SEND_FAILED, plus route-level non-fatal warning logs.

11. Are there tests for configured SMTP path?
- No direct production SMTP configured SENT-path test identified in this audit scope.

12. Are there tests for missing SMTP path?
- Indirectly yes via test-env DEV_LOGGED and mocked notification behavior; no dedicated invite-route production missing-SMTP simulation test identified.

13. Is there a production verification path that avoids exposing raw passwords/secrets?
- Yes: presence/health verification via masked env checks + runtime behavior checks + mailbox/provider evidence without printing credential values.

14. What exact provider/Vercel inputs are required from Paresh?
- Provider account readiness + Vercel env presence for SMTP_HOST/PORT/USER/PASS/FROM (+ optional ADMIN_NOTIFICATION_EMAIL) and authorization for live verification.

15. What is the smallest next implementation/infrastructure unit?
- Runtime verification-focused infra unit with no source changes: verify SMTP env presence (masked), execute controlled invite delivery flow, confirm emailDelivery != SKIPPED_SMTP_UNCONFIGURED and mailbox/provider receipt evidence.

## 14. Smallest Next Unit Recommendation

Recommended next unit title:
- FAM-07H-SMTP-PRODUCTION-DELIVERY-RUNTIME-VERIFICATION-001

Type:
- Infrastructure/runtime verification unit (no source mutation)

Goal:
- Demonstrate HD-001 transition evidence from blocked state toward configured/test-confirmed by live proof.

## 15. Proposed Allowlist for Next Unit

If next unit remains verification-only:
- artifacts/control-plane/FAM-07H-SMTP-PRODUCTION-DELIVERY-RUNTIME-VERIFICATION-001.md
- governance/control/NEXT-ACTION.md (optional pointer hygiene only)
- governance/control/OPEN-SET.md (optional pointer hygiene only)

If a separate code-hardening test unit is authorized later:
- server/src/__tests__/... (explicit targeted test files only)
- artifacts/control-plane/<test-hardening-artifact>.md

## 16. Proposed Validation / Live Verification Checklist (No Secret Exposure)

1. Confirm runtime preconditions (presence-only, masked): SMTP_* vars exist in Vercel production.
2. Trigger controlled invite flow via approved onboarding or tenant invite path.
3. Capture API response classification (emailDelivery status where applicable).
4. Confirm server logs do not show EMAIL_SMTP_UNCONFIGURED for the verification transaction.
5. Confirm mailbox/provider evidence of invite receipt (message ID/time), with recipient masked in artifact.
6. If failure: classify exact failure domain (env missing, provider reject, SMTP auth, sender policy) without exposing secrets.

## 17. Hub Impact Decision

NO_HUB_UPDATE_REQUIRED

Rationale:
- This is audit/planning only.
- No implementation, env configuration, or live delivery verification result changed launch-readiness truth in this unit.

## 18. Final Classification Enum

HD_001_SMTP_REMAINDER_PROVIDER_CREDENTIALS_REQUIRED
