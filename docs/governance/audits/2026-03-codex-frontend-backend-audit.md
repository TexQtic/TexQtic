# TexQtic Audit Record
Source: Codex AI
Date: 2026-03
Mode: Read-only audit
Original location: Chat transcript

---

## 1. Audit scope

AGENTS.md was read first and this was executed as a strict read-only audit across tenant/control-plane frontend-backend wiring, focused on user-reachable flows and endpoint consumers.

## 2. High-level audit method

For each candidate flow, I traced: UI/view/component → hook/service/client → API request → backend route/handler → service/query/DB path, then checked inverse coverage (backend endpoint → frontend consumer existence).

## 3. Feature areas inspected

Seller/tenant dashboards, catalog/cart/checkout/orders, team/membership/admin, white-label settings/domains, control-plane governance (finance/compliance/disputes/flags/events/health), auth/login tenant resolution, and OpenAPI contract files.

## 4. High-confidence gaps

### Finding 4.1
**Feature area:** Control-plane tenant provisioning  
**Finding summary:** Frontend provisioning request/response contract does not match the active backend route contract.  
**Classification:** contract mismatch  
**Confidence:** high  
**Files inspected:** TenantRegistry.tsx, controlPlaneService.ts, tenantProvision.ts, index.ts, openapi.control-plane.json  
**Short end-to-end trace:** `TenantRegistry.handleProvision` → `provisionTenant('/api/control/tenants/provision', {name,slug,type,ownerEmail,ownerPassword})` → backend route expects `{orgName,primaryAdminEmail,primaryAdminPassword}` and returns `{orgId,slug,userId,membershipId}`.  
**Why it matters:** Provisioning is user-blocking; request validation will fail and frontend success parsing is incompatible even if accepted.  
**Recommended next safe action:** Run a narrow implementation prompt to align one canonical request/response shape across frontend service, backend route, and OpenAPI.

## 5. Backend-complete / frontend-pending flows

### Finding 5.1
**Feature area:** Control-plane finance/compliance/dispute actions  
**Finding summary:** Backend POST action endpoints exist, but frontend has read-only lists with no action wiring.  
**Classification:** frontend pending / backend complete  
**Confidence:** high  
**Files inspected:** control.ts, openapi.control-plane.json, controlPlaneService.ts, FinanceOps.tsx, ComplianceQueue.tsx, DisputeCases.tsx  
**Short end-to-end trace:** UI panels → GET-only service methods → backend also exposes approve/reject/resolve/escalate POST routes requiring idempotency headers → no frontend trigger.  
**Why it matters:** Governance operations are backend-ready but unusable from UI.  
**Recommended next safe action:** Add minimal frontend service methods + action buttons for one domain first (finance or compliance), including idempotency-key handling.

### Finding 5.2
**Feature area:** Tenant advanced operational flows (trades/escrow/settlement/certifications/escalations/traceability)  
**Finding summary:** Route plugins are registered and implemented; no frontend consumers found.  
**Classification:** frontend pending / backend complete  
**Confidence:** high  
**Files inspected:** tenant.ts, trades.g017.ts, escrow.g018.ts, settlement.ts, certifications.g019.ts, escalation.g022.ts  
**Short end-to-end trace:** backend tenant routes exist → no corresponding frontend service/API calls under components/ or services/ for these prefixes.  
**Why it matters:** Significant backend-delivered capability is not reachable by tenant users.  
**Recommended next safe action:** Pick one flow and add a thin frontend consumer path (read/list first, then mutation).

### Finding 5.3
**Feature area:** Control-plane marketplace cart summaries  
**Finding summary:** Service methods and backend endpoints exist; no UI consumer found.  
**Classification:** frontend pending / backend complete  
**Confidence:** high  
**Files inspected:** controlPlaneService.ts, admin-cart-summaries.ts, openapi.control-plane.json  
**Short end-to-end trace:** service exposes `getCartSummaries`/`getCartSummaryByCartId` → backend routes implemented → no component imports those methods.  
**Why it matters:** Ops observability flow is implemented server-side but absent in UI.  
**Recommended next safe action:** Add a narrow read-only panel using existing methods.

## 6. Broken wiring / unreachable UI flows

### Finding 6.1
**Feature area:** WL admin staff invite flow  
**Finding summary:** Clicking Invite from WL admin staff moves user into EXPERIENCE-shell invite path, not WL-admin scoped flow.  
**Classification:** broken wiring / unreachable flow  
**Confidence:** medium-high  
**Files inspected:** App.tsx, TeamManagement.tsx, Shells.tsx  
**Short end-to-end trace:** WL admin STAFF → `TeamManagement.onInvite` → `setAppState('INVITE_MEMBER')` → INVITE_MEMBER renders via EXPERIENCE shell branch.  
**Why it matters:** Context jump can strand admin in the wrong shell and break expected back-office flow continuity.  
**Recommended next safe action:** Introduce WL-admin scoped invite state/path.

### Finding 6.2
**Feature area:** Team Management access editing  
**Finding summary:** Edit Access button has no handler and no corresponding update route found in inspected membership path.  
**Classification:** missing implementation  
**Confidence:** high  
**Files inspected:** TeamManagement.tsx, tenantService.ts, tenant.ts  
**Short end-to-end trace:** UI button → no client method → no inspected backend PATCH/PUT membership update route.  
**Why it matters:** Visible non-functional control in a core admin surface.  
**Recommended next safe action:** Decide product intent (implement role update or remove/disable UI affordance).

### Finding 6.3
**Feature area:** White-label settings custom domain card  
**Finding summary:** Domain input/Connect button are non-wired in settings view, while real domain CRUD exists in another panel.  
**Classification:** broken wiring / unreachable flow  
**Confidence:** high  
**Files inspected:** WhiteLabelSettings.tsx, WLDomainsPanel.tsx, tenant.ts  
**Short end-to-end trace:** settings UI domain controls → no state/service call → actual API wiring lives in WL admin domains panel.  
**Why it matters:** Misleading UI duplicates a real feature but does nothing.  
**Recommended next safe action:** Either wire settings controls to existing domain API or route users explicitly to Domains panel.

## 7. Contract mismatches

### Finding 7.1
**Feature area:** Tenant API contract coverage  
**Finding summary:** openapi.tenant.json does not include multiple actively used tenant endpoints (checkout, orders, orders/:id/status, domains, dpp, etc.).  
**Classification:** contract mismatch  
**Confidence:** high  
**Files inspected:** openapi.tenant.json, cartService.ts, EXPOrdersPanel.tsx, WLDomainsPanel.tsx, DPPPassport.tsx, tenant.ts  
**Short end-to-end trace:** frontend/route usage exists → OpenAPI path entries absent.  
**Why it matters:** Contract governance and external integration tooling are out of sync with reality.  
**Recommended next safe action:** Update tenant OpenAPI to match implemented/consumed endpoints.

### Finding 7.2
**Feature area:** Control-plane API contract coverage  
**Finding summary:** openapi.control-plane.json omits active GET endpoints (/finance/payouts, /compliance/requests, /disputes, /system/health, /whoami) and impersonation routes used by frontend.  
**Classification:** contract mismatch  
**Confidence:** high  
**Files inspected:** openapi.control-plane.json, control.ts, controlPlaneService.ts, App.tsx, index.ts  
**Short end-to-end trace:** frontend and backend implement endpoints → contract file incomplete.  
**Why it matters:** Documented contract is not trustworthy for clients, QA, or governance checks.  
**Recommended next safe action:** Add missing control-plane paths with accurate response/status/header requirements.

## 8. Auth / tenancy-sensitive findings

### Finding 8.1
**Feature area:** Tenant order transitions in EXPERIENCE shell  
**Finding summary:** UI exposes status transition actions broadly; backend enforces OWNER/ADMIN gate.  
**Classification:** auth / authorization mismatch  
**Confidence:** medium  
**Files inspected:** EXPOrdersPanel.tsx, tenant.ts  
**Short end-to-end trace:** action buttons displayed → PATCH /api/tenant/orders/:id/status → 403 for disallowed roles.  
**Why it matters:** Non-admin tenant users can hit predictable forbidden actions and experience confusing failures.  
**Recommended next safe action:** Gate action rendering using role from authenticated context.

### Finding 8.2
**Feature area:** Tenant scoping posture in route implementations  
**Finding summary:** Multiple tenant routes explicitly removed manual tenant filters and rely on RLS-only for boundary enforcement.  
**Classification:** tenancy-sensitive risk  
**Confidence:** medium  
**Files inspected:** tenant.ts  
**Short end-to-end trace:** route handler → query with no explicit tenant where-clause → relies on withDbContext/RLS context.  
**Why it matters:** Not a confirmed leak, but this is a defense-in-depth posture decision that should stay explicitly governed.  
**Recommended next safe action:** Governance clarification on where explicit app-layer org_id filters are mandatory vs optional under RLS.

## 9. Product-incomplete or intentionally stubbed areas

### Finding 9.1
**Feature area:** WL admin/product surfaces and control-plane architecture pages  
**Finding summary:** Multiple panels are explicitly placeholder/skeleton content with non-functional buttons.  
**Classification:** product-defined stub / intentional incompleteness  
**Confidence:** high  
**Files inspected:** WLStubPanel.tsx, ApiDocs.tsx, BackendSkeleton.tsx, DataModel.tsx, MiddlewareScaffold.tsx, TenantDetails.tsx  
**Short end-to-end trace:** nav-accessible UI → static/demo content → no backend call path.  
**Why it matters:** Expected non-breaking incompleteness, but should be labeled in-product to avoid confusion.  
**Recommended next safe action:** Keep explicit "read-only/skeleton" labeling until replaced.

### Finding 9.2
**Feature area:** Tenant login tenant selection  
**Finding summary:** Tenant picker uses hardcoded seeded tenants pending a missing public resolver endpoint.  
**Classification:** missing implementation (backend) + product-defined frontend stub  
**Confidence:** high  
**Files inspected:** AuthFlows.tsx, auth.ts  
**Short end-to-end trace:** auth form → seeded tenant IDs → login call; TODO references non-existent `/api/public/tenants/resolve`.  
**Why it matters:** Real tenant discovery is not wired; portability beyond seeded IDs is limited.  
**Recommended next safe action:** Add narrow resolver endpoint + replace seeded select with dynamic resolve.

## 10. Uncertain findings needing narrower verification

**Feature area:** B2B quote CTA.  
**Conclusion:** uncertain.  
**Evidence:** App.tsx B2BAddToCartButton renders "Request Quote" without handler; no clearly mapped quote endpoint in inspected frontend services.  
**Confidence:** low-medium.  
**Note on why:** Could be intentional product gating, not necessarily broken wiring.

**Feature area:** Advanced tenant route backlog intent.  
**Conclusion:** uncertain.  
**Evidence:** Backend routes are present and tested; frontend has no consumers.  
**Confidence:** medium.  
**Note on why:** Could be intentional backend-first delivery per roadmap.

## 11. Priority-ranked next actions

1. **Runtime-breaking/user-blocking:** fix tenant provisioning contract alignment end-to-end (TenantRegistry ↔ controlPlaneService ↔ tenantProvision route ↔ OpenAPI).
2. **Backend-complete/frontend-missing:** implement one control-plane action flow (approve/reject) with idempotency header support.
3. **Dead-button/unreachable-flow:** repair WL admin invite path context and remove or wire non-functional buttons (Edit Access, settings-domain Connect).
4. **Auth/tenancy blocker:** role-gate tenant order transition actions in UI before PATCH attempts.
5. **Contract governance:** synchronize openapi.tenant.json and openapi.control-plane.json with currently implemented/consumed endpoints.
6. **Narrow verification:** confirm intended product scope for B2B quote CTA and advanced tenant module rollout sequencing.

## 12. No-change confirmation

AGENTS.md was read first.  
No files were modified (`git status --short` returned clean).  
No patches were generated.  
**READ-ONLY AUDIT — NO COMMIT.**
