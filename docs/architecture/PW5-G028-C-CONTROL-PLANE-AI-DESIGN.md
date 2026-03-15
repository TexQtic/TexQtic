# PW5-G028-C-CONTROL-PLANE-AI — Backend Design Gate

**Status:** DESIGN-GATE ARTIFACT  
**Design unit:** PW5-G028-C-CONTROL-PLANE-AI-DESIGN  
**Produced:** 2026-03-15  
**Author:** Design gate (read-only — no runtime code changed)  
**Unlocks:** PW5-G028-C-CONTROL-PLANE-AI (implementation)  
**Blocks cleared:** TECS-FBW-AIGOVERNANCE  
**Prior closed units:** PW5-AI-PLAN through PW5-G028-B1-CATALOG-INDEXER  

---

## Objective

Produce the minimum authoritative backend design needed to unlock future
implementation of the control-plane AI backend, resolving the
TECS-FBW-AIGOVERNANCE design gate that has blocked PW5-G028-C since initial
planning. This artifact defines scope, route/service boundaries, authority
model, audit/event expectations, and implementation guardrails. No
implementation occurs here.

---

## Problem Statement

TexQtic has a fully operational tenant-plane AI surface (`/api/ai/*` — three
routes, Tenant Inference Service, PII guard, rate-limit, idempotency, RAG,
audit/reasoning logs). The frontend `AiGovernance.tsx` control-plane component
exists but is a UI stub that only fetches the tenant list; it has no real
backend. There is no backend AI route, service, or audit path that allows a
SUPER_ADMIN or authorized admin operator to invoke AI on behalf of the
platform — either for cross-tenant analysis or for platform-global governance
reasoning.

The absence of a designed backend means any implementation attempt would
produce ad hoc code that violates one or more constitutional constraints:
RLS integrity, admin bypass auditability, realm separation, or TIS boundary
sovereignty. This design resolves that ambiguity before implementation.

---

## In-Scope

1. Backend authority model for control-plane AI calls.
2. Route namespace and plugin boundary.
3. Service boundary and relationship to the existing Tenant Inference
   Service (TIS).
4. Trust model: how admin identity is determined and what it authorizes.
5. Handling of `orgId`/tenant context for global vs. org-targeted queries.
6. Audit record requirements for every admin AI call.
7. Reasoning artifact storage model and its constraints.
8. Event/audit emission expectations and whether new event names are required.
9. Safety controls: which TIS controls are reused, which required wrapping.
10. Ordered implementation slice sequence for future unit authorization.

---

## Out-of-Scope

- Implementation of any runtime route, service, or migration (design unit only).
- PW5-SHADOW-QUERY-FIX (separate, lower urgency, not folded here).
- Redesign of the tenant AI surface or TIS (closed units; constitutionally frozen).
- Generic RAG platform redesign.
- Prompt versioning registry UI (the current `AiGovernance.tsx` stub — a
  separate frontend unit after backend is live).
- Event-domain extension for `ai.control.*` names (flagged as follow-on
  dependency; first slice uses a governed workaround defined below).

---

## Current State

**Tenant AI surface (operational, closed):**

| Route | Auth | Service | Status |
|---|---|---|---|
| `GET /api/ai/insights` | `tenantAuthMiddleware` + `databaseContextMiddleware` | TIS (`inferenceService.ts`) | ✅ Operational |
| `POST /api/ai/negotiation-advice` | `tenantAuthMiddleware` + `databaseContextMiddleware` | TIS (`inferenceService.ts`) | ✅ Operational |
| `GET /api/ai/health` | `tenantAuthMiddleware` | Inline | ✅ Operational |

**TIS safety controls (tenant-plane, operational):**

- Rate limit: 60 req/60 s keyed on `orgId` (in-memory `Map`)
- Idempotency: 24-hour replay via `Idempotency-Key`, stored as `reasoning_logs.request_id = idem:<key>`
- RAG retrieval: `runRagRetrieval(tx, orgId, prompt)` from `ragContextBuilder.ts`
- PII guard: `piiGuard.ts` — pre-send redaction + post-receive blocking (`redactPii`, `scanForPii`)
- Budget enforcement: `loadTenantBudget` / `enforceBudgetOrThrow` / `upsertUsage` (DB-backed, per tenant per month)
- Reasoning/audit write: atomic Prisma transaction
- Event emission: `emitAiEventBestEffort()` via `aiEmitter.ts`, post-transaction, non-blocking

**Control-plane auth (operational):**

- Plugin-level `adminAuthMiddleware` hook on entire `controlRoutes` plugin.
- Populates `request.adminId`, `request.adminRole`, `request.isAdmin`.
- Derived from admin JWT signed by admin realm; completely separate from tenant JWT.
- `requireAdminRole('SUPER_ADMIN')` preHandler available for SUPER_ADMIN-only gates.
- DB context via `withAdminContext()` helper: sentinel `orgId`, `realm: 'control'`, sets `app.is_admin = 'true'`.

**Critical schema constraint (blocking, discovered during design):**

`reasoning_logs.tenant_id` is `NOT NULL` with a FK to `tenants.id`. Admin
AI calls CANNOT write to this table without using a real or sentinel tenant ID.
Using a sentinel breaks the FK; using a real tenant ID is semantically wrong
and a data corruption hazard. This table is **not usable for control-plane AI
reasoning storage** without a future schema extension. See Dependency Analysis.

**Frontend stub state:**

`AiGovernance.tsx` fetches tenant list and renders hardcoded prompt registry
stubs. It has no AI API calls. It is safe to leave unchanged during design and
implementation; frontend wiring is a follow-on unit.

---

## Proposed Backend Boundary

### Q1 — What exact backend problem does PW5-G028-C-CONTROL-PLANE-AI solve?

It provides a backend surface that allows SUPER_ADMIN operators to invoke
Gemini AI for platform-level governance reasoning — analysis that is not scoped
to a single tenant's data but to platform-global state or cross-tenant admin
view — while maintaining full auditability, realm separation, and RLS safety.

### What "control-plane AI" means in TexQtic

**Control-plane AI** is AI invoked by an authenticated admin actor (not a
tenant user) for platform governance, platform-level analysis, and
administration purposes. It is constitutionally separate from tenant AI:

| Dimension | Tenant AI | Control-plane AI |
|---|---|---|
| Invoker | Authenticated tenant user | Authenticated admin (SUPER_ADMIN) |
| JWT realm | Tenant realm | Admin realm |
| Data scope | RLS-enforced org data | Platform-global or admin-visible cross-tenant data |
| Budget model | Per-tenant monthly token budget (DB) | Admin request cap (no tenant budget) |
| Rate limit key | `orgId` | `adminId` |
| Audit actor | `USER` (tenant member) | `ADMIN` |
| Reasoning storage | `reasoning_logs` (tenant FK required) | Admin audit `metadataJson` (first slice) |
| Idempotency | Required (Idempotency-Key header) | Optional for first slice; recommended for later |
| RAG retrieval | Org-scoped vector store | Platform-global vector store or none (first slice) |
| Event realm | `TENANT` | `ADMIN` |

**In-scope actions for control-plane AI:**

- Platform-level AI insights (e.g., cross-tenant trade volume analysis,
  policy compliance synthesis, platform health narrative)
- Per-org AI analysis on admin request (e.g., "summarize AI activity for
  org X") — targeted org mode, SUPER_ADMIN only, second implementation slice
- Future: admin-initiated prompt version management, AI budget policy setting

**Explicitly out-of-scope (first implementation slice):**

- Per-org targeted mode (second slice, after first slice is verified)
- Frontend wiring of `AiGovernance.tsx` (separate follow-on unit)
- Event-domain extension for `ai.control.*` names (follow-on)
- RAG retrieval from platform-global vector store (no global store exists; first slice is prompt-only)
- Idempotency replay (optional; first slice is stateless per-request)
- Any action that modifies tenant data or tenant AI configuration

---

## Authority and Trust Model

### Q2 — Which user/operator personas are allowed to invoke control-plane AI?

**First implementation slice:** SUPER_ADMIN only.

The `requireAdminRole('SUPER_ADMIN')` preHandler is the explicit gate. This
matches the pattern already established for impersonation routes and other
sensitive SUPER_ADMIN operations.

Future slices may relax to `ADMIN` role for read-only governance views, but
this requires explicit design authorization at that time.

### Q6 — What trust source determines authority?

The **admin JWT** is the sole trust source. It is verified by
`adminJwtVerify()` inside `adminAuthMiddleware`. Fields populated on `request`:
- `request.adminId` — verified admin UUID
- `request.adminRole` — `'SUPER_ADMIN'` or other admin role
- `request.isAdmin` — `true`

**What must never be trusted from client input:**
- Any claim of admin identity in the request body or query parameters.
- Any `orgId` or `tenantId` asserted in the request body as a trust identity.
  (Admin may supply `targetOrgId` as a *filter parameter* validated server-side
  in the per-org targeted slice only; it is never used as an RLS trust assertion.)
- Any claim of AI budget, quota, or permission level from request body.

### Q7 — How are tenant/org identifiers handled safely?

**Global mode (first slice):** Admin is invoking platform-level AI.
- DB context: `withAdminContext()` — sentinel `orgId`, `is_admin = 'true'`.
- No tenant data is targeted; model prompt consists of platform-global
  aggregate context only (admin-supplied prompt, no RAG in first slice).
- No `orgId` is accepted from the client.

**Per-org targeted mode (second slice, not implemented in first):**
- Admin supplies `targetOrgId` as a **query parameter** (a filter, never a
  trust assertion).
- Service layer validates `targetOrgId` via DB lookup to confirm org exists.
- DB context: `withAdminContext()` with `IS_ADMIN = true`; RLS uses admin arm.
- `targetOrgId` flows into prompt context as an informational scope hint only.
- The sentinel admin DB context is used regardless — org data visibility is
  via the `is_admin = true` RLS bypass, not by impersonating the tenant.

### Q8 — Does control-plane AI act on one org at a time, many orgs, or platform-global state?

**First slice:** Platform-global only (model prompt + system prompt; no org filter).  
**Second slice:** Optionally per-org (admin supplies `targetOrgId` query param).  
**Never:** Many orgs in one request (no batch org analysis), nor tenant-impersonated context.

---

## Route Design

### Q3 — What exact route namespace should own it?

```
/api/control/ai/*
```

This is the correct and constitutional choice:
- `/api/control/*` is already governed by `controlRoutes` plugin.
- `adminAuthMiddleware` is registered at plugin-level via `fastify.addHook('onRequest', ...)`.
- Adding `/api/control/ai/*` sub-routes means admin auth is inherited
  automatically — identical to existing control-plane routes.
- Realm guard maps `/api/control` to `admin` realm (confirmed in `realmGuard.ts`).
- No new plugin or new auth hook is required.

**First-slice route:**

```
POST /api/control/ai/insights
```

- Accepts: `{ prompt: string, systemContext?: string }` (validated via Zod)
- `prompt` max length: 1000 characters
- Bearer: admin JWT (verified by inherited plugin hook)
- Prehandler: `requireAdminRole('SUPER_ADMIN')`
- Response: `{ ok: true, data: { insightText: string, tokensUsed: number, requestId: string, auditLogId: string } }`
- Error codes: `AI_UNAVAILABLE`, `AI_RATE_LIMIT_EXCEEDED`, `AI_TOKEN_CAP_EXCEEDED`, `UNAUTHORIZED`, `FORBIDDEN`

**`GET /api/control/ai/health`** (second sub-route, same slice):
- Returns `{ ok: true, data: { configured: boolean } }` using `isGenAiConfigured()`.
- Prehandler: `requireAdminRole('SUPER_ADMIN')` (admin-only, not public).

---

## Service Design

### Q4 — What exact service layer should own its execution?

A new service: `server/src/services/ai/controlPlaneInferenceService.ts`

This is a **separate service from TIS** (`inferenceService.ts`). The two
diverge sufficiently in authority model, rate-limit semantics, budget model,
and storage strategy that sharing TIS directly would require embedding
control-plane-specific conditionals throughout TIS, which violates TIS's
tenant-only sovereignty (a closed unit).

### Q5 — Should it reuse the current inference service boundary, and if so how?

**Reuse (unchanged import):**
| Utility | Reuse | Notes |
|---|---|---|
| `generateContent()` | ✅ Yes (private in TIS) | Must be extracted to shared utility or duplicated in CPIS; see below |
| `isGenAiConfigured()` | ✅ Yes, exported from TIS | Import directly |
| `piiGuard.ts` (`redactPii`, `scanForPii`) | ✅ Yes, unchanged | Apply to all admin AI prompts/responses |
| `emitAiEventBestEffort()` | ✅ Yes, unchanged | Used for event emission; same best-effort semantics |

**Extraction note:** `generateContent()` is currently private (unexported) in
TIS. For CPIS to reuse it, either: (a) extract it to a new shared utility file
`server/src/services/ai/geminiClient.ts` and import from both TIS and CPIS, or
(b) duplicate it in CPIS with the same semantics. Option (a) is preferred to
avoid logic drift, and is the recommended implementation decision for the
implementation unit. **This does not require modifying TIS's public API.**

**Not reused (CPIS must implement independently):**
| Concern | TIS behavior | CPIS behavior |
|---|---|---|
| Rate limiting | Per-`orgId`, 60/60s, in-memory Map | Per-`adminId`, 20/60s, in-memory Map |
| Budget enforcement | Per-tenant monthly DB budget | Token cap per request (no DB budget); max 4000 tokens |
| Idempotency | 24-hour replay via `reasoning_logs` | Omitted in first slice (admin calls are not user-facing at scale) |
| RAG retrieval | Org-scoped vector store, `runRagRetrieval()` | Omitted in first slice; no platform-global vector store exists |
| Reasoning log write | `reasoning_logs` (tenant FK, NOT NULL) | Admin audit `metadataJson` (see Reasoning Storage) |
| DB context | `withDbContext(prisma, dbContext, ...)` tenant context | `withAdminContext()` — sentinel + `is_admin='true'` |
| Idempotency key derivation | `idem:<key>` stored in `reasoning_logs.request_id` | N/A first slice |

**CPIS execution order (first slice):**

```
1. Admin authentication verified (inherited from plugin hook)
2. SUPER_ADMIN role enforcement (preHandler requireAdminRole)
3. Admin rate limit check (adminId key, 20/60s, in-memory)
4. Token cap preflight check (static: prompt length estimate vs. 4000 token cap)
5. PII pre-send redaction (redactPii on prompt)
6. Gemini model invocation via generateContent() (8s timeout, same as TIS)
7. PII post-receive scan (scanForPii on response text)
8. Admin audit log write via writeAuditLog / createAdminAudit (withAdminContext)
9. Best-effort AI event emission (emitAiEventBestEffort, post-write, non-blocking)
10. Return result to route handler
```

Steps 8 and 9 are **not atomic** (no Prisma transaction wrapping both) because
`reasoning_logs` is unusable for admin context and the audit write is the
sole persistence target. This is a deliberate first-slice simplification; a
dedicated `admin_reasoning_logs` table (future dependency) would allow
atomicity.

---

## Audit / Reasoning / Event Model

### Q9 — What audit records are mandatory?

Every control-plane AI invocation MUST write an audit record via the existing
`writeAuditLog` pattern with:
- `action: 'AI_CONTROL_INSIGHTS'` (new audit action string; using existing
  `writeAuditLog` schema; no DB migration required for audit action strings)
- `entityType: 'platform'`
- `entityId: ADMIN_SENTINEL_ID` (or `targetOrgId` UUID for per-org targeted mode)
- `actorType: 'ADMIN'`
- `actorId: request.adminId`
- `metadataJson`: must include:
  - `requestId` (trace UUID)
  - `model` (model name)
  - `tokensUsed` (actual token estimate)
  - `promptSummary` (first 200 chars of the redacted prompt, NOT raw)
  - `responseSummary` (first 200 chars of the redacted response, NOT raw)
  - `hadInferenceError: boolean`
  - `adminRole: request.adminRole`
  - `targetOrgId` (only in per-org targeted mode, else omit)

The audit record serves as the **reasoning artifact** for the first
implementation slice, embedded in `metadataJson`. A dedicated reasoning log
table is a future implementation dependency.

### Q10 — What event records are mandatory?

The following events MUST be emitted (best-effort, non-blocking, via
`emitAiEventBestEffort()`):

| Trigger | Event name (first slice) | Realm | tenantId |
|---|---|---|---|
| Successful admin AI inference | `ai.inference.generate` | `ADMIN` | `null` |
| Admin AI inference error | `ai.inference.error` | `ADMIN` | `null` |
| Admin rate limit exceeded | *(emit not required; 429 response only)* | — | — |
| Token cap exceeded | `ai.inference.budget_exceeded` | `ADMIN` | `null` |
| PII redacted in admin prompt | `ai.inference.pii_redacted` | `ADMIN` | `null` |
| PII detected in admin response | `ai.inference.pii_leak_detected` | `ADMIN` | `null` |

### Q11 — Are new event names required later, or can existing names be reused?

**First slice:** Existing `ai.inference.*` names are reused with `realm: 'ADMIN'`
and `tenantId: null`. This is safe because:
- `EventEnvelope.tenantId` is nullable per the schema.
- `EventEnvelope.realm` is `'ADMIN' | 'TENANT'` per the type.
- Existing `knownEventEnvelopeSchema` accepts `tenantId: null`.
- Queries that distinguish admin vs. tenant AI events can filter by `realm`.

**Future:** Dedicated `ai.control.*` event names (`ai.control.insights.generate`,
etc.) are the correct long-term architecture. This requires a separate
event-domain extension unit analogous to PW5-AI-EVENT-DOMAIN. This is recorded
as a future dependency but does NOT block the first implementation slice.

---

## Safety / Governance Constraints

### Q12 — Which existing safety controls apply unchanged?

| Control | Applied unchanged in CPIS |
|---|---|
| PII pre-send redaction (`redactPii`) | ✅ Yes |
| PII post-receive scan (`scanForPii`) | ✅ Yes |
| Gemini model timeout (8s) | ✅ Yes |
| `isGenAiConfigured()` degraded mode | ✅ Yes |
| Admin JWT verification (inherited from plugin hook) | ✅ Yes |
| Realm guard (admin JWT on admin route) | ✅ Yes |
| Audit write requirement | ✅ Yes (adapted for admin context) |
| Best-effort event emission | ✅ Yes |
| No secrets in event payloads | ✅ Yes |

### Q13 — Which controls require control-plane-specific wrapping?

| Control | TIS behavior | Required CPIS adaptation |
|---|---|---|
| Rate limiting | `orgId`-keyed, 60/60s | `adminId`-keyed, 20/60s |
| Budget enforcement | DB-backed per-tenant monthly budget | Static token cap per request (4000 tokens); no DB budget table |
| Reasoning log | `reasoning_logs` table, tenant FK | `metadataJson` in admin audit log (first slice); dedicated table (future) |
| DB context | Tenant `withDbContext` | `withAdminContext()` (sentinel + `is_admin='true'`) |
| Idempotency | `Idempotency-Key` header, 24h replay | Omitted (first slice); can be added in later slice |
| RAG retrieval | Org-scoped `runRagRetrieval` | Omitted (first slice); no platform-global vector store |

**Required safeguards:**

- **PII:** All prompts and responses MUST pass through `piiGuard.ts`; no exception for admin.
- **Rate limiting:** CPIS MUST implement admin-rate-limit before model invocation. Admin AI must never be unlimited; administrator credential compromise must not enable unbounded model abuse.
- **Idempotency:** Omitted in first slice by design. Admin insights callers are expected to be manual, not automated pipelines.
- **Authorization:** `requireAdminRole('SUPER_ADMIN')` preHandler is NON-NEGOTIABLE on every CPIS route. No CPIS route may be added that relaxes this without explicit design update.
- **Prompt length cap:** Zod schema must enforce `prompt.max(1000)` to prevent prompt injection via large payloads.
- **No client-trusted identity:** `orgId`, `adminId`, AI model, and system instruction must all be server-derived or server-enforced; no client value overrides server defaults.
- **Failure semantics:** Model invocation failure → emit `ai.inference.error` event, write audit with `hadInferenceError: true`, return degraded-mode response (same pattern as TIS). Do NOT expose raw model error to client.

---

## Dependency Analysis

### Blocking dependencies for first implementation slice

| Dependency | Status | Notes |
|---|---|---|
| `generateContent()` extraction or duplication | **Must resolve at implementation** | Currently private in TIS; either extract to `geminiClient.ts` shared utility or duplicate in CPIS. Decision: extraction preferred. |
| `isGenAiConfigured()` export from TIS | ✅ Already exported | Direct import |
| `piiGuard.ts` (`redactPii`, `scanForPii`) | ✅ Already exported | Direct import |
| `emitAiEventBestEffort()` | ✅ Already exported | Direct import |
| Admin audit write (`writeAuditLog`, `createAdminAudit`) | ✅ Already operational | Reuse pattern from `control.ts` |
| `withAdminContext()` | ✅ Available in `control.ts` | Extract to shared helper or replicate in CPIS; currently private in `control.ts` |
| Admin JWT + `requireAdminRole` | ✅ Operational | Plugin hook inheritance |
| `reasoning_logs` table | ❌ **Not usable** | `tenant_id NOT NULL FK` blocks admin use without schema extension |

### Non-blocking future dependencies (not part of first slice)

| Dependency | When needed | Notes |
|---|---|---|
| `admin_reasoning_logs` table | Second slice or standalone governance unit | New table with nullable `org_id`, admin context, prompt/response summaries |
| `ai.control.*` event names | Follow-on event-domain extension unit | Analogous to PW5-AI-EVENT-DOMAIN; adds `ai.control.insights.generate`, etc. |
| Platform-global RAG vector store | Third slice or separate unit | No platform-global vector store exists; would require separate ingestion design |
| Per-org targeted AI mode | Second slice | After first slice is verified; requires `targetOrgId` validation logic |
| Frontend wiring (`AiGovernance.tsx`) | After backend verified | Separate frontend unit |

---

## Recommended Implementation Slice Sequence

### Slice 1 — CPIS + Platform-Global Admin Insights (FIRST UNIT AFTER THIS DESIGN)

**Scope:**
- `server/src/services/ai/controlPlaneInferenceService.ts` (NEW)
- `server/src/routes/control/ai.ts` (NEW — sub-plugin registered in `control.ts`)
- Registering the sub-plugin in `server/src/routes/control.ts` (MODIFIED)
- `server/src/services/ai/geminiClient.ts` (NEW — if extracting `generateContent`)
- `shared/contracts/openapi.control-plane.json` (MODIFIED — add `POST /api/control/ai/insights` + `GET /api/control/ai/health`)

**What Slice 1 implements:**
- `POST /api/control/ai/insights` — SUPER_ADMIN only, platform-global mode
- `GET /api/control/ai/health` — SUPER_ADMIN only, `isGenAiConfigured()` passthrough
- Admin-rate-limit (20/60s, `adminId`-keyed, in-memory Map)
- Token cap preflight (4000 token estimate cap)
- PII guard on both paths
- Admin audit write via `writeAuditLog` (with rich `metadataJson` reasoning record)
- Event emission via `emitAiEventBestEffort()` (`ai.inference.*` names, `realm: 'ADMIN'`, `tenantId: null`)

**What Slice 1 explicitly excludes:**
- Per-org targeted mode (no `targetOrgId` parameter)
- RAG retrieval (no platform-global store)
- Idempotency (no `Idempotency-Key` handling)
- `admin_reasoning_logs` table
- Frontend wiring

**Blockers that must be resolved before Slice 1 can begin:**
1. This design gate must be formally approved (complete).
2. Decision on `generateContent()` extraction vs. duplication must be made
   in the implementation unit; no separate pre-requisite unit required.
3. `withAdminContext()` must be accessible from CPIS — either by moving to
   a shared lib file or by reimplementing identically. Recommend moving to
   `server/src/lib/adminContext.ts` in the implementation unit.

### Slice 2 — Per-Org Targeted Mode

Requires Slice 1 to be verified complete. Adds:
- `targetOrgId` optional query parameter to `POST /api/control/ai/insights`
- Server-side org validation
- Prompt context injection with org metadata

### Slice 3 — `admin_reasoning_logs` Schema + Dedicated Reasoning Storage

Requires separate design approval and a governed schema migration. Adds:
- New `admin_reasoning_logs` table
- Atomic write of reasoning + admin audit log
- Idempotency replay option

### Slice 4 — `ai.control.*` Event Domain Extension

Standalone governance unit, analogous to PW5-AI-EVENT-DOMAIN. No implementation
dependency on Slices 2 or 3.

### Slice 5 — Frontend Wiring (`AiGovernance.tsx`)

After backend Slice 1 is verified. Separate frontend unit. Replaces stub with
real API call to `POST /api/control/ai/insights`.

---

## Immediate Next Unit After Design Approval

### Q15 — What is the single smallest next implementation unit?

**PW5-G028-C-IMPL-SLICE-1** — Implement `POST /api/control/ai/insights` and
`GET /api/control/ai/health` at `/api/control/ai/*`, backed by a new
`controlPlaneInferenceService.ts`.

Allowlist for that unit:
- `server/src/services/ai/controlPlaneInferenceService.ts` (NEW)
- `server/src/routes/control/ai.ts` (NEW)
- `server/src/routes/control.ts` (MODIFIED — register new sub-plugin)
- `server/src/services/ai/geminiClient.ts` (NEW — only if extracting `generateContent`)
- `shared/contracts/openapi.control-plane.json` (MODIFIED)

This unit must NOT touch:
- `server/src/services/ai/inferenceService.ts` (TIS — closed unit)
- `server/src/routes/ai.ts` (tenant AI — closed unit)
- `server/src/routes/control.ts` beyond the single plugin registration line
- Any Prisma schema or migration file
- `reasoning_logs` table in any way

---

## Open Questions

1. **`withAdminContext()` relocation:** Currently private in `server/src/routes/control.ts`.
   Should it move to `server/src/lib/adminContext.ts` so CPIS can import it cleanly?
   *Recommended answer:* Yes, extract it in Slice 1. This is a safe refactor
   (no behavior change; same sentinel + `is_admin` semantics) but requires explicit
   allowlist approval in the implementation prompt.

2. **`generateContent()` extraction:** Extract to `geminiClient.ts` (shared) or
   duplicate in CPIS? Duplication risks divergence. Extraction is cleaner but
   requires modifying TIS (a closed unit) to import from the shared file rather
   than defining it inline. *Recommended answer:* Duplicate with identical
   semantics in Slice 1, tagged with a TODO for consolidation in a future cleanup
   unit. Avoids re-opening TIS.

3. **Admin rate limit value (20 req/min):** Is 20/60s appropriate, or should it
   be lower (e.g., 5/min) given that admin AI calls are expected to be rare
   and manually-triggered? *This is an implementation decision, not a design
   blocker. Default to 20; operator can configure via environment variable.*

4. **`ai.inference.*` event payload when `tenantId = null`:** The existing
   AI event payload schemas in `eventSchemas.ts` may include a `tenantId`
   field with a non-null assumption. The implementation unit must verify
   Zod schema compatibility before emitting with `tenantId: null`.

5. **Audit action string:** `'AI_CONTROL_INSIGHTS'` is proposed as a new
   audit action. If `AuditLog.action` is constrained by a DB CHECK constraint,
   this must be verified. *Current state: no CHECK constraint on `audit_logs.action`
   column was encountered in reviewed code — action strings appear freeform.*
   Implementation unit must confirm before writing.

---

## Closure Recommendation

**DESIGN GATE SATISFIED**

This design artifact:
1. ✅ Clearly defines control-plane AI backend scope and boundary.
2. ✅ Clearly defines the authority model (`SUPER_ADMIN` admin JWT) and trust model (no client-trusted claims; server-derived context).
3. ✅ Clearly defines route ownership (`/api/control/ai/*`) and service ownership (`controlPlaneInferenceService.ts`).
4. ✅ Clearly defines audit/event/reasoning expectations (mandatory admin audit write; best-effort `ai.inference.*` events with `realm: ADMIN, tenantId: null`; reasoning in `metadataJson` for first slice).
5. ✅ Clearly states which TIS safety controls are reused unchanged (PII guard, model timeout, degraded mode, event emitter) and which require wrapping (rate limit keyed on `adminId`, token cap replacing budget, `withAdminContext` replacing tenant `withDbContext`).
6. ✅ Identifies the smallest next implementation slice (PW5-G028-C-IMPL-SLICE-1 — `POST /api/control/ai/insights` + `GET /api/control/ai/health`).
7. ✅ Does not drift into implementation or governance sync.
8. ✅ Is concrete enough that an implementation prompt can be generated from it without architectural ambiguity.

The design gate for `TECS-FBW-AIGOVERNANCE` / `PW5-G028-C-CONTROL-PLANE-AI` is **resolved**.  
Implementation may proceed via a separately authorized unit: **PW5-G028-C-IMPL-SLICE-1**.

---

*Design-gate artifact — no runtime code changed, no schema changed, no tests changed.*  
*Single file produced: `docs/architecture/PW5-G028-C-CONTROL-PLANE-AI-DESIGN.md`*
