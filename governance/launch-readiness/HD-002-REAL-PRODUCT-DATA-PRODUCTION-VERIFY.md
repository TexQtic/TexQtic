# HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY

**Hub:** `governance/launch-readiness/`
**Unit:** `HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-001`
**Date:** 2026-05-20
**Register entry:** HD-002 (Hidden Dependency — Public B2C browse requires real supplier product data)
**Verdict:** **VERIFIED_FAIL**

---

## Summary

Production B2C public browse at `https://app.texqtic.com/products` contains **QA fixture data
only**. No real Surat India textile supplier products are present in the production database
with B2C public projection posture.

---

## Evidence

### Browse API (`GET /api/public/b2c/products`)

| Field | Production state |
|---|---|
| Total storefront entries | 1 |
| Supplier name | "QA B2C" |
| Supplier jurisdiction | US-CA (not India) |
| Product count | 3 |
| Product names | "QA B2C Cotton Scarf", "QA B2C Linen Wrap", "QA B2C Silk Pocket Square" |
| Product images | placehold.co placeholders |
| Category / Material / FabricType | null on all 3 products |

### Product Detail API (`GET /api/public/b2c/products/:slug`)

| Field | Production state |
|---|---|
| Summary | "B2C browse proof item one." (QA copy) |
| Description | "B2C browse proof item one." (QA copy) |
| Trust signals | ["Public-safe projection only"] (QA signal) |
| hasTraceabilityEvidence | false |
| hasPassport | false |

### Collections Surface (`/collections`)

- 5 collections rendered correctly from static config ✅
- All are editorial/conceptual ecosystem framing — no live product inventory
- Functionally correct but not backed by real product data

### Category Pages (`/products/category/:slug`)

- Hero and SEO metadata render correctly from static config ✅
- Product grid: 0 real products per category filter (all QA products have `category: null`)

---

## Verdict

**VERIFIED_FAIL** — HD-002 is not satisfied. The production B2C public marketplace
contains only QA/test fixture data. No real Surat India textile supplier or product
is published with B2C public projection posture.

**Buyer-facing CTA traffic MUST NOT be directed to `/products` or `/product/:slug`
until HD-002 is resolved via real supplier onboarding and product seeding.**

---

## BS-001 Status

BS-001 is **CONFIRMED** by this unit. All prior B2C browse and product detail governance
verifications were performed using this same QA fixture set. The QA data is confirmed
live in production as of 2026-05-20.

---

## Required Next Steps

1. **HD-001** — Resolve invite-token supplier onboarding before real supplier can be activated
2. **Real supplier seeding** — At least 1 real Surat India textile supplier must be onboarded
   and seed ≥10 real products with complete metadata (name, description, image, category,
   material, fabricType) through all five B2C projection safety gates
3. ~~**QA data remediation** — Set QA org `publication_posture = PRIVATE_OR_AUTH_ONLY`
   before any public buyer traffic is directed to browse pages~~ **DONE (2026-05-20) —
   `TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001`**: QA B2C org
   `publication_posture` set to `PRIVATE_OR_AUTH_ONLY`. Public browse now returns
   `items:[], total:0`. QA product detail returns HTTP 404. QA records preserved.
4. **HD-002 recheck** — Rerun this verification after real data is seeded

---

## Register Updates (2026-05-20)

| Register | Row | Change |
|---|---|---|
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | HD-002 | OPEN → VERIFIED_FAIL |
| `BLIND-SPOT-DEPENDENCY-RISK-REGISTER.md` | BS-001 | Evidence column updated with confirmation |
| `NEXT-ACTION.md` | `last_closed_governance_unit` | Rotated to HD-002 |

## Quarantine Follow-Up (2026-05-20)

`TEXQTIC-NC-QA-B2C-PUBLIC-PROJECTION-QUARANTINE-001` — QUARANTINE_VERIFIED_COMPLETE

QA B2C `publication_posture` set to `PRIVATE_OR_AUTH_ONLY` via Gate B (org-level).
Public browse: `items:[], total:0`. Product detail: HTTP 404.
QA tenant/org/products preserved — no records deleted.
HD-002 remains VERIFIED_FAIL. Real supplier data still absent.
