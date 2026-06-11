# FTR-SL-009 Supplier Profile Completeness Tooling Gap Implementation

**Unit:** `FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01`
**Date:** 2026-06-11
**Status:** IMPLEMENTED_PENDING_AUTHORIZED_DATA_ENTRY
**Final enum:** `FTR_SL_009_SUPPLIER_PROFILE_COMPLETENESS_TAXONOMY_TOOLING_IMPLEMENTED_PENDING_AUTHORIZED_DATA_ENTRY`

---

## 1. Scope And Final Posture

This unit implemented the smallest safe governed tooling path needed to complete public-safe taxonomy/profile fields for already-provisioned real B2B suppliers.

Implemented source scope:

- Added `POST /api/control/tenants/:id/profile-completeness`.
- Route is SUPER_ADMIN-only.
- Route applies only to B2B organizations.
- Route blocks QA sentinel organizations.
- Route updates only existing taxonomy storage:
  - `organizations.primary_segment_key`
  - `organization_secondary_segments`
  - `organization_role_positions`
- Route writes admin audit action `control.tenants.profile_completeness.taxonomy_updated`.
- Route returns only public-safe tenant identity and taxonomy response fields.

Explicitly not implemented:

- No production supplier data entry.
- No direct SQL, Prisma migration, Prisma seed, schema change, RLS change, package change, or env change.
- No public profile GET, browser profile view, inquiry, email, legal, payment, Zoho, CRM, CAE, or TTP mutation.
- No publication posture, public eligibility, legal identity, contact, membership, plan, payment, or catalog item visibility change.

Catalog item `publicationPosture` was confirmed as a separate tooling gap and registered as FTR-SL-010.

---

## 2. Atomic Change Envelope

**Gap ID:** `FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01`

**Objective:** Provide a bounded audited control-plane path to set public-safe taxonomy fields for existing real B2B supplier organizations after provisioning.

**Files changed:**

- `server/src/routes/control.ts`
- `server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts`
- `shared/contracts/openapi.control-plane.json`
- `governance/launch-readiness/FTR-SL-009-SUPPLIER-PROFILE-COMPLETENESS-TOOLING-GAP-IMPLEMENTATION-01.md`
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`

**Files explicitly out of scope:**

- `server/prisma/schema.prisma`
- `server/prisma/migrations/**`
- `.env*`
- tenant catalog routes/services
- public projection routes/services
- frontend public supplier profile UI
- production data or browser verification surfaces

**Acceptance criteria:**

- Existing-supplier taxonomy can be updated without direct SQL.
- Only B2B non-QA-sentinel organizations can be updated.
- Role positions are limited to `manufacturer`, `trader`, and `service_provider`.
- Primary segment is required and cannot also appear in secondary segments.
- Secondary segment keys and role positions must be unique.
- Audit entry is written after successful update.
- OpenAPI control-plane contract documents the new endpoint.
- Focused backend tests and server typecheck pass.

**Envelope result:** Preserved. Same-unit necessary expansion included `shared/contracts/openapi.control-plane.json` because architecture governance requires a newly exposed endpoint to be documented in the same implementation wave.

---

## 3. Repo Truth Findings

FTR-SL-008 established that public projection and schema already support supplier taxonomy fields, but existing control-plane and tenant tooling did not expose a bounded post-provision taxonomy write path for existing supplier organizations.

Relevant repo truth:

- `organizations.primary_segment_key` exists.
- `OrganizationSecondarySegment` exists with composite key `(org_id, segment_key)`.
- `OrganizationRolePosition` exists with composite key `(org_id, role_position_key)`.
- Public B2B projection already reads and returns taxonomy fields.
- Control tenant list/detail already reads taxonomy identity data.
- Existing provisioning validation defines role keys as `manufacturer`, `trader`, and `service_provider`.
- Catalog item storage has `publicationPosture`, but inspected tenant catalog create/update surfaces do not expose it; this is separate from taxonomy completion.

---

## 4. Implementation Summary

Backend route added in `server/src/routes/control.ts`:

- Validates params with UUID requirement.
- Validates body as strict taxonomy-only payload:
  - `primary_segment_key`
  - `secondary_segment_keys`
  - `role_position_keys`
- Uses the existing `withOrgAdminWriteContext` transaction helper.
- Reads target tenant and organization by id.
- Rejects not found, QA sentinel, and non-B2B targets.
- Updates `primary_segment_key` on `organizations`.
- Replaces `organization_secondary_segments` rows scoped to `org_id`.
- Replaces `organization_role_positions` rows scoped to `org_id`.
- Writes admin audit metadata containing prior and next taxonomy only.

Test coverage added in `server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts`:

- successful B2B supplier taxonomy update
- zero secondary segments allowed
- not found
- QA sentinel rejection
- non-B2B rejection
- primary duplicated in secondary rejection
- duplicate and invalid role position rejection
- invalid UUID rejection
- non-SUPER_ADMIN rejection
- no publication, invite, or unrelated write calls in success path

OpenAPI contract updated in `shared/contracts/openapi.control-plane.json`:

- Added `POST /api/control/tenants/{id}/profile-completeness`.
- Documented request schema, response schema, and 400/401/403/404/409 errors.
- Documented explicit non-effects: no publication, legal identity, contact, membership, plan, payment, or catalog visibility mutation.

---

## 5. Validation Evidence

Pre-edit safety gate:

```text
git diff --name-only
[no output]

git status --short
[no output]
```

Focused backend route tests:

```text
pnpm -C server exec vitest run src/__tests__/control-supplier-publish-reinvite.integration.test.ts

✓ src/__tests__/control-supplier-publish-reinvite.integration.test.ts (25 tests) 191ms
  ✓ POST /api/control/tenants/:id/publish (8)
  ✓ POST /api/control/tenants/:id/profile-completeness (9)
  ✓ POST /api/control/tenants/:id/first-owner/reinvite (8)

Test Files  1 passed (1)
Tests  25 passed (25)
```

Server typecheck:

```text
pnpm -C server run typecheck

> texqtic-platform-server@0.1.0 typecheck C:\Users\PARESH\TexQtic\server
> tsc --noEmit
```

No typecheck errors were emitted.

---

## 6. Residuals And Next Actions

FTR-SL-009 is implementation-complete but does not enter or mutate production supplier data. The next data-entry step requires a separately authorized operational action after deployment.

Authorized follow-up candidates:

- Use the new control-plane endpoint for Shraddha Industries taxonomy only after Paresh authorizes production data entry.
- Register and run FTR-SL-010 to design or implement catalog offering-preview publication posture tooling.
- Continue to avoid production public profile GET for no-mutation verification unless Paresh explicitly accepts the FTR-SL-007 audit/event write side effect.

FTR-SL-010 residual:

- `CatalogItem.publicationPosture` exists and public B2B projection requires public item posture for offering previews.
- Tenant catalog create/update surfaces inspected in FTR-SL-008 do not expose item publication posture.
- This was not folded into FTR-SL-009 because it crosses from organization taxonomy into catalog visibility semantics.

---

## 7. Final Classification

`FTR_SL_009_SUPPLIER_PROFILE_COMPLETENESS_TAXONOMY_TOOLING_IMPLEMENTED_PENDING_AUTHORIZED_DATA_ENTRY`
