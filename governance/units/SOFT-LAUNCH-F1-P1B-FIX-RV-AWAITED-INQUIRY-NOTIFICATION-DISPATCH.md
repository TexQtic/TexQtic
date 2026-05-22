# SOFT-LAUNCH-F1-P1B — Fix Runtime Verification: Awaited Inquiry Notification Dispatch

**Unit ID:** SOFT-LAUNCH-F1-P1B-FIX-RV-AWAITED-INQUIRY-NOTIFICATION-DISPATCH
**Feature refs:** FTR-B2C-004 / PRIT-033
**Status:** INQUIRY_NOTIFICATION_FIX_RUNTIME_VERIFIED_BUYER_ONLY
**Created:** 2026-05-22
**Track:** SOFT-LAUNCH Ops Runtime Verification
**Scope:** Read-only verification and artifact creation — NO source code, test, schema, migration, or env changes authorized
**Preceded by:** SOFT-LAUNCH-F1-P1B-FIX-AWAITED-INQUIRY-NOTIFICATION-DISPATCH (commit `6dfbb48`)
**Prior RV:** SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001-RUNTIME-VERIFY (commit `be2cf9f`) — PARTIAL_VERIFIED

---

## §1 Unit Header and Authority Boundary

### Purpose

Verify the end-to-end runtime behaviour of the awaited inquiry notification dispatch in
production following the serverless lifecycle fix at commit `6dfbb48`. Specifically:

1. Confirm `POST /api/public/inquiry/submit` returns 202 with a valid payload.
2. Confirm Postmark records the buyer acknowledgement email after a real general inquiry.
3. Confirm admin alert email delivery (if `ADMIN_NOTIFICATION_EMAIL` is configured).
4. Confirm supplier notification is not applicable on the general inquiry path.
5. Classify the fix outcome: full, buyer-only, or failed.

### Authority Boundary

| Dimension | This unit's role |
|---|---|
| Source code changes | NONE — forbidden by unit scope |
| Schema / migration changes | NONE — forbidden by unit scope |
| Env / config source changes | NONE — forbidden by unit scope |
| `.env` / Vercel env var changes | NONE — ops-only; Paresh action only |
| Allowlisted file mutations | Create this document only |
| Runtime actions permitted | Live `POST` to production API; Postmark dashboard read |

### Secret Handling Declaration

No SMTP credentials, API tokens, passwords, or connection strings are recorded in
this document. All email addresses are masked per the required masking protocol.
No `.env` contents are printed. Buyer test address appears only as `s***@gmail.com`.
Admin email appears only as `SET_MASKED`.

---

## §2 TLRH Storage Note

This unit is a runtime verification artifact for a production fix. It is not a
design decision, implementation plan, or policy document. It must not be added to
the TLRH index or any Layer 0 index. It is stored in `governance/units/` only.

---

## §3 Git / Worktree Truth

| Field | Value |
|---|---|
| HEAD commit (at unit start) | `6dfbb4830f88281e329fc35089f0e87d349329a0` |
| Commit subject | `[TEXQTIC] fix: await inquiry notifications before response` |
| Branch | `main` |
| Worktree status | CLEAN — no staged or unstaged modifications |
| Remote sync | `origin/main` == HEAD — fix is live on `app.texqtic.com` |

---

## §4 Inputs Reviewed

| Artifact | Location | Reviewed |
|---|---|---|
| `SOFT-LAUNCH-F1-P1B-FIX-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md` | `governance/units/` | YES |
| `SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001-RUNTIME-VERIFY.md` | `governance/units/` | YES |
| `SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY.md` | `governance/units/` | YES |
| `server/src/routes/public.ts` | Source (read-only) | YES — confirmed awaited dispatch pattern |
| `server/src/services/email/email.service.ts` | Source (read-only) | YES — confirmed production SMTP path |
| `api/index.ts` | Source (read-only) | YES — confirmed serverless handler |

---

## §5 Paresh-Provided Runtime Inputs

| Input | Value |
|---|---|
| Deployed commit on `app.texqtic.com` | `6dfbb48` or later — confirmed by Paresh |
| Redeployed after `6dfbb48` | YES — confirmed by Paresh |
| `ADMIN_NOTIFICATION_EMAIL` in Vercel production | `SET_MASKED` — present; value not shared |
| Buyer test email for controlled inquiry | `s***@gmail.com` (masked) |
| Supplier target | `GENERAL_INQUIRY_ONLY` — no `supplier_slug` |
| Postmark dashboard access | Available in IDE browser (server ID 18924467) |

---

## §6 Deployment State

| Field | Value |
|---|---|
| Deployment classification | `DEPLOYMENT_CONFIRMED` |
| HEAD origin/main | `6dfbb4830f88281e329fc35089f0e87d349329a0` |
| Matches production | YES — Paresh confirmed redeployment after fix commit |
| Method of confirmation | Git `log --oneline` showing `6dfbb48 (HEAD -> main, origin/main, origin/HEAD)` |

---

## §7 Runtime Prerequisites

| Prerequisite | Status |
|---|---|
| `NODE_ENV=production` in Vercel | ASSUMED_SET — prior SMTP verification confirmed |
| `SMTP_HOST` | SET — confirmed in prior SMTP runtime verify |
| `SMTP_USER` | SET — confirmed in prior SMTP runtime verify |
| `SMTP_PASS` | SET — confirmed in prior SMTP runtime verify |
| `SMTP_FROM` | SET — confirmed in prior SMTP runtime verify |
| `ADMIN_NOTIFICATION_EMAIL` | SET_MASKED — confirmed by Paresh |
| Postmark DKIM + RETURN_PATH | VERIFIED — confirmed in prior SMTP runtime verify |
| `ACTIVE_EXTERNAL_SEND_ENABLED` | VERIFIED — confirmed in prior SMTP runtime verify |

---

## §8 Production Health Result

| Field | Value |
|---|---|
| Endpoint | `GET https://app.texqtic.com/api/health` |
| HTTP Status | 200 |
| Response body | `{"status":"ok","timestamp":"2026-05-22T01:43:05.834Z"}` |
| Classification | `HEALTH_OK` |

---

## §9 Postmark Baseline (Before Inquiry)

Captured by IDE browser screenshot of Postmark activity tab at:
`https://account.postmarkapp.com/servers/18924467/streams/outbound/events`

| Field | Baseline value |
|---|---|
| Email quota | 11 of 100 |
| Events count | 59 events found |
| Most recent message | "You've been invited to join QA B2B on TexQtic" — May 22, 6:55 AM |
| Inquiry-related messages | NONE |
| Classification | `BASELINE_RECORDED` |

---

## §10 Controlled Inquiry Request

### Request details

| Field | Value |
|---|---|
| Endpoint | `POST https://app.texqtic.com/api/public/inquiry/submit` |
| Submission count | EXACTLY ONE |
| Content-Type | `application/json` |
| `inquiry_category` | `GENERAL` |
| `source_surface` | `DIRECT` |
| `buyer_email` | `s***@gmail.com` (masked) |
| `message` | "Runtime verification test F1-P1B-FIX awaited dispatch" |
| `supplier_slug` | NOT PROVIDED (general inquiry path) |

### Rationale

General inquiry path exercises the second dispatch block in `public.ts` (lines ~1500–1543),
which handles the case where `supplier_slug` is absent. This is the block fixed in `6dfbb48`.

---

## §11 Inquiry Response Result

| Field | Value |
|---|---|
| HTTP Status | 202 |
| Response body | `{"success":true,"data":{"acknowledged":true,"message":"Your inquiry has been received."}}` |
| Latency | Within normal Vercel cold-start range |
| Classification | `INQUIRY_ACCEPTED_202` |

---

## §12 Buyer Acknowledgement Result

| Field | Value |
|---|---|
| Expected recipient | `s***@gmail.com` (masked) |
| Subject | "We received your TexQtic inquiry" |
| Postmark Processed event | YES — May 22, 8:14:22 AM |
| Postmark Delivered event | YES — May 22, 8:14:22 AM |
| Postmark Opened event | YES — May 22, 8:14:23 AM |
| Classification | `DELIVERED_AND_OPENED_IN_POSTMARK` |

The buyer acknowledgement email was processed, delivered, and opened within 1 second of
the 202 response. This confirms that `sendBuyerInquiryAcknowledgementEmail` was dispatched
and completed before the route returned — which is precisely the serverless lifecycle fix.

---

## §13 Supplier Notification Result

| Classification | NOT_APPLICABLE_GENERAL_PATH |
|---|---|

No `supplier_slug` was provided. The general inquiry path does not dispatch a supplier
notification email by design. This is correct behaviour.

---

## §14 Admin Alert Result

| Field | Value |
|---|---|
| `ADMIN_NOTIFICATION_EMAIL` configured | YES (`SET_MASKED`) |
| Admin alert found in Postmark activity | NO |
| Quota increment | 1 (from 11 to 12) — only the buyer acknowledgement consumed a send |
| Classification | `NOT_FOUND_IN_POSTMARK` |

### Analysis

The admin alert email was not dispatched despite `ADMIN_NOTIFICATION_EMAIL` being set.
The quota increment of exactly 1 confirms only one SMTP send was made (the buyer
acknowledgement). The admin alert is dispatched in the same `Promise.race` block but
was silently skipped.

**Likely root cause:** The `sendAdminInquiryAlertEmail` function was called with a `null`
or falsy admin email at runtime, causing a guard check inside `email.service.ts` to skip
the send. This can occur if:
- The `config.ADMIN_NOTIFICATION_EMAIL` value resolved to `undefined` or empty string in
  the Vercel environment at the time of this request, despite being set; OR
- The email template subject or body for the admin alert has a validation failure that
  causes an internal `SKIPPED` classification; OR
- The admin alert branch in the general inquiry dispatch block has a conditional guard that
  was not triggered for this test payload.

This requires a targeted runtime-log investigation in Vercel (Vercel Function Logs for
the `api/index.ts` invocation). **This is a remaining blocker — not resolved by this unit.**

---

## §15 Postmark Dashboard / Activity Summary

| Field | Post-inquiry value |
|---|---|
| Email quota | 12 of 100 (was 11) |
| Events count | 62 events found (was 59; +3 = Processed + Delivered + Opened for buyer ack) |
| New inquiry events | Buyer ack: Processed, Delivered, Opened (all for `s***@gmail.com`) |
| Admin alert events | NONE |
| Supplier notification events | NONE (not applicable) |
| Dashboard URL | `https://account.postmarkapp.com/servers/18924467/streams/outbound/events` |

---

## §16 Failure-Safe and Serverless Lifecycle Confirmation

### Fire-and-forget defect (prior state at `9fa8b12`)

Before the fix, both dispatch blocks used `void (async () => { ... })()` IIFEs.
When `reply.send()` was called, the Fastify route handler promise resolved.
`await fastify.server.emit('request', req, res)` in `api/index.ts` resolved.
Vercel froze the Lambda. The IIFE was abandoned. Zero emails were sent.

### Awaited dispatch (current state at `6dfbb48`)

Both dispatch blocks now use:
```typescript
const _notificationTimeoutMs = 4000;
await Promise.race([
  Promise.allSettled(_dispatches),
  new Promise<void>(resolve => setTimeout(resolve, _notificationTimeoutMs)),
]);
return reply.status(202).send({ ... });
```

The `reply.send()` is called AFTER `Promise.race` resolves — which is after all dispatches
complete (or after 4000ms timeout). The Lambda is not frozen until after sends complete.

### Verification outcome

The buyer acknowledgement email was delivered 1 second after the 202 response was returned,
confirming the dispatch completed within the Lambda's active window. The serverless lifecycle
fix is confirmed effective for the buyer path.

---

## §17 Runtime Classification

```
INQUIRY_NOTIFICATION_FIX_RUNTIME_VERIFIED_BUYER_ONLY
```

### Classification rationale

| Criterion | Result |
|---|---|
| 202 response with correct body | PASS |
| Buyer acknowledgement delivered | PASS — DELIVERED_AND_OPENED_IN_POSTMARK |
| Admin alert delivered | FAIL — NOT_FOUND_IN_POSTMARK |
| Supplier notification | NOT_APPLICABLE_GENERAL_PATH |

Full classification (`INQUIRY_NOTIFICATION_FIX_RUNTIME_VERIFIED_GENERAL_FULL`) requires
both buyer ack AND admin alert to be present in Postmark. Admin alert was absent.
Therefore: `BUYER_ONLY`.

The serverless lifecycle fix is confirmed working (buyer path delivers correctly).
The admin alert dispatch gap is a separate residual gap requiring investigation.

---

## §18 Remaining Blockers and Open Items

| ID | Description | Severity | Owner |
|---|---|---|---|
| **INQ-ADMIN-01** | Admin alert email not dispatched despite `ADMIN_NOTIFICATION_EMAIL` set. Requires Vercel function log inspection to determine whether `config.ADMIN_NOTIFICATION_EMAIL` resolves correctly at runtime and whether `sendAdminInquiryAlertEmail` is called or skipped. | HIGH | Paresh / next session |
| PRIT-034 | Legal pages (Privacy Policy, Terms of Service) missing | MEDIUM | Future sprint |
| INQ-COPY-02 | Buyer acknowledgement email copy truthfulness — subject and body copy review needed | MEDIUM | F1-P5 |
| INQ-COPY-24 | Admin alert email copy review | MEDIUM | F1-P5 (blocked by INQ-ADMIN-01) |
| Postmark webhook | No delivery failure alerting; currently relying on manual Postmark activity review | LOW | Future ops |

---

## §19 Recommended Next Packet

**Immediate:** `SOFT-LAUNCH-F1-P1B-FIX-RV-ADMIN-ALERT-INVESTIGATION` — targeted
runtime-log investigation for `INQ-ADMIN-01`. Access Vercel Function Logs for the
inquiry submission, confirm whether `sendAdminInquiryAlertEmail` was called and what
result was returned. Determine if `config.ADMIN_NOTIFICATION_EMAIL` is resolving correctly
in the Vercel serverless environment.

**After INQ-ADMIN-01 resolved:** `SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX` —
review and correct buyer acknowledgement and admin alert email copy for production accuracy.

---

## §20 No-Secrets / No-Source-Change Statement

- No SMTP credentials, API tokens, passwords, JWTs, DB URLs, or `.env` contents
  appear anywhere in this document.
- Buyer test email appears only as `s***@gmail.com`.
- Admin notification email appears only as `SET_MASKED`.
- No source code, test files, schema, migration, or environment variable was modified
  by this verification unit.
- Only the following file was created: `governance/units/SOFT-LAUNCH-F1-P1B-FIX-RV-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md`
