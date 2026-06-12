# FTR-SL-015C2 B2B Profile Logo Upload Multipart Runtime Fix

Unit: FTR-SL-015C2-B2B-PROFILE-LOGO-UPLOAD-MULTIPART-RUNTIME-FIX-01
Date: 2026-06-12
Status: IMPLEMENTED / RUNTIME VERIFICATION PENDING DEPLOY

## 1. Final enum
FTR_SL_015C2_FIXED_ENTRYPOINT_MULTIPART_REGISTRATION_RUNTIME_VERIFICATION_PENDING_DEPLOY

## 2. Scope
Investigate runtime `415 Unsupported Media Type: multipart/form-data; boundary=...` during Company Profile logo upload and apply the smallest safe fix.

## 3. Repo-truth findings
1. Frontend upload construction is correct:
   - `services/tenantService.ts` uses `FormData` and does not manually set `Content-Type`.
2. Tenant upload route is correct:
   - `server/src/routes/tenant.ts` has `POST /api/tenant/profile/logo/upload` using `await request.file()`.
3. Local server bootstrap is correct:
   - `server/src/index.ts` imports/registers `@fastify/multipart`.
4. Deployed runtime reproduces 415 before route-level validation:
   - Non-mutating probes against both `/api/tenant/profile/logo/upload` and `/api/tenant/catalog/images/upload` return `415` with no domain error code.
5. Root cause identified:
   - Vercel serverless entrypoint `api/index.ts` creates a separate Fastify instance but did not register `@fastify/multipart`.

## 4. Change made
- Updated `api/index.ts` only:
  - Added import: `@fastify/multipart`
  - Registered multipart plugin with limits matching server bootstrap:
    - `fileSize: 5 * 1024 * 1024`
    - `files: 1`

No schema changes, no route contract changes, no frontend API contract changes.

## 5. Validation
Commands executed:
- `git diff --check` PASS
- `pnpm --dir server exec prisma validate` PASS (existing non-blocking warning retained)
- `pnpm --dir server typecheck` PASS
- `pnpm typecheck` PASS
- `pnpm --dir server lint` PASS with baseline warnings

## 6. Runtime verification status
- Non-mutating deployed probe still returns 415 (expected until this code is deployed).
- Safe lane exists (`QA B2B`), but post-fix runtime verification of upload flow is pending deploy of this commit.

## 7. Files changed in this unit
- `api/index.ts`
- `governance/launch-readiness/FTR-SL-015C2-B2B-PROFILE-LOGO-UPLOAD-MULTIPART-RUNTIME-FIX-01.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
