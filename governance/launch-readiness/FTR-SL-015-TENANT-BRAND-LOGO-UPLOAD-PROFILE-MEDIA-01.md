# FTR-SL-015 Tenant Brand Logo Upload Profile Media

Unit: FTR-SL-015-TENANT-BRAND-LOGO-UPLOAD-PROFILE-MEDIA-01
Date: 2026-06-12
Status: IMPLEMENTED_PENDING_SAFE_RUNTIME_VERIFICATION
Final enum: FTR_SL_015_IMPLEMENTED_PENDING_SAFE_RUNTIME_VERIFICATION

---

## 1) Final enum

FTR_SL_015_IMPLEMENTED_PENDING_SAFE_RUNTIME_VERIFICATION

## 2) Repo preflight

Commands executed:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -20
- git diff --name-only
- git status --short

Observed:

- Branch: main
- Local HEAD and origin/main were aligned at preflight
- Worktree was clean before implementation
- Recent history included 95f99a6f

Verdict: PASS

## 3) Files inspected

- server/prisma/schema.prisma
- server/src/routes/tenant.ts
- server/src/services/storage/catalogImage.storage.ts
- server/src/config/index.ts
- services/tenantService.ts
- components/Tenant/WhiteLabelSettings.tsx
- services/catalogService.ts
- services/apiClient.ts
- services/tenantApiClient.ts
- server/src/services/publicB2BProjection.service.ts
- governance/launch-readiness/FUTURE-TODO-REGISTER.md

## 4) Current tenant/profile/logo repo truth

Repo truth confirms an existing tenant branding surface with logo persistence and update API/UI:

- persistence model exists in Prisma
- tenant route already supports branding updates including logoUrl
- tenant UI already has a branding section with manual Logo URL input

## 5) Existing schema/logo field finding

Logo field already exists:

- model: TenantBranding
- field: logoUrl
- DB column mapping: logo_url
- relation: tenantId unique to one tenant branding row

Schema migration was not required.

## 6) Existing profile update route/UI finding

Existing route and UI support were present:

- route: PUT /api/tenant/branding accepts logoUrl and themeJson
- UI: components/Tenant/WhiteLabelSettings.tsx includes manual Logo URL input and branding save action

This enabled a bounded no-migration implementation path.

## 7) Storage/bucket decision

Decision: reuse the existing upload storage pattern and existing configured bucket variable.

- reused Supabase storage client/config pattern from catalog image upload
- reused CATALOG_IMAGE_BUCKET config to avoid introducing a new runtime prerequisite during launch-readiness
- tenant logo object path is org-scoped and separated by logical prefix:
  - <org>/logo/<uuid>.<ext>

## 8) Decision path chosen

Path A selected.

Reason:

- logo field exists
- profile update route exists
- profile update UI exists
- upload route and helper could be added safely without schema changes or broad refactor

## 9) If implemented: upload route summary

Implemented:

- new storage helper: server/src/services/storage/tenantLogo.storage.ts
- new route: POST /api/tenant/profile/logo/upload
- auth: tenantAuthMiddleware + databaseContextMiddleware
- tenant isolation: orgId derived from authenticated dbContext
- file constraints:
  - allowed: JPG/JPEG, PNG, WEBP
  - max size: 2 MB
  - magic-byte validation using file-type
- response data:
  - logoUrl

## 10) If implemented: profile persistence summary

Implemented upload-then-persist flow in tenant UI integration:

- upload endpoint returns logoUrl
- existing PUT /api/tenant/branding persists logoUrl
- no schema or route contract drift to unrelated profile fields

## 11) If implemented: UI integration summary

Implemented in existing branding UI:

- file input for logo upload in WhiteLabelSettings visual identity section
- upload loading state and error handling
- auto-persist of uploaded URL through existing branding route
- logo preview rendering after upload
- existing manual Logo URL fallback retained

## 12) If implemented: public/internal display summary

No public projection contract was changed in this unit.

- public B2B projection route contracts remained unchanged
- this unit focused on tenant profile media input/persistence path only

## 13) If design-only: exact schema/storage/API/UI blockers

Not design-only. Implementation completed under Path A.

## 14) Tests/validation results

Validation commands executed:

- git diff --check
  - PASS (warning only: line-ending normalization notice)
- pnpm --dir server exec prisma validate
  - PASS (schema valid; existing non-blocking warning retained)
- pnpm --dir server typecheck
  - PASS
- pnpm typecheck
  - PASS
- pnpm --dir server lint
  - PASS with existing baseline warnings in unrelated files

Notes:

- prompt listed pnpm -C server ...; this shell wrapper rejected -C form, so equivalent --dir server form was used and recorded

## 15) Local DB verification status

LOCAL_DB_ENV_NOT_APPLICABLE

No local DB-backed test execution was required for this unit.

## 16) Runtime verification result or blocker

Safe runtime verification deferred:

- implementation completed
- runtime verification deferred to avoid unsafe mutation of real supplier profile data in this unit

## 17) Safe public verification result, if run

Not run in this unit.

No public-route mutation or profile public-route verification was required for bounded tenant-logo implementation.

## 18) Confirmation MEVITAS was not continued/mutated

Confirmed.

- no MEVITAS onboarding continuation
- no MEVITAS catalog or profile runtime mutation

## 19) Confirmation Shraddha and lt-b2b-001 were not mutated

Confirmed.

No data mutation executed against Shraddha or lt-b2b-001.

## 20) Profile GET not-called confirmation

Confirmed.

No calls were made to /api/public/supplier/:slug.

## 21) /products unchanged confirmation

Confirmed.

No /products route or architecture changes in this unit.

## 22) Tracker/TLRH sync summary

Updated:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
  - added latest bounded update entry for FTR-SL-015
- governance/launch-readiness/FTR-SL-015-TENANT-BRAND-LOGO-UPLOAD-PROFILE-MEDIA-01.md
  - created unit report artifact

No control pointer files were changed.

## 23) Adjacent findings and disposition

Adjacent finding:

- no dedicated tenant-logo bucket env variable currently exists; logo upload reuses CATALOG_IMAGE_BUCKET

Disposition:

- accepted for this launch-readiness unit as bounded reuse
- follow-up can split to dedicated tenant-logo bucket/config if needed after launch stabilization

## 24) Risks/residuals

- runtime verification is pending and should be done in a safe QA/demo tenant lane
- reuse of catalog bucket for logos is acceptable now, but long-term governance may require dedicated bucket isolation
- line-ending warning indicates git normalization behavior on touched frontend file

## 25) Commit hash and push status

Pending at report creation time; completed in Phase commit/push section below.

## 26) Recommended next unit

FTR-SL-015A-TENANT-LOGO-UPLOAD-SAFE-RUNTIME-VERIFICATION-01

Scope:

- run tenant-auth safe upload in QA/demo tenant lane
- verify persisted logoUrl via branding read/update flow
- optionally verify non-sensitive public/internal display surfaces remain stable
- avoid MEVITAS/Shraddha mutation

---

## Implementation Diff Summary

Implemented files:

- server/src/services/storage/tenantLogo.storage.ts
- server/src/routes/tenant.ts
- services/tenantService.ts
- components/Tenant/WhiteLabelSettings.tsx
- server/src/__tests__/tenant-logo-upload.unit.test.ts
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-015-TENANT-BRAND-LOGO-UPLOAD-PROFILE-MEDIA-01.md
