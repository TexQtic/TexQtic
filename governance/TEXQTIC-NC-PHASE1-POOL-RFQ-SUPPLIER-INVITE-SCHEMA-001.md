# TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001
## Governance Packet — Schema + Prisma Only

---

### §1 — Packet Metadata

| Field               | Value                                                                         |
|---------------------|-------------------------------------------------------------------------------|
| Packet ID           | TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001                        |
| Type                | SCHEMA                                                                        |
| Status              | SCHEMA_APPLIED                                                                |
| Domain              | Network Commerce — Pool RFQ Supplier Invite                                   |
| Authorized by       | Paresh Patel (explicit, same session)                                         |
| Design basis commit | `8a36a2f` — TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001            |
| Decision basis commit | `f8152aa` — TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001  |
| Applied date        | 2026-05-30                                                                    |

---

### §2 — Pre-Work Verification

- HEAD at packet start: `f8152aa` ("lock pool RFQ supplier invite decisions")
- Working tree: clean (zero unstaged changes)
- Preflight command: `git diff --name-only ; git status --short`
- Result: no unexpected modified files

---

### §3 — Authority Sources Reviewed

| Source | Location | Key Sections Used |
|--------|----------|-------------------|
| TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DESIGN-001 | `docs/` | §7 — Full entity model (19 columns) |
| TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-DECISION-AUDIT-001 | `docs/` | §4–§8 — OD-1 through OD-7 |
| `20260501000000_nc_pool_rfq_schema/migration.sql` | `server/prisma/migrations/` | RLS + grant patterns |
| `20260420000000_nc_pool_demand_snapshot_schema/migration.sql` | `server/prisma/migrations/` | Preflight guard pattern |

---

### §4 — Locked Decisions Implemented

| Decision | Summary | Schema Impact | Status |
|----------|---------|---------------|--------|
| OD-1 | Option A — No re-invite | `UNIQUE (rfq_id, supplier_org_id)` standard (non-partial) | ✅ |
| OD-2 | Lazy EXPIRED | `CHECK status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED')` — EXPIRED excluded | ✅ |
| OD-3 | Inherit responseDeadlineAt at service layer | `expires_at TIMESTAMPTZ NULL` — no DB default | ✅ |
| OD-4 | Validate org exists + ACTIVE at service layer only | FK `supplier_org_id → organizations.id` retained; no status FK | ✅ |
| OD-5 | Aggregate header only (no per-line FK) | No `NetworkPoolRfqLine` FK in this table | ✅ |
| OD-6 | Feature gate NOT in this packet | No schema impact | ✅ |
| OD-7 | Direct `networkLifecycleLog.create()` at service layer | No new state machine path in DB | ✅ |

---

### §5 — Table Created

| Item | Value |
|------|-------|
| Table name | `public.network_pool_rfq_supplier_invites` |
| Prisma model | `NetworkPoolRfqSupplierInvite` |
| Prisma `@@map` | `"network_pool_rfq_supplier_invites"` |
| RLS | ENABLED + FORCE |
| Policies | 7 |
| Roles | `texqtic_app`, `texqtic_admin` |

---

### §6 — Column List (19 Columns)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `owner_org_id` | uuid | NOT NULL | — | Primary RLS anchor — pool owner (buyer org) |
| `supplier_org_id` | uuid | NOT NULL | — | Secondary RLS anchor — invited supplier org |
| `rfq_id` | uuid | NOT NULL | — | FK → `network_pool_rfqs(id)` CASCADE |
| `pool_id` | uuid | NOT NULL | — | Denormalized FK → `network_pools(id)` CASCADE |
| `invite_ref` | varchar(100) | NOT NULL | — | Service-generated UUID-derived ref; unique |
| `status` | varchar(50) | NOT NULL | `'PENDING'` | CHECK IN ('PENDING','ACCEPTED','DECLINED','CANCELLED') |
| `invited_at` | timestamptz | NOT NULL | `now()` | Timestamp when invite was issued |
| `invited_by_user_id` | uuid | NULL | — | No FK; service-validated. Nullable for system invites |
| `accepted_at` | timestamptz | NULL | — | Set on acceptance |
| `declined_at` | timestamptz | NULL | — | Set on decline |
| `cancelled_at` | timestamptz | NULL | — | Set on cancel |
| `expires_at` | timestamptz | NULL | — | OD-3: no DB default; inherited from rfq.responseDeadlineAt |
| `message_to_supplier` | text | NULL | — | Optional invite message from owner |
| `decline_reason` | text | NULL | — | Optional decline reason from supplier |
| `cancel_reason` | text | NULL | — | Optional cancel reason from owner |
| `metadata_internal_json` | jsonb | NULL | — | Internal ops metadata; never exposed to suppliers |
| `created_at` | timestamptz | NOT NULL | `now()` | Audit |
| `updated_at` | timestamptz | NOT NULL | `now()` | Audit |

---

### §7 — Constraints (9 total)

| Name | Type | Definition |
|------|------|-----------|
| `nc_pool_rfq_supplier_invites_pkey` | PRIMARY KEY | `(id)` |
| `nc_pool_rfq_supplier_invites_rfq_supplier_unique` | UNIQUE | `(rfq_id, supplier_org_id)` — OD-1: no re-invite |
| `nc_pool_rfq_supplier_invites_invite_ref_unique` | UNIQUE | `(invite_ref)` |
| `nc_pool_rfq_supplier_invites_owner_org_id_fk` | FOREIGN KEY | `owner_org_id → organizations(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_invites_supplier_org_id_fk` | FOREIGN KEY | `supplier_org_id → organizations(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_invites_rfq_id_fk` | FOREIGN KEY | `rfq_id → network_pool_rfqs(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_invites_pool_id_fk` | FOREIGN KEY | `pool_id → network_pools(id) ON DELETE CASCADE` |
| `nc_pool_rfq_supplier_invites_status_check` | CHECK | `status IN ('PENDING','ACCEPTED','DECLINED','CANCELLED')` |
| `nc_pool_rfq_supplier_invites_invite_ref_nonempty_check` | CHECK | `length(invite_ref) > 0` |

---

### §8 — Indexes (6 + 2 unique + 1 PK = 9 total index objects)

| Name | Columns | Purpose |
|------|---------|---------|
| `idx_nc_pool_rfq_supplier_invites_rfq_id` | `rfq_id` | List all invites for an RFQ |
| `idx_nc_pool_rfq_supplier_invites_owner_org_id_created_at` | `(owner_org_id, created_at DESC)` | Owner dashboard — feed by creation time |
| `idx_nc_pool_rfq_supplier_invites_supplier_org_id_created_at` | `(supplier_org_id, created_at DESC)` | Supplier dashboard — inbound invite feed |
| `idx_nc_pool_rfq_supplier_invites_pool_id` | `pool_id` | Pool-level invite reporting |
| `idx_nc_pool_rfq_supplier_invites_status` | `status` | Status-filter queries (e.g., all PENDING) |
| `idx_nc_pool_rfq_supplier_invites_invited_at` | `invited_at DESC` | Chronological invite timeline |

---

### §9 — RLS Policies (7 policies)

| Policy Name | Command | Role | USING / WITH CHECK |
|-------------|---------|------|--------------------|
| `nc_pool_rfq_supplier_invites_owner_select` | SELECT | texqtic_app | `owner_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_invites_supplier_select` | SELECT | texqtic_app | `supplier_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_invites_owner_insert` | INSERT | texqtic_app | WITH CHECK: `owner_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_invites_owner_update` | UPDATE | texqtic_app | `owner_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_invites_supplier_update` | UPDATE | texqtic_app | `supplier_org_id::text = current_setting('app.org_id', true)` |
| `nc_pool_rfq_supplier_invites_no_delete` | DELETE | texqtic_app | `USING (false)` — hard-blocked |
| `nc_pool_rfq_supplier_invites_admin_select` | SELECT | texqtic_admin | `current_setting('app.is_admin', true) = 'true'` |

All policies additionally guard against null session variable via `NULLIF(current_setting('app.org_id', true), '') IS NOT NULL`.

---

### §10 — Grants

| Role | Privileges |
|------|-----------|
| `texqtic_app` | SELECT, INSERT, UPDATE |
| `texqtic_admin` | SELECT |

---

### §11 — Migration File

```
server/prisma/migrations/20260529000000_nc_pool_rfq_supplier_invite_schema/migration.sql
```

Structure:
- **§1** Pre-flight guard (DO $$ RAISE EXCEPTION if table already exists)
- **§2** CREATE TABLE with 19 columns, inline PK + 4 FKs + 2 CHECKs
- **§3** Unique constraints (`rfq_supplier_unique`, `invite_ref_unique`)
- **§4** 6 performance indexes
- **§5** RLS ENABLE + FORCE + 7 policies
- **§6** Grants

---

### §12 — Prisma Schema Changes

Model added to `server/prisma/schema.prisma` via `prisma db pull` then normalized to PascalCase consistent with all other NC models:

```prisma
/// TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-SCHEMA-001: Invite from pool owner (buyer) to a supplier to respond to a network pool RFQ.
/// Dual RLS anchor: ownerOrgId (pool owner) and supplierOrgId (invited supplier).
/// Status transitions: PENDING → ACCEPTED | DECLINED | CANCELLED.
/// OD-2: EXPIRED is NOT stored in DB — lazy-computed at service layer from expiresAt.
model NetworkPoolRfqSupplierInvite {
  id                   String    @id(map: "nc_pool_rfq_supplier_invites_pkey") @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ownerOrgId           String    @map("owner_org_id") @db.Uuid
  supplierOrgId        String    @map("supplier_org_id") @db.Uuid
  rfqId                String    @map("rfq_id") @db.Uuid
  poolId               String    @map("pool_id") @db.Uuid
  inviteRef            String    @unique(map: "nc_pool_rfq_supplier_invites_invite_ref_unique") @map("invite_ref") @db.VarChar(100)
  status               String    @default("PENDING") @map("status") @db.VarChar(50)
  invitedAt            DateTime  @default(now()) @map("invited_at") @db.Timestamptz(6)
  invitedByUserId      String?   @map("invited_by_user_id") @db.Uuid
  acceptedAt           DateTime? @map("accepted_at") @db.Timestamptz(6)
  declinedAt           DateTime? @map("declined_at") @db.Timestamptz(6)
  cancelledAt          DateTime? @map("cancelled_at") @db.Timestamptz(6)
  expiresAt            DateTime? @map("expires_at") @db.Timestamptz(6)
  messageToSupplier    String?   @map("message_to_supplier")
  declineReason        String?   @map("decline_reason")
  cancelReason         String?   @map("cancel_reason")
  metadataInternalJson Json?     @map("metadata_internal_json")
  createdAt            DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)
  ownerOrg             organizations  @relation("NetworkPoolRfqSupplierInviteOwnerOrg", fields: [ownerOrgId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "nc_pool_rfq_supplier_invites_owner_org_id_fk")
  supplierOrg          organizations  @relation("NetworkPoolRfqSupplierInviteSupplierOrg", fields: [supplierOrgId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "nc_pool_rfq_supplier_invites_supplier_org_id_fk")
  pool                 NetworkPool    @relation(fields: [poolId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "nc_pool_rfq_supplier_invites_pool_id_fk")
  rfq                  NetworkPoolRfq @relation(fields: [rfqId], references: [id], onDelete: Cascade, onUpdate: NoAction, map: "nc_pool_rfq_supplier_invites_rfq_id_fk")

  @@unique([rfqId, supplierOrgId], map: "nc_pool_rfq_supplier_invites_rfq_supplier_unique")
  @@index([invitedAt(sort: Desc)], map: "idx_nc_pool_rfq_supplier_invites_invited_at")
  @@index([ownerOrgId, createdAt(sort: Desc)], map: "idx_nc_pool_rfq_supplier_invites_owner_org_id_created_at")
  @@index([poolId], map: "idx_nc_pool_rfq_supplier_invites_pool_id")
  @@index([rfqId], map: "idx_nc_pool_rfq_supplier_invites_rfq_id")
  @@index([status], map: "idx_nc_pool_rfq_supplier_invites_status")
  @@index([supplierOrgId, createdAt(sort: Desc)], map: "idx_nc_pool_rfq_supplier_invites_supplier_org_id_created_at")
  @@map("network_pool_rfq_supplier_invites")
}
```

Back-references added/updated:
- `organizations` model: added `supplierInvitesAsOwner` + `supplierInvitesAsSupplier` (replaced verbose `prisma db pull` auto-names)
- `NetworkPool` model: added `supplierInvites NetworkPoolRfqSupplierInvite[]`
- `NetworkPoolRfq` model: added `supplierInvites NetworkPoolRfqSupplierInvite[]`

---

### §13 — DB Verification Evidence

All verified via interactive psql session against Supabase remote (DATABASE_URL loaded from server/.env; value redacted).

**Columns (19) — verified:**
```
id           | uuid    | NOT NULL | gen_random_uuid()
owner_org_id | uuid    | NOT NULL |
supplier_org_id | uuid | NOT NULL |
rfq_id       | uuid    | NOT NULL |
pool_id      | uuid    | NOT NULL |
invite_ref   | varchar | NOT NULL |
status       | varchar | NOT NULL | PENDING
invited_at   | timestamptz | NOT NULL | now()
invited_by_user_id | uuid | NULL |
accepted_at  | timestamptz | NULL |
declined_at  | timestamptz | NULL |
cancelled_at | timestamptz | NULL |
expires_at   | timestamptz | NULL |
message_to_supplier | text | NULL |
decline_reason | text | NULL |
cancel_reason  | text | NULL |
metadata_internal_json | jsonb | NULL |
created_at   | timestamptz | NOT NULL | now()
updated_at   | timestamptz | NOT NULL | now()
```

**Constraints (9) — verified:**
```
nc_pool_rfq_supplier_invites_invite_ref_nonempty_check (c)
nc_pool_rfq_supplier_invites_status_check (c)
nc_pool_rfq_supplier_invites_owner_org_id_fk (f)
nc_pool_rfq_supplier_invites_pool_id_fk (f)
nc_pool_rfq_supplier_invites_rfq_id_fk (f)
nc_pool_rfq_supplier_invites_supplier_org_id_fk (f)
nc_pool_rfq_supplier_invites_pkey (p)
nc_pool_rfq_supplier_invites_invite_ref_unique (u)
nc_pool_rfq_supplier_invites_rfq_supplier_unique (u)
```

**Indexes (9 total including PK + 2 unique) — verified:**
```
idx_nc_pool_rfq_supplier_invites_invited_at
idx_nc_pool_rfq_supplier_invites_owner_org_id_created_at
idx_nc_pool_rfq_supplier_invites_pool_id
idx_nc_pool_rfq_supplier_invites_rfq_id
idx_nc_pool_rfq_supplier_invites_status
idx_nc_pool_rfq_supplier_invites_supplier_org_id_created_at
nc_pool_rfq_supplier_invites_invite_ref_unique
nc_pool_rfq_supplier_invites_pkey
nc_pool_rfq_supplier_invites_rfq_supplier_unique
```

**RLS:** `relrowsecurity=t`, `relforcerowsecurity=t` ✅

**Policies (7) — verified:**
```
nc_pool_rfq_supplier_invites_admin_select    (SELECT, {texqtic_admin})
nc_pool_rfq_supplier_invites_no_delete       (DELETE, {texqtic_app})
nc_pool_rfq_supplier_invites_owner_insert    (INSERT, {texqtic_app})
nc_pool_rfq_supplier_invites_owner_select    (SELECT, {texqtic_app})
nc_pool_rfq_supplier_invites_owner_update    (UPDATE, {texqtic_app})
nc_pool_rfq_supplier_invites_supplier_select (SELECT, {texqtic_app})
nc_pool_rfq_supplier_invites_supplier_update (UPDATE, {texqtic_app})
```

**Grants — verified:**
```
texqtic_admin: SELECT
texqtic_app:   INSERT, SELECT, UPDATE
```

---

### §14 — Validation Command Results

| Command | Result |
|---------|--------|
| `prisma db pull` | ✅ 75 models introspected (was 74) |
| `prisma validate` | ✅ `The schema at prisma\schema.prisma is valid 🚀` |
| `prisma generate` | ✅ `Generated Prisma Client (v6.1.0)` |
| `tsc --noEmit` | ✅ Zero errors |
| `prisma migrate resolve --applied 20260529000000_nc_pool_rfq_supplier_invite_schema` | ✅ `Migration ... marked as applied.` |

---

### §15 — Deviations from Design

| Item | Design | Actual | Reason |
|------|--------|--------|--------|
| Prisma model name | `NetworkSupplierInvite` (proposed) | `NetworkPoolRfqSupplierInvite` | Consistent with NC model naming pattern: `network_pool_rfq_supplier_invites` → `NetworkPoolRfqSupplierInvite`. Same convention as `network_pool_rfqs` → `NetworkPoolRfq`. |
| db pull raw model name | — | `network_pool_rfq_supplier_invites` (auto-generated) | `prisma db pull` generates snake_case for new tables with no prior @@map. Manually normalized to PascalCase + @@map to match all other NC models. |

No other deviations.

---

### §16 — Stop Conditions

No stop conditions triggered. All 7 stop gates passed:
- [ ] DB conflict — Not triggered (preflight guard fired correctly on second attempt; first DB apply in prior session was successful)
- [ ] Schema validation failure — Not triggered
- [ ] tsc error — Not triggered
- [ ] EPERM during generate — Not triggered (server was not running)
- [ ] Secrets leak risk — Not triggered
- [ ] Out-of-allowlist file — Not triggered
- [ ] Spec ambiguity — Not triggered

---

### §17 — Scope Boundary (What Is NOT In This Packet)

This packet contains **schema and Prisma only**. The following are explicitly excluded and require separate Paresh authorization:

- No server/src/** files modified
- No service layer (`inviteService.ts` or equivalent)
- No Fastify routes (no `server/src/routes/nc/**` changes)
- No auth/middleware changes
- No feature gate (OD-6 deferred to FEATURE-GATE-001 packet)
- No lifecycle log integration (OD-7 deferred to service packet)
- No test files created or modified
- No existing migrations touched

---

### §18 — Next Packet

**TEXQTIC-NC-PHASE1-POOL-RFQ-SUPPLIER-INVITE-FEATURE-GATE-001**

Requires separate explicit Paresh authorization before work begins.

Scope (not yet authorized):
- Feature gate middleware entry for `NC_POOL_RFQ_SUPPLIER_INVITE`
- Route stubs (list, create, update-status)
- Integration with `networkLifecycleLog.create()` (OD-7)
