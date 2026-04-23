# TEXQTIC — B2B Catalog Alignment / Surface Truth Hardening
## Unit: CATALOG-ALIGNMENT-HARDENING-001

**Version:** v1  
**Branch:** main  
**Status:** IMPLEMENTED — awaiting commit  
**Governance posture:** TECS `HOLD-FOR-BOUNDARY-TIGHTENING`, D-016 active  

---

## Purpose

This unit corrects factually incorrect UI copy, removes phantom field usage, surfaces two DB-backed fields (description, moq) in catalog add/edit forms, and aligns the OpenAPI tenant contract with existing route implementations — all without schema changes, new migrations, or new backend routes.

---

## Scope

Bounded to the three allowlisted files:
- `App.tsx` — UI copy, phantom field removal, form field surfaces, product card body
- `services/catalogService.ts` — service interface comment hardening (no structural change)
- `shared/contracts/openapi.tenant.json` — PATCH + DELETE for `/api/tenant/catalog/items/{id}`

A fourth file — `docs/TEXQTIC-B2B-CATALOG-ALIGNMENT-HARDENING-001-v1.md` — is this artifact (create only).

---

## Source Artifacts Reviewed

| Artifact | Finding |
|---|---|
| Investigation doc (CRM-PLATFORM-DATA-REALITY-RECONCILIATION-INVESTIGATION-v1.md) | Confirmed: `category` has no DB column; `description`, `moq`, `imageUrl` are live DB columns |
| TECS.md | Posture `HOLD-FOR-BOUNDARY-TIGHTENING`; `pnpm run typecheck` + `pnpm -C server run lint` required |
| governance/control/D-016-B2B-CATALOG-SURFACE-HARDENING-001.md | Unit governance — surfaces this task |
| App.tsx (full) | Read prior to edit; confirmed structure of add/edit forms, product grids, edit modal |
| services/catalogService.ts | Confirmed `category?: string` has no DB backing; `description?` and `moq?` already typed |
| shared/contracts/openapi.tenant.json catalog section | Confirmed PATCH and DELETE for `/{id}` were absent |
| server/src/routes/tenant.ts (read-only) | Confirmed `PATCH /api/tenant/catalog/items/:id` and `DELETE /api/tenant/catalog/items/:id` exist and are live |

---

## Confirmed Root Misalignments

| # | Misalignment | Surface |
|---|---|---|
| A | Subtitle "Tiered pricing and MOQ enforcement active" — factually false; no tiered pricing exists in the schema | B2B workspace header |
| B | `p.category \|\| 'General'` phantom field usage — `category` is not a DB column; renders undefined at runtime | WL Admin product grid, B2B workspace product card |
| C | `description` and `moq` fields not exposed in supplier catalog add form — DB columns populated silently | B2B add form |
| C-edit | `description` and `moq` fields not exposed in edit modal — also not populated into edit form state | Edit modal |
| D | imageUrl rendering in B2B product card — **CONFIRMED ALREADY IMPLEMENTED** (governance unit `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` closed this) | B2B workspace product grid |
| E | PATCH and DELETE for `/api/tenant/catalog/items/{id}` absent from OpenAPI tenant contract despite live backend routes | shared/contracts/openapi.tenant.json |
| F | `category?: string` comment in `CatalogItem` interface insufficient — described only as "CLIENT-ONLY — NOT a DB column" | services/catalogService.ts |

---

## Exact UI Truth Corrections

### Part A — Subtitle (IMPLEMENTED IN THIS UNIT)

**CONFIRMED REPO TRUTH:** No tiered pricing system, tier table, or MOQ enforcement logic exists in `schema.prisma`.

- **Before:** `<p className="text-slate-500">Tiered pricing and MOQ enforcement active.</p>`
- **After:** `<p className="text-slate-500">Manage your wholesale product catalog.</p>`
- **Location:** `renderDescriptorAlignedTenantContentFamily` → `b2b_workspace` case

### Part B — Phantom Category Removal (IMPLEMENTED IN THIS UNIT)

Two occurrences removed:

1. **WL Admin product grid** (`renderWLAdminContent()` → `case 'products':`)
   - Removed: `<div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">{p.category || 'General'}</div>`

2. **B2B workspace product card** (`renderDescriptorAlignedTenantContentFamily` → `b2b_workspace`)
   - Removed: `<div className="text-xs text-slate-400 font-bold uppercase">{p.category || 'General'}</div>`
   - Added: `{p.description && <p className="text-xs text-slate-500 line-clamp-2">{p.description}</p>}`

---

## Field Surfaces Added

### Part C — Description and MOQ in Add Form (IMPLEMENTED IN THIS UNIT)

`addItemFormData` initial state extended:
- Before: `{ name: '', price: '', sku: '', imageUrl: '' }`
- After: `{ name: '', price: '', sku: '', imageUrl: '', description: '', moq: '' }`

`handleCreateItem` updated to send `description` and `moq` to `createCatalogItem()`.

B2B add form UI: grid row added with description textarea and moq number input (after imageUrl field, before submit buttons).

### Part C-edit — Description and MOQ in Edit Form (IMPLEMENTED IN THIS UNIT)

`editItemFormData` initial state extended to match add form.

`resetEditItemState` updated to reset new fields (and `setEditItemError(null)` preserved — verified).

`handleOpenEditItem` updated to populate `description` and `moq` from the product record when opening the modal.

`handleUpdateItem` updated to include `description` (nullable) and `moq` (optional) in the `updateCatalogItem()` call.

Edit modal UI: description textarea and moq number input added inside the existing grid (after Image URL field, md:col-span-2 + single col layout).

### Part D — imageUrl in Product Grid (OUT OF SCOPE — already implemented)

**CONFIRMED REPO TRUTH:** `p.imageUrl ? <img> : <div>Image unavailable</div>` rendering was already in place in `renderDescriptorAlignedTenantContentFamily` at the time of this unit. Governance unit `TENANT-CATALOG-PLACEHOLDER-IMAGE-DNS-002` (closed) addressed this. No change needed.

---

## Service / Type Alignment Changes

### Part F — CatalogItem `category` comment (IMPLEMENTED IN THIS UNIT)

File: `services/catalogService.ts`

**Decision:** `category?: string` is retained in the interface — removing it would cascade TypeScript errors into `WLStorefront.tsx`, `WLCollectionsPanel.tsx`, `WLProductDetailPage.tsx`, all of which are outside this unit's allowlist.

**Change:** Comment replaced with a full JSDoc `@deprecated` block:

```typescript
/**
 * @deprecated Phantom client-side field. No DB column exists for category on catalog_items.
 * Retained for backward compatibility with WL surfaces that derive grouping from this field.
 * Do not rely on this field in new code — it is always undefined at runtime.
 */
category?: string;
```

**`description` and `moq` typing:** Already present in `CreateCatalogItemRequest` and `UpdateCatalogItemRequest` — no change needed.

---

## OpenAPI Contract Changes

### Part E — PATCH + DELETE for `/api/tenant/catalog/items/{id}` (IMPLEMENTED IN THIS UNIT)

File: `shared/contracts/openapi.tenant.json`

**Context:** Backend routes `PATCH /api/tenant/catalog/items/:id` and `DELETE /api/tenant/catalog/items/:id` were implemented and live in `server/src/routes/tenant.ts`. The OpenAPI contract had no entry for these paths.

**Change:** New path object `"/api/tenant/catalog/items/{id}"` inserted between `"/api/tenant/catalog/items"` and `"/api/tenant/aggregator/discovery"`.

**PATCH** — partial update with optional body properties: `name`, `sku`, `imageUrl`, `description`, `price`, `moq`, `active`. Returns 200, 401, 404, 422.

**DELETE** — hard delete (no archive path). Returns `{ id, deleted: true }` on 200, 401, 404.

**publicationPosture** — explicitly documented as not patchable via this route (per existing backend validation).

---

## Answers to Required Governance Questions

1. **Does any change in this unit modify `schema.prisma` or any migration file?**  
   NO. Zero DB changes. All fields (`description`, `moq`, `imageUrl`) were already in the schema.

2. **Does any change add a new backend route?**  
   NO. PATCH and DELETE routes were already live. The OpenAPI contract was updated to reflect existing reality.

3. **Does any change touch auth middleware, RLS policy, or org_id scoping?**  
   NO. No auth, RLS, or tenancy changes.

4. **Is `category` removed from `CatalogItem`?**  
   NO. It is retained with a `@deprecated` JSDoc comment. WL surfaces (`WLStorefront.tsx`, `WLCollectionsPanel.tsx`, `WLProductDetailPage.tsx`) depend on it and are outside this allowlist.

5. **Does any change affect non-allowlisted files?**  
   NO. Exactly three files modified: `App.tsx`, `services/catalogService.ts`, `shared/contracts/openapi.tenant.json`.

6. **Were imageUrl changes needed for Part D?**  
   NO. Already implemented (confirmed by reading `renderDescriptorAlignedTenantContentFamily` product card code — `p.imageUrl ? <img …> : <div>Image unavailable</div>` was present).

7. **Static gate results — any new errors introduced?**  
   NO. Typecheck: 6 pre-existing server errors (unchanged). Frontend: 0 errors. Lint: 5 pre-existing errors, 6 warnings (unchanged).

8. **Is this unit complete?**  
   YES for the bounded scope. Follow-on catalog unit required (see below).

---

## Verification Performed

### VERIFIED — `pnpm run typecheck`

Frontend: 0 new errors  
Server (pre-existing, unchanged):
- `src/routes/tenant.ts(189,58): error TS7006` — parameter 'entry' implicit any
- `src/routes/tenant.ts(190,50): error TS7006` — parameter 'entry' implicit any
- `src/services/tenantProvision.service.test.ts(228,7): error TS2345` — test type mismatch
- `src/types/tenantProvision.types.ts(242,7): error TS2322` — undefined not assignable
- `src/types/tenantProvision.types.ts(245,7): error TS2322` — undefined not assignable
- `src/types/tenantProvision.types.ts(446,53): error TS2339` — Property 'data' union

**Zero new errors from this unit.**

### VERIFIED — `pnpm run lint`

Result: 11 problems (5 errors, 6 warnings) — same as pre-unit baseline.  
Errors are in `App.tsx` (line 3345, HTMLFormElement — pre-existing), `layouts/Shells.tsx` (line 172, HTMLDetailsElement — pre-existing), `tests/phase1-foundation-correction-routing-authority.test.tsx` (line 90, Buffer — pre-existing).  
**Zero new lint errors from this unit.**

### VERIFIED — Git preflight

```
git status --short  →  M App.tsx  |  M services/catalogService.ts  |  M shared/contracts/openapi.tenant.json
git diff --name-only  →  App.tsx  |  services/catalogService.ts  |  shared/contracts/openapi.tenant.json
```

Exactly the 3 allowlisted files. No file creep.

---

## Explicit Out-of-Scope Items

| Item | Reason |
|---|---|
| Removing `category?: string` from `CatalogItem` | WL surfaces depend on it; cascade TypeScript errors outside allowlist |
| Updating `WLStorefront.tsx`, `WLCollectionsPanel.tsx`, `WLProductDetailPage.tsx` | Outside allowlist; separate unit required |
| Adding server-side tiered pricing | No spec, no schema — out of scope for all current units |
| Adding MOQ enforcement / order quantity validation | Requires product spec + schema changes — separate unit |
| Updating `createCatalogItem` backend to validate `moq` range | Backend route already handles this; no change needed |
| Removing `category` from WL route handlers | Backend never returns `category` — nothing to remove |

---

## Recommended Follow-On Catalog Unit

**CATALOG-CATEGORY-DEPRECATION-002**: Remove `category?: string` from `CatalogItem` after `WLStorefront.tsx`, `WLCollectionsPanel.tsx`, and `WLProductDetailPage.tsx` are updated to derive grouping from an allowlisted alternative field (e.g., tags array, or explicit WL collection membership). This unit is blocked until those WL surfaces are in scope.

---

*Implementation unit closed: CATALOG-ALIGNMENT-HARDENING-001 — main branch*
