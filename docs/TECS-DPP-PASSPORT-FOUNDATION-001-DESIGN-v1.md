# TECS-DPP-PASSPORT-FOUNDATION-001 — DPP Passport Foundation Design

**TECS ID:** TECS-DPP-PASSPORT-FOUNDATION-001  
**Governance Sync:** G-025-DPP-PASSPORT-FOUNDATION-001  
**Mode:** DESIGN ONLY — No implementation authorized  
**Status:** DESIGN_ACTIVE  
**Date:** 2026-04-28  
**Author:** TexQtic governance / repo-truth audit  
**Predecessor:** TECS-B2B-BUYER-CATALOG-PDP-001 (VERIFIED_COMPLETE 2026-04-27)

> **STOP RULE:** This document authorizes design artifact creation only. No routes, no schema
> changes, no frontend component modifications, no migrations, no public endpoints, no JSON-LD
> output, no QR routes, and no AI document intelligence integration are authorized until
> Paresh explicitly opens each implementation slice with a named TECS prompt.

---

## Section A — Existing DPP Passport Repo-Truth Audit

This section records the verified state of all DPP-related artifacts present in the repository
**before** this design unit was opened. This audit is the authoritative ground truth that all
subsequent design decisions must extend — not replace.

### A.1 — What Already Exists

The TexQtic repository already ships a functional, runtime-backed DPP system under TECS G-025.
The following artifacts are confirmed REAL and in production state:

#### A.1.1 Frontend — `components/Tenant/DPPPassport.tsx`

| Attribute | Value |
|-----------|-------|
| TECS IDs | G-025-DPP-SNAPSHOT-UI-EXPORT-001 / G-025-DPP-API-UI-MANUFACTURER-ENABLE-001 |
| GOVERNANCE-SYNC | 083 / 087 |
| Surface | Tenant-facing, authenticated-only |
| State | REAL, RUNTIME-BACKED, fully implemented |
| API consumed | `GET /api/tenant/dpp/:nodeId` |

**Props:**
- `onBack: () => void`
- `title?: string` (default: `'DPP Passport'`; white-label override: `'DPP Snapshot'`)
- `subtitle?: string`

**Local TypeScript interfaces (defined in file):**
```typescript
interface DppProduct {
  nodeId: string; orgId: string; batchId: string | null; nodeType: string | null;
  meta: Record<string, unknown>; geoHash: string | null; visibility: string | null;
  createdAt: string; updatedAt: string;
  manufacturerName: string | null; manufacturerJurisdiction: string | null;
  manufacturerRegistrationNo: string | null;
}
interface DppLineageRow {
  rootNodeId: string; nodeId: string; parentNodeId: string | null;
  depth: number; edgeType: string | null; createdAt: string;
}
interface DppCertRow {
  nodeId: string | null; certificationId: string | null; certificationType: string | null;
  lifecycleStateId: string | null; expiryDate: string | null; orgId: string;
}
interface DppSnapshot {
  nodeId: string; product: DppProduct;
  lineage: DppLineageRow[]; certifications: DppCertRow[];
  meta: Record<string, unknown>;
}
```

**UI sections rendered:**
1. Header with back button and title/subtitle
2. Node ID text input with client-side UUID validation
3. Load button (triggers authenticated fetch)
4. Export actions: Copy JSON (clipboard), Download JSON (`dpp_{nodeId}.json` blob)
5. Product Identity display list (`batch_id`, `node_type`, `meta`, `geo_hash`, `visibility`)
6. Manufacturer section (`manufacturer_name`, `jurisdiction`, `registration_no`)
7. Lineage section (capped at 200 rows, depth-sorted table)
8. Certifications section (`certification_type`, `lifecycle_state_id`, `expiry_date`)

**Hard constraints from component header (must be preserved):**
- No backend routes added from this component (read-only consumer)
- G-025-ORGS-RLS-001 validated (commit afcf47e) — manufacturer fields returned from view
- Export is client-side only (Copy JSON + Download JSON) — no server-side export endpoint
- UUID validation is client-side before fetch
- Lineage rendering is capped at 200 rows (safety limit)

**Routing wiring (App.tsx):**
- Import at line 22: `import { DPPPassport } from './components/Tenant/DPPPassport'`
- Route key `'DPP'` in route array (line 1160; comment: G-025 TECS 4D DPP Passport view)
- `case 'dpp'`: renders `<DPPPassport onBack={...} title={...} />` (lines 5138–5142)

**Shell wiring (layouts/Shells.tsx):**
- Line 61: route label `dpp: 'DPP Passport'`
- Line 328: B2BShell sidebar includes DPP nav item (`🔍 DPP Passport`)
- Line 418: WhiteLabelShell authenticated affordances include `dpp` nav item
- DPP appears in both B2BShell and WhiteLabelShell — supplier-internal, authenticated only

#### A.1.2 Backend — `server/src/routes/tenant.ts` (lines 4778–4940)

**Route:** `GET /api/tenant/dpp/:nodeId`  
**Guard:** `tenantAuthMiddleware` + `databaseContextMiddleware`  
**Boundary:** Tenant-only; no unauthenticated access  
**Validation:** Zod `.uuid()` param guard on `:nodeId`

**Query pattern:**
```
$transaction([
  SELECT ... FROM dpp_snapshot_products_v1  WHERE node_id = $nodeId::uuid
  SELECT ... FROM dpp_snapshot_lineage_v1   WHERE root_node_id = $nodeId::uuid
  SELECT ... FROM dpp_snapshot_certifications_v1  WHERE node_id = $nodeId::uuid OR (org fallback)
])
```
All three queries use parameterized `$queryRaw<T>` — no string interpolation.

**Response shape:**
```typescript
{
  nodeId: string;
  product: DppProduct;
  lineage: DppLineageRow[];
  certifications: DppCertRow[];
  meta: {};   // reserved empty object
}
```

**Audit:** Each successful read writes `tenant.dpp.read` to the audit log (entity: `traceability_node`).

**RLS note:** Views are `SECURITY INVOKER`; tenant context is set by `withDbContext`. No
`SECURITY DEFINER` allowed.

#### A.1.3 SQL Views (TECS 4B — already applied)

Three views are confirmed applied in the Supabase database:

| View | Purpose |
|------|---------|
| `dpp_snapshot_products_v1` | Node identity + manufacturer fields (LEFT JOIN organizations) |
| `dpp_snapshot_lineage_v1` | Supply-chain lineage graph via recursive CTE over `traceability_edges` |
| `dpp_snapshot_certifications_v1` | Cert linkages via `node_certifications` join table |

G-025-ORGS-RLS-001 validated (commit afcf47e): manufacturer fields (`legal_name`,
`jurisdiction`, `registration_no`) are correctly returned from `dpp_snapshot_products_v1`.

#### A.1.4 Source Tables (from `DPP-SNAPSHOT-VIEWS-DISCOVERY.md`)

| Table | Key columns | Constraint |
|-------|-------------|------------|
| `traceability_nodes` | `id`, `org_id`, `batch_id`, `node_type`, `meta` (JSONB), `visibility`, `geo_hash` | No `product_id`, `facility_id`, `supplier_id`, `catalog_item_id` |
| `traceability_edges` | `from_node_id`, `to_node_id`, `edge_type`, `transformation_id`, `org_id` | Append-only, directed |
| `certifications` | `org_id` FK, `lifecycle_state_id` FK, `certification_type` | **CRITICAL: NO FK to traceability_nodes** — G-025-B blocker |
| `organizations` | `legal_name`, `jurisdiction`, `registration_no` | Source of manufacturer fields |
| `node_certifications` | Join table (M:N); see Decision D1 | Resolves G-025-B; requires Paresh approval before TECS 4A |

#### A.1.5 Related Architecture Documents

| File | Status | Role |
|------|--------|------|
| `docs/architecture/DPP-SNAPSHOT-VIEWS-DISCOVERY.md` | ✅ Complete | Source table audit; G-025-B identified |
| `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md` | ✅ Complete | D1 (node_certifications) + D2 (v1 field surface) decisions |

### A.2 — What the Current DPP Is (Critical Characterization)

**The current DPP is a manual node-ID lookup tool. It is NOT a passport workflow.**

Specifically:
- The user must manually type or paste a `traceability_node` UUID into a text field
- There is no automatic passport generation, no association between catalog items and DPP nodes,
  no claim lifecycle, no maturity state, no publication event
- The system returns a raw snapshot of whatever views currently hold for that node
- The export (Copy JSON, Download JSON) is a debugging/inspection aid, not a publishable artifact
- There is no buyer-visible surface; DPP is entirely supplier-internal
- There is no connection between DPP and PDP (Product Detail Page); PDP boundary tests explicitly
  verify DPP absence (T2.5, T7.7, T18.5, T26.2)

**This design unit's purpose is to design the path from this narrow manual lookup tool to a proper
passport identity and workflow system — without modifying anything that already exists.**

### A.3 — Test Boundary Confirmation

`tests/b2b-buyer-catalog-pdp-page.test.ts` contains explicit DPP exclusion tests:
- T2.5: compliance notice does NOT contain DPP or passport language
- T7.7: returned view has no DPP passport field
- T18.5: compliance summary does NOT contain DPP/passport field
- T26.2: payload does not have price, amount, payment, or DPP fields

These tests are authoritative evidence that DPP and PDP are separate bounded surfaces. No change
to these tests is authorized by this design unit.

### A.4 — Governance Blockers Resolved by Prior Design Anchor

**G-025-B:** `certifications` has no FK to `traceability_nodes`.  
**Resolution (Decision D1, `DPP-SNAPSHOT-VIEWS-DESIGN.md`):**

```sql
-- node_certifications (M:N join table — Design D1)
CREATE TABLE node_certifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  node_id          UUID NOT NULL REFERENCES traceability_nodes(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, node_id, certification_id)
);
ALTER TABLE node_certifications FORCE ROW LEVEL SECURITY;
```

This join table requires Paresh approval before TECS 4A implementation. The design anchor
documents it; this design unit references it as a confirmed-design dependency.

---

## Section 1 — Problem Statement

### 1.1 — Current State

The current DPP surface in TexQtic is a functional but narrow manual lookup tool:
- Supplier must know and type in a UUID to retrieve a snapshot
- No passport identity, no claim lifecycle, no maturity state
- No link between traceability nodes and catalog items
- No structured evidence linkage between AI-extracted documents and DPP claims
- No publication workflow — no distinction between internal draft and externally shareable state
- No buyer-visible pathway (correctly deferred; PDP boundary tests enforce this)

### 1.2 — Business Need

TexQtic suppliers operate in compliance-sensitive B2B trade environments where product-level
traceability and certification claims are increasingly mandated by trade partners and regulations
(e.g., EU Digital Product Passport regulation, supply chain due diligence laws). The platform
needs to evolve its DPP surface to:

1. Give each product node a **passport identity** — a stable, human-readable claim anchor
2. Provide a **maturity model** — progressive claim completeness from local-trust to global-DPP
3. Enable **evidence linkage** — connect AI-extracted document fields to DPP claims
4. Create a **publication boundary** — distinguish internal-only from trade-ready from published
5. Define an **export/share surface** — verifiable snapshot that can be shared with trade partners

### 1.3 — Constraints

- Must NOT modify existing verified DPPPassport.tsx behavior
- Must NOT modify existing SQL views (extend only when designed and approved)
- Must NOT open public access, QR routes, or JSON-LD in v1 scope
- Must NOT connect DPP to PDP buyer surface in this unit
- Must NOT allow AI alone to trigger DPP publication — human review is a structural constant
- Must preserve full `org_id` tenant isolation
- All implementation slices require explicit Paresh authorization

---

## Section 2 — MVP Foundation Scope

### 2.1 — In Scope (Design Only)

| # | Item | Notes |
|---|------|-------|
| S-1 | Passport identity model (`DppPassportFoundationView`) | Design of TypeScript interface only |
| S-2 | Maturity ladder (L1–L4) | Classification only; no runtime gate added in this unit |
| S-3 | Evidence source taxonomy | Which evidence types are allowed in v1 |
| S-4 | Human review / publication boundary design | Structural constant; never AI-only |
| S-5 | Visibility classification table | Supplier / Admin / Buyer / Public matrix |
| S-6 | Security and tenancy requirements | `org_id` isolation, RLS requirements |
| S-7 | API/read contract sketch | Tenant route only; future-gated public routes as design sketch |
| S-8 | UI surface design | Extension of DPPPassport.tsx; test-ID conventions for future slices |
| S-9 | Relationship to PDP | Boundary preservation + future linkage mechanism design |
| S-10 | Relationship to AI Document Intelligence | Evidence linkage design |
| S-11 | Implementation slice plan (D-1 through D-6) | All UNAUTHORIZED until opened |
| S-12 | Naming strategy | TECS-DPP-NAMING-MIGRATION-001 as future slice |

### 2.2 — Explicitly Out of Scope for This Design Unit

| # | Item | Deferral |
|---|------|---------|
| X-1 | `node_certifications` SQL DDL application | Requires Paresh approval; TECS 4A |
| X-2 | DPP view modifications | TECS 4B extension; separate slice |
| X-3 | New Fastify routes | No routes added |
| X-4 | Modifications to DPPPassport.tsx | Preservation plan only |
| X-5 | Modifications to App.tsx routing | Not in scope |
| X-6 | Modifications to Shells.tsx | Not in scope |
| X-7 | Public QR route | TECS-DPP-PUBLIC-QR-001; deferred |
| X-8 | JSON-LD / structured data output | Future compliance slice |
| X-9 | Buyer-facing DPP visibility in PDP | PDP boundary preserved |
| X-10 | AI document intelligence integration | Evidence linkage design only; no code |
| X-11 | Prisma schema changes | No schema.prisma modifications |
| X-12 | Certification lifecycle mutation from DPP | Deferred; out of scope |
| X-13 | Cross-org shared DPP access | Deferred (per DPP-SNAPSHOT-VIEWS-DESIGN non-goals) |
| X-14 | Cryptographic lineage hash | v2 future |
| X-15 | SKU/catalog_items join | G-025-H; FK mismatch; deferred |
| X-16 | Materialized views | Deferred (per DPP-SNAPSHOT-VIEWS-DESIGN non-goals) |

---

## Section 3 — Existing DPP Preservation Plan

### 3.1 — Preservation Mandate

All existing DPP artifacts must continue functioning exactly as implemented. This design unit
must not change runtime behavior of any existing DPP surface.

| File | Preservation Requirement |
|------|--------------------------|
| `components/Tenant/DPPPassport.tsx` | No modifications. Props, interfaces, UI sections, export behavior, and cap limits remain unchanged. |
| `server/src/routes/tenant.ts` (DPP route) | No modifications. `GET /api/tenant/dpp/:nodeId` contract remains stable. |
| `dpp_snapshot_products_v1` | No modifications to view definition. |
| `dpp_snapshot_lineage_v1` | No modifications to view definition. |
| `dpp_snapshot_certifications_v1` | No modifications to view definition. |
| `App.tsx` DPP routing | No modifications. `case 'dpp'` remains as-is. |
| `layouts/Shells.tsx` DPP nav | No modifications. DPP nav items in B2BShell and WhiteLabelShell remain. |

### 3.2 — Extension Principle

Future implementation slices must extend the existing system additively:
- New views extend the data surface without modifying existing views
- New interfaces extend `DppSnapshot` without replacing it
- New API endpoints are additive (`GET /api/tenant/dpp/:nodeId/passport`) — the existing
  `/dpp/:nodeId` endpoint is never removed or altered
- New UI sections are additive within DPPPassport.tsx — existing sections are preserved

### 3.3 — White-Label Compatibility

The white-label title override (`is_white_label → 'DPP Snapshot'`) must be preserved in all
future UI work. Any new passport-identity branding must respect the white-label override pattern.

---

## Section 4 — DPP Passport Maturity Model

### 4.1 — Purpose

The maturity model defines a progressive claim-completeness ladder for a DPP node. It does not
block node creation or reading. It provides a classification that suppliers, admins, and future
trade partners can use to assess DPP readiness.

### 4.2 — Maturity Levels

| Level | Code | Name | Minimum Criteria | Typical Use |
|-------|------|------|------------------|-------------|
| L1 | `LOCAL_TRUST` | Local Trust | Node exists; org_id assigned; no external evidence required | Internal traceability only |
| L2 | `TRADE_READY` | Trade Ready | At least one approved certification linked via `node_certifications`; lineage depth ≥ 1 | Supplier-to-buyer B2B |
| L3 | `COMPLIANCE` | Compliance | All required certification types for jurisdiction present and APPROVED; lineage complete | Regulatory submission |
| L4 | `GLOBAL_DPP` | Global DPP | Meets L3 criteria + approved for publication; at least one external verifier acknowledged | EU DPP, global trade |

### 4.3 — Maturity Computation Rules

- Maturity is **derived** from data present in the snapshot views; it is not stored as a DB field
  in v1
- Derivation logic lives in a pure TypeScript function (design only; no runtime code authorized
  until D-3 slice opens)
- Maturity is advisory only — it does not gate any create, update, or read operation in v1
- Maturity displayed in DPP UI must show clearly as a computed indicator, not a lifecycle state
- Maturity must never be set by AI alone; computation requires only data already approved by human
  review

### 4.4 — Design Sketch — `computeDppMaturity(snapshot: DppSnapshot): DppMaturityLevel`

```typescript
// DESIGN ONLY — NOT IMPLEMENTED
type DppMaturityLevel = 'LOCAL_TRUST' | 'TRADE_READY' | 'COMPLIANCE' | 'GLOBAL_DPP';

function computeDppMaturity(snapshot: DppSnapshot): DppMaturityLevel {
  // L4: published + external verifier — requires explicit publication field (future)
  // L3: all required cert types present + APPROVED + lineage complete (future criteria TBD by jurisdiction)
  // L2: at least one APPROVED cert linked + lineage depth >= 1
  if (snapshot.certifications.length > 0 && snapshot.lineage.length > 0) {
    return 'TRADE_READY';
  }
  // L1: node exists
  return 'LOCAL_TRUST';
}
```

Detailed L3/L4 criteria are deferred to implementation slices D-3 and D-6 respectively.

---

## Section 5 — DPP Data Model Design

### 5.1 — `DppPassportFoundationView` Interface (Design Only)

The following interface describes the **target** data surface for a v1 DPP Passport. It extends
the existing `DppSnapshot` shape with passport-specific fields. This interface is not implemented
until implementation slice D-3 is authorized.

```typescript
// DESIGN ONLY — NOT IMPLEMENTED
interface DppPassportFoundationView {
  // ── Core identity (from existing DppSnapshot) ─────────────────────────────
  nodeId: string;                         // traceability_nodes.id (UUID)
  orgId: string;                          // traceability_nodes.org_id
  batchId: string | null;                 // traceability_nodes.batch_id
  nodeType: string | null;                // traceability_nodes.node_type
  meta: Record<string, unknown>;          // traceability_nodes.meta (JSONB passthrough)
  geoHash: string | null;                 // traceability_nodes.geo_hash
  visibility: string | null;              // traceability_nodes.visibility
  createdAt: string;
  updatedAt: string;

  // ── Manufacturer identity (from organizations via view) ────────────────────
  manufacturerName: string | null;        // organizations.legal_name
  manufacturerJurisdiction: string | null; // organizations.jurisdiction
  manufacturerRegistrationNo: string | null; // organizations.registration_no

  // ── Lineage (from dpp_snapshot_lineage_v1) ────────────────────────────────
  lineage: Array<{
    rootNodeId: string;
    nodeId: string;
    parentNodeId: string | null;
    depth: number;
    edgeType: string | null;
    transformationId: string | null;      // D2 field from traceability_edges
    createdAt: string;
  }>;

  // ── Certifications (from dpp_snapshot_certifications_v1 via node_certifications) ─
  certifications: Array<{
    nodeId: string | null;
    certificationId: string | null;
    certificationType: string | null;
    lifecycleStateId: string | null;
    lifecycleStateName: string | null;    // D2 field from lifecycle_states JOIN
    expiryDate: string | null;
    issuedAt: string | null;              // D2 field (deferred to D2 view extension)
    orgId: string;
  }>;

  // ── Passport computed fields (design only; D-3 implementation) ────────────
  passportMaturity: DppMaturityLevel;     // L1–L4 computed indicator
  passportStatus: DppPassportStatus;      // DRAFT | INTERNAL | TRADE_READY | PUBLISHED
  passportEvidenceSummary: {              // summary of evidence linked to this node
    aiExtractedClaimsCount: number;       // from future evidence linkage (D-4)
    approvedCertCount: number;            // certifications with APPROVED lifecycle state
    lineageDepth: number;                 // max depth in lineage array
  };

  // ── Reserved for future slices ─────────────────────────────────────────────
  meta_passport: Record<string, unknown>; // reserved; always {} in v1
}

type DppPassportStatus = 'DRAFT' | 'INTERNAL' | 'TRADE_READY' | 'PUBLISHED';
```

### 5.2 — `DppPassportStatus` Definitions

| Status | Meaning | Who can set | AI alone? |
|--------|---------|-------------|-----------|
| `DRAFT` | Node exists; no passport claims verified | System (auto) | N/A |
| `INTERNAL` | Passport reviewed and approved for internal use | Human admin | Never |
| `TRADE_READY` | Approved for B2B trade partner sharing | Human admin | Never |
| `PUBLISHED` | Approved for public DPP access (L4 only) | Human admin + Paresh | Never |

`PUBLISHED` status is deferred to implementation slice D-6 (public QR route + export surface).

### 5.3 — `transformationId` Field (D2 Decision)

`traceability_edges.transformation_id` is included in the D2 field surface (per
`DPP-SNAPSHOT-VIEWS-DESIGN.md`). It is present in `dpp_snapshot_lineage_v1` when the view
extension is applied (TECS 4B extension; requires separate slice authorization).

### 5.4 — Deferred Fields (Not in v1)

| Field | Reason for Deferral |
|-------|---------------------|
| SKU / `catalog_item_id` | G-025-H; FK mismatch in `traceability_nodes` (no catalog_item_id column) |
| `issuing_body` | Not in `certifications` table; deferred per design anchor non-goals |
| `cert_number` | Not in `certifications` table; deferred per design anchor non-goals |
| Cryptographic lineage hash | v2 future |
| `supplier_id` / `facility_id` | Not first-class tables; deferred per design anchor non-goals |

---

## Section 6 — Evidence Sources

### 6.1 — Allowed Evidence Sources in v1

| Source | Type | Verification gate | Notes |
|--------|------|-------------------|-------|
| `certifications` (APPROVED state) | Regulatory certification | Human admin must APPROVE lifecycle state | Only APPROVED certs count toward maturity |
| `node_certifications` (D1 join table) | Node-cert linkage | Human admin creates linkage | Requires D-1 slice (node_certifications DDL) |
| `traceability_edges` (lineage) | Supply-chain provenance | Data entry by supplier | Edge creation is operator-controlled |
| `organizations` (manufacturer fields) | Legal identity | Org registration (existing) | Returned via G-025-ORGS-RLS-001 validated view |

### 6.2 — Conditionally Allowed (Future Slice D-4)

| Source | Type | Verification gate | Design requirement |
|--------|------|-------------------|--------------------|
| AI document extraction (`document_field_extractions`) | Evidence claim | Human review required (APPROVED extraction only) | D-4 slice must define evidence linkage contract; AI confidence score never sufficient alone |

### 6.3 — Forbidden Evidence Sources

| Source | Reason |
|--------|--------|
| AI confidence score alone | Never sufficient for any maturity claim; human review is a structural constant |
| Unverified (PENDING) certifications | Only APPROVED lifecycle state counts |
| Cross-org certifications | Violates `org_id` isolation |
| External scraped data | Not in scope |
| Self-attested claims without `node_certifications` linkage | Must be formally linked |

---

## Section 7 — Human Review and Publication Boundary

### 7.1 — Structural Constant

> **AI alone never triggers DPP publication.** Human review is a structural constant for all
> DPP status transitions at INTERNAL, TRADE_READY, and PUBLISHED levels.

This mirrors the `humanReviewRequired` structural constant established in
TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001.

### 7.2 — Publication Gate Design

```
                        ┌─────────────────────────────────────────┐
  traceability_node     │  DRAFT                                  │
  created (auto)        │  (no claims verified)                   │
                        └────────────────┬────────────────────────┘
                                         │  Admin links node_certifications
                                         │  + manually reviews
                                         ▼
                        ┌─────────────────────────────────────────┐
                        │  INTERNAL                               │
                        │  (approved for internal use)            │
                        └────────────────┬────────────────────────┘
                                         │  Admin approves for trade sharing
                                         ▼
                        ┌─────────────────────────────────────────┐
                        │  TRADE_READY                            │
                        │  (approved for B2B partner sharing)     │
                        └────────────────┬────────────────────────┘
                                         │  Paresh + Admin authorize publication
                                         ▼  (TECS-DPP-PUBLIC-QR-001 required)
                        ┌─────────────────────────────────────────┐
                        │  PUBLISHED  (deferred — D-6 slice)      │
                        │  (public QR / export access)            │
                        └─────────────────────────────────────────┘
```

### 7.3 — AI Evidence Linkage (Future D-4)

When AI document extraction evidence is linked to DPP claims in slice D-4:
- Only APPROVED AI extractions (human-reviewed) may contribute to passport evidence
- Contribution is additive evidence only — it does not change `passportStatus` automatically
- A human admin must explicitly review and accept the AI-sourced claim linkage
- Confidence score thresholds are advisory inputs to human review, not autonomous gates

---

## Section 8 — Visibility Classification

### 8.1 — v1 Visibility Matrix

| Data group | Supplier (org member) | WL Admin | B2B Buyer | Public |
|------------|----------------------|----------|-----------|--------|
| Node identity (id, type, batch_id) | ✅ Read | ✅ Read | ❌ Not in scope v1 | ❌ Never v1 |
| Meta (JSONB passthrough) | ✅ Read | ✅ Read | ❌ | ❌ |
| Geo hash | ✅ Read | ✅ Read | ❌ | ❌ |
| Visibility field | ✅ Read | ✅ Read | ❌ | ❌ |
| Manufacturer name / jurisdiction / reg. no. | ✅ Read (G-025-ORGS-RLS-001) | ✅ Read | ❌ | ❌ |
| Lineage chain | ✅ Read (capped 200 rows) | ✅ Read | ❌ | ❌ |
| Certifications (APPROVED only) | ✅ Read | ✅ Read | ❌ | ❌ |
| Passport maturity (computed) | ✅ Read (D-3) | ✅ Read (D-3) | ❌ | ❌ |
| Passport status | ✅ Read (D-3) | ✅ Read (D-3) | ❌ | ❌ |
| AI evidence claims (APPROVED) | ✅ Read (D-4) | ✅ Read (D-4) | ❌ | ❌ |
| Published DPP export | ❌ v1 | ❌ v1 | ❌ v1 | ❌ v1 → D-6 |

### 8.2 — Buyer Visibility (Deferred)

Buyer-facing DPP visibility requires:
1. PDP boundary relaxation (explicit design unit; not this unit)
2. `passportStatus = TRADE_READY` or `PUBLISHED` on the node
3. Separate route `GET /api/tenant/catalog/items/:itemId/dpp` (buyer-scoped; tenant isolation)
4. Explicit Paresh authorization

These requirements are design inputs for a future `TECS-DPP-BUYER-VISIBILITY-001` unit.

---

## Section 9 — Security and Tenancy Requirements

### 9.1 — `org_id` Isolation (Constitutional)

All DPP operations must be scoped by `org_id`. No cross-tenant DPP access is permitted.

| Requirement | Implementation |
|-------------|----------------|
| All view queries include `org_id` filter | RLS via `SECURITY INVOKER` views + `withDbContext` |
| `node_certifications` rows scoped by `org_id` | Column in join table; FK to `organizations` |
| Maturity computation uses only own-org nodes | Pure function over tenant-scoped snapshot |
| Export (Copy/Download JSON) contains `orgId` | Already in `DppProduct.orgId` |

### 9.2 — RLS Requirements

| Table / View | RLS | Policy requirement |
|-------------|-----|--------------------|
| `traceability_nodes` | FORCE RLS = true | Supplier sees own org nodes only |
| `traceability_edges` | FORCE RLS = true | Supplier sees own org edges only |
| `certifications` | FORCE RLS = true | Supplier sees own org certs only |
| `node_certifications` (D1) | FORCE RLS = true | Supplier sees own org linkages only |
| `dpp_snapshot_products_v1` | SECURITY INVOKER | Inherits from `traceability_nodes` + `organizations` |
| `dpp_snapshot_lineage_v1` | SECURITY INVOKER | Inherits from `traceability_edges` |
| `dpp_snapshot_certifications_v1` | SECURITY INVOKER | Inherits from `certifications` + `node_certifications` |

### 9.3 — Authentication Requirements

- All DPP read routes require `tenantAuthMiddleware`
- All DPP read routes require `databaseContextMiddleware` (sets tenant Postgres context)
- No unauthenticated DPP access in v1 or future slices except `PUBLISHED` nodes via public QR
  (D-6; requires separate explicit authorization)
- Audit log entry `tenant.dpp.read` is written on every successful read (already implemented)

### 9.4 — Parameter Validation

All future DPP routes must apply Zod `.uuid()` validation to `:nodeId` parameters. The existing
route implements this correctly and sets the pattern for future slices.

---

## Section 10 — API / Read Contract Sketch

### 10.1 — Existing Contract (Preserved, Not Modified)

```
GET /api/tenant/dpp/:nodeId
Auth: tenantAuthMiddleware + databaseContextMiddleware
Response: DppSnapshot (nodeId, product, lineage, certifications, meta)
```

This endpoint is stable. No changes authorized.

### 10.2 — Future Tenant Route (Design Sketch — D-3 Slice)

```
GET /api/tenant/dpp/:nodeId/passport
Auth: tenantAuthMiddleware + databaseContextMiddleware
Response: DppPassportFoundationView
  {
    nodeId, orgId, batchId, nodeType, meta, geoHash, visibility,
    createdAt, updatedAt,
    manufacturerName, manufacturerJurisdiction, manufacturerRegistrationNo,
    lineage: [...],
    certifications: [...],
    passportMaturity: DppMaturityLevel,
    passportStatus: DppPassportStatus,
    passportEvidenceSummary: { aiExtractedClaimsCount, approvedCertCount, lineageDepth },
    meta_passport: {}
  }
```

**Design requirements for D-3:**
- Additive — does not replace `GET /api/tenant/dpp/:nodeId`
- Uses same view queries; `passportMaturity` and `passportEvidenceSummary` are computed in the
  route handler (no DB column)
- `passportStatus` requires a new `passport_status` field on `traceability_nodes` OR a separate
  `dpp_passport_states` table — decision deferred to D-3 design

### 10.3 — Future Public Route (Design Sketch — D-6 Slice, Gated)

```
GET /api/public/dpp/:nodeId          ← future; requires PUBLISHED status
Response: DppPublicPassportView (subset of DppPassportFoundationView; no internal fields)
```

**Gate conditions for D-6:**
- `passportStatus = 'PUBLISHED'` on the node
- Explicit Paresh authorization for public route registration
- Separate OpenAPI contract entry
- No org-internal fields (lineage depth cap, meta filtered, no manufacturer reg. no. unless
  publication policy permits)

---

## Section 11 — UI Surface Design

### 11.1 — Extension Principle (No Modification to Existing)

The existing `DPPPassport.tsx` sections are preserved. New passport-identity sections are
additive, rendered only when `passportMaturity` and `passportStatus` data are available.

### 11.2 — Planned UI Sections (D-3 Implementation)

| Section | data-testid | Render condition |
|---------|-------------|-----------------|
| Passport Status badge | `dpp-passport-status-badge` | `passportStatus` available |
| Maturity indicator | `dpp-maturity-indicator` | `passportMaturity` available |
| Evidence summary row | `dpp-evidence-summary` | `passportEvidenceSummary` available |
| Approved cert count | `dpp-approved-cert-count` | `approvedCertCount >= 0` |
| Lineage depth | `dpp-lineage-depth` | `lineageDepth >= 0` |
| AI claims count (future D-4) | `dpp-ai-claims-count` | `aiExtractedClaimsCount >= 0` |

### 11.3 — Test-ID Naming Convention

Pattern: `dpp-{section}-{element}` — lowercase, hyphen-separated.

All future DPP UI tests must use `data-testid` selectors following this convention.

### 11.4 — White-Label Compatibility

Any new UI sections must respect:
- White-label title override (`is_white_label → 'DPP Snapshot'`)
- White-label passport-status label mapping (if white-label tenants have custom status names):
  - Design placeholder: `is_white_label ? 'Status' : 'Passport Status'`

---

## Section 12 — Relationship to PDP (Product Detail Page)

### 12.1 — Current Boundary (Preserved)

PDP (`components/Tenant/CatalogPdpSurface.tsx`) and DPP (`components/Tenant/DPPPassport.tsx`)
are currently completely separate surfaces with no shared runtime data path.

PDP test boundary (authoritative):
- T2.5: compliance notice does NOT contain DPP or passport language
- T7.7: returned view has no DPP passport field
- T18.5: compliance summary does NOT contain DPP/passport field
- T26.2: payload does not have DPP fields

**These boundaries are preserved by this design unit. No PDP changes are authorized.**

### 12.2 — Future Linkage Design (Not Authorized)

When a future `TECS-DPP-BUYER-VISIBILITY-001` unit is opened, the linkage mechanism will require:

1. A verified FK relationship between `traceability_nodes` and `catalog_items` (G-025-H; currently
   no `catalog_item_id` column on `traceability_nodes`)
2. A new buyer-scoped DPP summary endpoint (additive; does not modify PDP route)
3. An optional DPP badge in the PDP compliance section (display only; read from
   `passportStatus = TRADE_READY` or `PUBLISHED`)
4. Explicit PDP test file updates to include new DPP badge assertions

The G-025-H FK mismatch must be resolved before this linkage is possible. It is a known deferred
design input, not a blocker for this unit.

---

## Section 13 — Relationship to AI Document Intelligence

### 13.1 — Predecessor Unit

`TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001` is VERIFIED_COMPLETE (2026-04-27, 237/237 PASS).
It delivered:
- Document intake and type classification
- AI field extraction (prompt builder, parser, confidence helpers)
- Human review panel (supplier-internal)
- Approve/reject workflow (`document_field_extractions` lifecycle)

**Governance boundary (from AI doc intelligence unit):** No DPP behavior, no buyer-facing surface,
no auto-submission from AI.

### 13.2 — Evidence Linkage Design (D-4 Slice)

In future slice D-4, approved AI document extractions can feed DPP evidence claims:

```
document_field_extractions (APPROVED)
        │
        │  D-4 linkage design (future)
        ▼
  dpp_evidence_claims (new join table — design only)
  ┌──────────────────────────────────────────────────────────────┐
  │  id               UUID PK                                    │
  │  org_id           UUID NOT NULL → organizations(id)          │
  │  node_id          UUID NOT NULL → traceability_nodes(id)     │
  │  extraction_id    UUID NOT NULL → document_field_extractions(id) │
  │  claim_type       TEXT NOT NULL  (e.g., 'MATERIAL_COMPOSITION') │
  │  claim_value      JSONB NOT NULL                             │
  │  approved_by      UUID → users(id)  (human reviewer)        │
  │  approved_at      TIMESTAMPTZ                                │
  │  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()         │
  │  UNIQUE (org_id, node_id, extraction_id, claim_type)         │
  └──────────────────────────────────────────────────────────────┘
```

**Invariant (structural constant):**
- `approved_by` must be non-null for any claim to count toward `passportEvidenceSummary`
- AI confidence score is advisory metadata only; it never gates claim acceptance
- The `humanReviewRequired` structural constant from TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001
  extends into the DPP evidence linkage path

### 13.3 — No Current Connection

No connection between AI document intelligence and DPP exists in the current implementation.
This design unit documents the future linkage design only. No code is created.

---

## Section 14 — Implementation Slice Plan

> **ALL SLICES ARE UNAUTHORIZED.** Each slice requires an explicit Paresh-authorized TECS
> prompt before any implementation work begins.

### D-1 — `node_certifications` Join Table DDL

| Attribute | Value |
|-----------|-------|
| TECS ID | TECS-DPP-NODE-CERTIFICATIONS-DDL-001 |
| Prerequisite | Paresh explicit approval of D1 design (DPP-SNAPSHOT-VIEWS-DESIGN.md) |
| Scope | SQL DDL for `node_certifications`; `prisma db pull`; `prisma generate` |
| Files | New SQL migration file + `server/prisma/schema.prisma` (db pull output only) |
| Blocker | G-025-B (resolved by design); awaiting Paresh sign-off |
| Status | **UNAUTHORIZED** |

### D-2 — DPP View Extensions (transformationId, lifecycleStateName, issuedAt)

| Attribute | Value |
|-----------|-------|
| TECS ID | TECS-DPP-VIEWS-EXTENSION-001 |
| Prerequisite | D-1 complete |
| Scope | Extend 3 existing views with D2 fields; update TypeScript row interfaces in tenant.ts |
| Files | SQL view DDL files; `server/src/routes/tenant.ts` (row interfaces only) |
| Status | **UNAUTHORIZED** |

### D-3 — Passport Identity / Status Model

| Attribute | Value |
|-----------|-------|
| TECS ID | TECS-DPP-PASSPORT-IDENTITY-001 |
| Prerequisite | D-1 complete; D-2 optionally complete |
| Scope | `DppPassportFoundationView` interface; `computeDppMaturity()` pure function; `GET /api/tenant/dpp/:nodeId/passport` route; UI sections (maturity, status, evidence summary) in DPPPassport.tsx |
| Files | `server/src/routes/tenant.ts`, `components/Tenant/DPPPassport.tsx`, new test file |
| Decision pending | `passportStatus` storage — new column on `traceability_nodes` vs separate `dpp_passport_states` table (requires Paresh decision) |
| Status | **UNAUTHORIZED** |

### D-4 — AI Evidence Linkage

| Attribute | Value |
|-----------|-------|
| TECS ID | TECS-DPP-AI-EVIDENCE-LINKAGE-001 |
| Prerequisite | D-3 complete; `document_field_extractions` stable contract |
| Scope | `dpp_evidence_claims` table DDL; evidence linkage UI in DPPPassport.tsx; `passportEvidenceSummary.aiExtractedClaimsCount` populated |
| Files | New SQL DDL; `server/src/routes/tenant.ts`; `components/Tenant/DPPPassport.tsx` |
| Invariant | `humanReviewRequired` structural constant; `approved_by` non-null required |
| Status | **UNAUTHORIZED** |

### D-5 — Server-Side Export / Share Surface

| Attribute | Value |
|-----------|-------|
| TECS ID | TECS-DPP-EXPORT-SHARE-001 |
| Prerequisite | D-3 complete |
| Scope | `GET /api/tenant/dpp/:nodeId/passport/export` (server-rendered JSON snapshot); authenticated only; no public access |
| Notes | Does NOT replace client-side Copy/Download JSON; additive |
| Status | **UNAUTHORIZED** |

### D-6 — Public QR Access / Published DPP

| Attribute | Value |
|-----------|-------|
| TECS ID | TECS-DPP-PUBLIC-QR-001 |
| Prerequisite | D-3 complete; D-5 complete; `passportStatus = PUBLISHED` storage in place; Paresh authorization for public route |
| Scope | `GET /api/public/dpp/:nodeId` unauthenticated route; QR code generation; JSON-LD output (EU DPP format) |
| Security | Rate limiting; public nodes only; no internal fields exposed |
| Status | **UNAUTHORIZED** (requires explicit Paresh authorization; most complex slice) |

---

## Section N — Naming Strategy

### N.1 — Current vs. Target Brand Name

| Scope | Current | Target |
|-------|---------|--------|
| Product name | DPP Passport | **TexQtic DPP Passport Network** |
| UI title | `DPP Passport` | `DPP Passport` (preserved v1; migration in future slice) |
| White-label override | `DPP Snapshot` | `DPP Snapshot` (preserved) |
| Code class/component | `DPPPassport`, `DppSnapshot` | Preserved (no rename in v1) |
| Route key | `dpp` | Preserved |
| API path | `/tenant/dpp/:nodeId` | Preserved |

### N.2 — Naming Layers

The TexQtic DPP Passport Network is conceived as a three-layer model:

| Layer | Name | Scope |
|-------|------|-------|
| L1 | **Passport Identity** | Single traceability node with verified claims |
| L2 | **Passport Network** | Connected nodes forming a supply-chain lineage graph |
| L3 | **Passport Exchange** | External publication / QR / trade partner access |

### N.3 — Naming Migration Slice

A future `TECS-DPP-NAMING-MIGRATION-001` slice will:
- Rename UI copy from `DPP Passport` to `TexQtic DPP Passport Network` in non-white-label contexts
- Update navigation labels in Shells.tsx
- Update route label in App.tsx
- Preserve all `data-testid` attributes (no test breaks)
- **NOT** rename TypeScript interfaces, component files, or API paths (API contract stability)

This slice is explicitly deferred and **UNAUTHORIZED** until naming strategy is confirmed by
Paresh.

### N.4 — Internal Code Naming Convention (Stable)

| Item | Name | Stability |
|------|------|-----------|
| Component | `DPPPassport` | Frozen (no rename) |
| Snapshot interface | `DppSnapshot` | Frozen |
| Foundation view interface | `DppPassportFoundationView` | New; stable from D-3 |
| Route path | `/tenant/dpp/:nodeId` | Frozen |
| Audit action | `tenant.dpp.read` | Frozen |

---

## Appendix — Related Documents

| Document | Role |
|----------|------|
| `docs/architecture/DPP-SNAPSHOT-VIEWS-DISCOVERY.md` | Source table audit; G-025-B identification |
| `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md` | D1 node_certifications + D2 field surface decisions |
| `docs/TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001-DESIGN-v1.md` | Predecessor; evidence linkage contract origin |
| `docs/TECS-B2B-BUYER-CATALOG-PDP-001-DESIGN-v1.md` | Predecessor; PDP boundary design |
| `server/src/routes/tenant.ts` (lines 4778–4940) | DPP route implementation |
| `components/Tenant/DPPPassport.tsx` | DPP UI implementation |

---

*Design artifact created: 2026-04-28*  
*Governance unit: TECS-DPP-PASSPORT-FOUNDATION-001*  
*Mode: DESIGN ONLY — No implementation authorized*  
*All implementation slices (D-1 through D-6) require explicit Paresh authorization.*
