# DOCTRINE.md — TexQtic Active Governance Doctrine

**Layer:** 0 — Control Plane  
**Authority:** governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md  
**Doctrine Version:** v1.12  
**Last Updated:** 2026-04-10 (governance-family reconciliation execution)  
**Reset Ratification:** `governance/decisions/GOV-DEC-GOVERNANCE-OS-RESET-WRITEBACK-001.md`  
**Max Size:** 150 lines (structural gate)

> This file is the canonical summary of active doctrine invariants.  
> Enforcement-grade sources: `AGENTS.md` (repo root) and `.github/copilot-instructions.md`.  
> If any conflict exists between this file and those sources, AGENTS.md and copilot-instructions.md govern.

---

## CONTROL-PLANE GOVERNANCE READING RULE

**MANDATORY for ALL prompts — governance, implementation, verification, and design alike.**

Before taking a governance action or checking governed-unit state, read these files first:

1. `governance/control/OPEN-SET.md` — exact current governed open set
2. `governance/control/NEXT-ACTION.md` — exact currently authorized next move or explicit no-open posture
3. `governance/control/BLOCKED.md` — blocked, deferred, and design-gated posture

Read `governance/control/SNAPSHOT.md` only for session restore, dormant context, or strict-path / historical ambiguity.

For live opening-layer routing after Layer 0:

- live opening-layer taxonomy truth: `governance/control/TEXQTIC-OPENING-LAYER-TAXONOMY-TRUTH-BASELINE-2026-04-09.md`
- live opening-layer authority map: `governance/control/TEXQTIC-OPENING-LAYER-GOVERNANCE-AUTHORITY-AND-POINTER-LAYER-2026-04-10.md`
- live opening-layer sequencing authority: `governance/control/TEXQTIC-OPENING-LAYER-SEQUENCING-AND-NEXT-CYCLE-ENTRY-2026-04-10.md`
- historical `-v2` chain: reconciliation input only

**Rule:** ordinary next-opening selection must not require multi-document sequencing triangulation.

**Rule:** Layer 0 owns current governed posture. Historical opening or closure truth lives in Layer 1 and Layer 3 and must not compete with Layer 0 as live authority.

---

## Active Doctrine Invariants

### D-001 — DB-Level RLS Is Mandatory
Database-level Row-Level Security is mandatory on all tenant-scoped tables.  
Application code must never trust client-supplied tenant or org identifiers.  
All RLS policies are source-controlled and repo-governed.

### D-002 — Admin Bypass Is Explicit And Audited
Super-admin operations that bypass RLS or tenant scope must be explicit, documented, and audited.  
Service-role queries that bypass RLS require authorised justification.

### D-003 — Repo-Governed DB Changes Only
All schema changes: apply SQL manually via `psql` -> `prisma db pull` -> `prisma generate` -> restart.  
Prisma must be run via `pnpm -C server exec prisma`.  
`prisma migrate dev` and `prisma db push` are unconditionally forbidden.

### D-004 — One Logical Unit At A Time
One governed unit is active at a time. No unit may mix implementation, verification, and governance.  
If a unit discovers it needs another unit's work, STOP and record the dependency.

### D-005 — One Atomic Commit Per Unit
Each governed unit closes with exactly one atomic commit touching only allowlisted files.  
No squashing of multiple units. No mixed-type commits.

### D-006 — No Governance In Implementation Units
Implementation units must not touch governance control-plane files during main work.  
Governance update is the bounded close step only.

### D-007 — No Implementation In Governance Units
Governance units must not touch application code, schema, tests, or CI scripts.

### D-008 — Closed Units Stay Closed
A unit with terminal status (`VERIFIED_COMPLETE` or `CLOSED`) must not be reopened.  
If reopening is needed, a new governance unit must explicitly authorize it.

### D-009 — Design-Gated Items Must Not Be Forced Into Implementation
Units with status `DESIGN_GATE` must not be promoted into implementation without an explicit decision recorded in `governance/decisions/`.

### D-010 — Product-Deferred Items Are Not Bugs
Units with status `DEFERRED` reflect product decisions, not defects.  
They must not be treated as bugs, reopened, or implemented without explicit product authorization.

### D-011 — org_id Is The Canonical Tenancy Boundary
Every DB query, API route, and service call accessing tenant-scoped data must scope by `org_id`.  
This boundary cannot be weakened, removed, or deferred under any circumstance.  
Cross-tenant queries are forbidden outside the control-plane super-admin context.

### D-012 — Secrets Are Never Printed
DB URLs, `.env` contents, passwords, JWTs, and API keys must never be logged or echoed.

### D-013 — Closure Requires Explicit Closure Basis
A governance close is incomplete unless the close writeback records the closure basis, evidence class, resulting Layer 0 posture, exact next authorized class or explicit no-successor posture, and exactly one carry-forward result: `SUCCESSOR_CHAIN_PRESERVED` with a valid `D-020` artifact created or refreshed in the same close path, or `EXPLICIT_NO_SUCCESSOR`.

### D-014 — Implementation Openings Require Root-Cause Dependency Readiness
No implementation opening is lawful on target-family maturity alone. A proposed opening is lawful only if the target unit is sufficiently mature for the intended opening and every material dependency or support family passes the readiness threshold required for that opening.
Before approving any future implementation opening, Governance OS must require a bounded dependency-readiness investigation covering the target opening, its material dependency/support-family map, the required readiness threshold for each family, the current readiness state for each family, and a pass/fail result for each family. This applies to family implementation openings, cross-family openings, supporting-family openings, control-plane openings, and any other opening where dependency or support-family maturity materially affects lawful execution.
If any family fails, Governance OS must return the failing family, the missing chain element(s), the deepest root blocker reached by recursive trace, and the minimum bounded next move required to make the opening lawful. Dependencies do not all need full implementation first, but each must be ready at the threshold appropriate to the opening.

### D-015 — Post-Close Authority Reconciliation Is Mandatory
After any product-facing close that changes active-delivery or next-candidate posture, Governance OS must reconcile Layer 0 posture with the live opening-layer sequencing authority and the live opening-layer authority map before any new opening decision. Historical `-v2` product-truth artifacts may be consulted only as reconciliation input.

### D-016 — Zero-Open Product-Delivery Re-Entry Returns To Decision Control
If a close leaves zero active product-delivery units, Governance OS returns to explicit next-opening decision control and no successor may be inferred from the closed unit, family proximity, or stale carry-forward wording. When a valid `D-020` artifact remains compatible and no `D-023` invalidation trigger has fired, decision control may begin from `D-021` narrow revalidation only, never implied opening.

### D-017 — Closed Units Preserve Lineage Only
Closed units preserve lineage and evidence only. Any `D-020` successor-chain artifact is separate non-opening carry-forward authority and does not convert a closed unit into current-next authority.

### D-018 — Structural-Breadth Family Remainders Require Same-Family Bounded Reduction
After one preserved family remainder has already been chosen for reduction, if current repo truth is coherent but that family still contains multiple unreduced subareas and therefore does not yield one exact bounded child unit, Governance OS must treat the condition as structural breadth rather than a repo-conflict blocker.
The required next move is one further bounded child-reduction decision or one narrowly scoped design-clarification step inside that same family only, for the sole purpose of exact-child emergence. This condition must not be routed into whole-family design completion, cross-family documentation completion, roadmap expansion, lawful opening, or implementation start.

### D-019 — Residual-Lane Same-Family Decomposition Requires Same-Remainder Lane Separation
After one preserved family remainder has already been chosen and narrowed at least once, if the remaining same-family remainder is coherent in repo truth but still contains a small number of explicit residual lanes and therefore does not yet yield one exact bounded child unit, Governance OS must treat the condition as residual-lane decomposition rather than repo conflict or renewed family-level expansion.
The required next move is one bounded lane-separation design-clarification step inside that same narrowed remainder only, for the sole purpose of separating the residual lanes, testing whether one lane qualifies as an exact bounded child, and determining whether one lane can be elevated into candidate form. This condition must not be routed into whole-family design completion, cross-family documentation completion, roadmap expansion, lawful opening, implementation start, or treating conditional lineage notes as current live authority.

### D-020 — Successor-Chain Preservation Is Non-Opening Carry-Forward Authority Only
Governance OS may preserve one bounded successor-chain artifact after a lawful next-unit determination, same-family bounded reduction, residual-lane decomposition, or product-facing close that preserves one coherent same-family follow-on path. The artifact is non-opening carry-forward authority only and must retain preservation basis, exact authority set, current remainder, next likely `1` to `3` exact slices, stable/transitional/volatile truths, dependency assumptions, excluded adjacencies, invalidation triggers, and `NO_OPENING_AUTHORITY`; otherwise it is incomplete and cannot support `D-021`.

### D-021 — Revalidate-Not-Rediscover Is Conditional
Governance OS may begin from narrow successor revalidation instead of broad rediscovery only when a complete `D-020` artifact exists, Layer 0 remains compatible, no `D-023` invalidation trigger has fired, no material contradiction exists, and the proposed slice stays inside the preserved family or narrowed remainder. The minimum revalidation read set is Layer 0, the artifact, the live opening-layer sequencing authority, the live opening-layer authority map, the relevant preserved downstream family/design authorities, named volatile truths, and named dependency or support-family readiness surfaces; failure returns to the smallest lawful broader rediscovery level.

### D-022 — Truth Volatility Tiers
Governance OS must distinguish stable truth, transitional truth, and volatile truth. Stable truth covers normalized family/design anchors and preserved repo-truth evidence; transitional truth covers remainder outputs, successor-chain artifacts, and bounded visibility artifacts; volatile truth covers Layer 0 posture, blockers, runtime proof, adjacency, readiness, and current gates. Only stable truth may be reused without revalidation, transitional truth requires `D-021`, and volatile truth must always be freshly checked.

### D-023 — Invalidation Triggers Force Rediscovery
A `D-020` artifact is invalid for `D-021` if planning or family authority changed materially, readiness or runtime proof breaks an assumption, adjacency now intersects the slice, the remainder changed materially, the artifact is stale or incomplete, Layer 0 contradicts it, the live opening-layer sequencing authority or the relevant preserved downstream family/design authority supersedes it, or blocker/design-gate change materially resizes the slice. Any trigger forces rediscovery at the smallest lawful broader level.

---

## Operating Paths

### Normal Bounded Path

- Read `OPEN-SET.md`, `NEXT-ACTION.md`, and `BLOCKED.md`; read the live opening-layer sequencing authority and live opening-layer authority map when product-facing.
- Before approving any implementation opening, run the D-014 dependency-readiness investigation and either record a lawful opening basis or return the minimum bounded prerequisite move.
- Open with one unit record plus the required Layer 0 update.
- During work, update the unit record only when scope, blockers, or verification posture materially change.
- Close with one compact governance writeback plus verification evidence.
- For product-facing closes that change active-delivery or next-candidate posture, run the D-015 reconciliation before any new opening decision.
- For every product-facing close, emit the D-013 carry-forward result; if no active product-delivery unit remains, return to D-016 decision control and use D-021 narrow revalidation only when a valid D-020 artifact survives D-023.
- If a chosen family remainder remains coherent but structurally broad, apply D-018 and route to one further same-family bounded child-reduction or narrow design-clarification step only.
- If a chosen same-family remainder has already been narrowed but still contains explicit residual lanes, apply D-019 and run one same-remainder lane-separation design-clarification step only.
- Normal bounded units do not automatically require candidate normalization, strict Sentinel gating, separate post-close audit artifacts, or multi-surface sequencing overlays.

### Strict High-Risk Path

The strict path remains mandatory for:

- DB / SQL / Prisma / migration-affecting work
- RLS or tenancy-boundary changes
- auth / session / identity / workspace-entry changes
- sequencing-authority or Governance OS authority changes
- control-plane authority rebases
- cross-family authority shifts
- production-critical runtime changes where failure alters entry, activation, or control truth

Strict-path units must:

- read `SNAPSHOT.md` and relevant Layer 1, Layer 2, or Layer 3 context in addition to the minimum Layer 0 set
- keep full allowlist discipline and explicit verification evidence
- use control-critical Sentinel gating where doctrine requires it
- emit a separate post-close audit artifact when D-013 requires it

### Exception-Only Mechanisms

- Candidate normalization is required only for broad-label retirement, candidate splitting, negative-evidence disproof, or bounded ambiguity between multiple candidates.
- Sentinel binary gating is required only for openings that change live delivery authorization, closes of strict-path units, sequencing-authority changes, design-gate promotions, and retries after failed mandatory gates.
- Routine Layer 0 consistency cleanup and narrow record-only governance corrections use record-only governance hygiene instead of standalone remediation chains by default.

---

## Allowed Status Vocabulary (complete — no others permitted)

| Status | Terminal? |
|---|---|
| `OPEN` | No |
| `IN_PROGRESS` | No |
| `BLOCKED` | No |
| `DEFERRED` | No |
| `DESIGN_GATE` | No |
| `VERIFICATION_REQUIRED` | No |
| `VERIFIED_COMPLETE` | Yes |
| `CLOSED` | Yes |

---

## Governance OS Layer Model

| Layer | Location | Owns |
|---|---|---|
| 0 — Control Plane | `governance/control/` | current open set, current next action, blockers, restore-grade snapshot |
| 1 — Unit Records | `governance/units/` | per-unit canonical status, scope, and evidence |
| 2 — Decision Ledger | `governance/decisions/` | product, design, security, and governance reset decisions |
| 3 — Execution Log | `governance/log/` | append-only history (not operational truth) |
| 4 — Archive | `governance/archive/` | legacy frozen documents (read-only) |

Design documents live in `docs/governance/control/`. Operational files live here.

---

*Preserved downstream design lineage: `docs/governance/control/GOV-OS-001-DESIGN.md` (historical design input only; live routing is governed by the opening-layer authority map above).*
