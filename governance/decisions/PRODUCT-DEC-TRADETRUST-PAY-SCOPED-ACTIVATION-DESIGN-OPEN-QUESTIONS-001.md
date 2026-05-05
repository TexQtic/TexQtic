# PRODUCT-DEC-TRADETRUST-PAY-SCOPED-ACTIVATION-DESIGN-OPEN-QUESTIONS-001

| Field | Value |
|---|---|
| Document ID | PRODUCT-DEC-TRADETRUST-PAY-SCOPED-ACTIVATION-DESIGN-OPEN-QUESTIONS-001 |
| Status | DESIGN REVIEWED — OPEN QUESTIONS RESOLVED |
| Date | 2026-05-05 |
| Phase | Phase 2, Wave 0 |
| Resolves | Section 15 OQ-1 through OQ-6 of `TTP-SCOPED-ACTIVATION-DESIGN-001` |
| Approved by | Paresh |
| `ttp_enabled` invariant | `ttp_enabled = false` — UNCHANGED |
| Implementation status | NOT AUTHORIZED — each slice still requires a separate Paresh-approved implementation prompt |

---

## 1. Decision Summary

This record resolves all six open questions from Section 15 of
`governance/TTP-SCOPED-ACTIVATION-DESIGN-001`. Paresh has explicitly approved all six decisions
recorded below.

**Effect on design document status:**
`TTP-SCOPED-ACTIVATION-DESIGN-001` advances from:
```
DESIGN — PENDING PARESH REVIEW
```
to:
```
DESIGN REVIEWED — OPEN QUESTIONS RESOLVED
```

**Implementation is not authorized by this record.** Each implementation slice continues to require
a separate, explicit, Paresh-approved implementation prompt before any code, schema, or
infrastructure change may be made.

**`ttp_enabled` invariant:** The global `feature_flags.ttp_enabled` flag remains `false` and must
not be changed by any artifact or action produced in or after this decision record, except through
a separately authorized implementation prompt.

```
SCOPED_ACTIVATION_DESIGN_OPEN_QUESTIONS_RESOLVED
```

---

## 2. Authority Basis

1. `governance/TTP-SCOPED-ACTIVATION-DESIGN-001.md` — scoped activation design document
   (Section 15: Open Questions / Decisions Required Before Implementation)
2. `governance/TEXQTIC-TRADETRUST-PAY-PHASE-2-IMPLEMENTATION-PLAN-AND-TRACKER-001.md` — Phase 2
   tracker; governs slice sequencing and readiness gates
3. `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-001.md` — Phase 2
   architecture decision record; P0 decisions TQ-01, TQ-08, TQ-09, TQ-10, TQ-20
4. `governance/decisions/PRODUCT-DEC-TRADETRUST-PAY-PHASE-2-ARCHITECTURE-QUESTIONS-REPO-TRUTH-AUDIT-001.md` —
   Repo-truth audit confirming schema and middleware state at design time
5. Paresh's explicit approvals for OQ-1 through OQ-6, recorded in this document

---

## 3. OQ-1 — Aggregated Control-Plane List Routes

**Question (from TTP-SCOPED-ACTIVATION-DESIGN-001, Section 15):**
Platform-wide aggregated control-plane list routes (`GET /vpc`, `GET /enrollments`): should
per-org override apply? There is no single feature-gate subject org for these routes.

### Decision

For Wave 0, platform-wide aggregated control-plane list routes use the **global TTP gate only**.
Per-org `TenantFeatureOverride` lookup is not applied to aggregated list views.

### Rationale

There is no single subject org for aggregated views — the response spans all orgs. Applying
per-org override to a list route is architecturally incoherent in Wave 0. The global flag is
sufficient to gate aggregated admin access. Record-level org-scoped routes and actions continue
to require subject-org override (see OQ-2).

### Implementation Implication

The following two routes use the **global gate only** in Wave 0:

| Route | Method | Gate applied |
|---|---|---|
| `/api/control/vpc` | GET | Global `feature_flags.ttp_enabled` only |
| `/api/control/ttp/enrollments` | GET | Global `feature_flags.ttp_enabled` only |

All other record-scoped control-plane routes (eligibility, VPC generate, VPC transition,
routing stubs, individual enrollment) continue to require subject-org override resolution
per Section 7.2 of `TTP-SCOPED-ACTIVATION-DESIGN-001`.

### Verification Implication

- Global `false` blocks both aggregated list routes with 503 FEATURE_DISABLED
- Global `true` allows SUPER_ADMIN to access aggregated list views subject to admin auth
- No per-org row is required in `tenant_feature_overrides` for an admin to access these list routes

---

## 4. OQ-2 — Subject-Org Resolution / N+1 Lookup Pattern

**Question (from TTP-SCOPED-ACTIVATION-DESIGN-001, Section 15):**
`POST /vpc/generate/:invoiceId` requires resolving the subject org from the invoice record before
the per-org feature gate can execute — is the N+1 lookup pattern acceptable? Should an
activation-cache layer be introduced?

### Decision

**The N+1 subject-resolution lookup pattern is approved for Wave 0. No activation-cache layer is
approved in Wave 0.**

For record-scoped control routes where the subject org is not in the path (e.g., `invoiceId`,
`vpcId`), the middleware or route wrapper may first resolve the subject org from the
invoice/VPC/trade record, then check `TenantFeatureOverride`.

### Rationale

Wave 0 is a constrained per-org pilot. Volume is low. A caching layer introduces coordination
complexity (invalidation, TTL, cross-restart consistency) that is not warranted at this scale.
The N+1 pattern is operationally simple, fail-closed, and auditable. It may be revisited in
a later wave if per-org activation volume warrants it.

### Implementation Implication

Subject-resolution sequence for record-scoped routes:

```
1. Verify global flag = true  (current pattern, preserved)
2. Resolve subject orgId from record (invoice / VPC / trade)
3. Check TenantFeatureOverride WHERE tenantId = [resolved orgId] AND key = 'ttp_enabled'
4. If override.enabled !== true → 503 FEATURE_DISABLED
```

No in-memory cache, no Redis cache, no TTL-based flag caching in Wave 0.

### Verification Implication

- Tests must confirm the correct subject org is resolved before the override is checked
- Tests must confirm that a missing or `enabled = false` override blocks the request,
  using the subject org's ID (not the admin's org)
- Tests must confirm that a DB error during subject-org resolution fails closed (503)

---

## 5. OQ-3 — Pino Log Level Policy

**Question (from TTP-SCOPED-ACTIVATION-DESIGN-001, Section 15):**
Will logging `ttp.feature_gate.allowed` at `info` level on every allowed TTP request create
unacceptable log volume in production?

### Decision

**Do not log every allowed tenant-read request at `info` level.**

Approved log level matrix for TTP gate and domain events:

| Event category | Pino level | Rationale |
|---|---|---|
| Gate allowed — tenant read paths | `debug` | High-frequency; info would pollute production logs |
| Gate allowed — control-plane paths | `info` | Admin actions are operationally significant |
| Gate blocked — any reason | `info` | Blocked decisions are operationally significant |
| Activation override changed | `warn` | Org activation is a significant administrative action |
| DB / fail-closed errors | `error` | Requires operator attention |
| Domain lifecycle events (enrollment, VPC, eligibility) | `info` | Standard operational audit trail |

**Revised event key naming accordingly:**

| Event key | Level |
|---|---|
| `ttp.feature_gate.global_blocked` | `info` |
| `ttp.feature_gate.org_blocked` | `info` |
| `ttp.feature_gate.allowed` (tenant read) | `debug` |
| `ttp.feature_gate.allowed` (control-plane) | `info` |
| `ttp.feature_gate.db_error` | `error` |
| `ttp.override.activated` | `warn` |
| `ttp.enrollment.state_transition` | `info` |
| `ttp.eligibility.assessed` | `info` |
| `ttp.vpc.generated` | `info` |
| `ttp.vpc.state_transition` | `info` |
| `ttp.routing.stub_generated` | `info` |

### Implementation Implication

The Pino log-level matrix from Section 9.2 of `TTP-SCOPED-ACTIVATION-DESIGN-001` should be
updated to reflect this policy during Slice 4 (TTP-IMPL-004). The `ttp.feature_gate.allowed`
event should be emitted at `debug` for tenant-read routes and `info` for control-plane routes.

### Verification Implication

- Test/log smoke checks should confirm `ttp.feature_gate.allowed` is emitted at `debug` for
  tenant-plane routes (not `info`)
- Test/log smoke checks should confirm blocked and lifecycle events emit at the correct levels
  per the matrix above

---

## 6. OQ-4 — Interim Disclaimer Text

**Question (from TTP-SCOPED-ACTIVATION-DESIGN-001, Section 15):**
Is the proposed `TTP_DISCLAIMER_TEXT` from Section 11.2 approved for all 13 route responses?

### Decision

**Approved. The interim `TTP_DISCLAIMER_TEXT` is:**

```
"TradeTrust Pay readiness signals are informational and advisory only. They are not a credit score, financing approval, payment guarantee, lending decision, or partner commitment."
```

### Legal Review Dependency

This is an **interim baseline text**. It must be replaced by the final approved wording once:

```
TTP-LEGAL-COMPLIANCE-COPY-REVIEW-001
```

has been completed. The implementation constant (`TTP_DISCLAIMER_TEXT` in `ttp.constants.ts`)
must reference the approved interim text above verbatim until that review unit is completed and
produces a replacement.

### Implementation Implication

`TTP_DISCLAIMER_TEXT` in `server/src/ttp/ttp.constants.ts` should be set to the approved interim
text exactly as written above. No other inline disclaimer strings are permitted in TTP route
handler files.

### Verification Implication

- All 13 TTP route responses must include an `advisory_disclaimer` field once Slice 5
  (TTP-IMPL-005) is implemented
- The field value must equal `TTP_DISCLAIMER_TEXT` exactly — verified by unit test comparison
- No forbidden financial language terms (Section 11.4 of `TTP-SCOPED-ACTIVATION-DESIGN-001`)
  may appear in any TTP API response payload or UI string

---

## 7. OQ-5 — Slice Ordering: Sequential vs Parallel

**Question (from TTP-SCOPED-ACTIVATION-DESIGN-001, Section 15):**
Slices 1 and 2 have no interdependency. Can they proceed in parallel in a single implementation
prompt?

### Decision

**Strict sequential atomic implementation prompts. Slice 1 and Slice 2 must not be combined.**

### Rationale

- Slice 1 (schema/seed/Prisma) carries schema-risk: it requires `psql` execution, `prisma db pull`,
  `prisma generate`, server restart, and SQL verification. A failure at any step requires clean
  rollback scope.
- Slice 2 (constants-only) has no DB dependency and is lower risk. Keeping it separate preserves
  clean rollback, discrete verification evidence, and a clear atomic commit per slice.
- Combining them in a single prompt would entangle high-risk schema operations with low-risk
  constant additions, making partial-failure recovery harder and commit history less auditable.

### Implementation Implication

The binding implementation prompt sequence is:

| Order | Slice ID | Description |
|---|---|---|
| 1st | TTP-IMPL-001 | QA Sentinel Flag — `is_qa_sentinel` column via SQL + `prisma db pull` + `prisma generate`; update `qa-ttp-seed.sql` |
| 2nd | TTP-IMPL-002 | TTP Disclaimer Constant — add `TTP_DISCLAIMER_TEXT` to `ttp.constants.ts` |
| 3rd | TTP-IMPL-003 | Two-layer middleware update — per-org `TenantFeatureOverride` lookup in `ttpFeatureGate.middleware.ts` |
| 4th | TTP-IMPL-004 | Structured Pino log events — 10 minimum events in middleware and domain services |
| 5th | TTP-IMPL-005 | Advisory disclaimer field — `advisory_disclaimer` on all 13 TTP route responses |
| 6th | TTP-IMPL-006 | Per-org activation runbook SQL script and rollback SQL script |

Each slice requires a **separate, explicit, Paresh-approved implementation prompt**. No slice may
be combined with another or begun without that approval.

---

## 8. OQ-6 — `is_qa_sentinel` RLS Effect

**Question (from TTP-SCOPED-ACTIVATION-DESIGN-001, Section 15):**
Should `is_qa_sentinel` exclude QA sentinel orgs from production RLS tenant scope clauses?

### Decision

**In Wave 0, `is_qa_sentinel` is metadata-only and has no RLS effect.**

### Rationale

`is_qa_sentinel` is a QA classification marker. In Wave 0 it serves one purpose: enabling test
harnesses and seed guards to identify QA pilot orgs explicitly and queryably without relying on
implicit UUID-range assumptions. It must not alter the access control model.

Introducing RLS policy effects for `is_qa_sentinel` would:
- Require a separate RLS design and verification unit
- Risk weakening tenant isolation if the policy clause is mis-scoped
- Add production RLS complexity not warranted at Wave 0 pilot scale

### Implementation Implication

Slice 1 (TTP-IMPL-001) must not touch any RLS policy file. The `ALTER TABLE` and `prisma db pull`
sequence adds the column only. No `CREATE POLICY`, `ALTER POLICY`, or `DROP POLICY` commands
are permitted in TTP-IMPL-001.

### Verification Implication

Verification for TTP-IMPL-001 confirms:
1. `is_qa_sentinel` column exists on `organizations` with `NOT NULL DEFAULT FALSE`
2. QA org rows (`ee000000-*`) return `is_qa_sentinel = true`
3. No non-QA org rows have `is_qa_sentinel = true`
4. **No RLS policy file has been modified** — confirmed by `git diff --name-only` showing
   zero changes to `server/prisma/*.sql` or `shared/contracts/rls-policy.md`

Any future RLS use of `is_qa_sentinel` requires a separate, explicitly scoped RLS design and
verification unit before any implementation.

---

## 9. Updated Implementation Readiness

**Section 15 of `TTP-SCOPED-ACTIVATION-DESIGN-001` is fully resolved.**

`TTP-SCOPED-ACTIVATION-DESIGN-001` is now ready for implementation prompt sequencing.

**First implementation unit:**

```
TTP-IMPL-001 — QA Sentinel Flag
```

Add `is_qa_sentinel BOOLEAN NOT NULL DEFAULT FALSE` to `organizations` via:
1. Manual `psql` SQL execution using `DATABASE_URL`
2. Verify SQL success (no ERROR/ROLLBACK)
3. `pnpm -C server exec prisma db pull`
4. `pnpm -C server exec prisma generate`
5. Restart server
6. Update `scripts/qa-ttp-seed.sql` to set `is_qa_sentinel = true` for QA org inserts

**Implementation is still not authorized by this record.** A separate Paresh-approved
implementation prompt for TTP-IMPL-001 is required before any change is made.

```
SCOPED_ACTIVATION_DESIGN_READY_FOR_IMPLEMENTATION_PROMPT_SEQUENCE
```

---

## 10. No-Go Boundaries Preserved

All boundaries from `TTP-SCOPED-ACTIVATION-DESIGN-001` Section 14 remain in force. This record
does not authorize any of the following:

| Boundary | Status |
|---|---|
| Code changes | NOT authorized |
| Schema changes | NOT authorized |
| Prisma migration commands | NOT authorized |
| SQL writes or DDL execution | NOT authorized |
| Feature flag changes | NOT authorized |
| `ttp_enabled` activation | NOT authorized — remains `false` |
| `TenantFeatureOverride` row insertion | NOT authorized |
| Route / service / UI changes | NOT authorized |
| RLS policy changes | NOT authorized |
| External API calls | NOT authorized |
| Partner routing / transmission | NOT authorized |
| `npx prisma` usage | FORBIDDEN |
| `prisma migrate dev` or `prisma db push` | FORBIDDEN |
| Printing `.env`, DB URLs, or secrets | FORBIDDEN |

---

## 11. Final Decision

```
SCOPED_ACTIVATION_DESIGN_OPEN_QUESTIONS_RESOLVED
```

| Field | Value |
|---|---|
| OQ-1 resolved | ✅ Global gate only for aggregated list routes |
| OQ-2 resolved | ✅ N+1 subject-resolution pattern approved; no activation cache |
| OQ-3 resolved | ✅ debug for allowed tenant reads; level matrix approved |
| OQ-4 resolved | ✅ Interim disclaimer text approved; legal review dependency noted |
| OQ-5 resolved | ✅ Strict sequential slices; no combined prompts |
| OQ-6 resolved | ✅ `is_qa_sentinel` metadata-only; no RLS effect in Wave 0 |
| `ttp_enabled` | `false` — UNCHANGED |
| Design document status | DESIGN REVIEWED — OPEN QUESTIONS RESOLVED |
| Implementation status | NOT STARTED — NOT AUTHORIZED |
| Next action | Issue TTP-IMPL-001 implementation prompt (separate Paresh approval required) |

---

*Document: PRODUCT-DEC-TRADETRUST-PAY-SCOPED-ACTIVATION-DESIGN-OPEN-QUESTIONS-001*
*Governance sprint: TTP Phase 2 Wave 0*
*Authority: TTP-SCOPED-ACTIVATION-DESIGN-001 + Paresh explicit approvals*
