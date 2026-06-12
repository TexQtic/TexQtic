# FTR-SL-011F2A/B Accelerated — Catalog Read Path and Posture Execution

Unit: FTR-SL-011F2A-B-ACCELERATED-CATALOG-READ-PATH-AND-POSTURE-EXECUTION-01
Date: 2026-06-12
Status: COMPLETE
Final enum: FTR_SL_011F2AB_POSTURE_EXECUTED_AND_OFFERING_PREVIEW_VERIFIED

## 1) Final Enum

FTR_SL_011F2AB_POSTURE_EXECUTED_AND_OFFERING_PREVIEW_VERIFIED

## 2) Repo Preflight

Commands run:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -5

Observed:

- branch: main
- starting HEAD: f9889faa
- worktree: clean

Preflight verdict: PASS.

## 3) Files Inspected

- server/src/routes/control.ts (FTR-SL-010 route block, withAdminContext, withOrgAdminContext patterns)
- server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts (mock pattern, existing tests)
- server/src/services/publicB2BProjection.service.ts (offering preview filter)

## 4) Endpoint Implementation Summary

Implemented:

```
GET /api/control/tenants/:id/catalog-items
```

Auth: `adminAuthMiddleware` + `requireAdminRole('SUPER_ADMIN')`

Context: `withOrgAdminContext(id, adminId, ...)` — uses actual org UUID as `app.org_id` (not sentinel).
Note: initial implementation used `withAdminContext` (sentinel-scoped) which failed RLS on `organizations`
table. Fixed to `withOrgAdminContext` in commit `a14dd38d`.

Guards:
- UUID validation for `:id` param
- tenant must exist
- org must exist
- not a QA sentinel
- org must be B2B type

Response fields:
- tenantId, slug (tenant-level fields)
- items[]: id, name, sku, active, publicationPosture, catalogVisibilityPolicyMode, createdAt, updatedAt

Excluded fields (sensitive/private):
- price, moq, description, imageUrl, inventory, contacts, orders, buyer terms, memberships, plan, payment

Audit: `control.tenants.catalog_items.posture_read` written on each successful call.

## 5) Response Field Safety Confirmation

Response fields confirmed safe:
- No price fields
- No MOQ field at item level (only in offeringPreview public projection)
- No buyer-facing terms
- No contact or PII data
- No sensitive compliance fields

## 6) Tests / Static Validation

Tests added to server/src/__tests__/control-supplier-publish-reinvite.integration.test.ts:

- 200 with item list for valid B2B tenant
- 200 with empty items array for tenant with no items
- 404 when tenant not found
- 409 when org is not B2B
- 403 when QA sentinel
- 403 for non-SUPER_ADMIN role
- 400 for invalid UUID

Test results: 7/7 new tests PASS (40/40 full file PASS, up from 33).

git diff --check: PASS (CRLF normalization warning only, not an error).

TypeScript typecheck: No output = no errors.

## 7) Local DB Verification Status

LOCAL_DB_ENV_NOT_APPLICABLE — remote DB used as authoritative source.

## 8) Implementation Commit/Push Status

Commits pushed:

- d68c1a8d — launch: add control catalog read path for posture readiness (endpoint + tests)
- a8cb6e2c — fix: use sequential queries in catalog-items read endpoint (intermediate fix)
- a14dd38d — fix: use withOrgAdminContext for catalog-items read to satisfy org RLS (final fix)

Final HEAD: a14dd38d
HEAD == origin/main: YES

## 9) Deployed Endpoint Verification

Endpoint verified live at: GET /api/control/tenants/0ae549d7-b17b-4277-b9f6-f3e8c3a57e09/catalog-items

Response:

- status: 200
- tenantId: 0ae549d7-b17b-4277-b9f6-f3e8c3a57e09
- slug: shraddha-industries
- items: 2 items returned

## 10) Auth-Valid Control Plane Probe

- hasToken: true
- realm: CONTROL_PLANE
- status: 200 (verified multiple times during this unit)

## 11) Shraddha Catalog Items Discovered

Item 1:
- id: bbffa37d-4bd9-492d-bf3e-a917c27e21d2
- name: SILK CREPE
- sku: null
- active: true
- publicationPosture: PRIVATE_OR_AUTH_ONLY (before execution)
- catalogVisibilityPolicyMode: null (not HIDDEN)
- createdAt: 2026-06-11T13:31:55.538Z

Item 2:
- id: 4699adc7-8ea0-4ce1-b29a-2af16a1fb4cb
- name: Item No. 4005
- sku: null
- active: true
- publicationPosture: PRIVATE_OR_AUTH_ONLY (before execution)
- catalogVisibilityPolicyMode: null (not HIDDEN)
- createdAt: 2026-06-11T13:36:41.925Z

## 12) Item UUIDs / Names / SKUs

- bbffa37d-4bd9-492d-bf3e-a917c27e21d2 — SILK CREPE
- 4699adc7-8ea0-4ce1-b29a-2af16a1fb4cb — Item No. 4005

## 13) Current Active / Posture / Visibility State (Before Execution)

Both items:
- active: true
- publicationPosture: PRIVATE_OR_AUTH_ONLY
- catalogVisibilityPolicyMode: null (not HIDDEN — no conflict)

## 14) Posture Execution Gate Result

All Phase 5 gates PASSED:
1. Read endpoint returned HTTP 200 — YES
2. UUIDs discovered — YES
3. Item names match known governance records — YES
4. Items are active — YES
5. Items have PRIVATE_OR_AUTH_ONLY posture — YES (update needed)
6. No HIDDEN catalogVisibilityPolicyMode — YES
7. FTR-SL-010 route contract confirmed unchanged — YES
8. Auth probe 200 — YES
9. No sensitive data needed — YES
10. Exact payload known — YES

## 15) Whether FTR-SL-010 Posture POST Was Called

YES — called exactly once per item (2 total calls).

## 16) Posture POST Response Summary

SILK CREPE (bbffa37d-4bd9-492d-bf3e-a917c27e21d2):
- route: POST /api/control/tenants/0ae549d7-b17b-4277-b9f6-f3e8c3a57e09/catalog-items/bbffa37d-4bd9-492d-bf3e-a917c27e21d2/publication-posture
- payload: { publicationPosture: "B2B_PUBLIC" }
- response: status=200, success=true, item.id=bbffa37d, active=true, publicationPosture=B2B_PUBLIC

Item No. 4005 (4699adc7-8ea0-4ce1-b29a-2af16a1fb4cb):
- route: POST /api/control/tenants/0ae549d7-b17b-4277-b9f6-f3e8c3a57e09/catalog-items/4699adc7-8ea0-4ce1-b29a-2af16a1fb4cb/publication-posture
- payload: { publicationPosture: "B2B_PUBLIC" }
- response: status=200, success=true, item.id=4699adc7, active=true, publicationPosture=B2B_PUBLIC

## 17) Safe Public Verification After Posture Updates

Endpoint: GET /api/public/b2b/suppliers

Result:
- status: 200
- total: 2
- shraddha-industries found: true
- primarySegment: weaving
- offeringPreviewCount: 2
- offeringNames: ["SILK CREPE", "Item No. 4005"]

## 18) /b2b Visual Verification

Page snapshot confirms:
- Shraddha Industries card shows product/service examples: SILK CREPE (MOQ 500) + Item No. 4005 (MOQ 1)
- "View offerings" button present on Shraddha card
- Offerings drawer visible: both items shown as "Public B2B offering"
- lt-b2b-001 shows "Demo / pilot supplier" badge
- No profile route opened
- No View Public Profile clicked

## 19) Profile GET Not-Called Confirmation

YES — /api/public/supplier/shraddha-industries not called. /supplier/shraddha-industries not opened.

## 20) /products Unchanged Confirmation

YES — confirmed.

## 21) Tracker / TLRH Sync

Updated in this unit:
- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F2A-B-ACCELERATED-CATALOG-READ-PATH-AND-POSTURE-EXECUTION-01.md

Not updated:
- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md

## 22) Adjacent Findings And Disposition

1. RLS issue with withAdminContext for organizations table:

   Initial implementation used withAdminContext (ADMIN_SENTINEL_ID as app.org_id).
   The organizations table RLS does not grant reads for the sentinel ID.
   Fixed to withOrgAdminContext which sets app.org_id = actual org UUID.
   This is consistent with how the FTR-SL-010 posture route uses withOrgAdminWriteContext.

   Disposition: FIXED_IN_UNIT — two fix commits pushed (a8cb6e2c, a14dd38d).

2. Shraddha OWNER invite may be expired:

   The last known invite expiry was 2026-06-13T06:32:11Z (FTR-SL-001J).
   This didn't block this unit (used admin lane).
   But Shraddha still has no confirmed OWNER membership.

   Disposition: REGISTERED — invite status should be verified before pilot supplier workspace usage.
   No immediate follow-up unit required for offering preview purpose, but for supply-side operations, invite must be accepted.
   Priority: P2 / PILOT_REQUIRED.
   Owner: Paresh (Shraddha must accept the invite).

3. lt-b2b-001 offerings still showing after catalog read endpoint:

   lt-b2b-001 has 3 offering items (LT Fabric Sample 001/002/003) which appear correctly in /b2b.

   Disposition: NO_ACTION_NEEDED — lt-b2b-001 demo/pilot state is correctly labeled and expected.

## 23) Risks And Residuals

- Shraddha OWNER invite: Shraddha has not accepted invite. For supply-side operations (not offering preview), invite acceptance is needed.
- /supplier/:slug profile route still excluded from ordinary verification per FTR-SL-007.
- No legal/payment/Zoho gate changes in this unit.
- /products remains B2C-only.

## 24) Commit Hash And Push Status

Implementation commits:
- d68c1a8d — add catalog read path
- a8cb6e2c — sequential queries fix
- a14dd38d — withOrgAdminContext fix (final)

Documentation commit: to be pushed as part of this close.

## 25) Recommended Next Unit

FTR-SL-012-SHRADDHA-B2B-PROFILE-COMPLETENESS-AUDIT-01 (or similar)

Suggested scope:
- Audit the full Shraddha public B2B profile completeness state: taxonomy, certification, traceability, offering preview (now done).
- Determine remaining data gaps before promotion.
- May include: certification type registration, traceability evidence, re-invite follow-up.

OR — if Paresh confirms the B2B directory state is sufficient for soft-launch promotion:
- Issue fresh Shraddha reinvite (if invite expired)
- Register B2B pilot promotion launch readiness as GATE_SL_01_MET

Paresh decision required for next unit scope.
