# TEXQTIC PLATFORM DOCTRINE v1.3

> ℹ️ HISTORICAL DOCTRINE — READ-ONLY CONTEXT, NOT EXECUTABLE

**Focus:** Enforcement Primitives (Doctrine → Code)

**Status:** LOCKED (Execution-Binding)

---

## 0. Purpose of v1.3

TexQtic v1.3 translates doctrine into non-negotiable system primitives. This document defines how governance, risk, AI authority, and kill-switches are enforced at the level of:

- Feature Flags
- Roles & Authorization (Authz)
- Row-Level Security (RLS)
- Event Types & State Machines

**If v1.1–v1.2 define what and why, v1.3 defines how the system physically prevents violation.**

---

## 1. Enforcement Architecture Overview

TexQtic enforcement follows a layered, fail-closed model:

1. **Feature Flags** – What actions are even possible
2. **Authorization (Authz)** – Who may attempt an action within a tenant context
3. **RLS Policies** – What data can be seen or mutated
4. **State Machines & Events** – What transitions are allowed

**Violation at any layer halts execution.**

---

## 2. Feature Flags (Control Plane)

Feature flags are Control Plane–owned, environment-scoped, and immutable by tenants.

### 2.1 Governance-Critical Flags

| Flag | Description |
|---|---|
| `OP_PLATFORM_READ_ONLY` | Activates Read-Only Mode |
| `OP_PLATFORM_APPROVAL_ONLY` | Requires Checker approval for all state changes |
| `OP_AI_AUTOMATION_ENABLED` | Enables AI guardrails |
| `OP_CERTIFICATION_ACCEPTANCE_ENABLED` | Allows new certifications |
| `OP_TRANSACTION_EXECUTION_ENABLED` | Allows trade execution |
| `OP_JURISDICTION_ENABLED:{ISO}` | Enables activity per geography |

Operational flags are distinct from experimental flags and may only be modified by the **Risk & Compliance Authority**.

### 2.2 Flag Lifecycle Discipline

Every feature flag must define:

- Primary owner
- Intended lifespan
- Expiration or removal condition

Stale flags trigger automated review alerts.

---

## 3. Identity, Authentication, and Authorization

### 3.1 Authentication vs Authorization

- **Authentication (Authn)** is global: one user, one identity
- **Authorization (Authz)** is tenant-scoped and session-bound

All permissions are evaluated using tenant-specific roles active in the current session context.

### 3.2 Role Model

#### Control Plane Roles

| Role | Authority |
|---|---|
| `DOCTRINE_COUNCIL` | Doctrine ratification & override |
| `RISK_COMPLIANCE_AUTHORITY` | Kill-switches, sanctions |
| `SYSTEM_INTEGRITY` | Technical & AI freezes |

#### Tenant Roles

| Role | Authority |
|---|---|
| `SUPPLIER_ADMIN` | Listings & compliance |
| `BUYER_ADMIN` | Procurement |
| `TENANT_OPERATOR` | Operational actions |

**Tenants can never acquire Control Plane roles.**

---

## 4. Row-Level Security (RLS) Invariants

### 4.1 Core Invariants

- All tenant tables include `org_id`
- `org_id` is provided as a custom JWT claim
- RLS filters use `(auth.jwt() ->> 'org_id')::uuid`
- Cross-tenant joins are forbidden

### 4.2 Privileged Access

Complex administrative predicates are encapsulated in `SECURITY DEFINER` functions (e.g., `is_global_admin()`).

Only Control Plane service roles may bypass RLS.

### 4.3 Kill-Switch RLS Effects

| Mode | RLS Behavior |
|---|---|
| **Read-Only** | Deny INSERT / UPDATE / DELETE |
| **Approval-Only** | Writes require Checker event |
| **Tenant Kill** | All access denied except audit reads |

---

## 5. Events and State Machines

**If an action does not emit an event, it did not occur.**

Events are append-only and immutable.

### 5.1 Append-Only Event Store

- `INSERT` allowed for authenticated actors
- `UPDATE` / `DELETE` denied for all except Control Plane service role
- Events form the legal and regulatory audit trail

### 5.2 State Machine Enforcement

All complex workflows (trade, escrow, certification) are implemented as explicit state machines.

State transitions:

- Are enforced at the database level
- Reject forbidden transitions
- Require prerequisite events

**Example:** escrow release is impossible without a verified inspection event.

### 5.3 Event Types

#### Governance & Sanctions

- `KILL_SWITCH_ACTIVATED`
- `KILL_SWITCH_RELEASED`
- `SANCTION_APPLIED`
- `SANCTION_DECAY_TIMER_UPDATED`
- `TENANT_PERMANENTLY_OFFBOARDED`

#### Trade & Compliance

- `CERTIFICATION_VERIFIED`
- `CERTIFICATION_SUSPENDED`
- `CERTIFICATION_VALIDITY_OVERRIDE`
- `TRANSACTION_APPROVED`
- `ESCROW_FUNDS_RELEASED`

#### AI

- `AI_SCORE_GENERATED`
- `AI_DECISION_APPLIED`
- `AI_OVERRIDE_BY_HUMAN`
- `AI_DRIFT_DETECTED`

### 5.4 Explainability as an Event Primitive

Every `AI_DECISION_APPLIED` event must include:

- `reasoning_hash` or
- Pointer to a human-readable audit artifact

**Events without explainability metadata are invalid.**

---

## 6. Irreversibility Matrix (Maker–Checker)

Certain events are tagged `IRREVERSIBLE=true` and require dual authorization.

### 6.1 Threshold-Based Dual Authorization

Events exceeding defined monetary or risk thresholds automatically require Maker–Checker approval.

**Examples:**

- Escrow release > $5,000
- Permanent tenant bans

### 6.2 Segregation of Duties

The system enforces:

- `maker_id != checker_id`
- Independent session validation

### 6.3 Irreversible Event List

At minimum:

- `ESCROW_FUNDS_RELEASED`
- `TENANT_PERMANENTLY_OFFBOARDED`
- `CERTIFICATION_VALIDITY_OVERRIDE`
- `PLATFORM_WIDE_KILL_SWITCH_ACTIVATED`

---

## 7. Doctrine Drift Detection (Executable)

Doctrine drift is detected when:

- Bypass revenue > compliance revenue
- Manual overrides exceed thresholds
- Kill-switch frequency spikes

Detection triggers mandatory Doctrine Council review.

---

## 8. Audit and the Morgue

All Level 1+ events automatically generate:

- Immutable timelines
- Root-cause classifications
- Remediation records

Stored in **The Morgue**, accessible to governance bodies and regulators.

---

## 9. Final Enforcement Principle

**If doctrine cannot be enforced in code, it is not doctrine.**

---

**End of Document — TEXQTIC PLATFORM DOCTRINE v1.3**
