# G-023 — Reasoning Hash + Reasoning Logs FK for AI Audit Events
## Task ID: G-023-REASONING-LOGS

**Status:** COMPLETE  
**Date:** 2026-02-25  
**Gate:** Gate E.5 (AI Audit Integrity)  
**Commits:**
- `48a7fd3` — `feat(db): add reasoning_logs + audit_logs FK (G-023)`
- `2f432ad` — `feat(ai): emit reasoning_log + link audit events (G-023)`

---

## 1. Objective

Extend the AI audit trail with a cryptographic reasoning hash:
1. Create `reasoning_logs` table (append-only, tenant-scoped RLS ENABLE+FORCE).
2. Add `audit_logs.reasoning_log_id` (nullable FK → `reasoning_logs.id`).
3. Wire AI routes to emit a `reasoning_log` row (SHA-256 hash of prompt+response) and link it to the corresponding `audit_log` row in the same Prisma transaction.
4. Integration tests proving tenant isolation, FK presence, fail-closed behaviour, and immutability.

---

## 2. File Manifest

### New Files

| File | Purpose |
|---|---|
| `server/prisma/migrations/20260305000000_g023_reasoning_logs/migration.sql` | DDL + RLS + trigger + verification |
| `server/src/__tests__/gate-g023-reasoning-logs.integration.test.ts` | 6-test integration suite (RL-01..RL-05) |
| `docs/governance/G-023_REASONING_LOGS_EVIDENCE.md` | This file |

### Modified Files

| File | Change |
|---|---|
| `server/prisma/schema.prisma` | Add `ReasoningLog` model + `reasoningLogId` FK on `AuditLog` + `reasoningLogs` relation on `Tenant` |
| `server/src/utils/audit.ts` | Add `AiReasoningAuditData` type + `buildAiInsightsReasoningAudit()` + `buildAiNegotiationReasoningAudit()` factories |
| `server/src/routes/ai.ts` | Compute SHA-256 reasoning hash, insert `reasoning_log`, write `audit_log` with FK (same tx) |
| `governance/wave-execution-log.md` | Append G-023 entry |

---

## 3. Database Schema — `reasoning_logs`

```sql
CREATE TABLE public.reasoning_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  request_id       TEXT        NOT NULL,
  reasoning_hash   TEXT        NOT NULL,  -- SHA-256 hex of prompt || response
  model            TEXT        NOT NULL,
  prompt_summary   TEXT,                  -- First 200 chars (truncated)
  response_summary TEXT,                  -- First 200 chars (truncated)
  tokens_used      INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `audit_logs` extension

```sql
ALTER TABLE public.audit_logs
  ADD COLUMN reasoning_log_id UUID REFERENCES public.reasoning_logs(id) ON DELETE SET NULL;
```

---

## 4. RLS Policies — `reasoning_logs`

| Policy | Type | Command | Condition |
|---|---|---|---|
| `reasoning_logs_guard` | RESTRICTIVE | ALL | `app.require_org_context() OR app.bypass_enabled()` |
| `reasoning_logs_tenant_select` | PERMISSIVE | SELECT | `tenant_id = app.current_org_id() OR app.bypass_enabled()` |
| `reasoning_logs_tenant_insert` | PERMISSIVE | INSERT | `app.require_org_context() AND tenant_id = app.current_org_id() OR app.bypass_enabled()` |

**ENABLE ROW LEVEL SECURITY:** ✅  
**FORCE ROW LEVEL SECURITY:** ✅  
**No UPDATE/DELETE policies:** consistent with append-only design.

---

## 5. Immutability Trigger

```sql
-- Blocks all UPDATE and DELETE except bypass-context DELETE (for test seed cleanup).
-- TG_OP = 'DELETE' AND bypass_rls = 'on' → RETURN OLD (allow)
-- All other cases → RAISE EXCEPTION '[E-023-IMMUTABLE]'
CREATE TRIGGER trg_reasoning_logs_immutability
  BEFORE UPDATE OR DELETE ON public.reasoning_logs
  FOR EACH ROW EXECUTE FUNCTION public.reasoning_logs_immutability();
```

**Defence-in-depth:**
- UPDATE is always blocked (including bypass context).
- DELETE is blocked in production (bypass_rls always 'off').
- DELETE in test seed context (bypass_rls='on') is permitted for test cleanup.

---

## 6. Application Wiring — `ai.ts` Pattern

Inside each AI route's Prisma transaction (same tx as budget + audit):

```typescript
// 1. Compute reasoning hash
const reasoningHash = createHash('sha256').update(prompt + responseText).digest('hex');

// 2. Insert reasoning_log (tenant-scoped, append-only)
const reasoningLog = await tx.reasoningLog.create({
  data: {
    tenantId: contextTenantId,
    requestId,
    reasoningHash,
    model,
    promptSummary: prompt.slice(0, 200),
    responseSummary: responseText.slice(0, 200),
    tokensUsed,
  },
});

// 3. Write audit_log with reasoningLogId FK (same tx — atomic)
await tx.auditLog.create({
  data: {
    ...buildAiInsightsReasoningAudit({ ..., reasoningLogId: reasoningLog.id }),
  },
});
```

**Atomicity:** Both `reasoning_log` and `audit_log` are written in the same Prisma transaction. If either fails, neither commits.

---

## 7. Audit Factory Pattern — `audit.ts`

New `AiReasoningAuditData` type and factories used in `ai.ts`:

```typescript
// Server-side factory (does NOT call writeAuditLog — caller uses tx.auditLog.create directly)
export function buildAiInsightsReasoningAudit(params: AiInsightsReasoningAuditParams): AiReasoningAuditData
export function buildAiNegotiationReasoningAudit(params: AiNegotiationReasoningAuditParams): AiReasoningAuditData
```

`writeAuditLog` from `auditLog.ts` is bypassed for AI routes in G-023 because it pre-dates the `reasoningLogId` field and is outside the G-023 allowlist. The `metadataJson` also includes `reasoningLogId` for redundant traceability.

---

## 8. Integration Test Coverage — `gate-g023-reasoning-logs.integration.test.ts`

| Test | Scenario | Assertion |
|---|---|---|
| RL-01 | Tenant A queries reasoning_logs | Sees only tenant A rows (tenantBId row invisible) |
| RL-01b | Tenant B queries reasoning_logs | Sees only tenant B rows (tenantAId row invisible) |
| RL-02 | audit_log created with reasoningLogId | `auditRow.reasoningLogId === seedReasoningLogAId` |
| RL-03 | No tenant context (org_id empty) | Returns zero rows (RLS fail-closed) |
| RL-04 | Tenant A context queries tenant B row by id | Returns null (invisible, not error) |
| RL-05 | UPDATE via bypass context | `rejects.toThrow('[E-023-IMMUTABLE]')` — UPDATE always blocked |

**All 6 tests: PASS (exit code 0)**

---

## 9. Verification Evidence

### Migration Apply

```
BEGIN
CREATE TABLE
ALTER TABLE
CREATE INDEX (x4)
ALTER TABLE (ENABLE + FORCE RLS)
CREATE FUNCTION
CREATE TRIGGER
CREATE POLICY (x3, guard + select + insert)
GRANT
DO
NOTICE: G-023 PASS: reasoning_logs created — RLS: t, FORCE: t, guard: 1, SELECT: 1, INSERT: 1, trigger: 1, audit_logs.reasoning_log_id: t
COMMIT
```

### TypeScript

```
pnpm exec tsc --noEmit → exit 0
```

### Tests

```
gate-g023: 6 passed (6) | exit 0
gate-e-4-audit: 6 passed (6) | exit 0  ← regression confirmed
```

---

## 10. Compliance Checklist

| Requirement | Status | Evidence |
|---|---|---|
| `reasoning_logs` table created | ✅ PASS | Migration §1, NOTICE output |
| `audit_logs.reasoning_log_id` FK added | ✅ PASS | Migration §2, NOTICE output |
| RLS ENABLE + FORCE on `reasoning_logs` | ✅ PASS | Migration §4, verification block |
| RESTRICTIVE guard (fail-closed) | ✅ PASS | `reasoning_logs_guard` in §6 |
| Tenant SELECT isolation | ✅ PASS | `reasoning_logs_tenant_select`, RL-01/RL-01b |
| Immutability trigger installed | ✅ PASS | `trg_reasoning_logs_immutability`, RL-05 |
| SHA-256 reasoning hash computed | ✅ PASS | `createHash('sha256').update(prompt+response)` in ai.ts |
| reasoning_log + audit_log atomic write | ✅ PASS | Same Prisma tx in ai.ts |
| Fail-closed (no context → zero rows) | ✅ PASS | RL-03 |
| Cross-tenant isolation | ✅ PASS | RL-01, RL-01b, RL-04 |
| tsc --noEmit clean | ✅ PASS | Exit 0 |
| gate-e-4-audit regression | ✅ PASS | 6/6 after G-023 changes |
| No schema.prisma changes beyond Prisma build requirement | ✅ PASS | Only ReasoningLog model + FK field added |
| No changes to non-AI routes | ✅ PASS | Only ai.ts modified in routes/ |
| No RLS bypass shortcuts added | ✅ PASS | No bypass_enabled() shortcut added; trigger bypass is bypass-context-only for DELETE |
