# TexQtic Implementation Tracker — Frontend-Backend Reachability Recovery Program (March 2026)

**Source:** `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` (Section 8)  
**Reconciliation artifact:** `docs/governance/audits/2026-03-audit-reconciliation-matrix.md`  
**Gap register section:** `governance/gap-register.md` → "Frontend-Backend Wiring Gap Audit — March 2026"  
**Baseline:** GOVERNANCE-SYNC-095 (last recorded high-water mark at tracker creation)  
**Date created:** 2026-03-06  
**RLS Maturity:** 5.0 / 5  
**Migrations:** 82 / 82 Applied  
**Doctrine Version:** v1.4  

> **Scope:** This tracker governs the frontend-backend reachability recovery work only.
> All G-001 through G-028 governance history remains in `IMPLEMENTATION-TRACKER-2026-Q2.md`.
> Rows in this tracker are derived exclusively from cross-audit merged statuses — not from single-report claims.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Complete — evidence recorded |
| ⏳ | Pending — not yet started |
| 🔄 | In Progress |
| 🔴 | Blocked |
| 🔍 | Verification only — no product code |
| ❌ | Not implemented (intentional or deferred) |

---

## Wave 0 — Verification Pass (No Product Code)

**Gate:** All VER-001 through VER-010 items resolved (PASS / FAIL / DEFER) before Wave 1 begins.  
**Constraint:** No src/ or server/ file changes in Wave 0. Read-only analysis only.

| ID | Objective | Verification Target | Risk | Merged Status | Exit Criteria | Status |
|---|---|---|---|---|---|---|
| TECS-FBW-PROV-001 (VER-001) | Resolve CROSS_REPORT_CONFLICT on tenant provisioning contract | Read controlPlaneService.ts provisionTenant() body fields vs admin/tenantProvision.ts Zod schema side-by-side | HIGH — if confirmed broken, provisioning silently fails Zod validation; user-blocking | VERIFY_REQUIRED (CROSS_REPORT_CONFLICT) | VER-001: PASS (correct) or FAIL (confirmed broken → promote to Wave 1) | ✅ CLOSED — 2026-03-06 · Verdict: FAIL · All 5 request fields mismatched; response shape incompatible; HTTP 400 on every call · TECS-FBW-PROV-001 → VALIDATED + promoted to Wave 1 |
| TECS-FBW-020 (VER-002) | Confirm WL Admin invite shell routing context | Read App.tsx INVITE_MEMBER state rendering — does it correctly handle WL_ADMIN context? | MEDIUM — shell context mismatch causes confusing UX | VERIFY_REQUIRED | VER-002: PASS (WL_ADMIN context correct) or FAIL (misrouted → Wave 1 fix) | ✅ CLOSED — 2026-03-06 · Verdict: FAIL · INVITE_MEMBER falls into EXPERIENCE case group; WhiteLabelShell rendered instead of WhiteLabelAdminShell; WL Admin chrome lost; onBack (TEAM_MGMT) also routes through EXPERIENCE group · TECS-FBW-020 → VALIDATED + promoted to Wave 1 |
| TECS-FBW-OA-001 (VER-003) | Enumerate OpenAPI tenant contract drift | List all paths in server/src/routes/tenant.ts; compare against openapi.tenant.json; produce delta | HIGH — governance debt; stale contract blocks QA tooling | VERIFY_REQUIRED | Delta list produced and appended to gap register | ⏳ Pending |
| TECS-FBW-OA-002 (VER-004) | Enumerate OpenAPI control-plane contract drift | List all paths in server/src/routes/control.ts; compare against openapi.control-plane.json; produce delta | HIGH — governance debt | VERIFY_REQUIRED | Delta list produced and appended to gap register | ⏳ Pending |
| TECS-FBW-AT-006 (VER-005) | Confirm order status UI role-gating | Read EXPOrdersPanel.tsx role-gating on PATCH status-transition action buttons | MEDIUM — non-admin users may see buttons that return 403 | VERIFY_REQUIRED | VER-005: PASS (buttons role-gated) or FAIL (visible to all → Wave 1 fix) | ✅ CLOSED — 2026-03-07 · Verdict: FAIL · All 3 buttons (Confirm/Fulfill/Cancel) visible to all authenticated EXPERIENCE users; Props contains only onBack; no role source; file header explicitly stated “client-side we show actions to all users and rely on the server gate” · TECS-FBW-AT-006 → VALIDATED + promoted to Wave 1 → implemented (GOVERNANCE-SYNC-106 · commit b01fcd3) |
| TECS-FBW-AUTH-001 (VER-006) | Confirm tenant login seeded picker still present | Read AuthFlows.tsx — confirm seeded/hardcoded tenant IDs; confirm TODO resolver comment | MEDIUM — if still present, auth flow is dev-only stub | VERIFY_REQUIRED | VER-006: PASS (resolver implemented) or FAIL (stub present → classify Wave 5) | ⏳ Pending |
| TECS-FBW-RLS-001 (VER-007) | Draft system-level RLS-only posture governance statement | Review Q2 tracker §12.2 pattern; identify all routes relying on RLS-only; draft governance statement | MEDIUM — posture clarity needed before Wave 3 route additions | VERIFY_REQUIRED | System-level governance statement drafted and appended to gap register | ⏳ Pending |
| U-001 (VER-008) | Locate /api/ai/* route file; confirm auth posture | Search server/src/routes/ for AI inference route file; confirm SUPER_ADMIN gating | MEDIUM — unauthorized AI access risk | VERIFY_REQUIRED | Auth posture confirmed or blocker filed | ⏳ Pending |
| U-002 (VER-009) | Read admin/tenantProvision.ts auth guard in full | Read the complete auth guard section; confirm SUPER_ADMIN enforcement path | LOW — GOVERNANCE-SYNC-035 CI guard already confirmed; this is belt-and-suspenders | VERIFY_REQUIRED | Full read completed; no unexpected auth bypass found | ⏳ Pending |
| U-004 (VER-010) | Read WLOrdersPanel.tsx lines 200–480 for role-gating | Inspect WLOrdersPanel.tsx mid-section for role-based conditional rendering | LOW | VERIFY_REQUIRED | Role-gating presence confirmed or gap filed | ⏳ Pending |

---

## Wave 1 — Ship-Blocking Runtime Fixes + Lane A

**Gate:** No `$undefined` price renders; cart MOQ error visible to user; post-checkout orderId not discarded.  
**Dependency:** VER-001 resolved (2026-03-06 · Verdict: FAIL) — TECS-FBW-PROV-001 confirmed broken and promoted to Wave 1. Fix must align both request contract (`ProvisionTenantRequest`) and response contract (`ProvisionTenantResponse`) in services/controlPlaneService.ts.

| ID | Objective | Affected Files | Risk | Merged Status | Exit Criteria | Status |
|---|---|---|---|---|---|---|
| TECS-FBW-011 | Fix `basePrice` → `price` — SHIP BLOCKER | App.tsx (3 render sites); services/catalogService.ts (CatalogItem interface); components/WhiteLabelAdmin/WLCollectionsPanel.tsx (4th site discovered at typecheck) | CRITICAL — every catalog item shows `$undefined.00` across all shells | VALIDATED | All catalog price renders display numeric values; no `p.basePrice` references remain | ✅ GOVERNANCE-SYNC-096 · 2026-03-06 · typecheck EXIT 0 · lint EXIT 0 (scoped) · parallel-safe ship-blocker override · next: VER-001 |
| TECS-FBW-LINT-001 | Fix middleware.ts ESLint Edge Runtime globals — root lint gate | eslint.config.js (targeted override block for middleware.ts only) | LOW — root `pnpm run lint` failed; no unrelated code risk | REPO-GATE | `pnpm run lint` EXIT 0; no blanket suppressions; middleware.ts unchanged | ✅ GOVERNANCE-SYNC-097 · 2026-03-06 · lint EXIT 0 · typecheck EXIT 0 · eslint.config.js only · next: VER-001 |
| TECS-FBW-PROV-001 | Fix provisionTenant() request + response contract mismatch | services/controlPlaneService.ts; components/ControlPlane/TenantRegistry.tsx; server/src/routes/admin/tenantProvision.ts (doc-only) | HIGH — tenant creation returns HTTP 400 on every invocation; deterministic failure | VALIDATED (VER-001 FAIL confirmed 2026-03-06) | `ProvisionTenantRequest` fields match Zod schema {orgName,primaryAdminEmail,primaryAdminPassword}; `ProvisionTenantResponse` matches backend shape {orgId,slug,userId,membershipId}; successful tenant creation confirmed | ✅ CLOSED — GOVERNANCE-SYNC-099 · 2026-03-06 · typecheck EXIT 0 · lint EXIT 0 · next: VER-002 |
| TECS-FBW-014 | Add post-checkout ORDER_CONFIRMED state | App.tsx (ORDER_CONFIRMED appState + confirmedOrderId state + ORDER_CONFIRMED case in renderCurrentState + onCheckoutSuccess callback wired to Cart); components/Cart/Cart.tsx (SAME-UNIT NECESSARY EXPANSION — onCheckoutSuccess optional prop) | MEDIUM — orderId discarded; no user confirmation | PROVISIONAL | ORDER_CONFIRMED AppState renders orderId; navigation path to orders panel present | ✅ CLOSED — GOVERNANCE-SYNC-102 · 2026-03-07 · App.tsx + components/Cart/Cart.tsx · onCheckoutSuccess prop propagates CheckoutResult; ORDER_CONFIRMED full-screen confirm (orderId + View Orders + Continue Shopping); typecheck EXIT 0 · lint EXIT 0 · next: TECS-FBW-MOQ |
| TECS-FBW-MOQ | Surface MOQ_NOT_MET 422 to user | App.tsx (B2CAddToCartButton — addError state + inline error render) | MEDIUM — user gets silent failure on MOQ violation | PROVISIONAL | Inline rose-600 error text below Add to Cart button displays APIError.message (includes MOQ_NOT_MET reason from server) | ✅ CLOSED — GOVERNANCE-SYNC-103 · 2026-03-07 · App.tsx only · addError:string|null state; setAddError on APIError catch; inline <p> render; typecheck EXIT 0 · lint EXIT 0 · next: TECS-FBW-008 |
| TECS-FBW-008 | Wire WL Settings Custom Domain Connect button | components/Tenant/WhiteLabelSettings.tsx (onNavigateDomains prop + conditional domain card UI); App.tsx (BRANDING case wire: onNavigateDomains={() => setWlAdminView(‘DOMAINS’)}) | MEDIUM — dead CTA in EXPERIENCE shell Settings | VALIDATED | Connect button calls POST /api/tenant/domains OR is replaced with redirect to WL_ADMIN Domains panel | ✅ CLOSED — GOVERNANCE-SYNC-104 · 2026-03-07 · WhiteLabelSettings.tsx + App.tsx · dead input+button replaced with conditional nav-to-Domains button (WL_ADMIN) or informational note (EXPERIENCE); no duplicate CRUD; WLDomainsPanel.tsx unchanged; typecheck EXIT 0 · lint EXIT 0 · next: TECS-FBW-017 |
| TECS-FBW-017 | Defensive category grouping in WLCollectionsPanel | components/WhiteLabelAdmin/WLCollectionsPanel.tsx (inspection only — no change) | LOW — null category silently breaks grouping | PROVISIONAL | Null/undefined category handled; default group applied | ✅ CLOSED — GOVERNANCE-SYNC-105 · 2026-03-07 · governance-only; no code change; direct inspection confirms (item.category ?? ‘’).trim() || UNCATEGORISED already present; all acceptance criteria satisfied by existing implementation (GOVERNANCE-SYNC-066); next: VER-005 (gate for TECS-FBW-AT-006) |
| TECS-FBW-020 | Fix INVITE_MEMBER shell routing for WL_ADMIN | App.tsx (wlAdminInviting state + renderWLAdminContent early-return + onViewChange reset) | MEDIUM — shell context mismatch; WL Admin chrome replaced by storefront shell | VALIDATED (VER-002 FAIL confirmed 2026-03-06) | INVITE_MEMBER state renders inside WhiteLabelAdminShell; back navigation returns to WL Admin STAFF panel (not EXPERIENCE); no shell chrome loss | ✅ CLOSED — GOVERNANCE-SYNC-101 · 2026-03-06 · App.tsx · wlAdminInviting bool substate; renderWLAdminContent early-return + STAFF→setWlAdminInviting(true); onViewChange resets substate on nav change · typecheck EXIT 0 · lint EXIT 0 · next: TECS-FBW-014 |
| TECS-FBW-AT-006 (if VER-005 FAIL) | Gate order status buttons by auth role | components/Tenant/EXPOrdersPanel.tsx | MEDIUM — non-admin users see 403-bound buttons | VERIFY_REQUIRED → promote if FAIL | Status transition buttons hidden/disabled for MEMBER and VIEWER roles | ✅ CLOSED — GOVERNANCE-SYNC-106 · 2026-03-07 · EXPOrdersPanel.tsx only · getCurrentUser() called in Promise.all with orders fetch (.catch()→null safe-fail); userRole:string|null state; canManageOrders==='OWNER'||’ADMIN'; actions.length===0||!canManageOrders→dash cell; OWNER/ADMIN unchanged; no App.tsx change; no backend change; typecheck EXIT 0 · lint EXIT 0 · commit b01fcd3 · 🏁 WAVE 1 IMPLEMENTATION COMPLETE (all assigned units closed) |

---

## Wave 2 — Finance/Compliance/Dispute Authority Mutations

**Gate:** Approve/reject/resolve/escalate wired + confirm-before-submit UI present in all three panels.  
**Dependency:** Wave 1 complete.

| ID | Objective | Affected Files | Risk | Merged Status | Exit Criteria | Status |
|---|---|---|---|---|---|---|
| TECS-FBW-001 | Add authority mutation methods + confirm UI — FinanceOps | services/controlPlaneService.ts; components/ControlPlane/FinanceOps.tsx | HIGH — payout approvals completely dark; SUPER_ADMIN cannot act | VALIDATED | approvePayoutMutation(), rejectPayoutMutation() in controlPlaneService; confirm-before-submit modal in FinanceOps.tsx; POST calls succeed | ⏳ PENDING — Finance sub-unit not yet implemented; `approvePayoutMutation()` / `rejectPayoutMutation()` absent from `services/controlPlaneService.ts`; confirm-before-submit UI absent from `components/ControlPlane/FinanceOps.tsx` · Audit Report §2A · gap-register TECS-FBW-001 detail |
| TECS-FBW-001 | Add authority mutation methods + confirm UI — ComplianceQueue | services/controlPlaneService.ts; components/ControlPlane/ComplianceQueue.tsx; services/adminApiClient.ts (SAME-UNIT NECESSARY EXPANSION — adminPost lacked per-call extra-header support; adminPostWithHeaders added; realm guard preserved) | HIGH — compliance approvals dark | VALIDATED | approveComplianceRequest(), rejectComplianceRequest() wired; confirm UI present | ✅ CLOSED — GOVERNANCE-SYNC-107 · 2026-03-07 · 3 files changed · adminApiClient.ts SAME-UNIT EXPANSION · ComplianceAuthorityBody {reason?,notes?}; window.crypto.randomUUID() per action click; PendingAction state; confirm dialog with reason/notes/error; success re-fetches list; 200 replay = success · typecheck EXIT 0 · lint EXIT 0 · git diff --name-only: 3 files only · openapi.control-plane.json NOT modified (routes already present) · next: TECS-FBW-001 Finance sub-unit |
| TECS-FBW-001 | Add authority mutation methods + confirm UI — DisputeCases | services/controlPlaneService.ts; components/ControlPlane/DisputeCases.tsx | HIGH — dispute resolution dark | VALIDATED | resolveDispute(), escalateDispute() wired; confirm UI present | ⏳ PENDING — Disputes sub-unit not yet implemented; `resolveDispute()` / `escalateDispute()` absent from `services/controlPlaneService.ts`; confirm-before-submit UI absent from `components/ControlPlane/DisputeCases.tsx` · Audit Report §2A · gap-register TECS-FBW-001 detail |

> **Wave 2 Sub-Unit Summary — corrected 2026-03-09 (Audit Report §2A · gap-register TECS-FBW-001 detail):**

| TECS-FBW-001 Sub-Unit | Status | Evidence |
|---|---|---|
| Compliance | ✅ CLOSED | GOVERNANCE-SYNC-107 · 2026-03-07 |
| Finance | ⏳ PENDING | Audit Report §2A · gap-register TECS-FBW-001 detail |
| Disputes | ⏳ PENDING | Audit Report §2A · gap-register TECS-FBW-001 detail |

---

## Wave 3 — G-017/G-018/G-019-Settlements/G-022 Tenant Panel Suite

**Gate:** Trade, Escrow, Settlement, Escalation panels navigable from expView and admin shell; D-017-A and D-020-B constraints verified.  
**Dependency:** Wave 2 complete.

| ID | Objective | New Files | Risk | Merged Status | Constraints | Exit Criteria | Status |
|---|---|---|---|---|---|---|---|
| TECS-FBW-002 | Create G-017 Trades frontend surface — tenant + admin | services/controlPlaneService.ts (Trade types + listTrades()); components/ControlPlane/TradeOversight.tsx (NEW); App.tsx; layouts/SuperAdminShell.tsx (SAME-UNIT NECESSARY EXPANSION); shared/contracts/openapi.control-plane.json (SAME-UNIT NECESSARY EXPANSION) | HIGH — G-017 backend fully idle from user's perspective | VALIDATED | D-017-A: tenantId must NOT be in request body; z.never() guard server-side; query-param-only in listTrades() | TRADES admin view navigable; read-only table; loading/error/empty states; no mutation controls; OpenAPI spec updated; D-017-A constraint explicit in code | TECS-FBW-002-A: ✅ CLOSED (GOVERNANCE-SYNC-110 · typecheck EXIT 0 · lint EXIT 0); TECS-FBW-002-B: 🚫 BLOCKED — GET /api/tenant/trades tenant-plane route does not exist; prerequisite: design + implement backend GET route before tenant panel (TradesPanel.tsx) can begin |
| TECS-FBW-003 | Create G-018 Escrow frontend surface | services/escrowService.ts (NEW); components/Tenant/EscrowPanel.tsx (NEW); App.tsx; layouts/Shells.tsx (SUNE); shared/contracts/openapi.tenant.json (SUNE) | HIGH — escrow dark from tenant UI | VALIDATED | D-020-B: no stored balance field assumption | EscrowPanel navigable; tenant can view escrows (read-only) | TECS-FBW-003-A: ✅ CLOSED (GOVERNANCE-SYNC-111 · typecheck EXIT 0 · lint EXIT 0); TECS-FBW-003-B: 🔵 FUTURE SCOPE — escrow mutations + detail view |
| TECS-FBW-004 | Create G-019 Settlement frontend with preview-confirm flow | services/settlementService.ts (NEW); components/Tenant/SettlementPreview.tsx (NEW); App.tsx (SUNE); layouts/Shells.tsx (SUNE); shared/contracts/openapi.tenant.json (SUNE) | HIGH — settlement dark from tenant UI | VALIDATED | D-020-B: preview step before commit required; D-017-A: no tenantId in body; actorType TENANT_USER | Preview renders before commit; settlement POST succeeds | ✅ CLOSED (GOVERNANCE-SYNC-113 · 2026-03-07 · typecheck EXIT 0 · lint EXIT 0 · 5 files: services/settlementService.ts NEW + components/Tenant/SettlementPreview.tsx NEW + 3 SUNE: App.tsx + layouts/Shells.tsx + openapi.tenant.json); two-phase flow; canConfirm gate enforces D-020-B; all settlement error codes surfaced; 🏁 WAVE 3 GATE CLOSED — unblocked units: TECS-FBW-002-A ✅ · TECS-FBW-003-A ✅ · TECS-FBW-006-A ✅ · TECS-FBW-004 ✅; TECS-FBW-002-B 🚫 BLOCKED (backend dependency; not Wave 3 gate prerequisite); next: TECS-FBW-005 (Wave 4) |
| TECS-FBW-006 | Create G-022 Escalation frontend — tenant + separate admin panel | services/escalationService.ts (or extend); components/Tenant/EscalationsPanel.tsx; components/ControlPlane/EscalationOversight.tsx | HIGH — G-022 backend fully idle; DisputeCases.tsx MUST NOT be repurposed | VALIDATED | Escalation adminView MUST be separate from DisputeCases | Escalation panels navigable; upgrade + resolve transitions wired for admin; misrouting in DisputeCases confirmed not present | TECS-FBW-006-A: ✅ CLOSED (GOVERNANCE-SYNC-112 · 2026-03-07 · typecheck EXIT 0 · lint EXIT 0 · 9 files: services/escalationService.ts NEW + components/Tenant/EscalationsPanel.tsx NEW + components/ControlPlane/EscalationOversight.tsx NEW + 6 SUNE: services/controlPlaneService.ts + layouts/Shells.tsx + layouts/SuperAdminShell.tsx + App.tsx + openapi.control-plane.json + openapi.tenant.json); both planes read-only; orgId input-gate on control plane; freezeRecommendation informational only (D-022-C); "misrouting" claim disproved — DisputeCases.tsx correctly calls disputes domain, unmodified; TECS-FBW-006-B: 🔵 FUTURE SCOPE — escalation mutations (upgrade/resolve/override) |

---

## Wave 4 — G-016/G-019-Certs/G-022-CartSummaries + Supplementary Panels

**Gate:** Certifications, Traceability CRUD, CartSummaries, Tenant AuditLogs all reachable from their respective shells.  
**Dependency:** Wave 3 complete.

| ID | Objective | New Files | Risk | Merged Status | Exit Criteria | Status |
|---|---|---|---|---|---|---|
| TECS-FBW-005 | Create G-019 Certifications frontend surface | services/certificationService.ts (NEW); components/Tenant/CertificationsPanel.tsx (NEW); components/ControlPlane/CertificationsAdmin.tsx (NEW); App.tsx (SUNE); layouts/Shells.tsx (SUNE); layouts/SuperAdminShell.tsx (SUNE); shared/contracts/openapi.tenant.json (SUNE); shared/contracts/openapi.control-plane.json (SUNE) | HIGH — certification lifecycle dark from tenant UI | VALIDATED | CERTIFICATIONS expView; create/view/transition wired; admin view present | ✅ CLOSED (GOVERNANCE-SYNC-114 · 2026-03-07 · typecheck EXIT 0 · lint EXIT 0 · 8 files: 3 NEW + 5 SUNE; D-017-A + D-020-C + D-020-D + D-022-C satisfied; tenant LIST/CREATE/DETAIL/TRANSITION panel + ControlPlane read-only admin surface; AggregatorShell dead button replaced; DPPPassport.tsx + ComplianceQueue.tsx untouched; 🏁 WAVE 4 FIRST UNIT CLOSED; next: TECS-FBW-015 G-016 Traceability CRUD) |
| TECS-FBW-015 | Create G-016 Traceability CRUD frontend surface | services/traceabilityService.ts; components/Tenant/TraceabilityPanel.tsx (or extend DPPPassport.tsx) | HIGH — traceability data creation dark; DPP reads work but not creation | VALIDATED | Node/edge creation forms present; connected to POST /api/tenant/traceability/nodes and /edges | ✅ CLOSED (GOVERNANCE-SYNC-115 · 2026-03-07 · commit df2cc638 · typecheck EXIT 0 · lint EXIT 0 · 8 files: 3 NEW + 5 SUNE; D-017-A: orgId absent from all frontend request bodies; Phase A: no UPDATE/DELETE controls; DPPPassport.tsx untouched; tenant LIST/CREATE/DETAIL + 1-hop neighbors panel + ControlPlane read-only cross-tenant inspection; all 4 shells wired via ShellProps.onNavigateTraceability; openapi.tenant.json 5 paths + openapi.control-plane.json 2 paths appended) |
| TECS-FBW-007 | Create CartSummaries control-plane panel | components/ControlPlane/CartSummariesPanel.tsx; App.tsx CART_SUMMARIES AdminView state | MEDIUM — admin can't see live cart data | VALIDATED | CartSummariesPanel navigable from admin shell; existing service methods wired | ✅ CLOSED (GOVERNANCE-SYNC-116 · 2026-03-08 · typecheck EXIT 0 · lint EXIT 0 · 3 files: 1 NEW + 2 SUNE; search-on-demand, tenant_id required, cursor pagination, detail via getCartSummaryByCartId; controlPlaneService.ts untouched; no tenant-plane; no OpenAPI changes; no server changes; 🏁 WAVE 4 THIRD UNIT CLOSED; next: TECS-FBW-016 Tenant Audit Logs) |
| TECS-FBW-016 | Create Tenant Audit Logs UI | components/Tenant/TenantAuditLogs.tsx (NEW); App.tsx (SUNE); layouts/Shells.tsx (SUNE) | MEDIUM — tenants have no audit trail visibility | VALIDATED | Read-only audit trail list navigable from EXPERIENCE shell; GET /api/tenant/audit-logs called | ✅ CLOSED (GOVERNANCE-SYNC-117 · 2026-03-08 · typecheck EXIT 0 · lint EXIT 0 · 3 files: 1 NEW + 2 SUNE; TenantAuditLogs.tsx NEW — EXPERIENCE-only panel; tenantGet('/tenant/audit-logs'); createdAt, action, entity, entityId, actorType, realm displayed; beforeJson/afterJson/metadataJson omitted; LoadingState + ErrorState + EmptyState; no mutation controls; no filter/pagination UI; App.tsx SUNE — expView extended 'AUDIT_LOGS' + import + render branch + onNavigateAuditLogs prop; Shells.tsx SUNE — onNavigateAuditLogs in ShellProps + conditional Audit Log button in all 4 EXPERIENCE shells; WhiteLabelAdminShell untouched; 🏁 WAVE 4 COMPLETE — all units closed) |

---

## Wave 5 — Backend-Design-Required Items

**Gate:** Backend route design explicitly approved before any frontend work begins.  
**Dependency:** Wave 4 complete; explicit product/backend design approval for each item.

| ID | Objective | Prerequisite | Risk | Merged Status | Notes | Status |
|---|---|---|---|---|---|---|
| TECS-FBW-012 | TeamManagement Edit Access — role-change modal + backend route | Backend: PATCH /api/tenant/memberships/:id route designed and implemented | MEDIUM — dead Edit Access button; no backend route | VALIDATED | Do not open memberships route without explicit approval; UI change follows backend change | ❌ Not started (backend design gate) |
| TECS-FBW-ADMINRBAC | AdminRBAC invite + revoke authority actions | Backend: /api/control/admin-users route designed and implemented | HIGH — no auditable admin provisioning | REQUIRES_BACKEND_DESIGN | Security posture concern; must not proceed without explicit product approval | ❌ Not started (backend design gate) |
| TECS-FBW-AIGOVERNANCE | AI Governance authority actions (cap, kill switch, registry) | Backend: PUT /api/control/ai-budget/:tenantId + related routes designed (G-028 B1/B2/C1/C2/C3) | HIGH — AI control actions completely dark | REQUIRES_BACKEND_DESIGN | G-028 Deferred Wave 5+ (GOVERNANCE-SYNC-095); must coordinate with G-028 B/C wave | ❌ Not started (backend design gate) |
| TECS-FBW-013 | B2B Request Quote — product decision + backend route | Product decision made; backend quote endpoint designed | LOW — deferred by doctrine | DEFERRED | Keep UI visually disabled until product decision made; do not remove button | ❌ Deferred by product |
| TECS-FBW-AUTH-001 | Tenant login resolver endpoint | Backend: /api/public/tenants/resolve route designed and implemented | MEDIUM — if seeded picker confirmed (VER-006 FAIL) | VERIFY_REQUIRED | Deferred until VER-006 confirms hardcoded picker still present AND product decides to implement resolver | ❌ Not started (gated on VER-006) |

---

## Pre-Wave-5 Remediation Program — PRE-WAVE-5-REMEDIATION-001

**Registered:** 2026-03-08 — following completion of two independent repo-truth audits (Full TexQtic Platform Map audit + Navigation verification audit)  
**Authority:** Paresh  
**Classification:** Anti-drift — Pre-Wave-5  
**Status:** REGISTERED — Verification tranche must complete before implementation tranches begin  
**Governing program entry:** `governance/gap-register.md` → `PRE-WAVE-5-REMEDIATION-001`

### Reconciled Audit Conclusions

Two independent repo-truth audits were completed 2026-03-08. Together they produced a mixed picture that supersedes prior expansion assumptions:

| Finding Type | Governance Disposition |
|---|---|
| Agreed findings (both audits consistent) | Implementation-ready; assigned to wiring tranche sub-units |
| Verification-required conflicts (audits differ) | Must resolve by repo inspection before implementation — assigned to verification tranche |
| Dead visible UI (nav/actions with no wiring) | Must be hidden/gated before further expansion — assigned to UX correctness tranche |
| Backend-exists/UI-missing surfaces | Higher priority than net-new domain introduction — assigned to wiring tranche |
| Placeholder control-plane panels | Do not count as wired; must not anchor Wave 5 planning — assigned to PW5-U4 |

> **Anti-drift directive:** Old expansion planning must not continue blindly from pre-audit assumptions. Dead visible UI must be hidden or gated before further expansion. Backend-exists/UI-missing surfaces take priority over net-new domains.

---

### Sub-Unit Registry

#### Verification Tranche — Gate for all implementation tranches

| ID | Name | Verification Target | Status |
|---|---|---|---|
| PW5-V1 | DPP runtime verification | Confirm `GET /api/tenant/dpp/:nodeId` returns real data for a live tenant node; confirm manufacturer field omission per G-025-ORGS-RLS-001 state; do not claim runtime proof from typecheck/lint alone | ✅ VERIFIED — TECS Unit B1 (2026-03-09) · Verdict: PASS · Full static path confirmed UI→DB · Route registered: GET /api/tenant/dpp/:nodeId · 3 snapshot views confirmed in migrations (dpp_snapshot_products_v1 · dpp_snapshot_lineage_v1 · dpp_snapshot_certifications_v1) · SECURITY INVOKER + withDbContext + FORCE RLS · manufacturer fields restored (TECS 5C1 / migration 20260316000003) · Defect registered: PW5-V1-DEF-001 (openapi.tenant.json contract drift — documentation only) |
| PW5-V2 | Tenant Audit Logs runtime verification | Confirm `GET /api/tenant/audit-logs` returns real audit entries for a provisioned tenant; TenantAuditLogs.tsx renders correctly against live data; wired in GOVERNANCE-SYNC-117 but runtime call not recorded | ✅ VERIFIED + PW5-FIX-V2A CLOSED — 2026-03-08 (runtime: HTTP 401 unauth + HTTP 200 auth { logs:[], count:0 }; path mismatch '/tenant/audit-logs' → '/api/tenant/audit-logs' fixed in TenantAuditLogs.tsx; TSC_EXIT:0; Classification: WORKING) |
| PW5-V3 | TenantType source-of-truth verification | Confirm canonical `tenantType` derivation path in App.tsx post-GOVERNANCE-SYNC-118; confirm shell-routing logic reads the correct field from the tenant session object | ❌ FAIL — TECS Unit B2 (2026-03-09) · Enum mismatch confirmed across DB/Prisma/backend type/frontend enum · DB+Prisma enum: {B2B, B2C, INTERNAL} · Frontend enum: {AGGREGATOR, B2B, B2C, WHITE_LABEL} · AGGREGATOR + WHITE_LABEL unreachable via Prisma schema · INTERNAL has no frontend shell · Backend TenantType alias stale · 3 defects registered: PW5-V3-DEF-001 / PW5-V3-DEF-002 / PW5-V3-DEF-003 · Remediation required before Wave-5 entry · **B2-DESIGN COMPLETE (2026-03-09)** — Canonical model locked. Remediation path B2-REM-1..5 approved. PW5-V3 defects remain OPEN until B2-REM-1..5 implemented. · **B2-REM-1 ✅ CLOSED (2026-03-09)** — schema layer; commit d893524. **B2-REM-2 ✅ CLOSED (2026-03-10)** — backend serialization layer; commit efbce82; PW5-V3-DEF-003 CLOSED; PW5-V3-DEF-002 partially remediated (schema+backend layers); PW5-V3-DEF-001 unchanged (OPEN). PW5-V3 remains ❌ FAIL — B2-REM-3 / B2-REM-4 / B2-REM-5 pending. · **B2-REM-3 ✅ CLOSED (2026-03-10)** — frontend routing layer; commit a198256; `resolveExperienceShell(tenant_category, is_white_label)` introduced as sole shell routing authority; canonical identity fields consumed; `INTERNAL` explicitly covered via named rule; white-label routing regression fixed; silent `default:` fallback removed; PW5-V3-DEF-001 OPEN→**CLOSED**; PW5-V3-DEF-002 schema+backend+**frontend** layer complete; PW5-V3 remains ❌ FAIL — B2-REM-4 / B2-REM-5 pending. · **B2-REM-4 ✅ CLOSED (2026-03-10)** — OpenAPI contract layer; commit d5d6f84; `LoginSuccessResponse` + `MeSuccessResponse` schemas added to tenant contract; `TenantObject` schema added to control-plane contract; `POST /api/auth/login` + `POST /api/auth/tenant/login` + `GET /api/me` responses wired; `GET /api/control/tenants` + `GET /api/control/tenants/{id}` responses wired; legacy compat fields preserved with `deprecated: true`; provisioning endpoint intentionally unchanged; PW5-V3-DEF-002 schema+backend+frontend+**OpenAPI** layer complete; PW5-V3 remains ❌ FAIL — B2-REM-5 pending. · **B2-REM-5 ✅ CLOSED (2026-03-10)** — provisioning contract alignment (commit f53dd40) and runtime provisioning flow completion B2-REM-5A (commit 8f12b14) wiring canonical identity (`tenant_category`, `is_white_label`) through types → validation → service → Prisma create → frontend interface → TenantRegistry UI; **PW5-V3-DEF-002 FULLY REMEDIATED** across all five layers (schema + backend + frontend + OpenAPI + provisioning); tranche verification required before PASS. · **PW5-V3 ✅ PASS (2026-03-10)** — Tranche verification completed (TECS Tranche Verification Report — PW5-V3, 2026-03-10); DEF-001 CLOSED (routing), DEF-002 FULLY REMEDIATED (schema + backend + frontend + OpenAPI + provisioning), DEF-003 CLOSED (serialization); canonical identity model (`tenant_category`, `is_white_label`) confirmed as sole active identity model across schema, backend, frontend, provisioning, and contracts; residual cleanup items logged separately (deprecated enum + dead code content case). |
| PW5-V4 | Shell action verification | Walk every nav item in all 6 shells; confirm each renders a non-stub component; record dead nav items and broken routes | ✅ VERIFIED — TECS Unit B3 (2026-03-10) · Verdict: CONDITIONAL PASS → PASS after remediation · 5 experience shells + WL Admin shell fully mapped · All expView / AdminView states exhaustively covered · Cross-shell navigation intact · 5 defects classified (DEF-001 Medium, DEF-002 Medium, DEF-003/004/005 Low) · **B3-REM-1 ✅ CLOSED (2026-03-10)** — B2CShell header cart icon wired to `setShowCart(true)` via `onNavigateCart` prop (`ShellProps` extended, `<div>` → `<button onClick={onNavigateCart}>`); PW5-V4-DEF-001 CLOSED. · **B3-REM-2 ✅ CLOSED (2026-03-10)** — SuperAdminShell COMPLIANCE NavLink label corrected from "Certifications" → "Compliance Queue"; PW5-V4-DEF-002 CLOSED. · **B3-REM-3 ✅ CLOSED (2026-03-10)** — redundant `renderExperienceContent()` removed from App.tsx `props` object; EXPERIENCE render path computes once via JSX children only. · DEF-003/004/005 deferred to PW5-U tranche (not blocking navigation failures). · **PW5-V4 ✅ PASS (2026-03-10)** |

> **PW5-V1 and PW5-V2 — VERIFY FIRST:** These surfaces were wired in earlier waves (DPP: GOVERNANCE-SYNC-083; Tenant Audit Logs: GOVERNANCE-SYNC-117). typecheck EXIT 0 and lint EXIT 0 are necessary but not sufficient. Runtime call trace or server log evidence is required to close these units. Do not mark as implementation-complete based on repo inspection alone.

---

#### Pre-Wave-5 TenantType Canonicalization — B2-DESIGN Series

**B2-DESIGN — TenantType Canonicalization Decision — ✅ COMPLETE (2026-03-09)**

| Unit | Status | Date | Scope |
|---|---|---|---|
| B2-DESIGN | ✅ COMPLETE | 2026-03-09 | Design decision — Canonical model approved. APPROVED FOR REMEDIATION SEQUENCING. |
| B2-DESIGN-GOV | ✅ COMPLETE | 2026-03-09 | Governance documentation — Canonical model recorded in governance artifacts. |
| B2-REM-1 | ✅ CLOSED | 2026-03-09 | Schema / enum / migration — `AGGREGATOR` added to canonical `TenantType` Prisma enum; `is_white_label BOOLEAN NOT NULL DEFAULT false` added to `tenants` and `organizations`; legacy `WHITE_LABEL` `org_type` organization rows migrated to `B2B` + `is_white_label=true`; validation gates 1–5 PASS; one atomic commit d893524. **Audit annotation:** g026 + g028 syntax-only fixes applied as user-approved prerequisites to unblock `prisma migrate deploy` — zero functional change; these fixes are incidental to migration apply and are not part of B2-REM-1 design scope proper; no new gap row created. |
| B2-REM-2 | ✅ CLOSED | 2026-03-10 | Backend serialization / auth alignment — `tenant_category` + `is_white_label` emitted in `POST /api/auth/login` + `POST /api/auth/tenant/login` + `GET /api/me`; legacy `tenantType` / `tenant.type` preserved for compat; `getOrganizationIdentity()` extended with `is_white_label` select; fail-open org lookup added to dedicated tenant login; JWT payload unchanged `{userId, tenantId, role}`; 3 files: `database-context.ts` + `auth.ts` + `tenant.ts`; typecheck 0 errors; health HTTP 200; 7/7 integration tests PASS (315s); one atomic commit efbce82. **PW5-V3-DEF-003 ✅ CLOSED.** **PW5-V3-DEF-002 PARTIALLY REMEDIATED (schema+backend).** |
| B2-REM-3 | ✅ CLOSED | 2026-03-10 | Frontend enum / routing alignment — canonical identity fields (`tenant_category` + `is_white_label`) consumed from login/session response in frontend; `resolveExperienceShell(tenant_category, is_white_label)` introduced as sole shell routing authority (replaces raw enum switch); `INTERNAL` explicitly routed to `AggregatorShell` via named rule (not silent fallback); white-label routing regression fixed (`t.is_white_label === true` replaces stale `TenantType.WHITE_LABEL` identity check); silent `default:` fallback removed; unknown identity → explicit ⚠️ error UI; 4 files: `types.ts` + `services/authService.ts` + `services/controlPlaneService.ts` + `App.tsx`; 79 insertions / 35 deletions; one atomic commit a198256. **PW5-V3-DEF-001 ✅ CLOSED.** **PW5-V3-DEF-002 frontend layer complete (schema+backend+frontend).** |
| B2-REM-4 | ✅ CLOSED | 2026-03-10 | OpenAPI / contract synchronization — canonical identity fields `tenant_category` + `is_white_label` documented in OpenAPI contracts; `LoginSuccessResponse` + `MeSuccessResponse` schemas added to `openapi.tenant.json`; `TenantObject` schema added to `openapi.control-plane.json`; `POST /api/auth/login` + `POST /api/auth/tenant/login` + `GET /api/me` 200 responses wired to schemas; `GET /api/control/tenants` + `GET /api/control/tenants/{id}` 200 responses wired to `TenantObject`; legacy `tenantType` (in login response) + `type` (in `/api/me` tenant object) preserved with `deprecated: true`; `/api/control/tenants/provision` intentionally unchanged (B2-REM-5 scope); 2 files: `openapi.tenant.json` + `openapi.control-plane.json`; 171 insertions / 5 deletions; one atomic commit d5d6f84. **PW5-V3-DEF-002 PARTIALLY REMEDIATED (schema+backend+frontend+OpenAPI).** |
| B2-REM-5 | ✅ CLOSED | 2026-03-10 | Provisioning alignment — canonical identity fields `tenant_category` + `is_white_label` implemented across contract and runtime provisioning flow; OpenAPI provisioning request schema updated (commit f53dd40); runtime provisioning path aligned (commit 8f12b14) wiring canonical fields through backend types → Zod validation → route pass-through → Prisma create (`type` + `isWhiteLabel`) → frontend service interface → TenantRegistry provisioning UI (`tenant_category` select + `is_white_label` checkbox); 5 runtime files modified; canonical identity now persisted at provision time; **PW5-V3-DEF-002 FULLY REMEDIATED** (schema + backend + frontend + OpenAPI + provisioning layers complete). |

**Approved Canonical Model:**

| Axis | Field | Canonical Values | Rule |
|---|---|---|---|
| Identity | `tenant_category` | `AGGREGATOR` / `B2B` / `B2C` / `INTERNAL` | Sole canonical organizational identity. Replaces overloaded `org_type`. |
| Capability | `is_white_label` | `BOOLEAN NOT NULL DEFAULT false` | White Label is a deployment/capability flag — NOT a tenant type. |
| Experience | `resolveExperienceShell(tenant_category, is_white_label)` | Derived from axes 1 + 2 | Explicit policy function — no raw enum pass-through; silent `default:` fallback FORBIDDEN. |

**INTERNAL routing policy (locked):** `INTERNAL` → `AggregatorShell` via explicit named rule in `resolveExperienceShell()`. Never via silent fallback.

**Locked decision:** White Label cannot be elevated back to tenant category. This decision is permanent.

**Remediates:** PW5-V3-DEF-001 / PW5-V3-DEF-002 / PW5-V3-DEF-003 — pending B2-REM-1 through B2-REM-5.

**PW5-V3 state:** ✅ PASS — 2026-03-10. B2-REM-1..5 fully implemented. Tranche verification completed (TECS Tranche Verification Report — PW5-V3, 2026-03-10). Canonical identity model confirmed. DEF-001 / DEF-002 / DEF-003 all CLOSED.

---

#### Pre-Wave-5 Shell Navigation Remediation — B3 Series

**B3 — Shell Navigation Defect Remediation — ✅ COMPLETE (2026-03-10)**

| Unit | Status | Date | Scope |
|---|---|---|---|
| B3-REM-1 | ✅ CLOSED | 2026-03-10 | B2CShell cart icon wiring — `onNavigateCart?: () => void` added to `ShellProps`; B2CShell destructure updated; cart icon element changed from `<div>` to `<button onClick={onNavigateCart} title="Shopping Cart">`; `onNavigateCart: () => setShowCart(true)` wired in App.tsx `props` object; PW5-V4-DEF-001 CLOSED. |
| B3-REM-2 | ✅ CLOSED | 2026-03-10 | SuperAdminShell COMPLIANCE label corrected — `label="Certifications"` → `label="Compliance Queue"` for COMPLIANCE NavLink (routes to `ComplianceQueue`); PW5-V4-DEF-002 CLOSED. |
| B3-REM-3 | ✅ CLOSED | 2026-03-10 | Redundant `renderExperienceContent()` removed — `children: renderExperienceContent()` removed from App.tsx `props` spread object; EXPERIENCE state renders content exactly once via JSX children passed to `<ExperienceShell>`; no behavioral change; eliminates wasted computation. |

---

#### UX Correctness Tranche — Depends on PW5-V4

| ID | Name | Status | Note |
|---|---|---|---|
| PW5-U1 | B2C cart badge fix | ⏳ Pending | Cart item count badge not reflecting live CartContext state in certain nav paths |
| PW5-U2 | Dead tenant/storefront nav hide-gate | ⏳ Pending | Hide/disable nav items pointing to unimplemented stubs; do not delete from code |
| PW5-U3 | Dead control-plane action hide-gate | ⏳ Pending | Hide action buttons (AdminRBAC, AiGovernance) with no backend route; do not wire — gate only |
| PW5-U4 | Collapse static control-plane docs/spec panels | ⏳ Pending | Label or collapse ArchitectureBlueprints and similar static panels as non-operational |

#### Wiring Tranche — Depends on verification tranche

| ID | Name | Status | Note |
|---|---|---|---|
| PW5-W1 | Tenant Trades UI | ⏳ BACKEND DESIGN GATE | No `GET /api/tenant/trades` route exists; TECS-FBW-002-B blocked; do not begin frontend work without backend route design approval |
| PW5-W2 | Control-plane Escrow inspection | ⏳ Pending | Verify control-plane escrow routes in control.ts; wire admin read view if present |
| PW5-W3 | Control-plane Settlement inspection | ⏳ Pending | Verify control-plane settlement routes in control.ts; wire admin read view if present |
| PW5-W4 | Maker-Checker review console | ⏳ Pending | Verify pending_approvals admin review routes from G-021; wire console if present |

#### White-Label Tranche — Depends on verification tranche

| ID | Name | Status | Note |
|---|---|---|---|
| PW5-WL1 | WL storefront product grid | ⏳ Pending | Confirm end-to-end render with real catalog data from a provisioned WL tenant |
| PW5-WL2 | WL storefront collections/category rendering | ⏳ Pending | WLCollectionsPanel.tsx exists (GOVERNANCE-SYNC-105); confirm against live WL tenant data |
| PW5-WL3 | WL builder requirements re-baseline | ⏳ Pending | Re-baseline WL store builder requirements after PW5-WL1 + PW5-WL2 confirm repo state |

#### Planning Tranche — Depends on verification + UX tranches

| ID | Name | Status | Note |
|---|---|---|---|
| PW5-CP-PLAN | Control-plane re-baseline | ⏳ Pending | No control-plane expansion planning until verification + UX tranches complete |
| PW5-AI-PLAN | AI/event backbone re-baseline | ⏳ Pending | No Wave 5 AI architecture until verification tranche + this plan complete |

---

### Ordered Pre-Wave-5 Execution Sequence (Locked 2026-03-08)

Preserving the SEQUENCING-LOCK-PRE-WAVE-5 order already recorded in both `governance/gap-register.md` and `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` §9:

| Step | Name | Status |
|---|---|---|
| 1 | Platform wiring audit | ✅ COMPLETE — 2026-03-08 (Full TexQtic Platform Map audit) |
| 2 | Navigation verification | ✅ COMPLETE — 2026-03-08 (Navigation verification audit) |
| 3 | Control plane expansion planning | ⏳ Blocked — PW5-U3 + PW5-CP-PLAN prerequisites unmet (PW5-V4 ✅ PASS 2026-03-10; verification tranche fully complete) |
| 4 | Tenant admin dashboard completion | ⏳ Blocked — verification + wiring tranches must complete first |
| 5 | White-label store builder | ⏳ Blocked — PW5-WL1 + PW5-WL2 prerequisites unmet |
| 6 | AI / event backbone (Wave 5 architecture) | ⏳ BLOCKED — all gate conditions must be met |

### Wave 5 Architecture Block Conditions

Wave 5 architecture sequencing is **blocked** until all of the following are confirmed in governance:

1. **Verification tranche complete** — ✅ MET (2026-03-10) — PW5-V1 ✅ · PW5-V2 ✅ · PW5-V3 ✅ · PW5-V4 ✅ — all four verification units closed
2. **Dead UI gating tranche complete** — PW5-U2 (dead tenant nav) and PW5-U3 (dead control-plane actions) at minimum resolved to ✅
3. **Platform wiring truth reconciled in this tracker** — ordered sequence above updated to reflect ✅ completions

**No agent, no prompt, and no implementation sprint may begin Wave 5 architecture sequencing until these conditions are met.**

### Recommended Immediate Next Unit

**PW5-U2 / PW5-U3** — Dead UI gating tranche (UX Correctness)  
Reason: Verification tranche fully complete as of 2026-03-10 (PW5-V1 ✅ · PW5-V2 ✅ · PW5-V3 ✅ · PW5-V4 ✅). Wave 5 Architecture Block Condition 1 is now MET. The next unblocked gate is the Dead UI gating tranche. PW5-U2 (dead tenant/storefront nav hide-gate) and PW5-U3 (dead control-plane action hide-gate) are the two minimum units required to satisfy Wave 5 Architecture Block Condition 2 and unblock control-plane expansion planning (Step 3). PW5-U1 (B2C cart badge) and PW5-U4 (static panel collapse) may be sequenced alongside or immediately after without creating further blocking dependencies.

---

## Governance Closure Protocol

A gap row is marked ✅ **Complete** when ALL of the following are met:

1. Implementation merged to main
2. `GET /health` returns 200 after backend changes (or confirmed no backend change)
3. This tracker row updated to ✅ with GOVERNANCE-SYNC entry recorded
4. Gap register entry status updated to `CLOSED`
5. PROVISIONAL items: corresponding VER item must have resolved to PASS

---

## OpenAPI Update Obligation

For every Wave 1–4 row that adds or modifies an endpoint call:

- Confirm whether the affected endpoint is present in `openapi.tenant.json` or `openapi.control-plane.json`
- If absent add it in the same wave (ref: ARCHITECTURE-GOVERNANCE.md → OpenAPI Contract Governance)
- Record delta in VER-003 / VER-004 delta list

---

*No application code was modified in the production of this document.*  
*Document produced: 2026-03-06 · Governance baseline: GOVERNANCE-SYNC-095*
