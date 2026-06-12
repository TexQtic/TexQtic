# FTR-SL-013 — Product Image Upload Infrastructure Design

Unit: FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-01
Date: 2026-06-12
Status: DESIGN_READY
Path chosen: B — no safe storage seam exists in current repo truth

---

## 1) Current URL-Only Flow

The current product image flow is entirely URL-based:

- `CatalogItem.imageUrl` stores a string URL in the database via `image_url` column.
- `POST /api/tenant/catalog/items` accepts `imageUrl: z.string().url().max(2048).optional()`.
- `PATCH /api/tenant/catalog/items/:id` accepts `imageUrl: z.string().url().max(2048).nullable().optional()`.
- The catalog create/edit form in App.tsx renders a single `<input type="url">` for the Image URL field (line 5564–5572).
- Public B2B projection reads `imageUrl` from `CatalogItem` and renders it on `/b2b` offering cards and the PDP buyer view.
- No upload route, no multipart handler, no storage provider client, no file-input element exists anywhere in the repo.

---

## 2) Exact Missing Storage Pieces

All of the following are absent and must be created before implementation:

**Server:**
- No `@supabase/supabase-js` (or Supabase Storage REST client) installed.
- No storage-related env vars in `server/src/config/index.ts` Zod schema (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are absent from the schema even though the key exists in `.env.local`).
- No upload route (`POST /api/tenant/catalog/images/upload` or equivalent).
- No multipart/form-data parsing plugin registered in Fastify.
- No file validation utility.
- No storage path generator.

**Frontend:**
- No `<input type="file">` in the catalog create/edit form.
- No upload state (`uploading`, `uploadError`).
- No image preview component.
- No catalog image upload service function in `services/catalogService.ts`.

**Infrastructure:**
- No Supabase Storage bucket created.
- Bucket name, public/private policy, file size limit, and CORS configuration are all undefined.

---

## 3) Recommended Storage Provider

**Supabase Storage** is the natural choice because:

1. The TexQtic project already uses a Supabase-hosted Postgres instance.
2. Supabase Storage is included in all Supabase projects at no additional setup cost.
3. The `SUPABASE_SERVICE_ROLE_KEY` already exists in the server environment (`.env.local`).
4. Files uploaded via the service-role key from the server can be served via a stable CDN URL.
5. No new vendor accounts, billing relationships, or IAM configurations are needed.
6. Public buckets can be enabled for read-access on the `catalog-images` bucket so uploaded URLs are stable, publicly readable, and usable by the public B2B projection.

Do not use the service role key in the browser. All uploads must be server-proxied.

---

## 4) Required Env Vars — Names Only, No Values

The following env vars must be added to:
- `server/.env` (local development)
- `server/.env.local` (local development override)
- Vercel production environment settings

```
SUPABASE_URL=<your-supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
CATALOG_IMAGE_BUCKET=catalog-images
```

`SUPABASE_URL` follows the pattern `https://<project-ref>.supabase.co`.

`SUPABASE_SERVICE_ROLE_KEY` already exists in `.env.local`; it must be added to `server/src/config/index.ts` Zod schema and exposed via the `config` export.

`CATALOG_IMAGE_BUCKET` can be hardcoded as a constant or read from env. Recommend env for flexibility across dev/staging/production.

---

## 5) Proposed Upload Endpoint

```
POST /api/tenant/catalog/images/upload
```

**Auth:** `tenantAuthMiddleware` + `databaseContextMiddleware` (same as `POST /api/tenant/catalog/items`).

**Content-Type:** `multipart/form-data`.

**Request body:**
- `file`: binary file field, required.

**Validation rules:**
- MIME type must be one of: `image/jpeg`, `image/png`, `image/webp`.
- File size must not exceed 5 MB (5,242,880 bytes).
- Extension must match MIME type.

**Server logic:**
1. Parse multipart body using `@fastify/multipart`.
2. Read file stream into buffer (max 5 MB — abort if exceeded).
3. Validate MIME type from buffer magic bytes using `file-type` package or MIME check.
4. Generate unique filename: `<org_id>/<uuid>.<ext>`.
5. Upload to Supabase Storage bucket via service role client.
6. Return stable public URL.

**Response:**
```json
{
  "success": true,
  "imageUrl": "https://<project>.supabase.co/storage/v1/object/public/catalog-images/<org_id>/<uuid>.jpg"
}
```

**Error responses:**
- 400 `INVALID_FILE_TYPE` — MIME type not allowed.
- 400 `FILE_TOO_LARGE` — exceeds 5 MB.
- 400 `FILE_REQUIRED` — no file sent.
- 500 `UPLOAD_FAILED` — storage write error (log internally, do not expose storage details).

**Security guarantees:**
- Org ID in file path comes from authenticated `request.caeAuth.orgId` or equivalent tenant context — never from the request body.
- No original filename is used in the storage path.
- No signed upload credentials are returned to the browser.
- Service role key never leaves the server.

---

## 6) Proposed Frontend Component Changes

**File:** `App.tsx`

**Locations:** catalog item add form (around line 5564) and catalog item edit form.

**Changes required:**

1. Add `uploadingImage: false` and `uploadImageError: ''` to component state.
2. Replace or augment the `<input type="url">` for Image URL with:
   - A `<input type="file" accept=".jpg,.jpeg,.png,.webp">` labeled "Upload image".
   - The existing `<input type="url">` remains as a fallback labeled "Or paste image URL".
3. On file selection, call the upload service function and populate `imageUrl` with the returned URL on success.
4. Show a loading indicator while uploading.
5. Show a safe error message on failure.
6. Show an inline thumbnail preview when `imageUrl` is populated.

**File:** `services/catalogService.ts`

Add:

```typescript
export async function uploadCatalogImage(file: File): Promise<{ imageUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/tenant/catalog/images/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message ?? 'Upload failed');
  return { imageUrl: data.imageUrl };
}
```

---

## 7) Security Rules

1. All uploads are server-proxied; storage credentials are never exposed to the browser.
2. The storage path includes the org ID from the authenticated server-side tenant context, not the request body.
3. File type is validated by MIME type (magic bytes) and by extension.
4. Maximum size is enforced server-side in the multipart parser and in the buffer read limit.
5. Filename is generated server-side using `randomUUID()`. Original filenames are not used.
6. The upload endpoint requires a valid tenant auth token; unauthenticated requests return 401.
7. Cross-tenant upload is prevented by always deriving org_id from the server-side tenant context.
8. Storage bucket is public-read so uploaded image URLs are stable and can be served by the public B2B projection without signed URLs, but write access is restricted to the service role.
9. Do not log full file buffers or binary content.
10. Upload errors are sanitized before being returned to the client.

---

## 8) File Validation Rules

| Rule | Value |
|------|-------|
| Accepted MIME types | image/jpeg, image/png, image/webp |
| Accepted extensions | .jpg, .jpeg, .png, .webp |
| Maximum file size | 5 MB |
| Maximum dimension | not enforced at upload; may be deferred to a future image processing unit |
| Minimum file size | 1 byte (reject empty files) |
| Filename | server-generated UUID only; original filename ignored in storage path |
| Magic byte check | recommended; use `file-type` package or equivalent |

---

## 9) Storage Path Convention

```
catalog-images/<org_id>/<uuid>.<ext>
```

Examples:
- `catalog-images/0ae549d7-b17b-4277-b9f6-f3e8c3a57e09/3f8a1c2d-...-.jpg`
- `catalog-images/a1b2c3d4-e5f6-7890-abcd-ef1234567890/9e7b3a1f-...-.png`

Public URL structure (Supabase Storage public bucket):
```
https://<project-ref>.supabase.co/storage/v1/object/public/catalog-images/<org_id>/<uuid>.<ext>
```

This URL is stable and can be stored directly in `CatalogItem.imageUrl`.

---

## 10) URL Fallback

The existing `imageUrl` text input must remain. It is the fallback when:
- A supplier has a hosted image URL already.
- A supplier uses a CDN or product sheet URL.
- Upload fails and the supplier wants to provide the URL manually.

The field stores the same `imageUrl` regardless of whether it was typed manually or populated by upload. No schema change is needed.

---

## 11) Tests and Verification Plan

**Unit tests (no DB required):**
- File type validation helper: accept valid MIME types, reject invalid types.
- File size limit: reject files over 5 MB.
- Storage path generator: confirm org_id is embedded, UUID is unique, extension matches MIME type.
- Upload service function: mock Supabase client; confirm correct bucket, path, and response shape.
- Error sanitization: confirm storage error messages do not leak internal details.

**Integration tests (requires DB and Supabase Storage):**
- `POST /api/tenant/catalog/images/upload` with valid file returns `{ success: true, imageUrl: "https://..." }`.
- `POST /api/tenant/catalog/images/upload` with invalid MIME type returns 400.
- `POST /api/tenant/catalog/images/upload` with oversized file returns 400.
- `POST /api/tenant/catalog/images/upload` without auth returns 401.
- `POST /api/tenant/catalog/images/upload` with valid file for tenant A cannot write to tenant B's path (verified via storage path).

**Runtime verification:**
- Upload a test PNG via the catalog form and confirm the returned URL is stable and accessible.
- Create a catalog item with the uploaded URL and confirm it appears in `GET /api/public/b2b/suppliers` offering preview.

**Note:** Integration tests cannot be run locally if Supabase Storage bucket is not created and env vars not configured. Record as `LOCAL_DB_ENV_NOT_APPLICABLE` for those tests.

---

## 12) Exact Next Implementation Prompt Outline

Unit: `FTR-SL-013A-CATALOG-IMAGE-UPLOAD-SUPABASE-STORAGE-IMPLEMENTATION-01`

Prerequisites before running the next unit:
1. Supabase Storage bucket `catalog-images` created with public read access.
2. `SUPABASE_URL` confirmed and added to `server/.env` and Vercel production settings.
3. `SUPABASE_SERVICE_ROLE_KEY` confirmed in `server/.env` and Vercel production settings.
4. `CATALOG_IMAGE_BUCKET=catalog-images` added to env.

Implementation steps:
1. Add `@supabase/supabase-js` and `@fastify/multipart` to `server/package.json`.
2. Add `file-type` to `server/package.json` for MIME magic-byte validation.
3. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CATALOG_IMAGE_BUCKET` to `server/src/config/index.ts` Zod schema.
4. Create `server/src/services/storage/catalogImage.storage.ts` with upload function.
5. Create `server/src/routes/tenant/catalog-image-upload.ts` with `POST /api/tenant/catalog/images/upload`.
6. Register multipart plugin in Fastify app bootstrap.
7. Register the new route in the tenant plugin.
8. Add `uploadCatalogImage` to `services/catalogService.ts`.
9. Update the catalog add/edit form in `App.tsx` with file picker, upload state, and preview.
10. Add unit tests for the storage service and validation helpers.
11. Run `pnpm -C server typecheck` and `pnpm typecheck`.
12. Run `pnpm -C server lint` and `pnpm lint`.
13. Run safe public verification: `GET /api/public/b2b/suppliers`.
14. Commit and push.

Allowlist for that unit:
```
server/package.json
server/src/config/index.ts
server/src/services/storage/catalogImage.storage.ts
server/src/routes/tenant/catalog-image-upload.ts
server/src/app.ts (or equivalent Fastify bootstrap file for plugin registration)
server/src/__tests__/catalog-image-upload.unit.test.ts
services/catalogService.ts
App.tsx
governance/launch-readiness/FUTURE-TODO-REGISTER.md
governance/launch-readiness/FTR-SL-013A-CATALOG-IMAGE-UPLOAD-SUPABASE-STORAGE-IMPLEMENTATION-01.md
```

Forbidden in that unit: schema migration, RLS changes, supplier data mutation.

---

## 13) Decision Rationale For Deferring Implementation

Implementation is deferred from FTR-SL-013 because:

1. `@fastify/multipart` is not installed; adding it requires `pnpm add` and lockfile update.
2. `@supabase/supabase-js` is not installed; same constraint.
3. `file-type` is not installed.
4. `SUPABASE_URL` is not in the server config schema; it must be added and the Vercel production setting confirmed.
5. The Supabase Storage bucket may not exist; a bucket must be created before any upload can succeed.
6. Runtime verification of upload requires an active bucket, which cannot be confirmed from repo truth alone.

None of these blockers are fundamental architectural risks. They are concrete, actionable setup steps that a single authorized implementation unit can complete.
