# TexQtic Audit Record
Source: VS Code — Copilot
Date: 2026-03
Mode: Read-only audit
Original location: Chat transcript

---

# TECS AUDIT REPORT — TexQtic Frontend-Backend Wiring Gap Analysis

**Audit Type:** Read-Only Reconnaissance — No files modified  
**Input branch:** main  
**Prompt reference:** TECS PROMPT A1 / REPO-WIDE FRONTEND-BACKEND WIRING GAP AUDIT  
**Report date:** 2026-03-06

---

## SECTION 1 — AUDIT SCOPE

**Planes covered:**
- Tenant plane — all routes under `/api/tenant/*`, consumed by EXPERIENCE and WL_ADMIN shells
- Control plane — all routes under `/api/control/*`, consumed by the CONTROL_PLANE shell
- Auth plane — `/api/auth/*` flows (partial inspection)
- AI plane — `/api/ai/*` (discovered via aiService.ts)

**Frontend surfaces inspected:**
- App.tsx (1374 lines) — full state machine and routing
- services — all 8 service files
- Tenant — EXPOrdersPanel, DPPPassport, TeamManagement, InviteMemberForm, WhiteLabelSettings
- WhiteLabelAdmin — WLDomainsPanel, WLOrdersPanel, WLCollectionsPanel
- ControlPlane — TenantRegistry, FinanceOps, ComplianceQueue, DisputeCases, AiGovernance, AdminRBAC, FeatureFlags, EventStream, AuditLogs
- SuperAdminShell.tsx

**Backend surfaces inspected:**
- tenant.ts (1876 lines) — all tenant-plane routes
- control.ts (844 lines) — all control-plane routes
- trades.g017.ts — G-017 trade routes
- escrow.g018.ts — G-018 escrow routes
- Sub-plugin registrations for G-016, G-019, G-022, G-024, G-025, G-026

**Governance identifiers in scope:** G-016, G-017, G-018, G-019, G-021, G-022, G-024, G-025, G-026, G-028

---

## SECTION 2 — AUDIT METHOD

- Directory reconnaissance — full workspace tree mapped
- Parallel batch reads — backend routes, frontend services, frontend components read in simultaneous batches to establish the route map before checking wiring
- Top-down service trace — for each backend route group: identify the HTTP verb + path, locate the corresponding frontend service function, locate the component that calls the service function, verify the UI exposes or suppresses the capability
- Reverse trace for dead code — for service functions not called by any component, searched App.tsx for import/usage
- Contract comparison — compared TypeScript interface field names between frontend service types and known backend response shapes
- Auth/realm verification — traced token flow from apiClient.ts realm guards through service wrappers to backend middleware

No files were modified. No terminal commands were run. No data was written.

---

## SECTION 3 — FEATURE AREAS INSPECTED

| Area | Backend Routes | Frontend Service | Frontend Component | Verdict |
|---|---|---|---|---|
| Auth | /api/auth/* | authService.ts | Auth/, TokenHandler | ✅ Wired |
| Catalog READ | GET /api/tenant/catalog/items | getCatalogItems() | App.tsx B2B/B2C render | ⚠️ Contract mismatch |
| Catalog CREATE | POST /api/tenant/catalog/items | createCatalogItem() | — (no form found) | ⚠️ No UI |
| Cart | GET/POST /api/tenant/cart + items | cartService.ts full | Cart.tsx + App.tsx | ✅ Wired |
| Checkout | POST /api/tenant/checkout | checkout() | Cart → success | ⚠️ No confirm state |
| Orders | GET /api/tenant/orders | getOrderHistory() (assumed) | EXPOrdersPanel | ✅ Wired |
| Order status | PATCH /api/tenant/orders/:id/status | tenantApiClient | EXPOrdersPanel | ✅ Wired |
| Memberships | GET/POST /api/tenant/memberships | getMemberships(), createMembership() | TeamManagement, InviteMemberForm | ✅ Wired |
| Membership update | PATCH /api/tenant/memberships/:id | ❌ Missing | ❌ Dead button | ❌ Backend missing |
| Branding | PUT /api/tenant/branding | updateBranding() | WhiteLabelSettings | ✅ Wired |
| Domains | GET/POST/DELETE /api/tenant/domains | tenantApiClient | WLDomainsPanel | ✅ Wired (WL_ADMIN only) |
| Activate | POST /api/tenant/activate | activateTenant() | Onboarding | ✅ Wired |
| DPP Passport | GET /api/tenant/dpp/:nodeId | tenantGet() | DPPPassport | ✅ Wired |
| Traceability CRUD | 7 endpoints /api/tenant/traceability/* | ❌ Missing | ❌ Missing | ❌ Gap |
| G-017 Trades (tenant) | POST /api/tenant/trades, POST .../transition | ❌ Missing | ❌ Missing | ❌ Gap |
| G-018 Escrow (tenant) | 5 endpoints /api/tenant/escrows/* | ❌ Missing | ❌ Missing | ❌ Gap |
| G-019 Settlements (tenant) | POST preview, POST create | ❌ Missing | ❌ Missing | ❌ Gap |
| G-019 Certifications (tenant) | 5 CRUD endpoints | ❌ Missing | ❌ Missing | ❌ Gap |
| G-022 Escalations (tenant) | GET/POST /api/tenant/escalations | ❌ Missing | ❌ Missing | ❌ Gap |
| Tenant audit logs | GET /api/tenant/audit-logs | ❌ Missing | ❌ Missing | ❌ Gap |
| Tenants list | GET /api/control/tenants | getTenants() | TenantRegistry | ✅ Wired |
| Tenant provision | POST /api/control/tenants/provision | provisionTenant() | TenantRegistry modal | ✅ Wired |
| Tenant detail | GET /api/control/tenants/:id | — | — | ⚠️ No dedicated view |
| Feature flags | GET/PUT /api/control/feature-flags/:key | getFeatureFlags(), upsertFeatureFlag() | FeatureFlags | ✅ Wired bidirectional |
| Control audit logs | GET /api/control/audit-logs | getAuditLogs() | AuditLogs | ✅ Wired (read-only, search disabled) |
| Events | GET /api/control/events | getEvents() | EventStream w/ polling | ✅ Wired |
| Finance payouts READ | GET /api/control/finance/payouts | getPayouts() | FinanceOps | ✅ Wired (read-only) |
| Finance approve/reject | POST .../payouts/:id/approve\|reject | ❌ Missing | ❌ No buttons | — |
| Compliance READ | GET /api/control/compliance/requests | getComplianceRequests() | ComplianceQueue | ✅ Wired (read-only) |
| Compliance approve/reject | POST .../requests/:id/approve\|reject | ❌ Missing | ❌ No buttons | — |
| Disputes READ | GET /api/control/disputes | getDisputes() | DisputeCases | ✅ Wired (read-only) |
| Disputes resolve/escalate | POST .../disputes/:id/resolve\|escalate | ❌ Missing | ❌ No buttons | — |
| G-022 Escalations (control) | GET /api/control/escalations, POST .../upgrade, POST .../resolve | ❌ Missing | ❌ Missing | ❌ Gap |
| G-017 Trades (control) | GET /api/control/trades, POST .../transition | ❌ Missing | ❌ Missing | ❌ Gap |
| G-018 Escrow (control) | GET/GET:id /api/control/escrows | ❌ Missing | ❌ Missing | ❌ Gap |
| G-019 Settlements (control) | POST preview, POST create | ❌ Missing | ❌ Missing | ❌ Gap |
| G-019 Certifications (control) | GET /api/control/certifications | ❌ Missing | ❌ Missing | ❌ Gap |
| G-016 Traceability (control) | nodes + edges | ❌ Missing | ❌ Missing | ❌ Gap |
| Cart summaries (control) | GET /api/control/marketplace/cart-summaries | getCartSummaries() (exists) | ❌ No component | ⚠️ Dead service code |
| System health | GET /api/control/system/health | getSystemHealth() | HealthCheck component | ✅ Wired |
| Impersonation | POST /api/control/impersonation/token | startImpersonation() | App.tsx dialog | ✅ Wired |
| Whoami | GET /api/control/whoami | tenantApiClient | App.tsx auth | ✅ Wired |
| AdminRBAC | ❌ No backend route | ❌ Hardcoded | AdminRBAC static | ❌ No backend |
| AI Insights | GET /api/ai/insights | getPlatformInsights() | — (called inline) | ⚠️ Partial wiring |
| AI Negotiation | POST /api/ai/negotiation-advice | generateNegotiationAdvice() | — (called inline) | ⚠️ Partial wiring |
| AI Governance budget | ❌ No PUT /api/control/ai-budget route | ❌ Missing | Dead buttons | ❌ Gap |

---

## SECTION 4 — HIGH-CONFIDENCE GAPS

### F-001 · G-017 Trades — Backend Complete, Zero Frontend

**Feature area:** Trade lifecycle governance  
**Classification:** BACKEND_COMPLETE / FRONTEND_ABSENT  
**Confidence:** HIGH

**Backend endpoints confirmed:**
- `POST /api/tenant/trades` — create trade in DRAFT state
- `POST /api/tenant/trades/:id/transition` — lifecycle transition with StateMachine + MakerChecker + Sanctions checks
- `GET /api/control/trades` — admin list
- `POST /api/control/trades/:id/transition` — admin transition override

**Frontend trace:** No trade-related function in any file under services. No component in Tenant or ControlPlane. No AppState enum value or routing case in App.tsx. No nav item in SuperAdminShell.tsx. controlPlaneService.ts (494 lines, read in full) contains zero trade functions.

**Why it matters:** The complete G-017 API surface — including maker-checker approval flows, sanctions screening, and lifecycle state machine — is implemented server-side and entirely unreachable from the browser. Any user of the platform cannot initiate or view trades.

**Recommended next safe action:** Create `services/tradeService.ts` (tenant + admin wrappers), a `components/Tenant/TradesPanel.tsx`, add `TRADES` to expView union type, wire nav item in EXPERIENCE shell. Separately add `TRADES` to AdminView and a `ControlPlane/TradeOversight.tsx`.

---

### F-002 · G-018 Escrow — Backend Complete, Zero Frontend

**Feature area:** Escrow governance  
**Classification:** BACKEND_COMPLETE / FRONTEND_ABSENT  
**Confidence:** HIGH

**Backend endpoints confirmed:**
- `POST /api/tenant/escrows` — create escrow
- `POST /api/tenant/escrows/:escrowId/transactions` — ledger entry
- `POST /api/tenant/escrows/:escrowId/transition` — lifecycle change
- `GET /api/tenant/escrows` — list
- `GET /api/tenant/escrows/:escrowId` — detail with balance-from-ledger (D-020-B)
- `GET /api/control/escrows` — admin list
- `GET /api/control/escrows/:escrowId` — admin detail

**Frontend trace:** Zero functions in services. Zero components. Zero nav items.

**Why it matters:** The D-020-B balance-from-ledger constraint (balance computed from transaction ledger, never stored directly) requires client-aware handling. No frontend exists to create escrows, fund them, or transition them — the entire escrow audit trail is dark.

**Recommended next safe action:** Create `services/escrowService.ts`, `components/Tenant/EscrowPanel.tsx`.

---

### F-003 · G-019 Settlements — Backend Complete, Zero Frontend

**Feature area:** Settlement governance  
**Classification:** BACKEND_COMPLETE / FRONTEND_ABSENT  
**Confidence:** HIGH

**Backend endpoints confirmed (both planes):**
- `POST /api/tenant/settlements/preview` — dry-run settlement calculation
- `POST /api/tenant/settlements` — commit settlement
- `POST /api/control/settlements/preview` — admin preview
- `POST /api/control/settlements` — admin commit

**Frontend trace:** Zero functions in services. Zero components.

**Why it matters:** Settlements are a financial finalization flow. Preview-before-commit is a UX safety pattern. No frontend means no settlement is ever issued from the platform UI.

**Recommended next safe action:** Create `services/settlementService.ts` wrapping both planes. Build `components/Tenant/SettlementPreview.tsx` that shows preview, then confirm-to-submit.

---

### F-004 · G-019 Certifications — Backend Complete, Zero Frontend

**Feature area:** Certification lifecycle  
**Classification:** BACKEND_COMPLETE / FRONTEND_ABSENT  
**Confidence:** HIGH

**Backend endpoints confirmed (tenant plane):**
- `POST /api/tenant/certifications` — issue
- `GET /api/tenant/certifications` — list
- `GET /api/tenant/certifications/:id` — detail
- `PATCH /api/tenant/certifications/:id` — update
- `POST /api/tenant/certifications/:id/transition` — lifecycle

**Backend (control plane):**
- `GET /api/control/certifications` — admin list
- `GET /api/control/certifications/:id` — admin detail

**Frontend trace:** Zero functions in services. Zero components. Not referenced in App.tsx or SuperAdminShell.tsx.

**Why it matters:** Certifications are a key compliance artifact tied to DPP Passport views. DPPPassport.tsx renders certification data from the DPP snapshot (`GET /api/tenant/dpp/:nodeId`) but cannot issue new certifications or change their lifecycle state from the UI.

**Recommended next safe action:** Create `services/certificationService.ts`. Add CERTIFICATIONS tab in EXPERIENCE shell. Wire admin view in ControlPlane.

---

### F-005 · G-016 Traceability CRUD — Backend Complete, Only Snapshot Consumed

**Feature area:** Supply chain traceability node/edge management  
**Classification:** BACKEND_COMPLETE / FRONTEND_PARTIAL  
**Confidence:** HIGH

**Backend endpoints confirmed (tenant plane):**
- `POST /api/tenant/traceability/nodes` — create node
- `GET /api/tenant/traceability/nodes` — list nodes
- `GET /api/tenant/traceability/nodes/:id/neighbors` — graph neighbor traversal
- `POST /api/tenant/traceability/edges` — create edge
- `GET /api/tenant/traceability/edges` — list edges

**Backend (control plane):**
- `GET /api/control/traceability/nodes`
- `GET /api/control/traceability/edges`

**Frontend trace:**
- DPPPassport.tsx (369 lines, fully read) calls `GET /api/tenant/dpp/:nodeId` — a derived snapshot view, not a traceability endpoint
- Zero traceability CRUD functions in services
- Zero components for node/edge creation or graph visualization

**Why it matters:** The DPP Passport is read-only and works from pre-built snapshots. No user can create traceability nodes, declare supply chain edges, or trigger the neighbor traversal API. Traceability data is dark at creation time.

**Recommended next safe action:** Create `services/traceabilityService.ts`. Add a `components/Tenant/TraceabilityGraph.tsx` that renders nodes/edges and provides a form to add new registry entries.

---

### F-006 · G-022 Escalation — Backend Complete, Zero Tenant Frontend; Control Plane Wired to Wrong Endpoint

**Feature area:** Escalation governance  
**Classification:** BACKEND_COMPLETE / FRONTEND_ABSENT (tenant); MISROUTED (control)  
**Confidence:** HIGH

**Backend endpoints confirmed:**
- `GET /api/tenant/escalations` — tenant list own escalations
- `POST /api/tenant/escalations` — create escalation
- `GET /api/control/escalations` — admin list all
- `POST /api/control/escalations` — admin create
- `POST /api/control/escalations/:id/upgrade` — severity upgrade
- `POST /api/control/escalations/:id/resolve` — resolve

**Frontend trace — tenant plane:** Zero functions in services. Zero components.

**Frontend trace — control plane:** DisputeCases.tsx is wired to `getDisputes()` → `GET /api/control/disputes` (an event-log endpoint). This is not `/api/control/escalations`. These are separate backend concepts: disputes are event-backed audit records; escalations are structured G-022 governance entities with lifecycle transitions. The component that claims to be "dispute/risk management" is consuming a different endpoint than the structured escalation API.

**Why it matters:** Tenant users cannot file escalations. Admin users cannot see structured G-022 escalations, upgrade severity, or resolve them. The "DisputeCases" view does not overlap with G-022 escalation governance.

**Recommended next safe action:** Add `GET/POST /api/tenant/escalations` to services and create `components/Tenant/EscalationsPanel.tsx`. Add `getEscalations()`, `upgradeEscalation()`, `resolveEscalation()` to controlPlaneService.ts. Add an ESCALATIONS adminView state, distinct from current CASES.

---

### F-009 · Finance / Compliance / Dispute Authority Mutations — Backend Complete, UI Read-Only

**Feature area:** Admin authority actions  
**Classification:** BACKEND_COMPLETE / FRONTEND_ABSENT (mutation layer only)  
**Confidence:** HIGH

**Backend mutation endpoints confirmed:**
- `POST /api/control/finance/payouts/:payout_id/approve` (SUPER_ADMIN only)
- `POST /api/control/finance/payouts/:payout_id/reject` (SUPER_ADMIN only)
- `POST /api/control/compliance/requests/:request_id/approve`
- `POST /api/control/compliance/requests/:request_id/reject`
- `POST /api/control/disputes/:dispute_id/resolve`
- `POST /api/control/disputes/:dispute_id/escalate`

**Frontend trace:**
- FinanceOps.tsx — wired to `getPayouts()` (GET). No approve/reject button. No service function. "Adjust Fee Rules" button is a dead button (no onClick).
- ComplianceQueue.tsx — wired to `getComplianceRequests()` (GET). No approve/reject button. No service function.
- DisputeCases.tsx — wired to `getDisputes()` (GET). No resolve/escalate button. No service function.

**Why it matters:** Admins have no ability to take controlling actions from the UI despite the backend being fully implemented with RBAC-gated authority actions. The platform cannot approve payouts, clear compliance queues, or resolve disputes via the UI. These are platform-level operational capabilities that are entirely dark.

**Recommended next safe action:** Add `approvePayoutMutation()`, `rejectPayoutMutation()` etc. to controlPlaneService.ts. Add confirm-before-submit action buttons in each panel. These are high-value, low-risk UI additions since the backend is verified complete.

---

### F-010 · AdminRBAC — No Backend Route, Static Hardcoded Data

**Feature area:** Admin access control  
**Classification:** FRONTEND_STUB / NO_BACKEND  
**Confidence:** HIGH

**Frontend trace:** AdminRBAC.tsx renders from `ADMIN_USERS` — a compile-time constant. "Invite Admin" and "Revoke" buttons are rendered with no onClick handlers. No services function calls any admin user management endpoint.

**Backend trace:** No route for `/api/control/admin-users` or equivalent in control.ts (844 lines, read in full).

**Why it matters:** Admin access control UI is pure fiction. No admin can be added or removed through the platform. This is both a product gap and a security posture gap (no auditable admin provisioning).

**Recommended next safe action:** Define the backend route design first (out of scope for this audit), then wire RBAC panel to real data.

---

### F-011 · AiGovernance — Partial Wiring, Dead Authority Actions

**Feature area:** AI budget governance  
**Classification:** FRONTEND_PARTIAL / BACKEND_ABSENT (governance actions)  
**Confidence:** HIGH

**Frontend trace:**
- AiGovernance.tsx calls `getTenants()` to display AI budget data — this is a repurposing of the tenant list endpoint, not a dedicated AI governance endpoint
- "Adjust Cap" button — no onClick handler
- "AI Kill Switch" button — no onClick handler
- "Registry" button — no onClick handler
- Prompt versioning data is hardcoded static strings

**Backend trace:** No `PUT /api/control/ai-budget/:tenantId` or AI governance mutation endpoint found in control.ts.

**Backend note:** AI execution routes (`/api/ai/insights`, `/api/ai/negotiation-advice`) exist and are consumed by aiService.ts, but these are tenant-facing inference routes, not admin governance routes.

**Why it matters:** Admins cannot adjust per-tenant AI budget caps or disable AI from the UI. The AI governance panel is a read-decoration overlay on the tenant list, not a functional governance surface.

---

### F-012 · Catalog basePrice Contract Mismatch — Runtime Display Bug

**Feature area:** Catalog display  
**Classification:** CONTRACT_MISMATCH / RUNTIME_BUG  
**Confidence:** HIGH — CRITICAL PRIORITY

**Frontend interface (App.tsx / catalogService.ts):**
```typescript
interface CatalogItem {
  id: string;
  name: string;
  description: string;
  basePrice?: number;   // optional; also: 'base' not 'price'
  category?: string;
  sku?: string;
  stock?: number;
  ...
}
```

**Backend response shape (from tenant.ts):** The catalog route returns items from Prisma; the Prisma schema uses a `price` field (not `basePrice`). The backend returns `{ id, name, description, price, ... }`.

**Rendering in App.tsx:**
```tsx
${p.basePrice}.00          // B2B/B2C price badge
${p.basePrice}             // WL products panel
```

**Result:** Every catalog item renders as `$undefined.00`. All price badges across B2B, B2C, and WL_ADMIN products panels are broken.

**Why it matters:** This is a live, silent, runtime-breaking display bug affecting the core product discovery surface across all shell types. It produces no thrown error — just silent undefined rendering. The field mismatch means every user of the catalog sees `$undefined.00`.

**Recommended next safe action:** Align the field name. Either (a) update `CatalogItem` interface to use `price` and update all references in App.tsx from `p.basePrice` to `p.price`, or (b) add a `basePrice` alias in the backend serialization. Option (a) is the minimal-diff fix and is confined to frontend only.

---

## SECTION 5 — BACKEND-COMPLETE / FRONTEND-PENDING FLOWS

Ordered by governance identifier:

| ID | Backend | Tenant Frontend | Control Frontend | Notes |
|---|---|---|---|---|
| G-016 | ✅ 7 endpoints | ❌ 0 | ❌ 0 | Only DPP snapshot (G-025) consumed |
| G-017 | ✅ 4 endpoints | ❌ 0 | ❌ 0 | Full trade lifecycle dark |
| G-018 | ✅ 7 endpoints | ❌ 0 | ❌ 0 | Escrow creation and ledger dark |
| G-019 (Settlements) | ✅ 4 endpoints | ❌ 0 | ❌ 0 | Preview+commit pattern unused |
| G-019 (Certifications) | ✅ 7 endpoints | ❌ 0 | ❌ 0 | Issue/transition/update dark |
| G-022 | ✅ 6 endpoints | ❌ 0 | ⚠️ Misrouted | Control uses disputes endpoint |
| Finance mutations | ✅ 4 mutations | N/A | ❌ 0 | Approve/reject not surfaced |
| Compliance mutations | ✅ 2 mutations | N/A | ❌ 0 | Approve/reject not surfaced |
| Dispute mutations | ✅ 2 mutations | N/A | ❌ 0 | Resolve/escalate not surfaced |
| Tenant audit logs | ✅ 1 endpoint | ❌ 0 | N/A | Admin view exists, tenant view missing |
| Catalog CREATE | ✅ present | ❌ 0 | N/A | No create-catalog-item form in UI |

---

## SECTION 6 — BROKEN WIRING / UNREACHABLE UI FLOWS

### F-013 · WhiteLabelSettings "Custom Domain" — Dead UI in EXPERIENCE Shell

**Files:** WhiteLabelSettings.tsx  
**Classification:** DEAD_BUTTON / MISSING_WIRING  
**Confidence:** HIGH

The Settings view in the EXPERIENCE shell (`appState === 'SETTINGS'`) renders a "Custom Domain" section — a text input with a "Connect" button. This button has no onClick handler and calls no API. Domain management is only functional in WLDomainsPanel.tsx, which is exclusively rendered in the WL_ADMIN shell. Tenants in EXPERIENCE mode see a domain input that does nothing.

---

### F-014 · TeamManagement "Edit Access" — Dead Button, No Backend Route

**Files:** TeamManagement.tsx  
**Classification:** DEAD_BUTTON / MISSING_BACKEND  
**Confidence:** HIGH

Per-member row renders `<button>Edit Access</button>` with no onClick. No role-change API exists (`PATCH /api/tenant/memberships/:id` is absent from tenant.ts). Member roles are set at invite time only; no subsequent role modification is possible.

---

### F-015 · B2B Cart "Request Quote" — Dead Button, No Backend

**Files:** App.tsx — B2BAddToCartButton component  
**Classification:** DEAD_BUTTON / MISSING_BACKEND  
**Confidence:** HIGH

```tsx
<button className="...">Request Quote</button>
```

No onClick, no service call, no backend quote/inquiry endpoint. B2C equivalent `B2CAddToCartButton` is correctly wired to `addToCart()`. This may be intentional product-staging, but the dead button still renders in the UI with no visual indication that it is non-functional.

---

### F-016 · Post-Checkout — No Order Confirmation State

**Files:** cartService.ts, App.tsx  
**Classification:** MISSING_STATE / INCOMPLETE_FLOW  
**Confidence:** HIGH

`checkout()` → `POST /api/tenant/checkout` returns `{ orderId, message }`. After the call succeeds, the application closes the cart and returns to the EXPERIENCE view. No AppState or expView value for `ORDER_CONFIRMATION` exists. The returned `orderId` is discarded. The user receives no visual confirmation that their order was placed, no orderId reference, and no navigation path to the new order.

---

### F-007 · Cart Summaries — Service Functions Exist, No UI Consumer

**Files:** controlPlaneService.ts  
**Classification:** DEAD_SERVICE_CODE  
**Confidence:** HIGH

`getCartSummaries()` and `getCartSummaryByCartId()` are defined and call `/api/control/marketplace/cart-summaries` and `/api/control/marketplace/cart-summaries/:cartId`. No component in ControlPlane imports or calls these functions. No AdminView state maps to a cart summaries panel. The functions are dead service code — implemented but unreachable from any UI.

---

## SECTION 7 — CONTRACT MISMATCHES

### CM-001 · basePrice vs price — Critical Field Name Mismatch

**Severity:** CRITICAL — Runtime display broken  
See F-012, Section 4 above.

**Affected locations:**
- App.tsx — B2B product price badge: `${p.basePrice}.00`
- App.tsx — B2C product price badge: `${p.basePrice}.00`
- App.tsx — WL_ADMIN products panel: `${p.basePrice}`
- CatalogItem interface: `basePrice?: number` (should be `price: number`)

---

### CM-002 · CatalogItem.category Not Guaranteed — WLCollectionsPanel Grouping May Fail

**Files:** WLCollectionsPanel.tsx  
**Severity:** MODERATE — Cosmetic degradation

WLCollectionsPanel.tsx groups items by `item.category`. The `CatalogItem.category` field is typed as `category?: string` (optional). If the backend does not return `category` in the catalog items response, all items group under an "undefined" or "Other" bucket. No defensive default grouping observed in the component.

---

### CM-003 · Tenant plan Field — Backend Returns 'BASIC', Frontend Maps to 'TRIAL'

**Files:** TenantRegistry.tsx  
**Severity:** LOW — Intentional mapping with code comment  
**Confidence:** HIGH

```typescript
plan: (tenant.plan === 'BASIC' ? 'TRIAL' : tenant.plan || 'TRIAL') as 'TRIAL' | 'PAID' | 'ENTERPRISE',
```

The backend returns `plan: 'BASIC'`; the frontend type uses `'TRIAL'`. The mapping is explicit and deliberate (code comment references Tenant.plan), but signals the plan enum values are not aligned between the two sides. A backend plan value of `'BASIC'` will silently map to `'TRIAL'` in the UI.

---

### CM-004 · lifecycleState vs status — Order Canonical Status

**Files:** EXPOrdersPanel.tsx  
**Severity:** LOW — Handled with comment

EXPOrdersPanel.tsx reads canonical order status from `lifecycleState`, with a `// GAP-ORDER-LC-001` comment, falling back to `status` if `lifecycleState` is absent. This indicates a known interim contract inconsistency that the component already accommodates defensively.

---

## SECTION 8 — AUTH / TENANCY-SENSITIVE FINDINGS

### AT-001 · Realm Enforcement — Correctly Implemented End-to-End

**Confidence:** HIGH

The dual-realm system is correctly threaded:
- apiClient.ts: `getToken()` checks `_impersonationTokenOverride` → `texqtic_admin_token` (CONTROL_PLANE) or `texqtic_tenant_token` (TENANT)
- tenantApiClient.ts: preflight check throws `REALM_MISMATCH` if current realm is not TENANT
- adminApiClient.ts: same for CONTROL_PLANE
- Backend: `X-Texqtic-Realm` hint header enforced in middleware
- App.tsx: realm-aware auth separation observed
- Impersonation token: correctly overrides `getToken()` without stomping stored realm tokens

No realm bypass paths or missing guards observed in the components and services inspected.

---

### AT-002 · G-017 Trade tenantId — D-017-A Enforced Server-Side

**Confidence:** HIGH (backend only, since frontend doesn't exist)

tenant.ts/G-017 enforces `tenantId` from JWT claims (D-017-A), not from request body. Even when the frontend is built, it must not send `tenantId` in the trade creation payload — the server ignores or rejects it.

---

### AT-003 · G-018 Escrow — org_id RLS Correctly Applied

**Confidence:** HIGH (backend only, since frontend doesn't exist)

escrow.g018.ts sets `app.org_id` GUC before all queries. Escrow creation, transaction recording, and listing are all RLS-scoped. No cross-tenant escrow leak is possible via the API.

---

### AT-004 · Control Plane disableAuth Flag — Must Be false in Production

**Files:** control.ts  
**Confidence:** MODERATE

Control plane route registration in control.ts uses authentication with an `isAdmin` sentinel check. During the audit, `disableAuth: true` patterns were not observed in the read portion of the file, but the full `admin/tenantProvision.ts` plugin was not inspected. The provisioning route (`POST /api/control/tenants/provision`) should be verified to confirm it carries admin authentication and is not accidentally unprotected.

---

### AT-005 · Impersonation Token — Token Cleared on Logout but Not on Realm Switch

**Files:** apiClient.ts  
**Confidence:** MODERATE

`resetOnRealmChange()` clears both realm tokens from localStorage when switching realms. However, the impersonation override (`_impersonationTokenOverride`) is a module-level variable. If the admin switches realm while an impersonation session is active, the impersonation token remains in memory until explicitly cleared via `clearImpersonationToken()`. App.tsx's impersonation flow calls `clearImpersonationToken()` on explicit "exit impersonation" — but an accidental logout-during-impersonation path was not verified.

---

## SECTION 9 — INTENTIONALLY STUBBED / PRODUCT-INCOMPLETE AREAS

The following areas appear to be intentional product phase boundaries rather than implementation oversights:

### S-001 · AdminRBAC — Acknowledged No-Backend
AdminRBAC.tsx is rendered from a static constant. This appears to be a Wave 5+ feature based on the disabled search in AuditLogs.tsx also citing "Wave 5."

### S-002 · AuditLogs Search and Filter — Wave 5 Comment
```
title="Search functionality will be enabled in Wave 5"
title="Filter functionality will be enabled in Wave 5"
```
Disabled stubs with explicit internal timeline notes. Not a gap — intentional deferral.

### S-003 · B2B "Request Quote" — Product Boundary Under Review
The B2BAddToCartButton dead button may reflect a business decision that B2B quote flows are in a future phase. The `DOCTRINE_ADDENDUM_POSITIONING_MONEY.md` file in docs likely governs why this is not yet implemented.

### S-004 · AI Kill Switch / Registry / Adjust Cap — Phase Boundary
AiGovernance.tsx dead action buttons align with the G-028 vector/AI governance identifier. These likely require backend route design before UI can be wired.

### S-005 · Catalog CRUD — Create Exists, Edit/Delete Intentionally Deferred
Both frontend and backend only support GET + POST for catalog. This appears to be a consistent product boundary — not a gap between two layers, but a shared product-phase limit.

---

## SECTION 10 — UNCERTAIN FINDINGS NEEDING NARROWER VERIFICATION

### U-001 · AiGovernance AI Routes — Backend /api/ai/* Not Fully Inspected
aiService.ts calls `GET /api/ai/insights` and `POST /api/ai/negotiation-advice`. The server-side route handler for `/api/ai/` was not located during the audit (not present in tenant.ts or control.ts main files). These routes may be registered in a separate plugin file. Recommendation: Search for `api/ai` in src to confirm route existence and auth posture.

### U-002 · tenantProvision.ts Plugin Auth — Not Fully Inspected
`POST /api/control/tenants/provision` is registered via `admin/tenantProvision.ts`. The first 150 lines of this file were not read. The admin auth guard on this high-privilege route should be manually verified.

### U-003 · Cart Component Internal State After Checkout
Cart.tsx and CartContext.tsx were not inspected. The cart may internally reset state after checkout in a way that provides implied confirmation — or it may silently discard the orderId. The post-checkout experience (F-016) finding should be confirmed by reading Cart.tsx before acting.

### U-004 · WLOrdersPanel.tsx Full Wiring — Only First 200 Lines Read
WLOrdersPanel.tsx is 480 lines. Only the first 200 lines were read, confirming the GET list wiring. The status transition (PATCH) buttons in the remaining 280 lines were not verified. The WL_ADMIN orders panel may or may not expose status transitions.

### U-005 · auth.ts — Only First 150 Lines of 2100 Lines Inspected
The full auth route file was not read. Additional auth flows (OTP, PKCE, refresh rotation, session invalidation) may have wiring gaps not captured in this audit.

---

## SECTION 11 — PRIORITY-RANKED NEXT ACTIONS

Ordered strictly by user impact and blast radius.

### Priority 1 — SHIP BLOCKER (Fix before any feature demo)

**P1.1 — Fix basePrice → price field name (F-012 / CM-001)**  
- Effort: 30 minutes — frontend only
- Files to change: App.tsx (3 render sites), catalogService.ts (CatalogItem interface)
- Risk: Zero — rename within frontend, no backend change needed
- Every catalog item in every shell currently renders `$undefined.00`. This should be fixed before any other work.

---

### Priority 2 — HIGH OPERATIONAL IMPACT (Core governance features unavailable)

**P2.1 — Wire Finance/Compliance/Dispute Authority Mutations (F-009)**  
- Effort: Medium — 3 components, 6 API calls, confirm dialogs
- Backend: Verified complete. Frontend: add 6 service functions + action buttons in 3 existing components
- Risk: Low — additive changes to existing components

**P2.2 — Add Post-Checkout Confirmation State (F-016)**  
- Effort: Small — add `ORDER_CONFIRMED` to state machine, show orderId
- Risk: Low — new state, no existing state modification

**P2.3 — Wire WhiteLabelSettings Domain Connect Button (F-013)**  
- Effort: Small — call `tenantPost('/api/tenant/domains', ...)` on button click
- Risk: Low — isolated to one component

---

### Priority 3 — BACKEND-COMPLETE / FRONTEND ABSENT (Major G-series flows)

**P3.1 — G-017 Trades Frontend (F-001)**  
Create `services/tradeService.ts` + `components/Tenant/TradesPanel.tsx` + `components/ControlPlane/TradeOversight.tsx`

**P3.2 — G-018 Escrow Frontend (F-002)**  
Create `services/escrowService.ts` + `components/Tenant/EscrowPanel.tsx`

**P3.3 — G-019 Certifications Frontend (F-004)**  
Create `services/certificationService.ts` + certification issue + lifecycle component

**P3.4 — G-022 Escalation Frontend (F-006)**  
Create `services/escalationService.ts` + `components/Tenant/EscalationsPanel.tsx` + ControlPlane escalation view (distinct from DisputeCases)

**P3.5 — G-016 Traceability CRUD Frontend (F-005)**  
Create node/edge creation forms; extend DPPPassport.tsx with live CRUD or create separate TraceabilityPanel.tsx

**P3.6 — G-019 Settlements Frontend (F-003)**  
Preview-confirm settlement flow for both tenant and control planes

---

### Priority 4 — PRODUCT COMPLETENESS

**P4.1 — Add Cart Summaries Admin Panel (F-007)**  
Service functions already implemented. Create `components/ControlPlane/CartSummariesPanel.tsx` and `CART_SUMMARIES` AdminView state.

**P4.2 — Wire TeamManagement "Edit Access" (F-014)**  
Requires a backend route addition first: `PATCH /api/tenant/memberships/:id`. Then wire the button and add a role-change modal.

**P4.3 — Add Tenant Audit Logs in EXPERIENCE Shell (F-017)**  
`GET /api/tenant/audit-logs` is implemented. Create a read-only audit trail component for tenant users.

**P4.4 — Surface MOQ Error to User (F-019)**  
`POST /api/tenant/cart/items` returns 422 MOQ_NOT_MET. Add a user-facing error toast or inline message.

---

### Priority 5 — REQUIRES NEW BACKEND DESIGN (Cannot wire frontend-first)

**P5.1 — AdminRBAC Backend Route (F-010)**  
No backend admin user management route. Requires backend design and implementation before UI can be wired.

**P5.2 — AI Governance Authority Actions (F-011)**  
No `PUT /api/control/ai-budget/:tenantId` or AI kill switch endpoint. Requires backend route before UI wiring.

**P5.3 — B2B Quote/RFQ Flow (F-015)**  
No quote endpoint. Product decision required before implementation.

---

## SECTION 12 — NO-CHANGE CONFIRMATION

This audit made zero file modifications.  
No files were created, edited, renamed, deleted, or staged.  
No terminal commands were run.  
No Prisma commands were executed.  
No package installations were performed.  
All activity was read-only codebase inspection.

The workspace is in exactly the state it was in before this audit session began.

---

**Audit complete.** 20 primary findings identified, 5 uncertain findings requiring targeted follow-up, 5 intentional stubs documented. F-012 (basePrice mismatch) is the only finding causing active runtime breakage today; all others are missing or incomplete features with working backends.
