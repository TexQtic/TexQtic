# FTR-SL-016B1A - Company Profile Certification Widget Runtime Verification

## 1. Unit Identity

- **Unit ID:** `FTR-SL-016B1A-B2B-COMPANY-PROFILE-CERTIFICATION-DOCUMENT-WIDGET-RUNTIME-VERIFY-01`
- **Date:** 2026-06-13
- **Mode:** Runtime verification / governance closeout
- **Base implementation:** `FTR-SL-016B1-B2B-COMPANY-PROFILE-CERTIFICATION-DOCUMENT-WIDGET-IMPLEMENTATION-01`
- **Base commit:** `2525ff57f68a4aa177e917d2bf9d78499402465f`
- **Final enum:** `FTR_SL_016B1A_RUNTIME_VERIFIED_WITH_MUTATION_SKIPPED`

## 2. Repo Preflight

Command:

```text
git branch --show-current; git rev-parse HEAD; git status --short; git log --oneline -8; git remote -v
```

Observed:

```text
main
2525ff57f68a4aa177e917d2bf9d78499402465f
2525ff57 (HEAD -> main, origin/main, origin/HEAD) [TEXQTIC] add company profile certification documents widget
70f7176c [TEXQTIC] design rich B2B company profile
61829f16 [TEXQTIC] verify certificate document QA upload runtime
d5834e5b [TEXQTIC] verify certificate document production readiness
ff4b0b9f [TEXQTIC] add tenant certificate document upload
bc54d3ca [TEXQTIC] verify B2B logo display and public projection
972c2dba [TEXQTIC] fix B2B profile logo display and public projection
bd1be058 [TEXQTIC] backend: localize multipart registration for C4 fix
origin  https://github.com/TexQtic/TexQtic.git (fetch)
origin  https://github.com/TexQtic/TexQtic.git (push)
```

- Branch: `main` ✅
- HEAD: `2525ff57` ✅ (FTR-SL-016B1 implementation commit)
- Origin synced ✅
- Initial worktree: clean ✅

## 3. Repo-Truth Confirmation

Checked files:

- `components/Tenant/B2BProfileSettings.tsx`: imports and renders `CertificationDocumentsWidget` below the Company Profile identity card section, passing `canEdit` and `onManageCertifications`.
- `components/Tenant/CertificationDocumentsWidget.tsx`: uses `listCertifications`, `uploadCertificationDocument`, `getCertificationDocumentAccess`, `deleteCertificationDocument`.
- No `documentStoragePath` rendered in widget output.
- No raw signed URL rendered in widget output (`window.open(result.signedUrl, '_blank', ...)` — URL opened in new tab, never displayed in DOM).
- No bucket name rendered.
- Mutation controls gated by `canEdit` prop.
- No backend/schema/public projection changes introduced.

## 4. Runtime Session Handling

- Initial browser context: Shraddha Industries OWNER/ADMIN session authenticated (page title `Shraddha Industries | TexQtic B2B Workspace`).
- Session requested from Paresh: not needed — session was already live.
- Session provided: yes, Shraddha Industries OWNER/ADMIN.
- Tenant/session used: Shraddha Industries.
- Authorization basis: existing authenticated OWNER/ADMIN session active in IDE browser; no new authentication performed; no secrets requested.
- Real supplier mutation performed: NO — open document used API-level signed access verification only; no upload, replace, or delete was executed.

## 5. Company Profile Widget Runtime Verification

### Company Profile opened

VERIFIED. Navigated to Company Profile via shell sidebar nav button `🏢 Company Profile`.

Page rendered:
- Identity card showing Company Name, Company Logo, Tenant Identity, Access Model.
- Profile baseline complete: 3/3 baseline identity checks.

### Certifications & Documents section visible

VERIFIED. Section heading `Certification document access` visible in Company Profile below the identity card, with label badge `CERTIFICATIONS & DOCUMENTS`.

Section is NOT a full Certifications workspace — it does not have list/create/detail/transition navigation.

### Summary displayed

VERIFIED. Three summary cards rendered after data load:

| Card | Value |
|---|---|
| Total certifications | 2 |
| Issued or approved | 0 |
| Documents uploaded | 1 |

### Certification type chips

VERIFIED. Two type chips shown: `GST` and `QA_CERTIFICATE_UPLOAD_TEST`.

### Rows displayed

VERIFIED. Two certification article rows rendered:

**GST certification row:**
- Type: `GST`
- State: `SUBMITTED` badge
- Document status: `Document uploaded` badge
- Filename: `SHRADDHA IND GST REGISTRATION CERTIFICATE.pdf`
- Type: `application/pdf`
- Size: `135.3 KB`
- Uploaded: `Jun 13, 2026, 09:21 AM`
- Controls visible: `Open document`, `Replace document`, `Remove document`

**QA_CERTIFICATE_UPLOAD_TEST row:**
- Type: `QA_CERTIFICATE_UPLOAD_TEST`
- State: `SUBMITTED` badge
- Document status: `No document uploaded` badge
- Body: `No certificate document has been uploaded for this certification.`
- Control visible: `Upload document`

### Document metadata state

VERIFIED. Both documents states (uploaded and not-uploaded) render correctly with appropriate badges, metadata, and controls.

### Loading state

VERIFIED. Loading certification documents... text with `...` dots appeared during API call, then resolved to final content.

## 6. Document Actions Verification

### Open signed access

VERIFIED via API. Called `GET /api/tenant/certifications/{id}/document` for the GST cert (cert ID: `ae55080e-0ee0-403e-b0f0-fa28b29cf7a5`):

```
documentAccessStatus: 200
documentAccessSuccess: true
signedUrlPresent: true
signedUrlScheme: "https://"
docMeta.mimeType: "application/pdf"
docMeta.sizeBytes: 138561
```

The signed URL is present and valid. It begins with `https://` and was NOT printed in this report.

The `Open document` button in the widget calls `window.open(result.signedUrl, '_blank', 'noopener,noreferrer')` — the URL is opened in a new tab, never displayed in the widget DOM.

### Upload/replace

SKIPPED. Reason: Current session is the real Shraddha Industries OWNER/ADMIN account. Uploading a new document on the GST certification or QA_CERTIFICATE_UPLOAD_TEST certification was not authorized by a specific prompt instruction. The QA cert upload was already verified in FTR-SL-016A1 via the dedicated QA lane.

### Remove/delete

SKIPPED. Reason: Same as upload — real supplier data, no explicit authorization for mutation in this unit.

### Skipped mutation checks reason

- No QA/demo OWNER/ADMIN lane was separately available.
- Existing Shraddha Industries session is a real supplier with real certification documents.
- FTR-SL-016A1 already provided positive upload + signed access + delete production evidence for the QA_CERTIFICATE_UPLOAD_TEST certification.
- The widget UI controls are present and wired to the same service methods verified in FTR-SL-016A1.

## 7. Manage Certifications Navigation

### Button visible

VERIFIED. `Manage all certifications` button visible in the widget header area.

### Navigation result

VERIFIED. Clicking the button navigated to the full Certifications workspace:

- Page title: `Certifications | Shraddha Industries | TexQtic B2B Workspace`
- Body: `← Back`, `Certifications`, `G-019 certification lifecycle management (tenant-scoped)`, `+ New Certification`

The navigation correctly routes to the existing Certifications panel without reloading the page.

### Polish needed

No critical issues. The implementation uses DOM button text matching as the navigation fallback, which works for the B2B shell. This approach is pragmatic for the current allowed-file boundary. A future polish unit may pass an explicit callback via App.tsx props if desirable.

## 8. Public Non-Exposure Verification

### `/api/public/b2b/suppliers`

API call: `GET /api/public/b2b/suppliers?limit=10` from authenticated tenant page context.

Result: HTTP 200, total: 3 suppliers.

Prohibited fields checked: `documentStoragePath`, `documentOriginalName`, `documentMimeType`, `documentSizeBytes`, `documentUploadedAt`, `signedUrl`, `certificate-documents`.

Found: NONE. Clean ✅

### `/b2b`

Public discovery page DOM scan.

Prohibited field values checked: `documentStoragePath`, `certificate-documents`, `SHRADDHA IND GST`, `signedUrl`.

Found: NONE. Clean ✅

### `/products` (public B2C)

`GET /api/public/b2c/products?limit=3`.

Prohibited fields checked: same list.

Found: NONE. Clean ✅

### Unauthenticated certification access

`GET /api/tenant/certifications` with no auth headers returned HTTP 401. Certificate document data requires authenticated tenant access. ✅

### Summary

| Check | Result |
|---|---|
| documentStoragePath exposed | NO ✅ |
| signed URL exposed | NO ✅ |
| bucket name exposed | NO ✅ |
| certificate filename exposed in public surfaces | NO ✅ |
| private document metadata in public surfaces | NO ✅ |

## 9. Validation Results

Command: `pnpm typecheck`

Result: PASS — no new type errors.

Command: `git diff --check`

Result: PASS with only CRLF replacement warnings (existing repo baseline).

No source files were modified in this unit.

## 10. Files Changed

Source files changed: none.

Governance files created/modified:

- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` — updated with FTR-SL-016B1A bounded completion entry.
- `governance/launch-readiness/FTR-SL-016B1A-B2B-COMPANY-PROFILE-CERTIFICATION-DOCUMENT-WIDGET-RUNTIME-VERIFY-01.md` — this artifact.

## 11. Residuals

- Upload/replace and remove/delete from Company Profile widget were not verified against a real mutation lane in this unit. These actions are wired to the same `certificationService` methods that were verified end-to-end in FTR-SL-016A1.
- If Paresh wants explicit widget-path upload/delete evidence, a future short verification unit could use the QA_CERTIFICATE_UPLOAD_TEST certification on the Shraddha session under explicit authorization.

## 12. Adjacent Findings

None in this unit.

## 13. Next Recommended Unit

`FTR-SL-016B2-B2B-COMPANY-PROFILE-RICH-FIELDS-API-SCHEMA-DESIGN-01`

Reason: FTR-SL-016B1 is now runtime-verified. The Certifications & Documents widget is live and working in Company Profile. The next design step is to plan the richer Company Profile field model (business description, website, location, capabilities narrative, public/private classification) and the API/schema/OpenAPI contract changes required before any richer field implementation.
