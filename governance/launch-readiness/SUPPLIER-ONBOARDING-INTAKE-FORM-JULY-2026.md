# Supplier Onboarding Intake Form - July 2026

Use this form for invited suppliers before July 20.

## 1) Company and Contact Details

Required:

- Legal company name
- Display / trade name
- Jurisdiction
- First-owner email

Recommended:

- Registration number
- Public website
- Primary business phone or WhatsApp number
- Primary contact person's name and title
- City / state / country

## 2) Business Identity

Required for the current repo flow:

- Tenant type: B2B
- Primary segment key
- At least one role position key

Optional:

- Secondary segment keys
- Commercial plan context if Paresh wants it recorded
- White-label capability only if the supplier is actually white-label capable

Accepted role position keys in repo truth:

- manufacturer
- trader
- service_provider

Observed segment key examples already present in repo truth:

- weaving
- fabric_processing
- yarn
- knitting
- home_textiles
- synthetic_fabrics
- textile_processing
- surat_supply

## 3) Public-Safe Profile Summary

Required / strongly recommended:

- 2 to 4 sentence supplier description
- Product and service examples
- Location summary
- Category summary
- Capability summary

Only include if verified:

- certifications
- traceability evidence
- sustainability claims

Do not include:

- pricing promises
- payment terms
- legal boilerplate
- CRM or internal case IDs
- unverified claims

## 4) Catalog Item Details

For each item, collect:

- Product name
- SKU or item number
- Price
- MOQ
- Description
- Product category
- Fabric type
- Material
- Composition
- Color
- Width in cm
- Construction
- GSM
- Certifications
- Product stage
- Stage-specific attributes
- Catalog visibility policy if Paresh wants it tracked

## 5) Images

Current repo behavior is URL-only.

Please send:

- a direct HTTPS image URL for each catalog item
- one primary image per item
- a stable link that does not require login

Do not send:

- landing-page links
- expiring signed links
- private drive links
- PDFs or non-image files

If a future device-upload seam is approved, the accepted formats should be limited to jpg, jpeg, png, and webp.

## 6) What Paresh Should Not Ask For Yet

Do not collect these in this onboarding pack:

- payment or settlement details
- buyer-side commercial terms
- trade or order history
- CRM case details
- legal claims that are not verified
- product inventory data unless explicitly required later

## 7) Paresh Activation Checklist

1. Create the supplier tenant.
2. Send or confirm the first-owner invite.
3. Collect the taxonomy fields.
4. Complete the supplier profile summary.
5. Create or verify catalog items.
6. Add image URLs for each item.
7. Set public offering posture where appropriate.
8. Verify the supplier on `GET /api/public/b2b/suppliers`.
9. Verify the supplier on `/b2b`.
10. Avoid `/supplier/:slug` during routine checks.
11. Label the supplier live, pilot, or demo accurately.

## 8) Notes

- The intake pack is based on current repo truth, not assumptions.
- If a supplier cannot provide an image URL, hold the item image until the upload seam is approved in a separate unit.