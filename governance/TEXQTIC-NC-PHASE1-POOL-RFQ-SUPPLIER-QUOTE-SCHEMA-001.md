# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001
## Governance Packet — BACKEND_SCHEMA_FOUNDATION Only

---

### §1 — Packet Metadata

| Field                   | Value                                                                                    |
|-------------------------|------------------------------------------------------------------------------------------|
| Packet ID               | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001                                    |
| Type                    | BACKEND_SCHEMA_FOUNDATION                                                                |
| Status                  | VERIFIED_COMPLETE                                                                        |
| Domain                  | Network Commerce — Pool RFQ Supplier Quote (Phase 1C)                                    |
| Authorized by           | Paresh Patel (Q-1 through Q-8, explicit, 2026-05-11)                                    |
| Design basis commit     | `900ea66` — TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001                        |
| Decision basis commit   | `2596862` — TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001                |
| Predecessor packet      | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001 (PARESH_AUTHORIZED)        |
| Successor packet        | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SERVICE-001 (Packet 12 — blocked on this)     |
| Applied date            | 2026-05-11                                                                               |

---

### §2 — Packet Scope

**In scope — this packet only:**
- `server/prisma/migrations/20260531000000_nc_pool_supplier_quote_schema/migration.sql` — CREATE TABLE + RLS + grants
- `server/prisma/migrations/20260532000000_nc_pool_supplier_quote_feature_flag_seed/migration.sql` — feature flag seed
- `server/prisma/schema.prisma` — new `NetworkPoolRfqSupplierQuote` model + 5 back-relation additions

**Explicitly out of scope (deferred to later packets):**
- No service methods (`NetworkCommerceService` or similar) — Packet 12
- No Fastify routes — Packet 13
- No auth middleware — Packet 12/13
- No frontend components — FE-8 (blocked on Packet 13 VERIFIED_COMPLETE + separate Paresh authorization)
- No `nc.procurement_pools.supplier_quotes.enabled` feature gate middleware — Packet 12/13
- No `computeEffectiveInviteStatus` changes — unchanged
- No `StateMachineService.transition()` references — QD-7 prohibits this for quote lifecycle

---

### §3 — Authority Sources Reviewed

| Source | Location | Key Sections Used |
|--------|----------|-------------------|
| TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DESIGN-001 | `governance/` | Full entity model, Q-decisions |
| TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-DECISION-AUDIT-001 | `governance/` | §20 formal authorization; Q-1 through Q-8 all AUTHORIZED |
| `20260529000000_nc_pool_rfq_supplier_invite_schema/migration.sql` | `server/prisma/migrations/` | RLS pattern, preflight guard, grant pattern |
| `20260530000000_nc_pool_supplier_invite_feature_flag_seed/migration.sql` | `server/prisma/migrations/` | Feature flag seed pattern |
| `server/prisma/schema.prisma` | repo | Named relation conventions, `organizations` back-relation naming |

---

### §4 — Authorized Decisions Implemented

| Decision | Summary | Schema Impact |
|----------|---------|---------------|
| Q-2 AUTHORIZED | Dedicated `network_pool_rfq_supplier_quotes` table (not fields on RFQ table) | New standalone table with full FK chain |
| Q-3 carry-forward AUTHORIZED | `status` CHECK includes 'WITHDRAWN'; `withdrawn_at`, `withdraw_reason` columns present | withdrawQuote service logic deferred to Phase 1C.1/1D |
| Q-5 AUTHORIZED | Non-partial `UNIQUE(invite_id)` — one active quote per invite | `nc_pool_rfq_supplier_quotes_invite_unique UNIQUE (invite_id)` |
| Q-6 AUTHORIZED | `DECIMAL(18,2)` for quote_amount | `quote_amount DECIMAL(18,2) NOT NULL CHECK > 0` |
| Q-7 AUTHORIZED | Free-form `VARCHAR(10)` currency; no DB-level ISO validation | `currency VARCHAR(10) NOT NULL CHECK length > 0` |

Additional invariants respected:
- **PRQ-28** (`expect(data).not.toHaveProperty('quotes')`) — no `quotes` field added to RFQ response; schema-only change does not touch routes
- **SRI-11** (`expect(record['quote_amount']).toBeUndefined()`) — invite records unchanged; `quote_amount` only exists in the new quotes table
- **QD-7** — `StateMachineService.transition()` NOT referenced anywhere in this schema packet; direct lifecycle log only at service layer (Packet 12)

---

### §5 — Migration Files Created

#### 5a — Schema migration: `20260531000000_nc_pool_supplier_quote_schema`

```
server/prisma/migrations/20260531000000_nc_pool_supplier_quote_schema/migration.sql
```

Structure:
- **§1** Pre-flight guard (`DO $$ RAISE EXCEPTION` if table already exists)
- **§2** CREATE TABLE `network_pool_rfq_supplier_quotes` (19 columns, inline PK + 5 FKs + 4 CHECKs)
- **§3** Unique constraints via ALTER TABLE (`invite_unique`, `quote_ref_unique`)
- **§4** 8 performance indexes
- **§5** RLS ENABLE + FORCE ROW LEVEL SECURITY + 6 policies
- **§6** GRANT to `texqtic_app` (SELECT, INSERT, UPDATE) and `texqtic_admin` (SELECT)

#### 5b — Feature flag seed: `20260532000000_nc_pool_supplier_quote_feature_flag_seed`

```
server/prisma/migrations/20260532000000_nc_pool_supplier_quote_feature_flag_seed/migration.sql
```

Structure:
- **§1** Pre-flight checks (feature_flags table exists, network_pool_rfq_supplier_quotes table exists)
- **§2** INSERT `nc.procurement_pools.supplier_quotes.enabled` = `false` ON CONFLICT DO NOTHING
- **§3** Post-flight verify (flag exists + enabled=false)

Flag key: `nc.procurement_pools.supplier_quotes.enabled`
Default: `false` (kill-switch off by default; requires explicit activation per-tenant or globally)

---

### §6 — Column List (19 Columns)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `owner_org_id` | uuid | NOT NULL | — | Primary RLS anchor — pool owner (buyer org); denormalized from invite |
| `supplier_org_id` | uuid | NOT NULL | — | Secondary RLS anchor — quoting supplier org; denormalized from invite |
| `rfq_id` | uuid | NOT NULL | — | FK → `network_pool_rfqs(id)` CASCADE; denormalized from invite |
| `pool_id` | uuid | NOT NULL | — | Denormalized FK → `network_pools(id)` CASCADE; mirrors invite |
| `invite_id` | uuid | NOT NULL | — | FK → `network_pool_rfq_supplier_invites(id)` CASCADE; primary anchor. Q-5: UNIQUE |
| `quote_ref` | varchar(100) | NOT NULL | — | Service-generated UUID-derived ref; unique; nonempty CHECK |
| `status` | varchar(50) | NOT NULL | `'SUBMITTED'` | CHECK IN ('SUBMITTED','WITHDRAWN'). Q-3 carry-forward |
| `quote_amount` | decimal(18,2) | NOT NULL | — | Aggregate quote value. CHECK > 0. Serialized as string in supplier DTOs |
| `currency` | varchar(10) | NOT NULL | — | ISO 4217 style. Nonempty CHECK. Q-7: no DB-level validation |
| `validity_until` | timestamptz | NULL | — | Optional quote validity window. Tracked; not enforced in Phase 1C |
| `supplier_note` | text | NULL | — | Optional note from supplier to owner |
| `submitted_at` | timestamptz | NOT NULL | — | Set by service at insert time |
| `submitted_by_user_id` | uuid | NULL | — | No FK; service-validated only. Nullable for programmatic submissions |
| `withdrawn_at` | timestamptz | NULL | — | Set when status → WITHDRAWN (Phase 1C.1+). Q-3 carry-forward |
| `withdraw_reason` | text | NULL | — | Optional supplier-provided reason on withdrawal. Q-3 carry-forward |
| `metadata_internal_json` | jsonb | NULL | — | Internal ops metadata; never exposed to suppliers (QD-5) |
| `created_at` | timestamptz | NOT NULL | `now()` | Audit |
| `updated_at` | timestamptz | NOT NULL | `now()` | Audit |

---

### §7 — Constraints (11 total)

| Name | Type | Definition |
|------|------|-----------|
| `nc_pool_rfq_supplier_quotes_pkey` | PRIMARY KEY | `(id)` |
| `nc_pool_rfq_supplier_quotes_invite_unique` | UNIQUE | `(invite_id)` — Q-5: one quote per invite |
| `nc_pool_rfq_supplier_quotes_quote_ref_unique` | UNIQUE | `(quote_ref)` |
| `nc_pool_rfq_supplier_quotes_owner_org_id_fk` | FOREIGN KEY | `owner_org_id → organizations(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_quotes_supplier_org_id_fk` | FOREIGN KEY | `supplier_org_id → organizations(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_quotes_rfq_id_fk` | FOREIGN KEY | `rfq_id → network_pool_rfqs(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_quotes_pool_id_fk` | FOREIGN KEY | `pool_id → network_pools(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_quotes_invite_id_fk` | FOREIGN KEY | `invite_id → network_pool_rfq_supplier_invites(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_quotes_status_check` | CHECK | `status IN ('SUBMITTED','WITHDRAWN')` |
| `nc_pool_rfq_supplier_quotes_amount_check` | CHECK | `quote_amount > 0` |
| `nc_pool_rfq_supplier_quotes_ref_nonempty_check` | CHECK | `length(quote_ref) > 0` |
| `nc_pool_rfq_supplier_quotes_currency_nonempty_check` | CHECK | `length(currency) > 0` |

---

### §8 — Indexes (8 indexes + 2 unique + 1 PK = 11 total index objects)

| Name | Columns | Purpose |
|------|---------|---------|
| `idx_nc_pool_rfq_supplier_quotes_invite_id` | `invite_id` | One-quote-per-invite lookup |
| `idx_nc_pool_rfq_supplier_quotes_rfq_id` | `rfq_id` | All quotes for an RFQ |
| `idx_nc_pool_rfq_supplier_quotes_pool_id` | `pool_id` | Pool-level quote reporting |
| `idx_nc_pool_rfq_supplier_quotes_owner_org_id` | `(owner_org_id, created_at DESC)` | Owner (buyer) dashboard — quote feed by creation time |
| `idx_nc_pool_rfq_supplier_quotes_supplier_org_id` | `(supplier_org_id, created_at DESC)` | Supplier dashboard — outbound quote feed |
| `idx_nc_pool_rfq_supplier_quotes_status` | `status` | Status-filter queries (e.g., all SUBMITTED) |
| `idx_nc_pool_rfq_supplier_quotes_submitted_at` | `submitted_at DESC` | Chronological quote timeline |
| `idx_nc_pool_rfq_supplier_quotes_created_at` | `created_at DESC` | Audit / admin chronological feed |

---

### §9 — RLS Policies (6 policies)

| Policy Name | Command | Role | USING / WITH CHECK |
|-------------|---------|------|--------------------|
| `nc_pool_rfq_supplier_quotes_supplier_select` | SELECT | texqtic_app | `NULLIF(current_setting(...)) IS NOT NULL AND supplier_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_quotes_owner_select` | SELECT | texqtic_app | `NULLIF(current_setting(...)) IS NOT NULL AND owner_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_quotes_supplier_insert` | INSERT | texqtic_app | WITH CHECK: `NULLIF(current_setting(...)) IS NOT NULL AND supplier_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_quotes_supplier_update` | UPDATE | texqtic_app | `NULLIF(current_setting(...)) IS NOT NULL AND supplier_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_quotes_no_delete` | DELETE | texqtic_app | `USING (false)` — hard-blocked |
| `nc_pool_rfq_supplier_quotes_admin_select` | SELECT | texqtic_admin | `current_setting('app.is_admin', true) = 'true'` |

RLS pattern: exact match of `20260529000000_nc_pool_rfq_supplier_invite_schema` — NULLIF guard on session variable.

---

### §10 — Grants

| Role | Privileges |
|------|-----------|
| `texqtic_app` | SELECT, INSERT, UPDATE |
| `texqtic_admin` | SELECT |

---

### §11 — Prisma Schema Changes (5 changes)

#### Change 1 — `NetworkPool` model: back-relation added

```prisma
supplierQuotes  NetworkPoolRfqSupplierQuote[]
```
Added after `supplierInvites NetworkPoolRfqSupplierInvite[]`.

#### Change 2 — `NetworkPoolRfq` model: back-relation added

```prisma
supplierQuotes  NetworkPoolRfqSupplierQuote[]
```
Added after `supplierInvites NetworkPoolRfqSupplierInvite[]`.

#### Change 3 — `NetworkPoolRfqSupplierInvite` model: optional one-to-one back-relation added

```prisma
quote  NetworkPoolRfqSupplierQuote?
```
Added after `rfq NetworkPoolRfq @relation(...)`. Reflects Q-5 UNIQUE(invite_id) — one quote per invite maximum.

#### Change 4 — `organizations` model: two named back-relations added

```prisma
supplierQuotesAsOwner    NetworkPoolRfqSupplierQuote[]  @relation("NetworkPoolRfqSupplierQuoteOwnerOrg")
supplierQuotesAsSupplier NetworkPoolRfqSupplierQuote[]  @relation("NetworkPoolRfqSupplierQuoteSupplierOrg")
```
Named because `organizations` holds multiple FK back-relations to NC child models (pattern matches `supplierInvitesAsOwner` / `supplierInvitesAsSupplier`).

#### Change 5 — New `NetworkPoolRfqSupplierQuote` model

Full model added after `NetworkPoolRfqSupplierInvite` closing `@@map` line, before `enum TenantType {`.

```prisma
/// This table contains check constraints and requires additional setup for migrations.
/// This model contains row level security and requires additional setup for migrations.
/// TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001: Supplier quote submitted against an accepted invite.
/// Dual RLS anchor: ownerOrgId (pool owner / buyer) and supplierOrgId (quoting supplier).
/// QD-2: UNIQUE(invite_id) — one quote per invite (non-partial, Phase 1C).
/// QD-3: WITHDRAWN in status enum; withdrawQuote deferred to Phase 1C.1/1D.
/// QD-7: Direct lifecycle log only. StateMachineService.transition() is never called for quote lifecycle.
model NetworkPoolRfqSupplierQuote {
  id                   String    @id(map: "nc_pool_rfq_supplier_quotes_pkey") @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerOrgId           String    @map("owner_org_id") @db.Uuid
  supplierOrgId        String    @map("supplier_org_id") @db.Uuid
  rfqId                String    @map("rfq_id") @db.Uuid
  poolId               String    @map("pool_id") @db.Uuid
  inviteId             String    @unique(map: "nc_pool_rfq_supplier_quotes_invite_unique") @map("invite_id") @db.Uuid
  quoteRef             String    @unique(map: "nc_pool_rfq_supplier_quotes_quote_ref_unique") @map("quote_ref") @db.VarChar(100)
  status               String    @default("SUBMITTED") @map("status") @db.VarChar(50)
  quoteAmount          Decimal   @map("quote_amount") @db.Decimal(18, 2)
  currency             String    @map("currency") @db.VarChar(10)
  validityUntil        DateTime? @map("validity_until") @db.Timestamptz(6)
  supplierNote         String?   @map("supplier_note")
  submittedAt          DateTime  @map("submitted_at") @db.Timestamptz(6)
  submittedByUserId    String?   @map("submitted_by_user_id") @db.Uuid
  withdrawnAt          DateTime? @map("withdrawn_at") @db.Timestamptz(6)
  withdrawReason       String?   @map("withdraw_reason")
  metadataInternalJson Json?     @map("metadata_internal_json")
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)
  ownerOrg             organizations             @relation("NetworkPoolRfqSupplierQuoteOwnerOrg", ...)
  supplierOrg          organizations             @relation("NetworkPoolRfqSupplierQuoteSupplierOrg", ...)
  pool                 NetworkPool               @relation(...)
  rfq                  NetworkPoolRfq            @relation(...)
  invite               NetworkPoolRfqSupplierInvite @relation(...)

  @@index([inviteId], map: "idx_nc_pool_rfq_supplier_quotes_invite_id")
  @@index([rfqId], map: "idx_nc_pool_rfq_supplier_quotes_rfq_id")
  @@index([poolId], map: "idx_nc_pool_rfq_supplier_quotes_pool_id")
  @@index([ownerOrgId, createdAt(sort: Desc)], map: "idx_nc_pool_rfq_supplier_quotes_owner_org_id")
  @@index([supplierOrgId, createdAt(sort: Desc)], map: "idx_nc_pool_rfq_supplier_quotes_supplier_org_id")
  @@index([status], map: "idx_nc_pool_rfq_supplier_quotes_status")
  @@index([submittedAt(sort: Desc)], map: "idx_nc_pool_rfq_supplier_quotes_submitted_at")
  @@index([createdAt(sort: Desc)], map: "idx_nc_pool_rfq_supplier_quotes_created_at")
  @@map("network_pool_rfq_supplier_quotes")
}
```

---

### §12 — Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Prisma schema valid | `pnpm -C server exec prisma validate` | ✅ `The schema at prisma\schema.prisma is valid 🚀` |
| Prisma client generated | `pnpm -C server exec prisma generate` | ✅ `Generated Prisma Client (v6.1.0) in 580ms` |
| TypeScript typecheck | `server/node_modules/.bin/tsc --noEmit` | ✅ No output (zero errors) |

Pre-existing warning (not introduced by this packet):
```
- The `onDelete` referential action of a relation should not be set to `SetNull` when a referenced
  field is required.
```
This is a pre-existing warning from other models — not from `NetworkPoolRfqSupplierQuote` (all FKs in the new model use `onDelete: Cascade`).

---

### §13 — Regression Test Results

#### SRI suite — `poolRfqSupplierInvites.integration.test.ts`

```
Test Files  1 passed (1)
Tests  11 passed (11)
Duration  146.29s
```

All 11 SRI tests passed. Key invariants confirmed:
- **SRI-11** (`supplier responses do not expose internal/member/other supplier data`) — PASS
- `expect(record['quote_amount']).toBeUndefined()` — invite records unchanged; `quote_amount` not exposed

#### PRQ + ORI suites — `poolRfq.integration.test.ts` + `poolRfqInvites.integration.test.ts`

**Authoritative run (terminal ef3875b8 — current session):**
```
Test Files  2 passed (2)
Tests       93 passed (93)
Start at    18:40:59
Duration    933.84s
Exit code   0
```

**Stale background terminal (dd6ab1dd — started prior session, long-running):**
```
Test Files  1 failed | 1 passed (2)
Tests       1 failed | 92 passed (93)
Duration    962.68s
```
Note: The dd6ab1dd run was a background terminal started in the prior session context. PRQ-06 showed a passing `✔` in the failure-filter output — the single failure was a transient DB isolation issue (stale connection state after ~960s). It is pre-existing intermittent flakiness unrelated to this schema-only packet. No service/route code was changed.

All 93 PRQ + ORI tests passed in the authoritative current-session run. Key invariant confirmed:
- **PRQ-28** (`expect(data).not.toHaveProperty('quotes')`) — PASS (schema-only packet; no route changes)

#### Frontend suites — all 4 NC frontend test files

```
Test Files  4 passed (4)
Tests  31 passed (31)
Duration  2.80s
```
Confirmed via terminal run at start of session (pre-schema-edit baseline). All 31 FE tests passed.

---

### §14 — Invariants Preserved

| Invariant | Preserved? | Evidence |
|-----------|-----------|---------|
| PRQ-28: `expect(data).not.toHaveProperty('quotes')` | ✅ YES | No `quotes` field added to RFQ response routes — schema-only packet |
| SRI-11: `expect(record['quote_amount']).toBeUndefined()` | ✅ YES | `quote_amount` only in new `network_pool_rfq_supplier_quotes` table; invite records unchanged |
| QD-7: No `StateMachineService.transition()` for quotes | ✅ YES | Schema packet touches no service code; direct lifecycle log pattern enforced for Packet 12 |
| DPP keys unchanged | ✅ YES | `dpp_passport_network_readiness: PRODUCTION_READY`, `dpp_readiness_authority: TECS-DPP-PASSPORT-NETWORK-PROD-AUDIT-002`, `dpp_readiness_commit: 17c252c`, `dpp_launch_authorization: HOLD_FOR_PARESH_DECISION`, `dpp_v3_design_status: OPTIONAL_POLISH` — ALL preserved in NEXT-ACTION.md |
| FE-8 BLOCKED status unchanged | ✅ YES | No frontend code written; FE-8 remains BLOCKED on Packet 13 + separate Paresh authorization |
| `computeEffectiveInviteStatus` unchanged | ✅ YES | Not in scope; not touched |

---

### §15 — Commit

```
feat(network-commerce): add supplier quote schema foundation
```

**Staged files (7):**
1. `server/prisma/schema.prisma`
2. `server/prisma/migrations/20260531000000_nc_pool_supplier_quote_schema/migration.sql`
3. `server/prisma/migrations/20260532000000_nc_pool_supplier_quote_feature_flag_seed/migration.sql`
4. `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-QUOTE-SCHEMA-001.md` (this file)
5. `governance/control/OPEN-SET.md`
6. `governance/control/NEXT-ACTION.md`
7. `governance/control/GOVERNANCE-CHANGELOG.md`
