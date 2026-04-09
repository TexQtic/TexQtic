# TEXQTIC-ARCHITECTURE-EVOLUTION-AND-TRANSITION-PLAN-2026-04-09

Status: planning only
Date: 2026-04-09
Scope: staged architecture evolution and transition safety
Primary authority: TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md

## 1. Purpose

This document evaluates TexQtic's current architecture, defines the recommended long-term
direction, and sets the transition-safety rules that must govern any later structural change.

The objective is to strengthen the current modular monolith into a cleaner, extraction-ready
system without triggering a premature platform rewrite.

## 2. Current architecture assessment

Current confirmed architecture:

- one root SPA plus one nested Fastify server package
- one shared Postgres authority model
- one Prisma schema
- one modular backend with route families and service modules
- one runtime-family authority centered on the session runtime descriptor and aligned family docs

Assessment:

- Confirmed: the current architecture is not wrong for TexQtic's current stage.
- Confirmed: the backend is a modular monolith.
- Confirmed: the primary architectural problem is not service count; it is authority and boundary
  ambiguity in a few cross-cutting seams.
- High-confidence: current scale and team structure do not justify immediate microservice
  decomposition.

## 3. Cross-track interpretations preserved

The following interpretations are controlling for this plan and must remain visible in later
execution:

1. TexQtic's biggest near-term risk is authority sprawl more than raw code sprawl.
2. The strongest immediate win is restoring a clean authority hierarchy: repo/runtime truth,
   aligned technical contracts, aligned family design anchors, reconciled downstream governance,
   and only then delivery planning.
3. The modular monolith remains an asset and must not be destabilized through premature extraction.
4. The medium-term technical debt center of gravity is legacy-to-`org_id` tenancy convergence.
5. White-label must be treated as capability architecture and overlay truth, not as a separate
   runtime family or a naming-only cleanup item.

## 4. Why microservices now would be premature

Immediate microservices migration would be premature because:

- Confirmed: the backend is still one codebase, one schema, and one shared operational model.
- Confirmed: the first-order problems are bootstrap divergence, boundary clarity, tenancy
  convergence, and contract discipline.
- High-confidence: splitting services before those seams are hardened would export the current
  ambiguity across network boundaries.
- Recommended: structural extraction should follow stable seams, not create them.

Conclusion:

- TexQtic should strengthen the modular monolith first
- extraction-readiness is the goal, not immediate extraction

## 5. Target architecture direction

The recommended target direction is:

- a hardened modular monolith with explicit domain boundaries
- one clear tenancy and identity authority model
- one contract-first API posture
- explicit bootstrap/runtime contracts
- internal seams that can later support selective extraction if scale, team, or operational pressure
  justifies it

Desired end state characteristics:

1. shared platform contracts remain authoritative
2. domain modules expose stable internal interfaces
3. route-to-service-to-data layering is disciplined and reviewable
4. async or event boundaries are introduced only where they reduce coupling materially
5. future extraction is selective and justified, not ideological

## 6. Modular-hardening strategy

The modular-hardening program should focus on five priorities already visible in repo truth:

1. bootstrap unification
2. tenancy model convergence
3. contract-first discipline
4. control-plane domain hardening
5. naming and mode-model hardening

Interpretation of those priorities:

- bootstrap unification removes runtime ambiguity
- tenancy convergence hardens the constitutional boundary
- contract-first discipline prevents drift between routes, docs, and consumers
- control-plane hardening clarifies platform-owned supervision versus tenant-owned continuity
- naming and mode-model hardening keeps architecture from inheriting taxonomy drift

## 7. Bounded service seam strategy

The modular monolith should introduce clearer bounded seams before any extraction decision. The
candidate seam families are:

### 7.1 Control plane

Purpose:

- isolate platform-owned supervision, tenant lifecycle oversight, admin authority, and governance
  operations from tenant-owned behavior

Current reason to harden:

- control-plane maturity is uneven and bootstrap divergence already affects route topology

### 7.2 Onboarding and lifecycle

Purpose:

- separate onboarding submission, review outcome, lifecycle transitions, and activation state from
  generic auth/session assumptions

Current reason to harden:

- onboarding truth is partially drifted and lifecycle logic is a likely bridge seam for future
  convergence work

### 7.3 Marketplace, RFQ, and trades

Purpose:

- group the authenticated business-exchange transaction flow into a clearer internal boundary

Current reason to harden:

- this is the primary governed commercial flow and should not stay diffuse across mixed naming or
  legacy interpretations

### 7.4 Trust and compliance cluster

Purpose:

- group certifications, traceability, sanctions, audit-linked casework, and related oversight into
  an explicit cluster

Current reason to harden:

- these surfaces are structurally adjacent and benefit from clearer contract and ownership
  boundaries before any extraction thought

### 7.5 AI and vector services

Purpose:

- isolate advisory AI behavior, vector ingestion, queueing, and governance-sensitive usage into a
  bounded internal seam

Current reason to harden:

- current AI capabilities are real, but future governance pressure will rise faster than pure
  throughput pressure

### 7.6 White-label capability, branding, and domain routing

Purpose:

- treat WL as overlay capability architecture spanning branded runtime, operator surfaces, and
  domain/routing seams without promoting it into a separate parent mode

Current reason to harden:

- WL is currently the easiest place for taxonomy, routing, and ownership drift to mix together

### 7.7 Boundary inventory gate before post-bootstrap hardening

Before any seam-hardening work begins beyond bootstrap unification, TexQtic should complete a
short boundary inventory for each candidate seam.

That inventory must identify:

- route ownership
- service ownership
- shared model dependencies
- cross-domain writes
- external contract touchpoints

Purpose of this gate:

- prevent domain hardening from starting with vague ownership assumptions
- surface where a seam is still only conceptual rather than operationally bounded
- make later bridge-state and rollback design materially cleaner

## 8. Prioritized architecture improvements justified now

The following architecture changes are justified now at planning level:

1. bootstrap unification
2. tenancy model convergence
3. contract-first discipline
4. control-plane domain hardening
5. naming and mode-model hardening

What is not justified now:

- microservice decomposition
- schema-first restructuring detached from service boundary planning
- platform-wide rewrite of auth, runtime, or routing

## 9. Transition-safety framework

No architectural change should proceed without an explicit transition model containing five states:

1. current state
2. target state
3. bridge state
4. rollback state
5. cutover criteria

Every major architecture move must also define:

- compatibility seams first
- adapter layers where needed
- dual-read or dual-route abstractions where needed
- contract wrappers where needed
- shadow verification before cutover
- feature-flag or bounded activation controls where needed
- delayed bridge removal only after stable soak

## 10. Parallel-run and bridge-state design rule

Mandatory rule:

- no architectural change without a parallel-run transition design

Meaning in practice:

1. The old and new structural paths must coexist long enough to compare behavior.
2. Verification must be based on parity, not assumption.
3. Bridge code remains until the new path survives a defined soak window.
4. Rollback must remain available until cutover criteria are met.

Examples of where this rule applies:

- bootstrap unification between `server/src/index.ts` and `api/index.ts`
- future `tenant_id` to `org_id` convergence in shared service or schema seams
- future control-plane domain boundary hardening that changes route composition or internal module
  ownership

## 11. Migration ordering options

Suggested bounded migration order to evaluate:

1. control-plane bootstrap unification
2. onboarding and lifecycle seam hardening
3. trust and compliance domain hardening
4. marketplace transaction-flow cluster hardening
5. AI and vector seam hardening
6. white-label capability and domain-routing seam hardening

Recommended assessment of this order:

- it is still the best default order
- bootstrap unification must come first because it reduces topology ambiguity for later work
- each post-bootstrap seam should enter the order only after its boundary inventory is complete
- onboarding and lifecycle come second because they bridge taxonomy, tenancy, and control-plane
  state transitions
- trust/compliance can harden before the primary transaction cluster because its ownership is
  easier to bound without reopening the entire exchange flow
- white-label and domain routing stay later because they are cross-cutting and easier to destabilize
  if moved too early

## 12. Recommended transition templates by change type

### 12.1 Bootstrap unification template

- Current state: two entrypoints with partially divergent route and health-path registration
- Target state: one explicit bootstrap contract with bounded runtime-specific deltas
- Bridge state: shared registration inventory plus adapter wrapper or shared registration builder
- Rollback state: revert to current dual-entrypoint behavior with documented divergence ledger
- Cutover criteria: health-path policy, route registration, and runtime-specific exclusions all
  match the approved contract

### 12.2 Tenancy convergence template

- Current state: hybrid `tenant_id` and `org_id` schema reality with `org_id` already canonical for
  RLS
- Target state: progressively reduced legacy residue with `org_id` as the dominant operational
  model
- Bridge state: compatibility layer, dual-support classification, and explicit residue inventory
- Rollback state: keep bridge mappings and preserve legacy readers until parity is proven
- Cutover criteria: each domain cluster passes contract, data, and runtime parity checks before any
  residue is retired

### 12.3 Control-plane hardening template

- Current state: materially real but uneven platform supervision surfaces
- Target state: cleaner internal ownership across tenant lifecycle, RBAC, finance visibility, and
  governance casework
- Bridge state: domain inventory, internal service seams, and explicit route ownership mapping
- Rollback state: preserve existing route ownership until new seams prove parity
- Cutover criteria: ownership, contracts, and runtime behavior are all parity-verified per bounded
  subfamily

## 13. Rollback and cutover discipline

Rollback discipline:

1. never remove bridge code before parity is proven
2. keep rollback at the same seam where the change was introduced
3. rollback must restore the last known-good bounded behavior, not a hypothetical cleaner state

Cutover discipline:

1. cut over family-by-family, not platform-wide
2. require parity evidence for routing, contracts, and data semantics
3. document post-cutover soak expectations before removing adapters or bridge paths

## 14. Proposed execution sequence

1. Approve this architecture evolution plan.
2. Define the bootstrap unification contract as the first bounded architecture planning unit.
3. Complete a boundary inventory for each candidate post-bootstrap seam covering route ownership,
  service ownership, shared model dependencies, cross-domain writes, and external contract
  touchpoints.
4. Produce a tenancy-convergence inventory and bridge model for later structural work.
5. Harden internal domain seams in the recommended order above.
6. Reassess extraction-readiness only after those seams are stable, measured, and operationally
   justified.

## 15. Completion state for this pass

This plan does not change the architecture.

It only defines the target direction, bounded seam strategy, and mandatory transition-safety rules
for later work.
