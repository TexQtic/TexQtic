# TECS-B2B-BUYER-PRICE-DISCLOSURE-001 — Buyer Price Visibility / Disclosure Design v1

**Unit ID:** TECS-B2B-BUYER-PRICE-DISCLOSURE-001  
**Mode:** DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED  
**Status:** DESIGN_DRAFT  
**Design date:** 2026-04-28  
**Owner / context:** TexQtic governance and repo-truth planning  
**Predecessor units:**  
  - TECS-B2B-BUYER-CATALOG-PDP-001 (VERIFIED_COMPLETE)  
  - TECS-DPP-PASSPORT-FOUNDATION-001 (VERIFIED_COMPLETE)

> **Stop rule:** This artifact is planning-only. No backend logic, frontend display behavior,
> route implementation, schema changes, migrations, Prisma updates, RFQ workflow changes, or
> production behavior changes are authorized in this unit.

---

## 1. Problem Statement

TexQtic buyer PDP currently uses a safe placeholder posture for commercial pricing
(`Price available on request`). That posture protects supplier confidentiality but is too narrow
for a conversion-ready B2B experience. Buyers need predictable disclosure states so they can
understand whether price is visible, gated, or RFQ-only before moving forward.

Without a formal disclosure model:
- Supplier confidentiality can be accidentally weakened by ad hoc UI or API behavior.
- Buyer intent can stall because pricing state is ambiguous.
- RFQ handoff can be misused as a workaround for missing policy semantics.
- Future relationship/access control can become inconsistent across tenants.

This unit defines the design contract for controlled commercial-price visibility layered on
top of the completed PDP foundation.

## 2. Business Rationale

Textile B2B pricing is not universally public retail pricing. It is commonly conditioned by:
- buyer qualification and procurement legitimacy,
- order volume and MOQ sensitivity,
- negotiated commercial terms,
- supplier trust and relationship maturity,
- regional and market segmentation,
- RFQ-led buying behavior,
- anti-scraping safeguards to prevent public harvesting of commercial terms.

Controlled disclosure improves conversion quality while preserving supplier trust and tenant
commercial boundaries.

## 3. Current System Assumptions

Design assumptions anchored to verified repo state:
- PDP foundation is complete and buyer-facing rendering is stable.
- Current buyer PDP posture uses safe placeholder pricing language.
- DPP foundation is complete and remains a separate bounded surface.
- RFQ workflow integration is a future unit and not implemented here.
- Tenant isolation (`org_id`) remains constitutional for all buyer/supplier data handling.

Roadmap order preserved:
1. Price Disclosure Design (this unit)
2. RFQ Integration
3. Relationship / Access Control
4. AI Supplier Matching later

## 4. Non-Goals

Explicitly out of scope for this unit:
- Backend implementation of disclosure logic
- Frontend price rendering changes
- Supplier dashboard control implementation
- RFQ workflow implementation (quote creation, notifications, negotiation)
- Prisma schema changes and migrations
- Route additions or API behavior changes
- Payment, escrow, credit, wallet, settlement flows
- Buyer/supplier ranking or matching logic
- Public DPP UI or DPP publication behavior changes

## 5. Price Visibility State Model

Canonical conceptual states for future implementation:

| State code | Buyer-visible posture | Price value shown | Typical CTA | Notes |
|---|---|---|---|---|
| `PUBLIC_VISIBLE` | Public visible price | Yes | `VIEW_PRICE` | Rare, supplier explicitly allows broad visibility |
| `AUTH_VISIBLE` | Logged-in buyer visible price | Yes | `VIEW_PRICE` | Requires authenticated buyer session |
| `ELIGIBLE_VISIBLE` | Eligible buyer visible price | Yes | `VIEW_PRICE` | Requires passing eligibility evaluator |
| `HIDDEN` | Hidden price | No | `CONTACT_SUPPLIER` | Commercial value never serialized to buyer |
| `RFQ_ONLY` | RFQ-only pricing | No | `REQUEST_QUOTE` | RFQ entry allowed; no instant quote value |
| `PRICE_ON_REQUEST` | Price available on request | No | `REQUEST_QUOTE` | Equivalent display posture to placeholder |
| `LOGIN_REQUIRED` | Login to view price | No | `LOGIN_TO_VIEW` | Unauthenticated buyer cannot see value |
| `ELIGIBILITY_REQUIRED` | Eligibility required | No | `CHECK_ELIGIBILITY` | Authenticated but not currently eligible |

Future boundary-only state (not implemented in this unit):
- `RELATIONSHIP_REQUIRED`: disclosure depends on supplier-buyer relationship policy

## 6. Supplier Policy Model — Conceptual Only

Supplier-controlled exposure policy (future source of truth) should support:
- Always visible
- Visible only to authenticated buyers
- Visible only to eligible buyers
- Hidden from all buyers
- RFQ-only
- Relationship-gated visibility (future boundary)

Conceptual policy profile:

```ts
// Design-only model (not implemented)
type SupplierPricePolicyMode =
  | 'ALWAYS_VISIBLE'
  | 'AUTH_ONLY'
  | 'ELIGIBLE_ONLY'
  | 'HIDDEN_ALL'
  | 'RFQ_ONLY'
  | 'RELATIONSHIP_ONLY';
```

Policy source notes:
- Policy may be defined per supplier, with optional product-level override in a later unit.
- Absence of explicit supplier policy should default to non-leaking posture (`PRICE_ON_REQUEST`).
- No supplier dashboard controls are implemented in this design-only unit.

## 7. Buyer Eligibility Model — Conceptual Only

### 7.1 Currently Available Signals

Signals likely available in current platform posture:
- Buyer authentication state (authenticated vs unauthenticated)
- Buyer tenant/org context (workspace session)
- Buyer role/account context if already present in auth/session claims

### 7.2 Signals Requiring Future Units

- Supplier-approved access list / allowlist
- Relationship status between buyer org and supplier org
- Contractual tier-based visibility and negotiated exposure rules

### 7.3 Explicitly Out of Scope Signals

- AI confidence score or model-driven buyer ranking
- Public heuristic scoring for buyer quality
- Payment/creditworthiness-based automated exposure

Eligibility design principle:
- Disclosure decisions must be deterministic, auditable, and tenant-scoped.
- If eligibility is unresolved, default to non-leaking display state.

## 8. PDP Response / UI Disclosure Contract — Conceptual Only

Design-level response fragment to layer onto existing PDP contract:

```ts
// Conceptual DTO extension — design only
interface BuyerPriceDisclosureView {
  price_visibility_state:
    | 'PUBLIC_VISIBLE'
    | 'AUTH_VISIBLE'
    | 'ELIGIBLE_VISIBLE'
    | 'HIDDEN'
    | 'RFQ_ONLY'
    | 'PRICE_ON_REQUEST'
    | 'LOGIN_REQUIRED'
    | 'ELIGIBILITY_REQUIRED';
  price_display_policy: 'SHOW_VALUE' | 'SUPPRESS_VALUE';
  price_value_visible: boolean;
  price_label:
    | 'Price available on request'
    | 'Contact supplier'
    | 'Login to view price'
    | 'Eligibility required'
    | 'Request quote';
  cta_type: 'VIEW_PRICE' | 'REQUEST_QUOTE' | 'CONTACT_SUPPLIER' | 'LOGIN_TO_VIEW' | 'CHECK_ELIGIBILITY';
  eligibility_reason: string | null;
  supplier_policy_source: 'SUPPLIER_DEFAULT' | 'PRODUCT_OVERRIDE' | 'SYSTEM_SAFE_DEFAULT';
  rfq_required: boolean;
}
```

Layering constraints:
- Must not break existing media/spec/compliance rendering.
- Must not break RFQ trigger handoff semantics.
- Must preserve existing buyer-facing safety boundaries.
- Must avoid introducing hidden/commercial price fields when suppressed.

## 9. API / Backend Design Considerations

Design considerations for future implementation:
- Apply disclosure server-side before shaping buyer PDP payload.
- Never send hidden commercial values to client when state suppresses visibility.
- Resolve disclosure from supplier policy + buyer eligibility evaluator.
- Provide explicit non-value labels/CTA states when value is suppressed.
- Keep response deterministic to avoid inference leakage.

Recommended future helper boundary:
- `resolvePriceDisclosureState(productContext, buyerContext, supplierPolicy)`
- Output: safe disclosure state object only

No route additions, no handler edits, and no service code changes are performed in this unit.

## 10. Frontend Design Considerations

Future UI behavior should:
- Render explicit state labels for non-visible price states.
- Bind CTA behavior to server-provided `cta_type` only.
- Avoid fallback rendering that could display stale or cached price values.
- Keep PDP component layering additive and preserve existing sections.
- Maintain accessibility and localization-ready price state copy.

No frontend implementation changes are authorized in this unit.

## 11. Security / Anti-Leakage Requirements

Future implementation must enforce all anti-leakage controls:
- No hidden commercial values in API responses.
- No hidden prices in serialized product payloads.
- No hidden prices in server logs.
- No hidden prices in frontend hydration/bootstrap data.
- No hidden prices in test snapshots.
- No hidden prices through fallback UI branches.
- No hidden prices in search/indexing payloads.

Security default:
- If state resolution fails or policy context is missing, suppress value and emit safe label.

## 12. Tenant Isolation Requirements

Tenant constraints for future implementation:
- No cross-tenant price visibility.
- Buyer must not access supplier policies outside authorized tenant scope.
- No public exposure of tenant-scoped commercial values.
- No bypass through public PDP routes.
- Policy/eligibility evaluation must execute under tenant-safe context.

## 13. RFQ Boundary

RFQ-only behavior (conceptual for future unit integration):
- PDP may expose RFQ-oriented CTA/state.
- No RFQ workflow implementation in this design unit.
- No quote creation.
- No supplier notification dispatch.
- No negotiated price generation.

RFQ integration is deferred to TECS-B2B-BUYER-RFQ-INTEGRATION-001.

## 14. Relationship Access Boundary

Relationship-driven disclosure is explicitly a future boundary:
- No relationship-based visibility logic is implemented now.
- No relationship policy store is implemented now.
- No relationship state mutation is implemented now.

Deferred unit:
- TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001

## 15. Migration Considerations

If future implementation requires persistent policy metadata, likely conceptual additions include:
- Supplier-level price disclosure policy source
- Optional product-level disclosure override
- Audit fields for policy updates and reviewer approvals

Migration posture for future authorized units:
- Use Prisma migration ledger only
- No manual SQL and no out-of-band schema edits

This design unit performs no schema or migration change.

## 16. Test Strategy for Future Implementation

Planned test categories:
- visible price allowed
- hidden price suppressed
- RFQ-only state
- unauthenticated buyer
- authenticated but ineligible buyer
- eligible buyer
- cross-tenant isolation
- API payload leakage prevention
- frontend hydration leakage prevention
- snapshot leakage prevention

Recommended test surfaces:
- backend disclosure resolver unit tests
- tenant PDP route contract tests
- buyer PDP render/state tests
- regression tests for non-leakage fallback behavior

## 17. Runtime Verification Plan for Future Implementation

Planned runtime checks after future implementation is authorized:
- Buyer unauthenticated PDP: no price value, `LOGIN_TO_VIEW` state
- Buyer authenticated ineligible: no price value, `ELIGIBILITY_REQUIRED`
- Buyer eligible for visible product: price value visible with correct currency formatting
- RFQ-only product: no price value, RFQ CTA present
- Hidden product: no price value across API, UI, logs
- Cross-tenant probes: no policy/data leakage and safe denial
- Search/listing payload probes: hidden values absent
- Production log scan: no suppressed commercial values emitted

This unit does not execute runtime verification beyond artifact validation.

## 18. Open Questions

1. Is disclosure policy strictly supplier-level in first implementation, or supplier + product override?
2. What is the minimal eligibility signal set required for initial launch (auth only vs org verification)?
3. Should `PRICE_ON_REQUEST` and `RFQ_ONLY` be separate states in v1, or merged with CTA nuance only?
4. Where should policy audit history live for governance and support investigations?
5. Should relationship-gated pricing require explicit supplier approval events before eligibility pass?
6. What localization baseline is required for disclosure labels at first release?

## 19. Implementation Slices Recommendation

Recommended sequence for future authorization:

- Slice A: policy/state contract and server-side disclosure helper
- Slice B: PDP API integration with leakage-safe response shaping
- Slice C: frontend PDP price state rendering
- Slice D: supplier policy source integration (if available)
- Slice E: eligibility and tenant isolation tests
- Slice F: production runtime verification and governance closure

Roadmap boundaries preserved:
- TECS-B2B-BUYER-RFQ-INTEGRATION-001 after disclosure contract is stable
- TECS-B2B-BUYER-RELATIONSHIP-ACCESS-001 for relationship gates
- TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001 later

## 20. Completion Checklist

- [x] Design artifact created for TECS-B2B-BUYER-PRICE-DISCLOSURE-001
- [x] Artifact explicitly marked DESIGN ONLY
- [x] No backend/frontend/schema/migration implementation included
- [x] Supplier-controlled exposure model documented conceptually
- [x] Buyer eligibility model documented conceptually
- [x] RFQ-only pricing boundary documented
- [x] Relationship/access treated as future boundary
- [x] Security anti-leakage requirements documented
- [x] Tenant isolation constraints documented
- [x] Future implementation slices recommended

---

*Design artifact created: 2026-04-28*  
*Unit: TECS-B2B-BUYER-PRICE-DISCLOSURE-001*  
*Mode: DESIGN ONLY — NO IMPLEMENTATION AUTHORIZED*