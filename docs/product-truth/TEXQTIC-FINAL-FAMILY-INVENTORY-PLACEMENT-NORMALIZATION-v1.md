# TEXQTIC-FINAL-FAMILY-INVENTORY-PLACEMENT-NORMALIZATION-v1

## Status

Product-truth / family-inventory normalization only.

## Purpose and Authority

This artifact records the final-family inventory remediation decisions needed so Governance OS can
treat the family inventory as materially final for later planning/remediation work.

It is limited to family placement only.

It does not:

- open a governed unit
- select a next candidate
- complete family-design authoring
- reopen the paused B2C cycle
- rewrite doctrine or launch scope

Authority order used:

1. `governance/control/OPEN-SET.md`
2. `governance/control/NEXT-ACTION.md`
3. `governance/control/SNAPSHOT.md`
4. `governance/analysis/temp/TEXQTIC-FAMILY-PLANNING-CORPUS-COMPLETENESS-REPORT-v1.md`
5. `governance/analysis/temp/TEXQTIC-FINAL-FAMILY-INVENTORY-BLIND-SPOT-VALIDATION-REPORT-v1.md`
6. `docs/product-truth/TEXQTIC-LAUNCH-FAMILY-CHAIN-BASELINE-AND-SEQUENCING-FRICTION-v1.md`
7. `docs/product-truth/TEXQTIC-GAP-REGISTER-v2.md`
8. `docs/product-truth/TEXQTIC-SPLIT-FAMILY-RECONCILIATION-REGISTER-v1.md`
9. `docs/product-truth/TEXQTIC-UNDER-ARTIFACTED-CONTROL-FAMILY-REGISTER-v1.md`
10. `docs/product-truth/DOMAIN-TENANT-ROUTING-BRAND-SURFACE-MANAGEMENT-DESIGN-v1.md`
11. `docs/product-truth/PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md`
12. `docs/product-truth/COMPLIANCE-CERTIFICATIONS-TRACEABILITY-AUDIT-FAMILY-DESIGN-v1.md`
13. `docs/product-truth/ORDERS-CHECKOUT-POST-PURCHASE-CONTINUITY-FAMILY-DESIGN-v1.md`
14. `docs/architecture/DPP-SNAPSHOT-VIEWS-DESIGN.md`
15. `docs/strategy/PLATFORM_DOCTRINE_ADDENDUM.md`
16. `docs/doctrine/doctrine_v1_4_part_3_EXECUTABLE.md`
17. `governance/analysis/TEXQTIC-PLATFORM-REPO-TRUTH-EVIDENCE-RECORD-v1.md`

## Current Posture Guardrails

- No product-facing `ACTIVE_DELIVERY` unit is currently open.
- The paused B2C cycle remains on hold.
- This artifact settles family placement only.
- Any later bounded unit selection still requires separate lawful candidate/opening authority.

## Final Family Placement Decisions

| Family / lane | Final placement classification | Exact parent | Rationale |
| --- | --- | --- | --- |
| Fulfillment / Shipment / Returns | `EXPLICITLY_DEFERRED_FAMILY` | — | Current product-truth repeatedly preserves this as a distinct downstream execution area that must not be silently absorbed into `Orders / Checkout / Post-Purchase`, but current launch posture still treats it as deferred unless scope expands. It is therefore a real family that should remain explicit and deferred rather than latent-only. |
| Logistics / Custody Handoff / Service-Provider Participation | `FIRST_CLASS_TOP_LEVEL_FAMILY` | — | Current doctrine explicitly defines logistics-partner identity, allowlisting, custody handoff events, and trade-linked service-provider participation. This actor model is too structurally distinct to be buried inside Orders, Aggregator, or Platform Control-Plane. It is a real top-level family even though later family-design authoring is still required. |
| DPP / Regulator-Facing Disclosure | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Compliance / Certifications / Traceability / Audit` | Current DPP authority is a regulator-facing read layer built on traceability, certification, and audit evidence rather than a separate commercial pillar or independent workflow family. It should be made explicit as a named compliance-family subfamily rather than promoted to a standalone top-level family. |
| Dispute / Escalation / Resolution | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Platform Control-Plane and Platform Operations Supervision` | Current runtime and planning truth place disputes and escalations inside platform-level governance casework. This lane is real and should be explicit, but present authority does not justify elevating it above the platform-owned casework family that already contains it. |
| Admin Authority / Control-Plane RBAC | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Platform Control-Plane and Platform Operations Supervision` | Current family truth already places admin RBAC and admin-authority inside Platform Control-Plane scope. The gap is not parent placement; it is later subfamily design depth. The family inventory should therefore treat AdminRBAC as an explicit control-plane subfamily rather than as a missing top-level family. |
| Feature Governance / Release Controls / Kill-Switches | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Platform Control-Plane and Platform Operations Supervision` | Current platform truth already places feature flags, kill-switches, and release levers inside platform-owned operator controls. This is an explicit subfamily of Platform Control-Plane, not a separate top-level family. |
| AI Governance / Advisory Automation | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Platform Control-Plane and Platform Operations Supervision` | Current AI-governance truth is bounded platform oversight plus doctrinally gated future automation. That makes it a real explicit control-plane subfamily with later refinable design work, not a missing standalone top-level family. |
| Billing / Tenant Billing / Commercial Admin Operations | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Platform Control-Plane and Platform Operations Supervision` | Current runtime truth is platform-side finance supervision and commercial-admin visibility, with explicit adjacency to Subscription and Payments but no evidence that it should be broken out as a top-level family now. It should therefore be normalized as an explicit control-plane subfamily. |
| Public-facing pages / surfaces | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Domain / Tenant Routing / Brand-Surface Management` | Current authority already places public-safe tenant discovery, routed brand surfaces, and public-entry continuity inside the route/brand-surface family, while B2C remains the consuming commercial family for public-safe consumer entry. Public-facing surfaces should remain a named public-entry / public-shell lane inside the domain family, not a standalone top-level family. |
| Supplier / Manufacturer Capability Directory / Profiling | `EXPLICIT_SUBFAMILY_INSIDE_EXISTING_PARENT` | `Aggregator Directory Discovery and Intent-Handoff Workspace` | Current undernamed ecosystem-discovery truth fits best as an Aggregator subfamily because capability/profile visibility serves curated discovery and intent handoff rather than a separate independent platform pillar. |

## Public-Facing Pages Decision

Public-facing pages/surfaces remain a named public-entry / public-shell lane inside
`Domain / Tenant Routing / Brand-Surface Management`.

They should not be promoted to a standalone top-level family.

Why:

- current route/brand authority already owns tenant-targeted entry, branded surface targeting, and
  continuity between public-safe entry and later authenticated surfaces
- B2C already owns the commercial meaning of public-safe consumer entry where that lane is used
- splitting public-facing pages into a separate top-level family would duplicate route/brand
  continuity on one side and B2C parent-family storefront truth on the other without adding a
  clean independent family boundary

## Resulting Final-Family Stability Judgment

With the placements above settled, the family inventory can now be treated as materially final
enough for:

- targeted family-planning remediation
- Governance OS / reduction-law efficiency investigation

What remains is later family-design authoring and chain cleanup, not unresolved family existence or
placement.

## Later Design Work Still Required

This normalization does not complete the following later work:

- first-class family-design authoring for `Logistics / Custody Handoff / Service-Provider Participation`
- explicit deferred-family note/design for `Fulfillment / Shipment / Returns`
- first-class subfamily-design authoring for AdminRBAC, Feature Governance, AI Governance, and
  Billing / Tenant Billing / Commercial Admin Operations
- explicit named DPP subfamily placement inside the compliance-family design layer when that family
  next receives design cleanup
- continued split-chain cleanup for B2C, Platform Control-Plane, Onboarding, RFQ, White-Label, and
  other already-identified mixed-chain families

## Non-Opening Rule

These placement decisions do not create new `-v2` candidate families, do not promote any new
product-facing opening, and do not reopen the paused B2C cycle.