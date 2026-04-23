# TEXQTIC-B2B-SUPPLIER-RFQ-INBOX-INVESTIGATION-v1

**Investigation Type:** TECS SAFE-WRITE MODE — Read-Only Discovery
**Target Sub-Family:** B2B — Supplier RFQ Inbox
**Investigation Date:** 2026-07-12
**Authority:** TECS v1.6 / GOVERNANCE POSTURE: HOLD-FOR-BOUNDARY-TIGHTENING / ZERO_OPEN_DECISION_CONTROL
**Governing Decision:** PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP (DECIDED 2026-03-19, Paresh)
**Status:** INVESTIGATION COMPLETE — No implementation authorized by this document

---

## 1. Investigation Summary

This investigation covers the **Supplier RFQ Inbox** sub-family unit of the B2B RFQ domain.
It traces all layers from schema through backend routes through service types through frontend
surfaces through App.tsx state machine wiring to determine current implementation completeness,
identify genuine gaps within the governed pre-negotiation scope, and assign a launch-readiness
classification.

**Primary Finding:** The Supplier RFQ Inbox is **BASIC OPERATIONAL** within its governed
pre-negotiation boundary. All required layers — schema, backend, service client, frontend
surfaces, App.tsx state machine, and navigation entry point — are fully implemented and wired
end-to-end. The workflow from inbox list to detail read to first-response submission is
complete and audited. The pre-negotiation boundary is enforced in the backend, the UI, and
in the governing product decision.

**No implementation gaps block usage within the governed scope.** The gaps recorded below
are quality and completeness concerns (missing supplier-side UI test, no frontend search/filter
controls) rather than blocking workflow gaps. All negotiation-adjacent capabilities
(pricing, counter-offers, acceptance, rejection, trade conversion) are governed caps, not
missing implementations.

---

## 2. Unit Identity

| Attribute           | Value                                                       |
|---------------------|-------------------------------------------------------------|
| Sub-family          | Supplier RFQ Inbox                                          |
| Parent family       | RFQ / Negotiation Continuity (DESIGN_GATE)                  |
| Plane               | TENANT                                                      |
| B2B context         | Wholesale workspace (`b2b_workspace` routeKey)              |
| Primary actor       | Supplier-role tenant receiving buyer-submitted RFQs          |
| Workflow scope      | Inbox list read → detail read → first-response submit        |
| Workflow excluded   | Negotiation, pricing, counter-offers, trade conversion       |
| Classification      | **BASIC OPERATIONAL**                                       |

---

## 3. Governing Decisions and Posture

### Active Cap Decision

**PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP** (DECIDED 2026-03-19, Paresh)

The RFQ domain is formally capped at pre-negotiation. This decision:

- Recognizes the installed RFQ posture (buyer initiation + list/detail reads + supplier inbox +
  supplier first-response) as the governed and stable discovery milestone.
- Explicitly defers pricing, negotiation loop, counter-offers, acceptance, rejection, messaging,
  supplier comparison, and Trade/order/checkout conversion.
- Authorizes no further RFQ implementation. Any future RFQ expansion beyond the current boundary
  **must return as a separate explicit product decision before any sequencing or implementation.**
- Does not affect `TECS-FBW-ADMINRBAC` (remains DESIGN_GATE).

### Governance Posture at Investigation Time

- `NEXT-ACTION.md`: `OPERATOR_DECISION_REQUIRED`
- `OPEN-SET.md`: 0 implementation-ready units OPEN
- Doctrine constraint: `D-016` — `ZERO_OPEN_DECISION_CONTROL` in effect
- No RFQ implementation unit may be opened without a new governing product decision.

### Completed Prior Decisions (Affecting This Unit)

| Decision ID                            | Status  | Date       | Relevance                                      |
|----------------------------------------|---------|------------|------------------------------------------------|
| PRODUCT-DEC-RFQ-INITIATION             | DECIDED | pre-2026   | Authorized buyer-side RFQ creation             |
| PRODUCT-DEC-BUYER-RFQ-READS            | DECIDED | 2026-03-18 | Authorized buyer list/detail read surfaces      |
| PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE      | DECIDED | 2026-03-19 | Authorized supplier inbox + first-response write |
| PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP    | DECIDED | 2026-03-19 | Capped RFQ at pre-negotiation discovery         |

---

## 4. Governance Units (Supplier RFQ Inbox Scope)

All units that cover the Supplier RFQ Inbox scope are `VERIFIED_COMPLETE`.

| Unit ID                          | Title                                                  | Status            | Wave | Commit   |
|----------------------------------|--------------------------------------------------------|-------------------|------|----------|
| TECS-RFQ-DOMAIN-001              | RFQ Domain Schema Foundation                           | VERIFIED_COMPLETE | W5   | —        |
| TECS-RFQ-SUPPLIER-READ-001       | Supplier RFQ Inbox List + Detail API                   | VERIFIED_COMPLETE | W5   | —        |
| TECS-RFQ-RESPONSE-001            | Supplier First-Response Write Path                     | VERIFIED_COMPLETE | W5   | —        |
| TECS-RFQ-READ-001                | Buyer RFQ Read (backend)                               | VERIFIED_COMPLETE | W5   | —        |
| TECS-RFQ-BUYER-RESPONSE-READ-001 | Buyer-Visible Bounded Supplier Response                | VERIFIED_COMPLETE | W5   | —        |
| TECS-RFQ-BUYER-LIST-READ-001     | Buyer RFQ Discovery Surface (frontend)                 | VERIFIED_COMPLETE | W5   | 64500cf  |
| TECS-RFQ-BUYER-DETAIL-UI-001     | Buyer RFQ Detail UI Foundation (frontend)              | VERIFIED_COMPLETE | W5   | dcb5964  |

No governance unit for a dedicated **Supplier RFQ Inbox UI** surface is recorded separately.
The supplier-side frontend was delivered as part of `TECS-RFQ-SUPPLIER-READ-001` and
`TECS-RFQ-RESPONSE-001` — the components are co-located in the buyer-side surface files
(`BuyerRfqListSurface.tsx`, `BuyerRfqDetailSurface.tsx`).

---

## 5. Schema Layer

**Source:** `server/prisma/schema.prisma`
**Governance attribution:** `/// TECS-RFQ-DOMAIN-001` (Rfq), `/// TECS-RFQ-RESPONSE-001` (RfqSupplierResponse)

### Model: `Rfq` → table `rfqs`

```
id               UUID        PK, gen_random_uuid()
org_id           UUID        buyer tenant FK → tenants.id (@@index)
supplier_org_id  UUID        supplier tenant FK → tenants.id (@@index)
catalog_item_id  UUID        FK → catalog_items.id (@@index)
quantity         INT
buyer_message    TEXT?       nullable; reference context from buyer
status           rfq_status  DEFAULT OPEN
created_by_user_id UUID?     FK → users.id
created_at       TIMESTAMPTZ(6)
updated_at       TIMESTAMPTZ(6)
```

Relations: `RfqSupplierResponse?` (one-to-one optional), `Trade?` (one-to-one optional via
`sourceRfqId`), `CatalogItem`, `User?`, `Tenant` (buyerOrg), `Tenant` (supplierOrg).

### Model: `RfqSupplierResponse` → table `rfq_supplier_responses`

```
id               UUID        PK, gen_random_uuid()
rfq_id           UUID        UNIQUE FK → rfqs.id (CASCADE DELETE)
supplier_org_id  UUID        FK → tenants.id (@@index)
message          TEXT        non-binding message body
submitted_at     TIMESTAMPTZ(6)
created_at       TIMESTAMPTZ(6)
updated_at       TIMESTAMPTZ(6)
created_by_user_id UUID      FK → users.id (@@index)
```

The `@unique` constraint on `rfq_id` enforces exactly one response per RFQ at the
database level. This is the primary schema-level enforcement of the pre-negotiation cap.

### Enum: `rfq_status` → `RfqStatus`

```
INITIATED   (unused in supplier inbox — pre-open state on buyer side)
OPEN        (default; supplier may respond)
RESPONDED   (supplier has submitted first response; no further responses allowed)
CLOSED      (RFQ closed; no supplier response allowed)
```

### Trade Continuity Link

`Trade.sourceRfqId UUID? @unique` — optional FK to `rfqs.id`. This enables RFQ-derived
trade creation from the buyer side (`POST /api/tenant/trades/from-rfq` in
`server/src/routes/tenant/trades.g017.ts`). The supplier-side inbox surfaces do not directly
expose or trigger this path.

### Schema Verdict: CONFIRMED COMPLETE for governed scope.

No schema gaps exist within the Supplier RFQ Inbox pre-negotiation boundary. Pricing fields,
negotiation state fields, and counter-offer artifacts are absent by deliberate design, not
accidental omission, consistent with PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP.

---

## 6. Backend Layer

**Source:** `server/src/routes/tenant.ts`
**Auth guards on all three routes:** `tenantAuthMiddleware` + `databaseContextMiddleware`
**DB access pattern:** `withDbContext(prisma, dbContext, async tx => { ... })`

### Route 1: `GET /api/tenant/rfqs/inbox`

Supplier inbox list. Scoped strictly by `supplierOrgId: dbContext.orgId`.

- Supports optional `status` filter (`INITIATED` | `OPEN` | `RESPONDED` | `CLOSED`)
- Supports optional `q` search: UUID match on `id`; `contains/insensitive` on catalog item
  `name` and `sku`
- Supports `sort`: `updated_at_desc` (default) | `created_at_desc`
- Hard-paged at `take: 50`
- Returns: `{ rfqs: SupplierRfqListItem[], count: number }`
- Mapper: `mapSupplierRfqListItem` → fields: `id`, `status`, `catalog_item_id`, `item_name`,
  `item_sku`, `quantity`, `created_at`, `updated_at`
- Buyer `org_id` **NOT exposed** in the list response.

### Route 2: `GET /api/tenant/rfqs/inbox/:id`

Supplier RFQ detail. Scoped by `supplierOrgId: dbContext.orgId` + `id`.

- Fetches `buyerCounterpartySummary` via `getCounterpartyProfileAggregation(rfq.orgId, prisma)`
  (aggregated profile only; buyer `org_id` is withheld from the response body)
- Returns: `{ rfq: SupplierRfqDetail }`
- Mapper: `mapSupplierRfqDetail` → extends list fields with `buyer_message` and
  `buyer_counterparty_summary`
- Handles `OrganizationNotFoundError` gracefully (returns `null` summary, not 500)
- 404 if RFQ not found or supplier mismatch

### Route 3: `POST /api/tenant/rfqs/inbox/:id/respond`

First supplier response. Requires `userId` from JWT and `dbContext.orgId`.

- Body: `{ message: string }` — validated `trim().min(1).max(1000).strict()`
- Rejects if:
  - RFQ not found or `supplierOrgId` mismatch → 404
  - `status === 'CLOSED'` → 409 `RFQ_CLOSED`
  - `status === 'RESPONDED'` → 409 `RFQ_ALREADY_RESPONDED`
  - Existing `rfqSupplierResponse` row exists → 409 `RFQ_RESPONSE_ALREADY_EXISTS`
  - Prisma `P2002` unique constraint violation → 409 `RFQ_RESPONSE_ALREADY_EXISTS`
- Writes (transactional via `withDbContext`):
  1. Creates `rfqSupplierResponse` (with `createdByUserId = userId`)
  2. Updates parent `Rfq.status` → `'RESPONDED'`
  3. Writes audit log entry: `realm=TENANT`, `action='rfq.RFQ_RESPONDED'`,
     `entity='rfq_supplier_response'`, `metadataJson.nonBinding=true`
- Returns HTTP 201: `{ response: SupplierRfqResponse, rfq: { id, status: 'RESPONDED' }, non_binding: true }`

### Backend Verdict: CONFIRMED COMPLETE for governed scope.

All three supplier inbox routes are fully implemented, auth-guarded, org-scoped, and
validated. The pre-negotiation boundary is enforced server-side: no pricing fields, no
negotiation state machine, no response revision path. The `non_binding: true` flag is
present in both the response body and the audit log metadata.

---

## 7. Service Layer

**Source:** `services/catalogService.ts`

### Type Definitions

```typescript
export interface SupplierRfqListItem {
  id: string;
  status: string;
  catalog_item_id: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierRfqListResponse {
  rfqs: SupplierRfqListItem[];
  count: number;
}

export interface SupplierRfqDetail {
  id: string;
  status: string;
  item_name: string;
  item_sku: string | null;
  quantity: number;
  buyer_message: string | null;
  buyer_counterparty_summary: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierRfqDetailResponse {
  rfq: SupplierRfqDetail;
}

export interface SupplierRfqResponse {
  id: string;
  rfq_id: string;
  supplier_org_id: string;
  message: string;
  submitted_at: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string;
}

export interface SubmitSupplierRfqResponseRequest {
  message: string;
}

export interface SubmitSupplierRfqResponseResult {
  response: SupplierRfqResponse;
  rfq: { id: string; status: string };
  non_binding: boolean;
}
```

### Function Implementations

```typescript
// GET /api/tenant/rfqs/inbox
export async function getSupplierRfqInbox(): Promise<SupplierRfqListResponse>
  → tenantGet<SupplierRfqListResponse>('/api/tenant/rfqs/inbox')

// GET /api/tenant/rfqs/inbox/:rfqId
export async function getSupplierRfqDetail(rfqId: string): Promise<SupplierRfqDetailResponse>
  → tenantGet<SupplierRfqDetailResponse>(`/api/tenant/rfqs/inbox/${rfqId}`)

// POST /api/tenant/rfqs/inbox/:rfqId/respond
export async function submitSupplierRfqResponse(
  rfqId: string,
  payload: SubmitSupplierRfqResponseRequest
): Promise<SubmitSupplierRfqResponseResult>
  → tenantPost<SubmitSupplierRfqResponseResult>(`/api/tenant/rfqs/inbox/${rfqId}/respond`, payload)
```

### Service Layer Verdict: CONFIRMED COMPLETE.

All three service functions are present and typed. URLs match the backend routes exactly.
No filtering, search, or sort parameters are exposed in the frontend service functions
(even though the backend supports them) — this is a design gap documented in Section 12.

---

## 8. Frontend Layer

**Sources:**
- `components/Tenant/BuyerRfqListSurface.tsx` (exports `SupplierRfqInboxSurface`)
- `components/Tenant/BuyerRfqDetailSurface.tsx` (exports `SupplierRfqDetailSurface`)

### `SupplierRfqInboxSurface`

Props: `rfqs: SupplierRfqListItem[], loading, error, onViewDetail(rfqId), onBack`

States rendered:

- **Loading**: "Loading supplier-addressed RFQs..." with Back button
- **Error**: Error message in rose-50 panel with Back button
- **Empty**: "No supplier RFQs are available yet..." with Back button
- **Populated**: Header card with title/description + Back; list of `SupplierRfqInboxCard`
  per RFQ

`SupplierRfqInboxCard` renders per-RFQ:
- "Inbox RFQ" label + `rfq.id` + `rfq.item_name`
- Status badge (RESPONDED=emerald, OPEN=amber, CLOSED=slate, other=sky)
- DL grid: Catalog Item | Item SKU | Requested Quantity | Last Updated
- Footer: submission timestamp + pre-negotiation disclaimer text + "Open RFQ" button

The card footer text explicitly encodes the governance cap:
> *"This supplier inbox supports a first response only and does not enable negotiation."*

### `SupplierRfqDetailSurface`

Props: `rfq: SupplierRfqDetail | null, response: SupplierRfqResponse | null, loading, error,
submitLoading, submitError, onBack, onClose, onSubmitResponse(message)`

States rendered:

- **Loading**: "Loading the supplier RFQ detail and first-response action state"
- **Error**: Error in rose-50 panel; note that "no supplier response state has changed"
- **Null rfq**: Stable fallback empty state
- **Populated**: DL grid of RFQ metadata + Buyer Submission Notes section (read-only,
  whitespace-pre-wrap) + Supplier Response section (delegated to `SupplierRfqResponseSection`)

`SupplierRfqResponseSection` renders based on current RFQ state:

| Condition                          | Render                                                     |
|------------------------------------|------------------------------------------------------------|
| `response` present                 | Read-only submitted response (id, submitted_at, message)   |
| `status === 'RESPONDED'` no local  | "A supplier response has already been recorded..."         |
| `status === 'CLOSED'`              | "This RFQ is closed, so no supplier response can be submitted" |
| `status === 'OPEN'` no response    | Form: textarea (maxLength=1000), pre-negotiation disclaimer, Submit button |

`canRespond = rfq.status === 'OPEN' && !response` — submit button disabled when `canRespond`
is false or message is empty or `submitLoading`.

The form disclaimer text:
> *"This message records a first response only. It does not create a quote, price, or negotiation thread."*

### Frontend Verdict: CONFIRMED COMPLETE for governed scope.

All states, transitions, and the submit form are implemented. Pre-negotiation boundary
is explicitly surfaced in user-visible copy in both the list card and the detail form.
No pricing fields, negotiation controls, or counter-offer elements are present.

---

## 9. App.tsx State Machine

**Source:** `App.tsx`

### State Types

```typescript
type SupplierRfqListViewState = {
  loading: boolean;
  error: string | null;
  rfqs: SupplierRfqListItem[];
};

type SupplierRfqDetailViewState = {
  loading: boolean;
  error: string | null;
  rfqId: string | null;
  data: SupplierRfqDetail | null;
  response: SupplierRfqResponse | null;
  submitLoading: boolean;
  submitError: string | null;
  open: boolean;
};
```

### State Resolvers and Handlers

| Symbol                                    | Purpose                                                         |
|-------------------------------------------|-----------------------------------------------------------------|
| `createInitialSupplierRfqListViewState()` | Returns zero-state for list view                               |
| `createInitialSupplierRfqDetailViewState()` | Returns zero-state for detail view                           |
| `resolveSupplierRfqInboxOpenAction()`     | Produces entry action for `routeKey: 'supplier_rfq_inbox'`     |
| `resolveSupplierRfqInboxEntryState()`     | Computes full entry state including routeKey                   |
| `resolveSupplierRfqInboxCloseState()`     | Computes state on close/back                                   |
| `loadSupplierRfqInboxContinuity()`        | Async loader: calls `loadSupplierRfqInbox()`, returns list view |
| `resolveSupplierRfqDetailOpenAction()`    | Produces entry action for detail view                          |
| `loadSupplierRfqDetailContinuity()`       | Async loader: calls `loadSupplierRfqDetail()`, returns detail view |
| `resolveSupplierRfqDetailReturnToInboxState()` | Returns from detail back to inbox list                   |
| `handleOpenSupplierRfqInbox()`            | Async: calls `getSupplierRfqInbox`, sets state, navigates     |
| `handleCloseSupplierRfqInbox()`           | Returns to prior tenant workspace                             |
| `handleOpenSupplierRfqDetail(rfqId)`      | Async: calls `getSupplierRfqDetail`, opens detail view        |
| `handleReturnToSupplierRfqList()`         | Back from detail to list                                      |
| `handleSubmitSupplierRfqResponse(message)` | Async: calls `submitSupplierRfqResponse`, updates state     |

### Render Case

```typescript
case 'supplier_rfq_inbox':
  if (supplierRfqDetailView.open) {
    return (
      <SupplierRfqDetailSurface
        rfq={supplierRfqDetailView.data}
        response={supplierRfqDetailView.response}
        loading={supplierRfqDetailView.loading}
        error={supplierRfqDetailView.error}
        submitLoading={supplierRfqDetailView.submitLoading}
        submitError={supplierRfqDetailView.submitError}
        onBack={handleReturnToSupplierRfqList}
        onClose={handleCloseSupplierRfqInbox}
        onSubmitResponse={message => { void handleSubmitSupplierRfqResponse(message); }}
      />
    );
  }
  return (
    <SupplierRfqInboxSurface
      rfqs={supplierRfqListView.rfqs}
      loading={supplierRfqListView.loading}
      error={supplierRfqListView.error}
      onViewDetail={rfqId => { void handleOpenSupplierRfqDetail(rfqId); }}
      onBack={handleCloseSupplierRfqInbox}
    />
  );
```

### State Machine Verdict: CONFIRMED COMPLETE.

The `supplier_rfq_inbox` routeKey is fully wired in the App state machine with all handlers,
resolvers, and render paths. All props pass down to surfaces correctly. Both back/close
navigation paths are wired.

---

## 10. Navigation Entry Point

**Source:** `App.tsx` — `case 'b2b_workspace'`

The Supplier RFQ Inbox is exposed as a button in the B2B Wholesale Catalog workspace toolbar:

```tsx
<button type="button" onClick={() => { void handleOpenSupplierRfqInbox(); }}
  className="bg-white text-slate-700 px-4 py-2 rounded-lg font-medium ...">
  Supplier RFQ Inbox
</button>
```

This button sits alongside "View My RFQs" and "+ Add Item" in the `b2b_workspace` case.

**Access pattern:** A tenant with access to the B2B workspace can open the Supplier RFQ
Inbox without additional conditions. The backend enforces tenant isolation
(`supplierOrgId = dbContext.orgId`) so tenants only ever see their own inbox.

**Navigation Verdict:**

- ✅ Entry point exists and is wired to `handleOpenSupplierRfqInbox()`
- ✅ Back navigation returns to `b2b_workspace`
- ⚠️ Entry point is only accessible from the B2B workspace view, not from a standalone
  dedicated sidebar nav item. Tenants must be in the B2B workspace context to reach the inbox.
  This is consistent with the current app architecture but means the inbox is not independently
  deep-linkable via the sidebar. This is a navigation gap within the governed scope.

---

## 11. Tenancy and RLS Posture

All three supplier inbox routes apply `withDbContext(prisma, dbContext, ...)` which:

- Sets the Supabase Postgres session role to `app_user`
- Sets `app.current_org_id` session variable to `dbContext.orgId` (the authenticated supplier's org)
- All queries are subject to RLS policies for the `app_user` role

Additionally, every query explicitly includes `supplierOrgId: dbContext.orgId` in the
`where` clause (defense in depth — not relying on RLS alone).

The buyer `org_id` is fetched internally for `getCounterpartyProfileAggregation` but is
**not exposed in any response field**. Only the aggregated `buyer_counterparty_summary` is
returned to the supplier. This enforces the buyer identity exposure boundary from
`PRODUCT-DEC-SUPPLIER-RFQ-RESPONSE`.

The `POST /inbox/:id/respond` route uses `texqtic_rfq_read` role for cross-tenant catalog
item resolution if needed (not directly in the respond path — this pattern appears in the
buyer-side RFQ creation path). Response creation is strictly scoped to `supplierOrgId =
dbContext.orgId`.

**Tenancy Verdict:** CONFIRMED SOUND. No cross-tenant leak vectors identified in the
Supplier RFQ Inbox workflow. `org_id` isolation is enforced at both the application and
RLS layers.

---

## 12. Audit Trail

The `POST /api/tenant/rfqs/inbox/:id/respond` route writes a structured audit log entry via
`writeAuditLog`:

```
realm:     TENANT
tenantId:  dbContext.orgId (supplier's org)
actorType: USER
actorId:   userId (JWT subject)
action:    rfq.RFQ_RESPONDED
entity:    rfq_supplier_response
entityId:  response.id
afterJson: { id, rfqId, supplierOrgId, message, submittedAt, createdAt, updatedAt,
             createdByUserId, nonBinding: true }
metadataJson: { rfqId, supplierOrgId, respondedAt, parentRfqStatus: 'RESPONDED',
                nonBinding: true }
```

The `nonBinding: true` flag is present in both `afterJson` and `metadataJson`, providing
an audit-stable marker that the response was a non-binding first response only.

**Audit Verdict:** CONFIRMED PRESENT. The response action is audited with full entity
snapshot and non-binding attribution. The parent RFQ status transition (OPEN → RESPONDED)
is recorded in `parentRfqStatus`.

---

## 13. Test Coverage

### Backend Tests

**`server/tests/rfq-detail-route.shared.test.ts`**

Shared test fixture with buyer and supplier org/user/token pairs. Confirms:
- Buyer and supplier are seeded as separate tenants
- Cross-tenant fixture separation (`buyerOrgId`, `supplierOrgId`, `buyerToken`,
  `supplierToken`)
- Catalog item and RFQ are seeded in the buyer context

This shared test covers the supplier detail route (`GET /api/tenant/rfqs/inbox/:id`)
and likely the respond route. It provides backend integration coverage at the route level.

### Frontend Tests

- `tests/rfq-buyer-list-ui.test.tsx` — buyer list surface UI tests (11 tests; PASSED at
  commit 64500cf per `TECS-RFQ-BUYER-LIST-READ-001`)
- `tests/rfq-buyer-detail-ui.test.tsx` — buyer detail surface UI tests (included in the
  same 11-test verification run)

**No dedicated supplier inbox UI test file exists** (no `rfq-supplier-inbox-ui.test.tsx` or
`rfq-supplier-detail-ui.test.tsx`). The supplier-side frontend surfaces
(`SupplierRfqInboxSurface`, `SupplierRfqDetailSurface`, `SupplierRfqResponseSection`)
**do not have dedicated frontend unit tests.**

**Test Coverage Verdict:**

| Layer                               | Coverage                |
|-------------------------------------|-------------------------|
| Backend route (GET inbox)           | Partial (shared fixture)|
| Backend route (GET inbox/:id)       | Confirmed (shared test) |
| Backend route (POST .../respond)    | Likely (shared fixture) |
| Frontend SupplierRfqInboxSurface    | ❌ No dedicated test    |
| Frontend SupplierRfqDetailSurface   | ❌ No dedicated test    |
| Frontend SupplierRfqResponseSection | ❌ No dedicated test    |
| Service functions (supplier)        | Not explicitly confirmed|

The missing supplier-side frontend UI tests are the only genuine coverage gap. The buyer-side
has dedicated UI tests for analogous surfaces (`BuyerRfqListSurface`, `BuyerRfqDetailSurface`).
The supplier surfaces have equivalent complexity and submit-action semantics that warrant
equivalent test coverage.

---

## 14. Confirmed Gaps (Within Governed Scope)

These are gaps within the pre-negotiation boundary that are NOT blocked by product decision.
They are quality or completeness concerns, not workflow blockers.

### Gap 1: No Dedicated Supplier RFQ Inbox UI Tests

**Description:** `SupplierRfqInboxSurface`, `SupplierRfqDetailSurface`, and
`SupplierRfqResponseSection` have no dedicated frontend unit test file.
Analogous buyer surfaces have 11 tests across two files. The supplier surfaces include
non-trivial state logic (response section conditional rendering, submit loading/error
states, `canRespond` guard, message reset effect on rfq/response ID change).

**Risk:** Regression risk on supplier response submission UX path is not tested.

**Resolution requires:** A new governance unit opening — not authorized by this investigation.

### Gap 2: No Frontend Search/Filter Controls in Supplier Inbox

**Description:** The backend `GET /api/tenant/rfqs/inbox` supports `status` filter, `q`
search, and `sort` parameters. The frontend service function `getSupplierRfqInbox()` does
not expose these parameters, and the `SupplierRfqInboxSurface` has no search input or
status filter UI controls. The inbox always loads with default parameters (max 50, sorted
by `updated_at_desc`).

**Risk:** Suppliers with large RFQ inbox volumes have no way to filter or search from the UI.
The `take: 50` hard limit means older or non-default-sorted RFQs may not be visible.

**Resolution requires:** A separate governance unit opening — not authorized by this investigation.

### Gap 3: No Buyer Notification When Supplier Responds

**Description:** When a supplier submits a first response via `POST /inbox/:id/respond`,
the buyer's RFQ transitions to `RESPONDED` status in the database. However, there is no
in-app notification, email, or polling mechanism to alert the buyer that a response has
arrived. The buyer must re-open their buyer RFQ detail surface to discover the response.

**Risk:** Buyers may not learn about supplier responses in a timely way without manual polling.

**Governance note:** This may be intentional in the pre-negotiation discovery milestone.
Notification infrastructure is a broader platform concern outside the RFQ domain.

**Resolution requires:** A separate product and governance decision — out of scope for this
investigation.

### Gap 4: Supplier Inbox Not Reachable via Standalone Sidebar Navigation

**Description:** The "Supplier RFQ Inbox" entry is only accessible from within the
`b2b_workspace` (Wholesale Catalog) view toolbar. There is no dedicated sidebar nav item.
A supplier tenant must first enter the B2B workspace to reach the inbox.

**Risk:** Minor UX friction for suppliers whose primary workflow is responding to RFQs rather
than browsing the catalog.

**Resolution requires:** App.tsx navigation additions — requires a governance unit opening.

---

## 15. Governed Caps (Explicitly Excluded by Product Decision)

The following capabilities are **not missing implementations** — they are deliberate product
caps enforced by `PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP` (DECIDED 2026-03-19, Paresh).
**None of these may be implemented without a new explicit product decision.**

| Capability                          | Governed Cap Authority                   |
|-------------------------------------|------------------------------------------|
| Pricing / quote totals              | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| Negotiation loop                    | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| Counter-offers                      | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| Quote acceptance / rejection        | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| Response revision history           | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| Thread or messaging model           | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| Supplier comparison surface         | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| RFQ → Trade conversion (supplier)   | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| RFQ → Order / checkout coupling     | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |
| Control-plane RFQ workflows         | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP      |

The RFQ → Trade conversion from the **buyer side** is implemented in
`server/src/routes/tenant/trades.g017.ts` (`POST /api/tenant/trades/from-rfq`), but this
is separate from the Supplier RFQ Inbox sub-family and falls outside the governance cap for
the currently installed posture.

WL RFQ exposure (`WL-RFQ-EXPOSURE-CONTINUITY`) remains a separate open design unit.
It concerns WL storefront access to the existing RFQ flow, not the Supplier RFQ Inbox.

---

## 16. End-to-End Workflow Trace

The complete Supplier RFQ Inbox workflow as implemented:

```
Tenant (as supplier) enters b2b_workspace
  │
  ▼
Clicks "Supplier RFQ Inbox" button
  → handleOpenSupplierRfqInbox()
  → resolveSupplierRfqInboxEntryState() [routeKey = 'supplier_rfq_inbox']
  → loadSupplierRfqInboxContinuity() → getSupplierRfqInbox()
  → GET /api/tenant/rfqs/inbox [scoped: supplierOrgId = current tenant]
  → SupplierRfqInboxSurface renders with rfqs list
  │
  ▼ (if rfqs exist)
Clicks "Open RFQ" on an inbox card
  → handleOpenSupplierRfqDetail(rfqId)
  → loadSupplierRfqDetailContinuity() → getSupplierRfqDetail(rfqId)
  → GET /api/tenant/rfqs/inbox/:id [scoped: supplierOrgId + id]
  → SupplierRfqDetailSurface renders (detail view, response section)
  │
  ├─ If status=OPEN, no prior response:
  │    Supplier enters message in textarea (max 1000 chars)
  │    Clicks "Submit First Response"
  │    → handleSubmitSupplierRfqResponse(message)
  │    → submitSupplierRfqResponse(rfqId, { message })
  │    → POST /api/tenant/rfqs/inbox/:id/respond
  │       Creates rfq_supplier_response row
  │       Updates rfq.status → RESPONDED
  │       Writes audit log: rfq.RFQ_RESPONDED, nonBinding=true
  │    → Response state updated in UI; form replaced with read-only response
  │
  ├─ If status=RESPONDED: read-only response shown or "already recorded" notice
  ├─ If status=CLOSED: "closed" notice, no form shown
  │
  ▼
Back → returns to SupplierRfqInboxSurface (list)
Close → returns to b2b_workspace
```

---

## 17. Launch Readiness Classification

**Classification: BASIC OPERATIONAL**

**Definition:** All required layers for the governed pre-negotiation Supplier RFQ Inbox scope
are implemented and wired end-to-end. The full supplier workflow (inbox list → detail read →
first response submit) is functional with proper error handling, tenant isolation, audit
logging, and governance-mandated pre-negotiation boundary enforcement. The unit is ready
for use within its bounded scope.

**Evidence Summary:**

| Layer               | Status                    | Evidence                                        |
|---------------------|---------------------------|-------------------------------------------------|
| Schema              | ✅ CONFIRMED COMPLETE     | `rfqs` + `rfq_supplier_responses` + `rfq_status`|
| Backend routes      | ✅ CONFIRMED COMPLETE     | 3 routes in `tenant.ts` (GET, GET, POST)        |
| Service client      | ✅ CONFIRMED COMPLETE     | 3 functions + 7 types in `catalogService.ts`    |
| Frontend surfaces   | ✅ CONFIRMED COMPLETE     | `SupplierRfqInboxSurface` + `SupplierRfqDetailSurface` |
| State machine       | ✅ CONFIRMED COMPLETE     | `supplier_rfq_inbox` routeKey + all handlers    |
| Navigation entry    | ✅ CONFIRMED PRESENT      | b2b_workspace toolbar button                    |
| Tenancy isolation   | ✅ CONFIRMED SOUND        | `supplierOrgId = dbContext.orgId` + RLS         |
| Audit trail         | ✅ CONFIRMED PRESENT      | `rfq.RFQ_RESPONDED` + `nonBinding=true`         |
| Pre-negotiation cap | ✅ CONFIRMED ENFORCED     | Backend validation + UI copy + governed decision|
| Backend tests       | ⚠️ PARTIAL               | Shared fixture; no isolated supplier route tests|
| Frontend tests      | ❌ NO SUPPLIER UI TESTS   | Buyer surfaces have tests; supplier does not    |
| Search/filter UI    | ⚠️ NOT PRESENT IN FRONTEND| Backend supports; frontend has no controls     |
| Notification        | ❌ NOT IMPLEMENTED        | No buyer notification on response               |
| Sidebar navigation  | ⚠️ ONLY IN B2B WORKSPACE | Not accessible as standalone sidebar entry      |

**Blocking gaps for BASIC OPERATIONAL: None.**
All workflow-critical layers are complete. The noted gaps are quality/completeness items
for future governance cycles, not blockers for the current operational boundary.

**Not eligible for advancement beyond BASIC OPERATIONAL** until:
1. A new explicit product decision authorizes expansion beyond pre-negotiation
2. Supplier-side UI tests are added
3. (Optional) Search/filter UI controls are added

---

## 18. Required Follow-Up Actions (Governance-Gated)

The following actions are **not authorized by this investigation**. Each requires a
separate governance unit before any implementation work may begin.

| Action                                      | Requires                                      |
|---------------------------------------------|-----------------------------------------------|
| Add supplier RFQ inbox UI tests             | New governance unit (frontend test unit)      |
| Add frontend search/filter controls         | New governance unit                           |
| Add buyer notification on supplier response | New product decision + governance unit        |
| Add standalone sidebar nav entry            | New governance unit                           |
| Any post-pre-negotiation RFQ capability     | New explicit product decision (current cap prevents) |

---

## 19. Artifact Provenance

| Item                          | Value                                                         |
|-------------------------------|---------------------------------------------------------------|
| Investigation conducted       | 2026-07-12                                                    |
| Investigation mode            | TECS SAFE-WRITE — Read-only discovery (no files modified)     |
| Files read (schema)           | `server/prisma/schema.prisma`                                 |
| Files read (backend)          | `server/src/routes/tenant.ts` (lines 1885–2160)               |
| Files read (backend trades)   | `server/src/routes/tenant/trades.g017.ts`                     |
| Files read (service)          | `services/catalogService.ts`                                  |
| Files read (frontend)         | `components/Tenant/BuyerRfqListSurface.tsx`                   |
| Files read (frontend)         | `components/Tenant/BuyerRfqDetailSurface.tsx`                 |
| Files read (app state)        | `App.tsx` (targeted searches + render case)                   |
| Files read (tests)            | `server/tests/rfq-detail-route.shared.test.ts`                |
| Files read (governance units) | TECS-RFQ-DOMAIN-001, TECS-RFQ-SUPPLIER-READ-001,              |
|                               | TECS-RFQ-RESPONSE-001, TECS-RFQ-READ-001,                     |
|                               | TECS-RFQ-BUYER-RESPONSE-READ-001, TECS-RFQ-BUYER-LIST-READ-001, |
|                               | TECS-RFQ-BUYER-DETAIL-UI-001                                  |
| Files read (decisions)        | PRODUCT-DEC-RFQ-PRE-NEGOTIATION-CAP                           |
| Files read (product-truth)    | RFQ-NEGOTIATION-PARENT-FAMILY-REMAINDER-v1.md                 |
|                               | WL-RFQ-EXPOSURE-CONTINUITY-DESIGN-v1.md                       |
| Governance control read       | NEXT-ACTION.md, OPEN-SET.md, SNAPSHOT.md                      |
| Files created                 | `docs/TEXQTIC-B2B-SUPPLIER-RFQ-INBOX-INVESTIGATION-v1.md`     |
| Files modified                | None                                                          |
| Governance control updated    | No (investigation-only; no lifecycle change required)         |

---

*Investigation complete. No implementation authorized. Next RFQ action requires a separate explicit product decision.*
