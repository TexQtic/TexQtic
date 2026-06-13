# FTR-SL-016A-CERTIFICATE-DOCUMENT-DB-MIGRATION-STORAGE-ENV-RUNTIME-VERIFY-01

**Unit:** FTR-SL-016A-CERTIFICATE-DOCUMENT-DB-MIGRATION-STORAGE-ENV-RUNTIME-VERIFY-01  
**Type:** Bounded deployment/database migration/runtime verification unit  
**Date:** 2026-06-13  
**Operator:** Copilot (automated agent)  
**Parent:** FTR-SL-016-CERTIFICATE-UPLOAD-STORAGE-INVESTIGATION-DESIGN-IMPLEMENTATION-01

---

## 1. Final Enum

**`FTR_SL_016A_PARTIAL_DB_MIGRATION_DONE_STORAGE_OR_RUNTIME_PENDING`**

---

## 2. Repo Preflight

Mandatory preflight output:

```text
main
ff4b0b9fc7a4fbb95c38325e65793b4a0fdbd7a5
ff4b0b9f (HEAD -> main, origin/main, origin/HEAD) [TEXQTIC] add tenant certificate document upload
bc54d3ca [TEXQTIC] verify B2B logo display and public projection
972c2dba [TEXQTIC] fix B2B profile logo display and public projection
bd1be058 [TEXQTIC] backend: localize multipart registration for C4 fix
dcffb7f6 [TEXQTIC] restore auth after multipart entrypoint regression
origin  https://github.com/TexQtic/TexQtic.git (fetch)
origin  https://github.com/TexQtic/TexQtic.git (push)
```

Preflight interpretation:
- Branch: `main`
- HEAD: `ff4b0b9fc7a4fbb95c38325e65793b4a0fdbd7a5`
- FTR-SL-016 commit present locally and pushed to `origin/main`: yes
- Initial tracked worktree: clean

---

## 3. Migration Review

Migration file:

`server/prisma/migrations/pr-ftr-sl-016-certification-document-metadata.sql`

Safety review:
- Adds nullable document metadata columns to `public.certifications`.
- Adds positive-size check constraint `certifications_document_size_bytes_check`.
- Adds partial index `certifications_org_document_uploaded_idx` on `(org_id, document_uploaded_at DESC)` where `document_storage_path IS NOT NULL`.
- Uses `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Does not drop tables, drop columns, delete data, alter unrelated models, weaken RLS, or change tenant isolation.

Remote pre-check:

```text
target_table: certifications
matching document columns: 0 rows
constraint: 0 rows
index: 0 rows
certification_row_count: 2
```

Applied:

```text
\set ON_ERROR_STOP on
\i server/prisma/migrations/pr-ftr-sl-016-certification-document-metadata.sql
ALTER TABLE
DO
CREATE INDEX
```

Post-check:

```text
column_name              data_type                 is_nullable  length
document_mime_type       character varying         YES          100
document_original_name   character varying         YES          255
document_size_bytes      integer                   YES
document_storage_path    character varying         YES          1000
document_uploaded_at     timestamp with time zone  YES
```

Constraint verified:

```text
certifications_document_size_bytes_check | CHECK (((document_size_bytes IS NULL) OR (document_size_bytes > 0)))
```

Index verified:

```text
certifications_org_document_uploaded_idx | CREATE INDEX certifications_org_document_uploaded_idx ON public.certifications USING btree (org_id, document_uploaded_at DESC) WHERE (document_storage_path IS NOT NULL)
```

Existing certification rows remain intact by count:

```text
certification_row_count: 2
```

No private row data was printed.

---

## 4. Storage / Env

Supabase Storage bucket:

```text
SUPABASE_URL_PRESENT=True
SUPABASE_SERVICE_ROLE_KEY_PRESENT=True
BUCKET_CREATED=true
BUCKET_PUBLIC=false
```

Storage posture:
- Dedicated bucket: `certificate-documents`
- Private/non-public: yes (`BUCKET_PUBLIC=false`)
- Public catalog/logo bucket avoided: yes
- Bucket configured with 5 MB file size limit and allowed MIME types for PDF/JPG/PNG/WEBP.

Production env:

```text
VERCEL_CERTIFICATE_DOCUMENT_BUCKET_PRODUCTION_PRESENT=True
```

Deployment:

```text
vercel deploy --prod --yes
Production: https://texqtic-nu6si6gc2-tex-qtic.vercel.app
Aliased: https://app.texqtic.com
Ready in 1m
```

---

## 5. Validation

Required validation commands:

```text
pnpm --dir server exec prisma validate
```

Result: PASS. Prisma schema valid with existing non-blocking SetNull warning.

```text
pnpm --dir server exec prisma generate
```

Result: PASS. Prisma Client v6.1.0 generated successfully.

```text
pnpm --dir server exec vitest run src/__tests__/certificateDocument.storage.test.ts
```

Result: PASS.

```text
Test Files  1 passed (1)
Tests       5 passed (5)
```

```text
pnpm --dir server typecheck
```

Result: PASS.

```text
pnpm typecheck
```

Result: PASS.

```text
git diff --check
```

Result: PASS. No whitespace errors reported.

Server lint was not required in this prompt. Prior FTR-SL-016 server lint remained 0 errors with baseline warnings only.

---

## 6. Production Runtime Verification

Non-mutating runtime checks completed:

```text
HEALTH_STATUS=200
UNAUTH_ACCESS_STATUS=401
PUBLIC_B2B_STATUS=200
PUBLIC_B2B_CONTAINS_DOCUMENT_STORAGE_PATH=False
PUBLIC_B2B_CONTAINS_SIGNED_URL=False
PUBLIC_B2B_CONTAINS_CERT_DOCUMENT_BUCKET_NAME=False
PRODUCTS_STATUS=200
PRODUCTS_CONTAINS_DOCUMENT_STORAGE_PATH=False
PRODUCTS_CONTAINS_SIGNED_URL=False
PRODUCTS_CONTAINS_CERT_DOCUMENT_BUCKET_NAME=False
```

Public `/b2b` browser verification:
- Page title: `TexQtic — B2B Supplier Discovery`
- Public safety copy rendered, including protected private documents/internal details messaging.
- No public supplier profile route was called.

Upload/access runtime verification:
- Status: BLOCKED by safe tenant lane availability.
- The only shared authenticated tenant page available during this unit was `Shraddha Industries | TexQtic B2B Workspace`.
- Shraddha is a real supplier and the prompt explicitly forbids mutating Shraddha production data without explicit authorization.
- No certificate upload, certification creation, or document access mutation was performed in Shraddha.
- No QA/demo tenant authenticated OWNER/ADMIN session was available in the shared browser context.

---

## 7. Privacy / Tenant Boundary Confirmation

Repo-truth confirmations:
- `server/src/services/storage/certificateDocument.storage.ts` uses `createSignedUrl(storagePath, 300)`.
- Certificate storage helper does not use `getPublicUrl`.
- `documentStoragePath` is selected internally for signed URL generation but not returned in upload/access response data.
- Tenant routes query certifications by `{ id, orgId: dbContext.orgId }`.
- Upload route derives `orgId` from authenticated request context.
- Upload route enforces `userRole !== 'OWNER' && userRole !== 'ADMIN'` as 403.
- Frontend service types include only safe metadata and signed URL response; they do not expose `documentStoragePath`.
- Public B2B supplier payload and `/products` checks did not expose document storage paths, signed URL fields, or the bucket name.

---

## 8. Files Changed In This Unit

- `governance/launch-readiness/FTR-SL-016A-CERTIFICATE-DOCUMENT-DB-MIGRATION-STORAGE-ENV-RUNTIME-VERIFY-01.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

No source, schema, route, API contract, or test files were changed in FTR-SL-016A.

---

## 9. Residuals / Blockers

Residual blocker:
- A safe QA/demo tenant OWNER/ADMIN session is required to perform the actual production upload/access mutation verification.
- Current shared tenant session is Shraddha Industries and must not be mutated under this prompt.

Required user action:
- Provide or open a safe QA/demo tenant OWNER/ADMIN session in the shared browser, or explicitly authorize the exact tenant and certification record to use.
- Do not provide passwords/tokens through chat. Log in directly in the browser if credentials are needed.

---

## 10. Adjacent Findings

### FTR-SL-016B

- Finding: FTR-SL-016A could complete DB migration, private storage, env, deployment, unauth rejection, and public non-exposure checks, but not the positive upload/access mutation because no safe QA/demo tenant session was available.
- Disposition: Register follow-up runtime verification unit.
- Priority: P1
- Owner/status: Paresh to provide safe QA/demo tenant OWNER/ADMIN browser session or authorize exact tenant/certification record; OPEN.

Suggested unit:

`FTR-SL-016B-CERTIFICATE-DOCUMENT-QA-UPLOAD-SIGNED-ACCESS-RUNTIME-VERIFY-01`

---

## 11. Next Recommended Unit

After FTR-SL-016B positive upload/access verification completes:

`FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-01`

If auth recovery becomes launch-critical before a safe QA/demo upload lane is available, reprioritize:

`FTR-SL-019-AUTH-FORGOT-PASSWORD-LOGIN-RECOVERY-INVESTIGATION-01`
