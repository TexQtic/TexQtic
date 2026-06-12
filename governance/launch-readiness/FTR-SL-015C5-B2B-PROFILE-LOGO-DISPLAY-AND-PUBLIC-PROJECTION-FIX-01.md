# FTR-SL-015C5 B2B Profile Logo Display and Public Projection Fix

Unit: FTR-SL-015C5-B2B-PROFILE-LOGO-DISPLAY-AND-PUBLIC-PROJECTION-FIX-01
Date: 2026-06-12
Status: FIXED IN REPO / RUNTIME VERIFICATION PENDING DEPLOY

## 1. Final enum
FTR_SL_015C5_FIX_COMMITTED_RUNTIME_VERIFICATION_PENDING_DEPLOY

## 2. Repo preflight
Commands run:
- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -50

Observed:
- branch: main
- HEAD and origin/main at start: bd1be05895dd60886ee513144229695a5454f938
- worktree at start: clean
- required commits present in log:
  - e7912b2f135abaaf2d1dc64f5e52528ef0a5f853
  - dcffb7f60a672c76e2ebfe8131129b24bd8e2f38
  - bd1be05895dd60886ee513144229695a5454f938

## 3. Files inspected
- server/src/routes/tenant.ts
- server/src/services/storage/tenantLogo.storage.ts
- server/src/config/index.ts
- services/tenantService.ts
- components/Tenant/B2BProfileSettings.tsx
- server/src/services/publicB2BProjection.service.ts
- server/src/routes/public.ts
- services/publicB2BService.ts
- components/Public/B2BDiscovery.tsx
- config/publicReferenceB2B.ts
- server/src/__tests__/public-b2b-projection.unit.test.ts
- server/src/__tests__/public-b2b-supplier-profile.unit.test.ts
- tests/frontend/public-b2b-discovery-regression.test.tsx

## 4. Manual production verification interpretation
Paresh verification indicates post-C4 upload succeeds and parser 415 is no longer the primary blocker. Remaining issue is display/projection chain: dashboard visual rendering and public B2B supplier card projection/rendering.

## 5. Storage URL truth
- Upload route returns absolute logo URL via public storage URL:
  - POST /api/tenant/profile/logo/upload -> data.logoUrl
- URL generation source:
  - supabase.storage.from(bucket).getPublicUrl(filePath)
- Object path is org-scoped:
  - {orgId}/logo/{uuid}.{ext}
- URL is absolute, not relative.
- Public URL assumes bucket is publicly readable.
- If not readable, img would fail in browser (broken image/fallback) though upload route could still return URL.
- Dashboard uses img src={resolvedLogoUrl} directly (no URL transform).

## 6. Branding persistence truth
- updateBranding({ logoUrl }) calls PUT /api/tenant/branding.
- Route requires tenant auth + dbContext and OWNER/ADMIN role.
- Route persists via tenantBranding.upsert scoped by dbContext.orgId.
- Response includes branding.logoUrl.
- themeJson does not overwrite logoUrl unless explicitly passed null/undefined.
- No truncation/sanitization logic observed for logoUrl other than URL validation.

## 7. Company Profile read/render truth
- GET /api/tenant/profile already selects branding.logoUrl from tenantBranding.
- B2BProfileSettings local state updates logoUrl after upload + branding update.
- Component renders img src correctly.
- Display issue risk was visual crop due fixed square object-cover style.
- Refresh path should preserve logo if persisted since GET /api/tenant/profile includes logoUrl.

## 8. Public B2B projection truth
Before fix:
- list projection and by-slug projection did not include logoUrl in payload model.
- /api/public/b2b/suppliers result had no logoUrl field (runtime-safe probe confirmed field absent).

After fix:
- public projection now reads tenantBranding.logoUrl and includes logoUrl in output entry/profile contract.
- frontend service contract updated to expect logoUrl.

## 9. Public aggregator/card render truth
Before fix:
- Supplier card rendered no supplier logo surface.

After fix:
- Card now renders supplier logo when logoUrl exists.
- Fallback badge shown when logoUrl is null.
- Existing offering and trust/fallback behavior preserved.

## 10. Root cause
Primary root cause for public aggregator was a projection + UI omission:
- backend public B2B projection omitted logoUrl;
- public card had no supplier logo rendering.

Secondary dashboard issue was likely rendering fidelity (hard crop) rather than persistence/read omission.

## 11. Implementation summary
Code changes:
- server/src/services/publicB2BProjection.service.ts
  - added logoUrl to PublicB2BSupplierEntry
  - added tenantBranding fetch for list projection
  - added tenantBranding fetch for by-slug projection
- services/publicB2BService.ts
  - added logoUrl to PublicB2BSupplierEntry/PublicB2BSupplierProfile interfaces
- components/Public/B2BDiscovery.tsx
  - added supplier logo render block (img + fallback)
- components/Tenant/B2BProfileSettings.tsx
  - switched company logo preview to object-contain with wider frame to avoid hard crop
- config/publicReferenceB2B.ts
  - added logoUrl to reference fixtures (null)

Narrow tests updated:
- server/src/__tests__/public-b2b-projection.unit.test.ts
- server/src/__tests__/public-b2b-supplier-profile.unit.test.ts
- server/src/__tests__/public-buyer-inquiry.unit.test.ts (fixture contract alignment)
- tests/frontend/public-b2b-discovery-regression.test.tsx (fixture alignment + logo render assertion)

## 12. Validation results
Required commands:
- git diff --check -> PASS (warnings only about line-ending normalization messages; no diff-check errors)
- pnpm --dir server exec prisma validate -> PASS (existing non-blocking warning retained)
- pnpm --dir server typecheck -> PASS
- pnpm typecheck -> PASS
- pnpm --dir server lint -> PASS with existing baseline warnings only

Narrow tests:
- pnpm --dir server exec vitest run src/__tests__/public-b2b-projection.unit.test.ts src/__tests__/public-b2b-supplier-profile.unit.test.ts -> PASS (22/22)
- pnpm exec vitest run tests/frontend/public-b2b-discovery-regression.test.tsx -> BLOCKED in this CLI context (document is not defined; no jsdom env loaded by direct command invocation)

## 13. Runtime verification result or blocker
- Safe read-only probe on /api/public/b2b/suppliers before deploy showed no logoUrl field in current deployed payload.
- Authenticated dashboard runtime verification for tenant profile/logo rendering is blocked in current shared page context (public register context / unauthenticated fetch state for tenant profile probe).
- Runtime verification of fixed behavior requires deployed build + authenticated tenant context.

## 14. Confirmation no product/catalog mutation
Confirmed. No product/catalog create/update/delete actions executed.

## 15. Confirmation no new real supplier logo upload unless explicitly authorized
Confirmed. No new real supplier logo upload/re-upload executed.

## 16. Confirmation no MEVITAS product/catalog mutation
Confirmed. No MEVITAS product/catalog mutation executed.

## 17. Confirmation no lt-b2b-001 mutation
Confirmed. No lt-b2b-001 mutation executed.

## 18. Profile GET not-called confirmation
Confirmed for prohibited profile-read surface: /api/public/supplier/:slug was not called in this unit.

## 19. /products unchanged confirmation
Confirmed. /products surface was not changed.

## 20. Tracker/TLRH sync summary
- Added this C5 artifact.
- Updated governance/launch-readiness/FUTURE-TODO-REGISTER.md with latest bounded C5 update.
- No NEXT-ACTION.md / OPEN-SET.md / Layer 0 modifications.

## 21. Adjacent findings and disposition
- FTR-SL-016 certificate upload: not touched, remains separate.
- FTR-SL-017 catalog visibility control: not touched, remains separate.
- FTR-SL-019 forgot-password: not touched, remains separate.
- FTR-SL-020 synthetic cleanup: not touched, remains separate.
- FTR-SL-021 nav parity: not touched, remains separate.
- MEVITAS owner-led upload follow-up: not touched.
- FTR-SL-014B public projection diagnosis remains separate; C5 addressed logo projection specifically.

## 22. Risks/residuals
- Deployed runtime still needs post-deploy verification in authenticated tenant context and public /b2b UI.
- If storage bucket public-read policy is inconsistent, logoUrl may still fail in browser despite projection correctness.
- Frontend logo regression test requires jsdom-enabled execution path in this environment.

## 23. Commit hash and push status
- Pending at authoring time; captured in final handoff after commit/push.

## 24. Recommended next unit
FTR-SL-015C5A-B2B-LOGO-DISPLAY-POST-DEPLOY-RUNTIME-VERIFICATION-01
- Verify Company Profile logo display after refresh/reopen
- Verify /api/public/b2b/suppliers includes logoUrl in deployed payload
- Verify public B2B aggregator card renders logo/fallback without mutation
