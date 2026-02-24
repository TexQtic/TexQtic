# G-020 — Lifecycle State Machine Design
## TexQtic Governance-Grade Trade Lifecycle Framework

| Field        | Value                                                                                     |
|--------------|-------------------------------------------------------------------------------------------|
| **ID**       | G-020                                                                                     |
| **Date**     | 2026-02-24                                                                                |
| **Status**   | DESIGN PHASE — No schema changes committed                                                |
| **Author**   | Architecture Review (Safe-Write Mode)                                                     |
| **Scope**    | trade_state · escrow_state · certification_state · future extensibility                   |
| **Links**    | G-021 (Maker-Checker) · G-022 (Escalation Engine) · Doctrine v1.4 · G-015 organizations  |

> **HARD RULE:** This document is design-only. Nothing herein constitutes a migration instruction, schema change, trigger implementation, or service modification. All SQL column definitions are notational — not executable DDL. Day 2 implementation is gated on constitutional review of this document.

---

## 1. Lifecycle Domains

### 1.1 Design Principles Governing All Domains

Before enumerating states, the following constitutional constraints apply to every state domain:

1. **No implicit transitions.** Every state change must traverse a declared row in `allowed_transitions`. Undeclared transitions are rejected at enforcement boundary.
2. **No shortcut states.** Trade cannot move DRAFT → ORDER_CONFIRMED. Governance stages cannot be bypassed by role or admin override without an explicit escalation record.
3. **Irreversibility is permanent.** Once a state is marked `is_irreversible = true` in `state_definitions`, no service call, trigger, or admin action may reverse it — except via a Maker-Checker escalation override, which itself is fully logged before it executes.
4. **Org-scoped always.** Every state transition belongs to exactly one `org_id`. Cross-tenant transitions are constitutionally prohibited. See §8.
5. **Terminal states block further transitions.** An entity in a terminal state has no outbound edges in `allowed_transitions`. Any attempt to transition from a terminal state must fail with a documented refusal code, not a silent no-op.
6. **Audit is mandatory.** No transition silently succeeds. Every recorded transition emits a corresponding audit event (see §6).

---

### 1.2 Domain 1 — `trade_state`

**Scope:** Applies to the `trades` entity. Governs the full lifecycle from a trade's inception through settlement and closure.

#### 1.2.1 State Registry

| State Key               | Label                      | Terminal | Irreversible | Severity | Maker-Checker Required | Notes                                                                 |
|-------------------------|----------------------------|----------|--------------|----------|------------------------|-----------------------------------------------------------------------|
| `DRAFT`                 | Draft                      | No       | No           | 0        | No                     | Entry point. Mutable. No counterparty commitment yet.                 |
| `RFQ_SENT`              | RFQ Sent                   | No       | No           | 1        | No                     | Request For Quote issued to counterparty. Awaiting response.          |
| `NEGOTIATION`           | In Negotiation             | No       | No           | 1        | No                     | Active counter-offer or revision exchange.                            |
| `PENDING_COMPLIANCE`    | Pending Compliance Review  | No       | No           | 2        | Yes                    | Trade routed to compliance gate. Blocks forward progress.             |
| `APPROVED`              | Compliance Approved        | No       | No           | 2        | Yes                    | Compliance gate cleared by authorised reviewer.                       |
| `REJECTED`              | Rejected                   | Yes      | Yes          | 3        | No                     | Terminal. Compliance or counterparty refusal. Cannot be reversed.     |
| `ORDER_CONFIRMED`       | Order Confirmed            | No       | Yes          | 2        | Yes                    | Mutual commitment recorded. Irreversible. Triggers fulfilment chain.  |
| `FULFILLMENT`           | In Fulfilment              | No       | Yes          | 2        | No                     | Goods/services in transit or delivery phase.                          |
| `SETTLEMENT_PENDING`    | Settlement Pending         | No       | Yes          | 3        | Yes                    | Fulfilment complete; settlement record awaited.                       |
| `SETTLEMENT_ACKNOWLEDGED` | Settlement Acknowledged  | No       | Yes          | 3        | Yes                    | Settlement record confirmed by both parties.                          |
| `CLOSED`                | Closed                     | Yes      | Yes          | 0        | No                     | Terminal. Clean resolution. All obligations fulfilled.                |
| `CANCELLED`             | Cancelled                  | Yes      | Yes          | 2        | Yes                    | Terminal. Requires Maker-Checker if post-ORDER_CONFIRMED cancellation.|
| `DISPUTED`              | Disputed                   | No       | No           | 3        | No                     | Active dispute. Blocks progression. Requires resolution to continue.  |
| `ESCALATED`             | Escalated to Platform      | No       | No           | 4        | No                     | Platform-level intervention triggered. Highest severity in-flight state.|

#### 1.2.2 Transition Map

> Read as: `FROM → TO` is permitted under stated conditions.

```
DRAFT              → RFQ_SENT              [auto | actor: OWNER/ADMIN]
DRAFT              → CANCELLED             [manual | actor: OWNER]
RFQ_SENT           → NEGOTIATION           [counterparty response received]
RFQ_SENT           → REJECTED              [counterparty declines]
RFQ_SENT           → CANCELLED             [actor: OWNER before counterparty responds]
NEGOTIATION        → PENDING_COMPLIANCE    [agreement reached; compliance gate required]
NEGOTIATION        → REJECTED              [negotiation breakdown]
NEGOTIATION        → CANCELLED             [actor: OWNER/ADMIN with reason]
PENDING_COMPLIANCE → APPROVED              [maker-checker: compliance APPROVED]
PENDING_COMPLIANCE → REJECTED              [maker-checker: compliance REJECTED]
PENDING_COMPLIANCE → ESCALATED             [timeout or reviewer escalation]
APPROVED           → ORDER_CONFIRMED       [maker-checker: both parties confirm]
APPROVED           → CANCELLED             [pre-confirmation withdrawal; maker-checker]
ORDER_CONFIRMED    → FULFILLMENT           [logistics/delivery initiated]
ORDER_CONFIRMED    → DISPUTED              [dispute raised post-confirmation]
ORDER_CONFIRMED    → CANCELLED             [exceptional; maker-checker MANDATORY]
FULFILLMENT        → SETTLEMENT_PENDING    [delivery confirmed]
FULFILLMENT        → DISPUTED             [dispute during delivery]
FULFILLMENT        → ESCALATED            [unresolvable delivery failure]
SETTLEMENT_PENDING → SETTLEMENT_ACKNOWLEDGED [maker-checker: settlement accepted]
SETTLEMENT_PENDING → DISPUTED             [payment dispute raised]
SETTLEMENT_PENDING → ESCALATED            [timeout; unresolvable]
SETTLEMENT_ACKNOWLEDGED → CLOSED          [all obligations fulfilled; terminal]
DISPUTED           → NEGOTIATION          [parties resolve; re-enter negotiation]
DISPUTED           → ESCALATED            [cannot self-resolve]
DISPUTED           → CANCELLED            [mutual cancellation post-dispute; maker-checker]
ESCALATED          → CLOSED              [platform resolves; terminal by SuperAdmin action]
ESCALATED          → CANCELLED           [platform-forced cancellation; maker-checker]
ESCALATED          → REJECTED            [platform rejects trade; maker-checker]
```

**Prohibited shortcut transitions (explicitly enumerated):**

| Shortcut Attempt                          | Refusal Code                     |
|-------------------------------------------|----------------------------------|
| `DRAFT → ORDER_CONFIRMED`                 | `TRANSITION_NO_COMPLIANCE_GATE`  |
| `DRAFT → CLOSED`                          | `TRANSITION_SKIPS_LIFECYCLE`     |
| `APPROVED → CLOSED`                       | `TRANSITION_SKIPS_FULFILLMENT`   |
| `FULFILLMENT → CLOSED`                    | `TRANSITION_SKIPS_SETTLEMENT`    |
| Any state → any from a TERMINAL state     | `TRANSITION_FROM_TERMINAL`       |
| `CLOSED → *`                              | `TRANSITION_FROM_TERMINAL`       |
| `CANCELLED → *`                           | `TRANSITION_FROM_TERMINAL`       |
| `REJECTED → *`                            | `TRANSITION_FROM_TERMINAL`       |

---

### 1.3 Domain 2 — `escrow_state`

**Scope:** Applies to escrow records linked to trades. **Non-fintech mode for Phase 1** — no actual fund custody, movement, or financial settlement logic. This is a structural/acknowledgement model only. Doctrine constraint: TexQtic is a trade platform, not a payment processor.

> **Doctrine gate:** `escrow_state` transitions may NOT trigger any real fund movement. The `RELEASED` state acknowledges a settlement event recorded externally. It does not instruct any payment rail.

#### 1.3.1 State Registry

| State Key            | Label                   | Terminal | Irreversible | Severity | Maker-Checker Required | Notes                                                                        |
|----------------------|-------------------------|----------|--------------|----------|------------------------|------------------------------------------------------------------------------|
| `NOT_APPLICABLE`     | Not Applicable          | Yes      | No           | 0        | No                     | Trade has no escrow arrangement. Default for B2B open-credit trades.         |
| `INITIATED`          | Escrow Initiated        | No       | No           | 1        | Yes                    | Both parties agreed to escrow arrangement. Record created.                   |
| `MILESTONE_PENDING`  | Milestone Pending       | No       | No           | 2        | No                     | Awaiting fulfilment milestone to be marked complete.                         |
| `RELEASE_PENDING`    | Release Pending         | No       | No           | 3        | Yes                    | Milestones met; awaiting Maker-Checker authorisation to release.             |
| `RELEASED`           | Released                | Yes      | Yes          | 3        | Yes                    | Terminal. External settlement acknowledged. Irreversible record.             |
| `REFUNDED`           | Refunded                | Yes      | Yes          | 3        | Yes                    | Terminal. Escrow unwound; trade cancelled or disputed to resolution.         |
| `VOIDED`             | Voided                  | Yes      | Yes          | 4        | Yes                    | Terminal. Platform-level void; requires SuperAdmin escalation record.        |

#### 1.3.2 Transition Map

```
NOT_APPLICABLE    → INITIATED         [only if both parties agree and trade is ORDER_CONFIRMED]
INITIATED         → MILESTONE_PENDING [fulfilment begins]
INITIATED         → VOIDED            [escrow arrangement cancelled; maker-checker]
MILESTONE_PENDING → RELEASE_PENDING   [milestone conditions met; maker-checker review]
MILESTONE_PENDING → REFUNDED          [milestone failed; maker-checker]
RELEASE_PENDING   → RELEASED          [maker-checker: RELEASE authorised]
RELEASE_PENDING   → REFUNDED          [maker-checker: REFUND authorised]
RELEASE_PENDING   → VOIDED            [escalation override; SuperAdmin]
```

**Prohibited:**
- `RELEASED → *` — Terminal.
- `REFUNDED → *` — Terminal.
- `VOIDED → *` — Terminal.
- Any escrow transition without a linked `trade_id` in `ORDER_CONFIRMED` or later state.

---

### 1.4 Domain 3 — `certification_state`

**Scope:** Applies to certifications submitted by tenants (product, regulatory, compliance). Certifications gate certain trade operations (e.g. a trade may require APPROVED certifications before ORDER_CONFIRMED).

#### 1.4.1 State Registry

| State Key       | Label            | Terminal | Irreversible | Severity | Maker-Checker Required | Notes                                                                     |
|-----------------|------------------|----------|--------------|----------|------------------------|---------------------------------------------------------------------------|
| `SUBMITTED`     | Submitted        | No       | No           | 1        | No                     | Tenant uploaded certification artefact. Awaiting review.                 |
| `UNDER_REVIEW`  | Under Review     | No       | No           | 1        | No                     | Assigned reviewer has accepted the submission for review.                 |
| `APPROVED`      | Approved         | No       | No           | 1        | Yes                    | Certification accepted. Not terminal — expires or may be revoked.         |
| `REJECTED`      | Rejected         | No       | Yes          | 2        | Yes                    | Certification did not pass review. Tenant may re-submit as new record.   |
| `REVOKED`       | Revoked          | Yes      | Yes          | 4        | Yes                    | Terminal. Active certification invalidated. High severity. SuperAdmin.    |
| `EXPIRED`       | Expired          | Yes      | No           | 1        | No                     | Terminal. Certification validity window elapsed. System-triggered.        |

> Note: `REJECTED` is irreversible on this record but is **not terminal** in that the tenant may create a new certification submission. The rejected record remains immutable. `APPROVED` is not terminal because it can transition to `REVOKED` or `EXPIRED`.

#### 1.4.2 Transition Map

```
SUBMITTED     → UNDER_REVIEW   [reviewer assigned; system or admin action]
SUBMITTED     → REJECTED       [immediate rejection without review; maker-checker]
UNDER_REVIEW  → APPROVED       [maker-checker: reviewer approves]
UNDER_REVIEW  → REJECTED       [maker-checker: reviewer rejects]
APPROVED      → REVOKED        [maker-checker: SuperAdmin or compliance action]
APPROVED      → EXPIRED        [system-triggered at expiry date; no maker-checker]
```

**Prohibited:**
- `REJECTED → *` — Irreversible. New submission required.
- `REVOKED → *` — Terminal.
- `EXPIRED → *` — Terminal.
- `APPROVED → SUBMITTED` — Re-review of approved cert requires REVOKE → new submission.

---

### 1.5 Future Domain Extensibility (Reserved Namespacing)

The framework is designed to accommodate additional domains without architectural change. The `allowed_transitions` and `state_definitions` tables use `domain` as a discriminant — adding a new domain requires only new rows, not schema changes.

**Reserved future domains:**

| Domain Key            | Intended Scope                                            |
|-----------------------|-----------------------------------------------------------|
| `dpp_state`           | Digital Product Passport lifecycle                        |
| `sanctions_state`     | Sanctions screening record lifecycle                      |
| `dispute_state`       | Formal dispute case lifecycle (if split from trade_state) |
| `kyb_state`           | Know-Your-Business tenant verification lifecycle          |
| `onboarding_state`    | Tenant onboarding workflow lifecycle                      |

**Extensibility contract:** New domains must define their full state registry and transition map in a design document (G-020 addendum) before any migration is written. The table architecture (§2) is domain-agnostic by design.

---

*— End of Part 1: Lifecycle Domains —*

---

## 2. Proposed Table Architecture

> **DESIGN-ONLY NOTATION.** All column definitions below are specification-grade descriptions. They are not executable DDL, not Prisma schema directives, and not migration instructions. Column types use PostgreSQL-style notation purely for precision of intent.

### 2.1 Design Principles Governing the Schema Model

1. **Three-table separation of concerns.** State definitions live in `state_definitions`. Permitted edges live in `allowed_transitions`. What actually happened lives in `state_transition_log`. These are logically independent concerns and must never be merged into a single table.
2. **`state_transition_log` is constitutionally append-only.** No `UPDATE` or `DELETE` is permitted under any circumstance, by any role, including `postgres`. Enforcement strategy is addressed in §3.
3. **Domain is a discriminant, not a foreign key.** `domain` is a `TEXT` (or future enum) column present in all three tables. This allows cross-domain queries (e.g. "all terminal states across all domains") without join complexity, and allows new domains to be registered with zero schema changes.
4. **UUIDs throughout.** All `id` columns are UUID v4. No serial/bigint primary keys. Consistent with TexQtic Doctrine v1.4 `organizations.id` = UUID model.
5. **`created_at` is immutable.** No `updated_at` on `state_definitions` or `allowed_transitions` — changes to these governance tables must be additive (new rows) or explicitly versioned, not silent overwrites.
6. **RLS scope is org-level for `state_transition_log`.** State definitions and transition rules are platform-level (control-plane readable, no per-tenant RLS needed). The log is tenant-scoped: a tenant may only read their own entity's transitions.

---

### 2.2 Table A — `state_definitions`

**Purpose:** Single source of truth for every valid state across all lifecycle domains. This table is the authoritative registry — if a state key does not exist here, it cannot appear in any transition or transition log.

**Access pattern:** Read-heavy, write-rare. Written only during platform migrations (new domain, new state). Read by the enforcement layer on every transition attempt to validate the target state and its properties.

#### Column Specification

| Column                    | Type              | Nullable | Default          | Constraint / Notes                                                                                   |
|---------------------------|-------------------|----------|------------------|------------------------------------------------------------------------------------------------------|
| `id`                      | `UUID`            | NO       | `gen_random_uuid()` | Primary key.                                                                                      |
| `domain`                  | `TEXT`            | NO       | —                | Discriminant. Values: `trade_state`, `escrow_state`, `certification_state`, future extensions.      |
| `state_key`               | `TEXT`            | NO       | —                | Machine-readable identifier. `UNIQUE(domain, state_key)`. Uppercase snake_case. e.g. `ORDER_CONFIRMED`. |
| `label`                   | `TEXT`            | NO       | —                | Human-readable display name. e.g. `"Order Confirmed"`.                                              |
| `is_terminal`             | `BOOLEAN`         | NO       | `false`          | If `true`: no outbound transitions permitted. Enforcement layer must reject any attempt.             |
| `is_irreversible`         | `BOOLEAN`         | NO       | `false`          | If `true`: transition INTO this state cannot be undone by any normal service call.                  |
| `severity_level`          | `SMALLINT`        | NO       | `0`              | Integer 0–4. 0 = routine, 1 = notable, 2 = significant, 3 = high, 4 = critical. Used by escalation engine (G-022). |
| `requires_maker_checker`  | `BOOLEAN`         | NO       | `false`          | Default MC requirement for any transition INTO this state. May be overridden per-edge in `allowed_transitions`. |
| `description`             | `TEXT`            | YES      | `NULL`           | Narrative description for governance documentation and UI tooltips.                                  |
| `created_at`              | `TIMESTAMPTZ`     | NO       | `now()`          | Immutable. Set on insert. No `updated_at` — changes require new version or documented override.     |

#### Key Constraints (Notational)

```
PRIMARY KEY (id)
UNIQUE (domain, state_key)
CHECK (severity_level BETWEEN 0 AND 4)
CHECK (state_key = upper(state_key))          -- enforce uppercase snake_case
CHECK (domain = lower(domain))                -- enforce lowercase domain key
```

#### RLS Model

- `state_definitions` is a **platform-level governance table**. It is NOT tenant-scoped.
- `texqtic_app` role: `SELECT` only. No INSERT/UPDATE/DELETE from application runtime.
- `texqtic_admin` role: SELECT + INSERT. No UPDATE (changes are additive). No DELETE.
- `postgres`: Full access (for migration application only).
- **No per-tenant RLS policy required** — state definitions are universal.

#### Indexing Notes

```
INDEX ON (domain)                    -- frequent domain-scoped lookups
INDEX ON (domain, state_key)         -- enforcement layer key resolution
INDEX ON (is_terminal) WHERE is_terminal = true    -- terminal state fast-check
```

---

### 2.3 Table B — `allowed_transitions`

**Purpose:** Defines every permitted directed edge in the state graph. The enforcement layer performs an existence check against this table on every transition attempt. If no matching row exists for `(domain, from_state_id, to_state_id)`, the transition is rejected with `TRANSITION_NOT_PERMITTED`, regardless of caller role.

**Access pattern:** Read-heavy (every transition validation), write-rare (governance migration only). Must be cached at the enforcement layer in high-throughput scenarios.

#### Column Specification

| Column                    | Type          | Nullable | Default             | Constraint / Notes                                                                                               |
|---------------------------|---------------|----------|---------------------|------------------------------------------------------------------------------------------------------------------|
| `id`                      | `UUID`        | NO       | `gen_random_uuid()` | Primary key.                                                                                                     |
| `domain`                  | `TEXT`        | NO       | —                   | Must match `state_definitions.domain`. Denormalised for query efficiency.                                        |
| `from_state_id`           | `UUID`        | NO       | —                   | FK → `state_definitions.id`. The source state. Must belong to same `domain`.                                    |
| `to_state_id`             | `UUID`        | NO       | —                   | FK → `state_definitions.id`. The target state. Must belong to same `domain`.                                    |
| `requires_maker_checker`  | `BOOLEAN`     | NO       | `false`             | **Edge-level override.** If `true` here, Maker-Checker is required regardless of `state_definitions` setting. If `false` here, defers to `state_definitions.requires_maker_checker` for the target state. |
| `escalation_level`        | `SMALLINT`    | YES      | `NULL`              | If set: transition automatically triggers an escalation record at this severity level. NULL = no auto-escalation. Used by G-022. |
| `actor_roles_permitted`   | `TEXT[]`      | YES      | `NULL`              | Array of role strings permitted to trigger this transition. NULL = any authenticated role in tenant. e.g. `{OWNER,ADMIN}`. |
| `description`             | `TEXT`        | YES      | `NULL`              | Governance narrative. Documents the business justification for this permitted edge.                              |
| `created_at`              | `TIMESTAMPTZ` | NO       | `now()`             | Immutable.                                                                                                       |

#### Key Constraints (Notational)

```
PRIMARY KEY (id)
UNIQUE (domain, from_state_id, to_state_id)     -- no duplicate edges
FK from_state_id → state_definitions(id)
FK to_state_id   → state_definitions(id)
CHECK (from_state_id != to_state_id)             -- no self-loop transitions
CHECK (escalation_level IS NULL OR escalation_level BETWEEN 1 AND 4)
```

**Cross-domain guard (enforcement-layer responsibility, not DB constraint):**
The enforcement layer must verify that `from_state_id.domain = to_state_id.domain = allowed_transitions.domain`. This three-way domain consistency cannot be expressed as a simple FK constraint and must be enforced in service logic.

#### Terminal State Guard (Notational)

A CHECK constraint (or enforcement-layer rule) must prevent any row from being inserted where `from_state_id` references a state with `is_terminal = true`:

```
-- Notational: not executable without subquery in CHECK
-- Enforcement: service layer must validate before insert
ASSERT: allowed_transitions.from_state ∉ terminal_states
```

This means the `allowed_transitions` table structurally cannot contain outbound edges from terminal states. Enforced at service layer during governance migration, not runtime.

#### RLS Model

- Same as `state_definitions`: platform-level, no per-tenant scope.
- `texqtic_app`: SELECT only (enforcement layer reads).
- `texqtic_admin`: SELECT + INSERT. No UPDATE/DELETE.

#### Indexing Notes

```
INDEX ON (domain, from_state_id)            -- forward-lookup for permitted targets
INDEX ON (domain, from_state_id, to_state_id)  -- uniqueness check fast-path
INDEX ON (requires_maker_checker) WHERE requires_maker_checker = true
INDEX ON (escalation_level) WHERE escalation_level IS NOT NULL
```

---

### 2.4 Table C — `state_transition_log`

**Purpose:** Immutable, append-only record of every state transition that has ever occurred across all entities on the platform. This is the forensic audit trail. It is the ground truth for "what happened, when, by whom, and why."

**Constitutional constraint:** This table must be **append-only**. No `UPDATE`. No `DELETE`. By any role. This is enforced at multiple layers (see §3 and §5). A `state_transition_log` row, once written, is permanent.

**Access pattern:** Write-on-every-transition, read-for-audit-and-display. Entity-scoped reads (show history for trade X) are the primary read pattern. Cross-entity analytics are control-plane only.

#### Column Specification

| Column                    | Type          | Nullable | Default             | Constraint / Notes                                                                                                        |
|---------------------------|---------------|----------|---------------------|---------------------------------------------------------------------------------------------------------------------------|
| `id`                      | `UUID`        | NO       | `gen_random_uuid()` | Primary key.                                                                                                              |
| `org_id`                  | `UUID`        | NO       | —                   | **Tenant boundary.** FK → `organizations.id`. RLS enforcement key. Every log row belongs to exactly one org.             |
| `entity_type`             | `TEXT`        | NO       | —                   | Domain discriminant at entity level. Values: `trade`, `escrow`, `certification`. Extensible.                             |
| `entity_id`               | `UUID`        | NO       | —                   | The specific entity being transitioned. Not a FK (avoids cross-table constraint complexity); validated at service layer.  |
| `domain`                  | `TEXT`        | NO       | —                   | Must match `entity_type`'s domain. Denormalised for query efficiency. e.g. `trade_state`.                                |
| `from_state_id`           | `UUID`        | YES      | `NULL`              | FK → `state_definitions.id`. NULL only for the initial state assignment (entity creation).                               |
| `to_state_id`             | `UUID`        | NO       | —                   | FK → `state_definitions.id`. The state the entity moved into.                                                            |
| `triggered_by_user_id`    | `UUID`        | YES      | `NULL`              | FK → `users.id`. NULL for system-triggered transitions (e.g. expiry).                                                    |
| `triggered_by_role`       | `TEXT`        | YES      | `NULL`              | Role of the triggering actor at time of transition. Snapshot — not a live FK to roles.                                   |
| `triggered_by_realm`      | `TEXT`        | NO       | —                   | `tenant` or `control`. Captures which realm initiated the transition.                                                     |
| `reason`                  | `TEXT`        | YES      | `NULL`              | Free-text justification. Required when `from_state.is_irreversible = true` or `requires_maker_checker = true`.           |
| `maker_checker_ref`       | `UUID`        | YES      | `NULL`              | FK → `maker_checker_requests.id` (G-021 table). Populated when transition was gated by Maker-Checker approval.           |
| `escalation_triggered`    | `BOOLEAN`     | NO       | `false`             | Whether this transition triggered an escalation record per G-022.                                                         |
| `escalation_ref`          | `UUID`        | YES      | `NULL`              | FK → `escalations.id` (G-022 table). Populated if `escalation_triggered = true`.                                         |
| `metadata`                | `JSONB`       | YES      | `NULL`              | Extensible payload. For structured context (e.g. external reference IDs, compliance decision codes). No PII.             |
| `created_at`              | `TIMESTAMPTZ` | NO       | `now()`             | Immutable. The authoritative timestamp of the transition.                                                                 |

#### Key Constraints (Notational)

```
PRIMARY KEY (id)
FK from_state_id → state_definitions(id)     -- nullable (initial assignment)
FK to_state_id   → state_definitions(id)
FK org_id        → organizations(id)
CHECK (entity_type IN ('trade', 'escrow', 'certification'))   -- extensible via governance migration
CHECK (triggered_by_realm IN ('tenant', 'control'))
CHECK (escalation_triggered = true OR escalation_ref IS NULL)  -- no orphan ref
CHECK (maker_checker_ref IS NULL OR escalation_triggered = false OR ...)  -- see G-021 contract
```

#### Append-Only Enforcement (Three Layers)

| Layer | Mechanism | Description |
|-------|-----------|-------------|
| DB    | RLS + REVOKE | `REVOKE UPDATE, DELETE ON state_transition_log FROM PUBLIC`. RLS policy: INSERT allowed; SELECT scoped by org_id; UPDATE/DELETE policies USING false. |
| DB    | Trigger (design intent) | `BEFORE UPDATE OR DELETE` trigger raises exception with code `AUDIT_LOG_IMMUTABLE`. Prevents even `postgres`-role mutations without dropping the trigger. |
| App   | Service layer | The `StateTransitionService` exposes no `update()` or `delete()` method for log rows. Any callers that attempt raw Prisma update are rejected at the service boundary. |

#### RLS Model — Tenant-Scoped

Unlike `state_definitions` and `allowed_transitions`, `state_transition_log` is **fully tenant-scoped** via `org_id`.

```
-- Tenant SELECT: can only see own org's transitions
POLICY state_transition_log_tenant_read FOR SELECT USING (
  NULLIF(current_setting('app.org_id', true), '') IS NOT NULL
  AND org_id::text = current_setting('app.org_id', true)
);

-- INSERT: allowed from application (actor context must be set)
POLICY state_transition_log_insert FOR INSERT WITH CHECK (true);

-- UPDATE: unconditionally denied
POLICY state_transition_log_no_update FOR UPDATE USING (false);

-- DELETE: unconditionally denied
POLICY state_transition_log_no_delete FOR DELETE USING (false);

-- Control plane: full read via app.is_admin = 'true'
```

#### Indexing Notes

```
INDEX ON (org_id, entity_type, entity_id)      -- entity history lookup (primary read pattern)
INDEX ON (org_id, entity_id, created_at DESC)  -- ordered history for UI
INDEX ON (to_state_id)                         -- state frequency analytics (control plane)
INDEX ON (triggered_by_user_id)               -- actor audit trail
INDEX ON (created_at DESC)                     -- time-series audit queries
INDEX ON (escalation_triggered) WHERE escalation_triggered = true
INDEX ON (org_id) -- RLS fast-path
```

---

### 2.5 Supporting Reference: Current Entity State Derivation

**Problem:** `state_transition_log` is append-only. It does not maintain a "current state" column. How does the application know the current state of a trade?

**Design decision:** The `trades`, `escrow_records`, and `certifications` tables (when implemented) each maintain a `current_state_id UUID FK → state_definitions(id)` column. This column is the application-facing "what state is this entity in right now" field.

The `state_transition_log` is the immutable forensic history. The `current_state_id` on the entity table is the live operational cursor.

**Update contract:**
- `current_state_id` on the entity is updated atomically within the same transaction as the `state_transition_log` INSERT.
- If the log INSERT fails, `current_state_id` is NOT updated (transaction rollback).
- If `current_state_id` update fails, the log INSERT is rolled back.
- Both must succeed or neither does.

**No eventual consistency.** The log and the current state pointer are always in sync within a single transaction. There is no background job reconciling them.

---

### 2.6 Table Relationship Summary

```
state_definitions
    │
    ├── (from_state_id) ──┐
    │                      ├── allowed_transitions ── (escalation_level → G-022)
    └── (to_state_id)   ──┘
    │
    ├── (from_state_id, to_state_id) ── state_transition_log ──┬── (org_id → organizations)
    │                                                            ├── (maker_checker_ref → G-021)
    │                                                            └── (escalation_ref → G-022)
    │
    └── (current_state_id on entity tables: trades, escrow_records, certifications)
```

---

*— End of Part 2: Table Architecture —*

---

## 3. Enforcement Strategy Comparison

> **DESIGN-ONLY.** This section proposes and evaluates three enforcement strategies. No triggers are implemented, no services modified, no SQL written to repo. The recommendation at the end of this section governs Day 2 implementation planning.

### 3.1 The Enforcement Problem

"Enforcement" means: when a caller requests a state transition for entity X from state A to state B, something must:

1. **Validate** that A → B is a declared permitted edge in `allowed_transitions`
2. **Validate** that A is not a terminal state
3. **Validate** that B's `is_irreversible` and `requires_maker_checker` rules are satisfied
4. **Write** the transition record to `state_transition_log` atomically with the entity's `current_state_id` update
5. **Reject** any attempt that fails any of the above with a documented, structured error code — not a silent no-op

The question is: **at which layer do steps 1–3 (validation) and step 4 (write) occur, and who bears responsibility for ensuring step 5 (rejection) is unconditional?**

---

### 3.2 Option A — DB Trigger Enforcement

**Model:** A `BEFORE UPDATE` trigger fires on the entity table (`trades`, `certifications`, etc.) whenever `current_state_id` changes. The trigger reads `allowed_transitions` and `state_definitions` to validate the transition, then inserts a row into `state_transition_log`. If validation fails, the trigger raises an exception and the transaction is aborted.

#### Option A — Feature Evaluation

| Criterion | Assessment | Detail |
|-----------|-----------|--------|
| **RLS compatibility** | ⚠️ Complex | The trigger runs in the context of the DB user (`texqtic_app`). It must `SET LOCAL` to a privileged context to read `state_definitions` (platform-level, not tenant-scoped) while the calling transaction is in `texqtic_app` (NOBYPASSRLS). Requires SECURITY DEFINER or explicit role grants to governance tables. Non-trivial to audit. |
| **Performance impact** | ⚠️ Moderate | Every `trades.current_state_id` UPDATE fires the trigger. The trigger executes two `SELECT` queries (`allowed_transitions` lookup + terminal state check) before allowing the write. Under high throughput, this adds latency on every trade operation — even non-transition updates to other columns. Trigger scope must be narrowed to `WHEN (NEW.current_state_id IS DISTINCT FROM OLD.current_state_id)`. |
| **Debuggability** | ❌ Poor | Trigger failures surface as Postgres exceptions (`SQLSTATE P0001`). Prisma wraps these as generic `PrismaClientKnownRequestError` with `code: P2010` (raw query failure) or `P2034` (transaction conflict). Error codes from trigger (`TRANSITION_NOT_PERMITTED`, etc.) are embedded in the exception message string — not a structured field. Service layer must parse error message strings to classify rejections. Brittle. |
| **Governance reliability** | ✅ Strong | Unconditional. No application code path can bypass a trigger. Even direct `psql` connections (if using `texqtic_app` role) cannot bypass it. Protection extends to future service authors who may not know the state machine rules. |
| **Risk of bypass** | ✅ Low (but not zero) | Bypass requires: (a) connecting as `postgres` (BYPASSRLS) and (b) explicitly dropping or disabling the trigger. Both are logged at Supabase infrastructure level. Application runtime cannot bypass. |
| **Maker-Checker compatibility** | ⚠️ Awkward | The trigger has no awareness of whether a Maker-Checker approval is in flight. It can only check `allowed_transitions.requires_maker_checker`. The actual MC approval state lives in `maker_checker_requests` (G-021). A trigger checking a separate table mid-transaction creates cross-table dependency complexity. |
| **Extensibility** | ⚠️ Moderate | Adding a new domain requires the trigger to be aware of the new entity table and column. Triggers are per-table — a new domain entity requires a new trigger (or a shared function called by multiple triggers). |
| **Testing** | ❌ Difficult | Trigger logic cannot be unit tested in isolation. Integration tests must set up full DB state. Trigger bugs are hard to reproduce in CI without a live DB. |

#### Option A — Summary

**Strength:** Unconditional enforcement. No application code bypass possible.  
**Fatal weakness for TexQtic:** Debuggability is poor (structured error codes lost in Prisma exception wrapping), Maker-Checker integration is architecturally awkward, and trigger logic is opaque to the application layer.

---

### 3.3 Option B — Service Layer Enforcement

**Model:** A dedicated `StateTransitionService` (or `StateMachineService`) in the application layer is the single entry point for all state changes. Every caller — route handler, background job, webhook processor — must go through this service. The service reads `allowed_transitions` and `state_definitions`, validates all rules, writes the log atomically, and returns a structured result or typed error. No DB trigger.

#### Option B — Feature Evaluation

| Criterion | Assessment | Detail |
|-----------|-----------|--------|
| **RLS compatibility** | ✅ Clean | The service operates within `withDbContext()` (Doctrine v1.4 canonical). It sets `app.org_id` and queries governance tables (platform-level, SELECTs allowed for `texqtic_app`) in normal Prisma flow. No special SECURITY DEFINER required. Fully compatible with existing RLS architecture. |
| **Performance impact** | ✅ Good | Validation queries (`allowed_transitions`, `state_definitions`) can be cached in-process (LRU or time-bounded) since these tables change only during governance migrations — not at runtime. After cache warm, validation cost is near-zero. Write path (log INSERT + entity UPDATE) is a single transaction, no additional overhead vs Option A. |
| **Debuggability** | ✅ Excellent | The service returns typed errors with structured codes: `{ code: 'TRANSITION_NOT_PERMITTED', from: 'DRAFT', to: 'CLOSED', reason: '...' }`. Route handlers map these to HTTP response envelopes. Logs at service boundary. Full stack trace available. Maker-Checker state visible as typed service state. |
| **Governance reliability** | ⚠️ Conditional | Enforcement is only as reliable as the discipline of routing all state changes through the service. A future developer writing a route that directly calls `prisma.trade.update({ current_state_id: ... })` bypasses all enforcement. This requires: (a) code review discipline, (b) a static analysis rule or lint check, (c) documentation. |
| **Risk of bypass** | ⚠️ Moderate | Application-layer bypass is possible by direct Prisma calls. No DB-level backstop (in pure Option B). This is the critical weakness — mitigated in Option C. |
| **Maker-Checker compatibility** | ✅ Natural | The service natively queries `maker_checker_requests` (G-021) as part of its validation step. If `requires_maker_checker = true` and no approved MC request is linked, the service rejects the transition with `MAKER_CHECKER_REQUIRED` before touching the DB. Clean integration. |
| **Extensibility** | ✅ Excellent | New domains require zero service changes to the core engine. The service resolves domain, from_state, and to_state from the tables. New domain = new rows in governance tables + new entity table. The service loop is domain-agnostic. |
| **Testing** | ✅ Excellent | Service logic is unit-testable with mocked Prisma client. Integration tests run against test DB. Validation logic can be tested without live governance tables by injecting mock `StateDefinitionRepository`. |

#### Option B — Summary

**Strength:** Debuggability, MC compatibility, extensibility, testability, performance (caching).  
**Fatal weakness (pure):** No DB backstop. Direct Prisma access bypasses all enforcement. Requires discipline enforcement at code review layer, which is not constitutionally reliable.

---

### 3.4 Option C — Hybrid Enforcement (Recommended)

**Model:** Service layer is the **primary enforcement boundary** (full validation, structured errors, MC integration, audit emission). DB layer provides a **lightweight backstop trigger** scoped only to append-only protection on `state_transition_log` and a terminal-state guard on entity tables.

The backstop trigger does NOT replicate all validation logic. It enforces only the hardest constitutional invariants:

1. **`state_transition_log` is append-only.** `BEFORE UPDATE OR DELETE` trigger on `state_transition_log` raises `AUDIT_LOG_IMMUTABLE` unconditionally.
2. **Terminal state lock.** `BEFORE UPDATE` trigger on entity tables (`trades`, etc.) raises `TERMINAL_STATE_LOCKED` if `NEW.current_state_id` changes AND `OLD.current_state_id` references a terminal state (i.e. `is_terminal = true` in `state_definitions`). This is a single-lookup check — not full transition validation.
3. **Irreversibility guard (optional, Phase 2).** A trigger that rejects `current_state_id` changes from an irreversible state without a linked `maker_checker_ref`. This integrates with G-021 at DB level as a secondary backstop.

#### Option C — Feature Evaluation

| Criterion | Assessment | Detail |
|-----------|-----------|--------|
| **RLS compatibility** | ✅ Clean | Same as Option B for service layer. Backstop trigger is scoped to read a single `state_definitions.is_terminal` flag — minimal SECURITY DEFINER surface, or granted via explicit column read permission. |
| **Performance impact** | ✅ Good | Service layer caches full transition table. Trigger fires only on `current_state_id` change (`WHEN` clause filters), performs a single PK lookup on `state_definitions`. Negligible overhead. |
| **Debuggability** | ✅ Excellent | Service layer provides structured errors for all normal paths. DB trigger provides last-resort rejection with a parseable SQLSTATE message (narrow scope = predictable error strings). |
| **Governance reliability** | ✅ Strong | Service layer covers all validation. DB trigger covers the two hardest invariants (append-only log, terminal lock) unconditionally. A future developer who bypasses the service can still not: mutate the log, or transition from a terminal state. |
| **Risk of bypass** | ✅ Low | Perfect for the append-only log (trigger is unconditional). For full transition validation, service layer discipline is required — but the worst failure mode (corrupted terminal state) is still blocked at DB level. |
| **Maker-Checker compatibility** | ✅ Natural | MC validation lives entirely in the service layer where it belongs. DB backstop does not attempt MC logic. |
| **Extensibility** | ✅ Excellent | New domains add rows to governance tables. Backstop trigger references `state_definitions.is_terminal` — works for any domain automatically via the FK. |
| **Testing** | ✅ Excellent | Service logic unit-tested in isolation. Trigger logic integration-tested with a small focused test suite. Clean separation. |

#### Option C — Responsibility Matrix

| Responsibility | Layer | Mechanism |
|---------------|-------|-----------|
| Permitted edge validation (`allowed_transitions` lookup) | Service | `StateMachineService.validateTransition()` |
| Terminal state block | Service (primary) + DB trigger (backstop) | Service checks `is_terminal`; trigger blocks at DB if bypassed |
| Irreversibility check | Service (primary) | `StateMachineService.validateIrreversibility()` |
| Maker-Checker gate | Service | `StateMachineService.requiresMakerChecker()` → G-021 check |
| Log append-only | DB trigger (unconditional) | `BEFORE UPDATE OR DELETE ON state_transition_log RAISE EXCEPTION` |
| Audit emission | Service | `AuditService.emit(TRADE_STATE_CHANGED, ...)` within same transaction |
| Escalation trigger | Service | `EscalationService.maybeEscalate(transition)` within same transaction |
| Actor role check | Service | `StateMachineService.checkActorPermission(role, transition)` |
| `current_state_id` + log atomicity | Service (transaction) | Prisma `$transaction([logInsert, entityUpdate])` |

---

### 3.5 Recommendation: Option C — Hybrid

**Recommendation: OPTION C (Hybrid)**

**Justification:**

1. **Service layer for all reasoning.** Transition validation, Maker-Checker gating, escalation triggers, actor role checks, and audit emission are all reasoning tasks. They require context (JWT claims, request metadata, G-021 state, G-022 configuration) that is only available at the application layer. DB triggers cannot access this context without extreme SECURITY DEFINER complexity that creates its own audit surface.

2. **DB triggers for the absolute invariants only.** Two constitutional invariants are non-negotiable regardless of what application code does: (a) the audit log must never be mutated once written, and (b) a trade in a terminal state must never transition further. These two invariants are simple, performant, and have no dependency on application context. They belong at the DB layer as unconditional backstops.

3. **TexQtic's `withDbContext()` architecture is already service-layer-first.** The existing codebase routes all DB access through `withDbContext()` with `texqtic_app` role enforcement. Adding `StateMachineService` as a gating layer extends this pattern rather than fighting it.

4. **Debuggability is critical at current scale.** TexQtic is in active development with a small team. Opaque trigger failures (pure Option A) are a development velocity tax. Structured service-layer errors accelerate debugging, test writing, and API client error handling.

5. **The bypass risk of pure Option B is real but bounded.** With Option C, a bypass of the service layer still cannot: mutate the log or re-open a terminal trade. These are the two catastrophic failure modes. All other failures (e.g. skipping a compliance gate) are prevented by the service and surfaced in code review via a static analysis rule: "no direct `prisma.trade.update()` — use `StateMachineService`."

**Proposed static analysis guard (implementation note for Day 2):**
Add an ESLint rule or a grep-based CI check that flags any direct `prisma.trade.update(`, `prisma.certification.update(`, or `prisma.escrow_record.update(` call that modifies `current_state_id` outside of `StateMachineService`. This is the lint-level enforcement that closes the service-bypass gap.

---

### 3.6 `StateMachineService` Interface Contract (Design Only)

The following describes the public interface contract of the service. Not an implementation — a behavioral specification for Day 2.

```
StateMachineService.transition({
  orgId:         string,       // RLS boundary — org_id from JWT context
  entityType:    'trade' | 'escrow' | 'certification',
  entityId:      string,       // UUID of the entity being transitioned
  toStateKey:    string,       // Target state key, e.g. 'ORDER_CONFIRMED'
  actorId:       string,       // User UUID triggering the transition (nullable for system)
  actorRole:     string,       // Role at time of transition (snapshot)
  realm:         'tenant' | 'control',
  reason?:       string,       // Required for certain transitions (irreversible, MC)
  makerCheckerRef?: string,    // UUID of approved MC request (required if MC gate)
  metadata?:     object,       // Extensible JSONB payload
}): Promise<TransitionResult>

TransitionResult:
  | { success: true;  newStateKey: string; logId: string; escalationTriggered: boolean }
  | { success: false; code: TransitionErrorCode; message: string }

TransitionErrorCode:
  | 'TRANSITION_NOT_PERMITTED'      // Edge not in allowed_transitions
  | 'TRANSITION_FROM_TERMINAL'      // from_state.is_terminal = true
  | 'MAKER_CHECKER_REQUIRED'        // requires_maker_checker without valid makerCheckerRef
  | 'ACTOR_ROLE_NOT_PERMITTED'      // actor role not in actor_roles_permitted
  | 'REASON_REQUIRED'               // reason missing for irreversible or MC transition
  | 'ENTITY_NOT_FOUND'             // entityId does not exist or not in org
  | 'CROSS_TENANT_DENIED'          // entityId belongs to different org_id
  | 'STATE_DEFINITION_NOT_FOUND'   // toStateKey not in state_definitions for domain
```

This interface is domain-agnostic. The same method handles `trade`, `escrow`, and `certification` transitions. Callers never implement transition logic — they call `StateMachineService.transition()` and handle the typed result.

---

*— End of Part 3: Enforcement Strategy —*

---

## 4. Irreversibility Model

> **DESIGN-ONLY.** No implementation, no schema changes, no trigger code. This section defines the constitutional semantics of terminal states, irreversible transitions, rollback prevention, and the sole exception path (Maker-Checker supervised override).

### 4.1 Two Distinct Concepts: Terminal vs Irreversible

These are related but not the same. They must not be conflated.

| Concept | Meaning | Applies To |
|---------|---------|------------|
| **Terminal** (`is_terminal = true`) | The entity has reached its final state. No further transitions are structurally permitted. The `allowed_transitions` table has no outbound edges from this state. | The state itself |
| **Irreversible** (`is_irreversible = true`) | The transition INTO this state cannot be undone by normal service calls. Once entered, the entity cannot retreat to a prior state on the same path. It may still transition forward (to other non-terminal states or eventually to a terminal state). | The transition that lands in this state |

**Concrete examples from the trade lifecycle:**

| State | Terminal? | Irreversible? | Meaning |
|-------|-----------|---------------|---------|
| `DRAFT` | No | No | Fully mutable. Can be cancelled, sent to RFQ, or discarded. |
| `ORDER_CONFIRMED` | No | **Yes** | Cannot un-confirm an order by normal service call. May still proceed to `FULFILLMENT` or (exceptional) `DISPUTED`. But cannot return to `NEGOTIATION`. |
| `FULFILLMENT` | No | **Yes** | Fulfilment is in motion. Cannot retreat to `ORDER_CONFIRMED`. May proceed to `SETTLEMENT_PENDING` or enter `DISPUTED`. |
| `CLOSED` | **Yes** | **Yes** | No transitions out. Permanent record. |
| `CANCELLED` | **Yes** | **Yes** | No transitions out. Cannot be un-cancelled. |
| `REJECTED` | **Yes** | **Yes** | No transitions out. Cannot be appealed on same record. |
| `NEGOTIATION` | No | No | Mutable. Parties may iterate freely. |
| `DISPUTED` | No | No | Active dispute can be resolved (→ NEGOTIATION) or escalated (→ ESCALATED). Not irreversible because dispute resolution is a valid forward path. |

---

### 4.2 Constitutional Answer: Can a CLOSED Trade Return to NEGOTIATION?

> **NO. Unconditionally and permanently.**

A trade in state `CLOSED` CANNOT transition to `NEGOTIATION`, to any other state, or to itself. This is enforced at three layers:

**Layer 1 — `allowed_transitions` table (structural):**
No row exists in `allowed_transitions` with `from_state_key = 'CLOSED'`. The transition graph has zero outbound edges from any terminal state. This is not a runtime check — it is a structural property of the governance data.

**Layer 2 — `StateMachineService` terminal check (service, primary):**
Before any transition is attempted, the service reads `state_definitions` for the current state and checks `is_terminal`. If `is_terminal = true`, the service immediately returns `{ code: 'TRANSITION_FROM_TERMINAL' }` without consulting `allowed_transitions`. No DB write occurs.

**Layer 3 — DB trigger backstop (constitutional floor):**
The `BEFORE UPDATE` trigger on `trades.current_state_id` performs a single-lookup check: if `OLD.current_state_id` maps to a `state_definitions` row with `is_terminal = true`, the trigger raises `SQLSTATE P0001` with message `TERMINAL_STATE_LOCKED`. Even if the service layer is bypassed by a direct Prisma call, this trigger prevents the column change.

**The only coherent exception path (and it does not re-open the trade):**

If a platform SuperAdmin needs to void a misfiled CLOSED trade (e.g. platform error, fraud discovery), the correct procedure is:

1. Create a new escrow/certifications oversight record documenting the reason (G-022 escalation record).
2. The CLOSED trade is annotated with a `metadata.voided_by_escalation_ref` in its log entry — the trade record itself is NOT mutated.
3. A separate corrective trade entity is created from `DRAFT` if the underlying transaction must be re-processed.
4. The CLOSED trade's `state_transition_log` entry is never altered.

**The CLOSED state is permanent. The trade entity is permanent. What changes is the surrounding record-keeping context, not the trade itself.**

---

### 4.3 Irreversibility Enforcement Steps

When a transition targets a state with `is_irreversible = true`, the service enforces the following additional requirements before allowing the write:

#### Step 1 — `reason` is mandatory

Transitions into irreversible states require a non-null, non-empty `reason` string. If absent, the service returns `{ code: 'REASON_REQUIRED' }`.

**Rationale:** Irreversible actions must be self-documenting at the moment they occur. A `reason` captured at transition time is the only human-readable explanation that will persist permanently in `state_transition_log`. There is no "edit later" option.

#### Step 2 — Maker-Checker gate (if `requires_maker_checker = true`)

For irreversible states that also require Maker-Checker (e.g. `ORDER_CONFIRMED`, `CANCELLED` post-confirmation, `SETTLEMENT_ACKNOWLEDGED`), the transition is further gated by a valid `makerCheckerRef`. See §7 for the full MC protocol. In summary: the service verifies that a `maker_checker_requests` row exists with `status = 'APPROVED'`, linked to this `entityId` and `toStateKey`, before allowing the transition.

#### Step 3 — Transition log captures the full snapshot

The `state_transition_log` INSERT for an irreversible transition must include:
- `reason` (mandatory, captured from caller)
- `maker_checker_ref` (if applicable)
- `triggered_by_user_id` and `triggered_by_role` (snapshot at transition time — not a live FK)
- `metadata` with at minimum `{ "irreversible": true, "confirmed_at": "<ISO timestamp>" }`

This ensures the log is self-contained and auditable without requiring joins to reconstruct context.

---

### 4.4 Rollback Prevention Matrix

The following matrix enumerates the specific rollback scenarios that are explicitly prohibited, the error code returned, and which enforcement layer catches it.

| Attempted Rollback | Error Code | Enforcement Layer |
|-------------------|------------|------------------|
| `CLOSED → NEGOTIATION` | `TRANSITION_FROM_TERMINAL` | Service (primary) + DB trigger (backstop) |
| `CLOSED → DRAFT` | `TRANSITION_FROM_TERMINAL` | Service (primary) + DB trigger (backstop) |
| `CANCELLED → DRAFT` | `TRANSITION_FROM_TERMINAL` | Service (primary) + DB trigger (backstop) |
| `REJECTED → SUBMITTED` (certification) | `TRANSITION_FROM_TERMINAL` | Service (primary) + DB trigger (backstop) |
| `ORDER_CONFIRMED → NEGOTIATION` | `TRANSITION_NOT_PERMITTED` | Service (no edge in `allowed_transitions`) |
| `ORDER_CONFIRMED → DRAFT` | `TRANSITION_NOT_PERMITTED` | Service |
| `FULFILLMENT → ORDER_CONFIRMED` | `TRANSITION_NOT_PERMITTED` | Service |
| `FULFILLMENT → NEGOTIATION` | `TRANSITION_NOT_PERMITTED` | Service |
| `SETTLEMENT_PENDING → FULFILLMENT` | `TRANSITION_NOT_PERMITTED` | Service |
| `SETTLEMENT_ACKNOWLEDGED → SETTLEMENT_PENDING` | `TRANSITION_NOT_PERMITTED` | Service |
| `RELEASED (escrow) → INITIATED` | `TRANSITION_FROM_TERMINAL` | Service + DB trigger |
| `APPROVED (cert) → SUBMITTED` | `TRANSITION_NOT_PERMITTED` | Service |
| Any state → itself (self-loop) | `TRANSITION_NOT_PERMITTED` | Service (+ `allowed_transitions` constraint: `CHECK from_state_id != to_state_id`) |
| Mutation of `state_transition_log` row | `AUDIT_LOG_IMMUTABLE` | DB trigger (unconditional, all roles) |

---

### 4.5 The "Exceptional Override" Protocol (Design Intent, Not Implementation)

There exists a narrow, explicitly governed path by which a SuperAdmin may cause an outcome that resembles undoing an irreversible state. This path DOES NOT mutate the entity's state history. It creates a new forward record.

**Conditions for exceptional override:**

1. Actor is `SUPER_ADMIN` in `control` realm.
2. A G-022 escalation record exists with `severity_level = 4` and `status = APPROVED_FOR_OVERRIDE`.
3. The escalation record references this specific `entity_id` and the specific transition being overridden.
4. A G-021 Maker-Checker request exists with `status = APPROVED` and two approvers (maker + checker both at `SUPER_ADMIN` role or above).

**What the override does:**

- It does NOT delete or modify any existing `state_transition_log` row.
- It does NOT revert `current_state_id` to the prior state.
- It creates a **new transition** via the normal `StateMachineService.transition()` path, but with a special edge that is only present in `allowed_transitions` for override scenarios (`from_state = ESCALATED, to_state = CANCELLED` or similar).
- The override transition itself is logged with `maker_checker_ref`, `escalation_ref`, `reason`, and `metadata.override = true`.

**This preserves the constitutional integrity of the log while allowing platform-level governance recovery.**

If the required escalation + MC records do not exist, `StateMachineService.transition()` returns `MAKER_CHECKER_REQUIRED` or `TRANSITION_NOT_PERMITTED` — the override attempt is rejected and logged as a failed attempt.

---

### 4.6 Irreversibility vs Immutability — Distinction

| Concept | What It Protects | What It Allows |
|---------|-----------------|---------------|
| **State irreversibility** (`is_irreversible`) | Prevents retreat to prior states via normal service calls | Forward transitions to subsequent states in the graph |
| **Log immutability** (append-only `state_transition_log`) | Prevents alteration of the historical record | Reading, querying, annotating via separate records |
| **Terminal state** (`is_terminal`) | Prevents ALL further transitions | Nothing — end of the graph |

These three are independent properties that can be combined. `CLOSED` has all three: it is terminal (no edges out), irreversible (no retreat), and its log entry is immutable (append-only table). A state like `ORDER_CONFIRMED` is irreversible and its log entry is immutable — but it is NOT terminal (FULFILLMENT follows).

Understanding this distinction is critical for constitutional review: "irreversible" is not a synonym for "terminal" and must not be treated as such in service implementation.

---

### 4.7 State Lifecycle Diagram (Text Representation)

```
DRAFT ──────────────────────────────── CANCELLED (terminal, irreversible)
  │
  ├── RFQ_SENT ───────────────────────── REJECTED (terminal, irreversible)
  │      │
  │      └── NEGOTIATION ──────────────── REJECTED
  │               │           │
  │               │           └──────────── CANCELLED
  │               │
  │               └── PENDING_COMPLIANCE
  │                        │         │
  │                        │         └── REJECTED
  │                        │         └── ESCALATED ──┐
  │                        │                          │
  │                        └── APPROVED               │
  │                               │                   │
  │                               └── ORDER_CONFIRMED* ←─── (no return path)
  │                                        │
  │                                        ├── FULFILLMENT* ─── DISPUTED ─┐
  │                                        │         │                    │
  │                                        │         └── SETTLEMENT_PENDING* ─┐
  │                                        │                    │              │
  │                                        │                    └── SETTLEMENT_ACKNOWLEDGED* ─┐
  │                                        │                                                   │
  │                                        └── DISPUTED ──────────────────────────────────┐   │
  │                                                 │                                     │   │
  │                                                 └── ESCALATED ──────────────── CLOSED (terminal, irreversible) ←─┘
  │                                                          │
  │                                                          └── CANCELLED* (terminal, irreversible)

* = irreversible on entry
```

**Key reading:** Every path to `CLOSED` passes through `SETTLEMENT_ACKNOWLEDGED`. There is no shortcut. Every path to permanent closure (`CLOSED`, `CANCELLED`, `REJECTED`) is either terminal-on-entry or requires escalation + MC approval.

---

*— End of Part 4: Irreversibility Model —*

---

## 5. Escalation Integration (G-022 Linkage)

> **DESIGN-ONLY.** No escalation service implemented, no tables created, no triggers written. This section defines the behavioral contract between the state machine and the future G-022 Escalation Engine. G-022 is a separate governance item — this section defines only the interface G-020 exposes to it.

### 5.1 What is an Escalation in This Context?

An **escalation** is a platform-level governance record created when a state transition meets one or more of the following conditions:

1. The transition's edge in `allowed_transitions` has `escalation_level IS NOT NULL` (auto-escalation on certain edges).
2. The destination state has `severity_level >= 3` (high or critical severity state entered).
3. A transition attempt is rejected after exceeding a defined retry or timeout threshold (e.g. `PENDING_COMPLIANCE` aging beyond a time window).
4. An actor with insufficient role attempts a transition that requires `SUPER_ADMIN` authorisation.
5. The `StateMachineService` detects an anomaly during validation (e.g. entity state is inconsistent with log history — indicates potential data integrity issue).

An escalation does **not** block the transition that triggered it (unless the transition itself requires `escalation_level` resolution before it can proceed — see §5.4). It is a parallel record that creates a governance task.

---

### 5.2 Escalation Severity Classification

Escalation severity is carried in `allowed_transitions.escalation_level` (the edge-level auto-escalation trigger) and in `state_definitions.severity_level` (the general severity of any entity entering that state). Both are integers 0–4.

| Level | Label | Meaning | Response SLA (design intent) |
|-------|-------|---------|------------------------------|
| 0 | Routine | No escalation. Informational only. | N/A |
| 1 | Notable | Logged; no immediate action required. | Review within 7 days |
| 2 | Significant | Triggers notification to platform ops. | Review within 48 hours |
| 3 | High | Triggers escalation record + ops alert. Maker-Checker review recommended. | Review within 4 hours |
| 4 | Critical | Triggers hard escalation. Transition may be locked pending SuperAdmin review. | Review within 1 hour |

**State-level severity vs edge-level escalation:**

- **State severity** (`state_definitions.severity_level`): Reflects the inherent governance weight of being in this state. A trade entering `ESCALATED` or `DISPUTED` is severity 3 by definition. Entering `CLOSED` is severity 0 — routine, no escalation needed.
- **Edge escalation** (`allowed_transitions.escalation_level`): Reflects the specific risk of this particular transition, regardless of the destination state's inherent severity. e.g. `PENDING_COMPLIANCE → ESCALATED` may carry a higher edge-level escalation than the destination state's default severity suggests, because the fact of leaving compliance review via escalation is itself a significant governance event.

When both are present, the **higher value wins** for the purpose of escalation record creation.

---

### 5.3 Auto-Escalation Hook Model

When `StateMachineService.transition()` completes a successful write, it evaluates the escalation hook as the last step within the same transaction:

```
WITHIN the same $transaction as the log insert and entity update:

1. Resolve effective_escalation_level:
   = MAX(allowed_transitions.escalation_level ?? 0, state_definitions.severity_level)

2. If effective_escalation_level >= 2:
   a. Construct EscalationPayload:
      {
        org_id:          context.orgId,
        entity_type:     entityType,
        entity_id:       entityId,
        triggered_by:    triggeredByUserId,
        transition_from: fromStateKey,
        transition_to:   toStateKey,
        severity_level:  effective_escalation_level,
        reason:          reason ?? null,
        auto_triggered:  true,
        log_ref:         state_transition_log.id  (the row just inserted)
      }
   b. INSERT into escalations (G-022 table) with status = 'OPEN'
   c. Set state_transition_log.escalation_triggered = true
   d. Set state_transition_log.escalation_ref = escalations.id

3. If effective_escalation_level == 0 or 1:
   a. No escalation record created.
   b. state_transition_log.escalation_triggered = false
   c. state_transition_log.escalation_ref = NULL

4. If escalation INSERT fails:
   a. The entire transaction is rolled back.
   b. The transition is NOT recorded.
   c. The entity's current_state_id is NOT updated.
   d. StateMachineService returns { success: false, code: 'ESCALATION_WRITE_FAILED' }
```

**Atomicity guarantee:** The escalation record, the transition log row, and the entity state update all commit together or all roll back together. There is no state where a transition is recorded without a corresponding required escalation record.

---

### 5.4 Transition Locking Pending Escalation Review

Certain escalation conditions require that **no further transitions** on the entity are permitted until the escalation is resolved. This is the "lock" mechanism.

**Locking is triggered when:**
- `effective_escalation_level = 4` (Critical)
- OR the edge has `requires_maker_checker = true` AND `escalation_level >= 3`
- OR the transition was: any state → `ESCALATED` (platform-level intervention always locks)

**Lock model (design):**

The entity table (e.g. `trades`) carries a nullable column: `locked_by_escalation_id UUID FK → escalations(id)`.

When `locked_by_escalation_id IS NOT NULL`:
- `StateMachineService.transition()` checks this field first.
- If non-null, it returns `{ code: 'ENTITY_LOCKED_PENDING_ESCALATION', escalationId: '...' }` regardless of whether the requested transition would otherwise be permitted.
- The only transitions exempt from this check are those explicitly designated as "resolution transitions" — specifically, transitions that move the entity out of `ESCALATED` state (e.g. `ESCALATED → CLOSED`, `ESCALATED → CANCELLED`). These require `SUPER_ADMIN` realm + the specific escalation record's `status = RESOLVED`.

**Unlock model:**

The `locked_by_escalation_id` is cleared (set to NULL) atomically when:
- The referenced escalation's `status` is set to `RESOLVED` or `DISMISSED` by a SuperAdmin.
- The resolution is recorded in the `escalations` table.
- A transition is then permitted to proceed normally.

Clearing `locked_by_escalation_id` is itself a state machine operation — it must be logged in `state_transition_log` with `reason` and the escalation resolution reference.

---

### 5.5 Escalation-Linked State Transitions (G-022 Edge Types)

Not all transitions are equal in their escalation relationship. Three categories:

**Category 1 — Escalation-Emitting (most transitions):**
Transition completes. If `effective_escalation_level >= 2`, an escalation record is created as a side-effect. The escalation is informational/advisory — it does not block further transitions on the entity unless the escalation reaches `CRITICAL` (level 4).

**Category 2 — Escalation-Blocking (critical severity):**
Transition completes. Escalation record created. Entity is **locked** (`locked_by_escalation_id` set). No further transitions permitted until escalation is resolved. Examples: any transition INTO `ESCALATED`, any transition with `escalation_level = 4` on the edge.

**Category 3 — Escalation-Required (override scenarios):**
The transition **cannot complete** until a pre-existing, approved escalation record is presented as `escalationRef` in the `StateMachineService.transition()` call. This is the "exceptional override" path described in §4.5. The escalation must already be `APPROVED_FOR_OVERRIDE` before the transition is attempted.

**Summary:**

| Category | Escalation Created? | Escalation Blocks? | Escalation Required Before? |
|----------|--------------------|--------------------|----------------------------|
| 1 — Emitting | Yes (if level ≥ 2) | No | No |
| 2 — Blocking | Yes (always) | Yes | No |
| 3 — Required | No (must pre-exist) | N/A | Yes |

---

### 5.6 Escalation Edge Registry (Design Intent)

The following transitions are designated as auto-escalating at specific severity levels. This is the initial registry; G-022 Day 2 design may extend it.

| Domain | From State | To State | Escalation Level | Category | Notes |
|--------|-----------|---------|-----------------|----------|-------|
| trade_state | `PENDING_COMPLIANCE` | `ESCALATED` | 4 | Blocking | Compliance review timed out or reviewer escalated |
| trade_state | `FULFILLMENT` | `ESCALATED` | 4 | Blocking | Delivery failure unresolvable |
| trade_state | `SETTLEMENT_PENDING` | `ESCALATED` | 4 | Blocking | Settlement timeout |
| trade_state | `DISPUTED` | `ESCALATED` | 3 | Blocking | Self-resolution failed |
| trade_state | `ORDER_CONFIRMED` | `DISPUTED` | 3 | Emitting | Dispute post-confirmation is high-severity event |
| trade_state | `FULFILLMENT` | `DISPUTED` | 3 | Emitting | Dispute during delivery |
| trade_state | `SETTLEMENT_PENDING` | `DISPUTED` | 3 | Emitting | Payment dispute |
| trade_state | `ORDER_CONFIRMED` | `CANCELLED` | 3 | Blocking | Post-confirmation cancellation requires MC + escalation |
| escrow_state | `RELEASE_PENDING` | `VOIDED` | 4 | Blocking | Platform-forced void |
| escrow_state | `INITIATED` | `VOIDED` | 3 | Blocking | Early void |
| certification_state | `APPROVED` | `REVOKED` | 4 | Blocking | Revocation of active certification — critical |
| certification_state | `SUBMITTED` | `REJECTED` | 2 | Emitting | Immediate rejection without review |

---

### 5.7 Escalation Service Interface Contract (G-022 Boundary)

The `StateMachineService` communicates with the future G-022 Escalation Engine via a defined interface. G-020 owns the state transition; G-022 owns the escalation record lifecycle. The dependency is one-directional: G-020 calls G-022, never the reverse.

```
// G-020 calls G-022 at the end of a successful transition:
EscalationService.createFromTransition({
  orgId:           string,
  entityType:      string,
  entityId:        string,
  fromStateKey:    string,
  toStateKey:      string,
  severityLevel:   1 | 2 | 3 | 4,
  triggeredByUserId: string | null,
  triggeredByRole: string | null,
  transitionLogRef: string,  // state_transition_log.id
  reason:          string | null,
}): Promise<{ escalationId: string; status: 'OPEN' }>

// G-020 calls G-022 to check if entity is locked before transition:
EscalationService.getActiveLock(entityId: string): Promise<{
  locked: boolean;
  escalationId: string | null;
  reason: string | null;
}>

// G-022 calls back (via unlock event or status update) to release lock:
// This is an eventual-consistency boundary — G-022 updates escalation status,
// which the StateMachineService reads on the next transition attempt.
// No real-time callback required. Lock check is synchronous read at transition time.
```

**Dependency boundary:** G-020 (state machine) is independent of G-022 (escalation engine). The state machine functions fully without G-022 — escalation creation is best-effort within the transaction. The **exception** is Category 3 (escalation-required) transitions, where the escalation record must pre-exist. G-020 reads G-022 records but does not own them.

---

### 5.8 Timeout-Triggered Escalation (Design Intent, Async Path)

Some escalations are triggered not by a user action but by the passage of time:
- `PENDING_COMPLIANCE` older than N days without resolution → auto-escalate
- `SETTLEMENT_PENDING` older than M days without acknowledgement → auto-escalate
- `DISPUTED` older than P days without resolution → auto-escalate

**Design decision:** These timeout escalations are triggered by a **background job** (future implementation) — not by the main transition path. The job:
1. Queries entity tables for entities in time-sensitive states beyond their SLA window.
2. Calls `StateMachineService.transition()` with `actorId = null` (system-triggered), `realm = 'control'`, `toStateKey = 'ESCALATED'`, `reason = 'SLA_TIMEOUT:PENDING_COMPLIANCE:14d'`.
3. The transition follows the normal path — log insert, escalation creation, entity lock.

This design keeps the timeout logic entirely out of the state machine core. The state machine does not know about time; the background job knows about time and invokes the state machine.

---

*— End of Part 5: Escalation Integration —*

---

## 6. Audit Emission Model

> **DESIGN-ONLY.** No audit events are implemented here. This section defines the event naming convention, mandatory payload structure, emission guarantee contract, and the full event catalogue for the state machine. Audit emission integrates with the existing `audit_logs` table and `writeAuditLog()` infrastructure already live in the codebase.

### 6.1 Design Principles

1. **Every transition emits exactly one audit event.** No transition silently succeeds. No transition emits multiple events for the same state change. One transition = one audit event, unconditionally.
2. **Emission is atomic with the transition.** The audit event INSERT happens within the same `$transaction` as the `state_transition_log` INSERT and the entity `current_state_id` update. If audit emission fails, the entire transaction rolls back. This preserves the constitutional guarantee: if it happened, it is in the audit log; if it is not in the audit log, it did not happen.
3. **Audit events are immutable.** The existing `audit_logs` table is already append-only (RLS: UPDATE USING false, DELETE USING false, REVOKE UPDATE/DELETE). This requires no new enforcement — state machine audit events inherit the existing guarantees.
4. **Events are attributable.** Every event must carry `org_id` (tenant boundary), `actor_id` (user UUID or `null` for system), `actor_role` (snapshot), and `realm` (`tenant` or `control`). These four fields are mandatory. No anonymous, unattributed, or cross-tenant events.
5. **Event names are stable identifiers.** Once published, an event name is immutable in production. Adding a new event requires a governance entry. Renaming an existing event requires a deprecation cycle. This prevents downstream consumers (analytics, compliance exports, webhooks) from breaking silently.

---

### 6.2 Event Naming Convention

**Format:** `{DOMAIN}_{ENTITY}_{VERB}[_{QUALIFIER}]`

| Segment | Rule | Examples |
|---------|------|---------|
| `DOMAIN` | Uppercase. One of: `TRADE`, `ESCROW`, `CERTIFICATION`. Matches the entity type. | `TRADE`, `ESCROW`, `CERTIFICATION` |
| `ENTITY` | Uppercase. Singular noun matching the entity type. May be omitted if domain is unambiguous. | `TRADE`, `CERTIFICATION` — most events omit this as it duplicates `DOMAIN` |
| `VERB` | Uppercase past-tense verb describing what happened to the state. | `CREATED`, `SUBMITTED`, `CONFIRMED`, `CANCELLED`, `ESCALATED`, `RESOLVED`, `RELEASED`, `REVOKED`, `EXPIRED`, `CLOSED`, `LOCKED`, `UNLOCKED` |
| `QUALIFIER` | Optional uppercase suffix for disambiguation when a single verb is insufficient. | `_PENDING_COMPLIANCE`, `_POST_CONFIRMATION`, `_PLATFORM_OVERRIDE` |

**Root event for all state changes:**

```
TRADE_STATE_CHANGED
ESCROW_STATE_CHANGED
CERTIFICATION_STATE_CHANGED
```

These are the canonical, domain-agnostic events emitted on every successful transition. They carry the full transition payload and are suitable for generic consumers (audit exports, event stream, analytics). Specific-verb events (below) are emitted IN ADDITION for consumers that subscribe to named lifecycle milestones.

**Specific-verb events are emitted alongside `*_STATE_CHANGED`** for high-significance transitions. They carry the same payload but allow consumers to subscribe narrowly to milestone events without filtering on `to_state_key`.

---

### 6.3 Canonical Event Catalogue

#### 6.3.1 Trade Events

| Event Name | Trigger (to_state_key) | Severity | Notes |
|-----------|------------------------|----------|-------|
| `TRADE_STATE_CHANGED` | Any transition | Matches state severity | Always emitted. Root event. |
| `TRADE_RFQ_SENT` | `RFQ_SENT` | 1 | RFQ issued to counterparty. |
| `TRADE_NEGOTIATION_STARTED` | `NEGOTIATION` | 1 | Active negotiation phase entered. |
| `TRADE_COMPLIANCE_GATE_ENTERED` | `PENDING_COMPLIANCE` | 2 | Trade routed to compliance review. |
| `TRADE_COMPLIANCE_APPROVED` | `APPROVED` | 2 | Compliance gate cleared. |
| `TRADE_COMPLIANCE_REJECTED` | `REJECTED` (from `PENDING_COMPLIANCE`) | 3 | Compliance refusal. Terminal. |
| `TRADE_ORDER_CONFIRMED` | `ORDER_CONFIRMED` | 2 | Mutual commitment. Irreversible. High significance. |
| `TRADE_FULFILLMENT_STARTED` | `FULFILLMENT` | 2 | Goods/services in motion. |
| `TRADE_SETTLEMENT_PENDING` | `SETTLEMENT_PENDING` | 3 | Fulfilment complete; settlement awaited. |
| `TRADE_SETTLEMENT_ACKNOWLEDGED` | `SETTLEMENT_ACKNOWLEDGED` | 3 | Settlement confirmed by both parties. |
| `TRADE_CLOSED` | `CLOSED` | 0 | Clean resolution. Terminal. |
| `TRADE_CANCELLED` | `CANCELLED` | 2 | Cancellation. Terminal. |
| `TRADE_REJECTED` | `REJECTED` | 3 | Rejection (any path). Terminal. |
| `TRADE_DISPUTED` | `DISPUTED` | 3 | Active dispute raised. |
| `TRADE_ESCALATED` | `ESCALATED` | 4 | Platform intervention triggered. |
| `TRADE_LOCKED_PENDING_ESCALATION` | — (lock applied)  | 4 | Entity lock applied due to escalation. Separate emission. |
| `TRADE_UNLOCKED` | — (lock cleared) | 2 | Entity lock cleared by escalation resolution. |
| `TRADE_CANCELLED_POST_CONFIRMATION` | `CANCELLED` (from `ORDER_CONFIRMED` or later) | 3 | Qualified: post-commitment cancellation. Additional specificity. |

#### 6.3.2 Escrow Events

| Event Name | Trigger (to_state_key) | Severity | Notes |
|-----------|------------------------|----------|-------|
| `ESCROW_STATE_CHANGED` | Any transition | Matches state severity | Always emitted. Root event. |
| `ESCROW_INITIATED` | `INITIATED` | 1 | Escrow arrangement agreed and recorded. |
| `ESCROW_MILESTONE_PENDING` | `MILESTONE_PENDING` | 2 | Milestone conditions being tracked. |
| `ESCROW_RELEASE_PENDING` | `RELEASE_PENDING` | 3 | Milestones met; awaiting MC authorisation. |
| `ESCROW_STATE_RELEASED` | `RELEASED` | 3 | Settlement acknowledged. Terminal. External record. |
| `ESCROW_REFUNDED` | `REFUNDED` | 3 | Escrow unwound. Terminal. |
| `ESCROW_VOIDED` | `VOIDED` | 4 | Platform-forced void. Terminal. SuperAdmin action. |

#### 6.3.3 Certification Events

| Event Name | Trigger (to_state_key) | Severity | Notes |
|-----------|------------------------|----------|-------|
| `CERTIFICATION_STATE_CHANGED` | Any transition | Matches state severity | Always emitted. Root event. |
| `CERTIFICATION_SUBMITTED` | `SUBMITTED` | 1 | Tenant uploaded certification artefact. |
| `CERTIFICATION_UNDER_REVIEW` | `UNDER_REVIEW` | 1 | Reviewer assigned. |
| `CERTIFICATION_APPROVED` | `APPROVED` | 1 | Certification approved. |
| `CERTIFICATION_REJECTED` | `REJECTED` | 2 | Certification rejected. Irreversible on record. |
| `CERTIFICATION_REVOKED` | `REVOKED` | 4 | Active certification invalidated. Critical. SuperAdmin. |
| `CERTIFICATION_EXPIRED` | `EXPIRED` | 1 | Validity window elapsed. System-triggered. |

---

### 6.4 Mandatory Audit Event Payload Structure

Every audit event emitted by the state machine must conform to the following payload structure. This extends the existing `createAuthAudit()` pattern already in use in the codebase.

```typescript
// Design-only TypeScript interface — NOT an implementation
interface StateTransitionAuditPayload {
  // ── Identity ──────────────────────────────────────────────────
  action:            string;        // Event name, e.g. 'TRADE_ORDER_CONFIRMED'
  realm:             'TENANT' | 'CONTROL';

  // ── Tenant Attribution ────────────────────────────────────────
  org_id:            string;        // UUID — RLS boundary. MANDATORY.
  tenantId:          string;        // Alias for audit_logs.tenant_id column (same value as org_id)

  // ── Actor Attribution ─────────────────────────────────────────
  actor_id:          string | null; // User UUID. null for system-triggered transitions.
  actor_role:        string | null; // Role snapshot at time of event. null for system.

  // ── Entity ────────────────────────────────────────────────────
  entity_type:       string;        // 'trade' | 'escrow' | 'certification'
  entity_id:         string;        // UUID of the specific entity

  // ── Transition ────────────────────────────────────────────────
  from_state_key:    string | null; // Prior state key. null for initial state assignment.
  to_state_key:      string;        // New state key. Always present.
  transition_log_id: string;        // UUID of the state_transition_log row. Cross-reference.

  // ── Governance Flags ─────────────────────────────────────────
  is_irreversible:   boolean;       // Whether the target state is irreversible.
  is_terminal:       boolean;       // Whether the target state is terminal.
  escalation_triggered: boolean;    // Whether an escalation record was created.
  escalation_ref:    string | null; // UUID of escalation record, if triggered.
  maker_checker_ref: string | null; // UUID of MC request, if required.

  // ── Metadata ─────────────────────────────────────────────────
  reason:            string | null; // Transition reason (mandatory for irreversible/MC).
  ip:                string | null; // Client IP at time of request. null for system.
  user_agent:        string | null; // Client UA at time of request. null for system.
  request_id:        string;        // Trace UUID from DatabaseContext.requestId.
  occurred_at:       string;        // ISO 8601 timestamp. Set by service, not DB default.
}
```

**Mandatory fields (must be non-null for any valid event):**
`action`, `realm`, `org_id`, `entity_type`, `entity_id`, `to_state_key`, `transition_log_id`, `is_irreversible`, `is_terminal`, `escalation_triggered`, `request_id`, `occurred_at`

**Conditionally mandatory:**
- `reason`: required when `is_irreversible = true` OR `maker_checker_ref IS NOT NULL`
- `escalation_ref`: required when `escalation_triggered = true`
- `actor_id`: required for tenant-realm events; null only for system-triggered

---

### 6.5 Emission Guarantee Contract

The following invariants are constitutional commitments of the audit model. They must be verified by integration tests on Day 2.

| Invariant | Contract |
|-----------|---------|
| **One event per transition** | `COUNT(audit_logs WHERE transition_log_id = X) = 1` for every `state_transition_log` row |
| **No event without a log row** | Every audit event with a `transition_log_id` has a corresponding row in `state_transition_log` |
| **Atomic with transition** | Audit INSERT is in the same `$transaction` as log INSERT and entity update. Partial writes are impossible. |
| **Attributable** | `org_id IS NOT NULL` and (`actor_id IS NOT NULL` OR event is system-triggered with `actor_id = NULL AND actor_role = 'SYSTEM'`) |
| **No cross-tenant events** | `audit_logs.tenant_id = state_transition_log.org_id` — both reference the same org |
| **Immutable** | Audit event rows inherit `audit_logs` append-only enforcement (UPDATE USING false, DELETE USING false) |
| **Root event always present** | For every transition, `{DOMAIN}_STATE_CHANGED` is always emitted. Specific-verb events may additionally be emitted. |

---

### 6.6 Event Emission Sequence Within Transaction

The precise order of operations within the `StateMachineService.$transaction`:

```
$transaction start
  │
  ├── 1. SET LOCAL ROLE texqtic_app
  ├── 2. set_config('app.org_id', orgId, true)          ← RLS boundary
  ├── 3. set_config('app.actor_id', actorId, true)
  ├── 4. set_config('app.realm', realm, true)
  │
  ├── 5. READ allowed_transitions (validate edge)
  ├── 6. READ state_definitions (validate terminal, irreversible, MC requirement)
  ├── 7. [If MC required] READ maker_checker_requests (validate approval)
  ├── 8. [If entity lock] READ trades.locked_by_escalation_id (validate unlocked)
  │
  ├── 9.  INSERT state_transition_log row              ← forensic record
  ├── 10. UPDATE entity.current_state_id = to_state_id ← operational cursor
  │
  ├── 11. [If escalation_level >= 2] INSERT escalations row (G-022)
  ├── 12. [If locking] UPDATE entity.locked_by_escalation_id
  │
  ├── 13. INSERT audit_logs row (root event: *_STATE_CHANGED)  ← audit
  ├── 14. [If milestone event] INSERT audit_logs row (specific: TRADE_ORDER_CONFIRMED etc.)
  │
  └── COMMIT
       │
       On any failure at steps 9–14: ROLLBACK entire transaction.
       StateMachineService returns typed error. Entity state unchanged.
```

**Steps 1–8 are validation-only**. No writes occur during validation. If validation fails at any step, the transaction is aborted before any INSERT or UPDATE.

**Steps 9–14 are atomic writes**. They succeed together or fail together.

---

### 6.7 Existing Infrastructure Compatibility

The state machine's audit emission must use the existing `writeAuditLog()` function and `audit_logs` table already live in the codebase — NOT a new table.

**Existing `audit_logs` schema (relevant columns):**
- `tenant_id` — maps to `org_id` in the payload
- `action` — the event name string (e.g. `TRADE_ORDER_CONFIRMED`)
- `actor_id` — user UUID
- `realm` — `TENANT` or `CONTROL`
- `metadata JSONB` — carries the full structured payload (entity_id, from_state_key, to_state_key, transition_log_id, escalation_ref, etc.)

**Naming alignment:**
- Existing auth events: `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT` — uppercase snake_case, domain-prefixed
- State machine events: `TRADE_STATE_CHANGED`, `TRADE_ORDER_CONFIRMED` — same convention, domain-prefixed

No new audit infrastructure is needed. The state machine event emission slots into the existing `writeAuditLog()` call pattern.

---

*— End of Part 6: Audit Emission Model —*

---

## 7. Maker-Checker Integration (G-021 Linkage)

> **DESIGN-ONLY.** No G-021 tables created, no services implemented. This section defines the behavioral contract that G-020 (state machine) exposes to and expects from G-021 (Maker-Checker engine). G-021 is a separate governance item. This section is G-020's specification of how MC requirements affect transition flow.

### 7.1 What is Maker-Checker in This Context?

**Maker-Checker (MC)** is a dual-authorization control: a significant action requires two distinct, authenticated actors to authorize it before it executes. The "maker" initiates the action; the "checker" independently reviews and approves (or rejects) it. Neither actor can be both maker and checker for the same action.

In the G-020 state machine context, MC applies specifically to state transitions that are either:
- High-severity (entering a state with `requires_maker_checker = true` in `state_definitions`), or
- High-risk at the edge level (`allowed_transitions.requires_maker_checker = true` overriding the state default)

**MC does not mean a transition enters an intermediate "PENDING_APPROVAL" state in the trade/escrow/certification domain.**

This is a critical design decision that requires explicit statement:

> **The trade entity does NOT enter a `PENDING_APPROVAL` state during maker-checker review.** Instead, the transition is simply not executed until an approved MC request exists. The entity remains in its current state (`from_state`). The MC request is a separate governance record in the G-021 table. When the checker approves, the caller re-submits the transition with the `makerCheckerRef` — and only then does `StateMachineService.transition()` execute the state change.

This design preserves the simplicity of the trade state graph (no phantom intermediate states) while providing the full governance guarantee of dual authorization.

---

### 7.2 MC Resolution at State vs Edge Level

MC requirements can be specified at two levels, with the following precedence rules:

| Scenario | `state_definitions .requires_maker_checker` | `allowed_transitions .requires_maker_checker` | Effective Requirement |
|----------|----------------------------------------------|------------------------------------------------|-----------------------|
| State default only | `true` | `false` (default) | MC **required** — state default applies |
| Edge override more restrictive | `false` | `true` | MC **required** — edge override takes effect |
| Edge override more permissive | `true` | (not applicable — edge cannot relax a state requirement) | MC **required** — state default holds; edge cannot loosen |
| Neither requires MC | `false` | `false` | MC **not required** |

**Rule:** MC is required if EITHER the target state OR the specific edge requires it. A more permissive edge cannot override a state-level MC requirement. This is fail-closed: both conditions must be false for MC to be skipped.

---

### 7.3 The Maker-Checker Request Lifecycle (G-021 Ownership)

G-021 owns the MC request record. G-020 reads it but does not write it (except for the reference stored in `state_transition_log.maker_checker_ref` after the transition executes).

**G-021 MC request states (design intent — G-021 document defines authoritatively):**

```
PENDING    → APPROVED    (checker approves)
           → REJECTED    (checker rejects)
           → EXPIRED     (time window elapsed without checker action)
           → WITHDRAWN   (maker withdraws before checker acts)
```

**G-020's view of G-021:**
- G-020 only cares about: `status = 'APPROVED'`
- Any other status (`PENDING`, `REJECTED`, `EXPIRED`, `WITHDRAWN`) = `MAKER_CHECKER_REQUIRED` rejection from `StateMachineService`
- G-020 does not query MC request history, does not participate in the maker/checker interaction, and does not know the identity of the checker beyond what is stored in the MC request record

---

### 7.4 MC-Gated Transition Flow (Step by Step)

The following describes the complete actor-facing flow for an MC-required transition. This is a behavioral specification, not an implementation.

#### Step 1 — Maker Initiates

Actor (maker) calls an API endpoint that invokes `StateMachineService.transition()` with no `makerCheckerRef`.

Service detects `requires_maker_checker = true` for the target state or edge.

Service returns `{ success: false, code: 'MAKER_CHECKER_REQUIRED', hint: 'Submit a maker-checker request via G-021 to proceed.' }`.

**No state change occurs.** The entity remains in `from_state`. No log row written. No audit event emitted.

#### Step 2 — Maker Creates MC Request (G-021)

The maker calls the G-021 API to create a `maker_checker_request`:

```
POST /api/control/maker-checker-requests
{
  entity_type: 'trade',
  entity_id:   '<trade-uuid>',
  action:      'STATE_TRANSITION',
  from_state_key: 'APPROVED',
  to_state_key:   'ORDER_CONFIRMED',
  org_id:      '<org-uuid>',
  reason:      'Both parties have agreed on all terms. Confirming order.',
  metadata:    { ... }
}
→ { maker_checker_request_id: '<mc-uuid>', status: 'PENDING' }
```

G-021 records the request. G-021 notifies the designated checker (notification mechanism is G-021's responsibility).

**The trade entity still has `current_state_id = APPROVED`.** Nothing has changed in the trade domain.

#### Step 3 — Checker Reviews and Approves (G-021)

The checker (a different actor, different session, same or higher role) calls G-021 to review the request:

```
POST /api/control/maker-checker-requests/<mc-uuid>/approve
{ reason: 'Terms confirmed; order conditions verified.' }
→ { status: 'APPROVED', approved_at: '<timestamp>' }
```

G-021 records the approval. The MC request `status` is now `APPROVED`.

**The trade entity still has `current_state_id = APPROVED`.** The MC approval alone does not change the trade state — the maker must complete the transition.

#### Step 4 — Maker Completes the Transition

The maker (or an automated process) re-calls `StateMachineService.transition()`, now providing the `makerCheckerRef`:

```
StateMachineService.transition({
  orgId:            '<org-uuid>',
  entityType:       'trade',
  entityId:         '<trade-uuid>',
  toStateKey:       'ORDER_CONFIRMED',
  actorId:          '<maker-user-uuid>',
  actorRole:        'OWNER',
  realm:            'tenant',
  reason:           'Both parties agreed; MC approval obtained.',
  makerCheckerRef:  '<mc-uuid>',
})
```

Service validates:
1. Edge `APPROVED → ORDER_CONFIRMED` exists in `allowed_transitions` ✓
2. `ORDER_CONFIRMED.requires_maker_checker = true` ✓
3. `makerCheckerRef` is provided ✓
4. G-021 record `<mc-uuid>` has `status = 'APPROVED'` ✓
5. G-021 record references same `entity_id` and `to_state_key = 'ORDER_CONFIRMED'` ✓
6. Maker and checker are different actors ✓ (G-021 enforces this; G-020 trusts the APPROVED status)

Service proceeds: log INSERT + entity UPDATE + audit emit, all within one transaction.

Result: `{ success: true, newStateKey: 'ORDER_CONFIRMED', logId: '<log-uuid>', escalationTriggered: false }`.

---

### 7.5 Pending vs Executed — Log Distinction

The `state_transition_log` records only **executed** transitions. There is no "pending MC" row in this table. The pending state is entirely within G-021.

This is a deliberate design choice:

| Record Type | Table | Status |
|------------|-------|--------|
| MC request awaiting checker approval | G-021 `maker_checker_requests` | `PENDING` |
| Checker rejection of MC request | G-021 `maker_checker_requests` | `REJECTED` |
| Executed transition (MC approved) | G-020 `state_transition_log` | Permanent (append-only) |
| Failed transition attempt (no MC ref) | — | Not recorded in log (no entry created for rejected attempts) |

**Audit trail for failed MC attempts:**
Failed `StateMachineService.transition()` calls that return `MAKER_CHECKER_REQUIRED` are logged in `audit_logs` as `TRADE_TRANSITION_REJECTED` events (NOT `TRADE_STATE_CHANGED`), with `metadata.rejection_code = 'MAKER_CHECKER_REQUIRED'` and `metadata.to_state_key = 'ORDER_CONFIRMED'`. This creates an audit trail of attempted transitions without creating false entries in `state_transition_log`.

**Audit trail for checker rejections:**
G-021 emits `MAKER_CHECKER_REJECTED` audit events when a checker rejects an MC request. G-020 does not need to emit anything — the trade entity was never touched.

---

### 7.6 Same-Actor Guard (Maker ≠ Checker)

G-021 enforces that the maker and checker are different actors. G-020 trusts this enforcement via the `APPROVED` status.

However, G-020 includes a **secondary guard** at the transition completion step: if `makerCheckerRef` is provided and the `maker_checker_request.maker_user_id = actorId` (the person completing the transition is the same person who created the MC request), `StateMachineService` returns `{ code: 'MAKER_CHECKER_SAME_ACTOR' }` and rejects the transition.

This provides defense-in-depth: even if G-021 were to incorrectly mark a self-approved MC as `APPROVED`, G-020 would still block it at the transition boundary.

---

### 7.7 MC Requirements by Transition (Summary Table)

This table consolidates MC requirements from §1's transition maps for rapid reference.

| Domain | From → To | MC Required | Level | Rationale |
|--------|-----------|------------|-------|-----------|
| trade | `PENDING_COMPLIANCE → APPROVED` | Yes (state) | 2 | Compliance clearance requires dual-reviewer sign-off |
| trade | `PENDING_COMPLIANCE → REJECTED` | Yes (edge) | 3 | Rejection is irreversible; requires independent confirmation |
| trade | `APPROVED → ORDER_CONFIRMED` | Yes (state) | 2 | Irreversible commitment; highest-consequence trade transition |
| trade | `APPROVED → CANCELLED` | Yes (edge) | 3 | Post-approval cancellation; escalation-adjacent |
| trade | `ORDER_CONFIRMED → CANCELLED` | Yes (edge) | 3 | Post-commitment cancellation; exceptional; SuperAdmin-level |
| trade | `SETTLEMENT_PENDING → SETTLEMENT_ACKNOWLEDGED` | Yes (state) | 3 | Financial settlement acknowledgement; dual confirmation |
| trade | `ESCALATED → CLOSED` | Yes (edge) | 4 | Platform resolution of escalated trade; SuperAdmin dual-auth |
| trade | `ESCALATED → CANCELLED` | Yes (edge) | 4 | Forced cancellation via escalation; SuperAdmin dual-auth |
| escrow | `INITIATED → *` | Yes (state) | 1 | All escrow transitions beyond initiation require dual-auth |
| escrow | `RELEASE_PENDING → RELEASED` | Yes (state) | 3 | Settlement acknowledgement release; irreversible |
| escrow | `RELEASE_PENDING → REFUNDED` | Yes (state) | 3 | Escrow unwind; irreversible |
| escrow | `* → VOIDED` | Yes (edge) | 4 | Any void is a SuperAdmin-level irreversible action |
| certification | `UNDER_REVIEW → APPROVED` | Yes (state) | 1 | Approval requires independent reviewer confirmation |
| certification | `UNDER_REVIEW → REJECTED` | Yes (state) | 2 | Rejection is irreversible on record |
| certification | `APPROVED → REVOKED` | Yes (edge) | 4 | Revocation of active certification; critical; SuperAdmin |

---

### 7.8 MC Timeout and Expiry Behavior

MC requests have an expiry window (defined in G-021). If a checker does not act within the window:

- G-021 transitions the MC request to `EXPIRED`.
- G-020 is unaffected: the entity remains in `from_state`.
- If the transition is time-sensitive (e.g. `PENDING_COMPLIANCE` SLA), the background job (§5.8) may independently escalate the entity to `ESCALATED` via a system-triggered transition — separate from the MC expiry.
- The maker must create a new MC request if they wish to retry the transition.

**G-020 never reads MC request `EXPIRED` as a terminal condition for the trade.** The trade entity's fate is determined only by its own state graph and valid `StateMachineService.transition()` calls. An expired MC request is G-021's concern; it does not automatically move, lock, or notify the trade entity.

---

### 7.9 G-021 Interface Contract (G-020's Consumption Boundary)

G-020 reads G-021 data at one point only: during `StateMachineService.transition()` validation (step 7 in the §6.6 transaction sequence), when `requires_maker_checker = true`.

```typescript
// G-020 reads from G-021 at transition validation time:
MakerCheckerService.getApprovedRequest({
  entityId:    string,   // trade/escrow/certification UUID
  toStateKey:  string,   // target state key being requested
  requestId:   string,   // the makerCheckerRef provided by caller
}): Promise<{
  valid:        boolean;
  makerId:      string | null;   // For same-actor guard
  checkerId:    string | null;
  approvedAt:   string | null;
  reason:       string | null;
} | null>

// Returns null if:
//   - requestId not found
//   - status != 'APPROVED'
//   - entity_id or to_state_key mismatch
//   - request is expired
// StateMachineService treats null as MAKER_CHECKER_REQUIRED rejection.
```

G-020 writes to G-021 data at one point only: after a successful transition, it stores `maker_checker_request.id` in `state_transition_log.maker_checker_ref`. This is a read-only reference — G-020 does not mutate the G-021 record.

**G-021 is independently deployable.** G-020 degrades gracefully if the MC service is unavailable: it returns `{ code: 'MAKER_CHECKER_SERVICE_UNAVAILABLE' }` and does NOT fall through to allow the transition. Fail-closed.

---

*— End of Part 7: Maker-Checker Integration —*

---

## 8. Doctrine Compliance Validation

> **DESIGN-ONLY.** This section is the constitutional self-audit of G-020 against TexQtic Doctrine v1.4, G-015 organizations canonicalization (Phase C verified), and the platform's foundational governance constraints. Every claim is cross-referenced to its enforcement mechanism in earlier sections. No implementation, no schema changes.

### 8.1 Compliance Check 1 — All Transitions Scoped by `org_id`

**Doctrine requirement:** Every operation that touches tenant data must be scoped by `org_id` (canonical `organizations.id`). No tenant operation may occur without an explicit, validated `org_id` in context. `app.org_id` is the single authoritative session variable. Reference: Doctrine v1.4 §11.3, G-015 Phase C §6.

**G-020 compliance:**

| Mechanism | How org_id Scoping is Enforced | Section |
|-----------|-------------------------------|---------|
| `StateMachineService.transition()` signature | `orgId` is a mandatory, non-optional parameter with no default. Callers must supply it. | §3.6 |
| `buildContextFromRequest()` | Extracts `orgId` from `req.tenantId` (decorated by `tenantAuthMiddleware` from JWT claim). Throws fail-closed if missing. | §3, §6.6 |
| `withDbContext()` | Sets `app.org_id` via `set_config('app.org_id', context.orgId, true)` before any query executes. | §3.4 |
| `state_transition_log.org_id` | Every log row carries `org_id NOT NULL FK → organizations.id`. No log row can be written without `org_id`. | §2.4 |
| RLS on `state_transition_log` | `SELECT` policy: `org_id::text = current_setting('app.org_id', true)`. Tenant can only read own org's log. | §2.4 |
| Entity validation | `StateMachineService` validates that `entity_id` belongs to `orgId` before any transition executes. Cross-org entity references return `CROSS_TENANT_DENIED`. | §3.6 |
| Audit events | Every audit event payload carries `org_id` and `tenantId` (same value). No audit event is written without these fields. | §6.4 |

**Verdict: COMPLIANT.** `org_id` is a mandatory parameter at every entry point. It flows through context, DB session variable, log column, RLS policy, and audit payload without interruption.

---

### 8.2 Compliance Check 2 — No Cross-Tenant Transitions

**Doctrine requirement:** No data from tenant A may be readable or modifiable by tenant B under any circumstance, including by platform administrators acting without explicit escalation authorization. Cross-tenant access is a zero-tolerance constitutional failure. Reference: Doctrine v1.4 §2, G-015 §6 (API layer chain).

**G-020 compliance:**

| Risk Scenario | Mitigation | Section |
|--------------|------------|---------|
| Actor from tenant A attempts to transition entity owned by tenant B | `StateMachineService` reads the entity and verifies `entity.org_id = context.orgId`. Mismatch → `CROSS_TENANT_DENIED`. No state change. | §3.6 |
| Direct Prisma call bypasses service, attempts cross-org entity update | RLS policy on entity tables (`trades`, etc.): `tenant_id::text = current_setting('app.org_id', true)`. Cross-tenant UPDATE is blocked at DB. | §3.4 |
| `state_transition_log` cross-tenant read | RLS SELECT policy: `org_id::text = current_setting('app.org_id', true)`. A tenant can never read another tenant's transition history. | §2.4 |
| MC request created for entity in different org | G-021 enforces entity ownership at MC request creation. G-020's `MakerCheckerService.getApprovedRequest()` validates `entity_id` matches — a MC request for org A's entity cannot satisfy a transition attempt for org B's entity. | §7.9 |
| Escalation record cross-tenant | `escalations.org_id` is set from `context.orgId` at creation. G-022 RLS scopes escalation reads the same way. G-020 passes `orgId` to `EscalationService.createFromTransition()`. | §5.3 |
| System-triggered transitions (background job) | Background job calls `StateMachineService.transition()` with an explicit `orgId` sourced from the entity record. The job never synthesizes an `orgId` — it always reads it from the entity being transitioned. | §5.8 |

**Verdict: COMPLIANT.** Cross-tenant transitions are blocked at two independent layers: service-level entity ownership validation and DB-level RLS. No request path exists that permits cross-tenant state mutation.

---

### 8.3 Compliance Check 3 — No Admin Override Without Explicit Escalation Record

**Doctrine requirement:** No platform administrator may perform a consequential action — particularly one that would override a constitutional invariant (irreversibility, terminal state, Maker-Checker gate) — silently or without a traceable record. Every override must be preceded by and linked to an approved escalation record. Reference: Doctrine v1.4 §2, §4.5 (this document).

**G-020 compliance:**

| Override Scenario | Enforcement | Evidence |
|------------------|-------------|--------|
| SuperAdmin attempts to re-open a `CLOSED` trade | Blocked: no edge in `allowed_transitions` from `CLOSED`. DB trigger backstop. Returns `TRANSITION_FROM_TERMINAL`. No escalation record would change this — terminal is structural. | §4.2 |
| SuperAdmin attempts to cancel a post-`ORDER_CONFIRMED` trade | Requires: (a) G-022 severity-4 escalation record with `APPROVED_FOR_OVERRIDE`, (b) G-021 MC record with dual `SUPER_ADMIN` approval. Without both: `TRANSITION_NOT_PERMITTED` or `MAKER_CHECKER_REQUIRED`. | §4.5, §7.4 |
| SuperAdmin resolves an `ESCALATED` trade to `CLOSED` | Requires the entity's `locked_by_escalation_id` escalation to be in `RESOLVED` status in G-022. The resolution action is itself logged in G-022 with actor identity. Then normal `StateMachineService.transition()` executes and is logged in `state_transition_log`. | §5.4 |
| Admin reads another tenant's state history | Blocked by RLS: `state_transition_log` SELECT requires `app.org_id` match OR `app.is_admin = 'true'`. Admin reads are logged via audit trail in control-plane realm. | §2.4, §6.3 |
| System-level "administrative" state correction (data fix) | No such path exists in the design. The only mechanism for corrective action is: create a new entity from `DRAFT` and reference the old entity in metadata. The old entity's history is inviolable. | §4.2 |
| Override without linked escalation ref in log | Impossible: `StateMachineService` validates the escalation ref exists and is `APPROVED_FOR_OVERRIDE` before the transition is allowed. If it proceeds, `state_transition_log.escalation_ref` is populated. If the write somehow omitted it, the audit event payload would be missing `escalation_ref` despite `escalation_triggered = true` — caught by the invariant check in §6.5. | §4.5, §5.3, §6.5 |

**Verdict: COMPLIANT.** No override path exists without a pre-created, approved escalation record linked in the transition log. Silent overrides are structurally impossible.

---

### 8.4 Compliance Check 4 — No Hidden State Mutation Paths

**Doctrine requirement:** The current state of any entity must be deterministic, observable, and auditable. There must be no code path, background process, trigger, or administrative operation that changes `current_state_id` without a corresponding `state_transition_log` entry and audit event. Reference: §6.5 emission guarantee contract.

**G-020 compliance:**

| Mutation Path | Is It Hidden? | Enforcement |
|--------------|--------------|-------------|
| `StateMachineService.transition()` — normal path | No. Log INSERT, entity UPDATE, audit INSERT are atomic in one transaction. | §6.6 |
| Direct `prisma.trade.update({ current_state_id })` from route handler | Potentially — mitigated by: (a) ESLint/grep CI rule flagging direct `current_state_id` writes outside `StateMachineService`, (b) DB trigger blocking if target is a terminal state, (c) no log row = detectable inconsistency in `state_transition_log` vs entity state. | §3.5 |
| Background job (timeout escalation) | Not hidden. Job calls `StateMachineService.transition()` with `actorId = null, realm = 'control'`. Same atomic path as interactive transitions. | §5.8 |
| DB trigger (terminal state backstop) | Not a mutation trigger — it is a rejection trigger. It BLOCKS mutations, it does not create them. It never changes `current_state_id`. | §3.4 |
| Trigger `sync_tenants_to_organizations()` | Unrelated to state machine. Syncs `tenants → organizations` on tenant creation/update. Does not touch any state machine table. | G-015 §3 |
| Seed operations (`withBypassForSeed`) | Production guard enforced: `NODE_ENV !== 'test'` throws immediately. Cannot be invoked in production. State machine tables are seeded only via governance migrations (not runtime bypass). | G-015 §4 |
| Escalation status change in G-022 | G-022 updates `escalations.status`. This does NOT mutate `state_transition_log` or entity `current_state_id`. It only unlocks the entity for future transitions via `locked_by_escalation_id` being clearable. The unlock itself is a distinct `StateMachineService` call. | §5.4 |
| MC approval in G-021 | G-021 updates `maker_checker_requests.status`. This does NOT mutate entity state. The maker must still call `StateMachineService.transition()` after MC approval. The transition is the mutation — it creates the log row. | §7.4 |

**Inconsistency detection:** If for any reason `entity.current_state_id` diverges from the latest `state_transition_log.to_state_id` for that entity, this is detectable via a consistency check query. The design intent is that a monitoring job (future) periodically runs this check and raises a severity-4 escalation for any divergent entity. This is an operational safeguard, not a constitutional dependency.

**Verdict: COMPLIANT.** The only code path that legitimately mutates `current_state_id` is `StateMachineService.transition()`, which is atomic with log creation and audit emission. All other paths either do not mutate state, or are guarded by CI rules plus DB-level backstops.

---

### 8.5 Compliance Check 5 — Non-Fintech Constraint (Escrow)

**Doctrine requirement:** TexQtic is a trade facilitation platform, not a payment processor or financial institution. No component may move, hold, transfer, or instruct the movement of funds. Reference: `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md §IV`.

**G-020 compliance:**

| Risk | Mitigation |
|------|------------|
| `escrow_state = RELEASED` implies fund movement | Explicitly defined as an acknowledgement record only. The `RELEASED` state records that an external settlement event has been acknowledged between parties. It does not instruct any payment rail, hold any funds, or communicate with any financial system. | §1.3 |
| `REFUNDED` state suggests fund reversal | Same constraint. A `REFUNDED` escrow record acknowledges that parties have agreed the escrow arrangement is unwound. Actual fund movement, if any, is outside TexQtic's system boundary and outside G-020's scope entirely. | §1.3 |
| Future escrow tables could accumulate monetary data | The `escrow_state` domain is intentionally limited to structural/acknowledgement columns. No `amount`, `currency`, `bank_account`, `payment_rail` fields are included in this design. Any Day 2 escrow table design that introduces monetary fields must undergo a separate FinTech Doctrine Review before migration. | §1.3 |

**Verdict: COMPLIANT.** The escrow state domain is a record-keeping and acknowledgement model. No fund movement logic is designed, implied, or possible within G-020's scope.

---

### 8.6 Compliance Check 6 — Anti-Bazaar Constitutional Alignment

**Doctrine requirement:** TexQtic is a structured, permissioned B2B trade platform. It must not become an open listing marketplace where arbitrary counterparties can initiate trades without governance gates. Every trade must be initiated within a governance context (org membership, compliance gates, certification requirements). Reference: `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md §I`, Dashboard Anti-Drift Checklist §V.

**G-020 compliance:**

| Risk | Mitigation |
|------|------------|
| Trade can be initiated from `DRAFT` directly without compliance gate | `DRAFT → ORDER_CONFIRMED` is a prohibited shortcut (§1.2.2). Compliance gate (`PENDING_COMPLIANCE → APPROVED`) is a mandatory path node before `ORDER_CONFIRMED`. | §1.2, §4 |
| Any authenticated user can trigger high-consequence transitions | `actor_roles_permitted` on `allowed_transitions` restricts which roles may trigger each edge. `ORDER_CONFIRMED` requires `OWNER` or `ADMIN`. MC further requires a second actor. | §2.3 |
| Public/unauthenticated access to state machine | `StateMachineService.transition()` requires `actorId`, `actorRole`, and `realm` — sourced from authenticated JWT context. No unauthenticated call path exists. | §3.6 |
| Trade entities created outside org membership context | Entity creation (not covered in G-020 — this is trade entity management) must validate org membership before creating a `DRAFT` trade. G-020 enforces that the `org_id` on the entity matches context. Cross-org entity creation would be rejected by entity ownership validation. | §3.6, §8.2 |

**Verdict: COMPLIANT.** The state machine structurally enforces the governance path. Open-listing behavior (direct `DRAFT → ORDER_CONFIRMED`) is impossible by design.

---

### 8.7 Acceptance Criteria — Day 1 Gate

The following criteria must ALL be satisfied before G-020 advances to Day 2 (migration authoring). This list is the constitutional review checklist.

| # | Criterion | Status |
|---|-----------|--------|
| 1 | State domains complete: `trade_state` (14 states), `escrow_state` (7 states), `certification_state` (6 states) | ✅ Defined in §1 |
| 2 | Transition table model defined: `state_definitions`, `allowed_transitions`, `state_transition_log` with all columns, constraints, and RLS model | ✅ Defined in §2 |
| 3 | Enforcement strategy justified with Option A/B/C comparison; single recommendation with rationale | ✅ Option C selected in §3 |
| 4 | Irreversibility model clear: terminal vs irreversible distinction, rollback prevention matrix, exceptional override protocol | ✅ Defined in §4 |
| 5 | Escalation linkage defined (G-022): severity classification, auto-escalation hook, transition locking, edge registry | ✅ Defined in §5 |
| 6 | Audit model: event naming convention, full event catalogue, mandatory payload, emission guarantee contract, transaction sequence | ✅ Defined in §6 |
| 7 | Maker-Checker compatibility explicit: no phantom states, 4-step actor flow, pending vs executed log distinction, same-actor guard, G-021 interface contract | ✅ Defined in §7 |
| 8 | No schema changes committed | ✅ Design-only document |
| 9 | All transitions scoped by `org_id` | ✅ Verified in §8.1 |
| 10 | No cross-tenant transitions possible | ✅ Verified in §8.2 |
| 11 | No admin override without explicit escalation record | ✅ Verified in §8.3 |
| 12 | No hidden state mutation paths | ✅ Verified in §8.4 |
| 13 | Non-fintech constraint respected (escrow = acknowledgement only) | ✅ Verified in §8.5 |
| 14 | Anti-bazaar alignment confirmed (no shortcut to ORDER_CONFIRMED) | ✅ Verified in §8.6 |

**All 14 criteria met. G-020 Day 1 gate: PASS.**

---

### 8.8 Open Items and Day 2 Dependencies

The following items are intentionally deferred to Day 2 and must NOT be assumed to be in scope of Day 1:

| Item | Owner | Dependency |
|------|-------|-----------|
| SQL migration for `state_definitions`, `allowed_transitions`, `state_transition_log` | G-020 Day 2 | Constitutional review approval of this document |
| `StateMachineService` TypeScript implementation | G-020 Day 2 | Migration applied + Prisma client updated |
| ESLint rule / CI grep guard for direct `current_state_id` writes | G-020 Day 2 | Service implementation complete |
| DB trigger: `BEFORE UPDATE OR DELETE ON state_transition_log` (append-only backstop) | G-020 Day 2 | Migration applied |
| DB trigger: `BEFORE UPDATE ON trades` terminal state guard | G-020 Day 2 | Migration applied |
| G-021 Maker-Checker table design and service | G-021 (separate) | G-020 Day 1 approval |
| G-022 Escalation Engine table design and service | G-022 (separate) | G-020 Day 1 approval |
| Background timeout job for SLA-based auto-escalation | G-020 / G-022 | Both engine designs approved |
| Prisma schema update to add `Organization` model | G-015 FLAG-1 follow-on | G-015 Phase C Day 2 |
| Entity tables (`trades`, `escrow_records`, `certifications`) with `current_state_id` FK | Trade domain Day 2 | G-020 migration applied |
| `locked_by_escalation_id` column on entity tables | G-022 Day 2 | G-022 design approved |
| Consistency check monitoring job | Ops / G-020 | Service implementation complete |

---

### 8.9 G-020 Document Status

| Field | Value |
|-------|-------|
| **Design status** | COMPLETE — ready for constitutional review |
| **Schema changes committed** | NONE |
| **Files modified** | `docs/governance/G-020_STATE_MACHINE_DESIGN.md` only |
| **Gate** | Day 1 acceptance criteria: 14/14 PASS |
| **Next action** | Paste this document for constitutional review → stress-test transition logic → approve or refine |
| **Day 2 gate** | Constitutional review approval + no unresolved design questions |

---

*— End of Part 8: Doctrine Compliance Validation —*

*— G-020 Design Document COMPLETE —*

---

*Document cross-references: `docs/DOCTRINE_ADDENDUM_POSITIONING_MONEY.md` · `docs/DASHBOARD_MATRIX_CONTROL_TENANT_WL.md` · `shared/contracts/rls-policy.md` · `server/prisma/rls.sql` · G-015 Phase C Validation Report · Doctrine v1.4*
