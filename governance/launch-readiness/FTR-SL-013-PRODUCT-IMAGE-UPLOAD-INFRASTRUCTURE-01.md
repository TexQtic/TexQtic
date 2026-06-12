# FTR-SL-013 Product Image Upload Infrastructure

Unit: FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-01
Date: 2026-06-12
Status: COMPLETE — DESIGN_READY
Final enum: FTR_SL_013_IMAGE_UPLOAD_DESIGN_READY_STORAGE_DECISION_REQUIRED

---

## 1) Repo Preflight

Commands run:

```
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --porcelain=v1 -uno
git log --oneline -20
```

Observed:

- branch: main
- HEAD: 5d78206ac119e8a421b4a8a68c5fea595b1f3c65
- origin/main: 5d78206ac119e8a421b4a8a68c5fea595b1f3c65
- worktree: clean before this unit's changes
- recent history includes 5d78206a (FTR-SL-012 docs close)

Preflight verdict: PASS.

---

## 2) Files Inspected

- server/package.json
- package.json
- server/src/config/index.ts
- server/src/routes/tenant.ts
- server/src/routes/admin/tenantProvision.ts
- server/src/routes/control.ts
- server/src/services/catalogVisibilityPolicyResolver.ts
- server/src/services/publicB2BProjection.service.ts
- server/src/types/index.ts
- services/catalogService.ts
- App.tsx (catalog form UI, imageUrl field, create/update handlers)
- server/prisma/schema.prisma (prior sessions)

---

## 3) Existing Upload / Storage Repo Truth

Finding: no upload or storage infrastructure exists in the current repo.

Evidence:

**Packages:**
- No `@supabase/supabase-js` in server/package.json or root package.json.
- No `@fastify/multipart`, `multer`, `busboy`, or `formidable` installed.
- No `file-type`, `sharp`, or image processing package installed.
- No `aws-sdk`, `@aws-sdk/*`, `cloudinary`, `@cloudflare/r2`, or equivalent storage SDK.

**Server source:**
- No Supabase Storage client (`supabase.storage`) usage anywhere in server/src/.
- No `.from('bucket').upload()` or `.from('bucket').download()` patterns found.
- No multipart route, no upload route, no file stream handler found.
- `server/src/config/index.ts` Zod schema does not include `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CATALOG_IMAGE_BUCKET`, or any storage-related env var.

**Frontend:**
- `App.tsx` catalog create/edit form has one `<input type="url">` for Image URL (line ~5568).
- No `<input type="file">` found.
- No upload state, no image preview, no upload error state.
- `services/catalogService.ts` has no upload function.

**Env vars:**
- No `SUPABASE_URL` found in server config schema or server source.
- `SUPABASE_SERVICE_ROLE_KEY` exists in `.env.local` but is not wired into the server config schema or used in any server source file.
- No `CATALOG_IMAGE_BUCKET` or equivalent.

**Note on secret exposure:** The env file scan produced tool output containing database credentials and a service role key. These values are NOT quoted anywhere in this document. If you see those values in a tool output, treat them as sensitive and do not reproduce them in any artifact or commit message.

---

## 4) Product / Catalog Image Flow Summary

Current state:

- `CatalogItem.imageUrl` (`image_url` in DB) is a nullable string column.
- `POST /api/tenant/catalog/items` accepts `imageUrl: z.string().url().max(2048).optional()`.
- `PATCH /api/tenant/catalog/items/:id` accepts `imageUrl: z.string().url().max(2048).nullable().optional()`.
- Public B2B projection reads `imageUrl` from catalog items and uses it in `/b2b` offering preview cards and the buyer PDP `CatalogMedia` array (via `signedUrl: item.image_url` in `server/src/routes/tenant.ts` line 3451).
- No schema migration is needed; the existing `imageUrl` field is sufficient for an uploaded URL.

---

## 5) Decision Path Chosen: B

No safe storage seam exists. No implementation was performed.

Reason: implementation requires new packages, new env vars, a new Supabase Storage bucket, and a new upload route. None of these are present in the current repo. All are safe and straightforward to add, but they require explicit setup steps that cannot be completed safely within this unit without external verification of the storage bucket state.

---

## 6) Why Not Path C

Path C would apply if storage env/config existed but runtime verification was impossible. In this case, not even the storage client or env schema wiring is in place, so there is no runtime path to verify. This is a clean Path B.

---

## 7) Design Artifact Path

```
governance/launch-readiness/FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-DESIGN.md
```

The design artifact contains:

- Current URL-only flow description.
- Exact missing storage pieces.
- Recommended storage provider (Supabase Storage, same project as DB).
- Required env var names (no values).
- Proposed upload endpoint contract.
- Proposed frontend changes.
- Security rules.
- File validation rules.
- Storage path convention.
- URL fallback explanation.
- Tests and verification plan.
- Exact next implementation unit prompt outline.

---

## 8) Security Note

During Phase 1 investigation, the env-file scan tool returned output containing actual secret values including database passwords and a service role JWT. These were NOT printed in any artifact, commit, or output from this unit.

**Action recommended:** Paresh should review whether `.env` and `.env.local` are correctly in `.gitignore`. If any secret has appeared in a git diff, it should be rotated.

Also noted: `SUPABASE_SERVICE_ROLE_KEY` exists in `.env.local` but is not wired into the server config schema. This means it is currently unused by the server. The next implementation unit must add it to the config schema before use.

---

## 9) Validation Run

```
git diff --check
```

Result: PASS (only CRLF warnings on new docs; no conflict markers).

Static type/lint checks: not run in this docs-only unit; no source code was changed.

---

## 10) Local DB Verification Status

Not applicable. This unit is docs/design-only. No code was modified, no tests were run.

Status: `LOCAL_DB_ENV_NOT_APPLICABLE`

---

## 11) Runtime Verification

Not performed. No upload infrastructure exists to verify. No production data was touched.

---

## 12) Safe Public Verification

Not run. No changes were made that would affect `GET /api/public/b2b/suppliers` or `/b2b`.

---

## 13) Confirmations

- No real supplier or product data was mutated.
- No production API POST/PATCH/PUT/DELETE was called.
- No `/supplier/:slug` was accessed.
- No `/products` architecture was changed.
- No schema or migration was modified.
- No backend/frontend code was changed.
- `FUTURE-TODO-REGISTER.md` updated.

---

## 14) Tracker Sync

Updated:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md

Created:

- governance/launch-readiness/FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-01.md
- governance/launch-readiness/FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-DESIGN.md

---

## 15) Adjacent Findings

1. `SUPABASE_SERVICE_ROLE_KEY` exists in `.env.local` but is not referenced in any server source code or config schema. The key is currently unused by the server application.

   Disposition: REGISTERED. The next implementation unit should wire it into `server/src/config/index.ts` alongside `SUPABASE_URL`.

2. Local env files contain actual production credentials in `.env` and `.env.local`. These appeared in a tool output during Phase 1 investigation.

   Disposition: SECURITY NOTE REGISTERED. Values not quoted anywhere. Paresh should verify gitignore and rotate if any secret has been committed.

---

## 16) Residuals

- Upload implementation remains blocked on bucket creation and package installation.
- The intake form (FTR-SL-012) correctly instructs suppliers to provide image URLs for now.
- No production supplier image was changed.

---

## 17) Commit Hash And Push Status

Docs commit: pending (written below).

Final HEAD at start of unit: 5d78206ac119e8a421b4a8a68c5fea595b1f3c65

---

## 18) Recommended Next Unit

FTR-SL-013A-CATALOG-IMAGE-UPLOAD-SUPABASE-STORAGE-IMPLEMENTATION-01

Prerequisites before running that unit:
1. Create Supabase Storage bucket `catalog-images` with public read access.
2. Confirm `SUPABASE_URL` and add to `server/.env` and Vercel production.
3. Confirm `SUPABASE_SERVICE_ROLE_KEY` in `server/.env` and Vercel production.
4. Add `CATALOG_IMAGE_BUCKET=catalog-images` to env.

The design artifact at `FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-DESIGN.md` contains the full implementation blueprint.
