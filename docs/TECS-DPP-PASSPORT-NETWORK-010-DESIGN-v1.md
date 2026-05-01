# TECS-DPP-PASSPORT-NETWORK-010 — Passport Network Expansion Design Packet

**Unit:** TECS-DPP-PASSPORT-NETWORK-010  
**Type:** DESIGN-ONLY — no schema, route, migration, UI, or test changes in this unit  
**Status:** DESIGN_COMPLETE  
**Design Date:** 2026-05-01  
**Authored by:** Copilot (repo-truth verified)  
**Prerequisite:** TECS-DPP-PASSPORT-NETWORK-010A — VERIFIED_COMPLETE (commit `5991bd5`, governance `adb15ad`)

---

## 1. Title / Unit / Status

**Title:** TECS-DPP-PASSPORT-NETWORK-010 — Passport Network Expansion Design Packet  
**Status:** DESIGN_COMPLETE — all design gates pass; no implementation blockers encountered.

---

## 2. Scope and Non-Scope

### In Scope

- Expanded DPP data model (product identity, material composition, traceability, certifications, trade linkage, sustainability, public/machine-readable)
- Evidence vault architecture and evidence type taxonomy
- Trade linkage design (RFQ, orders, trades, certifications, audit)
- Public Buyer Page v2 design (richer product story, mobile QR, cert cards, revocation states)
- QR image / printable label productionization options (A/B/C with recommendation)
- JSON-LD / machine-readable standards path (gated, safe URL shapes only)
- Public route rate limiting and abuse prevention design
- Real AI Passport Assistant v2 architecture (model-backed, advisory, guarded)
- White-label DPP naming and configuration design
- Production fixture / runtime verification strategy addressing 010A limitation
- Implementation slice sequencing (010-B through 020)
- Decision gates requiring Paresh authorization

### Out of Scope (Forbidden in This Unit)

- Any schema changes or migrations
- Any route additions, removals, or modifications
- UI component changes
- Package dependency additions
- Playwright / E2E spec additions
- Production deployment
- Seeding QA fixtures
- Authorizing platform launch
- JSON-LD endpoint implementation
- QR image generation implementation
- Rate limiting implementation
- Any implementation work of any kind

---

## 3. Repo-Truth Baseline

> Verified against actual code state as of HEAD `adb15ad` (2026-05-01).

### 3.1 Tenant DPP Page (`components/Tenant/DPPPassport.tsx`)

- Slices A–G fully implemented and closed
- **Slice A:** UI label maps — `passportStatusLabels`, `maturityLabels`, badge color maps (lines ~100–150)
- **Slice B:** Maturity ladder — `dpp-maturity-ladder` with L1–L4 visual with current level highlight
- **Slice C:** Status transition — `dpp-passport-assistant-status-action` transitions DRAFT→INTERNAL→TRADE_READY→PUBLISHED
- **Slice D:** GLOBAL_DPP reachability — `dpp-maturity-indicator` shows bronze/silver/gold/platinum tiers
- **Slice E (UI):** Public link panel — `dpp-public-passport-panel` (URL display, open link, copy button) gated on `passportStatus === 'PUBLISHED' && !!passportData.publicPassportId`; `dpp-public-passport-unavailable` shown otherwise
- **Slice F:** QR fallback — `dpp-qr-label` printable label (URL text only, no rendered QR image)
- **Slice G:** Passport Assistant — `dpp-passport-assistant` deterministic guidance (7 panels per maturity level)
- **010A:** `publicPassportId: string | null` in `DppPassportView` interface; public link panel added

**Known gaps in current DPPPassport.tsx:**
- No product identity fields displayed
- No material composition section
- No supply chain timeline
- No certification evidence cards
- No trade linkage
- No sustainability/circularity section

### 3.2 Public Buyer Page (`components/Public/PublicPassport.tsx`)

- Route: `/passport/:publicPassportId` (App.tsx lines ~1928/1960/1966)
- Unauthenticated; fetches `GET /api/public/dpp/:publicPassportId`
- Displays: product name, category, maturity badge, certifications list, lineage depth, AI evidence claims count
- Displays: `public-passport-qr-label` (URL text fallback, no rendered QR image)
- Displays public link as `window.location.origin + '/passport/:publicPassportId'` or fallback
- `aiExtractedClaimsCount` is hardcoded `0` on public route — GUC mismatch (`app.current_org_id` vs `app.org_id`) noted in `public.ts` lines 672 and 889
- No product story narrative, no supply chain timeline, no cert evidence cards

### 3.3 Public API (`server/src/routes/public.ts`)

- `GET /api/public/dpp/:publicPassportId` — unauthenticated, no rate limit plugin applied
- `D6MaturityLevel` type defined locally (duplicate of `DppMaturityLevel` in tenant.ts — not yet consolidated)
- `aiExtractedClaimsCount: 0` fixed value — GUC key mismatch deferred
- `GLOBAL_DPP` returned by `computeDppMaturityPublic` when all criteria met (line 723)
- No JSON-LD output, no structured-data endpoint
- No rate limiting or enumeration protection

### 3.4 Tenant API (`server/src/routes/tenant.ts`)

- `GET /api/tenant/dpp/:nodeId/passport` returns: `passportStatus`, `passportMaturity`, `publicPassportId` (PUBLISHED + non-null `public_token` only), `passportEvidenceSummary`
- `PATCH /api/tenant/dpp/:nodeId/passport/status` — governed status transition endpoint (Slice C)
- `DppMaturityLevel` defined locally (duplicate of `D6MaturityLevel` in public.ts)
- `computeDppMaturity()` — maturity logic local to route handler
- No product identity, material composition, or trade linkage fields in GET response

### 3.5 Status Transition API

- PATCH `/api/tenant/dpp/:nodeId/passport/status` fully implemented
- State machine: DRAFT → INTERNAL → TRADE_READY → PUBLISHED (forward only)
- `public_token` generated on PUBLISHED transition
- `reviewed_at` / `reviewed_by_user_id` recorded

### 3.6 Maturity Computation (Both Surfaces)

| Level | Current criteria | Reachable? |
|---|---|---|
| `LOCAL_TRUST` (Bronze) | Fallback — all other cases | ✅ Yes |
| `TRADE_READY` (Silver) | `approvedCertCount >= 1 AND lineageDepth >= 1` | ✅ Yes |
| `COMPLIANCE` (Gold) | Reserved — comment: "requires explicit future criteria" | ❌ No |
| `GLOBAL_DPP` (Platinum) | Reserved — comment: "requires D-6 public gate + PUBLISHED status" | ❌ No (public route has GLOBAL_DPP reachable; tenant route still reserves it) |

> Note: `computeDppMaturityPublic` in `public.ts` line 723 does return `GLOBAL_DPP` under some condition, but the tenant route still marks it reserved. This asymmetry should be addressed in 010.

### 3.7 Public Passport Link Exposure (010A)

- Tenant GET passport API returns `publicPassportId` only when `status = PUBLISHED` AND `public_token` is non-null
- Tenant DPP page shows link panel when both conditions met; shows unavailable panel otherwise
- **Known limitation:** No real PUBLISHED passport fixture in QA seed data — authenticated positive path not runtime-verified
- Anti-leakage E2E test (DPP-E2E-11) passes: `publicPassportId` not exposed on public 404 response

### 3.8 Unsafe `.json` Route

- `GET /api/public/dpp/:publicPassportId.json` is **absent and intentionally absent**
- D6 hotfix `3e5303a` removed it; D2-S02 test asserts absence
- This design does NOT reference or plan this route shape

### 3.9 Rate Limiting

- Auth routes (`rateLimitAttempt` table, `auditLog.ts`) have rate limiting on login/register paths
- **Public DPP route `GET /api/public/dpp/:publicPassportId` has NO rate limiting**
- No Fastify rate-limit plugin referenced in `public.ts` or `tenant.ts` for DPP routes

### 3.10 Adjacent Known Issues Carried Forward

| Issue | Status |
|---|---|
| `aiExtractedClaimsCount = 0` on public route | GUC key mismatch — deferred |
| `DppMaturityLevel` / `D6MaturityLevel` duplicate type definitions | Not consolidated — deferred |
| `COMPLIANCE` maturity level unreachable | Reserved — criteria not defined |
| `GLOBAL_DPP` maturity asymmetry (public route reaches it; tenant does not) | Deferred |
| No QR image rendered (URL-text fallback only) | Dependency-gated |
| JSON-LD not implemented | Design-gated |
| Public route rate limiting absent | Before-GA requirement |
| WL DPP naming not implemented | Decision-gated |
| No product identity / material composition model | Design-gated (this packet) |
| No evidence vault | Design-gated (this packet) |
| No trade linkage | Design-gated (this packet) |
| No full supply chain timeline on public page | Design-gated (this packet) |
| E2E authenticated published-positive path | Missing PUBLISHED fixture |
| Full platform launch | NOT AUTHORIZED |

---

## 4. Foundation Completion Summary

### Foundation Productization: COMPLETE

The prior packet (Slices A–G + 010A) established:

| Capability | State |
|---|---|
| Product naming architecture | ✅ Complete |
| Lite-to-Global ladder UI | ✅ Complete |
| Maturity badge system (Bronze/Silver/Gold/Platinum) | ✅ Complete (UI only; Gold/Platinum unreachable) |
| Governed status transition API | ✅ Complete |
| Public buyer page (basic) | ✅ Complete |
| Public passport link exposure in tenant view | ✅ Complete (010A) |
| QR printable label (URL text fallback) | ✅ Complete |
| Deterministic Passport Assistant | ✅ Complete |
| E2E anti-regression coverage (11 tests) | ✅ Complete |

### What This Does NOT Make Complete

The foundation phase is **not the final DPP product.** What remains:

| Capability | State |
|---|---|
| Richer product identity (SKU, batch, photos) | ❌ Not started |
| Material composition | ❌ Not started |
| Supply chain traceability timeline | ❌ Not started |
| Evidence vault with typed document references | ❌ Not started |
| Trade linkage (RFQ, orders, shipments) | ❌ Not started |
| Sustainability / circularity fields | ❌ Not started |
| QR image rendering | ❌ Dependency-gated |
| JSON-LD / machine-readable output | ❌ Design-gated |
| Public route rate limiting | ❌ Not implemented |
| Model-backed AI Passport Assistant | ❌ Not started |
| White-label DPP naming | ❌ Decision-gated |
| COMPLIANCE + GLOBAL_DPP maturity reachability | ❌ Criteria undefined |
| QA fixture for authenticated published path | ❌ Not created |

---

## 5. Expansion Vision

> **TexQtic DPP Passport Network should become a living product trust infrastructure.**

The previous packet made the DPP visible, navigable, and governed.  
This expansion must make the DPP **deep, trustworthy, tradeable, and machine-readable** — progressively.

### Five Passport Layers

Each layer adds a new dimension of product trust. Layers are progressive — a supplier activates each layer as their market readiness grows.

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 5: Machine-Readable Passport  ← JSON-LD, GS1, regulators │
│  LAYER 4: Trade Passport             ← RFQ, orders, trade proof  │
│  LAYER 3: Cert Passport              ← evidence vault, certs     │
│  LAYER 2: Trace Passport             ← supply chain timeline     │
│  LAYER 1: Product Passport           ← identity, materials, QR   │
└─────────────────────────────────────────────────────────────┘
```

### Buyer Experience Goal

| Buyer action | Current state | Target state (post-expansion) |
|---|---|---|
| Scan QR → public page | Gets basic JSON | Gets product story, cert cards, timeline |
| Verify supplier | Sees maturity badge | Sees verified supply chain + evidence summary |
| Export compliance check | Nothing | Sees COMPLIANCE / GLOBAL_DPP tier + JSON-LD |
| Discover product details | None | Material composition, photos, origin |

### Seller Experience Goal

| Seller tier | Current state | Target state |
|---|---|---|
| Local MSME | Sees maturity badge + assistant | Sees completion score + next step nudge |
| B2B trade-ready | Sees maturity + link | Sees trade linkage dashboard + buyer confidence signals |
| Certified seller | Sees cert count | Sees evidence vault + expiry management |
| Export-ready seller | Sees GLOBAL_DPP placeholder | Sees JSON-LD preview + regulator-ready state |

### Product Principle (Preserved from 002)

> **Local sellers feel: "This helps me sell better."**  
> **Export sellers feel: "This helps me comply."**  
> **Buyers feel: "This helps me trust faster."**

DPP expansion must remain progressive. The completion score, evidence vault, and machine-readable layers should only surface to sellers who are pursuing those tiers. Local MSMEs should never see EU compliance language, carbon data fields, or JSON-LD concepts.

---

## 6. Expanded DPP Data Model

> Classification legend:  
> 🟢 Already supported | 🔵 UI-only (no API) | 🟡 API-only (no UI) | 🔴 Requires schema | 🟠 Requires document/evidence vault | 🟣 Requires trade linkage | ⚪ Future-gated

### 6A. Product Identity

| Field | Classification | Notes |
|---|---|---|
| Product name | 🟢 Already supported | `dpp_snapshot_products_v1.name` |
| Category | 🟢 Already supported | `dpp_snapshot_products_v1.category` |
| SKU / style code | 🔴 Requires schema | Not present in current model |
| Batch / lot number | 🔴 Requires schema | Not present; needed for traceability |
| Brand / manufacturer name | 🟢 Already supported | `dpp_snapshot_products_v1.manufacturer_name` |
| Country of origin | 🟢 Already supported | `dpp_snapshot_products_v1.country_of_origin` (likely) |
| Facility / factory identity | 🔴 Requires schema | Separate from org-level data |
| Product photos | 🔴 Requires schema | Image URLs; separate `dpp_product_images` table recommended |
| Product description | 🔴 Requires schema | Rich text block |
| Issue date / model year | 🔴 Requires schema | Batch/season identifier |

**Design decision needed:** How granular is facility identity? Is it the TraceabilityNode org, or a separate facility table?

### 6B. Material Composition

| Field | Classification | Notes |
|---|---|---|
| Primary material / fibre type | 🔴 Requires schema | E.g. cotton, polyester, wool |
| Fibre blend percentages | 🔴 Requires schema | Array: `[{material, percentage}]` |
| Recycled content percentage | 🔴 Requires schema | 0–100%; future sustainability gate |
| Organic content percentage | 🔴 Requires schema | E.g. GOTS-certified organic cotton |
| Dye / finish category | 🔴 Requires schema | Low-impact, synthetic, natural, undeclared |
| Restricted substances declaration | 🔴 Requires schema | Self-attested at minimum; cert-backed preferred |
| Hazardous material flag | ⚪ Future-gated | EU REACH / Annex XVII scope |

**MSME progressive design:** Show material composition fields only after L1 (Local Profile). Do not require recycled/organic/hazardous fields until L3 (Certified Passport). Gate restricted substances at L4 (Global DPP).

### 6C. Supply Chain / Traceability

| Field | Classification | Notes |
|---|---|---|
| Lineage depth | 🟢 Already supported | `lineageDepth` from `dpp_snapshot_lineage_v1` |
| Supply chain nodes (typed) | 🟡 API-only | Lineage nodes exist; not surfaced as typed timeline |
| Yarn / fibre source node | 🟡 API-only | Exists as lineage node; needs typed edge label |
| Fabric source node | 🟡 API-only | Same |
| Processing / dyeing / finishing node | 🟡 API-only | Same |
| Garment manufacturing node | 🟡 API-only | Root node typically |
| Testing lab reference | 🟠 Requires evidence vault | Lab cert must link to node |
| Logistics milestone | 🣄 Requires trade linkage | Shipment dispatch; not in DPP schema today |
| Lineage graph timeline view | 🔵 UI-only | Exists as depth count; needs timeline UI |

**Design decision needed:** Should traceability timeline be derived from lineage graph nodes + edge types, or modeled as a separate ordered array? Recommendation: derive from lineage graph for now; structured timeline is a Slice 015 UI design concern.

### 6D. Certifications / Evidence

| Field | Classification | Notes |
|---|---|---|
| Certificate name | 🟢 Already supported | `dpp_snapshot_certifications_v1.certification_type` |
| Issuing body | 🔴 Requires schema | Not currently stored |
| Certificate number | 🔴 Requires schema | Not currently stored |
| Validity date | 🟢 Already supported | `expiry_date` in certifications view |
| Lifecycle state | 🟢 Already supported | `lifecycle_state_name` |
| Document attachment reference | 🟠 Requires evidence vault | File/URL reference to cert document |
| Verification state | 🔴 Requires schema | Platform-verified vs self-declared |
| Human-review status | 🟢 Already supported | `humanReviewRequired: true` structural constant on claims |
| Cert expiry alert flag | 🔴 Requires schema | Derived from `expiry_date`; alerting logic needed |

**Evidence vault is the enabling primitive for most certification depth.** See Section 7.

### 6E. Trade Linkage

| Field | Classification | Notes |
|---|---|---|
| RFQ reference | 🟣 Requires trade linkage | No current RFQ-to-DPP link in schema |
| PO / order reference | 🟣 Requires trade linkage | Orders exist (checkout lifecycle); no DPP link yet |
| Invoice reference | 🟣 Requires trade linkage | Not modeled |
| Shipment / dispatch proof | 🟣 Requires trade linkage | Not modeled |
| QC report reference | 🟠 Requires evidence vault | Links to cert/document record |
| Buyer acceptance signal | 🟣 Requires trade linkage | Not modeled |
| Trade trust / escrow references | ⚪ Future-gated | TradeTrust Pay — not authorized for this phase |

See Section 8 for full trade linkage design.

### 6F. Sustainability / Circularity

| Field | Classification | Notes |
|---|---|---|
| Repair instructions | ⚪ Future-gated | Circular economy; not current priority |
| Resale eligibility | ⚪ Future-gated | Platform product decision |
| Recycling instructions | ⚪ Future-gated | Consumer-facing; L4 scope |
| Take-back partner | ⚪ Future-gated | Requires partner integration |
| End-of-life guidance | ⚪ Future-gated | L4 / GLOBAL_DPP scope |
| Water footprint | ⚪ Future-gated | Advanced — EU Textile Strategy scope |
| Carbon footprint | ⚪ Future-gated | Advanced — EU Textile Strategy scope |
| Chemical / SVHC disclosure | ⚪ Future-gated | REACH-scope; L4 only |

**Recommendation:** None of these fields should be exposed to local MSMEs at L1/L2. Gate at L3 (Certified Passport) minimum; most are L4 (Global DPP) only.

### 6G. Public / Machine-Readable

| Field | Classification | Notes |
|---|---|---|
| Public passport URL | 🟢 Already supported | `window.location.origin + '/passport/' + publicPassportId` |
| QR payload URL | 🔵 UI-only | URL rendered as text; no QR image yet |
| `public_token` | 🟡 API-only | UUID, not exposed raw to buyer |
| `publicPassportId` | 🟢 Already supported | Returned by tenant API when PUBLISHED |
| Publication state | 🟢 Already supported | DRAFT / INTERNAL / TRADE_READY / PUBLISHED |
| Revocation / expiry state | 🔴 Requires schema | No revoked/expired state in current schema |
| JSON-LD mapping | ⚪ Future-gated | Safe endpoint shape needed (see Section 11) |
| GS1-style digital link ID | ⚪ Future-gated | Not authorized; format decision needed |

---

## 7. Evidence Vault Design

### 7.1 Purpose

The Evidence Vault is the enabling layer that allows a DPP passport to carry **referenced, typed, visibility-classified proof** — rather than just counts and computed maturity levels.

Without an evidence vault, the DPP can only say "has 2 certificates."  
With an evidence vault, the DPP can say "has GOTS certificate #12345, issued by Control Union, valid until 2027, with document reference, reviewed by user, visible to buyers."

### 7.2 Evidence Type Taxonomy

| Evidence Type | Description | Source object |
|---|---|---|
| `CERTIFICATE` | Third-party issued product/process certification | Certification model |
| `TEST_REPORT` | Lab test result (e.g. OEKO-TEX, Hohenstein) | Document upload |
| `QC_REPORT` | Quality control inspection report | QC model or document upload |
| `INVOICE` | Trade invoice (buyer-seller) | Trade model |
| `PURCHASE_ORDER` | Order document from buyer | Orders model |
| `DISPATCH_PROOF` | Shipping bill, courier dispatch, logistics proof | Shipment model |
| `BUYER_ACCEPTANCE` | Buyer acceptance / GRN | Trade model |
| `AUDIT_DOCUMENT` | Factory audit, social compliance audit | Document upload |
| `EXTRACTION_OUTPUT` | AI-extracted claim backed by a source document | `DppEvidenceClaim` |
| `HUMAN_REVIEWED_CLAIM` | AI claim confirmed by a human reviewer | `DppEvidenceClaim` (approvedBy set) |
| `SUSTAINABILITY_DECLARATION` | Self-attested recycled/organic/carbon declaration | Declaration model |

### 7.3 Evidence Vault Data Model (Conceptual — Schema Required)

```
dpp_evidence_items
  id               UUID PK
  org_id           UUID NOT NULL  (RLS boundary)
  node_id          UUID NOT NULL  (FK → TraceabilityNode)
  evidence_type    ENUM (see taxonomy)
  title            TEXT NOT NULL
  source_table     TEXT           (e.g. 'certifications', 'dpp_evidence_claims')
  source_id        UUID           (FK to source object)
  document_url     TEXT           (optional; signed URL or stored path)
  issuing_body     TEXT
  reference_number TEXT
  issued_at        TIMESTAMPTZ
  expires_at       TIMESTAMPTZ
  visibility       ENUM: PRIVATE | AUTHENTICATED_BUYER | PUBLIC_SUMMARY | AUDITOR_FUTURE
  review_state     ENUM: PENDING | HUMAN_REVIEWED | REJECTED | EXPIRED
  reviewed_by      UUID           (FK → users)
  reviewed_at      TIMESTAMPTZ
  created_at       TIMESTAMPTZ DEFAULT now()
  updated_at       TIMESTAMPTZ DEFAULT now()
```

**RLS rule:** `WHERE org_id = current_setting('app.org_id')` — all reads scoped to org.

### 7.4 Visibility Levels

| Level | Who can see |
|---|---|
| `PRIVATE` | Tenant user only. Never exposed externally. |
| `AUTHENTICATED_BUYER` | Authenticated buyer with an active order/RFQ relationship to this supplier. |
| `PUBLIC_SUMMARY` | Anyone on the public passport page — but only title, type, issuing body, validity, and review state. Never raw document. |
| `AUDITOR_FUTURE` | Reserved: regulator / certifying body access. Not authorized for this phase. |

**Critical:** Raw document URLs must never be exposed publicly. Public summary shows existence, metadata, and review state only.

### 7.5 Evidence Expiry Behavior

- Evidence items with `expires_at < now()` are considered `EXPIRED`
- Expired items reduce maturity score
- Expired `CERTIFICATE` items should trigger Passport Assistant guidance
- Expiry does not auto-revoke passport status — human action required

### 7.6 AI-Extracted Claims Integration

- `DppEvidenceClaim` records (already present) should be linkable to `dpp_evidence_items`
- An evidence item of type `EXTRACTION_OUTPUT` references a specific claim
- An evidence item of type `HUMAN_REVIEWED_CLAIM` references an approved claim (`approvedBy` is non-null)
- This allows the evidence vault to include AI-backed evidence that has cleared human review

### 7.7 Evidence Vault Connection to Maturity

Once the evidence vault is implemented, maturity criteria should be redefined:

| Level | Enhanced criteria |
|---|---|
| `LOCAL_TRUST` | ≥1 evidence item (any type, PRIVATE or above) |
| `TRADE_READY` | ≥1 CERTIFICATE or TEST_REPORT at PUBLIC_SUMMARY visibility |
| `COMPLIANCE` | ≥2 HUMAN_REVIEWED certificates + QC_REPORT + ≥2 lineage nodes |
| `GLOBAL_DPP` | All COMPLIANCE criteria + PUBLISHED + ≥1 SUSTAINABILITY_DECLARATION + ≥3 lineage nodes |

> **These are proposed enhanced criteria — not yet implemented. Paresh decision gate required.**

---

## 8. Trade Linkage Design

### 8.1 Purpose

A passport becomes **trade-ready** when it is connected to real commercial transactions — not just self-declared product data. Trade linkage is the bridge between DPP trust and trade finance / buyer confidence.

### 8.2 Known Orders Reality (from repo context)

> **IMPORTANT:** Orders in TexQtic are verified as a **marketplace/cart checkout lifecycle** (buyer → cart → order). They are NOT:
> - RFQ-to-Order B2B flow
> - Supplier-side B2B order management
> - Escrow / payment / settlement system
> - DPP-linked trade finance
>
> Do not assume orders are already wired to DPP. They are not.

### 8.3 Trade Linkage Table

| Linkage | Current data | Required API work | Required schema work | Visibility | Public treatment |
|---|---|---|---|---|---|
| RFQ reference | No RFQ model in DPP | New DPP-RFQ link table needed | Yes | AUTHENTICATED_BUYER | Never public |
| Order reference | Orders exist (checkout); no DPP link | `dpp_trade_links` table needed | Yes | AUTHENTICATED_BUYER | Count only (public) |
| Invoice reference | No invoice model | New trade document model | Yes | AUTHENTICATED_BUYER | Never public |
| Shipment / dispatch proof | No shipment model | New shipment link | Yes | AUTHENTICATED_BUYER | "Dispatched" boolean (public) |
| QC report | Via evidence vault | Evidence vault API | Via evidence vault | PUBLIC_SUMMARY | Summary only |
| Buyer acceptance | No model | New acceptance signal model | Yes | AUTHENTICATED_BUYER | Count only (public) |
| Trade trust / escrow | Not modeled | Not in scope this phase | Not in scope | N/A | Future-gated |
| Certifications | Exists in schema | Already linked | None | PUBLIC_SUMMARY | Full summary (public) |
| Traceability | Exists (lineage graph) | Already available | None | PUBLIC_SUMMARY | Depth + nodes (public) |
| Audit log | Partial (passport status) | Extend to trade events | Minor | PRIVATE | Never public |

### 8.4 Proposed `dpp_trade_links` Table (Conceptual)

```
dpp_trade_links
  id           UUID PK
  org_id       UUID NOT NULL  (RLS boundary)
  node_id      UUID NOT NULL  (FK → TraceabilityNode)
  link_type    ENUM: RFQ | ORDER | INVOICE | SHIPMENT | BUYER_ACCEPTANCE
  source_table TEXT           (e.g. 'orders', 'rfqs')
  source_id    UUID
  linked_at    TIMESTAMPTZ
  visibility   ENUM: PRIVATE | AUTHENTICATED_BUYER | PUBLIC_COUNT
```

### 8.5 Public vs Private Treatment

The public passport must **never** expose:
- Order IDs, RFQ IDs, invoice numbers, buyer identities
- Buyer acceptance details or shipment values
- Pricing signals from trade data

The public passport **may** expose:
- "This product has been ordered by verified buyers" (count only)
- "Dispatched: Yes" (boolean only)
- QC summary (pass/fail, lab name)
- Certification evidence summary

---

## 9. Public Buyer Page v2 Design

### 9.1 Current State

The existing `PublicPassport.tsx` is a basic skeleton:
- Product name, category, maturity badge
- Certification list (type + lifecycle state)
- Lineage depth count
- AI claims count (hardcoded `0`)
- QR URL label (text fallback only)

No product story, no supply chain timeline, no cert evidence cards, no mobile-optimized QR layout.

### 9.2 v2 Design Sections

```
PUBLIC BUYER PAGE v2 LAYOUT
══════════════════════════════════════════

[1] PASSPORT HEADER
  - Product name + category
  - Brand / manufacturer
  - Country of origin
  - Passport maturity tier badge (Bronze/Silver/Gold/Platinum)
  - Publication date
  - Revocation / expiry state (if applicable)

[2] PRODUCT STORY (narrative)
  - Auto-generated from structured data:
    e.g. "Made in India by [Brand]. Contains [material] from [origin].
         Certified by [issuing body] (valid until [date])."
  - Human-editable in future expansion

[3] MATERIAL COMPOSITION CARD
  - Fibre/material breakdown (% display)
  - Recycled content badge (if > 0)
  - Organic content badge (if > 0)
  - Certification linkage (e.g. GOTS, OCS)
  - Privacy: show only if visibility ≥ PUBLIC_SUMMARY

[4] SUPPLY CHAIN TIMELINE
  - Ordered list of supply chain nodes
  - Each node: type, location, role
  - Show node count and deepest tier
  - Privacy: show node types, not supplier names below PUBLIC_SUMMARY

[5] CERTIFICATION EVIDENCE CARDS
  - Card per certificate: name, issuing body, validity, review state
  - Visual: valid → green badge; expired → amber; pending → grey
  - No certificate number or raw document on public page

[6] SUSTAINABILITY SUMMARY (if L4 / GLOBAL_DPP only)
  - Recycled content %, organic content %
  - Carbon/water: only if L4 and declared
  - End-of-life guidance (brief)
  - Show only for GLOBAL_DPP maturity tier

[7] QR / SHARE PANEL
  - Rendered QR image (post Slice 016 implementation)
  - "Share this passport" copy link
  - Print-optimized fallback (current URL label)

[8] PUBLIC STATUS STATES
  - PUBLISHED → show full passport
  - REVOKED → show "Passport Revoked" state page; do not 404 (see §12)
  - EXPIRED (future) → show "Passport Expired" state page
  - NOT FOUND → same generic not-found page as revoked (enumeration resistance)
```

### 9.3 Privacy-Safe Data Boundaries

Do NOT expose on public page:
- `org_id`, `node_id`, `dpp_passport_states.id`
- Supplier pricing or margin information
- Buyer identity or buyer relationship data
- Internal workflow IDs (order IDs, RFQ IDs, etc.)
- Reviewer user IDs or internal user references
- Raw AI extraction text (pre-review)
- Document URLs (signed or otherwise)
- `public_token` value (only used server-side as lookup key)

### 9.4 Mobile QR Scan Experience

Priority design rule: The page must render correctly when opened from a QR scan on a mobile device.

- Hero section (product name + maturity tier) must be above the fold on 375px width
- QR image (post Slice 016) must not appear on the same page as itself (canonical URL vs QR URL are the same)
- Share / copy link must work on mobile (no desktop-only clipboard API)
- Print layout (for `@media print`) must include product name, all cert cards, QR label, and public URL

### 9.5 Unavailable / Revoked / Expired UX

| State | UX treatment | HTTP status |
|---|---|---|
| PUBLISHED | Full passport | 200 |
| Not found (no public_token match) | "This passport is not available" generic page | 404 (see §12 for enumeration implications) |
| REVOKED (future) | "This passport has been revoked" page | 410 Gone (recommended; see §12) |
| EXPIRED (future) | "This passport has expired" page | 200 (expired is not an error) |
| DRAFT / INTERNAL / TRADE_READY (accessed via token) | Should not be reachable (public_token only set on PUBLISHED) | 404 by current design |

---

## 10. QR / Label Productionization Design

### 10.1 Current State

- `dpp-qr-label` in `PublicPassport.tsx` renders the passport URL as plain text + print stylesheet
- No QR image is generated
- Current state is intentionally "QR label fallback" — the URL can be pasted into a QR generator manually

### 10.2 QR Payload Contract

Regardless of option chosen:
- QR payload MUST be: `https://app.texqtic.com/passport/:publicPassportId`
- QR must NOT point to: `/api/public/dpp/:publicPassportId` (API URL, not buyer page URL)
- QR must NOT use `.json` suffix or any unsafe route shape
- QR must NOT encode `nodeId`, `orgId`, or internal tokens

### 10.3 Option A — Client-Side QR Package

**Approach:** Add a QR rendering React component using e.g. `react-qr-code` or `qrcode.react`

| Dimension | Detail |
|---|---|
| Package | `react-qr-code` (MIT, ~10KB gzipped) or `qrcode.react` (MIT, ~18KB) |
| Rendering | SVG (preferred) or Canvas |
| Where | `PublicPassport.tsx` and `DPPPassport.tsx` QR label section |
| Pros | No server round-trip; works offline/export; SVG scalable for print |
| Cons | Adds a package dependency (requires Paresh approval); adds ~10–18KB to client bundle |
| Test strategy | Unit test: render QR with known URL → assert SVG contains correct path; E2E: assert `data-testid="dpp-qr-image"` visible |
| Dependency impact | One new `dependencies` entry in root `package.json` + `client/` (if applicable); minor bundle impact |

**Recommended if:** client bundle size is acceptable and no server-side rendering is needed.

### 10.4 Option B — Server-Side QR PNG Endpoint

**Approach:** New unauthenticated route `GET /api/public/dpp/:publicPassportId/qr` that returns a PNG image

| Dimension | Detail |
|---|---|
| Package | `qrcode` (Node.js, MIT) — server-side only |
| Response | `image/png` binary |
| Route shape | `/api/public/dpp/:publicPassportId/qr` (path segment — safe, no `.json` suffix) |
| Caching | `Cache-Control: public, max-age=86400` (24h); immutable per `publicPassportId` |
| Rate limiting | Must share the same rate limit budget as the main public DPP route |
| Pros | No client bundle impact; PNG usable in print systems outside browser |
| Cons | Server dependency; second request per passport page load; PNG scales poorly vs SVG |
| Security | Same enumeration risk as main route; must normalize 404 for unknown tokens |
| Test strategy | E2E: `GET /api/public/dpp/:id/qr` → `content-type: image/png` when PUBLISHED; 404 when not found |

### 10.5 Option C — URL Text Label (Current State)

| Dimension | Detail |
|---|---|
| State | Implemented |
| Limitation | Not a scannable QR; user must manually generate QR or type URL |
| Use case | Print catalogs where URL is sufficient; no-JS environments |
| Acceptable as? | Permanent state? No. Acceptable as interim? Yes. |

### 10.6 Recommendation

**Option A (client-side SVG QR)** for implementation when authorized.

Rationale:
- No server complexity
- SVG scales for print
- No additional server-side route (simpler security surface)
- Bundle impact minimal
- Dependency is single-purpose, MIT, well-maintained

**Authorization required:** One new package (`react-qr-code` or equivalent). Paresh must approve.

---

## 11. JSON-LD / Machine-Readable Standards Design

### 11.1 Why JSON-LD is Not the Current Route

1. **D6 hotfix constraint:** `GET /api/public/dpp/:id.json` was intentionally removed (`3e5303a`) because backslash in Fastify route string crashes all routes. This risk makes `.json` suffix permanently unsafe.
2. **Standard is not final:** EU DPP regulation (ESPR) Delegated Acts for textiles are not finalized. Mandating a specific JSON-LD schema now would create churn.
3. **Privacy filtering is non-trivial:** Structuring all DPP fields as JSON-LD while applying the `PRIVATE` / `AUTHENTICATED_BUYER` / `PUBLIC_SUMMARY` visibility rules requires careful mapping.
4. **Buyer need is not urgent:** For B2B SME buyers on TexQtic, JSON-LD adds no immediate value. It is primarily for integrators, regulators, and EU compliance systems.

### 11.2 Safe URL / Format Options

| Option | URL shape | Safety | Notes |
|---|---|---|---|
| Accept header negotiation | `GET /api/public/dpp/:id` with `Accept: application/ld+json` | ✅ Safe | No URL change; behavior changes by header |
| Path segment | `GET /api/public/dpp/:id/json-ld` | ✅ Safe | Explicit sub-resource; no find-my-way issue |
| Path segment | `GET /api/public/dpp/:id/structured-data` | ✅ Safe | Neutral naming; not tied to specific schema |
| Query param | `GET /api/public/dpp/:id?format=json-ld` | ✅ Safe | Simple; works with any HTTP client |
| `.json` suffix | `GET /api/public/dpp/:id.json` | ❌ FORBIDDEN | Unsafe — verified crash risk |
| `.jsonld` suffix | `GET /api/public/dpp/:id.jsonld` | ❌ FORBIDDEN | Same backslash risk |

**Recommended shape:** `GET /api/public/dpp/:publicPassportId/structured-data`  
Rationale: path segment is explicit, schema-neutral, and safe. Accept header negotiation is also acceptable but less discoverable.

### 11.3 GS1 Alignment

- GS1 Digital Link standard (`https://id.gs1.org/01/:gtin/...`) is relevant for product-level DPP
- TexQtic does not currently model GTIN — product identity uses internal node IDs
- **Future-gated:** GS1 alignment requires product identity schema additions (SKU, batch, GTIN field) before it is meaningful
- Do not block JSON-LD pilot on GS1 alignment; start with TexQtic-native schema and annotate with `@context` for partial mapping

### 11.4 Field Mapping Approach

```json
{
  "@context": "https://texqtic.com/dpp/v1",
  "@type": "ProductPassport",
  "id": "https://app.texqtic.com/passport/:publicPassportId",
  "productName": "...",
  "category": "...",
  "brandName": "...",
  "countryOfOrigin": "...",
  "materialComposition": [
    { "material": "cotton", "percentage": 80 },
    { "material": "polyester", "percentage": 20 }
  ],
  "certifications": [
    {
      "name": "GOTS",
      "issuingBody": "Control Union",
      "validUntil": "2027-03-31",
      "reviewState": "HUMAN_REVIEWED"
    }
  ],
  "maturityLevel": "TRADE_READY",
  "supplyChainDepth": 3,
  "passportStatus": "PUBLISHED",
  "publishedAt": "2026-01-15T00:00:00Z"
}
```

**Privacy filters apply:** Only `PUBLIC_SUMMARY` visibility fields included. No internal IDs, no document URLs, no buyer data.

### 11.5 Test Strategy

- Unit test: `GET /structured-data` returns valid JSON with `@context` and required fields
- Unit test: response does not include `orgId`, `nodeId`, `public_token`, or any `PRIVATE` field
- E2E: known published fixture → structured data contains product name and certification

### 11.6 Versioning Strategy

- `@context: "https://texqtic.com/dpp/v1"` — version locked to initial schema
- Breaking schema changes increment to `v2`
- Accept-Ranges header approach preferred over URL versioning for long-term maintenance
- Keep `v1` active for minimum 12 months after `v2` release

---

## 12. Public Route Security / Rate Limiting Design

### 12.1 Current State

`GET /api/public/dpp/:publicPassportId`:
- No rate limiting
- No enumeration protection
- No caching headers
- No noindex signal
- No abuse monitoring
- Returns 404 for unpublished tokens (correct) but same 404 for non-existent tokens (correct) — enumeration risk managed by UUID entropy only

### 12.2 Rate Limiting Design

**Target:** Prevent scraping and token enumeration of the public DPP surface.

```
Rate limit policy:
  Per IP:   100 requests / 15 minutes (sliding window)
  Per token: 1000 requests / 60 minutes (to prevent a single published passport being DoS'd)
  Burst:    20 requests / 1 minute (per IP)
  
Response on limit exceeded: 429 Too Many Requests
  Body: { "error": "rate_limited", "retryAfter": <seconds> }
  Headers: Retry-After: <seconds>
```

**Package options (no authorization given yet):**
- `@fastify/rate-limit` (official Fastify plugin, Redis-backed or in-memory)
- `fastify-rate-limit` (older, community version)
- Custom Supabase `rate_limit_attempts` table (already exists in schema for auth)

**Recommendation:** `@fastify/rate-limit` with in-memory store for MVP; Redis store for production scaling. Requires Paresh package authorization.

### 12.3 Enumeration Resistance

- `publicPassportId` is a UUID v4 — 2^122 entropy. Brute-force enumeration is infeasible.
- However, response timing differences between "exists but DRAFT" vs "does not exist" should be normalized.
- **Current behavior:** Both return 404. ✅ Already normalized.
- Future: Do not add a new response code for "exists but unpublished" that reveals existence.

### 12.4 Response Normalization for Unpublished / Revoked / Not Found

| Scenario | Recommended HTTP status | Body |
|---|---|---|
| Token not found | 404 | `{ "error": "not_found" }` |
| Token exists but DRAFT / INTERNAL / TRADE_READY | 404 | `{ "error": "not_found" }` (same as above — do not reveal existence) |
| Token exists, PUBLISHED | 200 | Full passport payload |
| Token REVOKED (future state) | 410 Gone | `{ "error": "passport_revoked" }` |
| Token EXPIRED (future state) | 200 | Passport payload with `"status": "EXPIRED"` note |

**Decision gate:** 404 vs 410 for revoked — see Decision Gates (§17).

### 12.5 Caching Headers

```
PUBLISHED response:
  Cache-Control: public, max-age=300, stale-while-revalidate=60
  ETag: hash of passport version/updated_at
  Vary: Accept

Not found / revoked:
  Cache-Control: no-store
```

### 12.6 noindex / SEO Policy

- Public passport pages SHOULD be indexable for discoverability (seller benefit)
- Exception: `REVOKED` pages must serve `X-Robots-Tag: noindex`
- Exception: tenant preview pages (INTERNAL / TRADE_READY) are not public pages and must not be indexed

### 12.7 Token Rotation on Revoke / Republish

This is a critical product decision. Two options:

**Option A — Permanent token (current implicit behavior)**
- `public_token` is set once on first PUBLISHED transition and never changed
- Republishing after DRAFT does not change the token
- Revoking to DRAFT means the token still exists but the route returns 404 (token not PUBLISHED)
- Pros: stable QR URLs; printed QR codes remain valid after republish
- Cons: token is permanently associated with the product; cannot rotate after a security concern

**Option B — Token rotation on revoke**
- Revoking to DRAFT clears or invalidates `public_token`
- Republishing generates a new `public_token`
- Pros: printed QR codes from before revoke become permanently invalid after revoke
- Cons: printed QR codes break; sellers who printed labels must reprint after republish

**Recommendation:** Option A (permanent token) for MVP. Printed QR code stability is a strong usability argument. Revocation is handled by 404 response, not token deletion.

**Decision gate required:** Paresh must confirm token rotation policy before implementing revocation behavior.

### 12.8 Abuse Monitoring

- Rate limit responses should write to an abuse log (not to `audit_logs` — separate table)
- Suspicious enumeration patterns (rapid sequential UUID requests) should be flagged
- This is a before-GA requirement — not an immediate implementation item

---

## 13. AI Passport Assistant v2 Design

### 13.1 Current State

The Passport Assistant (`dpp-passport-assistant`) is deterministic:
- Fixed guidance text per maturity level (7 panels hard-coded)
- No AI model involved
- No document processing
- No certificate expiry intelligence
- No buyer-specific readiness
- No backend endpoint — all client-side logic

### 13.2 v2 Architecture

```
AI Passport Assistant v2

CLIENT (DPPPassport.tsx)
  └── GET /api/tenant/dpp/:nodeId/passport/assistant
        └── PassportAssistantService
              ├── gather: passport state, evidence items, cert expiry, maturity gap
              ├── score: evidence quality scoring
              ├── call: AI model (advisory generation)
              ├── apply: output guardrails
              └── return: advisory recommendations + next actions

AI MODEL CALL
  ├── Provider: to be authorized (OpenAI, Azure OpenAI, or Anthropic)
  ├── Pattern: structured prompt + structured output
  ├── Input: passport state snapshot (non-sensitive summary)
  ├── Output: advisory text array (not commands; not status changes)
  └── Budget: per-call token budget enforced
```

### 13.3 Hard Constraints (Non-Negotiable)

- **AI must never change passport status.** Status transitions remain human-initiated via PATCH.
- **AI must never publish a passport.** Publication is a human action.
- **AI must never create approved evidence without human review.** `humanReviewRequired: true` is constitutional.
- **AI output is advisory only.** Every AI recommendation is prefixed with an advisory framing.
- **No sensitive data in prompt.** `orgId`, internal IDs, pricing, buyer names, must not be in AI prompt context.
- **Budget limit enforced.** Maximum token budget per call; hard-coded fallback if budget exceeded.
- **Rate limited.** Assistant endpoint has its own rate limit (e.g. 10 calls / minute per org).
- **Logging required.** All AI calls logged (prompt hash, output, latency, model, cost). Not exposed to users.

### 13.4 What v2 Can Do

| Capability | v1 (current) | v2 (designed) |
|---|---|---|
| Missing data detection | Deterministic rules | AI-assisted gap analysis |
| Evidence quality scoring | None | Score each evidence item by type + review state |
| Certificate expiry intelligence | None | Alert N days before expiry; suggest renewal pathway |
| Buyer-specific readiness | None | "For EU buyers, you need: X, Y, Z" |
| Export-readiness guidance | Generic text | Market-specific guidance (EU, US, Gulf) |
| Document extraction summaries | None | Summarize AI-extracted claims into plain language |
| Regulator-facing summary | None | Generate regulatory summary (human-reviewed) |

### 13.5 Output Guardrails

All v2 assistant outputs must:
1. Begin with: `"Based on your current passport data, I suggest: "`
2. Never include status transition commands
3. Never include prices, buyer names, internal IDs
4. Include uncertainty hedge: `"This is advisory and does not constitute legal compliance guidance."`
5. Pass a profanity / safety filter before display
6. Be limited to 500 tokens per recommendation set

### 13.6 New Endpoint

`GET /api/tenant/dpp/:nodeId/passport/assistant`
- Auth: `tenantAuth` + `dbContext`
- Rate limited: 10 calls / minute per org
- Returns: `{ recommendations: string[], nextActions: ActionItem[], evidenceGaps: EvidenceGap[] }`
- Fallback: if AI call fails or budget exceeded, return deterministic recommendations (v1 behavior)

### 13.7 Authorization Gate

AI model provider and model selection requires Paresh authorization before implementation. The service architecture and guardrail design do not depend on provider selection.

---

## 14. White-Label DPP Naming / Configuration Design

### 14.1 Current State

No DPP components exist in `components/WL/` or `components/WhiteLabelAdmin/`. WL surface exposes Branding Snapshot and Risk Snapshot only. "DPP Snapshot" is a DB view name only — not surfaced in WL UI.

### 14.2 Naming Options

| Option | Description | Complexity | Decision |
|---|---|---|---|
| A — No WL DPP exposure | DPP remains TexQtic-branded only | Minimal | Default if no WL DPP product decision |
| B — Default TexQtic label | "Verified Supply Chain Passport" shown to buyers; not configurable | None | Acceptable for MVP |
| C — Tenant-configurable label | WL tenants can rename "passport" to their own brand term | Schema + UI | Requires Paresh product decision |
| D — No TexQtic branding | Public page shows only product data + buyer label; no TexQtic attribution | Design + schema | Enterprise WL requirement |
| E — Enterprise WL DPP portal | Dedicated WL domain for DPP passports (e.g. `passport.acme.com`) | Major infra | Post-GA only |

### 14.3 Recommended Approach (Decision-Gated)

For MVP (pre-launch): **Option B** — default buyer-facing label "Verified Supply Chain Passport" is hard-coded. No configuration required.

For post-MVP: **Option C** — add `dpp_passport_label_config` table with `org_id`, `public_title`, `buyer_facing_label` fields. WL admin can configure. Public page uses configured label if present.

### 14.4 Schema Needs

Option C / D require:
```
dpp_passport_label_config
  org_id            UUID PK  (FK → orgs, RLS boundary)
  public_title      TEXT     (e.g. "Product Trust Passport")
  buyer_label       TEXT     (e.g. "Verified Supply Chain Passport")
  show_texqtic_brand BOOLEAN DEFAULT true
  updated_at        TIMESTAMPTZ DEFAULT now()
```

### 14.5 Public Page Branding Impact

- Option A/B: Public page shows "Verified Supply Chain Passport" always
- Option C: Public page shows `buyer_label` if configured, fallback to default
- Option D: TexQtic logo and attribution removed from public page (requires template change)
- Option E: Domain routing + CNAME required — not designed here

### 14.6 Decision Gate

Paresh must decide between Options A/B/C/D before implementing any WL DPP naming work.

---

## 15. Fixture / Runtime Verification Strategy

### 15.1 Known 010A Limitation

From the 010A closure record:
> "Authenticated tenant link runtime proof limited because QA seed data does not yet include a real published passport fixture."

The `dpp-public-passport-panel` section in `DPPPassport.tsx` is correct in logic but cannot be runtime-verified via E2E without a fixture that has `passportStatus = PUBLISHED` and a non-null `public_token`.

### 15.2 Required Fixture Matrix

| Fixture | Purpose | Passport status | publicPassportId |
|---|---|---|---|
| `dpp-fixture-bronze-published` | Authenticated positive path, L1 published | PUBLISHED | Real UUID |
| `dpp-fixture-silver-published` | Silver tier public page | PUBLISHED | Real UUID |
| `dpp-fixture-gold-published` | Gold (COMPLIANCE) tier public page | PUBLISHED | Real UUID |
| `dpp-fixture-platinum-published` | Platinum (GLOBAL_DPP) tier public page | PUBLISHED | Real UUID |
| `dpp-fixture-draft` | DRAFT state — link panel must show unavailable | DRAFT | null |
| `dpp-fixture-revoked` | Revoked state behavior (future) | REVOKED | UUID (inactive) |
| `dpp-fixture-expired-cert` | Cert expiry alert in assistant | PUBLISHED | Real UUID |
| `dpp-fixture-privacy-regression` | Public page must not expose org_id / node_id | PUBLISHED | Real UUID |

### 15.3 Secret-Safe Playwright Approach

- Public route tests (DPP-E2E-01 through DPP-E2E-11) are unauthenticated — no credentials needed
- Authenticated tenant link tests require session bootstrap
- **Do not hardcode passwords in spec files** — use environment variable or session storage mock
- Recommended: Use Playwright's `storageState` feature to save an authenticated session from setup fixtures
- Setup fixture: authenticate once, write `storageState.json`; all authenticated E2E tests consume it
- `storageState.json` must be `.gitignore`d — never committed

### 15.4 Production / Vercel Verification Gates

- Public DPP E2E tests run against `https://app.texqtic.com` (baseURL in `playwright.config.ts`)
- No mock or stub — tests exercise the live system
- Authenticated E2E tests require a real QA-tier fixture in the production database
- **Authorization gate:** Seeding a published DPP fixture in production requires Paresh approval

### 15.5 Fixture Creation Approach (When Authorized)

Option A — Manual via Supabase Dashboard:
- Set `dpp_passport_states.status = 'PUBLISHED'` for a known QA node
- Set `public_token = gen_random_uuid()`
- Note the `public_token` value as the `publicPassportId` for tests

Option B — Seed script (allowlisted):
- Create a new script `scripts/seed-dpp-fixture.ts`
- Allowlist requires Paresh authorization before creation

**Authorization required before any fixture is created.** See Decision Gates (§17).

---

## 16. Implementation Slices

> All slices require explicit Paresh authorization before implementation begins.  
> This packet is DESIGN-ONLY. No slice may be started without authorization.

---

### Slice 010-B — Published DPP QA Fixture + Authenticated Runtime Proof

**Goal:** Create a real published DPP fixture and verify the tenant public link panel positive path + public buyer page positive path.

| Dimension | Detail |
|---|---|
| Files likely touched | `scripts/seed-dpp-fixture.ts` (new — requires authorization), `tests/e2e/dpp-passport-network.spec.ts` |
| Schema / API impact | None — only data; no schema change |
| Verification gates | DPP-E2E-12: tenant GET returns non-null `publicPassportId`; DPP-E2E-13: `dpp-public-passport-panel` visible; DPP-E2E-14: `/passport/:id` returns 200 with product name |
| Risk level | Low (data only) |
| Dependencies | Paresh authorization to create fixture; Playwright `storageState` session bootstrap |
| Stop conditions | Schema change required to create fixture; fixture leaks real org data |

---

### Slice 012 — DPP Evidence Vault Foundation

**Goal:** Implement the `dpp_evidence_items` table and API to type, reference, and classify DPP evidence.

| Dimension | Detail |
|---|---|
| Files likely touched | `server/prisma/schema.prisma`, new migration, `server/src/routes/tenant.ts`, new `server/src/services/dppEvidenceVault.ts` |
| Schema / API impact | New table `dpp_evidence_items`; new RLS policy; new routes `GET/POST /api/tenant/dpp/:nodeId/evidence-items` |
| Verification gates | Unit tests: CRUD on `dpp_evidence_items`; visibility enum respected; private items not returned on public route |
| Risk level | Medium — new schema; RLS policy required; public route privacy regression risk |
| Dependencies | Paresh approval for schema change; RLS policy review; DIRECT_DATABASE_URL for migration |
| Stop conditions | RLS policy gaps; SHADOW_DATABASE_URL demanded by Prisma; schema conflicts with existing views |

---

### Slice 013 — Product Passport Data Depth

**Goal:** Add product identity and material composition fields to the DPP model.

| Dimension | Detail |
|---|---|
| Files likely touched | `server/prisma/schema.prisma`, new migration, `server/src/routes/tenant.ts`, `components/Tenant/DPPPassport.tsx` |
| Schema / API impact | New fields on product model or new `dpp_product_details` table; SKU, batch, material composition array |
| Verification gates | Unit tests: fields returned by GET passport API; TypeScript types updated; UI renders composition |
| Risk level | Medium — schema addition; no breaking changes to existing fields |
| Dependencies | Slice 012 (evidence vault as attachment surface for product photos) |
| Stop conditions | Schema conflicts with `dpp_snapshot_products_v1` view; composition array format debate |

---

### Slice 014 — Trade Linkage Foundation

**Goal:** Create the `dpp_trade_links` table and wire existing orders to DPP nodes.

| Dimension | Detail |
|---|---|
| Files likely touched | `server/prisma/schema.prisma`, new migration, `server/src/routes/tenant.ts` |
| Schema / API impact | New `dpp_trade_links` table; RLS policy; `GET /api/tenant/dpp/:nodeId/trade-links` endpoint |
| Verification gates | Unit tests: orders linked to node; private vs public_count visibility respected; public route does not leak order IDs |
| Risk level | High — touches orders model; cross-domain concern |
| Dependencies | Orders are marketplace/cart lifecycle only — do NOT assume B2B RFQ-to-order wiring |
| Stop conditions | Orders model cannot be linked without breaking order RLS; trade data leaks buyer identity |

---

### Slice 015 — Public Buyer Page v2

**Goal:** Replace basic `PublicPassport.tsx` with the full v2 design (product story, cert cards, timeline, mobile layout).

| Dimension | Detail |
|---|---|
| Files likely touched | `components/Public/PublicPassport.tsx` |
| Schema / API impact | No new schema; requires Slices 012/013 data to be meaningful |
| Verification gates | E2E: product story visible; cert cards render; mobile viewport 375px above-fold check; privacy regression: no orgId/nodeId in DOM |
| Risk level | Medium — large UI component change; privacy regression risk |
| Dependencies | Slice 012 (evidence vault), Slice 013 (product identity), published fixture from Slice 010-B |
| Stop conditions | Privacy regression in DOM; `aiExtractedClaimsCount = 0` GUC issue still present on public route |

---

### Slice 016 — QR Image Productionization

**Goal:** Replace URL text fallback with rendered QR image (Option A recommended).

| Dimension | Detail |
|---|---|
| Files likely touched | `components/Public/PublicPassport.tsx`, `components/Tenant/DPPPassport.tsx`, `package.json` (new dep) |
| Schema / API impact | None |
| Verification gates | Unit test: QR renders with correct URL payload; E2E: `data-testid="dpp-qr-image"` visible on public page; print layout test |
| Risk level | Low — UI only; package dependency is single-purpose |
| Dependencies | Paresh authorization for package (`react-qr-code` or equivalent) |
| Stop conditions | Package introduces security vulnerability; bundle size impact unacceptable |

---

### Slice 017 — Public Route Security Hardening

**Goal:** Apply rate limiting, response normalization, caching headers, and noindex to the public DPP route.

| Dimension | Detail |
|---|---|
| Files likely touched | `server/src/routes/public.ts`, `server/package.json` (rate limit plugin), `server/src/plugins/` |
| Schema / API impact | No schema change; Fastify plugin addition |
| Verification gates | E2E: rapid requests return 429 after limit; rate limit headers present; revoked URL returns 410 |
| Risk level | Medium — Fastify plugin chain modification; must not break existing routes |
| Dependencies | Paresh authorization for `@fastify/rate-limit` package; revocation token decision (§12.7) |
| Stop conditions | Rate limit plugin breaks existing auth routes; 429 flood obscures real E2E failures |

---

### Slice 018 — JSON-LD / Machine-Readable Pilot

**Goal:** Implement `GET /api/public/dpp/:publicPassportId/structured-data` with privacy-filtered JSON-LD.

| Dimension | Detail |
|---|---|
| Files likely touched | `server/src/routes/public.ts` |
| Schema / API impact | New route; no schema change |
| Verification gates | Unit test: response has `@context`; no `orgId`/`nodeId`/`public_token`; only PUBLIC_SUMMARY fields |
| Risk level | Low — additive route; no schema change; same auth model as main public route |
| Dependencies | Slice 012/013 for meaningful material composition data; Paresh JSON-LD route shape approval |
| Stop conditions | Schema standard not finalized; privacy review identifies new leakage vector |

---

### Slice 019 — AI Passport Assistant v2

**Goal:** Replace deterministic assistant with model-backed advisory recommendations.

| Dimension | Detail |
|---|---|
| Files likely touched | `server/src/routes/tenant.ts`, new `server/src/services/passportAssistant.ts`, `components/Tenant/DPPPassport.tsx` |
| Schema / API impact | New tenant API endpoint; AI provider config in env; optional logging table |
| Verification gates | Unit tests: advisory output conforms to guardrails; no status mutation; budget limit enforced; fallback to deterministic on error |
| Risk level | High — AI provider integration; prompt injection risk; cost exposure |
| Dependencies | Paresh authorization for AI model provider; budget policy; prompt guardrail review |
| Stop conditions | Prompt injection from user-supplied data; AI output modifies status; cost budget not approved |

---

### Slice 020 — White-Label Passport Naming

**Goal:** Allow WL tenants to configure buyer-facing DPP label.

| Dimension | Detail |
|---|---|
| Files likely touched | `server/prisma/schema.prisma`, new migration, `server/src/routes/public.ts`, `components/Public/PublicPassport.tsx`, `components/WhiteLabelAdmin/` |
| Schema / API impact | New `dpp_passport_label_config` table; public GET route reads config; WL admin UI |
| Verification gates | Unit tests: config applied to public page; fallback to default label when not configured |
| Risk level | Medium — cross-plane concern (WL admin → public tenant surface) |
| Dependencies | Paresh WL DPP product decision (Options A–E); Slice 015 (public page v2 as base) |
| Stop conditions | WL config exposes tenant identity to public; no WL DPP product decision made |

---

## 17. Decision Gates

The following decisions require Paresh authorization before any implementation proceeds.

| # | Decision | Options | Impact |
|---|---|---|---|
| DG-01 | QR package authorization | `react-qr-code` vs `qrcode.react` vs server-side | Slice 016 |
| DG-02 | JSON-LD route shape | `/structured-data` (path) vs `?format=json-ld` (query) vs Accept header | Slice 018 |
| DG-03 | Public token rotation on revoke | Option A (permanent) vs Option B (rotate on revoke) | Slice 017; affects all printed QR codes |
| DG-04 | Rate limiting package | `@fastify/rate-limit` vs custom table vs other | Slice 017 |
| DG-05 | WL branding strategy | Option A (no WL DPP) / B (default label) / C (configurable) / D (no branding) / E (WL portal) | Slice 020 |
| DG-06 | Material composition schema depth | Minimal (name + %) vs Extended (recycled, organic, REACH) | Slice 013 |
| DG-07 | Evidence vault scope for first slice | Types in first slice; max items; audit vs trade docs | Slice 012 |
| DG-08 | Trade linkage priority | Orders-first vs certs-first vs QC-first vs all deferred | Slice 014 |
| DG-09 | AI model provider | OpenAI vs Azure OpenAI vs Anthropic vs none | Slice 019 |
| DG-10 | Production fixture creation | Authorize seed of published DPP in production DB | Slice 010-B |
| DG-11 | COMPLIANCE maturity criteria | What triggers Gold tier? (cert count, types, lineage depth, evidence items?) | Affects Slices 012–013 |
| DG-12 | GLOBAL_DPP maturity criteria | What triggers Platinum? (JSON-LD ready? SUSTAINABILITY_DECLARATION? 3+ lineage?) | Affects Slice 013+ |
| DG-13 | 404 vs 410 for revoked passports | HTTP 404 (privacy-preserving) vs 410 Gone (standards-correct) | Slice 017 |
| DG-14 | `aiExtractedClaimsCount` fix priority | Fix GUC mismatch (`app.current_org_id` vs `app.org_id`) now vs defer | Slice 010-B or standalone |
| DG-15 | `DppMaturityLevel` deduplication | Consolidate into shared type now vs defer | Low-risk; can be standalone |

---

## 18. Adjacent Findings

The following issues are carried forward from prior units and remain unresolved. They are recorded here for completeness and must not be addressed without explicit authorization.

| Finding | Unit first noted | Status |
|---|---|---|
| DPP is basic foundation — not final product | 002 | Acknowledged; this packet designs the path forward |
| QR image generation not implemented (URL text fallback only) | 002 / bfb8f25 | Dependency-gated; see Slice 016 |
| JSON-LD not implemented | 002 | Design-gated; see Slice 018 |
| Public route rate limiting absent | 002 | Before-GA requirement; see Slice 017 |
| `aiExtractedClaimsCount = 0` on public route (GUC mismatch) | 002 / public.ts L672 | Deferred; see DG-14 |
| `DppMaturityLevel` / `D6MaturityLevel` duplicate definitions | 002 | Deferred; see DG-15 |
| `COMPLIANCE` maturity level unreachable | 002 | Criteria undefined; see DG-11 |
| `GLOBAL_DPP` maturity asymmetry (public reaches it; tenant reserves it) | 010 inspection | Deferred; see DG-12 |
| WL DPP naming not implemented | 002 | Decision-gated; see Slice 020 |
| E2E authenticated published-positive path limited by missing fixture | 010A | See Slice 010-B |
| No product identity / material composition model | 002 | Designed here; see Slice 013 |
| No evidence vault | 002 | Designed here; see Slice 012 |
| No trade linkage | 002 | Designed here; see Slice 014 |
| No material composition data in public page | 002 | Designed here; see Slice 015 |
| Full supply chain timeline not surfaced in UI | 002 / DPPPassport.tsx | Designed here; see Slice 015 |
| `approved_by NOT NULL + ON DELETE SET NULL` latent inconsistency | 002 | Deferred (original 002 note) |
| Full platform launch remains NOT AUTHORIZED | Standing | Unchanged |

---

## 19. Design Gates Status

All design gates pass. No implementation blockers encountered.

| Gate | Status |
|---|---|
| Working tree clean before design | ✅ Pass — `git status --short` showed clean tree |
| Prior closure commits present | ✅ Pass — all commits e3d81c5 through adb15ad confirmed |
| 002 design artifact present | ✅ Pass — `docs/TECS-DPP-PASSPORT-NETWORK-002-DESIGN-v1.md` exists |
| No unsafe `.json` route restored | ✅ Pass — `public.ts` inspected; no `.json` route present |
| Design does not require code changes | ✅ Pass — DESIGN-ONLY; no implementation files modified |
| No non-allowlisted files modified | ✅ Pass — only `docs/TECS-DPP-PASSPORT-NETWORK-010-DESIGN-v1.md` created |
| No contradictions with 002 design | ✅ Pass — 010 extends 002; no contradictions |
| Full platform launch not authorized | ✅ Confirmed — NOT AUTHORIZED |

---

*Design artifact authored: 2026-05-01*  
*Next authorized action: Paresh must authorize individual implementation slices via prompt.*  
*Full platform launch remains NOT AUTHORIZED.*
