# FTR-SL-016-CERTIFICATE-UPLOAD-STORAGE-INVESTIGATION-DESIGN-IMPLEMENTATION-01

**Unit:** FTR-SL-016-CERTIFICATE-UPLOAD-STORAGE-INVESTIGATION-DESIGN-IMPLEMENTATION-01  
**Type:** Bounded implementation / minimal schema migration / private document storage / tenant certification UI integration  
**Date:** 2026-06-13  
**Operator:** Copilot (automated agent)  
**Parent family:** Soft Launch / B2B supplier trust readiness

---

## 1. Final Enum

**`FTR_SL_016_CERTIFICATE_UPLOAD_IMPLEMENTED_PENDING_DB_MIGRATION_AND_PRIVATE_STORAGE_ENV`**

---

## 2. Objective

Implement the first safe certificate/certification document upload capability for B2B tenants while preserving tenant isolation and avoiding public document exposure.

Bounded requirements:
- Add minimal certification document metadata schema only.
- Use private/default-non-public storage, not the public catalog/logo bucket.
- Add tenant-scoped upload and short-lived access routes.
- Integrate with the existing tenant Certifications panel.
- Update the tenant OpenAPI contract.
- Do not mutate production supplier data during implementation.

---

## 3. Governance Contracts Reviewed

- `.github/copilot-instructions.md` Safe-Write Mode
- `AGENTS.md`
- `shared/contracts/db-naming-rules.md`
- `shared/contracts/schema-budget.md`
- `shared/contracts/rls-policy.md`
- `shared/contracts/openapi.tenant.json`

Applicable findings:
- `org_id` remains the canonical tenant boundary.
- Certificate documents must not be exposed through public storage URLs.
- Schema changes require tracked migration discipline and must not be applied by `migrate dev`, `db push`, seed, or direct ad hoc SQL.
- Tenant routes must use request DB context and route/service-level org scoping.

---

## 4. Repo Preflight

Initial FTR-SL-016 preflight was clean before implementation:

```text
branch: main
HEAD=origin/main=bc54d3cab4c9ecd2300eb75b6f997cc013337791
worktree: clean
```

Post-implementation changed-file scope:

```text
components/Tenant/CertificationsPanel.tsx
server/prisma/schema.prisma
server/src/config/index.ts
server/src/routes/tenant/certifications.g019.ts
server/src/services/certification.g019.service.ts
services/certificationService.ts
shared/contracts/openapi.tenant.json
server/prisma/migrations/pr-ftr-sl-016-certification-document-metadata.sql
server/src/__tests__/certificateDocument.storage.test.ts
server/src/services/storage/certificateDocument.storage.ts
```

No `.env` files, auth middleware, RLS policy files, public supplier profile routes, `/products`, MEVITAS data, Shraddha data, or `lt-b2b-001` data were modified.

---

## 5. Repo Truth Findings

### Existing Certification Surface

- Tenant certification UI existed at `components/Tenant/CertificationsPanel.tsx`.
- Frontend API client existed at `services/certificationService.ts`.
- Tenant route plugin existed at `server/src/routes/tenant/certifications.g019.ts`.
- Service layer existed at `server/src/services/certification.g019.service.ts`.
- Prisma `Certification` model had no document metadata fields before this unit.

### Existing Storage Surface

- Catalog image and tenant logo storage helpers use Supabase Storage with public URL paths.
- Those public-image buckets are not safe for certificate documents.
- No reusable private tenant document storage helper was found.

### Design Decision

Selected bounded Path B:
- Implement code and metadata in repo.
- Add a dedicated optional private storage bucket env var: `CERTIFICATE_DOCUMENT_BUCKET`.
- Return only short-lived signed URLs for document access.
- Do not expose `documentStoragePath` in API responses.
- Do not apply DB migration or configure production storage in this unit.

---

## 6. Implementation Summary

### Schema and Migration

Added nullable metadata fields to `Certification`:

- `documentStoragePath`
- `documentOriginalName`
- `documentMimeType`
- `documentSizeBytes`
- `documentUploadedAt`

Added tracked SQL migration file:

- `server/prisma/migrations/pr-ftr-sl-016-certification-document-metadata.sql`

The migration adds the columns idempotently, adds a positive-size check constraint, and adds a partial org/uploaded-at index for document-bearing certifications.

Migration was not applied in this unit. No direct SQL was run. No `prisma migrate dev`, `prisma db push`, `prisma db pull`, or seed command was run.

### Private Storage Helper

Added `server/src/services/storage/certificateDocument.storage.ts`:

- Dedicated `CERTIFICATE_DOCUMENT_BUCKET` config key.
- 5 MB file size limit.
- Accepts PDF, JPG, PNG, and WEBP after magic-byte validation via `file-type`.
- Stores objects under org/certification-scoped private paths.
- Creates 300-second signed URLs for access.
- Never calls `getPublicUrl`.

### Tenant API

Added tenant-scoped routes in `server/src/routes/tenant/certifications.g019.ts`:

- `POST /api/tenant/certifications/{id}/document/upload`
- `GET /api/tenant/certifications/{id}/document`

Route properties:
- Uses tenant auth and request DB context.
- Derives `orgId` from authenticated context only.
- Validates certification ownership by `id + orgId`.
- Restricts upload to `OWNER` and `ADMIN` server-side.
- Stores metadata only after storage upload succeeds.
- Returns signed access URL separately from metadata.
- Does not return storage path.

### Service and API Contracts

Updated `server/src/services/certification.g019.service.ts` to include safe metadata in list/detail responses.

Updated `services/certificationService.ts` to include:
- Safe document metadata fields in certification types.
- `uploadCertificationDocument(id, file)`.
- `getCertificationDocumentAccess(id)`.

Updated `shared/contracts/openapi.tenant.json` with the two tenant document endpoints.

### Tenant UI

Updated `components/Tenant/CertificationsPanel.tsx`:
- Added document metadata display in certification details.
- Added upload control for existing certifications.
- Added short-lived signed-url open action.
- Preserved server authority for role enforcement.

---

## 7. Privacy and Boundary Confirmations

- No public certificate URL is persisted or returned.
- `documentStoragePath` is internal-only and omitted from service/API responses.
- Upload path is scoped by authenticated `orgId` and certification ID.
- Frontend does not send `orgId` or tenant ID in the upload body.
- Public B2B projection routes were not changed.
- Public supplier profile routes were not called or modified.
- `/products` was not changed.
- No MEVITAS, Shraddha, or `lt-b2b-001` data mutation was performed.
- No certificate document was uploaded during runtime verification.

---

## 8. Validation Results

Focused storage validation:

```text
pnpm --dir server exec vitest run src/__tests__/certificateDocument.storage.test.ts

Test Files  1 passed (1)
Tests       5 passed (5)
```

Prisma client generation:

```text
pnpm --dir server exec prisma generate

Prisma Client generated successfully.
```

Diff hygiene, Prisma validation, and typechecks:

```text
git diff --check

warning: in the working copy of 'components/Tenant/CertificationsPanel.tsx', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'server/src/routes/tenant/certifications.g019.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'server/src/services/certification.g019.service.ts', CRLF will be replaced by LF the next time Git touches it
warning: in the working copy of 'services/certificationService.ts', CRLF will be replaced by LF the next time Git touches it
```

```text
pnpm --dir server exec prisma validate

Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Prisma schema warning:
- The `onDelete` referential action of a relation should not be set to `SetNull` when a referenced field is required.
The schema at prisma\schema.prisma is valid
```

```text
pnpm --dir server typecheck

> texqtic-platform-server@0.1.0 typecheck
> tsc --noEmit
```

```text
pnpm typecheck

> texqtic-platform-ui@0.1.0 typecheck
> tsc --noEmit && cd server && npm run typecheck

> texqtic-platform-server@0.1.0 typecheck
> tsc --noEmit
```

Server lint:

```text
pnpm --dir server lint

1119 problems (0 errors, 1119 warnings)
0 errors and 2 warnings potentially fixable with the --fix option.
```

Lint warning volume is pre-existing repo baseline noise from unrelated files; no blocking lint errors were reported.

---

## 9. Runtime Verification Status

**Status:** BLOCKED_PENDING_CONFIGURATION

Runtime upload/access verification was not executed because two deployment prerequisites remain outside this unit:

1. Apply the tracked certification metadata migration through the approved TexQtic DB path.
2. Configure a private/non-public Supabase Storage bucket and set `CERTIFICATE_DOCUMENT_BUCKET` in the runtime environment.

Until both are complete, the code is expected to fail safely rather than silently expose documents:
- Missing bucket config produces storage-not-configured behavior.
- Missing DB metadata columns would block metadata persistence after upload.

---

## 10. Next Required Unit

Recommended follow-up:

`FTR-SL-016A-CERTIFICATE-DOCUMENT-DB-MIGRATION-STORAGE-ENV-RUNTIME-VERIFY-01`

Scope:
- Apply the tracked schema change using the approved DB execution path.
- Configure/verify private certificate document bucket presence without printing secrets.
- Run one safe tenant-auth QA/demo upload and signed-access verification.
- Confirm public B2B routes and public supplier projection do not expose document URLs.

---

## 11. Commit Scope

Files intended for the atomic FTR-SL-016 commit:

- `server/prisma/schema.prisma`
- `server/prisma/migrations/pr-ftr-sl-016-certification-document-metadata.sql`
- `server/src/config/index.ts`
- `server/src/routes/tenant/certifications.g019.ts`
- `server/src/services/certification.g019.service.ts`
- `server/src/services/storage/certificateDocument.storage.ts`
- `server/src/__tests__/certificateDocument.storage.test.ts`
- `components/Tenant/CertificationsPanel.tsx`
- `services/certificationService.ts`
- `shared/contracts/openapi.tenant.json`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-016-CERTIFICATE-UPLOAD-STORAGE-INVESTIGATION-DESIGN-IMPLEMENTATION-01.md`

Recommended commit message:

```text
[TEXQTIC] add tenant certificate document upload
```
