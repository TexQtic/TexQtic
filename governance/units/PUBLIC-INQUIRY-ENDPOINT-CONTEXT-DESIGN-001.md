# PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001
## Public Inquiry Endpoint Context Extension — Design Unit

**Unit ID:** PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001
**Family:** Public Attraction Layer Governance / Public Inquiry
**Status:** DESIGN_COMPLETE
**Date:** 2026-07-08
**Authorized by:** Paresh
**Artifact class:** Governance design — design-only, no runtime changes
**Placement:** `governance/units/`

---

## 1. Status Summary

| Field | Value |
|---|---|
| Unit ID | PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001 |
| Status | DESIGN_COMPLETE |
| Scope | Phase 2 endpoint/OpenAPI/event/service contract extension for public inquiry |
| Prior unit | PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-IMPLEMENTATION-001 (commit `3b1971b`, verified `d237651`) |
| Design outcome | Extend `POST /api/public/inquiry/submit` to support general + multi-context inquiry |
| Runtime changes introduced | None — design only |
| Schema/migration changes introduced | None — design only |
| Blocks implementation | PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001 |

---

## 2. Design Authority References

| Document | Role |
|---|---|
| `governance/units/PUBLIC-INQUIRY-INTENT-CAPTURE-PAGE-DESIGN-001.md` | Phase 1 design authority; source surface registry; field model |
| `governance/units/TEXQTIC-B2C-FAMILY-REPO-TRUTH-DESIGN-PLAN-AND-TRACKER-001.md` | B2C family tracker; Phase 2 deferred items record |
| `governance/decisions/TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1.md` | Canonical inquiry model; prohibited payload categories |
| `shared/contracts/openapi.tenant.json` | Existing `POST /api/public/inquiry/submit` contract (INQUIRY-004) |
| `shared/contracts/event-names.md` | `buyer_inquiry.created.v1` event contract |
| `governance/decisions/INDUSTRY-CLUSTER-TAXONOMY-DECISION-001.md` | Status PROPOSED; inquiry context vocabulary gated on ACCEPTED status |
| `config/publicIndustryClusterTaxonomy.ts` | Layer 7 `INQUIRY_CONTEXT_TERMS` — DEFERRED |
| `config/publicB2CCategoryPages.ts` | Approved category slug registry (`B2C_CATEGORY_PAGE_CONFIGS`) |
| `config/publicCollectionsProjection.ts` | Approved collection slug registry (`PUBLIC_COLLECTION_PROJECTIONS`) |
| `docs/product-truth/MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md` | INQUIRY-004 original design |

---

## 3. Purpose

Phase 1 public inquiry (INQUIRY-004) supports exactly one use case: a visitor who arrives at `/inquiry` with a known public supplier slug and sends a pre-authentication sourcing signal. `supplier_slug` is required.

Phase 2 must extend the endpoint to support:
- **General inquiry** — no supplier context; visitor expresses interest without targeting a specific supplier.
- **Multi-context inquiry** — product-scoped, category-scoped, and collection-scoped intent signals, where the visitor arrives from a product detail page, category story page, or collection detail page.
- **Source surface attribution** — advisory field that records where the inquiry was initiated, enabling routing and analytics without identifying the visitor.
- **Message field** — optional free-text for high-level intent description; subject to PII-blocking rules.

This unit defines the contract changes required before implementation. No runtime code is changed here.

---

## 4. Phase 1 Repo-Truth Confirmation

### 4.1 Thirteen Inspection Questions — Current Confirmed State

| # | Question | Answer |
|---|---|---|
| 1 | Current public inquiry endpoint path | `POST /api/public/inquiry/submit` |
| 2 | Is `supplier_slug` currently required? | **YES** — `z.string().min(1).max(100).regex(/^[a-z0-9-]+$/)` with no `.optional()` |
| 3 | Current `inquiry_category` enum values | `GENERAL \| CAPABILITY_FIT \| OFFERING_PREVIEW \| SOURCING_INTENT \| QUALIFICATION_CHECK` |
| 4 | Current backend validation schema | Zod inline in `server/src/routes/public.ts` — `inquirySubmitBodySchema`; extra fields stripped by Zod default |
| 5 | Current OpenAPI schema for the endpoint | `additionalProperties: false`; only the 4 Phase 1 fields documented; see Section 6 |
| 6 | Current rate limit | 20 req / 15 min / IP via `@fastify/rate-limit` |
| 7 | Current event payload (`buyer_inquiry.created.v1`) | `supplier_slug`, `inquiry_category`, `geo_band?`, `volume_band?`, `timestamp` — via `writeAuditLog` afterJson |
| 8 | Current frontend service function | `submitPublicInquiry(params: PublicInquirySubmitParams)` in `services/publicB2BService.ts` — `supplier_slug` required in interface |
| 9 | Does Phase 1 frontend send `source_surface`? | **NO** — confirmed in Phase 1 verification (commit `d237651`) |
| 10 | Does backend currently accept product/category/collection context? | **NO** — Zod `.strip()` removes unknown fields silently |
| 11 | Does backend currently accept `message`? | **NO** — stripped by Zod |
| 12 | Are any PII fields accepted? | **NO** — INQ-011 confirms extra fields (including PII) are stripped, not stored |
| 13 | Is current endpoint response opaque and public-safe? | **YES** — `{ success: true, data: { acknowledged: true, message: string } }` only |

### 4.2 Schema/Migration Requirement Assessment

Phase 2 changes are **endpoint-only**. The inquiry currently uses `writeAuditLog` → `maybeEmitEventFromAuditEntry` for persistence. The `afterJson` field in AuditLog is JSONB (schema-flexible). Adding new context fields to `afterJson` requires no schema migration.

**Determination: No schema migration required for Phase 2.**

### 4.3 No Dedicated Inquiry Service File

`server/src/services/publicInquiry.service.ts` does not exist. Inquiry logic lives entirely in `server/src/routes/public.ts`. Phase 2 can either remain inline or extract to a service file — this decision belongs to the implementation unit, not this design unit.

### 4.4 Zod Strip Behavior — Important Boundary

The current `inquirySubmitBodySchema` uses Zod default object behavior (`.strip()` mode). Extra fields sent in the request body are silently ignored and never reach `afterJson` or the event payload. This is the correct behavior and must be preserved in Phase 2 — extra/unknown fields must never reach event emission.

The OpenAPI contract currently says `additionalProperties: false`. Phase 2 will extend the allowed properties explicitly; unknown fields beyond the declared set continue to be stripped at the Zod layer.

---

## 5. Phase 1 Current Endpoint Contract (Verbatim)

```
POST /api/public/inquiry/submit

Auth:         none required
Rate limit:   20 req / 15 min / IP

Request body (application/json):
  Required:
    supplier_slug     string  /^[a-z0-9-]+$/  min 1  max 100
    inquiry_category  enum    GENERAL | CAPABILITY_FIT | OFFERING_PREVIEW
                              | SOURCING_INTENT | QUALIFICATION_CHECK
  Optional:
    geo_band          string  min 1  max 100
    volume_band       string  min 1  max 100

  Extra fields: stripped (Zod default)
  additionalProperties: false (OpenAPI)

Visibility gate (supplier_slug):
  - Passed through getPublicB2BSupplierBySlug() — five-projection gates
  - Non-eligible → safe 404 (no gate detail leaked)

Responses:
  202 Accepted:
    { success: true, data: { acknowledged: true, message: string } }
  400 Bad Request:
    Validation failure (bad slug format / missing category / bad category value /
    empty geo_band or volume_band)
  404 Not Found:
    Supplier not eligible or absent (safe, no gate detail)
  429 Too Many Requests:
    Rate limit exceeded

Event emission (fire-and-forget):
  writeAuditLog → maybeEmitEventFromAuditEntry → buyer_inquiry.created.v1
  afterJson: { supplier_slug, inquiry_category, geo_band?, volume_band?, timestamp }
  NO org UUID, NO email, NO phone, NO buyer name in afterJson
```

---

## 6. Phase 1 Current Frontend Service Contract

```typescript
// services/publicB2BService.ts

export type PublicInquiryCategory =
  | 'GENERAL'
  | 'CAPABILITY_FIT'
  | 'OFFERING_PREVIEW'
  | 'SOURCING_INTENT'
  | 'QUALIFICATION_CHECK';

export interface PublicInquirySubmitParams {
  supplier_slug: string;          // required in Phase 1
  inquiry_category: PublicInquiryCategory;
  geo_band?: string;
  volume_band?: string;
}

export interface PublicInquirySubmitResponse {
  acknowledged: boolean;
  message: string;
}

export async function submitPublicInquiry(
  params: PublicInquirySubmitParams,
): Promise<PublicInquirySubmitResponse>
```

---

## 7. Problem Statement

Phase 1 creates a capable but narrowly-gated inquiry surface. Three gaps block the full public inquiry vision:

**Gap 1 — No general inquiry.** A visitor arriving at `/inquiry` directly (from navbar, search, QR, campaign link) with no supplier in mind has no way to express interest. The current endpoint rejects any submission without `supplier_slug`.

**Gap 2 — No multi-context carriage.** Product detail pages, category story pages, and collection pages have no way to hand off sourcing context to the inquiry endpoint. A visitor exploring `QA-GMT-D Fabric 001` cannot signal product interest via inquiry.

**Gap 3 — No source surface attribution.** The endpoint has no record of where an inquiry came from. This prevents routing signals (CRM handoff, analytics, ranking) from being informed by entry context.

**Gap 4 — No intent narrative.** The current form offers only category/geo/volume qualifiers. Visitors with specific context cannot express it in open language. The absence of a `message` field limits signal quality.

---

## 8. Design Goals

1. Make `supplier_slug` optional so general (non-supplier-scoped) inquiry is possible.
2. Add bounded context fields — `source_surface`, `product_slug`, `category_slug`, `collection_slug` — as advisory signals.
3. Add optional `message` field with bounded max-length and PII blocking.
4. Preserve all Phase 1 behavior: existing supplier inquiry flow must not regress.
5. All new fields are public-safe: no PII, no private IDs, no tenant/org data.
6. Extend `buyer_inquiry.created.v1` event payload contract to include new fields.
7. Keep backward compatibility: Phase 1 payloads continue to work without any change.
8. No schema migration required.
9. Context validation must fail-closed without leaking private object existence.

---

## 9. Phase 2 Use Cases

### 9.1 General Inquiry (no context)

**Scenario:** Visitor arrives at `https://app.texqtic.com/inquiry` with no query parameters (direct URL load, navbar CTA, campaign link). No supplier selected.

**Frontend:** `PublicInquiryPage` renders in `NO_CONTEXT` mode, showing a general intent form with `inquiry_category`, optional `geo_band`, optional `volume_band`, optional `message`. No supplier context summary shown.

**Payload:**
```json
{
  "inquiry_category": "GENERAL",
  "source_surface": "NAVBAR",
  "geo_band": "South Asia",
  "message": "Looking for cotton fabric suppliers."
}
```

**Backend behavior:** No supplier gate. Accepted directly. Event emitted without `supplier_slug`.

---

### 9.2 Supplier Inquiry (Phase 1, unchanged)

**Scenario:** Visitor arrives at `/inquiry?supplierSlug=qa-gmt-d` (from supplier profile CTA).

**Payload:**
```json
{
  "supplier_slug": "qa-gmt-d",
  "inquiry_category": "SOURCING_INTENT",
  "source_surface": "SUPPLIER_PROFILE",
  "geo_band": "EU",
  "volume_band": "500-1000 units/month"
}
```

**Backend behavior:** Supplier gate applied (Phase 1 logic unchanged). Safe 404 if not eligible.

---

### 9.3 Product Inquiry

**Scenario:** Visitor viewing `PublicProductDetail` for `qa-b2c-cotton-scarf-1ab8a85c10` clicks an "Inquire" CTA (to be added in context handoff unit). Navigation passes `productSlug` context to `PUBLIC_INQUIRY`.

**Payload:**
```json
{
  "inquiry_category": "OFFERING_PREVIEW",
  "source_surface": "PRODUCT_DETAIL",
  "product_slug": "qa-b2c--qa-b2c-cotton-scarf-1ab8a85c10",
  "geo_band": "EU"
}
```

**Backend behavior:** No supplier gate (supplier_slug absent). `product_slug` format-validated; if format-valid, included in event payload as advisory context. Backend does NOT gate against product existence (see Section 17 context validation rules).

---

### 9.4 Category Inquiry

**Scenario:** Visitor on `/products/category/garments` clicks an "Inquire about Garments" CTA.

**Payload:**
```json
{
  "inquiry_category": "CAPABILITY_FIT",
  "source_surface": "CATEGORY_STORY",
  "category_slug": "garments",
  "geo_band": "IN"
}
```

**Backend behavior:** `category_slug` format-validated. Included in event payload as advisory context.

---

### 9.5 Collection Inquiry

**Scenario:** Visitor on `/collections/natural-fabric-stories` clicks an "Inquire" CTA.

**Payload:**
```json
{
  "inquiry_category": "GENERAL",
  "source_surface": "COLLECTION_DETAIL",
  "collection_slug": "natural-fabric-stories"
}
```

**Backend behavior:** `collection_slug` format-validated. Included in event payload.

---

## 10. Proposed Phase 2 Request Schema

```
POST /api/public/inquiry/submit (Phase 2)

Required:
  inquiry_category    enum    (unchanged — Phase 1 values)

Optional:
  supplier_slug       string  /^[a-z0-9-]+$/  min 1  max 100
  source_surface      enum    See Section 12
  product_slug        string  /^[a-z0-9-]+$/  min 1  max 200
  category_slug       string  /^[a-z0-9-]+$/  min 1  max 100
  collection_slug     string  /^[a-z0-9-]+$/  min 1  max 100
  geo_band            string  min 1  max 100  (unchanged)
  volume_band         string  min 1  max 100  (unchanged)
  message             string  min 1  max 500  (new in Phase 2)

Constraints:
  - `supplier_slug` is now OPTIONAL (Phase 2 breaking change from Phase 1 schema)
  - At most ONE context slug per request: if `supplier_slug` is present,
    `product_slug`, `category_slug`, and `collection_slug` must be absent.
    This is an advisory constraint — backend enforces it; frontend must respect it.
  - `source_surface` is advisory: server normalizes unknown values to `DIRECT`
  - `message` is sanitized server-side before event emission (see Section 20)
  - Extra fields continue to be stripped by Zod (unchanged behavior)
```

### 10.1 Context Exclusivity Rule

Only one context type per submission. The backend enforces: if `supplier_slug` is present, the other context slugs must not be present. This prevents ambiguous multi-context submissions.

**Rationale:** An inquiry is either supplier-scoped, product-scoped, category-scoped, collection-scoped, or general. Mixed context is not meaningful and prevents clean event routing. Frontend must never send more than one context slug.

### 10.2 Zod Schema Design (for Implementation Reference)

```typescript
// FOR REFERENCE ONLY — implementation unit declares the actual code

const inquirySubmitBodySchema = z.object({
  inquiry_category: z.enum([
    'GENERAL',
    'CAPABILITY_FIT',
    'OFFERING_PREVIEW',
    'SOURCING_INTENT',
    'QUALIFICATION_CHECK',
  ]),
  supplier_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  source_surface: z.enum([
    'GENERAL_PUBLIC', 'SUPPLIER_PROFILE', 'PRODUCT_DETAIL', 'PRODUCT_BROWSE',
    'CATEGORY_STORY', 'COLLECTION_DETAIL', 'COLLECTION_LIST', 'TRUST_LANDING',
    'INDUSTRY_LANDING', 'NAVBAR', 'DIRECT', 'UNKNOWN',
  ]).optional(),
  product_slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  category_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  collection_slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  geo_band: z.string().min(1).max(100).optional(),
  volume_band: z.string().min(1).max(100).optional(),
  message: z.string().min(1).max(500).optional(),
}).refine(
  (data) => {
    // Context exclusivity: supplier_slug precludes other context slugs
    const hasSupplier = !!data.supplier_slug;
    const hasOtherContext = !!(data.product_slug || data.category_slug || data.collection_slug);
    return !(hasSupplier && hasOtherContext);
  },
  {
    message: 'supplier_slug cannot be combined with product_slug, category_slug, or collection_slug',
  }
);
```

---

## 11. Proposed Phase 2 Response Schema

**No change.** The response schema is unchanged from Phase 1:

```json
{
  "success": true,
  "data": {
    "acknowledged": true,
    "message": "Your inquiry has been received."
  }
}
```

**Rationale:** The response is intentionally opaque. No context fields, event IDs, routing outcomes, or submission references are echoed back. This prevents any information leakage about backend routing, context validation results, or internal processing.

---

## 12. Source Surface Enum

### Recommended Enum Values

| Value | Source Surface | Context Fields Populated |
|---|---|---|
| `GENERAL_PUBLIC` | Generic public entry — no specific surface | None |
| `SUPPLIER_PROFILE` | `/supplier/:slug` — from supplier profile CTA | `supplier_slug` |
| `PRODUCT_DETAIL` | `/product/:slug` — from product detail CTA | `product_slug` |
| `PRODUCT_BROWSE` | `/products` — from B2C browse page | None |
| `CATEGORY_STORY` | `/products/category/:slug` — from category page CTA | `category_slug` |
| `COLLECTION_DETAIL` | `/collections/:slug` — from collection detail CTA | `collection_slug` |
| `COLLECTION_LIST` | `/collections` — from collections list CTA | None |
| `TRUST_LANDING` | `/trust` — from trust landing CTA | None |
| `INDUSTRY_LANDING` | `/industries` — from industry landing CTA | None |
| `NAVBAR` | Navbar "Inquire" link | None |
| `DIRECT` | Direct URL load or cold-navigate | None |
| `UNKNOWN` | Fallback / validation failure | None |

### Server Normalization Rule

The `source_surface` field is advisory. The server:
1. Accepts any value in the declared enum.
2. Normalizes unknown/absent values to `DIRECT`.
3. Does NOT reject submissions with unknown source surfaces.
4. Does NOT use `source_surface` to change routing behavior in Phase 2 (used for event payload only).

### Frontend Responsibilities

- Frontend MUST send the correct `source_surface` value for the current navigation context.
- Frontend MUST NOT fabricate or spoof `source_surface` values.
- If context is unclear, frontend sends `DIRECT` or omits the field (server normalizes to `DIRECT`).

---

## 13. Context Validation Rules

### 13.1 `supplier_slug` (if present)

1. Format validation: `Zod /^[a-z0-9-]+$/ min 1 max 100` → 400 if invalid format.
2. Visibility gate: `getPublicB2BSupplierBySlug()` — same five-projection check as Phase 1.
3. Non-eligible or absent supplier → **safe 404** (no gate detail, no reference to eligibility or publication posture).
4. Valid eligible supplier → 202 Accepted (event includes supplier context).

### 13.2 `product_slug` (if present)

1. Format validation: `Zod /^[a-z0-9-]+$/ min 1 max 200` → 400 if invalid format.
2. **No existence gate on the backend.** Backend accepts any format-valid `product_slug` as advisory context.
3. **Rationale:** The public B2C product list comes from `publicB2CProjection.service.ts` which queries the database. Querying the database per inquiry submission to validate product context would add latency, and a 404 for an invalid product slug would leak information about which B2C products exist privately. Advisory pass-through is appropriate here.
4. `product_slug` is included in the event payload as received (after format validation).
5. Implementation note: if the implementation team wishes to add a lightweight in-memory product-slug validation (fetching slugs into a Set at startup), that is permitted but not required.

### 13.3 `category_slug` (if present)

1. Format validation: `Zod /^[a-z0-9-]+$/ min 1 max 100` → 400 if invalid format.
2. Server-side config validation (RECOMMENDED): The implementation unit SHOULD validate `category_slug` against the `B2C_CATEGORY_PAGE_CONFIGS` static config (slugs: `garments`, `home-textiles`, `technical-textiles`, `fabrics`). This config is frontend-only today; a canonical copy MUST be created in `server/src/config/publicB2CCategoryPageSlugs.ts` (or equivalent) for server-side validation.
3. If `category_slug` is format-valid but not in the approved list → **treat as general inquiry** (do not reject with 400; do not include `category_slug` in event payload).
4. **Rationale:** Rejecting unknown category slugs with 400 could leak information about the approved category set. Silent contextless treatment is the safer option.

### 13.4 `collection_slug` (if present)

1. Format validation: `Zod /^[a-z0-9-]+$/ min 1 max 100` → 400 if invalid format.
2. Server-side config validation (RECOMMENDED): Validate against approved collection slugs from `PUBLIC_COLLECTION_PROJECTIONS`. Approved slugs (at time of design): `natural-fabric-stories`, `garment-supply-chain-context`, `home-textiles-showcase`, `textile-services-ecosystem`, `technical-textiles-context`. A canonical copy SHOULD be created in `server/src/config/publicCollectionSlugs.ts`.
3. If `collection_slug` is format-valid but not in the approved list → treat as general inquiry (same as category rule above).

### 13.5 Context Exclusivity Enforcement

Backend validates: `supplier_slug` cannot coexist with `product_slug`, `category_slug`, or `collection_slug`.

If violated → 400 validation error (this is a client contract error, not an existence leak).

### 13.6 Fail-Closed Summary

| Context | Invalid format | Valid format, not eligible/approved | No context |
|---|---|---|---|
| `supplier_slug` | 400 | Safe 404 | General inquiry path |
| `product_slug` | 400 | Advisory pass-through (general) | General inquiry path |
| `category_slug` | 400 | Silent drop (general) | General inquiry path |
| `collection_slug` | 400 | Silent drop (general) | General inquiry path |

---

## 14. Message Field Rules

### Decision: Message field is ALLOWED in Phase 2 under the following rules.

**Rationale:** A free-text `message` field significantly improves signal quality for routing and matching. The risk of PII leakage is mitigated by server-side sanitization and the fact that the field is never echoed back to the client or rendered publicly.

### Maximum length: 500 characters (after sanitization)

### Server-side sanitization pipeline (implementation reference):

1. **Strip HTML tags**: Remove all `<...>` patterns using a regex or a safe HTML-stripping library (e.g. `sanitize-html` with `allowedTags: []`). No HTML is permitted.
2. **Email pattern detection**: If a string matching `/[\w._%+\-]+@[\w.\-]+\.[A-Za-z]{2,}/` is found, the entire `message` field is rejected with 400. Do not mask and pass through — reject.
3. **Phone pattern detection**: If a string matching a phone-like pattern (`/(?:\+?[\d\s\-().]{7,}\d)/`) is found, reject with 400. Do not mask — reject.
4. **URL detection (advisory)**: URLs (http/https) MAY be stripped silently if present. This is RECOMMENDED but not required. Do not reject the entire message for a URL; strip the URL segment only.
5. **Length enforcement**: After all stripping, if `message` is empty (all content stripped) → treat as absent. If `message` exceeds 500 chars after stripping → 400.
6. **The sanitized `message` is included in the event payload** as `inquiry_message` (renamed from `message` to avoid naming conflicts in `afterJson`). It is marked as free-text content, not display copy.

### Response behavior:

- Message is **never echoed back** in the 202 response.
- Message is **never included** in any public-facing page or API after submission.
- Message is **never rendered** in the success state of the frontend.
- The event payload treats `inquiry_message` as internal signal content only.

### Why reject on PII rather than strip?

Stripping email/phone silently would allow partial PII to pass through in adjacent text (e.g., "call me on 987"). Rejection with 400 forces the client to remove PII explicitly, which is a stronger guarantee. The frontend must show a helpful validation message ("Your message should not contain contact information.").

---

## 15. PII and Private Data Prohibition

The following fields are unconditionally forbidden in any inquiry request, event payload, response, or frontend form — in all phases:

| Forbidden Field | Category |
|---|---|
| `name` / buyer name | PII |
| `email` / `emailAddress` | PII — blocked by message sanitization |
| `phone` / `phoneNumber` | PII — blocked by message sanitization |
| `company` / `companyName` | PII |
| `budget` / `target_price` | Commerce boundary |
| `price` / `pricing` | Commerce boundary |
| `quantity` | RFQ semantics |
| `delivery` / `delivery_date` | RFQ semantics |
| `rfq` / RFQ intent fields | Commerce boundary |
| `org_id` / `orgId` | Tenant ID — private |
| `tenantId` | Tenant ID — private |
| `userId` | User ID — private |
| Internal UUID (any form) | Private reference |
| Auth token / session ID | Security boundary |
| Passport / DPP ID | Private trust record |
| Supplier internal ID | Private reference |
| Product internal ID | Private reference |
| CRM/pipeline record ID | Private reference |
| Scoring / ranking / AI signal | Internal operational data |

### Phase 2 Additions to This Prohibition

The new context fields MUST carry only public URL slug strings:
- `source_surface` → enum value only (no URL, no session data)
- `product_slug` → public B2C slug (URL segment only, no internal product ID)
- `category_slug` → public URL segment (e.g. `garments`)
- `collection_slug` → public URL segment (e.g. `natural-fabric-stories`)

**No internal database IDs may be used as context field values.**

---

## 16. Public/Private Boundary

### What Phase 2 exposes publicly:

- Inquiry acknowledgment: `{ acknowledged: true, message: "..." }` — unchanged
- The `/inquiry` page renders in general mode with no context — safe public copy
- Source surface enum values are non-sensitive strings

### What Phase 2 does NOT expose:

- Whether a product/category/collection exists privately (fail-closed context treatment)
- Event emission outcomes or routing results
- Any internal IDs in the response
- Supplier org UUID (even when supplier_slug is present — Phase 1 rule maintained)
- Visitor identity (no cookie, no session, no IP in the event `afterJson`)

### Supplier gate behavior (unchanged):

When `supplier_slug` is present, the same five-projection gates apply. Non-eligible → safe 404. Gate detail is NOT included in the error response. This behavior is UNCHANGED from Phase 1.

### General inquiry (new in Phase 2):

When no `supplier_slug` is present, the inquiry is accepted without a supplier gate. The event is emitted with `source_surface` and any valid context fields. The response is identical to the supplier-context 202 response.

---

## 17. Rate Limit and Abuse Assumptions

### Current rate limit: 20 req / 15 min / IP

**Assessment for Phase 2:** The current rate limit is appropriate for Phase 2. General inquiry (without supplier context) is lower-friction than supplier inquiry but the same IP-level rate limit is a reasonable baseline.

**Recommendation:** Maintain 20 req / 15 min / IP for Phase 2. The implementation unit MAY apply a separate per-`source_surface` rate limit if analytics indicate abuse, but this is not required for Phase 2 launch.

**Message field abuse consideration:** The addition of the `message` field slightly increases the risk of bulk inquiry submission (e.g. spam). The current rate limit mitigates this. The PII-blocking rules (email/phone rejection) prevent misuse as a contact-collection channel. No additional mitigation is required.

**Bot consideration:** The endpoint has no CAPTCHA or challenge flow. This is appropriate for a Phase 2 public endpoint — the low value signal of an anonymous inquiry (no PII, no binding commitment) makes it an unattractive bot target. Rate limiting is sufficient.

---

## 18. Backward Compatibility Strategy

### Phase 1 payloads continue to work without modification.

The Phase 2 schema change makes `supplier_slug` optional (was required). All existing Phase 1 payloads that include `supplier_slug` remain valid. No existing client code breaks.

**Breaking change concern:** `supplier_slug` going from required to optional is a request schema loosening — it is backward-compatible for existing clients. Existing clients continue sending `supplier_slug` and nothing changes for them.

**Frontend service interface change:** `PublicInquirySubmitParams.supplier_slug` changes from `string` to `string | undefined`. The implementation unit must verify that:
1. `PublicSupplierProfile.tsx` — still passes `supplier_slug` explicitly (no regression).
2. `PublicInquiryPage.tsx` — Phase 1 (supplier-context mode) still passes `supplier_slug` explicitly. Phase 2 (general mode) passes `undefined` or omits the field.
3. Existing tests (PSI-001 through PSI-008, INQ-001 through INQ-012) continue passing.

---

## 19. OpenAPI Contract Change Summary

### Changes required to `shared/contracts/openapi.tenant.json` path `/api/public/inquiry/submit`:

1. **Remove `supplier_slug` from `required` array.** Change `"required": ["supplier_slug", "inquiry_category"]` to `"required": ["inquiry_category"]`.

2. **Add `source_surface` property** (new optional string property with enum).

3. **Add `product_slug` property** (new optional string property with regex pattern `^[a-z0-9-]+$`, max 200).

4. **Add `category_slug` property** (new optional string property with regex pattern `^[a-z0-9-]+$`, max 100).

5. **Add `collection_slug` property** (new optional string property with regex pattern `^[a-z0-9-]+$`, max 100).

6. **Add `message` property** (new optional string property, max 500).

7. **Update description** to reflect Phase 2 capabilities: general inquiry, multi-context, source surface attribution.

8. **Add 400 case description** for message PII rejection and context exclusivity failure.

9. **Remove `additionalProperties: false`** (or update to reflect that only the declared fields are allowed — Zod strips the rest; OpenAPI should accurately reflect the declared field set without `additionalProperties: false` if the backend's behavior is to strip rather than reject unknown fields).

   **Note:** OpenAPI `additionalProperties: false` is a documentation contract, not a runtime enforcement in Fastify. The Zod schema enforces field stripping at runtime. The OpenAPI should reflect the allowed field set accurately. Keeping `additionalProperties: false` in OpenAPI is appropriate as a contract statement that clients should not send undeclared fields.

10. **Add context exclusivity constraint note** to the description.

### Response schema: unchanged.

---

## 20. Event Payload Contract Change Summary

### Changes required to `shared/contracts/event-names.md` — `buyer_inquiry.created.v1`:

The allowed payload list must be updated to include the Phase 2 context fields:

**Updated allowed payload:**

```
supplier_slug (optional — present only for supplier-context inquiries)
inquiry_category
source_surface (optional)
product_slug (optional)
category_slug (optional)
collection_slug (optional)
geo_band (optional)
volume_band (optional)
inquiry_message (optional — sanitized free-text, not display copy)
timestamp
```

**Maintained prohibitions (unchanged):**

```
raw email, phone number, buyer full name, org UUID,
external_orchestration_ref, pricing/negotiation/order/trade state,
visitor IP address, session ID, auth token, internal database IDs
```

**Note on `inquiry_message` naming:** The field is renamed from `message` to `inquiry_message` in the event payload to avoid collisions with framework-level `message` fields in the AuditLog/EventLog infrastructure.

**Note on `source_surface` in event:** Includes server-normalized value (unknown values become `DIRECT`). Never the raw client-supplied string directly — always the validated/normalized enum value.

---

## 21. Frontend Service Contract Change Summary

### Changes required to `services/publicB2BService.ts`:

1. **Add `PublicInquirySourceSurface` type:**
   ```typescript
   export type PublicInquirySourceSurface =
     | 'GENERAL_PUBLIC'
     | 'SUPPLIER_PROFILE'
     | 'PRODUCT_DETAIL'
     | 'PRODUCT_BROWSE'
     | 'CATEGORY_STORY'
     | 'COLLECTION_DETAIL'
     | 'COLLECTION_LIST'
     | 'TRUST_LANDING'
     | 'INDUSTRY_LANDING'
     | 'NAVBAR'
     | 'DIRECT'
     | 'UNKNOWN';
   ```

2. **Extend `PublicInquirySubmitParams`:**
   ```typescript
   export interface PublicInquirySubmitParams {
     inquiry_category: PublicInquiryCategory;  // still required
     supplier_slug?: string;                   // CHANGED: now optional
     source_surface?: PublicInquirySourceSurface;
     product_slug?: string;
     category_slug?: string;
     collection_slug?: string;
     geo_band?: string;
     volume_band?: string;
     message?: string;
   }
   ```

3. **`PublicInquirySubmitResponse` and `submitPublicInquiry` function**: unchanged.

4. **Consider moving `submitPublicInquiry` to a more general service file** (e.g. `services/publicInquiryService.ts`) since it is no longer exclusively B2B-context. This is an optional refactor for the implementation unit.

### Frontend callers that must be updated:

| File | Current usage | Required change |
|---|---|---|
| `components/Public/PublicInquiryPage.tsx` | Sends `supplier_slug` as required | Make `supplier_slug` conditional on mode |
| `components/Public/PublicSupplierProfile.tsx` | Sends `supplier_slug` from `slug` prop | No change required — still sends supplier_slug explicitly |

---

## 22. Backend Route Logic Change Summary

The `inquirySubmitBodySchema` and handler in `server/src/routes/public.ts` must be updated:

### Schema change:
- `supplier_slug` → `.optional()`
- New optional fields added (see Section 10.2)
- `message` field: accepted by Zod, but sanitized before use in afterJson

### Handler logic change:

```
Current (Phase 1):
  1. Parse + validate body (supplier_slug required)
  2. Gate-check supplier → 404 if not eligible
  3. Emit event with supplier context
  4. Return 202

Phase 2:
  1. Parse + validate body (supplier_slug optional)
  2. Validate context exclusivity → 400 if violated
  3. If supplier_slug present:
       Gate-check supplier → 404 if not eligible
       Emit event with supplier_slug in afterJson
  4. If product_slug present:
       Format already validated by Zod
       Include as advisory in afterJson (no DB gate)
  5. If category_slug present:
       Check against approved list (see Section 13.3)
       If not approved: drop silently, treat as general
       If approved: include in afterJson
  6. If collection_slug present:
       Check against approved list (see Section 13.4)
       If not approved: drop silently
       If approved: include in afterJson
  7. If message present:
       Apply sanitization pipeline (see Section 14)
       If email/phone found: return 400
       After sanitization: if empty, treat as absent
  8. Emit event (afterJson includes all valid context fields)
  9. Return 202
```

### AuditLog `entityId` for general inquiries:

When `supplier_slug` is absent, the current code uses `supplierResult.orgId` as `entityId`. For general inquiries, there is no supplier org. The implementation unit must decide: use a platform-level `PLATFORM` entity, use `null`, or use a constant UUID for "platform-level events". The recommended approach: use `null` for entityId and `entity: 'platform_inquiry'` for entity type when no supplier context is present.

---

## 23. Implementation Sequencing Recommendation

Based on repo truth, the following four-unit sequence is recommended:

### Unit 1: `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001`

**Scope:** Backend/OpenAPI/service/event contract extension only. No frontend UI changes.

**Files changed:**
- `server/src/routes/public.ts` — update `inquirySubmitBodySchema` + handler logic
- `services/publicB2BService.ts` — extend `PublicInquirySubmitParams` interface + add `PublicInquirySourceSurface` type
- `shared/contracts/openapi.tenant.json` — update `/api/public/inquiry/submit` path
- `shared/contracts/event-names.md` — update `buyer_inquiry.created.v1` allowed payload
- `server/src/__tests__/public-buyer-inquiry.unit.test.ts` — add INQ-013 through INQ-025 covering Phase 2 paths
- Optionally: `server/src/config/publicB2CCategoryPageSlugs.ts` and `server/src/config/publicCollectionSlugs.ts` (canonical slug lists for server-side validation)

**Does NOT touch:** Frontend components, App.tsx, B2C pages, inquiry page UI.

**Gate to proceed:** This design unit (DESIGN_COMPLETE status).

---

### Unit 2: `PUBLIC-INQUIRY-GENERAL-MODE-IMPLEMENTATION-001`

**Scope:** Frontend update to `PublicInquiryPage.tsx` to support general mode (no supplier).

**Files changed:**
- `components/Public/PublicInquiryPage.tsx` — add general mode form rendering
- `tests/frontend/public-inquiry-page.test.tsx` — add test coverage for general mode

**Prerequisite:** Unit 1 complete (backend accepts submissions without `supplier_slug`).

**Specific changes:**
- When `supplierSlug` prop is empty, render general inquiry form (currently shows NO_CONTEXT landing with "Find suppliers" CTA only).
- General form shows: `inquiry_category` (required), `geo_band` (optional), `volume_band` (optional), `message` (optional, with PII input guidance). No supplier context summary.
- Sends `source_surface: 'NAVBAR'` or `'GENERAL_PUBLIC'` based on navigation context.
- Form footer: "This captures public intent only. No account, pricing, or binding commitments."

---

### Unit 3: `PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001`

**Scope:** Add "Inquire" CTAs to product detail, category story, and collection detail pages. Pass context to `/inquiry` via navigation state and query params.

**Files changed:**
- `components/Public/PublicProductDetail.tsx` — add "Inquire" CTA passing `productSlug`
- `components/Public/PublicB2CCategoryPage.tsx` — add "Inquire about [Category]" CTA passing `categorySlug`
- `components/Public/PublicCollectionDetail.tsx` — add "Inquire" CTA passing `collectionSlug`
- `App.tsx` — update `publicInquirySupplierSlugFromQuery` logic to also parse `productSlug`, `categorySlug`, `collectionSlug`, `sourceSurface` from URL query params
- `components/Public/PublicInquiryPage.tsx` — update `supplierSlug` prop/context to accept multi-context

**Note:** This unit requires the most careful design of the `PublicInquiryContext` model in `PublicInquiryPage.tsx`. A separate sub-design may be needed if context prop complexity warrants it.

---

### Unit 4: `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-VERIFY-CLOSE`

**Scope:** Production verification of Phase 2 inquiry behavior across all surfaces.

**Verification plan:** See Section 28.

---

## 24. Proposed Implementation Allowlist

### Unit 1 allowlist

| File | Action |
|---|---|
| `server/src/routes/public.ts` | MODIFY — schema + handler |
| `services/publicB2BService.ts` | MODIFY — type extensions |
| `shared/contracts/openapi.tenant.json` | MODIFY — path extension |
| `shared/contracts/event-names.md` | MODIFY — event payload update |
| `server/src/__tests__/public-buyer-inquiry.unit.test.ts` | MODIFY — new test cases |
| `server/src/config/publicB2CCategoryPageSlugs.ts` | CREATE (optional) — slug registry for server validation |
| `server/src/config/publicCollectionSlugs.ts` | CREATE (optional) — slug registry for server validation |

### Unit 2 allowlist

| File | Action |
|---|---|
| `components/Public/PublicInquiryPage.tsx` | MODIFY — general mode |
| `tests/frontend/public-inquiry-page.test.tsx` | MODIFY — general mode tests |

### Unit 3 allowlist

| File | Action |
|---|---|
| `components/Public/PublicProductDetail.tsx` | MODIFY — inquiry CTA |
| `components/Public/PublicB2CCategoryPage.tsx` | MODIFY — inquiry CTA |
| `components/Public/PublicCollectionDetail.tsx` | MODIFY — inquiry CTA |
| `App.tsx` | MODIFY — context parsing in `resolveInitialAppState()` |
| `components/Public/PublicInquiryPage.tsx` | MODIFY — multi-context prop support |

---

## 25. Verification Plan (Unit 1 — Backend)

| Test ID | Description | Expected |
|---|---|---|
| INQ-013 | General inquiry (no supplier_slug, category GENERAL) | 202 |
| INQ-014 | General inquiry with source_surface NAVBAR | 202 |
| INQ-015 | General inquiry with message (valid, no PII) | 202, message in afterJson as inquiry_message |
| INQ-016 | General inquiry with message containing email → 400 | 400 |
| INQ-017 | General inquiry with message containing phone → 400 | 400 |
| INQ-018 | General inquiry with product_slug (valid format) | 202, product_slug in afterJson |
| INQ-019 | General inquiry with category_slug `garments` (approved) | 202, category_slug in afterJson |
| INQ-020 | General inquiry with category_slug `unknown-category` (unapproved) | 202, category_slug absent from afterJson |
| INQ-021 | General inquiry with collection_slug `natural-fabric-stories` (approved) | 202, collection_slug in afterJson |
| INQ-022 | Supplier inquiry + product_slug (exclusivity violation) → 400 | 400 |
| INQ-023 | Unknown source_surface value → 202, server normalizes to DIRECT | 202 |
| INQ-024 | Oversized message (>500 chars) → 400 | 400 |
| INQ-025 | Message with HTML tags → HTML stripped, accepted | 202, sanitized message in afterJson |
| INQ-026 | Existing Phase 1 supplier inquiry (regression) | 202 |
| INQ-027 | event afterJson for general inquiry has NO org UUID | 202, afterJson verified |

---

## 26. Production Verification Plan (Final VERIFY-CLOSE unit)

| Check | URL/Action | Expected |
|---|---|---|
| General mode renders | `/inquiry` (no params) | Form with inquiry_category, geo_band, volume_band, message — no supplier summary |
| General inquiry submits | Fill general form, submit | 202, success state "Your interest has been recorded." |
| Supplier inquiry regression | `/inquiry?supplierSlug=qa-gmt-d` | Unchanged Phase 1 behavior |
| Product context handoff | Click Inquire from product detail | Form pre-populated with product context label |
| Category context handoff | Click Inquire from garments page | Form pre-populated with category context label |
| Collection context handoff | Click Inquire from natural-fabric-stories | Form pre-populated with collection context label |
| PII rejection (UI) | Type email into message field, submit | 400 error, "should not contain contact information" message |
| Source surface attribution | All surfaces | Correct `source_surface` value in event afterJson |
| Backward compatibility | Supplier profile inline inquiry | Unchanged behavior |
| No console errors | All verified routes | No runtime errors |

---

## 27. Deferred Items

| Item | Rationale | Status |
|---|---|---|
| `INDUSTRY-CLUSTER-INQUIRY-CONTEXT-001` | Layer 7 taxonomy terms (`INQUIRY_CONTEXT_TERMS`) — gated on INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 advancing to ACCEPTED | DEFERRED |
| Authenticated inquiry follow-up / continuation | Belongs to authenticated family; requires auth handoff design | DEFERRED |
| CRM routing from `source_surface` | Routing logic in CRM backbone — outside scope | DEFERRED |
| AI matching from inquiry payload | AI backbone consumes event — outside scope | DEFERRED |
| Sitemap entry for `/inquiry` | Sitemap implementation unit — separate family | DEFERRED |
| JSON-LD for inquiry page | Structured data design unit — separate | DEFERRED |
| Domain strategy (app.texqtic.com vs texqtic.com) | Domain governance — outside scope | DEFERRED |
| Rate limit differentiation by source_surface | Future abuse mitigation — not needed for Phase 2 launch | DEFERRED |
| Per-session inquiry rate limit (as opposed to per-IP) | Requires session state — not available on public surface | DEFERRED |
| Inquiry category vocabulary extension | Gated on INDUSTRY-CLUSTER-TAXONOMY-DECISION-001 ACCEPTED | DEFERRED |

---

## 28. Adjacent Findings

### Finding AF-001: `publicInquiry.service.ts` Not Created (INQUIRY-004 Original Design)

**Title:** Missing inquiry service layer
**Rationale:** MAIN-PLATFORM-ACQUISITION-IMPLEMENTATION-PLAN-TRACKER-v2.md specifies creation of `server/src/services/publicInquiry.service.ts` as part of INQUIRY-004. This file does not exist. Inquiry logic is inline in `server/src/routes/public.ts`. Phase 2 is a natural moment to extract this into a service.
**Minimum file surface:** `server/src/services/publicInquiry.service.ts` (create)
**Classification:** Implementation-ready
**Blocks this unit:** No — optional refactor for Unit 1

---

### Finding AF-002: `B2C_CATEGORY_PAGE_CONFIGS` Frontend-Only — No Server Access

**Title:** Category page slug config not accessible to server
**Rationale:** `config/publicB2CCategoryPages.ts` is a frontend workspace file. The server cannot import it. If the implementation unit requires server-side category slug validation (recommended in Section 13.3), a canonical slug list must be maintained in the server package.
**Minimum file surface:** `server/src/config/publicB2CCategoryPageSlugs.ts`
**Classification:** Implementation-ready
**Blocks this unit:** No — needed for Unit 1 implementation, not design

---

### Finding AF-003: `PUBLIC_COLLECTION_PROJECTIONS` Frontend-Only

**Title:** Collection slug list not accessible to server
**Rationale:** Same as AF-002 for collections. `config/publicCollectionsProjection.ts` is frontend-only.
**Minimum file surface:** `server/src/config/publicCollectionSlugs.ts`
**Classification:** Implementation-ready
**Blocks this unit:** No

---

### Finding AF-004: `buyer_inquiry.created.v1` Payload Missing `source_surface`

**Title:** Event contract does not yet include Phase 2 context fields
**Rationale:** `shared/contracts/event-names.md` documents only the Phase 1 payload. Phase 2 context fields (`source_surface`, `product_slug`, `category_slug`, `collection_slug`, `inquiry_message`) must be added to the event contract before runtime emission. This is handled in Unit 1 implementation.
**Minimum file surface:** `shared/contracts/event-names.md`
**Classification:** Implementation-ready (governed by Unit 1 allowlist)
**Blocks this unit:** No — recorded here; implementation unit modifies the contract

---

### Finding AF-005: `PublicInquiryPage` General Mode Context Interface Gap

**Title:** `PublicInquiryPage` props interface only supports `supplierSlug`; needs multi-context prop
**Rationale:** The current `PublicInquiryPageProps` interface only accepts `supplierSlug: string`. Phase 2 Unit 3 requires a richer context prop to carry `productSlug`, `categorySlug`, `collectionSlug`, and `sourceSurface`. A minor design sub-unit or expanded interface design is needed before Unit 3 implementation.
**Minimum file surface:** `components/Public/PublicInquiryPage.tsx` (prop interface change)
**Classification:** Design-gated (low complexity — can be resolved inline in Unit 3)
**Blocks this unit:** No

---

## 29. Acceptance Criteria

This design is accepted and implementation may proceed when:

1. ✅ All 14 repo-truth inspection questions answered (Section 4.1).
2. ✅ Phase 1 backward compatibility confirmed (Section 18).
3. ✅ No schema/migration required confirmed (Section 4.2).
4. ✅ Phase 2 request schema defined (Section 10).
5. ✅ `supplier_slug` optionality decision recorded (optional in Phase 2).
6. ✅ Context exclusivity rule defined (Section 10.1).
7. ✅ Source surface enum defined (Section 12).
8. ✅ Context validation fail-closed rules defined (Section 13).
9. ✅ Message field rules defined (Section 14).
10. ✅ PII/private-data boundary defined (Section 15).
11. ✅ Response schema unchanged confirmed (Section 11).
12. ✅ OpenAPI change summary defined (Section 19).
13. ✅ Event payload change summary defined (Section 20).
14. ✅ Frontend service change summary defined (Section 21).
15. ✅ Implementation sequencing defined (Section 23).
16. ✅ Allowlists defined (Section 24).
17. ✅ Backend verification plan defined (Section 25).
18. ✅ Production verification plan defined (Section 26).
19. ✅ Deferred items recorded (Section 27).
20. ✅ Adjacent findings recorded (Section 28).

**Design status: DESIGN_COMPLETE**

---

## 30. Recommended Next Unit

`PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001`

Implement the backend/OpenAPI/service/event contract extension as defined in Section 23 Unit 1 and Section 24 Unit 1 allowlist.

Do not start implementation without explicit authorization prompt.
