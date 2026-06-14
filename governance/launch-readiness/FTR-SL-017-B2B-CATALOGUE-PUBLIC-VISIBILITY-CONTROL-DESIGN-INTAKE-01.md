# FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-DESIGN-INTAKE-01

---

## 1) Unit Identity

- **Unit ID:** `FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-DESIGN-INTAKE-01`
- **Execution lane:** Lane C — QA Triage / Design Decision
- **Cost class:** LOW
- **Evidence tier:** Tier 2 — Compact Artifact
- **Max scope:** read-only repo-truth inspection + design-intake artifact + governance/truth-sync only
- **Expected files touched:** governance/design-intake files only
- **Expected runtime checks:** none required in this unit; design-time runtime QA script drafted only
- **Governance evidence tier:** Tier 2
- **Stop condition:** stop if implementation, DB change, public projection change, or source mutation is required
- **Do not continue if:** current repo truth shows catalogue visibility cannot be designed safely without a broader product/architecture decision from Paresh

---

## 2) TECS v2.0.2 Classification

| Field | Value |
|---|---|
| Execution lane | Lane C — QA Triage / Design Decision |
| Cost class | LOW |
| Evidence tier | Tier 2 — Compact Artifact |
| Max scope | Read-only inspection + design artifact only |
| Expected runtime checks | None (design-time QA script drafted; to run in later implementation unit) |
| Governance evidence tier | Tier 2 |
| Launch impact | HIGH — required before public B2B catalogue/product launch readiness |
| Product intent | Give B2B supplier tenants an explicit, safe control for whether each catalogue item is publicly visible |
| UX pattern | Product-level dropdown select on catalogue item create/edit form; decided in this unit |
| Public/private boundary | Defined in §10 of this artifact |
| Acceptance criteria | Defined in §14 of this artifact |
| Runtime QA script | Defined in §13 of this artifact |
| Hub impact | Yes — design-gate/truth-sync; FUTURE-TODO-REGISTER updated |
| Manual QA required | Yes — after later Lane A/B implementation unit |

---

## 3) Repo Preflight

Commands run:

```
git branch --show-current
git rev-parse HEAD
git status --short
git log --oneline -20
git remote -v
```

Results:

| Check | Result |
|---|---|
| Branch | `main` |
| HEAD at opening | `3d08b628b16f699f08b76d6e745257eed72695e8` |
| `git status --short` | clean — no uncommitted changes |
| Remote alignment | `origin/main` aligned at `3d08b628...` |
| Remote | `https://github.com/TexQtic/TexQtic.git` |

Relevant recent log entries:

```
3d08b628 [TEXQTIC] governance: apply TECS v2.0.2 precision patch
9eb7be42 [TEXQTIC] governance: finalize TECS adoption artifact metadata
b888ac82 [TEXQTIC] governance: adopt TECS v2.0.1 Copilot enforcement
8d10427a [TEXQTIC] governance: verify split company profile runtime readiness
e9041b79 [TEXQTIC] frontend: add split company profile workspace
```

---

## 4) TECS Authority Check

| Check | Result |
|---|---|
| TECS version | v2.0.2 confirmed in `TECS.md` line 1 |
| Lane C meaning | "QA Triage / Design Decision — No source code by default" — confirmed `TECS.md` §1.3 |
| FTR-SL-017 gate | Design-intake-gated in `TECS.md` §10 — confirmed present |
| `.github/copilot-instructions.md` | References TECS v2.0.2, Lane C confirmed, FTR-SL-017 gate retained |
| Implementation allowed | NO — Lane C, source freeze |

TECS §10 FTR-SL-017 gate requires this unit to decide:
- control location ✓
- who can change it ✓
- default visibility ✓
- product/card/listing impact ✓
- public/private boundary ✓
- save behavior ✓
- runtime QA script ✓
- acceptance criteria ✓

---

## 5) Files Inspected (Read-Only)

| File | Purpose |
|---|---|
| `TECS.md` | Authority check — v2.0.2, Lane C, FTR-SL-017 gate |
| `.github/copilot-instructions.md` | Canonical Copilot instruction alignment |
| `server/src/services/catalogVisibilityPolicyResolver.ts` | Policy resolver (Slice A) — policy modes, posture mapping |
| `server/src/__tests__/catalogVisibilityPolicyResolver.test.ts` | Resolver unit tests R-01 to R-15 |
| `server/src/services/publicB2BProjection.service.ts` | Public B2B projection — 6 projection safety gates |
| `server/src/routes/tenant.ts` | Tenant routes — GET/POST/PATCH catalog items, visibility policy wiring |
| `server/src/__tests__/catalogRouteVisibility.test.ts` | Route-level visibility tests |
| `server/src/__tests__/relationshipCatalogVisibility.test.ts` | Relationship catalog visibility tests |
| `tests/e2e/catalog-visibility-policy-gating.spec.ts` | E2E gating spec — QA data contract, test scenarios |
| `server/prisma/schema.prisma` | Schema — `CatalogItem` model, `catalogVisibilityPolicyMode`, `publicationPosture` |
| `services/catalogService.ts` | Frontend API client — CatalogItem, CreateCatalogItemRequest, UpdateCatalogItemRequest |
| `components/Tenant/CatalogPdpSurface.tsx` | Buyer-facing PDP surface (tenant plane) |
| `components/Public/B2BDiscovery.tsx` | Public B2B discovery page (`/b2b`) |
| `components/Public/PublicSupplierProfile.tsx` | Public supplier profile component |
| `components/WhiteLabelAdmin/WLCollectionsPanel.tsx` | WL admin collections panel |
| `config/publicCollectionsProjection.ts` | Public collection projection config |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | Hub register — prior updates, FTR-SL-017 mentions |

---

## 6) Current Repo Truth Summary

### 6.1 Database (confirmed via Prisma schema)

`catalog_items` table has TWO visibility-related columns:

| Column | Type | Default | Values |
|---|---|---|---|
| `publication_posture` | VARCHAR(30) | `PRIVATE_OR_AUTH_ONLY` | `PRIVATE_OR_AUTH_ONLY`, `B2B_PUBLIC`, `B2C_PUBLIC`, `BOTH` |
| `catalog_visibility_policy_mode` | VARCHAR(30) | NULL | `PUBLIC`, `AUTHENTICATED_ONLY`, `APPROVED_BUYER_ONLY`, `HIDDEN`, `RELATIONSHIP_GATED` |

The `catalog_visibility_policy_mode` column was added in migration `9d29798` (`migration(catalog): add catalog_visibility_policy_mode column`). **It exists in production.**

### 6.2 Policy Resolver (Slice A — fully implemented)

`server/src/services/catalogVisibilityPolicyResolver.ts` provides `resolveCatalogVisibilityPolicy()`:

- If `catalogVisibilityPolicyMode` is set and valid → use it as `EXPLICIT_POLICY`
- If not set → fall back to `publication_posture` mapping (`PUBLICATION_POSTURE_FALLBACK`):
  - `B2B_PUBLIC` / `B2C_PUBLIC` / `BOTH` → `PUBLIC`
  - `PRIVATE_OR_AUTH_ONLY` → `AUTHENTICATED_ONLY`
  - unknown → `AUTHENTICATED_ONLY` (fail-safe)
- Missing or invalid input → `AUTHENTICATED_ONLY` (`FAIL_SAFE_DEFAULT`)
- `REGION_CHANNEL_SENSITIVE` is NOT accepted in Slice A (falls through to fallback)

Resolver unit tests R-01 through R-15 exist and pass.

### 6.3 Backend Routes (tenant.ts)

| Route | Accepts `catalogVisibilityPolicyMode`? | Returns `catalogVisibilityPolicyMode`? |
|---|---|---|
| `GET /api/tenant/catalog/items` | N/A | ❌ **NOT in Prisma select — explicitly excluded** |
| `POST /api/tenant/catalog/items` | ✅ Yes — in body schema | ✅ Returns created item |
| `PATCH /api/tenant/catalog/items/:id` | ✅ Yes — in body schema | ✅ Returns updated item |
| `GET /api/tenant/catalog/items/:itemId` | N/A | (not verified in this inspection) |

**Critical gap:** `GET /api/tenant/catalog/items` does NOT return `catalogVisibilityPolicyMode` in its Prisma select. The tenant supplier cannot read the current visibility setting from the list endpoint.

Role gate on POST/PATCH: `OWNER` or `ADMIN` only. MEMBER/VIEWER cannot mutate.

Special handling on PATCH: when `catalogVisibilityPolicyMode === 'HIDDEN'`, an additional guard check exists at line ~3216.

### 6.4 Public B2B Projection (publicB2BProjection.service.ts)

Six projection gates:
- Gate A: `tenant.publicEligibilityPosture === 'PUBLICATION_ELIGIBLE'`
- Gate B: `org.publication_posture IN ('B2B_PUBLIC', 'BOTH')`
- Gate C: `org.org_type === 'B2B'`
- Gate D: `org.status IN ('ACTIVE', 'VERIFICATION_APPROVED')`
- Gate E: `org.is_qa_sentinel === false`
- Output gate: prohibited fields never appear in public payload

**Critical finding:** The offering preview query in `publicB2BProjection.service.ts` filters items by `publication_posture IN ('B2B_PUBLIC', 'BOTH')` only. It does **NOT** filter out items with `catalog_visibility_policy_mode = 'HIDDEN'`. A HIDDEN item with `B2B_PUBLIC` posture could currently appear in the public offering preview on `/b2b`. **This must be fixed in the implementation unit.**

### 6.5 Frontend Service (catalogService.ts)

`CatalogItem` interface: does **NOT** include `catalogVisibilityPolicyMode`.
`CreateCatalogItemRequest`: does **NOT** include `catalogVisibilityPolicyMode`.
`UpdateCatalogItemRequest`: does **NOT** include `catalogVisibilityPolicyMode`.

Both the API client and frontend type system are missing this field entirely.

### 6.6 Supplier Catalogue Management UI

The B2B supplier catalogue management UX surface is **partially identified**:
- `WLStorefront.tsx` and related WL components are **buyer-facing** (storefront display), not supplier management.
- `WhiteLabelAdmin/WLCollectionsPanel.tsx` and `WLOrdersPanel.tsx` are WL-specific admin panels.
- **No dedicated B2B supplier catalogue item create/edit UI component was identified** outside the WL path.
- The backend API for tenant catalogue management exists (`POST/PATCH /api/tenant/catalog/items`), but the frontend form surface is not clearly identified.

**This is a prerequisite for the implementation unit:** the implementation opening must identify the exact B2B supplier catalogue item create/edit UI surface before implementing the visibility control. This may require a new component or extension of an existing one.

### 6.7 E2E Test Data Contract (for reference)

From `tests/e2e/catalog-visibility-policy-gating.spec.ts`:
- `QA-B2B-FAB-002`: `publicationPosture=B2B_PUBLIC`, `catalogVisibilityPolicyMode=NULL` (open)
- `QA-B2B-FAB-003`: `publicationPosture=B2B_PUBLIC`, `priceDisclosurePolicyMode=RELATIONSHIP_ONLY`
- `QA-B2B-FAB-004`: `publicationPosture=B2B_PUBLIC`, `catalogVisibilityPolicyMode=APPROVED_BUYER_ONLY`
- `QA-B2B-FAB-005`: `publicationPosture=B2B_PUBLIC`, `catalogVisibilityPolicyMode=APPROVED_BUYER_ONLY`
- `QA-B2B-FAB-006`: `publicationPosture=PRIVATE_OR_AUTH_ONLY`, `catalogVisibilityPolicyMode=HIDDEN`

---

## 7) Design Question 1: Control Location

### Recommendation: Product-level control on the supplier catalogue item create/edit form

**Rationale:**
- `catalog_visibility_policy_mode` is stored at the `catalog_items` level — item-level control is the natural fit.
- The backend already accepts this field on both `POST` and `PATCH /api/tenant/catalog/items`.
- The most intuitive UX: when a supplier creates or edits a catalogue item, they see and control its visibility alongside other item properties.
- This mirrors how B2B suppliers naturally think ("this specific product is for approved buyers only").

**Alternatives rejected:**

| Alternative | Reason Rejected |
|---|---|
| Tenant-wide (organisation-level) setting only | Too coarse; precludes per-item control granularity that the backend already supports |
| Company Profile / Public Profile area | Belongs to tenant-level public readiness (`publicEligibilityPosture`), not item-level gating |
| Catalogue-level setting (all items in a collection) | No catalogue/collection grouping model in current product for this purpose; premature abstraction |
| Publication posture only (existing field) | `publication_posture` is a coarser posture signal; `catalogVisibilityPolicyMode` is the explicit item-level control |
| Tenant settings page (separate) | Creates navigation friction; item-level control belongs with item management |

**Location in B2B workspace:** Supplier catalogue item create/edit form, under a "Visibility" or "Access" section, alongside existing fields (name, SKU, price, material, etc.).

**Prerequisites for implementation unit:**
The implementation opening must confirm whether this form exists in the B2B tenant dashboard (separate from WL admin) or must be created/extended. Current repo truth did not identify a dedicated non-WL B2B supplier catalogue item edit form. This must be resolved before implementation scope is declared.

---

## 8) Design Question 2: Control Scope

### Recommendation: Per-product (item-level) with NULL default

**Scope decision:** `catalogVisibilityPolicyMode` is set per catalogue item. No tenant-wide default override in MVP.

**Rationale:**
- The DB column is already item-scoped.
- The resolver already handles NULL gracefully (falls back to `publication_posture` mapping).
- Different items in the same supplier's catalogue may have different access requirements (e.g., standard fabrics visible to all buyers, custom/exclusive items visible to approved buyers only).
- Tenant-wide default is a future enhancement (post-MVP).

**Effective visibility for existing items:** No migration needed. NULL `catalogVisibilityPolicyMode` continues to fall through to `publication_posture` mapping via the resolver. Existing behavior is preserved.

**Publication posture prerequisite:** `catalogVisibilityPolicyMode` only applies meaningfully when the item's `publication_posture` is set appropriately. For an item with `PRIVATE_OR_AUTH_ONLY` posture, the resolver maps to `AUTHENTICATED_ONLY` regardless of `catalogVisibilityPolicyMode`. The implementation unit must surface this interaction clearly in the UI.

---

## 9) Design Question 3: Who Can Change It

### Recommendation: OWNER and ADMIN only

| Role | Can view current setting? | Can change setting? |
|---|---|---|
| OWNER | ✅ Yes | ✅ Yes |
| ADMIN | ✅ Yes | ✅ Yes |
| MEMBER | ✅ Read-only | ❌ No |
| VIEWER | Not applicable | ❌ No |

**Rationale:** Same role gate already enforced at the route level for `POST /api/tenant/catalog/items` and `PATCH /api/tenant/catalog/items/:id`. No new role enforcement needed.

**Superadmin override:** Superadmin can update via control-plane catalog item management routes. No change needed. No special superadmin-specific visibility control UI required in this unit.

---

## 10) Design Question 4: Default Visibility

| Scenario | Recommended Default | Rationale |
|---|---|---|
| New products | `catalogVisibilityPolicyMode = NULL` | Inherits from `publication_posture`; effective mode = `AUTHENTICATED_ONLY` for default `PRIVATE_OR_AUTH_ONLY` posture |
| Existing products (no explicit mode set) | `catalogVisibilityPolicyMode = NULL` | No migration; resolver fallback preserves current behavior |
| New tenants | Same as new products | No special handling needed |
| Tenants with incomplete profile | Not controlled by this field | Tenant eligibility is gated by `publicEligibilityPosture` on `tenants` table, which is separate |
| Tenants not approved/public-ready | Not controlled by this field | Same — handled by tenant-level Gate A/D in public projection |
| Demo/QA products | `catalogVisibilityPolicyMode = NULL` or `HIDDEN` | QA/demo data should use HIDDEN if not intended for discovery; existing QA seed already uses HIDDEN for `QA-B2B-FAB-006` |
| Real supplier products (public) | `catalogVisibilityPolicyMode = NULL` (or `PUBLIC` if explicitly desired) | NULL with B2B_PUBLIC posture resolves to PUBLIC; no forced migration |

**Do not auto-set** `catalogVisibilityPolicyMode` for existing items during migration. Preserve NULL/fallback behavior. Only a supplier explicitly setting a visibility level creates an explicit mode.

---

## 11) Design Question 5: Product/Card/Public Listing Impact

### When item is PUBLIC (or NULL + B2B_PUBLIC posture):
- Appears in `/b2b` supplier offering preview (up to 5 items per supplier)
- Accessible to all authenticated B2B buyers via catalogue browse
- Accessible to unauthenticated public (if posture gate also passes)
- Appears in supplier public profile page
- Searchable in B2B discovery

### When item is AUTHENTICATED_ONLY (or NULL + PRIVATE_OR_AUTH_ONLY posture):
- NOT accessible to unauthenticated users
- Accessible to all authenticated B2B buyers (no relationship required)
- Does NOT appear in public offering previews on `/b2b`

### When item is APPROVED_BUYER_ONLY (or RELATIONSHIP_GATED treated equivalently in Slice C):
- Accessible only to authenticated buyers with APPROVED relationship with this supplier
- Buyers with REQUESTED or no relationship see a "not available" response
- Does NOT appear in public offering previews on `/b2b`

### When item is HIDDEN:
- Excluded from ALL buyer-facing surfaces
- Not accessible even to authenticated buyers
- **Must be excluded from public offering preview** in `publicB2BProjection.service.ts` — this is a known gap requiring implementation fix
- Not accessible via RFQ prefill path
- Returns ITEM_NOT_AVAILABLE on all buyer access paths

### Public surfaces that must respect visibility:
| Surface | HIDDEN | APPROVED_BUYER_ONLY | AUTHENTICATED_ONLY | PUBLIC |
|---|---|---|---|---|
| `/b2b` offering preview | ❌ Excluded | ❌ Excluded | ❌ Excluded (unauthenticated) | ✅ Shown (max 5/supplier) |
| Public supplier profile | ❌ Excluded | ❌ Excluded | ❌ Excluded (unauthenticated) | ✅ Shown |
| Authenticated catalogue browse | ❌ Hidden | ✅ APPROVED only | ✅ All authenticated | ✅ All authenticated |
| RFQ prefill path | ❌ Blocked | ✅ APPROVED only | ✅ All authenticated | ✅ All authenticated |
| Search/discovery | ❌ Excluded | ❌ Excluded (no preview) | ❌ Excluded (public) | ✅ Shown |

---

## 12) Design Question 6: Public/Private Boundary

### MUST NEVER be publicly exposed:
| Data | Reason |
|---|---|
| `catalog_visibility_policy_mode` field value | Internal access-control field — never in buyer-facing or public responses; already excluded from GET list and public projection |
| `publication_posture` field value | Internal configuration field |
| Price / pricing | Governed separately by price disclosure policy |
| Org UUIDs (`tenantId`, internal IDs) | Internal identifiers |
| `registration_no`, CIN, Udyam, IEC | Private business identifiers |
| Certificate document URLs / signed URLs | Private storage paths |
| Storage bucket paths | Internal infrastructure detail |
| HIDDEN items | Must not appear in any buyer-visible surface |
| Draft/unpublished items (`active = false`) | Not yet ready for discovery |
| Deleted/archived items | Not in scope |
| QA/demo-only markers | `is_qa_sentinel` guards in projection; not surfaced publicly |
| `price_disclosure_policy_mode` | Policy configuration field |
| `risk_score`, `plan`, `external_orchestration_ref` | Admin/governance fields |
| `unpublished data`, `draft` fields | Not published |

### Safe to expose publicly (subject to all publication gates passing):
- `name`, `moq`, `imageUrl` — public offering preview fields
- `legalName`, `logoUrl`, `slug`, `jurisdiction` — supplier profile
- `certificationCount`, `certificationTypes` — aggregate counts only
- `taxonomy` fields (primarySegment, secondarySegments, rolePositions)
- `hasTraceabilityEvidence` — boolean only

---

## 13) Design Question 7: Save Behavior

### Control specification:

**Field label:** "Catalogue Visibility"

**Control type:** Dropdown/select (3 options for MVP)

| Option label | Maps to `catalogVisibilityPolicyMode` | When to use |
|---|---|---|
| "Visible to all buyers" | `NULL` (inherits posture) OR `PUBLIC` | Standard public catalogue items |
| "Approved buyers only" | `APPROVED_BUYER_ONLY` | Relationship-gated items |
| "Hidden from buyers" | `HIDDEN` | Draft, experimental, or de-listed items |

**Note on option rendering:**
- If `publication_posture = PRIVATE_OR_AUTH_ONLY`, show an informational note: "This item is currently private. Change the item's publication status to make it discoverable."
- `AUTHENTICATED_ONLY` and `RELATIONSHIP_GATED` are backend values but do not need separate UI options for MVP. The UI shows 3 simplified choices.

**Helper text:** "Controls who can see this item in your catalogue. Visible items appear to qualified buyers; Hidden items are not shown anywhere."

**Save behavior:**
- Saved atomically with the item's other fields on PATCH/POST submit
- Confirmation: existing success toast pattern ("Item saved successfully" or similar)
- On save failure: existing error toast pattern; no partial save
- Disabled state: control is read-only for MEMBER/VIEWER; shows current value but cannot be changed

**Refresh/readback behavior:**
- After save, a GET of the item should return the updated `catalogVisibilityPolicyMode` value
- **This requires `GET /api/tenant/catalog/items` to include `catalogVisibilityPolicyMode` in its Prisma select** (currently missing — implementation gap)
- The UI must re-render with the saved value after a successful PATCH

**Immediate public projection update:**
- Changes take effect immediately on the next public projection query
- No explicit cache invalidation required in MVP; eventual consistency via existing query patterns is acceptable
- The implementation note in `tenant.ts` already includes `emitCacheInvalidate` after catalog item changes — this may be leveraged

---

## 14) Design Question 8: Audit/Trace Requirement

### Decision: Use existing audit log pattern — YES for MVP

| Requirement | Decision |
|---|---|
| Audit log on visibility change | ✅ Yes — use existing `writeAuditLog` with `action: 'catalog.item.updated'` |
| `updated_by` | ✅ Yes — already captured as `actorId` in existing audit log on PATCH |
| `updated_at` | ✅ Yes — Prisma `updatedAt` on `catalogItem` already timestamps changes |
| `tenant event` | Not required for MVP |
| Admin/superadmin trace | Not required for MVP — existing audit log is sufficient |
| New DB fields for audit | ❌ Not required — existing `metadataJson` on audit log is sufficient |

**Implementation note:** The `catalog.item.updated` audit log `metadataJson` should include both `previousVisibilityMode` and `newVisibilityMode` fields when `catalogVisibilityPolicyMode` changes. No new DB columns needed.

---

## 15) Design Question 9: Runtime QA Script (For Later Implementation Unit)

**Pre-conditions:**
- Use QA tenant: `qa-b2b` (email: `qa.b2b@texqtic.com`) with `OWNER` role
- Buyer A: `qa.buyer.wvg.a@texqtic.com` (APPROVED relationship with `qa-b2b`)
- Buyer C: `qa.buyer.knt.c@texqtic.com` (no relationship with `qa-b2b`)
- B2B tenant dashboard at `https://app.texqtic.com` in `qa-b2b` session
- QA reference items: `QA-B2B-FAB-002` (B2B_PUBLIC, NULL mode) and `QA-B2B-FAB-006` (PRIVATE, HIDDEN)

**QA Script:**

```
QA-001: Visibility control is visible in item edit form
  Route: B2B Dashboard → Catalogue → Select item QA-B2B-FAB-002 → Edit
  Expected: "Catalogue Visibility" dropdown visible with current value "Visible to all buyers"
  Expected: OWNER user can change the value

QA-002: Save APPROVED_BUYER_ONLY mode
  Action: Change QA-B2B-FAB-002 visibility to "Approved buyers only" → Save
  Expected: Success toast displayed
  Expected: After page refresh, dropdown shows "Approved buyers only"
  Expected: PATCH /api/tenant/catalog/items/:id returns 200

QA-003: Refresh/readback check
  Action: Navigate away from item, return to item edit
  Expected: "Approved buyers only" persists in the dropdown

QA-004: Buyer access check — APPROVED buyer (Buyer A)
  Session: Buyer A (APPROVED relationship)
  Route: Browse catalogue / find QA-B2B-FAB-002 item
  Expected: Item IS visible and accessible to Buyer A

QA-005: Buyer access check — unapproved buyer (Buyer C)
  Session: Buyer C (no relationship)
  Route: Attempt to access QA-B2B-FAB-002 via catalogue browse or RFQ prefill
  Expected: Item is NOT accessible; returns ITEM_NOT_AVAILABLE or similar

QA-006: Public /b2b offering preview check after APPROVED_BUYER_ONLY
  Route: Unauthenticated GET /api/public/b2b/suppliers
  Expected: QA-B2B-FAB-002 does NOT appear in qa-b2b offering preview (APPROVED_BUYER_ONLY items excluded from public preview)

QA-007: Save HIDDEN mode
  Session: qa-b2b OWNER
  Action: Change QA-B2B-FAB-002 visibility to "Hidden from buyers" → Save
  Expected: Success toast; readback shows "Hidden from buyers"

QA-008: HIDDEN item excluded from public projection
  Route: GET /api/public/b2b/suppliers
  Expected: QA-B2B-FAB-002 NOT in offering preview
  Expected: `catalog_visibility_policy_mode` field NOT present in public response

QA-009: HIDDEN item excluded from authenticated buyer catalogue
  Session: Buyer A (APPROVED)
  Route: Browse catalogue or GET /api/tenant/catalog/supplier/:supplierOrgId/items
  Expected: QA-B2B-FAB-002 not returned

QA-010: Restore to "Visible to all buyers" → verify reappearance
  Session: qa-b2b OWNER
  Action: Change back to "Visible to all buyers" → Save
  Expected: Item reappears in public offering preview (if posture = B2B_PUBLIC)

QA-011: MEMBER role cannot change visibility
  Session: qa-b2b MEMBER role user
  Route: Item edit form
  Expected: Visibility dropdown is read-only (disabled) or not shown for edit

QA-012: Negative check — `catalog_visibility_policy_mode` never in public API responses
  Route: GET /api/public/b2b/suppliers/:slug
  Expected: Response body does NOT contain `catalog_visibility_policy_mode` field (already tested in E2E spec, must remain true)
```

---

## 16) Design Question 10: Product Acceptance Criteria

1. As a B2B supplier OWNER or ADMIN, I can open any catalogue item's edit form and see a "Catalogue Visibility" control showing the current setting.
2. As a B2B supplier OWNER or ADMIN, I can change the visibility to "Visible to all buyers", "Approved buyers only", or "Hidden from buyers" and save the change.
3. After saving, I see a success confirmation and the control shows the saved value.
4. After refreshing the page, the visibility setting I saved is still shown correctly.
5. When I set an item to "Hidden from buyers", it does not appear in any buyer discovery surface (catalogue browse, public supplier profile, `/b2b` offering preview, RFQ prefill).
6. When I set an item to "Approved buyers only", only buyers with an APPROVED relationship with my organisation can access it; unapproved buyers cannot.
7. When I set an item to "Visible to all buyers" and my organisation has B2B_PUBLIC posture, the item appears in public B2B discovery.
8. The visibility control is read-only (non-editable) for MEMBER role users.
9. The `catalog_visibility_policy_mode` field never appears in any public-facing API response.
10. Existing items with no visibility mode set continue to work as before (NULL falls back to publication posture mapping).
11. The control is clearly labelled and has helper text explaining the effect.

---

## 17) Recommended Implementation Lane

**Lane B — Bounded Fix** (3–5 source files, no new DB/schema/RLS changes required, existing backend API already supports the field)

**Rationale:**
- DB column `catalog_visibility_policy_mode` already exists.
- Backend POST/PATCH routes already accept the field.
- Policy resolver is fully implemented and tested.
- Gaps are frontend-only plus two backend read-path additions:
  1. Add `catalogVisibilityPolicyMode` to the GET list response
  2. Exclude HIDDEN items from public B2B offering preview
  3. Add field to frontend interfaces and UI control

**However**: If the B2B supplier catalogue item create/edit UI form does not yet exist (non-WL B2B path), scope may expand to Lane A (new UI surface). The implementation unit must determine this at opening (GR-008 required).

---

## 18) Expected Source Allowlist for Later Implementation Unit

**Confirmed required files (backend + frontend contract):**
1. `server/src/routes/tenant.ts` — Add `catalogVisibilityPolicyMode` to `GET /api/tenant/catalog/items` Prisma select (around line 2835 select block); must NOT expose to public buyer routes
2. `server/src/services/publicB2BProjection.service.ts` — Add filter to exclude items with `catalog_visibility_policy_mode = 'HIDDEN'` from offering preview query
3. `services/catalogService.ts` — Add `catalogVisibilityPolicyMode?: string | null` to `CatalogItem`, `CreateCatalogItemRequest`, `UpdateCatalogItemRequest` interfaces

**Frontend UI surface (to be confirmed at implementation opening):**
4. One of: existing B2B catalogue item create/edit form component (if it exists and is identified), or new `B2BCatalogManagement.tsx` component (if no such form currently exists for non-WL B2B path)

**Tests that may require update:**
5. `server/src/__tests__/catalogRouteVisibility.test.ts` — verify GET list response includes `catalogVisibilityPolicyMode`
6. `server/src/__tests__/public-b2b-projection.unit.test.ts` — add test for HIDDEN item exclusion from offering preview

**Forbidden files for later implementation (do not touch):**
- `server/prisma/schema.prisma` — no schema changes needed
- `server/prisma/migrations/` — no new migrations needed
- Any auth/session/RLS policy files
- Any CRM/CAE/payment/legal files
- `server/src/__tests__/catalogVisibilityPolicyResolver.test.ts` — resolver is already correct; do not modify

---

## 19) Expected Validation Commands for Later Implementation Unit

```bash
# Prisma validate (no schema changes expected, but verify no drift)
pnpm -C server exec prisma validate

# TypeScript typecheck — server
pnpm --filter server typecheck

# TypeScript typecheck — frontend
pnpm typecheck

# Focused server unit tests
pnpm -C server exec vitest run src/__tests__/catalogVisibilityPolicyResolver.test.ts
pnpm -C server exec vitest run src/__tests__/catalogRouteVisibility.test.ts
pnpm -C server exec vitest run src/__tests__/public-b2b-projection.unit.test.ts
pnpm -C server exec vitest run src/__tests__/relationshipCatalogVisibility.test.ts

# Git diff clean check
git diff --check

# Git staged files confirmation (must be allowlist only)
git diff --name-only --staged
```

---

## 20) Stop Conditions for Later Implementation Unit

**Stop and report if any of the following:**
- DB schema changes are required (should not be — if they are, stop and re-evaluate)
- `catalog_visibility_policy_mode` column is missing from the remote DB (check `pnpm -C server exec prisma db pull` result)
- The B2B supplier catalogue item edit form does not exist and scope grows beyond 6 files (elevate to Lane A)
- Adding `catalogVisibilityPolicyMode` to the GET list response breaks any existing test
- Any public-facing API response starts returning `catalog_visibility_policy_mode` (must be caught and stopped)
- RLS policy changes are required (should not be — visibility policy is application-layer, not RLS-layer)
- Removing HIDDEN items from public offering preview changes the offering preview count in unexpected ways that break existing tests

---

## 21) Final Design-Intake Enum

`FTR_SL_017_DESIGN_INTAKE_COMPLETE_READY_FOR_IMPLEMENTATION_OPENING`

**Qualification:** All 8 required TECS §10 gate decisions are made. Implementation can open as Lane B (or Lane A if supplier catalogue item edit form is missing). GR-008 repo-truth revalidation is required at implementation opening.

---

## 22) Next Recommended Unit

**`FTR-SL-017A-B2B-CATALOGUE-VISIBILITY-CONTROL-IMPLEMENTATION-01`**

Lane B (or Lane A pending GR-008 check at opening) implementation unit.

**Pre-work for Paresh before opening implementation:**
1. Confirm: Does a B2B supplier catalogue item create/edit form exist in the non-WL B2B dashboard path?
2. If YES: identify the exact component file path
3. If NO: confirm scope elevation to Lane A to create a new B2B catalogue management surface first (or confirm WL admin panel is the intended management surface for all B2B suppliers)

Opening checklist for implementation unit:
- GR-008 repo-truth revalidation at opening
- Confirm allowlist (max 6 files as bounded fix, more if new UI surface needed)
- Verify `catalog_visibility_policy_mode` column exists in remote DB via `prisma db pull` check
- Confirm GET list response currently excludes `catalogVisibilityPolicyMode` (expected — add it)
- Implement in sequence: (1) backend GET response fix, (2) public projection HIDDEN filter, (3) frontend interface types, (4) UI control

---

## 23) Governance / Validation Outputs

### 23.1 TECS §10 Gate Satisfaction

| Required Decision | Status |
|---|---|
| Control location | ✅ Product-level, catalogue item create/edit form |
| Who can change it | ✅ OWNER and ADMIN only |
| Default visibility | ✅ NULL (inherits from publication_posture via resolver) |
| Product/card/listing impact | ✅ Defined in §11 |
| Public/private boundary | ✅ Defined in §12 |
| Save behavior | ✅ Defined in §13 |
| Runtime QA script | ✅ Defined in §15 (QA-001 through QA-012) |
| Acceptance criteria | ✅ Defined in §16 |

All 8 gate decisions complete. FTR-SL-017 design-intake gate is satisfied.

### 23.2 Files Changed in This Unit

- `governance/launch-readiness/FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-DESIGN-INTAKE-01.md` (this file — created)
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (bounded update — design-intake opened and gate result recorded)

No source files modified. No DB, schema, migration, or public projection changes in this unit.
