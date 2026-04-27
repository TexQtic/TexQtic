# TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001 — Design v1

**Unit ID:** TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001  
**Status:** DESIGN_COMPLETE  
**Authorized by:** Paresh (design-only authorization — implementation NOT opened)  
**Design date:** 2026-04-28  
**Governance unit type:** AI-Assisted Supplier Tooling  
**Predecessor unit:** TECS-AI-RFQ-ASSISTANT-MVP-001 (VERIFIED_COMPLETE, 2026-04-27)  
**AI Foundation:** TECS-AI-FOUNDATION-DATA-CONTRACTS-001 (IMPLEMENTATION_COMPLETE, f671995)

> **Design-only document.** No code changes, schema changes, API implementation, frontend
> implementation, AI provider calls, or automatic profile edits are included in this artifact.
> Each implementation slice requires explicit Paresh authorization before opening.

---

## A. Current Supplier Profile Baseline

### A.1 Structured Organization Fields (from `organizations` model)

| Field | Type | Notes |
|---|---|---|
| `slug` | `VARCHAR(100)` | Unique identifier; buyer-visible in URL |
| `legal_name` | `VARCHAR(500)` | Tenant display name; free-text |
| `jurisdiction` | `VARCHAR(100)` | Country/region; defaults to `UNKNOWN` |
| `registration_no` | `VARCHAR(200)` | Optional legal registration number |
| `org_type` | `VARCHAR(50)` | e.g., `B2B`; open-coded |
| `primary_segment_key` | `VARCHAR(100)` | Primary business segment; optional |
| `status` | `VARCHAR(30)` | `ACTIVE \| SUSPENDED \| CLOSED \| PENDING_VERIFICATION \| VERIFICATION_APPROVED \| VERIFICATION_REJECTED \| VERIFICATION_NEEDS_MORE_INFO` |
| `plan` | `VARCHAR(30)` | `FREE \| ...`; billing tier |

**Excluded from AI context (constitutional):**
- `risk_score` — control-plane only; tenant AI hard boundary
- `publication_posture` — constitutionally forbidden from all AI context packs
- `is_white_label` — internal infrastructure field

### A.2 Business Capability Fields

| Model | Field | Notes |
|---|---|---|
| `OrganizationSecondarySegment` | `segment_key` | Many-to-one; array of secondary segments per org |
| `OrganizationRolePosition` | `role_position_key` | Many-to-one; array of trade roles per org |

### A.3 Catalog Item Fields (from `CatalogItem` model, per item)

| Field | Notes |
|---|---|
| `name` | Required; buyer-visible |
| `sku` | Optional identifier |
| `description` | Free-text; optional |
| `catalogStage` | 14-value taxonomy: `YARN`, `FIBER`, `FABRIC_WOVEN`, `FABRIC_KNIT`, `FABRIC_PROCESSED`, `GARMENT`, `ACCESSORY_TRIM`, `CHEMICAL_AUXILIARY`, `MACHINE`, `MACHINE_SPARE`, `PACKAGING`, `SERVICE`, `SOFTWARE_SAAS`, `OTHER` |
| `stageAttributes` | JSONB; stage-specific required attributes |
| `moq` | Minimum order quantity |
| `material` / `composition` | Free-text textile base fields |
| `fabricType` / `gsm` / `color` / `widthCm` / `construction` | Legacy textile attribute columns |
| `certifications` | JSONB; array of cert references on item |
| `active` | Boolean; inactive items not buyer-visible |
| `productCategory` | Optional category tag |

**Excluded from AI context (constitutional):**
- `price` — constitutionally forbidden from ALL AI paths
- `publicationPosture` — constitutionally forbidden from ALL AI context packs

### A.4 Certification Fields (from `Certification` model, per cert)

| Field | Notes |
|---|---|
| `certificationType` | Open-coded: `GOTS`, `OEKO_TEX`, `ISO_9001`, etc. |
| `lifecycleStateId` | FK to `LifecycleState`; current lifecycle state |
| `issuedAt` | Nullable; set on `APPROVED` state |
| `expiresAt` | Nullable; some certs do not expire |

**Excluded from AI context:**
- `createdByUserId` — actor PII; forbidden
- Lifecycle log entries — audit fields; forbidden from AI context

### A.5 Helper: `catalogItemAttributeCompleteness()`

- **Location:** `server/src/routes/tenant.ts`, exported function `catalogItemAttributeCompleteness()`
- **Signature:** `(item: Partial<CatalogItemForVectorText>) => number`  
- **Returns:** `[0,1]` — ratio of present fields to expected fields for that `catalogStage`
- **Stage awareness:** Dedicated field sets for `YARN` (11 fields), `FABRIC_KNIT` (9), `GARMENT` (10), `MACHINE` (8), `SERVICE` (7); fallback FABRIC_WOVEN / null (9 textile fields)
- **Contract:** Transient — value is NEVER stored; computed fresh on each call

### A.6 Buyer-Visible Surface

A buyer accessing this supplier's catalog sees:
- Items where `publicationPosture` is `PUBLIC_CATALOG` or within buyer's access scope (depending on tenant posture)
- `name`, `sku`, `description`, stage, `stageAttributes`, `moq`, textile attributes, `certifications` (item-level)
- Does NOT see: price, `risk_score`, `publication_posture`, internal org fields

### A.7 AI-Readable Surface (Constitutional Boundary)

Per `SupplierProfileCompletenessContext` in `aiContextPacks.ts`:
- Org identity fields: `slug`, `legal_name`, `jurisdiction`, `registration_no`, `org_type`, `primary_segment_key`
- Catalog items: `CatalogItemSummary[]` — `id`, `sku`, `name`, `catalogStage`, `stageAttributes`, `material`, `composition`, `moq` (price and `publicationPosture` EXCLUDED)
- Certifications: `CertificationSummary[]` — `id`, `certificationType`, `expiresAt` only (no actor PII, no financial fields)
- `completenessScores: Record<string, number>` — itemId → `catalogItemAttributeCompleteness()` score [0,1]; transient
- `stageBreakdown: Record<string, number>` — stage → item count

---

## B. MVP Scope

### B.1 What the AI Does

- Accepts supplier's own profile context (authenticated, org-scoped)
- Analyses completeness across 10 defined categories (Section D)
- Returns a structured completeness report: overall score, per-category scores, missing fields, prioritised improvement actions, trust signal warnings
- All output is suggestion-only and read-only; no profile writes occur
- Human review notice is structural: `humanReviewRequired: true` enforced at the type level

### B.2 What Is Explicitly Excluded from MVP

| Excluded item | Reason |
|---|---|
| Buyer-visible completeness score | Must not create buyer-side supplier ranking |
| Persistent completeness score (stored in DB) | MVP is transient analysis; no new table required |
| Automatic profile updates | Human confirmation is mandatory; AI has no write authority |
| Trust scoring exposed to buyers | Not a public-facing metric; supplier-internal advisory only |
| Cross-tenant benchmarking | Tenant isolation is constitutional; no cross-tenant queries |
| Supplier ranking or match-scoring for buyers | Out of scope; belongs to TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 |
| Price disclosure or price-adjacent inference | Constitutionally forbidden |
| RAG/vector retrieval for completeness | Not required for MVP; completeness is deterministic from DB fields |
| RFQ responsiveness rate analysis | Requires additional query complexity; deferred to a future unit |

---

## C. Profile Completeness Context Contract

The `SupplierProfileCompletenessContext` interface is already defined in
`server/src/services/ai/aiContextPacks.ts` (Section F.3). It is reproduced here as the canonical
context shape for this unit.

```typescript
// From: server/src/services/ai/aiContextPacks.ts

export interface CatalogItemSummary {
  id: string;
  sku: string;
  name: string;
  catalogStage: string;
  stageAttributes: Record<string, unknown>;
  material?: string | null;
  composition?: string | null;
  moq?: number | null;
  // price: EXCLUDED — constitutionally forbidden
  // publicationPosture: EXCLUDED — constitutionally forbidden
}

export interface CertificationSummary {
  id: string;
  certificationType: string;
  expiresAt: Date | null;
  // No email, no actor PII, no financial fields
}

export interface SupplierProfileCompletenessContext {
  /** JWT-derived supplier orgId */
  orgId: string;
  /** AI-safe catalog item summaries — price and publicationPosture excluded */
  catalogItems: CatalogItemSummary[];
  /** Certification metadata — type and expiry only */
  certifications: CertificationSummary[];
  /** itemId → completeness score [0,1] from catalogItemAttributeCompleteness() — transient; never stored */
  completenessScores: Record<string, number>;
  /** stage → item count breakdown */
  stageBreakdown: Record<string, number>;
  // price: EXCLUDED
  // publicationPosture: EXCLUDED
  // User PII: EXCLUDED
  // escrow*: EXCLUDED
}
```

### C.1 Additional Context Fields Required at Assembly

The following fields are needed for AI prompt context but are NOT part of `SupplierProfileCompletenessContext`
as defined. The implementation service will read these from `organizations` + related models and
assemble them separately before prompt construction:

```typescript
// Assembled at route layer — not stored in context pack type
interface SupplierOrgProfileForContext {
  orgId: string;
  slug: string;
  legalName: string;                          // redactPii() applied before AI use
  jurisdiction: string;
  registrationNo: string | null;
  orgType: string;
  primarySegmentKey: string | null;
  secondarySegmentKeys: string[];             // from OrganizationSecondarySegment
  rolePositionKeys: string[];                 // from OrganizationRolePosition
  // Excluded: risk_score, publication_posture, is_white_label, plan
}
```

**PII redaction boundary:** `piiGuard.redactPii()` MUST be applied to `legalName` and any free-text
field before inclusion in the AI prompt. `scanForPii()` SHOULD be run on AI response before
returning to client.

---

## D. Completeness Rubric

Ten categories assessed. Each category contributes equally to `overallCompleteness` (10% weight each)
in MVP. Each category is scored [0,1] independently.

### D.1 Profile Identity (10%)

| Signal | Present if |
|---|---|
| `legal_name` set and non-empty | ✓ |
| `jurisdiction` not `UNKNOWN` | ✓ |
| `registration_no` present | ✓ |
| `slug` set | ✓ (always true if org exists — baseline) |

Score: filled signals / 4

### D.2 Business Capability (10%)

| Signal | Present if |
|---|---|
| `primary_segment_key` set | ✓ |
| At least 1 `OrganizationSecondarySegment` | ✓ |
| At least 1 `OrganizationRolePosition` | ✓ |

Score: filled signals / 3

### D.3 Catalog Coverage (10%)

| Signal | Present if |
|---|---|
| At least 1 active catalog item | ✓ |
| At least 3 active catalog items | ✓ |
| More than 1 distinct `catalogStage` represented | ✓ |
| At least 1 item with a non-null `description` | ✓ |

Score: filled signals / 4

### D.4 Catalog Attribute Quality (10%)

Computed from `completenessScores` (pre-computed by `catalogItemAttributeCompleteness()`):

- Score = mean of `completenessScores` across all active items
- If no items: score = 0
- If all items score ≥ 0.8: full credit

### D.5 Stage Taxonomy (10%)

| Signal | Present if |
|---|---|
| All active items have a `catalogStage` set (not null) | ✓ |
| All items with `catalogStage` have non-empty `stageAttributes` | ✓ |
| At least 1 item per dominant stage has all required stage fields present (completeness ≥ 0.7) | ✓ |

Score: filled signals / 3

### D.6 Certifications and Documents (10%)

| Signal | Present if |
|---|---|
| At least 1 certification record present | ✓ |
| At least 1 certification is APPROVED (non-null `issuedAt`) | ✓ |
| No certification is expired (all `expiresAt` null or in future) | ✓ |
| `certificationType` is a recognized standard (GOTS, OEKO_TEX, ISO_9001, BLUESIGN, etc.) | ✓ |

Score: filled signals / 4. Expired certifications trigger trust signal warning (Section E).

### D.7 RFQ Responsiveness (10%) — Informational Only in MVP

- **MVP:** Score = 0.5 (neutral — no RFQ history analysis in MVP)
- **Future unit:** full response rate calculation from `RfqSupplierResponse` history
- Note: RFQ responsiveness is not included in AI context pack in MVP; held as a future signal

### D.8 Service and Capability Clarity (10%)

Applies only if any `catalogStage = 'SERVICE'` items exist:

| Signal | Present if |
|---|---|
| SERVICE items have `serviceType` in `stageAttributes` | ✓ |
| SERVICE items have `specialization` in `stageAttributes` | ✓ |
| SERVICE items have `turnaroundTimeDays` in `stageAttributes` | ✓ |

If no SERVICE items: score = 1.0 (N/A — full credit; not applicable)

### D.9 AI Readiness (10%)

| Signal | Present if |
|---|---|
| All active items have `name` set | ✓ |
| Mean `completenessScore` across items ≥ 0.6 | ✓ |
| At least 1 item has `composition` or `material` set | ✓ |
| At least 1 item has `certifications` set (item-level JSONB) | ✓ |

Score: filled signals / 4. AI readiness reflects how well the profile is suited for AI-assisted
matching and RFQ suggestion tasks.

### D.10 Buyer Discoverability (10%)

| Signal | Present if |
|---|---|
| At least 1 active item present | ✓ |
| At least 1 item has `moq` set explicitly (not default 1) | ✓ |
| At least 1 item has `sku` set | ✓ |
| At least 1 item has `description` set | ✓ |

Score: filled signals / 4. Discoverability reflects how well structured the profile is for buyer
discovery — without reference to `publicationPosture` (constitutionally excluded).

---

## E. AI Output Contract

### E.1 `SupplierProfileCompletenessReport` Type

```typescript
/**
 * AI output contract for TECS-AI-SUPPLIER-PROFILE-COMPLETENESS-001.
 *
 * AI BOUNDARY:
 *   - overallCompleteness and categoryScores are SUGGESTION-ONLY.
 *   - Supplier MUST review all output before acting. humanReviewRequired: true is structural.
 *   - AI has no authority to write to the profile. No auto-apply.
 *   - No price fields. No publicationPosture. No risk_score. No buyer-visible score.
 */
export interface SupplierProfileCompletenessReport {
  /** Overall weighted completeness score [0,1]. Suggestion-only — transient; never stored. */
  overallCompleteness: number;

  /** Per-category scores [0,1]. Keys match D.1–D.10 category IDs. Transient; never stored. */
  categoryScores: {
    profileIdentity: number;
    businessCapability: number;
    catalogCoverage: number;
    catalogAttributeQuality: number;
    stageTaxonomy: number;
    certificationsDocuments: number;
    rfqResponsiveness: number;        // MVP: always 0.5 (informational placeholder)
    serviceCapabilityClarity: number;
    aiReadiness: number;
    buyerDiscoverability: number;
  };

  /**
   * Prioritised list of missing or incomplete fields.
   * Each entry identifies the category, field name, and priority.
   * priority: 'HIGH' (blocks buyers), 'MEDIUM' (reduces discoverability), 'LOW' (nice-to-have).
   */
  missingFields: Array<{
    category: string;
    field: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    note?: string;
  }>;

  /**
   * Concrete, actionable improvement suggestions.
   * Each suggestion maps to a category and carries a priority.
   * AI MUST NOT suggest price changes, publicationPosture changes, or any escrow/financial actions.
   */
  improvementActions: Array<{
    action: string;
    category: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }>;

  /**
   * Trust signal warnings — issues that could reduce buyer confidence.
   * severity: 'CRITICAL' (e.g., no approved certs, all items inactive),
   *           'WARNING' (e.g., expiring cert, low completeness on key stage),
   *           'INFO' (advisory note).
   * AI MUST NOT generate warnings about price, publicationPosture, or risk_score.
   */
  trustSignalWarnings: Array<{
    warning: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    affectedCategory?: string;
  }>;

  /** Brief plain-text summary of overall profile state and top recommended action. */
  reasoningSummary: string;

  /** Structural literal — enforces human review before acting on any suggestion. */
  humanReviewRequired: true;
}
```

### E.2 Route-Level Response Shape

```typescript
// POST /api/tenant/supplier-profile/ai-completeness → 200
interface SupplierProfileCompletenessResponse {
  report: SupplierProfileCompletenessReport;
  humanReviewRequired: true;
  reasoningLogId: string;   // UUID — links to ReasoningLog for audit
  auditLogId: string;       // UUID — links to AuditLog for audit
  hadInferenceError: boolean;
}
```

### E.3 AI Prompt Output Schema

The AI prompt instructs the model to return a structured JSON object matching `SupplierProfileCompletenessReport`.
The response MUST be parsed with strict JSON schema validation. Parse errors return HTTP 422 with
`humanReviewRequired: true` and `reportParseError: true`.

---

## F. API Design

### F.1 Route

```
POST /api/tenant/supplier-profile/ai-completeness
```

**Pattern rationale:** Mirrors `POST /api/tenant/rfqs/:id/ai-assist` (resource-first, `ai-` verb suffix).
No path parameter is needed here — the supplier's org is derived from the authenticated JWT.

### F.2 Middleware

```typescript
fastify.post('/tenant/supplier-profile/ai-completeness', {
  onRequest: [tenantAuthMiddleware, databaseContextMiddleware]
}, ...)
```

- `tenantAuthMiddleware` — enforces authenticated session; derives `userId` and `dbContext.orgId`
- `databaseContextMiddleware` — sets `request.dbContext` (orgId, tenantId, realm)

### F.3 Request

```typescript
// No request body required — supplier org is from JWT/dbContext
// Optional idempotency header:
// x-idempotency-key: <uuid>  (24h window, same as rfq-assist pattern)
```

### F.4 Response

```typescript
// 200 OK
{
  report: SupplierProfileCompletenessReport;
  humanReviewRequired: true;
  reasoningLogId: string;
  auditLogId: string;
  hadInferenceError: boolean;
}

// 422 Unprocessable Entity — AI response parse error
{
  error: 'PARSE_ERROR';
  reportParseError: true;
  humanReviewRequired: true;
  auditLogId: string;
}

// 429 Too Many Requests — budget exceeded
{
  error: 'RATE_LIMIT_EXCEEDED';
  message: 'AI inference rate limit or budget exceeded';
}
```

### F.5 `AiTaskType` Extension

The implementation MUST extend `AiTaskType` in `inferenceService.ts`:

```typescript
// Current:
export type AiTaskType = 'insights' | 'negotiation-advice' | 'rfq-assist';

// After slice 2 implementation:
export type AiTaskType = 'insights' | 'negotiation-advice' | 'rfq-assist' | 'supplier-profile-completeness';
```

### F.6 OpenAPI Contract Update

The route MUST be added to `/shared/contracts/openapi.tenant.json` as part of the implementation.
Schema: matches `SupplierProfileCompletenessResponse`.

---

## G. Frontend UX Design

### G.1 Entry Point

A "Profile Completeness" card or section in the **Supplier Admin / Dashboard** view.
- CTA: `"Analyse My Profile"` button
- Calls `POST /api/tenant/supplier-profile/ai-completeness`
- Loading state while waiting for AI response

### G.2 Completeness Score Card

```
┌────────────────────────────────────────────────────────┐
│  AI Profile Analysis                                   │
│  ── Generated by AI · Human review required ──         │
│                                                        │
│  Overall Completeness                                  │
│  ████████████████░░░░  82%                             │
│                                                        │
│  [View Details]                                        │
└────────────────────────────────────────────────────────┘
```

- Score shown as percentage (overallCompleteness × 100)
- "AI-generated · Human review required" label — always visible; cannot be dismissed
- "View Details" expands to category breakdown

### G.3 Category Breakdown

Accordion or tab list showing 10 categories with per-category score bar and status chip:

```
✅ Profile Identity            100%
⚠️ Business Capability          33%  [Add segments]
✅ Catalog Coverage            100%
⚠️ Catalog Attribute Quality    61%  [Improve items]
❌ Stage Taxonomy               33%  [Assign stages]
⚠️ Certifications              75%  [1 expiring]
─  RFQ Responsiveness            -   [Informational MVP placeholder]
✅ Service/Capability          N/A
⚠️ AI Readiness                50%  [Add descriptions]
⚠️ Buyer Discoverability       75%  [Add SKUs]
```

### G.4 Missing Field Checklist

Below the category breakdown, a prioritised checklist:

```
  HIGH PRIORITY
  ☐ Assign catalogStage to all 3 items missing stage classification
  ☐ Add stageAttributes to FABRIC_WOVEN items

  MEDIUM PRIORITY
  ☐ Add business capability segments (primary_segment_key)
  ☐ Add item descriptions to improve AI readiness

  LOW PRIORITY
  ☐ Add SKUs to items for better buyer discoverability
```

Each checklist item links to the relevant edit surface (e.g., clicking "Assign catalogStage" navigates to the catalog item edit form).

### G.5 Trust Signal Warnings

Banner at top of results:

```
⚠️  1 certification expiring within 90 days — review and renew to maintain buyer trust
```

CRITICAL warnings (e.g., no approved certifications, all items inactive) appear as red banners.

### G.6 Governance Label

All AI output sections MUST carry:

```
AI-generated analysis · Human review required before acting on any suggestion
```

This label is hardcoded in the component; never driven from the API response.

### G.7 No Buyer-Facing Score

The completeness score and report are **supplier-internal only**. They MUST NOT be shown to buyers
browsing the catalog, in buyer-facing supplier cards, or in any cross-tenant surface.

---

## H. Storage and Audit Design

### H.1 What Is Stored (MVP)

| What | Where | Notes |
|---|---|---|
| `ReasoningLog` row | `reasoning_logs` table | One per call: `requestId`, `model` (`gemini-2.5-flash`), `promptSummary`, `responseSummary`, `tokensUsed`, `tenantId` |
| `AuditLog` row | `audit_logs` table | One per call: `action='AI_SUPPLIER_PROFILE_COMPLETENESS'`, `entity='Organization'`, `entityId=orgId`, `realm='TENANT'`, `actorType='TENANT_USER'`, `afterJson=null` (no state change) |
| `AiUsageMeter` increment | `ai_usage_meters` table | Per call: `monthKey`, `tenantId`, `taskType='supplier-profile-completeness'` |

### H.2 What Is NOT Stored (MVP)

- The `SupplierProfileCompletenessReport` itself is **NOT stored**. It is transient.
- `overallCompleteness` and `categoryScores` are **NOT persisted** in any table.
- No new table is created in this unit.
- If a persistent completeness history is needed in future, it requires a separate design unit
  with explicit schema approval.

### H.3 Idempotency

- `x-idempotency-key` header supported (same 24h window as rfq-assist pattern)
- Idempotent responses return the original `auditLogId` and `reasoningLogId` without calling the AI again

---

## I. RAG and Context Retrieval Design

### I.1 RAG Decision — Not Required for MVP

Profile completeness is a **deterministic analysis** derived from DB fields. No vector search or
embedding retrieval is needed. The AI model receives a structured context pack built from the DB
and returns a structured completeness report.

**Contrast with RFQ-assist:** RFQ-assist used RAG to retrieve relevant catalog context for
buyer requirement augmentation. Profile completeness operates on the supplier's own data — no
external retrieval is needed.

### I.2 Transaction Isolation Architecture (HOTFIX-MODEL-TX-001 Pattern)

The RFQ-assist unit demonstrated that Gemini 2.5 Flash latency (typically >5 seconds) exceeds
Prisma's 5-second interactive transaction timeout, causing `P2028` errors.

**For this unit, the same architecture MUST be used:**

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1 (outside any Prisma tx)                             │
│   — DB reads: organizations + catalog items + certifications │
│   — Context assembly + PII redaction + forbidden field check │
│   — computeCompletenessScores() (pure function)             │
│   — assembleProfileContextForAI()                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2 (outside any Prisma tx — GEMINI CALL)               │
│   — runAiInference() → SupplierProfileCompletenessReport    │
│   — parseAndValidateReport()                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3 (inside Prisma tx — fast DB writes only)            │
│   — AiUsageMeter.upsert()                                   │
│   — ReasoningLog.create()                                   │
│   — AuditLog.create()                                       │
└─────────────────────────────────────────────────────────────┘
```

DB reads in Phase 1 use the standard `prisma` client (outside `withDbContext`). Phase 3 uses
`withDbContext(prisma, dbContext, tx => {...})` for the audit writes.

---

## J. Security and Tenant Boundary

### J.1 orgId Enforcement

- `orgId` is ALWAYS derived from `request.dbContext.orgId` (set by `databaseContextMiddleware` from JWT)
- `orgId` is NEVER accepted from the request body or query parameters
- All DB queries are scoped: `where: { tenantId: dbContext.orgId }` (catalog items) and `where: { orgId: dbContext.orgId }` (org, certifications)

### J.2 Forbidden Field Enforcement

`assertNoForbiddenAiFields()` MUST be called on the assembled context before the AI call:

```typescript
import { assertNoForbiddenAiFields } from '../services/ai/aiForbiddenData.js';

// Must throw if price, publicationPosture, or risk_score is detected
assertNoForbiddenAiFields(assembledContext);
```

### J.3 PII Guard

- `piiGuard.redactPii()` MUST be applied to `legalName` and any free-text description fields before inclusion in the AI prompt
- `piiGuard.scanForPii()` SHOULD be run on the AI response (`reasoningSummary`, action text) before returning to the client
- Result: PII detected in AI response → log warning; response still returned with scan metadata

### J.4 AI Output Boundary

- AI output is READ-ONLY. The completeness report MUST NOT trigger any profile write
- `humanReviewRequired: true` is a structural literal — present in the TypeScript type; cannot be overridden
- No `aiTriggered = true` flag is set anywhere (no lifecycle transitions, no state changes)

### J.5 Cross-Tenant Isolation

- The route fetches only `orgId`-scoped data for the authenticated supplier
- No cross-tenant catalog items, certifications, or org data is included
- No benchmarking against other suppliers' profiles

---

## K. Testing Plan

### K.1 Unit Tests — Context Assembly

File: `server/src/services/ai/supplierProfileCompletenessService.test.ts`

| Test ID | Description |
|---|---|
| K-001 | Context assembly includes correct org fields |
| K-002 | price field is never present in assembled context |
| K-003 | publicationPosture never present in assembled context |
| K-004 | risk_score never present in assembled context |
| K-005 | `assertNoForbiddenAiFields()` throws on contaminated context |
| K-006 | `redactPii()` applied to legalName before AI call |
| K-007 | `completenessScores` map is populated from `catalogItemAttributeCompleteness()` |
| K-008 | `stageBreakdown` map is correct |

### K.2 Unit Tests — Completeness Rubric Scoring

File: `server/src/services/ai/supplierProfileCompletenessRubric.test.ts`

| Test ID | Description |
|---|---|
| K-009 | Profile identity: full score when all 4 fields present |
| K-010 | Profile identity: score = 0 when jurisdiction = 'UNKNOWN', no registration_no |
| K-011 | Business capability: score = 0 when no segments or role positions |
| K-012 | Catalog coverage: score = 0 with no active items |
| K-013 | Catalog attribute quality: mean completenessScore across items |
| K-014 | Stage taxonomy: score = 0 when all items have null catalogStage |
| K-015 | Certifications: trust signal warning emitted for expired cert |
| K-016 | RFQ responsiveness: always returns 0.5 in MVP |
| K-017 | Service/capability: N/A → full credit when no SERVICE items |
| K-018 | AI readiness: penalised when descriptions missing |
| K-019 | Buyer discoverability: penalised when no SKUs set |
| K-020 | Overall completeness = mean of 10 category scores |

### K.3 Unit Tests — AI Output Contract

| Test ID | Description |
|---|---|
| K-021 | `humanReviewRequired: true` is present in all valid report shapes |
| K-022 | Parse error returns 422 with `reportParseError: true` and `humanReviewRequired: true` |
| K-023 | `improvementActions` never contains price-adjacent suggestions |
| K-024 | `trustSignalWarnings` never reference publicationPosture or risk_score |
| K-025 | Valid report accepted; no AI-generated write action is permitted |

### K.4 Integration Tests — Route

File: `server/src/routes/tenant.supplierProfileCompleteness.test.ts`

| Test ID | Description |
|---|---|
| K-026 | POST with valid auth → 200 with valid report shape |
| K-027 | POST unauthenticated → 401 |
| K-028 | POST with AI parse error (mocked) → 422 with `reportParseError: true` |
| K-029 | POST with budget exceeded (mocked) → 429 |
| K-030 | ReasoningLog and AuditLog created per call |
| K-031 | AiUsageMeter incremented per call |
| K-032 | Idempotent repeat call (same `x-idempotency-key`) → 200, no second AI call |

---

## L. Production Verification Plan

### L.1 Acceptance Criteria

| Check | Expected |
|---|---|
| `POST /api/tenant/supplier-profile/ai-completeness` | HTTP 200 |
| `report.overallCompleteness` | number [0,1] |
| `report.categoryScores` | object with all 10 keys |
| `report.missingFields` | array (may be empty) |
| `report.improvementActions` | array with at least 1 entry |
| `report.trustSignalWarnings` | array (may be empty) |
| `report.humanReviewRequired` | `true` |
| `humanReviewRequired` (route level) | `true` |
| `reasoningLogId` | UUID string |
| `auditLogId` | UUID string |
| `hadInferenceError` | `false` |
| No `price` in any response field | ✓ |
| No `publicationPosture` in any response field | ✓ |
| No PII leakage observed | ✓ |

### L.2 Manual Verification Steps

1. Log in as supplier (e.g., `qa.supplier@texqtic.com`)
2. Navigate to supplier dashboard / profile admin
3. Click "Analyse My Profile" — loading state visible
4. Response loads — completeness score card renders
5. Category breakdown visible — at least 3 categories with scores
6. Missing field checklist visible — at least 1 entry for incomplete profile
7. AI-generated label visible and not dismissible
8. Human review notice visible
9. No price shown anywhere in report
10. Check `POST /api/tenant/supplier-profile/ai-completeness` in Network tab — HTTP 200, valid shape

---

## M. Non-Goals

The following are explicitly out of scope for this unit:

1. **New DB table or schema changes** — no new columns, no migrations, no Prisma schema changes
2. **Persistent completeness score** — transient only; not stored
3. **Buyer-facing supplier score** — completeness is supplier-internal; buyers never see it
4. **Automatic profile updates** — AI is advisory; human confirmation always required
5. **Trust scoring for buyer-side ranking** — belongs to TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001
6. **Cross-tenant benchmarking** — tenant isolation is constitutional
7. **Price proximity or price inference** — constitutionally forbidden
8. **RAG / vector retrieval** — not required for completeness analysis
9. **RFQ responsiveness rate calculation** — requires separate DB query design; deferred to future unit
10. **Batch analysis across multiple suppliers** — control-plane scope; not tenant AI scope
11. **Scheduled / background completeness scanning** — requires background job infrastructure; deferred
12. **Embedding generation or vectorText update** — distinct infrastructure; separate unit

---

## N. Proposed Implementation Slices

Each slice is **NOT authorized** until Paresh gives explicit sign-off per slice.

### Slice 1 — Context Assembly + Forbidden Field + PII Guard

**Files to change (expected):**
- `server/src/services/ai/supplierProfileCompletenessContextBuilder.ts` (new)
- `server/src/services/ai/supplierProfileCompletenessService.test.ts` (new)

**Scope:**
- `buildSupplierProfileCompletenessContext()` function
- DB queries: `organizations` + `OrganizationSecondarySegment` + `OrganizationRolePosition` + `CatalogItem` + `Certification`
- Calls `catalogItemAttributeCompleteness()` per item; builds `completenessScores` and `stageBreakdown`
- Calls `assertNoForbiddenAiFields()` on assembled context
- Calls `piiGuard.redactPii()` on `legalName` and free-text fields
- Unit tests K-001 through K-008

**No schema changes. No migrations. No route additions.**

### Slice 2 — AI Prompt + Response Schema

**Files to change (expected):**
- `server/src/services/ai/supplierProfileCompletenessService.ts` (new)
- `server/src/services/ai/inferenceService.ts` (modify — add `'supplier-profile-completeness'` to `AiTaskType`)
- `server/src/services/ai/supplierProfileCompletenessRubric.test.ts` (new)

**Scope:**
- `runSupplierProfileCompletenessInference()` function
- Gemini prompt construction: system instructions + structured context pack → `SupplierProfileCompletenessReport`
- `SupplierProfileCompletenessReport` Zod schema for validation + parse error fallback
- AI call OUTSIDE Prisma tx (HOTFIX-MODEL-TX-001 pattern)
- Unit tests K-009 through K-025

**No schema changes. No migrations. No route additions.**

### Slice 3 — Route + AuditLog + ReasoningLog + AiUsageMeter

**Files to change (expected):**
- `server/src/routes/tenant.ts` (modify — add route)
- `shared/contracts/openapi.tenant.json` (modify — add route contract)
- `server/src/routes/tenant.supplierProfileCompleteness.test.ts` (new)

**Scope:**
- `POST /tenant/supplier-profile/ai-completeness` route registration
- Middleware: `tenantAuthMiddleware` + `databaseContextMiddleware`
- Phase 1 (DB reads + context assembly, outside tx)
- Phase 2 (AI call, outside tx)
- Phase 3 (AiUsageMeter + ReasoningLog + AuditLog writes, inside tx)
- Error handling: parse error → 422; budget exceeded → 429
- Integration tests K-026 through K-032

**No schema changes. No migrations.**

### Slice 4 — Frontend Score Card + Category Breakdown + Missing Field Checklist

**Files to change (expected):**
- `components/Tenant/SupplierProfileCompletenessCard.tsx` (new)
- `App.tsx` (modify — add `handleAnalyseProfile()` handler + state)
- `services/catalogService.ts` or relevant API client (modify — add `analyseSupplierProfile()`)

**Scope:**
- Score card component (overall completeness percentage + bar)
- Category breakdown accordion (10 categories, score bar per category)
- Missing field checklist (prioritised, linkable CTAs)
- Loading / error states
- AI-generated label (hardcoded; non-dismissible)
- Human review notice (hardcoded; non-dismissible)

**No new API routes. No schema changes.**

### Slice 5 — Trust Signal Warnings + Action CTAs

**Files to change (expected):**
- `components/Tenant/SupplierProfileCompletenessCard.tsx` (modify — Slice 4 file)
- `components/Tenant/TrustSignalWarningBanner.tsx` (new, if extracted)

**Scope:**
- Trust signal warning banner (CRITICAL / WARNING / INFO severity colours)
- Expired certification warning (links to certifications admin)
- "Add segments" / "Assign stages" action CTAs linking to relevant edit routes
- Slice 4 regression check

**No new API routes. No schema changes. No migrations.**

---

## O. Governance Compliance

| Governance check | Status |
|---|---|
| `price` excluded from all AI paths | ✓ Enforced by `SupplierProfileCompletenessContext` type + `assertNoForbiddenAiFields()` |
| `publicationPosture` excluded from all AI paths | ✓ Enforced at type level |
| `risk_score` excluded | ✓ Not in context pack type; control-plane only |
| `orgId` from JWT only | ✓ Route derives from `dbContext.orgId` |
| `humanReviewRequired: true` structural | ✓ Literal type; cannot be overridden |
| No buyer-facing completeness score | ✓ Supplier-internal only; design explicitly excludes buyer surface |
| No auto-apply / auto-write | ✓ Route is read-only; no DB state mutations from AI output |
| `aiTriggered = false` everywhere | ✓ No lifecycle transitions; no D-020-C writes |
| Audit trail complete | ✓ AuditLog + ReasoningLog + AiUsageMeter per call |
| No new schema or migrations | ✓ Design-only; no DB changes in this unit |
| D-016 posture: design only | ✓ Each slice requires explicit Paresh authorization |
| RAG TX isolation (HOTFIX-MODEL-TX-001 pattern) | ✓ AI call outside tx per Section I.2 architecture |
| Cross-tenant isolation | ✓ All queries scoped to `dbContext.orgId` |
| OpenAPI contract updated on route add (Slice 3) | Required at Slice 3 implementation |

---

*Design complete. No implementation is authorized until Paresh provides explicit slice-by-slice sign-off.*
