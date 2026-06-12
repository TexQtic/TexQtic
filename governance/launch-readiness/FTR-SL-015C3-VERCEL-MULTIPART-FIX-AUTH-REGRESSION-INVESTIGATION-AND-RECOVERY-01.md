# FTR-SL-015C3 Vercel Multipart Fix Auth Regression Investigation and Recovery

Unit: FTR-SL-015C3-VERCEL-MULTIPART-FIX-AUTH-REGRESSION-INVESTIGATION-AND-RECOVERY-01
Date: 2026-06-12
Status: FIXED IN REPO / RUNTIME VERIFICATION PENDING DEPLOY

## 1. Final enum
FTR_SL_015C3_FIX_COMMITTED_AUTH_RUNTIME_VERIFICATION_PENDING_DEPLOY

## 2. Mandatory preflight
- branch: main
- HEAD at start: cbcbf88f45717826b62631d8130e2137d33d0efc
- origin/main at start: cbcbf88f45717826b62631d8130e2137d33d0efc
- worktree at start: clean
- required commits present in history:
  - e7912b2f135abaaf2d1dc64f5e52528ef0a5f853
  - cbcbf88f45717826b62631d8130e2137d33d0efc

## 3. C2 diff review
Commands executed:
- git show --stat cbcbf88f45717826b62631d8130e2137d33d0efc
- git show --name-only cbcbf88f45717826b62631d8130e2137d33d0efc

Observed:
- C2 touched only:
  - api/index.ts
  - governance/launch-readiness/FTR-SL-015C2-B2B-PROFILE-LOGO-UPLOAD-MULTIPART-RUNTIME-FIX-01.md
  - governance/launch-readiness/FUTURE-TODO-REGISTER.md
- No explicit auth route edits in C2.

## 4. Runtime/auth interpretation (safe)
Observed on deployed runtime from sign-in page context:
- /api/public/entry/resolve -> 500
- /api/auth/login -> 500
- /api/me -> 500

Interpretation:
- This is broader than a single tenant lookup/account mismatch.
- It indicates API bootstrap/serverless runtime failure, consistent with an entrypoint-level regression.
- Login UI messages (`Please enter your email address to identify your organisation.` / `No account found for this email...`) are client-side tenant-resolution states from AuthFlows and can appear when resolver calls fail.

## 5. Root cause finding
Repo/runtime truth supports that C2 introduced an auth-adjacent bootstrap risk in Vercel serverless entrypoint:
- C2 added `@fastify/multipart` import + registration in `api/index.ts`.
- Vercel runtime uses `api/index.ts` for all `/api/*` requests (`vercel.json` route mapping).
- Post-C2, deployed `/api/*` endpoints returned 500 in safe probes.

Given auth-critical outage and safety priority, immediate recovery is rollback of the C2 multipart entrypoint change.

## 6. Recovery path chosen
Path B — Roll back multipart entrypoint change.

Applied rollback in `api/index.ts`:
- removed `@fastify/multipart` import
- removed multipart plugin registration block

No route contract changes, no schema changes, no auth logic edits, no tenant data mutation.

## 7. Auth route/bootstrap truth
- Auth/public/control/tenant routes remain registered in `api/index.ts`.
- `vercel.json` still routes `/api/*` to `api/index.ts`.
- Login UI tenant-discovery flow still points to public resolver endpoint (`/api/public/entry/resolve` via authService).

## 8. Multipart status after recovery
- Multipart serverless entrypoint fix is rolled back.
- Therefore logo upload multipart behavior in deployed runtime remains unresolved and must be addressed in a separate, safer redesign unit after auth stability is confirmed.

## 9. Validation
Commands executed:
- git diff --check (PASS)
- pnpm --dir server exec prisma validate (PASS; existing non-blocking warning retained)
- pnpm --dir server typecheck (PASS)
- pnpm typecheck (PASS)
- pnpm --dir server lint (PASS with baseline warnings)

## 10. Mutation safety confirmations
- No tenant/product/logo mutation executed.
- No upload actions performed.
- No password reset flow executed.
- No direct SQL or Prisma mutation commands executed.
- /api/public/supplier/:slug not called.
- /products unchanged.

## 11. Files changed
- api/index.ts
- governance/launch-readiness/FTR-SL-015C3-VERCEL-MULTIPART-FIX-AUTH-REGRESSION-INVESTIGATION-AND-RECOVERY-01.md
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
