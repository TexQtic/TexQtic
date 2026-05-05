# PRODUCT-DEC-TRADETRUST-PAY-TTP-LEGAL-COUNSEL-REVIEW-PACKET-001

**Unit ID:** `TTP-LEGAL-COPY-COUNSEL-PACKET-001`  
**Document type:** Governance / legal counsel review packet — non-code artifact  
**Date:** 2026-05-05  
**Decision Owner:** Paresh Sharma (TexQtic founder / operator)  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**`ttp_enabled` state:** `false` — UNCHANGED by this document  
**Code changes:** None — governance/legal review packet only  
**Schema / migration changes:** None  
**Activation:** None — this document does not authorize or request TTP activation  
**Legal approval status:** `LEGAL_REVIEW_PENDING` — no wording in this document is approved for
public or partner use until Paresh provides formal legal sign-off  

> **COUNSEL REVIEW PACKET.** This document packages the TTP readiness surface copy inventory,
> interim disclaimer analysis, candidate final wording, forbidden-language list, safe-language
> patterns, and a structured set of questions for external legal counsel. No wording herein is
> legally approved. All candidate text is proposed only and requires counsel sign-off and Paresh
> decision before any update to production constants.

---

## 1. Document Metadata

| Field | Value |
|---|---|
| **Unit ID** | `TTP-LEGAL-COPY-COUNSEL-PACKET-001` |
| **Preceded by** | `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` — gov `1e539da`, final decision `TTP_LEGAL_COMPLIANCE_COPY_REVIEW_001_OPERATOR_REVIEW_READY` |
| **Artifact type** | Governance / legal counsel review packet (non-code) |
| **Date** | 2026-05-05 |
| **`ttp_enabled`** | `false` — UNCHANGED |
| **Legal status** | `LEGAL_REVIEW_PENDING` throughout |
| **Code changes authorized** | None — this document authorizes no implementation changes |
| **Schema / migration changes** | None |
| **Activation** | None |
| **Wave scope** | Wave 1 legal track only — no Wave 2/3/4/5 units opened |
| **Decision token** | `TTP_LEGAL_COUNSEL_REVIEW_PACKET_001_READY_FOR_PARESH` |

### What this document covers

| Section | Topic |
|---|---|
| §2 | Review request summary — what counsel is being asked to review |
| §3 | Business boundary summary — what TexQtic is and is NOT |
| §4 | Current implemented wording — constants and surfaces in production |
| §5 | Candidate final wording — proposed revisions, `LEGAL_REVIEW_PENDING` |
| §6 | Counsel questions — 9 explicit questions for legal review |
| §7 | Decision options for Paresh after counsel review |
| §8 | Follow-up units — not opened by this document |
| §9 | Final decision |

### What this document does NOT cover

- No code changes, schema changes, migrations, SQL, or env changes
- No feature flag changes (`ttp_enabled` remains `false`)
- No new routes, services, middleware, UI components, or tests
- No approval of any copy as legally final
- No authorization of production constant updates
- No opening of Wave 2, Wave 3, Wave 4, or Wave 5 units

---

## 2. Review Request Summary

This packet asks external legal counsel to review the following TTP readiness copy elements:

| Element | Current status | Counsel review request |
|---|---|---|
| `TTP_DISCLAIMER_TEXT` constant | Interim — `LEGAL_REVIEW_PENDING` | Is the current wording sufficient? Is the proposed revision appropriate? |
| `SCORE_DISCLAIMER` constant | Interim — `LEGAL_REVIEW_PENDING` | Is the current wording sufficient? Is the proposed revision appropriate? |
| `advisory_disclaimer` field in API responses | Uses `TTP_DISCLAIMER_TEXT` at runtime | Confirm surface-level adequacy; no separate review needed if base constant is approved |
| `TradeTrustScore.disclaimer` field in score responses | Uses `SCORE_DISCLAIMER` at runtime | Confirm surface-level adequacy; no separate review needed if base constant is approved |
| Forbidden-language list | Operator-defined — `LEGAL_REVIEW_PENDING` | Review for completeness; flag any terms that should be added or removed |
| Safe-language patterns | Operator-defined — `LEGAL_REVIEW_PENDING` | Confirm all patterns are legally safe for readiness-only positioning |
| VPC certificate wording | Labels only — no text beyond label strings | Are `VPC Issued`, `VPC Active`, `VPC Submitted for Routing` safe label strings? |
| Score advisory wording | Same as `SCORE_DISCLAIMER` | See score disclaimer row |
| Consent placeholders | Wave 3 design targets — not yet implemented | Are placeholder framing notes broadly DPDP-aligned? |
| Partner / finance placeholders | Wave 4 design targets — not yet implemented | Are placeholder framing notes safe to hold before partner contracts exist? |
| Fee / origination placeholders | Wave 5 design targets — not yet implemented | Are fee placeholder notes acceptable as future-gated placeholders? |

**Scope of review:** Counsel is reviewing copy wording and positioning only. No financial product
design, no RBI licensing analysis, no data localization review, and no specific partner contract
review is requested at this stage. Those reviews are gated and will be requested under separate
future units when their triggering conditions are met.

---

## 3. Business Boundary Summary

The following boundaries are authoritative and must be preserved in all copy and positioning.
Counsel should flag immediately if any proposed wording implies a boundary that TexQtic does not hold.

### What TexQtic IS (for TradeTrust Pay surfaces)

| Boundary | Description |
|---|---|
| Platform operator | TexQtic operates a B2B trade platform; it is a software intermediary only |
| Readiness signal provider | TTP surfaces provide advisory readiness indicators to support business decisions |
| Score aggregator (internal) | TradeTrust Score aggregates platform-internal signals; it is not a bureau product |
| VPC issuer | TexQtic issues Verified Payment Certificates as platform-internal records; no external authority |
| Data processor | TexQtic processes tenant-provided data for readiness assessment; no live bureau pull in Phase 1/2 |

### What TexQtic IS NOT (absolute boundaries — must not be implied by copy)

| Forbidden boundary | Reason |
|---|---|
| Lender | TexQtic does not lend funds to any party |
| Underwriter | TexQtic does not underwrite credit risk |
| Payment intermediary | TexQtic does not hold, transmit, or guarantee payments |
| TReDS platform | TexQtic is not a RBI-regulated Trade Receivables Discounting System |
| Credit bureau | TradeTrust Score is not a CIBIL or bureau product |
| Financing arranger | TexQtic does not arrange financing between buyer and seller |
| Partner (lender/NBFC/bank) | TexQtic is not the partner; partner routing stubs are readiness evidence only |
| Data authority | TexQtic does not guarantee accuracy of GSTN or CIBIL data |
| Regulatory assessor | No TTP output represents a regulatory determination of any kind |

### Live external integration status (Phase 1 / Phase 2)

| Integration | Status |
|---|---|
| GSTN / GST verification | Manual admin entry only — no live GSTN API call |
| CIBIL / bureau | Stub only — no live bureau API; `BUREAU_API` assessment type is a Phase 2 design target |
| Partner (NBFC / bank / factoring) | Stub only — `partner_routing_stubs` is readiness evidence; no outbound HTTP, no partner transmission |
| Consent recording | No consent table exists — Wave 3 design target |
| Fee recording | No fee table exists — Wave 5 design target |

**This boundary summary is authoritative for all copy reviewed in this packet.**
Counsel should confirm that no proposed wording implies any of the forbidden boundaries above.

---

## 4. Current Implemented Wording

The following constants and fields are currently deployed in production with `ttp_enabled=false`.
All surfaces return HTTP 503 while the feature flag is disabled. These constants will be surfaced
to tenants only after `ttp_enabled` is explicitly set to `true` by Paresh.

### 4.1 `TTP_DISCLAIMER_TEXT` constant

**File:** `server/src/ttp/ttp.constants.ts`  
**Status:** Interim — `LEGAL_REVIEW_PENDING`  
**Used on:** `advisory_disclaimer` field in `TtpSummary` and `TtpEnrollmentRecord` API responses  

```
TradeTrust Pay readiness signals are informational and advisory only. They are not a credit
score, financing approval, payment guarantee, lending decision, or partner commitment.
```

### 4.2 `SCORE_DISCLAIMER` constant

**File:** `server/src/services/ttpScore.service.ts`  
**Status:** Interim — `LEGAL_REVIEW_PENDING`  
**Used on:** `TradeTrustScore.disclaimer` field in every score response  

```
TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment
guarantee, financing approval, or partner commitment.
```

### 4.3 `advisory_disclaimer` API field surfaces

The `advisory_disclaimer` field containing `TTP_DISCLAIMER_TEXT` appears in:

| Surface | File | Route |
|---|---|---|
| `TtpSummary` response object | `server/src/services/ttpSummary.service.ts` | `GET /ttp/:orgId/summary` |
| `TtpEnrollmentRecord` response object | `server/src/services/ttpEnrollment.service.ts` | `GET /ttp/:orgId/enrollment` |

### 4.4 `TradeTrustScore.disclaimer` field surface

The `disclaimer` field containing `SCORE_DISCLAIMER` appears in:

| Surface | File | Route |
|---|---|---|
| `TradeTrustScore` response object | `server/src/services/ttpScore.service.ts` | `GET /ttp/:orgId/score` |

### 4.5 VPC label strings (no display text — label keys only)

The following VPC status label strings are used in the platform. They are identifiers, not
consumer-facing copy, and are surfaced through API status fields only:

| Label string | Meaning |
|---|---|
| `VPC_ISSUED` | A Verified Payment Certificate has been generated for this org |
| `VPC_ACTIVE` | The VPC is within its validity window and not voided |
| `VPC_SUBMITTED_FOR_ROUTING` | Partner routing stub has been created (readiness evidence only — no transmission) |

---

## 5. Candidate Final Wording for Counsel Review

The following candidate texts were produced by the operator copy review
(`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`, gov `1e539da`). All candidate text is `LEGAL_REVIEW_PENDING`.
No candidate text below may be used in production until counsel has reviewed it and Paresh has
provided formal sign-off.

### 5.1 Candidate `TTP_DISCLAIMER_TEXT`

**Status:** `LEGAL_REVIEW_PENDING`  
**Change from current:** Adds explicit "TexQtic does not lend" statement; strengthens negative
enumeration with "underwriting decision" and "lending commitment."  

```
TradeTrust Pay readiness signals are informational and advisory only. They do not constitute
a credit score, financing approval, payment guarantee, underwriting decision, lending
commitment, or partner agreement. TexQtic does not lend, hold funds, guarantee payments,
or act as a payment intermediary.
```

### 5.2 Candidate `SCORE_DISCLAIMER`

**Status:** `LEGAL_REVIEW_PENDING`  
**Change from current:** Names CIBIL explicitly as a contrast; adds "underwriting output" and
"credit approval"; adds "does not represent a regulatory assessment of any kind."  

```
TradeTrust Score is a platform-internal advisory readiness indicator only. It is not a credit
bureau score, CIBIL score, underwriting output, credit approval, payment guarantee, or
financing approval. It does not represent a regulatory assessment of any kind.
```

### 5.3 Candidate VPC wording (if display copy is ever surfaced)

**Status:** `LEGAL_REVIEW_PENDING`  
**Scope:** For any future UI or document that surfaces a VPC to the tenant. Not yet implemented.  

```
This Verified Payment Certificate is a platform-internal record issued by TexQtic indicating
that this organisation met TexQtic's internal readiness criteria at the time of issuance.
It is not a guarantee of payment, a financing approval, or a commitment from any lender,
bank, or financial institution. It does not constitute a regulatory instrument of any kind.
```

### 5.4 Candidate score advisory wording (if display copy is ever surfaced)

**Status:** `LEGAL_REVIEW_PENDING`  
**Scope:** For any future UI that displays the TradeTrust Score to the tenant. Not yet implemented.  

```
TradeTrust Score is an internal platform readiness indicator computed from signals available
to TexQtic. It is not a CIBIL score, a credit bureau assessment, or a product of any regulated
credit agency. It does not reflect a lending decision, underwriting output, or regulatory
determination. Your TradeTrust Score may change as your platform activity and data change.
```

### 5.5 Candidate consent wording placeholder (Wave 3 — not yet implemented)

**Status:** `LEGAL_REVIEW_PENDING` — Wave 3 design target; no consent table, no consent UI exists  

```
[CONSENT PLACEHOLDER — LEGAL_REVIEW_PENDING]
By proceeding, you consent to TexQtic processing your GST filing data and platform trade
data for the purpose of computing your TradeTrust Pay readiness score. Your consent is
time-bounded and may be withdrawn at any time. TexQtic will not share your data with any
external partner without separate, explicit consent.
[END PLACEHOLDER]
```

### 5.6 Candidate partner / finance wording placeholder (Wave 4 — not yet implemented)

**Status:** `LEGAL_REVIEW_PENDING` — Wave 4 design target; no partner workflow tables exist  

```
[PARTNER PLACEHOLDER — LEGAL_REVIEW_PENDING]
Partner routing is a platform-internal mechanism that identifies potential financing partners
based on your readiness profile. No data is transmitted to any partner without your explicit
authorisation. Partner offers, if any, are provided by the partner directly and do not
constitute commitments by TexQtic.
[END PLACEHOLDER]
```

### 5.7 Candidate fee / origination wording placeholder (Wave 5 — not yet implemented)

**Status:** `LEGAL_REVIEW_PENDING` — Wave 5 design target; no fee events table exists  

```
[FEE PLACEHOLDER — LEGAL_REVIEW_PENDING]
Platform service fees, if applicable, will be disclosed at the time of the relevant service
event. TexQtic does not deduct fees from any transaction without prior disclosure and consent.
[END PLACEHOLDER]
```

---

## 6. Counsel Questions

The following questions are submitted to external legal counsel for review. All questions are
scoped to advisory readiness copy only. No questions about RBI licensing, data localization,
or specific partner contract terms are included at this stage.

### Q1 — Adequacy of proposed `TTP_DISCLAIMER_TEXT` for advisory/readiness-only positioning

The current interim text reads:
> "TradeTrust Pay readiness signals are informational and advisory only. They are not a credit
> score, financing approval, payment guarantee, lending decision, or partner commitment."

The proposed candidate text adds explicit "TexQtic does not lend" language:
> "TradeTrust Pay readiness signals are informational and advisory only. They do not constitute
> a credit score, financing approval, payment guarantee, underwriting decision, lending
> commitment, or partner agreement. TexQtic does not lend, hold funds, guarantee payments,
> or act as a payment intermediary."

**Question:** Is the proposed text sufficient and appropriate for positioning TexQtic's TTP
readiness signals as purely informational/advisory, with no implied financial intermediary role?
Is there any term or phrase that should be added, removed, or modified for the Indian regulatory
context (including but not limited to NBFC, FEMA, RBI payment aggregator guidelines)?

### Q2 — Indian regulatory context for "underwriting decision," "lending commitment," "partner agreement"

The proposed `TTP_DISCLAIMER_TEXT` uses the terms "underwriting decision," "lending commitment,"
and "partner agreement" in the negative enumeration.

**Question:** Are these terms sufficient and precise for the Indian regulatory context? Should any
of them be rephrased — for example, should "lending commitment" be replaced with "credit facility
offer" or "loan sanction letter"? Should "partner agreement" be more specific, such as "financing
arrangement with any lender, NBFC, or bank"?

### Q3 — CIBIL naming in `SCORE_DISCLAIMER`

The proposed `SCORE_DISCLAIMER` names CIBIL directly:
> "It is not a credit bureau score, CIBIL score, underwriting output, credit approval, payment
> guarantee, or financing approval."

**Question:** Is it appropriate to name CIBIL specifically as a contrast term? Does naming CIBIL
risk any unintended association, trademark concern, or regulatory implication? Should the text
use a more generic phrase such as "credit information company score" (as defined under the Credit
Information Companies (Regulation) Act, 2005) instead of naming CIBIL directly?

### Q4 — Forbidden-language list review

The operator copy review (`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`) produced a forbidden-language
list. The list prohibits the following categories of terms from appearing in any TTP readiness
surface:

**Category A — Lending / credit positioning (absolutely forbidden):**
loan, lend, lending, underwrite, underwriting, credit facility, credit line, line of credit,
sanctioned credit, loan sanction, loan approval, approved for financing

**Category B — Regulatory financial product positioning (absolutely forbidden):**
TReDS, invoice discounting platform, factoring platform, NBFC product, bank credit product,
RBI regulated, regulated lending

**Category C — Payment guarantee / commitment (absolutely forbidden):**
guaranteed payment, payment guarantee, guaranteed invoice settlement, settled invoice,
payment committed, funds released

**Category D — Bureau / external data authority (restricted — may only be used as explicit
contrast terms in disclaimers, never as affirmative claims):**
CIBIL score, credit bureau score, bureau score, credit information company score

**Question:** Does counsel consider this list complete and appropriate? Are there additional terms
that should be added based on Indian financial services regulations (e.g., references to NPA,
DPD, credit rating, SEBI-regulated instrument, invoice financing)? Are there any terms on the
list that should be removed or reclassified?

### Q5 — VPC label string safety

The platform uses the following VPC status label strings in API status fields
(not yet surfaced in any UI or document):

- `VPC_ISSUED` / `VPC Issued`
- `VPC_ACTIVE` / `VPC Active`
- `VPC_SUBMITTED_FOR_ROUTING` / `VPC Submitted for Routing`

**Question:** Are these label strings safe as platform-internal identifiers for a "Verified
Payment Certificate" that is explicitly disclaimed as a platform-internal record? Does the
phrase "Verified Payment Certificate" or its abbreviation "VPC" carry any regulatory implication
in the Indian payments / FEMA / RBI framework that TexQtic should be aware of?

### Q6 — "TradeTrust Score" as a product term

The platform uses "TradeTrust Score" as the product term for its internal readiness indicator.
The score is a 0–100 ephemeral computed value with no database persistence and no external
bureau input.

**Question:** Is "TradeTrust Score" an acceptable product term when used with the proposed
disclaimer? Should public-facing surfaces (e.g., tenant dashboard, any future marketing
materials) prefer a more neutral term such as "TradeTrust Readiness Indicator" or "Platform
Readiness Score" to reduce the risk of consumer confusion with a credit score product?

### Q7 — Consent placeholder alignment with DPDP Act 2023

The consent wording placeholder (§5.5 of this document) is a Wave 3 design target. No consent
table or consent UI exists in the current codebase. The placeholder is intended to be reviewed
before any consent design begins.

**Question:** Is the consent placeholder broadly aligned with the consent requirements under the
Digital Personal Data Protection Act, 2023 (DPDP Act)? Specifically:
- Is the framing of "time-bounded consent that may be withdrawn at any time" appropriate?
- Should the placeholder explicitly reference the purpose limitation principle?
- Are there any categories of data (GST data, trade data, bureau data) that require specific
  consent language or consent granularity under DPDP or related GSTN/CIBIL data-use frameworks?

### Q8 — Partner / finance placeholder safety before partner contracts exist

The partner wording placeholder (§5.6 of this document) is a Wave 4 design target. No partner
workflow tables, no partner contracts, and no data transmission to any partner exists in the
current codebase.

**Question:** Is the partner wording placeholder safe to hold as a design reference before any
partner contracts are executed? Does the placeholder language create any implied commitment or
pre-contractual representation that TexQtic should avoid? Should the placeholder be further
qualified to note that partner routing is contingent on future regulatory approvals and partner
agreement execution?

### Q9 — Fee / origination placeholder acceptability

The fee wording placeholder (§5.7 of this document) is a Wave 5 design target. No fee events
table and no fee disclosure mechanism exists in the current codebase.

**Question:** Is the fee placeholder acceptable as a future-gated design reference? Are there
any fee disclosure requirements under Indian consumer protection, FEMA, or payment aggregator
frameworks that TexQtic should be aware of at the design stage, even though no fee mechanism
exists today?

---

## 7. Decision Options for Paresh After Counsel Review

After receiving counsel feedback, Paresh must select exactly one of the following options for
each reviewed element. No production constant may be updated until a decision is recorded.

| Option | Description | Triggers |
|---|---|---|
| **A — Approve current interim text as final** | Current `TTP_DISCLAIMER_TEXT` and/or `SCORE_DISCLAIMER` constants are approved as legally final. No text change required. | Open `TTP-DISCLAIMER-CONSTANT-FINALIZE-001` to record the approval and close `LEGAL_REVIEW_PENDING` status. |
| **B — Approve candidate revised text as final** | The candidate texts in §5.1 and/or §5.2 are approved as legally final (with or without counsel edits). | Open `TTP-DISCLAIMER-CONSTANT-FINALIZE-001` to update the constants in code. |
| **C — Request counsel-edited text** | Counsel provides revised wording. Paresh reviews and approves the revision. | Record counsel-edited text in a follow-up governance artifact, then open `TTP-DISCLAIMER-CONSTANT-FINALIZE-001`. |
| **D — Defer public use until Wave 3 / Wave 4 gates** | Current interim text is acceptable as an internal-only placeholder. No public or partner-facing use until later gates. | No immediate action. Record deferral decision. Review at Wave 3 / Wave 4 gate. |
| **E — Open forbidden-language lint implementation unit** | Forbidden-language list is approved. Open `TTP-FORBIDDEN-LANGUAGE-LINT-001` to implement pre-commit lint enforcement. | Requires counsel to confirm the forbidden-language list in Q4 above. |
| **F — Open consent design unit** | Consent placeholder is approved as design direction. Open `TTP-DATA-CONSENT-DESIGN-001` (Wave 3). | Requires DPDP review complete (Q7) and explicit Paresh Wave 3 gate decision. |

**Important:** Options A–F may be selected independently for each element. Paresh may approve the
TTP disclaimer (Option A or B) while deferring consent design (Option D or F). Each decision is
independent.

---

## 8. Follow-Up Units (Not Opened by This Document)

The following units are logical successors to this counsel review. None are opened by this
document. Each requires explicit Paresh decision to open.

| Unit ID | Purpose | Gate |
|---|---|---|
| `TTP-DISCLAIMER-CONSTANT-FINALIZE-001` | Update `TTP_DISCLAIMER_TEXT` in `ttp.constants.ts` and `SCORE_DISCLAIMER` in `ttpScore.service.ts` to legally-final text | Counsel review complete; Paresh sign-off on final text; explicit open decision |
| `TTP-SCORE-DISCLAIMER-EXTRACT-001` | Extract `SCORE_DISCLAIMER` from `ttpScore.service.ts` into `ttp.constants.ts` for centralized governance | Paresh decision; separate from text finalization |
| `TTP-FORBIDDEN-LANGUAGE-LINT-001` | Implement pre-commit lint hook enforcing forbidden-language list | Counsel confirms forbidden-language list (Q4); Paresh decision |
| `TTP-DATA-CONSENT-DESIGN-001` | Design `ttp_data_consents` table, consent lifecycle, DPDP-aligned consent wording | Wave 1 legal track complete; DPDP review complete; explicit Paresh Wave 3 gate decision |
| `TTP-PARTNER-WORKFLOW-DESIGN-001` | Design partner workflow tables, VPC transmission, callback events | Wave 1 legal track complete; partner contract executed; explicit Paresh Wave 4 gate decision |
| `TTP-FEE-EVENTS-DESIGN-001` | Design `ttp_fee_events` table, fee disclosure mechanism | Wave 1 legal track complete; fee framework approved; explicit Paresh Wave 5 gate decision |

**None of the above units are open. No design may begin without a separate Paresh decision.**

---

## 9. Final Decision

```
TTP_LEGAL_COUNSEL_REVIEW_PACKET_001_READY_FOR_PARESH
```

**Authority:** Paresh Sharma — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Files changed by this document:** This document only (new governance artifact)  
**Implementation authorized:** None  
**Legal copy status:** `LEGAL_REVIEW_PENDING` — no wording approved for production use  
**Claim of legal approval:** NOT MADE — this document does not claim any legal approval  
**Next step:** Paresh to share this packet with external legal counsel; record counsel feedback
in a follow-up governance artifact; then select from decision options in §7  
**Wave 2+ status:** All Wave 2, Wave 3, Wave 4, Wave 5 units remain gated  

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document does not authorize any implementation, activation, schema change, or production
constant update. All copy reviewed herein is `LEGAL_REVIEW_PENDING` until Paresh provides
formal sign-off after counsel review.*
