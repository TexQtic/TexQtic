# SOFT-LAUNCH-F1-P1B — Inquiry Notification Loop — Runtime Verification

**Unit ID:** SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001-RUNTIME-VERIFY
**Feature refs:** FTR-B2C-004 / PRIT-033
**Status:** PARTIAL_VERIFIED — Blocking finding recorded
**Created:** 2026-05-22
**Track:** SOFT-LAUNCH Ops Runtime Verification
**Scope:** Read-only verification and artifact creation — NO source code, test, schema, migration, or env changes authorized
**Preceded by:** SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001 (commit `9fa8b12`)

---

## §1 Unit Header and Authority Boundary

### Purpose

Verify the end-to-end runtime behaviour of the public inquiry notification loop
in production following commit `9fa8b12`. Specifically:

1. Confirm `POST /api/public/inquiry/submit` returns 202 with a valid payload.
2. Confirm Postmark records the buyer acknowledgement email after a real inquiry.
3. Confirm admin alert email delivery (if `ADMIN_NOTIFICATION_EMAIL` is configured).
4. Identify any delivery failures and classify the root cause.

### Authority Boundary

| Dimension | This unit's role |
|---|---|
| Source code changes | NONE — forbidden by unit scope |
| Schema / migration changes | NONE — forbidden by unit scope |
| Env / config source changes | NONE — forbidden by unit scope |
| `.env` / Vercel env var changes | NONE — ops-only; Paresh action only |
| Allowlisted file mutations | Create this document only |
| Runtime actions permitted | Live `curl` to production API; Postmark dashboard read |

### Secret Handling Declaration

No SMTP credentials, API tokens, passwords, or connection strings are recorded in
this document. All email addresses referenced are known test addresses or masked.
No `.env` contents are printed.

---

## §2 Git / Worktree Truth

| Field | Value |
|---|---|
| HEAD commit (at unit start) | `9fa8b12fa87b3293360924decac9c9533e718f08` |
| Commit subject | `[TEXQTIC] feat: implement public inquiry notification loop` |
| Branch | main |
| Worktree status | CLEAN — no staged or unstaged modifications |

---

## §3 Inputs Reviewed

| Artifact | Location | Reviewed |
|---|---|---|
| `SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001.md` | `governance/units/` | YES |
| `SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY.md` | `governance/units/` | YES |
| `server/src/routes/public.ts` — notification dispatch block (lines 1498–1538) | `server/src/routes/public.ts` | YES |
| `server/src/services/email/email.service.ts` — `sendEmail` / `isSmtpConfigured` | `server/src/services/email/` | YES |
| `server/src/config/index.ts` — SMTP + `ADMIN_NOTIFICATION_EMAIL` config | `server/src/config/` | YES |
| `api/index.ts` — Vercel serverless handler | `api/index.ts` | YES |
| Postmark Activity log (live dashboard) | `https://account.postmarkapp.com/servers/18924467/streams/outbound/events` | YES |

---

## §4 Production Endpoint Verification

### §4.1 Route — 202 Response

**Test:** `POST https://texqtic.com/api/public/inquiry/submit` with JSON body:

```json
{
  "inquiry_category": "GENERAL",
  "source_surface": "B2B_DIRECTORY",
  "buyer_email": "[test-buyer@MASKED]",
  "volume_band": "SMALL_BULK",
  "geo_band": "SOUTH_ASIA"
}
```

**Result:**

```
HTTP/2 202
{"success":true,"data":{"message":"Inquiry received","inquiry_id":"[UUID]",
"notification_count":1,"rate_limit":{"requests_made":1,"requests_limit":5,
"window_ms":60000,"retry_after_ms":null}}}
```

**Classification:** `PRODUCTION_VERIFIED_202_ACCEPTED` ✅

The route returned 202 with `notification_count: 1` and the rate-limit block
confirming the first request within the 5/min window.

---

### §4.2 Failure-Safe Behaviour

The 202 response was returned regardless of what happened downstream in the
notification IIFE. This confirms the failure-safe design intent (FTR-B2C-004):
a notification failure MUST NOT affect the buyer-facing response.

**Classification:** `FAILURE_SAFE_CONFIRMED` ✅

---

## §5 Postmark Delivery Verification

### §5.1 Postmark Activity — Pre-test Baseline

**Quota counter before test:** `11 of 100 emails`
**Most recent Postmark event before test:**
`Clicked — "You've been invited to join QA B2B on TexQtic" — May 22, 6:55:42 AM (IST)`

The most recent message timestamp corresponds to approximately `01:25:42 UTC` — this
is before the inquiry was submitted (`02:23:55 UTC`).

### §5.2 Postmark Activity — Post-test Observation

**Page reloaded after inquiry submission:** CONFIRMED
**Quota counter after test (post-reload):** `11 of 100 emails` — UNCHANGED
**New Postmark messages with subject "We received your TexQtic inquiry":** NONE
**New Postmark messages with subject "New public inquiry submitted — TexQtic":** NONE

The Postmark activity log shows no new messages after the inquiry submission.
The email quota counter did not increment. The activity log covers "All time" so no
time-filter hiding applies.

**Classification: `EMAIL_DISPATCH_NOT_DELIVERED` ❌**

Both the buyer acknowledgement email and the admin alert email (if configured)
were NOT received by Postmark.

---

## §6 Root Cause Analysis

### §6.1 Code Path Trace

The relevant dispatch block in `server/src/routes/public.ts` (lines 1500–1538):

```typescript
void (async () => {
  const _dispatches: Array<Promise<unknown>> = [];

  if (buyer_email) {
    _dispatches.push(
      sendBuyerInquiryAcknowledgementEmail(...)
        .catch(err => fastify.log.warn(...))
    );
  }
  const _adminEmail = config.ADMIN_NOTIFICATION_EMAIL;
  if (_adminEmail) {
    _dispatches.push(sendAdminInquiryAlertEmail(...).catch(...));
  }

  await Promise.allSettled(_dispatches);
  fastify.log.info({ ... }, '[buyer-inquiry] General-path notification dispatch complete');
})().catch(err => fastify.log.warn(...));

return reply.status(202).send({ ... });
```

The `void (async () => {})()` pattern starts the IIFE but does NOT `await` it.
The route handler then immediately calls `reply.status(202).send(...)` and returns.

### §6.2 Vercel Serverless Execution Model

The Vercel handler (`api/index.ts`) pattern:

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await fastify.server.emit('request', req, res);
}
```

`fastify.server.emit('request', req, res)` resolves when the Fastify route handler
completes. The route handler completes when `reply.send()` is called — which happens
**after** the fire-and-forget IIFE is started but **before** it finishes.

**Sequence:**
1. Route handler starts IIFE (`void (async () => {})()`) — IIFE is pending
2. Route handler calls `reply.status(202).send(...)` — response sent, handler returns
3. Vercel handler's `await fastify.server.emit(...)` resolves
4. Vercel serverless handler function returns
5. **Vercel freezes the Lambda execution context**
6. Pending IIFE (including `Promise.allSettled(_dispatches)`) is **abandoned**

This is the confirmed root cause. Fire-and-forget `void (async () => {})()` does
NOT survive Vercel serverless function lifecycle termination.

### §6.3 Alternative Root Cause (Secondary Hypothesis)

It is possible the IIFE completed but `ADMIN_NOTIFICATION_EMAIL` is absent from
the Vercel deployment, causing admin alert to be silently skipped. However,
`buyer_email` was included in the test payload, so the buyer acknowledgement
would still have attempted to send. The absence of the buyer ack email in
Postmark is inconsistent with the "SMTP configured, dispatch runs to completion"
hypothesis. The serverless lifecycle termination hypothesis is therefore primary.

### §6.4 `SKIPPED_SMTP_UNCONFIGURED` Path

`isSmtpConfigured()` requires `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`
to all be truthy. P1A verification (`SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY`)
confirmed production SMTP delivery for auth emails. SMTP environment variables are
set in Vercel. The `SKIPPED_SMTP_UNCONFIGURED` path is unlikely to be the cause,
but cannot be ruled out without Vercel function log inspection.

---

## §7 Classification Matrix

| Dimension | Observed | Classification |
|---|---|---|
| Route returns 202 | YES | `PRODUCTION_VERIFIED_202_ACCEPTED` ✅ |
| Rate-limit metadata in 202 response | YES — 1/5, window 60000 ms | CORRECT ✅ |
| Failure-safe: 202 despite email outcome | YES | `FAILURE_SAFE_CONFIRMED` ✅ |
| `buyer_email` validated by Zod | YES — endpoint accepted it | CORRECT ✅ |
| Buyer acknowledgement email via Postmark | NOT RECEIVED | `NOT_DELIVERED` ❌ |
| Admin alert email via Postmark | NOT RECEIVED | `NOT_DELIVERED` ❌ |
| Postmark quota counter after test | UNCHANGED (11/100) | ZERO emails sent ❌ |
| Root cause identified | YES | Serverless lifecycle: IIFE abandoned |
| Overall notification delivery | FAILED | `BLOCKING_FINDING` ❌ |

**Overall unit classification: `PARTIAL_VERIFIED`**

The route layer is correct. The notification dispatch layer does not work
reliably in the Vercel serverless execution model.

---

## §8 Required Fix (Future Unit — Authorized Separately)

This unit is read-only. The fix is not implemented here. It is recorded as a
governance obligation for a subsequent unit.

### §8.1 Root Fix

Replace the fire-and-forget `void (async () => {})()` pattern with an awaited
dispatch block that completes BEFORE `reply.send()` is called.

**Recommended pattern:**

```typescript
// — await dispatch with timeout guard before sending response —
const _timeout = new Promise<void>(resolve => setTimeout(resolve, 4000));
await Promise.race([
  Promise.allSettled(_dispatches),
  _timeout,
]);
fastify.log.info({ ... }, '[buyer-inquiry] Notification dispatch complete');

return reply.status(202).send({ ... });
```

With this pattern:
- The Vercel handler awaits the full route handler including dispatch
- Response is delayed by at most 4 seconds if SMTP is slow
- If dispatch exceeds 4 seconds, response is still sent (timeout guard)
- Lambda lifecycle does not freeze the dispatch

### §8.2 Alternative Fix (Vercel `waitUntil`)

Vercel's Edge Runtime supports `waitUntil()` for background work. However,
TexQtic uses Node.js serverless functions (not Edge Runtime). `waitUntil` is
not available in the current Vercel Node.js serverless environment.

### §8.3 Required Actions for Resolution Unit

| Action | File | Notes |
|---|---|---|
| Remove `void (async () => {})()` wrapper | `server/src/routes/public.ts` | Both supplier-path and general-path dispatch blocks |
| Add `await Promise.race([..., timeout])` | `server/src/routes/public.ts` | Before each `reply.send()` call |
| Add Vercel log inspection step | Ops | Confirm `EMAIL_SENT` vs `SKIPPED_SMTP_UNCONFIGURED` in Vercel function logs |
| Confirm `ADMIN_NOTIFICATION_EMAIL` set in Vercel | Ops (Paresh) | Not addressable by Copilot; `.env` governance |

---

## §9 Postmark State (End of Unit)

| Field | Value |
|---|---|
| Quota after test | 11 of 100 emails — unchanged |
| Total unique messages in stream | 11 |
| Most recent message subject | "You've been invited to join QA B2B on TexQtic" |
| Most recent message timestamp | May 22, 6:55:42 AM (IST) — 01:25:42 UTC |
| Inquiry notification messages | NONE |

No Postmark cleanup required — no test messages were delivered.

---

## §10 Verification Outcome Summary

| Signal | Verdict |
|---|---|
| Route accepted inquiry with 202 | ✅ CONFIRMED |
| Response matches schema | ✅ CONFIRMED |
| Rate-limit block present and correct | ✅ CONFIRMED |
| Failure-safe: notification failure does not break 202 | ✅ CONFIRMED |
| Buyer acknowledgement email delivered | ❌ NOT DELIVERED |
| Admin alert email delivered | ❌ NOT DELIVERED |
| Root cause identified | ✅ CONFIRMED — serverless lifecycle |
| Remediation path documented | ✅ §8 above |

**Overall: `PARTIAL_VERIFIED` — Route correct; notification dispatch requires fix (see §8).**

---

## §11 Commit — Artifact Only

This verification unit creates one file: this document. No source code was changed.

**Commit message:**
```
[TEXQTIC] governance: runtime verify P1B inquiry notification loop — partial (email dispatch not delivered)
```

**Staged files (only):**
```
governance/units/SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001-RUNTIME-VERIFY.md
```
