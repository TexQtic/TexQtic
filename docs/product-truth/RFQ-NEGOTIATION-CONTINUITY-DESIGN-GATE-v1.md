# RFQ-NEGOTIATION-CONTINUITY-DESIGN-GATE-v1

## Purpose

This artifact defines the bounded product-truth shape of `RFQ-NEGOTIATION-CONTINUITY` while the
candidate remains in `DESIGN_GATE` posture.

It does not open implementation. It does not authorize a runtime change. It records the current
repo-truth journeys, where those journeys stop, and the smallest lawful recommendation for any
later implementation-ready opening decision.

## Governing Posture

- `RFQ-NEGOTIATION-CONTINUITY` remains a bounded cross-mode `DESIGN_GATE` candidate.
- `TENANT-CATALOG-MANAGEMENT-CONTINUITY` remains `CLOSED` and separate.
- Product image upload / media continuity remains a separate adjacent finding.
- `CONTROL-PLANE-TENANT-OPERATIONS-REALITY` remains separate and later-ready.
- `MODE-COMPLETENESS-B2C-STOREFRONT-CONTINUITY` remains separate and later-ready.
- `MODE-SCOPE-TRUTH-AGGREGATOR-OPERATING-MODE` remains design-gate only.
- Recently closed WL / tenant-truth units remain closed and separate.
- Enterprise redesign remains closed / not justified.

## Repo-Truth Surfaces Reviewed

- `App.tsx`
- `services/catalogService.ts`
- `server/src/routes/tenant.ts`
- `server/src/routes/public.ts`
- `components/WL/WLStorefront.tsx`
- `components/WL/WLProductDetailPage.tsx`
- `components/Tenant/BuyerRfqListSurface.tsx`
- `components/Tenant/BuyerRfqDetailSurface.tsx`
- `components/Tenant/TradesPanel.tsx`
- `services/tradeService.ts`
- `server/src/routes/tenant/trades.g017.ts`
- `server/src/services/trade.g017.service.ts`
- `services/aiService.ts`
- `server/src/routes/ai.ts`

## Current Repo Truth

### Enterprise RFQ Functions That Exist Today

- B2B product cards expose `Request Quote`.
- `Request Quote` opens a non-binding RFQ dialog with quantity and buyer message.
- RFQ submit calls the tenant RFQ create route.
- Buyers can open `View My RFQs` and reopen buyer RFQ detail.
- Suppliers can open `Supplier RFQ Inbox`, view supplier RFQ detail, and submit one first response.
- Backend tenant RFQ routes exist for create, buyer list/detail, supplier inbox/detail, and first response.

### White-Label RFQ Functions That Exist Today

- Reviewed WL storefront runtime exposes browse, product detail, add-to-cart, and cart continuity.
- Reviewed WL storefront/detail surfaces do not expose `Request Quote` or another RFQ entry point.
- Reviewed WL runtime does not evidence buyer RFQ list/detail or supplier RFQ inbox/detail entry from the storefront flow.

### Enterprise Negotiation Functions That Exist Today

- Tenant trades routes and trades panel exist.
- Trade lifecycle states include `RFQ_SENT` and `NEGOTIATION`.
- Trades panel exposes lifecycle transitions such as `Move to Negotiation` for an existing trade.
- Backend `POST /api/tenant/trades/from-rfq` exists and creates a trade from a buyer-owned RFQ in `RESPONDED` state.
- AI negotiation-advice endpoint and client exist.

### White-Label Negotiation Functions That Exist Today

- Repo truth still shows a separate tenant `Trades` workspace path as part of the broader experience shell wiring.
- Reviewed WL storefront and product-detail surfaces do not expose negotiation entry from the browse/RFQ path.
- No reviewed WL runtime surface evidences RFQ-originated negotiation continuity.

## Exact Bounded Journeys

### Enterprise RFQ Journey Today

1. User enters B2B tenant runtime.
2. User sees `Request Quote` on catalog cards.
3. User opens the RFQ dialog and submits a non-binding RFQ.
4. User can view RFQ success, buyer RFQ list, and buyer RFQ detail.
5. Supplier can open supplier RFQ inbox, open supplier detail, and submit one first response.
6. Buyer can later see that supplier response as read-only detail.

### Where Enterprise RFQ Journey Stops

- Buyer RFQ list/detail are explicitly read-only and pre-negotiation.
- Supplier detail is explicitly first-response-only and does not create a quote, price, or negotiation thread.
- The reviewed frontend does not expose a conversion from responded RFQ into trade creation.
- The reviewed frontend does not expose offer, counter-offer, quote-thread, or negotiation-thread continuity.

### White-Label RFQ Journey Today

1. User enters WL storefront runtime.
2. User can browse catalog, open product detail, and add items to cart.

### Where White-Label RFQ Journey Stops

- The reviewed WL browse/detail path does not expose RFQ initiation.
- The reviewed WL path does not expose RFQ list/detail or supplier inbox entry.
- The reviewed WL path therefore stops before RFQ begins.

## Negotiation Reality Assessment

`Negotiation continuity` is only partially implemented in repo truth and is best described as
trades-adjacent scaffolding rather than a materially continuous user-facing RFQ-to-negotiation
workflow.

What exists:

- trade lifecycle state scaffolding for `RFQ_SENT` and `NEGOTIATION`
- tenant trades list/detail/transition surfaces
- backend RFQ-to-trade creation route
- AI negotiation-advice service and route

What is not evidenced in the reviewed user journey:

- frontend RFQ-to-trade creation bridge
- negotiation thread or counter-offer workflow
- quote object continuity
- surfaced AI negotiation advice inside the RFQ/trade journey
- WL RFQ-originated negotiation path

## Exact Missing Capabilities

### Missing For White-Label

- RFQ initiation entry from reviewed WL product browse/detail surfaces
- RFQ success-to-list/detail continuity in reviewed WL runtime
- supplier or buyer RFQ follow-up surfaces in reviewed WL runtime
- any RFQ-originated negotiation continuation in reviewed WL runtime

### Missing Or Limited For Enterprise

- RFQ continuity stops at read-only buyer detail and first-response-only supplier reply
- no reviewed frontend bridge from responded RFQ into trade creation
- no reviewed quote, counter-offer, or negotiation-thread continuity
- AI negotiation advice exists as a service but is not evidenced as part of the reviewed RFQ continuation path

## Candidate Framing Decision

One cross-mode family remains the correct candidate-family framing.

Reason:

- WL and enterprise gaps are two parts of the same bounded continuity chain.
- WL is missing RFQ exposure earlier in the chain.
- Enterprise exposes RFQ initiation and discovery but stops before materially continuous negotiation.
- Repo truth still does not justify a broad redesign candidate or a merge into neighboring families.

## Recommended Future Opening Shape

The future implementation shape should be two bounded implementation units, opened separately if a
later bounded product decision makes them lawful.

### Recommended Future Unit 1

`WL-RFQ-EXPOSURE-CONTINUITY`

Bounded outcome:

- WL reviewed storefront/product-detail path truthfully exposes RFQ initiation and the minimum
  lawful RFQ follow-up entry needed for the WL path to stop overstating parity with enterprise RFQ
  capabilities.

### Recommended Future Unit 2

`ENTERPRISE-RFQ-TO-NEGOTIATION-BRIDGE-CONTINUITY`

Bounded outcome:

- Enterprise reviewed RFQ path no longer stops at first response only and instead exposes the
  minimum lawful bridge from responded RFQ into existing trade/negotiation continuity without
  widening into broad trade redesign or enterprise redesign.

## Why Not One Future Unit

- WL missing RFQ exposure is a storefront/runtime entry problem.
- Enterprise RFQ-to-negotiation continuation is a later-stage workflow bridge problem.
- Combining both into one implementation unit would create an oversized cross-mode change set and
  weaken bounded TECS discipline.

## Explicit Out Of Scope

- runtime implementation
- schema or migration work
- broad trade redesign
- quote engine redesign
- counter-offer system design beyond the bounded bridge decision
- search, merchandising, B2C storefront continuity, or control-plane work
- image upload/media continuity
- aggregator scope truth
- enterprise redesign

## Design-Gate Conclusion

`RFQ-NEGOTIATION-CONTINUITY` should remain one bounded cross-mode `DESIGN_GATE` candidate family.
The design gate now recommends that any later implementation-ready work should split into two
bounded units: WL RFQ exposure continuity and enterprise RFQ-to-negotiation bridge continuity.
No implementation-ready unit is opened by this artifact.