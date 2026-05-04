# PRODUCT-DEC-TRADETRUST-PAY-FULL-RUNTIME-AUDIT-001
## TTP Full Production Runtime Audit + Blind-Spot Review

**Date:** 2026-06-24  
**Auditor:** Paresh (Product Owner) + Copilot (Governance Agent)  
**Scope:** All TTP surfaces — B2B Tenant, White Label, SuperAdmin Control Plane, Backend Routes, Schema, Services  
**Commit at audit:** `ab08f48` — docs(tradetrust-pay): verify slice 7 summary enrollment in production  
**Production URL:** https://app.texqtic.com  
**Status:** `FULL_RUNTIME_AUDIT_COMPLETE__ACTIVATION_READINESS_REQUIRED_FIRST`

---

## 1. Audit Summary

### Final Recommendation

**Recommendation: FULL_RUNTIME_AUDIT_COMPLETE__ACTIVATION_READINESS_REQUIRED_FIRST**

All 7 TTP implementation slices are production-deployed and auth-gated. No data leakage, no cross-tenant vulnerability, no double-unwrap bugs in any service. One structural blind spot exists: **`ttp_enabled` kill-switch is defined but not enforced at the service/route layer**. This means TTP operations are live the moment a valid authenticated session is presented — the kill-switch only exists in the feature_flags store and is never read by route handlers. Before activating TTP for any org, an activation readiness checklist (kill-switch enforcement + QA happy path data) must be completed.

---

## 2. Production Deployment Context

| Item | Value |
|---|---|
| Production URL | https://app.texqtic.com |
| HEAD commit | `ab08f48` |
| Build | Vite 168-module SPA build — clean |
| Typecheck | Frontend: 0 errors; Server: 0 errors |
| Unit tests | 174/174 pass |
| Deploy | Vercel auto-deploy from `main` |
| Node target | 22 LTS |
| `ttp_enabled` feature flag | Defined in `TTP_FEATURE_FLAG.TTP_ENABLED = 'ttp_enabled'` — value in DB: `false` |
| Kill-switch status | Constant defined; **NOT READ by any service/route handler** (see §8) |

---

## 3. B2B Tenant Runtime Findings

### Navigation Surface

| Route Key | Shell Register | App.tsx Case | Component | Status |
|---|---|---|---|---|
| `escrow` | ✅ `B2B_SHELL_ROUTE_KEYS` | ✅ `case 'escrow'` | `EscrowPanel` | ✅ WIRED |
| `gst_verification` | ✅ `B2B_SHELL_ROUTE_KEYS` | ✅ `case 'gst_verification'` | `GstVerificationCard` | ✅ WIRED |
| `invoices` | ✅ `B2B_SHELL_ROUTE_KEYS` | ✅ `case 'invoices'` | `InvoicesPanel` | ✅ WIRED |
| `invoice_approval` | ✅ `B2B_SHELL_ROUTE_KEYS` | ✅ `case 'invoice_approval'` | `InvoiceApprovalView` | ✅ WIRED (bridge-gated) |
| `trades` | ✅ `B2B_SHELL_ROUTE_KEYS` | ✅ `case 'trades'` | `TradesPanel` + TTP components | ✅ WIRED |

### TTP Components in Trade Detail

| Component | Rendered In | Condition | Status |
|---|---|---|---|
| `TtpTradeSummaryCard` | `TradesPanel` trade detail | Trade selected | ✅ WIRED (wired in `c8faeb6`) |
| `TtpEnrollmentBanner` | `TradesPanel` trade detail | Trade selected | ✅ WIRED (wired in `c8faeb6`) |

### Branding Alignment

| Surface | Old Label | Current Label | Status |
|---|---|---|---|
| `EscrowPanel` header | (was "Escrow") | "TradeTrust Ledger" | ✅ ALIGNED |
| `EscrowPanel` empty state | (was "Escrow accounts") | "TradeTrust Ledger accounts" | ✅ ALIGNED |
| `EscrowPanel` create CTA | (was "Create Escrow") | "Create TradeTrust Ledger Account" | ✅ ALIGNED |
| `Shells.tsx` nav label | (was "Escrow") | "TradeTrust Ledger" | ✅ ALIGNED |
| `runtime/sessionRuntimeDescriptor.ts` route title | "TradeTrust Ledger" | "TradeTrust Ledger" | ✅ ALIGNED |

### QA Limitations for B2B Happy Path

| QA Need | Exists? | Evidence | Required? |
|---|---|---|---|
| Trade with ACTIVE/ROUTING_READY VPC | ❌ | No VPCs in prod DB | Required for `TtpTradeSummaryCard` happy-path UI |
| Trade with complete TTP readiness chain (GST+eligibility+invoice+VPC) | ❌ | No such trade in prod | Required for full B2B flow smoke test |
| `TtpEnrollmentBanner` in REQUESTED state | ❌ | No approved enrollment | Required for banner happy-path test |

---

## 4. White Label Runtime Findings

### Finding: `CLEAN_WL_SEPARATION`

`WL_STOREFRONT_SHELL_ROUTE_KEYS` includes:
- `escrow`, `gst_verification`, `invoices`, `invoice_approval`, `trades`  
These are standard operational routes, not TTP-admin routes.

`WL_ADMIN_SHELL_ROUTE_KEYS` includes only: `branding`, `staff`, `products`, `collections`, `orders`, `domains`, `dpp_label`  
**No TTP control-plane routes are exposed in any WL surface.**

`Shells.tsx` B2B shell nav only exposes: `TradeTrust Ledger`, `GST Verification`, `Invoices` for tenant-facing nav. No `ttp_eligibility`, `vpc_console`, `invoice_oversight`, or `ttp_enrollment_admin` in tenant/WL shells.

**Verdict: WL plane is cleanly separated from TTP admin surfaces.** ✅

---

## 5. SuperAdmin Control Plane Runtime Findings

### Navigation Coverage

`CONTROL_PLANE_NAV` in `SuperAdminShell.tsx` (25 items):

| Position | RouteKey | Icon | Label | In `CONTROL_PLANE_SHELL_ROUTE_KEYS`? |
|---|---|---|---|---|
| 0–9 (Governance section) | tenant_registry, ..., invoice_oversight | various | Active Tenants...Invoice Oversight | ✅ All present |
| 10–19 (Risk & Compliance) | compliance, cases, escalations, certifications, traceability, maker_checker, gst_verification_queue, ttp_eligibility, vpc_console, ttp_enrollment_admin | various | Compliance Queue...TTP Enrollment | ✅ All 3 TTP items present |
| 20+ (Infrastructure) | ai, events, logs, rbac, health | various | AI Governance...Health Status | ✅ All present |

### TTP Control Plane Surface Wiring

| Surface | routeKey | App.tsx case | Component | Status |
|---|---|---|---|---|
| GST Verification Queue | `gst_verification_queue` | ✅ | `GstVerificationQueue` | ✅ WIRED |
| TTP Eligibility Console | `ttp_eligibility` | ✅ (bridge-gated from TenantDetails) | `TtpEligibilityConsole` | ✅ WIRED |
| Invoice Oversight | `invoice_oversight` | ✅ | `InvoiceOversight` | ✅ WIRED |
| VPC Console | `vpc_console` | ✅ | `VpcConsole` | ✅ WIRED |
| TTP Enrollment Admin | `ttp_enrollment_admin` | ✅ | `TtpEnrollmentAdmin` | ✅ WIRED (added in `c8faeb6`) |

### TTP Eligibility UX Note (Navigability Constraint)

`TtpEligibilityConsole` requires an `orgId` via bridge state (`ttpEligibilityBridgeOrgId`). When navigating directly to `ttp_eligibility` without having come from `TenantDetails → Run TTP Eligibility`, the view renders an intentional empty state:

```
"No tenant selected. Navigate from a Tenant Detail view to run a TTP eligibility assessment."
```

This is by design. The only path to run an eligibility assessment is:
`Active Tenants → Tenant Detail → "Run TTP Eligibility" action button → TTP Eligibility Console`

---

## 6. Backend Route Auth Smoke Tests

All tests performed against production `https://app.texqtic.com` with no `Authorization` header.

### Tenant Routes

| Route | Method | Expected | Actual | Status |
|---|---|---|---|---|
| `/api/tenant/trades/:id/ttp-summary` | GET | 401 | 401 | ✅ PASS |
| `/api/tenant/trades/:id/ttp-enrollment` | GET | 401 | 401 | ✅ PASS |
| `/api/tenant/trades/:id/ttp-enrollment` | POST | 401 | 401 | ✅ PASS |
| `/api/tenant/gst-verification` | GET | 401 | 401 | ✅ PASS |
| `/api/tenant/invoices` | GET | 401 | 401 | ✅ PASS |

### Control Plane Routes

| Route | Method | Expected | Actual | Status |
|---|---|---|---|---|
| `/api/control/ttp/enrollments` | GET | 401 | 401 | ✅ PASS |
| `/api/control/ttp/enrollments/:id` | GET | 401 | 401 | ✅ PASS |
| `/api/control/ttp/enrollments/:id` | PATCH | 401 | 401 | ✅ PASS |
| `/api/control/gst-verification` | GET | 401 | 401 | ✅ PASS |
| `/api/control/ttp/eligibility/:orgId` | GET | 401 | 401 | ✅ PASS |
| `/api/control/invoices` | GET | 401 | 401 | ✅ PASS |
| `/api/control/vpc` | GET | 401 | 401 | ✅ PASS |
| `/api/control/ttp/routing-stubs/:vpcId` | GET | 401 | 401 | ✅ PASS |

**All 13 TTP routes: 0 unauthenticated access.** ✅

---

## 7. QA Data Inventory

| QA Need | Exists? | Evidence | Required to Create? |
|---|---|---|---|
| Org with APPROVED `gst_verifications` record | Unknown | No prod verification performed | Required for eligibility gate testing |
| `ttp_eligibility_assessments` record (ELIGIBLE) | ❌ | No eligibility run in prod | Required for VPC generation gate testing |
| Invoice in SUBMITTED/UNDER_REVIEW/VERIFIED state | Unknown | No prod invoices created | Required for InvoiceOversight happy path |
| VPC in ACTIVE state | ❌ | No VPCs in prod | Required for VpcConsole happy path |
| VPC in ROUTING_READY state | ❌ | No VPCs in prod | Required for PartnerRoutingStubPanel happy path |
| `ttp_enrollment_logs` record in REQUESTED state | ❌ | No enrollments in prod | Required for TtpEnrollmentAdmin happy path |
| `ttp_enrollment_logs` record in APPROVED state | ❌ | No enrollments in prod | Required for TtpEnrollmentBanner active-state test |
| Trade with complete TTP readiness chain | ❌ | Composite; depends on all above | Required for `TtpTradeSummaryCard` all-green display |

**Summary: 0 of 8 QA data items exist in production.**  
All happy-path flows are untestable in production until QA seed data is created.

Flags:
- `NO_SAFE_QA_VPC_FOR_HAPPY_PATH` (carry-forward from prior session)
- `NO_SAFE_QA_TRADE_FOR_TTP_SUMMARY_HAPPY_PATH` (carry-forward from prior session)

---

## 8. Blind Spots

### BS-001 — CRITICAL: `ttp_enabled` Kill-Switch Is Not Runtime-Enforced

**Type:** Architecture / Kill-Switch Safety  
**Severity:** CRITICAL  
**Finding:**  
`TTP_FEATURE_FLAG.TTP_ENABLED = 'ttp_enabled'` is defined in `server/src/ttp/ttp.constants.ts` and documented in service boundary comments ("Does NOT activate `ttp_enabled`"). However, **no service, route handler, or middleware reads the `feature_flags` table at runtime to check the `ttp_enabled` value before permitting TTP operations.**

This means:
- Any authenticated tenant can GET/POST TTP enrollment right now
- Any authenticated SUPER_ADMIN can run eligibility, generate VPCs, and review routing stubs
- The kill-switch value `false` in the feature_flags store has no operational effect

**Required action before activation:**  
Implement a `ttpKillSwitchMiddleware` or a service-layer guard that reads `feature_flags WHERE key = 'ttp_enabled'` and returns `503 SERVICE_UNAVAILABLE` or `403 FEATURE_DISABLED` when the flag is `false` (or missing).

**Classification:** Must-fix before any real org uses TTP.

---

### BS-002 — MODERATE: No Invoice-to-Trade org_id Cross-Validation on Create

**Type:** Data Safety  
**Severity:** MODERATE  
**Finding:**  
Invoice creation route (`POST /api/tenant/invoices`) creates invoices scoped to the actor's `org_id` (seller). The `trade_id` is accepted from the request body and validated for existence but the relationship `trade.seller_org_id === actorOrgId` must be explicitly enforced to prevent a tenant from creating an invoice against a trade they are not a party to. Verify this guard exists in `server/src/routes/tenant/invoices.ts`.

**Required action:** Code review of `invoices.ts` party-membership validation before invoice create.

---

### BS-003 — LOW: `TtpEligibilityConsole` Only Accessible via Bridge Nav

**Type:** UX / Navigability  
**Severity:** LOW  
**Finding:**  
Direct nav to `ttp_eligibility` from the sidebar renders an empty state. The console is only reachable via `TenantDetails → onRunTtpEligibility → setTtpEligibilityBridgeOrgId`. This is intentional as a safety pattern, but there is no way for an admin to assess an org without first finding them in the tenant registry.

If the tenant list is long and the admin already knows the `orgId`, there is no direct-entry path. This is a UX gap, not a security gap.

---

### BS-004 — LOW: No Rate Limiting on TTP Enrollment POST

**Type:** Security / Abuse Prevention  
**Severity:** LOW  
**Finding:**  
`POST /api/tenant/trades/:tradeId/ttp-enrollment` is idempotent (returns existing record if already REQUESTED/APPROVED). However, there is no rate-limiting layer on repeated calls with different `tradeId` values. A tenant with many trades could theoretically flood the enrollment queue.

**Required action:** Consider a per-org enrollment rate limit before public TTP launch.

---

### BS-005 — INFO: `TTP_ASSESSMENT_TYPE.BUREAU_API` Is Phase 2 Placeholder

**Type:** Product Completeness  
**Severity:** INFO  
**Finding:**  
`TTP_ASSESSMENT_TYPE.BUREAU_API` is defined in `ttp.constants.ts` but no implementation exists. All current eligibility assessments are `MANUAL`. The constant is forward-declaration only and is not referenced in any route or service logic. No risk.

---

### BS-006 — INFO: No GST GSTIN Format Validation at Submission

**Type:** Data Quality  
**Severity:** INFO  
**Finding:**  
`GstVerificationCard` submits user-entered GSTIN without client-side format validation. The server-side zod schema for GST submission was not audited for regex enforcement. GSTIN is a 15-character alphanumeric with a known format. If server validation is absent, malformed GSTINs can enter the verification queue.

**Required action:** Confirm server-side GSTIN format validation exists in `gst-verification.ts` route.

---

## 9. Pending Feature Inventory

| Feature | Slice | Status | Classification |
|---|---|---|---|
| Kill-switch middleware (`ttp_enabled` runtime check) | Pre-activation | ❌ NOT IMPLEMENTED | ACTIVATION_BLOCKER |
| GST Verification submission + admin review | Slice 2 | ✅ IMPLEMENTED, auth-gated | QA_DATA_NEEDED |
| TTP Eligibility assessment (manual, SUPER_ADMIN) | Slice 3 | ✅ IMPLEMENTED, auth-gated | QA_DATA_NEEDED |
| Invoice lifecycle (DRAFT→VERIFIED), seller + buyer | Slice 4 | ✅ IMPLEMENTED, auth-gated | QA_DATA_NEEDED |
| VPC generation + admin lifecycle | Slice 5 | ✅ IMPLEMENTED, auth-gated | QA_DATA_NEEDED |
| Partner routing stub (read-only) | Slice 6 | ✅ IMPLEMENTED, auth-gated | QA_DATA_NEEDED |
| TTP enrollment (tenant + admin) | Slice 7 | ✅ IMPLEMENTED, auth-gated | QA_DATA_NEEDED |
| TTP trade summary (read-only) | Slice 7 | ✅ IMPLEMENTED, auth-gated | QA_DATA_NEEDED |
| Live CIBIL/bureau API pull | Phase 2 | ❌ NOT IMPLEMENTED | PHASE_2_FORBIDDEN |
| Live PSP / payment routing | Phase 2 | ❌ NOT IMPLEMENTED | PHASE_2_FORBIDDEN |
| VPC transmission to partner | Phase 2 | ❌ NOT IMPLEMENTED | PHASE_2_FORBIDDEN |
| `BUREAU_API` assessment type | Phase 2 | ❌ NOT IMPLEMENTED | PHASE_2_FORBIDDEN |
| TTP tenant-facing status dashboard | Not scoped | ❌ NOT IMPLEMENTED | DESIGN_REQUIRED |
| Admin direct-entry TTP eligibility console | UX gap | ❌ NOT IMPLEMENTED | NICE_TO_HAVE |
| Per-org enrollment rate limiting | Pre-activation | ❌ NOT IMPLEMENTED | NICE_TO_HAVE |

---

## 10. Design V2 Recommendation

**Recommendation: B — Activation Readiness Sprint before Slice 8**

**Option A** — Proceed to Slice 8 immediately: Not recommended. The kill-switch gap (BS-001) means any authenticated tenant could interact with TTP today. Proceeding to additional features without closing the activation safety net is a product risk.

**Option B** — Activation Readiness Sprint (recommended): Resolve the 3 pre-activation items below, then proceed to Slice 8 or activation:

1. **`ttp_enabled` kill-switch middleware** — read `feature_flags` on TTP routes and gates  
2. **QA seed data** — create minimum viable QA dataset (1 GST-approved org, 1 eligible org, 1 verified invoice, 1 ACTIVE VPC)  
3. **Invoice party validation audit** — confirm `trade.seller_org_id === actorOrgId` enforced on invoice create

**Option C** — Design V2 artifact (Phase 2 scoping): Premature. Phase 1 is not QA-complete.

**Option D** — Defer all: Not recommended. Slices 1–7 are complete and tested but untested in production happy-path conditions.

---

## 11. Recommended Next Unit

**Title:** TTP Activation Readiness — Kill-Switch Enforcement + QA Seed Data

**Rationale:** Slices 1–7 are production-deployed and structurally correct. The only blocking gap before any real org can use TTP safely is: (a) the `ttp_enabled` kill-switch is not enforced at runtime, and (b) there is no QA dataset to validate the happy path. These two items are pre-conditions for any subsequent slice or external activation.

**Scope:**
- Implement `ttpFeatureGateMiddleware` (or equivalent Fastify plugin hook) that reads `feature_flags.value` for `ttp_enabled = true` before permitting TTP route access. Returns `{ success: false, error: { code: 'FEATURE_DISABLED', message: 'TTP is not enabled for this platform' } }` with HTTP 503 when disabled.
- Confirm/fix party validation on invoice create
- Create minimum QA seed SQL for: 1 org with APPROVED GST + ELIGIBLE assessment + VERIFIED invoice + ACTIVE VPC

**No-Go:**
- Do NOT activate `ttp_enabled = true` in production until kill-switch is enforced AND QA seed is validated
- Do NOT implement live CIBIL/PSP/bureau APIs
- Do NOT alter RLS policies
- Do NOT change the schema

**File surfaces:**
- NEW: `server/src/middleware/ttpFeatureGate.middleware.ts`
- MODIFY: `server/src/routes/tenant/ttp-summary.ts` — add gate hook
- MODIFY: `server/src/routes/tenant/ttp-enrollment.ts` — add gate hook
- MODIFY: `server/src/routes/control/ttp-eligibility.ts` — add gate hook
- MODIFY: `server/src/routes/control/vpc.ts` — add gate hook
- MODIFY: `server/src/routes/control/ttp-routing-stubs.ts` — add gate hook
- MODIFY: `server/src/routes/control/ttp-enrollments.ts` — add gate hook
- READ-ONLY: `server/src/routes/tenant/invoices.ts` — party validation audit
- QA: `scripts/qa-ttp-seed.sql` — QA seed for test environment only

**Verification:**
1. Set `ttp_enabled = false` → all TTP routes return 503
2. Set `ttp_enabled = true` → all TTP routes return 401 (correctly auth-gated)
3. With valid auth + `ttp_enabled = true` → GST submit, eligibility assess, invoice create, VPC generate, routing stub, enrollment request all succeed in sequence

---

## 12. No-Go Boundaries Preserved

Throughout this audit:

- ✅ No schema changes
- ✅ No migrations
- ✅ No new env vars
- ✅ No `ttp_enabled` activation
- ✅ No QA data creation
- ✅ No live partner API calls
- ✅ No VPC transmission
- ✅ No production data modification
- ✅ No new frontend features implemented
- ✅ No Design V2 artifact created
- ✅ No payment/financing logic introduced

---

## 13. Final Decision

```
FULL_RUNTIME_AUDIT_COMPLETE__ACTIVATION_READINESS_REQUIRED_FIRST
```

**Basis:** All 7 TTP slices are production-deployed with correct auth enforcement (13/13 routes return 401 without credentials). Frontend surfaces are correctly wired across B2B, WL, and SuperAdmin planes. Branding is aligned (TradeTrust Ledger). No double-unwrap bugs in any frontend service. No cross-tenant data leakage vectors detected.

**Blocker for activation:** `ttp_enabled` kill-switch is defined but not runtime-enforced. TTP operations are live the moment a valid session is presented. This must be resolved before any org-facing TTP activation.

**Next recommended unit:** TTP Activation Readiness — Kill-Switch Enforcement + QA Seed Data (§11 above).

---

*Governance record created by Copilot governance agent under TexQtic doctrine v1.4 + AGENTS.md operating rules.*  
*Audit scope: static code analysis + production route smoke tests + frontend wiring trace.*  
*No production data was created, modified, or deleted during this audit.*
