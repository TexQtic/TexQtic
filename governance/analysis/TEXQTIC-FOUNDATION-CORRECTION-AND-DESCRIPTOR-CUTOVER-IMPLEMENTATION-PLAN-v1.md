# TEXQTIC - Foundation Correction And Descriptor Cutover Implementation Plan v1

Status: Implementation planning only
Date: 2026-04-08
Basis: Repo truth, code-path truth, accepted planning direction from [TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md](../../TEXQTIC-CANONICAL-OPERATING-MODE-AND-CAPABILITY-ROUTING-MIGRATION-PLAN-v1.md), binding schema inputs from [TEXQTIC-CANONICAL-MODE-TYPE-AND-CAPABILITY-SCHEMA-DESIGN-v1.md](TEXQTIC-CANONICAL-MODE-TYPE-AND-CAPABILITY-SCHEMA-DESIGN-v1.md), and binding route-manifest inputs from [TEXQTIC-CANONICAL-ROUTE-MANIFEST-DESIGN-v1.md](TEXQTIC-CANONICAL-ROUTE-MANIFEST-DESIGN-v1.md)
Evidence rule: No governance documents used as evidence for runtime claims in this artifact
Implementation scope: None

## 1. Purpose And Cutover Objective

This artifact defines the safest implementation sequence for correcting current frontend routing foundations and cutting authenticated runtime authority over to the canonical descriptor model.

The objective is precise:

- remove current frontend-composed runtime authority
- replace it with one authority path only
- avoid prolonged double-truth coexistence during login, restore, refresh, and impersonation flows
- preserve current feature panels and shell content reuse as much as possible while routing authority changes underneath them

The target routing chain is:

`backend-authenticated fields -> SessionRuntimeDescriptor -> routeManifestKey -> shell and route-family selection`

After cutover, client state may still choose in-surface navigation, but it may not decide:

- runtime family
- overlay eligibility
- shell family
- manifest family

## 2. Binding Inputs And Non-Negotiable Constraints

The following prior decisions are binding for this plan:

- `SessionRuntimeDescriptor` is the sole authenticated routing authority.
- `operatingMode` is the canonical runtime-family selector.
- `WL_ADMIN` is an overlay, not a base operating mode.
- `publicEntryKind` remains a pre-session concern and is not part of authenticated session-family selection in the leading design.
- unknown or incomplete identity is a hard-stop condition and may not silently fall back into any family
- route-manifest selection must derive from canonical descriptor truth only

The following repo-grounded constraints are also binding:

- current login and tenant restore flows still call `applyTenantBootstrapState` before canonical `/api/me` reconciliation
- current restore flow can build a provisional tenant from JWT claims and persisted hint data via `buildBootstrapTenantStub`
- current impersonation restore can recover routing from persisted impersonation tenant state
- current shell resolution still depends on `currentTenant.tenant_category ?? currentTenant.type` plus `currentTenant.is_white_label`
- current white-label forcing still exists through slug and name heuristics

Non-negotiable implementation rules for the cutover:

- no slug, name, plan tier, local storage hint, JWT claim, or bootstrap stub may choose runtime family
- no legacy and canonical routing systems may both decide family selection in the same render path
- temporary comparison logic is allowed only as passive assertion or telemetry and may never control rendering
- provisioning-pending behavior may remain a distinct blocked state, but it may not re-authorize provisional family selection
- this implementation plan does not reopen schema or route-manifest decisions

## 3. Current-State Foundation Defects To Correct First

The following defects are foundational because they manufacture or preserve client-side routing authority before the canonical descriptor exists.

### 3.1 White-Label Forcing Through Slug And Name

`WL_REPO_TRUTH_SLUGS`, `WL_REPO_TRUTH_NAMES`, and `resolveRepoTruthTenantHint` allow slug and name matching to force `is_white_label`.

Why this is a foundation defect:

- it treats display or entry identifiers as routing authority
- it can influence bootstrap state and normalization before canonical backend identity is confirmed
- it directly violates the accepted double-truth prevention rules

### 3.2 Persisted Tenant Identity Hints Participate In Routing

`persistTenantIdentityHint`, `readStoredTenantIdentityHints`, and `normalizeTenantIdentity` currently preserve and reuse routing-relevant fields such as `tenant_category`, `type`, `plan`, and `is_white_label`.

Why this is a foundation defect:

- local storage becomes a second routing authority
- stale identity can survive across account, tenant, or environment changes
- the restore path can recover family choice without canonical backend confirmation

### 3.3 Bootstrap Stub Invents Runtime Family Inputs

`resolveBootstrapTenantType` and `buildBootstrapTenantStub` can manufacture a tenant family from partial seeds, persisted hints, and white-label heuristics. The fallback rule `isWhiteLabel ? B2B : AGGREGATOR` is especially high-risk because it creates a runtime-family decision where backend truth is missing.

Why this is a foundation defect:

- JWT presence is being upgraded into family authority
- incomplete identity becomes a guessed family rather than a blocked state
- login and restore can enter `EXPERIENCE` or `WL_ADMIN` before canonical session truth resolves

### 3.4 Login And Restore Apply Family State Before Canonical Reconciliation

Both `handleAuthSuccess` and tenant restore can call `applyTenantBootstrapState` and set `appState` to `EXPERIENCE` or `WL_ADMIN` before canonical `/api/me` data completes.

Why this is a foundation defect:

- first authenticated render can occur before canonical descriptor truth exists
- later canonical fetch becomes a reconciliation pass instead of the sole authority source
- route choice and shell choice can briefly diverge from canonical identity

### 3.5 Impersonation Restore Trusts Stored Tenant Snapshot

Impersonation restore currently uses persisted impersonation tenant data as a bootstrap fallback and can route into tenant shells before fresh canonical descriptor resolution completes.

Why this is a foundation defect:

- stored impersonation tenant state can outlive backend session changes
- impersonation refresh becomes partially client-authored
- exit and recovery logic becomes more fragile if the stored tenant snapshot is stale

### 3.6 Shell Resolution Still Consumes Legacy Tenant Fields Directly

`resolveExperienceShell` currently reads `currentTenant.tenant_category ?? currentTenant.type` and `currentTenant.is_white_label` directly from the tenant object rather than from a canonical descriptor and manifest-selection step.

Why this is a foundation defect:

- shell resolution remains coupled to mutable tenant object shape
- `type` remains a compatibility fallback in a routing-critical branch
- the route-manifest cutover boundary does not yet exist

### 3.7 App State Still Encodes Runtime Family Authority

`CONTROL_PLANE`, `EXPERIENCE`, and `WL_ADMIN` are still operating as runtime-family choices rather than as the consequence of descriptor resolution.

Why this is a foundation defect:

- `App.tsx` remains the policy center for family selection
- descriptor and manifest adoption would otherwise sit beside, rather than replace, existing authority
- legacy app state would continue to prolong dual routing truth

## 4. Cutover Principles

The implementation must follow these principles in order.

1. Correct identity authority before expanding route-manifest usage.
2. Treat token presence as proof of session presence only, not proof of runtime family.
3. Resolve authenticated runtime through one path only: backend fields to descriptor to manifest.
4. Replace guessed family selection with either explicit resolving state or explicit blocked state.
5. Allow passive comparison instrumentation only if it cannot influence rendering.
6. Keep existing content panels reusable where possible, but strip them of family-selection authority.
7. Move overlay eligibility behind canonical descriptor and capability rules before broader route extraction.
8. Fail closed on mismatch, incompleteness, or capability conflict.

## 5. Cutover Readiness Criteria

Implementation should not begin until the following are true.

### 5.1 Contract Readiness

- the canonical schema artifact is accepted as binding
- the route-manifest design artifact is accepted as binding
- the first implementation slice is explicitly limited to foundation correction plus descriptor entry cutover, not full route decomposition

### 5.2 Payload Readiness

- tenant login payload and `/api/me` are confirmed to carry the backend-owned fields needed to derive the canonical descriptor in the temporary adapter state
- control-plane identity resolution is confirmed to provide enough information for direct `CONTROL_PLANE` descriptor creation
- impersonation bootstrap is confirmed to have a trustworthy server-backed path to canonical tenant identity after token switch

### 5.3 UX Readiness

- a resolving state is defined for authenticated session bootstrap
- a blocked state is defined for unknown identity, capability mismatch, and descriptor inconsistency
- provisioning-pending remains an explicit blocked state and is not treated as a valid family render

### 5.4 Verification Readiness

- a matrix exists for control-plane, aggregator, B2B workspace, B2C storefront, WL storefront, and WL admin overlay cases
- negative cases are named in advance for stale local hints, missing category, overlay mismatch, and impersonation tenant mismatch
- implementation-time proof does not depend on a dual-authority feature flag

## 6. Implementation-Sequencing Options

| Option | Sequence | Advantages | Risks | Decision |
| --- | --- | --- | --- | --- |
| A | Manifest-first inside current bootstrap system | Fastest visible shell swap | Preserves provisional routing authority, leaves stub logic alive, prolongs double truth | Reject |
| B | Foundation correction first, then descriptor cutover, then manifest adoption | Isolates authority risk, shortens mixed-truth window, keeps route content reusable | Requires explicit resolving and blocked states before shell render | Recommend |
| C | Full big-bang descriptor, manifest, and route decomposition | One migration event | Highest blast radius across login, restore, impersonation, and route rendering | Reject |

Option B is the recommended sequence because the dominant risk is not panel rendering. The dominant risk is family authority being decided twice.

## 7. Recommended Implementation Sequence

The recommended sequence is five phases. The important property is that base family authority flips once and stays flipped.

### Phase 1 - Foundation Correction

Objective: remove client-side routing authority that currently exists before canonical descriptor resolution.

Required changes in this phase:

- remove slug and name based white-label forcing from runtime identity resolution
- stop persisted tenant hints from participating in routing-critical fields
- stop `buildBootstrapTenantStub` from manufacturing family authority
- stop restore and login flows from entering `EXPERIENCE` or `WL_ADMIN` before canonical descriptor resolution
- demote JWT claims and stored impersonation tenant details to verification aids only

Deliverable of this phase:

- the app can still show resolving or blocked states, but it can no longer guess a family

### Phase 2 - Descriptor Establishment Layer

Objective: introduce one pure descriptor adapter path from backend fields only.

Required changes in this phase:

- create a pure `SessionRuntimeDescriptor` adapter from authenticated backend fields only
- create a pure selector from descriptor to `routeManifestKey`
- create one boundary function for authenticated runtime resolution that every entry flow must call
- keep descriptor derivation separate from UI rendering and local storage persistence

Deliverable of this phase:

- one runtime-resolution API exists for login, restore, refresh, impersonation entry, and impersonation restore

### Phase 3 - Entry-Flow Cutover

Objective: move every authenticated entry path onto the descriptor boundary.

Required changes in this phase:

- tenant login routes only through descriptor resolution
- tenant restore and refresh route only through descriptor resolution after canonical backend fetch
- impersonation entry routes only through descriptor resolution after impersonation token swap and canonical backend fetch
- impersonation restore routes only through descriptor resolution and tenant-id verification
- impersonation exit routes only through control-plane descriptor restoration

Deliverable of this phase:

- every authenticated shell render is downstream of descriptor resolution

### Phase 4 - Manifest-Backed Family Selection

Objective: replace `appState` family authority and direct shell branching with descriptor and manifest selection while reusing current content branches where practical.

Required changes in this phase:

- replace direct family shell resolution with manifest-driven shell selection
- treat `expView`, `adminView`, and WL admin section state as in-family route state only
- keep current feature panels mapped to manifest route groups until later extraction work

Deliverable of this phase:

- `App.tsx` no longer decides family directly

### Phase 5 - Legacy Authority Removal

Objective: delete the compatibility logic that would otherwise preserve double truth.

Required changes in this phase:

- remove dead bootstrap helpers and legacy routing fallbacks
- remove direct `currentTenant.type` fallback from shell authority
- remove old local storage routing dependencies
- remove dead branches that still set family choice through legacy `appState`

Deliverable of this phase:

- the codebase contains only one family-selection system

## 8. Login, Restore, Refresh, And Impersonation Cutover Map

The table below defines the required behavior for each flow at cutover.

| Flow | Current repo-truth authority leak | Required cutover behavior | Fail-closed action |
| --- | --- | --- | --- |
| Tenant login | provisional tenant stub and `applyTenantBootstrapState` can select family before canonical `/api/me` completes | after login success, build descriptor from backend-owned login fields only if complete enough; otherwise remain resolving until canonical `/api/me` completes; render family only after descriptor and manifest resolve | clear tenant session on auth failure; show blocked state on authenticated-but-incomplete identity |
| Tenant restore | JWT claims and persisted hints can build a provisional tenant and select family before canonical fetch | token presence enters resolving only; `/api/me` must produce descriptor before any family render; no stub family selection | clear tenant session on invalid token; blocked state on canonical inconsistency; provisioning-pending remains blocked, not routed |
| Browser refresh in tenant realm | same as restore; stored realm plus stored token can re-enter family indirectly | refresh follows tenant restore rules exactly; no separate shortcut path | same as tenant restore |
| Impersonation entry | control-plane flow stores target tenant snapshot and can bootstrap family from tenant object after token swap | after impersonation token is installed, fetch canonical tenant identity under impersonated token, verify tenant id matches intended target, then derive descriptor and manifest | stop impersonation session, clear impersonation state, and restore control-plane state if descriptor resolution fails |
| Impersonation restore | persisted impersonation tenant snapshot can influence routing before fresh canonical fetch | persisted impersonation state may retain only verification data such as admin id, impersonation id, target tenant id, token, and expiry; canonical family must come from fresh backend fetch | clear impersonation state; restore control plane if possible; otherwise fail to auth |
| Impersonation exit | app can jump directly to `CONTROL_PLANE` state after clearing tenant override | exit flow must clear impersonation token, stop server session, resolve control-plane descriptor, and then render control-plane manifest only after identity is valid | if control-plane identity cannot be restored, clear admin state and return to auth |
| Control-plane to tenant transition | tenant selection intent exists before canonical tenant descriptor exists | control-plane selection may identify the target tenant, but tenant family render may not occur until impersonated descriptor resolves | revert to control plane on mismatch or failed tenant descriptor resolution |

### 8.1 Login-Specific Planning Rule

Login is the one place where fast first paint may still be preserved without violating canonical authority, but only if the backend login payload already carries the exact fields needed for descriptor derivation. If it does not, login must stay in resolving state until `/api/me` completes.

### 8.2 Restore-And-Refresh Planning Rule

Restore and refresh may not use JWT claim decoding, stored hints, or stub construction to guess tenant family. These flows must accept the latency cost of canonical resolution rather than preserve incorrect early shell entry.

### 8.3 Impersonation Planning Rule

Persisted impersonation data may prove intended target and administrative continuity, but it may not prove runtime family. Impersonation family is always re-derived from canonical backend truth after token switch.

## 9. Unknown-Identity Gate Implementation-Planning Rules

The unknown-identity gate must exist before the descriptor cutover is considered complete.

Rules:

1. No authenticated tenant family may render unless `realm`, `tenantId`, `tenantCategory`, `whiteLabelCapability`, `operatingMode`, and `routeManifestKey` are internally consistent.
2. No control-plane family may render unless control-plane identity resolves cleanly enough to produce `CONTROL_PLANE` plus `control_plane` manifest selection.
3. `runtimeOverlays` may not activate unless the base operating mode and required surface capabilities are already valid.
4. Missing or conflicting identity must render an explicit blocked state, not a fallback shell.
5. JWT claims, stored hints, stored impersonation tenant details, slug, and name may be displayed for diagnostics if needed, but they may never be accepted as routing authority.
6. Provisioning-pending is distinct from unknown identity. It is a blocked session state with no family render.

Planning implication:

- the implementation should introduce explicit bootstrap states such as resolving and blocked before family cutover, because removing stub authority without replacement would otherwise create ambiguous empty screens

## 10. Legacy-Authority Removal Plan

The following constructs must lose routing authority in the implementation sequence and should be deleted once replacement is live.

### 10.1 Remove Immediately From Routing Authority

- `WL_REPO_TRUTH_SLUGS`
- `WL_REPO_TRUTH_NAMES`
- `resolveRepoTruthTenantHint`
- routing-critical reads from `readStoredTenantIdentityHints`
- routing-critical writes through `persistTenantIdentityHint`
- `resolveBootstrapTenantType`
- `buildBootstrapTenantStub`
- direct fallback to `currentTenant.type` for shell choice

### 10.2 Demote To Verification Or Temporary Compatibility Only

- stored tenant JWT claims
- stored impersonation tenant details
- current `expView`, `adminView`, and WL admin section state

Demotion rule:

- these may temporarily help verify consistency or preserve in-family navigation, but they may not select runtime family after descriptor cutover begins

### 10.3 Delete After Cutover Boundary Holds

- legacy app-state branches whose only purpose is family authority
- dead helper types used only for bootstrap identity manufacture
- compatibility code that exists only to reconcile descriptor output back into legacy family logic

## 11. Descriptor Cutover Boundary

The descriptor cutover boundary is the exact point after authenticated session presence is established and before any authenticated shell renders.

Inputs into the boundary may include:

- backend login payload
- canonical `/api/me` response
- control-plane identity response
- impersonation session response and verification metadata

Outputs from the boundary may include only:

- `SessionRuntimeDescriptor`
- `routeManifestKey`
- resolving state
- blocked state

Not allowed to cross the boundary as routing authority:

- `currentTenant.type`
- slug-derived white-label assumptions
- persisted tenant hints
- bootstrap stub values
- legacy `appState` family defaults

Practical meaning of the boundary:

- once the boundary is introduced, `App.tsx` may still host content composition, but family selection must already be decided before `renderExperienceContent`, WL admin content, or control-plane content is chosen
- `currentTenant` becomes contextual data for already-selected families rather than the object that decides the family

## 12. Implementation Risk Map

| Risk | Where it appears | Impact | Mitigation in recommended sequence |
| --- | --- | --- | --- |
| Restore feels slower | tenant restore and refresh | delayed first paint compared with provisional shell bootstrap | accept resolving state and avoid guessed family authority |
| WL admin overlay regresses | login, restore, impersonation entry | white-label admins may lose overlay entry or be misrouted | derive overlay eligibility only after canonical descriptor plus authenticated role validation |
| Impersonation race or mismatch | impersonation entry and restore | admin can land in wrong tenant shell or stale tenant shell | verify target tenant id after token switch and fail back to control plane |
| Stale local storage survives | tenant restore and cross-session use | stale data can keep influencing runtime if reads remain | cut local storage out of routing authority in Phase 1 |
| Provisioning-pending behavior regresses | login and restore | users may see auth loop or misclassified error | preserve provisioning-pending as explicit blocked state with no shell render |
| Route-group mapping mistakes | manifest adoption phase | content can disappear or land in wrong in-family route | keep current panels but remap them under explicit manifest groups before deeper extraction |
| Control-plane exit path regresses | impersonation exit | admin session can be lost or control-plane shell can mount without identity | restore control-plane descriptor explicitly before control-plane render |
| Current storefronts remain tenant-authenticated | B2C and WL surfaces | implementers may accidentally mix public-entry work into authenticated cutover | keep `publicEntryKind` separation out of this slice and do not broaden scope |

## 13. Verification Strategy

Verification must prove the authority change, not just visual rendering.

### 13.1 Descriptor And Manifest Unit Matrix

Add pure tests for the descriptor adapter and manifest selector covering:

- control plane
- aggregator workspace
- B2B workspace
- B2C storefront
- WL storefront
- WL admin overlay
- unknown identity
- capability mismatch

### 13.2 Flow Validation Matrix

Add focused flow validation for:

- tenant login with complete backend identity
- tenant login with incomplete backend identity
- tenant restore with valid token and canonical descriptor
- tenant restore with stale local storage hints that must be ignored
- impersonation entry success
- impersonation entry tenant mismatch failure
- impersonation refresh success
- impersonation exit back to control plane

### 13.3 Negative Authority Proofs

Explicitly prove that the following no longer influence family selection:

- slug-only white-label detection
- name-only white-label detection
- persisted `tenant_category`
- persisted `is_white_label`
- JWT-only tenant classification
- `currentTenant.type` fallback when `tenantCategory` is missing

### 13.4 Manual Runtime Proof

For implementation acceptance, capture focused runtime proof that each session entry path either:

- resolves into the expected descriptor and family
- or stops in an explicit blocked state

No acceptance proof should rely on a temporary feature flag that allows legacy family selection to remain available.

## 14. App.tsx Responsibility Reduction Plan

The cutover should reduce `App.tsx` in stages instead of requiring an immediate full rewrite.

### 14.1 Responsibilities To Remove First

- identity manufacture through hint normalization and stub construction
- direct family choice through legacy `appState`
- direct shell policy from tenant object shape
- overlay entry decisions outside descriptor and capability rules

### 14.2 Responsibilities To Retain Temporarily

- top-level session orchestration
- top-level resolving and blocked state rendering
- composition of already-selected family content
- in-family route state while manifest groups are still mapped onto existing panels

### 14.3 Target Intermediate Shape

After Phases 1 through 4, `App.tsx` should be reduced to:

- session boot orchestration
- descriptor resolution handoff
- manifest selection handoff
- shell mount for the selected family
- local in-family navigation state only

At that point, `renderExperienceContent`, WL admin content, and admin content can still exist, but they will no longer be family-selection authorities.

## 15. Exit Criteria For Beginning Implementation

Implementation may begin once all of the following are explicitly accepted.

1. Option B is accepted as the sequencing strategy.
2. The first implementation slice is limited to foundation correction plus descriptor entry cutover.
3. Unknown-identity and provisioning-pending blocked states are accepted as mandatory behavior.
4. The implementation does not preserve slug, name, local storage, JWT, or bootstrap stub authority for family selection.
5. The implementation does not preserve simultaneous legacy family authority and descriptor family authority.
6. The verification plan includes negative authority proofs, not only happy-path shell rendering.
7. `publicEntryKind` separation remains out of scope for this slice unless explicitly reopened in a later task.

If those criteria are accepted, the next implementation pass should open with Phase 1 foundation correction and should not attempt full route decomposition in the same change set.