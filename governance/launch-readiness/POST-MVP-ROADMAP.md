# Post-MVP Roadmap

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-19 (skeleton created)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This document captures confirmed post-MVP themes and explicitly deferred families.
> It is a durable planning artifact, not a roadmap with committed dates.
> All items below are for planning visibility only. Nothing here is authorized or scheduled.

---

## 1. Purpose

This document captures what TexQtic explicitly intends to build **after** MVP launch.

It preserves the intent so it is not lost, prevents premature post-MVP work from creeping into
MVP scope, and gives Paresh and any future team member a clear picture of where TexQtic is
headed after pilot launch.

**Not here:**
- Active delivery commitments
- Scheduled dates
- Implementation details beyond what is needed to identify the theme

---

## 2. Post-MVP Cutline Rule

> The MVP cutline is: **"What is the minimum surface required for the Surat pilot to succeed?"**
>
> Anything that is not required for the first 30–50 pilot supplier cohort and their first
> real buyers is Post-MVP by default.
>
> The only way to pull something from Post-MVP to MVP is a written Paresh decision with
> the specific rationale: "this is required for pilot success because ___".

---

## 3. Post-MVP Themes

### 3.1 Full TradeTrust Pay Activation

**Theme:** Activate the TradeTrust-powered settlement and financed-trade pathway for NC procurement pools.

**Why Post-MVP:** Blocked by external legal counsel feedback (HOLD_FOR_COUNSEL_FEEDBACK). Even if counsel clears it, full TTP activation is a multi-unit sequence that cannot fit in MVP.

**What it enables:** Financed trade settlements for buyers in NC procurement pools; platform credibility for Textile trade finance narrative.

**Trigger:** Counsel feedback received + Paresh design decision.

**Units likely needed:**
- `TEXQTIC-NC-TTP-POST-PHASE1-DESIGN-001` (opens post-counsel)
- Implementation units TBD

---

### 3.2 Full Network Commerce (Award E2E, Supplier Quotes)

**Theme:** Complete the supplier quote → RFQ response → award → fulfillment loop.

**Why Post-MVP:** Award maker-checker is design-complete but implementation is not authorized. Supplier quote flag (QD-6) is HOLD. Full NC commerce flow is launch-dependency-class, not MVP-critical for pilot.

**What it enables:** Real tender/procurement engagement between buyers and suppliers in a pool.

**Trigger:** Award maker-checker implementation authorization + QD-6 flag decision.

**Units likely needed:**
- Award maker-checker implementation unit
- Supplier quote activation unit

---

### 3.3 White Label Co

**Theme:** Tenant-branded white-label instances of the TexQtic platform for enterprise or association customers.

**Why Post-MVP:** WL Co hold is REVIEW-UNKNOWN. No implementation dependency identified for MVP. B2C and D2C slices have confirmed WL Co non-blocking for MVP.

**What it enables:** Association-level or enterprise-branded procurement/discovery portals.

**Trigger:** WL Co hold resolution (Paresh + external partner decision).

**Units likely needed:**
- `TEXQTIC-WL-CO-DESIGN-001` (pending hold resolution)

---

### 3.4 Full Supplier Profile Indexability + SEO

**Theme:** Indexed, SEO-optimized public supplier profile pages with structured data, canonical URLs, and inclusion in sitemap.

**Why Post-MVP:** Requires SEO domain canonical strategy (`PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`) to be decided first. Supplier profiles also require real supplier data completeness threshold definition.

**What it enables:** Organic discovery of individual Surat textile suppliers via search.

**Trigger:** Domain canonical strategy decided + supplier indexability gate defined.

**Units likely needed:**
- `PUBLIC-SEO-DOMAIN-CANONICAL-STRATEGY-001`
- `PUBLIC-SEO-SUPPLIER-PROFILE-INDEXABILITY-001`
- `PUBLIC-SEO-PRODUCT-SITEMAP-EXPANSION-001`

---

### 3.5 /trust, /industries, /aggregator Public Pages

**Theme:** Content-rich public landing pages for trust narrative (/trust), industry cluster discovery (/industries), and aggregator positioning (/aggregator).

**Why Post-MVP:** All three are noindex stubs today. Content strategy not defined. Requires copywriting, design, and content governance before SEO value.

**What it enables:** Organic top-of-funnel awareness; brand narrative for institutional buyers and investors.

**Trigger:** Content strategy design + Paresh copywriting decision.

---

### 3.6 Buyer-Facing Order / Checkout

**Theme:** End-to-end buyer order placement, checkout, and payment for B2C browse discovery.

**Why Post-MVP:** TexQtic's current model routes buyers to inquiry → supplier handles commerce. Direct B2C checkout is a significant scope expansion.

**What it enables:** Direct transactional revenue on the platform; reduced friction for known-intent buyers.

**Trigger:** Explicit product decision to pursue direct commerce + significant implementation investment.

---

### 3.7 Fulfillment, Shipment, and Returns

**Theme:** Logistics coordination, shipment tracking, and returns management for transacted orders.

**Why Post-MVP:** Depends on buyer checkout (3.6). Significant operational complexity.

**What it enables:** Full end-to-end transactional support.

**Trigger:** Buyer checkout in production; partner logistics integration decision.

---

### 3.8 Messaging / Notifications Layer

**Theme:** In-platform messaging between buyers and suppliers; structured notification feeds; automated alerts.

**Why Post-MVP:** Current inquiry flow handles first-touch via form. Structured messaging is a significant product capability.

**What it enables:** Ongoing buyer-supplier relationship management without leaving TexQtic.

**Trigger:** Pilot proof showing inquiry-to-engagement loop works and needs structured continuation.

---

### 3.9 AI / Intelligence Layer

**Theme:** AI-powered supplier matching, demand intelligence, document intelligence (TECS), sourcing recommendations.

**Why Post-MVP:** TECS AI designs exist (`TECS-AGG-AI-SUPPLIER-MATCHING-MVP-001-DESIGN-v1.md`, `TECS-AI-DOCUMENT-INTELLIGENCE-MVP-001-DESIGN-v1.md`) but are not on the active launch path.

**What it enables:** Scalable supplier discovery; automated document extraction for DPP and procurement; intelligent sourcing matching.

**Trigger:** Pilot data showing sufficient transaction volume to warrant AI training data investment.

---

### 3.10 Platform Subscription / Commercial Packaging

**Theme:** Tiered pricing, plan limits, subscription management, and tenant billing.

**Why Post-MVP:** Needed for commercial sustainability but not for free pilot launch with early Surat cohort.

**What it enables:** Revenue model; plan-gated features; churn metrics.

**Trigger:** Pilot shows willing-to-pay signals + Paresh commercial model decision.

---

## 4. Prioritized Post-MVP Sequence (Tentative)

```
# PENDING POPULATION — to be prioritized in TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001

Indicative sequence (subject to Paresh decision):

P1 (First wave after MVP):
  - SEO domain canonical strategy → supplier profile indexability
  - Trust, industries, aggregator content pages
  - Full NC award E2E (if QD-6 and maker-checker cleared)

P2 (Based on pilot proof):
  - TTP activation (pending counsel)
  - Platform subscription/commercial packaging
  - Messaging layer (if inquiry volume justifies)

P3 (Strategic expansion):
  - Full buyer checkout
  - AI/TECS supplier matching
  - White Label Co (if hold resolved)
  - Fulfillment/shipment/returns
```

---

## 5. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created; confirmed post-MVP themes captured from repo inspection | Copilot/Design unit |
| — | (To be populated) | — |
