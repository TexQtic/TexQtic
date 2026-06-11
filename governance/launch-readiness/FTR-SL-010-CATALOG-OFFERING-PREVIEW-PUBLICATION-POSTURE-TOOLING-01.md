# FTR-SL-010 Catalog Offering Preview Publication Posture Tooling

**Unit:** `FTR-SL-010-CATALOG-OFFERING-PREVIEW-PUBLICATION-POSTURE-TOOLING-01`
**Date:** 2026-06-11
**Status:** IMPLEMENTED_PENDING_AUTHORIZED_CATALOG_DATA_ENTRY
**Final enum:** `FTR_SL_010_CATALOG_OFFERING_PREVIEW_POSTURE_TOOLING_IMPLEMENTED_PENDING_AUTHORIZED_CATALOG_DATA_ENTRY`

---

## 1. Scope And Final Posture

This unit implements the smallest governed tooling path needed to set public-safe catalog offering-preview publication posture for already-provisioned real B2B suppliers.

The implemented path is a SUPER_ADMIN-only control-plane route:

```text
POST /api/control/tenants/:id/catalog-items/:itemId/publication-posture
```

The route updates only the tenant-owned catalog item's `publicationPosture`. It does not create catalog items, activate inactive items, change pricing, change item content, alter organization publication or eligibility posture, or perform production supplier data entry.

---

## 2. Repo Truth And Root Cause

Repo inspection confirmed:

- `CatalogItem.publicationPosture` storage already exists in Prisma and maps to `publication_posture`.
- Public B2B projection already includes offering preview rows only when catalog items are `active: true` and `publicationPosture` is `B2B_PUBLIC` or `BOTH`.
- Public projection selects only public-safe offering preview fields and does not select price.
- Tenant catalog create/update surfaces do not expose `publicationPosture`.

The gap was therefore tooling, not schema or projection support. Direct SQL or tenant self-service widening would have been broader than needed for the first real supplier cohort readiness path.

---

## 3. Implementation Summary

Changed backend control-plane behavior only:

- Added a bounded request schema accepting only `PRIVATE_OR_AUTH_ONLY`, `B2B_PUBLIC`, or `BOTH`.
- Intentionally excluded `B2C_PUBLIC` from this B2B offering-preview tooling surface.
- Added a SUPER_ADMIN-only endpoint for existing tenant-owned catalog items.
- Reused the existing org/admin write context transaction helper.
- Required valid tenant UUID and catalog item UUID.
- Required the target organization to exist, be B2B, and not be a QA sentinel.
- Required the catalog item to belong to the target tenant.
- Rejected `HIDDEN` catalog visibility policy combined with `B2B_PUBLIC` or `BOTH`.
- Updated only `CatalogItem.publicationPosture`.
- Wrote admin audit action `control.tenants.catalog_item.publication_posture_updated`.
- Returned only public-safe identity/posture data: tenant ID, slug, item ID, active state, and publication posture.
- Updated `shared/contracts/openapi.control-plane.json` in the same wave.

---

## 4. Public Projection Guardrail

The public B2B projection was not widened. Focused test coverage now confirms the offering preview query still requires:

```text
active: true
publicationPosture in ['B2B_PUBLIC', 'BOTH']
```

The projection test also confirms the catalog query does not select `price`.

Inactive items can receive a posture update for operator correction/readiness staging, but they remain excluded from public offering preview until separately activated through existing catalog lifecycle behavior.

---

## 5. Validation Evidence

Focused backend route and projection tests:

```text
pnpm -C server exec vitest run src/__tests__/control-supplier-publish-reinvite.integration.test.ts src/__tests__/public-b2b-projection.unit.test.ts

Test Files  2 passed (2)
Tests  47 passed (47)
```

OpenAPI parse:

```text
openapi.control-plane.json parse: OK
```

Server TypeScript:

```text
pnpm -C server exec tsc --noEmit --pretty false

Command produced no output
```

Editor diagnostics were checked for changed source/test files. Existing lint-style diagnostics unrelated to this unit remain in the broader changed files; no FTR-SL-010 type error was reported.

---

## 6. Explicit Non-Actions

This unit did not perform:

- schema changes
- Prisma migrations
- direct SQL
- `.env` or database URL changes
- package changes
- production catalog data entry
- supplier profile GET or browser `/supplier/:slug` verification
- inquiry or email actions
- legal, payment, Zoho, CRM, CAE, TTP, or D2C changes
- buyer-promotion-ready classification

---

## 7. Next Authorized Step

FTR-SL-010 is implemented pending authorized catalog data entry. A separate Paresh-authorized operational data-entry unit is required before setting real supplier catalog item postures in production.

---

## 8. Final Classification

`FTR_SL_010_CATALOG_OFFERING_PREVIEW_POSTURE_TOOLING_IMPLEMENTED_PENDING_AUTHORIZED_CATALOG_DATA_ENTRY`