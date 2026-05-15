# TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001
## TexQtic TradeTrust Pay — External Legal Counsel Review Packet

**Unit ID:** `TTP-EXTERNAL-LEGAL-COUNSEL-PACKET-001`
**Document type:** External legal counsel review packet — governance artifact, non-code
**Date (original):** 2026-05-06
**Date (upgraded):** 2026-07-06
**Upgrade unit:** `TEXQTIC-TRADETRUST-PAY-LEGAL-PACKET-UPGRADE-NC-SUPPLEMENT-001`
**Upgrade scope:** Unified Platform TTP + NC-TTP (New Commerce TradeTrust Pay) supplement; consent framework doctrine; partner routing legal gate; user-facing wording controls; disclaimer pack; activation blockers; counsel question matrix; future packet impact map; regulatory posture matrix; terms acceptance flow requirements; data sharing / privacy questions.
**Prepared by:** Paresh Patel, TexQtic founder / operator
**`ttp_enabled` state:** `false` — UNCHANGED. This document does not activate or authorize activation of TradeTrust Pay or NC-TTP.
**Legal status:** `LEGAL_REVIEW_PENDING` throughout. No wording in this document is legally approved. All proposed or candidate wording requires counsel sign-off and Paresh decision before any production use.
**Code changes:** None — governance/legal review packet only.
**Architecture authority:** `governance/TEXQTIC-TRADETRUST-PAY-ARCHITECTURE-DECISION-TERMS-LOCK-001.md` (D-001–D-015, committed 2026-07-06)
**Schema / migration changes:** None.
**Activation:** None — this document does not authorize or request TTP activation.

> **PDF export note:** This document is authored in Markdown. It can be exported to PDF using any Markdown-to-PDF tool (e.g., Pandoc, VS Code "Print to PDF", or a web-based Markdown PDF exporter) for delivery to counsel. No PDF is generated automatically by the repository.

---

## 1. Cover Note to Counsel

Dear Counsel,

TexQtic is a B2B textile trade platform. We are developing a product feature called **TradeTrust Pay** — a readiness, workflow, and documentation layer that helps textile buyers and sellers assess trade readiness and prepare documentation for potential financing. We are **not** seeking to lend, underwrite, hold funds, act as a payment intermediary, or become a regulated financial platform.

We are writing to you before exposing any of the following surfaces to tenants (buyers/sellers) or finance partners:

- Readiness advisory disclaimers (already written as internal constants; not yet tenant-visible)
- A readiness indicator called **TexQticScore** (backend/admin only; not yet tenant-visible)
- Score-related wording, band labels, and factor labels
- A **Verified Payment Certificate (VPC)** — a platform-internal document (not yet publicly surfaced)
- Consent wording for data sharing (not yet designed or implemented)
- Partner/finance wording (not yet designed or implemented)
- Fee/disclosure wording (not yet designed or implemented)

**What we are asking you to do:**
1. Review the proposed wording in this packet.
2. Confirm whether the wording is legally safe for each surface and audience.
3. Provide written answers to our counsel questions (§7).
4. Provide approved/revised wording where changes are needed.
5. Flag any regulatory, financial, or data-protection concerns we have not anticipated.

**What we are NOT asking for at this stage:**
- Tax opinion
- Securities law opinion
- RBI licensing opinion
- Full data localisation review
- Specific partner contract review

However, **please flag proactively** if any proposed wording or product positioning would, in your view, trigger a requirement for any of the above.

**We will not proceed with any tenant-visible or partner-visible surface until we receive your written feedback and record it in our governance system.**

Paresh Patel  
Founder / Operator, TexQtic

---

## 2. Company / Product Context

### 2.1 About TexQtic

| Dimension | Value |
|---|---|
| Company type | B2B textile trade platform (software/SaaS) |
| Platform role | Software intermediary; matchmaker between textile buyers and sellers |
| Incorporation | Private |
| Customer base | Textile manufacturers, wholesalers, exporters, importers (Indian and international) |
| Technology stack | Supabase-backed SaaS; multi-tenant; B2B |

### 2.2 About TradeTrust Pay

TradeTrust Pay is a **readiness and documentation layer** within the TexQtic platform. It is **not** a payment product, lending product, or regulated financial product.

Its current scope:
- Assessing whether a seller organisation has met TexQtic's internal readiness criteria for trade finance consideration.
- Generating an internal Verified Payment Certificate (VPC) as a platform record of that readiness.
- Computing a TexQticScore — a platform-internal advisory readiness indicator (not a credit bureau product).
- Maintaining audit logs and enrollment records.
- Routing sellers who are assessed as ready toward potential finance partner engagement (future; not yet implemented).

### 2.3 Current Activation State

| Invariant | State |
|---|---|
| `ttp_enabled` feature flag | `false` — all TradeTrust Pay routes return HTTP 503 to all tenants |
| Tenant-visible surfaces | None — backend infrastructure only |
| Partner integration | None — stub only; no outbound HTTP, no partner transmission |
| Live external data (GSTN, CIBIL) | None — manual admin entry only; no live API calls |
| Consent recording | Not implemented |
| Fee recording | Not implemented |

**TexQtic has deliberately kept TradeTrust Pay feature-gated at `ttp_enabled=false` pending this legal review.**

---

## 3. Current Implementation State

### 3.1 What has been built (backend/admin/internal only)

| Component | Status | Tenant-visible? |
|---|---|---|
| Feature gate middleware (`ttpFeatureGateMiddleware`) | Implemented | No — returns 503 to tenants |
| Per-org activation override (`TenantFeatureOverride`) | Implemented | No — admin-controlled |
| QA sentinel isolation (`is_qa_sentinel` flag) | Implemented | No — internal QA only |
| Structured monitoring events (Pino logs) | Implemented | No — server logs only |
| Activation/rollback runbook | Governance document | No |
| Advisory disclaimer constant (`TTP_DISCLAIMER_TEXT`) | Implemented in code | No — returns in API response when TTP enabled; TTP currently disabled |
| Score disclaimer constant (`SCORE_DISCLAIMER`) | Implemented in code | No — same gate |
| TexQticScore v2 disclaimer constant (`TEXQTICSCORE_V2_DISCLAIMER`) | Implemented in code | No — same gate |
| `ttp_score_snapshots` table (SQL/RLS) | Implemented in database | No — admin read only |
| Score snapshot service (`TtpScoreSnapshotService`) | Implemented | No — internal service |
| Score snapshot triggers (VPC issuance, enrollment approval, admin review) | Implemented | No — backend triggers |
| Admin score snapshot read routes (`GET /api/control/ttp/score-snapshots/:orgId`) | Implemented | No — SUPER_ADMIN only |
| TexQticScore v2 computation function (`computeTexQticScore`) | Implemented | No — service layer only |
| TexQticScore v2 snapshot integration | Implemented | No — service layer only |
| TexQticScore v2 admin read/filter | Implemented | No — SUPER_ADMIN only |
| Control-plane feature-disabled UX copy | Implemented | Control plane only (SUPER_ADMIN) — not tenant-visible |
| Frontend test harness (RTL/jsdom) | Implemented | No — developer/CI testing only |

### 3.2 What is NOT built (blocked or not yet started)

| Component | Status | Reason blocked |
|---|---|---|
| Tenant-visible TexQticScore surface | `BLOCKED_LEGAL` | `LEGAL_REVIEW_PENDING` unresolved |
| Consent / data-sharing table and UI | `LEGAL_GATED__WAITING` | Legal gate + DPDP review required |
| Partner workflow tables and transmission | `PARTNER_GATED__WAITING` | Legal gate + partner contract required |
| Finance request / offer tables | `PARTNER_GATED__WAITING` | Legal gate + partner contract required |
| Dynamic discounting | `PARTNER_GATED__WAITING` | Legal gate + partner contract required |
| Fee events table | `FUTURE_DESIGN_TARGET__WAITING` | Legal fee review required |
| Buyer Trust Score | `FUTURE_DESIGN_TARGET__WAITING` | Phase 3 design target |
| Live GSTN / GST portal API | Not designed | No government data agreement |
| Live CIBIL / bureau API | Not designed | No bureau contract; requires consent design |
| Account Aggregator integration | Not designed | Requires AA network registration |
| External score sharing with partners | Not designed | Legal gate + consent + partner contract |

### 3.3 Safety invariants (non-negotiable)

The following invariants are enforced by TexQtic and must be preserved in all wording and design:

- TexQtic does not lend.
- TexQtic does not underwrite credit risk.
- TexQtic does not hold funds.
- TexQtic does not guarantee payment.
- TexQtic does not act as a payment intermediary.
- TexQtic does not become a TReDS platform.
- TexQtic does not provide financing approval.
- TexQtic does not provide partner approval.
- TexQtic does not transmit live partner financing requests (no live transmission exists).
- No live GSTN API exists.
- No live CIBIL / credit bureau API exists.
- No Account Aggregator integration exists.
- No partner transmission exists.
- TexQticScore is advisory / readiness-oriented only.
- `ttp_enabled=false` remains unchanged until legal counsel feedback is recorded.
- `LEGAL_REVIEW_PENDING` remains unchanged until counsel feedback is formally recorded.

---

## 4. Product Boundary / No-Go Position

The following boundaries are absolute. Counsel must flag if any proposed wording implies a boundary TexQtic does not hold.

| Forbidden boundary | Absolute position |
|---|---|
| **Lending** | TexQtic does not lend funds to any party under any circumstance |
| **Underwriting** | TexQtic does not underwrite credit risk; no credit decision-making |
| **Funds holding** | TexQtic does not hold, receive, or disburse funds |
| **Payment guarantee** | TexQtic does not guarantee payment by any party |
| **Payment intermediary** | TexQtic does not transmit, clear, or settle payments |
| **TReDS platform** | TexQtic is not an RBI-regulated Trade Receivables Discounting System |
| **NBFC / lending entity** | TexQtic is not an NBFC, bank, or regulated lending entity |
| **Factoring / invoice discounting** | TexQtic does not itself factor or discount invoices |
| **Credit bureau / CIBIL** | TexQticScore is not a CIBIL score or bureau product |
| **Financing arranger** | TexQtic does not arrange, originate, or broker financing between parties |
| **Partner (lender/NBFC/bank) commitment** | Partner routing stubs are readiness evidence only; no partner has committed to any offer |
| **Data authority** | TexQtic does not guarantee accuracy of GSTN, CIBIL, or third-party data |
| **Regulatory assessor** | No TTP output represents a regulatory determination |
| **Live bureau / GSTN data access** | No live bureau or GSTN API call exists at this time |
| **External score sharing** | No TexQticScore data is shared with any partner without consent and legal approval |

---

## 5. Surfaces Requiring Counsel Review

The following table lists every wording area or surface that requires legal review before it can be exposed to tenants or partners. Current wording is shown where it exists. All wording is `LEGAL_REVIEW_PENDING`.

| # | Surface / Wording Area | Current or Proposed Wording | Intended User | Legal Concern | Counsel Question | Decision Needed |
|---|---|---|---|---|---|---|
| 1 | `TTP_DISCLAIMER_TEXT` constant (current, in code) | *"TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment."* | Tenant (seller/buyer) — when TTP enabled | Does not mention "does not lend"; may not be strong enough | Is this disclaimer sufficient? | Approved as-is / Revised wording required |
| 2 | `TTP_DISCLAIMER_TEXT` — candidate revised wording | *"TradeTrust Pay readiness signals are informational and advisory only. They do not constitute a credit score, financing approval, payment guarantee, underwriting decision, lending commitment, or partner agreement. TexQtic does not lend, hold funds, guarantee payments, or act as a payment intermediary."* | Tenant | Strengthened; includes "does not lend" | Is this revised wording approved? | Approved as-is / Further revision required |
| 3 | `SCORE_DISCLAIMER` constant (current, in code) | *"TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment."* | Tenant (in API response) — when TTP enabled | Term "TradeTrust Score" may imply regulated credit scoring | Is this disclaimer sufficient? | Approved as-is / Revised wording required |
| 4 | `SCORE_DISCLAIMER` — candidate revised wording | *"TradeTrust Score is a platform-internal advisory readiness indicator only. It is not a credit bureau score, CIBIL score, underwriting output, credit approval, payment guarantee, or financing approval. It does not represent a regulatory assessment of any kind."* | Tenant | Names CIBIL explicitly; adds "does not represent regulatory assessment" | Is this revised wording approved? | Approved as-is / Further revision required |
| 5 | `TEXQTICSCORE_V2_DISCLAIMER` constant (current, in code) | *"TexQticScore is an advisory readiness indicator computed from platform-internal signals. It is not a credit bureau score, CIBIL assessment, underwriting output, or financing approval. It does not represent a regulatory determination of any kind."* | Tenant / admin (when tenant surface enabled) | New product name "TexQticScore"; "v2" scoring model | Is this disclaimer sufficient for tenant-visible surface? | Approved as-is / Revised wording required |
| 6 | TexQticScore as a product name | "TexQticScore" | All surfaces | Does the name "TexQticScore" imply a regulated credit score product? | Is "TexQticScore" acceptable as a product term? | Approved / Must rename |
| 7 | Tenant-visible score surface | Score value (0–100), band label, factor labels | Tenant (seller) | Showing a readiness score to sellers may imply credit assessment | Can sellers see their own TexQticScore? With what restrictions? | Approved / Approved with limits / Not approved |
| 8 | Score band labels | `READY`, `NEAR_READY`, `NEEDS_REVIEW`, `NOT_READY` | Tenant (seller) | Band labels may imply credit eligibility determination | Are these band labels legally safe? | Approved / Revised labels required |
| 9 | Score factor labels | e.g., `gst_compliance`, `invoice_history`, `enrollment_status`, `vpc_status`, `payment_history` | Tenant (seller) | Some factors may imply credit-relevant data processing | Are any factor labels legally problematic? | Approved / Some labels prohibited |
| 10 | Verified Payment Certificate (VPC) wording | No public display copy yet — label strings only: `VPC_ISSUED`, `VPC_ACTIVE`, `VPC_SUBMITTED_FOR_ROUTING` | Admin only currently | "Verified" and "Payment Certificate" may imply regulatory instrument | Are the VPC label strings safe? What display copy is safe if VPC is surfaced to tenants? | Approved labels / Approved display copy / Display copy required before tenant surface |
| 11 | VPC display copy — candidate wording | *"This Verified Payment Certificate is a platform-internal record issued by TexQtic indicating that this organisation met TexQtic's internal readiness criteria at the time of issuance. It is not a guarantee of payment, a financing approval, or a commitment from any lender, bank, or financial institution. It does not constitute a regulatory instrument of any kind."* | Tenant (future) | "Verified" and "Certificate" language | Is this candidate VPC display copy approved for tenant surfaces? | Approved / Revised wording required / Not approved |
| 12 | Consent wording (not yet implemented) | No consent text exists. Placeholder concept: *"I consent to TexQtic sharing my readiness information with pre-approved finance partners for the purpose of assessing financing options. This consent is valid for [duration] and may be revoked at any time."* | Tenant (seller) | DPDP-aligned consent; must cover purpose, duration, revocation | What consent text is required before any data sharing? What expiry/revocation language is required? | Provide approved consent wording |
| 13 | Data-sharing wording (not yet implemented) | No data-sharing text exists | Tenant (seller) | Sharing readiness data with finance partners requires lawful basis | What data-sharing disclosure is required? | Provide approved wording |
| 14 | Partner / finance wording (not yet implemented) | No partner-facing wording exists | Finance partner (future) | Describing TexQtic's role to partners must not imply financial guarantee or lender role | What partner/finance wording is prohibited? What is safe? | Provide approved wording |
| 15 | Fee / disclosure wording (not yet implemented) | No fee-related text exists | Tenant (future) | Fee disclosure requirements if platform fees are introduced | What fee disclosures are required if fees are introduced? | Provide guidance |
| 16 | Dynamic discounting wording (not yet implemented) | No wording exists | Tenant / buyer / partner (future) | Dynamic discounting must not imply TexQtic holds or moves funds | What wording is safe for dynamic discounting? What is prohibited? | Provide guidance |
| 17 | Forbidden terms list (operator-defined) | Terms forbidden from all TTP surfaces: *credit*, *loan*, *lend*, *underwrite*, *guarantee*, *TReDS*, *NBFC*, *factoring*, *invoice discounting*, *financial product*, *bank*, *payment guarantee* (in isolation), *financing available* | All surfaces | Operator-defined list; counsel should confirm completeness | Are any forbidden terms misclassified? Are any safe in context? Should additional terms be added? | Confirm / Revise list |

---

## 6. Current Implemented Disclaimer / Copy Inventory

This section lists the exact current wording deployed in the TexQtic codebase. All wording is `LEGAL_REVIEW_PENDING`. No wording below is legally approved.

### 6.1 `TTP_DISCLAIMER_TEXT`

**File:** `server/src/ttp/ttp.constants.ts`
**Status:** `LEGAL_REVIEW_PENDING` — interim wording, not legally approved
**Surfaces:** `TtpSummary.advisory_disclaimer`, `TtpEnrollmentRecord.advisory_disclaimer` (all TTP API responses when TTP enabled)

```
TradeTrust Pay readiness signals are informational and advisory only. They are not a credit
score, financing approval, payment guarantee, lending decision, or partner commitment.
```

### 6.2 `SCORE_DISCLAIMER`

**File:** `server/src/services/ttpScore.service.ts`
**Status:** `LEGAL_REVIEW_PENDING` — interim wording, not legally approved
**Surfaces:** `TradeTrustScore.disclaimer` field in every score response (when TTP enabled)

```
TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment
guarantee, financing approval, or partner commitment.
```

### 6.3 `TEXQTICSCORE_V2_DISCLAIMER`

**File:** `server/src/services/texqticScore.service.ts` (or equivalent TexQticScore v2 service file)
**Status:** `LEGAL_REVIEW_PENDING` — interim wording, not legally approved
**Surfaces:** TexQticScore v2 API responses (admin only; tenant surface `BLOCKED_LEGAL`)

```
TexQticScore is an advisory readiness indicator computed from platform-internal signals. It is
not a credit bureau score, CIBIL assessment, underwriting output, or financing approval. It
does not represent a regulatory determination of any kind.
```

### 6.4 VPC label strings (no display copy — identifier strings only)

| Label string | Meaning |
|---|---|
| `VPC_ISSUED` | A Verified Payment Certificate has been generated for this org |
| `VPC_ACTIVE` | The VPC is within its validity window and not voided |
| `VPC_SUBMITTED_FOR_ROUTING` | Partner routing stub has been created — readiness evidence only; no transmission |

**Status:** These are identifier strings, not consumer-facing display copy. They are `LEGAL_REVIEW_PENDING` as label strings.

### 6.5 Feature-disabled copy (control-plane / admin only)

| Surface | Current copy |
|---|---|
| VPC Console (admin) | `"TradeTrust Pay is not currently enabled on this platform."` |
| TTP Enrollment Admin (admin) | `"TradeTrust Pay is not currently enabled on this platform."` |
| TTP Eligibility Console (admin) | `"TradeTrust Pay is not currently enabled on this platform."` |

**Status:** This copy is shown to SUPER_ADMIN users only (not tenants) when `ttp_enabled=false`. This is not a legal-sensitive surface, but counsel may wish to note it.

### 6.6 Score band labels (internal — not yet tenant-visible)

| Band | Meaning |
|---|---|
| `READY` | Highest readiness band |
| `NEAR_READY` | Second band |
| `NEEDS_REVIEW` | Third band |
| `NOT_READY` | Lowest readiness band |

**Status:** `LEGAL_REVIEW_PENDING` — used internally; not yet surfaced to tenants.

---

## 7. Specific Counsel Questions

We ask counsel to provide clear written answers to each of the following questions:

**A. Is the current `TTP_DISCLAIMER_TEXT` wording (§6.1) sufficient as a disclaimer for tenant-facing TradeTrust Pay advisory surfaces? If not, what specific changes are required?**

**B. Should the phrase "score" be avoided entirely in tenant-facing surfaces, or is it acceptable when accompanied by the advisory disclaimer? If it must be avoided, what alternative language is approved (e.g., "readiness indicator", "readiness band", "assessment")?**

**C. Is "TexQticScore" acceptable as a product name/brand? Does the word "Score" in the product name create regulatory or consumer-protection risk? If the name must change, what naming conventions are safe?**

**D. Can sellers see their own TexQticScore on the TexQtic platform? If yes, with what restrictions? If no, what would need to be in place before they could?**

**E. Can buyers see a supplier's or seller's readiness indicators (e.g., a readiness band or VPC status) on the platform? With what restrictions?**

**F. Can finance partners (NBFCs, banks, factoring companies) see any form of score, readiness indicator, or TexQticScore data? With what restrictions? What data-sharing agreement is required?**

**G. What score fields or factors must never be exposed to any tenant (neither buyer nor seller) regardless of consent? Are there specific data categories that require special treatment (e.g., GSTN data, payment history, credit-related signals)?**

**H. What consent text is required under applicable Indian law (including DPDP 2023 or equivalent) before any readiness data is shared with finance partners or third parties? Please provide approved or model consent language.**

**I. What expiry and revocation language is required for any data-sharing consent? Is a time-limited consent (e.g., 12 months) required? Must revocation be instantaneous?**

**J. What VPC display wording is safe if the Verified Payment Certificate is shown to tenants? Is the candidate wording in §5 (row 11) approved? If not, what changes are required?**

**K. What partner/finance wording is prohibited in any platform surface (tenant-visible or partner-visible)? Specifically: what phrases imply financing commitments, guarantee, or regulated financial activity that TexQtic must avoid?**

**L. If platform fees are introduced later (e.g., a fee for TradeTrust Pay enrollment or VPC issuance), what fee disclosures are required under applicable consumer protection, contract, or financial services law?**

**M. Does any proposed wording, product positioning, or platform feature described in this packet create a risk of TexQtic being classified as a lender, underwriter, payment intermediary, TReDS platform, NBFC, factoring company, or regulated financial entity? If so, which specific wording or feature triggers this risk?**

**N. What exact replacement or approved wording does counsel recommend for each surface listed in §5? Please provide a marked-up version of §5 with approved wording inserted.**

---

## 8. Decision Grid for Counsel

For each topic below, counsel should mark the applicable decision status:

| # | Topic | Approved as-is | Approved with revised wording | Approved internal/admin only | Approved tenant-visible with limits | Not approved / redesign required | Needs further legal/regulatory review |
|---|---|---|---|---|---|---|---|
| 1 | `TTP_DISCLAIMER_TEXT` (current) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | `TTP_DISCLAIMER_TEXT` (candidate revised) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | `SCORE_DISCLAIMER` (current) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | `SCORE_DISCLAIMER` (candidate revised) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | `TEXQTICSCORE_V2_DISCLAIMER` (current) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | TexQticScore product name | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | Tenant-visible score surface (seller sees own score) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | Score band labels (`READY`, `NEAR_READY`, etc.) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | Score factor labels | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | VPC label strings (`VPC_ISSUED`, etc.) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 11 | VPC display copy (candidate wording) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 12 | Consent wording (placeholder concept) | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 13 | Data-sharing wording | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 14 | Partner / finance wording | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 15 | Fee / disclosure wording | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 16 | Dynamic discounting wording | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 17 | Forbidden terms list | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## 9. Requested Counsel Output

We ask counsel to provide the following in their written response:

1. **Approved final text** for each disclaimer, label, and surface reviewed.
2. **Redlines** on any proposed or candidate wording that requires revision.
3. **Restrictions by surface** — which wording is approved for admin-only vs. tenant-visible vs. partner-visible contexts.
4. **User-role limitations** — if a surface is approved only for specific roles (e.g., seller only, buyer excluded, admin only).
5. **Consent requirements** — what formal consent must be obtained, and from whom, before any data-sharing or score-sharing occurs.
6. **Must-not-use terms** — any additional terms or phrases (beyond our current forbidden-terms list) that must not appear in any TTP surface.
7. **Required disclaimers** — any disclaimers that must accompany specific surfaces regardless of context.
8. **Regulatory concerns** — any features or wording that in counsel's view trigger a regulatory registration, license, or authorization requirement.
9. **Recommended legal documents / policies / T&Cs updates** — any additions to TexQtic's Terms of Service, Privacy Policy, or other legal documents that should be made before TradeTrust Pay surfaces are exposed to tenants or partners.

---

## 10. Attachments / Referenced Governance Artifacts

The following repository documents support this packet. They are available for counsel review on request.

| Document path | Description |
|---|---|
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001.md` | Full copy inventory; current disclaimer analysis; forbidden-language list; safe-language patterns; VPC/score/consent/partner/fee wording — operator review artifact |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-LEGAL-COUNSEL-REVIEW-PACKET-001.md` | Previous internal counsel review packet (v1); 9 sections; structured counsel questions (v1); Paresh decision options — prior governance artifact |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-TENANT-SURFACE-BLOCKED-LEGAL-001.md` | Formal record that TexQticScore v2 tenant surface is blocked pending legal clearance; full rationale |
| `governance/TTP-TEXQTICSCORE-V2-DESIGN-001.md` | TexQticScore v2 design decisions; open questions resolved; scoring model description; admin/tenant surface scope |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-TEXQTICSCORE-V2-DESIGN-DECISIONS-001.md` | TexQticScore v2 design decisions record |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | Phase 2 master implementation plan and tracker; all wave/unit statuses; no-go register |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` | Phase 2 architecture decisions; approved options; cross-cutting invariants |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md` | Confirmed product boundary decisions (no lending, no funds, no TReDS, etc.) |
| `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md` | Activation and rollback procedures; safety controls |

---

## 11. Final Status

```
TTP_EXTERNAL_LEGAL_COUNSEL_PACKET_001_STATUS = LEGAL_PACKET_UPGRADED_READY_FOR_COUNSEL
TTP_EXTERNAL_LEGAL_COUNSEL_PACKET_001_READY_TO_SEND_TO_COUNSEL = true
UPGRADE_UNIT = TEXQTIC-TRADETRUST-PAY-LEGAL-PACKET-UPGRADE-NC-SUPPLEMENT-001
UPGRADE_DATE = 2026-07-06
SCOPE = PLATFORM_TTP_AND_NC_TTP_UNIFIED
ttp_enabled = false (UNCHANGED)
NC_FEATURE_FLAGS = ALL_FALSE (UNCHANGED)
IMPLEMENTATION_AUTHORIZED = false
COUNSEL_FEEDBACK_RECEIVED = false
```

**No implementation of any TradeTrust Pay or NC-TTP surface is authorized until:**
1. Counsel provides written feedback on this upgraded packet (§12–§25).
2. That feedback is recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`.
3. Paresh explicitly approves the next bounded implementation unit.

**The 8 future implementation packets listed in §24 all remain `HOLD_FOR_PARESH_DECISION` pending counsel feedback.**

---

## 12. Upgrade Notice — NC-TTP Supplement Added (2026-07-06)

This packet has been upgraded from Platform TTP scope only to **Unified Platform TTP + NC-TTP scope**.

The upgrade was triggered by the completion of:
- `TEXQTIC-NC-TRADETRUST-PAY-DESIGN-001` (DESIGN_COMPLETE 2026-07-05)
- `TEXQTIC-TRADETRUST-PAY-ARCHITECTURE-DECISION-TERMS-LOCK-001` (ARCHITECTURE_LOCK_COMPLETE 2026-07-06)

**What changed in this upgrade:**
- Header metadata updated to reflect unified scope and upgrade date
- §11 Final Status updated to reflect upgraded scope
- §12–§25 added: upgrade notice, unified product description, regulatory posture matrix, consent framework doctrine, partner routing legal gate, user-facing wording review pack, disclaimer pack, terms acceptance flow requirements, data sharing / privacy questions, open legal questions, expanded counsel output, expanded attachments, future packet impact map, and final legal gate statement

**What did NOT change:**
- Original §1–§10 are unchanged in substance
- All existing safety invariants (§3.3) remain in full force
- All no-go positions (§4) remain in full force
- All existing disclaimer constants remain `LEGAL_REVIEW_PENDING`
- `ttp_enabled = false` — unchanged
- All NC feature flags — unchanged
- No implementation authorized

---

## 13. Unified Product Description — Platform TTP + NC-TTP

### 13.1 What TradeTrust Pay is (unified scope)

TradeTrust Pay is a **readiness, documentation, and trade-infrastructure layer** within the TexQtic platform. It exists in two product contexts that share a single legal doctrine:

| Context | Full name | Scope |
|---|---|---|
| Platform TTP | TradeTrust Pay (platform-level) | Available to all TexQtic tenants |
| NC-TTP | TradeTrust Pay (New Commerce extension) | Extension within NC procurement-pool and syndication contexts |

**TradeTrust Pay (both contexts) IS:**
- A seller readiness assessment tool (internal, advisory)
- A platform-internal advisory readiness indicator (TexQticScore)
- A Virtual Payment Commitment record system (VPC — internal record-keeping only)
- A payment-term visibility layer (shows agreed payment terms; does not enforce, guarantee, or fund them)
- A trade documentation layer (document upload, completeness tracking)
- A partner routing readiness package (routes a readiness package to an external finance partner; does NOT transmit funds, scores, or personal financial data unless explicit consent is in place)
- An external confirmation record layer (records a party's assertion that an external payment event occurred; does NOT verify, guarantee, or intermediary that payment)
- An audit and enrollment system (internal logs, admin-only)

**TradeTrust Pay (both contexts) is NOT and will NEVER be:**
- A lender, credit provider, or NBFC
- A credit bureau or credit scoring service
- An underwriter or insurance provider
- A payment gateway, payment aggregator, or payment intermediary
- An escrow agent or funds custodian
- A TReDS platform or receivables discounting platform
- A factoring company or financial arranger
- A payment guarantor
- A regulatory assessor of any kind
- An authority for any financial determination
- A holder of customer funds, even temporarily

### 13.2 NC-TTP specific roles

In the New Commerce context, TradeTrust Pay additionally:
- Attaches payment terms (payment days 5–100+, discount rates, schedule types) to NC procurement pool award events
- Tracks payment-term maturity status for awarded line items (informational only)
- Records external settlement confirmation assertions (buyer/supplier party assertion that a payment occurred; TexQtic does NOT verify or intermediate)
- Provides a finance-readiness signal to NC pool context (advisory only; not a credit score, not a credit decision)
- Inherits and extends the Platform TTP legal doctrine without creating a separate legal product

**NC-TTP payment-term maturity statuses are informational.** TexQtic does not hold funds, guarantee payment, or act as intermediary at any maturity status. The maturity status is a record of agreement terms and observed assertions — not a financial obligation of TexQtic.

---

## 14. Regulatory Posture Matrix

This matrix covers the 7 highest-risk regulatory classification questions for TradeTrust Pay (Platform TTP + NC-TTP combined).

**Legend:** Risk = risk if improperly implemented | Why safe = why the current design avoids this classification | Prohibited behavior = what must NEVER happen | Counsel question = question for counsel | Activation blocker = what blocks unsafe activation

---

### 14.1 Payment Aggregator / Payment Gateway Classification (PA/PG)

| Dimension | Position |
|---|---|
| Regulatory risk | PA/PG classification under RBI Payment Aggregators guidelines |
| Why safe (current design) | TexQtic does not touch, route, receive, hold, or settle any funds. External confirmation = party assertion only. No payment API calls. No escrow account (D-015: `escrow_account_id` = null permanently). |
| Prohibited behavior | Receiving, routing, holding, or settling funds on behalf of any party; operating as a payment intermediary; providing payment checkout for third parties |
| Counsel question | Does recording a buyer/supplier party assertion that an external payment occurred (without TexQtic touching the funds) constitute PA/PG activity? |
| Activation blocker | Any feature that routes, receives, or holds funds must be blocked at schema + feature-flag level before any TTP surface is activated |

### 14.2 NBFC / Lending Classification

| Dimension | Position |
|---|---|
| Regulatory risk | NBFC registration requirement; money lending regulations |
| Why safe | TexQtic does not provide credit, loans, or advances. TTP provides no financing. Partner routing routes only a readiness package — no funds. Finance partner decisions are entirely external to TexQtic. |
| Prohibited behavior | Providing any credit, loan, or advance to any party; guaranteeing repayment; holding receivables; acting as lending arranger |
| Counsel question | Does routing a readiness package to a finance partner (without TexQtic committing to or arranging financing) constitute NBFC activity or money lending activity? |
| Activation blocker | Partner routing must route readiness package only; any finance commitment must be entirely external; no partner routing activated until written counsel sign-off |

### 14.3 Credit Bureau / Credit Scoring Classification

| Dimension | Position |
|---|---|
| Regulatory risk | Credit Information Companies (Regulation) Act 2005 (CICRA); RBI credit bureau regulations |
| Why safe | TexQticScore is a platform-internal advisory readiness indicator derived entirely from platform usage signals (no CIBIL, no GSTN API, no AA, no credit bureau data). Disclaimers say explicitly it is not a credit score. Currently admin-only. |
| Prohibited behavior | Using CIBIL/AA/GSTN/credit bureau data to compute the score; calling it a credit score; sharing it with finance partners without CICRA-compliant consent; using it as an underwriting input |
| Counsel question | At what point (if any) does an internal advisory readiness score derived from platform signals only trigger CICRA obligations? Can it be shown to sellers with appropriate disclaimers? Can it be shared with finance partners (with consent) without creating credit bureau obligations? |
| Activation blocker | `BLOCKED_LEGAL` — tenant-visible TexQticScore requires written counsel sign-off |

### 14.4 Insurance / Guarantee Classification

| Dimension | Position |
|---|---|
| Regulatory risk | IRDAI insurance regulations; guarantee product regulations |
| Why safe | TexQtic provides no payment guarantees, trade guarantees, or indemnity of any kind. VPC is an internal readiness record, not a payment guarantee instrument. |
| Prohibited behavior | Representing VPC as a payment guarantee or insurance product; promising indemnity on payment failure; acting as surety |
| Counsel question | Does the term "Virtual Payment Commitment" or any VPC display copy create a risk of being interpreted as a payment guarantee instrument? What wording changes (if any) are required to make the non-guarantee nature clear? |
| Activation blocker | VPC display copy must be reviewed and approved by counsel before any tenant-visible VPC surface is activated |

### 14.5 Escrow / Funds Custody Classification

| Dimension | Position |
|---|---|
| Regulatory risk | Escrow agent / custodian classification; RBI escrow requirements |
| Why safe | D-015 (architecture lock): `escrow_account_id` field is permanently null; no escrow feature is designed or built. No funds held. |
| Prohibited behavior | Accepting funds for escrow; holding funds on behalf of buyers or suppliers; routing funds between parties |
| Counsel question | Is there any residual risk from the presence of an `escrow_account_id` schema field (permanently null, legacy bridge) that we should address by renaming or removing? |
| Activation blocker | Escrow feature is permanently locked off by architecture decision D-015 |

### 14.6 DPDP 2023 / Personal Data Classification

| Dimension | Position |
|---|---|
| Regulatory risk | Digital Personal Data Protection Act 2023 (DPDP); RBI data localisation |
| Why safe | No personal data is processed by TTP without consent framework in place. Consent table is `LEGAL_GATED__WAITING`. No data shared with partners currently. Data minimization as a design principle. |
| Prohibited behavior | Sharing any personal data (seller, buyer, director, GST) with any finance partner without explicit, recorded, versioned DPDP-compliant consent; inferred consent |
| Counsel question | What specific consent language, granularity, revocation mechanism, and retention policy is required under DPDP 2023 for: (a) sharing readiness indicators with finance partners; (b) sharing trade documents; (c) sharing payment-term data? |
| Activation blocker | Consent table and consent framework must be designed + reviewed by counsel before any partner data sharing is enabled |

### 14.7 Account Aggregator / GSTN / CIBIL Integration Risk

| Dimension | Position |
|---|---|
| Regulatory risk | AA framework (RBI); GST system operator rules; CIBIL data usage rules |
| Why safe | TexQtic has no AA integration, no live GSTN API call, no CIBIL API call, and no design for any of these. TexQticScore uses only platform-internal signals. |
| Prohibited behavior | Calling CIBIL/AA/GSTN APIs to compute or enrich TexQticScore; using AA-sourced financial data in any TTP computation; becoming an AA-framework participant without regulatory approval |
| Counsel question | Should we proactively clarify in our T&C / Privacy Policy that TexQticScore is derived from platform signals only and does not involve any AA, GSTN, or credit bureau data access? |
| Activation blocker | Any AA/GSTN/CIBIL integration requires explicit regulatory counsel review before design is begun |

---

## 15. Consent Framework Doctrine

**Status:** `LEGAL_GATED__WAITING` — no consent implementation authorized until counsel provides written framework.

The following doctrine describes the consent framework TexQtic intends to implement, subject to counsel review and approval:

### 15.1 Consent principles

1. **No inferred consent.** Consent for any data sharing or partner transmission must be explicit and affirmative. Continued use of the platform does not constitute consent for TTP data sharing.

2. **Granular consent by partner category and data category.** Consent must be obtained separately for each partner type (e.g., trade finance partner, dynamic discounting provider) and each data category (readiness indicators, trade documents, payment-term data, bank references).

3. **Role-specific consent.** Consent must be obtained from the appropriate authorized role within each tenant organization. Platform Admin or Owner role required for org-level consent; individual seller consent for individual data sharing.

4. **Transaction-level consent gate.** Consent must be verified before each partner routing action — not just once at enrollment.

5. **Versioned consent.** Consent must reference the version of the terms / consent text in force at time of acceptance. Re-acceptance is required when consent text changes materially.

6. **Revocation mechanism.** Every consent must be revocable at any time. Revocation must be effective immediately for future data sharing; historical data already shared is not recalled (but must be disclosed).

7. **Consent audit trail.** Every consent event (grant, revocation, re-acceptance) must be recorded with: timestamp, user ID, tenant org_id, version of consent text, IP address, scope of consent, channel (web/API).

8. **Data minimization.** Only the minimum data necessary for the specific consent scope may be shared. No bundling of unrelated data categories in a single consent event.

9. **Purpose limitation.** Data shared under a TTP-partner consent may only be used for the stated purpose. TexQtic T&C must prohibit finance partners from using data for purposes beyond the stated scope.

10. **Retention and deletion.** Consent records must be retained for the retention period required by DPDP 2023 (counsel to confirm). Deletion of consent records must be logged separately from deletion of the underlying data.

11. **DPDP 2023 compliance.** All consent language, notice requirements, revocation rights, and grievance mechanisms must comply with the Digital Personal Data Protection Act 2023 and any rules issued thereunder. Counsel must confirm the specific requirements.

12. **No activation without consent framework.** No partner routing, no finance request workflow, and no external data sharing of any kind may be activated until the consent framework has been:
    - Reviewed and approved by external legal counsel
    - Recorded in `TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001`
    - Approved by Paresh
    - Implemented in code (consent table + consent verification service)
    - Tested and audited

### 15.2 Proposed consent text (placeholder — requires counsel approval)

> **Consent text placeholder — LEGAL_REVIEW_PENDING — NOT FOR PRODUCTION USE**
>
> *"I, [User Name], on behalf of [Organisation Name] (Platform Account [Org ID]), provide explicit consent for TexQtic to share the following information with [Partner Name] for the sole purpose of [Purpose]: [Data Categories]. I understand that TexQticScore is an internal advisory readiness indicator and not a credit score or financial assessment. I understand that TexQtic does not guarantee any financing outcome. I understand that I may withdraw this consent at any time by [revocation mechanism]. This consent applies to [Scope] and expires on [Expiry Date / Event]."*

**Counsel questions on consent (see §21 for full list).**

---

## 16. External Partner Routing Legal Gate

**Status:** `PARTNER_GATED__WAITING` — no partner routing workflow authorized until all prerequisites below are met.

### 16.1 Prerequisites for any partner routing activation

All of the following must be satisfied before any external partner routing workflow may be activated:

1. **External legal counsel written sign-off** on the partner routing design (this packet).
2. **Partner contract in place** — a signed contract between TexQtic and the external finance partner, reviewed by counsel, with data protection clauses, purpose limitation, and no-misuse provisions.
3. **Data Protection Agreement (DPA)** — a signed DPA with the partner covering DPDP 2023 obligations, data minimization, retention, deletion, and grievance mechanisms.
4. **Consent framework operational** — the consent table, consent verification service, and consent audit trail must be built, tested, and audited before any partner routing occurs.
5. **Tenant explicit consent obtained** — the specific tenant (org_id) must have provided explicit, versioned, role-appropriate consent for the specific partner and data category.
6. **Paresh explicit authorization** — Paresh must issue written authorization (recorded in governance/control) before the partner routing feature flag is activated for any tenant.

### 16.2 What partner routing sends (readiness package only)

When (and only if) partner routing is eventually activated for a consenting tenant, the routing sends a **readiness package** only. The readiness package is:
- A set of platform-internal readiness signals (completeness indicators, VPC status, score band if approved)
- Trade documentation completeness indicators (not the documents themselves, unless separately consented)
- Payment-term data for the specific transaction (if consented)

The readiness package does NOT include:
- Raw GSTN data
- CIBIL or credit bureau data
- AA-sourced financial data
- Bank account numbers (unless separately consented and counsel-approved)
- Director personal data beyond what is consented

### 16.3 Counsel questions on partner routing

1. Does routing a readiness package (as described in §16.2) to an external finance partner constitute financial intermediation under any applicable regulation?
2. What specific data categories require separate DPDP 2023 consent before inclusion in a partner routing package?
3. What must the partner contract include to ensure TexQtic is not liable for the partner's financing decisions?
4. What language in a routing confirmation UI is legally risky (e.g., implies TexQtic endorsement of the partner, implies a financing commitment, implies a payment guarantee)?
5. Does the act of suggesting a finance partner to a tenant based on readiness signals constitute financial advice or regulated financial promotion?
6. Are there any SEBI, RBI, or IRDAI notifications we should review before building partner routing?

---

## 17. User-Facing Wording Review Pack (NC-TTP Supplement)

This section supplements §5 (original wording review surfaces) with NC-TTP-specific wording that requires counsel review.

**Legend:** All wording marked `[CANDIDATE]` is proposed only. All wording marked `[CURRENT]` is in use but pending review. All wording is `LEGAL_REVIEW_PENDING`.

### Surface NC-1: NC-TTP Payment Terms Display

| Item | Content |
|---|---|
| Surface | Payment terms attached to an NC procurement pool award (buyer-visible, supplier-visible) |
| Current wording | None — not yet implemented |
| Candidate wording | `[CANDIDATE]` *"Payment terms: [X] days from [Invoice / Delivery / Acceptance]. Discount rate: [Y]%. These terms were agreed between buyer and supplier at time of award. TexQtic records this agreement for informational purposes only and does not guarantee, enforce, or intermediate this payment."* |
| Counsel question | Is this display copy sufficient to make clear that TexQtic is not a payment guarantor or intermediary? |

### Surface NC-2: Payment-Term Maturity Status Label

| Item | Content |
|---|---|
| Surface | Maturity status shown on an NC award line item |
| Proposed status labels | `PENDING` / `DUE_SOON` / `DUE` / `OVERDUE` / `SETTLED_EXTERNAL` / `DISPUTED` / `EXTENDED` / `CANCELLED` / `NSS_PENDING` |
| Current wording | None — not yet implemented |
| Candidate disclaimer | `[CANDIDATE]` *"Maturity status reflects the agreed payment schedule and any party-reported events. It is informational only. TexQtic does not hold, route, or guarantee any payment. 'Settled External' means a party has reported that payment occurred externally; TexQtic has not verified this."* |
| Counsel question | Does labelling a line item as `OVERDUE` or `NSS_PENDING` create any legal exposure for TexQtic? Does `SETTLED_EXTERNAL` create any verification obligation? |

### Surface NC-3: External Settlement Confirmation Display

| Item | Content |
|---|---|
| Surface | Confirmation that a buyer or supplier has reported an external payment event |
| Current wording | None — not yet implemented |
| Candidate wording | `[CANDIDATE]` *"[Party] has reported that payment for this transaction was completed externally on [Date]. This is a party assertion recorded by TexQtic. TexQtic has not verified this payment and makes no representation as to its accuracy."* |
| Counsel question | Does recording and displaying a party assertion of external payment create any liability for TexQtic if the assertion is later disputed? |

### Surface NC-4: Finance-Readiness Signal to Finance Partner

| Item | Content |
|---|---|
| Surface | Readiness signal included in a partner routing package |
| Current wording | None — not yet implemented |
| Candidate wording | `[CANDIDATE]` *"TexQtic Readiness Indicator: [READY / NEAR_READY / NEEDS_REVIEW / NOT_READY]. This indicator is derived from platform-internal signals only. It is not a credit score, credit assessment, underwriting output, or financing recommendation. The finance partner makes all financing decisions independently of TexQtic."* |
| Counsel question | Is this disclaimer sufficient for inclusion in a readiness package sent to a finance partner? Does it need to be part of a formal data-sharing agreement rather than inline copy? |

### Surface NC-5: NC-TTP Disclaimer (supplement to main TTP disclaimer)

| Item | Content |
|---|---|
| Surface | Disclaimer shown on any NC-TTP surface visible to tenants |
| Current wording | None — not yet implemented |
| Candidate wording | `[CANDIDATE]` *"TradeTrust Pay (New Commerce) records payment terms agreed between buyers and suppliers, tracks maturity status, and provides a readiness documentation layer. TexQtic does not guarantee, enforce, or intermediate any payment. All maturity statuses are informational. External settlement confirmations are party assertions only — TexQtic has not verified any external payment."* |
| Counsel question | Is this disclaimer sufficient for NC-TTP tenant surfaces? Does it need to appear on every relevant screen or only on enrollment? |

### Forbidden wording additions (NC-TTP supplement to §5, Row 17)

The following terms must NOT appear in any NC-TTP tenant-visible surface without explicit counsel approval:

- "TexQtic guarantees payment"
- "TexQtic will collect payment"
- "TexQtic will process payment"
- "TexQtic escrow" / "escrow account"
- "Payment confirmed by TexQtic"
- "TexQtic verified this payment"
- "TexQtic finance" / "TexQtic credit"
- "TexQtic lending" / "TexQtic loan"
- "Credit assessment" (in any TTP/NC-TTP context)
- "Underwriting" (in any TTP/NC-TTP context)
- "NSS" or "Net Settlement Status" as a label visible to tenants without a disclaimer that this is an informational record only
- Any language implying TexQtic has intermediated, verified, or guaranteed a financial transaction

---

## 18. Disclaimer Pack

All disclaimers listed here are `LEGAL_REVIEW_PENDING`. None are approved for production use without counsel sign-off.

### Existing disclaimers (originally in §6)

**D-001: `TTP_DISCLAIMER_TEXT` (Platform TTP — current)**
> *"TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment."*
> Location: `server/src/ttp/ttp.constants.ts` — `LEGAL_REVIEW_PENDING`

**D-002: `SCORE_DISCLAIMER` (TexQticScore — current)**
> *"TradeTrust Score is an advisory readiness indicator only. It is not a credit score, payment guarantee, financing approval, or partner commitment."*
> Location: `server/src/services/ttpScore.service.ts` — `LEGAL_REVIEW_PENDING`

**D-003: `TEXQTICSCORE_V2_DISCLAIMER` (TexQticScore v2 — current)**
> *"TexQticScore is an advisory readiness indicator computed from platform-internal signals. It is not a credit bureau score, CIBIL assessment, underwriting output, or financing approval. It does not represent a regulatory determination of any kind."*
> Location: in-progress — `LEGAL_REVIEW_PENDING`

### Proposed new disclaimers (NC-TTP supplement — all LEGAL_REVIEW_PENDING)

**D-004: NC-TTP General Disclaimer (candidate)**
> *"TradeTrust Pay (New Commerce) records payment terms agreed between buyers and suppliers and tracks maturity status informally. TexQtic does not guarantee, enforce, fund, or intermediate any payment. Maturity statuses are informational only. External settlement confirmations are party assertions — TexQtic has not verified any external payment."*

**D-005: External Settlement Confirmation Disclaimer (candidate)**
> *"This settlement confirmation was reported by [Party Name]. TexQtic has not verified this payment and makes no representation as to its accuracy, completeness, or finality. This record is not a receipt, proof of payment, or guarantee."*

**D-006: Partner Routing Readiness Package Disclaimer (candidate)**
> *"This readiness package is provided to [Partner Name] solely for informational purposes, subject to explicit tenant consent. TexQtic makes no financing recommendation, credit assessment, or guarantee of any kind. All financing decisions are made independently by the finance partner."*

**D-007: Payment-Term Maturity Status Disclaimer (candidate)**
> *"Payment maturity status reflects the agreed schedule and any party-reported events. It is informational only. TexQtic does not hold, route, or guarantee any payment. Status changes require no action from TexQtic and do not constitute a financial obligation of TexQtic."*

**Counsel questions on disclaimer pack:**
1. Are disclaimers D-001, D-002, D-003 sufficient as currently worded?
2. Are proposed disclaimers D-004, D-005, D-006, D-007 sufficient? What revisions are needed?
3. Must any disclaimer appear on every screen (persistent), or is enrollment-time acceptance sufficient?
4. Are any of the forbidden wording items (§17) already present in the existing constants that must be corrected?

---

## 19. Terms Acceptance Flow Requirements

**Status:** `LEGAL_GATED__WAITING` — no terms acceptance flow may be implemented until counsel has approved the consent framework (§15) and the wording pack (§17).

When (and only if) a terms acceptance flow is eventually built, it must include all of the following elements:

1. **Version reference.** The acceptance record must capture the exact version of the terms text in force at time of acceptance.
2. **Explicit affirmative action.** Acceptance must require a deliberate affirmative action (checkbox + button, or equivalent). Pre-ticked checkboxes are not acceptable.
3. **Role identification.** The accepting user's role within the tenant org must be recorded. Only an authorized role (Platform Admin / Owner) may accept org-level TTP terms.
4. **Timestamp.** Acceptance timestamp must be recorded in UTC with millisecond precision.
5. **IP address.** Accepting user's IP address must be logged (subject to DPDP data minimization rules — counsel to confirm).
6. **Scope declaration.** The acceptance record must state the scope of the terms being accepted (e.g., "Platform TTP readiness signals", "NC-TTP payment terms visibility", "Partner routing — [Partner Name]").
7. **Re-acceptance trigger.** Re-acceptance must be required when the terms text changes materially. Counsel to define "materially".
8. **Audit trail.** All acceptance events must be recorded in the consent audit table and queryable by Paresh / TexQtic admin.
9. **Rollback capability.** If terms text is updated and the tenant has not re-accepted, access to the gated surface must be suspended until re-acceptance.
10. **No activation without accepted terms.** No TTP or NC-TTP surface gated behind terms acceptance may be shown to any user of any tenant until the acceptance record exists and is valid for the current terms version.

---

## 20. Data Sharing / Privacy Questions for Counsel

The following questions require written answers from counsel before any data sharing or privacy-related implementation is begun:

**DPDP 2023 compliance:**
1. What notice must TexQtic provide to data principals (sellers, buyers, directors) before processing their data for TTP/NC-TTP purposes?
2. What consent mechanisms are required under DPDP 2023 for: (a) internal score computation; (b) sharing readiness indicators with finance partners; (c) sharing trade documents; (d) sharing payment-term data?
3. What are the exact rights of data principals under DPDP 2023 that TexQtic must support (correction, erasure, grievance) for TTP/NC-TTP data?
4. Does DPDP 2023 require a data protection officer (DPO) or similar role for TexQtic given the scope of TTP/NC-TTP data processing?

**Consent withdrawal:**
5. If a tenant withdraws consent for partner data sharing, what is TexQtic's obligation regarding data already shared with the partner?
6. How long must TexQtic retain consent records after consent is withdrawn?

**Data minimization and purpose limitation:**
7. What is the minimum set of data fields that may be included in a partner routing readiness package without triggering additional consent requirements?
8. Can payment-term data (days, discount rate) be shared with a finance partner under a general TTP consent, or does it require separate, specific consent?

**Partner data sharing:**
9. What contractual provisions must TexQtic require of a finance partner as a condition of receiving readiness package data?
10. Does the transmission of a readiness package to a finance partner constitute "processing" under DPDP 2023 such that the partner must be a registered data fiduciary?
11. Can TexQtic share a supplier's TexQticScore band (not the raw score) with a buyer within the same NC procurement pool without triggering DPDP consent requirements?

**Document uploads and attachments:**
12. If a seller uploads trade documents (invoices, PO, packing lists) for TTP compliance purposes, what consent is required before those documents are shared with a finance partner?
13. What data retention limit applies to uploaded trade documents?

**Payment and bank references:**
14. If a buyer/supplier reports external payment via a bank reference or transaction ID, does recording that reference create any payment data processing obligation under DPDP 2023?
15. Does recording a buyer's or supplier's bank name (not account number) in a readiness package trigger any DPDP or RBI data governance obligation?

**Cross-border data transfer:**
16. If a finance partner is headquartered outside India, does sharing the readiness package with them constitute a cross-border data transfer under DPDP 2023? What safeguards are required?

---

## 21. Open Legal Questions — Counsel Decision Matrix (NC-TTP additions)

The following questions supplement §7 (original questions A–N) with NC-TTP-specific open questions requiring written counsel answers:

| Question ID | Question | Context | Activation blocker? |
|---|---|---|---|
| O | Does the NC-TTP payment-term maturity status display (§17, Surface NC-2) create any legal risk for TexQtic if a buyer claims the status is inaccurate? | Payment-term maturity | YES — NC-TTP payment terms display blocked until answered |
| P | Does the `NSS_PENDING` (Near-Settlement Status Pending) label create any implication that TexQtic is verifying or guaranteeing a near-settlement state? | NSS label | YES — NSS label blocked until answered |
| Q | Does recording a party's assertion of external settlement (§17, Surface NC-3) without verification create any negligent misrepresentation risk? | External confirmation | YES — external confirmation display blocked until answered |
| R | What must the partner routing readiness package disclaimer (D-006) contain to fully disclaim TexQtic's role as a financial intermediary? | Partner routing | YES — partner routing blocked until answered |
| S | Are any of the NC-TTP payment-term maturity status labels (OVERDUE, DISPUTED, SETTLED_EXTERNAL) legally risky as tenant-visible labels? | Payment-term labels | YES — maturity status labels blocked until answered |
| T | Does TexQtic's Terms of Service need to be updated to cover NC-TTP payment-term visibility before any tenant can see payment-term data? | T&C update | YES — T&C must be confirmed before NC-TTP tenant surfaces activated |
| U | Does TexQtic's Privacy Policy need to be updated to cover NC-TTP payment-term data and external confirmation data before any tenant can see these? | Privacy Policy update | YES — Privacy Policy must be confirmed before NC-TTP tenant surfaces activated |
| V | Is the VPC candidate display copy (§5, Row 11) sufficient to make clear that VPC is an internal readiness record and not a payment guarantee instrument? | VPC copy | YES — VPC tenant surface blocked until answered |
| W | Does showing a buyer a supplier's readiness indicator (score band or VPC status) within the same NC procurement pool require DPDP consent from the supplier? | Cross-party visibility | YES — buyer-visible supplier readiness blocked until answered |
| X | Can TexQtic share the NC-TTP finance-readiness signal (§17, Surface NC-4) with a finance partner under a general B2B data processing agreement, or is individual tenant consent required for each partner routing event? | Partner consent granularity | YES — partner routing blocked until answered |
| Y | What specific language in our T&C / Privacy Policy do we need to cover the NC-TTP "external confirmation" data record (buyer/supplier assertion of payment)? | T&C / Privacy Policy | YES — external confirmation display blocked until answered |

---

## 22. Expanded Counsel Output Expected

This section expands §9 (original requested counsel output) to include NC-TTP-specific outputs:

**From the original §9 (unchanged):**
1. Approved final wording for each disclaimer and surface listed in §5 and §6.
2. Redlines on any candidate wording that needs revision.
3. Explicit surface-by-surface restrictions (admin only, seller only, buyer excluded, etc.).
4. User-role limitations: which roles may see which surfaces.
5. Consent framework requirements: specific consent language, granularity, and revocation mechanism for DPDP 2023.
6. Must-not-use terms: a list of additional forbidden wording.
7. Required disclaimers: any disclaimers not currently present that counsel requires.
8. Regulatory concerns: any classification risk (NBFC, TReDS, credit bureau, PA, PG, etc.) that must be resolved before activation.
9. Recommended T&C and Privacy Policy updates that should be made before any TTP surface goes live for tenants.

**Additional outputs required for NC-TTP (new):**
10. Written answers to questions O–Y (§21) — each question is an activation blocker.
11. Approved or redlined versions of disclaimers D-004, D-005, D-006, D-007 (§18).
12. Written answers to data sharing / privacy questions 1–16 (§20).
13. Consent framework requirements specific to NC-TTP: partner routing consent, external confirmation consent, payment-term data consent.
14. Partner routing legal prerequisites: what must the partner contract and DPA contain (§16.3).
15. Confirmation of whether TexQtic's T&C and Privacy Policy must be updated before any NC-TTP surface goes live for tenants — and if so, a specific list of required updates.

---

## 23. Expanded Attachments (NC-TTP supplement)

The following reference documents supplement §10 and are provided for counsel's background reference:

| Document | Purpose |
|---|---|
| `governance/TEXQTIC-TRADETRUST-PAY-ARCHITECTURE-DECISION-TERMS-LOCK-001.md` | Architecture lock: D-001–D-015, master T&C doctrine, NC supplement, wording lock, feature gate matrix, consent/data-sharing lock, 12 open gaps, 8 future packets |
| `governance/TEXQTIC-NC-TRADETRUST-PAY-DESIGN-001.md` | NC-TTP full design: payment terms model, maturity statuses, NSS, external confirmation types, finance-readiness signal design, OES/VCO implications |
| `governance/legal/TTP-LEGAL-PACKET-OPERATOR-DECISION-GUIDE-001.md` | Operator decision guide: decision areas, options, implementation gate mapping, recommended safest path |

---

## 24. Future Packet Impact Map

The following 8 implementation packets (all `HOLD_FOR_PARESH_DECISION`) are blocked pending the counsel feedback that this upgraded packet is designed to obtain. The table maps each packet to the specific counsel outputs it requires before it can be authorized.

| Packet | What it builds | Requires from counsel |
|---|---|---|
| `TEXQTIC-TRADETRUST-PAY-CORE-ARCHITECTURE-SYNC-001` | Sync TTP data model with architecture lock decisions | None — pure internal architecture; no counsel gate |
| `TEXQTIC-NC-TRADETRUST-PAY-DATA-MODEL-001` | NC-TTP data model (payment terms, maturity, confirmation tables) | Confirmation that the data model does not create PA/PG or escrow classification risk |
| `TEXQTIC-NC-TRADETRUST-PAY-PAYMENT-TERMS-001` | Payment-term display for NC awards (tenant-visible) | Answers to questions O, S, T, U (§21); approved Surface NC-1 and NC-2 wording (§17); D-007 disclaimer approval (§18) |
| `TEXQTIC-NC-TRADETRUST-PAY-EXTERNAL-CONFIRMATION-001` | External settlement confirmation record + display | Answers to questions P, Q, Y (§21); approved Surface NC-3 wording (§17); D-005 disclaimer approval (§18) |
| `TEXQTIC-NC-TRADETRUST-PAY-FINANCE-READINESS-001` | Finance-readiness signal + partner routing workflow | Answers to questions R, W, X (§21); §16.3 partner routing questions answered; §20 privacy questions 7–15 answered; D-006 disclaimer approval (§18); consent framework (§15) approved |
| `TEXQTIC-NC-OES-TRADETRUST-PAY-ADAPTATION-001` | OES platform inherits NC-TTP doctrine | Same as NC-TTP packet plus OES-specific surface review |
| `TEXQTIC-NC-VCO-TRADETRUST-PAY-ADAPTATION-001` | VCO context inherits NC-TTP doctrine | Answers to question V (§21); approved VPC display copy (§5 Row 11) |
| `TTP-TEXQTICSCORE-V2-TENANT-SURFACE-001` | Tenant-visible TexQticScore surface | Answers to questions B, C, D, E, F, G from §7; CICRA analysis (§14.3); D-003 approved |

**Note:** The previously-listed placeholder packet `TEXQTIC-TRADETRUST-PAY-TERMS-CONSENT-LEGAL-PACKET-001` is now superseded by this upgraded packet. This upgraded packet IS the legal counsel preparation for terms and consent. It does not require a separate packet.

---

## 25. Final Legal Gate Statement

**This section is the canonical activation gate for all TradeTrust Pay and NC-TTP surfaces.**

```
TTP_EXTERNAL_LEGAL_COUNSEL_PACKET_001_STATUS = LEGAL_PACKET_UPGRADED_READY_FOR_COUNSEL
SCOPE = PLATFORM_TTP_AND_NC_TTP_UNIFIED
ttp_enabled = false — UNCHANGED
NC_FEATURE_FLAGS = ALL_FALSE — UNCHANGED

ACTIVATION_GATE = LOCKED

No tenant-visible TradeTrust Pay surface (Platform TTP or NC-TTP) may be activated until ALL of:
  1. External legal counsel provides written feedback on this upgraded packet.
  2. Counsel feedback is formally recorded in TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001.
  3. Paresh reviews counsel feedback and issues explicit written authorization.
  4. Each specific implementation packet is opened by Paresh with a bounded scope.
  5. The specific counsel outputs required for that packet (§24) have been received.

The following remain blocked regardless of any other authorization:
  - Tenant-visible TexQticScore (BLOCKED_LEGAL — §7 questions B–G unanswered)
  - Consent / data-sharing table (LEGAL_GATED__WAITING — §15 consent framework unapproved)
  - Partner routing workflow (PARTNER_GATED__WAITING — §16 prerequisites unmet)
  - Finance request tables (PARTNER_GATED__WAITING)
  - Dynamic discounting (PARTNER_GATED__WAITING)
  - Fee events / fee calculations (FUTURE_DESIGN_TARGET__WAITING)
  - Any AA / GSTN / CIBIL integration (architecture prohibition — D-003, D-005, D-011)
  - NC-TTP payment-term display (LEGAL_GATED__WAITING — §21 questions O, S, T, U unanswered)
  - NC-TTP external settlement confirmation display (LEGAL_GATED__WAITING — §21 questions P, Q, Y unanswered)
  - NC-TTP finance-readiness signal to partners (PARTNER_GATED__WAITING — §21 questions R, W, X unanswered)
  - VPC tenant-visible display (LEGAL_GATED__WAITING — §21 question V unanswered)
  - Any NC-TTP surface activation for OES or VCO contexts (HOLD_FOR_PARESH_DECISION)

IMPLEMENTATION_AUTHORIZED = false
COUNSEL_FEEDBACK_RECEIVED = false
NEXT_ACTION = Send this upgraded packet to external legal counsel.
NEXT_REPO_ACTION_AFTER_COUNSEL_FEEDBACK = TTP-LEGAL-COUNSEL-FEEDBACK-RECORD-001
```

---

*Produced under TexQtic governance — Safe-Write Mode always on.*
*Date: 2026-05-06*
*`ttp_enabled=false` — UNCHANGED. `LEGAL_REVIEW_PENDING` — UNCHANGED. No code changed.*
