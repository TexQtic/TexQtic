# FTR-SL-013A Catalog Image Upload Supabase Storage Implementation

Unit: FTR-SL-013A-CATALOG-IMAGE-UPLOAD-SUPABASE-STORAGE-IMPLEMENTATION-01
Date: 2026-06-12
Status: BLOCKED_AT_PREREQUISITES
Final enum: FTR_SL_013A_BLOCKED_STORAGE_PREREQUISITES_MISSING

---

## 1) Objective

Implement local device image upload for tenant catalog/product images via Supabase Storage while preserving manual `imageUrl` fallback.

Execution outcome: blocked before implementation due missing prerequisite env var at Phase 1 gate.

---

## 2) Phase 0 Repo Preflight

Commands run:

- `git branch --show-current`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- `git status --porcelain=v1 -uno`
- `git log --oneline -20`

Observed:

- branch: `main`
- `HEAD`: `d4ed735c19cedda8b43da7595a5928be721d2f70`
- `origin/main`: `d4ed735c19cedda8b43da7595a5928be721d2f70`
- worktree clean before changes
- recent history includes `d4ed735c`

Preflight verdict: PASS.

---

## 3) Phase 1 Prerequisite Gate (Presence-Only, No Secret Values)

Method:

- Presence-only checks using variable-name regex against env files.
- No env values printed.
- No `.env` content dumped.

Results:

- `SUPABASE_URL present`: **true**
- `SUPABASE_SERVICE_ROLE_KEY present`: **true**
- `CATALOG_IMAGE_BUCKET present`: **false**
- `CATALOG_IMAGE_BUCKET equals catalog-images`: **false**

Bucket verification capability:

- Supabase CLI present: **false** (`supabase_cli_present=false`)
- Bucket exists (`catalog-images`): **unknown**
- Bucket public-read: **unknown**

Prerequisite gate verdict:

- **FAIL** — required variable `CATALOG_IMAGE_BUCKET` missing.

Per unit guardrails, implementation was not started.

---

## 4) Files Inspected

- `server/package.json`
- `package.json`
- `server/src/config/index.ts`
- `server/src/routes/tenant.ts`
- `server/src/index.ts`
- `server/src/middleware/auth.ts`
- `server/src/lib/database-context.ts`
- `services/catalogService.ts`
- `App.tsx`
- `governance/launch-readiness/FTR-SL-013-PRODUCT-IMAGE-UPLOAD-INFRASTRUCTURE-DESIGN.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

Key repo-truth confirmations:

- no upload route currently exists
- no multipart plugin currently registered
- no storage SDK currently installed
- `imageUrl` remains URL-only in catalog flow
- server config schema does not include storage env vars yet

---

## 5) What Was Not Performed (By Design)

Because prerequisite gate failed, the following were intentionally not performed:

- no dependency installation (`@supabase/supabase-js`, `@fastify/multipart`, `file-type`)
- no server config schema edits
- no storage service creation
- no upload route creation
- no multipart registration changes
- no frontend service/UI upload integration
- no tests/typecheck/lint for implementation
- no runtime upload verification

---

## 6) Non-Secret Setup Checklist For Paresh

Complete these before re-running implementation unit:

1. Add `CATALOG_IMAGE_BUCKET=catalog-images` to server env in all required environments.
2. Ensure `SUPABASE_URL` is present in server runtime env (already present locally by name check).
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` is present in server runtime env (already present locally by name check).
4. Create bucket `catalog-images` in Supabase Storage.
5. Configure bucket as public-read for object access URLs used by catalog `imageUrl`.
6. Confirm production env parity (server runtime + Vercel env) before implementation retry.

No secret values are required in this artifact.

---

## 7) Validation Run

- `git status --short` used to confirm exact docs-only changes.
- No implementation validation commands were run because no implementation files changed.

Local DB verification status: `LOCAL_DB_ENV_NOT_APPLICABLE`.

---

## 8) Runtime Verification Status

Not run. Upload route not implemented due missing prerequisites.

Safe public verification (`GET /api/public/b2b/suppliers`, `/b2b`) not required because no runtime behavior changed.

---

## 9) Safety Confirmations

- No real supplier/product data mutated.
- No production POST/PATCH/PUT/DELETE routes called.
- `/api/public/supplier/:slug` not called.
- `/supplier/:slug` not opened.
- `/products` architecture unchanged.
- No schema/migration changes.

---

## 10) Tracker Sync

Updated:

- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

Created:

- `governance/launch-readiness/FTR-SL-013A-CATALOG-IMAGE-UPLOAD-SUPABASE-STORAGE-IMPLEMENTATION-01.md`

---

## 11) Adjacent Findings

1. Supabase CLI is not available in this local workspace, limiting direct local bucket verification.

   Disposition: use Supabase dashboard or project-managed tooling to verify bucket existence/public-read before retry.

2. Storage env vars are not yet wired in server config schema (`server/src/config/index.ts`).

   Disposition: expected implementation step after prerequisites are satisfied.

---

## 12) Risks / Residuals

- Upload implementation remains pending until `CATALOG_IMAGE_BUCKET` is configured.
- Supplier onboarding remains URL-only for catalog image entry.

---

## 13) Recommended Next Unit

`FTR-SL-013A1-CATALOG-IMAGE-UPLOAD-IMPLEMENTATION-RETRY-01`

Run after prerequisite checklist is completed. That unit should execute full implementation, validation, and commit/push for upload infrastructure.
