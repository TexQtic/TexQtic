# TexQtic Implementation Tracker — Frontend-Backend Reachability Recovery Program (March 2026)

**Source:** `docs/governance/MASTER-IMPLEMENTATION-PLAN-2026-03.md` (Section 8)  
**Reconciliation artifact:** `docs/governance/audits/2026-03-audit-reconciliation-matrix.md`  
**Gap register section:** `governance/gap-register.md` → "Frontend-Backend Wiring Gap Audit — March 2026"  
**Baseline:** GOVERNANCE-SYNC-095 (last recorded high-water mark at tracker creation)  
**Date created:** 2026-03-06  
**RLS Maturity:** 5.0 / 5  
**Migrations:** 73 / 73 Applied  
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
| TECS-FBW-AT-006 (VER-005) | Confirm order status UI role-gating | Read EXPOrdersPanel.tsx role-gating on PATCH status-transition action buttons | MEDIUM — non-admin users may see buttons that return 403 | VERIFY_REQUIRED | VER-005: PASS (buttons role-gated) or FAIL (visible to all → Wave 1 fix) | ⏳ Pending |
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
| TECS-FBW-014 | Add post-checkout ORDER_CONFIRMED state | App.tsx (state machine); services/cartService.ts | MEDIUM — orderId discarded; no user confirmation | PROVISIONAL | ORDER_CONFIRMED AppState renders orderId; navigation path to orders panel present | ⏳ Pending |
| TECS-FBW-MOQ | Surface MOQ_NOT_MET 422 to user | Cart service call path; cart UI component | MEDIUM — user gets silent failure on MOQ violation | PROVISIONAL | Error toast or inline MOQ message displayed when cart add returns 422 | ⏳ Pending |
| TECS-FBW-008 | Wire WL Settings Custom Domain Connect button | components/Tenant/WhiteLabelSettings.tsx | MEDIUM — dead CTA in EXPERIENCE shell Settings | VALIDATED | Connect button calls POST /api/tenant/domains OR is replaced with redirect to WL_ADMIN Domains panel | ⏳ Pending |
| TECS-FBW-017 | Defensive category grouping in WLCollectionsPanel | components/Tenant/WLCollectionsPanel.tsx (or equivalent) | LOW — null category silently breaks grouping | PROVISIONAL | Null/undefined category handled; default group applied | ⏳ Pending |
| TECS-FBW-020 | Fix INVITE_MEMBER shell routing for WL_ADMIN | App.tsx (INVITE_MEMBER state rendering — main switch + renderWLAdminContent) | MEDIUM — shell context mismatch; WL Admin chrome replaced by storefront shell | VALIDATED (VER-002 FAIL confirmed 2026-03-06) | INVITE_MEMBER state renders inside WhiteLabelAdminShell; back navigation returns to WL Admin STAFF panel (not EXPERIENCE); no shell chrome loss | ⏳ Pending — **NEXT IMPLEMENTATION UNIT** |
| TECS-FBW-AT-006 (if VER-005 FAIL) | Gate order status buttons by auth role | components/Tenant/EXPOrdersPanel.tsx | MEDIUM — non-admin users see 403-bound buttons | VERIFY_REQUIRED → promote if FAIL | Status transition buttons hidden/disabled for MEMBER and VIEWER roles | ⏳ Pending (gated on VER-005) |

---

## Wave 2 — Finance/Compliance/Dispute Authority Mutations

**Gate:** Approve/reject/resolve/escalate wired + confirm-before-submit UI present in all three panels.  
**Dependency:** Wave 1 complete.

| ID | Objective | Affected Files | Risk | Merged Status | Exit Criteria | Status |
|---|---|---|---|---|---|---|
| TECS-FBW-001 | Add authority mutation methods + confirm UI — FinanceOps | services/controlPlaneService.ts; components/ControlPlane/FinanceOps.tsx | HIGH — payout approvals completely dark; SUPER_ADMIN cannot act | VALIDATED | approvePayoutMutation(), rejectPayoutMutation() in controlPlaneService; confirm-before-submit modal in FinanceOps.tsx; POST calls succeed | ⏳ Pending |
| TECS-FBW-001 | Add authority mutation methods + confirm UI — ComplianceQueue | services/controlPlaneService.ts; components/ControlPlane/ComplianceQueue.tsx | HIGH — compliance approvals dark | VALIDATED | approveComplianceRequest(), rejectComplianceRequest() wired; confirm UI present | ⏳ Pending |
| TECS-FBW-001 | Add authority mutation methods + confirm UI — DisputeCases | services/controlPlaneService.ts; components/ControlPlane/DisputeCases.tsx | HIGH — dispute resolution dark | VALIDATED | resolveDispute(), escalateDispute() wired; confirm UI present | ⏳ Pending |

---

## Wave 3 — G-017/G-018/G-019-Settlements/G-022 Tenant Panel Suite

**Gate:** Trade, Escrow, Settlement, Escalation panels navigable from expView and admin shell; D-017-A and D-020-B constraints verified.  
**Dependency:** Wave 2 complete.

| ID | Objective | New Files | Risk | Merged Status | Constraints | Exit Criteria | Status |
|---|---|---|---|---|---|---|---|
| TECS-FBW-002 | Create G-017 Trades frontend surface — tenant + admin | services/tradeService.ts; components/Tenant/TradesPanel.tsx; components/ControlPlane/TradeOversight.tsx | HIGH — G-017 backend fully idle from user's perspective | VALIDATED | D-017-A: tenantId must NOT be in request body | TRADES in expView; tenant can create/view trades; admin can view; D-017-A confirmed in service method | ⏳ Pending |
| TECS-FBW-003 | Create G-018 Escrow frontend surface | services/escrowService.ts; components/Tenant/EscrowPanel.tsx | HIGH — escrow dark from tenant UI | VALIDATED | D-020-B: no stored balance field assumption | EscrowPanel navigable; tenant can create/view escrows | ⏳ Pending |
| TECS-FBW-004 | Create G-019 Settlement frontend with preview-confirm flow | services/settlementService.ts; components/Tenant/SettlementPreview.tsx | HIGH — settlement dark from tenant UI | VALIDATED | D-020-B: preview step before commit required | Preview renders before commit; settlement POST succeeds | ⏳ Pending |
| TECS-FBW-006 | Create G-022 Escalation frontend — tenant + separate admin panel | services/escalationService.ts (or extend); components/Tenant/EscalationsPanel.tsx; components/ControlPlane/EscalationOversight.tsx | HIGH — G-022 backend fully idle; DisputeCases.tsx MUST NOT be repurposed | VALIDATED | Escalation adminView MUST be separate from DisputeCases | Escalation panels navigable; upgrade + resolve transitions wired for admin; misrouting in DisputeCases confirmed not present | ⏳ Pending |

---

## Wave 4 — G-016/G-019-Certs/G-022-CartSummaries + Supplementary Panels

**Gate:** Certifications, Traceability CRUD, CartSummaries, Tenant AuditLogs all reachable from their respective shells.  
**Dependency:** Wave 3 complete.

| ID | Objective | New Files | Risk | Merged Status | Exit Criteria | Status |
|---|---|---|---|---|---|---|
| TECS-FBW-005 | Create G-019 Certifications frontend surface | services/certificationService.ts; components/Tenant/CertificationsPanel.tsx; ControlPlane view | HIGH — certification lifecycle dark from tenant UI | VALIDATED | CERTIFICATIONS expView; create/view/transition wired; admin view present | ⏳ Pending |
| TECS-FBW-015 | Create G-016 Traceability CRUD frontend surface | services/traceabilityService.ts; components/Tenant/TraceabilityPanel.tsx (or extend DPPPassport.tsx) | HIGH — traceability data creation dark; DPP reads work but not creation | VALIDATED | Node/edge creation forms present; connected to POST /api/tenant/traceability/nodes and /edges | ⏳ Pending |
| TECS-FBW-007 | Create CartSummaries control-plane panel | components/ControlPlane/CartSummariesPanel.tsx; App.tsx CART_SUMMARIES AdminView state | MEDIUM — admin can't see live cart data | VALIDATED | CartSummariesPanel navigable from admin shell; existing service methods wired | ⏳ Pending |
| TECS-FBW-016 | Create Tenant Audit Logs UI | components/Tenant/TenantAuditLogs.tsx (or equivalent) | MEDIUM — tenants have no audit trail visibility | PROVISIONAL | Read-only audit trail list navigable from EXPERIENCE shell; GET /api/tenant/audit-logs called | ⏳ Pending |

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
