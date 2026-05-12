# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SCHEMA-001

**Network Commerce Phase 1D — Quote Award Schema Foundation**

| Field | Value |
|---|---|
| Packet ID | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SCHEMA-001 |
| Phase | NC Phase 1D |
| Type | IMPLEMENTATION — Schema / Migration only |
| Status | VERIFIED_COMPLETE |
| Author | TexQtic Platform Engineering (Safe-Write Mode) |
| Date | 2026-05-12 |
| Doctrine | TexQtic Doctrine v1.4 + AGENTS.md |
| Commit | feat(network-commerce): add pool rfq award schema foundation |
| Authority design doc | TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001 |
| Repo HEAD before start | `e8728d5` |

> **SCOPE: Schema / migration only.**
> No service methods, no route implementations, no frontend changes, no feature flag activation.
> FE-9 remains unopened. DPP remains HOLD_FOR_PARESH_DECISION.

---

## 1. Packet Metadata

| Property | Value |
|---|---|
| Allowed files (modified) | `server/prisma/schema.prisma` |
| Allowed files (created) | `server/prisma/migrations/20260533000000_nc_pool_rfq_supplier_quote_award_schema/migration.sql` |
| | `server/prisma/migrations/20260534000000_nc_pool_rfq_award_feature_flag_seed/migration.sql` |
| | `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SCHEMA-001.md` (this file) |
| Allowed files (control sync) | `governance/control/OPEN-SET.md` |
| | `governance/control/NEXT-ACTION.md` |
| | `governance/control/GOVERNANCE-CHANGELOG.md` |
| Forbidden | Service files, route files, frontend, tests, env files, production data |

---

## 2. Authority Sources Read

| File | Purpose |
|---|---|
| `governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001.md` | Primary design authority. §6.1 (DDL), §6.2 (flag seed), §6.3 (Prisma), §6.4 (naming). |
| `server/prisma/migrations/20260531000000_nc_pool_supplier_quote_schema/migration.sql` | Confirmed existing CHECK constraint name: `nc_pool_rfq_supplier_quotes_status_check`. |
| `server/prisma/migrations/20260532000000_nc_pool_supplier_quote_feature_flag_seed/migration.sql` | Feature flag seed migration pattern (pre-flight / INSERT / post-flight structure). |
| `server/prisma/schema.prisma` | Confirmed `NetworkPoolRfqSupplierQuote` model baseline (lines 2276–2335). |
| `governance/control/OPEN-SET.md` | Control file — updated. |
| `governance/control/NEXT-ACTION.md` | Control file — updated. |
| `governance/control/GOVERNANCE-CHANGELOG.md` | Control file — updated. |

---

## 3. Repo-Truth Baseline (Phase 1C state before this packet)

**HEAD before packet start:** `e8728d5`

**Schema state confirmed:**
- Table `network_pool_rfq_supplier_quotes` exists (deployed to Supabase).
- Status CHECK constraint: `nc_pool_rfq_supplier_quotes_status_check CHECK (status IN ('SUBMITTED', 'WITHDRAWN'))`.
- No `accepted_at`, `rejected_at`, or `reject_reason` columns.
- `UNIQUE(invite_id)` constraint: `nc_pool_rfq_supplier_quotes_invite_unique` — intact, not touched.
- Feature flag `nc.procurement_pools.rfq.award.enabled` — did not exist.
- Feature flag `nc.procurement_pools.supplier_quotes.enabled = false` — QD-6 hold.

**Prisma model baseline:** `NetworkPoolRfqSupplierQuote` in `schema.prisma` had 17 fields; no `acceptedAt`, `rejectedAt`, `rejectReason`.

---

## 4. Migration Sequence Selected

**Last existing migration at packet start:** `20260532000000_nc_pool_supplier_quote_feature_flag_seed`

**Next available sequences:**
- `20260533000000` — available ✅ (preferred name from design doc §6.4)
- `20260534000000` — available ✅ (preferred name from design doc §6.4)

**Sequences used (match preferred names exactly):**
- `20260533000000_nc_pool_rfq_supplier_quote_award_schema`
- `20260534000000_nc_pool_rfq_award_feature_flag_seed`

---

## 5. Exact Schema Changes

### 5.1 `server/prisma/schema.prisma` — `NetworkPoolRfqSupplierQuote` model

Three fields added after `withdrawReason`:

```prisma
/// Set when owner accepts this quote (Phase 1D). Nullable.
acceptedAt           DateTime? @map("accepted_at") @db.Timestamptz(6)
/// Set when owner rejects this quote or quote is mass-rejected on award (Phase 1D). Nullable.
rejectedAt           DateTime? @map("rejected_at") @db.Timestamptz(6)
/// Owner-provided reason for rejection (Phase 1D). Nullable.
rejectReason         String?   @map("reject_reason") @db.Text
```

All three fields are nullable — no existing rows are affected. No other model changes.

---

## 6. Exact Migration Files Created

### 6.1 `20260533000000_nc_pool_rfq_supplier_quote_award_schema/migration.sql`

**Purpose:** Extends `network_pool_rfq_supplier_quotes` DDL for Phase 1D award path.

**Operations (in order):**

**§1 Pre-flight guard**
- Aborts if `network_pool_rfq_supplier_quotes` does not exist.

**§2 Extend status CHECK constraint**
- `DROP CONSTRAINT IF EXISTS nc_pool_rfq_supplier_quotes_status_check` — drops Phase 1C CHECK.
- Adds new CHECK via idempotent `DO $$ ... IF NOT EXISTS` block:
  ```sql
  CHECK (status IN ('SUBMITTED', 'WITHDRAWN', 'ACCEPTED', 'REJECTED'))
  ```
- Uses actual constraint name from migration `20260531000000` (not the design doc's incorrect `network_pool_rfq_supplier_quotes_status_check`).

> **Constraint name correction vs. design doc:** The design doc §6.1 referenced name `network_pool_rfq_supplier_quotes_status_check` (without `nc_` prefix). The actual constraint name from the creating migration (`20260531000000`) is `nc_pool_rfq_supplier_quotes_status_check` (with `nc_` prefix). This migration uses the correct actual name. The DROP uses `IF EXISTS` for idempotency regardless.

**§3 Add nullable audit columns**
- `ADD COLUMN IF NOT EXISTS accepted_at   TIMESTAMPTZ`
- `ADD COLUMN IF NOT EXISTS rejected_at   TIMESTAMPTZ`
- `ADD COLUMN IF NOT EXISTS reject_reason TEXT`
- All three are idempotent-safe (`IF NOT EXISTS`). All nullable.

**§4 Post-flight verification**
- Verifies `accepted_at`, `rejected_at`, `reject_reason` columns exist.
- Verifies `nc_pool_rfq_supplier_quotes_status_check` constraint is present.
- Verifies the constraint definition contains `ACCEPTED` and `REJECTED`.
- Verifies `nc_pool_rfq_supplier_quotes_invite_unique` (UNIQUE invite_id) still exists.

**What this migration does NOT do:**
- Does not drop UNIQUE(invite_id) — QD-2/AD-3 maintained.
- Does not create new tables.
- Does not modify RLS policies.
- Does not activate any feature flag.
- Does not mutate existing quote data.

---

### 6.2 `20260534000000_nc_pool_rfq_award_feature_flag_seed/migration.sql`

**Purpose:** Seeds `nc.procurement_pools.rfq.award.enabled = false`.

**Operations (in order):**

**§1 Pre-flight guard**
- Verifies `feature_flags` table exists.
- Verifies `network_pool_rfq_supplier_quotes` exists.
- Verifies `accepted_at` column exists (confirms 20260533 was applied first).

**§2 Seed INSERT**
```sql
INSERT INTO public.feature_flags (key, enabled, description, value, updated_at)
VALUES (
  'nc.procurement_pools.rfq.award.enabled',
  false,
  'NC Phase 1D: pool RFQ award / quote acceptance feature — global enable. ...',
  NULL,
  NOW()
) ON CONFLICT (key) DO NOTHING;
```

**§3 Post-flight verification**
- Verifies the flag row exists after INSERT.
- Verifies `enabled = false` — raises exception if `true`.
- Verifies `nc.procurement_pools.supplier_quotes.enabled` was not accidentally set to `true` (QD-6 guard).

**What this migration does NOT do:**
- Does not enable the award flag.
- Does not touch `nc.procurement_pools.supplier_quotes.enabled`.
- Does not enable any other flag.

---

## 7. Feature Flag Seed Details

| Property | Value |
|---|---|
| Key | `nc.procurement_pools.rfq.award.enabled` |
| Seeded value | `false` |
| Description | NC Phase 1D: pool RFQ award / quote acceptance feature — global enable. Must be false until per-tenant provisioning is authorized (AD-7). Independent of nc.procurement_pools.supplier_quotes.enabled (QD-6). |
| Idempotency | `ON CONFLICT (key) DO NOTHING` |
| Independence | Independent of `nc.procurement_pools.supplier_quotes.enabled` (AD-7) |
| Activation | Requires separate explicit Paresh decision — NOT in this packet |

---

## 8. Validation Command Outputs

### 8.1 Git preflight

```
git status --short
(no output — working tree clean)

git log --oneline -10:
e8728d5 (HEAD -> main) docs(network-commerce): design pool rfq award allocation path
3880ab3 docs(network-commerce): clean tracker appendix after supplier quote reconciliation
...
```

Both anchor commits confirmed present. Working tree clean before start.

### 8.2 `prisma validate`

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

Prisma schema warning:
- The `onDelete` referential action of a relation should not be set to `SetNull` ...
The schema at prisma\schema.prisma is valid 🚀
```

**Result: PASS.** The `SetNull` warning is pre-existing and unrelated to this packet's changes.

### 8.3 `prisma generate`

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client (v6.1.0) to .\node_modules\... in 567ms
```

**Result: PASS.** Client generated successfully. The major version upgrade notice (`6.1.0 → 7.8.0`) is informational and out of scope for this packet.

---

## 9. Safety Confirmations

| Confirmation | Status |
|---|---|
| `nc.procurement_pools.supplier_quotes.enabled` remains `false` | ✅ QD-6 hold — not touched |
| `nc.procurement_pools.rfq.award.enabled` seeded `false` only | ✅ AD-7 — never set to `true` |
| Quote status CHECK now supports SUBMITTED/WITHDRAWN/ACCEPTED/REJECTED | ✅ §6.1 implemented |
| `accepted_at` is nullable | ✅ `ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ` |
| `rejected_at` is nullable | ✅ `ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ` |
| `reject_reason` is nullable | ✅ `ADD COLUMN IF NOT EXISTS reject_reason TEXT` |
| `UNIQUE(invite_id)` constraint unchanged | ✅ AD-3 / QD-2 — post-flight verifies it |
| No service files changed | ✅ `networkPoolRfq.service.ts` not touched |
| No route files changed | ✅ `poolRfq.ts` / `poolRfqSupplierQuotes.ts` not touched |
| No frontend files changed | ✅ |
| No test files changed | ✅ |
| No env files changed | ✅ |
| No production data manually mutated | ✅ |
| FE-9 not opened | ✅ HOLD_FOR_PARESH_DECISION |
| DPP remains HOLD_FOR_PARESH_DECISION | ✅ |
| Quote submission not activated | ✅ |
| Award routes not activated | ✅ |

---

## 10. Recommended Next Packet

**`TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-SERVICE-001`**

Implements:
- `toQuoteOwnerRecord` private helper method
- `listOwnerQuotes(ownerOrgId, poolId, rfqId)` service method
- `acceptQuote(ownerOrgId, userId, poolId, rfqId, quoteId, input)` — 12 steps including atomic mass-reject and two SM pool transitions
- `rejectQuote(ownerOrgId, userId, poolId, rfqId, quoteId, input)` — 9 steps
- Error classes: `NetworkPoolRfqOwnerQuoteNotFoundError`, `NetworkPoolRfqSupplierQuoteNotInSubmittedError`

**Prerequisite:** This packet (AWARD-SCHEMA-001) must be applied to Supabase before AWARD-SERVICE-001 can be tested.
**Prerequisite for activation:** Both AWARD-SERVICE-001 and AWARD-ROUTE-001 must be VERIFIED_COMPLETE before `nc.procurement_pools.rfq.award.enabled` can be set to `true`.

---

*Packet status: VERIFIED_COMPLETE — 2026-05-12*
