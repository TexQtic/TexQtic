# D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
## D2C Early Access Auth Handoff Design

**Unit ID:** D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001
**Family:** D2C Public Projection Governance
**Status:** PROPOSED
**Date:** 2026-07-13
**Authorized by:** Paresh
**Artifact class:** Governance design — planning-only
**Placement:** Repo root (consistent with D2C-ORIGIN-STORYTELLING-GOVERNANCE-001, PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001, PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001, COLLECTION-PASSPORT-TYPE-DISCRIMINATOR-DECISION-001)

---

## 1. Status Summary

| Field | Value |
|---|---|
| Unit ID | D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001 |
| Status | PROPOSED |
| Scope | Public collection CTA → authenticated continuation handoff semantics |
| Blocking | None |
| Depends on | PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001, PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001, D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 |
| Implementation gate | NOT YET OPEN — design-only |
| Post-auth context | DEFERRED to implementation unit |

**Purpose of this unit:**

This unit defines the governance rules for how public collection CTAs safely invite users into an authenticated context — without creating public commerce, public checkout, public RFQ, public buyer-intent, or any other transactional behavior. It governs the CTA metadata model, the allowed and forbidden action types, the public-to-auth boundary rules, what metadata may and may not cross the boundary, and the fallback/failure states when the handoff cannot proceed.

This unit does NOT govern what happens after a user successfully authenticates (post-auth continuation context). That is explicitly deferred to a downstream implementation unit.

---

## 2. Current Repo Truth

### 2.1 Auth Entry Mechanism (Current)

Auth entry is **modal/programmatic** via `openSecondaryAuthenticatedEntry('TENANT')` in `App.tsx`.

There is **no standalone `/auth` URL route** as a discrete navigable page path in the current routing implementation.

The `target: "/auth"` value used in projection CTA shapes is a **conceptual target** representing the intent to launch the auth entry surface. Implementation must resolve this to the actual auth entry pattern in effect.

**Adjacent finding (implementation-gated):**
The gap between the conceptual `target: "/auth"` in projection designs and the actual modal-based `openSecondaryAuthenticatedEntry('TENANT')` entry mechanism is an implementation-gated concern. This unit records the gap; resolution is deferred to the implementation unit that wires up the public collection CTAs.

### 2.2 App State Routing (Current)

| Path Pattern | App State | Component |
|---|---|---|
| `/collections` | `PUBLIC_COLLECTIONS` | `PublicCollectionsStub` |
| `/collections/:slug` | `PUBLIC_COLLECTION_DETAIL_UNAVAILABLE` | `PublicCollectionUnavailable` |

Both public collection states are currently stub/unavailable placeholders. No runtime projection is implemented.

### 2.3 Public Collection Components (Current)

- `components/Public/PublicCollectionsStub.tsx` — stub-only; presents safe placeholder copy.
- `components/Public/PublicCollectionUnavailable.tsx` — safe unavailable placeholder for `/collections/:slug`. Explicitly states it does not expose private collection data and does not confirm implemented runtime collection semantics.

Neither component currently renders a live authenticated CTA.

### 2.4 Auth Components (Current)

`AuthForm`, `ForgotPassword`, `VerifyEmail`, `TokenHandler` are imported in `App.tsx` from `components/Auth/`. Auth is managed via `authService` and the auth context. Auth state must not be read outside of established patterns.

### 2.5 Related Governance (Current)

- `TEXQTIC-PUBLIC-TO-AUTHENTICATED-CONTINUATION-SEAM-DECISION-v1.md` — DECIDED (2026-04-21): defines the lawful state classes for authenticated entry from public surfaces. The D2C public collection CTA falls in the `ACTIVE_TENANT_WORKSPACE_USER` / `ELIGIBLE_FOR_AUTHENTICATED_ENTRY` class — it is an invitation to authenticate, not a CRM onboarding continuation or issued access path.
- `PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001.md` — committed: defines CTA shape for list surface.
- `PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001.md` — committed: defines CTA shape for detail surface.
- `D2C-ORIGIN-STORYTELLING-GOVERNANCE-001.md` — committed: defines copy rules and story context.

---

## 3. Handoff Purpose

### 3.1 What This Handoff Is

The D2C early access auth handoff is the mechanism by which the **public collection surface** (list and detail) safely invites a visitor to authenticate in order to access a richer authenticated context — such as an authenticated collection view, supplier sourcing context, or other authenticated-only platform capability.

The handoff is:
- **Public-safe** — no private data passes through the CTA metadata.
- **Non-transactional** — no checkout, no cart, no RFQ, no order, no pricing, no inventory, no buyer-intent payload crosses the boundary.
- **Intent-declared** — the CTA declares its surface, slug, and continuation intent in the metadata so the receiving auth surface can present appropriate context.
- **Auth-gated** — all continuation is conditional on the user successfully authenticating.
- **Fail-closed** — any failure, missing slug, invalid path, or unavailable feature results in a safe unavailable state.

### 3.2 What This Handoff Is Not

The handoff is explicitly NOT:
- A public commerce entry point.
- A buyer-intent entry point (no RFQ, no sourcing request, no negotiation trigger).
- A CRM intake or qualification continuation.
- A provisional or issued-access activation continuation.
- A collection-level DPP or passport gating mechanism.
- A substitute for an authenticated collection implementation.
- A promise that any specific authenticated feature exists post-auth.

### 3.3 Position in the D2C Public Projection Stack

```
[Public Collection List] ──CTA──► [Auth Handoff]
[Public Collection Detail] ──CTA──► [Auth Handoff]
                                         │
                                    [Auth Entry]
                                         │
                           [Post-Auth Continuation]  ← DEFERRED
```

This unit governs the `[Auth Handoff]` layer only. The `[Post-Auth Continuation]` layer is deferred.

---

## 4. CTA Metadata Model

### 4.1 List Surface CTA Shape

```json
{
  "label": "<copy governed by Section 9>",
  "action": "AUTH_CONTINUE",
  "target": "/auth",
  "intent": "COLLECTION_CONTINUATION",
  "sourceSurface": "COLLECTION_LIST",
  "collectionSlug": "<public-safe slug string>",
  "returnTo": "<public-safe path — constrained per Section 8>",
  "authRequired": true
}
```

Source: `PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001.md`, Section 10 (Authenticated CTA Rules).

### 4.2 Detail Surface CTA Shape

```json
{
  "label": "<copy governed by Section 9>",
  "action": "AUTH_CONTINUE",
  "target": "/auth",
  "intent": "COLLECTION_DETAIL_CONTINUATION",
  "sourceSurface": "COLLECTION_DETAIL",
  "collectionSlug": "<public-safe slug string>",
  "returnTo": "<public-safe path — constrained per Section 8>",
  "authRequired": true
}
```

Source: `PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001.md`, Section 10 (Authenticated CTA Rules).

### 4.3 CTA Metadata Field Definitions

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | yes | User-visible CTA label. Governed by Section 9. |
| `action` | string enum | yes | The CTA action type. See Section 5 for allowed values. |
| `target` | string | yes | Conceptual auth target path. Implementation must resolve to actual auth entry mechanism. |
| `intent` | string enum | yes | Continuation intent class. Informs the receiving auth surface of the user's intended continuation. |
| `sourceSurface` | string enum | yes | Surface the CTA was rendered on: `COLLECTION_LIST` or `COLLECTION_DETAIL`. |
| `collectionSlug` | string | yes | The public-safe slug of the collection. Must be a public-safe slug only. No internal IDs. |
| `returnTo` | string | yes | The public-safe path to return to after auth. Constrained per Section 8. |
| `authRequired` | boolean | yes | Always `true` for this CTA class. Must not be `false` or omitted. |

### 4.4 CTA Metadata Transmission Rules

- CTA metadata travels only from the public surface to the auth surface.
- CTA metadata must not be stored server-side as part of a public request.
- CTA metadata must not be logged or exposed in server-side audit traces that mix with tenant-scoped audit records.
- CTA metadata may be stored transiently in session state on the client side to support the `returnTo` redirect after successful auth.
- CTA metadata must be validated by the implementation before use (see Section 10 for security rules).

---

## 5. Allowed CTA Actions

The following `action` values are allowed on public collection surfaces:

| Action | Meaning | Conditions |
|---|---|---|
| `AUTH_CONTINUE` | Invite the user to authenticate in order to continue to an authenticated context. | Always allowed on public collection surfaces. Primary action class for this unit. |
| `REQUEST_ACCESS_CONTINUE` | Invite the user to authenticate and then request access to a specific authenticated capability. | Allowed only where a non-transactional access request path exists post-auth. Must be auth-gated. Must not imply transactional intent. Must not pre-submit any request before auth. |
| `EXPRESS_INTEREST_CONTINUE` | Invite the user to authenticate and then express interest in a capability. | Allowed only where explicitly approved as a non-transactional, auth-gated feature. Must not imply buyer-intent, pricing, or inventory context. |
| `VIEW_AUTH_CONTEXT` | Invite the user to authenticate to view an authenticated view of the collection or related context. | Allowed. Non-transactional. Scoped to viewing only. |

### 5.1 Allowed Action Constraints

All allowed actions share these constraints:
- All are auth-gated (`authRequired: true`).
- All are non-transactional.
- None pre-submit, pre-commit, or pre-queue any workflow payload.
- None expose pricing, inventory, or private supplier data in the CTA metadata.
- None imply buyer-intent behavior.

---

## 6. Forbidden CTA Actions

The following action types are **unconditionally forbidden** on public collection surfaces:

| Forbidden Action | Reason |
|---|---|
| `CHECKOUT` | Commerce intent — forbidden on public surfaces. |
| `ADD_TO_CART` | Commerce intent — forbidden on public surfaces. |
| `BUY_NOW` | Commerce intent — forbidden on public surfaces. |
| `WISHLIST` | Implied buyer-intent — forbidden on public surfaces. |
| `ORDER_NOW` | Commerce intent — forbidden on public surfaces. |
| `SUBMIT_RFQ_PUBLIC` | Public RFQ — forbidden. RFQ is an authenticated tenant-plane workflow. |
| `REQUEST_QUOTE_PUBLIC` | Public quote request — forbidden. |
| `VIEW_PRICING_PUBLIC` | Public pricing exposure — forbidden. |
| `VIEW_INVENTORY_PUBLIC` | Public inventory exposure — forbidden. |
| `START_NEGOTIATION_PUBLIC` | Public negotiation — forbidden. |
| `OPEN_SUPPLIER_CONTACT_PUBLIC` | Public supplier contact — forbidden. Private supplier identity must not be exposed through public CTAs. |
| `SAVE_PRODUCT_PUBLIC` | Implied persistent buyer state on public surface — forbidden. |
| `TRACK_COLLECTION_PUBLIC` | Implied persistent tracking intent — forbidden. |
| `COMPARE_PUBLIC` | Product comparison as buyer workflow — forbidden on public surfaces. |

### 6.1 Forbidden Action Override Rule

No prompt, product request, or implementation note may add a forbidden CTA action to a public collection surface without:
1. An explicit governance decision recorded in `governance/decisions/`.
2. A review of all downstream implications for tenant isolation, buyer-intent scoping, and platform-position doctrine.
3. Explicit written authorization from Paresh.

---

## 7. Public-to-Auth Boundary Rules

### 7.1 What May Cross the Boundary

The following data categories are **allowed** in CTA metadata crossing the public-to-auth boundary:

| Data Category | Example | Allowed |
|---|---|---|
| Public-safe slug | `"collection-slug-string"` | ✅ Yes |
| Source surface identifier | `"COLLECTION_LIST"`, `"COLLECTION_DETAIL"` | ✅ Yes |
| Continuation intent | `"COLLECTION_CONTINUATION"`, `"COLLECTION_DETAIL_CONTINUATION"` | ✅ Yes |
| CTA action type | `"AUTH_CONTINUE"` | ✅ Yes |
| CTA label | `"Continue after sign-in"` | ✅ Yes |
| authRequired flag | `true` | ✅ Yes |
| returnTo path | `/collections/:slug` or `/collections` | ✅ Yes (constrained per Section 8) |

### 7.2 What Must Not Cross the Boundary

The following data categories are **forbidden** from crossing the public-to-auth boundary:

| Forbidden Data Category | Example | Reason |
|---|---|---|
| Internal collection ID | `UUID or internal database ID` | Private — not public-safe |
| Tenant / org ID | `org_id` or any tenant identifier | Tenant isolation — never in public payloads |
| Supplier private ID | any private supplier identifier | Supplier privacy — must not be public |
| Private supplier name or contact | any private supplier record field | Supplier privacy |
| Evidence IDs | DPP ID, passport ID, certification ID | Internal — not public-safe |
| Internal node ID | any internal supply chain node reference | Internal — not public-safe |
| Pricing data | price, MOQ, pricing tier | Commerce — forbidden on public surfaces |
| Inventory data | stock level, availability flag | Commerce — forbidden on public surfaces |
| RFQ payload | any RFQ or quote intent payload | RFQ is tenant-plane — not public |
| Order intent | any order or cart payload | Commerce — forbidden on public surfaces |
| Buyer-intent payload | any implicit buyer workflow state | Buyer-intent — forbidden on public surfaces |
| Private workflow state | any non-public platform state | Internal — must not cross boundary |
| Auth tokens | any JWT, session token, or credential | Security — absolutely forbidden |

### 7.3 Boundary Enforcement Summary

```
PUBLIC SURFACE
    │
    │  CTA metadata (allowed fields only per Section 7.1)
    │
    ▼
AUTH BOUNDARY
    │
    │  No private IDs, no tenant IDs, no supplier IDs,
    │  no pricing, no inventory, no RFQ, no order,
    │  no buyer-intent, no evidence IDs, no tokens
    │
    ▼
AUTH SURFACE (receives slug, intent, surface, returnTo only)
```

---

## 8. Authenticated Continuation Context Rules

### 8.1 returnTo Constraint

The `returnTo` field in CTA metadata must be **a public-safe path only**.

**Allowed returnTo patterns:**

| Pattern | Example | Allowed |
|---|---|---|
| `/collections` | `/collections` | ✅ Yes |
| `/collections/:slug` | `/collections/natural-fibres-story` | ✅ Yes |

**Forbidden returnTo patterns:**

| Pattern | Reason |
|---|---|
| Any path containing private IDs | Private ID exposure |
| Any path containing `?rqf=`, `?order=`, `?cart=`, `?checkout=` | Transactional state |
| Any path containing pricing or inventory parameters | Commerce state |
| Any path pointing into a tenant-scoped authenticated route | Must not bypass auth entry |
| Any external URL | Cross-site redirect risk |
| Any path not in the public-safe allowlist | Default deny |

**returnTo validation rule:**

Implementation MUST validate `returnTo` against an allowlist of public-safe path patterns before executing any redirect. Invalid or non-allowlisted `returnTo` values must be stripped and replaced with `/collections` (safe default). This is a security requirement (see Section 10).

### 8.2 Post-Auth Continuation Categories (Design Reference Only)

The following continuation categories are design-intent references only. None are implemented at the time of this unit. Implementation of any category requires a dedicated implementation unit with explicit authorization.

| Category | Description | Condition |
|---|---|---|
| `VIEW_AUTHENTICATED_COLLECTION_CONTEXT` | Navigate the authenticated user to an authenticated collection context view. | Post-auth routing unit authorized and implemented. |
| `REQUEST_ACCESS_TO_SOURCING_CONTEXT` | Present the authenticated user with a request-access surface for supplier/sourcing context. | Non-transactional request-access unit authorized. |
| `EXPRESS_INTEREST_NON_TRANSACTIONAL` | Allow the authenticated user to express non-transactional interest. | Explicitly approved interest expression unit authorized. |
| `AUTHENTICATED_COLLECTION_UNAVAILABLE` | Collection is not available in authenticated context. Present safe authenticated unavailable state. | Fail-closed default if collection is not available post-auth. |

**Deferral rule:** No post-auth continuation category may be implemented without an explicit authorized implementation unit. The auth handoff CTA must not promise or imply any specific post-auth feature is available.

### 8.3 Post-Auth Collection Gating Rules

Post-auth collection context rules (for future implementation reference):
- Collection must still satisfy eligibility gates in the authenticated context.
- Supplier references must remain org_id-scoped in the authenticated context.
- No collection-level DPP or passport coverage is guaranteed post-auth.
- No access to private supplier data is granted solely by collection auth continuation.
- All authenticated access must be subject to the tenant's org_id isolation and RLS enforcement.

---

## 9. CTA Copy Rules

### 9.1 Allowed Copy Classes

The following copy classes are allowed on public collection CTAs:

| Copy Class | Example Instances | Allowed |
|---|---|---|
| Authentication invitation | "Continue after sign-in" | ✅ Yes |
| Authenticated context invitation | "Sign in to view authenticated collection context" | ✅ Yes |
| Non-transactional access invitation | "Sign in for sourcing context" | ✅ Yes (where sourcing context is non-transactional) |
| Story/origin context invitation | "Continue after sign-in for authenticated supplier origin context" | ✅ Yes |

### 9.2 Forbidden Copy Classes

The following copy classes are **forbidden** on public collection CTAs:

| Forbidden Copy Class | Example | Reason |
|---|---|---|
| Commerce / transaction invitation | "Buy now", "Add to cart", "Request a quote" | Commerce intent |
| Pricing invitation | "See pricing", "Request pricing" | Pricing exposure |
| Inventory invitation | "Check availability", "Check stock" | Inventory exposure |
| RFQ invitation | "Submit RFQ", "Request a quote", "Get quote" | RFQ is tenant-plane |
| Negotiation invitation | "Start negotiating", "Contact supplier to negotiate" | Private supplier workflow |
| Direct supplier contact | "Contact supplier", "Email supplier" | Private supplier identity |
| Urgent or pressure-driving | "Act now", "Limited availability" | Implied commerce pressure |
| Financial claim | "Best price", "Cheapest supplier" | Financial claim on public surface |

### 9.3 Copy Governance Rule

All CTA copy for public collection surfaces must be reviewed against the allowed/forbidden copy classes in this section and the origin/storytelling copy governance in `D2C-ORIGIN-STORYTELLING-GOVERNANCE-001.md` Section 10 before implementation.

Copy must not evolve to imply any forbidden behavior even through indirect phrasing.

---

## 10. Security and Privacy Rules

### 10.1 returnTo Validation (Security Requirement)

Implementation MUST validate `returnTo` against a server-side or implementation-level allowlist of public-safe path patterns before executing any redirect.

Rules:
- Reject any `returnTo` value that does not match `/collections` or `/collections/<slug>` (or expanded allowlist approved by an explicit governance unit).
- Strip and replace invalid `returnTo` with `/collections`.
- Never follow an external URL as a `returnTo` target.
- Never follow a `returnTo` value that encodes a private ID, tenant ID, or transactional payload.

### 10.2 No Private IDs in Public Metadata (Security Requirement)

CTA metadata rendered to the public browser must contain zero private IDs.

Verification requirement: Any implementation of this CTA must pass an explicit audit confirming:
- No internal collection IDs in CTA metadata or DOM attributes.
- No org_id values in public HTML, JSON responses, or CTA payloads.
- No supplier private IDs in public responses.
- No DPP/evidence IDs in public CTA payloads.

### 10.3 No Auth Token Handling on Public Surface (Security Requirement)

The public collection surface must not:
- Read, validate, or render auth tokens.
- Conditionally expose CTA actions based on claimed-but-unvalidated token state.
- Accept token payloads in public URL parameters.

### 10.4 Slug Validation (Security Requirement)

The `collectionSlug` in CTA metadata must be:
- A public-safe slug only (validated against public collection projection eligibility gates).
- Not derivable from or encoding an internal database ID.
- Validated before being included in any CTA metadata.

Implementation must reject slug values that do not match a known public-eligible collection.

### 10.5 No Cross-Tenant Exposure

CTA metadata must not expose any data from one org's collections in a context visible to another org or to a public visitor in a way that leaks org-scoped collection identity. Specifically:
- Collection slugs must be public-safe and not encode org_id.
- Multiple tenant collections must not be cross-referenced in public CTA payloads.
- Public projection eligibility must be evaluated per-collection and must not aggregate cross-org context.

### 10.6 Session State for CTA Context

If the auth continuation context (slug, intent, surface) is stored in client-side session state (e.g., sessionStorage) to support `returnTo` after sign-in:
- It must be stored only in sessionStorage (not localStorage) and must expire with the session.
- It must not contain private IDs.
- It must be cleared after successful auth continuation completes.
- It must not be persisted server-side as part of the public request lifecycle.

---

## 11. Fallback and Failure States

### 11.1 Failure State Matrix

| Condition | Required Behavior |
|---|---|
| User is not authenticated | Present sign-in CTA (normal state). Do not reveal whether any authenticated content exists. |
| Auth entry mechanism is unavailable or throws | Fail closed to a safe unavailable page. Do not expose error details to the public. |
| `returnTo` is invalid or does not match allowlist | Strip `returnTo` and redirect to `/collections` after successful auth. |
| `collectionSlug` is invalid or not public-eligible | Do not render CTA. Render safe unavailable state for the collection. |
| Collection becomes unavailable post-publish | CTA may remain visible (pointing to auth entry), but post-auth must present safe authenticated unavailable state. |
| Collection is unavailable in authenticated context post-auth | Present safe authenticated unavailable state. Do not expose reason or private details. |
| No eligible authenticated continuation exists post-auth | Present safe "authenticated context not yet available" placeholder. Fail-closed. |
| Downstream authenticated feature not yet implemented | Present safe "coming soon" authenticated placeholder. Fail-closed. Do not imply a timeline. |
| Slug resolves but collection has no public projection | Do not render auth CTA. Render `PublicCollectionUnavailable` (or equivalent safe state). |
| Auth surface returns error on launch | Fail closed. Display safe generic error. Do not expose auth system internals. |

### 11.2 Fail-Closed Principle

The D2C auth handoff must **always fail closed**. Any ambiguous, unknown, or error state must result in a safe, non-transactional, non-revealing public surface — not in an exposed partial state or a private data leak.

Fail-closed means:
- No private data exposed on failure.
- No partial auth state left dangling.
- No buyer-intent payload surviving a failed handoff attempt.
- No transactional widget rendered in place of a failed auth CTA.

---

## 12. Relationship to Collection Projection Designs

### 12.1 PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001

This unit inherits the CTA shape from Section 10 of PUBLIC-COLLECTIONS-PROJECTION-DESIGN-001:

```
CTA: { action: "AUTH_CONTINUE", intent: "COLLECTION_CONTINUATION", target: "/auth" }
```

Rules from that unit that govern this handoff:
- CTA must not appear if no eligible collections are available.
- CTA must not imply checkout, cart, wishlist, order, RFQ, buyer intent, negotiation, or private sourcing.
- CTA must not expose product-level or supplier-level private IDs through the list surface.
- CTA must not be rendered on a collection that fails public projection eligibility gates.

### 12.2 PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001

This unit inherits the CTA shape from Section 10 of PUBLIC-COLLECTION-DETAIL-PROJECTION-DESIGN-001:

```
CTA: { action: "AUTH_CONTINUE", intent: "COLLECTION_DETAIL_CONTINUATION", target: "/auth" }
```

Rules from that unit that govern this handoff:
- CTA must not imply checkout, cart, wishlist, order, RFQ, buyer intent, negotiation, or private sourcing.
- CTA must not expose supplier private identity through the detail surface.
- CTA may be absent if the collection detail fails public eligibility gates or has no authenticated continuation.
- CTA fallback: if no eligible authenticated continuation, present safe no-workflow message.

### 12.3 Consistency Rule

The CTA metadata model defined in Section 4 of this unit is authoritative over the CTA shapes in both projection designs. If there is any conflict between this unit and the projection designs on CTA metadata structure, this unit governs. The projection designs govern their respective surface eligibility and field classification rules.

---

## 13. Relationship to DPP / Passport Governance

### 13.1 No DPP Gate on Collection Auth CTA

The collection auth CTA is **not gated by DPP or passport status**. A collection does not need a public passport to render an auth CTA.

Source: D2C-COLLECTIONS-DATA-MODEL-DESIGN-001 Option E — collections are curated story/showcase objects, not commerce objects. No collection-level DPP/passport exists by default.

### 13.2 Product Passport CTA is Separate

The product-level public passport CTA (`publicPassportId` gate on `PublicProductDetail`) is a separate mechanism from the collection auth CTA. They must not be conflated.

Product passport CTA rules (from `components/Public/PublicProductDetail.tsx`):
- Requires both `hasPassport === true` AND `publicPassportId` present.
- Scoped to individual product, not collection.
- Points to DPP public trust URL, not to auth continuation.

The collection auth CTA is:
- Not gated by `publicPassportId`.
- Not scoped to any individual product.
- Points to auth entry for collection continuation, not to DPP trust URL.

### 13.3 DPP Evidence Fields in Collection Context

If a collection detail projection includes DPP-related evidence summary fields (e.g., `trustSummary`, `originStory`), those fields may contextually enrich the copy presented near the auth CTA, but:
- No DPP internal IDs may appear in the CTA metadata.
- No evidence or certification IDs may appear in the CTA metadata.
- The auth CTA must not be treated as a passport or trust verification action.

---

## 14. Relationship to Origin / Storytelling Governance

### 14.1 Authenticated Continuation Language (from D2C-ORIGIN-STORYTELLING-GOVERNANCE-001)

D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 establishes the following authenticated continuation copy norms:

- "Continue after sign-in for authenticated collection context."
- "Sign in to view detailed sourcing context and supplier information."
- "Continue after sign-in"
- "Sign in to view authenticated collection context"

These norms are authoritative copy inputs for the CTA label (Section 4.1 / 4.2 `label` field) and the CTA copy rules (Section 9) in this unit.

### 14.2 Origin Story Governance for Auth CTA Placement

D2C-ORIGIN-STORYTELLING-GOVERNANCE-001 defines where the auth CTA may appear within collection story content:
- CTAs may appear in authenticated continuation areas of origin/story panels.
- CTAs must not appear within the narrative story body as inline transactional links.
- CTAs must follow the same non-transactional, non-commerce framing as the surrounding origin story content.

### 14.3 Copy Coherence Requirement

The CTA copy used in the auth handoff must be coherent with the surrounding collection story and origin content. A CTA that uses commerce-framed copy alongside story-framed origin content creates a semantic inconsistency and is forbidden even if the copy is not in the explicitly forbidden list.

---

## 15. Public / Private Boundary

### 15.1 Public Side (Before Auth)

The following is **public-safe** and available on the unauthenticated public surface:

| Data | Public-Safe |
|---|---|
| Collection public-safe slug | ✅ Yes |
| Collection headline (public-safe copy) | ✅ Yes |
| Collection origin story (public-safe version per D2C-ORIGIN-STORYTELLING-GOVERNANCE-001) | ✅ Yes |
| CTA label | ✅ Yes |
| CTA action type (AUTH_CONTINUE) | ✅ Yes |
| CTA intent class | ✅ Yes |
| Source surface identifier | ✅ Yes |
| Public trust summary (aggregate, no supplier private identity) | ✅ Yes (per projection eligibility rules) |
| returnTo path (public-safe only) | ✅ Yes (constrained) |

### 15.2 Private Side (After Auth)

The following is **never public-safe** and must not appear on the unauthenticated public surface:

| Data | Allowed on Public Surface |
|---|---|
| Internal collection ID | ❌ No |
| org_id | ❌ No |
| Private supplier identity | ❌ No |
| Supplier private contact or profile | ❌ No |
| DPP / evidence / certification internal IDs | ❌ No |
| Pricing data | ❌ No |
| Inventory data | ❌ No |
| RFQ or order state | ❌ No |
| Buyer intent payload | ❌ No |
| Auth tokens or session state | ❌ No |
| Authenticated tenant workspace URLs | ❌ No |
| Post-auth continuation state or routing config | ❌ No |

### 15.3 Boundary Enforcement Authority

This unit is the authoritative boundary definition for the D2C public collection auth handoff CTA. Any implementation that crosses the boundary in violation of Section 15.2 must be treated as a data isolation failure and must be corrected before release.

---

## 16. Deferred Decisions

The following decisions are explicitly deferred and must not be implemented without a dedicated authorized unit:

| Deferred Decision | Status | Notes |
|---|---|---|
| Post-auth continuation routing | DEFERRED | What happens after a user signs in via the collection CTA. Requires dedicated implementation unit. |
| Auth route wiring (`/auth` conceptual vs. modal `openSecondaryAuthenticatedEntry`) | DEFERRED — IMPLEMENTATION-GATED | The gap between conceptual `target: "/auth"` in CTA shapes and actual modal auth entry must be resolved in the implementation unit. |
| Authenticated collection view implementation | DEFERRED | No authenticated collection view exists. Implementation requires explicit authorization. |
| Request-access implementation | DEFERRED | No non-transactional request-access surface exists for collection context. Requires explicit authorization. |
| Express-interest implementation | DEFERRED | No express-interest surface exists. Requires explicit authorization. |
| returnTo allowlist expansion | DEFERRED | Current allowlist is `/collections` and `/collections/:slug` only. Any expansion requires an explicit governance update. |
| Collection auth CTA in `PublicCollectionsStub` | DEFERRED | No live CTA may be wired in the stub until the projection implementation unit is authorized. |
| Collection auth CTA in `PublicCollectionUnavailable` | DEFERRED | No live CTA may be wired in the unavailable page until the projection implementation unit is authorized. |
| Session storage shape for CTA context | DEFERRED | Specific shape for storing CTA context post-auth is implementation-defined. Must follow Section 10.6 rules. |
| B2C-CATEGORY-TAXONOMY-ALIGNMENT-001 | DEFERRED — ADJACENT FINDING | Not found in repo at time of authoring. Classification: adjacent governance gap. |

---

## 17. Acceptance Criteria

This design unit is accepted when all of the following criteria are met:

### Design Acceptance

1. The CTA metadata model (Section 4) is consistent with both projection designs and the origin/storytelling governance.
2. Allowed and forbidden CTA action types (Sections 5 and 6) are explicitly enumerated with no ambiguity.
3. Public-to-auth boundary rules (Section 7) explicitly define what may and may not cross the boundary.
4. `returnTo` constraints (Section 8.1) are explicit and include validation requirements.
5. Security and privacy rules (Section 10) cover return-to validation, private ID exclusion, auth token handling, slug validation, cross-tenant exposure, and session state.
6. All failure states (Section 11) are defined and all fail closed.
7. Relationships to collection projection designs, DPP governance, and origin/storytelling governance are explicitly stated.
8. The auth entry mechanism gap (`target: "/auth"` vs. `openSecondaryAuthenticatedEntry`) is recorded and deferred to implementation.
9. All post-auth continuation categories are explicitly deferred.

### Governance Acceptance

10. No forbidden CTA action type appears anywhere in this design.
11. No commerce, pricing, inventory, RFQ, or buyer-intent behavior is implied or permitted anywhere in this design.
12. No private IDs (org_id, supplier IDs, internal collection IDs, DPP IDs) appear in CTA metadata payloads.
13. No implementation is triggered by this unit — this is a design-only artifact.
14. All deferred decisions are recorded with DEFERRED status and blocking-free notes.
15. This unit does not modify any source file, route, component, or database object.

### Runtime Acceptance (for future implementation unit validation)

16. Public collection surface renders auth CTA only when collection is public-eligible per projection eligibility gates.
17. CTA metadata contains only allowed fields per Section 7.1.
18. `returnTo` is validated against the public-safe allowlist before any redirect.
19. No private IDs appear in any public DOM attribute, JSON response, or client-side CTA payload.
20. All failure states resolve to safe unavailable states, not partial or error-revealing states.
21. The conceptual `target: "/auth"` resolves to the actual auth entry mechanism without creating a broken route.

---

*Unit: D2C-EARLY-ACCESS-AUTH-HANDOFF-DESIGN-001 — TexQtic D2C public projection governance, repo root, 2026-07-13.*
