# TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09

Status: canonical pre-audit baseline
Date: 2026-04-09
Scope: discovery and decision only

## 1. Purpose and decision context

This artifact establishes the current pre-audit baseline for TexQtic from repo-first evidence,
cross-checks that baseline against currently available runtime-confirmed truth, classifies drift
across governance and design artifact families, and evaluates whether the next governance phase
should reconcile the current corpus forward or reset the opening layer from fresh repo-truth-
aligned documents.

This artifact does not begin governance reconciliation.

This artifact does not authorize application, runtime, schema, control-plane, or product behavior
changes.

This artifact is intentionally written from repo truth outward. Existing governance or planning
wording is treated as secondary wherever it conflicts with code, config, runtime descriptor logic,
schema authority, or live control-plane evidence.

## 2. Executive summary

- Confirmed repo reality is a dual-package repo with a root Vite/React SPA plus a nested Fastify
  server, shared contracts, shared docs, and operational scripts. It is not a formal pnpm/Turbo
  workspace in the currently inspected filesystem because no `pnpm-workspace.yaml` or `turbo.json`
  exists.
- Confirmed backend reality is a single Fastify service with one shared database and one shared
  codebase. It is a modular monolith, not a microservice system.
- Confirmed tenancy reality is hybrid but constitutionally anchored on `org_id` and
  `app.org_id`. The repo still carries legacy `tenantId` fields and some older naming residue, but
  the current RLS and transaction context authority is `app.org_id`, not `app.tenant_id`.
- Confirmed frontend runtime authority is `runtime/sessionRuntimeDescriptor.ts`. Current runtime
  family truth is `B2B_WORKSPACE`, `B2C_STOREFRONT`, `WL_STOREFRONT`,
  `AGGREGATOR_WORKSPACE`, and `CONTROL_PLANE`, with optional `WL_ADMIN` overlay.
- Confirmed post-cleanup runtime truth is: 444 total tenant rows, 6 active, 438 closed. The only
  active tenant rows are `qa-b2b`, `qa-b2c`, `qa-wl`, `qa-agg`, `qa-pend`, and `white-label-co`.
  `white-label-co` remains active and is the sole REVIEW-UNKNOWN hold.
- Confirmed control-plane archive capability exists in runtime code and is explicitly blocked for
  the canonical QA keep-set and `white-label-co`.
- Current April 2026 product-truth family normalization/design artifacts are materially stronger
  than the older sequencing and broad planning stack. Several top-level governance/planning
  pointers remain structurally useful but no longer form a sufficiently clean next-cycle baseline.
- Recommendation: do not reconcile the existing governance opening layer forward as-is. Use a
  hybrid reset strategy with strong tilt toward retiring and recreating opening-layer truth and
  next-cycle baseline documents from current repo/runtime evidence, while preserving aligned
  contracts and aligned April family-normalization artifacts.

## 3. Confirmed operational baseline after ARCHIVE-TEST cleanup

The following is treated as the current operational baseline for this artifact.

Confirmed by established cycle truth and live control-plane snapshot:

- total tenant rows: 444
- active rows: 6
- closed rows: 438
- suspended rows shown in live control plane: 0
- QA CTRL was not touched
- QA WL Member is not a separate tenant row
- the preserved QA keep-set remains:
  - `qa-b2b`
  - `qa-b2c`
  - `qa-wl`
  - `qa-agg`
  - `qa-pend`
- the sixth active tenant row is `white-label-co`
- `white-label-co` remains active and remains the sole REVIEW-UNKNOWN hold
- no protected QA row was archived
- no REVIEW-UNKNOWN row was archived
- no repo files were modified during the cleanup pass
- no commit was created during the cleanup pass

Live runtime cross-check captured during this pass from the control-plane tenant registry confirms:

- `Total Tenants = 444`
- `Active = 6`
- `Closed = 438`
- active rows visible in runtime:
  - `QA PEND`
  - `QA AGG`
  - `QA WL`
  - `QA B2C`
  - `White Label Co`
  - `QA B2B`

## 4. Repo truth investigation methodology

Method used in this pass:

1. inspect repo structure and active entrypoints before reading planning artifacts
2. inspect code authorities for runtime-family selection, route registration, schema, seed truth,
   RLS, tenancy, lifecycle, and control-plane mutation paths
3. inspect selected product-truth and governance artifacts only after repo/code authority was
   established
4. cross-check against currently available live control-plane runtime evidence
5. classify conclusions using the following evidence bar:
   - Confirmed: directly evidenced in code, config, schema, or live runtime snapshot
   - High-confidence: strongly implied by multiple repo sources but not directly re-executed in
     this pass
   - Unknown: not provable from inspected repo/runtime evidence in this pass

This pass deliberately did not start from governance documents and map inward.

## 5. Current repo structure truth

### 5.1 Package and workspace reality

Confirmed repo structure:

- root application package: Vite + React SPA (`package.json` at repo root)
- nested backend package: Fastify + Prisma server (`server/package.json`)
- shared contract layer: `shared/contracts/`
- docs and governance corpus: `docs/` and `governance/`
- frontend application surfaces live directly at repo root, not in a separate `frontend/`
  package

Confirmed non-repo-truth assumption to retire:

- the currently inspected repo is not a formal pnpm/Turbo workspace because there is no
  `pnpm-workspace.yaml` and no `turbo.json`

Observed packaging/tooling split:

- root package uses `npm`-style scripts such as `cd server && npm run ...`
- root filesystem contains `package-lock.json`
- nested server package contains `pnpm-lock.yaml`
- repo governance instructions still prefer pnpm, but the current repo filesystem does not support
  treating the project as a clean, formal pnpm/Turbo workspace without qualification

Conclusion:

- current repo truth is a two-package application repo with shared documentation and contracts,
  not a clean Turbo-managed multi-package workspace

### 5.2 Active application and config surfaces

Confirmed active top-level application/config layers:

- SPA entry and application orchestration: `index.tsx`, `App.tsx`, `runtime/`
- frontend services: `services/`
- shared UI shells and surfaces: `layouts/`, `components/`, `contexts/`
- server entrypoints and backend domains: `server/src/`
- Vercel/serverless entrypoint: `api/index.ts`
- edge/runtime routing support: `middleware.ts`, `server/src/hooks/tenantResolutionHook.ts`
- infra/config: `vercel.json`, `vite.config.ts`, `tailwind.config.ts`, `server/docker-compose.yml`
- governance/ops scripts: `scripts/`, `server/scripts/`

### 5.3 Operational scripts and entrypoints

Confirmed root operational entrypoints include:

- `build`, `typecheck`, `lint`
- `validate:contracts`
- `governance:lint`
- `control:manifest`
- `control:guard`
- `test:server`, `test:runtime-verification`

Confirmed server operational entrypoints include:

- `dev`, `build`, `start`, `test`, `test:runtime-verification`
- governed Prisma wrappers such as `db:migrate:tracked`, `prisma:preflight`, `migrate:deploy:prod`
- `ci:rls-proof`

### 5.4 Deprecated or low-confidence repo surfaces

Confirmed low-confidence or explicitly de-authorized surfaces:

- root `README.md` is explicitly retained as reference with targeted de-authorization
- `server/README.md` is materially stale and unsafe as operational authority because it still
  documents local Postgres assumptions, `npx prisma`, `db:rls`, and `app.tenant_id`
- any statement that this repo is a formal Turbo workspace is currently unsafe to rely on

## 6. Current backend / architecture / API truth

### 6.1 Backend architecture in force

Confirmed backend reality:

- one Fastify codebase
- one Prisma schema
- one shared Postgres authority model
- one modular server with route families and domain modules

This is a modular monolith, not a microservice platform.

### 6.2 Route topology actually present

Confirmed in `server/src/index.ts`:

- public routes under `/api/public`
- auth routes under `/api/auth`
- control-plane routes under `/api/control`
- tenant routes under `/api/...` with concrete `/tenant/*` paths
- control-plane marketplace summary routes under `/api/control/marketplace`
- AI routes under `/api/ai`
- control-plane tenant provisioning under `/api/control`
- control-plane impersonation under `/api/control`
- internal governance and internal resolver/cache routes under `/api/internal/*` and
  `/api/control/internal/*`

Confirmed tenant sub-route modules present:

- `trades.g017.ts`
- `escrow.g018.ts`
- `certifications.g019.ts`
- `escalation.g022.ts`
- `settlement.ts`
- `traceability.g016.ts`

### 6.3 Entry-point divergence that must be recorded

Confirmed repo truth includes two backend bootstrap entrypoints with non-identical registration:

- `server/src/index.ts` registers internal governance routes and exposes `/health` and `/`
- `api/index.ts` is the Vercel handler and exposes `/api/health` and `/api`
- `api/index.ts` does not register `internalGovRoutes`

This is not necessarily a bug, but it is current backend topology truth and a real source of
operational/gov-doc drift risk.

### 6.4 Domain/service boundaries actually present

Confirmed domain/service clusters include:

- certifications
- traceability
- escalations
- escrow
- settlement
- trades
- maker-checker approvals
- sanctions
- AI inference, vector ingestion, vector index queue
- tenant provisioning
- impersonation

Confirmed service composition pattern:

- route handlers remain HTTP-focused
- domain work is delegated into service modules
- lifecycle transitions are centralized via `stateMachine.service.ts`

### 6.5 Control-plane mutation paths actually present

Confirmed control-plane write/mutation paths include:

- onboarding outcome recording on `organizations.status`
- approved activation from `VERIFICATION_APPROVED` to `ACTIVE`
- tenant archive to `CLOSED`
- tenant provisioning
- impersonation start/stop/status
- maker-checker internal approval/replay routes

Confirmed archive path behavior:

- route exists at `POST /api/control/tenants/:id/archive`
- requires `SUPER_ADMIN`
- requires explicit `expectedSlug` confirmation
- writes both `organizations.status` and `tenant.status` to `CLOSED`
- writes audit event `control.tenants.archive.recorded`
- blocks protected QA targets and `white-label-co`

### 6.6 Production-wired versus partial/thin backend areas

Confirmed materially wired backend families:

- tenant catalog and cart flows
- orders
- RFQ flows
- trade creation from RFQ
- escrow account and settlement preview/apply
- certification lifecycle
- traceability
- audit log reads
- AI tenant endpoints
- control-plane tenant registry and lifecycle actions

Confirmed thin or mixed-maturity areas still visible in repo truth:

- broader control-plane family remains uneven across finance, RBAC, and deeper operator casework
- internal route registration differs across entrypoints
- older docs still describe outdated backend contracts and migration posture

## 7. Current schema / tenancy / lifecycle truth

### 7.1 Schema organization and tenancy model

Confirmed schema reality is hybrid:

- legacy/general tenant identity still exists via `Tenant` and many `tenant_id`-based tables
- canonical organization lifecycle and newer cross-domain continuity live through
  `organizations` and `org_id`
- `organizations.id` is the live FK target for newer lifecycle-heavy domains

This is not a pure `tenant_id` schema anymore and not a fully completed `org_id`-only schema.

### 7.2 Canonical tenant isolation truth

Confirmed constitutional isolation truth:

- canonical DB tenant boundary is `app.org_id`
- canonical application transaction wrapper is `withDbContext`
- canonical request-bound context builder is `buildContextFromRequest`
- canonical transaction posture includes `SET LOCAL ROLE texqtic_app`
- repo doctrine and RLS contract explicitly reject `app.tenant_id` as current authority

Confirmed literal code behavior:

- `withDbContext` sets `app.org_id`, `app.actor_id`, `app.realm`, and `app.request_id`
- `withDbContext` explicitly does not set `app.tenant_id`
- tenant routes use `databaseContextMiddleware` and `withDbContext`

### 7.3 Lifecycle state modeling

Confirmed lifecycle truth:

- runtime tenant status still exists on `Tenant.status`
- onboarding and canonical organization lifecycle truth sits on `organizations.status`
- `organizations.status` legal values include:
  - `ACTIVE`
  - `SUSPENDED`
  - `CLOSED`
  - `PENDING_VERIFICATION`
  - `VERIFICATION_APPROVED`
  - `VERIFICATION_REJECTED`
  - `VERIFICATION_NEEDS_MORE_INFO`

Confirmed archive/closure modeling:

- archival is modeled as status transition to `CLOSED`
- both organization and tenant status are moved to `CLOSED` during control-plane archive
- post-cleanup runtime confirms heavy use of `CLOSED` as the dominant lifecycle terminal state

### 7.4 Pending verification posture truth

Confirmed repo implementation for the pending/blocked QA posture:

- `qa-pend` seed is `tenant.status = ACTIVE`
- `qa-pend` seed is `organization.status = PENDING_VERIFICATION`
- runtime descriptor still resolves `qa-pend` into `B2B_WORKSPACE`
- frontend renders a verification-blocked B2B shell mode and suppresses active trading actions

Required governance taxonomy to preserve from current operational/QA truth:

- family label: `blocked_pending_verification`

Repo implementation mapping for that label:

- enforced by `organizations.status = PENDING_VERIFICATION`
- rendered through a blocked B2B workspace posture and verification-blocked shell behavior

### 7.5 WL owner/member distinction actually implemented

Confirmed white-label distinction in repo truth:

- `qa-wl` is a tenant row
- `qa.wl@texqtic.com` is seeded as owner/admin-side login for the WL tenant
- `qa.wl.member@texqtic.com` is a seeded member identity on the same `qa-wl` tenant
- WL admin overlay is granted only when white-label capability is true and role is owner/admin
- QA WL Member is not a separate tenant row

## 8. Current frontend / runtime surface truth

### 8.1 Current runtime authority

Confirmed current frontend runtime authority is `runtime/sessionRuntimeDescriptor.ts`.

It defines:

- `TenantCategory = AGGREGATOR | B2B | B2C | INTERNAL`
- operating modes:
  - `CONTROL_PLANE`
  - `AGGREGATOR_WORKSPACE`
  - `B2B_WORKSPACE`
  - `B2C_STOREFRONT`
  - `WL_STOREFRONT`
- overlay:
  - `WL_ADMIN`

Confirmed shell families:

- `SuperAdminShell`
- `AggregatorShell`
- `B2BShell`
- `B2CShell`
- `WhiteLabelShell`
- `WhiteLabelAdminShell`

### 8.2 Runtime-family resolution truth

Confirmed runtime resolution rules:

- `AGGREGATOR` and `INTERNAL` map to `AGGREGATOR_WORKSPACE`
- `B2B` maps to `B2B_WORKSPACE` unless `whiteLabelCapability = true`, then `WL_STOREFRONT`
- `B2C` maps to `B2C_STOREFRONT` unless `whiteLabelCapability = true`, then `WL_STOREFRONT`
- WL admin overlay is a separate overlay state, not a separate parent commercial access model

### 8.3 Current user-facing runtime surfaces

Confirmed user-facing runtime families exist as real surfaces:

- control plane
- B2B workspace
- B2C storefront
- WL storefront
- WL admin overlay/back-office
- aggregator workspace

Confirmed current shell chrome/branding distinctions:

- B2B shell labels itself `TexQtic B2B Workspace`
- B2C shell labels itself `TexQtic Storefront`
- aggregator shell labels itself `Aggregator Workspace`
- WL storefront uses tenant-owned branding and storefront-style header chrome
- WL admin uses `Store Admin` branding, not control-plane chrome
- control plane uses dedicated control-plane shell chrome

### 8.4 Current document-title truth

Confirmed document title behavior:

- control plane title base: `TexQtic Control Plane`
- B2B title base: `TexQtic B2B Workspace`
- B2C title base: `TexQtic Storefront`
- aggregator title base: `TexQtic Aggregator Workspace`
- WL storefront titles are tenant-name-first
- WL admin titles are `Tenant Name Admin`

### 8.5 Current mode-specific posture truth

Confirmed B2B truth:

- business workspace shell exists
- catalog is the default B2B local route
- blocked verification posture suppresses trade-capable actions until approval

Confirmed B2C truth:

- non-WL B2C storefront exists
- B2C browse-entry is distinct from authenticated downstream continuity

Confirmed WL truth:

- WL storefront is a real storefront family
- WL admin overlay is optional and role-gated
- repo truth models WL as overlay capability, not as separate tenant category

Confirmed Aggregator truth:

- aggregator workspace is real in runtime
- current family normalization still constrains it to curated discovery plus intent handoff rather
  than full orchestrator semantics

### 8.6 Naming residue that must not be mistaken for authoritative taxonomy

Confirmed code-level residue still exists in `App.tsx`:

- `ENTERPRISE_TRADE_BRIDGE_CURRENCY`
- `ENTERPRISE_HOME_CATALOG_FIRST_PAINT_LIMIT`
- `isEnterpriseCatalogEntrySurface`

Conclusion:

- current code logic is driven by `b2b_workspace`, not by a separate enterprise runtime family
- some legacy `enterprise` names remain in code and governance residue, but they are naming
  residue, not current runtime-family authority

## 9. Production/runtime cross-verification summary

### 9.1 Live control-plane verification captured during this pass

Confirmed from the live control-plane tenant registry page:

- title: `Tenants | TexQtic Control Plane`
- tenant registry is materially real
- counts shown live: 444 total, 6 active, 438 closed
- visible active set exactly matches:
  - `QA B2B`
  - `QA B2C`
  - `QA WL`
  - `QA AGG`
  - `QA PEND`
  - `White Label Co`

### 9.2 Runtime truths confirmed through repo-plus-runtime cross-check

Confirmed:

- canonical QA keep-set remains active in runtime
- QA WL Member is not a separate row in runtime
- archive capability exists in runtime code and is designed to move rows to `CLOSED`
- archive protection exists for the canonical QA set and `white-label-co`
- `white-label-co` remains active and protected from archive via current control-plane route logic

### 9.3 Runtime truths not invented in this pass

Not asserted beyond available evidence:

- no new claim is made here about the full semantic reason attached to the `white-label-co`
  hold beyond the current operational statement that it remains the sole REVIEW-UNKNOWN hold
- no new claim is made here about all closed-row provenance beyond the visible closed inventory and
  prior established cleanup baseline

## 10. Current taxonomy truth in force

### 10.1 Runtime-family taxonomy to preserve

The runtime-family language that should now be treated as current truth is:

| Area | Current truth in force | Evidence status |
| --- | --- | --- |
| B2B family | `B2B workspace` / `b2b_workspace` | Confirmed |
| B2C family | `B2C storefront` / `b2c_storefront` | Confirmed |
| WL family | `WL storefront` / `wl_storefront` plus optional `WL admin overlay` | Confirmed |
| Aggregator family | `aggregator_workspace` with curated discovery + intent handoff interpretation | Confirmed |
| Pending/blocked family | `blocked_pending_verification` as reporting/governance family label, implemented through `PENDING_VERIFICATION` plus blocked B2B workspace behavior | Confirmed |
| Control plane | `control_plane` / `TexQtic Control Plane` | Confirmed |

### 10.2 Billing-plan taxonomy to preserve

Confirmed billing/commercial plan language:

- `FREE`
- `STARTER`
- `PROFESSIONAL`
- `ENTERPRISE`

Decision rule to preserve:

- `ENTERPRISE` remains billing-plan language only
- `ENTERPRISE` is not a separate runtime family or commercial access model

### 10.3 Tenant identity taxonomy to preserve

Confirmed identity signals in force:

- `tenant_category` is the current structural tenant family signal
- `is_white_label` is the WL capability/overlay signal
- `tenantType` / `TenantType.WHITE_LABEL` is legacy residue and not the correct current family
  authority

### 10.4 Lifecycle/status taxonomy to preserve

Confirmed lifecycle/status terms in force:

- `ACTIVE`
- `SUSPENDED`
- `CLOSED`
- `PENDING_VERIFICATION`
- `VERIFICATION_APPROVED`
- `VERIFICATION_REJECTED`
- `VERIFICATION_NEEDS_MORE_INFO`

### 10.5 Deprecated taxonomy to retire from next governance layer

The following wording is now deprecated or retired as current authority:

- `enterprise` as a separate runtime family
- `enterprise runtime` as a primary taxonomy label
- `enterprise tenant` as a current family label
- `white-label` as a fourth commercial access model or board-level pillar
- `app.tenant_id` as the canonical tenant GUC
- `tenantType.WHITE_LABEL` as the authoritative WL family signal
- any statement that a formal Turbo workspace exists without qualification

## 11. Drift analysis: governance corpus

### 11.1 Classification summary

| Governance family | Classification | Decision note |
| --- | --- | --- |
| Shared contracts: `rls-policy`, `db-naming-rules`, `ARCHITECTURE-GOVERNANCE`, sampled OpenAPI | ALIGNED | Current code evidence supports these as the strongest governance-grade technical truth layer inspected in this pass |
| Layer 0 control posture: `OPEN-SET`, `NEXT-ACTION`, `SNAPSHOT`, `BLOCKED` | PARTIALLY DRIFTED | Structure is still useful, but live pointers remain anchored to pre-audit `-v2` sequencing truth and do not encode the post-cleanup baseline or reset decision requirement |
| Product-facing planning stack: `TEXQTIC-GAP-REGISTER-v2`, `TEXQTIC-NEXT-DELIVERY-PLAN-v2`, `TEXQTIC-IMPLEMENTATION-ROADMAP-v2` | MATERIALLY DRIFTED | Strong historical cycle record, but no longer a clean next-cycle truth base after the current cleanup state and current repo/runtime re-baselining need |
| Historical execution logs, archived trackers, closed unit files | OBSOLETE / UNSAFE TO RELY ON as live authority | Still valuable as evidence record only |
| QA seed/rename and cleanup planning artifacts | PARTIALLY DRIFTED | Canonical QA naming remains useful, but several sequencing assumptions are now overtaken by cleanup completion and current runtime inventory |
| Root README as governance/planning pointer | PARTIALLY DRIFTED but self-de-authorized | Useful only because it now explicitly points away from itself |
| `server/README.md` as operational/governance authority | OBSOLETE / UNSAFE TO RELY ON | Contains outdated Prisma, DB, and RLS guidance |

### 11.2 Governance findings by family

#### A. Shared technical contracts

Confirmed aligned and currently trustworthy in this pass:

- `shared/contracts/rls-policy.md`
- `shared/contracts/db-naming-rules.md`
- `shared/contracts/ARCHITECTURE-GOVERNANCE.md`
- sampled portions of `shared/contracts/openapi.control-plane.json`
- sampled portions of `shared/contracts/openapi.tenant.json`

Reason:

- these artifacts match the inspected code authority around `app.org_id`, archive behavior,
  tenant catalog, RFQ, escrow, settlement, certifications, and traceability

#### B. Layer 0 control-plane governance posture

Current state:

- still structurally coherent
- still correctly records zero-open posture
- still useful as a control discipline layer

Why not sufficient as current baseline authority:

- it still points future movement at the older `-v2` sequencing stack
- it does not encode the new post-cleanup tenant inventory truth as opening-layer baseline
- it does not yet reflect that a reset-option decision is now the stronger next governance move

Verdict:

- PARTIALLY DRIFTED as live baseline authority

#### C. Product-facing planning stack

Current state:

- rich historical cycle record
- detailed candidate and closure history
- still useful as evidence record

Why materially drifted:

- it is still framed around the prior bounded opening/closure cycle
- it is not a fresh repo-truth baseline after the archive cleanup execution state
- it preserves older next-candidate posture without the new pre-audit truth reset now required
- it still carries enterprise shorthand heavily in naming and sequencing residue

Verdict:

- MATERIALLY DRIFTED as next-cycle truth authority

## 12. Drift analysis: design / product-truth artifacts

### 12.1 Trustworthy families

The strongest currently trustworthy product-truth/design families inspected in this pass are:

| Design family | Classification | Decision note |
| --- | --- | --- |
| `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md` | TRUSTWORTHY | Best current platform-level identity and non-drift guardrail source inspected in this pass |
| `B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md` | TRUSTWORTHY | Aligns with runtime-family and board model truth |
| `B2C-OPERATING-MODE-DESIGN-v1.md` | TRUSTWORTHY | Aligns with current B2C browse-entry plus authenticated continuity posture |
| `ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md` | TRUSTWORTHY | Correctly demotes enterprise to B2B depth rather than separate mode |
| `WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md` | TRUSTWORTHY | Best current WL family classification anchor |
| `AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md` | TRUSTWORTHY | Correctly constrains Aggregator to discovery + intent handoff interpretation |
| `PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md` | TRUSTWORTHY | Best current family-level control-plane boundary anchor |
| `IDENTITY-TENANCY-WORKSPACE-CONTINUITY-DESIGN-v1.md` | TRUSTWORTHY | Aligns with `org_id`, realm continuity, and workspace authority posture |

### 12.2 Partially drifted or narrower-than-current artifacts

| Design family | Classification | Decision note |
| --- | --- | --- |
| `TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md` | PARTIALLY DRIFTED | Still useful for loop design, but retains `enterprise` branch shorthand and does not reflect the current post-cleanup QA baseline or the newer runtime-family taxonomy cleanly enough |
| `PLATFORM-CONTROL-PLANE-FAMILY-RECONCILIATION-v1.md` | PARTIALLY DRIFTED | Useful audit-prep note, but explicitly narrower than the stronger `FAMILY-REPLAN` anchor |
| QA ops planning artifacts | PARTIALLY DRIFTED | Naming and family intent remain useful; execution-order assumptions are now partly historical |

### 12.3 Historical or unsafe-as-primary artifacts

| Design family | Classification | Decision note |
| --- | --- | --- |
| `TEXQTIC-WHITE-LABEL-OPERATING-MODE-DESIGN-v1.md` | OBSOLETE / HISTORICAL as current family authority | The file itself declares `WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md` as the current classification authority |
| root `README.md` body as platform/design truth | OBSOLETE / HISTORICAL as primary authority | Only safe when read through its de-authorization banner |
| `server/README.md` | OBSOLETE / MISLEADING | Contradicts current governed DB/RLS and Prisma posture |

## 13. Option analysis

### 13.1 Option A - reconcile the existing governance corpus forward

Assessment:

| Criterion | Verdict | Reason |
| --- | --- | --- |
| Fidelity to current repo truth | Medium-low | Too many current pointers still inherit pre-reset assumptions |
| Risk of preserving hidden distortion | High | Reconciliation-forward would preserve stale naming, stale openings, and mixed historical assumptions unless every layer is re-audited first |
| Implementation cleanliness | Low-medium | Would require many targeted corrections across already tangled pointer layers |
| Future drift resistance | Low | Old document shapes and pointer chains would remain the foundation |
| Effort | Medium-high | Lower document churn than full recreation, but high review burden because each artifact must be requalified in place |
| Safety | Medium | Safer than blind rewrite, but not safe enough for a clean next-cycle baseline |
| Clarity for future development | Low-medium | Future readers would still need to know which retained old layers are historical versus live |
| Probability of reducing confusion | Low | Too much inherited context survives the correction |
| Probability of durable governance control | Low-medium | Better than no action, but not clean enough for current drift depth |

Option A conclusion:

- not recommended as the primary next move

### 13.2 Option B - retire and recreate opening-layer truth, then rebuild/re-audit downstream truth from fresh repo-aligned openings

Assessment:

| Criterion | Verdict | Reason |
| --- | --- | --- |
| Fidelity to current repo truth | High | Starts from current code, schema, runtime descriptor, and live tenant inventory truth |
| Risk of preserving hidden distortion | Low | Opening-layer reset lets stale assumptions die instead of being patched forward |
| Implementation cleanliness | High | Cleaner control if the reset is limited first to openings, canonical baseline, and pointer layers |
| Future drift resistance | High | Fresh baseline reduces inherited ambiguity |
| Effort | High but bounded | More upfront work, but lower ongoing interpretive tax if aligned families are preserved rather than rewritten |
| Safety | High | Safest if aligned technical contracts and aligned family-level design anchors are explicitly preserved |
| Clarity for future development | High | New openings can clearly separate preserved truth from replaced truth |
| Probability of reducing confusion | High | Strongest option for eliminating mixed authority chains |
| Probability of durable governance control | High | Creates a cleaner base for future bounded TECS work |

Option B conclusion:

- stronger, safer, cleaner, and more drift-resistant than reconcile-forward

### 13.3 Decision synthesis

The strongest path is not a total wipe of every artifact family.

The strongest path is a hybrid reset strategy with a strong tilt toward Option B:

- retire and recreate the opening-layer and top-level baseline truth docs
- preserve aligned technical contracts
- preserve aligned April 2026 family-normalization/design anchors
- then re-audit or selectively rebuild downstream governance/design families from the new baseline

## 14. Recommendation and rationale

Recommendation:

- adopt a hybrid reset strategy with strong tilt toward retiring and recreating governance
  openings and top-level truth baselines before any broad reconciliation begins

Plain decision:

- do not use reconcile-forward as the primary strategy
- do not treat the current `-v2` sequencing stack as the live next-cycle baseline
- do not try to preserve the current opening-layer truth by patching it in place

Why this is the strongest strategy:

1. current repo/runtime truth is materially clearer than the current opening-layer governance stack
2. aligned contracts and aligned April family-normalization artifacts already provide strong
   reusable truth anchors, so a reset does not require rewriting everything
3. the heaviest distortion is concentrated in the opening/pointer/planning layer, not in the core
   technical contracts or the strongest recent family docs
4. opening-layer recreation will reduce future drift more effectively than incremental correction
   of the old planning chain
5. this approach preserves evidence lineage while preventing stale sequencing and stale taxonomy
   from continuing to shape future openings

## 15. Proposed next execution sequence

The exact recommended next sequence is:

1. freeze this artifact as the canonical pre-audit baseline for the next decision cycle
2. open one bounded governance decision record that authorizes opening-layer reset and defines the
   preserve-versus-recreate matrix
3. create fresh top-level repo-truth-aligned opening documents for:
   - current repo/runtime baseline
   - current taxonomy truth
   - current governance authority/pointer layer
4. de-authorize the current opening-layer pointer chain only after the fresh baseline documents
   exist and explicitly preserve historical lineage
5. preserve without rewrite the aligned technical contracts and aligned April family-normalization
   artifacts identified in this report
6. classify remaining downstream governance and design artifacts into:
   - preserve as aligned
   - preserve as historical evidence only
   - rewrite from new baseline
   - archive/de-authorize as unsafe primary authority
7. only after the opening-layer reset is complete, begin family-by-family governance
   reconciliation from the new baseline
8. only after that reconciliation frame exists, select the next bounded product or governance unit
   from fresh repo-truth-aligned openings rather than from the old `-v2` stack

### 15A. Follow-on product/ops observations

Future refinement to record only, not implement in this pass:

- CLOSED units should be listed separately in a CLOSED list and should not clutter the
  OPEN/CURRENT tenant list

This is a future product/ops refinement only.

## 16. Risks / unknowns / validation gaps

- The repo currently carries packaging/tooling drift between governance assumptions and filesystem
  reality. Formal Turbo workspace assumptions should not be preserved without qualification.
- Backend bootstrap divergence exists between `server/src/index.ts` and `api/index.ts`.
  Internal-route and health-path parity should be reviewed during the reset phase.
- `white-label-co` remains the sole active non-QA hold. Its final classification/disposition still
  blocks any claim that the active tenant baseline is fully normalized beyond the documented hold.
- Not every OpenAPI path was exhaustively diffed route-by-route in this pass. The sampled control
  and tenant surfaces inspected here align, but a full contract parity sweep remains a separate
  later validation activity.
- Several docs still carry `enterprise` shorthand. Most of that residue appears to be naming drift
  rather than runtime-family truth, but a later rewrite pass should normalize it at the opening
  layer and then progressively downstream.
- `blocked_pending_verification` is currently an operational/product taxonomy label mapped onto
  concrete repo behavior rather than a literal runtime enum string. Future governance writing
  should preserve that distinction explicitly.

## 17. Appendix: evidence map

### 17.1 Repo structure and packaging evidence

- root `package.json`
- `server/package.json`
- absence of `pnpm-workspace.yaml`
- absence of `turbo.json`
- root `README.md`
- `server/README.md`

### 17.2 Backend and route topology evidence

- `server/src/index.ts`
- `api/index.ts`
- `server/src/routes/control.ts`
- `server/src/routes/public.ts`
- `server/src/routes/ai.ts`
- `server/src/routes/internal/index.ts`
- `server/src/routes/tenant.ts`
- `server/src/routes/tenant/*.ts`

### 17.3 Tenancy, schema, and lifecycle evidence

- `server/src/lib/database-context.ts`
- `shared/contracts/rls-policy.md`
- `server/prisma/schema.prisma`
- `server/prisma/seed.ts`
- `server/src/__tests__/control-onboarding-outcome.integration.test.ts`

### 17.4 Frontend/runtime-family evidence

- `runtime/sessionRuntimeDescriptor.ts`
- `types.ts`
- `App.tsx`
- `layouts/Shells.tsx`
- `layouts/SuperAdminShell.tsx`

### 17.5 Governance and product-truth evidence

- `governance/control/OPEN-SET.md`
- `governance/control/NEXT-ACTION.md`
- `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
- `docs/product-truth/TEXQTIC-NEXT-DELIVERY-PLAN-v2.md`
- `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`
- `docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
- `docs/product-truth/B2C-OPERATING-MODE-DESIGN-v1.md`
- `docs/product-truth/ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md`
- `docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md`
- `docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md`
- `docs/product-truth/PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md`
- `docs/product-truth/IDENTITY-TENANCY-WORKSPACE-CONTINUITY-DESIGN-v1.md`
- `docs/product-truth/TEXQTIC-ONBOARDING-SYSTEM-DESIGN-v1.md`

### 17.6 Runtime cross-verification evidence

- live control-plane tenant registry page at `https://app.texqtic.com/`
- live page title: `Tenants | TexQtic Control Plane`
- live tenant registry counts observed in this pass: `444 total`, `6 active`, `438 closed`
- live active rows observed in this pass:
  - `QA B2B`
  - `QA B2C`
  - `QA WL`
  - `QA AGG`
  - `QA PEND`
  - `White Label Co`
