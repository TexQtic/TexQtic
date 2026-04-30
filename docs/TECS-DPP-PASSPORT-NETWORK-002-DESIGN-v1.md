# TECS-DPP-PASSPORT-NETWORK-002 — TexQtic DPP Passport Network
## Bounded Naming + Lite-to-Global Design Artifact

**Unit:** TECS-DPP-PASSPORT-NETWORK-002  
**Type:** DESIGN-ONLY — no schema, route, migration, or UI changes in this unit  
**Status:** DESIGN_COMPLETE  
**Design Date:** 2026-04-30  
**Authored by:** Copilot (repo-truth verified)  
**Prerequisite:** TECS-DPP-PASSPORT-NETWORK-D6-CLOSE-001 — VERIFIED_COMPLETE (commit `3e5303a`)

---

## 1. Scope and Non-Scope

### In scope

- Product naming architecture for the TexQtic DPP Passport Network
- Internal-code-to-product-label mapping tables for maturity levels and passport statuses
- Lite-to-Global progressive ladder: Local Profile → Trade Passport → Certified Passport → Global DPP Passport
- MSME-safe UX rules — what to hide from local sellers, what to gate for export users
- Public passport strategy anchored to the D-6 route decision
- Status transition design (future lifecycle concept, not implemented)
- GLOBAL_DPP reachability design (future criteria, not implemented)
- White-label naming strategy
- Future implementation slice sequencing

### Out of scope (forbidden in this unit)

- Schema changes, migrations, DDL
- Route changes or new endpoints
- UI component changes or label renames
- Test file changes
- Implementation of status transition API
- Implementation of GLOBAL_DPP maturity logic
- QR image generation
- JSON-LD output
- Public buyer page HTML
- Fixing `aiExtractedClaimsCount = 0` RLS/GUC issue
- Fixing `approved_by NOT NULL + ON DELETE SET NULL` latent inconsistency
- Deduplicating `DppMaturityLevel` / `D6MaturityLevel` type definitions
- QA fixture cleanup

---

## 2. D-6 Closure Assumptions

This design is anchored to the verified D-6 closure (commit `3e5303a`):

- **Canonical public machine-readable endpoint:** `GET /api/public/dpp/:publicPassportId`
- **Intentionally absent:** `GET /api/public/dpp/:publicPassportId.json`  
  Reason: backslash in Fastify/find-my-way route string causes `SyntaxError` at init, crashing all routes. Verified by hotfix `59f2dcd`.
- **D6-S02:** updated to assert the unsafe `.json` route is absent; 58/58 tests PASS.
- Any future alternate machine-readable surface must use a safe shape:
  - `GET /api/public/dpp/:publicPassportId/json` (path segment — safe)  
  - Or query-based format negotiation: `?format=json`  
  - Both require separate authorization before implementation.
- This design does NOT reference or plan `/api/public/dpp/:publicPassportId.json`.

---

## 3. Repo-Truth Baseline

### 3.1 Current API surface

| Route | Auth | Purpose | Status |
|---|---|---|---|
| `GET /api/tenant/dpp/:nodeId` | tenantAuth + dbContext | Base DPP snapshot (product, lineage, certs) | LIVE |
| `GET /api/tenant/dpp/:nodeId/passport` | tenantAuth + dbContext | Passport foundation (status, maturity, evidence summary) | LIVE |
| `GET /api/tenant/dpp/:nodeId/evidence-claims` | tenantAuth + dbContext | List approved AI-extracted evidence claims | LIVE |
| `POST /api/tenant/dpp/:nodeId/evidence-claims` | tenantAuth + dbContext | Create evidence claim from reviewed extraction | LIVE |
| `GET /api/tenant/dpp/:nodeId/passport/export` | tenantAuth + dbContext | Tenant-internal export (D-5); `publicationStatus: INTERNAL_EXPORT_ONLY` | LIVE |
| `GET /api/public/dpp/:publicPassportId` | none (unauthenticated) | Public PUBLISHED passport via `public_token` UUID | LIVE — **canonical public surface** |

**No status transition API exists.** `passportStatus` is set directly in `dpp_passport_states.status` with no governed PATCH endpoint.

### 3.2 Current schema surface

| Table / Model | Key fields | Notes |
|---|---|---|
| `dpp_passport_states` | `id`, `org_id`, `node_id`, `status` (DRAFT/INTERNAL/TRADE_READY/PUBLISHED), `public_token` (UUID, nullable), `reviewed_at`, `reviewed_by_user_id` | RLS-enforced; `public_token` set = PUBLISHED path |
| `DppEvidenceClaim` | `orgId`, `nodeId`, `extractionId`, `claimType`, `claimValue`, `approvedBy`, `approvedAt` | 9 allowed `claim_type` values; `humanReviewRequired: true` structural constant |
| `dpp_snapshot_products_v1` | Product fields, `transformationId`, `lifecycleStateName`, `issuedAt`, manufacturer fields | SECURITY INVOKER view |
| `dpp_snapshot_lineage_v1` | Lineage graph fields, `depth`, `nodeId`, `parentNodeId`, `edgeType` | SECURITY INVOKER view |
| `dpp_snapshot_certifications_v1` | `certification_type`, `lifecycle_state_name`, `issued_at`, `expiry_date` | SECURITY INVOKER view |
| `TraceabilityNode` | Core supply chain node | Linked to all DPP surfaces |

### 3.3 Current maturity computation (`computeDppMaturity`)

```
TRADE_READY  ← approvedCertCount >= 1 AND lineageDepth >= 1
LOCAL_TRUST  ← all other cases (fallback)
COMPLIANCE   ← RESERVED — not reachable (D-3 comment: "requires explicit future criteria")
GLOBAL_DPP   ← RESERVED — not reachable (D-3 comment: "requires D-6 public gate + PUBLISHED status")
```

Both `computeDppMaturity` (tenant.ts) and `computeDppMaturityPublic` (public.ts) implement the same two-outcome logic. Only two maturity levels are currently achievable.

### 3.4 Current UI surface (`DPPPassport.tsx`)

- `passportData.passportStatus.replace('_', ' ')` → displays raw `TRADE READY`, `DRAFT`, `PUBLISHED`, `INTERNAL`
- `passportData.passportMaturity.replace('_', ' ')` → displays raw `LOCAL TRUST`, `TRADE READY`, `COMPLIANCE`, `GLOBAL DPP`
- Two separate badge displays: one for status, one for maturity
- No product-grade labels, no maturity score tiers, no MSME-safe copy

### 3.5 Current white-label DPP surface

**No DPP components exist in `components/WL/` or `components/WhiteLabelAdmin/`.**  
The WL surface currently exposes: Branding Snapshot, Risk Snapshot (TenantDetails.tsx) — neither is DPP-specific.  
"DPP Snapshot" is a DB-level view name (`dpp_snapshot_products_v1`) only — it is not yet surfaced in WL UI.

### 3.6 Known gaps (adjacent — not addressed in this design unit)

- `GLOBAL_DPP` maturity is currently unreachable
- No status transition API
- No buyer-facing public UI (only machine-readable JSON)
- No QR image generation
- `aiExtractedClaimsCount = 0` in public route — RLS/GUC key mismatch (`app.current_org_id` vs `app.org_id`)
- Raw UI labels: `TRADE READY` badge appears for both `passportStatus = TRADE_READY` and `passportMaturity = TRADE_READY` with no disambiguation
- Duplicate type definitions: `DppMaturityLevel` (tenant.ts, DPPPassport.tsx) and `D6MaturityLevel` (public.ts)
- No WL-configurable DPP naming surface
- No Playwright/E2E DPP coverage

---

## 4. Product Principles

### 4.1 Core principle

> **Local sellers should feel: "This helps me sell better."**  
> **Export sellers should feel: "This helps me comply."**  
> **Buyers should feel: "This helps me trust faster."**

### 4.2 Design axioms

1. **Not an entry barrier.** DPP must not be a requirement for platform participation by local MSMEs.
2. **A growth path, not a compliance gate.** Every step in the ladder must have a seller-visible business benefit.
3. **Progressive disclosure.** EU compliance, carbon data, JSON-LD, and regulator views must only appear when the seller has self-selected for the export/global tier.
4. **Buyer trust is the reward.** The product copy frames every DPP tier as "more buyers will trust you faster" — not "you must comply."
5. **Human review is a structural constant.** AI alone never triggers DPP publication. `humanReviewRequired: true` is constitutional throughout the system.
6. **`org_id` isolation is unconditional.** Every DPP surface must be scoped by `org_id`. No cross-tenant DPP query is permitted at any tier.
7. **Public safety by default.** The public passport must never expose: supplier pricing, internal order IDs, buyer relationships, AI draft fields, or unreviewed evidence.

### 4.3 Naming principle

The platform brand name is **TexQtic DPP Passport Network** — but sellers should rarely see this term.  
What sellers see depends on their tier and context:

- Local MSMEs see: **Product Trust Profile** or **Verified Product Profile**
- B2B suppliers see: **Trade Ready Passport** or **Certified Passport**
- Export/enterprise suppliers see: **Global DPP Passport** or **TexQtic DPP Passport**
- Buyers see: **Verified Supply Chain Passport** (buyer-facing trust label)
- White-label tenants see: configurable (see §13)
- Developers/API consumers see: internal code names (routes, schema) — not product labels

---

## 5. Lite-to-Global Ladder

```
[L1] Local Profile          ←→  LOCAL_TRUST maturity
[L2] Trade Passport         ←→  TRADE_READY maturity
[L3] Certified Passport     ←→  COMPLIANCE maturity  (currently reserved)
[L4] Global DPP Passport    ←→  GLOBAL_DPP maturity  (currently unreachable)
```

### 5.1 Level 1 — Local Profile (Product Trust Profile)

| Dimension | Value |
|---|---|
| **Product name** | Product Trust Profile |
| **Badge** | Bronze — Verified Local |
| **Audience** | Local MSMEs, small traders, domestic-only sellers |
| **UX framing** | "Your product is verified on TexQtic. Buyers can see your business details." |
| **Seller value** | Credibility with local buyers; discoverability on TexQtic |
| **Buyer value** | Basic trust signal — real business, real product |
| **Upgrade CTA** | "Add a QC report or certificate to reach Silver and attract more buyers." |

**Minimum data for L1:**
- Business name, GST/MSME/location
- Product photos (at least one)
- Product category
- Basic material description
- Capacity + MOQ
- Payment terms
- Basic quality declaration (self-attested)

**What to hide from L1 sellers:**
- EU DPP, regulation references, compliance language
- Carbon / water / chemical data fields
- Fibre-to-garment traceability requirements
- Regulator/auditor view concepts
- JSON-LD terminology
- "Global DPP" or "Passport" as primary UI framing

**What L1 does NOT require:**
- Any certification
- Lineage depth
- Evidence claims
- Reviewed passport state

**Current repo mapping:** A node with `passportStatus = DRAFT` and `passportMaturity = LOCAL_TRUST` (no certs, no lineage). This state is achievable now with existing schema.

---

### 5.2 Level 2 — Trade Passport (Trade Ready Passport)

| Dimension | Value |
|---|---|
| **Product name** | Trade Ready Passport |
| **Badge** | Silver — Trade Ready |
| **Audience** | Domestic B2B suppliers, serious local manufacturers, repeat B2B buyers |
| **UX framing** | "Buyers see your QC reports and supply details. 3x more RFQ responses." |
| **Seller value** | Access to larger buyer pool; RFQ eligibility; trust with domestic B2B |
| **Buyer value** | Can see dispatch proof, QC report, basic traceability; confident to issue PO |
| **Upgrade CTA** | "Upload your certification to reach Gold and become eligible for enterprise buyers." |

**Minimum data for L2 (adds to L1):**
- At least one approved evidence claim (`claimType` in: `CERTIFICATION`, `QC_REPORT`, `BATCH_LOT`, `DISPATCH_PROOF`)
- Lineage depth >= 1 (at least supplier/manufacturer linkage)
- `passportStatus` progressed beyond DRAFT (INTERNAL or TRADE_READY)

**Optional data at L2:**
- Invoice / PO linkage
- Buyer acceptance proof
- RFQ/Order/Trade linkage (where repo supports)
- Certificate upload (if available but not yet approved)

**Current repo mapping:** `passportMaturity = TRADE_READY` is already achievable: `approvedCertCount >= 1 AND lineageDepth >= 1`. This is the current maximum achievable maturity.

---

### 5.3 Level 3 — Certified Passport

| Dimension | Value |
|---|---|
| **Product name** | Certified Passport |
| **Badge** | Gold — Certified |
| **Audience** | Suppliers seeking enterprise buyer acceptance; brands; compliance-aware domestic and international trade |
| **UX framing** | "Gold certified: buyers trust your product meets quality and compliance requirements." |
| **Seller value** | Enterprise buyer eligibility; audit-ready; certification expiry warnings |
| **Buyer value** | Certification vault visible; issuing body verified; expiry dates shown; evidence bundle downloadable |
| **Upgrade CTA** | "Add full fibre-to-garment traceability and publish your passport to reach Platinum and unlock export markets." |

**Minimum data for L3 (adds to L2):**
- At least one certificate with `lifecycle_state_name` = ACTIVE/APPROVED and valid `expiry_date`
- Issuing body and certificate number in evidence
- `approvedCertCount >= 2` (indicative — exact threshold is a future design decision, see §16 Q-03)
- `passportStatus = TRADE_READY` (reviewed internal state; supplier self-nominated for wider access)

**Optional at L3:**
- Buyer/auditor evidence bundle
- Certificate expiry warnings (AI assistant hook)
- Multiple certification types

**Current repo mapping:** `COMPLIANCE` maturity is RESERVED. Reaching L3 requires:
1. A future `computeDppMaturity` update to define COMPLIANCE criteria
2. Criteria likely: higher `approvedCertCount` threshold + cert validity check
3. No schema change required — cert validity is already in `dpp_snapshot_certifications_v1`
4. API change required: `computeDppMaturity` logic update

---

### 5.4 Level 4 — Global DPP Passport

| Dimension | Value |
|---|---|
| **Product name** | Global DPP Passport |
| **Badge** | Platinum — Export Ready |
| **Audience** | Exporters, brands, EU-facing supply, enterprise buyers, auditors, regulators |
| **UX framing** | "Platinum: Your product is export-ready with a verified Digital Product Passport." |
| **Seller value** | EU market eligibility; regulator/auditor trust; QR-scannable passport; machine-readable JSON output |
| **Buyer value** | Full traceability chain; public passport URL; QR scan; JSON-LD (future-gated) |
| **Upgrade CTA** | n/a — highest tier |

**Minimum data for L4 (adds to L3):**
- `passportStatus = PUBLISHED`
- `public_token` assigned (passport is publicly accessible)
- Full fibre-to-garment lineage (depth >= X — threshold TBD; see §7.1)
- All key certifications approved
- At least one approved AI-extracted evidence claim per key claim type (TBD)
- QR URL publicly accessible and resolving
- Carbon/water/chemical data (future-gated — see §16 Q-04)

**Current repo mapping:** `GLOBAL_DPP` maturity is RESERVED and unreachable. Reaching L4 requires future implementation slice D-GLOBAL-DPP (see §14.D).

---

## 6. Passport Maturity Score (Bronze/Silver/Gold/Platinum)

This is the **product-facing tier system** that maps onto internal maturity levels.

| Score | Internal code | Badge label | Product framing |
|---|---|---|---|
| Bronze | `LOCAL_TRUST` | ✓ Bronze — Verified Local | "Verified on TexQtic" |
| Silver | `TRADE_READY` | ✓ Silver — Trade Ready | "Ready for B2B buyers" |
| Gold | `COMPLIANCE` | ✓ Gold — Certified | "Certified & buyer-ready" |
| Platinum | `GLOBAL_DPP` | ✓ Platinum — Export Ready | "Global DPP Passport" |

**Example product copy:**

> "This product is **Silver: Trade Ready**. Add your certification and advance to Gold to attract enterprise buyers."

> "This product is **Bronze: Verified Local**. Add a QC report or link your supplier to reach Silver."

The score tier must replace the raw code badge in a future UI label slice (see §14.A). The internal code names (`LOCAL_TRUST`, `TRADE_READY`, etc.) must never appear in seller-facing or buyer-facing UI.

---

## 7. Internal-Code-to-Product-Label Mapping

### 7.1 Maturity Level Mapping

| Internal code | Product label | Badge label | Score tier | Seller-facing explanation | Buyer-facing explanation | Required evidence concept | Next-step CTA |
|---|---|---|---|---|---|---|---|
| `LOCAL_TRUST` | Product Trust Profile | Bronze — Verified Local | Bronze | "Your product is listed and verified on TexQtic. Buyers can see your basic details." | "Verified local seller. Basic product information confirmed." | Business details + product category + at least one photo | "Add a QC report or link your supplier to reach Silver." |
| `TRADE_READY` | Trade Ready Passport | Silver — Trade Ready | Silver | "Buyers can see your QC reports and supply chain details. More RFQs await." | "Trade-ready supplier. QC reports, lineage, and certifications available for review." | ≥1 approved cert + lineage depth ≥1 | "Upload your certification bundle to reach Gold." |
| `COMPLIANCE` | Certified Passport | Gold — Certified | Gold | "Your product meets buyer certification requirements. Enterprise buyers can see your full evidence." | "Certified supplier. Full certification vault and evidence bundle available." | Multiple approved certs + valid expiry dates + cert issuers (exact threshold: decision gate Q-03) | "Add full traceability to reach Platinum and unlock export markets." |
| `GLOBAL_DPP` | Global DPP Passport | Platinum — Export Ready | Platinum | "Your product has a verified Digital Product Passport. You are eligible for international trade and EU markets." | "Export-ready product with a verified Digital Product Passport. QR-scannable, publicly accessible." | PUBLISHED status + public_token + full lineage + approved certs + (future: JSON-LD, carbon data) | n/a — highest tier |

### 7.2 Passport Status Mapping

| Internal code | Lifecycle meaning | Who can see | Public passport active | Seller action needed | Buyer visibility | Regulator/auditor visibility |
|---|---|---|---|---|---|---|
| `DRAFT` | Passport created; not yet reviewed; work in progress | Authenticated tenant users (org-scoped) only | ❌ No | Complete product data; initiate internal review | ❌ Not visible | ❌ Not visible |
| `INTERNAL` | Internally reviewed; ready for trade-level access; not yet published | Authenticated tenant users + invited trade partners (if implemented) | ❌ No | Review and approve for trade access; progress to TRADE_READY status | ❌ Not visible publicly; visible to authenticated trade partners (if implemented) | ❌ Not visible |
| `TRADE_READY` | Approved for trade use; shared in authenticated B2B contexts; not yet public | Authenticated tenant users + B2B buyer counterparties in active relationships | ❌ No | Optionally publish to make public; add more evidence | ✓ Visible in authenticated B2B context (future — requires buyer-trade API) | ❌ Not visible publicly |
| `PUBLISHED` | Published; `public_token` assigned; accessible via public URL and QR | Anyone with the public URL or QR code | ✅ Yes (`GET /api/public/dpp/:publicPassportId`) | Maintain/update evidence; monitor for expiry | ✅ Visible via public URL | ✅ Visible via public URL (limited fields) |

### 7.3 Status vs Maturity Disambiguation — CRITICAL

**The name collision problem:**  
`TRADE_READY` appears as both a `DppPassportStatus` value and a `DppMaturityLevel` value.

In current UI, `passportData.passportStatus.replace('_', ' ')` and `passportData.passportMaturity.replace('_', ' ')` can both display `"TRADE READY"` simultaneously, with no contextual distinction.

**Design resolution:**

| What it is | Internal code | UI must show | Never show |
|---|---|---|---|
| Status = TRADE_READY | `DppPassportStatus.TRADE_READY` | **"Trade Access"** or **"Trade Approved"** | "Trade Ready" (collides with maturity badge) |
| Maturity = TRADE_READY | `DppMaturityLevel.TRADE_READY` | **"Silver — Trade Ready"** or **"Trade Ready Passport"** | "Trade Ready Status" |
| Status = PUBLISHED | `DppPassportStatus.PUBLISHED` | **"Published — Public"** or **"Publicly Visible"** | n/a |
| Status = INTERNAL | `DppPassportStatus.INTERNAL` | **"In Review"** or **"Internal Review"** | "Internal" (ambiguous to non-technical users) |
| Status = DRAFT | `DppPassportStatus.DRAFT` | **"In Progress"** or **"Draft"** | n/a |

**UI rule:** Status badge and maturity score badge must use visually distinct label copy so no two badges show the same text. This is a constraint for the future UI label implementation slice (§14.A).

---

## 8. Status Transition Design (Future — Not Implemented)

**Current reality:** No transition API exists. `status` in `dpp_passport_states` is set by direct DB write. There is no governed PATCH endpoint.

**Future lifecycle design:**

### 8.1 Transition table

| From → To | Who can trigger | Evidence gate | Automated or manual | Audit log required |
|---|---|---|---|---|
| (no row) → `DRAFT` | Any tenant user with product node | None — auto-created on first passport read | Automated (upsert on first `/passport` GET) | `tenant.dpp.passport.created` |
| `DRAFT` → `INTERNAL` | Tenant user (ADMIN or MEMBER + sufficient evidence) | Minimum: product data complete; at least one evidence claim | Manual — user action | `tenant.dpp.passport.submitted_internal` |
| `INTERNAL` → `TRADE_READY` | Tenant ADMIN or designated reviewer | Required: at least one approved cert + lineage depth ≥ 1; reviewer is human | Manual — reviewer approves; sets `reviewed_by_user_id` + `reviewed_at` | `tenant.dpp.passport.approved_trade` |
| `TRADE_READY` → `PUBLISHED` | Tenant ADMIN only | Required: all evidence complete; Paresh-level gate on first PUBLISH; `public_token` must be assigned | Manual — explicit publish action; `humanReviewRequired: true` enforced | `tenant.dpp.passport.published` |
| `PUBLISHED` → `DRAFT` / revoke | Tenant ADMIN or control-plane superadmin | None — revocation allowed at any time | Manual — immediate | `tenant.dpp.passport.revoked` |

**No reverse transition from `PUBLISHED` to `TRADE_READY`** is needed — revoke to `DRAFT` and re-progress.

### 8.2 Transition API shape (future design)

```
PATCH /api/tenant/dpp/:nodeId/passport/status
Body: { targetStatus: 'INTERNAL' | 'TRADE_READY' | 'PUBLISHED' | 'DRAFT', reason?: string }
Auth: tenantAuth + dbContext
Audit: tenant.dpp.passport.status_changed
```

**Evidence gate check sequence (proposed for future implementation):**
1. Validate `targetStatus` is a legal forward move (no skips)
2. Check evidence gates for target status (cert count, lineage depth, reviewer ID)
3. If `targetStatus = PUBLISHED` and `public_token` is null: generate and assign UUID `public_token`
4. Write `status`, `reviewed_at`, `reviewed_by_user_id` to `dpp_passport_states`
5. Write audit log entry
6. Return updated `DppPassportFoundationView`

### 8.3 Regressions to prevent in future implementation

- Never allow `status = PUBLISHED` with `public_token = null`
- Never allow downgrade without explicit revoke semantics
- Never allow `humanReviewRequired` bypass — the transition endpoint must enforce it structurally
- `reviewed_by_user_id` must be set by the reviewer, never auto-populated from the passport owner

---

## 9. GLOBAL_DPP Reachability Design (Future — Not Implemented)

**Current reality:** `GLOBAL_DPP` is reserved and unreachable. The `computeDppMaturity` function falls through to `LOCAL_TRUST` or `TRADE_READY` only.

### 9.1 Proposed eligibility criteria for GLOBAL_DPP

All of the following must be satisfied:

| Criterion | Required | Notes |
|---|---|---|
| `passportStatus = PUBLISHED` | ✅ Yes | Public passport must be active |
| `public_token` assigned and resolving | ✅ Yes | QR URL must be functional |
| `approvedCertCount >= 3` | ✅ Yes (threshold TBD — see Q-03) | Multiple approved certifications |
| All active certs have valid `expiry_date` | ✅ Yes | No expired certifications at time of computation |
| `lineageDepth >= 2` | ✅ Yes | Full traceability chain (at least two hops: node → supplier → manufacturer) |
| At least one cert with `lifecycle_state_name = ACTIVE` | ✅ Yes | Cannot be EXPIRED or REVOKED |
| `aiExtractedClaimsCount >= 1` | ⚠️ Conditional | Requires RLS/GUC fix first (known gap) |
| Carbon/water/chemical data present | 🔲 Future-gated | Not required in v1 GLOBAL_DPP — see Q-04 |
| JSON-LD output capability | 🔲 Future-gated | Not required for Platinum badge — separate capability |
| QR image generation | 🔲 Desirable | Not a gate — URL-based QR is sufficient for initial Platinum |

### 9.2 Impact on `computeDppMaturity` (future)

```typescript
// Proposed future logic — DO NOT IMPLEMENT IN THIS UNIT
function computeDppMaturity(input: {
  approvedCertCount: number;
  lineageDepth: number;
  passportStatus: DppPassportStatus;
  hasPublicToken: boolean;
  activeCertsWithValidExpiry: number;      // new input required
}): DppMaturityLevel {
  // Platinum: GLOBAL_DPP
  if (
    input.passportStatus === 'PUBLISHED' &&
    input.hasPublicToken &&
    input.approvedCertCount >= 3 &&           // threshold TBD
    input.lineageDepth >= 2 &&
    input.activeCertsWithValidExpiry >= 1
  ) return 'GLOBAL_DPP';
  // Gold: COMPLIANCE (future — exact cert count TBD)
  if (input.approvedCertCount >= 2 && input.lineageDepth >= 1) return 'COMPLIANCE';
  // Silver: TRADE_READY
  if (input.approvedCertCount >= 1 && input.lineageDepth >= 1) return 'TRADE_READY';
  // Bronze: LOCAL_TRUST (fallback)
  return 'LOCAL_TRUST';
}
```

**Note:** `activeCertsWithValidExpiry` requires a new input from `dpp_snapshot_certifications_v1` — the view already has `expiry_date` and `lifecycle_state_name`, so no schema change is needed. Only the query in the passport route and `computeDppMaturity` signature change.

### 9.3 Test gate requirement (future D-GLOBAL-DPP slice)

- GLOBAL_DPP must be reachable and tested with a fixture node satisfying all criteria
- GLOBAL_DPP must remain unreachable when any single criterion fails (regression suite per criterion)
- `computeDppMaturityPublic` in `public.ts` must be updated to match (currently a simplified mirror)

---

## 10. UX Rules for Local MSMEs

### 10.1 What local MSMEs must NEVER see (in L1/Bronze context)

- "EU Digital Product Passport"
- "Regulation (EU) 2024/1781" or any regulation citation
- Carbon footprint, water usage, chemical composition fields as required inputs
- "Fibre-to-garment traceability" as a requirement
- "JSON-LD" or machine-readable format references
- "Regulator view" or "Auditor access"
- Any implication that DPP is a compliance requirement for platform participation
- "Platinum" or "Global DPP" prominently without context that it is optional and for exporters

### 10.2 What local MSMEs should see

- Bronze badge with "Verified Local" copy
- Simple growth CTA: "Add 2 more details to reach Silver"
- Business-benefit framing: "3x more buyer trust with a Silver passport"
- Certificate upload as optional enhancement, not compliance gate
- "Verified Product Profile" as primary label — not "DPP"

### 10.3 Progressive disclosure rules

| Context | What to show |
|---|---|
| L1 seller dashboard | Bronze badge, product fields complete/incomplete, next-step CTA for Silver |
| L2 seller dashboard | Silver badge, cert status, lineage status, next-step CTA for Gold |
| L3 seller dashboard | Gold badge, cert vault, expiry warnings, export readiness assessment |
| L4 seller dashboard | Platinum badge, public passport URL, QR, regulator view status |
| Buyer viewing L1 supplier | "Verified Local" trust badge — no DPP details visible |
| Buyer viewing L2–L3 supplier | "Trade Ready" / "Certified" badge with limited evidence summary |
| Buyer viewing L4 supplier | "Verified Supply Chain Passport" + public URL link |
| WL tenant (if exposed) | Configurable label — see §13 |

### 10.4 Export-only fields (must be gated behind L4/Platinum context)

- Carbon / water / chemical data
- JSON-LD output
- Regulator/auditor access
- "EU DPP" label
- QR image (if implemented — URL-based QR is L4+)

---

## 11. Public Passport Strategy

### 11.1 Route decision (anchored to D-6 closure)

**Canonical public machine-readable endpoint:** `GET /api/public/dpp/:publicPassportId`  
**Response:** JSON (application/json via Fastify defaults)  
**Auth:** None (unauthenticated)  
**Access control:** DB-level — `public_token` lookup on `dpp_passport_states` where `status = PUBLISHED`

**Intentionally absent:** `GET /api/public/dpp/:publicPassportId.json`  
**Reason:** find-my-way backslash SyntaxError risk. This endpoint must not be added in any future slice without explicit authorization and a safe implementation pattern.

**Authorized future safe patterns (if needed):**
- `GET /api/public/dpp/:publicPassportId/json` — path segment (safe)
- `GET /api/public/dpp/:publicPassportId?format=json` — query param (safe)
Neither should be implemented without separate authorization.

### 11.2 What is safe to expose publicly

The current public route handler already enforces this, but the design principle is:

| Field category | Public? | Notes |
|---|---|---|
| `passportMaturity` | ✅ Yes | Product-grade label in future; raw code now |
| `passportStatus` | ✅ Yes (value `PUBLISHED` only) | Only PUBLISHED passports are publicly accessible |
| `productName`, `productCategory` | ✅ Yes | Basic product identity |
| `approvedCertCount` | ✅ Yes | Count only — not cert details |
| `lineageDepth` | ✅ Yes | Depth count only — not node IDs |
| `qr.payloadUrl` | ✅ Yes | The public passport URL itself |
| `exportedAt` | ✅ Yes | When the view was computed |
| Cert type + lifecycle state (no org details) | ✅ Yes | Anonymous cert summary |
| `aiExtractedClaimsCount` | ✅ Yes (currently 0) | Count only — not claim content |

| Field category | Public? | Notes |
|---|---|---|
| Supplier `org_id` | ❌ No | Never expose internal UUIDs |
| `nodeId` (internal UUID) | ❌ No | Identified by `publicPassportId` only |
| Supplier pricing | ❌ No | Never expose pricing via public route |
| Buyer relationships | ❌ No | Cross-tenant data — strictly forbidden |
| AI draft fields | ❌ No | Unreviewed extraction data |
| Internal order IDs | ❌ No | Commerce data — not DPP data |
| Raw traceability node IDs | ❌ No | Internal graph UUIDs |
| `reviewed_by_user_id` | ❌ No | Internal user UUID |

### 11.3 Buyer-facing public page concept

**What is needed (future E-PUBLIC-PAGE slice):**
- A rendered HTML page at `/passport/:publicPassportId` in the frontend
- Fetches from `GET /api/public/dpp/:publicPassportId`
- Displays: product name, maturity score badge (product-grade), cert count, lineage depth, QR code display (URL-based initially)
- Does NOT display: supplier pricing, org details, buyer relationships
- Responsive (mobile-first for QR scan use case)
- No auth required

**Current reality:** No public buyer page exists. The public route returns machine-readable JSON only. There is no frontend route bound to `/passport/:publicPassportId`.

### 11.4 Active / Revoked / Expired behavior

| State | Trigger | Public route behavior |
|---|---|---|
| Active / Published | `status = PUBLISHED` with valid `public_token` | Returns 200 with passport payload |
| Revoked | Admin changes `status` from `PUBLISHED` to `DRAFT` | Returns 404 (not found by public_token lookup) |
| Suspended by control-plane | Control-plane action (future) | Should return structured 410 GONE or 403 FORBIDDEN |
| Expired | Certificate expiry only — not passport expiry | Passport still accessible; `certifications` array reflects expired status |
| Not yet published | `status != PUBLISHED` | Returns 404 regardless of `public_token` |

**Note:** There is no passport-level `expires_at` in the current schema. If passport expiry becomes a requirement (e.g., for EU DPP compliance), a future migration would add `expires_at` to `dpp_passport_states`.

### 11.5 QR behavior

**Current:** The public route returns `qr: { format: 'url', payloadUrl: '...' }` — a URL-only descriptor. No QR image is generated.

**Future QR design (F-QR slice):**
- `payloadUrl` is already canonical: `${APP_PUBLIC_URL}/passport/:publicPassportId`
- A QR image may be generated client-side (no server-side `qrcode` package required) or via a future server endpoint
- The unsafe `.json` route must not be used as the QR payload URL
- QR must point to the buyer-facing public page, not the raw API endpoint

### 11.6 JSON-LD (future-gated)

JSON-LD output (EU DPP machine-readable format) is **design-gated** — it must not be implemented without:
1. Explicit Paresh authorization
2. A separate design artifact mapping `DppPassportFoundationView` to EU DPP schema terms
3. A safe content negotiation pattern (e.g., `Accept: application/ld+json` header or `/json-ld` path segment — NOT `.json` suffix)
4. A verified public route test suite for JSON-LD output

### 11.7 Regulator/auditor view (future-gated)

A regulator or auditor may need:
- Full traceability chain (not just depth count)
- Certificate details with issuing body
- Evidence claim types and values
- Audit log of status transitions

This is **design-gated** — it requires a separate authentication model (regulator token? bulk access? auditor API key?) that does not currently exist. Do not design the regulator view in this unit.

---

## 12. Data / API / Schema Fit Analysis

### 12.1 What existing routes support now

| Capability | Route | Notes |
|---|---|---|
| Read DPP snapshot (tenant) | `GET /api/tenant/dpp/:nodeId` | Product, lineage, certs |
| Read passport status + maturity (tenant) | `GET /api/tenant/dpp/:nodeId/passport` | DppPassportFoundationView |
| Read evidence claims (tenant) | `GET /api/tenant/dpp/:nodeId/evidence-claims` | Approved AI-extracted claims |
| Add evidence claim (tenant) | `POST /api/tenant/dpp/:nodeId/evidence-claims` | Requires reviewed extraction |
| Export passport JSON (tenant-internal) | `GET /api/tenant/dpp/:nodeId/passport/export` | `INTERNAL_EXPORT_ONLY` |
| Read public passport (unauthenticated) | `GET /api/public/dpp/:publicPassportId` | PUBLISHED only; `public_token` lookup |

### 12.2 What existing schema supports now

| Capability | Schema support | Notes |
|---|---|---|
| Passport status (DRAFT/INTERNAL/TRADE_READY/PUBLISHED) | ✅ `dpp_passport_states.status` | Default: DRAFT |
| Public token (for public URL) | ✅ `dpp_passport_states.public_token` | UUID, nullable, unique |
| Reviewer tracking | ✅ `reviewed_at`, `reviewed_by_user_id` | Populated by future transition API |
| Evidence claims | ✅ `DppEvidenceClaim` | 9 allowed claim types |
| Cert vault (type, lifecycle, expiry) | ✅ `dpp_snapshot_certifications_v1` | Via snapshot view |
| Lineage graph | ✅ `dpp_snapshot_lineage_v1` | Depth computable |
| Cert expiry date | ✅ `expiry_date` in `dpp_snapshot_certifications_v1` | Available for COMPLIANCE/GLOBAL_DPP gating |

### 12.3 What can be done as UI/design only (no API/schema change)

| Capability | Implementation approach |
|---|---|
| Product-grade badge labels (Bronze/Silver/Gold/Platinum) | UI label map — replace `passportMaturity.replace('_', ' ')` with label lookup |
| Status badge copy disambiguation (TRADE_READY vs TRADE_READY) | UI label map — different copy for status vs maturity |
| MSME-safe progressive disclosure | Conditional rendering based on maturity tier |
| Maturity score copy + CTA | Static lookup table in UI |
| "Verified Product Profile" / "Trade Ready Passport" framing | UI copy changes |

### 12.4 What requires future API work

| Capability | Required work |
|---|---|
| Status transition (DRAFT → INTERNAL → TRADE_READY → PUBLISHED) | New `PATCH /api/tenant/dpp/:nodeId/passport/status` endpoint |
| `public_token` assignment at publish time | Part of transition API |
| `computeDppMaturity` update for COMPLIANCE and GLOBAL_DPP | Logic change in tenant.ts + public.ts |
| `aiExtractedClaimsCount` in public route | Fix RLS/GUC key (`app.current_org_id` → `app.org_id`) |
| Buyer-facing public page | New frontend route + component |

### 12.5 What requires schema/migration work

| Capability | Required schema change | Notes |
|---|---|---|
| Passport expiry (if needed) | ADD COLUMN `expires_at` to `dpp_passport_states` | Not currently needed for any tier |
| Passport version/history | New table or JSONB history column | Future-gated — not a near-term requirement |
| `approved_by NOT NULL` fix | DROP NOT NULL on `DppEvidenceClaim.approvedBy` OR change FK to RESTRICT | Known latent issue — separate future migration |
| WL-configurable passport name | ADD COLUMN to `tenant_branding` or `white_label_config` | Design-gated |

### 12.6 What requires RLS/security review

| Capability | Review required |
|---|---|
| `aiExtractedClaimsCount` in public route | Fix `app.current_org_id` GUC key mismatch before enabling |
| Status transition endpoint | Must enforce `org_id` scope; reviewer cannot approve own passport |
| Buyer-facing public page | Must never expose `org_id` or internal UUIDs |
| Regulator/auditor access | Requires new auth model — full RLS review required |
| WL DPP exposure | WL admin must only see their own tenant's DPP data |

---

## 13. Security / Privacy / RLS Principles

1. **`org_id` is the unconditional tenancy boundary** for all tenant-scoped DPP routes and queries.
2. **Public passport is identified only by `public_token`** — never by `org_id`, `nodeId`, or internal UUIDs. The public route's two-phase design (Phase 1: public_token lookup as `texqtic_public_lookup`; Phase 2: `withDbContext` scoped by org) must be preserved.
3. **`humanReviewRequired: true` is a structural constant** throughout the DPP system. AI evidence must always go through human review before affecting maturity or status.
4. **No cross-tenant DPP query is permitted.** Control-plane admin views of DPP must use service-role queries with explicit `org_id` scoping — not a weakened RLS policy.
5. **Evidence claim values may contain sensitive business data.** `claimValue` (JSONB) must never be exposed in the public route payload.
6. **Reviewer identity (`reviewed_by_user_id`) must not be exposed publicly.** Only the review timestamp (`reviewed_at`) may be surfaced in public/buyer-facing contexts.
7. **`public_token` rotation.** If a supplier revokes a PUBLISHED passport, the `public_token` must be invalidated. Whether this means nullifying the existing token or assigning a new one on re-publish is a future design decision (see §16 Q-05).
8. **Rate limiting is a known gap.** No `@fastify/rate-limit` is present in the repo. The public passport route is unauthenticated and currently unprotected against enumeration. This is a known non-blocking gap for current scale but must be addressed before GA.
9. **RLS audit.** Any new DPP surface (buyer page, transition API, regulator view) must go through the standard RLS policy design and verification before implementation.

---

## 14. White-Label Naming Strategy

### 14.1 Current WL DPP surface

**No WL DPP UI components currently exist.** The WL surface (`components/WL/`, `components/WhiteLabelAdmin/`) does not expose any DPP or passport UI. The "DPP Snapshot" naming exists only at the database view level (`dpp_snapshot_products_v1` etc.) — it is a developer-internal name, not a user-facing label.

### 14.2 WL naming options

| Option | Description | Classification |
|---|---|---|
| **A. Preserve internal name** | WL tenants see nothing — DPP not exposed in WL UI | **Implementation-ready** (default; no work needed) |
| **B. "Verified Supply Chain Passport"** | Neutral WL label that avoids TexQtic brand | **Implementation-ready** when WL DPP UI is built |
| **C. "Passport Network" or "TexQtic Passport Network"** | WL adopts platform brand | **Decision-gated** — requires WL tenant agreement |
| **D. Tenant-configurable label** | WL admin can configure their own DPP label (e.g., "ABC Corp Traceability Profile") | **Design-gated** — requires schema column + admin UI |
| **E. Hide TexQtic branding entirely** | WL shows custom name; no "TexQtic" visible | **Design-gated** — requires WL branding config support |

### 14.3 Recommended approach

**Phase 1 (now):** Option A — DPP not exposed in WL. No changes needed.  
**Phase 2 (when WL DPP UI is built):** Option B — "Verified Supply Chain Passport" as default WL label.  
**Phase 3 (if enterprise WL required):** Option D — tenant-configurable label with fallback to Option B.

### 14.4 "DPP Snapshot" label fate

- `dpp_snapshot_products_v1`, `dpp_snapshot_lineage_v1`, `dpp_snapshot_certifications_v1` — **keep as-is**. These are internal DB view names. Changing them is a migration/RLS risk.
- Future developer-facing documentation should note that "DPP Snapshot" is the internal DB view layer — not a user-facing label.
- **Do not rename the DB views** in this unit or any future unit without explicit migration planning.

---

## 15. Future Implementation Slices

The following slices are proposed in implementation order. None are implemented in this unit.

### Slice A — UI Label Map + Naming Surface

**Goal:** Replace raw code badges with product-grade labels in `DPPPassport.tsx`.

**What changes (design-only in this unit — implementation next):**
- `passportStatus.replace('_', ' ')` → structured label lookup (see §7.2)
- `passportMaturity.replace('_', ' ')` → maturity score badge (see §7.1)
- Two badge labels must never show the same text simultaneously (TRADE_READY disambiguation)
- "Passport Foundation" section title → "Maturity & Trust Score"
- Add: seller-facing CTA per maturity tier

**Files:** `components/Tenant/DPPPassport.tsx` only  
**Dependencies:** This design artifact (§7.1, §7.2, §8 UX rules)  
**Schema/API change:** None — pure UI label map  
**Risk:** Low — no data or route changes; test suite covers badge `data-testid` attributes  
**Verification:** Existing test suite must still pass; visual review of badge labels

---

### Slice B — Passport Ladder UI

**Goal:** Add the Bronze/Silver/Gold/Platinum progression ladder to the seller DPP view.

**What changes:**
- Maturity score section showing current tier + tier requirements
- Per-tier "what's missing" summary
- Next-step CTA per tier
- Progressive disclosure — hide export/global fields from L1/L2 sellers

**Files:** `components/Tenant/DPPPassport.tsx` (primarily); possibly new sub-component  
**Dependencies:** Slice A complete  
**Schema/API change:** None — all data already returned by existing routes  
**Risk:** Medium — render logic complexity; must preserve existing `data-testid` attributes

---

### Slice C — Status Transition API

**Goal:** Implement governed status transition endpoint.

**What changes:**
- `PATCH /api/tenant/dpp/:nodeId/passport/status` in `server/src/routes/tenant.ts`
- Evidence gate checks per target status
- `public_token` UUID assignment at PUBLISH
- Audit log: `tenant.dpp.passport.status_changed`
- Role guard: ADMIN-only for PUBLISHED; MEMBER allowed for DRAFT → INTERNAL

**Files:** `server/src/routes/tenant.ts`, `server/src/__tests__/tecs-dpp-status-transition.test.ts` (new)  
**Dependencies:** This design (§8 status transition design)  
**Schema/API change:** None for schema; new route only  
**Risk:** High — modifies PUBLISHED state which gates public passport access; requires careful RLS review

---

### Slice D — GLOBAL_DPP Reachability

**Goal:** Make `GLOBAL_DPP` maturity achievable.

**What changes:**
- `computeDppMaturity` in `tenant.ts` updated per §9 design
- `computeDppMaturityPublic` in `public.ts` updated to match
- New input: `activeCertsWithValidExpiry` from `dpp_snapshot_certifications_v1`
- `COMPLIANCE` maturity also defined with explicit threshold
- Test cases for GLOBAL_DPP reachable + regression suite per criterion
- Test case: GLOBAL_DPP unreachable when any single criterion fails

**Files:** `server/src/routes/tenant.ts`, `server/src/routes/public.ts`, test files  
**Dependencies:** Slice C (PUBLISHED status required for GLOBAL_DPP)  
**Schema/API change:** No schema change; `computeDppMaturity` signature expands  
**Risk:** Medium — changes core business logic; extensive test coverage required

---

### Slice E — Public Buyer Page

**Goal:** Add a rendered buyer-facing public passport page.

**What changes:**
- Frontend route `/passport/:publicPassportId`
- New component `components/Public/PublicPassport.tsx`
- Fetches from `GET /api/public/dpp/:publicPassportId`
- Displays product-grade maturity badge, cert count, lineage depth, QR URL display
- No auth, no `org_id` in response, no internal UUIDs visible

**Files:** `components/Public/PublicPassport.tsx` (new), `App.tsx` (route binding)  
**Dependencies:** Slice A (product-grade labels for display)  
**Schema/API change:** None — uses existing public route  
**Risk:** Medium — new public surface; must be carefully privacy-audited

---

### Slice F — QR / Machine-Readable Enhancement

**Goal:** Add QR image or printable label capability.

**What changes (options, not finalized):**
- Option 1: Client-side QR generation (`qrcode` package or similar) in `PublicPassport.tsx` or `DPPPassport.tsx`
- Option 2: Server-side QR endpoint `GET /api/public/dpp/:publicPassportId/qr` returning `image/png`
- QR payload URL: `${APP_PUBLIC_URL}/passport/:publicPassportId` (buyer page URL, not API endpoint)

**Constraint:** Must NOT use `.json` suffix pattern. Safe URL patterns only.

**Files:** Depends on option chosen  
**Dependencies:** Slice E (buyer page must exist before QR links to it)  
**Schema/API change:** No schema change; new route if Option 2  
**Risk:** Low-Medium — QR generation is isolated; test coverage via payload URL verification

---

### Slice G — AI Passport Assistant

**Goal:** Add AI-driven passport completeness guidance.

**What changes:**
- Missing data analysis per tier (what fields are empty or low confidence)
- Certificate expiry warning (passive — alert when within 30/60 days of `expiry_date`)
- Buyer-specific readiness (e.g., "This product is ready for EU buyer segment X")
- Local/export context-specific recommendations

**Files:** New service or hook; surface in `DPPPassport.tsx`  
**Dependencies:** Slice B (ladder UI); Slice D (GLOBAL_DPP reachable)  
**Schema/API change:** Likely new AI reasoning endpoint or extended passport endpoint  
**Risk:** Medium — AI output must go through `humanReviewRequired` gate; no AI-only state changes permitted

---

## 16. Verification Strategy for Future Slices

Each future slice must include:

1. **Static source tests** (pattern: grep/regex on source files — no DB required)
   - Route declaration present
   - Label lookup table covers all enum values
   - No raw code badges exposed in render
   - No cross-tenant query paths

2. **Unit tests** (Vitest)
   - `computeDppMaturity` with all combinations (per-criterion regression)
   - Status transition: all forward moves; all illegal moves; evidence gate enforcement
   - Label map: all maturity + status codes have distinct, non-colliding labels

3. **Integration tests** (DB-gated, `hasDb`)
   - Status transition round-trip: DRAFT → INTERNAL → TRADE_READY → PUBLISHED
   - Public route: PUBLISHED passport accessible; non-PUBLISHED returns 404
   - GLOBAL_DPP reachability: fixture satisfying all criteria → Platinum badge

4. **Privacy/security audit**
   - Public route response: confirm `org_id`, `nodeId`, pricing, buyer data are absent
   - Cross-tenant: confirm 404 for another tenant's `publicPassportId`
   - Reviewer identity: confirm `reviewed_by_user_id` not in public response

5. **UX review gate (before any label-changing slice ships)**
   - No two badges show the same text (TRADE_READY disambiguation)
   - MSME-safe: no EU regulation language visible to L1 sellers
   - CTA visible and correct per tier

---

## 17. Open Questions / Decision Gates

| ID | Question | Needed before | Paresh decision required |
|---|---|---|---|
| Q-01 | Should `passportStatus = TRADE_READY` be renamed internally to `BUYER_APPROVED` or `VERIFIED` to avoid the TRADE_READY name collision, or is UI disambiguation sufficient? | Slice A | Yes — naming change would require migration |
| Q-02 | Should the public buyer page URL be `/passport/:publicPassportId` or `/p/:publicPassportId` (shorter, QR-friendly)? | Slice E | Yes — URL is a public contract |
| Q-03 | What is the exact `approvedCertCount` threshold for COMPLIANCE (Gold) and GLOBAL_DPP (Platinum)? Is it 2 and 3 respectively, or higher? | Slice D | Yes — defines Platinum gate |
| Q-04 | Are carbon/water/chemical data fields required for Platinum in v1, or future-gated? If required: what schema additions are needed? | Slice D | Yes — may require new schema |
| Q-05 | When a PUBLISHED passport is revoked and later re-published, should the `public_token` UUID be preserved (same public URL) or rotated (new URL, old URL becomes 404)? | Slice C | Yes — affects QR permanence |
| Q-06 | Should there be a passport-level `expires_at` field (e.g., annual review requirement)? Or does cert expiry propagating to maturity downgrade suffice? | Slice D | Yes — if yes, new schema migration required |
| Q-07 | Is PUBLISHED → TRADE_READY (step-back without full revoke) a required capability, or is PUBLISHED → DRAFT (full revoke) sufficient? | Slice C | Yes |
| Q-08 | Should WL tenants be able to configure their own DPP/passport label (e.g., "ABC Corp Supply Profile")? If yes, which schema table holds the config? | WL naming slice | Yes |
| Q-09 | Should `aiExtractedClaimsCount` in the public route be unblocked now (fix RLS/GUC key) or deferred to a future D-4 RLS fix slice? | Slice D (Platinum requires claims) | Yes — unblocking is a separate unit |
| Q-10 | Should `computeDppMaturityPublic` (public.ts) remain a simplified mirror of `computeDppMaturity` (tenant.ts), or should they share a single exported pure function from a shared utility module? | Slice D | Architecture decision — low stakes; shared function preferred |

---

## 18. Adjacent Findings Kept Out of Scope

The following findings were identified in prior repo-truth audit (TECS-DPP-PASSPORT-NETWORK-001) and remain out of scope for this design unit. They are recorded here for traceability.

| Finding | Risk | Proposed future unit |
|---|---|---|
| `GLOBAL_DPP` maturity unreachable in current `computeDppMaturity` | Medium — design confuses devs; Platinum never visible | Slice D |
| `aiExtractedClaimsCount = 0` in public route due to RLS/GUC key mismatch (`app.current_org_id` vs `app.org_id`) | Low (returns 0 not incorrect data; non-blocking for current scope) | Separate DPP-RLS-fix unit |
| `approved_by NOT NULL + ON DELETE SET NULL` latent inconsistency in `DppEvidenceClaim` | Low (user deletion would fail with FK violation, not silently) | Separate migration unit |
| Duplicate `DppMaturityLevel` / `D6MaturityLevel` type definitions across three files | Low (TypeScript structural typing; no runtime risk) | Slice D (consolidate during `computeDppMaturity` refactor) |
| No Playwright/E2E DPP coverage | Medium (no E2E smoke for DPP flows) | Add to DPP QA matrix slice |
| No buyer-facing public UI | High (machine-readable JSON only; QR unusable by non-developer) | Slice E |
| No QR image generation | Medium (URL descriptor only) | Slice F |
| No status transition API | High (currently no governed way to publish passports) | Slice C |
| Raw UI maturity/status labels not MSME-friendly | High (confusing to non-technical sellers) | Slice A |
| `TRADE_READY` dual semantic ambiguity (status vs maturity) | High (same badge text for two different meanings) | Slice A |
| `if (jsonRoute)` dead-code branch in `handlePublicDppRead()` | Low (dead code only; no runtime risk) | Clean up in Slice F or standalone |
| Rate limiting absent on public passport route | Medium (unauthenticated route open to enumeration at scale) | Infrastructure / security slice before GA |

---

## Appendix A: Naming Surface Summary

| Context | Name to use |
|---|---|
| Platform brand / product family | TexQtic DPP Passport Network |
| L1 seller-facing label | Product Trust Profile / Verified Product Profile |
| L1 buyer-facing label | Verified Local |
| L2 seller-facing label | Trade Ready Passport |
| L2 buyer-facing label | Verified Trade-Ready Supplier |
| L3 seller-facing label | Certified Passport |
| L3 buyer-facing label | Certified — Buyer Ready |
| L4 seller-facing label | Global DPP Passport |
| L4 buyer-facing label | Verified Supply Chain Passport |
| Badge scores | Bronze / Silver / Gold / Platinum |
| Status badges (UI) | In Progress / In Review / Trade Access / Published — Public |
| Internal DB views | dpp_snapshot_products_v1 (preserve — do not rename) |
| Internal code types | DppMaturityLevel / DppPassportStatus (preserve) |
| White-label default | Verified Supply Chain Passport |
| Developer / API | DPP, passport, maturity (existing code names) |

---

*Design unit TECS-DPP-PASSPORT-NETWORK-002 — DESIGN_COMPLETE. Do not implement. Awaiting Paresh authorization for first implementation slice.*
