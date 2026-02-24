# G-021 Day 2 — Evidence Report

**Task ID:** G-021-DAY2-SCHEMA-SERVICE  
**Date:** 2026-03-02  
**Doctrine:** v1.4 + Addendum Draft v1  
**Constitutional Review:** APPROVED 2026-02-24 (D-021-A · D-021-B · D-021-C)  
**Commit target:** `feat(g021): maker-checker schema + RLS + immutability + replay safety (Day 2)`

---

## 1. Files Produced

| File | Status | Description |
|---|---|---|
| `server/prisma/migrations/20260302000000_g021_maker_checker_core/migration.sql` | ✅ Created | Full DDL: tables, triggers, RLS, grants, verification |
| `server/prisma/migrations/20260302000000_g021_maker_checker_core/README.md` | ✅ Created | Migration manifest |
| `server/prisma/schema.prisma` | ✅ Amended | `PendingApproval` + `ApprovalSignature` models added (add-only) |
| `server/src/services/makerChecker.types.ts` | ✅ Created | Public API types for all 4 methods |
| `server/src/services/makerChecker.guardrails.ts` | ✅ Created | Pure functions: hash, fingerprint, TTL, expiry |
| `server/src/services/makerChecker.service.ts` | ✅ Created | `MakerCheckerService` class — 4 methods |
| `tests/makerChecker.g021.test.ts` | ✅ Created | 14 test scenarios + 6 guardrail unit tests |

---

## 2. Schema Objects

### 2.1 `public.pending_approvals`

```
Columns (key subset):
  id                        UUID PK DEFAULT gen_random_uuid()
  org_id                    UUID NOT NULL FK→organizations(id) CASCADE
  entity_type               TEXT NOT NULL CHECK IN ('TRADE','ESCROW','CERTIFICATION')
  entity_id                 UUID NOT NULL  [soft ref — no FK until G-017/G-018]
  from_state_key            TEXT NOT NULL
  to_state_key              TEXT NOT NULL
  requested_by_user_id      UUID NULL  ┐ principal exclusivity enforced by CHECK
  requested_by_admin_id     UUID NULL  ┘
  requested_by_actor_type   TEXT NOT NULL CHECK NOT IN ('SYSTEM_AUTOMATION')
  requested_by_role         TEXT NOT NULL
  request_reason            TEXT NOT NULL CHECK(length(trim(.)) > 0)
  status                    TEXT NOT NULL DEFAULT 'REQUESTED' CHECK IN (6 states)
  expires_at                TIMESTAMPTZ NOT NULL
  frozen_payload_hash       TEXT NOT NULL CHECK(length=64)     ← D-021-A
  maker_principal_fingerprint TEXT NOT NULL CHECK(length>0)    ← D-021-C
  frozen_payload            JSONB NOT NULL
  attempt_count             INT NOT NULL DEFAULT 1
  escalation_id             UUID NULL  [soft ref — no FK until G-022]
  ai_triggered              BOOLEAN NOT NULL DEFAULT false
  impersonation_id          UUID NULL
  request_id                TEXT NULL
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
```

### 2.2 `public.approval_signatures` (append-only)

```
Columns:
  id                UUID PK DEFAULT gen_random_uuid()
  approval_id       UUID NOT NULL FK→pending_approvals(id) CASCADE
  org_id            UUID NOT NULL  [denormalized for RLS]
  signer_user_id    UUID NULL  ┐ exclusivity enforced by CHECK
  signer_admin_id   UUID NULL  ┘
  signer_actor_type TEXT NOT NULL CHECK IN ('CHECKER','PLATFORM_ADMIN')
  signer_role       TEXT NOT NULL
  decision          TEXT NOT NULL CHECK IN ('APPROVE','REJECT')
  reason            TEXT NOT NULL CHECK(length(trim(.)) > 0)
  impersonation_id  UUID NULL
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
  -- NOTE: no updated_at — append-only, zero mutable columns
```

---

## 3. D-021 Directive Evidence

### 3.1 D-021-A: Frozen Payload Hash (Replay Integrity)

**DB enforcement:**  
```sql
frozen_payload_hash TEXT NOT NULL,
CONSTRAINT pending_approvals_hash_length CHECK (length(frozen_payload_hash) = 64)
```

**Service enforcement:**  
- `computePayloadHash()` in `makerChecker.guardrails.ts` computes SHA-256 hex (64 chars).
- `recomputePayloadHash()` called in `verifyAndReplay()` before `StateMachineService.transition()`.
- Mismatch → `PAYLOAD_INTEGRITY_VIOLATION` (replay blocked unconditionally).

**Canonical hash input (field order frozen):**
```
entityType | entityId.toLowerCase() | fromStateKey.toUpperCase() | toStateKey.toUpperCase()
| requestedByActorType.toUpperCase() | principalId.toLowerCase()
| requestedByRole.trim() | requestReason.trim()
```
Joined with `|` → SHA-256 → lowercase hex.

**Test coverage:** F-03 (`PAYLOAD_INTEGRITY_VIOLATION` when stored hash differs from recomputed).

---

### 3.2 D-021-B: Active Request Uniqueness (Partial Unique Index)

**DB enforcement:**  
```sql
CREATE UNIQUE INDEX pending_approvals_active_unique
  ON public.pending_approvals (org_id, entity_type, entity_id, from_state_key, to_state_key)
  WHERE status IN ('REQUESTED', 'ESCALATED');
```

Covers both `REQUESTED` and `ESCALATED` — prevents the "ESCALATED frees the slot" gap identified in constitutional review.

**Service enforcement:**  
- P2002 from DB → `{ status: 'ACTIVE_REQUEST_EXISTS', code: 'PRINCIPAL_EXCLUSIVITY_VIOLATION' }`.

**Test coverage:** D-B-01 (P2002 mock → `ACTIVE_REQUEST_EXISTS`), D-B-02 (getPendingQueue returns both statuses).

---

### 3.3 D-021-C: Maker≠Checker Enforcement

**Three enforcement layers:**

| Layer | Location | Mechanism | Bypass requirement |
|---|---|---|---|
| 1 | `MakerCheckerService.signApproval()` | Fingerprint comparison before DB write | Code change |
| 2 | `trg_check_maker_checker_separation` AFTER INSERT | SECURITY DEFINER trigger raises P0002 | postgres role + migration window |
| 3 | RLS UPDATE/DELETE `USING false` | Immutability at policy level | postgres role + migration window |

**DB trigger DDL:**
```sql
CREATE OR REPLACE FUNCTION public.check_maker_checker_separation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_maker_fp  TEXT;
  v_signer_fp TEXT;
BEGIN
  SELECT maker_principal_fingerprint INTO v_maker_fp
    FROM public.pending_approvals WHERE id = NEW.approval_id;
  v_signer_fp := NEW.signer_actor_type || ':' ||
    COALESCE(NEW.signer_user_id::text, NEW.signer_admin_id::text);
  IF v_signer_fp = v_maker_fp THEN
    RAISE EXCEPTION 'MAKER_CHECKER_SAME_PRINCIPAL: signer % matches maker fingerprint on approval %',
      v_signer_fp, NEW.approval_id USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$;
```

**Fingerprint format:** `"{actor_type}:{user_id_or_admin_id}"`  
Example: `"TENANT_USER:eeeeeeee-0000-0000-0000-000000000005"`

**SECURITY DEFINER rationale:** The trigger reads `pending_approvals.maker_principal_fingerprint` 
across any RLS context. In G-022 platform-admin override scenarios, the Checker's `app.org_id` 
may differ from the Maker's org. SECURITY DEFINER ensures the cross-org read succeeds, as the 
trigger is governance infrastructure, not tenant data access.

**Test coverage:** D-C-01 (service L1 blocks before DB write), D-C-02 (P0002 from DB trigger caught and surfaced).

---

## 4. Immutability Enforcement: `approval_signatures`

Three-layer defence:

**Layer 1 — Service:** `MakerCheckerService` exposes no `update` or `delete` method for `approval_signatures`.

**Layer 2 — DB Trigger:**
```sql
CREATE OR REPLACE FUNCTION public.prevent_approval_signature_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'APPROVAL_SIGNATURE_IMMUTABLE: approval_signatures rows are append-only...'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE TRIGGER trg_immutable_approval_signature
  BEFORE UPDATE OR DELETE ON public.approval_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_approval_signature_modification();
```

**Layer 3 — RLS:**
```sql
CREATE POLICY approval_signatures_no_update ON public.approval_signatures
  FOR UPDATE TO texqtic_app USING (false);

CREATE POLICY approval_signatures_no_delete ON public.approval_signatures
  FOR DELETE TO texqtic_app USING (false);
```

**Test coverage:** I-08a, I-08b (document tri-layer invariant pattern).

---

## 5. RLS Policy Summary

### `pending_approvals`

| Operation | Role | Policy |
|---|---|---|
| SELECT | `texqtic_app` | `NULLIF(app.org_id,'') IS NOT NULL AND org_id::text = app.org_id` |
| INSERT | `texqtic_app` | Same with CHECK |
| UPDATE | `texqtic_app` | Same (status field only in practice) |
| DELETE | `texqtic_app` | `USING (false)` — denied |
| SELECT | `texqtic_admin` | `app.is_admin = 'true'` |

### `approval_signatures`

| Operation | Role | Policy |
|---|---|---|
| SELECT | `texqtic_app` | `NULLIF(app.org_id,'') IS NOT NULL AND org_id::text = app.org_id` |
| INSERT | `texqtic_app` | Same with CHECK |
| UPDATE | `texqtic_app` | `USING (false)` — denied (immutability) |
| DELETE | `texqtic_app` | `USING (false)` — denied (immutability) |
| SELECT | `texqtic_admin` | `app.is_admin = 'true'` |

**RLS variable:** `app.org_id` — consistent with G-020 pattern. `app.tenant_id` is NEVER used.  
**FORCE ROW LEVEL SECURITY:** Enabled on both tables — table owner cannot bypass.

---

## 6. `MakerCheckerService` Integration

### Constructor

```typescript
constructor(
  private readonly db: PrismaClient,
  private readonly stateMachine: StateMachineService,
)
```

### Method Signatures

```typescript
createApprovalRequest(input: CreateApprovalRequestInput): Promise<CreateApprovalResult>
signApproval(input: SignApprovalInput): Promise<SignApprovalResult>
verifyAndReplay(input: VerifyAndReplayInput): Promise<VerifyReplayResult>
getPendingQueue(orgId: string): Promise<PendingApprovalRow[]>
```

### Integration with G-020 StateMachineService

`verifyAndReplay()` calls `stateMachine.transition()` with:
- `actorType: 'CHECKER'` (Checker's credentials — not Maker's)
- `reason: "CHECKER_APPROVAL:{approvalId}|{signature.reason}"` (audit chain)
- `requestId: "replay:{approvalId}:{signatureId}"` (idempotency correlation)
- `makerUserId: approval.requestedByUserId` (Maker identity preserved in audit)

---

## 7. Test Coverage Summary

| Test ID | Scenario | Code Under Test |
|---|---|---|
| P-01 | createApprovalRequest → CREATED | Hash + fingerprint computed; DB write |
| D-B-01 | P2002 → ACTIVE_REQUEST_EXISTS | D-021-B service error mapping |
| P-02 | signApproval APPROVE → APPROVED | Signature insert + status update |
| P-03 | signApproval REJECT → REJECTED | Signature insert + status update |
| F-01 | Expired approval → APPROVAL_EXPIRED | TTL check before DB write |
| F-02 | Non-REQUESTED status → APPROVAL_NOT_ACTIVE | Status gate (4 variants) |
| D-C-01 | Maker=Checker service L1 → MAKER_CHECKER_SAME_PRINCIPAL | Fingerprint comparison |
| D-C-02 | DB P0002 → MAKER_CHECKER_SAME_PRINCIPAL | Trigger error mapping |
| P-04 | verifyAndReplay → APPLIED | D-021-A verify + StateMachine call |
| F-03 | Hash mismatch → PAYLOAD_INTEGRITY_VIOLATION | D-021-A enforcement |
| F-04 | Non-APPROVED → APPROVAL_NOT_APPROVED | Status gate (4 variants) |
| F-05 | Expired APPROVED → APPROVAL_EXPIRED | TTL check after status |
| I-08a | approval_signatures UPDATE → P0001 | Immutability invariant doc |
| I-08b | approval_signatures DELETE → P0001 | Immutability invariant doc |
| D-B-02 | getPendingQueue REQUESTED+ESCALATED | Query correctness |
| G-unit-1 | computePayloadHash → 64-char hex | D-021-A |
| G-unit-2 | Hash determinism | D-021-A |
| G-unit-3 | Hash field sensitivity | D-021-A tamper resistance |
| G-unit-4 | Maker fingerprint format | D-021-C |
| G-unit-5 | computeExpiresAt severity 0 → 48h | TTL |
| G-unit-6 | computeExpiresAt severity 4 → 1h | TTL |

---

## 8. Soft References (Deferred FKs)

| Column | Target | Gate |
|---|---|---|
| `pending_approvals.entity_id` | `trades.id` | G-017 |
| `pending_approvals.entity_id` | `escrow_accounts.id` | G-018 |
| `pending_approvals.escalation_id` | `escalation_records.id` | G-022 |

These are intentional soft references. The intent is recorded in the migration SQL header and this evidence doc. No FK is added until the target table exists.

---

## 9. Day 3 Pre-wire (Deferral Register)

| Item | Scope | Gate |
|---|---|---|
| Expiry sweeper (REQUESTED→EXPIRED cron) | G-021 Day 3 | G-023 |
| Column-level immutability trigger on `pending_approvals` (freeze Maker fields) | G-021 Day 3 | — |
| Pagination for `getPendingQueue()` | G-021 Day 3 | — |
| `EscalationService` + `ESCALATED` state transitions | G-022 | — |
| `CERTIFICATION` log table for replay audit | G-023 | — |
| Fastify routes for MC endpoints | Route layer | — |

---

*Evidence doc generated: G-021 Day 2 — constitutional compliance verified.*
