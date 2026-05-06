# PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001

**Document type:** Architecture decision record — final approval  
**Status:** `PHASE_2_ARCHITECTURE_QUESTIONS_APPROVED_FOR_DESIGN_PLANNING`  
**Date:** 2026-05-05  
**Decision Owner:** Paresh Patel (TexQtic founder / operator)  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**Scope:** TQ-01 through TQ-20 (Section 9, Phase 2 scoping artifact)  
**`ttp_enabled` state:** `false` — UNCHANGED by this document

> **DECISION RECORD ONLY.** This document records Paresh's final architecture-direction approvals for
> TQ-01 through TQ-20. It does not authorize implementation of any kind. No code, schema, migration,
> seed, env, runtime, or feature flag changes are made or authorized by this document.

---

## 1. Decision Summary

This document records Paresh's final architecture-direction approvals for all 20 open technical
architecture questions (TQ-01 through TQ-20) documented in Section 9 of
`governance/TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001.md`.

**Basis:** These approvals are grounded in the completed repo-truth audit documented in
`governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-REPO-TRUTH-AUDIT-001.md`
(`PHASE_2_ARCHITECTURE_QUESTIONS_REPO_TRUTH_AUDIT_COMPLETE`).

**What this document is:**

- A final decision record for each TQ-01 through TQ-20 architecture direction
- A gate document that enables the next design artifacts to be opened
- An authoritative record of Paresh's explicit approvals, grouped by priority tier

**What this document is NOT:**

- An implementation authorization
- A schema change authorization
- A migration authorization
- An activation order for `ttp_enabled`
- A tracker or implementation slice

**Key invariants preserved by this document:**

- `ttp_enabled = false` — UNCHANGED
- No code changes — NONE
- No schema changes — NONE
- No migrations — NONE
- Scoped activation (`TTP-SCOPED-ACTIVATION-DESIGN-001`) remains the **next recommended design unit**

**Final decision value:**

```
PHASE_2_ARCHITECTURE_QUESTIONS_APPROVED_FOR_DESIGN_PLANNING
```

---

## 2. Authority Basis

This decision record is grounded in the following authoritative sources:

| Source | Path | Relevance |
|---|---|---|
| Phase 2 scoping artifact | `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001.md` | TQ-01..TQ-20 question definitions, Buckets A–F, No-Go Boundaries, Legal Gate, Partner Gate |
| Repo-truth audit | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-REPO-TRUTH-AUDIT-001.md` | Full options matrix, schema gap analysis, repo-confirmed facts for all 20 TQs |
| Phase 1 readiness sign-off | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-1-ACTIVATION-READINESS-SIGNOFF-001.md` | Confirmed Phase 1 baseline; 15 capabilities, `ttp_enabled=false` |
| Slice 8 score advisory sign-off | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-8-SCORE-ADVISORY-VERIFIED-001.md` | Confirms TradeTrust Score v1 is ephemeral, pure function, no DB writes |
| QA seed routing readiness correction | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ROUTING-READINESS-CORRECTION-001.md` | Confirms `partner_routing_stubs` is Phase 1 readiness-only; QA UUID convention |
| Paresh's explicit P0 approval | This document, Section 4 | Paresh approves P0 decisions for next design and implementation planning |
| Paresh's grouped approvals P1–P4 | This document, Sections 5–8 | Paresh approves P1–P4 architecture directions by priority tier |

---

## 3. Current Repo Truth Baseline

The following is the confirmed Phase 1 repo state, as audited. This is the starting point from which
all Phase 2 decisions depart.

| Dimension | Current State |
|---|---|
| **Activation gate** | Global `ttpFeatureGateMiddleware` reads `feature_flags WHERE key='ttp_enabled'` only. Returns 503 if not true. All 13 TTP routes gated. |
| **Per-org activation** | `TenantFeatureOverride` model exists in schema with `unique(tenantId, key)`. NOT consulted by TTP middleware. No per-org activation logic anywhere. |
| **QA sentinel isolation** | Single-DB (Supabase). QA data isolated only by reserved UUID namespace `ee000000-0000-0000-0000-0000000000XX`. No `is_qa_sentinel` column in schema. |
| **TradeTrust Score** | Ephemeral pure function (`computeTtpScore`, 100pt, 7 factors, 4 bands). No DB writes. No `ttp_score_snapshots` table. |
| **Partner routing** | `partner_routing_stubs` is create-on-read readiness evidence. No actual partner HTTP call, no outbound transmission, no state machine. |
| **Consent** | No consent table exists (`ttp_data_consents` or similar). No consent recording anywhere. |
| **Partner workflow table** | None. No `ttp_partner_workflows`, `ttp_partner_callback_events`, `ttp_finance_requests`, `ttp_partner_offers`. |
| **Fee events** | No `ttp_fee_events` table. No fee recording or disclosure logic. |
| **Audit logging** | Platform-generic `AuditLog` model maps to `audit_logs` table. `ttp_audit_log` is a governance-doc label only — it is NOT a Prisma model. |
| **Language governance** | Mandatory advisory disclaimer in `ttpScore.service.ts` only. No API-contract enforcement, no forbidden-term lint, no legal copy review artifact. |

---

## 4. Approved P0 Decisions — Activation Prerequisites

**Status:** `APPROVED_FOR_NEXT_DESIGN_AND_IMPLEMENTATION_PLANNING`

**Scope:** These decisions unlock the opening of `TTP-SCOPED-ACTIVATION-DESIGN-001`. They are the minimum
set that must be resolved before any per-org TTP activation can occur.

**Critical clarification:** P0 approval means these decisions are cleared to proceed to bounded design
and implementation prompts. P0 approval does **not** itself authorize code or schema changes.
Each P0 item still requires a separate scoped design artifact and an approved implementation prompt.

| TQ | Approved Option | Decision | Why Approved | First Allowed Next Step |
|---|---|---|---|---|
| TQ-01 | **Option B** — global master switch + per-org `TenantFeatureOverride` override | `APPROVED` | `TenantFeatureOverride` table already exists — no new schema; backward compatible; preserves emergency global off capability. Option A has no rollout granularity; Option C removes global kill-switch. | Open `TTP-SCOPED-ACTIVATION-DESIGN-001`; include per-org middleware extension design |
| TQ-08 | **Option A** — add `is_qa_sentinel Boolean @default(false)` to `organizations` | `APPROVED` | UUID-only convention is implicit and unenforced; `is_qa_sentinel` is explicit, queryable, RLS-compatible; additive boolean with no side effects. | Include in `TTP-SCOPED-ACTIVATION-DESIGN-001`; requires SQL + prisma db pull + generate after approval |
| TQ-09 | **Option A first / Option B later** — structured pino logs now; DB-backed audit events after legal gate | `APPROVED` | Pino already in Fastify stack; no schema change needed for Option A; provides operational monitoring before activation. Option B deferred to after legal gate determines which events must be persisted. | Define TTP pino log event set in `TTP-SCOPED-ACTIVATION-DESIGN-001`; wire to all 13 TTP routes in implementation slice |
| TQ-10 | **Option A** — manual rollback runbook | `APPROVED` | Phase 2 is a controlled per-org pilot; rollback scope is one org at a time; manual runbook is sufficient and safer than automated bulk-void. `TRANSMITTED` VPCs cannot be reversed regardless — accepted invariant. | Write activation + rollback runbook as part of `TTP-SCOPED-ACTIVATION-DESIGN-001` |
| TQ-20 | **Option B baseline** — shared `TTP_DISCLAIMER_TEXT` constant + forbidden language governance | `APPROVED` | Single-file disclaimer is insufficient protection against language drift as codebase grows; platform-wide constant + lint governance creates defense in depth proportionate to legal risk. Legal copy review required for final approved disclaimer text and forbidden terms list. | Add `TTP_DISCLAIMER_TEXT` constant + `advisory_disclaimer` to TTP API response schemas in `TTP-SCOPED-ACTIVATION-DESIGN-001`; commission `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` in parallel |

**P0 Summary:** All five P0 decisions approved. `TTP-SCOPED-ACTIVATION-DESIGN-001` may now be opened.
No code, schema, or runtime changes are authorized by this approval. Each P0 item requires a bounded
implementation prompt after the design artifact is approved by Paresh.

---

## 5. Approved P1 Decisions — Score Architecture

**Status:** `APPROVED_AS_DESIGN_TARGET__NOT_IMPLEMENTATION_AUTHORIZED`

**Scope:** These decisions define the target architecture for TradeTrust Score snapshots and TexQticScore v2.
No score snapshot table, TexQticScore v2 function, or score API change is authorized by this document.

| TQ | Approved Option | Decision | Why Approved | Gate Before Implementation |
|---|---|---|---|---|
| TQ-06 | **Option B** — new `ttp_score_snapshots` table with `trigger_event` enum | `APPROVED_AS_DESIGN_TARGET` | Ephemeral-only (Option A) cannot answer "what was the score at VPC issuance?" — required for dispute resolution, lender evidence, audit trail. Append-only table; no existing behavior changes. | No legal gate; requires Paresh-approved implementation prompt + SQL + prisma generate |
| TQ-07 | **Option B** — hybrid: live score for tenant UX + trigger snapshots at VPC issuance / enrollment approval / admin review / partner transmission | `APPROVED_AS_DESIGN_TARGET` | Live computation preserves real-time accuracy for tenant; trigger snapshots preserve historical accuracy for compliance and audit. Both are needed. Option A alone cannot support audit or lender evidence. | Depends on TQ-06 snapshot table design |
| TQ-11 | **Option B** — new `computeTexQticScore` function with distinct `TexQticScoreInput` / `TexQticScoreOutput` contract | `APPROVED_AS_DESIGN_TARGET` | Phase 1 `computeTtpScore` has a tested 7-factor contract used by existing endpoints; extending it would break v1 contract and make independent versioning impossible. Separate function enables parallel use and `score_version` distinction. | Requires separate `TTP-TEXQTICSCORE-V2-DESIGN-001` artifact before any code |
| TQ-12 | **Option B** — reuse `ttp_score_snapshots` with `score_version` column to distinguish TradeTrust Score v1 from TexQticScore v2 | `APPROVED_AS_DESIGN_TARGET` | One table covers both TQ-06 (v1 snapshots) and TQ-12 (v2 snapshots); `score_version` column is the only required addition; no second table needed. | Depends on TQ-06 and TQ-11 design artifacts |

**P1 Note:** The `ttp_score_snapshots` table does not exist in the schema today. No schema, migration,
or snapshot write logic is authorized by this document. The P1 design target is approved; implementation
is subject to a separate, Paresh-approved bounded implementation prompt.

---

## 6. Approved P2 Decisions — Legal-Gated Consent / Data Sharing

**Status:** `APPROVED_AS_LEGAL_GATED_DESIGN_DIRECTION`

**Scope:** These decisions define the architecture direction for consent and data-sharing. No consent table,
live GST API, live CIBIL/bureau API, lender data sharing, Account Aggregator integration, or external
score sharing is authorized until the legal/compliance gate defined in Section 7 of the Phase 2 scoping
artifact is complete.

| TQ | Approved Option | Decision | Why Approved | Gate Before Any Implementation |
|---|---|---|---|---|
| TQ-05 | **Option A** — new `ttp_data_consents` table, per-org consent with `consent_type` enum (GST_PULL / CIBIL_PULL / LENDER_DATA_SHARE) | `APPROVED_AS_LEGAL_GATED_DESIGN_DIRECTION` | DPDP-aligned; reusable per-org; supports revocation via `revoked_at`; one table covers GST pull, CIBIL pull, and lender data sharing via enum. Per-trade (Option B) is overly granular; per-request (Option C) has no revocation support. | Legal gate (DPDP review, GSTN/GSP consent architecture, CIBIL consent) must complete. `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` must exist. |
| TQ-13 | **Option A for Phase 2** — internal-only TexQticScore; **Option B for Phase 3** — external lender sharing deferred until after legal + partner gates | `APPROVED_AS_LEGAL_GATED_DESIGN_DIRECTION` | External sharing triggers DPDP consent, partner data-sharing agreement, disclaimer pre-approval, and regulatory review. None of these gates are clear in Phase 2. Internal use for routing decisions is distinct from sharing the score with a lender as underwriting input. | All legal gates + partner contracts required. Phase 3 design artifact only. |
| TQ-14 | **Option C** — time-bounded per-org consent with `expires_at` and `revoked_at` | `APPROVED_AS_LEGAL_GATED_DESIGN_DIRECTION` | DPDP requires informed, specific, revocable consent. Time-bounded (Option C) provides all three. Unlimited per-org (Option A) is weaker. Per-trade (Option B) is excessive friction with no regulatory benefit over per-org with expiry. | Same legal gate as TQ-05. One `ttp_data_consents` table covers both. |
| TQ-20 | **Option B language governance baseline** — `TTP_DISCLAIMER_TEXT` constant + forbidden-term governance — also applies here as legal-copy governance | `APPROVED_AS_LEGAL_GATED_DESIGN_DIRECTION` | The legal-copy governance baseline in TQ-20 is both a P0 operational requirement (constant + API field) and a P2 legal gate requirement (approved disclaimer text, forbidden terms list, pre-commit lint). The constant can be created before legal review; the lint hook and approved text require `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` to complete. | Legal copy review required for final approved disclaimer text and forbidden terms list. |

**P2 Note:** No consent table design, live GST integration, live CIBIL integration, lender data sharing,
Account Aggregator integration, or external score sharing of any kind is authorized by this document.
`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` may proceed as a parallel non-code governance artifact immediately.

---

## 7. Approved P3 Decisions — Partner-Gated Marketplace / Routing

**Status:** `APPROVED_AS_PARTNER_GATED_DESIGN_DIRECTION`

**Scope:** These decisions define the target architecture for partner transmission, finance requests, and
marketplace rails. No partner transmission, callbacks, finance request table, partner offer table,
dynamic discounting, TReDS, NBFC, SCF, SIDBI, or factoring implementation is authorized until the
legal gate AND partner contract gates defined in Sections 7–8 of the Phase 2 scoping artifact are complete.

| TQ | Approved Option | Decision | Why Approved | Gate Before Any Implementation |
|---|---|---|---|---|
| TQ-02 | **Option B** — new `ttp_partner_workflows` table; `partner_routing_stubs` remains as Phase 1 routing-readiness evidence only | `APPROVED_AS_PARTNER_GATED_DESIGN_DIRECTION` | `partner_routing_stubs` was designed as routing-readiness preparation evidence, not a live workflow object. A separate `ttp_partner_workflows` table gives clean lifecycle separation and independent audit trail; keeps stub semantics stable. | Partner contract (Section 8) required. Bucket D prerequisite. |
| TQ-03 | **Option B** — VPC transitions to `TRANSMITTED` only after a confirmed, persisted partner acknowledgement | `APPROVED_AS_PARTNER_GATED_DESIGN_DIRECTION` | `TRANSMITTED` is a terminal, irreversible VPC state. An HTTP 200 on outbound call does not guarantee partner has accepted. Phantom TRANSMITTED on HTTP success has no recovery path. Persisted ack preserves audit integrity for an irreversible state. | Depends on TQ-02 (partner workflow table). Partner contract + webhook schema required. |
| TQ-04 | **Option A** — append-only `ttp_partner_callback_events` table | `APPROVED_AS_PARTNER_GATED_DESIGN_DIRECTION` | Partner callbacks are external events from systems outside TexQtic's control; they are immutable facts. Direct mutation (Option B) destroys history on the first callback overwrite — unacceptable for compliance and dispute resolution. | Depends on TQ-02. Partner contract + webhook schema required. |
| TQ-15 | **Option B** — new `ttp_finance_requests` table with structured request lifecycle | `APPROVED_AS_PARTNER_GATED_DESIGN_DIRECTION` | `partner_routing_stubs` semantics are routing-readiness-only; a finance request is a distinct live workflow with counterparty interactions and compliance requirements. Option A conflates two concerns. Clean separation with independent audit trail. | Partner contract required. Reconcile with TQ-02 in Finance Marketplace design artifact. |
| TQ-16 | **Option B** — new `ttp_partner_offers` table with structured offer lifecycle | `APPROVED_AS_PARTNER_GATED_DESIGN_DIRECTION` | A financing offer is a distinct business object with its own lifecycle and audit requirements. JSONB on another table (Option A) makes offer lifecycle invisible to queries and UI; no expiry enforcement, no comparison UI, no acceptance audit trail. | Depends on TQ-15 (`finance_request_id` FK). Partner contract + offer schema required. |
| TQ-17 | **Option A** — buyer-initiated dynamic discounting first | `APPROVED_AS_PARTNER_GATED_DESIGN_DIRECTION` | Buyer-initiated (Option A) has lowest regulatory complexity: offer originates from buyer, not from TexQtic. Platform records and facilitates only; does not compute or recommend discount rate. Option B requires TQ-18 Buyer Trust Score (Phase 3 dependency). **TexQtic must NOT hold or move funds in any dynamic discounting implementation.** | Legal + product review required. TQ-05 consent model prerequisite. Phase 3 design target. |

**P3 Note:** No partner transmission, partner HTTP calls, callback receiver, finance request table,
partner offer table, dynamic discounting, TReDS, NBFC, SCF, SIDBI, or factoring implementation
is authorized by this document. `partner_routing_stubs` remains as Phase 1 evidence only.
P3 design artifacts may be opened only after legal and partner contract gates complete.

---

## 8. Approved P4 Decisions — Future Finance / Legal Positioning

**Status:** `APPROVED_AS_FUTURE_DESIGN_TARGET__NOT_IMPLEMENTATION_AUTHORIZED`

**Scope:** These decisions set the design direction for Buyer Trust Score and fee events. Neither item
is authorized for any design or implementation until its named prerequisite gates complete.

**Buyer Trust Score must begin with on-platform data only (TQ-18 Option A).** External data access
(CIBIL, GST, Account Aggregator for buyers) requires a separate buyer consent design and legal gate.

**Fee recording requires legal fee/disclosure review before any schema design or implementation (TQ-19).** The fee type enum and `legal_basis` field content depend entirely on legal review output.

| TQ | Approved Option | Decision | Why Approved | Gate Before Any Design or Implementation |
|---|---|---|---|---|
| TQ-18 | **Option A** — Buyer Trust Score from on-platform data only (buyer invoice acceptance rate, payment history, dispute count, relationship tenure) | `APPROVED_AS_FUTURE_DESIGN_TARGET` | On-platform buyer data is DPDP-compliant under existing platform terms. External data (Option B: CIBIL, GST, Account Aggregator for buyers) requires separate buyer consent design and distinct legal gate. Option A gives meaningful signal without regulatory complexity. | Depends on TQ-11 (`TTP-TEXQTICSCORE-V2-DESIGN-001`). Phase 3 design target. |
| TQ-19 | **Option B** — dedicated `ttp_fee_events` append-only table with `fee_type` enum, `disclosed_at`, `disclosed_to_user_id`, `legal_basis` | `APPROVED_AS_FUTURE_DESIGN_TARGET` | Fee events are compliance-critical records that must be immutable, auditable, and exportable for regulatory review. Platform `audit_logs` (Option A) is a general-purpose log with loose structure — mixing fee records with operational events is wrong for compliance. Dedicated table gives structured, exportable fee audit capability. | Legal fee/disclosure review required. Fee type enum and `legal_basis` field content depend on legal review. No schema design authorized until legal review completes. |

---

## 9. Cross-Cutting Architectural Rules

The following rules are hereby established as final Phase 2 architectural invariants. They apply to
all implementation slices across P0 through P4 and may not be superseded by individual implementation
prompts without a new architecture decision record.

1. **Global master switch remains.** `feature_flags.ttp_enabled` is the emergency off switch. It
   cannot be removed, bypassed, or weakened in any implementation.

2. **Per-tenant activation is layered under the global switch.** A `TenantFeatureOverride` value of
   `ttp_enabled=true` for an org has no effect when `feature_flags.ttp_enabled=false`. Global off
   is always absolute.

3. **`feature_flags.ttp_enabled=false` blocks all TTP** — regardless of any tenant override value.
   Setting the global flag to false is always a valid and complete emergency stop.

4. **`feature_flags.ttp_enabled=true` only arms the system.** A tenant-level `TenantFeatureOverride`
   record with `key='ttp_enabled'` and an appropriate enabled value is still required before any
   individual tenant can access TTP routes under scoped activation.

5. **QA sentinel data must be explicitly marked in Phase 2.** The UUID-namespace convention alone is
   insufficient for Phase 2 scale. `is_qa_sentinel` on `organizations` is the target isolation
   mechanism.

6. **Scores remain advisory.** TradeTrust Score v1 and TexQticScore v2 are advisory signals only.
   They must not be presented as credit decisions, loan approvals, financing guarantees, or regulated
   scoring outputs. The `advisory_disclaimer` field and `TTP_DISCLAIMER_TEXT` constant enforce this
   at every layer.

7. **TexQticScore v2 must be separate from Phase 1 score contract.** `computeTtpScore` (Phase 1,
   7-factor, 100pt) is stable and tested. TexQticScore v2 must use a new function
   (`computeTexQticScore`) with a distinct `TexQticScoreInput` / `TexQticScoreOutput` type contract.
   The two must never share a function signature.

8. **External score sharing is Phase 3 and legal + partner gated.** Internal use of the score for
   routing decisions is permitted after legal + partner gates for routing. Direct sharing of the
   score with a lender as underwriting input requires all Phase 3 gates.

9. **Partner workflows must not mutate Phase 1 routing stub meaning.** `partner_routing_stubs` is
   Phase 1 routing-readiness evidence. Its `transmission_status` values and `response_json` field
   must not be repurposed for Phase 2 live transmission semantics. The new `ttp_partner_workflows`
   table owns the live workflow lifecycle.

10. **VPC `TRANSMITTED` requires persisted partner acknowledgement.** The terminal state `TRANSMITTED`
    on a `verified_payable_certificate` must only be written after a partner acknowledgement event
    has been persisted in `ttp_partner_callback_events`. HTTP 200 on outbound call is not sufficient.

11. **Partner callbacks must be append-only.** `ttp_partner_callback_events` is an immutable event
    log. No callback row may be updated or deleted. Direct mutation of callback state is forbidden.

12. **TexQtic must not lend, underwrite, guarantee, hold funds, or act as payment intermediary.**
    This is an absolute, perpetual no-go boundary. Any implementation that involves TexQtic
    collecting, holding, disbursing, or guaranteeing funds is unconditionally forbidden.

13. **All user-facing finance language must follow legal-governed disclaimer and forbidden-term rules.**
    No TTP-adjacent UI copy may be written, merged, or deployed without review against the
    `TTP_DISCLAIMER_TEXT` constant and the approved forbidden-terms list (once `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` delivers the list).

---

## 10. Implementation Readiness Matrix

| Group | TQs | Readiness Status | Blocking Gate | Earliest Next Artifact |
|---|---|---|---|---|
| **P0** — Activation prerequisites | TQ-01, TQ-08, TQ-09, TQ-10, TQ-20 | `DESIGN_AND_IMPLEMENTATION_PLANNING_READY` | None — cleared for next design artifact | `TTP-SCOPED-ACTIVATION-DESIGN-001` |
| **P1** — Score architecture | TQ-06, TQ-07, TQ-11, TQ-12 | `DESIGN_TARGET_ONLY` | Paresh-approved scoped implementation prompt required; TQ-11 requires separate design artifact | `TTP-TEXQTICSCORE-V2-DESIGN-001` (TQ-11/12); score snapshot implementation slice (TQ-06/07) |
| **P2** — Legal-gated consent / data sharing | TQ-05, TQ-13, TQ-14, TQ-20 | `LEGAL_GATED` | Legal/compliance gate (DPDP, GSTN consent, CIBIL consent, lender data-sharing agreements, copy review) | `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` (non-code, can start now) |
| **P3** — Partner-gated marketplace / routing | TQ-02, TQ-03, TQ-04, TQ-15, TQ-16, TQ-17 | `PARTNER_GATED` | Legal gate + partner contract signed (Section 8 of scoping artifact) | Finance Marketplace design artifact (after legal + partner gates clear) |
| **P4** — Future finance / legal positioning | TQ-18, TQ-19 | `FUTURE_DESIGN_TARGET` | TQ-11 design artifact (TQ-18); legal fee/disclosure review (TQ-19) | Phase 3 design targets; no near-term artifact |

---

## 11. Recommended Next Artifacts

### Primary: `TTP-SCOPED-ACTIVATION-DESIGN-001`

**Trigger:** This document — P0 decisions approved.

**Purpose:** Design the scoped activation system for TTP Phase 2. This is a design-only artifact.
It must produce an approved design before any implementation prompt is opened.

**Minimum scope of `TTP-SCOPED-ACTIVATION-DESIGN-001`:**

| Item | TQ | Design Requirement |
|---|---|---|
| Per-org `TenantFeatureOverride` middleware extension | TQ-01 | Design the two-layer gate: global flag check first, then per-org override. Define `enabled` semantics. |
| QA sentinel flag | TQ-08 | Design `is_qa_sentinel Boolean @default(false)` addition to `organizations`. Define SQL, Prisma impact, seed update. |
| Structured TTP pino log events | TQ-09 | Define the full log event set (at minimum: gate blocked, VPC error, eligibility expiry, enrollment gate failure, 5xx rate). Define log schema. |
| Manual rollback runbook | TQ-10 | Write the activation + rollback runbook. Define steps: set feature flag / per-org override / admin void non-terminal VPCs. |
| Language governance baseline | TQ-20 | Design `TTP_DISCLAIMER_TEXT` constant location and value (placeholder until legal review). Design `advisory_disclaimer` field addition to all TTP API response types. |

**Artifact must not include:** any implementation authorization, any migration command, any SQL write,
any feature flag change, any partner routing, any schema change not listed above.

### Parallel (non-code, may start immediately): `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`

**Trigger:** This document — P2 decisions approved as legal-gated.

**Purpose:** Governance + legal artifact (no code). Establishes:

- Approved disclaimer text for `TTP_DISCLAIMER_TEXT` constant
- Forbidden-term list (seed for pre-commit lint hook)
- DPDP-aligned consent architecture requirements for TQ-05 + TQ-14
- Legal sign-off on VPC certificate wording, enrollment copy, score advisory wording

**This artifact produces no code, no schema changes, no migrations.** It is a governance and legal
review artifact only. It may proceed in parallel with `TTP-SCOPED-ACTIVATION-DESIGN-001`.

---

## 12. Explicit Non-Authorization

This document explicitly does **not** authorize any of the following:

| Category | Specific Non-Authorization |
|---|---|
| **Code** | No code changes of any kind |
| **Schema** | No `schema.prisma` modifications |
| **Migrations** | No migration files, no `migrate deploy`, no `db push`, no `db pull` (except after SQL is applied and verified, per governance protocol) |
| **SQL writes** | No SQL writes, no `psql` execution with data-modifying statements |
| **Runtime** | No runtime behavior changes, no server restart for TTP purposes |
| **Feature flags** | No enabling of `ttp_enabled` — it remains `false` |
| **TTP activation** | No TTP activation, no per-org activation, no pilot rollout |
| **Live data integrations** | No live GST API, no live CIBIL/bureau API, no Account Aggregator |
| **Partner transmission** | No outbound partner HTTP calls, no VPC transmission |
| **PSP / payment** | No payment gateway, no PSP integration |
| **Finance / lending** | No lending, no NBFC, no custody, no funds disbursement, no payment guarantee |
| **External data sharing** | No external score sharing, no lender data-sharing API |
| **Finance marketplace** | No finance marketplace implementation, no TReDS, no dynamic discounting |
| **TexQticScore v2** | No `computeTexQticScore` implementation, no new score input model |
| **Fee recording** | No `ttp_fee_events` table, no fee calculation, no fee disclosure logic |
| **Seed / auth** | No new seed data, no new auth users, no existing seed modification |

---

## 13. No-Change Confirmation

The following invariants were verified before this document was written and remain unchanged:

| Invariant | Confirmed State |
|---|---|
| `ttp_enabled` | `false` — UNCHANGED |
| Runtime behavior | No change — NONE |
| Code changes | No code changes — NONE |
| Schema / migration changes | No schema or migration changes — NONE |
| Seed / auth changes | No seed or auth changes — NONE |
| External API calls | No external API calls — NONE |
| Partner transmission | No partner transmission — NONE |
| Implementation authorization | Not authorized by this document |

---

## 14. Final Decision

```
PHASE_2_ARCHITECTURE_QUESTIONS_APPROVED_FOR_DESIGN_PLANNING
```

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Files changed by this decision record:** This document only  
**Implementation authorized:** No  
**Next artifact:** `TTP-SCOPED-ACTIVATION-DESIGN-001`

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*P0 decisions are approved for next design and implementation planning. P1–P4 decisions are architecture directions only.*  
*No implementation work may proceed until a bounded design artifact is approved by Paresh.*
