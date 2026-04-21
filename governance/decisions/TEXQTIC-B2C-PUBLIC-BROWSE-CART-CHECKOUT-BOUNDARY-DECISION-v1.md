# TEXQTIC — B2C Public Browse Cart Checkout Boundary Decision v1

Decision ID: TEXQTIC-B2C-PUBLIC-BROWSE-CART-CHECKOUT-BOUNDARY-DECISION-v1
Status: DECIDED
Scope: Governance / product-truth / B2C public browse cart checkout boundary
Date: 2026-04-21
Authorized by: Paresh
Decision class: Planning-only B2C public-surface decision

## 1. B2C Browse Principle

TexQtic B2C public browse exists to let shoppers inspect a tenant-branded storefront, browse lawful public-safe catalog and merchandising context, and start cart or wishlist intent without converting the public surface into full anonymous commerce continuity or public post-purchase workflow ownership.

The controlling rule is:

- B2C public browse is projection-only, brand-safe, merchandising-safe, and entry-oriented
- public browse may expose lawful public product and storefront context, including public price where approved, but not authenticated checkout, account, or post-purchase continuity
- cart intent and wishlist intent are public-triggered entry mechanisms, not authenticated commerce continuity by themselves
- authenticated checkout, account continuity, order history, returns, and post-purchase workflow remain downstream-authenticated ownership

Current-truth guardrail:

This artifact is planning authority only. It preserves current repo truth that B2C public browse is real in bounded form while deeper commerce continuity remains tenant-scoped and authenticated under current truth. It does not claim anonymous full-commerce runtime depth is already live.

## 2. Public Browse Object Model

The canonical B2C public browse object classes are:

| Browse Object Class | Purpose | Boundary Rule |
| --- | --- | --- |
| `STOREFRONT_LANDING_OBJECT` | Public-safe tenant-branded storefront entry and browse framing | Lawful only as public-safe entry and brand context, not as authenticated commerce continuity |
| `CATALOG_BROWSE_OBJECT` | Public-safe browse/list/search/filter/compare surface for published catalog items | Must remain browse and inspection depth, not authenticated transaction state |
| `PRODUCT_DETAIL_OBJECT` | Public-safe item-level product inspection surface | May expose lawful public detail and public price, but not checkout or post-purchase continuity |
| `COLLECTION_MERCHANDISING_OBJECT` | Public-safe collection, promotion, or merchandising grouping attached to storefront browse | Must remain truthful merchandising context backed by lawful product-data continuity |
| `STOREFRONT_TRUST_CONFIDENCE_OBJECT` | Public-safe tenant/storefront trust signals and shopper-confidence cues | Must remain trust preview, not admin/governance or seller-control state |
| `CART_INTENT_ENTRY_OBJECT` | Public-triggered cart-entry surface attached to browse or detail context | Entry-only object; does not itself become authenticated checkout continuity |
| `WISHLIST_INTENT_ENTRY_OBJECT` | Public-triggered saved-interest or later-interest entry surface attached to browse or detail context | Entry-only object; does not itself become authenticated account continuity |

Object model rules:

1. These objects are lawful only when rendered from governed public-safe projections of B2C-eligible tenants and B2C-public or BOTH-public objects.
2. The browse objects may be composed in one storefront surface, but their canonical roles remain distinct.
3. Cart-intent and wishlist-intent entry may attach to browse objects, but those entry actions do not convert the browse objects into checkout, account, order, or post-purchase workflow objects.
4. No object class in this unit authorizes a public checkout object, public account object, public order-history object, public returns object, or seller/admin control object.

## 3. Public-Safe Browse Payload Model

### 3.1 Allowed B2C Public-Safe Payload Categories

The canonical allowed B2C public-safe payload categories are:

| Payload Category | Meaning In This Unit |
| --- | --- |
| storefront identity / tenant brand context | Tenant/storefront identity, brand framing, and lawful storefront summary suitable for shopper-facing browse |
| public merchandising metadata | Merchandising copy, collection framing, preview imagery, promotional framing, and browse-facing storefront context |
| catalog / product browse metadata | Browse/list/detail metadata suitable for public inspection, comparison, and search/filter continuity |
| public-safe product detail | Item-level descriptive detail, option-preview context, and lawful product inspection detail that remains pre-checkout |
| public pricing visibility | Public price or lawful public pricing posture for B2C-public items |
| shopper-facing trust signals | Storefront trust cues, tenant confidence signals, and shopper-safety context suitable for public browse |
| cart-entry context | Public-safe context explaining what item, option, quantity band, or storefront selection may enter cart intent |
| wishlist-entry context | Public-safe context explaining what item or later-interest selection may enter wishlist intent |
| publication / availability posture | Whether an item is publicly published and lawfully available for public browse-entry context |

### 3.2 Prohibited B2C Public Categories

The following categories are prohibited from B2C public browse payloads:

| Prohibited Category | Why It Is Prohibited |
| --- | --- |
| authenticated checkout state | Checkout begins only after authentication under current boundary authority |
| order / returns continuity | Order history, returns, and post-purchase continuity remain downstream-authenticated |
| authenticated account continuity | User-bound account state is not public-safe |
| seller / admin controls | Seller/admin operations and controls are not part of lawful public browse |
| private fulfillment state | Fulfillment or after-order execution state is not public-safe browse data |
| private post-purchase workflow state | Post-purchase workflow continuity remains outside the public browse/cart boundary |
| raw internal operational records | Public browse must not render directly from internal commerce or admin records |
| hidden, draft, or review-only publication state | Internal staging or review posture is not public-safe browse data |

Payload discipline rule:

Public-safe B2C browse payloads must be projected from governed public-safe categories only and must not leak authenticated checkout, account, seller/admin, or post-purchase continuity through direct fields, derived fields, or operational joins.

## 4. Cart-Intent Model

The canonical public cart-intent model is:

- cart intent is a public-triggered, pre-checkout, TexQtic-governed entry-context object
- it may exist before authentication as public-entry or pre-auth session context
- it captures enough selection context to preserve a truthful transition toward checkout without becoming authenticated checkout continuity by itself

Minimum lawful pre-auth cart-intent context is limited to categories such as:

- storefront or tenant context
- selected product or item identity
- selected variant or option context where publicly exposed
- quantity or quantity-band context
- shopper-facing price visibility already lawful on the browse surface

Cart-intent ownership rule:

1. The public surface owns only the cart-entry prompt and browse-attached selection context.
2. TexQtic may own the resulting pre-auth cart-intent preview or temporary entry context.
3. Cart intent remains pre-checkout entry context and does not by itself become authenticated checkout or account continuity.
4. Authenticated shopper continuity begins only when the user crosses into checkout or another authenticated downstream commerce surface.
5. Seller or tenant operational ownership does not extend into the public cart-intent object beyond the published storefront and item truth that fed it.

## 5. Wishlist-Intent Model

The canonical public wishlist-intent model is:

- wishlist intent is distinct from cart intent
- it is the lighter-weight public-triggered saved-interest or later-interest bridge
- it may capture product-interest context before authentication, but it does not create authenticated account continuity by itself

Minimum lawful pre-auth wishlist-intent context is limited to categories such as:

- storefront or tenant context
- selected product or item identity
- selected variant or preference context where publicly exposed
- public-safe merchandising or product-interest context needed to explain the saved-interest action

Wishlist ownership rule:

1. The public surface owns the wishlist-entry prompt and the minimal browse-attached selection context.
2. TexQtic may own a bounded pre-auth saved-interest preview or transition bridge.
3. Wishlist intent does not become account-owned continuity until it is attached to an authenticated shopper account or authenticated downstream continuity surface.
4. Wishlist intent does not authorize public account history, saved-list management depth, or post-purchase continuity.

Cart intent versus wishlist intent distinction:

- cart intent is the nearer-term execution bridge toward checkout
- wishlist intent is the lighter saved-interest bridge toward later authenticated continuity
- neither one authorizes authenticated checkout, account, order, or returns continuity on the public surface

## 6. Checkout / Account Handoff Model

The precise ownership stop line is:

| Surface / Responsibility | Lawful Owner In This Unit |
| --- | --- |
| public storefront and browse object rendering | public-safe projection surface |
| public cart-intent entry prompt | public-triggered entry surface |
| public wishlist-intent entry prompt | public-triggered entry surface |
| pre-auth cart or wishlist entry context | TexQtic governed entry ownership |
| authenticated checkout continuity | downstream-authenticated commerce ownership |
| authenticated account continuity | downstream-authenticated account ownership |
| order history, returns, and post-purchase continuity | downstream-authenticated post-purchase ownership |

Handoff rules:

1. The public B2C surface may own storefront entry, browse, merchandising context, product inspection, and public-triggered cart/wishlist entry only.
2. TexQtic may own the public-triggered pre-auth entry context that bridges browse intent toward downstream-authenticated continuity.
3. Shopper-facing authenticated continuity begins only when the shopper enters authenticated checkout, account, order, or post-purchase surfaces.
4. Tenant/storefront ownership in this unit ends at published storefront and item truth plus lawful public entry context; it does not extend into authenticated checkout/account workflow ownership.
5. The public surface is excluded from owning checkout progression, account state, order history, returns handling, fulfillment progression, or private after-order workflow state.

## 7. Expansion-Ready Guardrail

Future richer B2C commerce surfaces are lawful only if later bounded authority explicitly extends pre-auth convenience or transition depth without collapsing the current stop line that checkout, account, order, and returns continuity remain downstream-authenticated ownership rather than public browse/cart ownership.

## 8. Non-Goals / Exclusions

This unit does not authorize:

- full checkout workflow design
- payment system or payment-architecture design
- order history or returns workflow design
- authenticated account system behavior in full
- public post-purchase workflow ownership
- B2C ranking or search algorithm design in full
- shell UX or route-transition design in full
- implementation, runtime mutation, schema mutation, or control-plane mutation
- anonymous full-commerce runtime claims or open-bazaar retail claims

## 9. Downstream Dependencies

This decision is intended to be consumed by later bounded units that still must decide separately:

| Later Unit / Decision Area | What This Decision Supplies | What That Later Work Must Still Decide Separately |
| --- | --- | --- |
| bounded checkout workflow design | the exact stop line between public cart intent and authenticated checkout ownership | checkout record shape, auth threshold details, validation flow, and execution transitions |
| bounded account / wishlist continuity design | the stop line between public wishlist intent and authenticated account continuity | saved-list/account attachment rules, account history depth, and authenticated persistence behavior |
| bounded orders / returns / post-purchase design | public exclusion of order history, returns, and post-purchase from browse/cart ownership | order lifecycle, returns handling, and after-order continuity behavior |
| `PUBLIC_SHELL_AND_TRANSITION_ARCHITECTURE` | the B2C public-entry surface stop line and authenticated handoff requirement | exact shell, route, and public-to-authenticated transition behavior |

## 10. Decision Result

`B2C_PUBLIC_BROWSE_CART_CHECKOUT_BOUNDARY_DRAFTED`

TexQtic now has one bounded decision artifact that defines the lawful B2C public browse object model, public-safe browse payload categories, cart-intent model, wishlist-intent model, and the checkout/account handoff boundary without widening into full authenticated B2C workflow design.
