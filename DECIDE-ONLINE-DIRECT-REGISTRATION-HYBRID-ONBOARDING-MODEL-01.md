# DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01

## 1. Unit ID
DECIDE-ONLINE-DIRECT-REGISTRATION-HYBRID-ONBOARDING-MODEL-01

## 2. Date
2026-06-08

## 3. Operator
Paresh Patel (founder authority)
GitHub Copilot (GPT-5.3-Codex) governance inspection and artifact authoring

## 4. Mode
TECS Safe-Write decision/design unit only

This unit is architecture correction + repo-truth audit + decision lock.
No implementation, no schema change, no route mutation, no runtime mutation.

## 5. Repos / Preflight

| Repo | Branch | HEAD at Start | HEAD at End | Worktree Start | Worktree End |
|---|---|---|---|---|---|
| Main App (`C:/Users/PARESH/TexQtic`) | main | `32580088` | `32580088` | clean | clean |
| CRM (`C:/Users/PARESH/TexQtic-CRM`) | main | `30aedc1` | `30aedc1` | clean | clean |
| Marketing (`C:/Users/PARESH/texqtic-marketing-`) | main | `2deb0b8` | `2deb0b8` | clean | clean |

Preflight commands were executed in all three repos:
- `git status --short`
- `git rev-parse --abbrev-ref HEAD`
- `git rev-parse --short HEAD`
- `git log -1 --oneline`

Stop condition check: all worktrees were clean, so decision work proceeded.

## 6. Scope Boundary Confirmations
- No source-code implementation performed.
- No routes created/changed.
- No DB migration/schema/env changes.
- No provisioning retries/fixes attempted.
- No runtime onboarding submissions executed.
- No secrets exposed.

## 7. Files Inspected (Repo Truth)

### Main App
- `server/src/routes/public.ts`
- `server/src/routes/tenant.ts`
- `server/src/routes/tenant/gst-verification.ts`
- `services/tier0Service.ts`
- `services/tenantService.ts`
- `components/Public/PublicRequestAccess.tsx`
- `components/Auth/AuthFlows.tsx`
- `components/Onboarding/OnboardingFlow.tsx`
- `App.tsx`
- `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01.md`

### CRM
- `api/webhooks/mainapp-tier0-captures.ts`
- `api/webhooks/lead-submissions.ts`
- `api/admin-bridge/leads/inbox.ts`
- `api/admin-bridge/leads/qualify.ts`
- `api/admin-bridge/onboarding-cases/onboarding-case-mutations.ts`
- `api/admin-bridge/onboarding-cases/[id]/actions.ts`
- `api/admin-bridge/onboarding-cases/[id]/issuance/issue.ts`
- `api/admin-bridge/onboarding-cases/[id]/issuance/resend.ts`
- `api/admin-bridge/onboarding-cases/[id]/platform-observation.ts`
- `server/lib/approvedOnboardingProvisioning.ts`

### Marketing
- `src/components/RequestAccessPage.tsx`
- `src/lib/requestAccessHandoff.ts`
- `src/constants/routes.ts`
- `src/pages/ContactPage.tsx`
- `src/pages/ResourcesPage.tsx`
- `src/pages/SupplyNetworkPage.tsx`

## 8. Prior Context Reconciliation
Previous chain state (accepted):
- Tier 0 Main App -> CRM notification seam is implemented and runtime-verified.
- CRM qualification and onboarding-case lifecycle exists and is operational.
- `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01` locked the approved provisioning seam.
- `VERIFY-CRM-APPROVED-LEAD-MANUAL-HANDOFF-RUNTIME-01` is blocked with provisioning HTTP 404 in the CRM-approved path.

Correction intent in this unit:
- Move online default to direct Main App registration lane.
- Retain CRM-approved provisioning seam as offline/assisted fallback lane.
- Park 404 fix to fallback lane work; do not fix in this unit.

## 9. Repo-Truth Findings Summary

### Main App truth
1. Public online intake currently exists at `POST /api/public/tier0/request-access` (`server/src/routes/public.ts`).
2. Current public request-access flow explicitly states: no account created on submit.
3. Tenant activation routes require invite token (`POST /api/tenant/activate` and `POST /api/tenant/activate-authenticated` in `server/src/routes/tenant.ts`).
4. Tenant login is membership-based; frontend auth flow is sign-in, not public self-signup (`components/Auth/AuthFlows.tsx`).
5. GST submission exists (`POST /api/tenant/gst-verification`), with format validation + admin review workflow.
6. Verification-gated workspace behavior exists (`App.tsx` has `VERIFICATION_BLOCKED_VIEWS` and blocked-shell logic for pending/rejected/more-info statuses).
7. Current GST process is manual/hybrid review-oriented; no live GSTN provider call path is active in the inspected route/service seams.
8. No active Zoho Books integration was found in Main App runtime source seams.
9. Billing/subscription runtime in inspected seams is informational/read-only posture, not active checkout/payment pipeline.

### CRM truth
1. CRM receives both website and Main App Tier0 captures (`api/webhooks/lead-submissions.ts`, `api/webhooks/mainapp-tier0-captures.ts`).
2. CRM qualification path exists (`api/admin-bridge/leads/qualify.ts`) and feeds onboarding cases.
3. CRM approved onboarding provisioning push exists (`server/lib/approvedOnboardingProvisioning.ts`) and stores `orgId`, `inviteId`, provisioning metadata.
4. CRM issuance actions expose/relay `actionLink` (`api/admin-bridge/onboarding-cases/[id]/issuance/*.ts`, `[id]/actions.ts`).
5. CRM activation observation/reflection seam exists (`[id]/platform-observation.ts`, onboarding case mutations).
6. CRM contains no active Zoho Books integration in inspected runtime routes/services.

### Marketing truth
1. Marketing route `/request-access` currently redirects to `https://app.texqtic.com/request-access` (`src/components/RequestAccessPage.tsx`).
2. CTA route constants still map primary onboarding/join actions to `/request-access` (`src/constants/routes.ts`).
3. Handoff query sanitizer exists and intentionally blocks token-like query params (`src/lib/requestAccessHandoff.ts`).

## 10. Decision Answers

### A. Online acquisition
1. Should online users skip Request Access entirely?
- **Decision:** YES for default online growth lane.
- **Interpretation:** request-access remains only as temporary compatibility endpoint until direct registration lane is implemented and marketing CTA migration completes.

2. Should online CTAs route to direct registration?
- **Decision:** YES.

3. Should CTAs be role-specific?
- **Decision:** YES; Supplier, Buyer, Service Provider entry intents.

4. Does Main App currently support direct registration without invite?
- **Answer from truth:** NO. Current activation path is invite-token based.

5. Does Main App currently support role selection at registration?
- **Answer from truth:** NOT as direct self-registration. Role intent exists on Tier0 request-access capture.

6. Can Main App create provisional accounts safely?
- **Decision:** YES by design target; **current implementation gap exists**.

7. What can provisional users access before GST/KYC approval?
- **Decision lock:** read-only/non-transactional workspace continuity only.
- **Must block:** trade/RFQ/escrow/settlement/invoice-action workflows.

8. What must remain blocked until verification?
- **Decision lock:** all transactional and counterpart-sensitive workflows, including RFQ response/quote, trade, escrow, settlement, invoice approvals, and any payment-readiness progression.

### B. GST/KYC automation
1. What GST/KYC capabilities exist today?
- Tenant GST submit route + admin review route + status-gated workspace behavior.

2. Is GST verification manual, automated, or hybrid today?
- **Today:** manual/hybrid review (no active external GST auto-verification authority in inspected seams).

3. What is needed for automated GST verification?
- Dedicated GSTN-authorized verification provider integration + evidence capture + exception handling.

4. Should Zoho Books be used for GST verification or only downstream sync?
- **Decision:** only downstream finance/accounting sync. Not GST verification authority.

5. Which provider category should be used for GSTIN verification?
- **Decision:** GSTN-authorized verification API/provider category.

6. What evidence fields must be stored in Main App?
- Verification request id/reference.
- provider name/category.
- verification timestamp(s).
- result status and reason code.
- reviewed-by/override actor when fallback used.
- immutable audit trail pointer.

7. What should trigger activation?
- Verification outcome approved (automated success or admin fallback approval).

8. What should go to admin fallback?
- provider timeout/unavailable.
- ambiguous or mismatch result.
- document mismatch/manual exception.
- high-risk/fraud signals.

### C. CRM role
1. What CRM functions remain necessary for online leads?
- lifecycle visibility, relationship management, campaign attribution continuity, follow-up/casework.

2. Should CRM receive events at request/registration/GST submitted/GST approved/activation/subscription milestones?
- **Decision:** YES.

3. Should CRM block online registration?
- **Decision:** NO.

4. Which flows remain CRM-first?
- Offline/assisted channels: trade fairs, field-sales, associations, enterprise-assisted onboarding.

5. How should offline CRM cases produce Main App registration link?
- CRM qualifies and prepares case, then generates/relays Main App registration activation link through bounded issuance/handoff seam.

6. Should failed CRM provisioning 404 path be parked or fixed now?
- **Decision:** PARK in this unit; do not fix here.

### D. Zoho Books role
1. Does any Zoho integration already exist?
- **Answer from inspected runtime seams:** no active Zoho Books integration found.

2. What should Main App send to Zoho after activation?
- role-mapped contact profile + legal/entity identity + readiness markers + cross-system ids.

3. Should Zoho contact type depend on role?
- **Decision:** YES.
- Buyer -> customer.
- Supplier/Service Provider -> vendor or dual role per finalized commercial model.

4. Required custom fields (decision lock)
- `texqticOrgId`
- `tenantId`
- `gstVerificationId` or equivalent verification reference
- `crmLeadId` and/or `crmOnboardingCaseId` when available

5. Should Zoho sync happen before or after GST verification?
- **Decision:** after verification approval (or explicit approved fallback).

6. Should Zoho sync happen before or after subscription/payment readiness?
- **Decision:** after activation baseline; finance-readiness milestones may enrich later.

### E. Prior decision correction
1. Which existing decision docs must be superseded or narrowed?
- `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01` is narrowed.

2. How should `DECIDE-MAINAPP-CRM-APPROVED-ONBOARDING-SEAM-LOCK-01` be reclassified?
- Reclassify as **offline/assisted fallback seam lock**, not default online acquisition model.

3. Should CRM-approved provisioning remain as offline/assisted fallback?
- **Decision:** YES.

4. What should happen to `FIX-CRM-MAINAPP-APPROVED-ONBOARDING-PROVISIONING-404-01`?
- Keep open/parked under offline-assisted fallback reliability lane.

5. What is the new implementation sequence?
- See Section 15.

## 11. Chosen Architecture (Locked)

## Hybrid onboarding model is locked:

### Online lane (default)
Marketing/social/SEO/WhatsApp -> Main App direct registration -> role selection -> provisional account -> GST/KYC capture -> automated verification with admin fallback -> Main App activation + transactional unlock -> CRM lifecycle sync -> Zoho Books contact/accounting sync -> subscription/billing readiness.

### Offline/assisted lane
Trade fair/field sales/associations/enterprise-assisted -> CRM qualification/casework -> CRM-issued Main App registration link/handoff -> Main App registration + GST/KYC -> activation -> CRM lifecycle sync -> Zoho sync -> subscription/billing readiness.

### Convergence point
Main App verification approval + activation boundary is canonical for unlock.
CRM and Zoho are downstream lifecycle/commercial systems, not pre-entry gatekeepers for online default.

## 12. Request Access Decision
- `Request Access` is no longer the intended long-term default online acquisition step.
- It is retained temporarily as a compatibility bridge while direct registration lane is implemented and CTAs are migrated.

## 13. Direct Registration CTA / Role Strategy
- Marketing CTAs should move from request-access intent to direct role-aware registration entry.
- Role-specific CTA intents required: Supplier, Buyer, Service Provider.
- Capture source + campaign attribution at registration start; do not lose first-touch lineage.

## 14. Provisional Access Rules (Locked)
Allowed before verification:
- profile completion
- document upload
- non-transactional workspace orientation
- status visibility and checklist progression

Blocked before verification approval:
- RFQ execution and quote action
- trade creation/execution
- escrow and settlement operations
- invoice approval/payment-readiness actions
- any workflow implying transactional eligibility

## 15. New Implementation Sequence (Post-Decision)
1. DESIGN-MAINAPP-DIRECT-REGISTRATION-ENTRY-AND-ROLE-SELECTION-01
2. IMPL-MAINAPP-DIRECT-REGISTRATION-PROVISIONAL-ACCOUNT-01
3. DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01
4. IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01
5. DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01
6. IMPL-CRM-LIFECYCLE-SYNC-INGESTION-AND-STATUS-MAP-01
7. DESIGN-ZOHO-POST-ACTIVATION-CONTACT-SYNC-CONTRACT-01
8. IMPL-ZOHO-POST-ACTIVATION-SYNC-01
9. IMPL-MARKETING-CTA-MIGRATION-TO-DIRECT-REGISTRATION-01
10. VERIFY-END-TO-END-ONLINE-DIRECT-REGISTRATION-HYBRID-01
11. OFFLINE-FALLBACK: FIX-CRM-MAINAPP-APPROVED-ONBOARDING-PROVISIONING-404-01 (separate lane)

## 16. Supersession / Narrowing Lock
This decision supersedes prior interpretation where CRM-approved provisioning seam could be read as the default online model.

Locked correction:
- Online default = Main App direct registration.
- CRM-approved provisioning seam = offline/assisted fallback and exception lane.

No reversal of prior seam existence.
Only default-lane classification is corrected.

## 17. Firewalls Preserved
- Main App remains canonical for onboarding verification, activation, trust/access state, transactional unlock.
- CRM remains canonical for assisted qualification workflow and relationship lifecycle operations.
- Zoho remains downstream accounting/commercial contact sync system.
- GST verification authority must not be delegated to Zoho.

## 18. 404 Blocker Disposition
`VERIFY-CRM-APPROVED-LEAD-MANUAL-HANDOFF-RUNTIME-01` blocker (`BLOCKED_MAINAPP_PROVISIONING_FAILED` / HTTP 404) is explicitly parked for offline-assisted fallback reliability work.

No remediation attempted in this unit.

## 19. Decision Verdict
DECISION_ONLINE_DIRECT_REGISTRATION_HYBRID_MODEL_LOCKED

## 20. Final Enum
DECIDE_ONLINE_DIRECT_REGISTRATION_HYBRID_ONBOARDING_MODEL_COMPLETE

---

## 21. Production Verification Record (2026-06-08)

**PRODUCTION VERIFICATION RECORD** — added post-implementation by unit `GOV-SYNC-MAINAPP-HYBRID-ONBOARDING-DIRECT-REGISTRATION-TRUTH-01`.

This section records the production verification truth for the implementation units that executed the §15 implementation sequence. No decisions in this document are revoked or superseded.

### Implementation Sequence Progress (§15)

| Step | Unit | Status | Commit |
|---|---|---|---|
| 1 | `DESIGN-MAINAPP-DIRECT-REGISTRATION-ENTRY-AND-ROLE-SELECTION-01` | COMPLETE (design locked in this decision doc) | `32580088` |
| 2 | `IMPL-MAINAPP-DIRECT-REGISTRATION-PROVISIONAL-ACCOUNT-01` | PRODUCTION_VERIFIED — `POST /api/public/register` live; `da9cbece` | `da9cbece` |
| — | Public CTA hierarchy — `Join TexQtic → /register` as primary | PRODUCTION_VERIFIED | `1ced08c6` |
| — | Request Access public-nav deprecation (legacy fallback only) | PRODUCTION_VERIFIED | `0c44d426` |
| — | Provisional success posture — SUCCESS stage messaging | PRODUCTION_VERIFIED | `254aef60` |
| — | Backend transactional verification gate — main route files | PRODUCTION_VERIFIED | `b30987f9` |
| — | Backend transactional verification gate — NC Pool route files | PRODUCTION_VERIFIED | `15548d9a` |
| 3 | `DESIGN-MAINAPP-GST-KYC-AUTOMATION-HYBRID-WITH-ADMIN-FALLBACK-01` | NOT_STARTED | — |
| 4 | `IMPL-MAINAPP-GST-KYC-PROVIDER-INTEGRATION-AND-EVIDENCE-CAPTURE-01` | NOT_STARTED | — |
| 5 | `DESIGN-CRM-LIFECYCLE-SYNC-EVENT-MAP-FROM-MAINAPP-01` | NOT_STARTED | — |
| 6 | `IMPL-CRM-LIFECYCLE-SYNC-INGESTION-AND-STATUS-MAP-01` | NOT_STARTED | — |
| 7 | `DESIGN-ZOHO-POST-ACTIVATION-CONTACT-SYNC-CONTRACT-01` | NOT_STARTED | — |
| 8 | `IMPL-ZOHO-POST-ACTIVATION-SYNC-01` | NOT_STARTED | — |
| 9 | `IMPL-MARKETING-CTA-MIGRATION-TO-DIRECT-REGISTRATION-01` | NOT_STARTED | — |
| 10 | `VERIFY-END-TO-END-ONLINE-DIRECT-REGISTRATION-HYBRID-01` | NOT_STARTED (depends on steps 3–9) | — |
| 11 | `FIX-CRM-MAINAPP-APPROVED-ONBOARDING-PROVISIONING-404-01` | OPEN / PARKED (offline-assisted fallback lane) | — |

### Production Deployment Evidence

| Item | Value |
|---|---|
| Production deployment ID | `4973455418` |
| Deployed SHA | `15548d9a451d74806dbd4269dc38daa780da3654` |
| Deployment state | `success` |
| Environment | Production (`app.texqtic.com`) |
| Completed | `2026-06-08T10:29:07` |

### Backend Verification Gate Summary

| Item | Value |
|---|---|
| Guard utility | `server/src/utils/orgVerificationGuard.ts` |
| Guard function | `isOrgVerificationBlocked(orgId, reply)` |
| Blocked statuses | `PENDING_VERIFICATION`, `VERIFICATION_REJECTED`, `VERIFICATION_NEEDS_MORE_INFO` |
| HTTP response | 403, `ORG_VERIFICATION_REQUIRED` |
| Fail-closed | YES — blocks on missing org or DB error |
| Total endpoints guarded | 34 across 10 route files |
| Unit tests | 18/18 PASS (`org-verification-guard.unit.test.ts` + `nc-pool-verification-gate.unit.test.ts`) |
| Implementation commits | `b30987f9` (main routes) + `15548d9a` (NC Pool routes) |

### §14 Provisional Access Rules — Production Status

| Rule | Status |
|---|---|
| `profile completion` — allowed before verification | ALLOWED (no backend gate on profile routes) |
| `document upload` — allowed before verification | ALLOWED (no backend gate on upload routes) |
| `RFQ execution and quote action` — blocked | BLOCKED — backend gate on `POST /rfqs`, `POST /rfqs/drafts/*`, `POST /:poolId/rfq/*` |
| `trade creation/execution` — blocked | BLOCKED — backend gate on `POST /` (trades), `POST /from-rfq` |
| `escrow and settlement operations` — blocked | BLOCKED — backend gate on escrow and settlement endpoints |
| `invoice approval/payment-readiness actions` — blocked | BLOCKED — backend gate on catalog, checkout endpoints |
| `any NC Pool transactional operation` — blocked | BLOCKED — backend gate on pools, pool demand lines, pool RFQ, supplier invites/quotes |

### Hybrid Model Lock Confirmed

- Online default = Main App direct registration lane (`/register`)
- Provisional org status on registration = `PENDING_VERIFICATION`
- Frontend gate = `VERIFICATION_BLOCKED_VIEWS` + `isVerificationBlockedTenantWorkspace` in App.tsx (pre-existing, unchanged)
- Backend gate = `isOrgVerificationBlocked` in server route files (added 2026-06-08)
- CRM-approved provisioning seam = offline/assisted fallback lane (parked, unchanged)
- Decision verdict remains: `DECISION_ONLINE_DIRECT_REGISTRATION_HYBRID_MODEL_LOCKED`

**Production Verification Enum:** `VERIFY_MAINAPP_PENDING_VERIFICATION_BACKEND_STATUS_GATE_PRODUCTION_COMPLETE`
