# TECS-AI-RFQ-ASSISTANT-MVP-001 — Design v1

**Unit ID:** TECS-AI-RFQ-ASSISTANT-MVP-001  
**Status:** DESIGN_COMPLETE  
**Preconditions:**
- `TECS-B2B-RFQ-STRUCTURED-REQUIREMENT-001` → VERIFIED_COMPLETE (commit `c8ec0a4`)
- `TECS-AI-FOUNDATION-DATA-CONTRACTS-001` → IMPLEMENTATION_COMPLETE (commit `f671995`)

**Governance mode:** Design only — no code, schema, API, or frontend implementation in this document.

---

## A. Purpose and Scope

This document specifies the MVP AI RFQ Assistant: a single, bounded AI-assisted endpoint
that accepts a buyer's partial or draft RFQ context and returns structured field suggestions
to help the buyer complete an RFQ for a textile B2B catalog item.

### In scope (this unit)

- One new tenant-plane route: `POST /api/tenant/rfqs/:id/ai-assist`
- One new AI task type: `'rfq-assist'`
- One new AI context pack type: `RFQAssistantContext`
- One new context-builder function: `buildRfqAssistantContext()`
- One new inference wrapper function: `runRfqAssistInference()`
- Structured JSON output shape: `RfqAssistSuggestions`
- Field-level source metadata: `fieldSourceMeta` entries with `source: 'AI_SUGGESTED'`
- Audit trail: `ReasoningLog` + `AuditLog` written atomically (reuses existing AI foundation)
- Rate limit and budget enforcement (reuses existing `runAiInference` foundation)
- PII guard on buyer message input (reuses existing `piiGuard.ts`)

### Out of scope (this unit)

- Schema changes to the `rfqs` table (no new columns required)
- New Prisma migrations
- Supplier matching (separate future unit: `TECS-AI-RFQ-INTELLIGENCE-001`)
- Price suggestion or price comparison (permanently forbidden per AI data contracts)
- Automatic RFQ submission or status mutation triggered by AI output
- Frontend UI for AI assist (separate unit, not open)
- RAG retrieval over RFQ history (scoped to Phase 2+)
- Vector indexing of RFQ text (not in this unit)
- Multi-turn conversation or session memory

---

## B. Architecture Placement

```
Browser / Frontend
        │
        ▼
POST /api/tenant/rfqs/:id/ai-assist
        │  tenantAuthMiddleware + databaseContextMiddleware
        │  JWT → orgId (buyer org only)
        ▼
tenant.ts route handler
        │
        ├── resolveRfqCatalogItemTarget()          [existing, cross-tenant read]
        │         └── texqtic_rfq_read role
        │
        ├── buildRfqAssistantContext()             [NEW]
        │         ├── assembleStructuredRfqRequirementSummaryText()  [existing in tenant.ts]
        │         ├── buildCatalogItemVectorText()                   [existing in tenant.ts]
        │         ├── stripForbiddenAiFields()                       [existing in aiForbiddenData.ts]
        │         ├── scanForPii() / redactPii()                     [existing in piiGuard.ts]
        │         └── ragContextBuilder (topK=5, source=CATALOG_ITEM) [existing]
        │
        ├── runAiInference(input: AiInferenceInput)  [existing in inferenceService.ts]
        │         ├── task_type: 'rfq-assist'          [NEW task type enum value]
        │         ├── Rate limit: 60 req/min per tenant
        │         ├── Budget enforcement: enforceBudgetOrThrow
        │         ├── Idempotency: 24h window
        │         └── ReasoningLog + AuditLog atomic write
        │
        └── parseRfqAssistSuggestions()            [NEW — validates AI JSON output]
                  └── Returns RfqAssistSuggestions
```

**Plane boundary:** Tenant plane only. `orgId` derived from JWT exclusively (never from request body).

---

## C. AI Context Pack: `RFQAssistantContext`

### New type (to be added to `aiContextPacks.ts`)

```typescript
export interface RFQAssistantContext {
  /** Buyer org ID — used for rate-limiting and audit; never injected into prompt text */
  buyerOrgId: string;

  /** Supplier org ID — used for audit only; never injected into prompt */
  supplierOrgId: string;

  /** RFQ ID — used for idempotency key and audit */
  rfqId: string;

  /**
   * Catalog item safe text — output of buildCatalogItemVectorText().
   * Price and publicationPosture are structurally excluded by that function.
   */
  catalogItemText: string;

  /**
   * AI-safe structured RFQ requirement summary — output of
   * assembleStructuredRfqRequirementSummaryText().
   * Excludes: deliveryLocation, targetDeliveryDate, requirementConfirmedAt, price.
   */
  structuredRequirementText: string;

  /**
   * RAG-retrieved chunks from catalog vector store (topK=5, minSimilarity=0.30).
   * Source type: CATALOG_ITEM only.
   * Null if RAG retrieval yields no qualifying chunks.
   */
  retrievedChunks: string[] | null;

  /**
   * Catalog item attribute completeness score [0, 1].
   * Computed by catalogItemAttributeCompleteness(). Used as prompt context metadata.
   */
  catalogCompletenessScore: number;

  /**
   * Whether the buyer message passed PII scan.
   * If PII detected, the message is redacted before inclusion in prompt text.
   */
  buyerMessagePiiRedacted: boolean;

  /**
   * Human confirmation is always required before persisting AI suggestions.
   * This flag is structural — it must never be false for RFQ assist.
   */
  humanConfirmationRequired: true;
}
```

### Field inclusion rules

| Field | Included in AI prompt | Notes |
|---|---|---|
| `catalogItemText` | ✅ | Via `buildCatalogItemVectorText()` — no price |
| `structuredRequirementText` | ✅ | Via `assembleStructuredRfqRequirementSummaryText()` |
| `retrievedChunks` | ✅ | RAG context, if available |
| `catalogCompletenessScore` | ✅ (as metadata hint) | Prompt instructs model to suggest missing fields |
| `buyerMessage` (raw) | ❌ | Replaced by `structuredRequirementText` which includes PII-redacted message |
| `deliveryLocation` | ❌ | Excluded per AI boundary function |
| `targetDeliveryDate` | ❌ | Excluded per AI boundary function |
| `requirementConfirmedAt` | ❌ | Internal audit field — excluded |
| `item_unit_price` | ❌ | Explicitly excluded — financial data governance |
| `quantity` | ❌ | Excluded — scheduling sensitivity |
| `supplierOrgId` (in prompt) | ❌ | Audit use only — never enters prompt |
| `orgId` (in prompt) | ❌ | Audit use only — never enters prompt |

---

## D. AI-Boundary Function: `assembleStructuredRfqRequirementSummaryText`

This function **already exists** in `server/src/routes/tenant.ts`. It is the canonical
AI-boundary text assembler for RFQ context. Its exclusion list is authoritative:

```
EXCLUDED: deliveryLocation        — PII risk
EXCLUDED: targetDeliveryDate      — scheduling sensitivity
EXCLUDED: requirementConfirmedAt  — internal audit field
EXCLUDED: price / item_unit_price — financial data governance
EXCLUDED: publicationPosture, escrow, grossAmount — financial governance
```

The included fields are:
- `requirementTitle`
- `quantityUnit`
- `urgency`
- `sampleRequired`
- `deliveryCountry`
- `stageRequirementAttributes` (all non-null key-value pairs)
- `buyerMessage` (after PII redaction)

**Implementation note:** The implementation phase MUST use this existing function verbatim.
It must not be reimplemented or partially copied.

---

## E. New AI Task Type: `'rfq-assist'`

### Change required in `inferenceService.ts`

Add `'rfq-assist'` to the `AiTaskType` union:

```typescript
// Current:
export type AiTaskType = 'insights' | 'negotiation-advice';

// After this unit:
export type AiTaskType = 'insights' | 'negotiation-advice' | 'rfq-assist';
```

This is the only change to `inferenceService.ts` in this unit. No other inference
logic changes. The existing `runAiInference()` function is called unchanged.

---

## F. Output Type: `RfqAssistSuggestions`

The AI returns a JSON object. The implementation validates this with a Zod schema before
trusting any field. No raw AI output is returned to the caller.

```typescript
export interface RfqAssistSuggestions {
  /**
   * Suggested requirement title. Max 200 chars (matches Rfq.requirementTitle VarChar(200)).
   * Null if AI cannot determine a useful suggestion.
   */
  requirementTitle: string | null;

  /**
   * Suggested quantity unit. Max 50 chars (matches Rfq.quantityUnit VarChar(50)).
   * Must be a recognizable textile quantity unit (e.g., "meters", "kg", "pieces").
   */
  quantityUnit: string | null;

  /**
   * Suggested urgency. One of: 'STANDARD' | 'URGENT' | 'FLEXIBLE'.
   * Null if AI cannot determine from context.
   */
  urgency: 'STANDARD' | 'URGENT' | 'FLEXIBLE' | null;

  /**
   * Whether a sample is suggested. Null if AI cannot determine.
   */
  sampleRequired: boolean | null;

  /**
   * Suggested delivery country (ISO 3166-1 alpha-3, 3 chars max).
   * Null if AI cannot determine.
   */
  deliveryCountry: string | null;

  /**
   * Suggested stage requirement attributes as key-value pairs.
   * Subset of the catalog item's catalogStage schema.
   * Null or empty if no stage-specific attributes can be inferred.
   */
  stageRequirementAttributes: Record<string, unknown> | null;

  /**
   * Plain-language explanation of reasoning behind suggestions.
   * Max 500 chars. Stored as promptSummary/responseSummary in ReasoningLog.
   */
  reasoning: string;
}
```

### Zod validation schema (implementation guide)

```typescript
const rfqAssistSuggestionsSchema = z.object({
  requirementTitle: z.string().max(200).nullable(),
  quantityUnit: z.string().max(50).nullable(),
  urgency: z.enum(['STANDARD', 'URGENT', 'FLEXIBLE']).nullable(),
  sampleRequired: z.boolean().nullable(),
  deliveryCountry: z.string().max(3).nullable(),
  stageRequirementAttributes: z.record(z.unknown()).nullable(),
  reasoning: z.string().max(500),
});
```

If Zod validation fails, the endpoint returns `{ suggestions: null, parseError: true }` with HTTP 200.
The AI call is still logged in `ReasoningLog` and `AuditLog`.

---

## G. Prompt Design (Implementation Guide)

The system prompt must include the following constraints verbatim or in substance:

```
You are a B2B textile procurement assistant. Your task is to help a buyer complete
an RFQ (Request for Quotation) for a textile catalog item.

CONSTRAINTS:
- Do NOT suggest prices, price ranges, or monetary values of any kind.
- Do NOT reference supplier identity, contact details, or org IDs.
- Do NOT infer or suggest delivery dates or delivery locations.
- Do NOT include personal information (email, phone, name) in any output.
- Output ONLY the JSON object described below. No prose outside the JSON.
- If you cannot determine a useful suggestion for a field, output null for that field.
- The reasoning field must be a single sentence max 500 characters.

OUTPUT FORMAT (JSON only):
{
  "requirementTitle": string | null,
  "quantityUnit": string | null,
  "urgency": "STANDARD" | "URGENT" | "FLEXIBLE" | null,
  "sampleRequired": boolean | null,
  "deliveryCountry": string | null (ISO 3166-1 alpha-3),
  "stageRequirementAttributes": object | null,
  "reasoning": string
}
```

The user message is assembled from:
1. `catalogItemText` — the catalog item description
2. `structuredRequirementText` — the buyer's current RFQ draft fields
3. `retrievedChunks` — RAG context (if available, clearly labeled)

---

## H. Route Specification: `POST /api/tenant/rfqs/:id/ai-assist`

### Authentication

- Middleware: `tenantAuthMiddleware` + `databaseContextMiddleware`
- `orgId` derived from JWT only (never from request body)
- Buyer plane: `rfq.orgId` must equal `dbContext.orgId` (tenant isolation)

### Request

```
POST /api/tenant/rfqs/:id/ai-assist
Authorization: Bearer <JWT>
Content-Type: application/json

{
  // No request body fields required.
  // All context is derived from the existing RFQ record.
}
```

Path parameter: `id` — UUID of an existing buyer-owned RFQ.

### Response: 200 OK (success)

```json
{
  "success": true,
  "data": {
    "rfqId": "<uuid>",
    "suggestions": {
      "requirementTitle": "...",
      "quantityUnit": "meters",
      "urgency": "STANDARD",
      "sampleRequired": false,
      "deliveryCountry": "IND",
      "stageRequirementAttributes": { "weaveType": "plain" },
      "reasoning": "Based on the catalog item attributes and buyer draft."
    },
    "fieldSourceMeta": {
      "requirementTitle": "AI_SUGGESTED",
      "quantityUnit": "AI_SUGGESTED",
      "urgency": "AI_SUGGESTED",
      "sampleRequired": "AI_SUGGESTED",
      "deliveryCountry": "AI_SUGGESTED",
      "stageRequirementAttributes": "AI_SUGGESTED"
    },
    "humanConfirmationRequired": true,
    "reasoningLogId": "<uuid>"
  }
}
```

### Response: 200 OK (AI parse failure — non-fatal)

```json
{
  "success": true,
  "data": {
    "rfqId": "<uuid>",
    "suggestions": null,
    "parseError": true,
    "humanConfirmationRequired": true
  }
}
```

### Error responses

| Status | Code | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | RFQ not found or does not belong to caller's org |
| 404 | `NOT_FOUND` | RFQ's catalog item not found |
| 429 | `RATE_LIMIT_EXCEEDED` | > 60 AI requests/min for this tenant |
| 429 | `BUDGET_EXCEEDED` | AI budget exhausted for this tenant |
| 408 | `AI_TIMEOUT` | Gemini inference timeout (8000ms) |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT / database context |

### RFQ status constraint

The endpoint is callable for any `rfq.status` ∈ `{ OPEN, RESPONDED }`.
Status `CLOSED` returns `404` (consistent with standard RFQ access control).

### Idempotency

`runAiInference` enforces a 24-hour idempotency window keyed by
`{ orgId, taskType: 'rfq-assist', sourceId: rfqId }`. Within the window,
a repeat call returns the cached `ReasoningLog` result without calling Gemini.

---

## I. `fieldSourceMeta` Integration

The `Rfq.fieldSourceMeta` column (type Json) already exists on the `rfqs` table.
It is readable and writable via the existing `CreateRfqRequest` and `mapBuyerRfqListItem` paths.

**AI assist does not write to `fieldSourceMeta` automatically.**

The response includes a `fieldSourceMeta` payload indicating which fields were AI-suggested.
The buyer is shown these suggestions; the frontend (separate unit) is responsible for
persisting the accepted fields and the `fieldSourceMeta` markers via the existing
`PATCH /api/tenant/rfqs/:id` route (or a dedicated confirm endpoint — out of scope here).

### fieldSourceMeta entry format

```json
{
  "requirementTitle": "AI_SUGGESTED",
  "quantityUnit": "AI_SUGGESTED",
  "urgency": "AI_SUGGESTED"
}
```

Valid `fieldSourceMeta` source values (defined in AI Foundation contracts):
- `"USER"` — user entered directly
- `"AI_SUGGESTED"` — AI proposed, human accepted
- `"SYSTEM"` — system-derived

---

## J. PII Guard Integration

PII scanning is applied to `buyerMessage` before it enters the AI prompt.

```
scanForPii(rfq.buyerMessage)  →  PiiScanResult { hasMatches, categories, matchCount }
  if hasMatches → redactPii(rfq.buyerMessage) → use redacted text in structuredRequirementText
  else          → use original buyerMessage
```

PII categories detected by `piiGuard.ts`: EMAIL, PHONE, CARD, AADHAAR, PAN.

If `buyerMessage` is null or empty, the PII scan is skipped.

`RFQAssistantContext.buyerMessagePiiRedacted` is set to `true` when redaction occurred.
This is logged in `ReasoningLog.promptSummary` for audit visibility but is NOT surfaced
to the API caller.

---

## K. RAG Context Integration

The existing `ragContextBuilder.ts` is invoked with:

```typescript
buildRagContext({
  orgId: dbContext.orgId,
  sourceType: 'CATALOG_ITEM',
  query: catalogItemText,   // use catalog item text as query vector
  topK: 5,
  minSimilarity: 0.30,
  maxChunks: 3,             // MAX_CONTEXT_CHUNKS constant
})
```

If RAG retrieval returns 0 qualifying chunks (minSimilarity threshold not met), the
`retrievedChunks` field in `RFQAssistantContext` is set to `null` and the prompt
proceeds without RAG context. This is the expected path for catalog items with no
vector embeddings yet.

RAG chunks are labeled in the prompt with a clear separator to prevent prompt injection:

```
--- RELATED CATALOG CONTEXT (retrieved) ---
[chunk text]
--- END CATALOG CONTEXT ---
```

---

## L. Audit Trail

The existing `runAiInference` writes two audit records atomically:

### ReasoningLog (existing model)

| Field | Value |
|---|---|
| `taskType` | `'rfq-assist'` |
| `orgId` | `dbContext.orgId` |
| `sourceId` | `rfq.id` |
| `promptSummary` | First 500 chars of assembled prompt text |
| `responseSummary` | First 500 chars of raw AI response |
| `modelId` | `gemini-1.5-flash` |
| `estimatedTokens` | Computed from char count |
| `piiRedacted` | `true` if buyerMessage was redacted |

### AuditLog (existing model)

| Field | Value |
|---|---|
| `realm` | `'TENANT'` |
| `tenantId` | `dbContext.orgId` |
| `action` | `ai.inference.generate` |
| `entity` | `'rfq'` |
| `entityId` | `rfq.id` |
| `metadataJson` | `{ taskType, rfqId, catalogItemId, piiRedacted, chunksUsed }` |

Post-transaction event: `emitAiEventBestEffort('ai.inference.generate', ...)` (existing pattern).

---

## M. Forbidden Field Enforcement

The `buildRfqAssistantContext()` function must call `assertNoForbiddenAiFields()` before
any data enters the AI prompt. This is a hard assertion (throws on violation).

### Fields that must be stripped before context assembly

```typescript
assertNoForbiddenAiFields({
  price: catalogItem.price,          // MUST NOT be present — stripped by buildCatalogItemVectorText
  item_unit_price: rfqDetail.price,  // MUST NOT be present — excluded by design
  publicationPosture: ...,           // MUST NOT be present
});
```

The `buildCatalogItemVectorText()` function already structurally excludes `price` and
`publicationPosture`. The `assembleStructuredRfqRequirementSummaryText()` function already
structurally excludes `deliveryLocation`, `targetDeliveryDate`, `requirementConfirmedAt`.

These structural exclusions are defense layer 1. `assertNoForbiddenAiFields()` is defense
layer 2 and must be called regardless.

---

## N. Implementation Sequence (for the implementation unit)

This section is guidance for the future implementation unit. It is not executed in this design unit.

```
1. Add 'rfq-assist' to AiTaskType in inferenceService.ts
   Files: server/src/services/ai/inferenceService.ts
   Test: server/src/services/ai/__tests__/ai-data-contracts.test.ts (extend task type test)

2. Add RFQAssistantContext to aiContextPacks.ts
   Files: server/src/services/ai/aiContextPacks.ts
   Test: server/src/services/ai/__tests__/ai-context-packs.test.ts (add RFQAssistantContext type guard)

3. Implement buildRfqAssistantContext() in a new file:
   Files: server/src/services/ai/rfqAssistContextBuilder.ts (NEW)
   Test: server/src/services/ai/__tests__/rfq-assist-context-builder.test.ts (NEW)
   Calls: assembleStructuredRfqRequirementSummaryText, buildCatalogItemVectorText,
          stripForbiddenAiFields, scanForPii/redactPii, ragContextBuilder

4. Implement parseRfqAssistSuggestions() and RfqAssistSuggestions type:
   Files: server/src/services/ai/rfqAssistSuggestions.ts (NEW)
   Test: server/src/services/ai/__tests__/rfq-assist-suggestions.test.ts (NEW)
   Uses: Zod schema defined in Section F above

5. Implement runRfqAssistInference():
   Files: server/src/services/ai/rfqAssistService.ts (NEW)
   Test: unit test for prompt assembly and output parsing
   Calls: runAiInference({ taskType: 'rfq-assist', ... })

6. Add POST /api/tenant/rfqs/:id/ai-assist route to tenant.ts
   Files: server/src/routes/tenant.ts
   Uses: tenantAuthMiddleware, databaseContextMiddleware,
         resolveRfqCatalogItemTarget, buildRfqAssistantContext, runRfqAssistInference

7. Add route to OpenAPI tenant contract
   Files: shared/contracts/openapi.tenant.json
   Operation: POST /tenant/rfqs/{id}/ai-assist

8. Update governance/control files
   Files: governance/control/OPEN-SET.md, NEXT-ACTION.md, SNAPSHOT.md
```

### Pre-commit validation gates (for the implementation unit)

```
pnpm --filter server typecheck
pnpm --filter server test
pnpm --filter server lint
GET /api/health → 200
POST /api/tenant/rfqs/:id/ai-assist → 200 with valid suggestions shape
```

---

## O. Constraints Summary

| Constraint | Source |
|---|---|
| No price in AI context | AI_FORBIDDEN_FIELD_NAMES, aiForbiddenData.ts |
| No PII in prompt | piiGuard.ts scan + redact |
| orgId from JWT only | databaseContextMiddleware |
| rfq.orgId == dbContext.orgId | Tenant isolation (buyer-plane only) |
| Human confirmation required | RFQAssistantContext.humanConfirmationRequired: true |
| AI does not write rfqs table | Output is suggestions only — no auto-apply |
| fieldSourceMeta not written by AI route | Buyer must accept via existing PATCH route |
| ReasoningLog + AuditLog atomic | runAiInference existing pattern |
| Idempotency 24h | runAiInference existing pattern |
| Rate limit 60/min per tenant | runAiInference existing pattern |
| No shadow DB, no migrate dev | TexQtic DB governance |
| No new Prisma migrations | rfqAssistantAttributes in stageRequirementAttributes (Json) |

---

*Design artifact for TECS-AI-RFQ-ASSISTANT-MVP-001. Implementation not included.*  
*Last updated: DESIGN_COMPLETE.*
