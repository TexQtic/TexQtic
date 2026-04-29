# TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — Multi-Segment QA Tenant Seed Matrix

> **⚠️ DESIGN ONLY — NO SEEDING AUTHORIZED**
>
> This artifact is a planning and design document. No production data has been mutated.
> No psql writes have been executed. No seed scripts have been run. No schema or migration
> changes have been made. All fixture injection is explicitly blocked until Paresh authorizes
> the follow-on Slice B (staging seed) and/or Slice D (production QA seed).

**Unit ID:** TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001  
**Mode:** DESIGN ONLY  
**Status:** `DESIGN_COMPLETE — SEEDING_NOT_AUTHORIZED`  
**Design date:** 2026-04-29  
**Author:** GitHub Copilot (TECS SAFE-WRITE Mode — Design / Reporting Only)  
**Source report:** `docs/TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001-REPORT.md` (commit `a227586`)  
**Prerequisite unit:** `TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001` — `NOT_READY_FOR_APPROVAL_GATE_QA`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Why This Matrix Is Required](#2-why-this-matrix-is-required)
3. [Textile Value Chain Taxonomy](#3-textile-value-chain-taxonomy)
4. [Minimum Viable Tenant Matrix (MVP)](#4-minimum-viable-tenant-matrix-mvp)
5. [Expanded Tenant Matrix](#5-expanded-tenant-matrix)
6. [Relationship State Matrix](#6-relationship-state-matrix)
7. [Catalogue Item Fixture Matrix](#7-catalogue-item-fixture-matrix)
8. [Price Disclosure Matrix](#8-price-disclosure-matrix)
9. [RFQ Scenario Matrix](#9-rfq-scenario-matrix)
10. [Approval-Gate QA Requirements](#10-approval-gate-qa-requirements)
11. [Service-Provider Fixture Matrix](#11-service-provider-fixture-matrix)
12. [DPP / Compliance Fixture Matrix](#12-dpp--compliance-fixture-matrix)
13. [AI Supplier Matching Fixture Matrix](#13-ai-supplier-matching-fixture-matrix)
14. [Data Hygiene Checklist](#14-data-hygiene-checklist)
15. [Seeding Strategy Comparison](#15-seeding-strategy-comparison)
16. [Naming Conventions](#16-naming-conventions)
17. [Rollback / Cleanup Plan](#17-rollback--cleanup-plan)
18. [Security / Privacy Requirements](#18-security--privacy-requirements)
19. [Runtime Verification Gates](#19-runtime-verification-gates)
20. [Governance Requirements](#20-governance-requirements)
21. [Recommended Execution Sequence (Slices A–H)](#21-recommended-execution-sequence-slices-ah)
22. [Open Questions / Risks](#22-open-questions--risks)

---

## 1. Executive Summary

The `TECS-MULTI-TENANT-QA-FIXTURE-MATRIX-001` readiness report (commit `a227586`) concluded
that approval-gate QA cannot proceed because:

- 0 of 14 `qa-b2b` catalogue items have `APPROVED_BUYER_ONLY` visibility
- 0 of 14 items have `RELATIONSHIP_ONLY` price disclosure
- No `BuyerSupplierRelationship` rows exist in any non-NONE state
- No multi-state QA coverage is possible with a single buyer/supplier pair

Rather than performing a minimal psql fixture injection that patches only the current
supplier/buyer pair, this design artifact defines a **launch-grade QA tenant seed matrix**
covering the full TexQtic textile value chain: fibre → yarn → fabric → processing →
garment → buyer/trader → service provider → aggregator.

This matrix will serve as the foundation for all remaining launch-grade verification:
approval-gate QA, catalogue gating, price disclosure, RFQ lifecycle, DPP/compliance,
AI supplier matching, and data hygiene audits.

**Design scope summary:**
- 20 tenants minimum viable (MVP) / 40+ tenants expanded
- 9 relationship state tuples (MVP) / 20+ tuples expanded
- 10 catalogue item fixture types per supplier
- 9 price disclosure states
- 14 RFQ scenarios
- 12 approval-gate test paths
- 5 service-provider fixture types
- 5 DPP/compliance fixture types
- 7 AI supplier matching fixture types
- 25+ data hygiene checks

---

## 2. Why This Matrix Is Required

### 2.1 Current fixture gaps

| Gap | Impact |
|-----|--------|
| No `APPROVED_BUYER_ONLY` catalogue items | Approval gate is unreachable |
| No `RELATIONSHIP_ONLY` price items | Price gate is unreachable |
| No relationship records | APPROVED/REQUESTED/BLOCKED paths cannot be tested |
| Single buyer/supplier pair | Cannot test multi-state in parallel |
| No other supplier orgs | Cannot test cross-supplier access isolation |
| No service-provider tenants | Service-provider discoverability untestable |
| No processing-house tenants | Dyeing/finishing chain untestable |
| No garment-manufacturer tenant with DPP | DPP cross-tenant flow untestable |

### 2.2 What a minimal psql injection cannot solve

A minimal psql injection (updating 2 `qa-b2b` items + inserting 1 relationship row)
would enable:
- ✅ Single-path approval gate smoke test (APPROVED state)
- ❌ Multi-state coverage (only 1 row per buyer/supplier pair due to unique constraint)
- ❌ Cross-supplier isolation test (only 1 supplier exists)
- ❌ Textile chain integration flows
- ❌ Service-provider scenarios
- ❌ DPP cross-tenant flows

The multi-segment matrix resolves all gaps with a purpose-designed fixture set.

### 2.3 Service-layer contract reference

Types confirmed from `server/src/services/relationshipAccess.types.ts`:

| Domain type | Values |
|-------------|--------|
| `RelationshipState` | `NONE \| REQUESTED \| APPROVED \| REJECTED \| BLOCKED \| SUSPENDED \| EXPIRED \| REVOKED` |
| `CatalogVisibilityPolicy` | `PUBLIC \| AUTHENTICATED_ONLY \| APPROVED_BUYER_ONLY \| HIDDEN \| REGION_CHANNEL_SENSITIVE` |
| `RelationshipPricePolicy` | `VISIBLE \| RELATIONSHIP_ONLY \| HIDDEN` |
| `RfqAcceptanceMode` | `OPEN_TO_ALL \| APPROVED_BUYERS_ONLY` |

DB column values (`catalog_items.publication_posture` as VARCHAR):
- `PRIVATE_OR_AUTH_ONLY` → maps to `AUTHENTICATED_ONLY`
- `B2B_PUBLIC` → maps to `PUBLIC`
- `APPROVED_BUYER_ONLY` → maps to `APPROVED_BUYER_ONLY`
- `HIDDEN` → maps to `HIDDEN`

---

## 3. Textile Value Chain Taxonomy

The TexQtic platform covers the following value chain segments. Each segment maps to
one or more `rolePosition` keys and `primarySegment` keys in the taxonomy system.

### 3.1 Upstream (raw material / fibre)

| Segment key | Description | Typical role position |
|-------------|-------------|----------------------|
| `CottonFibre` | Raw cotton lint / combed/carded sliver | `farmer`, `trader` |
| `SyntheticFibre` | Polyester, nylon, recycled PET, acrylic staple | `manufacturer`, `trader` |
| `CellulosicFibre` | Viscose, modal, lyocell, bamboo fibre | `manufacturer`, `trader` |
| `SpecialtyFibre` | Silk, wool, cashmere, linen, hemp | `farmer`, `trader`, `manufacturer` |

### 3.2 Yarn

| Segment key | Description | Typical role position |
|-------------|-------------|----------------------|
| `SpinningMill` | Ring-spun, OE, air-jet cotton/blended yarn | `manufacturer` |
| `DyedYarn` | Package-dyed, stock-dyed yarn supplier | `manufacturer` |
| `SpecialtyYarn` | Fancy yarn, melange, core-spun, slub | `manufacturer` |
| `SyntheticYarn` | Textured polyester, nylon, covered elastic | `manufacturer` |

### 3.3 Fabric manufacturing

| Segment key | Description | Typical role position |
|-------------|-------------|----------------------|
| `Weaving` | Grey/finished woven fabric | `manufacturer` |
| `Knitting` | Single jersey, interlock, rib, warp-knit | `manufacturer` |
| `Denim` | Indigo/sulphur denim fabric | `manufacturer` |
| `Nonwoven` | Spunbond, needle-punch, thermal-bond | `manufacturer` |
| `HomeTex` | Terry, woven dobby, jacquard home fabrics | `manufacturer` |
| `TechnicalTex` | Coated, laminated, filtration, automotive | `manufacturer` |

### 3.4 Processing

| Segment key | Description | Typical role position |
|-------------|-------------|----------------------|
| `DyeingHouse` | Fabric dyeing, piece-dyeing, yarn-dyeing | `manufacturer`, `processor` |
| `PrintingHouse` | Rotary print, digital print, pigment print | `manufacturer`, `processor` |
| `FinishingUnit` | Sanforising, calendering, coating | `processor` |
| `WashingUnit` | Garment washing, enzyme-stone wash | `processor` |

### 3.5 Garment / finished goods

| Segment key | Description | Typical role position |
|-------------|-------------|----------------------|
| `GarmentManufacturer` | CMT/FOB cut-and-sew production | `manufacturer`, `exporter` |
| `HomeTextileManufacturer` | Bedding, towel, curtain manufacturing | `manufacturer`, `exporter` |
| `TechnicalGarment` | Workwear, PPE, medical garment | `manufacturer` |
| `ApparelExporter` | Finished apparel export-oriented unit | `exporter` |

### 3.6 Buyers / traders / brands

| Segment key | Description | Typical role position |
|-------------|-------------|----------------------|
| `DomesticTrader` | Domestic B2B fabric/yarn trader | `trader` |
| `ExportBuyer` | Export-oriented buyer / buying office | `buyer`, `trader` |
| `BrandBuyer` | Apparel/home brand with sourcing needs | `buyer` |
| `InstitutionalBuyer` | Hospitality/industrial procurement buyer | `buyer` |
| `BuyingHouse` | Sourcing agent / buying house | `trader`, `buyer` |

### 3.7 Service providers

| Segment key | Description | Typical role position |
|-------------|-------------|----------------------|
| `TestingLab` | NABL/accredited testing and certification lab | `service_provider` |
| `ComplianceAgency` | Certification, audit, social compliance | `service_provider` |
| `LogisticsProvider` | Freight, customs, 3PL | `service_provider` |
| `FashionDesigner` | Pattern/design studio | `service_provider` |
| `FabricDesigner` | Print/surface design studio | `service_provider` |
| `Consultant` | Advisory, sourcing, trade consultant | `service_provider` |
| `MachinerySupplier` | Textile machinery and spares | `service_provider`, `manufacturer` |
| `PackagingSupplier` | Garment/textile packaging | `service_provider`, `manufacturer` |

### 3.8 Aggregator

| Role | Description |
|------|-------------|
| `AGGREGATOR` | Platform-level matching and marketplace tenant type |

---

## 4. Minimum Viable Tenant Matrix (MVP)

The MVP matrix contains the minimum tenants required for credible approval-gate,
catalogue gating, RFQ lifecycle, and cross-supplier isolation verification.

### 4.1 MVP tenant register

| Key | Slug | Email | Type | Segment | Role Position | Publication Posture | Eligibility | QA Role |
|-----|------|-------|------|---------|---------------|--------------------|-----------| --------|
| `QA_WVG_A` | `qa-supplier-weaving-a` | `qa.supplier.weaving.a@texqtic.com` | B2B | Weaving | manufacturer | B2B_PUBLIC | PUBLICATION_ELIGIBLE | Supplier A — primary approval-gate supplier |
| `QA_KNT_B` | `qa-supplier-knitting-b` | `qa.supplier.knitting.b@texqtic.com` | B2B | Knitting | manufacturer | B2B_PUBLIC | PUBLICATION_ELIGIBLE | Supplier B — cross-supplier isolation check |
| `QA_DYE_C` | `qa-processor-dyeing-c` | `qa.processor.dyeing.c@texqtic.com` | B2B | DyeingHouse | processor | B2B_PUBLIC | PUBLICATION_ELIGIBLE | Supplier C — processing-house supplier |
| `QA_GMT_D` | `qa-supplier-garment-d` | `qa.supplier.garment.d@texqtic.com` | B2B | GarmentManufacturer | manufacturer | B2B_PUBLIC | PUBLICATION_ELIGIBLE | Supplier D — garment supplier with DPP fixtures |
| `QA_BUYER_A` | `qa-buyer-brand-a` | `qa.buyer.brand.a@texqtic.com` | B2B | BrandBuyer | buyer | N/A | NOT_ELIGIBLE | Buyer A — approved buyer (positive-path) |
| `QA_BUYER_B` | `qa-buyer-trader-b` | `qa.buyer.trader.b@texqtic.com` | B2B | DomesticTrader | trader | N/A | NOT_ELIGIBLE | Buyer B — unapproved/NONE buyer (negative-path) |
| `QA_BUYER_C` | `qa-buyer-export-c` | `qa.buyer.export.c@texqtic.com` | B2B | ExportBuyer | buyer | N/A | NOT_ELIGIBLE | Buyer C — blocked/rejected buyer (denial-path) |
| `QA_SVC_TST_A` | `qa-service-testing-a` | `qa.service.testing.a@texqtic.com` | B2B | TestingLab | service_provider | B2B_PUBLIC | PUBLICATION_ELIGIBLE | Service Provider A — testing/certification |
| `QA_SVC_LOG_B` | `qa-service-logistics-b` | `qa.service.logistics.b@texqtic.com` | B2B | LogisticsProvider | service_provider | B2B_PUBLIC | PUBLICATION_ELIGIBLE | Service Provider B — logistics |
| `QA_AGG_A` | `qa-aggregator-a` | `qa.aggregator.a@texqtic.com` | AGGREGATOR | — | — | N/A | N/A | Aggregator QA tenant |

**Existing tenants (reused from current fixture set):**

| Key | Slug | Email | Status | Reuse note |
|-----|------|-------|--------|------------|
| `QA_B2B` | `qa-b2b` | `qa.b2b@texqtic.com` | ACTIVE | Existing supplier; may be repurposed as Weaving mill or used as baseline |
| `QA_BUYER` | `qa-buyer` | `qa.buyer@texqtic.com` | ACTIVE | Existing buyer; maps to Buyer B (NONE state) |
| `QA_AGG` | `qa-agg` | `qa.agg@texqtic.com` | ACTIVE | Existing aggregator; reused as QA_AGG_A |

**Recommendation:** Extend existing `qa-b2b` catalogue with gated items rather than
creating a parallel `qa-supplier-weaving-a` tenant, to avoid org proliferation. New
tenants for Supplier B (Knitting), Supplier C (Dyeing), Supplier D (Garment), Buyer A
(Approved), and Buyer C (Blocked) are the minimum required net-new additions.

### 4.2 MVP org capability matrix

| Tenant | Can publish catalogue | Can browse suppliers | Can submit RFQ | Can receive RFQ | Auth session required |
|--------|-----------------------|---------------------|---------------|-----------------|----------------------|
| `QA_WVG_A` / `qa-b2b` | ✅ | ✅ | ❌ (supplier) | ✅ | ✅ |
| `QA_KNT_B` | ✅ | ✅ | ❌ (supplier) | ✅ | ✅ |
| `QA_DYE_C` | ✅ | ✅ | ❌ (supplier) | ✅ | ✅ |
| `QA_GMT_D` | ✅ | ✅ | ❌ (supplier) | ✅ | ✅ |
| `QA_BUYER_A` | ❌ | ✅ | ✅ | ❌ | ✅ (Playwright-verifiable) |
| `QA_BUYER_B` / `qa-buyer` | ❌ | ✅ | ✅ | ❌ | ✅ (Playwright-verifiable) |
| `QA_BUYER_C` | ❌ | ✅ | ❌ (blocked) | ❌ | ✅ |
| `QA_SVC_TST_A` | ✅ (service listing) | ✅ | ❌ | ✅ (service req.) | ✅ |
| `QA_SVC_LOG_B` | ✅ (service listing) | ✅ | ❌ | ✅ (service req.) | ✅ |
| `QA_AGG_A` | N/A | ✅ | N/A | N/A | ✅ |

---

## 5. Expanded Tenant Matrix

The expanded matrix adds coverage for the full textile value chain. Tenants beyond the
MVP are lower-priority and should be seeded after MVP validation succeeds.

### 5.1 Expanded supplier tenants

| Key | Slug | Email | Segment | Role | Priority |
|-----|------|-------|---------|------|---------|
| `QA_CTN_FIBRE` | `qa-supplier-cotton-fibre` | `qa.supplier.cotton.fibre@texqtic.com` | CottonFibre | trader | Low |
| `QA_POLY_FIBRE` | `qa-supplier-poly-fibre` | `qa.supplier.poly.fibre@texqtic.com` | SyntheticFibre | manufacturer | Low |
| `QA_SPIN_A` | `qa-supplier-spinning-a` | `qa.supplier.spinning.a@texqtic.com` | SpinningMill | manufacturer | Medium |
| `QA_DYED_YARN` | `qa-supplier-dyed-yarn` | `qa.supplier.dyed.yarn@texqtic.com` | DyedYarn | manufacturer | Low |
| `QA_DENIM_A` | `qa-supplier-denim-a` | `qa.supplier.denim.a@texqtic.com` | Denim | manufacturer | Medium |
| `QA_HOMETEX` | `qa-supplier-hometex` | `qa.supplier.hometex@texqtic.com` | HomeTex | manufacturer | Low |
| `QA_NONWOVEN` | `qa-supplier-nonwoven` | `qa.supplier.nonwoven@texqtic.com` | Nonwoven | manufacturer | Low |
| `QA_PRINT_A` | `qa-processor-printing-a` | `qa.processor.printing.a@texqtic.com` | PrintingHouse | processor | Medium |
| `QA_FINISH_A` | `qa-processor-finishing-a` | `qa.processor.finishing.a@texqtic.com` | FinishingUnit | processor | Low |
| `QA_WASH_A` | `qa-processor-washing-a` | `qa.processor.washing.a@texqtic.com` | WashingUnit | processor | Low |

### 5.2 Expanded buyer tenants

| Key | Slug | Email | Segment | Role | Priority |
|-----|------|-------|---------|------|---------|
| `QA_BUYER_D` | `qa-buyer-institutional-d` | `qa.buyer.institutional.d@texqtic.com` | InstitutionalBuyer | buyer | Medium |
| `QA_BUYER_E` | `qa-buyer-sourcing-e` | `qa.buyer.sourcing.e@texqtic.com` | BuyingHouse | trader | Low |

### 5.3 Expanded service-provider tenants

| Key | Slug | Email | Segment | Priority |
|-----|------|-------|---------|---------|
| `QA_SVC_COMP` | `qa-service-compliance` | `qa.service.compliance@texqtic.com` | ComplianceAgency | High (DPP) |
| `QA_SVC_DESIGN` | `qa-service-designer` | `qa.service.designer@texqtic.com` | FashionDesigner | Low |
| `QA_SVC_PKG` | `qa-service-packaging` | `qa.service.packaging@texqtic.com` | PackagingSupplier | Low |

---

## 6. Relationship State Matrix

### 6.1 MVP relationship tuples

Each row defines a required `BuyerSupplierRelationship` record (or absence of one).

| Tuple ID | Supplier | Buyer | State | `requestedAt` | `approvedAt`/`decidedAt` | `expiresAt` | Expected catalog visibility | Expected price visibility | Expected RFQ eligibility |
|---------|---------|-------|-------|--------------|--------------------------|------------|----------------------------|--------------------------|--------------------------|
| `QA_REL_01` | `QA_WVG_A` (`qa-b2b`) | `QA_BUYER_A` | `APPROVED` | NOW-30d | NOW-28d | — | APPROVED_BUYER_ONLY items VISIBLE | RELATIONSHIP_ONLY price VISIBLE | APPROVED_BUYERS_ONLY RFQ ALLOWED |
| `QA_REL_02` | `QA_WVG_A` (`qa-b2b`) | `QA_BUYER_B` (`qa-buyer`) | `NONE` (no row) | — | — | — | APPROVED_BUYER_ONLY items HIDDEN | RELATIONSHIP_ONLY price HIDDEN | APPROVED_BUYERS_ONLY RFQ DENIED |
| `QA_REL_03` | `QA_WVG_A` (`qa-b2b`) | `QA_BUYER_C` | `BLOCKED` | NOW-60d | NOW-59d | — | APPROVED_BUYER_ONLY items HIDDEN | RELATIONSHIP_ONLY price HIDDEN | All RFQ DENIED |
| `QA_REL_04` | `QA_KNT_B` | `QA_BUYER_A` | `NONE` (no row) | — | — | — | APPROVED_BUYER_ONLY items HIDDEN | RELATIONSHIP_ONLY price HIDDEN | APPROVED_BUYERS_ONLY RFQ DENIED |
| `QA_REL_05` | `QA_DYE_C` | `QA_BUYER_A` | `REQUESTED` | NOW-5d | — | — | APPROVED_BUYER_ONLY items HIDDEN (pending) | RELATIONSHIP_ONLY price HIDDEN | APPROVED_BUYERS_ONLY RFQ DENIED |
| `QA_REL_06` | `QA_GMT_D` | `QA_BUYER_A` | `APPROVED` | NOW-20d | NOW-18d | — | APPROVED_BUYER_ONLY items VISIBLE | RELATIONSHIP_ONLY price VISIBLE | APPROVED_BUYERS_ONLY RFQ ALLOWED |
| `QA_REL_07` | `QA_WVG_A` (`qa-b2b`) | `QA_BUYER_C` | `REJECTED` | NOW-45d | NOW-44d | — | APPROVED_BUYER_ONLY items HIDDEN | RELATIONSHIP_ONLY price HIDDEN | All RFQ DENIED |
| `QA_REL_08` (opt.) | `QA_KNT_B` | `QA_BUYER_A` | `EXPIRED` | NOW-60d | NOW-58d | NOW-2d | APPROVED_BUYER_ONLY items HIDDEN (expired) | RELATIONSHIP_ONLY price HIDDEN | APPROVED_BUYERS_ONLY RFQ DENIED |
| `QA_REL_09` (opt.) | `QA_GMT_D` | `QA_BUYER_B` | `REVOKED` | NOW-30d | NOW-28d | — | APPROVED_BUYER_ONLY items HIDDEN (revoked) | RELATIONSHIP_ONLY price HIDDEN | All RFQ DENIED |

**Note on unique constraint:** `buyer_supplier_relationships.(supplierOrgId, buyerOrgId)` is
UNIQUE. Tuples QA_REL_03 and QA_REL_07 share the same buyer-supplier pair
(`QA_BUYER_C` ↔ `QA_WVG_A`). Only ONE row can exist at a time. At implementation time,
choose the higher-priority state first (BLOCKED recommended; REJECTED is lower risk
for Buyer C) or use separate buyers for each state.

**Resolution:** Use `QA_BUYER_C` for `BLOCKED`, `QA_BUYER_D` (expanded matrix) for
`REJECTED` state. This avoids the unique constraint collision.

### 6.2 Expected denial reason codes per tuple

| Tuple | Buyer state | `DenialReason` (internal) | Client-safe response |
|-------|------------|--------------------------|---------------------|
| QA_REL_01 | APPROVED | `NONE` | Access granted |
| QA_REL_02 | NONE | `RELATIONSHIP_REQUIRED` | `ACCESS_RESTRICTED` |
| QA_REL_03 | BLOCKED | `RELATIONSHIP_BLOCKED` | `ACCESS_RESTRICTED` |
| QA_REL_04 | NONE | `RELATIONSHIP_REQUIRED` | `ACCESS_RESTRICTED` |
| QA_REL_05 | REQUESTED | `RELATIONSHIP_PENDING` | `ACCESS_RESTRICTED` |
| QA_REL_06 | APPROVED | `NONE` | Access granted |
| QA_REL_07 | REJECTED | `RELATIONSHIP_REJECTED` | `ACCESS_RESTRICTED` |
| QA_REL_08 | EXPIRED | `RELATIONSHIP_EXPIRED` | `ACCESS_RESTRICTED` |
| QA_REL_09 | REVOKED | `RELATIONSHIP_REVOKED` | `ACCESS_RESTRICTED` |

### 6.3 Cross-supplier access isolation matrix

This matrix verifies that approval by one supplier does NOT grant access to another
supplier's gated catalogue.

| Buyer | Supplier A (`qa-b2b`) state | Supplier B (`qa-knt-b`) state | Isolation holds? |
|-------|---------------------------|------------------------------|-----------------|
| `QA_BUYER_A` | APPROVED | NONE | ✅ Buyer A must NOT see Supplier B APPROVED_BUYER_ONLY items |
| `QA_BUYER_A` | APPROVED | EXPIRED | ✅ Buyer A must NOT see Supplier B APPROVED_BUYER_ONLY items |
| `QA_BUYER_B` | NONE | NONE | ✅ Buyer B must NOT see either supplier's gated items |

---

## 7. Catalogue Item Fixture Matrix

Each supplier requires a set of catalogue items covering all visibility and price disclosure
policy types. The following defines the required item fixture types.

### 7.1 Item policy types required per supplier

| Type | `publicationPosture` | `priceDisclosurePolicyMode` | `rfqAcceptanceMode` | Purpose |
|------|---------------------|--------------------------|--------------------|---------
| `PUB` | `B2B_PUBLIC` | `null` | `OPEN_TO_ALL` | Public control item — all authenticated buyers |
| `AUTH` | `PRIVATE_OR_AUTH_ONLY` | `null` | `OPEN_TO_ALL` | Auth-only visibility |
| `APPROVED` | `APPROVED_BUYER_ONLY` | `null` | `APPROVED_BUYERS_ONLY` | Relationship-gated visibility |
| `HIDDEN` | `HIDDEN` | `null` | `OPEN_TO_ALL` | Supplier-private; no buyer access |
| `RFQPRICE` | `B2B_PUBLIC` | `null` | `OPEN_TO_ALL` | RFQ-only price (price hidden, RFQ visible) |
| `PRICEREQ` | `PRIVATE_OR_AUTH_ONLY` | `HIDDEN` | `OPEN_TO_ALL` | Price-on-request (price hidden, contact supplier) |
| `RELPRICE` | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | `APPROVED_BUYERS_ONLY` | Full relationship gate: visibility + price + RFQ |
| `DPP_PUB` | `B2B_PUBLIC` | `null` | `OPEN_TO_ALL` | Published DPP item — public passport available |
| `DPP_UNPUB` | `PRIVATE_OR_AUTH_ONLY` | `null` | `OPEN_TO_ALL` | DPP item with unpublished/draft passport |
| `MOQ` | `B2B_PUBLIC` | `null` | `OPEN_TO_ALL` | MOQ/quantity-differentiated item |

### 7.2 Supplier A (`qa-b2b`) item matrix — MVP patches required

**Existing items (14 total as of 2026-04-29):**

| Action | Item | Current `publicationPosture` | Current `priceDisclosurePolicyMode` | Required change |
|--------|------|------------------------------|------------------------------------|-----------------
| PATCH | Organic Cotton Poplin (`9effba8b`) | `B2B_PUBLIC` | `null` | → `APPROVED_BUYER_ONLY` (APPROVED item) |
| PATCH | Combed Cotton Twill (`5a2b41a2`) | `B2B_PUBLIC` | `RELATIONSHIP_ONLY` | → `priceDisclosurePolicyMode: RELATIONSHIP_ONLY` + `publicationPosture: APPROVED_BUYER_ONLY` (RELPRICE item) |
| PATCH | Stretch Cotton Sateen (`e1526ebe`) | `B2B_PUBLIC` | `null` | Retain as public control item (no change) |
| PATCH | Any 1 of 11 PRIVATE_OR_AUTH_ONLY | `PRIVATE_OR_AUTH_ONLY` | `null` | → `HIDDEN` (HIDDEN item type) |
| PATCH | Any 1 of 11 PRIVATE_OR_AUTH_ONLY | `PRIVATE_OR_AUTH_ONLY` | `HIDDEN` | → add `priceDisclosurePolicyMode: HIDDEN` (PRICEREQ type) |

**Net new items to seed for Supplier A (if broader coverage needed):**
- `QA-WVG-A-RFQPRICE-001` — RFQ-only price item
- `QA-WVG-A-DPP-PUB-001` — Published DPP item
- `QA-WVG-A-MOQ-001` — MOQ item

### 7.3 Supplier B (`qa-knt-b`) item matrix — net new

| SKU | Name | `publicationPosture` | `priceDisclosurePolicyMode` | `rfqAcceptanceMode` | Type |
|-----|------|---------------------|--------------------------|--------------------|----|
| `QA-KNT-B-PUB-001` | QA Knit Single Jersey Public | `B2B_PUBLIC` | `null` | `OPEN_TO_ALL` | PUB |
| `QA-KNT-B-AUTH-001` | QA Knit Interlock Auth | `PRIVATE_OR_AUTH_ONLY` | `null` | `OPEN_TO_ALL` | AUTH |
| `QA-KNT-B-APPROVED-001` | QA Knit Rib Approved Only | `APPROVED_BUYER_ONLY` | `null` | `APPROVED_BUYERS_ONLY` | APPROVED |
| `QA-KNT-B-RELPRICE-001` | QA Knit Warp Relationship Price | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | `APPROVED_BUYERS_ONLY` | RELPRICE |
| `QA-KNT-B-HIDDEN-001` | QA Knit Hidden Sample | `HIDDEN` | `null` | `OPEN_TO_ALL` | HIDDEN |

### 7.4 Supplier C (`qa-dye-c`) item matrix — net new

| SKU | Name | `publicationPosture` | Type |
|-----|------|---------------------|------|
| `QA-DYE-C-PUB-001` | QA Dyeing Service Public | `B2B_PUBLIC` | PUB |
| `QA-DYE-C-APPROVED-001` | QA Dyeing Premium Processing | `APPROVED_BUYER_ONLY` | APPROVED |
| `QA-DYE-C-AUTH-001` | QA Dyeing Print Service Auth | `PRIVATE_OR_AUTH_ONLY` | AUTH |

### 7.5 Supplier D (`qa-gmt-d`) item matrix — net new (with DPP)

| SKU | Name | `publicationPosture` | `priceDisclosurePolicyMode` | Type | DPP |
|-----|------|---------------------|--------------------------|------|-----|
| `QA-GMT-D-PUB-001` | QA Garment Cotton T-Shirt Public | `B2B_PUBLIC` | `null` | PUB | No |
| `QA-GMT-D-APPROVED-001` | QA Garment Denim Jacket Approved | `APPROVED_BUYER_ONLY` | `null` | APPROVED | No |
| `QA-GMT-D-RFQGATE-001` | QA Garment RFQ Gate Item | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | RELPRICE | No |
| `QA-GMT-D-DPP-PUB-001` | QA Garment DPP Published | `B2B_PUBLIC` | `null` | DPP_PUB | Published DPP |
| `QA-GMT-D-DPP-UNPUB-001` | QA Garment DPP Draft | `PRIVATE_OR_AUTH_ONLY` | `null` | DPP_UNPUB | Draft DPP |

### 7.6 Expected buyer-visible vs supplier-visible behavior per item type

| Type | Supplier sees | Approved buyer sees | NONE buyer sees | Hidden item — any buyer |
|------|--------------|--------------------|-----------------|-----------------------|
| PUB | Full detail + price | Full detail + price | Full detail + price | — |
| AUTH | Full detail + price | Full detail + price | Requires login | — |
| APPROVED | Full detail + price | Full detail + price | Item hidden / 404 | — |
| HIDDEN | Full detail | Not visible | Not visible | Not visible |
| RELPRICE | Full detail + price | Full detail + price | Item hidden / price hidden | — |
| DPP_PUB | Full detail + DPP link | Full detail + DPP link | Full detail + DPP link | — |

---

## 8. Price Disclosure Matrix

This matrix defines expected API and DOM behavior for each price disclosure state.

| State | Posture combination | Supplier | `publicationPosture` | `priceDisclosurePolicyMode` | Relationship state | Expected PDP result | API: price field | DOM: price element |
|-------|--------------------|---------|-----------------------|---------------------------|-------------------|--------------------|-----------------|--------------------|
| PUBLIC_VISIBLE | Public item | QA_WVG_A | `B2B_PUBLIC` | `null` | Any | Price shown | Present | Visible |
| AUTH_VISIBLE | Auth item | QA_WVG_A | `PRIVATE_OR_AUTH_ONLY` | `null` | Authenticated | Price shown | Present | Visible |
| ELIGIBILITY_REQUIRED | Approved item | QA_WVG_A | `APPROVED_BUYER_ONLY` | `null` | NONE | Item not visible | Absent | Not rendered |
| ELIGIBLE_VISIBLE | Approved item | QA_WVG_A | `APPROVED_BUYER_ONLY` | `null` | APPROVED | Price shown | Present | Visible |
| RFQ_ONLY | RFQ price item | QA_WVG_A | `B2B_PUBLIC` | `null` (RFQ intent) | Any | Price hidden, RFQ available | Absent | RFQ button only |
| PRICE_ON_REQUEST | Auth + hidden price | QA_WVG_A | `PRIVATE_OR_AUTH_ONLY` | `HIDDEN` | Authenticated | Price hidden, contact shown | Absent | Contact/request only |
| RELATIONSHIP_ONLY | Approved + rel-price | QA_KNT_B | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | NONE | Item not visible | Absent | Not rendered |
| RELATIONSHIP_ONLY | Approved + rel-price | QA_KNT_B | `APPROVED_BUYER_ONLY` | `RELATIONSHIP_ONLY` | APPROVED | Price shown | Present | Visible |
| HIDDEN | Supplier-private item | QA_WVG_A | `HIDDEN` | `null` | Any (buyer) | Item not visible | Absent | Not rendered |
| LOGIN_REQUIRED | Auth item, unauthenticated | QA_WVG_A | `PRIVATE_OR_AUTH_ONLY` | `null` | Unauthenticated | Login required | Absent | Login gate |

**API payload forbidden fields (NEVER present in response to buyer):**
- `internalReason` / `denialReason`
- `allowlistDetails`
- `riskMetadata`
- Raw `priceDisclosurePolicyMode` value for hidden-price items
- Supplier `orgId` or `tenantId` for hidden items (must not be guessable via count/list)

**DOM forbidden elements:**
- Price value when `priceDisclosurePolicyMode: HIDDEN` or item is `HIDDEN`
- Hidden item name/count in any buyer-facing list or search
- AI confidence, score, or rank values
- Internal relationship state label (client-safe label only)

---

## 9. RFQ Scenario Matrix

### 9.1 RFQ test scenarios

| Scenario ID | Buyer | Supplier | Item(s) | Relationship state | Expected behavior | Key assertions |
|------------|-------|---------|---------|-------------------|-----------------|---------------|
| `QA_RFQ_01` | QA_BUYER_A | QA_WVG_A | PUB item (single) | APPROVED | RFQ created, visible to supplier only | status=DRAFT then SUBMITTED; supplier sees RFQ in inbox |
| `QA_RFQ_02` | QA_BUYER_A | QA_WVG_A | AUTH + APPROVED items (multi) | APPROVED | Multi-item RFQ, same supplier | Line items scoped to supplierOrgId |
| `QA_RFQ_03` | QA_BUYER_A | QA_WVG_A + QA_KNT_B | PUB items from each | APPROVED + NONE | Multi-supplier RFQ | Each supplier sees only their own line items |
| `QA_RFQ_04` | QA_BUYER_A | QA_WVG_A | RFQPRICE item | APPROVED | Price hidden, RFQ submittal enabled | Price field absent; RFQ submission success |
| `QA_RFQ_05` | QA_BUYER_A | QA_WVG_A | RELPRICE item | APPROVED | Relationship-gated RFQ allowed | RFQ creates OK; price visible in RFQ |
| `QA_RFQ_06` | QA_BUYER_B | QA_WVG_A | APPROVED item | NONE | RFQ creation denied | HTTP 403/404; no RFQ row created |
| `QA_RFQ_07` | QA_BUYER_C | QA_WVG_A | PUB item | BLOCKED | RFQ creation denied | HTTP 403; no RFQ row created |
| `QA_RFQ_08` | QA_BUYER_A | QA_WVG_A | PUB item | APPROVED | Supplier does not see buyer DRAFT | Supplier inbox shows 0 drafts |
| `QA_RFQ_09` | QA_BUYER_A | QA_WVG_A | PUB item | APPROVED | Submitted RFQ visible to correct supplier | Supplier inbox shows 1 submitted RFQ |
| `QA_RFQ_10` | QA_BUYER_B | QA_KNT_B | PUB item | NONE | Buyer B RFQ visible only to Buyer B | `GET /tenant/rfqs/my` — only QA_BUYER_B's RFQs |
| `QA_RFQ_11` | QA_WVG_A | — | — | — | Supplier inbox scoped to org | Supplier sees only RFQs for their own items |
| `QA_RFQ_12` | QA_WVG_A | — | — | — | Supplier response safe to buyer | Response payload contains no hidden price or internal metadata |
| `QA_RFQ_13` | QA_BUYER_A | QA_WVG_A | — | APPROVED | No auto-create on modal open | Opening RFQ modal does NOT create a DB row |
| `QA_RFQ_14` | QA_BUYER_A | QA_WVG_A | — | APPROVED | No supplier notification before submit | Supplier inbox shows 0 until SUBMITTED |

### 9.2 RFQ forbidden fields (API response to supplier)

- Buyer's `orgId` or direct contact details (unless explicitly provided by buyer in RFQ)
- Buyer's relationship status with OTHER suppliers
- Hidden price values from non-RFQ items
- Internal `denialReason` for any line item

### 9.3 RFQ forbidden fields (API response to buyer — View My RFQs)

- Supplier's internal `orgId` (use display name / slug only unless already shared)
- Other buyers' RFQ IDs or counts
- Raw relationship state label

---

## 10. Approval-Gate QA Requirements

The following tests are required for `TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001`.
Each test must produce pass/fail evidence via Playwright API calls.

| Test ID | Scenario | Actor | Supplier | State | Expected result | Evidence required |
|---------|---------|-------|---------|-------|-----------------|------------------|
| `AG_01` | Unapproved buyer cannot view restricted catalogue | QA_BUYER_B | QA_WVG_A | NONE | `GET /catalog/supplier/{id}/items` → no APPROVED_BUYER_ONLY items in response | API response log |
| `AG_02` | Approved buyer can view approved-only item | QA_BUYER_A | QA_WVG_A | APPROVED | APPROVED_BUYER_ONLY item present in response | API response log |
| `AG_03` | Approval with Supplier A does NOT grant Supplier B access | QA_BUYER_A | QA_KNT_B | NONE (despite APPROVED with QA_WVG_A) | APPROVED_BUYER_ONLY items of QA_KNT_B absent | API response log |
| `AG_04` | Blocked buyer cannot view restricted catalogue | QA_BUYER_C | QA_WVG_A | BLOCKED | APPROVED_BUYER_ONLY item absent; HTTP 403 or item filtered | API response log |
| `AG_05` | Hidden item remains hidden even for approved buyer | QA_BUYER_A | QA_WVG_A | APPROVED | HIDDEN item NOT in response | API response log |
| `AG_06` | RELATIONSHIP_ONLY price visible only to approved buyer | QA_BUYER_A | QA_WVG_A | APPROVED | Price field present in RELPRICE item response | API response log |
| `AG_07` | RELATIONSHIP_ONLY price hidden to unapproved buyer | QA_BUYER_B | QA_WVG_A | NONE | Price field absent for RELPRICE items (or item absent) | API response log |
| `AG_08` | RFQ gate denies unapproved buyer | QA_BUYER_B | QA_WVG_A | NONE | `POST /rfqs` for APPROVED_BUYERS_ONLY item → 403 | API HTTP status |
| `AG_09` | Direct PDP URL is non-disclosing | QA_BUYER_B | QA_WVG_A | NONE | GET `/catalog/item/{approvedItemId}` → 404 or stripped | API response log |
| `AG_10` | Search/list counts do not leak hidden item existence | QA_BUYER_B | QA_WVG_A | NONE | Item counts in list response do not include HIDDEN or APPROVED_BUYER_ONLY items | API response `total` field |
| `AG_11` | Client override attempt fails | QA_BUYER_B | QA_WVG_A | NONE | Sending `relationshipState: APPROVED` in request body → ignored; gate still denies | API response + DB check |
| `AG_12` | REQUESTED state does not grant access | QA_BUYER_A | QA_DYE_C | REQUESTED | APPROVED_BUYER_ONLY items of QA_DYE_C absent | API response log |

---

## 11. Service-Provider Fixture Matrix

Service providers in TexQtic are B2B tenants with `service_provider` role positions.
They publish service listings (not physical catalogue items) and can be discoverable
by buyers and suppliers. The following fixtures are required.

### 11.1 Service-provider fixture types

| Provider | Slug | Segment | Listing type | Visibility | Discoverable by | Buyer RFQ? |
|---------|------|---------|-------------|------------|----------------|-----------|
| `QA_SVC_TST_A` | `qa-service-testing-a` | TestingLab | Testing & certification services | B2B_PUBLIC | Buyers, suppliers | Service request (not product RFQ) |
| `QA_SVC_LOG_B` | `qa-service-logistics-b` | LogisticsProvider | Logistics & freight | B2B_PUBLIC | Buyers, suppliers | Service request |
| `QA_SVC_COMP` | `qa-service-compliance` | ComplianceAgency | Social audit & certification | B2B_PUBLIC | Buyers, suppliers | Service request |
| `QA_SVC_DESIGN` | `qa-service-designer` | FashionDesigner | Design studio services | B2B_PUBLIC | Buyers, suppliers | Service request |
| `QA_SVC_PKG` | `qa-service-packaging` | PackagingSupplier | Garment packaging | B2B_PUBLIC | Buyers, suppliers | Service request |

### 11.2 Service-provider QA paths

| Test ID | Scenario | Expected |
|---------|---------|---------|
| `SVC_01` | Service provider appears in eligible-suppliers if `B2B_PUBLIC` | `GET /b2b/eligible-suppliers` → includes testing lab |
| `SVC_02` | Service provider has no physical catalogue items | `GET /catalog/supplier/{id}/items` → 0 physical items (service listings only) |
| `SVC_03` | Service provider is not matched by AI textile supplier matching | AI matching results must not include service-provider tenants for fabric RFQs |
| `SVC_04` | Buyer can discover testing lab via browse but not via RFQ to fabric items | Service provider does not appear in fabric catalogue |
| `SVC_05` | Service provider profile visible to authenticated buyer | Profile page 200 |

### 11.3 AI matching exclusion

Service-provider tenants MUST be excluded from AI supplier matching when the intent is
a physical textile product. The AI matching pipeline must filter on `tenantType` and
`rolePosition` to exclude pure service-provider orgs from fabric/yarn recommendations.

---

## 12. DPP / Compliance Fixture Matrix

TexQtic's DPP (Digital Product Passport) system is being implemented under
`TECS-DPP-PASSPORT-FOUNDATION-001` (currently active at D-6).

### 12.1 Required DPP fixture types

| Fixture ID | Item | DPP state | Public passport | Expected access |
|-----------|------|-----------|----------------|----------------|
| `DPP_01` | `QA-GMT-D-DPP-PUB-001` | PUBLISHED | `public_token` UUID exists | `GET /api/public/dpp/{publicPassportId}` → 200 (D-6 route) |
| `DPP_02` | `QA-GMT-D-DPP-UNPUB-001` | DRAFT / UNPUBLISHED | No `public_token` | `GET /api/public/dpp/{guessedId}` → 404 |
| `DPP_03` | `QA-WVG-A-DPP-PUB-001` | PUBLISHED (fabric) | `public_token` UUID exists | QR URL resolves to 200 |
| `DPP_04` | Any item | CERT_APPROVED | `node_certifications` row exists | Evidence visible in passport |
| `DPP_05` | Any item | CERT_PENDING | `node_certifications` row present, human review pending | `humanReviewRequired: true` in passport |

### 12.2 DPP QA test paths

| Test ID | Scenario | Expected |
|---------|---------|---------|
| `DPP_T01` | Published passport accessible via public URL | `GET /api/public/dpp/{publicPassportId}` → 200, no auth required |
| `DPP_T02` | Published passport JSON route works | `GET /api/public/dpp/{publicPassportId}.json` → 200 with valid JSON |
| `DPP_T03` | Unpublished passport NOT accessible publicly | No `public_token`; guessed UUID → 404 |
| `DPP_T04` | Tenant export route requires authentication | `GET /tenant/dpp/{nodeId}/passport/export` → 401 if unauthenticated |
| `DPP_T05` | AI-extracted claims count does not appear in public response | `aiExtractedClaimsCount` absent in public payload (blocked D-3/D-4 RLS fix as of D-6) |
| `DPP_T06` | DPP evidence claims not accessible to buyer | `GET /tenant/dpp/{nodeId}/evidence-claims` requires OWNER/ADMIN auth; buyer 403 |
| `DPP_T07` | DPP does not leak private evidence to public | Private claims, internal evidence, AI draft extraction absent from public JSON |
| `DPP_T08` | Wrong-org DPP node access returns 403/404 | Cross-org DPP node access denied by RLS |

### 12.3 DPP forbidden leakage

The following must NEVER appear in the public DPP response:
- AI draft extraction evidence / AI notes
- Internal claim metadata (source, confidence, extractor ID)
- Buyer access history or request log
- Supplier `orgId`, `tenantId`, or internal supplier metadata beyond what is intentionally published
- `dpp_evidence_claims` rows in raw form

---

## 13. AI Supplier Matching Fixture Matrix

The AI supplier matching system (`TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001`, VERIFIED_COMPLETE)
requires the following QA fixtures for ongoing regression and launch verification.

### 13.1 AI matching test scenarios

| Scenario ID | Input | Expected suppliers | Expected exclusions | Key assertions |
|------------|-------|-------------------|---------------------|----------------|
| `AI_01` | RFQ intent: woven cotton fabric, IN jurisdiction | `QA_WVG_A` (`qa-b2b`) | Service providers, garment mfg | Supplier in response; no hidden/restricted items leaked |
| `AI_02` | RFQ intent: knitted fabric, stretch | `QA_KNT_B` | Service providers, dyeing house | Cross-supplier match; no score/rank in response |
| `AI_03` | RFQ intent: same as AI_01 but buyer has NONE relationship | `QA_WVG_A` with filtered items | APPROVED_BUYER_ONLY items | Hidden item IDs must not appear in match response |
| `AI_04` | RFQ intent: fabric with DPP compliance signal | `QA_GMT_D` (has DPP item) | Non-DPP suppliers | DPP signal respected; no raw score exposed |
| `AI_05` | RFQ intent: service only (testing lab) | `QA_SVC_TST_A` | Fabric suppliers | Service-provider matching boundary respected |
| `AI_06` | RFQ intent: obscure/fallback (no candidates) | Fallback response | — | Graceful fallback; no crash; no empty array that leaks count |
| `AI_07` | Embedding integrity check | — | — | All supplier embeddings are 768-dim, correct model, have `org_id` |

### 13.2 AI matching anti-leakage requirements

| Field | Allowed in response? | Note |
|-------|---------------------|------|
| Supplier display name | ✅ | Public identifier |
| Supplier slug | ✅ | Public identifier |
| Match confidence score | ❌ | Forbidden — must not be exposed to buyer or frontend |
| Semantic similarity rank | ❌ | Forbidden |
| Vector/embedding values | ❌ | Forbidden |
| APPROVED_BUYER_ONLY item IDs | ❌ | Forbidden if buyer has NONE relationship |
| Hidden item details | ❌ | Forbidden |
| Internal reason for match | ❌ | Forbidden |
| Price in recommendation payload | ❌ | Forbidden (price is not a matching signal) |
| Service-provider orgs in product match | ❌ | Forbidden when intent is physical product |

---

## 14. Data Hygiene Checklist

The following read-only checks must be run as part of any data hygiene audit unit.
No writes are implied; these are SELECT-only diagnostic probes.

### 14.1 Catalogue integrity

| Check | Query target | Expected |
|-------|-------------|---------|
| Orphan catalogue items (no `org_id`) | `catalog_items WHERE org_id IS NULL` | 0 rows |
| Invalid `publication_posture` values | `catalog_items WHERE publication_posture NOT IN ('B2B_PUBLIC','PRIVATE_OR_AUTH_ONLY','APPROVED_BUYER_ONLY','HIDDEN','BOTH')` | 0 rows |
| Invalid `price_disclosure_policy_mode` values | `catalog_items WHERE price_disclosure_policy_mode IS NOT NULL AND price_disclosure_policy_mode NOT IN ('VISIBLE','RELATIONSHIP_ONLY','HIDDEN')` | 0 rows |
| Items with `rfq_acceptance_mode` not in enum | `catalog_items WHERE rfq_acceptance_mode NOT IN ('OPEN_TO_ALL','APPROVED_BUYERS_ONLY')` (if column exists) | 0 rows |

### 14.2 RFQ integrity

| Check | Query target | Expected |
|-------|-------------|---------|
| Orphan RFQs (no `buyer_org_id`) | `rfqs WHERE buyer_org_id IS NULL` | 0 rows |
| Orphan RFQ line items (no `rfq_id`) | `rfq_line_items WHERE rfq_id IS NULL` | 0 rows |
| Orphan RFQ line items (no `catalog_item_id`) | `rfq_line_items WHERE catalog_item_id IS NULL` | 0 rows |
| RFQs with no line items | `rfqs LEFT JOIN rfq_line_items ... WHERE rfq_line_items.id IS NULL` | May be valid (draft); flag only |
| Submitted RFQs older than 90 days with no supplier response | Flag for review | Informational |

### 14.3 Relationship integrity

| Check | Query target | Expected |
|-------|-------------|---------|
| Orphan relationship rows (no `supplier_org_id`) | `buyer_supplier_relationships WHERE supplier_org_id IS NULL` | 0 rows |
| Orphan relationship rows (no `buyer_org_id`) | `buyer_supplier_relationships WHERE buyer_org_id IS NULL` | 0 rows |
| Invalid relationship states | `buyer_supplier_relationships WHERE state NOT IN ('REQUESTED','APPROVED','REJECTED','BLOCKED','SUSPENDED','EXPIRED','REVOKED')` | 0 rows |
| Duplicate relationship tuples | Verify unique constraint `(supplier_org_id, buyer_org_id)` holds | No violations |
| Self-relationship (buyer = supplier same org) | `buyer_supplier_relationships WHERE supplier_org_id = buyer_org_id` | 0 rows |

### 14.4 AI / embedding integrity

| Check | Query target | Expected |
|-------|-------------|---------|
| Embeddings without `org_id` | `supplier_embeddings WHERE org_id IS NULL` (or equivalent table) | 0 rows |
| Embeddings not 768-dim | Check embedding vector dimension | All 768 |
| Embeddings with wrong model tag | Check `embedding_model` column != canonical model | 0 rows |
| Embeddings for inactive orgs | Join with `organizations` on status | Flag for review |

### 14.5 DPP integrity

| Check | Query target | Expected |
|-------|-------------|---------|
| DPP records with missing `org_id` | `dpp_passport_states WHERE org_id IS NULL` | 0 rows |
| DPP evidence claims with missing `catalog_item_id` | `dpp_evidence_claims WHERE catalog_node_id IS NULL` | 0 rows |
| PUBLISHED passports without `public_token` | `dpp_passport_states WHERE publication_status='PUBLISHED' AND public_token IS NULL` | 0 rows |
| Public tokens that are duplicate | Check uniqueness of `public_token` | 0 violations |

### 14.6 Notification / audit integrity

| Check | Query target | Expected |
|-------|-------------|---------|
| Notification rows for blocked buyers | Audit notifications for BLOCKED state transitions | None sent to buyer for BLOCKED denial (internal only) |
| Failed/cancelled RFQ notifications | Audit table for notification-on-failed-submit events | None exist (no notification before submit) |

---

## 15. Seeding Strategy Comparison

### Option A — Admin UI / manual fixture creation

| Aspect | Assessment |
|--------|-----------|
| Safety | ✅ Highest — no raw DB access |
| Auditability | ✅ Full audit trail via admin routes |
| Speed | ❌ Slowest — requires manual UI steps per item |
| Repeatability | ❌ Not scriptable |
| Rollback | ⚠️ Requires admin UI delete or SQL cleanup |
| Prerequisite | Admin routes for org creation and catalog item CRUD must exist |
| **Verdict** | Suitable for one-time production org seeding only |

### Option B — Bounded SQL fixture injection

| Aspect | Assessment |
|--------|-----------|
| Safety | ⚠️ Requires strict allowlist, scoped to QA orgs only |
| Auditability | ⚠️ SQL changes in psql session; must be logged |
| Speed | ✅ Fastest |
| Repeatability | ⚠️ Manual re-run; not idempotent without UPSERT clauses |
| Rollback | ✅ Explicit DELETE/UPDATE rollback SQL can be defined |
| Prerequisite | `DATABASE_URL` with write access; explicit Paresh authorization |
| **Verdict** | Best for targeted fixture patches (Slice D minimal production seed) |

### Option C — Dedicated seed script (pnpm exec prisma db seed extension)

| Aspect | Assessment |
|--------|-----------|
| Safety | ✅ Code-reviewed, idempotent if designed with UPSERT |
| Auditability | ✅ Git-tracked, commit-logged |
| Speed | ✅ Repeatable and fast once written |
| Rollback | ✅ Idempotency key allows selective cleanup |
| Prerequisite | Allowlisted script file; code review; explicit approval |
| **Verdict** | Best for staging (Slice B/C); recommended long-term |

### Option D — Staging-first then production QA

| Aspect | Assessment |
|--------|-----------|
| Safety | ✅ Production fixtures minimal; staging absorbs test risk |
| Auditability | ✅ Staging validated before production touch |
| Speed | ❌ Requires staging environment identical to production |
| Rollback | ✅ Staging can be torn down; production is isolated |
| Prerequisite | A separate staging Supabase project or branch database |
| **Verdict** | Recommended for large expanded matrix; production gets smoke-level only |

### Recommended sequence

**For MVP fixture injection (minimal production patch):**
1. Slice B: Write bounded SQL injection plan (Option B, psql) — design only until authorized
2. Slice D: Apply minimal production SQL injection after Paresh authorization
   - Patch 2 `qa-b2b` catalogue items (`publication_posture`, `priceDisclosurePolicyMode`)
   - Insert 2 relationship rows (QA_BUYER_A → APPROVED, QA_BUYER_C → BLOCKED)
   - Scope strictly to QA org IDs only

**For expanded matrix:**
3. Slice B/C: Seed new tenants + catalogue items via Option C script — staging first
4. Slice D (expanded): Production QA seed after staging validation

---

## 16. Naming Conventions

### 16.1 Tenant slugs

Pattern: `qa-{type}-{segment}-{letter}`

```
qa-supplier-weaving-a
qa-supplier-knitting-b
qa-processor-dyeing-c
qa-supplier-garment-d
qa-buyer-brand-a
qa-buyer-trader-b
qa-buyer-export-c
qa-service-testing-a
qa-service-logistics-b
qa-service-compliance
qa-aggregator-a
```

### 16.2 Email identities

Pattern: `qa.{type}.{segment}.{letter}@texqtic.com`

```
qa.supplier.weaving.a@texqtic.com
qa.supplier.knitting.b@texqtic.com
qa.processor.dyeing.c@texqtic.com
qa.supplier.garment.d@texqtic.com
qa.buyer.brand.a@texqtic.com
qa.buyer.trader.b@texqtic.com
qa.buyer.export.c@texqtic.com
qa.service.testing.a@texqtic.com
qa.service.logistics.b@texqtic.com
qa.aggregator.a@texqtic.com
```

### 16.3 Catalogue item SKUs

Pattern: `QA-{SEGMENT_CODE}-{LETTER}-{TYPE}-{SEQ}`

| Segment code | Segment |
|-------------|---------|
| `WVG` | Weaving |
| `KNT` | Knitting |
| `DYE` | Dyeing/processing |
| `GMT` | Garment |
| `SPN` | Spinning |
| `DNM` | Denim |

| Type code | Type |
|-----------|------|
| `PUB` | B2B_PUBLIC |
| `AUTH` | PRIVATE_OR_AUTH_ONLY |
| `APPROVED` | APPROVED_BUYER_ONLY |
| `HIDDEN` | HIDDEN |
| `RFQPRICE` | RFQ-only price |
| `PRICEREQ` | Price-on-request |
| `RELPRICE` | RELATIONSHIP_ONLY price |
| `DPP-PUB` | Published DPP item |
| `DPP-UNPUB` | Draft/unpublished DPP item |
| `MOQ` | MOQ-differentiated item |

Examples:
```
QA-WVG-A-PUB-001
QA-WVG-A-APPROVED-001
QA-WVG-A-RELPRICE-001
QA-WVG-A-HIDDEN-001
QA-KNT-B-RELPRICE-001
QA-GMT-D-RFQGATE-001
QA-GMT-D-DPP-PUB-001
```

### 16.4 Relationship labels

Pattern: `QA_REL_{BUYER_KEY}_{SUPPLIER_KEY}_{STATE}`

```
QA_REL_BUYERA_SUPPLIERA_APPROVED
QA_REL_BUYERB_SUPPLIERA_NONE
QA_REL_BUYERC_SUPPLIERA_BLOCKED
QA_REL_BUYERA_SUPPLIERB_NONE
QA_REL_BUYERA_SUPPLIERC_REQUESTED
QA_REL_BUYERA_SUPPLIERD_APPROVED
QA_REL_BUYERB_SUPPLIERD_REVOKED
```

### 16.5 QA data identification convention

All QA fixture data is identifiable by:
- Slug prefix: `qa-`
- Email prefix: `qa.`
- SKU prefix: `QA-`
- Display name prefix: `QA ` (e.g., `QA Weaving Mill A`)
- Internal note / `metadataJson`: `{ "qa_fixture": true, "qa_matrix_unit": "TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001" }`

This allows SELECT-based audit and cleanup targeting.

---

## 17. Rollback / Cleanup Plan

> **No cleanup has been authorized. This section defines the rollback plan for use
> ONLY when explicitly authorized by Paresh.**

### 17.1 Identifying QA fixture data

```sql
-- Identify QA orgs
SELECT id, slug, display_name FROM organizations WHERE slug LIKE 'qa-%';

-- Identify QA catalogue items
SELECT id, name, sku FROM catalog_items WHERE sku LIKE 'QA-%';

-- Identify QA relationship rows
SELECT id, supplier_org_id, buyer_org_id, state
FROM buyer_supplier_relationships
WHERE supplier_org_id IN (SELECT id FROM organizations WHERE slug LIKE 'qa-%')
   OR buyer_org_id IN (SELECT id FROM organizations WHERE slug LIKE 'qa-%');
```

### 17.2 Rollback strategy

| Object type | Rollback approach | Risk |
|-------------|------------------|------|
| New QA org tenants | `DELETE FROM organizations WHERE slug LIKE 'qa-%' AND slug NOT IN ('qa-b2b','qa-buyer','qa-b2c','qa-wl','qa-agg','qa-pend')` | Low — new orgs only |
| Patched catalogue items | `UPDATE catalog_items SET publication_posture='B2B_PUBLIC', price_disclosure_policy_mode=NULL WHERE sku IN ('...')` | Low — targeted UPDATE |
| Relationship rows | `DELETE FROM buyer_supplier_relationships WHERE supplier_org_id = '...' AND buyer_org_id = '...'` | Low — targeted DELETE |
| Seeded Supabase auth users | Requires Supabase Auth admin API — NOT a psql operation | Medium — must use admin API |

### 17.3 Rollback safeguards

- Rollback SQL must be reviewed before execution
- `DELETE` operations must use explicit ID filters, never `LIKE '%qa%'` without `WHERE id IN (...)` constraint
- Rollback must not touch any row where `slug NOT LIKE 'qa-%'` — real tenant data is protected
- Rollback must not affect the existing `qa-b2b`, `qa-buyer`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend` orgs without explicit per-org authorization

### 17.4 Post-rollback verification

After any rollback:
- `GET /api/tenant/b2b/eligible-suppliers` must still return `qa-b2b`
- `GET /api/tenant/catalog/items` for `qa-b2b` must return expected item count
- Server health check `GET /health` must return 200
- No orphan relationship rows for deleted orgs

---

## 18. Security / Privacy Requirements

All fixture data generated or injected under this matrix must comply with:

| Requirement | Rule |
|-------------|------|
| No real customer data | All fixture tenants use `qa.*@texqtic.com` identities |
| No real commercial data | All prices, MOQs, lead times are placeholder values; no real supplier pricing |
| No real payment data | No payment instruments, no payout accounts in QA fixtures |
| No real credentials | No passwords in documents; Supabase sends magic links / sets passwords via Auth admin API |
| No production secrets | No DB URLs, API keys, service role keys in this document or any seed script |
| No hidden price leakage | API and DOM anti-leakage checks must pass for all HIDDEN/RELATIONSHIP_ONLY items |
| No relationship graph exposure | Buyer's relationship state with Supplier A must never be visible to Supplier B |
| No public allowlist exposure | Approval allowlist (if any) must remain server-side only |
| No AI score exposure | No confidence score, rank, or embedding vector in any buyer-facing response |
| RLS must hold | All cross-org queries must fail for non-authorized requestors |
| Service role key never exposed | psql injection via `DATABASE_URL` only; service role key never in chat, doc, or log |

---

## 19. Runtime Verification Gates

After any seeding (Slice C or D), the following Playwright-based verification must pass
before the seeding unit can be declared `VERIFIED_COMPLETE`:

### 19.1 Org and session verification

| Gate | Method | Expected |
|------|--------|---------|
| Supplier A session (`qa.b2b@texqtic.com`) active | `GET /api/me` | 200; `org.slug: qa-b2b` |
| Buyer A session (`qa.buyer.brand.a@texqtic.com`) active | `GET /api/me` | 200; `org.slug: qa-buyer-brand-a` |
| Buyer B session (`qa.buyer@texqtic.com`) active | `GET /api/me` | 200; `org.slug: qa-buyer` |
| All supplier orgs appear in eligible-suppliers | `GET /api/tenant/b2b/eligible-suppliers` | Total ≥ 4 (qa-b2b + 3 new) |

### 19.2 Catalogue gating verification

| Gate | Actor | Method | Expected |
|------|-------|--------|---------|
| APPROVED_BUYER_ONLY item hidden from NONE buyer | QA_BUYER_B | `GET /catalog/supplier/{qa-b2b-id}/items` | No APPROVED_BUYER_ONLY item in response |
| APPROVED_BUYER_ONLY item visible to approved buyer | QA_BUYER_A | `GET /catalog/supplier/{qa-b2b-id}/items` | APPROVED_BUYER_ONLY item in response |
| HIDDEN item hidden from all buyers | QA_BUYER_A | `GET /catalog/supplier/{qa-b2b-id}/items` | No HIDDEN item in response |
| Cross-supplier isolation | QA_BUYER_A | `GET /catalog/supplier/{qa-knt-b-id}/items` | No APPROVED_BUYER_ONLY item (no APPROVED relationship) |

### 19.3 Anti-leakage scan

| Scan | Target | Check |
|------|--------|-------|
| DOM scan | Buyer A's catalog view of QA_KNT_B | No hidden item names, no HIDDEN item count, no price values for hidden items |
| Network payload scan | API response for blocked buyer | No `internalReason`, no `allowlistDetails`, no hidden item IDs |
| Console check | All QA Playwright sessions | No errors; no 500s; no unexpected 403s for authorized flows |
| Cross-tenant probe | QA_BUYER_B attempting QA_BUYER_A's session token | 401/403 |

### 19.4 Health check

After server restart or any fixture change:
```
GET /health → 200
GET /api/tenant/b2b/eligible-suppliers → 200
GET /api/tenant/catalog/items → 200
```

---

## 20. Governance Requirements

### 20.1 Future unit classification

| Unit | Type | Authorization needed | DB mutation? |
|------|------|---------------------|-------------|
| `TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001` (this) | Design | None (this document) | None |
| Slice B — Staging SQL seed plan | Design + SQL draft | Paresh review | No (plan only) |
| Slice C — Staging seed execution | Implementation | Paresh approval for staging write | Yes — staging only |
| Slice D — Minimal production QA fixture seed | Implementation | Paresh explicit authorization | Yes — production, scoped to QA orgs |
| Slice E — Production approval-gate QA | Verification | Slice D complete | Read-only (Playwright) |
| Slice F — Full textile-chain runtime QA | Verification | Slice C/D complete | Read-only (Playwright) |
| Slice G — Data hygiene / orphan-row audit | Verification | None | Read-only (SELECT only) |
| Slice H — Governance closure / launch readiness | Governance | All prior slices complete | None |

### 20.2 Explicit stop conditions

Stop and emit a blocker report if:
- Any psql injection would touch a row not belonging to a `qa-` slug org
- Any Supabase Auth operation would affect a non-QA user
- Any fixture injection conflicts with live tenant data
- Any new org seed would require a schema migration not in the plan
- Any new catalogue item would require a new `publicationPosture` enum value

### 20.3 Governance contracts reviewed

| Contract | Applicable | Status |
|----------|-----------|--------|
| `db-naming-rules.md` | Applicable for any SQL fixture injection (snake_case columns, UUID ids) | N/A — no DB change in this unit |
| `schema-budget.md` | Not applicable — no new columns or tables | N/A |
| `rls-policy.md` | Applicable — RLS isolation must hold after seeding | N/A — to be verified in Slice C/D |
| `openapi.tenant.json` | Not applicable — no route change | N/A |
| `event-names.md` | Not applicable — no events | N/A |
| `ARCHITECTURE-GOVERNANCE.md` | Applicable — org type and plane boundaries must be respected | N/A |

---

## 21. Recommended Execution Sequence (Slices A–H)

```
Slice A — Multi-segment QA seed design (this artifact)
          ┌── Status: COMPLETE (this document, commit design(qa): add multi-segment tenant seed matrix plan)
          └── Output: docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-DESIGN-v1.md

Slice B — Staging seed plan (SQL/script)
          ┌── Type: Design + bounded SQL injection plan for staging
          ├── Prerequisite: Paresh review of this design artifact
          ├── Scope: Staging environment only; new org tenants + catalogue patches + relationship rows
          └── Output: SQL plan document (design only until Paresh authorizes)

Slice C — Staging seed execution and validation
          ┌── Type: Implementation (psql or seed script, staging only)
          ├── Prerequisite: Slice B approved; staging DATABASE_URL available
          ├── Scope: Apply Slice B SQL to staging; validate with Playwright
          └── Output: Staging verification evidence report

Slice D — Minimal production QA fixture seed (only if authorized)
          ┌── Type: Implementation (psql, production)
          ├── Prerequisite: Slice C VERIFIED_COMPLETE; explicit Paresh authorization
          ├── Scope: QA org IDs only; catalogue patches on qa-b2b; relationship inserts for MVP tuples
          └── Output: Production Playwright verification evidence

Slice E — Production approval-gate QA
          ┌── Type: Verification (Playwright, read-only)
          ├── Prerequisite: Slice D complete (or Slice C if production-equivalent staging)
          ├── Unit: TECS-SUPPLIER-CATALOG-APPROVAL-GATE-QA-001
          └── Output: Approval-gate verification evidence report

Slice F — Full textile-chain runtime QA
          ┌── Type: Verification (Playwright, read-only)
          ├── Prerequisite: Slice E complete; expanded matrix seeded
          ├── Scope: Catalog/RFQ/DPP/AI/service-provider flows
          └── Output: Full runtime QA evidence report

Slice G — Data hygiene / orphan-row audit
          ┌── Type: Verification (SELECT-only DB audit)
          ├── Prerequisite: Any time after Slice D
          ├── Scope: All hygiene checks from Section 14
          └── Output: Data hygiene audit report

Slice H — Governance closure / launch readiness decision
          ┌── Type: Governance
          ├── Prerequisite: Slices E, F, G complete
          └── Output: Launch readiness decision document; governance changelog update
```

---

## 22. Open Questions / Risks

### 22.1 Open questions requiring Paresh decision

| # | Question | Impact |
|---|---------|--------|
| 1 | Is staging (separate Supabase project) available for Slice C? | Determines whether production must be used for first seeding |
| 2 | Should existing `qa-b2b` be repurposed as `Supplier A` or should a new `qa-supplier-weaving-a` org be seeded? | Affects org proliferation; repurposing is simpler |
| 3 | Should `qa-buyer` be repurposed as `Buyer B` (NONE state) or should a new `qa-buyer-trader-b` be seeded? | `qa-buyer` is already seeded and ACTIVE — repurposing is simpler for MVP |
| 4 | For multi-state relationship coverage, should sequential state updates be used (single buyer/supplier pair) or multiple buyer orgs seeded? | Sequential is simpler; multi-org enables parallel QA |
| 5 | Is the relationship management API (`TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001` Slices A–G) now deployed? Governance files indicate VERIFIED_COMPLETE (2026-04-28); session Playwright showed 404 on one specific route. Clarification needed. | If relationship API is live, relationship rows may be injectable via API rather than psql |

### 22.2 Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Unique constraint collision on `(supplierOrgId, buyerOrgId)` when testing multiple relationship states | High | Use sequential state updates OR seed additional buyer orgs (Section 6.1 note) |
| `qa-b2b` existing catalogue items cannot be patched safely in production (items may be linked to real QA test workflows) | Low | Check for any submitted RFQs on the items before patching `publicationPosture` |
| Service-provider tenant type may require different `tenantType` enum value than B2B | Medium | Confirm `tenantType` enum from `server/prisma/schema.prisma` before seeding service-provider tenants |
| AI matching embeddings for new tenants will not exist until embedding generation runs after seeding | Medium | AI matching QA (Slice F) must run after embedding refresh cycle completes |
| `REGION_CHANNEL_SENSITIVE` visibility policy type in `CatalogVisibilityPolicy` is not yet implemented | Low | Design does not use this type; flag for future if needed |
| DPP `aiExtractedClaimsCount` blocked by D-3/D-4 RLS fix (as of D-6) | Medium | DPP_T05 test should assert `aiExtractedClaimsCount: 0`; not a blocker |

---

## Appendix A — Allowlist Compliance

| File | Action |
|------|--------|
| `docs/TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001-DESIGN-v1.md` | Created (this file) |

No other files were created, modified, or deleted.

---

## Appendix B — Commit Message

```
design(qa): add multi-segment tenant seed matrix plan
```

---

*TECS-MULTI-SEGMENT-QA-TENANT-SEED-MATRIX-001 — DESIGN ONLY — NO SEEDING AUTHORIZED*
