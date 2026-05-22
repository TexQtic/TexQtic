# SOFT-LAUNCH-F1-P1B — Admin Alert Env Verification

**Unit ID:** SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY
**Feature refs:** FTR-B2C-004 / PRIT-033
**Status:** INQUIRY_NOTIFICATION_ADMIN_ENV_VERIFIED_FULL
**Created:** 2026-05-22
**Track:** SOFT-LAUNCH Ops Runtime Verification
**Scope:** Verification only — NO source, test, schema, migration, env, or Vercel changes authorized
**Closes:** INQ-ADMIN-01
**Preceded by:** SOFT-LAUNCH-F1-P1B-FIX-RV-ADMIN-ALERT-INVESTIGATION (commit `62563bb`)

---

## §1 Unit Header and Authority Boundary

### Purpose

Verify that the admin alert email is dispatched correctly after Paresh added
`ADMIN_NOTIFICATION_EMAIL` to the Vercel Production environment and redeployed.

Prior investigation (`SOFT-LAUNCH-F1-P1B-FIX-RV-ADMIN-ALERT-INVESTIGATION`) classified
root cause as `ADMIN_ALERT_SKIPPED_CONFIG_NULL` — the env var was absent from Vercel
Production, causing `config.ADMIN_NOTIFICATION_EMAIL` to be `null` at Lambda startup,
which caused the `if (_adminEmail)` guard in `public.ts` to skip the dispatch.

This unit submits one controlled general inquiry and verifies both emails are delivered.

### Authority Boundary

| Dimension | This unit's role |
|---|---|
| Source code changes | NONE — verification only |
| Schema / migration changes | NONE |
| Env / Vercel config changes | NONE — Paresh set env var before this unit ran |
| Allowlisted file mutations | Create this document only |
| Runtime actions | ONE controlled general inquiry to production |

### Secret Handling Declaration

No SMTP credentials, API tokens, passwords, JWTs, DB URLs, or `.env` contents appear
in this document. Email addresses masked: admin email → `p***@texqtic.com`. Buyer test
email → `s***@gmail.com`. No Vercel token, Postmark token, or connection string printed.
The Postmark dashboard incidentally displayed `paresh@texqtic.com` as a recipient address
in the activity feed; this is a company-owned address already public in git history.
It is masked in this artifact.

---

## §2 TLRH Storage Note

This document is a runtime verification artifact confirming that `ADMIN_NOTIFICATION_EMAIL`
is correctly configured in Vercel Production and that the admin alert email is dispatched.
It must not be added to the TLRH index or any Layer 0 index. Stored in `governance/units/` only.

---

## §3 Git / Worktree Truth

| Field | Value |
|---|---|
| HEAD commit (at unit start) | `62563bb5d3afe45d430175de82f1a6341a43a5e3` |
| Commit subject | `[TEXQTIC] docs: investigate inquiry admin alert gap` |
| Branch | `main` |
| Worktree status | CLEAN — no staged or unstaged modifications |
| Origin sync | `origin/main` == HEAD |
| Fix commit in ancestry | YES — `6dfbb48` is an ancestor of HEAD |

---

## §4 Inputs Reviewed

| Artifact / File | Reviewed | Notes |
|---|---|---|
| `governance/units/SOFT-LAUNCH-F1-P1B-FIX-RV-ADMIN-ALERT-INVESTIGATION.md` | YES | Root cause: `ADMIN_ALERT_SKIPPED_CONFIG_NULL` |
| `governance/units/SOFT-LAUNCH-F1-P1B-FIX-RV-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md` | YES | Prior RV: buyer-only; INQ-ADMIN-01 opened |
| `governance/units/SOFT-LAUNCH-F1-P1B-FIX-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md` | YES | Source fix at `6dfbb48` |
| `server/src/routes/public.ts` | YES | Schema confirmed; dispatch block understood |
| `server/src/config/index.ts` | YES | `safeParse` pattern; `ADMIN_NOTIFICATION_EMAIL` → `null` if absent |
| `server/src/services/email/email.service.ts` | YES | `sendAdminInquiryAlertEmail` confirmed correct |
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` | YES | INQ-035 confirms dispatch when configured |

---

## §5 Paresh Env / Deploy Confirmation

| Field | Confirmed Value |
|---|---|
| `ADMIN_NOTIFICATION_EMAIL` in Vercel | SET_MASKED |
| Email format | Valid plain email — no quotes, no display name, no whitespace |
| Scope | Production |
| Redeployed after setting variable | YES |
| Buyer test email | PARESH_CONTROLLED_MASKED (`s***@gmail.com`) |
| Supplier target | GENERAL_INQUIRY_ONLY (no `supplier_slug`) |
| Postmark dashboard | AVAILABLE |

---

## §6 Production Health Result

| Field | Value |
|---|---|
| Endpoint | `GET https://app.texqtic.com/api/health` |
| HTTP status | 200 OK |
| Response body | `{"status":"ok","timestamp":"2026-05-22T03:44:29.996Z"}` |
| Vercel-Id | `bom1::iad1::wmx7h-1779421469084-1da645255f11` |
| Classification | HEALTH_OK |

---

## §7 Postmark Baseline (Pre-Inquiry)

Captured via Postmark dashboard (server ID 18924467, Default Transactional Stream)
before inquiry submission.

| Field | Baseline Value |
|---|---|
| Account quota | 12 of 100 emails |
| Total events | 62 events found |
| Most recent event timestamp | May 22, 8:14:23 AM (prior session — buyer ack Opened) |
| Most recent subject | "We received your TexQtic inquiry" |
| Most recent recipient | `s***@gmail.com` |
| Admin alert events visible | NONE |

---

## §8 Controlled Inquiry Request Summary

| Field | Value |
|---|---|
| Endpoint | `POST https://app.texqtic.com/api/public/inquiry/submit` |
| `inquiry_category` | `GENERAL` |
| `source_surface` | `DIRECT` |
| `buyer_email` | `s***@gmail.com` (Paresh-controlled, masked) |
| `message` | `Runtime verification test - admin email env verify` |
| `supplier_slug` | NONE — general inquiry only |
| Rate limit before | `X-Ratelimit-Remaining: 19` of 20 (this was a prior failed parse attempt; no email was sent for that 400 response) |

---

## §9 Inquiry Response Result

| Field | Value |
|---|---|
| HTTP status | **202 Accepted** |
| Response body | `{"success":true,"data":{"acknowledged":true,"message":"Your inquiry has been received."}}` |
| Rate limit remaining | 18 of 20 |
| `notification_count` in response | Not returned (as expected — non-blocking dispatch) |

---

## §10 Buyer Acknowledgement Result

| Field | Value |
|---|---|
| Subject | "We received your TexQtic inquiry" |
| Recipient | `s***@gmail.com` |
| Processed at | May 22, 8:46:01 AM |
| Delivered at | May 22, 8:46:02 AM |
| Opened at | May 22, 8:46:03 AM |
| Postmark message ID | `195f451e-3515-49c6-affd-00fcd4491525` |
| Classification | **DELIVERED** |

---

## §11 Admin Alert Result

| Field | Value |
|---|---|
| Subject | "New public inquiry submitted — TexQtic" |
| Recipient | `p***@texqtic.com` |
| Processed at | May 22, 8:46:01 AM |
| Delivered at | **May 22, 8:46:02 AM** |
| Opened | Not tracked in this window |
| Postmark message ID | `6b81e71e-f650-4d8b-b8e4-7ac539bc11ea` |
| Classification | **DELIVERED** |

This confirms `config.ADMIN_NOTIFICATION_EMAIL` resolved to a truthy value at Lambda
startup — the `if (_adminEmail)` guard passed — and `sendAdminInquiryAlertEmail` was
pushed to the dispatch block and executed successfully.

---

## §12 Postmark Quota / Activity Result

### Post-inquiry snapshot

| Field | Baseline | After | Delta |
|---|---|---|---|
| Account quota | 12 of 100 | **14 of 100** | **+2** |
| Total events | 62 | **67** | **+5** |

### New events (chronological, newest first)

| Time | Event | Recipient | Subject |
|---|---|---|---|
| 8:46:03 AM | Opened | `s***@gmail.com` | "We received your TexQtic inquiry" |
| 8:46:02 AM | **Delivered** | **`p***@texqtic.com`** | **"New public inquiry submitted — TexQtic"** |
| 8:46:02 AM | Delivered | `s***@gmail.com` | "We received your TexQtic inquiry" |
| 8:46:01 AM | Processed | `p***@texqtic.com` | "New public inquiry submitted — TexQtic" |
| 8:46:01 AM | Processed | `s***@gmail.com` | "We received your TexQtic inquiry" |

### Evidence interpretation

A +2 quota increment for a general inquiry confirms exactly 2 emails were dispatched
to the SMTP layer: the buyer acknowledgement and the admin alert. The +5 event count
reflects the full lifecycle for both messages (Processed + Delivered for each, plus
one Opened for the buyer ack within the observation window).

No bounces, errors, or suppressed addresses observed.

---

## §13 Runtime Classification

```
INQUIRY_NOTIFICATION_ADMIN_ENV_VERIFIED_FULL
```

### Full success criteria met

| Criterion | Met |
|---|---|
| Route returns 202 | YES |
| Buyer acknowledgement Processed | YES |
| Buyer acknowledgement Delivered | YES |
| Admin alert Processed | YES |
| Admin alert Delivered | YES |
| Postmark quota +2 | YES |
| No bounces or errors | YES |
| Admin email subject correct | YES — "New public inquiry submitted — TexQtic" |
| Admin recipient correct | YES — `p***@texqtic.com` |

### INQ-ADMIN-01 status

**CLOSED** — Root cause `ADMIN_ALERT_SKIPPED_CONFIG_NULL` is resolved.
`ADMIN_NOTIFICATION_EMAIL` is now correctly set in Vercel Production. The Lambda
cold-start resolves it to a truthy string value. The `if (_adminEmail)` guard passes.
The admin alert is dispatched, processed, and delivered.

### Source validation

The fix at `6dfbb48` is confirmed correct for both email paths:
- Buyer acknowledgement: working since `e6046c8` RV
- Admin alert: confirmed working in this unit after env var was set

No source code change was required or made.

---

## §14 Remaining Blockers

| ID | Description | Severity | Status |
|---|---|---|---|
| ~~INQ-ADMIN-01~~ | ~~Admin alert email not dispatched~~ | ~~HIGH~~ | **CLOSED by this unit** |
| PRIT-034 | Legal pages (Privacy Policy, Terms of Service) missing | MEDIUM | Open |
| INQ-COPY-02 | Buyer acknowledgement email copy truthfulness review | MEDIUM | Open — F1-P5 |
| INQ-COPY-24 | Admin alert email copy review | MEDIUM | Open — F1-P5 (unblocked by INQ-ADMIN-01 closure) |
| Supplier-path RV | Supplier-path notification not runtime-verified | LOW | Future sprint |
| Config observability | No startup warning when `ADMIN_NOTIFICATION_EMAIL` absent | LOW | Optional future packet |
| Postmark webhook | No delivery failure alerting; manual dashboard review only | LOW | Future ops |

---

## §15 Recommended Next Packet

Admin env verification succeeded. Both emails are delivered.

**Proceed to:** `SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX`

This packet should review and correct:

1. **INQ-COPY-02** — Buyer acknowledgement email copy truthfulness
   Subject: "We received your TexQtic inquiry"
   Body should accurately describe what will happen next (response time, platform nature).
   Must not imply money movement or guaranteed placement.

2. **INQ-COPY-24** — Admin alert email copy review
   Subject: "New public inquiry submitted — TexQtic"
   Now unblocked. Body should give Paresh accurate inquiry context for routing/response.
   Currently includes `inquiry_category`, `source_surface`, `geo_band`, `volume_band`.
   Review whether content is actionable and copy is production-appropriate.

3. **PRIT-034** — Legal pages
   Privacy Policy and Terms of Service URLs are linked in email footers.
   Pages must be live before public launch. Verify or escalate.

---

## §16 No-Secrets / No-Source-Change Statement

- No SMTP credentials, API tokens, Postmark tokens, Vercel tokens, passwords, JWTs,
  DB URLs, or `.env` contents appear anywhere in this document.
- Admin email appears only as `p***@texqtic.com`.
- Buyer test email appears only as `s***@gmail.com`.
- `ADMIN_NOTIFICATION_EMAIL` appears only as `SET_MASKED` for the env var value.
- Postmark message IDs are non-sensitive routing identifiers; no email body content recorded.
- No source code, test files, schema, migration, environment variable, Vercel setting,
  or Postmark setting was modified by this verification unit.
- Exactly one production inquiry was submitted, as authorized by the unit prompt.
- Only the following file was created:
  `governance/units/SOFT-LAUNCH-F1-P1B-RV-ADMIN-EMAIL-ENV-VERIFY.md`
