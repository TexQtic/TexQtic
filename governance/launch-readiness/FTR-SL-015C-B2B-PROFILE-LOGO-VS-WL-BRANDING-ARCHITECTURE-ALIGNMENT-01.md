# FTR-SL-015C B2B Profile Logo vs White Label Branding Architecture Alignment

Unit: FTR-SL-015C-B2B-PROFILE-LOGO-VS-WL-BRANDING-ARCHITECTURE-ALIGNMENT-01
Date: 2026-06-12
Status: INVESTIGATION COMPLETE — ARCHITECTURE ALIGNED
Final enum: FTR_SL_015C_ARCHITECTURE_REQUIRES_PROFILE_NAV_WIRING_FIRST

---

## 1) Final enum

**FTR_SL_015C_ARCHITECTURE_REQUIRES_PROFILE_NAV_WIRING_FIRST**

Rationale: Repo truth confirms that basic B2B tenant profile logo upload capability is technically feasible via the existing backend routes without White Label gating. However, the missing prerequisite is the B2B dashboard profile page and navigation wiring. FTR-SL-018 (B2B Dashboard Profile Create/Update Nav Wiring) is inseparable from this work and should be sequenced first.

---

## 2) Repo preflight

**Executed commands:**
```
git branch --show-current
git rev-parse HEAD
git rev-parse origin/main
git status --porcelain=v1 -uno
git log --oneline -15
```

**Results:**
- Branch: `main` ✅
- HEAD: `d45d4f20464ac210b7416ceabef91e54ed9f8a1d` ✅
- origin/main: `d45d4f20464ac210b7416ceabef91e54ed9f8a1d` ✅
- Worktree: clean (no uncommitted changes) ✅
- Recent history includes all expected FTR-SL-015 commits ✅

**Verdict: PASS**

---

## 3) Files inspected

### Backend / Database / Schema
- `server/prisma/schema.prisma` — Tenant, TenantBranding models
- `server/src/routes/tenant.ts` — `POST /api/tenant/profile/logo/upload`, `PUT /api/tenant/branding` routes
- `server/src/services/storage/tenantLogo.storage.ts` — Upload helper and validation
- `server/src/routes/control.ts` — Control plane tenant detail query (includes branding)

### Frontend / Navigation / UI
- `layouts/Shells.tsx` — B2BShell, WhiteLabelAdminShell navigation definitions
- `App.tsx` — Route switching logic, SETTINGS state handling, WL gating logic
- `components/Tenant/WhiteLabelSettings.tsx` — Logo upload UI (currently WL-only)
- `services/tenantService.ts` — Frontend API client (`uploadTenantLogo`, `updateBranding`)

### Governance / Tracker
- `governance/launch-readiness/FUTURE-TODO-REGISTER.md`
- `governance/launch-readiness/FTR-SL-015-TENANT-BRAND-LOGO-UPLOAD-PROFILE-MEDIA-01.md`
- `governance/launch-readiness/FTR-SL-015A-TENANT-LOGO-UPLOAD-SAFE-RUNTIME-VERIFICATION-01.md`
- `governance/launch-readiness/FTR-SL-015B-TENANT-LOGO-UPLOAD-QA-SESSION-RUNTIME-VERIFICATION-01.md`

---

## 4) Current logo/backend contract truth

### Persistence Model
- **Model:** `TenantBranding` (one per Tenant, 1:1 relationship)
- **Logo field:** `logoUrl` (VARCHAR 500, nullable)
- **Theme field:** `themeJson` (JSON, nullable) — contains advanced branding fields like `primaryColor`, `secondaryColor`
- **Relationship:** Foreign key `tenantId` (unique)

### Upload Route Authorization
**Path:** `POST /api/tenant/profile/logo/upload`

**Authentication:**
- Requires `tenantAuthMiddleware` ✅
- Requires `databaseContextMiddleware` (injects `dbContext.orgId`) ✅

**Authorization Gate:**
- NO explicit White Label (`is_white_label`) check ✓
- NO permission role check ✓
- Accessible to ANY authenticated tenant

**Request Shape:**
- Multipart form-data with field `file` (Buffer)
- Content validation: JPG, PNG, WEBP; max 2MB; MIME type verified

**Response Shape:**
```json
{
  "success": true,
  "data": {
    "logoUrl": "https://<bucket>/<orgId>/logo/<uuid>.<ext>"
  }
}
```

**Storage Path:**
- Supabase storage bucket: `CATALOG_IMAGE_BUCKET` (reused from catalog image upload)
- Object path: `{orgId}/logo/{uuid}.{ext}`
- Public URL: Generated via Supabase storage SDK

**Verdict:** Backend upload route is already **tenant-safe and not White Label gated**. ✅

### Persistence/Update Route Authorization
**Path:** `PUT /api/tenant/branding`

**Authentication:**
- Requires `tenantAuthMiddleware` ✅
- Requires `databaseContextMiddleware` ✅

**Authorization Gate:**
- NO explicit `is_white_label` check ✓
- **Requires OWNER or ADMIN role** (lines 7810-7812 in tenant.ts)
- Available to org admins/owners regardless of WL status

**Request Shape:**
```json
{
  "logoUrl": "https://...",  // optional, null deletes
  "themeJson": {
    "primaryColor": "#...",
    "secondaryColor": "#..."
  }
}
```

**Response Shape:**
```json
{
  "success": true,
  "data": {
    "branding": {
      "id": "...",
      "tenantId": "...",
      "logoUrl": "https://...",
      "themeJson": {...},
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```

**Database Operation:**
- Uses `tx.tenantBranding.upsert()` with `orgId` from `dbContext`
- RLS enforces tenant boundary
- Creates new TenantBranding record if not exists

**Verdict:** Persistence route is already **tenant-safe and not White Label gated** (only requires OWNER/ADMIN role). ✓

---

## 5) Current UI/nav truth

### B2B Shell Navigation (Regular B2B Tenants)
**File:** `layouts/Shells.tsx` lines 312-450

**Current menu items:**
- 📦 Catalog
- 🏪 Browse Suppliers
- 🛍️ Orders
- 🔍 DPP Passport
- 🏦 TradeTrust Ledger
- 🔐 GST Verification
- 📄 Invoices
- 🚨 Escalations
- 💸 Settlement
- 📋 Certifications
- 🔗 Traceability
- 📋 Audit Log
- 🤝 Trades
- Network Commerce items (Pools, etc.)
- 👥 Team Access

**Missing:** NO profile, settings, company-info, or branding menu item ❌

### White Label Admin Shell Navigation
**File:** `layouts/Shells.tsx` lines 600-700

**Menu items include:**
- 🎨 **Store Profile** (routes to 'branding')
- 👥 Staff
- 📦 Products
- 🗂️ Collections
- 🛍️ Orders
- 🌐 Domains
- 🏷️ DPP Passport Label

**Note:** WL-only, gated by `is_white_label = true` check in App.tsx

### SETTINGS Route Logic
**File:** App.tsx lines 2821-2860, 6160-6220

**Current behavior:**

```javascript
const tenantCanAccessWorkspaceProfileSettings = tenantIsInSharedAdminCore  && !tenantHasWhiteLabelCapability;
const tenantCanAccessWhiteLabelSettingsOverlay = tenantHasWhiteLabelCapability  && tenantIsInSharedAdminCore;
```

**For non-WL tenants:**
- Renders read-only "Workspace Profile" card
- Shows: Organization name, Base family, Workspace posture, Plan & Usage panel
- NO profile editing capabilities
- NO logo upload UI ❌

**For WL tenants:**
- Renders `<WhiteLabelSettings>` component
- Shows: Storefront Configuration, Custom Domain management, Theme controls
- **Includes logo upload UI** ✅
- Can upload and persist branding

### Logo Upload UI Location
**File:** `components/Tenant/WhiteLabelSettings.tsx` lines 1-90

**Current placement:**
- Inside WhiteLabelSettings component
- Only renders when tenant has WL capability
- Accessed via SETTINGS route when `tenantCanAccessWhiteLabelSettingsOverlay = true`

**Current flow:**
1. User selects logo file via input
2. Call `uploadTenantLogo(file)` — returns `{ logoUrl }`
3. Call `updateBranding({ logoUrl })` — persists to TenantBranding.logoUrl
4. Update local state to show preview

**Verdict:** Logo upload UI is functionally correct but **architecturally restricted to WL tenants only via UI gating**. Backend routes have no such restriction. ❌

---

## 6) B2B profile creation/edit/update truth

### Backend Profile Routes
**Searched:** Full tenant.ts route registry

**Result:** NO dedicated B2B profile create/read/update route found

Available profile-related endpoints:
- `GET /api/me` — Returns user + tenant session identity (read-only)
- `GET /api/tenant/audit-logs` — Audit log read-only
- `PUT /api/tenant/branding` — Updates branding (includes logo, not dedicated profile)

**Missing:**
- No `GET /api/tenant/profile` or similar (read current profile)
- No `POST /api/tenant/profile/create` or similar
- No `PUT /api/tenant/profile/update` or similar (update company name, description, etc.)
- No dedicated profile creation/update backend surface ❌

### Frontend Profile Pages
**Searched:** All components in Tenant/ directory

**Current SETTINGS surface (non-WL):**
- App.tsx lines 6168-6220 renders a read-only info card
- No editable form fields
- No profile page component dedicated to basic B2B profile
- Only WhiteLabelSettings exists as an editable settings component (WL-only) ❌

### B2B Dashboard Profile Navigation Entry Point
**Current:** No entry point in B2BShell navigation ❌

**Result:** Non-WL B2B tenants have:
- No visible "Profile" or "Settings" or "Company Info" link in dashboard nav
- No way to access any profile editing surface
- Team Access button exists for team management only
- Settings accessible only via main app state, not integrated into nav ❌

### Public B2B Supplier Profile
**Service:** `server/src/services/publicB2BProjection.service.ts`

**Query:** Builds public supplier card/drawer with fields from:
- Tenant.name
- Tenant.slug
- TenantBranding.logoUrl (pulled here for public display)
- organizations table (segment, role data if available)

**Finding:** Public profile already uses TenantBranding.logoUrl for public display ✅
- This confirms logo is intended as company identity, not just WL branding
- Non-WL tenants' logos would be displayed publicly if they could upload them

### Verdict on B2B Profile/Nav Truth
- Backend: NO dedicated profile CRUD surface exists ❌
- Frontend: NO profile page component exists for B2B tenants ❌
- Navigation: B2BShell has NO profile menu entry ❌
- **Prerequisite blocker:** FTR-SL-018 must be implemented first to create the B2B profile page and nav wiring

---

## 7) White Label gating truth

### Where is WL gating currently implemented?

**1. App.tsx lines 2821-2860:**
```javascript
const tenantHasWhiteLabelCapability = currentTenant?.is_white_label === true;
const tenantCanAccessWhiteLabelSettingsOverlay = tenantHasWhiteLabelCapability && tenantIsInSharedAdminCore;
```

**Impact:** Controls whether SETTINGS route renders WhiteLabelSettings vs. read-only profile

**2. App.tsx lines 6160-6170:**
```javascript
if (appState === 'SETTINGS' && tenantCanAccessWhiteLabelSettingsOverlay) {
  return <WhiteLabelSettings ... />;
}
```

**Impact:** Routes WL tenants to full settings overlay

**3. WhiteLabelAdminShell (lines 600-650):**
```javascript
const WL_ADMIN_NAV = [
  { routeKey: 'branding', label: 'Store Profile', icon: '🎨' },
  // ... other WL-only items
];
```

**Impact:** WL admin overlay only accessible to WL tenants

### Backend White Label Gating

**Searched all routes for `is_white_label` or feature flag checks**

- `POST /api/tenant/profile/logo/upload` — NO WL check ✓
- `PUT /api/tenant/branding` — NO WL check ✓

**Finding:** Backend routes are NOT White Label gated. The restriction is purely UI-level.

### Verdict
- White Label gating is **UI-only, not backend-enforced**
- Backend routes are fully accessible to any authenticated tenant
- Limitation exists because logo upload is placed inside WhiteLabelSettings.tsx
- Backend is already ready for non-WL logo upload ✅

---

## 8) B2B profile/logo requirement interpretation

### Paresh's Clarified Requirement
> Every B2B tenant/user should be able to upload their company/brand logo in their normal tenant/company profile. White Label is a separate premium layer in B2B and should remain separate.

### Architectural Interpretation

**Basic B2B Company Profile (for all B2B tenants):**
- Company display name (could be editable)
- Logo upload (NEW capability, should be added)
- Short business profile description (if schema supports it)
- Address/location fields (if already supported)
- Public-facing company identity
- Visible in internal dashboard
- Visible in public B2B supplier directory

**Availability:** All B2B tenants (WL and non-WL)

**Premium White Label Branding (WL-only):**
- Custom storefront visual identity
- Theme colors and advanced theme JSON
- Custom domain configuration
- Buyer-facing branded shell/experience
- Advanced landing/storefront configuration
- Entitlement-gated via `is_white_label = true`

**Availability:** WL-capable tenants only

---

## 9) Architecture decision

### Recommended Path: Path A + Path D Combined

**Path A:** Reuse backend for basic logo upload in normal profile UI  
**Path D:** Profile page/nav first, logo upload second

### Detailed Recommendation

#### Phase 1 (Prerequisite): B2B Profile Page & Nav Wiring (FTR-SL-018)
**Objective:** Create the B2B profile page and wire it into dashboard navigation

**Scope:**
1. Create `components/Tenant/B2BProfileSettings.tsx` — Basic profile editor for all B2B tenants
2. Wire 'profile' route into B2BShell navigation
3. Add to App.tsx route switching logic (PROFILE appState or similar)
4. Include fields: Company name (if editable), logo upload, profile completeness info

**Benefits:**
- Provides home for basic logo upload UI
- Unblocks logo feature for non-WL tenants
- Creates foundation for other profile fields in future

**Outcome:** Non-WL B2B tenants can access profile from dashboard nav ✅

#### Phase 2: Add Logo Upload to B2B Profile
**Objective:** Reuse existing backend routes for logo upload in new profile page

**Scope:**
1. Add logo file input + upload preview UI to B2BProfileSettings.tsx
2. Reuse `uploadTenantLogo()` from services/tenantService.ts
3. Call existing `PUT /api/tenant/branding` to persist
4. Display existing logoUrl from tenant.theme or API

**Benefits:**
- NO new backend routes needed
- NO schema changes
- Leverages existing upload infrastructure
- Minimal safe change

**Outcome:** All B2B tenants can upload logos ✅

#### Phase 3: Preserve White Label Premium Branding
**Objective:** Keep advanced WL features separate and premium

**Scope:**
1. WhiteLabelSettings remains in WL admin overlay
2. WL tenants see both: Basic profile page (B2BProfileSettings) + Premium storefront config (WhiteLabelSettings)
3. Theme colors, custom domain, storefront styling remain WL-only
4. Basic identity fields available to all; premium fields to WL only

**Note:** If WL tenants also have access to the basic profile page through B2BShell (before entering WL admin overlay), they see both layers:
- Basic company profile (all tenants)
- Premium WL controls (WL tenants only)

This preserves WL value while enabling basic logo for all.

---

## 10) Recommended implementation path

### Sequence
1. **FTR-SL-018:** B2B Dashboard Profile Create/Update Nav Wiring Investigation & Implementation
   - Investigate current profile create/update state more deeply
   - Design minimal B2B profile page component
   - Wire into dashboard nav
   - Confirm role/permission model (OWNER/ADMIN or all roles?)

2. **FTR-SL-015C1 (or rename current FTR-SL-015):** Add Logo Upload to B2B Profile
   - Move/copy logo upload UI to B2BProfileSettings
   - Test with non-WL tenants
   - Verify persistence via existing route
   - Runtime verification with QA B2B tenant

### Decision: Merge or Sequence?
**Recommendation:** FTR-SL-018 is a PREREQUISITE, not merged

**Rationale:**
- FTR-SL-018 must define the B2B profile page and nav first
- Once that page exists, logo upload is a simple addition to it
- Separating them allows FTR-SL-018 to focus on nav/page structure
- FTR-SL-015 follow-up can then focus on logo upload integration
- This maintains atomic unit boundaries

**If time-critical:** Could combine into single unit, but recommend keeping separate for clarity

---

## 11) What remains premium-only for White Label

The following should remain White Label exclusive (require `is_white_label = true`):

### Must Remain WL-Only ✅
- Custom storefront visual identity (theme colors beyond basic brand)
- Advanced `themeJson` configuration (beyond basic company profile)
- Custom domain management and CNAME configuration
- Buyer-facing branded shell / storefront experience
- White Label admin overlay access
- Premium landing page / storefront theming
- Advanced domain/DNS controls in WL admin

### Can Be Dual Access (Basic for all, Advanced for WL)
- Logo upload: Basic (all) + capability to use in storefront branding (WL premium)
- Company name: Basic identity for all; storefront display control for WL
- Profile completeness tracking: Could benefit both layers

---

## 12) FTR-SL-018 profile nav wiring relationship

### Is FTR-SL-018 prerequisite, merged, or separate?

**Verdict: PREREQUISITE — NOT MERGED, MUST BE SEQUENCED FIRST**

**Rationale:**
1. Current repo truth: NO B2B profile page exists
2. Current repo truth: NO profile nav entry in B2BShell
3. Logo upload has nowhere to live without the profile page
4. FTR-SL-018 creates the home for logo upload
5. Each unit maintains single responsibility: nav/page structure vs. logo upload

**Unit Sequencing:**
```
FTR-SL-018 (prerequisite)
  ↓ creates B2B profile page and nav entry
FTR-SL-015C1 or similar (implementation)
  ↓ adds logo upload to existing profile page
FTR-SL-015D (runtime verification)
  ↓ tests with QA B2B tenant
```

**Recommended FTR-SL-018 title if not yet filed:**
`FTR-SL-018-B2B-DASHBOARD-PROFILE-CREATE-UPDATE-NAV-WIRING-INVESTIGATION-AND-IMPLEMENTATION-01`

**Output of FTR-SL-018 should be:**
- B2BProfileSettings component (editable profile page)
- 'profile' route in B2BShell navigation
- App.tsx wiring to render profile page
- Baseline profile fields (company name, logo placeholder, etc.)
- Clear authorization model (who can edit)
- Readiness for logo upload feature in follow-up

---

## 13) Validation results

Because this is investigation/design only with no code changes, minimal validation applied:

```bash
git diff --check
# Result: No changes, PASS
```

No code files were modified, so type-check, lint, and test validation are not applicable.

If code were to be changed in future implementation phases, validation would include:
```bash
pnpm --filter server typecheck
pnpm --filter web typecheck
pnpm --filter server lint
pnpm --filter web lint
pnpm --filter server test
```

---

## 14) Tracker/TLRH sync summary

**Files updated:**
- governance/launch-readiness/FTR-SL-015C-B2B-PROFILE-LOGO-VS-WL-BRANDING-ARCHITECTURE-ALIGNMENT-01.md (created)
- governance/launch-readiness/FUTURE-TODO-REGISTER.md (latest entry updated)

**Reason for update:**
- Investigation complete with clear architectural recommendation
- FTR-SL-018 identified as inseparable prerequisite
- Next unit clearly defined

---

## 15) Adjacent findings and disposition

### Adjacent Unit 1: FTR-SL-016 (Certificate Upload)
**Status:** Separate, unrelated
**Disposition:** No changes, remains independent follow-up

### Adjacent Unit 2: FTR-SL-017 (B2B Catalogue Public Visibility)
**Status:** Separate, could benefit from logo/profile clarity
**Disposition:** No changes, remains independent follow-up

### Adjacent Unit 3: FTR-SL-018 (B2B Dashboard Profile Nav Wiring) ⭐
**Status:** PREREQUISITE — CRITICAL BLOCKER
**Finding:** This unit determined that FTR-SL-018 must be implemented BEFORE logo upload work
**Disposition:** Mark as immediate next unit, sequence before logo implementation
**Priority:** HIGH — blocks complete solution

### Adjacent Unit 4: FTR-SL-019 (Auth Forgot Password)
**Status:** Separate, unrelated
**Disposition:** No changes, remains independent follow-up

### Adjacent Unit 5: FTR-SL-020 (Synthetic Test Account Cleanup)
**Status:** Separate, noted in prior FTR-SL-015B
**Disposition:** No changes, remains independent follow-up

### Summary
- No new adjacent findings in this investigation
- FTR-SL-018 escalated from "future" to "immediate prerequisite"
- All others remain separate and independent

---

## 16) Risks and residuals

### Risk 1: Backend Routes Untested with Non-WL Tenants
**Description:** Logo upload routes were implemented but only verified statically. Runtime verification with non-WL QA tenant was blocked in FTR-SL-015B due to UI gating.

**Mitigation:** FTR-SL-015C1 (logo implementation) will include runtime verification with QA B2B (non-WL tenant) once profile page exists.

**Residual:** Acceptable, expected to be resolved in follow-up implementation unit.

### Risk 2: Role/Permission Model Unclear
**Description:** `PUT /api/tenant/branding` requires OWNER or ADMIN role, but non-WL B2B tenants' role model for profile editing is not yet defined.

**Mitigation:** FTR-SL-018 must clarify: Can MEMBER role edit basic profile? Or only OWNER/ADMIN? This affects scope of who can upload logos.

**Residual:** Must be resolved in FTR-SL-018 before logo upload implementation.

### Risk 3: TenantBranding.logoUrl vs. Future Profile Logo Field
**Description:** Currently using TenantBranding.logoUrl (semantically tied to branding/theme) for basic company identity. Future schema might separate profile-logo from theme-branding-logo.

**Mitigation:** Current approach is pragmatic: reuse existing field for MVP. Future refactor can split if semantic distinction becomes important (e.g., companyLogoUrl vs. brandingLogoUrl).

**Residual:** Acceptable for Phase 1-2; note for potential Phase 3 schema optimization.

### Risk 4: Public B2B Directory Logo Display
**Description:** publicB2BProjection.service.ts already pulls TenantBranding.logoUrl for public display. Non-WL tenants uploading logos via profile page will automatically appear in public directory.

**Mitigation:** This is INTENDED and DESIRED per requirement. Logo upload = public identity, not private setting.

**Residual:** None, this is correct behavior.

---

## 17) Commit hash and push status

**Current state:**
- Branch: main
- HEAD: d45d4f20464ac210b7416ceabef91e54ed9f8a1d
- Origin/main: d45d4f20464ac210b7416ceabef91e54ed9f8a1d
- Worktree: clean

**Report files:** Will be committed atomically with tracker update

**Commit message (pending):**
```
[TEXQTIC] align B2B profile logo and white-label branding architecture
```

---

## 18) Recommended next unit

### Immediate Next: FTR-SL-018

**Title:** FTR-SL-018-B2B-DASHBOARD-PROFILE-CREATE-UPDATE-NAV-WIRING-INVESTIGATION-AND-IMPLEMENTATION-01

**Objective:** 
- Investigate and implement B2B dashboard profile page
- Wire profile entry into B2BShell navigation
- Define authorization model for profile editing
- Prepare foundation for logo upload feature

**Scope:**
- Create `components/Tenant/B2BProfileSettings.tsx` (editable profile form)
- Add 'profile' route to B2BShell nav
- Update App.tsx with PROFILE route handler
- Confirm role-based access (OWNER/ADMIN or all roles)
- Include logo field placeholder for future FTR-SL-015C1

**Success Criteria:**
- B2B tenants see "Profile" or "Company Info" in dashboard nav
- Clicking nav item opens editable profile page
- Profile page renders with company name field (at minimum)
- Logo upload field present but implementation deferred to FTR-SL-015C1

**After FTR-SL-018 completes:** FTR-SL-015 follow-up can proceed with confident logo implementation

---

## 19) Architecture decision summary (final)

### Decision: Path A + Path D + FTR-SL-018 Prerequisite

**Core Finding:**
- Backend logo upload routes are already tenant-safe and NOT White Label gated
- UI restriction exists only because logo upload is in WhiteLabelSettings.tsx
- Missing prerequisite is the B2B profile page and nav entry point

**Solution:**
1. Implement FTR-SL-018: B2B profile page + nav wiring (for all B2B tenants)
2. Implement FTR-SL-015C1: Add logo upload to B2B profile page
3. Preserve FTR-SL-015B2 (or new unit): White Label advanced branding remains premium-only

**Architecture Outcome:**
- Basic company profile with logo upload: ✅ Available to all B2B tenants
- Premium White Label branding: ✅ Remains exclusive to WL-capable tenants
- Backend routes: ✅ Already prepared, no new routes needed
- Schema: ✅ No changes required, reuse TenantBranding.logoUrl
- Public B2B Directory: ✅ Non-WL tenant logos automatically displayed

**Alignment with Requirement:**
- ✅ Every B2B tenant can upload logo in normal profile
- ✅ WL remains separate premium layer
- ✅ Clear architectural split between basic and premium
- ✅ B2B dashboard exposes profile creation/edit surface

---

## 20) Expected outcomes and follow-up

### From This Investigation (FTR-SL-015C)
- ✅ Clarified architectural split between basic and premium branding
- ✅ Identified FTR-SL-018 as inseparable prerequisite
- ✅ Confirmed backend is ready for non-WL logo upload
- ✅ Identified risks and mitigation paths
- ✅ Clear sequence for next two implementation units

### From FTR-SL-018 (Expected)
- Profile page component created
- B2BShell nav updated
- Authorization model clarified
- Ready to receive logo upload in follow-up

### From FTR-SL-015C1 (Expected after FTR-SL-018)
- Logo upload UI integrated into profile page
- Runtime verification with QA B2B (non-WL tenant)
- Logo upload+persist+preview tested end-to-end
- Feature complete and ready for production

---

## Conclusion

This investigation confirms that the product requirement — **"Every B2B tenant should be able to upload their company/brand logo"** — is fully achievable with existing backend infrastructure. The missing piece is not backend capability but rather the frontend B2B profile page and dashboard navigation wiring.

**FTR-SL-018 is the critical prerequisite.** Once that investigation/implementation completes, logo upload for all B2B tenants becomes a simple feature addition to the new profile page, reusing existing backend routes.

White Label branding remains architecturally separate and premium-only, preserving its value while enabling basic company identity for all tenants.

---

*End of Report*
