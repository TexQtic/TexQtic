# DESIGN-MAINAPP-GST-VERIFICATION-PROVISIONAL-ACCESS-AND-HANDOFF-01

**Unit:** `DESIGN-MAINAPP-GST-VERIFICATION-PROVISIONAL-ACCESS-AND-HANDOFF-01`
**Status:** DESIGN COMPLETE — awaiting Paresh authorization for implementation unit
**Branch:** `main` · HEAD `1534f7b1`
**Date:** 2026-06-08
**Author:** Copilot (design/repo-truth audit)

---

## 1. Current Repo-Truth Summary

### 1.1 Frontend — verified at HEAD `1534f7b1`

| Symbol | File | Finding |
|---|---|---|
| `VERIFICATION_BLOCKED_VIEWS` | `App.tsx:1078` | Set of 7 views: TRADES, RFQS, SUPPLIER_RFQ_INBOX, ESCROW, SETTLEMENT, INVOICES, INVOICE_APPROVAL. **`GST_VERIFICATION` is NOT in this set.** |
| `GST_VERIFICATION` | `App.tsx:1198` | Member of `EXPERIENCE_VIEWS`. Not blocked. |
| `gst_verification` | `runtime/sessionRuntimeDescriptor.ts` | Member of `B2B_SHELL_ROUTE_KEYS`. Nav link rendered in B2B workspace sidebar for all users. |
| `gst_verification` | `layouts/Shells.tsx:380` | Sidebar button: `🔐 GST Verification` rendered via `hasShellRoute(surface, 'gst_verification')`. Visible when authenticated regardless of org verification status. |
| `case 'gst_verification'` | `App.tsx:6106` | `renderExperienceContent` renders `<GstVerificationCard onBack={...} />`. NOT gated by `VERIFICATION_BLOCKED_VIEWS`. |
| `GstVerificationCard` | `components/Tenant/GstVerificationCard.tsx` | Five view states: `not_submitted`, `pending`, `approved`, `rejected`, `needs_more_info`. Full submission form. Re-submission form for rejected/needs_more_info. Status badge. |
| `ONBOARDING_STATUS_CONTINUITY` | `App.tsx:1226` | Three entries: PENDING_VERIFICATION, VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO. |
| `isVerificationBlockedTenantWorkspace` | `App.tsx:2829` | `tenantContentFamily === 'b2b_workspace' && currentOnboardingStatusContinuity !== null`. True for all three blocked statuses. |
| Blocked shell "Next step" card | `App.tsx:5898` | Says **"Wait for TexQtic review"** — does NOT guide user to submit GST first. Design gap. |
| `PENDING_VERIFICATION` banner text | `App.tsx:1234` | Says **"Business verification has been submitted and is pending review."** — MISLEADING for users who have not submitted yet. Design gap. |

### 1.2 Backend — verified at HEAD `1534f7b1`

| Endpoint | File | Guard | Finding |
|---|---|---|---|
| `POST /api/tenant/gst-verification` | `server/src/routes/tenant/gst-verification.ts` | `tenantAuthMiddleware` + `databaseContextMiddleware` only | **No `orgVerificationGuard`.** PENDING_VERIFICATION orgs CAN submit. |
| `GET /api/tenant/gst-verification` | `server/src/routes/tenant/gst-verification.ts` | `tenantAuthMiddleware` + `databaseContextMiddleware` only | **No `orgVerificationGuard`.** PENDING_VERIFICATION orgs CAN read. |
| `GET /api/control/gst-verification` | `server/src/routes/control/gst-verification.ts` | `adminAuthMiddleware` (inherited) | Lists all pending (review_outcome IS NULL). Admin only. |
| `GET /api/control/gst-verification/:orgId` | `server/src/routes/control/gst-verification.ts` | `adminAuthMiddleware` (inherited) | Admin full record including `raw_verification_json`. |
| `PATCH /api/control/gst-verification/:orgId` | `server/src/routes/control/gst-verification.ts` | `requireAdminRole('SUPER_ADMIN')` | Records APPROVED/REJECTED/NEEDS_MORE_INFO. On APPROVED: advances org.status from PENDING_VERIFICATION → VERIFICATION_APPROVED. On REJECTED/NEEDS_MORE_INFO: only updates `gst_verifications` record — does NOT change org.status. |
| `POST /api/control/tenants/:id/onboarding/outcome` | `server/src/routes/control.ts:585` | `requireAdminRole('SUPER_ADMIN')` | Canonical org.status transition: PENDING_VERIFICATION → VERIFICATION_APPROVED / VERIFICATION_REJECTED / VERIFICATION_NEEDS_MORE_INFO. |

### 1.3 `gst_verifications` schema — at HEAD `1534f7b1`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `org_id` | UUID UNIQUE | one record per org, FK to organizations |
| `gstin` | VARCHAR(20) | GSTIN_REGEX validated, normalized uppercase |
| `legal_name_on_gst` | VARCHAR(500) | tenant-declared |
| `state_code` | VARCHAR(10) | 2-digit India state code 01–38 |
| `registration_type` | VARCHAR(50) | e.g. Regular, Composition |
| `filing_status` | VARCHAR(30) | default UNKNOWN; reserved for future provider |
| `submitted_at` | TIMESTAMPTZ | set on create; not reset on resubmit |
| `reviewed_at` | TIMESTAMPTZ? | set by admin on review |
| `reviewed_by_admin_id` | UUID? | admin who reviewed |
| `review_outcome` | VARCHAR(30)? | APPROVED / REJECTED / NEEDS_MORE_INFO / null |
| `review_notes` | TEXT? | admin notes to tenant |
| `raw_verification_json` | JSONB | default `{}` — GSTN provider response placeholder |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### 1.4 Tests — verified at HEAD `1534f7b1`

| File | Count | Coverage |
|---|---|---|
| `server/src/__tests__/gst-verification.service.unit.test.ts` | **25** | validateGstin (10 cases), submitVerification (4 cases), adminReviewVerification (5 cases), getVerification (2 cases), listPending (2 cases), error paths (2 cases) |

No route-level integration tests for the tenant/control GST endpoints (noted as gap).
No frontend component tests for `GstVerificationCard`.
No test for provisional workspace shell GST surfacing.

---

## 2. Current User Journey

### From `/register` success to provisional workspace

```
1. User submits /register
   └─ Creates: user + tenant + organization(status=PENDING_VERIFICATION) + membership(role=OWNER)
   └─ Redirects to: /register?stage=success

2. /register SUCCESS stage
   └─ Shows: "Verification Pending" message + locked-transactions notice
   └─ No debug fields exposed
   └─ CTA: Sign in

3. User signs in
   └─ Session established: currentTenant.status = PENDING_VERIFICATION
   └─ isVerificationBlockedTenantWorkspace = true
   └─ getOnboardingStatusContinuity → PENDING_VERIFICATION entry

4. Provisional workspace loads
   └─ Top banner: "Business Verification In Review"
   └─ Blocked shell (SETTINGS view): shows 3 tiles:
      · "Workspace posture: Read-only review state"
      · "What remains paused: Catalog, RFQ, and trade actions"
      · "Next step: Wait for TexQtic review"    ← DESIGN GAP: should say "Submit GST verification"
   └─ Sidebar nav IS visible (B2BShell renders with B2B_SHELL_ROUTE_KEYS)
   └─ Sidebar includes: 🔐 GST Verification link

5. User clicks 🔐 GST Verification
   └─ renderExperienceContent case 'gst_verification'
   └─ GstVerificationCard renders
   └─ Loads GET /api/tenant/gst-verification
   └─ If no record: shows submission form (not_submitted state)
   └─ User submits GSTIN + legal name + state code + registration type
   └─ POST /api/tenant/gst-verification → 201 Created
   └─ GstVerificationCard transitions to 'pending' state

6. Waiting state
   └─ User can return to see pending status at any time
   └─ No automated notification to user when admin reviews
   └─ No auto-refresh of org.status in current implementation

7a. Admin approves (PATCH /api/control/gst-verification/:orgId with APPROVED)
   └─ gst.review_outcome → APPROVED
   └─ org.status → VERIFICATION_APPROVED (conditional updateMany in service)
   └─ Next user sign-in: isVerificationBlockedTenantWorkspace = false → full workspace

7b. Admin rejects (PATCH /api/control/gst-verification/:orgId with REJECTED)
   └─ gst.review_outcome → REJECTED
   └─ org.status stays PENDING_VERIFICATION (NOT changed by GST route)
   └─ Admin must separately call POST /api/control/tenants/:id/onboarding/outcome
      to advance org.status to VERIFICATION_REJECTED if desired
   └─ GstVerificationCard shows 'rejected' state + resubmit form + review_notes

7c. Admin requests more info (NEEDS_MORE_INFO)
   └─ Same as 7b but 'needs_more_info' state

8. After resubmission
   └─ gst.review_outcome reset to null, review fields cleared
   └─ GstVerificationCard → 'pending' state again
   └─ Cycle repeats from step 6
```

### Identified journey gaps

| Gap | Description | Severity |
|---|---|---|
| **SHELL-CTA-01** | Blocked shell "Next step" card says "Wait for TexQtic review" — no CTA to GST submission, no awareness of whether GST has been submitted | HIGH |
| **BANNER-TEXT-01** | PENDING_VERIFICATION bannerText assumes verification "has been submitted" when user may not have submitted yet | MEDIUM |
| **ORG-STATUS-SYNC-01** | REJECTED/NEEDS_MORE_INFO gst.review_outcome does NOT automatically advance org.status — admin needs two separate actions | MEDIUM |
| **NO-NOTIFICATION-01** | No automated notification to tenant user when admin approves, rejects, or requests more info | LOW (deferred) |
| **NO-REFRESH-01** | Workspace does not auto-refresh when org.status changes from PENDING_VERIFICATION → VERIFICATION_APPROVED | LOW (deferred) |
| **NO-DOCS-01** | No document upload surface (PAN, COI, address proof) — tenant can only submit structured fields | LOW (deferred) |

---

## 3. Current GST Verification Route / API Contract

### Tenant endpoints

```
POST /api/tenant/gst-verification
  Auth: tenantAuthMiddleware (JWT) + databaseContextMiddleware
  Guard: NONE (orgVerificationGuard NOT applied)
  Body: { gstin, legal_name_on_gst, state_code, registration_type }
       (tenantId / org_id in body are z.never() — rejected)
  Returns: 201 { gst_verification: GstVerificationTenantRecord }
  Errors: 400 validation, 403 GstAlreadyApprovedError, 500

GET /api/tenant/gst-verification
  Auth: tenantAuthMiddleware + databaseContextMiddleware
  Guard: NONE (orgVerificationGuard NOT applied)
  Returns: 200 { gst_verification: GstVerificationTenantRecord | null }
```

### Admin endpoints

```
GET /api/control/gst-verification
  Auth: adminAuthMiddleware (inherited from control plugin)
  Returns: 200 { gst_verifications: GstVerificationAdminRecord[], count: number }
  Note: only review_outcome IS NULL records

GET /api/control/gst-verification/:orgId
  Auth: adminAuthMiddleware
  Returns: 200 { gst_verification: GstVerificationAdminRecord } (includes raw_verification_json)

PATCH /api/control/gst-verification/:orgId
  Auth: requireAdminRole('SUPER_ADMIN')
  Body: { review_outcome: 'APPROVED'|'REJECTED'|'NEEDS_MORE_INFO', review_notes?: string }
  Returns: 200 { gst_verification: GstVerificationAdminRecord }
  Side effect on APPROVED: organizations.updateMany where id=orgId AND status=PENDING_VERIFICATION → VERIFICATION_APPROVED

POST /api/control/tenants/:id/onboarding/outcome  [separate canonical org status route]
  Auth: requireAdminRole('SUPER_ADMIN')
  Effect: advances org.status to VERIFICATION_APPROVED / VERIFICATION_REJECTED / VERIFICATION_NEEDS_MORE_INFO
```

### Tenant-safe projection (returned to tenant)

```typescript
{
  id, org_id, gstin, legal_name_on_gst, state_code, registration_type,
  filing_status, submitted_at, review_outcome, review_notes,
  created_at, updated_at
  // raw_verification_json EXCLUDED from tenant response
  // reviewed_at EXCLUDED
  // reviewed_by_admin_id EXCLUDED
}
```

---

## 4. Current Blocker/Gap List

| ID | Type | Description | Severity |
|---|---|---|---|
| SHELL-CTA-01 | UX design gap | Blocked provisional shell "Next step" does not surface GST submission | HIGH |
| BANNER-TEXT-01 | UX design gap | bannerText for PENDING_VERIFICATION assumes GST has been submitted | MEDIUM |
| ORG-STATUS-SYNC-01 | Backend design gap | GST REJECTED/NEEDS_MORE_INFO does not atomically advance org.status — two admin actions required | MEDIUM |
| RESUBMIT-ORG-RESET-01 | Backend design gap | When tenant resubmits GST, org.status is NOT reset (remains VERIFICATION_REJECTED/NEEDS_MORE_INFO) — gst.review_outcome resets but org.status may drift out of sync | MEDIUM |
| NO-ROUTE-TESTS-01 | Test gap | No route-level integration tests for POST/GET /api/tenant/gst-verification | LOW |
| NO-FRONTEND-TESTS-01 | Test gap | No component tests for GstVerificationCard | LOW |
| NO-SHELL-TESTS-01 | Test gap | No tests for provisional workspace shell GST surfacing behavior | LOW |
| NO-NOTIFICATION-01 | Feature gap (deferred) | No tenant notification on admin review outcome | DEFERRED |
| NO-REFRESH-01 | Feature gap (deferred) | No auto-refresh when org.status changes post-approval | DEFERRED |
| NO-DOCS-01 | Feature gap (deferred) | No document upload (PAN, COI) | DEFERRED |
| GSTN-PROVIDER-01 | Feature gap (deferred) | No GSTN API integration — raw_verification_json always {} | DEFERRED |

---

## 5. Decision Recommendations

### Q1: Should PENDING_VERIFICATION users be able to self-submit GST/KYC from the provisional workspace?

**DECISION: YES — already correctly implemented. No backend change required.**

Evidence: `POST /api/tenant/gst-verification` has no `orgVerificationGuard`. `GST_VERIFICATION` view is not in `VERIFICATION_BLOCKED_VIEWS`. `gst_verification` nav link is in `B2B_SHELL_ROUTE_KEYS`.

### Q2: Should VERIFICATION_REJECTED users be able to resubmit?

**DECISION: YES — already implemented.**

`GstVerificationService.submitVerification` allows resubmit when `review_outcome = REJECTED` (only blocks on APPROVED). `GstVerificationCard` renders resubmit form for `rejected` state.

**Adjacent gap (RESUBMIT-ORG-RESET-01):** When a user resubmits after REJECTED, gst.review_outcome resets to null but org.status may still be VERIFICATION_REJECTED. The service should reset org.status to PENDING_VERIFICATION on resubmission. This is a small backend fix scoped to the implementation unit.

### Q3: Should VERIFICATION_NEEDS_MORE_INFO users be able to update/resubmit?

**DECISION: YES — already implemented. Same gap applies (RESUBMIT-ORG-RESET-01).**

### Q4: Should GST_VERIFICATION be an exception to the blanket B2B verification-blocked shell?

**DECISION: YES — it already is. Confirmed in repo truth. No change needed.**

### Q5: Should the provisional shell include a checklist card linking to GST/KYC submission?

**DECISION: YES — this is the primary implementation target.**

The provisional shell currently shows a static "Next step: Wait for TexQtic review" card that is misleading and unhelpful for users who have not submitted GST yet. The shell must be made aware of the GST submission status and surface an appropriate CTA.

**Proposed shell states:**

| GST status | Shell "Next step" copy | Shell CTA |
|---|---|---|
| Not submitted | "Submit your GST details to begin verification" | Button: "Submit GST Verification" → navigates to gst_verification |
| Pending review | "GST verification submitted — awaiting admin review" | Link: "View Submission" → navigates to gst_verification |
| Rejected | "Your GST submission was not approved. Resubmit with corrections." | Button: "Resubmit GST Verification" → navigates to gst_verification |
| Needs more info | "Additional information requested for your GST submission." | Button: "Update GST Submission" → navigates to gst_verification |

### Q6: Should GST/KYC submission remain manual/admin-reviewed for now?

**DECISION: YES. Manual admin-review workflow is the only implementation in scope.**

The `GstVerificationQueue` admin component already exists. No provider integration in this unit.

### Q7: Should automated GSTN provider integration be deferred to a later implementation unit?

**DECISION: YES — deferred.**

`raw_verification_json` JSONB column already exists as a structured placeholder. Future GSTN provider integration will populate this column and potentially remove the manual review requirement.

---

## 6. Evidence Fields

### Currently stored (sufficient for manual review)

| Field | Source | Sufficient? |
|---|---|---|
| `gstin` | Tenant input | Yes |
| `legal_name_on_gst` | Tenant input | Yes |
| `state_code` | Tenant input | Yes |
| `registration_type` | Tenant input | Yes |
| `filing_status` | Default UNKNOWN | Reserved for provider |
| `submitted_at` | Server timestamp | Yes |
| `review_outcome` | Admin | Yes |
| `review_notes` | Admin | Yes |
| `raw_verification_json` | {} empty | Placeholder |

### Missing for provider automation (deferred)

| Field | GSTN API field | Notes |
|---|---|---|
| Trade name | `tradeName` | May differ from legal name |
| GST registration status | `status` (ACTIVE/CANCELLED/SUSPENDED) | Provider-verified |
| Business constitution | `constitutionOfBusiness` | Pvt Ltd / LLP / Proprietorship |
| Taxpayer type | `taxpayerType` | Regular / Composition |
| Registration date | `registrationDate` | |
| Principal place of business | `principalPlaceOfBusinessAddress` | |
| Return filing frequency | `filingFrequency` | |
| Provider verification timestamp | — | Audit trail |
| PAN (supporting doc) | — | Not in schema at all |
| COI / incorporation docs | — | Not in schema at all |

All provider-fetched fields would populate `raw_verification_json`. No schema change required for basic automation. Schema change would be required to add document attachment fields.

---

## 7. Proposed Implementation Unit

### Title
`IMPL-MAINAPP-GST-VERIFICATION-PROVISIONAL-SHELL-SURFACING-01`

### Objective
Enhance the provisional workspace shell to actively surface the GST verification submission step with state-aware copy and a CTA. Fix org.status drift on resubmission. Correct misleading bannerText.

### Scope

**In scope:**

1. **Provisional shell GST step card (SHELL-CTA-01)**
   - `App.tsx`: The blocked shell "Workspace Home" SETTINGS state currently hardcodes "Next step: Wait for TexQtic review". 
   - The shell must load the GST verification status (GET /api/tenant/gst-verification) when in provisional mode, then render a state-aware step card.
   - Four display states: not_submitted → pending → rejected/needs_more_info → (approved, covered by workspace unlock).

2. **bannerText correction (BANNER-TEXT-01)**
   - `App.tsx` `ONBOARDING_STATUS_CONTINUITY.PENDING_VERIFICATION.bannerText`: Currently says "Business verification has been submitted and is pending review." Should be conditional:
     - No GST record: "Register your business details to begin verification."
     - GST pending: "Business verification has been submitted and is pending review."
   - This requires knowing GST status in the App.tsx shell context. May require a small new hook or a prop.

3. **org.status reset on resubmission (RESUBMIT-ORG-RESET-01 + ORG-STATUS-SYNC-01)**
   - `server/src/services/gstVerification.service.ts` `submitVerification`: On resubmission (when existing record is REJECTED or NEEDS_MORE_INFO), also reset org.status to PENDING_VERIFICATION (via `organizations.updateMany` where id=orgId AND status IN (VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO)).
   - `PATCH /api/control/gst-verification/:orgId` on REJECTED: also advance org.status from PENDING_VERIFICATION → VERIFICATION_REJECTED.
   - `PATCH /api/control/gst-verification/:orgId` on NEEDS_MORE_INFO: also advance org.status from PENDING_VERIFICATION → VERIFICATION_NEEDS_MORE_INFO.
   - This closes the gap where admin must use two routes to set org status.

**Out of scope:**
- GSTN provider integration
- Document upload (PAN, COI)
- Automated notifications
- Auto-refresh on approval
- CRM lifecycle sync
- Zoho sync
- Billing/Razorpay
- RLS changes
- Schema changes
- Migration changes

---

## 8. Proposed File Allowlist

### Modify

```
App.tsx
  — blocked shell Next step card: state-aware GST step
  — ONBOARDING_STATUS_CONTINUITY bannerText: conditional

server/src/services/gstVerification.service.ts
  — submitVerification: reset org.status on REJECTED/NEEDS_MORE_INFO resubmit
  — adminReviewVerification: advance org.status on REJECTED and NEEDS_MORE_INFO

components/Tenant/GstVerificationCard.tsx
  — (minor) ensure review_notes is displayed in rejected/needs_more_info views
  — if not already shown, add review_notes display to those states
```

### Read-only (no changes)

```
server/src/routes/tenant/gst-verification.ts   (no change required)
server/src/routes/control/gst-verification.ts  (no change required)
server/src/utils/orgVerificationGuard.ts        (no change required)
server/prisma/schema.prisma                     (no change required)
layouts/Shells.tsx                              (no change required)
runtime/sessionRuntimeDescriptor.ts             (no change required)
```

---

## 9. Forbidden Actions for the Implementation Unit

- Modify schema.prisma or migrations
- Modify RLS policies or triggers
- Run migrations, seeds, or destructive scripts
- Touch production data
- Implement GSTN provider automation
- Add document upload schema or endpoints
- Implement automated notifications
- Implement CRM/Zoho/billing sync
- Modify public nav or `/register` surface
- Reintroduce `Request Access` to primary surfaces
- Expose secrets, JWTs, DB URLs

---

## 10. Required Tests for the Implementation Unit

| Test | File | Type | Description |
|---|---|---|---|
| T-01 | `server/src/__tests__/gst-verification.service.unit.test.ts` | Unit (new) | `submitVerification` for REJECTED state: org.status reset to PENDING_VERIFICATION called |
| T-02 | `server/src/__tests__/gst-verification.service.unit.test.ts` | Unit (new) | `submitVerification` for NEEDS_MORE_INFO state: org.status reset called |
| T-03 | `server/src/__tests__/gst-verification.service.unit.test.ts` | Unit (new) | `adminReviewVerification` REJECTED: org.status advanced to VERIFICATION_REJECTED |
| T-04 | `server/src/__tests__/gst-verification.service.unit.test.ts` | Unit (new) | `adminReviewVerification` NEEDS_MORE_INFO: org.status advanced to VERIFICATION_NEEDS_MORE_INFO |
| T-05 | `server/src/__tests__/gst-verification.service.unit.test.ts` | Unit (regression) | All 25 existing tests must continue to pass |
| T-06 | `App.tsx` shell test (if test file exists) | Unit/component | Blocked shell with no GST record shows "Submit" CTA |
| T-07 | `App.tsx` shell test | Unit/component | Blocked shell with pending GST record shows "Verification Pending" status |
| T-08 | `components/Tenant/GstVerificationCard.tsx` test | Unit/component | `rejected` state renders review_notes |
| T-09 | `components/Tenant/GstVerificationCard.tsx` test | Unit/component | `needs_more_info` state renders review_notes + resubmit form |

---

## 11. Required Production Verification Plan

### Phase 1: Regression
- Run `pnpm --filter server exec vitest run src/__tests__/gst-verification.service.unit.test.ts` — all tests pass
- Run `pnpm --filter server typecheck` — no errors
- Run `pnpm --filter server lint` — no errors
- GET /health → 200

### Phase 2: Provisional shell visual verification
- Sign in with a PENDING_VERIFICATION org that has NO GST record
- Confirm: blocked shell "Next step" shows "Submit Business Verification" CTA
- Click CTA → confirm navigates to GstVerificationCard in `not_submitted` state
- Submit GST → confirm card transitions to `pending` state
- Sign out and sign back in → confirm blocked shell shows "Verification Pending" status

### Phase 3: Admin review path verification
- Admin reviews via control plane PATCH endpoint with REJECTED + review_notes
- Confirm: gst.review_outcome = REJECTED
- Confirm: org.status = VERIFICATION_REJECTED (new behaviour)
- Tenant signs in: confirm `isVerificationBlockedTenantWorkspace` = true (workspace still blocked)
- Tenant navigates to GST Verification: confirm rejected state with review_notes displayed
- Tenant resubmits: confirm gst.review_outcome → null AND org.status → PENDING_VERIFICATION
- Admin reviews with APPROVED: confirm org.status → VERIFICATION_APPROVED
- Tenant workspace unlocks (full workspace accessible)

### Phase 4: NEEDS_MORE_INFO path
- Same as Phase 3 with NEEDS_MORE_INFO outcome

---

## 12. Risks and Adjacent Findings

| ID | Risk/Finding | Severity | Action |
|---|---|---|---|
| RISK-01 | Shell GST status load adds an API call per workspace render — may cause latency jitter on sign-in | LOW | Cache response, or load lazily only when shell is shown |
| RISK-02 | `organizations.updateMany` on resubmission creates an implicit status reset — if org.status was ACTIVE (should never happen, but defensive) it would incorrectly advance to PENDING_VERIFICATION | LOW | Guard updateMany with `status IN (VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO)` only |
| ADJ-01 | **Adjacent finding:** `PATCH /api/control/gst-verification/:orgId` and `POST /api/control/tenants/:id/onboarding/outcome` overlap for the APPROVED case — both advance org.status to VERIFICATION_APPROVED. The GST route's side-effect may be redundant. Consider removing the GST route's org.status advancement and deferring entirely to the onboarding/outcome route. This is out of scope for this unit. | LOW | Record for future cleanup |
| ADJ-02 | **Adjacent finding:** No GSTN format-level uniqueness enforcement across orgs in the database (only org_id is unique in gst_verifications, not gstin). Multiple orgs could submit the same GSTIN. GSTN uniqueness enforcement is a provider-integration concern (deferred). | LOW | DEFERRED |
| ADJ-03 | **Adjacent finding:** `submitted_at` is not reset on resubmission — it retains the original first-submission timestamp. This could confuse admin queue ordering. Consider adding a `last_submitted_at` column. Out of scope. | LOW | DEFERRED |
| ADJ-04 | **Adjacent finding:** FTR-ACQ-006 (GSTIN transactional gate alignment for Tier 0 accounts) remains OPEN and NOT_ASSESSED. This design does not change the gate logic, so FTR-ACQ-006 scope is unaffected. | INFO | No action |
| ADJ-05 | **Adjacent finding:** The `activate_approved` route in `control.ts` requires `status = VERIFICATION_APPROVED` to proceed. This appears to be a legacy route for the invite-based flow. Direct-registration users reaching VERIFICATION_APPROVED should not need this route for basic workspace access. Clarification may be needed for full workspace activation. | LOW | Clarify in next design unit |

---

## 13. Hub Impact Assessment

1. **Did this unit change launch readiness truth?** No. This is a design-only unit. No source, test, schema, migration, RLS, or runtime files were changed.

2. **Which family or requirement changed?** None changed. This unit produced a design document that identifies gaps for a future implementation unit.

3. **Which hub documents need to be updated?** `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md` and `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01.md` may eventually need a §reference added when the implementation unit closes. Not required now.

4. **Evidence supporting update?** N/A — no source change.

5. **Are CRM or CAE details at risk of duplication?** No. This design is scoped to the Main App provisional workspace shell and GST verification service. No CRM fields touched.

6. **Are planned items at risk of promotion to MVP without Paresh confirmation?** No. Implementation unit is not authorized. Design recommendations require Paresh authorization.

7. **Are any stale hub rows superseded?** No. The design reveals new gaps but does not invalidate prior decisions.

8. **Hub update required?** `NO_HUB_UPDATE_REQUIRED` — this is a pure design artifact. No launch readiness truth was changed.

9. **Hub files allowlisted?** Hub files were NOT allowlisted. No hub files were modified. Assessment is `PENDING_HUB_UPDATE` for when the implementation unit closes and closes SHELL-CTA-01.

---

## 14. Final Enum

`DESIGN_MAINAPP_GST_VERIFICATION_PROVISIONAL_ACCESS_AND_HANDOFF_COMPLETE`

---

## Final Report

### Starting state
- Branch: `main`
- HEAD: `1534f7b1`
- Worktree: **clean** (no staged or unstaged changes)

### Files inspected (read-only)

| File | Purpose |
|---|---|
| `App.tsx` (lines 1078–1270, 2826–2832, 4760–5000, 5870–5980, 6090–6150) | Blocked views set, workspace shell, GST view routing |
| `layouts/Shells.tsx` | B2B_SHELL_ROUTE_KEYS, hasShellRoute, GST nav link |
| `runtime/sessionRuntimeDescriptor.ts` | Route group definitions, manifest entries |
| `server/src/routes/tenant/gst-verification.ts` | Tenant submit/get endpoints |
| `server/src/routes/control/gst-verification.ts` | Admin review endpoints |
| `server/src/routes/control.ts` (lines 240–300, 578–710) | Onboarding outcome route |
| `server/src/services/gstVerification.service.ts` | Service methods, projectors |
| `server/src/utils/orgVerificationGuard.ts` | Guard implementation, blocked statuses |
| `server/prisma/schema.prisma` (lines 1503–1522) | gst_verifications table |
| `components/Tenant/GstVerificationCard.tsx` | Frontend card component |
| `server/src/__tests__/gst-verification.service.unit.test.ts` | 25 unit tests |
| `governance/launch-readiness/FUTURE-TODO-REGISTER.md` | FTR-ACQ-006 reference |
| `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md` | Prior decisions |
| `DECIDE-MAINAPP-SUPPLIER-BUYER-ONBOARDING-REQUIREMENTS-01.md` | Prior decisions |

### Design document created

`DESIGN-MAINAPP-GST-VERIFICATION-PROVISIONAL-ACCESS-AND-HANDOFF-01.md` — this file.

### Key findings

| Question | Answer |
|---|---|
| Can PENDING_VERIFICATION orgs access GST_VERIFICATION view today? | **YES** — not in VERIFICATION_BLOCKED_VIEWS |
| Can PENDING_VERIFICATION orgs submit GST today (backend)? | **YES** — POST /api/tenant/gst-verification has no orgVerificationGuard |
| Does the new backend transactional guard affect GST submission? | **NO** — orgVerificationGuard was NOT applied to GST endpoints |
| Does the provisional shell guide users to submit GST? | **NO** — SHELL-CTA-01 design gap |
| Can REJECTED users resubmit? | **YES** — service allows it |
| Does admin REJECTED/NEEDS_MORE_INFO advance org.status? | **NO** — org.status only advances on APPROVED (separate endpoint needed for REJECTED/NEEDS_MORE_INFO) — ORG-STATUS-SYNC-01 design gap |
| Does resubmission reset org.status? | **NO** — RESUBMIT-ORG-RESET-01 design gap |

### Confirmations

- No source, test, schema, migration, RLS, or trigger files were changed.
- No production data was touched.
- No secrets, JWTs, DB URLs, API keys, or credentials were exposed.
- No GSTN provider automation was implemented.
- No CRM/Zoho/billing changes were made.
- This design artifact is bounded to a single governance document.

### Recommended implementation unit

`IMPL-MAINAPP-GST-VERIFICATION-PROVISIONAL-SHELL-SURFACING-01`

**Awaiting Paresh authorization.**
