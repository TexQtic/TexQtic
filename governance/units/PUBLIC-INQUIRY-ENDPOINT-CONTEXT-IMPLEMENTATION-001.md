# PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001

**Unit ID:** PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001
**Status:** VERIFIED_COMPLETE
**Correction:** PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001-CORRECTION-001
**Verified:** PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001-VERIFY-CLOSE
**Date:** 2026-07-08
**Verification Date:** 2026-07-08
**Tracker Section:** 31
**Design Authority:** PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001

---

## 1. Purpose

Implements the Phase 2 extension of `POST /api/public/inquiry/submit` as designed in
`PUBLIC-INQUIRY-ENDPOINT-CONTEXT-DESIGN-001`. Extends the endpoint to support general
(non-supplier-gated) inquiry mode and multi-context inquiry from product, category,
and collection surfaces.

---

## 2. Files Changed

### Created
- `server/src/config/publicB2CCategoryPageSlugs.ts` — server-side category slug approval registry (4 approved slugs)
- `server/src/config/publicCollectionSlugs.ts` — server-side collection slug approval registry (5 approved slugs)

### Modified
- `server/src/routes/public.ts` — Phase 2 inquiry schema + handler (INQUIRY-004 section replaced)
- `services/publicB2BService.ts` — `PublicInquirySubmitParams` extended; `supplier_slug` now optional; `PublicInquirySourceSurface` type added
- `shared/contracts/openapi.tenant.json` — `/api/public/inquiry/submit` endpoint updated
- `shared/contracts/event-names.md` — `buyer_inquiry.created.v1` payload spec updated
- `server/src/__tests__/public-buyer-inquiry.unit.test.ts` — INQ-013 through INQ-027 added

---

## 3. Key Changes

### Backend (`server/src/routes/public.ts`)

**Schema (Phase 2):**
- `inquiry_category` — REQUIRED (no change in position; moved to first)
- `supplier_slug` — now OPTIONAL (`z.string()...optional()`)
- `source_surface` — new optional string, max 64 chars; normalized server-side
- `product_slug` — new optional slug (format-validated only, no existence gate)
- `category_slug` — new optional slug (approval-checked against config)
- `collection_slug` — new optional slug (approval-checked against config)
- `message` — new optional string, max 2000 pre-sanitization (500 post-sanitization)

**Handler logic:**
1. Zod safeParse → 400 on schema failure
2. Context exclusivity check: `supplier_slug` cannot coexist with `product/category/collection_slug` → 400
3. Message sanitization:
   - Email pattern check on raw input → 400 if found
   - Phone pattern check on raw input → 400 if found
   - Strip HTML tags (`/<[^>]*>/g`)
   - Strip URLs (`/https?:\/\/[^\s]+/g`)
   - Trim; if empty → treat as absent; if >500 chars → 400
4. `source_surface` normalization: unknown values → `'DIRECT'`
5. `category_slug` / `collection_slug` approval gate: fail-closed, silently drop unapproved values
6. **Supplier path** (Phase 1 preserved): supplier gate → 404 if not found → `realm: 'TENANT'`
7. **General path** (new): `realm: 'ADMIN'`, `tenantId: null`, `entityId: null`, `entity: 'platform_inquiry'`, `action: 'public.buyer.inquiry.general.created'` (distinct from supplier path; not in event registry)
8. Both paths: fire-and-forget `prisma.$transaction` + `writeAuditLog`; 202 response

**Imports added:**
```typescript
import { APPROVED_CATEGORY_SLUGS } from '../config/publicB2CCategoryPageSlugs.js';
import { APPROVED_COLLECTION_SLUGS } from '../config/publicCollectionSlugs.js';
```

### Frontend Service (`services/publicB2BService.ts`)

- `PublicInquirySubmitParams.supplier_slug` changed from `string` (required) to `string | undefined` (optional)
- `PublicInquirySourceSurface` type added (12 values)
- New optional fields: `source_surface`, `product_slug`, `category_slug`, `collection_slug`, `message`
- Existing callers providing `supplier_slug: string` remain fully type-safe

### OpenAPI Contract (`shared/contracts/openapi.tenant.json`)

- `"required"` changed from `["supplier_slug", "inquiry_category"]` to `["inquiry_category"]`
- All Phase 2 properties added with descriptions
- `source_surface` listed as enum (12 values) with normalization note
- 400 description updated to include context exclusivity and PII rejection cases
- 404 description updated: only returned when `supplier_slug` is provided

### Event Contract (`shared/contracts/event-names.md`)

- `buyer_inquiry.created.v1` block updated:
  - Producer: `INQUIRY-004 / PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001`
  - Trigger: no longer marked "Future" (endpoint is live)
  - Allowed payload expanded with all Phase 2 fields
  - Prohibited payload updated with additional categories

---

## 4. Adjacent Findings

### AF-001: General Inquiry EventLog Entity ID Constraint

**Classification:** Resolved — Outcome B selected (CORRECTION-001).

**Original finding:** `EventLog.entityId` is `@db.Uuid` NOT NULL. When `writeAuditLog` is called with `entityId: null`, the event pipeline uses `id: auditLogRow.entityId ?? ''` as fallback. The empty string fails `z.string().uuid()` validation, throws in best-effort handler, and event is silently skipped with a log warning.

**Resolution (Outcome B):** The general inquiry path in `server/src/routes/public.ts` now uses a distinct AuditLog action `'public.buyer.inquiry.general.created'` instead of `'public.buyer.inquiry.created'`. This action is **not registered** in `AUDIT_ACTION_TO_EVENT_NAME` (in `server/src/lib/events.ts`), so `maybeEmitEventFromAuditEntry` returns early silently with no warning and no error. AuditLog is still written. EventLog is not written. No event is emitted.

**Why Outcome A was not taken:** Outcome A (supplying a `randomUUID()` as `entityId` for general inquiries) would require modifying `server/src/lib/events.ts` (read-only for this unit) to handle the `entityId`→`entity.id` fallback, or accepting that `entity.id = randomUUID()` with no semantic binding to any persistent entity, which is architecturally questionable for an event that consumers will use to trace back to a record.

**Event contract updated:** `shared/contracts/event-names.md` now explicitly states `buyer_inquiry.created.v1` is **supplier-context-only**. General inquiry AuditLog action is documented as `public.buyer.inquiry.general.created`.

**Deferred path:** `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001` — must define an entity UUID strategy for platform-level inquiries (e.g., a `platform_inquiry` table with a generated UUID as primary key) before general inquiries can emit `buyer_inquiry.created.v1`.

---

## 5. Test Coverage (INQ-013–027)

| ID | Scenario | Assertion |
|---|---|---|
| INQ-013 | General inquiry, no supplier_slug | 202; supplier gate NOT called |
| INQ-014 | General inquiry, source_surface NAVBAR | 202; source_surface in afterJson |
| INQ-015 | General inquiry, valid message | 202; inquiry_message in afterJson; 'message' key absent |
| INQ-016 | Message with email | 400 |
| INQ-017 | Message with phone number | 400 |
| INQ-018 | product_slug valid format | 202; product_slug in afterJson |
| INQ-019 | category_slug 'garments' (approved) | 202; category_slug in afterJson |
| INQ-020 | category_slug 'unknown-category' (unapproved) | 202; category_slug absent from afterJson |
| INQ-021 | collection_slug 'natural-fabric-stories' (approved) | 202; collection_slug in afterJson |
| INQ-022 | supplier_slug + product_slug exclusivity violation | 400; supplier gate NOT called |
| INQ-023 | Unknown source_surface | 202; source_surface 'DIRECT' in afterJson |
| INQ-024 | Message >500 chars after sanitization | 400 |
| INQ-025 | Message with HTML tags | 202; HTML stripped in inquiry_message |
| INQ-026 | Phase 1 regression (supplier_slug + all Phase 1 fields) | 202; backward compatible; realm TENANT; action `public.buyer.inquiry.created` |
| INQ-027 | General inquiry afterJson has no org UUID | realm ADMIN; tenantId null; entityId null; action `public.buyer.inquiry.general.created` |

---

## 6. Backward Compatibility

All Phase 1 payloads (`supplier_slug` + `inquiry_category` + optional `geo_band` + `volume_band`) remain fully valid. No breaking changes to existing callers. The `PublicInquiryPage.tsx` component continues to pass `supplier_slug: supplierSlug` unchanged. The TypeScript change (`supplier_slug?: string`) is backward-compatible with all existing callers.

---

## 7. Next Units

- ~~`PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001-VERIFY-CLOSE`~~ — COMPLETE (VERIFIED_COMPLETE)
- `PUBLIC-INQUIRY-GENERAL-MODE-IMPLEMENTATION-001` — frontend general mode in `PublicInquiryPage`
- `PUBLIC-INQUIRY-CONTEXT-HANDOFF-IMPLEMENTATION-001` — CTA integration in product/category/collection pages

---

## 8. Verification Evidence

**Verify-close unit:** `PUBLIC-INQUIRY-ENDPOINT-CONTEXT-IMPLEMENTATION-001-VERIFY-CLOSE`
**Verification date:** 2026-07-08

### Implementation Commit

- Hash: `f8378362bb5cd0782389b2136572b30cc276c549`
- Message: `[TEXQTIC] public: Phase 2 inquiry context + event contract correction`
- Files: exactly 9 (all approved allowlist; no frontend UI files, no Prisma schema/migration files)

### Repo-Truth Inspection — 16 Questions

| # | Question | Result |
|---|---|---|
| 1 | Files limited to approved implementation/correction surface | ✅ Pass — 9 files, all approved |
| 2 | No frontend UI files modified | ✅ Pass — confirmed via `git show --name-only` |
| 3 | No Prisma schema or migration files modified | ✅ Pass — none in commit |
| 4 | `supplier_slug` optional in backend schema and service type | ✅ Pass — `z.string()...optional()` in Zod schema; `supplier_slug?: string` in `PublicInquirySubmitParams` |
| 5 | `inquiry_category` required | ✅ Pass — `z.enum([...])` with no `.optional()` |
| 6 | All Phase 2 fields present in backend contract | ✅ Pass — `source_surface`, `product_slug`, `category_slug`, `collection_slug`, `message` all present |
| 7 | `supplier_slug` context exclusivity enforced | ✅ Pass — returns 400 if `supplier_slug` + any of `product/category/collection_slug` |
| 8 | Unknown/absent `source_surface` normalizes to `DIRECT` | ✅ Pass — `KNOWN_SOURCE_SURFACES.has()` check; else `'DIRECT'` |
| 9 | `product_slug` format-validated only (no existence gate) | ✅ Pass — regex pattern only, no DB lookup |
| 10 | `category_slug`/`collection_slug` approval gate matches registries | ✅ Pass — `APPROVED_CATEGORY_SLUGS` (4 slugs), `APPROVED_COLLECTION_SLUGS` (5 slugs) |
| 11 | Message handling: HTML strip, email reject, phone reject, URL strip, 500 post-sanitization, stored as `inquiry_message` | ✅ Pass — all four pattern operations confirmed in code |
| 12 | Message not echoed in response | ✅ Pass — response is `{ acknowledged: true, message: '...' }` only |
| 13 | Response schema opaque 202 | ✅ Pass — `reply.status(202).send({ success: true, data: { acknowledged: true, message: '...' } })` |
| 14 | Supplier inquiry event path remains `buyer_inquiry.created.v1` | ✅ Pass — `action: 'public.buyer.inquiry.created'` in supplier path; mapped in `events.ts` |
| 15 | General inquiry action is `public.buyer.inquiry.general.created`, NOT mapped | ✅ Pass — only one entry in `events.ts` for `public.buyer.inquiry.created`; general action absent |
| 16 | `event-names.md` truthfully documents `buyer_inquiry.created.v1` as supplier-context-only | ✅ Pass — scope constraint language confirmed in contract |

### Local Validation

| Command | Result |
|---|---|
| `pnpm --filter texqtic-platform-server typecheck` | ✅ PASS — 0 errors |
| INQ-001–027 (27 tests) | ✅ PASS — 27/27 |
| `pnpm run validate:contracts` | ✅ PASS — 8/8 contract smoke checks |

### Production Verification (`https://app.texqtic.com`)

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | `GET /api/health` | 200 `{status:'ok'}` | ✅ `200 {"status":"ok","timestamp":"..."}` |
| 2 | Supplier inquiry (`supplier_slug: 'demo-supplier'`) | 404 (demo slug not in prod) | ✅ `404 NOT_FOUND Supplier not found` (data limitation: no known live slug) |
| 3 | General inquiry, no `supplier_slug` | 202 opaque | ✅ `202 {"success":true,"data":{"acknowledged":true,...}}` |
| 4 | General + `source_surface: NAVBAR` | 202 | ✅ `202` |
| 5 | General + unknown `source_surface` | 202 (normalized to DIRECT) | ✅ `202` — no raw unknown value in response |
| 6 | General + valid `product_slug` format | 202 | ✅ `202` |
| 7 | General + approved `category_slug: garments` | 202 | ✅ `202` |
| 8 | General + unapproved `category_slug` | 202 (silently dropped) | ✅ `202` |
| 9 | General + approved `collection_slug: natural-fabric-stories` | 202 | ✅ `202` |
| 10 | `supplier_slug` + `product_slug` → exclusivity | 400 VALIDATION_ERROR | ✅ `400 {"code":"VALIDATION_ERROR",...,"Invalid request: conflicting context fields"}` |
| 11 | Email in message | 400 | ⚠️ Rate-limited (20 req/15 min/IP; covered by INQ-016 unit test) |
| 12 | Phone in message | 400 | ⚠️ Rate-limited (covered by INQ-017 unit test) |
| 13 | Oversized sanitized message | 400 | ⚠️ Rate-limited (covered by INQ-024 unit test) |
| 14 | Response never echoes private fields | Opaque body only | ⚠️ Rate-limited (opaque schema confirmed in checks 3–9; covered by INQ-015/026/027) |

**Data limitation:** Checks 11–14 were blocked by the endpoint's own 20 req/15 min/IP rate limit (correct, expected behavior). These scenarios are fully covered by INQ-016, INQ-017, INQ-024, and INQ-015 unit tests, all of which pass. Response privacy confirmed via checks 3–9 (no internal fields in any 202 response body).

### Final Close Decision

**Status: `VERIFIED_COMPLETE`**

- Implementation commit in scope: ✅ `f837836`
- Diff limited to allowlist: ✅
- Local validation pass: ✅ (27/27 tests, typecheck, 8/8 contract checks)
- Production checks 1–10 pass: ✅
- Phase 1 supplier path preserved: ✅
- General inquiry operable without `supplier_slug`: ✅
- Event contract truth matches runtime: ✅ (`buyer_inquiry.created.v1` supplier-only; general deferred)
- No private fields in response: ✅
- Adjacent finding `PUBLIC-INQUIRY-GENERAL-EVENT-INFRASTRUCTURE-001` carried forward: ✅
