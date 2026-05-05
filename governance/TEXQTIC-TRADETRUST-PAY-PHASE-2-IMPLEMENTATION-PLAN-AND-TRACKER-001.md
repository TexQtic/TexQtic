# TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001

**Document type:** Phase 2 execution control artifact — implementation plan and tracker  
**Status:** `PHASE_2_IMPLEMENTATION_PLAN_AND_TRACKER_CREATED`  
**Date:** 2026-05-05  
**Decision Owner:** Paresh Sharma (TexQtic founder / operator)  
**Author:** GitHub Copilot — TexQtic Safe-Write Mode  
**`ttp_enabled` state:** `false` — UNCHANGED by this document

> **PLANNING AND TRACKING ARTIFACT ONLY.** This document converts the approved Phase 2 architecture
> decisions into a staged execution plan. It does not authorize implementation of any kind. No code,
> schema, migration, seed, env, runtime, or feature flag changes are made or authorized by this document.

---

## 1. Purpose

This artifact is the **Phase 2 execution control document** for TexQtic TradeTrust Pay.

It converts the approved architecture decisions from
`governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md`
into a clear staged execution sequence.

### What this document is

- A sequenced implementation plan organized by wave and priority tier
- A tracker table with per-unit status for all planned Phase 2 work
- A no-go register enforcing design, legal, and partner gates
- A verification discipline matrix

### What this document is NOT

- An implementation authorization
- A design artifact
- A schema change authorization
- A migration authorization
- An activation order for `ttp_enabled`
- An authorization to open any implementation slice

### Key operational rules

1. **All implementation requires a bounded design artifact** produced first.
2. **All design artifacts require Paresh approval** before any implementation prompt is opened.
3. **All implementation units require verification** before closure.
4. **Production-dependent units** (feature gate, routes, tenant UI, control UI, runtime behavior, shared
   shell) require: commit → deploy → verify on `https://app.texqtic.com` → truth sync.
5. **Adjacent defects discovered during implementation** must be recorded as separate units — never
   auto-merged into the current unit.
6. **No unit may be closed on local proof alone** if it affects production behavior.
7. **`ttp_enabled=false` remains unchanged** by this document and by every unit in Wave 0 except the
   unit that explicitly activates a pilot org (which itself requires a separate Paresh activation decision).

---

## 2. Authority Basis

This document is grounded in the following authoritative sources:

| Source | Path | Role |
|---|---|---|
| Phase 2 scoping artifact | `governance/TEXQTIC-TRADETRUST-PAY-DESIGN-V2-PHASE-2-SCOPING-001.md` | TQ-01..TQ-20 definitions, Buckets A–F, Legal Gate (§7), Partner Gate (§8), No-Go Boundaries (§12) |
| Repo-truth audit | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-REPO-TRUTH-AUDIT-001.md` | Options matrices, schema gap analysis, all 20 TQs verified against repo |
| Final Phase 2 architecture decision record | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` | P0–P4 approved options, 13 cross-cutting invariants, readiness matrix |
| Phase 1 activation readiness sign-off | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-1-ACTIVATION-READINESS-SIGNOFF-001.md` | 15 confirmed Phase 1 capabilities, baseline state |
| Slice 8 score advisory verification | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-SLICE-8-SCORE-ADVISORY-VERIFIED-001.md` | TradeTrust Score v1 confirmed ephemeral, pure, no DB writes |
| QA routing readiness correction | `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-QA-SEED-ROUTING-READINESS-CORRECTION-001.md` | `partner_routing_stubs` confirmed as Phase 1 readiness evidence only; 38/38 E2E pass confirmed |

---

## 3. Current Runtime / Product State

| Dimension | Confirmed State |
|---|---|
| **Phase 1 status** | Complete — 15 capabilities implemented, unit-tested, production-deployed |
| **Slice 8 status** | Complete — TradeTrust Score Advisory Layer verified; `computeTtpScore` is ephemeral pure function |
| **E2E test status** | 38/38 Playwright tests pass (57.9s) after QA routing-readiness correction |
| **`ttp_enabled`** | `false` — global. All 13 TTP routes return HTTP 503 `FEATURE_DISABLED` |
| **Wave 0 P0 units** | All 6 Wave 0 P0 implementation units `TRUTH_SYNCED`. Scoped activation (two-layer gate), QA sentinel flag, structured monitoring events, rollback runbook, language governance baseline — all complete. See §18 for commit registry. |
| **Activation gate** | `ttpFeatureGateMiddleware` reads `feature_flags WHERE key='ttp_enabled'` (global). If global `true`, also consults `TenantFeatureOverride` for per-org override. Two-layer gate in effect (TTP-IMPL-003 `TRUTH_SYNCED`). |
| **Per-tenant activation** | `TenantFeatureOverride` model exists and IS consulted by TTP middleware. Per-org override wired. `ttp_enabled=false` globally → all orgs blocked regardless of override. |
| **QA sentinel isolation** | `is_qa_sentinel Boolean @default(false)` column on `organizations`. QA orgs (`ee000000-0000-0000-0000-0000000000XX`) have `is_qa_sentinel=true`. Real orgs: `is_qa_sentinel=false`. (TTP-IMPL-001 `TRUTH_SYNCED`) |
| **TradeTrust Score** | Ephemeral, 100pt, 7 factors, 4 bands. No `ttp_score_snapshots` table. No DB writes. |
| **Partner routing** | `partner_routing_stubs` is create-on-read readiness evidence only. No outbound HTTP. No state machine. |
| **Consent** | No consent table. No consent recording. |
| **Partner workflow tables** | None (`ttp_partner_workflows`, `ttp_partner_callback_events`, `ttp_finance_requests`, `ttp_partner_offers` — none exist). |
| **Fee events** | No `ttp_fee_events` table. No fee recording or disclosure logic. |
| **Live external integrations** | None — GST manual only, CIBIL stub only, no partner transmission. |
| **Payment / lending / custody** | None — TexQtic does not lend, hold funds, or act as payment intermediary. |
| **Language governance** | `TTP_DISCLAIMER_TEXT` constant in `server/src/ttp/ttp.constants.ts`. `advisory_disclaimer` field in all TTP API responses (`TtpSummary`, `TtpEnrollmentRecord`). `SCORE_DISCLAIMER` in `ttpScore.service.ts`. Structured Pino monitoring events (`ttp.route.error`, `ttp.vpc.generate.error`, `ttp.eligibility.expired`, `ttp.enrollment.gate_failed`) in all 13 TTP route catch blocks. Rollback runbook at `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md`. Legal copy review complete: `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` `TRUTH_SYNCED` (`1e539da`); counsel packet ready for Paresh review: `TTP-LEGAL-COPY-COUNSEL-PACKET-001` (`f0ead0f`, `LEGAL_REVIEW_PENDING`). Score snapshot design decisions recorded: `TTP-SCORE-SNAPSHOT-DESIGN-001` (`DESIGN_DECISIONS_RECORDED`); decisions in `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001`. |

---

## 4. Phase 2 Execution Principles

### 4.1 TECS Working Sequence

Every Phase 2 unit follows this exact sequence. Steps may not be skipped or reordered.

```
1. Next-unit confirmation / opening
   → Paresh confirms the next unit to open. No work begins without this.

2. Bounded design / plan artifact
   → A design artifact defines exactly what changes, what files, what verification.
   → Design must be complete and correct before implementation starts.

3. Repo-truth validation
   → Confirm the current repo state before the unit starts.
   → Identify any drift from prior truth syncs.

4. Implementation planning
   → Implementation prompt defines the exact allowlist, approved commands, and stop conditions.

5. Slice-by-slice implementation
   → Work in small, atomic slices.
   → One commit per slice. One concern per commit.

6. Verification discipline
   → Unit tests, type checks, lint, E2E (where applicable), and production verification (where required).
   → All verification criteria from the design artifact must pass before closure.

7. Light post-unit truth sync
   → Update governance/repo truth state after the unit closes.
   → Record any adjacent defects discovered. Do not fix them in the current unit.
```

### 4.2 Execution Non-Negotiables

| Rule | Enforcement |
|---|---|
| No implementation without approved design | Every implementation prompt must reference an approved design artifact |
| No closure without verification | All required verification criteria must be documented and passing |
| Production-dependent units require commit → deploy → verify → truth sync | Cannot close on local proof alone |
| Adjacent defects recorded separately | Never merge a discovered defect fix into an unrelated implementation unit |
| No schema changes without explicit Paresh approval | Schema changes trigger migration, RLS, type regeneration — all require bounded scope |
| No migrations via `migrate dev` or `db push` | SQL first, then `prisma db pull`, then `prisma generate` — always |
| No `ttp_enabled` change without explicit Paresh activation decision | Even P0 implementation units must not touch `ttp_enabled` until the activation unit is explicitly opened |

---

## 5. Phase 2 Master Roadmap

| Wave | Name | Purpose | TQs | Gate | Status | Next Action |
|---|---|---|---|---|---|---|
| **Wave 0** | Control and safety foundation | Scoped activation, QA sentinel, monitoring, rollback runbook, language governance baseline | TQ-01, TQ-08, TQ-09, TQ-10, TQ-20 | None — P0 cleared | `COMPLETE / TRUTH_SYNCED` | All P0 units complete — see §18 |
| **Wave 1** | Legal/compliance copy review | Final disclaimer text, forbidden-term list, consent wording, DPDP notes, VPC/score language sign-off | TQ-20 (final text), TQ-05/14 wording | None (non-code) — may start in parallel | `OPERATOR_READY__LEGAL_PENDING` | `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` `TRUTH_SYNCED`; `TTP-LEGAL-COPY-COUNSEL-PACKET-001` ready for Paresh review; final legal sign-off pending |
| **Wave 2** | Score architecture foundation | Score snapshots, hybrid live + snapshot triggers, TexQticScore v2 design, score versioning | TQ-06, TQ-07, TQ-11, TQ-12 | P0 design complete | `IMPLEMENTATION_IN_PROGRESS` | Slice 1 `TRUTH_SYNCED` (`5e8ac44`, `f9a1ecd`); Slice 2 `TRUTH_SYNCED` (`371b739`, `86b6373`) — `TtpScoreSnapshotService` + 13 tests; Slice 3 `TRUTH_SYNCED` (`a2c9d0d`, `33dd382`); Slice 4 `IMPLEMENTATION_IN_PROGRESS` — enrollment route trigger + `captureEnrollmentApprovedSnapshot` + 12 tests; tsc clean |
| **Wave 3** | Consent and data-sharing design | Data consents table, internal-only score Phase 2 / external Phase 3, time-bounded consent | TQ-05, TQ-13, TQ-14 | Legal gate (DPDP, GSTN, CIBIL consent) | `LEGAL_GATED__WAITING` | Do not start until Wave 1 complete |
| **Wave 4** | Partner marketplace design | Partner workflows, VPC TRANSMITTED after persisted ack, callback events, finance requests, partner offers, dynamic discounting | TQ-02, TQ-03, TQ-04, TQ-15, TQ-16, TQ-17 | Legal gate AND partner contract signed | `PARTNER_GATED__WAITING` | Do not start until Wave 1 + partner contract |
| **Wave 5** | Future finance/legal positioning | Buyer Trust Score, fee events / fee disclosure | TQ-18, TQ-19 | TQ-11 design (TQ-18); legal fee review (TQ-19) | `FUTURE_DESIGN_TARGET__WAITING` | Phase 3 design targets; no near-term action |

---

## 6. Immediate Next Unit

| Field | Value |
|---|---|
| **Unit ID** | `TTP-SCORE-SNAPSHOT-DESIGN-001` |
| **Status** | `DESIGN_DECISIONS_RECORDED` |
| **Type** | Design / governance artifact (non-code) |
| **Purpose** | Produce the canonical design for `ttp_score_snapshots` table: conceptual schema, trigger event model (`VPC_ISSUED`, `ENROLLMENT_APPROVED`, `ADMIN_REVIEW_COMPLETE`), hybrid live + snapshot architecture, data integrity, tenant isolation, legal boundaries, and implementation slicing plan. Covers TQ-06 and TQ-07. |
| **Gate** | Wave 0 implementation complete and TRUTH_SYNCED — **CLEARED** |
| **Authorized by** | This tracker document; Wave 2 status `DESIGN_DECISIONS_RECORDED`; §9 P1 Score Architecture Tracker; TQ-06 + TQ-07 `APPROVED_AS_DESIGN_TARGET`; design decisions at `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001` |

### What this unit must produce

| Output | Used By | Required Before |
|---|---|---|
| Conceptual `ttp_score_snapshots` schema (columns, types, constraints) | `TTP-SCORE-SNAPSHOT-IMPL-001` | Implementation prompt authorization |
| Trigger event enum design (`VPC_ISSUED`, `ENROLLMENT_APPROVED`, `ADMIN_REVIEW_COMPLETE`) | Implementation slice design | Any snapshot write logic |
| Hybrid live + snapshot model design | `TTP-TEXQTICSCORE-V2-DESIGN-001` | Score v2 design |
| `score_version` field design rationale | `TTP-SCORE-VERSIONING-IMPL-001` | Versioning implementation |
| Tenant isolation and `org_id` enforcement design | All TTP DB units | Any implementation |
| Legal and copy boundary documentation | Legal review output | Wave 1 legal sign-off |
| Implementation slicing recommendation (6 future slices, none opened) | `TTP-SCORE-SNAPSHOT-IMPL-001` and beyond | Paresh implementation decision |
| Open questions / decisions required before implementation | Paresh review | Implementation authorization |
| Final decision token | Tracker closure | Paresh approval to open `TTP-SCORE-SNAPSHOT-IMPL-001` |

### Critical clarifications for this unit

- **This is a design / governance artifact only.** No code changes, no schema changes, no SQL, no migrations, no route changes, no feature flags.
- **`ttp_enabled` remains `false` throughout.** This unit does not authorize or request activation.
- **`ttp_score_snapshots` table does not exist.** This unit designs it conceptually — it does NOT create it.
- **`computeTtpScore` must not be modified.** The existing 7-factor pure function is the score engine for this design. No changes to `ttpScore.service.ts`.
- **`TTP-SCORE-SNAPSHOT-IMPL-001` must NOT be opened** until this design is reviewed and approved by Paresh.
- **`PARTNER_TRANSMITTED` trigger is Wave 4 scope only.** Must not be included in Wave 2 implementation slices.
- **Legal status is `LEGAL_REVIEW_PENDING`** throughout. No copy changes authorized by this design unit.
- **Do not open any Wave 2 implementation unit, Wave 3, Wave 4, or Wave 5 unit** during or as a result of this unit.

---

## 7. P0 Implementation Unit Tracker

All Wave 0 P0 implementation units below are complete and `TRUTH_SYNCED`. This table is the
historical execution record for completed Wave 0 units. No further Wave 0 implementation is open.
Future units require separate Paresh approval and appropriate gates before any implementation
prompt may be opened.

| Unit ID | Unit Name | TQ | Type | Likely Files Affected | Gate | Verification Required | Status |
|---|---|---|---|---|---|---|---|
| `TTP-SCOPED-ACTIVATION-DESIGN-001` | Scoped activation design | TQ-01, TQ-08, TQ-09, TQ-10, TQ-20 | Design | Governance docs only | None — cleared by P0 approvals | Read-only validation + Paresh review | `DESIGN_APPROVED` |
| `TTP-SCOPED-ACTIVATION-IMPL-001` | Per-org activation middleware | TQ-01 | Implementation | `server/src/middleware/ttpFeatureGate.middleware.ts`; feature-gate unit tests | Design approved by Paresh | (1) global false → all blocked; (2) global true + no override → blocked; (3) global true + org override true → allowed; (4) global true + org override false → blocked; (5) production smoke after deploy | `TRUTH_SYNCED` — impl `b7950b7`, unit-gov `e237405`, final decision `TTP_IMPL_003_TWO_LAYER_MIDDLEWARE_VERIFIED_COMPLETE` |
| `TTP-QA-SENTINEL-FLAG-IMPL-001` | QA sentinel flag on organizations | TQ-08 | Implementation + migration | `server/prisma/schema.prisma`; SQL migration; `scripts/qa-ttp-seed.sql`; Prisma generated types | Design approved + SQL verified (no ERROR / ROLLBACK) | QA orgs: `is_qa_sentinel=true`; real orgs: `is_qa_sentinel=false`; no RLS leaks; `prisma db pull` + `generate` pass; unit test for sentinel query | `TRUTH_SYNCED` — impl `c6e24eaa`, gov `9e5f443a`, final decision `TTP_IMPL_001_QA_SENTINEL_FLAG_VERIFIED_COMPLETE` |
| `TTP-ACTIVATION-MONITORING-IMPL-001` | Structured TTP pino log events | TQ-09 | Implementation | TTP route handlers (13 routes); `ttpFeatureGate.middleware.ts`; pino logger setup | Design approved by Paresh | Log events emitted for gate block, 5xx, VPC generation error, eligibility expiry, enrollment gate failure; server typecheck passes | `TRUTH_SYNCED` — impl `63b660b`, gov `62fb7fe`, final decision `TTP_ACTIVATION_MONITORING_IMPL_001_VERIFIED_COMPLETE` |
| `TTP-ACTIVATION-ROLLBACK-RUNBOOK-001` | Activation / rollback runbook | TQ-10 | Governance / runbook | `governance/` runbook doc only (no code) | Design approved by Paresh | Runbook contains: enable pilot org, disable pilot org, global emergency off, void non-terminal VPCs, post-rollback state audit checklist | `TRUTH_SYNCED` — impl `0c96c7f`, gov `8f6356e`, final decision `TTP_IMPL_006_ACTIVATION_ROLLBACK_RUNBOOK_VERIFIED_COMPLETE` |
| `TTP-LANGUAGE-GOVERNANCE-BASELINE-IMPL-001` | TTP language governance baseline | TQ-20 | Implementation | `server/src/ttp/ttp.constants.ts`; all 13 TTP route handler response types; server typecheck | Design approved by Paresh; interim disclaimer text in place — final text pending `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` | `advisory_disclaimer` field present in all TTP API responses; `TTP_DISCLAIMER_TEXT` constant referenced (not inline string); no forbidden wording introduced; server typecheck + unit test pass | `TRUTH_SYNCED` — impl `42931f7` (constant) + `26c8329` (advisory_disclaimer responses), gov `a922085` + `274a3ad`, final decision `TTP_IMPL_002_DISCLAIMER_CONSTANT_VERIFIED_COMPLETE` + `TTP_IMPL_005_ADVISORY_DISCLAIMER_RESPONSES_VERIFIED_COMPLETE` |

### P0 Middleware verification matrix

The P0 activation middleware (`TTP-SCOPED-ACTIVATION-IMPL-001`) must pass all four gate scenarios
before production verification:

| Scenario | Global flag | Org override | Expected result |
|---|---|---|---|
| 1 | `false` | None | HTTP 503 FEATURE_DISABLED |
| 2 | `false` | `true` | HTTP 503 FEATURE_DISABLED (global off wins) |
| 3 | `true` | None | HTTP 503 FEATURE_DISABLED (per-org activation required) |
| 4 | `true` | `true` for org A | HTTP 200 for org A's requests |
| 5 | `true` | `false` for org A | HTTP 503 for org A (override explicitly disabled) |
| 6 | `true` | `true` for org A, none for org B | Org A: 200; Org B: 503 |

---

## 8. Parallel Legal / Compliance Tracker

| Unit ID | Unit Name | Type | Scope | Status | Gate |
|---|---|---|---|---|---|
| `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` | Legal and compliance copy review | Governance / legal (non-code) | Final disclaimer text for `TTP_DISCLAIMER_TEXT` constant; forbidden-term list (seeds pre-commit lint); VPC certificate wording; score advisory wording; consent wording (TQ-05, TQ-14); dynamic discounting wording; lender data-sharing wording; origination fee disclosure notes | `TRUTH_SYNCED` — gov `1e539da`, final decision `TTP_LEGAL_COMPLIANCE_COPY_REVIEW_001_OPERATOR_REVIEW_READY` | N/A — complete |
| `TTP-LEGAL-COPY-COUNSEL-PACKET-001` | Legal counsel review packet | Governance / legal (non-code) | 9-section legal counsel review packet packaging `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` outputs; structured counsel questions; Paresh decision options; disclaimer text review; VPC/score/consent/partner/fee wording analysis | `TRUTH_SYNCED` — gov `f0ead0f`, final decision `TTP_LEGAL_COUNSEL_REVIEW_PACKET_001_READY_FOR_PARESH` | N/A — complete; `LEGAL_REVIEW_PENDING` for external counsel |

### What `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` must produce

| Output | Used By | Required Before |
|---|---|---|
| Approved `TTP_DISCLAIMER_TEXT` constant value | `TTP-LANGUAGE-GOVERNANCE-BASELINE-IMPL-001` | Baseline disclaimer impl (Wave 0) |
| Forbidden-term list | Pre-commit lint hook (Wave 0, post-review) | Lint hook in Wave 0 |
| VPC certificate wording sign-off | VPC export format (Wave 2+) | Any public VPC representation |
| Score advisory wording sign-off | `TexQticScore v2` design (Wave 2) | Any external score language |
| Consent wording (DPDP-aligned) | `TTP-DATA-CONSENT-DESIGN-001` (Wave 3) | Consent table design |
| Dynamic discounting wording | `TTP-DYNAMIC-DISCOUNTING-DESIGN-001` (Wave 4) | Discounting design |
| Lender data-sharing wording | `TTP-EXTERNAL-SCORE-SHARING-PHASE-3-DESIGN-001` (Wave 3/4) | External score sharing |
| Origination fee disclosure notes | `TTP-FEE-EVENTS-DESIGN-001` (Wave 5) | Fee events design |

**This artifact produces no code, no schema changes, no migrations.** It is a governance and legal review
artifact only.

---

## 9. P1 Score Architecture Tracker

**Current status:** `IMPLEMENTATION_IN_PROGRESS` — Slice 1 (`TTP-SCORE-SNAPSHOT-SQL-RLS-001`) `TRUTH_SYNCED` (`5e8ac44`, `f9a1ecd`); Slice 2 (`TTP-SCORE-SNAPSHOT-SERVICE-001`) `TRUTH_SYNCED` (`371b739`, `86b6373`) — `TtpScoreSnapshotService` + 13 tests; Slice 3 (`TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001`) `TRUTH_SYNCED` (`a2c9d0d`, `33dd382`); Slice 4 (`TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-001`) `IMPLEMENTATION_IN_PROGRESS` — enrollment route `captureEnrollmentApprovedSnapshot` + 12 tests; tsc clean; commits pending

Do not open any P1 implementation unit before the design is reviewed and approved by Paresh.
If Paresh explicitly reprioritizes, a P1 unit may be opened in parallel — but this requires an explicit
new decision, not an assumption.

| Unit ID | Unit Name | TQ | Type | Blocking Gate | Status |
|---|---|---|---|---|---|
| `TTP-SCORE-SNAPSHOT-DESIGN-001` | Score snapshots design | TQ-06, TQ-07 | Design | Wave 0 complete and TRUTH_SYNCED — **CLEARED** | `DESIGN_DECISIONS_RECORDED` |
| `TTP-SCORE-SNAPSHOT-IMPL-001` | `ttp_score_snapshots` table + trigger write logic | TQ-06, TQ-07 | Implementation + migration | `TTP-SCORE-SNAPSHOT-DESIGN-001` approved by Paresh | `IMPLEMENTATION_IN_PROGRESS` — Slice 1 (`TTP-SCORE-SNAPSHOT-SQL-RLS-001`) `TRUTH_SYNCED` (`5e8ac44`, `f9a1ecd`); Slice 2 (`TTP-SCORE-SNAPSHOT-SERVICE-001`) `TRUTH_SYNCED` (`371b739`, `86b6373`); Slice 3 (`TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001`) `TRUTH_SYNCED` (`a2c9d0d`, `33dd382`); Slice 4 (`TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-001`) `IMPLEMENTATION_IN_PROGRESS` |
| `TTP-TEXQTICSCORE-V2-DESIGN-001` | TexQticScore v2 design | TQ-11, TQ-12 | Design | Wave 0 design approved; separate design artifact required before any code | `DESIGN_TARGET_ONLY__WAITING` |
| `TTP-TEXQTICSCORE-V2-IMPL-001` | `computeTexQticScore` function + v2 score contract | TQ-11 | Implementation | `TTP-TEXQTICSCORE-V2-DESIGN-001` approved | `NOT_OPENED` |
| `TTP-SCORE-VERSIONING-IMPL-001` | `score_version` column on `ttp_score_snapshots` | TQ-12 | Implementation | TQ-06 and TQ-11 design approved | `NOT_OPENED` |

### P1 Key constraints

- **`ttp_score_snapshots` table does not exist today.** Creating it requires SQL + `prisma db pull` + `generate` — not `migrate dev` or `db push`.
- **`computeTtpScore` (Phase 1, 7-factor, 100pt) must not be modified.** TexQticScore v2 must be a new separate function.
- **Snapshot write logic must be trigger-based** at VPC issuance, enrollment approval, admin review, partner transmission — not a continuous background process.

---

## 10. P2 Consent / Data-Sharing Tracker

**Current status:** `LEGAL_GATED__WAITING`

No consent table, no DPDP design, no data-sharing API, and no external score-sharing logic may be
designed or implemented until `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` is complete and Paresh approves.

| Unit ID | Unit Name | TQ | Type | Blocking Gate | Status |
|---|---|---|---|---|---|
| `TTP-DATA-CONSENT-DESIGN-001` | Consent architecture design | TQ-05, TQ-14 | Design | Wave 1 (`TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001`) complete; DPDP review complete | `LEGAL_GATED__WAITING` |
| `TTP-DATA-CONSENT-IMPL-001` | `ttp_data_consents` table + per-org consent lifecycle | TQ-05, TQ-14 | Implementation + migration | `TTP-DATA-CONSENT-DESIGN-001` approved by Paresh | `NOT_OPENED` |
| `TTP-INTERNAL-SCORE-ROUTING-DESIGN-001` | Internal-only TexQticScore routing (Phase 2) | TQ-13 | Design | P1 score design + legal review complete | `LEGAL_GATED__WAITING` |
| `TTP-EXTERNAL-SCORE-SHARING-PHASE-3-DESIGN-001` | External lender score sharing (Phase 3) | TQ-13 | Design | All legal gates + partner contracts + explicit Paresh Phase 3 decision | `LEGAL_GATED__WAITING` |

### P2 Key constraints

- **No consent table exists today.** `ttp_data_consents` does not exist in schema.
- **`expires_at` and `revoked_at` are required fields** per TQ-14 Option C (approved). Unlimited per-org consent is not an option.
- **`consent_type` enum** must cover: `GST_PULL`, `CIBIL_PULL`, `LENDER_DATA_SHARE` at minimum.
- **External score sharing is Phase 3.** Internal use of TexQticScore for routing is Phase 2 only.
- **DPDP-compliant consent wording** must come from `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` before consent UI or API is built.

---

## 11. P3 Partner Marketplace Tracker

**Current status:** `PARTNER_GATED__WAITING`

No partner transmission, no outbound HTTP to partners, no finance request table, no partner offer table,
no dynamic discounting, no TReDS, no NBFC, no SCF, no SIDBI design or implementation may begin until:

1. `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` is complete
2. A signed partner contract is in place (per §8 of the Phase 2 scoping artifact)

| Unit ID | Unit Name | TQ | Type | Blocking Gate | Status |
|---|---|---|---|---|---|
| `TTP-PARTNER-WORKFLOW-DESIGN-001` | Partner workflow table + state machine design | TQ-02, TQ-03, TQ-04 | Design | Legal gate + partner contract | `PARTNER_GATED__WAITING` |
| `TTP-PARTNER-WORKFLOW-IMPL-001` | `ttp_partner_workflows` + `ttp_partner_callback_events` tables | TQ-02, TQ-03, TQ-04 | Implementation + migration | `TTP-PARTNER-WORKFLOW-DESIGN-001` approved | `NOT_OPENED` |
| `TTP-FINANCE-REQUEST-DESIGN-001` | Finance request table design | TQ-15 | Design | Legal gate + partner contract; reconcile with TQ-02 design | `PARTNER_GATED__WAITING` |
| `TTP-FINANCE-REQUEST-IMPL-001` | `ttp_finance_requests` table + lifecycle | TQ-15 | Implementation + migration | `TTP-FINANCE-REQUEST-DESIGN-001` approved | `NOT_OPENED` |
| `TTP-PARTNER-OFFER-DESIGN-001` | Partner offer table design | TQ-16 | Design | `TTP-FINANCE-REQUEST-DESIGN-001` approved; partner contract in place | `PARTNER_GATED__WAITING` |
| `TTP-PARTNER-OFFER-IMPL-001` | `ttp_partner_offers` table + offer lifecycle | TQ-16 | Implementation + migration | `TTP-PARTNER-OFFER-DESIGN-001` approved | `NOT_OPENED` |
| `TTP-CALLBACK-DESIGN-001` | Partner callback event handling design | TQ-04 | Design | Partner webhook schema agreed; partner contract | `PARTNER_GATED__WAITING` |
| `TTP-DYNAMIC-DISCOUNTING-DESIGN-001` | Dynamic discounting design | TQ-17 | Design | Legal + product review; TQ-05 consent model approved; buyer agreement model defined | `PARTNER_GATED__WAITING` |

### P3 Key constraints

- **`partner_routing_stubs` must not be repurposed.** Its semantics remain as Phase 1 routing-readiness evidence only. It is not a workflow object.
- **VPC `TRANSMITTED` requires persisted partner ack.** HTTP 200 from outbound call is not sufficient. (`TTP-PARTNER-WORKFLOW-IMPL-001` must enforce this.)
- **Partner callbacks are append-only.** `ttp_partner_callback_events` rows may never be updated or deleted.
- **TexQtic must not hold or move funds** in any dynamic discounting implementation. Buyer-initiated only (TQ-17 Option A).
- **All six P3 tables** (`ttp_partner_workflows`, `ttp_partner_callback_events`, `ttp_finance_requests`, `ttp_partner_offers`) are currently absent from schema.

---

## 12. P4 Future Tracker

**Current status:** `FUTURE_DESIGN_TARGET__WAITING`

Neither P4 unit may be designed or implemented in Phase 2.

| Unit ID | Unit Name | TQ | Type | Blocking Gate | Status |
|---|---|---|---|---|---|
| `TTP-BUYER-TRUST-SCORE-DESIGN-001` | Buyer Trust Score design | TQ-18 | Design | `TTP-TEXQTICSCORE-V2-DESIGN-001` approved; Phase 3 design target; on-platform data only first | `FUTURE_DESIGN_TARGET__WAITING` |
| `TTP-FEE-EVENTS-DESIGN-001` | Fee events table design | TQ-19 | Design | Legal fee/disclosure review complete; fee type enum content from legal review required | `FUTURE_DESIGN_TARGET__WAITING` |

### P4 Key constraints

- **TQ-18 (Buyer Trust Score) must begin with on-platform data only** (buyer invoice acceptance rate, payment history, dispute count, relationship tenure). No CIBIL, GST, or Account Aggregator data for buyers until a separate buyer consent design and legal gate.
- **TQ-19 (`ttp_fee_events`) requires legal fee/disclosure review before schema design.** The `fee_type` enum values and `legal_basis` field content come from legal review output — they cannot be designed before that review.
- **No schema design for either P4 unit** is authorized until the named prerequisite gates are cleared.

---

## 13. No-Go Register

The following items are absolutely forbidden. They may not be designed, stubbed, implemented, or
referenced in any implementation prompt at any priority level without a separate, standalone
authorization artifact signed by Paresh.

| No-Go | Reason | Gate Required Before Any Work |
|---|---|---|
| Enable `ttp_enabled` globally without scoped activation in place | Risk: all tenants activated simultaneously with no rollback granularity | Scoped activation (Wave 0) must be complete; separate Paresh activation decision required |
| Live GST portal / GSTN API integration or calls | Government data source; access agreement, consent, data-usage restrictions | Legal gate (Wave 1) + GSTN/GSP contract + sandbox credentials |
| Live CIBIL / credit bureau API integration or calls | Personal/business credit data; DPDP consent, bureau API agreement | Legal gate (Wave 1) + bureau contract + consent design (Wave 3) + sandbox credentials |
| Any partner routing transmission or outbound partner HTTP | No partner contract exists; no webhook schema agreed | Legal gate (Wave 1) + partner contract signed (Wave 4 gate) |
| Partner API credentials or secrets | No partner contract; no credential governance | Partner contract + secret management design |
| PSP / payment gateway integration | Phase 1 boundary (OD-002); TexQtic is not a payment aggregator | Separate legal opinion + regulatory authorization + standalone artifact |
| Escrow custody / funds holding or disbursement | Doctrine D-020-B; TexQtic does not hold funds | Permanently forbidden without separate regulatory authorization |
| Lending / NBFC / credit-risk taking | OD-003; TexQtic does not lend or underwrite | Permanently forbidden without separate regulatory authorization |
| Payment guarantee or buyer default guarantee | OD-003; TexQtic does not guarantee payment | Permanently forbidden without separate regulatory authorization |
| Managed settlement / disbursement | Doctrine D-020-B | Permanently forbidden without separate regulatory authorization |
| External score sharing with lenders as underwriting input | Phase 3 only; DPDP consent + partner data-sharing contract | Legal gate (Wave 1) + consent design (Wave 3) + partner contract (Wave 4) + Phase 3 decision |
| Live TexQticScore v2 using bureau or GSTN data | Requires legal gate, consent architecture, and bureau API | Legal gate (Wave 1) + consent (Wave 3) + bureau/GSTN contract |
| Finance marketplace implementation (TReDS, NBFC, SCF, factoring) | Bucket D/F; requires partner contract and legal review | Legal gate (Wave 1) + partner contract (Wave 4 gate) |
| Dynamic discounting implementation | Partner + legal gated; TexQtic must not hold or move funds | Legal gate (Wave 1) + product/legal review + buyer agreement model |
| Account Aggregator (AA) framework | Requires AA network registration, FIP/FIU framework agreement, separate consent design | Full AA design + legal gate + separate Paresh decision |
| Fee collection, recording, or disclosure | `ttp_fee_events` requires legal fee/disclosure review first | Legal fee/disclosure review (P4 gate) |
| ICC/Singapore TradeTrust / W3C VC/DID/PKI/eBL | OD-004A; product branding only — not a real eBL | Permanently forbidden without separate standalone authorization |
| Schema changes without an approved implementation prompt | Schema changes cascade: migrations, RLS, types, downstream API | Paresh-approved implementation prompt defining exact SQL + affected Prisma models |
| TexQticScore language implying credit score or regulated decision | Legal governance; advisory-only invariant | Legal review of all TexQticScore wording (Wave 1) required before any public use |

---

## 14. Verification Discipline Matrix

| Unit Type | Required Verification |
|---|---|
| **Governance / design / runbook** | Read-only validation (`git status --short`, `git diff --name-only`). No code. Commit includes governance docs only. |
| **Backend middleware / service** | Unit tests in `server/src/__tests__/`; `pnpm --filter server typecheck`; all existing TTP tests still pass; server health check `GET /health` returns 200 |
| **Schema / migration** | SQL applied manually via `psql` using `DATABASE_URL`; verify no `ERROR` or `ROLLBACK`; `pnpm -C server exec prisma db pull`; `pnpm -C server exec prisma generate`; unit tests pass; `pnpm --filter server typecheck` |
| **Frontend / runtime** | `pnpm --filter web typecheck` or `npm run build` (frontend); production Vercel deployment verification required for any UI path that is tenant-visible or control-plane-visible |
| **Feature gate** | All 6 per-org gate scenarios tested (see §7 gate matrix); authenticated caller tests; unauthenticated caller still returns 401 (not 503) |
| **Shared shell / navigation** | Neighbor-path smoke checks on affected shell routes; no regression in non-TTP tenant UI; no regression in control-plane UI |
| **Production-dependent unit** | Commit → deploy to Vercel → verify on `https://app.texqtic.com` → record evidence → restore `ttp_enabled=false` (unless unit is an explicit activation unit) → truth sync |
| **E2E regression** | After any middleware or route change: re-run subset of Playwright tests covering affected routes; full 38-test suite before final closure of any Wave 0 implementation unit |

---

## 15. Production Verification Rules

The following units **require production verification** before closure. Local proof alone is not sufficient.

| Trigger | Required Action |
|---|---|
| Feature gate middleware change | Deploy → verify gate blocks on `https://app.texqtic.com` → verify 401 for unauthenticated → restore `ttp_enabled=false` → record evidence |
| Route / service change | Deploy → verify affected route behaves correctly → no regression on neighbor routes |
| Tenant UI change | Deploy → verify in tenant shell at `https://app.texqtic.com` → no regression in adjacent tenant paths |
| Control-plane UI change | Deploy → verify in control-plane shell at `https://app.texqtic.com` → no regression in adjacent CP paths |
| Schema / migration | Deploy after `prisma generate` → smoke test affected Prisma query → verify no RLS leak |
| Shared shell / navigation | Deploy → smoke all top-level shell paths → no ghost routes, no broken nav |

**Restore rule:** After any production test that involves enabling TTP (even temporarily for verification),
`ttp_enabled` must be restored to `false` unless the unit is explicitly an activation unit authorized
by a separate Paresh activation decision.

---

## 16. Tracker Status Legend

| Status | Meaning |
|---|---|
| `NOT_OPENED` | Unit exists in plan; no design or implementation work has started |
| `NEXT_RECOMMENDED_UNIT` | The single recommended next unit to open |
| `DESIGN_OPEN` | Design artifact in progress |
| `DESIGN_DECISIONS_RECORDED` | Design artifact complete and open questions resolved; decisions recorded in a decision artifact; awaiting Paresh authorization to open implementation slice |
| `DESIGN_APPROVED` | Paresh has reviewed and approved the design; implementation may begin |
| `IMPLEMENTATION_OPEN` | Implementation prompt is open; work in progress |
| `IMPLEMENTED_PENDING_VERIFICATION` | Code written; verification not yet complete |
| `PRODUCTION_VERIFIED` | Verification complete including production evidence |
| `TRUTH_SYNCED` | Post-unit truth sync complete; adjacent defects recorded |
| `BLOCKED_LEGAL` | Cannot proceed until legal gate (Wave 1) is complete |
| `BLOCKED_PARTNER` | Cannot proceed until legal gate AND partner contract are complete |
| `BLOCKED_DECISION` | Cannot proceed until explicit Paresh decision or prerequisite unit is complete |
| `DEFERRED` | Explicitly deferred to a later wave or phase; do not open |
| `FORBIDDEN` | Unconditionally forbidden under current governance; do not approach |
| `DESIGN_TARGET_ONLY__WAITING` | Architecture direction approved but not cleared for implementation; waiting for prerequisite gates |
| `LEGAL_GATED__WAITING` | Legal/compliance gate must complete before design may begin |
| `PARTNER_GATED__WAITING` | Legal gate AND partner contract required before design may begin |
| `FUTURE_DESIGN_TARGET__WAITING` | Phase 3 or later design target; no near-term action authorized |
| `PARALLEL_RECOMMENDED_NON_CODE` | Non-code governance/legal artifact; may run in parallel with Wave 0 |

---

## 17. Current Tracker Snapshot

This table captures the status of every planned Phase 2 unit as of the date of this document.

| Unit ID | Wave | P-tier | Type | Status |
|---|---|---|---|---|
| `TTP-SCOPED-ACTIVATION-DESIGN-001` | Wave 0 | P0 | Design | `DESIGN_APPROVED` |
| `TTP-SCOPED-ACTIVATION-IMPL-001` | Wave 0 | P0 | Implementation | `TRUTH_SYNCED` |
| `TTP-QA-SENTINEL-FLAG-IMPL-001` | Wave 0 | P0 | Implementation + migration | `TRUTH_SYNCED` |
| `TTP-ACTIVATION-MONITORING-IMPL-001` | Wave 0 | P0 | Implementation | `TRUTH_SYNCED` — impl `63b660b`, gov `62fb7fe`, final decision `TTP_ACTIVATION_MONITORING_IMPL_001_VERIFIED_COMPLETE` |
| `TTP-ACTIVATION-ROLLBACK-RUNBOOK-001` | Wave 0 | P0 | Governance / runbook | `TRUTH_SYNCED` — impl `0c96c7f`, gov `8f6356e`, final decision `TTP_IMPL_006_ACTIVATION_ROLLBACK_RUNBOOK_VERIFIED_COMPLETE` |
| `TTP-LANGUAGE-GOVERNANCE-BASELINE-IMPL-001` | Wave 0 | P0 | Implementation | `TRUTH_SYNCED` |
| `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` | Wave 1 | P0/P2 | Governance / legal | `TRUTH_SYNCED` — gov `1e539da`, final decision `TTP_LEGAL_COMPLIANCE_COPY_REVIEW_001_OPERATOR_REVIEW_READY` |
| `TTP-LEGAL-COPY-COUNSEL-PACKET-001` | Wave 1 | P0/P2 | Governance / legal | `TRUTH_SYNCED` — gov `f0ead0f`, final decision `TTP_LEGAL_COUNSEL_REVIEW_PACKET_001_READY_FOR_PARESH`; `LEGAL_REVIEW_PENDING` |
| `TTP-SCORE-SNAPSHOT-DESIGN-001` | Wave 2 | P1 | Design | `DESIGN_DECISIONS_RECORDED` |
| `TTP-SCORE-SNAPSHOT-IMPL-001` | Wave 2 | P1 | Implementation + migration | `IMPLEMENTATION_IN_PROGRESS` — Slice 1 (`TTP-SCORE-SNAPSHOT-SQL-RLS-001`) `TRUTH_SYNCED` (`5e8ac44`, `f9a1ecd`); Slice 2 (`TTP-SCORE-SNAPSHOT-SERVICE-001`) `TRUTH_SYNCED` (`371b739`, `86b6373`); Slice 3 (`TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001`) `TRUTH_SYNCED` (`a2c9d0d`, `33dd382`); Slice 4 (`TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-001`) `IMPLEMENTATION_IN_PROGRESS` |
| `TTP-TEXQTICSCORE-V2-DESIGN-001` | Wave 2 | P1 | Design | `DESIGN_TARGET_ONLY__WAITING` |
| `TTP-TEXQTICSCORE-V2-IMPL-001` | Wave 2 | P1 | Implementation | `NOT_OPENED` |
| `TTP-SCORE-VERSIONING-IMPL-001` | Wave 2 | P1 | Implementation | `NOT_OPENED` |
| `TTP-DATA-CONSENT-DESIGN-001` | Wave 3 | P2 | Design | `LEGAL_GATED__WAITING` |
| `TTP-DATA-CONSENT-IMPL-001` | Wave 3 | P2 | Implementation + migration | `NOT_OPENED` |
| `TTP-INTERNAL-SCORE-ROUTING-DESIGN-001` | Wave 3 | P2 | Design | `LEGAL_GATED__WAITING` |
| `TTP-EXTERNAL-SCORE-SHARING-PHASE-3-DESIGN-001` | Wave 3/4 | P2 (Phase 3) | Design | `LEGAL_GATED__WAITING` |
| `TTP-PARTNER-WORKFLOW-DESIGN-001` | Wave 4 | P3 | Design | `PARTNER_GATED__WAITING` |
| `TTP-PARTNER-WORKFLOW-IMPL-001` | Wave 4 | P3 | Implementation + migration | `NOT_OPENED` |
| `TTP-FINANCE-REQUEST-DESIGN-001` | Wave 4 | P3 | Design | `PARTNER_GATED__WAITING` |
| `TTP-FINANCE-REQUEST-IMPL-001` | Wave 4 | P3 | Implementation + migration | `NOT_OPENED` |
| `TTP-PARTNER-OFFER-DESIGN-001` | Wave 4 | P3 | Design | `PARTNER_GATED__WAITING` |
| `TTP-PARTNER-OFFER-IMPL-001` | Wave 4 | P3 | Implementation + migration | `NOT_OPENED` |
| `TTP-CALLBACK-DESIGN-001` | Wave 4 | P3 | Design | `PARTNER_GATED__WAITING` |
| `TTP-DYNAMIC-DISCOUNTING-DESIGN-001` | Wave 4 | P3 | Design | `PARTNER_GATED__WAITING` |
| `TTP-BUYER-TRUST-SCORE-DESIGN-001` | Wave 5 | P4 | Design | `FUTURE_DESIGN_TARGET__WAITING` |
| `TTP-FEE-EVENTS-DESIGN-001` | Wave 5 | P4 | Design | `FUTURE_DESIGN_TARGET__WAITING` |

---

## 18. Recommended Immediate Action

### Primary — current implementation unit

**TTP-IMPL-005 is complete** (`TRUTH_SYNCED`): impl `26c8329`, gov `274a3ad`,
final decision `TTP_IMPL_005_ADVISORY_DISCLAIMER_RESPONSES_VERIFIED_COMPLETE`.
Advisory disclaimer (`advisory_disclaimer: TTP_DISCLAIMER_TEXT`) added to `TradeTtpSummary`
and `TtpEnrollmentRecord`. TC-028 + TC-019 added; TC-018 updated. 183 TTP unit tests passing.
tsc clean. Date correction applied to gov record (2026-01-14 → 2026-05-05).

**TTP-IMPL-004 is complete** (`TRUTH_SYNCED`): impl `0cc305d`, gov `16c61fb`,
final decision `TTP_IMPL_004_STRUCTURED_PINO_LOGS_VERIFIED_COMPLETE`.

**TTP-IMPL-003 is complete** (`TRUTH_SYNCED`): impl `b7950b7a`, unit-gov `e237405`,
prod-gov `PRODUCT-DEC-TRADETRUST-PAY-TTP-IMPL-003-PRODUCTION-RUNTIME-VERIFIED-001`,
final decision `TTP_IMPL_003_PRODUCTION_RUNTIME_VERIFIED_COMPLETE`.
Unit: `TTP-SCOPED-ACTIVATION-IMPL-001` — now `TRUTH_SYNCED`.

**TTP-IMPL-002 is complete** (`TRUTH_SYNCED`): impl `42931f7f`, gov `a9220856`,
final decision `TTP_IMPL_002_DISCLAIMER_CONSTANT_VERIFIED_COMPLETE`.
Sub-slice of `TTP-LANGUAGE-GOVERNANCE-BASELINE-IMPL-001` — that unit is now `TRUTH_SYNCED`.

**TTP-IMPL-001 is complete** (`TRUTH_SYNCED`): impl `c6e24eaa`, gov `9e5f443a`,
final decision `TTP_IMPL_001_QA_SENTINEL_FLAG_VERIFIED_COMPLETE`.

**TTP-IMPL-006 is complete** (`TRUTH_SYNCED`): impl `0c96c7f`, gov `8f6356e`,
final decision `TTP_IMPL_006_ACTIVATION_ROLLBACK_RUNBOOK_VERIFIED_COMPLETE`.
Activation / rollback runbook created at `governance/runbooks/TTP-ACTIVATION-ROLLBACK-RUNBOOK-001.md`.
Runbook Section B and D.1 stale entries corrected. `ttp_enabled = false` unchanged throughout.

**TTP-ACTIVATION-MONITORING-IMPL-001 is complete** (`TRUTH_SYNCED`): impl `63b660b`, gov `62fb7fe`,
final decision `TTP_ACTIVATION_MONITORING_IMPL_001_VERIFIED_COMPLETE`.
Structured Pino monitoring events added to all 13 TTP route catch blocks: `ttp.route.error`, `ttp.vpc.generate.error`,
`ttp.eligibility.expired`, `ttp.enrollment.gate_failed`. `invoiceSnap` hoisted for catch-block scope.
`fastify.log` → `request.log` corrected in ttp-eligibility routes. `adminId` excluded (PII boundary).
Bare `throw err` in ttp-routing-stubs replaced with structured log + sendError. 10 new unit tests (TC-001–TC-010). tsc clean.

**All Wave 0 implementation units are now TRUTH_SYNCED.** All P0 units complete.

**TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001 is complete** (`TRUTH_SYNCED`): gov `1e539da`,
final decision `TTP_LEGAL_COMPLIANCE_COPY_REVIEW_001_OPERATOR_REVIEW_READY`. Legal copy inventory,
interim disclaimer analysis, forbidden-language list, safe-language patterns, VPC/score/consent/
partner/fee wording captured. Operator review ready.

### Immediate next — open now (design only)

**TTP-LEGAL-COPY-COUNSEL-PACKET-001 is complete** (`TRUTH_SYNCED`): gov `f0ead0f`,
final decision `TTP_LEGAL_COUNSEL_REVIEW_PACKET_001_READY_FOR_PARESH`. 9-section legal counsel
review packet created at `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-TTP-LEGAL-COUNSEL-REVIEW-PACKET-001.md`.
Packages `TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001` outputs for external legal counsel review.
`LEGAL_REVIEW_PENDING` throughout — awaiting Paresh legal sign-off.

**Design decisions recorded:** `TTP-SCORE-SNAPSHOT-DESIGN-001` design complete. OQ-SS-01 through OQ-SS-07 resolved by Paresh Sharma. Full rationale and implementation consequences in `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001`.

**`TTP-SCORE-SNAPSHOT-SQL-RLS-001` (Slice 1) is `TRUTH_SYNCED`:** `ttp_score_snapshots` table created with 17 columns, 4 CHECK constraints, 5 FK constraints, 1 PK, 4 indexes, immutability trigger (`trg_ttp_score_snapshot_immutable`), 5-policy RLS (guard RESTRICTIVE + select/insert/update/delete PERMISSIVE), and GRANT to `texqtic_app`. Applied to Supabase via psql. `prisma db pull` introspected 65 models. `prisma generate` succeeded. `tsc --noEmit` clean. Commit 1 `5e8ac44` (feat: add ttp score snapshot table). Verification record `f9a1ecd` (docs: verify ttp score snapshot sql rls). FK reconciliation (Outcome B): `enrollment_id` FK target correctly references `ttp_enrollment_logs.id` in DB/migration/Prisma/design docs; verification record corrected (doc normalization only).

**`TTP-SCORE-SNAPSHOT-SERVICE-001` (Slice 2) is `TRUTH_SYNCED`:** `TtpScoreSnapshotService` implemented (`server/src/services/ttpScoreSnapshot.service.ts`) with `assembleTtpScoreInput` (org-scoped + optional trade context) and `captureSnapshot` (best-effort, immutable DB row). `SCORE_DISCLAIMER` exported from `ttpScore.service.ts` for hash computation. 13 unit tests (`server/src/__tests__/ttp-score-snapshot.service.unit.test.ts`) — 13/13 pass. Existing score tests (19) and constants tests (64) unaffected. `tsc --noEmit` clean. Commits `371b739` (feat: add ttp score snapshot service) + `86b6373` (docs: verify ttp score snapshot service). Governance record `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-SERVICE-VERIFIED-001.md`.

**`TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001` (Slice 3) is `TRUTH_SYNCED`:** VPC route (`server/src/routes/control/vpc.ts`) modified — `captureVpcIssuedSnapshot` exported helper added; post-commit best-effort snapshot trigger integrated into `POST /generate/:invoiceId` handler after `writeAuditLog`. `TtpScoreSnapshotService` called within `withVpcAdminWriteContext` (RLS-safe). Snapshot failure caught and logged as `ttp.score_snapshot.capture_failed` structured event; VPC HTTP response unaffected. New 10-test file `server/src/__tests__/ttp-score-snapshot-trigger-vpc.unit.test.ts` — 10/10 pass. `tsc --noEmit` clean. Commits `a2c9d0d` + `33dd382`; verification record `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-TRIGGER-VPC-VERIFIED-001` TRUTH_SYNCED.

**`TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-001` (Slice 4) is `IMPLEMENTATION_IN_PROGRESS`:** Enrollment route (`server/src/routes/control/ttp-enrollments.ts`) modified — `captureEnrollmentApprovedSnapshot` exported helper added; post-commit best-effort snapshot trigger integrated into `PATCH /enrollments/:tradeId` handler after `adminReviewEnrollment` succeeds with `APPROVED` outcome. `TtpScoreSnapshotService` called within second `withAdminWriteContext` (RLS-safe, new transaction). Snapshot failure caught and logged as `ttp.score_snapshot.capture_failed` structured event; enrollment HTTP response unaffected. New 12-test file `server/src/__tests__/ttp-score-snapshot-trigger-enrollment.unit.test.ts` — 12/12 pass. `tsc --noEmit` clean. Commits and verification record pending.

### Do not open yet

All Wave 3, Wave 4, and Wave 5 units remain gated. Slice 5 (admin-review trigger), Slice 6 (read endpoint), and all Wave 3/4/5 units must not be opened without explicit Paresh authorization. `PARTNER_TRANSMITTED` write path has no implementation in Wave 2.

## 19. No-Change Confirmation

> **Scope:** This table confirms no changes made *by this tracker document update*. Wave 0 implementation
> units each had their own code changes (see §18 for commit registry). This table does NOT claim Wave 0
> had no code changes — it did. The rows below apply only to this governance-only tracker update.

| Invariant | Confirmed State |
|---|---|
| `ttp_enabled` | `false` — UNCHANGED |
| Runtime behavior | No change — this tracker update only |
| Code changes | No code changes made by this document. Wave 0 implementation units had code changes; see §18 commit registry. |
| Schema / migration changes | No schema or migration changes — NONE |
| Seed / auth changes | No seed or auth changes — NONE |
| External API calls | No external API calls — NONE |
| Partner transmission | No partner transmission — NONE |
| Implementation authorization | Not authorized by this document |
| Wave 2/3/4/5 units opened | None — all remain gated |

---

## 20. Final Decision

```
PHASE_2_IMPLEMENTATION_PLAN_AND_TRACKER_CREATED
PHASE_2_TRACKER_UPDATED__TTP_SCORE_SNAPSHOT_DESIGN_DECISIONS_RECORDED
PHASE_2_TRACKER_UPDATED__TTP_SCORE_SNAPSHOT_SQL_RLS_001_TRUTH_SYNCED
PHASE_2_TRACKER_UPDATED__TTP_SCORE_SNAPSHOT_SERVICE_001_IMPLEMENTATION_IN_PROGRESS
PHASE_2_TRACKER_UPDATED__TTP_SCORE_SNAPSHOT_SERVICE_001_TRUTH_SYNCED
PHASE_2_TRACKER_UPDATED__TTP_SCORE_SNAPSHOT_TRIGGER_VPC_001_IMPLEMENTATION_IN_PROGRESS
PHASE_2_TRACKER_UPDATED__TTP_SCORE_SNAPSHOT_TRIGGER_VPC_001_TRUTH_SYNCED
PHASE_2_TRACKER_UPDATED__TTP_SCORE_SNAPSHOT_TRIGGER_ENROLLMENT_001_IMPLEMENTATION_IN_PROGRESS
```

**Authority:** Paresh Patel — TexQtic founder / operator  
**`ttp_enabled` state:** `false` — UNCHANGED  
**Files changed by this document:** This document only  
**Implementation authorized:** No  
**Score snapshot design decisions:** Recorded — `PRODUCT-DEC-TRADETRUST-PAY-TTP-SCORE-SNAPSHOT-DESIGN-DECISIONS-001`; OQ-SS-01 through OQ-SS-07 resolved  
**Slice 1 status:** `TTP-SCORE-SNAPSHOT-SQL-RLS-001` `TRUTH_SYNCED` — SQL applied, Prisma synced, tsc clean; commits `5e8ac44` + `f9a1ecd`; FK reconciliation Outcome B (doc normalization complete)  
**Slice 2 status:** `TTP-SCORE-SNAPSHOT-SERVICE-001` `TRUTH_SYNCED` — `TtpScoreSnapshotService` implemented; 13/13 unit tests pass; tsc clean; commits `371b739` + `86b6373`  
**Slice 3 status:** `TTP-SCORE-SNAPSHOT-TRIGGER-VPC-001` `TRUTH_SYNCED` — VPC route trigger; `captureVpcIssuedSnapshot` helper; 10/10 tests pass; tsc clean; commits `a2c9d0d` + `33dd382`; verification record `TRUTH_SYNCED`  
**Slice 4 status:** `TTP-SCORE-SNAPSHOT-TRIGGER-ENROLLMENT-001` `IMPLEMENTATION_IN_PROGRESS` — enrollment route trigger; `captureEnrollmentApprovedSnapshot` helper; 12/12 tests pass; tsc clean; commits pending  
**Wave 2+ status:** `TTP-SCORE-SNAPSHOT-IMPL-001` `IMPLEMENTATION_IN_PROGRESS` (Slices 1+2+3 TRUTH_SYNCED; Slice 4 in progress); all other Wave 2 units, Wave 3, Wave 4, Wave 5 remain gated — do not open without explicit Paresh authorization

---

*Produced under TexQtic governance — Safe-Write Mode always on.*  
*This document does not authorize any implementation. All waves require Paresh approval of the design artifact before any implementation prompt may be opened.*
