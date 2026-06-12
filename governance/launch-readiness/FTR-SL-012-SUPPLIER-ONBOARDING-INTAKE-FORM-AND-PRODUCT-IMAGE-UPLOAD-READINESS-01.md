# FTR-SL-012 Supplier Onboarding Intake Form + Product Image Upload Readiness

Unit: FTR-SL-012-SUPPLIER-ONBOARDING-INTAKE-FORM-AND-PRODUCT-IMAGE-UPLOAD-READINESS-01
Date: 2026-06-12
Status: COMPLETE
Final enum: FTR_SL_012_SUPPLIER_ONBOARDING_FORM_READY_IMAGE_UPLOAD_DESIGN_REQUIRED

## 1) Repo Preflight

Commands run:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -20

Observed:

- branch: main
- HEAD: 5290bac0b426743f82a2097143440cf410a055b1
- origin/main: 5290bac0b426743f82a2097143440cf410a055b1
- worktree: clean before edits
- recent history includes 5290bac0

Preflight verdict: PASS.

## 2) Files Inspected

- server/src/routes/admin/tenantProvision.ts
- server/src/routes/control.ts
- server/src/routes/tenant.ts
- server/src/routes/internal/acquisitionProvisioning.ts
- server/src/services/publicB2BProjection.service.ts
- server/src/types/tenantProvision.types.ts
- server/src/types/index.ts
- config/publicIndustryClusterTaxonomy.ts
- App.tsx
- services/catalogService.ts
- governance/launch-readiness/FUTURE-TODO-REGISTER.md

## 3) Supplier Onboarding Flow Summary From Repo Truth

Current supplier onboarding is a multi-step admin/tenant flow, not a single form:

1. Provision tenant via `POST /api/control/tenants/provision`.
2. Use the `APPROVED_ONBOARDING` branch to seed the supplier org, tenant, and first-owner prep state.
3. The provisioning body carries `organization` and `firstOwner.email`, plus canonical identity/taxonomy fields.
4. Tenant activation follows the invite/accept path already implemented in the auth/onboarding flow.
5. Public readiness is completed by setting taxonomy, then catalog posture, then verifying public B2B projection.

## 4) Tenant Activation Requirements

Repo truth indicates the following are needed to activate and promote an invited supplier:

- tenant/org exists and is not a QA sentinel
- `tenant.publicEligibilityPosture = PUBLICATION_ELIGIBLE`
- `organizations.org_type = B2B`
- `organizations.status` must be `ACTIVE` or `VERIFICATION_APPROVED` for public projection
- first-owner invite state exists when using the onboarding seam
- first-owner invite must be accepted for normal supplier workspace use
- control-plane admin lane is used for supervised edits, not `/supplier/:slug`

## 5) Supplier / Aggregator Profile Requirements

Required or practically required for a public-safe supplier card/profile:

- legal company name
- display name when different from legal name
- jurisdiction
- registration number when available
- primary segment key
- one or more role position keys
- secondary segment keys when applicable
- short public-safe description
- location text that matches the actual org
- product/service examples
- certification status only when verified
- traceability evidence only when evidence exists

Do not collect or claim:

- unverified certifications
- unverified sustainability claims
- buyer-side commercial terms
- payment or settlement terms
- CRM or legal workflow details unrelated to onboarding

## 6) Taxonomy Requirements And Valid Keys

Canonical role position keys in repo truth:

- `manufacturer`
- `trader`
- `service_provider`

Observed segment key examples already present in repo truth include:

- `weaving`
- `fabric_processing`
- `yarn`
- `knitting`
- `home_textiles`
- `synthetic_fabrics`
- `textile_processing`
- `surat_supply`

Observed human-readable examples elsewhere in repo truth include:

- `Weaving`
- `Knitting`
- `Fabric Processing`
- `Yarn`
- `Home Textiles`

Paresh should enter the exact values the current admin route accepts, using the canonical repo keys already represented in the control-plane path.

## 7) Catalog / Product Field Requirements

Current tenant catalog create/update supports these fields:

- `name` required
- `price` required in the tenant route
- `moq` default 1
- `sku` optional
- `imageUrl` optional
- `description` optional
- `productCategory` optional
- `fabricType` optional
- `gsm` optional
- `material` optional
- `composition` optional
- `color` optional
- `widthCm` optional
- `construction` optional
- `certifications` optional
- `catalogStage` optional
- `stageAttributes` optional
- `catalogVisibilityPolicyMode` optional

Control-plane offering-preview posture requires:

- `active = true`
- `publicationPosture IN ('B2B_PUBLIC', 'BOTH')`
- no `HIDDEN` visibility conflict when moving to public posture

## 8) Publication Posture Requirements

For `/b2b` public offering preview:

- the supplier must already be eligible for public projection
- the organization must be B2B
- the item must be active
- the item must have `publicationPosture = B2B_PUBLIC` or `BOTH`
- the public projection does not expose price or other private fields

## 9) Activation Checklist For Paresh

1. Provision the tenant using the approved onboarding seam.
2. Collect and record the supplier legal name, jurisdiction, registration number, and first-owner email.
3. Set the supplier taxonomy with the control-plane profile-completeness route.
4. Confirm the first-owner invite exists and is accepted.
5. Create or update catalog items through the tenant catalog route.
6. Add `imageUrl` to each item if an image URL is available.
7. Set each target catalog item to `B2B_PUBLIC` or `BOTH`.
8. Verify `GET /api/public/b2b/suppliers` shows the supplier and offering previews.
9. Verify `/b2b` visually.
10. Do not use `/supplier/:slug` for routine checks because it writes audit/event rows.
11. Mark the supplier as live, pilot, or demo according to real status.

## 10) Product Image Flow Findings

Repo truth shows:

- the catalog create/edit UI only exposes `imageUrl`
- the tenant API validates `imageUrl` as a URL
- the catalog item schema stores `CatalogItem.imageUrl`
- public B2B projection uses the same `imageUrl` field for preview cards
- no multipart upload route exists
- no storage bucket helper exists
- no upload component was found in the app shell or server routes

Conclusion: the current product image flow is URL-only.

## 11) Local Image Upload Status

No local device-upload path exists in the current repo truth.

Why it is not safe to implement in this unit:

- there is no existing multipart or file-upload route to extend
- there is no existing storage provider integration to reuse
- there is no static asset hosting surface for uploaded files in server code
- the current item contract is built around a string URL field, not uploaded media records

## 12) Image Instructions For Suppliers

Use this now, before any upload redesign exists:

- provide a direct HTTPS image URL for each product
- the URL should resolve to the image itself, not a landing page
- keep the image publicly reachable for the platform preview flow
- avoid expiring or login-protected links
- prefer a clean product shot with one primary image per item
- do not send private or watermarked material that should not appear on `/b2b`

If a future upload seam is approved, the bounded accepted formats should be limited to `jpg`, `jpeg`, `png`, and `webp`, with a small size cap aligned to the chosen storage provider.

## 13) Why No Implementation Was Done

The repo does not currently provide a safe bounded upload surface to extend. Implementing one would require new storage and route plumbing outside the current contract surface.

Design-ready next step:

- add a dedicated image-upload design / infrastructure unit that introduces the storage target, upload endpoint, and tests before any production-facing catalog upload feature is attempted.

## 14) Validation And Verification

Validation run after edits:

- git diff --check

Result: PASS

Runtime / DB verification:

- not required for this docs-only unit
- no local DB work was performed
- no supplier invite or production product mutation was performed

## 15) Safe Verification Results

- `GET /api/public/b2b/suppliers` and `/b2b` were not mutated by this unit
- no `/supplier/:slug` call was made
- no production supplier was invited or created
- no catalog item was changed

## 16) Tracker Sync

Updated:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md

Created:

- governance/launch-readiness/FTR-SL-012-SUPPLIER-ONBOARDING-INTAKE-FORM-AND-PRODUCT-IMAGE-UPLOAD-READINESS-01.md
- governance/launch-readiness/SUPPLIER-ONBOARDING-INTAKE-FORM-JULY-2026.md

## 17) Adjacent Findings And Disposition

1. Catalog image path is URL-only.

   Disposition: REGISTERED DESIGN GAP. Safe local upload is not feasible in this unit.

2. Control-plane taxonomy validator and repo examples are not perfectly normalized.

   Disposition: REGISTERED. Use the exact repo-approved keys already accepted by the control-plane path.

## 18) Risks / Residuals

- Upload support remains a separate design problem.
- No file upload work was attempted, by design.
- The intake form is ready for Paresh to use immediately, but image collection must use URLs until a separate upload seam is approved.

## 19) Commit Hash And Push Status

Implementation commit: none

Docs commit: pending

Final HEAD at start of unit: 5290bac0b426743f82a2097143440cf410a055b1

## 20) Recommended Next Unit

FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-01

Scope:

- decide and implement the storage/upload seam
- add a safe upload endpoint and UI control
- keep the current `imageUrl` fallback for direct URL entry