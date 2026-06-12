# FTR-SL-015C1 B2B Profile Logo Upload Integration

Unit: FTR-SL-015C1-B2B-PROFILE-LOGO-UPLOAD-INTEGRATION-01
Date: 2026-06-12
Status: IMPLEMENTED / RUNTIME PARITY PENDING

## 1. Final enum
FTR_SL_015C1_IMPLEMENTED_RUNTIME_PARITY_PENDING

## 2. Repo preflight
Commands executed:
- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -30

Observed:
- branch: main
- HEAD == origin/main at preflight
- worktree clean before edits
- required commits present in recent history:
  - 3046cc4e (FTR-SL-015)
  - 01897098 (FTR-SL-015A)
  - d45d4f20 (FTR-SL-015B)
  - eb6005db (FTR-SL-015C)
  - ec2907fa (FTR-SL-018)
  - d2a9f995 (FTR-SL-014A governance sync)

Preflight verdict: PASS

## 3. Files inspected
Backend / route truth:
- server/src/routes/tenant.ts
- server/src/services/storage/tenantLogo.storage.ts
- server/src/config/index.ts

Frontend / profile truth:
- components/Tenant/B2BProfileSettings.tsx
- components/Tenant/WhiteLabelSettings.tsx
- services/tenantService.ts
- services/tenantApiClient.ts
- services/apiClient.ts
- App.tsx
- layouts/Shells.tsx

## 4. Current backend logo route truth
Confirmed from repo truth:
1. POST /api/tenant/profile/logo/upload exists.
2. Route is tenant-auth protected (`tenantAuthMiddleware` + `databaseContextMiddleware`).
3. Route is not White Label gated.
4. Allowed image types remain JPG/JPEG, PNG, WEBP.
5. Max size remains 2 MB.
6. Magic-byte validation exists via `fileTypeFromBuffer` in tenantLogo storage service.
7. Upload response returns `data.logoUrl`.
8. PUT /api/tenant/branding persists `logoUrl`.
9. PUT /api/tenant/branding requires OWNER/ADMIN.
10. No schema migration required.

## 5. Current Company Profile UI truth
Confirmed from repo truth before this unit edit:
- `B2BProfileSettings.tsx` existed from FTR-SL-018.
- It rendered logo or placeholder but did not provide upload mutation.
- It used profile payload and `canEdit`.
- Company Profile nav entry is wired in B2B shell and routed from App.tsx.

## 6. Implementation summary
Implemented bounded frontend-only integration in normal B2B Company Profile:
- Updated `components/Tenant/B2BProfileSettings.tsx` only.
- Reused existing tenant service methods:
  - `uploadTenantLogo(file)`
  - `updateBranding({ logoUrl })`
- No backend route additions.
- No schema changes.
- No White Label entitlement or overlay changes.

## 7. Logo upload UI behavior
Added to normal Company Profile:
- Logo upload input appears only when `canEdit === true`.
- Input accepts JPG/PNG/WEBP.
- Client-side size gate enforces 2 MB max before upload call.
- Upload control is disabled during save/upload loading.
- Clear guidance text shown for file type and size.
- Uploading status message shown while request is in-flight.
- On success: shows success banner and updates profile logo preview immediately.
- On error: shows safe user-facing error text.
- Read-only users see preview/placeholder without active upload control.

## 8. Persistence flow
Implemented flow in Company Profile:
1. user selects file
2. call `uploadTenantLogo(file)` -> receives `logoUrl`
3. call `updateBranding({ logoUrl })`
4. update local profile state with persisted logo URL
5. preview updates immediately without requiring route-level refresh

## 9. White Label separation confirmation
Preserved:
- Basic profile identity + logo upload is now in normal Company Profile flow (B2B).
- WhiteLabelSettings remains separate and WL-focused for premium storefront/theming/domain controls.
- No White Label premium controls moved into normal Company Profile.

## 10. Validation results
Executed required validations:
- `git diff --check` -> PASS (line-ending warning only)
- `pnpm --dir server exec prisma validate` -> PASS (existing known warning retained)
- `pnpm --dir server typecheck` -> PASS
- `pnpm typecheck` -> PASS
- `pnpm --dir server lint` -> PASS with existing baseline warnings only (no new blocking errors)

Narrow test note:
- No dedicated narrow test file matching `B2BProfileSettings` logo upload flow was found in current suite; no additional focused unit test was run in this unit.

## 11. Runtime verification result or blocker
Runtime verification attempted in IDE browser.

Observed runtime state:
- Company Profile route is visible and opens.
- Runtime still renders legacy placeholder text:
  - "Logo upload will be enabled in the next media integration step."
- Upload control from this unit is not yet present in deployed/runtime UI.

Safety result:
- Active runtime lane is Shraddha Industries (real supplier context), not a QA/demo tenant lane.
- Per guardrails, no logo mutation was executed.

Runtime verdict:
- Implementation complete locally.
- Safe runtime verification blocked by runtime parity/deployment lag for this unit.

## 12. Confirmation no MEVITAS catalog/product mutation
Confirmed:
- no MEVITAS product/catalog mutation in this unit.

## 13. Confirmation no Shraddha and lt-b2b-001 mutation
Confirmed:
- no Shraddha mutation executed;
- no lt-b2b-001 mutation executed.

## 14. Profile GET not-called confirmation
Confirmed:
- `/api/public/supplier/:slug` was not called in this unit.

## 15. /products unchanged confirmation
Confirmed:
- `/products` unchanged.

## 16. Tracker/TLRH sync summary
Updated in this unit:
- governance/launch-readiness/FTR-SL-015C1-B2B-PROFILE-LOGO-UPLOAD-INTEGRATION-01.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md

## 17. Adjacent findings and disposition
1. FTR-SL-016-CERTIFICATE-UPLOAD-STORAGE-INVESTIGATION-DESIGN-IMPLEMENTATION-01
- Disposition: unchanged, remains separate follow-up.

2. FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-01
- Disposition: unchanged, remains separate follow-up.

3. FTR-SL-019-AUTH-FORGOT-PASSWORD-LOGIN-RECOVERY-INVESTIGATION-01
- Disposition: unchanged, remains separate follow-up.

4. FTR-SL-020-CONTROL-PLANE-SYNTHETIC-TEST-ACCOUNT-CLEANUP-ARCHIVE-INVESTIGATION-01
- Disposition: unchanged, remains separate follow-up.

5. MEVITAS owner-led product upload follow-up
- Disposition: unchanged, remains owner-led and separate.

6. FTR-SL-014B public projection diagnosis
- Disposition: unchanged, remains separate and not executed in this unit.

## 18. Risks/residuals
- Runtime parity lag blocks end-to-end logo-upload proof in deployed UI.
- Safe QA/demo editable tenant lane was not available in this check; active lane was real supplier and intentionally not mutated.
- Deploy/runtime verification rerun is required after this commit is reflected in shared runtime.

## 19. Commit hash and push status
Commit and push status captured after tracker sync in this unit.
(See final execution section in chat summary.)

## 20. Recommended next unit
FTR-SL-015C1A-B2B-PROFILE-LOGO-UPLOAD-RUNTIME-VERIFICATION-RETRY-01

Suggested scope:
- verify deployed runtime includes upload control in Company Profile
- run upload/persist proof only in approved QA/demo tenant OWNER/ADMIN lane
- avoid real supplier mutation
