# SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT

**Unit ID:** `SOFT-LAUNCH-REPO-TRUTH-RT4-B-NOTIFICATION-LOOP-READINESS-AUDIT`  
**Unit type:** Repo-truth audit — no source implementation  
**Mode:** Safe-Write Mode / TECS Repo-Truth-First Audit / Report Only  
**Date created:** 2026-05-21  
**Author:** Copilot (TexQtic governance agent)  
**Authorized by:** Paresh Patel  

**Git HEAD at creation:** `d98ec81f19caca367948f8a9b13880cad871655d`  
**Worktree state:** CLEAN — zero staged, zero modified, zero untracked  

---

## §1 Header and Authority Boundary

### Purpose

This artifact audits actual repo truth for the public inquiry notification loop required before scaled buyer-facing soft launch. Specifically, it establishes:

1. **What notification and email infrastructure already exists** — service, config, wrappers, current uses.
2. **What is completely absent** — notification routing, inquiry-specific email wrappers, admin email config.
3. **What the SMTP production gap is** — confirming known blocker `HD-001-SMTP-INFRA-GAP-001` status.
4. **Whether existing email infrastructure is reusable** for FTR-B2C-004 without re-architecture.
5. **What the minimum implementation scope would require** before any implementation is authorized.
6. **Priority implication** relative to other identified soft-launch blockers.

This is an investigation-only unit. It does not authorize, design, or implement any notification logic, email wrapper, SMTP configuration, schema change, inquiry copy fix, legal page, or any other source change.

### Authority boundary

This unit is a **repo-truth audit and classification record only**.

**This unit may not:**
- Implement supplier notification or admin notification logic
- Add `sendBuyerInquiryNotificationEmail` or any email wrapper to `email.service.ts`
- Modify `public.ts`, `tenant.ts`, `auth.ts`, or any route file
- Add `ADMIN_NOTIFICATION_EMAIL` or any env var to `config/index.ts`
- Configure SMTP (Vercel or any environment)
- Modify Prisma schema or add a Notification model
- Fix INQ-COPY-02 or INQ-COPY-24
- Implement legal pages
- Implement demo labeling
- Update TLRH indexes
- Update launch-readiness hub docs
- Update governance source registers
- Modify Layer 0 docs
- Run SQL, scripts, or tests
- Stage any file other than this audit artifact

---

## §2 TLRH Storage Note

This artifact is stored under `governance/units/` and is part of the TexQtic Launch Readiness Hub repo-truth audit record.  
This unit does not update TLRH indexes, Layer 0 docs, launch-readiness hub docs, or source registers.  
Cross-reference is maintained through the artifact itself and the Git commit introduced by RT4-B.  
A later dedicated governance-sync unit may update authoritative TLRH indexes after RT6, if Paresh authorizes it.

---

## §3 Git / Worktree Truth

```
git status --short      → (empty — clean worktree)
git rev-parse HEAD      → d98ec81f19caca367948f8a9b13880cad871655d
```

| Attribute | Value |
|---|---|
| HEAD commit | `d98ec81f19caca367948f8a9b13880cad871655d` |
| Commit message | `[TEXQTIC] docs: audit legal pages readiness from repo truth` |
| Worktree state at creation | CLEAN — zero staged, zero modified, zero untracked |
| Branch | `main` |

All findings in this audit unit are asserted against the HEAD state above.

---

## §4 Input Artifacts Reviewed

### Prior repo-truth audit units

| Artifact | Key content used |
|---|---|
| `SOFT-LAUNCH-REPO-TRUTH-RT2-B3-DIRECTORY-INQUIRY-ATTACHMENT-AUDIT.md` | OI-B3-004: FTR-B2C-004 `NOT_STARTED`; inquiry endpoint `PRODUCTION_VERIFIED`; SMTP deferred |
| `SOFT-LAUNCH-REPO-TRUTH-RT3-C-INQUIRY-COPY-TRUTHFULNESS-AUDIT.md` | INQ-COPY-02 `MISLEADING`: "forwarded to supplier" — no notification exists; INQ-COPY-24 `OVERPROMISE_RISK` |
| `SOFT-LAUNCH-REPO-TRUTH-RT3-D-DEMO-LABEL-READINESS-SYNTHESIS.md` | FTR-B2C-004 P1 blocker; investigations-first before implementation priority finalized |
| `SOFT-LAUNCH-REPO-TRUTH-RT4-A-LEGAL-PAGES-READINESS-AUDIT.md` | Legal pages and notification loop are independent workstreams; FTR-B2C-004 higher technical complexity |

### Governance / launch-readiness units

| Artifact | Key content used |
|---|---|
| `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` (lines 131, 144, 174, 230, 359) | FTR-B2C-004 `NOT_STARTED` P1; `SOFT-LAUNCH-MINIMUM-NOTIFICATION-LOOP-UNIT-001` planned; SMTP deferred vs. notification gap |
| `SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md` (lines 35–36, 358, 411, 415) | SMTP remediation as `SOFT-LAUNCH-SMTP-REMEDIATION-E1` (pending ops decision); inquiry capture confirmed; notification absent |
| `SOFT-LAUNCH-ONBOARDING-FLOW-MAP-001.md` (line 343) | Notification loop Path 5; required before buyer outreach at scale |
| `HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001.md` (lines 140–200) | `HD-001-SMTP-INFRA-GAP-001`: P0 blocker — all SMTP env vars absent from Vercel production; delivery returns `SKIPPED_SMTP_UNCONFIGURED` |
| `HD-001-SUPPLIER-INVITE-ONBOARDING-RESOLUTION-001.md` | HD-001 code fix `IMPLEMENTATION_COMPLETE`; invite email code is correct; infrastructure gap only |

### Source files inspected (read-only)

| File | Purpose |
|---|---|
| `server/src/routes/public.ts` (lines 1238–1440) | Full inquiry submission route: validation, audit write, fire-and-forget, response |
| `server/src/services/email/email.service.ts` (lines 1–290) | Canonical email service: sendEmail, named wrappers, SMTP config, graceful degradation |
| `server/src/lib/emailStubs.ts` | Deprecated stubs delegating to email.service.ts |
| `server/src/config/index.ts` (SMTP section, lines 55–85) | SMTP env var schema; FRONTEND_URL handling |
| `server/src/routes/auth.ts` (import, line 20) | Email service usage in auth flows |
| `server/src/routes/tenant.ts` (lines 102–105, 1581–1582, 6566–6567) | `sendInviteMemberEmail` usage in invite flows |
| `server/src/routes/admin/tenantProvision.ts` (line 28) | `sendInviteMemberEmail` usage in supplier onboarding |
| `server/src/services/rfq/supplierNotificationBoundary.service.ts` (lines 1–130) | Existing RFQ supplier notification boundary: types, safe-payload enforcement, log-only channel |
| `server/prisma/schema.prisma` (Tenant, organizations, AuditLog, EventLog, User, Membership, Invite) | All relevant models for notification path analysis |
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` (lines 1–310) | 12 inquiry unit tests — coverage scope |

---

## §5 Public Inquiry Backend Path Findings

### Route: `POST /api/public/inquiry/submit`

**File:** `server/src/routes/public.ts`  
**Design authority:** `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`, `MAIN-PLATFORM-BUYER-INQUIRY-PREAUTH-004`  
**Event governance:** `shared/contracts/event-names.md §buyer_inquiry.created.v1`

### Input validation

| Gate | Behavior |
|---|---|
| Rate limit | 20 requests / 15 minutes per IP (Fastify plugin) |
| Zod schema validation | `inquiry_category` (required enum), `supplier_slug` (optional, `^[a-z0-9-]+$`, max 100), `source_surface`, `product_slug`, `category_slug`, `collection_slug`, `geo_band`, `volume_band`, `message` (max 2000) |
| Context exclusivity | `supplier_slug` cannot coexist with `product_slug`, `category_slug`, or `collection_slug` |
| Message PII gate | Raw message checked for email pattern, phone pattern before processing; fails-closed with 400 |
| Message sanitization | HTML tags stripped, URLs stripped, sanitized length re-checked ≤500 chars |
| Source surface normalization | Unknown values normalized to `'DIRECT'` |
| Category/collection approval gate | Only slugs in `APPROVED_CATEGORY_SLUGS` / `APPROVED_COLLECTION_SLUGS` pass; unapproved silently dropped |

### Two execution paths

**Supplier context path** (when `supplier_slug` is provided):

1. `getPublicB2BSupplierBySlug(supplier_slug, prisma)` — full public projection gate (five eligibility gates); if fails → 404
2. `prisma.$transaction(async (tx) => writeAuditLog(tx, {...}))` — **fire-and-forget** (`void …catch(log)`)
   - `realm: 'TENANT'`, `tenantId: supplierResult.orgId`
   - `actorType: 'SYSTEM'`, `actorId: null`
   - `action: 'public.buyer.inquiry.created'`
   - `entity: 'organization'`, `entityId: supplierResult.orgId`
   - `afterJson`: `{supplier_slug, inquiry_category, source_surface, [optional: product_slug, category_slug, collection_slug, geo_band, volume_band, inquiry_message], timestamp}`
   - **No buyer email, no buyer name, no org UUID in afterJson**
3. Returns `HTTP 202 {success: true, data: {acknowledged: true, message: 'Your inquiry has been received.'}}`

**General inquiry path** (no `supplier_slug`):

1. No supplier gate — proceeds directly
2. `prisma.$transaction(async (tx) => writeAuditLog(tx, {...}))` — **fire-and-forget**
   - `realm: 'ADMIN'`, `tenantId: null`
   - `action: 'public.buyer.inquiry.general.created'`
   - `entity: 'platform_inquiry'`, `entityId: null`
   - `afterJson`: same context fields, no supplier context, no buyer PII
   - **Note**: action `'public.buyer.inquiry.general.created'` is NOT registered in `AUDIT_ACTION_TO_EVENT_NAME` — event not emitted; deferred to `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001`
3. Returns `HTTP 202`

### Critical finding — zero notification side effect

**There is no email send, webhook dispatch, queue push, notification write, or any form of supplier or admin notification in either execution path.**

The route captures the inquiry as an audit log entry and returns 202. The supplier (whose `orgId` is accessible at processing time in the supplier context path) is **not notified by any mechanism**.

The buyer receives no confirmation email.

### Supplier context at inquiry time

| Data | Available? | Where |
|---|---|---|
| `supplier_slug` | Yes | Request payload |
| `supplierResult.orgId` (Tenant UUID) | Yes | From `getPublicB2BSupplierBySlug` result |
| Supplier owner email | **No** — not queried | Would require: `Tenant.memberships → User.email` (DB join) |
| Supplier org contact email | **No** — no field | `organizations` model has no `contact_email` or `owner_email` field |
| Admin notification email | **No** — not in config | No `ADMIN_NOTIFICATION_EMAIL` env var defined in `config/index.ts` |

---

## §6 Existing Email Infrastructure Findings

### Canonical email service: `server/src/services/email/email.service.ts`

**Governance:** G-012 — canonical Phase-1 email service  
**Technology:** `nodemailer` (SMTP transport)  
**Status:** Code is complete and correct. Infrastructure is blocked in production.

### Core `sendEmail` function

```
sendEmail(params: EmailParams, context: EmailContext): Promise<EmailDispatchOutcome>
```

**Behavior by environment:**

| Environment | SMTP configured? | Behavior | Return status |
|---|---|---|---|
| `development` / `test` | N/A | Structured JSON log to stdout (`EMAIL_DEV_LOG`); no real send | `DEV_LOGGED` |
| `production` | Yes | SMTP send via nodemailer; structured `EMAIL_SENT` log with `messageId` | `SENT` |
| `production` | **No** | Structured JSON warning log (`EMAIL_SMTP_UNCONFIGURED`); no send | `SKIPPED_SMTP_UNCONFIGURED` |
| Any | — | Bad input (missing `to`, invalid email, missing `subject`, missing body) | **Throws** `EmailValidationError` |
| `production` | Yes, but send fails | Structured `EMAIL_SEND_FAILED` error log; **re-throws** to caller | (throws) |

**Stop-loss validation:** validates `to`, `to` email format, `subject`, and body (`html` or `text`) before any I/O.

### Named email wrappers — existing

| Wrapper | File | Used by | Status |
|---|---|---|---|
| `sendPasswordResetEmail(to, resetToken, context?)` | `email.service.ts` | `server/src/routes/auth.ts` | In use |
| `sendEmailVerificationEmail(to, verificationToken, context?)` | `email.service.ts` | `server/src/routes/auth.ts`, `emailStubs.ts` | In use |
| `sendInviteMemberEmail(to, inviteToken, orgName, context?)` | `email.service.ts` | `server/src/routes/tenant.ts`, `server/src/routes/admin/tenantProvision.ts` | In use (blocked by SMTP gap) |

**No `sendBuyerInquiryNotificationEmail` or equivalent wrapper exists.** This is a new wrapper that would need to be added for FTR-B2C-004.

### SMTP environment variable schema (`server/src/config/index.ts`)

| Variable | Schema | Default | Required? |
|---|---|---|---|
| `SMTP_HOST` | `z.string().optional()` | (none) | Optional — graceful degradation if absent |
| `SMTP_PORT` | `z.string().transform(Number).default('587')` | `587` | Optional — defaults to 587 |
| `SMTP_USER` | `z.string().optional()` | (none) | Optional |
| `SMTP_PASS` | `z.string().optional()` | (none) | Optional |
| `SMTP_FROM` | `z.string().optional()` | (none) | Optional |
| `FRONTEND_URL` | `z.string().url()` (with fallback) | `https://app.texqtic.com` | Sanitized/fallback — non-fatal |

**`ADMIN_NOTIFICATION_EMAIL` is NOT currently in the config schema.** It would need to be added as an optional env var for an admin notification path.

### SMTP production status — `HD-001-SMTP-INFRA-GAP-001`

**Source:** `governance/units/HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001.md` §4  

| Dimension | Finding |
|---|---|
| Blocker ID | `HD-001-SMTP-INFRA-GAP-001` |
| Severity | P0 — blocks all email delivery in production |
| Scope | All email functions in `email.service.ts` — affects password reset, email verification, invite, and any future notification flows |
| Root cause | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` are absent from Vercel production environment variables |
| Code assessment | Code is correct — `sendInviteMemberEmail` fires as intended; delivery fails only because SMTP config is absent |
| Current production behavior | All email calls return `SKIPPED_SMTP_UNCONFIGURED`; no emails are delivered |
| Known evidence | HD-001 runtime verify confirmed: invite email NOT delivered to `shraddhaind@gmail.com`; invite record is live in production |
| Resolution status | Pending — `SOFT-LAUNCH-SMTP-REMEDIATION-E1` is an open pending unit requiring Paresh SMTP provider decision |
| Resolution path | Paresh selects SMTP provider (Resend, SendGrid, Postmark, SES, or similar) → sets Vercel env vars |

**This blocker affects FTR-B2C-004 directly.** Any inquiry email notification implemented in code will return `SKIPPED_SMTP_UNCONFIGURED` in production until this gap is resolved.

### Deprecated stubs: `server/src/lib/emailStubs.ts`

Thin wrapper that delegates to `email.service.ts`. Marked `@deprecated` by G-012. Not a notification path. Retained for historical reference only. No new flows should use it.

### RFQ supplier notification boundary: `server/src/services/rfq/supplierNotificationBoundary.service.ts`

| Dimension | Finding |
|---|---|
| Exists | Yes — `notifySupplierRfqSubmittedGroups(input)` |
| Channel | `INTERNAL_BOUNDARY` — logs notification event to `fastify.log.info`; **does not send any email** |
| Purpose | Safe-payload enforcement for RFQ submission notifications; prevents sensitive commercial data leakage |
| Used by | `tenant.ts` RFQ submit routes |
| Reusable for FTR-B2C-004? | **No, not directly** — channel is log-only; no email dispatch; designed for authenticated tenant context, not pre-auth public inquiry; no `sendEmail` call |

The RFQ boundary service establishes a useful design precedent (safe-payload enforcement, forbidden-key validation) but is not a notification delivery mechanism.

---

## §7 Schema / Model Notification Readiness Findings

### Inquiry storage model

| Question | Answer |
|---|---|
| Is there an `Inquiry` model / table? | **No** — inquiry data is stored entirely in `AuditLog.afterJson` (JSONB field) |
| Is there a dedicated `BuyerInquiry` table? | **No** |
| Is there a `Notification` model / table? | **No** — no notification model exists in the Prisma schema |
| Is there any out-box / queue / message table? | **No** |

### `AuditLog` model (used for inquiry capture)

```
model AuditLog {
  id             String     @id @default(uuid()) @db.Uuid
  realm          AuditRealm
  tenantId       String?    @map("tenant_id") @db.Uuid
  actorType      ActorType  @map("actor_type")
  action         String     @db.VarChar(100)
  entity         String     @db.VarChar(100)
  entityId       String?    @map("entity_id") @db.Uuid
  afterJson      Json?      @map("after_json")
  createdAt      DateTime   @default(now()) @map("created_at")
  ...
}
```

Inquiry audit log entries are identifiable by `action = 'public.buyer.inquiry.created'` (supplier context) or `action = 'public.buyer.inquiry.general.created'` (general). `afterJson` holds all context fields. No buyer PII is stored.

### `EventLog` model (linked to AuditLog)

```
model EventLog {
  id           String   @id @db.Uuid
  name         String   @db.VarChar(100)
  occurredAt   DateTime ...
  tenantId     String?  ...
  entityType   String   ...
  entityId     String   @db.Uuid
  payloadJson  Json?    ...
  auditLogId   String   @unique @map("audit_log_id") @db.Uuid  ← FK to AuditLog
  ...
}
```

`auditLogId` is `@unique` — one EventLog entry per AuditLog entry. If FTR-B2C-004 were to use the event infrastructure, `EventLog.id` would be a natural idempotency key for exactly-once notification dispatch. **However, `buyer_inquiry.created.v1` event emission for the general inquiry path is deferred** (noted directly in the route code — `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001`).

### Supplier email resolution path

| Step | Model / field | Status |
|---|---|---|
| Inquiry time: `orgId` available | `AuditLog.tenantId = supplierResult.orgId` | ✅ Available at inquiry time |
| `Tenant` → email | `Tenant` model has no `email` field | ❌ Not directly available |
| `organizations` → contact email | `organizations` model has no `contact_email` or `owner_email` field | ❌ Not available |
| `Tenant → Membership → User.email` | `User.email` is available via membership join | ✅ Available via DB join (not done in current route) |
| Owner/primary member resolution | No `OWNER` role concept in current `MembershipRole` enum accessible in route | Needs design: OWNER vs. first member vs. all members |
| Multi-member orgs | Supplier org may have multiple members | Must decide: notify one (OWNER?) or all with ADMIN/MEMBER roles |

**Conclusion:** Supplier email is not directly available on the org model. A notification system would need a DB query: `Membership` join to `User` filtered by `tenantId = orgId`, then select the appropriate member email(s).

### Multi-tenancy / RLS safety consideration

Inquiry route runs as a public (unauthenticated) route. It already uses `writeAuditLog` with `tenantId = supplierResult.orgId`. Any email lookup would query `Membership` + `User` by `tenantId`. This is an admin-context read (system actor, no RLS user context) — identical to the pattern used in `tenantProvision.ts` (`sendInviteMemberEmail` after org creation). No new RLS concerns, provided the DB query uses admin/service role (existing pattern in the route).

---

## §8 Test / Evidence Table

### Existing test coverage for relevant components

| Test file | Scope | Notification coverage | Pass evidence |
|---|---|---|---|
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` (INQ-001 → INQ-012) | Validation, 202 response, audit write correctness, fire-and-forget, PII-safe afterJson | **Zero** — no email mock, no notification assertions | ✅ 12 tests defined; last run evidence in prior governance verification |
| `server/src/__tests__/tenant-provision-approved-onboarding.integration.test.ts` | Supplier provisioning flow; `email.service.js` mocked | `sendInviteMemberEmail` presence tested (mocked — no real send) | ✅ Mocked correctly |
| `server/src/__tests__/auth-email-verification-enforcement.integration.test.ts` | Auth email verification enforcement | Auth email; no inquiry notification | ✅ Scoped to auth |
| `server/src/routes/tenant.rfqVisibilityPolicyGate.test.ts` | RFQ visibility policy; supplier notification boundary mock | RFQ boundary: asserts not called when gate fails | ✅ RFQ-only; not inquiry |
| `server/src/routes/tenant.rfqMultiItemGrouping.test.ts` | Multi-item RFQ grouping; `notifySupplier` mock | RFQ grouping notification assertions | ✅ RFQ-only; not inquiry |

### Email service tests

No dedicated unit test file for `email.service.ts` was found in the workspace (`server/src/**/*email*.test.ts` search returned only `auth-email-verification-enforcement.integration.test.ts`). The email service is covered implicitly through integration tests that mock it.

### SMTP production evidence

| Evidence source | Finding |
|---|---|
| `HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001.md` §4 | Confirmed: SMTP not configured in Vercel production; all emails return `SKIPPED_SMTP_UNCONFIGURED` |
| Multiple server log files (`gate-e4-isolated.log`, `nodb-final.log`, `p3-baseline.log`, etc.) | `FRONTEND_URL invalid/missing; using fallback` — confirms env var gaps in local runs |
| Invite record `shraddhaind@gmail.com` (redacted) | Invite token is live in DB; email was NOT delivered to supplier |

---

## §9 Subcomponent Classification Table

**Classification vocabulary:**

| Code | Definition |
|---|---|
| `IMPLEMENTED_PRODUCTION_VERIFIED` | Fully implemented, tested, and production-verified with evidence |
| `IMPLEMENTED_TEST_COVERED` | Implemented and covered by unit/integration tests; production evidence partial or pending |
| `IMPLEMENTED_PARTIAL` | Some implementation exists but key components are absent or untested |
| `NOT_IMPLEMENTED` | No code, no config, no model — entirely absent |
| `BLOCKED_BY_ENV` | Code is implemented and correct; blocked by missing environment configuration |
| `BLOCKED_BY_DESIGN` | Deferred by explicit design decision; intentionally not implemented in this slice |
| `CONFLICTING` | Contradictory or inconsistent state across surfaces |

### Classification table

| Sub-component | Classification | Evidence / Notes |
|---|---|---|
| **A. Inquiry capture** (`POST /api/public/inquiry/submit` — validation, PII gate, 202 response) | `IMPLEMENTED_PRODUCTION_VERIFIED` | Source confirmed at HEAD `d98ec81f`; 12 unit tests (INQ-001→012); RT2-B3 production-verified; consistent with all prior audit units |
| **B. Audit / event persistence** (AuditLog write + fire-and-forget pattern) | `IMPLEMENTED_TEST_COVERED` | `writeAuditLog` called correctly (INQ-009 asserts action, realm, actorType, actorId); INQ-010 asserts 202 even if write fails; `EventLog` model exists; general inquiry event deferred to `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001` |
| **C. Supplier email resolution** (resolve supplier owner email from `orgId` at notification time) | `NOT_IMPLEMENTED` | `orgId` is available at inquiry time; no Membership→User email lookup exists in route or service; `organizations` model has no `contact_email`; `Tenant` model has no `email` field; resolution logic has not been written |
| **D. Email delivery infrastructure** (`email.service.ts` — nodemailer, SMTP config, graceful degradation) | `IMPLEMENTED_PARTIAL` | G-012 service is fully implemented and correct; 3 named wrappers cover auth and invite flows; no inquiry-specific wrapper; SMTP env vars absent from production → all delivery blocked (`SKIPPED_SMTP_UNCONFIGURED`) |
| **D1. SMTP production delivery** | `BLOCKED_BY_ENV` | `HD-001-SMTP-INFRA-GAP-001` confirmed P0; `SMTP_HOST/USER/PASS/FROM` absent from Vercel production; ops decision by Paresh required; `SOFT-LAUNCH-SMTP-REMEDIATION-E1` open pending |
| **E. Notification routing logic** (trigger, recipient resolution, template, dispatch, audit) | `NOT_IMPLEMENTED` | Zero code; no trigger in inquiry route; no `sendBuyerInquiryNotificationEmail` wrapper; no admin email config; no notification model; no routing service for public inquiry |
| **F. Failure handling / retry / observability** | `IMPLEMENTED_PARTIAL` | Inquiry audit write is fire-and-forget (non-blocking, correct); `email.service.ts` has structured error logging (`EMAIL_SEND_FAILED`) and re-throws on SMTP failure; no retry mechanism; no dead-letter queue; no notification-specific alerting |
| **G. Existing test coverage** | `IMPLEMENTED_PARTIAL` | 12 inquiry unit tests cover capture/validation/PII; zero notification tests exist; email service mocked in provisioning and auth tests; RFQ notification boundary tested; no test for inquiry email dispatch |
| **H. Overall FTR-B2C-004 readiness** | `NOT_IMPLEMENTED` | Sub-components C and E are fully absent; D1 is environment-blocked; no routing logic, no email wrapper, no recipient resolution, no template |

---

## §10 Minimum Viable Notification-Loop Implementation Scope

This section defines the minimum implementation path for FTR-B2C-004 without authorizing implementation. It is an input to Paresh's implementation planning.

### Trigger point

The notification should fire from `POST /api/public/inquiry/submit` **after** the audit log write succeeds (or attempt completes), using the same fire-and-forget pattern already established for the audit write. The notification dispatch must not block the 202 response.

**Option A — Inline trigger in route:** notification dispatch call placed immediately after `void prisma.$transaction(...)` in the supplier context path. Simpler; requires email service import in `public.ts`.

**Option B — Event consumer:** notification triggered as a consumer of `buyer_inquiry.created.v1` event from `EventLog`. Architecturally cleaner but requires event consumer infrastructure that does not currently exist for public inquiry events. Higher complexity; general inquiry event emission also deferred.

**Minimum viable path: Option A (inline trigger, fire-and-forget).** This matches the existing pattern used by invite email in `tenantProvision.ts` and invite resend in `tenant.ts`.

### Recipient resolution

**Supplier notification path:**

At notification time, `supplierResult.orgId` is available. Recipient resolution requires one additional DB query (admin/service role context, consistent with route execution model):

```
Membership.findMany(where: { tenantId: orgId, role: 'OWNER' })  →  User.email
```

If no OWNER exists, fall back to first non-expired membership. Decision required: notify OWNER only, or notify all ADMIN/OWNER-role members.

**Admin notification path (minimum viable):**

Read `ADMIN_NOTIFICATION_EMAIL` from `config/index.ts` (not yet defined; would need to be added as an optional env var). If configured, send a summary notification. If absent, skip silently (same graceful degradation as SMTP).

**Buyer confirmation (out of scope for minimum viable):** Buyer is anonymous (no email captured by design); no buyer confirmation email is possible at minimum viable scope.

### Email / template content boundary

The notification template is constrained by the PII-safe design of the inquiry record:

**May include:**
- `inquiry_category` (enum value)
- `source_surface` (normalized surface label)
- `supplier_slug` (supplier's own slug)
- `product_slug`, `category_slug`, `collection_slug` (if present — approved slugs only)
- `geo_band`, `volume_band` (if present)
- `inquiry_message` (already sanitized — no email/phone/HTML/URLs)
- `timestamp`

**Must not include:**
- Buyer email, buyer name, buyer org UUID, or any buyer PII (none is captured or available)
- `external_orchestration_ref`
- Any commercial or pricing data

A minimal template would be:  
_Subject_: "New buyer inquiry received — [supplier_slug]"  
_Body_: inquiry_category, source_surface, timestamp; optional context fields if present.

### Audit / event idempotency considerations

Each inquiry creates exactly one `AuditLog` entry (UUID primary key). If `EventLog` is used, `EventLog.auditLogId` is `@unique` — preventing duplicate event entries. For the inline trigger approach (Option A), idempotency is provided by the fire-and-forget pattern: the route does not retry on failure. If email dispatch fails, the inquiry is still recorded in `AuditLog`. A missed notification is an operational loss, not a data integrity problem.

**If retry is required later**, it would need a separate mechanism (e.g., background job scanning `AuditLog` for unnotified inquiries). This is out of scope for minimum viable FTR-B2C-004.

### Environment requirements for production delivery

| Requirement | Status | Owner |
|---|---|---|
| SMTP provider selection | **Pending — Paresh decision** | Paresh |
| `SMTP_HOST` set in Vercel | **Not set** — `HD-001-SMTP-INFRA-GAP-001` | Paresh (ops) |
| `SMTP_USER` set in Vercel | **Not set** | Paresh (ops) |
| `SMTP_PASS` set in Vercel | **Not set** | Paresh (ops) |
| `SMTP_FROM` set in Vercel | **Not set** | Paresh (ops) |
| `ADMIN_NOTIFICATION_EMAIL` (new) | **Not defined** — would be added to `config/index.ts` as optional | Implementation unit |

**SMTP is a hard prerequisite for production email delivery.** Without resolving `HD-001-SMTP-INFRA-GAP-001`, any FTR-B2C-004 notification code deployed to production will silently return `SKIPPED_SMTP_UNCONFIGURED` — no delivery, no error, no visible failure.

### Fallback behavior if SMTP unavailable

`email.service.ts` already implements graceful degradation: if `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, or `SMTP_FROM` is absent, `sendEmail` returns `{ status: 'SKIPPED_SMTP_UNCONFIGURED' }` and logs a structured warning. The notification call using this service will return silently without throwing. The inquiry audit log entry is still written. This is acceptable fallback for minimum viable scope.

### Source changes required (not authorized by this unit)

| Change | File | Type |
|---|---|---|
| Add `sendBuyerInquiryNotificationEmail` wrapper | `server/src/services/email/email.service.ts` | New named wrapper |
| Add `ADMIN_NOTIFICATION_EMAIL` to config | `server/src/config/index.ts` | New optional env var |
| Add notification dispatch (fire-and-forget) in inquiry route supplier path | `server/src/routes/public.ts` | Route modification |
| Add `sendEmail` / `email.service.ts` import to `public.ts` | `server/src/routes/public.ts` | Import addition |
| Add membership-to-email lookup utility or inline query | `server/src/routes/public.ts` or new service | New DB query |
| Add unit tests for notification dispatch | `server/src/__tests__/public-buyer-inquiry.unit.test.ts` | New test cases |

### Tests likely required

| Test | Assertion |
|---|---|
| INQ-013: `sendEmail` called with correct supplier email on 202 (supplier path) | `sendEmail` mock called once; `to` matches resolved owner email; `subject` contains `supplier_slug`; no PII in body |
| INQ-014: no `sendEmail` call when SMTP unconfigured (production graceful degradation) | `sendEmail` mock returns `SKIPPED_SMTP_UNCONFIGURED`; route still returns 202 |
| INQ-015: route returns 202 even if `sendEmail` throws (fire-and-forget — non-blocking) | `sendEmail` mock throws; 202 still returned |
| INQ-016: notification `to` address contains no buyer PII | Email body/subject does not contain any of: `buyer_contact_email`, `external_orchestration_ref`, org UUID |
| INQ-017: admin notification sent to `ADMIN_NOTIFICATION_EMAIL` if configured | Mock `config.ADMIN_NOTIFICATION_EMAIL`; assert second `sendEmail` call |

### Production verification likely required

After implementation: end-to-end test — submit inquiry to supplier slug; confirm `AuditLog` entry written; confirm `sendEmail` called in dev log; confirm email delivered (SMTP configured, non-production provider for test); confirm no PII in email content.

---

## §11 Governance Drift Table — Notification Loop Scope

Drift limited to notification-loop and SMTP readiness. Drift in RT1/RT2/RT3/RT4-A items not recatalogued here.

| Governance claim | Document | Repo truth | Drift / Status |
|---|---|---|---|
| "FTR-B2C-004 minimum notification loop is `NOT_STARTED`" | RT2-B3 OI-B3-004; RT3-D; SOFT-LAUNCH-PRIORITY-RESET (line 174) | Confirmed — zero notification code in `public.ts` route; no notification service for inquiry; no email wrapper | **`NOT_STARTED` status confirmed as accurate** |
| "SMTP only becomes a blocking dependency when buyer inquiry notifications must be pushed to suppliers (FTR-B2C-004 / PRIT-033)" | `SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md` (line 35–36) | Confirmed — inquiry capture works without SMTP; SMTP only needed for email dispatch | **CONFIRMED — statement accurate** |
| "Inquiry captured to DB; supplier NOT notified. Buyer submits inquiry; no confirmation sent." | `SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md` (line 411) | Confirmed by source inspection of `public.ts` lines 1297–1440 — zero notification side effect | **CONFIRMED — no change** |
| "`SOFT-LAUNCH-SMTP-REMEDIATION-E1` — SMTP provider decision by Paresh — blocks buyer inquiry email notification" | `SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md` (line 358) | SMTP gap confirmed as `HD-001-SMTP-INFRA-GAP-001`; all 4 required Vercel env vars absent | **CONFIRMED — still open; Paresh decision pending** |
| "HD-001 code fix is `IMPLEMENTATION_COMPLETE`; `sendInviteMemberEmail` fires as intended; delivery fails only due to SMTP config absence" | `HD-001-SUPPLIER-INVITE-ONBOARDING-RUNTIME-VERIFY-001.md` §4 | `sendInviteMemberEmail` exists in `email.service.ts`; import confirmed in `tenant.ts` and `tenantProvision.ts` | **CONFIRMED — code correct; SMTP absent** |
| "SMTP / email delivery infrastructure: HD-001 SMTP gap identified — deferred; not blocking soft launch; manual delivery of invite URLs is proven" | `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` (line 144) | Manual fallback confirmed: invite token returned in `inviteToken` field of 201 response; SMTP is now a blocker only for FTR-B2C-004 (inquiry email) and invite email delivery | **CONFIRMED — deferred status accurate for invite; becomes a hard blocker for FTR-B2C-004 in production** |
| "Minimum notification loop (FTR-B2C-004) — P1, standalone prerequisite" | `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` (line 174, 359) | No implementation started; no unit planned beyond the registration | **`NOT_STARTED` status confirmed; `SOFT-LAUNCH-MINIMUM-NOTIFICATION-LOOP-UNIT-001` is the planned implementation unit** |
| "RFQ supplier notification boundary service exists" | `tenant.ts` imports (line 102–104); test files | `supplierNotificationBoundary.service.ts` confirmed in source | **CONFIRMED — exists but is log-only; not reusable for public inquiry email** |

### New drift item identified by RT4-B

| Item | Finding |
|---|---|
| RT4-B-DRIFT-001 | `SOFT-LAUNCH-PRIORITY-RESET-REQUIREMENTS-INTAKE-REVIEW-001.md` (line 144) classifies SMTP/email delivery infrastructure as "deferred — not blocking soft launch." This was accurate when written (invite token is returned via API response). However, at the point when FTR-B2C-004 implementation is authorized, SMTP becomes a **P0 hard prerequisite** — not just deferred. The classification needs to be updated before the notification-loop implementation unit is started. This is a governance classification gap, not an implementation gap. No action required by this audit. |

---

## §12 Priority Implication Notes

This section provides input to final priority synthesis. It does not finalize implementation order.

### FTR-B2C-004 has a hard external dependency: SMTP provisioning

Unlike the inquiry copy fix or legal pages (which are blocked only by content decisions or human approvals), FTR-B2C-004 has a hard infrastructure prerequisite: `HD-001-SMTP-INFRA-GAP-001` must be resolved before any notification code deployed to production can deliver email. **Implementing the notification logic in code without resolving SMTP will result in `SKIPPED_SMTP_UNCONFIGURED` silently in production — functionally equivalent to the current state.**

This means FTR-B2C-004 has a two-phase readiness path:
1. **Phase 1 — Code implementation** (can begin before SMTP is provisioned; tested in dev via `DEV_LOGGED`)
2. **Phase 2 — SMTP provisioning** (Paresh ops decision; provider selection; Vercel env var configuration)

Both phases must be complete for FTR-B2C-004 to be `PRODUCTION_VERIFIED`.

### Implementation scope comparison vs. RT4-A legal pages

| Dimension | FTR-B2C-004 (notification loop) | PRIT-034 (legal pages) |
|---|---|---|
| External dependency | SMTP provisioning (Paresh ops decision + provider setup) | Legal content decisions (Paresh + optional counsel) |
| Content gate | No | Yes |
| Code complexity | Moderate — new email wrapper, DB join for recipient resolution, route modification, new tests | Low — new static page components, appState cases, footer links |
| Schema change | No | No |
| Files changed (estimate) | 3–5 files (`email.service.ts`, `config/index.ts`, `public.ts`, test file) | 4–6 files (`PublicPrivacyPage.tsx`, `PublicTermsPage.tsx`, `App.tsx`, `PublicNavbar.tsx`, auth surface) |
| Independent workstreams? | Yes — FTR-B2C-004 and PRIT-034 are fully independent | Yes |
| Relative technical complexity | Higher than legal pages | Lower than FTR-B2C-004 |
| Copy accuracy impact | Resolves INQ-COPY-02 `MISLEADING` claim once deployed | No copy dependency |

**Input:** Both FTR-B2C-004 and PRIT-034 have non-technical prerequisites that Paresh must unblock (SMTP and legal content, respectively). Code implementation for both can proceed in parallel once their respective gates are cleared. PRIT-034 is technically simpler to implement once content is ready; FTR-B2C-004 requires SMTP to be verified before production delivery is functional.

### FTR-B2C-004 vs. inquiry copy fix (INQ-COPY-02 + INQ-COPY-24)

| Dimension | FTR-B2C-004 | Inquiry copy fix |
|---|---|---|
| Copy accuracy | Resolves `MISLEADING` claim at source (notification actually sent) | Corrects misleading claim by removing overpromise |
| Implementation gate | SMTP provisioning required for production delivery | None — wording already specified in RT3-C §10.1 / §10.2 |
| Implementation time | Moderate (3–5 file changes + tests + SMTP provisioning) | Minimal — 2 string replacements in 1 file |
| Can be done independently? | Yes | Yes |
| Sequence relationship | Copy fix should be applied now regardless of FTR-B2C-004 timeline; FTR-B2C-004 makes the original copy (once fixed back) truthful again | Copy fix is a safety-net action; FTR-B2C-004 is the permanent fix |

**Input:** The inquiry copy fix is the fastest corrective action and should proceed independently of FTR-B2C-004 implementation. Fixing the misleading copy now is correct regardless of when FTR-B2C-004 is implemented. When FTR-B2C-004 is deployed, copy can be updated again to reflect that forwarding is real. These are not sequentially dependent.

### FTR-B2C-004 vs. demo-labeling implementation

| Dimension | FTR-B2C-004 | Demo-labeling |
|---|---|---|
| External dependency | SMTP provisioning | Design unit first; then schema/API/component changes |
| Technical complexity | Moderate | High (schema change, API projection, multiple components) |
| Blocking scenario | Real buyer inquiries unseen by suppliers | Demo/QA data visible on live surfaces |
| Urgency | P1 — required before any real buyer outreach | P1 — deferred unless demo/QA data is seeded |

**Input:** FTR-B2C-004 is more urgent if real buyer outreach is imminent. Demo-labeling urgency is conditional on whether demo/QA data is seeded. If no demo/QA seeding occurs before real supplier data is live, demo-labeling has no immediate urgency.

### FTR-B2C-004 vs. aggregator provisioning

`BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` R-015 gates directory promotion behind both PRIT-034 and FTR-B2C-004. If aggregator directory promotion is planned (sharing public supplier links at scale), FTR-B2C-004 must be in place first to ensure the notification loop is active when real buyer inquiries begin to arrive. Aggregator provisioning and directory promotion should not precede FTR-B2C-004 deployment.

### Summary input for final priority synthesis

| Item | Pre-condition | Urgency source | Relative to other items |
|---|---|---|---|
| **Inquiry copy fix** (INQ-COPY-02 + INQ-COPY-24) | None — wording specified in RT3-C | Active misleading claim on live surface | Fastest to implement; should not wait for FTR-B2C-004 |
| **FTR-B2C-004** (notification loop) | SMTP provisioning (Paresh ops decision) | P1 — required before real buyer outreach; resolves INQ-COPY-02 at source | Code implementation can start; delivery blocked until SMTP resolved |
| **PRIT-034** (legal pages) | Legal content decisions (Paresh / counsel) | P1 / P0 for scaled data collection | Independent; faster to implement once content ready |
| **Demo-labeling** | Design unit; schema/API changes | P1 — conditional on demo/QA seeding | Largest workstream; deferred unless seeding is imminent |
| **SMTP provisioning** | Paresh provider decision | P0 prerequisite for FTR-B2C-004 production delivery | Ops action; not a code implementation |
| **Aggregator provisioning** | FTR-B2C-004 + PRIT-034 as prerequisites | Gated by R-015 | Must not precede FTR-B2C-004 |

**This is a priority input, not a final ordering decision.** Final implementation order is Paresh's decision based on timeline, SMTP provider decision, legal content readiness, and resource availability.

---

## §13 Recommended Next Packet

### Option A — RT4-C marketing / CTA truthfulness audit

**Proposed unit ID:** `SOFT-LAUNCH-REPO-TRUTH-RT4-C-MARKETING-CTA-TRUTHFULNESS-AUDIT`  
**Type:** Repo-truth audit (not implementation)  
**Rationale:**  

RT3-C audited the inquiry copy specifically. RT4-A audited legal pages. RT4-B audited the notification loop. If any public-facing CTAs, marketing pages, or promotional surfaces carry claims about platform behavior (supplier notification, inquiry handling, capabilities, timelines) that are inconsistent with what the system actually does, they represent the same class of risk as INQ-COPY-02.

If Paresh has a marketing website or promotional collateral that references inquiry handling, supplier notifications, or platform capabilities, a RT4-C audit would confirm whether these claims are consistent with repo truth before soft-launch outreach begins.

**This packet is only warranted if marketing copy / CTA pages exist beyond what is already covered by RT3-C.** If all public-facing copy is already covered by RT3-C (inquiry page only), RT4-C may be skipped in favor of the priority synthesis.

### Option B — RT4-C priority synthesis and implementation-order recommendation

**Proposed unit ID:** `SOFT-LAUNCH-REPO-TRUTH-RT4-C-PRIORITY-SYNTHESIS`  
**Type:** Synthesis and recommendation (not implementation, not audit)  
**Rationale:**

After RT3-C, RT3-D, RT4-A, and RT4-B, sufficient repo-truth investigation has been completed to support a final prioritized implementation-order recommendation to Paresh. RT4-C would consolidate findings across all four audit units and produce a definitive implementation queue:

1. Inquiry copy fix (immediate; no gate)
2. SMTP provisioning (Paresh ops; gates FTR-B2C-004 delivery)
3. FTR-B2C-004 code implementation (can start while SMTP is being provisioned)
4. PRIT-034 (pending legal content decisions)
5. Demo-labeling (conditional on seeding timeline)

**Recommendation:** If no marketing/CTA surfaces exist outside the inquiry page and the public directory, proceed directly to **Option B (RT4-C priority synthesis)**. If marketing copy with platform claims exists, audit it first (Option A), then synthesize.

---

## §14 Explicit No-Authorization Statement

This unit authorizes **no implementation work of any kind**.

The following actions are explicitly **not authorized** by this audit:

- Implementing notification dispatch in `public.ts` or any route file
- Adding `sendBuyerInquiryNotificationEmail` wrapper to `email.service.ts`
- Adding `ADMIN_NOTIFICATION_EMAIL` to `config/index.ts`
- Adding any email import to `public.ts`
- Modifying `supplierNotificationBoundary.service.ts` or creating new notification services
- Querying `Membership` or `User` tables from the inquiry route
- Configuring SMTP (Vercel env vars or any environment)
- Selecting or contracting an SMTP provider
- Sending test emails
- Fixing INQ-COPY-02 or INQ-COPY-24
- Implementing legal pages (PRIT-034)
- Implementing demo labeling
- Modifying any Prisma schema, migration, or RLS policy
- Adding a `Notification` model to the Prisma schema
- Modifying any `.env` or environment config file
- Running SQL, scripts, or test suites
- Opening RT4-C audit or synthesis packet
- Updating TLRH indexes
- Updating launch-readiness hub docs
- Updating governance source registers
- Modifying Layer 0 docs
- Committing any file other than this governance unit

If Paresh wishes to implement any of the above, a separate explicit prompt with an allowlist must be issued.

---

*End of RT4-B notification-loop readiness audit artifact.*
