# FTR-SL-016B2 — B2B Company Profile Rich Fields: API / Schema Design

## 1. Unit Identity

- **Unit ID:** `FTR-SL-016B2-B2B-COMPANY-PROFILE-RICH-FIELDS-API-SCHEMA-DESIGN-01`
- **Date:** 2026-06-13
- **Mode:** Design-only / repo-truth investigation / governance artifact
- **Chain from:** FTR-SL-016B1A (runtime-verified), FTR-SL-016B (design closure), FTR-SL-016B1 (widget implementation)
- **Final enum:** `FTR_SL_016B2_RICH_COMPANY_PROFILE_FIELD_MODEL_DESIGN_COMPLETE`

---

## 2. Repo Preflight

- Branch: `main`
- HEAD before: `70b3326593c3f46faa3a9b841bffa98f851dd8e4`
- Origin sync: yes
- Initial worktree: clean
- Final HEAD: recorded after governance commit/push
- Final worktree: clean

---

## 3. Repo-Truth Findings

### 3.1 Current Company Profile Frontend

**Integration point:** `components/Tenant/B2BProfileSettings.tsx`

**Current sections:**

1. **Company Name** — editable `displayName` text input (OWNER/ADMIN only, maps to `organizations.legal_name` + `tenants.name`).
2. **Company Logo** — upload via `POST /api/tenant/profile/logo/upload`, persist via `PUT /api/tenant/branding`; stored in `tenant_branding.logo_url`. JPG/PNG/WEBP, 2 MB max.
3. **Tenant Identity** — read-only: slug, type, status, plan. Not editable by tenant.
4. **Access Model** — static copy only.
5. **Certifications & Documents** — widget from FTR-SL-016B1, showing certification summary and document access. Read-only metadata; upload/remove for OWNER/ADMIN.

**Profile completeness:** 3 checks only — display name, logo, and secondary segment count.

**`canEdit`:** derived from `profile.canEdit` from the backend, based on whether user role is OWNER or ADMIN. Frontend correctly gates all mutation controls behind this flag.

**Current navigation:** accessed via shell `🏢 Company Profile` nav item, routed through `App.tsx` `appState === 'SETTINGS'`.

### 3.2 Current Tenant Profile API Contract

**Routes:**

- `GET /api/tenant/profile` — reads `organizations` + `tenantBranding`. Returns:
  - `id`, `slug`, `displayName` (from `organizations.legal_name`), `tenantType`, `status`, `plan`
  - `primarySegmentKey`, `secondarySegmentKeys[]`, `rolePositionKeys[]`
  - `logoUrl` (from `tenantBranding.logo_url`)
  - `canEdit` (OWNER or ADMIN)

- `PUT /api/tenant/profile` — OWNER/ADMIN only. Accepts **only** `{ displayName }`. Updates `organizations.legal_name` and `tenants.name`. Writes audit log. Returns same profile shape.

**Current OpenAPI entries in `shared/contracts/openapi.tenant.json`:** Confirmed tenant profile read/update, branding update, and logo upload are all documented.

### 3.3 Current Schema / Data Model

**`organizations` table (raw SQL model via `@@map`):**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK, also FK to `tenants.id` |
| `slug` | varchar(100) | unique |
| `legal_name` | varchar(500) | company display name |
| `jurisdiction` | varchar(100) | default "UNKNOWN" — used in public projection |
| `registration_no` | varchar(200)? | nullable — used in DPP; PROHIBITED from public payload |
| `org_type` | varchar(50) | "B2B", "B2C" etc |
| `risk_score` | smallint | internal only |
| `status` | varchar(30) | lifecycle state |
| `plan` | varchar(30) | commercial plan |
| `publication_posture` | varchar(30) | "PRIVATE_OR_AUTH_ONLY", "B2B_PUBLIC", "BOTH" |
| `primary_segment_key` | varchar(100)? | textile taxonomy |
| `is_white_label` | boolean | |
| `is_qa_sentinel` | boolean | |

**No `website`, `description`, `bio`, `tagline`, `city`, `address`, `phone`, `email`, `capacity`, `lead_time`, or contact fields exist on `organizations`.**

**`tenants` table:**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `slug` | varchar(100) | |
| `name` | varchar(255) | display name (kept in sync with `legal_name`) |
| `type` | TenantType enum | B2B, B2C etc |
| `status` | TenantStatus enum | |
| `plan` | TenantPlan enum | |
| `publicEligibilityPosture` | enum | `NO_PUBLIC_PRESENCE`, `PUBLICATION_ELIGIBLE` |

**`tenant_branding` table:**

| Column | Type | Notes |
|---|---|---|
| `logo_url` | varchar(500)? | public logo URL |
| `theme_json` | JSON? | WL color theme |

**Adjacent child tables of `organizations`:**

- `organization_secondary_segments` — segment keys
- `organization_role_positions` — role position keys
- `gst_verifications` — GSTIN, state code, legal name on GST, verification status, provider result. Admin-only reviewed data.

**`catalog_items`:**

- `moq`, `description`, `product_category`, `fabric_type`, `publicationPosture` — exist but are per-item, not org-level profile.

### 3.4 Current Public B2B Projection

**`publicB2BProjection.service.ts` output type `PublicB2BSupplierEntry`:**

| Field | Source | Notes |
|---|---|---|
| `slug` | `organizations.slug` | |
| `legalName` | `organizations.legal_name` | |
| `logoUrl` | `tenantBranding.logo_url` | |
| `orgType` | `organizations.org_type` | |
| `jurisdiction` | `organizations.jurisdiction` | |
| `certificationCount` | count of `certifications` with `issuedAt NOT NULL` | |
| `certificationTypes` | deduped cert types (max 10) | |
| `hasTraceabilityEvidence` | presence of SHARED traceability nodes | |
| `taxonomy` | primary/secondary segment + role positions | |
| `offeringPreview` | up to 5 active B2B_PUBLIC catalog items; name/moq/imageUrl only | |
| `publicationPosture` | B2B_PUBLIC or BOTH | |
| `eligibilityPosture` | PUBLICATION_ELIGIBLE | |

**Explicitly prohibited from public payload:** price, org UUID, negotiation/order state, admin/governance fields, `risk_score`, plan, `registration_no`, `external_orchestration_ref`, draft/unpublished data.

**Six safety gates** must all pass before a supplier appears in public projection.

---

## 4. Rich Profile Field Model — Section-by-Section

### 4.1 Company Identity

| Field | Current state | Proposed |
|---|---|---|
| Display / legal name | Exists (`organizations.legal_name`) | Keep, make edit clearer |
| Tagline / short intro | MISSING | Add as short free-text |
| Full description | MISSING | Add as long free-text |
| Logo | Exists (`tenant_branding.logo_url`) | Keep, improve preview |
| Banner / cover image | MISSING | Defer to media gallery slice |

**Minimum viable:** tagline and description are the critical missing pieces. Both are short strings and fit naturally as nullable columns on `organizations` or as an extension table.

### 4.2 Business Details

| Field | Current state | Proposed |
|---|---|---|
| Company type / org type | Exists (`org_type`) | Read-only (system-set) |
| Year established | MISSING | Optional, launch-safe if no enum needed |
| Company size band | MISSING | Enum (MICRO/SMALL/MEDIUM/LARGE), optional |
| Jurisdiction | Exists (`organizations.jurisdiction`) | Already public; editable improvement needed |
| City / state / country | MISSING | Free-text city, state; derivable from jurisdiction for India |
| Operating regions | MISSING | Structured multi-value or free-text |
| Export/domestic markets | MISSING | Simple boolean or enum |
| Primary/secondary segments | Exists (`organization_secondary_segments`) | Read-only display in Company Profile (set via control plane) |

**Minimum viable:** city + state (free-text), jurisdiction edit UI. Year established is low-risk but low-priority.

### 4.3 Contact and Inquiry

| Field | Current state | Proposed |
|---|---|---|
| Business email | MISSING | Optional — **must stay private** (not projected publicly) |
| Phone | MISSING | Optional — **must stay private** |
| Website URL | MISSING | Optional; can be shown publicly after approval |
| Address | MISSING | Optional; **private** (addresses reveal physical location) |
| Preferred inquiry channel | MISSING | Defer — depends on inquiry routing design |

**Minimum viable:** `website_url` is safe to capture and show publicly. Business email and phone are privacy-sensitive and must stay private or require explicit public opt-in design.

### 4.4 Capabilities

| Field | Current state | Proposed |
|---|---|---|
| Manufacturing capabilities | MISSING | Free-text summary, or structured enum list |
| Capacity band | MISSING | Enum (LOW/MEDIUM/HIGH) — no absolute numbers |
| MOQ band | MISSING | Enum or catalog-level preferred |
| Lead time range | MISSING | Free-text range string |
| Customization capability | MISSING | Simple boolean flag |
| Export readiness | MISSING | Boolean or enum |
| Compliance capabilities | MISSING | Free-text or tag list |

**Design decision:** Capabilities at the catalog item level already exist (per-item MOQ, fabric type, product category). Org-level capability bands are softer marketing copy and should be treated as free-text/optional fields, not mission-critical schema. Defer structured enum fields post-MVP unless the launch checklist explicitly requires them.

### 4.5 Trust / Compliance

| Field | Current state | Proposed |
|---|---|---|
| GSTIN | Exists in `gst_verifications.gstin` | Read from existing table; **not** editable by tenant |
| GST verification status | Exists in `gst_verifications.review_outcome` | Read-only display, not editable |
| CIN | MISSING | Optional; sensitive — treat as private unless explicitly approved |
| Udyam registration | MISSING | Optional; sensitive |
| IEC (export licence) | MISSING | Optional; sensitive |
| Certifications summary | Exists via certification lifecycle | Already displayed in widget |
| Traceability presence | Exists in projection | Display in profile read |
| Verification status | Exists (`organizations.status`) | Display; not editable by tenant |

**Design decision:** GSTIN, CIN, Udyam, IEC are regulatory identifiers. GSTIN is already captured and government-verified via `gst_verifications`. CIN/Udyam/IEC would need a new model. **Do not add these fields without explicit Paresh product decision** — they carry compliance and privacy implications if surfaced publicly.

### 4.6 Media / Branding

| Field | Current state | Proposed |
|---|---|---|
| Logo | Exists | Keep |
| Banner / cover image | MISSING | New nullable column or extend `tenant_branding` |
| Gallery / factory images | MISSING | Separate media table, separate storage bucket — Defer |

**Minimum viable:** banner/cover image is a single extra nullable URL in `tenant_branding`. Gallery requires a separate media table and is post-MVP.

### 4.7 Public Visibility / Readiness

| Field | Current state | Proposed |
|---|---|---|
| Publication posture | Exists (`organizations.publication_posture`) | Display read-only; mutation is control-plane governed |
| Public eligibility | Exists (`tenants.publicEligibilityPosture`) | Display read-only |
| Completeness score | Primitive (3 checks) | Expand to cover all editable profile fields |
| Launch readiness checklist | MISSING | UI checklist with per-field guidance |
| Profile preview | MISSING | Tenant-visible preview of what will appear on `/b2b` |

**Design decision:** Publication posture and eligibility changes must remain control-plane governed. Company Profile should show these as read-only status indicators with human-readable explanations.

---

## 5. Public / Private Classification Table

| Field | Type | Storage / Model | API Exposure | Edit Authority | Public Classification | Launch Priority | Privacy Risk |
|---|---|---|---|---|---|---|---|
| `displayName` / `legal_name` | varchar(500) | `organizations` | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P0 — already live | Low |
| `logoUrl` | varchar(500)? | `tenant_branding` | GET/PUT branding | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P0 — already live | Low |
| `jurisdiction` | varchar(100) | `organizations` | GET /api/tenant/profile | System-set; no tenant edit yet | PUBLIC_SAFE_AFTER_APPROVAL | P1 | Low |
| `primarySegmentKey` | varchar(100)? | `organizations` | GET /api/tenant/profile (read) | Control plane | PUBLIC_SAFE_AFTER_APPROVAL | P0 — already live | Low |
| `secondarySegmentKeys` | array | `organization_secondary_segments` | GET /api/tenant/profile | Control plane | PUBLIC_SAFE_AFTER_APPROVAL | P0 — already live | Low |
| `rolePositionKeys` | array | `organization_role_positions` | GET /api/tenant/profile | Control plane | PUBLIC_SAFE_AFTER_APPROVAL | P0 — already live | Low |
| `tagline` | varchar(280)? | `organizations` or ext | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P1 — July launch | Low |
| `description` | text? | `organizations` or ext | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P1 — July launch | Low — review before projecting |
| `websiteUrl` | varchar(500)? | `organizations` or ext | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P1 — July launch | Low — no contact reveal |
| `city` | varchar(100)? | `organizations` or ext | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P2 | Low |
| `state` | varchar(100)? | `organizations` or ext | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P2 | Low |
| `yearEstablished` | int? | `organizations` or ext | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P3 | Low |
| `companySizeBand` | enum? | `organizations` or ext | GET+PUT /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P3 | Low |
| `businessEmail` | varchar(255)? | extension table | NOT in GET profile | OWNER/ADMIN | TENANT_AUTH_ONLY | P3 | High — contact reveal |
| `phone` | varchar(50)? | extension table | NOT in GET profile | OWNER/ADMIN | PRIVATE_DO_NOT_PROJECT | P3 | High |
| `address` | text? | extension table | NOT in GET profile | OWNER/ADMIN | PRIVATE_DO_NOT_PROJECT | P4 | High |
| `capacityBand` | varchar(30)? | `organizations` or ext | GET /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P2 | Low |
| `leadTimeRange` | varchar(100)? | `organizations` or ext | GET /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P2 | Low |
| `customizationCapable` | boolean? | ext | GET /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P3 | Low |
| `exportReady` | boolean? | `organizations` or ext | GET /api/tenant/profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P2 | Low |
| `gstin` (read) | varchar(20) | `gst_verifications` | GET /api/tenant/profile (derived) | ADMIN_OR_SYSTEM_ONLY | TENANT_AUTH_ONLY | P2 | Medium |
| `gstVerificationStatus` | varchar(30) | `gst_verifications` | GET /api/tenant/profile (derived) | ADMIN_OR_SYSTEM_ONLY | TENANT_AUTH_ONLY | P2 | Medium |
| `cinNumber` | varchar(30)? | NEW ext | GET /api/tenant/profile | OWNER/ADMIN | DEFER_POST_MVP | P4 | High |
| `udyamNumber` | varchar(30)? | NEW ext | GET /api/tenant/profile | OWNER/ADMIN | DEFER_POST_MVP | P4 | High |
| `iecNumber` | varchar(30)? | NEW ext | GET /api/tenant/profile | OWNER/ADMIN | DEFER_POST_MVP | P4 | High |
| `bannerUrl` | varchar(500)? | `tenant_branding` extend | GET profile | OWNER/ADMIN | PUBLIC_SAFE_AFTER_APPROVAL | P3 | Low |
| `galleryImages` | JSON/array | NEW media table | NEW route | OWNER/ADMIN | DEFER_POST_MVP | P4 | Low |
| `publicationPosture` | varchar(30) | `organizations` | GET /api/tenant/profile (read) | ADMIN_OR_SYSTEM_ONLY | ADMIN_OR_SYSTEM_ONLY | P0 — display only | Low |
| `publicEligibilityPosture` | enum | `tenants` | GET /api/tenant/profile (read) | ADMIN_OR_SYSTEM_ONLY | ADMIN_OR_SYSTEM_ONLY | P0 — display only | Low |
| `profileCompleteness` | derived | computed | GET /api/tenant/profile | N/A | TENANT_AUTH_ONLY | P1 | Low |

---

## 6. API / Schema Strategy

### 6.1 Recommended Data Model: Thin Extension Table

**Option A — Extend `organizations` directly.**

Pros: single table, no extra join, consistent with existing pattern.
Cons: `organizations` is already large; adds columns with mixed tenant-editability/admin-control semantics; schema migration risk affects a table used by many queries; all new columns must have careful RLS consideration.

**Option B — New `tenant_profile_details` table (1:1 with `tenants`).**

Pros: clean separation of tenant-managed profile fields from system-governed org fields; explicit RLS on tenant boundary (`tenant_id`); can evolve independently; no impact on DPP/RFQ/projection queries using `organizations`; follows same pattern as `tenant_branding`.
Cons: additional join in profile read route; new migration required; extra table in schema budget.

**Option C — Extend `tenant_branding`.**

Pros: already tenant-keyed and OWNER/ADMIN-editable; one fewer extra table.
Cons: `tenant_branding` is semantically for logos and WL theme; adding business description/website/city here violates naming semantics.

**Recommended: Option B — new `tenant_profile_details` table.**

The pattern mirrors `tenant_branding` exactly. The table is `1:1` with `tenants`, RLS-tenant-scoped, optional (tenant can be created without a profile detail row), and allows incremental addition of fields without modifying the `organizations` core model used in DPP/RFQ/projection flows.

### 6.2 Minimum Launch-Safe Schema

```sql
-- DB name: tenant_profile_details
-- Prisma model: TenantProfileDetail
-- Follows db-naming-rules.md conventions

CREATE TABLE tenant_profile_details (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  tagline      VARCHAR(280),        -- public after approval
  description  TEXT,                -- public after approval (max ~2000 chars in app)
  website_url  VARCHAR(500),        -- public after approval; validated as URL
  city         VARCHAR(100),        -- public after approval
  state        VARCHAR(100),        -- public after approval
  capacity_band VARCHAR(30),        -- e.g. LOW / MEDIUM / HIGH
  export_ready BOOLEAN DEFAULT false, -- public after approval
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_profile_details_tenant_id ON tenant_profile_details(tenant_id);
```

RLS: must add `FORCE RLS` policy scoped to `app.org_id`. Follows `tenant_branding` pattern exactly.

Fields intentionally omitted from first migration:
- business_email, phone, address (private/contact — separate policy decision needed)
- year_established, company_size_band (low-priority)
- banner_url (can add to tenant_branding later)
- CIN/Udyam/IEC (deferred — regulatory sensitivity)

### 6.3 API Route Changes

**Extend `GET /api/tenant/profile`:**
- Join with `tenant_profile_details` via `LEFT JOIN` on `tenant_id = dbContext.orgId`.
- Add nullable fields to response: `tagline`, `description`, `websiteUrl`, `city`, `state`, `capacityBand`, `exportReady`.
- Add `publicationPosture` and `publicEligibilityPosture` as read-only display fields.
- Add `gstVerified` boolean from `gst_verifications.review_outcome === 'APPROVED'` (or `provider_result === 'VERIFIED'`).

**Extend `PUT /api/tenant/profile`:**
- Accept new optional fields: `tagline`, `description`, `websiteUrl`, `city`, `state`, `capacityBand`, `exportReady`.
- `displayName` remains in body.
- Route upserts `tenant_profile_details` row alongside updating `organizations.legal_name`.
- OWNER/ADMIN only — no change to authorization model.

**No new route required for first implementation slice.** Extending the existing profile route is sufficient and clean.

### 6.4 Prisma Schema Addition

```prisma
model TenantProfileDetail {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @unique @map("tenant_id") @db.Uuid
  tagline      String?  @db.VarChar(280)
  description  String?  @db.Text
  websiteUrl   String?  @map("website_url") @db.VarChar(500)
  city         String?  @db.VarChar(100)
  state        String?  @db.VarChar(100)
  capacityBand String?  @map("capacity_band") @db.VarChar(30)
  exportReady  Boolean  @default(false) @map("export_ready")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  tenant       Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@map("tenant_profile_details")
}
```

Add relation back on `Tenant`:

```prisma
profileDetail  TenantProfileDetail?
```

### 6.5 Schema Budget Check

- This adds **1 new table** (`tenant_profile_details`).
- Schema budget file states guardrails for Phase 2 but does not impose an absolute cap preventing this.
- The table follows all `db-naming-rules.md` conventions: snake_case, plural table name, `@map()` on every camelCase field, `@@map("tenant_profile_details")`.

### 6.6 OpenAPI Impact

Add optional fields to `GET /api/tenant/profile` response schema in `shared/contracts/openapi.tenant.json`:
- `tagline`, `description`, `websiteUrl`, `city`, `state`, `capacityBand`, `exportReady`, `publicationPosture`, `publicEligibilityPosture`, `gstVerified`.

Add new optional fields to `PUT /api/tenant/profile` request body.

The existing response structure is extended (additive), not replaced.

### 6.7 RLS Impact

New `tenant_profile_details` table needs:

- `FORCE RLS` enabled.
- `SELECT` policy: `app.org_id = tenant_id` (same as `tenant_branding`).
- `INSERT/UPDATE` policy: `app.org_id = tenant_id` AND role check for mutation (OWNER/ADMIN enforced in route).
- `DELETE` policy: via cascade from `tenants.id`.

No existing RLS policies are changed.

---

## 7. Public Projection Strategy

### 7.1 First implementation slice: projection unchanged

The first implementation slice (FTR-SL-016B2A) must NOT change the public projection. The public projection currently surfaces: `slug`, `legalName`, `logoUrl`, `orgType`, `jurisdiction`, `certificationCount`, `certificationTypes`, `hasTraceabilityEvidence`, `taxonomy`, `offeringPreview`, `publicationPosture`, `eligibilityPosture`.

New profile fields (`tagline`, `description`, `websiteUrl`, `city`) must be collected and stored first, then promoted to public projection in a separate slice (FTR-SL-016B2D).

### 7.2 Deferred public projection additions

When ready (FTR-SL-016B2D), the following fields are candidates to add to the public projection:

- `tagline` — short business intro. Appropriate after approval gate passes.
- `description` — longer description. Appropriate after approval gate passes. Consider a character limit (e.g., 500 chars) in public payload.
- `websiteUrl` — business website link. Public-safe.
- `city` — general location. Public-safe.
- `exportReady` — boolean signal. Public-safe.
- `capacityBand` — general capability signal. Public-safe.

**Certificate documents remain excluded** from public projection permanently. No signed URL, storage path, filename, or bucket name may appear in public payload.

### 7.3 Required approval gates before public projection

The six existing safety gates (A through E, plus output gate) must continue to pass before any supplier appears. No new approval gate is required for adding profile fields to the projection, but content must pass through the same publication/eligibility posture checks.

---

## 8. Relationship to FTR-SL-017

### 8.1 FTR-SL-017 scope

FTR-SL-017 (Catalogue Public Visibility Control) is about giving tenants control over **which catalog items** are visible publicly — likely surfacing `publicationPosture` toggles at the catalog item level in the Company Profile or a dedicated catalog management area.

### 8.2 Recommended order

```
FTR-SL-016B2A (schema + API foundation) → FTR-SL-016B2B (profile UI) → FTR-SL-017 (catalogue visibility) → FTR-SL-016B2D (projection)
```

**FTR-SL-016B2A/B do not depend on FTR-SL-017.** Company Profile rich fields are tenant-editable profile content and are independent of per-catalog-item visibility controls.

**FTR-SL-016B2D (projection) should follow FTR-SL-017**, not precede it, because:
- Both will touch `publicB2BProjection.service.ts`.
- Implementing projection for new profile fields alongside catalog visibility in one pass avoids double-touching the projection service.
- If FTR-SL-016B2D adds profile fields to the projection, and then FTR-SL-017 also changes the projection logic, there is merge risk.

**Risk if reversed:** implementing FTR-SL-016B2D before FTR-SL-017 is possible but creates a second projection service edit shortly after. For July launch, if both are required, design them together.

### 8.3 Shared visibility model

FTR-SL-017 controls catalog item publication posture. Company Profile rich fields are supplier-wide metadata, not per-item. They should use the same six-gate publication eligibility model but are not per-item toggles. No shared toggle model is needed — these are separate concerns.

---

## 9. Slice-by-Slice Implementation Plan

### Slice FTR-SL-016B2A — Rich Profile Schema and API Foundation

**Objective:** Create `tenant_profile_details` table, add Prisma model, extend `GET/PUT /api/tenant/profile` with new nullable fields.

**User-visible outcome:** Company Profile API returns richer fields. Widget will be updated in B slice. Backend is ready.

**Likely files:**
- `server/prisma/schema.prisma` — add `TenantProfileDetail` model + relation on `Tenant`
- `server/prisma/migrations/` — new SQL migration file (tracked, not applied)
- `server/src/routes/tenant.ts` — extend profile GET/PUT handlers
- `shared/contracts/openapi.tenant.json` — add new fields to profile schemas
- `services/tenantService.ts` — extend `TenantProfileResponse` and `UpdateTenantProfileRequest` types

**API impact:** Extends existing `GET` and `PUT` routes. No new routes.

**Schema impact:** 1 new table (`tenant_profile_details`), 1 new Prisma model, 1 relation added to `Tenant`. Migration required.

**Public projection impact:** NONE in this slice.

**Validation:** `pnpm typecheck`, `pnpm --filter server exec prisma validate`, `git diff --check`.

**Runtime verification:** `GET /api/tenant/profile` returns new nullable fields. `PUT /api/tenant/profile` with tagline/description/website saves and returns them. No public projection check needed.

**Risk:** Low. Extension-only. New table with clear RLS pattern.

**Priority:** P1 — July launch prerequisite.

**Non-goals:** No UI, no public projection change, no catalog item posture change.

---

### Slice FTR-SL-016B2B — Company Profile Rich Fields UI

**Objective:** Add editable sections to `B2BProfileSettings.tsx` for tagline, description, website, city, state, capacityBand, exportReady. Add read-only display of `publicationPosture`, `gstVerified`, `publicEligibilityPosture`.

**User-visible outcome:** Company Profile shows and allows editing of richer business profile fields. Read-only status fields show publication and verification state.

**Likely files:**
- `components/Tenant/B2BProfileSettings.tsx` — new form sections
- `services/tenantService.ts` — already updated in B2A; may need minor UI-binding type adjustments

**API impact:** None (backend done in B2A).

**Schema impact:** None (done in B2A).

**Public projection impact:** None.

**Validation:** `pnpm typecheck`, visual inspection in browser session.

**Runtime verification:** Shraddha OWNER/ADMIN session opens Company Profile, sees new fields, edits tagline/description/website, saves, verifies persistence.

**Risk:** Low. Frontend only.

**Priority:** P1.

**Non-goals:** No public projection, no FTR-SL-017 catalog visibility.

---

### Slice FTR-SL-016B2C — Profile Completeness / Readiness Checklist

**Objective:** Expand profile completeness score to cover all editable rich profile fields. Add per-field completion guidance. Optionally add a launch readiness checklist showing what is needed for public profile approval.

**Likely files:**
- `components/Tenant/B2BProfileSettings.tsx`
- `services/tenantService.ts` (if completeness is server-computed)

**API impact:** Minimal. Completeness may be computed client-side from existing profile fields.

**Schema impact:** None.

**Public projection impact:** None.

**Risk:** Low.

**Priority:** P2.

**Non-goals:** No new schema fields, no public projection.

---

### Slice FTR-SL-016B2D — Public Projection Expansion

**Objective:** After FTR-SL-016B2A/B and FTR-SL-017 are complete, expand the public B2B projection to include `tagline`, `description` (truncated), `websiteUrl`, `city`, `exportReady`, `capacityBand` for publication-eligible suppliers.

**Likely files:**
- `server/src/services/publicB2BProjection.service.ts`
- `services/publicB2BService.ts`
- `components/Public/B2BDiscovery.tsx`
- `shared/contracts/openapi.public.json` (if it exists) or `openapi.tenant.json`

**API impact:** Extends public projection response shape.

**Schema impact:** None (data already in `tenant_profile_details`).

**Public projection impact:** SIGNIFICANT — adds new public-safe fields to `/api/public/b2b/suppliers` response.

**Validation:** Neighbor-path smoke test required: `GET /api/public/b2b/suppliers`, `/b2b` rendering, no certificate document or private field exposure.

**Risk:** Medium. Must not add any contact/private fields. Requires careful projection gate review.

**Priority:** P2 (after B2A+B2B, coordinate with FTR-SL-017).

**Non-goals:** Certificate documents excluded. No private contact data. No phone/email in public payload.

---

### Slice FTR-SL-016B2E — Banner Image (Deferred)

**Objective:** Add banner/cover image URL to `tenant_branding`. Allow upload/preview in Company Profile.

**Risk:** Low-medium (extends `tenant_branding` schema; new storage path needed).

**Priority:** P3 — post-July launch or close to it.

**Non-goals:** Full media gallery deferred to P4/post-MVP.

---

## 10. Product Decisions Required Before Implementation

Paresh must decide on the following before FTR-SL-016B2A implementation begins:

1. **Field set for first schema migration:** Which of `tagline`, `description`, `websiteUrl`, `city`, `state`, `capacityBand`, `exportReady` must be in the July launch? This determines the migration scope.

2. **Description length:** What is the maximum company description length? (200 / 500 / 2000 chars — affects `TEXT` vs `VARCHAR`.)

3. **Website URL visibility:** Is `websiteUrl` always publicly visible for publication-eligible suppliers, or does it require an explicit opt-in toggle per supplier?

4. **GSTIN display in Company Profile:** Should the Company Profile show the GSTIN from `gst_verifications` to the OWNER/ADMIN? This is read-only and tenant-auth-only, but may surface sensitive compliance data.

5. **CIN/Udyam/IEC:** Are these fields required for July launch? If yes, a separate extension table and policy are needed.

6. **FTR-SL-017 priority:** Does catalogue item public visibility control need to ship before or alongside the rich profile public projection slice (FTR-SL-016B2D)?

7. **Contact fields:** Is business email intended for display in the Company Profile dashboard only (private), or should it eventually be surfaced in buyer inquiry routing? This determines privacy classification.

8. **Company size band / capacity band:** Are these important supplier-trust signals for July launch buyers, or P3+?

---

## 11. Implementation Safety Rules for Future Slices

These rules apply to all future slices in this family:

1. Do not add `business_email`, `phone`, or `address` to the public projection without explicit privacy governance decision.
2. Do not add `registration_no`, `risk_score`, `plan`, `external_orchestration_ref`, or any admin field to the public projection.
3. Certificate document storage paths, signed URLs, and bucket names must never appear in any projection.
4. All new tenant-editable fields must use `withDbContext` with OWNER/ADMIN route enforcement.
5. Any new schema table must follow `db-naming-rules.md` naming conventions and include `created_at`/`updated_at`.
6. Schema changes must be tracked as SQL migration files before `prisma db pull` is run.
7. All new `tenant_profile_details` data must be scoped by `app.org_id` via RLS (same pattern as `tenant_branding`).
8. OpenAPI contract must be updated atomically with route changes.
9. Neighbor-path smoke tests for `/api/public/b2b/suppliers` and `/b2b` are required for any projection change.

---

## 12. Design Authority Reference

This design is the FTR-SL-016B2 planning authority for all future slices in the B2B Company Profile rich field family. Slices FTR-SL-016B2A through FTR-SL-016B2E must reference and remain consistent with this artifact.
