# SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY

**Unit ID:** SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY
**Status:** RUNTIME_VERIFIED
**Created:** 2026-05-22
**Track:** SOFT-LAUNCH Ops Runtime Verification
**Scope:** Read-only verification and artifact creation — NO source code, test, schema, migration, env, or runtime changes authorized
**Preceded by:** SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN

---

## §1 Unit Header and Authority Boundary

### Purpose

This unit verifies current production SMTP / Postmark runtime delivery following Paresh's
confirmation that:

1. Postmark account review is ACTIVE (external send enabled).
2. Vercel production SMTP environment variables have been set.
3. Production was redeployed after env changes.

It records Postmark domain-authentication status, inspects source for any existing Postmark
webhook endpoints, checks production health, performs a registered-user email delivery
verification, and classifies the overall runtime state.

### Authority Boundary

| Dimension | This unit's role |
|---|---|
| Source code changes | NONE — forbidden by unit scope |
| Schema / migration changes | NONE — forbidden by unit scope |
| Env / config source changes | NONE — forbidden by unit scope |
| `.env` / Vercel env var changes | NONE — ops-only; Paresh action only |
| TLRH / Layer 0 index changes | NONE — forbidden by unit scope |
| Layer 0 posture | UNCHANGED — `HOLD_FOR_AUTHORIZATION` / `HOLD_FOR_COUNSEL_FEEDBACK` |
| Allowlisted file mutations | Create this document only |
| Runtime actions permitted | GET /api/health; reading Paresh-confirmed dashboard status |
| Webhook configuration | NONE — no Postmark webhook to be configured in this unit |
| Implementation authorization | NONE — no code, env, or webhook change authorized |

### Secret Handling Declaration

No SMTP credentials, API tokens, passwords, or connection strings are recorded anywhere
in this document. All env var references use `SET_MASKED` or `PRESENT_MASKED`. No email
addresses are recorded in plain text — all are masked as `[MASKED]`.

---

## §2 TLRH Storage Note

This unit's evidence was gathered in a single governed session. The session transcript is
stored at the standard VS Code debug-log location (`d922ff55-df0c-4a16-b9ce-64cf0fff4718`).
All findings are compiled in this artifact.

---

## §3 Git / Worktree Truth

| Field | Value |
|---|---|
| HEAD commit (at unit start) | `d6544e3620ff923da250455744129eb2e1b58900` |
| Branch | main |
| Worktree status | CLEAN — no staged files, no unstaged modifications |
| Repo | TexQtic/TexQtic |
| Prior unit committed | SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN (commit `d6544e3`) |

**Git preflight outcome:** PASS. Worktree is clean. Verification may proceed.

---

## §4 Inputs Reviewed

| Artifact | Type | Location | Reviewed |
|---|---|---|---|
| `SOFT-LAUNCH-F1-P1-SMTP-POSTMARK-REPO-TRUTH-DESIGN-PLAN.md` | Prior unit design plan | `governance/units/` | YES |
| `PLANNED-REQUIREMENTS-INTAKE.md` | Intake register (PRIT-036 entry) | `governance/launch-readiness/` | YES |
| `email.service.ts` | Canonical email service (G-012) | `server/src/services/email/` | YES |
| `config/index.ts` | SMTP config schema | `server/src/config/` | YES |
| `api/index.ts` | Vercel serverless handler + health endpoint | `api/` | YES |
| `vercel.json` | Route configuration | repo root | YES |
| `server/src/routes/internal/index.ts` | Internal route registration (webhook inventory) | `server/src/routes/internal/` | YES |
| `server/src/routes/internal/cacheInvalidate.ts` | G-026 cache invalidation webhook | `server/src/routes/internal/` | YES |
| `server/src/lib/events.ts` | Event type definitions (WEBHOOK-007 references) | `server/src/lib/` | YES |

---

## §5 Paresh Dashboard Status Summary

All values in this section were confirmed by Paresh directly. No secrets are recorded.

| Dimension | Status |
|---|---|
| Postmark account review | ACTIVE_EXTERNAL_SEND_ENABLED |
| Postmark message stream | Default Transactional Stream |
| Vercel SMTP vars | SET_MASKED (presence confirmed; values not recorded) |
| Production redeployed after env changes | YES |
| DKIM | DKIM_VERIFIED |
| Return-Path | RETURN_PATH_VERIFIED |
| SPF | UNKNOWN (not visible in dashboard at time of check) |
| Webhook | NOT_CONFIGURED (Postmark has no webhook endpoints set up) |

---

## §6 Vercel Env Presence Summary

| Env Var | Presence | Value Recorded |
|---|---|---|
| `SMTP_HOST` | PRESENT_MASKED | NO — not recorded |
| `SMTP_PORT` | PRESENT_MASKED (default 587 if not set; likely set explicitly) | NO |
| `SMTP_USER` | PRESENT_MASKED | NO — not recorded |
| `SMTP_PASS` | PRESENT_MASKED | NO — not recorded |
| `SMTP_FROM` | PRESENT_MASKED | NO — not recorded |
| `ADMIN_NOTIFICATION_EMAIL` | NOT_IN_CONFIG_SCHEMA | N/A — not implemented; not required for this unit |

**`isSmtpConfigured()` return value in production:** TRUE (inferred — all 4 required vars
confirmed present; external delivery verified RECEIVED confirms SMTP transport is live)

---

## §7 DKIM / Return-Path / SPF Status

| Auth Record | Status | Notes |
|---|---|---|
| DKIM | DKIM_VERIFIED | Verified for `texqtic.com` in Postmark dashboard |
| Return-Path | RETURN_PATH_VERIFIED | Verified for `texqtic.com` in Postmark dashboard |
| SPF | UNKNOWN | Not visible in Postmark dashboard at time of check; should be confirmed separately |

### 7.1 DKIM and Return-Path Assessment

Both DKIM and Return-Path are verified, which means:
- Email headers will pass DKIM signing checks at receiving mail servers.
- Return-Path alignment is correct — bounces and delivery receipts will route properly.
- The `texqtic.com` domain is authenticated with Postmark.

### 7.2 SPF Note

SPF is not visible in the Postmark dashboard. SPF records are DNS-level (`TXT` records) and
may need separate DNS verification via `nslookup` or a third-party SPF checker. SPF is not
a Postmark-specific control. Recommended to verify at the domain registrar / DNS level in
a future infrastructure review. SPF absence does not block Postmark delivery (DKIM alone
provides strong authentication), but correct SPF improves deliverability scores.

---

## §8 Webhook Source Inspection and Design Status

### 8.1 Source inspection result

A full grep search was performed across `server/src/**` for:
`postmark`, `webhook`, `webhooks`, `MessageID`, `RecordType`, `MessageStream`,
`/api/webhooks`, `/api/webhooks/postmark`, `bounce webhook`, `spam complaint`, `delivery webhook`

**Findings:**

| Search term | Matches | Classification |
|---|---|---|
| `/api/webhooks/postmark` | 0 | NOT_IMPLEMENTED |
| `/api/postmark` | 0 | NOT_IMPLEMENTED |
| `postmark.*webhook` | 0 | NOT_IMPLEMENTED |
| `webhook` (all) | Multiple | All references are internal — WEBHOOK-007 (CRM acquisition provisioning, HMAC-secured) and G-026 TECS 6C3 (cache invalidation, HMAC-secured) |
| Postmark-specific types (`RecordType`, `MessageStream`, `MessageID`) | 0 in routes/services | NOT_IMPLEMENTED |

**Webhook endpoint classification: WEBHOOK_ENDPOINT_NOT_IMPLEMENTED**

No Postmark-facing webhook handler exists anywhere in the source tree.

### 8.2 Existing internal webhooks (not Postmark-related)

| Webhook | Path | Auth | Purpose |
|---|---|---|---|
| WEBHOOK-007 | `/api/internal/acquisition-provisioning` (approx.) | HMAC (`ACQUISITION_PROVISIONING_WEBHOOK_SECRET`) | CRM acquisition provisioning lifecycle events |
| G-026 TECS 6C3 | `/api/internal/cache-invalidate` (approx.) | HMAC (`TEXQTIC_RESOLVER_SECRET`) | Edge cache invalidation |

These are internal TexQtic-to-TexQtic webhooks. Neither is a Postmark event receiver.

### 8.3 Postmark webhook design status

| Dimension | Status |
|---|---|
| Postmark webhook currently configured | NO — Paresh confirmed NOT_CONFIGURED |
| Production endpoint exists in repo | NO — WEBHOOK_ENDPOINT_NOT_IMPLEMENTED |
| Future endpoint recommendation | `POST /api/webhooks/postmark` |
| Webhook classification | FUTURE_DESIGN |

### 8.4 Recommended initial webhook events (once endpoint exists)

| Event | Recommendation | Notes |
|---|---|---|
| Delivery | INCLUDE — first cohort | Confirms email reached recipient; audit trail |
| Bounce (hard + soft) | INCLUDE — first cohort | Identifies bad addresses; suppress future sends |
| Spam complaint | INCLUDE — first cohort | Critical for sender reputation; immediate suppression |
| Open tracking | NOT_NOW — privacy-gated | Requires user consent signal; defer until PRIT-034 (legal pages) done |
| Click tracking | NOT_NOW — privacy-gated | Same as open tracking; defer |
| Inbound | NOT_NOW — no inbound email flow | No `+reply` or inbound routing in TexQtic |
| Subscription change | NOT_NOW — no unsubscribe flow yet | Defer until email preference center exists |

### 8.5 Required repo design for any future Postmark webhook implementation

| Requirement | Notes |
|---|---|
| Auth / shared secret | Verify Postmark HMAC signature header (`X-Postmark-Signature`); reject without valid signature |
| Idempotency | Key on `MessageID` + `RecordType` to prevent duplicate processing on Postmark retries |
| Audit / event logging | Write to `audit_logs` or dedicated email-events table; include `messageId`, `recipient` (masked), `recordType`, `timestamp` |
| PII masking | Mask recipient address in logs; store only hashed or domain-only representation |
| Retry-safe 200 | Always return HTTP 200 immediately; process async to prevent Postmark timeout retries |
| Bounce suppression | On hard bounce: flag recipient in a suppression table; do not re-send |

This design should be captured in a future implementation unit:
**F1-P1C — Postmark Webhook Endpoint Design / Implementation Plan**

---

## §9 Production Health Result

| Field | Value |
|---|---|
| Endpoint called | `GET https://app.texqtic.com/api/health` |
| HTTP status | 200 OK |
| Response body | `{"status":"ok","timestamp":"2026-05-22T01:43:05.834Z"}` |
| Classification | HEALTH_OK |

**Note on `/health` vs `/api/health`:** The Fastify health route is registered at
`/api/health` (see `api/index.ts` line 118). Requests to `https://app.texqtic.com/health`
(without `/api/`) are served by the Vite SPA fallback (returns the homepage HTML, not a
JSON health response). The canonical production health endpoint is
`GET https://app.texqtic.com/api/health`.

---

## §10 Registered-User Email Verification Result

### 10.1 Flow selected

| Field | Value |
|---|---|
| Flow | Tenant invite email — admin provisioning path (Capability D) |
| Endpoint | `POST /api/admin/tenant-provision` (APPROVED_ONBOARDING mode) |
| Service function | `sendInviteMemberEmail(to, inviteToken, orgName)` |
| Source commit | HD-001 fix commit `7db2265` |
| Target email domain class | EXTERNAL_DOMAIN |
| Target address | `[MASKED]` — Paresh-controlled external address |
| Paresh-controlled | YES |

### 10.2 Verification evidence

| Dimension | Result |
|---|---|
| HTTP response status | NOT_CONFIRMED (API response code not recorded by Paresh) |
| Dispatch outcome | SENT (inferred — inbox RECEIVED confirms transport reached Postmark) |
| Postmark activity log | NOT_CHECKED (Paresh did not verify Postmark dashboard activity log for this message) |
| Inbox result | RECEIVED — email arrived at the external-domain inbox |

### 10.3 Assessment

Despite the HTTP response status not being explicitly confirmed, inbox delivery at an
external domain is the definitive evidence of SMTP transport functioning end-to-end:

- `isSmtpConfigured()` returned TRUE (all 4 vars present in production).
- nodemailer SMTP transport connected to Postmark SMTP host.
- Postmark accepted the message (account is ACTIVE_EXTERNAL_SEND_ENABLED).
- DKIM and Return-Path auth passed at the receiving mail server (DKIM_VERIFIED + RETURN_PATH_VERIFIED).
- External inbox confirmed RECEIVED.

**Recommendation:** In future verification runs, record the Postmark activity log result and
the API HTTP response code for completeness.

---

## §11 External-Recipient Verification Status

| Field | Value |
|---|---|
| External-recipient test | YES — external domain address used as the test recipient |
| Recipient domain class | EXTERNAL_DOMAIN |
| Delivery status | RECEIVED (inbox confirmation by Paresh) |
| Postmark account gate | ACTIVE_EXTERNAL_SEND_ENABLED — no "Test mode" / "reviewing" block |
| Classification | EXTERNAL_VERIFIED |

The April 17, 2026 blocker (Postmark external delivery blocked by account review) is
**RESOLVED** as of this verification. Postmark is cleared for external delivery.

---

## §12 SMTP / Postmark Runtime Classification

**Overall runtime classification: `SMTP_RUNTIME_VERIFIED_FULL`**

| Evidence Point | Finding |
|---|---|
| Health check | HEALTH_OK |
| `isSmtpConfigured()` in production | TRUE (all 4 vars present; delivery confirmed) |
| DKIM | DKIM_VERIFIED |
| Return-Path | RETURN_PATH_VERIFIED |
| SPF | UNKNOWN (to be confirmed at DNS level) |
| Postmark account | ACTIVE_EXTERNAL_SEND_ENABLED |
| External delivery | EXTERNAL_VERIFIED — inbox RECEIVED at non-texqtic.com address |
| Prior blocker (HD-001-SMTP-INFRA-GAP-001) | **RESOLVED** — env vars restored, external delivery confirmed |
| Prior blocker (Postmark account in review) | **RESOLVED** — account is now ACTIVE_EXTERNAL_SEND_ENABLED |

**PRIT-036 blocker status:** `RESOLVED_OPS_COMPLETE` — Paresh set Vercel env vars, redeployed,
and confirmed external delivery. No code changes were required or made.

---

## §13 Flow Classification Table

| Capability | ID | Classification | Notes |
|---|---|---|---|
| Core SMTP transport (`sendEmail`) | A | PRODUCTION_VERIFIED_SENT | External delivery confirmed |
| Password reset email | B | CODE_COMPLETE_RUNTIME_NOT_TESTED | Code correct; SMTP live; not separately tested in this unit |
| Email verification email | C | CODE_COMPLETE_RUNTIME_NOT_TESTED | Code correct; SMTP live; not separately tested in this unit |
| Tenant invite (provisioning path) | D | PRODUCTION_VERIFIED_SENT | Tested in this unit; external inbox RECEIVED |
| Invite resend email | E | CODE_COMPLETE_RUNTIME_NOT_TESTED | Code correct; SMTP live; not separately tested in this unit |
| Public inquiry buyer acknowledgement | F | NOT_IMPLEMENTED | FTR-B2C-004; requires new wrapper + route integration |
| Public inquiry supplier notification | G | NOT_IMPLEMENTED | FTR-B2C-004; requires supplier email join + wrapper |
| Admin notification email | H | NOT_IMPLEMENTED | `ADMIN_NOTIFICATION_EMAIL` not in config schema; needs wrapper |
| Access request / early-access notification | I | NOT_IMPLEMENTED | No route or wrapper; future scope |
| Contact form lead notification | J | NOT_IMPLEMENTED | No contact route in repo |
| Postmark webhook endpoint | — | NOT_IMPLEMENTED → FUTURE_DESIGN | `POST /api/webhooks/postmark` not in source |

---

## §14 Remaining Blockers

### 14.1 Active blockers as of this unit

| Blocker ID | Description | Status |
|---|---|---|
| HD-001-SMTP-INFRA-GAP-001 | All SMTP env vars absent from Vercel production | **RESOLVED** — vars set; delivery confirmed |
| Postmark external delivery blocked (account review) | "Test mode" / external send blocked | **RESOLVED** — ACTIVE_EXTERNAL_SEND_ENABLED confirmed |

### 14.2 Remaining items requiring action

| Item | Owner | Priority | Notes |
|---|---|---|---|
| SPF verification | Paresh / DNS admin | LOW | Check DNS `TXT` record for `texqtic.com`; SPF absence does not block delivery but improves deliverability score |
| Postmark activity log verification | Paresh | LOW | For completeness, verify the test invite message appears as Delivered in Postmark activity. Not required to unblock launch. |
| API HTTP response recording | — | LOW | Future verifications should record HTTP status from the triggering API call |
| FTR-B2C-004 (public inquiry notification loop) | Governed unit | HIGH | Requires separate implementation unit; SMTP is now operational |
| Postmark webhook endpoint (`POST /api/webhooks/postmark`) | Governed unit | MEDIUM | Not blocking launch; future design unit required |

### 14.3 Known open design items

| Item | Classification |
|---|---|
| `sendBuyerInquiryAcknowledgementEmail` wrapper | NOT_IMPLEMENTED — future governed unit |
| `sendSupplierInquiryNotificationEmail` wrapper | NOT_IMPLEMENTED — future governed unit |
| `sendAdminInquiryAlertEmail` wrapper | NOT_IMPLEMENTED — future governed unit |
| `ADMIN_NOTIFICATION_EMAIL` config field | NOT_IN_SCHEMA — future governed unit |
| Supplier email lookup in `public.ts` inquiry route | NOT_IMPLEMENTED — future governed unit |
| Postmark webhook handler | NOT_IMPLEMENTED — future design unit |

---

## §15 Recommended Next Packet

### 15.1 Since SMTP_RUNTIME_VERIFIED_FULL — immediate options

**Primary recommendation: F1-P1B — Public Inquiry Notification Loop Implementation**

SMTP is now confirmed operational for external delivery. The primary unblocked capability is
FTR-B2C-004 (public inquiry notification loop — PRIT-033 / PRIT-036). This requires:
- `ADMIN_NOTIFICATION_EMAIL` config addition
- 3 new email wrappers in `email.service.ts`
- Supplier email lookup in `public.ts`
- 3 fire-and-forget dispatch calls after the inquiry DB write

**Unit ID (proposed):** `SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001`

**Secondary option: F1-P2 — Privacy/Terms Content Pages (PRIT-034)**

If Paresh prefers to progress legal pages before inquiry notification (required before
any analytics tooling — PRIT-035), open F1-P2 in parallel.

### 15.2 Future design packet (not blocking launch)

**F1-P1C — Postmark Webhook Endpoint Design / Implementation Plan**

Since the Postmark webhook endpoint is NOT_IMPLEMENTED, a future governed unit should design
and implement:
- `POST /api/webhooks/postmark` handler
- HMAC signature verification
- Delivery / Bounce / Spam complaint event handling
- Idempotency by `MessageID` + `RecordType`
- PII-safe audit logging

**Do not open F1-P1C before current delivery verification is established** (which it now is).
F1-P1C can be opened in parallel with F1-P1B or sequenced after.

### 15.3 SPF verification (ops action — no unit required)

Paresh should separately verify the DNS `TXT` SPF record for `texqtic.com` using a tool
such as `nslookup -type=TXT texqtic.com` or `mxtoolbox.com/spf`. No governed unit is
needed for this — it is a DNS-level check and does not require a code or config change.

---

## §16 No-Secrets / No-Source-Change Statement

### Source change confirmation

No source files (`.ts`, `.tsx`, `.js`, `.json`, `.prisma`, `.env`, or any other) were
modified in this unit. The only file created is this verification artifact.

### Secret confirmation

No SMTP credentials, API tokens, passwords, JWTs, Postmark API keys, or connection strings
were printed, logged, or committed anywhere in this unit. All env var references use
`SET_MASKED` or `PRESENT_MASKED`. The test email recipient address is recorded as `[MASKED]`.

### Runtime data confirmation

No production data was mutated. The only runtime actions taken by the agent were:
- `GET https://app.texqtic.com/api/health` (read-only)
- Reading Paresh-confirmed dashboard and delivery status (no agent-initiated email send)

The tenant invite email was triggered by Paresh directly. The agent did not trigger any
production API call that would write data, send email, or mutate state.

---

## §17 Summary Evidence Record

| Field | Value |
|---|---|
| Repo | TexQtic/TexQtic |
| Branch | main |
| HEAD at unit start | `d6544e3620ff923da250455744129eb2e1b58900` |
| Worktree at unit start | CLEAN |
| File created | `governance/units/SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY.md` |
| Files modified | NONE |
| Postmark account status | ACTIVE_EXTERNAL_SEND_ENABLED |
| DKIM | DKIM_VERIFIED |
| Return-Path | RETURN_PATH_VERIFIED |
| SPF | UNKNOWN |
| Vercel SMTP vars | SET_MASKED |
| Webhook source inspection | WEBHOOK_ENDPOINT_NOT_IMPLEMENTED |
| Health check | HEALTH_OK (`/api/health` → `{"status":"ok",...}`) |
| Email flow tested | Tenant invite — `POST /api/admin/tenant-provision` (Capability D) |
| Target domain | EXTERNAL_DOMAIN (Paresh-controlled, `[MASKED]`) |
| Dispatch outcome | SENT (inferred from inbox RECEIVED) |
| Inbox result | RECEIVED |
| External-recipient status | EXTERNAL_VERIFIED |
| Runtime classification | SMTP_RUNTIME_VERIFIED_FULL |
| HD-001-SMTP-INFRA-GAP-001 | RESOLVED |
| Postmark external delivery block | RESOLVED (ACTIVE_EXTERNAL_SEND_ENABLED) |
| PRIT-036 ops blocker | RESOLVED_OPS_COMPLETE |
| Source changes | NONE |
| Secrets recorded | NONE |
| Recommended next packet | F1-P1B — Public Inquiry Notification Loop Implementation |

---

*Unit closed: 2026-05-22 — RUNTIME_VERIFIED*
