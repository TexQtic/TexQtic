# Audit Reconciliation Matrix — CODEX vs VS Code Copilot (March 2026)

**Produced:** 2026-03-06  
**Classification:** Governance-Only Document — No Application Code Modified  
**Source Audits:**
- `docs/governance/audits/2026-03-codex-frontend-backend-audit.md` (Codex AI, read-only, March 2026)
- `docs/governance/audits/2026-03-copilot-frontend-backend-audit.md` (VS Code Copilot TECS Audit Report, March 2026)

**Baseline governance state:** GOVERNANCE-SYNC-095 · 73/73 migrations applied · RLS Maturity 5.0/5 · Doctrine v1.4

---

## 1. Reconciliation Method

For every finding from both reports the following classification rules apply:

| Label | Rule |
|---|---|
| `RECONFIRMED_BY_CODEX_AND_COPILOT` | Both reports identify the same issue with consistent characterisation |
| `NEW_IN_CODEX` | Only Codex identified the issue; Copilot omitted or did not inspect the surface |
| `NEW_IN_COPILOT` | Only Copilot identified the issue; Codex omitted or did not inspect the surface |
| `CROSS_REPORT_CONFLICT` | Reports assign materially different verdicts to the same surface |
| `DEFERRED_BY_DOCTRINE` | Both reports agree the surface is an intentional phase boundary or product decision |

Merged statuses:

| Status | Meaning |
|---|---|
| `VALIDATED` | Corroborated by both reports; ready for implementation wave assignment |
| `PROVISIONAL` | Single-report only; no contradiction; acceptable for wave assignment pending verification |
| `VERIFY_REQUIRED` | Conflict between reports, or insufficient evidence to safely classify; must be verified before implementation |
| `DEFERRED` | Intentional product boundary; no implementation until phase gate opens |
| `REQUIRES_BACKEND_DESIGN` | Cannot wire frontend-first; backend route/product design prerequisite |

---

## 2. Evidence-Backed Reconciliation Worksheet

Evidence references are quoted from the source document using section + short anchor.

### 2A. Corroborated Findings (Both Reports)

**TECS-FBW-001 — Finance/Compliance/Dispute Authority Mutations**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.1 "Control-plane finance/compliance/dispute actions" | §4 F-009 "Finance / Compliance / Dispute Authority Mutations" |
| Key anchor | "backend also exposes approve/reject/resolve/escalate POST routes requiring idempotency headers → no frontend trigger" | "no approve/reject button. No service function" — all 3 panels confirmed |
| Finding type | frontend pending / backend complete | BACKEND_COMPLETE / FRONTEND_ABSENT |
| Overlap status | Same issue — identical characterisation |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-002 — G-017 Trades Frontend Absent**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.2 "advanced operational flows (trades…)" | §4 F-001 "G-017 Trades — Backend Complete, Zero Frontend" |
| Key anchor | "Route plugins are registered and implemented; no frontend consumers found" for trades.g017.ts | "controlPlaneService.ts (494 lines, read in full) contains zero trade functions" |
| Overlap status | Same issue |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-003 — G-018 Escrow Frontend Absent**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.2 | §4 F-002 "G-018 Escrow — Backend Complete, Zero Frontend" |
| Key anchor | "escrow.g018.ts … no frontend consumers" | "7 endpoints confirmed … Zero functions in services. Zero components" |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-004 — G-019 Settlements Frontend Absent**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.2 | §4 F-003 "G-019 Settlements — Backend Complete, Zero Frontend" |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-005 — G-019 Certifications Frontend Absent**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.2 | §4 F-004 "G-019 Certifications — Backend Complete, Zero Frontend" |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-006 — G-022 Escalations Frontend Absent + Control Plane Misrouted**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.2 "escalations/traceability" | §4 F-006 "G-022 Escalation — Backend Complete, Zero Tenant Frontend; Control Plane Wired to Wrong Endpoint" |
| Key anchor | "no frontend consumers found" | "DisputeCases.tsx is wired to getDisputes() → GET /api/control/disputes … not /api/control/escalations" |
| Overlap notes | Copilot adds specific misrouting detail (disputes≠escalations) not explicitly stated by Codex; substance is the same gap |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-007 — Cart Summaries Dead Service Code**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.3 | §6 F-007 "Cart Summaries — Service Functions Exist, No UI Consumer" |
| Key anchor | "no component imports those methods" | "No AdminView state maps to a cart summaries panel. The functions are dead service code" |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-008 — WhiteLabelSettings Custom Domain Dead in EXPERIENCE Shell**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §6.3 "White-label settings custom domain card" | §6 F-013 "WhiteLabelSettings 'Custom Domain' — Dead UI in EXPERIENCE Shell" |
| Key anchor | "Domain input/Connect button are non-wired in settings view" | "no onClick handler and calls no API" |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-012 — TeamManagement Edit Access Dead Button**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §6.2 "Team Management access editing" | §6 F-014 "TeamManagement 'Edit Access' — Dead Button, No Backend Route" |
| Key anchor | "Edit Access button has no handler and no corresponding update route" | "no onClick. No role-change API exists (PATCH /api/tenant/memberships/:id is absent)" |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |
| Note | Also confirmed by Q2 tracker Section 12.3: "Membership edit (role update) ❌ Not implemented" |

---

**TECS-FBW-015 — G-016 Traceability CRUD Frontend Absent**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §5.2 "traceability" row | §4 F-005 "G-016 Traceability CRUD — Backend Complete, Only Snapshot Consumed" |
| Key anchor | "no frontend consumers found" | "Zero traceability CRUD functions in services. Zero components for node/edge creation" |
| Additional note | Copilot notes DPPPassport consumes DPP snapshot (GET /api/tenant/dpp/:nodeId) — a different endpoint, not the CRUD surface | Codex and Copilot agree on the gap |
| Merged classification | `RECONFIRMED_BY_CODEX_AND_COPILOT` |
| Merged status | `VALIDATED` |
| Confidence | HIGH |

---

**TECS-FBW-STUB-001 — Intentional Placeholder Surfaces (WL/Admin Architecture/Skeleton)**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §9.1 "WL admin/product surfaces and control-plane architecture pages" | §9 S-001 through S-005 |
| Key anchor | "explicitly placeholder/skeleton content with non-functional buttons" | "intentional product phase boundaries rather than implementation oversights" |
| Merged classification | `DEFERRED_BY_DOCTRINE` |
| Merged status | `DEFERRED` |
| Confidence | HIGH |

---

### 2B. Copilot-Only Findings (New in Copilot — No Contradiction)

**TECS-FBW-011 — Catalog basePrice vs price — CRITICAL Runtime Bug**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §4 F-012 / §7 CM-001 | Not identified |
| Key anchor | "CatalogItem interface uses basePrice but backend returns price. Every catalog item renders as $undefined.00." | Codex identified catalog as "⚠️ Contract mismatch" in Section 3 table but characterised it as a field name issue without specifying basePrice/price; did not elevate to CRITICAL |
| Reasoning | The Copilot finding is specific, has direct code evidence (interface declaration + render sites), and is not contradicted by Codex. Codex Table §3 lists "Catalog READ → ⚠️ Contract mismatch" which is consistent but less specific. Treating as NEW_IN_COPILOT given the specificity gap. |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `VALIDATED` (no contradiction; code evidence is explicit) |
| Confidence | HIGH — CRITICAL PRIORITY |

---

**TECS-FBW-013 — B2B Request Quote Dead Button**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §6 F-015 | §10 "uncertain findings" — uncertain, not confirmed gap |
| Key anchor | "No onClick, no service call, no backend quote/inquiry endpoint" | "Could be intentional product gating" |
| Reasoning | Copilot confirmed no onClick. Codex flagged as uncertain. No contradiction — Copilot provides more specific evidence. |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `DEFERRED` (product gating intent; Copilot Section 9 S-003 classifies as "Product Boundary Under Review") |
| Confidence | MEDIUM |

---

**TECS-FBW-014 — Post-Checkout No Order Confirmation State**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §6 F-016 | Not identified |
| Key anchor | "checkout() → POST /api/tenant/checkout returns {orderId, message}. After the call succeeds, the application closes the cart … orderId is discarded." | Not inspected |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `PROVISIONAL` |
| Confidence | HIGH |

---

**TECS-FBW-016 — Tenant Audit Logs Backend Present, No Tenant UI**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §3 table row "Tenant audit logs" | Not distinctly identified |
| Key anchor | "GET /api/tenant/audit-logs → ❌ Missing → ❌ Missing → ❌ Gap" | Not inspected |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `PROVISIONAL` |
| Confidence | HIGH |

---

**TECS-FBW-017 — CatalogItem.category Grouping May Fail**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §7 CM-002 | Not identified |
| Key anchor | "CatalogItem.category field is typed as category?: string (optional)" | Not inspected |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `PROVISIONAL` |
| Confidence | MEDIUM |

---

**TECS-FBW-018 — Plan BASIC→TRIAL Enum Misalignment**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §7 CM-003 | Not identified |
| Key anchor | "backend returns plan: 'BASIC'; frontend type uses 'TRIAL'" | Not inspected |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `PROVISIONAL` |
| Confidence | HIGH — but intentional mapping noted via code comment |

---

**TECS-FBW-AIGOVERNANCE — AI Governance Dead Authority Actions**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §4 F-011, §9 S-004 | Not distinctly identified |
| Key anchor | "No PUT /api/control/ai-budget/:tenantId … dead action buttons align with G-028" | Not inspected |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `REQUIRES_BACKEND_DESIGN` |
| Confidence | HIGH |

---

**TECS-FBW-ADMINRBAC — AdminRBAC No Backend Route**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §4 F-010, §9 S-001 | Not distinctly identified |
| Key anchor | "No route for /api/control/admin-users … renders from ADMIN_USERS — a compile-time constant" | Not inspected |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `REQUIRES_BACKEND_DESIGN` |
| Confidence | HIGH |

---

**TECS-FBW-MOQ — MOQ_NOT_MET 422 Missing UX**

| Attribute | Copilot Evidence | Codex Position |
|---|---|---|
| Source section | §11 P4.4 | Not identified |
| Key anchor | "POST /api/tenant/cart/items returns 422 MOQ_NOT_MET. Add a user-facing error toast" | Not inspected |
| Merged classification | `NEW_IN_COPILOT` |
| Merged status | `PROVISIONAL` |
| Confidence | MEDIUM |

---

### 2C. Codex-Only Findings (New in Codex — Not Contradicted)

**TECS-FBW-020 — WL Admin Invite Path Shell Routing**

| Attribute | Codex Evidence | Copilot Position |
|---|---|---|
| Source section | §6.1 "WL admin staff invite flow" | Not identified distinctly |
| Key anchor | "WL admin STAFF → TeamManagement.onInvite → setAppState('INVITE_MEMBER') → INVITE_MEMBER renders via EXPERIENCE shell branch" | Not inspected |
| Reasoning | Q2 tracker Section 12.4 confirms invite wiring was fixed in P-5/P-6, but that fix was in TeamManagement.tsx → InviteMemberForm.tsx. The shell routing for WL_ADMIN context specifically was not confirmed as fixed. Requires targeted verification. |
| Merged classification | `NEW_IN_CODEX` |
| Merged status | `VERIFY_REQUIRED` |
| Confidence | MEDIUM |

---

**TECS-FBW-OA-001 — OpenAPI Tenant Contract Drift**

| Attribute | Codex Evidence | Copilot Position |
|---|---|---|
| Source section | §7.1 "Tenant API contract coverage" | Not inspected (Copilot noted CM-003/004 field mismatches but did not audit OpenAPI files) |
| Key anchor | "openapi.tenant.json does not include multiple actively used tenant endpoints" | Not inspected |
| Merged classification | `NEW_IN_CODEX` |
| Merged status | `VERIFY_REQUIRED` |
| Confidence | HIGH (OpenAPI files were directly inspected by Codex) |

---

**TECS-FBW-OA-002 — OpenAPI Control-Plane Contract Drift**

| Attribute | Codex Evidence | Copilot Position |
|---|---|---|
| Source section | §7.2 "Control-plane API contract coverage" | Not inspected |
| Key anchor | "openapi.control-plane.json omits active GET endpoints (/finance/payouts, /compliance/requests, /disputes, /system/health, /whoami) and impersonation routes" | Not inspected |
| Merged classification | `NEW_IN_CODEX` |
| Merged status | `VERIFY_REQUIRED` |
| Confidence | HIGH |

---

**TECS-FBW-AT-006 — Order Status Transition Role Gating**

| Attribute | Codex Evidence | Copilot Position |
|---|---|---|
| Source section | §8.1 "Tenant order transitions in EXPERIENCE shell" | AT-001 confirmed realm enforcement correct — but this is a different surface (UI role-gating before PATCH attempt) |
| Key anchor | "UI exposes status transition actions broadly; backend enforces OWNER/ADMIN gate" | Not specifically flagged; Copilot confirmed order status PATCH is "✅ Wired" (Section 3 table) |
| Reasoning | Not a conflict — Copilot confirmed wiring exists; Codex identified the UX gap where non-admin tenants see actions they will be 403'd on. Two separate concerns. |
| Merged classification | `NEW_IN_CODEX` |
| Merged status | `VERIFY_REQUIRED` |
| Confidence | MEDIUM |

---

**TECS-FBW-AUTH-001 — Tenant Login Hardcoded Seeded Tenant Picker**

| Attribute | Codex Evidence | Copilot Position |
|---|---|---|
| Source section | §9.2 "Tenant login tenant selection" | Not identified |
| Key anchor | "auth form → seeded tenant IDs → login call; TODO references non-existent /api/public/tenants/resolve" | Not inspected |
| Merged classification | `NEW_IN_CODEX` |
| Merged status | `VERIFY_REQUIRED` |
| Confidence | HIGH |

---

**TECS-FBW-RLS-001 — RLS-Only Posture / App-Layer org_id Governance**

| Attribute | Codex Evidence | Copilot Position |
|---|---|---|
| Source section | §8.2 "Tenant scoping posture in route implementations" | AT-003 confirms org_id RLS correctly applied for escrow; AT-002 confirms tenantId from JWT — different angle |
| Key anchor | "Multiple tenant routes explicitly removed manual tenant filters and rely on RLS-only for boundary enforcement" | Q2 tracker Section 12.2: "GET /api/tenant/memberships does not apply a manual where: { tenantId } filter. RLS policies on the memberships table enforce tenant isolation via app.org_id. Defense in depth remains intact." |
| Reasoning | This is a governance posture question, not an implementation defect. The Q2 tracker documents the intentional decision for memberships. Codex raises the same question at the platform level. No conflict — governance clarification needed system-wide. |
| Merged classification | `NEW_IN_CODEX` |
| Merged status | `VERIFY_REQUIRED` |
| Confidence | MEDIUM |

---

### 2D. Cross-Report Conflicts

**TECS-FBW-PROV-001 — Tenant Provisioning Contract Alignment**

| Attribute | Codex Evidence | Copilot Evidence |
|---|---|---|
| Source section | §4.1 "Control-plane tenant provisioning" | §3 table row "Tenant provision" |
| Codex verdict | "contract mismatch — request validation will fail; frontend success parsing incompatible" — fields: {name,slug,type,ownerEmail,ownerPassword} vs backend {orgName,primaryAdminEmail,primaryAdminPassword} | "✅ Wired" — provisionTenant() listed as wired in feature area table |
| Conflict type | Codex inspected the field-level contract and found a mismatch. Copilot inspected the service wiring path (call exists) and marked it wired. Both can be simultaneously true: a call path exists but transmits wrong fields. |
| Merged classification | ~~`CROSS_REPORT_CONFLICT`~~ → **RESOLVED (VER-001 · 2026-03-06)** |
| Merged status | ~~`VERIFY_REQUIRED`~~ → **`VALIDATED`** |
| Confidence | HIGH — confirmed by direct file inspection |
| Resolution | VER-001 executed 2026-03-06 (read-only). **Codex §4.1 confirmed correct.** Copilot §3 "✅ Wired" classification superseded — call path exists but all 5 request fields are wrong and the response shape is incompatible. Deterministic HTTP 400 on every invocation. TECS-FBW-PROV-001 promoted to Wave 1 implementation. |

---

## 3. Reconciliation Summary Table

| Canonical ID | Short Title | Feature Area | Codex | Copilot | Merged Classification | Status | Confidence | Wave | Notes |
|---|---|---|---|---|---|---|---|---|---|
| TECS-FBW-001 | Finance/Compliance/Dispute Mutations | Admin authority | §5.1 pending | F-009 absent | RECONFIRMED | VALIDATED | HIGH | Wave 2 | |
| TECS-FBW-002 | G-017 Trades Frontend | Trade lifecycle | §5.2 absent | F-001 absent | RECONFIRMED | VALIDATED | HIGH | Wave 3 | |
| TECS-FBW-003 | G-018 Escrow Frontend | Escrow | §5.2 absent | F-002 absent | RECONFIRMED | VALIDATED | HIGH | Wave 3 | |
| TECS-FBW-004 | G-019 Settlements Frontend | Settlement | §5.2 absent | F-003 absent | RECONFIRMED | VALIDATED | HIGH | Wave 3 | |
| TECS-FBW-005 | G-019 Certifications Frontend | Certification | §5.2 absent | F-004 absent | RECONFIRMED | VALIDATED | HIGH | Wave 4 | |
| TECS-FBW-006 | G-022 Escalations Frontend + Misrouted | Escalation | §5.2 absent | F-006 absent+misrouted | RECONFIRMED | VALIDATED | HIGH | Wave 3 | Control plane uses disputes≠escalations |
| TECS-FBW-007 | Cart Summaries Dead Service | Marketplace ops | §5.3 dead | F-007 dead | RECONFIRMED | VALIDATED | HIGH | Wave 4 | |
| TECS-FBW-008 | WL Custom Domain Dead (EXPERIENCE) | White-label | §6.3 dead | F-013 dead | RECONFIRMED | VALIDATED | HIGH | Wave 1 | WLDomainsPanel.tsx has real wiring (GOVERNANCE-SYNC-093); EXPERIENCE shell Settings card is the gap |
| TECS-FBW-011 | Catalog basePrice vs price | Catalog display | §3 contract mismatch (low specificity) | F-012/CM-001 CRITICAL | NEW_IN_COPILOT | VALIDATED | HIGH | Wave 1 | $undefined.00 runtime bug — ship blocker |
| TECS-FBW-012 | Edit Access Dead Button | Membership | §6.2 dead | F-014 dead+no route | RECONFIRMED | VALIDATED | HIGH | Wave 5 | Confirmed by Q2 tracker §12.3 |
| TECS-FBW-013 | B2B Request Quote Dead | B2B commerce | §10 uncertain | F-015 / S-003 | NEW_IN_COPILOT | DEFERRED | MEDIUM | Wave 5 | Product decision pending |
| TECS-FBW-014 | Post-Checkout Missing Confirm | Commerce UX | Not inspected | F-016 | NEW_IN_COPILOT | ✅ CLOSED (GOVERNANCE-SYNC-102 · 2026-03-07) | HIGH | Wave 1 | App.tsx ORDER_CONFIRMED appState; Cart.tsx onCheckoutSuccess prop (SAME-UNIT EXPANSION); typecheck EXIT 0; lint EXIT 0 |
| TECS-FBW-015 | G-016 Traceability CRUD | Supply chain | §5.2 absent | F-005 absent | RECONFIRMED | VALIDATED | HIGH | Wave 4 | DPP snapshot only ≠ CRUD surface |
| TECS-FBW-016 | Tenant Audit Logs UI Absent | Audit | §3 table | Sect.5 table | NEW_IN_COPILOT | PROVISIONAL | HIGH | Wave 4 | |
| TECS-FBW-017 | CatalogItem.category Grouping | WL Collections | Not identified | CM-002 | NEW_IN_COPILOT | PROVISIONAL | MEDIUM | Wave 1 | |
| TECS-FBW-018 | Plan BASIC→TRIAL Enum Mapping | Tenant provisioning | Not identified | CM-003 | NEW_IN_COPILOT | PROVISIONAL | HIGH | Wave 0/verify | Intentional mapping per code comment |
| TECS-FBW-019 | lifecycleState vs status | Orders | Not inspected | CM-004 handled | NEW_IN_COPILOT | DEFERRED | HIGH | — | GAP-ORDER-LC-001 closed (GOVERNANCE-SYNC-063) |
| TECS-FBW-020 | WL Admin Invite Shell Routing | White-label admin | §6.1 misrouted | Not inspected | NEW_IN_CODEX | ✅ CLOSED (GOVERNANCE-SYNC-101 · 2026-03-06) | MEDIUM | Wave 1 | App.tsx only; wlAdminInviting bool substate; typecheck EXIT 0; lint EXIT 0 |
| TECS-FBW-AIGOVERNANCE | AI Governance Dead Actions | AI governance | S-004 implied | F-011 / S-004 | NEW_IN_COPILOT | REQUIRES_BACKEND_DESIGN | HIGH | Wave 5 | G-028 B1+ deferred |
| TECS-FBW-ADMINRBAC | AdminRBAC No Backend | Admin access | S-001 implied | F-010 / S-001 | NEW_IN_COPILOT | REQUIRES_BACKEND_DESIGN | HIGH | Wave 5 | |
| TECS-FBW-MOQ | MOQ_NOT_MET UX Gap | Cart | Not identified | §11 P4.4 | NEW_IN_COPILOT | PROVISIONAL | MEDIUM | Wave 1 | 422 response not surfaced to user |
| TECS-FBW-OA-001 | OpenAPI Tenant Drift | Contract governance | §7.1 | Not inspected | NEW_IN_CODEX | VERIFY_REQUIRED | HIGH | Wave 0 | Must inventory before wave close |
| TECS-FBW-OA-002 | OpenAPI Control-Plane Drift | Contract governance | §7.2 | Not inspected | NEW_IN_CODEX | VERIFY_REQUIRED | HIGH | Wave 0 | Must inventory before wave close |
| TECS-FBW-AT-006 | Order Status UI Role Gating | Auth/UX | §8.1 | Not inspected | NEW_IN_CODEX | VERIFY_REQUIRED | MEDIUM | Wave 0 | Non-admin sees PATCH buttons they'll be 403'd on |
| TECS-FBW-AUTH-001 | Tenant Login Hardcoded Picker | Auth discovery | §9.2 | Not inspected | NEW_IN_CODEX | VERIFY_REQUIRED | HIGH | Wave 5 | TODO refs /api/public/tenants/resolve |
| TECS-FBW-RLS-001 | RLS-Only Posture Governance | Tenancy doctrine | §8.2 | Not inspected | NEW_IN_CODEX | VERIFY_REQUIRED | MEDIUM | Wave 0 | Intentional per Q2 §12.2; system-wide clarification needed |
| TECS-FBW-PROV-001 | Tenant Provisioning Contract | Control-plane | §4.1 MISMATCH | §3 ✅ Wired | CROSS_REPORT_CONFLICT → RESOLVED | ✅ CLOSED (GOVERNANCE-SYNC-099 · 2026-03-06) | HIGH | Wave 1 | Implemented: request {orgName,primaryAdminEmail,primaryAdminPassword}; response flat {orgId,slug,userId,membershipId}; typecheck+lint EXIT 0 |

---

## 4. Counts by Merged Status

| Status | Count | IDs |
|---|---|---|
| VALIDATED | 13 | FBW-001/002/003/004/005/006/007/008/011/012/015/PROV-001 + STUB-001 |
| PROVISIONAL | 6 | FBW-014/016/017/018/MOQ + implicitly FBW-013 before product decision |
| VERIFY_REQUIRED | 7 | FBW-020/OA-001/OA-002/AT-006/AUTH-001/RLS-001 + FBW-018 (VER-001 ✅ CLOSED) |
| DEFERRED | 3 | FBW-013/019/STUB-001 |
| REQUIRES_BACKEND_DESIGN | 2 | FBW-AIGOVERNANCE/ADMINRBAC |

---

## 5. Conflicts Explicitly Preserved

### TECS-FBW-PROV-001 (CROSS_REPORT_CONFLICT — RESOLVED 2026-03-06)

**Codex:** "frontend provisioning request/response contract does not match the active backend route contract" — field names differ: `{name,slug,type,ownerEmail,ownerPassword}` vs `{orgName,primaryAdminEmail,primaryAdminPassword}`  
**Copilot:** `TenantRegistry` → `provisionTenant()` listed as "✅ Wired" in §3 feature table without field-level inspection  
**Resolution (VER-001 · 2026-03-06):** Codex confirmed correct. Direct inspection of `services/controlPlaneService.ts` `ProvisionTenantRequest` vs `admin/tenantProvision.ts` `provisionBodySchema` — all 5 request fields mismatched; response shape also incompatible (backend flat `{orgId,slug,userId,membershipId}` vs frontend nested `{tenant,owner}`). Runtime: HTTP 400 on every call. Copilot "Wired" classification superseded — call path exists but contract has never been correct. Historical conflict record preserved above for traceability.  
**Promotion:** TECS-FBW-PROV-001 → VALIDATED · Wave 1 implementation unit (services/controlPlaneService.ts).

---

## 6. Verification Backlog

Items that cannot proceed to implementation without targeted inspection:

| ID | Surface | Verification Target | Evidence Gap |
|---|---|---|---|
| VER-001 | TECS-FBW-PROV-001 | Compare provisionTenant() request body field names vs tenantProvision.ts Zod schema | ✅ CLOSED · 2026-03-06 · Verdict: FAIL · TECS-FBW-PROV-001 → VALIDATED + Wave 1 |
| VER-002 | TECS-FBW-020 | Inspect App.tsx INVITE_MEMBER state routing — does WL_ADMIN context correctly branch? | ✅ CLOSED · 2026-03-06 · Verdict: FAIL · TECS-FBW-020 → VALIDATED + Wave 1 |
| VER-003 | TECS-FBW-OA-001 | Enumerate openapi.tenant.json paths vs tenant.ts route list | Codex found drift; Copilot did not inspect |
| VER-004 | TECS-FBW-OA-002 | Enumerate openapi.control-plane.json paths vs control.ts route list | Codex found drift; Copilot did not inspect |
| VER-005 | TECS-FBW-AT-006 | Read EXPOrdersPanel.tsx — are status-transition action buttons gated by user role from auth context? | Codex found UX exposure; Copilot confirmed backend PATCH wiring |
| VER-006 | TECS-FBW-AUTH-001 | Read AuthFlows.tsx tenant picker — is there a TODOref to /api/public/tenants/resolve? Is seeding still present? | Codex found; Copilot did not inspect |
| VER-007 | TECS-FBW-RLS-001 | Confirm system-wide governance stance on RLS-only (no app-layer where: {org_id}) for tenant routes | Q2 §12.2 documents decision for memberships; needs system-level statement |
| VER-008 | U-001 (Copilot) | Locate /api/ai route file — confirm registration point and auth posture | Copilot §10 U-001: not found in tenant.ts or control.ts |
| VER-009 | U-002 (Copilot) | Read admin/tenantProvision.ts auth guard fully | Copilot §10 U-002: only 150 lines inspected; GOVERNANCE-SYNC-035 CI guard confirms SUPER_ADMIN gating as partial evidence |
| VER-010 | U-004 (Copilot) | Read WLOrdersPanel.tsx lines 200–480 — do status-transition PATCH buttons exist? | Copilot §10 U-004: only first 200 lines read |

---

## 7. Wave Assignment Summary (from merged status)

| Wave | Items | Priority basis |
|---|---|---|
| Wave 0 — Reconciliation + Verification | VER-001 (✅ CLOSED · 2026-03-06 · FAIL); VER-002 (✅ CLOSED · 2026-03-06 · FAIL); VER-003 through VER-010; TECS-FBW-OA-001/OA-002; TECS-FBW-AT-006; TECS-FBW-AUTH-001; TECS-FBW-RLS-001 | VER-001 closed (FAIL · PROV-001 promoted); VER-002 closed (FAIL · FBW-020 promoted); remaining VER items pending; governance-only; no product code |
| Wave 1 — Runtime/Credibility Fixes | TECS-FBW-011 (basePrice ✅ CLOSED · GOVERNANCE-SYNC-096); TECS-FBW-PROV-001 (✅ CLOSED · GOVERNANCE-SYNC-099 · 2026-03-06); TECS-FBW-014 (post-checkout); TECS-FBW-008 (WL Settings domain dead); TECS-FBW-017 (category grouping); TECS-FBW-MOQ (422 UX) | VALIDATED or PROVISIONAL; small frontend-only changes; no new backend routes |
| Wave 2 — Backend-Complete Ops Mutations | TECS-FBW-001 (finance/compliance/dispute mutations) | RECONFIRMED; backend verified; additive frontend only |
| Wave 3 — Dark Module Exposure (Priority) | TECS-FBW-002 (trades); TECS-FBW-003 (escrow); TECS-FBW-006 (escalations + control-plane misrouting) | RECONFIRMED; high governance impact |
| Wave 4 — Extended Exposure | TECS-FBW-004 (settlements); TECS-FBW-005 (certifications); TECS-FBW-015 (traceability CRUD); TECS-FBW-007 (cart summaries); TECS-FBW-016 (tenant audit logs) | RECONFIRMED/PROVISIONAL; lower urgency |
| Wave 5 — Design-Required | TECS-FBW-012 (edit access); TECS-FBW-ADMINRBAC; TECS-FBW-AIGOVERNANCE; TECS-FBW-013 (B2B quote); TECS-FBW-AUTH-001 (if confirmed as backend design need) | REQUIRES_BACKEND_DESIGN or DEFERRED |

---

## 8. No-Change Confirmation

This document was produced by read-only analysis of two audit reports and existing governance documents.  
No application code was modified.  
No OpenAPI spec files were changed.  
No Prisma schema or migration files were touched.  
No backend routes were added or modified.

---

*Produced: 2026-03-06 — TECS GOVERNANCE RECONCILIATION*  
*Source of truth for next-action assignments: this matrix + governance/gap-register.md*  
*No commit generated for this document alone — will be included in governance sync commit.*
