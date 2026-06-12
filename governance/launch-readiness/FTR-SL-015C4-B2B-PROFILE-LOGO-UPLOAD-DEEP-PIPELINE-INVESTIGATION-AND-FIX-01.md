# FTR-SL-015C4 B2B Profile Logo Upload Deep Pipeline Investigation and Fix

Unit: FTR-SL-015C4-B2B-PROFILE-LOGO-UPLOAD-DEEP-PIPELINE-INVESTIGATION-AND-FIX-01
Date: 2026-06-12
Status: FIXED IN REPO / RUNTIME VERIFICATION PENDING DEPLOY

## 1. Final enum
FTR_SL_015C4_FIXED_TENANT_PLUGIN_LOCAL_MULTIPART_REGISTRATION_RUNTIME_VERIFICATION_PENDING_DEPLOY

## 2. Mandatory preflight
- branch: main
- HEAD at start of implementation: dcffb7f60a672c76e2ebfe8131129b24bd8e2f38
- origin/main at start of implementation: dcffb7f60a672c76e2ebfe8131129b24bd8e2f38
- worktree at start of implementation: clean
- required prior commits in chain were previously confirmed present: e7912b2f, cbcbf88f, dcffb7f6

## 3. C4 deep investigation summary
A) Frontend upload transport truth
- `services/tenantService.ts` uploads with `FormData` and field `file`.
- No manual multipart `Content-Type` override is set.
- Upload path bypasses JSON wrapper logic in `services/apiClient.ts` as expected.

B) Backend route/parser truth
- Both target routes in `server/src/routes/tenant.ts` call `await request.file()`:
  - `POST /api/tenant/catalog/images/upload`
  - `POST /api/tenant/profile/logo/upload`
- These routes require multipart parser availability at runtime.

C) Storage/config truth
- Logo and catalog uploads both depend on storage env presence:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CATALOG_IMAGE_BUCKET`
- Missing storage env would produce storage errors, not parser-level 415.

D) Branding persistence chain truth
- Logo persistence remains via `PUT /api/tenant/branding` and `tenantBranding.upsert`.
- Profile read path returns `branding.logoUrl` in `GET /api/tenant/profile`.

E) Auth safety gate truth
- Existing C4 auth-gate probes (performed before implementation) indicated auth path health (`/api/public/entry/resolve` 200 and `/api/me` 401 unauthenticated), so fix strategy stayed auth-preserving and avoided global serverless entrypoint mutation.

## 4. Root cause conclusion
The upload routes depend on `request.file()` but multipart registration was not guaranteed in the runtime-safe location after C3 rollback of `api/index.ts` entrypoint changes.

A global serverless entrypoint registration had already shown high blast-radius risk in C2/C3. The safest corrective path is route-plugin-local multipart registration in the tenant routes plugin, so upload parser availability follows the same module boundary as the upload routes without reintroducing auth-wide entrypoint risk.

## 5. Implemented fix (minimal)
1) Added multipart plugin registration inside tenant plugin initialization in `server/src/routes/tenant.ts`.
- Registers `@fastify/multipart` with existing limits parity:
  - `fileSize: 5 * 1024 * 1024`
  - `files: 1`

2) Removed multipart plugin registration from root server bootstrap `server/src/index.ts`.
- Prevents duplicate registration drift and keeps parser ownership with tenant upload route module.

No changes to auth routes, auth middleware, control-plane routes, public routes, schema, migrations, or storage write logic.

## 6. Validation evidence
Commands executed:
- `git diff --check` (PASS; no output)
- `pnpm -C server exec tsc --noEmit` (PASS; no output)
- `pnpm -C server exec eslint src/index.ts src/routes/tenant.ts` (PASS with existing baseline warnings in tenant.ts, no new errors)
- `pnpm -C server exec prisma validate` (PASS; existing non-blocking schema warning retained)

## 7. Mutation and safety confirmations
- No production tenant/profile/logo/catalog mutation executed in this unit.
- No direct SQL or Prisma mutation command executed.
- No `/api/public/supplier/:slug` production profile-view call executed.
- `/products` untouched.
- Auth/public/control bootstrap files outside scoped fix were not modified.

## 8. Files changed in this unit
- `server/src/routes/tenant.ts`
- `server/src/index.ts`
- `governance/launch-readiness/FTR-SL-015C4-B2B-PROFILE-LOGO-UPLOAD-DEEP-PIPELINE-INVESTIGATION-AND-FIX-01.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
