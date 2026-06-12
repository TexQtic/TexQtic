# FTR-SL-018 B2B Dashboard Profile Create/Update Nav Wiring Investigation and Implementation

Unit: FTR-SL-018-B2B-DASHBOARD-PROFILE-CREATE-UPDATE-NAV-WIRING-INVESTIGATION-AND-IMPLEMENTATION-01
Date: 2026-06-12
Status: IMPLEMENTED WITH RUNTIME BLOCKER

## 1. Final enum
FTR_SL_018_BLOCKED_PROFILE_REPO_TRUTH_OR_RUNTIME

## 2. Repo preflight
Commands executed:
- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -20

Observed before changes:
- branch: main
- local HEAD: eb6005dbd09d3914d3c91c8576a3753186b55bbd
- origin/main: eb6005dbd09d3914d3c91c8576a3753186b55bbd
- worktree: clean
- required history present, including:
  - 3046cc4e
  - 01897098
  - d45d4f20464ac210b7416ceabef91e54ed9f8a1d
  - eb6005dbd09d3914d3c91c8576a3753186b55bbd

Preflight verdict: PASS.

## 3. Files inspected
Backend and schema:
- server/prisma/schema.prisma
- server/src/routes/tenant.ts
- server/src/services/publicB2BProjection.service.ts

Frontend and routing:
- layouts/Shells.tsx
- App.tsx
- components/Tenant/WhiteLabelSettings.tsx
- services/tenantService.ts
- services/tenantApiClient.ts
- services/apiClient.ts
- runtime/sessionRuntimeDescriptor.ts

Governance:
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-015C-B2B-PROFILE-LOGO-VS-WL-BRANDING-ARCHITECTURE-ALIGNMENT-01.md

## 4. Backend profile CRUD truth
Repo truth before implementation:
- Existing tenant identity read: GET /api/me
- Existing branding write: PUT /api/tenant/branding
- Existing logo upload: POST /api/tenant/profile/logo/upload
- No dedicated normal company profile routes existed.

Schema truth relevant to this unit:
- Tenant.name exists
- organizations.legal_name exists
- TenantBranding.logoUrl exists
- No schema migration required for bounded profile page/edit foundation.

Implemented in this unit:
- GET /api/tenant/profile
  - tenantAuthMiddleware + databaseContextMiddleware
  - reads org identity and logoUrl
  - returns normalized profile payload with canEdit
- PUT /api/tenant/profile
  - tenantAuthMiddleware + databaseContextMiddleware
  - OWNER or ADMIN required
  - updates organizations.legal_name
  - keeps tenants.name aligned for compatibility
  - returns normalized profile payload
  - writes audit log with action profile.updated

## 5. Frontend profile/nav truth
Repo truth before implementation:
- No normal B2B profile page component existed.
- B2B sidebar/menu in layouts/Shells.tsx had no Company Profile entry.
- Non-WL SETTINGS surface in App.tsx was read-only continuity cards.
- WhiteLabelSettings contained logo controls but was WL-focused and gated by WL capability.

Implemented in this unit:
- Added Company Profile nav wiring in B2B shell desktop + mobile menu.
- Added explicit navigation callback from App shell contract to SETTINGS.
- Replaced non-WL read-only SETTINGS panel with a normal editable company profile surface.

## 6. Implementation summary
Implemented bounded scope foundation:
- New component:
  - components/Tenant/B2BProfileSettings.tsx
- Nav wiring:
  - layouts/Shells.tsx
  - App.tsx tenant shell contract callback
- Profile data path:
  - services/tenantService.ts
  - server/src/routes/tenant.ts

Key behaviors:
- Company Profile page title and nav label are Company Profile.
- Reads profile identity from GET /api/tenant/profile.
- Shows current logo or placeholder only (no upload mutation in this unit).
- Allows display name edit/save for OWNER and ADMIN only.
- Displays tenant identity summary and baseline completeness indicator.

## 7. Fields exposed and editable
Exposed:
- displayName
- slug
- tenantType
- status
- plan
- primarySegmentKey
- secondarySegmentKeys
- rolePositionKeys
- logoUrl
- canEdit

Editable in this unit:
- displayName only

Non-editable in this unit:
- logo upload and media mutation paths
- WL branding controls (themeJson, domains, storefront settings)

## 8. Authorization model
Read:
- GET /api/tenant/profile for authenticated tenant users with tenant auth context

Edit:
- PUT /api/tenant/profile restricted to OWNER or ADMIN

Safety:
- orgId resolved from dbContext only
- no tenantId/body-sourced tenant targeting
- tenant boundary preserved via context + RLS patterns

## 9. White Label separation confirmation
Confirmed:
- Basic Company Profile is now a normal B2B tenant dashboard surface.
- WL-only value remains preserved:
  - WhiteLabelSettings and WL overlay path
  - advanced theme/domain/storefront controls
- No WL entitlement gates were weakened.

## 10. Validation results
Commands run:
- git diff --check
  - PASS
- pnpm --dir server exec prisma validate
  - PASS with existing known warning about SetNull referential action
- pnpm --dir server typecheck
  - PASS
- pnpm typecheck
  - PASS
- pnpm --dir server lint
  - PASS with baseline warnings only, no new blocking errors

## 11. Runtime verification result or blocker
Runtime lane attempted on shared QA page:
- URL: https://app.texqtic.com/b2b
- Session label visible: QA B2B
- Opened workspace navigation menu successfully

Observed blocker:
- Runtime nav still did not include Company Profile.
- Shared QA page still reflected pre-change deployed UI state.
- This prevents safe verification of newly implemented local changes within the attached runtime lane.

Runtime verdict for this unit:
- Implementation complete locally
- Safe runtime verification blocked by environment parity/deployment mismatch

## 12. Confirmation MEVITAS was not mutated
Confirmed: no MEVITAS mutation performed.

## 13. Confirmation Shraddha and lt-b2b-001 were not mutated
Confirmed: no Shraddha mutation and no lt-b2b-001 mutation performed.

## 14. Profile GET not-called confirmation
Confirmed: /api/public/supplier/:slug was not called.

## 15. /products unchanged confirmation
Confirmed: /products was not changed.

## 16. Tracker/TLRH sync summary
Updated:
- governance/launch-readiness/FTR-SL-018-B2B-DASHBOARD-PROFILE-CREATE-UPDATE-NAV-WIRING-INVESTIGATION-AND-IMPLEMENTATION-01.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md

## 17. Adjacent findings and disposition
1) FTR-SL-015C1-B2B-PROFILE-LOGO-UPLOAD-INTEGRATION-01
- Disposition: remains separate immediate follow-up, now unblocked in code architecture.

2) FTR-SL-016-CERTIFICATE-UPLOAD-STORAGE-INVESTIGATION-DESIGN-IMPLEMENTATION-01
- Disposition: separate, unchanged.

3) FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-01
- Disposition: separate, unchanged.

4) FTR-SL-019-AUTH-FORGOT-PASSWORD-LOGIN-RECOVERY-INVESTIGATION-01
- Disposition: separate, unchanged.

5) FTR-SL-020-CONTROL-PLANE-SYNTHETIC-TEST-ACCOUNT-CLEANUP-ARCHIVE-INVESTIGATION-01
- Disposition: separate, unchanged.

6) MEVITAS owner activation/catalog completion
- Disposition: separate, unchanged.

## 18. Risks/residuals
- Runtime verification blocker remains until attached QA runtime reflects this commit.
- Profile edit currently covers display name only, by design and scope safety.
- Logo upload integration intentionally deferred to FTR-SL-015C1.

## 19. Commit hash and push status
Commit and push executed in this unit after tracker/report sync.
See final section in chat response for exact commit/push status commands and output.

## 20. Recommended next unit
FTR-SL-015C1-B2B-PROFILE-LOGO-UPLOAD-INTEGRATION-01

Recommended scope for next unit:
- Enable logo upload control inside Company Profile page
- Reuse existing backend route POST /api/tenant/profile/logo/upload
- Persist via PUT /api/tenant/branding
- Perform safe runtime verification when attached QA runtime reflects deployed code
