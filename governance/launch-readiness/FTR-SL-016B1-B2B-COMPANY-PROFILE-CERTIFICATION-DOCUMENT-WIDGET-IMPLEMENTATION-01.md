# FTR-SL-016B1 - B2B Company Profile Certification Document Widget Implementation

## 1. Unit Identity

- **Unit ID:** `FTR-SL-016B1-B2B-COMPANY-PROFILE-CERTIFICATION-DOCUMENT-WIDGET-IMPLEMENTATION-01`
- **Date:** 2026-06-13
- **Mode:** Bounded frontend integration / existing API reuse / Company Profile UX implementation
- **Base design:** `FTR-SL-016B-B2B-COMPANY-PROFILE-RICH-PROFILE-CERTIFICATION-UPLOAD-DESIGN-01`
- **Base commit:** `70f7176c16f8d8d98d0e41ea4a976d72599725fc`
- **Final enum:** `FTR_SL_016B1_IMPLEMENTED_RUNTIME_VERIFICATION_PARTIAL`

## 2. Repo Preflight

Command:

```text
git branch --show-current; git rev-parse HEAD; git status --short; git log --oneline -8; git remote -v
```

Observed output:

```text
main
70f7176c16f8d8d98d0e41ea4a976d72599725fc
70f7176c (HEAD -> main, origin/main, origin/HEAD) [TEXQTIC] design rich B2B company profile
61829f16 [TEXQTIC] verify certificate document QA upload runtime
d5834e5b [TEXQTIC] verify certificate document production readiness
ff4b0b9f [TEXQTIC] add tenant certificate document upload
bc54d3ca [TEXQTIC] verify B2B logo display and public projection
972c2dba [TEXQTIC] fix B2B profile logo display and public projection
bd1be058 [TEXQTIC] backend: localize multipart registration for C4 fix
dcffb7f6 [TEXQTIC] restore auth after multipart entrypoint regression
origin  https://github.com/TexQtic/TexQtic.git (fetch)
origin  https://github.com/TexQtic/TexQtic.git (push)
```

Interpretation:

- Branch is `main`.
- HEAD equals the FTR-SL-016B design commit.
- `origin/main` is at the same commit.
- Initial worktree was clean; `git status --short` produced no output.

## 3. Repo-Truth Findings

### Company Profile integration point

`components/Tenant/B2BProfileSettings.tsx` remains the correct integration point. `App.tsx` renders it when `appState === 'SETTINGS'` for normal non-WL B2B tenants. The component currently manages display name and logo, then appears alongside `PlanAndUsagePanel`.

### Existing certification APIs reused

`services/certificationService.ts` already exposes the needed tenant helpers:

- `listCertifications({ limit, offset, stateKey })`
- `getCertification(id)`
- `uploadCertificationDocument(id, file)`
- `getCertificationDocumentAccess(id)`
- `deleteCertificationDocument(id)`
- lifecycle helpers remain available for the dedicated Certifications workspace.

### Existing document upload/access/delete support

`server/src/routes/tenant/certifications.g019.ts` already provides tenant-scoped private document routes:

- `POST /api/tenant/certifications/{id}/document/upload`
- `GET /api/tenant/certifications/{id}/document`
- `DELETE /api/tenant/certifications/{id}/document`

The server derives org scope from `dbContext.orgId`, keeps storage path private, restricts upload/delete to OWNER/ADMIN, and returns signed access only through authenticated tenant access.

### Storage posture

`server/src/services/storage/certificateDocument.storage.ts` uses the private `certificate-documents` bucket, validates PDF/JPG/PNG/WEBP by file content, enforces a 5 MB limit, creates org/cert scoped private paths, and returns 300-second signed URLs only through the access route.

### OpenAPI contract

`shared/contracts/openapi.tenant.json` already documents upload, signed access, and delete/remove. No OpenAPI change was required.

### Reusable widget/component

No compact Company Profile widget existed. `CertificationsPanel` is a standalone lifecycle panel with list/create/detail/transition navigation, so embedding it wholesale would create duplicate navigation and layout concerns.

## 4. Implementation Summary

### Widget/component added

Created `components/Tenant/CertificationDocumentsWidget.tsx`.

The widget:

- loads certifications through `listCertifications({ limit: 50 })`;
- shows total certifications, issued/approved count, and uploaded document count;
- shows compact certification type chips;
- renders one compact row per certification;
- shows state, issued/expiry date, and document status;
- shows filename, MIME type, size, and uploaded timestamp when a document exists;
- shows a clear no-document state when absent;
- opens documents through `getCertificationDocumentAccess()` without printing signed URLs;
- uploads/replaces documents through `uploadCertificationDocument()`;
- removes documents through `deleteCertificationDocument()` with confirmation;
- reloads the certification list after upload/remove;
- shows row-level errors and widget-level success/error states.

### Company Profile integration

Updated `components/Tenant/B2BProfileSettings.tsx` to render `CertificationDocumentsWidget` below the current Company Profile identity card.

The widget receives `canEdit` from the existing tenant profile response, preserving current OWNER/ADMIN frontend gating.

### Full Certifications workspace link

The widget includes a `Manage all certifications` button. Within the current allowed-file boundary, `B2BProfileSettings.tsx` delegates this action to the existing shell Certifications navigation button if present. No `App.tsx` or shell source changes were made.

### Role/permission handling

- OWNER/ADMIN: upload/replace/remove controls are visible.
- Authenticated read-only users: mutation controls are hidden and replaced with read-only explanatory copy.
- Document open uses the existing authenticated tenant access service and backend policy.
- Backend remains the source of truth for all permission enforcement.

## 5. Files Changed

- `components/Tenant/B2BProfileSettings.tsx`
- `components/Tenant/CertificationDocumentsWidget.tsx`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-016B1-B2B-COMPANY-PROFILE-CERTIFICATION-DOCUMENT-WIDGET-IMPLEMENTATION-01.md`

No backend, schema, storage, OpenAPI, public projection, or `/products` files were modified.

## 6. Validation Results

Command:

```text
pnpm typecheck
```

Observed output:

```text
> texqtic-platform-ui@0.1.0 typecheck C:\Users\PARESH\TexQtic
> tsc --noEmit && cd server && npm run typecheck

npm warn Unknown env config "npm-globalconfig". This will stop working in the next major version of npm.
npm warn Unknown env config "verify-deps-before-run". This will stop working in the next major version of npm.
npm warn Unknown env config "_jsr-registry". This will stop working in the next major version of npm.

> texqtic-platform-server@0.1.0 typecheck
> tsc --noEmit
```

Result: PASS.

Command:

```text
git diff --check
```

Observed output:

```text
warning: in the working copy of 'components/Tenant/B2BProfileSettings.tsx', CRLF will be replaced by LF the next time Git touches it
```

Result: PASS with line-ending warning only; no whitespace error lines were reported.

Focused frontend test status: no existing focused `B2BProfileSettings` or `CertificationDocumentsWidget` component test was found during repo-truth grep; no test infrastructure was added in this bounded unit.

## 7. Runtime Verification Results

Runtime verification status: PARTIAL at artifact creation time.

Reason:

- The implementation is local until committed/pushed and picked up by the hosted app build.
- The shared IDE browser currently has a Shraddha Industries tenant session and public `/b2b` session available.
- Upload/delete mutation against a real supplier certification was not authorized by this implementation prompt.

Safe verification planned/performed in final report:

- Company Profile widget visibility after hosted build is available.
- Existing certification summary and document metadata display.
- Signed document open through existing authenticated access without printing signed URL.
- Manage all certifications navigation.
- Public non-exposure checks on `/api/public/b2b/suppliers`, `/b2b`, and `/products`.

Skipped unless explicitly authorized:

- Upload/replace mutation from Company Profile against real supplier data.
- Remove/delete mutation from Company Profile against real supplier data.

## 8. Public Non-Exposure Check

Implementation analysis:

- No public projection file was changed.
- No public B2B service file was changed.
- No public B2B discovery component was changed.
- No `/products` file was changed.
- The new widget calls only authenticated tenant certification APIs.
- The widget does not render storage path, bucket name, or raw signed URL.

Public runtime checks are recorded in the final report when executed against the shared browser/runtime.

## 9. Permission Behavior

Expected behavior from implemented code and existing backend authority:

- OWNER/ADMIN can see upload/replace and remove controls.
- Non-OWNER/ADMIN users do not see upload/replace/remove controls.
- Open document uses existing authenticated signed-access policy.
- Unauthenticated users cannot reach Company Profile or tenant certification APIs.
- Backend remains authoritative for mutation authorization.

## 10. Residuals

- Runtime upload/replace and remove/delete from Company Profile require either a QA/demo OWNER/ADMIN tenant session or explicit authorization for a real tenant/certification lane.
- `App.tsx` was not in the allowlist, so the full Certifications workspace link uses the existing shell button rather than a direct prop from `App.tsx`. A future polish unit may pass an explicit `onManageCertifications` callback if allowlisted.
- Broader rich Company Profile fields remain deferred to the FTR-SL-016B2 design/API/schema slice.

## 11. Preserved Future Rich Profile Slices

The broader FTR-SL-016B design remains preserved and not implemented here:

- rich profile API/schema design;
- richer business fields;
- public/private field classification;
- completeness score expansion;
- media/banner/gallery design;
- public projection expansion only after classification;
- FTR-SL-017 catalogue visibility relationship.

## 12. Commit / Push Proof

Commit/push proof is recorded in the final report after the atomic commit is created and pushed.

## 13. Next Recommended Unit

`FTR-SL-016B2-B2B-COMPANY-PROFILE-RICH-FIELDS-API-SCHEMA-DESIGN-01`

Reason: the first certification/document slice is implemented. The next Company Profile step should design the API/schema and public/private classification for richer business fields before any schema or public projection implementation.
