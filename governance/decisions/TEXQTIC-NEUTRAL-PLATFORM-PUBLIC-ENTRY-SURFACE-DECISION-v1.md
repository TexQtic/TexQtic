# TEXQTIC — Neutral Platform Public Entry Surface Decision v1

Decision ID: TEXQTIC-NEUTRAL-PLATFORM-PUBLIC-ENTRY-SURFACE-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / neutral platform public-entry surface
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only neutral-host surface decision

## 1. Neutral Platform First-Page Principle

The canonical neutral platform host surface for `https://app.texqtic.com` and equivalent neutral
platform hosts is a hybrid landing-plus-entry-launch surface under one governed public-entry model.

It is not a pure login shell, not a generic anonymous marketplace home, and not a detached realm
chooser with no public platform context.

The first rendered neutral platform page must:

- establish TexQtic as a governed market-access infrastructure rather than an open listing
  marketplace
- provide truthful public-safe platform context and navigation before a tenant-specific or
  authenticated surface takes over
- expose the lawful entry paths into B2B public discovery, B2C public browse, authenticated tenant
  entry, and authenticated staff/control entry without collapsing those paths into one login-first
  takeover

Current-truth guardrail:

This decision fixes what the neutral platform host should render first once public-entry resolution
returns neutral entry. It does not claim that this first-page experience is already implemented in
runtime.

## 2. Surface Composition Model

The canonical neutral platform first page is composed of the following categories only:

| Surface Category | Purpose | Boundary Rule |
| --- | --- | --- |
| neutral platform framing | Establish TexQtic's governed market-access identity and the fact that the user is on the neutral platform host rather than a tenant-branded host | Must remain public-safe framing only, not marketing-site replacement in full |
| public-safe platform value/context | Explain the lawful public entry types TexQtic supports and the bounded nature of public access | Must remain projection-safe and platform-truthful, not anonymous marketplace depth |
| entry-path selection | Present the canonical entry choices available from a neutral platform host | Must stay at entry-launch level and must not own downstream workflow semantics |
| public-safe B2B entry affordance | Launch the user toward lawful B2B public discovery or inquiry-entry context | Must not imply anonymous B2B marketplace workflow, pricing, or negotiation depth |
| public-safe B2C entry affordance | Launch the user toward lawful B2C public browse-entry context | Must not become tenant-specific browse ownership until a tenant target is resolved |
| authenticated tenant entry affordance | Allow returning tenant users and tenant members to begin authenticated tenant entry from the neutral platform host | Must remain authenticated-entry launch only and not the whole first-page identity |
| authenticated staff/control entry affordance | Allow staff and control-plane users to reach the correct authenticated admin/control entry path | Must remain a bounded authenticated-entry affordance and not dominate the neutral public page |

Composition rules:

1. The neutral platform first page is one governed public-entry surface with multiple lawful entry
   categories, not a stack of disconnected mini-pages.
2. Public-safe platform framing must appear before or alongside entry affordances so the first page
   reads as platform entry, not as a bare login handoff.
3. Entry-path selection may be prominent, but it must remain subordinate to the governing neutral
   platform framing rather than replacing it.

## 3. Tenant Access / Staff Control Placement Rule

`Tenant Access` and `Staff Control` are secondary authenticated-entry affordances inside the neutral
platform first page, not the whole first page by themselves.

Placement rules:

- `Tenant Access` belongs inside the neutral platform entry-path selection layer as the authenticated
  tenant-entry action for returning tenant users, members, and owners
- `Staff Control` belongs alongside but subordinate to tenant entry as the authenticated
  staff/control entry action
- neither affordance is the canonical page identity for the neutral host
- neither affordance may suppress neutral public-safe platform framing or lawful public B2B/B2C
  entry affordances by default

Correction rule:

The current combined auth shell may remain an implementation anchor, but it is not the product-truth
definition of the neutral platform first page.

## 4. Neutral-To-Target Transition Model

The canonical product-truth transitions from the neutral platform public-entry surface are:

| Transition Class | Source | Target | Neutral Surface Ownership Stop |
| --- | --- | --- | --- |
| `NEUTRAL_TO_B2B_PUBLIC_DISCOVERY_ENTRY` | neutral platform first page | lawful B2B public-safe discovery or inquiry-entry context | stops at public-safe launch and context carry |
| `NEUTRAL_TO_B2C_PUBLIC_BROWSE_ENTRY` | neutral platform first page | lawful B2C public browse-entry context | stops at public-safe launch and context carry |
| `NEUTRAL_TO_AUTHENTICATED_TENANT_ENTRY` | neutral platform first page | authenticated tenant/member/owner entry | stops at authenticated-entry launch |
| `NEUTRAL_TO_AUTHENTICATED_STAFF_ENTRY` | neutral platform first page | authenticated control-plane or staff entry | stops at authenticated-entry launch |

Transition rules:

1. The neutral platform first page may launch B2B and B2C public-safe entry paths, but it does not
   own pillar-specific discovery objects, browse objects, or public-triggered workflow semantics.
2. The neutral platform first page may launch authenticated tenant or staff entry, but it does not
   own session establishment, post-auth routing, or owner-ready activation checks.
3. Aggregator is not a public neutral-first-page browse destination. If surfaced at all here, it is
   only as a qualified authenticated workspace-entry path under existing authenticated-only
   authority.

## 5. Exclusions

The neutral platform first page must not default to any of the following:

- the combined login shell as the entire first-page experience
- direct authenticated workflow continuity
- anonymous B2B marketplace depth beyond the already locked public-safe discovery/inquiry boundary
- public Aggregator directory depth
- WL-admin, seller-admin, tenant-admin, or control-plane runtime surfaces
- hidden runtime/admin state, membership state, or workflow state
- tenant-specific branded browse or discovery ownership before tenant resolution has lawfully
  succeeded
- a generic anonymous marketplace home that erases TexQtic's governed market-access framing

## 6. Contract-Consumption Rule

The neutral platform first page is the canonical rendering target when the locked
`PublicEntryResolutionDescriptor` yields all of the following together:

- `resolutionDisposition = NEUTRAL_NO_TENANT`
- `resolvedRealmClass = NEUTRAL_PUBLIC_ENTRY`
- `allowedTargetSurfaceClass = NEUTRAL_PUBLIC_ENTRY_SURFACE`

Consumption rules:

1. When the descriptor remains neutral, the neutral platform first page renders as the bounded
   platform-host public-entry surface.
2. When the descriptor resolves a tenant-specific public entry target, control passes to the
   tenant-branded public surface instead of rendering the neutral platform first page as the primary
   surface.
3. When the descriptor resolves an authenticated-entry-only target, the neutral platform first page
   may remain the launch context, but the rendered next-step affordance must point toward
   authenticated entry rather than impersonating a public tenant surface.
4. This decision consumes the locked contract. It does not modify the contract's lawful inputs,
   outputs, ownership split, or stop line.

## 7. Expansion-Ready Guardrail

The neutral platform first page may evolve later only by deepening governed public-safe platform
framing and lawful entry-launch clarity while preserving that the neutral host is neither a generic
anonymous marketplace home, nor a pure login shell, nor a substitute for tenant-specific public
surfaces, nor a downstream workflow owner.

## 8. Non-Goals / Exclusions

This unit does not authorize:

- implementation of the neutral platform page
- component design, layout mockups, or detailed copywriting
- auth/session redesign
- shell-family redesign
- B2B public discovery implementation
- B2C browse/cart/checkout implementation
- Aggregator workflow or public-directory implementation
- tenant-admin, WL-admin, or control-plane redesign
- schema, route, runtime, or deployment mutation
- reopening the bounded public-entry resolution contract itself

## 9. Downstream Dependencies

Once decided, this artifact may be consumed by later bounded units that still must decide or verify
separately:

| Later Unit / Area | What This Decision Supplies | What Later Work Must Still Decide Separately |
| --- | --- | --- |
| bounded neutral-host implementation or repair affecting `App.tsx` / public entry rendering | the exact product-truth model for what the neutral platform host should render first | component structure, state flow, rendering mechanics, and deployment verification |
| shared public-shell implementation follow-up | the neutral-host first-surface target that consumes the already locked shared-shell and public-entry contract stack | detailed public-safe navigation, framing implementation, and transition-launch UI |
| B2B public discovery follow-up | the neutral-host launch role into B2B public-safe entry | exact B2B public-safe object rendering and inquiry/RFQ-intent semantics |
| B2C public browse follow-up | the neutral-host launch role into B2C public browse entry | exact tenant-specific browse entry and cart/wishlist trigger mechanics |
| public-entry verification follow-up | the correct neutral-host runtime expectation for `app.texqtic.com` | deployed proof that the neutral host no longer falls back to login-first takeover |

## 10. Decision Result

`NEUTRAL_PLATFORM_PUBLIC_ENTRY_SURFACE_DECIDED`

TexQtic now has one bounded neutral-platform public-entry surface artifact in authority-bearing
decision state. It defines the exact neutral platform first-page principle, composition, placement
of tenant/staff entry affordances, neutral-to-target transitions, exclusions, contract-consumption
rule, and expansion-ready guardrail without widening into implementation or contract redesign.
