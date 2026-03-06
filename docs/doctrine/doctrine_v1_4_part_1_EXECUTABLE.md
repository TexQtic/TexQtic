# TEXQTIC PLATFORM DOCTRINE v1.4 (Part 1)

> ⚠️ EXECUTABLE DOCTRINE — ENGINEERING MUST IMPLEMENT EXACTLY AS WRITTEN

**Status:** LOCKED (Execution-Binding)

**Subtitle:** The Operating System for Verified Global Trade

---

## 0. Preamble: The Mission of Structural Truth

TexQtic exists because global trade—especially textiles—runs on **trust theater**: PDFs that can be forged, audits that can't be traced, and promises that vanish when regulators arrive.

TexQtic v1.4 moves beyond policy into **Structural Truth**. This version defines the minimum, irreducible data structures and event schemas required to make trade real, auditable, and regulator-proof.

---

## 1. Canonical Data Principles

### 1.1 Event-First, State-Derived

Events are the sole source of truth. State (the columns in business tables) is a projection. **No data is "true" unless it has immutable event provenance.**

### 1.2 Single Ownership of Truth

Each canonical object has one authoritative table. No shadow copies or denormalized truth are permitted without checksum linkage to canonical records.

### 1.3 Explicit Time

All canonical records must include `created_at`, `effective_at`, and `superseded_at`. **Time ambiguity is a systemic risk.**

### 1.4 Org-Scoped by Default

All tenant data is physically and logically isolated via `org_id`, enforced by Row-Level Security (RLS). **Cross-tenant joins are forbidden.**

---

## 2. Enforcement Primitives: The Layered Model

Execution is physically prevented from violating doctrine through:

- **Feature Flags:** System-wide controls (e.g., `OP_PLATFORM_READ_ONLY`, `OP_AI_AUTOMATION_ENABLED`) owned by the Control Plane.

- **Roles & Authority:** Hierarchical roles (e.g., `DOCTRINE_COUNCIL`, `SUPPLIER_ADMIN`). Authorization is strictly tenant-scoped and session-bound.

- **RLS Policies:** Mandatory for all tenant-scoped data; cross-tenant joins are forbidden.

- **Maker–Checker Pattern:** Any high-stakes/irreversible event (e.g., `ESCROW_FUNDS_RELEASED`) requires a dual signature: a Maker (initiator) and an independent Checker (approver).

---

## 3. Core Structural Tables

### 3.1 organizations

**Purpose:** Tenant boundary and liability container.

**Key Columns:** `id` (uuid), `org_type`, `risk_score`, `status` (active|restricted|banned), `created_at`

**Invariant:** `status = banned` is irreversible except via a dual-signed `DOCTRINE_OVERRIDE` event.

### 3.2 traceability_nodes

**Purpose:** Supply chain graph nodes linking field to factory.

**Key Columns:** `id`, `org_id`, `batch_id`, `node_type`, `geo_hash`, `visibility_level`, `version_id`, `created_at`, `effective_at`, `superseded_at`

**Invariant:** Visibility is monotonic (anonymous → shielded → public); downgrades require governance review and a dual-signed override.

### 3.3 traceability_edges

**Purpose:** Supply chain relationships and custody flows.

**Key Columns:** `id`, `org_id`, `from_node_id`, `to_node_id`, `material_type`, `created_at`, `effective_at`, `superseded_at`

**Invariant:** Graph cycles are forbidden. Missing edges invalidate downstream Digital Product Passport (DPP) claims.

---

## 4. Trade and Financial Structures

### 4.1 trades

**Purpose:** The contractual unit of commerce.

**Key Columns:** `id`, `buyer_org_id`, `supplier_org_id`, `value`, `currency`, `state`, `trade_type`, `version_id`, `created_at`, `effective_at`, `superseded_at`

**Invariant:** `version_id` is used for optimistic locking to prevent race conditions during multi-step negotiations.

### 4.2 escrow_accounts

**Purpose:** Risk containment and trust brokerage.

**Key Columns:** `trade_id`, `amount`, `state` (held|releasable|released), `created_at`, `effective_at`, `superseded_at`

**Invariant:** Release requires a verified `INSPECTION_EVENT` and Checker approval if the value exceeds defined risk thresholds.

---

## 5. Compliance: The Unit of Truth

**Trust is built on the Verified Certification Event.**

### 5.1 certifications

**Purpose:** Verifiable compliance artifacts.

**Key Columns:** `id`, `org_id`, `cert_type` (GOTS|OEKO-TEX|…), `issuer`, `valid_to`, `status`, `created_at`, `effective_at`, `superseded_at`

**Invariant:** Status only transitions via an issuer-signed `CERTIFICATION_VERIFIED` event. Suspensions must be evented.

---

## 6. Event Schema: The Legal Ledger

### 6.1 events

**Purpose:** The immutable audit trail for regulators and "The Morgue."

**Key Columns:** `id`, `event_type`, `actor_id`, `org_id`, `payload` (jsonb), `schema_version`, `reasoning_hash`, `created_at`, `effective_at`, `superseded_at`

**Invariants:**

- Append-only (immutable)
- Payload must include a `schema_version`
- AI-influenced events must carry explainability (`reasoning_hash` or audit pointer)

---

## 7. Governance and Failure Modes

- **Escalation Levels:** Level 0 (Normal) to Level 3 (Existential/Kill-Switch).

- **Kill-Switches:** Graduated states including Read-Only (freezes writes) and Approval-Only (human-in-the-loop mandatory).

- **The Morgue:** Every Level 1+ failure creates an immutable event bundle for post-mortem analysis and regulator review.

---

## 8. AI Doctrine: Expert Advisor

- **Capabilities:** AI may advise on risk and pricing but never autonomously execute high-stakes contracts.

- **Guardrails:** AI decisions must be explainable via `reasoning_hash` and event provenance. Automation is frozen immediately upon detection of model drift.

---

## 9. Data Portability & DPP

All canonical data must be exportable in DPP-compatible formats.

**Tenants own their truth; TexQtic owns the verification of that truth.**

---

## 10. Final Structural Principle

**If data cannot explain itself to a regulator, it is not canonical.**

---

## 11. Product-Boundary Classification — March 2026 Audit Reconciliation

**Added:** 2026-03-06 · **Reference:** `docs/governance/audits/2026-03-audit-reconciliation-matrix.md`  
**Scope:** Classifications below apply to frontend surface gaps discovered in the March 2026 cross-audit. These are not implementation instructions; they record where the platform boundary sits between "wiring gap" and "product decision pending."

### REQUIRES_BACKEND_DESIGN — Not a Wiring Gap

These gaps cannot be closed by frontend wiring work alone. They require explicit backend route design and product approval before any frontend implementation begins.

| Gap ID | Surface | Classification Reason |
|---|---|---|
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke actions | No `/api/control/admin-users` route exists in control.ts. This is also a security posture concern: auditable admin provisioning requires a designed, gated backend surface, not just UI wiring. |
| TECS-FBW-AIGOVERNANCE | AI Governance authority actions (cap, kill switch, registry) | No `PUT /api/control/ai-budget/:tenantId` route exists. G-028 B1/B2/C1/C2/C3 are Deferred Wave 5+ (GOVERNANCE-SYNC-095). AI authority actions in the platform doctrine (§8 AI Doctrine) require explainability and auditability — these cannot be implemented as ad-hoc calls to non-existent routes. |

### DEFERRED_BY_DOCTRINE — Product Decision Required

These gaps represent intentional product placeholders. The platform doctrine requires that no product action surface be implemented without a clear product intent and a supported backend contract.

| Gap ID | Surface | Classification Reason |
|---|---|---|
| TECS-FBW-013 | B2B "Request Quote" CTA | No backend quote endpoint exists. B2B quote flow is a future phase item. UI button may remain in disabled state as a product placeholder. |
| WL skeleton panels (general) | WhiteLabelAdmin and ControlPlane panels marked as BackendSkeleton | These are intentional placeholders, consistent with the phase model. They do not represent broken wiring; they represent features not yet in scope. No implementation work is authorized without explicit product scope approval. |

### Implication for Implementation Waves

Items classified REQUIRES_BACKEND_DESIGN or DEFERRED_BY_DOCTRINE are excluded from Waves 0–4. They are gated in Wave 5 behind explicit product/backend design approval. Any prompt or ticket that attempts to wire frontend actions to non-existent backend routes for these items is out of scope and must be blocked.

---

**End of Document — TEXQTIC PLATFORM DOCTRINE v1.4 (Part 1)**
