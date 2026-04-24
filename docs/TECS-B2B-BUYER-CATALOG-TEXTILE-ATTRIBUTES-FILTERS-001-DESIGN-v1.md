# TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001 — Textile Catalog Attributes, Filters, and AI Contracts
## Design Artifact v1

**Unit:** `TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001`
**Phase:** Design / Planning Only — no code changes in this artifact
**Status:** DESIGN_COMPLETE
**Date:** 2026-04-25
**Author:** GitHub Copilot (governed, Safe-Write Mode)
**Precursor unit:** TECS-B2B-BUYER-CATALOG-SEARCH-FILTER-001 (VERIFIED_COMPLETE, closure commit `47be9b8`)

---

## SCOPE DECLARATION

> This section is the authoritative scope boundary for the current implementation cycle.
> It is mandatory reading before any implementation work begins.

### This unit delivers:

| Included in this unit | Excluded from this unit |
|---|---|
| `CatalogItem` textile attribute columns (9 new columns) | AI feature implementation of any kind |
| Controlled vocabulary definitions for each field | Supplier-buyer matching algorithm |
| SQL migration design and sequence | Embeddings / vector search queries |
| Prisma schema update design | RFQ AI assistant |
| API create/update body schema extensions | Document intelligence |
| Buyer API filter params design | Price disclosure to buyers |
| Supplier-side data entry form extension | PDP (product detail page) |
| Buyer-side filter bar and filter chip UI design | Relationship-scoped access changes |
| AI-readable attribute contract (structure only — not inference) | Cross-supplier search |
| Extended G-028 vectorText with structured attributes | New table creation (all attrs on existing table) |
| MOQ range filter (already in schema) | New Prisma schema files |
| Tests and verification plan | npx prisma or prisma migrate dev |

**All AI features, matching, and inference are explicitly deferred.** The AI contract in this unit
is a data structure and labeling design — not a feature delivery.

---

## 0. Repo-Truth Findings

All design decisions are grounded in live codebase inspection. No assumptions made.

### 0A. Current `CatalogItem` Prisma model (`server/prisma/schema.prisma` line 335–356)

```prisma
model CatalogItem {
  id                 String     @id @default(uuid()) @db.Uuid
  tenantId           String     @map("tenant_id") @db.Uuid
  name               String     @db.VarChar(255)
  sku                String?    @db.VarChar(100)
  description        String?
  price              Decimal?   @db.Decimal(10, 2)
  active             Boolean    @default(true)
  createdAt          DateTime   @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime   @updatedAt @map("updated_at") @db.Timestamptz(6)
  moq                Int        @default(1)
  imageUrl           String?    @map("image_url")
  publicationPosture String     @default("PRIVATE_OR_AUTH_ONLY") @map("publication_posture") @db.VarChar(30)
  cartItems          CartItem[]
  tenant             Tenant     @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  orderItems         OrderItem[]
  rfqs               Rfq[]
  @@index([tenantId, active])
  @@index([tenantId, updatedAt])
  @@map("catalog_items")
}
```

**Zero textile attributes currently in schema.** No `product_category`, `fabric_type`, `gsm`,
`material`, `composition`, `color`, `width_cm`, `construction`, `certifications` columns exist.

`category` in `services/catalogService.ts::CatalogItem` interface is marked `@deprecated` as a
phantom client-side field — no DB column. Must not be used in new code.

`moq` (Int, default 1) exists — buyer MOQ range filter is feasible without schema change.

`price` (Decimal, optional) exists — intentionally absent from buyer response in Phase 1/2.
Per-item `publicationPosture` exists but is not currently filtered at the item level (Gate 1
org-level check handles eligibility). Per-item posture filtering is deferred.

### 0B. Supplier catalog create/update route (`server/src/routes/tenant.ts` line 1210–1480)

**POST /api/tenant/catalog/items — current bodySchema:**
```ts
z.object({
  name: z.string().min(1).max(255),        // required
  sku: z.string().min(1).max(100).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  description: z.string().optional(),
  price: z.number().positive(),            // required
  moq: z.number().int().min(1).default(1),
})
```

**PATCH /api/tenant/catalog/items/:id — current bodySchema (partial):**
```ts
z.object({
  name: z.string().min(1).max(255).optional(),
  sku: z.string().min(1).max(100).nullable().optional(),
  imageUrl: z.string().url().max(2048).nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  moq: z.number().int().min(1).optional(),
  active: z.boolean().optional(),
})
```

No textile fields in either schema.

**G-028 vector indexing is already wired:**
```ts
const vectorText = description ? `${name}\n\n${description}` : name;
enqueueSourceIngestion(dbContext.orgId, 'CATALOG_ITEM', item.id, vectorText, { name });
```
Called after both POST and PATCH. The `vectorText` currently uses only `name` and `description`.
Once textile attributes exist, this must be extended to include structured attribute text.

### 0C. Buyer catalog route (`server/src/routes/tenant.ts` line 1500–1640)

**GET /api/tenant/catalog/supplier/:supplierOrgId/items — current querySchema:**
```ts
z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  q: z.string().max(100).optional(),  // keyword search — implemented SEARCH-FILTER-001
})
```

**Current Prisma select (buyer response fields — NO price):**
```ts
select: { id: true, name: true, sku: true, description: true, moq: true, imageUrl: true }
```

No textile attributes in buyer response yet. Filter params for textile attributes do not exist yet.

### 0D. Supplier-side form in `App.tsx`

Current add-item form state: `{ name, price, sku, imageUrl, description, moq }` — 6 fields.
Current edit-item form state: same 6 fields.
No textile attribute fields exist in either form.

### 0E. Buyer catalog Phase B in `App.tsx`

Current search state: `buyerCatalogSearch` (string, debounced).
No filter state variables exist. No filter bar or filter chips exist.

`BuyerCatalogItem` interface in `services/catalogService.ts`:
```ts
export interface BuyerCatalogItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  moq: number;
  imageUrl: string | null;
}
```
No textile attributes in buyer-facing item shape yet.

### 0F. G-028 vector ingestion — current architecture

- `enqueueSourceIngestion(orgId, 'CATALOG_ITEM', itemId, vectorText, metadata)` is called
  after POST and PATCH catalog item writes (best-effort, non-blocking).
- `vectorText` currently: `name\n\ndescription` or just `name`.
- The future contract must extend `vectorText` to include normalized textile attributes.
- No action in this unit — design only.

### 0G. DB naming governance (`shared/contracts/db-naming-rules.md`)

- DB columns: `snake_case`
- Prisma fields: `camelCase` mapped to `snake_case` via `@map()`
- All new fields must follow this pattern
- No abbreviated column names (e.g. not `fab_type`, use `fabric_type`)
- Foreign keys: `{model_name}_id`

### 0H. RLS policy (`shared/contracts/rls-policy.md`)

- Canonical GUC: `app.org_id`
- `CatalogItem` table has `FORCE RLS` enforced by `app.org_id`
- Adding columns to `catalog_items` does not change RLS coverage — tenant isolation preserved
- Cross-tenant buyer read continues to use `SET LOCAL ROLE texqtic_rfq_read` + explicit `tenantId` filter
- RLS posture: system-level FORCE RLS is the canonical enforcement; explicit `tenantId: supplierOrgId`
  is defense-in-depth (preserved and required in buyer route)

### 0I. Schema budget (`shared/contracts/schema-budget.md`)

- Phase 2 budget stated as max 15 tables. We are past Phase 2 opening layer.
- This unit adds **zero new tables**. All 9 textile attributes are new nullable columns on
  the existing `catalog_items` table.
- Schema budget impact: minimal. Extends existing table only.
- PR checklist: "Schema budget checked" and "Naming rules followed" required.

### 0J. Existing catalog tests

- `tests/b2b-buyer-catalog-listing.test.tsx` — 31 tests (after search split)
- `tests/b2b-buyer-catalog-search.test.tsx` — 19 tests
- `tests/b2b-buyer-catalog-supplier-selection.test.tsx` — 18 tests
- No textile attribute tests exist yet

### 0K. Packages / AI infrastructure

- `@google/generative-ai` is present (used in G-028 B-series)
- `pgvector` enabled in Supabase (ADR-028 ACCEPTED, G-028 A1–A6 CLOSED)
- `enqueueSourceIngestion` / `enqueueSourceDeletion` wired in tenant.ts catalog routes
- No textile attribute embedding logic exists yet

---

## A. Textile Attribute Model

### A.1 Field Definitions

All fields are **nullable by default** — backward compatibility for all existing catalog items
(which have null for every new column). Suppliers can fill them progressively.

| Prisma Field | DB Column | DB Type | Prisma Type | Notes |
|---|---|---|---|---|
| `productCategory` | `product_category` | `VARCHAR(50)` | `String?` | Controlled values — see A.2 |
| `fabricType` | `fabric_type` | `VARCHAR(50)` | `String?` | Controlled values — see A.2 |
| `gsm` | `gsm` | `DECIMAL(6,1)` | `Decimal?` | Grams per sq. metre, range 10–2000 |
| `material` | `material` | `VARCHAR(50)` | `String?` | Primary fibre — controlled values |
| `composition` | `composition` | `VARCHAR(500)` | `String?` | Blend description — structured free text |
| `color` | `color` | `VARCHAR(100)` | `String?` | Primary color — controlled values |
| `widthCm` | `width_cm` | `DECIMAL(6,2)` | `Decimal?` | Fabric width in centimetres (canonical unit) |
| `construction` | `construction` | `VARCHAR(50)` | `String?` | Weave/knit type — controlled values |
| `certifications` | `certifications` | `JSONB` | `Json?` | Array of certification objects — see A.3 |

**`moq` already exists (Int, default 1) — no schema change needed for MOQ range filter.**

### A.2 Field-by-Field Specification

#### `product_category` — `productCategory`

| Property | Value |
|---|---|
| DB column | `product_category` |
| Type | `VARCHAR(50)`, nullable |
| Validation | Zod enum (application-level; see controlled values below) |
| Index needed | Yes — `(tenant_id, product_category)` — buyer filter cardinality is high |
| Buyer filter | `productCategory` enum filter |
| Supplier data entry | Dropdown — required for publication-eligible items (soft-required) |
| AI use | Primary classification signal for requirement-to-supplier matching |

**Controlled values:**
```
APPAREL_FABRIC
HOME_TEXTILE
TECHNICAL_FABRIC
INDUSTRIAL_FABRIC
LINING
INTERLINING
TRIMMING
ACCESSORY
OTHER
```

#### `fabric_type` — `fabricType`

| Property | Value |
|---|---|
| DB column | `fabric_type` |
| Type | `VARCHAR(50)`, nullable |
| Validation | Zod enum (application-level) |
| Index needed | Yes — `(tenant_id, fabric_type)` |
| Buyer filter | `fabricType` enum filter |
| Supplier data entry | Dropdown |
| AI use | Structural classification — fabric construction category |

**Controlled values:**
```
WOVEN
KNIT
NON_WOVEN
LACE
EMBROIDERED
TECHNICAL_COMPOSITE
FLEECE
OTHER
```

#### `gsm` — `gsm`

| Property | Value |
|---|---|
| DB column | `gsm` |
| Type | `DECIMAL(6,1)`, nullable |
| Validation | Zod number, min 10, max 2000, step 0.1 |
| Index needed | No — range queries use seqscan on tenant subset (adequate for supplier catalog sizes) |
| Buyer filter | Min/max range slider — `gsmMin`, `gsmMax` query params |
| Supplier data entry | Numeric input with `g/m²` unit label |
| AI use | Weight classification signal — ultralight (<100), light (100–200), medium (200–350), heavy (>350) |

#### `material` — `material`

| Property | Value |
|---|---|
| DB column | `material` |
| Type | `VARCHAR(50)`, nullable |
| Validation | Zod enum (application-level) |
| Index needed | Yes — `(tenant_id, material)` |
| Buyer filter | `material` multi-select enum filter |
| Supplier data entry | Dropdown |
| AI use | Fibre type signal for matching and certification inference |

**Controlled values:**
```
COTTON
POLYESTER
SILK
WOOL
LINEN
VISCOSE
MODAL
TENCEL_LYOCELL
NYLON
ACRYLIC
HEMP
BAMBOO
RECYCLED_POLYESTER
RECYCLED_COTTON
BLENDED
OTHER
```

#### `composition` — `composition`

| Property | Value |
|---|---|
| DB column | `composition` |
| Type | `VARCHAR(500)`, nullable |
| Validation | Zod string, max 500 — structured free text |
| Index needed | No — not filtered; used for display and AI context only |
| Buyer filter | None — display only on buyer card when present |
| Supplier data entry | Text input, e.g. "70% Cotton, 30% Polyester" |
| AI use | Full fibre breakdown for RFQ enrichment and profile completeness scoring |

**Rationale for structured free text (not JSONB):** Composition is supplier-entered prose
("70% Cotton, 30% Polyester") that is displayed verbatim to buyers. Forcing JSONB structure
adds complexity with minimal filter benefit at this stage. If AI-parsed breakdown is needed in
a future unit, the composition text is parseable. JSONB can be adopted in a follow-on unit.

#### `color` — `color`

| Property | Value |
|---|---|
| DB column | `color` |
| Type | `VARCHAR(100)`, nullable |
| Validation | Zod string, max 100 — primary color label |
| Index needed | Yes — `(tenant_id, color)` |
| Buyer filter | `color` multi-select (text match, case-insensitive) |
| Supplier data entry | Text input with suggestion list (not hard enum — color naming varies) |
| AI use | Visual attribute for requirement matching |

**Rationale for VARCHAR (not enum):** Color naming in textiles is not standardized ("Ivory",
"Off-White", "Ecru" are distinct trade terms for similar shades). A controlled enum would be
too restrictive. Buyer filter uses case-insensitive substring match or faceted distinct-values
approach. Display-only at buyer side.

#### `width_cm` — `widthCm`

| Property | Value |
|---|---|
| DB column | `width_cm` |
| Type | `DECIMAL(6,2)`, nullable |
| Validation | Zod number, min 1, max 999.99 |
| Index needed | No — range queries adequate via seqscan on tenant subset |
| Buyer filter | Min/max range — `widthMin`, `widthMax` query params |
| Supplier data entry | Numeric input with `cm` label (canonical unit — all values stored in cm) |
| AI use | Physical specification for procurement requirement matching |

#### `construction` — `construction`

| Property | Value |
|---|---|
| DB column | `construction` |
| Type | `VARCHAR(50)`, nullable |
| Validation | Zod enum (application-level) |
| Index needed | Yes — `(tenant_id, construction)` |
| Buyer filter | `construction` enum filter |
| Supplier data entry | Dropdown |
| AI use | Technical construction signal for matching and supply classification |

**Controlled values:**
```
PLAIN_WEAVE
TWILL
SATIN
DOBBY
JACQUARD
TERRY
VELVET
JERSEY
RIB
INTERLOCK
FLEECE_KNIT
MESH
OTHER
```

#### `certifications` — `certifications`

| Property | Value |
|---|---|
| DB column | `certifications` |
| Type | `JSONB`, nullable |
| Validation | Zod array of objects — see A.3 |
| Index needed | GIN index on `certifications` — `(tenant_id, certifications)` composite GIN |
| Buyer filter | `certifications` array-contains filter (by standard name) |
| Supplier data entry | Multi-select checklist with optional cert number input |
| AI use | Trust and compliance signal — **AI must not infer unverifiable cert claims** |

### A.3 Certification JSONB Schema

```ts
// Type: Array of CertificationEntry
interface CertificationEntry {
  standard: string;        // controlled value — see list below
  certNumber?: string;     // optional certificate number (supplier-entered)
  issuedBy?: string;       // optional issuing body name
  validUntil?: string;     // optional ISO 8601 date string
}
```

**Controlled `standard` values:**
```
OEKO_TEX_STANDARD_100
OEKO_TEX_LEATHER_STANDARD
GOTS                       // Global Organic Textile Standard
BCI                        // Better Cotton Initiative
FAIR_TRADE
BLUESIGN
HIGG_INDEX
RECYCLED_CLAIM_STANDARD
GLOBAL_RECYCLE_STANDARD
ISO_9001
SEDEX_SMETA
OTHER
```

**AI rule:** AI systems reading `certifications` may use `standard` as a trust signal for
matching and profiling. AI must never infer that a certification is valid without a
`certNumber` or `issuedBy` being present. The `standard` field alone is a supplier claim —
not independently verified by TexQtic.

---

## B. Attribute Normalization Strategy

### B.1 Decision Matrix

| Field | Strategy | Rationale |
|---|---|---|
| `product_category` | Controlled enum (VARCHAR + Zod enum) | Fixed taxonomy; AI classification depends on stable values |
| `fabric_type` | Controlled enum (VARCHAR + Zod enum) | Finite technical vocabulary; filter quality requires normalization |
| `gsm` | Numeric (DECIMAL) | Continuous range; no enum makes sense |
| `material` | Controlled enum (VARCHAR + Zod enum) | Fibre types are well-defined; multi-select filter requires clean values |
| `composition` | Structured free text (VARCHAR 500) | Too variable for enum; must be human-readable; AI-parseable |
| `color` | Soft free text (VARCHAR 100) | Trade color names are not standardized; enum would lose commercial meaning |
| `width_cm` | Numeric (DECIMAL) | Continuous range; stored in canonical unit (cm) |
| `construction` | Controlled enum (VARCHAR + Zod enum) | Finite technical vocabulary; filter quality depends on clean values |
| `certifications` | JSONB array | Multi-value; needs structured cert metadata; GIN-indexable |

### B.2 Enum Implementation Approach

**DB-level ENUMs are NOT used.** Reason: adding values to a Postgres `CREATE TYPE ... AS ENUM`
requires `ALTER TYPE ... ADD VALUE` which can lock the table in some Postgres versions and makes
rollback harder. `VARCHAR` + application-level Zod enum validation achieves the same correctness
with simpler migration (adding a new value is a code change only, no DDL).

**Prisma model approach:** All enum-like fields stored as `String?` in Prisma, mapped to
`VARCHAR(N)` in DB. Zod validates at API boundary. TypeScript union types define the contract.

### B.3 JSONB for certifications — rationale

Certifications are:
- Multi-valued (an item can hold GOTS + OEKO_TEX + BLUESIGN simultaneously)
- Structured (standard name + optional cert number + optional issuer)
- Sparse (most legacy items have none)
- AI-readable (trust signal)

A separate `catalog_item_certifications` relational table would add schema budget consumption
and join complexity. JSONB with a GIN index achieves adequate query performance
(`@>` containment operator: `WHERE certifications @> '[{"standard":"GOTS"}]'`) and is
sufficient for buyer filter use cases at this scale.

---

## C. AI-Readable Attribute Contract

### C.1 Purpose

This contract defines the structured surface that future AI systems in TexQtic may read from
`CatalogItem` records. It does not implement AI features. It ensures the data schema is shaped
correctly so that future AI features can reliably use these attributes as context for:

- Requirement-to-supplier matching
- Supplier capability matching
- RFQ enrichment
- Profile completeness scoring
- Supply-demand gap analysis
- Trust and discoverability scoring

### C.2 `CatalogItemAIAttributes` Contract

```ts
/**
 * CatalogItemAIAttributes — the structured attribute set readable by TexQtic AI systems.
 * All fields are optional at runtime (null if supplier has not filled them).
 *
 * AI READING RULES (non-negotiable):
 *  1. AI may read all fields in this contract as context for matching and enrichment.
 *  2. AI must not infer that a certification is valid from `standard` alone.
 *     `certNumber` or `issuedBy` must be present to treat a cert as asserted.
 *  3. AI must not expose `price` to buyers under any path. Price is excluded from this contract.
 *  4. AI must not override supplier/buyer access controls. org_id isolation is preserved.
 *  5. AI matching must be explainable: attribute-level rationale must be traceable.
 *  6. AI must not modify this contract's values. It is read-only from the AI perspective.
 *  7. publicationPosture is excluded — access control is not an AI-readable attribute.
 */
interface CatalogItemAIAttributes {
  // Identity
  id: string;
  tenantId: string;               // supplier org — required for scoping
  name: string;
  sku: string | null;
  description: string | null;
  moq: number;

  // Classification
  productCategory: string | null;
  fabricType: string | null;
  construction: string | null;

  // Material
  material: string | null;
  composition: string | null;

  // Physical spec
  gsm: number | null;             // grams per sq. metre
  widthCm: number | null;         // fabric width in centimetres

  // Visual
  color: string | null;

  // Trust / compliance
  certifications: CertificationEntry[] | null;

  // Completeness signals (derived — not stored)
  attributeCompleteness: number;  // 0–1 ratio of non-null textile attributes
  hasCertifications: boolean;

  // Excluded from AI context:
  // - price (Phase 1/2 hard constraint — never exposed to buyer or AI buyer context)
  // - publicationPosture (access control — not an attribute)
  // - active (operational flag — not a product attribute)
  // - imageUrl (binary asset — not a structured attribute)
}
```

### C.3 G-028 Vector Ingestion Extension

The existing `vectorText` for `CATALOG_ITEM` indexing must be extended to include normalized
textile attributes when they are present. This is a design prescription — not implemented in
this unit.

**Current vectorText (from G-028 B1):**
```ts
const vectorText = description ? `${name}\n\n${description}` : name;
```

**Proposed future vectorText (to be implemented in a follow-on slice in this unit):**
```ts
function buildCatalogItemVectorText(item: CatalogItemWithAttributes): string {
  const parts: string[] = [item.name];
  if (item.sku) parts.push(`SKU: ${item.sku}`);
  if (item.description) parts.push(item.description);
  if (item.productCategory) parts.push(`Category: ${item.productCategory}`);
  if (item.fabricType) parts.push(`Fabric type: ${item.fabricType}`);
  if (item.material) parts.push(`Material: ${item.material}`);
  if (item.composition) parts.push(`Composition: ${item.composition}`);
  if (item.construction) parts.push(`Construction: ${item.construction}`);
  if (item.color) parts.push(`Color: ${item.color}`);
  if (item.gsm != null) parts.push(`GSM: ${item.gsm}`);
  if (item.widthCm != null) parts.push(`Width: ${item.widthCm}cm`);
  if (item.certifications?.length) {
    const certNames = item.certifications.map(c => c.standard).join(', ');
    parts.push(`Certifications: ${certNames}`);
  }
  return parts.join('\n');
}
```

**Metadata extension (second arg to `enqueueSourceIngestion`):**
```ts
metadata: {
  name: item.name,
  productCategory: item.productCategory ?? undefined,
  fabricType: item.fabricType ?? undefined,
  material: item.material ?? undefined,
  gsm: item.gsm ?? undefined,
  hasCertifications: (item.certifications?.length ?? 0) > 0,
}
```

### C.4 Completeness Scoring

Profile completeness scoring for suppliers requires a denominator. For `CatalogItem` textile
completeness, the scored fields are the 9 new textile attributes. Formula:

```
attributeCompleteness = (count of non-null textile fields) / 9
```

Textile fields in completeness score:
`productCategory`, `fabricType`, `gsm`, `material`, `composition`, `color`, `widthCm`,
`construction`, `certifications`

A score of 0 means no textile attributes filled. Score of 1 means all 9 present.
This is a computed/derived value — not stored. It is computed at read time for AI context.

### C.5 AI Safety Rules (non-negotiable)

| Rule | Basis |
|---|---|
| AI must not expose price to buyers | Phase 1/2 hard constraint |
| AI must not infer cert validity from standard name alone | No independent verification |
| AI must not bypass org_id isolation | Tenancy is constitutional |
| AI matching rationale must be attribute-traceable | Explainability requirement |
| AI must not modify CatalogItem records | Read-only AI context |
| publicationPosture is not AI-readable | Access control, not product attribute |

---

## D. Supplier-Side Data Entry Design

### D.1 Current form location (App.tsx)

Supplier catalog management lives in `App.tsx` under the `case 'catalog':` branch of
`renderWLCatalogPanel()`. The form is an inline section with `showAddItemForm` toggle
and a separate edit inline form via `editingCatalogItemId`.

Current add-item form fields: `name` (required), `price` (required), `sku`, `imageUrl`,
`description`, `moq` — 6 fields in a 3-column grid.

### D.2 Proposed form extension

The add and edit forms must be extended with textile attribute fields. All 9 new fields
are **optional** (nullable in DB). Suppliers can skip them at item creation and fill later.

**Add to `addItemFormData` and `editItemFormData` state:**
```ts
{
  // existing fields
  name: '', price: '', sku: '', imageUrl: '', description: '', moq: '',
  // new textile attribute fields
  productCategory: '',
  fabricType: '',
  gsm: '',
  material: '',
  composition: '',
  color: '',
  widthCm: '',
  construction: '',
  certifications: [],   // array of { standard, certNumber?, issuedBy?, validUntil? }
}
```

### D.3 Form section design

Textile attributes should appear in a clearly separated section below the existing fields:

```
─── Textile Attributes (optional) ─────────────────────────────────
[ Product Category ▼ ]   [ Fabric Type ▼ ]   [ Construction ▼ ]
[ Material ▼ ]           [ GSM (g/m²)   ]    [ Width (cm)    ]
[ Color                ]
[ Composition (e.g. 70% Cotton, 30% Polyester) __________________ ]
─── Certifications (optional) ──────────────────────────────────────
[ ☐ OEKO-TEX Standard 100  [ Cert # _________ ] ]
[ ☐ GOTS                   [ Cert # _________ ] ]
[ ☐ BCI                    [ Cert # _________ ] ]
[ ☐ Bluesign               [ Cert # _________ ] ]
[ ☐ Recycled Claim Standard [ Cert # ________ ] ]
[ + Other certification ▼  [ Cert # _________ ] ]
```

Dropdowns use the controlled vocabulary lists defined in Section A.2.
GSM, Width, and Composition are free-entry fields within validated ranges.
Certifications are a multi-select checklist with per-cert optional number field.

### D.4 Validation rules

| Field | Rule |
|---|---|
| `productCategory` | Must be one of controlled values if provided; null if blank |
| `fabricType` | Must be one of controlled values if provided; null if blank |
| `gsm` | Number 10–2000, one decimal place; null if blank |
| `material` | Must be one of controlled values if provided; null if blank |
| `composition` | String max 500 chars; null if blank |
| `color` | String max 100 chars; null if blank |
| `widthCm` | Number 1–999.99; null if blank |
| `construction` | Must be one of controlled values if provided; null if blank |
| `certifications` | Array of valid cert objects; `standard` must be in controlled values |

### D.5 Backward compatibility

Existing catalog items: all 9 new columns default to `NULL`. No backfill required at create.
Existing add/edit forms: all new fields pre-populate as empty/null.
Legacy items remain valid and publish-eligible regardless of attribute completeness.
Attribute completeness score of 0 is not a publication blocker.

### D.6 Bulk edit consideration (deferred)

Bulk attribute assignment (e.g., set `material = COTTON` for all items in a category) is
useful for suppliers with large catalogs. This is explicitly deferred to a follow-on unit.
The schema and API design must not block this capability, but it is not implemented here.

---

## E. Buyer-Side Filter Design

### E.1 Filter bar placement

Filter controls appear in Phase B of the buyer catalog, below the keyword search input and
above the item grid:

```
[ Supplier Name h1 ]                                     [← All Suppliers]
[ Browse active catalog items... ]
[ 🔍 Search by name or SKU...                                          ]
[ Filters: [Category ▼] [Fabric Type ▼] [Material ▼] [GSM: 100–400] [✕ Clear filters] ]
[ Active chips: [Cotton ×] [GOTS ×] ]
─────────────────────────────────────────────────────────────────────────
[ Item grid ]
```

### E.2 Filter controls

| Filter | Control type | Source |
|---|---|---|
| Product category | Dropdown (single-select or multi) | Server-side facets or controlled list |
| Fabric type | Dropdown (multi-select) | Controlled list |
| Material | Dropdown (multi-select) | Controlled list |
| GSM range | Range slider / min-max inputs | Numeric range |
| Width range | Min-max inputs (cm) | Numeric range |
| Construction | Dropdown (multi-select) | Controlled list |
| Certification | Multi-select checklist | Controlled list |
| Color | Text input or multi-select | Distinct values from supplier catalog |
| MOQ range | Min-max inputs | Numeric range (uses existing `moq` field) |

### E.3 Active filter chips

Active filters render as dismissable chips below the filter bar:
```
[Cotton ×]   [GOTS ×]   [GSM: 100–300 ×]   [Clear all]
```
Each chip dismisses its individual filter and fires a new fetch (cursor reset).
"Clear all" clears all filters (including keyword search) and reloads full listing.

### E.4 Mobile behavior

On small screens, filter bar collapses to a "Filters" button that opens a bottom drawer or
slide-over panel. Active filter count badge shows on the button (e.g., "Filters (3)").
Keyword search remains always visible above the filter toggle.

### E.5 Filter + keyword search interaction

Filters and keyword search compose (AND logic):
- `q=Cotton` AND `material=COTTON` are sent simultaneously
- Server applies both: keyword OR (name/sku) AND attribute exact-match filters
- Clearing filters does not clear keyword search (and vice versa)
- A single "Clear all" clears both

### E.6 Filter + pagination interaction

| Event | Filter state | Cursor | Grid |
|---|---|---|---|
| Filter change | Updated | null | Full re-fetch with filters |
| Load More | Unchanged | Advances | Appends — all active filters passed |
| Keyword change | Unchanged | null | Full re-fetch with current filters |
| Supplier change (Phase A → B) | Cleared | null | Full listing |

### E.7 Empty state with filters

- `items.length === 0` AND filters active (any non-null filter) AND `q === ''`:
  → "No items match your filters. Try adjusting or clearing the filters."
- `items.length === 0` AND filters active AND `q !== ''`:
  → "No items match your search and filters. Try different terms or clear the filters."
- `items.length === 0` AND no filters AND `q !== ''`:
  → existing "No items match your search..." (SEARCH-FILTER-001 copy — unchanged)
- `items.length === 0` AND no filters AND `q === ''`:
  → existing "This supplier has no active catalog items..." (unchanged)

### E.8 Buyer-visible attribute fields

Not all textile attributes need to appear on the buyer item card. Proposed buyer card addition:

```
[ Item card ]
  Name
  SKU: XXXXX
  [ COTTON · WOVEN · 200 GSM ]        ← attribute chip row (if any present)
  [ OEKO-TEX · GOTS ]                  ← cert chip row (if any present)
  Composition: 70% Cotton, 30% Polyester
  Width: 150cm   Min. Order: 50
  [ Request Quote ]
```

Chips only render if the attribute is non-null. Composition and width render as text only if
non-null. Buyer card must not show `price`, `publicationPosture`, or internal fields.

---

## F. Backend / API Filter Design

### F.1 Extended `querySchema` for buyer catalog route

```ts
const querySchema = z.object({
  // existing
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
  q: z.string().max(100).optional(),
  // textile attribute filters (new)
  productCategory: z.string().max(50).optional(),
  fabricType: z.string().max(50).optional(),
  material: z.array(z.string().max(50)).optional(),   // multi-select: ?material=COTTON&material=LINEN
  construction: z.string().max(50).optional(),
  color: z.string().max(100).optional(),
  gsmMin: z.coerce.number().min(10).max(2000).optional(),
  gsmMax: z.coerce.number().min(10).max(2000).optional(),
  widthMin: z.coerce.number().min(1).max(999.99).optional(),
  widthMax: z.coerce.number().min(1).max(999.99).optional(),
  moqMax: z.coerce.number().int().min(1).optional(),
  certification: z.string().max(50).optional(),       // single cert standard filter (JSONB @> match)
});
```

### F.2 Prisma `where` clause extensions

```ts
where: {
  tenantId: supplierOrgId,
  active: true,
  // keyword search (existing)
  ...(q && q.trim().length > 0 && {
    OR: [
      { name: { contains: q.trim(), mode: 'insensitive' } },
      { sku: { contains: q.trim(), mode: 'insensitive' } },
    ],
  }),
  // textile attribute filters (new — all optional, AND-composed)
  ...(productCategory && { productCategory }),
  ...(fabricType && { fabricType }),
  ...(material && material.length > 0 && { material: { in: material } }),
  ...(construction && { construction }),
  ...(color && { color: { contains: color, mode: 'insensitive' } }),
  ...(gsmMin != null && { gsm: { gte: gsmMin } }),
  ...(gsmMax != null && { gsm: { lte: gsmMax } }),
  ...(widthMin != null && { widthCm: { gte: widthMin } }),
  ...(widthMax != null && { widthCm: { lte: widthMax } }),
  ...(moqMax != null && { moq: { lte: moqMax } }),
  // JSONB certification filter — must use raw query or Prisma raw for @> containment
  // See F.4 for certification filter approach
}
```

### F.3 Extended buyer response `select`

Textile attributes are added to the buyer response once the schema migration is applied:

```ts
select: {
  id: true, name: true, sku: true, description: true, moq: true, imageUrl: true,
  // new textile fields
  productCategory: true,
  fabricType: true,
  gsm: true,
  material: true,
  composition: true,
  color: true,
  widthCm: true,
  construction: true,
  certifications: true,
}
```

**Price remains excluded from buyer select.** `publicationPosture` remains excluded.

### F.4 Certification filter approach

Prisma does not natively support JSONB `@>` containment operators via the standard query API.
Two options:

**Option A (recommended for MVP):** Prisma `$queryRaw` or `$executeRaw` for the certification
filter only, composing with the standard `findMany` via a two-pass approach:
```
1. Apply all non-cert filters via findMany → get itemIds
2. Further filter by certification using raw SQL: WHERE id = ANY($itemIds) AND certifications @> ...
```

**Option B:** Move the full buyer catalog query to a raw SQL query when any cert filter is active.

**Option C (deferred):** Store certifications in a separate relational table
`catalog_item_certifications` for cleaner Prisma querying. Deferred to a follow-on unit.

Recommendation: **Option A** for MVP. Option C for a future schema hardening unit.

### F.5 Pagination under filters

All active filter params must be passed on every Load More request alongside the cursor.
This mirrors the existing `q` passthrough pattern from SEARCH-FILTER-001.

### F.6 Performance / index implications

| Filter | Index strategy |
|---|---|
| `productCategory` | Composite index `(tenant_id, product_category)` |
| `fabricType` | Composite index `(tenant_id, fabric_type)` |
| `material` | Composite index `(tenant_id, material)` |
| `construction` | Composite index `(tenant_id, construction)` |
| `color` | Composite index `(tenant_id, color)` |
| `gsm` range | Seqscan on `(tenant_id, active)` subset — adequate for supplier catalog sizes |
| `widthCm` range | Same as gsm |
| `moq` range | Same as gsm |
| `certifications` (JSONB) | GIN index on `certifications` column |

The existing `(tenant_id, active)` index ensures the tenant-scoped scan is efficient.
Additional composite indexes on frequently-filtered enum columns reduce scan size
for single-attribute filters.

### F.7 RLS safety

Cross-tenant buyer read continues with `SET LOCAL ROLE texqtic_rfq_read` + explicit
`tenantId: supplierOrgId` filter. Adding filter params to the `where` clause does not
change the RLS surface. `texqtic_rfq_read` role has read access to `catalog_items`.
New columns added to the table are readable by this role without additional grant
(column-level permissions are not restricted by default in Postgres unless explicitly set).

---

## G. Migration Plan

### G.1 Migration sequence (mandatory — do not deviate)

```
1. Author SQL migration file at: server/prisma/migrations/<timestamp>_add_textile_attributes/migration.sql
2. Apply via: psql -f <migration.sql> using DATABASE_URL (redacted — see .env)
3. Verify success: no ERROR or ROLLBACK in output
4. Run: pnpm -C server exec prisma db pull
5. Run: pnpm -C server exec prisma generate
6. Restart server
7. Verify: GET /health returns 200
8. Verify: GET /api/tenant/catalog/items returns items with new nullable columns
```

### G.2 SQL migration design

```sql
-- Migration: add_textile_attributes_to_catalog_items
-- Applied via: psql -f migration.sql (DATABASE_URL)
-- Direction: forward only. No rollback in production.

ALTER TABLE catalog_items
  ADD COLUMN IF NOT EXISTS product_category    VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fabric_type         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS gsm                 DECIMAL(6,1),
  ADD COLUMN IF NOT EXISTS material            VARCHAR(50),
  ADD COLUMN IF NOT EXISTS composition         VARCHAR(500),
  ADD COLUMN IF NOT EXISTS color               VARCHAR(100),
  ADD COLUMN IF NOT EXISTS width_cm            DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS construction        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS certifications      JSONB;

-- Composite indexes for enum-type filter fields
CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_product_category
  ON catalog_items (tenant_id, product_category)
  WHERE product_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_fabric_type
  ON catalog_items (tenant_id, fabric_type)
  WHERE fabric_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_material
  ON catalog_items (tenant_id, material)
  WHERE material IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_construction
  ON catalog_items (tenant_id, construction)
  WHERE construction IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_catalog_items_tenant_color
  ON catalog_items (tenant_id, color)
  WHERE color IS NOT NULL;

-- GIN index for JSONB certifications (array containment queries)
CREATE INDEX IF NOT EXISTS idx_catalog_items_certifications_gin
  ON catalog_items USING GIN (certifications)
  WHERE certifications IS NOT NULL;
```

### G.3 Backfill strategy

**No backfill required.** All new columns default to `NULL`. Existing 14 QA seed items
(`QA-B2B-FAB-001` through `QA-B2B-FAB-014`) will have `NULL` for all textile attributes
after migration. They remain valid, active, and publication-eligible.

For QA verification, a separate seed update script (not a migration) will be needed to
populate test values for the seed items. This is a QA concern, not a schema concern.

### G.4 Rollback considerations

- All new columns are nullable — a rollback DROP COLUMN is possible if needed before
  any data is written.
- Once supplier data is present in the new columns, rollback requires data migration.
- All indexes created with `IF NOT EXISTS` and `WHERE IS NOT NULL` (partial) — safe to re-run.
- `prisma db pull` after rollback restores schema to pre-migration state.

### G.5 RLS migration notes

No new RLS policies required. The existing `FORCE RLS` on `catalog_items` keyed on
`app.org_id` covers all new columns automatically. No `GRANT` changes required for the
new columns (inherited from existing table grants to `texqtic_rfq_read` role).

---

## H. Testing Plan

### H.1 Schema / type coverage

- TypeScript: `npx tsc --noEmit` — all new fields in Prisma-generated types must resolve
- New Prisma fields must appear in `@prisma/client` generated types after `prisma generate`
- `CatalogItem` TypeScript interface in `services/catalogService.ts` must be updated

### H.2 Supplier create/update validation tests

```ts
// tests/b2b-supplier-catalog-attributes.test.tsx (or server-side test)
T1: POST with valid productCategory → item created with productCategory
T2: POST with invalid productCategory → 422 validation error
T3: POST with gsm out of range → 422 validation error
T4: POST with certifications array → item created with JSONB stored
T5: PATCH update only fabricType → other fields unchanged
T6: PATCH clear composition (null) → composition set to null
T7: POST without any textile fields → item created with all nulls
T8: POST with composition > 500 chars → 422 validation error
```

### H.3 Buyer API filter tests

```ts
T9: productCategory filter → only matching items returned
T10: fabricType filter → only matching items returned
T11: material multi-select → items matching any selected material returned
T12: gsmMin/gsmMax range → items within range returned
T13: moqMax filter → items with moq ≤ moqMax returned
T14: certification filter → items with matching cert standard returned
T15: combined q + fabricType → AND composition works
T16: filter with no results → empty array, nextCursor null
T17: Load More passes all filter params → correct appended results
T18: certification JSONB filter → containment match only (no partial match on certNumber)
```

### H.4 Buyer UI filter tests

```ts
T19: filter chip renders on active filter
T20: chip dismiss removes filter and fires refetch
T21: "Clear all" removes all filters and search, fires full listing fetch
T22: filter-empty state copy renders when filters active and items=0
T23: filter+search empty state copy renders when both active and items=0
T24: mobile filter drawer opens on "Filters" button click
T25: active filter count badge shows correct count
```

### H.5 Buyer card attribute display tests

```ts
T26: item with productCategory + material + gsm → attribute chip row renders
T27: item with no textile attributes → chip row absent (not empty)
T28: item with certifications → cert chip row renders
T29: composition text renders only when non-null
T30: price not rendered on buyer card
```

### H.6 AI contract descriptor test

```ts
T31: buildCatalogItemVectorText includes all non-null attributes
T32: buildCatalogItemVectorText omits null attributes (no "GSM: null" in output)
T33: attributeCompleteness = filled/9 ratio
T34: hasCertifications = true only when certifications.length > 0
```

### H.7 Legacy item behavior

```ts
T35: legacy item (all textile attrs null) renders correctly in buyer grid (no broken UI)
T36: legacy item passes through buyer API with all null fields
T37: buyer filter with no legacy items in result set → no error
```

### H.8 Pagination under filters

```ts
T38: cursor-based pagination preserves all active filter params across pages
T39: filter change resets cursor to null
```

---

## I. Verification Plan

### I.1 TypeScript

```powershell
npx tsc --noEmit
```
Zero errors required before implementation commit.

### I.2 Backend tests

```powershell
pnpm --dir server exec vitest run ../tests/b2b-supplier-catalog-attributes.test.tsx
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-filters.test.tsx
```

### I.3 Frontend focused tests

```powershell
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-filters.test.tsx
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-listing.test.tsx      # regression
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-search.test.tsx       # regression
pnpm --dir server exec vitest run ../tests/b2b-buyer-catalog-supplier-selection.test.tsx  # regression
```

### I.4 Migration verification

```powershell
# After psql apply:
# 1. Verify no ERROR or ROLLBACK in output
# 2. Run: pnpm -C server exec prisma db pull
# 3. Inspect schema.prisma for new fields
# 4. Run: pnpm -C server exec prisma generate
# 5. Run: GET /health → expect 200
```

### I.5 Seed / fixture verification

After migration, QA seed items (`QA-B2B-FAB-001`–`QA-B2B-FAB-014`) must be updated via
supplier-side form or direct SQL update (authorized separately) with representative textile
attribute values to enable buyer filter testing in production.

### I.6 Production verification checks (M-ATTR series)

| ID | Check |
|---|---|
| M-ATTR-1 | Supplier can add new catalog item with productCategory and fabricType set |
| M-ATTR-2 | Buyer sees attribute chips on item card when attributes non-null |
| M-ATTR-3 | Buyer filter by productCategory returns only matching items |
| M-ATTR-4 | Buyer filter by material (multi-select) returns union of matching items |
| M-ATTR-5 | GSM range filter returns items within range only |
| M-ATTR-6 | Certification filter returns only items with matching cert standard |
| M-ATTR-7 | Filter + keyword search compose correctly (AND) |
| M-ATTR-8 | Load More under active filter preserves filter params |
| M-ATTR-9 | Filter-empty state copy renders when no items match |
| M-ATTR-10 | Legacy items (null attrs) render correctly with no broken UI |
| M-ATTR-11 | Clear all filters restores full listing |
| M-ATTR-12 | Supplier edit updates existing item's textile attributes |

### I.7 Neighbor-path smoke checks

| Path | Check |
|---|---|
| Supplier own catalog listing | Unchanged — no attribute columns in supplier list by default |
| Buyer keyword search | Unchanged — regression suite must still pass |
| RFQ dialog | Unchanged — opening RFQ from a filtered result must work |
| Phase A supplier picker | Unchanged — no textile attrs in supplier picker |

---

## J. Non-Goals

The following are explicitly excluded from this unit:

| Item | Reason |
|---|---|
| AI matching implementation | Deferred — data contracts designed here, features in future unit |
| Supplier-buyer matching algorithm | Requires AI design cycle beyond this unit |
| Embeddings / vector search queries | G-028 vector ingestion extended here in design only |
| RFQ AI assistant | Separate product cycle |
| Document intelligence | Separate product cycle |
| Price disclosure to buyers | Phase 1/2 hard constraint — not authorized |
| PDP (product detail page) | Separate design cycle |
| Relationship-scoped access changes | Separate design cycle |
| Cross-supplier search | Separate API and product authorization required |
| Bulk attribute assignment UI | Deferred follow-on unit |
| Supplier attribute completeness dashboard | Deferred follow-on unit |
| Buyer-side facet counts (e.g., "Cotton (12)") | Deferred follow-on unit |
| Per-item publicationPosture buyer filtering | Deferred follow-on unit |
| Free-form tag/label system | Out of scope — controlled vocabularies only |
| Category hierarchy / taxonomy tree | Out of scope — flat controlled vocabulary |

---

## K. Implementation Slices

### Slice 1 — Schema: SQL migration + Prisma pull + generate

**Files:**
- `server/prisma/migrations/<timestamp>_add_textile_attributes/migration.sql` (create)
- `server/prisma/schema.prisma` (modified after `prisma db pull`)

**Steps:**
1. Author migration SQL (Section G.2)
2. Apply: `psql -f migration.sql` via DATABASE_URL
3. Verify: no ERROR / ROLLBACK
4. Run: `pnpm -C server exec prisma db pull`
5. Run: `pnpm -C server exec prisma generate`
6. Restart server; verify GET /health

**Risk:** Medium. `ALTER TABLE ADD COLUMN` on a live table — Postgres adds nullable columns
without a full table rewrite (safe for production). Partial indexes with `WHERE IS NOT NULL`
are safe concurrent operations in Postgres 12+. GIN index creation may take seconds to minutes
on a large table (background: `CREATE INDEX CONCURRENTLY` should be used in production).

### Slice 2 — Service types and API body schema extensions

**Files:**
- `services/catalogService.ts` — extend `CatalogItem`, `CreateCatalogItemRequest`,
  `UpdateCatalogItemRequest`, `BuyerCatalogItem`, `BuyerCatalogQueryParams`

**Changes:**
- Add all 9 textile fields (nullable) to `CatalogItem` and `BuyerCatalogItem`
- Add optional textile fields to `CreateCatalogItemRequest` and `UpdateCatalogItemRequest`
- Add filter params to `BuyerCatalogQueryParams`
- Define `CertificationEntry` interface

**Risk:** Low. Additive changes. Existing callers unaffected.

### Slice 3 — Backend: supplier create/update body schema extension

**File:** `server/src/routes/tenant.ts`

**Changes:**
- Extend POST and PATCH `bodySchema` with all 9 new textile fields (all optional/nullable)
- Pass new fields to `tx.catalogItem.create/update`
- Extend `writeAuditLog` metadata to include textile attributes
- Extend `buildCatalogItemVectorText` (or inline the extended text) for G-028 B1/B2 ingestion

**Risk:** Low-medium. Additive to bodySchema. Existing required fields (name, price) unchanged.
Must not break existing create/update paths.

### Slice 4 — Backend: buyer catalog API filter extension

**File:** `server/src/routes/tenant.ts`

**Changes:**
- Extend buyer catalog route `querySchema` with all filter params (Section F.1)
- Add Prisma `where` clause extensions for enum filters, range filters (Section F.2)
- Add certification JSONB filter (raw query approach — Section F.4, Option A)
- Extend buyer response `select` to include all textile fields (Section F.3)

**Risk:** Medium. Prisma `where` clause composition must be careful. Certification raw query
requires careful parameter binding to prevent SQL injection.

### Slice 5 — Frontend: supplier-side form extension

**File:** `App.tsx`

**Changes:**
- Extend `addItemFormData` and `editItemFormData` state with 9 new fields
- Add textile attributes form section to add-item and edit-item forms
- Add certification multi-select checklist component (inline or extracted)
- Pass new fields to `createCatalogItem` and `updateCatalogItem` calls

**Risk:** Medium. Form state expansion is mechanical but must not break existing required-field
validation. Certification UX (multi-select with per-cert number) requires careful state management.

### Slice 6 — Frontend: buyer filter bar and filter chips

**File:** `App.tsx`

**Changes:**
- Add filter state variables (`buyerCatalogFilters` object)
- Add filter bar component below search input in Phase B
- Add active filter chip row
- Extend `handleFetchBuyerCatalog` to accept filter params
- Extend `handleLoadMoreBuyerCatalog` to pass current filters
- Extend `getBuyerCatalogItems` call to pass all active filter params
- Add filter-empty and filter+search-empty state copy (Section E.7)
- Add textile attribute display to buyer item card (chips, composition text)

**Risk:** High. This is the largest slice — multiple new state variables, new UI component
surface, interaction with existing search/debounce/pagination. Must be implemented carefully
to preserve all existing SEARCH-FILTER-001 verified behaviors.

### Slice 7 — AI contract descriptor (G-028 extension)

**File:** `server/src/routes/tenant.ts` (extend vectorText builder)

**Changes:**
- Replace inline vectorText construction with `buildCatalogItemVectorText(item)` function
- Extend metadata object passed to `enqueueSourceIngestion`

**Risk:** Low. Purely additive to existing G-028 B1/B2 wiring. No behavior change if
textile attributes are null (output identical to current for legacy items).

### Slice 8 — Tests

**Files:**
- `tests/b2b-supplier-catalog-attributes.test.tsx` (create)
- `tests/b2b-buyer-catalog-filters.test.tsx` (create)
- `tests/b2b-buyer-catalog-ai-contract.test.tsx` (create)

**Coverage:** See Section H — minimum 38 tests across 8 test categories.

### Slice 9 — Seed update + production verification

**Non-code:**
- Update QA seed items via supplier-side form (production or direct SQL — separately authorized)
- Execute M-ATTR-1 through M-ATTR-12 verification checks
- Record production evidence

---

## L. Implementation File Allowlist

### Write (implement):

```
server/prisma/migrations/<timestamp>_add_textile_attributes/migration.sql   — Slice 1
server/prisma/schema.prisma                                                  — Slice 1 (after db pull)
services/catalogService.ts                                                   — Slice 2
server/src/routes/tenant.ts                                                  — Slice 3 + 4 + 7
App.tsx                                                                      — Slice 5 + 6
tests/b2b-supplier-catalog-attributes.test.tsx  (new)                       — Slice 8
tests/b2b-buyer-catalog-filters.test.tsx        (new)                       — Slice 8
tests/b2b-buyer-catalog-ai-contract.test.tsx    (new)                       — Slice 8
```

### Read-only reference (no edit):

```
server/prisma/schema.prisma           — during design; edited in Slice 1 only after db pull
shared/contracts/db-naming-rules.md
shared/contracts/schema-budget.md
shared/contracts/rls-policy.md
shared/contracts/openapi.tenant.json  — must be updated for API contract change
tests/b2b-buyer-catalog-listing.test.tsx          — regression reference
tests/b2b-buyer-catalog-search.test.tsx           — regression reference
tests/b2b-buyer-catalog-supplier-selection.test.tsx — regression reference
docs/adr/ADR-028-vector-store-choice.md
```

### OpenAPI contract update required:

```
shared/contracts/openapi.tenant.json  — ADD: textile attribute fields to CatalogItem response;
                                         ADD: filter params to GET /api/tenant/catalog/supplier/:id/items;
                                         ADD: textile fields to POST/PATCH catalog item body
```

---

## M. Commit Chain (at design close)

```
47be9b8  [TECS-CLOSE] buyer catalog keyword search MVP verified complete   ← last verified close
(this)   [DESIGN] textile catalog attributes filters and AI contracts plan ← this commit
```

---

## N. Risks and Open Questions

| Risk | Severity | Mitigation |
|---|---|---|
| Certification JSONB `@>` filter requires raw query | Medium | Option A (two-pass) avoids Prisma raw for main query; cert filter post-processes |
| `CREATE INDEX CONCURRENTLY` needed for GIN index in production | Medium | Use CONCURRENTLY in migration for zero-downtime |
| Slice 6 (buyer filter bar) is the largest and highest-risk slice | High | Implement and test independently before integration |
| Existing buyer search behavior must be preserved exactly | High | Full regression suite (search + listing + supplier-selection) before commit |
| `color` as free text reduces filter reliability | Medium | Provide suggestion list on supplier entry; future normalization in follow-on |
| Composition (free text) is not machine-parseable as-is | Low | Acceptable for MVP; JSONB structured composition deferred to follow-on |
| Schema budget: "no business-domain tables" in Phase 2 budget | Low | This unit adds zero new tables; budget impact is nil |
| G-028 vectorText extension could affect existing embeddings | Low | Extended text only applies to new/updated items post-implementation; re-index is optional |

---

*Design artifact complete. No code changes in this cycle. Implementation follows explicit authorization from Paresh for each slice.*
