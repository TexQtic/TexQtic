# GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01

---

## 1. Unit ID

**GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01**

---

## 2. Date

2026-06-06

---

## 3. Version

**v1.0 — LOCKED**

---

## 4. Canonical / Mirror Status

**CANONICAL — this is the authoritative copy.**

The CRM repo (`C:\Users\PARESH\TexQtic-CRM`) holds an identical mirror copy. The mirror copy is a reference only and has no authority to override or supersede this document.

---

## 5. Repos Inspected

**Main App:** `C:\Users\PARESH\TexQtic` — branch `main`, HEAD `0949f7df`

**CRM:** `C:\Users\PARESH\TexQtic-CRM` — branch `main`, HEAD `b31e940`

*CAE repo not inspected in this unit — CAE-specific values are reserved/provisional pending `DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01`.*

---

## 6. Starting HEADs

| Repo | Branch | HEAD at Start |
|---|---|---|
| Main App (`C:\Users\PARESH\TexQtic`) | main | `0949f7df` |
| CRM (`C:\Users\PARESH\TexQtic-CRM`) | main | `b31e940` |

---

## 7. Authority References

| Document | Location | Type |
|---|---|---|
| FD-TEXQTIC-ONBOARDING-AUTH-001.md | Main App root | Founder Policy — GSTIN gate, trust tiers, canonical ownership |
| DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01.md | Main App root | Main App authority — verdict and recommendations |
| DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01.md | CRM root | CRM authority — verdict and recommendations |
| DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01.md | CRM root | CRM receiver design — payload, storage, ack contract |

---

## 8. Purpose

Lock the shared acquisition source/channel tagging taxonomy and first-touch field contract across Main App, CRM, and future CAE inputs, so that:

1. Main App Tier 0 capture surface (DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01) uses canonical source values
2. Main App → CRM Tier 0 notification uses a shared payload field contract
3. CRM receiver implementation (IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01) can proceed against locked source mapping
4. CRM existing acquisition intake (marketing.lead_submissions, crm.acquisition_submissions) maps cleanly to canonical values
5. Future CAE field-agent attribution uses reserved canonical values
6. Campaign/referral/association/partner analytics use consistent cross-system values

**This unit does NOT implement code.** No runtime source, schema, migrations, env vars, or deployment were changed.

---

## 9. Evidence Summary: Existing Source/Channel Values Found

### Main App (server/src/routes/public.ts — `supplier_profile.viewed.v1` event)

```typescript
ALLOWED_SOURCE_CHANNELS = ['organic', 'qr', 'referral', 'event', 'direct']
```

Captured from `?source=` query param on `/supplier/:slug` route at view time only. NOT stored at account/tenant level.

### CRM — crm.acquisition_submissions (supabase/migrations/20260419_crm_acquisition_submissions.sql)

```sql
source_channel TEXT NOT NULL CHECK (source_channel IN (
  'referral', 'camp', 'whatsapp', 'qr_card', 'inbound', 'partner'
))
```

Required field. Hard-enforced CHECK constraint.

### CRM — api/acquisition/submissions.ts SOURCE_CHANNEL_ALLOWLIST

```typescript
const SOURCE_CHANNEL_ALLOWLIST = new Set([
  "referral", "camp", "whatsapp", "qr_card", "inbound", "partner",
]);
```

### CRM — api/admin-bridge/acquisition/submissions/[id]/entity-create-execute.ts SOURCE_CHANNEL_MAP

```typescript
const SOURCE_CHANNEL_MAP: Record<string, string> = {
  referral:  "referral",
  whatsapp:  "whatsapp",
  inbound:   "inbound",
  partner:   "partner",
  qr_card:   "qr_card",
};
```

Note: `camp` is NOT in SOURCE_CHANNEL_MAP — maps to nothing in entity-create (legacy gap).

### CRM — marketing.lead_submissions (api/webhooks/lead-submissions.ts)

```typescript
source_channel: p.source_channel || "Website Form",
```

No CHECK constraint on marketing.lead_submissions.source_channel — accepts any TEXT value. Default: `"Website Form"`.

### CRM — UTM/Campaign fields on marketing.lead_submissions

Columns: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `referrer_url`, `landing_url`
All TEXT NULLABLE. No normalization currently.

### CRM — Field agent fields on crm.acquisition_submissions

Columns: `field_agent_uid` (UUID, nullable), `field_agent_uid_raw` (TEXT, required)

---

## 10. Canonical Source Enum

### 10.1 Locked Canonical Source Values

| Canonical Value | Meaning | Examples | Tier 0? | Invite/Prov? | Launch Status | Owning/Primary Source |
|---|---|---|---|---|---|---|
| `WEB` | Organic web or direct web form entry from texqtic.com or app.texqtic.com | Marketing request-access form, direct URL, Google organic, landing page | YES | NO — leads to CRM qualification first | WAVE_1_LAUNCH | Main App / Marketing Website |
| `CRM_CAMPAIGN` | CRM-originated outreach campaign link or push campaign | Email drip campaign link, CRM-generated invitation URL, sales outreach | YES | YES — campaign link can carry invite | WAVE_1_LAUNCH | CRM |
| `DIRECT_INVITE` | Admin or operator-issued direct platform invite link | Super-admin manual invite, direct invite token issued without prior campaign | YES | YES — invite is the mechanism | WAVE_1_LAUNCH | Main App (invite token owner) |
| `REFERRAL` | Peer referral, referral code, QR card scan, physical referral link | `/join/:referral_code`, QR code at factory/office, WhatsApp forwarded link | YES | NO — leads to Tier 0 then CRM | WAVE_1_LAUNCH | Main App (referral surface) |
| `WHATSAPP` | WhatsApp channel-originated capture (message campaign, group link) | WhatsApp broadcast, group link, WhatsApp catalog | YES | NO — leads to Tier 0 then CRM | WAVE_1_OPTIONAL | Main App / CRM |
| `SOCIAL` | Social media channel (LinkedIn, Instagram, Facebook, Twitter/X, YouTube) | LinkedIn post, Instagram bio link, Facebook ad | YES | NO | WAVE_2 | Marketing Website / CRM |
| `ASSOCIATION` | Industry or trade association referral or member outreach | SIMA, CITI, AEPC, trade body member referral | YES | NO | WAVE_2 | CRM / CAE |
| `OFFLINE_EVENT` | Physical trade show, exhibition, industry cluster event | Bharat Tex, India ITME, cluster visit, supplier day event | YES | NO | WAVE_2 | CRM / CAE (deferred) |
| `PARTNER` | Strategic commercial, integration, or distribution partner referral | Tech partner, logistics partner, platform integration referral | YES | YES — partner may generate invites | WAVE_2 | CRM |
| `MANUAL` | Operator-entered manual CRM lead, no digital attribution origin | RM-sourced lead entered in CRM, phone intake, walk-in | YES | NO | WAVE_2 | CRM |
| `CAE_FIELD_AGENT` | Field agent / Acquisition Engine originated capture (offline-first) | CAE field rep visit, field QR assignment, offline form | YES | NO — routes through CRM first | DEFERRED | CAE (reserved) |
| `UNKNOWN` | Missing, unmapped, or invalid source at intake | Legacy records, missing param, malformed value | YES (fallback) | YES (fallback) | ALWAYS_AVAILABLE | Any system |

### 10.2 Per-Value Supplementary Detail

| Canonical Value | CRM Mapping | Main App Mapping | CAE Future Mapping | Allowed at Tier 0? | Allowed at Provisioning? |
|---|---|---|---|---|---|
| `WEB` | `Website Form` (marketing.lead_submissions default) | `organic` (viewed event) / `WEB` (Tier 0 capture) | N/A | YES | NO (indirect via CRM qualification) |
| `CRM_CAMPAIGN` | `inbound` or `camp` (crm.acquisition_submissions) | not yet implemented | N/A | YES | YES (campaign link may carry invite) |
| `DIRECT_INVITE` | `inbound` (fallback) | `direct` (viewed event) / `DIRECT_INVITE` (Tier 0) | N/A | YES | YES (is the invite) |
| `REFERRAL` | `referral` or `qr_card` | `referral`, `qr` (viewed event) / `REFERRAL` (Tier 0) | PROVISIONAL | YES | NO |
| `WHATSAPP` | `whatsapp` | `WHATSAPP` (future Tier 0) | PROVISIONAL | YES | NO |
| `SOCIAL` | `inbound` (partial) | `SOCIAL` (future Tier 0) | N/A | YES | NO |
| `ASSOCIATION` | `partner` (partial) | not yet implemented | PROVISIONAL | YES | NO |
| `OFFLINE_EVENT` | `inbound` (partial) | `event` (viewed event) | PROVISIONAL | YES | NO |
| `PARTNER` | `partner` | not yet implemented | PROVISIONAL | YES | YES (partner may generate invites) |
| `MANUAL` | `inbound` (partial) | not yet implemented | N/A | YES | NO |
| `CAE_FIELD_AGENT` | `partner` (provisional) | not yet implemented | RESERVED | YES | NO |
| `UNKNOWN` | `inbound` / unmapped | unmapped / missing | UNKNOWN | YES | YES (fallback) |

---

## 11. First-Touch Field Contract

| Canonical Field | Requirement Class | Type | Owner / Canonical Location | CRM Storage | Main App Storage | Notes |
|---|---|---|---|---|---|---|
| `sourceChannel` | REQUIRED_FOR_TIER0 | enum (see §10) | SHARED — Main App sets at capture, CRM receives | `marketing.lead_submissions.source_channel` (mapped) | Tier 0 capture record (MISSING — required by implementation unit) | Must map to canonical value; unmapped → `UNKNOWN` |
| `firstTouchTimestamp` | REQUIRED_FOR_TIER0 | ISO 8601 datetime | MAIN_APP_CANONICAL | `marketing.lead_submissions.submitted_at` | Tier 0 capture record | Never overwrite with later touches |
| `roleIntent` | REQUIRED_FOR_TIER0 | `supplier` / `buyer` / `service_provider` / `unknown` | MAIN_APP_CANONICAL | `raw_payload.roleIntent` | Tier 0 capture record | Always required at capture; CRM uses for triage |
| `mainAppTier0RequestId` | REQUIRED_FOR_TIER0 | UUID string | MAIN_APP_CANONICAL | `raw_payload.mainAppTier0RequestId` | Tier 0 capture record | Primary idempotency key for Main App → CRM notification |
| `name` | REQUIRED_IF_AVAILABLE | string | SHARED_REFERENCE | `marketing.lead_submissions.full_name` | Tier 0 capture form field | At least one of email or phone also required |
| `email` | REQUIRED_IF_AVAILABLE | string (email format) | SHARED_REFERENCE | `marketing.lead_submissions.email` | Tier 0 capture form field | Lowercase-normalize; at least email OR phone required |
| `phone` | REQUIRED_IF_AVAILABLE | string (normalized) | SHARED_REFERENCE | `marketing.lead_submissions.phone` | Tier 0 capture form field | At least one of email or phone required |
| `companyName` | REQUIRED_IF_AVAILABLE | string / null | SHARED_REFERENCE | `marketing.lead_submissions.company_name` | Tier 0 capture form field | Improves CRM qualification speed |
| `landingPage` | REQUIRED_IF_AVAILABLE | URL string / null | MAIN_APP_CANONICAL | `marketing.lead_submissions.landing_url` | Tier 0 capture context | Capture at request time |
| `referrerUrl` | REQUIRED_IF_AVAILABLE | URL string / null | MAIN_APP_CANONICAL | `marketing.lead_submissions.referrer_url` | Tier 0 capture context | Preserve HTTP Referer at first touch |
| `utmSource` | REQUIRED_IF_AVAILABLE | string / null | SHARED_REFERENCE | `marketing.lead_submissions.utm_source` | Tier 0 capture URL params | Preserve raw UTM if present |
| `utmMedium` | REQUIRED_IF_AVAILABLE | string / null | SHARED_REFERENCE | `marketing.lead_submissions.utm_medium` | Tier 0 capture URL params | Preserve raw UTM if present |
| `utmCampaign` | REQUIRED_IF_AVAILABLE | string / null | SHARED_REFERENCE | `marketing.lead_submissions.utm_campaign` | Tier 0 capture URL params | Preserve raw UTM if present |
| `city` | OPTIONAL | string / null | SHARED_REFERENCE | `marketing.lead_submissions.city` | Tier 0 capture form field | Optional location signal |
| `state` | OPTIONAL | string / null | SHARED_REFERENCE | `marketing.lead_submissions.state` | Tier 0 capture form field | Optional location signal |
| `campaignId` | OPTIONAL | string / null | SHARED_REFERENCE | `raw_payload.campaignId` | Tier 0 capture context | Opaque CRM campaign ID; taxonomy lock needed before normalization |
| `acquisitionContext` | OPTIONAL | string / null | MAIN_APP_CANONICAL | `raw_payload.acquisitionContext` | Tier 0 capture context | Free-form context label (e.g., "Bharat Tex 2026") |
| `referralCode` | OPTIONAL | string / null | MAIN_APP_CANONICAL | `raw_payload.referralCode` | Tier 0 capture URL params | From `/join/:code` or campaign deep link |
| `productCategoryInterest` | OPTIONAL | string / null | SHARED_REFERENCE | `marketing.lead_submissions.category_interest` or `raw_payload` | Tier 0 capture form field | Textile category signal |
| `consentToContact` | OPTIONAL | boolean / null | MAIN_APP_CANONICAL | `raw_payload.consentToContact` | Tier 0 consent checkbox | Contact compliance trace |
| `referringAgentId` | DEFERRED | string / null | SHARED_REFERENCE | `raw_payload.referringAgentId` | Future Tier 0 context | CAE/association alignment pending |
| `associationId` | DEFERRED | string / null | SHARED_REFERENCE | `raw_payload.associationId` | Future Tier 0 context | Association-specific ID |
| `partnerId` | DEFERRED | string / null | SHARED_REFERENCE | `raw_payload.partnerId` | Future Tier 0 context | Strategic partner ID |
| `latestTouchSourceChannel` | DEFERRED | enum / null | SHARED_REFERENCE | Not required at launch | Not required at launch | Future analytics; do not overwrite first-touch |
| `latestTouchTimestamp` | DEFERRED | ISO 8601 / null | SHARED_REFERENCE | Not required at launch | Not required at launch | Future analytics |
| `crmReceiptId` | DEFERRED (required on first successful notify) | UUID string | CRM_CANONICAL | `marketing.lead_submissions.id` (returned in ack) | Tier 0 capture record (store after notify) | Returned by CRM ack; Main App stores for traceability |
| `externalOrchestrationRef` | DEFERRED (set at provisioning time, not Tier 0) | string / null | MAIN_APP_CANONICAL | `onboarding_case metadata` | `tenants.externalOrchestrationRef` | Joins provisioning record; not required at Tier 0 |
| `udyam` | DEFERRED | string / null | MAIN_APP_CANONICAL | `raw_payload.udyam` | Future profile field | Separate policy unit (DECIDE-UDYAM-EDGE-CASE-TRUST-POLICY-001) |
| `inviteToken` | FORBIDDEN | — | — | NEVER accepted | NEVER sent | Must be rejected at any receiver; creates auth risk |
| `mainAppSessionToken` | FORBIDDEN | — | — | NEVER accepted | NEVER sent | Must be rejected; creates auth risk |

---

## 12. First-Touch vs Latest-Touch Rule

### 12.1 First-Touch Rules (MANDATORY)

1. `firstTouchSourceChannel` and `firstTouchTimestamp` are set once at Tier 0 capture and are **immutable**. They MUST NOT be overwritten by later touchpoints, campaign changes, or repeat submissions.

2. If a repeat submission arrives for the same identity (dedup match), the CRM receiver MUST preserve the `firstTouchSourceChannel` and `firstTouchTimestamp` from the earliest record. The later submission's values go into `raw_payload` only for audit, never to override the first record.

3. Main App is canonical for `firstTouchTimestamp` (the time the user's Tier 0 form was submitted in the browser/app, not the time the notification was received by CRM).

4. `submitted_at` in `marketing.lead_submissions` must be set to `firstTouchTimestamp` from the Main App payload, NOT to `NOW()` server-side.

### 12.2 Latest-Touch Rules (DEFERRED)

1. `latestTouchSourceChannel` and `latestTouchTimestamp` are NOT required for the launch wave.

2. If/when implemented, they must be stored as separate columns or `raw_payload` fields — never by overwriting first-touch values.

3. `acquisitionHistory` array (ordered log of all touch events) is DEFERRED and not required for launch.

### 12.3 Launch Requirement Summary

| Field | Launch Required? | Immutable? | Owner |
|---|---|---|---|
| `firstTouchSourceChannel` | YES | YES | Main App captures; CRM stores |
| `firstTouchTimestamp` | YES | YES | Main App captures; CRM stores as `submitted_at` |
| `latestTouchSourceChannel` | NO | NO | DEFERRED |
| `latestTouchTimestamp` | NO | NO | DEFERRED |
| `acquisitionHistory` | NO | N/A | DEFERRED |

---

## 13. Main App Canonical Storage Rule

### 13.1 What Main App Must Store (Required before Tier 0 implementation)

At the Tier 0 capture record (to be designed in `DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01` and `DESIGN-MAINAPP-TIER0-SOURCE-METADATA-STORAGE-01`):

| Field | Storage Requirement | Notes |
|---|---|---|
| `mainAppTier0RequestId` | REQUIRED — generate UUID at capture time | Primary idempotency key for CRM notify |
| `sourceChannel` (canonical) | REQUIRED — set from URL param / form context / invite origin | Maps to canonical enum |
| `firstTouchTimestamp` | REQUIRED — UTC timestamp of form submission | Immutable; send to CRM as submitted_at |
| `roleIntent` | REQUIRED — from form role selector or context | `supplier` / `buyer` / `service_provider` / `unknown` |
| `crmReceiptId` | REQUIRED (after first successful CRM notify) | Returned by CRM ack; store immediately |
| UTM params (`utmSource`, `utmMedium`, `utmCampaign`) | REQUIRED_IF_AVAILABLE — capture from URL at load | Pass to CRM in notification |
| `landingPage`, `referrerUrl` | REQUIRED_IF_AVAILABLE | Capture at request time |
| Contact identity (email/phone, name, company) | REQUIRED_IF_AVAILABLE — at least one of email/phone | Pass to CRM |

### 13.2 Main App Canonical Ownership

Main App is canonical for:
- `mainAppTier0RequestId` — generated and owned by Main App
- `firstTouchTimestamp` — set at capture in browser/app
- `roleIntent` — declared at first capture
- `sourceChannel` (canonical value) — resolved at capture from context and URL params
- `crmReceiptId` — stored after CRM ack (Main App is the source-of-record for its own captures)
- Account, tenant, membership, invite, activation state, GSTIN gate, trust tier, transactional eligibility (per FD-TEXQTIC-ONBOARDING-AUTH-001)

Main App is NOT canonical for:
- CRM qualification status (CRM-canonical)
- CRM lead assignment (CRM-canonical)
- Onboarding case status (CRM-canonical)
- CRM-originated campaign IDs (CRM-canonical if CRM generates them)

---

## 14. CRM Storage / Mapping Rule

### 14.1 Target Storage

Per `DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01` design selection: **reuse `marketing.lead_submissions`**.

### 14.2 Field Mapping: Main App Notification → CRM marketing.lead_submissions

| Main App Notification Field | CRM Column | Notes |
|---|---|---|
| `sourceChannel` (canonical value) | `source_channel` (mapped CRM alias) | Use §15 CRM mapping table to translate |
| `firstTouchTimestamp` | `submitted_at` | Main App timestamp; NOT server `NOW()` |
| `name` | `full_name` | Required at insert |
| `email` | `email` + `dedupe_key` | Lowercase-normalized; dedupe_key = emailNorm |
| `phone` | `phone` | Raw stored |
| `companyName` | `company_name` | Trimmed |
| `city` | `city` | Optional |
| `state` | `state` | Optional |
| `utmSource` | `utm_source` | Passthrough |
| `utmMedium` | `utm_medium` | Passthrough |
| `utmCampaign` | `utm_campaign` | Passthrough |
| `landingPage` | `landing_url` | Passthrough |
| `referrerUrl` | `referrer_url` | Passthrough |
| `mainAppTier0RequestId` | `raw_payload.mainAppTier0RequestId` | Primary idempotency key in raw_payload |
| `roleIntent` | `raw_payload.roleIntent` | CRM triage signal |
| `consentToContact` | `raw_payload.consentToContact` | Consent trace |
| `acquisitionContext` | `raw_payload.acquisitionContext` | Free-form context |
| `campaignId` | `raw_payload.campaignId` | Opaque; normalize later |
| `referralCode` | `raw_payload.referralCode` | From referral surface |
| `productCategoryInterest` | `category_interest` or `raw_payload` | Existing column if present |
| `sourceChannelOriginal` (canonical value as-sent) | `raw_payload.sourceChannelOriginal` | Preserve unmapped canonical value for traceability |
| `form_name` | `form_name` | Set to `"Main App Tier 0"` for filtering/inbox display |

### 14.3 Required `form_name` Convention

For all Main App Tier 0 notifications, `form_name` MUST be set to `"Main App Tier 0"` so CRM inbox can filter and display separately from website-origin leads (`"Request Access"` form_name).

---

## 15. CRM Mapping Table (Existing → Canonical)

| CRM Current Value / Field | System | Canonical Value | Notes | Launch Status | Required Change |
|---|---|---|---|---|---|
| `Website Form` (marketing.lead_submissions default) | marketing.lead_submissions | `WEB` | Default for all website form submissions | LAUNCH_READY | Map alias in contract; no schema change needed |
| `referral` (crm.acquisition_submissions) | crm.acquisition_submissions | `REFERRAL` | Peer referral / referral code origin | LAUNCH_READY | None |
| `camp` (crm.acquisition_submissions) | crm.acquisition_submissions | `CRM_CAMPAIGN` | CRM campaign-driven capture | LAUNCH_READY | Document mapping; fix SOURCE_CHANNEL_MAP in entity-create-execute.ts to include `camp` (separate implementation unit) |
| `whatsapp` (crm.acquisition_submissions) | crm.acquisition_submissions | `WHATSAPP` | WhatsApp channel | LAUNCH_READY (wave 2) | Style normalization only |
| `qr_card` (crm.acquisition_submissions) | crm.acquisition_submissions | `REFERRAL` | QR card scan = physical referral channel | LAUNCH_READY | Alias documented |
| `inbound` (crm.acquisition_submissions) | crm.acquisition_submissions | Context-dependent: `CRM_CAMPAIGN` (if campaign-driven), `MANUAL` (if sales-driven), `WEB` (if web-form fallback) | Ambiguous — single canonical value cannot be reliably resolved without source context | PARTIAL | Introduce `source_detail` field or subtype in implementation unit to disambiguate `inbound`; at launch, treat as `CRM_CAMPAIGN` default |
| `partner` (crm.acquisition_submissions) | crm.acquisition_submissions | `PARTNER` (commercial) or `CAE_FIELD_AGENT` (if field-origin) or `ASSOCIATION` (if association-origin) | Context-dependent; field_agent_uid presence distinguishes CAE | PARTIAL | Require `source_detail` in payload to disambiguate at implementation; at launch, treat as `PARTNER` unless `field_agent_uid` present |
| `Main App Tier 0` (form_name, NEW) | marketing.lead_submissions | N/A (this is form_name, not source_channel) | Distinguish in inbox only | REQUIRED — set in receiver | Insert with this form_name in receiver |

---

## 16. Main App Mapping Table (Existing → Canonical)

| Main App Current Value / Field | Context | Canonical Value | Notes | Launch Status | Required Change |
|---|---|---|---|---|---|
| `organic` (supplier_profile.viewed.v1) | Public supplier profile view event | `WEB` | Organic web visit source on profile view | EXISTS (event-level only) | Map `organic` → `WEB` in any cross-app export or analytics join |
| `qr` (supplier_profile.viewed.v1) | Public supplier profile view event | `REFERRAL` | QR code scan arrival on profile | EXISTS (event-level only) | Map `qr` → `REFERRAL` |
| `referral` (supplier_profile.viewed.v1) | Public supplier profile view event | `REFERRAL` | Referral link arrival | EXISTS (event-level only) | None |
| `event` (supplier_profile.viewed.v1) | Public supplier profile view event | `OFFLINE_EVENT` | Physical event context attribution | EXISTS (event-level only) | Map `event` → `OFFLINE_EVENT` |
| `direct` (supplier_profile.viewed.v1) | Public supplier profile view event | `DIRECT_INVITE` | Direct link visit without campaign attribution | EXISTS (event-level only) | Map `direct` → `DIRECT_INVITE` |
| `WEB` (future Tier 0 capture) | Main App Tier 0 form | `WEB` | NEW — canonical value to use in Tier 0 implementation | MISSING — required | Implement in DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01 |
| `DIRECT_INVITE` (future Tier 0 / invite flow) | Invite acceptance path | `DIRECT_INVITE` | NEW — canonical value for admin-issued invite path | MISSING — required | Implement in Tier 0 and invite flow |
| `CRM_CAMPAIGN` (future Tier 0 / campaign link) | Campaign deep link Tier 0 | `CRM_CAMPAIGN` | NEW — canonical value from CRM campaign origin | MISSING — required | Implement when campaign link tracking added |
| `REFERRAL` (future Tier 0 / join route) | `/join/:code` referral landing | `REFERRAL` | NEW — canonical value for referral code entries | PARTIALLY_EXISTS (`publicReferralCodeFromPath` captured) | Wire into Tier 0 notification when implemented |

---

## 17. CAE Placeholder Mapping

*CAE repo not inspected in this unit. The following values are provisionally reserved pending `DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01`.*

| Reserved Canonical Value | Reserved For | Blocked Until | CAE Mapping (Provisional) | Notes |
|---|---|---|---|---|
| `CAE_FIELD_AGENT` | CAE field acquisition agent capture | DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01 | CAE → CRM `partner` (current) → canonical `CAE_FIELD_AGENT` | Use `field_agent_uid` presence in crm.acquisition_submissions to distinguish from non-CAE partner |
| `OFFLINE_EVENT` | Trade show, exhibition, cluster event | DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01 (for CAE-collected events) | CAE offline event capture | Web/CRM-collected event attribution may launch without CAE |
| `PARTNER` | Strategic/integration partner referral | No hard block — launch in WAVE_2 | CAE partner seam if applicable | CAE partner-specific attribution is provisional |
| `ASSOCIATION` | Trade body / industry association referral | WAVE_2 implementation | CAE association seam if applicable | Association ID carried in `associationId` field |
| `referringAgentId` field | Field agent ID from CAE capture | CAE role discovery | `field_agent_uid` in crm.acquisition_submissions | No FK to auth.users per Decision C1 |

**CAE-specific fields carried in CRM crm.acquisition_submissions today:**
- `field_agent_uid` (UUID, nullable, no FK)
- `field_agent_uid_raw` (TEXT, required in acquisition intake)
- `whatsapp_consent` (BOOLEAN, required in acquisition intake)

These fields are NOT part of the Main App Tier 0 notification payload at launch. They exist in the separate CAE-originated acquisition intake path only.

---

## 18. Launch Subset

### 18.1 Wave 1 (Required — First Implementation)

These source values MUST be supported before any Tier 0 launch:

| Source Value | Launch Wave | Allowed Producer | Allowed Receiver | Implementation Required Before Use |
|---|---|---|---|---|
| `WEB` | WAVE_1_REQUIRED | Main App Tier 0 form | CRM marketing.lead_submissions | Main App: add sourceChannel field to Tier 0 form. CRM: map `Website Form` ↔ `WEB` |
| `DIRECT_INVITE` | WAVE_1_REQUIRED | Main App invite path | CRM marketing.lead_submissions | Main App: tag invite-origin captures with `DIRECT_INVITE`. CRM: map to `inbound` |
| `UNKNOWN` | WAVE_1_REQUIRED | Any system (fallback) | Any system | Fallback only — no new implementation; any unmapped value maps to `UNKNOWN` |

### 18.2 Wave 1 Optional (Soft Launch Expansion)

| Source Value | Launch Wave | Allowed Producer | Allowed Receiver | Implementation Required Before Use |
|---|---|---|---|---|
| `CRM_CAMPAIGN` | WAVE_1_OPTIONAL | CRM campaign links | Main App Tier 0, CRM | CRM: add `campaignId` passthrough. Main App: accept `sourceChannel=CRM_CAMPAIGN` from campaign deep link params |
| `REFERRAL` | WAVE_1_OPTIONAL | Main App `/join/:code` | CRM marketing.lead_submissions | Main App: wire referralCode + `REFERRAL` source into Tier 0 notify. CRM: no schema change |

### 18.3 Wave 2 (Post-Launch)

| Source Value | Launch Wave | Allowed Producer | Allowed Receiver | Implementation Required Before Use |
|---|---|---|---|---|
| `WHATSAPP` | WAVE_2 | CRM/Marketing, Main App | CRM marketing.lead_submissions | Source taxonomy lock already done (this unit). Implementation unit for WhatsApp channel capture required |
| `SOCIAL` | WAVE_2 | Marketing Website, CRM | CRM marketing.lead_submissions | Requires campaign attribution tracking on marketing site |
| `ASSOCIATION` | WAVE_2 | CRM, future CAE | CRM | Association-specific seam required |
| `OFFLINE_EVENT` | WAVE_2 | CRM, CAE (deferred) | CRM | CAE role decision can proceed independently for CRM-captured events |
| `PARTNER` | WAVE_2 | CRM | CRM | Strategic partner program required |
| `MANUAL` | WAVE_2 | CRM only | CRM | CRM operator manual entry; not applicable to automated Tier 0 path |

### 18.4 Deferred

| Source Value | Status | Blocked Until |
|---|---|---|
| `CAE_FIELD_AGENT` | DEFERRED | DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01 |

---

## 19. Reserved / Future Values

| Value | Reserved For | Blocked Until | Notes |
|---|---|---|---|
| `CAE_FIELD_AGENT` | CAE offline/field acquisition capture | DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01 | Do NOT implement as WEB alias; must stay separate |
| `AFFILIATE` | Future affiliate/commission program | Affiliate program design unit | Not in current scope |
| `MARKETPLACE` | Future third-party marketplace referral | Marketplace expansion | Not in current scope |
| `QR_DIGITAL` | Future in-app/digital QR code distinct from physical QR card | Analytics refinement unit | Currently mapped to `REFERRAL` |
| `EVENT_VIRTUAL` | Online/virtual event (webinar, digital expo) | Event taxonomy unit | Currently mapped to `OFFLINE_EVENT` as fallback |
| `INBOUND_CALL` | Phone-inbound capture | Voice/phone intake unit | Not in current scope |

---

## 20. Non-Drift Rules

| Rule | Applies To | Enforcement Point | Exception Path |
|---|---|---|---|
| R1 — No new source_channel value without contract update | All systems: Main App, CRM, CAE, Marketing Website | Code review / PR gate; this contract is the approved list | Only founder-authorized governance unit may add new canonical value |
| R2 — Systems may use local alias values only if mapped to canonical value | CRM (uses `Website Form`, `inbound`, `camp` etc.) | CRM source mapping table (§15); documentation required | Alias must be registered in §15 before use in production |
| R3 — Unknown/unmapped values must map to `UNKNOWN` and log/alert | All systems | CRM receiver validation; Main App Tier 0 validation | Never silently drop; `UNKNOWN` is always a valid fallback |
| R4 — CRM cannot use source values to determine or override access authority | CRM | CRM qualification logic; never use sourceChannel as trust gate | Source is attribution only; trust tier owned by Main App |
| R5 — Main App cannot use source values to bypass GSTIN gate | Main App | Main App verification gate; GSTIN gate is independent of source | Per FD-TEXQTIC-ONBOARDING-AUTH-001; no exception |
| R6 — CAE field-agent source does not substitute for GSTIN validation | CAE, CRM, Main App | Main App trust gate; CRM qualification workflow | Per FD-TEXQTIC-ONBOARDING-AUTH-001; CAE source attribution is acquisition metadata only |
| R7 — First-touch source and timestamp are immutable once set | Main App, CRM | Storage logic at write time; no UPDATE permitted on `submitted_at` and first-touch source for existing records | Read-only after first insert; any correction requires explicit audit trail |
| R8 — `inviteToken` and `mainAppSessionToken` are FORBIDDEN in cross-system payloads | All systems | CRM receiver validation; Main App notification client | No exception |
| R9 — `camp` must be explicitly mapped; do not leave unmapped in SOURCE_CHANNEL_MAP | CRM entity-create-execute.ts | Code review; SOURCE_CHANNEL_MAP completeness check | Separate implementation unit; current gap documented in §9 |
| R10 — `inbound` and `partner` must carry `source_detail` to disambiguate canonical mapping at implementation | CRM acquisition_submissions intake | Implementation unit for disambiguation | Until disambiguation is implemented, `inbound` → `CRM_CAMPAIGN`, `partner` → `PARTNER` as defaults |

---

## 21. Decision Verdict

**`GOV_SOURCE_TAGGING_CONTRACT_LOCKED`**

The canonical cross-app acquisition source tagging contract is sufficiently complete to:
1. Unblock CRM receiver implementation (`IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01`) — source mapping is locked, payload field contract is known from DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01
2. Unblock Main App Tier 0 design (`DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01`) — canonical source values and required Tier 0 fields are now locked
3. Enable launch-wave-1 implementation with `WEB`, `DIRECT_INVITE`, and `UNKNOWN` as minimum set
4. Enable CAE placeholder reservation without blocking launch

No Main App storage decision, CRM storage decision, or CAE discovery is required before locking this contract.

---

## 22. Candidate Next Unit Classifications

| Candidate Unit | Classification | Rationale |
|---|---|---|
| `IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01` | IMPLEMENTATION_READY | CRM receiver design complete (DESIGN unit done + this source contract); can proceed immediately |
| `DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01` | REQUIRED_NEXT (concurrent with CRM impl) | Main App Tier 0 form + CRM notify client must be designed before Main App implementation |
| `DESIGN-MAINAPP-TIER0-SOURCE-METADATA-STORAGE-01` | REQUIRED_BEFORE_MAINAPP_IMPLEMENTATION | Defines what Main App stores at Tier 0 capture record level; can overlap with CRM receiver implementation |
| `DECIDE-MAINAPP-WEB-DIRECT-REQUEST-ACCESS-FLOW-01` | REQUIRED_BEFORE_IMPLEMENTATION | Product/UX definition of what `app.texqtic.com/request-access` looks like; feeds Main App design unit |
| `DECIDE-CAE-OFFLINE-FIELD-ACQUISITION-ROLE-AND-CONSOLIDATION-01` | DEFERRED | Not blocking launch; CAE values are reserved; can proceed post-launch |
| `IMPLEMENT-MAINAPP-SOURCE-CHANNEL-TAGGING-FOUNDATION-01` | REQUIRED_AFTER_MAINAPP_DESIGN | Implements account-level source metadata in Main App; after Tier 0 design complete |
| `DECIDE-TEXQTIC-ACQUISITION-OPERATING-MODEL-SYNTHESIS-01` | FUTURE_AUTOMATION | Full synthesis after Main App + CRM + CAE implementation waves; not needed for launch |

---

## 23. Selected Next Unit

**`IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01`**

**Selection basis (per prompt selection rule #1):**

The source contract is now locked. The CRM receiver endpoint/storage/payload/ack contract is fully designed in `DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01`. The CRM receiver implementation does NOT depend on Main App UI design — it only requires:
1. Source taxonomy contract (locked by this unit ✓)
2. Payload field contract (locked by DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01 ✓)
3. Storage selection (locked: reuse `marketing.lead_submissions` ✓)
4. Ack/idempotency contract (locked in DESIGN unit ✓)

The CRM receiver can be implemented in isolation. Main App Tier 0 design (`DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01`) should proceed in parallel but is not a prerequisite for the CRM-side implementation.

**Note on parallel track:** `DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01` should be opened concurrently or immediately after, but the smallest CRM-side unblock is the receiver implementation.

---

## 24. Safety Confirmations

| Safety Rule | Status |
|---|---|
| No runtime source code edited — Main App | CONFIRMED |
| No runtime source code edited — CRM | CONFIRMED |
| No schema changed — Main App | CONFIRMED |
| No schema changed — CRM | CONFIRMED |
| No migrations run | CONFIRMED |
| No env vars modified | CONFIRMED |
| No production API calls made | CONFIRMED |
| No emails or invites sent | CONFIRMED |
| No provisioning triggered | CONFIRMED |
| No CAE repo modified | CONFIRMED |
| No Marketing Website repo modified | CONFIRMED |
| No provider settings changed | CONFIRMED |
| No secrets exposed | CONFIRMED |
| Both worktrees clean at start | CONFIRMED — Main App: no output on status, CRM: no output on status |
| Both worktrees clean at end | CONFIRMED — only the two contract artifacts are new/untracked |

---

## 25. Recommended Next Prompt / Unit

**Primary next (CRM implementation):**

```
IMPLEMENT-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01
```

*Context to provide:*
- Source contract: `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01` (this document)
- CRM receiver design: `DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01` (commit `b31e940`)
- CRM prior authority: `DECIDE-CRM-ACQUISITION-QUALIFICATION-AND-MAINAPP-FLOW-01` (commit `74eeeac`)
- Main App prior authority: `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01` (commit `0949f7df`)
- Founder policy: `FD-TEXQTIC-ONBOARDING-AUTH-001`

*Implementation scope (CRM only — not Main App):*
- File to create: `api/webhooks/mainapp-tier0-captures.ts`
- Route: `POST /api/webhooks/mainapp-tier0-captures`
- Auth: `CRM_MAINAPP_TIER0_INGESTION_SECRET` header (new env var — do not reuse `CRM_INGESTION_SECRET`)
- Storage: `marketing.lead_submissions`
- Idempotency: `mainAppTier0RequestId` in `raw_payload`
- Ack: structured JSON per §14 of DESIGN unit
- Source mapping: per §15 of this contract (canonical → CRM alias)

**Parallel next (Main App design):**

```
DESIGN-MAINAPP-TIER0-REQUEST-ACCESS-AND-CRM-NOTIFY-01
```

*Context to provide:*
- Source contract: `GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01` (this document)
- Main App prior authority: `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01` (commit `0949f7df`)
- Founder policy: `FD-TEXQTIC-ONBOARDING-AUTH-001`
- CRM receiver endpoint: `POST /api/webhooks/mainapp-tier0-captures`
- CRM receiver payload contract: `DESIGN-CRM-MAINAPP-TIER0-NOTIFICATION-RECEIVER-01` §23 payload field table

---

*Unit: GOV-CROSSAPP-ACQUISITION-SOURCE-TAGGING-CONTRACT-01 | Canonical copy*
*Date: 2026-06-06 | Version: v1.0 — LOCKED*
*Main App HEAD: 0949f7df | CRM HEAD: b31e940*
*Authority: Paresh Patel, Founder, TexQtic | Authored by: GitHub Copilot governance sync agent*
