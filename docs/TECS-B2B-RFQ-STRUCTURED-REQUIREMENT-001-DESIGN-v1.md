# TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001 — Design v1

**Unit:** TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001  
**Family:** B2B Buyer — RFQ Layer  
**Type:** DESIGN_ONLY  
**Status:** DESIGN_COMPLETE  
**Author:** Paresh (owner-approved design artifact)  
**Governance:** TexQtic Doctrine v1.4 — Minimal diff · Atomic delivery · Human gate required  
**Date:** 2026-04-26  
**Predecessor:** TECS-AI-FOUNDATION-DATA-CONTRACTS-001 (IMPLEMENTATION_COMPLETE, commit f671995)

---

## Overview

The current RFQ system captures only two buyer inputs: `quantity (Int)` and `buyer_message (String?)`. While functional, this limits the usefulness of an RFQ for both parties: suppliers receive insufficient information to respond accurately, and buyers have no structured way to express stage-specific or logistical requirements.

This design unit establishes the structured requirement layer that will sit atop the existing RFQ baseline, introducing a small set of typed common fields and a JSONB-based stage-aware requirement block — mirroring the successful TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001 precedent.

This is a **DESIGN_ONLY** document. No schema migrations, no API changes, no frontend changes are authorized until the relevant implementation unit is opened and approved by Paresh. All proposed SQL, Zod schemas, and TypeScript types herein are specifications only.

---

## A. Current RFQ Baseline — Repo Truth

### A.1 Prisma Schema (`rfqs` table)

```
model Rfq {
  id               String    (uuid, PK)
  orgId            String    (org_id — canonical tenant boundary)
  supplierOrgId    String    (supplier_org_id)
  catalogItemId    String    (catalog_item_id)
  quantity         Int
  buyerMessage     String?   (buyer_message — max 1000; only structured input today)
  status           RfqStatus (INITIATED | OPEN | RESPONDED | CLOSED)
  createdByUserId  String?
  createdAt        DateTime
  updatedAt        DateTime
  + relations: supplierResponse, catalogItem, createdByUser, buyerOrg, supplierOrg, sourceTrade
}
```

**What is missing:** No delivery fields, no urgency, no stage-aware requirement block, no human-confirmation timestamp, no quantity unit, no sample requirement signal.

### A.2 `rfq_supplier_responses` Table

```
RfqSupplierResponse {
  id, rfqId (unique), supplierOrgId,
  message (String — required, max 1000, free-text only)
  submittedAt, createdAt, updatedAt, createdByUserId
}
```

**Limitation:** Supplier response is free-text only — no structured pricing, lead time, capability match, or delivery confirmation.

### A.3 Current Create Route (POST /tenant/rfqs)

Body schema:
```typescript
z.object({
  catalogItemId: z.string().uuid(),
  quantity: z.number().int().min(1).optional().default(1),
  buyerMessage: z.string().trim().min(1).max(1000).optional(),
}).strict()
```

Audit log: `rfq.RFQ_CREATED` — afterJson includes `{ quantity, buyerMessage, nonBinding: true }`.

### A.4 Current Buyer Dialog (App.tsx — BuyerRfqDialogState)

```typescript
type BuyerRfqDialogState = {
  open: boolean;
  product: CatalogItem | null;
  quantity: string;      // pre-filled from product.moq ?? '1'
  buyerMessage: string;  // textarea, max 1000, optional
  loading: boolean;
  error: string | null;
  success: { rfqId: string; quantity: number } | null;
};
```

Two inputs only: `quantity` (number) + `buyerMessage` (textarea). No structured fields.

### A.5 OpenAPI Contract (`shared/contracts/openapi.tenant.json`)

`CreateBuyerRfqRequest`:
```json
{
  "catalogItemId": "uuid, required",
  "quantity":      "integer, min 1, default 1, optional",
  "buyerMessage":  "string, min 1, max 1000, optional"
}
```

`BuyerRfq` response shape: id, status, org_id, catalog_item_id, item_name, item_sku, quantity, supplier_org_id, buyer_message, created_at, updated_at, created_by_user_id, supplier_response.

`item_unit_price` is returned in `mapBuyerRfqDetail` (existing API behavior) — this is an existing buyer-facing API field and is **not an AI path**. It remains outside AI context per constitutional prohibition.

### A.6 Frontend Service Layer (`services/catalogService.ts`)

```typescript
interface CreateRfqRequest {
  catalogItemId: string;
  quantity?: number;
  buyerMessage?: string;
}
interface BuyerRfqDetail {
  id, status, org_id, catalog_item_id, item_name, item_sku,
  quantity, supplier_org_id, buyer_message: string | null,
  item_unit_price: number, supplier_response, trade_continuity, ...
}
```

`createRfq(payload)` → POST /api/tenant/rfqs  
`getBuyerRfqs()` → GET /api/tenant/rfqs

### A.7 Existing Tests

- `server/tests/rfq-detail-route.shared.test.ts` — shared fixture for supplier-detail route tests
- `tests/runtime-verification-tenant-enterprise.test.ts` — dialog state resolvers (`createInitialBuyerRfqDialogState`, `resolveBuyerRfqSubmitPayload`, etc.)
- `tests/rfq-buyer-list-ui.test.tsx` — UI list rendering, calls `getBuyerRfqs()`
- `tests/stateMachine.g020.test.ts` — trade lifecycle state machine (RFQ_SENT trade state)

### A.8 AI Foundation Status

Per TECS-AI-FOUNDATION-DATA-CONTRACTS-001 (IMPLEMENTATION_COMPLETE, f671995):
- `AI_READABLE_DATA_CLASSES` includes `Rfq.buyerMessage` and `RfqSupplierResponse.message`
- `RFQDraftingContext` interface (`aiContextPacks.ts`) uses `buyerRequirementText` (sourced from `buyerMessage`; requires piiGuard before assembly)
- `price`, `publicationPosture`, `escrow*`, `User.email`, `grossAmount` are constitutionally **FORBIDDEN** from all AI paths
- `humanConfirmationRequired: true` is a literal type on `RFQDraftingContext`

---

## B. Structured RFQ Requirement Model — Field Evaluation

### B.1 Common Typed Columns (Recommended for DB)

The following fields apply across all stages and warrant typed columns for query/filter performance:

| Field | DB Type | Nullable | Max / Enum | Buyer-Visible | Supplier-Visible | AI-Readable | Filter Use |
|---|---|---|---|---|---|---|---|
| `requirement_title` | VARCHAR(200) | YES | 200 chars | ✅ | ✅ | ✅ | ❌ |
| `quantity_unit` | VARCHAR(50) | YES | "kg", "m", "pcs", "rolls", "sets" | ✅ | ✅ | ✅ | ✅ (future) |
| `target_delivery_date` | DATE | YES | ISO date | ✅ | ✅ | ❌ (PII risk) | ✅ (future) |
| `delivery_location` | VARCHAR(200) | YES | 200 chars | ✅ | ✅ | ❌ (PII risk) | ❌ |
| `delivery_country` | VARCHAR(3) | YES | ISO 3166-1 alpha-3 | ✅ | ✅ | ✅ | ✅ (future) |
| `urgency` | VARCHAR(30) | YES | STANDARD\|URGENT\|FLEXIBLE | ✅ | ✅ | ✅ | ✅ (future) |
| `sample_required` | BOOLEAN | YES | true/false/null | ✅ | ✅ | ✅ | ❌ |
| `requirement_confirmed_at` | TIMESTAMPTZ | YES | set at submission | ✅ | ❌ | ❌ (governance metadata) | ❌ |
| `stage_requirement_attributes` | JSONB | YES | see Section C | ✅ | ✅ | ✅ (key fields only) | ❌ |

**Notes:**
- `target_delivery_date` and `delivery_location` are excluded from AI-readable paths (potential PII signal; supplier can use them operationally but AI must not include in prompts)
- `requirement_confirmed_at` records when the buyer explicitly submitted (human-confirmation gate timestamp); NOT visible to supplier
- `buyer_message` is **retained as-is** — becomes the free-text summary / legacy field; no rename at DB or API level

### B.2 Fields NOT Added in v1 (Deferred)

| Field | Reason Deferred |
|---|---|
| `budget_visibility_policy` | Price governance complexity; requires Phase 3+ authorization |
| `acceptable_substitutes` | Product complexity; no catalog-side foundation yet |
| `attachment_ids (JSONB array)` | Requires Supabase Storage + attachment lifecycle; separate unit |
| `certification_requirements (JSONB array)` | Goes into `stage_requirement_attributes` per stage |
| `payment_terms_hint` | Overlaps with escrow/payment governance; constitutionally deferred |
| `quality_grade` | Goes into `stage_requirement_attributes` per stage |
| `revision_count` | Requires RFQ revision lifecycle unit |

---

## C. Stage-Aware Requirement Attributes — `stage_requirement_attributes` JSONB

The `stage_requirement_attributes` JSONB field captures stage-specific buyer requirements that mirror the `stageAttributes` shape already established on `catalog_items`. It is always nullable and fully additive.

### C.1 YARN

```typescript
{
  yarnCount?: string;           // e.g. "40/1", "20/2"
  countSystem?: 'NE' | 'NM' | 'TEX' | 'DENIER';
  fiberComposition?: string;    // e.g. "100% Cotton", "65% Poly 35% Cotton"
  ply?: number;                 // 1–12
  spinningType?: 'RING' | 'OPEN_END' | 'AIR_JET' | 'COMPACT' | 'VORTEX' | 'OTHER';
  endUse?: 'WEAVING' | 'KNITTING' | 'EMBROIDERY' | 'SEWING_THREAD' | 'OTHER';
  requiredCertifications?: string[];  // e.g. ["GOTS", "OEKO-TEX"]
  colorFastness?: string;
}
```

### C.2 FIBER

```typescript
{
  fiberType?: string;           // e.g. "Cotton", "Polyester", "Viscose"
  organicStatus?: 'ORGANIC' | 'CONVENTIONAL' | 'TRANSITIONAL';
  stapleLength?: number;        // mm
  micronaire?: number;
  requiredCertifications?: string[];
}
```

### C.3 FABRIC_WOVEN

```typescript
{
  weaveType?: string;           // "Plain", "Twill", "Satin"
  gsmMin?: number;
  gsmMax?: number;
  widthCmRequired?: number;
  composition?: string;
  colorRequirement?: string;    // "solid only", "print ready", "yarn dyed"
  finish?: string;
  endUse?: 'APPAREL' | 'HOME_TEXTILE' | 'INDUSTRIAL' | 'TECHNICAL';
  requiredCertifications?: string[];
}
```

### C.4 FABRIC_KNIT

```typescript
{
  knitType?: string;            // "Single Jersey", "Interlock", "Rib"
  gsmMin?: number;
  gsmMax?: number;
  stretch?: 'TWO_WAY' | 'FOUR_WAY' | 'NONE';
  composition?: string;
  endUse?: 'APPAREL' | 'HOME_TEXTILE' | 'INDUSTRIAL' | 'TECHNICAL';
  requiredCertifications?: string[];
}
```

### C.5 FABRIC_PROCESSED

```typescript
{
  baseConstruction?: string;
  dyeingMethod?: string;
  printingMethod?: string;
  finish?: string;
  colorDescription?: string;
  requiredCertifications?: string[];
}
```

### C.6 GARMENT

```typescript
{
  garmentType?: string;         // "T-Shirt", "Polo", "Jacket"
  sizeRange?: string;           // "XS-XXL", "S-2XL"
  fit?: string;                 // "Regular", "Slim", "Relaxed"
  gender?: string;              // "Men", "Women", "Unisex", "Kids"
  fabricComposition?: string;
  complianceRequirements?: string[];  // ["REACH", "OEKO-TEX Standard 100"]
  labelingRequirements?: string;
  packagingNotes?: string;
  monthlyRequiredCapacity?: number;
}
```

### C.7 MACHINE

```typescript
{
  machineType?: string;
  brandPreference?: string;
  yearMin?: number;
  conditionAccepted?: 'NEW' | 'REFURBISHED' | 'USED';
  capacityRequirement?: string;
  powerSpec?: string;
  installationSupport?: boolean;
  warrantyRequired?: boolean;
}
```

### C.8 MACHINE_SPARE

```typescript
{
  compatibleMachine?: string;
  partNumber?: string;
  preferredBrand?: string;
  conditionAccepted?: 'NEW' | 'OEM' | 'AFTERMARKET';
  leadTimeAccepted?: number;    // days
}
```

### C.9 PACKAGING

```typescript
{
  packagingType?: string;
  material?: string;
  printingRequired?: boolean;
  foodGrade?: boolean;
  recyclabilityRequired?: boolean;
  complianceRequirements?: string[];
}
```

### C.10 SERVICE

```typescript
{
  serviceType?: string;
  specialization?: string;
  locationCoverageRequired?: string;
  turnaroundDays?: number;
  portfolioRequired?: boolean;
  languagePreference?: string;
  onSiteRequired?: boolean;
}
```

### C.11 SOFTWARE_SAAS

```typescript
{
  softwareCategory?: string;
  deploymentModelRequired?: 'CLOUD' | 'ON_PREMISE' | 'HYBRID';
  integrationRequirements?: string[];
  userSeats?: string;
  supportLevelRequired?: string;
  trialRequired?: boolean;
  securityCertificationsRequired?: string[];
}
```

### C.12 CHEMICAL_AUXILIARY

```typescript
{
  chemicalType?: string;
  applicationStage?: string;
  complianceRequired?: string[];
  sdsRequired?: boolean;
  packSizeRequired?: string;
}
```

### C.13 ACCESSORY_TRIM

```typescript
{
  trimType?: string;
  colorMatchRequired?: boolean;
  finishRequired?: string;
  complianceRequired?: string[];
}
```

### C.14 OTHER / GENERAL (no catalogStage)

```typescript
{ [key: string]: unknown }  // passthrough; no validation applied
```

---

## D. Schema Architecture Options

### Option A — Flat Typed Columns

All fields (common + stage-specific) added as nullable typed columns on the `rfqs` table.

- **Pro:** Fully queryable; Prisma-typed fields; no JSONB parsing.
- **Con:** 30+ new nullable columns; separate migration for every new stage field; rigidity amplifies over time as new stages or requirement types emerge.
- **Risk:** Heavy migration surface; difficult to version stage-specific requirement variants.
- **Verdict:** NOT recommended.

### Option B — Single JSONB Block (`structured_requirement`)

All new fields collapsed into a single `structured_requirement JSONB` column.

- **Pro:** Single migration; schema-less evolution; flexible per stage.
- **Con:** Common fields (urgency, quantity_unit, delivery_country) are not column-queryable; Prisma `Json` type provides no shape guarantees; harder to index or filter on key fields; Zod validation must be applied at route level rather than DB level.
- **Risk:** Common cross-stage filters (e.g., urgency=URGENT) require JSONB path operators; type safety degrades.
- **Verdict:** NOT recommended for common fields.

### Option C — Hybrid (RECOMMENDED)

**Common typed columns + `stage_requirement_attributes` JSONB block.**

This is the same architectural pattern as TECS-B2B-CATALOG-MATERIAL-STAGE-ATTRIBUTES-001, which established `catalogStage VARCHAR(50) + stageAttributes JSONB` on `catalog_items`. Extending this pattern to `rfqs` is consistent and well-understood by the codebase.

- **Pro:** Common fields (urgency, quantity_unit, delivery_country, sample_required, target_delivery_date) are typed, queryable, and Prisma-friendly; stage-specific requirements are flexible JSONB.
- **Pro:** Mirrors established precedent — `stageAttributesSchemas` dispatch pattern already exists in `tenant.ts`.
- **Pro:** Backward-compatible — `buyer_message` and `quantity` retained unchanged.
- **Con:** Still requires a schema migration (one time, small surface).
- **Verdict:** ✅ RECOMMENDED.

### D.1 Recommended New Columns on `rfqs`

```sql
ALTER TABLE rfqs
  ADD COLUMN requirement_title              VARCHAR(200),
  ADD COLUMN quantity_unit                  VARCHAR(50),
  ADD COLUMN target_delivery_date           DATE,
  ADD COLUMN delivery_location              VARCHAR(200),
  ADD COLUMN delivery_country               VARCHAR(3),
  ADD COLUMN urgency                        VARCHAR(30),
  ADD COLUMN sample_required                BOOLEAN,
  ADD COLUMN stage_requirement_attributes   JSONB,
  ADD COLUMN requirement_confirmed_at       TIMESTAMPTZ,
  ADD COLUMN field_source_meta              JSONB;
```

All columns nullable, no defaults required. Existing rows remain valid — all fields will be NULL.

> **Authority note:** SQL must be applied via `psql` using `DATABASE_URL` only. `prisma migrate dev` and `prisma db push` are FORBIDDEN. After SQL is verified, `prisma db pull` then `prisma generate`.

---

## E. AI-Readable RFQ Requirement Context Contract

### E.1 `StructuredRFQRequirementContext` (New Context Pack Type)

This interface extends `RFQDraftingContext` (established in `aiContextPacks.ts`) to incorporate structured requirement data when available. It is defined here for when `TECS-AI-RFQ-ASSISTANT-MVP-001` (one of the 8 future AI units from TECS-AI-FOUNDATION-DATA-CONTRACTS-001 Section Q) is authorized.

```typescript
/**
 * F.2-ext: StructuredRFQRequirementContext
 * Extends RFQDraftingContext with structured buyer requirement fields.
 * Authorized use: AI-assisted RFQ drafting and supplier matching only.
 * NEVER includes: price, publicationPosture, escrow*, grossAmount, User.email, User.name,
 *                 delivery_location (PII risk), target_delivery_date (temporal PII),
 *                 requirement_confirmed_at (governance metadata only).
 */
export interface StructuredRFQRequirementContext extends RFQDraftingContext {
  // Structured requirement summary (assembled from structured fields + buyerMessage)
  requirementSummaryText: string;         // assembled at route boundary; piiGuard applied

  // Common typed fields — AI-readable subset
  quantityUnit: string | null;            // e.g. "kg", "meters"
  urgency: 'STANDARD' | 'URGENT' | 'FLEXIBLE' | null;
  sampleRequired: boolean | null;
  deliveryCountry: string | null;         // ISO 3166-1 alpha-3; NOT delivery_location (too specific)
  catalogStage: string | null;            // carries through from catalog item at RFQ time

  // Stage-specific requirement block — AI-readable fields only (stage-filtered)
  stageRequirementAttributesText: string | null;  // pre-assembled text; raw JSONB never passed to AI

  // Source provenance — always required
  fieldSourceMeta: FieldSourceMetaSummary | null;

  // Inherited from RFQDraftingContext (preserved):
  // humanConfirmationRequired: true     ← literal type, unchanged
  // buyerRequirementText: string        ← now sourced from requirementSummaryText
  // completenessScore: number           ← transient, not stored
  // catalogItemText: string             ← buildCatalogItemVectorText() output
  // retrievedChunks: SimilarityResultRef[]  ← max 3
  // price: EXCLUDED                     ← constitutional prohibition
  // escrow*: EXCLUDED                   ← constitutional prohibition
  // delivery_location: EXCLUDED         ← PII risk
  // target_delivery_date: EXCLUDED      ← temporal PII risk
}

/** Summarized field source provenance — no raw JSONB passed to AI. */
export interface FieldSourceMetaSummary {
  buyerProvidedCount: number;    // how many fields the buyer directly entered
  aiSuggestedCount: number;      // how many fields were AI-suggested (future)
  systemDerivedCount: number;    // how many fields were auto-filled from catalog item
}
```

### E.2 `FieldSource` Enum Design

```typescript
/**
 * Tracks the origin of each structured requirement field.
 * Stored in field_source_meta JSONB on rfqs (future slice only).
 */
export const FIELD_SOURCE_VALUES = ['BUYER_PROVIDED', 'AI_SUGGESTED', 'SYSTEM_DERIVED'] as const;
export type FieldSource = typeof FIELD_SOURCE_VALUES[number];

/**
 * field_source_meta JSONB shape:
 * {
 *   "quantity_unit": "BUYER_PROVIDED",
 *   "urgency": "BUYER_PROVIDED",
 *   "stage_requirement_attributes.yarnCount": "AI_SUGGESTED",   // future
 *   "delivery_country": "SYSTEM_DERIVED"    // if pre-filled from org profile
 * }
 */
```

**Phase 1 (current design target):** Only `BUYER_PROVIDED` and `SYSTEM_DERIVED` are used. `AI_SUGGESTED` is reserved for when TECS-AI-RFQ-ASSISTANT-MVP-001 is authorized. `field_source_meta` column is NULLABLE and the JSON is empty/null in v1.

### E.3 AI Boundary Enforcement

When assembling `requirementSummaryText` for an AI context:

```
ALLOWED to include in assembled text:
  requirement_title, quantity + quantity_unit, urgency, sample_required,
  delivery_country (NOT delivery_location), catalogStage,
  stage_requirement_attributes fields (stage-filtered, text-assembled)
  buyer_message (piiGuard must be applied first)

NEVER include:
  price, publicationPosture, item_unit_price, escrow*
  delivery_location (too specific — PII risk)
  target_delivery_date (temporal PII)
  requirement_confirmed_at (governance metadata)
  User.email, User.name, created_by_user_id
  grossAmount, riskScore, risk_score
```

---

## F. Buyer UX Design

### F.1 Progressive Disclosure Approach

The structured requirement dialog should use **progressive disclosure** — not overwhelm the buyer with all fields at once. The design follows a 3-step model:

**Step 1 — Core:** Quantity + quantity_unit + requirement_title (optional). Pre-fill from catalog item.  
**Step 2 — Stage-Specific (conditional):** If the catalog item has a `catalogStage`, show the 3–5 most relevant `stage_requirement_attributes` fields for that stage (e.g., for YARN: yarnCount, countSystem, fiberComposition; for GARMENT: garmentType, sizeRange, complianceRequirements).  
**Step 3 — Logistics + Summary:** urgency (STANDARD/URGENT/FLEXIBLE toggle), sample_required (checkbox), target_delivery_date (optional), delivery_country (optional), and the existing buyer_message textarea (labeled "Additional notes / special requirements").

**Confirmation step (human gate):** Before submitting, buyer sees a summary card of all filled fields. A "Confirm and Submit RFQ" button sets `requirement_confirmed_at` on the server. This fulfills the `humanConfirmationRequired: true` contract from `RFQDraftingContext`.

### F.2 Auto-Fill from Catalog Item

When the buyer opens the RFQ dialog for a catalog item that has `catalogStage` and `stageAttributes` set:

- `catalogStage` is carried through to `stage_requirement_attributes` context automatically (system-derived)
- Quantity pre-fills from `product.moq` (existing behavior, retained)
- `delivery_country` may be pre-filled from the buyer org profile (system-derived, implementation detail for the implementation unit)

**No price pre-fill:** `item_unit_price` must NEVER be pre-filled into any RFQ requirement field.

### F.3 Updated `BuyerRfqDialogState` (Proposed)

```typescript
// Proposed expansion — implementation detail for the implementation unit
type BuyerRfqDialogState = {
  open: boolean;
  product: CatalogItem | null;

  // Core (Step 1) — unchanged
  quantity: string;

  // New common fields (Step 1 + 3)
  requirementTitle: string;
  quantityUnit: string;
  urgency: 'STANDARD' | 'URGENT' | 'FLEXIBLE' | '';
  sampleRequired: boolean | null;
  targetDeliveryDate: string;   // ISO date string, '' if empty
  deliveryLocation: string;
  deliveryCountry: string;      // ISO alpha-3, '' if empty

  // Stage-specific (Step 2) — only shown when catalogStage known
  stageRequirementAttributes: Record<string, unknown>;

  // Free-text summary (Step 3) — existing field renamed in UI label
  buyerMessage: string;  // API field name unchanged; UI label becomes "Additional notes"

  // Confirmation step
  confirmationStep: boolean;  // false = editing, true = showing summary before submit

  // Existing state
  loading: boolean;
  error: string | null;
  success: { rfqId: string; quantity: number } | null;
};
```

---

## G. Supplier UX / Response Impact

### G.1 Structured Requirement Visibility

When a supplier views an RFQ in their inbox (`GET /tenant/rfqs/inbox/:id`), the structured requirement fields are surfaced as a **Requirement Summary** section:

| Shown to supplier | Hidden from supplier |
|---|---|
| requirement_title | requirement_confirmed_at |
| quantity + quantity_unit | field_source_meta |
| urgency | org_id internal details |
| sample_required | item_unit_price (not part of RFQ record) |
| delivery_country (NOT delivery_location) | |
| stage_requirement_attributes (relevant fields) | |
| buyer_message (if any) | |

**delivery_location is NOT shown to supplier** until a trade/order is confirmed. This is consistent with TexQtic B2B privacy posture.

### G.2 Supplier Response Impact (Phase 1 Non-Goal)

The structured supplier response (adding pricing, lead time, capability match to `rfq_supplier_responses`) is a **separate future unit** (TECS-B2B-RFQ-STRUCTURED-RESPONSE-001). In Phase 1, the supplier response remains free-text (`message` only). The `SupplierRfqDetail` mapper is extended to display the structured requirement block but the response schema is unchanged.

---

## H. API Design

### H.1 Updated `POST /tenant/rfqs` Body Schema (Proposed)

```typescript
// Backward-compatible — all new fields optional
z.object({
  // Existing (unchanged, required)
  catalogItemId: z.string().uuid(),

  // Existing (unchanged, optional)
  quantity: z.number().int().min(1).optional().default(1),
  buyerMessage: z.string().trim().min(1).max(1000).optional(),

  // New common fields (all optional)
  requirementTitle: z.string().trim().min(1).max(200).optional(),
  quantityUnit: z.string().trim().max(50).optional(),
  urgency: z.enum(['STANDARD', 'URGENT', 'FLEXIBLE']).optional(),
  sampleRequired: z.boolean().optional(),
  targetDeliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // ISO date
  deliveryLocation: z.string().trim().max(200).optional(),
  deliveryCountry: z.string().trim().length(3).optional(), // ISO 3166-1 alpha-3
  stageRequirementAttributes: z.record(z.unknown()).optional(),
  requirementConfirmedAt: z.string().datetime().optional(),
}).strict()
```

**Validation note:** When `stageRequirementAttributes` is present and the catalog item has a known `catalogStage`, apply the corresponding `stageAttributesSchemas` validator (same dispatch pattern as catalog item create route — already defined at lines 530–688 in `tenant.ts`).

### H.2 Updated `BuyerRfq` Response Shape (Proposed)

Additive — all new fields nullable in response:

```typescript
// New fields to add to BuyerRfqDetail (services/catalogService.ts)
requirement_title?: string | null;
quantity_unit?: string | null;
urgency?: 'STANDARD' | 'URGENT' | 'FLEXIBLE' | null;
sample_required?: boolean | null;
target_delivery_date?: string | null;    // ISO date
delivery_country?: string | null;
stage_requirement_attributes?: Record<string, unknown> | null;
// delivery_location NOT in API response by default (privacy)
// requirement_confirmed_at NOT in API response (governance metadata)
```

### H.3 OpenAPI Contract Changes

Schemas requiring update in `shared/contracts/openapi.tenant.json`:
- `CreateBuyerRfqRequest` — add new optional fields
- `BuyerRfq` — add new nullable fields
- `BuyerRfqListItem` — add `urgency` and `quantity_unit` (useful for list UX)
- No changes to `SupplierRfqDetail` shape in Phase 1 (supplier response not changed)

### H.4 Audit Log Update

The `rfq.RFQ_CREATED` audit log `afterJson` should include new structured fields in the implementation unit:

```typescript
afterJson: {
  quantity,
  quantityUnit,
  urgency,
  requirementTitle,
  sampleRequired,
  stagePresent: !!stageRequirementAttributes,
  nonBinding: true,
  requirementConfirmed: !!requirementConfirmedAt,
}
```

`buyerMessage` removed from audit log (replaced by `requirementTitle` + structured fields). `delivery_location`, `target_delivery_date`, and raw `stageRequirementAttributes` JSONB must NOT be logged to avoid PII/data proliferation in audit trail.

---

## I. Migration / Backward Compatibility

### I.1 Backward Compatibility Guarantees

| Guarantee | Basis |
|---|---|
| `POST /tenant/rfqs` with only `{ catalogItemId, quantity, buyerMessage }` still works | All new fields nullable/optional |
| Existing RFQ records (`buyer_message` + `quantity` only) remain valid | All new columns nullable, no constraint on existing rows |
| `GET /tenant/rfqs` list response unchanged in shape | New fields nullable — undefined or null in existing records |
| Supplier response route unchanged | No changes to `rfq_supplier_responses` in Phase 1 |
| AI path (`buyerRequirementText`) falls back to `buyer_message` when structured fields absent | Implementation handles null gracefully |

### I.2 Semantic Field Mapping

| Old field | New semantic | Migration action |
|---|---|---|
| `buyer_message` | Free-text summary / legacy path | RETAINED as-is; UI label becomes "Additional notes" |
| `quantity` | Quantity required (numeric) | RETAINED; `quantity_unit` adds unit context |
| no field | `requirement_title` | NEW nullable column |
| no field | `stage_requirement_attributes` | NEW JSONB column |

**No renames at DB or API level.** `buyer_message` and `quantity` remain their canonical names throughout.

---

## J. Audit / AI Boundary — Field Source Governance

### J.1 `fieldSource` Design Pattern

Each structured requirement field should have a declared source so that suppliers and AI systems know whether a value was entered by the buyer, derived from the catalog item, or AI-suggested.

```
BUYER_PROVIDED:   buyer explicitly entered the field in the dialog
SYSTEM_DERIVED:   auto-filled from catalog item (e.g., catalogStage from item)
AI_SUGGESTED:     field value was surfaced by AI assistant (FUTURE — requires TECS-AI-RFQ-ASSISTANT-MVP-001)
```

In Phase 1 (this implementation slice), `field_source_meta` is stored as a JSONB column but populated with only `BUYER_PROVIDED` and `SYSTEM_DERIVED` values. The `AI_SUGGESTED` enum value is reserved but not used until the AI assistant unit is authorized.

### J.2 Human Confirmation Gate

The `requirement_confirmed_at` timestamp records when the buyer explicitly reviewed the structured requirement summary and clicked "Confirm and Submit RFQ."

This fulfills the D-020-C `humanConfirmationRequired` contract established in TECS-AI-FOUNDATION-DATA-CONTRACTS-001:

```
humanConfirmationRequired: true  (literal type on RFQDraftingContext)
```

Even in Phase 1 (buyer-entered requirements, no AI involvement), the human-confirmation timestamp is recorded because it:
1. Makes the requirement contractually explicit (buyer affirms non-binding request)
2. Creates a timestamp anchor for future audit trails
3. Preserves the pattern established for future AI-assisted RFQ drafting

---

## K. Testing Plan

### K.1 Structured Create — New Fields

| Test | Expected |
|---|---|
| POST /tenant/rfqs with structured fields (urgency, quantityUnit, sampleRequired) | Returns 201 with new fields in response |
| POST /tenant/rfqs with stageRequirementAttributes (YARN stage, valid schema) | Validates against YARN schema; stores JSONB |
| POST /tenant/rfqs with stageRequirementAttributes (unknown stage) | Passes through as-is (no stage validation applied) |
| POST /tenant/rfqs with stageRequirementAttributes (GARMENT, invalid fields) | Returns 400 with validation error |
| POST /tenant/rfqs with invalid urgency value | Returns 400 (Zod enum rejection) |
| POST /tenant/rfqs with deliveryCountry of wrong length | Returns 400 (Zod length 3 rejection) |

### K.2 Legacy Path (Backward Compatibility)

| Test | Expected |
|---|---|
| POST /tenant/rfqs with only catalogItemId | Returns 201; new fields null in response |
| POST /tenant/rfqs with catalogItemId + quantity + buyerMessage (existing shape) | Returns 201; full backward compat |
| GET /tenant/rfqs (list) — pre-existing RFQ records | Returns list with new fields as null |

### K.3 Supplier View

| Test | Expected |
|---|---|
| GET /tenant/rfqs/inbox/:id — RFQ with structured fields | Returns structured requirement block; delivery_location absent |
| Supplier sees urgency, quantityUnit, stageRequirementAttributes | Fields present in supplier detail response |
| Supplier does NOT see delivery_location, requirement_confirmed_at | Fields absent from supplier detail shape |

### K.4 AI Boundary Tests

| Test | Expected |
|---|---|
| assembleRequirementSummaryText with delivery_location | delivery_location filtered out by piiGuard |
| assembleRequirementSummaryText with target_delivery_date | target_delivery_date filtered out |
| assembleRequirementSummaryText with price | price filtered out (existing AI_FORBIDDEN_FIELD_NAMES) |
| StructuredRFQRequirementContext — no price field | TypeScript error if price assigned |

### K.5 Dialog State Machine (App.tsx runtime verification)

| Test | Expected |
|---|---|
| `resolveBuyerRfqSubmitPayload` with new fields | Payload includes new fields correctly |
| Dialog with product that has catalogStage='YARN' | Dialog enters Step 2 showing YARN fields |
| Dialog with product that has no catalogStage | Dialog skips Step 2 (only Step 1 + Step 3) |
| Confirmation step renders summary | Summary shows all filled fields before submit |

---

## L. Production Verification Plan

### L.1 Backend Markers

After implementation unit is complete and deployed:

```bash
# Verify schema has new columns
pnpm -C server exec prisma db pull  # after SQL applied
# New fields appear in Prisma schema

# Verify API returns new fields
curl -i -H "Authorization: Bearer <REDACTED>" \
  http://localhost:3001/api/tenant/rfqs
# Response includes quantity_unit, urgency, stage_requirement_attributes as null in existing records

# Verify POST with structured fields
curl -i -X POST -H "Authorization: Bearer <REDACTED>" \
  -H "Content-Type: application/json" \
  -d '{"catalogItemId":"<UUID>","quantity":100,"quantityUnit":"kg","urgency":"STANDARD","sampleRequired":false}' \
  http://localhost:3001/api/tenant/rfqs
# Returns 201 with all new fields in response
```

### L.2 Frontend Markers

- Dialog for YARN-stage item shows yarn-specific fields in Step 2
- Urgency selector visible in Step 3
- Confirmation summary step visible before submit button
- Submission succeeds with legacy shape (no new fields filled) — backward compat confirmed

### L.3 Legacy Compat Marker

- Existing RFQ records in the My RFQs list load without error
- `buyer_message` displayed normally in existing RFQ detail view

---

## M. Non-Goals (Explicit Exclusions from This Unit)

The following are explicitly **out of scope** for TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001 and any implementation unit derived from this design:

| Non-Goal | Why Excluded |
|---|---|
| AI-assisted RFQ drafting or field suggestion | Requires TECS-AI-RFQ-ASSISTANT-MVP-001 (one of 8 future AI units); not authorized |
| Supplier matching / recommendation | Requires vector search infrastructure integration; separate unit |
| Structured supplier response (lead time, pricing) | TECS-B2B-RFQ-STRUCTURED-RESPONSE-001 — separate unit |
| Price disclosure in RFQ context | Constitutionally forbidden; Phase 3+ only |
| Escrow, checkout, payment terms in RFQ | Constitutionally forbidden; no money movement in RFQ |
| Auto-submit RFQ | Human confirmation required; no automated submission |
| Product detail page (PDP) expansion | Separate family; not RFQ scope |
| Relationship-scoped supplier visibility | Future product/design cycle |
| RFQ document attachments (PDF, specs) | Requires Supabase Storage lifecycle unit |
| RFQ revision lifecycle | Separate unit |
| Budget visibility policy | Price governance; Phase 3+ |

---

## N. Proposed Implementation Slices

These slices are **design proposals only**. Each must be opened as a separate implementation unit with Paresh authorization. No slice is pre-authorized by this design document.

### Slice 1 — DB Migration (backend only)

**Files:** `server/prisma/schema.prisma`, SQL migration file  
**Actions:** Apply ALTER TABLE SQL (Section D.1) → `prisma db pull` → `prisma generate`  
**Constraint:** SQL applied via `psql` + `DATABASE_URL` only. No `prisma migrate dev`.

### Slice 2 — Backend Route Validation + Persistence

**Files:** `server/src/routes/tenant.ts`  
**Actions:** Extend POST /tenant/rfqs Zod schema + Prisma create call to persist new fields. Reuse `stageAttributesSchemas` dispatch pattern for `stageRequirementAttributes` validation.  
**Constraint:** Strict backward compat — legacy body shape must remain valid.

### Slice 3 — Backend Response Mappers

**Files:** `server/src/routes/tenant.ts` (mapper functions)  
**Actions:** Extend `mapBuyerRfqDetail`, `mapBuyerRfqListRow`, `mapSupplierRfqDetail` to include new fields. Apply supplier visibility rules (omit `delivery_location`, `requirement_confirmed_at`).

### Slice 4 — OpenAPI Contract Update

**Files:** `shared/contracts/openapi.tenant.json`  
**Actions:** Update `CreateBuyerRfqRequest`, `BuyerRfq`, `BuyerRfqListItem` schemas.

### Slice 5 — Frontend Service Types

**Files:** `services/catalogService.ts`  
**Actions:** Extend `CreateRfqRequest`, `BuyerRfqDetail`, `BuyerRfqListItem` interfaces with new optional fields.

### Slice 6 — Buyer Dialog UX

**Files:** `App.tsx` (or extracted `BuyerRfqDialog` component)  
**Actions:** Expand `BuyerRfqDialogState`, implement 3-step progressive disclosure, add stage-aware field rendering, add confirmation step.  
**Constraint:** No refactor of surrounding App.tsx structure. Add only what is necessary for the dialog expansion.

### Slice 7 — Tests

**Files:** Relevant test files in `tests/` and `server/tests/`  
**Actions:** Add test coverage per Section K. Update existing dialog state resolver tests to include new fields.

### Slice Allowlist Summary (per implementation unit)

| Slice | Files Modified |
|---|---|
| 1 | `server/prisma/schema.prisma`, `server/prisma/migrations/<new>.sql` |
| 2 | `server/src/routes/tenant.ts` |
| 3 | `server/src/routes/tenant.ts` |
| 4 | `shared/contracts/openapi.tenant.json` |
| 5 | `services/catalogService.ts` |
| 6 | `App.tsx` (dialog only) |
| 7 | `tests/runtime-verification-tenant-enterprise.test.ts`, `tests/rfq-buyer-list-ui.test.tsx`, `server/tests/rfq-detail-route.shared.test.ts` |

---

## O. Governance Compliance

| Contract | Status |
|---|---|
| `shared/contracts/db-naming-rules.md` | All new column names follow snake_case convention; JSONB field `stage_requirement_attributes` mirrors `stage_attributes` precedent |
| `shared/contracts/schema-budget.md` | 9 new nullable columns + 1 JSONB; within budget for a core B2B table expansion |
| `shared/contracts/rls-policy.md` | RLS on `rfqs` table already enforces `org_id` scoping; new columns inherit RLS automatically |
| `shared/contracts/openapi.tenant.json` | All API shape changes specified in Section H; must be updated atomically with backend changes |
| `shared/contracts/event-names.md` | No new events introduced; existing `rfq.RFQ_CREATED` event reused with extended audit payload |
| TECS-AI-FOUNDATION-DATA-CONTRACTS-001 | AI boundary rules respected; `StructuredRFQRequirementContext` extends without weakening; price/PII exclusions confirmed |
| TexQtic Doctrine v1.4 | Minimal diff; additive only; backward-compatible; human gate preserved; no money movement |

---

## P. Risks and Pre-Implementation Checks

| Risk | Mitigation |
|---|---|
| JSONB `stage_requirement_attributes` validation bypass | Apply `stageAttributesSchemas` dispatch at route boundary before Prisma write |
| `delivery_location` PII leakage to supplier | Explicit omission in mapper (Section G.1); covered by test (Section K.3) |
| `delivery_location` PII leakage to AI | Explicit omission in `StructuredRFQRequirementContext` and `assembleRequirementSummaryText` (Section E.3) |
| Backward compat regression in existing tests | Legacy body shape test required in Slice 7 (Section K.2) |
| `field_source_meta` JSONB growing unbounded | Max keys bounded by field count (< 15); no compaction needed |
| Multiple slices creating mid-flight API inconsistency | Slices 2+3 (backend) must be deployed together; Slices 4+5 (contract+types) must be deployed together; Slice 6 (frontend) can follow |

---

*Design artifact complete. No implementation authorized. Awaiting Paresh sign-off on first implementation unit.*
