# TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 — AI Supplier Matching MVP Design v1

**Unit ID:** TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001  
**Title:** AI Supplier Matching MVP — Aggregated Buyer-to-Supplier Recommendation Layer  
**Mode:** DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED  
**Status:** DESIGN_DRAFT  
**Design date:** 2026-04-28  
**Governance unit type:** AI-Assisted Marketplace Intelligence  
**Authorized by:** Paresh (design-only authorization — implementation NOT opened)

**Predecessor units:**
- TECS-B2B-BUYER-CATALOG-PDP-001 — VERIFIED_COMPLETE
- TECS-DPP-PASSPORT-FOUNDATION-001 — VERIFIED_COMPLETE
- TECS-B2B-BUYER-PRICE-DISCLOSURE-001 — VERIFIED_COMPLETE
- TECS-B2B-BUYER-RFQ-INTEGRATION-001 — VERIFIED_COMPLETE
- TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — VERIFIED_COMPLETE
- TECS-RUNTIME-VERIFICATION-DRIFT-REMEDIATION-2026-04-28 — complete, commit `bad71fa`

**AI Foundation:** TECS-AI-FOUNDATION-DATA-CONTRACTS-001 — IMPLEMENTATION_COMPLETE (commit `f671995`)

> **Design-only document.** No backend code, frontend UI, API route handlers,
> AI inference code, embeddings, vector indexes, ranking logic, schema changes,
> Prisma migrations, prompt chains, model calls, data pipelines, recommendation APIs,
> or runtime behavior are included in this artifact.
> Each implementation slice requires explicit authorization before opening.

---

## Index

- [1. Problem Statement](#1-problem-statement)
- [2. Business Rationale](#2-business-rationale)
- [3. Current System Assumptions](#3-current-system-assumptions)
- [4. Non-Goals](#4-non-goals)
- [5. Matching Inputs — Safe Signals Only](#5-matching-inputs--safe-signals-only)
- [6. Forbidden Matching Inputs](#6-forbidden-matching-inputs)
- [7. Matching Output Model](#7-matching-output-model)
- [8. Relationship-Aware Matching](#8-relationship-aware-matching)
- [9. Catalog/PDP Integration Boundary](#9-catalogpdp-integration-boundary)
- [10. RFQ Integration Boundary](#10-rfq-integration-boundary)
- [11. DPP / Compliance Boundary](#11-dpp--compliance-boundary)
- [12. Tenant Isolation Requirements](#12-tenant-isolation-requirements)
- [13. Anti-Leakage Requirements](#13-anti-leakage-requirements)
- [14. AI Governance Requirements](#14-ai-governance-requirements)
- [15. Data / Contract Planning — Conceptual Only](#15-data--contract-planning--conceptual-only)
- [16. Backend Design Considerations](#16-backend-design-considerations)
- [17. Frontend Design Considerations](#17-frontend-design-considerations)
- [18. Performance / Scaling Considerations](#18-performance--scaling-considerations)
- [19. Runtime Verification Requirements for Future Implementation](#19-runtime-verification-requirements-for-future-implementation)
- [20. Security / Abuse Cases](#20-security--abuse-cases)
- [21. Migration Considerations](#21-migration-considerations)
- [22. Test Strategy for Future Implementation](#22-test-strategy-for-future-implementation)
- [23. Runtime Verification Plan for Future Implementation](#23-runtime-verification-plan-for-future-implementation)
- [24. Open Questions](#24-open-questions)
- [25. Recommended Implementation Slices](#25-recommended-implementation-slices)
- [26. Completion Checklist](#26-completion-checklist)

---

## 1. Problem Statement

The foundational buyer journey is now operational: catalog browsing, PDP, price disclosure,
RFQ deep integration, buyer-supplier relationship access, and DPP/compliance foundations
are all verified complete. However, the platform does not yet offer intelligent supplier
discovery to buyers.

In the textile B2B supply chain, supplier discovery is inherently difficult:

- **Fragmented supply chain.** The textile supply chain spans fiber, yarn, fabric (woven,
  knit, processed), garments, accessories/trim, chemicals/auxiliaries, machines, packaging,
  services, and SaaS — each with specialist suppliers operating with different minimum
  order quantities (MOQ), certifications, geographic constraints, and capacity windows.

- **Category and material complexity.** A buyer searching for certified woven fabric at
  130 gsm in a specific color range must manually search and evaluate multiple suppliers,
  many of whom may not fully expose their capabilities in catalog metadata.

- **Qualification overhead.** Buyers spend significant time evaluating supplier fit for
  MOQ, certification coverage, geography, and relationship compatibility before issuing
  a credible RFQ.

- **Relationship-gated visibility.** Supplier catalogs may require a pre-approved
  relationship before price or full product details are visible, creating a chicken-and-egg
  problem for buyers who cannot identify the right supplier to request access from.

- **Low RFQ quality.** Without matching, buyers often submit RFQs to misaligned suppliers,
  lowering conversion rates and increasing supplier noise burden.

- **Missed discovery.** Relevant suppliers may exist on the platform but be invisible to
  the buyer due to search friction, category inconsistency, or metadata gaps.

An AI-assisted supplier matching layer addresses these problems by using approved marketplace
signals to surface credible supplier candidates for a buyer's query or RFQ intent — without
bypassing any access control, relationship gate, price disclosure rule, or tenant isolation
boundary.

---

## 2. Business Rationale

AI supplier matching is a strategic marketplace moat for TexQtic:

- **Better buyer conversion.** Buyers who find relevant suppliers faster complete more
  relationship requests and issue higher-quality RFQs, increasing platform GMV.

- **Higher-quality RFQs.** Matching buyers to suppliers with demonstrated capability fit
  reduces misaligned RFQ volume and increases supplier conversion rates.

- **Supplier lead quality.** Suppliers receive RFQs from more qualified, better-matched
  buyers, improving supplier platform satisfaction and retention.

- **Marketplace liquidity.** Increasing the throughput of buyer-supplier introductions
  accelerates marketplace liquidity and network effects on both sides.

- **Relationship-aware trust layer.** By respecting relationship access status in
  recommendations, the system reinforces the trust and qualification framework that
  makes TexQtic a credible B2B environment rather than an open commodity listing.

- **Future monetization potential.** Supplier matching creates natural monetization
  surfaces (priority placement, featured match, sponsored match) that can be layered
  as the platform matures — with all such surfaces subject to explicit product approval.

- **Improved retention for both sides.** Suppliers who receive well-matched inquiries
  are more likely to maintain active catalogs. Buyers who find relevant suppliers
  quickly are more likely to return for future procurement cycles.

- **Data moat.** Aggregated matching signals (category fit, material fit, RFQ success
  rates) become increasingly proprietary and hard to replicate as the platform scales,
  creating a durable competitive advantage.

---

## 3. Current System Assumptions

This design is anchored to the following confirmed repo-truth posture at design date:

| Assumption | Source / Status |
|---|---|
| Buyer catalog browsing and PDP operational | TECS-B2B-BUYER-CATALOG-PDP-001 — VERIFIED_COMPLETE |
| Price disclosure flow operational | TECS-B2B-BUYER-PRICE-DISCLOSURE-001 — VERIFIED_COMPLETE |
| RFQ deep integration operational | TECS-B2B-BUYER-RFQ-INTEGRATION-001 — VERIFIED_COMPLETE |
| Buyer-supplier relationship access layer operational | TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 — VERIFIED_COMPLETE |
| DPP/compliance foundation operational | TECS-DPP-PASSPORT-FOUNDATION-001 — VERIFIED_COMPLETE |
| AI foundation layer operational | TECS-AI-FOUNDATION-DATA-CONTRACTS-001 — IMPLEMENTATION_COMPLETE |
| Tenant isolation via `org_id` / `app.org_id` GUC is constitutional | `rls-policy.md`; all commerce tables FORCE RLS |
| `DocumentEmbedding` table exists, orgId-scoped, 768-dim, FORCE RLS | `schema.prisma`; ADR-028 |
| `ReasoningLog` + `AuditLog` tables exist for AI audit backbone | `schema.prisma` |
| AI embedding model: `text-embedding-004` (768-dim LOCKED) | `vectorEmbeddingClient.ts` |
| AI inference model: `gemini-1.5-flash` | `inferenceService.ts` |
| `price` and `publicationPosture` excluded from vector text | `tenant.ts` `buildCatalogItemVectorText()` |
| `risk_score` excluded from all tenant AI context packs | TECS-AI-FOUNDATION-DATA-CONTRACTS-001 §B |
| Rate limit: 60 req/min per tenant; idempotency window: 24h | `inferenceService.ts` |
| PII guard in place: deterministic regex-based, pre-send + post-receive | `piiGuard.ts` |
| Relationship states include: `APPROVED`, `PENDING`, `REJECTED`, `BLOCKED`, `SUSPENDED` | relationship access layer |
| Supplier catalog items have `active` boolean; inactive items are not buyer-visible | `schema.prisma` |
| Catalog stage taxonomy: 14 values (`YARN`, `FIBER`, `FABRIC_WOVEN`, etc.) | `schema.prisma` |
| AI matching must NOT bypass relationship, catalog, price-disclosure, or RFQ gates | Constitutional — this document |
| No public AI confidence scores or ranking scores may be exposed | Constitutional — this document |
| Runtime drift remediation complete; all future UI/runtime units require Playwright closure | commit `bad71fa` |

---

## 4. Non-Goals

The following are explicitly outside the scope of this unit and any implementation slice
derived from it, unless separately authorized:

- Implementation of any backend code
- AI model calls, prompt chains, or inference invocations
- Vector indexing or embedding generation for supplier matching
- Ranking algorithm implementation
- Supplier scoring or buyer scoring implementation
- Frontend recommendation UI implementation
- Schema changes to any Prisma model
- Database migrations
- Automated supplier approval or rejection
- Automated RFQ creation or submission
- Supplier notification before explicit buyer action
- Payment, escrow, or credit logic of any kind
- DPP auto-publication or status promotion
- Relationship access bypass or relaxation of any existing gate
- Exposing AI confidence scores, ranking scores, or model probabilities to buyers or suppliers
- Exposing relationship graph or blocked/rejected states to any party
- Cross-tenant data access or cross-tenant recommendations
- Competitor inference or competitive intelligence surfaces
- Market intelligence or pricing benchmark features
- Trust score computation or exposure
- Any commercial monetization layer (featured placement, sponsored match) in MVP

---

## 5. Matching Inputs — Safe Signals Only

The AI supplier matching layer is permitted to use only the following signals as inputs
to its matching and recommendation logic:

| Signal | Type | Notes |
|---|---|---|
| Product category | Catalog metadata | `productCategory` field; buyer-visible |
| Catalog stage | Taxonomy value | 14-value `catalogStage` enum; buyer-visible |
| Material / fabric / yarn / garment type | Catalog metadata | `material`, `composition`, `fabricType`, `catalogStage` |
| GSM / weight attributes | Stage attributes | `gsm` and other `stageAttributes` JSONB values if published |
| Supplier capabilities (published) | Org segment keys | `primary_segment_key`, `OrganizationSecondarySegment`, `OrganizationRolePosition` |
| Published catalog item metadata | Catalog item fields | Excluding `price`, `publicationPosture`, `costPrice`, hidden attributes |
| Published compliance/certification references | Catalog `certifications` JSONB | Published cert references only |
| DPP/passport metadata | Published DPP only | Only if public state is confirmed; no draft evidence |
| Buyer RFQ intent | RFQ structured fields | Material, category, quantity, target delivery date |
| Buyer quantity / MOQ needs | RFQ or catalog | `moq` from catalog item; requested quantity from RFQ |
| Geography / region preference | Org jurisdiction | If already exposed in published org profile |
| Relationship-approved supplier status | Relationship layer output | APPROVED suppliers may be prioritized (see §8) |
| Supplier availability / active state | Catalog `active` flag | Only active, published items qualify as signal sources |
| Price-disclosure metadata | Disclosed tier or price range only | Actual hidden price NEVER used; only tier presence or absence |
| Historical successful RFQ outcomes (aggregated) | Aggregate stats only | Must be privacy-safe, aggregated across org cohort, not individually attributable |

All signals must be validated through the `SupplierMatchPolicyFilter` before use.
Signals that cannot be confirmed as safe and published must be excluded.

---

## 6. Forbidden Matching Inputs

The following data fields and sources are constitutionally forbidden from use as
matching inputs in any implementation slice derived from this unit:

| Forbidden Input | Reason |
|---|---|
| Hidden prices / cost price | Price disclosure is buyer-controlled and relationship-gated |
| Supplier internal margins | Commercially sensitive; never exposed |
| Negotiated prices | Relationship-specific; not for aggregation |
| Internal supplier policy documents | Private supplier configuration |
| Allowlist graph (internal) | Internal access-control graph; must not leak structure |
| Relationship graph (full) | Relationship states must not be enumerable by AI |
| Blocked/rejected relationship reasons | Sensitive rejection rationale |
| Audit log metadata | Internal governance; not an AI signal source |
| Buyer/supplier private notes | Internal notes not for AI consumption |
| AI draft extraction data | AI draft fields are not verified facts; no buyer-visible usage |
| Unpublished DPP evidence or draft passport | Not yet human-reviewed; must not influence buyer-visible surfaces |
| `risk_score` | Control-plane only; constitutionally excluded from all tenant AI |
| `publicationPosture` | Internal publication control field; must never reach AI context |
| `buyerScore` / `supplierScore` exposed to users | Trust scores are internal-only |
| Payment / credit / escrow data | Finance data must not feed matching signals |
| Session tokens / auth secrets | Never used as signals |
| Cross-tenant supplier data | Tenant isolation is constitutional |
| Rejected/blocked suppliers (exposed to buyer) | Must be excluded silently — no leakage of reason |
| Competitor-identifiable pricing inference | Prohibited scraping/enumeration vector |

---

## 7. Matching Output Model

### 7.1 Conceptual Outputs

The matching system must produce only the following outputs:

| Output | Description |
|---|---|
| Recommended supplier candidates | A ranked (internal-only) list of supplier org candidates |
| Reason labels (safe facts only) | Human-readable labels derived only from safe signals |
| Match categories | e.g., `MATERIAL_FIT`, `CATEGORY_FIT`, `COMPLIANCE_FIT`, `RFQ_FIT`, `GEOGRAPHY_FIT` |
| Confidence bucket (internal-only) | `HIGH` / `MEDIUM` / `LOW` — never exposed to users as a score |
| Explanation text (policy-filtered) | Short natural-language explanation per candidate; no sensitive leakage |
| Fallback response | Structured "no safe candidates" response when match set is empty |

### 7.2 Output Constraints

The matching output must NOT expose:

- Numerical ranking scores or model confidence values to any user-facing surface
- Supplier internal metadata not in the safe signal set
- Relationship graph structure, relationship state, or blocked/rejected status
- Hidden product catalogs or product counts not visible to the buyer
- Competitor inference or price comparison hints
- Any field sourced from forbidden matching inputs (§6)
- AI model output verbatim without policy-layer filtering

### 7.3 Explanation Safety Rule

All buyer-facing explanation text must be generated from safe-signal labels only and
passed through the `SupplierMatchExplanationBuilder` + `SupplierMatchPolicyFilter` before
any user-facing write. Explanations must never reference:
- relationship state or access status
- price tiers or cost context
- DPP draft state or incomplete attestation
- Risk score or publication posture

---

## 8. Relationship-Aware Matching

The matching system must respect the buyer-supplier relationship access layer at all times:

| Rule | Behavior |
|---|---|
| `APPROVED` relationship suppliers | May be prioritized in ranking; explicit in recommendation label as "Connected supplier" if safe |
| `BLOCKED` / `SUSPENDED` suppliers | Must be excluded from all recommendations; exclusion is silent |
| `REJECTED` relationship suppliers | Must be excluded; reason must not be revealed |
| `PENDING` relationship suppliers | May be included as candidates; CTA should be "Request access" or equivalent |
| Relationship-required catalog items | Must not appear in recommendations for unapproved buyers |
| Relationship-only prices | Must not influence buyer-visible recommendation copy or label text |
| Relationship status leakage | Explanation text must not reveal why a supplier does or does not appear |
| Approved-only product discovery | Recommendations must not reveal the existence of hidden/approved-only products |

### 8.1 Relationship Gate Enforcement

When generating a candidate set, the `SupplierMatchPolicyFilter` must:
1. Retrieve the buyer's current relationship states with all candidate suppliers.
2. Hard-exclude any supplier in `BLOCKED`, `SUSPENDED`, or `REJECTED` state.
3. Mark `APPROVED` relationship suppliers for optional prioritization.
4. For `PENDING` and unknown suppliers, include only if catalog metadata is safely visible
   to the buyer without relationship gate.

This gate must be re-evaluated on each request. No stale relationship state may be cached
beyond a defined TTL (to be specified at implementation time).

---

## 9. Catalog/PDP Integration Boundary

This section defines how AI supplier matching may integrate with catalog and PDP surfaces
at implementation time. **No UI implementation is authorized in this unit.**

| Integration Point | Description |
|---|---|
| PDP "Recommended suppliers" widget | Future: display top-N matched suppliers on a catalog item's PDP |
| Category/material "Similar suppliers" | Future: surface alternative or related suppliers for a given material/stage category |
| Fallback empty state | "No matched suppliers" with "Request access" or "Request quote" CTA |
| Hidden catalog exclusion | Recommendations must never reveal product counts or product details not visible to the buyer |
| No product count leakage | Recommendation payload must not expose how many products a supplier has hidden |
| No search result leakage | Recommendation list must not be used to infer broader catalog topology |

The PDP integration must be implemented only after this design is authorized for a
frontend slice and after backend matching is verified safe.

---

## 10. RFQ Integration Boundary

This section defines how AI supplier matching may integrate with the RFQ flow.
**No RFQ code changes are authorized in this unit.**

| Rule | Description |
|---|---|
| Suggest suppliers for an open RFQ | Future: recommend suppliers matching the RFQ's material, category, and quantity intent |
| Relationship gates apply | All relationship rules from §8 apply to RFQ-context recommendations |
| RFQ submit remains explicit buyer action | Recommendations do not auto-submit an RFQ to any supplier |
| No automatic RFQ creation | Matching output must never trigger RFQ row creation |
| No supplier notification before explicit submit | Supplier must not be informed of an RFQ until buyer explicitly submits |
| No AI auto-submit | AI must not submit or pre-fill a submitted state on behalf of the buyer |
| Matching context from RFQ fields | Safe RFQ fields (material, category, quantity, delivery region) may feed the signal builder |

---

## 11. DPP / Compliance Boundary

| Rule | Description |
|---|---|
| Published DPP metadata is a safe signal | If a passport is in confirmed public state, published cert references may be used |
| Unpublished evidence is forbidden | Draft DPP evidence, incomplete attestation, and unreviewed uploads may not feed matching |
| AI draft extraction is forbidden on buyer surfaces | DPP AI draft fields are not verified facts; must not influence buyer-visible recommendation copy |
| Human review remains required | No DPP signal may be used in buyer-visible recommendations unless human-reviewed publication occurred |
| No passport status promotion | Recommendations must not imply compliance standing beyond what is formally published |
| Certification labels in match explanations | Only formal cert references from published items may be cited; no inferred compliance |

---

## 12. Tenant Isolation Requirements

Tenant isolation is constitutional in TexQtic. The matching layer must enforce:

| Rule | Requirement |
|---|---|
| Buyer org scoping | All matching inputs must be scoped to the requesting buyer's `org_id` |
| No cross-buyer signal leakage | Buyer A's RFQ history, preferences, or search patterns must not influence Buyer B's results |
| Supplier org scoping | Supplier private data is accessible only within that supplier's `org_id` context |
| No cross-supplier signal leakage | Supplier A's private catalog, pricing, or margin data must not influence Supplier B's match rank |
| Recommendations scoped to buyer's authorized view | Only suppliers visible to this buyer under their relationship/catalog access state appear |
| No cross-tenant recommendations | A recommendation may never surface a supplier not accessible to the buyer's org |
| No relationship graph leakage | The full buyer-supplier relationship graph must not be enumerable via recommendation outputs |
| No allowlist graph leakage | Internal allowlist configurations must not be inferable from recommendation patterns |
| RLS enforcement | All DB queries in the matching pipeline must respect `app.org_id` GUC and FORCE RLS |
| Cache isolation | Per-tenant matching caches must be keyed by `org_id` minimum; cross-tenant cache reads are forbidden |

---

## 13. Anti-Leakage Requirements

The matching system must implement safeguards across all data paths:

| Surface | Safeguard |
|---|---|
| Recommendation API response payload | Policy-filtered through `SupplierMatchPolicyFilter` before write |
| Explanation text | `SupplierMatchExplanationBuilder` must strip any forbidden field reference |
| Server logs | No supplier metadata, buyer intent text, or relationship state in structured log fields |
| Embeddings / vector store | Vectors must be keyed by `org_id`; FORCE RLS on `DocumentEmbedding`; no cross-tenant read |
| Cached recommendation results | Must be keyed by `org_id` + query hash; TTL required; invalidated on catalog/relationship change |
| Analytics / telemetry | Aggregate-only; no raw buyer query text, no supplier identity in plain telemetry payloads |
| AI model prompts | Must pass through PII guard (`piiGuard.ts`) and forbidden-field strip before prompt construction |
| Production telemetry | Structured log fields must be redacted for sensitive values |
| Playwright traces / screenshots | QA automation artifacts must not contain recommendation payloads with supplier identifiers in assertions |
| `ReasoningLog` entries | Must be tenant-scoped (`org_id`); no cross-tenant reasoning log read |
| `SupplierMatchAuditEnvelope` | Audit entries must capture signal source labels only, not raw data values for forbidden fields |

---

## 14. AI Governance Requirements

| Requirement | Detail |
|---|---|
| Deterministic guardrails | AI model output must be passed through a `SupplierMatchRuntimeGuard` before use |
| No autonomous commercial decisions | Matching must only suggest; buyer action is always required |
| Human review for sensitive recommendations | If a recommendation surfaces near a relationship-gated supplier, human review flag may be required |
| Auditability of signal sources | `SupplierMatchAuditEnvelope` must record which safe signals contributed to each candidate |
| No black-box approval/rejection | Any recommendation exclusion must have a documented policy reason in the runtime guard output |
| No AI confidence scores shown publicly | Confidence buckets are internal-only; buyer-visible output contains only explanation labels |
| Ranking not presented as objective truth | Recommendation copy must use language like "potentially relevant" or "matched for this category" |
| Model output filtered through policy layer | Raw model output is never user-facing; `SupplierMatchRuntimeGuard` applies all filters |
| Fallback when model fails | If AI model call fails or returns unsafe output, the system must return a deterministic fallback (empty or top-N catalog-only match) rather than surfacing raw model output |
| Prompt injection defense | Buyer input used in prompt construction must be sanitized; length-bounded; no instruction-style tokens |
| Model/provider governance | AI provider choice is subject to existing TexQtic AI governance; no provider change without authorization |

---

## 15. Data / Contract Planning — Conceptual Only

> **DESIGN-ONLY.** The following interfaces are planning-level TypeScript sketches.
> They do not constitute implementation. No file may be created, no schema may be
> modified, and no API contract may be registered from this section without explicit
> implementation slice authorization.

```typescript
// DESIGN-ONLY — NOT IMPLEMENTED

/**
 * A single supplier candidate returned by the matching system.
 * Buyer-visible fields only. Internal rank/score not included.
 */
interface SupplierMatchCandidate {
  supplierOrgId: string;
  supplierDisplayName: string;          // published org name only
  matchCategories: SupplierMatchCategory[];
  explanation: SupplierMatchExplanation;
  relationshipCta: 'VIEW_CATALOG' | 'REQUEST_ACCESS' | 'REQUEST_QUOTE' | 'CONNECTED';
  // NB: No rank, no score, no confidence value exposed to buyer
}

/**
 * Buyer-initiated matching request from the tenant plane.
 * orgId must be derived from JWT — never from request body.
 */
interface BuyerSupplierMatchRequest {
  buyerOrgId: string;                   // from JWT only
  catalogStage?: CatalogStage;
  productCategory?: string;
  material?: string;
  rfqId?: string;                       // optional: enrich from open RFQ
  geographyPreference?: string;         // optional: from org jurisdiction safe field
  moqRequirement?: number;
  maxCandidates?: number;               // default: 5, max: 20
}

/**
 * A single safe signal extracted from the buyer's authorized view.
 */
interface SupplierMatchSignal {
  signalType: 'CATALOG_STAGE' | 'PRODUCT_CATEGORY' | 'MATERIAL' | 'CERTIFICATION'
             | 'GEOGRAPHY' | 'MOQ' | 'RFQ_INTENT' | 'RELATIONSHIP_APPROVED';
  value: string;
  sourceEntity: 'CATALOG_ITEM' | 'RFQ' | 'ORG_PROFILE' | 'DPP_PUBLISHED';
  isSafe: boolean;                      // must be true before use in matching
}

/**
 * Policy-filtered explanation for a single match candidate.
 * Only safe-signal-derived labels. No sensitive field references.
 */
interface SupplierMatchExplanation {
  primaryLabel: string;                 // e.g., "Matches fabric woven category"
  supportingLabels: string[];           // e.g., ["Certified supplier", "MOQ compatible"]
  // NB: No relationship state, no hidden price, no internal score in labels
}

/**
 * Policy context used by SupplierMatchPolicyFilter to evaluate candidate safety.
 */
interface SupplierMatchPolicyContext {
  buyerOrgId: string;
  relationshipStateBySupplierOrgId: Record<string, RelationshipState>;
  hiddenCatalogOrgIds: Set<string>;     // suppliers whose catalog is gated for this buyer
  forbiddenSupplierOrgIds: Set<string>; // BLOCKED + SUSPENDED; hard-excluded
  activeCatalogStages: Set<CatalogStage>;
}

/**
 * Top-level result returned by the matching service.
 */
interface SupplierMatchResult {
  buyerOrgId: string;
  requestId: string;                    // idempotency key
  candidates: SupplierMatchCandidate[];
  fallback: boolean;                    // true if deterministic fallback was used
  auditEnvelopeId: string;
}

/**
 * Audit record for a single matching invocation.
 * Records signal labels only — not raw data values for forbidden fields.
 */
interface SupplierMatchAuditEnvelope {
  id: string;
  buyerOrgId: string;
  requestedAt: Date;
  signalsUsed: Array<{ signalType: string; sourceEntity: string }>;
  candidateCount: number;
  policyViolationsBlocked: number;
  modelCallMade: boolean;
  fallbackUsed: boolean;
  // NB: No raw buyer query, no supplier score, no hidden price reference
}

/**
 * Result of the runtime guard pass over model output.
 */
interface SupplierMatchRuntimeGuardResult {
  passed: boolean;
  blockedCandidateCount: number;
  blockReasons: string[];               // policy label only; no raw data
  sanitizedCandidates: SupplierMatchCandidate[];
}

type SupplierMatchCategory =
  | 'MATERIAL_FIT'
  | 'CATEGORY_FIT'
  | 'COMPLIANCE_FIT'
  | 'RFQ_FIT'
  | 'GEOGRAPHY_FIT'
  | 'MOQ_FIT'
  | 'RELATIONSHIP_APPROVED';

type RelationshipState =
  | 'APPROVED'
  | 'PENDING'
  | 'REJECTED'
  | 'BLOCKED'
  | 'SUSPENDED'
  | 'NONE';
```

---

## 16. Backend Design Considerations

> DESIGN-ONLY. No services may be created from this section without an authorized
> implementation slice.

| Service | Responsibility |
|---|---|
| `SupplierMatchSignalBuilder` | Extracts safe signals from the buyer's authorized view of catalog, RFQ, org profile, and DPP. Enforces safe-signal allowlist (§5). Strips all forbidden inputs (§6). |
| `SupplierMatchPolicyFilter` | Applies relationship gate (§8), hidden-catalog exclusion, forbidden-supplier exclusion, and DPP boundary (§11). Returns a policy-safe candidate set. |
| `SupplierMatchRanker` | Deterministic ranker for MVP (no model calls in Slice C). Applies category/material/compliance/RFQ-intent scoring using safe signals only. Produces internal confidence bucket. |
| `SupplierMatchExplanationBuilder` | Generates buyer-facing explanation labels from safe-signal match categories. Passes output through policy filter to strip any sensitive reference. |
| `SupplierMatchAuditService` | Writes a `SupplierMatchAuditEnvelope` for each invocation. Records signal labels, candidate count, and policy violations. Never records raw buyer query or supplier scores. |
| `SupplierMatchRuntimeGuard` | Validates model output (if AI model is used) against the full safe-signal + relationship + anti-leakage ruleset. Blocks unsafe candidates before result assembly. |
| Embedding / vector service (future boundary) | Optional future component for semantic signal enrichment. Constrained to existing `text-embedding-004` (768-dim locked) and `DocumentEmbedding` RLS boundary. Not authorized in MVP. |

### 16.1 Plane Boundary

The supplier matching route belongs to the **tenant plane** only:
- Route prefix: `POST /api/tenant/match/suppliers` (conceptual; not yet created)
- `orgId` derived from JWT exclusively — never from request body
- `tenantAuthMiddleware` + `databaseContextMiddleware` required
- No control-plane invocation of buyer matching

---

## 17. Frontend Design Considerations

> DESIGN-ONLY. No component files may be created or modified from this section
> without an authorized frontend implementation slice.

| Surface | Description |
|---|---|
| "Recommended suppliers" panel | Panel on PDP or catalog browse showing top matched suppliers |
| "Best suppliers for this RFQ" | Inline recommendation list within the RFQ compose flow |
| "Similar suppliers" | Alternative supplier suggestions for a category/material view |
| "Why this supplier?" explanation | Expandable explanation panel using safe match labels (§7.3) |
| Empty / fallback state | "No matched suppliers found" — with "Browse all suppliers" or "Request access" CTA |
| "Request access" CTA | For PENDING/NONE suppliers; links to relationship request flow |
| "Request quote" CTA | For APPROVED suppliers with active catalog items |
| Accessibility / localization | Match labels and explanation text must support i18n; no hardcoded English in product strings |
| No AI score exposure | No numerical score, probability, or confidence value may appear in any UI element |
| No relationship state disclosure | UI copy must not reveal why a supplier does or does not appear |

Frontend surfaces must belong to the correct plane boundaries:
- `Tenant/` components only for tenant-scoped recommendation surfaces
- `ControlPlane/` components must not contain buyer-facing recommendation surfaces
- Match explanation copy must not expose relationship graph, hidden prices, or internal scoring

---

## 18. Performance / Scaling Considerations

| Concern | Design Requirement |
|---|---|
| Matching latency | Target: < 300ms for deterministic MVP (no model call). Model-assisted path: < 2s with caching. |
| Recommendation cache | Results should be cached per (`buyerOrgId`, `signalHash`) with a defined TTL. |
| Cache invalidation | Cache must be invalidated when: supplier catalog changes, relationship state changes for the buyer, or DPP publication state changes. |
| Vector index freshness (future) | If embeddings are used, index freshness must be bounded by ingestion pipeline cadence; stale vectors must not serve recommendations past TTL. |
| Per-tenant isolation in cache/index | Cache keys must include `buyerOrgId`. Cross-tenant cache reads are forbidden. |
| Avoiding N+1 relationship checks | Relationship states for all candidate suppliers must be batch-fetched in a single query per matching invocation, not resolved per-candidate. |
| Production observability | Latency, cache hit rate, fallback rate, and policy-block count should be observable metrics — but must not include raw buyer query text, supplier names, or confidence values in metric labels. |
| Candidate set size | MVP maximum: 20 candidates before policy filtering. Post-filter result: 5 default, 20 max. |

---

## 19. Runtime Verification Requirements for Future Implementation

> **Hard gate:** Any implementation slice derived from this unit that touches UI,
> API routes, or runtime behavior must include Production Vercel Playwright
> verification against `https://app.texqtic.com` as a closure gate — not an
> optional follow-up.

All future implementation slices must include:

| Verification Step | Requirement |
|---|---|
| Backend tests | Vitest unit tests for signal builder, policy filter, and runtime guard |
| TypeScript coverage | Full TypeScript — no `any` casts, no `@ts-ignore` |
| Targeted lint | `pnpm --filter server lint` or equivalent targeted command |
| Production Vercel Playwright | Automated end-to-end verification at `https://app.texqtic.com` |
| Anti-leakage DOM/network checks | Network payload assertions that forbidden fields (hidden price, relationship state, score) do not appear in recommendation response |
| Console-error checks | No unhandled console errors during recommendation flow |
| Neighbor-path smoke checks | Any shared shell or route change must include smoke checks for adjacent paths |
| No closure without runtime evidence | No implementation slice is closed without pasted terminal and Playwright output |

---

## 20. Security / Abuse Cases

| Threat | Mitigation |
|---|---|
| Scraping via recommendation enumeration | Rate-limit at 60 req/min per tenant (inherit from AI foundation); recommendation set must not be page-navigable to enumerate all suppliers |
| Competitor inference via match labels | Match labels must be category/material-level only; no supplier-specific metadata in labels |
| Hidden supplier discovery via recommendations | Policy filter must enforce catalog visibility gate; hidden/gated suppliers never appear |
| Prompt injection via buyer input | Buyer-supplied text used in prompt construction must be sanitized, length-bounded (max 500 chars), and stripped of instruction-style tokens before prompt assembly |
| Malicious buyer query for sensitive supplier discovery | All queries route through `SupplierMatchPolicyFilter`; forbidden inputs (§6) are stripped before any model call |
| Model hallucination producing false supplier capabilities | `SupplierMatchRuntimeGuard` must validate all model-asserted capabilities against verified catalog metadata before accepting the output |
| Leakage via explanation text | `SupplierMatchExplanationBuilder` strips any reference to forbidden fields; explanation text passes through a deterministic deny-list before write |
| Leakage via logs / traces | Structured log fields must not include raw buyer query, supplier scores, or relationship states; Playwright trace artifacts must not assert on recommendation payloads containing supplier identifiers |
| Enumeration attack via candidate count changes | Candidate count and set membership must not change in a way that reveals relationship or catalog topology across requests with minor input variation |
| Cross-tenant probe via recommendation API | Every recommendation request must enforce `org_id` from JWT and FORCE RLS; a second buyer's results must never appear in response |

---

## 21. Migration Considerations

> DESIGN-ONLY. No schema changes or migrations are authorized in this unit.
> All storage design is conceptual for future planning only.

### 21.1 Conceptual Future Storage

| Storage Concern | Design Note |
|---|---|
| Match event log | Future: a `SupplierMatchLog` table scoped by `org_id`, storing audit envelope IDs, signal hashes, and outcome counts |
| Safe recommendation cache | Future: Redis or DB-backed cache keyed by (`buyerOrgId`, `signalHash`) with TTL |
| Embedding / vector index metadata | Future: additional `DocumentEmbedding` source types for supplier profile text; constrained to existing 768-dim, `org_id`-scoped, FORCE RLS table |
| Match audit envelope | Future: persisted `SupplierMatchAuditEnvelope` rows in a new table |
| Feedback table | Future: buyer feedback signals (thumbs up/down on recommendation) for future model improvement |
| No schema changes now | This unit authorizes no `schema.prisma` edits |

### 21.2 Prisma Migration Rules (Future)

When future slices require schema changes, the following rules apply unconditionally:

- All schema changes must go through the Prisma migration ledger
- `prisma migrate dev` is **NEVER** allowed
- `prisma db push` is **NEVER** allowed
- Use `pnpm -C server exec prisma migrate deploy` (with explicit authorization only)
- Shadow database is **FORBIDDEN** in TexQtic; if Prisma demands it, stop and emit a blocker report
- Known historical shadow replay risk must be handled explicitly at migration time
- No manual SQL for schema changes
- No connection strings or secrets printed during migration execution

---

## 22. Test Strategy for Future Implementation

> DESIGN-ONLY. No test files may be created from this section without an authorized
> implementation slice. Tests listed here are planned, not written.

| Test Area | Test Approach |
|---|---|
| Safe signal builder | Unit: verify each signal type extracts correct field; forbidden fields are stripped |
| Policy filtering | Unit: verify BLOCKED/SUSPENDED/REJECTED suppliers are excluded; APPROVED suppliers are present |
| Relationship-gated supplier exclusion | Unit: buyer without APPROVED relationship does not receive gated catalog items in candidates |
| Hidden catalog exclusion | Unit: supplier with no buyer-visible active items does not appear in candidate set |
| Hidden price exclusion | Unit: price or cost field must never appear in `SupplierMatchSignal` or recommendation payload |
| RFQ matching | Unit: RFQ material/category/quantity fields correctly feed safe signal builder |
| DPP published-only signal use | Unit: draft DPP evidence must not produce a signal; published DPP cert reference must produce a signal |
| No AI draft evidence in buyer output | Unit: AI draft fields on catalog items or DPP must be stripped by signal builder |
| No relationship graph leakage | Integration: recommendation response payload must not contain relationship state fields |
| No allowlist leakage | Integration: recommendation count and membership must not reveal internal allowlist graph |
| Explanation safety | Unit: explanation text output by `SupplierMatchExplanationBuilder` must not contain forbidden field references |
| Deterministic fallback | Unit: when no safe candidates exist, system returns structured empty result, not error |
| Cross-tenant probes | Integration: buyer org A must not receive supplier candidates from buyer org B's authorized set |
| Cache isolation | Integration: `(orgId_A, signalHash)` cache entry must not be readable by `orgId_B` |
| Production Playwright verification | E2E: recommendation surface at `https://app.texqtic.com` must not expose forbidden fields in DOM or network payload |

---

## 23. Runtime Verification Plan for Future Implementation

> DESIGN-ONLY. The following verification plan applies to any future implementation
> slice that results in user-facing or runtime-facing changes.

| Verification Check | Description |
|---|---|
| Buyer catalog/PDP recommendation widget | If implemented: Playwright confirms widget renders, does not expose hidden price or score, does not reveal relationship state |
| RFQ recommendation path | If implemented: Playwright confirms RFQ compose flow shows matched suppliers with safe labels only |
| Approved buyer behavior | Playwright: APPROVED relationship buyer sees "Request quote" CTA for connected supplier |
| Unapproved buyer behavior | Playwright: PENDING/NONE buyer sees "Request access" CTA; no hidden catalog items visible |
| Hidden supplier exclusion | Network payload assertion: BLOCKED/SUSPENDED suppliers must not appear in recommendation response |
| Anti-leakage DOM scan | DOM assertion: no hidden price value, relationship state string, or confidence score in rendered page |
| Network payload scan | XHR/fetch assertion: recommendation API response must not contain forbidden fields |
| Console-error scan | No unhandled console errors during recommendation interaction |
| Production Vercel Playwright | All above checks run against `https://app.texqtic.com` — mandatory closure gate |
| Neighbor-path smoke checks | Any shared shell change must be followed by smoke checks for adjacent paths (catalog browse, PDP, RFQ compose) |

---

## 24. Open Questions

The following questions must be resolved before any implementation slice is authorized:

| # | Question |
|---|---|
| OQ-001 | **MVP matching source:** Should v1 matching be catalog-only (deterministic signal match) or include RFQ-intent assistance from the outset? |
| OQ-002 | **Embeddings in v1:** Should the MVP ranker be fully deterministic (no model calls) or include a lightweight embedding similarity pass using existing `text-embedding-004` infrastructure? |
| OQ-003 | **Explanation visibility:** Should match explanations in v1 be buyer-visible (in UI) or internal-only (in audit log)? |
| OQ-004 | **Supplier opt-out:** Should suppliers be able to opt out of appearing in buyer recommendations? If yes, what is the opt-out mechanism and UX? |
| OQ-005 | **Only approved suppliers in recommendations:** Should v1 recommendations include only APPROVED-relationship suppliers, or also surface PENDING/NONE suppliers with a "Request access" CTA? |
| OQ-006 | **Feedback loop design:** Should v1 include a buyer thumbs-up/thumbs-down feedback signal on recommendations for future model improvement? |
| OQ-007 | **Audit retention:** What is the required retention period for `SupplierMatchAuditEnvelope` records? |
| OQ-008 | **Performance target:** Is the < 300ms latency target for the deterministic MVP ranker correct? Is < 2s acceptable for model-assisted path? |
| OQ-009 | **Explanation localization:** Should match explanation labels be localized from day one, or English-only for MVP? |
| OQ-010 | **AI model/provider governance:** Must the matching model use the existing `gemini-1.5-flash` provider, or is a different provider/model acceptable for this use case? |
| OQ-011 | **Relationship state cache TTL:** What is an acceptable TTL for relationship state caching within the matching pipeline? (Suggestion: 5 minutes maximum.) |
| OQ-012 | **DPP signal scope:** Which published DPP fields are safe to use as signals beyond cert references? Are supply chain traceability facts from published passports in scope for v1? |

---

## 25. Recommended Implementation Slices

> No slice below is authorized. Each requires explicit authorization before opening.

| Slice | Title | Description |
|---|---|---|
| **Slice A** | Supplier match signal contract and safe signal builder | Define `SupplierMatchSignal`, `BuyerSupplierMatchRequest`, `SupplierMatchPolicyContext` as TypeScript types. Implement `SupplierMatchSignalBuilder` extracting safe signals from catalog, org, and RFQ fields. Include unit tests. No model calls. |
| **Slice B** | Policy filter integrating catalog/relationship/price/RFQ gates | Implement `SupplierMatchPolicyFilter` that enforces relationship gate, hidden-catalog exclusion, forbidden-supplier exclusion, and DPP boundary. Include cross-tenant probe tests. |
| **Slice C** | Deterministic MVP ranker, no model calls | Implement `SupplierMatchRanker` using safe-signal scoring only. Produce `SupplierMatchResult` with candidate set and audit envelope. No AI inference invocation. |
| **Slice D** | Explanation builder with anti-leakage guard | Implement `SupplierMatchExplanationBuilder` and `SupplierMatchRuntimeGuard`. Unit tests must verify no forbidden field appears in explanation output. |
| **Slice E** | RFQ-intent supplier matching service | Extend signal builder and ranker to accept RFQ context (`rfqId`). Must respect all relationship and catalog gates. Include RFQ-specific test cases. |
| **Slice F** | Optional AI/embedding design and runtime guard (if authorized) | If authorized: extend matching with `text-embedding-004` semantic signal via existing `DocumentEmbedding` infrastructure. Constrained to 768-dim locked, orgId-scoped, FORCE RLS boundary. Full runtime guard required. |
| **Slice G** | Frontend recommendation surface (if authorized) | If authorized: implement "Recommended suppliers" panel on PDP or RFQ compose. Must not expose score, relationship state, or hidden catalog data. Requires Production Vercel Playwright verification closure. |
| **Slice H** | Production Playwright verification and governance closure | Mandatory: E2E Playwright suite at `https://app.texqtic.com` covering anti-leakage, forbidden-field, relationship-gate, and cross-tenant probe scenarios. Required before any matching feature is declared VERIFIED_COMPLETE. |

---

## 26. Completion Checklist

### Design Artifact Checklist

- [x] Problem statement defined
- [x] Business rationale defined
- [x] Current system assumptions listed with source references
- [x] Non-goals explicitly listed
- [x] Safe matching signals defined with field-level granularity
- [x] Forbidden matching inputs listed with reasons
- [x] Matching output model defined with buyer-facing constraints
- [x] Relationship-aware matching rules defined
- [x] Catalog/PDP integration boundary defined
- [x] RFQ integration boundary defined
- [x] DPP/compliance boundary defined
- [x] Tenant isolation requirements stated
- [x] Anti-leakage safeguards listed across all surfaces
- [x] AI governance requirements stated
- [x] Conceptual data contracts (design-only) defined
- [x] Backend service design listed
- [x] Frontend design considerations listed
- [x] Performance/scaling considerations listed
- [x] Runtime verification hard gate stated
- [x] Security/abuse cases listed
- [x] Migration considerations (design-only) stated
- [x] Prisma migration rules restated
- [x] Test strategy listed
- [x] Runtime verification plan listed
- [x] Open questions listed
- [x] Implementation slices listed with descriptions
- [x] No code, schema, migration, or API implementation included

### Implementation Closure Requirements (for future use)

When any implementation slice is authorized and completed, the following must be present before that slice is declared closed:

- [ ] `git diff --name-only` showing only allowlisted files
- [ ] TypeScript build passing (`pnpm --filter server typecheck`)
- [ ] Targeted lint passing (`pnpm --filter server lint`)
- [ ] Unit tests passing (all matching-related tests)
- [ ] Integration tests passing (cross-tenant probe, cache isolation)
- [ ] Production Vercel Playwright passing at `https://app.texqtic.com`
- [ ] Anti-leakage DOM + network payload assertions passing
- [ ] Console-error assertions passing
- [ ] Neighbor-path smoke checks passing
- [ ] `git show --stat HEAD` showing clean atomic commit
- [ ] No secrets, connection strings, or forbidden fields in any terminal output

---

*TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 — Design v1 — 2026-04-28*  
*Design-only. No implementation authorized. Next authorization: Slice A.*
