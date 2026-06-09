# DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01

**Unit:** `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01`
**Status:** DESIGN COMPLETE — awaiting Paresh authorization for implementation unit
**Branch:** `main` · HEAD `5625b57c`
**Date:** 2026-06-08
**Author:** Copilot (design/repo-truth audit)
**Sequence position:** Step 3 of 10 in `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01` §15

---

## Starting State

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD at start | `5625b57c` |
| Worktree at start | **clean** (no staged or unstaged changes) |
| Worktree at end | **clean** (design doc added; no source/test/schema/migration files changed) |

---

## 1. Repo-Truth Summary

Inspected at HEAD `5625b57c` (current HEAD at time of design work). All findings below are verified against live source files.

### 1.1 Frontend — verified at `5625b57c`

| Symbol | File | Finding |
|---|---|---|
| `GstVerificationCard` | `components/Tenant/GstVerificationCard.tsx` | Five view states: `not_submitted`, `pending`, `approved`, `rejected`, `needs_more_info`. Submission form. Re-submission form for rejected/needs_more_info. Status badge. Review notes displayed in rejected and needs_more_info states. |
| `GstVerificationQueue` | `components/ControlPlane/GstVerificationQueue.tsx` | Admin control-plane component. Lists pending (review_outcome IS NULL) verifications. Review dialog: APPROVED / REJECTED / NEEDS_MORE_INFO buttons + notes field. Displays: org_id, gstin, legal_name_on_gst, state_code, registration_type, filing_status, submitted_at. **No provider evidence fields displayed.** |
| `provisionalGstStatus` | `App.tsx:2415` | State variable: `'loading' \| 'not_submitted' \| 'pending' \| 'approved' \| 'rejected' \| 'needs_more_info' \| null`. Shell resolves this from GET /api/tenant/gst-verification. |
| `resolveProvisionalGstStatus` | `App.tsx:1989` | Exported pure function — maps `GstVerificationRecord` to provisional status. Covered by frontend tests. |
| Shell blocked-state CTAs | `App.tsx:5957–6010` | State-aware "Next step" card in provisional workspace: not_submitted → "Submit GST Verification"; pending → "View Submission"; rejected → "Resubmit"; needs_more_info → "Update Submission". Implemented in commit `56d916f9`. |
| `ONBOARDING_STATUS_CONTINUITY` | `App.tsx:1226` | Three entries: `PENDING_VERIFICATION`, `VERIFICATION_REJECTED`, `VERIFICATION_NEEDS_MORE_INFO`. Banner text is now contextually correct per commit `56d916f9`. |
| `isVerificationBlockedTenantWorkspace` | `App.tsx:2829` | True when `tenantContentFamily === 'b2b_workspace' && currentOnboardingStatusContinuity !== null`. Blocks all transactional views for blocked orgs. |
| `VERIFICATION_BLOCKED_VIEWS` | `App.tsx:1078` | Set of 7 views blocked during pending/rejected/needs-more-info: TRADES, RFQS, SUPPLIER_RFQ_INBOX, ESCROW, SETTLEMENT, INVOICES, INVOICE_APPROVAL. `GST_VERIFICATION` is NOT in this set — intentional. |

### 1.2 Backend — verified at `5625b57c`

| Layer | File | Finding |
|---|---|---|
| Tenant submit route | `server/src/routes/tenant/gst-verification.ts` | `POST /api/tenant/gst-verification`. No `orgVerificationGuard` — PENDING_VERIFICATION orgs CAN submit. Validates GSTIN format before DB. Upserts on org_id. Fires audit log. No provider call. |
| Tenant read route | `server/src/routes/tenant/gst-verification.ts` | `GET /api/tenant/gst-verification`. No `orgVerificationGuard`. Returns tenant-safe projection (excludes `raw_verification_json`, `reviewed_at`, `reviewed_by_admin_id`). |
| Control list route | `server/src/routes/control/gst-verification.ts` | `GET /api/control/gst-verification`. Lists all `review_outcome IS NULL` records. Returns safe admin projection: GST registration fields + safe provider evidence (`provider_name`, `provider_result`, `provider_verified_at`) + `reviewed_at`/`reviewed_by_admin_id`. `raw_verification_json` and `provider_request_id` are **excluded from the normal response** (stored server-side for audit only; accessible via a separate future audit endpoint if needed). |
| Control detail route | `server/src/routes/control/gst-verification.ts` | `GET /api/control/gst-verification/:orgId`. Safe admin projection for one org (same field boundary as list route — excludes `raw_verification_json` and `provider_request_id`). |
| Control review route | `server/src/routes/control/gst-verification.ts` | `PATCH /api/control/gst-verification/:orgId`. `requireAdminRole('SUPER_ADMIN')`. Records APPROVED/REJECTED/NEEDS_MORE_INFO. Side effect: advances org.status for all three outcomes. |
| GstVerificationService | `server/src/services/gstVerification.service.ts` | `validateGstin`, `submitVerification`, `getVerificationByOrgId`, `getVerificationByOrgIdAdmin`, `listPendingVerifications`, `adminReviewVerification`. All org.status side effects implemented. No provider call. |
| orgVerificationGuard | `server/src/utils/orgVerificationGuard.ts` | Blocks PENDING_VERIFICATION, VERIFICATION_REJECTED, VERIFICATION_NEEDS_MORE_INFO from transactional mutations. Does NOT block GST endpoints. |
| TTP constants | `server/src/ttp/ttp.constants.ts` | `TTP_GST_FILING_STATUS`: ACTIVE, CANCELLED, SUSPENDED, UNKNOWN. `TTP_GST_REVIEW_OUTCOME`: APPROVED, REJECTED, NEEDS_MORE_INFO. |
| Audit log | `server/src/lib/auditLog.ts` | `writeAuditLog` and `createAdminAudit` used in GST routes. |
| External client pattern | `server/src/services/crmTier0NotifyClient.ts` | Fetch-based external call with AbortController timeout (8s). Single-try with timeout; caller handles throws. This is the established pattern for outbound HTTP. |

### 1.3 `gst_verifications` schema — at `5625b57c`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | auto-generated |
| `org_id` | UUID UNIQUE | one record per org, FK to organizations |
| `gstin` | VARCHAR(20) | GSTIN_REGEX validated, normalized uppercase |
| `legal_name_on_gst` | VARCHAR(500) | tenant-declared |
| `state_code` | VARCHAR(10) | 2-digit India state code 01–38 |
| `registration_type` | VARCHAR(50) | e.g. Regular, Composition |
| `filing_status` | VARCHAR(30) | default UNKNOWN — **reserved for provider result** |
| `submitted_at` | TIMESTAMPTZ | set on CREATE; not reset on re-submit |
| `reviewed_at` | TIMESTAMPTZ? | set by admin on review |
| `reviewed_by_admin_id` | UUID? | admin who reviewed |
| `review_outcome` | VARCHAR(30)? | APPROVED / REJECTED / NEEDS_MORE_INFO / null |
| `review_notes` | TEXT? | admin notes visible to tenant |
| `raw_verification_json` | JSONB | default `{}` — GSTN provider response placeholder |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Indexes: `idx_gst_verifications_gstin` (gstin), `idx_gst_verifications_org_id` (org_id).

**No UNIQUE constraint on `gstin` across orgs.** Multiple orgs can submit the same GSTIN. This is a risk gap addressed in the design below.

### 1.4 Tests — verified at `5625b57c`

| File | Count | Coverage |
|---|---|---|
| `server/src/__tests__/gst-verification.service.unit.test.ts` | 27 | validateGstin (10), submitVerification (6), adminReviewVerification (7), getVerification (2), listPending (2) |
| `tests/frontend/provisional-gst-shell.test.ts` | 10 | `resolveProvisionalGstStatus` (5), `getOnboardingStatusContinuity` bannerText (3), null returns (2) |

No route-level integration tests for tenant/control GST endpoints (gap, deferred).
No component tests for `GstVerificationCard` or `GstVerificationQueue` (gap, deferred).

### 1.5 Current gaps from prior design — status update

All gaps from `DESIGN-MAINAPP-GST-VERIFICATION-PROVISIONAL-ACCESS-AND-HANDOFF-01` are resolved EXCEPT:

| Gap ID | Status |
|---|---|
| SHELL-CTA-01 | **RESOLVED** — commit `56d916f9` |
| BANNER-TEXT-01 | **RESOLVED** — commit `56d916f9` |
| ORG-STATUS-SYNC-01 | **RESOLVED** — commit `56d916f9` |
| RESUBMIT-ORG-RESET-01 | **RESOLVED** — commit `56d916f9` |
| NO-ROUTE-TESTS-01 | DEFERRED — unchanged |
| NO-FRONTEND-TESTS-01 | DEFERRED — unchanged |
| NO-NOTIFICATION-01 | DEFERRED — unchanged |
| NO-REFRESH-01 | DEFERRED — unchanged |
| NO-DOCS-01 | DEFERRED — unchanged |
| GSTN-PROVIDER-01 | **This design addresses it.** |

---

## 2. Current GST/KYC Workflow

```
1. User registers → org.status = PENDING_VERIFICATION
   └─ Provisional workspace loads; transactional views blocked

2. Provisional shell surfaces GST verification CTA
   └─ State-aware: not_submitted / pending / rejected / needs_more_info
   └─ CTA navigates to GstVerificationCard

3. Tenant submits GSTIN + legal name + state code + registration type
   └─ POST /api/tenant/gst-verification
   └─ GSTIN format-validated (GSTIN_REGEX)
   └─ Upserted into gst_verifications (org_id UNIQUE)
   └─ raw_verification_json stays {} — NO provider call
   └─ filing_status stays UNKNOWN — NO provider call
   └─ Audit log: gst_verification.submitted
   └─ Returns 201 with tenant-safe projection

4. Record appears in admin GstVerificationQueue
   └─ Visible at GET /api/control/gst-verification (review_outcome IS NULL filter)

5. Admin reviews manually (no provider evidence available)
   └─ PATCH /api/control/gst-verification/:orgId
   └─ Outcome: APPROVED → org.status = VERIFICATION_APPROVED
   └─ Outcome: REJECTED → org.status = VERIFICATION_REJECTED + review_notes to tenant
   └─ Outcome: NEEDS_MORE_INFO → org.status = VERIFICATION_NEEDS_MORE_INFO + review_notes to tenant
   └─ Audit log: control.gst_verification.reviewed

6. Tenant resubmission (after REJECTED / NEEDS_MORE_INFO)
   └─ GstVerificationCard resubmit form; POST /api/tenant/gst-verification again
   └─ review_outcome → null, review fields cleared
   └─ org.status → PENDING_VERIFICATION
   └─ Returns to admin queue

7. No notification to tenant. No auto-refresh. No provider evidence.
```

---

## 3. Current Schema / Evidence Model

Fields available to admin at review time:
- `gstin`, `legal_name_on_gst`, `state_code`, `registration_type` (tenant-submitted)
- `filing_status = UNKNOWN` (no provider data)
- `submitted_at`, `raw_verification_json = {}` (no provider data)
- `reviewed_at`, `reviewed_by_admin_id`, `review_outcome`, `review_notes` (admin-set)

**The admin has no provider-verified data.** All decisions are based solely on tenant-submitted fields. This is the core gap being addressed.

---

## 4. Current Admin Review Model

- Queue: `GET /api/control/gst-verification` — lists all `review_outcome IS NULL` records, oldest-first
- Detail: `GET /api/control/gst-verification/:orgId` — safe admin projection (excludes `raw_verification_json` and `provider_request_id`; those fields remain stored in DB for server-side audit only)
- Review: `PATCH /api/control/gst-verification/:orgId` — SUPER_ADMIN only, records outcome
- UI: `GstVerificationQueue.tsx` — table of pending records, review dialog

Admin queue shows: org_id, gstin, legal_name_on_gst, state_code, registration_type, filing_status (always "UNKNOWN"), submitted_at. **No provider-enriched fields. No mismatch indicators. No GSTIN activity status.**

---

## 5. Current Gaps (for Automation Design)

| ID | Gap | Severity |
|---|---|---|
| GSTN-PROVIDER-01 | No GSTN provider call — raw_verification_json always {} | HIGH — blocks automation |
| EVIDENCE-COLS-01 | No provider_name, provider_request_id, provider_verified_at, provider_result columns in schema | HIGH — required for queryable audit trail |
| AUTO-APPROVE-01 | No auto-approval path — all submissions require manual admin review | HIGH — slows onboarding |
| FALLBACK-CONTEXT-01 | Admin queue shows no provider evidence to guide review decisions | HIGH — admin operates blind |
| GSTIN-DUPE-01 | No cross-org GSTIN uniqueness check before auto-approve | MEDIUM — fraud risk |
| TIMEOUT-01 | No provider timeout handling or fallback routing | MEDIUM — required for provider failure mode |
| NAME-MATCH-01 | No legal-name-vs-GSTN name comparison logic | MEDIUM — key mismatch signal |
| RETRY-IDEMPOTENCY-01 | No idempotency key or retry strategy for provider calls | MEDIUM |
| PROVIDER-ADAPTER-01 | No provider adapter interface — coupling risk if provider contract changes | MEDIUM |
| NO-ROUTE-TESTS-01 | No route-level integration tests for GST endpoints | LOW — deferred |
| NO-FRONTEND-TESTS-01 | No component tests for GstVerificationCard / GstVerificationQueue | LOW — deferred |
| NO-NOTIFICATION-01 | No tenant notification on admin review outcome | LOW — deferred |
| NO-REFRESH-01 | No auto-refresh when org.status changes post-approval | LOW — deferred |
| NO-DOCS-01 | No document upload surface (PAN, COI, address proof) | LOW — deferred |
| UDYAM-01 | No Udyam-registered business support | LOW — deferred |

---

## 6. Provider Authority Decision

### Q1: Should GST automation use a GSTN-authorized provider category?
**DECISION: YES.**

Evidence: `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01` §10.B.5 locks: *"GSTN-authorized verification API/provider category."* This is a live decision from the accepted governance corpus.

Provider examples (non-exhaustive): Karza Data Services, SignalX, Perfios, Intuit (Cleartax verification), Masters India. The actual vendor is a commercial/procurement decision outside this design scope. The Main App must be coded against an adapter interface, not a specific vendor SDK.

The provider adapter must:
- Call the provider's GSTN verification API with the GSTIN
- Receive a structured response containing: registration status, legal name, trade name, state code, taxpayer type
- Complete within a bounded timeout (8 seconds, matching `crmTier0NotifyClient` pattern)
- Never expose provider credentials or raw responses to tenant-facing surfaces

### Q2: Should Zoho Books be used for GST verification?
**DECISION: NO.**

Evidence: `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01` §10.B.4 and §17 lock this explicitly. Repo truth confirms: no active Zoho Books integration exists in Main App source (confirmed in service layer inspection). Zoho is a downstream accounting sync — not a verification authority.

### Q3: Should Zoho remain downstream-only after activation?
**DECISION: YES.**

Zoho sync happens after `org.status → VERIFICATION_APPROVED` (or `ACTIVE`). Not during or before verification. Scope: `DESIGN-ZOHO-POST-ACTIVATION-CONTACT-SYNC-CONTRACT-01` (step 7 of the §15 sequence). Not in scope here.

### Q4: Should the Main App remain canonical for GST/KYC evidence and org status?
**DECISION: YES.**

Main App owns `gst_verifications`, `organizations.status`, and `audit_logs` as the system of record. Provider response is an input to the Main App's decision logic — not an override of it. CRM and Zoho are downstream consumers of the outcome, not authorities for it.

### Q5: Should CRM receive lifecycle events but not control verification outcome?
**DECISION: YES.**

CRM should receive events at: GST submitted, GST auto-approved, GST admin-approved, GST rejected, tenant resubmitted. Event dispatch is out of scope for this design (scoped to `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01`, step 5). The provider integration unit must not add CRM notification logic.

---

## 7. Automation / Fallback Decision Matrix

### 7.1 Auto-approval criteria (ALL must be true)

| Criterion | Check | Source |
|---|---|---|
| C1: GSTIN format valid | GSTIN_REGEX passes (already enforced at submit) | `GstVerificationService.validateGstin` |
| C2: Provider response received | Non-error response within timeout | Provider adapter |
| C3: GSTIN status = ACTIVE | `provider.filing_status == 'ACTIVE'` | Provider response |
| C4: State code matches | First 2 chars of GSTIN == `state_code` submitted by tenant | Cross-field check |
| C5: Legal name match | Provider `legalName` or `tradeName` fuzzy-matches `legal_name_on_gst` (≥ 80% similarity, case-insensitive, ignoring common suffixes: Pvt Ltd, Private Limited, LLP, etc.) | Name-matching logic |
| C6: No duplicate GSTIN | No other `gst_verifications` record with same `gstin` and `review_outcome = 'APPROVED'` | DB check before auto-approve |

If ALL criteria met → auto-approve immediately (org.status → VERIFICATION_APPROVED, provider_result → 'AUTO_APPROVED').

### 7.2 Admin fallback routing (ANY of the following)

| Trigger | provider_result | Admin Queue Label | Auto-reject? |
|---|---|---|---|
| Provider timeout | `TIMEOUT` | "Provider timeout — manual review required" | NO |
| Provider network error / non-2xx | `PROVIDER_ERROR` | "Provider unavailable — manual review required" | NO |
| GSTIN status = CANCELLED | `INACTIVE_GSTIN` | "GSTIN CANCELLED — review required" | NO |
| GSTIN status = SUSPENDED | `INACTIVE_GSTIN` | "GSTIN SUSPENDED — review required" | NO |
| GSTIN not found by provider | `INVALID_GSTIN` | "GSTIN not found in GSTN database" | NO |
| Legal name mismatch (C5 fails) | `MISMATCH` | "Name mismatch — provider vs declared" | NO |
| State code mismatch (C4 fails) | `MISMATCH` | "State code mismatch" | NO |
| Duplicate GSTIN (C6 fails) | `DUPLICATE_GSTIN` | "GSTIN already submitted by another account" | NO |
| Partial / ambiguous response (missing required fields) | `PROVIDER_ERROR` | "Incomplete provider response — manual review required" | NO |

**No outcome is auto-rejected.** Admin PATCH remains the only mechanism that sets `review_outcome = REJECTED` or `review_outcome = NEEDS_MORE_INFO`. This preserves the existing transactional gate integrity.

### 7.3 Admin override capability
Admin can always PATCH to APPROVED regardless of `provider_result`. Admin can PATCH to APPROVED on a MISMATCH or INACTIVE_GSTIN result — override is their prerogative. When overriding a non-AUTO_APPROVED provider_result, `review_notes` should be treated as strongly recommended (UI-level guidance — no API enforcement).

Audit trail for override: the existing `writeAuditLog` with `control.gst_verification.reviewed` event records `adminId`, `review_outcome`, `review_notes`, and the `provider_result` value present at review time (captured from the record before update). This provides a full audit trail of admin overrides of provider results.

---

## 8. Evidence Capture Contract

### 8.1 Fields to add as persisted columns

4 new nullable columns required in `gst_verifications`:

| Column | Type | Constraint | Purpose |
|---|---|---|---|
| `provider_name` | VARCHAR(100) | NULL | Provider identifier (e.g. `'karza'`, `'signalx'`, `'cleartax'`). NULL until provider is called. |
| `provider_request_id` | VARCHAR(200) | NULL | Provider-assigned or Main-App-generated request ID. Used for deduplication and cross-system correlation. |
| `provider_verified_at` | TIMESTAMPTZ | NULL | Timestamp when provider response was received. NULL until provider call completes. |
| `provider_result` | VARCHAR(30) | NULL + CHECK | Coarse outcome enum. NULL until provider call. CHECK: `'AUTO_APPROVED' \| 'TIMEOUT' \| 'MISMATCH' \| 'INACTIVE_GSTIN' \| 'INVALID_GSTIN' \| 'PROVIDER_ERROR' \| 'DUPLICATE_GSTIN'` |

The existing `filing_status` column (default UNKNOWN) must be populated from provider response when available: ACTIVE, CANCELLED, SUSPENDED, UNKNOWN. No new column needed for this.

### 8.2 Fields in `raw_verification_json`

Full provider response payload stored here. On failure modes, minimal structured failure info is stored. No tenant-facing surface accesses this field.

Proposed structure of `raw_verification_json` after provider call:

```json
{
  "provider": "karza",
  "request_id": "<provider_request_id>",
  "called_at": "<ISO8601>",
  "response": {
    "gstin": "<normalized>",
    "status": "ACTIVE | CANCELLED | SUSPENDED | ...",
    "legalName": "...",
    "tradeName": "...",
    "constitutionOfBusiness": "Private Limited Company | ...",
    "taxpayerType": "Regular | Composition | ...",
    "registrationDate": "...",
    "principalPlaceOfBusinessAddress": { ... },
    "stateCode": "...",
    "filingFrequency": "..."
  },
  "match_check": {
    "name_similarity": 0.92,
    "name_match": true,
    "state_code_match": true,
    "mismatch_reason": null
  },
  "error": null
}
```

On timeout / network error, `response` is null and `error` captures the failure reason.

### 8.3 Fields NOT added in this implementation unit (explicitly deferred)

- PAN number (document-based KYC — NO-DOCS-01, deferred)
- Certificate of Incorporation (document upload — NO-DOCS-01, deferred)
- Udyam registration number (UDYAM-01, deferred)
- `submitted_at` reset on resubmit (`ADJ-03` from prior design, deferred — out of scope)
- Provider confidence score as separate column (stays in `raw_verification_json`)
- Provider mismatch reason as separate column (stays in `raw_verification_json`)

### 8.4 Provider adapter interface (to be defined in implementation unit)

```typescript
// Proposed interface — to be finalized in IMPL unit

export interface GstProviderResponse {
  success: boolean;
  gstin: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'UNKNOWN';
  legalName: string | null;
  tradeName: string | null;
  constitutionOfBusiness: string | null;
  taxpayerType: string | null;
  registrationDate: string | null;
  stateCode: string | null;
  rawPayload: unknown;
}

export interface GstProviderError {
  kind: 'TIMEOUT' | 'NETWORK_ERROR' | 'INVALID_GSTIN' | 'PROVIDER_ERROR';
  message: string;
  rawPayload: unknown;
}

export type GstProviderResult =
  | { ok: true; data: GstProviderResponse }
  | { ok: false; error: GstProviderError };

export interface GstProviderAdapter {
  name: string;
  lookupGstin(gstin: string): Promise<GstProviderResult>;
}
```

The concrete adapter implementation is injected into `GstVerificationService` (or a new `GstVerificationOrchestratorService`). The interface is the only thing that must be stable across provider changes.

---

## 9. Status Transition Contract

### 9.1 Transitions introduced by provider automation

| Trigger | Source status | Target status | Set by |
|---|---|---|---|
| Provider auto-approve (all C1–C6 pass) | `PENDING_VERIFICATION` | `VERIFICATION_APPROVED` | `GstVerificationService.submitVerification` async path |

All other transitions remain unchanged from current implementation:

| Trigger | Source status | Target status | Set by |
|---|---|---|---|
| Admin PATCH APPROVED | `PENDING_VERIFICATION` | `VERIFICATION_APPROVED` | `adminReviewVerification` (existing) |
| Admin PATCH REJECTED | `PENDING_VERIFICATION` | `VERIFICATION_REJECTED` | `adminReviewVerification` (existing) |
| Admin PATCH NEEDS_MORE_INFO | `PENDING_VERIFICATION` | `VERIFICATION_NEEDS_MORE_INFO` | `adminReviewVerification` (existing) |
| Tenant resubmit | `VERIFICATION_REJECTED` or `VERIFICATION_NEEDS_MORE_INFO` | `PENDING_VERIFICATION` | `submitVerification` (existing) |

### 9.2 Transaction safety for auto-approve

The auto-approve path inside `submitVerification` must use the same `organizations.updateMany` pattern:

```typescript
// After provider returns clean pass (provider_result = 'AUTO_APPROVED'):
await db.organizations.updateMany({
  where: { id: orgId, status: 'PENDING_VERIFICATION' },
  data: { status: 'VERIFICATION_APPROVED' },
});
```

The `where.status = 'PENDING_VERIFICATION'` guard ensures that if org.status was changed between submit and the async provider callback, the transition is a no-op. Defense-in-depth.

### 9.3 Transactional gate integrity

The `orgVerificationGuard` and `VERIFICATION_BLOCKED_VIEWS` are **not modified** by this design. Auto-approval simply advances org.status to VERIFICATION_APPROVED, which already unlocks the workspace. No new gating logic is required.

### 9.4 Race condition: concurrent admin review and auto-approve

If admin records a PATCH review while the async provider call is in-flight:
- Whichever completes first writes `review_outcome`
- The second write (admin or auto-approve) will find `review_outcome` already set and must NOT overwrite it
- Safety implementation: before writing auto-approve, check `existing.review_outcome == null`; if not null, skip the write and log a warning

This check must be added to the auto-approve path (not required for admin PATCH since admin intent is explicit).

---

## 10. UX Flow for Each Outcome

### 10.1 Auto-approved (provider clean pass)

```
User submits GST → immediate 201 (pending state displayed)
→ Async provider call completes within ~2 seconds
→ org.status → VERIFICATION_APPROVED
→ [Future: auto-refresh / notification]
→ Next user action (page refresh or return):
   isVerificationBlockedTenantWorkspace = false → full workspace accessible
   GstVerificationCard → 'approved' state ("Your GST verification is approved")
```

**Current state (before NO-REFRESH-01 is resolved):** user must manually refresh to see the workspace unlock. This is acceptable for Release 1.

### 10.2 Admin fallback — pending review

```
User submits GST → immediate 201 (pending state displayed)
→ Async provider call returns mismatch / timeout / inactive
→ org.status remains PENDING_VERIFICATION
→ provider_result set to 'MISMATCH' / 'TIMEOUT' / 'INACTIVE_GSTIN' / etc.
→ Record appears in admin GstVerificationQueue with provider context
→ Admin reviews → APPROVED / REJECTED / NEEDS_MORE_INFO
→ Tenant workspace updates on next sign-in or page load
```

**Tenant sees:** same "pending review" state as today. No exposure of mismatch reason.

### 10.3 Provider mismatch — tenant sees

```
GstVerificationCard 'pending' state
Copy: "Your GST submission is under review."
Sub-copy: "Our team is verifying your details. If additional information is needed, we'll reach out via email."
```

Tenant does NOT see that there was a name mismatch or inactive GSTIN. Admin communicates via `review_notes` when using NEEDS_MORE_INFO outcome.

### 10.4 Provider timeout / unavailable — tenant sees

```
GstVerificationCard 'pending' state
(identical to normal pending — tenant cannot distinguish timeout from in-review)
```

Internally: `provider_result = 'TIMEOUT'`, admin queue displays "Provider timeout — manual review required". Admin falls back to manual verification.

### 10.5 GSTIN rejected or needs more info

Unchanged from current implementation (already production-deployed):
- `rejected` state: red badge + `review_notes` displayed + resubmit form
- `needs_more_info` state: sky badge + `review_notes` displayed + update form

### 10.6 Auto-refresh / notification (deferred)

Email notification on admin review outcome: deferred (NO-NOTIFICATION-01).
Auto-refresh when org.status changes: deferred (NO-REFRESH-01).
When implemented, both should use the existing email template infrastructure (`server/src/services/email/`) and Supabase Realtime or a polling interval.

---

## 11. Recommended Implementation Sequence

### Release 1 — Provider Integration and Evidence Capture (this design's primary slice)

```
Slice A: Provider adapter interface + gstProvider.service.ts
  - Define GstProviderAdapter interface
  - Create concrete adapter for chosen provider (mockable in tests)
  - File: server/src/services/gstProvider.service.ts

Slice B: Schema migration — 4 new evidence columns
  - Add: provider_name, provider_request_id, provider_verified_at, provider_result
  - Add CHECK constraint on provider_result
  - Generate Prisma schema via: prisma db pull → prisma generate
  - File: new SQL migration file in server/prisma/migrations/

Slice C: GstVerificationService orchestration
  - submitVerification: after DB upsert, fire-and-forget async provider call
  - Provider call invokes adapter, populates raw_verification_json + new columns + filing_status
  - If auto-approve criteria met: advance org.status → VERIFICATION_APPROVED
  - Capture all failures as provider_result enum values; all non-clean paths leave review_outcome = null
  - File: server/src/services/gstVerification.service.ts

Slice C-bis: GstVerificationOrchestratorService (optional separation)
  - If service grows too large, extract provider orchestration into a separate file
  - Only if code length/complexity warrants it; not mandatory for first slice
```

### Release 2 — Admin Queue Provider Context (follow-on unit)

```
Slice D: GstVerificationQueue admin UI enhancement
  - Add provider_result, provider_name, provider_verified_at, filing_status to queue display
  - Add mismatch detail from raw_verification_json in admin detail view
  - Show "Auto-approved" badge for records with provider_result = 'AUTO_APPROVED'
  - Show "Provider timeout" / "Mismatch detected" labels for fallback records
  - File: components/ControlPlane/GstVerificationQueue.tsx
```

### Release 3 — Notifications and Auto-refresh (deferred)

```
Slice E: Tenant notification on review outcome (NO-NOTIFICATION-01)
Slice F: Workspace auto-refresh on verification approval (NO-REFRESH-01)
```

### Release 4 — Document KYC (deferred, requires separate design)

```
Slice G: Document upload (PAN, COI, address proof) — NO-DOCS-01
Slice H: Udyam support — UDYAM-01
```

---

## 12. Proposed First Implementation Unit

**Title:** `IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01`

**Scope:** Slices A, B, C from §11 above.

**Objective:**
1. Define the `GstProviderAdapter` interface as the provider contract boundary.
2. Implement a concrete provider adapter for the chosen GSTN-authorized provider (or a stub adapter for pre-commercial phases).
3. Add 4 new evidence columns to `gst_verifications` via SQL migration.
4. Modify `GstVerificationService.submitVerification` to trigger async provider call after record creation; populate evidence fields; auto-approve if all criteria pass; route all non-clean outcomes to admin fallback.
5. Update `GstVerificationAdminRecord` TypeScript interface to include new fields.
6. Update `GstVerificationTenantRecord` to include `provider_result` as display-safe (coarse enum value is safe to show tenant — not a security risk, but UX decision is to hide it; confirm with Paresh at impl time).

---

## 13. Proposed File Allowlist for the First Implementation Unit

### Modify (source)

```
server/src/services/gstVerification.service.ts
  — submitVerification: fire-and-forget async provider call after DB upsert
  — new auto-approve path (provider_result = 'AUTO_APPROVED')
  — update GstVerificationAdminRecord to include new evidence columns
  — populate filing_status from provider response

server/prisma/schema.prisma
  — add 4 new columns after db pull from applied migration
  — DO NOT manually edit; only edit after prisma db pull confirms schema
```

### New (source)

```
server/src/services/gstProvider.service.ts
  — GstProviderAdapter interface
  — GstProviderResponse / GstProviderError / GstProviderResult types
  — concrete adapter for chosen provider (fetchGstinFromProvider)
  — name-matching helper (fuzzy match with Levenshtein distance or simple normalization)
```

### Modify (schema / migration)

```
server/prisma/migrations/<timestamp>_gst_provider_evidence_columns/migration.sql
  — ALTER TABLE gst_verifications ADD COLUMN provider_name VARCHAR(100)
  — ALTER TABLE gst_verifications ADD COLUMN provider_request_id VARCHAR(200)
  — ALTER TABLE gst_verifications ADD COLUMN provider_verified_at TIMESTAMPTZ
  — ALTER TABLE gst_verifications ADD COLUMN provider_result VARCHAR(30)
  — ALTER TABLE gst_verifications ADD CONSTRAINT chk_gst_provider_result
      CHECK (provider_result IS NULL OR provider_result IN (
        'AUTO_APPROVED','TIMEOUT','MISMATCH','INACTIVE_GSTIN',
        'INVALID_GSTIN','PROVIDER_ERROR','DUPLICATE_GSTIN'))
  — (optional) CREATE INDEX idx_gst_verifications_provider_result ON gst_verifications(provider_result)
```

### Modify (tests)

```
server/src/__tests__/gst-verification.service.unit.test.ts
  — add tests for auto-approve path (all criteria pass)
  — add tests for each fallback path (timeout, mismatch, inactive, duplicate)
  — all 27 existing tests must continue to pass

server/src/__tests__/gst-provider.service.unit.test.ts  [NEW FILE]
  — mock HTTP for provider adapter
  — test: successful response returns GstProviderResult { ok: true }
  — test: timeout returns { ok: false, error: { kind: 'TIMEOUT' } }
  — test: network error returns { ok: false, error: { kind: 'NETWORK_ERROR' } }
  — test: invalid GSTIN response returns { ok: false, error: { kind: 'INVALID_GSTIN' } }
  — test: name-matching helper (exact, fuzzy, suffix-normalized cases)
```

### Read-only (no changes)

```
server/src/routes/tenant/gst-verification.ts   (no change required for Slices A–C)
server/src/routes/control/gst-verification.ts  (no change required for Slices A–C)
server/src/ttp/ttp.constants.ts                (may need TTP_GST_PROVIDER_RESULT constant — evaluate at impl time)
server/src/utils/orgVerificationGuard.ts       (no change required)
server/src/lib/auditLog.ts                     (no change required; existing writeAuditLog used)
App.tsx                                        (no change required for Release 1)
components/Tenant/GstVerificationCard.tsx      (no change required for Release 1)
components/ControlPlane/GstVerificationQueue.tsx  (no change for Release 1; enhanced in Release 2 / Slice D)
```

---

## 14. Explicit Forbidden Actions for Implementation

The following actions are explicitly forbidden in `IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01`:

| Forbidden | Reason |
|---|---|
| Calling a real GSTN provider API against production data | Requires signed commercial agreement + legal review |
| Modifying `orgVerificationGuard.ts` or blocked status logic | Transactional gate must not be weakened |
| Modifying RLS policies or database triggers | Schema migration adds columns only; RLS unchanged |
| Running `prisma migrate dev` or `prisma db push` | Use `prisma db pull` after SQL applied, then `prisma generate` |
| Running `npx prisma` | Use `pnpm -C server exec prisma <cmd>` only |
| Modifying CRM repo | CRM lifecycle sync is a separate unit (step 5) |
| Modifying Zoho integration | Zoho sync is a separate unit (step 7) |
| Adding document upload schema or endpoints | NO-DOCS-01 — separate deferred unit |
| Modifying billing/Razorpay | Out of scope |
| Modifying public registration flow (`/register`, `POST /api/public/register`) | Out of scope |
| Modifying notification / email templates for new events | Deferred (NO-NOTIFICATION-01) |
| Adding WebSocket or polling for auto-refresh | Deferred (NO-REFRESH-01) |
| Adding provider SDK/package without Paresh approval | Supply-chain safety |
| Auto-rejecting any submission | Only REJECTED outcome via admin PATCH |
| Exposing `raw_verification_json` to tenant-facing responses | Provider privacy; existing projection excludes it |
| Changing `VERIFICATION_BLOCKED_VIEWS` or `ONBOARDING_STATUS_CONTINUITY` | No gate change |
| Exposing passwords, cookies, JWTs, DB URLs, provider API keys, provider secrets | Zero tolerance |
| Touching production data | Design/test only |
| Modifying `ttp.constants.ts` without updating migration.sql seeds | Constants must match DB seeds |

---

## 15. Required Tests

| ID | File | Type | Description |
|---|---|---|---|
| T-01 | `server/src/__tests__/gst-provider.service.unit.test.ts` (NEW) | Unit | Provider adapter: successful GSTN lookup returns `{ ok: true, data: GstProviderResponse }` |
| T-02 | `server/src/__tests__/gst-provider.service.unit.test.ts` (NEW) | Unit | Provider adapter: AbortController timeout returns `{ ok: false, error: { kind: 'TIMEOUT' } }` |
| T-03 | `server/src/__tests__/gst-provider.service.unit.test.ts` (NEW) | Unit | Provider adapter: network error returns `{ ok: false, error: { kind: 'NETWORK_ERROR' } }` |
| T-04 | `server/src/__tests__/gst-provider.service.unit.test.ts` (NEW) | Unit | Provider adapter: GSTIN not found returns `{ ok: false, error: { kind: 'INVALID_GSTIN' } }` |
| T-05 | `server/src/__tests__/gst-provider.service.unit.test.ts` (NEW) | Unit | Name-matching helper: exact match returns true |
| T-06 | `server/src/__tests__/gst-provider.service.unit.test.ts` (NEW) | Unit | Name-matching helper: match after stripping "Private Limited" suffix returns true |
| T-07 | `server/src/__tests__/gst-provider.service.unit.test.ts` (NEW) | Unit | Name-matching helper: unrelated names return false |
| T-08 | `server/src/__tests__/gst-verification.service.unit.test.ts` (EXPAND) | Unit | `submitVerification` auto-approve path: all criteria pass → `organizations.updateMany` called with `VERIFICATION_APPROVED` + `provider_result = 'AUTO_APPROVED'` |
| T-09 | `server/src/__tests__/gst-verification.service.unit.test.ts` (EXPAND) | Unit | `submitVerification` provider timeout: `provider_result = 'TIMEOUT'`, `review_outcome` remains null, `organizations.updateMany` NOT called |
| T-10 | `server/src/__tests__/gst-verification.service.unit.test.ts` (EXPAND) | Unit | `submitVerification` GSTIN CANCELLED: `provider_result = 'INACTIVE_GSTIN'`, `filing_status = 'CANCELLED'`, fallback to admin queue |
| T-11 | `server/src/__tests__/gst-verification.service.unit.test.ts` (EXPAND) | Unit | `submitVerification` name mismatch: `provider_result = 'MISMATCH'`, fallback |
| T-12 | `server/src/__tests__/gst-verification.service.unit.test.ts` (EXPAND) | Unit | `submitVerification` duplicate GSTIN (another org has APPROVED record with same GSTIN): `provider_result = 'DUPLICATE_GSTIN'`, fallback |
| T-13 | `server/src/__tests__/gst-verification.service.unit.test.ts` (EXPAND) | Unit | `submitVerification` race condition guard: if `review_outcome` already set when async callback arrives, auto-approve does NOT overwrite existing outcome |
| T-14 | `server/src/__tests__/gst-verification.service.unit.test.ts` (REGRESSION) | Regression | All 27 existing tests must continue to pass |

---

## 16. Required Production Verification Plan

### Pre-deploy (staging / test environment)

1. Apply schema migration via psql using DATABASE_URL — verify no ERROR/ROLLBACK
2. Run `pnpm -C server exec prisma db pull` — confirm 4 new columns appear in generated schema
3. Run `pnpm -C server exec prisma generate` — no type errors
4. Run `pnpm --filter server typecheck` — no errors
5. Run `pnpm --filter server lint` — no errors
6. Run `pnpm exec vitest run src/__tests__/gst-verification.service.unit.test.ts` — all tests pass
7. Run `pnpm exec vitest run src/__tests__/gst-provider.service.unit.test.ts` — all tests pass
8. `GET /health` → 200

### Staging functional verification (using provider sandbox / test GSTIN)

**Phase 1: Provider adapter**
- Submit a known test GSTIN (provider sandbox) via POST /api/tenant/gst-verification
- Confirm: raw_verification_json populated with provider response
- Confirm: provider_name, provider_request_id, provider_verified_at, provider_result columns populated
- Confirm: filing_status reflects provider response (ACTIVE/CANCELLED/etc.)

**Phase 2: Auto-approve path**
- Submit a clean test GSTIN where all C1–C6 criteria pass
- Confirm: org.status → VERIFICATION_APPROVED
- Confirm: audit log entry `gst_verification.auto_approved` present
- Sign in with that org — confirm workspace is fully accessible

**Phase 3: Fallback paths**
- Submit a GSTIN where provider returns CANCELLED status
- Confirm: provider_result = 'INACTIVE_GSTIN', review_outcome = null (admin queue item)
- Admin reviews via control plane PATCH — confirm outcome persists correctly

**Phase 4: Timeout handling**
- Simulate provider timeout (via test configuration or mock adapter with delay > 8s)
- Confirm: user's POST /api/tenant/gst-verification still returns 201 (no blocking)
- Confirm: provider_result = 'TIMEOUT', record in admin queue

**Phase 5: Transactional gate regression**
- With a PENDING_VERIFICATION org (no GST submitted): attempt POST /api/tenant/catalog — confirm 403 ORG_VERIFICATION_REQUIRED
- Confirm: auto-approve does NOT affect a separate org's gate status

### Production rollout
- Do NOT call real provider against production data until commercial contract is signed
- Initial production deployment: deploy with a NO-OP provider adapter (returns PROVIDER_ERROR for all calls → all records stay in admin queue, zero behavior change for users)
- Enable real provider calls only after contract signed, credentials provisioned via environment variables, and staging E2E verified
- Monitor: admin queue backlog should decrease; auto-approve rate should be measurable

---

## 17. Risks and Adjacent Findings

| ID | Risk / Finding | Severity | Action |
|---|---|---|---|
| RISK-01 | Async fire-and-forget provider call: if the server process restarts between submission and provider callback, the provider result is lost and the record stays in UNKNOWN state with `provider_result = null`. Admin fallback handles it, but the record won't show a `TIMEOUT` label — it will show nothing. | LOW | Accept for Release 1. Add a background re-check job in Release 2 if needed. |
| RISK-02 | Name-matching fuzzy logic introduces false positives/negatives. Levenshtein distance or similarity ratio threshold must be tuned. A 80% threshold may be too permissive for short company names. | MEDIUM | Test with real GSTN company name variations before enabling auto-approve. Set threshold conservatively (90% or higher for names < 10 chars). |
| RISK-03 | GSTIN duplication check (C6) queries `gst_verifications` by gstin. If two orgs submit simultaneously, both could pass the dupe check before either is committed. Low probability but possible. | LOW | Accept for Release 1 (no UNIQUE constraint). If fraud risk is confirmed, add a partial UNIQUE index on gstin where review_outcome = 'APPROVED'. This is a separate schema change. |
| RISK-04 | Provider credentials (API key, secret) must be provisioned as environment variables via Vercel dashboard. They must NEVER appear in source, logs, or error messages. Follow the pattern in `crmTier0NotifyClient.ts` (secret used in header, never logged). | HIGH | Enforce at implementation time. Add to forbidden-actions checklist for the impl unit. |
| RISK-05 | Provider API rate limits: if many registrations spike simultaneously, provider may rate-limit or throttle responses. All throttled responses must result in `PROVIDER_ERROR` fallback (not user-visible errors). | MEDIUM | Add rate-limit response handling in provider adapter. Consider queuing for high-volume scenarios (deferred). |
| RISK-06 | Auto-approve advances org.status to VERIFICATION_APPROVED without any admin awareness. For early operation, consider a brief "confidence window" (e.g., Release 1 keeps admin mandatory, Release 1.1 enables auto-approve after N successful audited approvals). | MEDIUM | Paresh decision required at implementation time. |
| ADJ-01 | **Adjacent finding (unchanged from prior design):** `PATCH /api/control/gst-verification/:orgId` and `POST /api/control/tenants/:id/onboarding/outcome` both advance org.status to VERIFICATION_APPROVED. Possible redundancy. Out of scope. | LOW | Record for future cleanup. |
| ADJ-02 | **Adjacent finding (unchanged):** No UNIQUE constraint on `gstin` across orgs. Multiple orgs can submit the same GSTIN. This is a policy gap — GSTIN is legally unique to one GST registration. | MEDIUM | RISK-03 above. Consider partial UNIQUE index in a follow-on schema unit. |
| ADJ-03 | **Adjacent finding (unchanged):** `submitted_at` is not reset on resubmission — retains original first-submission timestamp. Admin queue ordering by submitted_at may be misleading for re-submitted records. | LOW | Consider adding `last_submitted_at` column in a follow-on unit. |
| ADJ-04 | **Adjacent finding (unchanged):** FTR-ACQ-006 (GSTIN gate alignment for Tier 0 accounts) remains OPEN/NOT_ASSESSED. Provider automation does not change the gate logic. FTR-ACQ-006 scope unaffected. | INFO | No action in this design. |
| ADJ-05 | **Adjacent finding (new):** `TTP_GST_FILING_STATUS` does not include `INACTIVE` as a value (some providers use "Inactive" for recently deregistered GSTINs). Implementation unit must verify provider contract to determine whether INACTIVE needs to be added to the enum. | LOW | Evaluate at impl time; add to ttp.constants.ts and migration.sql if required. |
| ADJ-06 | **Adjacent finding (new):** No env variable validation at server startup for provider credentials. If provider env var is missing, the adapter should fail loudly at startup rather than at first call. Consider adding `zod.parse` of env at startup in `server/src/config/env.ts` (or equivalent). | LOW | Out of scope for impl unit. Record as follow-up. |
| ADJ-07 | **Adjacent finding (new):** The admin review PATCH route does not currently return the `provider_result` or `provider_name` in its response. After schema migration, these new columns will be present in the DB and in `GstVerificationAdminRecord`. The admin route response will include them automatically if `toAdminRecord` mapper is updated. Ensure the mapper covers new columns. | MEDIUM | Must be addressed in impl unit (low risk — just mapper update). |

---

## 18. Hub Impact Assessment

1. **Did this unit change launch readiness truth?**
   No. This is a design-only unit. No source, test, schema, migration, RLS, trigger, or runtime files were changed. No provider integration was implemented.

2. **Which family or requirement changed?**
   None changed. This unit produces a design artifact for a future implementation unit. The implementation sequence step 3 (`DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01`) is now COMPLETE at design level.

3. **Which hub documents need to be updated?**
   `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md` §21 (Production Verification Record, §15 implementation sequence table) may eventually need its Step 3 status updated from `NOT_STARTED` to `DESIGN_COMPLETE`. Not required now — hub files were not allowlisted. Step 4 (`IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01`) status remains `NOT_STARTED` until implementation is authorized.

4. **Evidence supporting update?**
   N/A — no source change, no launch readiness change.

5. **Are CRM or CAE details at risk of duplication?**
   No. CRM lifecycle sync is addressed in a separate unit (step 5). This design does not touch CRM fields or the CRM repo.

6. **Are planned items at risk of promotion to MVP without Paresh confirmation?**
   No. GST/KYC provider automation is marked as `NOT_STARTED` / `NOT_IMPLEMENTED` in all hub trackers. Implementation requires a separate authorized impl unit.

7. **Are any stale hub rows superseded?**
   No. The design confirms the automation direction without invalidating prior decisions.

8. **Hub update required?**
   `NO_HUB_UPDATE_REQUIRED` — pure design artifact. No launch readiness truth was changed.

9. **Hub files allowlisted?**
   Hub files were NOT allowlisted. No hub files were modified. If Paresh wishes to record Step 3 as DESIGN_COMPLETE in the sequence table, that is a separate bounded governance sync commit.

---

## 19. Final Enum

`DESIGN_MAINAPP_GST_KYC_AUTOMATION_HYBRID_WITH_ADMIN_FALLBACK_COMPLETE`

---

## Completion Checklist

- [x] Starting branch and HEAD: `main` · `5625b57c`
- [x] Final branch and HEAD: `main` · (see commit below)
- [x] Worktree status before: **clean**
- [x] Worktree status after: **clean** (only design doc added)
- [x] Files inspected:
  - `server/src/services/gstVerification.service.ts`
  - `server/src/routes/tenant/gst-verification.ts`
  - `server/src/routes/control/gst-verification.ts`
  - `server/src/__tests__/gst-verification.service.unit.test.ts`
  - `components/Tenant/GstVerificationCard.tsx`
  - `components/ControlPlane/GstVerificationQueue.tsx`
  - `services/gstVerificationService.ts`
  - `server/prisma/schema.prisma` (gst_verifications model)
  - `server/src/ttp/ttp.constants.ts`
  - `server/src/utils/orgVerificationGuard.ts`
  - `server/src/services/crmTier0NotifyClient.ts` (external call pattern reference)
  - `App.tsx` (provisionalGstStatus, resolveProvisionalGstStatus, blocked shell CTAs)
  - `DESIGN-MAINAPP-GST-VERIFICATION-PROVISIONAL-ACCESS-AND-HANDOFF-01.md`
  - `DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01.md`
  - `governance/launch-readiness/FUTURE-TODO-REGISTER.md` (FTR-ACQ-006 reference)
- [x] Design doc created: `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01.md`
- [x] Repo-truth summary: complete (§1)
- [x] Provider authority decision: GSTN-authorized provider; Zoho downstream-only; Main App canonical (§6)
- [x] Automation/fallback matrix: 6 auto-approve criteria; 8 fallback triggers; no auto-rejection (§7)
- [x] Evidence capture contract: 4 new columns + raw_verification_json structure + adapter interface (§8)
- [x] Status transition contract: auto-approve path + existing admin paths + race condition guard (§9)
- [x] User experience outcomes: auto-approve, fallback, timeout, mismatch, rejected, needs-more-info (§10)
- [x] Proposed implementation sequence: 4 releases, 8 slices (§11)
- [x] Proposed first implementation unit: `IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01` (§12)
- [x] Proposed allowlist: 5 files to modify, 2 new files, read-only list (§13)
- [x] Required tests: 14 tests specified (§15)
- [x] Production verification plan: pre-deploy + staging + production rollout (§16)
- [x] Forbidden actions preserved (§14)
- [x] No source/test/schema/migration/RLS/trigger/runtime/env/package files changed: **CONFIRMED**
- [x] No production data touched: **CONFIRMED**
- [x] No external provider API called: **CONFIRMED**
- [x] No secrets exposed: **CONFIRMED**
- [x] Validation commands run:
  - `git status --short --untracked-files=all` (before): clean
  - `git status --short --untracked-files=all` (after): one new design doc only
- [x] Hub impact assessment: `NO_HUB_UPDATE_REQUIRED` (§18)
- [x] Final enum: `DESIGN_MAINAPP_GST_KYC_AUTOMATION_HYBRID_WITH_ADMIN_FALLBACK_COMPLETE`
