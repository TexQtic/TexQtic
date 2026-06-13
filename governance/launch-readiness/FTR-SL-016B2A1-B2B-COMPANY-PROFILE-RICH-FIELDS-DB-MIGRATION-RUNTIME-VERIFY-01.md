# FTR-SL-016B2A1 - B2B Company Profile Rich Fields DB Migration + Runtime Verify

## 1. Unit Identity

- **Unit ID:** `FTR-SL-016B2A1-B2B-COMPANY-PROFILE-RICH-FIELDS-DB-MIGRATION-RUNTIME-VERIFY-01`
- **Date:** 2026-06-13
- **Mode:** bounded remote DB migration / runtime verification / governance closeout
- **Base implementation:** `FTR-SL-016B2A-B2B-COMPANY-PROFILE-RICH-FIELDS-SCHEMA-API-IMPLEMENTATION-01`
- **Base commit:** `4ae699e1a97eb5d353961154ccdaf2c1608b7d48`
- **Final enum:** `FTR_SL_016B2A1_BLOCKED_RUNTIME_PROFILE_API_FAILED`

## 2. Repo Preflight

- `git branch --show-current` -> `main`
- `git rev-parse HEAD` -> `4ae699e1a97eb5d353961154ccdaf2c1608b7d48`
- `git status --short` -> clean
- `git diff --name-only` -> clean
- `git log --oneline -10` -> HEAD and `origin/main` aligned on `4ae699e1`
- `git remote -v` -> `origin https://github.com/TexQtic/TexQtic.git` for fetch and push

Conclusion: repo preflight PASS. Branch, HEAD, origin sync, and initial worktree all matched the unit requirements.

## 3. Repo-Truth Inspection

Inspected:

- `server/prisma/schema.prisma`
- `server/prisma/migrations/pr-ftr-sl-016b2a-tenant-profile-details.sql`
- `server/src/routes/tenant.ts`
- `services/tenantService.ts`
- `shared/contracts/openapi.tenant.json`
- `governance/launch-readiness/FTR-SL-016B2A-B2B-COMPANY-PROFILE-RICH-FIELDS-SCHEMA-API-IMPLEMENTATION-01.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

Confirmed repo truth:

- Migration file exists and remains narrowly scoped to `tenant_profile_details`.
- Prisma model `TenantProfileDetail` and `Tenant.profileDetail` relation are present.
- `GET /api/tenant/profile` selects and returns the rich fields plus GST/publication read-only metadata.
- `PUT /api/tenant/profile` validates mutable fields, upserts `tenantProfileDetail`, and rejects `gstin`, `gstVerified`, `gstVerificationStatus`, `publicationPosture`, and `publicEligibilityPosture` via `z.never()`.
- `services/tenantService.ts` includes the rich response fields and update request shape.
- `shared/contracts/openapi.tenant.json` includes `GET` and `PUT` for `/api/tenant/profile` with the rich-field contract.
- No public projection files were part of the B2A carry-forward change set.

## 4. Migration Safety Review

Reviewed file: `server/prisma/migrations/pr-ftr-sl-016b2a-tenant-profile-details.sql`

Plain-language review:

- Creates `public.tenant_profile_details` if it does not already exist.
- Adds nullable tenant-managed fields for tagline, description, website, business email, phone, phone-public flag, city, state, company-size band, capacity band, CIN, Udyam, IEC, plus timestamps.
- Adds a foreign key to `public.tenants(id)` with `ON DELETE CASCADE` and a unique `tenant_id` constraint.
- Adds a description length check capped at 2000 characters.
- Adds enum-style check constraints for `company_size_band` and `capacity_band`.
- Adds a non-unique supporting index on `(tenant_id, updated_at desc)`.
- Enables and forces RLS on the new table.
- Recreates tenant-scoped select/insert/update policies, a bypass-only delete policy, and a restrictive org-context guard policy.
- Grants schema usage and table `SELECT/INSERT/UPDATE/DELETE` to `texqtic_app`.

Safety assessment:

- Idempotent for table/index creation via `IF NOT EXISTS`.
- Policy recreation is safe/idempotent via `DROP POLICY IF EXISTS` followed by `CREATE POLICY`.
- No `DROP TABLE`, `ALTER COLUMN`, `DELETE`, `UPDATE`, or destructive data rewrite is present.
- No existing tenant data is modified by the SQL.

Conclusion: SQL safety review PASS.

## 5. DB Apply Governance And Rollback Plan

Apply method used:

- Repo-configured `psql` lane using the existing TexQtic remote DB connection from `server/.env`
- `DATABASE_URL` and `DIRECT_DATABASE_URL` both resolved to a Supabase session-pooler endpoint
- SQL applied with `ON_ERROR_STOP=1`

Secrets posture:

- No DB URL, password, service key, JWT, cookie, or connection string was printed.
- Only redacted host/port/database summaries and safe SQL metadata outputs were recorded.

Rollback plan recorded before apply:

- `DROP TABLE IF EXISTS public.tenant_profile_details CASCADE;`

Rollback guardrails:

- Rollback is allowed only if apply fails partway and leaves a broken partial object, or if post-apply verification proves the object/policies materially wrong before runtime data is written.
- Because runtime writes did not succeed in this unit and no `tenant_profile_details` rows were committed, rollback remained theoretically available, but it was not needed because the migration itself applied cleanly.

## 6. Remote DB Pre-Check / Apply / Post-Apply Proof

### 6.1 Pre-check

Read-only pre-checks before apply showed the expected pre-migration state:

- `to_regclass('public.tenant_profile_details')` returned null / empty.
- `information_schema.columns` returned 0 rows.
- `pg_class` / `pg_constraint` relation-based queries failed with `relation does not exist`, which is expected pre-apply.
- `pg_policies` returned 0 rows for the target table.

### 6.2 Apply result

Applied exactly:

- `server/prisma/migrations/pr-ftr-sl-016b2a-tenant-profile-details.sql`

Safe apply output summary:

- `CREATE TABLE`
- `CREATE INDEX`
- `ALTER TABLE`
- `ALTER TABLE`
- expected `DROP POLICY` notices for policies that did not yet exist
- `CREATE POLICY` x5
- `GRANT`
- `GRANT`

No SQL error occurred; `ON_ERROR_STOP=1` did not abort.

### 6.3 Post-apply proof

Verified after apply:

- table exists: `tenant_profile_details`
- columns verified: `id`, `tenant_id`, `tagline`, `description`, `website_url`, `business_email`, `phone`, `phone_public`, `city`, `state`, `company_size_band`, `capacity_band`, `cin_number`, `udyam_number`, `iec_number`, `created_at`, `updated_at`
- constraints verified:
   - primary key on `id`
   - unique key on `tenant_id`
   - FK `tenant_id -> tenants(id) ON DELETE CASCADE`
   - description length check
   - company-size band check
   - capacity-band check
- indexes verified:
   - `tenant_profile_details_pkey`
   - `tenant_profile_details_tenant_id_key`
   - `idx_tenant_profile_details_tenant_updated`
- RLS verified: `relrowsecurity = true`, `relforcerowsecurity = true`
- policies verified:
   - `tenant_profile_details_select_unified`
   - `tenant_profile_details_insert_unified`
   - `tenant_profile_details_update_unified`
   - `tenant_profile_details_delete_unified`
   - `tenant_profile_details_guard_policy`
- grants verified for `texqtic_app`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`

Additional bounded DB truth:

- `qa-b2b` and `shraddha-industries` both have matching `tenants` and `organizations` rows.
- Neither tenant had a committed `tenant_profile_details` row after the failed runtime PUT attempts.
- Both tenants have exactly one `gst_verifications` row, so duplicate GST rows are not the cause of the observed runtime failures.

## 7. Runtime Verification

### 7.1 Session and GET results

Tenant sessions used:

- Shraddha Industries shared tenant OWNER session
- QA B2B shared tenant OWNER session (`qa.b2b@texqtic.com`)

Observed results after DB apply:

- unauthenticated `GET /api/tenant/profile` -> `401 UNAUTHORIZED`
- unauthenticated `PUT /api/tenant/profile` -> `401 UNAUTHORIZED`
- authenticated Shraddha `GET /api/tenant/profile` -> `200 success=true`
- authenticated QA B2B `GET /api/tenant/profile` -> `500 INTERNAL_ERROR`

Shraddha live GET proof after DB apply included the full rich-field shape:

- `tagline`
- `description`
- `websiteUrl`
- `businessEmail`
- `phone`
- `phonePublic`
- `city`
- `state`
- `companySizeBand`
- `capacityBand`
- `cinNumber`
- `udyamNumber`
- `iecNumber`
- `gstin` (masked in reporting)
- `gstVerified`
- `gstVerificationStatus`
- `publicationPosture`
- `publicEligibilityPosture`

Observed Shraddha sample:

- `displayName = Shraddha Industries`
- `gstin` present and masked in reporting
- `publicationPosture = B2B_PUBLIC`
- `publicEligibilityPosture = PUBLICATION_ELIGIBLE`
- rich profile fields currently null on first read

Interpretation:

- DB apply fixed the live GET path for Shraddha.
- QA B2B still fails on live GET with `500`, indicating tenant-specific or runtime-path-specific residual failure after migration.

### 7.2 Read-only mutation rejection

Verified against the live authenticated route using a rejected body only:

- `PUT /api/tenant/profile` with `{ "gstin": "SHOULD_NOT_BE_ACCEPTED" }` -> `400 VALIDATION_ERROR`
- Validation detail showed `Expected never, received string` on `gstin`.

Conclusion: read-only GST/publication mutation guard is live after DB apply.

### 7.3 Validation checks verified live

Verified live with non-persisting invalid payloads:

- invalid `websiteUrl` -> `400 VALIDATION_ERROR`
- invalid `businessEmail` -> `400 VALIDATION_ERROR`
- invalid `companySizeBand` -> `400 VALIDATION_ERROR`
- `description` length 2001 -> `400 VALIDATION_ERROR`

Additional check verified after resume:

- invalid `capacityBand` -> `400 VALIDATION_ERROR`

These checks confirm the request-schema validation layer is active before the write path.

### 7.4 Valid PUT runtime failure

Attempted harmless valid PUT payloads:

- QA B2B exact harmless verification payload
- Shraddha minimal probe payload `{ "tagline": "probe-only" }` only to distinguish QA-only failure from route-wide failure

Observed results:

- QA B2B `PUT /api/tenant/profile` -> `500 INTERNAL_ERROR`
- Shraddha `PUT /api/tenant/profile` -> `500 INTERNAL_ERROR`

Additional bounded truth:

- direct rollback-only SQL reproduction of the `tenant_profile_details` insert/upsert under `SET LOCAL ROLE texqtic_app` plus canonical `app.org_id` context succeeded (`INSERT 0 1`, then `ROLLBACK`)
- failed runtime PUT attempts did not commit any `tenant_profile_details` row for either tenant

Interpretation:

- the post-migration runtime failure is not caused by missing table, missing grants, or basic RLS inability to insert into `tenant_profile_details`
- a real application/runtime bug remains in the successful PUT path
- per prompt guardrails, source files were not edited in this unit after discovering the runtime bug

### 7.5 Checks not completed because of runtime bug

Not completed:

- successful persisted PUT proof
- follow-up GET readback after a successful write
- non-OWNER/ADMIN `403` proof (no safe lower-role session provided, and the route-level OWNER/ADMIN guard remains confirmed by repo truth)
- focused DB-backed integration test restoration/execution

## 8. Public Non-Exposure Verification

Verified after DB apply:

- `GET /api/public/b2b/suppliers` -> `200 success=true`
- First returned supplier item keys remained limited to public-safe fields: `slug`, `legalName`, `logoUrl`, `orgType`, `jurisdiction`, `certificationCount`, `certificationTypes`, `hasTraceabilityEvidence`, `taxonomy`, `offeringPreview`, `publicationPosture`, `eligibilityPosture`.
- No forbidden rich-profile/private keys were present in the observed public supplier payload: `businessEmail`, `phone`, `cinNumber`, `udyamNumber`, `iecNumber`, `tagline`, `description`, `websiteUrl`, `city`, `state`, `capacityBand`, `companySizeBand`, storage-path, bucket, or signed-URL fields.
- `/b2b` remained on the public supplier discovery surface with no observed rich-profile exposure.
- `/products` public surface did not show contact identifiers, CIN/Udyam/IEC, signed-URL text, or storage-path/bucket text during the bounded read-only probe.

Additional `/products` verification after resume:

- no business email / phone / CIN / Udyam / IEC exposure
- no signed URL pattern
- no certificate bucket/storage-path exposure

Conclusion: no public exposure regression was observed after DB apply.

## 9. Validation Commands

Validation to run after governance closeout update:

- `pnpm --dir server exec prisma validate`
- `pnpm --dir server exec prisma generate`
- `pnpm --dir server typecheck`
- `pnpm typecheck`
- `git diff --check`

## 10. Residuals

- Rich-profile successful PUT path remains broken at runtime (`500 INTERNAL_ERROR`).
- QA B2B authenticated GET remains broken at runtime (`500 INTERNAL_ERROR`) even after DB apply.
- Valid rich-field persistence remains unverified because of the runtime failure.
- Non-OWNER/ADMIN permission verification remains unverified due missing safe lower-role session.
- Focused DB-backed test remains deferred; source/test edits were not allowed once the runtime bug was confirmed.

## 11. Next Recommended Unit

- Open a bounded follow-up bug unit to diagnose and fix the post-migration `PUT /api/tenant/profile` runtime failure before any UI expansion unit proceeds.