# PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-REPO-TRUTH-AUDIT-001

**Document type:** Architecture audit — read-only investigation  
**Status:** `PHASE_2_ARCHITECTURE_QUESTIONS_REPO_TRUTH_AUDIT_COMPLETE`  
**Date:** 2026-07-15  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**Scope:** TQ-01 through TQ-20 (Section 9, TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001.md)  
**`ttp_enabled` state:** `false` — UNCHANGED by this document  

> **READ-ONLY AUDIT ONLY.** No code changes, no schema changes, no DB changes, no migrations, no feature flag changes. This document surfaces repo-truth findings to inform Paresh's design decisions for Phase 2. Nothing in this document authorizes implementation.

---

## 1. Audit Summary

This document is the result of a repo-truth investigation of all 20 open technical architecture questions (TQ-01..TQ-20) documented in Section 9 of `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001.md`.

For each question, this audit:

1. States **current repo truth** — what the codebase and schema actually implement today
2. Presents **Option A / Option B / Option C** as distinct decision paths
3. States a **recommended option** (marked `RECOMMENDED — NOT FINAL`) with rationale and dependencies
4. Identifies risks, implementation readiness, and suggested first implementation slice

**Nothing in this document is a final decision.** Every recommendation requires Paresh approval before any implementation unit is opened.

`ttp_enabled = false` in the production database. This flag was not changed, inspected at runtime, or referenced in any command during this investigation.

---

## 2. Sources Reviewed

| Source | Path |
|---|---|
| Prisma schema (full TTP section) | `server/prisma/schema.prisma` |
| TTP constants | `server/src/ttp/ttp.constants.ts` |
| Feature gate middleware | `server/src/middleware/ttpFeatureGate.middleware.ts` |
| Score service | `server/src/services/ttpScore.service.ts` |
| Partner routing service | `server/src/services/partnerRouting.service.ts` |
| VPC service | `server/src/services/vpc.service.ts` |
| Summary service | `server/src/services/ttpSummary.service.ts` |
| Enrollment service | `server/src/services/ttpEnrollment.service.ts` |
| QA seed script | `scripts/qa-ttp-seed.sql` |
| Phase 2 scoping doc | `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001.md` |
| Prior governance decisions | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-*` |

---

## 3. Current Architecture Baseline

The following are confirmed facts about the Phase 1 TTP implementation as it exists in the repo.

### 3.1 Feature Gate

- `ttpFeatureGateMiddleware` (`server/src/middleware/ttpFeatureGate.middleware.ts`) reads only `feature_flags WHERE key='ttp_enabled'` and checks `enabled` column.
- Any DB error, missing row, or non-true value → 503 `FEATURE_DISABLED`.
- **No per-org check.** `TenantFeatureOverride` model exists in schema but is NOT consulted by this middleware.
- Gate runs in `preHandler` after auth — unauthenticated requests still receive 401 first.
- All 13 TTP routes are gated behind this middleware.

### 3.2 TTP Tables (confirmed in `schema.prisma`)

| Table (DB) | Prisma Model | Key Design Note |
|---|---|---|
| `feature_flags` | `FeatureFlag` | `key @id`, global kill-switch row `ttp_enabled` seeded `enabled=false` |
| `tenant_feature_overrides` | `TenantFeatureOverride` | Exists, unique `(tenantId, key)`. NOT used by middleware. |
| `organizations` | (inline with `Tenant`) | `risk_score`, `org_type`, `plan` fields present |
| `gst_verifications` | — | `org_id @unique` — one row per org |
| `ttp_eligibility_assessments` | — | No `@unique` on `org_id` — latest row is authoritative |
| `ttp_enrollment_logs` | — | Append-only; current state = `max(created_at).to_state` |
| `invoices` | — | Unique `(org_id, trade_id, invoice_number)` |
| `verified_payable_certificates` | — | `invoice_id @unique`, `partner_routing_eligible=false` always in Phase 1 |
| `partner_routing_stubs` | — | `transmission_status` (PENDING/TRANSMITTED/FAILED), `response_json` direct-mutation |
| `invoice_lifecycle_logs` | — | Append-only |
| `audit_logs` | `AuditLog` | Generic platform audit log; maps to `audit_logs`, NOT `ttp_audit_log` |

**Notable absences from `schema.prisma`:**
- No `ttp_audit_log` Prisma model (referenced in governance docs as `ttp_audit_log` — but does NOT exist as a Prisma model; the platform generic `AuditLog` model maps to `audit_logs` table)
- No `ttp_score_snapshots` table
- No consent table (`ttp_data_consents` or similar)
- No `ttp_finance_requests` table
- No `ttp_partner_offers` table
- No `ttp_fee_events` table
- No `is_qa_sentinel` column anywhere in schema

### 3.3 Score Service Boundaries

- `computeTtpScore` in `ttpScore.service.ts` is a **pure function** — no DB access, no external calls, no writes.
- Score: 100pt, 7 factors, 4 bands (READY/NEAR_READY/NEEDS_REVIEW/NOT_READY).
- Mandatory advisory disclaimer present in output.
- Score is NOT stored anywhere — ephemeral per-request computation.

### 3.4 VPC Lifecycle

- 12 gates in `vpc.service.ts` before VPC can be generated.
- Initial state: `ACTIVE`. `partner_routing_eligible=false` always.
- VPC terminal states: `TRANSMITTED`, `VOIDED`, `EXPIRED`.
- State `ROUTING_READY` exists in constants and QA seed but no automatic transition logic; transition from `ACTIVE → ROUTING_READY` requires admin action.
- No partner transmission exists in Phase 1.

### 3.5 Partner Routing Stubs

- `partnerRouting.service.ts` is create-on-read — creates stub for VPC if none exists, returns existing if found.
- `response_json` is direct-mutation (not append-only).
- No actual partner HTTP call, no outbound transmission.

### 3.6 QA Fixture Architecture

- Single-DB architecture (Supabase). No separate QA database.
- QA data identified solely by reserved UUID namespace: `ee000000-0000-0000-0000-0000000000XX`.
- QA seed script (`scripts/qa-ttp-seed.sql`) contains pre-flight guard: aborts if `ttp_enabled=true`.
- No `is_qa_sentinel` flag in schema. UUID-namespace convention is the sole isolation mechanism.
- Cleanup DELETEs exist in `§12` of seed (commented out; requires superuser for enrollment log rows due to immutability trigger).

### 3.7 Audit Logging

- Platform-generic `AuditLog` model (`audit_logs` table) exists. Captures `realm`, `tenantId`, `actorId`, `actorType`, `action`, `entity`, `entityId`, `beforeJson`, `afterJson`, `metadataJson`.
- The string `ttp_audit_log` in governance docs refers to expected TTP-specific audit logging behaviour — not a separate Prisma model. The platform `audit_logs` table is the actual mechanism.
- No structured export or compliance report from audit logs exists.

---

## 4. Decision Options Matrix — TQ-01 through TQ-20

Each entry format:

```
Current Repo Truth
Option A | Option B | [Option C]
RECOMMENDED (NOT FINAL)
Rationale | Dependencies | Risk | Readiness | Paresh Approval Required | Suggested First Slice
```

---

### TQ-01 — Per-org activation vs. global Boolean

**Question:** Should `ttp_enabled` remain a global Boolean, or be replaced with per-org / per-tier / per-role activation scope? What is the migration path from global to scoped?

**Current Repo Truth:**
- `ttpFeatureGateMiddleware` reads only the global `feature_flags` row `ttp_enabled`.
- `TenantFeatureOverride` model already exists in schema with `unique(tenantId, key)`. It is never consulted.
- No per-org TTP activation logic anywhere in backend.

| Option | Description |
|---|---|
| **Option A** | Keep global `ttp_enabled` Boolean as sole gate. Any activation affects all tenants simultaneously. |
| **Option B** ⭐ | Keep global `ttp_enabled` as master kill-switch. Extend middleware to ALSO check `TenantFeatureOverride(tenantId, 'ttp_enabled')` after global check. Per-org activation possible without new table (schema already ready). Backward compatible. |
| **Option C** | Replace global flag entirely with per-org `TenantFeatureOverride` records only. Requires migration of all existing TTP behaviour; more complex rollback. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** `TenantFeatureOverride` table already exists — no new schema or migration needed. Option B gives a two-layer gate: global kill-switch stays for emergency off; per-org override enables controlled pilot rollout. Option A has no rollout granularity. Option C removes emergency global off capability.

**Dependencies:** None (schema ready). Middleware change only.  
**Risk:** Low  
**Implementation Readiness:** High — schema in place, middleware is a single-file change  
**Paresh approval required:** Yes — before any middleware change  
**Suggested first slice:** `TTP-SCOPED-ACTIVATION-DESIGN-001` (design artifact first, then implementation unit)

---

### TQ-02 — Partner routing stubs: extend vs. new workflow table

**Question:** Should `partner_routing_stubs` become persisted workflow records with a full state machine, or should a new `ttp_partner_workflows` table be introduced?

**Current Repo Truth:**
- `partner_routing_stubs` has `transmission_status` (PENDING/TRANSMITTED/FAILED) and direct-mutation `response_json`.
- `partnerRouting.service.ts` is create-on-read; no transmission, no state machine.
- Stub is a Phase 1 routing-readiness evidence record. Phase 2 needs a live transmission lifecycle.

| Option | Description |
|---|---|
| **Option A** | Extend `partner_routing_stubs` with additional state columns and new status values. |
| **Option B** ⭐ | New `ttp_partner_workflows` table with full state machine (PENDING → SUBMITTED → PARTNER_ACCEPTED / PARTNER_REJECTED / TIMED_OUT). `partner_routing_stubs` stays as Phase 1 routing-readiness evidence only. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** `partner_routing_stubs` was designed as a routing-readiness preparation record, not a live workflow object. Extending it conflates two distinct concerns. A separate `ttp_partner_workflows` table gives clean lifecycle separation, independent audit trail, and allows the stub to remain a stable evidence artifact that doesn't change meaning after partner transmission begins.

**Dependencies:** Partner contract (Section 8 gate) before implementation. Bucket D prerequisite.  
**Risk:** Medium (new table requires SQL + migration)  
**Implementation Readiness:** Low — partner contract and sandbox credentials required first  
**Paresh approval required:** Yes — schema change + partner contract required  
**Suggested first slice:** Design-only artifact. No implementation until partner is identified and contracted.

---

### TQ-03 — VPC TRANSMITTED: on ack vs. on HTTP call

**Question:** Should VPC state transition to `TRANSMITTED` only after a confirmed, persisted partner acknowledgement, or after the outbound HTTP call is made?

**Current Repo Truth:**
- `TRANSMITTED` is defined in `TTP_VPC_STATE` and is in `TTP_VPC_TERMINAL_STATES`.
- No VPC transmission logic exists in Phase 1. No outbound partner HTTP call anywhere.
- Once a VPC reaches `TRANSMITTED`, it is terminal — no reversal.

| Option | Description |
|---|---|
| **Option A** | Transition VPC to `TRANSMITTED` immediately after the outbound HTTP call to the partner succeeds (200 OK). Simpler, faster. Risk of phantom TRANSMITTED if partner doesn't actually process. |
| **Option B** ⭐ | Transition VPC to `TRANSMITTED` only after a confirmed, persisted partner acknowledgement is stored in an event record (callback received and persisted). Conservative. Audit integrity preserved. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** `TRANSMITTED` is a terminal state — irreversible. An HTTP 200 from a partner does not guarantee they have accepted or processed the VPC. If TexQtic transitions to TRANSMITTED on outbound HTTP success and the partner later rejects or loses the record, there is no recovery path and the VPC is permanently locked. Option B preserves audit integrity: TRANSMITTED means the partner has confirmed receipt. Slight implementation complexity is justified given the irreversibility.

**Dependencies:** TQ-02 (partner workflow table), partner contract.  
**Risk:** High if wrong choice (irreversible terminal state)  
**Implementation Readiness:** Low — no partner integration exists  
**Paresh approval required:** Yes — terminal state semantics  
**Suggested first slice:** Design-only. Sequence must be: TQ-01 → TQ-02 → TQ-03.

---

### TQ-04 — Partner callback storage: append-only vs. direct mutation

**Question:** How should external partner callback events be stored? Append-only event log, or direct status mutation on the routing stub?

**Current Repo Truth:**
- `partner_routing_stubs.response_json` is a single direct-mutation JSON field.
- No append-only log for callbacks. Overwrites destroy history.
- No callback receiver exists in Phase 1.

| Option | Description |
|---|---|
| **Option A** ⭐ | New `ttp_partner_callback_events` append-only table: `id`, `stub_id` or `workflow_id`, `event_type`, `received_at`, `payload_json`, `verified`. Preserves full callback history. |
| **Option B** | Direct mutation of `response_json` on the routing stub or workflow record. Simpler; loses callback history after the first event. |

**RECOMMENDED: Option A — NOT FINAL. Requires Paresh approval.**

**Rationale:** Partner callbacks are external events from systems outside TexQtic's control. They represent facts that occurred — they should be immutable once stored. If a partner sends a rejection and then an acceptance, or sends duplicate callbacks, direct mutation destroys the audit trail. Append-only preserves all events. This is especially important for compliance and dispute resolution. Option A is the correct approach for any system that receives external event callbacks.

**Dependencies:** TQ-02 (which table is `stub_id` / `workflow_id` from). Partner contract for webhook schema.  
**Risk:** Medium (new table, webhook authentication design needed)  
**Implementation Readiness:** Low — no partner integration, no webhook schema agreed  
**Paresh approval required:** Yes  
**Suggested first slice:** Design-only until partner contract.

---

### TQ-05 — Consent model for GST/CIBIL data pulls

**Question:** How should consent be recorded for live GST and CIBIL/bureau data pulls? Is consent per-org, per-trade, or per-request?

**Current Repo Truth:**
- No consent table in schema.
- `gst_verifications.raw_verification_json` stores GST data but no consent record.
- No consent recording anywhere in the codebase.
- Phase 1 GST verification is manual (admin-reviewed) — no live data pull, no consent needed yet.

| Option | Description |
|---|---|
| **Option A** ⭐ | New `ttp_data_consents` table: `id`, `org_id`, `consent_type` (enum: GST_PULL / CIBIL_PULL / LENDER_DATA_SHARE), `granted_at`, `expires_at`, `revoked_at`, `granted_by_user_id`, `version`. Per-org; reusable across trades until revoked or expired. |
| **Option B** | Per-trade consent: one consent record per trade per data type. Higher granularity, heavier UX burden. |
| **Option C** | Per-request consent: consent captured inline with each API call. Weakest audit trail, hardest to revoke. |

**RECOMMENDED: Option A — NOT FINAL. Requires Paresh approval.**

**Rationale:** Per-org consent is DPDP-aligned, reusable, and avoids repeated consent prompts for every trade. Revocation is simple: set `revoked_at`. Per-trade consent (Option B) is overly granular for Phase 2 and increases UX friction. Per-request consent (Option C) provides the weakest audit trail and cannot support revocation. Option A cleanly supports future GSTN, CIBIL, and lender data-sharing consent types via the `consent_type` enum.

**Dependencies:** Legal gate (Section 7 — GSTN/GSP consent, CIBIL consent, DPDP review) must complete before any implementation.  
**Risk:** High (legal/regulatory; DPDP compliance required)  
**Implementation Readiness:** Blocked by legal gate  
**Paresh approval required:** Yes — legal gate must be completed first  
**Suggested first slice:** Legal review artifact first (`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`), then consent design artifact.

---

### TQ-06 — TradeTrust Score versioning and snapshot

**Question:** How should TradeTrust Score history be versioned? Should each score computation be snapshotted, or remain ephemeral?

**Current Repo Truth:**
- `computeTtpScore` is a pure function. No DB writes. Score is ephemeral.
- No `ttp_score_snapshots` table in schema.
- Score is computed on every `/ttp-summary/:tradeId` request and returned in API response only.

| Option | Description |
|---|---|
| **Option A** | Keep ephemeral (current Phase 1 behavior). No snapshot table. Score is computed on demand. |
| **Option B** ⭐ | New `ttp_score_snapshots` table: `id`, `org_id`, `trade_id`, `snapshot_at`, `trigger_event` (enum: VPC_ISSUED / ENROLLMENT_APPROVED / ADMIN_REVIEW / PARTNER_TRANSMITTED), `score`, `band`, `factors_json`, `score_version`. Append-only. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** Phase 1 ephemeral-only is acceptable for internal use. Phase 2 partner routing introduces a requirement to show lenders "what was the score at time of VPC issuance?" Option A cannot answer that question. Snapshots enable: dispute resolution, audit trail, explainability for lenders, and score trend analysis. One `ttp_score_snapshots` table can serve both TQ-06 (TradeTrust Score v1 snapshots) and TQ-12 (TexQticScore v2 snapshots) via `score_version` column.

**Dependencies:** No external dependencies. Schema addition only.  
**Risk:** Low (new append-only table; no existing behavior changes)  
**Implementation Readiness:** Medium — requires SQL + migration approval  
**Paresh approval required:** Yes — new table  
**Suggested first slice:** Include in Design V2 artifact. Implement in Phase 2 product polish bucket.

---

### TQ-07 — Score: live computation vs. trigger snapshots

**Question:** Should TradeTrust Score be computed live (current) or snapshotted on specific trigger events?

**Current Repo Truth:**
- Score is computed live on every `/ttp-summary/:tradeId` request.
- No trigger-based computation. No event hooks on VPC issuance, enrollment approval, or admin review.

| Option | Description |
|---|---|
| **Option A** | Keep live computation only (current). Score always reflects current state. |
| **Option B** ⭐ | Hybrid: Live computation for tenant-facing display (current behavior preserved). Snapshot at trigger events (VPC issuance, enrollment approval, admin review, partner transmission). Snapshot serves as audit evidence. |

**RECOMMENDED: Option B hybrid — NOT FINAL. Requires Paresh approval.**

**Rationale:** Live computation is correct for tenant-facing UX — the score should always reflect current state. But trigger-event snapshots are needed for audit integrity. If an org's score is 85 (READY) at the moment a VPC is issued, that fact should be preserved even if the score drops to 50 the following week. Option B gives both: real-time accuracy for the tenant and historical accuracy for compliance. Option A alone cannot support audit or lender evidence.

**Dependencies:** TQ-06 (snapshot table required). No external dependencies.  
**Risk:** Low  
**Implementation Readiness:** Medium — snapshot write logic at trigger points in `vpc.service.ts` and `ttpEnrollment.service.ts`  
**Paresh approval required:** Yes  
**Suggested first slice:** Implement snapshot writes at VPC issuance first (highest-value trigger event).

---

### TQ-08 — QA sentinel fixture separation

**Question:** How should QA sentinel fixtures be separated from production data in the single-DB architecture?

**Current Repo Truth:**
- No `is_qa_sentinel` flag in schema anywhere.
- QA data is identified solely by reserved UUID namespace: `ee000000-0000-0000-0000-0000000000XX`.
- UUID-prefix convention is documented in `scripts/qa-ttp-seed.sql` but not enforced at schema or RLS level.
- QA seed pre-flight guard aborts if `ttp_enabled=true` — protects against accidental live execution.
- No schema-level enforcement of QA isolation.

| Option | Description |
|---|---|
| **Option A** ⭐ | Add `is_qa_sentinel Boolean @default(false)` column to `organizations` table (and potentially `invoices`, `verified_payable_certificates`). Enables SQL and RLS-compatible filtering. |
| **Option B** | Formalise the existing UUID namespace convention with a documented constant and add a DB constraint enforcing UUID prefix for known QA orgs. No schema column change. |
| **Option C** | Lifecycle state namespace: prefix QA-only states with `QA_` (e.g. `QA_VERIFIED`). Highest friction; requires state machine changes. |

**RECOMMENDED: Option A — NOT FINAL. Requires Paresh approval.**

**Rationale:** The UUID-prefix convention (current Option B-equivalent) works today but is implicit and not enforced. If a new developer seeds QA data without following the UUID convention, there is no schema-level protection. `is_qa_sentinel` on `organizations` is explicit, queryable, filterable in admin UIs, and compatible with RLS policies. A single boolean addition is minimal schema overhead with high operational value. Option C is high friction with no benefit over Option A.

**Dependencies:** Schema change requires SQL + Prisma db pull + generate.  
**Risk:** Low (additive boolean column with default false)  
**Implementation Readiness:** High (simple schema addition once approved)  
**Paresh approval required:** Yes — schema change  
**Suggested first slice:** Add `is_qa_sentinel` to `organizations` table. Update QA seed to `SET is_qa_sentinel = true` on QA org rows. Governance decision `PRODUCT-DEC-TTP-QA-SENTINEL-FLAG-001`.

---

### TQ-09 — Monitoring and alerting signals post-activation

**Question:** What monitoring and alerting signals are needed after TTP activation?

**Current Repo Truth:**
- No monitoring or alerting for TTP routes.
- No structured error reporting for TTP-specific failures.
- Fastify uses `pino` logger (standard JSON structured logging) — but TTP-specific log structure is not defined.
- The generic `AuditLog` model (`audit_logs`) is the existing platform audit mechanism. No TTP-specific audit events are written to it currently.

| Option | Description |
|---|---|
| **Option A** ⭐ | Structured JSON logging via Fastify/pino for all TTP route events (feature gate bypass attempts, VPC generation errors, eligibility expiry, 5xx errors, partner callback failures). No new DB table. Log aggregation in Supabase/external tool. |
| **Option B** | DB-backed `ttp_route_events` table or extend `audit_logs` with TTP-specific event types. Full audit trail in DB. Higher write load. |

**RECOMMENDED: Option A first, Option B later — NOT FINAL. Requires Paresh approval.**

**Rationale:** For Phase 2 activation, structured pino logging is sufficient to detect operational issues. It requires no schema change and can be wired into Supabase log aggregation or an external tool immediately. Option B (DB-backed route events) is appropriate for compliance audit trail requirements but should be deferred until legal gate determines which events must be persisted. Implementing both in sequence is the right approach: Option A enables operational monitoring now; Option B enables compliance audit trail after legal review.

**Key signals for Option A:**
- `ttp_feature_gate_blocked` — feature gate returning 503
- `ttp_vpc_generation_error` — VPC generation failure with gate index
- `ttp_eligibility_expired_count` — aggregate count of expired assessments encountered
- `ttp_enrollment_approval_gate_failed` — GST or eligibility gate failed during enrollment approval
- `ttp_partner_callback_received` — (Phase 2) webhook callback received
- `ttp_5xx_rate` — 5xx responses on TTP routes

**Dependencies:** None for Option A. Legal gate for Option B.  
**Risk:** Low  
**Implementation Readiness:** High (pino logger already in Fastify stack)  
**Paresh approval required:** Yes — define and document required log event set  
**Suggested first slice:** Add structured pino log events to all 13 TTP routes as part of Bucket A hardening.

---

### TQ-10 — Rollback path for partial activation failure

**Question:** What is the rollback path if `ttp_enabled` is set true for an org and must be reverted?

**Current Repo Truth:**
- Setting `ttp_enabled=false` stops all new route access (global kill-switch).
- No automated cleanup of existing VPCs or routing stubs on deactivation.
- VPCs in `ACTIVE` or `ROUTING_READY` states can be admin-voided (not a terminal state issue).
- VPCs in `TRANSMITTED` state are **terminal** — cannot be reversed.
- `partner_routing_stubs` with `PENDING` status remain but become inaccessible behind the gate.
- Enrollment logs are append-only with an immutability trigger — cannot be deleted without superuser.

| Option | Description |
|---|---|
| **Option A** ⭐ | Manual rollback runbook: (1) Set `ttp_enabled=false` (or remove per-org override if TQ-01 Option B implemented). (2) Admin voids all `ACTIVE` and `ROUTING_READY` VPCs for the affected org. (3) No stub cleanup needed (stubs become inaccessible). (4) Enrollment logs remain as audit trail (immutability preserved). |
| **Option B** | Automated rollback: admin-initiated bulk-void endpoint that voids all non-terminal VPCs for an org when the org's TTP override is deactivated. |

**RECOMMENDED: Option A — NOT FINAL. Requires Paresh approval.**

**Rationale:** Given that Phase 2 activation will be per-org (TQ-01 Option B), rollback scope is narrow: one org at a time. A manual runbook is sufficient and safer than an automated bulk-void that could accidentally void VPCs belonging to the wrong org. `TRANSMITTED` VPCs cannot be reversed regardless — this is an accepted invariant. Option A preserves full audit history. Option B is appropriate if activation scales to hundreds of orgs simultaneously, but Phase 2 is a controlled pilot.

**Critical constraint:** If TQ-01 Option B is implemented, rollback = remove per-org `TenantFeatureOverride` row + manually void non-terminal VPCs. This is low-risk and fully reversible up to the point of TRANSMITTED VPCs.

**Dependencies:** TQ-01 decision. Rollback runbook is a governance document, not a code artifact.  
**Risk:** Low (with TQ-01 Option B per-org activation)  
**Implementation Readiness:** High (no code needed for Option A — documentation only)  
**Paresh approval required:** Yes — ratify runbook steps  
**Suggested first slice:** Write activation runbook as part of `TTP-SCOPED-ACTIVATION-DESIGN-001`.

---

### TQ-11 — TexQticScore v2 vs. Phase 1 TradeTrust Score

**Question:** How should TexQticScore v2 differ from Phase 1 TradeTrust Score in data model, input dimensions, and output contract?

**Current Repo Truth:**
- `computeTtpScore` (Phase 1): 100pt, 7 factors, 4 bands, pure function, ephemeral, `TtpScoreInput` takes high-level boolean flags only.
- Phase 1 inputs: `gst_readiness.is_approved`, `eligibility_readiness.is_eligible`, `eligibility_readiness.risk_tier`, `invoice_readiness.is_verified`, `vpc_readiness.is_active`, `enrollment_state`, `routing_readiness.found`.
- TexQticScore v2 per Section 5A.2 requires: procurement consistency, order execution fidelity, network position, payment behaviour, compliance/GST linkage — all present in schema (`Trade`, `Order`, `Invoice`, `RfqSupplierResponse`) but NOT consumed by current score function.

| Option | Description |
|---|---|
| **Option A** | Extend `computeTtpScore` with additional factors (backward compatible; same function signature extended). |
| **Option B** ⭐ | New `computeTexQticScore` function with a distinct `TexQticScoreInput` contract and `TexQticScoreOutput` type. Phase 1 `computeTtpScore` remains unchanged for backward compatibility. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** Phase 1 TradeTrust Score has a specific 7-factor contract that is tested (unit tests exist) and referenced by lender evidence in governance decisions. TexQticScore v2 has a fundamentally different input model — extending the same function would break the v1 contract and make it impossible to version separately. Option B allows parallel use: Phase 1 score for existing endpoints (backward compatible), TexQticScore v2 for new endpoints when implemented. The `score_version` field in `ttp_score_snapshots` (TQ-06) can distinguish the two.

**Dependencies:** Section 5A.2 requires a separate design artifact before any TexQticScore v2 implementation. TQ-06 (snapshot table) needed for v2 versioning.  
**Risk:** Medium (new function + new input model; requires separate design artifact)  
**Implementation Readiness:** Blocked by separate TexQticScore v2 design artifact  
**Paresh approval required:** Yes — separate design artifact required first  
**Suggested first slice:** Commission `TTP-TEXQTICSCORE-V2-DESIGN-001` artifact before any code.

---

### TQ-12 — TexQticScore snapshots: ephemeral vs. persisted

**Question:** Should TexQticScore be snapshotted per invoice/trade/org at trigger events, or remain purely ephemeral?

**Current Repo Truth:** Same as TQ-06. No `ttp_score_snapshots` table. Score is ephemeral. No trigger events for score writes.

| Option | Description |
|---|---|
| **Option A** | Ephemeral only (current). |
| **Option B** ⭐ | Snapshot at trigger events using the same `ttp_score_snapshots` table proposed in TQ-06. `score_version` column distinguishes Phase 1 TradeTrust Score from TexQticScore v2. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** TexQticScore v2, if shared with lenders (TQ-13), requires a persistent record of what score was shared, when, and on what version. An ephemeral-only model provides no evidence in a dispute. The same `ttp_score_snapshots` table design from TQ-06 covers this requirement — no additional table needed. The `score_version` column is the only required addition.

**Dependencies:** TQ-06 (snapshot table). TQ-11 (TexQticScore v2 design). TQ-13 (external sharing policy).  
**Risk:** Low (same table as TQ-06)  
**Implementation Readiness:** Blocked by TQ-11 design artifact  
**Paresh approval required:** Yes  
**Suggested first slice:** Design `ttp_score_snapshots` with `score_version` as part of TQ-06 + TQ-12 combined implementation slice.

---

### TQ-13 — TexQticScore: internal only vs. externally shareable

**Question:** Should TexQticScore history be externally shareable with lenders, or remain an internal platform signal only?

**Current Repo Truth:**
- Score is internal only. No data-sharing API. No lender-facing endpoint. No sharing controls.
- Advisory disclaimer is mandatory in score output.
- No consent model for sharing (TQ-14 addresses this).

| Option | Description |
|---|---|
| **Option A** ⭐ | Internal only for Phase 2. No lender data-sharing API. Score remains advisory-only internal signal. |
| **Option B** | Phase 3 design target: define a lender data-sharing API contract for score + VPC evidence. Requires legal gate + partner contracts. |

**RECOMMENDED: Option A for Phase 2, Option B as Phase 3 design target — NOT FINAL. Requires Paresh approval.**

**Rationale:** Sharing TexQticScore externally with lenders triggers multiple legal and regulatory requirements: DPDP consent framework, partner data-sharing agreement, disclaimer language pre-approval, regulatory review of score wording to ensure no regulated credit decision implication. None of these gates are clear in Phase 2. Internal use of the score for routing decisions (which lender is appropriate for this VPC?) is distinct from sharing the score directly with a lender as underwriting input. Phase 2 should use the score internally for routing logic only. Phase 3 can design the external sharing API after all legal gates pass.

**Dependencies:** Legal gate (Section 7 — lender data-sharing agreements, consent architecture). Partner contract (Section 8).  
**Risk:** High if implemented without legal gate  
**Implementation Readiness:** Blocked by legal + partner gates  
**Paresh approval required:** Yes — legal gate must complete first  
**Suggested first slice:** None for Phase 2. Phase 3 design artifact after legal + partner gates clear.

---

### TQ-14 — Consent model for lender data sharing

**Question:** What consent model is required for sharing platform behavioural data with lenders?

**Current Repo Truth:**
- No consent model. No consent table. No consent UI.
- Phase 1 has no data sharing with external parties.

| Option | Description |
|---|---|
| **Option A** | Per-org consent (org signs once; reusable for all trades until revoked). |
| **Option B** | Per-trade consent (separate consent for each financing request). |
| **Option C** ⭐ | Time-bounded per-org consent with explicit expiry (`expires_at`) and revocation (`revoked_at`). DPDP-aligned. Allows temporal scoping. |

**RECOMMENDED: Option C — NOT FINAL. Requires Paresh approval.**

**Rationale:** DPDP requires informed, specific, revocable consent. Time-bounded per-org consent (Option C) provides all three: informed (explicit grant), specific (consent_type scoped to `LENDER_DATA_SHARE`), revocable (`revoked_at`). Per-trade consent (Option B) creates excessive friction with no regulatory benefit over per-org with expiry. Unlimited per-org consent (Option A) is weaker than Option C for DPDP compliance. Time-bounded consent also forces periodic re-confirmation, which is good consent hygiene.

**Dependencies:** Legal gate (Section 7 — consent design review, DPDP compliance). TQ-05 (same consent table `ttp_data_consents` can store lender data sharing consent with a different `consent_type` value).  
**Risk:** High (legal/regulatory)  
**Implementation Readiness:** Blocked by legal gate  
**Paresh approval required:** Yes  
**Suggested first slice:** Combine with TQ-05 consent table design. One `ttp_data_consents` table; `consent_type` enum covers both GST/CIBIL pulls and lender data sharing.

---

### TQ-15 — Partner finance requests: new table vs. extend stubs

**Question:** Should partner finance requests be modeled as a new `ttp_finance_requests` table, or extend `partner_routing_stubs`?

**Current Repo Truth:**
- `partner_routing_stubs` is a Phase 1 routing-readiness evidence record. It was designed for preparing and displaying routing readiness, not managing live finance request lifecycles.
- No `ttp_finance_requests` table.
- No finance request lifecycle logic anywhere.

| Option | Description |
|---|---|
| **Option A** | Extend `partner_routing_stubs` with finance-request lifecycle columns (request_state, submitted_at, partner_response, etc.). |
| **Option B** ⭐ | New `ttp_finance_requests` table: `id`, `org_id`, `vpc_id`, `partner_type`, `request_state` (DRAFT → SUBMITTED → PARTNER_ACCEPTED / PARTNER_REJECTED / TIMED_OUT / CANCELLED), `submitted_at`, `partner_ref`, `currency`, `amount`, `consent_id`. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** `partner_routing_stubs` should remain as a stable routing-readiness evidence record. Its semantics are: "this VPC has been prepared for partner routing." A finance request is a different object: a live workflow with counterparty interactions, response handling, and compliance requirements. Conflating the two (Option A) creates ambiguity about what the stub represents and makes the schema harder to reason about. Option B is clean separation of concerns with independent audit trails.

**Dependencies:** Partner contract (Section 8) required before any implementation. TQ-02 (ttp_partner_workflows) may overlap — design must reconcile both.  
**Risk:** High (partner contract, regulatory, no implementation authorization)  
**Implementation Readiness:** Blocked by partner contract  
**Paresh approval required:** Yes — no implementation authorized  
**Suggested first slice:** Design-only in Finance Marketplace design artifact.

---

### TQ-16 — Partner financing offer representation

**Question:** How should partner financing offers be represented and stored when a lender responds with terms?

**Current Repo Truth:**
- No offer model. `response_json` on `partner_routing_stubs` could store ad-hoc offer data but has no structure.
- No state machine for offer lifecycle.
- No partner transmission exists, so no offers have ever been received.

| Option | Description |
|---|---|
| **Option A** | JSONB `offer_json` column on `partner_routing_stubs` or `ttp_finance_requests`. Simple; no structured lifecycle. |
| **Option B** ⭐ | New `ttp_partner_offers` table: `id`, `finance_request_id`, `partner_type`, `offer_state` (PENDING → OFFER_RECEIVED → ACCEPTED / REJECTED / EXPIRED), `offer_terms_json`, `received_at`, `expires_at`, `accepted_at`, `rejected_at`, `accepted_by_user_id`. Structured offer lifecycle enables comparison UI. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** A financing offer is a distinct business object with its own lifecycle and audit requirements. Storing it as JSONB on another table (Option A) makes the offer lifecycle invisible to queries and the UI. Option B enables: multi-offer comparison per finance request, offer expiry enforcement, audit trail of acceptance/rejection decisions, partner offer analytics. The additional table is justified by the distinct lifecycle semantics.

**Dependencies:** TQ-15 (finance_request_id FK). Partner contract required.  
**Risk:** High (no partner integration, no offer schema agreed with partner)  
**Implementation Readiness:** Blocked by partner contract + TQ-15  
**Paresh approval required:** Yes  
**Suggested first slice:** Design-only. Schema design only after TQ-15 partner contract is in place.

---

### TQ-17 — Dynamic discounting model

**Question:** How should dynamic discounting offers be modeled — buyer-initiated, platform-generated, or admin-created?

**Current Repo Truth:**
- No dynamic discounting model exists.
- Trade, Order, Invoice data present in schema but no discount mechanism.
- Buyer and seller orgs are distinct `organizations` rows with an `org_type` field.
- No buyer payment history analytics surface in Phase 1.

| Option | Description |
|---|---|
| **Option A** ⭐ | Buyer-initiated: buyer creates a discount offer on an eligible invoice; seller sees it and accepts/rejects in their trade view. TexQtic records and facilitates only; does not hold or move funds. |
| **Option B** | Platform-generated: TexQtic auto-suggests discount offers for high-trust buyer-seller pairs based on payment history. Requires TexQticScore / Buyer Trust Score computation. |
| **Option C** | Admin-created: admin creates discount offers for specific buyer-seller relationships. Control-plane-only UX. |

**RECOMMENDED: Option A for Phase 2 design target — NOT FINAL. Requires Paresh approval.**

**Rationale:** Buyer-initiated (Option A) has the lowest regulatory complexity because the offer originates from the buyer, not from TexQtic. TexQtic records the offer and the acceptance, facilitates the visibility, but does not compute or recommend the discount rate. Option B requires Buyer Trust Score (TQ-18) and TexQticScore v2 data, which are Phase 3 dependencies. Option C (admin-created) has no clear product rationale for Phase 2 scale.

**Critical constraint:** Regardless of model, TexQtic must NOT hold or move funds in any dynamic discounting implementation. Payment facilitation, if any, must occur on the buyer's/seller's existing banking rails, not through TexQtic.

**Dependencies:** Product + legal review (Section 8). TQ-05 consent model. No implementation authorized.  
**Risk:** High (payment-adjacent; legal review required before design)  
**Implementation Readiness:** Blocked by legal + product review  
**Paresh approval required:** Yes — no design authorized yet  
**Suggested first slice:** None for Phase 2 implementation. Phase 3 design target.

---

### TQ-18 — Buyer Trust Score: on-platform only vs. external data

**Question:** Should Buyer Trust Score be computed from on-platform data, or does it require separate buyer-consent data access?

**Current Repo Truth:**
- `organizations.risk_score` field exists (for buyer and seller orgs).
- Buyer data available on-platform: `invoices.buyer_org_id`, trade data, invoice acceptance/rejection state, dispute history in `invoice_lifecycle_logs`.
- No Buyer Trust Score computation exists.
- No buyer consent mechanism for external data access.

| Option | Description |
|---|---|
| **Option A** ⭐ | On-platform data only: buyer invoice acceptance rate, payment history, dispute count, relationship tenure — all derivable from existing schema data without external consent. DPDP-compliant without separate consent mechanism for existing platform data. |
| **Option B** | On-platform + external buyer consent data (CIBIL, GST, bank statement via Account Aggregator). Requires separate buyer consent design (distinct from seller consent in TQ-05). |

**RECOMMENDED: Option A for Phase 2 design target — NOT FINAL. Requires Paresh approval.**

**Rationale:** On-platform data for buyer behaviour is DPDP-compliant under the platform's existing terms of service (buyer has already agreed to platform data use by joining). External data access (Option B) requires a separate buyer consent design, separate legal gate for buyer-side data access, and Account Aggregator framework registration if used. Option A gives meaningful Buyer Trust Score signal without the legal complexity. Option B is a Phase 3 extension after legal gates clear.

**Dependencies:** TQ-11 (TexQticScore v2 design — same service boundary). On-platform data is already available.  
**Risk:** Low for Option A (on-platform only). High for Option B (external consent required).  
**Implementation Readiness:** Blocked by TQ-11 design artifact (Buyer Trust Score is one of the three TexQticScore types)  
**Paresh approval required:** Yes  
**Suggested first slice:** Define Buyer Trust Score input model as part of TexQticScore v2 design artifact.

---

### TQ-19 — Origination/facilitation fee recording

**Question:** How should origination and facilitation fees be recorded, audited, and disclosed?

**Current Repo Truth:**
- No fee recording model. No `ttp_fee_events` table. No fee disclosure anywhere.
- The platform generic `AuditLog` (`audit_logs`) exists. No TTP-specific fee events written to it.
- The string `ttp_audit_log` in governance docs refers to expected TTP audit behaviour but NO separate `ttp_audit_log` Prisma model exists. The platform `audit_logs` table is the actual mechanism.
- No fee collection, calculation, or disclosure logic in any TTP service.

| Option | Description |
|---|---|
| **Option A** | Extend `audit_logs` with TTP fee event types by writing structured `action='TTP_FEE_ACCRUED'` rows using `metadataJson` for fee details. No new table. |
| **Option B** ⭐ | New `ttp_fee_events` append-only table: `id`, `org_id`, `trade_id`, `vpc_id`, `fee_type` (enum), `amount`, `currency`, `rate_basis`, `disclosed_at`, `disclosed_to_user_id`, `legal_basis`, `partner_ref`. Full compliance export capability. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** Fee events are compliance-critical records. They must be immutable, auditable, and exportable for regulatory review. The platform `audit_logs` table (Option A) is a general-purpose audit log with loose structure — using it for fee records would mix operational audit events with compliance-critical financial records. Option B gives a dedicated, structured, append-only fee table with explicit disclosure tracking and legal basis. This is the right approach for any regulated-adjacent fee recording, even if TexQtic is not a regulated entity today.

**Critical prerequisite:** Legal review of the fee model (Section 7 — P2-12, origination/facilitation fee disclosure) must complete before any fee table is designed. The fee type enum and `legal_basis` field content depend on legal review output.

**Dependencies:** Legal gate required before implementation. No partner contracts needed for fee recording design.  
**Risk:** High (legal/regulatory — fee disclosure and legal basis must be defined)  
**Implementation Readiness:** Blocked by legal gate  
**Paresh approval required:** Yes — legal gate first  
**Suggested first slice:** Design fee table schema only after legal fee review completes.

---

### TQ-20 — Preventing lender/payment-intermediary interpretation

**Question:** How should TexQtic's data model and UI language be structured to prevent any interpretation of TexQtic as a lender, payment intermediary, or regulated finance provider?

**Current Repo Truth:**
- Mandatory advisory disclaimer present in `computeTtpScore` output (service-layer string constant).
- No formal language governance model at API contract level or UI copy level.
- Disclaimer enforcement is informal — only in `ttpScore.service.ts` output. Not enforced in API response schema. Not checked at UI copy commit time.
- VPC certificate wording, score wording, and enrollment copy are not reviewed by legal.
- No forbidden-term lint check exists.

| Option | Description |
|---|---|
| **Option A** | Current: advisory disclaimer in `ttpScore.service.ts` only. No enforcement at API contract level. |
| **Option B** ⭐ | Platform-wide language governance: (1) Mandatory `advisory_disclaimer` field on all TTP API response schemas. (2) Legal-reviewed disclaimer text in a single `TTP_DISCLAIMER_TEXT` constant (single source of truth). (3) Pre-commit lint hook checking for forbidden terms (`lend`, `loan`, `credit score`, `approved for financing`, `guaranteed payment`, `underwrite`) in `/components/Tenant/TTP*`, `/components/ControlPlane/TTP*`, and all TTP API response types. |

**RECOMMENDED: Option B — NOT FINAL. Requires Paresh approval.**

**Rationale:** Defense in depth. A single disclaimer string in a service file is not sufficient protection against language drift as the codebase grows. If a developer adds a new TTP UI component with language like "your invoice is eligible for financing approval," that would not be caught by any current check. Option B creates a three-layer defense: (1) API contract enforces disclaimer on every TTP response, (2) single-source-of-truth constant prevents disclaimer text divergence, (3) pre-commit lint catch forbidden terms before they reach the repo. This is proportionate to the legal risk described in Section 7 and Section 12 of the scoping doc.

**Dependencies:** Legal copy review (P2-12) must determine the approved disclaimer text and the forbidden terms list before the lint hook can be configured. The `advisory_disclaimer` field can be added to API response types immediately without legal approval (it just carries the service-layer string).  
**Risk:** High if not implemented (language drift → regulatory risk). Low implementation risk.  
**Implementation Readiness:** Medium (lint hook + constant + API schema change)  
**Paresh approval required:** Yes — legal copy review for approved disclaimer text  
**Suggested first slice:** Add `advisory_disclaimer` to all TTP API response types. Create `TTP_DISCLAIMER_TEXT` constant. Commission legal copy review. Lint hook after legal review delivers approved terms list.

---

## 5. Cross-Cutting Findings

### 5.1 Schema Gaps (Summary)

| Missing Table/Column | Needed For | Priority |
|---|---|---|
| `ttp_score_snapshots` | TQ-06, TQ-07, TQ-12 | P1 |
| `is_qa_sentinel` on `organizations` | TQ-08 | P0 |
| `ttp_data_consents` | TQ-05, TQ-14 | P2 |
| `ttp_partner_workflows` | TQ-02 | P3 |
| `ttp_partner_callback_events` | TQ-04 | P3 |
| `ttp_finance_requests` | TQ-15 | P3 |
| `ttp_partner_offers` | TQ-16 | P3 |
| `ttp_fee_events` | TQ-19 | P3 |

### 5.2 Critical Clarification: `ttp_audit_log`

Governance documents reference `ttp_audit_log` as if it is a separate Prisma model/table. **It is NOT.** The platform `AuditLog` model maps to the `audit_logs` table and is the actual audit mechanism. The governance docs appear to use `ttp_audit_log` as a logical label for TTP-specific audit events written to `audit_logs`. This naming inconsistency should be clarified in the next governance decision document to prevent future confusion.

### 5.3 No-Go Risks Confirmed Present

The following Phase 2 no-go risks from the scoping doc are confirmed real by repo inspection:

| Risk | Repo Evidence |
|---|---|
| Global kill-switch limitation | `ttpFeatureGateMiddleware` — global only |
| No per-org activation | `TenantFeatureOverride` exists but unused |
| No VPC expiry automation | No cron/scheduler job in codebase |
| No partner transmission | `partnerRouting.service.ts` create-on-read only |
| No consent model | Confirmed — no consent table in schema |
| No monitoring | No structured TTP event logging |
| No rollback runbook | No runbook document in `governance/` |
| Legal copy unreviewed | Disclaimer only in service file; no legal review artifact |
| QA fixtures co-located with production | Single-DB, UUID-namespace convention only |
| No audit trail export | No export endpoint on `audit_logs` |

### 5.4 Activation Readiness Assessment

Before any per-org TTP activation (even TQ-01 Option B with a single pilot org), the following must be in place:

1. **TQ-01 scoped activation design + approval** — defines the mechanism
2. **TQ-08 QA sentinel flag** — prevents QA data contaminating activation metrics
3. **TQ-09 monitoring signals** — must have observability before activating
4. **TQ-10 rollback runbook** — must know how to reverse before activating
5. **TQ-20 language governance** — UI copy must be reviewed before tenant-visible TTP is live

These are the P0 prerequisites for any activation. All others (TQ-02..TQ-07, TQ-11..TQ-19) can be designed and implemented independently or in Phase 2/3 sequences.

---

## 6. Recommended Decision Order

| Priority | TQs | Why |
|---|---|---|
| **P0 — Activation prerequisites** | TQ-01, TQ-08, TQ-09, TQ-10 | Must be resolved before any pilot org activation. No code/schema changes in production until these are answered. |
| **P1 — Score infrastructure** | TQ-06, TQ-07, TQ-11, TQ-12 | Score snapshot table enables audit evidence and TexQticScore v2. No legal gate required. Low risk. |
| **P2 — Legal-gate items** | TQ-05, TQ-13, TQ-14, TQ-20 | Consent and language governance. Require legal gate (P2-12) to complete before implementation. Design can proceed in parallel with legal review. |
| **P3 — Partner-gated items** | TQ-02, TQ-03, TQ-04, TQ-15, TQ-16, TQ-17 | Partner routing and finance requests. Blocked until partner contract signed. Design-only phase can begin after P0 legal copy review. |
| **P4 — Post-partner items** | TQ-18, TQ-19 | Buyer Trust Score and fee model. Depend on TexQticScore v2 design (TQ-11) and legal fee review. |

---

## 7. Recommended Next Artifact

**Recommended:** `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md`

This artifact would take the options matrix above and record Paresh's decisions for each TQ. It should:

1. For each TQ-01 through TQ-20: record the selected option (A/B/C) with Paresh sign-off
2. Identify the first implementation slice for each P0 item
3. Trigger the opening of `TTP-SCOPED-ACTIVATION-DESIGN-001` (if TQ-01 Option B approved)
4. Trigger the opening of `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` (for TQ-05, TQ-13, TQ-14, TQ-20 prerequisites)

No implementation units should be opened until this decisions artifact exists.

---

## 8. No-Go Boundaries Preserved

This audit document preserves all Phase 2 no-go boundaries from `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001.md` Section 12 unconditionally:

- `ttp_enabled = false` — UNCHANGED
- No live GST API integration
- No live CIBIL/bureau API integration
- No partner routing transmission or outbound partner HTTP
- No PSP/payment gateway
- No escrow/funds holding/disbursement
- No lending/NBFC/credit-risk-taking behavior
- No payment guarantee language or behavior
- No external partner credentials
- No automatic global TTP activation
- No per-org activation without scoped activation design in place
- No ICC/Singapore TradeTrust/W3C VC/DID/PKI/eBL implementation
- No live TexQticScore v2 with external bureau or GSTN data
- No partner finance rail implementation (TReDS, NBFC, dynamic discounting)
- No TexQtic lending, underwriting, or credit-risk-taking behavior
- No platform funds movement, custody, or disbursement
- No TexQticScore wording that implies a regulated credit decision

---

## 9. Final Decision

```
PHASE_2_ARCHITECTURE_QUESTIONS_REPO_TRUTH_AUDIT_COMPLETE
```

**`ttp_enabled` state at close of audit:** `false` — UNCHANGED  
**Files changed by this audit:** None (read-only investigation)  
**Schema changes:** None  
**Migrations:** None  
**Code changes:** None  

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*All recommendations are marked NOT FINAL and require explicit Paresh approval before any implementation unit is opened.*
