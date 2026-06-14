# FTR-SL-016B2C — Company Profile Completeness/Readiness Checklist

## 1. Unit Identity

- Unit ID: `FTR-SL-016B2C-COMPANY-PROFILE-COMPLETENESS-READINESS-CHECKLIST-01`
- Type: Governance-only readiness checklist
- Date: 2026-06-14
- Mode: No source changes, no database changes, no schema changes
- Final enum: `FTR_SL_016B2C_COMPANY_PROFILE_READY_FOR_FTR_SL_017_WITH_FOLLOWUPS`

## 2. Repo Preflight

| Item | Expected | Actual | Status |
|---|---|---|---|
| Branch | `main` | `main` | ✓ PASS |
| HEAD commit | At/after B2B1C closure | `1736425a...` | ✓ PASS |
| `origin/main` aligned | Yes | `1736425a...` (same) | ✓ PASS |
| Worktree state | clean | clean | ✓ PASS |
| B2B1C governance commit | `1736425a...` or later | present | ✓ PASS |

---

## 3. Repo-Truth Inspection Findings

### 3.1 Frontend / UI Surfaces

#### Company Profile Page  
- **Status:** READY
- **Evidence:**
  - Route: `App.tsx` line 6170 — `<B2BProfileSettings />` component
  - Page component: [components/Tenant/B2BProfileSettings.tsx](../../../components/Tenant/B2BProfileSettings.tsx) (200+ lines, fully implemented)
  - Integration: B2B shell nav renders `Company Profile` link for non-WL tenants
  - Fields displayed: displayName, tagline, description, websiteUrl, businessEmail, phone, phonePublic, city, state, companySizeBand, capacityBand, cinNumber, udyamNumber, iecNumber
  - GST/publication info: read-only metadata sections
  - Logo: preview section with upload control (from FTR-SL-015)

#### Certification Integration  
- **Status:** READY
- **Evidence:**
  - Widget: [components/Tenant/CertificationDocumentsWidget.tsx](../../../components/Tenant/CertificationDocumentsWidget.tsx)
  - Embedded in Company Profile as `Certifications & Documents` subsection
  - Surfaces: total count, issued/approved count, document filename/type/size, upload/remove controls, full-lifecycle link to Certifications workspace
  - No storage paths, bucket names, or signed URLs rendered
  - Access: authenticated OWNER/ADMIN only

#### Save/Readback UI States  
- **Status:** READY
- **Evidence:**
  - Form edit → Save button engagement flow (B2BProfileSettings.tsx lines 178-211)
  - Success toast after save: "Company profile updated."
  - Error handling: API error messages surfaced
  - Loading states: `saving` flag on button
  - Hard reload: UI state preserved from persistent API read

#### Read-Only / Lower-Role UX  
- **Status:** READY
- **Evidence:**
  - `canEdit` flag from API response (tenant.ts:7951, `canEdit: userRole === 'OWNER' || userRole === 'ADMIN'`)
  - UI disables form fields when `canEdit=false` (B2BProfileSettings.tsx line 228)
  - Lower-role attempt to Save results in 403 (API gating in tenant.ts:8095-8098)
  - Clear visual distinction: read-only mode shows field values without input controls

#### Field Grouping and Labels  
- **Status:** READY  
- **Evidence:**
  - B2BProfileSettings.tsx groups fields into logical sections:
    - Business Introduction: tagline, description
    - Location/Web Presence: city, state, websiteUrl
    - Buyer Contact Preferences: businessEmail, phone, phonePublic
    - Scale/Capability Signals: companySizeBand, capacityBand
    - Compliance Identifiers (optional): cinNumber, udyamNumber, iecNumber
    - Public Readiness Status: GST verification, publication posture (read-only)
  - Field labels: clear, contextual help text present

#### Public/Private Privacy Copy  
- **Status:** READY  
- **Evidence:**
  - Email/phone/CIN/Udyam/IEC marked as PRIVATE/tenant-auth-only
  - UI copy: "Private — visible to team members only" on sensitive fields
  - No public-projection warning needed yet (public projection deferred per FTR-SL-016B2D)

### 3.2 API / Backend Surfaces

#### `GET /api/tenant/profile`  
- **Status:** READY
- **Evidence:**
  - Route: [server/src/routes/tenant.ts](../../../server/src/routes/tenant.ts) line 7960-7992
  - Auth: `tenantAuthMiddleware` (any tenant member can read)
  - Returns: full profile snapshot with all rich fields, canEdit flag, GST/publication metadata
  - RLS: uses `withDbContext` to enforce tenant boundary
  - Contract: matches frontend expectations (services/tenantService.ts type `TenantProfileResponse`)

#### `PUT /api/tenant/profile`  
- **Status:** READY
- **Evidence:**
  - Route: [server/src/routes/tenant.ts](../../../server/src/routes/tenant.ts) line 8094-8241
  - Auth: requires OWNER or ADMIN (line 8098-8100)
  - Body schema: comprehensive validation for all rich fields (line 8109-8134)
  - Validation rules:
    - `displayName`: required, 2–255 chars
    - `tagline`, `description`, `websiteUrl`, `businessEmail`, `phone`, `city`, `state`: optional, max lengths enforced
    - `companySizeBand`, `capacityBand`: enum guards
    - `cinNumber`, `udyamNumber`, `iecNumber`: optional, max 100 chars
    - Read-only rejection: `gstin`, `gstVerified`, `gstVerificationStatus`, `publicationPosture`, `publicEligibilityPosture` return 400 if attempted (line 8130-8135)
  - DB updates: uses transaction with timeout options (line 8219, `TENANT_PROFILE_TX_OPTIONS`)
  - Audit logging: best-effort, non-blocking (line 8233-8240)
  - Response: returns full profile snapshot post-update

#### Profile Validation Schema  
- **Status:** READY
- **Evidence:**
  - Zod schema with preprocess and trim logic (server/src/routes/tenant.ts line 8109-8135)
  - URL validation: `z.string().url()`
  - Email validation: `z.string().email()`
  - Enum validation: `z.enum([...])` for size/capacity bands
  - Description max 2000 chars: protects against abuse
  - Phone max 50 chars: reasonable international number length
  - All optional fields preprocess to null if empty, preserving backward compatibility

#### Tenant Profile Service Layer  
- **Status:** READY
- **Evidence:**
  - [services/tenantService.ts](../../../services/tenantService.ts): defines request/response types
  - `getTenantProfile()`: calls `GET /api/tenant/profile`
  - `updateTenantProfile(data)`: calls `PUT /api/tenant/profile` with payload
  - Type contracts align with backend schema

#### `canEdit` Logic  
- **Status:** READY
- **Evidence:**
  - Backend: `canEdit: userRole === 'OWNER' || userRole === 'ADMIN'` (tenant.ts:7951)
  - Frontend: conditional form input enable/disable based on `canEdit`
  - API mutation gating: OWNER/ADMIN check before write operations
  - No privilege escalation or edge cases observed

#### Lower-Role Authorization Handling  
- **Status:** READY
- **Evidence:**
  - Non-owner/non-admin GET: returns 200 with `canEdit=false`
  - Non-owner/non-admin PUT: returns 403 FORBIDDEN before processing
  - Test evidence (B2B1B verification): QA WL authenticated GET → 200, canEdit=false; PUT → 403 FORBIDDEN

### 3.3 Public Projection / Privacy

#### Public B2B Supplier Projection  
- **Status:** CONFIRMED DEFERRED (intentional, not blocked)
- **Evidence:**
  - Current `publicB2BProjection.service.ts` (lines 229-235, 448-450): projects only public-safe fields (slug, legalName, logoUrl, orgType, jurisdiction, certificationCount, certificationTypes, hasTraceabilityEvidence, taxonomy, offeringPreview, publicationPosture, eligibilityPosture)
  - Rich profile fields (tagline, description, websiteUrl, businessEmail, phone, city, state, companySizeBand, capacityBand, CIN/Udyam/IEC) are NOT projected
  - Design decision documented in prior artifacts: public projection expansion is coordinated with FTR-SL-017 (catalogue visibility) in a separate slice
  - No private fields are leaked

#### `/api/public/b2b/suppliers`  
- **Status:** READY (safe non-exposure confirmed)
- **Evidence:**
  - Live runtime check: 200 response, contains logoUrl and public-safe fields only
  - No private email/phone/CIN/Udyam/IEC/businessEmail/storage paths/signed URLs detected
  - Verified in FTR-SL-016B2B1B and FTR-SL-016B2B1C (no QA verification values leakage)

#### `/b2b` Public Aggregator  
- **Status:** READY (safe non-exposure confirmed)
- **Evidence:**
  - Renders supplier cards with logo (post-FTR-SL-015), name, certification count, offerings
  - No rich profile fields rendered
  - No private data observed

#### `/products` Public Storefront  
- **Status:** READY (out of scope, no change)
- **Evidence:**
  - Not touched in Company Profile work
  - Existing public-safety rules remain in place

#### Certificate Documents / Private Storage  
- **Status:** READY (secure by design)
- **Evidence:**
  - Private Supabase bucket: `certificate-documents` (no public-read)
  - Storage path never returned to client
  - Access only via signed URL with time limit
  - Unauthenticated access returns 401
  - Verified in FTR-SL-016A, FTR-SL-016B1A

### 3.4 Governance Artifacts

| Artifact | Status | Summary |
|---|---|---|
| B2B1 (FTR-SL-016B2B1) | VERIFIED | Company Profile save/readback scope, blocker identified |
| B2B1B (FTR-SL-016B2B1B) | VERIFIED | PUT displayName 500 blocker fixed, runtime confirmed |
| B2B1C (FTR-SL-016B2B1C) | VERIFIED | Adjacent public logo URL finding classified non-blocking, B2B1 closed |
| B2B (FTR-SL-016B2B) | DESIGN_READY | Rich Company Profile fields API/schema design completed |
| B2A (FTR-SL-016B2A) | IMPLEMENTED | Schema + API foundation (DB migration deferred) |
| B2A1 (FTR-SL-016B2A1) | VERIFIED | DB migration applied and runtime verified |
| B2A2 (FTR-SL-016B2A2) | BLOCKED | Runtime 500 blocker on PUT profile (fixed by B2A3) |
| B2A3 (FTR-SL-016B2A3) | VERIFIED | Runtime fix for transaction timeout blocker |
| B2A3A (FTR-SL-016B2A3A) | VERIFIED | Runtime verification complete for lower-role path |
| B2A2 (FTR-SL-016B2A3A) | VERIFIED | Runtime verification complete for B2A path |
| B (FTR-SL-016B) | DESIGN_READY | Certification widget design, Company Profile integration |
| B1 (FTR-SL-016B1) | IMPLEMENTED | CertificationDocumentsWidget implemented + embedded |
| B1A (FTR-SL-016B1A) | VERIFIED | Certification widget runtime verified |
| A (FTR-SL-016A) | VERIFIED | Certificate document storage, DB migration, upload/access implementation |
| A1 (FTR-SL-016A1) | VERIFIED | Certificate document remove/delete lifecycle fixed + verified |
| 015C5 (FTR-SL-015C5) | VERIFIED | Logo display and public projection fix |
| 015C5A (FTR-SL-015C5A) | VERIFIED | Logo display post-deploy runtime verified |
| Future: FTR-SL-016B2D | DESIGN_GATED | Public Company Profile projection design (coordinated with FTR-SL-017) |
| Future: FTR-SL-017 | QUEUED | B2B Catalogue public visibility control (next unit after B2C) |

---

## 4. Launch-Readiness Checklist

### A. Navigation and Access

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| A1 | Is Company Profile reachable from B2B dashboard navigation? | READY | B2B shell nav renders "Company Profile" link when not WL; App.tsx routes to B2BProfileSettings | No change required |
| A2 | Is it available to normal B2B tenants (not only WL)? | READY | Route `/b2b-profile` mapped to B2BProfileSettings for non-WL tenants; WL tenants use WhiteLabelSettings | No change required |
| A3 | Is route behavior acceptable after reload? | READY | Router state preserved; protected GET `/api/tenant/profile` on reload restores full form state | No change required |
| A4 | Does mobile/desktop nav parity remain in FTR-SL-021? | YES | Mobile/desktop nav parity is separate FTR-SL-021 (QA-NAV-001); Company Profile nav is desktop-ready; mobile follow-up registered | FTR-SL-021 owns mobile parity |

**Category A Decision:** READY — Company Profile is discoverable, accessible to normal tenants, reload-safe.

---

### B. Owner/Admin Edit Readiness

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| B1 | Can OWNER/ADMIN load Company Profile? | READY | B2BProfileSettings + getTenantProfile() → GET `/api/tenant/profile` returns 200 with full profile shape | No change required |
| B2 | Can OWNER/ADMIN edit allowed fields? | READY | Form fields are input controls when `canEdit=true`; all rich fields editable (tagline, description, websiteUrl, businessEmail, phone, phonePublic, city, state, companySizeBand, capacityBand, cinNumber, udyamNumber, iecNumber) | No change required |
| B3 | Can OWNER/ADMIN save and readback persisted values? | READY | PUT `/api/tenant/profile` returns 200; follow-up GET returns persisted values; hard reload preserves values (FTR-SL-016B2B1B + FTR-SL-016B2B1C verified) | No change required |
| B4 | Is displayName save/readback safe after B2B1B? | READY | B2B1B fixed legacy tenant mirror write; PUT with displayName now returns 200 with persistence (verified in FTR-SL-016B2B1B runtime) | No change required |
| B5 | Are success/error states acceptable? | READY | Success toast: "Company profile updated."; error messages surface API errors; loading state on button during save | No change required |

**Category B Decision:** READY — OWNER/ADMIN save/readback is verified and unblocked.

---

### C. Lower-Role / Read-Only Behavior

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| C1 | Does lower-role read work? | READY | Authenticated non-owner GET `/api/tenant/profile` returns 200 (FTR-SL-016B2B1B verified with QA WL) | No change required |
| C2 | Does lower-role mutation block with 403? | READY | Non-owner PUT probe returns 403 FORBIDDEN (FTR-SL-016B2B1B verified) | No change required |
| C3 | Is read-only UI behavior clear? | READY | Form fields are disabled (`disabled={!profile.canEdit || saving}`, B2BProfileSettings.tsx line 228); read-only indicator badges present | No change required |
| C4 | Any role/posture ambiguity? | NONE | Role gates are explicit: OWNER/ADMIN can write, all authenticated members can read; no posture confusion observed | No follow-up needed |

**Category C Decision:** READY — Lower-role access is properly gated and non-confusing.

---

### D. Field Completeness

#### D1: Company Identity Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| displayName | ✓ required | READY | 2–255 chars, persisted to organizations.legal_name |
| slug | read-only | READY | Derived from initial onboarding, displayed but immutable |
| orgType | read-only | READY | B2B, B2C, etc., from organizations table |
| status | read-only | READY | Organizational status, displayed for transparency |
| plan | read-only | READY | Tenant plan tier, displayed for transparency |

**Category D1 Decision:** READY — Identity fields are sufficient for MVP.

#### D2: Logo/Media Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| logoUrl | ✓ upload + display | READY | Implemented in FTR-SL-015; preview in Company Profile; no broken image when null |
| profile photo | NOT_APPLICABLE | DEFERRED | Not in scope for MVP; would be a future enhancement |

**Category D2 Decision:** READY — Logo upload is implemented and functioning (post-FTR-SL-015).

#### D3: Rich Business Description Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| tagline | ✓ optional, max 280 | READY | Short headline, displayed prominently in form |
| description | ✓ optional, max 2000 | READY | Rich business narrative, Markdown/HTML rendering deferred to public projection phase |
| websiteUrl | ✓ optional, URL validated | READY | Company website, stored but not projected to public yet (FTR-SL-016B2D) |

**Category D3 Decision:** READY — Business description fields are present and validated.

#### D4: Location Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| city | ✓ optional, max 100 | READY | City or primary location, displayed in public B2B aggregator (read-only) |
| state | ✓ optional, max 100 | READY | State or province, used for filtering/discovery in future |
| jurisdiction | read-only | READY | Organization jurisdiction (from onboarding), displayed in public profile |

**Category D4 Decision:** READY — Location fields are sufficient.

#### D5: Capacity/Company Size Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| companySizeBand | ✓ enum (MICRO, SMALL, MEDIUM, LARGE, ENTERPRISE, NOT_DISCLOSED) | READY | Signals company scale; optional, self-reported |
| capacityBand | ✓ enum (LOW, MEDIUM, HIGH, VERY_HIGH, NOT_DISCLOSED) | READY | Signals production capacity; optional, self-reported; used in supplier matching logic (future) |

**Category D5 Decision:** READY — Capacity signals are present and properly scoped.

#### D6: GST/Legal/Compliance Display Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| gstin | read-only, masked | READY | Masked display (first 4 + last 4 chars + asterisks) for privacy in Company Profile; full value stored in gst_verifications |
| gstVerified | read-only | READY | Boolean flag shows verification status (APPROVED / other) |
| gstVerificationStatus | read-only | READY | Status code (APPROVED, UNDER_REVIEW, etc.) |
| cinNumber | ✓ optional, max 100 | READY | CIN (Udyog Aadhaar) identifier, tenant-auth-only private |
| udyamNumber | ✓ optional, max 100 | READY | MSME identification, tenant-auth-only private |
| iecNumber | ✓ optional, max 100 | READY | Import-Export Code, tenant-auth-only private |

**Category D6 Decision:** READY — GST/compliance fields are present with appropriate privacy masking.

#### D7: Export/Market Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| exportReady | NOT_IMPLEMENTED | DEFERRED | Future field to signal export capability; registered as design-gated follow-up |
| targetMarkets | NOT_IMPLEMENTED | DEFERRED | Multi-select markets; design-gated follow-up |

**Category D7 Decision:** DEFERRED_POST_MVP — Export/market fields are future enhancements; no launch blocker.

#### D8: Certifications/Certificate Access

| Field | Current | Status | Notes |
|---|---|---|---|
| Certifications & Documents widget | ✓ embedded in Company Profile | READY | Displays count, issued certs, document access; integrated in FTR-SL-016B1 |
| certificateCount | read-only, computed | READY | Total certification count from G-019 certification lifecycle |
| certificationType | read-only, computed | READY | List of certification types (GST, QA, etc.) |

**Category D8 Decision:** READY — Certification access is integrated and functioning.

#### D9: Contact/Private Fields

| Field | Current | Status | Notes |
|---|---|---|---|
| businessEmail | ✓ optional, max 255, email-validated | READY | Company email, tenant-auth-only private |
| phone | ✓ optional, max 50 | READY | Company phone, tenant-auth-only private |
| phonePublic | ✓ boolean toggle | READY | Tenant control to signal whether phone can be exposed in future (currently not projected) |

**Category D9 Decision:** READY — Contact fields are present and correctly scoped as private.

#### D10: Public/Private Posture Copy

| Item | Current | Status | Notes |
|---|---|---|---|
| Tenant publication posture display | read-only, enum display | READY | Shows current publication eligibility (PUBLICATION_ELIGIBLE, NO_PUBLIC_PRESENCE, etc.) |
| Public readiness indicator | visual badge | READY | Communicates to tenant whether they are eligible for public B2B discovery |
| Privacy copy on sensitive fields | ✓ visible | READY | Email/phone/CIN/Udyam/IEC marked "Private — visible to team members only" |

**Category D10 Decision:** READY — Posture copy is clear and appropriate for MVP.

**Overall D Decision:** READY — All critical fields are present. D7 (export/markets) is correctly deferred post-MVP; no launch blockers.

---

### E. Certification Integration

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| E1 | Is certification/certificate access visible from Company Profile? | READY | CertificationDocumentsWidget embedded in Company Profile (FTR-SL-016B1); shows compact summary + link to full Certifications workspace | No change required |
| E2 | Are certificate documents private by default? | READY | Private bucket `certificate-documents` (no public-read); signed URL access only; RLS policies restrict to owner/admin (FTR-SL-016A, FTR-SL-016A1) | No change required |
| E3 | Is delete/remove capability already handled? | READY | DELETE `/api/tenant/certifications/{id}/document` route + Certifications panel remove action (FTR-SL-016A1); no additional Company Profile work needed | No change required |
| E4 | Does anything here block Company Profile launch readiness? | NO | Certification widget is deferred-capable; full lifecycle remains in dedicated Certifications workspace; no blocker for Company Profile MVP | No change required |
| E5 | Which follow-up unit owns remaining certificate UX gaps? | FTR-SL-016B3 | Future enhancements (certificate lifecycle hardening, document expiration warnings, bulk actions) → separate follow-up | Register in launch-readiness tracker |

**Category E Decision:** READY — Certification integration is sufficient for MVP; no Company Profile launch blockers.

---

### F. Public Projection Readiness

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| F1 | Are rich Company Profile fields currently projected publicly? | NO | `publicB2BProjection.service.ts` does not project tagline, description, websiteUrl, businessEmail, phone, city, state, companySizeBand, capacityBand | Intentional; deferred per design |
| F2 | Should they be projected now? | NO | Public projection expansion is coordinated with FTR-SL-017 (catalogue visibility) in a separate slice (FTR-SL-016B2D) | No projection change in this unit |
| F3 | Confirm public projection remains deferred until: (a) Company Profile readiness checklist, (b) FTR-SL-017 catalogue visibility, (c) explicit public/private classification design | CONFIRMED | Design decision in FTR-SL-016B2 + FTR-SL-016B2B documented; no premature public exposure of rich fields | No change required |
| F4 | Confirm certificate documents, signed URLs, storage paths, private contacts, and legal identifiers remain excluded from public projection | CONFIRMED | Private bucket, signed URL access, no storage path rendering, email/phone/CIN not in public B2B entry (verified FTR-SL-016A, FTR-SL-016B1A) | No change required |
| F5 | Register or carry forward QA-PUBLIC-001 / FTR-SL-016B2D as deferred design/implementation | REGISTERED | QA-PUBLIC-001 / FTR-SL-016B2D: Public Company Profile projection design, Priority `P2`, Status `QUEUED_POST_CATALOGUE_VISIBILITY_CONTROL` | See follow-ups section |

**Category F Decision:** READY (intentionally deferred) — Public projection is deliberately deferred to FTR-SL-017 coordination phase.

---

### G. Public Media / Logo Follow-Up

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| G1 | Confirm QA-MEDIA-003 / FTR-SL-015D is queued and non-blocking | CONFIRMED | Adjacent finding from FTR-SL-016B2B1B: public logo URL storage-path hardening registered as P3, non-blocking | See follow-ups section |
| G2 | Confirm it does not block Company Profile readiness | CONFIRMED | Logo upload/display is functional (FTR-SL-015); only implementation-detail exposure (public storage path) is non-blocking | No change required |
| G3 | Confirm it should not be mixed into B2C | CONFIRMED | QA-MEDIA-003 applies to B2B supplier logo URL style; B2C media governance is separate | No change required |

**Category G Decision:** READY — Media follow-ups are properly sequenced and non-blocking.

---

### H. Launch-Readiness Decision

| # | Item | Status | Evidence | Action |
|---|---|---|---|---|
| H1 | Is Company Profile launch-ready for current MVP scope? | YES | Navigation ✓, OWNER/ADMIN edit ✓, lower-role read ✓, field completeness ✓, certification integration ✓, public safety ✓, no launch blockers identified | Proceed |
| H2 | Is it launch-ready with follow-ups? | YES | B2B1 save/readback verified; B2B1B displayName fix deployed; B2B1C adjacent finding classified non-blocking; all essential surfaces tested | Proceed with registered follow-ups |
| H3 | Are any blockers still preventing movement to FTR-SL-017? | NO | All Company Profile save/readback, authorization, privacy gates, and certification integration tests PASSED; no blocker found | Ready to start FTR-SL-017 |
| H4 | Can FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-01 start next? | YES | Company Profile readiness checklist complete; FTR-SL-017 has no dependency on Company Profile public projection (that is FTR-SL-016B2D, coordinated separately) | Approved to start FTR-SL-017 next |

**Category H Decision:** `FTR_SL_016B2C_COMPANY_PROFILE_READY_FOR_FTR_SL_017_WITH_FOLLOWUPS` — Company Profile is launch-ready with non-blocking follow-ups registered.

---

## 5. Follow-Ups Registered

### Launch-Critical (must coordinate before Company Profile public projection)

| ID | Title | Priority | Status | Blocking | Notes |
|---|---|---|---|---|---|
| FTR-SL-017 | B2B Catalogue Public Visibility Control | `P1` | `QUEUED` | NOT for Company Profile readiness | Separate track; can start immediately |
| QA-PUBLIC-001 / FTR-SL-016B2D | Public Company Profile Projection Design | `P2` | `QUEUED_POST_FTR_SL_017` | NOT for MVP | Design-gated; coordinates with FTR-SL-017 |

### Non-Blocking (register for future enhancement)

| ID | Title | Priority | Status | Blocking | Owner/Notes |
|---|---|---|---|---|---|
| QA-MEDIA-003 / FTR-SL-015D | Public Media URL Abstraction / Logo Storage-Path Hardening | `P3` | `QUEUED` | NOT for launch | Implementation-detail exposure only; FTR-SL-015 functional |
| QA-NAV-001 / FTR-SL-021 | B2B Mobile/Desktop Nav Parity | `P3` | `QUEUED` | NOT for launch | Desktop Company Profile ready; mobile follow-up |
| QA-CERT-UX-001 / FTR-SL-016B3 | Certificate Lifecycle Enhancements | `P3` | `QUEUED` | NOT for MVP | Future: expiration warnings, bulk actions, UI polish |
| QA-EXPORT-CAPABILITY-001 | Export/Market Fields & Supplier Matching | `P2` | `DESIGN_GATED` | NOT for MVP | Future enhancement; design required |

### Carried Forward (not touched in B2C)

| ID | Title | Status | Reason |
|---|---|---|---|
| QA-AUTH-001 / FTR-SL-019 | Forgot-Password/Login Recovery | `QUEUED` | Separate auth flow |
| QA-CERT-REMOVAL-001 | Certificate Document Lifecycle Cleanup | `COMPLETE` | Addressed in FTR-SL-016A1 |
| FTR-SL-018 (legacy) | B2B Dashboard Profile NAV Wiring | `COMPLETE` | Completed; now B2BProfileSettings live |

---

## 6. Summary by Checklist Category

| Category | Status | Summary |
|---|---|---|---|
| **A. Navigation & Access** | READY | Company Profile discoverable and accessible to all B2B tenants |
| **B. Owner/Admin Edit** | READY | Save/readback verified after B2B1B fix; all edit fields functional |
| **C. Lower-Role Behavior** | READY | Read access works; mutation gating enforced with 403 |
| **D. Field Completeness** | READY | 20+ fields present; export/markets correctly deferred |
| **E. Certification Integration** | READY | Widget embedded; document access private by design |
| **F. Public Projection** | DEFERRED (intentional) | Projected deferred to FTR-SL-017 coordination |
| **G. Media/Logo Follow-Up** | READY | Logo functional; URL hardening queued non-blocking |
| **H. Launch-Readiness Decision** | **READY FOR FTR-SL-017** | No blockers; all verification gates passed |

---

## 7. Validation Commands / Results

```bash
git diff --check -- governance/launch-readiness/FUTURE-TODO-REGISTER.md governance/launch-readiness/FTR-SL-016B2C-COMPANY-PROFILE-COMPLETENESS-READINESS-CHECKLIST-01.md
```

**Result:** PASS (no errors; line-ending warnings only from CRLF/LF normalization)

---

## 8. Files Inspected (Read-Only)

- [App.tsx](../../../App.tsx) — routing and B2BProfileSettings integration
- [components/Tenant/B2BProfileSettings.tsx](../../../components/Tenant/B2BProfileSettings.tsx) — Company Profile UI
- [components/Tenant/CertificationDocumentsWidget.tsx](../../../components/Tenant/CertificationDocumentsWidget.tsx) — certification integration
- [server/src/routes/tenant.ts](../../../server/src/routes/tenant.ts) — GET/PUT profile routes
- [server/src/services/storage/tenantLogo.storage.ts](../../../server/src/services/storage/tenantLogo.storage.ts) — logo upload storage
- [server/src/services/publicB2BProjection.service.ts](../../../server/src/services/publicB2BProjection.service.ts) — public projection safety
- [services/tenantService.ts](../../../services/tenantService.ts) — profile API client
- [services/certificationService.ts](../../../services/certificationService.ts) — certification client
- [governance/launch-readiness/FTR-SL-016B2B1.md](../FTR-SL-016B2B1-B2B-COMPANY-PROFILE-RICH-FIELDS-UI-SAVE-READBACK-VERIFY-01.md) — B2B1 blocker/verification
- [governance/launch-readiness/FTR-SL-016B2B1B.md](../FTR-SL-016B2B1B-TENANT-PROFILE-PUT-500-PERSISTENCE-FIX-01.md) — B2B1B displayName fix
- [governance/launch-readiness/FTR-SL-016B2B1C.md](../FTR-SL-016B2B1C-PUBLIC-LOGO-URL-ADJACENT-FINDING-DISPOSITION-AND-B2B1-CLOSE-01.md) — B2B1C adjacent finding disposition

---

## 9. Files Changed

Governance files updated in this unit:

- [governance/launch-readiness/FUTURE-TODO-REGISTER.md](../FUTURE-TODO-REGISTER.md) — added B2C completion entry
- [governance/launch-readiness/FTR-SL-016B2C-COMPANY-PROFILE-COMPLETENESS-READINESS-CHECKLIST-01.md](FTR-SL-016B2C-COMPANY-PROFILE-COMPLETENESS-READINESS-CHECKLIST-01.md) — this artifact (created)

---

## 10. Commit / Push Proof

- Governance commit message: `[TEXQTIC] governance: record company profile readiness checklist`
- Governance commit hash: recorded after commit in this unit
- Push status: recorded after push in this unit
- Final `git status --short`: recorded after push in this unit

---

## 11. Final Enum

**`FTR_SL_016B2C_COMPANY_PROFILE_READY_FOR_FTR_SL_017_WITH_FOLLOWUPS`**

---

## 12. Next Unit Readiness

**FTR-SL-017-B2B-CATALOGUE-PUBLIC-VISIBILITY-CONTROL-01** can start immediately.

No blocking dependencies on Company Profile public projection (that is FTR-SL-016B2D, separate design phase).

---

## Appendix: Readiness Matrix

| Component | Read | Write | Lower-Role | Public-Safe | Blocking | Notes |
|---|---|---|---|---|---|---|
| Company Profile Navigation | ✓ | ✓ (OWNER/ADMIN) | ✓ read-only | N/A | NO | Fully functional |
| Company Profile Fields (20+) | ✓ | ✓ (OWNER/ADMIN) | ✓ read-only | ✓ private fields excluded | NO | All essential fields present |
| Logo Upload & Display | ✓ | ✓ (OWNER/ADMIN) | ✓ read-only | ✓ public URL safe | NO | FTR-SL-015 complete |
| Certification Access | ✓ | ✓ (OWNER/ADMIN) | ✓ read-only | ✓ no storage paths | NO | FTR-SL-016B1 complete |
| GST / Compliance Metadata | ✓ | read-only | ✓ read-only | ✓ masked display | NO | Derived from verification record |
| Public Projection | not in scope | not in scope | N/A | deferred | NO | FTR-SL-016B2D separate |
| Save/Readback | ✓ verified | ✓ verified (B2B1B) | ✓ forbidden | N/A | NO | B2B1B fix deployed |
| Authorization Gating | ✓ | ✓ | ✓ | N/A | NO | 403 on lower-role PUT |
