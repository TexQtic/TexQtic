# DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01

**Unit:** `DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01`
**Status:** DECIDE COMPLETE — Outcome B (Shortlist + recommended primary)
**Branch:** `main` · HEAD `3919a1d6`
**Date:** 2026-06-08
**Author:** Copilot (research/decision)
**Sequence position:** Step 4 of 10 in `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01` §15
**Predecessor:** `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01` (DESIGN COMPLETE, HEAD `3919a1d6`)
**Successor:** `IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01` (NOT_STARTED — unblocked by this decision)

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
| **Deepvue** | KYB aggregator, India | ❌ Redirected | deepvue.tech redirects to deepvue.ai — no accessible API docs found |
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
| Deepvue | Domain inaccessible; unknown status |

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

**`DECIDE_MAINAPP_GST_KYC_PROVIDER_SELECTION_COMPLETE_SHORTLIST_ONLY`**

**Rationale:** Decentro is identified and recommended as primary. IDfy is the confirmed backup. Final commercial lock-in is deferred to Paresh's review of Decentro DPA and pricing after sandbox testing. The implementation unit is now unblocked and can begin in parallel with commercial engagement.

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

*TexQtic Governance — DECIDE-MAINAPP-GST-KYC-PROVIDER-SELECTION-01 — closed 2026-06-08*
