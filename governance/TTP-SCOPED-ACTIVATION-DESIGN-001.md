# TTP-SCOPED-ACTIVATION-DESIGN-001
## TradeTrust Pay Phase 2 Wave 0 — Scoped Activation Controls

| Field | Value |
|---|---|
| Document ID | TTP-SCOPED-ACTIVATION-DESIGN-001 |
| Status | DESIGN — PENDING PARESH REVIEW |
| Phase | Phase 2, Wave 0 |
| Scope | Governance design only. No code, schema, migration, seed, or env changes. |
| `ttp_enabled` invariant | `ttp_enabled = false` — UNCHANGED throughout |
| Governance tier | P0 — required before any implementation begins |
| Decision basis | TQ-01, TQ-08, TQ-09, TQ-10, TQ-20 (see Section 2) |
| Authoritative ADR | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` |

---

## Section 1 — Purpose

This document records the design for TradeTrust Pay (TTP) Phase 2 Wave 0 scoped activation controls.
It is a **pure governance artifact**. No implementation is authorized by this document.

**What this document is:**
- A design record for per-org TTP activation via `TenantFeatureOverride`
- A specification for a QA sentinel flag on `organizations`
- A structured logging baseline for TTP events via Pino
- A manual activation and rollback runbook design
- A language governance baseline for `TTP_DISCLAIMER_TEXT`

**What this document is not:**
- Implementation authorization
- A migration plan, code change, or deployment plan

**Activation authority:** Implementation requires a separate, explicit, Paresh-approved implementation prompt for each slice. The existence of this document does not authorize any implementation.

**`ttp_enabled` invariant:** The global `feature_flags.ttp_enabled` flag remains `false` throughout design, review, and until a specific implementation prompt authorizes activation. This must not change.

---

## Section 2 — Authority Basis

This design is grounded in the following governance files. All must be reviewed before any implementation prompt is authored.

1. `AGENTS.md` — TexQtic Codex operating playbook (minimal diff, tenant isolation, Prisma governance)
2. `.github/copilot-instructions.md` — Safe-Write mode, database authority, secrets governance
3. `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` — P0 decisions TQ-01, TQ-08, TQ-09, TQ-10, TQ-20
4. `shared/contracts/rls-policy.md` — RLS constraints for tenant data isolation
5. `shared/contracts/db-naming-rules.md` — Column and table naming conventions
6. `shared/contracts/ARCHITECTURE-GOVERNANCE.md` — Control/tenant plane separation
7. `shared/contracts/openapi.tenant.json` — Tenant-plane API contracts (3 TTP routes)

---

## Section 3 — Current Repo Truth

All facts below are confirmed by direct source inspection of the current repository state.
No assumptions have been made.

### 3.1 Feature flag state

- `feature_flags` table exists; `ttp_enabled` row is present with `enabled = false`
- No code change has been made to the flag state; it remains `false`
- Global flag is the single current gating mechanism for all 13 TTP routes

### 3.2 `ttpFeatureGate.middleware.ts` — current behaviour (UNMODIFIED)

Location: `server/src/middleware/ttpFeatureGate.middleware.ts`

```
Reads: feature_flags WHERE key = 'ttp_enabled'
Logic: if flag?.enabled !== true → sendError(reply, 'FEATURE_DISABLED', '...', 503)
DB error → fail-closed → 503
Missing row → fail-closed → 503
enabled = false → 503
```

- **`TenantFeatureOverride` is NOT consulted** in any current middleware code
- **Auth order is maintained:** `tenantAuthMiddleware` always runs before `ttpFeatureGateMiddleware` in all 3 tenant routes, ensuring unauthenticated requests return 401 before the feature gate fires

### 3.3 `TenantFeatureOverride` model (CONFIRMED in schema)

```
Table:                  tenant_feature_overrides
Prisma model:           TenantFeatureOverride
Primary key:            id (UUID, generated)
Composite unique:       @@unique([tenantId, key])  → Prisma compound key name: tenantId_key
FK:                     key → feature_flags(key) ON DELETE CASCADE
FK:                     tenantId → tenants(id) ON DELETE CASCADE
Indexes:                @@index([tenantId]), @@index([key])
```

**Identity mapping (confirmed from schema FK chain):**
```
TenantFeatureOverride.tenantId
  = Tenant.id
  = organizations.id                (constitutional FK, co-equal UUIDs, ON DELETE CASCADE)
  = auth context orgId              (from tenantAuthMiddleware)
```

Therefore: `WHERE tenantId = orgId AND key = 'ttp_enabled'` is the correct and safe lookup.

**No rows exist** for `key = 'ttp_enabled'` — table is empty for this key.

### 3.4 `organizations` model (CONFIRMED in schema at line 1052)

```prisma
model organizations {
  id                           String   @id @db.Uuid
  slug                         String   @unique @db.VarChar(100)
  legal_name                   String   @db.VarChar(500)
  jurisdiction                 String   @default("UNKNOWN") @db.VarChar(100)
  registration_no              String?  @db.VarChar(200)
  org_type                     String   @default("B2B") @db.VarChar(50)
  risk_score                   Int      @default(0) @db.SmallInt
  status                       String   @default("ACTIVE") @db.VarChar(30)
  plan                         String   @default("FREE") @db.VarChar(30)
  effective_at                 DateTime @default(now()) @db.Timestamptz(6)
  superseded_at                DateTime?  @db.Timestamptz(6)
  created_at                   DateTime @default(now()) @db.Timestamptz(6)
  updated_at                   DateTime @default(now()) @db.Timestamptz(6)
  is_white_label               Boolean  @default(false)
  external_orchestration_ref   String?  @unique @db.VarChar(255)
  primary_segment_key          String?  @db.VarChar(100)
  publication_posture          String   @default("PRIVATE_OR_AUTH_ONLY") @db.VarChar(30)
  price_disclosure_policy_mode String?  @db.VarChar(30)
  tenants                      Tenant   @relation(fields: [id], references: [id], onDelete: Cascade)
  // ... additional relation fields ...
}
```

**Confirmed facts:**
- `is_qa_sentinel` column — **DOES NOT EXIST** in current schema (confirmed absent)
- `risk_score` field — exists (`Int @default(0) @db.SmallInt`)
- `organizations.id` = `Tenant.id` via constitutional FK — confirmed

### 3.5 TTP routes (ALL 13 CONFIRMED)

- 3 tenant-plane routes in `server/src/routes/tenant/`
- 10 control-plane routes in `server/src/routes/control/`
- All 13 routes apply `ttpFeatureGateMiddleware`
- All 13 routes currently check the global flag only — no per-org check exists

### 3.6 `ttp.constants.ts` (CONFIRMED)

Location: `server/src/ttp/ttp.constants.ts`

- `TTP_FEATURE_FLAG.TTP_ENABLED = 'ttp_enabled'` — **EXISTS**
- `TTP_DISCLAIMER_TEXT` — **DOES NOT EXIST** (confirmed absent)
- All other TTP constants (states, tiers, outcomes, actor types, etc.) — present and unchanged

### 3.7 `scripts/qa-ttp-seed.sql` (CONFIRMED)

- QA seller org UUID: `ee000000-0000-0000-0000-000000000001` (slug: `qa-ttp-seller-001`)
- QA buyer org UUID: `ee000000-0000-0000-0000-000000000002` (slug: `qa-ttp-buyer-001`)
- Pre-flight guard: aborts if `ttp_enabled = true`
- Does NOT touch `ttp_enabled` flag (leaves it unchanged)
- Does NOT set `is_qa_sentinel` — column does not yet exist; INSERT omits it

---

## Section 4 — Design Goals

1. **Preserve emergency kill-switch:** Global `feature_flags.ttp_enabled = false` must always win and block all 13 TTP routes. No per-org override can bypass a globally-off flag.
2. **Enable per-org TTP activation:** When global flag is `true`, individual org access is controlled by `TenantFeatureOverride(tenantId, key='ttp_enabled')`.
3. **Backward compatibility:** `TenantFeatureOverride` already exists in schema; no new table is required.
4. **Fail-closed in all error paths:** DB errors, missing override rows, and global-off all produce identical 503 FEATURE_DISABLED responses.
5. **Auth before feature gate:** Unauthenticated requests must return 401 before the feature gate fires; middleware order is non-negotiable.
6. **QA isolation via explicit flag:** QA sentinel orgs must be explicitly and queryably marked via `is_qa_sentinel`; no implicit UUID-range assumption has DB enforcement.
7. **Structured observability:** Activation gate decisions must emit structured Pino log events for operational audit trail.
8. **Minimal schema change:** `is_qa_sentinel` is additive (`NOT NULL DEFAULT FALSE`); no existing row is affected by the `ALTER TABLE`.
9. **Language governance:** All TTP API responses must include a consistent advisory disclaimer drawn from a shared constant.
10. **Manual rollback authority:** Rollback is a per-org flag flip only. TRANSMITTED VPCs cannot be reversed — this is an accepted invariant per TQ-10.

---

## Section 5 — Scoped Activation Semantics

The scoped activation model is a two-layer gate. Layer 1 (global) is always evaluated first.
Layer 2 (per-org) is evaluated only when Layer 1 passes.

| Global `ttp_enabled` | Per-org `TenantFeatureOverride` row | Effective access | HTTP response |
|---|---|---|---|
| `false` | Any / missing | BLOCKED | 503 FEATURE_DISABLED |
| `true` | Row exists, `enabled = true` | ALLOWED | route handler proceeds |
| `true` | Row exists, `enabled = false` | BLOCKED | 503 FEATURE_DISABLED |
| `true` | Row missing (no override row) | BLOCKED | 503 FEATURE_DISABLED |
| DB error on either layer | N/A | BLOCKED (fail-closed) | 503 FEATURE_DISABLED |
| `true` | Row exists, `enabled = true`, but unauthenticated | N/A | 401 (auth fires first) |

**Key semantics:**

- A tenant org is "TTP-activated" when: global = true AND `TenantFeatureOverride(tenantId=orgId, key='ttp_enabled').enabled = true`
- A missing override row is semantically equivalent to `enabled = false` — fail-closed
- Platform admin can deactivate a single org by: (a) setting `enabled = false` on their override, or (b) deleting the override row
- Platform admin can deactivate all orgs at once by: setting global `ttp_enabled = false`
- Per-org activation is only possible when the global flag is already `true`

---

## Section 6 — `TenantFeatureOverride` Lookup Design

### 6.1 Identity resolution (canonical)

```
Auth context orgId
  = organizations.id          (from session / JWT claim)
  = Tenant.id                 (constitutional FK: organizations.id → Tenant.id)
  = TenantFeatureOverride.tenantId
```

This identity holds by constitutional FK confirmed at `server/prisma/schema.prisma` line 1052:
```
tenants Tenant @relation(fields: [id], references: [id], onDelete: Cascade, onUpdate: NoAction)
```

### 6.2 Proposed Prisma lookup design for Phase 2 middleware (NOT authorized — requires implementation prompt)

```typescript
// Step 1: Read global flag (current behaviour — preserved unchanged)
const globalFlag = await prisma.featureFlag.findUnique({
  where: { key: TTP_FEATURE_FLAG.TTP_ENABLED },
  select: { enabled: true },
});
if (globalFlag?.enabled !== true) {
  return sendError(reply, 'FEATURE_DISABLED', 'TTP feature is not available.', 503);
}

// Step 2: Read per-org override (new in Phase 2)
const tenantOverride = await prisma.tenantFeatureOverride.findUnique({
  where: {
    tenantId_key: {                     // Prisma compound unique key name (@@unique([tenantId, key]))
      tenantId: orgId,                  // from auth context = organizations.id = Tenant.id
      key: TTP_FEATURE_FLAG.TTP_ENABLED,
    },
  },
  select: { enabled: true },
});
if (tenantOverride?.enabled !== true) {
  return sendError(reply, 'FEATURE_DISABLED', 'TTP is not activated for this organization.', 503);
}
// Both layers passed — allow request to proceed
```

### 6.3 Design questions — fully resolved

| # | Question | Resolution |
|---|---|---|
| Q1 | Which `key` value is used? | `TTP_FEATURE_FLAG.TTP_ENABLED = 'ttp_enabled'` |
| Q2 | Where does `tenantId` come from? | Auth context `orgId` = `organizations.id` = `Tenant.id` |
| Q3 | What if override row is missing? | Missing row → blocked (fail-closed; identical to `enabled = false`) |
| Q4 | What if DB error on override lookup? | fail-closed → 503 (same as current global flag error behaviour) |
| Q5 | What if global flag is `false`? | 503 immediately; per-org lookup is skipped entirely |
| Q6 | Race condition between two DB reads? | Acceptable: global off wins at any point; no distributed lock needed |
| Q7 | Can control-plane routes skip per-org check? | No. All 13 routes must pass both layers (see Q8 for resolution) |
| Q8 | What `orgId` is used for control-plane routes? | `:orgId` path param for orgId-scoped routes; org derived from record for others (see Section 7) |
| Q9 | Should per-org override be cached? | No caching in Wave 0. Direct DB read on every request. |

### 6.4 DB index coverage

The `@@unique([tenantId, key])` constraint on `TenantFeatureOverride` automatically creates a unique index. The `findUnique` lookup by `tenantId_key` uses this index. No additional index is required.

The `@@index([tenantId])` and `@@index([key])` secondary indexes also exist and provide coverage for admin queries.

---

## Section 7 — TTP Route Scope (All 13 Routes)

All 13 TTP routes are in scope for the Phase 2 scoped activation change. No route is exempt.

### 7.1 Tenant-plane routes (3) — feature gate subject: authenticated tenant's `orgId`

| Route | Method | Auth | Feature gate `orgId` source |
|---|---|---|---|
| `/api/tenant/trades/:tradeId/ttp-summary` | GET | `tenantAuthMiddleware` | auth context `orgId` |
| `/api/tenant/trades/:tradeId/ttp-enrollment` | GET | `tenantAuthMiddleware` | auth context `orgId` |
| `/api/tenant/trades/:tradeId/ttp-enrollment` | POST | `tenantAuthMiddleware` | auth context `orgId` |

### 7.2 Control-plane routes (10) — feature gate subject: subject org

| Route | Method | Auth | Feature gate `orgId` source |
|---|---|---|---|
| `/api/control/ttp/eligibility/:orgId` | POST | SUPER_ADMIN | `:orgId` path param |
| `/api/control/ttp/eligibility/:orgId` | GET | admin | `:orgId` path param |
| `/api/control/vpc/generate/:invoiceId` | POST | SUPER_ADMIN | org derived from invoice record |
| `/api/control/vpc` | GET | admin | platform-wide aggregated; global gate sufficient (see note) |
| `/api/control/vpc/:vpcId` | GET | admin | org derived from VPC record |
| `/api/control/vpc/:vpcId/transition` | PATCH | SUPER_ADMIN | org derived from VPC record |
| `/api/control/ttp/routing-stubs/:vpcId` | GET | SUPER_ADMIN | org derived from VPC record |
| `/api/control/ttp/enrollments` | GET | SUPER_ADMIN | platform-wide aggregated; global gate sufficient (see note) |
| `/api/control/ttp/enrollments/:tradeId` | GET | SUPER_ADMIN | org derived from trade record |
| `/api/control/ttp/enrollments/:tradeId` | PATCH | SUPER_ADMIN | org derived from trade record |

**Note on platform-wide aggregated list routes** (`GET /vpc`, `GET /enrollments`):
These routes return admin-aggregated views across all orgs. In Wave 0, the global gate is sufficient for these routes. Per-org gate does not apply to aggregated admin views — the admin permission layer already gates access to these routes. This is subject to OQ-1 in Section 15.

---

## Section 8 — QA Sentinel Flag Design

Decision basis: **TQ-08 Option A** — `is_qa_sentinel Boolean @default(false)` on `organizations` table.

### 8.1 Rationale for explicit boolean flag

- **Queryable:** `WHERE is_qa_sentinel = true` is clean in RLS policy expressions and service queries
- **Additive:** `NOT NULL DEFAULT FALSE` means no existing production row is affected
- **RLS-compatible:** Boolean columns are natively supported in Supabase RLS policy expressions
- **Explicit enforcement:** Replaces implicit UUID namespace assumption (`ee000000-*`) which has no DB-level enforcement

### 8.2 Proposed SQL intent (NOT authorized for execution — requires explicit implementation prompt)

```sql
-- Requires manual psql execution via DATABASE_URL
-- Then: prisma db pull + prisma generate + server restart

-- Step 1: Add column
ALTER TABLE organizations
  ADD COLUMN is_qa_sentinel BOOLEAN NOT NULL DEFAULT FALSE;

-- Step 2: Tag existing QA orgs (from qa-ttp-seed.sql)
UPDATE organizations
  SET is_qa_sentinel = true
  WHERE id IN (
    'ee000000-0000-0000-0000-000000000001',  -- qa-ttp-seller-001
    'ee000000-0000-0000-0000-000000000002'   -- qa-ttp-buyer-001
  );
```

### 8.3 Proposed Prisma schema addition (NOT authorized — requires explicit implementation prompt)

To be added to `model organizations` in `server/prisma/schema.prisma`:

```prisma
  is_qa_sentinel Boolean @default(false) @map("is_qa_sentinel")
```

This must be added ONLY after SQL has been applied and verified. The required execution sequence is:
1. Apply SQL via `psql` using `DATABASE_URL`
2. Verify: no ERROR or ROLLBACK in psql output
3. Run `pnpm -C server exec prisma db pull`
4. Run `pnpm -C server exec prisma generate`
5. Restart server
6. Update `scripts/qa-ttp-seed.sql` INSERTs for QA orgs to include `is_qa_sentinel = true`

### 8.4 Sentinel flag usage scope

- **QA test harness:** Filter test assertions to `WHERE is_qa_sentinel = true`
- **Seed guard:** Seed scripts should verify they are inserting into sentinel orgs only
- **Production guard:** No production code path should create a `TenantFeatureOverride` for a non-sentinel org without explicit admin review in Wave 0
- **NOT a runtime access control gate:** `is_qa_sentinel` is a QA classification marker only — it does not affect request routing or RLS policies in Wave 0

---

## Section 9 — Structured TTP Pino Logging Design

Decision basis: **TQ-09 Option A** — structured Pino logs; no DB-backed audit table.

Pino is already in the Fastify stack. No new logger infrastructure is required.

### 9.1 Minimum 10 structured log events

Each event must include: `requestId`, `orgId`, `event`, `timestamp`, and event-specific fields.

| # | Event key | Trigger | Required fields |
|---|---|---|---|
| 1 | `ttp.feature_gate.global_blocked` | Global `ttp_enabled = false` blocks request | `orgId`, `routePath`, `requestId` |
| 2 | `ttp.feature_gate.org_blocked` | Per-org override missing or `enabled = false` | `orgId`, `routePath`, `requestId` |
| 3 | `ttp.feature_gate.allowed` | Both layers pass; request proceeds | `orgId`, `routePath`, `requestId` |
| 4 | `ttp.feature_gate.db_error` | DB error during flag lookup; fail-closed triggered | `orgId`, `routePath`, `requestId`, `error.message` |
| 5 | `ttp.enrollment.state_transition` | Enrollment state changes | `orgId`, `tradeId`, `fromState`, `toState`, `actorType`, `actorId`, `requestId` |
| 6 | `ttp.eligibility.assessed` | Eligibility assessment created or updated | `orgId`, `riskTier`, `eligibilityOutcome`, `assessedByAdminId`, `requestId` |
| 7 | `ttp.vpc.generated` | VPC generated from invoice | `orgId`, `invoiceId`, `vpcId`, `riskTier`, `requestId` |
| 8 | `ttp.vpc.state_transition` | VPC lifecycle state changes | `orgId`, `vpcId`, `fromState`, `toState`, `actorType`, `requestId` |
| 9 | `ttp.routing.stub_generated` | Partner routing stub generated | `orgId`, `vpcId`, `partnerType`, `transmissionStatus`, `requestId` |
| 10 | `ttp.override.activated` | `TenantFeatureOverride` for `ttp_enabled` inserted | `orgId`, `enabledBy`, `requestId` |

### 9.2 Log level policy

| Events | Level | Rationale |
|---|---|---|
| Events 1–3 (gate decisions — blocked/allowed) | `info` | Activation decisions are operationally significant |
| Event 4 (DB error) | `error` | Fail-closed error requires operator attention |
| Events 5–9 (domain lifecycle events) | `info` | Standard operational log |
| Event 10 (per-org activation) | `warn` | Org activation is a significant administrative action |

### 9.3 Structured log shape (minimum required fields)

```json
{
  "level": "info",
  "time": "<ISO 8601 timestamp>",
  "requestId": "<Fastify request ID>",
  "orgId": "<UUID>",
  "event": "ttp.feature_gate.allowed",
  "routePath": "/api/tenant/trades/:tradeId/ttp-summary"
}
```

### 9.4 Out of scope for Wave 0

- DB-backed audit table for TTP log events (TQ-09 explicitly chose Pino over DB-backed audit)
- Log aggregation service integration (Datadog, CloudWatch, etc.)
- Alerting rules on log events
- Dashboard or reporting on log data

---

## Section 10 — Manual Activation and Rollback Runbook Design

Decision basis: **TQ-10 Option A** — manual runbook, per-org pilot, TRANSMITTED VPCs are an accepted irreversible invariant.

### 10.1 Activation runbook (per-org)

**Pre-conditions (all must be true before executing activation):**
1. Target org has `is_qa_sentinel = true` (Wave 0: QA pilots only)
2. Target org has an eligibility assessment with `eligibility_outcome = 'ELIGIBLE'`
3. Global `feature_flags.ttp_enabled = true` (authorized via separate platform ops prompt)
4. No existing `TenantFeatureOverride` row exists for this org + `ttp_enabled` key

**Activation SQL per-org (requires explicit Paresh approval before execution):**
```sql
INSERT INTO tenant_feature_overrides (id, tenant_id, key, enabled)
VALUES (gen_random_uuid(), '<org_id>', 'ttp_enabled', true)
ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = true;
```

**Post-activation verification (must all pass before reporting success):**
1. `SELECT enabled FROM tenant_feature_overrides WHERE tenant_id = '<org_id>' AND key = 'ttp_enabled'` → returns `true`
2. Pino log contains `event: 'ttp.override.activated'` with correct `orgId`
3. `GET /health` → HTTP 200
4. Smoke-test: `GET /api/tenant/trades/:tradeId/ttp-summary` (for QA org) → non-503 response

### 10.2 Per-org deactivation runbook

**Option A — soft deactivation (preferred; preserves override row for audit):**
```sql
UPDATE tenant_feature_overrides
  SET enabled = false
  WHERE tenant_id = '<org_id>' AND key = 'ttp_enabled';
```

**Option B — hard deactivation (removes override row):**
```sql
DELETE FROM tenant_feature_overrides
  WHERE tenant_id = '<org_id>' AND key = 'ttp_enabled';
```

Both options produce identical fail-closed behaviour on the next request to any TTP route.

### 10.3 Emergency global deactivation

Applies to all orgs simultaneously. Does not require per-org row changes. Takes effect immediately on the next request.

```sql
UPDATE feature_flags
  SET enabled = false
  WHERE key = 'ttp_enabled';
```

Effect: all 13 TTP routes return 503 FEATURE_DISABLED immediately on the next request, regardless of any `TenantFeatureOverride` rows.

### 10.4 TRANSMITTED VPC invariant (accepted)

VPCs that have reached `TRANSMITTED` state cannot be reversed by deactivating TTP. This is an accepted invariant per TQ-10.

| VPC state at time of deactivation | Effect of deactivation |
|---|---|
| `ACTIVE` or `ROUTING_READY` | New transitions blocked; existing record unchanged |
| `TRANSMITTED` | No reversal possible; partner routing has occurred; record is frozen |
| `VOIDED` or `EXPIRED` | Already terminal; deactivation has no additional effect |

**Documentation requirement:** Before any org activation, record the pre-activation VPC count and states for that org. This enables post-incident analysis if an emergency rollback is required.

---

## Section 11 — Language Governance Baseline

Decision basis: **TQ-20 Option B** — shared `TTP_DISCLAIMER_TEXT` constant + forbidden language governance.

### 11.1 Rationale

An inline advisory disclaimer on one or two routes is insufficient for a platform with 13 active TTP API endpoints. A shared constant ensures:
- Consistent disclaimer text across all 13 route responses
- Single point of update if legal/compliance requires text change
- Lint-enforceable: a grep or ESLint rule can verify constant usage in TTP route handlers
- No inline string literals that can diverge over time

### 11.2 Proposed constant (NOT authorized — requires explicit implementation prompt)

To be added to `server/src/ttp/ttp.constants.ts`:

```typescript
export const TTP_DISCLAIMER_TEXT =
  '[ADVISORY] TradeTrust Pay readiness score is informational only. ' +
  'It does not constitute a credit assessment, financing approval, ' +
  'payment guarantee, lending decision, or partner commitment.';
```

### 11.3 Required usage scope

- All 13 TTP API route responses (both tenant-plane and control-plane) must include an `advisory_disclaimer` field in the response body
- The value must be `TTP_DISCLAIMER_TEXT` exactly — no inline string literals allowed
- Frontend TTP-facing views must display this disclaimer text to the user
- The field must be present even on error responses from TTP routes (to avoid inconsistent UI)

### 11.4 Forbidden language

The following terms must NOT appear in any TTP-related API response, frontend component, or user-visible string. They imply credit decisions, money movement, or partner commitments that TexQtic does not make.

| Forbidden term | Reason |
|---|---|
| "approved for financing" | Implies credit approval |
| "credit approved" | Implies credit decision |
| "loan approved" | Implies lending decision |
| "payment guaranteed" | Implies payment guarantee |
| "funds available" | Implies disbursement |
| "disbursement" | Implies money movement |
| "advance payment" | Implies money movement |
| "receivables purchased" | Implies factoring completion |
| "factoring confirmed" | Implies partner commitment |

This list is a baseline per TQ-20. Additional terms may be added via governance addendum without requiring a new design document.

### 11.5 Lint enforcement design (future)

A lint rule (ESLint custom rule or CI grep guard) should:
- Scan all files under `server/src/ttp/` and `components/Tenant/TTP*/` for forbidden terms
- Fail CI if any forbidden term appears outside of governance documentation files
- Exempt files: `governance/`, `docs/`, test fixtures explicitly marked as negative test cases

---

## Section 12 — Implementation Slices Proposed

Each slice requires a **separate, explicit, Paresh-approved implementation prompt**. No slice may begin without that approval. Order is binding.

| Slice | ID | Description | Dependency | Files in scope |
|---|---|---|---|---|
| 1 | TTP-IMPL-001 | Add `is_qa_sentinel` column to `organizations` via SQL + `prisma db pull` + `prisma generate`; update `qa-ttp-seed.sql` | None | `server/prisma/schema.prisma`, `scripts/qa-ttp-seed.sql` |
| 2 | TTP-IMPL-002 | Add `TTP_DISCLAIMER_TEXT` constant to `ttp.constants.ts` | None (parallel with Slice 1) | `server/src/ttp/ttp.constants.ts` |
| 3 | TTP-IMPL-003 | Update `ttpFeatureGate.middleware.ts` for two-layer per-org `TenantFeatureOverride` lookup | Slice 1 (schema confirmed, org identity confirmed) | `server/src/middleware/ttpFeatureGate.middleware.ts` |
| 4 | TTP-IMPL-004 | Add structured Pino log events (10 minimum) to TTP middleware and domain services | Slice 3 | `server/src/middleware/ttpFeatureGate.middleware.ts`, TTP service files |
| 5 | TTP-IMPL-005 | Add `advisory_disclaimer` field to all 13 TTP route responses using `TTP_DISCLAIMER_TEXT` | Slice 2 | All 6 TTP route handler files |
| 6 | TTP-IMPL-006 | Write per-org activation runbook SQL script; write rollback SQL script | Slices 1–5 complete | `scripts/` (new runbook files — requires explicit allowlist in that prompt) |

**Ordering rationale:**
- Slice 1 before Slice 3: middleware update requires confirmed schema identity
- Slice 2 is constants-only and can run in parallel with Slice 1 (subject to OQ-5)
- Slice 3 is the highest-risk change (live middleware); must not proceed until Slice 1 is verified
- Slices 4 and 5 are additive to live code; follow Slice 3
- Slice 6 is operational documentation; should be last

---

## Section 13 — Verification Plan

### 13.1 Middleware unit test scenarios (for Slice 3 verification)

| # | Scenario | Input state | Expected result |
|---|---|---|---|
| 1 | Global flag `false` | Any org | 503 FEATURE_DISABLED; per-org lookup not reached |
| 2 | Global `true`, no override row for org | Org has no override | 503 FEATURE_DISABLED |
| 3 | Global `true`, override `enabled = false` | Org override exists, disabled | 503 FEATURE_DISABLED |
| 4 | Global `true`, override `enabled = true` | Org override exists, enabled | Middleware passes; route handler called |
| 5 | Global `true`, override `enabled = true`, unauthenticated request | No auth token | 401 (auth middleware fires before feature gate) |
| 6 | Global `true`, override `enabled = true`, DB error on override lookup | DB unavailable | 503 FEATURE_DISABLED (fail-closed) |
| 7 | Global `true`, DB error on global flag lookup | DB unavailable | 503 FEATURE_DISABLED (fail-closed) |
| 8 | Control-plane route: global `true`, subject org has override `enabled = true` | Subject org activated | Middleware passes |
| 9 | Control-plane route: global `true`, subject org has no override | Subject org not activated | 503 FEATURE_DISABLED |

### 13.2 Schema verification (for Slice 1)

```sql
-- Verification 1: column exists
SELECT column_name, data_type, column_default, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'organizations' AND column_name = 'is_qa_sentinel';
-- Expected: 1 row; data_type=boolean; column_default='false'; is_nullable=NO

-- Verification 2: QA orgs are tagged
SELECT id, slug, is_qa_sentinel FROM organizations
  WHERE id IN (
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000002'
  );
-- Expected: both rows return is_qa_sentinel = true

-- Verification 3: no non-QA orgs are unintentionally tagged
SELECT COUNT(*) FROM organizations
  WHERE is_qa_sentinel = true
  AND id NOT IN (
    'ee000000-0000-0000-0000-000000000001',
    'ee000000-0000-0000-0000-000000000002'
  );
-- Expected: 0
```

### 13.3 Logging verification (for Slice 4)

1. After a request blocked by global flag: Pino log contains `"event":"ttp.feature_gate.global_blocked"` with `orgId` and `routePath`
2. After a request blocked by missing override: Pino log contains `"event":"ttp.feature_gate.org_blocked"` with `orgId` and `routePath`
3. After a request passing both layers: Pino log contains `"event":"ttp.feature_gate.allowed"` with `orgId` and `routePath`
4. All 3 gate events contain `requestId` field matching the Fastify request ID

### 13.4 Language governance verification (for Slices 2 and 5)

1. `grep -r 'TTP_DISCLAIMER_TEXT' server/src/ttp/ttp.constants.ts` → returns 1 match
2. All 13 TTP route response objects include `advisory_disclaimer` field in response payload
3. No inline disclaimer string literals exist in TTP route handler files
4. None of the 9 forbidden terms in Section 11.4 appear in TTP route response payloads

---

## Section 14 — No-Go Boundaries

The following are categorically forbidden in any implementation derived from this design.

| Boundary | Prohibition |
|---|---|
| `ttp_enabled` flag | MUST remain `false` until separately authorized by explicit Paresh prompt |
| Schema migrations | NEVER `prisma migrate dev` or `prisma db push` — SQL only via `psql` |
| `npx prisma` | FORBIDDEN — always use `pnpm -C server exec prisma` |
| `.env` modification | FORBIDDEN — no connection string changes |
| `SHADOW_DATABASE_URL` | FORBIDDEN — if Prisma requests it, stop and emit blocker report |
| New tables | This design requires no new tables; any new table requires separate governance review |
| `TenantFeatureOverride` rows in production | No production activation until global flag is separately authorized |
| Removing `org_id` filters | FORBIDDEN — `org_id` isolation is constitutional |
| Auth order violation | `tenantAuthMiddleware` must always run before `ttpFeatureGateMiddleware` |
| Inline disclaimer strings | All TTP disclaimers must use `TTP_DISCLAIMER_TEXT` constant only |
| Forbidden financial language | See Section 11.4 — prohibited in all API responses and UI strings |
| Cross-tenant override queries | Override lookup must be strictly scoped to one `tenantId` per request |
| Unauthenticated TTP routes | No TTP route may bypass auth middleware |
| Uncommitted schema drift | Any `prisma db pull` result must be committed and reviewed before `prisma generate` |

---

## Section 15 — Open Questions / Decisions Required Before Implementation

Six items require explicit Paresh decision before any implementation slice is authorized.

| # | Question | Context | Required decision |
|---|---|---|---|
| OQ-1 | Platform-wide aggregated list routes (`GET /vpc`, `GET /enrollments`): should per-org gate apply? | These routes aggregate across all orgs; per-org gate does not map to a single `orgId` cleanly | Confirm: global gate only is sufficient for aggregated admin list views in Wave 0, OR specify alternative logic |
| OQ-2 | `POST /vpc/generate/:invoiceId`: `orgId` must be resolved from the invoice record before the per-org feature gate can execute — is the N+1 lookup pattern (global flag read + invoice lookup + override read) acceptable? | Invoice → org identity requires a DB read before override lookup | Confirm: N+1 acceptable, OR specify caching/pre-fetch strategy |
| OQ-3 | Pino log level for `ttp.feature_gate.allowed` (every allowed TTP request): will this create unacceptable log volume in production? | Fastify info-level log on every TTP request | Confirm: info level acceptable on all requests, OR limit gate-allowed logs to admin-plane routes only |
| OQ-4 | `TTP_DISCLAIMER_TEXT` language: is the proposed text in Section 11.2 approved for all 13 route responses? | Advisory disclaimer for all TTP API responses | Confirm text as written, OR provide revised disclaimer language |
| OQ-5 | Slice ordering: Slices 1 and 2 have no interdependency. Can they proceed in parallel in a single implementation prompt? | Slice 1 (schema) and Slice 2 (constant) touch different files | Confirm: parallel execution acceptable, OR require strict sequential ordering |
| OQ-6 | `is_qa_sentinel` RLS policy: should QA sentinel orgs be excluded from any production RLS tenant scope clause? | If yes, requires RLS policy clause addition; if no, flag is purely metadata | Confirm: sentinel flag is metadata-only in Wave 0 with no RLS effect, OR specify RLS policy intent |

---

## Section 16 — Final Design Recommendation

**All P0 architecture decisions are resolved:** TQ-01, TQ-08, TQ-09, TQ-10, TQ-20 — confirmed in
`governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md`

**All required source files have been inspected and confirmed:**
- `server/src/middleware/ttpFeatureGate.middleware.ts` — current behaviour confirmed
- `server/prisma/schema.prisma` — `TenantFeatureOverride`, `FeatureFlag`, `organizations` models confirmed
- `server/src/ttp/ttp.constants.ts` — existing constants and absent `TTP_DISCLAIMER_TEXT` confirmed
- All 13 TTP route files — route paths, methods, auth, and middleware confirmed
- `scripts/qa-ttp-seed.sql` — QA org UUIDs and seed scope confirmed

**No implementation has been performed.** `ttp_enabled = false` is unchanged.

This design is ready for Paresh review.

```
SCOPED_ACTIVATION_DESIGN_READY_FOR_PARESH_REVIEW
```

**Before any implementation slice begins, Paresh must:**
1. Review this document in full
2. Answer the 6 open questions in Section 15
3. Issue a separate, explicit implementation prompt for each slice
4. No implementation is authorized by the existence of this document

---

## Section 17 — No-Change Confirmation

The following invariants hold at the time this document was created and must remain unchanged until explicitly authorized by a separate Paresh-approved implementation prompt.

| Invariant | Confirmed state |
|---|---|
| `feature_flags.ttp_enabled` | `false` — UNCHANGED by this task |
| `ttpFeatureGate.middleware.ts` | UNCHANGED — global flag only; no per-org lookup wired |
| `TenantFeatureOverride` rows for `ttp_enabled` | NONE — table is empty for this key |
| `organizations.is_qa_sentinel` column | DOES NOT EXIST — confirmed absent from schema |
| `TTP_DISCLAIMER_TEXT` constant | DOES NOT EXIST — confirmed absent from `ttp.constants.ts` |
| Code changes made by this task | NONE — governance design artifact only |
| Migration files created | NONE — no migration commands run |

---

## Section 18 — Final Decision

```
TTP_SCOPED_ACTIVATION_DESIGN_CREATED
```

| Field | Value |
|---|---|
| Document status | DESIGN COMPLETE — PENDING PARESH REVIEW |
| Implementation status | NOT STARTED — NOT AUTHORIZED |
| `ttp_enabled` status | `false` — UNCHANGED |
| Next action | Paresh reviews document → answers OQ-1 through OQ-6 → authorizes implementation slices individually |

---

*Document: TTP-SCOPED-ACTIVATION-DESIGN-001*
*Governance sprint: TTP Phase 2 Wave 0*
*Authority: PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md*
