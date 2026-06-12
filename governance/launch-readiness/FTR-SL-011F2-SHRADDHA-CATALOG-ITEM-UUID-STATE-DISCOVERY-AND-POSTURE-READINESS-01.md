# FTR-SL-011F2 — Shraddha Catalog Item UUID / State Discovery and Posture Readiness

Unit: FTR-SL-011F2-SHRADDHA-CATALOG-ITEM-UUID-STATE-DISCOVERY-AND-POSTURE-READINESS-01
Date: 2026-06-12
Status: BLOCKED — ITEM UUID DISCOVERY UNAVAILABLE
Final enum: FTR_SL_011F2_BLOCKED_ITEM_UUID_DISCOVERY_UNAVAILABLE

## 1) Final Enum

FTR_SL_011F2_BLOCKED_ITEM_UUID_DISCOVERY_UNAVAILABLE

## 2) Repo Preflight

Commands run:

- git branch --show-current
- git rev-parse HEAD
- git rev-parse origin/main
- git status --porcelain=v1 -uno
- git log --oneline -15

Observed:

- branch: main
- HEAD: 5b836b60fe1b7a9be61eb4ecfe19d52fabb6f853
- origin/main: 5b836b60fe1b7a9be61eb4ecfe19d52fabb6f853
- worktree: clean
- recent history includes FTR-SL-011F1F commit 5b836b60

Preflight verdict: PASS.

## 3) Files Inspected

Backend routes:

- server/src/routes/control.ts (FTR-SL-010 route block + catalog endpoints grep)
- server/src/routes/tenant.ts (catalog item list route grep)
- server/src/services/publicB2BProjection.service.ts (offeringPreview projection filter)

Frontend:

- components/ControlPlane/TenantDetails.tsx (tabs: OVERVIEW, PLAN, FEATURES, BILLING, RISK, AUDIT)

Governance:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F1F-COMMIT-DEPLOY-VERIFY-AND-SHRADDHA-TAXONOMY-EXECUTION-01.md
- governance/launch-readiness/FTR-SL-010-CATALOG-OFFERING-PREVIEW-PUBLICATION-POSTURE-TOOLING-01.md
- governance/launch-readiness/FTR-SL-011B-SHRADDHA-CANONICAL-TAXONOMY-MAPPING-AND-CATALOG-VISIBILITY-DIAGNOSIS-01.md
- governance/launch-readiness/FTR-SL-011A-SHRADDHA-PROFILE-DATA-ENTRY-VALUES-ADDENDUM-AND-READINESS-01.md
- governance/launch-readiness/FTR-SL-011F-SHRADDHA-B2B-PUBLIC-VISIBILITY-SOURCE-AND-ITEM-READINESS-01.md

## 4) Auth-Valid Control Plane Probe

Probe executed from browser (public B2B page, which did have admin token at session start):

- hasToken: true
- realm: CONTROL_PLANE
- status: 200
- ok: true

Note: Control Plane browser tab (36237ea4) subsequently navigated to sign-in page after
attempting tenant detail GET. Admin session in that tab is now expired/lost. /b2b page
(8ea046d2) has realm=TENANT and no admin token.

Auth probe verdict at time of execution: PASS. Session state at end of unit: DEGRADED.

## 5) FTR-SL-010 Route / Tooling Contract Summary

Route:

```
POST /api/control/tenants/:id/catalog-items/:itemId/publication-posture
```

Auth requirement:

- SUPER_ADMIN only via admin token + X-Texqtic-Realm: control

Allowed publicationPosture values:

- PRIVATE_OR_AUTH_ONLY
- B2B_PUBLIC
- BOTH

Guards enforced:

- org must be B2B type
- org must NOT be QA sentinel
- item must exist and be owned by the tenant (tenantId=:id)
- HIDDEN catalogVisibilityPolicyMode blocks B2B_PUBLIC and BOTH postures (returns 422)

Response (success):

```json
{
  "tenantId": "<string>",
  "slug": "<string>",
  "item": {
    "id": "<uuid>",
    "active": "<boolean>",
    "publicationPosture": "<string>"
  }
}
```

Route updates only: CatalogItem.publicationPosture.

It does NOT create items. It does NOT alter item name, price, MOQ, image, description, inventory, orders, or contacts.

Contract verdict: FULLY CONFIRMED from repo truth.

## 6) Catalog Read Path Investigation

Paths investigated:

- GET /api/control/tenants/:id — does NOT include catalog items in response (only tenant/org metadata, memberships, consent, legal, onboarding status)
- GET /api/tenant/catalog/items — requires TENANT-scoped JWT (databaseContextMiddleware with app.org_id set to Shraddha's org); NOT callable with admin token
- Control Plane frontend TenantDetails.tsx — tabs are OVERVIEW, PLAN, FEATURES, BILLING, RISK, AUDIT; no CATALOG tab
- GET /api/control/audit-logs?tenantId=...&action=catalog — could in principle reveal item IDs from past events; requires admin token; session lost before this could be called
- GET /api/public/b2b/suppliers — offeringPreviewCount=0 confirms no items are currently B2B_PUBLIC; items exist but are not discoverable via public projection

Conclusion:

- No Control Plane GET /api/control/tenants/:id/catalog-items endpoint exists
- No admin-authenticated catalog list path is available in the current API surface
- Tenant catalog read requires tenant JWT which is NOT available (Shraddha OWNER has not accepted invite; admin token cannot substitute for tenant JWT on this endpoint)
- Public projection returns only items already B2B_PUBLIC — confirms items exist but posture is not yet public

Read path verdict: NO SAFE ADMIN CATALOG READ PATH EXISTS in current deployed API.

## 7) Shraddha Catalog Items — Known From Prior Governance Records

From prior governance artifacts (read-only, no mutation):

- Item 1: SILK CREPE (WEAVE PLAIN AND JACQURD, gsm 65GRAMS & 80 GRAMS) — name confirmed, UUID UNKNOWN
- Item 2: Item No. 4005 — name confirmed from screenshot evidence in FTR-SL-011B, UUID UNKNOWN

Sources:

- FTR-SL-011A §3.1 (Paresh-provided item names)
- FTR-SL-011B §8 (buyer catalog route evidence, no UUID captured)
- FTR-SL-011F (SILK CREPE target posture B2B_PUBLIC, UUID UNRESOLVED)

## 8) Item UUIDs — Not Available

Exact item UUIDs: UNKNOWN — never captured in any governance document.

Reasons:

- No prior unit executed a safe item-list GET that returned UUIDs
- Buyer catalog route (GET /api/tenant/catalog/supplier/:supplierOrgId/items) returns UUIDs but requires an authenticated buyer JWT for a tenant that has buyer access to Shraddha's catalog
- Tenant-owner catalog route (GET /api/tenant/catalog/items) returns UUIDs but requires Shraddha OWNER JWT (not established — invite not yet accepted)
- Control Plane catalog list endpoint: does not exist

## 9) Current publicationPosture Per Item

Unknown — cannot be read through available read paths.

Known inference from public projection:

- Neither item is currently B2B_PUBLIC or BOTH (otherwise offeringPreview would be non-empty)
- Items are therefore PRIVATE_OR_AUTH_ONLY (default posture after creation)

## 10) Current Eligibility / State / Status Per Item

Known from governance history and public API:

- Items are active (confirmed from buyer-catalog route evidence in FTR-SL-011B: active=true filter)
- Shraddha org is B2B_PUBLIC + PUBLICATION_ELIGIBLE (confirmed from taxonomy execution unit)
- Items are presumably NOT in HIDDEN catalogVisibilityPolicyMode (no evidence of HIDDEN policy was found)
- Exact per-item active/state fields cannot be confirmed without a catalog read

## 11) Recommended Target Posture

B2B_PUBLIC for both items — this would cause them to appear in Shraddha's offeringPreview on
GET /api/public/b2b/suppliers (up to 5 items per org, ordered by createdAt asc).

## 12) Exact Later Payload Candidate

Payload template (requires UUID discovery first):

```json
POST /api/control/tenants/0ae549d7-b17b-4277-b9f6-f3e8c3a57e09/catalog-items/<UUID>/publication-posture
{
  "publicationPosture": "B2B_PUBLIC"
}
```

This must be repeated for each item UUID. Exact UUIDs are NOT yet known.

## 13) Safe Public Verification

Endpoint: GET /api/public/b2b/suppliers

Result:

- status: 200
- total: 2
- shraddha-industries found: true
- primarySegment: weaving
- secondarySegments: ["fabric_processing"]
- rolePositions: ["manufacturer"]
- offeringPreviewCount: 0

Visual /b2b verification (from FTR-SL-011F1F, unchanged):

- page loaded
- Shraddha Industries card visible with taxonomy
- "No public offerings yet" shown
- lt-b2b-001 shows "Demo / pilot supplier" badge

## 14) Confirmation: No Posture Write Performed

YES — confirmed. No FTR-SL-010 mutation route was called in this unit.

## 15) FTR-SL-010 Not-Called Confirmation

YES — confirmed.

## 16) Profile GET Not-Called Confirmation

YES — /api/public/supplier/shraddha-industries not called. /supplier/shraddha-industries not opened.

## 17) /products Unchanged Confirmation

YES — confirmed.

## 18) Local DB Verification Status

LOCAL_DB_ENV_NOT_APPLICABLE per repo-specific verification rule.

## 19) Tracker / TLRH Sync

Updated in this unit:

- governance/launch-readiness/FUTURE-TODO-REGISTER.md
- governance/launch-readiness/FTR-SL-011F2-SHRADDHA-CATALOG-ITEM-UUID-STATE-DISCOVERY-AND-POSTURE-READINESS-01.md

Not updated:

- governance/control/NEXT-ACTION.md
- governance/control/OPEN-SET.md

## 20) Adjacent Findings And Disposition

1. No admin-readable catalog item list endpoint in Control Plane:

   The Control Plane has no `GET /api/control/tenants/:id/catalog-items` endpoint. This is a platform capability gap that blocks safe UUID discovery from the admin lane.

   Disposition: REGISTERED_AS_BLOCKER — unblocking options defined in §24.

2. Tenant OWNER invite still pending acceptance:

   Shraddha Industries OWNER invite has been issued multiple times (latest: expiresAt 2026-06-13T06:32:11Z per FTR-SL-001J). Until Shraddha accepts the invite, the tenant JWT path is unavailable, and the tenant catalog API cannot be called on their behalf.

   Disposition: REGISTERED_AS_PREREQUISITE — Paresh should follow up on invite delivery/acceptance before tenant-API-based UUID discovery is possible.

3. Admin token session loss in Control Plane browser tab:

   Navigation to /admin/tenants/:id (which does not exist as a route) caused the CP tab to navigate to 404/home and then sign-in, losing the active admin session.

   Disposition: REGISTERED_AS_SESSION_HYGIENE_RISK — navigating to unknown routes in CP tab without verifying route existence first loses the active session.

4. SILK CREPE and Item No. 4005 item names confirmed from governance:

   Item names are known from prior governance records. UUIDs are not.

   Disposition: DOCUMENTED — these names should be used for matching when UUID discovery succeeds.

## 21) Unblocking Options (For Next Unit Decision)

Option A — Implement minimal read-only Control Plane catalog list endpoint:

- Add `GET /api/control/tenants/:id/catalog-items` (SUPER_ADMIN only)
- Returns item UUIDs, names, active status, publicationPosture, catalogVisibilityPolicyMode
- No sensitive fields (price, description, inventory, contacts, orders)
- Immediately enables UUID discovery + posture execution in a single unit

Option B — Paresh runs audit log query from CP session:

- Re-authenticate in Control Plane
- Run: GET /api/control/audit-logs?tenantId=0ae549d7-b17b-4277-b9f6-f3e8c3a57e09&action=catalog&limit=50
- If any past catalog_item.publication_posture_updated audit entries exist, they would contain itemId
- This only works if the items have been posture-updated previously (no evidence of this)

Option C — Paresh authenticates as Shraddha OWNER via invite acceptance:

- Shraddha accepts the pending FIRST_OWNER_PREPARATION invite
- OWNER JWT becomes available
- GET /api/tenant/catalog/items returns full item list with UUIDs
- Then UUID discovery + posture execution proceed in a single unit

Option D — Wait for SILK CREPE / Item 4005 to be queryable via buyer catalog route:

- An authenticated buyer tenant queries GET /api/tenant/catalog/supplier/0ae549d7-b17b-4277-b9f6-f3e8c3a57e09/items
- Returns item UUIDs if items pass the buyer catalog eligibility gates
- Requires a live buyer session — not currently available

**Recommended path: Option A** — add a minimal read-only Control Plane catalog list endpoint. This is a small, bounded, non-mutating backend addition that directly enables the FTR-SL-010 posture execution path and does not require Shraddha to accept the invite.

## 22) Risks And Residuals

- Offering preview remains empty until posture is updated.
- SILK CREPE and Item No. 4005 exist but cannot be posture-updated without their UUIDs.
- Shraddha OWNER invite may be expired by 2026-06-13T06:32:11Z — if Option C is chosen, a fresh reinvite may be needed.
- Admin session in CP tab was lost during this unit; Paresh must re-authenticate before any CP-browser-based actions.

## 23) Commit Hash And Push Status

This unit is docs-only. Docs commit will be pushed as part of this unit's close (see commit instruction below).

## 24) Recommended Next Unit

Given Option A above:

FTR-SL-011F2A-SHRADDHA-CATALOG-ITEM-READ-PATH-ENABLEMENT-01

Scope:

- Implement SUPER_ADMIN-only `GET /api/control/tenants/:id/catalog-items` read-only endpoint
- Returns: item UUIDs, names, active, publicationPosture, catalogVisibilityPolicyMode only
- No sensitive fields (price, description, inventory, contacts, orders, memberships, plan, payment)
- No write mutation
- Adds audit log write for the admin read (consistent with platform pattern)
- Adds matching focused integration tests
- Immediately unblocks FTR-SL-011F3 posture execution

After FTR-SL-011F2A completes:

FTR-SL-011F3-SHRADDHA-CATALOG-POSTURE-BOUNDED-EXECUTION-01

- Use the new read endpoint to discover item UUIDs
- Classify eligible items for B2B_PUBLIC posture
- Execute FTR-SL-010 posture POST for each qualifying item
- Verify offeringPreview appears in public directory
