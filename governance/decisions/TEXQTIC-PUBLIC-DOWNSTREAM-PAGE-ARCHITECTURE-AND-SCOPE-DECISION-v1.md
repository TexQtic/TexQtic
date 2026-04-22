# TEXQTIC — Public Downstream Page Architecture and Scope Decision v1

Decision ID: TEXQTIC-PUBLIC-DOWNSTREAM-PAGE-ARCHITECTURE-AND-SCOPE-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / public downstream page architecture
Date: 2026-04-22
Authorized by: Paresh
Decision class: Planning-only downstream page scope and architecture decision

---

## 1. Purpose of This Artifact

This decision defines the canonical page-level architecture and scope for the two downstream public pages
launched from the neutral public-entry homepage:

1. The public B2B sourcing discovery page (launched via "Start B2B sourcing")
2. The public B2C browse page (launched via "Browse products")

These downstream pages are the next public depth tier below the neutral homepage. Their object models,
boundary payloads, and authenticated stop lines are already locked in separate authority decisions.
This artifact defines:

- the page form factor within the app state machine
- what each page is and is not authorised to own
- the stop lines and CTA classes per page
- the ownership split between shell, page, and authenticated continuity
- the lawful implementation opening that follows

This is a planning-only artifact. It does not begin implementation and does not alter any existing
runtime files, Layer 0 control state, or prior locked authority decisions.

---

## 2. Baseline Accepted as Complete

The following are treated as accepted, verified, and closed baseline:

- `app.texqtic.com` is the branded neutral public-entry homepage, routing-first, not login-first
- `f108f0e` is the verified homepage baseline commit; stale-token fallback is production-verified and closed
- The neutral homepage already exposes `selectNeutralPublicEntryPath('B2B')` and
  `selectNeutralPublicEntryPath('B2C')` as entry path selectors
- Current runtime behavior: clicking either CTA sets `neutralEntryPathSelection` and scrolls to an
  in-page section — no dedicated downstream app state or page exists yet
- The `AppState` type has no `PUBLIC_B2B_DISCOVERY` or `PUBLIC_B2C_BROWSE` value today
- The following authority decisions are locked and consumed by this artifact:
  - `TEXQTIC-PUBLIC-MARKETPLACE-ARCHITECTURE-DECISION-v1` (B2B/B2C/Aggregator market-access model)
  - `TEXQTIC-PUBLIC-VS-AUTHENTICATED-SURFACE-BOUNDARY-DECISION-v1` (pillar boundary matrix)
  - `TEXQTIC-PUBLIC-VISIBILITY-AND-PROJECTION-MODEL-DECISION-v1` (tenant eligibility and projection)
  - `TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1` (B2B object model and inquiry)
  - `TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1` (B2C browse/cart model)
  - `TEXQTIC-PUBLIC-SHELL-AND-TRANSITION-ARCHITECTURE-DECISION-v1` (shell ownership boundaries)
  - `TEXQTIC-NEUTRAL-PLATFORM-PUBLIC-ENTRY-SURFACE-DECISION-v1` (neutral homepage composition)
  - `TEXQTIC-BOUNDED-PUBLIC-ENTRY-RESOLUTION-CONTRACT-DESIGN-v1` (public entry resolution)
  - `TEXQTIC-PUBLIC-TO-AUTHENTICATED-CONTINUATION-SEAM-DECISION-v1` (continuation seam model)

---

## 3. Planning Decision Basis

### 3.1 Why this is the lawful next move now

The homepage baseline is verified. It exposes B2B and B2C entry affordances. The downstream pages those
affordances point toward are not yet implemented. The object class authority, boundary rules, and
projection models for both downstream pages are all locked in prior decisions. The missing layer is the
page-level architecture definition: what form factor the downstream pages take within the app state
machine, what the pages own, and where they stop.

Creating this planning authority is the minimum necessary step before any bounded implementation slice
for either page can be opened. Without it, implementation would proceed without a fixed scope anchor,
risking scope drift.

### 3.2 Why implementation is not yet the next step

Two reasons:

1. The page-level form factor has not been decided as a matter of governance record — that gap closes here.
2. Neither downstream page has backend data that is live and public-safe-projected for the required
   object classes. Backend projection-readiness must be separately assessed before each implementation
   slice opens.

### 3.3 One artifact or two

**One artifact** is the lawful choice.

Both downstream pages are launched from the same neutral shell. Both face the same class of
page-architecture question (form factor within the SPA state machine). Both need the same type of
planning authority (scope, stop-line, CTA class, ownership split). Their object models are already
separately locked in dedicated decisions. Splitting this artifact into two would create redundant
shell-ownership and form-factor decisions rather than adding substance.

---

## 4. Page Form Factor Decision

### 4.1 Form Factor

Both downstream pages are governed as **dedicated `AppState` values** within the platform's public realm.
They are not in-page panel deepenings of `PUBLIC_ENTRY` and they are not independent browser routes.

The canonical `AppState` additions are:

| AppState Value | Page |
| --- | --- |
| `PUBLIC_B2B_DISCOVERY` | Public B2B sourcing discovery page |
| `PUBLIC_B2C_BROWSE` | Public B2C product browse page |

### 4.2 Rationale

- The locked shell architecture decision establishes that the neutral shell owns `TRANSITION_LAUNCH_CONTEXT`
  and `TRANSITION_CONFIRMATION_CONTEXT` but does not own downstream workflow depth.
- Promoting each downstream page to its own `AppState` value correctly expresses that separation: the
  shell handles the launch/transition; the downstream page owns its depth.
- The current in-page section / guidance-text pattern is a stop-gap affordance on the homepage, not the
  downstream page itself. The downstream pages are new, deeper public surfaces.
- Dedicated `AppState` values allow each page to be implemented, tested, and bounded separately.

### 4.3 Navigation Model

- `PUBLIC_ENTRY` → `PUBLIC_B2B_DISCOVERY`: transition triggered by `selectNeutralPublicEntryPath('B2B')`
  (currently scrolls to a section; to be upgraded to a state transition).
- `PUBLIC_ENTRY` → `PUBLIC_B2C_BROWSE`: transition triggered by `selectNeutralPublicEntryPath('B2C')`
  (currently scrolls to a section; to be upgraded to a state transition).
- Both downstream states must allow back-navigation to `PUBLIC_ENTRY`.
- Neither downstream state transitions into authenticated continuity by itself. Auth transitions
  originate from CTA actions within each page that explicitly invoke auth entry.

---

## 5. Page Purpose

### 5.1 Public B2B Discovery Page (`PUBLIC_B2B_DISCOVERY`)

**Canonical purpose:**

The public B2B discovery page is a governed public discovery and structured-intent entry surface that
lets business visitors inspect supplier-fit context, explore category and capability coverage, and start
non-binding inquiry or RFQ-intent entry — without exposing authenticated exchange workflow, pricing,
negotiation, or trade execution publicly.

It is **not** an anonymous public marketplace. It is a bounded, trust-governed, projection-only entry
surface for the B2B discovery and inquiry intake classes defined in
`TEXQTIC-B2B-PUBLIC-DISCOVERY-AND-INQUIRY-MODEL-DECISION-v1`.

### 5.2 Public B2C Browse Page (`PUBLIC_B2C_BROWSE`)

**Canonical purpose:**

The public B2C browse page is a projection-only, brand-safe, merchandising-safe public surface that
lets shoppers explore tenant-branded storefronts, browse published product and catalog context, and
capture cart or wishlist intent — without owning authenticated checkout, account continuity, order
history, or post-purchase workflow.

It is **not** full anonymous retail commerce. It is a bounded browse and intent-entry surface for the
B2C object classes defined in `TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1`.

---

## 6. Lawful Object Classes

All object classes below derive from locked authority decisions. No new object classes are introduced here.

### 6.1 Public B2B Discovery Page Object Classes

| Object Class | Authority Source |
| --- | --- |
| `SUPPLIER_DISCOVERY_PROFILE` | B2B discovery decision §2 |
| `SUPPLIER_CAPABILITY_PROFILE` | B2B discovery decision §2 |
| `CATEGORY_CAPABILITY_DISCOVERY_VIEW` | B2B discovery decision §2 |
| `BOUNDED_OFFERING_PREVIEW` | B2B discovery decision §2 |
| `TRUST_QUALIFICATION_PREVIEW` | B2B discovery decision §2 |

Public-safe payload categories allowed on this page (from B2B discovery decision §3.1):
- supplier identity
- trust / verification posture
- capability metadata
- category / segment coverage
- geography / MOQ / qualification context
- bounded offering preview
- inquiry entry context
- RFQ-intent entry context
- publication / availability posture

Prohibited payload categories (from B2B discovery decision §3.2):
- transactional pricing
- negotiation state
- messaging continuity
- RFQ workflow continuity
- order / trade execution state
- admin / governance-only state
- raw internal operational records
- buyer-specific or supplier-specific authenticated continuity

### 6.2 Public B2C Browse Page Object Classes

| Object Class | Authority Source |
| --- | --- |
| `STOREFRONT_LANDING_OBJECT` | B2C browse decision §2 |
| `CATALOG_BROWSE_OBJECT` | B2C browse decision §2 |
| `PRODUCT_DETAIL_OBJECT` | B2C browse decision §2 |
| `COLLECTION_MERCHANDISING_OBJECT` | B2C browse decision §2 |
| `STOREFRONT_TRUST_CONFIDENCE_OBJECT` | B2C browse decision §2 |
| `CART_INTENT_ENTRY_OBJECT` | B2C browse decision §2 |
| `WISHLIST_INTENT_ENTRY_OBJECT` | B2C browse decision §2 |

Public-safe payload categories allowed on this page (from B2C browse decision §3.1):
- storefront identity / tenant brand context
- public merchandising metadata
- catalog / product browse metadata
- public-safe product detail
- public pricing visibility (B2C public items only)
- shopper-facing trust signals
- cart-entry context
- wishlist-entry context
- publication / availability posture

Prohibited payload categories (from B2C browse decision §3.2):
- authenticated checkout state
- order / returns continuity
- authenticated account continuity
- seller / admin controls
- private fulfillment state
- private post-purchase workflow state
- raw internal operational records
- hidden, draft, or review-only publication state

---

## 7. Stop Lines

### 7.1 Public B2B Discovery Page Stop Line

The public B2B discovery page **must stop** before any of the following begin:

| Stop Condition | What Happens Instead |
| --- | --- |
| RFQ workflow initiation | Auth entry CTA fires; `selectNeutralPublicEntryPath` → `AUTH` transition |
| Pricing visibility | Not rendered; price posture shown as "post-auth" or "price on request" only |
| Negotiation context | Not rendered; authentication required |
| Messaging thread | Not rendered; authentication required |
| Order workflow | Not rendered; authentication required |
| Governed trade execution | Not rendered; authentication required |
| Buyer or supplier account continuity | Not rendered; authentication required |
| Admin / governance / moderation state | Not rendered; excluded from projection at source |

The page may render inquiry-initiation and RFQ-intent capture as public-triggered entry objects only.
It must not own the downstream workflow those actions feed into.

### 7.2 Public B2C Browse Page Stop Line

The public B2C browse page **must stop** before any of the following begin:

| Stop Condition | What Happens Instead |
| --- | --- |
| Checkout initiation | Auth entry CTA fires; page transitions to `AUTH` realm |
| Account continuity | Not rendered; authentication required |
| Order history | Not rendered; authentication required |
| Returns / post-purchase workflow | Not rendered; authentication required |
| Seller / admin controls | Not rendered; excluded from projection at source |
| Hidden / draft / staging product state | Not rendered; only publication-eligible objects exposed |
| Private fulfillment state | Not rendered; excluded from projection at source |

The page may render cart-intent and wishlist-intent as public-triggered entry objects. It must not own
authenticated checkout, account, or post-purchase continuity.

---

## 8. CTA Model

### 8.1 Public B2B Discovery Page CTA Classes

| CTA Class | Lawful | Notes |
| --- | --- | --- |
| `BROWSE_CATEGORY` | ✅ | Navigate within the discovery page by category or segment |
| `OPEN_SUPPLIER_DISCOVERY` | ✅ | Open a `SUPPLIER_DISCOVERY_PROFILE` or `SUPPLIER_CAPABILITY_PROFILE` from a list |
| `INQUIRY_INITIATION` | ✅ | Public-triggered, non-binding inquiry intake form launch |
| `RFQ_INTENT_INITIATION` | ✅ | Public-triggered structured RFQ-intent capture launch |
| `SIGN_IN_TO_CONTINUE` | ✅ | Explicit auth entry CTA; transitions to `AUTH` state (TENANT realm) |
| `BACK_TO_HOME` | ✅ | Back-navigation to `PUBLIC_ENTRY` state |
| `REQUEST_ACCESS` | ✅ (supplier path only) | Supplier registration interest only; points to `SUPPLIER_REQUEST_ACCESS_URL` |
| `OPEN_FULL_RFQ` | ❌ | Authenticated B2B workflow; not permitted on public page |
| `VIEW_PRICING` | ❌ | Authenticated B2B scope; not permitted |
| `OPEN_NEGOTIATION` | ❌ | Authenticated B2B scope; not permitted |
| `OPEN_MESSAGING_THREAD` | ❌ | Authenticated B2B scope; not permitted |

CTA anchor note: The existing `openSecondaryAuthenticatedEntry('TENANT')` handler in App.tsx is the
correct auth transition target for `SIGN_IN_TO_CONTINUE` on this page.

### 8.2 Public B2C Browse Page CTA Classes

| CTA Class | Lawful | Notes |
| --- | --- | --- |
| `BROWSE_CATALOG` | ✅ | Browse published catalog within the browse page |
| `OPEN_PRODUCT_DETAIL` | ✅ | Open a `PRODUCT_DETAIL_OBJECT` from a browse list |
| `OPEN_STOREFRONT` | ✅ | Navigate to a `STOREFRONT_LANDING_OBJECT` within the browse page |
| `CART_INTENT_ADD` | ✅ | Attach a product/option selection to pre-auth cart-intent context |
| `WISHLIST_INTENT_SAVE` | ✅ | Attach a product selection to pre-auth wishlist-intent context |
| `SIGN_IN_TO_CHECKOUT` | ✅ | Explicit auth entry CTA from cart-intent; transitions to `AUTH` state (TENANT realm) |
| `SIGN_IN_TO_CONTINUE` | ✅ | General auth entry CTA for account continuity path |
| `BACK_TO_HOME` | ✅ | Back-navigation to `PUBLIC_ENTRY` state |
| `PROCEED_TO_CHECKOUT` | ❌ | Authenticated B2C commerce; not permitted on public page |
| `VIEW_ORDER_HISTORY` | ❌ | Authenticated B2C scope; not permitted |
| `SELLER_ADMIN_ACTION` | ❌ | Seller/admin controls; not permitted |

CTA anchor note: The existing `openSecondaryAuthenticatedEntry('TENANT')` handler in App.tsx is the
correct auth transition target for `SIGN_IN_TO_CHECKOUT` and `SIGN_IN_TO_CONTINUE` on this page.

---

## 9. Ownership Split

### 9.1 Public B2B Discovery Page Ownership

| Owned By | What It Owns |
| --- | --- |
| Neutral shell (`PUBLIC_ENTRY`) | Launch transition to `PUBLIC_B2B_DISCOVERY`; back-navigation capability; public realm navigation and header affordances |
| Public B2B discovery page (`PUBLIC_B2B_DISCOVERY`) | Rendering of all B2B public discovery object classes; inquiry-initiation and RFQ-intent capture prompts; back-CTA to shell; sign-in-to-continue CTA |
| Authenticated tenant workspace (post-auth) | RFQ workflow; pricing context; negotiation; messaging threads; order workflow; trade execution; buyer account continuity |
| CRM / request-access continuity | Supplier-side request-access and onboarding only; not buyer workflow |
| Aggregator layer | Discovery intelligence and qualified handoff consumed only where Aggregator has explicit public-safe authorization under its own locked decisions; Aggregator does not become a public-facing directory by default |

### 9.2 Public B2C Browse Page Ownership

| Owned By | What It Owns |
| --- | --- |
| Neutral shell (`PUBLIC_ENTRY`) | Launch transition to `PUBLIC_B2C_BROWSE`; back-navigation capability; public realm navigation and header affordances |
| Public B2C browse page (`PUBLIC_B2C_BROWSE`) | Rendering of all B2C public browse object classes; cart-intent and wishlist-intent entry capture; back-CTA to shell; sign-in-to-checkout/continue CTA |
| Authenticated tenant workspace / B2C commerce (post-auth) | Checkout; order history; returns; post-purchase workflow; authenticated account continuity |
| Tenant-branded B2C surface (post-auth) | Seller controls, storefront administration, and non-public storefront depth belong in the authenticated experience context, not the public browse page |

### 9.3 Shared Ownership Constraints

- The neutral shell does not own rendering depth for either downstream page — it owns launch and transition only.
- Neither downstream page owns authenticated workflow — those continuities begin only after auth.
- Both pages must be back-navigable to `PUBLIC_ENTRY`.
- Both pages share the same public-safe projection discipline: render from governed projections only,
  not raw operational records.
- `org_id` tenant-scoping applies within each downstream page for any tenant-bound objects it renders;
  the public pages must not accidentally leak cross-tenant object context.

---

## 10. Page Relationship

The two downstream pages are **independently scoped** but **architecturally parallel**:

- They are both `AppState` siblings within the public realm.
- They have distinct object models, CTA classes, and stop lines.
- They share the same shell transition model, back-navigation requirement, and projection discipline.
- They may be implemented independently in separate bounded slices.

One combined planning artifact is the lawful form for this decision. Their object model depth is already
separately locked in dedicated authority decisions. What remains identical in structure across both pages
(form factor, ownership split pattern, projection discipline, shell transition model) is best captured
once rather than duplicated.

---

## 11. Implementation Implication

### 11.1 What this planning artifact makes lawful

This artifact makes the following bounded implementation slices lawful to open:

| Slice | Scope |
| --- | --- |
| `PUBLIC_B2B_DISCOVERY_IMPLEMENTATION_SLICE` | Implement the `PUBLIC_B2B_DISCOVERY` AppState, its discovery page component, object rendering for lawful B2B public object classes, inquiry/RFQ-intent capture surfaces, and back/auth CTA wiring |
| `PUBLIC_B2C_BROWSE_IMPLEMENTATION_SLICE` | Implement the `PUBLIC_B2C_BROWSE` AppState, its browse page component, object rendering for lawful B2C public object classes, cart/wishlist intent capture, and back/auth CTA wiring |

### 11.2 Implementation sequencing

B2B and B2C implementation slices should be opened and executed **separately**, not together.
Reasons:
- different object models and backend projection dependencies
- different pillar scope (B2B exchange discovery vs B2C consumer browse)
- different data readiness conditions (B2B requires supplier-eligible public projections;
  B2C requires B2C-eligible tenant storefronts and product projections)
- separate slices allow cleaner verification and scope control

Neither slice may open until:
1. This planning artifact exists in governance record (satisfied by this file)
2. A readiness assessment confirms at least one eligible public-safe object exists for the pillar
   (supplier or storefront/product) that the page can render without rendering placeholder content
3. Layer 0 product delivery priority is lifted from `NONE_OPEN` for the target slice

### 11.3 What this artifact does not authorize

- It does not authorize the opening of either implementation slice immediately.
- It does not authorize backend projection-model implementation or Prisma schema changes.
- It does not authorize any changes to App.tsx, routes, or runtime files today.
- It does not authorize broader marketplace or full-commerce depth beyond the defined stop lines.

---

## 12. Truth-Preservation Confirmations

This artifact is confirmed to preserve all of the following structural truths:

| Truth | Status |
| --- | --- |
| B2B public page is discovery / inquiry entry only, not authenticated workflow continuity | ✅ Preserved |
| B2C public page is public browse with controlled commerce boundary, not authenticated checkout | ✅ Preserved |
| Neutral public shell owns launch/transition, not downstream workflow runtime | ✅ Preserved |
| Authenticated continuity (exchange, checkout, account) remains separate | ✅ Preserved |
| Request-access / issued-access / tenant / staff lane separation intact | ✅ Preserved |
| Anonymous B2B marketplace depth (exchange workflow, pricing, negotiation) excluded | ✅ Preserved |
| No generic anonymous marketplace sprawl introduced | ✅ Preserved |
| Aggregator is not a public-facing directory by default | ✅ Preserved |
| Public surfaces render from governed projections, not raw operational records | ✅ Preserved |
| `org_id` tenant-scoping applies within public pages for tenant-bound objects | ✅ Preserved |

---

## 13. Audit Trail

| Field | Value |
| --- | --- |
| Authorized by | Paresh |
| Date | 2026-04-22 |
| Predecessor decisions consumed | All listed in §2 |
| Layer 0 posture at this date | `HOLD-FOR-BOUNDARY-TIGHTENING`, `product_delivery_priority: NONE_OPEN` |
| Runtime baseline at this date | `ac17297` (HEAD — governance close for stale-token cycle), `f108f0e` (homepage stale-token fix) |
| Planning class | Planning-only; no runtime files changed; no Layer 0 drift |
| Next authorized action | Readiness assessment for each downstream page before implementation slice opens |
