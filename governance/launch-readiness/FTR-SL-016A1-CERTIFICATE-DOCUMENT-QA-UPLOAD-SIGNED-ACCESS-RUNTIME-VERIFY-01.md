# FTR-SL-016A1-CERTIFICATE-DOCUMENT-QA-UPLOAD-SIGNED-ACCESS-RUNTIME-VERIFY-01

**Unit:** FTR-SL-016A1-CERTIFICATE-DOCUMENT-QA-UPLOAD-SIGNED-ACCESS-RUNTIME-VERIFY-01  
**Type:** Continuation unblock, production runtime verification, bounded lifecycle fix  
**Date:** 2026-06-13  
**Operator:** Copilot (automated agent)  
**Parent:** FTR-SL-016A-CERTIFICATE-DOCUMENT-DB-MIGRATION-STORAGE-ENV-RUNTIME-VERIFY-01

---

## 1. Final Enum

Target final enum after post-deploy production delete verification:

**`FTR_SL_016A1_CERTIFICATE_DOCUMENT_UPLOAD_ACCESS_DELETE_VERIFIED_COMPLETE`**

If production delete verification fails after deployment, downgrade to:

**`FTR_SL_016A1_BLOCKED_DELETE_RUNTIME_VERIFICATION_FAILED`**

---

## 2. Blocker Resolution

Original blocker:

```text
FTR-SL-016A1 runtime upload/access verification completed, but governance closeout, commit, and push were blocked because the visible prompt did not include explicit Modify allowlist or approved command set.
```

User decision:

```text
Continuation prompt explicitly authorized governance closeout edits, implementation files for the bounded delete/remove lifecycle fix, validation commands, commit, push, and production verification.
```

Modify allowlist applied:

```text
governance/launch-readiness/FUTURE-TODO-REGISTER.md
governance/launch-readiness/FTR-SL-016A1-CERTIFICATE-DOCUMENT-QA-UPLOAD-SIGNED-ACCESS-RUNTIME-VERIFY-01.md
server/src/services/storage/certificateDocument.storage.ts
server/src/routes/tenant/certifications.g019.ts
server/src/services/certification.g019.service.ts
server/src/__tests__/certificateDocument.storage.test.ts
components/Tenant/CertificationsPanel.tsx
services/certificationService.ts
shared/contracts/openapi.tenant.json
```

Approved command set applied:

```text
git branch --show-current
git rev-parse HEAD
git status --short
git log --oneline -5
git diff --name-only
git diff --check
git diff
git add <allowlisted files>
git commit -m "[TEXQTIC] verify certificate document QA upload runtime"
git push origin main
pnpm --dir server exec prisma validate
pnpm --dir server exec vitest run src/__tests__/certificateDocument.storage.test.ts
pnpm --dir server typecheck
pnpm typecheck
Narrow runtime/browser checks for certificate document delete/remove behavior without printing secrets or signed URLs.
```

Forbidden posture preserved:

- No schema alteration or migration.
- No direct SQL.
- No `prisma migrate dev`, `db push`, `migrate reset`, or seed command.
- No DB URL, Supabase key, JWT, cookie, or signed URL printed.
- No public bucket or public URL path introduced.
- No `/api/public/supplier/:slug` call.
- No `/products` change.
- No FTR-SL-016B Company Profile redesign implementation.

---

## 3. Repo Preflight

Pre-implementation evidence:

```text
git branch --show-current
main

git rev-parse HEAD
d5834e5b375feea19ff29d2069c6e87fc486fc83

git status --short
[no output]

git log --oneline -5
d5834e5b (HEAD -> main, origin/main, origin/HEAD) [TEXQTIC] verify certificate document production readiness
ff4b0b9f [TEXQTIC] add tenant certificate document upload
bc54d3ca [TEXQTIC] verify B2B logo display and public projection
972c2dba [TEXQTIC] fix B2B profile logo display and public projection
bd1be058 [TEXQTIC] backend: localize multipart registration for C4 fix

git diff --name-only
[no output]
```

---

## 4. Runtime Upload + Signed Access Evidence

Authorized production lane:

- Tenant/session: Shraddha Industries tenant workspace, explicitly authorized by Paresh for exact harmless QA certification verification.
- Certification record: `496f4b74-ea2c-4994-b14c-2852988c7aad`
- Certification type: `QA_CERTIFICATE_UPLOAD_TEST`
- Organization: `0ae549d7-b17b-4277-b9f6-f3e8c3a57e09`

Upload evidence:

```text
Upload response status: 200
Upload response success: true
Uploaded file: texqtic logo small.png.jpeg
Uploaded MIME: image/jpeg
Uploaded bytes: 5679
Upload response data keys: certificationId, documentMimeType, documentOriginalName, documentSizeBytes, documentUploadedAt
Upload response exposed documentStoragePath: false
Upload response exposed public URL: false
Upload response exposed signed URL: false
UI metadata displayed filename/type/size/uploaded date: true
```

Signed-access evidence:

```text
Signed-access endpoint status: 200
Signed-access endpoint success: true
Signed-access response data keys: certificationId, documentMimeType, documentOriginalName, documentSizeBytes, documentUploadedAt, signedUrl
Signed-access response exposed documentStoragePath: false
Signed-access response exposed public URL: false
Signed URL fetch status: 200
Signed URL fetch content-type: image/jpeg
Signed URL fetch bytes: 5679
Full signed URL printed/logged: false
```

Unauthenticated access evidence:

```text
UNAUTH_GET_DOCUMENT_STATUS=401
UNAUTH_GET_DOCUMENT_ERROR_CODE=UNAUTHORIZED
```

---

## 5. Delete/Remove Blind Spot And Fix

Repo truth before implementation:

- Delete/remove facility existed before this continuation: no.
- Upload route existed at `POST /api/tenant/certifications/:id/document/upload`.
- Signed access route existed at `GET /api/tenant/certifications/:id/document`.
- Storage helper supported upload and signed URL only.
- Frontend client supported upload/access only.
- Certifications panel could reuse existing document metadata state for a remove action.

Implemented bounded fix:

- Added `deleteCertificateDocumentFromStorage(storagePath)` to remove the private Supabase Storage object from the configured `certificate-documents` bucket.
- Treats missing object/not-found storage responses as already removed.
- Fails closed on missing storage config or non-not-found storage errors.
- Added `DELETE /api/tenant/certifications/:id/document`.
- Requires authenticated tenant context.
- Requires OWNER or ADMIN role.
- Finds certification by `id + dbContext.orgId`.
- Deletes storage object before clearing metadata.
- Clears `documentStoragePath`, `documentOriginalName`, `documentMimeType`, `documentSizeBytes`, and `documentUploadedAt`.
- Response returns safe null metadata only and never returns storage path, public URL, signed URL, or private key/path.
- Added frontend client method `deleteCertificationDocument(id)`.
- Added Certifications panel `Remove Document` action with confirmation, loading state, success/failure feedback, and detail refresh.
- Updated tenant OpenAPI contract with the delete operation.
- Extended focused storage tests from 5 to 8 tests.

---

## 6. Validation

```text
pnpm --dir server exec prisma validate
Result: PASS
Note: Existing Prisma SetNull referential-action warning preserved.
```

```text
pnpm --dir server exec vitest run src/__tests__/certificateDocument.storage.test.ts
Result: PASS
Test Files  1 passed (1)
Tests       8 passed (8)
```

```text
pnpm --dir server typecheck
Result: PASS
```

```text
pnpm typecheck
Result: PASS
Note: Nested npm run emitted npm config warnings for npm-globalconfig, verify-deps-before-run, and _jsr-registry.
```

```text
git diff --check
Result: PASS
Note: Git reported line-ending normalization warnings for touched CRLF files; no whitespace errors were reported.
```

---

## 7. Public Non-Exposure Verification

Post-upload public checks:

```text
/api/public/b2b/suppliers_STATUS=200
/api/public/b2b/suppliers_documentStoragePath=false
/api/public/b2b/suppliers_signedUrl=false
/api/public/b2b/suppliers_certificateBucket=false
/api/public/b2b/suppliers_testFilenameOrCert=false

/b2b_STATUS=200
/b2b_documentStoragePath=false
/b2b_signedUrl=false
/b2b_certificateBucket=false
/b2b_testFilenameOrCert=false

/products_STATUS=200
/products_documentStoragePath=false
/products_signedUrl=false
/products_certificateBucket=false
/products_testFilenameOrCert=false
```

Post-delete public checks are required after production deployment of this commit and are recorded in the final report.

---

## 8. Files Changed In This Unit

Implementation:

- `server/src/services/storage/certificateDocument.storage.ts`
- `server/src/routes/tenant/certifications.g019.ts`
- `server/src/__tests__/certificateDocument.storage.test.ts`
- `components/Tenant/CertificationsPanel.tsx`
- `services/certificationService.ts`
- `shared/contracts/openapi.tenant.json`

Governance:

- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-016A1-CERTIFICATE-DOCUMENT-QA-UPLOAD-SIGNED-ACCESS-RUNTIME-VERIFY-01.md`

Allowed but unchanged:

- `server/src/services/certification.g019.service.ts`

---

## 9. Privacy / Tenant Boundary Confirmation

- No public URL persisted.
- No `documentStoragePath` exposed in frontend/API/public responses.
- Signed URLs are returned only by authenticated tenant access endpoint.
- Delete/remove is tenant-scoped by authenticated `dbContext.orgId`.
- Delete/remove validates certification ownership by `id + orgId` before storage deletion and metadata clear.
- OWNER/ADMIN enforcement preserved for upload and added for delete/remove.
- Public B2B surfaces do not expose certificate document storage data.
- Storage helper does not call `getPublicUrl`.
- Full signed URLs were not printed or logged.

---

## 10. Commit / Push Proof

Commit and push proof is recorded in the final report after this artifact is committed and pushed.

---

## 11. Residuals / Blockers

Post-commit production deployment verification is required to prove the newly implemented delete/remove route and UI in production.

Non-OWNER/ADMIN delete denial was not executed because no safe non-OWNER/ADMIN tenant session was available in the shared browser context. Repo truth confirms server role gate: `userRole !== 'OWNER' && userRole !== 'ADMIN'` returns `FORBIDDEN`.

---

## 12. Adjacent Findings

ID: `QA-CERT-UX-001 / FTR-SL-016B`  
Title: B2B Company Profile Rich Profile + Certification Upload Access Design  
Finding: B2B Dashboard -> Company Profile is currently primitive and must be design-planned into a richer company profile facility. Certificate/certification upload and update access must also be available from Company Profile, not only from the Certifications panel.  
Priority: High  
Disposition: Keep as design-first follow-up after FTR-SL-016A1 lifecycle verification, unless Paresh reprioritizes it before FTR-SL-017.  
Status: OPEN

Recommended next unit:

```text
FTR-SL-016B-B2B-COMPANY-PROFILE-RICH-PROFILE-CERTIFICATION-UPLOAD-DESIGN-01
```
