# FTR-SL-014 MEVITAS Controlled Supplier Onboarding

Unit: FTR-SL-014-MEVITAS-CONTROLLED-SUPPLIER-ONBOARDING-01
Date: 2026-06-12
Status: BLOCKED_AT_TENANT_OWNER_ACCEPTANCE
Final enum: FTR_SL_014_BLOCKED_TENANT_OWNER_ACCEPTANCE_REQUIRED

---

## 1) Objective

Run one controlled real-supplier onboarding cycle for MEVITAS LLP and, in the same unit, production-verify FTR-SL-013A1 catalog image upload runtime.

Outcome: onboarding progressed through provisioning and profile completeness; unit blocked before tenant-auth-required upload/catalog creation.

---

## 2) Phase 0 Repo Preflight

Commands:

- `git branch --show-current`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git status --porcelain=v1 -uno`
- `git log --oneline -20`

Observed:

- Branch: `main`
- Local HEAD: `74984c52fc796021d83edf9f899a376b943466ce`
- `origin/main`: `74984c52fc796021d83edf9f899a376b943466ce`
- Worktree clean before changes
- Recent history includes `74984c52`

Preflight verdict: PASS.

---

## 3) Deployment / Runtime Readiness Gate

Safe runtime probes:

- `GET /api/health` -> HTTP 200 (`status`, `timestamp`)
- `POST /api/tenant/catalog/images/upload` unauthenticated probe -> HTTP 401 `UNAUTHORIZED` (route exists; not 404)
- `GET /api/public/b2b/suppliers` -> HTTP 200, success true, total 2

Deployment/readiness verdict:

- App/API reachable: PASS
- Upload route deployed (non-404): PASS
- Storage-not-configured not observed in unauthenticated probe path: PASS
- Tenant-auth-required runtime verification pending: BLOCKED by owner acceptance gate

---

## 4) Files Inspected

- `server/src/routes/admin/tenantProvision.ts`
- `server/src/routes/control.ts`
- `server/src/routes/tenant.ts`
- `server/src/types/tenantProvision.types.ts`
- `server/src/services/publicB2BProjection.service.ts`
- `server/src/services/storage/catalogImage.storage.ts`
- `services/catalogService.ts`
- `App.tsx`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-013A1-CATALOG-IMAGE-UPLOAD-IMPLEMENTATION-RETRY-01.md`
- `governance/launch-readiness/SUPPLIER-ONBOARDING-INTAKE-FORM-JULY-2026.md`

Additional route-contract read:

- `services/controlPlaneService.ts` (impersonation start requires both `orgId` and `userId`)

---

## 5) MEVITAS Intake Normalization Table

| Field | Submitted | Normalized used in this unit |
|---|---|---|
| legalName | MEVITAS LLP | MEVITAS LLP |
| displayName | MEVITAS LLP | MEVITAS LLP |
| slug candidate | n/a | mevitas-llp |
| tenant type | B2B | B2B |
| jurisdiction/location | SURAT / GUJARAT / INDIA | Surat, Gujarat, India |
| firstOwnerEmail | RAKESH@MEVITAS.IN | rakesh@mevitas.in |
| GST | 24ABTFM3480C1Z7 | 24ABTFM3480C1Z7 |
| website | WWW.MEVITAS.IN | https://www.mevitas.in |
| phone | +91 9726811108 | +91 9726811108 |
| contactName | MR RAKESH SHAH | Mr Rakesh Shah |
| primary segment text | WEAVING & FABRIC PROCESSING/TRADING | weaving |
| secondary segment text | WEAVING | fabric_processing (non-duplicate canonical secondary) |
| role position text | MANUFACTURER | manufacturer |
| trader signal | TRADING in free text | kept as capability context only (not forced into role key) |
| product name | IVORY GREY FABRIC | pending (blocked before catalog create) |
| SKU | IVORY | pending |
| price | Rs 31.50 per meter | pending numeric `31.5` |
| MOQ | 15000 meters | pending numeric `15000` |
| catalog stage text | IN PRODUCTION | pending canonical mapping (`FABRIC_PROCESSED` planned) |

---

## 6) Mutation Gate Summary (Pre-write)

Prepared and validated:

1. Tenant provisioning payload: APPROVED_ONBOARDING + B2B + FREE + organization + first owner.
2. Invite email target: `rakesh@mevitas.in`.
3. Taxonomy payload:
   - `primary_segment_key: weaving`
   - `secondary_segment_keys: [fabric_processing]`
   - `role_position_keys: [manufacturer]`
4. Catalog payload: planned but not executed (tenant auth required).
5. Image upload plan: use tenant upload endpoint after tenant auth exists.
6. Posture target: `B2B_PUBLIC` after item creation.

Gate decision: proceed with provisioning and profile completeness only.

---

## 7) Tenant Provisioning Result

Route used:

- `POST /api/control/tenants/provision`

Result:

- HTTP 201, success true
- `orgId`: `3b7fd8b7-ccb4-4472-a5bf-488742dbea5e`
- `slug`: `mevitas-llp`
- `provisioningMode`: `APPROVED_ONBOARDING`
- `orchestrationReference`: generated for this unit

No invite token or private invite URL is recorded in this artifact.

---

## 8) First-owner Invite Result

Provisioning response confirmed first-owner preparation:

- invite created: yes
- invite purpose: `FIRST_OWNER_PREPARATION`
- invite id present: yes
- invite email: `rakesh@mevitas.in`
- expiresAt present: yes

No token or invite URL disclosed.

---

## 9) Taxonomy/Profile Completeness Result

Route used:

- `POST /api/control/tenants/:tenantId/profile-completeness`

Result:

- HTTP 200, success true
- tenant slug: `mevitas-llp`
- org type: B2B
- taxonomy applied:
  - `primary_segment_key: weaving`
  - `secondary_segment_keys: [fabric_processing]`
  - `role_position_keys: [manufacturer]`

---

## 10) Tenant Auth / Catalog Path Determination

Repo-truth and runtime finding:

- Tenant catalog create and upload routes are tenant-auth scoped.
- Control-plane impersonation start contract requires both `orgId` and `userId`.
- Newly provisioned APPROVED_ONBOARDING MEVITAS result has `userId: null` and `membershipId: null` until owner invite acceptance.

Therefore:

- No safe tenant-auth session exists yet for MEVITAS.
- Catalog upload/create cannot be executed in this unit without invite acceptance.

Blocker reached:

`FTR_SL_014_BLOCKED_TENANT_OWNER_ACCEPTANCE_REQUIRED`

---

## 11) Image Upload Production Verification

Status: NOT_EXECUTED due tenant-auth blocker.

Notes:

- Upload route is deployed and reachable (unauth probe returned 401, not 404).
- Runtime storage verification (`STORAGE_NOT_CONFIGURED` absence under authenticated upload) remains pending.
- MEVITAS PDF image extraction was not executed in this unit.

---

## 12) Catalog Item Creation

Status: NOT_EXECUTED (blocked before tenant-auth lane).

---

## 13) Catalog Posture Update

Status: NOT_EXECUTED (no item created).

---

## 14) Safe Public Verification

`GET /api/public/b2b/suppliers`:

- HTTP 200, success true
- total: 2
- slugs: `shraddha-industries`, `lt-b2b-001`
- MEVITAS not yet visible (expected before catalog+posture completion)

`/b2b` visual:

- page loads
- supplier list remains stable (no MEVITAS yet)

Profile route constraint respected:

- `/api/public/supplier/:slug` not called
- `/supplier/:slug` not opened

---

## 15) Scope Safety Confirmations

- `/products` architecture unchanged.
- No direct SQL used.
- No prisma migrate/dev/reset/db push/seed used.
- Shraddha and `lt-b2b-001` were not mutated in this unit.
- No secret/env/token/invite-link disclosure in artifact.

---

## 16) Local DB Verification Status

`LOCAL_DB_ENV_NOT_APPLICABLE`

Runtime verification authority for this unit is deployed production API/UI behavior.

---

## 17) Tracker Sync

Updated:

- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

Created:

- `governance/launch-readiness/FTR-SL-014-MEVITAS-CONTROLLED-SUPPLIER-ONBOARDING-01.md`

---

## 18) Adjacent Findings And Disposition

1. MEVITAS onboarding via APPROVED_ONBOARDING creates first-owner invite preparation without immediate tenant user session (`userId` null until acceptance).

Disposition: registered in this unit as the direct blocker; no unsafe bypass.

2. Upload runtime verification remains coupled to tenant-auth availability for the target supplier.

Disposition: move to next bounded retry unit after first-owner acceptance.

3. Future media surfaces remain out-of-scope.

Disposition: preserve separate units only:
- `FTR-SL-015-TENANT-BRAND-LOGO-UPLOAD-PROFILE-MEDIA-01`
- `FTR-SL-016-CERTIFICATE-UPLOAD-STORAGE-INVESTIGATION-DESIGN-IMPLEMENTATION-01`

---

## 19) Risks / Residuals

- Until owner acceptance, MEVITAS cannot complete tenant-auth upload/catalog flow.
- FTR-SL-013A1 production upload verification remains pending for authenticated runtime.
- MEVITAS public visibility remains pending item creation + B2B posture update.

---

## 20) Recommended Next Unit

`FTR-SL-014A-MEVITAS-TENANT-OWNER-ACTIVATION-AND-UPLOAD-CATALOG-COMPLETION-01`

Prerequisites for next unit:

1. MEVITAS first owner accepts invite and can sign in.
2. Tenant-auth session established for MEVITAS.
3. Execute upload route with actual MEVITAS image file, create one catalog item, set `B2B_PUBLIC`, and re-verify `/api/public/b2b/suppliers` + `/b2b`.
