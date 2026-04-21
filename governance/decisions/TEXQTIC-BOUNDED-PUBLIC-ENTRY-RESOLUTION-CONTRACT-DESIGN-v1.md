# TEXQTIC — Bounded Public Entry Resolution Contract Design v1

Decision ID: TEXQTIC-BOUNDED-PUBLIC-ENTRY-RESOLUTION-CONTRACT-DESIGN-v1
Status: DECIDED
Scope: Governance / public-surface / bounded public-entry resolution contract design
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only bounded contract-design decision

## 1. Contract Principle

The canonical TexQtic public-entry resolution contract is a pre-session, pre-workflow contract that transforms lawful public entry inputs into one authoritative public-safe resolution descriptor used to target the correct public surface or authenticated entry path.

The controlling rule is:

- the contract exists before authenticated session establishment and before workflow continuity begins
- the contract resolves the lawful entry target, the bounded transition requirement, and the minimum public-safe context that may cross the entry seam
- the contract does not own authenticated session establishment, activation, tenant membership readiness, workflow state, commerce continuity, or shell UI behavior
- the contract is the authoritative cross-layer resolution boundary for public entry; edge and client may participate, but neither may replace server-owned canonical resolution truth

Current-truth guardrail:

This artifact locks the public-entry contract shape and ownership boundary only. It does not claim that the full contract is already implemented everywhere in runtime, and it does not widen into auth/session implementation, shell implementation, or downstream B2B/B2C/Aggregator workflow mechanics.

## 2. Input Contract

The canonical lawful public-entry input classes are:

| Input Class | Meaning | Classification | Contract Rule |
| --- | --- | --- | --- |
| `HOST_DOMAIN_INPUT` | Raw request host/domain context used to determine whether entry is platform-neutral, platform-subdomain, or verified custom-domain entry | `CANONICAL` | Lawful for host-bound entry classification and tenant resolution where repo truth supports it |
| `SLUG_PATH_INPUT` | Explicit tenant slug or equivalent tenant-path identifier presented on a public entry or tenant login path | `CANONICAL` | Lawful when the request is not already resolved by a stronger tenant-bound host context |
| `EMAIL_DERIVED_ENTRY_INPUT` | Public email lookup used to discover candidate tenant memberships for tenant entry selection | `OPTIONAL_DERIVED` | Lawful only for candidate-tenant discovery; it is not final tenant resolution by itself |
| `DIRECT_PUBLIC_TENANT_IDENTIFIER_INPUT` | Public-safe tenant identifier supplied from a trusted prior resolver result or lawful public selection step | `DERIVED_ONLY` | Lawful only when emitted by edge/server truth or a prior trusted public-safe server response; the client must not invent it as routing authority |
| `NEUTRAL_PUBLIC_ENTRY_INPUT` | Entry with no resolved tenant and no resolved realm-specific tenant surface yet | `CANONICAL` | Lawful for platform entry, neutral landing, or public realm selection before tenant resolution succeeds |
| `AUTHENTICATED_REENTRY_INPUT` | Existing authenticated identity or runtime restore state | `OUT_OF_SCOPE_AS_AUTHORITATIVE_PUBLIC_ENTRY_INPUT` | Once a valid authenticated identity exists, authenticated runtime descriptors own routing authority rather than this contract |

Input rules:

1. `HOST_DOMAIN_INPUT` is canonical for host-bound entry classification. If a verified tenant-bound host resolves successfully, it outranks neutral platform-host assumptions.
2. `SLUG_PATH_INPUT` is canonical for explicit tenant selection on neutral or platform-host entry, but it must not override a contradictory verified tenant-bound host result.
3. `EMAIL_DERIVED_ENTRY_INPUT` may produce candidate tenants only. It must not produce final tenant or realm ownership until one lawful candidate has been selected and revalidated.
4. `DIRECT_PUBLIC_TENANT_IDENTIFIER_INPUT` is lawful only as a derived continuation input emitted by trusted public-safe resolution, never as free client-side authority.
5. `NEUTRAL_PUBLIC_ENTRY_INPUT` is a real lawful state. The contract must support unresolved neutral entry without forcing a fallback tenant or fallback shell.
6. `AUTHENTICATED_REENTRY_INPUT` is adjacent but not owned here. This contract may be bypassed when authenticated runtime truth already exists.

## 3. Output Contract

The canonical output of this contract is `PublicEntryResolutionDescriptor`.

The existing proto-shape preserved in repo truth remains the core subset:

- `publicEntryKind`
- `normalizedHost`
- `resolvedTenantId`
- `resolvedTenantSlug`

This unit locks the fuller canonical descriptor required for later bounded openings:

| Descriptor Field | Meaning | Canonical Rule |
| --- | --- | --- |
| `publicEntryKind` | Host/container entry class | Must remain one of `PLATFORM`, `TENANT_SUBDOMAIN`, or `TENANT_CUSTOM_DOMAIN` |
| `normalizedHost` | Canonical normalized host used for host-bound resolution | Required whenever host/domain context participated in resolution |
| `resolutionSourceType` | Which lawful input class produced the current descriptor | Must remain explicit and not inferred from shell state |
| `resolutionDisposition` | Whether resolution is final, still neutral, or requires candidate selection | Must distinguish `RESOLVED`, `CANDIDATE_SELECTION_REQUIRED`, `NEUTRAL_NO_TENANT`, and `UNRESOLVED_REJECTED` |
| `resolvedRealmClass` | The lawful realm or entry class reached by resolution | Must remain pre-session and pre-workflow |
| `resolvedTenantContext` | Public-safe tenant/storefront identity context when one tenant has been lawfully resolved | May include only public-safe identity fields such as tenant id, slug, and name |
| `brandSurfaceFramingContext` | Public-safe brand/storefront/operator framing context for the resolved entry surface | Must remain public-safe framing only |
| `allowedTargetSurfaceClass` | Which class of surface may lawfully render next | Must stop at entry-safe surface classes rather than workflow ownership |
| `requiredTransitionClass` | What type of next-step transition is required from this descriptor | Must remain an entry/transition classification, not a workflow state machine |
| `authenticationRequired` | Whether authentication is mandatory before continuity can proceed | Must be explicit rather than inferred from UI heuristics |
| `postAuthEligibilityCheckRequired` | Whether activation, membership, or realm-readiness must be checked after authentication | May signal downstream requirement, but may not evaluate it |
| `downstreamHandoffTargetClass` | The downstream class this entry should launch toward once the seam is crossed | Must remain a bounded target class, not a workflow object |

Canonical output vocabularies:

- `resolutionSourceType`: `HOST_DOMAIN`, `SLUG_PATH`, `EMAIL_MEMBERSHIP_DISCOVERY`, `DIRECT_PUBLIC_IDENTIFIER`, `NEUTRAL_ENTRY`
- `resolvedRealmClass`: `NEUTRAL_PUBLIC_ENTRY`, `B2B_PUBLIC_DISCOVERY_ENTRY`, `B2C_PUBLIC_BROWSE_ENTRY`, `TENANT_AUTHENTICATED_ENTRY_ONLY`, `AGGREGATOR_AUTHENTICATED_ENTRY_ONLY`
- `allowedTargetSurfaceClass`: `NEUTRAL_PUBLIC_ENTRY_SURFACE`, `TENANT_BRANDED_PUBLIC_SURFACE`, `AUTHENTICATED_TENANT_ENTRY_SURFACE`, `QUALIFIED_AUTHENTICATED_WORKSPACE_ENTRY_SURFACE`
- `requiredTransitionClass`: `NONE_STAY_IN_PUBLIC_ENTRY`, `ENTER_TENANT_SPECIFIC_PUBLIC_SURFACE`, `LAUNCH_AUTHENTICATED_TENANT_ENTRY`, `LAUNCH_QUALIFIED_AUTHENTICATED_WORKSPACE`
- `downstreamHandoffTargetClass`: `NONE`, `B2B_AUTHENTICATED_CONTINUITY`, `B2C_AUTHENTICATED_CONTINUITY`, `AGGREGATOR_AUTHENTICATED_WORKSPACE`, `OWNER_READY_ACTIVATION_CHECK`

Output rules:

1. `publicEntryKind` classifies entry container, not authenticated family identity. Platform-host slug and email flows may still lawfully remain `PLATFORM` while `resolutionSourceType` captures the narrower input source.
2. `resolutionDisposition` must be explicit. Email-derived discovery that returns multiple lawful tenants is `CANDIDATE_SELECTION_REQUIRED`, not `RESOLVED`.
3. `resolvedRealmClass` must remain pre-session and pre-workflow. It may point to a public B2B or B2C entry class or to an authenticated-entry-only class, but it must not become an authenticated runtime descriptor.
4. `postAuthEligibilityCheckRequired` is allowed because public entry may route to a downstream activation or membership-readiness check, but the contract must not evaluate that check itself.
5. `downstreamHandoffTargetClass` may identify the next lawful destination class, but it must not become RFQ, cart, checkout, quote, order, or trade continuity by implication.

## 4. Ownership Model

The exact ownership split across edge, server, and client is:

| Layer | Canonical Ownership | Must Not Own |
| --- | --- | --- |
| `EDGE` | Normalize host input, classify host-bound `publicEntryKind`, strip spoofable inbound headers, perform signed server resolver calls for host-bound entry, cache bounded host-resolution hints, fail closed on unresolved tenant-bound hosts | Final tenant identity truth for non-host inputs, email-derived tenant selection, final authenticated realm ownership, workflow continuity, or client-visible fallback shell authority |
| `SERVER` | Authoritative validation of lawful inputs, verified custom-domain and platform-subdomain resolution, slug resolution, email-derived tenant candidate lookup, final `PublicEntryResolutionDescriptor` assembly, `resolutionDisposition`, `resolvedRealmClass`, `authenticationRequired`, and `postAuthEligibilityCheckRequired` | Shell UI rendering, client-side cosmetic framing logic, authenticated runtime descriptor creation, or downstream workflow ownership |
| `CLIENT` | Consume the descriptor, render neutral or brand-safe entry surfaces, preserve public-safe reference context, launch the next lawful public or authenticated transition, and display neutral/loading/error states when unresolved | Invent authoritative tenant resolution, infer realm or family from local storage or shell state, override conflicting edge/server truth, choose fallback shells when descriptor is unresolved, or treat public entry context as authenticated continuity |

Ownership rules:

1. Edge may participate in host-bound entry determination, but server owns the canonical resolution result.
2. Server must remain the only authoritative assembler of `PublicEntryResolutionDescriptor`.
3. Client may interpret and render the descriptor, but it must never become the authoritative source of tenant or realm resolution.
4. Authenticated `SessionRuntimeDescriptor` creation remains downstream from this contract and must not be merged into it.
5. Realm-guard enforcement for authenticated endpoints remains downstream from this contract and does not replace pre-session entry resolution.

## 5. Entry-To-Auth Seam

The canonical seam between public entry resolution, authenticated session establishment, and owner-ready or realm-ready activation is:

| Phase | Lawful Owner | Boundary Rule |
| --- | --- | --- |
| public-entry resolution | `PublicEntryResolutionDescriptor` contract | Owns only input validation, entry classification, target resolution, and bounded handoff preparation |
| authenticated session establishment | downstream auth/session layer | Begins when credentials, token, or authenticated identity are evaluated and authenticated runtime identity becomes authoritative |
| owner-ready / realm-ready activation | downstream post-auth eligibility layer | Begins only after authentication, when membership, role, activation, or realm readiness must be checked before usable continuity starts |

Seam rules:

1. Public entry ends once the contract has produced a lawful descriptor and control has either remained on a lawful public surface or passed into authenticated entry.
2. Authenticated session establishment begins when authenticated identity is being created, refreshed, or restored. At that point the public-entry descriptor becomes bounded reference context rather than the routing authority.
3. Owner-ready or realm-ready activation is not owned by public entry. The contract may only indicate that a downstream check is required.
4. Once an authenticated runtime descriptor exists, it outranks public-entry resolution for shell and route authority.
5. Public entry must never be stretched to own member activation, account continuity, or tenant-role readiness by implication.

## 6. Context-Carry Model

### 6.1 Context That May Lawfully Cross The Seam

| Context Category | Why It May Cross |
| --- | --- |
| realm context | Needed to preserve whether the user is entering neutral public entry, B2B public discovery entry, B2C public browse entry, or an authenticated-entry-only target |
| tenant/storefront/brand context | Needed to preserve the resolved tenant or branded surface once lawful resolution has succeeded |
| public-safe selected object context | Needed to preserve supplier, category, product, capability, or storefront references that were already public-safe |
| route continuity context | Needed to preserve which entry path, branded target, or realm-specific surface should render next |
| entry intent / handoff context | Needed to preserve why the user is crossing from public entry toward a later public-triggered or authenticated target |

### 6.2 Context That Must Not Cross As Public-Entry-Owned Continuity

| Prohibited Context Category | Why It Must Not Cross |
| --- | --- |
| RFQ workflow state | Workflow ownership begins only after authentication and downstream workflow creation |
| checkout progression | Checkout belongs to downstream-authenticated commerce continuity |
| authenticated account or session state | Session/account continuity is owned only after authenticated identity exists |
| quote, pricing, negotiation, order, trade, or fulfillment state | These belong to downstream-authenticated workflow or execution ownership |
| admin, governance, WL-admin, or control-plane state | Entirely outside lawful public-entry ownership |
| raw internal operational records | Public entry must use public-safe references and projections only |

Context-carry rules:

1. The contract may carry references and bounded entry context only.
2. Once authenticated continuity begins, carried entry context becomes reference-only and not the system of record.
3. Public-safe selected object context is lawful only when the underlying object was already lawful public-safe projection truth.
4. No carried context may be used to skip authentication, activation, or downstream eligibility checks.

## 7. Contract Stop Line

The exact stop line for the bounded public-entry resolution contract is:

| Surface / Responsibility | Lawful Owner |
| --- | --- |
| public entry input normalization and validation | bounded public-entry resolution contract |
| canonical public-entry resolution descriptor assembly | bounded public-entry resolution contract |
| public-safe entry framing, navigation presentation, and transition rendering using the descriptor | shared public shell |
| B2B public discovery objects and public-triggered inquiry / RFQ-intent semantics | pillar-specific B2B public surface |
| B2C public browse objects and public-triggered cart / wishlist semantics | pillar-specific B2C public surface |
| authenticated session establishment and authenticated runtime descriptor creation | downstream auth/session ownership |
| owner-ready / realm-ready activation checks | downstream post-auth eligibility ownership |
| downstream RFQ, checkout, account, order, trade, negotiation, and fulfillment continuity | downstream-authenticated surfaces |
| WL-admin and control-plane public exposure | excluded entirely |

Stop-line rules:

1. The contract owns authoritative entry resolution only.
2. The shell owns presentation and transition behavior that consumes the descriptor, but not the descriptor's authoritative truth.
3. Pillar-specific public surfaces own their own public objects and public-triggered semantics after entry resolution has targeted them.
4. Authenticated surfaces own all authenticated continuity immediately after the seam is crossed.
5. Public-entry resolution must never become a substitute for shell implementation, authenticated runtime implementation, or workflow ownership.

## 8. Expansion-Ready Guardrail

Future public-surface openings may extend this contract only by adding lawful pre-session input classes, resolution fields, or bounded handoff metadata without moving shell UI behavior, authenticated session logic, or downstream workflow ownership into the contract itself.

## 9. Non-Goals / Exclusions

This unit does not authorize:

- auth or session implementation
- route-tree or shell component implementation
- public shell UX design in full
- B2B, B2C, or Aggregator workflow implementation
- publication or projection implementation in full
- broad domain-routing redesign
- activation or onboarding implementation
- WL-admin or control-plane entry redesign
- implementation, runtime mutation, schema mutation, or control-plane mutation

## 10. Downstream Dependencies

Once locked, this contract is intended to be consumed by later bounded units that still must decide or open separately:

| Later Unit / Decision Area | What This Contract Supplies | What That Later Work Must Still Decide Separately |
| --- | --- | --- |
| `PUBLIC_ENTRY_TENANT_RESOLUTION_IMPLEMENTATION_SLICE` | one exact authoritative pre-session contract, lawful input/output vocabularies, and edge/server/client ownership split | exact runtime implementation of descriptor production and consumption for the supported entry paths |
| `SHARED_PUBLIC_SHELL_IMPLEMENTATION_SLICE` | exact descriptor contract and client stop line that the shell must consume | shell rendering mechanics, component structure, and navigation implementation |
| bounded B2B authenticated transition design | exact pre-auth B2B entry target and handoff seam | authenticated RFQ creation threshold, route continuity mechanics, and workflow start behavior |
| bounded B2C authenticated transition design | exact pre-auth B2C entry target and handoff seam | cart-to-auth behavior, checkout launch mechanics, and authenticated continuity handling |
| bounded Aggregator entry transition design | exact authenticated-entry-only Aggregator target class and contract stop line | qualified-entry launch behavior, workspace-entry mechanics, and handoff UX detail |

## 11. Decision Result

`BOUNDED_PUBLIC_ENTRY_RESOLUTION_CONTRACT_DESIGN_DRAFTED`

TexQtic now has one bounded contract-design artifact that defines the canonical public-entry contract purpose, lawful input classes, lawful output descriptor, ownership split across edge/server/client, entry-to-auth seam, context-carry rules, and exact ownership stop line without widening into implementation or downstream workflow design.
