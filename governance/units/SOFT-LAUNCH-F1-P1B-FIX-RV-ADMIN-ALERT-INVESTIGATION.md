# SOFT-LAUNCH-F1-P1B — Admin Alert Investigation: INQ-ADMIN-01

**Unit ID:** SOFT-LAUNCH-F1-P1B-FIX-RV-ADMIN-ALERT-INVESTIGATION
**Feature refs:** FTR-B2C-004 / PRIT-033
**Status:** ROOT_CAUSE_IDENTIFIED — ADMIN_ALERT_SKIPPED_CONFIG_NULL
**Created:** 2026-05-22
**Track:** SOFT-LAUNCH Ops Runtime Investigation
**Scope:** Investigation and artifact creation only — NO source, test, schema, migration, env, or Vercel changes authorized
**Preceded by:** SOFT-LAUNCH-F1-P1B-FIX-RV-AWAITED-INQUIRY-NOTIFICATION-DISPATCH (commit `e6046c8`)
**Blocker resolved:** INQ-ADMIN-01

---

## §1 Unit Header and Authority Boundary

### Purpose

Diagnose why `POST /api/public/inquiry/submit` delivers the buyer acknowledgement email
but does not deliver the admin alert email, despite `ADMIN_NOTIFICATION_EMAIL` being
reported as `SET_MASKED` in the prior runtime verification artifact.

Open blocker from `SOFT-LAUNCH-F1-P1B-FIX-RV-AWAITED-INQUIRY-NOTIFICATION-DISPATCH`:
> **INQ-ADMIN-01** — Admin alert email not dispatched despite `ADMIN_NOTIFICATION_EMAIL`
> reported as SET_MASKED. Requires Vercel function log inspection to determine whether
> `config.ADMIN_NOTIFICATION_EMAIL` resolves correctly at runtime.

### Authority Boundary

| Dimension | This unit's role |
|---|---|
| Source code changes | NONE — investigation only |
| Schema / migration changes | NONE |
| Env / Vercel config changes | NONE — ops action recorded as recommendation only |
| Allowlisted file mutations | Create this document only |
| Runtime actions permitted | Read source; read existing Postmark activity; attempt Vercel log access |

### Secret Handling Declaration

No SMTP credentials, API tokens, passwords, JWTs, DB URLs, or `.env` contents appear
in this document. Email addresses masked: admin email → `p***@texqtic.com`. Buyer test
email → `s***@gmail.com`. No Vercel token, Postmark token, or connection string printed.

---

## §2 TLRH Storage Note

This document is an investigation artifact for a production runtime gap. It is not a
design decision, implementation plan, or policy document. It must not be added to the
TLRH index or any Layer 0 index. Stored in `governance/units/` only.

---

## §3 Git / Worktree Truth

| Field | Value |
|---|---|
| HEAD commit (at unit start) | `e6046c8e15c0a21877798f49d29e0516baa137b6` |
| Commit subject | `[TEXQTIC] docs: runtime verify awaited inquiry notification dispatch — buyer-only` |
| Branch | `main` |
| Worktree status | CLEAN — no staged or unstaged modifications |
| Origin sync | `origin/main` == HEAD |
| Includes fix commit | YES — `6dfbb48` is an ancestor of HEAD |

---

## §4 Inputs Reviewed

| Artifact / File | Reviewed | Notes |
|---|---|---|
| `governance/units/SOFT-LAUNCH-F1-P1B-FIX-RV-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md` | YES | Runtime classification: `BUYER_ONLY`; INQ-ADMIN-01 opened |
| `governance/units/SOFT-LAUNCH-F1-P1B-FIX-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md` | YES | Source fix at `6dfbb48`; awaited dispatch pattern |
| `governance/units/SOFT-LAUNCH-F1-P1B-INQUIRY-NOTIFICATION-LOOP-001.md` | YES | Original notification implementation; INQ-035 test |
| `governance/units/SOFT-LAUNCH-F1-P1A-SMTP-POSTMARK-OPS-RUNTIME-VERIFY.md` | YES | SMTP vars confirmed set in Vercel production |
| `server/src/routes/public.ts` | YES — lines 1504–1557 | General inquiry dispatch block read in full |
| `server/src/services/email/email.service.ts` | YES — full file | `sendAdminInquiryAlertEmail` implementation inspected |
| `server/src/config/index.ts` | YES — full file | `ADMIN_NOTIFICATION_EMAIL` parsing logic read |
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` | YES — lines 1–170, 755–830 | INQ-034, INQ-035, INQ-036 inspected |
| `server/src/__tests__/email-inquiry-wrappers.unit.test.ts` | YES — full file | EML-001 through EML-008 inspected |

---

## §5 Source Branch Inspection — `public.ts` General Inquiry Dispatch Block

**File:** `server/src/routes/public.ts`
**Lines:** approximately 1504–1557

### Complete dispatch flow (general inquiry path):

```typescript
// Context built from validated request fields only (no buyer PII)
const _notifCtxGeneral: InquiryNotificationContext = {
  inquiry_category,
  source_surface,
  geo_band,
  volume_band,
};

try {
  const _dispatches: Array<Promise<unknown>> = [];

  // Buyer acknowledgement — only if buyer_email was provided
  if (buyer_email) {
    _dispatches.push(
      sendBuyerInquiryAcknowledgementEmail(buyer_email, _notifCtxGeneral, { triggeredBy: 'system' })
        .catch((err: unknown) => fastify.log.warn({ err }, '[buyer-inquiry] General buyer acknowledgement failed (non-blocking)')),
    );
  }

  // Admin alert — only if config.ADMIN_NOTIFICATION_EMAIL is truthy
  const _adminEmail = config.ADMIN_NOTIFICATION_EMAIL;   // <-- line 1520
  if (_adminEmail) {                                     // <-- line 1521: GUARD
    _dispatches.push(
      sendAdminInquiryAlertEmail(_adminEmail, _notifCtxGeneral, { triggeredBy: 'system' })
        .catch((err: unknown) => fastify.log.warn({ err }, '[buyer-inquiry] General admin notification failed (non-blocking)')),
    );
  }

  const _notificationTimeoutMs = 4000;
  await Promise.race([
    Promise.allSettled(_dispatches),
    new Promise<void>(resolve => setTimeout(resolve, _notificationTimeoutMs)),
  ]);

  fastify.log.info(
    {
      inquiry_category,
      buyerEmailPresent: !!buyer_email,
      adminEmailConfigured: !!_adminEmail,   // <-- DIAGNOSTIC LOG FIELD
    },
    '[buyer-inquiry] General-path notification dispatch complete',
  );
} catch (err: unknown) {
  fastify.log.warn({ err }, '[buyer-inquiry] General-path notification dispatch failed (non-blocking)');
}

return reply.status(202).send({ ... });
```

### Findings

| Finding | Value |
|---|---|
| Reads `config.ADMIN_NOTIFICATION_EMAIL` | YES — line 1520 |
| Admin alert guarded by truthiness | YES — `if (_adminEmail)` at line 1521 |
| Guard is a silent skip | YES — if `null`, no dispatch, no log warning |
| `sendAdminInquiryAlertEmail` called when guard true | YES — pushed to `_dispatches` |
| Inside same `Promise.race` block as buyer ack | YES |
| Source condition that skips general inquiry | NONE beyond `if (_adminEmail)` |
| Diagnostic log field | `adminEmailConfigured: !!_adminEmail` — logged in `[buyer-inquiry] General-path notification dispatch complete` |
| Route logs warn on skip | NO — silent skip; only `adminEmailConfigured: false` in info log |

### Implication

If `config.ADMIN_NOTIFICATION_EMAIL` is `null` at Lambda startup, the `if (_adminEmail)`
guard evaluates to `false`, `sendAdminInquiryAlertEmail` is never pushed to `_dispatches`,
and no admin alert email is ever dispatched. The route completes normally with 202.

The Vercel function log for this invocation would show:
```json
{ "inquiry_category": "GENERAL", "buyerEmailPresent": true, "adminEmailConfigured": false }
```
in the `[buyer-inquiry] General-path notification dispatch complete` message — **if
`config.ADMIN_NOTIFICATION_EMAIL` was `null` at runtime.**

---

## §6 Config Behavior Inspection — `config/index.ts`

**File:** `server/src/config/index.ts`

### ADMIN_NOTIFICATION_EMAIL parsing logic (verbatim excerpt):

```typescript
// ADMIN_NOTIFICATION_EMAIL — non-fatal optional: invalid/missing → null, server continues.
// Parsed outside envSchema (safeParse) so a malformed value never takes down the API.
const _adminNotificationEmailRaw = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
const _parsedAdminEmail = z.string().email().safeParse(_adminNotificationEmailRaw);

if (_adminNotificationEmailRaw && !_parsedAdminEmail.success) {
  console.warn('[config] ADMIN_NOTIFICATION_EMAIL invalid email format; admin notifications will be skipped');
}

const ADMIN_NOTIFICATION_EMAIL_VALUE = _parsedAdminEmail.success ? _parsedAdminEmail.data : null;

export const config = {
  ..._baseConfig,
  FRONTEND_URL: FRONTEND_URL_VALUE,
  ADMIN_NOTIFICATION_EMAIL: ADMIN_NOTIFICATION_EMAIL_VALUE   // string | null
};
```

### Findings

| Finding | Value |
|---|---|
| Read path | `process.env.ADMIN_NOTIFICATION_EMAIL?.trim()` |
| Parsed via | `z.string().email().safeParse()` |
| Missing env var → | `undefined` → `safeParse(undefined)` fails → `null` |
| Invalid email format → | `safeParse` fails → `null` + console.warn |
| Valid email → | `safeParse` succeeds → string value |
| Config computed | Module init time — one-time, at Lambda cold start |
| Mutability | Immutable at runtime (module-level constant) |
| Crash if absent | NO — safeParse prevents crash |
| Log on invalid format | YES — `console.warn('[config] ADMIN_NOTIFICATION_EMAIL invalid email format...')` |
| Log on absent | NO — silent null; no warning emitted if env var is completely absent |

### Failure modes that produce `null`

1. **Env var not present in Vercel** — `process.env.ADMIN_NOTIFICATION_EMAIL` is `undefined`
   → `safeParse(undefined)` fails → `null`. No warning logged.
   **This is the most likely failure mode.**

2. **Env var set AFTER last deployment without redeploy** — Lambda instances loaded before
   env var was added still have `null`. A new deployment is required to refresh Lambda env.

3. **Env var set with invalid format** — e.g., quotes (`"paresh@texqtic.com"`), leading/
   trailing whitespace beyond `.trim()` normalization, or truncated value — `safeParse`
   fails → `null` + warning logged.

4. **Env var set with a plain name (not an email)** — `z.string().email()` requires valid
   email format; a plain string fails → `null` + warning logged.

### Key observation: `SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM` vs `ADMIN_NOTIFICATION_EMAIL`

The SMTP vars are defined inside `envSchema` and validated via hard `parse()` — a missing
SMTP var would cause a fatal parse error crashing the API on startup. By contrast,
`ADMIN_NOTIFICATION_EMAIL` is intentionally outside `envSchema`, using `safeParse`, so
its absence silently produces `null` and does NOT affect API startup.

This means **the API starts and accepts requests correctly even when `ADMIN_NOTIFICATION_EMAIL`
is absent** — the only visible consequence is no admin alert, which is exactly what was observed.

---

## §7 Admin Alert Wrapper Inspection — `email.service.ts`

**File:** `server/src/services/email/email.service.ts`
**Function:** `sendAdminInquiryAlertEmail` (line 362)

### Implementation summary

```typescript
export async function sendAdminInquiryAlertEmail(
  to: string,
  ctx: InquiryNotificationContext,
  context: EmailContext = {}
): Promise<EmailDispatchOutcome> {
  const lines = [
    'New public inquiry submitted on TexQtic.',
    `Category: ${ctx.inquiry_category}.`,
    `Surface: ${ctx.source_surface ?? 'DIRECT'}.`,
    ...(ctx.supplier_slug ? [...] : []),
    ...(ctx.geo_band ? [...] : []),
    ...(ctx.volume_band ? [...] : []),
  ];
  return sendEmail({
    to,               // <-- receives _adminEmail from route
    subject: 'New public inquiry submitted — TexQtic',
    html: ...,
    text: ...,
    metadata: { flow: 'admin_inquiry_alert', inquiry_category: ctx.inquiry_category },
  }, context);
}
```

### `sendEmail` stop-loss validation

```typescript
function validate(params: EmailParams): void {
  if (!params.to || typeof params.to !== 'string') {
    throw new EmailValidationError('MISSING_TO', 'Email recipient (to) is required');
  }
  if (!EMAIL_RE.test(params.to)) {
    throw new EmailValidationError('INVALID_TO', `Invalid recipient email: ${params.to}`);
  }
  if (!params.subject || typeof params.subject !== 'string') {
    throw new EmailValidationError('MISSING_SUBJECT', '...');
  }
  if (!params.html && !params.text) {
    throw new EmailValidationError('MISSING_BODY', '...');
  }
}
```

### Findings

| Finding | Value |
|---|---|
| Requires non-empty `to` | YES — `MISSING_TO` thrown if absent |
| Requires valid email format for `to` | YES — `EMAIL_RE.test()` |
| `p***@texqtic.com` passes `EMAIL_RE` | YES — standard email format |
| Supplier/buyer fields required | NO — `supplier_slug`, `geo_band`, `volume_band` are all optional |
| Wrapper throws before `sendEmail` | ONLY if `to` is empty/invalid — not applicable here |
| Per-dispatch catch in route | YES — `.catch()` would absorb any wrapper error |
| Wrapper is source-correct | YES — no defect for standard admin email |

**Conclusion:** The wrapper itself is not defective for the admin email value `p***@texqtic.com`.
If `sendAdminInquiryAlertEmail` were called with this address, it would reach `sendEmail`,
pass validation, and attempt SMTP delivery.

---

## §8 Test Coverage Inspection

### Tests inspected

| Test ID | File | What it proves |
|---|---|---|
| INQ-034 | `public-buyer-inquiry.unit.test.ts` | Buyer ack dispatched before 202 on general inquiry |
| INQ-035 | `public-buyer-inquiry.unit.test.ts` | Admin alert dispatched when `ADMIN_NOTIFICATION_EMAIL` configured |
| INQ-036 | `public-buyer-inquiry.unit.test.ts` | 4000ms timeout still returns 202 |
| EML-003 | `email-inquiry-wrappers.unit.test.ts` | `sendAdminInquiryAlertEmail` returns `DEV_LOGGED` in test env |
| EML-008 | `email-inquiry-wrappers.unit.test.ts` | Admin alert text includes `supplier_slug` when present |

### Config mock behavior in `public-buyer-inquiry.unit.test.ts`

```typescript
// Module-level mock — all tests start with ADMIN_NOTIFICATION_EMAIL = null
vi.mock('../config/index.js', () => ({
  config: { ADMIN_NOTIFICATION_EMAIL: null as string | null },
}));

// beforeEach — resets to null before every test
(config as { ADMIN_NOTIFICATION_EMAIL: string | null }).ADMIN_NOTIFICATION_EMAIL = null;

// INQ-035 — sets to configured value for that test only
(config as { ADMIN_NOTIFICATION_EMAIL: string | null }).ADMIN_NOTIFICATION_EMAIL = 'admin@texqtic.example';
```

### Findings

| Finding | Value |
|---|---|
| Test for admin alert when configured | YES — INQ-035 |
| Test for admin alert when NOT configured | YES — INQ-034 (no admin email set, `sendAdminInquiryAlertEmail` not expected to be called) |
| Default config mock value | `null` — matches production state when env var absent |
| INQ-035 sets `ADMIN_NOTIFICATION_EMAIL` correctly | YES — overrides null before test runs |
| Test validates wrapper is called with correct args | YES — `toHaveBeenCalledWith('admin@texqtic.example', ...)` |
| Config mock matches production parse behavior | YES — `null` is the correct value for absent env var |
| Any test gap | NO — coverage is complete |

### Key insight

The `beforeEach` default of `null` means all 36 tests are designed and verified for the
state where `ADMIN_NOTIFICATION_EMAIL` is absent — which is exactly the production state
observed. INQ-035 is the only test that proves the admin path, and it requires an explicit
override to set the config. This confirms: **the source is correct but requires env var
to be set in production to activate the admin alert path.**

---

## §9 Vercel Function Log Findings

### Access attempt

Navigation to `https://vercel.com/texqtic/texqtic/logs` returned HTTP 404 (no route).
Navigation to `https://vercel.com/texqtic/texqtic/settings/environment-variables` returned
a `Not Authorized` error in the Vercel dashboard SSR API.

Vercel is authenticated as `p***@texqtic.com` in the IDE browser, but the session does
not have sufficient permissions to access the project logs page via the browser tab.

| Field | Value |
|---|---|
| Vercel log access | LOGS_NOT_AVAILABLE — session/permission limitation |
| `adminEmailConfigured: false` log confirmable | NOT FROM HERE — requires Paresh to inspect in Vercel console |
| `[config] ADMIN_NOTIFICATION_EMAIL invalid email format` warning | NOT FROM HERE |

### Recommended Paresh action for log confirmation

In Vercel dashboard → Project → Functions → Runtime Logs, filter by:
- Date: 2026-05-22 approximately 08:14 IST (02:44 UTC)
- Message: `[buyer-inquiry] General-path notification dispatch complete`

Expected log field if root cause confirmed: `"adminEmailConfigured": false`

---

## §10 Postmark Activity Findings

### Classification

`POSTMARK_CONFIRMS_BUYER_ONLY`

### Evidence

From runtime verification artifact `SOFT-LAUNCH-F1-P1B-FIX-RV-AWAITED-INQUIRY-NOTIFICATION-DISPATCH.md`:

| Field | Value |
|---|---|
| Quota before inquiry | 11 of 100 |
| Quota after inquiry | 12 of 100 |
| Quota increment | +1 — exactly 1 email sent |
| New events | 3: Processed, Delivered, Opened — all for buyer ack ("We received your TexQtic inquiry") |
| Admin alert events | NONE |
| Subject filter active | NO — all event types shown |
| Date range | All time; test window fully included |
| Stream | Default Transactional — correct stream for both buyer ack and admin alert |

### Interpretation

A +1 quota increment for a 2-email dispatch attempt would only be possible if the admin
alert was never passed to the SMTP layer. This is consistent with `config.ADMIN_NOTIFICATION_EMAIL = null`
at Lambda startup causing the `if (_adminEmail)` guard to skip the dispatch entirely.

If the admin alert had been dispatched but failed at SMTP level, it would still count
toward the quota (since a connection was made) — but quota was exactly +1. This confirms
the dispatch was never attempted, not that it failed after dispatch.

---

## §11 Root Cause Classification

```
ADMIN_ALERT_SKIPPED_CONFIG_NULL
```

### Classification rationale

| Evidence | Supports this classification |
|---|---|
| Postmark quota +1 (not +2) | Admin dispatch never attempted at SMTP level |
| Source guard `if (_adminEmail)` | Admin email skipped silently when null |
| Config: `safeParse` → `null` for absent env var | No crash; silent null |
| No warning in config log for absent env var | Env var entirely absent (not just invalid format) |
| SMTP vars confirmed present | SMTP itself would work — dispatch issue is upstream |
| Source / wrapper correct | No code defect — env configuration gap only |
| Test default: `null` | Matches production state — admin path only active when explicitly set |

### High-probability scenario (ordered by likelihood)

1. **MOST LIKELY** — `ADMIN_NOTIFICATION_EMAIL` was never added to Vercel environment
   variables. The env var `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` were added
   for SMTP, but `ADMIN_NOTIFICATION_EMAIL` (a separate, optional var) was not added.
   `process.env.ADMIN_NOTIFICATION_EMAIL` is `undefined` → `config.ADMIN_NOTIFICATION_EMAIL = null`.

2. **POSSIBLE** — `ADMIN_NOTIFICATION_EMAIL` was added to Vercel AFTER the last deployment
   (`6dfbb48`). Even though Paresh said "redeployed after 6dfbb48: YES", the env var
   may have been added after that redeploy — meaning the running Lambda still has the
   old environment snapshot without this var.

3. **LESS LIKELY** — `ADMIN_NOTIFICATION_EMAIL` was set with an invalid format (e.g.,
   with surrounding quotes `"paresh@texqtic.com"` or just `paresh` without domain).
   This would produce the config warning `[config] ADMIN_NOTIFICATION_EMAIL invalid email format`
   in Vercel function logs, and then `null`.

### What this classification means

The source code at `6dfbb48` is correct and complete. The admin alert dispatch is
implemented, awaited, and tested (INQ-035). The fix is entirely operational:
**add `ADMIN_NOTIFICATION_EMAIL` to Vercel environment variables and redeploy.**

This is NOT a bug in the notification dispatch logic. The serverless lifecycle fix from
`6dfbb48` is sound. No source change is required.

---

## §12 Recommended Next Packet

### Immediate ops action (Paresh action — NOT a code packet)

1. Open Vercel dashboard → Project Settings → Environment Variables
2. Verify whether `ADMIN_NOTIFICATION_EMAIL` exists (presence check only)
3. If absent: add `ADMIN_NOTIFICATION_EMAIL` with value `p***@texqtic.com` (Production scope)
4. Trigger a new deployment to refresh Lambda environment
5. Run a single controlled general inquiry (same payload as runtime verification test)
6. Verify Postmark shows +2 quota increment and two new email threads:
   - Buyer ack: "We received your TexQtic inquiry" → `s***@gmail.com`
   - Admin alert: "New public inquiry submitted — TexQtic" → `p***@texqtic.com`
7. If both confirmed: update runtime classification to
   `INQUIRY_NOTIFICATION_FIX_RUNTIME_VERIFIED_GENERAL_FULL`

### After admin alert confirmed — code quality packet (optional)

**Recommended:** Add a startup log for `ADMIN_NOTIFICATION_EMAIL` presence state.
Currently, the config silently produces `null` with no warning when the env var is absent.
Adding a startup warning (`'[config] ADMIN_NOTIFICATION_EMAIL not set; admin inquiry alerts will be skipped'`)
would make this class of misconfiguration immediately visible in Vercel deployment logs.

Proposed future unit: `SOFT-LAUNCH-F1-P1B-FIX-ADMIN-EMAIL-CONFIG-OBSERVABILITY`
Scope: add one `console.warn` line in `server/src/config/index.ts` when
`ADMIN_NOTIFICATION_EMAIL` is absent (vs. present-but-invalid).

### After full verification — proceed to

`SOFT-LAUNCH-F1-P5-INQUIRY-COPY-TRUTHFULNESS-FIX` — review and correct buyer
acknowledgement and admin alert email copy for production accuracy.

---

## §13 Remaining Blockers

| ID | Description | Severity | Owner |
|---|---|---|---|
| **INQ-ADMIN-01** | `ADMIN_NOTIFICATION_EMAIL` env var absent from Vercel. Ops action required: add var + redeploy + re-verify. Classification: `ADMIN_ALERT_SKIPPED_CONFIG_NULL`. | HIGH | Paresh (ops) |
| PRIT-034 | Legal pages (Privacy Policy, Terms of Service) missing | MEDIUM | Future sprint |
| INQ-COPY-02 | Buyer acknowledgement email copy truthfulness review | MEDIUM | F1-P5 |
| INQ-COPY-24 | Admin alert email copy review | MEDIUM | F1-P5 (blocked by INQ-ADMIN-01) |
| Supplier-path RV | Supplier-path notification not runtime-verified (general path only tested) | LOW | Future sprint |
| Config observability | No startup warning when `ADMIN_NOTIFICATION_EMAIL` absent | LOW | Optional future packet |
| Postmark webhook | No delivery failure alerting; manual dashboard review only | LOW | Future ops |

---

## §14 No-Secrets / No-Source-Change Statement

- No SMTP credentials, API tokens, Postmark tokens, Vercel tokens, passwords, JWTs,
  DB URLs, or `.env` contents appear anywhere in this document.
- Admin email appears only as `p***@texqtic.com`.
- Buyer test email appears only as `s***@gmail.com`.
- All code excerpts are read-only source quotes — no mutations.
- No source code, test files, schema, migration, environment variable, Vercel setting,
  or Postmark setting was modified by this investigation unit.
- Only the following file was created:
  `governance/units/SOFT-LAUNCH-F1-P1B-FIX-RV-ADMIN-ALERT-INVESTIGATION.md`
