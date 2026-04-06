# GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING

Decision ID: GOV-DEC-PUBLIC-FACING-RUNTIME-REQUIREMENTS-PLANNING
Title: Preserve one bounded planning truth for TexQtic public-facing runtime requirements
Status: DECIDED
Date: 2026-04-06
Authorized by: Paresh

## Context

TexQtic's current authoritative governance and product-truth state records that:

- Layer 0 is back in zero-open product-facing posture after `GOV-DEC-AGGREGATOR-DISCOVERY-CLOSE`
- `GOV-DEC-NEXT-CANDIDATE-SELECTION-POST-AGGREGATOR` returned `STRONGEST_FAMILY_IDENTIFIED_BUT_CHILD_NOT_YET_EXACT`
- the strongest preserved later-ready family remainder is still `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`, but the next exact child has not yet been named
- current public-facing runtime truth is already distributed across multiple valid authorities rather than one preserved planning decision:
  - `TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`
  - `TEXQTIC-LAUNCH-SCOPE-DECISION-RECORD-v1.md`
  - `B2C-LAUNCH-CONTINUITY-ARTIFACT-v1.md`
  - `B2C-OPERATING-MODE-DESIGN-v1.md`
  - `B2C-TENANT-BRANDED-COMMERCE-POST-SEAM-RECONCILIATION-v1.md`
  - `B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`
  - `DOMAIN-TENANT-ROUTING-BRAND-SURFACE-MANAGEMENT-DESIGN-v1.md`
  - `AGGREGATOR-IMPLEMENTATION-DESIGN-v1.md`
  - `TEXQTIC-ONBOARDING-PROVISIONING-HANDOFF-DESIGN-v1.md`
- prior closed public-surface units proved exact seams only and did not create shared public-shell/navbar authority by implication
- the closed Aggregator runtime and verification-support units remained tenant-authenticated and explicitly excluded public-shell, auth, and navigation change

The current question is planning only: whether one bounded decision can now preserve the public-facing runtime requirements TexQtic already needs so later B2C reduction, B2B/public-entry planning, Aggregator/public-surface work, and candidate selection do not proceed from stale or partial assumptions.

## Required Determinations

### A. Public-facing surface inventory

| Surface | Runtime purpose | Target user class | Public/auth posture | Shared public shell/navbar dependency | Current planning coverage | Result |
| --- | --- | --- | --- | --- | --- | --- |
| Public tenant discovery and realm-safe login entry | Resolve the correct tenant/brand context and route the user into the correct authenticated realm | Anonymous visitors, returning tenant users, first owners | `ANONYMOUS_TO_AUTHENTICATED_ENTRY` | `YES` | `LR-001`, domain/routing family | `SOLVED` |
| Shared public landing / branded entry layer | Host lawful public-safe entry, route-context continuity, and truthful pre-auth navigation before a family-specific surface takes over | Anonymous visitors and pre-login returning users | `ANONYMOUS_OR_SEMI_PUBLIC` | `YES` | domain/routing family only; no preserved standalone decision yet | `UNRESOLVED` |
| Public-facing B2C browse-entry storefront seam | Present tenant-branded public-safe consumer browse entry on the reviewed non-WL B2C path | Anonymous and pre-login consumer users | `PUBLIC_SAFE_ANONYMOUS` | `YES` | `B2C-LAUNCH-CONTINUITY-ARTIFACT-v1.md` plus the closed B2C seam units | `SOLVED` |
| B2C authenticated continuity after public entry | Carry a user from lawful public B2C entry into tenant-scoped authenticated consumer-commerce continuity | Activated and returning B2C users | `AUTHENTICATED_ENTRY` | `PARTIAL` | `B2C-OPERATING-MODE-DESIGN-v1.md`; no exact current child selected | `UNRESOLVED` |
| B2B public-facing browse/discovery marketplace surface | Anonymous public browsing of the B2B exchange as if TexQtic were an open marketplace | Anonymous public visitors | `PUBLIC_MARKETPLACE` | `WOULD_BE_REQUIRED_IF_ALLOWED` | `B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`, `LR-001` exclusions | `INTENTIONALLY_EXCLUDED` |
| B2B authenticated business exchange entry | Place authenticated business users into the governed B2B exchange loop after lawful entry | Activated B2B buyers and suppliers | `AUTHENTICATED_ENTRY` | `PARTIAL` | `B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md`, launch scope/readiness | `SOLVED` |
| Aggregator public directory/discovery exposure | Anonymous public discovery of counterparties through Aggregator as a public directory | Anonymous public visitors | `PUBLIC_DIRECTORY` | `WOULD_BE_REQUIRED_IF_ALLOWED` | `AGGREGATOR-IMPLEMENTATION-DESIGN-v1.md`, Aggregator design-gate truth | `INTENTIONALLY_EXCLUDED` |
| Aggregator authenticated discovery workspace entry | Place authenticated Aggregator operators into the bounded discovery workspace | Activated Aggregator operators | `AUTHENTICATED_ENTRY` | `NO_BEYOND_PUBLIC_LOGIN_ENTRY` | closed Aggregator unit plus `AGGREGATOR-IMPLEMENTATION-DESIGN-v1.md` | `SOLVED` |
| Public-to-authenticated activation and owner-ready transition | Preserve coherence between public entry, `ACTIVE` eligibility, membership/session truth, and practical user usability after activation | First owners and newly activated tenant users | `ENTRY_TRANSITION` | `YES` | onboarding/provisioning handoff design; no preserved public-runtime decision yet | `UNRESOLVED` |
| Shared public shell / navbar / public entry navigation layer | Preserve one bounded cross-surface rule for public entry framing, truthful public navigation, and route/brand continuity without overclaiming family depth | Anonymous visitors, pre-login returning users, activated users crossing the boundary | `PUBLIC_AND_ENTRY_BOUNDARY` | `SELF` | implied across routing, launch, and B2C artifacts only | `UNRESOLVED` |

Inventory conclusion:

- TexQtic already has a real public entry requirement, but not a broad anonymous marketplace requirement.
- B2C already owns one real bounded public browse-entry seam.
- B2B public-facing truth is limited to tenant discovery and lawful entry, not anonymous browse-marketplace depth.
- Aggregator public directory exposure is not supported by current approved truth.
- one cross-cutting public-entry/shell/navbar requirement exists implicitly already and is not yet preserved as one bounded planning decision.

### B. Runtime requirement classification

The controlling classification is:

1. `PUBLIC ENTRY` is a real TexQtic runtime requirement.
   It already includes public tenant resolution, brand/context-sensitive entry, and routing into the correct authenticated realm.

2. `B2C PUBLIC STOREfront ENTRY` is a real bounded public surface.
   It is public-safe, branded, browse-oriented, and already partially normalized by closed bounded seams.

3. `B2B PUBLIC TRUTH` is not a public anonymous marketplace requirement.
   The lawful public-facing B2B requirement is limited to tenant discovery and login entry before authenticated business exchange begins.

4. `AGGREGATOR PUBLIC DIRECTORY TRUTH` is not currently part of approved runtime truth.
   Current approved Aggregator truth is tenant-authenticated discovery and handoff, not public directory exposure.

5. `PUBLIC-TO-AUTHENTICATED TRANSITION` is a real cross-cutting runtime requirement.
   It links public entry, activation readiness, session hydration, and usable tenant/user entry after the public boundary is crossed.

6. `SHARED PUBLIC SHELL / NAVBAR / ENTRY CHROME` is a real planning requirement, but it is currently implicit rather than preserved in one bounded planning record.

### C. Shared public-shell/navbar requirement

Decision:

`PUBLIC_SHELL_REQUIREMENT_MUST_BE_PRESERVED_NOW`

Reason:

- public entry, B2C browse-entry, branded route context, and public-to-authenticated transition truth already exist in current repo authority
- those truths are currently scattered across launch, family, routing, and onboarding artifacts
- the strongest surviving next-family remainder is B2C, where future child reduction could otherwise over-focus on one storefront seam and silently assume the shared public-entry/nav layer is already solved
- current repo truth also needs explicit protection against the opposite overread: generic shell presence must not be treated as proof of B2C whole-family truth, B2B anonymous marketplace truth, or Aggregator public-directory truth

Exact requirement line:

- TexQtic must preserve one shared public-facing entry/shell requirement that owns only public tenant resolution, branded/public entry framing, truthful public-safe navigation, and coherent transition from public entry into the correct authenticated tenant/user surface while preserving route and brand context.

Exact non-requirement line:

- This requirement does not authorize a global marketing redesign, a universal anonymous marketplace navbar, public B2B browse depth, public Aggregator directory exposure, WL-admin/control-plane shell changes, or any claim that one public shell/navbar defines B2B, B2C, Aggregator, white-label, or downstream authenticated workflow depth.

Surfaces that must consume this requirement:

- public tenant discovery and realm-safe login entry
- any future public landing or branded entry work
- bounded public-facing B2C browse-entry and later B2C child reduction
- public-to-authenticated activation / owner-ready transition work
- later B2B public-entry planning
- any later Aggregator public-surface reconsideration
- later candidate selection/opening whenever scope touches public pages, public navigation, login entry, or public-to-authenticated transitions

Surfaces that remain separate from this requirement:

- B2B authenticated exchange shell depth
- B2C authenticated downstream commerce continuity
- Aggregator authenticated discovery workspace and handoff depth
- WL admin/operator shells
- control-plane / superadmin shells
- family-specific business logic, workflow depth, and downstream transaction continuity

### D. Prior-unit exclusion preservation

The following closed units intentionally did **not** solve public-facing shell/navbar alignment:

1. `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY`
   - solved one exact public B2C browse-entry seam only
   - explicitly excluded seller/admin behavior, checkout/cart continuity, broader redesign, and whole-family B2C claims
   - therefore it must not be overread as proof that shared public shell/navbar alignment is complete

2. `MODE-COMPLETENESS-B2C-STOREFRONT-SELLER-ADMIN-AFFORDANCE-SEPARATION-001`
   - removed one seller/admin affordance drift from the exact public non-WL B2C seam only
   - did not define a global public shell, navbar, or entry rule

3. `MODE-COMPLETENESS-B2C-STOREFRONT-SETTINGS-AFFORDANCE-SEPARATION-001`
   - removed one settings-management affordance drift from that same exact public seam only
   - did not define public-shell ownership, public-nav policy, or cross-surface entry truth

4. `AGGREGATOR-DISCOVERY-WORKSPACE-TRUTHFULNESS`
   - closed one tenant-authenticated Aggregator discovery slice only
   - explicitly remained outside public entry, public shell, and broad Aggregator family/public directory questions

5. `AGGREGATOR-DISCOVERY-VERIFICATION-SURFACE-NORMALIZATION-001`
   - explicitly excluded any public-shell, auth, or navigation change
   - therefore cannot be read as evidence that public-entry or nav alignment was normalized incidentally

Why this absence must be preserved now:

- later B2C or public-entry planning could otherwise misread exact seam fixes as if a shared public layer were already defined
- later Aggregator planning could otherwise misread authenticated discovery closure as if public discovery exposure were already settled
- later candidate selection could otherwise skip a necessary public-entry or public-shell boundary check by assuming prior public-facing work already covered it

Future planning rule:

- treat the above units as exact seam truths only
- do not infer shared public-shell/navbar completion, cross-family public-entry alignment, or public-to-authenticated transition completion from their closure alone

### E. Planning-consumption rule

This preserved public-facing runtime truth must constrain future work as follows:

1. `B2C family reduction`
   - must read this decision first before naming the next exact B2C child
   - must distinguish the next B2C child from the shared public-entry/shell requirement instead of silently assuming that requirement is already complete

2. `B2B / public-entry planning`
   - may claim public tenant discovery and realm-safe login entry only
   - must not reintroduce anonymous public B2B marketplace or public directory semantics unless a later bounded decision explicitly expands current truth

3. `Aggregator / public-surface follow-up`
   - must preserve that current approved truth does not support public Aggregator directory placement
   - any future public Aggregator claim requires a separate bounded design/decision step first rather than inheritance from current routing or shell presence

4. `Later candidate selection / opening`
   - any future candidate touching public pages, nav, landing, login entry, activation transition, or brand-surface continuity must inherit this decision before scope is named
   - later openings must state explicitly whether they consume the shared public-shell requirement, remain adjacent to it, or preserve it as out of scope

5. `Cross-cutting family consumption`
   - `DOMAIN-TENANT-ROUTING-BRAND-SURFACE-MANAGEMENT` must remain the cross-cutting family truth that hosts this requirement at the family level
   - `ONBOARDING / PROVISIONING / ACTIVATION` must preserve the public-to-authenticated owner-ready transition dependency rather than treating public entry as sufficient by itself

## Decision Result

`PUBLIC_FACING_RUNTIME_REQUIREMENTS_PRESERVED`

TexQtic now preserves one bounded planning truth for public-facing runtime requirements.

This result is planning-only.

It does not:

- open a new unit
- reopen any closed unit
- authorize public-shell/navbar implementation
- authorize public-page or landing-page implementation
- change Layer 0 current state
- change the current strongest-family-but-not-yet-exact result for B2C

Required immediate inheritance:

- future B2C family reduction must read this decision before naming its next exact child
- future B2B/public-entry planning must inherit its public-entry boundary
- future Aggregator/public-surface work must inherit its public-exclusion boundary
- later candidate selection/opening must use this preserved truth whenever public-facing runtime scope is touched