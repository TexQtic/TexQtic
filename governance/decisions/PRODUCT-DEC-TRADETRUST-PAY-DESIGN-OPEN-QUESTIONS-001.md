# PRODUCT-DEC-TRADETRUST-PAY-DESIGN-OPEN-QUESTIONS-001

**Status:** `SECTION_21_OPEN_QUESTIONS_RESOLVED`
**Date:** 2026-05-03
**Decision Owner:** Paresh (TexQtic)
**Document Type:** Governance Decision Record — Design Open Questions Only

---

## 1. Decision Summary

Paresh has reviewed and resolved all five open questions from **Section 21 — Open Questions / Decisions Before Implementation** of the TexQtic TradeTrust Pay Phase 1 design artifact:

> `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md`

All five questions (OQ-TTP-001 through OQ-TTP-005) are now confirmed. No open questions remain for Phase 1 design.

This decision record **authorizes preparing the next implementation prompt for Slice 1 — Foundation**, as defined in Section 20 of the design artifact. However, **this decision record does not itself authorize implementation**. Slice 1 implementation remains unauthorized until Paresh explicitly approves and runs the Slice 1 implementation prompt.

---

## 2. Authority and Scope

This document:

- Records design open-question decisions only (OQ-TTP-001 through OQ-TTP-005)
- Resolves Section 21 of `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md`
- Does **not** modify the technical design artifact by itself (a separate sync prompt may update the artifact if required)
- Does **not** authorize implementation
- Does **not** authorize schema changes
- Does **not** authorize database migrations
- Does **not** authorize Prisma schema or generated-client changes
- Does **not** authorize route, service, frontend, or test changes
- Does **not** authorize runtime or configuration changes
- Does **not** authorize PSP activation, payment execution, funds custody, payment aggregation, lending, guarantees, or live finance partner integrations of any kind

---

## 3. Source Design Artifact

**Resolved document:**
`governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md`

**Section resolved:**
Section 21 — Open Questions / Decisions Before Implementation

**Prior authorizing decision:**
`governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md`
(Status: `DESIGN_ARTIFACT_OPENING_AUTHORIZED`)

---

## 4. Confirmed Decisions Table

| Question | ID | Status | Final Decision Summary |
|---|---|---|---|
| Invoice amount cap per risk tier | OQ-TTP-001 | `CONFIRMED_WITH_REVISED_DEFAULTS` | FeatureFlag-backed configurable defaults; Tier 0 = ₹0; Tier 1 = ₹2,50,000; Tier 2 = ₹5,00,000; Tier 3 = ₹10,00,000 |
| VPC expiry policy | OQ-TTP-002 | `CONFIRMED` | expires_at defaults to invoice.due_date; admin override allowed with reason and approval; no due_date = no VPC unless admin supplies explicit expires_at |
| High-value invoice maker-checker threshold | OQ-TTP-003 | `CONFIRMED` | FeatureFlag-backed; default ₹10,00,000; gross_amount >= threshold requires maker-checker for UNDER_REVIEW → VERIFIED |
| Buyer visibility into seller's invoice | OQ-TTP-004 | `MODIFIED_AND_CONFIRMED` | Phase 1 must include limited buyer-visible invoice approval view; buyer sees approval-relevant fields only; buyer must not see seller credit/CIBIL/bureau/internal risk/routing data |
| TTP eligibility reassessment cadence | OQ-TTP-005 | `CONFIRMED_WITH_DEFAULT` | Admin-triggered only; default 180-day validity; expired assessment suspends new VPC issuance; existing VPCs remain valid until own expires_at |

---

## 5. OQ-TTP-001 — Invoice Amount Caps by Risk Tier

**Status:** `CONFIRMED_WITH_REVISED_DEFAULTS`

### Decision

Use **FeatureFlag-backed configurable defaults** for invoice amount caps per risk tier. Caps are platform-level defaults for Phase 1. They are not tenant-configurable in Phase 1.

### Default Caps

| Risk Tier | Meaning | Default Cap (INR) |
|---|---|---|
| Tier 0 | Thin-file / manual review | ₹0 — no VPC auto-eligibility |
| Tier 1 | Limited / trial eligibility | ₹2,50,000 |
| Tier 2 | Standard eligibility | ₹5,00,000 |
| Tier 3 | Strong eligibility | ₹10,00,000 |

### Recommended FeatureFlag Keys and Seed Values

| FeatureFlag Key | Default Value (paise / base unit) | Human-Readable Default |
|---|---|---|
| `ttp_max_invoice_amount_tier_1_inr` | `250000` | ₹2,50,000 |
| `ttp_max_invoice_amount_tier_2_inr` | `500000` | ₹5,00,000 |
| `ttp_max_invoice_amount_tier_3_inr` | `1000000` | ₹10,00,000 |

> **Note:** Values are stored as integers representing INR (not paise). The service layer must compare `invoice.gross_amount` (Decimal) against the flag value cast to Decimal at runtime.

### Service Layer Enforcement Rule

At VPC generation gate (3-way check in `VpcService.generateVpc()`), before issuing a VPC:

1. Read `ttp_eligibility_assessments (latest)` for the org → get `risk_tier`
2. If `risk_tier = 0` → block VPC generation (no auto-eligibility regardless of invoice amount)
3. If `risk_tier ≥ 1` → read relevant `FeatureFlag` (`ttp_max_invoice_amount_tier_{n}_inr`)
4. If `invoice.gross_amount > flag_value` → block VPC generation; return reason `INVOICE_AMOUNT_EXCEEDS_TIER_CAP`

If `ttp_eligibility_assessments.max_invoice_amount` is set explicitly for the org (admin override), that value takes precedence over the platform default. The per-org `max_invoice_amount` is the tighter constraint if lower than the platform default.

### Future-Design Clarification

**Buyer-seller relationship-specific invoice caps are `FUTURE_PHASE / DESIGN_GATED`.**

- Phase 1 uses platform-level FeatureFlag defaults only.
- A later design unit may introduce tenant-configurable caps per buyer-seller relationship, using `BuyerSupplierRelationship` or an equivalent policy table.
- No tenant-configurable buyer-seller cap implementation is authorized by this decision record.
- Any future per-relationship cap design requires a separate decision record before implementation.

---

## 6. OQ-TTP-002 — VPC Expiry Policy

**Status:** `CONFIRMED`

### Decision

`verified_payable_certificates.expires_at` defaults to `invoice.due_date`.

### Rules

1. **Default:** `expires_at = invoice.due_date` at VPC generation time.
2. **Admin override:** Admin may override `expires_at` per VPC where justified. Override requires a stated reason and maker-checker approval (consistent with VPC lifecycle `ACTIVE → ROUTING_READY` policy).
3. **Missing due_date:** If `invoice.due_date IS NULL`, VPC **cannot be issued** unless admin explicitly supplies an `expires_at` value with a stated reason.
4. **System expiry:** A VPC with `expires_at < now()` is treated as in terminal `EXPIRED` state. Automated expiry jobs are deferred to Phase 2 unless separately authorized.
5. **Not a payment instrument:** This expiry policy does not make a VPC a payment instrument, guarantee, bill of exchange, or negotiable instrument of any kind.

---

## 7. OQ-TTP-003 — High-Value Maker-Checker Threshold

**Status:** `CONFIRMED`

### Decision

Use a **FeatureFlag-backed configurable threshold** for the maker-checker requirement on the `UNDER_REVIEW → VERIFIED` invoice lifecycle transition.

### Threshold Value

| FeatureFlag Key | Default Value (INR) | Human-Readable |
|---|---|---|
| `ttp_maker_checker_threshold_inr` | `1000000` | ₹10,00,000 |

### Enforcement Rule

- If `invoice.gross_amount >= ttp_maker_checker_threshold_inr` → the `UNDER_REVIEW → VERIFIED` transition **requires maker-checker approval**.
- The comparison operator is `>=` (greater than or equal to), not `>`.
- The threshold is read from the FeatureFlag at transition-time (not cached per invoice).
- This reuses the existing `PendingApproval` / `ApprovalSignature` maker-checker pipeline (G-021).

---

## 8. OQ-TTP-004 — Buyer Visibility Into Seller Invoice

**Status:** `MODIFIED_AND_CONFIRMED`

### Decision

**Phase 1 must include a limited buyer-visible invoice approval view.** This is a modification from the original design recommendation (which proposed seller-only visibility in Phase 1).

### Buyer Entitlement

Buyer can:
- See invoice fields necessary to **approve, reject, or dispute** the payable for their trade.
- Take one of three actions: **approve**, **reject**, or **dispute** the invoice.

Buyer entitlement is scoped by: `verified_payable_certificates.buyer_org_id = buyer's org_id` from JWT (D-017-A).

### Allowed Buyer-Visible Invoice Fields

| Field | Allowed |
|---|---|
| Invoice number | ✅ |
| Trade reference | ✅ |
| Seller legal / business name | ✅ |
| Invoice date | ✅ |
| Due date | ✅ |
| Currency | ✅ |
| Gross amount (payable) | ✅ |
| Line / item summary (if available) | ✅ |
| Uploaded invoice document (if submitted for buyer approval) | ✅ |
| Approve / reject / dispute action | ✅ |
| Simple "Seller GST Verified" badge (boolean flag only) | ✅ |

### Explicitly Forbidden from Buyer View

| Data | Forbidden |
|---|---|
| Seller credit assessment (risk_tier, risk_score) | ❌ |
| CIBIL / bureau data or raw_bureau_json | ❌ |
| Internal eligibility assessment notes | ❌ |
| Admin review notes | ❌ |
| Partner-routing stub or payload | ❌ |
| Finance-readiness data or VPC internal fields | ❌ |
| Any internal org_id UUID of the seller | ❌ |
| Any platform pricing, fee, or margin data | ❌ |

### Frontend Note

The buyer-visible invoice approval surface must be a **separate, scoped read path** — not a filtered view of the seller's `InvoicesPanel`. A dedicated buyer-visible component (e.g., `InvoiceApprovalView`) must be designed and built as part of the Slice 4 — Invoice Domain implementation.

### Route Design Impact

This decision adds one new read route and one new action route for buyer entitlement (to be detailed in the Slice 4 prompt):
- `GET /api/tenant/trades/:tradeId/invoice-approval` — buyer reads invoice approval summary
- `POST /api/tenant/invoices/:invoiceId/buyer-action` — buyer approves / rejects / disputes

These routes enforce that the authenticated `org_id` from JWT matches the trade's buyer org.

---

## 9. OQ-TTP-005 — Eligibility Reassessment Cadence

**Status:** `CONFIRMED_WITH_DEFAULT`

### Decision

Phase 1 uses **admin-triggered reassessment only**. No automated background reassessment or expiry jobs.

### Default Validity

| FeatureFlag Key | Default Value | Unit |
|---|---|---|
| `ttp_eligibility_assessment_validity_days` | `180` | days |

### Rules

1. **Validity window:** Each `ttp_eligibility_assessments` row has an optional `valid_until` field. On creation, the service layer sets `valid_until = assessed_at + 180 days` by default (using the feature flag value).
2. **Expiry action:** When `valid_until < now()` for the latest assessment, **new VPC issuance is suspended** for the org until a fresh assessment is completed and confirmed as `ELIGIBLE`.
3. **Existing VPCs:** Existing VPCs that were already `ACTIVE` or `ROUTING_READY` **remain valid** until their own `expires_at` (per OQ-TTP-002), unless an admin explicitly voids them.
4. **Reassessment flow:** Admin-triggered only (Phase 1). Admin creates a new `ttp_eligibility_assessments` row; the service sets the new `valid_until` automatically.
5. **Automated jobs:** Background auto-expiry or auto-reassessment scheduling is deferred to a future phase and requires separate authorization. No automated jobs are authorized by this decision record.

---

## 10. Impact on Slice 1 — Foundation

### What This Decision Record Enables

The next implementation prompt may now be drafted for:

> **Slice 1 — Foundation** (as defined in Section 20.1 of `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md`)

### What Slice 1 May Include (When Separately Authorized)

Slice 1 items that may be included if Paresh authorizes the Slice 1 prompt:

- SQL DDL for all 7 proposed new tables (`invoices`, `invoice_lifecycle_logs`, `gst_verifications`, `ttp_eligibility_assessments`, `verified_payable_certificates`, `partner_routing_stubs`, `ttp_enrollment_logs`)
- `prisma db pull` + `prisma generate` (after SQL is applied and verified)
- Lifecycle state seed rows for `entity_type = 'INVOICE'` and `entity_type = 'VPC'`
- Lifecycle transition seed rows for INVOICE and VPC
- FeatureFlag seed rows, including:
  - `ttp_enabled` (default: false)
  - `ttp_max_invoice_amount_tier_1_inr` (default: 250000)
  - `ttp_max_invoice_amount_tier_2_inr` (default: 500000)
  - `ttp_max_invoice_amount_tier_3_inr` (default: 1000000)
  - `ttp_maker_checker_threshold_inr` (default: 1000000)
  - `ttp_eligibility_assessment_validity_days` (default: 180)
- Unit test infrastructure setup for TTP domain

### Explicit Statement

> **This decision record does not open Slice 1 implementation by itself.**

Implementation remains unauthorized until Paresh explicitly approves and runs a separate Slice 1 implementation prompt.

---

## 11. No-Go Items Preserved

The following are explicitly **not authorized** by this decision record or any prior TTP decision record unless separately stated:

| No-Go Item | Status |
|---|---|
| Implementation of any kind | ❌ NOT authorized |
| Schema changes | ❌ NOT authorized |
| Database migrations | ❌ NOT authorized |
| Prisma schema or generated-client changes | ❌ NOT authorized |
| Backend route changes | ❌ NOT authorized |
| Backend service changes | ❌ NOT authorized |
| Frontend component changes | ❌ NOT authorized |
| Test file changes | ❌ NOT authorized |
| Runtime or configuration changes | ❌ NOT authorized |
| Environment variable changes | ❌ NOT authorized |
| PSP activation | ❌ NOT authorized |
| Payment execution | ❌ NOT authorized |
| Funds custody | ❌ NOT authorized |
| Payment aggregation | ❌ NOT authorized |
| Lending | ❌ NOT authorized |
| Guarantees | ❌ NOT authorized |
| Live TReDS / SCF / NBFC / factoring / bank API calls | ❌ NOT authorized |
| Live GST government API calls | ❌ NOT authorized |
| Live CIBIL integration | ❌ NOT authorized |
| Live credit report pulls | ❌ NOT authorized |
| Automated credit rejection based on bureau data | ❌ NOT authorized |
| Tenant-configurable buyer-seller cap implementation | ❌ NOT authorized (FUTURE_PHASE / DESIGN_GATED) |
| External TradeTrust credential standard claim (ICC/W3C) | ❌ NOT applicable (product branding only — OD-004A) |
| Mandatory `Trade.escrow_id` migration | ❌ NOT authorized (OD-005 confirmed) |
| Balance columns in any table | ❌ NOT authorized (D-020-B) |
| New settlement table | ❌ NOT authorized unless separately authorized later |

---

## 12. Final Decision

```
SECTION_21_OPEN_QUESTIONS_RESOLVED
```

### Meaning

All five Section 21 open questions from `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md` are resolved:

| Question | Resolved |
|---|---|
| OQ-TTP-001 — Invoice amount cap per risk tier | ✅ |
| OQ-TTP-002 — VPC expiry policy | ✅ |
| OQ-TTP-003 — High-value maker-checker threshold | ✅ |
| OQ-TTP-004 — Buyer visibility into seller's invoice | ✅ |
| OQ-TTP-005 — TTP eligibility reassessment cadence | ✅ |

The next prompt may be drafted for **Slice 1 — Foundation**.

**Implementation remains unauthorized until Paresh explicitly approves the Slice 1 implementation prompt.**

---

*Decision authority: Paresh (TexQtic product owner)*
*Resolves: `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-001.md` Section 21*
*Authorized by: `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md`*
*Date: 2026-05-03*
