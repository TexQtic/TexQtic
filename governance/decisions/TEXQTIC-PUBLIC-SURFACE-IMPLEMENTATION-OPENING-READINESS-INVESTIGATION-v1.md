# TEXQTIC — Public-Surface Implementation-Opening Readiness Investigation v1

Decision ID: TEXQTIC-PUBLIC-SURFACE-IMPLEMENTATION-OPENING-READINESS-INVESTIGATION-v1
Status: DECIDED
Scope: Governance / public-surface / implementation-opening readiness investigation
Date: 2026-04-21
Authorized by: Paresh
Decision class: Bounded dependency-readiness investigation

## 1. Opening Target Candidates

The exact bounded opening candidates evaluated in this investigation are:

1. `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE`
   - implement the shared public entry resolution seam for slug, email, and host-based tenant targeting plus pre-auth realm launch only
2. `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE`
   - implement one governed public-safe publication and projection seam for lawful public objects only
3. `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE`
   - implement the shared public entry shell, brand-safe frame, public-safe navigation, and transition-launch layer only
4. `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE`
   - implement the lawful B2B public-safe discovery and inquiry-entry surface only
5. `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE`
   - implement the tenant-branded public browse-entry slice only

These candidates were evaluated because they are the smallest plausible public-surface implementation-opening classes still adjacent to the newly locked public-surface planning stack. This investigation does not reopen already-closed B2C seams or authorize implementation by implication.

## 2. Dependency / Support-Family Map

| Candidate | Material dependency / support families |
| --- | --- |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `PUBLIC_SHELL_TRANSITION_ARCHITECTURE`, `PUBLIC_ENTRY_RESOLUTION_CONTRACT`, `DOMAIN_TENANT_ROUTING_BRAND_SURFACE`, `RUNTIME_ROUTE_DOMAIN_SUPPORT`, `PUBLIC_TO_AUTHENTICATED_ENTRY_THRESHOLD` |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `VISIBILITY_AND_PROJECTION_MODEL`, `PUBLICATION_POSTURE_AND_ELIGIBILITY_GATES`, `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY`, `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT`, `PROFILE_COMPLETENESS_AND_BRAND_SAFE_FIELDS` |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_SHELL_TRANSITION_ARCHITECTURE`, `PUBLIC_ENTRY_RESOLUTION_CONTRACT`, `RUNTIME_ROUTE_DOMAIN_SUPPORT`, `PUBLIC_SAFE_NAVIGATION_AND_BRAND_FRAMING`, `PUBLIC_TO_AUTHENTICATED_TRANSITION_THRESHOLD`, `PILLAR_PUBLIC_SURFACE_CONSUMERS` |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `B2B_PUBLIC_DISCOVERY_BOUNDARY`, `VISIBILITY_AND_PROJECTION_MODEL`, `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT`, `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY`, `PUBLIC_ENTRY_TENANT_RESOLUTION`, `SHARED_PUBLIC_SHELL_TRANSITION`, `B2B_AUTHENTICATED_HANDOFF_THRESHOLD` |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `B2C_PUBLIC_BROWSE_BOUNDARY`, `B2C_LAUNCH_CONTINUITY_AND_CLOSED_SEAM_LINEAGE`, `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY`, `SHARED_PUBLIC_SHELL_REQUIREMENT_CONSUMPTION`, `TENANT_BRANDED_STOREFRONT_RUNTIME_ANCHORS` |

## 3. Required Readiness Threshold Per Family

| Candidate | Dependency / support family | Required readiness threshold |
| --- | --- | --- |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `PUBLIC_SHELL_TRANSITION_ARCHITECTURE` | design-planned with stable boundaries |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `PUBLIC_ENTRY_RESOLUTION_CONTRACT` | implementation-ready exact contract |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `DOMAIN_TENANT_ROUTING_BRAND_SURFACE` | normalized and bounded |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `RUNTIME_ROUTE_DOMAIN_SUPPORT` | implemented for currently supported paths |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `PUBLIC_TO_AUTHENTICATED_ENTRY_THRESHOLD` | opening-ready |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `VISIBILITY_AND_PROJECTION_MODEL` | design-planned with stable boundaries |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `PUBLICATION_POSTURE_AND_ELIGIBILITY_GATES` | normalized and bounded |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY` | normalized and bounded |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT` | implementation-ready exact source contract |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `PROFILE_COMPLETENESS_AND_BRAND_SAFE_FIELDS` | opening-ready |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_SHELL_TRANSITION_ARCHITECTURE` | design-planned with stable boundaries |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_ENTRY_RESOLUTION_CONTRACT` | implementation-ready exact contract |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `RUNTIME_ROUTE_DOMAIN_SUPPORT` | implemented for currently supported paths |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_SAFE_NAVIGATION_AND_BRAND_FRAMING` | implementation-ready exact boundary |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_TO_AUTHENTICATED_TRANSITION_THRESHOLD` | implementation-ready exact handoff rules |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PILLAR_PUBLIC_SURFACE_CONSUMERS` | opening-ready |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `B2B_PUBLIC_DISCOVERY_BOUNDARY` | design-planned with stable boundaries |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `VISIBILITY_AND_PROJECTION_MODEL` | design-planned with stable boundaries |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT` | implementation-ready exact public-safe B2B object contract |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY` | normalized and bounded |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `PUBLIC_ENTRY_TENANT_RESOLUTION` | opening-ready |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `SHARED_PUBLIC_SHELL_TRANSITION` | opening-ready |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `B2B_AUTHENTICATED_HANDOFF_THRESHOLD` | opening-ready |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `B2C_PUBLIC_BROWSE_BOUNDARY` | design-planned with stable boundaries |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `B2C_LAUNCH_CONTINUITY_AND_CLOSED_SEAM_LINEAGE` | opening-ready live target posture |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY` | normalized and bounded |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `SHARED_PUBLIC_SHELL_REQUIREMENT_CONSUMPTION` | design-planned with stable boundaries |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `TENANT_BRANDED_STOREFRONT_RUNTIME_ANCHORS` | implemented |

## 4. Current Readiness Per Family

| Candidate | Dependency / support family | Current readiness | Repo-truth basis |
| --- | --- | --- | --- |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `PUBLIC_SHELL_TRANSITION_ARCHITECTURE` | design-planned with stable boundaries | locked by `TEXQTIC-PUBLIC-SHELL-AND-TRANSITION-ARCHITECTURE-DECISION-v1` |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `PUBLIC_ENTRY_RESOLUTION_CONTRACT` | design-direction only; not implementation-ready | shell decision still defers exact contract shape, host/slug/email rules, and client/server ownership; `publicEntryKind` remains a pre-session design direction rather than a current implementation contract |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `DOMAIN_TENANT_ROUTING_BRAND_SURFACE` | normalized and bounded | family design anchor explicitly preserves tenant resolution and brand-surface continuity as a separate cross-cutting family |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `RUNTIME_ROUTE_DOMAIN_SUPPORT` | implemented but partial-scope | `/api/public/tenants/resolve`, `/api/public/tenants/by-email`, `/api/internal/resolve-domain`, and `realmGuard` public mapping exist; `G-026` remains partially pending beyond the current supported paths |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `PUBLIC_TO_AUTHENTICATED_ENTRY_THRESHOLD` | not opening-ready | `GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING` still preserves public-to-authenticated activation and owner-ready transition as unresolved |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `VISIBILITY_AND_PROJECTION_MODEL` | design-planned with stable boundaries | locked by `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1` |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `PUBLICATION_POSTURE_AND_ELIGIBILITY_GATES` | bounded at planning level only | publication posture, profile completeness, and object eligibility are fixed as governance rules, but no exact implementation child is open or reduced for this lane |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY` | normalized and bounded | family design anchor separates shared discoverability data from B2B, B2C, Aggregator, and WL ownership |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT` | not implementation-ready | current repo truth does not yet isolate one exact public-safe object source contract and field inventory for a first public projection implementation opening |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `PROFILE_COMPLETENESS_AND_BRAND_SAFE_FIELDS` | not opening-ready | visibility decision preserves profile-completeness and public-safe field rules, but not yet as one exact live implementation seam |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_SHELL_TRANSITION_ARCHITECTURE` | design-planned with stable boundaries | locked by `TEXQTIC-PUBLIC-SHELL-AND-TRANSITION-ARCHITECTURE-DECISION-v1` |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_ENTRY_RESOLUTION_CONTRACT` | design-direction only; not implementation-ready | same unresolved contract seam as the entry/tenant-resolution candidate |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `RUNTIME_ROUTE_DOMAIN_SUPPORT` | implemented but partial-scope | current repo has route and resolution primitives, but not one implementation-ready public-entry contract |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_SAFE_NAVIGATION_AND_BRAND_FRAMING` | planning-only | shell decision fixes ownership, but does not define one exact implementation boundary for public-safe navigation and brand framing |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PUBLIC_TO_AUTHENTICATED_TRANSITION_THRESHOLD` | unresolved | public-facing runtime requirements still preserve the cross-surface transition requirement as unresolved planning truth |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `PILLAR_PUBLIC_SURFACE_CONSUMERS` | asymmetrical and not opening-ready | B2C has one real bounded public seam already closed, B2B public browse is intentionally excluded, and Aggregator public directory exposure is intentionally excluded |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `B2B_PUBLIC_DISCOVERY_BOUNDARY` | design-planned with stable boundaries | locked by `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `VISIBILITY_AND_PROJECTION_MODEL` | design-planned with stable boundaries | locked visibility and projection decision exists |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT` | not implementation-ready | no exact B2B public-safe object source contract has been reduced into a first implementation child |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY` | normalized and bounded | catalog/discovery family anchor exists |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `PUBLIC_ENTRY_TENANT_RESOLUTION` | partial support only | current public tenant discovery and login entry are real, but the unified pre-session public-entry contract is still not exact |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `SHARED_PUBLIC_SHELL_TRANSITION` | planning-only | shared shell architecture is locked, not implemented |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `B2B_AUTHENTICATED_HANDOFF_THRESHOLD` | planning-only | B2B public boundary preserves inquiry/RFQ-intent ownership lines, but not one exact current handoff implementation contract |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `B2C_PUBLIC_BROWSE_BOUNDARY` | design-planned with stable boundaries and already consumed by prior seam work | locked by `TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1` plus the earlier B2C seam chain |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `B2C_LAUNCH_CONTINUITY_AND_CLOSED_SEAM_LINEAGE` | closed exact browse-entry seam; not a live target | `GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING` preserves the public B2C browse-entry seam as solved and closed rather than openable again |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `CATALOG_DISCOVERY_PRODUCT_DATA_CONTINUITY` | normalized and bounded with real runtime evidence | B2C launch continuity preserves real catalog-backed browse preview and backend transport support |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `SHARED_PUBLIC_SHELL_REQUIREMENT_CONSUMPTION` | preserved separately | public-facing runtime requirements and shell decision explicitly keep the shared public shell separate from the already-closed B2C browse-entry seam |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `TENANT_BRANDED_STOREFRONT_RUNTIME_ANCHORS` | implemented | B2C storefront path, `B2CShell`, and real catalog-backed browse preview exist in current runtime truth |

## 5. Pass / Fail Result Per Candidate

| Candidate | Result | First failing dependency / support family | Reason |
| --- | --- | --- | --- |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | `FAIL` | `PUBLIC_ENTRY_RESOLUTION_CONTRACT` | current repo truth has resolution primitives but not one implementation-ready pre-session public-entry contract |
| `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` | `FAIL` | `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT` | the visibility model is locked, but no exact first public-safe projection child has been reduced into an implementation-ready contract |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | `FAIL` | `PUBLIC_ENTRY_RESOLUTION_CONTRACT` | the shell architecture is locked, but the contract it must consume is still design-only |
| `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` | `FAIL` | `PUBLIC_SAFE_OBJECT_SOURCE_CONTRACT` | no exact public-safe B2B object contract is implementation-ready, and current truth still excludes anonymous B2B marketplace depth |
| `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` | `FAIL` | `B2C_LAUNCH_CONTINUITY_AND_CLOSED_SEAM_LINEAGE` | the exact public browse-entry seam is already closed and therefore is not a lawful first new opening target |

## 6. Root-Cause Readiness Trace

### A. Nearest plausible opening path

The nearest plausible opening path is not B2B public discovery or shared shell implementation. It is the smaller `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE`, because current repo truth already preserves:

- one shared public shell and transition architecture
- a normalized domain / tenant routing / brand-surface family
- real public resolution primitives for slug, email, and host-based resolution

### B. First failing family

That candidate fails first at `PUBLIC_ENTRY_RESOLUTION_CONTRACT`.

The pass chain is:

1. `PUBLIC_SHELL_TRANSITION_ARCHITECTURE` passes at planning-boundary level.
2. `DOMAIN_TENANT_ROUTING_BRAND_SURFACE` passes at family-boundary level.
3. `RUNTIME_ROUTE_DOMAIN_SUPPORT` passes for current primitive support.
4. `PUBLIC_ENTRY_RESOLUTION_CONTRACT` fails because the repo still lacks one exact implementation-ready contract seam.

### C. Missing chain elements behind the first failure

The missing chain elements are:

1. one exact pre-session public-entry contract that converts the locked planning boundary into a live implementation seam
2. one exact statement of host, slug, and email resolution ownership across edge, server, and client
3. one exact handoff boundary from public entry into authenticated session routing and owner-ready activation continuity

### D. Deepest root blocker

The deepest root blocker is:

`NO_BOUNDED_PUBLIC_ENTRY_RESOLUTION_CONTRACT_UNIT_EXISTS_YET`

Repo-truth basis:

- the shell decision explicitly defers exact contract shape, host/slug/email rules, and client/server ownership to a later bounded unit
- the canonical mode/capability schema design preserves `publicEntryKind` and `PublicEntryResolutionDescriptor` only as a recommended pre-session direction, while explicitly deferring exact surfacing and handoff decisions
- public-facing runtime requirements still preserve the public-to-authenticated activation and owner-ready transition as unresolved

### E. Convergence across the failed candidates

- `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` fails one hop later on the same unresolved public-entry contract seam.
- `B2B_PUBLIC_SAFE_DISCOVERY_SURFACE_IMPLEMENTATION_SLICE` fails earlier on public-safe object-contract exactness, but it still cannot become the first opening while the shared public-entry contract remains unresolved for the new public-surface architecture lane.
- `PUBLIC_SAFE_PROJECTION_PUBLICATION_IMPLEMENTATION_SLICE` lacks its own exact source-contract child, but it is not the minimum next move because the new lane's shared public-entry architecture still lacks the implementation-ready contract every cross-surface entry opening would need.
- `B2C_PUBLIC_BROWSE_ENTRY_CONTINUITY_IMPLEMENTATION_SLICE` is stale as a first-opening candidate because the exact public browse-entry seam is already closed and must not be reopened by implication.

## 7. Minimum Bounded Next Move

The one exact lawful next move is:

`BOUNDED_PUBLIC_ENTRY_RESOLUTION_CONTRACT_DESIGN`

Exact scope of that next move:

- define the exact pre-session public-entry resolution contract
- define the lawful host, slug, and email resolution rules inside that contract
- define edge, server, and client ownership boundaries for resolution and handoff
- define the exact public-entry-to-authenticated-session boundary without widening into implementation, auth redesign, or public-shell implementation

## 8. Why This Is The Lawful Non-Drift Step

This is the lawful non-drift step because it is the first shared dependency that fails for the nearest plausible public-surface implementation openings, while also preserving the already-closed B2C public seam, the current exclusion of anonymous B2B marketplace depth, and the shell decision's explicit rule that public entry remains an entry-resolution concern until a later bounded contract unit makes implementation exact.

## 9. Decision Result

`NO_PUBLIC_SURFACE_IMPLEMENTATION_OPENING_IS_LAWFUL_NOW`

`ONE_PRE_OPENING_BOUNDED_UNIT_IS_REQUIRED_FIRST`

That required unit is `BOUNDED_PUBLIC_ENTRY_RESOLUTION_CONTRACT_DESIGN`.
