# TEXQTIC — Public Shell and Transition Architecture Decision v1

Decision ID: TEXQTIC-PUBLIC-SHELL-AND-TRANSITION-ARCHITECTURE-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / public shell and transition architecture
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only public-entry architecture decision

## 1. Shell Principle

TexQtic preserves one shared public-entry shell architecture under one governing principle: a unified public-entry shell layer may present bounded realm-specific entry variants, but it remains one common architecture that owns public tenant resolution, brand-safe entry framing, public-safe navigation, and coherent transition launch into the correct authenticated surface without becoming a generic anonymous marketplace shell or a substitute for pillar-owned workflow depth.

The controlling rule is:

- the shared public shell is an entry-and-transition architecture, not a commerce or workflow owner
- the shell may host multiple bounded realm-specific entry variants under one common governing shell principle
- the shell owns only cross-surface public entry, realm resolution, public-safe navigation, and transition launch or confirmation context
- pillar-specific public surfaces own their own public discovery or browse objects and public-triggered entry semantics
- authenticated surfaces own session continuity, workflow continuity, transaction continuity, admin continuity, and post-entry execution truth

Current-truth guardrail:

This artifact is planning authority only. It preserves current repo truth that a shared public-entry shell requirement exists, that public-safe rendering must use governed projection boundaries, and that current runtime still contains unresolved public-shell implementation depth. It does not claim that the full target shell architecture is already implemented in runtime.

## 2. Shell-Owned Context / Object Model

The canonical lawful shell-owned context classes are:

| Shell-Owned Context Class | Purpose | Boundary Rule |
| --- | --- | --- |
| `PUBLIC_REALM_SELECTION_CONTEXT` | Public-entry context that identifies which lawful entry realm the user is in or is approaching | Must remain entry-selection context, not authenticated runtime identity |
| `TENANT_RESOLUTION_CONTEXT` | Public-safe tenant/domain/slug/email resolution context used to identify the correct tenant or branded target surface | Must remain resolution context, not tenant-admin or workflow state |
| `BRAND_SURFACE_FRAMING_OBJECT` | Public-safe brand/storefront/operator framing used to keep the correct entry surface coherent once resolution succeeds | Must remain brand-safe framing only and must not leak admin or authenticated continuity |
| `PUBLIC_SAFE_NAVIGATION_CONTEXT` | Public-safe navigation context describing the lawful entry options and next-step affordances inside the shared shell | Must remain navigation and route context, not anonymous marketplace depth or workflow ownership |
| `TRANSITION_LAUNCH_CONTEXT` | Bounded cross-surface context that launches a user from public entry or public-triggered entry toward the correct authenticated surface | Must remain launch context and must not become the downstream workflow record |
| `TRANSITION_CONFIRMATION_CONTEXT` | Bounded confirmation context indicating that the transition target was selected or launched and what public-safe context was carried across the seam | Must remain transition evidence and reference context, not authenticated workflow continuity |

Object-model rules:

1. The shared shell owns only cross-surface entry and transition context classes that are common across pillars.
2. Pillar-specific public objects such as B2B discovery objects or B2C browse objects are not re-owned by the shell merely because the shell frames or links them.
3. The shell may compose these context classes into one entry experience, but their canonical roles remain distinct.
4. No shell-owned class in this unit authorizes checkout state, RFQ workflow state, pricing state, negotiation state, order or trade state, WL-admin surfaces, or control-plane surfaces.

## 3. Realm and Tenant Resolution Model

In lawful TexQtic terms, realm resolution means determining the correct public-entry or authenticated-entry domain for the user before deeper runtime continuity begins, using only public-safe identity, publication, and entry context.

The canonical realm and tenant resolution model is:

| Resolution Concern | Canonical Rule |
| --- | --- |
| B2B public-safe discovery realm | Resolved as the lawful public-safe supplier/capability discovery and public-triggered inquiry or RFQ-intent entry realm only |
| B2C public browse realm | Resolved as the lawful public-safe storefront and browse-entry realm only |
| Aggregator realm | No public discovery realm exists; Aggregator is reached only through qualified entry or authenticated workspace entry |
| tenant-specific public context | Exists when a lawful tenant/storefront/supplier context has been resolved and public-safe projected content may be framed under that tenant brand or identity |
| non-tenant public context | Exists when the user is still in neutral public entry, realm selection, or route-discovery context before a specific tenant-owned public surface is resolved |

Realm-resolution rules:

1. The shared shell may resolve realm and tenant context through public-safe slug, email, domain, host, tenant identity, or equivalent route-entry signals where repo truth supports them.
2. Realm resolution must remain pre-session and pre-workflow in meaning, even when it leads directly into authenticated session establishment.
3. Brand context may be preserved only from lawful public-safe tenant identity and brand-surface truth. It must not be synthesized from authenticated/admin-only state.
4. Tenant-specific public context differs from neutral public-entry context because tenant-specific entry already has one resolved public-safe identity target, while neutral entry still owns only selection and resolution logic.
5. Aggregator remains authenticated-only under current authority. The shell may support qualified Aggregator entry launch, but not public Aggregator directory or anonymous Aggregator browse depth.
6. Realm resolution in this unit does not decide final schema or implementation mechanics for session/auth contracts; it fixes only the planning ownership line that public entry is an entry-resolution concern rather than downstream authenticated workflow ownership.

## 4. Public-Safe Navigation Model

The shared shell may lawfully own public-safe navigation only when that navigation stays within entry, discovery framing, public-safe preview, and lawful transition launch.

The canonical public-safe navigation ownership is:

| Navigation Responsibility | What The Shell May Lawfully Own | What The Shell Must Not Own |
| --- | --- | --- |
| realm-entry navigation | Direct a user toward lawful B2B public discovery entry, lawful B2C browse entry, or authenticated/qualified Aggregator entry | Generic anonymous marketplace navigation across unauthorized marketplace depth |
| tenant-resolution navigation | Guide the user toward the correct tenant/storefront/brand target once public-safe tenant resolution succeeds | Tenant-admin or control-plane navigation |
| branded public-entry navigation | Preserve brand-safe navigation framing inside a resolved tenant/storefront entry surface | WL-admin, seller-admin, or governance/admin control exposure |
| transition navigation | Launch the user from a lawful public-safe or public-triggered surface into the correct authenticated continuation | Workflow-owned navigation that bypasses the pillar stop lines or implies public workflow continuity |
| neutral public entry navigation | Provide truthful pre-auth navigation across lawful entry categories without overclaiming public depth | A universal anonymous B2B marketplace directory, public Aggregator directory, or public workflow hub |

Public-safe navigation rules:

1. The shell may own cross-surface navigation categories, realm switches, tenant-resolution flows, and lawful login-entry framing.
2. The shell must not absorb pillar-specific discovery semantics; B2B public discovery and B2C public browse remain pillar-owned even when the shell frames the transition around them.
3. The shell must not own navigation into RFQ workflow internals, checkout internals, account internals, quote or negotiation depth, order or trade execution depth, WL-admin, or control-plane surfaces.
4. The shell must not imply generic anonymous marketplace depth by presenting unified navigation as if all pillars were openly browsable public directories.

## 5. Transition Model

The canonical transition types across the shared shell are:

| Transition Type | Source | Target | Shell-Owned Part | Non-Shell-Owned Part |
| --- | --- | --- | --- | --- |
| `PUBLIC_SAFE_TO_PUBLIC_TRIGGERED_ENTRY` | lawful public-safe B2B discovery or lawful public-safe B2C browse | pillar-specific public-triggered entry prompt | route continuity, realm continuity, and public-safe carried context | inquiry/RFQ-intent semantics and cart/wishlist semantics themselves |
| `PUBLIC_TRIGGERED_TO_AUTHENTICATED_CONTINUITY` | public inquiry/RFQ-intent entry or public cart/wishlist entry | correct authenticated B2B or B2C continuation surface | transition launch context, tenant/brand continuity, and lawful carried entry context | authenticated RFQ workflow, checkout, account, or post-entry continuity |
| `QUALIFIED_ENTRY_TO_AUTHENTICATED_WORKSPACE` | neutral public entry, direct login entry, or qualified non-public launch | authenticated Aggregator workspace or other correct authenticated tenant workspace | realm selection, tenant resolution, and entry confirmation | authenticated workspace behavior itself |
| `AUTHENTICATED_HANDOFF_TO_AUTHENTICATED_DOWNSTREAM_REALM` | authenticated Aggregator handoff confirmation | authenticated B2B, authenticated B2C, or human-assisted downstream continuity | route/realm continuity and bounded handoff-carry context where lawful | downstream workflow ownership after handoff |

Per-pillar transition rules:

### B2B

1. Public discovery to inquiry or RFQ-intent entry remains a public-safe to public-triggered transition.
2. The shell may preserve public-safe supplier/category/capability context and launch the user toward the correct authenticated B2B continuation.
3. The shell does not own inquiry intake semantics, RFQ-intent structure, or authenticated RFQ workflow depth.

### B2C

1. Public browse to cart or wishlist entry remains a public-safe to public-triggered transition.
2. The shell may preserve tenant/storefront/brand context plus public-safe selected item context when launching the user toward authenticated checkout or account continuity.
3. The shell does not own cart semantics, checkout progression, account continuity, or post-purchase continuity.

### Aggregator

1. Aggregator is reached through qualified entry or authenticated login/workspace entry only; no public Aggregator browse transition exists under current authority.
2. Once inside authenticated Aggregator, the shared shell may still participate in route/realm continuity when Aggregator launches a downstream authenticated handoff.
3. The shell does not own Aggregator discovery intelligence, requirement capture, handoff selection logic, or downstream workflow continuity after handoff.

Transition rules:

1. The shared shell owns transition launch and confirmation context only at the cross-surface seam.
2. Pillar-specific surfaces own the semantics of their own public-triggered entry objects.
3. Authenticated downstream surfaces own the resulting workflow continuity immediately after the shell has launched the correct transition.
4. Transition coherence must preserve brand, realm, and tenant context without flattening B2B, B2C, and Aggregator into one interchangeable anonymous marketplace flow.

## 6. Context-Preservation Model

The shared shell may preserve only context that is necessary to keep entry, branding, and transition coherent without leaking public-owned workflow continuity.

### 6.1 Lawful Context That May Be Preserved

| Context Category | Why It May Cross The Shell Boundary |
| --- | --- |
| realm context | Needed to preserve whether the user is entering B2B public discovery, B2C public browse, or authenticated Aggregator entry |
| tenant/storefront/brand context | Needed to preserve the correct tenant-owned or storefront-owned public surface and the right branded authenticated destination |
| public-safe selected object context | Needed to carry lawful public-safe supplier, category, capability, product, or storefront reference context into the correct transition launch |
| entry / handoff context | Needed to preserve that the user is crossing from public-safe or public-triggered entry into the correct authenticated destination |
| route continuity context | Needed to preserve which shell/path/brand target should render after lawful transition |

### 6.2 Context That Must Not Be Preserved As Public-Owned Continuity

| Prohibited Context Category | Why It Must Not Cross As Shell-Owned Continuity |
| --- | --- |
| RFQ workflow state | Becomes downstream-authenticated workflow continuity immediately after the stop line |
| checkout progression | Belongs to authenticated downstream commerce continuity |
| authenticated account state | Belongs to downstream-authenticated account continuity |
| quote, pricing, negotiation, order, trade, or fulfillment state | Belongs to downstream-authenticated workflow and execution ownership |
| admin, governance, WL-admin, or control-plane state | Outside lawful public shell ownership entirely |
| raw internal operational records | Public-shell rendering must remain projection-safe and entry-safe only |

Context-preservation rules:

1. The shared shell may preserve references and bounded entry context, but not the downstream record as authoritative workflow state.
2. Once an authenticated downstream surface takes over, the shell-owned transition context becomes reference-only and not the system of record.
3. Brand and tenant context may persist across the seam only to preserve coherent entry and destination targeting, not to expose hidden authenticated/admin data.

## 7. Ownership Stop Line

The precise public shell ownership stop line is:

| Surface / Responsibility | Lawful Owner |
| --- | --- |
| public realm selection | shared public shell |
| public tenant resolution | shared public shell |
| brand-safe entry framing | shared public shell |
| public-safe cross-surface navigation | shared public shell |
| transition launch and confirmation context | shared public shell |
| B2B discovery objects and inquiry/RFQ-intent semantics | pillar-specific B2B public surface and later downstream-authenticated B2B workflow |
| B2C storefront browse objects and cart/wishlist semantics | pillar-specific B2C public surface and later downstream-authenticated B2C continuity |
| Aggregator discovery intelligence, requirement capture, routing, and handoff semantics | authenticated Aggregator workspace |
| authenticated session, workflow, transaction, and post-entry continuity | downstream-authenticated surfaces |
| WL-admin and control-plane surface ownership | excluded from public shell ownership entirely |

Stop-line rules:

1. The shell may own only what is cross-surface, entry-safe, and transition-safe.
2. Public pillar-specific surfaces own their own discovery/browse/intake semantics and object models.
3. Authenticated surfaces own workflow continuity, transaction continuity, admin continuity, and execution continuity immediately after transition launch succeeds.
4. The shell must never become a substitute for pillar ownership, authenticated runtime ownership, WL-admin ownership, or control-plane ownership.

## 8. Expansion-Ready Guardrail

Future richer public-entry experiences are lawful only if later bounded authority expands entry framing, tenant resolution, or public-safe navigation depth without turning the shared shell into a generic anonymous marketplace shell, a workflow owner, a control-plane or WL-admin surface, or a substitute for pillar-specific public surfaces and downstream-authenticated continuity.

## 9. Non-Goals / Exclusions

This unit does not authorize:

- detailed UX design
- detailed route-tree implementation
- component-level navbar, header, or footer design
- auth or session implementation
- checkout, RFQ, quote, order, or account workflow internals
- control-plane or WL-admin shell design
- generic anonymous marketplace shell behavior
- public workflow ownership
- implementation, runtime mutation, schema mutation, or control-plane mutation

## 10. Downstream Dependencies

This decision is intended to be consumed by later bounded units that still must decide separately:

| Later Unit / Decision Area | What This Decision Supplies | What That Later Work Must Still Decide Separately |
| --- | --- | --- |
| bounded public-entry resolution contract design | the planning ownership line for realm/tenant/brand resolution as a pre-auth entry concern | exact contract shape, host/slug/email resolution rules, and client/server ownership details |
| bounded B2B authenticated transition design | the shared-shell stop line around B2B public discovery and authenticated B2B continuation | exact auth threshold mechanics, route continuity behavior, and RFQ creation entry details |
| bounded B2C authenticated transition design | the shared-shell stop line around B2C public browse and authenticated checkout/account continuity | exact cart-to-auth transfer semantics, account-entry behavior, and authenticated continuity mechanics |
| bounded Aggregator entry and downstream handoff transition design | the shared-shell stop line around authenticated Aggregator entry and downstream-authenticated handoff | exact route resolution, handoff surface behavior, and human-assisted path transition mechanics |
| fresh downstream audit / implementation-opening readiness investigation for public-surface launch work | one locked architecture for public-entry shell ownership and transition boundaries | whether current repo/runtime/design readiness is sufficient for any specific implementation opening |

## 11. Decision Result

`PUBLIC_SHELL_AND_TRANSITION_ARCHITECTURE_DRAFTED`

TexQtic now has one bounded decision artifact that defines the shared public shell principle, canonical shell-owned context classes, realm and tenant resolution model, public-safe navigation ownership, transition model, context-preservation model, and exact ownership stop line without widening into component implementation, session implementation, or downstream workflow design.
