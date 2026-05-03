# PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001

**Type:** Product Boundary Decision Record
**Status:** `DECIDED` — `DESIGN_ARTIFACT_OPENING_AUTHORIZED`
**Unit:** Escrow → TexQtic TradeTrust Pay
**Created:** 2026-05-03
**Confirmed by:** Paresh (founder)

---

## 1. Decision Summary

Paresh has confirmed all product boundary decisions required before opening `TEXQTIC-TRADETRUST-PAY-DESIGN-001`.

This record closes the `REQUIRES_PARESH_CONFIRMATION` items OD-001 through OD-005 (expanded to OD-001, OD-002, OD-003, OD-004A, OD-004B, OD-004C, OD-005) from Section 14 of the product scoping artifact at:

`governance/TEXQTIC-TRADETRUST-PAY-PRODUCT-SCOPING-001.md`

---

## 2. Authority and Scope

This document:

- Records product boundary confirmations from Paresh for TradeTrust Pay Phase 1.
- **Authorizes** the drafting and opening of the technical design artifact `TEXQTIC-TRADETRUST-PAY-DESIGN-001`.
- **Does NOT authorize implementation** of any capability described herein.
- **Does NOT authorize schema changes**, Prisma migrations, or database modifications.
- **Does NOT authorize route, service, frontend, or test changes.**
- **Does NOT authorize PSP activation**, payment execution, funds custody, payment aggregation, lending, payment guarantee, buyer default guarantee, or live finance-partner integration of any kind.
- **Does NOT authorize live CIBIL/bureau integration**, credit report pulls, or automated credit decisions — these require separate legal/compliance review, consent design, partner/API access confirmation, and data-privacy controls.
- **Does NOT authorize implementation of GST verification**, Invoice domain, Verified Payable Certificate, or any business-credit verification logic — all require the approved design artifact first.

---

## 3. Source Scoping Artifact

**Reference:** `governance/TEXQTIC-TRADETRUST-PAY-PRODUCT-SCOPING-001.md`

**Scoping verdict:** `SUFFICIENT_FOR_DESIGN_ARTIFACT_PROMPT`

This decision record resolves the open Paresh confirmations from Section 14 (Open Decisions for Paresh) of that scoping artifact. All five open decisions (OD-001 through OD-005, with OD-004 expanded to OD-004A, OD-004B, OD-004C) are now DECIDED.

---

## 4. Confirmed Decisions

| Decision | Status | Summary |
|---|---|---|
| OD-001 — Invoice Domain | `CONFIRMED` | Invoice domain IN_SCOPE_FOR_DESIGN; not implemented until design artifact approved |
| OD-002 — PSP / Regulatory Boundary | `CONFIRMED` | Phase 1 = system-of-record + routing-readiness only; no PSP, no live partner APIs; regulatory review founder-owned |
| OD-003 — Seller Paid Early | `CONFIRMED` | External-partner-only; TexQtic does not fund, lend, guarantee, or take credit risk |
| OD-004A — TradeTrust Pay Branding | `CONFIRMED` | Product branding only; no ICC/Singapore TradeTrust or W3C VC/DID/PKI/eBL standard integration in Phase 1 |
| OD-004B — GST + CIBIL Verification Layer | `CONFIRMED` | Phase 1 design must include GST verification and CIBIL/business-credit verification path; live integration requires separate legal/compliance review |
| OD-004C — Approval Gate Interpretation | `CONFIRMED` | GST = hard onboarding gate; CIBIL = TTP eligibility + credit-term gate; thin-file → manual review, not auto-rejection |
| OD-005 — Trade.escrow_id Optionality | `CONFIRMED` | Keep optional; no mandatory schema migration in Phase 1; service-level invariant for enrolled trades only |

---

## 5. OD-001 — Invoice Domain

**Decision:** `CONFIRMED`

> Invoice domain is IN_SCOPE_FOR_DESIGN for TradeTrust Pay Phase 1. It is not authorized for implementation until TEXQTIC-TRADETRUST-PAY-DESIGN-001 is approved.

**Implications for design artifact:**
- Invoice table/domain must be designed in `TEXQTIC-TRADETRUST-PAY-DESIGN-001`.
- Invoice implementation (schema, service, routes, frontend surface) requires design artifact approval before any code is written.
- Invoice lifecycle states (DRAFT, SUBMITTED, BUYER_CONFIRMED, DISPUTED, SETTLED) are to be defined in the design artifact.
- Relationship to Trade: 1 Trade → N Invoices (milestone billing must be supported in design).
- `org_id` tenant isolation is constitutional and must be enforced in all Invoice domain design.

---

## 6. OD-002 — PSP / Regulatory Boundary

**Decision:** `CONFIRMED`

> Phase 1 assumes no PSP activation, no payment execution, no funds custody, no payment aggregation, and no live finance-partner API integration. Phase 1 may design partner-routing stubs and data contracts only if they are non-executing, non-networked, and do not call external PSP, TReDS, SCF, NBFC, factoring, or bank APIs. Regulatory/legal review is founder-owned for now, with external legal/compliance counsel to be named before any Phase 2 PSP, TReDS, SCF, NBFC, factoring, or live finance-partner activation.

**Binding constraints this decision imposes on the design artifact:**
- All finance-partner routing designed in Phase 1 must be stub-only / data-contract-only — zero live API calls.
- No HTTP client, API key, webhook handler, or outbound network call to any PSP, TReDS platform, SCF platform, NBFC, factoring company, or bank may be designed, scaffolded, or implemented in Phase 1.
- Paresh (founder) owns regulatory/legal review responsibility. External legal/compliance counsel must be named and engaged before any Phase 2 PSP or live finance-partner scope is opened.
- The Wave 4 boundary (`governance/decisions/PRODUCT-DEC-WAVE4-BOUNDARY-RATIFIED.md`) and Phase 3 gate (`docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`) remain inviolable.

---

## 7. OD-003 — Seller Paid Early

**Decision:** `CONFIRMED`

> Seller-paid-early must be EXTERNAL-PARTNER ONLY. TexQtic records, verifies, packages, scores, and routes finance-ready payable information, but TexQtic does not fund advances, lend, guarantee payment, or take credit risk.

**TexQtic role (authoritative):** Records trade state → Verifies invoice → Issues Verified Payable Certificate → Routes VPC information to external finance partner (stub only in Phase 1). TexQtic has zero credit exposure, zero lending activity, zero custody.

**External-partner-only model:**
- Early payment to seller = funded by TReDS / SCF / NBFC / factoring partner (future Phase 2+).
- TexQtic's contribution = verified trade record + confirmed payable package + finance-readiness signal.
- No TexQtic balance sheet exposure. No NBFC licence required for Phase 1.

---

## 8. OD-004A — TradeTrust Pay Branding Boundary

**Decision:** `CONFIRMED`

> "TexQtic TradeTrust Pay" is product branding only for Phase 1. It does not imply integration with ICC/Singapore TradeTrust, W3C Verifiable Credentials, DID/PKI, eBL, or any external digital trade credential standard. Any such integration is FUTURE_PHASE, design-gated, and subject to legal/standards review before external claims.

**Binding constraints:**
- No W3C Verifiable Credential schema may be designed or implemented in Phase 1.
- No DID resolution, DID registry, or PKI infrastructure may be introduced in Phase 1.
- No eBL (electronic Bill of Lading) issuance or verification may be designed or implemented in Phase 1.
- No claim of ICC/Singapore TradeTrust standard compliance may be made in product documentation, UI, or marketing until digital credential standard integration is separately designed, built, and legally confirmed.
- Future digital credential standard integration requires: specification study, credential schema design, DID/PKI infrastructure assessment, and legal recognition review for target jurisdictions (India EXIM, Singapore MAS, etc.) — all design-gated before implementation.

---

## 9. OD-004B — GST + CIBIL / Business Credit Verification Layer

**Decision:** `CONFIRMED`

> TexQtic Trade Trust must include a business verification layer before buyer/seller approval and TradeTrust Pay eligibility. Phase 1 design must include GST registration verification for both buyer and seller. Phase 1 design must also define a CIBIL / TransUnion CIBIL business-credit verification path, or equivalent authorized credit-information partner path, for TradeTrust Pay eligibility, buyer credit-term eligibility, and risk-tiering. Live CIBIL integration, credit report pulls, automated credit decisions, or rejection based on bureau data require separate legal/compliance review, consent capture, partner/API access confirmation, and data-privacy controls before implementation.

**Required design sections in TEXQTIC-TRADETRUST-PAY-DESIGN-001:**

1. **GST Verification Design** — Process for verifying GST registration status of buyer and seller (data model, service interface, lifecycle state for "GST verified" status, integration surface design). Live API integration (GSTN/GSP) may be designed as a stub pending API access confirmation.

2. **CIBIL / Business-Credit Verification Design** — Data model for business credit profile linkage (org-level, not individual), service interface design for credit-information partner query, risk-tiering output design (e.g., ELIGIBLE, LIMITED_ELIGIBLE, MANUAL_REVIEW, INELIGIBLE_PENDING_REVIEW). Live integration requires:
   - Separate legal/compliance review
   - Consent capture design (DPDPA / RBI / CIBIL terms compliance)
   - Partner/API access confirmation (TransUnion CIBIL commercial API, GSP, or equivalent)
   - Data-privacy controls (data retention policy, purpose limitation, access control)

3. **TradeTrust Pay Eligibility Gate** — Business-credit verification output gates TradeTrust Pay enrollment. Design must include explicit eligibility states and what each state permits.

4. **Consent and Privacy Boundary** — Design must specify what consent is captured, when, from whom, for which credit-data usage, and how it is stored and revoked.

**What is NOT authorized in Phase 1 implementation:**
- Live CIBIL API calls
- Live credit report pulls
- Automated credit approval or rejection based on bureau data
- Storage of raw bureau/credit report data without approved privacy controls

---

## 10. OD-004C — Approval Gate Interpretation

**Decision:** `CONFIRMED`

> GST verification should be a hard onboarding gate for buyer/seller business approval, while CIBIL/business-credit verification should be a TradeTrust Pay eligibility and credit-term gate. Thin-file or unavailable CIBIL data should route to manual review or limited TradeTrust eligibility, not automatic rejection, unless a later policy decision explicitly authorizes rejection.

**Authoritative gate interpretation:**

| Gate | Type | Failure Behavior |
|---|---|---|
| GST Registration Verification | **Hard gate** — buyer/seller business approval | Cannot be marked as "verified business" without passing GST gate. Blocks TradeTrust Pay enrollment. |
| CIBIL / Business-Credit Verification | **Eligibility gate** — TradeTrust Pay enrollment + credit-term gating | Thin-file or unavailable data → MANUAL_REVIEW or LIMITED_TTP_ELIGIBILITY. Not automatic rejection. |
| Explicit rejection based on bureau data | **Requires future policy decision** | Cannot implement automatic rejection policy without a separate explicit policy authorization. |

**Design artifact must model:**
- `GST_VERIFIED` as a required lifecycle state/flag on the org profile before TTP enrollment is permitted.
- `CREDIT_ELIGIBLE` / `CREDIT_LIMITED` / `CREDIT_MANUAL_REVIEW` / `CREDIT_UNAVAILABLE` as distinct TTP eligibility states — not a binary pass/fail.
- Manual review queue or escalation path for `CREDIT_MANUAL_REVIEW` and `CREDIT_UNAVAILABLE` cases.
- No automatic disqualification from TTP unless a separate policy decision explicitly authorizes a rejection criterion.

---

## 11. OD-005 — Trade.escrow_id Optionality

**Decision:** `CONFIRMED`

> Keep Trade.escrow_id optional. Do not introduce a mandatory schema-level migration in Phase 1. TradeTrust Pay enrollment may require escrow/TradeTrust Ledger linkage as a service-level invariant for enrolled trades, but not all Trade records should be forced to have escrow_id.

**Current state:** `Trade.escrow_id` is `Int?` in `server/prisma/schema.prisma` — optional nullable FK → `escrow_accounts`. This is confirmed by audit.

**Binding constraints:**
- No `NOT NULL` constraint or mandatory FK migration may be introduced on `Trade.escrow_id` in Phase 1.
- TTP enrollment service may enforce `escrow_id IS NOT NULL` as a business invariant at the service layer for trades that are enrolled in TradeTrust Pay.
- This is a service-level guard, not a schema-level constraint, unless the design artifact explicitly plans and justifies a migration with full backfill/tombstone scope.
- Migration scope (if ever required): backfill all existing trades in active tenants, or create legacy-trade tombstone records. This must be assessed at design-artifact time.

---

## 12. Impact on Next Design Artifact

`TEXQTIC-TRADETRUST-PAY-DESIGN-001` must include, at minimum, the following design sections:

| Required Section | Basis |
|---|---|
| Invoice domain design (table, service, routes, frontend) | OD-001 |
| Buyer invoice approval workflow | OD-001 |
| Verified Payable Certificate (VPC) design | OD-001 |
| TradeTrust Ledger terminology mapping over existing escrow foundation | Scoping artifact Section 5.3 |
| Non-executing, non-networked finance-partner routing stub / data-contract design | OD-002 |
| GST verification design for buyer/seller onboarding approval gate | OD-004B, OD-004C |
| CIBIL / TransUnion CIBIL or equivalent business-credit verification design for TTP eligibility and credit-term gating | OD-004B, OD-004C |
| Consent, privacy, and legal/compliance boundary for business-credit data | OD-004B |
| Manual-review path for thin-file / unavailable credit data | OD-004C |
| No-live-PSP / no-live-finance-integration boundary confirmation | OD-002 |
| Trade.escrow_id optionality preserved; service-level linkage design for enrolled trades | OD-005 |
| Governance compliance table (D-020-B, D-020-C, D-017-A, G-018, G-019) | Constitutional |
| Runtime verification protocol (step-by-step curl/SQL evidence) | TECS discipline |
| Migration / no-migration decision with explicit scope | OD-005 |

---

## 13. No-Go Items Preserved

The following are unconditionally forbidden until separately authorized. This decision record does not change any of these constraints:

- No implementation from this decision record
- No schema changes
- No Prisma migrations
- No route changes
- No service changes
- No frontend changes
- No test changes
- No runtime or configuration changes
- No PSP activation
- No payment execution or payment gateway integration
- No funds custody
- No payment aggregation (no PA/PPI activity)
- No TexQtic-funded seller advances
- No lending or credit provision by TexQtic
- No payment guarantee
- No buyer default guarantee
- No live TReDS / SCF / NBFC / factoring / bank API calls
- No live CIBIL integration or credit report pulls — requires legal/compliance review, consent design, partner/API access confirmation, and data-privacy controls before implementation
- No automated credit approval or rejection based on bureau data
- No mandatory Trade.escrow_id schema-level migration
- No ICC/Singapore TradeTrust credential standard claim in any product surface
- No W3C Verifiable Credential, DID/PKI, or eBL infrastructure in Phase 1

---

## 14. Final Decision

**`DESIGN_ARTIFACT_OPENING_AUTHORIZED`**

The next prompt may draft and open `TEXQTIC-TRADETRUST-PAY-DESIGN-001`.

This authorization is for **design only**, not implementation. The design artifact must define the technical implementation plan, domain model, lifecycle states, route/service changes, frontend surfaces, GST verification design, CIBIL/business-credit verification design, test plan, runtime verification protocol, migration/no-migration decision, and governance compliance table before any implementation may be authorized.

**Implementation remains unauthorized until `TEXQTIC-TRADETRUST-PAY-DESIGN-001` is approved by Paresh.**

---

*Decision record created: 2026-05-03*
*Confirmed by: Paresh (founder)*
*Source scoping artifact: `governance/TEXQTIC-TRADETRUST-PAY-PRODUCT-SCOPING-001.md`*
*Next artifact to open: `TEXQTIC-TRADETRUST-PAY-DESIGN-001`*
