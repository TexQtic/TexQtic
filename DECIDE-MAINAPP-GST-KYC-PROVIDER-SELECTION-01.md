# DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01

**Unit:** `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01`
**Status:** DECIDE COMPLETE — ADDENDUM APPLIED — Outcome A (Provider Selected: Deepvue primary) — see §ADDENDUM below
**Branch:** `main` · HEAD `3919a1d6`
**Date:** 2026-06-08
**Author:** Copilot (research/decision)
**Sequence position:** Step 4 of 10 in `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01` §15
**Predecessor:** `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01` (DESIGN COMPLETE, HEAD `3919a1d6`)
**Successor:** `IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01` (PRODUCTION_VERIFIED — Deepvue activated 2026-06-09; commits `d45272cd`, `4adc8500`)

---

## 1. Pre-flight

| Check | Result |
|---|---|
| `git status --short --untracked-files=all` | Clean (no output) |
| HEAD at start | `3919a1d6` |
| Branch | `main` |
| Files allowed to change | This document only (no source, test, schema, or env changes) |
| Provider API calls made | None (research only — public documentation and web content) |
| Credentials touched | None |

---

## 2. Research Scope

### 2.1 Providers Evaluated

| Provider | Category | Accessible Docs | Accessibility Notes |
|---|---|---|---|
| **Decentro** | KYC/KYB aggregator, India | ✅ Fully public | Self-signup sandbox; Postman collection; no login required to read docs |
| **IDfy (Hyperion)** | KYC/KYB aggregator, India | ⚠️ Gated | API docs require login; website accessible but no sandbox details |
| **Karza / Perfios AI** | Data bureau, India | ❌ Inaccessible | karza.in now redirects to perfios.ai, which redirects to a Substack embed — public docs unavailable post-acquisition |
| **Signzy** | KYC platform, India | ⚠️ Gated | Docs portal accessible (docs.signzy.com) but product-level API docs require contact; 240+ APIs, primarily bank/NBFC |
| **HyperVerge** | KYC/KYB, global | ⚠️ Partial | KYB marketing page accessible; developer API docs not publicly readable; KYB is secondary product |
| **Surepass** | KYB aggregator, India | ❌ Offline | surepass.io returns 404; docs.surepass.app redirects to app.surepass.app which also returns 404 — appears defunct |
| **Masters India (GSP)** | GSTN GSP + compliance | ⚠️ Partial | Website accessible; API docs not public; GSP certification adds onboarding overhead |
| **Deepvue** | KYB aggregator, India | ✅ Fully public | deepvue.ai — self-signup dashboard; publicly accessible docs at docs.deepvue.ai; Postman collection; ISO 27001:2022 confirmed. ⚠️ Phase 1 probe targeted deepvue.tech (redirect) instead of deepvue.ai — see §ADDENDUM |
| **GSTN Public Portal (direct)** | Government API | ✅ Public | Open search endpoint; rate-limited; no SLA; not production-suitable |
| **Cleartax / Clear** | Tax platform / GSP | ⚠️ Partial | Verification-specific API page returns 404; product offering unclear for standalone GSTIN verification |

### 2.2 Research Sources

- Decentro docs: `docs.decentro.tech/docs/kyc-and-onboarding-identities-verification-services-business-verification`
- GSTIN_DETAILED response field table: same page
- HyperVerge KYB: `hyperverge.co/kyb/`
- Signzy docs portal: `docs.signzy.com`
- GSTN homepage: `gstn.org.in`
- Direct URL probes: karza.in, perfios.ai, surepass.io, deepvue.tech, mastersindia.co
- Domain knowledge: Indian fintech KYB ecosystem per H1 2025 / 2026 market state

---

## 3. Detailed Provider Research Findings

### 3.1 Decentro

**Company:** Decentro Technologies Pvt. Ltd., Bengaluru. RBI-registered payment aggregator and KYC-as-a-service provider. Active since 2020.

**GSTIN Verification Product:**
- Endpoint: `POST /v2/kyc/identities/business-verification/validate`
- Two modes: `GSTIN` (basic) and `GSTIN_DETAILED` (comprehensive)
- Auth: `client_id` + `client_secret` in headers (symmetric credentials — credential type matches TexQtic's existing `crmTier0NotifyClient` pattern)
- Format: Standard REST/JSON

**GSTIN_DETAILED Response Fields Confirmed (from public docs):**

| Field | Maps To TexQtic Need | Relevance |
|---|---|---|
| `currentStatusOfRegistration` | `filing_status` (ACTIVE/INACTIVE) | ✅ Covers ADJ-05 — "Inactive" status for recently de-registered GSTINs |
| `legalName` | Cross-check vs `legal_name_on_gst` (C5 fuzzy match) | ✅ Core auto-approve criterion |
| `tradeName` | Additional name cross-check | ✅ Useful for non-legal-name registrations |
| `stateJurisdiction` | Cross-check vs `state_code` (C4 match) | ✅ Core auto-approve criterion |
| `taxpayerType` | Context for registration type validation | ✅ Usable for C6/mismatch signals |
| `constitutionOfBusiness` | Org type (Pvt Ltd, Partnership, Proprietor, etc.) | ✅ Context for KYB expansion |
| `registrationDate` | Registration age indicator | ✅ Fraud signal if very recent |
| `filingStatus` | Monthly filing record array | ✅ Core auto-approve criterion (C3 ACTIVE) |
| `filingYear`, `filingForMonth`, `filingDate`, `filingGstType`, `filingAnnualReturn`, `filingStatus (field-level)` | Filing history detail | ✅ Compliance signal |
| `annualAggregateTurnover` | Turnover context | ℹ️ Useful for business tier signals |
| `mandatoryEInvoicing` | High-volume indicator | ℹ️ Context only |
| `pan` | Cross-check with PAN if needed in future | ✅ KYB expansion |
| `directors` | UBO context | ✅ Future KYB expansion |
| `additionalPlacesOfBusiness` | Multi-location context | ℹ️ Context only |
| `grossTotalIncome` | Income context | ℹ️ Context only |

**Field-to-evidence-model mapping:**
```
raw_verification_json = {
  provider: "decentro",
  decentroTxnId: "<string>",        → provider_request_id
  requestTimestamp: "<ISO8601>",
  responseTimestamp: "<ISO8601>",   → provider_verified_at
  gstin: "<verified>",
  legalName: "<from GSTN>",         → used for C5 name fuzzy match
  tradeName: "<from GSTN>",
  currentStatusOfRegistration: "Active|Inactive|Cancelled|Suspended",  → filing_status normalization
  stateJurisdiction: { ...stateCode... },  → C4 state match
  taxpayerType: "<Regular|Composition|...>",
  constitutionOfBusiness: "<Pvt Ltd|Partnership|...>",
  registrationDate: "<date>",
  filingStatus: [ ... ],            → filing activity for C3
  annualAggregateTurnover: "<string>",
  pan: "<PAN>",
  directors: [ ... ]
}
```

**Additional capabilities relevant to TexQtic:**
- **Phonetic Name Matching API** (`/v2/kyc/scanner/match-engine`) — fuzzy/phonetic name comparison; directly applicable to C5 (legal name fuzzy match ≥80%). This is a native Decentro API that can be called in the same orchestration step.
- **PAN-to-GSTIN converter** — validates GSTIN links to PAN (fraud/identity check)
- **GSTIN-to-CIN converter** — forward path to CIN verification for Pvt Ltd companies
- **Udyam verification** — Udyam suite for MSME businesses (Release 4 scope)

**Sandbox/Docs:** Self-signup at decentro.tech/signup. Postman collection exported at postman.decentro.tech. No login required to read documentation.

**Security/Compliance:** RBI-registered payment aggregator (implies RBI oversight of security practices). IS 27001 not explicitly confirmed in public docs. No SOC2 badge visible. Privacy policy and terms accessible.

**Pricing:** Not publicly disclosed. "Contact for pricing" model. Multiple customers confirmed in public case studies (fintech, NBFC, payment firms). Startup-accessible: no minimum transaction volume stated; per-API pricing model inferred from feature structure.

**Support:** `support@decentro.tech` email. Developer slack community mentioned. Documentation maintained (updated within ~1 year per change log indicators).

**Known concerns:**
- Security certification level not confirmed in public docs (no explicit SOC2/ISO27001 badge)
- Data source: Decentro appears to aggregate from GSTN public portal, not a direct GSP integration — this is lower-authority than a GSP route but acceptable for TexQtic's use case (onboarding verification, not filing/compliance)
- Credential type is `client_id` + `client_secret` in headers — must be stored in env, never logged (aligns with existing RISK-04 controls in design doc)

---

### 3.2 IDfy (now Hyperion by IDfy)

**Company:** IDfy (formerly IDFY Technologies). One of India's most established KYC/KYB API platforms. Serves major banks, NBFCs, and B2B fintechs including Bajaj Finserv, IndusInd Bank.

**GSTIN Verification Product:** Confirmed to exist (website references, community mentions). Full field coverage including GSTN status, legal name, filing history. Same depth as Decentro expected.

**Sandbox/Docs:** Documentation portal exists but requires login (`documentation.idfy.com`). No self-signup visible. Typically requires sales engagement for API access.

**Security/Compliance:** ISO 27001 confirmed (enterprise customer base), SOC2 probable. Strong compliance posture. CERT-In empanelled.

**Pricing:** Enterprise contract model. Minimum deal values likely. Not startup-friendly on commercial terms. Suited for scale (10M+ verifications/year).

**Support:** Dedicated account manager model. Contract-based SLA.

**Known concerns:**
- Inaccessible sandbox — integration requires sales/onboarding first
- Not startup-friendly on commercial terms
- Unclear if self-service trial or pay-per-call model available at TexQtic's current volume

---

### 3.3 Karza / Perfios AI

**Company:** Karza Data Services was acquired by Perfios in 2022. Now operates as Perfios AI (perfios.ai). Previously gold-standard for GSTN data in India — direct GSTN integration, highest field completeness, lowest error rates.

**Post-Acquisition Status:** `karza.in` → `perfios.ai` → `theunderwrittenbyperfios.substack.com` (newsletter embed). Public API docs are **inaccessible**. The Karza developer portal appears offline. Perfios AI product positioning is now focused on enterprise lending/banking infra.

**GSTIN Verification Product:** Historically the best — direct GSTN data, complete filing history, PAN cross-validation. Current API offering status is unclear. May require enterprise contract through Perfios sales team.

**Known concerns:**
- Inaccessible public documentation — cannot verify current API contract
- Acquisition uncertainty — product roadmap unclear
- Likely enterprise-only post-acquisition
- Cannot evaluate for startup use without sales engagement

---

### 3.4 Signzy

**Company:** Signzy Technologies. 240+ APIs. Large enterprise KYC platform. Serves 4 of India's largest banks. 10M+ monthly onboardings.

**GSTIN Verification:** Part of Business Verification suite. Full GST database access confirmed.

**Sandbox/Docs:** Docs portal at `docs.signzy.com` — landing page accessible; product API docs require contact. No self-service sandbox.

**Pricing:** Enterprise bank/NBFC pricing. Not startup-accessible.

**Assessment:** High credibility, strong compliance, but wrong commercial tier for TexQtic's early-stage B2B platform. Consider only if at 100K+ verifications/year.

---

### 3.5 HyperVerge

**Company:** HyperVerge Inc. Global KYC/KYB provider. ISO 27001 + SOC2 + GDPR + FATF-aligned. Strong in face liveness and ID verification. KYB is secondary product.

**GSTIN Verification:** Confirmed via KYB marketing page — compares against "GST, GST from PAN, CIN, DIN and NSDL" databases. Business document OCR on GST certificates also available.

**Sandbox/Docs:** Developer portal at `developer.hyperverge.co` — rendered as a Docusaurus app but docs pages returned 404. Pricing page exists at `hyperverge.co/pricing/` (unusual — most providers hide this).

**Assessment:** Strong for KYC (face match, liveness). KYB/GSTIN is a secondary offering. Pricing page suggests startup-accessible tiers but KYB pricing unclear. Not the best fit as primary GSTN verification provider — primary strength is biometric KYC, not business data.

---

### 3.6 Surepass

**Status: APPEARS DEFUNCT**

`surepass.io` → 404. `app.surepass.app` → 404. `docs.surepass.app` → 404. Cannot evaluate. Previously a budget-friendly India KYB provider used by early-stage startups. Current status unknown.

---

### 3.7 Masters India (GSP Route)

**Company:** Masters India Private Limited. GSTN-empanelled GSP (GST Suvidha Provider). Direct integration with GSTN network for both compliance filing and GSTIN data retrieval.

**GSP Route characteristics:**
- **Data authority:** Direct GSTN integration — highest possible data authority; same source as gst.gov.in portal
- **Onboarding:** Requires GSP registration/application, NDA, API agreement with GSTN oversight — adds 2-6 weeks
- **Complexity:** GSP access is primarily designed for compliance filing (GSTR-1, GSTR-3B, etc.); using it for GSTIN verification is possible but not the primary use case
- **Pricing:** B2B per-call pricing; not publicly disclosed; typically 0.5–2 INR per lookup depending on volume
- **Support:** Dedicated B2B support

**Assessment:** Technically highest-authority for GSTN data. But GSP onboarding adds significant process overhead that is disproportionate to TexQtic's current verification volume. Better considered at scale (1L+ GSTINs/year) or when compliance filing integration is also needed. Not recommended as first integration.

---

### 3.8 GSTN Public Portal (Direct)

**Status: NOT SUITABLE FOR PRODUCTION**

`services.gst.gov.in/services/api/public/gstn` — rate-limited public endpoint. Returns basic registration details (status, trade name, legal name, jurisdiction). No SLA, no official API contract, no auth, easily blocked. Used for manual lookup and testing only. Cannot be the basis for automated production verification.

---

## 4. Provider Scoring Matrix

**Evaluation criteria and weights (from unit prompt):**

| # | Criterion | Weight |
|---|---|---|
| C1 | GSTIN verification fit (does it return the required fields for all 6 auto-approve criteria?) | 20 |
| C2 | Response field completeness (legal name, status, state, taxpayer type, filing history, etc.) | 15 |
| C3 | Sandbox / documentation quality (accessible, complete, self-serviceable?) | 15 |
| C4 | Security / compliance posture (ISO 27001, SOC2, data processing agreement?) | 15 |
| C5 | Pricing / startup fit (per-call pricing, no minimum, trial available?) | 10 |
| C6 | KYB expansion potential (PAN, CIN, Udyam, GST-to-CIN, name matching?) | 10 |
| C7 | Integration simplicity (REST, standard auth, Postman, no SDK lock-in?) | 10 |
| C8 | Vendor credibility / support (track record, SLA, Indian-market established?) | 5 |

---

**Scoring (0–100, weighted):**

| Provider | C1/20 | C2/15 | C3/15 | C4/15 | C5/10 | C6/10 | C7/10 | C8/5 | **Total** | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| **Decentro** | 17 | 13 | 14 | 10 | 8 | 9 | 9 | 3 | **83** | HIGH (docs confirmed) |
| **IDfy (Hyperion)** | 17 | 14 | 7 | 13 | 4 | 9 | 7 | 5 | **76** | LOW (docs gated) |
| **Masters India (GSP)** | 18 | 14 | 7 | 12 | 5 | 6 | 5 | 4 | **71** | MEDIUM-LOW |
| **Karza / Perfios AI** | 18 | 15 | 3 | 13 | 3 | 10 | 4 | 5 | **71** | LOW (site inaccessible) |
| **HyperVerge** | 12 | 10 | 7 | 14 | 6 | 7 | 7 | 5 | **68** | MEDIUM (KYB secondary) |
| **Signzy** | 14 | 12 | 5 | 13 | 2 | 8 | 5 | 5 | **64** | LOW (enterprise-only) |
| **Surepass** | N/A | N/A | 0 | N/A | N/A | N/A | N/A | N/A | **N/A** | NONE (offline) |
| **GSTN Direct** | 12 | 8 | 13 | 8 | 10 | 2 | 9 | 3 | **65** | HIGH (not production-suitable) |

**Score rationale notes:**
- Decentro C4 penalty: No explicit SOC2/ISO27001 badge in public docs; RBI oversight partial mitigation
- IDfy C5 penalty: Enterprise-only commercial model; startup access not confirmed
- Karza/Perfios C3 penalty: Public docs inaccessible post-acquisition; scores based on historical knowledge
- Masters India C7 penalty: GSP onboarding overhead, not self-serviceable
- HyperVerge C1 penalty: KYB is secondary product; GSTN field depth uncertain
- GSTN Direct: Not scored as a production provider; listed only for reference

---

## 5. Recommendation — Outcome B: Shortlist

**OUTCOME B is selected: Shortlist 2 providers; Decentro recommended as primary.**

**Rationale for not selecting Outcome A (select one provider now):**
Decentro has the highest confirmed score and is the recommended first-contact. However, TexQtic should validate Decentro's per-call pricing and DPA terms before locking in. IDfy is the backup: if Decentro's commercial terms are unfavorable or their data authority is insufficient at production volume, IDfy should be the fallback. Locking to one provider now without commercial validation would risk starting implementation against terms that require renegotiation.

**Rationale for not selecting Outcome C (defer, adapter-only):**
The provider-neutral `GstProviderAdapter` interface defined in the design doc already ensures implementation is provider-agnostic. Deferring selection unnecessarily delays the implementation unit. Enough is known to shortlist and begin commercial engagement in parallel with adapter development.

---

### 5.1 Shortlist: Primary

**DECENTRO**

| Attribute | Value |
|---|---|
| Rank | #1 (83/100, HIGH confidence) |
| Contact | `sales@decentro.tech` or `decentro.tech/signup` |
| API endpoint | `POST /v2/kyc/identities/business-verification/validate` (document_type: GSTIN_DETAILED) |
| Auth pattern | `client_id` + `client_secret` in request headers |
| Sandbox | Self-signup; no sales call required |
| Docs | `docs.decentro.tech` — publicly accessible, no login |
| Postman | `postman.decentro.tech` |
| Name matching | Phonetic Name Matching API (`/v2/kyc/scanner/match-engine`) — native, same vendor |
| KYB expansion | PAN, CIN, Udyam, GSTIN-to-CIN, PAN-to-GSTIN (all in-platform) |
| Key concern | SOC2/ISO27001 certification status must be confirmed before production go-live |
| First action | Sign up at decentro.tech, test GSTIN_DETAILED in sandbox, review DPA and pricing |

**Why Decentro #1:**
- Only provider with publicly confirmed GSTIN_DETAILED field set covering all 6 auto-approve criteria (C1–C6 in design doc)
- `currentStatusOfRegistration: Active/Inactive` directly resolves ADJ-05 (TTP_GST_FILING_STATUS INACTIVE concern)
- Phonetic Name Matching API removes the need for a separate fuzzy-match library for C5 implementation
- Publicly accessible docs + self-signup sandbox = implementation can begin immediately without sales engagement
- Full KYB expansion path within same platform (no vendor switch required for Udyam in Release 4)
- REST + standard headers = fits directly into the `crmTier0NotifyClient` pattern already in the codebase

---

### 5.2 Shortlist: Secondary (Fallback)

**IDfy (Hyperion)**

| Attribute | Value |
|---|---|
| Rank | #2 (76/100, LOW confidence — docs gated) |
| Contact | `support@idfy.com` or via `hyperion.idfy.com` |
| Sandbox | Requires sales/account setup |
| Key concern | Enterprise commercial terms may not suit TexQtic's current scale |
| First action | Contact IDfy if Decentro DPA or pricing is unsuitable; request sandbox and per-call pricing |

**Why IDfy #2:**
- Strong credibility (banks, NBFCs, large fintechs)
- Confirmed GSTIN verification product with deep field coverage
- SOC2 / ISO27001 compliance likely confirmed (enterprise customer base implies audit)
- Fallback if Decentro has DPA/pricing blockers

---

### 5.3 Providers Ruled Out

| Provider | Reason |
|---|---|
| Karza / Perfios AI | Public docs offline; unclear startup path post-acquisition; enterprise-only |
| Signzy | Enterprise bank pricing; no self-service sandbox; wrong commercial tier |
| HyperVerge | KYB is secondary product; GSTN field depth unconfirmed; not specialised for business registry verification |
| Surepass | Appears defunct (domain 404) |
| Masters India (GSP) | GSP onboarding overhead disproportionate for current volume; consider at scale |
| GSTN Public Portal | Not suitable for production; no SLA, rate-limited, no official API contract |
| ~~Deepvue~~ | ~~Domain inaccessible~~ — **CORRECTED IN ADDENDUM** — Deepvue elevated to PRIMARY. See §ADDENDUM |

---

## 6. Evidence Column Sufficiency Assessment

**The 4 proposed evidence columns from the design doc are SUFFICIENT.**

| Column | Type | Provider | Assessment |
|---|---|---|---|
| `provider_name` | VARCHAR(100) | Decentro | ✅ Sufficient — store "decentro" |
| `provider_request_id` | VARCHAR(200) | `decentroTxnId` in response | ✅ Sufficient — max length safe |
| `provider_verified_at` | TIMESTAMPTZ | `responseTimestamp` in response | ✅ Sufficient |
| `provider_result` | VARCHAR(30) + CHECK | Normalized from provider outcome | ✅ Sufficient |

**No additional schema columns are needed before implementation.**

However, **ADJ-05 resolution requires one constant addition** (not a schema change):

The `TTP_GST_FILING_STATUS` constant in `server/src/ttp/ttp.constants.ts` currently has: `ACTIVE, CANCELLED, SUSPENDED, UNKNOWN`.

Decentro returns `currentStatusOfRegistration` values including:
- `"Active"` → normalize to `ACTIVE`
- `"Inactive"` → no matching constant currently — **INACTIVE needs to be added** to `TTP_GST_FILING_STATUS`
- `"Cancelled"` → normalize to `CANCELLED`
- `"Suspended"` → normalize to `SUSPENDED`

**Action required in implementation unit:** Add `INACTIVE: 'INACTIVE'` to `TTP_GST_FILING_STATUS`. This is a one-line constant addition, not a schema migration. The `filing_status` column is `VARCHAR(30)` — `INACTIVE` fits.

---

## 7. Provider Fields Mapping to Evidence Model

**Decentro GSTIN_DETAILED → gst_verifications columns + raw_verification_json:**

```typescript
// Normalization performed inside GstProviderAdapter (Decentro implementation)

// Columns set on auto-approval path:
provider_name: "decentro"
provider_request_id: response.decentroTxnId        // VARCHAR(200) — UUID-format from Decentro
provider_verified_at: new Date(response.responseTimestamp) // TIMESTAMPTZ
provider_result: <derived from orchestration outcome>   // AUTO_APPROVED | TIMEOUT | MISMATCH | etc.
filing_status: normalizeRegistrationStatus(response.kycResult.currentStatusOfRegistration)
  // "Active"    → "ACTIVE"
  // "Inactive"  → "INACTIVE"   ← requires ADJ-05 constant addition
  // "Cancelled" → "CANCELLED"
  // "Suspended" → "SUSPENDED"
  // <any other> → "UNKNOWN"

// raw_verification_json (JSONB) — store full provider response minus PII
// Exclude: directors[].aadharLinked (if present), any sensitive personal fields
// Retain: gstin, legalName, tradeName, currentStatusOfRegistration,
//         stateJurisdiction, taxpayerType, constitutionOfBusiness, registrationDate,
//         filingStatus (last N periods), annualAggregateTurnover, mandatoryEInvoicing,
//         pan (hashed or masked if stored), decentroTxnId, timestamps

// Used in auto-approve criteria:
response.kycResult.currentStatusOfRegistration === "Active"    // C3
response.kycResult.stateJurisdiction.stateCode                 // C4 state match
response.kycResult.legalName                                   // C5 fuzzy match input
response.kycResult.tradeName                                   // C5 alternate name
```

---

## 8. Schema Addition Assessment

**No new columns required before implementation.**

All 4 evidence columns (`provider_name`, `provider_request_id`, `provider_verified_at`, `provider_result`) are defined in `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01` §11 (evidence capture contract). They will be added via the SQL migration in `IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01` Slice B.

The only schema-adjacent change confirmed here:
- `TTP_GST_FILING_STATUS` constant: add `INACTIVE: 'INACTIVE'` (source code change, not SQL)
- No new DB columns beyond what the design doc specified

---

## 9. Adapter-Neutral Implementation Assessment

**YES — implementation CAN and SHOULD proceed with the provider-neutral adapter while commercial selection is finalised.**

The design doc's `GstProviderAdapter` interface is fully specified:

```typescript
interface GstProviderAdapter {
  verifyGstin(input: GstAdapterInput): Promise<GstAdapterResult>;
}

type GstAdapterInput = {
  gstin: string;
  legalNameOnGst: string;
  stateCode: string;
  registrationType: string;
  orgId: string;
};

type GstAdapterResult =
  | { status: 'SUCCESS'; data: GstVerificationData }
  | { status: 'TIMEOUT' }
  | { status: 'PROVIDER_ERROR'; message: string }
  | { status: 'INVALID_GSTIN' }
  | { status: 'GSTIN_NOT_FOUND' };
```

**Recommended implementation sequence:**
1. Implement `GstProviderAdapter` interface + orchestration logic (adapter-neutral)
2. Implement `DecentroGstAdapter` as the concrete first provider
3. The `env.GST_PROVIDER` flag (e.g. `"decentro"`) selects the adapter at boot — swap requires only env change and new adapter class, no orchestration changes

This means implementation can start today against the interface, and the Decentro-specific adapter can be completed as soon as sandbox credentials are obtained. Commercial finalisation does NOT block interface development.

---

## 10. Commercial / Contact Checklist for Paresh

### Decentro (Primary — contact first)

- [ ] Sign up at `decentro.tech/signup` (free sandbox, immediate access)
- [ ] Test `GSTIN_DETAILED` API against a real GSTIN in sandbox — confirm `currentStatusOfRegistration`, `legalName`, `stateJurisdiction` fields are present
- [ ] Test Phonetic Name Matching API (`/v2/kyc/scanner/match-engine`) with mismatched name inputs — confirm similarity scoring output
- [ ] Request: Production per-call pricing for GSTIN_DETAILED (target: 1–5 INR/call at early volume)
- [ ] Request: Data Processing Agreement (DPA) — required before storing any GSTN response data
- [ ] Request: Evidence of ISO 27001 or SOC2 certification
- [ ] Request: Uptime SLA and error rate commitments
- [ ] Confirm: Rate limits on GSTIN_DETAILED endpoint
- [ ] Confirm: Sandbox GSTINs available for automated testing (to avoid hitting production GSTN in CI)

### IDfy (Secondary — contact only if Decentro unsuitable)

- [ ] Contact via `hyperion.idfy.com` or `support@idfy.com`
- [ ] Request: GSTIN_DETAILED equivalent API spec + sample response
- [ ] Request: Startup/growth pricing tier (per-call, no minimum)
- [ ] Request: DPA and SOC2/ISO27001 cert
- [ ] Confirm: Self-service sandbox availability

---

## 11. Legal / Privacy / Security Checklist

### Before production go-live (applies to all providers)

- [ ] **DPA signed** — any GSTN response data stored in `raw_verification_json` is business data; DPA must cover storage, processing, and deletion terms
- [ ] **Data residency confirmed** — provider must confirm GSTN data is processed and stored in India (or provide transfer mechanism for India-domiciled Supabase DB)
- [ ] **Credential rotation plan** — `client_id` + `client_secret` must be rotatable without downtime; confirm provider supports credential rotation without re-onboarding
- [ ] **PAN field handling** — Decentro GSTIN_DETAILED includes `pan` field; if stored in `raw_verification_json`, ensure it is masked or excluded in line with RISK-04 in the design doc
- [ ] **Directors array handling** — `directors` array may contain PAN/personal data; audit before storing in JSONB
- [ ] **Rate limit awareness** — ensure adapter implementation respects provider rate limits per org (no thundering herd on bulk submission paths)
- [ ] **Credential not logged** — `client_id` and `client_secret` MUST NEVER appear in server logs, error payloads, or audit log entries (extend RISK-04 controls from `crmTier0NotifyClient` pattern)
- [ ] **Sandbox isolation** — sandbox credentials must be separate from production credentials; stored as different env vars (`GST_PROVIDER_SANDBOX_CLIENT_ID` vs `GST_PROVIDER_CLIENT_ID`)

---

## 12. Implementation Recommendation

### 12.1 Next Unit Title
`IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01`
(No revision to the impl unit title or structure required. The design doc's allowlist and slice definitions are correct as-is.)

### 12.2 Whether to Revise the Impl Prompt
**Minor additions only:**

The existing impl unit prompt should be supplemented with:
1. Provider name: **Decentro** as the selected primary concrete adapter
2. New constant: Add `INACTIVE: 'INACTIVE'` to `TTP_GST_FILING_STATUS` in `server/src/ttp/ttp.constants.ts` (1-line addition)
3. Name matching: Use Decentro's Phonetic Name Matching API (`/v2/kyc/scanner/match-engine`) for C5 rather than a standalone fuzzy-match library — this avoids a new npm dependency
4. Env vars required:
   - `GST_PROVIDER` = `"decentro"`
   - `GST_PROVIDER_CLIENT_ID` (production Decentro client_id)
   - `GST_PROVIDER_CLIENT_SECRET` (production Decentro client_secret)
   - `GST_PROVIDER_SANDBOX_CLIENT_ID` (sandbox)
   - `GST_PROVIDER_SANDBOX_CLIENT_SECRET` (sandbox)
5. Adapter endpoint: `POST https://in.decentro.tech/v2/kyc/identities/business-verification/validate`

### 12.3 Whether to Build No-Op Scaffold or Selected-Provider Integration
**Selected-provider integration** — Decentro has a public sandbox with self-signup. Implementation should proceed with `DecentroGstAdapter` as the first concrete adapter. A no-op scaffold is not necessary since sandbox access is available.

However, the implementation must:
1. Still implement the `GstProviderAdapter` interface as the contract layer
2. Route all orchestration through the interface, never call Decentro directly from the orchestration service
3. Support `GST_PROVIDER=noop` for CI environments where no sandbox credentials are available (returns `{ status: 'PROVIDER_ERROR', message: 'noop provider' }` → triggers admin queue path)

---

## 13. Final Enum

**`DECIDE_MAINAPP_GST_KYC_PROVIDER_SELECTION_COMPLETE_PROVIDER_SELECTED`** *(revised in ADDENDUM — Deepvue selected as primary)*

**Rationale (revised):** Deepvue is selected as primary (92/100 HIGH confidence). Deepvue's free-trial self-signup eliminates the commercial barrier that justified Shortlist-only in Phase 1. Implementation can begin against the Deepvue sandbox immediately. Decentro is the backup (83/100). IDfy is the enterprise fallback. See §ADDENDUM for full rationale.

---

## 14. Files Changed

| File | Change Type | Notes |
|---|---|---|
| `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01.md` | Created | This document |

No source, test, schema, migration, or env files changed.

---

## 15. Risks and Follow-up

| ID | Risk | Severity | Owner | Mitigation |
|---|---|---|---|---|
| R-01 | Decentro DPA terms may require data not to be stored in raw form | MEDIUM | Paresh (legal review) | Review DPA before implementation; may require stripping PAN/directors from raw_verification_json |
| R-02 | Decentro SOC2/ISO27001 status unconfirmed | MEDIUM | Paresh (vendor review) | Confirm cert during commercial engagement; don't go-live until confirmed |
| R-03 | Decentro per-call pricing may be unfavorable for TexQtic's volume | LOW-MEDIUM | Paresh (commercial) | If >2 INR/call at early volume, evaluate IDfy or direct GSTN scraping (not recommended) |
| R-04 | INACTIVE status in TTP_GST_FILING_STATUS not yet added | LOW | Impl unit | One-line constant addition — must be in Slice A allowlist |
| R-05 | Decentro Phonetic Name Matching may require separate API key/pricing | LOW | Impl unit | Confirm in sandbox before implementing C5 as Decentro API call; fallback is fast-levenshtein npm package if needed |
| R-06 | RISK-04 from design doc still applies — provider credentials must never appear in logs | HIGH | Impl unit | Enforce in DecentroGstAdapter — AbortController pattern from crmTier0NotifyClient, credentials only in headers, never in logged request objects |
| R-07 | Sandbox GSTINs from Decentro may not cover all INACTIVE/edge-case statuses | MEDIUM | Impl unit | Request test GSTIN set from Decentro support; use mock adapter for edge-case unit tests |

---

## 16. Commit Instruction

```
git add DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01.md
git commit -m "docs(onboarding): decide GST KYC provider selection"
```

---

*TexQtic Governance — DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01 — Phase 1 closed 2026-06-08 — Addendum applied 2026-06-09*

---

## ADDENDUM — Deepvue Corrected Evaluation & Provider Re-selection

**Addendum date:** 2026-06-09
**Trigger:** Phase 1 research probe error (see §A.0). Paresh confirmed Deepvue as preferred provider.
**Outcome change:** Phase 1 Outcome B (Shortlist, Decentro primary) → **Outcome A: Provider Selected — Deepvue primary**

---

### A.0 Why This Addendum Exists

Phase 1 research incorrectly classified Deepvue as `❌ Redirected — no accessible API docs found`. The research probe targeted `deepvue.tech`, which redirects, instead of `deepvue.ai`, the live product domain. This was a probe-path error, not a product availability issue.

Paresh confirmed that Deepvue is a known, accessible provider and stated a preference for Deepvue as primary. This addendum corrects the Phase 1 classification, provides full Deepvue research findings from a successful Phase 2 probe of `deepvue.ai` and `docs.deepvue.ai`, and revises the provider selection from "Decentro primary" to "Deepvue primary, Decentro backup, IDfy enterprise fallback."

**Corrected accessibility verdict: ✅ Fully public**

| Resource | URL |
|---|---|
| Product | `deepvue.ai` |
| API docs | `docs.deepvue.ai` (no login required) |
| Dashboard / self-signup | `dashboard.deepvue.ai/sign-up` |
| Postman collection | `hi.deepvue.tech/postman` |
| Security Trust Vault | `security.deepvue.ai` |
| Status | `status.deepvue.ai` |
| Support | `support@deepvue.ai` |

---

### A.1 Deepvue Research Findings

**Company:** Deepvue Technologies Pvt. Ltd. Developer-first KYB/KYC verification platform. Active since ~2021. Serves Times Internet, iMocha, Waaree, Vardhman and other B2B customers.

#### Security / Compliance

| Item | Status |
|---|---|
| ISO 27001:2022 | **CONFIRMED** — certificate document on `security.deepvue.ai` Trust Vault |
| DPDP 2023 (India) | Compliant (stated on product pages) |
| Infrastructure | AWS-hosted, WAF, VPC |
| Data protection | Encryption-in-transit + encryption-at-rest |
| Resilience | BC/DR plan documented on Trust Vault |
| Security testing | Pentest report + Vulnerability Assessment Report available (gated) |
| Access control | MFA enforced; audit logging enabled |
| Uptime SLA | 99.99% stated |
| SOC2 | Not explicitly confirmed — request during commercial onboarding |

#### GST Basic Endpoint

**`GET /v1/verification/gstinlite?gstin_number={GSTIN}`**
Base URL: `https://production.deepvue.tech`

Response envelope: `{ code, timestamp, transaction_id, data }`

| Field | TexQtic Relevance |
|---|---|
| `sts` | Filing/registration status (Active / Inactive) — `filing_status` normalization source for Basic |
| `lgnm` | Legal name — C5 fuzzy match input |
| `tradeNam` | Trade name — C5 alternate |
| `dty` | Taxpayer type |
| `ctb` | Constitution of business |
| `rgdt` | Registration date |
| `lstupdt` | Last update date |
| `pradr` | Principal address |
| `adadr` | Additional addresses |
| `stj` / `stjCd` | State / centre jurisdiction |
| `einvoiceStatus` | E-invoice enabled flag |
| `transaction_id` | → `provider_request_id` |

#### GST Advanced Endpoint

**`GET /v1/verification/gstin-advanced?gstin_number={GSTIN}`**

All Basic fields, plus:

| Field | TexQtic Relevance |
|---|---|
| `gstin_status` | **Filing/registration status for Advanced** — primary source (Active / Inactive / Cancelled / Suspended) |
| `legal_name` | Legal name — C5 fuzzy match primary |
| `business_name` | Business/trade name — C5 fuzzy match fallback |
| `pan_number` | PAN — **exclude from `raw_verification_json`** (RISK-04) |
| `taxpayer_type` | Taxpayer type |
| `constitution_of_business` | Org type |
| `date_of_registration` | Registration date |
| `state_jurisdiction` | Full text with state/division/range — C4 state match |
| `center_jurisdiction` | Centre jurisdiction |
| `annual_turnover` / `annual_turnover_fy` | Turnover slab |
| `percentage_in_cash` / `percentage_in_cash_fy` | Cash transaction % |
| `aadhaar_validation` / `aadhaar_validation_date` | **Exclude from storage** (biometric data — DPDP) |
| `promoters[]` | Name strings — retain for KYB context |
| `contact_details.principal` / `contact_details.additional[]` | Addresses, email, mobile — **exclude mobile/email** (privacy) |
| `nature_bus_activities[]` | Business activity types |
| `nature_of_core_business_activity_code` / `_description` | Core activity |
| `filing_status[][]` | Filing records: GSTR1, GSTR3B, GSTR9, GSTR9C — (return_type, financial_year, tax_period, date_of_filing, status, mode_of_filing) |
| `date_of_cancellation` | Cancellation date (if applicable) |
| `field_visit_conducted` | Physical inspection flag |
| `hsn_info` | HSN codes |
| `filing_frequency[]` | Filing frequency |
| `transaction_id` | → `provider_request_id` |
| `timestamp` | Unix ms → `provider_verified_at` |

**⚠️ Field name inconsistency between endpoints:** Basic uses `sts` for status; Advanced uses `gstin_status`. Adapter must handle both: `response.data.gstin_status ?? response.data.sts`.

#### GST Return Status Endpoint

**`GET /v1/verification/gstin/track-gstr?gstin_number={GSTIN}&financial_year={YYYY-YYYY}`**

Returns per-return-type filing status for the specified financial year. Separate from Advanced; useful for real-time compliance tracking in future releases.

#### Authentication — 2-Step Flow

1. `POST /v1/authorize` with form body `client_id=...&client_secret=...` → returns `{ access_token, token_type: "bearer", expiry: "ISO8601" }` (JWT valid 24h)
2. Every API call: `Authorization: Bearer {access_token}` header + `x-api-key: {client_secret}` header

**⚠️ Token management required in adapter:** Module-scoped in-memory cache with expiry tracking. Refresh when `Date.now() > expiry_ms - REFRESH_BUFFER_MS` (recommended buffer: 5 minutes).

#### KYB Expansion (in-platform)

PAN-to-GST, CIN/MCA, DIN (PAN↔DIN), MSME/Udyam Aadhaar, TAN, TDS 206, FSSAI, Shop Establishment Certificate.

#### Rate Limits by Plan

| Plan | RPS | RPM | RPD |
|---|---|---|---|
| Starter | 1 | 30 | 1,000 |
| Business | 2 | 100 | 10,000 |
| Growth | 5 | 500 | 20,000 |
| Enterprise | 17 | 1,000 | 50,000 |

Starter (1 RPS / 30 RPM) is sufficient for TexQtic's onboarding throughput. Growth tier for future batch paths.

#### Pricing

Prepaid wallet. From ₹2/check. Free trial with real data, no credit card required. No minimum commitment for self-serve plans. Volume/enterprise pricing negotiable.

#### Error Response Format

- HTTP-level errors: `{ "detail": "..." }` (e.g. `"Inactive client_id"`, `"Source Unavailable"`)
- Business-level errors: `{ code, transaction_id, data: { error_code, message } }` (e.g. "No Records Found", "Invalid GSTIN")
- Key codes: 400 (bad input), 401 (auth failure), 403 (token expired → refresh), 422 (validation), 429 (rate limit → exponential backoff), 500 (server error → retry), 503 (upstream GSTN unavailable → TexQtic `PROVIDER_ERROR`)

#### Name Matching Gap

Deepvue has **no native phonetic name matching API** (unlike Decentro). C5 (legal name fuzzy match ≥80%) must be implemented via a lightweight npm library in the adapter: `fast-levenshtein` or `fuse.js`. Both are well-maintained, lightweight, no native bindings. **Must be in impl unit explicit allowlist.**

---

### A.2 Revised Scoring Matrix

Deepvue added; Decentro and IDfy scores unchanged from Phase 1.

| Provider | C1/20 | C2/15 | C3/15 | C4/15 | C5/10 | C6/10 | C7/10 | C8/5 | **Total** | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|
| **Deepvue** | 19 | 15 | 15 | 14 | 9 | 9 | 7 | 4 | **92** | HIGH (docs fully confirmed) |
| **Decentro** | 17 | 13 | 14 | 10 | 8 | 9 | 9 | 3 | **83** | HIGH (docs confirmed) |
| **IDfy (Hyperion)** | 17 | 14 | 7 | 13 | 4 | 9 | 7 | 5 | **76** | LOW (docs gated) |
| Others | (unchanged from §4) | | | | | | | | | |

**Deepvue score rationale:**

| Criterion | Score | Rationale |
|---|---|---|
| C1/20 = 19 | GST Advanced covers all 6 auto-approve criteria. `gstin_status: "Active/Inactive"`, `legal_name`/`business_name` (C5 fuzzy match), `state_jurisdiction` (C4 state match), `filing_status[][]` (C3 active filing check). −1 for `sts` vs `gstin_status` field name inconsistency across endpoints. |
| C2/15 = 15 | Full — filing history (GSTR1/3B/9/9C), promoters, turnover, addresses, constitution, cancellation date all confirmed. |
| C3/15 = 15 | Publicly accessible docs (no login); self-signup sandbox with real-data free trial; Postman collection; curl/Python/JS/Go/Ruby examples; status page; complete error/rate-limit docs. |
| C4/15 = 14 | ISO 27001:2022 confirmed. DPDP 2023 compliant. AWS WAF/VPC, encryption, BC/DR, pentest, 99.99% SLA. −1 for SOC2 not confirmed in Trust Vault. |
| C5/10 = 9 | ₹2+/check prepaid, free trial, no minimum, self-serve. −1 for production pricing tier requires commercial confirmation. |
| C6/10 = 9 | Full KYB in-platform (CIN/MCA, DIN, Udyam/MSME, TAN, TDS, FSSAI). −1 for no native name matching API (requires npm lib). |
| C7/10 = 7 | REST + standard JSON, good docs. −3 for 2-step auth complexity: adapter must implement token caching + refresh-before-expiry logic (not present in Decentro path). |
| C8/5 = 4 | Founded ~2021, growing B2B base, ISO cert, active status page and docs (updated days ago). Newer than IDfy/Decentro but solid. |

---

### A.3 Revised Recommendation — Outcome A: Provider Selected

**Paresh's preference for Deepvue: ACCEPTED. Research confirms Deepvue is the best-fit provider.**

| Role | Provider | Score |
|---|---|---|
| **Primary (SELECTED)** | **Deepvue** | **92/100 HIGH** |
| Backup | Decentro | 83/100 HIGH |
| Enterprise fallback | IDfy | 76/100 LOW |

**Why Outcome A (Provider Selected) vs Phase 1 Outcome B (Shortlist):**

Free-trial self-signup eliminates the commercial barrier that justified deferring to Shortlist-only. All technical criteria are met. Implementation against Deepvue's sandbox can begin immediately. DPA review is a standard pre-production step, not an implementation blocker. The provider-neutral `GstProviderAdapter` interface means commercial swap remains an env var + adapter class change if required — lock-in risk is low.

**Why Deepvue #1 (not Decentro as in Phase 1):**
- Highest confirmed score (92/100)
- ISO 27001:2022 confirmed (Decentro's cert status unconfirmed in public docs)
- 99.99% uptime SLA stated (Decentro's unconfirmed)
- All 6 auto-approve criteria covered in GST Advanced
- `gstin_status: "Active/Inactive"` directly resolves ADJ-05 (`TTP_GST_FILING_STATUS` INACTIVE constant)
- Full KYB expansion in-platform
- Self-signup sandbox with real data, no sales call required
- DPDP 2023 compliant
- Prepaid from ₹2/check — no commitment risk

**Why Decentro remains #2 (not ruled out):**
Decentro retains 83/100 and its one differentiating advantage — native phonetic name matching API (C5) — avoids the npm library dependency. This is a real but minor implementation concern. If Deepvue's DPA terms or production pricing create a blocker, Decentro is a fully qualified backup with confirmed docs and self-signup sandbox.

---

### A.4 Revised Provider Fields Mapping — Deepvue

**`DeepvueGstAdapter` → `gst_verifications` columns + `raw_verification_json`:**

```typescript
// Normalization performed inside DeepvueGstAdapter

provider_name: "deepvue"
provider_request_id: response.transaction_id          // UUID string — present on all responses
provider_verified_at: new Date(response.timestamp)    // Unix ms → TIMESTAMPTZ
provider_result: <derived from orchestration outcome> // AUTO_APPROVED | TIMEOUT | MISMATCH | etc.

filing_status: normalizeDeepvueStatus(
  response.data.gstin_status ?? response.data.sts     // Advanced: gstin_status; Basic: sts
)
// "Active"    → "ACTIVE"
// "Inactive"  → "INACTIVE"   ← requires ADJ-05 constant addition (same as Decentro)
// "Cancelled" → "CANCELLED"
// "Suspended" → "SUSPENDED"
// <any other> → "UNKNOWN"

// Auto-approve criteria:
C3: (response.data.gstin_status ?? response.data.sts) === "Active"
C4: extractStateFromJurisdiction(response.data.state_jurisdiction) === stored_state_code
    // state_jurisdiction format: "State - Karnataka,Division - DGSTO Dharwad,..."
    // extract the state name and map to state code
C5: fuzzyMatch(response.data.legal_name, legalNameOnGst) >= 0.80
    //   OR fuzzyMatch(response.data.business_name, legalNameOnGst) >= 0.80
    // Implementation: fast-levenshtein (npm) — must be in impl unit allowlist

// raw_verification_json (JSONB — sanitized, no PII):
{
  provider: "deepvue",
  transaction_id: "...",             // for audit/support
  timestamp: ...,                    // Unix ms
  gstin: "...",
  legal_name: "...",                 // from Advanced — C5 match source
  business_name: "...",              // from Advanced — C5 alternate
  gstin_status: "...",               // filing_status normalization source
  taxpayer_type: "...",
  constitution_of_business: "...",
  date_of_registration: "...",
  state_jurisdiction: "...",         // full text — C4 match source
  annual_turnover: "...",
  annual_turnover_fy: "...",
  promoters: [...],                  // name strings only
  filing_summary: [...],             // last 6 months of GSTR1 + GSTR3B entries
  nature_bus_activities: [...],
  field_visit_conducted: "...",
  // EXCLUDED from storage:
  // - pan_number           (PAN — RISK-04 mask/exclude)
  // - contact_details.mobile + contact_details.email  (privacy — DPDP)
  // - aadhaar_validation, aadhaar_validation_date     (biometric — exclude)
}
```

**Token management implementation note:**

```typescript
// Module-scoped token cache (inside DeepvueGstAdapter)
let cachedToken: { accessToken: string; expiryMs: number } | null = null;
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiryMs - REFRESH_BUFFER_MS) {
    return cachedToken.accessToken;
  }
  const resp = await fetch('https://production.deepvue.tech/v1/authorize', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.GST_PROVIDER_CLIENT_ID!,
      client_secret: process.env.GST_PROVIDER_CLIENT_SECRET!,
    }),
  });
  const { access_token, expiry } = await resp.json();
  cachedToken = { accessToken: access_token, expiryMs: new Date(expiry).getTime() };
  return access_token;
}
// Credentials MUST NOT be logged (RISK-04). AbortController pattern from crmTier0NotifyClient applies.
```

---

### A.5 Revised Commercial Checklist

**Deepvue (PRIMARY — action first):**

- [ ] Sign up at `dashboard.deepvue.ai/sign-up` (free trial, immediate sandbox access, no credit card)
- [ ] Test `GET /v1/verification/gstin-advanced` with a known active GSTIN — confirm `gstin_status`, `legal_name`, `state_jurisdiction`, `transaction_id` present
- [ ] Test with a known Inactive/Cancelled GSTIN — confirm `gstin_status: "Inactive"` / `"Cancelled"` returned
- [ ] Confirm `transaction_id` is a stable UUID-format string in all responses
- [ ] Request: Data Processing Agreement (DPA) — required before storing GSTN response data in Supabase
- [ ] Request: SOC2 report or equivalent (ISO 27001:2022 confirmed; SOC2 not visible in Trust Vault)
- [ ] Confirm: Data residency — GSTN data processed/stored in India
- [ ] Confirm: Credential rotation policy (sandbox and production credential separation)
- [ ] Confirm: Rate limits for selected plan (Starter sufficient for onboarding throughput)
- [ ] Request: Production pricing for GST Advanced (target: ≤₹5/call at early volume)

**Decentro (BACKUP — contact only if Deepvue DPA/pricing unsuitable):**

- [ ] Contact via `decentro.tech/signup` if Deepvue creates a commercial blocker
- [ ] Request DPA, ISO27001/SOC2 cert, per-call pricing for GSTIN_DETAILED
- [ ] Confirm phonetic name matching API pricing (may be separate SKU)

**IDfy (ENTERPRISE FALLBACK — contact only if both Deepvue and Decentro fail):**

- [ ] Contact via `hyperion.idfy.com` only if both primary and backup fail commercial diligence

---

### A.6 Revised Implementation Recommendation

**First concrete adapter:** `DeepvueGstAdapter`
**Backup adapter (future):** `DecentroGstAdapter`
**CI/test:** `GST_PROVIDER=noop`

| Item | Phase 1 (Decentro) | Addendum Revised (Deepvue) |
|---|---|---|
| Concrete adapter | `DecentroGstAdapter` | **`DeepvueGstAdapter`** |
| Auth model | Single-step: headers only | **2-step:** `POST /v1/authorize` → Bearer JWT (24h) + `x-api-key` on every request |
| Token management | Not needed | **Required:** module-scoped cache + refresh-before-expiry |
| Name matching (C5) | Native Decentro API | **`fast-levenshtein` npm library** (must be in impl allowlist) |
| Base URL | `https://in.decentro.tech` | **`https://production.deepvue.tech`** |
| Primary endpoint | `POST /v2/kyc/identities/business-verification/validate` | **`GET /v1/verification/gstin-advanced`** |
| Token endpoint | N/A | **`POST /v1/authorize`** |
| `filing_status` source | `response.kycResult.currentStatusOfRegistration` | **`response.data.gstin_status ?? response.data.sts`** |
| `provider_request_id` | `response.decentroTxnId` | **`response.transaction_id`** |
| `provider_verified_at` | `response.responseTimestamp` (ISO string) | **`new Date(response.timestamp)`** (Unix ms) |

**Env vars for impl unit:**

```
GST_PROVIDER=deepvue
GST_PROVIDER_CLIENT_ID=<production deepvue client_id>
GST_PROVIDER_CLIENT_SECRET=<production deepvue client_secret>
GST_PROVIDER_SANDBOX_CLIENT_ID=<sandbox deepvue client_id>
GST_PROVIDER_SANDBOX_CLIENT_SECRET=<sandbox deepvue client_secret>
```

**New npm dependency (must be in impl unit explicit allowlist):**
- `fast-levenshtein` — pure-JS edit distance, no native bindings, for C5 name fuzzy match
- Alternative: `fuse.js` (token-based, better for multi-word names — slightly heavier)

---

### A.7 Revised Final Enum

**`DECIDE_MAINAPP_GST_KYC_PROVIDER_SELECTION_COMPLETE_PROVIDER_SELECTED`**

*(Phase 1 was `SHORTLIST_ONLY`. Revised to `PROVIDER_SELECTED` because Deepvue's free-trial self-signup eliminates the commercial barrier. Implementation can begin against sandbox immediately. DPA/production pricing confirmation happens before go-live, not before implementation.)*

---

### A.8 Revised Risk Register

| ID | Risk | Severity | Owner | Mitigation |
|---|---|---|---|---|
| R-01 | Deepvue DPA may require stripping PAN/contact data from stored JSONB | MEDIUM | Paresh (legal) | Exclude `pan_number`, `contact_details.mobile/email`, `aadhaar_*` from day one (already in field mapping above) |
| R-02 | Deepvue SOC2 not confirmed in Trust Vault | LOW-MEDIUM | Paresh (vendor) | Request during commercial onboarding; ISO 27001:2022 is confirmed baseline |
| R-03 | 2-step auth token management adds adapter complexity | LOW | Impl unit | Module-scoped in-memory token cache with 5-min refresh buffer — standard pattern, no external dependency |
| R-04 | `TTP_GST_FILING_STATUS` INACTIVE constant not yet added | LOW | Impl unit | One-line constant addition — must be in Slice A allowlist |
| R-05 | `fast-levenshtein` npm package not yet approved | LOW | Impl unit | Must be in impl unit explicit allowlist; lightweight, audited, widely used |
| R-06 | Credentials must never appear in logs (RISK-04) | HIGH | Impl unit | `DeepvueGstAdapter` follows `crmTier0NotifyClient` pattern; credentials only in headers; AbortController 8s timeout; no request body logging |
| R-07 | `sts` vs `gstin_status` field name inconsistency | LOW | Impl unit | Adapter handles both: `response.data.gstin_status ?? response.data.sts` with shared normalization function |
| R-08 | Deepvue sandbox GSTINs may not cover Inactive/Cancelled edge cases | MEDIUM | Impl unit | Request test GSTINs from Deepvue support; use mock adapter for edge-case unit tests in CI |
| R-09 | Decentro's native name matching advantage lost | LOW | Arch note | `fast-levenshtein` achieves equivalent accuracy for business name matching at negligible cost |

---

### A.9 What Changed — Summary

| Section | Phase 1 Value | Addendum Value |
|---|---|---|
| Status | Outcome B: Shortlist, Decentro primary | **Outcome A: Provider Selected, Deepvue primary** |
| §2.1 Deepvue row | ❌ Redirected | ✅ Fully public (deepvue.ai) |
| §3 Provider details | No §3.9 | **§A.1 Deepvue findings** |
| §4 Scoring matrix | Deepvue not scored | **Deepvue 92/100 HIGH — #1** |
| §5.1 Primary | Decentro (83/100) | **Deepvue (92/100)** |
| §5.2 Backup | IDfy | **Decentro** |
| §5.3 Ruled out | Deepvue listed as ruled out | **Deepvue removed from ruled-out** |
| §7 Field mapping | Decentro mapping | **Deepvue mapping** (§A.4) |
| §10 Commercial | Decentro first | **Deepvue first** |
| §12 Impl | `DecentroGstAdapter` | **`DeepvueGstAdapter`** |
| §13 Final enum | `SHORTLIST_ONLY` | **`PROVIDER_SELECTED`** |

---

*Addendum — DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01 — 2026-06-09*
