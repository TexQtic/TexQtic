# TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001 — Design Artifact v1

**Unit:** `TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001`
**Status:** DESIGN_COMPLETE
**Date:** 2026-04-24
**Mode:** Design / Planning Only — No implementation in this artifact.
**Prior unit:** `TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001` — VERIFIED_COMPLETE (ec91ad2)

---

## 1. Repo Truth Findings

### 1.1 Current `CatalogItem` Schema

Live as of `ec91ad2` / Prisma schema (`server/prisma/schema.prisma` L335–L364):

```
model CatalogItem {
  id                 UUID (PK)
  tenantId           UUID (FK → Tenant)
  name               VARCHAR(255)   required
  sku                VARCHAR(100)   nullable
  description        TEXT           nullable
  price              DECIMAL(10,2)  nullable       ← HIDDEN from buyer (Phase 1–2)
  active             BOOLEAN        default true
  moq                INT            default 1
  imageUrl           TEXT           nullable       ← @map("image_url")
  publicationPosture VARCHAR(30)    default "PRIVATE_OR_AUTH_ONLY"
  productCategory    VARCHAR(50)    nullable       ← TECS-B2B-...-FILTERS-001
  fabricType         VARCHAR(50)    nullable       ← TECS-B2B-...-FILTERS-001
  gsm                DECIMAL(6,1)   nullable       ← TECS-B2B-...-FILTERS-001
  material           VARCHAR(50)    nullable       ← TECS-B2B-...-FILTERS-001
  composition        VARCHAR(500)   nullable       ← TECS-B2B-...-FILTERS-001
  color              VARCHAR(100)   nullable       ← TECS-B2B-...-FILTERS-001
  widthCm            DECIMAL(6,2)   nullable       ← TECS-B2B-...-FILTERS-001
  construction       VARCHAR(50)    nullable       ← TECS-B2B-...-FILTERS-001
  certifications     JSONB          nullable       ← TECS-B2B-...-FILTERS-001
}
```

**Critical observation:** All 9 textile attribute columns are fabric-specific. None model
yarn properties (count, twist, ply, denier), fiber properties (staple, micronaire, grade),
garment properties (size range, gender, fit), machine properties (brand, model, capacity),
service capability properties, or software properties. A direct wide-table extension
would result in 60–90 nullable stage-specific columns — this design explicitly avoids that.

### 1.2 Supplier Catalog Create/Update API

- `POST /api/tenant/catalog/items` — accepts name, price, moq, plus all 9 textile fields.
- `PATCH /api/tenant/catalog/items/{id}` — same fields, all nullable-patchable.
- Zod validation: `productCategory` is open-coded VARCHAR; no enum enforcement at DB level.
- OpenAPI contract: `shared/contracts/openapi.tenant.json` routes `/api/tenant/catalog/items`
  and `/api/tenant/catalog/items/{id}`.

### 1.3 Buyer Catalog Filter API

- `GET /api/tenant/catalog/supplier/{supplierOrgId}/items`
- Current query params: `q`, `limit`, `cursor`, `productCategory`, `fabricType`,
  `material` (multi-value), `construction`, `color`, `gsmMin`, `gsmMax`,
  `widthMin`, `widthMax`, `moqMax`, `certification`.
- Filters implemented as AND-composed raw SQL with parameterized certification two-pass.
- No `productStage` or stage-typed filter exists.

### 1.4 Supplier Add/Edit Form

- `App.tsx`: supplier add/edit forms include all 9 textile fields as optional selects/inputs.
- Controlled-vocabulary constants in `services/catalogService.ts`:
  `PRODUCT_CATEGORY_VALUES`, `FABRIC_TYPE_VALUES`, `MATERIAL_VALUES`, `CONSTRUCTION_VALUES`,
  `CERT_STANDARD_VALUES`.
- No stage selector exists. Form is fabric-only today.

### 1.5 Buyer Filter Bar

- `App.tsx`: 11 filter controls (productCategory, fabricType, material, construction,
  color, gsmMin/Max, widthMin/Max, moqMax, certification).
- Active chips displayed per active filter. "Clear Filters" resets all.
- No stage tab/selector exists.

### 1.6 AI-Readable Vector Text Helpers

`server/src/routes/tenant.ts` (L540–L580):

- `buildCatalogItemVectorText(item)` — produces plain-text for vector ingestion.
  Fields: name, sku, description, productCategory, fabricType, material, composition,
  construction, color, gsm, widthCm, certifications.
  **Intentionally excludes price and publicationPosture.**
- `catalogItemAttributeCompleteness(item)` — returns [0,1] fraction of 9 fabric fields
  that are non-null.
- These helpers are called on POST and PATCH item routes; vectorText is stored via
  `DocumentEmbedding` (sourceType='CATALOG_ITEM', orgId-scoped, pgvector 768-dim).

### 1.7 Existing B2B Taxonomy

From `governance/analysis/TEXQTIC-B2B-TAXONOMY-STRUCTURE-REFINEMENT-WORK-ITEM-003-2026-04-13.md`
(LOCKED, canonical architectural truth):

**Segment taxonomy** (production/material/trade-adjacent):
- Yarn, Weaving, Knitting, Fabric Processing, Dyeing, Printing, Digital Printing,
  Value Addition, Garment Manufacturing, Packaging,
  Textile Chemicals and Auxiliaries, Machine Spare Parts / Mill-Gin Stores,
  Textile Machine Suppliers

**Service-specialist segments:**
- Manufacturing Services, Fashion Design, Fabric Design, Technical Consulting,
  Business Consulting, Testing Laboratories, Certification Agencies,
  Textile Software Providers

**Role-positioning axis (separate from segment):**
- `manufacturer`, `trader`, `service_provider`

Model: `primary_segment_key` (VARCHAR 100) + `organization_secondary_segments` (multi-row).

**Critical observation:** The canonical B2B taxonomy already defines the industry chain.
`catalogStage` must align to this taxonomy, not create a parallel orthogonal axis.

### 1.8 Organization Profile and Certifications

- `organizations` table: `org_type`, `primary_segment_key`, `OrganizationSecondarySegment[]`,
  `OrganizationRolePosition[]`, `Certification[]` (org-level with lifecycle), `DocumentEmbedding[]`.
- `Certification` model: org-scoped, `certificationType` open-coded text, lifecycle state,
  `issuedAt`, `expiresAt`. Not item-scoped — separate from item-level `certifications` JSONB.
- `DocumentEmbedding`: `sourceType` open-coded ('CATALOG_ITEM' | 'DPP_SNAPSHOT' | 'CERTIFICATION'),
  768-dim pgvector, JSONB metadata, org-scoped via `orgId`.

### 1.9 References to Non-Fabric Stages in Repo

**No references** to YARN, FIBER, GARMENT, KNIT_TYPE, MACHINE_SPARE, CHEMICAL,
yarn-specific or garment-specific attributes found anywhere in:
- `server/prisma/schema.prisma`
- `services/catalogService.ts`
- `server/src/routes/tenant.ts`
- `App.tsx`
- `shared/contracts/`

Only exception: test fixtures use `secondary_segment_keys: ['Yarn', 'Weaving', 'Knitting']`
as segment taxonomy strings — these are segment labels, not catalog item attributes.

### 1.10 Likely Future Implementation File Allowlist

Based on current repo layout and the pattern established by TECS-B2B-...-FILTERS-001:

```
server/prisma/schema.prisma                               (schema sync after SQL)
server/src/routes/tenant.ts                               (stage validation, CRUD, filters, AI helpers)
services/catalogService.ts                                (type exports, filter params, API client)
App.tsx                                                   (stage selector, dynamic form, buyer filter tabs)
shared/contracts/openapi.tenant.json                      (API contract update)
tests/b2b-supplier-catalog-stage-attributes.test.ts       (supplier CRUD stage validation)
tests/b2b-buyer-catalog-stage-filters.test.ts             (buyer filter per stage)
tests/b2b-catalog-ai-stage-contract.test.ts               (AI vector/completeness per stage)
tests/b2b-catalog-stage-legacy-compat.test.ts             (legacy fabric items unaffected)
```

SQL migration file (applied manually before Prisma db pull):
```
server/prisma/migrations/YYYYMMDD_add_catalog_stage_attributes.sql
```

---

## 2. Canonical Stage Taxonomy

### 2.1 Design Decision: `catalogStage` vs `productStage`

**Decision: use `catalogStage`.**

Rationale:
- `productStage` implies a product-lifecycle concept (draft → live → archived).
- This unit models the textile-industry supply-chain stage the item belongs to.
- `catalogStage` is clearer and avoids naming collision with future product lifecycle fields.
- Aligns with existing `catalogService.ts` naming conventions.

### 2.2 `catalogStage` Enum Values

Aligned to the locked canonical B2B taxonomy (Section 1.7):

| `catalogStage` value | Taxonomy segment alignment | Notes |
|---|---|---|
| `YARN` | Yarn | Spun, filament, textured yarn |
| `FIBER` | Yarn (upstream) | Raw cotton, polyester staple, specialty fiber |
| `FABRIC_WOVEN` | Weaving | All woven construction types |
| `FABRIC_KNIT` | Knitting | Jersey, rib, interlock, technical knits |
| `FABRIC_PROCESSED` | Fabric Processing / Dyeing / Printing / Value Addition | Processed fabric (dyed, printed, finished); replaces separate DYEING/PRINTING stages at item level |
| `GARMENT` | Garment Manufacturing | CMT and full-package garment |
| `ACCESSORY_TRIM` | Value Addition (trimming sub-type) | Labels, buttons, zippers, patches |
| `CHEMICAL_AUXILIARY` | Textile Chemicals and Auxiliaries | Dye, softener, finishing agent, auxiliary |
| `MACHINE` | Textile Machine Suppliers | Circular knitting, shuttle loom, rapier, etc. |
| `MACHINE_SPARE` | Machine Spare Parts / Mill-Gin Stores | Spindles, needles, cams, parts |
| `PACKAGING` | Packaging | Cartons, poly bags, hangers, tags |
| `SERVICE` | Manufacturing Services / Fashion Design / Fabric Design / Technical Consulting / Business Consulting / Testing Laboratories / Certification Agencies | Capability listing, not a physical product |
| `SOFTWARE_SAAS` | Textile Software Providers | SaaS platforms, design tools, ERP modules |
| `OTHER` | Catch-all | Items that don't map cleanly to any stage |

**Total: 14 canonical stage values.**

### 2.3 Service Subtype Decision

**Decision: Option A — `catalogStage = SERVICE` + separate `serviceType` field.**

Evaluated options:

| Option | Description | Verdict |
|---|---|---|
| A | `catalogStage=SERVICE` + `serviceType` enum field | **RECOMMENDED** |
| B | Many service-specific `catalogStage` enum values | Rejected — bloats primary filter axis |
| C | Separate service capability model | Deferred — valid for Phase 4+, not this unit |

Rationale for Option A:
- Buyers filter first by stage (e.g., "show me services"), then by service type.
- A single `SERVICE` stage value keeps the primary filter axis clean.
- `serviceType` is a secondary attribute, analogous to `fabricType` for fabrics.
- This mirrors the B2B taxonomy where service-specialist segments are on the same axis
  as production segments, with role-position as a separate axis.

**`serviceType` controlled vocabulary:**

```
FASHION_DESIGN
FABRIC_DESIGN_DOBBY
FABRIC_DESIGN_JACQUARD
FABRIC_DESIGN_PRINT
TECHNICAL_CONSULTING
BUSINESS_CONSULTING
TESTING_LAB
LOGISTICS_PROVIDER
CERTIFICATION_PROVIDER
MANUFACTURING_SERVICE
TEXTILE_SOFTWARE_SAAS  ← also maps to catalogStage=SOFTWARE_SAAS but listed here for cross-ref
OTHER_SERVICE
```

Note: `SOFTWARE_SAAS` is kept as a separate `catalogStage` value because SaaS products
have distinct attributes (deployment model, modules, integrations) that differ structurally
from service capabilities. A supplier may list both a SaaS product and a consulting service.

---

## 3. Stage-Specific Attribute Matrix

Format: **Attribute** | Type | Filterable | Supplier-entry | Buyer-visible | AI-readable | Notes

### 3.1 YARN

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `yarnType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | SPUN, FILAMENT, TEXTURED, CORE_SPUN, FANCY, OTHER |
| `yarnCount` | DECIMAL | range | ✅ | ✅ | ✅ | Numeric count value |
| `countSystem` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | NE (English count), NM (Metric), TEX, DENIER |
| `ply` | INT | ✅ | ✅ | ✅ | ✅ | Number of plies (1–12 typical) |
| `twist` | DECIMAL | — | ✅ | ✅ | ✅ | Twists per meter or per inch |
| `twistDirection` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | S or Z |
| `fiber` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | Primary fiber (COTTON, POLYESTER, NYLON, VISCOSE, WOOL, ACRYLIC, MODAL, BLENDED, OTHER) |
| `composition` | VARCHAR | — | ✅ | ✅ | ✅ | Free text e.g. "60% Cotton 40% Polyester" |
| `denier` | DECIMAL | range | ✅ | ✅ | ✅ | For filament yarns |
| `filamentType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | MULTIFILAMENT, MONOFILAMENT, TEXTURED, OTHER |
| `spinningType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | RING, OPEN_END, AIR_JET, COMPACT, VORTEX, OTHER |
| `coneWeight` | DECIMAL | — | ✅ | ✅ | ✅ | Grams per cone |
| `endUse` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | WEAVING, KNITTING, EMBROIDERY, SEWING_THREAD, OTHER |
| `certifications` | JSONB array | ✅ | ✅ | ✅ | ✅ | Reuses CertificationEntry schema |

### 3.2 FIBER

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `fiberType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | COTTON, POLYESTER_STAPLE, VISCOSE_STAPLE, WOOL, SILK, HEMP, JUTE, LINEN_FLAX, OTHER |
| `fiberGrade` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Free text grade label (e.g., "S-6/32 mm") |
| `stapleLength` | DECIMAL | range | ✅ | ✅ | ✅ | mm; for cotton and staple fibers |
| `micronaire` | DECIMAL | range | ✅ | ✅ | ✅ | Cotton fineness; µg/inch |
| `strength` | DECIMAL | range | ✅ | ✅ | ✅ | g/tex for cotton; cN/tex for synthetic |
| `origin` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Country/region of origin (open text) |
| `organicStatus` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | ORGANIC, CONVENTIONAL, TRANSITIONAL |
| `moistureContent` | DECIMAL | — | ✅ | ✅ | ✅ | % moisture; for trade and blending reference |
| `trashContent` | DECIMAL | — | ✅ | ✅ | ✅ | % trash; for cotton specifically |
| `certifications` | JSONB array | ✅ | ✅ | ✅ | ✅ | GOTS, BCI, OCS, etc. |

### 3.3 FABRIC_WOVEN

Current fabric fields already cover this stage. Mapping:

| Attribute | DB column (current) | Type | Filterable | Notes |
|---|---|---|---|---|
| `gsm` | `gsm` | DECIMAL(6,1) | range ✅ | Existing |
| `widthCm` | `width_cm` | DECIMAL(6,2) | range ✅ | Existing |
| `construction` | `construction` | VARCHAR(50) | ✅ | Existing (PLAIN_WEAVE, TWILL, SATIN, DOBBY, JACQUARD, etc.) |
| `material` | `material` | VARCHAR(50) | multi-value ✅ | Existing |
| `composition` | `composition` | VARCHAR(500) | — | Existing |
| `color` | `color` | VARCHAR(100) | ✅ | Existing |
| `certifications` | `certifications` | JSONB | ✅ | Existing |

**New stage_attributes fields** (in JSONB):

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `weaveType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | PLAIN, TWILL, SATIN, DOBBY, JACQUARD, OXFORD, CANVAS, TERRY, VELVET, OTHER |
| `finish` | VARCHAR | ✅ | ✅ | ✅ | ✅ | SANFORIZED, MERCERIZED, CALENDERED, COATED, WATER_REPELLENT, OTHER |
| `endUse` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | APPAREL, HOME_TEXTILE, INDUSTRIAL, TECHNICAL |

### 3.4 FABRIC_KNIT

Common columns (`gsm`, `widthCm`, `material`, `composition`, `color`, `certifications`) reused.
New stage_attributes fields:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `knitType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | JERSEY, RIB, INTERLOCK, PIQUE, FLEECE, MESH, VELOUR, POINTELLE, OTHER |
| `gauge` | DECIMAL | range | ✅ | ✅ | ✅ | Needles per inch |
| `loopLength` | DECIMAL | — | ✅ | ✅ | ✅ | mm; affects fabric density |
| `stretch` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | TWO_WAY, FOUR_WAY, NONE |
| `finish` | VARCHAR | ✅ | ✅ | ✅ | ✅ | BRUSHED, ANTI_PILLING, MOISTURE_WICKING, OTHER |
| `endUse` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | APPAREL, SPORTSWEAR, INNERWEAR, HOME_TEXTILE, TECHNICAL |

### 3.5 FABRIC_PROCESSED

(Dyed, printed, finished, or value-added fabric. Builds on FABRIC_WOVEN/FABRIC_KNIT base.)

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `processType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | DYEING, PRINTING, FINISHING, EMBROIDERY, EMBOSSING, COATING, LAMINATION, OTHER |
| `dyeingMethod` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | REACTIVE, DISPERSE, VAT, ACID, DIRECT, PIGMENT |
| `printingMethod` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | DIGITAL, ROTARY, SCREEN, HEAT_TRANSFER |
| `baseConstruction` | VARCHAR | — | ✅ | ✅ | ✅ | Construction of base fabric before processing |
| `finish` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Anti-pilling, anti-bacterial, UV, water-repellent |

Common columns: `gsm`, `widthCm`, `material`, `composition`, `color`, `certifications` reused.

### 3.6 GARMENT

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `garmentType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | T_SHIRT, SHIRT, TROUSER, DRESS, JACKET, OUTERWEAR, ACTIVEWEAR, INNERWEAR, OTHER |
| `sizeRange` | VARCHAR | ✅ | ✅ | ✅ | ✅ | e.g. "XS–3XL" or "28–42" (open text, controlled by supplier) |
| `fit` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | REGULAR, SLIM, RELAXED, OVERSIZED, ATHLETIC |
| `gender` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | MENS, WOMENS, UNISEX, KIDS, INFANTS |
| `ageGroup` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | ADULTS, YOUTH, INFANTS, ALL |
| `fabricComposition` | VARCHAR | — | ✅ | ✅ | ✅ | e.g. "100% Cotton jersey 180gsm" |
| `trims` | VARCHAR | — | ✅ | ✅ | ✅ | Free text description of trims used |
| `stitchingType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | SINGLE_NEEDLE, DOUBLE_NEEDLE, OVERLOCK, FLATLOCK, CHAINSTITCH |
| `washCare` | VARCHAR | — | ✅ | ✅ | ✅ | Machine wash/dry clean/etc. instructions |
| `monthlyCapacity` | INT | range | ✅ | ✅ | ✅ | Units per month production capacity |
| `complianceCertifications` | JSONB array | ✅ | ✅ | ✅ | ✅ | Reuses CertificationEntry schema |

### 3.7 ACCESSORY_TRIM

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `trimType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | BUTTON, ZIPPER, LABEL_WOVEN, LABEL_PRINTED, PATCH, ELASTIC, LACE, RIBBON, SNAP, RIVET, OTHER |
| `material` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | Reuse MATERIAL_VALUES + METAL, PLASTIC, WOOD |
| `size` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Dimensions or size code (e.g. "20L" for buttons) |
| `color` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Color name or Pantone code |
| `finish` | VARCHAR | ✅ | ✅ | ✅ | ✅ | MATTE, GLOSSY, ANTIQUE, BRUSHED, CHROME |
| `usage` | VARCHAR | — | ✅ | ✅ | ✅ | Application description |
| `certifications` | JSONB array | ✅ | ✅ | ✅ | ✅ | OEKO_TEX, REACH, etc. |

Common column: `moq` reused from `catalog_items.moq`.

### 3.8 CHEMICAL_AUXILIARY

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `chemicalType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | DYE, PIGMENT, SOFTENER, FINISHING_AGENT, SIZING_AGENT, DESIZING_AGENT, BLEACHING_AGENT, FIXING_AGENT, ANTIMICROBIAL, FLAME_RETARDANT, UV_ABSORBER, OTHER |
| `applicationStage` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | PRETREATMENT, DYEING, PRINTING, FINISHING, COATING |
| `form` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | LIQUID, POWDER, PASTE, GRANULE, FLAKE |
| `concentration` | VARCHAR | — | ✅ | ✅ | ✅ | e.g. "50% active content" |
| `compatibility` | VARCHAR | — | ✅ | ✅ | ✅ | Compatible fiber types |
| `hazardClass` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | GHS hazard class label (NONE, HARMFUL, CORROSIVE, FLAMMABLE, ENVIRONMENTAL_HAZARD) |
| `packSize` | VARCHAR | — | ✅ | ✅ | ✅ | e.g. "25 kg drum", "200 L barrel" |
| `compliance` | JSONB array | ✅ | ✅ | ✅ | ✅ | REACH, ZDHC_MRSL, BLUESIGN, ECO_PASSPORT, etc. |
| `sdsAvailable` | BOOLEAN | ✅ | ✅ | ✅ | ✅ | Safety Data Sheet available flag |

### 3.9 MACHINE

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `machineType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | CIRCULAR_KNITTING, FLAT_KNITTING, RAPIER_LOOM, AIRJET_LOOM, WATERJET_LOOM, SHUTTLE_LOOM, JACQUARD_LOOM, SPINNING_RING, SPINNING_ROTOR, SPINNING_AIRJET, WINDING, WARPING, SIZING, DYEING_JET, STENTER, COMPACTOR, PRINTING_DIGITAL, PRINTING_ROTARY, EMBROIDERY, SEWING_INDUSTRIAL, OTHER |
| `brand` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Manufacturer name |
| `model` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Model number / name |
| `year` | INT | range | ✅ | ✅ | ✅ | Manufacturing year |
| `capacity` | VARCHAR | — | ✅ | ✅ | ✅ | e.g. "500 kg/day", "180 rpm" |
| `automationLevel` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | MANUAL, SEMI_AUTOMATIC, FULLY_AUTOMATIC |
| `powerRequirement` | VARCHAR | — | ✅ | ✅ | ✅ | e.g. "415V 3-phase 50Hz" |
| `condition` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | NEW, REFURBISHED, USED_GOOD, USED_FAIR |
| `warranty` | VARCHAR | — | ✅ | ✅ | ✅ | Warranty terms |
| `serviceSupport` | BOOLEAN | ✅ | ✅ | ✅ | ✅ | Service/AMC available |

### 3.10 MACHINE_SPARE

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `spareType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | SPINDLE, NEEDLE, CAM, RING_TRAVELLER, SHUTTLE, REED, HEDDLE, BOBBIN, BELT, BEARING, SENSOR, OTHER |
| `compatibleMachine` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Machine type/brand this spare fits |
| `partNumber` | VARCHAR | — | ✅ | ✅ | ✅ | OEM or catalog part number |
| `material` | VARCHAR | — | ✅ | ✅ | ✅ | Material of the spare part |
| `dimension` | VARCHAR | — | ✅ | ✅ | ✅ | Size/dimension spec |
| `brand` | VARCHAR | ✅ | ✅ | ✅ | ✅ | OEM or compatible brand |
| `condition` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | NEW, REFURBISHED, USED_GOOD |
| `stockAvailability` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | IN_STOCK, ON_ORDER, MADE_TO_ORDER |
| `leadTimeDays` | INT | range | ✅ | ✅ | ✅ | Lead time in days |

### 3.11 PACKAGING

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `packagingType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | CARTON, POLY_BAG, PAPER_BAG, HANGER, GARMENT_TAG, INNER_BOX, PALLET, REEL, CONE_TUBE, OTHER |
| `material` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | CORRUGATED_PAPER, CRAFT_PAPER, PLASTIC_PP, PLASTIC_PE, PLASTIC_PET, FOAM, WOODEN, OTHER |
| `size` | VARCHAR | — | ✅ | ✅ | ✅ | Dimension spec (L×W×H or mm/cm) |
| `gsmOrThickness` | DECIMAL | range | ✅ | ✅ | ✅ | GSM for paper, mm for plastic/foam |
| `printCompatibility` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | DIGITAL_PRINT, OFFSET_PRINT, SCREEN_PRINT, PLAIN, OTHER |
| `foodGrade` | BOOLEAN | ✅ | ✅ | ✅ | ✅ | Food-contact safe |
| `recyclable` | BOOLEAN | ✅ | ✅ | ✅ | ✅ | Recyclable flag |
| `compliance` | JSONB array | ✅ | ✅ | ✅ | ✅ | FSC, ISO_14001, BPA_FREE, etc. |

### 3.12 SERVICE

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `serviceType` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | See Section 2.3 controlled vocabulary |
| `specialization` | VARCHAR | ✅ | ✅ | ✅ | ✅ | Free text — detailed specialization description |
| `industryFocus` | JSONB array | ✅ | ✅ | ✅ | ✅ | Array of industry focus strings (e.g. ["Denim", "Sportswear"]) |
| `softwareTools` | VARCHAR | — | ✅ | ✅ | ✅ | Tools used (e.g. Adobe Illustrator, EAV, Textile Design Studio) |
| `locationCoverage` | VARCHAR | ✅ | ✅ | ✅ | ✅ | City / country / global |
| `turnaroundTimeDays` | INT | range | ✅ | ✅ | ✅ | Typical turnaround in days |
| `portfolioAvailable` | BOOLEAN | ✅ | ✅ | ✅ | ✅ | Portfolio/samples available |
| `certifications` | JSONB array | ✅ | ✅ | ✅ | ✅ | ISO, accreditation, etc. |
| `pricingModel` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | PER_PROJECT, HOURLY, RETAINER, SUBSCRIPTION — NO PRICE AMOUNTS EXPOSED |

Note: `pricingModel` is the pricing structure label only. No price amounts ever exposed.
This preserves the no-price-disclosure rule for Phase 1–2.

### 3.13 SOFTWARE_SAAS

stage_attributes:

| Attribute | Type | Filterable | Supplier | Buyer | AI | Notes |
|---|---|---|---|---|---|---|
| `softwareCategory` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | ERP, DESIGN_TOOL, PLM, SUPPLY_CHAIN, QUALITY_MANAGEMENT, TRACEABILITY, ACCOUNTING, OTHER |
| `deploymentModel` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | CLOUD_SAAS, ON_PREMISE, HYBRID |
| `modules` | JSONB array | ✅ | ✅ | ✅ | ✅ | Array of module name strings |
| `integrations` | VARCHAR | — | ✅ | ✅ | ✅ | ERP integrations, API availability (open text) |
| `userSeats` | VARCHAR | — | ✅ | ✅ | ✅ | Seat model description (e.g. "per-user", "unlimited") |
| `supportLevel` | VARCHAR enum | ✅ | ✅ | ✅ | ✅ | EMAIL_ONLY, PHONE_EMAIL, DEDICATED_CSM, SLA_BASED |
| `securityCertifications` | JSONB array | ✅ | ✅ | ✅ | ✅ | ISO_27001, SOC2, GDPR_COMPLIANT, etc. |
| `trialAvailable` | BOOLEAN | ✅ | ✅ | ✅ | ✅ | Free trial flag |

---

## 4. Recommended Schema Architecture

### 4.1 Options Evaluated

**Option A — Wide `catalog_items` table (pure flat columns)**

Add 50–80+ nullable stage-specific columns directly to `catalog_items`.

| Dimension | Assessment |
|---|---|
| Schema complexity | HIGH — 50–80 new columns; sparse for each stage |
| Prisma ergonomics | POOR — all fields visible on every item regardless of stage |
| Filter performance | POOR — cannot index sparse columns efficiently |
| AI readability | FAIR — but only if vector text helper is updated per stage |
| Supplier UX | POOR — form has all fields visible or requires heavy show/hide logic |
| Buyer filtering | POOR — all filter params appear in API regardless of stage |
| Migration risk | HIGH — ALTER TABLE with many columns; future changes require new migrations |
| Future extensibility | POOR — each new stage requires schema migration |
| **Verdict** | **REJECTED** — repeats the exact mistake this unit is designed to avoid |

**Option B — `catalog_stage` + pure JSONB `stage_attributes`**

Add `catalog_stage VARCHAR(50)` + `stage_attributes JSONB` to `catalog_items`.
All stage-specific fields live in JSONB. Common fields (gsm, material, etc.) move to JSONB too.

| Dimension | Assessment |
|---|---|
| Schema complexity | LOW — 2 new columns total |
| Prisma ergonomics | FAIR — JSONB requires runtime casting; no Prisma type safety |
| Filter performance | POOR — JSONB GIN indexes work for contains/existence but not range queries |
| AI readability | GOOD — stage_attributes JSONB is introspectable |
| Supplier UX | GOOD — dynamic form per stage from JSONB schema |
| Buyer filtering | POOR — range queries on gsm/widthCm/moq in JSONB are slow without generated columns |
| Migration risk | LOW — minimal schema change |
| Future extensibility | EXCELLENT — new stage attributes require no schema migration |
| **Verdict** | **REJECTED for primary filter path** — range-query perf unacceptable for buyer-side. Valid as secondary storage. |

**Option C — Hybrid (RECOMMENDED)**

Keep common columns on `catalog_items` as-is. Add:
1. `catalog_stage VARCHAR(50) NULL` — new column on `catalog_items`
2. `stage_attributes JSONB NULL` — new column on `catalog_items`

Meaning:
- Common, cross-stage filterable attributes remain as typed columns
  (`gsm`, `material`, `composition`, `color`, `widthCm`, `construction`, `certifications`).
- Stage-specific attributes (yarn count, knitType, garmentType, machineType, serviceType, etc.)
  live in `stage_attributes` JSONB, validated at the service layer by stage-specific Zod schemas.
- Stage-specific filterable attributes that need range queries (e.g. `denier`, `yarnCount`,
  `gauge`, `gsmOrThickness`) use PostgreSQL generated columns or functional indexes where
  needed — deferred to implementation phase.
- `catalog_stage` drives form rendering, filter bar configuration, AI contract selection,
  and vector text construction.

| Dimension | Assessment |
|---|---|
| Schema complexity | LOW — 2 new columns; existing columns preserved |
| Prisma ergonomics | GOOD — catalog_stage typed as string; stage_attributes as Json |
| Filter performance | GOOD — common typed columns retain index performance; JSONB for secondary lookups |
| AI readability | EXCELLENT — stage known + JSONB attributes fully introspectable |
| Supplier UX | EXCELLENT — stage selector drives dynamic form sections |
| Buyer filtering | GOOD — stage filter + common column filters fast; JSONB filters available |
| Migration risk | LOW — 2 column additions + 2 indexes; backward safe (both nullable) |
| Future extensibility | EXCELLENT — new stage: add JSONB validation schema + UI, no migration |
| **Verdict** | **RECOMMENDED** |

### 4.2 Recommended Schema Delta (Option C)

```sql
-- Add to catalog_items:
ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS catalog_stage VARCHAR(50),
  ADD COLUMN IF NOT EXISTS stage_attributes JSONB;

-- Indexes:
CREATE INDEX IF NOT EXISTS idx_catalog_items_stage
  ON catalog_items (tenant_id, catalog_stage)
  WHERE catalog_stage IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_items_stage_attrs
  ON catalog_items USING GIN (stage_attributes)
  WHERE stage_attributes IS NOT NULL;
```

No existing columns removed or modified. Full backward compatibility.

### 4.3 Backward Compatibility

- Existing items where `catalog_stage IS NULL` are treated as legacy fabric items.
- Legacy items continue to render using existing `productCategory`/`fabricType`/`gsm`
  attribute columns.
- Suppliers are not forced to re-enter data; `catalog_stage` is nullable.
- Filter queries for existing filters (`gsmMin`, `material`, etc.) are unchanged — these
  still operate on the typed columns, not on JSONB.

### 4.4 Stage-Attribute Zod Validation Design

Each stage has a Zod schema validated at the service layer:

```typescript
// Concept — implementation TBD
const YarnStageAttributes = z.object({
  yarnType: z.enum([...YARN_TYPE_VALUES]).optional(),
  yarnCount: z.number().positive().optional(),
  countSystem: z.enum(['NE', 'NM', 'TEX', 'DENIER']).optional(),
  ply: z.number().int().min(1).max(12).optional(),
  // ... etc
});

const STAGE_ATTRIBUTE_SCHEMAS: Record<string, z.ZodSchema> = {
  YARN: YarnStageAttributes,
  FIBER: FiberStageAttributes,
  FABRIC_KNIT: FabricKnitStageAttributes,
  // ...
};
```

If `catalog_stage` is set, server validates `stage_attributes` against the corresponding Zod
schema before persist. Extra fields are stripped (not rejected) to allow future extension.

---

## 5. AI-Readable Stage Contract Summary

### 5.1 `CatalogStageAIAttributes` Interface Concept

```typescript
// Concept — implementation TBD
interface CatalogStageAIAttributes {
  catalogStage: string | null;          // Primary stage discriminator
  stageSpecificAttributes: Record<string, unknown> | null;  // JSONB stage_attributes
  // Common cross-stage typed attributes:
  productCategory: string | null;
  fabricType: string | null;
  material: string | null;
  composition: string | null;
  gsm: number | null;
  widthCm: number | null;
  construction: string | null;
  color: string | null;
  certifications: CertificationEntry[] | null;
  // Computed:
  attributeCompleteness: number;        // [0,1] fraction of relevant fields non-null
  vectorText: string;                   // Pre-built text for embedding ingestion
}
```

### 5.2 `buildCatalogItemVectorText` Extension Design

The existing `buildCatalogItemVectorText` helper must be extended to handle non-fabric stages:

```
YARN:    name + yarnType + yarnCount/countSystem + fiber + composition + spinningType + certifications
FIBER:   name + fiberType + grade + origin + organicStatus + certifications
FABRIC_WOVEN: existing fabric text (unchanged)
FABRIC_KNIT: name + knitType + gauge + stretch + material + composition + certifications
GARMENT: name + garmentType + gender + fabricComposition + stitchingType + monthlyCapacity + certifications
MACHINE: name + machineType + brand + model + year + condition + serviceSupport
SERVICE: name + serviceType + specialization + industryFocus + locationCoverage + certifications
SOFTWARE_SAAS: name + softwareCategory + deploymentModel + modules + securityCertifications
OTHER/legacy: existing fabric text path (unchanged)
```

Price remains intentionally excluded from all vector text.
`publicationPosture` remains intentionally excluded.

### 5.3 `catalogItemAttributeCompleteness` Extension Design

The completeness function must be stage-aware:

```
YARN:         11 fields (yarnType, yarnCount, countSystem, fiber, ply, spinningType, denier, endUse, certifications, + 2 common)
FABRIC_WOVEN: existing 9-field calculation (unchanged)
FABRIC_KNIT:  9 fields (knitType, gauge, stretch, finish, + 5 common)
GARMENT:      10 fields (garmentType, gender, fit, fabricComposition, monthlyCapacity, certifications + 4)
MACHINE:      8 fields (machineType, brand, model, year, condition, capacity, automationLevel, serviceSupport)
SERVICE:      7 fields (serviceType, specialization, industryFocus, turnaroundTimeDays, portfolioAvailable, certifications, locationCoverage)
legacy/null:  existing 9-field calculation (unchanged)
```

### 5.4 AI Behavioral Rules (Design Only)

These rules apply to any future AI feature reading catalog stage attributes:

1. **Tenant/org access boundary preserved.** AI may not cross `org_id` when matching.
2. **Certification validity.** AI must not infer cert validity unless `Certification.lifecycleState =
   APPROVED` is present in the `Certification` table. The item-level `certifications` JSONB
   entry is supplier-claimed; it is not the same as a verified `Certification` record.
3. **No hidden price.** AI must not reveal, infer, or estimate price from any source.
4. **No fabricated attributes.** AI must not infer stage attributes not explicitly provided.
5. **Stage-discriminated matching.** AI must use `catalog_stage` to route matching logic
   to the correct stage-specific attribute schema before attribute comparison.
6. **Capability vs product distinction.** SERVICE and SOFTWARE_SAAS items represent
   supplier capabilities, not physical goods. AI must not treat them as physical inventory.

---

## 6. Supplier UX Design Summary

### 6.1 Stage Selector (New)

- A required dropdown/pill selector at the top of the add/edit item form.
- Default: empty (must select before proceeding, or leave null for legacy items).
- When `catalog_stage` is selected, the form dynamically renders the stage-specific
  attribute section below the common fields.
- When null: form shows existing fabric fields (backward-compatible legacy behavior).

### 6.2 Dynamic Form Sections by Stage

```
Section 1: Basic Item Info         (always shown — name, sku, description, moq, image)
Section 2: Stage Selector          (new — required for stage-aware items)
Section 3: Stage-Specific Fields   (rendered from STAGE_FORM_CONFIG[catalogStage])
Section 4: Common Attributes       (shown for fabric stages: material, gsm, widthCm, color, certifications)
Section 5: Publication Settings    (publicationPosture — existing; price excluded)
```

### 6.3 Validation Rules

- Stage-specific required fields: none are required at DB level (all nullable).
- Supplier may submit with no stage attributes — backward compatible.
- Frontend: required fields per stage are marked visually but not enforced (draft-friendly).
- Backend: Zod validation strips unknown JSONB fields; valid types enforced.

### 6.4 Legacy Item Migration Behavior

- Existing items with `catalog_stage = NULL` display and edit without regression.
- If a supplier selects `FABRIC_WOVEN` on an existing item, the new `weaveType`, `finish`,
  `endUse` JSONB fields appear in the form; existing typed columns (`gsm`, `material`, etc.)
  continue to be the source of truth for those common fields.
- Suppliers are never forced to migrate existing items.

### 6.5 Draft / Incomplete State

- Items may be saved with `catalog_stage` set but `stage_attributes` empty or partial.
- `catalogItemAttributeCompleteness` score shown to supplier as profile completion guidance.
- Completeness is informational only — not a gate for publish.

### 6.6 Service Provider Profile vs Catalog Listing

**Design decision:** Services are catalog items in Phase 2 (`catalog_stage = SERVICE`).
The existing catalog item flow (POST /api/tenant/catalog/items) is reused.

Why this is the right decision for this unit:
- The catalog item model is already the supplier's product/capability listing surface.
- Introducing a separate `service_capability` table requires a new domain model, new APIs,
  new buyer discovery surface, and new RLS policies — scope belongs in Phase 4+.
- `SERVICE` as a catalog stage allows service providers to list capabilities within the
  existing buyer browse flow without new infrastructure.

**Phase 4+ consideration (deferred, not in scope here):**
A dedicated `ServiceCapability` model with richer fields (portfolio attachments, case studies,
team size, pricing structures, booking/inquiry flows) may eventually supersede the
catalog-item-based service listing.

### 6.7 Bulk Edit Consideration

Bulk edit of `catalog_stage` is deferred. In Phase 2, stage selection is per-item only.
A supplier with 50 yarn listings must set the stage per item (or batch via import — deferred).

---

## 7. Buyer Discovery / Filter Design Summary

### 7.1 Stage Selector / Tabs (New)

- Top of the buyer filter bar: a stage selector (pills or dropdown).
- When a stage is selected: filter controls update to show stage-specific filters.
- When no stage is selected: existing filter bar behavior (cross-stage, fabric-oriented).

### 7.2 Stage-Specific Filter Maps

```
YARN:         yarnType, fiber (material), countSystem, spinningType, certification, moqMax
FIBER:        fiberType, origin, organicStatus, certification
FABRIC_WOVEN: productCategory, material, construction, weaveType, gsmMin/Max, widthMin/Max, color, certification
FABRIC_KNIT:  material, knitType, gauge, stretch, gsmMin/Max, widthMin/Max, color, certification
FABRIC_PROCESSED: processType, dyeingMethod, printingMethod, material, gsmMin/Max, color
GARMENT:      garmentType, gender, ageGroup, fit, sizeRange (keyword), monthlyCapacity, certification
ACCESSORY_TRIM: trimType, material, color, certification
CHEMICAL_AUXILIARY: chemicalType, applicationStage, hazardClass, sdsAvailable, certification
MACHINE:      machineType, brand, automationLevel, condition, year, serviceSupport
MACHINE_SPARE: spareType, compatibleMachine, brand, condition, stockAvailability
PACKAGING:    packagingType, material, recyclable, foodGrade
SERVICE:      serviceType, locationCoverage, turnaroundTimeDays, portfolioAvailable
SOFTWARE_SAAS: softwareCategory, deploymentModel, trialAvailable
```

### 7.3 Filter Implementation Strategy

- Stage-typed filters on `catalog_stage` column: simple equality, fast (indexed).
- Common typed column filters (`gsm`, `material`, `widthCm`, `moq`, `certifications`):
  unchanged, operate on existing columns.
- `stage_attributes` JSONB filters: GIN index covers containment queries
  (e.g. `serviceType`, `knitType`). Range queries on JSONB (e.g. `yarnCount`) may use
  PostgreSQL generated columns or application-level two-pass — deferred to impl.

### 7.4 Filter Behavior Rules

- Stage filter narrows the item set first; attribute filters are AND-composed within stage.
- Clearing the stage filter returns to cross-stage view; attribute filters reset.
- Active filter chips show stage label + attribute values.
- Empty state: "No [Stage] items found matching your filters" — stage-aware message.

### 7.5 Cross-Supplier Implications

Cross-supplier catalog search (buyer browses all suppliers, not just one selected supplier)
is **out of scope** for this unit. All buyer browsing remains within a selected supplier's
catalog only. Cross-supplier matching is deferred to the Aggregator discovery unit.

### 7.6 Mobile Behavior

- Stage selector collapses into a "Stage" filter pill on mobile.
- Dynamic filter sections collapse into expandable panels.
- Active filter chips scroll horizontally.
- Design deferred to implementation slice — this is the behavioral intent only.

---

## 8. Proposed Implementation Slices

Implementation is **not authorized by this design artifact**. The following slices are
defined for the implementation unit when Paresh authorizes it.

| Slice | Description | Files |
|---|---|---|
| S1 | SQL migration: `catalog_stage` + `stage_attributes` + 2 indexes | migration.sql |
| S2 | Prisma db pull + generate | schema.prisma |
| S3 | Stage Zod schemas (14 stages) + controlled vocabulary exports | catalogService.ts, tenant.ts |
| S4 | supplier POST/PATCH: accept `catalogStage` + `stage_attributes`; validate by stage | tenant.ts |
| S5 | buyer GET: `catalogStage` filter + JSONB contains filter | tenant.ts |
| S6 | `buildCatalogItemVectorText` extension: stage-discriminated text | tenant.ts |
| S7 | `catalogItemAttributeCompleteness` extension: stage-aware field count | tenant.ts |
| S8 | `BuyerCatalogItem` type + `BuyerCatalogQueryParams` extension | catalogService.ts |
| S9 | App.tsx: stage selector + dynamic form section | App.tsx |
| S10 | App.tsx: buyer stage filter bar + stage-specific controls | App.tsx |
| S11 | OpenAPI contract update: all 3 endpoints | openapi.tenant.json |
| S12 | Tests: stage validation (14 stages) | b2b-supplier-catalog-stage-attributes.test.ts |
| S13 | Tests: buyer stage filters | b2b-buyer-catalog-stage-filters.test.ts |
| S14 | Tests: AI stage contract (vectorText + completeness per stage) | b2b-catalog-ai-stage-contract.test.ts |
| S15 | Tests: legacy fabric item backward compatibility | b2b-catalog-stage-legacy-compat.test.ts |

**Total estimated slices: 15.**

---

## 9. Proposed Implementation File Allowlist

```
server/prisma/schema.prisma
server/src/routes/tenant.ts
services/catalogService.ts
App.tsx
shared/contracts/openapi.tenant.json
tests/b2b-supplier-catalog-stage-attributes.test.ts      (new)
tests/b2b-buyer-catalog-stage-filters.test.ts             (new)
tests/b2b-catalog-ai-stage-contract.test.ts               (new)
tests/b2b-catalog-stage-legacy-compat.test.ts             (new)
server/prisma/migrations/<timestamp>_add_catalog_stage_attributes.sql  (new)
```

Total: 10 files (6 modified, 4 new).

---

## 10. Migration / Backward Compatibility Plan

### 10.1 Migration Strategy

1. **SQL applied first** (manually via psql, as per TexQtic standard):
   ```sql
   ALTER TABLE catalog_items
     ADD COLUMN IF NOT EXISTS catalog_stage VARCHAR(50),
     ADD COLUMN IF NOT EXISTS stage_attributes JSONB;
   CREATE INDEX IF NOT EXISTS idx_catalog_items_stage
     ON catalog_items (tenant_id, catalog_stage) WHERE catalog_stage IS NOT NULL;
   CREATE INDEX IF NOT EXISTS idx_catalog_items_stage_attrs
     ON catalog_items USING GIN (stage_attributes) WHERE stage_attributes IS NOT NULL;
   ```
2. **Verify SQL**: no ERROR, no ROLLBACK.
3. **Prisma db pull** (syncs schema.prisma to match DB reality).
4. **Prisma generate** (regenerates Prisma Client).
5. **Restart server**.

### 10.2 Existing Fabric Fields

All existing typed columns (`product_category`, `fabric_type`, `gsm`, `material`,
`composition`, `color`, `width_cm`, `construction`, `certifications`) **are preserved unchanged**.

Legacy items with `catalog_stage = NULL` continue to display and filter via existing columns.
The filter API retains all existing filter parameters and behavior.

### 10.3 No Forced Supplier Re-entry

Suppliers are not required to set `catalog_stage` on existing items. All new columns are
nullable. Existing items are unaffected in all views (supplier edit, buyer browse, filters).

### 10.4 Rollback Consideration

Rolling back is straightforward: `DROP COLUMN catalog_stage; DROP COLUMN stage_attributes;`.
These two columns are isolated additions with no FK dependencies, no non-nullable constraints,
and no data pipeline writes in Phase 2. Rollback risk is very low.

---

## 11. Testing Plan

| Test file | Tests to cover |
|---|---|
| `b2b-supplier-catalog-stage-attributes.test.ts` | Yarn item create with valid stage attrs; invalid yarnType rejected; FABRIC_KNIT attrs accepted; GARMENT attrs accepted; MACHINE attrs accepted; SERVICE attrs accepted; null catalogStage accepted (legacy path); extra JSONB fields stripped; certifications JSONB accepted on MACHINE_SPARE; |
| `b2b-buyer-catalog-stage-filters.test.ts` | Filter by catalogStage=YARN returns only yarn items; filter by catalogStage=SERVICE returns only service items; catalogStage + material AND-compose; catalogStage + moqMax AND-compose; no catalogStage = cross-stage results; unknown catalogStage = empty (not error); |
| `b2b-catalog-ai-stage-contract.test.ts` | vectorText for YARN contains yarnType, fiber, spinningType; vectorText for GARMENT contains garmentType, gender; vectorText for SERVICE contains serviceType, specialization; price not in any vectorText; completeness for YARN uses yarn field count; completeness for legacy item uses 9-field count; |
| `b2b-catalog-stage-legacy-compat.test.ts` | Existing item with null catalogStage displays via buyer browse; existing gsm/material/fabricType filters still work; fabric item completeness unchanged; supplier edit of existing item: no catalogStage regression; |

---

## 12. Verification Plan

Production verification markers (for the future implementation unit):

| Marker | Description |
|---|---|
| M-STAGE-1 | Supplier creates a YARN item with yarnType, fiber, spinningType, certifications |
| M-STAGE-2 | Supplier creates a FABRIC_KNIT item with knitType, gauge, stretch |
| M-STAGE-3 | Supplier creates a GARMENT item with garmentType, gender, fit |
| M-STAGE-4 | Supplier creates a SERVICE capability with serviceType, specialization |
| M-STAGE-5 | Supplier creates a MACHINE item with machineType, brand, model, condition |
| M-STAGE-6 | Buyer filters by catalogStage=YARN — only yarn items returned |
| M-STAGE-7 | Buyer filters by catalogStage=SERVICE — only service items returned |
| M-STAGE-8 | Buyer applies stage + material filter — AND-compose correct |
| M-STAGE-9 | Legacy fabric item (catalogStage=null) still renders in buyer browse |
| M-STAGE-10 | Legacy gsm/material/certification filters still work on fabric items |
| M-STAGE-11 | AI vectorText for YARN item does not contain price |
| M-STAGE-12 | RFQ dialog still opens from a GARMENT item result (regression check) |

---

## 13. Risks and Non-Goals

### 13.1 Risks

| Risk | Severity | Mitigation |
|---|---|---|
| JSONB range queries slow for `yarnCount`, `gauge` | MEDIUM | Use generated columns or application-layer two-pass; defer to implementation |
| Stage selector UX complexity for suppliers with many items | LOW | Stage is optional; no forced migration |
| Service items vs service capability records: scope boundary | MEDIUM | Phase 2 = catalog items only; Phase 4+ = separate capability model if needed |
| 14-stage test matrix is large | MEDIUM | Tests organized per stage; 4 test files, focused suites |
| `buildCatalogItemVectorText` dispatch logic complexity | LOW | Stage-discriminated switch is straightforward |
| `catalogItemAttributeCompleteness` denominator varies per stage | LOW | Stage-specific field count constant defined per stage |

### 13.2 Non-Goals (Explicitly Excluded)

```
- Implementation of any schema migration in this artifact
- AI matching, embedding search, or semantic retrieval
- RFQ AI assistant
- Document intelligence
- Price disclosure (price hidden in all stages including SERVICE pricingModel)
- Product Detail Page (PDP)
- Relationship-scoped access or buyer-supplier allowlist
- Cross-supplier marketplace search
- Full service marketplace workflow (booking, payment, invoicing)
- Payment or booking flows for services
- Phase 4+ ServiceCapability domain model
- Frontend implementation of any kind in this artifact
- API implementation in this artifact
- Seed data mutation
- Bulk import / export
- Yarn to fabric supply-chain traceability (separate domain — TraceabilityNode model exists)
- Control-plane taxonomy changes
```

---

## 14. API Design Summary

### 14.1 Supplier Create/Update Extension

**POST** `/api/tenant/catalog/items`
**PATCH** `/api/tenant/catalog/items/{id}`

New optional fields in request body:
```json
{
  "catalogStage": "YARN",
  "stageAttributes": {
    "yarnType": "RING_SPUN",
    "yarnCount": 40,
    "countSystem": "NE",
    "fiber": "COTTON",
    "spinningType": "COMPACT"
  }
}
```

Validation rules:
- If `catalogStage` absent or null: `stageAttributes` ignored; legacy behavior.
- If `catalogStage` present: `stageAttributes` validated against stage-specific Zod schema.
- Unknown keys in `stageAttributes` stripped (not rejected) for forward compatibility.
- `catalogStage` must match the enum of 14 valid stage values or null.

Response: item shape extended with `catalogStage` and `stageAttributes` fields.

### 14.2 Buyer Catalog Listing Extension

**GET** `/api/tenant/catalog/supplier/{supplierOrgId}/items`

New query params:
```
catalogStage=YARN           (single value; null = cross-stage)
stageAttr[serviceType]=TESTING_LAB   (JSONB containment filter; deferred to impl)
```

Filter behavior:
- `catalogStage` filter: `WHERE catalog_stage = $1` (null = no stage filter).
- Existing filters (`gsmMin`, `material`, etc.) unchanged; AND-composed as today.
- `stageAttr` JSONB filters: optional, implementation TBD.

Response item shape extended with `catalogStage` and `stageAttributes`.

### 14.3 OpenAPI Contract Changes

Files to update:
- `/api/tenant/catalog/items` (POST): add `catalogStage`, `stageAttributes` to request schema.
- `/api/tenant/catalog/items/{id}` (PATCH): same.
- `/api/tenant/catalog/supplier/{supplierOrgId}/items` (GET): add `catalogStage` query param
  + extend response item schema with `catalogStage` and `stageAttributes`.

---

## 15. Governance Update Record

This artifact records the selection of `TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001`
as the current active design unit.

```
Unit: TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001
Status: DESIGN_COMPLETE
Date: 2026-04-24
Mode: Design only. No implementation authorized.
Design commit: [see governance commit for this artifact]
```

Implementation requires explicit Paresh authorization before any implementation slice begins.

---

*End of TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001-DESIGN-v1.md*
