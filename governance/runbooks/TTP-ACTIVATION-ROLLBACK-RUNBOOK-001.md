# TTP-ACTIVATION-ROLLBACK-RUNBOOK-001
## TradeTrust Pay — Activation and Rollback Runbook

| Field | Value |
|---|---|
| Document ID | TTP-ACTIVATION-ROLLBACK-RUNBOOK-001 |
| Unit ID | TTP-IMPL-006 |
| Phase | Phase 2, Wave 0 |
| TQ reference | TQ-10 |
| Type | Governance / runbook — **no code, no schema, no migration, no deployment** |
| Authority basis | `governance/TTP-SCOPED-ACTIVATION-DESIGN-001.md` §10 |
| Design decision | `PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` — TQ-10 Option A |
| `ttp_enabled` invariant | **`false` — UNCHANGED throughout this document and its creation** |
| Date | 2026-05-05 |

---

## A. Purpose and Authority

This runbook documents the **manual, operator-executed** procedures for:
1. Activating TradeTrust Pay (TTP) for a pilot organisation
2. Deactivating TTP for a specific organisation
3. Emergency global deactivation of TTP
4. Post-activation verification checklist
5. Post-rollback state audit checklist

**This runbook does NOT authorize any activation.** No activation step may be executed without:
- Explicit Paresh-approved prompt specifying the target org ID
- All pre-conditions in Section D verified and documented
- Full evidence captured per Section I before and after each step

**Decision basis:** TQ-10 Option A — manual runbook, per-org pilot activation, TRANSMITTED VPCs
are an accepted irreversible invariant (see Section F.4).

**All SQL commands in this document are marked `EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL`.
No command in this document has been executed against any environment.**

---

## B. Current Default State

| Dimension | Current Value | Source |
|---|---|---|
| `feature_flags.ttp_enabled` | `false` | Supabase production DB (authoritative) |
| `TenantFeatureOverride` rows for `ttp_enabled` | **None** | Schema confirmed empty for this key |
| All 13 TTP routes | **Returning 503 FEATURE_DISABLED** | Global gate middleware |
| Per-org scoped gate | **Implemented and truth-synced** | `TTP-SCOPED-ACTIVATION-IMPL-001`, commit `b7950b7`, `TRUTH_SYNCED` |
| QA sentinel column | **Exists** | `is_qa_sentinel` column applied (`TTP-QA-SENTINEL-FLAG-IMPL-001`, commit `c6e24eaa`, `TRUTH_SYNCED`). No QA org activated (`ttp_enabled=false`) |

**`ttp_enabled = false` is the production invariant. This runbook does not change it.**

---

## C. Architecture Reference

### Gate semantics (from `governance/TTP-SCOPED-ACTIVATION-DESIGN-001.md` §5)

| Global `ttp_enabled` | Per-org `TenantFeatureOverride` row | Effective access | HTTP response |
|---|---|---|---|
| `false` | Any / missing | BLOCKED | 503 FEATURE_DISABLED |
| `true` | Row exists, `enabled = true` | ALLOWED | Route handler proceeds |
| `true` | Row exists, `enabled = false` | BLOCKED | 503 FEATURE_DISABLED |
| `true` | Row missing | BLOCKED | 503 FEATURE_DISABLED |
| DB error on either layer | N/A | BLOCKED (fail-closed) | 503 FEATURE_DISABLED |
| `true` | Row exists, `enabled = true`, unauthenticated | N/A | 401 (auth fires first) |

### Identity mapping (constitutional)
```
Auth context orgId
  = organizations.id
  = Tenant.id
  = TenantFeatureOverride.tenantId
```

### TTP routes in scope (all 13)

**Tenant-plane (3):**
- `GET /api/tenant/trades/:tradeId/ttp-summary`
- `GET /api/tenant/trades/:tradeId/ttp-enrollment`
- `POST /api/tenant/trades/:tradeId/ttp-enrollment`

**Control-plane (10):**
- `POST /api/control/ttp/eligibility/:orgId`
- `GET /api/control/ttp/eligibility/:orgId`
- `POST /api/control/vpc/generate/:invoiceId`
- `GET /api/control/vpc`
- `GET /api/control/vpc/:vpcId`
- `PATCH /api/control/vpc/:vpcId/transition`
- `GET /api/control/ttp/routing-stubs/:vpcId`
- `GET /api/control/ttp/enrollments`
- `GET /api/control/ttp/enrollments/:tradeId`
- `PATCH /api/control/ttp/enrollments/:tradeId`

### Structured log events (implemented in TTP-IMPL-004, commit `0cc305d`)

| Event key | Trigger |
|---|---|
| `ttp.feature_gate.global_blocked` | Global `ttp_enabled = false` blocks request |
| `ttp.feature_gate.org_blocked` | Per-org override missing or `enabled = false` |
| `ttp.feature_gate.allowed` | Both gate layers pass; request proceeds |
| `ttp.feature_gate.db_error` | DB error during flag lookup; fail-closed triggered |

---

## D. Pre-conditions Before Any Future Activation

**ALL of the following must be true and documented before activation of any org.
This is a gate checklist — each item requires explicit written confirmation.**

### D.1 Wave 0 implementation units

| Unit | Status required | Verified? |
|---|---|---|
| TTP-IMPL-001: QA sentinel flag | `TRUTH_SYNCED` | ✅ (`c6e24eaa`) |
| TTP-IMPL-002: Disclaimer constant | `TRUTH_SYNCED` | ✅ (`42931f7`) |
| TTP-IMPL-003: Production runtime | `TRUTH_SYNCED` | ✅ (`b7950b7`) |
| TTP-IMPL-004: Structured Pino logs | `TRUTH_SYNCED` | ✅ (`0cc305d`) |
| TTP-IMPL-005: Advisory disclaimer responses | `TRUTH_SYNCED` | ✅ (`26c8329`) |
| TTP-IMPL-006: This runbook | `TRUTH_SYNCED` | ✅ (`0c96c7f` / `8f6356e`) |
| TTP-ACTIVATION-MONITORING-IMPL-001 | `TRUTH_SYNCED` | ⬜ |
| `TTP-SCOPED-ACTIVATION-IMPL-001` (per-org gate middleware) | `TRUTH_SYNCED` | ✅ (`b7950b7`) |
| `TTP-QA-SENTINEL-FLAG-IMPL-001` (`is_qa_sentinel` column + QA seed) | `TRUTH_SYNCED` | ✅ (`c6e24eaa`) |

### D.2 Activation authorizations

- [ ] Explicit Paresh-approved prompt specifying: target org UUID, activation reason, rollback criteria
- [ ] Target org UUID confirmed (must not be inferred or assumed)
- [ ] Wave 0: target org must be a QA sentinel org (`is_qa_sentinel = true` confirmed by DB query)
- [ ] Legal / compliance advisory disclaimer text review completed (`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`)
- [ ] No active incidents on `GET /health` or core platform routes

### D.3 Pre-activation state documentation

Before executing any activation SQL:
1. Record `SELECT enabled FROM feature_flags WHERE key = 'ttp_enabled'` output
2. Record `SELECT * FROM tenant_feature_overrides WHERE key = 'ttp_enabled'` output
3. Record VPC count and states for target org:
   ```sql
   -- EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL
   SELECT state, COUNT(*) FROM vpcs WHERE org_id = '<target_org_id>' GROUP BY state;
   ```
4. Confirm `GET /health` → HTTP 200

---

## E. Activation Procedure (EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL)

> ⚠️ **NONE of the commands in this section may be executed without explicit Paresh approval
> in a separate authorized prompt. The presence of this runbook does NOT constitute authorization.**

### E.1 Step 1 — Confirm global flag is `true` (if not, set it first)

> Note: Setting the global flag to `true` is a separate approval gate. Do not perform this
> without a specific prompt authorizing global flag change.

```sql
-- EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL
-- Verify current global flag state:
SELECT key, enabled FROM feature_flags WHERE key = 'ttp_enabled';

-- Only if explicitly approved to set global flag true:
UPDATE feature_flags SET enabled = true WHERE key = 'ttp_enabled';
```

### E.2 Step 2 — Insert per-org override for target org

```sql
-- EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL
-- Replace <target_org_id> with the exact UUID approved in the activation prompt

INSERT INTO tenant_feature_overrides (id, tenant_id, key, enabled)
VALUES (gen_random_uuid(), '<target_org_id>', 'ttp_enabled', true)
ON CONFLICT (tenant_id, key) DO UPDATE SET enabled = true;
```

**Stop immediately if any ERROR or ROLLBACK appears in psql output.**

### E.3 Step 3 — Verify activation

After SQL executes successfully (no ERROR / ROLLBACK):

```sql
-- EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL
-- Verify the override row was created:
SELECT tenant_id, key, enabled
FROM tenant_feature_overrides
WHERE tenant_id = '<target_org_id>' AND key = 'ttp_enabled';
-- Expected: 1 row, enabled = true
```

---

## F. Post-Activation Verification

> All verification steps must be run and output captured before reporting activation success.
> Any unexpected result is a STOP condition — see Section H.

### F.1 Health check

```
GET /health → must return HTTP 200
```

### F.2 Gate behavior verification (authenticated requests)

For QA org credentials (must be a QA sentinel org):

```
GET /api/tenant/trades/:tradeId/ttp-summary
  → Must NOT return 503 FEATURE_DISABLED
  → Must return HTTP 200 with advisory_disclaimer field present
```

```
GET /api/tenant/trades/:tradeId/ttp-enrollment
  → Must NOT return 503 FEATURE_DISABLED
```

### F.3 Gate behavior verification (non-activated org)

For an org that does NOT have a `TenantFeatureOverride` row:

```
GET /api/tenant/trades/:tradeId/ttp-summary (non-activated org credentials)
  → Must return 503 FEATURE_DISABLED
```

### F.4 Gate behavior verification (unauthenticated)

```
GET /api/tenant/trades/:tradeId/ttp-summary (no auth headers)
  → Must return 401 (auth fires before gate)
```

### F.5 Structured log verification

Pino logs must contain the following events after a successful authenticated TTP request for activated org:

| Expected log event | Field | Expected value |
|---|---|---|
| `ttp.feature_gate.allowed` | `event` | `ttp.feature_gate.allowed` |
| `ttp.feature_gate.allowed` | `orgId` | target org UUID |
| `ttp.feature_gate.global_blocked` | (for blocked org) | present for non-activated org |

### F.6 Advisory disclaimer field verification

Response body for `GET /api/tenant/trades/:tradeId/ttp-summary` (activated org):

```json
{
  "advisory_disclaimer": "TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment.",
  ...
}
```

### F.7 TRANSMITTED VPC invariant (accepted)

VPCs that have reached `TRANSMITTED` state cannot be reversed by deactivating TTP.
Record pre-activation VPC state counts per Section D.3 to enable post-incident analysis.

---

## G. Rollback Procedures (EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL)

> ⚠️ Rollback commands must be executed via `psql` using `DATABASE_URL` only.
> Never modify `.env`. Never modify application code during a rollback.

### G.1 Per-org deactivation — soft (preferred)

Preserves the override row for audit. Produces fail-closed 503 on next request.

```sql
-- EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL
UPDATE tenant_feature_overrides
  SET enabled = false
  WHERE tenant_id = '<target_org_id>' AND key = 'ttp_enabled';
```

### G.2 Per-org deactivation — hard (removes row)

```sql
-- EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL
DELETE FROM tenant_feature_overrides
  WHERE tenant_id = '<target_org_id>' AND key = 'ttp_enabled';
```

Both options are semantically equivalent: missing row = `enabled = false` = fail-closed 503.

### G.3 Emergency global deactivation (all orgs simultaneously)

Does not require per-org row changes. Takes effect immediately on the next request to any TTP route.

```sql
-- EXAMPLE ONLY / DO NOT RUN WITHOUT APPROVAL
UPDATE feature_flags
  SET enabled = false
  WHERE key = 'ttp_enabled';
```

Effect: All 13 TTP routes return 503 FEATURE_DISABLED immediately on next request,
regardless of any `TenantFeatureOverride` rows.

### G.4 Post-rollback state audit checklist

After executing any rollback (per-org or global):

- [ ] `SELECT enabled FROM feature_flags WHERE key = 'ttp_enabled'` — record value
- [ ] `SELECT tenant_id, key, enabled FROM tenant_feature_overrides WHERE key = 'ttp_enabled'` — record all rows
- [ ] `GET /health` → must return HTTP 200
- [ ] `GET /api/tenant/trades/:tradeId/ttp-summary` (rolled-back org credentials) → must return 503 FEATURE_DISABLED
- [ ] Pino logs show `ttp.feature_gate.global_blocked` or `ttp.feature_gate.org_blocked` for rolled-back org
- [ ] No unexpected 2xx responses from any TTP route for rolled-back org

---

## H. Stop Conditions

**Stop all activation or rollback actions immediately and escalate if any of the following occur:**

1. psql output contains `ERROR` or `ROLLBACK` during any SQL execution
2. `GET /health` does not return HTTP 200 at any point
3. A TTP route returns an unexpected 2xx for an org that should be blocked
4. A TTP route returns 503 for an org that was successfully activated (and global flag is `true`)
5. `advisory_disclaimer` field is absent from any TTP summary response after activation
6. Pino logs do not contain expected gate events after a request
7. `TenantFeatureOverride` row does not exist after activation INSERT
8. `TenantFeatureOverride` row still shows `enabled = true` after rollback UPDATE
9. Any application error (5xx) on non-TTP routes after activation
10. `TenantFeatureOverride` rows exist for orgs that were not targeted by this activation
11. Auth order violation: unauthenticated request returns non-401 (even after activation)

**When blocked: Output the Blocker Report per `AGENTS.md` §12. Do not guess. Do not retry with alternative SQL.**

---

## I. Evidence Capture Checklist

The following evidence must be captured (redacted where secrets apply) at each stage:

### I.1 Pre-activation evidence
- [ ] `git status --short` — must show no uncommitted runtime file changes
- [ ] `SELECT enabled FROM feature_flags WHERE key = 'ttp_enabled'` output
- [ ] `SELECT tenant_id, key, enabled FROM tenant_feature_overrides WHERE key = 'ttp_enabled'` output
- [ ] VPC state count query output for target org
- [ ] `GET /health` HTTP status

### I.2 Activation evidence
- [ ] Full psql output of activation SQL (no ERROR / ROLLBACK)
- [ ] Verification SELECT output (override row confirmed)
- [ ] `GET /health` HTTP status post-activation
- [ ] TTP summary route response (advisory_disclaimer present, non-503)
- [ ] TTP route 503 for non-activated org (gate still blocks others)
- [ ] TTP route 401 for unauthenticated request
- [ ] Pino log event `ttp.feature_gate.allowed` with correct orgId

### I.3 Rollback evidence
- [ ] Full psql output of rollback SQL (no ERROR / ROLLBACK)
- [ ] Verification SELECT output (override row disabled or deleted)
- [ ] `GET /health` HTTP status post-rollback
- [ ] TTP summary route 503 for rolled-back org
- [ ] Pino log event `ttp.feature_gate.global_blocked` or `ttp.feature_gate.org_blocked`

---

## J. Explicit Non-Authorizations

This runbook:

- **Does NOT activate TTP** for any organisation
- **Does NOT authorize `ttp_enabled = true`** in the global `feature_flags` table
- **Does NOT authorize creation** of any `TenantFeatureOverride` row
- **Does NOT modify** any application code, middleware, service, route, or test
- **Does NOT modify** `server/prisma/schema.prisma` or any migration file
- **Does NOT modify** any `.env` file or environment variable
- **Does NOT constitute** design approval for any future Phase 2 unit
- **Does NOT open** TTP-ACTIVATION-MONITORING-IMPL-001 or any other unit
- **Does NOT trigger** any deployment

**Activation requires a separate, explicit, Paresh-approved prompt naming the target org UUID.**

---

## K. Design References

| Document | Relevance |
|---|---|
| `governance/TTP-SCOPED-ACTIVATION-DESIGN-001.md` | Full scoped activation design (§5, §10 are primary authority) |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` | TQ-10 Option A decision |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SCOPED-ACTIVATION-DESIGN-OPEN-QUESTIONS-001.md` | Open questions acknowledged |
| `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-IMPL-004-STRUCTURED-PINO-LOGS-VERIFIED-001.md` | Log event names (impl `0cc305d`) |
| `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` | Unit tracker (§17, §18) |
| `AGENTS.md` | Governance operating playbook |
| `.github/copilot-instructions.md` | Safe-Write mode, database authority |
