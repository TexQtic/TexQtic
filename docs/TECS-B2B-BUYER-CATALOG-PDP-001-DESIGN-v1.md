# TECS-B2B-BUYER-CATALOG-PDP-001 — Design v1

**Unit ID:** TECS-B2B-BUYER-CATALOG-PDP-001
**Status:** DESIGN_ACTIVE
**Authorized by:** Paresh (design-only authorization — implementation NOT opened)
**Design date:** 2026-04-27
**Governance unit type:** B2B Buyer Catalog — Product Detail Page
**Predecessor unit:** TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 (VERIFIED_COMPLETE, 2026-04-27)
**Predecessor catalog units:**
  - TECS-B2B-BUYER-CATALOG-BROWSE-001 (VERIFIED_WITH_NON-BLOCKING_NOTES)
  - TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001 (VERIFIED_COMPLETE)
  - TECS-B2B-BUYER-CATALOG-TEXTILE-ATTRIBUTES-FILTERS-001 (VERIFIED_COMPLETE)

> **Design-only document.** No code changes, schema changes, API implementation, frontend
> implementation, RFQ prefill, price disclosure, DPP Passport, or AI matching are included in
> this artifact. Each implementation slice requires explicit Paresh authorization before opening.

---

## A. Problem Statement

### A.1 Why PDP Is Needed

TexQtic's B2B buyer catalog provides discovery: browse, filter, and supplier-select surfaces
allow a buyer to find relevant items. However, discovery alone is not sufficient for commercial
intent. In B2B textile procurement, a buyer must evaluate an item before they can commit to an
RFQ — and that evaluation requires item-level depth that a listing card cannot provide.

The Product Detail Page (PDP) is the decision surface between browsing and commercial action.

Four compounding gaps exist in the current state:

1. **No item-level depth.** The catalog listing provides a card view — item title, supplier
   thumbnail, category, textile attributes. There is no page where a buyer can see the full
   item specification, material composition, construction details, media gallery, or
   compliance summary in one place.

2. **RFQ entry has no item context.** The existing RFQ dialog is triggered from the listing
   card. It passes minimal item context into the RFQ form. A buyer initiating an RFQ without
   full item context is more likely to ask redundant questions, receive misaligned supplier
   quotes, or abandon the inquiry. Item-depth before RFQ reduces friction and improves
   commercial conversion.

3. **Compliance and certification are invisible at item level.** TexQtic has invested in
   AI-assisted document intelligence and certification lifecycle state machines. None of this
   intelligence reaches the buyer at the item level. A buyer cannot see whether an item has
   verified certifications (GOTS, OEKO-TEX, ISO 9001, REACH) or lab test results from the
   catalog. The trust signal gap reduces buyer confidence.

4. **Supplier context is underrepresented.** A listing card shows a supplier display name.
   The buyer has no place to see supplier capacity summary, lead time, MOQ policy, or
   quality credentials in context of the specific item they are evaluating.

### A.2 What This Unit Solves (MVP)

The PDP MVP creates the buyer-facing item detail view that:
- Renders complete item identity, title, description, category, and stage.
- Shows a media gallery (product images, fabric swatches, samples).
- Renders the full textile specification block.
- Surfaces a compliance/certification summary using only human-reviewed approved data.
- Shows the supplier display summary (name, MOQ, capacity, lead time where available).
- Provides the RFQ entry trigger that passes item context into the RFQ flow.
- Shows a safe price placeholder (`Price available on request`).
- Enforces buyer-authenticated, tenant-safe visibility boundaries.

The PDP MVP is **not** a public product page, a pricing engine, a DPP passport, a relationship
visibility gate, or an AI-augmented product page. It is a safe, structured item detail surface
that converts catalog browsing into commercial intent.

### A.3 Position in the Catalog → RFQ Chain

```
Catalog Browse/Search
        ↓
 Supplier Selection
        ↓
 Catalog Listing View    ← Current verified posture
        ↓
 Product Detail Page     ← This unit (PDP MVP)
        ↓
 RFQ Entry Trigger       ← Handoff boundary; full RFQ → TECS-B2B-BUYER-RFQ-INTEGRATION-001
        ↓
 Price Disclosure        ← TECS-B2B-BUYER-PRICE-DISCLOSURE-001 (future)
        ↓
 Relationship Access     ← TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 (future)
        ↓
 DPP Passport            ← TECS-DPP-PASSPORT-FOUNDATION-001 (future)
        ↓
 AI Supplier Matching    ← TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 (future)
```

### A.4 Relationship to Existing Modules

| Module | Relationship |
|---|---|
| Catalog listing (`catalogService.ts`, tenant route `/catalog`) | PDP reads the same catalog items; new read endpoint needed for item-detail contract |
| Textile attributes (`catalog_items` columns: `fabric_type`, `gsm`, `material`, etc.) | Rendered in full on PDP specifications block |
| Certification lifecycle SM (G-022) | Compliance summary reads APPROVED certifications only via safe projection |
| AI document intelligence (TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001) | Human-reviewed, APPROVED extracted fields only may surface on PDP; drafts must not |
| RFQ flow (TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001) | PDP triggers RFQ dialog, passing itemId + supplierId + itemTitle + category/stage |
| AI RFQ Assistant (TECS-AI-RFQ-ASSISTANT-MVP-001) | Downstream; not triggered from PDP in MVP |
| Supplier profile completeness (TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001) | MOQ/lead-time fields if available feed PDP availability block |
| `document_embeddings` (G-028 / RAG) | Not consumed by PDP in MVP |

---

## B. MVP Scope

### B.1 MVP Included

| Feature | Description |
|---|---|
| Item identity block | `itemId`, `title`, `category`, `stage`, `description` |
| Media gallery | Product images, fabric swatch photos, sample images |
| Textile specification block | All textile attributes: `fabric_type`, `gsm`, `material`, `composition`, `color`, `width_cm`, `construction`, `product_category` |
| Compliance / certification summary | Certificate type, issuer name (if APPROVED), expiry date (if APPROVED), doc status summary — human-reviewed only |
| Supplier summary card | Supplier display name, MOQ (if available), capacity indicator (if available), lead time (if available) |
| Availability summary | MOQ threshold, lead time range, supply status indicator |
| Price placeholder | Static `Price available on request` — no pricing logic |
| RFQ entry trigger | Button/card that passes item context to RFQ dialog |
| Safety / visibility notices | Price-on-request label, human-review notices on compliance data |
| Buyer-authenticated access boundary | Requires authenticated buyer workspace session; no public view |

### B.2 Explicitly Excluded from MVP

| Excluded Item | Reason / Future Unit |
|---|---|
| Price disclosure rules | TECS-B2B-BUYER-PRICE-DISCLOSURE-001 |
| Relationship-scoped catalog visibility | TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 |
| AI supplier matching / ranking | TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 |
| DPP Passport publication | TECS-DPP-PASSPORT-FOUNDATION-001 |
| Checkout / cart from PDP | Product policy — B2B is RFQ-first |
| Escrow / payment from PDP | Constitutionally forbidden from PDP |
| Buyer-specific negotiated terms | Relationship access gated |
| Public SEO PDP | No public product pages in MVP |
| AI document intelligence draft fields | Draft extraction data must not surface to buyer |
| Unreviewed certification data | Only APPROVED human-reviewed cert data visible |
| Internal document IDs or storage URLs | Security boundary — never exposed to buyer |
| Admin-only fields | Never surfaced in buyer-facing view |
| AI confidence scores | Internal; never surfaced in buyer view |
| Multi-item RFQ composition | TECS-B2B-BUYER-RFQ-INTEGRATION-001 |
| Supplier comparison across PDP | Future; requires separate product cycle |
| TradeTrust Pay | Future; not available in current platform |
| Bulk ordering from PDP | B2B is RFQ-first; no bulk add |
| Cross-supplier competitive pricing | TECS-B2B-BUYER-PRICE-DISCLOSURE-001 |

### B.3 MVP Scale Assumptions

- Single item view per PDP load.
- PDP is triggered from a catalog listing card (item row click or explicit "View Details" action).
- PDP operates within the authenticated buyer B2B workspace shell.
- Media gallery handles 0–N images; graceful empty state if no media uploaded.
- Certification summary shows 0–N APPROVED certificates; graceful empty state.
- Textile attributes show available fields; gracefully hides null fields (no "null" displayed).
- Language: English primary; all UI copy in English.

---

## C. PDP Data Model — Read Contract (Design Only)

> **Implementation note:** This is a design-level read contract only. No route, service, or
> Prisma code is included here. Implementation requires explicit Paresh authorization (Slice P-1).

### C.1 BuyerCatalogPdpView

```typescript
// Design-level read contract — not implemented
interface BuyerCatalogPdpView {
  itemId: string;
  supplierId: string;
  supplierDisplayName: string;
  title: string;
  description: string | null;
  category: string | null;
  stage: string | null;
  media: CatalogMedia[];
  specifications: CatalogSpecification;
  complianceSummary: ComplianceSummary;
  availabilitySummary: AvailabilitySummary;
  rfqEntry: RfqEntryDescriptor;
  pricePlaceholder: PricePlaceholder;
}
```

### C.2 Supporting Types (Design Level)

```typescript
// Media item — signed/controlled access only; no raw storage URLs
interface CatalogMedia {
  mediaId: string;
  mediaType: 'image' | 'swatch' | 'sample';
  altText: string | null;
  signedUrl: string;            // Always signed/controlled; never raw Supabase storage URL
  displayOrder: number;
}

// Textile specification — maps to existing catalog_items columns
interface CatalogSpecification {
  productCategory: string | null;   // product_category
  fabricType: string | null;        // fabric_type
  gsm: number | null;               // gsm
  material: string | null;          // material
  composition: string | null;       // composition
  color: string | null;             // color
  widthCm: number | null;           // width_cm
  construction: string | null;      // construction
  certifications: string[] | null;  // certifications (JSONB, buyer-safe label list only)
}

// Compliance summary — APPROVED human-reviewed records only
interface ComplianceSummary {
  hasCertifications: boolean;
  certificates: CertificateSummaryItem[];
  humanReviewNotice: string;        // Structural constant; always present
}

interface CertificateSummaryItem {
  certificateType: string;          // e.g., 'GOTS', 'OEKO-TEX', 'ISO 9001'
  issuerName: string | null;        // From APPROVED record only
  expiryDate: string | null;        // ISO8601 date string or null
  status: 'APPROVED' | 'EXPIRING_SOON';  // Only APPROVED records shown; EXPIRING_SOON advisory
  // NEVER include: documentId, internalFileId, extractionDraftId, confidenceScore,
  //                adminNotes, sourceFileUrl, drafts, rejectedCerts
}

// Availability summary — populated from supplier-entered data if available
interface AvailabilitySummary {
  moqValue: number | null;          // Minimum order quantity
  moqUnit: string | null;           // e.g., 'meters', 'pieces', 'kg'
  leadTimeDays: number | null;      // Lead time in business days
  capacityIndicator: 'available' | 'limited' | 'on_request' | null;
}

// RFQ entry descriptor — passes context to RFQ trigger; no full RFQ logic here
interface RfqEntryDescriptor {
  triggerLabel: string;             // 'Request Quote' | 'Ask Supplier' | 'Add to RFQ Draft'
  itemId: string;
  supplierId: string;
  itemTitle: string;
  category: string | null;
  stage: string | null;
  // NOTE: Full RFQ prefill and multi-item RFQ are future scope:
  // TECS-B2B-BUYER-RFQ-INTEGRATION-001
}

// Price placeholder — no pricing logic
interface PricePlaceholder {
  label: 'Price available on request';
  subLabel: 'RFQ required for pricing' | null;
  note: string | null;
  // NEVER include actual price data, supplier price tiers, or negotiated pricing
}
```

### C.3 Read Contract Boundaries

| Field Class | Allowed in BuyerCatalogPdpView | Reason |
|---|---|---|
| Approved certification fields | ✅ | Human-reviewed; APPROVED status only |
| AI extraction draft fields | ❌ | Draft data must not surface to buyer |
| AI confidence scores | ❌ | Internal governance data |
| Admin notes | ❌ | Admin-only fields |
| Raw storage URLs | ❌ | Security — signed access only |
| Internal document IDs | ❌ | Never in buyer-facing contract |
| Supplier-private pricing | ❌ | Price disclosure gated |
| Cross-tenant supplier data | ❌ | Tenancy boundary enforced |
| org_id | ❌ (internal only) | Scoped server-side; never in response |

### C.4 Tenant Safety

The PDP read endpoint must:
- Require authenticated buyer session (`org_id` from session context).
- Scope `catalogService` query by `org_id` before any item lookup.
- Validate `itemId` belongs to a supplier the authenticated buyer is permitted to view.
- Return HTTP 404 (not 403) for items outside buyer-visible scope to avoid information leakage.
- Return only fields in the `BuyerCatalogPdpView` contract; no internal fields.
- Use signed media URLs; never expose raw Supabase Storage paths.

---

## D. UI Information Architecture

### D.1 Section Map

The PDP is composed of the following sections, in display order:

| # | Section | Content | MVP |
|---|---|---|---|
| 1 | Hero | Item title, category badge, stage badge, supplier name, primary image | ✅ |
| 2 | Media gallery | Full-width image carousel / grid (product images, swatches, samples) | ✅ |
| 3 | Item overview | Full description, key attributes summary | ✅ |
| 4 | Textile specifications | All specification fields rendered as labeled attribute grid | ✅ |
| 5 | Supplier summary | Supplier display name, MOQ, lead time, capacity indicator, contact CTA | ✅ |
| 6 | Compliance / certification summary | Certificate type, issuer, expiry, status badge; human-review notice | ✅ |
| 7 | Availability / MOQ / lead time | Structured availability block with MOQ and lead time | ✅ |
| 8 | RFQ entry card | Primary CTA — `Request Quote` / `Ask Supplier`; item context pre-loaded | ✅ |
| 9 | Price placeholder | `Price available on request` with RFQ prompt | ✅ |
| 10 | Safety / visibility notices | Compliance human-review label, price-on-request notice | ✅ |

### D.2 Desktop Layout (≥ 1024px)

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Back to Catalog]                                                   │
├──────────────────────────────────────────────────────────────────────┤
│  HERO SECTION                                                        │
│  [Primary Image]        Item Title (large)                           │
│                         Category badge · Stage badge                 │
│                         Supplier: [SupplierDisplayName]              │
│                         ─────────────────────────────               │
│                         Price available on request                   │
│                         [Request Quote] ← Primary CTA               │
├──────────────────────────────────────────────────────────────────────┤
│  MEDIA GALLERY (full width)                                          │
│  [img1] [img2] [img3] [swatch1] [sample1]                           │
├────────────────────────────────────┬─────────────────────────────────┤
│  ITEM OVERVIEW (left col)          │  RFQ ENTRY CARD (right col)     │
│  Full description                  │  ┌─────────────────────────┐   │
│                                    │  │ Request a Quote         │   │
│  TEXTILE SPECIFICATIONS            │  │ Item: [title]           │   │
│  Product Category: [value]         │  │ Supplier: [name]        │   │
│  Fabric Type:      [value]         │  │ Category: [value]       │   │
│  GSM:              [value]         │  │                         │   │
│  Material:         [value]         │  │ [Request Quote button]  │   │
│  Composition:      [value]         │  └─────────────────────────┘   │
│  Color:            [value]         │                                 │
│  Width (cm):       [value]         │  AVAILABILITY SUMMARY          │
│  Construction:     [value]         │  MOQ: [value] [unit]           │
│  Certifications:   [badges]        │  Lead time: [value] days       │
│                                    │  Capacity: [indicator]         │
│  COMPLIANCE SUMMARY                │                                 │
│  ⚠ AI-generated extraction ·      │  SUPPLIER SUMMARY              │
│    Human review required           │  [SupplierDisplayName]         │
│  [GOTS · Issuer · exp. 2025-12-31] │  [Contact Supplier CTA]        │
│  [OEKO-TEX · Issuer · exp. 2026-06]│                                 │
└────────────────────────────────────┴─────────────────────────────────┘
```

### D.3 Mobile Layout (< 768px)

```
┌────────────────────────┐
│ [← Back to Catalog]    │
│ HERO                   │
│ [Primary image, full]  │
│ Item Title             │
│ [Category] [Stage]     │
│ Supplier: [name]       │
│ Price available...     │
│ [Request Quote] ← CTA  │
├────────────────────────┤
│ MEDIA GALLERY (scroll) │
│ [img] [img] [swatch]   │
├────────────────────────┤
│ ITEM OVERVIEW          │
│ [description]          │
├────────────────────────┤
│ TEXTILE SPECIFICATIONS │
│ [attribute grid]       │
├────────────────────────┤
│ AVAILABILITY SUMMARY   │
│ MOQ · Lead time        │
├────────────────────────┤
│ COMPLIANCE SUMMARY     │
│ ⚠ Human review notice  │
│ [cert badges]          │
├────────────────────────┤
│ SUPPLIER SUMMARY       │
│ [name, CTA]            │
├────────────────────────┤
│ RFQ ENTRY CARD         │
│ [Request Quote button] │
└────────────────────────┘
```

### D.4 Empty State Handling

| Section | Empty State Treatment |
|---|---|
| Media gallery | Placeholder graphic: "No images uploaded yet" |
| Textile specifications | Show only non-null fields; hide null attribute rows entirely |
| Compliance summary | "No certifications available" with no error |
| Availability summary | Show "Available on request" for null MOQ/lead time |
| Supplier summary | Always present (supplier context is required for PDP to load) |

---

## E. RFQ Entry Trigger Design

> Full RFQ prefill and multi-item RFQ are **future scope** under TECS-B2B-BUYER-RFQ-INTEGRATION-001.
> This section defines the trigger boundary only.

### E.1 Trigger Surface

The PDP exposes a single primary RFQ entry trigger. It must:

- Be visually prominent in both desktop (right column) and mobile (bottom CTA) layout.
- Display one of the following labels (implementation selects most appropriate):
  - `Request Quote`  ← preferred primary label
  - `Ask Supplier`
  - `Add to RFQ Draft`
- Carry `data-testid="buyer-catalog-pdp-rfq-entry"`.

### E.2 Context Passed to RFQ Trigger

The trigger, when activated, must pass the following context into the existing RFQ dialog:

```typescript
RfqTriggerPayload {
  itemId: string;           // Required
  supplierId: string;       // Required
  itemTitle: string;        // Pre-fills item description in RFQ form
  category: string | null;  // Pre-fills category selection if present
  stage: string | null;     // Pre-fills stage selection if present
}
```

### E.3 Trigger Boundaries

| What the trigger does | Status |
|---|---|
| Opens existing RFQ dialog / form | ✅ MVP |
| Passes itemId, supplierId, title, category, stage | ✅ MVP |
| Pre-fills RFQ structured requirement form | Future — TECS-B2B-BUYER-RFQ-INTEGRATION-001 |
| Multi-item RFQ basket composition | Future — TECS-B2B-BUYER-RFQ-INTEGRATION-001 |
| Auto-submits RFQ | ❌ Forbidden — human confirmation required |
| Triggers AI RFQ Assistant immediately | ❌ Not from PDP in MVP |
| Shows negotiated pricing in trigger context | ❌ Price disclosure gated |

### E.4 Unauthenticated State

If session is not authenticated, the RFQ trigger must:
- Be hidden or replaced with a disabled state + "Login to request a quote" prompt.
- Not expose item data to unauthenticated sessions beyond the public-safe subset.
- Not allow RFQ submission without a valid buyer session.

---

## F. Compliance / Certification Display Design

### F.1 Safety Boundary

**Only APPROVED, human-reviewed certification records may be shown on the buyer PDP.**

This is a structural boundary, not a UI preference. It enforces the AI document intelligence
human review doctrine: draft extraction data must never surface in buyer-facing views.

The required governance notice must appear on every compliance surface:

> `AI-generated extraction · Human review required before acting on any extracted data`

This label is structural and must not be made conditional, hidden, or removed.

### F.2 Safe Display Fields (APPROVED records only)

| Field | Display Treatment |
|---|---|
| Certificate type | Label/badge (e.g., `GOTS`, `OEKO-TEX`, `ISO 9001`, `REACH`) |
| Issuer name | Shown if APPROVED and available |
| Expiry date | Shown as `Valid until [date]`; `EXPIRING_SOON` advisory if within 90 days |
| Status | `Approved` badge (green); `Expiring Soon` badge (amber) |

### F.3 Forbidden in Buyer PDP

| Data | Reason |
|---|---|
| AI extraction draft fields | Draft data must not reach buyer |
| AI confidence scores | Internal governance data |
| Unreviewed extraction data | Must not appear before human approval |
| Internal document IDs | Never exposed to buyer |
| Raw Supabase Storage URLs | Security — signed access only |
| Admin notes | Admin-only context |
| Source file paths | Never in buyer view |
| REJECTED or PENDING certs | Only APPROVED records visible |

### F.4 No Certification Empty State

If a supplier has no APPROVED certifications, the compliance section shows:

> "No certification records available for this item."

This must not imply the supplier is non-compliant — it reflects data availability only.

### F.5 Future DPP Integration (Marked Future-Only)

Digital Product Passport (DPP) certification fields and passport publication surfaces
are **future scope** under **TECS-DPP-PASSPORT-FOUNDATION-001**.

The PDP compliance section must not include any DPP-specific fields, QR codes, or
passport publication buttons in MVP. A placeholder design note may indicate DPP
connectivity is planned, but no implementation is permitted here.

---

## G. Price Boundary Design

### G.1 MVP Price Treatment

The PDP shows a **safe price placeholder only**. No pricing logic, price tier evaluation,
relationship-scoped price rules, or supplier pricing APIs are involved in this unit.

**Required placeholder content:**

- Primary label: `Price available on request`
- Secondary label (optional): `RFQ required for pricing`
- Optional note: `Pricing is confirmed through the quote process`

### G.2 What Must Not Appear

| Prohibited Content | Reason |
|---|---|
| Supplier price per unit | Price disclosure gated — TECS-B2B-BUYER-PRICE-DISCLOSURE-001 |
| Price tiers by MOQ | Price disclosure gated |
| Negotiated / relationship-specific price | Relationship access gated |
| "From $X / meter" or any unit price | Price disclosure gated |
| Historical order prices | Price disclosure gated |
| Competitor price references | Product policy |

### G.3 Future Price Disclosure (Marked Future-Only)

Price display on the PDP requires a separate governed unit:
**TECS-B2B-BUYER-PRICE-DISCLOSURE-001**

This unit must:
- Define price visibility rules per buyer context.
- Establish relationship-scoped price disclosure gates.
- Integrate with buyer-supplier allowlist.

No price logic is included in the PDP MVP.

---

## H. Visibility and Access Boundary Design

### H.1 MVP Visibility Rules

| Rule | Requirement |
|---|---|
| Authenticated access only | Buyer must have a valid `texqtic_auth_realm` session |
| Tenant / org scoped | PDP loads within the buyer's `org_id` context |
| B2B workspace only | PDP is only accessible in the B2B buyer workspace shell |
| No public SEO PDP | No unauthenticated item detail page in MVP |
| No URL-guessable item access | Item ID alone insufficient; buyer session required |
| Relationship-scoped visibility | Not enforced in MVP; future — TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 |

### H.2 Current Launch-Accelerated Posture

> **Note:** As documented in TECS-B2B-BUYER-CATALOG-SUPPLIER-SELECT-001 OPEN-SET, current catalog
> access is intentionally launch-accelerated and too open long-term. Future
> `TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001` will introduce buyer-supplier allowlist gates.
> The PDP MVP inherits this same posture — authenticated buyer workspace access is the gate.

### H.3 Future Relationship-Scoped Visibility (Marked Future-Only)

The following are deferred to **TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001**:

- Buyer-supplier allowlist enforcement at PDP load.
- Item visibility filtered by buyer-supplier relationship status.
- Relationship-scoped catalog access with explicit connection approval.
- Supplier-controlled visibility flags per item.

---

## I. Security and Tenancy Design

### I.1 Required Security Controls

| Control | Requirement |
|---|---|
| Buyer authentication | Valid session required; HTTP 401 if absent |
| Tenant scoping | All DB queries scoped by `org_id` from session context |
| Cross-tenant isolation | Buyer's `org_id` must not expose another tenant's private data |
| Item access validation | Confirm item exists and is accessible for the buyer session |
| 404 not 403 for out-of-scope items | Avoid revealing whether restricted items exist |
| Media URL signing | All media served via signed/controlled access; no raw storage URLs in response |
| Supplier private fields | Never included in `BuyerCatalogPdpView` response |
| Admin-only fields | Never included in buyer-facing response |
| Certification draft data | Never included; APPROVED records only |
| Internal document IDs | Never exposed in buyer-facing contract |
| No RLS bypass | No service-role queries for buyer-facing PDP |

### I.2 Org_id Tenancy Chain

```
Session → withDbContext(org_id) → catalogService.getItemForBuyer(itemId, org_id)
                                          ↓
                               WHERE org_id = :org_id
                               AND item.id = :itemId
                               AND item.publication_posture = 'published'  // buyer-safe
```

`org_id` is the canonical tenancy key. It must be validated at the route level and passed
explicitly through the service layer. It must not be derived from URL parameters alone.

### I.3 What Must Not Appear in the Buyer PDP Response

| Data Class | Reason |
|---|---|
| `org_id` value | Never in response body; internal scoping key only |
| Internal Prisma record IDs for certs/extractions | Not buyer-facing |
| Supabase Storage object paths | Security — signed access only |
| AI extraction `extraction_id`, `draft_id` | Internal governance |
| Confidence scores | Internal AI governance |
| Admin notes, internal tags | Admin-only |
| Supplier internal identifiers beyond `supplierId` | Privacy boundary |
| RLS policy details | Infrastructure layer |

---

## J. Test ID / Component Contract (Design)

These test IDs must be assigned to the corresponding PDP sections when implemented.
They allow automated and manual QA to verify each section independently.

| Test ID | Component / Section |
|---|---|
| `buyer-catalog-pdp-page` | Root PDP page container |
| `buyer-catalog-pdp-hero` | Hero section (title, category, supplier name, primary image) |
| `buyer-catalog-pdp-media-gallery` | Media gallery (image carousel / grid) |
| `buyer-catalog-pdp-item-overview` | Item overview / description block |
| `buyer-catalog-pdp-specifications` | Textile specification attribute grid |
| `buyer-catalog-pdp-supplier-summary` | Supplier display summary card |
| `buyer-catalog-pdp-compliance-summary` | Compliance / certification summary section |
| `buyer-catalog-pdp-availability-summary` | Availability / MOQ / lead time section |
| `buyer-catalog-pdp-rfq-entry` | RFQ entry trigger button / card |
| `buyer-catalog-pdp-price-placeholder` | Price placeholder section |
| `buyer-catalog-pdp-back-button` | Back to catalog navigation |
| `buyer-catalog-pdp-compliance-notice` | Governance notice label (human review required) |

---

## K. Future Integration Points (All Marked Future-Only)

The following integrations are explicitly **future scope** and must not be implemented
or partially wired in any PDP MVP slice.

| Integration | Future Unit | Notes |
|---|---|---|
| Price disclosure logic | TECS-B2B-BUYER-PRICE-DISCLOSURE-001 | Buyer-context price rules |
| Catalog → RFQ prefill (structured) | TECS-B2B-BUYER-RFQ-INTEGRATION-001 | Full item context RFQ form |
| Multi-item RFQ basket | TECS-B2B-BUYER-RFQ-INTEGRATION-001 | Add-to-RFQ-draft flow |
| DPP Passport publication | TECS-DPP-PASSPORT-FOUNDATION-001 | QR code, passport data fields |
| Verified AI document intelligence fields | TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001 (future extension) | Buyer-facing approved extraction display |
| Relationship-scoped visibility | TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 | Buyer-supplier allowlist gates |
| AI supplier matching / ranking | TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 | AI-ranked alternatives panel |
| TradeTrust Pay integration | Future settlement unit | Not in MVP scope |
| Supplier trust score | Future control-plane unit | Risk scoring; out of tenant AI scope |
| Digital signature verification | Future compliance unit | Certificate verification API |
| Video or 3D product assets | Future media unit | Non-image media types |

---

## L. Implementation Slice Plan

> **AUTHORIZATION STATUS: ALL SLICES UNAUTHORIZED**
> No slice below is authorized for implementation. Each requires explicit Paresh sign-off
> before opening.

| Slice | ID | Scope | Authorization |
|---|---|---|---|
| PDP read contract and route design | P-1 | Define `GET /api/tenant/catalog/items/:itemId` PDP read endpoint; service method; response type guard | UNAUTHORIZED |
| Buyer PDP page shell and layout | P-2 | React page component shell; route binding in B2B shell; hero + layout sections | UNAUTHORIZED |
| Specs / media / compliance rendering | P-3 | Textile specifications block; media gallery; compliance summary with APPROVED-only certs | UNAUTHORIZED |
| RFQ entry trigger handoff | P-4 | RFQ trigger button; context passing (itemId, supplierId, title, category, stage) to existing RFQ dialog | UNAUTHORIZED |
| Verification and governance closure | P-5 | TypeScript typecheck; tests; runtime verification; governance file updates; commit | UNAUTHORIZED |

### L.1 Slice P-1 Scope Detail (Design Level)

- Define `BuyerCatalogPdpView` TypeScript interface in `shared/contracts` or `server/src/types`.
- Define `GET /api/tenant/catalog/items/:itemId` route in `server/src/routes/tenant.ts`.
- Define `catalogService.getItemForBuyer(itemId: string, orgId: string)` read method.
- Define field projection (only `BuyerCatalogPdpView` fields; no internal fields).
- Validate `org_id` at route layer.
- Map APPROVED certification records to `CertificateSummaryItem`.
- Return HTTP 404 for items not found or outside buyer scope.
- **No price fields. No draft extraction fields. No admin fields.**

### L.2 Slice P-2 Scope Detail (Design Level)

- Create `components/Tenant/BuyerCatalog/CatalogPdpPage.tsx`.
- Register route in B2B shell under `/catalog/items/:itemId`.
- Implement hero section, page layout structure, and back-navigation.
- Apply `data-testid` attributes per Section J.

### L.3 Slice P-3 Scope Detail (Design Level)

- Implement `CatalogSpecificationBlock` rendering all `CatalogSpecification` fields.
- Implement `CatalogMediaGallery` with signed URL consumption.
- Implement `CatalogComplianceSummary` with APPROVED-only cert rendering.
- Implement governance notice label (structural constant).
- Implement empty state handlers per Section D.4.

### L.4 Slice P-4 Scope Detail (Design Level)

- Implement `CatalogPdpRfqEntry` trigger component.
- Wire `RfqTriggerPayload` to existing RFQ dialog via appropriate context or prop.
- Validate payload fields before passing to RFQ.
- No RFQ prefill logic (future — TECS-B2B-BUYER-RFQ-INTEGRATION-001).
- No multi-item basket (future — TECS-B2B-BUYER-RFQ-INTEGRATION-001).

### L.5 Slice P-5 Scope Detail (Design Level)

- `pnpm --filter client typecheck` — must pass.
- `pnpm --filter server typecheck` — must pass.
- PDP unit tests: hero render, spec block render, compliance summary (APPROVED only), RFQ trigger, price placeholder.
- Runtime verification: item detail loads for authenticated buyer; unauthorized access returns safe response.
- Governance update: OPEN-SET.md, NEXT-ACTION.md, SNAPSHOT.md reflect VERIFIED_COMPLETE.

---

## M. Completion Checklist

- [x] Design artifact created
- [x] Problem statement included
- [x] MVP scope defined
- [x] Read contract defined (design level)
- [x] UI information architecture defined
- [x] RFQ entry trigger designed only (no implementation)
- [x] Compliance display boundary defined
- [x] Price disclosure deferred to TECS-B2B-BUYER-PRICE-DISCLOSURE-001
- [x] Relationship access deferred to TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001
- [x] DPP integration marked future-only
- [x] Security / tenancy rules included
- [x] Implementation slices defined but not opened
- [x] Governance files updated
- [x] No implementation files changed

---

*Design-only. No implementation authorized. Last updated: 2026-04-27.*
