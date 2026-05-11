# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001

---

## §1 — Packet Metadata

| Field | Value |
|---|---|
| **Packet ID** | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001 |
| **Type** | PLANNING_ONLY |
| **Status** | DESIGN_COMPLETE |
| **Tracker Packet** | 10 (Phase 1C) |
| **Date** | 2026-05-11 |
| **Predecessor** | TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001 (`82ba96e` — BLOCKED_BACKEND_QUOTE_CONTRACT_MISSING) |
| **Basis Commit** | `82ba96e` (HEAD at design time) |
| **Author** | Paresh Patel |
| **Doctrine** | TexQtic Doctrine v1.4 |
| **Safe-Write Mode** | ALWAYS ON |
| **Delivery constraint** | PLANNING_ONLY — no backend or frontend code was written or modified in this packet |

---

## §2 — Problem Statement

The FE-8 governance packet (`TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001`, committed `82ba96e`) is
`BLOCKED_BACKEND_QUOTE_CONTRACT_MISSING`. Repo-truth validation confirmed:

- No `NetworkPoolRfqSupplierQuote` (or equivalent) Prisma model exists.
- No `poolRfqSupplierQuotes.ts` route file exists.
- No `submitQuote`, `getQuote`, or `listQuotes` service methods exist in `networkPoolRfq.service.ts`.
- Integration test PRQ-28 explicitly asserts `expect(data).not.toHaveProperty('quotes')`.
- Integration test SRI-11 explicitly asserts `expect(record['quote_amount']).toBeUndefined()`.
- Tracker Phase 1C — all four packets (10 Design, 11 Schema, 12 Service, 13 Route) are `NOT_STARTED`.

This packet provides the authoritative design for the Phase 1C supplier quote backend contract.
It is the prerequisite for Packets 11 (Schema), 12 (Service), and 13 (Route), and — once all
three are delivered and verified — for unblocking FE-8 (with Paresh authorization).

---

## §3 — Authority Sources Read

All of the following were read before any design was written:

| Source | Purpose |
|---|---|
| `governance/control/NEXT-ACTION.md` | Confirmed HEAD posture, last closed unit, DPP hold keys |
| `governance/control/OPEN-SET.md` | Confirmed last updated, FE-8 blocked note |
| `governance/control/GOVERNANCE-CHANGELOG.md` | Confirmed FE-8 BLOCKED entry; last entry before this packet |
| `governance/TEXQTIC-NC-COMPREHENSIVE-IMPLEMENTATION-PLAN-TRACKER-001.md` | Confirmed Phase 1C packet list (10–13), placeholder route path, NOT_STARTED state, FE-8/FE-9 hold status |
| `governance/TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001.md` | FE-8 BLOCKED packet — confirmed repo-truth validation findings and blocker scope |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001.md` | Phase 1B design patterns; invite-anchor precedent |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001.md` | OD-1 through OD-7 locked decisions |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001.md` | `NetworkPoolRfqSupplierInvite` columns + constraints |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-SERVICE-001.md` | Supplier service method signatures, DTO patterns, `toInviteSupplierRecord` |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SUPPLIER-ROUTE-001.md` | Route plugin style, error mapper pattern, OD mapping confirmation |
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-PROD-VERIFY-GOV-CLOSE-002.md` | Production state at `4cd7c0a`; all 4 invite routes live |
| `server/prisma/schema.prisma` (NC section) | Confirmed no quote model; `NetworkPoolRfq` + `NetworkPoolRfqSupplierInvite` columns; relation pattern |
| `server/src/services/networkPoolRfq.service.ts` (lines 1–240) | Error class naming; service class structure; `NetworkPoolRfqSupplierInviteSupplierRecord`; existing method signatures |
| `server/src/routes/tenant/poolRfqSupplierInvites.ts` | `onRequest` hook array; import pattern; middleware names |
| `server/src/routes/tenant.ts` | Route registration prefix `/tenant/network-commerce` for supplier routes (line 9005) |
| `server/src/middleware/ncPoolSupplierInviteFeatureGate.middleware.ts` | Two-layer gate pattern; flag key `nc.procurement_pools.supplier_invites.enabled` |
| `server/src/middleware/ncPoolRfqFeatureGate.middleware.ts` | Two-layer gate pattern reference |
| `server/src/routes/tenant/poolRfq.integration.test.ts` | PRQ-28 no-quote guard confirmed |
| `server/src/routes/tenant/poolRfqSupplierInvites.integration.test.ts` | SRI-11 no-quote-amount guard confirmed |

---

## §4 — Repo-Truth Summary at Basis Commit `82ba96e`

### 4.1 Confirmed Absent (Quote layer)

| What | Confirmed absent |
|------|-----------------|
| Prisma model | No `NetworkPoolRfqSupplierQuote` or equivalent |
| DB table | No `network_pool_rfq_supplier_quotes` |
| Service methods | No `submitQuote`, `withdrawQuote`, `getQuote`, `listQuotesForRfq` |
| Error classes | No `NetworkPoolRfqSupplierQuote*` error classes |
| Route file | No `poolRfqSupplierQuotes.ts` |
| Feature gate | No `nc.procurement_pools.supplier_quotes.enabled` flag key |

### 4.2 Confirmed Present (Phase 1B — invite chain)

| What | Status | Authority |
|------|--------|-----------|
| All 4 supplier invite routes | LIVE @ `4cd7c0a` | GOV-CLOSE-002 |
| `NetworkPoolRfqSupplierInvite` (19 columns) | DEPLOYED | SCHEMA-001 |
| OD-1 through OD-7 | LOCKED | DECISION-AUDIT-001 |
| `computeEffectiveInviteStatus` (lazy EXPIRED) | IMPLEMENTED | SERVICE-001 |
| `assertSupplierSafeShape` helper | IN TESTS | SRI-11 |
| RFQ status enum: `ISSUED\|QUOTED\|ACCEPTED\|REJECTED\|EXPIRED\|CANCELLED` | DEPLOYED | SCHEMA-001 |

### 4.3 Integration Test Guards (must be updated in Packet 12)

- **PRQ-28:** `expect(data).not.toHaveProperty('quotes')` — will remain valid until Packet 13 adds quote routes; not broken by this design packet.
- **SRI-11:** `expect(record['quote_amount']).toBeUndefined()` — will remain valid; invite records never gain `quote_amount` fields.

---

## §5 — Business Workflow Design

Phase 1C adds step 4 to the existing Phase 1B workflow:

```
[Phase 1A]  Owner creates pool → adds demand lines → locks snapshot
[Phase 1A]  Owner issues RFQ (status: ISSUED) → pool: CLOSED_FOR_BIDS

[Phase 1B]  Owner sends supplier invite (invite status: PENDING)
[Phase 1B]  Supplier views invite inbox (FE-7)
[Phase 1B]  Supplier accepts invite (invite status: ACCEPTED)

[Phase 1C]  *** Supplier submits quote (quote status: SUBMITTED) ***
[Phase 1C]  *** RFQ status: ISSUED → QUOTED (on first submitted quote) ***

[Phase 1D]  Owner views quote list (owner read surface — out of Phase 1C scope)
[Phase 1D]  Owner accepts or rejects quote → award / allocation
[Phase 1E+] Order creation → settlement → invoice
```

Phase 1C scope is bounded to: quote data model + `submitQuote` service method + supplier quote
route + feature gate. Owner-side quote read is an adjacent concern; its design is deferred (§19
Open Decision Q-4).

---

## §6 — Quote Lifecycle Design

### 6.1 Status Machine

```
(none) ──submitQuote──► SUBMITTED ──withdrawQuote──► WITHDRAWN
```

Phase 1C delivers only: `(none) → SUBMITTED` via `submitQuote`.
`withdrawQuote` (`SUBMITTED → WITHDRAWN`) is deferred to Phase 1C.1 or 1D (§19 Q-3).

### 6.2 Locked Phase 1C Decisions (QD series)

These are analogous to OD-1 through OD-7 from Phase 1B and are locked by this design packet.
Implementation packets must not deviate without a new DECISION-AUDIT packet.

| ID | Decision | Implementation consequence |
|----|----------|---------------------------|
| **QD-1** | Invite must be in ACCEPTED status (effective, per OD-2 lazy-EXPIRED) before quote may be submitted | Service layer: `computeEffectiveInviteStatus(invite)` === 'ACCEPTED' check before insert |
| **QD-2** | One quote per invite — `UNIQUE(invite_id)` non-partial | Any existing row triggers `NetworkPoolRfqSupplierQuoteConflictError` (409). Phase 1D may relax to partial UNIQUE WHERE status='SUBMITTED' |
| **QD-3** | No lazy-expiry for quotes in Phase 1C | `validity_until` tracked but not computed or enforced. Phase 1D may add `computeEffectiveQuoteStatus` |
| **QD-4** | `quoteAmount`, `currency` required; `validityUntil`, `supplierNote` optional | No business defaults. Validation: `quoteAmount > 0`, `currency` 3–10 chars |
| **QD-5** | `metadataInternalJson` is NEVER exposed to suppliers | Supplier DTO excludes it; route passes service record directly; `assertSupplierSafeQuoteShape` test helper verifies absence |
| **QD-6** | Quote feature gate is independent of invite gate | Suppliers may view invites even when quote flag is disabled. New gate `nc.procurement_pools.supplier_quotes.enabled` |
| **QD-7** | Direct lifecycle log only — `StateMachineService.transition()` is NEVER called for quote lifecycle | `tx.networkLifecycleLog.create()` directly. Matches OD-7 established pattern |
| **QD-8** | RFQ ISSUED → QUOTED transition written directly via `tx.networkPoolRfq.update()` | No SM transition (SM would block: CLOSED_FOR_BIDS self-transition rule applies; ISSUED→QUOTED not in allowedTransitions). Direct lifecycle log written for status change |

---

## §7 — Supplier Invite Relationship

The quote is anchored to the invite:

```
NetworkPoolRfqSupplierInvite (1) ──────── (0..1) NetworkPoolRfqSupplierQuote
                                           [UNIQUE(invite_id) Phase 1C]
```

Design constraints:
- `invite_id FK → network_pool_rfq_supplier_invites(id)` ON DELETE CASCADE.
- Quote inherits context from invite: `rfq_id`, `pool_id`, `supplier_org_id`, `owner_org_id` are
  denormalized at insert time (same as invite pattern for `pool_id`).
- A quote may only be submitted if the invite's **effective** status is ACCEPTED (QD-1).
- When the invite is CASCADE-deleted, the quote is also deleted.
- The `(rfq_id, supplier_org_id)` pair is already unique via the invite constraint (OD-1);
  the quote's `UNIQUE(invite_id)` is sufficient without adding a redundant quote-level unique.

---

## §8 — Data Model Design

### 8.1 Table and Model Name

| Identifier | Value |
|---|---|
| Table name | `network_pool_rfq_supplier_quotes` |
| Prisma model | `NetworkPoolRfqSupplierQuote` |
| Naming pattern | Follows `NetworkPoolRfq` (base) + `SupplierQuote` (domain) |

### 8.2 Column Specification

| Column | DB Type | Nullable | Notes |
|--------|---------|----------|-------|
| `id` | UUID PK | NOT NULL | `gen_random_uuid()` |
| `owner_org_id` | UUID | NOT NULL | RLS anchor (pool owner/buyer org). Denormalized from invite. FK → organizations |
| `supplier_org_id` | UUID | NOT NULL | RLS anchor (supplier). Denormalized from invite. FK → organizations |
| `rfq_id` | UUID | NOT NULL | FK → `network_pool_rfqs(id)` ON DELETE CASCADE |
| `pool_id` | UUID | NOT NULL | FK → `network_pools(id)` ON DELETE CASCADE. Denormalized (mirrors invite) |
| `invite_id` | UUID | NOT NULL | FK → `network_pool_rfq_supplier_invites(id)` ON DELETE CASCADE. Primary anchor |
| `quote_ref` | VARCHAR(100) UNIQUE | NOT NULL | Service-generated UUID-derived ref. Non-empty enforced by DB CHECK |
| `status` | VARCHAR(50) | NOT NULL | DB CHECK IN ('SUBMITTED','WITHDRAWN'). Default: 'SUBMITTED' |
| `quote_amount` | DECIMAL(18,2) | NOT NULL | Aggregate quote value. DB CHECK: > 0 |
| `currency` | VARCHAR(10) | NOT NULL | ISO 4217 currency code. Non-empty enforced by DB CHECK |
| `validity_until` | TIMESTAMPTZ | NULL | Optional quote validity window. Not enforced in Phase 1C (QD-3) |
| `supplier_note` | TEXT | NULL | Optional note from supplier to owner |
| `submitted_at` | TIMESTAMPTZ | NOT NULL | Timestamp of quote submission |
| `submitted_by_user_id` | UUID | NULL | Nullable. No FK (QD-4 pattern: validated at service layer only, like OD-4) |
| `withdrawn_at` | TIMESTAMPTZ | NULL | Set when status transitions to WITHDRAWN |
| `withdraw_reason` | TEXT | NULL | Optional supplier-provided reason on withdrawal |
| `metadata_internal_json` | JSONB | NULL | Internal ops metadata. NEVER exposed to suppliers (QD-5) |
| `created_at` | TIMESTAMPTZ | NOT NULL | `DEFAULT now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `DEFAULT now()` |

### 8.3 Constraints

| Constraint | Definition |
|---|---|
| PK | `nc_pool_rfq_supplier_quotes_pkey` — `id` |
| UNIQUE | `nc_pool_rfq_supplier_quotes_quote_ref_unique` — `(quote_ref)` |
| UNIQUE | `nc_pool_rfq_supplier_quotes_invite_unique` — `(invite_id)` — QD-2: one quote per invite |
| CHECK | `status IN ('SUBMITTED','WITHDRAWN')` |
| CHECK | `quote_amount > 0` |
| CHECK | `length(quote_ref) > 0` |
| CHECK | `length(currency) > 0` |
| FK | `nc_pool_rfq_supplier_quotes_owner_org_id_fk` — `owner_org_id` → `organizations(id)` ON DELETE CASCADE |
| FK | `nc_pool_rfq_supplier_quotes_supplier_org_id_fk` — `supplier_org_id` → `organizations(id)` ON DELETE CASCADE |
| FK | `nc_pool_rfq_supplier_quotes_rfq_id_fk` — `rfq_id` → `network_pool_rfqs(id)` ON DELETE CASCADE |
| FK | `nc_pool_rfq_supplier_quotes_pool_id_fk` — `pool_id` → `network_pools(id)` ON DELETE CASCADE |
| FK | `nc_pool_rfq_supplier_quotes_invite_id_fk` — `invite_id` → `network_pool_rfq_supplier_invites(id)` ON DELETE CASCADE |

### 8.4 Indexes

| Index | Columns |
|---|---|
| `idx_nc_pool_rfq_supplier_quotes_invite_id` | `(invite_id)` |
| `idx_nc_pool_rfq_supplier_quotes_rfq_id` | `(rfq_id)` |
| `idx_nc_pool_rfq_supplier_quotes_pool_id` | `(pool_id)` |
| `idx_nc_pool_rfq_supplier_quotes_owner_org_id` | `(owner_org_id, created_at DESC)` |
| `idx_nc_pool_rfq_supplier_quotes_supplier_org_id` | `(supplier_org_id, created_at DESC)` |
| `idx_nc_pool_rfq_supplier_quotes_status` | `(status)` |
| `idx_nc_pool_rfq_supplier_quotes_submitted_at` | `(submitted_at DESC)` |
| `idx_nc_pool_rfq_supplier_quotes_created_at` | `(created_at DESC)` |

### 8.5 Tracker Placeholder Deviation Note

The Tracker (Packet 11 entry, line ~508) originally recorded:
> "Schema for quote fields on `network_pool_rfqs`; `quote_amount`, `currency`, `quote_status`"

This was a pre-OD-6 placeholder written before the multi-supplier quote model was designed.
Adding quote fields to the RFQ table would only support a single quote per RFQ (not one per
supplier), would conflate RFQ and quote lifecycle, and would violate the `owner_org_id` RLS
anchor by embedding supplier data in the owner's RFQ row.

**Recommendation (Open Decision Q-2):** Use a dedicated `NetworkPoolRfqSupplierQuote` table.
Requires Paresh authorization before Packet 11 begins.

---

## §9 — Supplier-Safe DTO Design

### 9.1 Interface: `NetworkPoolRfqSupplierQuoteSupplierRecord`

```typescript
export interface NetworkPoolRfqSupplierQuoteSupplierRecord {
  id:                   string;
  invite_id:            string;
  quote_ref:            string;
  /** QD-3: Effective status — Phase 1C only SUBMITTED or WITHDRAWN */
  status:               string;
  quote_amount:         string;     // Decimal serialized as string
  currency:             string;
  validity_until:       string | null;
  supplier_note:        string | null;
  submitted_at:         string;
  submitted_by_user_id: string | null;
  withdrawn_at:         string | null;
  withdraw_reason:      string | null;
  created_at:           string;
  updated_at:           string;
}
```

**Excluded from supplier record (QD-5):**
- `metadata_internal_json` — internal ops
- `owner_org_id` — owner identity not revealed to supplier
- `rfq_id`, `pool_id` — supplier does not need these; they have `invite_id` as context

**`assertSupplierSafeQuoteShape` test helper** (to be added in Packet 12) must verify absent:
`metadata_internal_json`, `metadata_internal_json` (snake case), `owner_org_id`, `rfq_id`,
`pool_id`.

---

## §10 — Owner-Safe DTO Design (Phase 1D dead-end prevention)

This DTO is NOT delivered in Phase 1C but is designed here to prevent schema dead-ends when
Packet 14+ (owner quote read) is built.

### 10.1 Interface: `NetworkPoolRfqSupplierQuoteOwnerRecord`

```typescript
export interface NetworkPoolRfqSupplierQuoteOwnerRecord {
  id:                   string;
  owner_org_id:         string;
  supplier_org_id:      string;
  rfq_id:               string;
  pool_id:              string;
  invite_id:            string;
  quote_ref:            string;
  status:               string;
  quote_amount:         string;
  currency:             string;
  validity_until:       string | null;
  supplier_note:        string | null;
  submitted_at:         string;
  submitted_by_user_id: string | null;
  withdrawn_at:         string | null;
  created_at:           string;
  updated_at:           string;
  // metadata_internal_json intentionally excluded from DTO even for owner (ops-only)
  // withdraw_reason intentionally excluded from owner record (supplier-internal)
}
```

---

## §11 — API Route Design

### 11.1 Route Path Recommendation

**Recommended (this design):** Invite-anchored path
```
POST   /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
GET    /api/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote
```

**Tracker placeholder (superseded):**
```
POST   /api/tenant/network-commerce/pools/:poolId/rfq/:rfqId/quote
```

**Rationale for deviation (Open Decision Q-1):**
The tracker placeholder pre-dates OD-6 (supplier routes must not require parent pool/RFQ flags).
The invite-anchored path is consistent with all four Phase 1B supplier routes (OD-6).
The supplier already holds an `inviteId`; requiring `poolId` and `rfqId` is redundant and forces
the supplier to carry owner-domain identifiers. **This deviation requires Paresh authorization
before Packet 13 begins.**

### 11.2 Phase 1C Route Table

| Method | Path (relative to `/api`) | Guards | Purpose |
|--------|---------------------------|--------|---------|
| `POST` | `/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote` | auth + db + quote feature gate | Submit quote against accepted invite |
| `GET` | `/tenant/network-commerce/supplier-rfq-invites/:inviteId/quote` | auth + db + quote feature gate | View current quote for invite (optional Phase 1C — see Q-8) |

### 11.3 Route Plugin File

**New file:** `server/src/routes/tenant/poolRfqSupplierQuotes.ts`

Plugin name: `tenantPoolRfqSupplierQuotesRoutes`

Registration in `server/src/routes/tenant.ts`:
```typescript
import tenantPoolRfqSupplierQuotesRoutes from './tenant/poolRfqSupplierQuotes.js';
// ...
await fastify.register(tenantPoolRfqSupplierQuotesRoutes, {
  prefix: '/tenant/network-commerce',
});
```

### 11.4 onRequest Hook Array (per route)

```typescript
onRequest: [
  tenantAuthMiddleware,
  databaseContextMiddleware,
  ncPoolSupplierQuoteFeatureGateMiddleware,  // NEW — see §12
],
```

Note: No parent pool/RFQ gate (QD-6 consistent with OD-6).

---

## §12 — Feature Gate Design

### 12.1 New Flag Key

`nc.procurement_pools.supplier_quotes.enabled`

### 12.2 New Middleware File

**New file:** `server/src/middleware/ncPoolSupplierQuoteFeatureGate.middleware.ts`

**Pattern:** Identical two-layer pattern to `ncPoolSupplierInviteFeatureGateMiddleware`:
- Layer 1: global flag `nc.procurement_pools.supplier_quotes.enabled` must be enabled
- Layer 2: per-tenant override for request org must be enabled
- Fails closed if orgId not resolvable
- Does NOT check parent pool/RFQ flags (QD-6)

### 12.3 Feature Flag DB Row (Packet 11 responsibility)

```sql
INSERT INTO feature_flags (key, description, enabled, created_at, updated_at)
VALUES (
  'nc.procurement_pools.supplier_quotes.enabled',
  'Phase 1C: Enable supplier quote submission for pool RFQs',
  false,
  now(),
  now()
);
```

Inserted during Packet 11 (Schema) migration. Default: `false` (fails closed).

### 12.4 Rationale for Independent Gate

The quote gate is independent from the invite gate. A supplier org may have the invite gate
enabled (to view and respond to invites) while the quote gate is still off. This enables:
- Phased rollout of the quote capability independently from invites.
- Testing invite flow without activating quote submission.

---

## §13 — Service Design

### 13.1 New Method: `submitQuote`

Added to `NetworkPoolRfqService` in `server/src/services/networkPoolRfq.service.ts`.

```typescript
async submitQuote(
  orgId: string,               // From dbContext.orgId — supplier org
  userId: string | null,       // From dbContext.userId — nullable (QD-4)
  inviteId: string,            // Path param
  input: SubmitQuoteInput,     // Validated request body
): Promise<NetworkPoolRfqSupplierQuoteSupplierRecord>
```

**Input interface:**

```typescript
export interface SubmitQuoteInput {
  quote_amount:    string | number;   // Required. Positive decimal.
  currency:        string;            // Required. ISO 4217, 3–10 chars.
  validity_until?: string | null;     // Optional. ISO datetime.
  supplier_note?:  string | null;     // Optional. Max 5000 chars.
}
```

**Transaction steps (all within `this.db.$transaction`):**

1. Fetch invite: `findFirst({ where: { id: inviteId, supplierOrgId: orgId } })` with RFQ join.
2. If not found → throw `NetworkPoolRfqSupplierInviteNotFoundError` (reuses existing).
3. Apply `computeEffectiveInviteStatus(invite)`. If result !== 'ACCEPTED' →
   throw `NetworkPoolRfqSupplierQuoteInviteNotAcceptedError(effectiveStatus)`.
4. Check for existing quote: `findFirst({ where: { inviteId } })`. If found →
   throw `NetworkPoolRfqSupplierQuoteConflictError` (409).
5. Validate RFQ status: must be 'ISSUED' or 'QUOTED'. Otherwise →
   throw `NetworkPoolRfqSupplierQuoteInvalidInputError('RFQ is not open for quotes')`.
6. Generate `quoteRef = 'SQ-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()`.
7. Insert `NetworkPoolRfqSupplierQuote` row via `tx.networkPoolRfqSupplierQuote.create(...)`.
8. Write lifecycle log (QD-7): `tx.networkLifecycleLog.create(...)` — event
   `nc_pool_rfq_supplier_quote_submitted`.
9. If RFQ status === 'ISSUED':
   - `tx.networkPoolRfq.update({ where: { id: rfqId }, data: { status: 'QUOTED', updatedAt: now() } })`
   - Write lifecycle log: event `nc_pool_rfq_status_changed` (ISSUED → QUOTED).
10. Return `toQuoteSupplierRecord(quoteRow)`.

### 13.2 New Helper: `toQuoteSupplierRecord`

Private helper in `NetworkPoolRfqService`. Maps a DB row to
`NetworkPoolRfqSupplierQuoteSupplierRecord` (§9.1). Excludes `metadata_internal_json`,
`owner_org_id`, `rfq_id`, `pool_id`.

### 13.3 New Error Classes

Added to `networkPoolRfq.service.ts` alongside existing error classes:

```typescript
export class NetworkPoolRfqSupplierQuoteInvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkPoolRfqSupplierQuoteInvalidInputError';
  }
}

export class NetworkPoolRfqSupplierQuoteNotFoundError extends Error {
  constructor() {
    super('Supplier quote not found or not owned by this organisation');
    this.name = 'NetworkPoolRfqSupplierQuoteNotFoundError';
  }
}

export class NetworkPoolRfqSupplierQuoteConflictError extends Error {
  constructor() {
    super(
      'A quote for this invite already exists. ' +
      'Re-submission is not permitted in Phase 1C (QD-2).',
    );
    this.name = 'NetworkPoolRfqSupplierQuoteConflictError';
  }
}

export class NetworkPoolRfqSupplierQuoteInviteNotAcceptedError extends Error {
  constructor(effectiveStatus: string) {
    super(
      `Cannot submit a quote for invite with effective status '${effectiveStatus}'. ` +
      `Only ACCEPTED invites may be quoted against (QD-1).`,
    );
    this.name = 'NetworkPoolRfqSupplierQuoteInviteNotAcceptedError';
  }
}
```

---

## §14 — Lifecycle Logging Design

All lifecycle logging follows OD-7 / QD-7: **direct `tx.networkLifecycleLog.create()`**.
`StateMachineService.transition()` is NEVER called for quote lifecycle events.

### 14.1 Event: `nc_pool_rfq_supplier_quote_submitted`

Emitted in step 8 of `submitQuote`:

```typescript
await tx.networkLifecycleLog.create({
  data: {
    entityType:         'network_pool_rfq_supplier_quote',
    entityId:           quoteRow.id,
    fromStatus:         null,
    toStatus:           'SUBMITTED',
    performedByUserId:  userId,
    orgId:              orgId,           // supplier org
    requestId:          input.request_id ?? null,
    metadata:           {
      inviteId:    inviteId,
      rfqId:       invite.rfqId,
      poolId:      invite.poolId,
      quoteAmount: String(input.quote_amount),
      currency:    input.currency,
    },
  },
});
```

### 14.2 Event: `nc_pool_rfq_status_changed` (ISSUED → QUOTED)

Emitted in step 9 of `submitQuote` (only when RFQ status was 'ISSUED'):

```typescript
await tx.networkLifecycleLog.create({
  data: {
    entityType:         'network_pool_rfq',
    entityId:           invite.rfqId,
    fromStatus:         'ISSUED',
    toStatus:           'QUOTED',
    performedByUserId:  userId,
    orgId:              invite.ownerOrgId,   // owner org (RFQ owner)
    requestId:          input.request_id ?? null,
    metadata:           {
      triggeredByInviteId: inviteId,
      triggeredByQuoteId:  quoteRow.id,
      supplierOrgId:       orgId,
    },
  },
});
```

---

## §15 — RFQ State Transition Impact

### 15.1 Transition Logic on `submitQuote`

| RFQ Status at submit time | Quote is first for RFQ? | Action | Post-submit RFQ Status |
|---------------------------|------------------------|--------|------------------------|
| `ISSUED` | Yes (no prior SUBMITTED quotes) | Update RFQ → QUOTED + lifecycle log | `QUOTED` |
| `ISSUED` | No (another quote already SUBMITTED) | No RFQ update (already QUOTED from prior) | `ISSUED` (should not occur — see note) |
| `QUOTED` | First or subsequent | No RFQ update (already QUOTED) | `QUOTED` |
| `CANCELLED` | N/A | Throw `NetworkPoolRfqSupplierQuoteInvalidInputError` | Unchanged |
| `EXPIRED` | N/A | Throw `NetworkPoolRfqSupplierQuoteInvalidInputError` | Unchanged |
| `ACCEPTED` | N/A | Out of Phase 1C scope | Unchanged |
| `REJECTED` | N/A | Out of Phase 1C scope | Unchanged |

> Note: A race condition exists where RFQ is ISSUED but a concurrent quote is being submitted
> by another supplier. Step 9's status check `=== 'ISSUED'` handles this: the first committing
> transaction sets status to QUOTED; the second sees QUOTED and skips the update. No RFQ update
> conflict. The `UNIQUE(invite_id)` constraint prevents two quotes per invite regardless.

### 15.2 Why Direct Update (Not StateMachineService)

Per QD-7 / OD-7: `StateMachineService.transition()` is NEVER called for invite or quote
lifecycle events. The ISSUED → QUOTED transition is not in `allowedTransitions` of the
state machine (the pool status is `CLOSED_FOR_BIDS` at this point, and the SM governs pool
status, not RFQ status). Direct `tx.networkPoolRfq.update()` is the correct approach.

---

## §16 — Validation Rules

### 16.1 Route Layer (Zod strict — `poolRfqSupplierQuotes.ts`)

```typescript
// inviteIdParamSchema
z.object({
  inviteId: z.string().uuid('inviteId must be a valid UUID'),
})

// submitQuoteBodySchema (strict)
z.object({
  quote_amount:   z.number().positive('quote_amount must be a positive number'),
  currency:       z.string().min(3).max(10, 'currency must be 3–10 characters'),
  validity_until: z.string().datetime({ offset: true }).nullable().optional(),
  supplier_note:  z.string().max(5000).nullable().optional(),
}).strict()
```

Unknown fields rejected via `.strict()`.

### 16.2 Service Layer (`networkPoolRfq.service.ts`)

| Rule | Error on failure |
|------|-----------------|
| Invite exists with `supplierOrgId === orgId` | `NetworkPoolRfqSupplierInviteNotFoundError` (404) |
| `computeEffectiveInviteStatus(invite) === 'ACCEPTED'` | `NetworkPoolRfqSupplierQuoteInviteNotAcceptedError` (422) |
| No existing quote on invite | `NetworkPoolRfqSupplierQuoteConflictError` (409) |
| RFQ status in ('ISSUED', 'QUOTED') | `NetworkPoolRfqSupplierQuoteInvalidInputError` (400) |

---

## §17 — Error Mapping Design

Route error mapper function `mapSupplierQuoteRouteError(reply, err)` — returns `true` if matched
and response sent, `false` otherwise. Called in all route `catch` blocks.

| Error Class | HTTP Status | Error Code |
|---|---|---|
| `NetworkPoolRfqSupplierQuoteInvalidInputError` | 400 | `INVALID_INPUT` |
| `NetworkPoolRfqSupplierInviteNotFoundError` | 404 | `SUPPLIER_INVITE_NOT_FOUND` |
| `NetworkPoolRfqSupplierQuoteNotFoundError` | 404 | `SUPPLIER_QUOTE_NOT_FOUND` |
| `NetworkPoolRfqSupplierQuoteConflictError` | 409 | `QUOTE_ALREADY_SUBMITTED` |
| `NetworkPoolRfqSupplierQuoteInviteNotAcceptedError` | 422 | `INVITE_NOT_ACCEPTED` |

All other errors: re-thrown to Fastify's `setErrorHandler`.

---

## §18 — Test Plan

### 18.1 Service Integration Tests (Packet 12)

File: `server/src/routes/tenant/poolRfqSupplierQuotes.integration.test.ts`

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SQ-01 | Submit quote for ACCEPTED invite | 201; quote status SUBMITTED; invite.status ACCEPTED (unchanged) |
| SQ-02 | Submit quote for PENDING invite | 422 INVITE_NOT_ACCEPTED |
| SQ-03 | Submit quote for DECLINED invite | 422 INVITE_NOT_ACCEPTED |
| SQ-04 | Submit quote for EXPIRED invite (OD-2 lazy check) | 422 INVITE_NOT_ACCEPTED |
| SQ-05 | Submit quote for non-existent invite | 404 SUPPLIER_INVITE_NOT_FOUND |
| SQ-06 | Submit quote for invite belonging to different org | 404 SUPPLIER_INVITE_NOT_FOUND |
| SQ-07 | Submit second quote on same invite | 409 QUOTE_ALREADY_SUBMITTED |
| SQ-08 | Submit first quote on ISSUED RFQ → RFQ becomes QUOTED | RFQ.status === 'QUOTED' |
| SQ-09 | Submit second quote on already-QUOTED RFQ (different invite) | RFQ.status remains 'QUOTED' |
| SQ-10 | Submit quote on CANCELLED RFQ | 400 INVALID_INPUT |
| SQ-11 | `metadata_internal_json` absent from supplier response | assertSupplierSafeQuoteShape |
| SQ-12 | `owner_org_id` absent from supplier response | assertSupplierSafeQuoteShape |
| SQ-13 | Lifecycle log created on submit (nc_pool_rfq_supplier_quote_submitted) | Log row exists |
| SQ-14 | Lifecycle log created on ISSUED→QUOTED transition | Log row exists with fromStatus ISSUED |
| SQ-15 | No lifecycle log for ISSUED→QUOTED when RFQ already QUOTED | No extra log row |

### 18.2 Route Integration Tests (Packet 13)

| Test ID | Scenario | Expected |
|---------|----------|----------|
| SQR-01 | POST without auth header | 401 |
| SQR-02 | POST with global quote flag disabled | 403 FEATURE_DISABLED |
| SQR-03 | POST with per-tenant quote flag disabled | 403 FEATURE_DISABLED |
| SQR-04 | POST with invite flag enabled but quote flag disabled | 403 FEATURE_DISABLED |
| SQR-05 | Valid submit with all fields | 201; body matches supplier record shape |
| SQR-06 | Valid submit with only required fields | 201 |
| SQR-07 | Invalid inviteId (not UUID) | 400 validation error |
| SQR-08 | Unknown field in body | 400 strict validation error |
| SQR-09 | quote_amount = 0 | 400 validation error |
| SQR-10 | currency too short (< 3 chars) | 400 validation error |
| SQR-11 | GET /quote — quote exists | 200; supplier record |
| SQR-12 | GET /quote — no quote yet | 404 SUPPLIER_QUOTE_NOT_FOUND |

### 18.3 Existing Test Guards (must NOT regress)

- **PRQ-28:** `expect(data).not.toHaveProperty('quotes')` — RFQ response never includes a
  `quotes` array directly. The quote model is separate; RFQ record shape unchanged.
- **SRI-11:** `expect(record['quote_amount']).toBeUndefined()` — Invite records never gain
  `quote_amount`. Quote data lives on the `NetworkPoolRfqSupplierQuote` model, not on the
  invite record.

---

## §19 — Migration Sequencing

After this design packet, Phase 1C continues with three implementation packets:

| Tracker # | Packet ID | Deliverable | Predecessor |
|-----------|-----------|-------------|-------------|
| 11 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001` | SQL migration creating `network_pool_rfq_supplier_quotes` + feature flag row; `prisma db pull`; `prisma generate` | This packet DESIGN_COMPLETE |
| 12 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001` | `submitQuote` service method + new error classes + `toQuoteSupplierRecord` + new feature gate middleware + service/integration tests | Packet 11 COMPLETE |
| 13 | `TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-ROUTE-001` | `poolRfqSupplierQuotes.ts` route plugin + `tenant.ts` registration + route integration tests | Packet 12 COMPLETE |

After Packet 13 is verified:
- `TEXQTIC-NC-FRONTEND-SUPPLIER-QUOTE-UI-001` (FE-8) may be unblocked upon Paresh authorization.
- `TEXQTIC-NC-FRONTEND-AWARD-ALLOCATION-UI-001` (FE-9 owner quote review) becomes available.

---

## §20 — Open Decisions

All open decisions below require **Paresh authorization** before the indicated packet begins.
No implementation packet may proceed past design without these decisions resolved.

| ID | Decision | Recommendation | Required before | Risk if deferred |
|----|----------|---------------|-----------------|-----------------|
| **Q-1** | Route path: invite-anchored (`/supplier-rfq-invites/:inviteId/quote`) vs tracker placeholder (`/:poolId/rfq/:rfqId/quote` under pools prefix) | **Invite-anchored** — consistent with OD-6; supplier already holds inviteId | Packet 13 | Route file structure, test paths, and registration all change if switched |
| **Q-2** | Dedicated `NetworkPoolRfqSupplierQuote` table vs quote fields on `network_pool_rfqs` | **Dedicated table** — supports multi-supplier quotes, clean RLS anchoring, invite linkage | Packet 11 | Locked once schema migration is deployed |
| **Q-3** | `withdrawQuote` route in Phase 1C vs Phase 1D | **Defer to Phase 1D** — reduces Packet 13 scope; WITHDRAWN status enum value is still required in Phase 1C schema | Packet 13 | WITHDRAWN column + CHECK constraint added in Phase 1C even if route deferred |
| **Q-4** | Owner read-only quote list in Phase 1C vs Phase 1D | **Defer to Phase 1D** — Phase 1C is supplier-submit only; owner read adds owner route + DTO + service complexity | Packet 13 | FE-9 (owner quote review) cannot start until owner read route exists |
| **Q-5** | `UNIQUE(invite_id)` non-partial vs partial `WHERE status='SUBMITTED'` | **Non-partial Phase 1C** — simpler constraint; revision support (re-submit after WITHDRAW) is a Phase 1D capability | Packet 11 | Schema migration must be amended in Phase 1D if revisions are required |
| **Q-6** | `quote_amount` type: `DECIMAL(18,2)` vs `DECIMAL(18,6)` | **`DECIMAL(18,2)`** — money precision; 6 decimal places are not needed for currency amounts | Packet 11 | Locked once schema migration is deployed |
| **Q-7** | `currency`: free-form `VARCHAR(10)` vs FK to currencies table | **Free-form `VARCHAR(10)` Phase 1C** — no currencies table exists; ISO 4217 3-char codes fit; extend later | Packet 11 | Could require migration to normalize currency reference in future |
| **Q-8** | `GET /supplier-rfq-invites/:inviteId/quote` read route in Phase 1C vs Phase 1D | **Include in Phase 1C** — FE-8 quote form will need to check for existing quote on load; without it FE-8 is still blocked | Packet 13 | FE-8 UI cannot detect whether a quote was already submitted |

---

## §21 — Final Recommendation

**Proceed with Phase 1C packets 11–13 after Paresh authorization.**

All open decisions should be resolved before Packet 11 (schema) begins. The design in this
document is internally consistent with Phase 1B locked decisions (OD-1 through OD-7), the
existing NC schema naming conventions, and the Fastify plugin patterns in the live codebase.

The two most consequential open decisions are:
- **Q-1** (route path): Determines the entire route file structure and test suite path.
- **Q-2** (dedicated table): Determines the schema migration and RLS policy scope.

Both are recommended as stated above and should be explicitly authorized before schema work begins.

Phase 1C minimum viable scope for FE-8 unblock: Packets 11 + 12 + 13 complete, with the
`POST /supplier-rfq-invites/:inviteId/quote` route live, then Paresh authorization of FE-8.

---

*End of TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001*
