# FTR-SL-016B2A - B2B Company Profile Rich Fields Schema + API Foundation

## 1. Unit Identity

- **Unit ID:** `FTR-SL-016B2A-B2B-COMPANY-PROFILE-RICH-FIELDS-SCHEMA-API-IMPLEMENTATION-01`
- **Date:** 2026-06-13
- **Mode:** bounded backend/schema/API implementation
- **Base design:** `FTR-SL-016B2-B2B-COMPANY-PROFILE-RICH-FIELDS-API-SCHEMA-DESIGN-01`
- **Base commit:** `496ceb9e31df0d042f2d8b955c6fdbda6543a1ec`
- **Final enum:** `FTR_SL_016B2A_RICH_PROFILE_SCHEMA_API_IMPLEMENTED_PENDING_DB_MIGRATION`

## 2. Product Decisions Applied

- P1 July fields: `tagline`, `description`, `websiteUrl`, `gstin` (read-only), `gstVerified`, `gstVerificationStatus`, `businessEmail`, `phone`, `phonePublic`, `companySizeBand`, `capacityBand`, optional `cinNumber`, optional `udyamNumber`, optional `iecNumber`, plus `city` and `state`.
- Description length: 2000 characters max.
- Website public posture: public-safe later, not projected in this unit.
- GSTIN handling: sourced read-only from `gst_verifications`, not stored in `tenant_profile_details`.
- CIN/Udyam/IEC handling: optional nullable private fields.
- Contact policy: email/phone remain tenant-auth-only in this unit.
- Company size/capacity handling: constrained string values using the approved launch-safe sets.
- Public projection posture: unchanged.

## 3. Implementation Summary

- Added Prisma model `TenantProfileDetail` and `Tenant.profileDetail` relation.
- Created tracked SQL migration `server/prisma/migrations/pr-ftr-sl-016b2a-tenant-profile-details.sql`.
- Extended `GET /api/tenant/profile` to include rich profile fields, GST read-only fields, and publication posture metadata.
- Extended `PUT /api/tenant/profile` to upsert tenant-managed rich fields while rejecting GST/public posture mutations.
- Extended `services/tenantService.ts` request/response types.
- Added tenant profile path to `shared/contracts/openapi.tenant.json`.
- Added focused DB-backed integration test `server/src/__tests__/tenant-profile-rich-fields.integration.test.ts`.

## 4. Guardrails Preserved

- No frontend UI changed.
- No public projection changed.
- No migration applied in this unit.
- No deploy or production mutation performed.

## 5. Next Required Unit

`FTR-SL-016B2A1-B2B-COMPANY-PROFILE-RICH-FIELDS-DB-MIGRATION-RUNTIME-VERIFY-01`

Reason: the schema/API foundation is implemented locally, but remote DB apply and runtime verification remain pending.