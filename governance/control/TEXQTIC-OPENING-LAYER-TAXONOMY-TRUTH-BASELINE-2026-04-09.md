# TEXQTIC-OPENING-LAYER-TAXONOMY-TRUTH-BASELINE-2026-04-09

Status: live opening-layer taxonomy baseline
Layer: opening-layer live authority
Date: 2026-04-09
Primary authorities:

1. governance/analysis/TEXQTIC-REPO-TRUTH-BASELINE-AND-GOVERNANCE-RESET-OPTIONS-2026-04-09.md
2. governance/analysis/TEXQTIC-OPENING-LAYER-CANON-AND-POINTER-SET-DECISION-2026-04-09.md

## 1. Purpose

This document fixes the current opening-layer taxonomy truth for TexQtic.

It is a summary authority for runtime-family, tenancy, lifecycle, enterprise, white-label, and
blocked-pending-verification interpretation.

It does not rewrite preserved downstream contracts or family-level design anchors.

## 2. Runtime-family truth

The live runtime-family taxonomy is:

| Area | Current opening-layer truth | Status |
| --- | --- | --- |
| B2B | `B2B workspace` / `b2b_workspace` | Confirmed |
| B2C | `B2C storefront` / `b2c_storefront` | Confirmed |
| White-label | `WL storefront` / `wl_storefront` with optional `WL admin overlay` | Confirmed |
| Aggregator | `Aggregator workspace` / `aggregator_workspace` with curated discovery + intent handoff interpretation | Confirmed |
| Control plane | `control_plane` / `TexQtic Control Plane` | Confirmed |

Runtime-family clarifiers:

- WL admin is an overlay state, not a separate parent runtime family.
- Aggregator remains constrained to curated discovery plus intent handoff under current truth.

## 3. Tenancy and structural truth

The constitutional tenancy boundary is:

- `org_id` in schema and application truth
- `app.org_id` in request-bound database context truth

Additional structural clarifiers:

- `tenant_category` remains the structural family signal.
- `is_white_label` remains the white-label capability and overlay signal.
- `app.tenant_id` is stale and must not be treated as canonical opening-layer truth.

## 4. Lifecycle and status truth

Opening-layer lifecycle truth is anchored on `organizations.status` for canonical lifecycle
continuity, while `Tenant.status` still exists as part of the hybrid schema reality.

The current lifecycle/status terms to preserve are:

- `ACTIVE`
- `SUSPENDED`
- `CLOSED`
- `PENDING_VERIFICATION`
- `VERIFICATION_APPROVED`
- `VERIFICATION_REJECTED`
- `VERIFICATION_NEEDS_MORE_INFO`

Blocked-pending-verification interpretation:

- `blocked_pending_verification` is a reporting and governance label, not a separate runtime enum.
- Under current repo/runtime truth it maps to `organizations.status = PENDING_VERIFICATION` plus
  blocked B2B workspace behavior.

## 5. Enterprise and white-label classification truth

Enterprise classification truth:

- enterprise is B2B depth or billing-plan language only
- enterprise is not a separate runtime family
- enterprise is not a separate parent commercial access model

White-label classification truth:

- white-label is overlay capability and deployment/experience truth
- white-label is not a separate parent commercial mode
- white-label does not replace B2B, B2C, Aggregator, or control-plane classification

## 6. Preserved downstream topic anchors

This opening-layer taxonomy baseline summarizes truth but does not replace the preserved downstream
authorities below:

- shared/contracts/rls-policy.md
- shared/contracts/ARCHITECTURE-GOVERNANCE.md
- docs/product-truth/B2B-EXCHANGE-OPERATING-MODE-DESIGN-v1.md
- docs/product-truth/B2C-OPERATING-MODE-DESIGN-v1.md
- docs/product-truth/WHITE-LABEL-OVERLAY-NORMALIZATION-v1.md
- docs/product-truth/AGGREGATOR-OPERATING-MODE-NORMALIZATION-v1.md
- docs/product-truth/ENTERPRISE-WITHIN-B2B-DEPTH-BOUNDARY-v1.md
- docs/product-truth/PLATFORM-CONTROL-PLANE-FAMILY-REPLAN-v1.md
- docs/product-truth/IDENTITY-TENANCY-WORKSPACE-CONTINUITY-DESIGN-v1.md

## 7. Scope boundary

This document is opening-layer summary authority only.

It does not begin downstream reconciliation, debt cleanup, contract remediation, architecture
change, or any application/runtime/schema behavior change.
