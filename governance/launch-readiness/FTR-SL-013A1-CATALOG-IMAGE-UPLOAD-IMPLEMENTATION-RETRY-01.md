# FTR-SL-013A1 Catalog Image Upload Implementation Retry

Unit: FTR-SL-013A1-CATALOG-IMAGE-UPLOAD-IMPLEMENTATION-RETRY-01
Date: 2026-06-12
Status: COMPLETE — IMPLEMENTED
Final enum: FTR_SL_013A1_IMPLEMENTED_LOCAL_UPLOAD_WITH_URL_FALLBACK

---

## 1) Objective

Implement local device image upload for tenant catalog items while preserving manual `imageUrl` URL fallback.

Outcome: implemented with backend upload endpoint + Supabase storage service + frontend form integration for add/edit catalog flows.

---

## 2) Scope Performed

### Backend

- Added multipart support in server bootstrap (`@fastify/multipart`, 5MB max, 1 file).
- Added storage env schema keys to server config:
  - `SUPABASE_URL` (optional)
  - `SUPABASE_SERVICE_ROLE_KEY` (optional)
  - `CATALOG_IMAGE_BUCKET` (optional)
- Added storage service:
  - `server/src/services/storage/catalogImage.storage.ts`
  - validates file presence, max size, allowed types (JPG/PNG/WEBP), and magic bytes
  - enforces tenant-scoped path prefix (`orgId/uuid.ext`)
  - uploads to Supabase Storage and returns public URL
- Added authenticated tenant upload route:
  - `POST /api/tenant/catalog/images/upload`
  - guarded by tenant auth + DB context + verification block check
  - returns `{ imageUrl }` on success
  - emits bounded error codes (`FILE_REQUIRED`, `FILE_TOO_LARGE`, `INVALID_FILE_TYPE`, `STORAGE_NOT_CONFIGURED`, `UPLOAD_FAILED`)

### Frontend

- Added upload client API in `services/catalogService.ts`:
  - `uploadCatalogImage(file)` uses authenticated tenant request with `FormData`
- Integrated local file upload in `App.tsx` add/edit catalog forms:
  - file picker (`accept=image/jpeg,image/png,image/webp`)
  - upload loading state + error propagation
  - uploaded URL auto-populates `imageUrl` input
  - manual URL input path remains available
  - submit buttons disabled while upload is active

### Tests

- Added focused server unit tests:
  - `server/src/__tests__/catalog-image-upload.unit.test.ts`
  - 6 tests covering validation, mime mismatch, size limit, storage not configured, and successful upload/public URL return

---

## 3) Files Changed

- `App.tsx`
- `services/catalogService.ts`
- `server/package.json`
- `server/pnpm-lock.yaml`
- `server/src/config/index.ts`
- `server/src/index.ts`
- `server/src/routes/tenant.ts`
- `server/src/services/storage/catalogImage.storage.ts` (new)
- `server/src/__tests__/catalog-image-upload.unit.test.ts` (new)

---

## 4) Validation Run

Commands executed:

- `git diff --check` → PASS
- `pnpm -C server exec prisma validate` → PASS (existing non-blocking SetNull warning)
- `pnpm -C server typecheck` → PASS
- `pnpm typecheck` → PASS
- `pnpm -C server lint` → PASS (existing warnings only; exit code 0)
- `pnpm lint` → FAIL (pre-existing repo-wide lint baseline issues outside this unit; exit code 1)
- `pnpm -C server exec vitest run src/__tests__/catalog-image-upload.unit.test.ts` → PASS (6/6)

Notes:
- Repo-wide lint is currently red from unrelated baseline issues across many files not changed in this unit.
- No new blocking lint/type/test failures were introduced by the upload implementation path.

---

## 5) Runtime/Mutation Safety

- No production mutation calls executed in this unit.
- No supplier/product runtime data entry performed.
- No schema migration, SQL, or Prisma db push/migrate dev commands executed.
- URL fallback path preserved for manual image URL workflows.

---

## 6) Residuals

- Bucket existence/public-read verification still depends on environment/setup state outside repo code.
- Repo-wide lint baseline remains failing and should be addressed in dedicated lint-hardening units.

---

## 7) Tracker Sync

Updated:

- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

Created:

- `governance/launch-readiness/FTR-SL-013A1-CATALOG-IMAGE-UPLOAD-IMPLEMENTATION-RETRY-01.md`

---

## 8) Recommended Next Step

Perform bounded runtime verification in an authorized environment:

1. Upload a JPG/PNG/WEBP in tenant catalog add/edit form.
2. Confirm returned `imageUrl` resolves publicly.
3. Confirm `/api/public/b2b/suppliers` and `/b2b` remain stable.
