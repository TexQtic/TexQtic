# TEXQTIC — NETWORK COMMERCE DESIGN FOUNDATION 001
## Collective Procurement Pools · Order Execution Syndicates · Value Chain Orchestration

**Document ID:** TEXQTIC-NETWORK-COMMERCE-DESIGN-FOUNDATION-001
**Status:** DESIGN — NOT AUTHORIZED FOR IMPLEMENTATION
**Gate Authority:** Family-local design / opening packet only
**Created:** 2026-05-06
**Author:** Governance Artifact — Paresh Patel

> ⚠️ **IMPLEMENTATION GATE:** This packet is a family-local design and opening artifact only.
> It does NOT authorize implementation. Any later implementation packet MUST revalidate
> current repo truth at the time of opening before touching schema, APIs, UI, runtime code,
> or migrations.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Repo Truth Surfaces Inspected](#2-repo-truth-surfaces-inspected)
3. [Product Scope & Boundaries](#3-product-scope--boundaries)
4. [Module Definitions](#4-module-definitions)
5. [Shared Primitives](#5-shared-primitives)
6. [Proposed Data / Entity Model](#6-proposed-data--entity-model)
7. [Status Lifecycle Per Module](#7-status-lifecycle-per-module)
8. [Role & Permission Model](#8-role--permission-model)
9. [Tenant Isolation & Visibility Rules](#9-tenant-isolation--visibility-rules)
10. [Admin Workflows](#10-admin-workflows)
11. [Buyer Workflows](#11-buyer-workflows)
12. [Member / MSME Workflows](#12-member--msme-workflows)
13. [Supplier Workflows](#13-supplier-workflows)
14. [Quality / Inspection Gate Model](#14-quality--inspection-gate-model)
15. [Settlement Ledger & Payment Waterfall](#15-settlement-ledger--payment-waterfall)
16. [Performance Bond / Holdback / Penalty Concepts](#16-performance-bond--holdback--penalty-concepts)
17. [Trust Score & Reputation Model](#17-trust-score--reputation-model)
18. [Dispute Model](#18-dispute-model)
19. [Analytics & Data Flywheel Model](#19-analytics--data-flywheel-model)
20. [Feature Flags](#20-feature-flags)
21. [Implementation Sequencing](#21-implementation-sequencing)
22. [MVP Cutline](#22-mvp-cutline)
23. [Risks & Mitigations](#23-risks--mitigations)
24. [Next Implementation Packet](#24-next-implementation-packet)
25. [Verification Performed](#25-verification-performed)

---

## 1. Executive Summary

**Network Commerce** is a new TexQtic platform capability that transforms isolated textile MSMEs
into a coordinated, high-value commercial network. It has three interconnected modules:

| Module | Purpose | Analogy |
|--------|---------|---------|
| **Collective Procurement Pools** | Aggregate MSME demand for raw materials (yarn, grey fabric, trims, dyes, chemicals) to unlock volume pricing | Group purchasing co-operative |
| **Order Execution Syndicates** | Allow verified MSMEs to jointly fulfil large buyer orders that no single member could handle alone | Manufacturing consortium |
| **Value Chain Orchestration (VCO)** | Compose weavers → processors → value-adders → garmenters → verifiers → logistics into a virtual integrated manufacturer (VIM) | Virtual factory |

These three modules build on TexQtic's existing Trade, RFQ, Escrow, Certification, Traceability,
TtpScore, MakerChecker, Escalation, and DPP infrastructure. They do **not** require those
foundations to be rebuilt — they extend them.

**Key governance invariants:**
- Multi-tenancy and `org_id` isolation are preserved throughout
- TexQtic does not hold funds, lend capital, or underwrite credit (Governed Liquidity Doctrine)
- All financial settlement is triggered-only and executed by licensed financial partners
- Compliance gates (certifications, sanctions, TTP score) remain non-bypassable
- Every new entity uses the existing lifecycle state machine pattern

---

## 2. Repo Truth Surfaces Inspected

### Files Read
- `server/prisma/schema.prisma` — full schema review
- `server/src/services/` — service layer inventory
- `server/src/routes/tenant/` and `server/src/routes/control/` — route inventory
- `server/src/routes/admin/` listing
- `components/Tenant/` — tenant UI surfaces
- `components/ControlPlane/` — admin UI surfaces
- `docs/north-star/TEXQTIC_PRODUCT_NORTH_STAR.md` — product positioning
- `governance/control/` — active execution layer
- `governance/units/` — unit registry
- `docs/product-truth/` — family design inventory
- Memory: `/memories/repo/texqtic.md`

### Existing Domains Available for Reuse

| Domain | Schema Model(s) | Service(s) | Route(s) | UI Component(s) | Reuse Vector |
|--------|----------------|------------|----------|-----------------|--------------|
| **Trade** | `Trade`, `TradeEvent`, `TradeLifecycleLog` | `trade.g017.service.ts` | `tenant/trades.g017.ts`, `control/trades.g017.ts` | `TradesPanel.tsx`, `TradeOversight.tsx` | Pool trade + syndicate execution order |
| **RFQ** | `Rfq`, `RfqSupplierResponse` | `rfq/` services | `tenant/` RFQ routes | `BuyerRfqListSurface.tsx` | Pool procurement request initiation |
| **Escrow** | `escrow_accounts`, `escrow_transactions`, `EscrowLifecycleLog` | `escrow.service.ts` | `tenant/escrow.g018.ts` | `EscrowPanel.tsx` | Multi-party settlement holding |
| **Certification** | `Certification`, `CertificationLifecycleLog` | `certification.g019.service.ts` | `tenant/certifications.g019.ts` | `CertificationsPanel.tsx` | Quality / inspection gate per member |
| **Traceability** | `TraceabilityNode`, `TraceabilityEdge` | `traceability.g016.service.ts` | `tenant/traceability.g016.ts` | `TraceabilityPanel.tsx` | VCO supply chain graph construction |
| **DPP** | `dpp_passport_states`, `dpp_product_details`, `dpp_trade_links`, `dpp_evidence_items` | `dppProductDetails.ts`, `dppTradeLinks.ts` | `public.ts` (DPP routes) | `DPPPassport.tsx` | VCO-produced goods passport |
| **TTP Score** | `ttp_score_snapshots`, `ttp_eligibility_assessments` | `ttpScore.service.ts`, `ttpEligibility.service.ts` | `control/ttp-*` | `TtpEnrollmentBanner.tsx`, `TtpTradeSummaryCard.tsx` | Member trust score + pool eligibility gate |
| **Maker-Checker** | `PendingApproval`, `ApprovalSignature` | `makerChecker.service.ts` | embedded in lifecycle routes | `MakerCheckerConsole.tsx` | Multi-signature approval for pool/syndicate decisions |
| **Escalation** | `EscalationEvent` | `escalation.service.ts` | `tenant/escalation.g022.ts` | `EscalationsPanel.tsx` | Risk escalation for non-delivery, quality failures |
| **Sanctions** | `Sanction` | `sanctions.service.ts` | via control plane | (Admin-only) | Block sanctioned members from pool/syndicate |
| **Settlement** | `settlement/` | `settlement/` services | `tenant/settlement.ts` | `SettlementPreview.tsx` | Payment waterfall post-fulfilment |
| **Invoices** | `invoices`, `invoice_lifecycle_logs`, `verified_payable_certificates` | `invoice.service.ts` | `tenant/invoices.ts` | `InvoicesPanel.tsx` | Syndicate invoice splitting |
| **Feature Flags** | `FeatureFlag`, `TenantFeatureOverride` | (inline) | `control/` | `FeatureFlags.tsx` | NC module gating |
| **Lifecycle State Machine** | `LifecycleState`, `AllowedTransition` | `stateMachine.service.ts` | (embedded) | (embedded) | NC entity lifecycle |
| **Organizations** | `organizations`, `OrganizationRolePosition`, `OrganizationSecondarySegment` | `tenantProvision.service.ts` | via auth/tenant routes | `TenantDetails.tsx` | Member organization registry |
| **Buyer-Supplier Relationship** | `BuyerSupplierRelationship` | `relationshipAccess.service.ts` | `tenant/` | (implicit in catalog) | Pool membership / syndicate access |
| **Audit / Event Log** | `AuditLog`, `EventLog` | (inline) | (embedded) | `TenantAuditLogs.tsx` | Full audit trail for all NC operations |

### Likely Integration Areas (Not Yet Confirmed at Implementation Time)
- `stateMachine.service.ts` — entity type extension for `POOL`, `SYNDICATE`, `VCO_CHAIN`
- `escrow.service.ts` — multi-party escrow (current model is bilateral trade-linked; multi-party extension required)
- `settlement/` — pro-rata waterfall logic for multi-member payout
- `invoice.service.ts` — pool-level consolidated invoice vs. member-level split invoice
- AI layer (`server/src/services/ai/`, `server/src/routes/control/ai.g028.ts`) — demand forecasting, member matching

---

## 3. Product Scope & Boundaries

### In Scope

#### Collective Procurement Pools
- MSME members join a Pool for a specific commodity category (yarn, grey fabric, trims, dyes, chemicals)
- Demand aggregation: each member submits a procurement requirement (quantity, spec, timeline)
- Pool administrator confirms aggregated demand and issues a consolidated RFQ to nominated suppliers
- Supplier quotes against the pooled demand and accepts or rejects
- Pool distributes allocation to members per their declared demand share
- Settlement of the consolidated order is triggered per the governed liquidity doctrine
- Pool membership gating: TTP score minimum, active certification, no active sanctions

#### Order Execution Syndicates
- A lead tenant (Syndicate Coordinator) accepts a large buyer order that exceeds its solo capacity
- The Coordinator breaks the order into execution lots
- Verified MSMEs (Syndicate Members) bid for or are assigned execution lots
- Quality inspection gate required per lot before fulfilment confirmation
- Consolidated delivery tracked against buyer purchase order
- Settlement waterfall: buyer pays consolidated amount → platform triggers split to Syndicate Members proportional to fulfilled lots
- Performance bond and holdback per member per lot

#### Value Chain Orchestration (VCO) / Virtual Integrated Manufacturer
- A VCO defines a multi-stage production chain: Weaver → Greige Processor → Dye House → Value Adder → Garmenter
- Each stage is assigned to a verified MSME node
- Input-output handoff between stages is tracked as TraceabilityEdge connections
- Quality inspection gate at each handoff
- Digital Product Passport (DPP) is built incrementally as each stage completes
- Final buyer delivery is DPP-complete
- VCO is composable: stages can be added or dropped within defined tolerance

### Out of Scope (Design Phase Boundary)
- Financial intermediation, fund custody, or direct lending
- Consumer-facing B2C procurement pools
- Real-time commodity exchange or spot pricing
- Cross-jurisdictional regulatory arbitrage
- Insurance underwriting or surety bonds (future fintech partner integration point only)
- Inventory management or physical warehouse operations
- Customs clearance or trade finance instruments (Letter of Credit, Bill of Lading issuance)

---

## 4. Module Definitions

### Module A — Collective Procurement Pool (CPP)

```
CPP = { Pool Entity } + { Pool Members (orgs) } + { Pool Demand Lines } +
      { Pool Consolidated RFQ } + { Pool Supplier Quote } + { Pool Allocation } +
      { Pool Order } + { Pool Settlement }
```

**Actors:** Pool Administrator (platform-assigned or MSME-elected), Pool Members, Supplier, Platform Admin

### Module B — Order Execution Syndicate (OES)

```
OES = { Syndicate Entity } + { Syndicate Coordinator } + { Syndicate Members (orgs) } +
      { Execution Lots } + { Lot Bids } + { Lot Assignments } + { Lot Quality Gates } +
      { Syndicate Delivery } + { Syndicate Settlement Waterfall } + { Performance Bonds }
```

**Actors:** Syndicate Coordinator (lead MSME/tenant), Syndicate Members, Buyer, Platform Admin, Quality Inspector

### Module C — Value Chain Orchestration (VCO)

```
VCO = { VCO Chain Entity } + { VCO Stages } + { Stage Assignments (MSME → stage) } +
      { Stage Inputs/Outputs (TraceabilityEdge) } + { Stage Quality Gates } +
      { Stage Certifications } + { DPP Build (incremental) } + { VCO Delivery } +
      { VCO Settlement }
```

**Actors:** VCO Orchestrator (platform admin or lead tenant), Stage MSMEs, Buyer, Platform Admin, Quality Inspector

---

## 5. Shared Primitives

These primitives are shared across all three modules and map to or extend existing repo entities:

| Primitive | Maps To | Notes |
|-----------|---------|-------|
| **Network Member** | `organizations` + `OrganizationRolePosition` | Role position key: `POOL_MEMBER`, `SYNDICATE_MEMBER`, `VCO_STAGE_PARTICIPANT` |
| **Network Participation** | New `NetworkParticipation` entity | M2M: network entity ↔ organization; includes member state |
| **Network Request** | New `NetworkRequest` entity | Demand line (CPP), lot bid (OES), stage claim (VCO) |
| **Network Lifecycle** | `LifecycleState` + `AllowedTransition` (new entity types) | `POOL`, `SYNDICATE`, `VCO_CHAIN` entity types |
| **Network Lifecycle Log** | New `NetworkLifecycleLog` | Append-only; follows same immutability pattern as `TradeLifecycleLog` |
| **Quality Gate** | `Certification` + new `NetworkQualityGate` | Ties a quality inspection event to a lot or VCO stage handoff |
| **Consolidated Invoice** | `invoices` (new invoice type: `POOL_ORDER`, `SYNDICATE_EXECUTION`, `VCO_DELIVERY`) | Invoice type extension, not a new table |
| **Performance Bond Record** | New `NetworkPerformanceBond` | Holdback amount, release conditions, penalty terms |
| **Trust Gate Check** | `ttp_score_snapshots`, `Sanction`, `Certification` | Read-only eligibility check at join/assignment time |
| **Network Dispute** | New `NetworkDisputeCase` | Extends dispute model; links to EscalationEvent chain |
| **Network Audit Trail** | `AuditLog`, `EventLog` | All NC operations emit standard audit events |
| **Network Feature Flag** | `FeatureFlag` + `TenantFeatureOverride` | Per-module flags (see Section 20) |

---

## 6. Proposed Data / Entity Model

> ⚠️ This is a PROPOSED model for design purposes only. No Prisma schema changes are authorized
> until a separate implementation packet is opened and repo truth is re-validated.

### 6.1 NetworkPool (Module A)

```
NetworkPool {
  id                UUID PK
  org_id            UUID FK→organizations (sponsoring/administering org)
  tenant_id         UUID FK→tenants
  pool_ref          VARCHAR(100) UNIQUE PER TENANT
  commodity_category VARCHAR(100)   -- yarn | grey_fabric | trims | dyes | chemicals
  target_qty        DECIMAL(18,4)
  qty_unit          VARCHAR(20)
  lifecycle_state_id UUID FK→lifecycle_states (entity_type='POOL')
  open_at           TIMESTAMPTZ
  close_at          TIMESTAMPTZ
  allocated_at      TIMESTAMPTZ NULL
  settled_at        TIMESTAMPTZ NULL
  metadata          JSONB DEFAULT '{}'
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.2 NetworkPoolMembership

```
NetworkPoolMembership {
  id               UUID PK
  pool_id          UUID FK→network_pools
  org_id           UUID FK→organizations
  tenant_id        UUID FK→tenants
  declared_qty     DECIMAL(18,4)
  qty_unit         VARCHAR(20)
  allocated_qty    DECIMAL(18,4) NULL
  allocation_pct   DECIMAL(5,4)  NULL   -- computed at allocation
  status           VARCHAR(30)          -- PENDING | APPROVED | ALLOCATED | SETTLED | WITHDRAWN
  joined_at        TIMESTAMPTZ DEFAULT now()
  approved_at      TIMESTAMPTZ NULL
  withdrawn_at     TIMESTAMPTZ NULL
  created_at       TIMESTAMPTZ DEFAULT now()
  updated_at       TIMESTAMPTZ DEFAULT now()
  UNIQUE(pool_id, org_id)
}
```

### 6.3 NetworkPoolRFQ (Pool → Supplier procurement)

```
NetworkPoolRfq {
  id               UUID PK
  pool_id          UUID FK→network_pools
  org_id           UUID FK→organizations (issuing org)
  supplier_org_id  UUID FK→organizations
  consolidated_qty DECIMAL(18,4)
  qty_unit         VARCHAR(20)
  spec_json        JSONB
  status           VARCHAR(30)  -- DRAFT | SENT | QUOTED | ACCEPTED | REJECTED | EXPIRED
  quote_amount     DECIMAL(18,6) NULL
  currency         CHAR(3)
  quote_expiry     TIMESTAMPTZ NULL
  accepted_at      TIMESTAMPTZ NULL
  rejected_at      TIMESTAMPTZ NULL
  created_at       TIMESTAMPTZ DEFAULT now()
  updated_at       TIMESTAMPTZ DEFAULT now()
}
```

### 6.4 NetworkSyndicate (Module B)

```
NetworkSyndicate {
  id                   UUID PK
  coordinator_org_id   UUID FK→organizations  -- lead MSME
  tenant_id            UUID FK→tenants
  syndicate_ref        VARCHAR(100) UNIQUE PER TENANT
  buyer_order_ref      VARCHAR(200) NULL       -- external buyer PO ref
  buyer_org_id         UUID FK→organizations NULL  -- if buyer is on-platform
  total_qty            DECIMAL(18,4)
  qty_unit             VARCHAR(20)
  delivery_deadline    DATE
  lifecycle_state_id   UUID FK→lifecycle_states (entity_type='SYNDICATE')
  currency             CHAR(3)
  total_value          DECIMAL(18,6)
  holdback_pct         DECIMAL(5,4) DEFAULT 0.10  -- 10% default
  settled_at           TIMESTAMPTZ NULL
  metadata             JSONB DEFAULT '{}'
  created_at           TIMESTAMPTZ DEFAULT now()
  updated_at           TIMESTAMPTZ DEFAULT now()
}
```

### 6.5 NetworkSyndicateLot

```
NetworkSyndicateLot {
  id                  UUID PK
  syndicate_id        UUID FK→network_syndicates
  org_id              UUID FK→organizations (owning org context)
  lot_ref             VARCHAR(100)
  lot_seq             INT
  assigned_org_id     UUID FK→organizations NULL  -- executing MSME
  lot_qty             DECIMAL(18,4)
  qty_unit            VARCHAR(20)
  lot_value           DECIMAL(18,6)
  holdback_amount     DECIMAL(18,6)
  status              VARCHAR(30)   -- OPEN | BID | ASSIGNED | IN_PROGRESS | QUALITY_REVIEW | FULFILLED | FAILED | REALLOCATED
  quality_gate_id     UUID FK→network_quality_gates NULL
  performance_bond_id UUID FK→network_performance_bonds NULL
  assigned_at         TIMESTAMPTZ NULL
  fulfilled_at        TIMESTAMPTZ NULL
  failed_at           TIMESTAMPTZ NULL
  created_at          TIMESTAMPTZ DEFAULT now()
  updated_at          TIMESTAMPTZ DEFAULT now()
}
```

### 6.6 NetworkSyndicateMembership

```
NetworkSyndicateMembership {
  id              UUID PK
  syndicate_id    UUID FK→network_syndicates
  org_id          UUID FK→organizations
  tenant_id       UUID FK→tenants
  role            VARCHAR(30)  -- COORDINATOR | MEMBER
  status          VARCHAR(30)  -- INVITED | ACTIVE | SUSPENDED | WITHDRAWN
  invited_at      TIMESTAMPTZ DEFAULT now()
  joined_at       TIMESTAMPTZ NULL
  suspended_at    TIMESTAMPTZ NULL
  UNIQUE(syndicate_id, org_id)
  created_at      TIMESTAMPTZ DEFAULT now()
  updated_at      TIMESTAMPTZ DEFAULT now()
}
```

### 6.7 NetworkVcoChain (Module C)

```
NetworkVcoChain {
  id                UUID PK
  orchestrator_org_id UUID FK→organizations   -- platform admin org or lead tenant
  tenant_id         UUID FK→tenants
  chain_ref         VARCHAR(100) UNIQUE PER TENANT
  product_category  VARCHAR(100)
  buyer_org_id      UUID FK→organizations NULL
  buyer_order_ref   VARCHAR(200) NULL
  lifecycle_state_id UUID FK→lifecycle_states (entity_type='VCO_CHAIN')
  target_delivery   DATE
  currency          CHAR(3)
  total_value       DECIMAL(18,6)
  dpp_passport_id   UUID NULL   -- FK→dpp_passport_states once DPP is initialized
  completed_at      TIMESTAMPTZ NULL
  metadata          JSONB DEFAULT '{}'
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.8 NetworkVcoStage

```
NetworkVcoStage {
  id                  UUID PK
  chain_id            UUID FK→network_vco_chains
  org_id              UUID FK→organizations
  stage_seq           INT
  stage_type          VARCHAR(50)   -- WEAVER | GREIGE_PROCESSOR | DYE_HOUSE | VALUE_ADDER | GARMENTER | VERIFIER | LOGISTICS
  assigned_org_id     UUID FK→organizations NULL
  input_node_id       UUID FK→traceability_nodes NULL
  output_node_id      UUID FK→traceability_nodes NULL
  stage_value         DECIMAL(18,6)
  holdback_amount     DECIMAL(18,6)
  quality_gate_id     UUID FK→network_quality_gates NULL
  status              VARCHAR(30)   -- PLANNED | ASSIGNED | IN_PROGRESS | QUALITY_REVIEW | COMPLETE | FAILED
  started_at          TIMESTAMPTZ NULL
  completed_at        TIMESTAMPTZ NULL
  failed_at           TIMESTAMPTZ NULL
  created_at          TIMESTAMPTZ DEFAULT now()
  updated_at          TIMESTAMPTZ DEFAULT now()
}
```

### 6.9 NetworkQualityGate

```
NetworkQualityGate {
  id                UUID PK
  org_id            UUID FK→organizations
  entity_type       VARCHAR(30)   -- SYNDICATE_LOT | VCO_STAGE
  entity_id         UUID          -- references syndicate_lot or vco_stage
  inspector_org_id  UUID FK→organizations NULL
  inspection_type   VARCHAR(50)   -- PHYSICAL | DOCUMENT | AI_ASSISTED
  status            VARCHAR(30)   -- PENDING | IN_PROGRESS | PASSED | FAILED | WAIVED
  inspection_ref    VARCHAR(200) NULL
  evidence_json     JSONB DEFAULT '{}'
  certification_id  UUID FK→certifications NULL  -- optional cert link
  passed_at         TIMESTAMPTZ NULL
  failed_at         TIMESTAMPTZ NULL
  waived_by         UUID NULL
  waiver_reason     TEXT NULL
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.10 NetworkPerformanceBond

```
NetworkPerformanceBond {
  id                UUID PK
  org_id            UUID FK→organizations   -- org that owns the bond context
  member_org_id     UUID FK→organizations   -- org subject to bond
  entity_type       VARCHAR(30)   -- SYNDICATE_LOT | VCO_STAGE
  entity_id         UUID
  bond_amount       DECIMAL(18,6)
  currency          CHAR(3)
  holdback_amount   DECIMAL(18,6)
  penalty_amount    DECIMAL(18,6) DEFAULT 0
  status            VARCHAR(30)   -- ACTIVE | RELEASED | FORFEITED | PARTIAL_RELEASE
  release_condition TEXT
  released_at       TIMESTAMPTZ NULL
  forfeited_at      TIMESTAMPTZ NULL
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.11 NetworkDisputeCase

```
NetworkDisputeCase {
  id                  UUID PK
  org_id              UUID FK→organizations   -- org raising the dispute
  respondent_org_id   UUID FK→organizations
  entity_type         VARCHAR(30)   -- POOL | SYNDICATE | VCO_CHAIN | SYNDICATE_LOT | VCO_STAGE
  entity_id           UUID
  dispute_type        VARCHAR(50)   -- QUALITY_FAILURE | NON_DELIVERY | ALLOCATION_DISPUTE | PAYMENT_DISPUTE | CONDUCT
  status              VARCHAR(30)   -- RAISED | UNDER_REVIEW | RESOLVED | ESCALATED | CLOSED
  description         TEXT
  evidence_json       JSONB DEFAULT '{}'
  escalation_event_id UUID FK→escalation_events NULL
  resolution_notes    TEXT NULL
  resolved_at         TIMESTAMPTZ NULL
  resolved_by         UUID NULL
  created_at          TIMESTAMPTZ DEFAULT now()
  updated_at          TIMESTAMPTZ DEFAULT now()
}
```

### 6.12 NetworkSettlementSplit

```
NetworkSettlementSplit {
  id                UUID PK
  org_id            UUID FK→organizations   -- scope org
  entity_type       VARCHAR(30)   -- POOL | SYNDICATE | VCO_CHAIN
  entity_id         UUID
  recipient_org_id  UUID FK→organizations
  gross_amount      DECIMAL(18,6)
  holdback_amount   DECIMAL(18,6)
  penalty_deduction DECIMAL(18,6) DEFAULT 0
  net_payable       DECIMAL(18,6)
  currency          CHAR(3)
  waterfall_seq     INT           -- order of payment in waterfall
  status            VARCHAR(30)   -- PENDING | TRIGGERED | RELEASED | FAILED
  escrow_account_id UUID FK→escrow_accounts NULL
  triggered_at      TIMESTAMPTZ NULL
  released_at       TIMESTAMPTZ NULL
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
}
```

### 6.13 NetworkLifecycleLog (shared across all NC modules)

```
NetworkLifecycleLog {
  id              UUID PK
  org_id          UUID FK→organizations
  entity_type     VARCHAR(30)   -- POOL | SYNDICATE | VCO_CHAIN
  entity_id       UUID
  from_state_key  VARCHAR(100)
  to_state_key    VARCHAR(100)
  actor_user_id   UUID NULL
  actor_admin_id  UUID NULL
  actor_type      VARCHAR(50)
  actor_role      VARCHAR(100)
  escalation_level INT NULL
  maker_user_id   UUID NULL
  checker_user_id UUID NULL
  ai_triggered    BOOLEAN DEFAULT false
  impersonation_id UUID NULL
  reason          TEXT NOT NULL
  request_id      VARCHAR(200) NULL
  created_at      TIMESTAMPTZ DEFAULT now()
  -- Immutable: no update/delete policy; append-only
}
```

---

## 7. Status Lifecycle Per Module

### 7.1 Collective Procurement Pool (`entity_type = 'POOL'`)

```
DRAFT
  → OPEN          (pool administrator opens for member demand registration)
    → AGGREGATING (demand collection window active)
      → CLOSED_FOR_BIDS (demand window closed; awaiting supplier quotes)
        → QUOTED    (supplier quote received)
          → ACCEPTED  (pool admin accepts supplier quote; MakerChecker if >threshold)
            → ALLOCATING (demand allocation computed per member)
              → ALLOCATED  (allocation confirmed to all members)
                → ORDERED   (consolidated order placed to supplier)
                  → IN_FULFILMENT (supplier executing)
                    → PARTIALLY_DELIVERED
                    → DELIVERED   (terminal)
                    → SETTLEMENT_PENDING
                      → SETTLED    (terminal)
          → REJECTED  (terminal — pool admin rejects all quotes)
      → WITHDRAWN   (terminal — pool closed without execution)
      → CANCELLED   (terminal — admin-initiated)
```

### 7.2 Order Execution Syndicate (`entity_type = 'SYNDICATE'`)

```
DRAFT
  → FORMING       (coordinator assembles members; lot structure defined)
    → OPEN_FOR_BIDS (lots open for member bids/acceptance)
      → LOTS_ASSIGNED  (all lots assigned to members; MakerChecker for >threshold)
        → IN_PROGRESS   (execution underway)
          → QUALITY_REVIEW (all lots submitted; awaiting quality gates)
            → QUALITY_PASSED
              → DELIVERY_CONFIRMED (buyer confirms receipt)
                → SETTLEMENT_PENDING
                  → SETTLED   (terminal)
            → QUALITY_FAILED
              → REMEDIATION  (failed lots reassigned or escalated)
              → ESCALATED    (dispute raised)
        → PARTIAL_FAILURE   (some lots failed; reallocation attempted)
          → REMEDIATION
      → CANCELLED   (terminal)
  → REJECTED      (terminal — insufficient members or compliance failure)
```

### 7.3 VCO Chain (`entity_type = 'VCO_CHAIN'`)

```
PLANNED
  → STAGE_ASSIGNMENT (orchestrator assigns orgs to stages)
    → ACTIVE        (first stage begins production)
      → STAGE_IN_PROGRESS[n] (per-stage sub-status tracked in NetworkVcoStage.status)
        → STAGE_COMPLETE[n]   (quality gate passed; output node created)
          (continues through each stage sequentially)
      → DPP_BUILDING  (DPP incrementally constructed across stages)
        → FINAL_QC    (terminal quality inspection before delivery)
          → DELIVERY_READY
            → DELIVERED       (terminal)
              → SETTLEMENT_PENDING
                → SETTLED     (terminal)
      → STAGE_FAILED[n]
        → REMEDIATION
        → ESCALATED
      → CANCELLED     (terminal)
```

---

## 8. Role & Permission Model

### 8.1 Network Commerce Actor Roles

| Role Key | Scope | Capabilities |
|----------|-------|-------------|
| `NC_POOL_ADMIN` | Tenant/org | Create pools, approve members, issue RFQs, accept quotes, trigger allocation |
| `NC_POOL_MEMBER` | Tenant/org | Submit demand lines, view own allocation, accept/reject allocation |
| `NC_SYNDICATE_COORDINATOR` | Tenant/org | Create syndicates, define lots, invite/assign members, confirm delivery |
| `NC_SYNDICATE_MEMBER` | Tenant/org | Bid for lots, execute lots, submit quality evidence |
| `NC_VCO_ORCHESTRATOR` | Tenant/org or Platform Admin | Create VCO chains, assign stages, monitor cross-org flow |
| `NC_VCO_STAGE_EXECUTOR` | Tenant/org | Accept stage assignment, report stage completion, submit quality evidence |
| `NC_QUALITY_INSPECTOR` | Tenant/org or Platform Admin | Conduct inspections, pass/fail quality gates, waive (with reason) |
| `NC_PLATFORM_ADMIN` | Platform (control plane) | Full oversight, dispute adjudication, force-close, override |
| `NC_BUYER` | External or on-platform tenant | View syndicate/VCO delivery status; raise disputes |

### 8.2 Permission Matrix (condensed)

| Action | NC_POOL_ADMIN | NC_POOL_MEMBER | NC_SYNDICATE_COORDINATOR | NC_SYNDICATE_MEMBER | NC_VCO_ORCHESTRATOR | NC_QUALITY_INSPECTOR | NC_PLATFORM_ADMIN |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Create Pool | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Join Pool | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Issue Pool RFQ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Accept Pool Quote | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (override) |
| Create Syndicate | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Bid / Accept Lot | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Create VCO Chain | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Assign VCO Stage | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Pass/Fail Quality Gate | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Trigger Settlement | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (trigger-only) |
| Raise Dispute | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Adjudicate Dispute | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Force-close Entity | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 8.3 MakerChecker Gates

The following actions require MakerChecker (`PendingApproval`) when value exceeds a configurable threshold:

- Pool quote acceptance (`NC_POOL_ADMIN` Maker → second `NC_POOL_ADMIN` or `NC_PLATFORM_ADMIN` Checker)
- Syndicate lot assignment when total syndicate value exceeds threshold
- VCO chain activation
- Settlement trigger (always requires MakerChecker for amounts above platform minimum)
- Performance bond forfeiture

---

## 9. Tenant Isolation & Visibility Rules

### Foundational Rule
All NC entities carry `org_id` as the canonical RLS boundary, identical to all other TexQtic entities. No NC entity is exempt from this requirement.

### Visibility Matrix

| Entity | Owner's view | Other Pool/Syndicate Members' view | Public / Buyer view |
|--------|:---:|:---:|:---:|
| NetworkPool | Full (own) | Name, commodity, status only (if member) | None |
| NetworkPoolMembership | Full (own) | Own row only | None |
| NetworkPoolRfq | Full (own admin) | Status only (after acceptance) | None |
| NetworkSyndicate | Full (coordinator) | Status + own lot | Delivery status only |
| NetworkSyndicateLot | Full (coordinator + assigned member) | Own lot only | None |
| NetworkVcoChain | Full (orchestrator) | Own stage | DPP outputs only |
| NetworkVcoStage | Full (orchestrator) | Own stage only | None |
| NetworkQualityGate | Inspector + entity owner | Pass/Fail + cert link | DPP evidence only |
| NetworkPerformanceBond | Own org + coordinator + platform admin | None | None |
| NetworkDisputeCase | Both parties + platform admin | None | None |
| NetworkSettlementSplit | Own org + platform admin | None | None |

### Cross-Org Access Pattern
- When a Pool/Syndicate/VCO involves multiple orgs, cross-org visibility is mediated through
  `NetworkPoolMembership`, `NetworkSyndicateMembership`, or `NetworkVcoStage` assignment.
- Cross-org reads must never bypass org_id RLS. The service layer must use
  `withDbContext(org_id)` for each row's owning org.
- Shared status summaries are exposed via read-only projection views scoped to the participant's own org.

---

## 10. Admin Workflows

### 10.1 Platform Admin — Pool Oversight
1. View all active pools (cross-tenant, control plane)
2. Approve/reject pool creation (if plan-gated)
3. Monitor pool health: member count, demand aggregation progress, quote status
4. Override pool allocation if member dispute
5. Trigger or unblock settlement for a settled pool order
6. Force-close a pool with mandatory reason (triggers EscalationEvent)
7. View full NetworkLifecycleLog for any pool

### 10.2 Platform Admin — Syndicate Oversight
1. View all syndicates (cross-tenant, control plane)
2. Override lot assignment if coordinator is blocked
3. Review and adjudicate quality gate failures
4. Monitor performance bond status; approve forfeiture
5. Adjudicate disputes (NetworkDisputeCase resolution)
6. Force-close syndicate with mandatory reason
7. Override delivery confirmation holdback release

### 10.3 Platform Admin — VCO Oversight
1. View all active VCO chains
2. Monitor per-stage progress and DPP build completeness
3. Approve VCO chain creation (feature-flagged)
4. Oversee quality gate results at each handoff
5. Adjudicate stage assignment disputes
6. Force-complete or force-fail a stage (exceptional; MakerChecker required)

### 10.4 Admin Governance
- All admin actions emit `AuditLog` records with `realm = 'CONTROL'`
- All NC admin actions require impersonation session if modifying tenant data from control plane
- Force-close / force-fail actions trigger `EscalationEvent` at severity ≥ 2

---

## 11. Buyer Workflows

### 11.1 Procurement Pool Buyer
1. Buyer (external or on-platform) places a demand that triggers Pool formation
2. OR buyer receives a consolidated quote from a Pool Administrator
3. Buyer confirms the consolidated order
4. Buyer receives consolidated delivery confirmation and DPP (if requested)
5. Buyer initiates payment (governed liquidity; executed by financial partner)
6. Buyer can raise a delivery dispute against the Pool (not individual members)

### 11.2 Syndicate Buyer
1. Buyer issues a large purchase order (on-platform via RFQ, or off-platform reference)
2. Syndicate Coordinator accepts the order on behalf of the syndicate
3. Buyer views consolidated delivery status (not individual lot breakdown)
4. Buyer confirms delivery on consolidated basis
5. Buyer-triggered payment flows into settlement waterfall
6. Buyer can raise a post-delivery quality dispute

### 11.3 VCO Buyer
1. Buyer places an order for a VCO-produced product
2. Buyer sees VCO chain status summary (not internal stage details)
3. Buyer receives incremental DPP evidence as stages complete
4. Buyer confirms final delivery and DPP completeness
5. Buyer initiates payment; waterfall triggered
6. Buyer can raise a dispute against the VCO chain

---

## 12. Member / MSME Workflows

### 12.1 Pool Member
1. Discover available pools (filtered by commodity, location, certification)
2. Pass eligibility check: TTP score ≥ minimum, active relevant certifications, no active sanctions
3. Submit demand line: quantity, spec details, target delivery date
4. Receive allocation decision (accept or withdraw)
5. Receive consolidated delivery confirmation (own allocated share)
6. Settlement received proportional to allocation
7. Optionally raise allocation dispute

### 12.2 Syndicate Member
1. Receive lot bid invitation (from Coordinator) or bid on open lots
2. Pass eligibility check: TTP score, certification, sanctions
3. Submit lot bid (quantity, timeline, price)
4. Receive lot assignment confirmation
5. Execute lot: report milestones, submit quality evidence
6. Submit lot for quality gate review
7. On quality pass: fulfilment confirmed; holdback released progressively
8. Receive settlement (gross lot value minus holdback minus any penalties)

### 12.3 VCO Stage Executor
1. Receive stage assignment from VCO Orchestrator
2. Accept or decline stage (within acceptance window)
3. Receive input materials reference (TraceabilityNode from prior stage)
4. Execute stage: process materials, report stage milestones
5. Submit output: create TraceabilityNode for output batch; link to input via TraceabilityEdge
6. Submit stage for quality gate inspection
7. On quality pass: output node linked to DPP; next stage unlocked
8. Receive settlement for stage value upon VCO chain completion

---

## 13. Supplier Workflows

### 13.1 Procurement Pool Supplier
1. Receive consolidated Pool RFQ (issued by Pool Administrator)
2. View aggregated demand specs
3. Submit pool-level quote (single price for total quantity, or tiered)
4. Receive acceptance/rejection
5. Execute consolidated order
6. Report fulfilment milestones
7. Receive payment on fulfilment confirmation

### 13.2 Syndicate / VCO External Supplier
- External suppliers (raw material, logistics) may be engaged within individual lots or VCO stages
- They operate via standard RFQ → Trade → Invoice flow; they are not Syndicate/VCO Members
- Supplier-level DPP evidence nodes may be submitted for inclusion in the VCO chain DPP

---

## 14. Quality / Inspection Gate Model

### 14.1 Gate Types

| Gate Type | Trigger | Inspector | Pass Condition | Fail Action |
|-----------|---------|-----------|----------------|-------------|
| `PRE_ALLOCATION` | Before Pool allocation is confirmed | Platform / Cert authority | TTP ≥ threshold + valid cert | Member blocked from allocation |
| `LOT_SUBMISSION` | Syndicate lot submitted for quality review | NC_QUALITY_INSPECTOR | Physical/doc inspection passes | Lot marked FAILED; bond at risk |
| `STAGE_HANDOFF` | VCO stage output ready for next stage | NC_QUALITY_INSPECTOR | Physical/doc inspection passes | Stage FAILED; chain paused |
| `FINAL_QC` | VCO chain before delivery | NC_QUALITY_INSPECTOR | All stage outputs verified | Delivery blocked until pass |
| `DPP_COMPLETENESS` | VCO chain delivery confirmation | Automated (DPP engine) | All DPP evidence items present | Delivery confirmation blocked |

### 14.2 Waiver Rules
- Quality gate waivers require `NC_PLATFORM_ADMIN` actor
- Waivers require a mandatory written reason (stored in `NetworkQualityGate.waiver_reason`)
- Waivers emit an `EscalationEvent` at severity 2 (HighRisk)
- AI-assisted inspection evidence is advisory only; human confirmation is mandatory (follows D-020-C pattern)

### 14.3 Certification Integration
- Each quality gate can optionally link to a `Certification` row (e.g., GOTS certificate for stage output)
- Certification validity is checked at gate execution time via `certification.g019.service.ts`
- Expired certifications block quality gate pass

---

## 15. Settlement Ledger & Payment Waterfall

> TexQtic does not hold funds, lend capital, or underwrite credit.
> All settlement is trigger-only. Licensed financial partners execute movement.

### 15.1 Settlement Trigger Sequence

```
1. Delivery confirmed (buyer or system) / Stage complete
2. Quality gate(s) passed
3. Disputes window expires (configurable, default 7 days) OR dispute resolved
4. MakerChecker approval for settlement trigger (if amount > threshold)
5. NetworkSettlementSplit rows computed (waterfall)
6. Escrow release trigger sent to financial partner API (NOT executed by TexQtic)
7. Settlement status updated to TRIGGERED → RELEASED on partner callback
8. Platform audit event emitted
```

### 15.2 Pool Payment Waterfall

```
Buyer payment (gross pool order amount)
  → Supplier payment (consolidated invoice less platform fee)
  → Platform fee (configurable %)
  → Each Pool Member allocation credit (proportional to allocated_qty / total_qty)
```

### 15.3 Syndicate Payment Waterfall

```
Buyer payment (total syndicate value)
  → Syndicate Coordinator fee (configurable %)
  → Platform fee (configurable %)
  → Per-Lot settlement:
      For each fulfilled lot:
        → Gross lot value
          → minus holdback_amount (held pending final confirmation)
          → minus penalty_deduction (if quality failure or late delivery)
          → = net_payable to assigned_org_id
  → Holdback release:
      After full delivery confirmation + disputes window:
        → holdback_amount released to respective members
```

### 15.4 VCO Payment Waterfall

```
Buyer payment (total VCO value)
  → Platform orchestration fee (configurable %)
  → Per-Stage settlement (in reverse stage order, i.e., garmenter first):
      For each completed stage:
        → stage_value
          → minus holdback_amount
          → minus penalty_deduction
          → = net_payable to assigned_org_id (stage executor)
  → Holdback release (post final DPP confirmation + disputes window)
```

### 15.5 Financial Partner Integration Points
- `NetworkSettlementSplit.status = TRIGGERED` → platform calls financial partner API (not implemented; future fintech integration)
- Financial partner callback updates `NetworkSettlementSplit.status = RELEASED`
- No monetary fields in TexQtic represent held funds; they represent settlement instructions

---

## 16. Performance Bond / Holdback / Penalty Concepts

### 16.1 Performance Bond
- A `NetworkPerformanceBond` is created for each lot (Syndicate) or stage (VCO) at assignment
- `bond_amount` is the total value at risk for non-performance
- `holdback_amount` is the deferred portion of payment (subset of bond_amount)
- Bond is `ACTIVE` from assignment until performance is confirmed or forfeited

### 16.2 Holdback Schedule

| Milestone | Holdback Release % |
|-----------|-------------------|
| Lot / Stage submitted for QC | 0% |
| Quality gate passed | 30% of holdback |
| Buyer confirms partial delivery | 40% additional |
| Disputes window expires clean | Remaining 30% |

Percentages are configurable per-network at creation time.

### 16.3 Penalty Triggers
| Trigger | Default Penalty | Configurable |
|---------|----------------|:---:|
| Late delivery (≤ 7 days) | 2% of lot/stage value | ✅ |
| Late delivery (7–14 days) | 5% | ✅ |
| Late delivery (>14 days) | 10% + bond forfeiture consideration | ✅ |
| Quality gate failure (first attempt) | 0% (remediation window) | N/A |
| Quality gate failure (second attempt) | 5% + escalation | ✅ |
| No-show / abandonment | Full bond forfeiture | No |

### 16.4 Bond Forfeiture Process
1. Penalty trigger event identified by service layer
2. EscalationEvent raised (severity 2–3 depending on breach severity)
3. MakerChecker approval required for forfeiture
4. `NetworkPerformanceBond.status → FORFEITED`
5. `NetworkSettlementSplit.penalty_deduction` updated
6. Forfeiture audit event emitted

---

## 17. Trust Score & Reputation Model

### 17.1 Existing TTP Score Integration
Network Commerce reuses and extends the existing `ttp_score_snapshots` and `ttp_eligibility_assessments` infrastructure:

- **Pool eligibility gate:** TTP score ≥ `pool_min_ttp_score` (configurable per pool)
- **Syndicate member eligibility:** TTP score ≥ `syndicate_min_ttp_score` + active certifications
- **VCO stage assignment:** TTP score ≥ `vco_stage_min_ttp_score` for the relevant stage type

### 17.2 NC-Specific Score Signals

The following signals from NC participation are proposed as future TTP score inputs (deferred to NC-TTP integration design):

| Signal | Direction | Weight (indicative) |
|--------|-----------|---------------------|
| Successful pool fulfilment (as member) | Positive | Low |
| Successful syndicate lot fulfilment | Positive | Medium |
| VCO stage completed on-time + quality pass | Positive | Medium |
| Quality gate failure (first) | Negative | Low |
| Quality gate failure (second) | Negative | High |
| Bond forfeiture | Negative | Very High |
| Dispute raised against member (resolved against) | Negative | High |
| Consistent on-time delivery (rolling 6mo) | Positive | Medium |

### 17.3 NC Reputation Display
- Pool / Syndicate / VCO entity pages show aggregate member trust indicators
- Individual member trust score visible to Coordinator/Orchestrator (not to other members)
- Platform admin sees full score breakdown

---

## 18. Dispute Model

### 18.1 Dispute Types

| Type | Module | Raised By | Against | Resolution Path |
|------|--------|-----------|---------|-----------------|
| `QUALITY_FAILURE` | B, C | Member, Coordinator, Buyer | Assigned lot/stage org | Quality re-inspection → penalty or remediation |
| `NON_DELIVERY` | B, C | Coordinator, Buyer | Assigned lot/stage org | Bond forfeiture consideration; member suspension |
| `ALLOCATION_DISPUTE` | A | Member | Pool Admin | Platform Admin adjudication |
| `PAYMENT_DISPUTE` | A, B, C | Any member | Platform | Platform review + financial partner escalation |
| `CONDUCT` | Any | Any | Any | Platform Admin adjudication |

### 18.2 Dispute Lifecycle

```
RAISED
  → UNDER_REVIEW    (platform admin picks up)
    → RESOLVED      (terminal — outcome recorded)
    → ESCALATED     (EscalationEvent linked; higher severity)
      → RESOLVED    (terminal)
  → CLOSED          (terminal — withdrawn by raiser or auto-expired)
```

### 18.3 Dispute Governance Rules
- Disputes block settlement release during `UNDER_REVIEW` state (holdback extended)
- If dispute is resolved in claimant's favour, penalty is applied to respondent's `NetworkSettlementSplit`
- All dispute adjudications emit `AuditLog` with `realm = 'CONTROL'`
- Repeated disputes against the same org trigger automatic TTP score degradation signal

---

## 19. Analytics & Data Flywheel Model

### 19.1 Platform Moat Through NC Data

Network Commerce generates unique cross-org, cross-stage data that is not available to any single participant and creates structural platform lock-in:

| Data Signal | Moat Value |
|-------------|-----------|
| Demand aggregation curves by commodity, season, region | Demand forecasting for procurement pools |
| Member execution reliability (delivery time, quality pass rate, bond forfeiture rate) | Risk scoring for future assignments |
| Value chain composition patterns (which stage types work together) | VCO template library (reusable chain designs) |
| Commodity price benchmarks from pool RFQ/quote history | Price transparency for members |
| Cross-org traceability graph (VCO chains) | DPP lineage completeness; regulatory advantage |
| Settlement velocity and waterfall execution time | Financial partner benchmarking |

### 19.2 Analytics Surfaces (Proposed)

| Surface | Audience | Location |
|---------|----------|----------|
| Pool demand heatmap | Platform Admin | Control plane dashboard |
| Member reliability scorecard | NC Admin / Coordinator | Tenant + control plane |
| VCO chain composition reuse rate | Platform Admin | Control plane |
| Commodity price index (pool quotes) | Platform Admin | Control plane (initially) |
| Settlement velocity dashboard | Platform Admin | Control plane |
| Member NC participation history | Member (own only) | Tenant panel |

### 19.3 AI Integration Points (Deferred — Design Only)

The following AI functions are in-scope for future design after MVP:

- **Demand forecasting:** Predict future pool demand by commodity using aggregated historical signals
- **Member-to-lot matching:** AI recommendation for which Syndicate Members to assign to which lots (follows D-020-C: advisory only; human confirmation required)
- **VCO chain template generation:** Suggest stage compositions based on product category + buyer specs
- **Quality risk scoring:** Flag lots/stages at elevated quality failure risk before inspection

---

## 20. Feature Flags

All three modules are feature-flag gated. Flags must be created in `feature_flags` table before any module is activated per tenant.

### Global Platform Flags

| Flag Key | Default | Description |
|----------|---------|-------------|
| `nc.procurement_pools.enabled` | `false` | Enables Module A: Collective Procurement Pools globally |
| `nc.execution_syndicates.enabled` | `false` | Enables Module B: Order Execution Syndicates globally |
| `nc.vco.enabled` | `false` | Enables Module C: Value Chain Orchestration globally |
| `nc.settlement_waterfall.enabled` | `false` | Enables NC settlement waterfall computation |
| `nc.performance_bonds.enabled` | `false` | Enables performance bond / holdback model |
| `nc.disputes.enabled` | `false` | Enables NC dispute case model |
| `nc.ai_member_matching.enabled` | `false` | Enables AI lot/stage member matching (advisory) |
| `nc.ai_demand_forecasting.enabled` | `false` | Enables AI demand forecasting for pools |

### Tenant-Level Overrides (via `TenantFeatureOverride`)

| Flag Key | Tenant Override | Description |
|----------|----------------|-------------|
| `nc.procurement_pools.enabled` | Per tenant | Allow specific tenants to be Pool Administrators |
| `nc.execution_syndicates.enabled` | Per tenant | Allow specific tenants to be Syndicate Coordinators |
| `nc.vco.enabled` | Per tenant | Allow specific tenants to be VCO Orchestrators |

### Flag Governance Rules
- All NC flags default to `false` at platform level
- A tenant override cannot enable a module that is disabled at platform level
- Feature flag changes for NC modules require `NC_PLATFORM_ADMIN` + MakerChecker approval
- Feature flag state is included in `AuditLog` for all NC flag modifications

---

## 21. Implementation Sequencing

### Phase 0 — Foundation Pre-Work (prerequisite; no new NC code)
| Step | Description | Existing Asset |
|------|-------------|----------------|
| 0-A | Confirm `LifecycleState` supports new entity types `POOL`, `SYNDICATE`, `VCO_CHAIN` | `stateMachine.service.ts` |
| 0-B | Confirm `NetworkLifecycleLog` pattern maps cleanly to existing lifecycle log shape | `TradeLifecycleLog` pattern |
| 0-C | Confirm `invoice.service.ts` can handle `POOL_ORDER` invoice type extension | `invoices` model |
| 0-D | Confirm `makerChecker.service.ts` supports `POOL` / `SYNDICATE` / `VCO_CHAIN` entity types | `makerChecker.service.ts` |
| 0-E | Confirm `escrow.service.ts` can be extended to multi-party (>2 org) context | `escrow.service.ts` |

### Phase 1 — Module A: Collective Procurement Pools (MVP Slice)

| Slice | Scope | Effort |
|-------|-------|--------|
| A-1 | Schema: `network_pools`, `network_pool_memberships` + lifecycle states | S |
| A-2 | Backend: Pool lifecycle state machine (DRAFT → OPEN → AGGREGATING → ALLOCATED) | M |
| A-3 | Backend: Pool membership join + eligibility gate (TTP + cert + sanctions check) | M |
| A-4 | Backend: Pool demand line submission and aggregation | M |
| A-5 | Backend: Pool RFQ → Quote → Acceptance flow | L |
| A-6 | Backend: Pool allocation computation | M |
| A-7 | Backend: Pool order trigger + settlement split computation | L |
| A-8 | Frontend (Tenant): Pool discovery + join surface | M |
| A-9 | Frontend (Tenant): Pool admin management surface | M |
| A-10 | Frontend (Admin): Pool oversight panel (control plane) | S |

### Phase 2 — Module B: Order Execution Syndicates (MVP Slice)

| Slice | Scope | Effort |
|-------|-------|--------|
| B-1 | Schema: `network_syndicates`, `network_syndicate_lots`, `network_syndicate_memberships` | M |
| B-2 | Backend: Syndicate lifecycle state machine | M |
| B-3 | Backend: Lot definition + member bidding/assignment | L |
| B-4 | Backend: Quality gate model (`network_quality_gates`) | M |
| B-5 | Backend: Performance bond + holdback (`network_performance_bonds`) | M |
| B-6 | Backend: Settlement waterfall for syndicates | L |
| B-7 | Frontend (Tenant): Syndicate coordinator surface | L |
| B-8 | Frontend (Tenant): Syndicate member surface (lot acceptance, execution, QC submission) | M |
| B-9 | Frontend (Admin): Syndicate oversight panel | S |

### Phase 3 — Module C: VCO (Post-MVP)

| Slice | Scope | Effort |
|-------|-------|--------|
| C-1 | Schema: `network_vco_chains`, `network_vco_stages` | M |
| C-2 | Backend: VCO chain lifecycle state machine | M |
| C-3 | Backend: Stage assignment + traceability edge linkage | L |
| C-4 | Backend: Incremental DPP build across stages | L |
| C-5 | Backend: VCO quality gate model (reuses `network_quality_gates`) | S |
| C-6 | Backend: VCO settlement waterfall | M |
| C-7 | Frontend (Tenant): VCO orchestrator surface | L |
| C-8 | Frontend (Tenant): Stage executor surface | M |
| C-9 | Frontend (Admin): VCO oversight panel | S |

### Phase 4 — Disputes, Advanced Analytics, AI

| Slice | Scope |
|-------|-------|
| D-1 | `NetworkDisputeCase` schema + lifecycle + admin adjudication |
| D-2 | TTP score signal integration from NC participation |
| D-3 | Commodity price index analytics surface |
| D-4 | AI member-to-lot matching (advisory, D-020-C pattern) |
| D-5 | AI demand forecasting for pools |

---

## 22. MVP Cutline

### Included in MVP (Phase 0 + Phase 1 + Phase 2, Slices B-1 through B-6)

The MVP proves the core Network Commerce value proposition with the following functional scope:

| Capability | Included in MVP |
|-----------|:---:|
| Procurement Pool: Create + manage + aggregate demand | ✅ |
| Procurement Pool: Consolidated RFQ + supplier quote acceptance | ✅ |
| Procurement Pool: Allocation to members + order placement | ✅ |
| Procurement Pool: Settlement split computation | ✅ |
| Syndicate: Create + define lots + assign members | ✅ |
| Syndicate: Lot execution + quality gate (basic) | ✅ |
| Syndicate: Performance bond + holdback model | ✅ |
| Syndicate: Settlement waterfall | ✅ |
| VCO Chain | ❌ (Phase 3) |
| Dispute Model | ❌ (Phase 4) |
| AI Member Matching | ❌ (Phase 4) |
| AI Demand Forecasting | ❌ (Phase 4) |
| TTP Score NC signals | ❌ (Phase 4) |
| Analytics dashboards | ❌ (Phase 4) |

### MVP Success Criteria
1. At least one Pool completes the full lifecycle DRAFT → SETTLED with ≥ 3 members
2. At least one Syndicate completes the full lifecycle FORMING → SETTLED with ≥ 2 lots and ≥ 2 members
3. Settlement waterfall computes correctly (net payable = gross − holdback − penalty)
4. Quality gate model enforces inspection before lot fulfilment confirmation
5. All NC operations emit correct AuditLog records
6. Feature flags correctly gate NC modules per tenant
7. Multi-tenancy: cross-tenant data isolation verified via `pnpm ci:rls-proof` equivalent

---

## 23. Risks & Mitigations

| Risk | Severity | Likelihood | Mitigation |
|------|----------|-----------|------------|
| **Multi-party escrow extension** — current `escrow_accounts` is bilateral; multi-party extension is non-trivial schema work | HIGH | HIGH | Design multi-party escrow as a separate implementation unit (OES-ESCROW-001) before Phase 2 schema work |
| **Settlement waterfall complexity** — pro-rata split logic across N members with holdback + penalties is error-prone | HIGH | MEDIUM | Dedicated settlement unit; property-based testing with known edge cases |
| **RLS leakage across Pool/Syndicate members** — NC entities involve multiple orgs; wrong RLS design could expose cross-tenant data | CRITICAL | LOW | RLS design review at each phase; `pnpm ci:rls-proof` extended to NC entity types |
| **MakerChecker bottleneck** — large syndicates with many lots could create MC approval queues | MEDIUM | MEDIUM | Threshold-based MC gates; async approval notifications |
| **Quality gate waiver abuse** — platform admin can waive gates; audit trail required | HIGH | LOW | Every waiver emits EscalationEvent severity 2; waiver rate dashboarded |
| **Performance bond forfeiture disputes** — member contests forfeiture | MEDIUM | MEDIUM | MakerChecker for all forfeitures; dispute model as exit valve |
| **Lifecycle state machine scope expansion** — adding 3 new entity types to StateMachineService | MEDIUM | MEDIUM | Isolated implementation unit per entity type; existing service is well-structured for extension |
| **VCO TraceabilityEdge complexity** — multi-org traceability graph could violate current single-org TraceabilityEdge model | HIGH | HIGH | VCO design phase must include a dedicated traceability graph access model design (VCO-TRACE-001) |
| **DPP incremental build across orgs** — current DPP is single-org anchored; VCO DPP spans multiple orgs | HIGH | HIGH | Deferred to Phase 3 with dedicated DPP-VCO integration design |
| **Financial partner integration** — settlement triggers require external API; timeline dependent on partner | HIGH | MEDIUM | Phase 2 ships trigger-ready logic with stub; financial partner integration is a separate work stream |
| **MSME onboarding friction** — real MSMEs may not be ready to operate digitally within NC flows | MEDIUM | MEDIUM | Simplified onboarding flow for NC participation; coordinator-led data entry as interim |
| **Feature flag complexity** — 8+ new flags with tenant override semantics | LOW | LOW | Standard `FeatureFlag` + `TenantFeatureOverride` pattern; no new infrastructure |

---

## 24. Next Implementation Packet

### Recommended First Implementation Packet

**Packet ID (proposed):** `TEXQTIC-NC-PHASE0-FOUNDATION-001`
**Scope:** Phase 0 pre-work validation only (no new NC entities)

**Tasks:**
1. Verify `LifecycleState` entity type extension mechanism supports `POOL`, `SYNDICATE`, `VCO_CHAIN` without schema migration (likely only new data rows, not schema changes)
2. Verify `stateMachine.service.ts` can accept new entity types via configuration
3. Verify `makerChecker.service.ts` entity type handling
4. Identify exact schema delta required for `invoice` type extension
5. Confirm `escrow.service.ts` extension strategy for multi-party context
6. Create NC feature flags in `feature_flags` table (data migration, not schema change)
7. Define exact allowlist for Phase 1, Slice A-1

**Before opening this packet:**
- Re-read this design document for current relevance
- Run `git status --short` to confirm clean working tree
- Read `server/prisma/schema.prisma` fresh to detect any changes since this design was authored
- Read `governance/control/OPEN-SET.md` and `governance/control/NEXT-ACTION.md` for sequencing authority
- Confirm no conflicting units are currently in-progress

### Sequencing Advisory

This packet should be sequenced AFTER:
- Current in-flight units (check `governance/control/OPEN-SET.md` at implementation time)
- Any remaining Wave 2/3 stabilization units
- Any existing trade/escrow/settlement units that may affect the services NC will extend

---

## 25. Verification Performed

### Repo Inspection Performed
- ✅ `server/prisma/schema.prisma` — reviewed in full (all models)
- ✅ `server/src/services/` — inventory completed; 35+ service files reviewed
- ✅ `server/src/routes/tenant/` — all tenant routes reviewed
- ✅ `server/src/routes/control/` — all control routes reviewed
- ✅ `components/Tenant/` — all tenant components reviewed
- ✅ `components/ControlPlane/` — all admin components reviewed
- ✅ `docs/north-star/TEXQTIC_PRODUCT_NORTH_STAR.md` — product positioning reviewed
- ✅ `docs/product-truth/` — family design inventory reviewed
- ✅ `governance/control/` — active execution layer reviewed
- ✅ `governance/units/` — unit registry reviewed
- ✅ Memory `/memories/repo/texqtic.md` — repo truth loaded

### Completion Checklist
- [x] No implementation code changed
- [x] No schema changed
- [x] No migrations added
- [x] No package/dependency changes
- [x] Repo-truth surfaces inspected
- [x] Product boundaries defined
- [x] MVP cutline defined
- [x] Risks listed
- [x] Next packet recommended
- [x] This packet does not authorize implementation
- [x] Later implementation requires fresh repo-truth validation at implementation opening

---

*Document created: 2026-05-06 — TexQtic governance corpus, main branch.*
*Authorized for: Design reference and implementation planning only.*
*Implementation gate: Separate implementation packet required with fresh repo-truth validation.*
