# MVP Launch Readiness Roadmap

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-19 (skeleton created)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This document is a skeleton. All sections below show the intended structure and contain
> placeholder rows. Actual population of family-level readiness status, priorities, and
> critical-path details will be done in `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`.
>
> Do not treat placeholder rows as real launch readiness assessments.

---

## 1. Purpose

This document is the master launch-critical roadmap for TexQtic.

It records the readiness status of every family required before TexQtic can onboard real tenants
and users. It is the "what must be done" document — not the "how to do it" document.

**Authority note:** This roadmap is a planning artifact. It does not authorize implementation,
does not open or close governed units, and does not override Layer 0 sequencing.

---

## 2. Historical Baseline Reference

The 2026-03-30 launch-readiness requirements baseline is preserved in:
`docs/product-truth/TEXQTIC-LAUNCH-READINESS-REQUIREMENTS-v1.md`

That document carries a cleanup banner and is historical only. This roadmap builds forward from it
but does not replace it.

---

## 3. Current Launch Posture

```yaml
# Updated: [PENDING POPULATION]
overall_launch_posture: NOT_ASSESSED
launch_gate_status: CLOSED
launch_gate_reason: HOLD_FOR_AUTHORIZATION (see governance/control/NEXT-ACTION.md)
earliest_realistic_launch_window: NOT_ASSESSED
pilot_readiness_surat: NOT_ASSESSED
```

---

## 4. Family Readiness Matrix

| # | Family | Readiness | Priority | Launch Class | Notes |
|---|---|---|---|---|---|
| 1 | Auth / Onboarding | NOT_ASSESSED | P0 | MVP_CRITICAL | — |
| 2 | Tenant core workspace | NOT_ASSESSED | P0 | MVP_CRITICAL | — |
| 3 | Supplier profile / catalog | NOT_ASSESSED | P0 | MVP_CRITICAL | — |
| 4 | B2C public browse | PRODUCTION_VERIFIED | P0 | MVP_CRITICAL | Closed unit |
| 5 | B2C product detail | PRODUCTION_VERIFIED | P0 | MVP_CRITICAL | Closed unit |
| 6 | B2C category stories | PRODUCTION_VERIFIED | P1 | MVP_CRITICAL | 4 approved |
| 7 | Public collections (D2C) | PRODUCTION_VERIFIED | P1 | MVP_CRITICAL | 5 approved |
| 8 | Public inquiry Phase 1 & 2 | PRODUCTION_VERIFIED | P0 | MVP_CRITICAL | Closed unit |
| 9 | Inquiry context handoff | PRODUCTION_VERIFIED | P1 | MVP_CRITICAL | Closed unit |
| 10 | SEO metadata (B2C/D2C) | PRODUCTION_VERIFIED | P1 | MVP_CRITICAL | Implemented |
| 11 | sitemap.xml + robots.txt | PRODUCTION_VERIFIED | P1 | MVP_CRITICAL | Closed unit |
| 12 | JSON-LD web type | PRODUCTION_VERIFIED | P1 | MVP_CRITICAL | Closed unit |
| 13 | SEO domain canonical strategy | NOT_ASSESSED | P1 | LAUNCH_DEPENDENCY | `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001` |
| 14 | DPP Passport public surface | PRODUCTION_VERIFIED | P1 | MVP_CRITICAL | Hold: HOLD_FOR_PARESH_DECISION |
| 15 | NC Phase 1 (procurement pools) | PRODUCTION_VERIFIED | P2 | LAUNCH_DEPENDENCY | Audit complete; award E2E pending |
| 16 | Award maker-checker path | DESIGN_COMPLETE | P2 | LAUNCH_DEPENDENCY | See BLOCKED.md |
| 17 | TradeTrust Pay | DESIGN_GATED | P2 | LAUNCH_DEPENDENCY | HOLD_FOR_COUNSEL_FEEDBACK |
| 18 | Platform ops / control plane | NOT_ASSESSED | P0 | MVP_CRITICAL | Boundary artifact exists |
| 19 | Subscription / commercial | NOT_ASSESSED | P1 | LAUNCH_DEPENDENCY | — |
| 20 | White Label Co | NOT_ASSESSED | P3 | POST_MVP | REVIEW-UNKNOWN hold |
| 21 | Supplier quote feature flag | NOT_ASSESSED | P2 | LAUNCH_DEPENDENCY | QD-6 hold |
| 22 | Product sitemap expansion | NOT_ASSESSED | P2 | LAUNCH_DEPENDENCY | Deferred by sitemap unit |
| 23 | Supplier profile indexability | NOT_ASSESSED | P2 | LAUNCH_DEPENDENCY | Deferred by sitemap unit |
| 24 | Fulfillment/shipment/returns | NOT_ASSESSED | P3 | POST_MVP | Deferred family note |
| 25 | Buyer-facing order/checkout | NOT_ASSESSED | P3 | POST_MVP | — |
| 26 | Messaging/notifications (full platform) | NOT_ASSESSED | P3 | POST_MVP | Full/general multi-channel messaging platform only. **Minimum inquiry notification to supplier/admin is tracked separately as MVP_CRITICAL/P1** — see CHECKLIST I-4, PRIT-033, FTR-B2C-004. Resolved by TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001. |

*All `NOT_ASSESSED` rows require inspection in `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`.*

---

## 5. Critical Path Summary

```
# PENDING POPULATION
# Illustrative skeleton structure:

Critical Path (launch-blocking sequence):
  Auth/Onboarding
    → Tenant Core Workspace
      → Supplier Profile / Catalog data quality
        → B2C public browse (DONE) → Product detail (DONE)
          → Inquiry Phase 1+2 (DONE)
            → Real supplier onboarding in Surat
              → LAUNCH

Parallel paths:
  - SEO canonical domain strategy
  - Award maker-checker path
  - Platform ops (control plane) readiness

Dependencies noted:
  - TTP legal counsel feedback → TradeTrust Pay design
  - Subscription/commercial packaging → any billing-gated workflow
  - WL Co hold resolution → White Label tenant features (POST_MVP)
```

---

## 6. Readiness Legend

| Readiness | Meaning |
|---|---|
| `NOT_ASSESSED` | No inspection done |
| `DESIGN_GATED` | Blocked pending design decision |
| `DESIGN_COMPLETE` | Design done; implementation not started |
| `IMPLEMENTATION_READY` | Can start when authorized |
| `VERIFICATION_REQUIRED` | Built but not production-verified |
| `PRODUCTION_VERIFIED` | Confirmed live in production |
| `BLOCKED` | Hard blocker |
| `DEFERRED` | Explicitly pushed out |

---

## 7. Launch Window Note

```
# PENDING POPULATION

Qualitative assessment (no specific date, only readiness status):
- Overall launch gate: CLOSED (see NEXT-ACTION.md)
- Primary open constraint: HOLD_FOR_AUTHORIZATION
- Secondary constraint: HOLD_FOR_COUNSEL_FEEDBACK (TTP)
- Estimated path to pilot readiness: NOT_ASSESSED
- Estimated path to first real tenant: NOT_ASSESSED
```

---

## 8. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created by TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001 | Copilot/Design unit |
| 2026-07-14 | Row 26 note updated: full/general messaging platform remains POST_MVP/P3; minimum inquiry notification tracked separately as MVP_CRITICAL/P1; R-013 resolved | TEXQTIC-NOTIFICATION-CLASSIFICATION-CONFLICT-RESOLUTION-001 |
| 2026-05-25 | Cross-repo state through Unit 053 recorded (no family readiness classification changed). Main App: Gate E QA sentinel filter applied + static reference previews production accepted; app homepage reference language production accepted. Marketing: preview routing production accepted for Home, Trust, Industries/Textiles, Brands; Brands secondary preview CTA accepted (cross-repo status only; Marketing repo artifacts). CRM: provisioning observability panel + timeline metadata production accepted (cross-repo status only; CRM repo artifacts). Buyer bridge remains BLOCKED. QA/test/sentinel data blocked. DB-backed demo/reference seeding deferred. Live CRM provisioning smoke approval-gated. | TLRH-README-ROADMAP-CROSSREPO-SYNC-001 |
| — | (To be populated) | — |
