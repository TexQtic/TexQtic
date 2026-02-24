# G-022 — Escalation Levels + Governance Kill Switch
## Design Document v1.2 (Day 2 — Implemented)

**Status:** IMPLEMENTED  
**Day 2 Status:** IMPLEMENTED 2026-02-24  
**Constitutional Review:** APPROVED (2026-02-24). Hardened per directives D-022-A, D-022-B, D-022-C, D-022-D.  
**Created:** 2026-02-24  
**Gate Dependency:** Gate D (Escalation Control) — blocked until this gap is fully implemented.  
**Binds To:** G-020 (State Machine), G-021 (Maker-Checker)  
**Leads Into:** G-023 (Reasoning Hash), G-024 (Sanction Enforcement)

---

## Objective

Design an Escalation + Kill-Switch Governance Layer that:

- Binds to G-020 lifecycle transitions via `requires_escalation` flag
- Binds to G-021 approval replay as a hard prerequisite for override
- Enables controlled PLATFORM_ADMIN override with full audit trail
- Prevents silent override of tenant authority
- Enables severity-tiered response with explicit resolution requirements
- Enables global and org-level freeze without modifying RLS policies

---

## Part 1 — Escalation Model: Severity Levels

Each escalation event is assigned exactly one severity level at creation. Severity may only be **upgraded** (never silently downgraded) unless an explicit audit resolution is recorded.

---

### LEVEL_0 — Informational

**Purpose:** Routine observation. No blocking action. Logged for audit trail completeness.

| Attribute | Value |
|-----------|-------|
| Who can initiate | SYSTEM_AUTOMATION, SERVICE_LAYER |
| Who can resolve | Any authenticated actor (auto-close allowed on resolution condition met) |
| Maker-Checker required | ❌ No |
| Lifecycle transition blocked | ❌ No |
| Platform override allowed | N/A — no override needed |
| Examples | Repeated low-risk state transitions, quota approaching threshold |

---

### LEVEL_1 — Review Required

**Purpose:** Anomaly detected. Transition proceeds but a review record is created. Resolution required within configurable SLA.

| Attribute | Value |
|-----------|-------|
| Who can initiate | SYSTEM_AUTOMATION, SERVICE_LAYER, TENANT_ADMIN |
| Who can resolve | TENANT_ADMIN, PLATFORM_ADMIN |
| Maker-Checker required | ❌ No |
| Lifecycle transition blocked | ❌ No (transition completes; escalation record created alongside) |
| Platform override allowed | ✅ Yes (logged, non-blocking) |
| Examples | AI-triggered transition flagged, unusual approval velocity |

---

### LEVEL_2 — High Risk

**Purpose:** High-risk condition detected. Lifecycle transition is **soft-blocked** at the service layer. Escalation record required before retry.

| Attribute | Value |
|-----------|-------|
| Who can initiate | SYSTEM_AUTOMATION, SERVICE_LAYER, TENANT_ADMIN, PLATFORM_ADMIN |
| Who can resolve | PLATFORM_ADMIN only |
| Maker-Checker required | ✅ Yes — resolution itself requires dual-signature via G-021 |
| Lifecycle transition blocked | ✅ Yes — service layer rejects transition until escalation is RESOLVED |
| Platform override allowed | ✅ Yes — but override must be explicitly logged with reason + signature |
| Examples | Payload hash mismatch on retry, approval near expiry with high-value entity, cross-org boundary probe detected |

---

### LEVEL_3 — Critical Governance

**Purpose:** Potential governance violation. Hard block. Entity is frozen at service layer. PLATFORM_ADMIN + secondary admin must both act.

| Attribute | Value |
|-----------|-------|
| Who can initiate | SERVICE_LAYER, PLATFORM_ADMIN, MANUAL (constitutional authority) |
| Who can resolve | PLATFORM_ADMIN + secondary PLATFORM_ADMIN (dual resolution required) |
| Maker-Checker required | ✅ Yes — two distinct PLATFORM_ADMIN principals must sign resolution |
| Lifecycle transition blocked | ✅ Yes — all transitions on entity frozen |
| Platform override allowed | ⚠️ Partial — override logs exist but resolution must follow full dual-signature path |
| Examples | Maker≠Checker violation detected post-approval, org isolation boundary breach attempt, SYSTEM_AUTOMATION attempted value-bearing transition |

---

### LEVEL_4 — Platform Freeze Candidate

**Purpose:** Systemic risk. PLATFORM_ADMIN may trigger org-level or global freeze. All entity transitions blocked across the flagged scope.

| Attribute | Value |
|-----------|-------|
| Who can initiate | PLATFORM_ADMIN, MANUAL (constitutional authority only) |
| Who can resolve | PLATFORM_ADMIN + explicit platform-level resolution record |
| Maker-Checker required | ✅ Yes — both for initiating freeze and for lifting it |
| Lifecycle transition blocked | ✅ Yes — scope-wide (org-level or global) |
| Platform override allowed | ❌ No override of LEVEL_4 — requires full resolution path |
| Examples | Systemic payload mismatch across multiple orgs, detected automated attack on approval flow, kill-switch activation trigger |

---

## Part 2 — Escalation Record Table (Schema Design — No Implementation)

**Table name:** `escalation_events`

**Design principles:**
- Append-only. No UPDATE or DELETE ever permitted on a row once created.
- Severity may only be upgraded via a new LEVEL_≥N row referencing the original (see D-022-A Severity Upgrade Rule below).
- `status` transitions: `OPEN → RESOLVED` or `OPEN → OVERRIDDEN`. Never reversed silently.
- Separate resolution always requires an explicit resolution row (`resolved_by_principal`, `resolution_reason`, `resolved_at`).

### Proposed Column Set

```
id                       UUID PRIMARY KEY DEFAULT gen_random_uuid()
org_id                   UUID NOT NULL REFERENCES organizations(id)
entity_type              TEXT NOT NULL         -- 'TRADE' | 'ESCROW' | 'APPROVAL' | 'LIFECYCLE_LOG' | 'ORG' | 'GLOBAL'
entity_id                UUID NOT NULL         -- for entity_type='ORG': set to org_id; for 'GLOBAL': set to a sentinel UUID
parent_escalation_id     UUID REFERENCES escalation_events(id)  -- NULL for first-created; set when upgrading severity (D-022-A)
source                   TEXT NOT NULL         -- 'STATE_MACHINE' | 'APPROVAL' | 'MANUAL' | 'SYSTEM'
severity_level           INTEGER NOT NULL      -- 0 | 1 | 2 | 3 | 4
triggered_by_actor_type  TEXT NOT NULL         -- 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'SYSTEM_AUTOMATION' | 'SERVICE_LAYER'
triggered_by_principal   TEXT NOT NULL         -- sub/fingerprint of initiating actor
reason                   TEXT NOT NULL
status                   TEXT NOT NULL DEFAULT 'OPEN'  -- 'OPEN' | 'RESOLVED' | 'OVERRIDDEN'
resolved_by_principal    TEXT                  -- NULL until resolved
resolution_reason        TEXT                  -- NULL until resolved
created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
resolved_at              TIMESTAMPTZ           -- NULL until resolved
```

### Constraints (Design Intent)

```sql
-- Severity must be a valid level
CHECK (severity_level IN (0, 1, 2, 3, 4))

-- Source must be a valid source
CHECK (source IN ('STATE_MACHINE', 'APPROVAL', 'MANUAL', 'SYSTEM'))

-- Status must be a valid terminal or open state
CHECK (status IN ('OPEN', 'RESOLVED', 'OVERRIDDEN'))

-- Entity type must be known
CHECK (entity_type IN ('TRADE', 'ESCROW', 'APPROVAL', 'LIFECYCLE_LOG', 'ORG', 'GLOBAL'))

-- D-022-A: When parent_escalation_id is set, this row's severity_level must strictly exceed the parent's
-- Enforced via trigger (see Severity Upgrade Rule below)

-- RLS: org_id must match app.org_id context for tenant reads
-- Platform admin reads all (same pattern as existing admin_all policies)
```

### D-022-A — Severity Upgrade Rule (Constitutional Directive)

When a higher-severity event is required for the same entity, a **new row** must be inserted. The prior row is **never mutated**. The prior row's logical status is implicitly superseded — it remains readable in the audit trail.

**Upgrade rules (all must be satisfied simultaneously):**

| Rule | Enforcement |
|------|-------------|
| New row must set `parent_escalation_id` to the prior row's `id` | Service layer validation + DB trigger |
| New row `severity_level` must be strictly greater than the parent's `severity_level` | DB trigger on INSERT |
| Prior row must be in `OPEN` status at time of upgrade | Service layer validation before insert |
| Prior row is NOT updated — it remains OPEN in the audit trail as a historical marker | Immutability trigger prevents any UPDATE |
| Downgrade is impossible | No code path may insert a row with `parent_escalation_id` where `severity_level <= parent.severity_level` |

**Trigger intent (design, not implementation):**

```sql
-- On INSERT into escalation_events where parent_escalation_id IS NOT NULL:
-- 1. Fetch parent row severity_level
-- 2. If NEW.severity_level <= parent.severity_level → RAISE EXCEPTION '[E-022-SEVERITY-DOWNGRADE]'
-- 3. If parent.status <> 'OPEN' → RAISE EXCEPTION '[E-022-PARENT-NOT-OPEN]'
-- Prevents: hidden downgrade, escalation overwrite, severity erasure
```

**This guarantees:** The escalation history is a strictly monotonically increasing severity chain. Observers can always reconstruct the full upgrade path by following `parent_escalation_id` links.

### Append-Only Enforcement (Design Intent)

```sql
-- Trigger: prevent UPDATE/DELETE (mirrors G-021 approval_signatures pattern)
CREATE OR REPLACE FUNCTION escalation_events_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'escalation_events are append-only. DELETE is forbidden. [E-022-IMMUTABLE]';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'escalation_events are append-only. UPDATE is forbidden. [E-022-IMMUTABLE]';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Part 3 — Override Protocol

### When PLATFORM_ADMIN May Override

PLATFORM_ADMIN override is **permitted only** when all of the following conditions are simultaneously true:

| Condition | Enforcement Point |
|-----------|-------------------|
| Escalation level ≥ 2 | Service layer: rejects override call if `severity_level < 2` |
| Escalation record exists in OPEN status | Service layer: reads `escalation_events` table before permitting override call |
| Override reason explicitly provided | API validation: `override_reason` field is required (non-null, non-empty) |
| Override principal logged to escalation_events | Service layer: inserts new `OVERRIDDEN` resolution row before acting |
| Override emits audit event | AuditLog insert is part of the same transaction as override action |

### Override Procedure (Sequence)

```
1. PLATFORM_ADMIN calls override endpoint with: entity_id, escalation_event_id, override_reason
2. Service verifies: escalation_event_id exists, status = OPEN, severity_level >= 2
3. Service verifies: Maker-Checker path is not being silently bypassed
   - If the entity has a PENDING approval → override cannot proceed without dual-signature path
4. Service inserts: escalation_events row (status=OVERRIDDEN, resolved_by_principal, resolution_reason)
5. Service inserts: audit_logs entry (action='ESCALATION_OVERRIDE', actor=PLATFORM_ADMIN principal)
6. Service executes: the originally blocked action
7. Response: returns override confirmation with escalation_event_id and audit_log_id
```

### Explicit Override Prohibitions

PLATFORM_ADMIN override is **absolutely forbidden** in the following conditions:

| Prohibition | Reason |
|-------------|--------|
| Frozen payload mismatch | A `PAYLOAD_INTEGRITY_VIOLATION` cannot be overridden — the approval must be rejected and re-initiated |
| Expired approval | Expired `pending_approvals` record must be explicitly cancelled and re-created — no override path exists |
| Cross-tenant scope | PLATFORM_ADMIN may never act on behalf of an org using another org's escalation context |
| LEVEL_4 via override path | LEVEL_4 freezes require full resolution path — no single-actor override permitted |
| Maker≠Checker bypass | Override cannot cause a single actor to appear as both maker and checker on the same approval |

### D-022-D — Override + Maker-Checker Interaction Lock (Constitutional Directive)

If a transition **originally required Maker-Checker** (i.e., the entity has or had a `pending_approvals` record in any terminal or active state), PLATFORM_ADMIN override **must** follow one of exactly two paths. There is no third path.

**Path A — Complete the Dual-Signature Path:**
The override supplies two distinct PLATFORM_ADMIN principals (maker + checker), satisfying the G-021 Maker≠Checker constraint via the standard `MakerCheckerService.signApproval` flow. The approval is resolved before the transition executes.

**Path B — Override Record Path:**
If the approval cannot be completed (e.g., original maker is unavailable, approval expired), PLATFORM_ADMIN may create a replacement escalation override record that: (a) explicitly cancels the prior approval request, and (b) records the override with a separate `escalation_events` row (status=`OVERRIDDEN`) before any transition fires.

**In both paths, the following records must exist in the same transaction before `StateMachineService.transition()` is called:**

| Required Record | Field |
|----------------|-------|
| `escalation_events` row with `status = OVERRIDDEN` | `resolved_by_principal = PLATFORM_ADMIN sub` |
| `audit_logs` entry | `action = 'ESCALATION_OVERRIDE'`, `actor_type = 'PLATFORM_ADMIN'` |

**Absolute prohibition:**
> PLATFORM_ADMIN may NOT directly call `StateMachineService.transition()` on an entity that had a Maker-Checker requirement without both the escalation resolution record and the audit entry present in the same DB transaction. Absence of either record → service layer must abort with `[E-022-OVERRIDE-INCOMPLETE]`.

---

## Part 4 — Kill Switch Model

Three distinct layers exist. Layers are independent and additive. Each is reversible via explicit resolution.

---

### Layer 1 — Global Kill Switch (Existing: `config.KILL_SWITCH_ALL`)

**Existing mechanism** — already present in the TexQtic config layer.

| Attribute | Value |
|-----------|-------|
| Scope | All tenants, all entities, all transitions |
| Activation actor | PLATFORM_ADMIN (config-level write, explicit API call only) |
| RLS impact | ❌ None — RLS is not modified |
| Mechanism | Service layer reads `config.KILL_SWITCH_ALL` before any transition; rejects if `true` |
| Audit record | Emit `audit_logs` entry + `escalation_events` row (`entity_type='GLOBAL'`) on activation and deactivation |
| Reversibility | Set `config.KILL_SWITCH_ALL = false` + `audit_logs` entry + `escalation_events` RESOLVED row |
| Escalation binding | **See D-022-C below — LEVEL_4 does NOT toggle the kill switch.** |

### D-022-C — Global Kill Switch Escalation Binding (Constitutional Directive)

**Rule: LEVEL_4 escalation creation does NOT toggle `config.KILL_SWITCH_ALL`. Ever.**

The relationship is strictly one-directional and recommendation-only:

```
LEVEL_4 escalation created
  ↓
  Service layer sets: escalation_event.freeze_recommendation = true   ← informational flag only
  Service layer does NOT touch: config.KILL_SWITCH_ALL
  ↓
  PLATFORM_ADMIN sees freeze recommendation in monitoring surface
  ↓
  PLATFORM_ADMIN makes explicit API call to toggle kill switch
  ↓
  Service layer executes (in same transaction):
    - config.KILL_SWITCH_ALL = true
    - INSERT escalation_events (entity_type='GLOBAL', severity_level=4, source='MANUAL')
    - INSERT audit_logs (action='KILL_SWITCH_ACTIVATED', actor_type='PLATFORM_ADMIN')
```

**Explicit prohibitions (D-022-C):**

| Prohibition |
|-------------|
| LEVEL_4 creation must NOT auto-set `KILL_SWITCH_ALL = true` |
| No background job or SYSTEM_AUTOMATION may toggle `KILL_SWITCH_ALL` |
| The `freeze_recommendation` flag is informational only — it has zero automated side effects |
| Kill-switch lift requires: explicit PLATFORM_ADMIN call + `audit_logs` entry + `escalation_events` RESOLVED row |

**Column addition to schema (D-022-C):**
```
freeze_recommendation    BOOLEAN NOT NULL DEFAULT false  -- informational flag; no automated side effects
```
This column is set `true` only on `entity_type='GLOBAL'` LEVEL_4 rows, and only by the EscalationService when creating the event. It is never read by any automated system to trigger an action.

---

### Layer 2 — Org-Level Freeze

**New mechanism** — to be implemented in G-022.

**D-022-B — Storage Decision (Constitutional, Locked):**
Org-level freeze is stored exclusively in `escalation_events`. The `organizations` table is NOT modified. No boolean column is added to any canonical table. This decision is final.

| Attribute | Value |
|-----------|-------|
| Scope | All entities and transitions within a specific `org_id` |
| Activation actor | PLATFORM_ADMIN |
| RLS impact | ❌ None — RLS is not modified |
| Mechanism | Service layer queries `escalation_events` for an OPEN row with `entity_type='ORG'`, `entity_id=org_id`, `severity_level >= 3` before any transition for that org |
| Storage | `escalation_events` row: `entity_type='ORG'`, `entity_id=org_id`, `severity_level=3` (or 4), `status='OPEN'` |
| Audit record | The `escalation_events` row itself is the audit record. `audit_logs` entry also emitted on activation. |
| Reversibility | PLATFORM_ADMIN resolves the escalation event (`status → RESOLVED`) + `audit_logs` entry. No other table modified. |
| G-021 binding | If org has PENDING approvals at freeze time, those approvals are suspended (not cancelled) — `MakerCheckerService.verifyAndReplay` will reject via `checkOrgFreeze` pre-condition — resume on unfreeze |

**Why `escalation_events` (not `organizations` table):**
- Keeps freeze logic uniform with entity-level freeze (Layer 3) — single query pattern for all freeze checks
- No new boolean columns on canonical tables (prevents schema mutation creep)
- Full audit lineage: who froze, when, why, who resolved — all in the append-only record
- Reversibility is self-documenting: RESOLVED row marks the unfreeze event

**Freeze check (service layer, pseudo-code):**
```typescript
// D-022-B: Org freeze is always read from escalation_events — not from organizations table
const orgFreeze = await prisma.escalationEvent.findFirst({
  where: {
    entity_type: 'ORG',
    entity_id: orgId,
    status: 'OPEN',
    severity_level: { gte: 3 },
  },
});
if (orgFreeze) {
  throw new GovError('ORG_FROZEN', `Org ${orgId} is frozen [escalation: ${orgFreeze.id}]. No transitions permitted. [E-022-ORG-FREEZE]`);
}
```

---

### Layer 3 — Entity-Level Freeze

**New mechanism** — to be implemented in G-022.

| Attribute | Value |
|-----------|-------|
| Scope | A single entity (trade, escrow, approval) identified by `entity_type` + `entity_id` |
| Activation actor | PLATFORM_ADMIN or LEVEL_3/4 escalation auto-trigger |
| RLS impact | ❌ None — RLS is not modified |
| Mechanism | `escalation_events` table row with `status=OPEN` and `severity_level >= 3` acts as the freeze marker. Service layer checks for OPEN LEVEL_3/4 escalation before permitting transition. |
| Audit record | `escalation_events` row itself is the audit record |
| Reversibility | Explicit resolution: PLATFORM_ADMIN resolves the escalation event (RESOLVED or OVERRIDDEN via override protocol) |
| G-020 binding | `requires_escalation = true` in `allowed_transitions` triggers entity-level freeze check before transition is permitted |

**Proposed entity freeze check (service layer, pseudo-code):**
```typescript
const openCriticalEscalation = await prisma.escalationEvent.findFirst({
  where: {
    entity_type: entityType,
    entity_id: entityId,
    status: 'OPEN',
    severity_level: { gte: 3 },
  },
});
if (openCriticalEscalation) {
  throw new GovError('ENTITY_FROZEN', `Entity has an open critical escalation [${openCriticalEscalation.id}]. Resolve before proceeding. [E-022-ENTITY-FREEZE]`);
}
```

---

## Part 5 — Integration Contracts

### G-020 Integration (State Machine)

```
allowed_transitions.requires_escalation = true
↓
StateMachineService checks: open LEVEL_3/4 escalation exists for entity?
  - YES → reject transition, return escalation_event_id
  - NO  → permit transition, but emit LEVEL_0/1 escalation record if configured
```

**Key contract:**
- `requires_escalation` flag in `allowed_transitions` is the trigger condition.
- StateMachineService must call `EscalationService.checkEntityFreeze(entityType, entityId)` before executing any transition on a flagged route.
- Escalation check is pre-condition, not post-action.

---

### G-021 Integration (Maker-Checker Approval)

```
MakerCheckerService.verifyAndReplay()
↓
Before replay: EscalationService.checkEntityFreeze(entityType, entityId)
  - OPEN LEVEL_3/4 → reject replay, return escalation_event_id
  - OVERRIDDEN (override protocol passed) → allow replay with override reference in audit log
```

**Key contract:**
- Replay cannot proceed on a frozen entity — overlay with G-021 `verifyAndReplay` pre-condition.
- Override path (Part 3) is the only permitted exception, and it requires dual-signature for LEVEL_3+.
- `aiTriggered = false` enforcement from G-021 is **extended**: AI cannot trigger escalation resolution at any level.

---

### G-023 Integration (Reasoning Hash — Future)

```
escalation_events ← reasoning_logs (future join)
  - escalation_event_id referenced in reasoning_log entry
  - reasoning_hash computed at escalation creation (immutable)
  - AI-suggested escalation actions: logged to reasoning_logs, NOT auto-executed
```

**Design intent:** G-023 `reasoning_logs` will have a nullable `escalation_event_id` FK. Any AI-proposed escalation action must appear in a reasoning log before a human can act on it. AI cannot directly mutate `escalation_events`.

---

### G-024 Integration (Sanction Enforcement — Future)

```
escalation_events ← sanction_checks (future join)
  - LEVEL_4 escalation can trigger sanction_check initiation
  - Sanction result must be stored before LEVEL_4 can be resolved
  - Sanction enforcement is always human-gated (no AI auto-resolution)
```

---

## Part 6 — Anti-Drift Guarantees

The following constraints are **explicit and non-negotiable** for all G-022 implementation phases:

| Guarantee | Enforcement |
|-----------|-------------|
| Escalation cannot mutate financial values | `escalation_events` has no financial columns. The service layer must never modify monetary fields as part of escalation processing. |
| Escalation cannot auto-close an approval | `pending_approvals.status` may only be mutated by `MakerCheckerService`. Escalation service has no write access to `pending_approvals`. |
| Escalation cannot bypass org isolation | All `escalation_events` reads/writes must include `org_id` predicate. Cross-org escalation event reads are forbidden at service layer. |
| Escalation cannot downgrade severity without audit | Severity column is immutable once written. Severity "downgrade" can only be achieved by inserting a new `RESOLVED` row (which records who resolved and why) — never by updating `severity_level`. |
| Escalation cannot auto-execute override | Override requires explicit PLATFORM_ADMIN API call + reason + escalation_event_id. Zero auto-override paths exist. |
| Escalation cannot grant AI transition authority | `triggered_by_actor_type = 'SYSTEM_AUTOMATION'` is permitted only for LEVEL_0/LEVEL_1 informational events. AI may never initiate LEVEL_2+ escalation or resolution. |
| Kill switch lift requires explicit audit | No kill switch (Layer 1/2/3) may be lifted without a corresponding `audit_logs` entry and (for Layer 2/3) an `escalation_events` resolution row. |

---

## Acceptance Criteria Checklist (v1.1)

- [x] Escalation levels defined (LEVEL_0 through LEVEL_4) with initiator/resolver/blocker/override matrix
- [x] `escalation_events` record schema designed with all required columns, constraints, and append-only trigger intent
- [x] **D-022-A** — Severity upgrade rule formalized: `parent_escalation_id` column added, strict monotonic upgrade constraint, trigger design documented, downgrade absolutely prohibited
- [x] Override protocol defined: conditions, procedure sequence, and explicit prohibitions
- [x] **D-022-D** — Override + Maker-Checker interaction locked: two permitted paths only, both require escalation resolution + audit entry in same transaction before `StateMachineService.transition()` call
- [x] Kill-switch layers defined: Layer 1 (global), Layer 2 (org), Layer 3 (entity) — each with RLS non-impact guarantee, audit requirement, and reversibility path
- [x] **D-022-B** — Org freeze storage model locked: `escalation_events` with `entity_type='ORG'` — no modification to `organizations` table, no new boolean columns on canonical tables
- [x] **D-022-C** — Global kill switch binding clarified: LEVEL_4 does NOT auto-toggle `KILL_SWITCH_ALL`; produces `freeze_recommendation=true` flag only; kill switch toggle requires explicit PLATFORM_ADMIN call + escalation record + audit log
- [x] Integration with G-020 (`requires_escalation` check) explicitly contracted
- [x] Integration with G-021 (`verifyAndReplay` pre-condition) explicitly contracted
- [x] Integration hooks for G-023 and G-024 (future) documented
- [x] Anti-drift guarantees explicitly stated (7 categories, all non-negotiable)

---

## Next Steps (Day 2 — Subject to Prompt Allowlist)

1. SQL migration: `escalation_events` table (including `parent_escalation_id`, `freeze_recommendation`), constraints, indexes, immutability trigger, severity upgrade trigger
2. RLS policies: `escalation_events_tenant_select` (org_id match), `escalation_events_admin_all`
3. `EscalationService`: `createEscalation`, `upgradeEscalation`, `resolveEscalation`, `overrideEscalation`, `checkEntityFreeze`, `checkOrgFreeze`
4. Integration patch: `StateMachineService` pre-condition hook (`checkEntityFreeze` + `checkOrgFreeze`)
5. Integration patch: `MakerCheckerService.verifyAndReplay` pre-condition hook (`checkEntityFreeze` + `checkOrgFreeze`)
6. (D-022-D) Override path enforcement: `overrideWithMakerCheckerInteraction` service method — writes escalation resolution + audit_log in same transaction before transition
7. Tests: escalation creation, severity upgrade chain, freeze enforcement (entity + org), override protocol (Path A + Path B), D-022-C kill switch non-propagation, anti-drift assertions

**G-022 v1.1 constitutional hardening complete. Authorized for Day 2 implementation.**
