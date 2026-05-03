# TEXQTIC-TRADETRUST-PAY-DESIGN-001
## TexQtic TradeTrust Pay — Phase 1 Technical Design Artifact

**Status:** `DESIGN_ARTIFACT_READY_FOR_PARESH_REVIEW`
**Version:** 1.0
**Date:** 2026-05-03
**Author:** Copilot Agent (GitHub Copilot / Claude Sonnet 4.6)
**Authorized By:** `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md`
**Scoping Artifact:** `governance/TEXQTIC-TRADETRUST-PAY-PRODUCT-SCOPING-001.md`

---

## Section 1 — Purpose and Authority

### 1.1 Purpose

This document is the technical design artifact for **TexQtic TradeTrust Pay (TTP) Phase 1**. It establishes the system design for a **verified trade, invoice-readiness, settlement-visibility, GST/business verification, and embedded-finance routing-readiness layer** for B2B textile trade on the TexQtic platform.

The product proposition is:
> **"Seller paid early. Buyer pays later. Trade stays trusted."**

TradeTrust Pay is not a payment processor. It is not a financial institution. It is a **trust infrastructure layer** that makes trades eligible for embedded-finance routing by building verified, structured trade data on top of the existing TexQtic trade and escrow foundation.

### 1.2 Scope Boundary

This is a **design artifact only**. No implementation, schema migration, route registration, or service code is created in this document. All sections describe *proposed design* — no file is changed, no migration is applied.

### 1.3 Authorizing Decision Record

All boundary decisions that unblock this design were confirmed in:
- `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md`
- Status: `DESIGN_ARTIFACT_OPENING_AUTHORIZED`

Decisions confirmed: OD-001, OD-002, OD-003, OD-004A, OD-004B, OD-004C, OD-005

---

## Section 2 — Source Authorities

| Source | Role |
|---|---|
| `server/prisma/schema.prisma` | Canonical database model (all ~1,400 lines read) |
| `server/src/services/escrow.service.ts` | Escrow service layer (G-018) |
| `server/src/services/settlement/settlement.service.ts` | Settlement service (G-019, TOGGLE_B=B1) |
| `server/src/services/trade.g017.service.ts` | Trade service (G-017) |
| `server/src/routes/tenant/escrow.g018.ts` | Tenant escrow routes |
| `server/src/routes/tenant/settlement.ts` | Tenant settlement routes |
| `server/src/routes/tenant/trades.g017.ts` | Tenant trade routes |
| `server/src/routes/control.ts` | Control-plane routes incl. finance/payouts |
| `components/Tenant/EscrowPanel.tsx` | Tenant escrow UI |
| `components/Tenant/TradesPanel.tsx` | Tenant trades UI |
| `components/Tenant/SettlementPreview.tsx` | Settlement preview UI |
| `components/ControlPlane/FinanceOps.tsx` | Control-plane finance UI |
| `governance/TEXQTIC-TRADETRUST-PAY-PRODUCT-SCOPING-001.md` | Product scoping |
| `shared/contracts/` | API and event governance contracts |
| TexQtic Doctrine v1.4 | D-017-A, D-020-B, D-020-C, D-020-D, G-018, G-019, G-021, G-022 |

---

## Section 3 — Focused Repo-Truth Refresh

### 3.1 Confirmed Absent (Never Assume Otherwise)

The following concepts do **NOT** exist anywhere in the current codebase:

| Concept | Status |
|---|---|
| `Invoice` model / table | ABSENT — new table proposed in Section 7 |
| `VerifiedPayableCertificate` model / table | ABSENT — new table proposed in Section 7 |
| `GstVerification` model / table | ABSENT — new table proposed in Section 7 |
| `CibilVerification` / business-credit model | ABSENT — new table proposed in Section 7 |
| `FinanceRequest` / `PaymentSchedule` / `FinancePartner` models | ABSENT — not proposed for Phase 1 |
| TradeTrust credential (ICC/W3C) | ABSENT — product branding only (OD-004A) |
| PSP/payment-gateway model | ABSENT — not in Phase 1 scope (OD-002) |
| Live GST API integration | ABSENT — routing-readiness only (OD-002) |
| Live CIBIL API integration | ABSENT — routing-readiness only (OD-002) |
| Invoice lifecycle state keys | ABSENT — must be seeded as lifecycle_states rows |
| TTP enrollment state keys | ABSENT — must be seeded as lifecycle_states rows |

### 3.2 Confirmed Present (Foundation to Build On)

| Concept | Location | Design Implication |
|---|---|---|
| `Trade` model | `schema.prisma` | Invoice anchors to Trade.id (FK) |
| `Trade.escrow_id` | Optional FK → `escrow_accounts.id` | Remains optional (OD-005); no migration |
| `Trade.grossAmount` | Decimal(18,6), CHECK > 0 | Invoice amount ≤ grossAmount validation |
| `escrow_accounts` | `schema.prisma` (snake_case model) | Settlement foundation; no balance column (D-020-B) |
| `escrow_transactions` | `schema.prisma` (snake_case model) | Append-only ledger; entry_type CHECK: HOLD\|RELEASE\|REFUND\|ADJUSTMENT |
| `organizations.status` | CHECK constraint with 7 legal states | GST/CIBIL gates integrate with existing verification state machine |
| `organizations.risk_score` | SmallInt default 0 | CIBIL eligibility tier output maps to this field |
| `LifecycleState` / `AllowedTransition` | `schema.prisma` | Invoice, VPC, TTP enrollment lifecycles seed new rows here |
| `PendingApproval` / `ApprovalSignature` | G-021 maker-checker pipeline | TTP high-value invoice transitions reuse this |
| `EscalationEvent` | G-022; entityType TRADE\|ESCROW\|APPROVAL\|LIFECYCLE_LOG\|ORG\|GLOBAL | TTP can add INVOICE entityType in Phase 2 |
| `FeatureFlag` + `TenantFeatureOverride` | `schema.prisma` | TTP enrollment gated by feature flag |
| `BuyerSupplierRelationship` | `schema.prisma` | Buyer/seller pairing eligibility check for TTP |
| `EscrowService` | `escrow.service.ts` | Uses `$queryRaw/$executeRaw`; escrow tables not yet in Prisma typed models |
| `SettlementService` | `settlement.service.ts` | Pure orchestrator; TOGGLE_B=B1 ledger-only |
| `DocumentExtractionDraft` | `schema.prisma` | AI extraction pattern to reuse for invoice document extraction |
| `Sanction` | `schema.prisma` | G-024 sanctions check must gate TTP enrollment |
| `Certification` | `schema.prisma` | Used in VPC evidence chain |

### 3.3 Critical Implementation Notes from Repo-Truth

1. **EscrowService uses `$queryRaw`**: `escrow_accounts` and `escrow_transactions` were applied to DB without a `prisma db pull` at time of implementation. The EscrowService explicitly notes this in its JSDoc. Any new Invoice or TTP tables MUST be added via `prisma db pull` + `prisma generate` after SQL application so they get typed Prisma models.

2. **SettlementService is TOGGLE_B=B1**: Monetary truth is `escrow_transactions` SUM. There is no separate settlement table. TTP Phase 1 does not change this.

3. **`organizations.status` verification state machine already exists**: The control-plane route (`control.ts`) already handles `PENDING_VERIFICATION → VERIFICATION_APPROVED / VERIFICATION_REJECTED / VERIFICATION_NEEDS_MORE_INFO` transitions. GST and CIBIL gates should hook into and extend this existing pipeline — not create a parallel one.

4. **`escrow_accounts.tenant_id` (not `org_id`)**: Unlike most models that use `org_id` for RLS, `escrow_accounts` is scoped by `tenant_id`. This is a known schema asymmetry. Invoice and TTP tables must use `org_id` (canonical RLS boundary) consistently.

5. **Finance payouts read path**: `GET /api/control/finance/payouts` reads `escrow_transactions` filtered to `entry_type='RELEASE'`, `direction='DEBIT'`. Settlement supervision events are stored in `EventLog` with event types `finance.record.verified` and `finance.record.follow_up_required`. TTP settlement visibility reads this same path.

---

## Section 4 — Current Foundation

### 4.1 What Exists Today

```
Trade (G-017)
  ├── Trade lifecycle states (LifecycleState / AllowedTransition)
  ├── Trade events (TradeEvent — append-only)
  ├── Trade lifecycle logs (TradeLifecycleLog)
  ├── Escrow account (escrow_accounts) ← optional FK from Trade.escrow_id
  │     ├── Escrow lifecycle states
  │     ├── Escrow lifecycle logs (EscrowLifecycleLog)
  │     └── Escrow transactions (escrow_transactions — append-only ledger)
  ├── Maker-Checker pipeline (PendingApproval / ApprovalSignature)
  ├── Escalation events (EscalationEvent)
  └── RFQ source (Rfq → Trade)

Organizations (cross-plane canonical entity)
  ├── organizations.status (verification state machine)
  ├── organizations.risk_score (SmallInt)
  ├── BuyerSupplierRelationship
  ├── Certification (G-019)
  ├── Sanctions (G-024)
  └── TraceabilityNode / TraceabilityEdge (G-016)

Feature Flags (FeatureFlag / TenantFeatureOverride)
AI / Document Intelligence (DocumentExtractionDraft / DocumentEmbedding)
Settlement (SettlementService — pure orchestrator, TOGGLE_B=B1)
```

### 4.2 The Gap TradeTrust Pay Fills

```
CURRENT STATE:
  Trade + Escrow + Settlement → internal ledger visibility only
  No invoice as a first-class domain entity
  No structured invoice readiness for external finance partner routing
  No GST verification gate on TTP eligibility
  No CIBIL/business-credit eligibility scoring
  No Verified Payable Certificate (trust signal for finance routing)
  No TTP enrollment surface

DESIRED STATE (Phase 1):
  Trade + Escrow + Settlement (unchanged foundation)
  + Invoice (new domain entity, anchored to Trade)
  + GstVerification (structured gate on org onboarding)
  + TtpEligibility (CIBIL-tier output, maps to organizations.risk_score)
  + VerifiedPayableCertificate (trust signal per invoice, not payment instrument)
  + PartnerRoutingStub (read-only data contract, no live partner API)
  + TTP Enrollment (feature-flagged, per-tenant opt-in)
```

---

## Section 5 — Product Model

### 5.1 User Roles

| Role | Plane | TTP Interaction |
|---|---|---|
| Seller (Supplier Org) | Tenant | Uploads/registers invoice; applies for TTP; receives settlement-visibility read |
| Buyer (Buyer Org) | Tenant | Acknowledges trade; may see payment obligation summary (read-only) |
| Platform Admin | Control | Reviews GST verification; approves/rejects TTP enrollment; oversees partner routing stub |
| Finance Partner (Phase 1) | External | Receives routing stub payload (data contract only; no live API in Phase 1) |

### 5.2 Phase 1 Product Flow

```
1. Seller onboards → GST verification gate (PENDING_VERIFICATION → VERIFICATION_APPROVED)
2. CIBIL / business-credit check → risk_score tier (0=thin-file → manual; 1=low; 2=medium; 3=high)
3. Seller creates Trade (existing flow)
4. Seller registers Invoice against Trade (new: POST /api/tenant/invoices)
5. Platform validates Invoice: amount ≤ Trade.grossAmount; currency match; Trade not in terminal state
6. Invoice lifecycle: DRAFT → SUBMITTED → VERIFIED → ELIGIBLE / INELIGIBLE
7. On VERIFIED Invoice + VERIFICATION_APPROVED org + risk_score ≥ CIBIL minimum:
   → System generates Verified Payable Certificate (VPC) record
8. VPC feeds PartnerRoutingStub (structured JSON data contract, admin-only read in Phase 1)
9. Settlement (existing flow) → Settlement visibility surface shows TTP-enriched trade summary
10. Buyer pays at scheduled term → Trade closes (existing settlement flow, unchanged)
```

### 5.3 What Phase 1 Does NOT Do

- No money movement by TexQtic
- No disbursement to seller
- No live call to any PSP, bank, NBFC, or finance partner API
- No GSTIN real-time validation via government API (structured capture only in Phase 1)
- No live CIBIL bureau pull (manual review path for Phase 1; API stub for future)
- No buyer credit line issuance
- No interest rate calculation
- No repayment schedule creation

---

## Section 6 — Non-Goals and Regulatory Boundaries

### 6.1 Confirmed Non-Goals (OD-002, OD-003, OD-004A)

| Non-Goal | Rationale |
|---|---|
| Live PSP integration | Phase 1 = routing-readiness only |
| Seller disbursement | External-partner-only (OD-003) |
| W3C/ICC TradeTrust credential standard | Product branding only; no W3C credential spec (OD-004A) |
| NBFC/bank regulatory registration | Not a payment instrument; out of scope |
| Buyer credit scoring | Phase 1 = seller eligibility only |
| Real-time GST API (government) | Phase 1 = structured capture + manual gate |
| Real-time CIBIL bureau pull | Phase 1 = manual review + risk_score write |
| Finance partner profit/loss tracking | No money movement; no platform-held funds |
| Withdraw / Transfer / Payout UI buttons | Finance components are read-only (per product policy) |

### 6.2 Regulatory Red Lines

1. **TexQtic is NOT a payment aggregator**. TradeTrust Pay does not hold, move, or direct funds.
2. **VPC is NOT a negotiable instrument**. It is a structured data record. It carries no legal tender value.
3. **No implied RBI authorization**. The design must not imply or require any NBFC, PPI, or PA license.
4. **GST data is personal/business-sensitive**. It must be stored with org-scoped RLS and never exposed cross-tenant.
5. **CIBIL / credit bureau data is regulated**. Any live CIBIL API integration (future Phase 2+) requires explicit legal review. Phase 1 stores only manual-review outcomes.

### 6.3 Doctrine Constraints

| Doctrine | Constraint |
|---|---|
| D-020-B | No balance column; balance derived from ledger SUM at all times |
| D-020-C | AI involvement requires `HUMAN_CONFIRMED:` prefix in reason; human review always required before lifecycle action |
| D-017-A | `org_id` ALWAYS from JWT/auth context; never from request body |
| G-018 | Escrow foundation; TTP does not modify escrow schema |
| G-019 | Settlement TOGGLE_B=B1 (ledger-only); TTP does not add a settlement table |
| G-021 | High-value invoice transitions use maker-checker pipeline |
| G-022 | Escalation / freeze gate must be checked before any TTP lifecycle transition |

---

## Section 7 — Domain Model Design

### 7.1 Existing Foundation (Unchanged)

The following tables are used by TTP but are **not modified**:

- `trades` (Trade) — anchor for Invoice
- `escrow_accounts` — anchor for settlement visibility
- `escrow_transactions` — monetary ledger
- `organizations` — verification status + risk_score
- `lifecycle_states` — new rows SEEDED for Invoice, VPC, TTP enrollment entities
- `allowed_transitions` — new rows SEEDED for Invoice, VPC, TTP enrollment transitions
- `pending_approvals` / `approval_signatures` — reused for high-value invoice approvals
- `escalation_events` — reused for TTP dispute/freeze
- `feature_flags` / `tenant_feature_overrides` — TTP enrollment gated here

### 7.2 New Entities Proposed

#### 7.2.1 `invoices` table

```sql
-- Proposed DDL (design only — NOT applied in this document)
CREATE TABLE invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),       -- RLS boundary (seller)
  trade_id              UUID NOT NULL REFERENCES trades(id),              -- anchor trade
  invoice_number        VARCHAR(100) NOT NULL,                            -- seller's invoice reference
  invoice_date          TIMESTAMPTZ NOT NULL,
  due_date              TIMESTAMPTZ,                                      -- payment due date
  currency              VARCHAR(10) NOT NULL,
  gross_amount          DECIMAL(18,6) NOT NULL CHECK (gross_amount > 0),  -- ≤ trades.gross_amount validation at service layer
  lifecycle_state_id    UUID NOT NULL REFERENCES lifecycle_states(id),    -- entity_type='INVOICE'
  document_url          VARCHAR(1000),                                    -- optional: uploaded invoice PDF URL
  extraction_draft_id   UUID REFERENCES document_extraction_drafts(id),  -- optional: AI extraction draft link
  notes                 TEXT,
  created_by_user_id    UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE invoices ADD CONSTRAINT invoices_currency_match
  CHECK (char_length(currency) BETWEEN 3 AND 10);

-- Unique per org+trade+invoice_number (prevents duplicate invoice registration)
CREATE UNIQUE INDEX invoices_org_trade_number_unique
  ON invoices (org_id, trade_id, invoice_number);

CREATE INDEX idx_invoices_org_id ON invoices (org_id);
CREATE INDEX idx_invoices_trade_id ON invoices (trade_id);
CREATE INDEX idx_invoices_lifecycle_state_id ON invoices (lifecycle_state_id);
CREATE INDEX idx_invoices_org_created ON invoices (org_id, created_at DESC);
```

**RLS Policy Design:**
- `RESTRICTIVE` guard: fail-closed if `app.org_id` GUC not set
- `PERMISSIVE` tenant SELECT: `org_id = current_setting('app.org_id')::uuid`
- No direct UPDATE/DELETE by tenant; lifecycle changes via service layer only
- Admin: full read via SECURITY DEFINER function or service-role path

#### 7.2.2 `invoice_lifecycle_logs` table

```sql
-- Proposed DDL (design only)
CREATE TABLE invoice_lifecycle_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  from_state_key    VARCHAR(100),
  to_state_key      VARCHAR(100) NOT NULL,
  actor_user_id     UUID,
  actor_admin_id    UUID,
  actor_type        VARCHAR(50) NOT NULL,
  actor_role        VARCHAR(50) NOT NULL,
  escalation_level  INT,
  maker_user_id     UUID,
  checker_user_id   UUID,
  ai_triggered      BOOLEAN NOT NULL DEFAULT false,  -- D-020-C
  impersonation_id  UUID,
  reason            TEXT NOT NULL,
  request_id        VARCHAR(200),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Append-only: no UPDATE or DELETE allowed (RLS + trigger pattern)
```

#### 7.2.3 `gst_verifications` table

```sql
-- Proposed DDL (design only)
-- Captures structured GST data submitted by an org for onboarding gate.
-- Phase 1: manual capture only. Phase 2: live GSTIN API validation stub.
CREATE TABLE gst_verifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL UNIQUE REFERENCES organizations(id),  -- one per org
  gstin                 VARCHAR(20) NOT NULL,                                -- 15-char GSTIN format validated at service layer
  legal_name_on_gst     VARCHAR(500) NOT NULL,
  state_code            VARCHAR(10) NOT NULL,
  registration_type     VARCHAR(50) NOT NULL,                               -- REGULAR | COMPOSITION | SEZ | etc.
  filing_status         VARCHAR(30) NOT NULL DEFAULT 'UNKNOWN',             -- ACTIVE | CANCELLED | SUSPENDED | UNKNOWN
  submitted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at           TIMESTAMPTZ,
  reviewed_by_admin_id  UUID,
  review_outcome        VARCHAR(30),                                        -- APPROVED | REJECTED | NEEDS_MORE_INFO
  review_notes          TEXT,
  raw_verification_json JSONB NOT NULL DEFAULT '{}',                        -- Phase 1: manual doc; Phase 2: API response
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gst_verifications_org_id ON gst_verifications (org_id);
CREATE INDEX idx_gst_verifications_gstin ON gst_verifications (gstin);
```

**RLS Policy Design:**
- `RESTRICTIVE` guard (fail-closed)
- Tenant can only SELECT their own row (`org_id = current_setting('app.org_id')::uuid`)
- Tenant INSERT via service layer; no tenant UPDATE after submission (admin review only)
- Admin: full read/write via SECURITY DEFINER or service-role

#### 7.2.4 `ttp_eligibility_assessments` table

```sql
-- Proposed DDL (design only)
-- Captures CIBIL/business-credit eligibility assessment per org.
-- Phase 1: manual assessment by admin. Phase 2: bureau API integration stub.
-- Outcome maps to organizations.risk_score (SmallInt).
CREATE TABLE ttp_eligibility_assessments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  assessment_type       VARCHAR(50) NOT NULL DEFAULT 'MANUAL',             -- MANUAL | BUREAU_API (future)
  risk_tier             SMALLINT NOT NULL DEFAULT 0                        -- 0=thin-file/manual; 1=low; 2=medium; 3=high
                          CHECK (risk_tier BETWEEN 0 AND 3),
  eligibility_outcome   VARCHAR(30) NOT NULL,                              -- ELIGIBLE | INELIGIBLE | MANUAL_REVIEW
  max_invoice_amount    DECIMAL(18,6),                                     -- per-invoice cap based on risk tier
  currency              VARCHAR(10) NOT NULL DEFAULT 'INR',
  assessed_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  assessed_by_admin_id  UUID,
  assessment_notes      TEXT,
  valid_until           TIMESTAMPTZ,                                       -- assessment expiry (nullable = indefinite)
  raw_bureau_json       JSONB NOT NULL DEFAULT '{}',                       -- Phase 1: manual doc; Phase 2: bureau response
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most-recent assessment per org
CREATE INDEX idx_ttp_eligibility_org_assessed ON ttp_eligibility_assessments (org_id, assessed_at DESC);
```

**Key design rule:** When `assessment_type='MANUAL'` and `risk_tier=0`, `eligibility_outcome` MUST be `MANUAL_REVIEW`. The service layer enforces this invariant.

**Relationship to `organizations.risk_score`:** On final assessment confirmation, the service layer writes `risk_tier` into `organizations.risk_score`. The `ttp_eligibility_assessments` table is the audit trail; `risk_score` is the operative fast-read field.

#### 7.2.5 `verified_payable_certificates` table

```sql
-- Proposed DDL (design only)
-- VPC: trust signal per invoice. NOT a payment instrument. NOT a negotiable instrument.
-- Anchors to: invoices.id (one-to-one), trades.id, seller org, buyer org.
-- Generated only when: Invoice is VERIFIED + org is VERIFICATION_APPROVED + risk_score ≥ min_tier.
CREATE TABLE verified_payable_certificates (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),         -- seller org (RLS boundary)
  invoice_id            UUID NOT NULL UNIQUE REFERENCES invoices(id),       -- 1:1 with invoice
  trade_id              UUID NOT NULL REFERENCES trades(id),
  buyer_org_id          UUID NOT NULL REFERENCES organizations(id),
  seller_org_id         UUID NOT NULL REFERENCES organizations(id),
  vpc_reference         VARCHAR(100) NOT NULL UNIQUE,                       -- platform-generated reference (VPC-YYYYMMDD-XXXX)
  currency              VARCHAR(10) NOT NULL,
  invoice_amount        DECIMAL(18,6) NOT NULL CHECK (invoice_amount > 0),
  risk_tier             SMALLINT NOT NULL CHECK (risk_tier BETWEEN 1 AND 3),  -- thin-file (0) → NOT eligible for VPC
  lifecycle_state_id    UUID NOT NULL REFERENCES lifecycle_states(id),      -- entity_type='VPC'
  issued_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at            TIMESTAMPTZ,                                        -- optional TTL
  voided_at             TIMESTAMPTZ,
  void_reason           TEXT,
  partner_routing_eligible  BOOLEAN NOT NULL DEFAULT false,                 -- set true only by admin action
  created_by_admin_id   UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vpc_org_id ON verified_payable_certificates (org_id);
CREATE INDEX idx_vpc_trade_id ON verified_payable_certificates (trade_id);
CREATE INDEX idx_vpc_invoice_id ON verified_payable_certificates (invoice_id);
CREATE INDEX idx_vpc_vpc_reference ON verified_payable_certificates (vpc_reference);
```

#### 7.2.6 `partner_routing_stubs` table

```sql
-- Proposed DDL (design only)
-- Read-only data contract payload for finance partner routing.
-- Phase 1: generated and stored; NOT transmitted to any partner.
-- Phase 2: active webhook/API call to partner endpoint.
CREATE TABLE partner_routing_stubs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id),
  vpc_id                UUID NOT NULL REFERENCES verified_payable_certificates(id),
  partner_type          VARCHAR(50) NOT NULL DEFAULT 'NBFC_STUB',           -- NBFC_STUB | BANK_STUB | FACTORING_STUB
  payload_json          JSONB NOT NULL DEFAULT '{}',                        -- structured data contract (see Section 12)
  payload_version       VARCHAR(10) NOT NULL DEFAULT '1.0',
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  transmitted_at        TIMESTAMPTZ,                                        -- NULL in Phase 1
  transmission_status   VARCHAR(30) NOT NULL DEFAULT 'PENDING',            -- PENDING | TRANSMITTED | FAILED
  response_json         JSONB NOT NULL DEFAULT '{}',                       -- partner response (empty in Phase 1)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_routing_stubs_org_id ON partner_routing_stubs (org_id);
CREATE INDEX idx_partner_routing_stubs_vpc_id ON partner_routing_stubs (vpc_id);
```

#### 7.2.7 `ttp_enrollment_logs` table

```sql
-- Proposed DDL (design only)
-- Audit log for TTP enrollment state changes per tenant.
CREATE TABLE ttp_enrollment_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organizations(id),
  from_state        VARCHAR(50),
  to_state          VARCHAR(50) NOT NULL,
  actor_type        VARCHAR(50) NOT NULL,
  actor_id          UUID,
  reason            TEXT NOT NULL,
  ai_triggered      BOOLEAN NOT NULL DEFAULT false,  -- D-020-C
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ttp_enrollment_logs_org_id ON ttp_enrollment_logs (org_id, created_at DESC);
```

**Note:** TTP enrollment state is stored in `FeatureFlag` / `TenantFeatureOverride` (existing mechanism). The `ttp_enrollment_logs` provides the audit trail for enrollment state changes.

### 7.3 Entity Relationships

```
organizations (seller)
  ├── gst_verifications (1:1 per org)        — GST gate
  ├── ttp_eligibility_assessments (1:N)      — CIBIL eligibility trail (latest = operative)
  └── TenantFeatureOverride (ttp_enabled)    — enrollment state

Trade
  └── invoices (1:N per trade per org)
        ├── invoice_lifecycle_logs (1:N)
        ├── document_extraction_drafts (optional 1:1)
        └── verified_payable_certificates (0:1 per invoice, when VERIFIED)
              ├── vpc_lifecycle_logs (to be added — follows same pattern)
              └── partner_routing_stubs (0:N per VPC)

organizations (seller) ──→ verified_payable_certificates.seller_org_id
organizations (buyer)  ──→ verified_payable_certificates.buyer_org_id
Trade ──→ verified_payable_certificates.trade_id

escrow_accounts (existing) — referenced for settlement visibility; NOT modified
escrow_transactions (existing) — ledger read; NOT modified
```

### 7.4 Data Boundary Constraints

| Rule | Enforcement |
|---|---|
| `invoices.org_id` always = seller's org_id | Service layer + RLS policy |
| `invoices.gross_amount` ≤ `trades.gross_amount` | Service layer validation (DB cannot enforce cross-table check) |
| `invoices.currency` = `trades.currency` | Service layer validation |
| Trade must not be in terminal state when invoice registered | Service layer: load Trade.lifecycleStateKey; check isTerminal=false |
| `gst_verifications` one per org only | UNIQUE constraint on `org_id` |
| `verified_payable_certificates` one per invoice only | UNIQUE constraint on `invoice_id` |
| VPC generation only when: Invoice=VERIFIED + org.status=VERIFICATION_APPROVED + risk_score ≥ 1 | Service layer gate (3-way check) |
| `partner_routing_stubs.transmitted_at` = NULL in Phase 1 | Service layer constraint |
| `ai_triggered=true` requires reason prefixed `HUMAN_CONFIRMED:` | Service layer (D-020-C) |
| `org_id` always from JWT/auth context (D-017-A) | Route layer; never from request body |

---

## Section 8 — Lifecycle Design

### 8.1 Invoice Lifecycle

**`entity_type = 'INVOICE'`** (new rows seeded into `lifecycle_states`)

```
States:
  DRAFT             — Invoice registered, not yet submitted for verification
  SUBMITTED         — Submitted by seller for platform review
  UNDER_REVIEW      — Platform admin reviewing
  VERIFIED          — Invoice verified; eligible for VPC generation
  INELIGIBLE        — Invoice did not pass verification (reason logged)
  DISPUTED          — Invoice under dispute (blocks VPC generation)
  WITHDRAWN         — Seller withdrew invoice
  EXPIRED           — Invoice passed its due_date without resolution
  SUPERSEDED        — A newer invoice version replaced this one

Terminal states: INELIGIBLE, WITHDRAWN, EXPIRED, SUPERSEDED
Irreversible states: WITHDRAWN

Allowed transitions:
  DRAFT → SUBMITTED           (actor: TENANT_USER | TENANT_ADMIN)
  SUBMITTED → UNDER_REVIEW    (actor: ADMIN)
  SUBMITTED → INELIGIBLE      (actor: ADMIN)       — fast rejection
  UNDER_REVIEW → VERIFIED     (actor: ADMIN; requiresMakerChecker if amount > threshold)
  UNDER_REVIEW → INELIGIBLE   (actor: ADMIN)
  UNDER_REVIEW → DISPUTED     (actor: ADMIN | TENANT_ADMIN)
  UNDER_REVIEW → WITHDRAWN    (actor: TENANT_USER | TENANT_ADMIN)
  VERIFIED → DISPUTED         (actor: ADMIN | TENANT_ADMIN; blocks downstream VPC)
  VERIFIED → SUPERSEDED       (actor: ADMIN; new invoice must be in DRAFT)
  DISPUTED → UNDER_REVIEW     (actor: ADMIN)       — dispute resolved, back to review
  DRAFT → WITHDRAWN           (actor: TENANT_USER | TENANT_ADMIN)
  SUBMITTED → WITHDRAWN       (actor: TENANT_USER | TENANT_ADMIN)
  DRAFT → EXPIRED             (actor: SYSTEM)      — scheduled cleanup (future)
  SUBMITTED → EXPIRED         (actor: SYSTEM)
```

### 8.2 VPC Lifecycle

**`entity_type = 'VPC'`** (new rows seeded into `lifecycle_states`)

```
States:
  ACTIVE            — VPC is valid; partner_routing_eligible may be true/false
  ROUTING_READY     — Admin set partner_routing_eligible=true; stub generated
  TRANSMITTED       — Phase 2 only: routing stub transmitted to partner
  VOIDED            — VPC cancelled (invoice disputed, trade closed before settlement, etc.)
  EXPIRED           — Passed expires_at

Terminal states: VOIDED, EXPIRED
Irreversible states: VOIDED

Allowed transitions:
  ACTIVE → ROUTING_READY    (actor: ADMIN; requiresMakerChecker=true always)
  ACTIVE → VOIDED           (actor: ADMIN)
  ROUTING_READY → VOIDED    (actor: ADMIN)
  ROUTING_READY → TRANSMITTED  (actor: SYSTEM; Phase 2 only — NOT in Phase 1)
  ACTIVE → EXPIRED          (actor: SYSTEM; based on expires_at TTL)
  ROUTING_READY → EXPIRED   (actor: SYSTEM)
```

**Note:** In Phase 1, `TRANSMITTED` state and the `ROUTING_READY → TRANSMITTED` transition are seeded but the system transition is never triggered. They are seeded to make the state machine schema forward-compatible.

### 8.3 TTP Enrollment Lifecycle

TTP enrollment is managed via **`TenantFeatureOverride`** (existing mechanism) with key `ttp_enabled`. Enrollment state changes are audited in `ttp_enrollment_logs`.

```
TTP enrollment states (stored in TenantFeatureOverride.value or equivalent):
  NOT_ENROLLED      — Tenant has not applied for TTP
  PENDING_GST       — Tenant applied; awaiting GST verification
  PENDING_CIBIL     — GST verified; awaiting CIBIL/eligibility assessment
  ENROLLED_TRIAL    — Eligibility assessed (risk_tier ≥ 1); trial enrollment active
  ENROLLED_FULL     — Full TTP enrollment (risk_tier ≥ 2)
  SUSPENDED         — TTP enrollment suspended (admin action)
  REJECTED          — Enrollment rejected (GST failed or CIBIL ineligible)

Prerequisite gate for ENROLLED_TRIAL:
  org.status = VERIFICATION_APPROVED
  gst_verifications.review_outcome = APPROVED
  ttp_eligibility_assessments (latest).eligibility_outcome = ELIGIBLE
  ttp_eligibility_assessments (latest).risk_tier ≥ 1

Prerequisite gate for ENROLLED_FULL:
  All ENROLLED_TRIAL gates
  risk_tier ≥ 2
```

### 8.4 Business Verification Lifecycle (GST + CIBIL)

**This builds ON TOP of the existing `organizations.status` state machine.** The existing control-plane route already handles `PENDING_VERIFICATION → VERIFICATION_APPROVED/REJECTED/NEEDS_MORE_INFO`. TTP adds:

```
Phase A — GST Verification Gate
  1. Tenant submits GSTIN + supporting documents → POST /api/tenant/gst-verification
  2. Creates gst_verifications row (status=UNKNOWN, review_outcome=NULL)
  3. Control-plane admin reviews → PATCH /api/control/orgs/:orgId/gst-verification
  4. Outcome: APPROVED | REJECTED | NEEDS_MORE_INFO
  5. On APPROVED: org.status transitions PENDING_VERIFICATION → VERIFICATION_APPROVED
     (reuses existing control.ts verification outcome route)

Phase B — CIBIL / Eligibility Assessment Gate
  TTP-specific gate (NOT the same as GST gate):
  1. Admin creates eligibility assessment → POST /api/control/ttp/eligibility/:orgId
  2. Phase 1: manual review; fills ttp_eligibility_assessments row
  3. Outcome: ELIGIBLE (risk_tier=1 or 2 or 3) | INELIGIBLE | MANUAL_REVIEW (thin-file)
  4. On ELIGIBLE: organizations.risk_score updated to risk_tier value
  5. On MANUAL_REVIEW: human review queue; no risk_score change

Note: Phase B can only proceed AFTER Phase A (VERIFICATION_APPROVED).
The service layer enforces this prerequisite check.
```

### 8.5 Settlement and Ledger Lifecycle (Existing — Read-Only for TTP)

TTP does NOT modify the settlement or escrow lifecycle. It adds a **read surface** to expose settlement visibility enriched with invoice and VPC data.

```
Existing settlement flow (unchanged):
  Trade → escrow_transactions (HOLD/RELEASE ledger) → SettlementService.settleTrade()
  → Trade state: SETTLEMENT_ACKNOWLEDGED → CLOSED
  → Escrow state: RELEASED

TTP settlement visibility surface (new read path):
  GET /api/tenant/trades/:tradeId/ttp-summary
  Returns:
    - Trade detail
    - Invoice detail (if exists)
    - VPC detail (if exists)
    - Escrow balance (derived, read-only; no balance column written)
    - Estimated settlement date (from invoice.due_date)
    - Ledger snapshot (from escrow_transactions SELECT SUM)
```

---

## Section 9 — GST Verification Design

### 9.1 Purpose

GST verification is the **hard onboarding gate** for TTP enrollment (OD-004C). No tenant can enroll in TTP without a verified GSTIN. It is not a general-purpose org verification — it is TTP-specific.

### 9.2 Verification Flow

```
Step 1 — Tenant submission:
  POST /api/tenant/gst-verification
  Body: { gstin, legal_name_on_gst, state_code, registration_type, document_url? }
  
  Service layer:
  - Validates GSTIN format (15-char, pattern: [0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})
  - Checks no existing APPROVED row for this org (UNIQUE constraint)
  - Inserts gst_verifications row (filing_status='UNKNOWN', review_outcome=NULL)
  - Transitions org.status to PENDING_VERIFICATION (if ACTIVE)
  - Writes audit log entry

Step 2 — Admin review:
  PATCH /api/control/orgs/:orgId/gst-verification/:verificationId
  Body: { outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO', notes?, raw_verification_json? }
  
  Service layer:
  - Validates admin realm JWT
  - Loads gst_verifications row (must be in UNKNOWN/NEEDS_MORE_INFO state)
  - Updates review_outcome, reviewed_at, reviewed_by_admin_id
  - On APPROVED: delegates to existing organizations.status update path
    (calls the same code path as existing control.ts verification route)
  - Writes audit log entry

Step 3 — Integration with TTP enrollment:
  TTP enrollment service checks gst_verifications.review_outcome = 'APPROVED'
  before permitting PENDING_CIBIL → ENROLLED_TRIAL transition.
```

### 9.3 GSTIN Format Validation

The service layer must validate GSTIN format before accepting submission:
- Length: exactly 15 characters
- Pattern: `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]`
- State code (first 2 digits): 01–38 (Indian state codes)

This is **format validation only** in Phase 1. No live government GSTIN lookup is performed.

### 9.4 Phase 2 Hook Point

The `raw_verification_json` JSONB field and `filing_status` field are designed for Phase 2 live API integration. In Phase 2:
- `assessment_type` on `ttp_eligibility_assessments` changes from `MANUAL` to `BUREAU_API`
- `raw_verification_json` stores the government API response
- `filing_status` is populated from the API response (ACTIVE | CANCELLED | SUSPENDED)

### 9.5 Data Privacy and Security

- `gst_verifications` rows are org-scoped (RLS: `org_id = app.org_id`)
- GSTIN is a business identifier (not personal PII in India) but must be treated as confidential
- Never logged in application logs
- Never included in any cross-org response
- Admin review path uses admin JWT (not tenant JWT)

---

## Section 10 — CIBIL / Business Credit Verification Design

### 10.1 Purpose

CIBIL / business credit eligibility is the **TTP eligibility gate** (OD-004B, OD-004C). It determines the seller's risk tier, which controls:
- Whether TTP enrollment proceeds
- The maximum invoice amount eligible for VPC generation
- The `organizations.risk_score` field

### 10.2 Risk Tier Model

| Tier | Value | Meaning | Max Invoice Amount (example) | Enrollment Level |
|---|---|---|---|---|
| 0 | thin-file | Insufficient data for assessment | N/A | MANUAL_REVIEW |
| 1 | low-risk | Adequate credit history | TBD by product | ENROLLED_TRIAL |
| 2 | medium-risk | Good credit history | TBD by product | ENROLLED_FULL |
| 3 | high-risk (paradox) | Note: in standard CIBIL, lower score = higher risk. See note below. | TBD by product | ENROLLED_FULL |

**Note on tier naming:** TexQtic risk_score (SmallInt 0–3) maps to credit QUALITY (higher = better quality), not credit risk in the CIBIL sense. Tier 0 = insufficient data; Tier 3 = strong credit history. The `assessment_notes` field carries the raw CIBIL CMR/CCR descriptor.

**Thin-file fallback:** When `risk_tier=0` (insufficient credit data), `eligibility_outcome` MUST be `MANUAL_REVIEW`. The admin reviews the case and can:
- Override to ELIGIBLE with a manually assigned tier
- Reject as INELIGIBLE

### 10.3 Assessment Flow

```
Step 1 — Pre-condition check:
  GST verification MUST be APPROVED before eligibility assessment can begin.
  Service layer enforces this.

Step 2 — Admin creates assessment (Phase 1: manual):
  POST /api/control/ttp/eligibility/:orgId
  Body: {
    assessment_type: 'MANUAL',
    risk_tier: 0|1|2|3,
    eligibility_outcome: 'ELIGIBLE' | 'INELIGIBLE' | 'MANUAL_REVIEW',
    max_invoice_amount: Decimal | null,
    currency: 'INR',
    assessment_notes: string,
    valid_until: date | null,
    raw_bureau_json: {}   -- Phase 1: admin-uploaded doc summary
  }
  
  Service layer:
  - Validates outcome ↔ tier consistency (tier=0 → outcome must be MANUAL_REVIEW)
  - Inserts ttp_eligibility_assessments row
  - On ELIGIBLE (tier ≥ 1): updates organizations.risk_score = risk_tier
  - Does NOT modify org.status (status is managed by GST verification flow)
  - Writes audit log entry

Step 3 — TTP enrollment gate reads:
  Latest ttp_eligibility_assessments row (by assessed_at DESC) for the org.
  If valid_until IS NOT NULL AND valid_until < now() → treat as expired (MANUAL_REVIEW required).
```

### 10.4 Phase 2 Hook Point

In Phase 2, `assessment_type = 'BUREAU_API'`. The service:
- Calls the CIBIL Commercial Credit Report (CCR) or Credit Monitor Report (CMR) API
- Stores raw response in `raw_bureau_json`
- Parses CMR rank or CCR score → maps to `risk_tier`

Phase 2 CIBIL integration requires explicit legal review before implementation.

---

## Section 11 — Verified Payable Certificate Design

### 11.1 What a VPC Is (and Is Not)

**A VPC IS:**
- A structured data record attesting that: (a) the invoice is verified, (b) the seller org has passed GST and CIBIL gates, (c) the trade is active and not in a terminal state
- A trust signal for finance partner routing
- An internal TexQtic record

**A VPC IS NOT:**
- A negotiable instrument
- A promissory note
- A bill of exchange
- A payment instrument
- Any instrument regulated under the Negotiable Instruments Act, 1881 (India)
- A guarantee of payment
- An ICC or W3C TradeTrust credential

### 11.2 VPC Generation Gate (3-Way Check)

The `VpcService.generateVpc()` method (proposed) MUST enforce all three gates atomically:

```
Gate 1 — Invoice Verification:
  invoices.lifecycle_state_id → LifecycleState.stateKey = 'VERIFIED'
  
Gate 2 — Org Verification:
  organizations.status = 'VERIFICATION_APPROVED'
  gst_verifications.review_outcome = 'APPROVED' (latest for this org)

Gate 3 — Eligibility:
  ttp_eligibility_assessments (latest).eligibility_outcome = 'ELIGIBLE'
  organizations.risk_score ≥ 1 (i.e., not thin-file)
  
If ANY gate fails → VPC generation REJECTED (no row inserted)
If all gates pass → VPC row inserted; lifecycle_state_id = ACTIVE lifecycle state
```

### 11.3 VPC Reference Generation

`vpc_reference` format: `VPC-{YYYYMMDD}-{6-digit-sequential-per-org}`

Example: `VPC-20260503-000001`

Generated by the service layer. Never exposed in logs. Never guessable by tenant.

### 11.4 VPC Payload (for Partner Routing Stub)

The VPC payload (stored in `partner_routing_stubs.payload_json`) contains:

```json
{
  "vpc_reference": "VPC-20260503-000001",
  "payload_version": "1.0",
  "generated_at": "2026-05-03T10:00:00Z",
  "seller": {
    "org_id": "<REDACTED-IN-TRANSIT>",
    "legal_name": "...",
    "gstin": "...",
    "jurisdiction": "...",
    "risk_tier": 2
  },
  "buyer": {
    "org_id": "<REDACTED-IN-TRANSIT>",
    "legal_name": "..."
  },
  "trade": {
    "trade_reference": "...",
    "currency": "INR",
    "gross_amount": "..."
  },
  "invoice": {
    "invoice_number": "...",
    "invoice_date": "...",
    "due_date": "...",
    "currency": "INR",
    "gross_amount": "..."
  },
  "escrow": {
    "escrow_id": "...",
    "balance_snapshot": "...",
    "balance_as_of": "..."
  },
  "platform": {
    "platform_name": "TexQtic",
    "certification": "TradeTrust Pay Phase 1 — System of Record"
  }
}
```

**Security note:** `org_id` values are internal UUIDs. For external partner transmission (Phase 2), they MUST be replaced with a partner-specific stable identifier (not the raw UUID). In Phase 1, the stub is admin-read-only and never transmitted.

---

## Section 12 — Partner Routing Stub / Data Contract Design

### 12.1 Phase 1 Scope

In Phase 1, the partner routing stub is:
- Generated and stored in `partner_routing_stubs`
- Readable only by platform admin (`GET /api/control/ttp/routing-stubs/:vpcId`)
- `transmitted_at = NULL` always
- `transmission_status = 'PENDING'` always

No live partner API call is made. No webhook is sent. No external endpoint is called.

### 12.2 Data Contract Schema Version 1.0

The `payload_json` schema is versioned (`payload_version = '1.0'`). Future breaking changes increment to `2.0`. Non-breaking additions stay at `1.0`.

The data contract is designed to be compatible with:
- NBFC supply-chain finance APIs (invoice discounting)
- Bank trade finance APIs (factoring)
- The GSTIN and invoice reference structure is aligned with Indian GST e-invoice data fields

### 12.3 Partner Types

| `partner_type` | Description | Phase 1 Status |
|---|---|---|
| `NBFC_STUB` | NBFC invoice discounting partner | Stub only |
| `BANK_STUB` | Bank trade finance partner | Stub only |
| `FACTORING_STUB` | Invoice factoring partner | Stub only |

### 12.4 Activation (Phase 2 Design Note)

In Phase 2, activation of a partner routing stub would:
1. Require VPC in `ROUTING_READY` state (set by admin via maker-checker)
2. Call the partner's configured webhook endpoint (URL stored in `FeatureFlag` or a future `PartnerConfig` table)
3. Update `transmitted_at`, `transmission_status`, `response_json`
4. Transition VPC to `TRANSMITTED`

Phase 2 partner config design is OUT OF SCOPE for this Phase 1 design artifact.

---

## Section 13 — Backend Route and Service Design

### 13.1 New Tenant-Plane Routes Proposed

| Method | Path | Service | Description |
|---|---|---|---|
| POST | `/api/tenant/gst-verification` | `GstVerificationService` | Submit GSTIN for verification |
| GET | `/api/tenant/gst-verification` | `GstVerificationService` | Get current GST verification status |
| POST | `/api/tenant/invoices` | `InvoiceService` | Register invoice against a trade |
| GET | `/api/tenant/invoices` | `InvoiceService` | List invoices (filtered by trade or lifecycle state) |
| GET | `/api/tenant/invoices/:invoiceId` | `InvoiceService` | Get invoice detail |
| POST | `/api/tenant/invoices/:invoiceId/transition` | `InvoiceService` | Tenant lifecycle transition (DRAFT→SUBMITTED, SUBMITTED→WITHDRAWN) |
| GET | `/api/tenant/invoices/:invoiceId/vpc` | `VpcService` | Get VPC for invoice (if exists) |
| GET | `/api/tenant/trades/:tradeId/ttp-summary` | `TtpSummaryService` | TTP-enriched trade summary (invoice + VPC + settlement visibility) |
| GET | `/api/tenant/ttp/enrollment-status` | `TtpEnrollmentService` | Get TTP enrollment status for this org |

**D-017-A compliance:** All routes derive `tenantId` and `orgId` exclusively from the authenticated JWT. None accept `org_id` in the request body.

### 13.2 New Control-Plane Routes Proposed

| Method | Path | Service | Description |
|---|---|---|---|
| GET | `/api/control/orgs/:orgId/gst-verification` | `GstVerificationService` | Admin view of org's GST verification |
| PATCH | `/api/control/orgs/:orgId/gst-verification/:verificationId` | `GstVerificationService` | Admin: set review outcome |
| POST | `/api/control/ttp/eligibility/:orgId` | `TtpEligibilityService` | Admin: create eligibility assessment |
| GET | `/api/control/ttp/eligibility/:orgId` | `TtpEligibilityService` | Admin: list eligibility assessments |
| GET | `/api/control/invoices` | `InvoiceService` | Admin: list all invoices (cross-tenant) |
| GET | `/api/control/invoices/:invoiceId` | `InvoiceService` | Admin: invoice detail |
| PATCH | `/api/control/invoices/:invoiceId/transition` | `InvoiceService` | Admin: invoice lifecycle transition |
| POST | `/api/control/vpc/generate/:invoiceId` | `VpcService` | Admin: trigger VPC generation (3-way gate) |
| GET | `/api/control/vpc` | `VpcService` | Admin: list all VPCs |
| GET | `/api/control/vpc/:vpcId` | `VpcService` | Admin: VPC detail |
| PATCH | `/api/control/vpc/:vpcId/transition` | `VpcService` | Admin: VPC lifecycle transition (→ROUTING_READY) |
| GET | `/api/control/ttp/routing-stubs/:vpcId` | `PartnerRoutingService` | Admin: read routing stub payload |
| POST | `/api/control/ttp/enrollment` | `TtpEnrollmentService` | Admin: manage enrollment state |

### 13.3 Proposed New Service Modules

| Service | File Path | Responsibility |
|---|---|---|
| `GstVerificationService` | `server/src/services/gstVerification.service.ts` | GSTIN format validation; submission; admin review; org.status integration |
| `TtpEligibilityService` | `server/src/services/ttpEligibility.service.ts` | Risk tier assessment; risk_score write; thin-file handling |
| `InvoiceService` | `server/src/services/invoice.service.ts` | Invoice CRUD; lifecycle transitions via StateMachineService; trade+org validation |
| `VpcService` | `server/src/services/vpc.service.ts` | 3-way gate check; VPC generation; lifecycle; routing stub trigger |
| `PartnerRoutingService` | `server/src/services/partnerRouting.service.ts` | Stub payload generation; admin read path; Phase 2 transmission hook point |
| `TtpSummaryService` | `server/src/services/ttpSummary.service.ts` | Read-only aggregation of trade+invoice+VPC+escrow for settlement visibility |
| `TtpEnrollmentService` | `server/src/services/ttpEnrollment.service.ts` | Enrollment state management via FeatureFlag/TenantFeatureOverride |

### 13.4 Service Dependency Graph

```
InvoiceService
  ├── StateMachineService (existing — lifecycle transitions)
  ├── MakerCheckerService (existing — high-value transitions)
  ├── EscalationService (existing — freeze gate)
  └── SanctionsService (existing — org sanction check)

VpcService
  ├── InvoiceService (gate check: invoice must be VERIFIED)
  ├── GstVerificationService (gate check: GSTIN must be APPROVED)
  ├── TtpEligibilityService (gate check: risk_score ≥ 1)
  ├── MakerCheckerService (ROUTING_READY transition requires maker-checker)
  └── PartnerRoutingService (stub generation on ROUTING_READY)

TtpEnrollmentService
  ├── GstVerificationService (pre-condition: GST APPROVED)
  └── TtpEligibilityService (pre-condition: ELIGIBLE)

TtpSummaryService
  ├── InvoiceService (read)
  ├── VpcService (read)
  └── EscrowService (balance read via computeDerivedBalance)
```

### 13.5 Audit and Governance

All new services MUST follow the existing audit pattern:
- Write `AuditLog` entry in the SAME Prisma transaction as any mutation
- Use `writeAuditLog()` from `server/src/lib/auditLog.ts`
- Use `withDbContext()` for RLS context establishment
- Audit event names to follow `[domain].[entity].[action]` convention (e.g., `invoice.lifecycle.verified`, `vpc.generated`, `ttp.enrollment.approved`)

**Event log integration:** Significant TTP events (VPC generated, enrollment state change, eligibility assessment created) should also emit an `EventLog` entry for the event stream.

---

## Section 14 — Frontend UI Design

### 14.1 Tenant-Plane UI Surfaces Proposed

| Component | Path | Description |
|---|---|---|
| `InvoicesPanel` | `components/Tenant/InvoicesPanel.tsx` | List invoices; register new invoice; view invoice detail; submit for verification; withdraw |
| `GstVerificationCard` | `components/Tenant/GstVerificationCard.tsx` | Show GST verification status; submit GSTIN (if not yet submitted); pending/approved/rejected state |
| `TtpEnrollmentBanner` | `components/Tenant/TtpEnrollmentBanner.tsx` | Show TTP enrollment status; progress bar (GST → CIBIL → ENROLLED); CTA to submit GST |
| `TtpTradeSummaryCard` | `components/Tenant/TtpTradeSummaryCard.tsx` | TTP-enriched trade view (invoice + VPC + settlement visibility) embedded in TradesPanel |
| `VpcStatusBadge` | `components/Tenant/VpcStatusBadge.tsx` | Inline badge for VPC status (ACTIVE | ROUTING_READY | VOIDED | none) |

**Key frontend rules:**
- All finance data is **read-only** — no action buttons imply money movement (product policy)
- `org_id` must flow through all API calls from auth context, not hardcoded
- Auth state from `authService` and auth context only
- These are new Tenant-plane components — they MUST NOT use any ControlPlane component internals

### 14.2 Control-Plane UI Surfaces Proposed

| Component | Path | Description |
|---|---|---|
| `GstVerificationQueue` | `components/ControlPlane/GstVerificationQueue.tsx` | Admin queue: list pending GST verifications; approve/reject/request-info |
| `TtpEligibilityConsole` | `components/ControlPlane/TtpEligibilityConsole.tsx` | Admin: create/view eligibility assessments; risk tier assignment |
| `InvoiceOversight` | `components/ControlPlane/InvoiceOversight.tsx` | Admin: cross-tenant invoice list; lifecycle actions; approve high-value invoices |
| `VpcConsole` | `components/ControlPlane/VpcConsole.tsx` | Admin: VPC list; generate VPC; set ROUTING_READY; view routing stub |
| `TtpEnrollmentAdmin` | `components/ControlPlane/TtpEnrollmentAdmin.tsx` | Admin: manage per-tenant TTP enrollment state |

### 14.3 UI Design Constraints

1. **No withdraw/transfer/payout buttons** on any TTP UI surface
2. **VPC displays status badge only** — no "send to partner" button in Phase 1
3. **Settlement visibility** is read-only derived balance display
4. **InvoicesPanel** must show clear disclaimer: "Invoice registration on TexQtic is for trade documentation purposes only. This is not a payment instrument."
5. **TTP enrollment banner** must surface enrollment blockers clearly (e.g., "GST verification pending admin review")

---

## Section 15 — Tenant Isolation, RLS, Security, Privacy Design

### 15.1 RLS Policy Design for New Tables

All new tables (`invoices`, `invoice_lifecycle_logs`, `gst_verifications`, `ttp_eligibility_assessments`, `verified_payable_certificates`, `partner_routing_stubs`, `ttp_enrollment_logs`) MUST follow the existing RLS pattern:

```sql
-- Pattern (to be applied per table during implementation):

-- RESTRICTIVE guard (fail-closed):
CREATE POLICY {table}_rls_guard ON {table}
  AS RESTRICTIVE
  FOR ALL
  USING (current_setting('app.org_id', true) IS NOT NULL);

-- PERMISSIVE tenant SELECT:
CREATE POLICY {table}_tenant_select ON {table}
  AS PERMISSIVE
  FOR SELECT
  USING (org_id = current_setting('app.org_id')::uuid);

-- No tenant UPDATE / DELETE — mutations via service layer only
-- Admin read via SECURITY DEFINER function or service-role context
```

**Note:** `partner_routing_stubs` has NO tenant SELECT policy — admin read only. The `verified_payable_certificates` tenant SELECT policy shows only the seller's own VPCs (`org_id = seller_org_id = app.org_id`).

### 15.2 Cross-Tenant Isolation Rules

1. `invoices`: seller can only see their own invoices (scoped by `org_id = seller's org_id`)
2. Buyer cannot see seller's invoice details in Phase 1 (future: explicit sharing consent)
3. `gst_verifications`: strictly one org per row; buyer cannot see seller's GST data
4. `ttp_eligibility_assessments`: seller org only; buyer cannot see seller's credit assessment
5. `verified_payable_certificates`: seller sees their own VPCs; buyer sees only VPCs where they are `buyer_org_id` (future: consent-based share)
6. `partner_routing_stubs`: admin-only; no tenant visibility in Phase 1

### 15.3 Authentication and Authorization

| Route Group | Auth Requirement | Principal |
|---|---|---|
| `POST/GET /api/tenant/invoices*` | tenantAuthMiddleware + databaseContextMiddleware | Tenant JWT; org_id from JWT |
| `GET /api/tenant/trades/:id/ttp-summary` | tenantAuthMiddleware | Tenant JWT |
| `POST /api/tenant/gst-verification` | tenantAuthMiddleware | Tenant JWT |
| `GET/PATCH /api/control/orgs/:orgId/gst-verification` | Admin realm JWT | Admin JWT |
| `POST /api/control/vpc/generate/:invoiceId` | Admin realm JWT | Admin JWT |
| `GET /api/control/ttp/routing-stubs/:vpcId` | Admin realm JWT | Admin JWT |

### 15.4 Input Validation

All new routes MUST use Zod schemas for request validation (consistent with existing pattern). Key validation rules:

- `invoices.invoice_number`: non-empty string, max 100 chars
- `invoices.gross_amount`: positive Decimal, ≤ 999,999,999,999.999999 (Decimal 18,6 max)
- `gst_verifications.gstin`: 15-char GSTIN pattern
- `ttp_eligibility_assessments.risk_tier`: 0–3 integer
- Route path params (UUIDs): `z.string().uuid()`
- `org_id`: NEVER accepted from request body (D-017-A)

### 15.5 Secrets and Sensitive Data

- GSTIN stored in DB but never logged in application logs
- `raw_bureau_json` and `raw_verification_json` treated as sensitive; never returned in tenant-facing API responses
- `partner_routing_stubs.payload_json` never returned to tenant plane
- `vpc_reference` is not secret but must not be guessable (use sequential-per-org with opaque prefix)

---

## Section 16 — AI / Scoring Boundary

### 16.1 D-020-C Enforcement

All new TTP lifecycle services must enforce the AI boundary:

```typescript
// Pattern from existing EscrowService — to be replicated in InvoiceService, VpcService:
if (aiTriggered) {
  if (!reason.startsWith('HUMAN_CONFIRMED:')) {
    throw new GovError('AI_BOUNDARY_VIOLATION', 
      'ai_triggered=true requires reason prefixed with HUMAN_CONFIRMED: (escrow-strict)');
  }
}
```

The `ai_triggered` flag is stored in `invoice_lifecycle_logs.ai_triggered` and `ttp_enrollment_logs.ai_triggered`.

### 16.2 AI Non-Involvement in Financial Gates

The following decisions MUST NEVER be made by AI in Phase 1 or Phase 2 without explicit human confirmation:

1. GST verification approval/rejection
2. CIBIL/eligibility assessment outcome
3. Invoice lifecycle transition to VERIFIED
4. VPC generation approval
5. TTP enrollment approval

Human review is structural — not optional. The `humanReviewRequired=true` pattern from `DocumentExtractionDraft` applies as a design principle to all TTP financial gate decisions.

### 16.3 AI Permitted Uses in TTP

| Use Case | AI Role | Constraint |
|---|---|---|
| Invoice document field extraction | `DocumentExtractionDraft` (existing) | humanReviewRequired=true always; all extractions → PENDING until human approves |
| GSTIN pre-fill suggestion from uploaded doc | Suggestion only; prefill into form, never auto-submit | Must be clearly labeled as AI suggestion |
| Risk narrative generation for admin | Admin-assist only; never overwrites risk_tier or eligibility_outcome | ai_triggered flag must be set; reason must be HUMAN_CONFIRMED: |

---

## Section 17 — Migration / No-Migration Plan

### 17.1 Trade.escrow_id — No Migration (OD-005 Confirmed)

`Trade.escrow_id` remains `String? @db.Uuid` — optional. No mandatory migration. TTP invoice does not require `escrow_id` to be non-null. The TTP summary service reads the escrow balance only when `trade.escrow_id IS NOT NULL`.

### 17.2 New Tables — SQL-First Migration Plan

All new TTP tables are created via **SQL DDL applied manually via psql**, then `prisma db pull` + `prisma generate`, following the established TexQtic migration protocol.

**Required execution sequence (MUST follow when implementing):**

```
1. Apply SQL manually:
   psql -f server/prisma/ttp_phase1_ddl.sql  (file to be created in implementation)
   Verify: no ERROR / ROLLBACK in output

2. Run:
   pnpm -C server exec prisma db pull

3. Verify schema.prisma updated with new models

4. Run:
   pnpm -C server exec prisma generate

5. Restart server and verify health check
```

**Critical note from repo-truth:** `EscrowService` currently uses `$queryRaw/$executeRaw` because `escrow_accounts` was applied without `prisma db pull`. New TTP tables MUST complete the `prisma db pull` step to get typed Prisma model access. Do NOT repeat the pattern of skipping `prisma db pull`.

### 17.3 Lifecycle State Seeds

New `lifecycle_states` and `allowed_transitions` rows must be seeded for:
- `entity_type = 'INVOICE'` — all Invoice lifecycle states and transitions
- `entity_type = 'VPC'` — all VPC lifecycle states and transitions

This is a DML seed, not DDL. Applied via psql after the DDL migration.

### 17.4 Feature Flag Seed

A new `FeatureFlag` row must be created:
- `key = 'ttp_enabled'`
- Default: `false` (off for all tenants unless override exists)
- Override: `TenantFeatureOverride` per tenant opt-in

### 17.5 organizations.risk_score — No Migration

`organizations.risk_score` (SmallInt, default 0) already exists. TTP Eligibility Assessment writes to this field. No schema change required.

### 17.6 Existing Tables — No Modifications

| Table | Change |
|---|---|
| `trades` | None |
| `escrow_accounts` | None |
| `escrow_transactions` | None |
| `organizations` | None (risk_score already exists) |
| `lifecycle_states` | SEED new rows only (no schema change) |
| `allowed_transitions` | SEED new rows only (no schema change) |
| `feature_flags` | SEED new row only (no schema change) |

---

## Section 18 — Test Plan

### 18.1 Unit Tests Proposed

| Test File | Domain | Key Test Cases |
|---|---|---|
| `server/src/services/gstVerification.g025.test.ts` | GST | GSTIN format validation; submission creates row; duplicate submission rejected; org.status gate |
| `server/src/services/ttpEligibility.g025.test.ts` | Eligibility | Tier 0 → MANUAL_REVIEW invariant; risk_score write; pre-condition check (GST must be APPROVED) |
| `server/src/services/invoice.g025.test.ts` | Invoice | Amount ≤ trade.grossAmount; currency match; trade terminal state gate; lifecycle transitions |
| `server/src/services/vpc.g025.test.ts` | VPC | 3-way gate (all pass → VPC created; any fail → rejected); VPC reference generation; VOIDED on invoice disputed |
| `server/src/services/partnerRouting.g025.test.ts` | Routing stub | Payload structure; Phase 1 never transmits; payload_version |
| `server/src/services/ttpEnrollment.g025.test.ts` | Enrollment | Prerequisites (GST + CIBIL); state transitions; feature flag integration |
| `server/src/services/ttpSummary.g025.test.ts` | Summary | Returns null escrow balance when trade.escrow_id is null; full summary when all fields present |

### 18.2 Integration Tests Proposed

| Test File | Key Scenario |
|---|---|
| `server/src/services/invoice.g025.integration.test.ts` | Full flow: create trade → register invoice → DRAFT → SUBMITTED → VERIFIED → VPC generated |
| `server/src/services/gst.enrollment.integration.test.ts` | GST submission → admin review APPROVED → CIBIL assessment → enrollment state |
| `server/src/services/vpc.void.integration.test.ts` | Invoice DISPUTED → VPC VOIDED automatically |

### 18.3 Route-Level Tests Proposed

| Test File | Routes Covered |
|---|---|
| `server/src/routes/tenant/tenant.invoice.test.ts` | POST/GET /api/tenant/invoices; invoice transitions |
| `server/src/routes/tenant/tenant.gstVerification.test.ts` | POST /api/tenant/gst-verification |
| `server/src/routes/control/control.invoiceOversight.test.ts` | PATCH /api/control/invoices/:id/transition |
| `server/src/routes/control/control.vpcConsole.test.ts` | POST /api/control/vpc/generate/:invoiceId |

### 18.4 Test Isolation Rules

- All tests must be org-scoped (no cross-tenant data visible)
- AI boundary tests: verify that ai_triggered=true without HUMAN_CONFIRMED: prefix is rejected
- D-020-B: verify no balance column written (assert no balance field in any schema snapshot)
- D-017-A: verify all routes reject org_id in request body

---

## Section 19 — Runtime / Production Verification Plan

### 19.1 Server Health Check

After any TTP implementation deployment:
```
curl -i http://localhost:3001/health
Expected: 200 OK with status: "ok"
```

### 19.2 Schema Verification

After `prisma db pull` + `prisma generate`:
```
# Verify new models in generated Prisma client:
grep -E "invoices|gst_verifications|ttp_eligibility|verified_payable|partner_routing|ttp_enrollment" \
  server/prisma/schema.prisma
```

### 19.3 Lifecycle State Seed Verification

```sql
-- After seed applied:
SELECT entity_type, state_key, is_terminal, severity_level
FROM lifecycle_states
WHERE entity_type IN ('INVOICE', 'VPC')
ORDER BY entity_type, severity_level;
-- Expected: all Invoice and VPC states present
```

### 19.4 Feature Flag Verification

```sql
SELECT key, default_value FROM feature_flags WHERE key = 'ttp_enabled';
-- Expected: row present, default_value = false
```

### 19.5 Smoke Test Sequence (Post-Deploy)

```
1. POST /api/tenant/gst-verification (with GSTIN)
   → Expected: 201 Created; gst_verifications row present
   
2. PATCH /api/control/orgs/:orgId/gst-verification/:id (admin)
   → Expected: 200; review_outcome = 'APPROVED'; org.status = 'VERIFICATION_APPROVED'

3. POST /api/control/ttp/eligibility/:orgId (admin, tier=2, outcome=ELIGIBLE)
   → Expected: 200; risk_score updated in organizations

4. POST /api/tenant/invoices (registered against active trade)
   → Expected: 201 Created; Invoice in DRAFT state

5. POST /api/tenant/invoices/:id/transition (DRAFT → SUBMITTED)
   → Expected: 200; Invoice in SUBMITTED state

6. PATCH /api/control/invoices/:id/transition (SUBMITTED → VERIFIED, admin)
   → Expected: 200; Invoice in VERIFIED state

7. POST /api/control/vpc/generate/:invoiceId (admin)
   → Expected: 201 Created; VPC in ACTIVE state; routing stub in PENDING

8. GET /api/control/ttp/routing-stubs/:vpcId (admin)
   → Expected: 200; payload_json present; transmitted_at = null

9. GET /api/tenant/trades/:tradeId/ttp-summary (tenant)
   → Expected: 200; invoice and VPC summary present; no balance column in response
```

---

## Section 20 — Implementation Slicing Recommendation

### 20.1 Recommended Slice Order

**Slice 1 — Foundation (prerequisite for all):**
- SQL DDL for all 7 new tables
- `prisma db pull` + `prisma generate`
- Lifecycle state seeds (INVOICE, VPC)
- Feature flag seed (`ttp_enabled`)
- Unit test setup

**Slice 2 — GST Verification Gate:**
- `GstVerificationService` + unit tests
- Route: `POST /api/tenant/gst-verification` + `GET /api/tenant/gst-verification`
- Route: `GET/PATCH /api/control/orgs/:orgId/gst-verification`
- Frontend: `GstVerificationCard` (tenant) + `GstVerificationQueue` (admin)

**Slice 3 — CIBIL Eligibility Gate:**
- `TtpEligibilityService` + unit tests
- Route: `POST/GET /api/control/ttp/eligibility/:orgId`
- Frontend: `TtpEligibilityConsole` (admin)

**Slice 4 — Invoice Domain:**
- `InvoiceService` + unit tests
- Routes: `POST/GET /api/tenant/invoices*` + control-plane invoice oversight routes
- Frontend: `InvoicesPanel` (tenant) + `InvoiceOversight` (admin)

**Slice 5 — VPC Generation:**
- `VpcService` + unit tests (depends on Slices 1–4)
- Routes: `POST /api/control/vpc/generate/:invoiceId`, VPC lifecycle routes
- Frontend: `VpcStatusBadge`, `VpcConsole` (admin)

**Slice 6 — Partner Routing Stub:**
- `PartnerRoutingService` + unit tests (depends on Slice 5)
- Route: `GET /api/control/ttp/routing-stubs/:vpcId`

**Slice 7 — TTP Summary + Enrollment:**
- `TtpSummaryService` + route: `GET /api/tenant/trades/:tradeId/ttp-summary`
- `TtpEnrollmentService` + enrollment routes
- Frontend: `TtpEnrollmentBanner`, `TtpTradeSummaryCard`, `TtpEnrollmentAdmin`

### 20.2 Parallelization Note

Slices 2 and 3 can proceed in parallel after Slice 1 is complete (they have no dependency on each other). Slice 4 depends on Slice 1 only (not on 2 or 3 at the schema layer — the service layer enforces the business prerequisite check). Slice 5 depends on 1, 4, and reading from 2+3.

---

## Section 21 — Open Questions / Decisions Before Implementation

### 21.1 OQ-TTP-001 — Invoice amount cap per risk tier

**Question:** What is the exact `max_invoice_amount` for each risk tier (1, 2, 3)?

**Context:** `ttp_eligibility_assessments.max_invoice_amount` stores this value per assessment. But there should be a platform-level default per tier (configurable, not hardcoded).

**Options:**
- A. Store defaults in `FeatureFlag` (key: `ttp_max_amount_tier_1`, `ttp_max_amount_tier_2`, `ttp_max_amount_tier_3`)
- B. Store defaults in a new `ttp_config` table (future extensibility)
- C. Hardcode in service layer for Phase 1 (simplest, least flexible)

**Recommendation:** Option A for Phase 1 (minimal, uses existing feature flag system).

### 21.2 OQ-TTP-002 — VPC expiry policy

**Question:** Should VPCs expire automatically based on trade due date, invoice due date, or a fixed TTL?

**Context:** `verified_payable_certificates.expires_at` is nullable. No automatic expiry logic is designed in Phase 1.

**Options:**
- A. `expires_at = invoice.due_date` (most natural — VPC validity tied to invoice maturity)
- B. `expires_at = invoice.due_date + 30 days` (grace period)
- C. NULL (no auto-expiry; admin voids manually)

**Recommendation:** Option A for Phase 1, with option to override per VPC.

### 21.3 OQ-TTP-003 — High-value invoice maker-checker threshold

**Question:** At what invoice amount does the `UNDER_REVIEW → VERIFIED` transition require maker-checker?

**Context:** `AllowedTransition.requiresMakerChecker` is a boolean. The threshold logic must live in the service layer. What is the INR threshold for Phase 1?

**Options:**
- A. ₹10,00,000 (10 lakhs) — standard MSME invoice threshold
- B. ₹50,00,000 (50 lakhs)
- C. Configurable via feature flag

**Recommendation:** Option C (configurable via `FeatureFlag` key: `ttp_maker_checker_threshold_inr`).

### 21.4 OQ-TTP-004 — Buyer visibility into seller's invoice

**Question:** In Phase 1, should the buyer org be able to see the invoice registered against their trade?

**Context:** Currently, all `invoices` rows are scoped to seller org_id. Buyer cannot see the invoice in Phase 1 design.

**Impact:** If buyer needs to see invoice to acknowledge payment obligation, this must be designed now (cross-org read is complex — needs explicit consent model or separate buyer-visible surface).

**Recommendation:** Phase 1 — seller only. Phase 2 — explicit consent model via `BuyerSupplierRelationship`.

### 21.5 OQ-TTP-005 — TTP eligibility reassessment cadence

**Question:** How often should CIBIL/eligibility assessments be refreshed? What happens when an assessment expires?

**Context:** `ttp_eligibility_assessments.valid_until` is nullable. No auto-expiry logic is designed.

**Recommendation:** Phase 1 — admin-triggered reassessment only. Expired assessments trigger enrollment suspension (`ENROLLED_TRIAL → SUSPENDED`). Auto-expiry logic deferred to Phase 2.

---

## Section 22 — Design Acceptance Checklist

Before implementation begins, verify all of the following:

| # | Check | Status |
|---|---|---|
| 1 | Trade.escrow_id remains optional — no mandatory migration planned | ✅ CONFIRMED (OD-005) |
| 2 | No PSP, no live payment gateway in Phase 1 | ✅ CONFIRMED (OD-002) |
| 3 | Seller-paid-early is external-partner-only — TexQtic does not disburse | ✅ CONFIRMED (OD-003) |
| 4 | TradeTrust Pay = product branding — no ICC/W3C credential standard implemented | ✅ CONFIRMED (OD-004A) |
| 5 | GST = hard onboarding gate; CIBIL = TTP eligibility gate | ✅ CONFIRMED (OD-004B, OD-004C) |
| 6 | Invoice domain is new — no existing Invoice table in schema | ✅ CONFIRMED (repo-truth) |
| 7 | VPC is NOT a payment instrument or negotiable instrument | ✅ DOCUMENTED (Section 11.1) |
| 8 | D-020-B: No balance column in any new table | ✅ CONFIRMED (Section 7.4) |
| 9 | D-020-C: AI boundary enforced in all new services | ✅ CONFIRMED (Section 16) |
| 10 | D-017-A: org_id always from JWT in all new routes | ✅ CONFIRMED (Section 13.1, 15.4) |
| 11 | All new tables have RLS RESTRICTIVE guard + PERMISSIVE tenant SELECT | ✅ CONFIRMED (Section 15.1) |
| 12 | partner_routing_stubs: admin-only; never transmitted in Phase 1 | ✅ CONFIRMED (Section 12.1) |
| 13 | Migration follows SQL-first → prisma db pull → prisma generate sequence | ✅ CONFIRMED (Section 17.2) |
| 14 | No `prisma db push`, no `prisma migrate dev` | ✅ CONFIRMED (Section 17.2) |
| 15 | Maker-checker (G-021) reused for high-value invoice transitions | ✅ CONFIRMED (Section 8.1, 13.3) |
| 16 | Escalation freeze gate (G-022) checked before all TTP lifecycle transitions | ✅ CONFIRMED (Section 13.3) |
| 17 | All new routes prefixed `/api/tenant/` or `/api/control/` — no new public routes | ✅ CONFIRMED (Section 13.1, 13.2) |
| 18 | Frontend finance surfaces are read-only — no withdraw/transfer/payout buttons | ✅ CONFIRMED (Section 14.3) |
| 19 | Open questions OQ-TTP-001 to OQ-TTP-005 reviewed by Paresh | ⬜ PENDING review |
| 20 | New lifecycle state keys for INVOICE and VPC do not conflict with existing keys | ⬜ VERIFY before Slice 1 |

---

## Section 23 — Final Design Decision

```
DESIGN_ARTIFACT_READY_FOR_PARESH_REVIEW
```

**What this means:** This design artifact captures the complete technical design for TexQtic TradeTrust Pay Phase 1 based on full repo-truth. It is ready for product owner review and approval. **No implementation has been performed**. No schema change has been applied. No migration has been run. No route or service file has been created or modified.

**To proceed to implementation:** Paresh reviews and approves this artifact, resolves OQ-TTP-001 through OQ-TTP-005, and issues an implementation task per the slice order in Section 20.

**Implementation tasks are NOT open.** This document is the final Phase 1 design authority.

---

*Document authority: `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-BOUNDARY-CONFIRMATIONS-001.md` (DESIGN_ARTIFACT_OPENING_AUTHORIZED)*
*Design scope: TexQtic TradeTrust Pay Phase 1 — system-of-record + routing-readiness only*
*Repo-truth basis: Full Prisma schema read (all ~1,400 lines); backend services/routes surveyed; frontend component inventory completed*
*Last updated: 2026-05-03*
