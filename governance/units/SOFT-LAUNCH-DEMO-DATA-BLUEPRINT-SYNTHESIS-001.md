# SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001

**Packet ID:** SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-D2-FINAL-ARTIFACT  
**Unit ID:** SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001  
**Status:** GOVERNANCE_SYNTHESIS — no source changes, no production mutation, no supplier/product seeding  
**Date:** 2026-05-21  
**Synthesizes:** A4 onboarding flow map · B4 supplier field inventory · C4 product data inventory · D1 path synthesis  
**Authority boundary:** Findings and sequence only. This unit does not open any family cycle,
authorize any DB write, authorize any implementation, or change Layer 0 posture.
Layer 0 control surface (`governance/control/NEXT-ACTION.md`, `OPEN-SET.md`) is not modified —
the soft-launch track is a parallel operational track; it does not override the
`HOLD_FOR_COUNSEL_FEEDBACK` hold on the TTP/legal queue.

---

## 1. Executive Recommendation

**The fastest safe path to a visible, real-data public B2C browse experience requires no new
code, no SMTP, and no CRM coordination. Paresh can execute it end-to-end as a solo operator.**

Four structural facts constrain the sequence:

1. **Gate C is the invisible blocker for existing pilot accounts.** The B2C public browse
   projection requires `organizations.org_type = 'B2C'`. Surat pilot suppliers are
   provisioned as `base_family: "B2B"` → `org_type = 'B2B'`. They will never pass Gate C.
   A dedicated B2C-type supplier account must be provisioned separately from the B2B pilot cohort.

2. **`publicationPosture` has no API or UI write path.** Every catalog item is hard-created
   at `PRIVATE_OR_AUTH_ONLY`. Posture elevation to `B2C_PUBLIC` requires a controlled DB script.
   A new script is needed — the existing `assign-b2c-public-posture.ts` targets the QA slug
   only. The new script is a 5-line target change; it is not a new implementation unit.

3. **SMTP does not block any step in the seeding sequence.** The invite token is returned in
   the provisioning 201 response; Paresh delivers the URL manually. Public browse is
   unauthenticated. SMTP only becomes a blocking dependency when buyer inquiry notifications
   must be pushed to suppliers (FTR-B2C-004 / PRIT-033).

4. **The invite URL must include `&action=invite`.** Without this parameter, the supplier's
   browser routes to the password-reset handler, not the onboarding form. The token is silently
   discarded. This is an operational runtime risk with no platform-side safety net.

**Recommended sequence (§2) can be started the moment Paresh supplies the seven inputs listed
in §7.** Everything else is already implemented and production-verified.

---

## 2. Manual / Admin Soft-Launch Path

**Recommended for: Surat pilot (10–30 suppliers), curated B2C demo surface, HD-002 resolution.**

All steps below are executable today with zero new code, zero SMTP, and zero external team
coordination. Paresh is the sole required actor.

---

### Phase 0 — Pre-conditions (Paresh inputs — see §7 for full list)

Before any provisioning step, Paresh must supply:
- Business name and first-owner email for the B2C demo supplier account
- Decision on whether Surat pilot suppliers (B2B) also need a B2C showcase path
- Real product data: names, prices, MOQs, description text, and CDN image URLs (5 products)
- Pricing consent: confirmation that real prices may be displayed publicly
- `orchestrationReference` string for the B2C supplier (e.g. `b2c-demo-001`)

---

### Phase 1 — Provision a B2C-type supplier account

```
POST /api/control/tenants/provision
Authorization: Bearer <SUPER_ADMIN JWT (Supabase Auth at app.texqtic.com)>

{
  "provisioningMode": "APPROVED_ONBOARDING",
  "orchestrationReference": "b2c-demo-001",
  "base_family": "B2C",
  "organization": {
    "legalName": "<real supplier company name>",
    "jurisdiction": "IN"
  },
  "firstOwner": {
    "email": "<supplier-owner@company.com>"
  }
}
```

**Extract from 201 response:**

| Field | Path in response | Action |
|---|---|---|
| `orgId` | `orgId` | Record permanently — this is the supplier's platform UUID |
| Invite token | `firstOwnerAccessPreparation.inviteToken` | Used to construct invite URL |
| Invite expiry | `firstOwnerAccessPreparation.expiresAt` | 7-day TTL — invite must be delivered promptly |

**Invite URL (mandatory format — both parameters required):**
```
https://app.texqtic.com/?token=<64-char-hex>&action=invite
```

> ⚠️ **Operational risk:** Without `&action=invite`, the supplier's browser routes to the
> password-reset screen. The token is silently discarded. The invite TTL continues counting.
> This has been confirmed in source (`App.tsx` mount effect).

---

### Phase 2 — Supplier activates; Paresh runs 2-step admin approval

Paresh delivers the invite URL via WhatsApp or direct email. Supplier completes the 4-step form.

After supplier activation (supplier's `organizations.status` transitions to `PENDING_VERIFICATION`),
Paresh runs two admin API calls:

```
POST /api/control/tenants/<orgId>/onboarding/outcome
body: { "outcome": "APPROVED" }

POST /api/control/tenants/<orgId>/onboarding/activate-approved
```

Result: `organizations.status = 'ACTIVE'`. Supplier is fully live and can log in.

---

### Phase 3 — Gate elevation via admin SQL (Gates A + B)

Gates C and D are satisfied automatically after Phase 1–2:
- Gate C: `org_type = 'B2C'` is set at provisioning from `base_family: "B2C"`
- Gate D: `organizations.status = 'ACTIVE'` is set by Phase 2 admin approval

Gates A and B require direct SQL (no API surface):

```sql
-- Gate A: tenant eligibility posture
UPDATE tenants
SET "publicEligibilityPosture" = 'PUBLICATION_ELIGIBLE'
WHERE id = '<orgId>';

-- Gate B: org publication posture
UPDATE organizations
SET publication_posture = 'B2C_PUBLIC'
WHERE id = '<orgId>';
```

These writes must be applied via `psql` using `DATABASE_URL` per TexQtic DB execution rules.
No Prisma migration involved. Idempotent on re-run.

---

### Phase 4 — Product seeding via tenant UI or API

Log in as the supplier at `app.texqtic.com`. Create 5 products via the tenant catalog UI or
via `POST /api/tenant/catalog/items` (OWNER role required).

**Minimum field set per product (all writable via UI/API — no script required):**

| Field | API param | Type | Constraint |
|---|---|---|---|
| Name | `name` | string | Required; real product name, not placeholder |
| Price | `price` | positive number | Required; real indicative wholesale price |
| MOQ | `moq` | integer ≥ 1 | Optional (default 1); set real value for industrial fabric |
| Image URL | `imageUrl` | string url | Optional but required for quality; CDN-hosted real product photo |
| Description | `description` | free text | Optional but required for detail richness; ≥ 2 real sentences |
| Category | `productCategory` | enum | Optional but required for browse facets; one of 9 values |
| Material | `material` | enum | Optional but required for browse facets; one of 16 values |
| Fabric type | `fabricType` | enum | Optional but required for browse enrichment; one of 8 values |

**After creation:** all items are at `PRIVATE_OR_AUTH_ONLY` and invisible in public browse.

---

### Phase 5 — Item posture elevation via controlled script

The existing script `server/scripts/assign-b2c-public-posture.ts` targets the hardcoded
`qa-b2c` slug. A new script is required targeting the real supplier slug.

The new script must:
- Target exactly the real supplier slug (from `orchestrationReference` / org slug)
- Set `catalog_items.publication_posture = 'B2C_PUBLIC'` on the supplier's active items
- Be idempotent (re-runnable without side effects)
- Require `PARESH_AUTHORIZED=true` guard (same pattern as existing QA seed scripts)
- NOT touch any other supplier, tenant, or catalog record

This is a targeted change to the existing script's `WHERE` clause — not a new family cycle.
The implementation packet for this script is `PRODUCT-SEEDING-IMPLEMENTATION-G2` (see §8).

---

### Phase 6 — Verification

```
GET /api/public/b2c/products
```

Expected: `{ items: [{ slug, legalName, productsPreview: [...5 items] }], total: 1 }`

```
GET /api/public/b2c/products/<product-slug>
```

Expected: `{ slug, name, category, material, fabricType, summary, description,
             imageUrls, publicSupplierName, publicPriceLabel, publicMoqLabel,
             trustSignals, tags, relatedProducts }`

If `{ items: [], total: 0 }` is returned: recheck all five gates (§2, Phase 3).

---

## 3. CRM / Main App Handoff — Later Path

**When:** Before CRM-automated provisioning at volume (> ~50 suppliers / month).  
**What this unlocks:** Path 2 from A4 — CRM calls `POST /api/control/tenants/provision`
autonomously using a service bearer token, without Paresh manually constructing each API call.

**Three pre-conditions (all operational — no new implementation required):**

| # | Task | Who | Evidence |
|---|---|---|---|
| 1 | Generate a service bearer token; hash it; set `APPROVED_ONBOARDING_SERVICE_TOKEN_HASH` in Vercel | Paresh | Vercel env var confirmed set |
| 2 | Share token + endpoint spec with CRM team | Paresh | Doc: `docs/TEXQTIC-CRM-REGISTRATION-ACTIVATION-HANDOFF-WHITE-PAPER-v1.md` |
| 3 | Implement automated `ACTIVE` status transition (PI-001) | Engineering | Removes the 2-step manual approval gate |

**One additional operational improvement (recommended, not blocking):**
- Implement platform-to-CRM activation push (PI-002) to replace polling; without it, CRM must
  poll `GET /api/control/tenants/provision/status?orgId=<uuid>` after each supplier activation

**Governance contract:** The CRM polling endpoint spec exists at
`docs/TEXQTIC-MAIN-APP-ACTIVATION-MILESTONE-AND-CRM-POLLING-CONTRACT-v1.md`.

---

## 4. CAE-Assisted — Later Path

**When:** Once the CAE/CRM field acquisition pipeline is operational and FAM-23/24 are scoped.  
**What this unlocks:** Path 3 (WEBHOOK-007) — CAE provisions public B2B supplier profiles
autonomously via HMAC-authenticated webhook, without Paresh involvement.

**Critical distinction:** WEBHOOK-007 provisions a *public supplier profile* only. It does NOT
create a tenant login, membership, or invite. Suppliers appear in the directory but cannot log in.
This path complements Path 1/2 — it does not replace them.

**Two pre-conditions:**

| # | Task | Who |
|---|---|---|
| 1 | Set `ACQUISITION_PROVISIONING_WEBHOOK_SECRET` in Vercel | Paresh |
| 2 | CAE/CRM configured with HMAC secret and `POST /api/internal/acquisition/provision-supplier` endpoint spec | CRM team |

**Governance:** FAM-23/24 must be opened and audited before trusting automated CAE-sourced data.

---

## 5. Minimum Supplier Data Packet

The following is the complete data packet required to provision one Surat pilot supplier.
Paresh must collect this before running Phase 1 of §2.

### Admin-supplied at provisioning (6 fields)

| Field | Value format | Example |
|---|---|---|
| `orchestrationReference` | `"surat-pilot-NNN"` (sequential) | `"b2c-demo-001"` |
| `organization.legalName` | Registered company name | `"Surat Weaves Pvt Ltd"` |
| `organization.jurisdiction` | ISO country code | `"IN"` |
| `firstOwner.email` | Supplier's business email (exact; typo = 403 at activation) | `"owner@company.com"` |
| `base_family` | `"B2C"` for browse-eligible; `"B2B"` for B2B-only pilot suppliers | `"B2C"` |
| Admin JWT | SUPER_ADMIN JWT from Supabase Auth at `app.texqtic.com` | (Paresh generates at login) |

### Supplier-supplied at activation (4 fields — supplier types these into the form)

| Form field | Step | Constraint | Risk |
|---|---|---|---|
| Email | Step 2 | Must match `firstOwner.email` exactly (lowercased) | Mismatch → 403 EMAIL_MISMATCH; only recovery is re-provisioning |
| Password | Step 2 | Min 6 chars | No confirm-password field; mistype only discovered at first login |
| Registration number | Step 4 | Any business registration ID (CIN / LLPIN / GSTIN) | Free text; no format enforcement |
| Jurisdiction | Step 4 | Free text; no dropdown | Supplier may type `India` instead of `IN`; this overwrites provisioned value |

### Admin post-activation (2 API calls — no data required)

```
POST /api/control/tenants/<orgId>/onboarding/outcome   { "outcome": "APPROVED" }
POST /api/control/tenants/<orgId>/onboarding/activate-approved
```

### Optional post-activation enrichment (not required for soft launch)

`primary_segment_key` (e.g. `"WOVEN_FABRIC"`), `role_position_keys` (e.g. `["manufacturer"]`),
`secondary_segment_keys` — set at provisioning or post-activation for richer B2B directory listing.

---

## 6. Minimum Product Data Packet

The following data must be collected per product before seeding. Paresh must obtain this from
the supplier before running Phase 4–5 of §2.

**Minimum: 5 products per supplier. Recommended: 5 (fills `MAX_PRODUCT_PREVIEW = 5`).**

### Per-product required fields

| Field | Constraint | Why it matters |
|---|---|---|
| `name` | Real product name; not placeholder | Displayed as heading in browse card and detail page |
| `price` | Real indicative wholesale price (positive Decimal) | Displayed as `publicPriceLabel` to unauthenticated buyers; fake prices mislead |
| `moq` | Real minimum order quantity (int ≥ 1) | Displayed as `publicMoqLabel`; default of `1` misrepresents industrial fabric |
| `imageUrl` | Publicly accessible CDN URL to real product photograph; absolute URL; max 2048 chars | Null renders broken browse card; placeholder images are not acceptable |
| `description` | ≥ 2 honest sentences: material, use, supply context | Used as detail-page summary (first 180 chars) and full description |
| `productCategory` | One of: `APPAREL_FABRIC` `HOME_TEXTILE` `TECHNICAL_FABRIC` `INDUSTRIAL_FABRIC` `LINING` `INTERLINING` `TRIMMING` `ACCESSORY` `OTHER` | Drives browse facet and SEO `tags` array |
| `material` | One of: `COTTON` `POLYESTER` `SILK` `WOOL` `LINEN` `VISCOSE` `MODAL` `TENCEL_LYOCELL` `NYLON` `ACRYLIC` `HEMP` `BAMBOO` `RECYCLED_POLYESTER` `RECYCLED_COTTON` `BLENDED` `OTHER` | Drives browse facet and SEO `tags` array |
| `fabricType` | One of: `WOVEN` `KNIT` `NON_WOVEN` `LACE` `EMBROIDERED` `TECHNICAL_COMPOSITE` `FLEECE` `OTHER` | Drives browse enrichment and `tags` array |

### Image requirements

| Requirement | Specification |
|---|---|
| Hosting | Publicly accessible CDN; no authentication required to fetch |
| Format | JPEG or PNG; minimum 600 × 600 px recommended for card display |
| Count per product | ≥ 1 (projection renders `imageUrls[0]`) |
| Not acceptable | `null`, `placeholder.com`, `localhost:*`, private Supabase Storage URLs, images that do not match the product name |

### Fields that must NOT be fake or placeholder

`name`, `price`, `imageUrl`, `description`, `productCategory`, `material`, `fabricType`,
`organizations.legal_name` (set at provisioning — appears as `publicSupplierName` on detail page).

### Optional fields for richer detail (deferred — not required for HD-002 recheck)

`catalogStage`, `stageAttributes`, `sku`, `composition`, `color`, `gsm`, `widthCm`, `construction`,
`certifications` — none appear in current public projection output.

---

## 7. Required Paresh Inputs Before Any Seeding

No provisioning, posture script, or product seeding step should proceed without these.
They cannot be inferred from the codebase.

| # | Input | Why blocking | Format |
|---|---|---|---|
| 1 | **Supplier type decision** — are any Surat pilot suppliers meant to appear in B2C public browse, or is B2C browse a separate demo account? | B2B `org_type` fails Gate C unconditionally. Existing B2B pilot accounts cannot be repurposed without reprovisioning. | Decision: `B2C demo account separate` OR `provision named Surat supplier as B2C` |
| 2 | **B2C supplier legal name and email** — the real supplier to provision as `base_family: "B2C"` | Required fields for `POST /api/control/tenants/provision` | Registered company name + business email (exact, no typos) |
| 3 | **`orchestrationReference` for each supplier** | Idempotency key; unique per org; required by provisioning API | e.g. `b2c-demo-001`, `surat-pilot-001`, `surat-pilot-002`, … |
| 4 | **Pricing consent** — confirmation that real indicative wholesale prices from suppliers may be displayed publicly and without obfuscation | `publicPriceLabel` is shown raw to unauthenticated buyers. No price masking exists in current projection. | Explicit written confirmation per supplier |
| 5 | **Product photograph URLs** — 5 real product images per supplier, publicly accessible on a CDN | `imageUrl` null renders a broken browse card. No image upload feature exists in the current catalog UI (TENANT-CATALOG-IMAGE-UPLOAD-GAP-001/002). Supplier must pre-host images. | Array of 5 absolute HTTPS URLs; JPEG/PNG; publicly accessible |
| 6 | **Invite URL format acknowledgement** — confirmation that Paresh will use `?token=<hex>&action=invite` (not just `?token=<hex>`) | Without `&action=invite`, supplier hits the password-reset screen. Runtime operational risk with no platform-side safety net. | Verbal or written confirmation |
| 7 | **GSTIN gate decision** — will Paresh require GSTIN verification before approving suppliers to `ACTIVE` status? | No platform enforcement exists for GSTIN-before-approval. This is an operator policy decision. | Decision: `GSTIN required` OR `GSTIN deferred for pilot` |

---

## 8. Next Packet Sequence

Packets are ordered by dependency. Each packet references its prerequisite inputs.

### Track 1 — Pre-requisite closure (parallel to Track 2)

| Packet ID | Name | Mode | Prerequisite | Status |
|---|---|---|---|---|
| `SOFT-LAUNCH-SMTP-REMEDIATION-E1` | SMTP remediation or bypass assessment | Implementation or ops decision | SMTP provider decision by Paresh | Blocks buyer inquiry email notification (FTR-B2C-004 / PRIT-033); does NOT block seeding sequence |
| `SOFT-LAUNCH-LEGAL-PAGES-E2` | Legal pages bundle (PRIT-034) | Implementation | PRIT-034 prior design | Required before any public data collection surface is promoted to live traffic |

### Track 2 — Seeding sequence (primary critical path)

| Packet ID | Name | Mode | Prerequisite | Blocks |
|---|---|---|---|---|
| `SOFT-LAUNCH-SUPPLIER-DATA-QUESTIONNAIRE-F1` | Supplier data questionnaire | Governance / operational | 7 Paresh inputs in §7 answered | Unblocks F2 |
| `SOFT-LAUNCH-REAL-SUPPLIER-ONBOARDING-PILOT-F2` | Real supplier onboarding pilot (Phase 1–3 of §2) | Operations (admin API calls + SQL scripts) | F1 complete; B2C supplier name/email/ref confirmed | Unblocks G1 |
| `SOFT-LAUNCH-PRODUCT-SEEDING-DESIGN-G1` | Product seeding design and script specification | Governance design | F2 supplier account `ACTIVE`; Paresh image URLs confirmed | Unblocks G2 |
| `SOFT-LAUNCH-PRODUCT-SEEDING-IMPLEMENTATION-G2` | Product seeding implementation (Phase 4–5 of §2) | Implementation (new controlled script + tenant UI seeding) | G1 complete; real product data packet from supplier | Unblocks H1 |
| `HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-002` | HD-002 recheck — real product data verification | Verification | G2 products seeded and posture elevated | Closes HD-002 |

### Track 3 — CRM / CAE (later — not on soft-launch critical path)

| Packet ID | Name | Mode | Prerequisite | Blocks |
|---|---|---|---|---|
| `CRM-HANDOFF-DESIGN-I1` | CRM handoff design — service token, Path 2 activation | Governance design + operational | Paresh decision to open CRM integration; PI-001 scoped | Volume provisioning automation |
| `CRM-HANDOFF-IMPLEMENTATION-I2` | CRM handoff implementation — PI-001 automated ACTIVE transition | Implementation | I1 design | Removes manual 2-step admin approval at scale |
| `CAE-OPERATING-MODEL-J1` | CAE operating model design (FAM-23/24 scope) | Governance design | CAE acquisition pipeline operational; WEBHOOK-007 secret set in Vercel | CAE-sourced directory automation |

---

## 9. What Not to Build Now

These items have been identified as out-of-scope for soft launch. Do not open implementation
units for any of these until the corresponding prerequisite conditions are met.

| Item | Reason to defer | Opens when |
|---|---|---|
| Supplier self-registration (FAM-07) | Path 1 handles all Surat pilot volume manually; FAM-07 is `LAUNCH_BLOCKER` requiring FAM-06 first | FAM-06 full cycle complete + Paresh authorization |
| Buyer account creation (FAM-08) | Inquiry capture is sufficient for pilot; FAM-08 is `LAUNCH_BLOCKER` requiring FAM-06 first | FAM-06 full cycle complete + Paresh authorization |
| CRM service token configuration (Path 2) | Manual provisioning is sufficient at pilot scale (10–30 suppliers/month) | Paresh decides to scale provisioning volume beyond manual throughput |
| WEBHOOK-007 activation | No live CAE acquisition pipeline; not required for curated pilot | CAE pipeline operational + FAM-23/24 opened |
| Automated ACTIVE status transition (PI-001) | Manual 2-step admin review is sufficient at pilot scale | CRM handoff design (I1) approved |
| UI field for `publicationPosture` | Script-based posture elevation is the correct architecture; exposing this field in the tenant UI would bypass the admin gate | No planned path — governance-controlled posture elevation must remain an admin action |
| Fix for dead form fields (UX-2, UX-3, UX-8) | Not blocking activation; cosmetic improvements deferred | Separate UX cleanup unit; not on critical path |
| `prefilledData` fix (UX-1) | Paresh can verbally confirm the supplier's legal name before activation | Deferred to UX cleanup unit |
| General inquiry event infrastructure (PI-005) | Not blocking pilot inquiry capture; events are written to DB | Post-pilot operational tooling cycle |

---

## 10. SMTP Dependency Summary

| Capability | SMTP required | Status without SMTP |
|---|---|---|
| Supplier provisioning (Phase 1) | NO | Fully operational — invite token is in 201 response |
| Supplier activation (Phase 2) | NO | Supplier opens URL directly; no email sent by platform |
| Admin 2-step approval (Phase 2) | NO | Admin API calls only |
| Gate elevation via SQL (Phase 3) | NO | Direct DB write; no email involved |
| Product seeding via tenant UI (Phase 4) | NO | Authenticated tenant session |
| Item posture elevation via script (Phase 5) | NO | Direct DB write |
| Public B2C browse | NO | Fully unauthenticated |
| **Buyer inquiry notification to supplier** | **YES — FTR-B2C-004 / PRIT-033** | Inquiry captured to DB; supplier NOT notified. Buyer submits inquiry; no confirmation sent. This is the only SMTP gap that matters before buyer-facing CTA traffic is promoted. |
| Password reset (post-activation) | YES | Not needed during initial seeding; new suppliers create password at activation |
| Automated invite delivery (future, Path 2) | YES | Not needed while Paresh delivers manually |

**SMTP verdict:** The complete 6-phase seeding sequence can proceed without SMTP. SMTP remediation
(`SOFT-LAUNCH-SMTP-REMEDIATION-E1`) must be completed before buyer-facing inquiry traffic is
promoted, but it does not block the seeding sequence itself.

---

## 11. No Source Changes Confirmation

No source files were modified by this synthesis.  
No database records were mutated.  
No supplier or product records were seeded.  
No `.env` values were printed or modified.  
No Prisma migrations were run.  
No `governance/control/NEXT-ACTION.md` or `governance/control/OPEN-SET.md` modifications were made —  
the soft-launch operational track is parallel to and does not disturb the Layer 0 TTP/legal hold.  
This file (`governance/units/SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md`) is the only  
artifact produced by the D2 task.
