# FTR-SL-016B2A1 - B2B Company Profile Rich Fields DB Migration + Runtime Verify

## 1. Unit Identity

- **Unit ID:** `FTR-SL-016B2A1-B2B-COMPANY-PROFILE-RICH-FIELDS-DB-MIGRATION-RUNTIME-VERIFY-01`
- **Date:** 2026-06-13
- **Mode:** bounded remote DB migration / runtime verification / governance closeout
- **Base implementation:** `FTR-SL-016B2A-B2B-COMPANY-PROFILE-RICH-FIELDS-SCHEMA-API-IMPLEMENTATION-01`
- **Base commit:** `4ae699e1a97eb5d353961154ccdaf2c1608b7d48`
- **Final enum:** `FTR_SL_016B2A1_BLOCKED_MANUAL_DB_MIGRATION_REQUIRED`

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

## 5. Remote DB Execution Blocker

Attempted lawful remote execution path discovery without secret exposure or command drift.

Observed constraints:

- The tracked migration is a standalone SQL file, not a Prisma migration directory, so `prisma migrate deploy` / `db:migrate:tracked` would not apply this file automatically.
- Activated PostgreSQL connection tools and ran `pgsql_list_connection_profiles`.
- Result: no configured PostgreSQL connection profiles were available in this workspace.
- The unit's approved shell command list does not authorize ad hoc `psql` execution from the terminal.

Result:

- Remote pre-check could not be performed.
- Migration could not be applied from this environment without leaving the approved command set.
- Post-migration verification could not be truthfully completed.

## 6. Manual Action Block Required

Manual DB execution is required for this unit to continue truthfully.

Required manual action for Paresh:

1. Apply `server/prisma/migrations/pr-ftr-sl-016b2a-tenant-profile-details.sql` against the authoritative Supabase/Postgres database using the approved TexQtic direct-SQL lane.
2. After successful apply, re-open this unit so the following can be completed:
   - remote table/column/constraint/RLS/policy verification,
   - live `GET /api/tenant/profile` rich-field verification,
   - safe `PUT /api/tenant/profile` persistence verification in a QA/demo OWNER/ADMIN tenant,
   - post-apply public non-exposure confirmation.

No secrets, URLs, tokens, or SQL credentials were printed.

## 7. Runtime Verification Performed Before Block

### 7.1 Auth and session observations

- Shared tenant browser page remained visually inside Shraddha Industries Company Profile / B2B workspace.
- Browser-side unauthenticated fetch to `GET /api/tenant/profile` returned `401 UNAUTHORIZED`.
- Browser-side authenticated fetch using the existing in-browser tenant token returned `500 INTERNAL_ERROR` for `GET /api/tenant/profile`.

Interpretation:

- The route is not runtime-healthy on the deployed lane used for verification.
- Because the tracked SQL migration is unapplied from this environment and no deployment/restart path was authorized in this unit, this 500 is recorded as runtime evidence but not root-caused to a source regression in this unit.

### 7.2 Read-only mutation rejection

Verified against the live authenticated route using a rejected body only:

- `PUT /api/tenant/profile` with `{ "gstin": "SHOULD_NOT_BE_ACCEPTED" }` -> `400 VALIDATION_ERROR`
- Validation detail showed `Expected never, received string` on `gstin`.

Conclusion: read-only GST/publication mutation guard is live for the rejected-field path.

### 7.3 Validation checks verified live

Verified live with non-persisting invalid payloads:

- invalid `websiteUrl` -> `400 VALIDATION_ERROR`
- invalid `businessEmail` -> `400 VALIDATION_ERROR`
- invalid `companySizeBand` -> `400 VALIDATION_ERROR`
- `description` length 2001 -> `400 VALIDATION_ERROR`

These checks confirm the request-schema validation layer is active before the write path.

### 7.4 Safe checks not completed

Not completed in this blocked unit:

- valid rich-field `PUT` persistence test,
- follow-up authenticated `GET` readback after a successful write,
- post-migration column/table verification,
- non-OWNER/ADMIN `403` verification,
- focused DB-backed integration test restoration/execution.

Reasons:

- no lawful remote migration execution lane available,
- no approved QA/demo OWNER/ADMIN browser lane provided for harmless writes,
- real Shraddha supplier data was not mutated without explicit authorization.

## 8. Public Non-Exposure Verification

Verified before block:

- `GET /api/public/b2b/suppliers` -> `200 success=true`
- First returned supplier item keys remained limited to public-safe fields: `slug`, `legalName`, `logoUrl`, `orgType`, `jurisdiction`, `certificationCount`, `certificationTypes`, `hasTraceabilityEvidence`, `taxonomy`, `offeringPreview`, `publicationPosture`, `eligibilityPosture`.
- No forbidden rich-profile/private keys were present in the observed public supplier payload: `businessEmail`, `phone`, `cinNumber`, `udyamNumber`, `iecNumber`, `tagline`, `description`, `websiteUrl`, `city`, `state`, `capacityBand`, `companySizeBand`, storage-path, bucket, or signed-URL fields.
- `/b2b` remained on the public supplier discovery surface with no observed rich-profile exposure.
- `/products` public surface did not show contact identifiers, CIN/Udyam/IEC, signed-URL text, or storage-path/bucket text during the bounded read-only probe.

Conclusion: no public exposure regression was observed in the bounded pre-block checks.

## 9. Validation Commands

To be run after governance closeout update:

- `pnpm --dir server exec prisma validate`
- `pnpm --dir server exec prisma generate`
- `pnpm --dir server typecheck`
- `pnpm typecheck`
- `git diff --check`

## 10. Residuals

- Remote DB pre-check/apply/post-check still required.
- Live authenticated `GET /api/tenant/profile` currently returns `500` on the shared runtime lane.
- Valid rich-field persistence remains unverified.
- Non-OWNER/ADMIN permission verification remains unverified.
- Focused DB-backed test remains deferred until migration is actually applied and a truthful execution lane exists.

## 11. Next Recommended Unit

- Resume `FTR-SL-016B2A1-B2B-COMPANY-PROFILE-RICH-FIELDS-DB-MIGRATION-RUNTIME-VERIFY-01` after manual remote migration apply and after a safe QA/demo OWNER/ADMIN tenant session is available for harmless write verification.