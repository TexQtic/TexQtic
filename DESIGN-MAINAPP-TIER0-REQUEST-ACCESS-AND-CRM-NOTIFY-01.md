# DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01

---

## 1. Unit ID

**DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01**

---

## 2. Date

2026-06-06

---

## 3. Operator

Paresh Patel, Founder, TexQtic

---

## 4. Repo

`C:\Users\PARESH\TexQtic` (Main App only)

---

## 5. Branch

`main`

---

## 6. Starting HEAD

`42f0248c` — `docs(governance): lock acquisition source tagging contract`

Confirmed at unit start. No discrepancy.

---

## 7. Worktree Status

**CLEAN** at unit start. Only this design artifact is new/untracked at end.

---

## 8. Files Inspected

### Main App (`C:\Users\PARESH\TexQtic`)

| File | Purpose |
|---|---|
| `App.tsx` | Full routing state machine, AppState enum, `SUPPLIER_REQUEST_ACCESS_URL`, `/join/:code` pattern, `resolveInitialAppState()` |
| `FD-TEXQTIC-ONBOARDING-AUTH-001.md` | Founder policy — GSTIN gate, trust tiers (§§1–10) |
| `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01.md` | Main App authority — verdict, recommendation |
| `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md` | Source tagging contract — canonical enum, field contract |
| `server/src/config/index.ts` | Zod env schema, existing env var patterns, ACQUISITION_PROVISIONING_WEBHOOK_SECRET pattern |
| `server/src/routes/public.ts` | `supplier_profile.viewed.v1` event, `ALLOWED_SOURCE_CHANNELS`, inquiry submit endpoint pattern |
| `server/prisma/schema.prisma` | All models — confirmed NO Tier 0 / lead / acquisition model exists |
| `services/apiClient.ts` | `API_BASE_URL`, fetch helper, `get()`, `post()` patterns |
| `services/publicB2BService.ts` | `submitPublicInquiry` pattern — closest existing analog to Tier 0 submit |
| `components/Public/PublicReferralLanding.tsx` | `/join/:code` — PROHIBITED from data capture; shows PROHIBITED guard list |
| `components/Public/PublicInquiryPage.tsx` | 2-state form pattern (`FORM` → `SUCCESS`/`ERROR`) |
| `components/Public/B2CBrowse.tsx` | `https://texqtic.com/request-access` external link — current CTA |
| `components/Public/PublicB2CCategoryPage.tsx` | `https://texqtic.com/request-access` external link |
| `components/Public/PublicProductDetail.tsx` | `https://texqtic.com/request-access` external link |

### CRM (`C:\Users\PARESH\TexQtic-CRM`) — read-only

| File | Purpose |
|---|---|
| `api/webhooks/mainapp-tier0-captures.ts` | Full receiver implementation — auth, validation, idempotency, insert, ack contract |
| `DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01.md` | CRM receiver design — storage selection, payload, ack |
| `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md` | Mirror copy — confirms contract locked |

---

## 9. Prior Authority References

| Document | Location | Verdict / Key Point |
|---|---|---|
| `FD-TEXQTIC-ONBOARDING-AUTH-001.md` | Main App root | GSTIN gates transactional access, NOT entry. Tier 0 = Claimed Identity / Lite Access. |
| `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01.md` | Main App root | `DECISION_MAINAPP_ONBOARDING_REQUIRES_CRM_FLOW_DISCOVERY`. `MAINAPP_RECOMMENDS_DIRECT_WEB_REQUEST_ACCESS`. |
| `DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01.md` | CRM root (commit `74eeeac`) | `DECISION_CRM_FLOW_REQUIRES_NEW_MAINAPP_TO_CRM_NOTIFICATION_SEAM`. |
| `DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01.md` | CRM root (commit `b31e940`) | `CRM_RECEIVER_RECOMMENDS_REUSE_MARKETING_LEAD_SUBMISSIONS`. Storage locked. Ack contract locked. |
| `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01.md` | Main App root (commit `42f0248c`) | `GOV_SOURCE_TAGGING_CONTRACT_LOCKED`. 12 canonical values. 28 first-touch fields. |
| `IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01` | CRM (commit `64ba995`) | Endpoint live: `POST /api/webhooks/mainapp-tier0-captures`. Auth: `x-crm-mainapp-tier0-secret`. |

---

## 10. Route / Surface Recommendation

### 10.1 Route Decision Table

| Route Option | Pros | Cons | Launch Suitability | Decision |
|---|---|---|---|---|
| `/request-access` | Matches current external `texqtic.com/request-access` CTA path; generic (supplier + buyer + service_provider); consistent with brand positioning; easy CTA update; no role discrimination in URL | Slightly longer than `/join` | BEST FIT | **SELECTED** |
| `/get-started` | Clean, action-oriented | Ambiguous (could mean sign-in); conflicts with onboarding continuation | ACCEPTABLE | Not selected |
| `/join` | Short | Occupied by `/join/:referral_code` (PUBLIC_REFERRAL_LANDING state); cannot reuse without conflict | BLOCKED | Not selected |
| `/supplier/request-access` | Role-specific | Excludes buyer/service_provider; multiple routes to maintain | PARTIAL | Not selected |
| `/buyer/request-access` | Role-specific | Same issues; fragmented | PARTIAL | Not selected |

### 10.2 Recommended Route

**`/request-access`**

- New `AppState` value: **`PUBLIC_REQUEST_ACCESS`**
- Regex in `resolveInitialAppState()`:
  ```typescript
  if (
    globalThis.window.location.pathname === '/request-access' ||
    globalThis.window.location.pathname === '/request-access/'
  ) {
    return 'PUBLIC_REQUEST_ACCESS';
  }
  ```
- The existing `SUPPLIER_REQUEST_ACCESS_URL = 'https://texqtic.com/request-access'` and `openSupplierRequestAccess()` should later be changed to use `window.location.assign('/request-access')` (internal navigation). This change is deferred to the UI implementation unit.
- External `https://texqtic.com/request-access` links in `B2CBrowse.tsx`, `PublicB2CCategoryPage.tsx`, `PublicProductDetail.tsx` should later point to `https://app.texqtic.com/request-access`. Deferred to `UPDATE-MARKETING-WEBSITE-CTA-TO-MAINAPP-TIER0-01`.

### 10.3 Route Behavior Rules

| Rule | Design Decision |
|---|---|
| Authentication required? | NO — fully public, unauthenticated |
| Account created at Tier 0? | NO — capture/request record only |
| AppState conflict with `/join/:code`? | NO — regex-disjoint paths |
| Role-selecting or single route? | Single route with in-form role selector (roleIntent) |
| Source/channel from URL? | YES — `?source=`, `?utm_source=`, `?utm_medium=`, `?utm_campaign=`, `?ref=`, `?context=` captured at load |
| Confirmation page shown? | YES — success state within same component after CRM ack |
| CTA update on texqtic.com? | DEFERRED to `UPDATE-MARKETING-WEBSITE-CTA-TO-MAINAPP-TIER0-01` |
| Marketing website CTA to texqtic.com in Main App? | YES — deferred update: `openSupplierRequestAccess()` → internal `/request-access` |

---

## 11. Form Field Recommendation

### 11.1 Field Contract Table

| Field | Requirement Class | Source | Validation | Storage Target | CRM Payload Target | Notes |
|---|---|---|---|---|---|---|
| `roleIntent` | REQUIRED_FOR_LAUNCH | Form selector (user input) | `supplier` / `buyer` / `service_provider` / `unknown` | NOT stored locally at launch | `roleIntent` (required by CRM receiver) | Selector, not free text. Show at top of form. Defaults to `supplier` for marketing website entrants. |
| `name` | REQUIRED_FOR_LAUNCH | Form text field | Non-empty string, 1–200 chars, trimmed | NOT stored locally at launch | `name` (required by CRM receiver) | Full name or business contact name |
| `email` | REQUIRED_IF_AVAILABLE | Form text field | Email format (RFC-like), lowercase-normalized. At least email OR phone required. | NOT stored locally at launch | `email` (required if phone absent) | Primary dedup key in CRM. |
| `phone` | REQUIRED_IF_AVAILABLE | Form text field | Non-empty string, 7–20 chars, digits/spaces/hyphens. At least email OR phone required. | NOT stored locally at launch | `phone` (required if email absent) | Secondary contact |
| `companyName` | OPTIONAL | Form text field | String, 1–200 chars, trimmed | NOT stored locally at launch | `companyName` | Improves CRM qualification speed; surfaced as optional |
| `city` | OPTIONAL | Form text field | String, 1–100 chars | NOT stored locally at launch | `city` | Optional location signal |
| `state` | OPTIONAL | Form text field or dropdown | String, 1–100 chars | NOT stored locally at launch | `state` | Optional location signal |
| `productCategoryInterest` | OPTIONAL | Form selector or text | String, 1–100 chars | NOT stored locally at launch | `productCategoryInterest` | Textile category interest signal |
| `consentToContact` | OPTIONAL | Form checkbox | Boolean | NOT stored locally at launch | `consentToContact` | Compliance trace. Default null. |
| `notes` | OPTIONAL | Form text area | Max 200 chars; HTML stripped; email/phone patterns rejected | NOT stored locally at launch | `notes` (maps to CRM `notes` field) | Kept short to maintain low-friction; no PII allowed |
| `sourceChannel` | DERIVED — NOT in form | URL `?source=` param → normalized to canonical enum | Canonical enum (see §12.3) | NOT stored locally at launch | `sourceChannel` (required by CRM receiver) | Captured server-side from query param. User NEVER selects this. |
| `firstTouchTimestamp` | GENERATED — NOT in form | Frontend captures `new Date().toISOString()` at component mount | ISO 8601 UTC datetime string | NOT stored locally at launch | `firstTouchTimestamp` (required by CRM receiver) | Captured ONCE at mount, not at submit. Sent in form payload. |
| `utmSource` | DERIVED — NOT in form | URL `?utm_source=` param at load | String, max 200 chars or null | NOT stored locally at launch | `utmSource` | Captured at component mount |
| `utmMedium` | DERIVED — NOT in form | URL `?utm_medium=` param at load | String, max 200 chars or null | NOT stored locally at launch | `utmMedium` | |
| `utmCampaign` | DERIVED — NOT in form | URL `?utm_campaign=` param at load | String, max 200 chars or null | NOT stored locally at launch | `utmCampaign` | |
| `referralCode` | DERIVED — NOT in form | `?ref=` param OR `/join/:code` code captured from App context | Alphanumeric string, max 80 chars | NOT stored locally at launch | `referralCode` | Props-passable from PublicReferralLanding if referral converts to request-access |
| `landingPage` | DERIVED — NOT in form | `window.location.href` at component mount | URL string, max 500 chars | NOT stored locally at launch | `landingPage` | |
| `referrerUrl` | DERIVED — NOT in form | `document.referrer` at component mount | URL string, max 500 chars or empty | NOT stored locally at launch | `referrerUrl` | |
| `campaignId` | DERIVED — NOT in form | URL `?campaign=` or `?cid=` param at load | String, max 200 chars or null | NOT stored locally at launch | `campaignId` | Opaque CRM campaign ID |
| `acquisitionContext` | DERIVED — NOT in form | URL `?context=` param at load | String, max 200 chars or null | NOT stored locally at launch | `acquisitionContext` | Free-form context label |
| `gstin` | FORBIDDEN at Tier 0 | — | NEVER collected | NEVER stored | NEVER sent | Tier 1 gate only. GSTIN is a separate profile field, not a Tier 0 form field. |
| `udyam` | FORBIDDEN at Tier 0 | — | NEVER collected | NEVER stored | NEVER sent | Future policy (DECIDE-UDYAM-EDGE-CASE-TRUST-POLICY-001). Not Tier 0. |
| `inviteToken` | FORBIDDEN | — | Server REJECTS if present | NEVER | NEVER | Rejected at server validation layer before CRM call. |
| `mainAppSessionToken` | FORBIDDEN | — | Server REJECTS if present | NEVER | NEVER | Rejected at server validation layer before CRM call. |

### 11.2 Required / Optional Summary

```
REQUIRED_FOR_LAUNCH: roleIntent, name, (email OR phone)
OPTIONAL:            companyName, city, state, productCategoryInterest, consentToContact, notes
DERIVED (server):    sourceChannel, mainAppTier0RequestId
DERIVED (client):    firstTouchTimestamp, utmSource, utmMedium, utmCampaign, referralCode, landingPage, referrerUrl, campaignId, acquisitionContext
FORBIDDEN:           gstin, udyam, inviteToken, mainAppSessionToken
```

---

## 12. Source Metadata Capture Recommendation

### 12.1 Field Origin Summary

| Field | Generated By | Captured When | Immutable? |
|---|---|---|---|
| `mainAppTier0RequestId` | Main App SERVER — `crypto.randomUUID()` or `uuidv4()` | When server handles the POST | YES — generated once per request |
| `firstTouchTimestamp` | Main App FRONTEND — `new Date().toISOString()` | At `PublicRequestAccess` component mount (NOT at submit) | YES — captured once at mount, sent immutably in body |
| `sourceChannel` | Derived from URL params; normalized server-side | When server handles the POST | YES — derived from immutable URL params |
| `utmSource` / `utmMedium` / `utmCampaign` | Frontend from `URLSearchParams` at mount | At component mount | YES — captured at mount |
| `referralCode` | Frontend from `?ref=` param or App-level `publicReferralCodeFromPath` | At component mount or via props | YES — URL param at load |
| `landingPage` | Frontend — `window.location.href` | At component mount | YES |
| `referrerUrl` | Frontend — `document.referrer` | At component mount | YES |
| `campaignId` | Frontend from `?campaign=` or `?cid=` param | At component mount | YES |
| `acquisitionContext` | Frontend from `?context=` param | At component mount | YES |
| `roleIntent` | User selects from form | At form submit | Immutable after capture |

### 12.2 Source Channel Derivation Rule (Server)

```
URL param: ?source=<value>
├─ value is valid canonical enum → use value directly
├─ value is CRM legacy alias → map to canonical (see §12.4)
├─ value is absent/unknown → default to WEB
└─ value is UNKNOWN → pass as UNKNOWN (valid fallback)

If request is known to have originated from a direct invite token flow:
→ override with DIRECT_INVITE (set by App context, passed as separate form field `sourceHint`)
```

### 12.3 Source Channel Canonical Values Accepted by Main App Route

Wave 1 Required: `WEB`, `DIRECT_INVITE`, `UNKNOWN`
Wave 1 Optional: `CRM_CAMPAIGN`, `REFERRAL`
Default (missing/unknown): `WEB`

### 12.4 Source Channel Alias Map (Server-Side Normalization)

| URL Param Value | Canonical Mapped Value |
|---|---|
| `web` | `WEB` |
| `organic` | `WEB` |
| `direct` | `DIRECT_INVITE` |
| `invite` | `DIRECT_INVITE` |
| `referral` | `REFERRAL` |
| `qr` | `REFERRAL` |
| `qr_card` | `REFERRAL` |
| `campaign` | `CRM_CAMPAIGN` |
| `inbound` | `CRM_CAMPAIGN` |
| `camp` | `CRM_CAMPAIGN` |
| `unknown` | `UNKNOWN` |
| (missing/unrecognized) | `WEB` (default) |

### 12.5 Source Channel Must NOT Gate Access

Source channel is acquisition attribution metadata only. It has NO effect on:
- GSTIN gate (governed by FD-TEXQTIC-ONBOARDING-AUTH-001)
- Trust tier eligibility
- Provisioning decisions
- CRM qualification outcome

---

## 13. Local Storage Recommendation

### 13.1 Options Evaluation

| Option | Pros | Cons | Schema Impact | Retry Support | Launch Fit | Decision |
|---|---|---|---|---|---|---|
| A — No local record; server-side relay (fire-and-relay) | No migration needed; fastest launch path; CRM is the record | No local canonical record; `crmReceiptId` lives only in browser session state; no retry on CRM failure without re-submit | NONE | NO — user must re-submit | LAUNCH_FIT | **SELECTED FOR LAUNCH** |
| B — Local Tier 0 capture table (new Prisma model `tier0_capture_requests`) | Full canonical ownership; retry-safe; `crmReceiptId` persisted; operational traceability | Requires schema migration + Prisma db pull + RLS policy design; blocks implementation until migration unit complete | NEW TABLE — requires migration | YES | POST_LAUNCH | Selected for deferred hardening |
| C — Reuse existing Tenant/Invite model | No new model | Conceptually wrong (no tenant exists at Tier 0); pollutes Invite model intent | NONE (conceptual misfit) | NO | NOT_FIT | Rejected |
| D — Store only EventLog/AuditLog | No schema change; some traceability | AuditLog not designed for first-touch identity storage; can't store `crmReceiptId` as first-class field | NONE | NO | PARTIAL | Deferred as audit trail addition |

### 13.2 Launch Recommendation: Option A — Server-Side Relay

**`MAINAPP_TIER0_RECOMMENDS_LOCAL_CAPTURE_THEN_CRM_NOTIFY`**

The "local capture" at launch = server receives, validates, and generates `mainAppTier0RequestId`; CRM is the persistent record. Full local table storage is deferred to `IMPLEMENT-MAINAPP-TIER0-STORAGE-FOUNDATION-01`.

**Launch flow:**
```
Browser submits form
→ POST /api/public/tier0/request-access (Main App server)
  → Server validates payload (zod)
  → Server generates mainAppTier0RequestId (UUID v4)
  → Server captures firstTouchTimestamp from payload (client-sent; validated as ISO 8601)
  → Server normalizes sourceChannel from URL context field in payload
  → Server calls CRM: POST /api/webhooks/mainapp-tier0-captures
  → CRM returns 201 { crmReceiptId, intakeStatus: RECEIVED }
  → Main App server returns 201 { requestId: mainAppTier0RequestId, crmReceiptId, status: RECEIVED }
← Browser receives ack, displays confirmation
```

**Deferred hardening (post-launch):**
- `IMPLEMENT-MAINAPP-TIER0-STORAGE-FOUNDATION-01`: Creates `tier0_capture_requests` table; stores all canonical fields locally; enables async retry on CRM failure; stores `crmReceiptId` persistently; enables dedup across sessions.

### 13.3 Source Contract Alignment

The source contract (GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01 §13.1) requires Main App to store:
`mainAppTier0RequestId`, `sourceChannel`, `firstTouchTimestamp`, `roleIntent`, `crmReceiptId`

**At launch:** These are generated/validated by Main App server and appear in:
- Main App server response (short-lived; shown in confirmation to user)
- CRM `marketing.lead_submissions.raw_payload` (CRM stores what Main App sent)

**Post-launch (after IMPLEMENT-MAINAPP-TIER0-STORAGE-FOUNDATION-01):** Stored in local `tier0_capture_requests` table with full canonical ownership.

---

## 14. CRM Notify Client Recommendation

### 14.1 CRM Notify Contract Table

| Item | Design Decision | Source Authority | Launch Required? | Notes |
|---|---|---|---|---|
| Endpoint | `POST /api/webhooks/mainapp-tier0-captures` | CRM receiver implementation (commit `64ba995`) | YES | CRM base URL resolved from env |
| CRM base URL env var | `CRM_MAINAPP_TIER0_BASE_URL` | This design unit | YES | Separate from any other external CRM URL var. Validated at server boot: must be a valid URL. |
| Auth header name | `x-crm-mainapp-tier0-secret` | CRM receiver: `SOURCE_CHANNEL_HEADER = "x-crm-mainapp-tier0-secret"` | YES | Exact header name must match |
| Auth secret env var (Main App) | `CRM_MAINAPP_TIER0_INGESTION_SECRET` | CRM receiver: `MAINAPP_TIER0_SECRET_ENV_VAR = "CRM_MAINAPP_TIER0_INGESTION_SECRET"` | YES | Same variable name as CRM — both sides read this value. Shared secret. Must be ≥ 32 chars. Validated at server boot. |
| Content-Type | `application/json` | CRM receiver: `isJsonRequest()` check | YES | |
| Timeout | 8 seconds | This design unit | YES | Avoids blocking browser indefinitely; consistent with AI inference timeout pattern in codebase |
| Required payload fields | `mainAppTier0RequestId`, `roleIntent`, `name`, `sourceChannel`, `firstTouchTimestamp`, at least one of `email`/`phone` | CRM receiver: `validateAndNormalizePayload()` | YES | |
| Forbidden fields | `inviteToken`, `mainAppSessionToken`, `sessionToken`, `authToken`, `accessToken`, `refreshToken`, `idToken`, `invitePrivateUrl` | CRM receiver: `FORBIDDEN_TOP_LEVEL_FIELDS` | YES | Enforced by CRM receiver; also enforced at Main App server before calling CRM |
| Optional fields | `companyName`, `city`, `state`, `utmSource`, `utmMedium`, `utmCampaign`, `landingPage`, `referrerUrl`, `campaignId`, `referralCode`, `productCategoryInterest`, `acquisitionContext`, `notes`, `consentToContact` | Source contract §11 | OPTIONAL | Send all available |
| 201 RECEIVED response | `{ success: true, crmReceiptId, intakeStatus: "RECEIVED", retryable: false }` | CRM receiver | YES | Main App returns to browser: `{ requestId, crmReceiptId, status: "RECEIVED" }` |
| 200 DUPLICATE response | `{ success: true, crmReceiptId, intakeStatus: "DUPLICATE" }` | CRM receiver | YES | Main App treats as success — show confirmation |
| 409 DUPLICATE_CONFLICT | `{ success: false, errorCode: "DUPLICATE_CONFLICT", retryable: false }` | CRM receiver | YES | Log as server-side warning. Return 409 to browser: "We encountered a conflict. Please try again." |
| 400 INVALID_PAYLOAD | `{ success: false, errorCode: "INVALID_PAYLOAD" }` | CRM receiver | YES | Log as server-side ERROR (indicates Main App sent bad payload — config/code bug). Return 500 to browser. |
| 401 UNAUTHORIZED | `{ success: false, errorCode: "UNAUTHORIZED" }` | CRM receiver | YES | Log as CRITICAL (secret mismatch — env config bug). Return 503 to browser: "Service temporarily unavailable." |
| 5xx retryable | `{ retryable: true }` | CRM receiver | YES | Log. Return 503 to browser. No auto-retry at launch — user can re-submit. |
| Network timeout / no response | CRM call throws after 8s | This design unit | YES | Return 503 to browser with same message as 5xx. |

### 14.2 Env Var Design

Two new env vars required in Main App server:

| Env Var | Type | Validation | Purpose |
|---|---|---|---|
| `CRM_MAINAPP_TIER0_BASE_URL` | `string` (URL) | `z.string().url()` — optional at server boot (soft validation: warn + degrade gracefully if absent); required if Tier 0 route receives any requests | CRM base URL for notify call. Example: `https://crm.texqtic.com` |
| `CRM_MAINAPP_TIER0_INGESTION_SECRET` | `string` | `z.string().min(32)` — optional at server boot; required if Tier 0 route receives any requests | Shared secret — must match CRM `CRM_MAINAPP_TIER0_INGESTION_SECRET` exactly |

**Pattern precedent:** `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` in `config/index.ts` uses `.optional()` in the zod schema. The same pattern applies here — optional at schema level, validated in the route handler.

### 14.3 Notify Client Implementation Pattern

```typescript
// Pseudocode — implementation by IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-API-01
async function notifyCrmTier0Capture(payload: Tier0CrmPayload): Promise<CrmAckResult> {
  const crmBaseUrl = config.CRM_MAINAPP_TIER0_BASE_URL;
  const crmSecret = config.CRM_MAINAPP_TIER0_INGESTION_SECRET;
  if (!crmBaseUrl || !crmSecret) {
    throw new Error('[tier0-notify] CRM env not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${crmBaseUrl}/api/webhooks/mainapp-tier0-captures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-crm-mainapp-tier0-secret': crmSecret,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const ack = await response.json();
    return { status: response.status, ack };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
```

---

## 15. Idempotency Design

| Concern | Design Decision |
|---|---|
| Who generates `mainAppTier0RequestId`? | Main App SERVER — generated by `crypto.randomUUID()` when the POST is received |
| When is it generated? | Once, when the server handler runs. Not generated by browser (avoids client-side UUID injection). |
| Is it stable across retries? | NO at launch — each new form submit creates a new `mainAppTier0RequestId`. This is intentional: at launch, re-submits are treated as new captures (CRM identity dedup still catches duplicates). |
| CRM duplicate handling? | CRM deduplicates by `mainAppTier0RequestId` in `raw_payload`. If Main App retries the same CRM call with the same ID, CRM returns 200 DUPLICATE. |
| Browser double-submit? | Prevented by disabling submit button during in-flight request (`submitting` state in React). |
| Browser refresh? | No local storage of `mainAppTier0RequestId` at launch — refresh creates new request. CRM deduplication on identity tuple (email+phone+roleIntent) prevents true duplicate CRM records. |
| Post-launch dedup strategy? | `IMPLEMENT-MAINAPP-TIER0-STORAGE-FOUNDATION-01` adds local `tier0_capture_requests` table with unique constraint on `mainAppTier0RequestId`. Stable idempotency across sessions. |
| `firstTouchTimestamp` immutability? | Generated by frontend at component mount (`useRef` or `useMemo` with empty deps). Not recaptured at submit. |

---

## 16. UX / Conversion Recommendation

### 16.1 Form Structure

**Single-page form with 2 visual sections:**

1. **Role selector** (Step 1, shown first):
   - "I am a..." → Supplier / Buyer / Service Provider
   - Visual cards, not dropdowns
   - Selected role auto-populates `roleIntent`

2. **Contact & details** (Step 2, shown after role select OR simultaneously on wider screens):
   - `name` (required)
   - `email` (required if no phone)
   - `phone` (required if no email; shown below email)
   - `companyName` (optional, labelled "Company or business name (optional)")
   - `city`, `state` (optional, collapsible or shown inline)
   - `productCategoryInterest` (optional selector for suppliers, optional for buyers)
   - `consentToContact` checkbox (optional, "I'm happy to be contacted by the TexQtic team")
   - `notes` (optional text area, max 200 chars, labelled "Anything you'd like us to know?")
   - Submit CTA: "Request Access" or "Get Started"

### 16.2 Confirmation State

After 201 RECEIVED or 200 DUPLICATE:
```
Title: "You're on the list"
Body:  "We've received your request. Our team will review your details and be in touch shortly."
Sub:   "Reference: [mainAppTier0RequestId first 8 chars]" (optional, helps support)
CTA:   "Browse the B2B Network →" (links to /b2b)
```

Do NOT say "CRM" in user-facing copy. Do NOT say "qualification." Just "our team will be in touch."

### 16.3 UX Rules

| Rule | Decision |
|---|---|
| How many steps? | Single page (all fields visible, role selector prominent at top) |
| Email verification at Tier 0? | NO — low-friction; email validity checked by format only |
| GSTIN at Tier 0? | NO — explicitly forbidden |
| Account access on submit? | NO — confirmation only; no account created |
| Different copy for supplier vs buyer? | YES — role-specific headline/subheading in the form header; same fields otherwise |
| Different copy for service_provider? | YES — "Join as a service provider" heading |
| What does user see while submitting? | Spinner on submit button, disabled state |
| What if CRM is down? | "Something went wrong. Please try again in a moment." + retry button |
| Referral code passthrough? | YES — if arriving from `/join/:code`, `referralCode` is pre-filled (hidden) |

---

## 17. Role Support Recommendation

### 17.1 Role Support Table

| roleIntent | Tier 0 Accepted? | Downstream Provisioning Ready? | Launch Behavior | Notes |
|---|---|---|---|---|
| `supplier` | YES | YES — CRM qualification flow exists | Full Tier 0 capture; CRM triages for provisioning | Priority role for soft launch |
| `buyer` | YES | PARTIAL — CRM can qualify, Main App provisioning partial | Captured; CRM follows up; provisioning path exists but not fully launch-ready | Acceptable at Tier 0; CRM decides provisioning timing |
| `service_provider` | YES | NO — no dedicated CRM/Main App provisioning path yet | Captured as "interest only" — `roleIntent: service_provider` visible to CRM for manual triage | Do not block submission; just inform CRM operator review needed |
| `unknown` | YES (fallback) | NO | Captured; CRM follows up manually | For users who don't know their role or skip selection |

### 17.2 Role-Specific CTA Copy

| roleIntent | Form Headline | Submit CTA |
|---|---|---|
| `supplier` | "List your business on TexQtic" | "Request Supplier Access" |
| `buyer` | "Find verified textile partners" | "Request Buyer Access" |
| `service_provider` | "Join as a service provider" | "Request Service Provider Access" |
| (not yet selected) | "Join TexQtic" | "Request Access" |

---

## 18. GSTIN / Trust-Tier Alignment

| Principle | Design Confirmation |
|---|---|
| GSTIN gates transactional access, not Tier 0 entry | CONFIRMED — GSTIN NOT collected, NOT asked, NOT processed at Tier 0 form |
| Tier 0 users cannot list, order, pay, contract, or use TTP | CONFIRMED — Tier 0 capture grants nothing; user gets only a confirmation |
| CRM qualification does NOT override GSTIN validation | CONFIRMED — CRM provisioning + invite → Main App activate → still requires GSTIN submission at Tier 1 |
| Udyam-only rule cannot bypass GSTIN | CONFIRMED — Udyam NOT collected at Tier 0; Udyam exception policy is a separate unit |
| Source channel does not affect GSTIN requirement | CONFIRMED — sourceChannel is attribution metadata only; no access gate effect |
| Tier 0 confirmation page must NOT imply transactional access | CONFIRMED — copy is "we'll be in touch"; no "access granted" language |
| Existing `VERIFICATION_BLOCKED_VIEWS` gates unaffected | CONFIRMED — Tier 0 route is entirely pre-auth; it has no interaction with tenant workspace gates |

---

## 19. Error Handling Design

### 19.1 Failure Handling Table

| Scenario | User-Visible Behavior | Internal Behavior | Retry Behavior | Logging / Audit |
|---|---|---|---|---|
| Invalid form input (empty required field) | Inline field error message | Client-side validation, no API call | Re-submit after correction | None |
| Email format invalid | "Please enter a valid email address" | Client-side validation | Re-submit after correction | None |
| Neither email nor phone provided | "Please provide email or phone" | Client-side validation | Re-submit | None |
| Unsupported / unknown `sourceChannel` from URL param | No user-visible error — silently normalized to `WEB` by server | Server normalizes | N/A | Server logs normalization at DEBUG level |
| CRM receiver returns 201 RECEIVED | "You're on the list" confirmation | Store `crmReceiptId` in response, return 201 to browser | None (success) | Server logs intake at INFO |
| CRM receiver returns 200 DUPLICATE | "You're on the list" confirmation (identical) | Treat as success | None | Server logs at INFO: duplicate, crmReceiptId echoed |
| CRM receiver returns 409 DUPLICATE_CONFLICT | "We encountered a conflict. Please try again in a moment." | Main App returns 409 | User can re-submit | Server logs WARN: idempotency conflict |
| CRM receiver returns 400 INVALID_PAYLOAD | "Something went wrong. Please contact support." | Log as ERROR — indicates Main App sent invalid payload (code/config bug) | Do NOT auto-retry — fix code | Server logs ERROR with sanitized payload summary |
| CRM receiver returns 401 UNAUTHORIZED | "Service temporarily unavailable." | Log as CRITICAL — secret mismatch, config error | Do NOT auto-retry | Server logs CRITICAL |
| CRM receiver returns 5xx / network timeout | "We're having trouble. Please try again in a moment." with retry button | Log as WARN, return 503 to browser | User-initiated retry by clicking retry button | Server logs WARN with CRM response status |
| Main App env not configured (no CRM URL/secret) | "Service temporarily unavailable." | Return 503 immediately without calling CRM | None | Server logs ERROR: CRM env not configured |
| Payload size exceeds limit | "Submission too large. Please shorten your message." | Server returns 400 | User shortens notes and re-submits | Server logs at DEBUG |
| Forbidden field in payload (inviteToken etc.) | "Invalid submission." | Server returns 400, does not call CRM | None | Server logs WARN: forbidden field detected |
| Honeypot triggered | No error shown (silently fail) | Server returns 200 with fake confirmation | None | Server logs WARN: bot-trap triggered |
| Rate limit exceeded | "Too many requests. Please wait before trying again." | Server returns 429 | Enforced by rate-limit window | Server logs at INFO |

---

## 20. Security / Abuse Controls

| Control | Design Decision |
|---|---|
| Rate limiting | Max 5 requests per IP per 15 minutes on `POST /api/public/tier0/request-access`. Tighter than inquiry (20/15 min) because this is an identity capture endpoint. Uses `@fastify/rate-limit` same as existing routes. |
| Input validation | Zod schema on server — all fields validated before any processing or CRM call |
| Payload size limit | Max 8 KB body size on route. Server returns 400 if exceeded. |
| PII in notes field | Server strips HTML tags. Server REJECTS if notes contains email-pattern or phone-pattern (matches inquiry endpoint pattern). Max 200 chars. |
| Honeypot field | Hidden form field `h_trap` must be empty (`display: none` in CSS; `aria-hidden: true`). If non-empty, server returns 200 with fake confirmation but does NOT call CRM. |
| Source channel injection | sourceChannel is DERIVED — never accepted from user form input. URL param value is normalized to canonical enum server-side. Unknown values default to `WEB`. |
| Forbidden token fields | Server rejects any payload containing `inviteToken`, `mainAppSessionToken`, `sessionToken`, `authToken`, `accessToken`, `refreshToken`, `idToken`, `invitePrivateUrl` (mirrors CRM receiver forbidden list). |
| CSRF protection | Not required — public unauthenticated endpoint with no session cookie. No state mutation on user account. |
| CORS | Existing CORS config already covers `app.texqtic.com`. No change required. |
| Origin/referrer | `referrerUrl` captured and forwarded to CRM for analytics — NEVER used for access control. Stored as opaque string. |
| Email logging redaction | Email logged as `[redacted]`. `mainAppTier0RequestId` may appear in server logs (not a secret). `crmReceiptId` may appear in logs. |
| CRM secret protection | `CRM_MAINAPP_TIER0_INGESTION_SECRET` NEVER appears in logs, responses, or errors |
| `inviteToken` / `mainAppSessionToken` leakage | Rejected at server before CRM call. Never forwarded. Never logged. |
| Response safety | Server response to browser contains only: `requestId`, `crmReceiptId`, `status`. No internal error detail in production. |
| Content-Type | Server enforces `Content-Type: application/json` on request. |
| Public-safe route | Route is `PUBLIC_REQUEST_ACCESS` state — completely outside authenticated session. No auth headers needed or passed. |

---

## 21. Implementation Slicing

| Unit | Scope | Dependencies | Priority |
|---|---|---|---|
| `VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01` | Smoke-verify CRM endpoint is live at known URL; confirm shared secret is provisioned in both envs | CRM receiver commit `64ba995` | REQUIRED BEFORE Main App implementation of notify client |
| `IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-API-01` | Backend: Server route `POST /api/public/tier0/request-access`; zod validation; honeypot check; sourceChannel normalization; `mainAppTier0RequestId` generation; CRM notify client; ack relay; rate-limiting | CRM runtime verified; env vars provisioned | PRIMARY IMPLEMENTATION UNIT |
| `IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01` | Frontend: `PublicRequestAccess` component; AppState `PUBLIC_REQUEST_ACCESS`; route resolution in `resolveInitialAppState()`; form fields; metadata capture at mount; `firstTouchTimestamp`; UTM/referral capture; success/error states | API unit deployed | FRONTEND IMPLEMENTATION UNIT |
| `IMPLEMENT-MAINAPP-CRM-TIER0-NOTIFY-CLIENT-01` | Notify client only (if extracted from API unit for isolation) | API unit | OPTIONAL SEPARATION |
| `IMPLEMENT-MAINAPP-TIER0-STORAGE-FOUNDATION-01` | Schema design: `tier0_capture_requests` table; migration + RLS; Prisma db pull; generate; update API route to store locally before CRM call; store `crmReceiptId` after ack | API and UI live | POST-LAUNCH HARDENING |
| Integration test | `POST /api/public/tier0/request-access` happy path; forbidden fields; rate limit; CRM mock 201/200/409/401/5xx; honeypot | API unit | REQUIRED BEFORE PROD |
| Runtime smoke | Verify `/request-access` returns 200 HTML; verify `POST /api/public/tier0/request-access` is reachable; CRM ack round-trip | All units deployed | LAUNCH GATE |
| `UPDATE-MARKETING-WEBSITE-CTA-TO-MAINAPP-TIER0-01` | Change `https://texqtic.com/request-access` CTAs to `https://app.texqtic.com/request-access`; update `SUPPLIER_REQUEST_ACCESS_URL` in App.tsx to internal `/request-access` | UI deployed | POST-LAUNCH (coordinate with marketing website repo owner) |

---

## 22. Required Tables

See §10.1 (Route Decision Table), §11.1 (Field Contract Table), §13.1 (Storage Options Table), §14.1 (CRM Notify Contract Table), §19.1 (Failure Handling Table), §17.1 (Role Support Table), and §25 (Candidate Next Unit Classifications).

---

## 23. Design Recommendation

**`MAINAPP_TIER0_RECOMMENDS_LOCAL_CAPTURE_THEN_CRM_NOTIFY`**

At launch: server-side relay pattern — no local DB storage required. Main App server receives form, validates, generates `mainAppTier0RequestId`, calls CRM synchronously, returns ack. CRM is the persistent record at launch.

Post-launch: add local `tier0_capture_requests` table via `IMPLEMENT-MAINAPP-TIER0-STORAGE-FOUNDATION-01` for canonical local ownership, retry, and operational traceability.

This is the safest and fastest launch path — no schema migration required before first implementation unit.

---

## 24. Decision Verdict

**`DESIGN_MAINAPP_TIER0_READY_FOR_IMPLEMENTATION`**

All required design questions have been answered with sufficient evidence:
1. Route design: COMPLETE — `/request-access`, new `AppState` `PUBLIC_REQUEST_ACCESS`
2. Form field design: COMPLETE — required/optional/derived/forbidden fields classified
3. Source metadata capture: COMPLETE — generation origin, capture timing, and normalization rules defined
4. Local storage at launch: COMPLETE — relay pattern, no migration needed
5. CRM notify client contract: COMPLETE — endpoint, auth, payload, ack handling all locked by CRM receiver implementation
6. Idempotency: COMPLETE — `mainAppTier0RequestId` server-generated, CRM deduplicates
7. UX: COMPLETE — single page, role selector, confirmation state defined
8. Role support: COMPLETE — all four roles accepted at Tier 0
9. GSTIN/trust-tier: COMPLETE — no GSTIN at Tier 0, no access granted
10. Error handling: COMPLETE — all failure scenarios mapped
11. Security/abuse controls: COMPLETE — rate limit, honeypot, forbidden fields, PII protection

**Qualifier:** CRM receiver runtime must be verified before Main App implementation delivers a working end-to-end flow. `VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01` is the selected next unit.

---

## 25. Candidate Next Unit Classifications

| Candidate Unit | Classification | Rationale |
|---|---|---|
| `VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01` | **REQUIRED_BEFORE_IMPLEMENTATION** | CRM receiver is implemented (commit `64ba995`) but not runtime-verified. Main App notify client requires: (1) confirmed CRM base URL, (2) confirmed shared secret provisioned in both envs, (3) confirmed 201 response from live endpoint. Without this, Main App cannot configure `CRM_MAINAPP_TIER0_BASE_URL`. |
| `IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-API-01` | REQUIRED_AFTER_CRM_VERIFY | Primary implementation unit. Depends on verified CRM URL and shared secret. |
| `IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-UI-01` | REQUIRED_AFTER_MAINAPP_API | Frontend component. Depends on API route being deployed and testable. |
| `IMPLEMENT-MAINAPP-TIER0-STORAGE-FOUNDATION-01` | REQUIRED_AFTER_MAINAPP_API | Post-launch hardening. Adds local DB table. Requires separate schema migration unit. Not blocking launch. |
| `IMPLEMENT-MAINAPP-CRM-TIER0-NOTIFY-CLIENT-01` | HOLD | Can be folded into `IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-API-01`. Separate unit only if notify client is extracted as a standalone service. |
| `DESIGN-MAINAPP-TIER0-SOURCE-METADATA-STORAGE-01` | HOLD | This unit subsumes most of what that would cover. Only needed if local DB storage design requires deeper schema investigation. Currently: schema gap confirmed, model design deferred to IMPLEMENT unit. |
| `UPDATE-MARKETING-WEBSITE-CTA-TO-MAINAPP-TIER0-01` | REQUIRED_AFTER_MAINAPP_UI | Update `texqtic.com/request-access` → `app.texqtic.com/request-access`. Coordinate with marketing website repo. Not blocking for launch of app.texqtic.com route. |
| `DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01` | DEFERRED | CAE values reserved. Not blocking launch. |
| `DECIDE-TEXQTIC-ACQUISITION-OPERATING-MODEL-SYNTHESIS-01` | FUTURE_AUTOMATION | Full synthesis after all implementation waves complete. |

---

## 26. Selected Next Unit

**`VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01`**

### Selection Rationale

Per design priority rule #3: "If CRM receiver requires runtime verification before Main App implementation, select `VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01`."

The CRM receiver is implemented (commit `64ba995`). But Main App cannot implement the notify client without knowing:
1. The live CRM app URL (CRM is a separate Vercel project — its production URL must be confirmed)
2. That `CRM_MAINAPP_TIER0_INGESTION_SECRET` is provisioned in CRM Vercel env
3. That `CRM_MAINAPP_TIER0_INGESTION_SECRET` has been decided for Main App Vercel env
4. That the CRM receiver returns a live 201 when called with valid auth

`VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01` should:
- Confirm CRM Vercel project URL
- Run a safe OPTIONS/HEAD check or authenticated test call to confirm endpoint is live
- Confirm shared secret is provisioned (without exposing it)
- Record the confirmed CRM base URL as a known constant for Main App implementation
- This is a docs-only + runtime-verify unit (no code changes)

### Parallel Note

`IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-API-01` can begin drafting in parallel (server route + zod schema + CRM notify client pattern), with `CRM_MAINAPP_TIER0_BASE_URL` as a required env var that gets filled in after verification. Final deployment is gated on `VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01` completing.

---

## 27. Rationale

The Tier 0 request-access design is complete because:
1. The CRM receiver is implemented and its contract is locked — the Main App notify client has a fully known target
2. The source tagging contract is locked — all field classifications and canonical values are known
3. The inquiry endpoint pattern (`POST /api/public/inquiry/submit`) provides a proven codebase analog for the server route structure
4. The Prisma schema has no existing Tier 0 model — local storage is deferred by design (relay pattern works safely for launch)
5. Route conflict analysis shows `/request-access` is clean and consistent with existing external CTAs
6. CRM receiver implementation (commit `64ba995`) confirms exact auth header name, payload contract, and response shapes

The only gap is CRM runtime — the live URL of the CRM Vercel deployment is not confirmed in this unit. This is not a design gap but an operational prerequisite for implementation.

---

## 28. Safety Confirmations

| Safety Rule | Status |
|---|---|
| No runtime source code edited — Main App | CONFIRMED |
| No tests edited | CONFIRMED |
| No schema changed | CONFIRMED |
| No migrations run | CONFIRMED |
| No env vars modified | CONFIRMED |
| No production API calls made | CONFIRMED |
| No CRM repo modified | CONFIRMED |
| No CAE repo modified | CONFIRMED |
| No Marketing Website repo modified | CONFIRMED |
| No emails sent | CONFIRMED |
| No invites sent | CONFIRMED |
| No provisioning triggered | CONFIRMED |
| No provider settings changed | CONFIRMED |
| No secrets exposed | CONFIRMED |
| Worktree clean at start and end | CONFIRMED — only this design artifact is new |

---

## 29. Recommended Next Prompt / Unit

**Primary:**
```
VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01
```

*Scope:*
- Confirm live CRM Vercel project URL (or admin.texqtic.com equivalent)
- Confirm `CRM_MAINAPP_TIER0_INGESTION_SECRET` is provisioned in CRM Vercel env (without exposing value)
- Run safe OPTIONS or authenticated test call to `POST /api/webhooks/mainapp-tier0-captures`
- Record confirmed CRM base URL for Main App implementation
- Docs-only unit — no code changes in either repo

**After verification:**
```
IMPLEMENT-MAINAPP-TIER0-REQUEST-ACCESS-API-01
```

*Allowlist:*
- `server/src/routes/public.ts` — add `POST /api/public/tier0/request-access` route
- `server/src/config/index.ts` — add `CRM_MAINAPP_TIER0_BASE_URL` and `CRM_MAINAPP_TIER0_INGESTION_SECRET` to env schema (both optional/soft-required)
- Optionally: `server/src/services/crmNotifyClient.ts` — new CRM notify client (if extracted from route)

*Implementation must:*
- Generate `mainAppTier0RequestId` server-side (not client)
- Validate payload with zod (all rules from §11.1 and §20)
- Normalize `sourceChannel` from `?source=` param (alias map from §12.4)
- Reject forbidden fields before CRM call
- Check honeypot field
- Call CRM with `x-crm-mainapp-tier0-secret` header
- Handle all CRM ack statuses per §14.1
- Rate limit: max 5 / IP / 15 min
- Return `{ requestId, crmReceiptId, status }` on success
- NEVER log or return CRM secret or invite/session tokens
- NEVER call CRM if env is not configured

---

*Unit: DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01*
*Date: 2026-06-06 | Version: v1.0*
*Repo: C:\Users\PARESH\TexQtic | Branch: main | Starting HEAD: 42f0248c*
*Verdict: DESIGN_MAINAPP_TIER0_READY_FOR_IMPLEMENTATION*
*Design Recommendation: MAINAPP_TIER0_RECOMMENDS_LOCAL_CAPTURE_THEN_CRM_NOTIFY*
*Selected Next Unit: VERIFY-CRM-MAINAPP-TIER0-RECEIVER-RUNTIME-01*
*Authority: Paresh Patel, Founder, TexQtic | Authored by: GitHub Copilot governance sync agent*
