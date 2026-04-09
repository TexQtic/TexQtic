# TEXQTIC-LEGACY-TECH-DEBT-CLEANUP-PLAN-2026-04-09

Status: planning only
Date: 2026-04-09
Scope: structured debt program derived from repo-truth baseline
Primary authority: TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md

## 1. Purpose

This document defines a structured, staged, non-destructive program for reducing legacy technical
debt exposed by the repo-truth baseline.

The objective is not to clean everything at once. The objective is to reduce the highest-value,
lowest-risk debt first, separate clarity debt from structural debt, and prevent governance cleanup
from becoming a disguised rewrite.

## 2. Debt philosophy and safety rule

The controlling debt philosophy for TexQtic should be:

- shrink ambiguity before changing structure
- reduce authority sprawl before deepening implementation change
- prefer compatibility-preserving cleanup over big-bang simplification
- classify debt explicitly into keep, bridge, migrate, retire, or defer

Mandatory safety rule:

- no debt stream may be executed as an unbounded cleanup wave
- every debt unit must be small, reversible, and explicitly validated before the next stream takes
  a dependency on it

## 3. Cross-track interpretations preserved

The following interpretations are controlling for this plan and must remain visible in later
execution:

1. TexQtic's biggest near-term risk is authority sprawl more than raw code sprawl.
2. The strongest immediate win is restoring a clean authority hierarchy: repo/runtime truth,
   aligned technical contracts, aligned family design anchors, reconciled downstream governance,
   and only then delivery planning.
3. The modular monolith remains an asset and must not be destabilized through debt cleanup.
4. The medium-term technical debt center of gravity is legacy-to-`org_id` tenancy convergence.
5. White-label must be treated as capability architecture and overlay truth, not as a separate
   runtime family or a naming-only cleanup item.

## 4. Debt stream classification

### Stream 1 - truth and tooling debt

Scope:

- package-manager and workspace-truth normalization
- stale README cleanup and explicit de-authorization
- script-authority normalization across root and server packages
- development versus production bootstrap documentation parity

Repo-truth basis:

- Confirmed: root scripts use `npm`-style `cd server && npm run ...` patterns.
- Confirmed: root contains `package-lock.json` while the server contains `pnpm-lock.yaml`.
- Confirmed: repo governance language often assumes a clean pnpm/Turbo workspace that does not
  exist in the current filesystem.
- Confirmed: `server/README.md` is materially stale.

### Stream 2 - taxonomy debt

Scope:

- retire `enterprise` as runtime-family language
- normalize white-label as overlay capability rather than a separate commercial mode
- normalize `blocked_pending_verification` as a reporting/product label tied to real repo status
- remove governance references to `app.tenant_id` as canonical authority

Repo-truth basis:

- Confirmed: runtime-family truth is B2B, B2C, WL storefront, Aggregator workspace, and control
  plane, with WL admin overlay.
- Confirmed: enterprise remains billing-plan or B2B-depth language only.
- Confirmed: `app.org_id` is canonical and `app.tenant_id` is stale.

### Stream 3 - backend topology debt

Scope:

- reconcile `server/src/index.ts` and `api/index.ts`
- define one bootstrap contract with explicit runtime-specific deltas
- unify health-path policy and internal-route registration policy
- decide intentionally what is server-only, serverless-only, or universal

Repo-truth basis:

- Confirmed: `server/src/index.ts` exposes `/health` and `/` and registers `internalGovRoutes`.
- Confirmed: `api/index.ts` exposes `/api/health` and `/api` and does not register
  `internalGovRoutes`.

### Stream 4 - contract and maturity debt

Scope:

- route-by-route contract parity sweep
- identify thin versus fully wired surfaces
- control-plane maturity gaps across finance, RBAC, and deeper operator casework
- add missing tests where current truth is sampled more than comprehensively proven

Repo-truth basis:

- Confirmed: sampled OpenAPI alignment is strong, but a full parity sweep was not completed in the
  baseline pass.
- Confirmed: control-plane maturity remains uneven across several platform-operated lanes.

### Stream 5 - tenancy and schema debt

Scope:

- map remaining `tenant_id` residue
- classify legacy fields and tables into keep, bridge, migrate, or retire
- define staged `org_id` convergence
- preserve compatibility while progressively shrinking legacy patterns

Repo-truth basis:

- Confirmed: the schema remains hybrid with both legacy `tenant_id` and newer `org_id` patterns.
- Confirmed: the constitutional runtime and RLS boundary is already `org_id` / `app.org_id`.

### Stream 6 - thin-surface maturity debt

Scope:

- deepen the partially thin platform or tenant surfaces only after authority, taxonomy, topology,
  and contract posture are cleaner
- separate genuine feature-depth work from low-level debt cleanup

Repo-truth basis:

- Confirmed: some control-plane families remain materially real but uneven in depth.
- High-confidence: other product areas may appear debt-like when they are actually maturity or
  scope-expansion questions.

## 5. Prioritized sequencing

Recommended debt ordering:

1. Stream 1 - truth and tooling debt
2. Stream 2 - taxonomy debt
3. Stream 3 - backend topology debt
4. Stream 4 - contract and maturity debt
5. Stream 5 - tenancy and schema debt
6. Stream 6 - thin-surface maturity debt

Why this ordering is still correct:

- tooling and stale-doc debt create false authority and should be reduced first
- taxonomy debt should be cleaned before deeper reconciliation or architecture work interprets the
  wrong language
- bootstrap divergence should be bounded before contract parity sweeps rely on unclear runtime
  registration rules
- contract parity should tighten before schema convergence to reduce accidental breakage during
  migration work
- tenancy/schema convergence is the highest-value medium-term debt, but also the highest structural
  risk, so it should start after earlier clarity streams have reduced ambiguity
- thin-surface maturity work belongs last because it can easily become disguised product expansion

## 6. Short-term / medium-term / long-term breakdown

### Short-term

- Stream 1 in full
- Stream 2 in full
- the policy-definition parts of Stream 3
- initial inventory work for Stream 4

Target outcome:

- clearer authority, naming, and runtime-topology understanding without structural churn

### Medium-term

- execution work for Stream 3
- route-by-route parity and targeted test additions in Stream 4
- inventory and bridge planning for Stream 5

Target outcome:

- one explicit bootstrap contract, stronger API truth, and a fully classified tenancy/schema debt
  map

### Long-term

- staged Stream 5 convergence work
- bounded Stream 6 maturity programs where justified

Target outcome:

- smaller legacy footprint, stable `org_id`-first posture, and cleaner platform maturity without
  rewrite pressure

## 7. Debt risk matrix

| Debt stream | Value if reduced | Execution risk | Primary risk type | Planning posture |
| --- | --- | --- | --- | --- |
| Truth and tooling debt | High | Low | authority confusion | start first |
| Taxonomy debt | High | Low | semantic drift | start early |
| Backend topology debt | High | Medium | runtime divergence | stage after taxonomy |
| Contract and maturity debt | High | Medium | hidden contract drift | stage after topology policy |
| Tenancy and schema debt | Very high | High | structural regression and compatibility breakage | stage carefully |
| Thin-surface maturity debt | Medium | Medium-high | scope creep disguised as cleanup | defer until last |

## 8. Stream-by-stream cleanup recommendations

### 8.1 Stream 1 recommendations

1. Create one explicit repo/tooling truth record for package manager, lockfile, and workspace
   posture.
2. De-authorize `server/README.md` as live operational authority before any deeper cleanup wave.
3. Normalize script-authority language so root and server commands do not imply a workspace shape
   that the repo does not currently have.
4. Record dev-server versus serverless bootstrap differences as explicit runtime topology rather
   than accidental drift.

Safest first move:

- documentation and authority cleanup only

### 8.2 Stream 2 recommendations

1. Replace enterprise-as-runtime wording everywhere new governance writing is created.
2. Normalize WL language to overlay/capability terminology in governance and planning surfaces.
3. Explicitly map `blocked_pending_verification` to `organizations.status = PENDING_VERIFICATION`
   plus blocked B2B workspace behavior.
4. Remove any governance reference that still treats `app.tenant_id` as canonical.

Safest first move:

- opening-layer terminology normalization before downstream family rewrites

### 8.3 Stream 3 recommendations

1. Define the universal bootstrap contract first: plugins, hooks, routes, health-path policy,
   internal-route policy, and runtime-specific exclusions.
2. Create a universal-versus-runtime-specific registration inventory.
3. Only after the contract is written, plan code-level unification work.

Safest first move:

- contract and inventory work before any implementation move

### 8.4 Stream 4 recommendations

1. Run a route-by-route parity ledger for both tenant and control-plane paths.
2. Mark each path as aligned, missing-from-spec, missing-from-code, or behaviorally drifted.
3. Add targeted tests only where parity assumptions are sampled, not fully proven.
4. Keep control-plane maturity gaps separate from simple contract documentation drift.

Safest first move:

- parity inventory before remediation

### 8.5 Stream 5 recommendations

1. Produce a `tenant_id` residue inventory by table, route, service, and contract surface.
2. Classify each residue item into keep, bridge, migrate, or retire.
3. Design bridge-safe compatibility steps before any persistence or API mutation.
4. Sequence convergence domain-by-domain rather than table-by-table wherever that reduces partial
   states.

Safest first move:

- inventory and classification only

### 8.6 Stream 6 recommendations

1. Separate maturity programs from debt programs.
2. Only open thin-surface work when the family boundary is already clean.
3. Use explicit bounded units for control-plane finance, RBAC, AI-governance depth, or other thin
   lanes.

Safest first move:

- no maturity implementation until earlier debt streams have reduced ambiguity

## 9. Anti-patterns to avoid

1. Do not run one large repo-wide cleanup spanning docs, taxonomy, bootstrap, contracts, and
   schema together.
2. Do not treat schema convergence as a prerequisite for governance reset.
3. Do not rewrite aligned contracts just because adjacent docs are stale.
4. Do not use debt cleanup to smuggle in architecture changes.
5. Do not use maturity gaps as justification for premature microservice extraction.
6. Do not rename legacy terms without classifying the behavioral meaning they currently map to.

## 10. Validation and verification expectations

Each debt stream should carry its own validation style:

- Stream 1: file-authority and script-truth review
- Stream 2: terminology and taxonomy parity review against repo/runtime truth
- Stream 3: route-registration and bootstrap-contract parity verification
- Stream 4: contract diff ledger plus targeted tests
- Stream 5: schema/residue inventory, compatibility mapping, and explicit bridge criteria
- Stream 6: family-level acceptance criteria before any deeper maturity work begins

Global rule:

- no stream is complete until its truth artifact, risk classification, and validation evidence all
  agree

## 11. Proposed execution sequence

1. Approve this debt cleanup plan.
2. Open a bounded Stream 1 truth/tooling cleanup planning unit.
3. Open a bounded Stream 2 taxonomy normalization planning unit.
4. Define the bootstrap contract for Stream 3 before any implementation change.
5. Run the contract parity inventory for Stream 4.
6. Build the `tenant_id` residue map for Stream 5.
7. Only after the above are stable, consider bounded Stream 6 maturity work.

## 12. Completion state for this pass

This plan does not clean any debt.

It only classifies the streams, priority order, time horizons, risks, and execution discipline for
the next phase.
