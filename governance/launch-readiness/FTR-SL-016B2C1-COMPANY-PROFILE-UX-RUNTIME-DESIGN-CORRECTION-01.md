# FTR-SL-016B2C1 — Company Profile UX/Runtime Design Correction

**Unit ID:** `FTR-SL-016B2C1-COMPANY-PROFILE-UX-RUNTIME-DESIGN-CORRECTION-01`

**Date:** 2026-06-14

**Status:** CORRECTIVE UNIT (reopens prior B2C closure)

**Initiator:** Paresh manual QA in Shraddha Industries workspace

---

## 1. Unit Context & Motivation

Prior unit `FTR-SL-016B2C` marked Company Profile as **READY** with enum:

```
FTR_SL_016B2C_COMPANY_PROFILE_READY_FOR_FTR_SL_017_WITH_FOLLOWUPS
```

**Manual QA Finding (Paresh):**

Paresh tested Company Profile in Shraddha Industries B2B workspace and reported:

> _"Clicking `Save Company Profile` did not visibly process/save as expected. After refreshing, entered content appeared, but the page still displayed editable form boxes instead of a proper Company Profile UI/section. The current experience feels like a raw settings/edit form, not a launch-ready company profile presentation. This cycle was not properly design-planned, which likely caused repeated issues after implementation."_

**Issue Classification:** Not a save defect; a **UX/design readiness gap** in profile presentation.

---

## 2. Repo Preflight

```bash
# Preflight confirmed (prior session)
branch: main
HEAD: 1b7b3145 (FTR-SL-016B2C closure commit, pushed)
status: clean tracked worktree (no uncommitted changes)
origin/main: aligned with HEAD
```

---

## 3. Files Inspected

### Frontend
- **components/Tenant/B2BProfileSettings.tsx** (270+ lines)
  - Component structure: always-edit form with all fields as textboxes/comboboxes
  - State management: `loading`, `saving`, `uploadingLogo`, `error`, `success`, `form`, `profile`
  - Dirty detection: `hasUnsavedChanges` computed via `JSON.stringify(draftPayload) !== JSON.stringify(createPayloadFromProfile(profile))`
  - Save handler: validation, API call, state refresh, 3-second success toast
  - Save button logic: disabled when `loading || saving || uploadingLogo || !canEdit || !hasUnsavedChanges`
  - **Design:** No separate view mode; form remains visible after save

- **components/Tenant/CertificationDocumentsWidget.tsx** (embedded widget, working correctly)

- **services/tenantService.ts** (API client, working correctly)

### Backend
- **server/src/routes/tenant.ts** (GET/PUT /api/tenant/profile routes)
  - GET route: returns profile snapshot with `canEdit: userRole === 'OWNER' || userRole === 'ADMIN'`
  - PUT route: validates, checks authorization, persists changes, returns updated snapshot
  - **Status:** Working correctly; no bugs found

### Database & RLS
- Schema and RLS policies confirmed working (from prior B2C inspection)

### Governance
- FTR-SL-016B2C-COMPANY-PROFILE-COMPLETENESS-READINESS-CHECKLIST-01.md (prior readiness conclusion)
- FTR-SL-016B2B1B fix confirmed deployed (displayName save 500 blocker resolved)
- FTR-SL-016B2B1C adjacent finding classified (logo URL storage-path exposure, non-blocking)

---

## 4. Manual QA Evidence Summary

**Environment:** Shraddha Industries B2B workspace (Free plan, VERIFICATION_APPROVED status)

**User Role:** Authenticated tenant member with access to Company Profile page

**Profile Data State:**
- Company Name: Shraddha Industries ✓
- Logo: Present ✓
- Tagline: "Weaving Quality, Delivering Trust..." ✓
- Description: Long textile business description (891/2000 chars) ✓
- Website URL: **Empty** ✗ (missing check)
- City: Surat ✓
- State: "Guj" (incomplete, should be "Gujarat") ~
- Business Email: shraddhaind@gmail.com ✓
- Phone: Empty ~
- Company Size Band: Small ✓
- Capacity Band: Medium ✓
- Publication Posture: B2B_PUBLIC ✓
- Certifications: 2 total, 1 document uploaded ✓

**Profile Completeness:** 9/10 rich launch-profile checks complete (Website URL is missing)

**Paresh's Observations:**

1. Save button appeared disabled initially
2. After form interaction (entering data), button should enable but user's visual feedback was unclear
3. After save, page remained in form/edit mode with visible textboxes
4. No transition to a "profile view" or polished presentation section
5. UX felt like raw settings form, not launch-ready company profile display

---

## 5. Save Behavior Investigation

**Test Conducted:** Modified State field from "Guj" to "Gujarat", clicked Save

**Results:**

| Aspect | Finding |
|--------|---------|
| **Dirty detection** | ✅ Working — button enabled when form != profile |
| **Save button state** | ✅ Shows "Saving..." during request, then returns to "Save Company Profile" |
| **Fields disabled during save** | ✅ All inputs disabled during save (preventing concurrent edits) |
| **Backend response** | ✅ 200 status, profile snapshot returned |
| **Data persistence** | ✅ State field persisted "Gujarat" after reload-restart attempt |
| **Success feedback** | ✅ Toast shown (likely cleared after 3 seconds) |
| **Form after save** | ✅ Returns to enabled state, button disabled (no unsaved changes) |
| **UX transition** | ❌ Page stayed in edit-form mode (no view/read transition) |

**Conclusion:** Save functionality works correctly. **Issue is design/UX, not a persistence defect.**

---

## 6. Profile Presentation UX Investigation

### Current Design

**Structure:** Always-edit form layout

**Form Fields Visible:**
- All 17 rich profile fields rendered as:
  - Text inputs (displayName, tagline, description, websiteUrl, city, state, email, phone, CIN/Udyam/IEC)
  - Comboboxes (companySizeBand, capacityBand)
  - Checkbox (phonePublic preference)
  - File upload (logo)
  - Read-only displays (GSTIN, publication posture, eligibility)

**After Save:**
- Form returns to enabled state
- All textboxes remain visible
- Save button disabled (because form == profile now)
- No transition to view/read mode
- No separate "Edit Profile" button or mode toggle

**Visual Pattern:** Settings form (like tenant branding, feature toggles, config panels)

### Paresh's Assessment

> _"The page remains form/edit-box heavy after content entry, rather than showing a polished company profile display section."_

This suggests expectation of:
- A professional profile view/presentation section
- Possible edit mode toggle (like "Edit Profile" button)
- Or a split layout (preview + manage details)
- Not the current always-edit-form pattern

### Product Design Gap

**Prior B2C Checklist** verified:
- ✅ Navigation/Access (page routable)
- ✅ Owner/Admin Edit (authorization working)
- ✅ Lower-Role Read-Only (403 blocking writes)
- ✅ Field Completeness (17 fields present)
- ✅ Certification Integration (widget embedded)
- ✅ Public Projection (no private leakage)
- ✅ Media/Logo (upload working)
- ✅ Launch-Readiness Decision (classified ready)

**What Was NOT Verified:**
- 🔴 Profile view/presentation design (always-edit, no separate view mode)
- 🔴 UX readiness for polished company profile display
- 🔴 Success feedback clarity (toast transient)
- 🔴 Disabled button state messaging (confusing reason why disabled)

**Classification:** Technical readiness verified; **product design readiness not verified.**

---

## 7. Root Cause Analysis

**Why B2C closure was optimistic:**

1. **Scope creep in checklistification** — Readiness checklist focused on feature functional existence rather than product/UX readiness
2. **No design review step** — Prior cycle skipped explicit product design planning
3. **Assumption of "settings form" pattern** — No explicit conversation about whether profile should be:
   - Settings-only (defer view to later) 
   - View-first with edit button
   - Split preview + manage details
4. **Verification gates tested persistence, not UX** — B2B1B and B2B1C closures verified save/auth work, but didn't assess launch UX adequacy

**Result:** Technical box was checked; product readiness box was left unchecked.

---

## 8. Corrected Readiness Classification

### Prior Enum (B2C)
```
FTR_SL_016B2C_COMPANY_PROFILE_READY_FOR_FTR_SL_017_WITH_FOLLOWUPS
```

### Corrected Enum (B2C1)
```
FTR_SL_016B2C1_B2C_READINESS_DOWNGRADED_DESIGN_PLAN_REQUIRED
```

### Reason
Company Profile technical foundation is solid (save/auth/RLS work), but **product design is incomplete**. Profile display mode (view vs. edit, form layout, UX feedback clarity) must be explicitly designed and approved by Paresh before marking as launch-ready.

---

## 9. Design Decision Required

**Choose One:**

### **Option 1: Settings-Only Profile (Minimal Scope)**

**Model:** Company Profile remains an internal settings form. Public profile display design deferred to `FTR-SL-016B2D` (public rich profile projection).

**UX:**
- Keep current always-edit form layout
- Improve success feedback: extend toast to 5 seconds, add inline "✓ Saved" confirmation near Save button
- Add disabled button reason messaging: "No changes to save" tooltip or inline help text
- Add save-state indicator (e.g., "All changes saved" status badge)

**Scope:** Small (UX feedback improvements only, no layout changes)

**Timeline:** Quick fix, can launch with non-blocking follow-up for toast/messaging UX

**Trade-off:** Profile stays form-heavy; polished view deferred to post-launch

### **Option 2: View-First with Edit Button (Recommended)**

**Model:** Page shows clean profile view by default. OWNER/ADMIN see "Edit Profile" button. Clicking button opens edit form. Save returns to view mode.

**UX:**
- Default view displays:
  - Company logo (centered, larger)
  - Company name (large, bold)
  - Tagline (tagline-style, italic)
  - Key badges: Size, Capacity, Publication status
  - Location (city, state inline)
  - Brief description (first 200 chars with "Read More" link)
  - Certification summary (count, types)
  - Business email & phone (read-only display)
  - GST/compliance status
- OWNER/ADMIN row: "✏️ Edit Profile" button
- Click Edit → form overlays or navigates to edit panel
- Save → returns to view mode

**Scope:** Medium (redesign view layout, add mode toggle, update save flow to transition back to view)

**Timeline:** Requires design + implementation (2-3 turns); can be gated or launched as Option 2a with fallback

**Trade-off:** Better product presentation; small scope increase but launch-ready UX

### **Option 3: Split Preview + Manage Details (Larger Scope)**

**Model:** Top section is polished profile preview; lower section is "Manage Profile Details" edit form.

**Scope:** Large (design split layout, maintain consistency)

**Timeline:** 3-4 turns; delayed launch

**Trade-off:** Most polished; may delay launch

---

## 10. Recommendation

**Recommended Option:** **Option 1 (Settings-Only) → Option 2 (View-First) as follow-up**

**Rationale:**
- Option 1 can launch quickly with non-blocking UX improvements
- Option 2 is small enough to execute if Paresh prioritizes
- Leaves Option 3 for future enhancements

**If Paresh prefers Option 2 before launch:** Assign as gated implementation unit; FTR-SL-017 waits for completion.

---

## 11. Source Changes

**None.** This is a governance-first unit. Source changes are not required unless Paresh directs implementation of Option 2 or additional UX feedback improvements.

**If implementing Option 1 UX improvements:**
- Extend success toast timer in B2BProfileSettings.tsx
- Add disabled button tooltip/help text  
- Add "All changes saved" confirmation badge
- **Scope:** Minimal (4-5 lines changed, safe to merge)

---

## 12. Validation

**No build/lint/test changes required.** This unit is governance documentation and design decision.

**If source changes made for Option 1:**
```bash
pnpm --filter web typecheck
pnpm --filter web lint
# Expected: PASS (only UX feedback strings/styling, no functional change)
```

---

## 13. Governance Artifact Updates Required

1. **FUTURE-TODO-REGISTER.md** — Update latest bounded update entry to record B2C1 correction and design decision required
2. **FTR-SL-016B2C artifact** — Add supersession note: "Corrected by FTR-SL-016B2C1 due to manual QA finding UX gap"
3. **This artifact** — FTR-SL-016B2C1-* (new entry, in launch-readiness folder)

---

## 14. Final Readiness Decision

### Prior Enum Status: **SUPERSEDED**

```
FTR_SL_016B2C_COMPANY_PROFILE_READY_FOR_FTR_SL_017_WITH_FOLLOWUPS
↓ 
CORRECTED BY FTR-SL-016B2C1 (UX design gap identified)
```

### Corrected Enum (B2C1)

```
FTR_SL_016B2C1_B2C_READINESS_DOWNGRADED_DESIGN_PLAN_REQUIRED
```

### FTR-SL-017 Status: **PAUSED**

Do not start FTR-SL-017 until:
1. Paresh confirms design option (Option 1, Option 2, or Option 3)
2. If Option 2/3: implementation unit is assigned and completed
3. B2C readiness is re-confirmed with updated enum

---

## 15. Adjacent Findings

**No new adjacent findings.** All prior findings (B2B1B, B2B1C) remain valid and don't change this unit's scope.

---

## 16. Commit & Push Status

**Governance changes only:** New artifact + FUTURE-TODO-REGISTER.md update + B2C correction note

**Commit message:** `[TEXQTIC] governance: correct company profile readiness after manual UX review`

**Status:** Ready to commit after FUTURE-TODO-REGISTER.md update

---

## 17. Files Changed Summary

| File | Action | Reason |
|------|--------|--------|
| governance/launch-readiness/FTR-SL-016B2C1-* | CREATE | This corrective artifact |
| governance/launch-readiness/FUTURE-TODO-REGISTER.md | UPDATE | Record B2C1 correction; design decision required |
| governance/launch-readiness/FTR-SL-016B2C-* | NOTE | Add supersession marker (FTR-SL-016B2C1) |

---

## 18. Next Steps (Paresh Decision Required)

**Paresh must choose:**

1. **Option 1:** Keep settings-only form, improve feedback UX, launch with non-blocking design follow-up
   - FTR-SL-017: Can start next (no blocker)
   - Follow-up: UX feedback improvements + view mode design (post-launch, P2)

2. **Option 2:** Implement view-first profile with edit button before launch
   - FTR-SL-017: Blocked until Option 2 implemented
   - Assignment: Design + implementation unit created; target: 2-3 turns
   - Impact: Delays FTR-SL-017 start by ~5 days

3. **Option 3:** Implement split preview + manage details before launch
   - FTR-SL-017: Blocked until Option 3 implemented
   - Assignment: Larger design + implementation unit; target: 3-4 turns
   - Impact: Delays FTR-SL-017 start by ~7-10 days

**Recommended:** Option 1 (fast) or Option 2 (launch-ready UX)

---

**Unit Status:** PARESH DESIGN DECISION RECEIVED — OPTION 3 SELECTED

**Paresh's Decision (B2C1 → B2C3):** Rejected Options 1 & 2, selected **Option 3 (Split Preview + Manage Details)** as launch-grade solution.

---

## 19. B2C3 Implementation Status

**Reference:** [FTR-SL-016B2C3-COMPANY-PROFILE-SPLIT-PREVIEW-MANAGE-DETAILS-UX-01.md](FTR-SL-016B2C3-COMPANY-PROFILE-SPLIT-PREVIEW-MANAGE-DETAILS-UX-01.md)

**Implementation Completed:** ✅ YES

**Details:**
- Refactored B2BProfileSettings.tsx to split layout (Profile Preview + Manage Details sections)
- Profile Preview: Polished company presentation (read-only, centered logo, tags, badges)
- Manage Details: Edit workspace (OWNER/ADMIN only, form grid, save button)
- TypeScript compilation: ✅ PASS (0 errors)
- ESLint: ✅ PASS (no errors in target component)
- Source commit: `e9041b7952a3cc703f16bb8aa4e79abb90bfa349` ([TEXQTIC] frontend: add split company profile workspace)
- Status: Implementation complete, runtime verification pending

**B2C Readiness:** ⏳ PENDING runtime verification (Shraddha Industries workspace QA required)

**FTR-SL-017 Unblocking:** 🔴 BLOCKED until B2C3 runtime QA passes

---

**Completion Gate:** This artifact + FUTURE-TODO-REGISTER update + B2C3 artifact + commit/push

---

## 20. Option 3 Runtime Closure (B2C3A)

**Runtime closure unit:** `FTR-SL-016B2C3A-SPLIT-COMPANY-PROFILE-RUNTIME-VERIFY-AND-CLOSE-01`

**Outcome:**
- Deployed split UX verified live in Shraddha Industries workspace
- Profile Preview + Manage Details separation verified
- Save/readback verified (`PUT /api/tenant/profile = 200`)
- Hard refresh persistence verified
- Public non-exposure smoke (`/api/public/b2b/suppliers`, `/b2b`, `/products`) clean

**B2C readiness:** RESTORED

**FTR-SL-017 gate:** Can start next (not started in this unit)

**Closure enum:** `FTR_SL_016B2C3A_SPLIT_PROFILE_UX_RUNTIME_VERIFIED_B2C_READY`

