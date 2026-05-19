# Pilot Readiness — Surat Textile Cluster

**Hub:** `governance/launch-readiness/`
**Status:** SKELETON — PENDING POPULATION
**Population unit:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`
**Last updated:** 2026-05-19 (skeleton created)
**Design authority:** `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001`

---

> **SKELETON NOTE**
>
> This document defines the criteria, milestones, and go/no-go conditions for the Surat pilot.
> Actual supplier names, counts, timelines, and proof pack content will be populated in
> `TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-POPULATION-001`.

---

## 1. Purpose

The Surat pilot is TexQtic's first real-world deployment with actual textile suppliers and
actual buyers. Its success is the proof of concept for everything that follows — investor
conversations, press, expansion, and commercial packaging.

This document defines:
1. What "pilot ready" means for TexQtic from a platform perspective
2. What data must be seeded before any buyer-facing outreach
3. What the pilot must prove to justify expansion
4. Field GTM milestones (supplier seeding, onboarding, activation)
5. Go/no-go criteria for expanding beyond the first Surat cohort

---

## 2. Pilot Definition

| Dimension | Target |
|---|---|
| Pilot geography | Surat, Gujarat, India (textile cluster) |
| Pilot supplier count | 30–50 active supplier profiles |
| Pilot cohort type | Known Paresh-network suppliers; not cold outreach |
| Pilot buyer engagement | At least 5 real verified inquiry submissions |
| Pilot duration | [PENDING POPULATION — define pilot window] |
| Pilot proof pack target | Investor-presentable evidence of buyer-supplier engagement |

---

## 3. Platform Readiness Criteria for Pilot Kickoff

These are the minimum platform conditions required before Paresh conducts field supplier
onboarding or shares any buyer-facing link.

| # | Criteria | Status | Priority |
|---|---|---|---|
| PR-1 | Auth/onboarding flow works with real (non-QA) email | NOT_ASSESSED | P0 |
| PR-2 | Supplier can create and publish a product end-to-end in production | NOT_ASSESSED | P0 |
| PR-3 | Product appears in public B2C browse within minutes of publish | NOT_ASSESSED | P0 |
| PR-4 | Inquiry submission works and notification reaches Paresh or supplier | NOT_ASSESSED | P0 |
| PR-5 | Control plane allows Paresh to activate a tenant and inspect state | NOT_ASSESSED | P0 |
| PR-6 | At least 5 real Surat supplier products seeded and visible | NOT_ASSESSED | P0 |
| PR-7 | Auth/tenant pages confirmed noindex (no accidental exposure) | NOT_ASSESSED | P0 |
| PR-8 | Paresh has tested the flow himself as both a supplier and a buyer | NOT_ASSESSED | P0 |
| PR-9 | A rollback procedure is documented and has been tested once | NOT_ASSESSED | P1 |
| PR-10 | Error monitoring is in place (Sentry or equivalent) | NOT_ASSESSED | P1 |

---

## 4. Supplier Data Completeness Criteria

A supplier profile is considered "pilot-ready" for public listing when it meets this threshold:

| Field | Required | Status |
|---|---|---|
| Supplier name | Yes | — |
| Business type (textile mill / agent / manufacturer) | Yes | — |
| City (Surat) | Yes | — |
| At least 3 published products with images | Yes | — |
| Product description (min 50 chars) | Yes | — |
| Product GSM / fabric composition | Recommended | — |
| MOQ (minimum order quantity) | Recommended | — |
| Inquiry form accessible from product detail | Yes | — |
| Supplier profile slug (unique, clean) | Yes | — |
| At least 1 collection or category association | Recommended | — |
| Origin story field (optional but valuable for D2C narrative) | Optional | — |
| DPP passport (if available) | Optional | — |

**Minimum threshold for public browse:** 3 products + inquiry accessible + supplier name + city.

---

## 5. Buyer Engagement Proof Metrics

The pilot is considered successful as a proof-of-concept when:

| Metric | Target | Notes |
|---|---|---|
| Real inquiry submissions from non-Paresh email addresses | ≥5 | Proves buyer interest |
| Inquiries that received a supplier response | ≥3 | Proves supplier engagement |
| Buyer-supplier conversations that progressed past first exchange | ≥1 | Proves platform creates value |
| Repeat buyer engagement (same buyer, second visit or inquiry) | ≥1 | Proves stickiness |
| Supplier reported as "useful" in informal feedback | ≥3 | Social proof |

---

## 6. Pilot Proof Pack

The pilot proof pack is the investor/partner-presentable evidence package. Paresh should be
able to produce this within 30 days of first real supplier activation.

| # | Proof Element | Status |
|---|---|---|
| PP-1 | 30+ supplier profiles visible on public browse | NOT_ASSESSED |
| PP-2 | 5+ real inquiry submissions with buyer email evidence (redacted PII) | NOT_ASSESSED |
| PP-3 | 1+ completed buyer-supplier inquiry loop (submitted → response → thread) | NOT_ASSESSED |
| PP-4 | Google Search Console showing first organic impressions on Surat textile keywords | NOT_ASSESSED |
| PP-5 | Screen recording of full supplier onboarding flow | NOT_ASSESSED |
| PP-6 | Testimonial or informal written confirmation from ≥2 Surat suppliers | NOT_ASSESSED |
| PP-7 | Platform uptime evidence (Vercel deployment log or health check) | NOT_ASSESSED |
| PP-8 | DPP passport demo on at least 1 real textile product (if DPP gate resolved) | NOT_ASSESSED |

---

## 7. Field GTM Milestones

| # | Milestone | Prerequisites | Status |
|---|---|---|---|
| GTM-1 | Paresh demos platform to himself as supplier + buyer | Platform readiness criteria met (Section 3) | NOT_ASSESSED |
| GTM-2 | Paresh activates first 5 Surat pilot suppliers (known network) | GTM-1 complete; invite flow works | NOT_ASSESSED |
| GTM-3 | First 5 suppliers have published ≥3 products each | GTM-2 complete; supplier training done | NOT_ASSESSED |
| GTM-4 | Paresh shares first buyer-facing link (soft, known buyers only) | GTM-3 complete; 15+ products visible | NOT_ASSESSED |
| GTM-5 | First real inquiry submission from a buyer | GTM-4 + buyer link shared | NOT_ASSESSED |
| GTM-6 | First inquiry → supplier response loop completed | GTM-5 + notification verified working | NOT_ASSESSED |
| GTM-7 | Scale to 30–50 suppliers (wider Surat network activation) | GTM-6 + platform stability verified | NOT_ASSESSED |
| GTM-8 | Pilot proof pack assembled | GTM-7 + buyer engagement metrics met | NOT_ASSESSED |

---

## 8. Go / No-Go Criteria for Expansion Beyond Surat Pilot

TexQtic should NOT expand beyond the Surat pilot cohort until:

| Criterion | Threshold | Status |
|---|---|---|
| Platform stable under pilot load | Zero P0 incidents in 2 consecutive weeks | NOT_ASSESSED |
| Inquiry loop proven | ≥3 completed buyer-supplier threads | NOT_ASSESSED |
| Supplier feedback positive | ≥3 informal confirmations from Surat suppliers | NOT_ASSESSED |
| Proof pack complete | All 8 proof elements assembled | NOT_ASSESSED |
| Paresh has reviewed the proof pack for investor readiness | Written sign-off | NOT_ASSESSED |
| TTP counsel feedback received (if TTP is on expansion path) | Counsel response in hand | NOT_ASSESSED |
| Subscription/commercial packaging decision made | Paresh decision documented | NOT_ASSESSED |

---

## 9. Update History

| Date | Change | Who |
|---|---|---|
| 2026-05-19 | Skeleton created by TEXQTIC-LAUNCH-READINESS-PLANNING-HUB-DESIGN-001 | Copilot/Design unit |
| — | (To be populated) | — |
