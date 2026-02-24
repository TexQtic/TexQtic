# G-W3-AUDIT-001 — Realm UI State & UI→API Contract Audit

**Status:** COMPLETE (Read-Only)  
**Date:** 2026-02-24  
**Auditor:** GitHub Copilot (Wave 3 Governance Audit)  
**Task ID:** G-W3-AUDIT-001

---

## A) SYSTEM SNAPSHOT

| Field | Value |
|---|---|
| Commit Hash | `51b9ac5d11126af663d7f30c9217c51f6e877b77` |
| Commit Message | `chore(gov): G-CP-ADMIN-001 evidence` |
| Node Version | `v24.13.0` ⚠️ (governance rules state Node 24+ NOT allowed without explicit approval) |
| Package Manager | `pnpm 10.29.2` |
| Frontend Entrypoint | `App.tsx` → `index.tsx` |
| Backend Entrypoint | `server/src/index.ts` (local dev) |
| Vercel Serverless Entrypoint | `api/index.ts` |
| Frontend Framework | **Vite + React 19 SPA** — NOT Next.js. No file-based routing. |
| Routing Mechanism | App-state machine (`useState<'AUTH' \| 'EXPERIENCE' \| 'CONTROL_PLANE' \| ...>` in `App.tsx`) |
| Backend Framework | Fastify 5, port 3001 |

**Route Roots (not Next.js — App State Machine):**

```
App states: AUTH | FORGOT_PASSWORD | VERIFY_EMAIL | TOKEN_HANDLER | ONBOARDING
           | EXPERIENCE | TEAM_MGMT | INVITE_MEMBER | SETTINGS | CONTROL_PLANE

AdminView sub-states: TENANTS | FLAGS | FINANCE | COMPLIANCE | CASES | AI | LOGS
                     | HEALTH | RBAC | API_DOCS | DATA_MODEL | BLUEPRINTS | EVENTS
                     | BACKEND_SKELETON | MIDDLEWARE

Tenant experience sub-type (driven by TenantConfig.type):
  AGGREGATOR | B2B | B2C | WHITE_LABEL
```

---

## B) REALM ROUTE INVENTORY

> **Architecture note:** This is a SPA with state machine routing. "Paths" are internal state values, not URL hrefs. Navigation between states is via `setAppState()` callbacks, not `<Link href="...">`.

### B.1 Control Plane Realm

Nav defined in: [`layouts/SuperAdminShell.tsx`](../../layouts/SuperAdminShell.tsx)  
Active when: `appState === 'CONTROL_PLANE'` and `authRealm === 'CONTROL_PLANE'`

| Sidebar Label | State Key (AdminView) | Section | Component File | Component Exists? | Feature Gated? | Status |
|---|---|---|---|---|---|---|
| Tenants | `TENANTS` | Governance | `components/ControlPlane/TenantRegistry.tsx` | ✅ | No | ✅ wired |
| Feature Flags | `FLAGS` | Governance | `components/ControlPlane/FeatureFlags.tsx` | ✅ | No | ✅ wired |
| Finance & Fees | `FINANCE` | Governance | `components/ControlPlane/FinanceOps.tsx` | ✅ | No | ✅ wired |
| Certifications | `COMPLIANCE` | Risk & Compliance | `components/ControlPlane/ComplianceQueue.tsx` | ✅ | No | ✅ wired |
| Disputes | `CASES` | Risk & Compliance | `components/ControlPlane/DisputeCases.tsx` | ✅ | No | ✅ wired |
| AI Governance | `AI` | Risk & Compliance | `components/ControlPlane/AiGovernance.tsx` | ✅ | No | ⚠️ partial — calls `getTenants()` not AI-specific endpoint |
| Platform Blueprints | `BLUEPRINTS` | Architecture | `components/ControlPlane/ArchitectureBlueprints.tsx` | ✅ | No | ⚠️ partial — static content |
| Domain Skeletons | `BACKEND_SKELETON` | Architecture | `components/ControlPlane/BackendSkeleton.tsx` | ✅ | No | ⚠️ partial — static content |
| Middleware Logic | `MIDDLEWARE` | Architecture | `components/ControlPlane/MiddlewareScaffold.tsx` | ✅ | No | ⚠️ partial — static content |
| API Contracts | `API_DOCS` | Architecture | `components/ControlPlane/ApiDocs.tsx` | ✅ | No | ⚠️ partial — static content |
| Data Schema | `DATA_MODEL` | Architecture | `components/ControlPlane/DataModel.tsx` | ✅ | No | ⚠️ partial — static content |
| Live Event Stream | `EVENTS` | Infrastructure | `components/ControlPlane/EventStream.tsx` | ✅ | No | ✅ wired |
| Audit Logs | `LOGS` | Infrastructure | `components/ControlPlane/AuditLogs.tsx` | ✅ | No | ✅ wired |
| Access Control | `RBAC` | Infrastructure | `components/ControlPlane/AdminRBAC.tsx` | ✅ | No | ❌ broken — uses hardcoded `ADMIN_USERS` from `constants.tsx`, no API |
| Health Status | `HEALTH` | Infrastructure | `components/ControlPlane/SystemHealth.tsx` | ✅ | No | ✅ wired |

**Additional control plane behaviors (not in sidebar):**
| Trigger | State/Component | Status |
|---|---|---|
| Row click in TenantRegistry | `TenantDetails` (selectedTenant overlay) | ✅ wired (uses existing tenant data, no second API call) |
| Impersonate button in TenantRegistry | `handleImpersonate()` in `App.tsx` | ❌ broken — sets local state only; never calls `POST /api/control/impersonation/start` |
| Lifecycle buttons in TenantDetails (Reinstate/Suspend/Delete) | `TenantDetails.tsx` | ❌ broken — buttons render with no `onClick` handler, no API call |
| Provision Tenant | Not in sidebar | ❌ no UI exists; `POST /api/control/tenants/provision` endpoint exists but unreachable from UI |

---

### B.2 Enterprise Tenant Realm

Auth realm: `TENANT`. Sub-type: determined by `TenantConfig.type`.  
B2B shell nav defined in: [`layouts/Shells.tsx`](../../layouts/Shells.tsx) — `B2BShell`

| Nav Label | Trigger | Shell | API or State Action | Status |
|---|---|---|---|---|
| 📦 Catalog | `onNavigateHome()` → `setAppState('EXPERIENCE')` | B2BShell sidebar | Triggers `getCatalogItems()` via `useEffect` in App.tsx | ✅ wired |
| 🤝 Negotiations | `<button>` (no onClick) | B2BShell sidebar | None | ❌ broken — static button, no content, no API |
| 📄 Invoices | `<button>` (no onClick) | B2BShell sidebar | None | ❌ broken — static button, no content, no API |
| 👥 Members | `onNavigateTeam()` → `setAppState('TEAM_MGMT')` | B2BShell sidebar | Loads `TeamManagement.tsx` (hardcoded mock data) | ❌ broken — static mock data, no API call |
| ⚙️ Settings (float) | `setAppState('SETTINGS')` | Global float | Loads `WhiteLabelSettings.tsx` | ⚠️ partial — form displays but "Save Changes" has no onClick, no API |
| 🛒 Cart (float) | `setShowCart(true)` | Global float | `CartProvider` + `Cart.tsx` → `cartService` | ✅ wired |
| "Create RFQ" button | `<button>` (no onClick) | B2B content area | None | ❌ broken — no handler, no form |

**Aggregator Shell nav (AggregatorShell):**  
| Nav Label | Action | Status |
|---|---|---|
| Companies | `onNavigateHome()` | ✅ wired |
| Certifications | `<button>` (no onClick) | ❌ broken — no action |
| Team | `onNavigateTeam()` | ⚠️ partial — loads hardcoded mock data |
| Post RFQ | `<button>` (no onClick) | ❌ broken |

**B2C Shell nav (B2CShell):**  
| Nav Label | Action | Status |
|---|---|---|
| Team | `onNavigateTeam()` | ⚠️ partial — loads hardcoded mock data |
| 🛒 Cart icon | static badge (hardcoded `3`) | ❌ broken — not wired to CartContext, counter is hardcoded |
| "See All" link | `<button>` (no onClick) | ❌ broken |
| "Shop Now" hero button | `<button>` (no onClick) | ❌ broken |

---

### B.3 White Label Tenant Realm

Auth realm: `TENANT`. Sub-type: `WHITE_LABEL`.  
Shell nav defined in: [`layouts/Shells.tsx`](../../layouts/Shells.tsx) — `WhiteLabelShell`

| Nav Label | Action | Status |
|---|---|---|
| Portfolio | `onNavigateHome()` | ✅ wired (renders WL content) |
| Access Control | `onNavigateTeam()` | ⚠️ partial — loads hardcoded mock TeamManagement |
| Collections | `<button>` (no onClick) | ❌ broken — underlined but no action |
| The Journal | `<button>` (no onClick) | ❌ broken |
| "Explore the Collection" CTA | `<button>` (no onClick) | ❌ broken |

---

## C) PAGE EXISTENCE + ROUTE TREE SUMMARY

**Framework:** Vite SPA — no file-based routing. All "pages" are React component renders driven by state machine.

### Route Groups by Realm

| Realm | App State | Renders | Component |
|---|---|---|---|
| (all) | `AUTH` | Login form with realm switcher | `components/Auth/AuthFlows.tsx` |
| (all) | `FORGOT_PASSWORD` | Password reset request form | `components/Auth/ForgotPassword.tsx` |
| (all) | `VERIFY_EMAIL` | Email verification handler | `components/Auth/VerifyEmail.tsx` |
| (all) | `TOKEN_HANDLER` | URL token processor (reset/verify) | `components/Auth/TokenHandler.tsx` |
| (all) | `ONBOARDING` | Onboarding wizard | `components/Onboarding/OnboardingFlow.tsx` |
| Control Plane | `CONTROL_PLANE` | `SuperAdminShell` + `renderAdminView()` | 15 admin view components |
| All tenant types | `EXPERIENCE` | Type-specific shell + catalog/content | `layouts/Shells.tsx` (4 shells) |
| All tenant types | `TEAM_MGMT` | Team management view | `components/Tenant/TeamManagement.tsx` |
| All tenant types | `INVITE_MEMBER` | Invite form | `components/Tenant/InviteMemberForm.tsx` |
| All tenant types | `SETTINGS` | Branding settings | `components/Tenant/WhiteLabelSettings.tsx` |

### Key Route Files

```
App.tsx                          — State machine, all routing logic
layouts/SuperAdminShell.tsx      — Control plane sidebar + nav
layouts/Shells.tsx               — 4 tenant shells (Aggregator, B2B, B2C, WhiteLabel)
components/Auth/AuthFlows.tsx    — Login (hardcoded tenant dropdown)
components/ControlPlane/         — 15 admin view components
components/Tenant/               — 3 tenant management components
components/Cart/Cart.tsx         — Cart slideout
contexts/CartContext.tsx         — Cart state + backend sync
server/src/index.ts              — Local dev server route registration
api/index.ts                     — Vercel serverless route registration (INCOMPLETE)
```

---

## D) UI→API CONTRACT MAP

All requests flow through `services/apiClient.ts` → `fetch()` with `API_BASE_URL` prefix.  
`API_BASE_URL`: empty string (same-origin) unless `VITE_API_BASE_URL` env override is set.

Legend:
- **Client**: `direct-apiClient` = bare `get`/`post`/`put`/`patch` from `apiClient.ts`; `via-controlPlaneService` = wrapped in service reading `getAuthRealm()`; `via-authService` = `authService.ts`; `via-cartService` = `cartService.ts`

| # | Endpoint | Method | UI File / Function | Client Used | Realm Header | Server Handler Exists? | Risk |
|---|---|---|---|---|---|---|---|
| 1 | `/api/auth/login` | POST | `services/authService.ts:login()` ← `AuthFlows.tsx:doLogin()` | direct-apiClient | `x-realm-hint: tenant` | ✅ `auth.ts:79` | OK |
| 2 | `/api/auth/admin/login` | POST | `services/authService.ts:login()` ← `AuthFlows.tsx:doLogin()` | direct-apiClient | none | ✅ `auth.ts:563` | OK |
| 3 | `/api/auth/forgot-password` | POST | `services/authService.ts:forgotPassword()` ← `ForgotPassword.tsx` | direct-apiClient | none | ✅ `auth.ts:1053` | OK |
| 4 | `/api/auth/reset-password` | POST | `services/authService.ts:resetPassword()` ← `TokenHandler.tsx` | direct-apiClient | none | ✅ `auth.ts:1123` | OK |
| 5 | `/api/auth/verify-email` | POST | `services/authService.ts:verifyEmail()` ← `VerifyEmail.tsx` | direct-apiClient | none | ✅ `auth.ts:1210` | OK |
| 6 | `/api/auth/resend-verification` | POST | `services/authService.ts:resendVerification()` ← `VerifyEmail.tsx` | direct-apiClient | none | ✅ `auth.ts:1287` | OK |
| 7 | `/api/me` | GET | `services/authService.ts:getCurrentUser()` ← `App.tsx:handleAuthSuccess()` | direct-apiClient | none | ✅ `tenant.ts:28` | OK — BUT realmGuard maps `/api/me`→tenant, needs tenant JWT |
| 8 | `/api/tenant/catalog/items` | GET | `services/catalogService.ts:getCatalogItems()` ← `App.tsx:fetchCatalog useEffect` | direct-apiClient | none | ✅ `tenant.ts:120` | DRIFT RISK — no realm hint header; `X-Texqtic-Realm` not sent |
| 9 | `/api/tenant/cart` | POST | `services/cartService.ts:getOrCreateCart()` ← `CartContext.tsx` | direct-apiClient | none | ✅ `tenant.ts:183` | DRIFT RISK — no realm hint header |
| 10 | `/api/tenant/cart` | GET | `services/cartService.ts:getCart()` ← `CartContext.tsx` | direct-apiClient | none | ✅ `tenant.ts:269` | DRIFT RISK — no realm hint header |
| 11 | `/api/tenant/cart/items` | POST | `services/cartService.ts:addToCart()` ← `CartContext.tsx` | direct-apiClient | none | ✅ `tenant.ts:314` | DRIFT RISK — no realm hint header |
| 12 | `/api/tenant/cart/items/:id` | PATCH | `services/cartService.ts:updateCartItem()` ← `CartContext.tsx` | direct-apiClient | none | ✅ `tenant.ts:497` | DRIFT RISK — no realm hint header |
| 13 | `/api/tenant/checkout` | POST | **NOT CALLED FROM UI** — `Cart.tsx:182` calls `console.log('Checkout not implemented (Wave 5)')` | N/A | N/A | ✅ `tenant.ts:652` | NO-HANDLER RISK (server exists, UI stub only) |
| 14 | `/api/tenant/orders` | GET | **NOT CALLED FROM UI** — no orders list component exists | N/A | N/A | ✅ `tenant.ts:777` | NO-HANDLER RISK (server exists, no UI) |
| 15 | `/api/tenant/orders/:id` | GET | **NOT CALLED FROM UI** | N/A | N/A | ✅ `tenant.ts:801` | NO-HANDLER RISK (server exists, no UI) |
| 16 | `/api/tenant/activate` | POST | `services/tenantService.ts:activateTenant()` — NOT called from any UI component | N/A | N/A | ✅ `tenant.ts:829` | NO-HANDLER RISK (exposed endpoint, no UI entry point) |
| 17 | `/api/tenant/memberships` | POST | `services/tenantService.ts:createMembership()` — `InviteMemberForm.tsx` form submit calls `onBack()` directly, NEVER calls service | N/A | N/A | ✅ `tenant.ts:978` | NO-HANDLER RISK (UI form exists but bypasses API) |
| 18 | `/api/tenant/memberships` | GET | `services/tenantService.ts` — not directly imported anywhere in UI | N/A | N/A | ✅ `tenant.ts:86` | NO-HANDLER RISK (no UI consumption) |
| 19 | `/api/tenant/branding` | PUT | `services/tenantService.ts:updateBranding()` — `WhiteLabelSettings.tsx` "Save Changes" button has no onClick | N/A | N/A | ✅ `tenant.ts:1087` | NO-HANDLER RISK (button renders, no wiring) |
| 20 | `/api/tenant/audit-logs` | GET | `services/tenantService.ts` — no UI component fetches this | N/A | N/A | ✅ `tenant.ts:65` | NO-HANDLER RISK (no UI consumption) |
| 21 | `/api/control/tenants` | GET | `services/controlPlaneService.ts:getTenants()` ← `TenantRegistry.tsx` + `App.tsx` + `AiGovernance.tsx` | via-controlPlaneService (requireControlPlaneRealm guard) | none (no X-Texqtic-Realm on control services) | ✅ `control.ts:42` | OK — realm guarded client-side; DRIFT RISK — no `X-Texqtic-Realm: control` header sent |
| 22 | `/api/control/tenants/:id` | GET | `services/controlPlaneService.ts:getTenantById()` — not called from any component | N/A | N/A | ✅ `control.ts:62` | UNKNOWN — service defined, no UI consumer |
| 23 | `/api/control/audit-logs` | GET | `services/controlPlaneService.ts:getAuditLogs()` ← `AuditLogs.tsx` | via-controlPlaneService | none | ✅ `control.ts:94` | OK — realm guarded |
| 24 | `/api/control/feature-flags` | GET | `services/controlPlaneService.ts:getFeatureFlags()` ← `FeatureFlags.tsx` | via-controlPlaneService | none | ✅ `control.ts:127` | OK — realm guarded |
| 25 | `/api/control/feature-flags/:key` | PUT | `services/controlPlaneService.ts:upsertFeatureFlag()` ← `FeatureFlags.tsx:handleToggle()` | via-controlPlaneService | none | ✅ `control.ts:141` | OK — realm guarded |
| 26 | `/api/control/events` | GET | `services/controlPlaneService.ts:getEvents()` ← `EventStream.tsx` | via-controlPlaneService | none | ✅ `control.ts:215` | OK — realm guarded |
| 27 | `/api/control/finance/payouts` | GET | `services/controlPlaneService.ts:getPayouts()` ← `FinanceOps.tsx` | via-controlPlaneService | none | ✅ `control.ts:300` | OK — realm guarded |
| 28 | `/api/control/compliance/requests` | GET | `services/controlPlaneService.ts:getComplianceRequests()` ← `ComplianceQueue.tsx` | via-controlPlaneService | none | ✅ `control.ts:350` | OK — realm guarded |
| 29 | `/api/control/disputes` | GET | `services/controlPlaneService.ts:getDisputes()` ← `DisputeCases.tsx` | via-controlPlaneService | none | ✅ `control.ts:398` | OK — realm guarded |
| 30 | `/api/control/system/health` | GET | `services/controlPlaneService.ts:getSystemHealth()` ← `SystemHealth.tsx` | via-controlPlaneService | none | ✅ `control.ts:447` | OK — realm guarded |
| 31 | `/api/control/marketplace/cart-summaries` | GET | `services/controlPlaneService.ts:getCartSummaries()` — no UI component uses this | N/A | N/A | ✅ `admin-cart-summaries.ts:35` | UNKNOWN — service defined, no UI consumer |
| 32 | `/api/control/marketplace/cart-summaries/:cart_id` | GET | `services/controlPlaneService.ts:getCartSummaryByCartId()` — no UI component uses this | N/A | N/A | ✅ `admin-cart-summaries.ts:127` | UNKNOWN — service defined, no UI consumer |
| 33 | `/api/control/tenants/provision` | POST | `services/controlPlaneService.ts:provisionTenant()` — no UI component uses this | N/A | N/A | ✅ `admin/tenantProvision.ts` BUT ❌ **MISSING from `api/index.ts`** | NO-HANDLER RISK — endpoint missing in Vercel prod deployment |
| 34 | `/api/control/impersonation/start` | POST | **NOT CALLED FROM UI** — `TenantRegistry.tsx:onImpersonate()` sets local state via `handleImpersonate()` in `App.tsx` only | N/A | N/A | ✅ `admin/impersonation.ts:60` BUT ❌ **MISSING from `api/index.ts`** | NO-HANDLER RISK — endpoint missing in Vercel prod + no UI call |
| 35 | `/api/control/impersonation/stop` | POST | **NOT CALLED FROM UI** | N/A | N/A | ✅ `admin/impersonation.ts` BUT ❌ **MISSING from `api/index.ts`** | NO-HANDLER RISK |
| 36 | `/api/control/impersonation/status/:id` | GET | **NOT CALLED FROM UI** | N/A | N/A | ✅ `admin/impersonation.ts` BUT ❌ **MISSING from `api/index.ts`** | NO-HANDLER RISK |
| 37 | `/api/ai/insights` | GET | `services/aiService.ts:getPlatformInsights()` ← `App.tsx:fetchInsight useEffect` | direct-apiClient | none | ✅ `ai.ts:114` | DRIFT RISK — no realm hint; `/api/ai` unmapped in `ENDPOINT_REALM_MAP`, defaults to tenant |
| 38 | `/api/ai/negotiation-advice` | POST | `services/aiService.ts:generateNegotiationAdvice()` — not called from any component | N/A | N/A | ✅ `ai.ts:240` | NO-HANDLER RISK — defined in service, no UI trigger |
| 39 | `/api/ai/health` | GET | not called from any component | N/A | N/A | ✅ `ai.ts:378` | NO-HANDLER RISK |

### Cross-check Summary (10 UI endpoints vs server handlers)

| Endpoint | UI Call | Server Handler | Match? |
|---|---|---|---|
| POST `/api/auth/login` | `authService.login()` | `auth.ts:79` | ✅ MATCH |
| GET `/api/me` | `authService.getCurrentUser()` | `tenant.ts:28` | ✅ MATCH |
| GET `/api/tenant/catalog/items` | `catalogService.getCatalogItems()` | `tenant.ts:120` | ✅ MATCH |
| POST `/api/tenant/cart` | `cartService.getOrCreateCart()` | `tenant.ts:183` | ✅ MATCH |
| POST `/api/tenant/cart/items` | `cartService.addToCart()` | `tenant.ts:314` | ✅ MATCH |
| PATCH `/api/tenant/cart/items/:id` | `cartService.updateCartItem()` | `tenant.ts:497` | ✅ MATCH |
| GET `/api/control/tenants` | `controlPlaneService.getTenants()` | `control.ts:42` | ✅ MATCH |
| GET `/api/control/feature-flags` | `controlPlaneService.getFeatureFlags()` | `control.ts:127` | ✅ MATCH |
| PUT `/api/control/feature-flags/:key` | `controlPlaneService.upsertFeatureFlag()` | `control.ts:141` | ✅ MATCH |
| POST `/api/control/tenants/provision` | `controlPlaneService.provisionTenant()` | `admin/tenantProvision.ts` | ⚠️ SERVER EXISTS — but `api/index.ts` (Vercel) does NOT register this route → 404 in prod |

---

## E) TOP INTERACTION WIRING MATRIX

| Flow | UI Trigger | File | Handler Exists? | Network Call Fires? | Endpoint | On Success | On Failure | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| **Login (Tenant)** | "Sign In" button / form submit | `AuthFlows.tsx:doLogin()` | ✅ | ✅ | `POST /api/auth/login` | `setAppState('EXPERIENCE')`, fetch `/api/me` for tenant context | Error state on form | ✅ wired | Tenant picker hardcoded in `SEEDED_TENANTS` constant |
| **Login (Admin)** | "Sign In" button / form submit | `AuthFlows.tsx:doLogin()` | ✅ | ✅ | `POST /api/auth/admin/login` | `setAppState('CONTROL_PLANE')` | Error state on form | ✅ wired | |
| **Add to Cart (B2C)** | "Add to Cart" button | `App.tsx:B2CAddToCartButton` | ✅ | ✅ | `POST /api/tenant/cart/items` | Cart count badge updates via CartContext refresh | `console.error`, throws error | ✅ wired | Only `B2C` sub-type; B2B shows "Request Quote" (no API) |
| **Add to Cart (B2B)** | "Request Quote" button | `App.tsx:B2BAddToCartButton` | ✅ (button) | ❌ No network call | N/A | N/A | N/A | ❌ broken | B2B button renders but calls nothing |
| **View Cart** | 🛒 button (App float) | `App.tsx:CartToggleButton` | ✅ | ✅ (on CartProvider mount via `getCart()`) | `GET /api/tenant/cart` | Shows slide-out cart | Error state | ✅ wired | Counter badge wired to CartContext; B2C shell has separate hardcoded `3` badge |
| **Update Cart Qty** | −/+ buttons in cart | `Cart.tsx:handleQuantityChange()` | ✅ | ✅ | `PATCH /api/tenant/cart/items/:id` | Optimistic update → refresh | Toast-like error, rollback | ✅ wired | |
| **Remove Cart Item** | "Remove" button | `Cart.tsx:handleRemove()` | ✅ | ✅ | `PATCH /api/tenant/cart/items/:id` (qty=0) | Item removed, cart refresh | Toast-like error | ✅ wired | |
| **Checkout** | "Proceed to Checkout" button | `Cart.tsx:188` | ✅ (button renders) | ❌ `console.log('Checkout not implemented (Wave 5)')` | N/A | N/A | N/A | ❌ broken | Server endpoint `POST /api/tenant/checkout` fully implemented; UI stub only |
| **Orders List** | N/A | N/A — no orders UI component | ❌ | ❌ | N/A | N/A | N/A | ❌ broken | Server `GET /api/tenant/orders` exists with full logic |
| **Seller Dashboard CTA (B2B/Aggr)** | Various buttons (Negotiations, Invoices, Certifications, Post RFQ, Create RFQ) | `Shells.tsx`, `App.tsx` | ❌ | ❌ | N/A | N/A | N/A | ❌ broken | All buttons have no `onClick` handlers |
| **Admin: Tenant Registry List** | Auto-load on entering TENANTS view | `TenantRegistry.tsx:useEffect` | ✅ | ✅ | `GET /api/control/tenants` | Table renders tenants | `ErrorState` component | ✅ wired | |
| **Admin: Provision Tenant** | No UI exists | N/A | ❌ | ❌ | N/A | N/A | N/A | ❌ broken | `provisionTenant()` service and server endpoint exist; no admin UI form |
| **Admin: Impersonation (UI)** | 👤 button in TenantRegistry row | `TenantRegistry.tsx:onImpersonate()` → `App.tsx:handleImpersonate()` | ✅ | ❌ No network call | N/A | Sets `impersonation.isAdmin=true`, switch to EXPERIENCE view | N/A | ❌ broken | Only local state change; never calls `POST /api/control/impersonation/start`; no audit trail |
| **Admin: Exit Impersonation** | "Exit Impersonation" banner button | `App.tsx:handleExitImpersonation()` | ✅ | ❌ No network call | N/A | Returns to CONTROL_PLANE view | N/A | ❌ broken | Never calls `POST /api/control/impersonation/stop` |
| **Admin: Feature Flag Toggle** | Toggle button per flag row | `FeatureFlags.tsx:handleToggle()` | ✅ | ✅ | `PUT /api/control/feature-flags/:key` | Optimistic update, success | Rollback + error message | ✅ wired | |
| **Invite Member** | "Send Invite" button in `InviteMemberForm.tsx` | `InviteMemberForm.tsx:form onSubmit` | ✅ (button) | ❌ No network call | N/A | Form calls `onBack()` immediately | N/A | ❌ broken | `createMembership()` service and `POST /api/tenant/memberships` exist; form never calls them |
| **Team Management** | `setAppState('TEAM_MGMT')` | `TeamManagement.tsx` | ✅ | ❌ No network call | N/A | Shows hardcoded members array | N/A | ❌ broken | `GET /api/tenant/memberships` server endpoint exists; component uses hardcoded mock data |
| **Save Branding** | "Save Changes" button | `WhiteLabelSettings.tsx` | ✅ (button renders) | ❌ No network call | N/A | N/A | N/A | ❌ broken | `PUT /api/tenant/branding` + `updateBranding()` service exist; button has no `onClick` |
| **White Label: Collection landing → catalog** | "Explore the Collection" button | `WhiteLabelShell` content render | ✅ (button renders) | ❌ No network call | N/A | N/A | N/A | ❌ broken | No catalog/product detail view for WHITE_LABEL type |
| **AI Insights (per-tenant)** | Auto-load on EXPERIENCE state + currentTenant | `App.tsx:usEffect[currentTenant,appState]` | ✅ | ✅ | `GET /api/ai/insights` | Insight string displayed via `aiInsight` state | Graceful error string set | ✅ wired | Only shown in AGGREGATOR view; `generateNegotiationAdvice()` defined but no UI trigger |

---

## F) FEATURE FLAG / CONFIG GATING SUMMARY

### Server-Side Config Switches

| Flag / Config | Where Defined | Where Consumed | What It Gates |
|---|---|---|---|
| `KILL_SWITCH_ALL` | `server/src/config/index.ts` (env var) | `server/src/index.ts` onRequest hook + `api/index.ts` onRequest hook | Kills ALL API requests (returns `503 KILL_SWITCH_ACTIVE`) except `/health` / `/api/health` |

### Database-Backed Feature Flags (Runtime)

| Flag Name | Where Defined | Where Consumed | What It Gates |
|---|---|---|---|
| Any keys in `FeatureFlag` table | Supabase DB (`feature_flags` table) | `GET /api/control/feature-flags` → `FeatureFlags.tsx` (display + toggle only) | **NOTHING currently** — flags are readable and togglable from admin UI, but NO UI code reads flag state from API to conditionally gate routing or component rendering |

### Frontend Static Constants (NOT Dynamic / NOT Server-Backed)

| Constant | File | What It Names / Gates |
|---|---|---|
| `FEATURE_FLAGS` array | `constants.tsx:69-90` | Decorative mock data shown nowhere in current UI |
| `SEEDED_TENANTS` array | `AuthFlows.tsx:9-12` | Tenant picker at login — hardcoded; gates which tenants can log in via UI |
| `ADMIN_USERS` array | `constants.tsx:99+` | Used in `AdminRBAC.tsx` render — hardcoded mock RBAC data; not from API |

### Summary

> **No feature flags from the database currently gate any UI routing, component visibility, or API call execution.** The flag toggle feature is purely a data management UI. Feature flag enforcement must occur server-side (per endpoint) or be wired client-side — neither is present.

---

## G) SERVER-SIDE REALM MAP CHECK

### Realm Guard: `ENDPOINT_REALM_MAP`

File: [`server/src/middleware/realmGuard.ts`](../../server/src/middleware/realmGuard.ts)

```typescript
const ENDPOINT_REALM_MAP: Record<string, 'tenant' | 'admin' | 'public'> = {
  '/api/auth':     'public',
  '/api/control':  'admin',
  '/api/tenant':   'tenant',
  '/api/me':       'tenant',
  '/api/cart':     'tenant',     // ⚠️ DEAD ENTRY — no route uses /api/cart prefix (actual: /api/tenant/cart)
  '/api/catalog':  'tenant',     // ⚠️ DEAD ENTRY — no route uses /api/catalog prefix (actual: /api/tenant/catalog)
  '/health':       'public',
  '/api/health':   'public',
};
```

**Matching algorithm:** Prefix scan; first match wins. `/api/ai/*` is NOT in map → falls through to default: `tenant` realm. This is appropriate since AI routes require tenant auth.

### Realm Hint Flow

```
UI Client              →  X-Texqtic-Realm header   →  Server onRequest guard (realmHintGuardOnRequest)
  tenantApiClient            'tenant'                    validates prefix expected = tenant
  adminApiClient             'control'                   validates prefix expected = admin
  direct-apiClient           (none)                      skips hint check (backward-compat)
```

**Gap:** `cartService`, `catalogService`, `aiService`, and `authService` all use `direct-apiClient` (raw `get`/`post`/`put`/`patch`) — they do NOT send the `X-Texqtic-Realm` hint header. This means the `realmHintGuardOnRequest` does not provide early 403 defense for these paths; auth-layer realm check is the only guard.

**Note:** `controlPlaneService.ts` does NOT use `adminApiClient` — it uses raw `get()`/`post()`/`put()` from `apiClient`. The client-side realm guard is `requireControlPlaneRealm()` implemented inline, but the `X-Texqtic-Realm: control` header is never sent for control-plane requests.

### Route Prefixes by Realm

| Prefix | Auth Realm | Auth Middleware | Guard Type |
|---|---|---|---|
| `/api/auth/*` | public | none | realm=public |
| `/api/control/*` | admin | `adminAuthMiddleware` via `fastify.addHook('onRequest')` in controlRoutes | JWT adminId check + realmGuard |
| `/api/tenant/*` | tenant | `tenantAuthMiddleware` per-route + `databaseContextMiddleware` | JWT userId+tenantId + RLS context |
| `/api/me` | tenant | `tenantAuthMiddleware` per-route | JWT userId+tenantId |
| `/api/ai/*` | tenant | `tenantAuthMiddleware` per-route | JWT userId+tenantId |
| `/api/control/marketplace/*` | admin | `adminAuthMiddleware` (via adminCartSummariesRoutes) | JWT adminId |
| `/health`, `/api/health` | public | none | — |

### Realm Hint Headers in Use

| Header | Value | Sent By | Validated By |
|---|---|---|---|
| `X-Texqtic-Realm` | `tenant` | `tenantApiClient.ts` (not used by `catalogService`/`cartService`/`aiService`) | `realmHintGuardOnRequest` |
| `X-Texqtic-Realm` | `control` | `adminApiClient.ts` (not used by `controlPlaneService`) | `realmHintGuardOnRequest` |
| `x-realm-hint` | `tenant` | `authService.ts:login()` for tenant realm only | `auth.ts` login path |

---

## H) PRIORITIZED FINDINGS

| # | Severity | Realm | Finding | Evidence | Fix Direction |
|---|---|---|---|---|---|
| 1 | **P0** | Vercel Prod | `tenantProvisionRoutes` and `impersonationRoutes` are NOT registered in `api/index.ts`. These endpoints 404 in production Vercel deployment. | [`api/index.ts`](../../api/index.ts) vs [`server/src/index.ts`](../../server/src/index.ts) | Add `import`+`register` of `tenantProvisionRoutes` and `impersonationRoutes` to `api/index.ts` |
| 2 | **P0** | Control Plane | Impersonation is locally simulated (state toggle only) — it never calls `POST /api/control/impersonation/start`. No audit event is written; no time-bounded token is issued. Impersonation appears to work in UI but is actually unsecured and unaudited. | `App.tsx:handleImpersonate()`, `TenantRegistry.tsx:onImpersonate()`, `admin/impersonation.ts:60` | Wire `onImpersonate` to call `POST /api/control/impersonation/start`; store returned token for subsequent API calls in impersonated context |
| 3 | **P1** | Tenant | Checkout is stub-only. "Proceed to Checkout" button calls `console.log()`. `POST /api/tenant/checkout` is fully implemented server-side including totals engine, order creation, and audit log. | [`components/Cart/Cart.tsx:182`](../../components/Cart/Cart.tsx), [`server/src/routes/tenant.ts:652`](../../server/src/routes/tenant.ts) | Wire the checkout button to `POST /api/tenant/checkout`; display order confirmation on success |
| 4 | **P1** | Tenant | `InviteMemberForm.tsx` form submit calls `onBack()` directly without calling `POST /api/tenant/memberships`. The invite API exists and is fully implemented. | [`components/Tenant/InviteMemberForm.tsx:12`](../../components/Tenant/InviteMemberForm.tsx), [`server/src/routes/tenant.ts:978`](../../server/src/routes/tenant.ts) | Wire form `onSubmit` to `createMembership()` from `tenantService`; show success/error state |
| 5 | **P1** | Tenant | `TeamManagement.tsx` renders hardcoded mock members. `GET /api/tenant/memberships` exists server-side. Actual team data is never shown to users. | [`components/Tenant/TeamManagement.tsx:6`](../../components/Tenant/TeamManagement.tsx), [`server/src/routes/tenant.ts:86`](../../server/src/routes/tenant.ts) | Replace hardcoded `members` array with `useEffect` call to `GET /api/tenant/memberships` |
| 6 | **P1** | Tenant | `WhiteLabelSettings.tsx` "Save Changes" button has no `onClick` handler. `PUT /api/tenant/branding` + `updateBranding()` service are fully implemented. | [`components/Tenant/WhiteLabelSettings.tsx:131`](../../components/Tenant/WhiteLabelSettings.tsx), [`server/src/routes/tenant.ts:1087`](../../server/src/routes/tenant.ts) | Add `onClick` to "Save Changes" button; call `updateBranding()` with form state values |
| 7 | **P1** | Control Plane | TenantDetails lifecycle buttons (Reinstate, Suspend, Delete) have no `onClick` handlers. No server endpoints exist for these operations. | [`components/ControlPlane/TenantDetails.tsx:58-62`](../../components/ControlPlane/TenantDetails.tsx) | Define server endpoints for tenant lifecycle mutations; wire UI buttons |
| 8 | **P2** | All realms | `cartService`, `catalogService`, `aiService`, and `controlPlaneService` do not send `X-Texqtic-Realm` hint header. Realm protection for these paths relies solely on JWT auth middleware, not the pre-auth `realmHintGuardOnRequest`. | [`services/cartService.ts`](../../services/cartService.ts), [`services/catalogService.ts`](../../services/catalogService.ts), [`services/aiService.ts`](../../services/aiService.ts), [`services/controlPlaneService.ts`](../../services/controlPlaneService.ts) | Switch `cartService`/`catalogService`/`aiService` to use `tenantGet`/`tenantPost`/`tenantPatch` from `tenantApiClient`; switch `controlPlaneService` to use `adminGet`/`adminPost`/`adminPut`/`adminPatch` from `adminApiClient` |
| 9 | **P2** | Control Plane | Admin RBAC view (`AdminRBAC.tsx`) uses hardcoded `ADMIN_USERS` from `constants.tsx`. No admin user management API exists. | [`components/ControlPlane/AdminRBAC.tsx:3`](../../components/ControlPlane/AdminRBAC.tsx), [`constants.tsx:99`](../../constants.tsx) | Define `GET /api/control/admin-users` endpoint; replace mock data with API call |
| 10 | **P2** | Auth | Tenant login uses hardcoded `SEEDED_TENANTS` array for tenant picker. TODO comment acknowledges `GET /api/public/tenants/resolve?slug=<slug>` endpoint is needed but missing. New tenants provisioned by admin cannot be selected at login. | [`components/Auth/AuthFlows.tsx:8-12`](../../components/Auth/AuthFlows.tsx) | Implement `GET /api/public/tenants/resolve` endpoint; replace `SEEDED_TENANTS` with dynamic fetch |

---

## I) EXECUTION READINESS FOR G-W3-ROUTING-001

### What Is Now Known

- [x] Routing mechanism is a React state machine in `App.tsx`, NOT file-based — no Next.js route groups
- [x] Three logical realms: Control Plane, Enterprise Tenant (B2B/Aggregator), White Label Tenant (B2C/WL)
- [x] All three realm sidebars/shells are fully inventoried
- [x] Complete UI→API map (39 endpoint interactions traced)
- [x] Vercel vs local dev server route registration drift confirmed (2 missing route plugins in `api/index.ts`)
- [x] Checkout, Orders, InviteMember, TeamManagement, Branding, Impersonation, Lifecycle all have server endpoints but broken/missing UI wiring
- [x] Feature flags are togglable but gate nothing in the UI or server route handlers
- [x] Realm hint headers are inconsistently applied (only applied by unused `tenantApiClient`/`adminApiClient`, not by the actual service clients)
- [x] Hardcoded `SEEDED_TENANTS` blocks new tenant login without code change

### Unknowns Remaining

- [ ] Actual Vercel deployment URL and whether `/api/control/tenants/provision` 404s confirmed
- [ ] Whether `admin/impersonation.ts` routes are wired in `api/index.ts` for prod — confirmed missing from code; runtime behavior not tested
- [ ] Cart behavior in impersonation context (impersonation uses local state swap only — no impersonation token is stored/used for cart API calls)
- [ ] TenantProvision form design requirements (not scoped in any component)
- [ ] Whether `GET /api/control/tenants/:id` (getTenantById) should be called when loading TenantDetails — currently TenantDetails receives pre-loaded `TenantConfig` from list view, not a detailed server fetch
- [ ] Auth token refresh flow — `/api/auth/refresh` exists server-side but no client-side handling in `apiClient.ts`

### Scoped Plan for G-W3-ROUTING-001 (Hardening)

**Sequencing recommendation:**

1. **Fix Vercel prod route drift (P0)**
   - File: `api/index.ts`
   - Add `tenantProvisionRoutes` (prefix `/api/control`) and `impersonationRoutes` (prefix `/api/control`)

2. **Wire impersonation to server API (P0)**
   - Files: `App.tsx`, `TenantRegistry.tsx`, `components/ControlPlane/TenantDetails.tsx`
   - Replace `handleImpersonate()` local-only state with `POST /api/control/impersonation/start` call; store returned token for impersonated requests; wire `handleExitImpersonation()` to `POST /api/control/impersonation/stop`

3. **Wire checkout button (P1)**
   - Files: `components/Cart/Cart.tsx`, add `cartService.ts:checkout()`
   - Remove `console.log` stub; call `POST /api/tenant/checkout`; navigate to order confirmation view

4. **Wire InviteMember form (P1)**
   - Files: `components/Tenant/InviteMemberForm.tsx`
   - Replace `onBack()` shortcut with `createMembership()` call from `tenantService`

5. **Wire TeamManagement to API (P1)**
   - Files: `components/Tenant/TeamManagement.tsx`
   - Replace hardcoded `members` with `GET /api/tenant/memberships` call

6. **Wire WhiteLabelSettings Save (P1)**
   - Files: `components/Tenant/WhiteLabelSettings.tsx`
   - Add controlled form state; add `onClick` on "Save Changes" to call `updateBranding()`

7. **Apply typed realm hint headers to all service clients (P2)**
   - Migrate `cartService`, `catalogService`, `aiService` from raw `get`/`post`/`patch` to `tenantGet`/`tenantPost`/`tenantPatch` from `tenantApiClient`
   - Migrate `controlPlaneService` from raw `get`/`post`/`put` to `adminGet`/`adminPost`/`adminPut` from `adminApiClient`

8. **Implement tenant resolver endpoint (P2)**
   - New file: `server/src/routes/auth.ts` or new public route
   - Add `GET /api/public/tenants/resolve?slug=<slug>` returning tenant `{id, name, slug}`
   - Update `AuthFlows.tsx` to fetch dynamically instead of `SEEDED_TENANTS`

---

## Completion Checklist

- [x] No code behavior changes made
- [x] No schema/RLS changes
- [x] Route inventory tables completed for all 3 realms (Control Plane, Enterprise Tenant, White Label)
- [x] UI→API contract map includes all unique `/api/*` usages (39 interactions enumerated)
- [x] Interaction matrix covers required flows (checkout, cart, orders, impersonation, admin CRUDs, white label)
- [x] Feature-flag gating summary completed
- [x] Top 10 findings ranked with evidence and fix direction
- [x] Ready-to-execute scope for G-W3-ROUTING-001 produced

---

*Report generated by: G-W3-AUDIT-001 read-only audit pass*  
*Commit at audit time: `51b9ac5d11126af663d7f30c9217c51f6e877b77`*
