# FTR-SL-004 — Supplier Inquiry Inbox Design (Repo-Truth Unit)

**Unit:** `FTR-SL-004-SUPPLIER-INQUIRY-INBOX-DESIGN-01`  
**FTR ID:** `FTR-SL-004`  
**Date:** 2026-06-11  
**Status:** DESIGN_COMPLETE (design + repo-truth only)  
**Scope:** Docs-only. No product implementation, no schema change, no production mutation.  
**Final enum:** `FTR_SL_004_SUPPLIER_INQUIRY_INBOX_DESIGN_COMPLETE_READY_FOR_IMPLEMENTATION_DECISION`

---

## 1) Branch / HEAD / Repo State

1. Branch: `main`
2. HEAD: `97a03c51dd5908b40752ca054357daaecaaf854b`
3. Local vs origin: equal (`HEAD == origin/main`)
4. Working tree: clean (`git status --short` no entries)
5. Latest 8 commits:
   - `97a03c51` docs(launch): register adjacent findings rule and sync Wave 1D pointers
   - `3996e571` docs(launch): formally close FAM-09 with launch residuals
   - `6c3e8174` docs(launch): formally close FAM-08 with residuals
   - `adb55ab1` gov: FTR-OPS-001D handoff, FTR-OPS-003 closed, FTR-ACQ-001 implementation complete
   - `d2ab1caa` docs(ops): FTR-OPS-003 production rollback runbook
   - `0fc03f1b` gov: Layer 0 pointer sync
   - `2727a1c9` docs(launch): July launch readiness audit and registry
   - `8088737a` docs(launch): verify supplier inquiry notification runtime
6. Source changes after `97a03c51`: none (`git diff --name-only 97a03c51..HEAD` empty)

## 2) Governance Truth for `FTR-SL-004`

- `FUTURE-TODO-REGISTER.md`: FTR-SL-004 was open as follow-on design candidate; now closed as `DESIGN_COMPLETE` by this unit.
- `NEXT-ACTION.md`: next candidate already points to `FTR-SL-004-SUPPLIER-INQUIRY-INBOX-DESIGN-01`.
- `OPEN-SET.md`: Wave 1D close already records FTR-SL-004 as next candidate.
- `LAUNCH-FAMILY-INDEX.md`: FAM-08 and FAM-09 both closed with residuals; FTR-SL-004 and D-018/PRIT-033 Stage 2 remain explicitly open decision/design residuals.
- `PRIT-033`: MVP_CRITICAL/P1 supplier inquiry inbox requirement remains active.
- `D-018`: FAM-03 vs FAM-08 assignment was historically parked; repo-current state now treats FTR-SL-004 as FAM-08 follow-on candidate and this design adopts that path.

## 3) Current Inquiry Implementation Summary

- Public inquiry submission exists at `POST /api/public/inquiry/submit` in `server/src/routes/public.ts`.
- Two operating modes exist:
  - Supplier-context inquiry (`supplier_slug` present)
  - General inquiry (`supplier_slug` absent)
- Frontend entry surfaces exist:
  - `components/Public/PublicInquiryPage.tsx`
  - `components/Public/PublicSupplierProfile.tsx`
- Inquiry payload intentionally excludes buyer contact PII in persisted event payload and uses sanitization/validation for `message`.

## 4) Current Persistence Model

- No dedicated inquiry table exists in `server/prisma/schema.prisma`.
- Supplier-context inquiry persistence: audit log row with action `public.buyer.inquiry.created`, `realm='TENANT'`, `tenantId=supplier org_id`, payload in `afterJson`.
- General inquiry persistence: audit log row with action `public.buyer.inquiry.general.created`, `realm='ADMIN'`, `tenantId=null`, payload in `afterJson`.
- Event mapping exists for `public.buyer.inquiry.created -> buyer_inquiry.created.v1`; general inquiry action is not event-mapped.

## 5) Current Notification Model

- Email wrappers exist in `server/src/services/email/email.service.ts`:
  - buyer ack (`sendBuyerInquiryAcknowledgementEmail`)
  - supplier notification (`sendSupplierInquiryNotificationEmail`)
  - admin alert (`sendAdminInquiryAlertEmail`)
- Route dispatch is best-effort, non-blocking for failure, and does not alter 202 inquiry acknowledgement behavior.

## 6) Recommended Inbox Persistence Model

**Recommendation: Option C (Hybrid) with Option A as first implementation slice.**

- **Now (launch-safe):** audit-log-backed read-only inbox for supplier-facing context.
- **Later (post-launch/expanded workflows):** dedicated inquiry table once mutable workflow states, ownership transitions, and contact-based engagement are introduced.

Rationale:
- Launch speed: highest (no schema migration)
- Data quality/queryability: acceptable for early read-only list; limited for advanced workflows
- Privacy: strong current constraints already enforced
- UX: enough for visibility/context; limited mutable lifecycle
- Admin visibility: already available via control-plane audit logs
- Migration risk: low now, deferred to intentional future unit
- RLS impact: minimal, uses existing tenant-scoped audit access patterns

## 7) Recommended Supplier UX (Minimum Launch-Ready)

- New tenant workspace route: **Supplier Inquiry Inbox** (read-only list + detail panel)
- List columns/cards:
  - Inquiry type (`inquiry_category`)
  - Source surface (`source_surface`)
  - Supplier context (`supplier_slug` when present)
  - Optional context (`product_slug`, `category_slug`, `collection_slug`)
  - Geo/volume bands
  - Timestamp
  - Classification badge (see §10)
- Detail view:
  - Full sanitized inquiry context from `afterJson`
  - Explicit “No buyer contact details collected” notice
  - Explicit “Reply to buyer unavailable in current launch model” notice
- No lead conversion, no outbound messaging, no buyer identity assumptions

## 8) Recommended Admin / SuperAdmin Visibility

- Keep existing control-plane audit visibility as source of truth.
- Add optional lightweight filter presets for inquiry actions in control-plane audit log view (later, non-blocking).
- Continue using audit views for abuse/spam/QA traceability and launch observability.

## 9) Recommended Role / Permission Model

Repo truth:
- `tenantAuthMiddleware` authenticates any valid tenant membership role.
- Some tenant routes explicitly restrict roles; inquiry-related and tenant-audit routes currently do not.

Design recommendation for inquiry inbox:
- **OWNER, ADMIN, MEMBER:** allowed (read-only)
- **VIEWER:** default deny for inbox in first slice (to reduce exposure of demand context)
- **SUPER_ADMIN / PLATFORM_ADMIN:** via control-plane audit surfaces, not tenant inbox route
- **Buyer roles:** no tenant-inbox access

## 10) Recommended Data Classification / Status Model

Classification badges (computed, read-only in first slice):
- `QA_RUNTIME_VERIFICATION`
- `DEMO_PILOT`
- `REAL_BUYER_INTEREST`
- `SPAM_INVALID`
- `ARCHIVED_RESOLVED` (future mutable lifecycle; display-only placeholder for now)

Guardrails:
- The verified FTR-B2C-005B QA inquiry must be tagged non-commercial (`QA_RUNTIME_VERIFICATION`), never treated as a lead.
- `lt-b2b-001` related inquiries should respect demo/pilot posture (`DEMO_PILOT`) in line with FTR-SL-005 direction.

## 11) Recommended Privacy / Legal Notes

- Current inquiry path intentionally captures no buyer email/phone in payload.
- Inbox copy must clearly state no direct buyer contact channel exists yet.
- If future buyer-contact fields are introduced, legal/privacy updates are mandatory before enabling reply/contact workflows.
- Related legal dependency remains tracked under FTR-LEGAL-002; not implemented here.

## 12) Recommended Implementation Slices

1. **Slice A (recommended first):** audit-log-backed read-only supplier inquiry inbox (no schema change).
2. Slice B: add filtered API projection endpoint for inquiry events (tenant plane) with role gating OWNER/ADMIN/MEMBER.
3. Slice C: UX polish (filters by category/surface/date, empty states, badge legend).
4. Slice D (future): dedicated inquiry table + mutable lifecycle + admin operations.

## 13) Recommended First Implementation Unit

`IMPL-FTR-SL-004A-AUDIT-LOG-BACKED-SUPPLIER-INQUIRY-INBOX-READONLY-01`

- No schema change
- No production data mutation
- No messaging/reply actions
- Read-only inquiry context from audit logs

## 14) Likely File Allowlist for First Implementation Unit

- `server/src/routes/tenant.ts` (new filtered inquiry-audit read endpoint)
- `components/Tenant/*` (new supplier inquiry inbox surface)
- `services/tenantApiClient.ts` and/or tenant-facing service file
- `App.tsx`
- `runtime/sessionRuntimeDescriptor.ts`
- `layouts/Shells.tsx` (only if navigation exposure is needed)
- `server/src/__tests__/*` + `tests/frontend/*` for new route/UI tests

## 15) Tests Required

- Backend unit/integration:
  - tenant inquiry inbox route returns only inquiry actions
  - role gating enforced (OWNER/ADMIN/MEMBER allowed; VIEWER denied)
  - tenant isolation enforced (no cross-tenant leakage)
  - no PII fields exposed beyond current sanctioned payload
- Frontend tests:
  - route render + loading/empty/error states
  - badge mapping/classification logic
  - “reply unavailable/no contact” guard text present

## 16) Production Verification Required

- `GET /api/health` remains 200 after deploy.
- Tenant user (OWNER/ADMIN/MEMBER) can open inbox and view inquiry events.
- VIEWER denied as designed (if role gate added).
- Confirm FTR-B2C-005B QA inquiry appears with non-commercial badge.
- Confirm no ability to send outbound reply or convert to lead in Slice A.

## 17) Out-of-Scope (Explicit)

- Product implementation beyond docs/design in this unit
- Schema/migration changes
- Inquiry submission runtime mutation
- Email dispatch testing
- Legal/payment/Zoho/CRM/accounting work
- Demo labeling implementation (FTR-SL-005)

## 18) Adjacent Findings Evaluation

1. Need explicit classification mapping for QA/demo/real/spam in first implementation slice.
2. Current tenant audit endpoint returns generic logs; dedicated filtered inquiry endpoint is safer for UX and least-privilege.
3. VIEWER access posture should be explicitly decided for inquiry context (recommended deny).
4. General inquiry events (`public.buyer.inquiry.general.created`) are admin-scoped and should remain outside supplier inbox.
5. Dedicated inquiry table can be deferred; no immediate launch blocker if Slice A ships.

## 19) Tracker / Docs Update Summary

- Added this artifact file.
- Updated `FUTURE-TODO-REGISTER.md` FTR-SL-004 row to `DESIGN_COMPLETE` with implementation-ready recommendation.
- No source code or schema files changed.

## 20) Final Enum

`FTR_SL_004_SUPPLIER_INQUIRY_INBOX_DESIGN_COMPLETE_READY_FOR_IMPLEMENTATION_DECISION`
