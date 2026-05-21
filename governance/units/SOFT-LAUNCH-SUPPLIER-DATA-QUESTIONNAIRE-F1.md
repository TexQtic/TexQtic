# SOFT-LAUNCH-SUPPLIER-DATA-QUESTIONNAIRE-F1

**Packet ID:** SOFT-LAUNCH-SUPPLIER-DATA-QUESTIONNAIRE-F1  
**Unit ID:** SOFT-LAUNCH-SUPPLIER-DATA-QUESTIONNAIRE-F1  
**Status:** AWAITING_PARESH_INPUT — no seeding, provisioning, or source changes authorized  
**Date:** 2026-05-21  
**Track:** Soft Launch Onboarding + Demo Data Blueprint  
**Prerequisite to:** F2 (real supplier onboarding pilot) · G1 (product seeding design) · G2 (product seeding implementation) · HD-002 recheck  
**Authority boundary:** Input capture only. This unit does not open any family cycle,
authorize any DB write, authorize any provisioning, authorize any script execution,
authorize any product seeding, or authorize HD-002 recheck.
Layer 0 control surface (`governance/control/NEXT-ACTION.md`, `OPEN-SET.md`) is not modified.

---

## 1. Why These Inputs Are Required Before Seeding

The D2 blueprint (`SOFT-LAUNCH-DEMO-DATA-BLUEPRINT-SYNTHESIS-001.md`) identified seven inputs
that cannot be inferred from the codebase. Without each one, the following consequences apply:

| Input | Consequence if missing |
|---|---|
| Supplier type decision | B2B `org_type` silently fails Gate C. A B2B pilot account provisioned as `B2B` can never appear in public browse. No recovery without re-provisioning. |
| Legal name | `POST /api/control/tenants/provision` will return `400` — `organization.legalName` is API-required. |
| First-owner email | API-required. A typo results in `403 EMAIL_MISMATCH` at activation with no recovery path except full re-provisioning. |
| `orchestrationReference` | API-required. Duplicate value returns `409 CONFLICT_ORCHESTRATION_REFERENCE_DUPLICATE`. Must be unique per org. |
| Pricing consent | `publicPriceLabel` is shown raw to unauthenticated buyers. No price masking exists in the public projection. Displaying unconfirmed prices publicly carries operational and commercial risk. |
| Product photograph URLs | A null `imageUrl` renders a broken browse card. No image upload surface exists in the tenant catalog UI (`TENANT-CATALOG-IMAGE-UPLOAD-GAP-001/002`). CDN URLs must be supplied externally. |
| Invite URL acknowledgement | Without the `/accept-invite` path, the token is silently discarded. Without `&action=invite`, the browser routes to the password-reset screen. Both constraints are A2-verified. |
| GSTIN gate decision | No GSTIN enforcement exists in the platform. This is an operator policy decision. Without it, the admin approval step has no documented gate criteria. |

**No provisioning, product seeding, posture elevation, or HD-002 recheck should proceed until
all sections of this questionnaire are completed and confirmed by Paresh.**

---

## 2. Supplier Type Decision

> Fill in exactly one option.

**Question:** For the soft-launch B2C public browse experience, which provisioning approach applies?

| Option | Description | Select |
|---|---|---|
| A | Provision a dedicated B2C demo supplier account (separate from any Surat B2B pilot accounts) | ☐ |
| B | Provision a named Surat pilot supplier directly as `base_family: "B2C"` | ☐ |

**Note:** This decision is irreversible at provisioning time without full re-provisioning.
Existing Surat B2B pilot accounts (`org_type = 'B2B'`) unconditionally fail Gate C of the
public browse projection and cannot be repurposed as B2C accounts.

If **Option B** is selected, provide the specific Surat supplier name and email in §3 below.

---

## 3. Supplier Identity

> Fill in all fields. These map directly to `POST /api/control/tenants/provision` request body.

| Field | API param | Constraint | Paresh Input |
|---|---|---|---|
| Legal name | `organization.legalName` | Registered company name; 2–500 chars; this value appears publicly as `publicSupplierName` on product detail pages | |
| First-owner email | `firstOwner.email` | Business email; exact match required at activation; typo = 403 EMAIL_MISMATCH with no recovery | |
| Orchestration reference | `orchestrationReference` | Unique per org; max 255 chars; e.g. `b2c-demo-001` or `surat-pilot-001`; duplicate value returns 409 | |
| Base family | `base_family` | Must be `B2C` for public browse eligibility | `B2C` (fixed for this questionnaire) |
| Jurisdiction | `organization.jurisdiction` | ISO country code; use `IN` for India | `IN` |

**Supplier count:** How many B2C suppliers will be provisioned in this soft-launch batch?

```
Number of suppliers: ____
```

> If provisioning more than one supplier, copy §3 once per additional supplier.
> Each supplier requires its own unique `orchestrationReference` and first-owner email.

---

## 4. Invite URL Acknowledgement

> Read and confirm. This is input #6 from D2 §7.

The canonical invite URL, A2-verified against `email.service.ts` line 263 and `App.tsx`
mount effect, is:

```
https://app.texqtic.com/accept-invite?token=<inviteToken>&action=invite
```

Two constraints are both required:

| Constraint | Risk if violated |
|---|---|
| `/accept-invite` path | Without this path, the token is extracted by the wrong handler and silently discarded. The supplier sees the homepage or an error. |
| `&action=invite` parameter | Without this parameter, the browser routes to the password-reset handler, not the onboarding form. The invite token is silently discarded. The 7-day TTL continues counting. |

The `<inviteToken>` value is found at `firstOwnerAccessPreparation.inviteToken` in the
`POST /api/control/tenants/provision` 201 response. Paresh constructs and delivers the URL
manually (via WhatsApp or direct email) because SMTP is not configured in production (HD-001-SMTP-INFRA-GAP-001).

**Confirmation:** I confirm I will construct the invite URL using the canonical format above,
extracting `inviteToken` from the 201 response `firstOwnerAccessPreparation.inviteToken` field.

```
Confirmed by Paresh: YES / NO
```

---

## 5. GSTIN Gate Decision

> Fill in exactly one option. This is input #9 from D2 §7.

No GSTIN format enforcement exists in the platform. `organizations.registration_no` accepts
free text (1–200 chars). The supplier types any business registration ID at Step 4 of activation.
This decision governs the admin approval step (Phase 2 of D2 §2): when should Paresh run
`POST /api/control/tenants/<orgId>/onboarding/outcome` with `outcome: APPROVED`?

| Option | Description | Select |
|---|---|---|
| A — GSTIN required before ACTIVE | Paresh will verify the supplier's GSTIN before running the 2-step admin approval. The supplier remains `PENDING_VERIFICATION` until GSTIN is confirmed. | ☐ |
| B — GSTIN deferred for pilot | Admin approval proceeds after activation without GSTIN verification. GSTIN compliance is a deferred operational task for the pilot phase. | ☐ |

---

## 6. Product Data — Per Supplier

> Fill in one table per supplier provisioned in §3.
> Minimum 5 products per supplier; recommended exactly 5 (fills `MAX_PRODUCT_PREVIEW = 5`).
> All fields in this table map directly to `POST /api/tenant/catalog/items`.

**Supplier legal name:** ______________________________

### Product 1

| Field | API param | Allowed values | Paresh / Supplier Input |
|---|---|---|---|
| Name | `name` | Real product name; not placeholder; 1–255 chars | |
| Price | `price` | Real indicative wholesale price; positive Decimal | |
| MOQ | `moq` | Real minimum order quantity; integer ≥ 1; default 1 misrepresents industrial fabric | |
| Image URL | `imageUrl` | Absolute HTTPS URL; publicly accessible CDN; no auth required; JPEG/PNG; ≥ 600×600 px recommended | |
| Description | `description` | ≥ 2 honest sentences describing material, use, and supply context; first 180 chars appear as browse summary | |
| Product category | `productCategory` | `APPAREL_FABRIC` · `HOME_TEXTILE` · `TECHNICAL_FABRIC` · `INDUSTRIAL_FABRIC` · `LINING` · `INTERLINING` · `TRIMMING` · `ACCESSORY` · `OTHER` | |
| Material | `material` | `COTTON` · `POLYESTER` · `SILK` · `WOOL` · `LINEN` · `VISCOSE` · `MODAL` · `TENCEL_LYOCELL` · `NYLON` · `ACRYLIC` · `HEMP` · `BAMBOO` · `RECYCLED_POLYESTER` · `RECYCLED_COTTON` · `BLENDED` · `OTHER` | |
| Fabric type | `fabricType` | `WOVEN` · `KNIT` · `NON_WOVEN` · `LACE` · `EMBROIDERED` · `TECHNICAL_COMPOSITE` · `FLEECE` · `OTHER` | |

### Product 2

| Field | API param | Allowed values | Paresh / Supplier Input |
|---|---|---|---|
| Name | `name` | Real product name; not placeholder; 1–255 chars | |
| Price | `price` | Real indicative wholesale price; positive Decimal | |
| MOQ | `moq` | Real minimum order quantity; integer ≥ 1 | |
| Image URL | `imageUrl` | Absolute HTTPS URL; publicly accessible CDN; JPEG/PNG; ≥ 600×600 px recommended | |
| Description | `description` | ≥ 2 honest sentences | |
| Product category | `productCategory` | `APPAREL_FABRIC` · `HOME_TEXTILE` · `TECHNICAL_FABRIC` · `INDUSTRIAL_FABRIC` · `LINING` · `INTERLINING` · `TRIMMING` · `ACCESSORY` · `OTHER` | |
| Material | `material` | `COTTON` · `POLYESTER` · `SILK` · `WOOL` · `LINEN` · `VISCOSE` · `MODAL` · `TENCEL_LYOCELL` · `NYLON` · `ACRYLIC` · `HEMP` · `BAMBOO` · `RECYCLED_POLYESTER` · `RECYCLED_COTTON` · `BLENDED` · `OTHER` | |
| Fabric type | `fabricType` | `WOVEN` · `KNIT` · `NON_WOVEN` · `LACE` · `EMBROIDERED` · `TECHNICAL_COMPOSITE` · `FLEECE` · `OTHER` | |

### Product 3

| Field | API param | Allowed values | Paresh / Supplier Input |
|---|---|---|---|
| Name | `name` | Real product name; not placeholder; 1–255 chars | |
| Price | `price` | Real indicative wholesale price; positive Decimal | |
| MOQ | `moq` | Real minimum order quantity; integer ≥ 1 | |
| Image URL | `imageUrl` | Absolute HTTPS URL; publicly accessible CDN; JPEG/PNG; ≥ 600×600 px recommended | |
| Description | `description` | ≥ 2 honest sentences | |
| Product category | `productCategory` | `APPAREL_FABRIC` · `HOME_TEXTILE` · `TECHNICAL_FABRIC` · `INDUSTRIAL_FABRIC` · `LINING` · `INTERLINING` · `TRIMMING` · `ACCESSORY` · `OTHER` | |
| Material | `material` | `COTTON` · `POLYESTER` · `SILK` · `WOOL` · `LINEN` · `VISCOSE` · `MODAL` · `TENCEL_LYOCELL` · `NYLON` · `ACRYLIC` · `HEMP` · `BAMBOO` · `RECYCLED_POLYESTER` · `RECYCLED_COTTON` · `BLENDED` · `OTHER` | |
| Fabric type | `fabricType` | `WOVEN` · `KNIT` · `NON_WOVEN` · `LACE` · `EMBROIDERED` · `TECHNICAL_COMPOSITE` · `FLEECE` · `OTHER` | |

### Product 4

| Field | API param | Allowed values | Paresh / Supplier Input |
|---|---|---|---|
| Name | `name` | Real product name; not placeholder; 1–255 chars | |
| Price | `price` | Real indicative wholesale price; positive Decimal | |
| MOQ | `moq` | Real minimum order quantity; integer ≥ 1 | |
| Image URL | `imageUrl` | Absolute HTTPS URL; publicly accessible CDN; JPEG/PNG; ≥ 600×600 px recommended | |
| Description | `description` | ≥ 2 honest sentences | |
| Product category | `productCategory` | `APPAREL_FABRIC` · `HOME_TEXTILE` · `TECHNICAL_FABRIC` · `INDUSTRIAL_FABRIC` · `LINING` · `INTERLINING` · `TRIMMING` · `ACCESSORY` · `OTHER` | |
| Material | `material` | `COTTON` · `POLYESTER` · `SILK` · `WOOL` · `LINEN` · `VISCOSE` · `MODAL` · `TENCEL_LYOCELL` · `NYLON` · `ACRYLIC` · `HEMP` · `BAMBOO` · `RECYCLED_POLYESTER` · `RECYCLED_COTTON` · `BLENDED` · `OTHER` | |
| Fabric type | `fabricType` | `WOVEN` · `KNIT` · `NON_WOVEN` · `LACE` · `EMBROIDERED` · `TECHNICAL_COMPOSITE` · `FLEECE` · `OTHER` | |

### Product 5

| Field | API param | Allowed values | Paresh / Supplier Input |
|---|---|---|---|
| Name | `name` | Real product name; not placeholder; 1–255 chars | |
| Price | `price` | Real indicative wholesale price; positive Decimal | |
| MOQ | `moq` | Real minimum order quantity; integer ≥ 1 | |
| Image URL | `imageUrl` | Absolute HTTPS URL; publicly accessible CDN; JPEG/PNG; ≥ 600×600 px recommended | |
| Description | `description` | ≥ 2 honest sentences | |
| Product category | `productCategory` | `APPAREL_FABRIC` · `HOME_TEXTILE` · `TECHNICAL_FABRIC` · `INDUSTRIAL_FABRIC` · `LINING` · `INTERLINING` · `TRIMMING` · `ACCESSORY` · `OTHER` | |
| Material | `material` | `COTTON` · `POLYESTER` · `SILK` · `WOOL` · `LINEN` · `VISCOSE` · `MODAL` · `TENCEL_LYOCELL` · `NYLON` · `ACRYLIC` · `HEMP` · `BAMBOO` · `RECYCLED_POLYESTER` · `RECYCLED_COTTON` · `BLENDED` · `OTHER` | |
| Fabric type | `fabricType` | `WOVEN` · `KNIT` · `NON_WOVEN` · `LACE` · `EMBROIDERED` · `TECHNICAL_COMPOSITE` · `FLEECE` · `OTHER` | |

---

## 7. Image URL Checklist

> Verify each URL against all criteria before submitting. All boxes must be checked for every image.

Per image URL supplied in §6:

| Check | Criterion | All 5 images confirmed |
|---|---|---|
| ☐ | URL begins with `https://` (not `http://`, `localhost`, or a relative path) | |
| ☐ | URL is publicly accessible without authentication (test in a private/incognito browser tab) | |
| ☐ | Image responds as JPEG or PNG | |
| ☐ | Image dimensions are ≥ 600 × 600 px | |
| ☐ | Image visually matches the product name in the same row of §6 | |
| ☐ | URL does not point to `placeholder.com`, `via.placeholder.com`, `picsum.photos`, `lorempixel.com`, or any stock placeholder service | |
| ☐ | URL does not point to Supabase Storage with a private or signed URL (private Supabase URLs expire and are inaccessible to unauthenticated buyers) | |
| ☐ | URL does not point to a `localhost` or LAN address | |
| ☐ | URL length does not exceed 2048 characters | |

**⚠️ A null or broken `imageUrl` renders a broken browse card. The public browse experience
depends on valid, permanently accessible image URLs.**

---

## 8. Pricing Consent

> This section is required before any product with a real price can be seeded and publicly displayed.

**Context:** The field `catalog_items.price` is exposed as `publicPriceLabel` in the public
browse projection (`GET /api/public/b2c/products`). It is displayed as a raw value to
unauthenticated buyers with no masking, obfuscation, or "request for quote" substitution.

**Consent required per supplier:**

I confirm that real indicative wholesale prices for the products listed in §6 may be
displayed publicly and without obfuscation on the TexQtic B2C browse surface.

```
Supplier legal name: ______________________________
Consent confirmed by Paresh: YES / NO
Date of confirmation: ____________________
```

> If provisioning more than one supplier, copy this block once per supplier.

---

## 9. Additional Notes

> Optional. Use this section to record any operational context Paresh wants carried into
> the F2 onboarding pilot, G1 product seeding design, or G2 seeding implementation.
> This section does not authorize any action — it is a notes field for downstream packets.

```
Notes:




```

---

## 10. Completion Checklist

> All items must be checked before F2, G1, G2, or HD-002 recheck can be opened.

| # | Item | Status |
|---|---|---|
| 1 | §2 Supplier type decision — exactly one option selected | ☐ |
| 2 | §3 Legal name provided — no typos; registered company name | ☐ |
| 3 | §3 First-owner email provided — confirmed exact business email | ☐ |
| 4 | §3 `orchestrationReference` set — unique, ≤ 255 chars | ☐ |
| 5 | §4 Invite URL format acknowledged — `YES` written | ☐ |
| 6 | §5 GSTIN gate decision — exactly one option selected | ☐ |
| 7 | §6 All 5 product rows complete — no blank required fields | ☐ |
| 8 | §7 Image URL checklist — all boxes checked for all 5 images | ☐ |
| 9 | §8 Pricing consent confirmed — `YES` written for each supplier | ☐ |

---

## 11. Authority Boundary Confirmation

**This questionnaire does not authorize provisioning, DB writes, scripts, product seeding,
or HD-002 recheck.**

No supplier record has been created. No tenant has been provisioned. No product has been seeded.
No `catalog_items.publication_posture` has been elevated. No Gate A–E fields have been set.
No SQL has been executed. No Prisma migration has been run. No `.env` values have been
printed or modified. No source files have been modified. No Layer 0 control documents have
been modified.

The sequence authorized after this questionnaire is complete:

```
F1 complete (this document) →
F2: Real supplier onboarding pilot (Phase 1–3 of D2 §2) →
G1: Product seeding design →
G2: Product seeding implementation (Phase 4–5 of D2 §2) →
HD-002-REAL-PRODUCT-DATA-PRODUCTION-VERIFY-002
```

Each packet requires explicit authorization before opening. Completion of F1 does not
automatically authorize F2. Paresh must explicitly open F2 after F1 is filled in.
