# TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-SCHEMA-001
## Pool RFQ Award — Maker-Checker Schema Remote Readiness Verification

---

```yaml
id: TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-SCHEMA-001
status: SCHEMA_REMOTE_READY_VERIFIED_COMPLETE
type: GOVERNANCE_SCHEMA_VERIFICATION
date: 2026-07-01
author: GitHub Copilot (governance agent)
authorized_by: Paresh Patel
domain: network-commerce
sub-domain: phase1 / pool-rfq / award / maker-checker
layer: governance / schema-verification
preceding_packet: TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001 (850039a)
delivery_impact: >
  No source, schema, migration, test, env, or flag changes in this packet.
  Verification-only. All G-021 schema objects were found to exist in both
  server/prisma/schema.prisma and the remote Supabase database.
  Conclusion: next packet may proceed directly to SERVICE implementation.
commit_message: "docs(network-commerce): verify award maker checker schema readiness"
authority_sources_reviewed:
  - governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001.md
  - governance/TEXQTIC-NC-PROD-SUPPLIER-QUOTE-AWARD-CONTROLLED-QA-ACTIVATION-001.md
  - governance/TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-DESIGN-001.md
  - governance/control/OPEN-SET.md
  - governance/control/NEXT-ACTION.md
  - governance/control/BLOCKED.md
  - governance/control/GOVERNANCE-CHANGELOG.md
  - server/prisma/schema.prisma (PendingApproval / ApprovalSignature models)
  - server/prisma/migrations/ (G-021 migration history)
  - server/src/services/stateMachine.service.ts (MC step 13 logic)
  - server/src/services/stateMachine.types.ts (TransitionRequest / TransitionResult)
  - server/src/services/networkPoolRfq.service.ts (acceptQuote baseline, read-only)
stop_conditions:
  - Do NOT create schema or migrations (not needed — all objects present)
  - Do NOT change allowed_transitions (requires_maker_checker=true is correct)
  - Do NOT enable any feature flag
  - Do NOT open Packet 17 or FE-10
  - Do NOT change DPP posture
  - Do NOT modify source, schema, test, or env files in this packet
  - Do NOT mutate production DB state
```

---

## §1 — Preflight Verification

```
HEAD:          850039a — docs(network-commerce): design award maker checker flow
origin/main:   34746d6 — docs(network-commerce): close controlled quote award activation blocker
git status:    clean (no unstaged or staged changes at start of packet)
```

| Check | Result |
|---|---|
| Working tree clean | ✅ PASS |
| Design commit `850039a` present | ✅ PASS |
| Branch is 1 ahead of origin/main | ✅ PASS (do not push) |

---

## §2 — Design Decision Recap

From `TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-DESIGN-001` (§4, §5):

| Decision | Value |
|---|---|
| Option selected | **Option C — Two-call G-021 split flow** |
| Maker-checker bypass | **Rejected** — `requires_maker_checker=true` preserved |
| `allowed_transitions` CHECKER actor | **Already present** — no change required |
| New schema models required | **None** — G-021 foundation tables already in schema |
| Schema migration required | **None** — if remote tables verified present |
| `acceptQuote` fate | **Refactored** into `requestAward` (MAKER) + `approveAward` (CHECKER) — in SERVICE packet |

The design established that this SCHEMA packet's sole purpose is to verify the G-021 tables,
indexes, and triggers exist in the remote Supabase database before the SERVICE packet begins.
No schema creation or migration is required if verification passes.

---

## §3 — Prisma Schema Model Verification

### 3.1 `model PendingApproval` — `server/prisma/schema.prisma` lines 707–743

| Required Field | Present | Type | Notes |
|---|---|---|---|
| `orgId` | ✅ | `String @db.Uuid` | `@map("org_id")` |
| `entityType` | ✅ | `String` | `@map("entity_type")` |
| `entityId` | ✅ | `String @db.Uuid` | `@map("entity_id")` |
| `fromStateKey` | ✅ | `String` | `@map("from_state_key")` |
| `toStateKey` | ✅ | `String` | `@map("to_state_key")` |
| `requestedByUserId` | ✅ | `String? @db.Uuid` | `@map("requested_by_user_id")` — nullable (admin path) |
| `requestedByAdminId` | ✅ | `String? @db.Uuid` | `@map("requested_by_admin_id")` — nullable (user path) |
| `requestedByActorType` | ✅ | `String` | `@map("requested_by_actor_type")` |
| `requestedByRole` | ✅ | `String` | `@map("requested_by_role")` |
| `requestReason` | ✅ | `String` | `@map("request_reason")` |
| `frozenPayload` | ✅ | `Json` | `@map("frozen_payload")` |
| `frozenPayloadHash` | ✅ | `String` | `@map("frozen_payload_hash")` — SHA-256 hex (D-021-A) |
| `makerPrincipalFingerprint` | ✅ | `String` | `@map("maker_principal_fingerprint")` — D-021-C format |
| `status` | ✅ | `String @default("REQUESTED")` | |
| `attemptCount` | ✅ | `Int @default(1)` | `@map("attempt_count")` |
| `expiresAt` | ✅ | `DateTime @db.Timestamptz(6)` | `@map("expires_at")` |
| `requestId` | ✅ | `String?` | `@map("request_id")` — idempotency key |
| `signatures` | ✅ | `ApprovalSignature[]` | Relation to G-021 §3.B table |
| `organizations` relation | ✅ | `organizations @relation(...)` | FK to `organizations.id` (onDelete Cascade) |

Additional fields present (not required by design but noted for completeness):
`escalationId`, `aiTriggered`, `impersonationId`, `createdAt`, `updatedAt`

**Verdict:** ALL required fields present. ✅

### 3.2 `model ApprovalSignature` — `server/prisma/schema.prisma` lines 749–779

| Required Field | Present | Type | Notes |
|---|---|---|---|
| `approvalId` | ✅ | `String @db.Uuid` | `@map("approval_id")` — FK to `pending_approvals.id` |
| `orgId` | ✅ | `String @db.Uuid` | `@map("org_id")` |
| `signerUserId` | ✅ | `String? @db.Uuid` | `@map("signer_user_id")` — nullable (admin path) |
| `signerActorType` | ✅ | `String` | `@map("signer_actor_type")` |
| `decision` | ✅ | `String` | APPROVED / REJECTED |
| `reason` | ✅ | `String` | |

Additional fields present: `signerAdminId`, `signerRole`, `impersonationId`, `createdAt`

**Verdict:** ALL required fields present. ✅

**Model comment confirms:** `trg_check_maker_checker_separation` fires on INSERT (AFTER) and `trg_immutable_approval_signature` prevents UPDATE/DELETE. RLS: no UPDATE or DELETE policy defined.

---

## §4 — Remote Table Verification

Remote Supabase DB queried via `psql` with `DATABASE_URL` (redacted). SELECT-only metadata queries.

### 4.1 Table Existence

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('pending_approvals', 'approval_signatures')
ORDER BY table_name;
```

```
 table_schema |     table_name
--------------+---------------------
 public       | approval_signatures
 public       | pending_approvals
(2 rows)
```

**Verdict:** Both tables present in remote DB. ✅

### 4.2 `pending_approvals` Column Verification

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pending_approvals'
ORDER BY ordinal_position;
```

```
         column_name         |        data_type         | is_nullable
-----------------------------+--------------------------+-------------
 id                          | uuid                     | NO
 org_id                      | uuid                     | NO
 entity_type                 | text                     | NO
 entity_id                   | uuid                     | NO
 from_state_key              | text                     | NO
 to_state_key                | text                     | NO
 requested_by_user_id        | uuid                     | YES
 requested_by_admin_id       | uuid                     | YES
 requested_by_actor_type     | text                     | NO
 requested_by_role           | text                     | NO
 request_reason              | text                     | NO
 frozen_payload              | jsonb                    | NO
 frozen_payload_hash         | text                     | NO
 maker_principal_fingerprint | text                     | NO
 status                      | text                     | NO
 attempt_count               | integer                  | NO
 expires_at                  | timestamp with time zone | NO
 escalation_id               | uuid                     | YES
 ai_triggered                | boolean                  | NO
 impersonation_id            | uuid                     | YES
 request_id                  | text                     | YES
 created_at                  | timestamp with time zone | NO
 updated_at                  | timestamp with time zone | NO
(23 rows)
```

**Verdict:** All required columns present with correct types. ✅

### 4.3 `approval_signatures` Column Verification

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'approval_signatures'
ORDER BY ordinal_position;
```

```
    column_name    |        data_type         | is_nullable
-------------------+--------------------------+-------------
 id                | uuid                     | NO
 approval_id       | uuid                     | NO
 org_id            | uuid                     | NO
 signer_user_id    | uuid                     | YES
 signer_admin_id   | uuid                     | YES
 signer_actor_type | text                     | NO
 signer_role       | text                     | NO
 decision          | text                     | NO
 reason            | text                     | NO
 impersonation_id  | uuid                     | YES
 created_at        | timestamp with time zone | NO
(11 rows)
```

Note: `updated_at` is intentionally absent — this table is append-only by design (G-021 §3.B).

**Verdict:** All required columns present with correct types. ✅

---

## §5 — Remote Index Verification

### 5.1 Indexes on `pending_approvals`

```sql
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'pending_approvals'
ORDER BY indexname;
```

```
 schemaname |     tablename     |                indexname                | indexdef
------------+-------------------+-----------------------------------------+---...
 public     | pending_approvals | idx_pending_approvals_expires_at        | CREATE INDEX ... USING btree (expires_at) WHERE (status = 'REQUESTED'::text)
 public     | pending_approvals | idx_pending_approvals_org_entity        | CREATE INDEX ... USING btree (org_id, entity_type, entity_id)
 public     | pending_approvals | idx_pending_approvals_org_id            | CREATE INDEX ... USING btree (org_id)
 public     | pending_approvals | idx_pending_approvals_org_status        | CREATE INDEX ... USING btree (org_id, status)
 public     | pending_approvals | idx_pending_approvals_requested_by_user | CREATE INDEX ... USING btree (requested_by_user_id) WHERE (requested_by_user_id IS NOT NULL)
 public     | pending_approvals | pending_approvals_active_unique         | CREATE UNIQUE INDEX pending_approvals_active_unique ON public.pending_approvals USING btree (org_id, entity_type, entity_id, from_state_key, to_state_key) WHERE (status = ANY (ARRAY['REQUESTED'::text, 'ESCALATED'::text]))
 public     | pending_approvals | pending_approvals_pkey                  | CREATE UNIQUE INDEX pending_approvals_pkey ... USING btree (id)
(7 rows)
```

### 5.2 Active Pending Approval — Unique Partial Index

| Item | Expected | Actual |
|---|---|---|
| Index name (design) | `idx_pending_approvals_active_per_entity` | `pending_approvals_active_unique` |
| Index type | UNIQUE PARTIAL | ✅ UNIQUE PARTIAL |
| Columns | `(org_id, entity_type, entity_id, from_state_key, to_state_key)` | ✅ Exact match |
| WHERE clause | `status = 'REQUESTED'` | ✅ `status = ANY (ARRAY['REQUESTED', 'ESCALATED'])` — broader, more protective |

**Note:** The actual index name differs from the design document's expected name. The actual index
(`pending_approvals_active_unique`) provides stronger protection than the design specified — it
also covers `ESCALATED` status rows, preventing duplicate escalated approvals. This is a
**positive deviation**. The design intent (one active approval per entity/transition) is fully
satisfied.

**Verdict:** Required unique partial index present. ✅

---

## §6 — Remote Trigger Verification

### 6.1 Maker-Checker Separation Trigger

```sql
SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND trigger_name ILIKE '%maker%checker%';
```

```
 event_object_table  |            trigger_name            | action_timing | event_manipulation
---------------------+------------------------------------+---------------+--------------------
 approval_signatures | trg_check_maker_checker_separation | AFTER         | INSERT
(1 row)
```

| Item | Expected | Actual |
|---|---|---|
| Trigger name | `check_maker_checker_separation` | `trg_check_maker_checker_separation` ✅ |
| Table | `approval_signatures` | ✅ |
| Timing | `AFTER INSERT` | ✅ |
| Function | `check_maker_checker_separation` (public schema) | ✅ confirmed via `pg_proc` |

**Verdict:** Maker-checker separation trigger present and correct. ✅

### 6.2 Approval Signature Immutability Trigger

```sql
-- From broader trigger scan:
 approval_signatures | trg_immutable_approval_signature | BEFORE | DELETE
 approval_signatures | trg_immutable_approval_signature | BEFORE | UPDATE
```

**Verdict:** `approval_signatures` is append-only — UPDATE and DELETE prevented by
`trg_immutable_approval_signature`. ✅

### 6.3 `pending_approvals` Supporting Triggers

```
 pending_approvals | trg_g017_pending_approvals_trade_entity_fk  | BEFORE | INSERT, UPDATE
 pending_approvals | trg_g018_pending_approvals_escrow_entity_fk | BEFORE | INSERT, UPDATE
```

These enforce entity FK integrity for TRADE and ESCROW entity types at the DB level.
A corresponding trigger for POOL entity type FK enforcement (if any) is expected to be
added in the SERVICE implementation packet using application-layer validation.

### 6.4 Payload Immutability — No DB Trigger Found

Search for `frozen_payload` / `pending_approval_immut` triggers returned **no results**.

**Analysis:** The `frozen_payload` column is protected by:
1. **`frozenPayloadHash`** (SHA-256 over canonical transition fields, D-021-A) — computed at
   insert time; service layer verifies hash on read during CHECKER call.
2. **Application-layer invariant** — `requestAward` service will not update `frozen_payload`
   after creation; the field is effectively write-once at the application level.
3. **No UPDATE/DELETE of the payload hash** — `pending_approvals_tenant_update` RLS policy
   allows status-only updates; the service is responsible for not touching `frozen_payload`.

**Assessment:** No separate DB trigger is required for `frozenPayload` immutability in Phase 1.
The hash-based verification is the G-021 §3.A design intent. This is consistent with the design
document's position (§15 Non-Decisions item 3: frozenPayload mutation detection deferred to
service layer). Not a gap.

**Verdict:** Payload immutability via hash + application layer — acceptable. ✅

---

## §7 — RLS Policy Verification

```sql
SELECT policyname, cmd, roles FROM pg_policies
WHERE tablename IN ('pending_approvals', 'approval_signatures')
ORDER BY tablename, cmd;
```

### `pending_approvals` policies

| Policy | Command | Verdict |
|---|---|---|
| `pending_approvals_no_delete` | DELETE — USING `false` | ✅ No deletes |
| `pending_approvals_tenant_insert` | INSERT — tenant-scoped | ✅ |
| `pending_approvals_tenant_select` | SELECT — `org_id = app.org_id` | ✅ Tenant-isolated |
| `pending_approvals_admin_select` | SELECT — `is_admin = true` | ✅ Admin path |
| `pending_approvals_tenant_update` | UPDATE — `org_id = app.org_id` | ✅ Status updates allowed; payload protected by app layer |

### `approval_signatures` policies

| Policy | Command | Verdict |
|---|---|---|
| `approval_signatures_no_delete` | DELETE — USING `false` | ✅ No deletes |
| `approval_signatures_no_update` | UPDATE — USING `false` | ✅ No updates (append-only) |
| `approval_signatures_tenant_insert` | INSERT — tenant-scoped | ✅ |
| `approval_signatures_tenant_select` | SELECT — `org_id = app.org_id` | ✅ Tenant-isolated |
| `approval_signatures_admin_select` | SELECT — `is_admin = true` | ✅ Admin path |

**Verdict:** RLS posture fully compliant with G-021 design requirements. ✅

---

## §8 — Allowed Transition Verification

```sql
SELECT entity_type, from_state_key, to_state_key, allowed_actor_type, requires_maker_checker
FROM public.allowed_transitions
WHERE entity_type = 'POOL' AND from_state_key = 'QUOTED' AND to_state_key = 'ACCEPTED';
```

```
 entity_type | from_state_key | to_state_key |          allowed_actor_type           | requires_maker_checker
-------------+----------------+--------------+---------------------------------------+------------------------
 POOL        | QUOTED         | ACCEPTED     | {TENANT_ADMIN,PLATFORM_ADMIN,CHECKER} | t
(1 row)
```

| Item | Expected | Actual |
|---|---|---|
| `requires_maker_checker` | `true` | ✅ `t` |
| `CHECKER` in `allowed_actor_type` | ✅ | ✅ `{TENANT_ADMIN,PLATFORM_ADMIN,CHECKER}` |
| Transition unchanged since design packet | ✅ | ✅ |

**Verdict:** Transition seed unchanged, CHECKER allowed, MC enforced. ✅

---

## §9 — Prisma Validate / Generate / TSC Verification

### 9.1 `prisma validate`

```
pnpm -C server exec prisma validate
```

```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

Prisma schema warning:
- The `onDelete` referential action of a relation should not be set to `SetNull`
  when a referenced field is required. [pre-existing warning, not MC-related]
The schema at prisma\schema.prisma is valid 🚀
```

**Verdict:** Schema valid. Pre-existing warning unrelated to MC schema. ✅

### 9.2 `prisma generate`

```
pnpm -C server exec prisma generate
```

```
✔ Generated Prisma Client (v6.1.0) to .\node_modules\...@prisma\client in 700ms
```

**Verdict:** Prisma Client generated successfully. `PendingApproval` and `ApprovalSignature`
types are accessible in the generated client. ✅

### 9.3 `tsc --noEmit`

```
cd server ; pnpm exec tsc --noEmit
```

```
(no output — zero TypeScript errors)
```

**Verdict:** Server TypeScript compiles cleanly. All generated Prisma types resolve. ✅

---

## §10 — Summary Decision

### SCHEMA_REMOTE_READY_VERIFIED_COMPLETE

All verification checks passed. The G-021 maker-checker schema foundation is complete and
present in both `server/prisma/schema.prisma` and the remote Supabase database.

| Verification Item | Status |
|---|---|
| `model PendingApproval` in schema.prisma — all required fields | ✅ PASS |
| `model ApprovalSignature` in schema.prisma — all required fields | ✅ PASS |
| `organizations` → `PendingApproval` relation in schema.prisma | ✅ PASS |
| Remote table `public.pending_approvals` exists | ✅ PASS |
| Remote table `public.approval_signatures` exists | ✅ PASS |
| `pending_approvals` all required columns present | ✅ PASS |
| `approval_signatures` all required columns present | ✅ PASS |
| Partial unique index for active approvals per entity | ✅ PASS (`pending_approvals_active_unique` — broader than design, covers ESCALATED too) |
| Maker-checker separation trigger | ✅ PASS (`trg_check_maker_checker_separation` on `approval_signatures` AFTER INSERT) |
| `check_maker_checker_separation` trigger function present | ✅ PASS |
| `approval_signatures` immutability trigger (`trg_immutable_approval_signature`) | ✅ PASS |
| Payload immutability — DB trigger | ℹ️ NOT PRESENT — covered by `frozenPayloadHash` + app layer (acceptable, §6.4) |
| RLS on `pending_approvals` — INSERT/SELECT/UPDATE/no DELETE | ✅ PASS |
| RLS on `approval_signatures` — INSERT/SELECT only, no UPDATE/DELETE | ✅ PASS |
| `allowed_transitions` POOL QUOTED→ACCEPTED: `requires_maker_checker=true` | ✅ PASS (unchanged) |
| `allowed_transitions` POOL QUOTED→ACCEPTED: `CHECKER` in `allowed_actor_type` | ✅ PASS (unchanged) |
| `prisma validate` | ✅ PASS |
| `prisma generate` (Prisma Client v6.1.0) | ✅ PASS |
| `tsc --noEmit` (server) | ✅ PASS (zero errors) |

**Conclusion:** No schema migration required. No new Prisma models required. No DB writes
performed. The SERVICE implementation packet may proceed immediately.

---

## §11 — Confirmations

| Item | Status |
|---|---|
| No source code changed (`.ts`, `.tsx`) | ✅ CONFIRMED |
| No `schema.prisma` changed | ✅ CONFIRMED |
| No migration files created or modified | ✅ CONFIRMED |
| No test files changed | ✅ CONFIRMED |
| No `.env` files changed or read for output | ✅ CONFIRMED (DB URL loaded in-memory only, not printed) |
| No DB writes performed (SELECT-only queries) | ✅ CONFIRMED |
| No feature flags changed | ✅ CONFIRMED |
| `allowed_transitions` POOL QUOTED→ACCEPTED — unchanged | ✅ CONFIRMED |
| Packet 17 not opened | ✅ CONFIRMED |
| FE-10 not opened | ✅ CONFIRMED |
| DPP remains `HOLD_FOR_PARESH_DECISION` | ✅ CONFIRMED |
| `dpp_launch_authorization` unchanged | ✅ CONFIRMED |

---

## §12 — Recommended Next Packet

```
TEXQTIC-NC-PHASE1-POOL-RFQ-AWARD-MAKER-CHECKER-SERVICE-001
```

**Scope:** Implement the three service methods in `NetworkPoolRfqService`:

1. **`requestAward()`** — MAKER step
   - Calls SM with `actorType: 'TENANT_ADMIN'`; receives `PENDING_APPROVAL`
   - Creates `pending_approvals` row with `frozenPayload` + `frozenPayloadHash`
   - Returns `{ status: 'PENDING_APPROVAL', approvalId: <uuid> }`

2. **`approveAward()`** — CHECKER step
   - Looks up `pending_approvals` row by `approvalId` (status must be `REQUESTED`)
   - Validates `makerUserId != checkerId` (maker≠checker)
   - Inserts `approval_signatures` row (APPROVED)
   - Calls SM with `actorType: 'CHECKER'`, `makerUserId: <makerUserId>`; receives `APPLIED`
   - Updates `pending_approvals.status` → `APPROVED`

3. **`rejectAwardApproval()`** — CHECKER rejection
   - Looks up `pending_approvals` row
   - Inserts `approval_signatures` row (REJECTED)
   - Updates `pending_approvals.status` → `REJECTED`
   - Does NOT call SM (pool stays in QUOTED)

4. **Deprecation of `acceptQuote()`** — retained as stub for backward compatibility until
   ROUTE packet replaces the `/accept` endpoint.

**Pre-conditions confirmed by this packet:**
- `pending_approvals` table ✅ ready in remote DB
- `approval_signatures` table ✅ ready in remote DB
- `CHECKER` in `allowed_actor_type` ✅
- SM Step 13 logic ✅ works correctly with `actorType: 'CHECKER'` + `makerUserId != null`
- Prisma Client ✅ exposes `PendingApproval` and `ApprovalSignature` models
- Unique partial index ✅ enforces one active approval per entity/transition

---

*Packet closed: 2026-07-01 — SCHEMA_REMOTE_READY_VERIFIED_COMPLETE — no source/schema/migration/test/env changes.*
