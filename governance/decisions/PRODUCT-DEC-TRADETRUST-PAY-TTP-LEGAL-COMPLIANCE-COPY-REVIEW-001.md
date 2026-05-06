# PRODUCT-DEC-TRADETRUST-PAY-TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001

**Unit ID:** `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`  
**Document type:** Governance / legal copy review — non-code artifact  
**Date:** 2026-05-05  
**Decision Owner:** Paresh Patel (TexQtic founder / operator)  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**`ttp_enabled` state:** `false` — UNCHANGED by this document  
**Code changes:** None — this is a governance/legal review artifact only  
**Schema / migration changes:** None  
**Activation:** None — this document does not authorize or request TTP activation  

> **OPERATOR REVIEW ARTIFACT ONLY.** This document captures the current copy inventory, interim
> disclaimer analysis, forbidden-language list, and safe-language patterns for TTP readiness surfaces.
> Legal copy status is `LEGAL_REVIEW_PENDING` throughout. No wording in this document is approved for
> public or partner use until Paresh provides formal legal sign-off. All proposed final text is a
> candidate only.

---

## 1. Purpose and Scope

This artifact fulfils the governance requirement of `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` as
defined in:
- `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` §8
- Phase 2 scoping artifact §7 (Legal Gate)
- `PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` TQ-20 approved option

### What this document covers

| Section | Topic |
|---|---|
| §2 | Current copy inventory — all TTP readiness surfaces |
| §3 | Interim disclaimer analysis — current `TTP_DISCLAIMER_TEXT` |
| §4 | Proposed final disclaimer text — candidate only, `LEGAL_REVIEW_PENDING` |
| §5 | Forbidden language list — must not appear in any TTP surface |
| §6 | Required safe language patterns — operator-approved phrasings |
| §7 | VPC certificate / verified package wording |
| §8 | Score advisory wording |
| §9 | Consent / data-sharing wording placeholders (Wave 3) |
| §10 | Partner / finance wording placeholders (Wave 4) |
| §11 | Fee / origination wording placeholders (Wave 5) |
| §12 | Recommended follow-up units |
| §13 | Final decision |

### What this document does NOT cover

- No code changes, no schema changes, no migrations, no SQL, no env changes
- No feature flag changes (`ttp_enabled` remains `false`)
- No new routes, services, middleware, UI components, or tests
- No opening of Wave 2, Wave 3, Wave 4, or Wave 5 implementation units
- No legal approval (Paresh has not provided formal legal sign-off in this document)
- No partner transmission, no payment behavior, no lending behavior

---

## 2. Current Copy Inventory

This section audits all TTP readiness copy surfaces as of Wave 0 completion (commit `62fb7fe`).

### 2.1 `TTP_DISCLAIMER_TEXT` constant

| Field | Value |
|---|---|
| **Location** | `server/src/ttp/ttp.constants.ts` (line ~307) |
| **Current text** | `"TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment."` |
| **Status** | `INTERIM` — placeholder pending legal review |
| **Surfaces** | `TtpSummary.advisory_disclaimer` (ttpSummary.service.ts); `TtpEnrollmentRecord.advisory_disclaimer` (ttpEnrollment.service.ts) |
| **Test coverage** | TC-028 (ttp-summary.service.unit.test.ts); TC-019 (ttp-enrollment.service.unit.test.ts) |

### 2.2 `SCORE_DISCLAIMER` constant

| Field | Value |
|---|---|
| **Location** | `server/src/services/ttpScore.service.ts` (line ~106, inline constant) |
| **Current text** | `"TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment."` |
| **Status** | `INTERIM` — separate from `TTP_DISCLAIMER_TEXT`; should be extracted to `ttp.constants.ts` in a future unit |
| **Surfaces** | `TradeTrustScore.disclaimer` field in every score response |
| **Test coverage** | ttp-score.service.unit.test.ts (asserts presence and exact text) |

### 2.3 `advisory_disclaimer` response field surfaces

| Route / Service | Type | Confirmed Present |
|---|---|---|
| `GET /api/tenant/trades/:tradeId/ttp-summary` | `TtpSummary.advisory_disclaimer` | ✅ TTP-IMPL-005 TRUTH_SYNCED |
| `GET /api/tenant/trades/:tradeId/enrollment` | `TtpEnrollmentRecord.advisory_disclaimer` | ✅ TTP-IMPL-005 TRUTH_SYNCED |
| `POST /api/control/trades/:tradeId/enrollment` | `TtpEnrollmentRecord.advisory_disclaimer` | ✅ TTP-IMPL-005 TRUTH_SYNCED |
| `TradeTrustScore.disclaimer` (inside TtpSummary) | Embedded in score object | ✅ Slice 8 TRUTH_SYNCED |

### 2.4 VPC-related wording (current state)

| Surface | Current wording / behavior | Notes |
|---|---|---|
| VPC state keys | `DRAFT`, `ISSUED`, `ACTIVE`, `TRANSMITTED`, `REVOKED`, `EXPIRED` | Lifecycle states only — no financial language |
| VPC display label | No public display label yet (no UI component) | No wording risk at this stage |
| VPC eligibility error | `EnrollmentReviewEligibilityExpiredError`, `VpcEligibilityExpiredError` | Internal error types — not user-facing text |
| VPC monitoring event | `ttp.vpc.generate.error`, `ttp.eligibility.expired` | Pino log fields — not user-facing |

### 2.5 Eligibility / enrollment wording (current state)

| Surface | Current wording / behavior | Notes |
|---|---|---|
| Enrollment review outcomes | `APPROVED`, `REJECTED` (internal constants) | Not user-facing text currently |
| GST review outcome | `APPROVED`, `REJECTED`, `PENDING` (internal constants) | Not user-facing text currently |
| Risk tier label | `risk_tier: number` (0–3, numeric) | Not labeled in user-facing output currently |
| Score band | `READY`, `NEAR_READY`, `NEEDS_REVIEW`, `NOT_READY` | Advisory readiness indicator bands only |

### 2.6 No partner / finance copy exists

| Surface | Status |
|---|---|
| Partner routing label | `partner_routing_stubs` — Phase 1 readiness evidence only; no user-facing label |
| Finance request copy | No `ttp_finance_requests` table; no copy |
| Partner offer copy | No `ttp_partner_offers` table; no copy |
| Dynamic discounting copy | Not yet designed |
| Fee disclosure copy | Not yet designed |

---

## 3. Interim Disclaimer Analysis

### 3.1 `TTP_DISCLAIMER_TEXT` — current text review

**Current text:**
> "TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score,
> financing approval, payment guarantee, lending decision, or partner commitment."

**Analysis:**

| Criterion | Assessment |
|---|---|
| Avoids "credit score" implication | ✅ Explicitly states "not a credit score" |
| Avoids "financing approval" implication | ✅ Explicitly stated |
| Avoids "payment guarantee" implication | ✅ Explicitly stated |
| Avoids "lending decision" implication | ✅ Explicitly stated |
| Avoids "partner commitment" implication | ✅ Explicitly stated |
| Uses "advisory only" framing | ✅ Present |
| Uses "informational" framing | ✅ Present |
| Mentions "readiness signals" (not "score") | ✅ Uses "readiness signals" — safer than "score" in top-level disclaimer |
| DPDP data minimization language | ❌ Not present — consent / data minimization language not yet in place (Wave 3) |
| Regulatory safe harbor language | ❌ Not present — pending formal legal review |
| Plain language accessibility | ⚠️ Acceptable for operator review; may need simplification for consumer surfaces |

**Interim verdict:** Suitable for internal operator-testing and development use. Not cleared for public
production surfaces, partner presentations, or regulatory submissions without formal legal review.

### 3.2 `SCORE_DISCLAIMER` — current text review

**Current text:**
> "TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment
> guarantee, financing approval, or partner commitment."

**Analysis:**

| Criterion | Assessment |
|---|---|
| "advisory readiness indicator only" framing | ✅ Clear |
| Not a "credit score" | ✅ Explicitly stated |
| Not a "payment guarantee" | ✅ Explicitly stated |
| Not a "financing approval" | ✅ Explicitly stated |
| Not a "partner commitment" | ✅ Explicitly stated |
| Does not use "score" in a bureau-equivalent sense | ⚠️ Uses "TradeTrust Score" as product name — the product name itself contains "Score"; disclaimer mitigates but does not eliminate potential for misinterpretation |
| CIBIL / bureau equivalence language | ✅ Absent (none present) |
| Consolidation with `TTP_DISCLAIMER_TEXT` | ⚠️ Two separate disclaimer strings exist. Consolidation into `ttp.constants.ts` recommended as a future unit — do not merge in this artifact. |

---

## 4. Proposed Final Disclaimer Text

> **Status: `LEGAL_REVIEW_PENDING`** — All text below is a candidate proposal only. No text in this
> section is approved for production, partner, or regulatory use without formal Paresh legal sign-off.

### 4.1 Proposed `TTP_DISCLAIMER_TEXT` (candidate)

**Candidate text (maintaining current structure, minor tightening):**

> "TradeTrust Pay readiness signals are informational and advisory only. They do not constitute a
> credit score, financing approval, payment guarantee, underwriting decision, lending commitment, or
> partner agreement. TexQtic does not lend, hold funds, guarantee payments, or act as a payment
> intermediary."

**Changes from current interim text:**
- Added "underwriting decision" to the negative list (addresses regulatory framing risk)
- Changed "lending decision" → "lending commitment" (clearer separation from underwriting)
- Added explicit TexQtic capability boundary sentence (TexQtic does not lend / hold funds)
- Removed "partner commitment" → replaced with "partner agreement" (more precise)

**Recommended before finalization:**
- [ ] Review by qualified legal counsel familiar with Indian fintech / DPDP / GSTN regulatory context
- [ ] Confirm alignment with RBI Digital Lending Guidelines (if applicable to TTP surfaces)
- [ ] Confirm "underwriting decision" is the right term for Indian regulatory framing
- [ ] Review plain-language accessibility for non-English-primary users

### 4.2 Proposed `SCORE_DISCLAIMER` (candidate)

**Candidate text:**

> "TradeTrust Score is a platform-internal advisory readiness indicator only. It is not a credit
> bureau score, CIBIL score, underwriting output, credit approval, payment guarantee, or financing
> approval. It does not represent a regulatory assessment of any kind."

**Changes from current interim text:**
- Added "platform-internal" — prevents misunderstanding as an external bureau output
- Added "CIBIL score" explicitly (addresses Indian market specificity)
- Added "underwriting output" — more precise than "payment guarantee" for this use case
- Added "credit approval" — commonly misunderstood in SME lending contexts
- Added regulatory non-assessment sentence

**Recommended before finalization:**
- [ ] Same legal review as `TTP_DISCLAIMER_TEXT`
- [ ] Confirm "CIBIL" is appropriate to name (may imply capability proximity without clarifying non-use)
- [ ] Consider whether to name specific bureaus or use generic "credit bureau score"

---

## 5. Forbidden Language List

The following terms and phrases MUST NOT appear in any TTP user-facing surface, API response field
value, UI label, email template, notification, partner-facing document, or marketing material.

> **This list is the operator-approved minimum.** Legal review may expand it. No exceptions without
> explicit Paresh sign-off and update to this document.

### 5.1 Credit / lending / underwriting language

| Forbidden term / phrase | Reason |
|---|---|
| "credit score" | Implies bureau-equivalent regulated credit assessment |
| "credit rating" | Regulated term; implies credit bureau function |
| "CIBIL score" | Third-party bureau brand; TexQtic is not a CIBIL partner |
| "credit approved" / "credit approval" | Implies lending decision |
| "pre-approved" (in finance context) | Implies credit pre-screening; regulated activity |
| "underwriting decision" | Regulated lending term |
| "underwriting approved" | Regulated lending term |
| "risk score" | Too close to regulated credit risk scoring |
| "creditworthy" / "creditworthiness" | Implies regulated credit assessment function |
| "loan approved" / "loan eligibility" | Lending language; TexQtic does not lend |
| "finance approved" | Implies lending approval |
| "financing decision" | Implies credit underwriting |

### 5.2 Payment / settlement / custody language

| Forbidden term / phrase | Reason |
|---|---|
| "guaranteed payment" / "payment guarantee" | TexQtic does not guarantee payment |
| "payment assured" | Implies guarantee |
| "payment protection" | Implies guarantee or insurance |
| "funds held" / "funds in escrow" | TexQtic does not hold or manage funds |
| "funds disbursed by TexQtic" | TexQtic does not disburse funds |
| "settlement guaranteed" | TexQtic is not a settlement intermediary |
| "payment intermediary" | TexQtic is not a payment aggregator or PSP |
| "NACH mandate" (without explicit mandate) | Implies direct debit authority |
| "auto-debit" (without explicit mandate) | Implies funds movement authority |

### 5.3 Partner / regulatory commitment language

| Forbidden term / phrase | Reason |
|---|---|
| "partner commitment" | Implies signed partner obligation |
| "lender commitment" | Implies offer from a licensed lender |
| "offer from [partner name]" (without confirmed offer) | Implies binding partner offer |
| "TReDS-registered" | TexQtic is not a TReDS platform |
| "NBFC-approved" | Implies NBFC regulatory approval |
| "RBI-approved" / "RBI-registered" | Implies regulatory authorization TexQtic does not hold |
| "AA framework" | Implies Account Aggregator network registration |
| "FIP" / "FIU" | Account Aggregator roles; TexQtic does not hold these |
| "eBL" (electronic Bill of Lading) | OD-004A; VPC is NOT a negotiable instrument or eBL |
| "negotiable instrument" | VPC is not a negotiable instrument |
| "ICC TradeTrust" (implying membership) | OD-004A; product branding only — not ICC membership |

### 5.4 VPC-specific forbidden language

| Forbidden term / phrase | Reason |
|---|---|
| "bank-verified certificate" | VPC is platform-verified, not bank-verified |
| "government-issued certificate" | VPC is platform-issued, not government-issued |
| "legally binding document" (without qualified legal opinion) | Requires legal opinion; do not state without review |
| "negotiable document of title" | VPC is not a negotiable document of title |
| "partner transmission proof" | VPC `TRANSMITTED` state does not confirm partner acceptance; only persisted ack (not yet implemented) |
| "payment trigger" | VPC issuance does not trigger payment |

---

## 6. Required Safe Language Patterns

The following patterns are approved for operator-internal use and subject to the same
`LEGAL_REVIEW_PENDING` status as all copy in this document.

### 6.1 TTP readiness signal language

| Safe pattern | Context |
|---|---|
| "TradeTrust Pay readiness signal" | Referring to any TTP output |
| "advisory readiness indicator" | Referring to TTP score or eligibility output |
| "platform-internal readiness assessment" | Emphasizing internal / non-bureau nature |
| "routing readiness" | Referring to `partner_routing_stubs` status |
| "eligibility check" (not "credit check") | Referring to the TTP eligibility process |
| "informational purposes only" | Qualifying any TTP output |
| "not a regulatory determination" | Clarifying TTP outputs for regulatory surfaces |

### 6.2 Score-related safe language

| Safe pattern | Context |
|---|---|
| "advisory score" | Top-level score label (not "credit score") |
| "readiness score" | Alternative to "advisory score" |
| "platform score" | Emphasizes internal origin |
| "score band" | Referring to READY / NEAR_READY / NEEDS_REVIEW / NOT_READY |
| "readiness band" | Alternative to "score band" |
| "factors" | Referring to the 7 score factors (not "credit factors") |
| "routing readiness factor" | Referring to routing_readiness factor |
| "eligibility factor" | Referring to eligibility_readiness factor |

### 6.3 VPC safe language

| Safe pattern | Context |
|---|---|
| "Verified Package Certificate" | Full product name |
| "VPC" | Abbreviated product name |
| "platform-verified invoice package" | Descriptive alternative |
| "TexQtic-issued certificate" | Emphasizes platform origin |
| "readiness signal for trade financing routes" | Functional description |
| "document package readiness indicator" | Generic safe description |

### 6.4 Eligibility / enrollment safe language

| Safe pattern | Context |
|---|---|
| "GST verification complete" | GST readiness confirmed |
| "eligibility review" (not "credit review") | Referring to TTP eligibility process |
| "eligibility window" | Referring to eligibility expiry concept |
| "enrollment approved" | Internal enrollment outcome (not "loan approved") |
| "enrollment status" | Referring to enrollment state |
| "readiness-based routing" | Referring to partner routing concept |

---

## 7. VPC Certificate / Verified Package Wording

> **Status: `LEGAL_REVIEW_PENDING`** — Wording below is operator-proposed. Not cleared for public or
> partner surfaces without formal legal review.

### 7.1 What a VPC is (safe framing)

A Verified Package Certificate (VPC) is a platform-internal document package issued by TexQtic that
assembles verified invoice data, GST verification status, eligibility assessment, and enrollment status
into a structured package for potential use in trade financing routing workflows.

**A VPC is NOT:**
- An eBL (electronic Bill of Lading) or any negotiable instrument
- A government-issued or bank-issued certificate
- A legally binding transfer of title or payment obligation
- A partner acceptance acknowledgment (VPC `TRANSMITTED` state records attempted transmission only; partner acknowledgment requires a separate persisted ack, which is not yet implemented)
- A payment guarantee or settlement commitment
- A document issued under or compliant with the ICC TradeTrust framework (TexQtic uses "TradeTrust Pay" as a product name only — it is not an ICC member or framework participant)

### 7.2 VPC state wording guidelines

| VPC state | Safe user-facing label (candidate) | Notes |
|---|---|---|
| `DRAFT` | "VPC Draft" | Internal state — may not need user label |
| `ISSUED` | "VPC Issued" | Platform has issued the VPC |
| `ACTIVE` | "VPC Active" | VPC is active and valid |
| `TRANSMITTED` | "VPC Submitted for Routing" | NOT "VPC sent to partner" — transmission is routing attempt only |
| `REVOKED` | "VPC Revoked" | Administrative revocation |
| `EXPIRED` | "VPC Expired" | Eligibility window expired |

### 7.3 VPC labeling constraints

- Do NOT use "sent to [partner name]" for `TRANSMITTED` state. Use "submitted for routing" until partner ack is implemented (Wave 4).
- Do NOT display raw VPC state keys (`DRAFT`, `ISSUED`, etc.) to end users without a human-readable label.
- Do NOT add partner branding to VPC displays without a signed partner contract.
- Eligibility expiry language must reference the TexQtic-defined window, not any regulatory or bureau window.

---

## 8. Score Advisory Wording

> **Status: `LEGAL_REVIEW_PENDING`** — Wording below is operator-proposed. Not cleared for external
> surfaces, partner-facing outputs, or any surfaces that could be construed as credit assessment
> communication without formal legal review.

### 8.1 What TradeTrust Score is (safe framing)

TradeTrust Score is a platform-internal advisory readiness indicator computed from TexQtic's own
platform data (GST verification, invoice readiness, eligibility, enrollment, VPC, and routing
readiness). It is a pure, ephemeral computation — it is not stored, not transmitted to partners, and
not used as an input to any lending or underwriting decision.

**TradeTrust Score is NOT:**
- A CIBIL score or any credit bureau score
- An underwriting output, credit decision, or creditworthiness assessment
- A score from, or regulated by, any Indian or international financial regulator
- A score shared with any partner (not currently implemented; requires Wave 3 consent architecture)
- A guarantee of any financing outcome
- A score based on external bureau data (GST is verified manually; CIBIL is a stub only)

### 8.2 Score band safe labeling

| Band | Safe user-facing label (candidate) | Notes |
|---|---|---|
| `READY` (80–100) | "Trade-Ready" or "Routing-Ready" | Emphasizes platform-level readiness, not financial approval |
| `NEAR_READY` (60–79) | "Approaching Readiness" | Neutral, non-financial framing |
| `NEEDS_REVIEW` (40–59) | "Needs Attention" | Actionable, non-judgmental |
| `NOT_READY` (0–39) | "Not Yet Ready" | Neutral, action-oriented |

### 8.3 Score display constraints

- Always display `SCORE_DISCLAIMER` alongside any score value or band.
- Do NOT display the numeric score (0–100) to users without the disclaimer.
- Do NOT imply score progression is equivalent to credit improvement.
- Do NOT name specific factors in ways that imply CIBIL-like data sources (e.g. "credit utilization", "payment history" in a bureau sense).
- Factor labels should reference platform data sources only: "GST Verification", "Invoice Status", "Eligibility", "Enrollment", "VPC Status", "Routing Readiness".

---

## 9. Consent / Data-Sharing Wording Placeholders (Wave 3)

> **Status: `PLACEHOLDER — WAVE 3 GATED`** — The following section captures wording placeholders
> for future consent surfaces. No consent table exists. No consent recording exists. No consent UI
> exists. These placeholders must not be used until `TTP-DATA-CONSENT-DESIGN-001` is approved.

### 9.1 GST data consent placeholder

> "[PLACEHOLDER] By proceeding, you consent to TexQtic retrieving and processing your GST filing
> data for the purpose of TradeTrust Pay eligibility verification. This consent is time-bounded and
> may be revoked at any time. See our Privacy Policy for data retention terms."

**Notes:**
- Must be reviewed against DPDP (Digital Personal Data Protection Act, 2023) requirements before use
- "Time-bounded" must reference the specific eligibility window duration (TBD in Wave 3 design)
- Revocation mechanism must be designed before this copy is used

### 9.2 CIBIL / bureau data consent placeholder

> "[PLACEHOLDER] By proceeding, you consent to TexQtic sharing your business registration details
> with [bureau partner] for the purpose of TradeTrust Pay eligibility assessment. This consent is
> required before any bureau data is accessed. You may revoke this consent at any time."

**Notes:**
- CIBIL is currently a stub only — no bureau API exists
- This placeholder must not be activated until a bureau API contract is in place and legal gate (Wave 1) is complete
- "bureau partner" must be replaced with the actual named partner before use
- Consent type enum value: `CIBIL_PULL` (per §10 of the P2 architecture decisions)

### 9.3 Internal score routing consent placeholder

> "[PLACEHOLDER] Your TradeTrust Score is used internally within TexQtic to identify potential
> trade financing routing opportunities. It is not shared with external partners without your explicit
> consent. Internal use only — no external transmission."

**Notes:**
- "Internal use only" applies until Wave 3 consent architecture is implemented
- External score sharing requires separate consent type `LENDER_DATA_SHARE`

---

## 10. Partner / Finance Wording Placeholders (Wave 4)

> **Status: `PLACEHOLDER — WAVE 4 PARTNER-GATED`** — No partner contract exists. No partner
> transmission is implemented. The following placeholders must not be used until Wave 4 gates are
> met: legal gate (Wave 1 complete) AND a signed partner contract.

### 10.1 Partner routing introduction placeholder

> "[PLACEHOLDER] Based on your TradeTrust Pay readiness, you may be eligible to explore trade
> financing options through TexQtic's network. Connecting to a financing partner requires your
> explicit consent and is subject to partner terms and conditions."

**Notes:**
- "May be eligible" framing — not "you are approved"
- "Explore" not "receive" or "get funded"
- "Network" is acceptable; do not name specific partners until contract is signed
- Must not be shown until partner workflow (Wave 4) is implemented and contract is signed

### 10.2 Finance request introduction placeholder

> "[PLACEHOLDER] Submitting a financing request does not guarantee financing. Your request will be
> reviewed by [partner name] based on their independent credit and risk criteria. TexQtic does not
> make lending decisions and is not a lender."

**Notes:**
- "Independent credit and risk criteria" — critical; TexQtic must not represent that TexQticScore is an input to partner lending decisions until this is formally agreed in a data-sharing contract
- "TexQtic is not a lender" — must appear in any partner-adjacent surface
- Partner name must be filled before use

### 10.3 Dynamic discounting placeholder

> "[PLACEHOLDER] Dynamic discounting allows buyers and sellers to negotiate early payment terms
> directly on the TexQtic platform. TexQtic does not hold, move, or guarantee any funds.
> Payment is made directly between buyer and seller."

**Notes:**
- "Directly between buyer and seller" — buyer-initiated only (TQ-17 Option A approved)
- "TexQtic does not hold, move, or guarantee any funds" — must appear in any discounting surface
- Must not be implemented until Wave 4 legal + partner gates are met

---

## 11. Fee / Origination Wording Placeholders (Wave 5)

> **Status: `PLACEHOLDER — WAVE 5 P4-GATED`** — No `ttp_fee_events` table exists. No fee recording
> or disclosure logic exists. These placeholders must not be used until `TTP-FEE-EVENTS-DESIGN-001`
> is approved and formal legal fee/disclosure review is complete.

### 11.1 Platform fee disclosure placeholder

> "[PLACEHOLDER] TexQtic charges a platform fee for [service]. Fees are disclosed before you
> confirm any action. See our Fee Schedule for full details."

**Notes:**
- Fee type enum values must come from legal fee/disclosure review (Wave 5 gate)
- `fee_type` enum and `legal_basis` field content cannot be designed before that review
- Fee disclosure wording must comply with Consumer Protection Act (2019) and any applicable RBI guidelines

### 11.2 Origination fee placeholder

> "[PLACEHOLDER] An origination fee of [amount/percentage] may apply to financing arrangements
> facilitated through TexQtic's partner network. This fee is charged by [partner name] and is
> separate from TexQtic's platform fee. Full fee disclosure is provided before you confirm."

**Notes:**
- Origination fees are partner-originated, not TexQtic-originated (TexQtic does not lend)
- "Facilitated through" — not "charged by TexQtic" for partner origination fees
- Must not be designed or implemented until legal fee review is complete (Wave 5)

---

## 12. Recommended Follow-up Units

> These are recommendations only. No unit below is opened by this artifact. Each requires explicit
> Paresh decision and approval before any work begins.

| Unit ID | Description | Gate | Wave |
|---|---|---|---|
| `TTP-DISCLAIMER-CONSTANT-FINALIZE-001` | Update `TTP_DISCLAIMER_TEXT` and `SCORE_DISCLAIMER` to legally reviewed final text | Paresh formal legal sign-off on §4 copy | Post-legal-review |
| `TTP-SCORE-DISCLAIMER-EXTRACT-001` | Extract `SCORE_DISCLAIMER` from `ttpScore.service.ts` into `ttp.constants.ts` | Paresh approval; minor refactor unit | Wave 1 cleanup |
| `TTP-FORBIDDEN-LANGUAGE-LINT-001` | Add pre-commit lint hook enforcing §5 forbidden-term list | Post-legal-review of forbidden list | Wave 1 cleanup |
| `TTP-DATA-CONSENT-DESIGN-001` | Design consent architecture (TQ-05, TQ-14) | Wave 1 complete; DPDP review | Wave 3 |
| `TTP-EXTERNAL-SCORE-SHARING-PHASE-3-DESIGN-001` | Design external lender score sharing | Wave 1 + consent + partner contract | Wave 3/4 |
| `TTP-PARTNER-WORKFLOW-DESIGN-001` | Design partner workflow table + state machine | Legal gate + partner contract | Wave 4 |
| `TTP-FEE-EVENTS-DESIGN-001` | Design fee events table | Legal fee/disclosure review | Wave 5 |

---

## 13. Final Decision

```
TTP_LEGAL_COMPLIANCE_COPY_REVIEW_001_OPERATOR_REVIEW_READY
```

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Legal copy status:** `LEGAL_REVIEW_PENDING` — formal legal sign-off NOT provided in this document  
**Operator review status:** `OPERATOR_REVIEW_READY` — copy inventory, forbidden-language list, and safe-language patterns are ready for Paresh review and submission to legal counsel  
**Code changes authorized:** None  
**Schema changes authorized:** None  
**Wave 2+ units opened:** None  

### What this decision means

| Item | Status |
|---|---|
| Current `TTP_DISCLAIMER_TEXT` interim text | Safe for internal development use; NOT cleared for public production |
| Current `SCORE_DISCLAIMER` interim text | Safe for internal development use; NOT cleared for public production |
| Proposed final disclaimer texts (§4) | `LEGAL_REVIEW_PENDING` — candidate only |
| Forbidden language list (§5) | Operator-approved minimum; may be expanded by legal review |
| Safe language patterns (§6) | Operator-approved; subject to legal review |
| VPC wording (§7) | Operator-proposed; `LEGAL_REVIEW_PENDING` |
| Score advisory wording (§8) | Operator-proposed; `LEGAL_REVIEW_PENDING` |
| Consent / data-sharing placeholders (§9) | `PLACEHOLDER` — Wave 3 gated; not for use |
| Partner / finance placeholders (§10) | `PLACEHOLDER` — Wave 4 partner-gated; not for use |
| Fee / origination placeholders (§11) | `PLACEHOLDER` — Wave 5 P4-gated; not for use |

### Required before production use of any TTP copy

1. Formal legal review of §3–§8 by qualified legal counsel (Indian fintech / DPDP context)
2. Paresh explicit sign-off after legal review
3. `TTP-DISCLAIMER-CONSTANT-FINALIZE-001` unit opened and completed with reviewed text
4. `TTP-FORBIDDEN-LANGUAGE-LINT-001` unit opened and completed (pre-commit enforcement)

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document does not authorize any implementation, activation, or schema change.*  
*All proposed copy is `LEGAL_REVIEW_PENDING` until formal Paresh sign-off is provided.*
